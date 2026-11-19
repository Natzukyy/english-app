/* App.TTS — hook de síntesis de voz, sustituible.
   PROMPT_BASE.md: "no asumas que funciona en iOS, verifícalo". Mientras tanto, el resto de la
   app solo llama a App.TTS.hablar(texto, idioma) y nunca a speechSynthesis directamente, para
   poder cambiar la implementación (p. ej. por una nativa de Capacitor) sin tocar las pantallas.

   Selección de voz: por defecto, Web Speech puede elegir una voz "de novedad" del sistema
   (Whisper, Zarvox, Bad News...) que suena susurrada o inquietante en vez de natural. Se
   excluyen esas voces explícitamente y se prioriza una lista de voces naturales conocidas
   (ver VOCES_PREFERIDAS), con preferencia por sus variantes "(Enhanced)"/"(Premium)" si el
   sistema las tiene instaladas. La preferencia elegida en Ajustes manda si todavía existe en
   el dispositivo; si no, se vuelve al orden por defecto. */
(function (global) {
  "use strict";

  var VELOCIDAD_DEFECTO = 0.95; // dentro del rango pedido (0.9-1.0)

  // Nombres de voces "de novedad" de macOS/iOS: suenan a efecto de sonido, no a voz natural.
  var VOCES_NOVEDAD = [
    "Albert", "Bad News", "Bahh", "Bells", "Boing", "Bubbles", "Cellos", "Deranged",
    "Eddy", "Flo", "Good News", "Grandma", "Grandpa", "Hysterical", "Jester", "Junior",
    "Kathy", "Organ", "Pipe Organ", "Princess", "Ralph", "Reed", "Rocko", "Sandy",
    "Shelley", "Superstar", "Trinoids", "Whisper", "Wobble", "Zarvox"
  ];

  // Orden de preferencia para voces naturales, de mejor a peor (ver tarea de Alex).
  var VOCES_PREFERIDAS = ["Samantha", "Daniel", "Karen", "Moira", "Tessa", "Rishi"];

  function nombreBase(nombreVoz) {
    return (nombreVoz || "").replace(/\s*\((Enhanced|Premium)\)\s*$/i, "").trim();
  }

  function esVariantePremium(nombreVoz) {
    return /\((Enhanced|Premium)\)\s*$/i.test(nombreVoz || "");
  }

  function esVozDeNovedad(voz) {
    var base = nombreBase(voz && voz.name);
    return VOCES_NOVEDAD.some(function (nombre) {
      return nombre.toLowerCase() === base.toLowerCase();
    });
  }

  function esVozEnIngles(voz) {
    return /^en([-_]|$)/i.test((voz && voz.lang) || "");
  }

  /** Voces en inglés que no son de novedad -- las únicas candidatas a elegirse. */
  function vocesUtiles(voces) {
    return (voces || []).filter(function (voz) {
      return esVozEnIngles(voz) && !esVozDeNovedad(voz);
    });
  }

  /** Elige la mejor voz disponible: la preferencia guardada si sigue existiendo, luego el
   * orden de VOCES_PREFERIDAS (variante Enhanced/Premium antes que la plana), luego la
   * primera en-US útil, luego cualquier útil. Devuelve null si no hay ninguna (respaldo:
   * se deja que el navegador use su voz por defecto). */
  function elegirVoz(voces, nombrePreferido) {
    var utiles = vocesUtiles(voces);
    if (!utiles.length) return null;

    if (nombrePreferido) {
      var guardada = utiles.filter(function (voz) {
        return voz.name === nombrePreferido;
      })[0];
      if (guardada) return guardada;
      // La voz guardada ya no existe en este dispositivo: se sigue con el orden por defecto.
    }

    for (var i = 0; i < VOCES_PREFERIDAS.length; i++) {
      var candidatas = utiles.filter(function (voz) {
        return nombreBase(voz.name) === VOCES_PREFERIDAS[i];
      });
      if (!candidatas.length) continue;
      var premium = candidatas.filter(function (voz) {
        return esVariantePremium(voz.name);
      })[0];
      if (premium) return premium;
      return candidatas[0];
    }

    var primeraEnUS = utiles.filter(function (voz) {
      return /^en-US$/i.test(voz.lang || "");
    })[0];
    if (primeraEnUS) return primeraEnUS;

    return utiles[0];
  }

  var vozPreferidaActual = ""; // nombre de voz guardado en Ajustes; "" = sin preferencia

  function establecerVozPreferida(nombreVoz) {
    vozPreferidaActual = nombreVoz || "";
  }

  function obtenerVozPreferida() {
    return vozPreferidaActual;
  }

  /** speechSynthesis.getVoices() puede devolver [] antes de que el navegador termine de
   * cargar las voces del sistema; en ese caso se espera una vez a "voiceschanged", con un
   * respaldo por tiempo para no bloquear la reproducción para siempre si el evento no llega. */
  function obtenerVocesListas() {
    if (!global.speechSynthesis) return Promise.resolve([]);
    var voces = global.speechSynthesis.getVoices();
    if (voces && voces.length) return Promise.resolve(voces);
    return new Promise(function (resolve) {
      var resuelto = false;
      function terminar() {
        if (resuelto) return;
        resuelto = true;
        global.speechSynthesis.removeEventListener("voiceschanged", terminar);
        resolve(global.speechSynthesis.getVoices());
      }
      global.speechSynthesis.addEventListener("voiceschanged", terminar);
      global.setTimeout(terminar, 300);
    });
  }

  function implementacionWebSpeech(texto, idioma, velocidad) {
    return new Promise(function (resolve, reject) {
      if (!global.speechSynthesis || typeof global.SpeechSynthesisUtterance === "undefined") {
        reject(new Error("Web Speech API no disponible en este navegador"));
        return;
      }

      // Playwright/webdriver: nunca reproducir audio real durante una revisión automatizada.
      if (global.navigator && global.navigator.webdriver) {
        resolve();
        return;
      }

      obtenerVocesListas().then(function (voces) {
        var utterance = new global.SpeechSynthesisUtterance(texto);
        utterance.lang = idioma || "en-US";
        // "velocidad" es opcional (p. ej. Escucha lo usa para su botón "más despacio") --
        // sin tocar el comportamiento por defecto de nadie más, que sigue siendo
        // VELOCIDAD_DEFECTO tal cual.
        utterance.rate = velocidad || VELOCIDAD_DEFECTO;
        var voz = elegirVoz(voces, vozPreferidaActual);
        if (voz) utterance.voice = voz;
        utterance.onend = function () {
          resolve();
        };
        utterance.onerror = function (evento) {
          reject(evento.error || new Error("Error de síntesis de voz"));
        };
        global.speechSynthesis.speak(utterance);
      });
    });
  }

  var implementacionActual = implementacionWebSpeech;

  function hablar(texto, idioma, velocidad) {
    return implementacionActual(texto, idioma, velocidad);
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
    restaurarImplementacionPorDefecto: restaurarImplementacionPorDefecto,
    elegirVoz: elegirVoz,
    vocesUtiles: vocesUtiles,
    esVozDeNovedad: esVozDeNovedad,
    establecerVozPreferida: establecerVozPreferida,
    obtenerVozPreferida: obtenerVozPreferida,
    obtenerVocesListas: obtenerVocesListas
  };
})(typeof window !== "undefined" ? window : globalThis);
