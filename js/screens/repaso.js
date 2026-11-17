(function (global) {
  "use strict";

  // Estado de la sesión en curso (vive mientras el usuario está en esta pantalla).
  var sesion = null; // { cola: [tarjeta,...], indice, inicioMs, correctas }

  function finalizarSesionSiActiva() {
    if (!sesion || sesion.finalizada) return Promise.resolve();
    sesion.finalizada = true;
    var minutos = Math.max(sesion.cola.length > 0 ? 1 : 0, Math.round((Date.now() - sesion.inicioMs) / 60000));
    if (sesion.indice === 0) return Promise.resolve(); // no contestó ninguna tarjeta, no cuenta sesión
    return global.App.Datos.registrarSesion(minutos, sesion.correctas, new Date());
  }

  function render(el, ctx) {
    var t = function (clave) {
      return global.App.I18n.texto(clave, ctx.nivelInterfaz, ctx.strings);
    };
    var Datos = global.App.Datos;

    el.innerHTML = '<div class="estado-vacio">…</div>';

    Datos.sembrarTarjetasSiHaceFalta(new Date())
      .then(function () {
        return global.App.Storage.getAll("srs_cards");
      })
      .then(function (todas) {
        var ahora = new Date();
        var pendientes = todas.filter(function (c) {
          return global.App.SRS.estaParaRepasar(c, ahora);
        });
        sesion = { cola: pendientes, indice: 0, inicioMs: Date.now(), correctas: 0, finalizada: false };
        pintarTarjetaActual(el, ctx, t);
      });
  }

  function pintarTarjetaActual(el, ctx, t) {
    if (!sesion || sesion.indice >= sesion.cola.length) {
      finalizarSesionSiActiva().then(function (resultado) {
        el.innerHTML =
          '<h1 data-i18n-live="repaso.titulo"></h1>' +
          '<div class="tarjeta"><p>¡Listo por hoy! Repasaste ' +
          (sesion ? sesion.indice : 0) +
          " tarjeta(s)." +
          (resultado && resultado.xpGanada ? " +" + resultado.xpGanada + " XP." : "") +
          "</p></div>";
        el.querySelectorAll("[data-i18n-live]").forEach(function (nodo) {
          nodo.textContent = t(nodo.getAttribute("data-i18n-live"));
        });
      });
      return;
    }

    var tarjeta = sesion.cola[sesion.indice];
    el.innerHTML =
      '<h1 data-i18n-live="repaso.titulo"></h1>' +
      '<p class="texto-tenue">' +
      (sesion.indice + 1) +
      " / " +
      sesion.cola.length +
      "</p>" +
      '<div class="tarjeta hero-bloque">' +
      '<p style="font-size:22px">' +
      tarjeta.frente +
      "</p>" +
      '<p class="texto-tenue" id="repaso-atras" style="display:none;margin-top:8px">' +
      tarjeta.atras +
      "</p>" +
      "</div>" +
      '<button type="button" class="boton-principal" id="btn-mostrar">Mostrar respuesta</button>' +
      '<div id="repaso-calificar" style="display:none;margin-top:12px;grid-template-columns:1fr 1fr;gap:8px">' +
      '<button type="button" class="boton-secundario" data-calidad="1">No la sabía</button>' +
      '<button type="button" class="boton-secundario" data-calidad="3">Difícil</button>' +
      '<button type="button" class="boton-secundario" data-calidad="4">Bien</button>' +
      '<button type="button" class="boton-secundario" data-calidad="5">Fácil</button>' +
      "</div>";

    el.querySelectorAll("[data-i18n-live]").forEach(function (nodo) {
      nodo.textContent = t(nodo.getAttribute("data-i18n-live"));
    });

    el.querySelector("#btn-mostrar").addEventListener("click", function () {
      el.querySelector("#repaso-atras").style.display = "block";
      el.querySelector("#repaso-calificar").style.display = "grid";
      el.querySelector("#btn-mostrar").style.display = "none";
    });

    el.querySelectorAll("#repaso-calificar button").forEach(function (boton) {
      boton.addEventListener("click", function () {
        var calidad = Number(boton.getAttribute("data-calidad"));
        var actualizada = global.App.SRS.calificarTarjeta(tarjeta, calidad, new Date());
        actualizada.frente = tarjeta.frente;
        actualizada.atras = tarjeta.atras;
        actualizada.tipo = tarjeta.tipo;
        if (calidad >= 3) sesion.correctas += 1;
        global.App.Storage.put("srs_cards", actualizada).then(function () {
          sesion.indice += 1;
          pintarTarjetaActual(el, ctx, t);
        });
      });
    });
  }

  global.addEventListener("hashchange", function () {
    if (location.hash.indexOf("repaso") === -1) finalizarSesionSiActiva();
  });

  global.App = global.App || {};
  global.App.Screens = global.App.Screens || {};
  global.App.Screens.repaso = { render: render };
})(typeof window !== "undefined" ? window : globalThis);
