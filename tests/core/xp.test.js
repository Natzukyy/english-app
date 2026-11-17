(function () {
  Test.test("calcularXPSesion: minutos solos", function () {
    Test.assertEqual(App.XP.calcularXPSesion({ minutos: 5 }), 50);
  });

  Test.test("calcularXPSesion: minutos + ejercicios + bono de meta", function () {
    Test.assertEqual(
      App.XP.calcularXPSesion({ minutos: 10, ejerciciosCorrectos: 4, metaCumplida: true }),
      10 * 10 + 4 * 5 + 20
    );
  });

  Test.test("calcularXPSesion: sesión vacía da 0 XP", function () {
    Test.assertEqual(App.XP.calcularXPSesion({}), 0);
  });

  Test.test("nivelDesdeXP: 0 XP es nivel 1", function () {
    Test.assertEqual(App.XP.nivelDesdeXP(0), 1);
  });

  Test.test("nivelDesdeXP: justo el XP necesario para nivel 2", function () {
    Test.assertEqual(App.XP.xpAcumuladaParaNivel(2), 100);
    Test.assertEqual(App.XP.nivelDesdeXP(100), 2);
    Test.assertEqual(App.XP.nivelDesdeXP(99), 1);
  });

  Test.test("nivelDesdeXP: XP negativo no rompe, se trata como 0", function () {
    Test.assertEqual(App.XP.nivelDesdeXP(-50), 1);
  });

  Test.test("xpParaSiguienteNivel: disminuye conforme se acerca al siguiente nivel", function () {
    var faltanEn100 = App.XP.xpParaSiguienteNivel(100);
    var faltanEn150 = App.XP.xpParaSiguienteNivel(150);
    Test.assertTrue(faltanEn150 < faltanEn100);
  });
})();
