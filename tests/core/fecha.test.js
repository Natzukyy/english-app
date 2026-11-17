(function () {
  Test.test("hoyISO: formatea con ceros a la izquierda", function () {
    Test.assertEqual(App.Fecha.hoyISO(new Date(2026, 0, 5, 10, 0, 0)), "2026-01-05");
  });

  Test.test("hoyISO: 23:59:59 y 00:00:01 del día siguiente son fechas distintas", function () {
    var antesDeMedianoche = new Date(2026, 2, 15, 23, 59, 59);
    var despuesDeMedianoche = new Date(2026, 2, 16, 0, 0, 1);
    Test.assertEqual(App.Fecha.hoyISO(antesDeMedianoche), "2026-03-15");
    Test.assertEqual(App.Fecha.hoyISO(despuesDeMedianoche), "2026-03-16");
  });

  Test.test("sumarDias: cruza fin de mes", function () {
    Test.assertEqual(App.Fecha.sumarDias("2026-01-31", 1), "2026-02-01");
  });

  Test.test("sumarDias: cruza fin de año", function () {
    Test.assertEqual(App.Fecha.sumarDias("2026-12-31", 1), "2027-01-01");
  });

  Test.test("sumarDias: respeta año bisiesto (2028 es bisiesto)", function () {
    Test.assertEqual(App.Fecha.sumarDias("2028-02-28", 1), "2028-02-29");
    Test.assertEqual(App.Fecha.sumarDias("2028-02-29", 1), "2028-03-01");
  });

  Test.test("sumarDias: año no bisiesto salta de 28 feb a 1 mar", function () {
    Test.assertEqual(App.Fecha.sumarDias("2026-02-28", 1), "2026-03-01");
  });

  Test.test("sumarDias: n negativo resta días", function () {
    Test.assertEqual(App.Fecha.sumarDias("2026-03-01", -1), "2026-02-28");
  });

  Test.test("diferenciaDias: mismo día es 0", function () {
    Test.assertEqual(App.Fecha.diferenciaDias("2026-05-10", "2026-05-10"), 0);
  });

  Test.test("diferenciaDias: cruzando meses", function () {
    Test.assertEqual(App.Fecha.diferenciaDias("2026-01-28", "2026-02-02"), 5);
  });

  Test.test("diferenciaDias: es consistente con sumarDias (ida y vuelta)", function () {
    var base = "2026-11-16";
    var destino = App.Fecha.sumarDias(base, 47);
    Test.assertEqual(App.Fecha.diferenciaDias(base, destino), 47);
  });
})();
