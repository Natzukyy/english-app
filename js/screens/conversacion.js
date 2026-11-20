/* Pantalla de conversación con IA (ver DECISIONES.md D24). Requiere que Alex haya desplegado
   su propio proxy (Cloudflare Worker) y activado la función en Ajustes -- sin eso, solo se
   muestra una pantalla explicando qué falta, nunca un error críptico.

   Reutiliza la misma disciplina de micrófono que js/screens/habla.js (D12): SOLO
   SpeechRecognition, nunca MediaRecorder, así que no hay conflicto que resolver -- el único
   cuidado real es no escuchar mientras App.TTS sigue reproduciendo, y liberar siempre el
   reconocedor (abort) al terminar, al salir o en cualquier ruta de error.

   requiere_prueba_iphone: true -- la lógica de payload/respuesta se prueba con tests (ver
   tests/core/conversacion.test.js); el micrófono/reconocimiento y el proxy real en producción
   solo los puede probar Alex, con su propio Worker desplegado y su propia clave de API.

   Rediseño "Calcomanías oscuro": el selector de escenario (antes y después de empezar a
   chatear) se queda como una sola columna centrada en las dos resoluciones -- el spec solo
   describe dos columnas para la pantalla de CHAT en laptop (escenarios a la izquierda +
   panel de chat a la derecha), no para elegir el primer escenario. En esa columna izquierda
   del chat, la lista de escenarios es clickeable de verdad (cambiar de escenario empieza una
   conversación nueva ahí mismo, vía iniciarConversacion) -- decisión mía ante la ambigüedad
   del spec: un elemento interactivo con pinta de lista de opciones que no responde al toque
   se sentiría roto, y reiniciar la conversación es exactamente lo que ya hace
   iniciarConversacion para el primer escenario. Caja "Tip" con un consejo breve por
   escenario (TIP_POR_ESCENARIO abajo) -- contenido nuevo, no pedido por nombre en los datos
   existentes; sigue el mismo patrón ya usado en este archivo para NOMBRE_ESCENARIO/
   SALUDO_POR_ESCENARIO (mapas chicos en JS, no en data/ -- precedente ya establecido en esta
   pantalla antes de este rediseño, no lo cambio aquí). */
