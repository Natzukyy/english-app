/* App.Iconos — set propio de íconos SVG en línea (sin librerías, sin emojis).
   Mismo trazo en todos: viewBox 24x24, stroke=currentColor, stroke-width 1.75,
   extremos y uniones redondeados. currentColor hereda el color de texto del
   elemento que los contiene, así que respetan el tema claro/oscuro sin tocarlos. */
(function (global) {
  "use strict";

  var ATRIBUTOS = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';

  var RUTAS = {
    inicio: '<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9h12v-9"/>',
    repaso:
      '<path d="M8.25 18.5 L9.36 19.02 L10.54 19.36 L11.75 19.5 L12.98 19.44 L14.18 19.18 L15.32 18.73 L16.37 18.1 L17.3 17.3 L18.1 16.37 L18.73 15.32 L19.18 14.18 L19.44 12.98 L19.5 11.75 L19.36 10.54 L19.02 9.36 L18.5 8.25"/><path d="M18.5 8.25 L20.7 9.63 M18.5 8.25 L18.59 10.85"/><path d="M15.75 5.5 L14.64 4.98 L13.46 4.64 L12.25 4.5 L11.02 4.56 L9.82 4.82 L8.68 5.27 L7.63 5.9 L6.7 6.7 L5.9 7.63 L5.27 8.68 L4.82 9.82 L4.56 11.02 L4.5 12.25 L4.64 13.46 L4.98 14.64 L5.5 15.75"/><path d="M5.5 15.75 L3.3 14.37 M5.5 15.75 L5.41 13.15"/>',
    diagnostico: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/>',
    progreso: '<path d="M4 18V9"/><path d="M11 18V5"/><path d="M18 18v-7"/>',
    ajustes:
      '<path d="M10.4 2.84 L13.6 2.84 L14.79 5.26 L17.35 4.39 L19.61 6.65 L18.74 9.21 L21.16 10.4 L21.16 13.6 L18.74 14.79 L19.61 17.35 L17.35 19.61 L14.79 18.74 L13.6 21.16 L10.4 21.16 L9.21 18.74 L6.65 19.61 L4.39 17.35 L5.26 14.79 L2.84 13.6 L2.84 10.4 L5.26 9.21 L4.39 6.65 L6.65 4.39 L9.21 5.26 Z"/><circle cx="12" cy="12" r="3"/>',
    flama: '<path d="M12 3c1 3-3 4-3 8a3 3 0 0 0 6 0c1 1 1.5 2.3 1.5 3.5a4.5 4.5 0 0 1-9 0C6.5 10 9 8 12 3z"/>',
    bocina: '<path d="M4 9v6h3l5 4V5L7 9H4z"/><path d="M16.5 9a4 4 0 0 1 0 6"/><path d="M19 7a7.5 7.5 0 0 1 0 10"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    equis: '<path d="M6 6l12 12"/><path d="M18 6L6 18"/>',
    flecha: '<path d="M9 5l7 7-7 7"/>'
  };

  function svg(nombre, tamano) {
    var t = tamano || 22;
    var rutas = RUTAS[nombre] || "";
    return '<svg width="' + t + '" height="' + t + '" ' + ATRIBUTOS + ">" + rutas + "</svg>";
  }

  global.App = global.App || {};
  global.App.Iconos = { svg: svg };
})(typeof window !== "undefined" ? window : globalThis);
