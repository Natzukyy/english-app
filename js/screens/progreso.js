(function (global) {
  "use strict";

  var FECHA_OBJETIVO = "2027-03-31"; // PROMPT_BASE.md: "B2 a finales de marzo de 2027"

  function render(el, ctx) {
    var t = function (clave) {
      return global.App.I18n.texto(clave, ctx.nivelInterfaz, ctx.strings);
    };

    el.innerHTML = '<div class="estado-vacio">…</div>';

    Promise.all([global.App.Datos.obtenerUltimoDiagnostico(), global.App.Datos.obtenerXP(), global.App.Datos.obtenerEstadoRacha()]).then(function (res) {
      var diagnostico = res[0];
      var xp = res[1];
      var racha = res[2];
      var diasRestantes = global.App.Fecha.diferenciaDias(global.App.Fecha.hoyISO(), FECHA_OBJETIVO);

      if (!diagnostico) {
        el.innerHTML =
          '<h1 data-i18n-live="progreso.titulo"></h1>' +
          '<div class="estado-vacio" data-i18n-live="progreso.vacio"></div>' +
          '<button type="button" class="boton-principal" id="btn-ir-diagnostico">Hacer diagnóstico</button>';
        el.querySelectorAll("[data-i18n-live]").forEach(function (nodo) {
          nodo.textContent = t(nodo.getAttribute("data-i18n-live"));
        });
        el.querySelector("#btn-ir-diagnostico").addEventListener("click", function () {
          location.hash = "#/diagnostico";
        });
        return;
      }

      var filas = Object.keys(diagnostico.porHabilidad)
        .map(function (h) {
          var r = diagnostico.porHabilidad[h];
          return (
            '<div class="tarjeta"><p>' +
            h +
            " — " +
            r.nivelCEFR +
            '</p><div class="barra-progreso"><span style="width:' +
            r.porcentajeHaciaB2 +
            '%"></span></div></div>'
          );
        })
        .join("");

      el.innerHTML =
        '<h1 data-i18n-live="progreso.titulo"></h1>' +
        '<div class="hero-bloque"><p class="hero-numero">' +
        global.App.XP.nivelDesdeXP(xp.total) +
        '</p><p class="texto-tenue">nivel · ' +
        xp.total +
        " XP · racha " +
        racha.rachaActual +
        "</p></div>" +
        filas +
        '<p class="texto-tenue">Diagnóstico del ' +
        diagnostico.fecha +
        ". Meta: B2 para el " +
        FECHA_OBJETIVO +
        " (" +
        (diasRestantes > 0 ? diasRestantes + " días restantes" : "fecha ya pasada") +
        ").</p>" +
        '<button type="button" class="boton-secundario" id="btn-repetir-diagnostico">Repetir diagnóstico</button>';

      el.querySelectorAll("[data-i18n-live]").forEach(function (nodo) {
        nodo.textContent = t(nodo.getAttribute("data-i18n-live"));
      });
      el.querySelector("#btn-repetir-diagnostico").addEventListener("click", function () {
        location.hash = "#/diagnostico";
      });
    });
  }

  global.App = global.App || {};
  global.App.Screens = global.App.Screens || {};
  global.App.Screens.progreso = { render: render };
})(typeof window !== "undefined" ? window : globalThis);
