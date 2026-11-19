/* Pantalla Practicar -- rediseño "Calcomanías oscuro" (Fase B). Para cuando Alex SÍ sabe qué
   quiere practicar (a diferencia de Inicio, que decide por él): elige una habilidad o repaso/
   conversación y entra directo a una sesión corta con el siguiente contenido disponible para
   su nivel. Lo que se practica aquí SUMA a la meta del día (misma App.Datos.registrarSesion
   que ya usa cada pantalla) pero NUNCA toca el plan ya guardado de hoy (ver
   App.Datos.obtenerOCalcularPlanDeHoy: determinista, no se recalcula). */
(function (global) {
  "use strict";

  var ICONO_POR_HABILIDAD = { lectura: "libro", escucha: "auriculares", habla: "microfono", escritura: "pluma" };
  var NOMBRE_HABILIDAD = { lectura: "Lectura", escucha: "Escucha", habla: "Habla", escritura: "Escritura" };
  var COLOR_POR_HABILIDAD = { lectura: "var(--azul)", escucha: "var(--amarillo)", habla: "var(--menta)", escritura: "var(--rosa)" };
  var ORDEN_HABILIDADES = ["lectura", "escucha", "habla", "escritura"];
  var ROTACION = [-1.4, 1, -0.8, 1.3]; // --r distinto por tarjeta, para el aire de collage que pide el spec

  // Las 4 habilidades ya tienen pantalla propia (Fase C completa).
  var RUTA_POR_HABILIDAD = { habla: "habla", lectura: "lectura", escucha: "escucha", escritura: "escritura" };

  function formatoUltimaVez(fechaISO, hoyISO) {
    if (!fechaISO) return "Por empezar";
    if (fechaISO === hoyISO) return "Última vez: hoy";
    var ayerISO = global.App.Fecha.sumarDias(hoyISO, -1);
    if (fechaISO === ayerISO) return "Última vez: ayer";
    var dias = global.App.Fecha.diferenciaDias(fechaISO, hoyISO);
    return "Última vez: hace " + dias + " días";
  }

  function render(el, ctx) {
    var t = function (clave) { return global.App.I18n.texto(clave, ctx.nivelInterfaz, ctx.strings); };
    var Iconos = global.App.Iconos;
    var esc = global.App.Util.escaparHTML;
    var Datos = global.App.Datos;

    el.innerHTML = '<div class="estado-vacio">…</div>';

    Promise.all([
      Datos.obtenerUltimoDiagnostico(),
      Datos.obtenerUltimaPracticaPorHabilidad(),
      Datos.contarTarjetasRepaso(new Date()),
      Datos.obtenerPreferencias()
    ]).then(function (res) {
      var diagnostico = res[0];
      var ultimaPractica = res[1];
      var tarjetas = res[2];
      var prefs = res[3];
      var hoyISO = global.App.Fecha.hoyISO();

      var tarjetasHtml = ORDEN_HABILIDADES.map(function (h, i) {
        var tieneRuta = !!RUTA_POR_HABILIDAD[h];
        var nivelCEFR = diagnostico && diagnostico.porHabilidad[h] && diagnostico.porHabilidad[h].nivelCEFR;
        var lineaEstado = tieneRuta ? formatoUltimaVez(ultimaPractica[h], hoyISO) : "Próximamente";
        return (
          '<' + (tieneRuta ? "button" : "div") + ' type="button" class="practicar-tarjeta calcomania' +
          (tieneRuta ? " calcomania-presionable" : " practicar-tarjeta--proximamente") +
          '" style="background:' + COLOR_POR_HABILIDAD[h] + ";--r:" + ROTACION[i] + "deg\"" +
          (tieneRuta ? ' data-habilidad="' + h + '"' : ' aria-disabled="true"') +
          ">" +
          '<span class="practicar-icono">' + Iconos.svg(ICONO_POR_HABILIDAD[h], 24) + "</span>" +
          '<span class="practicar-nombre">' + esc(NOMBRE_HABILIDAD[h]) + "</span>" +
          (nivelCEFR ? '<span class="practicar-pastilla">' + esc(nivelCEFR) + "</span>" : "") +
          '<span class="practicar-ultima-vez">' + esc(lineaEstado) + "</span>" +
          "</" + (tieneRuta ? "button" : "div") + ">"
        );
      }).join("");

      el.innerHTML =
        '<div class="pantalla-vista pantalla-practicar">' +
        '<button type="button" class="practicar-regreso" id="btn-regreso-inicio" aria-label="Volver a Inicio">' +
        '<span class="practicar-regreso-flecha">' + Iconos.svg("chevron", 20) + "</span>" +
        "</button>" +
        '<h1>' + esc(t("practicar.titulo")) + "</h1>" +
        '<p class="texto-tenue">' + esc(t("practicar.subtitulo")) + "</p>" +
        '<div class="practicar-grid pop-entrada-escalonada">' + tarjetasHtml + "</div>" +
        '<div class="practicar-filas">' +
        '<button type="button" class="practicar-fila superficie-oscura" id="fila-repaso">' +
        '<span class="icono-mosaico">' + Iconos.svg("repaso", 18) + "</span>" +
        '<span class="practicar-fila-texto"><strong>' + esc(t("practicar.repaso_titulo")) + "</strong><span class=\"texto-tenue\">" +
        tarjetas.vencidas + " tarjeta" + (tarjetas.vencidas === 1 ? "" : "s") + " vencida" + (tarjetas.vencidas === 1 ? "" : "s") + "</span></span>" +
        Iconos.svg("chevron", 18) +
        "</button>" +
        '<button type="button" class="practicar-fila superficie-oscura" id="fila-conversacion">' +
        '<span class="icono-mosaico">' + Iconos.svg("burbuja", 18) + "</span>" +
        '<span class="practicar-fila-texto"><strong>' + esc(t("practicar.conversacion_titulo")) + "</strong><span class=\"texto-tenue\">" +
        esc(t("practicar.conversacion_subtitulo")) + "</span></span>" +
        Iconos.svg("chevron", 18) +
        "</button>" +
        "</div>" +
        '<p class="practicar-nota texto-caption">' + esc(t("practicar.nota")) + "</p>" +
        "</div>";

      el.querySelector("#btn-regreso-inicio").addEventListener("click", function () {
        location.hash = "#/inicio";
      });
      el.querySelectorAll("[data-habilidad]").forEach(function (boton) {
        boton.addEventListener("click", function () {
          location.hash = "#/" + RUTA_POR_HABILIDAD[boton.getAttribute("data-habilidad")];
        });
      });
      el.querySelector("#fila-repaso").addEventListener("click", function () {
        location.hash = "#/repaso";
      });
      el.querySelector("#fila-conversacion").addEventListener("click", function () {
        location.hash = "#/conversacion";
      });
    });
  }

  global.App = global.App || {};
  global.App.Screens = global.App.Screens || {};
  global.App.Screens.practicar = { render: render };
})(typeof window !== "undefined" ? window : globalThis);
