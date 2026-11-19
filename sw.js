/* Service worker — red primero, con respaldo en caché offline (app shell + datos estáticos).
   Sin librerías (Workbox incluido): es un SW escrito a mano porque no hay npm (ver DECISIONES.md D1).
   Subir CACHE_VERSION cuando cambie la lista de archivos o su contenido relevante offline.
   Ver DECISIONES.md D15: cómo se versiona la caché y qué hace falta hacer a mano en cada update. */
"use strict";

var CACHE_VERSION = "v21";
var CACHE_NAME = "app-ingles-" + CACHE_VERSION;

var ARCHIVOS_APP_SHELL = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/styles.css",
  "js/app.js",
  "js/core/util.js",
  "js/core/iconos.js",
  "js/core/storage.js",
  "js/core/i18n.js",
  "js/core/fecha.js",
  "js/core/racha.js",
  "js/core/xp.js",
  "js/core/srs.js",
  "js/core/diagnostico.js",
  "js/core/progreso.js",
  "js/core/tts.js",
  "js/core/avance.js",
  "js/core/plan.js",
  "js/core/habla.js",
  "js/core/ia.js",
  "js/core/conversacion.js",
  "js/core/datos.js",
  "data/diagnostico/banco.json",
  "data/diagnostico/rubrica_cefr.json",
  "data/content/fase1/lecturas.json",
  "data/content/fase1/vocabulario.json",
  "data/content/fase1/frases_utiles.json",
  "data/content/fase1/habla.json",
  "js/screens/inicio.js",
  "js/screens/repaso.js",
  "js/screens/diagnostico.js",
  "js/screens/progreso.js",
  "js/screens/ajustes.js",
  "js/screens/habla.js",
  "js/screens/conversacion.js",
  "data/i18n/strings.json",
  "data/i18n/umbrales.json",
  "data/config.json",
  "assets/fonts/BricolageGrotesque-Variable-latin.woff2",
  "assets/fonts/BricolageGrotesque-Variable-latin-ext.woff2",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png"
];

self.addEventListener("install", function (evento) {
  evento.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ARCHIVOS_APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (evento) {
  evento.waitUntil(
    caches.keys().then(function (nombres) {
      return Promise.all(
        nombres
          .filter(function (nombre) {
            return nombre.indexOf("app-ingles-") === 0 && nombre !== CACHE_NAME;
          })
          .map(function (nombre) {
            return caches.delete(nombre);
          })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (evento) {
  var peticion = evento.request;
  if (peticion.method !== "GET") return;

  var url = new URL(peticion.url);
  if (url.origin !== location.origin) return;

  // Red primero: así, con internet, siempre se ve la versión más reciente de cada archivo
  // (antes era caché primero, y un archivo ya cacheado nunca se volvía a pedir a la red).
  // Sin internet, cae al respaldo en caché -- la app sigue funcionando offline igual que antes.
  evento.respondWith(
    fetch(peticion)
      .then(function (respuestaRed) {
        if (respuestaRed && respuestaRed.ok) {
          var copia = respuestaRed.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(peticion, copia);
          });
        }
        return respuestaRed;
      })
      .catch(function () {
        return caches.match(peticion).then(function (respuestaCache) {
          if (respuestaCache) return respuestaCache;
          // Sin red y sin caché para este recurso: si pedían una página, devolvemos el shell.
          if (peticion.mode === "navigate") {
            return caches.match("index.html");
          }
          return Response.error();
        });
      })
  );
});
