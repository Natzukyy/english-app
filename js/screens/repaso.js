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
          '<div class="pantalla-vista ancho-lectura">' +
          '<h1 data-i18n-live="repaso.titulo"></h1>' +
          '<div class="hero-bloque">' +
          '<span style="color:var(--exito)">' +
          global.App.Iconos.svg("check", 32) +
          "</span>" +
          '<p class="texto-tenue" style="margin-top:8px">Repasaste ' +
          (sesion ? sesion.indice : 0) +
          " tarjeta(s)" +
          (resultado && resultado.xpGanada ? " · +" + resultado.xpGanada + " XP" : "") +
          "</p>" +
          "</div>" +
          "</div>";
        el.querySelectorAll("[data-i18n-live]").forEach(function (nodo) {
          nodo.textContent = t(nodo.getAttribute("data-i18n-live"));
        });
      });
      return;
    }

    var tarjeta = sesion.cola[sesion.indice];
    var esc = global.App.Util.escaparHTML;
    var porcentaje = Math.round((sesion.indice / sesion.cola.length) * 100);
    // tarjeta.frente/atras vienen de IndexedDB (sembradas por nosotros, pero sustituibles por
    // un respaldo importado): se escapan antes de insertarlas como HTML.
    el.innerHTML =
      '<div class="pantalla-vista ancho-lectura">' +
      '<h1 data-i18n-live="repaso.titulo"></h1>' +
      '<div class="fila-cabeza"><span class="texto-tenue num-tabular">' +
      (sesion.indice + 1) +
      " / " +
      sesion.cola.length +
      "</span></div>" +
      '<div class="barra-progreso"><span id="barra-repaso" style="width:0%"></span></div>' +
      '<div class="tarjeta tarjeta-repaso" id="tarjeta-actual" style="margin-top:24px">' +
      '<p class="frente">' +
      esc(tarjeta.frente) +
      "</p>" +
      '<p class="atras" id="repaso-atras" style="display:none">' +
      esc(tarjeta.atras) +
      "</p>" +
      "</div>" +
      '<button type="button" class="boton-principal" id="btn-mostrar" style="margin-top:24px">Mostrar respuesta</button>' +
      '<div id="repaso-calificar" class="grid-calificar" style="display:none">' +
      '<button type="button" class="boton-secundario" data-calidad="1">No la sabía</button>' +
      '<button type="button" class="boton-secundario" data-calidad="3">Difícil</button>' +
      '<button type="button" class="boton-secundario" data-calidad="4">Bien</button>' +
      '<button type="button" class="boton-secundario" data-calidad="5">Fácil</button>' +
      "</div>" +
      "</div>";

    el.querySelectorAll("[data-i18n-live]").forEach(function (nodo) {
      nodo.textContent = t(nodo.getAttribute("data-i18n-live"));
    });

    global.App.Util.animarBarra(el.querySelector("#barra-repaso"), porcentaje);

    el.querySelector("#btn-mostrar").addEventListener("click", function () {
      el.querySelector("#repaso-atras").style.display = "block";
      el.querySelector("#repaso-calificar").style.display = "grid";
      el.querySelector("#btn-mostrar").style.display = "none";
    });

    el.querySelectorAll("#repaso-calificar button").forEach(function (boton) {
      boton.addEventListener("click", function () {
        var calidad = Number(boton.getAttribute("data-calidad"));
        var esCorrecta = calidad >= 3;

        // Feedback visual (pulso + borde) antes de avanzar; no cambia la calificación ni el
        // SM-2, solo retrasa ~220ms el avance para que la animación (transform/opacity) se vea.
        el.querySelectorAll("#repaso-calificar button").forEach(function (b) {
          b.disabled = true;
        });
        var tarjetaEl = el.querySelector("#tarjeta-actual");
        tarjetaEl.classList.add(esCorrecta ? "estado-correcto" : "estado-incorrecto");
        tarjetaEl.classList.add(esCorrecta ? "pulso-correcto" : "pulso-incorrecto");

        setTimeout(function () {
          var actualizada = global.App.SRS.calificarTarjeta(tarjeta, calidad, new Date());
          actualizada.frente = tarjeta.frente;
          actualizada.atras = tarjeta.atras;
          actualizada.tipo = tarjeta.tipo;
          if (esCorrecta) sesion.correctas += 1;
          global.App.Storage.put("srs_cards", actualizada).then(function () {
            sesion.indice += 1;
            pintarTarjetaActual(el, ctx, t);
          });
        }, 220);
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
