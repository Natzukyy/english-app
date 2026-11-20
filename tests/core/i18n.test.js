(function () {
  var umbrales = {
    niveles: [
      { nivel: 0, minDiasActivos: 0 },
      { nivel: 1, minDiasActivos: 14 },
      { nivel: 2, minDiasActivos: 40 },
      { nivel: 3, minDiasActivos: 90 }
    ]
  };

  var strings = {
    "a.corta": { categoria: "corta", es: "Hola", en: "Hello" },
    "a.larga": { categoria: "larga", es: "Bienvenido a la app", en: "Welcome to the app" },
    "a.critica": { categoria: "critica", es: "Error", en: "Error (en)" }
  };

  Test.test("calcularNivel: 0 días activos da nivel 0", function () {
    Test.assertEqual(App.I18n.calcularNivel({ diasActivos: 0 }, umbrales), 0);
  });

  Test.test("calcularNivel: 13 días activos todavía es nivel 0", function () {
    Test.assertEqual(App.I18n.calcularNivel({ diasActivos: 13 }, umbrales), 0);
  });

  Test.test("calcularNivel: 14 días activos es nivel 1", function () {
    Test.assertEqual(App.I18n.calcularNivel({ diasActivos: 14 }, umbrales), 1);
  });

  Test.test("calcularNivel: 39 días activos todavía es nivel 1", function () {
    Test.assertEqual(App.I18n.calcularNivel({ diasActivos: 39 }, umbrales), 1);
  });

  Test.test("calcularNivel: 40 días activos es nivel 2", function () {
    Test.assertEqual(App.I18n.calcularNivel({ diasActivos: 40 }, umbrales), 2);
  });

  Test.test("calcularNivel: 89 días activos todavía es nivel 2", function () {
    Test.assertEqual(App.I18n.calcularNivel({ diasActivos: 89 }, umbrales), 2);
  });

  Test.test("calcularNivel: 90 días activos es nivel 3", function () {
    Test.assertEqual(App.I18n.calcularNivel({ diasActivos: 90 }, umbrales), 3);
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

  Test.test("formatear: sustituye marcadores {n} por su valor (número o texto)", function () {
    Test.assertEqual(App.I18n.formatear("Tienes {n} tarjetas", { n: 12 }), "Tienes 12 tarjetas");
    Test.assertEqual(App.I18n.formatear("{a} y {b}", { a: "uno", b: 2 }), "uno y 2");
  });

  Test.test("formatear: un marcador sin valor se deja visible, no se vuelve 'undefined'", function () {
    Test.assertEqual(App.I18n.formatear("Hola {nombre}", {}), "Hola {nombre}");
    Test.assertEqual(App.I18n.formatear("Hola {nombre}", { nombre: undefined }), "Hola {nombre}");
  });

  Test.test("formatear: sin valores devuelve la plantilla tal cual; el valor 0 sí cuenta", function () {
    Test.assertEqual(App.I18n.formatear("Racha de {n}"), "Racha de {n}");
    Test.assertEqual(App.I18n.formatear("Racha de {n}", { n: 0 }), "Racha de 0");
  });

  Test.test("traductor: respeta el nivel de interfaz y aplica los valores", function () {
    var strings = { "x.dias": { categoria: "corta", es: "{n} días", en: "{n} days" } };
    Test.assertEqual(App.I18n.traductor({ nivelInterfaz: 0, strings: strings })("x.dias", { n: 3 }), "3 días");
    Test.assertEqual(App.I18n.traductor({ nivelInterfaz: 3, strings: strings })("x.dias", { n: 3 }), "3 days");
    Test.assertEqual(App.I18n.traductor({ nivelInterfaz: 0, strings: {} })("no.existe"), "no.existe");
  });
})();
