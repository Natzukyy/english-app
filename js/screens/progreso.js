(function (global) {
  "use strict";

  function render(el, ctx) {
    var t = function (clave) {
      return global.App.I18n.texto(clave, ctx.nivelInterfaz, ctx.strings);
    };
    el.innerHTML =
      '<h1 data-i18n-live="progreso.titulo"></h1>' + '<div class="estado-vacio" data-i18n-live="progreso.vacio"></div>';
    el.querySelectorAll("[data-i18n-live]").forEach(function (nodo) {
      nodo.textContent = t(nodo.getAttribute("data-i18n-live"));
    });
  }

  global.App = global.App || {};
  global.App.Screens = global.App.Screens || {};
  global.App.Screens.progreso = { render: render };
})(typeof window !== "undefined" ? window : globalThis);
