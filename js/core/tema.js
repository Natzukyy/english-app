/* App.Tema — tema claro/oscuro/sistema (D37). Se carga en el <head> (bloqueante, antes del
   primer pintado) para que el tema correcto esté puesto cuando el navegador pinta por primera
   vez: sin destello. CSP prohíbe scripts inline, por eso es un archivo.

   La preferencia VIVE en IndexedDB (settings, clave "tema": "sistema"|"claro"|"oscuro"; no se
   cambió). Como IndexedDB es asíncrona y no se puede leer antes de pintar, se guarda además un
   ESPEJO síncrono en localStorage ("hey-tema") solo para este arranque rápido; la fuente de
   verdad sigue siendo IndexedDB (App.Util.aplicarTema lo re-sincroniza al iniciar).
   Lógica pura (efectivo, colorThemeColor) + una capa fina de DOM protegida por typeof. */
(function (global) {
  "use strict";

  var CLAVE_ESPEJO = "hey-tema";
  // theme-color por tema EFECTIVO. Mismos valores que --bg de cada tema en css/styles.css.
  var COLORES = { dark: "#12122a", light: "#fff8e7" };

  /** pref: "sistema"|"claro"|"oscuro"; sistemaOscuro: boolean -> "light"|"dark" (tema efectivo). */
  function efectivo(pref, sistemaOscuro) {
    if (pref === "claro") return "light";
    if (pref === "oscuro") return "dark";
    return sistemaOscuro ? "dark" : "light";
  }

  function colorThemeColor(tema) {
    return COLORES[tema === "light" ? "light" : "dark"];
  }

  function valida(pref) {
    return pref === "claro" || pref === "oscuro" || pref === "sistema" ? pref : "sistema";
  }

  var doc = typeof global.document !== "undefined" ? global.document : null;
  var preferenciaActual = "sistema";

  function sistemaEsOscuro() {
    return typeof global.matchMedia === "function" && global.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  /** Pone data-theme (solo si está forzado), la clase de la franja de la barra de estado y los
   * <meta name="theme-color">. Con "sistema" los dos metas con media="(prefers-color-scheme)"
   * resuelven solos, pero se fijan igual para que cambiar en vivo también los actualice. */
  function aplicar(pref) {
    pref = valida(pref);
    preferenciaActual = pref;
    if (!doc) return;
    var raiz = doc.documentElement;
    if (pref === "claro") raiz.setAttribute("data-theme", "light");
    else if (pref === "oscuro") raiz.setAttribute("data-theme", "dark");
    else raiz.removeAttribute("data-theme");
    var tema = efectivo(pref, sistemaEsOscuro());
    raiz.classList.toggle("tema-claro", tema === "light");
    var metas = doc.querySelectorAll('meta[name="theme-color"]');
    for (var i = 0; i < metas.length; i++) {
      if (pref === "sistema") {
        // cada meta conserva su media (claro/oscuro) y su color; el navegador elige
        metas[i].setAttribute("content", metas[i].getAttribute("data-color") || metas[i].getAttribute("content"));
      } else {
        metas[i].setAttribute("content", colorThemeColor(tema));
      }
    }
  }

  function guardarEspejo(pref) {
    try {
      global.localStorage.setItem(CLAVE_ESPEJO, valida(pref));
    } catch (e) {}
  }

  function leerEspejo() {
    try {
      return valida(global.localStorage.getItem(CLAVE_ESPEJO));
    } catch (e) {
      return "sistema";
    }
  }

  var escuchando = false;
  /** Con "sistema", reacciona en vivo si el sistema cambia mientras la app está abierta. */
  function escucharSistema() {
    if (escuchando || typeof global.matchMedia !== "function") return;
    escuchando = true;
    var mq = global.matchMedia("(prefers-color-scheme: dark)");
    var alCambiar = function () {
      if (preferenciaActual === "sistema") aplicar("sistema");
    };
    if (mq.addEventListener) mq.addEventListener("change", alCambiar);
    else if (mq.addListener) mq.addListener(alCambiar);
  }

  global.App = global.App || {};
  global.App.Tema = {
    COLORES: COLORES,
    efectivo: efectivo,
    colorThemeColor: colorThemeColor,
    valida: valida,
    aplicar: aplicar,
    guardarEspejo: guardarEspejo,
    leerEspejo: leerEspejo,
    escucharSistema: escucharSistema
  };

  // Arranque inmediato (solo en navegador): aplica el espejo antes del primer pintado.
  if (doc) {
    aplicar(leerEspejo());
    escucharSistema();
  }
})(typeof window !== "undefined" ? window : globalThis);
