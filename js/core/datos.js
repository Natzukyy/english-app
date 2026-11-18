/* App.Datos — orquesta App.Storage (IndexedDB) con los módulos puros (Racha/XP/Progreso).
   Vive aparte de storage.js porque sí conoce las reglas de negocio (qué campos tiene cada
   registro); storage.js solo sabe guardar/leer objetos por id. No se prueba con el runner
   de JXA porque depende de IndexedDB (igual que storage.js). */
(function (global) {
  "use strict";

  var PREFERENCIAS_POR_DEFECTO = { id: "preferencias", metaMinutosDia: 15, tema: "sistema" };

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
   * actualiza el registro del día y el XP total. Devuelve el XP ganado y el estado nuevo. */
  function registrarSesion(minutos, ejerciciosCorrectos, ahora) {
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
        global.App.Storage.put("xp", xpNueva)
      ]).then(function () {
        return { xpGanada: resultado.xpGanada, xpTotal: resultado.xpTotal, minutosHoy: resultado.minutosHoy };
      });
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
    sembrarTarjetasSiHaceFalta: sembrarTarjetasSiHaceFalta
  };
})(typeof window !== "undefined" ? window : globalThis);
