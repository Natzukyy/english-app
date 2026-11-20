(function (global) {
  "use strict";

  // Estado de la sesión en curso (vive mientras el usuario está en esta pantalla).
  var sesion = null; // { cola: [tarjeta,...], indice, inicioMs, correctas }
  var revelado = false; // ¿ya se volteó la tarjeta actual para ver la traducción?
  var calificando = false; // evita doble-calificación mientras la tarjeta vuela/sale
  var listenerTeclado = null; // referencia al keydown de la tarjeta actual, para quitarlo al avanzar/salir

  // Rotación ligera por tarjeta (-1.5deg a 1.2deg, spec "Calcomanías") -- una por índice para
  // que no se sienta mecánico si se repasa la cola completa más de una vez en la sesión.
  var ROTACIONES = ["-1deg", "0.8deg", "-0.6deg", "1.1deg", "-1.3deg"];

  function quitarListenerTeclado() {
    if (listenerTeclado) {
      global.removeEventListener("keydown", listenerTeclado);
      listenerTeclado = null;
    }
  }

  function finalizarSesionSiActiva() {
    quitarListenerTeclado();
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

    // Cola con topes reales (20 vencidas + 15 nuevas por día), no todas las pendientes.
    Datos.obtenerColaRepaso(new Date()).then(function (pendientes) {
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
            '<div class="pantalla-vista ancho-lectura pantalla-repaso">' +
            '<div class="hero-bloque">' +
            '<span id="icono-exito" class="icono-sello-fin">' +
            global.App.Iconos.svg("sello", 32) +
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
            // Sin este botón el resumen era un callejón sin salida (solo la barra de navegación);
            // en la ruta guiada es el "Continuar": Inicio detecta la vuelta y muestra el siguiente paso.
            '<button type="button" class="calcomania calcomania-cta calcomania-presionable repaso-boton-terminar" id="btn-terminar-repaso">' +
            t("comun.terminar") +
            "</button>" +
            "</div>";
          el.querySelectorAll("[data-i18n-live]").forEach(function (nodo) {
            nodo.textContent = t(nodo.getAttribute("data-i18n-live"));
          });
          el.querySelector("#btn-terminar-repaso").addEventListener("click", function () {
            global.App.Util.terminarPasoYVolver();
          });
          global.App.Util.animarNumero(el.querySelector("#valor-racha-fin"), racha.rachaActual);
          global.App.Util.animarNumero(el.querySelector("#valor-xp-fin"), xpGanada);
        });
      return;
    }

    var tarjeta = sesion.cola[sesion.indice];
    var esc = global.App.Util.escaparHTML;
    var porcentaje = Math.round((sesion.indice / sesion.cola.length) * 100);
    var rotacion = ROTACIONES[sesion.indice % ROTACIONES.length];
    revelado = false;
    calificando = false;
    quitarListenerTeclado();

    // tarjeta.frente/atras vienen de IndexedDB (sembradas por nosotros, pero sustituibles por
    // un respaldo importado): se escapan antes de insertarlas como HTML.
    el.innerHTML =
      '<div class="pantalla-vista pantalla-repaso">' +
      '<h1 data-i18n-live="repaso.titulo"></h1>' +
      '<div class="repaso-contador"><span class="num-tabular">' +
      (sesion.indice + 1) +
      "</span> / <span class=\"num-tabular\">" +
      sesion.cola.length +
      "</span></div>" +
      '<div class="barra-progreso"><span id="barra-repaso" style="width:0%"></span></div>' +
      '<div class="repaso-cuerpo">' +
      '<div class="repaso-marco pop-entrada" id="repaso-marco" style="--r:' +
      rotacion +
      '" role="button" tabindex="0" aria-label="Voltear para ver la traducción">' +
      '<div class="repaso-cara repaso-cara-frente">' +
      '<span class="repaso-pastilla">' +
      esc(tarjeta.tipo || "Repaso") +
      "</span>" +
      '<p class="repaso-frase">' +
      esc(tarjeta.frente) +
      "</p>" +
      '<button type="button" class="repaso-boton-bocina" id="btn-bocina" aria-label="Escuchar">' +
      global.App.Iconos.svg("bocina", 20) +
      "</button>" +
      "</div>" +
      '<div class="repaso-cara repaso-cara-atras">' +
      '<p class="repaso-etiqueta-traduccion">Traducción</p>' +
      '<p class="repaso-texto-traduccion">' +
      esc(tarjeta.atras) +
      "</p>" +
      "</div>" +
      "</div>" +
      '<div class="repaso-panel-calificar superficie-oscura" id="panel-calificar">' +
      '<p class="repaso-etiqueta-traduccion" id="traduccion-panel">Toca la tarjeta o presiona espacio para ver la traducción</p>' +
      '<p class="repaso-pregunta-calidad">¿Qué tal te fue?</p>' +
      '<div class="repaso-grid-calificar" id="repaso-calificar">' +
      '<button type="button" class="repaso-boton-calidad" data-calidad="1" style="background:var(--coral)" disabled>No la sabía<span class="repaso-tecla">Tecla 1</span></button>' +
      '<button type="button" class="repaso-boton-calidad" data-calidad="3" style="background:var(--amarillo)" disabled>Difícil<span class="repaso-tecla">Tecla 2</span></button>' +
      '<button type="button" class="repaso-boton-calidad" data-calidad="4" style="background:var(--menta)" disabled>Bien<span class="repaso-tecla">Tecla 3</span></button>' +
      '<button type="button" class="repaso-boton-calidad" data-calidad="5" style="background:var(--azul)" disabled>Fácil<span class="repaso-tecla">Tecla 4</span></button>' +
      "</div>" +
      '<p class="repaso-nota-teclado">Espacio muestra la traducción. Puedes calificar con las teclas 1 a 4.</p>' +
      "</div>" +
      "</div>" +
      "</div>";

    el.querySelectorAll("[data-i18n-live]").forEach(function (nodo) {
      nodo.textContent = t(nodo.getAttribute("data-i18n-live"));
    });

    global.App.Util.animarBarra(el.querySelector("#barra-repaso"), porcentaje);

    var marco = el.querySelector("#repaso-marco");
    // "pop-entrada" es una @keyframes animation con fill-mode "both": mientras siga
    // aplicada, el motor del navegador sigue controlando "transform" con su último cuadro
    // PARA SIEMPRE, por encima de cualquier cambio de clase/transición normal (p. ej.
    // ".revelada" de abajo) -- aunque la regla CSS exista y la clase se agregue, el volteo
    // nunca se vería. Se quita en cuanto termina de animar, para que el marco vuelva a
    // responder a los cambios de transform normales del resto de esta pantalla.
    marco.addEventListener("animationend", function () {
      marco.classList.remove("pop-entrada");
    });
    var panel = el.querySelector("#panel-calificar");
    var traduccionPanel = el.querySelector("#traduccion-panel");
    var botonesCalidad = el.querySelectorAll(".repaso-boton-calidad");

    function revelar() {
      if (revelado) return;
      revelado = true;
      marco.classList.add("revelada");
      panel.classList.add("visible");
      // La traducción ya se ve en la cara trasera de la tarjeta (.repaso-texto-traduccion);
      // este párrafo es solo el texto de ayuda antes de revelar ("Toca la tarjeta o presiona
      // espacio..."), así que se oculta en vez de repetir la traducción una segunda vez.
      traduccionPanel.hidden = true;
      botonesCalidad.forEach(function (boton) {
        boton.disabled = false;
      });
    }

    function calificar(calidad) {
      if (!revelado || calificando) return;
      calificando = true;
      var esCorrecta = calidad >= 3;
      marco.classList.add(esCorrecta ? "vuela-der" : "vuela-izq");
      if (esCorrecta) sesion.correctas += 1;

      var actualizada = global.App.SRS.calificarTarjeta(tarjeta, calidad, new Date());
      actualizada.frente = tarjeta.frente;
      actualizada.atras = tarjeta.atras;
      actualizada.tipo = tarjeta.tipo;

      global.App.Storage.put("srs_cards", actualizada).then(function () {
        // Se retrasa el avance a propósito -- lo justo para alcanzar a ver la tarjeta volar
        // (--dur-media, igual que la propia animación). No cambia nada de lo que se guarda.
        global.setTimeout(function () {
          sesion.indice += 1;
          pintarTarjetaActual(el, ctx, t);
        }, 250);
      });
    }

    marco.addEventListener("click", revelar);
    marco.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        revelar();
      }
    });

    el.querySelector("#btn-bocina").addEventListener("click", function (ev) {
      ev.stopPropagation(); // no debe también voltear la tarjeta
      global.App.TTS.hablar(tarjeta.frente, "en-US").catch(function () {
        /* sin Web Speech disponible: la frase ya se lee en la tarjeta */
      });
    });

    botonesCalidad.forEach(function (boton) {
      boton.addEventListener("click", function (ev) {
        ev.stopPropagation();
        calificar(Number(boton.getAttribute("data-calidad")));
      });
    });

    // Atajos de teclado (pensados para laptop, donde hay teclado físico de verdad -- ver
    // spec: "Espacio muestra la traducción. Puedes calificar con las teclas 1 a 4."): se
    // escuchan en todo el documento (no solo con el marco enfocado) para que no haga falta
    // tabular hasta la tarjeta primero. Se quita siempre antes de pintar la siguiente
    // tarjeta o al salir de la pantalla (quitarListenerTeclado/finalizarSesionSiActiva),
    // para no acumular listeners.
    listenerTeclado = function (ev) {
      if (ev.target && /input|textarea|select/i.test(ev.target.tagName)) return;
      if (ev.code === "Space") {
        ev.preventDefault();
        revelar();
        return;
      }
      var calidadPorTecla = { 1: 1, 2: 3, 3: 4, 4: 5 };
      if (calidadPorTecla[ev.key]) calificar(calidadPorTecla[ev.key]);
    };
    global.addEventListener("keydown", listenerTeclado);
  }

  global.addEventListener("hashchange", function () {
    if (location.hash.indexOf("repaso") === -1) finalizarSesionSiActiva();
  });

  global.App = global.App || {};
  global.App.Screens = global.App.Screens || {};
  global.App.Screens.repaso = { render: render };
})(typeof window !== "undefined" ? window : globalThis);
