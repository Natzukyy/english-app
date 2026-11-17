/* App.Fecha — utilidades de fecha local compartidas por racha.js y srs.js.
   Importante: todo se basa en los componentes locales (año/mes/día) de Date, nunca en
   diferencias de milisegundos (getTime()). Así el cálculo de "qué día es" y "qué día es
   dentro de N días" queda correcto aunque el dispositivo observe horario de verano (DST):
   sumar milisegundos de un día fijo rompe en el día del cambio de horario; sumar "un día de
   calendario" con el constructor local de Date no. (Esta Mac está en CST todo el año sin DST,
   así que no hay una fecha real de cambio de horario que probar aquí, pero si Alex usa la app
   desde EE.UU. o viaja, esto debe seguir funcionando igual.) */
(function (global) {
  "use strict";

  function pad2(n) {
    return n < 10 ? "0" + n : "" + n;
  }

  /** @returns {string} fecha local en formato YYYY-MM-DD */
  function hoyISO(ahora) {
    var d = ahora || new Date();
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  function parseISO(fechaISO) {
    var partes = fechaISO.split("-").map(Number);
    return { anio: partes[0], mes: partes[1], dia: partes[2] };
  }

  /** Suma (o resta, con n negativo) n días de calendario a una fecha YYYY-MM-DD. */
  function sumarDias(fechaISO, n) {
    var p = parseISO(fechaISO);
    // Mediodía local para evitar ambigüedad si alguna vez corre en una zona con DST.
    var d = new Date(p.anio, p.mes - 1, p.dia, 12, 0, 0);
    d.setDate(d.getDate() + n);
    return hoyISO(d);
  }

  /** Diferencia en días de calendario (b - a). Positivo si b es posterior a a. */
  function diferenciaDias(fechaISOa, fechaISOb) {
    var a = parseISO(fechaISOa);
    var b = parseISO(fechaISOb);
    var da = new Date(a.anio, a.mes - 1, a.dia, 12, 0, 0);
    var db = new Date(b.anio, b.mes - 1, b.dia, 12, 0, 0);
    var msPorDia = 24 * 60 * 60 * 1000;
    return Math.round((db.getTime() - da.getTime()) / msPorDia);
  }

  global.App = global.App || {};
  global.App.Fecha = {
    hoyISO: hoyISO,
    sumarDias: sumarDias,
    diferenciaDias: diferenciaDias
  };
})(typeof window !== "undefined" ? window : globalThis);
