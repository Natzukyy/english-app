/* App.I18n — interfaz mixta es/en que avanza con el nivel del usuario.
   Las funciones de cálculo son puras (sin DOM/fetch) para poder probarlas con el runner de tests.
   La carga de JSON (cargarDesdeArchivos) sí usa fetch y solo corre en el navegador. */
(function (global) {
  "use strict";

  /**
   * Calcula el nivel de interfaz (0-3) según días activos (días en que se cumplió el
   * mínimo de la racha, 5 min). NO depende de XP ni de número de sesiones (ver
   * DECISIONES.md D2: con XP se llegaba a nivel 3 en semanas; con solo días activos
   * se necesitan ~90 días de constancia real).
   * @param {{diasActivos:number}} progreso
   * @param {{niveles: Array<{nivel:number,minDiasActivos:number}>}} umbrales
   * @returns {number} nivel 0..3
   */
  function calcularNivel(progreso, umbrales) {
    var diasActivos = (progreso && progreso.diasActivos) || 0;
    var niveles = (umbrales && umbrales.niveles) || [];
    var nivelAlcanzado = 0;
    niveles.forEach(function (def) {
      if (diasActivos >= def.minDiasActivos && def.nivel > nivelAlcanzado) {
        nivelAlcanzado = def.nivel;
      }
    });
    return nivelAlcanzado;
  }

  /**
   * Devuelve el texto correcto para una clave según el nivel de interfaz.
   * Nivel 0: todo español. Nivel 3: todo inglés.
   * Nivel 1: lo "corto" (botones/etiquetas) en inglés, lo "largo" en español.
   * Nivel 2: corto e inglés también para lo "largo", excepto "critica" (errores) que se queda en español.
   */
  function texto(clave, nivel, strings) {
    var entrada = strings && strings[clave];
    if (!entrada) return clave;
    var categoria = entrada.categoria || "larga";
    var usarIngles;
    if (nivel >= 3) {
      usarIngles = true;
    } else if (nivel <= 0) {
      usarIngles = false;
    } else if (nivel === 1) {
      usarIngles = categoria === "corta";
    } else {
      // nivel 2
      usarIngles = categoria !== "critica";
    }
    return usarIngles ? entrada.en : entrada.es;
  }

  /**
   * Sustituye marcadores {nombre} por sus valores. Un marcador sin valor se deja tal cual (así
   * un olvido se ve en pantalla en vez de mostrar "undefined"). Sin HTML ni lógica de plurales:
   * singular/plural se resuelven con DOS claves distintas, nunca armando la gramática.
   * @param {string} plantilla  p. ej. "Tienes {n} tarjetas"
   * @param {Object<string, string|number>} [valores]
   */
  function formatear(plantilla, valores) {
    if (!valores) return plantilla;
    return String(plantilla).replace(/\{(\w+)\}/g, function (marcador, nombre) {
      return Object.prototype.hasOwnProperty.call(valores, nombre) && valores[nombre] !== undefined && valores[nombre] !== null
        ? String(valores[nombre])
        : marcador;
    });
  }

  /**
   * Devuelve `t(clave, valores)` ya atado al contexto de la pantalla (nivel de interfaz y
   * strings cargados): el patrón que antes se repetía a mano en cada pantalla.
   * @param {{nivelInterfaz:number, strings:Object}} ctx
   */
  function traductor(ctx) {
    return function (clave, valores) {
      return formatear(texto(clave, ctx && ctx.nivelInterfaz, ctx && ctx.strings), valores);
    };
  }

  function cargarDesdeArchivos() {
    if (typeof fetch === "undefined") {
      return Promise.reject(new Error("fetch no disponible (entorno sin navegador)"));
    }
    return Promise.all([
      fetch("data/i18n/strings.json").then(function (r) {
        return r.json();
      }),
      fetch("data/i18n/umbrales.json").then(function (r) {
        return r.json();
      })
    ]).then(function (res) {
      return { strings: res[0], umbrales: res[1] };
    });
  }

  global.App = global.App || {};
  global.App.I18n = {
    calcularNivel: calcularNivel,
    texto: texto,
    formatear: formatear,
    traductor: traductor,
    cargarDesdeArchivos: cargarDesdeArchivos
  };
})(typeof window !== "undefined" ? window : globalThis);
