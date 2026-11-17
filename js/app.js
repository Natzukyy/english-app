(function (global) {
  "use strict";

  var RUTAS_VALIDAS = ["inicio", "repaso", "diagnostico", "progreso", "ajustes"];
  var contexto = { strings: {}, umbrales: { niveles: [] }, nivelInterfaz: 0 };

  function rutaActual() {
    var hash = (location.hash || "").replace("#/", "").replace("#", "");
    return RUTAS_VALIDAS.indexOf(hash) !== -1 ? hash : "inicio";
  }

  function aplicarI18nNav() {
    document.querySelectorAll("nav.tabs [data-i18n]").forEach(function (nodo) {
      nodo.textContent = global.App.I18n.texto(nodo.getAttribute("data-i18n"), contexto.nivelInterfaz, contexto.strings);
    });
  }

  function marcarTabActiva(ruta) {
    document.querySelectorAll("nav.tabs button").forEach(function (boton) {
      boton.setAttribute("aria-current", boton.getAttribute("data-ruta") === ruta ? "true" : "false");
    });
  }

  function renderizar() {
    var ruta = rutaActual();
    var pantalla = global.App.Screens && global.App.Screens[ruta];
    var el = document.getElementById("pantalla");
    marcarTabActiva(ruta);
    aplicarI18nNav();
    if (pantalla && typeof pantalla.render === "function") {
      pantalla.render(el, contexto);
    } else {
      el.innerHTML = "<p>…</p>";
    }
  }

  function registrarNav() {
    document.querySelectorAll("nav.tabs button").forEach(function (boton) {
      boton.addEventListener("click", function () {
        location.hash = "#/" + boton.getAttribute("data-ruta");
      });
    });
    global.addEventListener("hashchange", renderizar);
  }

  function registrarServiceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").catch(function (err) {
        console.warn("No se pudo registrar el service worker:", err);
      });
    }
  }

  function iniciar() {
    registrarNav();
    registrarServiceWorker();
    global.App.I18n.cargarDesdeArchivos()
      .then(function (res) {
        contexto.strings = res.strings;
        contexto.umbrales = res.umbrales;
        // El nivel de interfaz real (según sesiones/XP guardados) se calculará en la fase 2,
        // cuando exista App.Racha/App.XP leyendo de App.Storage. Por ahora: nivel 0 (todo español).
        contexto.nivelInterfaz = 0;
        renderizar();
      })
      .catch(function (err) {
        console.error("No se pudo cargar i18n:", err);
        renderizar();
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})(typeof window !== "undefined" ? window : globalThis);
