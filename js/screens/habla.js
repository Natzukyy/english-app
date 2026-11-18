/* Pantalla de habla: SOLO reconocimiento de voz (SpeechRecognition), nunca grabación de
   audio (MediaRecorder) -- ver CLAUDE.md/DECISIONES.md D12: grabar y reconocer no deben usar
   el micrófono al mismo tiempo. Aquí no hay tensión porque nunca se graba audio en esta
   pantalla; el único cuidado real es no arrancar el reconocimiento mientras todavía se está
   reproduciendo el modelo (TTS), y liberar siempre el reconocedor (stop/abort) al terminar
   o al salir. requiere_prueba_iphone: true -- la lógica de comparación se prueba con tests
   (ver tests/core/habla.test.js); el micrófono/reconocimiento real solo se puede probar en
   el iPhone de Alex. */
(function (global) {
  "use strict";

  var UMBRAL_ACIERTO = 60; // % de App.Habla.comparar a partir del cual cuenta como "correcto" para el XP

  // Estado de la sesión en curso (vive mientras el usuario está en esta pantalla).
  var sesion = null; // { inicioMs, intentos, correctas, finalizada }
  var ejercicios = null; // cache de data/content/fase1/habla.json (ejercicios)
  var reconocedorActivo = null; // referencia al SpeechRecognition en curso, para poder abortarlo

  function finalizarSesionSiActiva() {
    if (reconocedorActivo) {
      try {
        reconocedorActivo.abort();
      } catch (e) {
        /* ya pudo haber terminado solo */
      }
      reconocedorActivo = null;
    }
    if (!sesion || sesion.finalizada) return Promise.resolve();
    sesion.finalizada = true;
    if (sesion.intentos === 0) return Promise.resolve(); // no completó ningún ejercicio, no cuenta sesión
    var minutos = Math.max(1, Math.round((Date.now() - sesion.inicioMs) / 60000));
    return global.App.Datos.registrarSesion(minutos, sesion.correctas, new Date());
  }

  function elegirEjercicioAlAzar() {
    return ejercicios[Math.floor(Math.random() * ejercicios.length)];
  }

  function render(el, ctx) {
    var t = function (clave) {
      return global.App.I18n.texto(clave, ctx.nivelInterfaz, ctx.strings);
    };

    el.innerHTML = '<div class="estado-vacio">…</div>';

    var cargar = ejercicios
      ? Promise.resolve(ejercicios)
      : fetch("data/content/fase1/habla.json")
          .then(function (r) {
            return r.json();
          })
          .then(function (datos) {
            ejercicios = datos.ejercicios || [];
            return ejercicios;
          });

    cargar.then(function () {
      if (!sesion || sesion.finalizada) {
        sesion = { inicioMs: Date.now(), intentos: 0, correctas: 0, finalizada: false };
      }
      pintarEjercicio(el, t, elegirEjercicioAlAzar());
    });
  }

  function pintarEjercicio(el, t, ejercicio) {
    var esc = global.App.Util.escaparHTML;
    var esSombra = ejercicio.tipo === "shadowing";
    var fraseMostrada = esSombra ? ejercicio.fraseObjetivo : ejercicio.prompt;

    el.innerHTML =
      '<div class="pantalla-vista ancho-lectura">' +
      "<h1>Ejercicio de habla</h1>" +
      '<p class="texto-tenue">' +
      esc(ejercicio.tipo === "shadowing" ? "Repite la frase" : "Responde en voz alta") +
      " · " +
      esc(ejercicio.nivelCEFR) +
      "</p>" +
      '<div class="tarjeta tarjeta-repaso" style="margin-top:16px">' +
      '<p class="frente" style="font-size:20px">' +
      esc(fraseMostrada) +
      "</p>" +
      "</div>" +
      '<button type="button" class="enlace-discreto" id="btn-escuchar" style="margin-top:16px">' +
      global.App.Iconos.svg("bocina", 18) +
      "<span>" +
      (esSombra ? "Escuchar el modelo" : "Escuchar la pregunta") +
      "</span></button>" +
      '<button type="button" class="boton-principal" id="btn-hablar" style="margin-top:12px" disabled>' +
      global.App.Iconos.svg("microfono", 18) +
      " Hablar</button>" +
      '<div id="zona-reconocimiento"></div>' +
      '<div id="zona-retro"></div>' +
      "</div>";

    var btnEscuchar = el.querySelector("#btn-escuchar");
    var btnHablar = el.querySelector("#btn-hablar");

    function reproducirModelo() {
      btnHablar.disabled = true;
      btnEscuchar.disabled = true;
      global.App.TTS.hablar(fraseMostrada, "en-US")
        .catch(function () {
          /* sin Web Speech disponible: igual se puede intentar hablar, solo no hubo modelo que oír */
        })
        .then(function () {
          btnHablar.disabled = false;
          btnEscuchar.disabled = false;
        });
    }

    btnEscuchar.addEventListener("click", reproducirModelo);
    reproducirModelo(); // se reproduce solo al entrar; "Hablar" queda deshabilitado hasta que termine

    btnHablar.addEventListener("click", function () {
      iniciarReconocimiento(el, t, ejercicio, esSombra, fraseMostrada);
    });
  }

  function iniciarReconocimiento(el, t, ejercicio, esSombra, fraseMostrada) {
    var Reconocedor = global.SpeechRecognition || global.webkitSpeechRecognition;
    var btnHablar = el.querySelector("#btn-hablar");
    var zonaReconocimiento = el.querySelector("#zona-reconocimiento");
    var zonaRetro = el.querySelector("#zona-retro");
    zonaRetro.innerHTML = "";

    if (!Reconocedor) {
      zonaReconocimiento.innerHTML =
        '<div class="panel-retro error">' +
        '<p class="titulo-retro">Este navegador no tiene reconocimiento de voz</p>' +
        "<p>Puedes autoevaluarte: ¿cómo te salió?</p>" +
        '<div class="fila-botones" style="margin-top:8px">' +
        '<button type="button" class="boton-secundario" id="btn-auto-bien">Me salió bien</button>' +
        '<button type="button" class="boton-secundario" id="btn-auto-mal">Me costó trabajo</button>' +
        "</div>" +
        "</div>";
      zonaReconocimiento.querySelector("#btn-auto-bien").addEventListener("click", function () {
        registrarIntento(el, t, true);
      });
      zonaReconocimiento.querySelector("#btn-auto-mal").addEventListener("click", function () {
        registrarIntento(el, t, false);
      });
      return;
    }

    btnHablar.disabled = true;
    var reconocimiento = new Reconocedor();
    reconocedorActivo = reconocimiento;
    reconocimiento.lang = "en-US";
    reconocimiento.interimResults = true;
    reconocimiento.continuous = false;

    var parcial = "";
    var transcripcionFinal = "";

    function actualizarParcial() {
      zonaReconocimiento.innerHTML = '<p class="texto-tenue" id="texto-parcial">Escuchando… ' + global.App.Util.escaparHTML(parcial) + "</p>";
    }
    actualizarParcial();

    reconocimiento.addEventListener("result", function (ev) {
      parcial = "";
      for (var i = ev.resultIndex; i < ev.results.length; i++) {
        var texto = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) transcripcionFinal += texto;
        else parcial += texto;
      }
      actualizarParcial();
    });

    reconocimiento.addEventListener("error", function (ev) {
      reconocedorActivo = null;
      btnHablar.disabled = false;
      var mensajes = {
        "no-speech": "No se detectó voz. Intenta hablar un poco más fuerte o más cerca del micrófono.",
        "not-allowed": "No se dio permiso de micrófono. Revisa los permisos de Safari para esta página.",
        "permission-denied": "No se dio permiso de micrófono. Revisa los permisos de Safari para esta página.",
        network: "Hubo un problema de red con el reconocimiento de voz."
      };
      var mensaje = mensajes[ev.error] || "Algo salió mal con el reconocimiento de voz (" + ev.error + ").";
      zonaReconocimiento.innerHTML =
        '<div class="panel-retro error">' +
        '<p class="titulo-retro">No se pudo reconocer</p>' +
        "<p>" +
        mensaje +
        "</p>" +
        '<button type="button" class="boton-principal" id="btn-reintentar" style="margin-top:12px">Reintentar</button>' +
        "</div>";
      zonaReconocimiento.querySelector("#btn-reintentar").addEventListener("click", function () {
        iniciarReconocimiento(el, t, ejercicio, esSombra, fraseMostrada);
      });
    });

    reconocimiento.addEventListener("end", function () {
      reconocedorActivo = null;
      btnHablar.disabled = false;
      if (!transcripcionFinal && !parcial) return; // ya se mostró el error correspondiente, si lo hubo
      var textoDicho = transcripcionFinal || parcial;
      mostrarResultado(el, t, ejercicio, esSombra, fraseMostrada, textoDicho);
    });

    try {
      reconocimiento.start();
    } catch (e) {
      reconocedorActivo = null;
      btnHablar.disabled = false;
      zonaReconocimiento.innerHTML = '<p class="mensaje-error">No se pudo iniciar el reconocimiento: ' + global.App.Util.escaparHTML(e.message) + "</p>";
    }
  }

  function mostrarResultado(el, t, ejercicio, esSombra, fraseMostrada, textoDicho) {
    var esc = global.App.Util.escaparHTML;
    var zonaRetro = el.querySelector("#zona-retro");

    if (!esSombra) {
      // responder_prompt: no hay una frase "correcta" contra la cual comparar. Se muestra lo
      // que se entendió y se cuenta como intento válido (cualquier respuesta abierta cuenta).
      zonaRetro.innerHTML =
        '<div class="panel-retro exito">' +
        '<p class="titulo-retro">¡Listo!</p>' +
        "<p>Se entendió: “" +
        esc(textoDicho) +
        "”</p>" +
        '<div class="fila-botones" style="margin-top:12px">' +
        '<button type="button" class="boton-secundario" id="btn-otro">Otro ejercicio</button>' +
        '<button type="button" class="boton-principal" id="btn-terminar">Terminar</button>' +
        "</div>" +
        "</div>";
      conectarBotonesFinales(el, t, true);
      return;
    }

    var resultado = global.App.Habla.comparar(fraseMostrada, textoDicho);
    var esBuena = resultado.porcentaje >= UMBRAL_ACIERTO;

    var listaPalabras = function (palabras, clase) {
      if (!palabras.length) return "";
      return palabras
        .map(function (p) {
          return '<span class="chip ' + clase + '"><span class="punto" aria-hidden="true"></span>' + esc(p) + "</span>";
        })
        .join(" ");
    };

    zonaRetro.innerHTML =
      '<div class="panel-retro ' +
      (esBuena ? "exito" : "error") +
      '">' +
      '<p class="titulo-retro">' +
      (esBuena ? "¡Bien! " : "Vas por buen camino — ") +
      resultado.porcentaje +
      "% parecido</p>" +
      '<p class="texto-caption">El reconocimiento de voz es aproximado: esto es una guía, no una calificación exacta.</p>' +
      (resultado.acertadas.length ? '<p style="margin-top:8px">' + listaPalabras(resultado.acertadas, "chip-lectura") + "</p>" : "") +
      (resultado.omitidas.length || resultado.distintas.length
        ? '<p class="texto-tenue" style="margin-top:8px">Para revisar: ' + listaPalabras(resultado.omitidas.concat(resultado.distintas), "chip-habla") + "</p>"
        : "") +
      '<div class="fila-botones" style="margin-top:12px">' +
      '<button type="button" class="boton-secundario" id="btn-otro">Otro ejercicio</button>' +
      '<button type="button" class="boton-principal" id="btn-terminar">Terminar</button>' +
      "</div>" +
      "</div>";

    conectarBotonesFinales(el, t, esBuena);
  }

  function registrarIntento(el, t, fueBien) {
    sesion.intentos += 1;
    if (fueBien) sesion.correctas += 1;
    el.querySelector("#zona-reconocimiento").innerHTML =
      '<p class="texto-tenue" style="margin-top:8px">Autoevaluación registrada. ' +
      '<button type="button" class="boton-secundario" id="btn-otro-auto" style="margin-top:8px">Otro ejercicio</button></p>';
    el.querySelector("#btn-otro-auto").addEventListener("click", function () {
      pintarEjercicio(el, t, elegirEjercicioAlAzar());
    });
  }

  function conectarBotonesFinales(el, t, fueBien) {
    sesion.intentos += 1;
    if (fueBien) sesion.correctas += 1;

    el.querySelector("#btn-otro").addEventListener("click", function () {
      pintarEjercicio(el, t, elegirEjercicioAlAzar());
    });
    el.querySelector("#btn-terminar").addEventListener("click", function () {
      finalizarSesionSiActiva().then(function () {
        location.hash = "#/inicio";
      });
    });
  }

  global.addEventListener("hashchange", function () {
    if (location.hash.indexOf("habla") === -1) finalizarSesionSiActiva();
  });

  global.App = global.App || {};
  global.App.Screens = global.App.Screens || {};
  global.App.Screens.habla = { render: render };
})(typeof window !== "undefined" ? window : globalThis);
