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
  var NOMBRE_HABILIDAD = { lectura: "Lectura", escucha: "Escucha", habla: "Habla", escritura: "Escritura" };
  var ORDEN_HABILIDADES = ["lectura", "escucha", "habla", "escritura"];

  var NOMBRE_PASO = {
    diagnostico: "Diagnóstico de nivel",
    reevaluacion: "Mini-reevaluación de nivel",
    repaso: "Repaso de tarjetas",
    conversacion: "Conversación con IA"
  };

  // A qué ruta navega cada tipo de paso del plan. "reevaluacion" reutiliza la pantalla de
  // Diagnóstico -- construir un cuestionario corto aparte es más trabajo del que alcanza esta
  // fase; queda anotado como simplificación consciente, no un olvido (ver REPORTE_CALCOMANIAS.md).
  var RUTA_POR_TIPO = {
    diagnostico: "diagnostico",
    reevaluacion: "diagnostico",
    repaso: "repaso",
    conversacion: "conversacion"
  };
  var RUTA_POR_HABILIDAD_PRACTICA = { habla: "habla", lectura: "lectura", escucha: "escucha", escritura: "escritura" };

  var CLAVE_FLUJO = "rumboFlujoEnCurso"; // localStorage: {fecha, indice} del paso que se acaba de empezar

  function nombrePaso(paso) {
    if (paso.tipo === "practica") return "Práctica de " + (NOMBRE_HABILIDAD[paso.habilidad] || paso.habilidad).toLowerCase();
    return NOMBRE_PASO[paso.tipo] || paso.tipo;
  }

  function razonPaso(paso) {
    if (paso.tipo === "repaso") {
      var total = (paso.tarjetasVencidas || 0) + (paso.tarjetasNuevas || 0);
      return "Tienes " + total + " tarjeta" + (total === 1 ? "" : "s") + " por repasar hoy.";
    }
    if (paso.tipo === "practica") return paso.minutos + " minutos de práctica, nivel " + (paso.nivelCEFR || "");
    if (paso.tipo === "conversacion") return "Te toca conversación esta semana.";
    if (paso.tipo === "reevaluacion") return "Ya pasaron unas semanas -- vale la pena confirmar tu nivel.";
    return "Tu diagnóstico inicial, para armar el resto de tu ruta.";
  }

  function rutaParaPaso(paso) {
    if (paso.tipo === "practica") return RUTA_POR_HABILIDAD_PRACTICA[paso.habilidad] || "inicio";
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

  function guardarFlujoEnCurso(fecha, indice) {
    try {
      localStorage.setItem(CLAVE_FLUJO, JSON.stringify({ fecha: fecha, indice: indice }));
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
    guardarFlujoEnCurso(plan.id, indice);
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

  function render(el, ctx) {
    var flujo = leerFlujoEnCurso();
    if (flujo) {
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

    global.App.Datos.marcarPasoCompletado(flujo.fecha, flujo.indice).then(function () {
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
    var t = function (clave) { return global.App.I18n.texto(clave, ctx.nivelInterfaz, ctx.strings); };
    var paso = plan.pasos[indiceSiguiente];
    el.innerHTML =
      '<div class="pantalla-vista pantalla-interstitial">' +
      '<div class="interstitial-tarjeta calcomania pop-entrada" style="background:var(--menta)">' +
      '<span class="interstitial-sello">' + global.App.Iconos.svg("check", 28) + "</span>" +
      '<p class="interstitial-titulo">' + global.App.Util.escaparHTML(t("inicio.listo_siguiente")) + "</p>" +
      '<p class="interstitial-paso">' + global.App.Util.escaparHTML(nombrePaso(paso)) + "</p>" +
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
    var t = function (clave) { return global.App.I18n.texto(clave, ctx.nivelInterfaz, ctx.strings); };
    Promise.all([global.App.Datos.obtenerEstadoRacha(), global.App.Datos.obtenerXP()]).then(function (res) {
      var racha = res[0];
      var xp = res[1];
      el.innerHTML =
        '<div class="pantalla-vista pantalla-interstitial">' +
        '<div class="interstitial-tarjeta calcomania pop-entrada" style="background:var(--amarillo)">' +
        '<span class="interstitial-sello">' + global.App.Iconos.svg("sello", 28) + "</span>" +
        '<p class="interstitial-titulo">' + global.App.Util.escaparHTML(t("inicio.dia_completo_titulo")) + "</p>" +
        '<p class="interstitial-resumen">' +
        '<span class="num-tabular">' + racha.rachaActual + "</span> racha · " +
        '<span class="num-tabular">' + plan.totalMinutos + "</span> min · " +
        '<span class="num-tabular">' + xp.total + "</span> XP" +
        "</p>" +
        '<p class="interstitial-manana">' + global.App.Util.escaparHTML(t("inicio.manana")) + " un plan nuevo te espera.</p>" +
        '<button type="button" class="boton-principal interstitial-boton" id="btn-cerrar-dia">' +
        global.App.Util.escaparHTML(t("nav.inicio")) +
        "</button>" +
        "</div>" +
        "</div>";
      el.querySelector("#btn-cerrar-dia").addEventListener("click", function () {
        renderDashboard(el, ctx);
      });
    });
  }

  function renderDashboard(el, ctx) {
    var t = function (clave) { return global.App.I18n.texto(clave, ctx.nivelInterfaz, ctx.strings); };
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
      Datos.obtenerMinutosPorDia()
    ]).then(function (res) {
      var racha = res[0];
      var xp = res[1];
      var prefs = res[2];
      var sesionHoy = res[3] || { minutos: 0 };
      var diagnostico = res[4];
      var plan = res[5];
      var minutosPorDia = res[6];

      var nivel = global.App.XP.nivelDesdeXP(xp.total);
      var minutosHoy = sesionHoy.minutos || 0;
      var porcentajeMeta = Math.min(100, Math.round((minutosHoy / prefs.metaMinutosDia) * 100));
      var nombreUsuario = config.nombreUsuario || "Alex";

      // --- Avance en la escala abierta A1-C2 (App.Avance), a partir del último diagnóstico.
      // Sin una medición más fina de desempeño reciente todavía, se asume el punto medio del
      // nivel actual (50%) para cada habilidad -- simplificación anotada en el reporte final.
      var numerosHabilidad = {};
      ORDEN_HABILIDADES.forEach(function (h) {
        var nivelCEFR = (diagnostico && diagnostico.porHabilidad[h] && diagnostico.porHabilidad[h].nivelCEFR) || "A1";
        numerosHabilidad[h] = global.App.Avance.numeroDesdeNivel(nivelCEFR, 50);
      });
      var global_ = global.App.Avance.calcularNivelGlobal(numerosHabilidad);
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
          '<p class="tarjeta-principal-nombre">' + esc(nombrePaso(pasoActual)) + "</p>" +
          '<p class="tarjeta-principal-razon">' + esc(razonPaso(pasoActual)) + "</p>" +
          '<button type="button" class="boton-tinta tarjeta-principal-boton calcomania calcomania-presionable" id="btn-empezar-plan" style="--r:0deg">' +
          esc(t(hayAlgoHecho ? "inicio.continuar" : "inicio.empezar")) +
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
            '<span class="ruta-hoy-nombre">' + esc(nombrePaso(paso)) + "</span>" +
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
        var datosHabilidad = diagnostico && diagnostico.porHabilidad[h];
        var nivelCEFR = datosHabilidad ? datosHabilidad.nivelCEFR : null;
        var numero = numerosHabilidad[h];
        var porcentaje = Math.round((numero / 5) * 100);
        return (
          '<div class="mini-barra-habilidad">' +
          '<div class="mini-barra-cabeza">' +
          '<span class="icono-mosaico icono-mosaico--' + h + '">' + Iconos.svg(ICONO_POR_HABILIDAD[h], 16) + "</span>" +
          '<span class="mini-barra-nombre">' + NOMBRE_HABILIDAD[h] + "</span>" +
          '<span class="mini-barra-nivel">' + (nivelCEFR || "—") + "</span>" +
          "</div>" +
          '<div class="barra-progreso barra-escala" data-habilidad="' + h + '" style="--progreso:0">' +
          '<span data-destino="' + porcentaje + '"></span></div>' +
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
        '<div class="sol-racha" aria-hidden="true">' +
        '<div class="sol-rayos">' +
        [0, 45, 90, 135, 180, 225, 270, 315].map(function (a) { return '<span class="rayo" style="transform:rotate(' + a + 'deg)"></span>'; }).join("") +
        "</div>" +
        '<div class="sol-circulo' + (sesionHoy.metaCumplida ? " sol-circulo--completo" : "") + '"><span class="num-tabular" id="valor-racha">0</span></div>' +
        "</div>" +
        "</div>" +
        '<div class="tarjeta-meta superficie-oscura">' +
        '<div class="fila-cabeza"><span class="texto-tenue">' + esc(t("inicio.meta.etiqueta")) + "</span><span class=\"texto-tenue num-tabular\">" +
        esc(minutosHoy) + "/" + esc(prefs.metaMinutosDia) + " min</span></div>" +
        '<div class="meta-fila-barra">' +
        '<div class="barra-progreso barra-escala" style="--progreso:0"><span id="barra-meta" data-destino="' + porcentajeMeta + '"></span></div>' +
        '<span class="pastilla-nivel-xp">Nivel <strong class="num-tabular">' + nivel + '</strong> · <span class="num-tabular" id="valor-xp">0</span> XP</span>' +
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
        (global_.siguienteNivel ? global_.porcentajeHaciaSiguiente + "% hacia " + global_.siguienteNivel : "Nivel máximo de la escala") +
        "</span></div>" +
        '<div class="camino-pista">' +
        '<div class="camino-nodos">' + caminoNodosHtml + "</div>" +
        '<span class="camino-estrella" style="left:' + porcentajeCamino + '%">' + Iconos.svg("estrella", 18) + "</span>" +
        "</div>" +
        '<p class="camino-linea texto-tenue">' + esc(t("inicio.camino_vas_aqui")) + '<span class="camino-linea-detalle"> · tu nivel de inglés ahora: ' + global_.nivel + "</span> · " +
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
