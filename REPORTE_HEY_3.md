# REPORTE — rama `hey-3`

Alex probó `hey-2` en el iPhone real y encontró dos problemas: el ícono no cambiaba y "Tu ruta de hoy" quedaba pegada a la tarjeta "HOY TE TOCA". Todo en la rama `hey-3` (salida de `hey-2`), sin push, sin despliegue, sin dependencias, sin tocar la lógica de avance (D29) ni el contenido.

## Tarea 1 — Ícono (D34)
- **Causa más probable (no verificada en el iPhone):** iOS guarda el ícono de pantalla de inicio por URL y el archivo seguía llamándose igual. `apple-touch-icon.png` ya era el globo correcto (comprobado: PNG de 180×180, globo azul "Hey!").
- **Hecho:** los 7 archivos se renombraron con `git mv` a `icons/hey-v2-apple-touch-180.png`, `hey-v2-192.png`, `hey-v2-512.png`, `hey-v2-512-maskable.png`, `hey-v2-favicon-32.png`, `hey-v2-favicon-16.png`, `hey-v2.ico`. Los nombres viejos **ya no existen en disco** (se movieron, no se dejaron copias) ni están enlazados en `index.html`, `manifest.webmanifest` ni `sw.js`. Ningún nombre lleva "!".
- `index.html` ya traía `apple-mobile-web-app-title="Hey!"`, `apple-mobile-web-app-capable` y `theme-color`; se agregó `mobile-web-app-capable`.
- **Service worker:** `CACHE_VERSION` v31 → v33 (v32 por los íconos, v33 por el CSS). El SW borra cachés `app-ingles-*` viejas al activarse (revisado en el código; en la prueba solo existía la caché nueva porque el perfil era nuevo). Los 55 archivos precacheados existen (comprobado con un script).
- **Verificación con Playwright:** los `<link>` y los 3 íconos del manifest responden 200 con tipo de imagen; abrí apple-touch 180 y 512 y son el globo azul "Hey!".
- **Regla:** al cambiar el ícono otra vez, cambiar el sufijo (`hey-v3-…`). Anotado en D34 y CLAUDE.md.

## Tarea 2 — Aire con sombra (D35)
**Auditoría ampliada** (`tools/auditoria-margenes.js`, regla `hueco`): mide con el rectángulo extendido por sombra y rotación, mínimo 12 px (16 px bajo una hero), y también hijos que sobresalen de su contenedor. Todas las pantallas y estados (33) × 390×844, 360×740 y 1440×900 × interfaz nivel 0 y 3.

**Antes de corregir: 263 hallazgos** (91 altos). Por pantalla: inicio 52, escucha 36, diagnóstico 30, ajustes 26, escritura 22, progreso 18, habla 18, lectura 18, celebración 14, lluvia 14, practicar 12, confirmación 3. El peor: Inicio, -3.5 px entre la hero y "Tu ruta de hoy" (la sombra pisaba el título) — exactamente lo que viste. También: píldoras de área pegadas al contenido que sigue (Lectura/Escucha/Escritura/Diagnóstico), botones con sombra pegados a su texto (Habla, Escucha, Ajustes, Escritura), rejilla de Practicar y tarjetas de Progreso.

**Después: 0 hallazgos** (última pasada completa con el CSS y la auditoría finales). Detalle en `docs/auditoria-margenes.md`. Honestidad: la regla de "hijo que sobresale del contenedor" se añadió a mitad de camino y encontró 3 casos más (Practicar, Progreso, Diagnóstico en celular) que corregí; el "antes" de 263 se midió sin esa extensión, así que es un piso, no el total real.

**Qué se corrigió:** tokens `--aire-sombra`, `--sep-calcomania`, `--sep-hero` en `:root` y un bloque final de CSS "AIRE CON SOMBRA". En Inicio: 16 px de aire real bajo la hero (celular) y 16 px entre hero y botón "Practicar" (laptop, por el gap de la rejilla).

**Inicio sin scroll (comprobado a 390×844, 360×740 y 1440×900):** el aire nuevo costó unos 25 px y se sacó sin ocultar contenido: margen superior de la cabecera como en celular bajito, "x/y min" subido junto a "Meta de hoy" (la barra queda sola), alto de línea más ajustado en dos rótulos de una línea y botón "Empezar" a 44 px en celular bajito. El botón de la hero ya no gira en celular. Nada se ocultó ni se quitó padding.

**Cambio de aspecto que notarás:** en Inicio "Meta de hoy · 0/15 min" ahora va junto, en la fila de arriba, y la barra ocupa sola la fila de abajo.

**Capturas:** `docs/design-review/hey-3/` (70 pares antes/después: 33 estados en 390×844 y 1440×900, nivel 0). 11 MB.

## Tarea 3 — Pruebas
- `./tests/run-tests.sh`: **181 pasaron, 0 fallaron**; validador de contenido OK; detector de texto hardcodeado OK.
- `tests/integracion.html` (servidor local, IndexedDB real): **30 pasaron, 0 fallaron**.

## Lo que NO pude verificar
- **iPhone real:** que el ícono por fin cambie (la causa es una deducción razonable, no comprobada) y cómo se ve "Tu ruta de hoy" con la barra de estado real. Ojo: en la app instalada con barra de estado/notch el margen superior usa `env(safe-area-inset-top)` y puede ser mayor que en mi emulación; Inicio podría necesitar scroll de unos píxeles ahí. No lo pude medir.
- Interfaz nivel 0 y 3 se auditaron; los niveles 1 y 2 no.
- Los estados de Inicio con más contenido (p. ej. con confirmación pendiente) no se midieron para "sin scroll"; solo el plan activo normal.

## Dudas
- Los PNG viejos no se dejaron en disco (se movieron con `git mv`). Si prefieres conservarlos por si quieres volver atrás, están en el historial de git (`65575ac`).
- Un receptor viejo de la auditoría (puerto 8010, de una sesión anterior) sigue corriendo en tu Mac; no lo maté. Se ve con `lsof -iTCP:8010`.

## Cómo verlo
`python3 -m http.server 8001` en la raíz y abrir `http://localhost:8001`.

## Pasos para Alex en el iPhone
1. Exporta un respaldo desde Ajustes ANTES de tocar nada (las reinstalaciones pueden borrar los datos locales).
2. Haz push de `hey-3` y en GitHub Settings → Pages elige la rama `hey-3`. Espera a que termine el despliegue (pestaña Actions en verde).
3. En Safari, abre https://natzukyy.github.io/english-app/icons/hey-v2-apple-touch-180.png y confirma que se ve el globo azul "Hey!".
4. Borra la app de la pantalla de inicio, vuelve a abrir el sitio en Safari y usa Compartir → Añadir a pantalla de inicio. NO borres los datos del sitio en Ajustes de Safari sin haber exportado.
5. Importa el respaldo si algo faltara.
