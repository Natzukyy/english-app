(function (global) {
  "use strict";

  var ICONO_POR_HABILIDAD = { lectura: "libro", escucha: "auriculares", habla: "microfono", escritura: "pluma" };
  var NOMBRE_HABILIDAD = { lectura: "Lectura", escucha: "Escucha", habla: "Habla", escritura: "Escritura" };

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

      // Tarjetas de habilidad: mosaico de ícono + nombre + barra de progreso (% hacia B2 del
      // último diagnóstico, ya calculado por App.Diagnostico) o "Sin datos" si no hay
      // diagnóstico todavía -- nunca una raya suelta.
      var tarjetasHtml = ["lectura", "escucha", "habla", "escritura"]
        .map(function (habilidad) {
          var datosHabilidad = diagnostico && diagnostico.porHabilidad[habilidad];
          var porcentaje = datosHabilidad ? datosHabilidad.porcentajeHaciaB2 : null;
          // Solo "habla" tiene pantalla propia por ahora (ver BLOQUEOS.md B5): es la única
          // tarjeta que navega a algún lado. Las demás se quedan como detalle visual.
          var esClickeable = habilidad === "habla";
          var etiqueta = esClickeable ? '<button type="button" class="tarjeta-habilidad" data-ruta-a="habla">' : '<div class="tarjeta-habilidad">';
          var cierre = esClickeable ? "</button>" : "</div>";
          return (
            etiqueta +
            '<div class="icono-mosaico" aria-hidden="true">' +
            Iconos.svg(ICONO_POR_HABILIDAD[habilidad], 24) +
            "</div>" +
            '<span class="nombre-habilidad">' +
            NOMBRE_HABILIDAD[habilidad] +
            "</span>" +
            (porcentaje === null
              ? '<span class="texto-tenue texto-caption">Sin datos</span>'
              : '<div class="barra-progreso"><span data-destino="' + porcentaje + '" style="width:0%"></span></div>') +
            cierre
          );
        })
        .join("");

      // Ruta de sesiones: 3 pasos reales y accionables hoy (diagnóstico, repaso, habla),
      // derivados de datos que ya existen (nada se inventa). Sin candados: "pendiente" se ve
      // más discreto que "actual", pero igual de tocable -- Repaso y Habla siempre se pueden
      // abrir, nunca están realmente bloqueados.
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
      // Habla comparte el mismo registro de sesión del día que repaso (ambos llaman a
      // App.Datos.registrarSesion), así que no hay forma honesta de saber si "habla"
      // específicamente ya se practicó hoy -- no se le pone un "completado" falso.
      var pasoHabla = {
        titulo: "Habla",
        estado: !diagnostico ? "pendiente" : "actual",
        descripcion: "Practica con reconocimiento de voz",
        ruta: "habla"
      };
      // Conversación con IA (D24): nodo siempre visible, pero solo tiene sentido tocarlo
      // después de que Alex despliegue su propio proxy y lo active en Ajustes -- la pantalla
      // misma explica qué falta, así que aquí no hay candado ni estado especial por eso.
      var pasoConversacion = {
        titulo: "Conversación con IA",
        estado: !diagnostico ? "pendiente" : "actual",
        descripcion: "Practica conversación con un modelo de lenguaje",
        ruta: "conversacion"
      };
      var rutaHtml = [pasoDiagnostico, pasoRepaso, pasoHabla, pasoConversacion]
        .map(function (paso) {
          var contenidoCirculo = paso.estado === "completado" ? Iconos.svg("check", 18) : "";
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
        '<div class="pantalla-vista flujo-inicio">' +
        '<h1 data-i18n-live="inicio.titulo"></h1>' +
        '<div class="tarjeta">' +
        '<div class="fila">' +
        '<p class="hero-numero num-tabular" id="valor-racha">0</p>' +
        '<p class="hero-etiqueta">' +
        '<span id="icono-flama"' +
        (sesionHoy.metaCumplida ? ' class="flama-animada"' : "") +
        ">" +
        Iconos.svg("flama", 16) +
        "</span>" +
        '<span data-i18n-live="inicio.racha.etiqueta"></span></p>' +
        "</div>" +
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
        '<div class="tarjetas-habilidad entrada-escalonada">' +
        tarjetasHtml +
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
      el.querySelectorAll(".tarjeta-habilidad .barra-progreso > span[data-destino]").forEach(function (span) {
        global.App.Util.animarBarra(span, span.getAttribute("data-destino"));
      });
    });
  }

  global.App = global.App || {};
  global.App.Screens = global.App.Screens || {};
  global.App.Screens.inicio = { render: render };
})(typeof window !== "undefined" ? window : globalThis);
