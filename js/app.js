(function (global) {
  "use strict";

  var RUTAS_VALIDAS = [
    "inicio",
    "repaso",
    "diagnostico",
    "progreso",
    "ajustes",
    "habla",
    "conversacion",
    "practicar",
    "lectura",
    "escucha",
    "escritura"
  ];
  var contexto = { strings: {}, umbrales: { niveles: [] }, nivelInterfaz: 0, config: {} };

  /** Pantallas que no tienen su propio ítem en la barra de navegación (ver spec
   * "Calcomanías oscuro"): mientras Alex esté en cualquiera de ellas, el ítem activo sigue
   * siendo Inicio. "practicar"/"lectura"/"escucha"/"escritura" todavía no tienen pantalla
   * real (Fase B/C) -- el mapeo ya queda listo para cuando la tengan. */
  var RUTAS_SIN_TAB_PROPIA = {
    habla: "inicio",
    conversacion: "inicio",
    practicar: "inicio",
    lectura: "inicio",
    escucha: "inicio",
    escritura: "inicio"
  };

  // Spec: "ejecuta los pasos EN SECUENCIA dentro de un flujo con barra de progreso del día
  // arriba" -- arriba de CUALQUIER pantalla de paso (Repaso/Diagnóstico/Habla/Conversación),
  // no solo de Inicio. Vive en el shell (app.js) y no en cada pantalla a propósito: así
  // ninguna pantalla existente necesita saber que es parte de un plan guiado, igual que
  // js/screens/inicio.js ya decidió para "¡Listo! Siguiente" (ver el comentario al inicio de
  // ese archivo). CLAVE_FLUJO/RUTA_POR_TIPO/RUTA_POR_HABILIDAD_PRACTICA duplican las
  // constantes equivalentes de inicio.js (son datos pequeños y estables, no lógica de
  // negocio) porque ese módulo no las expone -- si llegan a divergir, es una señal de que
  // vale la pena moverlas a un lugar compartido.
  var CLAVE_FLUJO = "rumboFlujoEnCurso";
  var RUTA_POR_TIPO_PASO = { diagnostico: "diagnostico", reevaluacion: "diagnostico", repaso: "repaso", conversacion: "conversacion" };
  var RUTA_POR_HABILIDAD_PRACTICA = { habla: "habla", lectura: "lectura", escucha: "escucha", escritura: "escritura" };

  function rutaDelPaso(paso) {
    if (paso.tipo === "practica") return RUTA_POR_HABILIDAD_PRACTICA[paso.habilidad] || "inicio";
    return RUTA_POR_TIPO_PASO[paso.tipo] || "inicio";
  }

  function leerFlujoEnCurso() {
    try {
      var crudo = localStorage.getItem(CLAVE_FLUJO);
      return crudo ? JSON.parse(crudo) : null;
    } catch (e) {
      return null;
    }
  }

  /** Muestra/oculta la barra "Paso N de M" arriba de la pantalla actual. Vive fuera de
   * #pantalla (ver index.html) para no depender de cuándo cada pantalla termine de pintar
   * su propio contenido async -- nunca lo pisa ni lo necesita pisar. */
  function actualizarBannerPlan(ruta) {
    var banner = document.getElementById("banner-plan");
    if (!banner) return;
    var flujo = leerFlujoEnCurso();
    if (!flujo) {
      banner.hidden = true;
      document.body.classList.remove("tiene-banner-plan");
      return;
    }
    global.App.Datos.obtenerOCalcularPlanDeHoy(new Date()).then(function (plan) {
      var paso = plan.id === flujo.fecha ? plan.pasos[flujo.indice] : null;
      if (!paso || rutaDelPaso(paso) !== ruta) {
        banner.hidden = true;
        document.body.classList.remove("tiene-banner-plan");
        return;
      }
      var total = plan.pasos.length;
      var n = flujo.indice + 1;
      banner.hidden = false;
      document.body.classList.add("tiene-banner-plan");
      banner.innerHTML =
        '<span class="banner-plan-texto">' +
        global.App.Util.escaparHTML(global.App.I18n.formatear(global.App.I18n.texto("plan.paso_n_de_m", contexto.nivelInterfaz, contexto.strings), { n: n, total: total })) +
        '</span><div class="barra-progreso"><span style="width:' +
        Math.round((n / total) * 100) +
        '%"></span></div>';
    });
  }

  /** Preparación para crecer (idioma/nivel configurable): data/config.json saca el nombre
   * de la app del código del shell -- título, meta de iOS y logo de la barra lateral se
   * rellenan con esto en vez de venir fijos en index.html. El nombre real es "Rumbo"
   * (nombreApp); idiomaVisible/metaPersonal no se muestran en la interfaz (ver
   * DECISIONES.md: escala de nivel abierta A1-C2, sin tope en B2). */
  function aplicarConfigShell() {
    return fetch("data/config.json")
      .then(function (r) {
        return r.json();
      })
      .then(function (config) {
        // Queda disponible para cualquier pantalla via ctx.config (Inicio/Practicar lo usan
        // para el nombre de Alex y el día de conversación semanal -- "todo configurable desde
        // data/, nada hardcodeado en JS", ver spec de Calcomanías).
        contexto.config = config;
        var nombre = config.nombreApp || "Rumbo"; // i18n-ok: nombre de reserva si config.json no carga (el nombre real vive en data/config.json)
        document.title = nombre;
        var metaTitulo = document.querySelector('meta[name="apple-mobile-web-app-title"]');
        if (metaTitulo) metaTitulo.setAttribute("content", nombre);
        // El logo lleva el punto final en amarillo ("Rumbo.", ver spec) -- por eso es
        // innerHTML con dos spans y no textContent; el nombre se escapa igual que
        // cualquier otro dato que no sea un literal fijo en el código (ver DECISIONES.md D10).
        var marca = document.getElementById("marca-sidebar");
        if (marca) {
          marca.innerHTML = "<span>" + global.App.Util.escaparHTML(nombre) + '</span><span class="marca-punto">.</span>';
        }
      })
      .catch(function (err) {
        console.warn("No se pudo cargar data/config.json:", err);
      });
  }

  function rutaActual() {
    var hash = (location.hash || "").replace("#/", "").replace("#", "");
    return RUTAS_VALIDAS.indexOf(hash) !== -1 ? hash : "inicio";
  }

  function aplicarI18nNav() {
    document.querySelectorAll("nav.tabs [data-i18n]").forEach(function (nodo) {
      nodo.textContent = global.App.I18n.texto(nodo.getAttribute("data-i18n"), contexto.nivelInterfaz, contexto.strings);
    });
  }

  function marcarTabActiva(ruta) {
    var rutaTab = RUTAS_SIN_TAB_PROPIA[ruta] || ruta;
    document.querySelectorAll("nav.tabs button").forEach(function (boton) {
      boton.setAttribute("aria-current", boton.getAttribute("data-ruta") === rutaTab ? "true" : "false");
    });
  }

  function actualizarNivelInterfaz() {
    return Promise.all([global.App.Datos.obtenerMinutosPorDia(), global.App.Datos.obtenerPreferencias()]).then(function (res) {
      var minutosPorDia = res[0];
      var prefs = res[1];
      if (prefs.forzarEspanol) {
        contexto.nivelInterfaz = 0;
        return;
      }
      var minimoRacha = global.App.Racha.OPCIONES_POR_DEFECTO.metaMinutosDia;
      var diasActivos = global.App.Racha.contarDiasActivos(minutosPorDia, minimoRacha);
      contexto.nivelInterfaz = global.App.I18n.calcularNivel({ diasActivos: diasActivos }, contexto.umbrales);
    });
  }

  function renderizar() {
    actualizarNivelInterfaz().then(function () {
      var ruta = rutaActual();
      var pantalla = global.App.Screens && global.App.Screens[ruta];
      var el = document.getElementById("pantalla");
      marcarTabActiva(ruta);
      aplicarI18nNav();
      actualizarBannerPlan(ruta);
      if (pantalla && typeof pantalla.render === "function") {
        pantalla.render(el, contexto);
      } else {
        el.innerHTML = "<p>…</p>";
      }
    });
  }

  function registrarNav() {
    document.querySelectorAll("nav.tabs button").forEach(function (boton) {
      boton.addEventListener("click", function () {
        location.hash = "#/" + boton.getAttribute("data-ruta");
      });
    });
    global.addEventListener("hashchange", renderizar);
    // Esc sale de cualquier pantalla de flujo y vuelve a Inicio SIN marcar el paso como hecho
    // (mismo protocolo que salir por la navegación: el paso queda pendiente, ver D26). No actúa
    // si el foco está escribiendo (campo de escritura, selects) ni si ya se está en Inicio.
    document.addEventListener("keydown", function (ev) {
      if (ev.key !== "Escape" || ev.defaultPrevented) return;
      var a = document.activeElement;
      if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return;
      if (rutaActual() === "inicio") return;
      global.location.hash = "#/inicio";
    });
  }

  function registrarServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("sw.js").catch(function (err) {
      console.warn("No se pudo registrar el service worker:", err);
    });
    // Un service worker nuevo activa de inmediato (skipWaiting + clients.claim en sw.js),
    // pero la pestaña ya abierta sigue corriendo el JS viejo que ya cargó en memoria.
    // Recargamos una sola vez cuando eso pasa, para que el cambio se vea sin que Alex
    // tenga que recargar a mano ni borrar caché. Ver DECISIONES.md D15.
    var yaRecargando = false;
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (yaRecargando) return;
      yaRecargando = true;
      location.reload();
    });
  }

  function aplicarPreferenciasIniciales() {
    // El valor por defecto del tema ("sistema", sin atributo) ya sigue prefers-color-scheme
    // vía CSS, así que la mayoría de la gente nunca ve el breve instante antes de que esto
    // resuelva. La voz preferida de App.TTS vive en memoria (no en DOM), así que también se
    // debe cargar aquí para que cualquier pantalla que hable (Habla, Diagnóstico, Conversación)
    // la respete sin haber pasado antes por Ajustes.
    return global.App.Datos.obtenerPreferencias().then(function (prefs) {
      global.App.Util.aplicarTema(prefs.tema);
      global.App.TTS.establecerVozPreferida(prefs.vozPreferidaTTS);
    });
  }

  function iniciar() {
    registrarNav();
    registrarServiceWorker();
    aplicarConfigShell();
    aplicarPreferenciasIniciales();
    global.App.I18n.cargarDesdeArchivos()
      .then(function (res) {
        contexto.strings = res.strings;
        contexto.umbrales = res.umbrales;
        renderizar();
      })
      .catch(function (err) {
        console.error("No se pudo cargar i18n:", err);
        renderizar();
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})(typeof window !== "undefined" ? window : globalThis);
