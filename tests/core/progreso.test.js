(function () {
  Test.test("aplicarSesion: primera sesión del día, no alcanza la meta todavía", function () {
    var r = App.Progreso.aplicarSesion({ minutosHoy: 0, metaCumplidaHoy: false, xpTotal: 0 }, { minutos: 5, ejerciciosCorrectos: 2 }, { metaMinutosDia: 15 });
    Test.assertEqual(r.minutosHoy, 5);
    Test.assertEqual(r.metaCumplidaHoy, false);
    Test.assertEqual(r.xpGanada, 5 * 10 + 2 * 5); // sin bono, no cruzó la meta
    Test.assertEqual(r.xpTotal, r.xpGanada);
  });

  Test.test("aplicarSesion: la sesión que cruza la meta recibe el bono una sola vez", function () {
    var estado = { minutosHoy: 10, metaCumplidaHoy: false, xpTotal: 100 };
    var r = App.Progreso.aplicarSesion(estado, { minutos: 10, ejerciciosCorrectos: 0 }, { metaMinutosDia: 15 });
    Test.assertEqual(r.minutosHoy, 20);
    Test.assertEqual(r.metaCumplidaHoy, true);
    Test.assertEqual(r.xpGanada, 10 * 10 + 20); // con bono de meta
  });

  Test.test("aplicarSesion: si ya se cumplió la meta hoy, no se vuelve a dar el bono", function () {
    var estado = { minutosHoy: 20, metaCumplidaHoy: true, xpTotal: 300 };
    var r = App.Progreso.aplicarSesion(estado, { minutos: 10, ejerciciosCorrectos: 0 }, { metaMinutosDia: 15 });
    Test.assertEqual(r.xpGanada, 10 * 10); // sin bono, ya se había dado
  });

  Test.test("aplicarSesion: sin estado previo (primera vez en la app) no revienta", function () {
    var r = App.Progreso.aplicarSesion(null, { minutos: 5, ejerciciosCorrectos: 0 }, { metaMinutosDia: 5 });
    Test.assertEqual(r.minutosHoy, 5);
    Test.assertEqual(r.metaCumplidaHoy, true);
  });
})();
