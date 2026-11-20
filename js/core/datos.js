/* App.Datos — orquesta App.Storage (IndexedDB) con los módulos puros (Racha/XP/Progreso).
   Vive aparte de storage.js porque sí conoce las reglas de negocio (qué campos tiene cada
   registro); storage.js solo sabe guardar/leer objetos por id. No se prueba con el runner
   de JXA porque depende de IndexedDB (igual que storage.js). */
(function (global) {
  "use strict";

  var PREFERENCIAS_POR_DEFECTO = {
    id: "preferencias",
    metaMinutosDia: 15,
    tema: "sistema",
    forzarEspanol: false,
    // Conversación con IA (D24): apagada por defecto porque necesita que Alex despliegue su
    // propio proxy primero (ver REPORTE_CONVERSACION_IA.md). La URL es la de su propio Worker,
    // nunca una clave de API -- esa vive solo en el servidor del proxy.
    conversacionActivada: false,
    conversacionWorkerUrl: "",
    vozPreferidaTTS: "" // nombre de voz elegido en Ajustes; "" = sin preferencia, usa el orden por defecto de App.TTS
  };

  function obtenerPreferencias() {
    return global.App.Storage.get("settings", "preferencias").then(function (p) {
      // Object.assign con el default primero: si p viene de una versión anterior sin
      // "tema" (o de un respaldo viejo), igual queda con un valor válido.
      return Object.assign({}, PREFERENCIAS_POR_DEFECTO, p || {});
    });
  }

  function guardarPreferencias(prefs) {
    return global.App.Storage.put("settings", Object.assign({ id: "preferencias" }, prefs));
  }

  function obtenerXP() {
    return global.App.Storage.get("xp", "actual").then(function (x) {
      return x || { id: "actual", total: 0 };
    });
  }

  function obtenerMinutosPorDia() {
    return global.App.Storage.getAll("sesiones").then(function (filas) {
      var mapa = {};
      filas.forEach(function (fila) {
        mapa[fila.id] = fila.minutos || 0;
      });
      return mapa;
    });
  }

  function obtenerEstadoRacha(ahora) {
    return obtenerMinutosPorDia().then(function (minutosPorDia) {
      return global.App.Racha.calcularEstado(minutosPorDia, {}, ahora);
    });
  }

  /** Registra el resultado de una sesión de estudio (minutos + ejercicios correctos) y
   * actualiza el registro del día y el XP total. Devuelve el XP ganado y el estado nuevo.
   * "habilidad" es opcional (lectura/habla/escucha/escritura) -- si se da, además registra
   * esa fecha como última práctica de esa habilidad (ver registrarPracticaHabilidad), para
   * que el motor del plan sepa cuándo le toca rotar hacia cada una. Repaso no manda
   * "habilidad" (las tarjetas pueden ser de cualquier tipo, no una sola). */
  function registrarSesion(minutos, ejerciciosCorrectos, ahora, habilidad) {
    var hoy = global.App.Fecha.hoyISO(ahora);
    return Promise.all([
      global.App.Storage.get("sesiones", hoy),
      obtenerXP(),
      obtenerPreferencias()
    ]).then(function (res) {
      var sesionHoy = res[0] || { id: hoy, minutos: 0, metaCumplida: false, ejerciciosCorrectos: 0 };
      var xp = res[1];
      var prefs = res[2];

      var resultado = global.App.Progreso.aplicarSesion(
        { minutosHoy: sesionHoy.minutos, metaCumplidaHoy: sesionHoy.metaCumplida, xpTotal: xp.total },
        { minutos: minutos, ejerciciosCorrectos: ejerciciosCorrectos },
        { metaMinutosDia: prefs.metaMinutosDia }
      );

      var sesionNueva = {
        id: hoy,
        minutos: resultado.minutosHoy,
        metaCumplida: resultado.metaCumplidaHoy,
        ejerciciosCorrectos: (sesionHoy.ejerciciosCorrectos || 0) + (ejerciciosCorrectos || 0)
      };
      var xpNueva = { id: "actual", total: resultado.xpTotal };

      var nivelXPAntes = global.App.XP.nivelDesdeXP(xp.total);
      var nivelXPDespues = global.App.XP.nivelDesdeXP(resultado.xpTotal);
      if (nivelXPDespues > nivelXPAntes) {
        // Inicio muestra la lluvia de calcomanías al volver (ver App.Util.mostrarCelebracion).
        global.App.Util.anotarCelebracion({ tipo: "xp", nivel: nivelXPDespues });
      }

      return Promise.all([
        global.App.Storage.put("sesiones", sesionNueva),
        global.App.Storage.put("xp", xpNueva),
        habilidad ? registrarPracticaHabilidad(habilidad, ahora) : Promise.resolve()
      ]).then(function () {
        return { xpGanada: resultado.xpGanada, xpTotal: resultado.xpTotal, minutosHoy: resultado.minutosHoy };
      });
    });
  }

  var HABILIDADES_PLAN = ["lectura", "habla", "escucha", "escritura"];

  /** Última vez que se practicó CADA habilidad por separado -- D22 (ver DECISIONES.md)
   * señalaba que registrarSesion es genérico (no sabe qué habilidad fue), así que "Tu camino"
   * nunca podía marcar un nodo específico como practicado hoy. Vive en "settings" (un solo
   * registro con un mapa habilidad->fecha) en vez de un store nuevo, para no requerir otra
   * subida de versión de IndexedDB además de "plan". */
  function obtenerUltimaPracticaPorHabilidad() {
    return global.App.Storage.get("settings", "ultimaPracticaHabilidad").then(function (r) {
      return (r && r.fechas) || {};
    });
  }

  function registrarPracticaHabilidad(habilidad, ahora) {
    if (HABILIDADES_PLAN.indexOf(habilidad) === -1) return Promise.resolve();
    return obtenerUltimaPracticaPorHabilidad().then(function (fechas) {
      var nuevo = Object.assign({}, fechas);
      nuevo[habilidad] = global.App.Fecha.hoyISO(ahora);
      return global.App.Storage.put("settings", { id: "ultimaPracticaHabilidad", fechas: nuevo });
    });
  }

  function obtenerUltimoDiagnostico() {
    return global.App.Storage.getAll("diagnostico_resultados").then(function (filas) {
      if (filas.length === 0) return null;
      filas.sort(function (a, b) {
        return a.id < b.id ? 1 : -1;
      });
      return filas[0];
    });
  }

  /** Nivel CEFR global (ponderado, App.Avance) de un resultado de diagnóstico; null si no hay. */
  function nivelGlobalDeDiagnostico(diagnostico) {
    if (!diagnostico || !diagnostico.porHabilidad) return null;
    var numeros = {};
    ["lectura", "habla", "escucha", "escritura"].forEach(function (h) {
      var d = diagnostico.porHabilidad[h];
      numeros[h] = global.App.Avance.numeroDesdeNivel((d && d.nivelCEFR) || "A1", 50);
    });
    return global.App.Avance.calcularNivelGlobal(numeros).nivel;
  }

  function guardarDiagnostico(resultado) {
    var registro = Object.assign({ id: String(Date.now()) }, resultado);
    return obtenerUltimoDiagnostico().then(function (anterior) {
      var antes = nivelGlobalDeDiagnostico(anterior);
      var despues = nivelGlobalDeDiagnostico(registro);
      // Solo si ya había un diagnóstico previo Y el nivel global SUBIÓ (el primero no celebra).
      if (antes && despues && global.App.Avance.indiceNivel(despues) > global.App.Avance.indiceNivel(antes)) {
        global.App.Util.anotarCelebracion({ tipo: "cefr", nivel: despues });
      }
      return global.App.Storage.put("diagnostico_resultados", registro);
    });
  }

  /** Tarjetas de repaso que DEBERÍAN existir según el contenido actual de fase 1. */
  function tarjetasDesdeContenido(vocabJson, frasesJson, ahora) {
    var vocab = vocabJson.palabras || [];
    var frases = frasesJson.categorias || [];
    var tarjetas = [];
    vocab.forEach(function (v) {
      var t = global.App.SRS.tarjetaNueva("voc-" + v.id, ahora);
      t.frente = v.ingles;
      t.atras = v.espanol + (v.ejemplo ? " — " + v.ejemplo : "");
      t.tipo = "vocabulario";
      t.nivelCEFR = v.nivelCEFR || "A1";
      tarjetas.push(t);
    });
    frases.forEach(function (cat) {
      (cat.frases || []).forEach(function (f, i) {
        // El id depende de la POSICIÓN dentro de la categoría: el contenido nuevo de una
        // categoría existente se agrega siempre AL FINAL (nunca en medio) para no mover los
        // ids de tarjetas que Alex ya tiene con su calendario SM-2.
        var t = global.App.SRS.tarjetaNueva("frase-" + cat.categoria + "-" + i, ahora);
        t.frente = f.ingles;
        t.atras = f.espanol;
        t.tipo = "frase";
        t.nivelCEFR = cat.nivelCEFR || "A1";
        tarjetas.push(t);
      });
    });
    return tarjetas;
  }

  /** Siembra Y SINCRONIZA las tarjetas con el contenido: crea las que faltan (contenido
   * nuevo en una app que ya se usaba -- antes solo se sembraba con la base vacía, así que
   * nadie recibía tarjetas nuevas) y completa en las existentes los campos de contenido
   * (`nivelCEFR`, `tipo`, `frente`, `atras`) SIN tocar su estado SM-2 (repeticiones,
   * intervalo, facilidad, próxima fecha). Nunca borra tarjetas. Idempotente. */
  function sembrarTarjetasSiHaceFalta(ahora) {
    return Promise.all([
      global.App.Storage.getAll("srs_cards"),
      fetch("data/content/fase1/vocabulario.json").then(function (r) { return r.json(); }),
      fetch("data/content/fase1/frases_utiles.json").then(function (r) { return r.json(); })
    ]).then(function (res) {
      var existentes = {};
      res[0].forEach(function (t) {
        existentes[t.id] = t;
      });
      var deseadas = tarjetasDesdeContenido(res[1], res[2], ahora);
      var escrituras = [];
      deseadas.forEach(function (d) {
        var e = existentes[d.id];
        if (!e) {
          escrituras.push(d);
        } else if (e.nivelCEFR !== d.nivelCEFR || e.tipo !== d.tipo || e.frente !== d.frente || e.atras !== d.atras) {
          escrituras.push(Object.assign({}, e, { nivelCEFR: d.nivelCEFR, tipo: d.tipo, frente: d.frente, atras: d.atras }));
        }
      });
      return Promise.all(
        escrituras.map(function (t) {
          return global.App.Storage.put("srs_cards", t);
        })
      ).then(function () {
        return global.App.Storage.getAll("srs_cards");
      });
    });
  }

  /** Nivel CEFR global actual de Alex (ponderado, App.Avance) a partir del último
   * diagnóstico; "A1" si todavía no hay. */
  function obtenerNivelGlobalActual() {
    return obtenerUltimoDiagnostico().then(function (diagnostico) {
      var numeros = {};
      ["lectura", "habla", "escucha", "escritura"].forEach(function (h) {
        var d = diagnostico && diagnostico.porHabilidad && diagnostico.porHabilidad[h];
        numeros[h] = global.App.Avance.numeroDesdeNivel((d && d.nivelCEFR) || "A1", 50);
      });
      return global.App.Avance.calcularNivelGlobal(numeros).nivel;
    });
  }

  /** Cola de la sesión de Repaso con los topes de D26 (App.Plan.armarColaRepaso) y el
   * contador de tarjetas nuevas del día (settings "tarjetasNuevasHoy"). */
  function obtenerColaRepaso(ahora) {
    var hoyISO = global.App.Fecha.hoyISO(ahora);
    return Promise.all([
      sembrarTarjetasSiHaceFalta(ahora),
      global.App.Storage.get("settings", "tarjetasNuevasHoy"),
      obtenerNivelGlobalActual()
    ]).then(function (res) {
      var registro = res[1];
      var introducidasHoy = registro && registro.fecha === hoyISO ? registro.ids || [] : [];
      var r = global.App.Plan.armarColaRepaso(res[0], ahora, { introducidasHoy: introducidasHoy, nivelGlobal: res[2] });
      return global.App.Storage.put("settings", { id: "tarjetasNuevasHoy", fecha: hoyISO, ids: r.nuevasIncluidas }).then(function () {
        return r.cola;
      });
    });
  }

  // --- Plan diario guiado (App.Plan) -- ver js/core/plan.js para las reglas en sí. Esta
  // sección solo arma el "contexto" real desde IndexedDB y persiste el resultado. ---

  function contarTarjetasRepaso(ahora) {
    // Siembra/sincroniza primero: si no, el primer día (tarjetas todavía no creadas, se creaban
    // al abrir Repaso) el plan contaba 0 y nunca incluía el paso de Repaso.
    return sembrarTarjetasSiHaceFalta(ahora).then(function (tarjetas) {
      var vencidas = 0;
      var nuevas = 0;
      tarjetas.forEach(function (t) {
        if ((t.repeticiones || 0) === 0) {
          nuevas++;
        } else if (global.App.SRS.estaParaRepasar(t, ahora)) {
          vencidas++;
        }
      });
      return { vencidas: vencidas, nuevas: nuevas };
    });
  }

  /** Nivel CEFR real de cada habilidad: el último diagnóstico completo es la fuente de
   * verdad (D8: el diagnóstico en sí no cambia). Si todavía no hay diagnóstico, cada
   * habilidad queda en null -- quien llama (obtenerOCalcularPlanDeHoy) ya resuelve ese caso
   * aparte con la regla 1 del plan (sin diagnóstico, el plan es solo Diagnóstico). */
  function armarHabilidadesParaPlan() {
    return Promise.all([obtenerUltimoDiagnostico(), obtenerUltimaPracticaPorHabilidad()]).then(function (res) {
      var diagnostico = res[0];
      var fechas = res[1];
      var porHabilidad = (diagnostico && diagnostico.porHabilidad) || {};
      var habilidades = {};
      HABILIDADES_PLAN.forEach(function (h) {
        habilidades[h] = {
          nivelCEFR: (porHabilidad[h] && porHabilidad[h].nivelCEFR) || "A1",
          ultimaPractica: fechas[h] || null
        };
      });
      return habilidades;
    });
  }

  /** Qué habilidad de la rotación principal (lectura/habla/escucha, nunca escritura) fue el
   * primer bloque de práctica del plan de AYER -- para que hoy el motor del plan no repita
   * la misma dos días seguidos (regla 3). Si ayer no hubo plan guardado (primer día de uso,
   * o Alex no abrió la app), no hay nada que evitar y se devuelve null. */
  function obtenerUltimaHabilidadRotada(hoyISO) {
    var ayerISO = global.App.Fecha.sumarDias(hoyISO, -1);
    return global.App.Storage.get("plan", ayerISO).then(function (planAyer) {
      if (!planAyer || !planAyer.pasos) return null;
      var primeraRotacion = planAyer.pasos.filter(function (p) {
        return p.tipo === "practica" && p.habilidad !== "escritura";
      })[0];
      return primeraRotacion ? primeraRotacion.habilidad : null;
    });
  }

  var SEMANAS_ENTRE_REEVALUACION = 4;

  function obtenerSemanasDesdeUltimaReevaluacion(hoyISO) {
    return Promise.all([global.App.Storage.get("settings", "ultimaReevaluacion"), obtenerUltimoDiagnostico()]).then(function (res) {
      var registro = res[0];
      var diagnostico = res[1];
      // Sin reevaluación registrada todavía: se cuenta desde el diagnóstico original (es la
      // primera medición real que hay), no desde "siempre" (que dispararía una reevaluación
      // el segundo día de uso).
      var desdeISO = (registro && registro.fechaISO) || (diagnostico && global.App.Fecha.hoyISO(new Date(Number(diagnostico.id)))) || hoyISO;
      var dias = global.App.Fecha.diferenciaDias(desdeISO, hoyISO);
      return Math.max(0, Math.floor(dias / 7));
    });
  }

  var ARCHIVOS_CONTENIDO_POR_HABILIDAD = [
    { archivo: "data/content/fase1/lecturas.json", clave: "lecturas" },
    { archivo: "data/content/fase1/escucha.json", clave: "escucha" },
    { archivo: "data/content/fase1/escritura.json", clave: "escritura" },
    { archivo: "data/content/fase1/habla.json", clave: "ejercicios" }
  ];
  var nivelesConContenidoCache = null;

  /** Niveles CEFR que tienen contenido REAL en las 4 habilidades (la intersección): así el
   * plan avisa y sustituye (App.Avance.nivelEfectivoConContenido) en vez de prometer un
   * nivel para el que alguna pantalla no tiene nada. Si algo falla al leer (sin red y sin
   * caché), devuelve [] = "no sé", y el plan no sustituye nada (comportamiento anterior). */
  function obtenerNivelesConContenido() {
    if (nivelesConContenidoCache) return Promise.resolve(nivelesConContenidoCache);
    return Promise.all(
      ARCHIVOS_CONTENIDO_POR_HABILIDAD.map(function (a) {
        return fetch(a.archivo)
          .then(function (r) {
            return r.json();
          })
          .then(function (d) {
            return global.App.Avance.nivelesDisponibles(d[a.clave] || []);
          });
      })
    )
      .then(function (listas) {
        var comunes = global.App.Avance.ORDEN_NIVELES.filter(function (nivel) {
          return listas.every(function (l) {
            return l.indexOf(nivel) !== -1;
          });
        });
        nivelesConContenidoCache = comunes;
        return comunes;
      })
      .catch(function () {
        return [];
      });
  }

  function armarContextoPlan(ahora) {
    var hoyISO = global.App.Fecha.hoyISO(ahora);
    return Promise.all([
      obtenerUltimoDiagnostico(),
      contarTarjetasRepaso(ahora),
      armarHabilidadesParaPlan(),
      obtenerPreferencias(),
      obtenerUltimaHabilidadRotada(hoyISO),
      obtenerSemanasDesdeUltimaReevaluacion(hoyISO),
      obtenerNivelesConContenido()
    ]).then(function (res) {
      var diagnostico = res[0];
      var tarjetas = res[1];
      var habilidades = res[2];
      var prefs = res[3];
      var ultimaHabilidadRotada = res[4];
      var semanasDesdeUltimaReevaluacion = res[5];
      var nivelesConContenido = res[6];
      return {
        fecha: hoyISO,
        diagnosticoHecho: !!diagnostico,
        tarjetasVencidas: tarjetas.vencidas,
        tarjetasNuevasDisponibles: tarjetas.nuevas,
        habilidades: habilidades,
        metaMinutosDia: prefs.metaMinutosDia,
        ultimaHabilidadRotada: ultimaHabilidadRotada,
        semanasDesdeUltimaReevaluacion: semanasDesdeUltimaReevaluacion,
        semanasEntreReevaluacion: SEMANAS_ENTRE_REEVALUACION,
        nivelesConContenido: nivelesConContenido
      };
    });
  }

  /** Punto de entrada real del plan guiado: si ya existe un plan guardado para hoy, lo
   * devuelve TAL CUAL (determinismo -- regla 8: el plan no cambia aunque se recargue la
   * página ni aunque se practique de más el mismo día, ver registrarPracticaExtra). Si no
   * existe, lo calcula una sola vez con el contexto real y lo guarda, con cada paso marcado
   * "completado:false". */
  function esPlanSoloDiagnostico(plan) {
    return !!(plan && plan.pasos && plan.pasos.length === 1 && plan.pasos[0].tipo === "diagnostico");
  }

  function calcularYGuardarPlan(ahora, hoyISO) {
    return armarContextoPlan(ahora).then(function (contexto) {
      var resultado = global.App.Plan.calcularPlanDelDia(contexto);
      var registro = {
        id: hoyISO,
        pasos: resultado.pasos.map(function (p) {
          return Object.assign({ completado: false }, p);
        }),
        totalMinutos: resultado.totalMinutos,
        advertencias: resultado.advertencias
      };
      return global.App.Storage.put("plan", registro).then(function () {
        return registro;
      });
    });
  }

  function obtenerOCalcularPlanDeHoy(ahora) {
    var hoyISO = global.App.Fecha.hoyISO(ahora);
    return global.App.Storage.get("plan", hoyISO).then(function (existente) {
      if (!existente) return calcularYGuardarPlan(ahora, hoyISO);
      if (!esPlanSoloDiagnostico(existente)) return existente;
      // El plan de hoy se guardó cuando todavía no había diagnóstico ("solo Diagnóstico"). Es
      // un plan PROVISIONAL: en cuanto existe un diagnóstico (acaba de hacerse, o se importó un
      // respaldo) se calcula el plan real del día -- si no, se quedaba en "Diagnóstico de nivel"
      // todo el día aunque ya estuviera hecho. Cualquier otro plan guardado es definitivo
      // (determinismo, regla 8).
      return obtenerUltimoDiagnostico().then(function (diagnostico) {
        return diagnostico ? calcularYGuardarPlan(ahora, hoyISO) : existente;
      });
    });
  }

  /** Marca un paso del plan de "fecha" como completado. Si ese paso es una reevaluación,
   * además actualiza la fecha de "última reevaluación" (reinicia el ciclo de 4 semanas) --
   * es el único efecto secundario fuera del plan mismo que un paso puede disparar. */
  function marcarPasoCompletado(fecha, indicePaso, esperado) {
    return global.App.Storage.get("plan", fecha).then(function (plan) {
      if (!plan || !plan.pasos) return plan;
      // "esperado" ({tipo, habilidad}) protege contra un plan que se recalculó a mitad del
      // flujo: si el paso en esa posición ya no es el que se estaba haciendo, se busca por tipo;
      // si ya no existe (p. ej. el Diagnóstico, que el plan real no incluye) no se marca NADA --
      // antes se marcaba como hecho el paso equivocado (Repaso sin haberlo hecho).
      if (esperado && esperado.tipo) {
        var coincide = function (p) {
          return p && p.tipo === esperado.tipo && (!esperado.habilidad || p.habilidad === esperado.habilidad);
        };
        if (!coincide(plan.pasos[indicePaso])) {
          indicePaso = plan.pasos.findIndex(function (p) {
            return !p.completado && coincide(p);
          });
        }
      }
      if (indicePaso < 0 || !plan.pasos[indicePaso]) return plan;
      plan.pasos[indicePaso].completado = true;
      var esReevaluacion = plan.pasos[indicePaso].tipo === "reevaluacion";
      return global.App.Storage.put("plan", plan).then(function () {
        if (!esReevaluacion) return plan;
        return global.App.Storage.put("settings", { id: "ultimaReevaluacion", fechaISO: fecha }).then(function () {
          return plan;
        });
      });
    });
  }

  global.App = global.App || {};
  global.App.Datos = {
    PREFERENCIAS_POR_DEFECTO: PREFERENCIAS_POR_DEFECTO,
    obtenerPreferencias: obtenerPreferencias,
    guardarPreferencias: guardarPreferencias,
    obtenerXP: obtenerXP,
    obtenerMinutosPorDia: obtenerMinutosPorDia,
    obtenerEstadoRacha: obtenerEstadoRacha,
    registrarSesion: registrarSesion,
    obtenerUltimoDiagnostico: obtenerUltimoDiagnostico,
    guardarDiagnostico: guardarDiagnostico,
    sembrarTarjetasSiHaceFalta: sembrarTarjetasSiHaceFalta,
    obtenerColaRepaso: obtenerColaRepaso,
    obtenerNivelGlobalActual: obtenerNivelGlobalActual,
    obtenerUltimaPracticaPorHabilidad: obtenerUltimaPracticaPorHabilidad,
    registrarPracticaHabilidad: registrarPracticaHabilidad,
    contarTarjetasRepaso: contarTarjetasRepaso,
    obtenerOCalcularPlanDeHoy: obtenerOCalcularPlanDeHoy,
    marcarPasoCompletado: marcarPasoCompletado
  };
})(typeof window !== "undefined" ? window : globalThis);
