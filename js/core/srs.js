/* App.SRS — repaso espaciado. Algoritmo: SM-2 (ver DECISIONES.md D3). Lógica pura, sin DOM. */
(function (global) {
  "use strict";

  var EF_MINIMO = 1.3;
  var EF_INICIAL = 2.5;

  function tarjetaNueva(id, ahora) {
    return {
      id: id,
      repeticiones: 0,
      intervaloDias: 0,
      facilidad: EF_INICIAL,
      proximaFecha: global.App.Fecha.hoyISO(ahora)
    };
  }

  /**
   * Aplica una calificación SM-2 (0-5, escala estándar de SuperMemo) a una tarjeta.
   * 0-2: no se recordó -> se reinicia el intervalo.
   * 3-5: se recordó -> el intervalo crece (1 día, luego 6 días, luego *facilidad).
   * @param {{repeticiones:number, intervaloDias:number, facilidad:number}} tarjeta
   * @param {number} calidad entero 0..5
   * @param {Date} ahora
   */
  function calificarTarjeta(tarjeta, calidad, ahora) {
    if (calidad < 0 || calidad > 5) {
      throw new Error("calidad debe estar entre 0 y 5");
    }
    var repeticiones = tarjeta.repeticiones || 0;
    var intervaloDias = tarjeta.intervaloDias || 0;
    var facilidad = tarjeta.facilidad || EF_INICIAL;

    if (calidad < 3) {
      repeticiones = 0;
      intervaloDias = 1;
    } else {
      if (repeticiones === 0) {
        intervaloDias = 1;
      } else if (repeticiones === 1) {
        intervaloDias = 6;
      } else {
        intervaloDias = Math.round(intervaloDias * facilidad);
      }
      repeticiones += 1;
    }

    var nuevaFacilidad = facilidad + (0.1 - (5 - calidad) * (0.08 + (5 - calidad) * 0.02));
    if (nuevaFacilidad < EF_MINIMO) nuevaFacilidad = EF_MINIMO;

    return {
      id: tarjeta.id,
      repeticiones: repeticiones,
      intervaloDias: intervaloDias,
      facilidad: nuevaFacilidad,
      proximaFecha: global.App.Fecha.sumarDias(global.App.Fecha.hoyISO(ahora), intervaloDias)
    };
  }

  function estaParaRepasar(tarjeta, ahora) {
    return tarjeta.proximaFecha <= global.App.Fecha.hoyISO(ahora);
  }

  global.App = global.App || {};
  global.App.SRS = {
    EF_MINIMO: EF_MINIMO,
    EF_INICIAL: EF_INICIAL,
    tarjetaNueva: tarjetaNueva,
    calificarTarjeta: calificarTarjeta,
    estaParaRepasar: estaParaRepasar
  };
})(typeof window !== "undefined" ? window : globalThis);
