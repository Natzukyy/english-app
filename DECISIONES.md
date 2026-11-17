# Decisiones autónomas — noche 1

Registro de decisiones tomadas sin preguntar (modo nocturno), con alternativas consideradas. Alex: revisa y corrige lo que no te sirva.

---

## D0. PROMPT_BASE.md no estaba al iniciar
- **Qué pasó:** `prompt-noche.md` pide leer `PROMPT_BASE.md` como especificación completa, pero al empezar no existía en la carpeta (solo estaba `prompt-noche.md`). Empecé a configurar el entorno; Alex lo agregó durante la sesión y confirmó que `PROMPT_BASE.md` prevalece sobre `prompt-noche.md` salvo en límites duros y control de parada.
- **Qué hice:** leí `PROMPT_BASE.md` completo apenas estuvo disponible y lo incorporé como fuente principal de alcance, prioridades (leer > hablar > escuchar, énfasis en hablar; debilidad en hablar y escribir), fecha objetivo (B2 para fines de marzo 2027), y restricciones (no backend, no IA conversacional, no Capacitor-lock-in, fase 3 solo como toggle sin lógica).
- **Alternativa:** detenerme y esperar — descartada porque `prompt-noche.md` indica explícitamente no quedarse atorado y seguir.

## D1. Stack técnico: sin Node/npm disponible
- **Qué encontré:** esta Mac no tiene `node` ni `npm` instalados (ni nvm/volta/deno/bun). Sí hay `python3` (sistema, 3.9.6, y un 3.10 ya instalado por brew previamente) y `osascript -l JavaScript` (JavaScriptCore del sistema, soporta JS moderno: arrow functions, template literals, JSON, clases).
- **Qué elegí:** app 100% HTML/CSS/JS vanilla, **sin build step, sin bundler, sin framework, sin dependencias de npm**. Scripts clásicos (no ES modules) colgados de un namespace global `App.*`, para que el mismo código corra igual en el navegador y en el runner de pruebas.
  - Servidor de desarrollo: `python3 -m http.server` (ya instalado, necesario porque Service Worker e IndexedDB requieren http/https, no `file://`).
  - Pruebas automatizadas: runner propio en JS puro ejecutado vía `osascript -l JavaScript` (sin Jest/Vitest, que requerirían npm).
- **Por qué:** cumple "stack más ligero posible para Mac de 8 GB" y la regla de no instalar nada global/nuevo. Es 100% reversible: si Alex instala Node después, puede añadir Vite/Vitest encima sin tocar la lógica (son archivos JS planos, fáciles de envolver en módulos ES más adelante).
- **Alternativa descartada:** instalar Node vía Homebrew — es instalación global, está prohibida esta noche sin preguntar.
- **Riesgo:** sin bundler, hay que cuidar a mano el orden de carga de `<script>` y las rutas relativas del Service Worker.

## D2. Umbrales de "cuánto inglés en la interfaz" (provisional, `revisar: true`)
- **Qué elegí (valores PROVISIONALES, pensados para ajustarse):**
  - Nivel 0 (0–19 sesiones de repaso completadas O XP < 200): interfaz 100% español.
  - Nivel 1 (20–59 sesiones O XP 200–799): interfaz ~70% español / 30% inglés (botones y etiquetas cortas en inglés, instrucciones largas en español).
  - Nivel 2 (60–149 sesiones O XP 800–2499): ~40% español / 60% inglés.
  - Nivel 3 (150+ sesiones O XP 2500+): interfaz 100% inglés, con toggle manual para volver a español si se necesita.
- **Por qué estos números:** son una estimación razonable de progresión de uso diario (meta mínima 5 min/día), no un dato medido. Los dejo como configuración editable en `data/i18n/umbrales.json`, no hardcodeados.
- **Alternativa:** preguntarte los umbrales exactos como pide `PROMPT_BASE.md` — descartada esta noche por la regla de no preguntar; quedó marcada para tu revisión explícita en el reporte matutino.

## D3. Algoritmo de repaso espaciado: SM-2 (no FSRS)
- (Se detalla en el commit de la fase 2, 5 líneas como pide el prompt.)

## D4. Primer hito de PROMPT_BASE.md (despliegue HTTPS + prueba en iPhone) — NO se hace esta noche
- `PROMPT_BASE.md` pide como primer hito desplegar una página mínima con HTTPS para probar micrófono/voz/instalación en el iPhone.
- `prompt-noche.md` prohíbe explícitamente despliegues esta noche y deja esas pruebas para cuando Alex tenga el iPhone en mano.
- **Decisión:** construyo todo localmente (sin desplegar), dejo el checklist de qué probar en el iPhone en `REPORTE_MATUTINO.md`, y el despliegue (p. ej. GitHub Pages) queda como siguiente paso que Alex debe autorizar.

## D5. Dependencias del proyecto
- **Ninguna.** Cero paquetes npm, cero librerías externas. Todo el JS, CSS y HTML es código propio. (Ver D1.)

---
*(Esta lista se sigue actualizando conforme avanzan las fases.)*
