/* Pantalla de Escritura (Fase C, "Calcomanías oscuro"). Mismo esqueleto de layout que
   Lectura/Escucha (columnas que se estiran en laptop, REGLA DE LAPTOP: "consigna + caja a la
   izquierda, lista de verificación y modelo a la derecha"). No hay una "respuesta correcta"
   real en escritura libre -- a diferencia de Lectura/Escucha (que cuentan aciertos por
   pregunta), aquí la sesión es UNA sola consigna: "correcta" para el XP es 1 si Alex marcó la
   mitad o más de su propia lista de verificación como lograda, 0 si no (ver finalizarSesion).
   La respuesta modelo y la lista de verificación solo aparecen DESPUÉS de terminar de
   escribir -- verla antes sería trampa, igual que la transcripción de Escucha. Corrección por
   IA opcional (D24): solo se ofrece si App.Datos.obtenerPreferencias() ya tiene
   conversacionActivada+conversacionWorkerUrl configurados (lo más probable es que no, como ya
   documentó REPORTE_CONVERSACION_IA.md) -- si no están, el botón simplemente no se muestra,
   nunca un estado roto. Reusa App.Conversacion.{MODELO,MAX_TOKENS_RESPUESTA,parsearRespuesta,
   mensajeError} (ya genéricos, no específicos de la pantalla de conversación) en vez de
   duplicar esas constantes/lógica. */
