(function () {
  function voz(nombre, lang) {
    return { name: nombre, lang: lang || "en-US" };
  }

  Test.test("esVozDeNovedad: reconoce las voces de novedad conocidas", function () {
    Test.assertEqual(App.TTS.esVozDeNovedad(voz("Zarvox")), true);
    Test.assertEqual(App.TTS.esVozDeNovedad(voz("Whisper")), true);
    Test.assertEqual(App.TTS.esVozDeNovedad(voz("Bad News")), true);
  });

  Test.test("esVozDeNovedad: una voz natural no cuenta como de novedad", function () {
    Test.assertEqual(App.TTS.esVozDeNovedad(voz("Samantha")), false);
    Test.assertEqual(App.TTS.esVozDeNovedad(voz("Samantha (Enhanced)")), false);
  });

  Test.test("vocesUtiles: excluye voces que no son en-* aunque no sean de novedad", function () {
    var voces = [voz("Samantha", "en-US"), voz("Mónica", "es-ES"), voz("Paulina", "es-MX")];
    var utiles = App.TTS.vocesUtiles(voces);
    Test.assertEqual(utiles.length, 1);
    Test.assertEqual(utiles[0].name, "Samantha");
  });

  Test.test("vocesUtiles: excluye las voces de novedad aunque sean en-*", function () {
    var voces = [voz("Samantha", "en-US"), voz("Zarvox", "en-US"), voz("Bad News", "en-GB")];
    var utiles = App.TTS.vocesUtiles(voces);
    Test.assertEqual(utiles.length, 1);
    Test.assertEqual(utiles[0].name, "Samantha");
  });

  Test.test("elegirVoz: sin voces disponibles, devuelve null (respaldo al navegador)", function () {
    Test.assertEqual(App.TTS.elegirVoz([], ""), null);
  });

  Test.test("elegirVoz: con solo voces de novedad o no-inglesas, devuelve null", function () {
    var voces = [voz("Zarvox", "en-US"), voz("Mónica", "es-ES")];
    Test.assertEqual(App.TTS.elegirVoz(voces, ""), null);
  });

  Test.test("elegirVoz: respeta la preferencia guardada si sigue existiendo", function () {
    var voces = [voz("Samantha", "en-US"), voz("Daniel", "en-GB"), voz("Karen", "en-AU")];
    var elegida = App.TTS.elegirVoz(voces, "Karen");
    Test.assertEqual(elegida.name, "Karen");
  });

  Test.test("elegirVoz: si la preferencia guardada ya no existe, vuelve al orden por defecto", function () {
    var voces = [voz("Daniel", "en-GB"), voz("Karen", "en-AU")];
    var elegida = App.TTS.elegirVoz(voces, "Samantha");
    Test.assertEqual(elegida.name, "Daniel"); // Daniel va antes que Karen en VOCES_PREFERIDAS
  });

  Test.test("elegirVoz: sin preferencia, sigue el orden Samantha > Daniel > Karen > ...", function () {
    var voces = [voz("Rishi", "en-IN"), voz("Karen", "en-AU"), voz("Samantha", "en-US")];
    Test.assertEqual(App.TTS.elegirVoz(voces, "").name, "Samantha");
  });

  Test.test("elegirVoz: prioriza la variante Enhanced/Premium de una voz preferida sobre la plana", function () {
    var voces = [voz("Samantha", "en-US"), voz("Samantha (Enhanced)", "en-US")];
    Test.assertEqual(App.TTS.elegirVoz(voces, "").name, "Samantha (Enhanced)");
  });

  Test.test("elegirVoz: sin ninguna de la lista preferida, cae a la primera voz en-US útil", function () {
    var voces = [voz("Alex", "en-GB"), voz("Fred", "en-US")];
    Test.assertEqual(App.TTS.elegirVoz(voces, "").name, "Fred");
  });

  Test.test("elegirVoz: sin ninguna en-US, cae a cualquier voz útil disponible", function () {
    var voces = [voz("Alex", "en-GB")];
    Test.assertEqual(App.TTS.elegirVoz(voces, "").name, "Alex");
  });
})();
