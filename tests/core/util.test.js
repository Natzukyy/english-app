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
})();
