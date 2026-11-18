(function (global) {
  "use strict";

  function skillChipClase(habilidad) {
    return (
      {
        lectura: "chip-lectura",
        escucha: "chip-escucha",
        habla: "chip-habla",
        escritura: "chip-escritura"
      }[habilidad] || "chip-lectura"
    );
  }

  function render(el, ctx) {
    var t = function (clave) {
      return global.App.I18n.texto(clave, ctx.nivelInterfaz, ctx.strings);
    };
    var Datos = global.App.Datos;

    el.innerHTML = '<div class="estado-vacio">…</div>';

    Promise.all([
      Datos.obtenerEstadoRacha(),
      Datos.obtenerXP(),
      Datos.obtenerPreferencias(),
      global.App.Storage.get("sesiones", global.App.Fecha.hoyISO()),
      Datos.obtenerUltimoDiagnostico()
    ]).then(function (res) {
      var racha = res[0];
      var xp = res[1];
      var prefs = res[2];
      var sesionHoy = res[3] || { minutos: 0 };
      var diagnostico = res[4];

      var nivel = global.App.XP.nivelDesdeXP(xp.total);
      var minutosHoy = sesionHoy.minutos || 0;
      var porcentajeMeta = Math.min(100, Math.round((minutosHoy / prefs.metaMinutosDia) * 100));

      var esc = global.App.Util.escaparHTML;
      var Iconos = global.App.Iconos;
      var chipsHtml = ["lectura", "escucha", "habla", "escritura"]
        .map(function (habilidad) {
          var nivelCEFRCrudo = diagnostico && diagnostico.porHabilidad[habilidad] ? diagnostico.porHabilidad[habilidad].nivelCEFR : "—";
          // nivelCEFRCrudo viene de IndexedDB (puede venir de un respaldo importado): se escapa.
          return (
            '<span class="chip ' +
            skillChipClase(habilidad) +
            '"><span class="punto" aria-hidden="true"></span>' +
            habilidad +
            ": <strong>" +
            esc(nivelCEFRCrudo) +
            "</strong></span>"
          );
        })
        .join("");

      el.innerHTML =
        '<div class="pantalla-vista">' +
        '<h1 data-i18n-live="inicio.titulo"></h1>' +
        '<div class="hero-bloque">' +
        '<p class="hero-numero num-tabular" id="valor-racha">0</p>' +
        '<p class="hero-etiqueta">' +
        Iconos.svg("flama", 16) +
        '<span data-i18n-live="inicio.racha.etiqueta"></span></p>' +
        "</div>" +
        '<div class="seccion entrada-escalonada">' +
        '<div class="fila">' +
        '<div class="fila-cabeza"><span class="texto-tenue" data-i18n-live="inicio.meta.etiqueta"></span><span class="texto-tenue num-tabular">' +
        esc(minutosHoy) +
        "/" +
        esc(prefs.metaMinutosDia) +
        ' min</span></div>' +
        '<div class="barra-progreso"><span id="barra-meta" style="width:0%"></span></div>' +
        "</div>" +
        '<div class="fila">' +
        "<p>Nivel <strong>" +
        nivel +
        '</strong> · <span class="num-tabular" id="valor-xp">0</span> XP</p>' +
        "</div>" +
        "</div>" +
        '<button type="button" class="boton-principal" id="btn-empezar-repaso" data-i18n-live="nav.repaso"></button>' +
        '<div class="lista-chips entrada-escalonada">' +
        chipsHtml +
        "</div>" +
        "</div>";

      el.querySelectorAll("[data-i18n-live]").forEach(function (nodo) {
        nodo.textContent = t(nodo.getAttribute("data-i18n-live"));
      });
      el.querySelector("#btn-empezar-repaso").textContent = t("repaso.titulo");
      el.querySelector("#btn-empezar-repaso").addEventListener("click", function () {
        location.hash = "#/repaso";
      });

      global.App.Util.animarNumero(el.querySelector("#valor-racha"), racha.rachaActual);
      global.App.Util.animarNumero(el.querySelector("#valor-xp"), xp.total);
      global.App.Util.animarBarra(el.querySelector("#barra-meta"), porcentajeMeta);
    });
  }

  global.App = global.App || {};
  global.App.Screens = global.App.Screens || {};
  global.App.Screens.inicio = { render: render };
})(typeof window !== "undefined" ? window : globalThis);
