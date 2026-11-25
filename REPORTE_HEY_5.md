# REPORTE hey-5 — Recordatorio: abrir directo en Calendario (D39)

Rama `hey-5` (desde `hey-4`), sin push ni despliegue.

## Problema y causa probable
En iPhone, la hoja de compartir se abría pero Calendario no aparecía. **Causa probable (deducción, no comprobada en iOS):** Calendario no es destino de la hoja de compartir con archivos; un `.ics` se importa al abrirlo o al navegar a un recurso `text/calendar`, que dispara el aviso nativo "Añadir a Calendario".

## Qué cambió
- **Principal en iOS/iPadOS:** botón "Abrir en Calendario", un `<a>` real sin `download` con `href="data:text/calendar;charset=utf-8,…"`. Se regenera al cambiar hora/días y al tocarlo. Opción (a) del encargo; no se probó (b) blob: ni se comparó (no hay iPhone ni WebKit aquí).
- **Detección:** `App.Recordatorio.esIOS` (iPhone/iPad/iPod por UA; iPadOS como `MacIntel` + `maxTouchPoints > 1`).
- **Otras plataformas:** principal = "Descargar archivo del recordatorio".
- **Secundarios:** "Guardar archivo" (hoja de compartir con archivo → descarga si falla) y "Copiar texto" (último recurso).
- **Ayuda en la tarjeta (i18n es/en):** qué pasa al tocar en iPhone, cómo quitarlo (borrar el evento en Calendario), qué hacer con "Guardar archivo".
- **Sin cambios:** contenido del `.ics`, `construirICS`, UID estable (re-añadir actualiza). Solo se añadieron `esIOS`, `enlaceDatosICS` y el caso `esIOS → "calendario"` en `elegirEntrega`.
- `tools/auditoria-margenes.js`: opción `ios` (user agent de iPhone) para auditar la variante iOS.
- D39 en DECISIONES.md; párrafo en CLAUDE.md; SW v37 (56 archivos de la lista, todos existen).

## Qué probé
- Unitarias: **199 pasan** (196 antes; +3: `esIOS`, `enlaceDatosICS`, `elegirEntrega` en iOS). Integración: **33 pasan**. Validador de contenido y detector de texto hardcodeado: OK.
- Chromium (con UA de iPhone): el enlace es visible, no tiene `download`, el `href` empieza por `data:text/calendar;charset=utf-8,`, decodificado conserva CRLF, `UID` estable, `RRULE`, `VALARM`; al cambiar la hora a 07:15 el `DTSTART` se actualiza y el `UID` no cambia. En escritorio se ve el botón de descarga y no el enlace.
- Auditoría de márgenes y contraste en Ajustes (claro y oscuro, variante normal e iOS, 390×844 y 360×740, interfaz nivel 0 y 3): **0 hallazgos** en las 4 combinaciones. Capturas en `docs/design-review/hey-5/`.
- WebKit no está disponible en este entorno (solo Chromium); no se instaló nada.

## NO verificado (iPhone real)
- Que al tocar "Abrir en Calendario" aparezca el aviso nativo "Añadir a Calendario", en Safari y sobre todo en la app instalada (standalone): iOS podría abrir el `data:` en una vista sin aviso o bloquearlo en la PWA. Es el riesgo principal.
- Que el evento suene a la hora; que volver a añadirlo actualice en vez de duplicar; que "Guardar archivo" → Archivos → tocar el archivo lo importe.
- Si el enlace falla en la app instalada, la alternativa a probar sería abrir la URL en Safari, o un `blob:`; no se implementó sin poder probarlo.
