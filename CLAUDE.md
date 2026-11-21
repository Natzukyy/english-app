# CLAUDE.md — app-ingles

App personal de Alex para practicar inglés con una ruta guiada día a día (Alex no elige qué estudiar; la app se lo dice, ver D25), medida en niveles CEFR **abiertos: A1 a C2, sin tope en B2**. Se llama **"Hey!"** (antes "Rumbo", ver D30; el "!" solo en texto visible, en ids/rutas/claves es "hey") en toda la interfaz (nunca hardcodeado — nombre/idioma vienen de `data/config.json`). La meta de "B2 para fines de marzo 2027" que tenía este documento era el encargo original (ver `PROMPT_BASE.md`, que sigue siendo la especificación base de alcance/prioridades pero ya no de nombre ni de tope de nivel); hoy es solo la meta personal inicial de Alex, guardada en `config.json` como dato opcional que **no se muestra en la interfaz** como límite (ver D25 en DECISIONES.md). PWA, sin backend, sin cuentas. Prioridad de habilidades: lectura > habla > escucha (énfasis en habla), escritura también débil.

## Stack (ver DECISIONES.md D1)
- Vanilla HTML/CSS/JS. **Sin Node, sin npm, sin bundler, sin frameworks, sin dependencias.** (Decisión por ligereza/reversibilidad, no solo por disponibilidad: Node ya quedó instalado globalmente en la Mac en otra sesión, para una tarea sin relación con este proyecto -- no se instala nada global sin autorización, y nada de este proyecto depende de que esté instalado.)
- Scripts clásicos (no ES modules) colgados de un namespace global `App.*`, para que el mismo archivo corra en el navegador y en el runner de pruebas.
- Datos de contenido/i18n en JSON bajo `data/`, nunca hardcodeados en JS.

## Comandos
- Servir localmente: `python3 -m http.server 8000` desde la raíz del proyecto, abrir `http://localhost:8000`.
- Correr pruebas (lógica pura, sin IndexedDB): `./tests/run-tests.sh` (usa `osascript -l JavaScript`, no requiere nada instalado; también corre el validador de contenido y el detector de texto hardcodeado).
- Correr pruebas de integración de la capa de datos (storage.js/datos.js, con IndexedDB real): con el servidor local corriendo, abrir `http://localhost:8000/tests/integracion.html` en un navegador real y tocar "Correr todas las pruebas". No se puede correr desde la terminal (necesita IndexedDB de un navegador de verdad); usa su propia base de datos de pruebas (`app-ingles-integracion-<timestamp>`, se borra sola al terminar) y nunca toca la base real de la app.

## Estructura
- `js/core/` — lógica de negocio pura (racha, XP, repaso espaciado, i18n, storage, **plan guiado `plan.js`, escala abierta `avance.js`**, ver D26). Sin DOM. Es lo que se prueba.
- `js/screens/` — UI por pantalla, consume `js/core/`. Pantallas: inicio, repaso, diagnostico, progreso, ajustes, habla, conversacion, **practicar, lectura, escucha, escritura** y **confirmacion** (D29; las 4 anteriores, Fase C del rediseño "Calcomanías", ver D26/D27 — Lectura/Escucha/Habla/Escritura tienen pantalla propia; Practicar es el punto de entrada para practicar algo específico sin afectar la ruta guiada del día).
- `tools/` — herramientas sin dependencias (`validar_contenido.py`).
- `data/` — contenido y textos i18n en JSON. `data/config.json` trae `nombreApp`/`idiomaVisible`/`metaPersonal` (nunca hardcodeado en JS, ver D26). `data/content/fase1/` — lecturas, escucha, escritura, habla (frases), vocabulario y frases_utiles (estas dos alimentan las tarjetas SM-2 de Repaso).
- `tests/core/` — un `*.test.js` por módulo de `js/core/`.

## Decisiones vigentes
Ver `DECISIONES.md`. Resumen: sin backend propio en la app (IndexedDB + export/import JSON), SM-2 para repaso espaciado, umbrales de i18n provisionales y editables, fase 3 (juegos) solo como toggle sin lógica. Conversación con IA (D24): autorizada por Alex, implementada del lado del cliente (pantalla, lógica, Ajustes) y vía un proxy serverless (Cloudflare Worker) cuyo código vive en `cloudflare/worker.js` pero que Alex debe desplegar él mismo -- ver `REPORTE_CONVERSACION_IA.md`. Hasta que lo despliegue y active en Ajustes, la función no hace nada.

**Rediseño "Calcomanías oscuro" + ruta guiada (D25-D27, ver `REPORTE_CALCOMANIAS.md`):** app renombrada a **"Rumbo"** (luego **"Hey!"**, D30), escala CEFR abierta A1-C2 sin tope en B2 (D25); Alex ya no elige qué estudiar, `js/core/plan.js` arma un plan diario y la pantalla Inicio lo guía paso a paso, con la pantalla **Practicar** aparte para practicar algo específico sin afectar el plan del día, "Tu camino" en Inicio es el progreso real de Alex en la escala A1-C2 (no un mapa de ruta tipo Duolingo), tope de 15 tarjetas NUEVAS por día en el repaso guiado (D26); lenguaje visual "Calcomanías oscuro" (paleta, tipografía Bricolage Grotesque autohospedada, sombras duras, animaciones con intención) en celular y laptop (D27).

