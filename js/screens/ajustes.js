(function (global) {
  "use strict";

  var listenerVocesCambiaron = null; // referencia al listener de voiceschanged del render anterior, para no acumularlos

  var META_MIN = 5;
  var META_MAX = 60;
  var META_PASO = 5;

  function descargarJSON(objeto, nombreArchivo) {
    var blob = new Blob([JSON.stringify(objeto, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function fechaHoyISO() {
    return new Date().toISOString().slice(0, 10);
  }

  /** % de avance hacia interfaz 100% en inglés (nivel 3), en días activos reales -- mismo
   * cálculo que ya hace js/app.js para decidir el nivel actual, solo que aquí también se
   * convierte a porcentaje para la barra. Nunca toca App.I18n/App.Racha, solo los consume. */
  function calcularProgresoIngles(minutosPorDia, umbrales) {
    var minimoRacha = global.App.Racha.OPCIONES_POR_DEFECTO.metaMinutosDia;
    var diasActivos = global.App.Racha.contarDiasActivos(minutosPorDia, minimoRacha);
    var niveles = (umbrales && umbrales.niveles) || [];
    var umbralMax = niveles.reduce(function (max, def) {
      return Math.max(max, def.minDiasActivos || 0);
    }, 1);
    return {
      diasActivos: diasActivos,
      porcentaje: Math.max(0, Math.min(100, Math.round((diasActivos / umbralMax) * 100)))
    };
  }

  function render(el, ctx) {
    var t = global.App.I18n.traductor(ctx);
    var esc = global.App.Util.escaparHTML;

    el.innerHTML = '<div class="estado-vacio">…</div>';

    Promise.all([global.App.Datos.obtenerPreferencias(), global.App.Datos.obtenerMinutosPorDia()]).then(function (res) {
      var prefs = res[0];
      var minutosPorDia = res[1];
      var progresoIngles = calcularProgresoIngles(minutosPorDia, ctx.umbrales);
      var metaActual = Math.min(META_MAX, Math.max(META_MIN, prefs.metaMinutosDia || 15));

      var cfgRecordatorio = global.App.Recordatorio.normalizarConfig({ hora: prefs.recordatorioHora, dias: prefs.recordatorioDias });
      var estadoConversacion = t(prefs.conversacionActivada ? "ajustes.conv_activada" : "ajustes.conv_no_configurada");
      var colorEstadoConversacion = prefs.conversacionActivada ? "var(--menta)" : "var(--surface-relleno)";

      el.innerHTML =
        '<div class="pantalla-vista pantalla-ajustes">' +
        '<h1 data-i18n-live="ajustes.titulo"></h1>' +
        '<div class="ajustes-grid pop-entrada-escalonada">' +
        // 1. Meta diaria
        '<div class="ajustes-tarjeta superficie-oscura">' +
        "<h2>" + esc(t("ajustes.meta_titulo")) + "</h2>" +
        '<div class="ajustes-stepper">' +
        '<button type="button" class="ajustes-stepper-boton calcomania calcomania-presionable" id="btn-meta-menos" aria-label="' + esc(t("ajustes.meta_bajar_aria")) + '" style="--r:0deg">−</button>' +
        '<span class="ajustes-stepper-valor num-tabular" id="valor-meta">' +
        metaActual +
        ' <small>min</small></span>' +
        '<button type="button" class="ajustes-stepper-boton calcomania calcomania-presionable" id="btn-meta-mas" aria-label="' + esc(t("ajustes.meta_subir_aria")) + '" style="--r:0deg">+</button>' +
        "</div>" +
        "</div>" +
        // 2. Voz del modelo
        '<div class="ajustes-tarjeta superficie-oscura">' +
        "<h2>" + esc(t("ajustes.voz_titulo")) + "</h2>" +
        '<p class="texto-caption">' + esc(t("ajustes.voz_descripcion")) + '</p>' +
        '<select id="select-voz" class="campo-texto" style="margin-top:8px"><option value="">' + esc(t("ajustes.voz_cargando")) + '</option></select>' +
        '<button type="button" class="boton-secundario" id="btn-probar-voz" style="margin-top:8px" disabled>' + esc(t("ajustes.voz_probar")) + '</button>' +
        "</div>" +
        // 3. Tema
        '<div class="ajustes-tarjeta superficie-oscura">' +
        "<h2>" + esc(t("ajustes.tema_titulo")) + "</h2>" +
        '<div class="ajustes-segmentado" id="botones-tema" role="group" aria-label="' + esc(t("ajustes.tema_titulo")) + '"></div>' +
        "</div>" +
        // 4. Interfaz en inglés
        '<div class="ajustes-tarjeta superficie-oscura">' +
        "<h2>" + esc(t("ajustes.ingles_titulo")) + "</h2>" +
        '<div class="barra-progreso barra-escala" style="--progreso:0">' +
        '<span id="barra-ingles" data-destino="' +
        progresoIngles.porcentaje +
        '"></span></div>' +
        '<p class="texto-caption" style="margin-top:4px">' +
        esc(t("ajustes.ingles_progreso", { dias: progresoIngles.diasActivos, pct: progresoIngles.porcentaje })) +
        "</p>" +
        '<button type="button" class="boton-secundario" id="btn-forzar-espanol" style="margin-top:8px">' + esc(t("ajustes.forzar_espanol")) + '</button>' +
        '<p class="texto-caption" style="margin-top:8px">' + esc(t("ajustes.forzar_espanol_desc")) + '</p>' +
        "</div>" +
        // 4b. Recordatorio en el Calendario (.ics, D38)
        '<div class="ajustes-tarjeta superficie-oscura">' +
        "<h2>" + esc(t("recordatorio.titulo")) + "</h2>" +
        '<p class="texto-caption">' + esc(t("recordatorio.descripcion")) + "</p>" +
        '<label class="ajustes-etiqueta-campo" for="input-recordatorio-hora">' + esc(t("recordatorio.hora")) + "</label>" +
        '<input type="time" id="input-recordatorio-hora" class="campo-texto" value="' + esc(cfgRecordatorio.hora) + '" />' +
        '<div class="ajustes-etiqueta-campo" id="etiqueta-recordatorio-dias">' + esc(t("recordatorio.dias")) + "</div>" +
        '<div class="ajustes-dias" id="botones-recordatorio-dias" role="group" aria-labelledby="etiqueta-recordatorio-dias"></div>' +
        '<a role="button" class="ajustes-boton-dato calcomania calcomania-presionable ajustes-enlace-calendario" id="enlace-calendario" href="#" hidden style="background:var(--menta);--r:0.4deg;margin-top:12px">' + esc(t("recordatorio.abrir")) + "</a>" +
        '<button type="button" class="ajustes-boton-dato calcomania calcomania-presionable" id="btn-recordatorio" style="background:var(--menta);--r:0.4deg;margin-top:12px">' + esc(t("recordatorio.descargar")) + "</button>" +
        '<div class="ajustes-ics-secundarios">' +
        '<button type="button" class="boton-secundario" id="btn-guardar-archivo">' + esc(t("recordatorio.guardar_archivo")) + "</button>" +
        '<button type="button" class="boton-secundario" id="btn-ver-texto">' + esc(t("recordatorio.copiar")) + "</button>" +
        "</div>" +
        '<p class="texto-caption" id="ayuda-recordatorio"></p>' +
        '<p id="mensaje-recordatorio" class="texto-caption" aria-live="polite"></p>' +
        '<div id="recordatorio-texto" hidden>' +
        '<p class="texto-caption">' + esc(t("recordatorio.texto_instrucciones")) + "</p>" +
        '<textarea id="recordatorio-ics" class="campo-texto ajustes-ics" readonly rows="6"></textarea>' +
        '<button type="button" class="boton-secundario" id="btn-copiar-ics">' + esc(t("recordatorio.copiar")) + "</button>" +
        "</div>" +
        '<p class="texto-caption">' + esc(t("recordatorio.diferencia")) + "</p>" +
        "</div>" +
        // 5. Tus datos
        '<div class="ajustes-tarjeta superficie-oscura">' +
        "<h2>" + esc(t("ajustes.datos_titulo")) + "</h2>" +
        '<button type="button" class="ajustes-boton-dato calcomania calcomania-presionable" id="btn-exportar" style="background:var(--azul);--r:-0.6deg" data-i18n-live="ajustes.exportar"></button>' +
        '<button type="button" class="ajustes-boton-dato calcomania calcomania-presionable" id="btn-importar" style="background:var(--rosa);--r:0.6deg;margin-top:12px" data-i18n-live="ajustes.importar"></button>' +
        '<input type="file" id="input-importar" accept="application/json" hidden />' +
        '<p id="mensaje-importar" class="texto-tenue" aria-live="polite" style="margin-top:8px"></p>' +
        "</div>" +
        // 6. Conversación con IA
        '<div class="ajustes-tarjeta superficie-oscura">' +
        '<div class="fila-cabeza"><h2 style="margin:0">' + esc(t("ajustes.conv_titulo")) + '</h2>' +
        '<span class="ajustes-pastilla-estado' + (prefs.conversacionActivada ? " ajustes-pastilla-estado--activa" : "") + '" id="pastilla-conversacion" style="background:' +
        colorEstadoConversacion +
        '">' +
        esc(estadoConversacion) +
        "</span></div>" +
        '<p class="texto-caption">' + esc(t("ajustes.conv_descripcion")) + '</p>' +
        '<input type="url" id="input-worker-url" class="campo-texto" placeholder="https://tu-worker.tu-cuenta.workers.dev" style="margin-top:8px" />' + // i18n-ok: URL de ejemplo, no texto traducible
        '<button type="button" class="boton-secundario" id="btn-activar-conversacion" style="margin-top:8px">' + esc(t("ajustes.conv_activar")) + '</button>' +
        "</div>" +
        "</div>" +
        "</div>";

      el.querySelectorAll("[data-i18n-live]").forEach(function (nodo) {
        nodo.textContent = t(nodo.getAttribute("data-i18n-live"));
      });

      // El relleno de la barra se fija un frame después de montar, si no la transición CSS
      // (definida en .barra-escala > span) no se dispara -- mismo patrón que progreso.js.
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          var span = el.querySelector("#barra-ingles");
          if (span) span.style.setProperty("--progreso", (Number(span.getAttribute("data-destino")) || 0) / 100);
        });
      });

      // --- Tema (segmentado) ---
      var contenedorTema = el.querySelector("#botones-tema");
      [
        { valor: "sistema", etiqueta: t("ajustes.tema_sistema") },
        { valor: "claro", etiqueta: t("ajustes.tema_claro") },
        { valor: "oscuro", etiqueta: t("ajustes.tema_oscuro") }
      ].forEach(function (opcion) {
        var boton = document.createElement("button");
        boton.type = "button";
        boton.className = "ajustes-segmentado-boton";
        boton.textContent = opcion.etiqueta;
        if (opcion.valor === prefs.tema) boton.setAttribute("aria-current", "true");
        boton.addEventListener("click", function () {
          global.App.Util.aplicarTema(opcion.valor); // optimista: se ve al toque, no espera guardar
          global.App.Datos.guardarPreferencias(Object.assign({}, prefs, { tema: opcion.valor })).then(function () {
            prefs.tema = opcion.valor;
            contenedorTema.querySelectorAll("button").forEach(function (b) {
              b.removeAttribute("aria-current");
            });
            boton.setAttribute("aria-current", "true");
          });
        });
        contenedorTema.appendChild(boton);
      });

      // --- Meta diaria (stepper −/+) ---
      var valorMeta = el.querySelector("#valor-meta");
      var btnMetaMenos = el.querySelector("#btn-meta-menos");
      var btnMetaMas = el.querySelector("#btn-meta-mas");

      function actualizarBotonesMeta() {
        btnMetaMenos.disabled = metaActual <= META_MIN;
        btnMetaMas.disabled = metaActual >= META_MAX;
      }
      actualizarBotonesMeta();

      function cambiarMeta(delta) {
        var nuevaMeta = Math.min(META_MAX, Math.max(META_MIN, metaActual + delta));
        if (nuevaMeta === metaActual) return;
        metaActual = nuevaMeta;
        valorMeta.innerHTML = metaActual + " <small>min</small>";
        actualizarBotonesMeta();
        global.App.Datos.guardarPreferencias(Object.assign({}, prefs, { metaMinutosDia: metaActual })).then(function () {
          prefs.metaMinutosDia = metaActual;
        });
      }
      btnMetaMenos.addEventListener("click", function () {
        cambiarMeta(-META_PASO);
      });
      btnMetaMas.addEventListener("click", function () {
        cambiarMeta(META_PASO);
      });

      // --- Voz del modelo ---
      var selectVoz = el.querySelector("#select-voz");
      var btnProbarVoz = el.querySelector("#btn-probar-voz");

      function poblarVoces() {
        global.App.TTS.obtenerVocesListas().then(function (voces) {
          var utiles = global.App.TTS.vocesUtiles(voces);
          selectVoz.innerHTML = "";
          if (!utiles.length) {
            selectVoz.innerHTML = '<option value="">' + esc(t("ajustes.voz_sin_voces")) + '</option>';
            selectVoz.disabled = true;
            btnProbarVoz.disabled = true;
            return;
          }
          var vozPorDefecto = global.App.TTS.elegirVoz(utiles, "");
          var opcionAuto = document.createElement("option");
          opcionAuto.value = "";
          opcionAuto.textContent = t("ajustes.voz_automatica", { nombre: vozPorDefecto ? vozPorDefecto.name : "—" });
          selectVoz.appendChild(opcionAuto);
          utiles.forEach(function (voz) {
            var opcion = document.createElement("option");
            opcion.value = voz.name;
            opcion.textContent = voz.name + " (" + voz.lang + ")";
            selectVoz.appendChild(opcion);
          });
          var prefSigueDisponible = prefs.vozPreferidaTTS && utiles.some(function (voz) {
            return voz.name === prefs.vozPreferidaTTS;
          });
          selectVoz.value = prefSigueDisponible ? prefs.vozPreferidaTTS : "";
          selectVoz.disabled = false;
          btnProbarVoz.disabled = false;
        });
      }
      poblarVoces();
      // En algunos navegadores getVoices() devuelve [] hasta que termina de cargar las voces
      // del sistema; cuando eso pasa después del primer render, se vuelve a poblar la lista.
      // Se quita el listener del render anterior para no acumularlos en speechSynthesis
      // (este <select> se recrea cada vez que se entra a Ajustes).
      if (global.speechSynthesis) {
        if (listenerVocesCambiaron) {
          global.speechSynthesis.removeEventListener("voiceschanged", listenerVocesCambiaron);
        }
        listenerVocesCambiaron = poblarVoces;
        global.speechSynthesis.addEventListener("voiceschanged", listenerVocesCambiaron);
      }

      selectVoz.addEventListener("change", function () {
        var valor = selectVoz.value;
        global.App.Datos.guardarPreferencias(Object.assign({}, prefs, { vozPreferidaTTS: valor })).then(function () {
          prefs.vozPreferidaTTS = valor;
          global.App.TTS.establecerVozPreferida(valor);
        });
      });

      btnProbarVoz.addEventListener("click", function () {
        // i18n-ok-start: frase de prueba que se pronuncia en inglés, no texto de interfaz
        global.App.TTS.hablar("This is what the model sounds like.", "en-US").catch(function () {
          /* sin Web Speech disponible: no hay nada que probar */
        });
        // i18n-ok-end
      });

      // --- Interfaz en inglés (forzar español) ---
      var btnForzarEspanol = el.querySelector("#btn-forzar-espanol");
      if (prefs.forzarEspanol) btnForzarEspanol.setAttribute("aria-current", "true");
      btnForzarEspanol.addEventListener("click", function () {
        var nuevoValor = !prefs.forzarEspanol;
        global.App.Datos.guardarPreferencias(Object.assign({}, prefs, { forzarEspanol: nuevoValor })).then(function () {
          prefs.forzarEspanol = nuevoValor;
          if (nuevoValor) btnForzarEspanol.setAttribute("aria-current", "true");
          else btnForzarEspanol.removeAttribute("aria-current");
        });
      });

      // --- Conversación con IA ---
      var btnActivarConversacion = el.querySelector("#btn-activar-conversacion");
      var inputWorkerUrl = el.querySelector("#input-worker-url");
      var pastillaConversacion = el.querySelector("#pastilla-conversacion");
      inputWorkerUrl.value = prefs.conversacionWorkerUrl || "";
      if (prefs.conversacionActivada) btnActivarConversacion.setAttribute("aria-current", "true");
      btnActivarConversacion.textContent = t(prefs.conversacionActivada ? "ajustes.conv_desactivar" : "ajustes.conv_activar");

      function actualizarPastillaConversacion() {
        pastillaConversacion.textContent = t(prefs.conversacionActivada ? "ajustes.conv_activada" : "ajustes.conv_no_configurada");
        pastillaConversacion.style.background = prefs.conversacionActivada ? "var(--menta)" : "var(--surface-relleno)";
        pastillaConversacion.classList.toggle("ajustes-pastilla-estado--activa", !!prefs.conversacionActivada);
      }

      function guardarAjustesConversacion() {
        var url = inputWorkerUrl.value.trim();
        var activar = !prefs.conversacionActivada;
        // No se puede activar sin una URL -- evita un botón "activado" que en realidad no hace nada.
        if (activar && !url) {
          inputWorkerUrl.focus();
          return;
        }
        global.App.Datos.guardarPreferencias(Object.assign({}, prefs, { conversacionActivada: activar, conversacionWorkerUrl: url })).then(function () {
          prefs.conversacionActivada = activar;
          prefs.conversacionWorkerUrl = url;
          btnActivarConversacion.textContent = t(activar ? "ajustes.conv_desactivar" : "ajustes.conv_activar");
          if (activar) btnActivarConversacion.setAttribute("aria-current", "true");
          else btnActivarConversacion.removeAttribute("aria-current");
          actualizarPastillaConversacion();
        });
      }

      btnActivarConversacion.addEventListener("click", guardarAjustesConversacion);
      inputWorkerUrl.addEventListener("blur", function () {
        // Si solo cambió la URL sin tocar Activar/Desactivar, igual se guarda al salir del campo.
        var url = inputWorkerUrl.value.trim();
        if (url === (prefs.conversacionWorkerUrl || "")) return;
        global.App.Datos.guardarPreferencias(Object.assign({}, prefs, { conversacionWorkerUrl: url })).then(function () {
          prefs.conversacionWorkerUrl = url;
        });
      });

      // --- Recordatorio en el Calendario (.ics, D38) ---
      var inputHora = el.querySelector("#input-recordatorio-hora");
      var contenedorDias = el.querySelector("#botones-recordatorio-dias");
      var mensajeRecordatorio = el.querySelector("#mensaje-recordatorio");
      var bloqueTexto = el.querySelector("#recordatorio-texto");
      var areaIcs = el.querySelector("#recordatorio-ics");

      function guardarRecordatorio() {
        var nueva = global.App.Recordatorio.normalizarConfig(cfgRecordatorio);
        cfgRecordatorio = nueva;
        return global.App.Datos.guardarPreferencias(Object.assign({}, prefs, { recordatorioHora: nueva.hora, recordatorioDias: nueva.dias })).then(function () {
          prefs.recordatorioHora = nueva.hora;
          prefs.recordatorioDias = nueva.dias;
        });
      }

      global.App.Recordatorio.CODIGOS_DIA.forEach(function (codigo, i) {
        var boton = document.createElement("button");
        boton.type = "button";
        boton.className = "ajustes-segmentado-boton ajustes-dia";
        boton.textContent = t("recordatorio.dia_" + i);
        boton.setAttribute("aria-pressed", cfgRecordatorio.dias.indexOf(i) !== -1 ? "true" : "false");
        boton.addEventListener("click", function () {
          var activo = cfgRecordatorio.dias.indexOf(i) !== -1;
          var nuevos = activo
            ? cfgRecordatorio.dias.filter(function (d) {
                return d !== i;
              })
            : cfgRecordatorio.dias.concat([i]);
          if (!nuevos.length) return; // siempre al menos un día
          cfgRecordatorio = global.App.Recordatorio.normalizarConfig({ hora: cfgRecordatorio.hora, dias: nuevos });
          boton.setAttribute("aria-pressed", activo ? "false" : "true");
          guardarRecordatorio();
        });
        contenedorDias.appendChild(boton);
      });

      inputHora.addEventListener("change", function () {
        cfgRecordatorio = global.App.Recordatorio.normalizarConfig({ hora: inputHora.value, dias: cfgRecordatorio.dias });
        inputHora.value = cfgRecordatorio.hora;
        guardarRecordatorio();
      });

      function mostrarTextoIcs(ics) {
        areaIcs.value = ics;
        bloqueTexto.hidden = false;
      }

      function crearArchivoIcs(ics) {
        var blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
        var archivo = null;
        try {
          archivo = new File([blob], "hey-recordatorio.ics", { type: "text/calendar" });
        } catch (e) {
          archivo = null;
        }
        return { blob: blob, archivo: archivo };
      }

      function descargarIcs(blob) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "hey-recordatorio.ics";
        a.type = "text/calendar";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () {
          URL.revokeObjectURL(url);
        }, 4000);
      }

      var R = global.App.Recordatorio;
      var nav = global.navigator || {};
      var ios = R.esIOS({ userAgent: nav.userAgent, plataforma: nav.platform, maxTouchPoints: nav.maxTouchPoints });
      var enlaceCal = el.querySelector("#enlace-calendario");
      var btnDescargar = el.querySelector("#btn-recordatorio");
      var ayuda = el.querySelector("#ayuda-recordatorio");

      function generarIcs() {
        var nombreApp = (ctx.config && ctx.config.nombreApp) || "Hey!"; // i18n-ok: nombre de reserva; el real vive en data/config.json
        var titulo = t("recordatorio.evento_titulo", { app: nombreApp });
        return {
          titulo: titulo,
          ics: R.construirICS({
            hora: cfgRecordatorio.hora,
            dias: cfgRecordatorio.dias,
            titulo: titulo,
            descripcion: t("recordatorio.evento_descripcion"),
            alarma: t("recordatorio.evento_alarma"),
            url: global.location.origin + global.location.pathname,
            ahora: new Date()
          })
        };
      }

      // Principal en iOS: un <a> real (sin download) con href data:text/calendar, que Safari abre
      // con el aviso nativo "Añadir a Calendario". Se refresca al cambiar hora/días y al tocarlo (D39).
      function refrescarEnlace() {
        if (ios) enlaceCal.setAttribute("href", R.enlaceDatosICS(generarIcs().ics));
      }

      if (ios) {
        enlaceCal.hidden = false;
        btnDescargar.hidden = true;
        ayuda.textContent = t("recordatorio.ayuda_ios");
        refrescarEnlace();
        enlaceCal.addEventListener("click", function () {
          refrescarEnlace(); // antes de que el navegador siga el enlace: usa la hora y días actuales
          guardarRecordatorio();
          mensajeRecordatorio.textContent = t("recordatorio.abierto");
        });
        inputHora.addEventListener("change", refrescarEnlace);
        contenedorDias.addEventListener("click", refrescarEnlace);
      } else {
        ayuda.textContent = t("recordatorio.ayuda_otros");
      }

      function entregarComoArchivo(preferirCompartir) {
        var g = generarIcs();
        guardarRecordatorio();
        var f = crearArchivoIcs(g.ics);
        var puedeCompartir = !!(f.archivo && nav && typeof nav.share === "function" && typeof nav.canShare === "function" && nav.canShare({ files: [f.archivo] }));
        var puedeDescargar = typeof global.URL !== "undefined" && typeof global.URL.createObjectURL === "function" && "download" in document.createElement("a");
        var metodo = preferirCompartir ? R.elegirEntrega({ puedeCompartirArchivos: puedeCompartir, puedeDescargar: puedeDescargar }) : (puedeDescargar ? "descarga" : "texto");
        bloqueTexto.hidden = true;

        function porDescarga() {
          descargarIcs(f.blob);
          mensajeRecordatorio.innerHTML = esc(t("recordatorio.descargado")) + ' <button type="button" class="enlace-discreto" id="btn-ver-ics">' + esc(t("recordatorio.mostrar_texto")) + "</button>";
          var ver = mensajeRecordatorio.querySelector("#btn-ver-ics");
          if (ver) ver.addEventListener("click", function () { mostrarTextoIcs(g.ics); });
        }

        if (metodo === "compartir") {
          nav.share({ files: [f.archivo], title: g.titulo }).then(
            function () {
              mensajeRecordatorio.textContent = t("recordatorio.compartido");
            },
            function (err) {
              if (err && err.name === "AbortError") return; // i18n-ok: nombre de error de la Web Share API, no texto visible
              if (puedeDescargar) porDescarga();
              else mostrarTextoIcs(g.ics);
            }
          );
        } else if (metodo === "descarga") {
          porDescarga();
        } else {
          mensajeRecordatorio.textContent = "";
          mostrarTextoIcs(g.ics);
        }
      }

      btnDescargar.addEventListener("click", function () { entregarComoArchivo(false); });
      el.querySelector("#btn-guardar-archivo").addEventListener("click", function () { entregarComoArchivo(true); });
      el.querySelector("#btn-ver-texto").addEventListener("click", function () {
        mensajeRecordatorio.textContent = "";
        mostrarTextoIcs(generarIcs().ics);
      });

      el.querySelector("#btn-copiar-ics").addEventListener("click", function () {
        areaIcs.select();
        var ok = false;
        try {
          if (global.navigator.clipboard && global.navigator.clipboard.writeText) {
            global.navigator.clipboard.writeText(areaIcs.value);
            ok = true;
          } else {
            ok = document.execCommand("copy");
          }
        } catch (e) {
          ok = false;
        }
        if (ok) mensajeRecordatorio.textContent = t("recordatorio.copiado");
      });

      // --- Tus datos (exportar/importar) ---
      el.querySelector("#btn-exportar").addEventListener("click", function () {
        global.App.Storage.exportBackup().then(function (backup) {
          descargarJSON(backup, "respaldo-hey-" + fechaHoyISO() + ".json");
        });
      });

      var inputImportar = el.querySelector("#input-importar");
      el.querySelector("#btn-importar").addEventListener("click", function () {
        inputImportar.click();
      });

      inputImportar.addEventListener("change", function () {
        var archivo = inputImportar.files && inputImportar.files[0];
        if (!archivo) return;
        var mensaje = el.querySelector("#mensaje-importar");
        var lector = new FileReader();
        lector.onload = function () {
          try {
            var backup = JSON.parse(lector.result);
            global.App.Storage.importBackup(backup)
              .then(function (res2) {
                mensaje.textContent = t("ajustes.importado", { lista: res2.importados.join(", ") });
                mensaje.classList.remove("mensaje-error");
              })
              .catch(function (err) {
                mensaje.textContent = t("error.generico") + " (" + err.message + ")";
                mensaje.classList.add("mensaje-error");
              });
          } catch (err) {
            mensaje.textContent = t("error.generico") + " (" + t("ajustes.json_invalido") + ")";
            mensaje.classList.add("mensaje-error");
          }
        };
        lector.readAsText(archivo);
      });
    });
  }

  global.App = global.App || {};
  global.App.Screens = global.App.Screens || {};
  global.App.Screens.ajustes = { render: render };
})(typeof window !== "undefined" ? window : globalThis);
