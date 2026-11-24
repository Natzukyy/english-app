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

  var HABILIDADES_DE_BANCO = ["lectura", "escucha", "vocabulario_gramatica"];

  /** Etiqueta para MOSTRAR un nivel. Spec de Alex: un resultado "B2 completo" del diagnóstico
   * se muestra como "B2+" (no es un tope: el motor ya cuenta C1/C2). Solo aplica a las
   * habilidades medidas con el banco de preguntas (el B2 de habla/escritura es una
   * autoevaluación, no "completo"). */
  function etiquetaNivel(nivelCEFR, habilidad) {
    if (nivelCEFR === "B2" && HABILIDADES_DE_BANCO.indexOf(habilidad) !== -1) return "B2+";
    return nivelCEFR;
  }

  /** Ancho (0-100) de una barra de habilidad en la escala abierta A1..C2 (A1 = 0%, C2 = 100%). */
  function porcentajeEnEscala(nivelCEFR, porcentajeDentroDelNivel) {
    var n = numeroDesdeNivel(nivelCEFR, typeof porcentajeDentroDelNivel === "number" ? porcentajeDentroDelNivel : 0);
    return Math.max(0, Math.min(100, Math.round((n / 5) * 100)));
  }

  // ---------------------------------------------------------------------------------------
  // AVANCE CONTINUO POR HABILIDAD (D29). Todas las constantes editables viven aquí, en UN solo
  // lugar; nada más del proyecto repite estos números.
  // ---------------------------------------------------------------------------------------
  var CONSTANTES = {
    VENTANA_RESPUESTAS: 30, // tamaño de la ventana móvil por defecto (en "peso": 1 respuesta normal = 1)
    // Excepciones por habilidad (D35): escritura llena su barra con 10 consignas, no 30 (30
    // textos escritos no es razonable). Las demás habilidades usan VENTANA_RESPUESTAS.
    VENTANA_POR_HABILIDAD: { escritura: 10 },
    PESO_RESPUESTA: 1, // peso normal de una respuesta en la ventana (escritura ya no pesa media)
    ACIERTO_OBJETIVO: 0.8, // promedio de la ventana con el que la fracción llega a 100 %
    CONFIRMACION_APRUEBA: 0.7, // % mínimo para aprobar la confirmación
    CONFIRMACION_MIN_PREGUNTAS: 8, // una confirmación con menos preguntas no vale
    CONFIRMACION_PREGUNTAS: 10, // cuántas se presentan (>= mínimo)
    CONFIRMACION_REINTENTO_DIAS: 7, // espera tras no aprobar
    CONFIRMACION_RETENIDAS: 15, // respuestas que se conservan al no aprobar
    MINUTOS_CONFIRMACION: 10, // duración estimada del paso del plan
    MAX_CONFIRMACIONES_POR_DIA: 1,
    PORCENTAJE_LISTA_PARA_CONFIRMAR: 99 // lo que se ve mientras espera confirmación
  };

  var HABILIDADES_AVANCE = ["lectura", "escucha", "habla", "escritura"];

  /** Tamaño de la ventana de una habilidad (por defecto, VENTANA_RESPUESTAS). */
  function ventanaDe(habilidad) {
    var v = habilidad && CONSTANTES.VENTANA_POR_HABILIDAD[habilidad];
    return typeof v === "number" && v > 0 ? v : CONSTANTES.VENTANA_RESPUESTAS;
  }

  /** Ventana guardada -> ventana válida para la habilidad: para las que tienen tamaño propio,
   * pesos normales y solo las últimas N (migración desde hey-3, donde escritura guardaba hasta
   * 60 respuestas de peso 0.5). */
  function normalizarVentana(ventana, habilidad) {
    var v = (ventana || []).slice();
    if (habilidad && CONSTANTES.VENTANA_POR_HABILIDAD[habilidad]) {
      v = v.map(function (r) {
        return { v: r.v, w: CONSTANTES.PESO_RESPUESTA };
      });
      v = v.slice(-ventanaDe(habilidad));
    }
    return v;
  }

  function estadoHabilidadVacio(nivel, habilidad) {
    return { habilidad: habilidad || null, nivel: nivel || "A1", ventana: [], listaParaConfirmar: false, listaDesde: null, ultimoFallo: null };
  }

  function pesoTotal(ventana) {
    return (ventana || []).reduce(function (suma, r) {
      return suma + r.w;
    }, 0);
  }

  /** Recorta la ventana quitando las respuestas MÁS VIEJAS hasta que su peso total sea <= tope. */
  function recortarVentana(ventana, tope) {
    var v = (ventana || []).slice();
    while (v.length > 1 && pesoTotal(v) > tope + 1e-9) v.shift();
    if (v.length === 1 && v[0].w > tope) v = [];
    return v;
  }

  /** Agrega una respuesta puntuada (valor 0..1, peso >0) y recorta a la ventana de la habilidad
   * (30 por defecto, 10 en escritura). No muta. */
  function agregarRespuesta(ventana, valor, peso, habilidad) {
    var w = typeof peso === "number" && peso > 0 ? peso : 1;
    var v = Math.max(0, Math.min(1, Number(valor) || 0));
    return recortarVentana((ventana || []).concat([{ v: v, w: w }]), ventanaDe(habilidad));
  }

  /** n = peso total de la ventana, aciertos = promedio ponderado,
   * fraccion = min(1, n/ventana) * min(1, aciertos/0.80). */
  function resumenVentana(ventana, habilidad) {
    var n = pesoTotal(ventana);
    if (n <= 0) return { n: 0, aciertos: 0, fraccion: 0 };
    var suma = (ventana || []).reduce(function (s, r) {
      return s + r.v * r.w;
    }, 0);
    var aciertos = suma / n;
    var fraccion = Math.min(1, n / ventanaDe(habilidad)) * Math.min(1, aciertos / CONSTANTES.ACIERTO_OBJETIVO);
    return { n: n, aciertos: aciertos, fraccion: fraccion };
  }

  /** % (entero 0-100) hacia el siguiente nivel que se MUESTRA: nunca 100 -- al llegar queda en
   * 99 hasta confirmar. En C2 (techo) no aplica: 100. */
  function porcentajeDeHabilidad(estado) {
    if (indiceNivel(estado.nivel) >= ORDEN_NIVELES.length - 1) return 100;
    if (estado.listaParaConfirmar) return CONSTANTES.PORCENTAJE_LISTA_PARA_CONFIRMAR;
    var pct = Math.floor(resumenVentana(estado.ventana, estado.habilidad).fraccion * 100 + 1e-9);
    return Math.min(CONSTANTES.PORCENTAJE_LISTA_PARA_CONFIRMAR, pct);
  }

  /** Número continuo (A1=0..C2=5) de una habilidad, con su fracción real (reemplaza el 50 fijo). */
  function numeroDeHabilidad(estado) {
    return numeroDesdeNivel(estado.nivel, porcentajeDeHabilidad(estado));
  }

  /** Nivel global con los números continuos reales de cada habilidad (mismos pesos de siempre). */
  function calcularNivelGlobalDesdeEstados(estados) {
    var numeros = {};
    HABILIDADES_AVANCE.forEach(function (h) {
      if (estados && estados[h]) numeros[h] = numeroDeHabilidad(estados[h]);
    });
    return calcularNivelGlobal(numeros);
  }

  /** Qué le falta a una habilidad para su siguiente nivel, para el texto de la interfaz:
   * { tipo: "lista"|"faltan"|"aciertos"|"nada"|"techo", faltan } */
  function textoDeFalta(estado) {
    if (indiceNivel(estado.nivel) >= ORDEN_NIVELES.length - 1) return { tipo: "techo", faltan: 0 };
    if (estado.listaParaConfirmar) return { tipo: "lista", faltan: 0 };
    var r = resumenVentana(estado.ventana, estado.habilidad);
    var tam = ventanaDe(estado.habilidad);
    if (r.n <= 0) return { tipo: "nada", faltan: tam };
    if (r.n < tam) return { tipo: "faltan", faltan: Math.ceil(tam - r.n - 1e-9) };
    return { tipo: "aciertos", faltan: 0 };
  }

  /** Clave i18n del "Faltan N ..." de una habilidad (escritura cuenta consignas, no respuestas). */
  function claveFalta(estado, faltan) {
    var consignas = estado && estado.habilidad === "escritura";
    if (faltan === 1) return consignas ? "avance.falta_una_consigna" : "avance.falta_una";
    return consignas ? "avance.faltan_n_consignas" : "avance.faltan_n";
  }

  /** Registra una respuesta puntuada en el estado de una habilidad. Si con ella la fracción
   * llega a 100 %, queda "lista para confirmar" (se muestra 99 %). No muta; devuelve
   * { estado, quedoLista } (quedoLista = true solo en el momento en que pasa a estar lista). */
  function registrarRespuestaEnEstado(estado, valor, peso, hoyISO) {
    var nuevo = Object.assign({}, estado, { ventana: agregarRespuesta(estado.ventana, valor, peso, estado.habilidad) });
    var quedoLista = false;
    var techo = indiceNivel(nuevo.nivel) >= ORDEN_NIVELES.length - 1;
    if (!techo && !nuevo.listaParaConfirmar && resumenVentana(nuevo.ventana, nuevo.habilidad).fraccion >= 1 - 1e-9) {
      nuevo.listaParaConfirmar = true;
      nuevo.listaDesde = hoyISO || null;
      quedoLista = true;
    }
    return { estado: nuevo, quedoLista: quedoLista };
  }

  function diasEntre(desdeISO, hastaISO) {
    var a = new Date(desdeISO + "T12:00:00");
    var b = new Date(hastaISO + "T12:00:00");
    return Math.round((b - a) / 86400000);
  }

  /** ¿Toca hacer la confirmación ahora? Lista para confirmar, no en C2, y (si falló antes)
   * pasaron al menos 7 días desde ese intento. */
  function puedeConfirmar(estado, hoyISO) {
    if (!estado || !estado.listaParaConfirmar) return false;
    if (indiceNivel(estado.nivel) >= ORDEN_NIVELES.length - 1) return false;
    if (estado.ultimoFallo && diasEntre(estado.ultimoFallo, hoyISO) < CONSTANTES.CONFIRMACION_REINTENTO_DIAS) return false;
    return true;
  }

  /** Cuándo (ISO) se puede reintentar tras un fallo; null si no hay fallo registrado. */
  function fechaReintento(estado) {
    if (!estado || !estado.ultimoFallo) return null;
    var d = new Date(estado.ultimoFallo + "T12:00:00");
    d.setDate(d.getDate() + CONSTANTES.CONFIRMACION_REINTENTO_DIAS);
    var m = d.getMonth() + 1;
    var dia = d.getDate();
    return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (dia < 10 ? "0" : "") + dia;
  }

  function siguienteNivelDe(nivel) {
    var i = indiceNivel(nivel);
    return i >= ORDEN_NIVELES.length - 1 ? null : ORDEN_NIVELES[i + 1];
  }

  /** Califica una confirmación: aprueba con >= 70 % y al menos 8 preguntas contestadas. */
  function evaluarConfirmacion(correctasPonderadas, total) {
    var t = Number(total) || 0;
    if (t < CONSTANTES.CONFIRMACION_MIN_PREGUNTAS) return { valida: false, aprobada: false, porcentaje: 0 };
    var p = (Number(correctasPonderadas) || 0) / t;
    return { valida: true, aprobada: p + 1e-9 >= CONSTANTES.CONFIRMACION_APRUEBA, porcentaje: Math.round(p * 100) };
  }

  /** Aplica el resultado de una confirmación: aprobada -> sube un nivel, ventana vacía;
   * no aprobada -> conserva las últimas 15 respuestas y anota la fecha del intento
   * (reintento a los 7 días). Una confirmación inválida no cambia nada. */
  function aplicarConfirmacion(estado, resultado, hoyISO) {
    if (!resultado || !resultado.valida) return { estado: estado, subio: false };
    if (resultado.aprobada) {
      var siguiente = siguienteNivelDe(estado.nivel);
      if (!siguiente) return { estado: estado, subio: false };
      return { estado: { habilidad: estado.habilidad || null, nivel: siguiente, ventana: [], listaParaConfirmar: false, listaDesde: null, ultimoFallo: null }, subio: true };
    }
    return {
      estado: Object.assign({}, estado, {
        ventana: recortarVentana(estado.ventana, CONSTANTES.CONFIRMACION_RETENIDAS),
        listaParaConfirmar: false,
        listaDesde: null,
        ultimoFallo: hoyISO || null
      }),
      subio: false
    };
  }

  /** Mini-reevaluación general (cada 4 semanas): puede subir o confirmar, NUNCA bajar.
   * accion: "sube" | "confirma" | "repasa" (salió más bajo: el nivel no cambia). */
  function aplicarReevaluacion(estado, nivelMedido) {
    var actual = indiceNivel(estado.nivel);
    var medido = indiceNivel(nivelMedido);
    if (medido > actual) {
      return { estado: { habilidad: estado.habilidad || null, nivel: nivelMedido, ventana: [], listaParaConfirmar: false, listaDesde: null, ultimoFallo: null }, accion: "sube" };
    }
    return { estado: estado, accion: medido === actual ? "confirma" : "repasa" };
  }

  global.App = global.App || {};
  global.App.Avance = {
    etiquetaNivel: etiquetaNivel,
    porcentajeEnEscala: porcentajeEnEscala,
    nivelesDisponibles: nivelesDisponibles,
    elegirPorNivel: elegirPorNivel,
    ORDEN_NIVELES: ORDEN_NIVELES,
    indiceNivel: indiceNivel,
    numeroDesdeNivel: numeroDesdeNivel,
    nivelDesdeNumero: nivelDesdeNumero,
    calcularNivelGlobal: calcularNivelGlobal,
    nivelEfectivoConContenido: nivelEfectivoConContenido,
    CONSTANTES: CONSTANTES,
    HABILIDADES_AVANCE: HABILIDADES_AVANCE,
    estadoHabilidadVacio: estadoHabilidadVacio,
    ventanaDe: ventanaDe,
    normalizarVentana: normalizarVentana,
    agregarRespuesta: agregarRespuesta,
    resumenVentana: resumenVentana,
    porcentajeDeHabilidad: porcentajeDeHabilidad,
    numeroDeHabilidad: numeroDeHabilidad,
    calcularNivelGlobalDesdeEstados: calcularNivelGlobalDesdeEstados,
    textoDeFalta: textoDeFalta,
    claveFalta: claveFalta,
    registrarRespuestaEnEstado: registrarRespuestaEnEstado,
    puedeConfirmar: puedeConfirmar,
    fechaReintento: fechaReintento,
    siguienteNivelDe: siguienteNivelDe,
    evaluarConfirmacion: evaluarConfirmacion,
    aplicarConfirmacion: aplicarConfirmacion,
    aplicarReevaluacion: aplicarReevaluacion
  };
})(typeof window !== "undefined" ? window : globalThis);