(function (global) {
  "use strict";

  var sesion = null; // { inicioMs, finalizada }
  var consignas = null; // cache de data/content/fase1/escritura.json
  var estado = null; // { consigna, fase: "escribiendo"|"revision", texto, marcados: Set<indice> }

  function finalizarSesionSiActiva() {
    if (!sesion || sesion.finalizada) return Promise.resolve();
    sesion.finalizada = true;
    if (!estado || estado.fase !== "revision") return Promise.resolve(); // no llegó a terminar de escribir, no cuenta sesión
    var minutos = Math.max(1, Math.round((Date.now() - sesion.inicioMs) / 60000));
    var totalCriterios = estado.consigna.listaVerificacion.length;
    var marcados = estado.marcados.size;
    var correcta = totalCriterios > 0 && marcados / totalCriterios >= 0.5 ? 1 : 0;
    var proporcion = totalCriterios > 0 ? marcados / totalCriterios : 0;
    // Avance continuo (D29): la lista de criterios autoevaluada es la única puntuación que hay
    // para escritura libre; pesa media respuesta (PESO_ESCRITURA) porque es subjetiva. En modo
    // confirmación no entra a la ventana: define el resultado de la confirmación.
    var K = global.App.Avance.CONSTANTES;
    var avance;
    if (estado.confirmacion) {
      avance = global.App.Datos.aplicarResultadoConfirmacion("escritura", proporcion * K.CONFIRMACION_PREGUNTAS, K.CONFIRMACION_PREGUNTAS, new Date()).then(function (r) {
        estado.resultadoConfirmacion = r;
      });
    } else {
      avance = global.App.Datos.registrarRespuestaAvance("escritura", estado.consigna.nivelCEFR, proporcion, K.PESO_ESCRITURA, new Date());
    }
    return avance.then(function () {
      return global.App.Datos.registrarSesion(minutos, correcta, new Date(), "escritura");
    });
  }

  function elegirConsigna(lista, nivel) {
    // Mismo nivel si hay contenido; si no, el más cercano POR DEBAJO (nunca un texto de B2
    // para quien está en A1) -- ver App.Avance.elegirPorNivel.
    return global.App.Avance.elegirPorNivel(lista, nivel);
  }

  function render(el, ctx) {
    var t = global.App.I18n.traductor(ctx);

    el.innerHTML = '<div class="estado-vacio">…</div>';

    var cargarConsignas = consignas
      ? Promise.resolve(consignas)
      : fetch("data/content/fase1/escritura.json")
          .then(function (r) {
            return r.json();
          })
          .then(function (datos) {
            consignas = datos.escritura || [];
            return consignas;
          });

    cargarConsignas.then(function () {
      if (estado) {
        pintar(el, ctx, t);
        return;
      }
      global.App.Datos.obtenerNivelesHabilidad().then(function (niveles) {
        var nivel = niveles.escritura || "A2";
        // Modo confirmación (D29): una consigna del NIVEL SIGUIENTE; aprueba con >= 70 % de la
        // lista de criterios marcada. Sin modo, práctica normal del nivel actual.
        var modo = global.App.Util.leerModoPaso();
        var enConfirmacion = !!(modo && modo.tipo === "confirmacion" && modo.habilidad === "escritura" && global.App.Avance.siguienteNivelDe(nivel));
        var consigna = elegirConsigna(consignas, enConfirmacion ? global.App.Avance.siguienteNivelDe(nivel) : nivel);
        estado = { consigna: consigna, fase: "escribiendo", texto: "", marcados: new Set(), confirmacion: enConfirmacion, resultadoConfirmacion: null };
        sesion = { inicioMs: Date.now(), finalizada: false };
        pintar(el, ctx, t);
      });
    });
  }

  function pintar(el, ctx, t) {
    if (estado.fase === "revision") return pintarRevision(el, ctx, t);
    pintarEscribiendo(el, ctx, t);
  }

  function pintarEscribiendo(el, ctx, t) {
    var esc = global.App.Util.escaparHTML;
    var consigna = estado.consigna;

    el.innerHTML =
      '<div class="pantalla-vista pantalla-escritura">' +
      '<h1 data-i18n-live="escritura.titulo"></h1>' +
      '<div class="escritura-cuerpo">' +
      '<div class="escritura-columna-izquierda">' +
      '<span class="diagnostico-pastilla-area calcomania escritura-pastilla-rosa">' +
      esc(consigna.tema) +
      " · " +
      esc(consigna.nivelCEFR) +
      "</span>" +
      '<div class="escritura-consigna superficie-oscura"><p>' +
      esc(consigna.consigna) +
      "</p></div>" +
      '<textarea class="campo-texto escritura-textarea" id="campo-escritura" placeholder="' + esc(t("escritura.placeholder")) + '"></textarea>' +
      '<button type="button" class="calcomania calcomania-cta calcomania-presionable escritura-boton-terminar" id="btn-terminar-escribir" disabled>' + esc(t("escritura.terminar_escribir")) + '</button>' +
      "</div>" +
      '<div class="escritura-columna-derecha">' +
      '<div class="superficie-oscura escritura-tarjeta-espera"><p class="texto-tenue">' +
      esc(t("escritura.espera")) +
      "</p></div>" +
      "</div>" +
      "</div>" +
      "</div>";

    el.querySelectorAll("[data-i18n-live]").forEach(function (nodo) {
      nodo.textContent = t(nodo.getAttribute("data-i18n-live"));
    });

    var campo = el.querySelector("#campo-escritura");
    var btnTerminar = el.querySelector("#btn-terminar-escribir");
    campo.value = estado.texto;
    btnTerminar.disabled = campo.value.trim() === "";

    campo.addEventListener("input", function () {
      estado.texto = campo.value;
      btnTerminar.disabled = campo.value.trim() === "";
    });

    btnTerminar.addEventListener("click", function () {
      if (campo.value.trim() === "") return;
      estado.texto = campo.value;
      estado.fase = "revision";
      pintar(el, ctx, t);
    });
  }

  function pintarRevision(el, ctx, t) {
    var esc = global.App.Util.escaparHTML;
    var consigna = estado.consigna;

    global.App.Datos.obtenerPreferencias().then(function (prefs) {
      var iaDisponible = !!(prefs.conversacionActivada && prefs.conversacionWorkerUrl);

      var listaHtml = consigna.listaVerificacion
        .map(function (criterio, i) {
          return (
            '<label class="escritura-criterio">' +
            '<input type="checkbox" data-indice="' +
            i +
            '" />' +
            '<span>' +
            esc(criterio) +
            "</span>" +
            "</label>"
          );
        })
        .join("");

      el.innerHTML =
        '<div class="pantalla-vista pantalla-escritura">' +
        '<h1 data-i18n-live="escritura.titulo"></h1>' +
        '<div class="escritura-cuerpo">' +
        '<div class="escritura-columna-izquierda">' +
        '<span class="diagnostico-pastilla-area calcomania escritura-pastilla-rosa">' +
        esc(consigna.tema) +
        " · " +
        esc(consigna.nivelCEFR) +
        "</span>" +
        '<div class="escritura-consigna superficie-oscura"><p>' +
        esc(consigna.consigna) +
        "</p></div>" +
        '<div class="escritura-texto-escrito superficie-oscura"><p>' +
        esc(estado.texto) +
        "</p></div>" +
        "</div>" +
        '<div class="escritura-columna-derecha">' +
        '<div class="superficie-oscura escritura-tarjeta-lista">' +
        "<h2>" + esc(t("escritura.como_te_fue")) + "</h2>" +
        '<p class="texto-caption">' + esc(t("escritura.marca_logrado")) + '</p>' +
        '<div class="escritura-lista-verificacion">' +
        listaHtml +
        "</div>" +
        "</div>" +
        '<div class="superficie-oscura escritura-tarjeta-modelo">' +
        "<h2>" + esc(t("escritura.respuesta_ejemplo")) + "</h2>" +
        '<p class="escritura-respuesta-modelo">' +
        esc(consigna.respuestaModelo) +
        "</p>" +
        "</div>" +
        (iaDisponible
          ? '<button type="button" class="boton-secundario" id="btn-correccion-ia">' + esc(t("escritura.pedir_correccion")) + '</button>' +
            '<div id="zona-correccion-ia"></div>'
          : "") +
        '<button type="button" class="boton-principal escritura-boton-terminar-final" id="btn-terminar-escritura">' + esc(t("comun.terminar")) + '</button>' +
        "</div>" +
        "</div>" +
        "</div>";

      el.querySelectorAll("[data-i18n-live]").forEach(function (nodo) {
        nodo.textContent = t(nodo.getAttribute("data-i18n-live"));
      });

      el.querySelectorAll(".escritura-criterio input[type=checkbox]").forEach(function (casilla) {
        casilla.addEventListener("change", function () {
          var i = Number(casilla.getAttribute("data-indice"));
          if (casilla.checked) estado.marcados.add(i);
          else estado.marcados.delete(i);
        });
      });

      if (iaDisponible) {
        conectarCorreccionIA(el, prefs, t);
      }

      el.querySelector("#btn-terminar-escritura").addEventListener("click", function () {
        finalizarSesionSiActiva().then(function () {
          var r = estado && estado.resultadoConfirmacion;
          if (r) {
            // Modo confirmación: se muestra el resultado antes de volver a la ruta.
            var nivelNombre = estado.consigna.nivelCEFR;
            global.App.Screens.confirmacion.pintarTarjetaResultado(
              el, t, "escritura", r,
              '<span class="num-tabular">' + r.porcentaje + "</span>% · " + global.App.Util.escaparHTML(nivelNombre),
              function () { estado = null; }
            );
            return;
          }
          estado = null;
          global.App.Util.terminarPasoYVolver();
        });
      });
    });
  }

  /** Pide a la IA una corrección breve del texto que Alex escribió. Reusa
   * App.Conversacion.{MODELO,MAX_TOKENS_RESPUESTA,parsearRespuesta,mensajeError} (ya
   * genéricos) en vez de duplicar esas constantes -- el único payload propio de esta
   * pantalla es el "system" prompt, armado aquí porque pedir una corrección de texto es un
   * caso de uso distinto al de sostener una conversación (js/core/conversacion.js). */
  function conectarCorreccionIA(el, prefs, t) {
    var boton = el.querySelector("#btn-correccion-ia");
    var zona = el.querySelector("#zona-correccion-ia");
    boton.addEventListener("click", function () {
      boton.disabled = true;
      zona.innerHTML = '<p class="texto-tenue">' + global.App.Util.escaparHTML(t("escritura.pidiendo_correccion")) + '</p>';
      // i18n-ok-start: instrucción para el modelo de IA (siempre en inglés), no texto de interfaz
      var sistema =
        "You are an English writing tutor helping a student at CEFR level " +
        (estado.consigna.nivelCEFR || "A2") +
        '. They were asked to write: "' +
        estado.consigna.consigna +
        '". Correct their text for grammar, word choice, and natural phrasing. Reply with a short corrected ' +
        "version first, then 2-3 brief bullet points explaining the main fixes, in simple language appropriate " +
        "for their level. Keep your whole reply under 200 words.";
      // i18n-ok-end
      var payload = {
        model: global.App.Conversacion.MODELO,
        max_tokens: global.App.Conversacion.MAX_TOKENS_RESPUESTA,
        system: sistema,
        messages: [{ role: "user", content: estado.texto }]
      };
      global.App.IA.enviarMensaje(prefs.conversacionWorkerUrl, payload).then(function (res) {
        boton.disabled = false;
        if (res.status === 200) {
          var resultado = global.App.Conversacion.parsearRespuesta(res.json);
          if (resultado.ok) {
            zona.innerHTML = '<div class="escritura-correccion-ia superficie-oscura"><p>' + global.App.Util.escaparHTML(resultado.texto) + "</p></div>";
            boton.hidden = true;
            return;
          }
          zona.innerHTML = '<p class="mensaje-error">' + global.App.Util.escaparHTML(resultado.error) + "</p>";
          return;
        }
        zona.innerHTML = '<p class="mensaje-error">' + global.App.Util.escaparHTML(global.App.Conversacion.mensajeError(res.status)) + "</p>";
      });
    });
  }

  global.addEventListener("hashchange", function () {
    if (location.hash.indexOf("escritura") === -1) {
      finalizarSesionSiActiva();
      estado = null;
    }
  });

  global.App = global.App || {};
  global.App.Screens = global.App.Screens || {};
  global.App.Screens.escritura = { render: render };
})(typeof window !== "undefined" ? window : globalThis);
