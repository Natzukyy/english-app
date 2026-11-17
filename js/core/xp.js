/* App.XP — puntos de experiencia y niveles. Lógica pura, sin DOM. */
(function (global) {
  "use strict";

  var XP_POR_MINUTO = 10; // provisional, revisar:true
  var XP_POR_EJERCICIO_CORRECTO = 5; // provisional
  var XP_BONO_META_DIARIA = 20; // provisional
  var XP_POR_NIVEL_BASE = 100; // provisional: el nivel n+1 cuesta 100*n XP más que el nivel n

  /**
   * @param {{minutos:number, ejerciciosCorrectos:number, metaCumplida:boolean}} sesion
   */
  function calcularXPSesion(sesion) {
    var s = sesion || {};
    var minutos = s.minutos || 0;
    var ejercicios = s.ejerciciosCorrectos || 0;
    var xp = minutos * XP_POR_MINUTO + ejercicios * XP_POR_EJERCICIO_CORRECTO;
    if (s.metaCumplida) xp += XP_BONO_META_DIARIA;
    return xp;
  }

  /** XP total acumulado necesario para llegar al nivel n (nivel 1 = 0 XP). */
  function xpAcumuladaParaNivel(n) {
    if (n <= 1) return 0;
    // suma 100*1 + 100*2 + ... + 100*(n-1)
    return (XP_POR_NIVEL_BASE * (n - 1) * n) / 2;
  }

  /** Nivel actual (entero >= 1) según el XP total acumulado. */
  function nivelDesdeXP(xpTotal) {
    var xp = Math.max(0, xpTotal || 0);
    var nivel = 1;
    while (xpAcumuladaParaNivel(nivel + 1) <= xp) {
      nivel += 1;
    }
    return nivel;
  }

  /** XP que faltan para el siguiente nivel, dado el XP total actual. */
  function xpParaSiguienteNivel(xpTotal) {
    var nivel = nivelDesdeXP(xpTotal);
    return xpAcumuladaParaNivel(nivel + 1) - Math.max(0, xpTotal || 0);
  }

  global.App = global.App || {};
  global.App.XP = {
    XP_POR_MINUTO: XP_POR_MINUTO,
    XP_POR_EJERCICIO_CORRECTO: XP_POR_EJERCICIO_CORRECTO,
    XP_BONO_META_DIARIA: XP_BONO_META_DIARIA,
    calcularXPSesion: calcularXPSesion,
    xpAcumuladaParaNivel: xpAcumuladaParaNivel,
    nivelDesdeXP: nivelDesdeXP,
    xpParaSiguienteNivel: xpParaSiguienteNivel
  };
})(typeof window !== "undefined" ? window : globalThis);
