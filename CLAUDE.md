# CLAUDE.md — app-ingles

App personal de Alex para llegar a B2 de inglés (CEFR) para fines de marzo 2027. PWA, sin backend, sin cuentas. Prioridad de habilidades: lectura > habla > escucha (énfasis en habla), escritura también débil. Especificación completa en `PROMPT_BASE.md`.

## Stack (ver DECISIONES.md D1)
- Vanilla HTML/CSS/JS. **Sin Node, sin npm, sin bundler, sin frameworks, sin dependencias.** (Esta Mac no tiene Node instalado; no se instala nada global sin autorización.)
- Scripts clásicos (no ES modules) colgados de un namespace global `App.*`, para que el mismo archivo corra en el navegador y en el runner de pruebas.
- Datos de contenido/i18n en JSON bajo `data/`, nunca hardcodeados en JS.

## Comandos
- Servir localmente: `python3 -m http.server 8000` desde la raíz del proyecto, abrir `http://localhost:8000`.
- Correr pruebas (lógica pura, sin IndexedDB): `./tests/run-tests.sh` (usa `osascript -l JavaScript`, no requiere nada instalado).
- Correr pruebas de integración de la capa de datos (storage.js/datos.js, con IndexedDB real): con el servidor local corriendo, abrir `http://localhost:8000/tests/integracion.html` en un navegador real y tocar "Correr todas las pruebas". No se puede correr desde la terminal (necesita IndexedDB de un navegador de verdad); usa su propia base de datos de pruebas (`app-ingles-integracion-<timestamp>`, se borra sola al terminar) y nunca toca la base real de la app.

## Estructura
- `js/core/` — lógica de negocio pura (racha, XP, repaso espaciado, i18n, storage). Sin DOM. Es lo que se prueba.
- `js/screens/` — UI por pantalla, consume `js/core/`.
- `data/` — contenido y textos i18n en JSON.
- `tests/core/` — un `*.test.js` por módulo de `js/core/`.

## Decisiones vigentes
Ver `DECISIONES.md`. Resumen: sin backend (IndexedDB + export/import JSON), SM-2 para repaso espaciado, umbrales de i18n provisionales y editables, fase 3 (juegos) solo como toggle sin lógica, sin conversación con LLM.

## Resultado probado en iPhone real (iOS 27, Safari 27.2) — ver DECISIONES.md D12
- Micrófono (`getUserMedia`+`MediaRecorder`) funciona, mimeType `audio/mp4` (AAC).
- `SpeechRecognition` (en-US) funciona, en Safari y ya instalada.
- `speechSynthesis` trae 26 voces en inglés (Daniel en-GB, Samantha en-US, Karen en-AU, Moira en-IE, Rishi en-IN, Tessa en-ZA).
- `Notification.requestPermission` da `granted` solo con la app instalada a pantalla de inicio. Sin servidor push no hay recordatorios programados reales (solo notificaciones mientras la app está abierta).

## Regla de diseño: micrófono (vigente para toda la app, no solo `prueba/`)
Grabar audio (`MediaRecorder`) y reconocer voz (`SpeechRecognition`) **nunca al mismo tiempo**. Siempre liberar el micrófono al terminar cada uso (detener los tracks del stream / dejar que el reconocedor llegue a `end`), incluyendo las rutas de error, no solo el camino feliz.

## No tocar sin autorización de Alex
Despliegue (GitHub Pages u otro), instalar Node/dependencias, backend, conversación con LLM, contenido de videojuegos.
