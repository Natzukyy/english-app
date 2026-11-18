/* App.Iconos — set propio de íconos SVG en línea (sin librerías, sin emojis).
   Mismo trazo en todos: viewBox 24x24, stroke=currentColor, stroke-width 1.75,
   extremos y uniones redondeados. currentColor hereda el color de texto del
   elemento que los contiene, así que respetan el tema claro/oscuro sin tocarlos. */
(function (global) {
  "use strict";

  var ATRIBUTOS = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';

  var RUTAS = {
    inicio: '<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9h12v-9"/>',
    repaso: '<path d="M4 7a6 6 0 0 1 10-4.5L16 4"/><path d="M20 17a6 6 0 0 1-10 4.5L8 20"/><path d="M14 2v4h-4"/><path d="M10 22v-4h4"/>',
    diagnostico: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/>',
    progreso: '<path d="M4 18V9"/><path d="M11 18V5"/><path d="M18 18v-7"/>',
    ajustes:
      '<circle cx="12" cy="12" r="3"/><path d="M19.4 13a7.9 7.9 0 0 0 0-2l2-1.4-2-3.4-2.3.8a8 8 0 0 0-1.7-1l-.4-2.4h-4l-.4 2.4a8 8 0 0 0-1.7 1l-2.3-.8-2 3.4L4.6 11a7.9 7.9 0 0 0 0 2l-2 1.4 2 3.4 2.3-.8a8 8 0 0 0 1.7 1l.4 2.4h4l.4-2.4a8 8 0 0 0 1.7-1l2.3.8 2-3.4z"/>',
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
