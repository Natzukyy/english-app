(function () {
  var banco = [
    { id: "a1", habilidad: "lectura", nivelCEFR: "A2", respuestaCorrecta: 0 },
    { id: "a2", habilidad: "lectura", nivelCEFR: "A2", respuestaCorrecta: 0 },
    { id: "b1", habilidad: "lectura", nivelCEFR: "B1", respuestaCorrecta: 0 },
    { id: "b2a", habilidad: "lectura", nivelCEFR: "B1", respuestaCorrecta: 0 },
    { id: "c1", habilidad: "lectura", nivelCEFR: "B2", respuestaCorrecta: 0 },
    { id: "c2", habilidad: "lectura", nivelCEFR: "B2", respuestaCorrecta: 0 }
  ];

  Test.test("evaluarHabilidad: acierta todo hasta B1, falla B2 -> estimado B1", function () {
    var respuestas = { a1: 0, a2: 0, b1: 0, b2a: 0, c1: 1, c2: 1 }; // falla las de B2
    Test.assertEqual(App.Diagnostico.evaluarHabilidad(banco, respuestas), "B1");
  });

  Test.test("evaluarHabilidad: acierta todo en todos los niveles disponibles -> el más alto del banco", function () {
    var respuestas = { a1: 0, a2: 0, b1: 0, b2a: 0, c1: 0, c2: 0 };
    Test.assertEqual(App.Diagnostico.evaluarHabilidad(banco, respuestas), "B2");
  });

  Test.test("evaluarHabilidad: falla todo incluso A2 -> se queda en el piso A2", function () {
    var respuestas = { a1: 1, a2: 1, b1: 1, b2a: 1, c1: 1, c2: 1 };
    Test.assertEqual(App.Diagnostico.evaluarHabilidad(banco, respuestas), "A2");
  });

  Test.test("evaluarHabilidad: sin responder nada cuenta como incorrecto, no explota", function () {
    Test.assertEqual(App.Diagnostico.evaluarHabilidad(banco, {}), "A2");
  });

  Test.test("evaluarHabilidad: justo en el umbral (60%) de un nivel con varias preguntas", function () {
    var bancoConTres = [
      { id: "x1", habilidad: "lectura", nivelCEFR: "A2", respuestaCorrecta: 0 },
      { id: "x2", habilidad: "lectura", nivelCEFR: "A2", respuestaCorrecta: 0 },
      { id: "x3", habilidad: "lectura", nivelCEFR: "A2", respuestaCorrecta: 0 },
      { id: "x4", habilidad: "lectura", nivelCEFR: "A2", respuestaCorrecta: 0 },
      { id: "x5", habilidad: "lectura", nivelCEFR: "A2", respuestaCorrecta: 0 }
    ];
    // 3 de 5 correctas = 60%, justo el umbral: debe contar como aprobado el nivel.
    var respuestas = { x1: 0, x2: 0, x3: 0, x4: 1, x5: 1 };
    Test.assertEqual(App.Diagnostico.evaluarHabilidad(bancoConTres, respuestas), "A2");
  });

  Test.test("porcentajeHaciaB2: A2 es 0%, B1 es 50%, B2 es 100%", function () {
    Test.assertEqual(App.Diagnostico.porcentajeHaciaB2("A2"), 0);
    Test.assertEqual(App.Diagnostico.porcentajeHaciaB2("B1"), 50);
    Test.assertEqual(App.Diagnostico.porcentajeHaciaB2("B2"), 100);
  });

  Test.test("porcentajeHaciaB2: C1 se topa en 100%, no pasa de ahí", function () {
    Test.assertEqual(App.Diagnostico.porcentajeHaciaB2("C1"), 100);
  });

  Test.test("construirResultado: combina banco (evaluado) y autoevaluación (habla/escritura)", function () {
    var bancoCompleto = [
      { id: "l1", habilidad: "lectura", nivelCEFR: "A2", respuestaCorrecta: 0 },
      { id: "e1", habilidad: "escucha", nivelCEFR: "A2", respuestaCorrecta: 0 },
      { id: "v1", habilidad: "vocabulario_gramatica", nivelCEFR: "A2", respuestaCorrecta: 0 }
    ];
    var respuestas = { l1: 0, e1: 0, v1: 0 };
    var autoeval = { habla: "B1", escritura: "A2" };
    var resultado = App.Diagnostico.construirResultado(bancoCompleto, respuestas, autoeval, new Date(2026, 10, 16));

    Test.assertEqual(resultado.fecha, "2026-11-16");
    Test.assertEqual(resultado.porHabilidad.lectura.nivelCEFR, "A2");
    Test.assertEqual(resultado.porHabilidad.escucha.nivelCEFR, "A2");
    Test.assertEqual(resultado.porHabilidad.vocabulario_gramatica.nivelCEFR, "A2");
    Test.assertEqual(resultado.porHabilidad.habla.nivelCEFR, "B1");
    Test.assertEqual(resultado.porHabilidad.habla.autoevaluado, true);
    Test.assertEqual(resultado.porHabilidad.escritura.nivelCEFR, "A2");
  });

  Test.test("construirResultado: sin autoevaluación, habla/escritura caen a A2 por defecto", function () {
    var resultado = App.Diagnostico.construirResultado([], {}, null, new Date(2026, 10, 16));
    Test.assertEqual(resultado.porHabilidad.habla.nivelCEFR, "A2");
    Test.assertEqual(resultado.porHabilidad.escritura.nivelCEFR, "A2");
  });
})();
