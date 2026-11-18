(function () {
  Test.test("construirPayload: historial vacío solo manda el mensaje nuevo", function () {
    var payload = App.Conversacion.construirPayload([], "Hi, ready for the meeting?", { escenario: "reuniones" });
    Test.assertEqual(payload.model, App.Conversacion.MODELO);
    Test.assertEqual(payload.messages.length, 1);
    Test.assertEqual(payload.messages[0].role, "user");
    Test.assertEqual(payload.messages[0].content, "Hi, ready for the meeting?");
  });

  Test.test("construirPayload: incluye el system prompt con el escenario y el nivel", function () {
    var payload = App.Conversacion.construirPayload([], "hola", { escenario: "entrevistas", nivelCEFR: "B2" });
    Test.assertEqual(payload.system.indexOf("job interview") !== -1, true);
    Test.assertEqual(payload.system.indexOf("B2") !== -1, true);
  });

  Test.test("construirPayload: mapea rol 'asistente' a 'assistant' y 'usuario' a 'user'", function () {
    var historial = [
      { rol: "usuario", texto: "Hi" },
      { rol: "asistente", texto: "Hello!" }
    ];
    var payload = App.Conversacion.construirPayload(historial, "How are you?", {});
    Test.assertEqual(payload.messages[0].role, "user");
    Test.assertEqual(payload.messages[1].role, "assistant");
    Test.assertEqual(payload.messages[2].role, "user");
    Test.assertEqual(payload.messages[2].content, "How are you?");
  });

  Test.test("recortarHistorial: no recorta si ya está dentro del límite", function () {
    var historial = [{ rol: "usuario", texto: "a" }, { rol: "asistente", texto: "b" }];
    Test.assertEqual(App.Conversacion.recortarHistorial(historial, 8).length, 2);
  });

  Test.test("recortarHistorial: recorta pero nunca deja el historial empezando en 'asistente'", function () {
    var historial = [];
    for (var i = 0; i < 11; i++) {
      historial.push({ rol: i % 2 === 0 ? "usuario" : "asistente", texto: "t" + i });
    }
    // 11 turnos, límite 8 -> exceso 3 (impar) -> se recortan 4, quedan 7, empezando en "usuario"
    var recortado = App.Conversacion.recortarHistorial(historial, 8);
    Test.assertEqual(recortado.length, 7);
    Test.assertEqual(recortado[0].rol, "usuario");
  });

  Test.test("agregarTurno: no muta el historial original", function () {
    var original = [{ rol: "usuario", texto: "a" }];
    var nuevo = App.Conversacion.agregarTurno(original, "asistente", "b");
    Test.assertEqual(original.length, 1);
    Test.assertEqual(nuevo.length, 2);
    Test.assertEqual(nuevo[1].rol, "asistente");
  });

  Test.test("parsearRespuesta: extrae el texto de una respuesta válida", function () {
    var r = App.Conversacion.parsearRespuesta({ content: [{ type: "text", text: "Hello there!" }] });
    Test.assertEqual(r.ok, true);
    Test.assertEqual(r.texto, "Hello there!");
  });

  Test.test("parsearRespuesta: respuesta de error de la API", function () {
    var r = App.Conversacion.parsearRespuesta({ type: "error", error: { message: "clave inválida" } });
    Test.assertEqual(r.ok, false);
    Test.assertEqual(r.error, "clave inválida");
  });

  Test.test("parsearRespuesta: sin bloque de texto cuenta como respuesta vacía", function () {
    var r = App.Conversacion.parsearRespuesta({ content: [] });
    Test.assertEqual(r.ok, false);
    Test.assertEqual(r.error, "respuesta_vacia");
  });

  Test.test("parsearRespuesta: null o forma inesperada no rompe", function () {
    Test.assertEqual(App.Conversacion.parsearRespuesta(null).ok, false);
    Test.assertEqual(App.Conversacion.parsearRespuesta("no es un objeto").ok, false);
  });

  Test.test("mensajeError: conoce los códigos relevantes y tiene un genérico de respaldo", function () {
    Test.assertEqual(App.Conversacion.mensajeError(429).indexOf("hoy") !== -1, true);
    Test.assertEqual(App.Conversacion.mensajeError(999).indexOf("999") !== -1, true);
  });
})();
