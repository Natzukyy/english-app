(function () {
  Test.test("tarjetaNueva: empieza en facilidad inicial y 0 repeticiones", function () {
    var t = App.SRS.tarjetaNueva("abc", new Date(2026, 10, 16));
    Test.assertEqual(t.repeticiones, 0);
    Test.assertEqual(t.facilidad, 2.5);
    Test.assertEqual(t.proximaFecha, "2026-11-16");
  });

  Test.test("calificarTarjeta: primera vez bien calificada -> intervalo de 1 día", function () {
    var t = App.SRS.tarjetaNueva("a", new Date(2026, 10, 16));
    var r = App.SRS.calificarTarjeta(t, 4, new Date(2026, 10, 16));
    Test.assertEqual(r.intervaloDias, 1);
    Test.assertEqual(r.proximaFecha, "2026-11-17");
    Test.assertEqual(r.repeticiones, 1);
  });

  Test.test("calificarTarjeta: segunda vez bien calificada -> intervalo de 6 días", function () {
    var t = { id: "a", repeticiones: 1, intervaloDias: 1, facilidad: 2.5 };
    var r = App.SRS.calificarTarjeta(t, 4, new Date(2026, 10, 16));
    Test.assertEqual(r.intervaloDias, 6);
    Test.assertEqual(r.proximaFecha, "2026-11-22");
  });

  Test.test("calificarTarjeta: tercera vez en adelante multiplica por la facilidad", function () {
    var t = { id: "a", repeticiones: 2, intervaloDias: 6, facilidad: 2.5 };
    var r = App.SRS.calificarTarjeta(t, 5, new Date(2026, 10, 16));
    Test.assertEqual(r.intervaloDias, Math.round(6 * 2.5));
  });

  Test.test("calificarTarjeta: calidad baja (<3) reinicia repeticiones e intervalo a 1 día", function () {
    var t = { id: "a", repeticiones: 4, intervaloDias: 30, facilidad: 2.8 };
    var r = App.SRS.calificarTarjeta(t, 1, new Date(2026, 10, 16));
    Test.assertEqual(r.repeticiones, 0);
    Test.assertEqual(r.intervaloDias, 1);
    Test.assertEqual(r.proximaFecha, "2026-11-17");
  });

  Test.test("calificarTarjeta: la facilidad nunca baja de 1.3", function () {
    var t = { id: "a", repeticiones: 3, intervaloDias: 10, facilidad: 1.3 };
    var r = App.SRS.calificarTarjeta(t, 0, new Date(2026, 10, 16));
    Test.assertTrue(r.facilidad >= 1.3);
  });

  Test.test("calificarTarjeta: calidad fuera de 0-5 lanza error", function () {
    var t = App.SRS.tarjetaNueva("a", new Date(2026, 10, 16));
    var lanzo = false;
    try {
      App.SRS.calificarTarjeta(t, 6, new Date(2026, 10, 16));
    } catch (e) {
      lanzo = true;
    }
    Test.assertTrue(lanzo);
  });

  Test.test("calificarTarjeta: el intervalo de 6 días cruza correctamente fin de mes", function () {
    var t = { id: "a", repeticiones: 1, intervaloDias: 1, facilidad: 2.5 };
    var r = App.SRS.calificarTarjeta(t, 4, new Date(2026, 10, 27)); // 27 nov + 6 = 3 dic
    Test.assertEqual(r.proximaFecha, "2026-12-03");
  });

  Test.test("estaParaRepasar: hoy == proximaFecha cuenta como lista para repasar", function () {
    var t = { id: "a", proximaFecha: "2026-11-16" };
    Test.assertTrue(App.SRS.estaParaRepasar(t, new Date(2026, 10, 16)));
  });

  Test.test("estaParaRepasar: fecha futura no está lista todavía", function () {
    var t = { id: "a", proximaFecha: "2026-11-17" };
    Test.assertTrue(!App.SRS.estaParaRepasar(t, new Date(2026, 10, 16)));
  });
})();
