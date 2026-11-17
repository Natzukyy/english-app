/* App.Util — utilidades chicas compartidas. Lógica pura, sin DOM, para poder probarla.
   escaparHTML existe porque varias pantallas insertan texto que viene de IndexedDB (y por lo
   tanto puede venir de un respaldo importado) dentro de innerHTML. Si ese texto no se escapa,
   un respaldo .json manipulado a mano podría inyectar HTML/JS (XSS almacenado). Ver
   DECISIONES.md D10. */
(function (global) {
  "use strict";

  var MAPA_ESCAPE = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

  function escaparHTML(valor) {
    if (valor === null || typeof valor === "undefined") return "";
    return String(valor).replace(/[&<>"']/g, function (c) {
      return MAPA_ESCAPE[c];
    });
  }

  global.App = global.App || {};
  global.App.Util = { escaparHTML: escaparHTML };
})(typeof window !== "undefined" ? window : globalThis);
