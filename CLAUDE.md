# CLAUDE.md — app-ingles

App personal de Alex para practicar inglés con una ruta guiada día a día (Alex no elige qué estudiar; la app se lo dice, ver D25), medida en niveles CEFR **abiertos: A1 a C2, sin tope en B2**. Se llama **"Hey!"** (antes "Rumbo", ver D30; el "!" solo en texto visible, en ids/rutas/claves es "hey") en toda la interfaz (nunca hardcodeado — nombre/idioma vienen de `data/config.json`). La meta de "B2 para fines de marzo 2027" que tenía este documento era el encargo original (ver `PROMPT_BASE.md`, que sigue siendo la especificación base de alcance/prioridades pero ya no de nombre ni de tope de nivel); hoy es solo la meta personal inicial de Alex, guardada en `config.json` como dato opcional que **no se muestra en la interfaz** como límite (ver D25 en DECISIONES.md). PWA, sin backend, sin cuentas. Prioridad de habilidades: lectura > habla > escucha (énfasis en habla), escritura también débil.

## Stack (ver DECISIONES.md D1)
- Vanilla HTML/CSS/JS. **Sin Node, sin npm, sin bundler, sin frameworks, sin dependencias.** (Decisión por ligereza/reversibilidad, no solo por disponibilidad: Node ya quedó instalado globalmente en la Mac en otra sesión, para una tarea sin relación con este proyecto -- no se instala nada global sin autorización, y nada de este proyecto depende de que esté instalado.)
- Scripts clásicos (no ES modules) colgados de un namespace global `App.*`, para que el mismo archivo corra en el navegador y en el runner de pruebas.
- Datos de contenido/i18n en JSON bajo `data/`, nunca hardcodeados en JS.

## Comandos
- Servir localmente: `python3 -m http.server 8000` desde la raíz del proyecto, abrir `http://localhost:8000`.
- Correr pruebas (lógica pura, sin IndexedDB): `./tests/run-tests.sh` (usa `osascript -l JavaScript`, no requiere nada instalado).
- Correr pruebas de integración de la capa de datos (storage.js/datos.js, con IndexedDB real): con el servidor local corriendo, abrir `http://localhost:8000/tests/integracion.html` en un navegador real y tocar "Correr todas las pruebas". No se puede correr desde la terminal (necesita IndexedDB de un navegador de verdad); usa su propia base de datos de pruebas (`app-ingles-integracion-<timestamp>`, se borra sola al terminar) y nunca toca la base real de la app.

## Estructura
- `js/core/` — lógica de negocio pura (racha, XP, repaso espaciado, i18n, storage, **plan guiado `plan.js`, escala abierta `avance.js`**, ver D26). Sin DOM. Es lo que se prueba.
- `js/screens/` — UI por pantalla, consume `js/core/`. Pantallas: inicio, repaso, diagnostico, progreso, ajustes, habla, conversacion, **practicar, lectura, escucha, escritura** (las últimas 4, Fase C del rediseño "Calcomanías", ver D26/D27 — Lectura/Escucha/Habla/Escritura tienen pantalla propia; Practicar es el punto de entrada para practicar algo específico sin afectar la ruta guiada del día).
- `data/` — contenido y textos i18n en JSON. `data/config.json` trae `nombreApp`/`idiomaVisible`/`metaPersonal` (nunca hardcodeado en JS, ver D26). `data/content/fase1/` — lecturas, escucha, escritura, habla (frases), vocabulario y frases_utiles (estas dos alimentan las tarjetas SM-2 de Repaso).
- `tests/core/` — un `*.test.js` por módulo de `js/core/`.

## Decisiones vigentes
Ver `DECISIONES.md`. Resumen: sin backend propio en la app (IndexedDB + export/import JSON), SM-2 para repaso espaciado, umbrales de i18n provisionales y editables, fase 3 (juegos) solo como toggle sin lógica. Conversación con IA (D24): autorizada por Alex, implementada del lado del cliente (pantalla, lógica, Ajustes) y vía un proxy serverless (Cloudflare Worker) cuyo código vive en `cloudflare/worker.js` pero que Alex debe desplegar él mismo -- ver `REPORTE_CONVERSACION_IA.md`. Hasta que lo despliegue y active en Ajustes, la función no hace nada.

**Rediseño "Calcomanías oscuro" + ruta guiada (D25-D27, ver `REPORTE_CALCOMANIAS.md`):** app renombrada a **"Rumbo"** (luego **"Hey!"**, D30), escala CEFR abierta A1-C2 sin tope en B2 (D25); Alex ya no elige qué estudiar, `js/core/plan.js` arma un plan diario y la pantalla Inicio lo guía paso a paso, con la pantalla **Practicar** aparte para practicar algo específico sin afectar el plan del día, "Tu camino" en Inicio es el progreso real de Alex en la escala A1-C2 (no un mapa de ruta tipo Duolingo), tope de 15 tarjetas NUEVAS por día en el repaso guiado (D26); lenguaje visual "Calcomanías oscuro" (paleta, tipografía Bricolage Grotesque autohospedada, sombras duras, animaciones con intención) en celular y laptop (D27).

**Calcomanías 2 (D28, ver `REPORTE_CALCOMANIAS_2.md`):** contenido por nivel A1–B2 (≥150 tarjetas, 12 lecturas y 12 escuchas por nivel; C1/C2 sin contenido), selección que nunca sube de nivel, ruta guiada con "terminar vs. salir" (Esc sale sin marcar), lluvia de calcomanías, accesibilidad (roles, Esc, contraste) e i18n completo en pantallas. `./tests/run-tests.sh` ahora también corre `scripts/validar_contenido.py` y `scripts/buscar_texto_hardcodeado.py`. Scripts Playwright de punta a punta en `tests/e2e/` (se corren con el MCP de Playwright, no desde la terminal).

## Resultado probado en iPhone real (iOS 27, Safari 27.2) — ver DECISIONES.md D12
- Micrófono (`getUserMedia`+`MediaRecorder`) funciona, mimeType `audio/mp4` (AAC).
- `SpeechRecognition` (en-US) funciona, en Safari y ya instalada.
- `speechSynthesis` trae 26 voces en inglés (Daniel en-GB, Samantha en-US, Karen en-AU, Moira en-IE, Rishi en-IN, Tessa en-ZA).
- `Notification.requestPermission` da `granted` solo con la app instalada a pantalla de inicio. Sin servidor push no hay recordatorios programados reales (solo notificaciones mientras la app está abierta).

## Regla de diseño: micrófono (vigente para toda la app, no solo `prueba/`)
Grabar audio (`MediaRecorder`) y reconocer voz (`SpeechRecognition`) **nunca al mismo tiempo**. Siempre liberar el micrófono al terminar cada uso (detener los tracks del stream / dejar que el reconocedor llegue a `end`), incluyendo las rutas de error, no solo el camino feliz.

## No tocar sin autorización de Alex
Despliegue (GitHub Pages, Cloudflare u otro), instalar Node/dependencias, crear cuentas o manejar pagos/claves de API en nombre de Alex, contenido de videojuegos.
