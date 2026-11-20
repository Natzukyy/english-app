/* Progreso -- rediseño "Calcomanías oscuro" (ver DECISIONES.md, Fase A). Escala de nivel
   ABIERTA (A1-C2): ya no se muestra ningún lenguaje de "B2 como tope" (antes: FECHA_OBJETIVO
   + "días restantes para marzo" + "% hacia B2"). Esto solo deja de MOSTRARLO -- el motor real
   de progreso con fracciones A1-C2 es trabajo de Fase B; aquí se sigue leyendo
   r.nivelCEFR/r.porcentajeHaciaB2 tal como los da App.Diagnostico.construirResultado hoy,
   solo que porcentajeHaciaB2 ya no se presenta como "hacia B2" -- se usa nada más para
   dimensionar la barra visualmente (0-100%), sin la etiqueta vieja. */
(function (global) {
  "use strict";

  // Las 4 habilidades "de producto" (tienen --punto-* propio); vocabulario_gramatica no es
  // una de ellas (mismo criterio ya usado en Diagnóstico) -- Progreso solo muestra estas 4,
  // tal como pide el spec ("4 filas de habilidad").
  var ORDEN_HABILIDADES = ["lectura", "escucha", "habla", "escritura"];
  var DIAS_SEMANA = ["D", "L", "M", "M", "J", "V", "S"]; // getDay(): 0=domingo

  function render(el, ctx) {
    var t = global.App.I18n.traductor(ctx);

    el.innerHTML = '<div class="estado-vacio">…</div>';

    Promise.all([
      global.App.Datos.obtenerUltimoDiagnostico(),
      global.App.Datos.obtenerXP(),
      global.App.Datos.obtenerEstadoRacha(),
      global.App.Datos.obtenerMinutosPorDia(),
      global.App.Datos.obtenerPreferencias(),
      global.App.Datos.obtenerEstadosAvance()
    ]).then(function (res) {
      var diagnostico = res[0];
      var xp = res[1];
      var racha = res[2];
      var minutosPorDia = res[3];
      var prefs = res[4];
      var estadosAvance = res[5];

      if (!diagnostico) {
        el.innerHTML =
          '<div class="pantalla-vista pantalla-progreso">' +
          '<h1 data-i18n-live="progreso.titulo"></h1>' +
          '<div class="estado-vacio" data-i18n-live="progreso.vacio"></div>' +
          '<button type="button" class="calcomania calcomania-cta calcomania-presionable" id="btn-ir-diagnostico" style="background:var(--amarillo);color:var(--tinta);margin-top:16px">' + t("progreso.hacer_diagnostico") + '</button>' +
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
      var Iconos = global.App.Iconos;

      var nivel = global.App.XP.nivelDesdeXP(xp.total);
      var xpDesdeNivel = xp.total - global.App.XP.xpAcumuladaParaNivel(nivel);
      var xpParaNivel = global.App.XP.xpAcumuladaParaNivel(nivel + 1) - global.App.XP.xpAcumuladaParaNivel(nivel);
      var porcentajeXP = xpParaNivel > 0 ? Math.max(0, Math.min(100, (xpDesdeNivel / xpParaNivel) * 100)) : 100;

      // Gráfica semanal: últimos 7 días (hoy incluido, de más viejo a más nuevo). Sin datos
      // reales de QUÉ habilidad se practicó cada día (App.Datos.obtenerMinutosPorDia solo da
      // minutos totales por día) -- se simplifica a practicó/no practicó ese día (ver CSS).
      var hoyISO = global.App.Fecha.hoyISO();
      var diasHTML = "";
      for (var i = 6; i >= 0; i--) {
        var fechaISO = global.App.Fecha.sumarDias(hoyISO, -i);
        var minutos = minutosPorDia[fechaISO] || 0;
        var metaMin = prefs.metaMinutosDia || 15;
        var alturaPct = Math.max(minutos > 0 ? 14 : 0, Math.min(100, (minutos / metaMin) * 100));
        var diaSemana = DIAS_SEMANA[new Date(fechaISO + "T12:00:00").getDay()];
        var esHoy = fechaISO === hoyISO;
        diasHTML +=
          '<div class="progreso-dia-semana">' +
          '<div class="progreso-dia-barra' +
          (minutos > 0 ? " con-practica" : "") +
          '" style="height:' +
          alturaPct +
          '%"></div>' +
          '<span class="progreso-dia-etiqueta' +
          (esHoy ? " es-hoy" : "") +
          '">' +
          esc(diaSemana) +
          "</span>" +
          "</div>";
      }

      // Avance REAL por habilidad (D29): nivel actual + fracción dentro del nivel (ventana de las
      // últimas 30 respuestas). Dos barras: la escala A1-C2 y la de "hacia el siguiente nivel",
      // que es la que se mueve visiblemente tras cada sesión.
      var filasHabilidad = ORDEN_HABILIDADES.filter(function (h) {
        return diagnostico.porHabilidad[h];
      })
        .map(function (h) {
          var est = estadosAvance[h];
          var porcentaje = global.App.Avance.porcentajeEnEscala(est.nivel, global.App.Avance.porcentajeDeHabilidad(est)); // escala abierta A1..C2
          var siguiente = global.App.Avance.siguienteNivelDe(est.nivel);
          var pctNivel = global.App.Avance.porcentajeDeHabilidad(est);
          var falta = global.App.Avance.textoDeFalta(est);
          var detalle;
          if (!siguiente) detalle = t("inicio.nivel_maximo");
          else if (falta.tipo === "lista") detalle = t("avance.lista_para_confirmar_detalle", { nivel: siguiente });
          else if (falta.tipo === "faltan") detalle = t("inicio.pct_hacia", { pct: pctNivel, nivel: siguiente }) + " · " + t(falta.faltan === 1 ? "avance.falta_una" : "avance.faltan_n", { n: falta.faltan });
          else if (falta.tipo === "aciertos") detalle = t("inicio.pct_hacia", { pct: pctNivel, nivel: siguiente }) + " · " + t("avance.necesitas_aciertos");
          else detalle = t("inicio.pct_hacia", { pct: pctNivel, nivel: siguiente });
          return (
            '<div class="progreso-tarjeta-habilidad superficie-oscura">' +
            '<div class="fila-cabeza"><span>' +
            esc(t("habilidad." + h)) +
            "</span>" +
            '<span class="diagnostico-pastilla-nivel" style="background:var(--punto-' +
            h +
            ')">' +
            esc(global.App.Avance.etiquetaNivel(est.nivel, h)) +
            "</span></div>" +
            '<div class="progreso-barra-fila"><span class="progreso-barra-etiqueta texto-caption">' + esc(t("progreso.barra_escala")) + "</span>" +
            '<div class="barra-progreso barra-escala" data-habilidad="' + esc(h) + '" style="--progreso:0"><span data-destino="' + porcentaje + '"></span></div></div>' +
            (siguiente
              ? '<div class="progreso-barra-fila"><span class="progreso-barra-etiqueta texto-caption">' + esc(t("progreso.barra_nivel", { nivel: siguiente })) + "</span>" +
                '<div class="barra-progreso barra-escala barra-nivel" data-habilidad="' + esc(h) + '" style="--progreso:0"><span data-destino="' + pctNivel + '"></span></div></div>'
              : "") +
            '<p class="progreso-detalle-habilidad texto-caption">' + esc(detalle) + "</p>" +
            "</div>"
          );
        })
        .join("");

      el.innerHTML =
        '<div class="pantalla-vista pantalla-progreso">' +
        '<div class="progreso-cabecera">' +
        '<h1 data-i18n-live="progreso.titulo"></h1>' +
        '<button type="button" class="calcomania calcomania-presionable" id="btn-repetir-diagnostico" style="background:var(--crema);color:var(--tinta)">' + esc(t("progreso.repetir_diagnostico")) + '</button>' +
        "</div>" +
        '<div class="progreso-fila-superior pop-entrada-escalonada">' +
        '<div class="progreso-tarjeta progreso-tarjeta-nivel calcomania calcomania-presionable">' +
        '<p class="progreso-etiqueta">' + esc(t("progreso.nivel")) + '</p>' +
        '<p class="progreso-numero-nivel num-tabular" id="valor-nivel">0</p>' +
        '<div class="barra-progreso barra-escala" style="--progreso:0"><span id="barra-xp" data-destino="' +
        porcentajeXP +
        '" style="background:var(--tinta)"></span></div>' +
        '<p class="progreso-xp-texto num-tabular"><span id="valor-xp">0</span> / ' +
        Math.round(global.App.XP.xpAcumuladaParaNivel(nivel + 1)) +
        " XP</p>" +
        "</div>" +
        '<div class="progreso-tarjeta progreso-tarjeta-racha superficie-oscura">' +
        '<p class="progreso-etiqueta">' + esc(t("progreso.racha")) + '</p>' +
        '<p class="progreso-numero-racha num-tabular">' +
        Iconos.svg("flama", 28) +
        '<span id="valor-racha">0</span></p>' +
        "</div>" +
        '<div class="progreso-tarjeta progreso-tarjeta-semana superficie-oscura">' +
        '<p class="progreso-etiqueta">' + esc(t("progreso.esta_semana")) + '</p>' +
        '<div class="progreso-grafica-semana">' +
        diasHTML +
        "</div>" +
        "</div>" +
        "</div>" +
        "<h2>" + esc(t("progreso.por_habilidad")) + "</h2>" +
        '<div class="progreso-grid-habilidad pop-entrada-escalonada">' +
        filasHabilidad +
        "</div>" +
        "</div>";

      el.querySelectorAll("[data-i18n-live]").forEach(function (nodo) {
        nodo.textContent = t(nodo.getAttribute("data-i18n-live"));
      });
      el.querySelector("#btn-repetir-diagnostico").addEventListener("click", function () {
        global.App.Util.limpiarModoPaso(); // repetir a mano = diagnóstico real, no la mini-reevaluación
        location.hash = "#/diagnostico";
      });

      global.App.Util.animarNumero(el.querySelector("#valor-nivel"), nivel);
      global.App.Util.animarNumero(el.querySelector("#valor-xp"), Math.round(xpDesdeNivel));
      global.App.Util.animarNumero(el.querySelector("#valor-racha"), racha.rachaActual);

      // Relleno por "transform: scaleX" (no "width", ver regla de animación del spec:
      // "solo transform y opacity"). Se fija "--progreso" en el frame siguiente para que la
      // transición CSS (definida en .barra-escala > span) se dispare de verdad -- si se
      // fijara en el mismo frame que el 0% inicial, el navegador no vería ningún cambio que
      // animar. prefers-reduced-motion no necesita manejo aparte: la transición ya queda
      // colapsada a ~0 por la regla global (ver css/styles.css).
      global.requestAnimationFrame(function () {
        el.querySelectorAll(".barra-escala > span[data-destino]").forEach(function (span) {
          span.style.setProperty("--progreso", (Number(span.getAttribute("data-destino")) || 0) / 100);
        });
        el.querySelectorAll(".progreso-dia-barra").forEach(function (barra) {
          barra.style.transform = "scaleY(1)";
        });
      });
    });
  }

  global.App = global.App || {};
  global.App.Screens = global.App.Screens || {};
  global.App.Screens.progreso = { render: render };
})(typeof window !== "undefined" ? window : globalThis);
