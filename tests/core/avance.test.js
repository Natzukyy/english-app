(function () {
  Test.test("indiceNivel: A1 es 0, C2 es 5, nivel desconocido cae en 0", function () {
    Test.assertEqual(App.Avance.indiceNivel("A1"), 0);
    Test.assertEqual(App.Avance.indiceNivel("C2"), 5);
    Test.assertEqual(App.Avance.indiceNivel("XX"), 0);
  });

  Test.test("numeroDesdeNivel: nivel + % dentro del nivel da un número continuo", function () {
    Test.assertEqual(App.Avance.numeroDesdeNivel("A1", 0), 0);
    Test.assertEqual(App.Avance.numeroDesdeNivel("B1", 50), 2.5);
    Test.assertEqual(App.Avance.numeroDesdeNivel("B2", 100), 4);
  });

  Test.test("numeroDesdeNivel: en C2 (el techo) no hay fracción, por más % que se pase", function () {
    Test.assertEqual(App.Avance.numeroDesdeNivel("C2", 80), 5);
    Test.assertEqual(App.Avance.numeroDesdeNivel("C2", 0), 5);
  });

  Test.test("numeroDesdeNivel: porcentaje fuera de 0-100 se acota", function () {
    Test.assertEqual(App.Avance.numeroDesdeNivel("A2", 150), 2);
    Test.assertEqual(App.Avance.numeroDesdeNivel("A2", -20), 1);
  });

  Test.test("nivelDesdeNumero: es el inverso de numeroDesdeNivel", function () {
    var r = App.Avance.nivelDesdeNumero(2.66);
    Test.assertEqual(r.nivel, "B1");
    Test.assertEqual(r.porcentajeHaciaSiguiente, 66);
    Test.assertEqual(r.siguienteNivel, "B2");
  });

  Test.test("nivelDesdeNumero: en el número exacto de C2, siguienteNivel es null", function () {
    var r = App.Avance.nivelDesdeNumero(5);
    Test.assertEqual(r.nivel, "C2");
    Test.assertEqual(r.siguienteNivel, null);
    Test.assertEqual(r.porcentajeHaciaSiguiente, 100);
  });

  Test.test("nivelDesdeNumero: número negativo o mayor al techo se acota a A1/C2", function () {
    Test.assertEqual(App.Avance.nivelDesdeNumero(-3).nivel, "A1");
    Test.assertEqual(App.Avance.nivelDesdeNumero(99).nivel, "C2");
  });

  Test.test("calcularNivelGlobal: promedio ponderado con las 4 habilidades en el mismo nivel da ese nivel", function () {
    var r = App.Avance.calcularNivelGlobal({ lectura: 2, habla: 2, escucha: 2, escritura: 2 });
    Test.assertEqual(r.nivel, "B1");
    Test.assertEqual(r.porcentajeHaciaSiguiente, 0);
  });

  Test.test("calcularNivelGlobal: lectura pesa más que escucha -- lectura alta sube el global más que escucha alta", function () {
    var conLecturaAlta = App.Avance.calcularNivelGlobal({ lectura: 5, habla: 0, escucha: 0, escritura: 0 });
    var conEscuchaAlta = App.Avance.calcularNivelGlobal({ lectura: 0, habla: 0, escucha: 5, escritura: 0 });
    var numLectura = App.Avance.indiceNivel(conLecturaAlta.nivel) + conLecturaAlta.porcentajeHaciaSiguiente / 100;
    var numEscucha = App.Avance.indiceNivel(conEscuchaAlta.nivel) + conEscuchaAlta.porcentajeHaciaSiguiente / 100;
    Test.assertEqual(numLectura > numEscucha, true);
  });

  Test.test("calcularNivelGlobal: habilidades ausentes no cuentan como 0 en el promedio", function () {
    // Solo lectura con dato: el global debe ser exactamente el nivel de lectura, no arrastrado
    // hacia abajo por habla/escucha/escritura "ausentes" tratadas como 0.
    var r = App.Avance.calcularNivelGlobal({ lectura: 4 });
    Test.assertEqual(r.nivel, "C1");
  });

  Test.test("calcularNivelGlobal: sin ninguna habilidad con datos, da A1 sin romper", function () {
    var r = App.Avance.calcularNivelGlobal({});
    Test.assertEqual(r.nivel, "A1");
  });

  Test.test("nivelEfectivoConContenido: nivel real con contenido disponible, se queda igual", function () {
    var r = App.Avance.nivelEfectivoConContenido("B1", ["A1", "A2", "B1", "B2"]);
    Test.assertEqual(r.nivel, "B1");
    Test.assertEqual(r.sustituido, false);
  });

  Test.test("nivelEfectivoConContenido: nivel B2+ sin contenido C1/C2 reutiliza B2", function () {
    var r = App.Avance.nivelEfectivoConContenido("C1", ["A1", "A2", "B1", "B2"]);
    Test.assertEqual(r.nivel, "B2");
    Test.assertEqual(r.sustituido, true);
  });

  Test.test("nivelEfectivoConContenido: sin lista de niveles con contenido, nunca sustituye", function () {
    var r = App.Avance.nivelEfectivoConContenido("C2", []);
    Test.assertEqual(r.nivel, "C2");
    Test.assertEqual(r.sustituido, false);
  });

  var LISTA = [
    { id: "a2-1", nivelCEFR: "A2" },
    { id: "a2-2", nivelCEFR: "A2" },
    { id: "b1-1", nivelCEFR: "B1" },
    { id: "b2-1", nivelCEFR: "B2" }
  ];

  Test.test("nivelesDisponibles: devuelve los niveles distintos en orden A1..C2", function () {
    Test.assertEqual(App.Avance.nivelesDisponibles(LISTA), ["A2", "B1", "B2"]);
    Test.assertEqual(App.Avance.nivelesDisponibles([]), []);
  });

  Test.test("elegirPorNivel: usa el mismo nivel cuando hay contenido", function () {
    Test.assertEqual(App.Avance.elegirPorNivel(LISTA, "B1", 0.5).id, "b1-1");
  });

  Test.test("elegirPorNivel: A1 SIN contenido A1 nunca devuelve B1/B2 (regresión: antes caía a cualquiera)", function () {
    for (var i = 0; i < 20; i++) {
      var elegido = App.Avance.elegirPorNivel(LISTA, "A1", i / 20);
      Test.assertEqual(elegido.nivelCEFR, "A2");
    }
  });

  Test.test("elegirPorNivel: nivel sin contenido en medio baja al más cercano por debajo", function () {
    var sinB1 = [{ id: "a2", nivelCEFR: "A2" }, { id: "b2", nivelCEFR: "B2" }];
    Test.assertEqual(App.Avance.elegirPorNivel(sinB1, "B1", 0).id, "a2");
  });

  Test.test("elegirPorNivel: C1 sin contenido C1 reutiliza el más alto disponible (B2)", function () {
    Test.assertEqual(App.Avance.elegirPorNivel(LISTA, "C1", 0).id, "b2-1");
  });

  Test.test("elegirPorNivel: lista vacía devuelve null y el aleatorio recorre las candidatas", function () {
    Test.assertEqual(App.Avance.elegirPorNivel([], "A2", 0), null);
    Test.assertEqual(App.Avance.elegirPorNivel(LISTA, "A2", 0).id, "a2-1");
    Test.assertEqual(App.Avance.elegirPorNivel(LISTA, "A2", 0.99).id, "a2-2");
  });

  Test.test("etiquetaNivel: B2 medido con el banco se muestra como B2+; el B2 autoevaluado no", function () {
    Test.assertEqual(App.Avance.etiquetaNivel("B2", "lectura"), "B2+");
    Test.assertEqual(App.Avance.etiquetaNivel("B2", "vocabulario_gramatica"), "B2+");
    Test.assertEqual(App.Avance.etiquetaNivel("B2", "habla"), "B2");
    Test.assertEqual(App.Avance.etiquetaNivel("B1", "lectura"), "B1");
  });

  Test.test("porcentajeEnEscala: A1 abajo, C2 arriba, B2 ya no llena la barra (escala abierta)", function () {
    Test.assertEqual(App.Avance.porcentajeEnEscala("A1", 0), 0);
    Test.assertEqual(App.Avance.porcentajeEnEscala("C2", 100) > App.Avance.porcentajeEnEscala("B2", 100), true);
    Test.assertEqual(App.Avance.porcentajeEnEscala("B2", 50) < 100, true);
  });

  Test.test("nivelEfectivoConContenido: con contenido propio de C1 y C2 ya no se reutiliza B2", function () {
    var todos = ["A1", "A2", "B1", "B2", "C1", "C2"];
    Test.assertEqual(App.Avance.nivelEfectivoConContenido("C1", todos).sustituido, false);
    Test.assertEqual(App.Avance.nivelEfectivoConContenido("C2", todos).nivel, "C2");
  });
})();
