// Recordatorio .ics (D38): escapes, plegado, RRULE, UID estable, formato de fechas.
(function () {
  var R = App.Recordatorio;
  var AHORA = new Date(2026, 10, 24, 10, 30, 0); // martes 24 nov 2026, 10:30 local

  Test.test("escaparTexto: \\ ; , y saltos de línea (RFC 5545)", function () {
    Test.assertEqual(R.escaparTexto("a,b;c\\d\ne"), "a\\,b\;c\\\\d\\ne");
    Test.assertEqual(R.escaparTexto("x\r\ny"), "x\\ny");
    Test.assertEqual(R.escaparTexto(null), "");
  });

  Test.test("plegarLinea: nunca más de 75 octetos por línea física, y desplegar devuelve el original", function () {
    var larga = "DESCRIPTION:" + new Array(40).join("palabra ñandú, ");
    var plegada = R.plegarLinea(larga);
    var fisicas = plegada.split("\r\n");
    Test.assertTrue(fisicas.length > 1, "debería plegarse");
    fisicas.forEach(function (l, i) {
      // octetos UTF-8
      var bytes = unescape(encodeURIComponent(l)).length;
      Test.assertTrue(bytes <= 75, "línea " + i + " con " + bytes + " octetos");
      if (i > 0) Test.assertEqual(l.charAt(0), " ");
    });
    Test.assertEqual(plegada.replace(/\r\n /g, ""), larga);
  });

  Test.test("plegarLinea: una línea corta no se toca; no parte caracteres multibyte", function () {
    Test.assertEqual(R.plegarLinea("SUMMARY:Hey!"), "SUMMARY:Hey!");
    var emoji = "X:" + new Array(30).join("😀"); // 4 octetos cada uno
    R.plegarLinea(emoji).split("\r\n").forEach(function (l) {
      Test.assertTrue(unescape(encodeURIComponent(l)).length <= 75);
    });
    Test.assertEqual(R.plegarLinea(emoji).replace(/\r\n /g, ""), emoji);
  });

  Test.test("RRULE: DAILY con los 7 días; WEEKLY con BYDAY para otros", function () {
    Test.assertEqual(R.reglaRepeticion([0, 1, 2, 3, 4, 5, 6]), "FREQ=DAILY");
    Test.assertEqual(R.reglaRepeticion([]), "FREQ=DAILY"); // vacío = todos
    Test.assertEqual(R.reglaRepeticion([0, 2, 4]), "FREQ=WEEKLY;BYDAY=MO,WE,FR");
    Test.assertEqual(R.reglaRepeticion([6, 5]), "FREQ=WEEKLY;BYDAY=SA,SU"); // ordenados, lunes primero
    Test.assertEqual(R.reglaRepeticion([3, 3, 3]), "FREQ=WEEKLY;BYDAY=TH"); // sin repetidos
    Test.assertEqual(R.reglaRepeticion([9, -1, "x"]), "FREQ=DAILY"); // basura = todos
  });

  Test.test("normalizarHora: válida o la de por defecto", function () {
    Test.assertEqual(R.normalizarHora("7:05"), "07:05");
    Test.assertEqual(R.normalizarHora("20:00"), "20:00");
    Test.assertEqual(R.normalizarHora("24:00"), "20:00");
    Test.assertEqual(R.normalizarHora("abc"), "20:00");
    Test.assertEqual(R.normalizarHora(undefined), "20:00");
  });

  Test.test("formato de fechas: local flotante y DTSTAMP en UTC con Z", function () {
    Test.assertEqual(R.fechaLocalICS(new Date(2026, 10, 5, 9, 7), "09:07"), "20261105T090700");
    Test.assertEqual(R.fechaUTCICS(new Date(Date.UTC(2026, 0, 2, 3, 4, 5))), "20260102T030405Z");
  });

  Test.test("primerDia: hoy si la hora no pasó; si no, el siguiente día elegido", function () {
    // martes 10:30 -> a las 20:00 todos los días: hoy
    var f = R.primerDia([0, 1, 2, 3, 4, 5, 6], "20:00", AHORA);
    Test.assertEqual(f.getDate(), 24);
    // martes 10:30, hora 08:00 -> mañana
    Test.assertEqual(R.primerDia([0, 1, 2, 3, 4, 5, 6], "08:00", AHORA).getDate(), 25);
    // solo lunes y viernes -> viernes 27
    Test.assertEqual(R.primerDia([0, 4], "20:00", AHORA).getDate(), 27);
    // solo martes pero ya pasó la hora -> martes siguiente (1 dic)
    var s = R.primerDia([1], "08:00", AHORA);
    Test.assertEqual(s.getMonth(), 11);
    Test.assertEqual(s.getDate(), 1);
  });

  Test.test("UID estable: no cambia con hora ni días, sí con la URL de la app", function () {
    var a = R.uidEstable("https://x.github.io/app/");
    Test.assertEqual(a, R.uidEstable("https://x.github.io/app/"));
    Test.assertTrue(a !== R.uidEstable("http://localhost:8001/"));
    var u1 = R.construirICS({ hora: "20:00", dias: [0], titulo: "t", url: "https://x.github.io/app/", ahora: AHORA }).match(/UID:(.*)\r\n/)[1];
    var u2 = R.construirICS({ hora: "07:30", dias: [1, 2], titulo: "t", url: "https://x.github.io/app/", ahora: AHORA }).match(/UID:(.*)\r\n/)[1];
    Test.assertEqual(u1, u2);
  });

  Test.test("construirICS: estructura válida, CRLF, VEVENT con RRULE y VALARM a la hora", function () {
    var ics = R.construirICS({
      hora: "20:30", dias: [0, 2, 4], titulo: "Hey! — hoy te toca", descripcion: "Practica, 15 min; sin falta",
      alarma: "Hey! te espera", url: "https://x.github.io/app/", ahora: AHORA
    });
    Test.assertTrue(ics.indexOf("BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:") === 0);
    Test.assertTrue(ics.indexOf("CALSCALE:GREGORIAN") > 0);
    Test.assertTrue(ics.indexOf("DTSTART:20261125T203000") > 0 || ics.indexOf("DTSTART:20261127T203000") > 0);
    Test.assertTrue(ics.indexOf("DTSTAMP:") > 0);
    Test.assertTrue(ics.indexOf("RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR") > 0);
    Test.assertTrue(ics.indexOf("DURATION:PT15M") > 0);
    Test.assertTrue(ics.indexOf("BEGIN:VALARM\r\nACTION:DISPLAY") > 0);
    Test.assertTrue(ics.indexOf("TRIGGER:PT0M") > 0);
    Test.assertTrue(ics.indexOf("Practica\\, 15 min\; sin falta") > 0);
    Test.assertTrue(ics.indexOf("END:VCALENDAR\r\n") === ics.length - "END:VCALENDAR\r\n".length);
    // ninguna línea física supera 75 octetos y todas terminan en CRLF
    ics.split("\r\n").forEach(function (l) {
      Test.assertTrue(unescape(encodeURIComponent(l)).length <= 75, "línea larga: " + l);
    });
    Test.assertTrue(ics.indexOf("\n") === ics.indexOf("\r\n") + 1);
    // el primer DTSTART cae en un día elegido: miércoles 25 nov (lun/mié/vie)
    Test.assertTrue(ics.indexOf("DTSTART:20261125T203000") > 0);
  });

  Test.test("elegirEntrega: compartir > descarga > texto", function () {
    Test.assertEqual(R.elegirEntrega({ puedeCompartirArchivos: true, puedeDescargar: true }), "compartir");
    Test.assertEqual(R.elegirEntrega({ puedeCompartirArchivos: false, puedeDescargar: true }), "descarga");
    Test.assertEqual(R.elegirEntrega({}), "texto");
    Test.assertEqual(R.elegirEntrega(), "texto");
  });

  Test.test("elegirEntrega: en iOS la acción principal es abrir en Calendario", function () {
    Test.assertEqual(R.elegirEntrega({ esIOS: true, puedeCompartirArchivos: true, puedeDescargar: true }), "calendario");
    Test.assertEqual(R.elegirEntrega({ esIOS: false, puedeCompartirArchivos: true }), "compartir");
  });

  Test.test("esIOS: iPhone, iPad, iPadOS como Mac táctil; no Mac ni Android", function () {
    Test.assertTrue(R.esIOS({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" }));
    Test.assertTrue(R.esIOS({ userAgent: "Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)" }));
    Test.assertTrue(R.esIOS({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", plataforma: "MacIntel", maxTouchPoints: 5 }));
    Test.assertTrue(!R.esIOS({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", plataforma: "MacIntel", maxTouchPoints: 0 }));
    Test.assertTrue(!R.esIOS({ userAgent: "Mozilla/5.0 (Linux; Android 14)", plataforma: "Linux armv8l", maxTouchPoints: 5 }));
    Test.assertTrue(!R.esIOS());
  });

  Test.test("enlaceDatosICS: tipo text/calendar, sin perder CRLF ni caracteres y reversible", function () {
    var ics = R.construirICS({ hora: "20:00", dias: [0, 1, 2, 3, 4, 5, 6], titulo: "Hey! — hoy te toca", descripcion: "Practica, 15 min; ¡ya!", alarma: "Hora", url: "https://x.github.io/app/", ahora: AHORA });
    var url = R.enlaceDatosICS(ics);
    Test.assertTrue(url.indexOf("data:text/calendar;charset=utf-8,BEGIN%3AVCALENDAR%0D%0A") === 0);
    Test.assertTrue(url.indexOf("%0D%0A") > 0 && url.indexOf("\r") === -1 && url.indexOf("\n") === -1);
    Test.assertTrue(url.indexOf(" ") === -1);
    Test.assertEqual(decodeURIComponent(url.slice(url.indexOf(",") + 1)), ics);
  });
})();
