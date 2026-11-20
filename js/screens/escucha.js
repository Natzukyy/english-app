/* Pantalla de Escucha (Fase C, "Calcomanías oscuro"). A diferencia de Lectura, no hay nada
   visible al entrar salvo un botón "Escuchar" -- el audio NUNCA suena solo (App.TTS.hablar
   solo se llama por un click real, igual que ya hace Habla/Diagnóstico). Después de escuchar
   al menos una vez, aparecen las preguntas (mismo patrón visual A-D que Diagnóstico/Lectura).
   La transcripción solo se puede ver DESPUÉS de responder todo, en la pantalla de resultado
   -- verla antes sería trampa. "Escuchar más despacio" usa el tercer parámetro opcional de
   App.TTS.hablar(texto, idioma, velocidad) agregado para esta pantalla (ver js/core/tts.js:
   cambio aditivo, VELOCIDAD_DEFECTO sigue igual para todos los demás llamadores). */
(function (global) {
  "use strict";

  var LETRAS = ["A", "B", "C", "D"];
  var VELOCIDAD_LENTA = 0.65;

  var sesion = null; // { inicioMs, intentos, correctas, finalizada }
  var guiones = null; // cache de data/content/fase1/escucha.json
  var estado = null; // { guion, yaEscucho: bool, indice: -1 antes de preguntas | 0..n-1 | n = resultado, respuestas: [bool] }

  function finalizarSesionSiActiva() {
    if (!sesion || sesion.finalizada) return Promise.resolve();
    sesion.finalizada = true;
    if (sesion.intentos === 0) return Promise.resolve();
    var minutos = Math.max(1, Math.round((Date.now() - sesion.inicioMs) / 60000));
    return global.App.Datos.registrarSesion(minutos, sesion.correctas, new Date(), "escucha");
  }

  function elegirGuion(lista, nivel) {
    // Mismo nivel si hay contenido; si no, el más cercano POR DEBAJO (nunca un texto de B2
    // para quien está en A1) -- ver App.Avance.elegirPorNivel.
    return global.App.Avance.elegirPorNivel(lista, nivel);
  }

  function render(el, ctx) {
    var t = global.App.I18n.traductor(ctx);

    el.innerHTML = '<div class="estado-vacio">…</div>';

    var cargarGuiones = guiones
      ? Promise.resolve(guiones)
      : fetch("data/content/fase1/escucha.json")
          .then(function (r) {
            return r.json();
          })
          .then(function (datos) {
            guiones = datos.escucha || [];
            return guiones;
          });

    cargarGuiones.then(function () {
      if (estado) {
        pintar(el, ctx, t);
        return;
      }
      global.App.Datos.obtenerNivelesHabilidad().then(function (niveles) {
        var nivel = niveles.escucha || "A2";
        var guion = elegirGuion(guiones, nivel);
        estado = { guion: guion, yaEscucho: false, indice: -1, respuestas: [] };
        sesion = { inicioMs: Date.now(), intentos: 0, correctas: 0, finalizada: false };
        pintar(el, ctx, t);
      });
    });
  }

  function pintar(el, ctx, t) {
    if (estado.indice === estado.guion.preguntas.length) return pintarResultado(el, ctx, t);
    pintarSesion(el, ctx, t);
  }

  function pintarSesion(el, ctx, t) {
    var esc = global.App.Util.escaparHTML;
    var guion = estado.guion;
    var antesDePreguntas = estado.indice === -1;
    var pregunta = antesDePreguntas ? null : guion.preguntas[estado.indice];

    el.innerHTML =
      '<div class="pantalla-vista pantalla-escucha">' +
      '<h1 data-i18n-live="escucha.titulo"></h1>' +
      '<div class="escucha-cuerpo">' +
      '<div class="escucha-columna-audio">' +
      '<span class="diagnostico-pastilla-area calcomania escucha-pastilla-amarilla">' +
      esc(guion.tema) +
      " · " +
      esc(guion.nivelCEFR) +
      "</span>" +
      '<div class="escucha-panel-audio superficie-oscura">' +
      global.App.Iconos.svg("auriculares", 40) +
      '<p class="texto-tenue" id="escucha-estado">' + esc(t("escucha.toca_escuchar")) + '</p>' +
      '<button type="button" class="calcomania calcomania-cta calcomania-presionable escucha-boton-escuchar" id="btn-escuchar">' + esc(t("comun.escuchar")) + '</button>' +
      '<button type="button" class="enlace-discreto" id="btn-escuchar-lento">' + esc(t("escucha.mas_despacio")) + '</button>' +
      "</div>" +
      (antesDePreguntas
        ? '<p class="texto-caption" style="margin-top:8px">' + esc(t("escucha.antes_de_preguntas")) + '</p>'
        : "") +
      "</div>" +
      '<div class="escucha-columna-preguntas">' +
      (antesDePreguntas
        ? '<div class="superficie-oscura escucha-tarjeta-intro"><p>' +
          esc(t(guion.preguntas.length === 1 ? "escucha.preguntas_una" : "escucha.preguntas_varias", { n: guion.preguntas.length })) +
          "</p>" +
          '<button type="button" class="calcomania calcomania-cta calcomania-presionable escucha-boton-empezar" id="btn-empezar-preguntas" disabled>' + esc(t("comun.ver_preguntas")) + '</button>' +
          "</div>"
        : '<div class="diagnostico-tarjeta-pregunta calcomania"><h2>' +
          esc(pregunta.pregunta) +
          "</h2></div>" +
          '<div id="opciones" class="diagnostico-opciones pop-entrada-escalonada"></div>' +
          '<div class="diagnostico-pie">' +
          '<p class="diagnostico-nota-pie" id="nota-pie"></p>' +
          '<div class="diagnostico-pie-fila">' +
          '<span class="texto-caption num-tabular">' +
          (estado.indice + 1) +
          " / " +
          guion.preguntas.length +
          "</span>" +
          '<button type="button" class="calcomania calcomania-cta calcomania-presionable diagnostico-boton-accion" id="btn-accion" disabled>' + esc(t("comun.responder")) + '</button>' +
          "</div></div>") +
      "</div>" +
      "</div>" +
      "</div>";

    el.querySelectorAll("[data-i18n-live]").forEach(function (nodo) {
      nodo.textContent = t(nodo.getAttribute("data-i18n-live"));
    });

    var btnEscuchar = el.querySelector("#btn-escuchar");
    var btnEscucharLento = el.querySelector("#btn-escuchar-lento");
    var estadoAudio = el.querySelector("#escucha-estado");
    var btnEmpezarPreguntas = antesDePreguntas ? el.querySelector("#btn-empezar-preguntas") : null;

    if (estado.yaEscucho && btnEmpezarPreguntas) btnEmpezarPreguntas.disabled = false;

    function reproducir(velocidad) {
      btnEscuchar.disabled = true;
      btnEscucharLento.disabled = true;
      estadoAudio.textContent = t("escucha.reproduciendo");
      global.App.TTS.hablar(guion.guion, "en-US", velocidad)
        .catch(function () {
          /* sin Web Speech disponible: igual se puede avanzar, solo no hubo audio que oír */
        })
        .then(function () {
          btnEscuchar.disabled = false;
          btnEscucharLento.disabled = false;
          estadoAudio.textContent = t("escucha.toca_de_nuevo");
          if (!estado.yaEscucho) {
            estado.yaEscucho = true;
            if (btnEmpezarPreguntas) btnEmpezarPreguntas.disabled = false;
          }
        });
    }

    btnEscuchar.addEventListener("click", function () {
      reproducir();
    });
    btnEscucharLento.addEventListener("click", function () {
      reproducir(VELOCIDAD_LENTA);
    });

    if (antesDePreguntas) {
      btnEmpezarPreguntas.addEventListener("click", function () {
        estado.indice = 0;
        pintar(el, ctx, t);
      });
      return;
    }

    pintarPregunta(el, ctx, t, pregunta);
  }

  function pintarPregunta(el, ctx, t, pregunta) {
    var esc = global.App.Util.escaparHTML;
    var barajada = global.App.Util.barajarOpciones(pregunta.opciones, pregunta.respuestaCorrecta);

    var seleccionada = -1;
    var respondido = false;
    var contenedorOpciones = el.querySelector("#opciones");
    contenedorOpciones.setAttribute("role", "radiogroup");
    contenedorOpciones.setAttribute("aria-label", t("comun.opciones_respuesta"));
    var btnAccion = el.querySelector("#btn-accion");
    var notaPie = el.querySelector("#nota-pie");

    var botonesOpcion = barajada.opciones.map(function (opcion, i) {
      var boton = document.createElement("button");
      boton.type = "button";
      boton.className = "diagnostico-opcion superficie-oscura";
      boton.setAttribute("role", "radio");
      boton.setAttribute("aria-checked", "false");
      boton.innerHTML = '<span class="diagnostico-letra" aria-hidden="true">' + LETRAS[i] + "</span>" + '<span class="diagnostico-texto-opcion">' + esc(opcion) + "</span>";
      boton.addEventListener("click", function () {
        seleccionar(i);
      });
      contenedorOpciones.appendChild(boton);
      return boton;
    });

    function seleccionar(i) {
      if (respondido) return;
      seleccionada = i;
      botonesOpcion.forEach(function (b, idx) {
        b.setAttribute("aria-checked", idx === i ? "true" : "false");
        b.classList.remove("calcomania", "calcomania-presionable", "superficie-oscura", "diagnostico-opcion--seleccionada");
        if (idx === i) {
          b.classList.add("calcomania", "calcomania-presionable", "diagnostico-opcion--seleccionada");
        } else {
          b.classList.add("superficie-oscura");
        }
      });
      btnAccion.disabled = false;
    }

    function responder() {
      if (seleccionada === -1 || respondido) return;
      respondido = true;
      var esCorrecta = seleccionada === barajada.indiceCorrecta;
      // Respuesta puntuada del avance continuo (D29): solo si el guion es del nivel actual de escucha.
      global.App.Datos.registrarRespuestaAvance("escucha", estado.guion.nivelCEFR, esCorrecta ? 1 : 0, 1, new Date());
      sesion.intentos += 1;
      if (esCorrecta) {
        sesion.correctas += 1;
        estado.respuestas.push(true);
      } else {
        estado.respuestas.push(false);
      }

      botonesOpcion.forEach(function (b, idx) {
        b.disabled = true;
        b.classList.remove("calcomania-presionable", "diagnostico-opcion--seleccionada");
        if (idx === barajada.indiceCorrecta) {
          b.classList.remove("superficie-oscura");
          b.classList.add("calcomania", "diagnostico-opcion--correcta");
        } else if (idx === seleccionada) {
          b.classList.add("diagnostico-opcion--incorrecta");
        }
      });

      notaPie.textContent = esCorrecta ? t("comun.correcto") : t("comun.respuesta_era", { letra: LETRAS[barajada.indiceCorrecta] });
      notaPie.classList.add("visible");
      notaPie.classList.toggle("diagnostico-nota-correcta", esCorrecta);
      notaPie.classList.toggle("diagnostico-nota-incorrecta", !esCorrecta);

      btnAccion.textContent = estado.indice + 1 < estado.guion.preguntas.length ? t("comun.siguiente") : t("comun.ver_resultado");
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
  }

  function pintarResultado(el, ctx, t) {
    var esc = global.App.Util.escaparHTML;
    var total = estado.guion.preguntas.length;
    var correctas = estado.respuestas.filter(Boolean).length;
    el.innerHTML =
      '<div class="pantalla-vista ancho-lectura pantalla-escucha-resultado">' +
      '<div class="interstitial-tarjeta calcomania pop-entrada" style="background:var(--amarillo)">' +
      '<span class="interstitial-sello">' +
      global.App.Iconos.svg("sello", 28) +
      "</span>" +
      '<p class="interstitial-titulo">' + esc(t("comun.listo")) + '</p>' +
      '<p class="interstitial-resumen"><span class="num-tabular">' +
      correctas +
      "</span> / <span class=\"num-tabular\">" +
      total +
      "</span> " + esc(t("comun.correctas")) + "</p>" +
      '<button type="button" class="boton-secundario" id="btn-ver-transcripcion" style="margin-top:12px">' + esc(t("escucha.ver_transcripcion")) + '</button>' +
      '<div class="escucha-transcripcion superficie-oscura" id="zona-transcripcion" hidden><p>' +
      esc(estado.guion.transcripcion) +
      "</p></div>" +
      '<button type="button" class="boton-principal interstitial-boton" id="btn-terminar-escucha" style="margin-top:12px">' + esc(t("comun.terminar")) + '</button>' +
      "</div>" +
      "</div>";
    el.querySelector("#btn-ver-transcripcion").addEventListener("click", function () {
      el.querySelector("#zona-transcripcion").hidden = false;
      el.querySelector("#btn-ver-transcripcion").hidden = true;
    });
    el.querySelector("#btn-terminar-escucha").addEventListener("click", function () {
      finalizarSesionSiActiva().then(function () {
        estado = null;
        global.App.Util.terminarPasoYVolver();
      });
    });
  }

  global.addEventListener("hashchange", function () {
    if (location.hash.indexOf("escucha") === -1) {
      finalizarSesionSiActiva();
      estado = null;
    }
  });

  global.App = global.App || {};
  global.App.Screens = global.App.Screens || {};
  global.App.Screens.escucha = { render: render };
})(typeof window !== "undefined" ? window : globalThis);
