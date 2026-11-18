(function (global) {
  "use strict";

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

  function render(el, ctx) {
    var t = function (clave) {
      return global.App.I18n.texto(clave, ctx.nivelInterfaz, ctx.strings);
    };

    el.innerHTML = '<div class="estado-vacio">…</div>';

    global.App.Datos.obtenerPreferencias().then(function (prefs) {
      el.innerHTML =
        '<div class="pantalla-vista ancho-lectura">' +
        '<h1 data-i18n-live="ajustes.titulo"></h1>' +
        '<div class="seccion entrada-escalonada">' +
        '<div class="seccion">' +
        "<h2>Tema</h2>" +
        '<div class="fila-botones" id="botones-tema"></div>' +
        "</div>" +
        '<div class="seccion">' +
        "<h2>Meta diaria</h2>" +
        '<div class="fila-botones" id="botones-meta"></div>' +
        "</div>" +
        '<div class="seccion">' +
        "<h2>Idioma de la interfaz</h2>" +
        '<button type="button" class="boton-secundario" id="btn-forzar-espanol">Forzar español</button>' +
        '<p class="texto-caption" style="margin-top:8px">Si lo activas, la interfaz se queda en español sin importar tus días activos.</p>' +
        "</div>" +
        '<div class="seccion">' +
        "<h2>Conversación con IA</h2>" +
        '<p class="texto-caption">Necesita tu propio proxy desplegado (ver REPORTE_CONVERSACION_IA.md). Tu clave de API nunca vive aquí.</p>' +
        '<button type="button" class="boton-secundario" id="btn-activar-conversacion" style="margin-top:8px">Activar</button>' +
        '<input type="url" id="input-worker-url" class="campo-texto" placeholder="https://tu-worker.tu-cuenta.workers.dev" style="margin-top:8px" />' +
        "</div>" +
        '<div class="fila">' +
        '<button type="button" class="enlace-discreto" id="btn-exportar" data-i18n-live="ajustes.exportar"></button>' +
        "</div>" +
        '<div class="fila">' +
        '<button type="button" class="enlace-discreto" id="btn-importar" data-i18n-live="ajustes.importar"></button>' +
        '<input type="file" id="input-importar" accept="application/json" hidden />' +
        '<p id="mensaje-importar" class="texto-tenue" aria-live="polite"></p>' +
        "</div>" +
        "</div>" +
        "</div>";

      el.querySelectorAll("[data-i18n-live]").forEach(function (nodo) {
        nodo.textContent = t(nodo.getAttribute("data-i18n-live"));
      });

      var contenedorTema = el.querySelector("#botones-tema");
      [
        { valor: "sistema", etiqueta: "Sistema" },
        { valor: "claro", etiqueta: "Claro" },
        { valor: "oscuro", etiqueta: "Oscuro" }
      ].forEach(function (opcion) {
        var boton = document.createElement("button");
        boton.type = "button";
        boton.className = "boton-secundario";
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

      var btnActivarConversacion = el.querySelector("#btn-activar-conversacion");
      var inputWorkerUrl = el.querySelector("#input-worker-url");
      inputWorkerUrl.value = prefs.conversacionWorkerUrl || "";
      if (prefs.conversacionActivada) btnActivarConversacion.setAttribute("aria-current", "true");
      btnActivarConversacion.textContent = prefs.conversacionActivada ? "Desactivar" : "Activar";

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

      var contenedorMeta = el.querySelector("#botones-meta");
      [5, 15, 30].forEach(function (minutos) {
        var boton = document.createElement("button");
        boton.type = "button";
        boton.className = "boton-secundario";
        boton.textContent = minutos + " min";
        if (minutos === prefs.metaMinutosDia) boton.setAttribute("aria-current", "true");
        boton.addEventListener("click", function () {
          global.App.Datos.guardarPreferencias(Object.assign({}, prefs, { metaMinutosDia: minutos })).then(function () {
            prefs.metaMinutosDia = minutos;
            contenedorMeta.querySelectorAll("button").forEach(function (b) {
              b.removeAttribute("aria-current");
            });
            boton.setAttribute("aria-current", "true");
          });
        });
        contenedorMeta.appendChild(boton);
      });

      el.querySelector("#btn-exportar").addEventListener("click", function () {
        global.App.Storage.exportBackup().then(function (backup) {
          descargarJSON(backup, "respaldo-ingles-app-" + fechaHoyISO() + ".json");
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
              .then(function (res) {
                mensaje.textContent = "Importado: " + res.importados.join(", ");
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
