(function () {
  function habilidadesBase() {
    return {
      lectura: { nivelCEFR: "A2", ultimaPractica: "2026-11-10" },
      habla: { nivelCEFR: "A2", ultimaPractica: "2026-11-10" },
      escucha: { nivelCEFR: "A2", ultimaPractica: "2026-11-10" },
      escritura: { nivelCEFR: "A2", ultimaPractica: "2026-11-10" }
    };
  }

  Test.test("regla 1: sin diagnóstico hecho, el plan es solo Diagnóstico", function () {
    var r = App.Plan.calcularPlanDelDia({ diagnosticoHecho: false, metaMinutosDia: 15 });
    Test.assertEqual(r.pasos.length, 1);
    Test.assertEqual(r.pasos[0].tipo, "diagnostico");
  });

  Test.test("sin tarjetas vencidas ni nuevas: no hay paso de repaso", function () {
    var r = App.Plan.calcularPlanDelDia({
      diagnosticoHecho: true,
      tarjetasVencidas: 0,
      tarjetasNuevasDisponibles: 0,
      habilidades: habilidadesBase(),
      metaMinutosDia: 15,
      fecha: "2026-11-16", // lunes, no es día de conversación por defecto
      diaSemana: 1
    });
    var tiposRepaso = r.pasos.filter(function (p) { return p.tipo === "repaso"; });
    Test.assertEqual(tiposRepaso.length, 0);
  });

  Test.test("regla 2/7: muchos atrasos (115 vencidas) se topan a 20, no acumulan", function () {
    var r = App.Plan.calcularPlanDelDia({
      diagnosticoHecho: true,
      tarjetasVencidas: 115,
      tarjetasNuevasDisponibles: 0,
      habilidades: habilidadesBase(),
      metaMinutosDia: 15,
      diaSemana: 1
    });
    var repaso = r.pasos.filter(function (p) { return p.tipo === "repaso"; })[0];
    Test.assertEqual(repaso.tarjetasVencidas, App.Plan.TOPE_TARJETAS_VENCIDAS_POR_SESION);
    Test.assertEqual(repaso.tarjetasVencidas, 20);
  });

  Test.test("tarjetas nuevas se topan a 15 por día", function () {
    var r = App.Plan.calcularPlanDelDia({
      diagnosticoHecho: true,
      tarjetasVencidas: 0,
      tarjetasNuevasDisponibles: 40,
      habilidades: habilidadesBase(),
      metaMinutosDia: 15,
      diaSemana: 1
    });
    var repaso = r.pasos.filter(function (p) { return p.tipo === "repaso"; })[0];
    Test.assertEqual(repaso.tarjetasNuevas, 15);
  });

  Test.test("meta baja (5 min): igual arma un plan con al menos un bloque de práctica", function () {
    var r = App.Plan.calcularPlanDelDia({
      diagnosticoHecho: true,
      tarjetasVencidas: 0,
      tarjetasNuevasDisponibles: 0,
      habilidades: habilidadesBase(),
      metaMinutosDia: 5,
      diaSemana: 1
    });
    var bloques = r.pasos.filter(function (p) { return p.tipo === "practica"; });
    Test.assertEqual(bloques.length >= 1, true);
  });

  Test.test("meta alta (90 min): añade bloques hasta el tope de rotación, nunca un plan absurdo", function () {
    var r = App.Plan.calcularPlanDelDia({
      diagnosticoHecho: true,
      tarjetasVencidas: 0,
      tarjetasNuevasDisponibles: 0,
      habilidades: habilidadesBase(),
      metaMinutosDia: 90,
      diaSemana: 1
    });
    // El tope de 6 bloques de rotación es a propósito (ver TOPE_BLOQUES_ROTACION en plan.js):
    // una meta de 90 min no debe generar un plan de 9 bloques de la misma habilidad repetida.
    var bloquesRotacion = r.pasos.filter(function (p) { return p.tipo === "practica" && p.habilidad !== "escritura"; });
    Test.assertEqual(bloquesRotacion.length, 6);
    // Con el tope ya alcanzado, el total se queda por debajo de la meta -- es la señal de que
    // el tope hizo su trabajo, no un bug.
    Test.assertEqual(r.totalMinutos < 90, true);
  });

  Test.test("regla 3: rota hacia la habilidad de menor nivel CEFR primero", function () {
    var habilidades = habilidadesBase();
    habilidades.escucha.nivelCEFR = "A1"; // la más atrasada en nivel de las 3 de rotación
    var r = App.Plan.calcularPlanDelDia({
      diagnosticoHecho: true,
      tarjetasVencidas: 0,
      tarjetasNuevasDisponibles: 0,
      habilidades: habilidades,
      metaMinutosDia: 5, // justo para un solo bloque
      diaSemana: 1
    });
    var primerBloque = r.pasos.filter(function (p) { return p.tipo === "practica"; })[0];
    Test.assertEqual(primerBloque.habilidad, "escucha");
  });

  Test.test("regla 3: a igual nivel, rota hacia quien lleva más días sin practicar", function () {
    var habilidades = habilidadesBase();
    habilidades.habla.ultimaPractica = "2026-10-01"; // mucho más atrás que las otras
    var r = App.Plan.calcularPlanDelDia({
      diagnosticoHecho: true,
      tarjetasVencidas: 0,
      tarjetasNuevasDisponibles: 0,
      habilidades: habilidades,
      metaMinutosDia: 5,
      fecha: "2026-11-16",
      diaSemana: 1
    });
    var primerBloque = r.pasos.filter(function (p) { return p.tipo === "practica"; })[0];
    Test.assertEqual(primerBloque.habilidad, "habla");
  });

  Test.test("regla 3: no repite la habilidad de ayer si hay otra alternativa con los mismos datos", function () {
    var r = App.Plan.calcularPlanDelDia({
      diagnosticoHecho: true,
      tarjetasVencidas: 0,
      tarjetasNuevasDisponibles: 0,
      habilidades: habilidadesBase(), // las 3 empatadas en nivel y días
      ultimaHabilidadRotada: "lectura", // ganaría por desempate de prioridad si no fuera por esta regla
      metaMinutosDia: 5,
      diaSemana: 1
    });
    var primerBloque = r.pasos.filter(function (p) { return p.tipo === "practica"; })[0];
    Test.assertEqual(primerBloque.habilidad === "lectura", false);
  });

  Test.test("escritura nunca compite por el primer lugar, pero se agrega como bloque extra", function () {
    var r = App.Plan.calcularPlanDelDia({
      diagnosticoHecho: true,
      tarjetasVencidas: 0,
      tarjetasNuevasDisponibles: 0,
      habilidades: habilidadesBase(),
      metaMinutosDia: 10,
      diaSemana: 1
    });
    var escritura = r.pasos.filter(function (p) { return p.habilidad === "escritura"; });
    Test.assertEqual(escritura.length, 1);
    Test.assertEqual(escritura[0].tipo, "practica");
  });

  Test.test("regla 5: el día de conversación configurado agrega el paso, otros días no", function () {
    var base = {
      diagnosticoHecho: true,
      tarjetasVencidas: 0,
      tarjetasNuevasDisponibles: 0,
      habilidades: habilidadesBase(),
      metaMinutosDia: 15,
      diaConversacionSemana: 3
    };
    var conversacionHoy = App.Plan.calcularPlanDelDia(Object.assign({}, base, { diaSemana: 3 }));
    var otroDia = App.Plan.calcularPlanDelDia(Object.assign({}, base, { diaSemana: 1 }));
    Test.assertEqual(conversacionHoy.pasos.some(function (p) { return p.tipo === "conversacion"; }), true);
    Test.assertEqual(otroDia.pasos.some(function (p) { return p.tipo === "conversacion"; }), false);
  });

  Test.test("regla 6: fin de ciclo de 4 semanas agrega mini-reevaluación", function () {
    var r = App.Plan.calcularPlanDelDia({
      diagnosticoHecho: true,
      tarjetasVencidas: 0,
      tarjetasNuevasDisponibles: 0,
      habilidades: habilidadesBase(),
      metaMinutosDia: 15,
      diaSemana: 1,
      semanasDesdeUltimaReevaluacion: 4
    });
    Test.assertEqual(r.pasos[0].tipo, "reevaluacion");
  });

  Test.test("regla 6: antes de las 4 semanas, no hay reevaluación", function () {
    var r = App.Plan.calcularPlanDelDia({
      diagnosticoHecho: true,
      tarjetasVencidas: 0,
      tarjetasNuevasDisponibles: 0,
      habilidades: habilidadesBase(),
      metaMinutosDia: 15,
      diaSemana: 1,
      semanasDesdeUltimaReevaluacion: 2
    });
    Test.assertEqual(r.pasos.some(function (p) { return p.tipo === "reevaluacion"; }), false);
  });

  Test.test("nivel B2+ sin contenido C1/C2: el bloque de práctica reutiliza B2 y queda advertencia", function () {
    var habilidades = habilidadesBase();
    // Las 3 habilidades de rotación en C1 (no solo lectura) para que la regla "rota hacia el
    // nivel más bajo" no descarte a lectura antes de llegar a este caso -- el desempate de
    // prioridad (lectura > habla > escucha) la deja de primera igual.
    habilidades.lectura.nivelCEFR = "C1";
    habilidades.habla.nivelCEFR = "C1";
    habilidades.escucha.nivelCEFR = "C1";
    var r = App.Plan.calcularPlanDelDia({
      diagnosticoHecho: true,
      tarjetasVencidas: 0,
      tarjetasNuevasDisponibles: 0,
      habilidades: habilidades,
      metaMinutosDia: 5,
      diaSemana: 1,
      nivelesConContenido: ["A1", "A2", "B1", "B2"]
    });
    var bloqueLectura = r.pasos.filter(function (p) { return p.habilidad === "lectura"; })[0];
    Test.assertEqual(bloqueLectura.nivelCEFR, "B2");
    Test.assertEqual(r.advertencias.length > 0, true);
  });

  Test.test("el plan es determinista: mismo contexto, mismo resultado", function () {
    var contexto = {
      diagnosticoHecho: true,
      tarjetasVencidas: 8,
      tarjetasNuevasDisponibles: 5,
      habilidades: habilidadesBase(),
      metaMinutosDia: 20,
      diaSemana: 1
    };
    var r1 = App.Plan.calcularPlanDelDia(contexto);
    var r2 = App.Plan.calcularPlanDelDia(contexto);
    Test.assertEqual(JSON.stringify(r1), JSON.stringify(r2));
  });

  // --- armarColaRepaso: topes reales de D26 (regresión: la pantalla tomaba TODAS, "1 / 228") ---
  function nuevaT(id, nivel) {
    return { id: id, nivelCEFR: nivel, repeticiones: 0, intervaloDias: 0, facilidad: 2.5, proximaFecha: "2026-11-19" };
  }
  function vistaT(id, fecha) {
    return { id: id, repeticiones: 2, intervaloDias: 6, facilidad: 2.5, proximaFecha: fecha };
  }
  var AHORA = new Date("2026-11-19T12:00:00");

  Test.test("armarColaRepaso: 228 tarjetas nuevas dan solo 15 (tope por día)", function () {
    var todas = [];
    for (var i = 0; i < 228; i++) todas.push(nuevaT("n" + i, "A2"));
    var r = App.Plan.armarColaRepaso(todas, AHORA, { nivelGlobal: "A2" });
    Test.assertEqual(r.cola.length, 15);
    Test.assertEqual(r.nuevasIncluidas.length, 15);
  });

  Test.test("armarColaRepaso: vencidas topadas en 20, las más atrasadas primero", function () {
    var todas = [];
    for (var i = 0; i < 30; i++) todas.push(vistaT("v" + i, "2026-10-" + (i < 9 ? "0" : "") + (i + 1)));
    var r = App.Plan.armarColaRepaso(todas, AHORA, { nivelGlobal: "B1" });
    Test.assertEqual(r.cola.length, 20);
    Test.assertEqual(r.cola[0].id, "v0");
  });

  Test.test("armarColaRepaso: tarjetas de fecha futura no entran", function () {
    var r = App.Plan.armarColaRepaso([vistaT("futura", "2026-12-01")], AHORA, {});
    Test.assertEqual(r.cola.length, 0);
  });

  Test.test("armarColaRepaso: el cupo del día descuenta las ya introducidas hoy, y las falladas vuelven sin gastar cupo", function () {
    var todas = [];
    for (var i = 0; i < 40; i++) todas.push(nuevaT("n" + i, "A2"));
    var introducidas = ["n0", "n1", "n2", "n3", "n4", "n5", "n6", "n7", "n8", "n9"];
    var r = App.Plan.armarColaRepaso(todas, AHORA, { nivelGlobal: "A2", introducidasHoy: introducidas });
    // 10 ya introducidas (siguen nuevas = falladas) vuelven + 5 de cupo restante = 15
    Test.assertEqual(r.cola.length, 15);
    Test.assertEqual(r.cola[0].id, "n0");
    Test.assertEqual(r.nuevasIncluidas.length, 15);
  });

  Test.test("armarColaRepaso: cupo agotado hoy no mete tarjetas nuevas distintas", function () {
    var todas = [];
    for (var i = 0; i < 40; i++) todas.push(nuevaT("n" + i, "A2"));
    var ids = [];
    for (var j = 0; j < 15; j++) ids.push("n" + j);
    // las 15 ya se aprendieron (ya no son nuevas): solo quedan nuevas "n15.."
    var aprendidas = todas.slice(0, 15).map(function (t) { return vistaT(t.id, "2026-11-25"); });
    var r = App.Plan.armarColaRepaso(aprendidas.concat(todas.slice(15)), AHORA, { nivelGlobal: "A2", introducidasHoy: ids });
    Test.assertEqual(r.cola.length, 0);
  });

  Test.test("armarColaRepaso: las nuevas se ordenan por cercanía al nivel actual (mismo, luego menores, luego mayores)", function () {
    var todas = [nuevaT("c1", "C1"), nuevaT("a1", "A1"), nuevaT("b1", "B1"), nuevaT("a2", "A2"), nuevaT("b2", "B2")];
    var r = App.Plan.armarColaRepaso(todas, AHORA, { nivelGlobal: "B1", topeNuevas: 5 });
    Test.assertEqual(r.cola.map(function (t) { return t.id; }), ["b1", "a2", "a1", "b2", "c1"]);
  });
})();
