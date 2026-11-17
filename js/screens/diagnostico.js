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

    el.innerHTML =
      '<h1 data-i18n-live="diagnostico.titulo"></h1>' +
      '<p class="texto-tenue">' +
      (estado.indice + 1) +
      " / " +
      estado.preguntasOrden.length +
      " · " +
      p.nivelCEFR +
      "</p>" +
      '<div class="tarjeta">' +
      (p.texto ? "<p>" + p.texto + "</p>" : "") +
      (esEscucha ? '<button type="button" class="boton-secundario" id="btn-reproducir">🔊 Reproducir</button>' : "") +
      "<p>" +
      p.pregunta +
      "</p>" +
      "</div>" +
      '<div id="opciones"></div>';

    el.querySelectorAll("[data-i18n-live]").forEach(function (nodo) {
      nodo.textContent = t(nodo.getAttribute("data-i18n-live"));
    });

    if (esEscucha) {
      el.querySelector("#btn-reproducir").addEventListener("click", function () {
        global.App.TTS.hablar(p.textoParaTTS, "en-US").catch(function () {
          /* best-effort: sin Web Speech disponible, el usuario puede leer el texto si lo agregamos luego */
        });
      });
    }

    var contenedorOpciones = el.querySelector("#opciones");
    p.opciones.forEach(function (opcion, i) {
      var boton = document.createElement("button");
      boton.type = "button";
      boton.className = "boton-secundario";
      boton.style.display = "block";
      boton.style.width = "100%";
      boton.style.marginTop = "8px";
      boton.textContent = opcion;
      boton.addEventListener("click", function () {
        estado.respuestas[p.id] = i;
        estado.indice += 1;
        pintar(el, ctx, t);
      });
      contenedorOpciones.appendChild(boton);
    });
  }

  function pintarAutoevaluacion(el, ctx, t, habilidad, siguientePaso) {
    var opciones = estado.rubrica[habilidad];
    el.innerHTML =
      '<h1 data-i18n-live="diagnostico.titulo"></h1>' +
      "<p>¿Qué descripción te queda mejor para <strong>" +
      habilidad +
      "</strong>?</p>" +
      '<div id="opciones-rubrica"></div>';

    el.querySelectorAll("[data-i18n-live]").forEach(function (nodo) {
      nodo.textContent = t(nodo.getAttribute("data-i18n-live"));
    });

    var contenedor = el.querySelector("#opciones-rubrica");
    opciones.forEach(function (op) {
      var boton = document.createElement("button");
      boton.type = "button";
      boton.className = "boton-secundario";
      boton.style.display = "block";
      boton.style.width = "100%";
      boton.style.textAlign = "left";
      boton.style.marginTop = "8px";
      boton.textContent = op.nivelCEFR + " — " + op.descripcion;
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
        return (
          '<div class="tarjeta"><p>' +
          h +
          ": <strong>" +
          r.nivelCEFR +
          "</strong> · " +
          r.porcentajeHaciaB2 +
          "% hacia B2</p></div>"
        );
      })
      .join("");

    el.innerHTML =
      '<h1 data-i18n-live="diagnostico.titulo"></h1>' +
      '<p class="texto-tenue">Esto es una estimación, no una certificación oficial.</p>' +
      filas +
      '<button type="button" class="boton-principal" id="btn-ver-progreso">Ver progreso</button>';

    el.querySelectorAll("[data-i18n-live]").forEach(function (nodo) {
      nodo.textContent = t(nodo.getAttribute("data-i18n-live"));
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
