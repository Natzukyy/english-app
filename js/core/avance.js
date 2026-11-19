/* App.Avance — nivel de cada habilidad y nivel global en la escala CEFR ABIERTA (A1-C2, sin
   tope en B2), con fracciones (para el marcador "vas aquí" y el "% hacia el siguiente nivel"
   de Inicio/Progreso). Lógica pura, sin DOM.

   Separado de App.Diagnostico a propósito: el diagnóstico real (construirResultado/
   evaluarHabilidad) se queda EXACTAMENTE como está (mide hasta B2, es una herramienta de
   evaluación de una sola pasada, PROMPT_BASE.md lo trata como evaluación, no como progreso
   continuo) -- este módulo es la vista más amplia y continua del avance, que combina ese
   resultado con reevaluaciones y desempeño reciente, pero nunca modifica cómo califica el
   diagnóstico en sí.

   Qué SÍ decide este módulo: cómo convertir (nivel CEFR, % de avance dentro de ese nivel) en
   un número continuo en la escala A1=0..C2=5, y cómo combinar los números de varias
   habilidades en un nivel global ponderado. Qué NO decide: de dónde sale ese "% de avance
   dentro del nivel" para una habilidad en un momento dado (eso depende de qué datos reales
   haya -- diagnóstico, reevaluación, racha de aciertos en repaso -- y es responsabilidad de
   quien llama a este módulo, típicamente App.Datos o la pantalla). */
