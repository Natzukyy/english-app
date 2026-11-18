(function () {
  Test.test("comparar: frases iguales da 100% y todas acertadas", function () {
    var r = App.Habla.comparar("Can we move the deadline", "can we move the deadline");
    Test.assertEqual(r.porcentaje, 100);
    Test.assertEqual(r.acertadas.length, 5);
    Test.assertEqual(r.omitidas.length, 0);
    Test.assertEqual(r.distintas.length, 0);
  });

  Test.test("comparar: una palabra distinta (sustitución) baja el porcentaje", function () {
    var r = App.Habla.comparar("Can we move the deadline", "can we move the schedule");
    Test.assertEqual(r.porcentaje, 80);
    Test.assertEqual(r.acertadas.length, 4);
    Test.assertEqual(r.omitidas, ["deadline"]);
    Test.assertEqual(r.distintas, ["schedule"]);
  });

  Test.test("comparar: palabra omitida cuenta como omitida, no como distinta", function () {
    var r = App.Habla.comparar("Can we move the deadline", "can we the deadline");
    Test.assertEqual(r.porcentaje, 80);
    Test.assertEqual(r.omitidas, ["move"]);
    Test.assertEqual(r.distintas.length, 0);
  });

  Test.test("comparar: palabra extra no baja el porcentaje pero se reporta como distinta", function () {
    var r = App.Habla.comparar("Can we move the deadline", "can we really move the deadline");
    Test.assertEqual(r.porcentaje, 100);
    Test.assertEqual(r.acertadas.length, 5);
    Test.assertEqual(r.distintas, ["really"]);
    Test.assertEqual(r.omitidas.length, 0);
  });

  Test.test("comparar: mayúsculas y puntuación no afectan el resultado", function () {
    var r = App.Habla.comparar("Can we move the deadline?", "CAN, WE MOVE... THE DEADLINE!!");
    Test.assertEqual(r.porcentaje, 100);
    Test.assertEqual(r.acertadas.length, 5);
  });

  Test.test("comparar: transcripción vacía deja todo como omitido, 0%", function () {
    var r = App.Habla.comparar("Can we move the deadline", "");
    Test.assertEqual(r.porcentaje, 0);
    Test.assertEqual(r.acertadas.length, 0);
    Test.assertEqual(r.omitidas.length, 5);
  });

  Test.test("comparar: objetivo vacío no rompe (100%, nada que omitir)", function () {
    var r = App.Habla.comparar("", "");
    Test.assertEqual(r.porcentaje, 100);
    Test.assertEqual(r.omitidas.length, 0);
  });

  Test.test("comparar: una palabra parecida (plural) se tolera como acertada", function () {
    var r = App.Habla.comparar("I have two meetings today", "I have two meeting today");
    Test.assertEqual(r.porcentaje, 100);
    Test.assertEqual(r.distintas.length, 0);
  });

  Test.test("comparar: números escritos y en dígito se consideran la misma palabra", function () {
    var r = App.Habla.comparar("I have 2 meetings", "I have two meetings");
    Test.assertEqual(r.porcentaje, 100);
  });
})();
