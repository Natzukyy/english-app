(function (global) {
  "use strict";

  var HABILIDADES_BANCO = ["lectura", "escucha", "vocabulario_gramatica"];
  var LETRAS = ["A", "B", "C", "D"];

  // Nombres legibles para el resultado final -- App.Diagnostico.construirResultado usa estas
  // claves (lectura/escucha/vocabulario_gramatica de banco.json + habla/escritura de la
  // autoevaluación), nunca para mostrarse directo en pantalla.
  var NOMBRE_HABILIDAD_RESULTADO = {
    lectura: "Lectura",
    escucha: "Escucha",
    vocabulario_gramatica: "Vocabulario y gramática",
    habla: "Habla",
    escritura: "Escritura"
  };

  // Color por habilidad (mismo mapeo que Inicio/Progreso: lectura=azul, escucha=amarillo,
  // habla=menta, escritura=rosa). vocabulario_gramatica no es una de las 4 habilidades "de
  // producto" -- se queda con el tratamiento neutro (ver .diagnostico-pastilla-nivel--neutral).
  var COLOR_HABILIDAD = {
    lectura: "var(--punto-lectura)",
    escucha: "var(--punto-escucha)",
    habla: "var(--punto-habla)",
    escritura: "var(--punto-escritura)"
  };

  // Estado del diagnóstico en curso.
  var estado = null; // { banco, preguntasOrden, indice, respuestas, paso: 'preguntas'|'habla'|'escritura'|'resultado', rubrica, autoeval }
  var listenerTeclado = null; // referencia al keydown de la pregunta actual, para quitarlo al avanzar/salir

  function quitarListenerTeclado() {
    if (listenerTeclado) {
      global.removeEventListener("keydown", listenerTeclado);
      listenerTeclado = null;
    }
  }

  function iniciarDiagnostico(banco, rubrica) {
    var preguntasOrden = [];
    HABILIDADES_BANCO.forEach(function (h) {
      preguntasOrden = preguntasOrden.concat(banco.filter(function (p) { return p.habilidad === h; }));
    });
    estado = { banco: banco, rubrica: rubrica, preguntasOrden: preguntasOrden, indice: 0, respuestas: {}, paso: "preguntas", autoeval: {} };
  }

  function render(el, ctx) {
    var t = function (clave) {
      return global.App.I18n.texto(clave, ctx.nivelInterfaz, ctx.strings);
    };

    if (!estado) {
      el.innerHTML = '<div class="estado-vacio">…</div>';
      Promise.all([
        fetch("data/diagnostico/banco.json").then(function (r) { return r.json(); }),
        fetch("data/diagnostico/rubrica_cefr.json").then(function (r) { return r.json(); })
      ]).then(function (res) {
        iniciarDiagnostico(res[0].preguntas, res[1]);
        pintar(el, ctx, t);
      });
      return;
    }
    pintar(el, ctx, t);
  }

  function pintar(el, ctx, t) {
    quitarListenerTeclado();
    if (estado.paso === "preguntas") return pintarPregunta(el, ctx, t);
    if (estado.paso === "habla") return pintarAutoevaluacion(el, ctx, t, "habla", "escritura");
    if (estado.paso === "escritura") return pintarAutoevaluacion(el, ctx, t, "escritura", "resultado");
    return pintarResultado(el, ctx, t);
  }

  function pintarPregunta(el, ctx, t) {
    if (estado.indice >= estado.preguntasOrden.length) {
      estado.paso = "habla";
      return pintar(el, ctx, t);
    }
    var p = estado.preguntasOrden[estado.indice];
    var esEscucha = p.habilidad === "escucha";
    var esc = global.App.Util.escaparHTML;
    var porcentaje = Math.round((estado.indice / estado.preguntasOrden.length) * 100);

    el.innerHTML =
      // Sin "ancho-lectura" aquí a propósito: ese tope de 720px es para columna única
      // (como el resultado/autoevaluación de abajo); el layout de 2 columnas de esta
      // pantalla en laptop necesita el ancho completo que da "main" (mismo criterio que
      // .repaso-cuerpo, que tampoco usa ancho-lectura -- ver js/screens/repaso.js).
      '<div class="pantalla-vista pantalla-diagnostico pantalla-diagnostico-pregunta">' +
      '<h1 data-i18n-live="diagnostico.titulo"></h1>' +
      '<div class="fila-cabeza"><span class="texto-tenue num-tabular">' +
      (estado.indice + 1) +
      " / " +
      estado.preguntasOrden.length +
      "</span></div>" +
      '<div class="barra-progreso"><span id="barra-diagnostico" style="width:0%"></span></div>' +
      '<div class="diagnostico-cuerpo">' +
      '<div class="diagnostico-columna-izquierda">' +
      '<span class="diagnostico-pastilla-area calcomania">' +
      esc(NOMBRE_HABILIDAD_RESULTADO[p.habilidad] || p.habilidad) +
      "</span>" +
      (p.texto ? '<div class="diagnostico-pasaje superficie-oscura"><p>' + p.texto + "</p></div>" : "") +
      (esEscucha
        ? '<button type="button" class="enlace-discreto" id="btn-reproducir" style="margin-top:12px">' +
          global.App.Iconos.svg("bocina", 18) +
          "<span>Reproducir</span></button>"
        : "") +
      '<div class="diagnostico-tarjeta-pregunta calcomania"><h2>' +
      p.pregunta +
      "</h2></div>" +
      "</div>" +
      '<div class="diagnostico-columna-derecha">' +
      '<div id="opciones" class="diagnostico-opciones pop-entrada-escalonada"></div>' +
      '<div class="diagnostico-pie">' +
      '<p class="diagnostico-nota-pie" id="nota-pie"></p>' +
      '<div class="diagnostico-pie-fila">' +
      '<p class="texto-caption diagnostico-nota-teclado">Teclas A–D para elegir · Enter para responder</p>' +
      '<button type="button" class="calcomania calcomania-cta calcomania-presionable diagnostico-boton-accion" id="btn-accion" disabled>Responder</button>' +
      "</div>" +
      "</div>" +
      "</div>" +
      "</div>" +
      "</div>";

    el.querySelectorAll("[data-i18n-live]").forEach(function (nodo) {
      nodo.textContent = t(nodo.getAttribute("data-i18n-live"));
    });

    global.App.Util.animarBarra(el.querySelector("#barra-diagnostico"), porcentaje);

    if (esEscucha) {
      el.querySelector("#btn-reproducir").addEventListener("click", function () {
        global.App.TTS.hablar(p.textoParaTTS, "en-US").catch(function () {
          /* best-effort: sin Web Speech disponible, el usuario puede leer el texto si lo agregamos luego */
        });
      });
    }

    // Se baraja el orden de las opciones al presentarlas -- en los datos originales la
    // respuesta correcta siempre está en el índice 0 (ver DECISIONES.md D20/D21). Barajar es
    // puramente de presentación: banco.json no se toca, y lo que se guarda en
    // estado.respuestas sigue siendo el índice ORIGINAL (vía indicesOriginales), para que
    // App.Diagnostico.construirResultado siga calificando exactamente igual que antes.
    var barajada = global.App.Util.barajarOpciones(p.opciones, p.respuestaCorrecta);

    var seleccionada = -1;
    var respondido = false;
    var contenedorOpciones = el.querySelector("#opciones");
    var btnAccion = el.querySelector("#btn-accion");
    var notaPie = el.querySelector("#nota-pie");

    var botonesOpcion = barajada.opciones.map(function (opcion, i) {
      var boton = document.createElement("button");
      boton.type = "button";
      boton.className = "diagnostico-opcion superficie-oscura";
      boton.innerHTML =
        '<span class="diagnostico-letra" aria-hidden="true">' + LETRAS[i] + "</span>" + '<span class="diagnostico-texto-opcion">' + esc(opcion) + "</span>";
      boton.addEventListener("click", function () {
        seleccionar(i);
      });
      contenedorOpciones.appendChild(boton);
      return boton;
    });

    function seleccionar(i) {
      if (respondido) return;
      seleccionada = i;
      botonesOpcion.forEach(function (b, idx) {
        b.classList.remove("calcomania", "calcomania-presionable", "superficie-oscura", "diagnostico-opcion--seleccionada");
        if (idx === i) {
          b.classList.add("calcomania", "calcomania-presionable", "diagnostico-opcion--seleccionada");
        } else {
          b.classList.add("superficie-oscura");
        }
      });
      btnAccion.disabled = false;
    }

    function responder() {
      if (seleccionada === -1 || respondido) return;
      respondido = true;
      // Se guarda el índice ORIGINAL (de banco.json), no la posición barajada en pantalla --
      // así App.Diagnostico.construirResultado (sin cambios) sigue calificando correcto.
      estado.respuestas[p.id] = barajada.indicesOriginales[seleccionada];
      var esCorrecta = seleccionada === barajada.indiceCorrecta;

      botonesOpcion.forEach(function (b, idx) {
        b.disabled = true;
        b.classList.remove("calcomania-presionable", "diagnostico-opcion--seleccionada");
        if (idx === barajada.indiceCorrecta) {
          b.classList.remove("superficie-oscura");
          b.classList.add("calcomania", "diagnostico-opcion--correcta");
        } else if (idx === seleccionada) {
          b.classList.add("diagnostico-opcion--incorrecta");
        }
      });

      notaPie.textContent = esCorrecta ? "¡Correcto!" : "La respuesta correcta era " + LETRAS[barajada.indiceCorrecta] + ".";
      notaPie.classList.add("visible");
      notaPie.classList.toggle("diagnostico-nota-correcta", esCorrecta);
      notaPie.classList.toggle("diagnostico-nota-incorrecta", !esCorrecta);

      btnAccion.textContent = "Siguiente";
      btnAccion.disabled = false;
    }

    function siguiente() {
      estado.indice += 1;
      pintar(el, ctx, t);
    }

    btnAccion.addEventListener("click", function () {
      if (!respondido) responder();
      else siguiente();
    });

    listenerTeclado = function (ev) {
      var tecla = (ev.key || "").toUpperCase();
      if (!respondido && LETRAS.indexOf(tecla) !== -1) {
        var i = LETRAS.indexOf(tecla);
        if (botonesOpcion[i] && !botonesOpcion[i].disabled) seleccionar(i);
      } else if (tecla === "ENTER") {
        if (!btnAccion.disabled) btnAccion.click();
      }
    };
    global.addEventListener("keydown", listenerTeclado);
  }

  function pintarAutoevaluacion(el, ctx, t, habilidad, siguientePaso) {
    var opciones = estado.rubrica[habilidad];
    el.innerHTML =
      '<div class="pantalla-vista ancho-lectura pantalla-diagnostico">' +
      '<h1 data-i18n-live="diagnostico.titulo"></h1>' +
      '<div class="diagnostico-tarjeta-pregunta calcomania" style="margin-top:16px"><h2>¿Qué descripción te queda mejor para ' +
      (NOMBRE_HABILIDAD_RESULTADO[habilidad] || habilidad).toLowerCase() +
      "?</h2></div>" +
      '<div id="opciones-rubrica" class="diagnostico-rubrica-filas pop-entrada-escalonada"></div>' +
      "</div>";

    el.querySelectorAll("[data-i18n-live]").forEach(function (nodo) {
      nodo.textContent = t(nodo.getAttribute("data-i18n-live"));
    });

    var contenedor = el.querySelector("#opciones-rubrica");
    opciones.forEach(function (op) {
      var boton = document.createElement("button");
      boton.type = "button";
      boton.className = "diagnostico-rubrica-fila superficie-oscura";
      boton.innerHTML = "<strong>" + op.nivelCEFR + "</strong> — " + op.descripcion;
      boton.addEventListener("click", function () {
        estado.autoeval[habilidad] = op.nivelCEFR;
        estado.paso = siguientePaso;
        pintar(el, ctx, t);
      });
      contenedor.appendChild(boton);
    });
  }

  function pintarResultado(el, ctx, t) {
    var resultado = global.App.Diagnostico.construirResultado(estado.banco, estado.respuestas, estado.autoeval, new Date());
    global.App.Datos.guardarDiagnostico(resultado);

    var filas = Object.keys(resultado.porHabilidad)
      .map(function (h) {
        var r = resultado.porHabilidad[h];
        var colorFondo = COLOR_HABILIDAD[h];
        var pastilla = colorFondo
          ? '<span class="diagnostico-pastilla-nivel" style="background:' + colorFondo + '">' + global.App.Avance.etiquetaNivel(r.nivelCEFR, h) + "</span>"
          : '<span class="diagnostico-pastilla-nivel diagnostico-pastilla-nivel--neutral">' + global.App.Avance.etiquetaNivel(r.nivelCEFR, h) + "</span>";
        return (
          '<div class="diagnostico-resultado-fila superficie-oscura">' +
          '<div class="fila-cabeza"><span>' +
          (NOMBRE_HABILIDAD_RESULTADO[h] || h) +
          "</span>" +
          pastilla +
          "</div>" +
          '<div class="barra-progreso"' +
          (colorFondo ? ' data-habilidad="' + h + '"' : "") +
          '><span data-destino="' +
          global.App.Avance.porcentajeEnEscala(r.nivelCEFR) +
          '" style="width:0%"></span></div>' +
          "</div>"
        );
      })
      .join("");

    el.innerHTML =
      '<div class="pantalla-vista ancho-lectura pantalla-diagnostico">' +
      '<div class="diagnostico-resultado-encabezado">' +
      '<span class="diagnostico-resultado-icono calcomania">' +
      global.App.Iconos.svg("sello", 24) +
      "</span>" +
      '<h1 data-i18n-live="diagnostico.titulo"></h1>' +
      "</div>" +
      '<p class="texto-tenue" style="margin-top:8px">Esto es una estimación, no una certificación oficial.</p>' +
      '<div class="diagnostico-resultado-filas">' +
      filas +
      "</div>" +
      '<button type="button" class="calcomania calcomania-cta calcomania-presionable" id="btn-ver-progreso" style="background:var(--amarillo);color:var(--tinta);margin-top:24px;width:100%;min-height:var(--toque-minimo);font-weight:700">Ver progreso</button>' +
      "</div>";

    el.querySelectorAll("[data-i18n-live]").forEach(function (nodo) {
      nodo.textContent = t(nodo.getAttribute("data-i18n-live"));
    });
    el.querySelectorAll(".barra-progreso > span[data-destino]").forEach(function (span) {
      global.App.Util.animarBarra(span, span.getAttribute("data-destino"));
    });
    el.querySelector("#btn-ver-progreso").addEventListener("click", function () {
      estado = null; // listo para poder repetir el diagnóstico más adelante
      location.hash = "#/progreso";
    });
  }

  global.addEventListener("hashchange", function () {
    if (location.hash.indexOf("diagnostico") === -1) quitarListenerTeclado();
  });

  global.App = global.App || {};
  global.App.Screens = global.App.Screens || {};
  global.App.Screens.diagnostico = { render: render };
})(typeof window !== "undefined" ? window : globalThis);
