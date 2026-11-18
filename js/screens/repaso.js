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
      var tarjetasRepasadas = sesion ? sesion.indice : 0;
      var aciertos = sesion ? sesion.correctas : 0;
      finalizarSesionSiActiva()
        .then(function (resultado) {
          return Promise.all([Promise.resolve(resultado), global.App.Datos.obtenerEstadoRacha()]);
        })
        .then(function (res) {
          var resultado = res[0];
          var racha = res[1];
          var xpGanada = (resultado && resultado.xpGanada) || 0;
          var minutos = (resultado && resultado.minutosHoy) || 0;

          el.innerHTML =
            '<div class="pantalla-vista ancho-lectura">' +
            global.App.Util.confeti() +
            '<div class="hero-bloque">' +
            '<span id="icono-exito" style="color:var(--exito)">' +
            global.App.Iconos.svg("check", 32) +
            "</span>" +
            '<h1 style="margin-top:8px" data-i18n-live="repaso.titulo"></h1>' +
            '<p class="hero-etiqueta">' +
            '<span id="icono-flama-fin" class="flama-animada">' +
            global.App.Iconos.svg("flama", 16) +
            "</span>" +
            "<span>Racha de <strong class=\"num-tabular\" id=\"valor-racha-fin\">0</strong></span>" +
            "</p>" +
            "</div>" +
            '<div class="seccion">' +
            '<div class="fila"><div class="fila-cabeza"><span class="texto-tenue">Tarjetas repasadas</span><span class="num-tabular">' +
            tarjetasRepasadas +
            "</span></div></div>" +
            '<div class="fila"><div class="fila-cabeza"><span class="texto-tenue">Aciertos</span><span class="num-tabular">' +
            aciertos +
            "/" +
            tarjetasRepasadas +
            "</span></div></div>" +
            '<div class="fila"><div class="fila-cabeza"><span class="texto-tenue">Minutos hoy</span><span class="num-tabular">' +
            minutos +
            "</span></div></div>" +
            '<div class="fila"><div class="fila-cabeza"><span class="texto-tenue">XP ganado</span><span class="num-tabular">+<span id="valor-xp-fin">0</span></span></div></div>' +
            "</div>" +
            "</div>";
          el.querySelectorAll("[data-i18n-live]").forEach(function (nodo) {
            nodo.textContent = t(nodo.getAttribute("data-i18n-live"));
          });
          global.App.Util.animarNumero(el.querySelector("#valor-racha-fin"), racha.rachaActual);
          global.App.Util.animarNumero(el.querySelector("#valor-xp-fin"), xpGanada);
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
      "</div>" +
      '<button type="button" class="boton-principal" id="btn-comprobar" style="margin-top:24px">Comprobar</button>' +
      '<div id="zona-retro"></div>' +
      "</div>";

    el.querySelectorAll("[data-i18n-live]").forEach(function (nodo) {
      nodo.textContent = t(nodo.getAttribute("data-i18n-live"));
    });

    global.App.Util.animarBarra(el.querySelector("#barra-repaso"), porcentaje);

    el.querySelector("#btn-comprobar").addEventListener("click", function () {
      el.querySelector("#btn-comprobar").style.display = "none";
      // Panel de retroalimentación: sube desde abajo. Todavía no tiene tono de
      // acierto/error -- eso se decide cuando Alex se autocalifica (abajo).
      el.querySelector("#zona-retro").innerHTML =
        '<div class="panel-retro" id="panel-retro">' +
        '<p class="atras">' +
        esc(tarjeta.atras) +
        "</p>" +
        '<div id="repaso-calificar" class="grid-calificar">' +
        '<button type="button" class="boton-secundario" data-calidad="1">No la sabía</button>' +
        '<button type="button" class="boton-secundario" data-calidad="3">Difícil</button>' +
        '<button type="button" class="boton-secundario" data-calidad="4">Bien</button>' +
        '<button type="button" class="boton-secundario" data-calidad="5">Fácil</button>' +
        "</div>" +
        "</div>";

      el.querySelectorAll("#repaso-calificar button").forEach(function (boton) {
        boton.addEventListener("click", function () {
          var calidad = Number(boton.getAttribute("data-calidad"));
          var esCorrecta = calidad >= 3;
          var panel = el.querySelector("#panel-retro");
          var tarjetaEl = el.querySelector("#tarjeta-actual");

          tarjetaEl.classList.add(esCorrecta ? "estado-correcto" : "estado-incorrecto");
          tarjetaEl.classList.add(esCorrecta ? "pulso-correcto" : "pulso-incorrecto");
          panel.classList.add(esCorrecta ? "exito" : "error");
          panel.querySelector("#repaso-calificar").remove();
          var titulo = document.createElement("p");
          titulo.className = "titulo-retro";
          titulo.textContent = esCorrecta ? "¡Bien hecho!" : "No pasa nada, va a volver a salir";
          panel.insertBefore(titulo, panel.firstChild);

          var btnContinuar = document.createElement("button");
          btnContinuar.type = "button";
          btnContinuar.className = "boton-principal";
          btnContinuar.style.marginTop = "12px";
          btnContinuar.textContent = "Continuar";
          btnContinuar.addEventListener("click", function () {
            var actualizada = global.App.SRS.calificarTarjeta(tarjeta, calidad, new Date());
            actualizada.frente = tarjeta.frente;
            actualizada.atras = tarjeta.atras;
            actualizada.tipo = tarjeta.tipo;
            if (esCorrecta) sesion.correctas += 1;
            global.App.Storage.put("srs_cards", actualizada).then(function () {
              sesion.indice += 1;
              pintarTarjetaActual(el, ctx, t);
            });
          });
          panel.appendChild(btnContinuar);
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
