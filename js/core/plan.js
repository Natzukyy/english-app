/* App.Plan — calcula la ruta guiada del día: una lista ordenada de pasos que la app le dice
   a Alex que haga, sin que él tenga que elegir qué estudiar (ver CLAUDE.md: "la app le dice a
   Alex qué estudiar hoy, en orden"). Lógica pura, sin DOM ni IndexedDB -- App.Datos arma el
   "contexto" leyendo el estado real y llama a calcularPlanDelDia(contexto); el plan resultante
   se guarda tal cual (ver D-calcomanias en DECISIONES.md: el plan es determinista, se calcula
   una vez por día y no cambia aunque se recargue la página).

   Esta función NO elige contenido específico (qué lectura, qué tarjetas exactas) -- eso lo
   hace cada pantalla al empezar su paso, igual que ya hacía habla.js con
   elegirEjercicioAlAzar(). Lo único que sí trae IDs resueltos aquí es el repaso: el tope de
   tarjetas vencidas/nuevas de la sesión es una decisión de ESTE módulo (regla de negocio del
   plan), así que el paso de repaso incluye cuántas de cada una le tocan hoy. */
(function (global) {
  "use strict";

  var TOPE_TARJETAS_VENCIDAS_POR_SESION = 20; // tope real: antes una sesión podía traer 115 tarjetas de golpe
  var TOPE_TARJETAS_NUEVAS_POR_DIA = 15;
  var MINUTOS_POR_TARJETA = 0.5; // estimación para dimensionar el bloque de repaso (2 tarjetas/minuto)

  // Orden de prioridad de PROMPT_BASE.md: "leer, hablar y escuchar, en ese orden de peso con
  // énfasis en hablar". Escritura queda FUERA de esta rotación a propósito -- se agrega aparte
  // como bloque de relleno ("cada vez que haya tiempo", ver REGLA 3 abajo), no compite por el
  // primer lugar del día con las 3 habilidades principales.
  var HABILIDADES_ROTACION = ["lectura", "habla", "escucha"];

  var MINUTOS_BLOQUE_HABILIDAD = 10;
  var MINUTOS_CONVERSACION = 15;
  var MINUTOS_REEVALUACION = 10;
  var TOPE_BLOQUES_ROTACION = 6; // nunca generar un plan absurdo aunque la meta diaria sea enorme
  var DIA_CONVERSACION_DEFECTO = 3; // miércoles (0=domingo, ver Date#getDay), configurable por llamada
  var SEMANAS_ENTRE_REEVALUACION_DEFECTO = 4;

  function paso(tipo, habilidad, descripcion, minutos, extra) {
    var p = { tipo: tipo, habilidad: habilidad || null, descripcion: descripcion, minutos: minutos };
    if (extra) Object.keys(extra).forEach(function (k) { p[k] = extra[k]; });
    return p;
  }

  /** Paso "Confirma tu nivel de <habilidad>" (D29): mini-reevaluación SOLO de esa habilidad con
   * preguntas del nivel siguiente. */
  function pasoConfirmacion(habilidad, nivelActual, nivelObjetivo) {
    return paso("confirmacion", habilidad, "Confirma tu nivel de " + habilidad, global.App.Avance.CONSTANTES.MINUTOS_CONFIRMACION, {
      nivelCEFR: nivelObjetivo,
      nivelActual: nivelActual
    });
  }

  function sumaMinutos(pasos) {
    return pasos.reduce(function (total, p) { return total + p.minutos; }, 0);
  }

  function calcularMinutosRepaso(tarjetasVencidas, tarjetasNuevas) {
    return Math.max(1, Math.ceil((tarjetasVencidas + tarjetasNuevas) * MINUTOS_POR_TARJETA));
  }

  function indiceNivel(nivelCEFR) {
    return global.App.Avance ? global.App.Avance.indiceNivel(nivelCEFR) : 0;
  }

  function diasSinPractica(ultimaPracticaISO, hoyISO) {
    if (!ultimaPracticaISO) return Infinity; // nunca practicada: la prioridad más alta posible
    return global.App.Fecha.diferenciaDias(ultimaPracticaISO, hoyISO);
  }

  /** Ordena las 3 habilidades de rotación: nivel CEFR más bajo primero, luego más días sin
   * practicar, con el orden de PROMPT_BASE.md (lectura/habla/escucha) como desempate final.
   * Si la primera opción resultante es la misma que se usó ayer Y hay otra alternativa, se
   * mueve al final (regla 3: "que no repita lo mismo dos días seguidos") -- si solo queda una
   * opción con datos reales, repetir es inevitable y está bien. */
  function ordenarHabilidadesPorPrioridad(habilidades, ultimaHabilidadRotada, hoyISO) {
    var datos = habilidades || {};
    var candidatas = HABILIDADES_ROTACION.map(function (habilidad, prioridadBase) {
      var info = datos[habilidad] || {};
      return {
        habilidad: habilidad,
        nivelIdx: indiceNivel(info.nivelCEFR),
        dias: diasSinPractica(info.ultimaPractica, hoyISO),
        prioridadBase: prioridadBase
      };
    });
    candidatas.sort(function (a, b) {
      if (a.nivelIdx !== b.nivelIdx) return a.nivelIdx - b.nivelIdx;
      if (a.dias !== b.dias) return b.dias - a.dias;
      return a.prioridadBase - b.prioridadBase;
    });
    var orden = candidatas.map(function (c) { return c.habilidad; });
    if (orden.length > 1 && orden[0] === ultimaHabilidadRotada) {
      orden.push(orden.shift());
    }
    return orden;
  }

  /**
   * @param {object} contexto
   * @param {string} contexto.fecha YYYY-MM-DD, el día para el que se calcula el plan
   * @param {boolean} contexto.diagnosticoHecho
   * @param {number} contexto.tarjetasVencidas cuántas tarjetas SM-2 están vencidas hoy (antes del tope)
   * @param {number} contexto.tarjetasNuevasDisponibles cuántas tarjetas nuevas hay para introducir (antes del tope)
   * @param {object} contexto.habilidades { lectura:{nivelCEFR,ultimaPractica}, habla:{...}, escucha:{...}, escritura:{...} } -- ultimaPractica es YYYY-MM-DD o null
   * @param {number} contexto.metaMinutosDia
   * @param {string|null} contexto.ultimaHabilidadRotada qué habilidad de HABILIDADES_ROTACION se usó el día anterior (para no repetir)
   * @param {number} [contexto.diaSemana] 0-6 (Date#getDay); si falta, se calcula de "fecha"
   * @param {number} [contexto.diaConversacionSemana] default miércoles
   * @param {number} [contexto.semanasDesdeUltimaReevaluacion] default 0 (nunca se reevalúa si falta)
   * @param {number} [contexto.semanasEntreReevaluacion] default 4
   * @param {Array<{habilidad,nivelActual,nivelObjetivo}>} [contexto.confirmaciones] habilidades listas para confirmar hoy
   * @param {Array<string>} [contexto.nivelesConContenido] niveles CEFR con contenido real disponible; default: todos
   * @returns {{pasos: Array, totalMinutos: number, advertencias: Array<string>}}
   */
  function calcularPlanDelDia(contexto) {
    var c = contexto || {};
    var metaMinutosDia = c.metaMinutosDia || 15;

    if (!c.diagnosticoHecho) {
      var minutosDiagnostico = Math.max(metaMinutosDia, 15);
      return {
        pasos: [paso("diagnostico", null, "Diagnóstico de nivel", minutosDiagnostico)],
        totalMinutos: minutosDiagnostico,
        advertencias: []
      };
    }

    var pasos = [];
    var advertencias = [];
    var Avance = global.App.Avance;
    var nivelesConContenido = c.nivelesConContenido && c.nivelesConContenido.length ? c.nivelesConContenido : Avance.ORDEN_NIVELES;

    // Regla 6: mini-reevaluación cada N semanas (configurable, default 4).
    var semanasEntreReevaluacion = c.semanasEntreReevaluacion || SEMANAS_ENTRE_REEVALUACION_DEFECTO;
    if ((c.semanasDesdeUltimaReevaluacion || 0) >= semanasEntreReevaluacion) {
      pasos.push(paso("reevaluacion", null, "Mini-reevaluación de nivel", MINUTOS_REEVALUACION));
    }

    // Confirmación de nivel (D29): una habilidad "lista para confirmar" agrega su paso en las
    // siguientes 24 h, sin esperar las 4 semanas. Máximo N por día (constante en App.Avance) y
    // ninguna el mismo día de una reevaluación general (esa ya verifica todas las habilidades).
    var hayReevaluacion = pasos.some(function (p) {
      return p.tipo === "reevaluacion";
    });
    var confirmacionesDeHoy = [];
    if (!hayReevaluacion) {
      (c.confirmaciones || []).slice(0, Avance.CONSTANTES.MAX_CONFIRMACIONES_POR_DIA).forEach(function (conf) {
        confirmacionesDeHoy.push(pasoConfirmacion(conf.habilidad, conf.nivelActual, conf.nivelObjetivo));
      });
    }

    // Regla 2 + 7: repaso SM-2 primero, con tope -- las vencidas de un atraso grande ya caben
    // en el tope de la sesión normal, así que un atraso no genera un plan especial ("no
    // acumular atrasos": el plan de hoy es el plan de hoy, el tope ya absorbe lo atrasado).
    var tarjetasVencidas = Math.min(c.tarjetasVencidas || 0, TOPE_TARJETAS_VENCIDAS_POR_SESION);
    var tarjetasNuevas = Math.min(c.tarjetasNuevasDisponibles || 0, TOPE_TARJETAS_NUEVAS_POR_DIA);
    if (tarjetasVencidas + tarjetasNuevas > 0) {
      pasos.push(
        paso("repaso", null, "Repaso de tarjetas", calcularMinutosRepaso(tarjetasVencidas, tarjetasNuevas), {
          tarjetasVencidas: tarjetasVencidas,
          tarjetasNuevas: tarjetasNuevas
        })
      );
    }

    confirmacionesDeHoy.forEach(function (p) {
      pasos.push(p);
    });

    function nivelEfectivo(habilidad) {
      var nivelReal = (c.habilidades && c.habilidades[habilidad] && c.habilidades[habilidad].nivelCEFR) || "A1";
      var resultado = Avance.nivelEfectivoConContenido(nivelReal, nivelesConContenido);
      if (resultado.sustituido) {
        advertencias.push("Sin contenido de " + nivelReal + " para " + habilidad + " todavía -- se reutiliza " + resultado.nivel + ".");
      }
      return resultado.nivel;
    }

    // Regla 3: bloques por habilidad, rotando hacia la de menor nivel / más días sin
    // practicar, hasta llenar la meta diaria (regla 4: "si la meta es mayor, añade bloques").
    var hoyISO = c.fecha || global.App.Fecha.hoyISO();
    var orden = ordenarHabilidadesPorPrioridad(c.habilidades, c.ultimaHabilidadRotada, hoyISO);
    var bloquesAgregados = 0;
    // SIEMPRE al menos un bloque de habilidad (lectura/habla/escucha): con muchas tarjetas el
    // repaso solo (hasta 18 min) ya llena una meta de 15 y las habilidades prioritarias de Alex
    // nunca entraban al plan. Decisión: el repaso no puede desplazar la práctica de habilidades.
    while ((sumaMinutos(pasos) < metaMinutosDia || bloquesAgregados < 1) && bloquesAgregados < TOPE_BLOQUES_ROTACION) {
      var habilidad = orden[bloquesAgregados % orden.length];
      pasos.push(
        paso("practica", habilidad, "Práctica de " + habilidad, MINUTOS_BLOQUE_HABILIDAD, { nivelCEFR: nivelEfectivo(habilidad) })
      );
      bloquesAgregados++;
    }

    // Regla 3 (continuación): escritura "cada vez que haya tiempo" -- se agrega como bloque
    // extra si, después de la rotación principal, el total sigue dentro de un bloque de
    // margen sobre la meta (así no se queda fuera solo porque la rotación llegó justo a la
    // meta con los últimos minutos). No cuenta para TOPE_BLOQUES_ROTACION porque no es parte
    // de esa rotación.
    if (sumaMinutos(pasos) < metaMinutosDia + MINUTOS_BLOQUE_HABILIDAD) {
      pasos.push(paso("practica", "escritura", "Práctica de escritura", MINUTOS_BLOQUE_HABILIDAD, { nivelCEFR: nivelEfectivo("escritura") }));
    }

    // Regla 5: un día a la semana entra un paso de Conversación, independiente de la meta.
    var diaSemana = typeof c.diaSemana === "number" ? c.diaSemana : new Date(hoyISO + "T12:00:00").getDay();
    var diaConversacion = typeof c.diaConversacionSemana === "number" ? c.diaConversacionSemana : DIA_CONVERSACION_DEFECTO;
    if (diaSemana === diaConversacion) {
      pasos.push(paso("conversacion", null, "Conversación con IA", MINUTOS_CONVERSACION));
    }

    return { pasos: pasos, totalMinutos: sumaMinutos(pasos), advertencias: advertencias };
  }

  /** Cola real de una sesión de Repaso, con los topes de D26 (antes la pantalla tomaba TODAS
   * las tarjetas pendientes: "1 / 228"). Pura, sin DOM.
   * - Vencidas (ya vistas, `repeticiones>0`, con fecha cumplida): las más atrasadas primero,
   *   máx. `topeVencidas`.
   * - Nuevas (`repeticiones===0`): máx. `topeNuevas` POR DÍA en total. Las que ya se
   *   introdujeron hoy (`introducidasHoy`, ids) y siguen "nuevas" porque se fallaron vuelven
   *   a entrar sin gastar cupo; el cupo restante se llena con tarjetas nunca vistas, las del
   *   nivel actual de Alex primero, luego las de niveles menores y al final las mayores.
   * @returns {{cola:Array, nuevasIncluidas:Array<string>}} nuevasIncluidas = ids de TODAS las
   *   nuevas de esta sesión (para guardar el contador del día). */
  function armarColaRepaso(tarjetas, ahora, opciones) {
    var o = opciones || {};
    var topeVencidas = typeof o.topeVencidas === "number" ? o.topeVencidas : TOPE_TARJETAS_VENCIDAS_POR_SESION;
    var topeNuevas = typeof o.topeNuevas === "number" ? o.topeNuevas : TOPE_TARJETAS_NUEVAS_POR_DIA;
    var hoy = global.App.Fecha.hoyISO(ahora);
    var introducidas = {};
    (o.introducidasHoy || []).forEach(function (id) {
      introducidas[id] = true;
    });
    var idxNivelActual = global.App.Avance.indiceNivel(o.nivelGlobal || "A1");

    tarjetas = (tarjetas || []).filter(function (t) {
      return !t.retirada; // tarjetas retiradas por duplicadas (D31): se conservan guardadas pero no se repasan
    });
    var vencidas = (tarjetas || [])
      .filter(function (t) {
        return (t.repeticiones || 0) > 0 && t.proximaFecha <= hoy;
      })
      .sort(function (a, b) {
        return a.proximaFecha < b.proximaFecha ? -1 : a.proximaFecha > b.proximaFecha ? 1 : 0;
      })
      .slice(0, topeVencidas);

    var nuevas = (tarjetas || []).filter(function (t) {
      return (t.repeticiones || 0) === 0;
    });
    var yaIntroducidas = nuevas.filter(function (t) {
      return introducidas[t.id];
    });
    var cupo = Math.max(0, topeNuevas - Object.keys(introducidas).length);
    // distancia al nivel actual: igual = 0, por debajo = 1+ (más cerca primero), por encima = 100+
    function rango(t) {
      var d = global.App.Avance.indiceNivel(t.nivelCEFR || "A1") - idxNivelActual;
      return d <= 0 ? -d : 100 + d;
    }
    var frescas = nuevas
      .filter(function (t) {
        return !introducidas[t.id];
      })
      .sort(function (a, b) {
        return rango(a) - rango(b);
      })
      .slice(0, cupo);

    var nuevasSesion = yaIntroducidas.concat(frescas);
    return {
      cola: vencidas.concat(nuevasSesion),
      nuevasIncluidas: Object.keys(introducidas).concat(
        frescas.map(function (t) {
          return t.id;
        })
      )
    };
  }

  global.App = global.App || {};
  global.App.Plan = {
    armarColaRepaso: armarColaRepaso,
    calcularPlanDelDia: calcularPlanDelDia,
    pasoConfirmacion: pasoConfirmacion,
    // Expuestas para pruebas unitarias finas sin tener que pasar por calcularPlanDelDia completo.
    ordenarHabilidadesPorPrioridad: ordenarHabilidadesPorPrioridad,
    calcularMinutosRepaso: calcularMinutosRepaso,
    TOPE_TARJETAS_VENCIDAS_POR_SESION: TOPE_TARJETAS_VENCIDAS_POR_SESION,
    TOPE_TARJETAS_NUEVAS_POR_DIA: TOPE_TARJETAS_NUEVAS_POR_DIA
  };
})(typeof window !== "undefined" ? window : globalThis);
