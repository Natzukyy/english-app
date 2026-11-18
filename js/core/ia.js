/* App.IA — hook de red sustituible para llamar al proxy de conversación con IA (Cloudflare
   Worker, ver DECISIONES.md D24). Mismo patrón que App.TTS: el resto de la app solo llama a
   App.IA.enviarMensaje y nunca hace fetch directo al worker, para poder sustituir la
   implementación en pruebas o cambiarla después sin tocar la pantalla. */
(function (global) {
  "use strict";

  function implementacionFetch(url, payload) {
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(
      function (respuesta) {
        return respuesta
          .json()
          .catch(function () {
            return null;
          })
          .then(function (json) {
            return { status: respuesta.status, json: json };
          });
      },
      function () {
        return { status: 0, json: null }; // sin red / CORS / el worker no respondió
      }
    );
  }

  var implementacionActual = implementacionFetch;

  function enviarMensaje(url, payload) {
    return implementacionActual(url, payload);
  }

  function setImplementacion(fn) {
    implementacionActual = fn;
  }

  function restaurarImplementacionPorDefecto() {
    implementacionActual = implementacionFetch;
  }

  global.App = global.App || {};
  global.App.IA = {
    enviarMensaje: enviarMensaje,
    setImplementacion: setImplementacion,
    restaurarImplementacionPorDefecto: restaurarImplementacionPorDefecto
  };
})(typeof window !== "undefined" ? window : globalThis);
