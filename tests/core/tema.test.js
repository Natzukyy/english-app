// Tema (D37): tema efectivo, theme-color, validación. (La capa de DOM se prueba en el navegador.)
(function () {
  var T = App.Tema;

  Test.test("efectivo: claro/oscuro fuerzan; sistema sigue al sistema", function () {
    Test.assertEqual(T.efectivo("claro", true), "light");
    Test.assertEqual(T.efectivo("oscuro", false), "dark");
    Test.assertEqual(T.efectivo("sistema", true), "dark");
    Test.assertEqual(T.efectivo("sistema", false), "light");
    Test.assertEqual(T.efectivo("basura", false), "light");
  });

  Test.test("theme-color por tema: crema en claro, azul noche en oscuro", function () {
    Test.assertEqual(T.colorThemeColor("light"), "#fff8e7");
    Test.assertEqual(T.colorThemeColor("dark"), "#12122a");
  });

  Test.test("valida: valores desconocidos caen en 'sistema'", function () {
    Test.assertEqual(T.valida("claro"), "claro");
    Test.assertEqual(T.valida("oscuro"), "oscuro");
    Test.assertEqual(T.valida(undefined), "sistema");
    Test.assertEqual(T.valida("x"), "sistema");
  });
})();
