/* Pantalla de Confirmación de nivel de UNA habilidad (D29): lectura o escucha, con preguntas de
   opción múltiple del NIVEL SIGUIENTE (data/content/confirmacion/banco.json). Aprueba con
   >= 70 % (mínimo 8 preguntas, constantes en App.Avance.CONSTANTES). Habla y escritura
   confirman dentro de sus propias pantallas (modo confirmación, ver Util.leerModoPaso).
   Salir a mitad no registra nada: el paso queda pendiente en la ruta guiada. */
(function (global) {
  "use strict";

  var LETRAS = ["A", "B", "C", "D"];
  var estado = null; // { habilidad, nivelActual, nivelObjetivo, preguntas, indice, correctas, paso }
  var listenerTeclado = null;

  function quitarListenerTeclado() {
    if (listenerTeclado) {
      global.removeEventListener("keydown", listenerTeclado);
      listenerTeclado = null;
    }
  }

  function barajar(lista) {
    var a = lista.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var x = a[i];
      a[i] = a[j];
      a[j] = x;
    }
    return a;
  }

  /** Elige las preguntas de la confirmación. Lectura mezcla comprensión lectora (60 %) con
   * vocabulario/gramática (40 %), porque las tarjetas de repaso alimentan la ventana de lectura. */
  function elegirPreguntas(banco, habilidad, nivel, total) {
    var delNivel = banco.filter(function (p) {
      return p.nivelCEFR === nivel;
    });
    function de(hab) {
      return barajar(delNivel.filter(function (p) { return p.habilidad === hab; }));
    }
    var elegidas;
    if (habilidad === "lectura") {
      var vocab = Math.round(total * 0.4);
      elegidas = de("lectura").slice(0, total - vocab).concat(de("vocabulario_gramatica").slice(0, vocab));
      if (elegidas.length < total) {
        var ids = {};
        elegidas.forEach(function (p) { ids[p.id] = true; });
        elegidas = elegidas.concat(de("lectura").concat(de("vocabulario_gramatica")).filter(function (p) { return !ids[p.id]; }).slice(0, total - elegidas.length));
      }
    } else {
      elegidas = de(habilidad).slice(0, total);
    }
    return barajar(elegidas);
  }

  function render(el, ctx) {
    var t = global.App.I18n.traductor(ctx);
    quitarListenerTeclado();
    if (estado && estado.paso !== "fin") {
      pintar(el, ctx, t);
      return;
    }
    el.innerHTML = '<div class="estado-vacio">…</div>';
    var modo = global.App.Util.leerModoPaso();
    Promise.all([
      global.App.Datos.obtenerConfirmacionesPendientes(new Date()),
      fetch("data/content/confirmacion/banco.json").then(function (r) { return r.json(); })
    ]).then(function (res) {
      var pendientes = res[0];
      var elegida = null;
      pendientes.forEach(function (c) {
        if (!elegida && modo && modo.tipo === "confirmacion" && modo.habilidad === c.habilidad) elegida = c;
      });
      if (!elegida) elegida = pendientes.filter(function (c) { return c.habilidad === "lectura" || c.habilidad === "escucha"; })[0] || null;
      if (!elegida || (elegida.habilidad !== "lectura" && elegida.habilidad !== "escucha")) {
        estado = null;
        return pintarSinConfirmacion(el, t);
      }
      var K = global.App.Avance.CONSTANTES;
      var preguntas = elegirPreguntas(res[1].preguntas || [], elegida.habilidad, elegida.nivelObjetivo, K.CONFIRMACION_PREGUNTAS);
      if (preguntas.length < K.CONFIRMACION_MIN_PREGUNTAS) {
        estado = null;
        return pintarSinConfirmacion(el, t);
      }
      estado = { habilidad: elegida.habilidad, nivelActual: elegida.nivelActual, nivelObjetivo: elegida.nivelObjetivo, preguntas: preguntas, indice: 0, correctas: 0, paso: "preguntas", resultado: null };
      pintar(el, ctx, t);
    });
  }

  function pintarSinConfirmacion(el, t) {
    var esc = global.App.Util.escaparHTML;
    el.innerHTML =
      '<div class="pantalla-vista ancho-lectura pantalla-confirmacion">' +
      '<h1>' + esc(t("confirmacion.titulo")) + "</h1>" +
      '<p class="texto-tenue">' + esc(t("confirmacion.nada_pendiente")) + "</p>" +
      '<button type="button" class="boton-principal" id="btn-conf-inicio" style="margin-top:16px">' + esc(t("nav.inicio")) + "</button>" +
      "</div>";
    el.querySelector("#btn-conf-inicio").addEventListener("click", function () {
      location.hash = "#/inicio";
    });
  }

  function pintar(el, ctx, t) {
    quitarListenerTeclado();
    if (estado.indice >= estado.preguntas.length) return pintarResultado(el, ctx, t);
    pintarPregunta(el, ctx, t);
  }

  function pintarPregunta(el, ctx, t) {
    var esc = global.App.Util.escaparHTML;
    var p = estado.preguntas[estado.indice];
    var esEscucha = p.habilidad === "escucha";
    var porcentaje = Math.round((estado.indice / estado.preguntas.length) * 100);

    el.innerHTML =
      '<div class="pantalla-vista pantalla-diagnostico pantalla-diagnostico-pregunta pantalla-confirmacion">' +
      "<h1>" + esc(t("confirmacion.titulo")) + "</h1>" +
      '<div class="fila-cabeza"><span class="texto-tenue">' +
      esc(t("confirmacion.subtitulo", { habilidad: t("habilidad." + estado.habilidad), nivel: estado.nivelObjetivo })) +
      '</span><span class="texto-tenue num-tabular">' + (estado.indice + 1) + " / " + estado.preguntas.length + "</span></div>" +
      '<div class="barra-progreso"><span id="barra-confirmacion" style="width:0%"></span></div>' +
      '<div class="diagnostico-cuerpo">' +
      '<div class="diagnostico-columna-izquierda">' +
      (p.texto && !esEscucha ? '<div class="diagnostico-pasaje superficie-oscura"><p>' + esc(p.texto) + "</p></div>" : "") +
      (esEscucha
        ? '<button type="button" class="enlace-discreto" id="btn-reproducir" style="margin-top:12px">' + global.App.Iconos.svg("bocina", 18) + "<span>" + esc(t("diagnostico.reproducir")) + "</span></button>"
        : "") +
      '<div class="diagnostico-tarjeta-pregunta calcomania"><h2>' + esc(p.pregunta) + "</h2></div>" +
      "</div>" +
      '<div class="diagnostico-columna-derecha">' +
      '<div id="opciones" class="diagnostico-opciones pop-entrada-escalonada"></div>' +
      '<div class="diagnostico-pie">' +
      '<p class="diagnostico-nota-pie" id="nota-pie"></p>' +
      '<div class="diagnostico-pie-fila">' +
      '<p class="texto-caption diagnostico-nota-teclado">' + esc(t("diagnostico.teclas")) + "</p>" +
      '<button type="button" class="calcomania calcomania-cta calcomania-presionable diagnostico-boton-accion" id="btn-accion" disabled>' + esc(t("comun.responder")) + "</button>" +
      "</div></div></div></div></div>";

    global.App.Util.animarBarra(el.querySelector("#barra-confirmacion"), porcentaje);

    if (esEscucha) {
      el.querySelector("#btn-reproducir").addEventListener("click", function () {
        global.App.TTS.hablar(p.textoParaTTS || p.texto, "en-US").catch(function () {});
      });
    }

    var barajada = global.App.Util.barajarOpciones(p.opciones, p.respuestaCorrecta);
    var seleccionada = -1;
    var respondido = false;
    var contenedor = el.querySelector("#opciones");
    contenedor.setAttribute("role", "radiogroup");
    contenedor.setAttribute("aria-label", t("comun.opciones_respuesta"));
    var btnAccion = el.querySelector("#btn-accion");
    var notaPie = el.querySelector("#nota-pie");

    var botones = barajada.opciones.map(function (opcion, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "diagnostico-opcion superficie-oscura";
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", "false");
      b.innerHTML = '<span class="diagnostico-letra" aria-hidden="true">' + LETRAS[i] + '</span><span class="diagnostico-texto-opcion">' + esc(opcion) + "</span>";
      b.addEventListener("click", function () { seleccionar(i); });
      contenedor.appendChild(b);
      return b;
    });

    function seleccionar(i) {
      if (respondido) return;
      seleccionada = i;
      botones.forEach(function (b, idx) {
        b.setAttribute("aria-checked", idx === i ? "true" : "false");
        b.classList.remove("calcomania", "calcomania-presionable", "superficie-oscura", "diagnostico-opcion--seleccionada");
        if (idx === i) b.classList.add("calcomania", "calcomania-presionable", "diagnostico-opcion--seleccionada");
        else b.classList.add("superficie-oscura");
      });
      btnAccion.disabled = false;
    }

    function responder() {
      if (seleccionada === -1 || respondido) return;
      respondido = true;
      var ok = seleccionada === barajada.indiceCorrecta;
      if (ok) estado.correctas += 1;
      botones.forEach(function (b, idx) {
        b.disabled = true;
        b.classList.remove("calcomania-presionable", "diagnostico-opcion--seleccionada");
        if (idx === barajada.indiceCorrecta) {
          b.classList.remove("superficie-oscura");
          b.classList.add("calcomania", "diagnostico-opcion--correcta");
        } else if (idx === seleccionada) {
          b.classList.add("diagnostico-opcion--incorrecta");
        }
      });
      notaPie.textContent = ok ? t("comun.correcto") : t("comun.respuesta_era", { letra: LETRAS[barajada.indiceCorrecta] });
      notaPie.classList.add("visible");
      notaPie.classList.toggle("diagnostico-nota-correcta", ok);
      notaPie.classList.toggle("diagnostico-nota-incorrecta", !ok);
      btnAccion.textContent = estado.indice + 1 < estado.preguntas.length ? t("comun.siguiente") : t("comun.ver_resultado");
      btnAccion.disabled = false;
    }

    function siguiente() {
      estado.indice += 1;
      pintar(el, ctx, t);
    }

    btnAccion.addEventListener("click", function () {
      if (!respondido) responder();
      else siguiente();
    });

    listenerTeclado = function (ev) {
      var tecla = (ev.key || "").toUpperCase();
      var i = LETRAS.indexOf(tecla);
      if (!respondido && i !== -1 && botones[i] && !botones[i].disabled) seleccionar(i);
      else if (tecla === "ENTER" && !btnAccion.disabled) btnAccion.click();
    };
    global.addEventListener("keydown", listenerTeclado);
  }

  /** Tarjeta de resultado de una confirmación (la usan también habla y escritura, que confirman
   * dentro de su propia pantalla). r = lo que devuelve Datos.aplicarResultadoConfirmacion. */
  function pintarTarjetaResultado(el, t, habilidad, r, resumenHtml, alTerminar) {
    var esc = global.App.Util.escaparHTML;
    var nombre = t("habilidad." + habilidad).toLowerCase();
    var color = r.aprobada ? "var(--menta)" : "var(--amarillo)";
    var titulo = r.aprobada ? t("confirmacion.aprobado_titulo") : t("confirmacion.casi_titulo");
    var detalle = r.aprobada
      ? t("confirmacion.aprobado_detalle", { nivel: r.nivelNuevo, habilidad: nombre })
      : t("confirmacion.casi_detalle", { pct: r.porcentaje, min: Math.round(global.App.Avance.CONSTANTES.CONFIRMACION_APRUEBA * 100), fecha: r.fechaReintento || "" });
    el.innerHTML =
      '<div class="pantalla-vista ancho-lectura pantalla-confirmacion">' +
      '<div class="interstitial-tarjeta calcomania pop-entrada" style="background:' + color + '">' +
      '<span class="interstitial-sello">' + global.App.Iconos.svg(r.aprobada ? "sello" : "check", 28) + "</span>" +
      '<p class="interstitial-titulo">' + esc(titulo) + "</p>" +
      '<p class="interstitial-resumen">' + resumenHtml + "</p>" +
      '<p class="interstitial-manana">' + esc(detalle) + "</p>" +
      '<button type="button" class="boton-principal interstitial-boton" id="btn-terminar-confirmacion">' + esc(t("comun.terminar")) + "</button>" +
      "</div></div>";
    if (r.aprobada) global.App.Util.lluviaCalcomanias();
    el.querySelector("#btn-terminar-confirmacion").addEventListener("click", function () {
      global.App.Util.limpiarModoPaso();
      if (alTerminar) alTerminar();
      global.App.Util.terminarPasoYVolver();
    });
  }

  function pintarResultado(el, ctx, t) {
    el.innerHTML = '<div class="estado-vacio">…</div>';
    var guardar = estado.resultado
      ? Promise.resolve(estado.resultado)
      : global.App.Datos.aplicarResultadoConfirmacion(estado.habilidad, estado.correctas, estado.preguntas.length, new Date());
    guardar.then(function (r) {
      estado.resultado = r;
      estado.paso = "fin";
      var resumen =
        '<span class="num-tabular">' + estado.correctas + '</span> / <span class="num-tabular">' + estado.preguntas.length + "</span> " + global.App.Util.escaparHTML(t("comun.correctas"));
      pintarTarjetaResultado(el, t, estado.habilidad, r, resumen, function () {
        estado = null;
      });
    });
  }

  global.addEventListener("hashchange", function () {
    if (location.hash.indexOf("confirmacion") === -1) {
      quitarListenerTeclado();
      if (estado && estado.paso !== "fin") estado = null; // salir a mitad no registra nada
    }
  });

  global.App = global.App || {};
  global.App.Screens = global.App.Screens || {};
  global.App.Screens.confirmacion = { render: render, pintarTarjetaResultado: pintarTarjetaResultado };
})(typeof window !== "undefined" ? window : globalThis);
