// Avance continuo por habilidad (D29): ventana de 30, fracción, confirmación, reintento, global, "nunca baja".
(function () {
  var A = App.Avance;
  var K = A.CONSTANTES;

  function llenar(estado, n, valor, peso, hoy) {
    var e = estado;
    var quedoLista = false;
    for (var i = 0; i < n; i++) {
      var r = A.registrarRespuestaEnEstado(e, valor, peso, hoy || "2026-11-20");
      e = r.estado;
      quedoLista = quedoLista || r.quedoLista;
    }
    return { estado: e, quedoLista: quedoLista };
  }

  Test.test("constantes: valores de D29 en un solo lugar", function () {
    Test.assertEqual(K.VENTANA_RESPUESTAS, 30);
    Test.assertEqual(K.ACIERTO_OBJETIVO, 0.8);
    Test.assertEqual(K.CONFIRMACION_APRUEBA, 0.7);
    Test.assertEqual(K.CONFIRMACION_MIN_PREGUNTAS, 8);
    Test.assertEqual(K.CONFIRMACION_REINTENTO_DIAS, 7);
    Test.assertEqual(K.CONFIRMACION_RETENIDAS, 15);
  });

  Test.test("fracción: ventana vacía = 0", function () {
    Test.assertEqual(A.resumenVentana([]).fraccion, 0);
  });

  Test.test("fracción: 30 respuestas con 80 % = 100 %", function () {
    var v = [];
    for (var i = 0; i < 30; i++) v = A.agregarRespuesta(v, i < 24 ? 1 : 0, 1);
    var r = A.resumenVentana(v);
    Test.assertEqual(r.n, 30);
    Test.assertEqual(Math.abs(r.aciertos - 0.8) < 1e-9, true);
    Test.assertEqual(Math.abs(r.fraccion - 1) < 1e-9, true);
  });

  Test.test("fracción: 15 respuestas perfectas = 50 %; 30 con 40 % de acierto = 50 %", function () {
    var v = [];
    for (var i = 0; i < 15; i++) v = A.agregarRespuesta(v, 1, 1);
    Test.assertEqual(Math.abs(A.resumenVentana(v).fraccion - 0.5) < 1e-9, true);
    var w = [];
    for (var j = 0; j < 30; j++) w = A.agregarRespuesta(w, j < 12 ? 1 : 0, 1);
    Test.assertEqual(Math.abs(A.resumenVentana(w).fraccion - 0.5) < 1e-9, true);
  });

  Test.test("ventana de 30: la respuesta 31 desplaza a la más vieja", function () {
    var v = [];
    for (var i = 0; i < 30; i++) v = A.agregarRespuesta(v, 0, 1); // 30 fallos
    v = A.agregarRespuesta(v, 1, 1);
    Test.assertEqual(v.length, 30);
    Test.assertEqual(v[29].v, 1);
    Test.assertEqual(Math.abs(A.resumenVentana(v).aciertos - 1 / 30) < 1e-9, true);
  });

  Test.test("escritura (D35): ventana de 10 consignas, peso 1, el resto de habilidades sigue en 30", function () {
    Test.assertEqual(K.VENTANA_POR_HABILIDAD.escritura, 10);
    Test.assertEqual(K.PESO_RESPUESTA, 1);
    Test.assertEqual(A.ventanaDe("escritura"), 10);
    ["lectura", "escucha", "habla"].forEach(function (h) {
      Test.assertEqual(A.ventanaDe(h), 30);
    });
    var v = [];
    for (var i = 0; i < 25; i++) v = A.agregarRespuesta(v, 1, K.PESO_RESPUESTA, "escritura");
    Test.assertEqual(v.length, 10);
    Test.assertEqual(A.resumenVentana(v, "escritura").n, 10);
    var w = [];
    for (var j = 0; j < 40; j++) w = A.agregarRespuesta(w, 1, 1, "lectura");
    Test.assertEqual(w.length, 30);
  });

  Test.test("escritura (D35): 10 consignas al 80 % llenan la barra; 'Faltan N' usa 10", function () {
    var e = A.estadoHabilidadVacio("B1", "escritura");
    Test.assertEqual(A.textoDeFalta(e).faltan, 10);
    e = llenar(e, 4, 1, 1).estado;
    var f = A.textoDeFalta(e);
    Test.assertEqual(f.tipo, "faltan");
    Test.assertEqual(f.faltan, 6);
    Test.assertEqual(A.porcentajeDeHabilidad(e), 40);
    var lista = llenar(A.estadoHabilidadVacio("B1", "escritura"), 10, 0.8, 1);
    Test.assertEqual(lista.quedoLista, true);
    Test.assertEqual(A.porcentajeDeHabilidad(lista.estado), 99);
    // 10 consignas con 70 % de la lista: no llena (aciertos < 80 %)
    var baja = llenar(A.estadoHabilidadVacio("B1", "escritura"), 10, 0.7, 1);
    Test.assertEqual(baja.quedoLista, false);
    // lectura con 10 respuestas NO se llena
    Test.assertEqual(llenar(A.estadoHabilidadVacio("B1", "lectura"), 10, 1, 1).quedoLista, false);
  });

  Test.test("escritura (D35): migración desde hey-3 (60 respuestas de peso 0.5) -> últimas 10 con peso 1", function () {
    var vieja = [];
    for (var i = 0; i < 60; i++) vieja.push({ v: i < 50 ? 0 : 1, w: 0.5 });
    var n = A.normalizarVentana(vieja, "escritura");
    Test.assertEqual(n.length, 10);
    Test.assertEqual(n[0].w, 1);
    Test.assertEqual(A.resumenVentana(n, "escritura").aciertos, 1); // solo quedan las últimas 10 (valor 1)
    // otras habilidades no se tocan
    var lect = [{ v: 1, w: 1 }, { v: 0, w: 1 }];
    Test.assertEqual(A.normalizarVentana(lect, "lectura").length, 2);
  });

  Test.test("porcentaje mostrado: nunca 100 antes de confirmar; lista = 99", function () {
    var e = A.estadoHabilidadVacio("B1");
    Test.assertEqual(A.porcentajeDeHabilidad(e), 0);
    var r = llenar(e, 15, 1, 1);
    Test.assertEqual(A.porcentajeDeHabilidad(r.estado), 50);
    Test.assertEqual(r.quedoLista, false);
    var lista = llenar(e, 30, 1, 1);
    Test.assertEqual(lista.quedoLista, true);
    Test.assertEqual(lista.estado.listaParaConfirmar, true);
    Test.assertEqual(A.porcentajeDeHabilidad(lista.estado), 99);
    Test.assertEqual(A.textoDeFalta(lista.estado).tipo, "lista");
  });

  Test.test("quedoLista solo es true en el momento de pasar a lista", function () {
    var lista = llenar(A.estadoHabilidadVacio("B1"), 30, 1, 1).estado;
    var otra = A.registrarRespuestaEnEstado(lista, 1, 1, "2026-11-21");
    Test.assertEqual(otra.quedoLista, false);
    Test.assertEqual(otra.estado.listaParaConfirmar, true);
  });

  Test.test("en C2 no hay lista para confirmar (techo)", function () {
    var r = llenar(A.estadoHabilidadVacio("C2"), 40, 1, 1);
    Test.assertEqual(r.estado.listaParaConfirmar, false);
    Test.assertEqual(A.textoDeFalta(r.estado).tipo, "techo");
    Test.assertEqual(A.puedeConfirmar(r.estado, "2026-11-20"), false);
  });

  Test.test("textoDeFalta: 'Faltan N respuestas' y caso de acierto bajo con ventana llena", function () {
    var e = llenar(A.estadoHabilidadVacio("A2"), 22, 1, 1).estado;
    var f = A.textoDeFalta(e);
    Test.assertEqual(f.tipo, "faltan");
    Test.assertEqual(f.faltan, 8);
    var malo = llenar(A.estadoHabilidadVacio("A2"), 30, 0, 1).estado;
    Test.assertEqual(A.textoDeFalta(malo).tipo, "aciertos");
    Test.assertEqual(A.textoDeFalta(A.estadoHabilidadVacio("A2")).tipo, "nada");
  });

  Test.test("nivel global: usa la fracción real (no 50 fijo) con los pesos de siempre", function () {
    var estados = {
      lectura: llenar(A.estadoHabilidadVacio("B1"), 15, 1, 1).estado, // 2.5
      escucha: A.estadoHabilidadVacio("B1"), // 2.0
      habla: A.estadoHabilidadVacio("B1"), // 2.0
      escritura: A.estadoHabilidadVacio("B1") // 2.0
    };
    var g = A.calcularNivelGlobalDesdeEstados(estados);
    var esperado = (2.5 * 3 + 2 * 1.5 + 2 * 2.5 + 2 * 2) / (3 + 1.5 + 2.5 + 2);
    Test.assertEqual(g.nivel, "B1");
    Test.assertEqual(g.porcentajeHaciaSiguiente, Math.round((esperado - 2) * 100));
    Test.assertEqual(g.siguienteNivel, "B2");
  });

  Test.test("confirmación: aprueba con >= 70 % y mínimo 8 preguntas", function () {
    Test.assertEqual(A.evaluarConfirmacion(7, 10).aprobada, true);
    Test.assertEqual(A.evaluarConfirmacion(6, 10).aprobada, false);
    Test.assertEqual(A.evaluarConfirmacion(6, 8).aprobada, true); // 75 %
    Test.assertEqual(A.evaluarConfirmacion(5.6, 8).aprobada, true); // exactamente 70 %
    Test.assertEqual(A.evaluarConfirmacion(7, 7).valida, false); // menos de 8: no vale
    Test.assertEqual(A.evaluarConfirmacion(7, 7).aprobada, false);
  });

  Test.test("confirmación aprobada: sube un nivel, ventana vacía, sin lista", function () {
    var lista = llenar(A.estadoHabilidadVacio("B1"), 30, 1, 1).estado;
    var r = A.aplicarConfirmacion(lista, A.evaluarConfirmacion(9, 10), "2026-11-21");
    Test.assertEqual(r.subio, true);
    Test.assertEqual(r.estado.nivel, "B2");
    Test.assertEqual(r.estado.ventana.length, 0);
    Test.assertEqual(r.estado.listaParaConfirmar, false);
    Test.assertEqual(A.porcentajeDeHabilidad(r.estado), 0);
  });

  Test.test("confirmación fallida: conserva las últimas 15, mismo nivel, anota la fecha", function () {
    var e = A.estadoHabilidadVacio("B1");
    for (var i = 0; i < 30; i++) e = A.registrarRespuestaEnEstado(e, i < 15 ? 0 : 1, 1, "2026-11-20").estado;
    Test.assertEqual(e.listaParaConfirmar, false); // 15 fallos + 15 aciertos = 50 % -> no estaba lista
    e = llenar(A.estadoHabilidadVacio("B1"), 30, 1, 1).estado; // sí lista
    var r = A.aplicarConfirmacion(e, A.evaluarConfirmacion(3, 10), "2026-11-21");
    Test.assertEqual(r.subio, false);
    Test.assertEqual(r.estado.nivel, "B1");
    Test.assertEqual(r.estado.ventana.length, 15);
    Test.assertEqual(r.estado.listaParaConfirmar, false);
    Test.assertEqual(r.estado.ultimoFallo, "2026-11-21");
  });

  Test.test("confirmación fallida: se conservan las 15 MÁS RECIENTES", function () {
    var e = A.estadoHabilidadVacio("B1");
    for (var i = 0; i < 30; i++) e = A.registrarRespuestaEnEstado(e, i < 15 ? 1 : 0.9, 1, "2026-11-20").estado;
    var r = A.aplicarConfirmacion(e, A.evaluarConfirmacion(0, 10), "2026-11-21").estado;
    Test.assertEqual(r.ventana.every(function (x) { return x.v === 0.9; }), true);
  });

  Test.test("confirmación inválida (menos de 8 preguntas) no cambia nada", function () {
    var lista = llenar(A.estadoHabilidadVacio("B1"), 30, 1, 1).estado;
    var r = A.aplicarConfirmacion(lista, A.evaluarConfirmacion(5, 5), "2026-11-21");
    Test.assertEqual(r.estado, lista);
    Test.assertEqual(r.subio, false);
  });

  Test.test("reintento: bloqueado antes de 7 días, permitido al día 7", function () {
    var lista = llenar(A.estadoHabilidadVacio("B1"), 30, 1, 1).estado;
    Test.assertEqual(A.puedeConfirmar(lista, "2026-11-20"), true);
    var fallada = A.aplicarConfirmacion(lista, A.evaluarConfirmacion(1, 10), "2026-11-20").estado;
    Test.assertEqual(A.puedeConfirmar(fallada, "2026-11-20"), false); // ya no está lista
    // vuelve a llenar la ventana (15 retenidas + 15 buenas) -> lista de nuevo, pero aún no pasan 7 días
    var de_nuevo = llenar(fallada, 15, 1, 1, "2026-11-22").estado;
    Test.assertEqual(de_nuevo.listaParaConfirmar, true);
    Test.assertEqual(A.puedeConfirmar(de_nuevo, "2026-11-22"), false);
    Test.assertEqual(A.puedeConfirmar(de_nuevo, "2026-11-26"), false); // día 6
    Test.assertEqual(A.puedeConfirmar(de_nuevo, "2026-11-27"), true); // día 7
    Test.assertEqual(A.fechaReintento(fallada), "2026-11-27");
  });

  Test.test("reevaluación: puede subir o confirmar, NUNCA baja", function () {
    var e = llenar(A.estadoHabilidadVacio("B1"), 12, 1, 1).estado;
    var sube = A.aplicarReevaluacion(e, "B2");
    Test.assertEqual(sube.accion, "sube");
    Test.assertEqual(sube.estado.nivel, "B2");
    Test.assertEqual(sube.estado.ventana.length, 0);
    var igual = A.aplicarReevaluacion(e, "B1");
    Test.assertEqual(igual.accion, "confirma");
    Test.assertEqual(igual.estado.nivel, "B1");
    Test.assertEqual(igual.estado.ventana.length, 12); // no pierde su avance
    var baja = A.aplicarReevaluacion(e, "A2");
    Test.assertEqual(baja.accion, "repasa");
    Test.assertEqual(baja.estado.nivel, "B1");
    Test.assertEqual(baja.estado.ventana.length, 12);
  });

  Test.test("siguienteNivelDe: C2 no tiene siguiente", function () {
    Test.assertEqual(A.siguienteNivelDe("B2"), "C1");
    Test.assertEqual(A.siguienteNivelDe("C2"), null);
  });
})();
