(function (global) {
  "use strict";

  var ICONO_POR_HABILIDAD = { lectura: "libro", escucha: "auriculares", habla: "microfono", escritura: "pluma" };
  var CIRCUNFERENCIA_ANILLO = 150.8; // 2 * PI * 24 (radio del <circle> del anillo)

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

      // Nodos de habilidad: icono propio + anillo de progreso (% hacia B2 del último
      // diagnóstico, ya calculado por App.Diagnostico -- aquí solo se lee y se dibuja).
      var nodosHtml = ["lectura", "escucha", "habla", "escritura"]
        .map(function (habilidad) {
          var datosHabilidad = diagnostico && diagnostico.porHabilidad[habilidad];
          var nivelCEFRCrudo = datosHabilidad ? datosHabilidad.nivelCEFR : "—";
          return (
            '<div class="nodo-habilidad">' +
            '<div class="anillo">' +
            '<svg viewBox="0 0 56 56" aria-hidden="true">' +
            '<circle class="pista" cx="28" cy="28" r="24" stroke-width="4"></circle>' +
            '<circle class="progreso" data-habilidad="' +
            habilidad +
            '" cx="28" cy="28" r="24" stroke-width="4" stroke-dasharray="' +
            CIRCUNFERENCIA_ANILLO +
            '" stroke-dashoffset="' +
            CIRCUNFERENCIA_ANILLO +
            '"></circle>' +
            "</svg>" +
            '<span class="icono-centro">' +
            Iconos.svg(ICONO_POR_HABILIDAD[habilidad], 22) +
            "</span>" +
            "</div>" +
            '<span class="texto-caption">' +
            habilidad +
            "</span>" +
            '<span class="nivel">' +
            esc(nivelCEFRCrudo) +
            "</span>" +
            "</div>"
          );
        })
        .join("");

      // Ruta de sesiones: SOLO 2 pasos reales y accionables hoy (diagnóstico + repaso),
      // derivados de datos que ya existen (nada se inventa). Lecturas y ejercicios de habla
      // todavía no tienen pantalla propia que los muestre -- ver BLOQUEOS.md B5: por eso no
      // son parte de la ruta todavía (un nodo que no lleva a ningún lado sería peor que no
      // tener ese nodo).
      var pasoDiagnostico = {
        titulo: "Diagnóstico",
        estado: diagnostico ? "completado" : "actual",
        descripcion: diagnostico ? "Hecho el " + esc(diagnostico.fecha) : "Para estimar tu nivel por habilidad",
        ruta: "diagnostico"
      };
      var repasoHecho = !!sesionHoy.metaCumplida;
      var pasoRepaso = {
        titulo: "Repaso de hoy",
        estado: !diagnostico ? "pendiente" : repasoHecho ? "completado" : "actual",
        descripcion: repasoHecho ? "Meta de hoy cumplida" : minutosHoy > 0 ? "En curso — " + esc(minutosHoy) + " min hasta ahora" : "Todavía no empiezas hoy",
        ruta: "repaso"
      };
      var rutaHtml = [pasoDiagnostico, pasoRepaso]
        .map(function (paso) {
          var contenidoCirculo = paso.estado === "completado" ? Iconos.svg("check", 18) : paso.estado === "pendiente" ? Iconos.svg("candado", 16) : "";
          return (
            '<div class="ruta-nodo ' +
            paso.estado +
            '">' +
            '<div class="ruta-circulo">' +
            contenidoCirculo +
            "</div>" +
            '<button type="button" class="ruta-boton" data-ruta-a="' +
            paso.ruta +
            '"><span class="titulo">' +
            paso.titulo +
            '</span><span class="estado">' +
            paso.descripcion +
            "</span></button>" +
            "</div>"
          );
        })
        .join("");

      el.innerHTML =
        '<div class="pantalla-vista">' +
        '<h1 data-i18n-live="inicio.titulo"></h1>' +
        '<div class="panel-dos-columnas">' +
        '<div class="panel-col">' +
        '<div class="hero-bloque">' +
        '<p class="hero-numero num-tabular" id="valor-racha">0</p>' +
        '<p class="hero-etiqueta">' +
        '<span id="icono-flama"' +
        (sesionHoy.metaCumplida ? ' class="flama-animada"' : "") +
        ">" +
        Iconos.svg("flama", 16) +
        "</span>" +
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
        "</div>" +
        '<div class="panel-col">' +
        '<div class="nodos-habilidad entrada-escalonada">' +
        nodosHtml +
        "</div>" +
        "</div>" +
        "</div>" +
        '<div class="seccion">' +
        "<h2>Tu camino</h2>" +
        '<div class="ruta-sesiones entrada-escalonada">' +
        rutaHtml +
        "</div>" +
        "</div>" +
        "</div>";

      el.querySelectorAll("[data-i18n-live]").forEach(function (nodo) {
        nodo.textContent = t(nodo.getAttribute("data-i18n-live"));
      });
      el.querySelector("#btn-empezar-repaso").textContent = t("repaso.titulo");
      el.querySelector("#btn-empezar-repaso").addEventListener("click", function () {
        location.hash = "#/repaso";
      });
      el.querySelectorAll("[data-ruta-a]").forEach(function (boton) {
        boton.addEventListener("click", function () {
          location.hash = "#/" + boton.getAttribute("data-ruta-a");
        });
      });

      global.App.Util.animarNumero(el.querySelector("#valor-racha"), racha.rachaActual);
      global.App.Util.animarNumero(el.querySelector("#valor-xp"), xp.total);
      global.App.Util.animarBarra(el.querySelector("#barra-meta"), porcentajeMeta);
      el.querySelectorAll(".anillo circle.progreso").forEach(function (circulo) {
        var habilidad = circulo.getAttribute("data-habilidad");
        var datosHabilidad = diagnostico && diagnostico.porHabilidad[habilidad];
        var porcentaje = datosHabilidad ? datosHabilidad.porcentajeHaciaB2 : 0;
        global.App.Util.animarAnillo(circulo, porcentaje, CIRCUNFERENCIA_ANILLO);
      });
    });
  }

  global.App = global.App || {};
  global.App.Screens = global.App.Screens || {};
  global.App.Screens.inicio = { render: render };
})(typeof window !== "undefined" ? window : globalThis);
