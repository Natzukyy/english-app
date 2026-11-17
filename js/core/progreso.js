/* App.Progreso — aplica el resultado de una sesión de estudio al estado del día y al XP total.
   Lógica pura: no toca IndexedDB; las pantallas leen/escriben el estado alrededor de esto. */
(function (global) {
  "use strict";

  /**
   * @param {{minutosHoy:number, metaCumplidaHoy:boolean, xpTotal:number}} estadoPrevio
   * @param {{minutos:number, ejerciciosCorrectos:number}} sesion
   * @param {{metaMinutosDia:number}} opciones  meta diaria elegida por el usuario (5/15/30)
   */
  function aplicarSesion(estadoPrevio, sesion, opciones) {
    var previo = estadoPrevio || { minutosHoy: 0, metaCumplidaHoy: false, xpTotal: 0 };
    var s = sesion || { minutos: 0, ejerciciosCorrectos: 0 };
    var metaMinutosDia = (opciones && opciones.metaMinutosDia) || 15;

    var minutosHoyNuevo = (previo.minutosHoy || 0) + (s.minutos || 0);
    var cruzoMeta = !previo.metaCumplidaHoy && minutosHoyNuevo >= metaMinutosDia;

    var xpGanada = global.App.XP.calcularXPSesion({
      minutos: s.minutos || 0,
      ejerciciosCorrectos: s.ejerciciosCorrectos || 0,
      metaCumplida: cruzoMeta
    });

    return {
      minutosHoy: minutosHoyNuevo,
      metaCumplidaHoy: previo.metaCumplidaHoy || cruzoMeta,
      xpTotal: (previo.xpTotal || 0) + xpGanada,
      xpGanada: xpGanada
    };
  }

  global.App = global.App || {};
  global.App.Progreso = { aplicarSesion: aplicarSesion };
})(typeof window !== "undefined" ? window : globalThis);
