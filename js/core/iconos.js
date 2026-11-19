/* App.Iconos — set propio de íconos SVG en línea (sin librerías, sin emojis).
   Mismo trazo en todos: viewBox 24x24, stroke=currentColor, stroke-width 2.2, extremos y
   uniones redondeadas (ver spec "Calcomanías oscuro": "SVG de trazo propio, stroke 2.2,
   redondeado" -- reemplaza el trazo 1.75/casi cuadrado del rediseño "cuaderno de bitácora"
   anterior, que a su vez había reemplazado el stroke-linecap round original porque se
   confundía con Heroicons/Feather; con Bricolage Grotesque -- una fuente de peso 500-800,
   chunky -- un trazo más delgado se veía desbalanceado al lado del texto). currentColor
   hereda el color del elemento que los contiene, así que respetan el tema sin tocarlos. */
(function (global) {
  "use strict";

  var ATRIBUTOS = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';

  var RUTAS = {
    inicio: '<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9h12v-9"/>',
    repaso:
      '<path d="M8.25 18.5 L9.36 19.02 L10.54 19.36 L11.75 19.5 L12.98 19.44 L14.18 19.18 L15.32 18.73 L16.37 18.1 L17.3 17.3 L18.1 16.37 L18.73 15.32 L19.18 14.18 L19.44 12.98 L19.5 11.75 L19.36 10.54 L19.02 9.36 L18.5 8.25"/><path d="M18.5 8.25 L20.7 9.63 M18.5 8.25 L18.59 10.85"/><path d="M15.75 5.5 L14.64 4.98 L13.46 4.64 L12.25 4.5 L11.02 4.56 L9.82 4.82 L8.68 5.27 L7.63 5.9 L6.7 6.7 L5.9 7.63 L5.27 8.68 L4.82 9.82 L4.56 11.02 L4.5 12.25 L4.64 13.46 L4.98 14.64 L5.5 15.75"/><path d="M5.5 15.75 L3.3 14.37 M5.5 15.75 L5.41 13.15"/>',
    diagnostico: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/>',
    progreso: '<path d="M4 18V9"/><path d="M11 18V5"/><path d="M18 18v-7"/>',
    // Reemplaza el engranaje anterior -- el spec de Calcomanías es explícito: "ajustes
    // (sliders, NO engrane)". 3 líneas horizontales con un control deslizante cada una, a
    // distinta posición (ícono estándar de "preferencias/mezclador", hollow circle sobre la
    // línea gracias a fill:none, igual que el resto del set).
    ajustes: '<path d="M3 6h18"/><circle cx="14" cy="6" r="2.3"/><path d="M3 12h18"/><circle cx="9" cy="12" r="2.3"/><path d="M3 18h18"/><circle cx="17" cy="18" r="2.3"/>',
    flama: '<path d="M12 3c1 3-3 4-3 8a3 3 0 0 0 6 0c1 1 1.5 2.3 1.5 3.5a4.5 4.5 0 0 1-9 0C6.5 10 9 8 12 3z"/>',
    bocina: '<path d="M4 9v6h3l5 4V5L7 9H4z"/><path d="M16.5 9a4 4 0 0 1 0 6"/><path d="M19 7a7.5 7.5 0 0 1 0 10"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    equis: '<path d="M6 6l12 12"/><path d="M18 6L6 18"/>',
    flecha: '<path d="M9 5l7 7-7 7"/>',
    chevron: '<path d="M9 5l7 7-7 7"/>', // alias de "flecha" -- mismo trazo, nombre que usa el spec de Calcomanías
    libro: '<path d="M12 6c-1.8-1.3-4.3-2-7-2v14c2.7 0 5.2.7 7 2"/><path d="M12 6c1.8-1.3 4.3-2 7-2v14c-2.7 0-5.2.7-7 2"/><path d="M12 6v14"/>',
    auriculares: '<path d="M4 13v-1a8 8 0 0 1 16 0v1"/><rect x="3" y="13" width="4" height="6" rx="2"/><rect x="17" y="13" width="4" height="6" rx="2"/>',
    microfono: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/><path d="M9 21h6"/>',
    pluma: '<path d="M4 20l1-4L16 5l3 3L8 19l-4 1z"/><path d="M14 7l3 3"/>',
    candado: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    // Burbuja de chat plana (Conversación) -- distinta de "habla" (abajo), que lleva ondas.
    burbuja: '<path d="M4 5.5h16v10H10l-4.5 4v-4H4v-10z"/>',
    // Habla: burbuja + ondas de sonido saliendo -- para Practicar/nodos de habilidad, donde
    // "burbuja" sola (sin ondas) no comunica "se oye/se habla en voz alta".
    habla: '<rect x="2" y="4" width="13" height="11" rx="4"/><path d="M6 15l-1 4 5-4"/><path d="M17 7a3.5 3.5 0 0 1 0 5"/><path d="M19.3 5.3a6.5 6.5 0 0 1 0 8.4"/>',
    // Practicar: diana de círculos concéntricos.
    practicar: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.2"/><circle cx="12" cy="12" r="1.6"/>',
    // Estrella de 5 puntas (marcador "vas aquí" en Tu camino) -- polígono geométrico
    // estándar, trazo sin relleno (fill:none heredado de ATRIBUTOS).
    estrella: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
    // Paso completado en "Tu camino" (rediseño anterior, "cuaderno de bitácora"): sello
    // circular de doble trazo. El spec de Calcomanías reemplaza este mecanismo por una
    // palomita que se dibuja + salto amarillo->menta (ver animación) -- se conserva el
    // ícono por compatibilidad hasta que el fork de Inicio haga ese cambio.
    sello: '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="3"/>'
  };

  function svg(nombre, tamano) {
    var t = tamano || 22;
    var rutas = RUTAS[nombre] || "";
    return '<svg width="' + t + '" height="' + t + '" ' + ATRIBUTOS + ">" + rutas + "</svg>";
  }

  global.App = global.App || {};
  global.App.Iconos = { svg: svg };
})(typeof window !== "undefined" ? window : globalThis);
