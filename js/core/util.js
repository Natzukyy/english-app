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

  // --- Helpers de presentación (DOM/rAF). No tienen prueba unitaria a propósito, igual que
  // storage.js/datos.js: dependen de `document`/`requestAnimationFrame`, que no existen en el
  // runner de pruebas (JavaScriptCore puro). Se verifican por lectura + por las capturas en
  // capturas/. Respetan prefers-reduced-motion aplicando el valor final sin animar.

  function prefiereMenosMovimiento() {
    return typeof global.matchMedia === "function" && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /** Aplica el tema guardado en preferencias ("sistema"|"claro"|"oscuro") al documento. */
  function aplicarTema(tema) {
    var raiz = global.document && global.document.documentElement;
    if (!raiz) return;
    if (tema === "claro") raiz.setAttribute("data-theme", "light");
    else if (tema === "oscuro") raiz.setAttribute("data-theme", "dark");
    else raiz.removeAttribute("data-theme");
  }

  /** Anima un número entero en un elemento de texto, de su valor actual a valorFinal. */
  function animarNumero(elemento, valorFinal, duracionMs) {
    if (!elemento) return;
    var valorFinalNum = Number(valorFinal) || 0;
    if (prefiereMenosMovimiento() || typeof global.requestAnimationFrame !== "function") {
      elemento.textContent = String(valorFinalNum);
      return;
    }
    var valorInicial = Number(elemento.textContent) || 0;
    if (valorInicial === valorFinalNum) {
      elemento.textContent = String(valorFinalNum);
      return;
    }
    var duracion = duracionMs || 500;
    var inicioMs = null;
    function paso(ahoraMs) {
      if (inicioMs === null) inicioMs = ahoraMs;
      var avance = Math.min(1, (ahoraMs - inicioMs) / duracion);
      var valorActual = Math.round(valorInicial + (valorFinalNum - valorInicial) * avance);
      elemento.textContent = String(valorActual);
      if (avance < 1) global.requestAnimationFrame(paso);
    }
    global.requestAnimationFrame(paso);
  }

  /** Hace crecer una barra de progreso (span dentro de .barra-progreso) de 0% a porcentaje. */
  function animarBarra(elementoSpan, porcentaje) {
    if (!elementoSpan) return;
    var destino = Math.max(0, Math.min(100, Number(porcentaje) || 0));
    if (prefiereMenosMovimiento()) {
      elementoSpan.style.width = destino + "%";
      return;
    }
    elementoSpan.style.width = "0%";
    global.requestAnimationFrame(function () {
      global.requestAnimationFrame(function () {
        elementoSpan.style.width = destino + "%";
      });
    });
  }

  global.App = global.App || {};
  global.App.Util = {
    escaparHTML: escaparHTML,
    aplicarTema: aplicarTema,
    animarNumero: animarNumero,
    animarBarra: animarBarra
  };
})(typeof window !== "undefined" ? window : globalThis);
