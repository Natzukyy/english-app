(function () {
  Test.test("escaparHTML: escapa las 5 entidades peligrosas", function () {
    Test.assertEqual(App.Util.escaparHTML("<img src=x onerror=\"alert('hi')\">&"), "&lt;img src=x onerror=&quot;alert(&#39;hi&#39;)&quot;&gt;&amp;");
  });

  Test.test("escaparHTML: texto normal no cambia", function () {
    Test.assertEqual(App.Util.escaparHTML("Hello, how are you?"), "Hello, how are you?");
  });

  Test.test("escaparHTML: null y undefined dan cadena vacía, no revientan", function () {
    Test.assertEqual(App.Util.escaparHTML(null), "");
    Test.assertEqual(App.Util.escaparHTML(undefined), "");
  });

  Test.test("escaparHTML: números se convierten a texto sin romper", function () {
    Test.assertEqual(App.Util.escaparHTML(42), "42");
  });

  Test.test("barajarOpciones: la correcta aparece en posiciones distintas a lo largo de muchas corridas", function () {
    var opciones = ["a", "b", "c", "d"];
    var posicionesVistas = {};
    for (var i = 0; i < 200; i++) {
      var r = App.Util.barajarOpciones(opciones, 0);
      posicionesVistas[r.indiceCorrecta] = true;
    }
    Test.assertTrue(Object.keys(posicionesVistas).length > 1, "en 200 corridas la correcta debería caer en más de una posición distinta");
  });

  Test.test("barajarOpciones: la comprobación sigue siendo correcta en cualquier orden resultante", function () {
    var opciones = ["manzana", "pera", "uva", "kiwi"];
    var indiceCorrectaOriginal = 2; // "uva"
    for (var i = 0; i < 100; i++) {
      var r = App.Util.barajarOpciones(opciones, indiceCorrectaOriginal);
      // la opción que quedó marcada como correcta en el resultado barajado sigue siendo "uva"
      Test.assertEqual(r.opciones[r.indiceCorrecta], "uva");
      // y el índice original guardado para esa posición también sigue apuntando a "uva"
      Test.assertEqual(opciones[r.indicesOriginales[r.indiceCorrecta]], "uva");
    }
  });

  Test.test("barajarOpciones: traduce una posición barajada de vuelta al índice original correctamente", function () {
    var opciones = ["x", "y", "z"];
    var r = App.Util.barajarOpciones(opciones, 1); // "y" es la correcta
    r.opciones.forEach(function (valor, posicionBarajada) {
      var indiceOriginal = r.indicesOriginales[posicionBarajada];
      Test.assertEqual(opciones[indiceOriginal], valor);
    });
  });

  Test.test("barajarOpciones: no se pierde ni se duplica ninguna opción", function () {
    var opciones = ["uno", "dos", "tres", "cuatro", "cinco"];
    for (var i = 0; i < 50; i++) {
      var r = App.Util.barajarOpciones(opciones, 3);
      Test.assertEqual(r.opciones.length, opciones.length);
      Test.assertEqual(r.opciones.slice().sort(), opciones.slice().sort());
      Test.assertEqual(r.indicesOriginales.slice().sort(function (a, b) { return a - b; }), [0, 1, 2, 3, 4]);
    }
  });

  Test.test("barajarOpciones: con una sola opción, sigue siendo la correcta", function () {
    var r = App.Util.barajarOpciones(["única"], 0);
    Test.assertEqual(r.opciones, ["única"]);
    Test.assertEqual(r.indiceCorrecta, 0);
  });
})();
