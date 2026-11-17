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

      var chipsHtml = ["lectura", "escucha", "habla", "escritura"]
        .map(function (habilidad) {
          var nivelCEFR = diagnostico && diagnostico.porHabilidad[habilidad] ? diagnostico.porHabilidad[habilidad].nivelCEFR : "—";
          return '<span class="chip ' + skillChipClase(habilidad) + '">' + habilidad + ": " + nivelCEFR + "</span>";
        })
        .join(" ");

      el.innerHTML =
        '<h1 data-i18n-live="inicio.titulo"></h1>' +
        '<div class="hero-bloque">' +
        '<p class="hero-numero">' +
        racha.rachaActual +
        "</p>" +
        '<p class="texto-tenue" data-i18n-live="inicio.racha.etiqueta"></p>' +
        "</div>" +
        '<div class="tarjeta">' +
        '<p class="texto-tenue">' +
        t("inicio.meta.etiqueta") +
        ": " +
        minutosHoy +
        "/" +
        prefs.metaMinutosDia +
        " min</p>" +
        '<div class="barra-progreso"><span style="width:' +
        porcentajeMeta +
        '%"></span></div>' +
        "</div>" +
        '<div class="tarjeta">' +
        "<p>Nivel " +
        nivel +
        " · " +
        xp.total +
        " XP</p>" +
        "</div>" +
        '<button type="button" class="boton-principal" id="btn-empezar-repaso" data-i18n-live="nav.repaso"></button>' +
        '<p style="margin-top:16px">' +
        chipsHtml +
        "</p>";

      el.querySelectorAll("[data-i18n-live]").forEach(function (nodo) {
        nodo.textContent = t(nodo.getAttribute("data-i18n-live"));
      });
      el.querySelector("#btn-empezar-repaso").textContent = t("repaso.titulo");
      el.querySelector("#btn-empezar-repaso").addEventListener("click", function () {
        location.hash = "#/repaso";
      });
    });
  }

  global.App = global.App || {};
  global.App.Screens = global.App.Screens || {};
  global.App.Screens.inicio = { render: render };
})(typeof window !== "undefined" ? window : globalThis);
