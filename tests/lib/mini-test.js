/* Mini framework de pruebas, sin dependencias, pensado para correr con `osascript -l JavaScript`.
   No usa Jest/Vitest porque esta máquina no tiene Node/npm instalados (ver DECISIONES.md D1). */
(function (global) {
  "use strict";

  var pruebas = [];
  var resultados = { pasaron: 0, fallaron: 0, detalles: [] };

  function test(nombre, fn) {
    pruebas.push({ nombre: nombre, fn: fn });
  }

  function assertEqual(actual, esperado, mensaje) {
    var iguales = JSON.stringify(actual) === JSON.stringify(esperado);
    if (!iguales) {
      throw new Error(
        (mensaje ? mensaje + " — " : "") +
          "esperado " + JSON.stringify(esperado) + " pero fue " + JSON.stringify(actual)
      );
    }
  }

  function assertTrue(valor, mensaje) {
    if (!valor) {
      throw new Error(mensaje || "se esperaba un valor verdadero");
    }
  }

  function run() {
    pruebas.forEach(function (p) {
      try {
        p.fn();
        resultados.pasaron++;
        resultados.detalles.push("OK   " + p.nombre);
      } catch (err) {
        resultados.fallaron++;
        resultados.detalles.push("FAIL " + p.nombre + " :: " + err.message);
      }
    });

    resultados.detalles.forEach(function (linea) {
      console.log(linea);
    });
    console.log("---");
    console.log(resultados.pasaron + " pasaron, " + resultados.fallaron + " fallaron");

    ObjC.import("stdlib");
    $.exit(resultados.fallaron > 0 ? 1 : 0);
  }

  global.Test = {
    test: test,
    assertEqual: assertEqual,
    assertTrue: assertTrue,
    run: run
  };
})(this);
