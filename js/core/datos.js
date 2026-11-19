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

  function guardarDiagnostico(resultado) {
    var registro = Object.assign({ id: String(Date.now()) }, resultado);
    return global.App.Storage.put("diagnostico_resultados", registro);
  }

  var IDS_VOCABULARIO_SEMBRADOS = "vocabulario-fase1";

  /** Si no hay tarjetas de repaso todavía, las crea a partir del contenido de fase 1. */
  function sembrarTarjetasSiHaceFalta(ahora) {
    return global.App.Storage.getAll("srs_cards").then(function (existentes) {
      if (existentes.length > 0) return existentes;
      return Promise.all([fetch("data/content/fase1/vocabulario.json").then(function (r) { return r.json(); }), fetch("data/content/fase1/frases_utiles.json").then(function (r) { return r.json(); })]).then(
        function (res) {
          var vocab = res[0].palabras || [];
          var frases = res[1].categorias || [];
          var tarjetas = [];

          vocab.forEach(function (v) {
            var t = global.App.SRS.tarjetaNueva("voc-" + v.id, ahora);
            t.frente = v.ingles;
            t.atras = v.espanol + (v.ejemplo ? " — " + v.ejemplo : "");
            t.tipo = "vocabulario";
            tarjetas.push(t);
          });

          frases.forEach(function (cat) {
            (cat.frases || []).forEach(function (f, i) {
              var id = "frase-" + cat.categoria + "-" + i;
              var t = global.App.SRS.tarjetaNueva(id, ahora);
              t.frente = f.ingles;
              t.atras = f.espanol;
              t.tipo = "frase";
              tarjetas.push(t);
            });
          });

          return Promise.all(tarjetas.map(function (t) { return global.App.Storage.put("srs_cards", t); })).then(function () {
            return tarjetas;
          });
        }
      );
    });
  }

  // --- Plan diario guiado (App.Plan) -- ver js/core/plan.js para las reglas en sí. Esta
  // sección solo arma el "contexto" real desde IndexedDB y persiste el resultado. ---

  function contarTarjetasRepaso(ahora) {
    return global.App.Storage.getAll("srs_cards").then(function (tarjetas) {
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

  function armarContextoPlan(ahora) {
    var hoyISO = global.App.Fecha.hoyISO(ahora);
    return Promise.all([
      obtenerUltimoDiagnostico(),
      contarTarjetasRepaso(ahora),
      armarHabilidadesParaPlan(),
      obtenerPreferencias(),
      obtenerUltimaHabilidadRotada(hoyISO),
      obtenerSemanasDesdeUltimaReevaluacion(hoyISO)
    ]).then(function (res) {
      var diagnostico = res[0];
      var tarjetas = res[1];
      var habilidades = res[2];
      var prefs = res[3];
      var ultimaHabilidadRotada = res[4];
      var semanasDesdeUltimaReevaluacion = res[5];
      return {
        fecha: hoyISO,
        diagnosticoHecho: !!diagnostico,
        tarjetasVencidas: tarjetas.vencidas,
        tarjetasNuevasDisponibles: tarjetas.nuevas,
        habilidades: habilidades,
        metaMinutosDia: prefs.metaMinutosDia,
        ultimaHabilidadRotada: ultimaHabilidadRotada,
        semanasDesdeUltimaReevaluacion: semanasDesdeUltimaReevaluacion,
        semanasEntreReevaluacion: SEMANAS_ENTRE_REEVALUACION
        // "nivelesConContenido" se omite a propósito: sin esa lista, App.Plan nunca sustituye
        // un nivel por otro (ver App.Avance.nivelEfectivoConContenido con lista vacía). Fase C
        // es quien sabe de verdad qué niveles tienen contenido real; hasta que exista ese
        // índice, el plan asume que todo nivel tiene contenido.
      };
    });
  }

  /** Punto de entrada real del plan guiado: si ya existe un plan guardado para hoy, lo
   * devuelve TAL CUAL (determinismo -- regla 8: el plan no cambia aunque se recargue la
   * página ni aunque se practique de más el mismo día, ver registrarPracticaExtra). Si no
   * existe, lo calcula una sola vez con el contexto real y lo guarda, con cada paso marcado
   * "completado:false". */
  function obtenerOCalcularPlanDeHoy(ahora) {
    var hoyISO = global.App.Fecha.hoyISO(ahora);
    return global.App.Storage.get("plan", hoyISO).then(function (existente) {
      if (existente) return existente;
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
    });
  }

  /** Marca un paso del plan de "fecha" como completado. Si ese paso es una reevaluación,
   * además actualiza la fecha de "última reevaluación" (reinicia el ciclo de 4 semanas) --
   * es el único efecto secundario fuera del plan mismo que un paso puede disparar. */
  function marcarPasoCompletado(fecha, indicePaso) {
    return global.App.Storage.get("plan", fecha).then(function (plan) {
      if (!plan || !plan.pasos || !plan.pasos[indicePaso]) return plan;
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
    obtenerUltimaPracticaPorHabilidad: obtenerUltimaPracticaPorHabilidad,
    registrarPracticaHabilidad: registrarPracticaHabilidad,
    contarTarjetasRepaso: contarTarjetasRepaso,
    obtenerOCalcularPlanDeHoy: obtenerOCalcularPlanDeHoy,
    marcarPasoCompletado: marcarPasoCompletado
  };
})(typeof window !== "undefined" ? window : globalThis);
