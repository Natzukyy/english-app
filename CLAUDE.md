# CLAUDE.md — app-ingles

App personal de Alex para llegar a B2 de inglés (CEFR) para fines de marzo 2027. PWA, sin backend, sin cuentas. Prioridad de habilidades: lectura > habla > escucha (énfasis en habla), escritura también débil. Especificación completa en `PROMPT_BASE.md`.

## Stack (ver DECISIONES.md D1)
- Vanilla HTML/CSS/JS. **Sin Node, sin npm, sin bundler, sin frameworks, sin dependencias.** (Esta Mac no tiene Node instalado; no se instala nada global sin autorización.)
- Scripts clásicos (no ES modules) colgados de un namespace global `App.*`, para que el mismo archivo corra en el navegador y en el runner de pruebas.
- Datos de contenido/i18n en JSON bajo `data/`, nunca hardcodeados en JS.

## Comandos
- Servir localmente: `python3 -m http.server 8000` desde la raíz del proyecto, abrir `http://localhost:8000`.
- Correr pruebas: `./tests/run-tests.sh` (usa `osascript -l JavaScript`, no requiere nada instalado).

## Estructura
- `js/core/` — lógica de negocio pura (racha, XP, repaso espaciado, i18n, storage). Sin DOM. Es lo que se prueba.
- `js/screens/` — UI por pantalla, consume `js/core/`.
- `data/` — contenido y textos i18n en JSON.
- `tests/core/` — un `*.test.js` por módulo de `js/core/`.

## Decisiones vigentes
Ver `DECISIONES.md`. Resumen: sin backend (IndexedDB + export/import JSON), SM-2 para repaso espaciado, umbrales de i18n provisionales y editables, fase 3 (juegos) solo como toggle sin lógica, sin conversación con LLM.

## No tocar sin autorización de Alex
Despliegue (GitHub Pages u otro), instalar Node/dependencias, backend, conversación con LLM, contenido de videojuegos.
