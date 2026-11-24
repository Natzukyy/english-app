/* App.Recordatorio — genera un archivo .ics (iCalendar, RFC 5545) con un evento RECURRENTE y una
   alarma, que el iPhone importa al Calendario (D38). Sin servidor, sin cuentas: es la única forma
   de tener un aviso programado real a una hora fija sin servidor push (la app solo puede notificar
   con ella abierta). Lógica pura, sin DOM (se prueba con ./tests/run-tests.sh).

   Decisiones de formato (compatibles con iOS Calendar):
   - DTSTART con HORA FLOTANTE (sin TZID ni "Z", p. ej. 20261125T200000): el evento sale a esa hora
     en la zona en la que esté el iPhone en ese momento. Un TZID sin su bloque VTIMEZONE no es
     válido y a iOS le hace interpretar la hora mal; con VTIMEZONE habría que generar las reglas de
     horario de verano de cada zona. Para un recordatorio personal "a las 20:00 donde esté", flotante
     es lo más simple y lo que mejor se comporta.
   - UID ESTABLE por instalación (no depende de hora/días): al volver a añadir el recordatorio con
     otra hora o días, Calendario ve el MISMO UID y lo actualiza en vez de duplicarlo. SEQUENCE sube
     con el tiempo para que la versión nueva gane a la vieja.
   - RRULE: FREQ=DAILY si son los 7 días; si no, FREQ=WEEKLY;BYDAY=... (MO,TU,WE,TH,FR,SA,SU).
   - DTSTART cae en el primer día que SÍ coincide con los días elegidos (si no, el calendario
     contaría un día suelto extra).
   - Texto escapado (\\ ; , salto de línea) y líneas plegadas a 75 OCTETOS (UTF-8) con CRLF + espacio. */
