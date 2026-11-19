(function (global) {
  "use strict";

  var FECHA_OBJETIVO = "2027-03-31"; // PROMPT_BASE.md: "B2 a finales de marzo de 2027"

  // Nombres legibles para las claves de App.Diagnostico.construirResultado (nunca se
  // muestran directo en pantalla -- mismo criterio que diagnostico.js).
  var NOMBRE_HABILIDAD_RESULTADO = {
    lectura: "Lectura",
    escucha: "Escucha",
    vocabulario_gramatica: "Vocabulario y gramática",
    habla: "Habla",
    escritura: "Escritura"
  };

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
          '<div class="pantalla-vista">' +
          '<h1 data-i18n-live="progreso.titulo"></h1>' +
          '<div class="estado-vacio" data-i18n-live="progreso.vacio"></div>' +
          '<button type="button" class="boton-principal" id="btn-ir-diagnostico">Hacer diagnóstico</button>' +
          "</div>";
        el.querySelectorAll("[data-i18n-live]").forEach(function (nodo) {
          nodo.textContent = t(nodo.getAttribute("data-i18n-live"));
        });
        el.querySelector("#btn-ir-diagnostico").addEventListener("click", function () {
          location.hash = "#/diagnostico";
        });
        return;
      }

      var esc = global.App.Util.escaparHTML;
      // Todo lo que sale de "diagnostico" y "xp" viene de IndexedDB (puede venir de un
      // respaldo importado): se escapa antes de insertarlo como HTML. Ver DECISIONES.md D10.
      var filas = Object.keys(diagnostico.porHabilidad)
        .map(function (h) {
          var r = diagnostico.porHabilidad[h];
          var porcentaje = Math.max(0, Math.min(100, Number(r.porcentajeHaciaB2) || 0));
          return (
            '<div class="fila">' +
            '<div class="fila-cabeza"><span>' +
            esc(NOMBRE_HABILIDAD_RESULTADO[h] || h) +
            " — <strong>" +
            esc(r.nivelCEFR) +
            "</strong></span></div>" +
            '<div class="barra-progreso" data-habilidad="' +
            esc(h) +
            '"><span data-destino="' +
            porcentaje +
            '" style="width:0%"></span></div>' +
            "</div>"
          );
        })
        .join("");

      el.innerHTML =
        '<div class="pantalla-vista">' +
        '<h1 data-i18n-live="progreso.titulo"></h1>' +
        '<div class="hero-bloque"><p class="hero-numero num-tabular" id="valor-nivel">0</p>' +
        '<p class="texto-tenue num-tabular">nivel · <span id="valor-xp">0</span> XP · racha <span id="valor-racha">0</span></p></div>' +
        '<div class="seccion entrada-escalonada grid-progreso">' +
        filas +
        "</div>" +
        '<p class="texto-tenue">Diagnóstico del ' +
        esc(diagnostico.fecha) +
        ". Meta: B2 para el " +
        FECHA_OBJETIVO +
        " (" +
        (diasRestantes > 0 ? diasRestantes + " días restantes" : "fecha ya pasada") +
        ").</p>" +
        '<button type="button" class="boton-secundario" id="btn-repetir-diagnostico">Repetir diagnóstico</button>' +
        "</div>";

      el.querySelectorAll("[data-i18n-live]").forEach(function (nodo) {
        nodo.textContent = t(nodo.getAttribute("data-i18n-live"));
      });
      el.querySelector("#btn-repetir-diagnostico").addEventListener("click", function () {
        location.hash = "#/diagnostico";
      });

      global.App.Util.animarNumero(el.querySelector("#valor-nivel"), global.App.XP.nivelDesdeXP(xp.total));
      global.App.Util.animarNumero(el.querySelector("#valor-xp"), xp.total);
      global.App.Util.animarNumero(el.querySelector("#valor-racha"), racha.rachaActual);
      el.querySelectorAll(".barra-progreso > span[data-destino]").forEach(function (span) {
        global.App.Util.animarBarra(span, span.getAttribute("data-destino"));
      });
    });
  }

  global.App = global.App || {};
  global.App.Screens = global.App.Screens || {};
  global.App.Screens.progreso = { render: render };
})(typeof window !== "undefined" ? window : globalThis);
