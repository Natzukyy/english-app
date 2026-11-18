(function (global) {
  "use strict";

  var HABILIDADES_BANCO = ["lectura", "escucha", "vocabulario_gramatica"];

  // Estado del diagnóstico en curso.
  var estado = null; // { banco, preguntasOrden, indice, respuestas, paso: 'preguntas'|'habla'|'escritura'|'resultado', rubrica, autoeval }

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
      '<div class="pantalla-vista ancho-lectura">' +
      '<h1 data-i18n-live="diagnostico.titulo"></h1>' +
      '<div class="fila-cabeza"><span class="texto-tenue num-tabular">' +
      (estado.indice + 1) +
      " / " +
      estado.preguntasOrden.length +
      '</span><span class="texto-tenue">' +
      esc(p.nivelCEFR) +
      "</span></div>" +
      '<div class="barra-progreso"><span id="barra-diagnostico" style="width:0%"></span></div>' +
      (p.texto ? '<div class="tarjeta" style="margin-top:24px"><p style="margin:0">' + p.texto + "</p></div>" : "") +
      (esEscucha
        ? '<button type="button" class="enlace-discreto" id="btn-reproducir" style="margin-top:16px">' +
          global.App.Iconos.svg("bocina", 18) +
          "<span>Reproducir</span></button>"
        : "") +
      '<h2 style="margin-top:' +
      (esEscucha ? "8" : "24") +
      'px">' +
      p.pregunta +
      "</h2>" +
      '<div id="opciones" class="entrada-escalonada" style="margin-top:16px"></div>' +
      '<button type="button" class="boton-principal" id="btn-comprobar" style="margin-top:16px" disabled>Comprobar</button>' +
      '<div id="zona-retro"></div>' +
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
    var contenedorOpciones = el.querySelector("#opciones");
    var btnComprobar = el.querySelector("#btn-comprobar");
    var botonesOpcion = barajada.opciones.map(function (opcion, i) {
      var boton = document.createElement("button");
      boton.type = "button";
      boton.className = "boton-secundario";
      boton.textContent = opcion;
      boton.addEventListener("click", function () {
        seleccionada = i;
        botonesOpcion.forEach(function (b) {
          b.removeAttribute("aria-current");
        });
        boton.setAttribute("aria-current", "true");
        btnComprobar.disabled = false;
      });
      contenedorOpciones.appendChild(boton);
      return boton;
    });

    btnComprobar.addEventListener("click", function () {
      if (seleccionada === -1) return;
      // Se guarda el índice ORIGINAL (de banco.json), no la posición barajada en pantalla --
      // así App.Diagnostico.construirResultado (sin cambios) sigue calificando correcto.
      estado.respuestas[p.id] = barajada.indicesOriginales[seleccionada];
      var esCorrecta = seleccionada === barajada.indiceCorrecta;
      btnComprobar.style.display = "none";
      botonesOpcion.forEach(function (b, i) {
        b.disabled = true;
        b.removeAttribute("aria-current"); // el estado de seleccion ya no aplica, ahora manda el resultado
        if (i === barajada.indiceCorrecta) {
          b.classList.add("pulso-correcto", "estado-correcto");
        } else if (i === seleccionada) {
          b.classList.add("pulso-incorrecto", "estado-incorrecto");
        }
      });

      el.querySelector("#zona-retro").innerHTML =
        '<div class="panel-retro ' +
        (esCorrecta ? "exito" : "error") +
        '">' +
        '<p class="titulo-retro">' +
        (esCorrecta ? "¡Correcto!" : "No era esa") +
        "</p>" +
        (esCorrecta ? "" : "<p>La respuesta correcta era: " + global.App.Util.escaparHTML(barajada.opciones[barajada.indiceCorrecta]) + "</p>") +
        '<button type="button" class="boton-principal" id="btn-continuar" style="margin-top:12px">Continuar</button>' +
        "</div>";

      el.querySelector("#btn-continuar").addEventListener("click", function () {
        estado.indice += 1;
        pintar(el, ctx, t);
      });
    });
  }

  function pintarAutoevaluacion(el, ctx, t, habilidad, siguientePaso) {
    var opciones = estado.rubrica[habilidad];
    el.innerHTML =
      '<div class="pantalla-vista ancho-lectura">' +
      '<h1 data-i18n-live="diagnostico.titulo"></h1>' +
      "<h2>¿Qué descripción te queda mejor para " +
      habilidad +
      "?</h2>" +
      '<div id="opciones-rubrica" class="entrada-escalonada" style="margin-top:16px"></div>' +
      "</div>";

    el.querySelectorAll("[data-i18n-live]").forEach(function (nodo) {
      nodo.textContent = t(nodo.getAttribute("data-i18n-live"));
    });

    var contenedor = el.querySelector("#opciones-rubrica");
    opciones.forEach(function (op) {
      var boton = document.createElement("button");
      boton.type = "button";
      boton.className = "boton-secundario";
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
        var alcanzoB2 = r.porcentajeHaciaB2 >= 100;
        return (
          '<div class="fila">' +
          '<div class="fila-cabeza"><span>' +
          h +
          " — <strong>" +
          r.nivelCEFR +
          "</strong></span>" +
          (alcanzoB2 ? '<span style="color:var(--exito);display:inline-flex">' + global.App.Iconos.svg("check", 18) + "</span>" : "") +
          "</div>" +
          '<div class="barra-progreso"><span data-destino="' +
          r.porcentajeHaciaB2 +
          '" style="width:0%"></span></div>' +
          "</div>"
        );
      })
      .join("");

    el.innerHTML =
      '<div class="pantalla-vista ancho-lectura">' +
      global.App.Util.confeti() +
      '<h1 data-i18n-live="diagnostico.titulo"></h1>' +
      '<p class="texto-tenue">Esto es una estimación, no una certificación oficial.</p>' +
      '<div class="seccion entrada-escalonada" style="margin-top:16px">' +
      filas +
      "</div>" +
      '<button type="button" class="boton-principal" id="btn-ver-progreso">Ver progreso</button>' +
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

  global.App = global.App || {};
  global.App.Screens = global.App.Screens || {};
  global.App.Screens.diagnostico = { render: render };
})(typeof window !== "undefined" ? window : globalThis);
