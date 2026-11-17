(function (global) {
  "use strict";

  function render(el, ctx) {
    var t = function (clave) {
      return global.App.I18n.texto(clave, ctx.nivelInterfaz, ctx.strings);
    };

    el.innerHTML =
      '<h1 data-i18n-live="inicio.titulo"></h1>' +
      '<div class="hero-bloque">' +
      '<p class="hero-numero" id="inicio-racha-numero">0</p>' +
      '<p class="texto-tenue" data-i18n-live="inicio.racha.etiqueta"></p>' +
      "</div>" +
      '<div class="tarjeta">' +
      '<p class="texto-tenue" data-i18n-live="inicio.meta.etiqueta"></p>' +
      '<div class="barra-progreso"><span style="width:0%"></span></div>' +
      "</div>" +
      '<div class="estado-vacio" data-i18n-live="inicio.vacio"></div>';

    // Reemplaza los textos marcados con el nivel de interfaz actual.
    el.querySelectorAll("[data-i18n-live]").forEach(function (nodo) {
      nodo.textContent = t(nodo.getAttribute("data-i18n-live"));
    });
  }

  global.App = global.App || {};
  global.App.Screens = global.App.Screens || {};
  global.App.Screens.inicio = { render: render };
})(typeof window !== "undefined" ? window : globalThis);
