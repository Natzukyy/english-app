(function () {
  var opts = { metaMinutosDia: 5, congelamientosIniciales: 2, congelamientosMaximos: 2, diasActivosParaGanarCongelamiento: 7 };

  Test.test("cumpleMeta: exactamente el mínimo cuenta", function () {
    Test.assertTrue(App.Racha.cumpleMeta(5, 5));
  });

  Test.test("cumpleMeta: un minuto menos no cuenta", function () {
    Test.assertTrue(!App.Racha.cumpleMeta(4, 5));
  });

  Test.test("calcularEstado: sin historial, racha 0 y congelamientos iniciales", function () {
    var estado = App.Racha.calcularEstado({}, opts, new Date(2026, 10, 16));
    Test.assertEqual(estado, { rachaActual: 0, mejorRacha: 0, congelamientosDisponibles: 2 });
  });

  Test.test("calcularEstado: 3 días seguidos cumpliendo la meta", function () {
    var historial = { "2026-11-14": 10, "2026-11-15": 5, "2026-11-16": 20 };
    var estado = App.Racha.calcularEstado(historial, opts, new Date(2026, 10, 16));
    Test.assertEqual(estado.rachaActual, 3);
    Test.assertEqual(estado.mejorRacha, 3);
  });

  Test.test("calcularEstado: un día sin actividad y sin congelamientos rompe la racha", function () {
    var sinCongelamientos = Object.assign({}, opts, { congelamientosIniciales: 0, congelamientosMaximos: 0 });
    var historial = { "2026-11-10": 10, "2026-11-11": 10, "2026-11-13": 10 }; // falta el 12
    var estado = App.Racha.calcularEstado(historial, sinCongelamientos, new Date(2026, 10, 13));
    Test.assertEqual(estado.rachaActual, 1); // solo cuenta el 13, la racha se rompió el 12
    Test.assertEqual(estado.mejorRacha, 2); // la mejor racha histórica (10 y 11) sigue siendo 2
  });

  Test.test("calcularEstado: un día perdido SÍ se cubre con una congelación disponible", function () {
    var historial = { "2026-11-10": 10, "2026-11-11": 10, "2026-11-13": 10 }; // falta el 12, pero hay congelamientos
    var estado = App.Racha.calcularEstado(historial, opts, new Date(2026, 10, 13));
    // 10 (racha=1), 11 (racha=2), 12 congelado (consume 1, racha sigue en 2), 13 (racha=3)
    Test.assertEqual(estado.rachaActual, 3);
    Test.assertEqual(estado.congelamientosDisponibles, 1);
  });

  Test.test("calcularEstado: minutos exactos al mínimo cuentan como día activo", function () {
    var historial = { "2026-11-16": 5 };
    var estado = App.Racha.calcularEstado(historial, opts, new Date(2026, 10, 16));
    Test.assertEqual(estado.rachaActual, 1);
  });

  Test.test("calcularEstado: una sesión 23:59 y otra 00:01 del día siguiente cuentan como 2 días distintos", function () {
    // Esto se prueba a nivel de App.Fecha.hoyISO (ver fecha.test.js); aquí confirmamos que
    // dos entradas en días de calendario consecutivos sí suman 2 a la racha.
    var antes = App.Fecha.hoyISO(new Date(2026, 10, 15, 23, 59, 0));
    var despues = App.Fecha.hoyISO(new Date(2026, 10, 16, 0, 1, 0));
    var historial = {};
    historial[antes] = 5;
    historial[despues] = 5;
    var estado = App.Racha.calcularEstado(historial, opts, new Date(2026, 10, 16, 0, 1, 0));
    Test.assertEqual(estado.rachaActual, 2);
  });

  Test.test("calcularEstado: se gana 1 congelamiento nuevo cada 7 días seguidos, sin pasar el máximo", function () {
    var sinInicial = Object.assign({}, opts, { congelamientosIniciales: 0 });
    var historial = {};
    for (var i = 0; i < 7; i++) {
      historial[App.Fecha.sumarDias("2026-11-01", i)] = 10;
    }
    var estado = App.Racha.calcularEstado(historial, sinInicial, new Date(2026, 10, 7));
    Test.assertEqual(estado.rachaActual, 7);
    Test.assertEqual(estado.congelamientosDisponibles, 1); // ganó 1 al llegar al día 7
  });
})();
