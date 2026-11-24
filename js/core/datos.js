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
    // Recordatorio con .ics (D38): hora local "HH:MM" y días 0..6 (0 = lunes). Viven en settings (se
    // exportan/importan con el resto); un respaldo de hey-3 sin estas claves queda con estos valores.
    recordatorioHora: "20:00",
    recordatorioDias: [0, 1, 2, 3, 4, 5, 6],
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

  // ---------------------------------------------------------------------------------------
  // AVANCE CONTINUO POR HABILIDAD (D29). El diagnóstico fija el nivel INICIAL; desde entonces
  // el nivel de cada habilidad vive en el store "avance" (una fila por habilidad: nivel,
  // ventana de respuestas, estado de confirmación). Sin fila todavía (usuario que ya tenía
  // diagnóstico antes de D29) el estado se deriva del último diagnóstico, sin perder nada.
  // ---------------------------------------------------------------------------------------
  var colaAvance = Promise.resolve(); // serializa lectura-modificación-escritura de respuestas rápidas

  function encolarAvance(fn) {
    var p = colaAvance.then(fn);
    colaAvance = p.catch(function () {});
    return p;
  }

  function limpiarFilaAvance(fila, habilidad) {
    // normalizarVentana: escritura conserva solo las últimas 10 (D35); datos de hey-3 se migran al leer.
    return { habilidad: habilidad, nivel: fila.nivel, ventana: global.App.Avance.normalizarVentana(fila.ventana, habilidad), listaParaConfirmar: !!fila.listaParaConfirmar, listaDesde: fila.listaDesde || null, ultimoFallo: fila.ultimoFallo || null };
  }

  /** { lectura:{nivel,ventana,listaParaConfirmar,listaDesde,ultimoFallo}, escucha, habla, escritura } */
  function obtenerEstadosAvance() {
    return Promise.all([global.App.Storage.getAll("avance"), obtenerUltimoDiagnostico()]).then(function (res) {
      var filas = {};
      res[0].forEach(function (f) {
        filas[f.id] = f;
      });
      var diag = res[1];
      var estados = {};
      HABILIDADES_PLAN.forEach(function (h) {
        if (filas[h]) {
          estados[h] = limpiarFilaAvance(filas[h], h);
        } else {
          var base = diag && diag.porHabilidad && diag.porHabilidad[h] && diag.porHabilidad[h].nivelCEFR;
          estados[h] = global.App.Avance.estadoHabilidadVacio(base || "A1", h);
        }
      });
      return estados;
    });
  }

  function guardarEstadoAvance(habilidad, estado) {
    return global.App.Storage.put("avance", Object.assign({ id: habilidad }, estado));
  }

  /** { lectura:"B1", ... } -- el nivel actual de cada habilidad (avance continuo). */
  function obtenerNivelesHabilidad() {
    return obtenerEstadosAvance().then(function (estados) {
      var niveles = {};
      HABILIDADES_PLAN.forEach(function (h) {
        niveles[h] = estados[h].nivel;
      });
      return niveles;
    });
  }

  /** Nivel CEFR global (ponderado, App.Avance) a partir de los estados reales de avance. */
  function nivelGlobalDeEstados(estados) {
    return global.App.Avance.calcularNivelGlobalDesdeEstados(estados);
  }

  /** Registra UNA respuesta puntuada (valor 0..1) de una habilidad. Solo cuenta si el contenido
   * respondido es del NIVEL ACTUAL de esa habilidad (no del repaso de niveles más bajos).
   * No toca XP ni el plan del día. Devuelve {contado, quedoLista}. */
  function registrarRespuestaAvance(habilidad, nivelContenido, valor, peso, ahora) {
    if (HABILIDADES_PLAN.indexOf(habilidad) === -1) return Promise.resolve({ contado: false });
    var hoyISO = global.App.Fecha.hoyISO(ahora);
    return encolarAvance(function () {
      return Promise.all([obtenerEstadosAvance(), obtenerUltimoDiagnostico()]).then(function (res) {
        var estados = res[0];
        if (!res[1]) return { contado: false }; // sin diagnóstico todavía no hay nivel que medir
        var actual = estados[habilidad];
        if (nivelContenido !== actual.nivel) return { contado: false };
        var r = global.App.Avance.registrarRespuestaEnEstado(actual, valor, peso, hoyISO);
        return guardarEstadoAvance(habilidad, r.estado).then(function () {
          return { contado: true, quedoLista: r.quedoLista, estado: r.estado };
        });
      });
    });
  }

  var ORDEN_CONFIRMACION = ["lectura", "habla", "escucha", "escritura"];

  /** Habilidades que HOY pueden confirmarse (listas y fuera de la espera de 7 días), la que
   * lleva más tiempo lista primero. [{habilidad, nivelActual, nivelObjetivo}] */
  function obtenerConfirmacionesPendientes(ahora) {
    var hoyISO = global.App.Fecha.hoyISO(ahora);
    return obtenerEstadosAvance().then(function (estados) {
      return ORDEN_CONFIRMACION.filter(function (h) {
        return global.App.Avance.puedeConfirmar(estados[h], hoyISO);
      })
        .map(function (h, i) {
          return { habilidad: h, nivelActual: estados[h].nivel, nivelObjetivo: global.App.Avance.siguienteNivelDe(estados[h].nivel), desde: estados[h].listaDesde || "", orden: i };
        })
        .sort(function (a, b) {
          return a.desde < b.desde ? -1 : a.desde > b.desde ? 1 : a.orden - b.orden;
        });
    });
  }

  /** Cierra una confirmación: correctasPonderadas sobre total preguntas. Aprobada -> sube el
   * nivel de ESA habilidad (y anota la celebración); si no, conserva 15 y reintenta en 7 días. */
  function aplicarResultadoConfirmacion(habilidad, correctasPonderadas, total, ahora) {
    var hoyISO = global.App.Fecha.hoyISO(ahora);
    return encolarAvance(function () {
      return obtenerEstadosAvance().then(function (estados) {
        var antes = nivelGlobalDeEstados(estados).nivel;
        var resultado = global.App.Avance.evaluarConfirmacion(correctasPonderadas, total);
        var r = global.App.Avance.aplicarConfirmacion(estados[habilidad], resultado, hoyISO);
        var guardado = resultado.valida ? guardarEstadoAvance(habilidad, r.estado) : Promise.resolve();
        return guardado.then(function () {
          var nuevosEstados = Object.assign({}, estados);
          nuevosEstados[habilidad] = r.estado;
          if (r.subio) {
            global.App.Util.anotarCelebracion({ tipo: "habilidad", habilidad: habilidad, nivel: r.estado.nivel });
            var despues = nivelGlobalDeEstados(nuevosEstados).nivel;
            if (global.App.Avance.indiceNivel(despues) > global.App.Avance.indiceNivel(antes)) {
              global.App.Util.anotarCelebracion({ tipo: "cefr", nivel: despues });
            }
          }
          return {
            valida: resultado.valida,
            aprobada: resultado.aprobada,
            porcentaje: resultado.porcentaje,
            subio: r.subio,
            nivelNuevo: r.estado.nivel,
            fechaReintento: global.App.Avance.fechaReintento(r.estado),
            estado: r.estado
          };
        });
      });
    });
  }

  /** Guarda un diagnóstico y reparte su resultado al avance continuo:
   *  - modo "reevaluacion" (mini-reevaluación de las 4 semanas): puede confirmar o SUBIR cada
   *    habilidad, NUNCA bajarla (si salió más bajo: acción "repasa", nivel sin cambios).
   *  - cualquier otro (primer diagnóstico, o uno que Alex repite a propósito): fija el nivel
   *    de cada habilidad al medido; si el nivel no cambió conserva su ventana.
   * Devuelve {registro, acciones:{habilidad:{accion, nivelMedido, nivel}}}. */
  function guardarDiagnostico(resultado, opciones) {
    var modo = opciones && opciones.modo;
    var registro = Object.assign({ id: String(Date.now()) }, resultado);
    return encolarAvance(function () {
      return Promise.all([obtenerUltimoDiagnostico(), obtenerEstadosAvance()]).then(function (res) {
        var anterior = res[0];
        var estados = res[1];
        var antes = nivelGlobalDeEstados(estados).nivel;
        var acciones = {};
        var nuevos = {};
        HABILIDADES_PLAN.forEach(function (h) {
          var medido = registro.porHabilidad && registro.porHabilidad[h] && registro.porHabilidad[h].nivelCEFR;
          if (!medido) {
            nuevos[h] = estados[h];
            return;
          }
          if (modo === "reevaluacion" && anterior) {
            var r = global.App.Avance.aplicarReevaluacion(estados[h], medido);
            nuevos[h] = r.estado;
            acciones[h] = { accion: r.accion, nivelMedido: medido, nivel: r.estado.nivel };
          } else {
            nuevos[h] = medido === estados[h].nivel && anterior ? estados[h] : global.App.Avance.estadoHabilidadVacio(medido, h);
            acciones[h] = { accion: "fija", nivelMedido: medido, nivel: nuevos[h].nivel };
          }
        });
        var despues = nivelGlobalDeEstados(nuevos).nivel;
        // Solo si ya había un diagnóstico previo Y el nivel global SUBIÓ (el primero no celebra).
        if (anterior && global.App.Avance.indiceNivel(despues) > global.App.Avance.indiceNivel(antes)) {
          global.App.Util.anotarCelebracion({ tipo: "cefr", nivel: despues });
        }
        return Promise.all(
          [global.App.Storage.put("diagnostico_resultados", registro)].concat(
            HABILIDADES_PLAN.map(function (h) {
              return guardarEstadoAvance(h, nuevos[h]);
            })
          )
        ).then(function () {
          return { registro: registro, acciones: acciones, estados: nuevos };
        });
      });
    });
  }

  /** Tarjetas de repaso que DEBERÍAN existir según el contenido actual de fase 1. */
  function tarjetasDesdeContenido(vocabJson, frasesJson, ahora) {
    var vocab = vocabJson.palabras || [];
    var frases = frasesJson.categorias || [];
    var tarjetas = [];
    vocab.forEach(function (v) {
      // Tarjeta RETIRADA (duplica a otra, D31): no se crea si no existía, y si ya existe se
      // conserva con su SM-2 pero marcada `retirada` (ver sembrarTarjetasSiHaceFalta).
      var t = global.App.SRS.tarjetaNueva("voc-" + v.id, ahora);
      if (v.retirada) t.retirada = true;
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
          if (!d.retirada) escrituras.push(d); // una tarjeta retirada que nunca existió simplemente no se crea
        } else if (
          e.nivelCEFR !== d.nivelCEFR || e.tipo !== d.tipo || e.frente !== d.frente || e.atras !== d.atras ||
          !!e.retirada !== !!d.retirada
        ) {
          // Solo se actualizan los campos de contenido: el estado SM-2 (repeticiones, intervalo,
          // facilidad, próxima fecha) NO se toca, ni siquiera en una tarjeta retirada.
          var nueva = Object.assign({}, e, { nivelCEFR: d.nivelCEFR, tipo: d.tipo, frente: d.frente, atras: d.atras });
          if (d.retirada) nueva.retirada = true;
          else delete nueva.retirada;
          escrituras.push(nueva);
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

  /** Nivel CEFR global actual de Alex (ponderado, App.Avance, con el avance continuo real);
   * "A1" si todavía no hay diagnóstico. */
  function obtenerNivelGlobalActual() {
    return obtenerEstadosAvance().then(function (estados) {
      return nivelGlobalDeEstados(estados).nivel;
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
        if (t.retirada) return; // duplicadas retiradas (D31): ya no se repasan
        if ((t.repeticiones || 0) === 0) {
          nuevas++;
        } else if (global.App.SRS.estaParaRepasar(t, ahora)) {
          vencidas++;
        }
      });
      return { vencidas: vencidas, nuevas: nuevas };
    });
  }

  /** Nivel CEFR real de cada habilidad: el avance continuo (D29), que arranca del último
   * diagnóstico (D8: el diagnóstico en sí no cambia). Sin diagnóstico todas quedan en "A1" --
   * obtenerOCalcularPlanDeHoy ya resuelve ese caso aparte (sin diagnóstico, el plan es solo
   * Diagnóstico). */
  function armarHabilidadesParaPlan() {
    return Promise.all([obtenerEstadosAvance(), obtenerUltimaPracticaPorHabilidad()]).then(function (res) {
      var estados = res[0];
      var fechas = res[1];
      var habilidades = {};
      HABILIDADES_PLAN.forEach(function (h) {
        habilidades[h] = { nivelCEFR: estados[h].nivel, ultimaPractica: fechas[h] || null };
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
      obtenerNivelesConContenido(),
      obtenerConfirmacionesPendientes(ahora)
    ]).then(function (res) {
      var diagnostico = res[0];
      var tarjetas = res[1];
      var habilidades = res[2];
      var prefs = res[3];
      var ultimaHabilidadRotada = res[4];
      var semanasDesdeUltimaReevaluacion = res[5];
      var nivelesConContenido = res[6];
      var confirmaciones = res[7];
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
        nivelesConContenido: nivelesConContenido,
        confirmaciones: confirmaciones
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

  /** Un plan ya guardado no se recalcula (determinismo), PERO si una habilidad acaba de quedar
   * "lista para confirmar" (p. ej. al terminar la práctica de hoy) se le AGREGA al final el paso
   * "Confirma tu nivel de <habilidad>": así llega en horas, no mañana. Solo si el plan no tiene ya
   * un paso de confirmación ni una reevaluación general (que ya cubre esa verificación). */
  function reconciliarConfirmaciones(plan, ahora) {
    var tieneConfirmacionOReevaluacion = plan.pasos.some(function (p) {
      return p.tipo === "confirmacion" || p.tipo === "reevaluacion";
    });
    if (tieneConfirmacionOReevaluacion) return Promise.resolve(plan);
    return obtenerConfirmacionesPendientes(ahora).then(function (pendientes) {
      if (!pendientes.length) return plan;
      var c = pendientes[0];
      plan.pasos.push(
        Object.assign({ completado: false }, global.App.Plan.pasoConfirmacion(c.habilidad, c.nivelActual, c.nivelObjetivo))
      );
      plan.totalMinutos = plan.pasos.reduce(function (t, p) {
        return t + p.minutos;
      }, 0);
      return global.App.Storage.put("plan", plan).then(function () {
        return plan;
      });
    });
  }

  function obtenerOCalcularPlanDeHoy(ahora) {
    var hoyISO = global.App.Fecha.hoyISO(ahora);
    return global.App.Storage.get("plan", hoyISO).then(function (existente) {
      if (!existente) return calcularYGuardarPlan(ahora, hoyISO);
      if (!esPlanSoloDiagnostico(existente)) return reconciliarConfirmaciones(existente, ahora);
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
    obtenerEstadosAvance: obtenerEstadosAvance,
    obtenerNivelesHabilidad: obtenerNivelesHabilidad,
    registrarRespuestaAvance: registrarRespuestaAvance,
    obtenerConfirmacionesPendientes: obtenerConfirmacionesPendientes,
    aplicarResultadoConfirmacion: aplicarResultadoConfirmacion,
    obtenerUltimaPracticaPorHabilidad: obtenerUltimaPracticaPorHabilidad,
    registrarPracticaHabilidad: registrarPracticaHabilidad,
    contarTarjetasRepaso: contarTarjetasRepaso,
    obtenerOCalcularPlanDeHoy: obtenerOCalcularPlanDeHoy,
    marcarPasoCompletado: marcarPasoCompletado
  };
})(typeof window !== "undefined" ? window : globalThis);
