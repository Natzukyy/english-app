/* App.I18n — interfaz mixta es/en que avanza con el nivel del usuario.
   Las funciones de cálculo son puras (sin DOM/fetch) para poder probarlas con el runner de tests.
   La carga de JSON (cargarDesdeArchivos) sí usa fetch y solo corre en el navegador. */
(function (global) {
  "use strict";

  /**
   * Calcula el nivel de interfaz (0-3) según sesiones completadas y XP acumulado.
   * Usa el máximo de los dos criterios (basta con cumplir uno) para no castigar
   * a alguien que sube de XP rápido pero con pocas sesiones, o viceversa.
   * @param {{sesiones:number, xp:number}} progreso
   * @param {{niveles: Array<{nivel:number,minSesiones:number,minXP:number}>}} umbrales
   * @returns {number} nivel 0..3
   */
  function calcularNivel(progreso, umbrales) {
    var sesiones = (progreso && progreso.sesiones) || 0;
    var xp = (progreso && progreso.xp) || 0;
    var niveles = (umbrales && umbrales.niveles) || [];
    var nivelAlcanzado = 0;
    niveles.forEach(function (def) {
      var cumpleSesiones = sesiones >= def.minSesiones;
      var cumpleXP = xp >= def.minXP;
      if ((cumpleSesiones || cumpleXP) && def.nivel > nivelAlcanzado) {
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
    cargarDesdeArchivos: cargarDesdeArchivos
  };
})(typeof window !== "undefined" ? window : globalThis);
