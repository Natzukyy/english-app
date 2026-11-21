/* Pantalla de Inicio -- rediseño "Calcomanías oscuro" + ruta guiada (Fase B). Alex ya no
   elige qué estudiar: esta pantalla le dice "hoy te toca X" y lo guía paso a paso por el
   plan que calculó App.Plan (ver js/core/plan.js y App.Datos.obtenerOCalcularPlanDeHoy).

   Flujo "Empezar"/"Continuar": al tocar el botón, se guarda en localStorage qué paso del plan
   se está por iniciar y se navega a la pantalla de esa habilidad/tipo. Cuando Alex vuelve a
   Inicio (por "Terminar", por el nav, como sea -- todas las pantallas ya navegan a #/inicio
   al terminar su sesión), este render() nota el marcador pendiente, marca ese paso como
   completado, y muestra una pantalla corta de "¡Listo! Siguiente: …" antes de continuar al
   plan completo -- en vez de una pantalla aparte en el router (que complicaría cada pantalla
   existente para que avise "yo terminé un paso del plan"), es un estado propio de Inicio. */
(function (global) {
  "use strict";

  var ICONO_POR_HABILIDAD = { lectura: "libro", escucha: "auriculares", habla: "microfono", escritura: "pluma" };
  var ORDEN_HABILIDADES = ["lectura", "escucha", "habla", "escritura"];

  // A qué ruta navega cada tipo de paso del plan. "reevaluacion" reutiliza la pantalla de
  // Diagnóstico -- construir un cuestionario corto aparte es más trabajo del que alcanza esta
  // fase; queda anotado como simplificación consciente, no un olvido (ver REPORTE_CALCOMANIAS.md).
  var RUTA_POR_TIPO = {
    diagnostico: "diagnostico",
    reevaluacion: "diagnostico",
    repaso: "repaso",
    conversacion: "conversacion"
  };
  // Confirmar lectura/escucha = pantalla propia (opción múltiple); habla/escritura confirman en
  // su propia pantalla, en "modo confirmación" (Util.fijarModoPaso, ver irAPaso).
  var RUTA_CONFIRMACION = { lectura: "confirmacion", escucha: "confirmacion", habla: "habla", escritura: "escritura" };
  var RUTA_POR_HABILIDAD_PRACTICA = { habla: "habla", lectura: "lectura", escucha: "escucha", escritura: "escritura" };

  var CLAVE_FLUJO = "heyFlujoEnCurso"; // localStorage: {fecha, indice} del paso que se acaba de empezar

  function nombrePaso(t, paso) {
    if (paso.tipo === "practica") {
      // En inglés la plantilla es "{habilidad} practice": con la habilidad en minúscula empezaba
      // con minúscula ("speaking practice"), así que se capitaliza la primera letra del resultado.
      var nombre = t("inicio.paso.practica", { habilidad: t("habilidad." + paso.habilidad).toLowerCase() });
      return nombre.charAt(0).toUpperCase() + nombre.slice(1);
    }
    if (paso.tipo === "confirmacion") return t("inicio.paso.confirmacion", { habilidad: t("habilidad." + paso.habilidad).toLowerCase() });
    var clave = "inicio.paso." + paso.tipo;
    var texto = t(clave);
    return texto === clave ? paso.tipo : texto;
  }

  function razonPaso(t, paso) {
    if (paso.tipo === "repaso") {
      var total = (paso.tarjetasVencidas || 0) + (paso.tarjetasNuevas || 0);
      return t(total === 1 ? "inicio.razon.repaso_una" : "inicio.razon.repaso_varias", { n: total });
    }
    if (paso.tipo === "practica") return t("inicio.razon.practica", { minutos: paso.minutos, nivel: paso.nivelCEFR || "" });
    if (paso.tipo === "conversacion") return t("inicio.razon.conversacion");
    if (paso.tipo === "reevaluacion") return t("inicio.razon.reevaluacion");
    if (paso.tipo === "confirmacion") return t("inicio.razon.confirmacion", { actual: paso.nivelActual || "", nivel: paso.nivelCEFR || "" });
    return t("inicio.razon.diagnostico");
  }

  function rutaParaPaso(paso) {
    if (paso.tipo === "practica") return RUTA_POR_HABILIDAD_PRACTICA[paso.habilidad] || "inicio";
    if (paso.tipo === "confirmacion") return RUTA_CONFIRMACION[paso.habilidad] || "confirmacion";
    return RUTA_POR_TIPO[paso.tipo] || "inicio";
  }

  function leerFlujoEnCurso() {
    try {
      var crudo = localStorage.getItem(CLAVE_FLUJO);
      return crudo ? JSON.parse(crudo) : null;
    } catch (e) {
      return null;
    }
  }

  // Se guarda también el TIPO (y la habilidad) del paso, no solo su posición: el plan puede
  // recalcularse a mitad del flujo (p. ej. al terminar el Diagnóstico el plan "solo Diagnóstico"
  // se reemplaza por el real) y entonces el índice apuntaría a OTRO paso.
  function guardarFlujoEnCurso(fecha, indice, paso) {
    try {
      localStorage.setItem(CLAVE_FLUJO, JSON.stringify({ fecha: fecha, indice: indice, tipo: paso && paso.tipo, habilidad: (paso && paso.habilidad) || null }));
    } catch (e) {
      /* localStorage no disponible (modo privado, etc.) -- Empezar sigue funcionando, solo
         no se podrá marcar el paso como completado automáticamente al volver. */
    }
  }

  function limpiarFlujoEnCurso() {
    try {
      localStorage.removeItem(CLAVE_FLUJO);
    } catch (e) {
      /* nada que limpiar si no se pudo guardar */
    }
  }

  function primerPasoPendiente(plan) {
    for (var i = 0; i < plan.pasos.length; i++) {
      if (!plan.pasos[i].completado) return i;
    }
    return -1;
  }

  function irAPaso(plan, indice) {
    var paso = plan.pasos[indice];
    guardarFlujoEnCurso(plan.id, indice, paso);
    // Modo del paso: confirmación de una habilidad / reevaluación general (nunca "nivel de práctica").
    if (paso.tipo === "confirmacion") global.App.Util.fijarModoPaso({ tipo: "confirmacion", habilidad: paso.habilidad, fecha: plan.id });
    else if (paso.tipo === "reevaluacion") global.App.Util.fijarModoPaso({ tipo: "reevaluacion", habilidad: null, fecha: plan.id });
    else global.App.Util.limpiarModoPaso();
    location.hash = "#/" + rutaParaPaso(plan.pasos[indice]);
  }

  /** Constancia reciente (últimos 7 días, hoy incluido): cuántos tuvieron algo de práctica.
   * Tono siempre neutro (nunca "te quedaste corto") -- ver spec: "nunca regaños". */
  function calcularRitmo(minutosPorDia, hoyISO) {
    var diasConPractica = 0;
    for (var i = 0; i < 7; i++) {
      var fecha = global.App.Fecha.sumarDias(hoyISO, -i);
      if ((minutosPorDia[fecha] || 0) > 0) diasConPractica++;
    }
    return diasConPractica >= 4 ? "bien" : "flojo";
  }

  /** Celebraciones pendientes (subida de nivel de XP o CEFR, anotadas por App.Datos): lluvia
   * de calcomanías + mensaje. Una por una, separadas ~0.9 s, por si hubo más de una. */
  function mostrarCelebracionesPendientes(ctx) {
    var t = global.App.I18n.traductor(ctx);
    global.App.Util.tomarCelebracionesPendientes().forEach(function (c, i) {
      var texto;
      if (c.tipo === "habilidad") texto = t("celebracion.nivel_habilidad", { habilidad: t("habilidad." + c.habilidad).toLowerCase(), nivel: c.nivel });
      else texto = c.tipo === "cefr" ? t("celebracion.nivel_cefr") + " " + c.nivel : t("celebracion.nivel_xp") + " " + c.nivel;
      global.setTimeout(function () {
        global.App.Util.mostrarCelebracion(texto + (c.tipo === "xp" ? "!" : ""), true);
      }, 300 + i * 3300);
    });
  }

  function render(el, ctx) {
    mostrarCelebracionesPendientes(ctx);
    var flujo = leerFlujoEnCurso();
    var terminado = global.App.Util.consumirPasoTerminado();
    if (flujo && flujo.fecha !== global.App.Fecha.hoyISO()) {
      limpiarFlujoEnCurso(); // marcador de otro día: ya no aplica
      flujo = null;
    }
    // Solo se cierra el paso si la pantalla avisó que TERMINÓ. Si Alex salió a mitad (barra de
    // navegación), el marcador se conserva y el dashboard ofrece "Continuar" en ese mismo paso.
    if (flujo && terminado && terminado === rutaParaPaso({ tipo: flujo.tipo, habilidad: flujo.habilidad })) {
      renderCerrandoPaso(el, ctx, flujo);
      return;
    }
    renderDashboard(el, ctx);
  }

  /** Se volvió a Inicio con un paso pendiente de cerrar: lo marca completado y muestra una
   * pantalla corta antes de continuar (o el cierre del día si ya no queda nada). */
  function renderCerrandoPaso(el, ctx) {
    var flujo = leerFlujoEnCurso();
    limpiarFlujoEnCurso();
    el.innerHTML = '<div class="estado-vacio">…</div>';

    global.App.Datos.marcarPasoCompletado(flujo.fecha, flujo.indice, flujo.tipo ? { tipo: flujo.tipo, habilidad: flujo.habilidad } : null).then(function () {
      return global.App.Datos.obtenerOCalcularPlanDeHoy(new Date());
    }).then(function (plan) {
      if (plan.id !== flujo.fecha) {
        // Cambió de día entre que se empezó el paso y se volvió (p. ej. quedó abierta la app
        // toda la noche) -- el plan de hoy ya es otro, no tiene caso mostrar "siguiente" de
        // un plan viejo. Se va directo al dashboard normal, ya con el plan de hoy.
        renderDashboard(el, ctx);
        return;
      }
      var siguiente = primerPasoPendiente(plan);
      if (siguiente === -1) {
        renderDiaCompleto(el, ctx, plan);
      } else {
        renderListoSiguiente(el, ctx, plan, siguiente);
      }
    });
  }

  function renderListoSiguiente(el, ctx, plan, indiceSiguiente) {
    var t = global.App.I18n.traductor(ctx);
    var paso = plan.pasos[indiceSiguiente];
    el.innerHTML =
      '<div class="pantalla-vista pantalla-interstitial">' +
      '<div class="interstitial-tarjeta calcomania pop-entrada" style="background:var(--menta)">' +
      '<span class="interstitial-sello">' + global.App.Iconos.svg("check", 28) + "</span>" +
      '<p class="interstitial-titulo">' + global.App.Util.escaparHTML(t("inicio.listo_siguiente")) + "</p>" +
      '<p class="interstitial-paso">' + global.App.Util.escaparHTML(nombrePaso(t, paso)) + "</p>" +
      '<button type="button" class="boton-principal interstitial-boton" id="btn-continuar-flujo">' +
      global.App.Util.escaparHTML(t("inicio.continuar")) +
      "</button>" +
      "</div>" +
      "</div>";
    el.querySelector("#btn-continuar-flujo").addEventListener("click", function () {
      irAPaso(plan, indiceSiguiente);
    });
  }

  function renderDiaCompleto(el, ctx, plan) {
    var t = global.App.I18n.traductor(ctx);
    Promise.all([global.App.Datos.obtenerEstadoRacha(), global.App.Datos.obtenerXP()]).then(function (res) {
      var racha = res[0];
      var xp = res[1];
      el.innerHTML =
        '<div class="pantalla-vista pantalla-interstitial">' +
        '<div class="interstitial-tarjeta calcomania pop-entrada" style="background:var(--amarillo)">' +
        '<span class="interstitial-sello">' + global.App.Iconos.svg("sello", 28) + "</span>" +
        '<p class="interstitial-titulo">' + global.App.Util.escaparHTML(t("inicio.dia_completo_titulo")) + "</p>" +
        '<p class="interstitial-resumen">' +
        '<span class="num-tabular">' + racha.rachaActual + '</span> ' + global.App.Util.escaparHTML(t("inicio.racha_minuscula")) + ' · ' +
        '<span class="num-tabular">' + plan.totalMinutos + "</span> min · " +
        '<span class="num-tabular">' + xp.total + "</span> XP" +
        "</p>" +
        '<p class="interstitial-manana">' + global.App.Util.escaparHTML(t("inicio.manana")) + " " + global.App.Util.escaparHTML(t("inicio.manana_detalle")) + "</p>" +
        '<button type="button" class="boton-principal interstitial-boton" id="btn-cerrar-dia">' +
        global.App.Util.escaparHTML(t("nav.inicio")) +
        "</button>" +
        "</div>" +
        "</div>";
      global.App.Util.lluviaCalcomanias(); // cierre del día (sin movimiento con prefers-reduced-motion)
      el.querySelector("#btn-cerrar-dia").addEventListener("click", function () {
        renderDashboard(el, ctx);
      });
    });
  }

  function renderDashboard(el, ctx) {
    var t = global.App.I18n.traductor(ctx);
    var Datos = global.App.Datos;
    var Iconos = global.App.Iconos;
    var esc = global.App.Util.escaparHTML;
    var config = ctx.config || {};

    el.innerHTML = '<div class="estado-vacio">…</div>';

    Promise.all([
      Datos.obtenerEstadoRacha(),
      Datos.obtenerXP(),
      Datos.obtenerPreferencias(),
      global.App.Storage.get("sesiones", global.App.Fecha.hoyISO()),
      Datos.obtenerUltimoDiagnostico(),
      Datos.obtenerOCalcularPlanDeHoy(new Date()),
      Datos.obtenerMinutosPorDia(),
      Datos.obtenerEstadosAvance()
    ]).then(function (res) {
      var racha = res[0];
      var xp = res[1];
      var prefs = res[2];
      var sesionHoy = res[3] || { minutos: 0 };
      var diagnostico = res[4];
      var plan = res[5];
      var minutosPorDia = res[6];
      var estadosAvance = res[7];

      var nivel = global.App.XP.nivelDesdeXP(xp.total);
      var minutosHoy = sesionHoy.minutos || 0;
      var porcentajeMeta = Math.min(100, Math.round((minutosHoy / prefs.metaMinutosDia) * 100));
      var nombreUsuario = config.nombreUsuario || "Alex"; // i18n-ok: nombre de reserva; el real vive en data/config.json

      // --- Avance en la escala abierta A1-C2 (App.Avance, D29): nivel de cada habilidad + la
      // fracción REAL dentro de ese nivel (ventana móvil de las últimas 30 respuestas), no un
      // 50 % fijo. El nivel global es el promedio ponderado de esos números continuos.
      var numerosHabilidad = {};
      ORDEN_HABILIDADES.forEach(function (h) {
        numerosHabilidad[h] = global.App.Avance.numeroDeHabilidad(estadosAvance[h]);
      });
      var global_ = global.App.Avance.calcularNivelGlobalDesdeEstados(estadosAvance);
      var porcentajeCamino = Math.min(100, (global.App.Avance.indiceNivel(global_.nivel) / 5) * 100 + global_.porcentajeHaciaSiguiente / 20);
      var ritmo = calcularRitmo(minutosPorDia, global.App.Fecha.hoyISO());

      // --- Tarjeta principal: el primer paso pendiente del plan de hoy ---
      var indicePendiente = primerPasoPendiente(plan);
      var hayAlgoHecho = plan.pasos.some(function (p) { return p.completado; });

      var tarjetaPrincipalHtml;
      if (indicePendiente === -1) {
        tarjetaPrincipalHtml =
          '<div class="tarjeta-principal tarjeta-principal--lista calcomania calcomania-cta pop-entrada" style="background:var(--menta)">' +
          '<span class="tarjeta-principal-etiqueta">' + esc(t("inicio.dia_completo_titulo").toUpperCase()) + "</span>" +
          '<p class="tarjeta-principal-nombre">' + esc(t("inicio.listo_por_hoy")) + "</p>" +
          '<p class="tarjeta-principal-razon">' + esc(t("inicio.listo_por_hoy_detalle")) + "</p>" +
          "</div>";
      } else {
        var pasoActual = plan.pasos[indicePendiente];
        tarjetaPrincipalHtml =
          '<div class="tarjeta-principal calcomania calcomania-cta pop-entrada" style="background:var(--amarillo)">' +
          '<span class="tarjeta-principal-etiqueta">' + esc(t("inicio.hoy_te_toca").toUpperCase()) + "</span>" +
          '<p class="tarjeta-principal-nombre">' + esc(nombrePaso(t, pasoActual)) + "</p>" +
          '<p class="tarjeta-principal-razon">' + esc(razonPaso(t, pasoActual)) + "</p>" +
          '<button type="button" class="boton-tinta tarjeta-principal-boton calcomania calcomania-presionable" id="btn-empezar-plan" style="--r:0deg">' +
          esc(t(hayAlgoHecho || leerFlujoEnCurso() ? "inicio.continuar" : "inicio.empezar")) +
          "</button>" +
          "</div>";
      }

      // --- Tu ruta de hoy: calcomanías numeradas compactas, máximo 5 ---
      var pasosVisibles = plan.pasos.slice(0, 5);
      var rutaHoyHtml = pasosVisibles
        .map(function (paso, i) {
          var estado = paso.completado ? "hecho" : i === indicePendiente ? "actual" : "pendiente";
          var contenido = estado === "hecho" ? Iconos.svg("check", 16) : i + 1;
          return (
            '<div class="ruta-hoy-paso ruta-hoy-paso--' + estado + '">' +
            '<span class="ruta-hoy-numero">' + contenido + "</span>" +
            '<span class="ruta-hoy-nombre">' + esc(nombrePaso(t, paso)) + "</span>" +
            '<span class="ruta-hoy-minutos num-tabular">' + paso.minutos + " min</span>" +
            "</div>"
          );
        })
        .join("");

      // --- Tu camino: 6 nodos A1-C2 ---
      var caminoNodosHtml = global.App.Avance.ORDEN_NIVELES.map(function (nivelCEFR, i) {
        var alcanzado = i <= global.App.Avance.indiceNivel(global_.nivel);
        return (
          '<div class="camino-nodo ' + (alcanzado ? "camino-nodo--alcanzado" : "") + '">' +
          '<span class="camino-circulo"></span>' +
          '<span class="camino-etiqueta">' + nivelCEFR + "</span>" +
          "</div>"
        );
      }).join("");

      // --- 4 mini-barras por habilidad ---
      var miniBarrasHtml = ORDEN_HABILIDADES.map(function (h) {
        var est = estadosAvance[h];
        var nivelCEFR = diagnostico ? est.nivel : null;
        var numero = numerosHabilidad[h];
        var porcentaje = Math.round((numero / 5) * 100);
        var falta = global.App.Avance.textoDeFalta(est);
        var siguiente = global.App.Avance.siguienteNivelDe(est.nivel);
        var detalle = "";
        if (diagnostico && falta.tipo === "lista") detalle = t("avance.lista_para_confirmar");
        else if (diagnostico && falta.tipo === "faltan" && falta.faltan <= 10) detalle = t(falta.faltan === 1 ? "avance.falta_una" : "avance.faltan_n", { n: falta.faltan });
        else if (diagnostico && siguiente) detalle = t("inicio.pct_hacia", { pct: global.App.Avance.porcentajeDeHabilidad(est), nivel: siguiente });
        return (
          '<div class="mini-barra-habilidad">' +
          '<div class="mini-barra-cabeza">' +
          '<span class="icono-mosaico icono-mosaico--' + h + '">' + Iconos.svg(ICONO_POR_HABILIDAD[h], 16) + "</span>" +
          '<span class="mini-barra-nombre">' + esc(t("habilidad." + h)) + "</span>" +
          '<span class="mini-barra-nivel">' + (nivelCEFR || "—") + "</span>" +
          "</div>" +
          '<div class="barra-progreso barra-escala" data-habilidad="' + h + '" style="--progreso:0">' +
          '<span data-destino="' + porcentaje + '"></span></div>' +
          (detalle ? '<p class="mini-barra-detalle texto-caption">' + esc(detalle) + "</p>" : "") +
          "</div>"
        );
      }).join("");

      el.innerHTML =
        '<div class="pantalla-vista pantalla-inicio-guiada">' +
        '<div class="inicio-cabeza">' +
        '<div class="inicio-saludo">' +
        '<h1>' + esc(t("inicio.saludo")) + ", " + esc(nombreUsuario) + "</h1>" +
        '<p class="texto-tenue">' + esc(t("inicio.pregunta")) + "</p>" +
        "</div>" +
        '<div class="sol-racha" role="img" aria-label="' + esc(global.App.I18n.formatear(t("inicio.racha_aria"), { n: racha.rachaActual })) + '">' +
        '<div class="sol-rayos">' +
        [0, 45, 90, 135, 180, 225, 270, 315].map(function (a) { return '<span class="rayo" style="transform:rotate(' + a + 'deg)"></span>'; }).join("") +
        "</div>" +
        '<div class="sol-circulo' + (sesionHoy.metaCumplida ? " sol-circulo--completo" : "") + '"><span class="num-tabular" id="valor-racha">0</span></div>' +
        "</div>" +
        "</div>" +
        '<div class="tarjeta-meta superficie-oscura">' +
        '<div class="fila-cabeza"><span class="texto-tenue meta-etiqueta">' + esc(t("inicio.meta.etiqueta")) + ' · <span class="num-tabular meta-minutos">' + esc(minutosHoy) + "/" + esc(prefs.metaMinutosDia) + " min</span></span>" +
        '<span class="pastilla-nivel-xp">' + esc(t("progreso.nivel")) + ' <strong class="num-tabular">' + nivel + '</strong> · <span class="num-tabular" id="valor-xp">0</span> XP</span></div>' +
        '<div class="meta-fila-barra">' +
        '<div class="barra-progreso barra-escala" style="--progreso:0"><span id="barra-meta" data-destino="' + porcentajeMeta + '"></span></div>' +
        "</div>" +
        "</div>" +
        tarjetaPrincipalHtml +
        '<div class="inicio-ruta-hoy">' +
        '<div class="fila-cabeza"><h2>' + esc(t("inicio.ruta_titulo")) + '</h2><span class="texto-tenue num-tabular">' + plan.totalMinutos + " min</span></div>" +
        '<div class="ruta-hoy-grid pop-entrada-escalonada">' + rutaHoyHtml + "</div>" +
        "</div>" +
        '<button type="button" class="boton-practicar superficie-oscura" id="btn-practicar">' +
        '<span class="icono-mosaico" style="background:var(--amarillo);color:var(--tinta)">' + Iconos.svg("practicar", 18) + "</span>" +
        '<span>' + esc(t("inicio.practicar_boton")) + "</span>" +
        Iconos.svg("chevron", 18) +
        "</button>" +
        '<div class="inicio-camino">' +
        '<div class="fila-cabeza camino-cabeza"><h2>' + esc(t("inicio.camino_titulo")) + "</h2>" +
        '<span class="pastilla-nivel-xp camino-pastilla">' +
        esc(global_.siguienteNivel ? t("inicio.pct_hacia", { pct: global_.porcentajeHaciaSiguiente, nivel: global_.siguienteNivel }) : t("inicio.nivel_maximo")) +
        "</span></div>" +
        '<div class="camino-pista">' +
        '<div class="camino-nodos">' + caminoNodosHtml + "</div>" +
        '<span class="camino-estrella" style="left:' + porcentajeCamino + '%">' + Iconos.svg("estrella", 18) + "</span>" +
        "</div>" +
        '<p class="camino-linea texto-tenue">' + esc(t("inicio.camino_vas_aqui")) + '<span class="camino-linea-detalle"> · ' + esc(t("inicio.tu_nivel_ahora", { nivel: global_.nivel })) + "</span> · " +
        esc(t(ritmo === "bien" ? "inicio.ritmo_bien" : "inicio.ritmo_lento")) + "</p>" +
        '<div class="camino-mini-barras">' + miniBarrasHtml + "</div>" +
        "</div>" +
        "</div>";

      if (indicePendiente !== -1) {
        el.querySelector("#btn-empezar-plan").addEventListener("click", function () {
          irAPaso(plan, indicePendiente);
        });
      }
      el.querySelector("#btn-practicar").addEventListener("click", function () {
        location.hash = "#/practicar";
      });

      global.App.Util.animarNumero(el.querySelector("#valor-racha"), racha.rachaActual);
      global.App.Util.animarNumero(el.querySelector("#valor-xp"), xp.total);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          el.querySelectorAll(".barra-escala > span[data-destino]").forEach(function (span) {
            span.style.setProperty("--progreso", (Number(span.getAttribute("data-destino")) || 0) / 100);
          });
        });
      });
    });
  }

  global.App = global.App || {};
  global.App.Screens = global.App.Screens || {};
  global.App.Screens.inicio = { render: render };
})(typeof window !== "undefined" ? window : globalThis);
