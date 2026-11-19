/* Pantalla de habla: SOLO reconocimiento de voz (SpeechRecognition), nunca grabación de
   audio (MediaRecorder) -- ver CLAUDE.md/DECISIONES.md D12: grabar y reconocer no deben usar
   el micrófono al mismo tiempo. Aquí no hay tensión porque nunca se graba audio en esta
   pantalla; el único cuidado real es no arrancar el reconocimiento mientras todavía se está
   reproduciendo el modelo (TTS), y liberar siempre el reconocedor (stop/abort) al terminar
   o al salir. requiere_prueba_iphone: true -- la lógica de comparación se prueba con tests
   (ver tests/core/habla.test.js); el micrófono/reconocimiento real solo se puede probar en
   el iPhone de Alex.

   Rediseño "Calcomanías oscuro" (ver spec de Alex, sesión calcomanías): tarjeta crema con
   la frase + botón "Escuchar" azul a la izquierda (laptop) / arriba (celular); panel de
   micrófono coral con ondas pulsantes SOLO mientras graba de verdad a la derecha / abajo.
   Reintentar repite la MISMA frase (antes "Otro ejercicio" siempre elegía una al azar, sin
   forma de reintentar la que acabas de intentar); Siguiente elige una nueva al azar. No hay
   botón "Terminar" explícito -- la sesión se cierra igual al salir por el nav (ver el
   listener de "hashchange" al final de este archivo, no cambió). */
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
    var etiqueta = esSombra ? "Repite la frase" : "Responde en voz alta";

    el.innerHTML =
      '<div class="pantalla-vista pantalla-habla">' +
      "<h1>Habla</h1>" +
      '<div class="habla-cuerpo">' +
      '<div class="habla-tarjeta calcomania pop-entrada" style="background:var(--crema);--r:-1deg">' +
      '<span class="habla-etiqueta">' +
      esc(etiqueta.toUpperCase()) +
      " · " +
      esc(ejercicio.nivelCEFR) +
      "</span>" +
      '<p class="habla-frase">' +
      esc(fraseMostrada) +
      "</p>" +
      '<button type="button" class="habla-boton-escuchar calcomania calcomania-presionable" id="btn-escuchar" style="background:var(--azul);--r:0deg">' +
      global.App.Iconos.svg("bocina", 18) +
      "<span>" +
      (esSombra ? "Escuchar el modelo" : "Escuchar la pregunta") +
      "</span></button>" +
      "</div>" +
      '<div class="habla-panel-mic superficie-oscura pop-entrada" id="panel-mic">' +
      '<div class="habla-mic-wrap" id="mic-wrap">' +
      '<span class="habla-onda habla-onda-1"></span>' +
      '<span class="habla-onda habla-onda-2"></span>' +
      '<button type="button" class="habla-boton-mic calcomania calcomania-presionable" id="btn-hablar" aria-label="Hablar" style="background:var(--coral);--r:0deg">' +
      global.App.Iconos.svg("microfono", 36) +
      "</button>" +
      "</div>" +
      '<p class="habla-estado-mic" id="estado-mic">Toca el micrófono para hablar</p>' +
      '<div id="zona-reconocimiento"></div>' +
      '<div id="zona-retro"></div>' +
      "</div>" +
      "</div>" +
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
    // Nada de reproducción automática: el modelo solo suena cuando el usuario toca "Escuchar".

    btnHablar.addEventListener("click", function () {
      iniciarReconocimiento(el, t, ejercicio, esSombra, fraseMostrada);
    });
  }

  function iniciarReconocimiento(el, t, ejercicio, esSombra, fraseMostrada) {
    var Reconocedor = global.SpeechRecognition || global.webkitSpeechRecognition;
    var btnHablar = el.querySelector("#btn-hablar");
    var micWrap = el.querySelector("#mic-wrap");
    var estadoMic = el.querySelector("#estado-mic");
    var zonaReconocimiento = el.querySelector("#zona-reconocimiento");
    var zonaRetro = el.querySelector("#zona-retro");
    zonaRetro.innerHTML = "";

    if (!Reconocedor) {
      zonaReconocimiento.innerHTML =
        '<div class="panel-retro error">' +
        '<p class="titulo-retro">Este navegador no tiene reconocimiento de voz</p>' +
        "<p>Puedes autoevaluarte: ¿cómo te salió?</p>" +
        '<div class="fila-botones" style="margin-top:8px">' +
        '<button type="button" class="boton-secundario estado-correcto" id="btn-auto-bien">Me salió bien</button>' +
        '<button type="button" class="boton-secundario estado-incorrecto" id="btn-auto-mal">Me costó trabajo</button>' +
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
    // Las ondas pulsantes SOLO corren mientras se está grabando de verdad -- arrancan aquí,
    // se detienen en CUALQUIER salida del reconocimiento (result final, error o excepción al
    // iniciar), nunca quedan girando de más.
    micWrap.classList.add("escuchando");
    estadoMic.textContent = "Escuchando… habla ahora";

    var reconocimiento = new Reconocedor();
    reconocedorActivo = reconocimiento;
    reconocimiento.lang = "en-US";
    reconocimiento.interimResults = true;
    reconocimiento.continuous = false;

    var parcial = "";
    var transcripcionFinal = "";

    function actualizarParcial() {
      zonaReconocimiento.innerHTML = '<p class="texto-tenue" id="texto-parcial">' + global.App.Util.escaparHTML(parcial) + "</p>";
    }

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
      micWrap.classList.remove("escuchando");
      estadoMic.textContent = "Toca el micrófono para hablar";
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
        '<button type="button" class="boton-principal" id="btn-reintentar-reconocer" style="margin-top:12px">Reintentar</button>' +
        "</div>";
      zonaReconocimiento.querySelector("#btn-reintentar-reconocer").addEventListener("click", function () {
        iniciarReconocimiento(el, t, ejercicio, esSombra, fraseMostrada);
      });
    });

    reconocimiento.addEventListener("end", function () {
      reconocedorActivo = null;
      btnHablar.disabled = false;
      micWrap.classList.remove("escuchando");
      estadoMic.textContent = "Toca el micrófono para hablar";
      if (!transcripcionFinal && !parcial) return; // ya se mostró el error correspondiente, si lo hubo
      var textoDicho = transcripcionFinal || parcial;
      zonaReconocimiento.innerHTML = "";
      mostrarResultado(el, t, ejercicio, esSombra, fraseMostrada, textoDicho);
    });

    try {
      reconocimiento.start();
    } catch (e) {
      reconocedorActivo = null;
      btnHablar.disabled = false;
      micWrap.classList.remove("escuchando");
      estadoMic.textContent = "Toca el micrófono para hablar";
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
        '<div class="habla-resultado pop-entrada">' +
        '<p class="titulo-retro">¡Listo!</p>' +
        "<p>Se entendió: “" +
        esc(textoDicho) +
        "”</p>" +
        '<div class="habla-botones-final">' +
        '<button type="button" class="boton-secundario" id="btn-reintentar">Reintentar</button>' +
        '<button type="button" class="boton-principal" id="btn-siguiente">Siguiente</button>' +
        "</div>" +
        "</div>";
      conectarBotonesFinales(el, t, ejercicio, true);
      return;
    }

    var resultado = global.App.Habla.comparar(fraseMostrada, textoDicho);
    var esBuena = resultado.porcentaje >= UMBRAL_ACIERTO;

    var listaPalabras = function (palabras, clase) {
      if (!palabras.length) return "";
      return palabras
        .map(function (p) {
          return '<span class="habla-chip ' + clase + '">' + esc(p) + "</span>";
        })
        .join(" ");
    };

    zonaRetro.innerHTML =
      '<div class="habla-resultado pop-entrada">' +
      '<span class="habla-pastilla-porcentaje"><span class="num-tabular" id="valor-porcentaje">0</span>%</span>' +
      '<p class="titulo-retro" style="margin-top:8px">' +
      (esBuena ? "¡Bien parecido!" : "Vas por buen camino") +
      "</p>" +
      '<p class="texto-caption">El reconocimiento de voz es aproximado: esto es una guía, no una calificación exacta.</p>' +
      '<div class="habla-chips pop-entrada-escalonada">' +
      (resultado.acertadas.length ? listaPalabras(resultado.acertadas, "habla-chip-acierto") : "") +
      (resultado.omitidas.length || resultado.distintas.length ? listaPalabras(resultado.omitidas.concat(resultado.distintas), "habla-chip-revisar") : "") +
      "</div>" +
      '<div class="habla-botones-final">' +
      '<button type="button" class="boton-secundario" id="btn-reintentar">Reintentar</button>' +
      '<button type="button" class="boton-principal" id="btn-siguiente">Siguiente</button>' +
      "</div>" +
      "</div>";

    global.App.Util.animarNumero(el.querySelector("#valor-porcentaje"), resultado.porcentaje, 700);
    conectarBotonesFinales(el, t, ejercicio, esBuena);
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

  function conectarBotonesFinales(el, t, ejercicioActual, fueBien) {
    sesion.intentos += 1;
    if (fueBien) sesion.correctas += 1;

    // Reintentar repite la MISMA frase (antes solo existía "Otro ejercicio", que siempre
    // elegía una al azar -- no había forma de volver a intentar justo la que acabas de
    // responder). Siguiente sí elige una nueva al azar.
    el.querySelector("#btn-reintentar").addEventListener("click", function () {
      pintarEjercicio(el, t, ejercicioActual);
    });
    el.querySelector("#btn-siguiente").addEventListener("click", function () {
      pintarEjercicio(el, t, elegirEjercicioAlAzar());
    });
  }

  global.addEventListener("hashchange", function () {
    if (location.hash.indexOf("habla") === -1) finalizarSesionSiActiva();
  });

  global.App = global.App || {};
  global.App.Screens = global.App.Screens || {};
  global.App.Screens.habla = { render: render };
})(typeof window !== "undefined" ? window : globalThis);
