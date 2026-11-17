/* App.Diagnostico — motor de evaluación por habilidad. Lógica pura, sin DOM.
   Lectura/escucha/vocabulario_gramatica: banco de opción múltiple, se sube de nivel mientras
   el acierto en cada nivel CEFR supere el umbral (en orden A2 -> B1 -> B2 -> C1).
   Habla/escritura: autoevaluación (el usuario elige el nivel que mejor lo describe), por eso
   no hay función de "evaluar" para esas dos, solo de construir el resultado final. */
(function (global) {
  "use strict";

  var ORDEN_NIVELES = ["A2", "B1", "B2", "C1"];
  var INDICE_NIVEL = { A2: 0, B1: 1, B2: 2, C1: 3 };
  var UMBRAL_ACIERTO = 0.6; // provisional, revisar:true

  /**
   * @param {Array} preguntasHabilidad  preguntas de una sola habilidad (lectura/escucha/vocabulario_gramatica)
   * @param {Object<string, number>} respuestas  { idPregunta: indiceElegido }
   * @returns {string} nivel CEFR estimado ("A2".."C1")
   */
  function evaluarHabilidad(preguntasHabilidad, respuestas) {
    var nivelEstimado = "A2"; // piso de la app: no evalúa por debajo de A2
    for (var i = 0; i < ORDEN_NIVELES.length; i++) {
      var nivel = ORDEN_NIVELES[i];
      var preguntasNivel = preguntasHabilidad.filter(function (p) {
        return p.nivelCEFR === nivel;
      });
      if (preguntasNivel.length === 0) continue; // sin preguntas de este nivel: no cambia la estimación

      var correctas = 0;
      preguntasNivel.forEach(function (p) {
        if (respuestas[p.id] === p.respuestaCorrecta) correctas++;
      });
      var porcentaje = correctas / preguntasNivel.length;

      if (porcentaje >= UMBRAL_ACIERTO) {
        nivelEstimado = nivel;
      } else {
        break; // no sigue subiendo si no pasa el umbral de este nivel
      }
    }
    return nivelEstimado;
  }

  /** % de avance hacia B2 (B2 = 100%, A2 = 0%). Si ya es C1, se queda topado en 100%. */
  function porcentajeHaciaB2(nivelEstimado) {
    var idx = INDICE_NIVEL[nivelEstimado];
    var idxB2 = INDICE_NIVEL.B2;
    if (typeof idx !== "number") return 0;
    return Math.min(100, Math.round((idx / idxB2) * 100));
  }

  /**
   * Arma el resultado completo del diagnóstico: nivel estimado por habilidad (las 3 de banco
   * de preguntas) + los niveles autoevaluados de habla/escritura + % hacia B2 de cada una.
   * @param {Array} banco  todas las preguntas (banco.json)
   * @param {Object<string, number>} respuestasBanco  respuestas a las preguntas de opción múltiple
   * @param {{habla:string, escritura:string}} autoevaluacion  nivel CEFR elegido por el usuario
   * @param {Date} ahora
   */
  function construirResultado(banco, respuestasBanco, autoevaluacion, ahora) {
    var habilidadesBanco = ["lectura", "escucha", "vocabulario_gramatica"];
    var porHabilidad = {};

    habilidadesBanco.forEach(function (habilidad) {
      var preguntas = banco.filter(function (p) {
        return p.habilidad === habilidad;
      });
      var nivel = evaluarHabilidad(preguntas, respuestasBanco || {});
      porHabilidad[habilidad] = { nivelCEFR: nivel, porcentajeHaciaB2: porcentajeHaciaB2(nivel) };
    });

    ["habla", "escritura"].forEach(function (habilidad) {
      var nivel = (autoevaluacion && autoevaluacion[habilidad]) || "A2";
      porHabilidad[habilidad] = { nivelCEFR: nivel, porcentajeHaciaB2: porcentajeHaciaB2(nivel), autoevaluado: true };
    });

    return {
      fecha: global.App.Fecha ? global.App.Fecha.hoyISO(ahora) : null,
      porHabilidad: porHabilidad
    };
  }

  global.App = global.App || {};
  global.App.Diagnostico = {
    ORDEN_NIVELES: ORDEN_NIVELES,
    UMBRAL_ACIERTO: UMBRAL_ACIERTO,
    evaluarHabilidad: evaluarHabilidad,
    porcentajeHaciaB2: porcentajeHaciaB2,
    construirResultado: construirResultado
  };
})(typeof window !== "undefined" ? window : globalThis);
