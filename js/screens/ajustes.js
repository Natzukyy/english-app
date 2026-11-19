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
    var t = function (clave) {
      return global.App.I18n.texto(clave, ctx.nivelInterfaz, ctx.strings);
    };
    var esc = global.App.Util.escaparHTML;

    el.innerHTML = '<div class="estado-vacio">…</div>';

    Promise.all([global.App.Datos.obtenerPreferencias(), global.App.Datos.obtenerMinutosPorDia()]).then(function (res) {
      var prefs = res[0];
      var minutosPorDia = res[1];
      var progresoIngles = calcularProgresoIngles(minutosPorDia, ctx.umbrales);
      var metaActual = Math.min(META_MAX, Math.max(META_MIN, prefs.metaMinutosDia || 15));

      var estadoConversacion = prefs.conversacionActivada ? "Activada" : "No configurada";
      var colorEstadoConversacion = prefs.conversacionActivada ? "var(--menta)" : "var(--surface-borde)";

      el.innerHTML =
        '<div class="pantalla-vista pantalla-ajustes">' +
        '<h1 data-i18n-live="ajustes.titulo"></h1>' +
        '<div class="ajustes-grid pop-entrada-escalonada">' +
        // 1. Meta diaria
        '<div class="ajustes-tarjeta superficie-oscura">' +
        "<h2>Meta diaria</h2>" +
        '<div class="ajustes-stepper">' +
        '<button type="button" class="ajustes-stepper-boton calcomania calcomania-presionable" id="btn-meta-menos" aria-label="Bajar meta diaria" style="--r:0deg">−</button>' +
        '<span class="ajustes-stepper-valor num-tabular" id="valor-meta">' +
        metaActual +
        ' <small>min</small></span>' +
        '<button type="button" class="ajustes-stepper-boton calcomania calcomania-presionable" id="btn-meta-mas" aria-label="Subir meta diaria" style="--r:0deg">+</button>' +
        "</div>" +
        "</div>" +
        // 2. Voz del modelo
        '<div class="ajustes-tarjeta superficie-oscura">' +
        "<h2>Voz del modelo</h2>" +
        '<p class="texto-caption">Qué voz usan Habla, Diagnóstico y Conversación para leer en voz alta.</p>' +
        '<select id="select-voz" class="campo-texto" style="margin-top:8px"><option value="">Cargando voces…</option></select>' +
        '<button type="button" class="boton-secundario" id="btn-probar-voz" style="margin-top:8px" disabled>Probar</button>' +
        "</div>" +
        // 3. Tema
        '<div class="ajustes-tarjeta superficie-oscura">' +
        "<h2>Tema</h2>" +
        '<div class="ajustes-segmentado" id="botones-tema" role="group" aria-label="Tema"></div>' +
        "</div>" +
        // 4. Interfaz en inglés
        '<div class="ajustes-tarjeta superficie-oscura">' +
        "<h2>Interfaz en inglés</h2>" +
        '<div class="barra-progreso barra-escala" style="--progreso:0">' +
        '<span id="barra-ingles" data-destino="' +
        progresoIngles.porcentaje +
        '"></span></div>' +
        '<p class="texto-caption" style="margin-top:4px">' +
        esc(progresoIngles.diasActivos) +
        " días activos · " +
        progresoIngles.porcentaje +
        "% hacia inglés completo</p>" +
        '<button type="button" class="boton-secundario" id="btn-forzar-espanol" style="margin-top:8px">Forzar español</button>' +
        '<p class="texto-caption" style="margin-top:8px">Si lo activas, la interfaz se queda en español sin importar tus días activos.</p>' +
        "</div>" +
        // 5. Tus datos
        '<div class="ajustes-tarjeta superficie-oscura">' +
        "<h2>Tus datos</h2>" +
        '<button type="button" class="ajustes-boton-dato calcomania calcomania-presionable" id="btn-exportar" style="background:var(--azul);--r:-0.6deg" data-i18n-live="ajustes.exportar"></button>' +
        '<button type="button" class="ajustes-boton-dato calcomania calcomania-presionable" id="btn-importar" style="background:var(--rosa);--r:0.6deg;margin-top:12px" data-i18n-live="ajustes.importar"></button>' +
        '<input type="file" id="input-importar" accept="application/json" hidden />' +
        '<p id="mensaje-importar" class="texto-tenue" aria-live="polite" style="margin-top:8px"></p>' +
        "</div>" +
        // 6. Conversación con IA
        '<div class="ajustes-tarjeta superficie-oscura">' +
        '<div class="fila-cabeza"><h2 style="margin:0">Conversación con IA</h2>' +
        '<span class="ajustes-pastilla-estado" id="pastilla-conversacion" style="background:' +
        colorEstadoConversacion +
        '">' +
        estadoConversacion +
        "</span></div>" +
        '<p class="texto-caption">Necesita tu propio proxy desplegado (ver REPORTE_CONVERSACION_IA.md). Tu clave de API nunca vive aquí.</p>' +
        '<input type="url" id="input-worker-url" class="campo-texto" placeholder="https://tu-worker.tu-cuenta.workers.dev" style="margin-top:8px" />' +
        '<button type="button" class="boton-secundario" id="btn-activar-conversacion" style="margin-top:8px">Activar</button>' +
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
        { valor: "sistema", etiqueta: "Sistema" },
        { valor: "claro", etiqueta: "Claro" },
        { valor: "oscuro", etiqueta: "Oscuro" }
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
            selectVoz.innerHTML = '<option value="">No hay voces en inglés disponibles en este dispositivo</option>';
            selectVoz.disabled = true;
            btnProbarVoz.disabled = true;
            return;
          }
          var vozPorDefecto = global.App.TTS.elegirVoz(utiles, "");
          var opcionAuto = document.createElement("option");
          opcionAuto.value = "";
          opcionAuto.textContent = "Automática (" + (vozPorDefecto ? vozPorDefecto.name : "—") + ")";
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
        global.App.TTS.hablar("This is what the model sounds like.", "en-US").catch(function () {
          /* sin Web Speech disponible: no hay nada que probar */
        });
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
      btnActivarConversacion.textContent = prefs.conversacionActivada ? "Desactivar" : "Activar";

      function actualizarPastillaConversacion() {
        pastillaConversacion.textContent = prefs.conversacionActivada ? "Activada" : "No configurada";
        pastillaConversacion.style.background = prefs.conversacionActivada ? "var(--menta)" : "var(--surface-borde)";
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
          btnActivarConversacion.textContent = activar ? "Desactivar" : "Activar";
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

      // --- Tus datos (exportar/importar) ---
      el.querySelector("#btn-exportar").addEventListener("click", function () {
        global.App.Storage.exportBackup().then(function (backup) {
          descargarJSON(backup, "respaldo-rumbo-" + fechaHoyISO() + ".json");
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
                mensaje.textContent = "Importado: " + res2.importados.join(", ");
                mensaje.classList.remove("mensaje-error");
              })
              .catch(function (err) {
                mensaje.textContent = t("error.generico") + " (" + err.message + ")";
                mensaje.classList.add("mensaje-error");
              });
          } catch (err) {
            mensaje.textContent = t("error.generico") + " (JSON inválido)";
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
