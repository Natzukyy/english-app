/* Service worker — cache offline básico (app shell + datos estáticos).
   Sin librerías (Workbox incluido): es un SW escrito a mano porque no hay npm (ver DECISIONES.md D1).
   Subir CACHE_VERSION cuando cambie la lista de archivos o su contenido relevante offline. */
"use strict";

var CACHE_VERSION = "v2";
var CACHE_NAME = "app-ingles-" + CACHE_VERSION;

var ARCHIVOS_APP_SHELL = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/styles.css",
  "js/app.js",
  "js/core/storage.js",
  "js/core/i18n.js",
  "js/core/fecha.js",
  "js/core/racha.js",
  "js/core/xp.js",
  "js/core/srs.js",
  "js/screens/inicio.js",
  "js/screens/repaso.js",
  "js/screens/diagnostico.js",
  "js/screens/progreso.js",
  "js/screens/ajustes.js",
  "data/i18n/strings.json",
  "data/i18n/umbrales.json",
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

  evento.respondWith(
    caches.match(peticion).then(function (respuestaCache) {
      if (respuestaCache) return respuestaCache;
      return fetch(peticion)
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
          // Sin red y sin cache para este recurso: si pedían una página, devolvemos el shell.
          if (peticion.mode === "navigate") {
            return caches.match("index.html");
          }
          return Response.error();
        });
    })
  );
});
