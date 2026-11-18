/* Pantalla de conversación con IA (ver DECISIONES.md D24). Requiere que Alex haya desplegado
   su propio proxy (Cloudflare Worker) y activado la función en Ajustes -- sin eso, solo se
   muestra una pantalla explicando qué falta, nunca un error críptico.

   Reutiliza la misma disciplina de micrófono que js/screens/habla.js (D12): SOLO
   SpeechRecognition, nunca MediaRecorder, así que no hay conflicto que resolver -- el único
   cuidado real es no escuchar mientras App.TTS sigue reproduciendo, y liberar siempre el
   reconocedor (abort) al terminar, al salir o en cualquier ruta de error.

   requiere_prueba_iphone: true -- la lógica de payload/respuesta se prueba con tests (ver
   tests/core/conversacion.test.js); el micrófono/reconocimiento y el proxy real en producción
   solo los puede probar Alex, con su propio Worker desplegado y su propia clave de API. */
(function (global) {
  "use strict";

  var NOMBRE_ESCENARIO = {
    correos: "Correo de trabajo",
    reuniones: "Reunión de equipo",
    standups: "Standup diario",
    explicar_proyecto: "Explicar tu proyecto",
    pedir_ayuda: "Pedir ayuda",
    dar_feedback: "Dar feedback",
    entrevistas: "Entrevista de trabajo"
  };

  var SALUDO_POR_ESCENARIO = {
    correos: "Hi! I'm your manager -- I just saw your email. What did you want to follow up on?",
    reuniones: "Hey, thanks for joining. Want to kick things off and tell me where we're at?",
    standups: "Morning! Let's start with you -- what did you work on yesterday?",
    explicar_proyecto: "Hi! I heard you're working on something interesting. Can you walk me through it?",
    pedir_ayuda: "Hey, what's up? You said you needed a hand with something?",
    dar_feedback: "Hi, thanks for making time. What feedback did you want to share?",
    entrevistas: "Thanks for coming in. To start, can you tell me a bit about yourself?"
  };

  var UMBRAL_HISTORIAL_VISIBLE = 50; // tope defensivo de burbujas en el DOM; el historial enviado ya se recorta en App.Conversacion

  // Estado de la sesión en curso (vive mientras el usuario está en esta pantalla).
  var sesion = null; // { inicioMs, intentos, correctas, finalizada }
  var historial = []; // [{rol, texto}], se recorta al enviarse (ver App.Conversacion.recortarHistorial)
  var reconocedorActivo = null;

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
    historial = [];
    if (sesion.intentos === 0) return Promise.resolve();
    var minutos = Math.max(1, Math.round((Date.now() - sesion.inicioMs) / 60000));
    return global.App.Datos.registrarSesion(minutos, sesion.correctas, new Date());
  }

  function render(el, ctx) {
    el.innerHTML = '<div class="estado-vacio">…</div>';

    global.App.Datos.obtenerPreferencias().then(function (prefs) {
      if (!prefs.conversacionActivada || !prefs.conversacionWorkerUrl) {
        pintarNoConfigurado(el);
        return;
      }
      global.App.Datos.obtenerUltimoDiagnostico().then(function (diagnostico) {
        var nivelCEFR = (diagnostico && diagnostico.porHabilidad.habla && diagnostico.porHabilidad.habla.nivelCEFR) || "B1";
        pintarSelectorEscenario(el, prefs.conversacionWorkerUrl, nivelCEFR);
      });
    });
  }

  function pintarNoConfigurado(el) {
    el.innerHTML =
      '<div class="pantalla-vista ancho-lectura">' +
      "<h1>Conversación con IA</h1>" +
      '<div class="estado-vacio">' +
      "<p>Todavía no está configurada: necesitas desplegar tu propio proxy y activarlo en Ajustes.</p>" +
      "<p class=\"texto-caption\">Ver REPORTE_CONVERSACION_IA.md para los pasos.</p>" +
      '<button type="button" class="boton-principal" id="btn-ir-ajustes" style="margin-top:12px">Ir a Ajustes</button>' +
      "</div>" +
      "</div>";
    el.querySelector("#btn-ir-ajustes").addEventListener("click", function () {
      location.hash = "#/ajustes";
    });
  }

  function pintarSelectorEscenario(el, workerUrl, nivelCEFR) {
    var esc = global.App.Util.escaparHTML;
    var chips = Object.keys(NOMBRE_ESCENARIO)
      .map(function (clave) {
        return '<button type="button" class="boton-secundario" data-escenario="' + clave + '">' + esc(NOMBRE_ESCENARIO[clave]) + "</button>";
      })
      .join("");

    el.innerHTML =
      '<div class="pantalla-vista ancho-lectura">' +
      "<h1>Conversación con IA</h1>" +
      '<p class="texto-tenue">Elige una situación para practicar</p>' +
      '<div class="fila-botones entrada-escalonada" style="flex-wrap:wrap;margin-top:12px">' +
      chips +
      "</div>" +
      "</div>";

    el.querySelectorAll("[data-escenario]").forEach(function (boton) {
      boton.addEventListener("click", function () {
        iniciarConversacion(el, boton.getAttribute("data-escenario"), workerUrl, nivelCEFR);
      });
    });
  }

  function iniciarConversacion(el, escenario, workerUrl, nivelCEFR) {
    sesion = { inicioMs: Date.now(), intentos: 0, correctas: 0, finalizada: false };
    historial = [];
    pintarPantallaChat(el, escenario, workerUrl, nivelCEFR);
    // Nada de reproducción automática: el saludo se ve en texto; el audio solo suena si el
    // usuario toca el botón de escuchar de la burbuja.
    agregarBurbuja(el, "asistente", SALUDO_POR_ESCENARIO[escenario]);
  }

  function pintarPantallaChat(el, escenario, workerUrl, nivelCEFR) {
    var esc = global.App.Util.escaparHTML;
    el.innerHTML =
      '<div class="pantalla-vista ancho-lectura">' +
      "<h1>" +
      esc(NOMBRE_ESCENARIO[escenario]) +
      "</h1>" +
      '<p class="texto-caption">Las respuestas vienen de un modelo de lenguaje: son una guía de práctica, no una corrección oficial.</p>' +
      '<div class="conversacion-historial" id="zona-historial"></div>' +
      '<div id="zona-reconocimiento"></div>' +
      '<button type="button" class="boton-principal" id="btn-hablar" style="margin-top:12px">' +
      global.App.Iconos.svg("microfono", 18) +
      " Hablar</button>" +
      '<button type="button" class="enlace-discreto" id="btn-terminar-conversacion" style="margin-top:12px">Terminar</button>' +
      "</div>";

    el.querySelector("#btn-hablar").addEventListener("click", function () {
      iniciarReconocimiento(el, escenario, workerUrl, nivelCEFR);
    });
    el.querySelector("#btn-terminar-conversacion").addEventListener("click", function () {
      finalizarSesionSiActiva().then(function () {
        location.hash = "#/inicio";
      });
    });
  }

  function agregarBurbuja(el, rol, texto) {
    var esc = global.App.Util.escaparHTML;
    var zona = el.querySelector("#zona-historial");
    if (!zona) return;
    var esAsistente = rol === "asistente";
    var div = document.createElement("div");
    div.className = "burbuja " + (esAsistente ? "burbuja-asistente" : "burbuja-usuario");
    div.innerHTML =
      "<p>" +
      esc(texto) +
      "</p>" +
      (esAsistente
        ? '<button type="button" class="enlace-discreto boton-escuchar-burbuja" aria-label="Escuchar" style="margin-top:4px">' +
          global.App.Iconos.svg("bocina", 16) +
          "</button>"
        : "");
    zona.appendChild(div);
    if (esAsistente) {
      div.querySelector(".boton-escuchar-burbuja").addEventListener("click", function () {
        global.App.TTS.hablar(texto, "en-US").catch(function () {
          /* sin Web Speech disponible: el texto ya se ve en la burbuja */
        });
      });
    }
    while (zona.children.length > UMBRAL_HISTORIAL_VISIBLE) {
      zona.removeChild(zona.firstChild);
    }
    zona.scrollTop = zona.scrollHeight;
  }

  function iniciarReconocimiento(el, escenario, workerUrl, nivelCEFR) {
    var Reconocedor = global.SpeechRecognition || global.webkitSpeechRecognition;
    var btnHablar = el.querySelector("#btn-hablar");
    var zonaReconocimiento = el.querySelector("#zona-reconocimiento");
    zonaReconocimiento.innerHTML = "";

    if (!Reconocedor) {
      pintarEntradaTexto(el, escenario, workerUrl, nivelCEFR);
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
      zonaReconocimiento.innerHTML = '<p class="texto-tenue">Escuchando… ' + global.App.Util.escaparHTML(parcial) + "</p>";
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
        '<p class="titulo-retro">No se pudo reconocer</p><p>' +
        mensaje +
        "</p>" +
        '<button type="button" class="boton-principal" id="btn-reintentar-reconocer" style="margin-top:12px">Reintentar</button>' +
        "</div>";
      zonaReconocimiento.querySelector("#btn-reintentar-reconocer").addEventListener("click", function () {
        iniciarReconocimiento(el, escenario, workerUrl, nivelCEFR);
      });
    });

    reconocimiento.addEventListener("end", function () {
      reconocedorActivo = null;
      if (!transcripcionFinal && !parcial) {
        btnHablar.disabled = false;
        return; // ya se mostró el error correspondiente, si lo hubo
      }
      zonaReconocimiento.innerHTML = "";
      enviarTurno(el, transcripcionFinal || parcial, escenario, workerUrl, nivelCEFR);
    });

    try {
      reconocimiento.start();
    } catch (e) {
      reconocedorActivo = null;
      btnHablar.disabled = false;
      zonaReconocimiento.innerHTML = '<p class="mensaje-error">No se pudo iniciar el reconocimiento: ' + global.App.Util.escaparHTML(e.message) + "</p>";
    }
  }

  function pintarEntradaTexto(el, escenario, workerUrl, nivelCEFR) {
    var zonaReconocimiento = el.querySelector("#zona-reconocimiento");
    zonaReconocimiento.innerHTML =
      '<div class="fila">' +
      '<p class="texto-tenue">Este navegador no tiene reconocimiento de voz. Escribe tu respuesta:</p>' +
      '<input type="text" id="input-texto-conversacion" class="campo-texto" style="margin-top:8px" />' +
      '<button type="button" class="boton-principal" id="btn-enviar-texto" style="margin-top:8px">Enviar</button>' +
      "</div>";
    var input = zonaReconocimiento.querySelector("#input-texto-conversacion");
    zonaReconocimiento.querySelector("#btn-enviar-texto").addEventListener("click", function () {
      var texto = input.value.trim();
      if (!texto) return;
      zonaReconocimiento.innerHTML = "";
      enviarTurno(el, texto, escenario, workerUrl, nivelCEFR);
    });
  }

  function enviarTurno(el, textoUsuario, escenario, workerUrl, nivelCEFR, esReintento) {
    var btnHablar = el.querySelector("#btn-hablar");
    var zonaReconocimiento = el.querySelector("#zona-reconocimiento");
    var historialPrevio = historial;

    // Un reintento (tras un error) ya mostró la burbuja del usuario la primera vez -- no
    // volver a agregarla, o se ve duplicada en el historial visible.
    if (!esReintento) agregarBurbuja(el, "usuario", textoUsuario);
    btnHablar.disabled = true;
    zonaReconocimiento.innerHTML = '<p class="texto-tenue" id="indicador-escribiendo">…</p>';

    var payload = global.App.Conversacion.construirPayload(historialPrevio, textoUsuario, {
      escenario: escenario,
      nivelCEFR: nivelCEFR
    });

    global.App.IA.enviarMensaje(workerUrl, payload).then(function (res) {
      zonaReconocimiento.innerHTML = "";
      // Cuenta una sola vez por turno lógico, no por cada reintento tras un error.
      if (!esReintento) sesion.intentos += 1;

      if (res.status === 200) {
        var resultado = global.App.Conversacion.parsearRespuesta(res.json);
        if (resultado.ok) {
          sesion.correctas += 1;
          historial = global.App.Conversacion.agregarTurno(
            global.App.Conversacion.agregarTurno(historialPrevio, "usuario", textoUsuario),
            "asistente",
            resultado.texto
          );
          // Nada de reproducción automática: el audio solo suena si el usuario toca el botón
          // de escuchar de la burbuja (ver agregarBurbuja).
          agregarBurbuja(el, "asistente", resultado.texto);
          btnHablar.disabled = false;
          return;
        }
        mostrarErrorConversacion(el, resultado.error, textoUsuario, escenario, workerUrl, nivelCEFR);
        return;
      }
      mostrarErrorConversacion(el, global.App.Conversacion.mensajeError(res.status), textoUsuario, escenario, workerUrl, nivelCEFR);
    });
  }

  function mostrarErrorConversacion(el, mensaje, textoUsuario, escenario, workerUrl, nivelCEFR) {
    var esc = global.App.Util.escaparHTML;
    var btnHablar = el.querySelector("#btn-hablar");
    var zonaReconocimiento = el.querySelector("#zona-reconocimiento");
    btnHablar.disabled = false;
    zonaReconocimiento.innerHTML =
      '<div class="panel-retro error">' +
      "<p>" +
      esc(mensaje) +
      "</p>" +
      '<button type="button" class="boton-secundario" id="btn-reintentar-turno" style="margin-top:8px">Reintentar</button>' +
      "</div>";
    zonaReconocimiento.querySelector("#btn-reintentar-turno").addEventListener("click", function () {
      zonaReconocimiento.innerHTML = "";
      enviarTurno(el, textoUsuario, escenario, workerUrl, nivelCEFR, true);
    });
  }

  global.addEventListener("hashchange", function () {
    if (location.hash.indexOf("conversacion") === -1) finalizarSesionSiActiva();
  });

  global.App = global.App || {};
  global.App.Screens = global.App.Screens || {};
  global.App.Screens.conversacion = { render: render };
})(typeof window !== "undefined" ? window : globalThis);
