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

  /**
   * Baraja las opciones de una pregunta de opción múltiple (banco de diagnóstico, preguntas
   * de comprensión de lecturas) SIN tocar los datos originales -- arregla que en varias
   * preguntas la respuesta correcta esté siempre en el índice 0 (ver DECISIONES.md D20/D21).
   * No baraja los textos directamente: baraja un arreglo de índices y arma las opciones
   * nuevas a partir de ahí, así que la "referencia" a cuál opción es la correcta nunca se
   * pierde aunque dos opciones tengan el mismo texto.
   * @param {Array<string>} opciones
   * @param {number} indiceCorrecta  índice de la respuesta correcta en `opciones` (original)
   * @returns {{opciones:Array<string>, indiceCorrecta:number, indicesOriginales:Array<number>}}
   *   `indicesOriginales[posiciónBarajada]` da el índice que esa opción tenía en el arreglo
   *   original -- así se puede traducir de vuelta una respuesta elegida (en el orden
   *   barajado) al índice original, para seguir calificando contra los datos sin tocar nada
   *   de la lógica de puntuación.
   */
  function barajarOpciones(opciones, indiceCorrecta) {
    var indices = opciones.map(function (_, i) {
      return i;
    });
    for (var i = indices.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = indices[i];
      indices[i] = indices[j];
      indices[j] = tmp;
    }
    var opcionesBarajadas = indices.map(function (indiceOriginal) {
      return opciones[indiceOriginal];
    });
    return {
      opciones: opcionesBarajadas,
      indiceCorrecta: indices.indexOf(indiceCorrecta),
      indicesOriginales: indices
    };
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

  /** Hace crecer el anillo de progreso (un <circle> con stroke-dasharray=circunferencia)
   * de 0% a porcentaje, acortando stroke-dashoffset. */
  function animarAnillo(elementoCircle, porcentaje, circunferencia) {
    if (!elementoCircle) return;
    var destino = Math.max(0, Math.min(100, Number(porcentaje) || 0));
    var offsetDestino = circunferencia * (1 - destino / 100);
    if (prefiereMenosMovimiento()) {
      elementoCircle.style.strokeDashoffset = String(offsetDestino);
      return;
    }
    elementoCircle.style.strokeDashoffset = String(circunferencia);
    global.requestAnimationFrame(function () {
      global.requestAnimationFrame(function () {
        elementoCircle.style.strokeDashoffset = String(offsetDestino);
      });
    });
  }

  global.App = global.App || {};
  /** HTML de un confeti discreto (usa los colores propios de la app, no arcoíris). Se
   * desactiva solo por CSS bajo prefers-reduced-motion (.confeti{display:none}). */
  function confeti() {
    var colores = ["var(--acento)", "var(--punto-lectura)", "var(--punto-escucha)", "var(--punto-habla)", "var(--punto-escritura)"];
    var piezas = "";
    for (var i = 0; i < 14; i++) {
      var izquierda = Math.round((i / 14) * 94 + Math.sin(i) * 3);
      var color = colores[i % colores.length];
      var retraso = (i % 7) * 60;
      piezas +=
        '<span style="left:' + izquierda + "%;background:" + color + ";animation-delay:" + retraso + 'ms"></span>';
    }
    return '<div class="confeti" aria-hidden="true">' + piezas + "</div>";
  }

  global.App.Util = {
    escaparHTML: escaparHTML,
    barajarOpciones: barajarOpciones,
    aplicarTema: aplicarTema,
    animarNumero: animarNumero,
    animarBarra: animarBarra,
    animarAnillo: animarAnillo,
    confeti: confeti
  };
})(typeof window !== "undefined" ? window : globalThis);