(function (global) {
  "use strict";

  var ORDEN_NIVELES = ["A1", "A2", "B1", "B2", "C1", "C2"];

  // Pesos del promedio ponderado del nivel global: lectura > habla > escritura > escucha,
  // seguro el orden de prioridad de PROMPT_BASE.md ("leer, hablar y escuchar, en ese orden de
  // peso con énfasis en hablar"; escritura "también débil", así que pesa más que escucha,
  // nunca menos -- es una decisión mía, PROMPT_BASE.md no da un peso relativo exacto entre
  // escritura y escucha, solo dice que ambas son débiles).
  var PESOS_HABILIDAD = { lectura: 3, habla: 2.5, escritura: 2, escucha: 1.5 };

  function indiceNivel(nivelCEFR) {
    var i = ORDEN_NIVELES.indexOf(nivelCEFR);
    return i === -1 ? 0 : i;
  }

  /** Convierte (nivel, % de avance 0-100 dentro de ese nivel) a un número continuo en la
   * escala abierta (A1=0 .. C2=5, con fracciones). En C2 (el techo) no hay "siguiente nivel"
   * -- el número se queda exactamente en el índice de C2, sin fracción. */
  function numeroDesdeNivel(nivelCEFR, porcentajeDentroDelNivel) {
    var idx = indiceNivel(nivelCEFR);
    if (idx >= ORDEN_NIVELES.length - 1) return idx;
    var frac = Math.max(0, Math.min(100, porcentajeDentroDelNivel || 0)) / 100;
    return idx + frac;
  }

  /** Inverso de numeroDesdeNivel: a partir de un número continuo, el nivel CEFR, el % de
   * avance hacia el siguiente nivel, y cuál es ese siguiente nivel (null en C2, el techo). */
  function nivelDesdeNumero(numero) {
    var max = ORDEN_NIVELES.length - 1;
    var n = Math.max(0, Math.min(max, numero || 0));
    var idx = Math.floor(n);
    if (idx >= max) {
      return { nivel: ORDEN_NIVELES[max], porcentajeHaciaSiguiente: 100, siguienteNivel: null };
    }
    var frac = n - idx;
    return {
      nivel: ORDEN_NIVELES[idx],
      porcentajeHaciaSiguiente: Math.round(frac * 100),
      siguienteNivel: ORDEN_NIVELES[idx + 1]
    };
  }

  /** Nivel global ponderado a partir de los números continuos (ya calculados con
   * numeroDesdeNivel) de cada habilidad. Habilidades ausentes del objeto simplemente no
   * cuentan en el promedio -- no se asume 0 para una habilidad sin datos todavía. */
  function calcularNivelGlobal(numerosPorHabilidad) {
    var datos = numerosPorHabilidad || {};
    var sumaPonderada = 0;
    var sumaPesos = 0;
    Object.keys(PESOS_HABILIDAD).forEach(function (habilidad) {
      if (typeof datos[habilidad] !== "number") return;
      sumaPonderada += datos[habilidad] * PESOS_HABILIDAD[habilidad];
      sumaPesos += PESOS_HABILIDAD[habilidad];
    });
    if (sumaPesos === 0) return nivelDesdeNumero(0);
    return nivelDesdeNumero(sumaPonderada / sumaPesos);
  }

  /** Nivel "efectivo" de contenido a usar cuando el nivel real de una habilidad no tiene
   * contenido disponible todavía (p. ej. Alex llega a C1 pero el contenido llega hasta B2) --
   * reutiliza el nivel con contenido más alto disponible, nunca inventa contenido. Devuelve
   * también si hubo que hacer la sustitución, para que quien llama pueda avisarlo. */
  function nivelEfectivoConContenido(nivelCEFR, nivelesConContenido) {
    var disponibles = nivelesConContenido && nivelesConContenido.length ? nivelesConContenido : ORDEN_NIVELES;
    if (disponibles.indexOf(nivelCEFR) !== -1) {
      return { nivel: nivelCEFR, sustituido: false };
    }
    // El más alto disponible que no se pase del nivel real (si el real es más bajo que todo
    // lo disponible, usa el más bajo disponible -- no debería pasar en la práctica, pero no
    // se rompe si pasa).
    var idxReal = indiceNivel(nivelCEFR);
    var mejor = disponibles[0];
    disponibles.forEach(function (nivel) {
      if (indiceNivel(nivel) <= idxReal && indiceNivel(nivel) > indiceNivel(mejor)) mejor = nivel;
    });
    return { nivel: mejor, sustituido: mejor !== nivelCEFR };
  }

  /** Niveles CEFR distintos que aparecen en una lista de contenido ({nivelCEFR}), en orden
   * A1..C2. Sirve para decirle al plan qué niveles tienen contenido REAL. */
  function nivelesDisponibles(lista) {
    var vistos = {};
    (lista || []).forEach(function (item) {
      if (item && item.nivelCEFR) vistos[item.nivelCEFR] = true;
    });
    return ORDEN_NIVELES.filter(function (nivel) {
      return vistos[nivel];
    });
  }

  /** Elige un elemento de `lista` para `nivel`: del mismo nivel si hay; si no, del nivel más
   * cercano POR DEBAJO (nunca un texto de B2 para quien está en A1); si no hay nada por
   * debajo, del más bajo disponible. `aleatorio` (opcional, 0..1) permite pruebas
   * deterministas. Devuelve null si la lista está vacía. */
  function elegirPorNivel(lista, nivel, aleatorio) {
    if (!lista || !lista.length) return null;
    var niveles = nivelesDisponibles(lista);
    var objetivo;
    if (!niveles.length) {
      objetivo = null;
    } else if (niveles.indexOf(nivel) !== -1) {
      objetivo = nivel;
    } else {
      var idx = indiceNivel(nivel);
      objetivo = niveles[0];
      niveles.forEach(function (n) {
        if (indiceNivel(n) <= idx) objetivo = n;
      });
    }
    var candidatas = objetivo
      ? lista.filter(function (item) {
          return item.nivelCEFR === objetivo;
        })
      : lista;
    var r = typeof aleatorio === "number" ? aleatorio : Math.random();
    return candidatas[Math.min(candidatas.length - 1, Math.floor(r * candidatas.length))];
  }

  global.App = global.App || {};
  global.App.Avance = {
    nivelesDisponibles: nivelesDisponibles,
    elegirPorNivel: elegirPorNivel,
    ORDEN_NIVELES: ORDEN_NIVELES,
    indiceNivel: indiceNivel,
    numeroDesdeNivel: numeroDesdeNivel,
    nivelDesdeNumero: nivelDesdeNumero,
    calcularNivelGlobal: calcularNivelGlobal,
    nivelEfectivoConContenido: nivelEfectivoConContenido
  };
})(typeof window !== "undefined" ? window : globalThis);
