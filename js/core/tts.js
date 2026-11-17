/* App.TTS — hook de síntesis de voz, sustituible.
   PROMPT_BASE.md: "no asumas que funciona en iOS, verifícalo". Mientras tanto, el resto de la
   app solo llama a App.TTS.hablar(texto, idioma) y nunca a speechSynthesis directamente, para
   poder cambiar la implementación (p. ej. por una nativa de Capacitor) sin tocar las pantallas. */
(function (global) {
  "use strict";

  function implementacionWebSpeech(texto, idioma) {
    return new Promise(function (resolve, reject) {
      if (!global.speechSynthesis || typeof global.SpeechSynthesisUtterance === "undefined") {
        reject(new Error("Web Speech API no disponible en este navegador"));
        return;
      }
      var utterance = new global.SpeechSynthesisUtterance(texto);
      utterance.lang = idioma || "en-US";
      utterance.onend = function () {
        resolve();
      };
      utterance.onerror = function (evento) {
        reject(evento.error || new Error("Error de síntesis de voz"));
      };
      global.speechSynthesis.speak(utterance);
    });
  }

  var implementacionActual = implementacionWebSpeech;

  function hablar(texto, idioma) {
    return implementacionActual(texto, idioma);
  }

  /** Permite sustituir la implementación (pruebas, Capacitor nativo, etc.). */
  function setImplementacion(fn) {
    implementacionActual = fn;
  }

  function restaurarImplementacionPorDefecto() {
    implementacionActual = implementacionWebSpeech;
  }

  global.App = global.App || {};
  global.App.TTS = {
    hablar: hablar,
    setImplementacion: setImplementacion,
    restaurarImplementacionPorDefecto: restaurarImplementacionPorDefecto
  };
})(typeof window !== "undefined" ? window : globalThis);
