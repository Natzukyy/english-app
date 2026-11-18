/* App.Habla — compara lo que Alex dijo (transcripción de SpeechRecognition) contra la frase
   objetivo. Lógica pura (sin DOM/API de voz), para poder probarla con el runner de tests.
   El reconocimiento de voz es aproximado (con acento puede transcribir una palabra parecida
   por otra) -- por eso esto es una GUÍA, no una calificación estricta: tolera una distancia
   de edición chica a nivel de carácter antes de marcar una palabra como distinta. */
(function (global) {
  "use strict";

  var NUMEROS_A_DIGITO = {
    zero: "0", one: "1", two: "2", three: "3", four: "4",
    five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10"
  };

  function normalizarPalabra(palabra) {
    var p = String(palabra)
      .toLowerCase()
      .replace(/[‘’]/g, "'") // apóstrofos curvos -> rectos
      .replace(/[^a-z0-9']/g, "");
    return NUMEROS_A_DIGITO[p] || p;
  }

  function tokenizar(texto) {
    return String(texto || "")
      .split(/\s+/)
      .map(normalizarPalabra)
      .filter(function (p) {
        return p.length > 0;
      });
  }

  /** Distancia de edición entre dos cadenas (nivel de carácter). */
  function distanciaEdicion(a, b) {
    var filas = a.length + 1;
    var cols = b.length + 1;
    var dp = [];
    var i, j;
    for (i = 0; i < filas; i++) dp.push([i]);
    for (j = 0; j < cols; j++) dp[0][j] = j;
    for (i = 1; i < filas; i++) {
      for (j = 1; j < cols; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
    }
    return dp[filas - 1][cols - 1];
  }

  /** Dos palabras "equivalen" si son iguales o muy parecidas (tolera errores chicos del
   * reconocimiento de voz: plural/singular, una letra distinta, etc.). */
  function palabrasEquivalen(a, b) {
    if (a === b) return true;
    var largo = Math.max(a.length, b.length);
    var umbral = largo <= 4 ? 1 : largo <= 8 ? 2 : 3;
    return distanciaEdicion(a, b) <= umbral;
  }

  /** Alinea dos listas de palabras (edición a nivel de palabra, con "equivalen" en vez de
   * igualdad estricta para el costo de sustitución) y clasifica el resultado. */
  function comparar(objetivo, transcripcion) {
    var palabrasObjetivo = tokenizar(objetivo);
    var palabrasDichas = tokenizar(transcripcion);
    var n = palabrasObjetivo.length;
    var m = palabrasDichas.length;

    if (n === 0) {
      return { porcentaje: 100, acertadas: [], omitidas: [], distintas: palabrasDichas.slice() };
    }

    // dp[i][j] = costo mínimo para alinear las primeras i palabras del objetivo con las
    // primeras j palabras dichas. 0 = coinciden/equivalen, 1 = sustituir/omitir/agregar.
    var dp = [];
    var i, j;
    for (i = 0; i <= n; i++) dp.push(new Array(m + 1).fill(0));
    for (i = 0; i <= n; i++) dp[i][0] = i;
    for (j = 0; j <= m; j++) dp[0][j] = j;
    for (i = 1; i <= n; i++) {
      for (j = 1; j <= m; j++) {
        var costoSust = palabrasEquivalen(palabrasObjetivo[i - 1], palabrasDichas[j - 1]) ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j - 1] + costoSust, dp[i - 1][j] + 1, dp[i][j - 1] + 1);
      }
    }

    var acertadas = [];
    var omitidas = [];
    var distintas = [];
    i = n;
    j = m;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0) {
        var equivalen = palabrasEquivalen(palabrasObjetivo[i - 1], palabrasDichas[j - 1]);
        var costoSust = equivalen ? 0 : 1;
        if (dp[i][j] === dp[i - 1][j - 1] + costoSust) {
          if (equivalen) acertadas.unshift(palabrasObjetivo[i - 1]);
          else {
            omitidas.unshift(palabrasObjetivo[i - 1]);
            distintas.unshift(palabrasDichas[j - 1]);
          }
          i -= 1;
          j -= 1;
          continue;
        }
      }
      if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
        omitidas.unshift(palabrasObjetivo[i - 1]);
        i -= 1;
        continue;
      }
      distintas.unshift(palabrasDichas[j - 1]);
      j -= 1;
    }

    var porcentaje = Math.round((acertadas.length / n) * 100);
    return { porcentaje: porcentaje, acertadas: acertadas, omitidas: omitidas, distintas: distintas };
  }

  global.App = global.App || {};
  global.App.Habla = { comparar: comparar, tokenizar: tokenizar, distanciaEdicion: distanciaEdicion };
})(typeof window !== "undefined" ? window : globalThis);