**Calcomanías 2 (D28, ver `REPORTE_CALCOMANIAS_2.md`):** contenido por nivel A1–B2 (≥150 tarjetas, 12 lecturas y 12 escuchas por nivel; C1/C2 llegaron después, ver D31), selección que nunca sube de nivel, ruta guiada con "terminar vs. salir" (Esc sale sin marcar), lluvia de calcomanías, accesibilidad (roles, Esc, contraste) e i18n completo en pantallas. `./tests/run-tests.sh` ahora también corre `tools/validar_contenido.py` y `scripts/buscar_texto_hardcodeado.py`. Scripts Playwright de punta a punta en `tests/e2e/` (se corren con el MCP de Playwright, no desde la terminal).

**Hey! (rama `hey`, D29–D32, ver `REPORTE_HEY.md`):**
- **Nombre e ícono (D30):** "Hey!" (con "!" solo en texto visible; en ids, claves de `localStorage`, rutas y archivos es `hey`). Ícono fuente `assets/icono/hey.svg` → `icons/hey-v2-*.png` (180/192/512/maskable) y favicon; **al cambiar el ícono, cambiar el sufijo `v2` (iOS cachea por URL, D34)**.
- **Sistema de avance (D29):** el nivel de cada habilidad ya no cambia solo con el Diagnóstico. `js/core/avance.js` guarda por habilidad una **ventana móvil de las últimas 30 respuestas** del nivel actual (IndexedDB v3, store `avance`); `fraccion = min(1, n/30) × min(1, aciertos/0.80)` reemplaza el 50 % fijo en Inicio/Progreso/nivel global. Al llegar a 100 % la habilidad queda en 99 % "lista para confirmar" y el plan agrega "Confirma tu nivel de <habilidad>" (pantalla `confirmacion` para lectura/escucha; habla y escritura confirman en su propia pantalla, modo confirmación). Aprobar = ≥ 70 % (mín. 8 preguntas); si no, se conservan 15 respuestas y se reintenta a los 7 días. La mini-reevaluación de 4 semanas nunca baja el nivel. **Todas las constantes están en un solo lugar: `App.Avance.CONSTANTES` (`js/core/avance.js`).** Practicar también cuenta (una respuesta es una respuesta) sin tocar XP ni el plan.
- **Contenido (D31):** A1–C2 con contenido propio en las 4 habilidades (≥186 tarjetas por nivel con C1/C2, 12 lecturas, 12 escuchas, 40 ejercicios de habla y 12 temas de escritura por nivel) + banco de confirmación `data/content/confirmacion/banco.json` (12 preguntas por habilidad por nivel, A2–C2). Todo con `revisar: true` y `revisionIA`. Las tarjetas duplicadas se **retiran** (`retirada: true`), nunca se borran (el estado SM-2 está ligado al id). Validador: `python3 tools/validar_contenido.py` (corre dentro de `run-tests.sh`).
- **Pruebas e2e nuevas en `tests/e2e/`:** `hey-interfaz.js` (todas las pantallas × interfaz 1–3 × 3 viewports, capturas en `docs/design-review/hey/`) y `hey-avance-movimiento.js` (la barra se mueve tras una sesión y `prefers-reduced-motion`). Ojo al correr `tests/integracion.html` en un navegador con caché terca: si falla algo de contenido nuevo, recarga con la caché desactivada.

**Márgenes de tarjetas (D33, rama `hey-2`):** toda tarjeta o contenedor con borde o fondo lleva **padding interior** con el token `--pad-tarjeta` (16 px; `--pad-tarjeta-grande` 24 px), definido UNA vez en `:root` de `css/styles.css`. `.superficie-oscura` y `.calcomania` son bases **sin padding**: cada uso pone el suyo (pastillas y fichas pequeñas: 8 px vertical / 12 px horizontal; nada de valores sueltos). Las barras con borde de 2.5 px necesitan ≥ 8 px de alto (a 6 px quedaba 1 px de relleno). Después de tocar CSS corre la auditoría: ver `tools/auditoria-margenes.md` (comandos exactos; no va en `run-tests.sh` porque necesita navegador). Debe salir sin hallazgos o con excepciones justificadas en `docs/auditoria-margenes.md`.

**Aire con sombra (D35, rama `hey-3`):** la sombra dura y la rotación cuentan como parte de la tarjeta: entre una tarjeta con sombra y el siguiente elemento debe haber ≥ 12 px de aire real (≥ 16 px bajo la hero). Usa `--aire-sombra` / `--sep-calcomania` / `--sep-hero`; la auditoría tiene la regla `hueco` que lo mide. Los márgenes verticales de bloques colapsan (en flex/grid se suman): mide, no adivines.

## Resultado probado en iPhone real (iOS 27, Safari 27.2) — ver DECISIONES.md D12
- Micrófono (`getUserMedia`+`MediaRecorder`) funciona, mimeType `audio/mp4` (AAC).
- `SpeechRecognition` (en-US) funciona, en Safari y ya instalada.
- `speechSynthesis` trae 26 voces en inglés (Daniel en-GB, Samantha en-US, Karen en-AU, Moira en-IE, Rishi en-IN, Tessa en-ZA).
- `Notification.requestPermission` da `granted` solo con la app instalada a pantalla de inicio. Sin servidor push no hay recordatorios programados reales (solo notificaciones mientras la app está abierta).

## Regla de diseño: micrófono (vigente para toda la app, no solo `prueba/`)
Grabar audio (`MediaRecorder`) y reconocer voz (`SpeechRecognition`) **nunca al mismo tiempo**. Siempre liberar el micrófono al terminar cada uso (detener los tracks del stream / dejar que el reconocedor llegue a `end`), incluyendo las rutas de error, no solo el camino feliz.

## No tocar sin autorización de Alex
Despliegue (GitHub Pages, Cloudflare u otro), instalar Node/dependencias, crear cuentas o manejar pagos/claves de API en nombre de Alex, contenido de videojuegos.
