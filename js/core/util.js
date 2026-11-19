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

  var COLORES_LLUVIA = ["var(--amarillo)", "var(--menta)", "var(--rosa)", "var(--coral)", "var(--azul)", "var(--crema)"];
  var FORMAS_LLUVIA = ["circulo", "cuadrado", "triangulo", "anillo"];
  var DURACION_LLUVIA_MS = 1900; // ~1.5 s de caída + hasta 0.3 s de retraso escalonado + margen

  /** Lluvia corta (~1.5 s) de formas/calcomanías de colores de la paleta. Solo CSS
   * (transform/opacity, ver .lluvia-pieza), sin sonido, sin bloquear nada (el contenedor es
   * pointer-events:none y aria-hidden) y se limpia sola. Con prefers-reduced-motion NO se
   * crea nada (la celebración queda solo como mensaje, ver mostrarCelebracion). Devuelve
   * true si se lanzó la lluvia. */
  function lluviaCalcomanias() {
    if (typeof document === "undefined" || prefiereMenosMovimiento()) return false;
    var contenedor = document.createElement("div");
    contenedor.className = "lluvia-calcomanias";
    contenedor.setAttribute("aria-hidden", "true");
    var piezas = "";
    for (var i = 0; i < 30; i++) {
      var tam = 10 + Math.round(Math.random() * 10);
      var estilo =
        "left:" + (Math.random() * 100).toFixed(1) + "%;" +
        "--dx:" + Math.round((Math.random() - 0.5) * 120) + "px;" +
        "--giro:" + Math.round((Math.random() - 0.5) * 720) + "deg;" +
        "--retraso:" + Math.round(Math.random() * 300) + "ms;" +
        "--dur:" + (1100 + Math.round(Math.random() * 400)) + "ms;" +
        "--color:" + COLORES_LLUVIA[i % COLORES_LLUVIA.length] + ";" +
        "width:" + tam + "px;height:" + tam + "px";
      piezas += '<span class="lluvia-pieza lluvia-' + FORMAS_LLUVIA[i % FORMAS_LLUVIA.length] + '" style="' + estilo + '"></span>';
    }
    contenedor.innerHTML = piezas;
    document.body.appendChild(contenedor);
    global.setTimeout(function () {
      if (contenedor.parentNode) contenedor.parentNode.removeChild(contenedor);
    }, DURACION_LLUVIA_MS);
    return true;
  }

  /** Mensaje de celebración (role=status, sin movimiento propio) + lluvia si se puede. */
  function mostrarCelebracion(texto, conLluvia) {
    if (typeof document === "undefined") return;
    var aviso = document.createElement("div");
    aviso.className = "celebracion-mensaje";
    aviso.setAttribute("role", "status");
    aviso.textContent = texto;
    document.body.appendChild(aviso);
    if (conLluvia !== false) lluviaCalcomanias();
    global.setTimeout(function () {
      if (aviso.parentNode) aviso.parentNode.removeChild(aviso);
    }, 3200);
  }

  // Cola de celebraciones pendientes (subida de nivel de XP o de nivel CEFR): la sesión que
  // las provoca termina en otra pantalla y navega a Inicio, que es quien las muestra.
  var CLAVE_CELEBRACIONES = "rumboCelebracionesPendientes";

  function anotarCelebracion(celebracion) {
    try {
      var lista = JSON.parse(global.localStorage.getItem(CLAVE_CELEBRACIONES) || "[]");
      lista.push(celebracion);
      global.localStorage.setItem(CLAVE_CELEBRACIONES, JSON.stringify(lista));
    } catch (e) {
      /* sin localStorage: la celebración simplemente no se muestra */
    }
  }

  function tomarCelebracionesPendientes() {
    try {
      var lista = JSON.parse(global.localStorage.getItem(CLAVE_CELEBRACIONES) || "[]");
      global.localStorage.removeItem(CLAVE_CELEBRACIONES);
      return lista;
    } catch (e) {
      return [];
    }
  }

  global.App.Util = {
    lluviaCalcomanias: lluviaCalcomanias,
    mostrarCelebracion: mostrarCelebracion,
    anotarCelebracion: anotarCelebracion,
    tomarCelebracionesPendientes: tomarCelebracionesPendientes,
    escaparHTML: escaparHTML,
    barajarOpciones: barajarOpciones,
    aplicarTema: aplicarTema,
    animarNumero: animarNumero,
    animarBarra: animarBarra,
    confeti: confeti
  };
})(typeof window !== "undefined" ? window : globalThis);
