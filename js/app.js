(function (global) {
  "use strict";

  var RUTAS_VALIDAS = ["inicio", "repaso", "diagnostico", "progreso", "ajustes", "habla", "conversacion"];
  var contexto = { strings: {}, umbrales: { niveles: [] }, nivelInterfaz: 0 };

  /** Preparación para crecer (idioma/nivel configurable, ver DESIGN_REVIEW.md sección 5):
   * data/config.json saca "Inglés B2" del código del shell -- título, meta de iOS y marca
   * de la barra lateral se rellenan con esto en vez de venir fijos en index.html. */
  function aplicarConfigShell() {
    return fetch("data/config.json")
      .then(function (r) {
        return r.json();
      })
      .then(function (config) {
        var nombre = config.idiomaVisible + " " + config.nivelMetaCEFR;
        document.title = nombre;
        var metaTitulo = document.querySelector('meta[name="apple-mobile-web-app-title"]');
        if (metaTitulo) metaTitulo.setAttribute("content", nombre);
        var marca = document.getElementById("marca-sidebar");
        if (marca) marca.textContent = nombre;
      })
      .catch(function (err) {
        console.warn("No se pudo cargar data/config.json:", err);
      });
  }

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

  function actualizarNivelInterfaz() {
    return Promise.all([global.App.Datos.obtenerMinutosPorDia(), global.App.Datos.obtenerPreferencias()]).then(function (res) {
      var minutosPorDia = res[0];
      var prefs = res[1];
      if (prefs.forzarEspanol) {
        contexto.nivelInterfaz = 0;
        return;
      }
      var minimoRacha = global.App.Racha.OPCIONES_POR_DEFECTO.metaMinutosDia;
      var diasActivos = global.App.Racha.contarDiasActivos(minutosPorDia, minimoRacha);
      contexto.nivelInterfaz = global.App.I18n.calcularNivel({ diasActivos: diasActivos }, contexto.umbrales);
    });
  }

  function renderizar() {
    actualizarNivelInterfaz().then(function () {
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
    });
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
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("sw.js").catch(function (err) {
      console.warn("No se pudo registrar el service worker:", err);
    });
    // Un service worker nuevo activa de inmediato (skipWaiting + clients.claim en sw.js),
    // pero la pestaña ya abierta sigue corriendo el JS viejo que ya cargó en memoria.
    // Recargamos una sola vez cuando eso pasa, para que el cambio se vea sin que Alex
    // tenga que recargar a mano ni borrar caché. Ver DECISIONES.md D15.
    var yaRecargando = false;
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (yaRecargando) return;
      yaRecargando = true;
      location.reload();
    });
  }

  function aplicarPreferenciasIniciales() {
    // El valor por defecto del tema ("sistema", sin atributo) ya sigue prefers-color-scheme
    // vía CSS, así que la mayoría de la gente nunca ve el breve instante antes de que esto
    // resuelva. La voz preferida de App.TTS vive en memoria (no en DOM), así que también se
    // debe cargar aquí para que cualquier pantalla que hable (Habla, Diagnóstico, Conversación)
    // la respete sin haber pasado antes por Ajustes.
    return global.App.Datos.obtenerPreferencias().then(function (prefs) {
      global.App.Util.aplicarTema(prefs.tema);
      global.App.TTS.establecerVozPreferida(prefs.vozPreferidaTTS);
    });
  }

  function iniciar() {
    registrarNav();
    registrarServiceWorker();
    aplicarConfigShell();
    aplicarPreferenciasIniciales();
    global.App.I18n.cargarDesdeArchivos()
      .then(function (res) {
        contexto.strings = res.strings;
        contexto.umbrales = res.umbrales;
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