(function (global) {
  "use strict";

  // Orden de los escenarios; sus nombres y tips salen de data/i18n (conv.escenario.<clave>, conv.tip.<clave>).
  var ORDEN_ESCENARIOS = ["correos", "reuniones", "standups", "explicar_proyecto", "pedir_ayuda", "dar_feedback", "entrevistas"];

  // Traductor de la pantalla: se ata al contexto en cada render() (las funciones de abajo se llaman
  // desde manejadores de eventos, ya después de render).
  var t = function (clave) { return clave; };

  // i18n-ok-start: saludos del asistente EN INGLÉS -- es el contenido que se practica, igual en cualquier nivel de interfaz
  var SALUDO_POR_ESCENARIO = {
    correos: "Hi! I'm your manager -- I just saw your email. What did you want to follow up on?",
    reuniones: "Hey, thanks for joining. Want to kick things off and tell me where we're at?",
    standups: "Morning! Let's start with you -- what did you work on yesterday?",
    explicar_proyecto: "Hi! I heard you're working on something interesting. Can you walk me through it?",
    pedir_ayuda: "Hey, what's up? You said you needed a hand with something?",
    dar_feedback: "Hi, thanks for making time. What feedback did you want to share?",
    entrevistas: "Thanks for coming in. To start, can you tell me a bit about yourself?"
  };

  // i18n-ok-end

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
    t = global.App.I18n.traductor(ctx);
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
      '<div class="icono-mosaico" style="background:var(--surface-borde);margin-bottom:12px">' +
      global.App.Iconos.svg("candado", 20) +
      "</div>" +
      "<h1>" + global.App.Util.escaparHTML(t("conv.titulo")) + "</h1>" +
      '<div class="estado-vacio">' +
      "<p>" + global.App.Util.escaparHTML(t("conv.no_configurada")) + "</p>" +
      "<p class=\"texto-caption\">" + global.App.Util.escaparHTML(t("conv.ver_reporte")) + "</p>" +
      '<button type="button" class="boton-principal" id="btn-ir-ajustes" style="margin-top:12px">' + global.App.Util.escaparHTML(t("conv.ir_ajustes")) + '</button>' +
      "</div>" +
      "</div>";
    el.querySelector("#btn-ir-ajustes").addEventListener("click", function () {
      location.hash = "#/ajustes";
    });
  }

  function listaEscenariosHTML(esc, escenarioActivo) {
    return ORDEN_ESCENARIOS
      .map(function (clave) {
        var activo = clave === escenarioActivo;
        return (
          '<button type="button" class="conv-escenario-chip" data-escenario="' +
          clave +
          '"' +
          (activo ? ' aria-current="true"' : "") +
          ">" +
          esc(t("conv.escenario." + clave)) +
          "</button>"
        );
      })
      .join("");
  }

  function pintarSelectorEscenario(el, workerUrl, nivelCEFR) {
    var esc = global.App.Util.escaparHTML;

    el.innerHTML =
      '<div class="pantalla-vista ancho-lectura">' +
      "<h1>" + esc(t("conv.titulo")) + "</h1>" +
      '<p class="texto-tenue">' + esc(t("conv.elige_situacion")) + '</p>' +
      '<div class="conv-escenarios-selector pop-entrada-escalonada" style="margin-top:12px">' +
      listaEscenariosHTML(esc, null) +
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
      '<div class="pantalla-vista pantalla-conversacion">' +
      "<h1>" +
      esc(t("conv.escenario." + escenario)) +
      "</h1>" +
      '<div class="conv-cuerpo">' +
      '<div class="conv-columna-escenarios">' +
      '<div class="conv-escenarios-lista" id="lista-escenarios">' +
      listaEscenariosHTML(esc, escenario) +
      "</div>" +
      '<div class="conv-tip">' +
      '<p class="conv-tip-titulo">' + esc(t("conv.tip_titulo")) + '</p>' +
      "<p>" +
      esc(t("conv.tip." + escenario)) +
      "</p>" +
      "</div>" +
      "</div>" +
      '<div class="conv-panel-chat superficie-oscura">' +
      '<p class="texto-caption">' + esc(t("conv.aviso_ia")) + '</p>' +
      '<div class="conversacion-historial" id="zona-historial"></div>' +
      '<div id="zona-reconocimiento"></div>' +
      '<div class="conv-barra-entrada">' +
      '<div class="conv-mic-wrap" id="mic-wrap">' +
      '<span class="habla-onda conv-onda"></span>' +
      '<span class="habla-onda conv-onda"></span>' +
      '<button type="button" class="conv-boton-mic calcomania calcomania-presionable" id="btn-hablar" aria-label="' + esc(t("mic.hablar_aria")) + '" style="background:var(--coral);--r:0deg">' +
      global.App.Iconos.svg("microfono", 20) +
      "</button>" +
      "</div>" +
      '<button type="button" class="enlace-discreto" id="btn-terminar-conversacion">' + esc(t("comun.terminar")) + '</button>' +
      "</div>" +
      "</div>" +
      "</div>" +
      "</div>";

    el.querySelectorAll("#lista-escenarios [data-escenario]").forEach(function (boton) {
      boton.addEventListener("click", function () {
        var nuevoEscenario = boton.getAttribute("data-escenario");
        if (nuevoEscenario === escenario) return; // ya es el activo, nada que hacer
        iniciarConversacion(el, nuevoEscenario, workerUrl, nivelCEFR);
      });
    });

    el.querySelector("#btn-hablar").addEventListener("click", function () {
      iniciarReconocimiento(el, escenario, workerUrl, nivelCEFR);
    });
    el.querySelector("#btn-terminar-conversacion").addEventListener("click", function () {
      finalizarSesionSiActiva().then(function () {
        global.App.Util.terminarPasoYVolver();
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
        ? '<button type="button" class="enlace-discreto boton-escuchar-burbuja" aria-label="' + esc(t("comun.escuchar")) + '">' +
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
    var micWrap = el.querySelector("#mic-wrap");
    var zonaReconocimiento = el.querySelector("#zona-reconocimiento");
    zonaReconocimiento.innerHTML = "";

    if (!Reconocedor) {
      pintarEntradaTexto(el, escenario, workerUrl, nivelCEFR);
      return;
    }

    btnHablar.disabled = true;
    micWrap.classList.add("escuchando");
    var reconocimiento = new Reconocedor();
    reconocedorActivo = reconocimiento;
    reconocimiento.lang = "en-US";
    reconocimiento.interimResults = true;
    reconocimiento.continuous = false;

    var parcial = "";
    var transcripcionFinal = "";

    function actualizarParcial() {
      zonaReconocimiento.innerHTML = '<p class="texto-tenue">' + global.App.Util.escaparHTML(t("conv.escuchando")) + " " + global.App.Util.escaparHTML(parcial) + "</p>";
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
      micWrap.classList.remove("escuchando");
      var esc = global.App.Util.escaparHTML;
      var mensajes = {
        "no-speech": t("mic.err_no_speech"),
        "not-allowed": t("mic.err_permiso"),
        "permission-denied": t("mic.err_permiso"),
        network: t("mic.err_red")
      };
      var mensaje = mensajes[ev.error] || t("mic.err_otro", { err: ev.error });
      zonaReconocimiento.innerHTML =
        '<div class="panel-retro error">' +
        '<p class="titulo-retro">' + esc(t("mic.no_se_pudo_reconocer")) + '</p><p>' +
        esc(mensaje) +
        "</p>" +
        '<button type="button" class="boton-principal" id="btn-reintentar-reconocer" style="margin-top:12px">' + esc(t("comun.reintentar")) + '</button>' +
        "</div>";
      zonaReconocimiento.querySelector("#btn-reintentar-reconocer").addEventListener("click", function () {
        iniciarReconocimiento(el, escenario, workerUrl, nivelCEFR);
      });
    });

    reconocimiento.addEventListener("end", function () {
      reconocedorActivo = null;
      micWrap.classList.remove("escuchando");
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
      micWrap.classList.remove("escuchando");
      zonaReconocimiento.innerHTML = '<p class="mensaje-error">' + global.App.Util.escaparHTML(t("mic.no_se_pudo_iniciar", { mensaje: e.message })) + "</p>";
    }
  }

  function pintarEntradaTexto(el, escenario, workerUrl, nivelCEFR) {
    var zonaReconocimiento = el.querySelector("#zona-reconocimiento");
    zonaReconocimiento.innerHTML =
      '<div class="fila">' +
      '<p class="texto-tenue">' + global.App.Util.escaparHTML(t("conv.sin_reconocimiento_escribe")) + '</p>' +
      '<input type="text" id="input-texto-conversacion" class="campo-texto" style="margin-top:8px" />' +
      '<button type="button" class="boton-principal" id="btn-enviar-texto" style="margin-top:8px">' + global.App.Util.escaparHTML(t("conv.enviar")) + '</button>' +
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
      '<button type="button" class="boton-secundario" id="btn-reintentar-turno" style="margin-top:8px">' + esc(t("comun.reintentar")) + '</button>' +
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
