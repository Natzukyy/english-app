/* Pantalla de Lectura (Fase C, "Calcomanías oscuro") -- habilidad prioritaria de Alex
   (lectura > habla > escucha, ver PROMPT_BASE.md). Texto corto por nivel con vocabulario
   clave tocable (muestra su traducción en un panel compartido debajo del texto, en vez de
   un tooltip flotante -- más simple y sin problemas de colisión con el borde de la pantalla),
   seguido de 3-4 preguntas de opción múltiple (mismo patrón visual A-D que Diagnóstico,
   reusa sus clases .diagnostico-opcion/.diagnostico-letra). El texto se queda visible todo
   el tiempo en la columna izquierda en laptop (spec: "texto a la izquierda, preguntas a la
   derecha") -- en celular las columnas se apilan. */
(function (global) {
  "use strict";

  var LETRAS = ["A", "B", "C", "D"];
  var PALABRAS_POR_MINUTO = 200;

  var sesion = null; // { inicioMs, intentos, correctas, finalizada }
  var lecturas = null; // cache de data/content/fase1/lecturas.json
  var estado = null; // { lectura, indice: -1 antes de empezar | 0..n-1 pregunta actual | n = resultado, respuestas: [bool] }

  function finalizarSesionSiActiva() {
    if (!sesion || sesion.finalizada) return Promise.resolve();
    sesion.finalizada = true;
    if (sesion.intentos === 0) return Promise.resolve(); // no completó ninguna pregunta, no cuenta sesión
    var minutos = Math.max(1, Math.round((Date.now() - sesion.inicioMs) / 60000));
    return global.App.Datos.registrarSesion(minutos, sesion.correctas, new Date(), "lectura");
  }

  function elegirLectura(lista, nivel) {
    // Mismo nivel si hay contenido; si no, el más cercano POR DEBAJO (nunca un texto de B2
    // para quien está en A1) -- ver App.Avance.elegirPorNivel.
    return global.App.Avance.elegirPorNivel(lista, nivel);
  }

  function tiempoLectura(texto) {
    var palabras = texto.trim().split(/\s+/).length;
    var minutos = Math.max(1, Math.round(palabras / PALABRAS_POR_MINUTO));
    return "~" + minutos + " min de lectura";
  }

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /** Envuelve la primera aparición de cada término de vocabularioClave en un botón tocable
   * (data-trad lleva la traducción, sin volver a tocar el DOM después). Los términos más
   * largos se reemplazan primero para que "a good idea" no quede partido por "good". El
   * texto ya viene escapado (esc(texto)) antes de insertar los botones, así que lo que se
   * inserta vía innerHTML son solo <button> de este mismo código, nunca datos sin escapar. */
  function resaltarVocabulario(textoEscapado, vocabularioClave) {
    var ordenados = vocabularioClave.slice().sort(function (a, b) {
      return b.termino.length - a.termino.length;
    });
    var resultado = textoEscapado;
    ordenados.forEach(function (v) {
      var patron = new RegExp("(" + escapeRegExp(v.termino) + ")", "i");
      var reemplazado = false;
      resultado = resultado.replace(patron, function (coincidencia) {
        if (reemplazado) return coincidencia;
        reemplazado = true;
        return (
          '<button type="button" class="lectura-termino" data-trad="' +
          global.App.Util.escaparHTML(v.traduccion) +
          '">' +
          coincidencia +
          "</button>"
        );
      });
    });
    return resultado;
  }

  function render(el, ctx) {
    var t = function (clave) {
      return global.App.I18n.texto(clave, ctx.nivelInterfaz, ctx.strings);
    };

    el.innerHTML = '<div class="estado-vacio">…</div>';

    var cargarLecturas = lecturas
      ? Promise.resolve(lecturas)
      : fetch("data/content/fase1/lecturas.json")
          .then(function (r) {
            return r.json();
          })
          .then(function (datos) {
            lecturas = datos.lecturas || [];
            return lecturas;
          });

    cargarLecturas.then(function () {
      if (estado) {
        pintar(el, ctx, t);
        return;
      }
      global.App.Datos.obtenerUltimoDiagnostico().then(function (diagnostico) {
        var nivel = (diagnostico && diagnostico.porHabilidad.lectura && diagnostico.porHabilidad.lectura.nivelCEFR) || "A2";
        var lectura = elegirLectura(lecturas, nivel);
        estado = { lectura: lectura, indice: -1, respuestas: [] };
        sesion = { inicioMs: Date.now(), intentos: 0, correctas: 0, finalizada: false };
        pintar(el, ctx, t);
      });
    });
  }

  function pintar(el, ctx, t) {
    if (estado.indice === estado.lectura.preguntas.length) return pintarResultado(el, ctx, t);
    pintarSesion(el, ctx, t);
  }

  function pintarSesion(el, ctx, t) {
    var esc = global.App.Util.escaparHTML;
    var lectura = estado.lectura;
    var antesDeEmpezar = estado.indice === -1;
    var pregunta = antesDeEmpezar ? null : lectura.preguntas[estado.indice];

    el.innerHTML =
      '<div class="pantalla-vista pantalla-lectura">' +
      '<h1 data-i18n-live="lectura.titulo"></h1>' +
      '<div class="lectura-cuerpo">' +
      '<div class="lectura-columna-texto">' +
      '<span class="diagnostico-pastilla-area calcomania lectura-pastilla-azul">' +
      esc(lectura.tema) +
      " · " +
      esc(lectura.nivelCEFR) +
      "</span>" +
      '<p class="texto-tenue num-tabular" style="margin-top:8px">' +
      tiempoLectura(lectura.texto) +
      "</p>" +
      '<div class="lectura-pasaje superficie-oscura"><p>' +
      resaltarVocabulario(esc(lectura.texto), lectura.vocabularioClave) +
      "</p></div>" +
      '<p class="texto-caption" style="margin-top:8px">Toca una palabra resaltada para ver su traducción.</p>' +
      '<div class="lectura-traduccion" id="zona-traduccion" hidden></div>' +
      "</div>" +
      '<div class="lectura-columna-preguntas">' +
      (antesDeEmpezar
        ? '<div class="superficie-oscura lectura-tarjeta-intro"><p>' +
          lectura.preguntas.length +
          (lectura.preguntas.length === 1 ? " pregunta de comprensión sobre el texto." : " preguntas de comprensión sobre el texto.") +
          "</p>" +
          '<button type="button" class="calcomania calcomania-cta calcomania-presionable lectura-boton-empezar" id="btn-empezar-preguntas">Ver preguntas</button>' +
          "</div>"
        : '<div class="diagnostico-tarjeta-pregunta calcomania"><h2>' +
          esc(pregunta.pregunta) +
          "</h2></div>" +
          '<div id="opciones" class="diagnostico-opciones pop-entrada-escalonada"></div>' +
          '<div class="diagnostico-pie">' +
          '<p class="diagnostico-nota-pie" id="nota-pie"></p>' +
          '<div class="diagnostico-pie-fila">' +
          '<span class="texto-caption num-tabular">' +
          (estado.indice + 1) +
          " / " +
          lectura.preguntas.length +
          "</span>" +
          '<button type="button" class="calcomania calcomania-cta calcomania-presionable diagnostico-boton-accion" id="btn-accion" disabled>Responder</button>' +
          "</div></div>") +
      "</div>" +
      "</div>" +
      "</div>";

    el.querySelectorAll("[data-i18n-live]").forEach(function (nodo) {
      nodo.textContent = t(nodo.getAttribute("data-i18n-live"));
    });

    var zonaTraduccion = el.querySelector("#zona-traduccion");
    el.querySelectorAll(".lectura-termino").forEach(function (boton) {
      boton.addEventListener("click", function () {
        zonaTraduccion.hidden = false;
        zonaTraduccion.textContent = boton.textContent + " → " + boton.getAttribute("data-trad");
      });
    });

    if (antesDeEmpezar) {
      el.querySelector("#btn-empezar-preguntas").addEventListener("click", function () {
        estado.indice = 0;
        pintar(el, ctx, t);
      });
      return;
    }

    pintarPregunta(el, ctx, t, pregunta);
  }

  function pintarPregunta(el, ctx, t, pregunta) {
    var esc = global.App.Util.escaparHTML;
    var barajada = global.App.Util.barajarOpciones(pregunta.opciones, pregunta.respuestaCorrecta);

    var seleccionada = -1;
    var respondido = false;
    var contenedorOpciones = el.querySelector("#opciones");
    var btnAccion = el.querySelector("#btn-accion");
    var notaPie = el.querySelector("#nota-pie");

    var botonesOpcion = barajada.opciones.map(function (opcion, i) {
      var boton = document.createElement("button");
      boton.type = "button";
      boton.className = "diagnostico-opcion superficie-oscura";
      boton.innerHTML = '<span class="diagnostico-letra" aria-hidden="true">' + LETRAS[i] + "</span>" + '<span class="diagnostico-texto-opcion">' + esc(opcion) + "</span>";
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
      var esCorrecta = seleccionada === barajada.indiceCorrecta;
      sesion.intentos += 1;
      if (esCorrecta) {
        sesion.correctas += 1;
        estado.respuestas.push(true);
      } else {
        estado.respuestas.push(false);
      }

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

      btnAccion.textContent = estado.indice + 1 < estado.lectura.preguntas.length ? "Siguiente" : "Ver resultado";
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
  }

  function pintarResultado(el, ctx, t) {
    var total = estado.lectura.preguntas.length;
    var correctas = estado.respuestas.filter(Boolean).length;
    el.innerHTML =
      '<div class="pantalla-vista ancho-lectura pantalla-lectura-resultado">' +
      '<div class="interstitial-tarjeta calcomania pop-entrada" style="background:var(--azul)">' +
      '<span class="interstitial-sello">' +
      global.App.Iconos.svg("sello", 28) +
      "</span>" +
      '<p class="interstitial-titulo">¡Listo!</p>' +
      '<p class="interstitial-resumen"><span class="num-tabular">' +
      correctas +
      "</span> / <span class=\"num-tabular\">" +
      total +
      "</span> correctas</p>" +
      '<button type="button" class="boton-principal interstitial-boton" id="btn-terminar-lectura">Terminar</button>' +
      "</div>" +
      "</div>";
    el.querySelector("#btn-terminar-lectura").addEventListener("click", function () {
      finalizarSesionSiActiva().then(function () {
        estado = null;
        global.App.Util.terminarPasoYVolver();
      });
    });
  }

  global.addEventListener("hashchange", function () {
    if (location.hash.indexOf("lectura") === -1) {
      finalizarSesionSiActiva();
      estado = null;
    }
  });

  global.App = global.App || {};
  global.App.Screens = global.App.Screens || {};
  global.App.Screens.lectura = { render: render };
})(typeof window !== "undefined" ? window : globalThis);
