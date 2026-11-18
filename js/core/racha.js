/* App.Racha — racha de estudio: mínimo 5 min/día para contar, con congelación limitada.
   Lógica pura: recibe el historial de minutos por día y recalcula el estado completo desde
   el primer día con actividad hasta "hoy". Nada de DOM ni IndexedDB aquí (se prueba aparte). */
(function (global) {
  "use strict";

  var OPCIONES_POR_DEFECTO = {
    metaMinutosDia: 5, // PROMPT_BASE.md: mínimo 5 min para contar el día (revisar:true si cambia)
    congelamientosIniciales: 2, // provisional (ver DECISIONES.md)
    congelamientosMaximos: 2, // provisional
    diasActivosParaGanarCongelamiento: 7 // provisional: 1 congelamiento nuevo cada 7 días seguidos
  };

  function cumpleMeta(minutos, metaMinutosDia) {
    return (minutos || 0) >= metaMinutosDia;
  }

  /** Cuenta cuántos días del historial cumplen el mínimo (días activos). No depende de
   * XP ni de número de sesiones — solo de si ese día se llegó al mínimo. Ver DECISIONES.md D2. */
  function contarDiasActivos(minutosPorDia, metaMinutosDia) {
    var meta = typeof metaMinutosDia === "number" ? metaMinutosDia : OPCIONES_POR_DEFECTO.metaMinutosDia;
    var dias = Object.keys(minutosPorDia || {});
    var cuenta = 0;
    dias.forEach(function (dia) {
      if (cumpleMeta(minutosPorDia[dia], meta)) cuenta += 1;
    });
    return cuenta;
  }

  /**
   * Recalcula el estado de la racha simulando día por día, en orden cronológico,
   * desde el primer día con registro hasta "hoy".
   * @param {Object<string, number>} minutosPorDia  { 'YYYY-MM-DD': minutos }
   * @param {Object} opciones  ver OPCIONES_POR_DEFECTO
   * @param {Date} ahora
   * @returns {{rachaActual:number, mejorRacha:number, congelamientosDisponibles:number}}
   */
  function calcularEstado(minutosPorDia, opciones, ahora) {
    var opts = Object.assign({}, OPCIONES_POR_DEFECTO, opciones || {});
    var Fecha = global.App.Fecha;
    var hoy = Fecha.hoyISO(ahora);

    var fechas = Object.keys(minutosPorDia || {});
    if (fechas.length === 0) {
      return { rachaActual: 0, mejorRacha: 0, congelamientosDisponibles: opts.congelamientosIniciales };
    }
    fechas.sort(); // YYYY-MM-DD ordena cronológicamente como string
    var primerDia = fechas[0];

    var rachaActual = 0;
    var mejorRacha = 0;
    var congelamientos = opts.congelamientosIniciales;

    var dia = primerDia;
    // Límite de seguridad para no entrar en bucle infinito con datos corruptos.
    var maxIteraciones = Math.max(0, Fecha.diferenciaDias(primerDia, hoy)) + 1;
    var i = 0;
    while (dia <= hoy && i <= maxIteraciones) {
      var minutos = minutosPorDia[dia] || 0;
      if (cumpleMeta(minutos, opts.metaMinutosDia)) {
        rachaActual += 1;
        if (
          opts.diasActivosParaGanarCongelamiento > 0 &&
          rachaActual % opts.diasActivosParaGanarCongelamiento === 0 &&
          congelamientos < opts.congelamientosMaximos
        ) {
          congelamientos += 1;
        }
      } else if (congelamientos > 0) {
        congelamientos -= 1; // día cubierto por congelación: la racha no sube ni se rompe
      } else {
        rachaActual = 0;
      }
      if (rachaActual > mejorRacha) mejorRacha = rachaActual;
      dia = Fecha.sumarDias(dia, 1);
      i += 1;
    }

    return { rachaActual: rachaActual, mejorRacha: mejorRacha, congelamientosDisponibles: congelamientos };
  }

  global.App = global.App || {};
  global.App.Racha = {
    OPCIONES_POR_DEFECTO: OPCIONES_POR_DEFECTO,
    cumpleMeta: cumpleMeta,
    contarDiasActivos: contarDiasActivos,
    calcularEstado: calcularEstado
  };
})(typeof window !== "undefined" ? window : globalThis);
