(function () {
  var umbrales = {
    niveles: [
      { nivel: 0, minSesiones: 0, minXP: 0 },
      { nivel: 1, minSesiones: 20, minXP: 200 },
      { nivel: 2, minSesiones: 60, minXP: 800 },
      { nivel: 3, minSesiones: 150, minXP: 2500 }
    ]
  };

  var strings = {
    "a.corta": { categoria: "corta", es: "Hola", en: "Hello" },
    "a.larga": { categoria: "larga", es: "Bienvenido a la app", en: "Welcome to the app" },
    "a.critica": { categoria: "critica", es: "Error", en: "Error (en)" }
  };

  Test.test("calcularNivel: 0 sesiones y 0 xp da nivel 0", function () {
    Test.assertEqual(App.I18n.calcularNivel({ sesiones: 0, xp: 0 }, umbrales), 0);
  });

  Test.test("calcularNivel: justo en el umbral de sesiones del nivel 1", function () {
    Test.assertEqual(App.I18n.calcularNivel({ sesiones: 20, xp: 0 }, umbrales), 1);
  });

  Test.test("calcularNivel: XP alto compensa pocas sesiones", function () {
    Test.assertEqual(App.I18n.calcularNivel({ sesiones: 1, xp: 2600 }, umbrales), 3);
  });

  Test.test("calcularNivel: un poco debajo del umbral se queda en el nivel anterior", function () {
    Test.assertEqual(App.I18n.calcularNivel({ sesiones: 59, xp: 799 }, umbrales), 1);
  });

  Test.test("texto: nivel 0 siempre es español, incluso lo corto", function () {
    Test.assertEqual(App.I18n.texto("a.corta", 0, strings), "Hola");
    Test.assertEqual(App.I18n.texto("a.larga", 0, strings), "Bienvenido a la app");
  });

  Test.test("texto: nivel 1 cambia lo corto a inglés pero no lo largo", function () {
    Test.assertEqual(App.I18n.texto("a.corta", 1, strings), "Hello");
    Test.assertEqual(App.I18n.texto("a.larga", 1, strings), "Bienvenido a la app");
  });

  Test.test("texto: nivel 2 cambia lo largo a inglés pero respeta lo crítico en español", function () {
    Test.assertEqual(App.I18n.texto("a.larga", 2, strings), "Welcome to the app");
    Test.assertEqual(App.I18n.texto("a.critica", 2, strings), "Error");
  });

  Test.test("texto: nivel 3 es todo inglés, incluso lo crítico", function () {
    Test.assertEqual(App.I18n.texto("a.critica", 3, strings), "Error (en)");
  });

  Test.test("texto: clave inexistente devuelve la clave misma (no rompe)", function () {
    Test.assertEqual(App.I18n.texto("no.existe", 2, strings), "no.existe");
  });
})();