(function (global) {
  "use strict";

  var CODIGOS_DIA = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"]; // índice 0 = lunes
  var HORA_POR_DEFECTO = "20:00";
  var DIAS_POR_DEFECTO = [0, 1, 2, 3, 4, 5, 6];
  var DURACION = "PT15M";

  function dosDigitos(n) {
    return (n < 10 ? "0" : "") + n;
  }

  /** "HH:MM" válida (00:00-23:59) o la de por defecto. */
  function normalizarHora(h) {
    var m = typeof h === "string" && h.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return HORA_POR_DEFECTO;
    var hh = parseInt(m[1], 10);
    var mm = parseInt(m[2], 10);
    if (hh > 23 || mm > 59) return HORA_POR_DEFECTO;
    return dosDigitos(hh) + ":" + dosDigitos(mm);
  }

  /** Días 0..6 (0 = lunes) sin repetidos y ordenados; vacío o inválido = todos los días. */
  function normalizarDias(dias) {
    var vistos = {};
    (Array.isArray(dias) ? dias : []).forEach(function (d) {
      var n = Number(d);
      if (n === Math.floor(n) && n >= 0 && n <= 6) vistos[n] = true;
    });
    var lista = Object.keys(vistos)
      .map(Number)
      .sort(function (a, b) {
        return a - b;
      });
    return lista.length ? lista : DIAS_POR_DEFECTO.slice();
  }

  function normalizarConfig(cfg) {
    cfg = cfg || {};
    return { hora: normalizarHora(cfg.hora), dias: normalizarDias(cfg.dias) };
  }

  /** Escapa texto para un valor TEXT de iCalendar: \ ; , y saltos de línea. */
  function escaparTexto(s) {
    return String(s == null ? "" : s)
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\;")
      .replace(/,/g, "\\,")
      .replace(/\r\n|\r|\n/g, "\\n");
  }

  function octetos(codePoint) {
    return codePoint < 0x80 ? 1 : codePoint < 0x800 ? 2 : codePoint < 0x10000 ? 3 : 4;
  }

  /** Pliega UNA línea lógica a <= 75 octetos por línea física (la continuación empieza con un
   * espacio, que cuenta dentro de sus 75). No parte caracteres multibyte. Une con CRLF. */
  function plegarLinea(linea) {
    var salida = [];
    var actual = "";
    var bytes = 0;
    var limite = 75;
    for (var i = 0; i < linea.length; ) {
      var cp = linea.codePointAt(i);
      var ch = String.fromCodePoint(cp);
      var n = octetos(cp);
      if (bytes + n > limite) {
        salida.push(actual);
        actual = " ";
        bytes = 1;
        limite = 75;
      }
      actual += ch;
      bytes += n;
      i += ch.length;
    }
    salida.push(actual);
    return salida.join("\r\n");
  }

  /** Fecha como AAAAMMDDTHHMMSS en hora LOCAL del dispositivo (flotante). */
  function fechaLocalICS(fecha, hora) {
    var p = hora.split(":");
    return "" + fecha.getFullYear() + dosDigitos(fecha.getMonth() + 1) + dosDigitos(fecha.getDate()) + "T" + p[0] + p[1] + "00";
  }

  /** Fecha UTC como AAAAMMDDTHHMMSSZ (para DTSTAMP). */
  function fechaUTCICS(fecha) {
    return (
      "" + fecha.getUTCFullYear() + dosDigitos(fecha.getUTCMonth() + 1) + dosDigitos(fecha.getUTCDate()) +
      "T" + dosDigitos(fecha.getUTCHours()) + dosDigitos(fecha.getUTCMinutes()) + dosDigitos(fecha.getUTCSeconds()) + "Z"
    );
  }

  /** "FREQ=DAILY" si están los 7 días; si no "FREQ=WEEKLY;BYDAY=MO,WE". */
  function reglaRepeticion(dias) {
    var d = normalizarDias(dias);
    if (d.length === 7) return "FREQ=DAILY";
    return (
      "FREQ=WEEKLY;BYDAY=" +
      d
        .map(function (i) {
          return CODIGOS_DIA[i];
        })
        .join(",")
    );
  }

  /** Primer día (>= hoy; si hoy, solo si la hora aún no pasó) que cae en los días elegidos. */
  function primerDia(dias, hora, ahora) {
    var d = normalizarDias(dias);
    var p = hora.split(":");
    for (var i = 0; i < 8; i++) {
      var f = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + i, parseInt(p[0], 10), parseInt(p[1], 10), 0);
      var diaSemana = (f.getDay() + 6) % 7; // 0 = lunes
      if (d.indexOf(diaSemana) !== -1 && f.getTime() > ahora.getTime()) return f;
    }
    return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1, parseInt(p[0], 10), parseInt(p[1], 10), 0);
  }

  /** Hash corto y determinista (djb2) de un texto, en hexadecimal. */
  function hashCorto(texto) {
    var h = 5381;
    for (var i = 0; i < texto.length; i++) h = ((h << 5) + h + texto.charCodeAt(i)) | 0;
    return (h >>> 0).toString(16);
  }

  /** UID estable por instalación: depende de la URL de la app, NO de la hora ni los días (así
   * cambiar la configuración actualiza el mismo evento en vez de crear otro). */
  function uidEstable(urlApp) {
    return "hey-recordatorio-" + hashCorto(String(urlApp || "")) + "@hey-app";
  }

  /** Construye el texto completo del .ics (CRLF, plegado a 75 octetos).
   * opciones: { hora, dias, titulo, descripcion, alarma, url, ahora (Date) } */
  function construirICS(opciones) {
    var o = opciones || {};
    var cfg = normalizarConfig(o);
    var ahora = o.ahora instanceof Date ? o.ahora : new Date();
    var inicio = primerDia(cfg.dias, cfg.hora, ahora);
    var url = o.url || "";
    var secuencia = Math.floor(ahora.getTime() / 60000);
    var descripcion = (o.descripcion || "") + (url ? "\n" + url : "");
    var lineas = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Hey!//Recordatorio//ES",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      "UID:" + uidEstable(url),
      "SEQUENCE:" + secuencia,
      "DTSTAMP:" + fechaUTCICS(ahora),
      "DTSTART:" + fechaLocalICS(inicio, cfg.hora),
      "DURATION:" + DURACION,
      "RRULE:" + reglaRepeticion(cfg.dias),
      "SUMMARY:" + escaparTexto(o.titulo || ""),
      "DESCRIPTION:" + escaparTexto(descripcion)
    ];
    if (url) lineas.push("URL:" + url);
    lineas.push(
      "TRANSP:TRANSPARENT",
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "DESCRIPTION:" + escaparTexto(o.alarma || o.titulo || ""),
      "TRIGGER:PT0M",
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR"
    );
    return lineas.map(plegarLinea).join("\r\n") + "\r\n";
  }

  /** Elige cómo entregar el archivo según lo que haya: "compartir" (hoja de compartir con el
   * archivo), "descarga" (enlace con download) o "texto" (mostrar el contenido para copiar).
   * caps: { puedeCompartirArchivos, puedeDescargar } */
  function elegirEntrega(caps) {
    caps = caps || {};
    if (caps.puedeCompartirArchivos) return "compartir";
    if (caps.puedeDescargar) return "descarga";
    return "texto";
  }

  global.App = global.App || {};
  global.App.Recordatorio = {
    CODIGOS_DIA: CODIGOS_DIA,
    HORA_POR_DEFECTO: HORA_POR_DEFECTO,
    DIAS_POR_DEFECTO: DIAS_POR_DEFECTO,
    DURACION: DURACION,
    normalizarHora: normalizarHora,
    normalizarDias: normalizarDias,
    normalizarConfig: normalizarConfig,
    escaparTexto: escaparTexto,
    plegarLinea: plegarLinea,
    fechaLocalICS: fechaLocalICS,
    fechaUTCICS: fechaUTCICS,
    reglaRepeticion: reglaRepeticion,
    primerDia: primerDia,
    uidEstable: uidEstable,
    construirICS: construirICS,
    elegirEntrega: elegirEntrega
  };
})(typeof window !== "undefined" ? window : globalThis);
