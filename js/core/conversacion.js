/* App.Conversacion — lógica pura para la conversación con IA (ver DECISIONES.md D24):
   arma el payload que se manda al proxy (Cloudflare Worker) e interpreta su respuesta.
   Nunca hace fetch aquí -- eso vive en js/core/ia.js (hook sustituible, mismo patrón que
   App.TTS) y en la pantalla. Sin DOM, para poder probarla con el runner de tests. */
(function (global) {
  "use strict";

  var MODELO = "claude-haiku-5-5"; // revisar: true -- el modelo más barato disponible al escribir esto
  var MAX_TOKENS_RESPUESTA = 300; // revisar: true -- acota el costo/largo de cada respuesta
  var MAX_TURNOS_HISTORIAL = 8; // revisar: true -- cuántos turnos previos se reenvían (acota el costo de entrada)

  // Mismas 7 situaciones ya escritas en data/content/fase1/frases_utiles.json (fase 1:
  // carrera/comunicación profesional), para no inventar escenarios nuevos.
  var ESCENARIOS = {
    correos: "writing a work email",
    reuniones: "a team meeting",
    standups: "a daily standup meeting",
    explicar_proyecto: "explaining your project to a manager or teammate",
    pedir_ayuda: "asking a coworker for help",
    dar_feedback: "giving feedback to a teammate",
    entrevistas: "a job interview"
  };

  function construirSistema(escenario, nivelCEFR) {
    var situacion = ESCENARIOS[escenario] || ESCENARIOS.reuniones;
    var nivel = nivelCEFR || "B1";
    return (
      "You are a friendly English conversation partner helping someone who studies AI " +
      "engineering practice professional spoken English. The scenario is: " + situacion + ". " +
      "Their estimated level is " + nivel + " (CEFR) -- use vocabulary and sentence length " +
      "they can follow, but don't simplify so much that it stops being useful practice. " +
      "Stay in the scenario and react naturally, like a real colleague would. If they make a " +
      "grammar or word-choice mistake, weave a brief, encouraging correction into your reply " +
      "(never a list, never a grade) and keep the conversation moving. Keep replies short -- " +
      "2 to 4 sentences -- since this is a spoken conversation, not an essay."
    );
  }

  function agregarTurno(historial, rol, texto) {
    return (historial || []).concat([{ rol: rol, texto: String(texto || "") }]);
  }

  /** Conserva los últimos N turnos. Si hay que recortar, recorta en pares para nunca dejar
   * el historial empezando en "asistente" (la API exige alternar y empezar en "usuario"). */
  function recortarHistorial(historial, maxTurnos) {
    var lista = historial || [];
    if (lista.length <= maxTurnos) return lista.slice();
    var exceso = lista.length - maxTurnos;
    if (exceso % 2 !== 0) exceso += 1;
    return lista.slice(exceso);
  }

  function construirPayload(historial, mensajeNuevo, opciones) {
    var opts = opciones || {};
    var historialRecortado = recortarHistorial(historial, MAX_TURNOS_HISTORIAL);
    var mensajes = historialRecortado.map(function (turno) {
      return { role: turno.rol === "asistente" ? "assistant" : "user", content: turno.texto };
    });
    mensajes.push({ role: "user", content: String(mensajeNuevo || "") });

    return {
      model: MODELO,
      max_tokens: MAX_TOKENS_RESPUESTA,
      system: construirSistema(opts.escenario, opts.nivelCEFR),
      messages: mensajes
    };
  }

  /** Interpreta el JSON de respuesta del proxy (que a su vez reenvía la forma de la API de
   * mensajes de Anthropic). Nunca asume que la forma es válida. */
  function parsearRespuesta(json) {
    if (!json || typeof json !== "object") {
      return { ok: false, error: "respuesta_invalida" };
    }
    if (json.type === "error") {
      return { ok: false, error: (json.error && json.error.message) || "error_api" };
    }
    var bloques = Array.isArray(json.content) ? json.content : [];
    var bloqueTexto = bloques.filter(function (b) {
      return b && b.type === "text" && b.text;
    })[0];
    if (!bloqueTexto) {
      return { ok: false, error: "respuesta_vacia" };
    }
    return { ok: true, texto: bloqueTexto.text };
  }

  /** Traduce un código de estado HTTP del proxy a un mensaje claro para Alex. */
  function mensajeError(status) {
    var mensajes = {
      0: "No se pudo conectar. Revisa tu conexión a internet.",
      403: "El servidor del proxy rechazó la petición (origen no permitido).",
      429: "Ya usaste la conversación con IA disponible por hoy. Vuelve mañana.",
      500: "El proxy o la API de Anthropic tuvieron un error. Intenta de nuevo en un momento."
    };
    return mensajes[status] || "Algo salió mal al hablar con el modelo (código " + status + ").";
  }

  global.App = global.App || {};
  global.App.Conversacion = {
    MODELO: MODELO,
    MAX_TOKENS_RESPUESTA: MAX_TOKENS_RESPUESTA,
    MAX_TURNOS_HISTORIAL: MAX_TURNOS_HISTORIAL,
    ESCENARIOS: ESCENARIOS,
    construirSistema: construirSistema,
    agregarTurno: agregarTurno,
    recortarHistorial: recortarHistorial,
    construirPayload: construirPayload,
    parsearRespuesta: parsearRespuesta,
    mensajeError: mensajeError
  };
})(typeof window !== "undefined" ? window : globalThis);
