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
1. FSRS da mejores intervalos, pero necesita un historial de repasos reales (ideal: cientos) para ajustar sus parámetros por usuario; esta app arranca en cero, sin ese historial.
2. SM-2 es determinista y funciona bien desde la primera tarjeta, sin fase de calibración ni dataset previo.
3. SM-2 es muy simple de implementar sin dependencias (unas pocas fórmulas) y fácil de probar con casos exactos, algo valioso dado el stack sin librerías (ver D1).
4. Es trivial migrar después: cada tarjeta ya guarda repeticiones/intervalo/facilidad, que son insumos razonables si más adelante se quiere ajustar a FSRS con datos reales acumulados.
5. Riesgo aceptado: SM-2 es menos preciso que FSRS a largo plazo; si en unos meses hay suficiente historial, vale la pena revisar el cambio (anotado para revisión futura, no urgente).

## D6. Constantes de XP y niveles (provisionales, `revisar: true`)
- 10 XP por minuto estudiado, 5 XP por ejercicio correcto, bono de 20 XP por cumplir la meta diaria. Nivel n+1 cuesta `100*n` XP más que el nivel n (curva cuadrática simple). Son números de balance de juego inventados por mí, no datos factuales — Alex debe ajustarlos a su gusto; quedaron como constantes fáciles de cambiar en `js/core/xp.js`.

## D7. Racha: congelamientos (provisional, `revisar: true`)
- 2 congelamientos iniciales y máximos, se recupera 1 cada 7 días de racha activa seguidos. Igual que D6, es un número de diseño, no un dato factual.

## D8. Diagnóstico: umbral de acierto y banco de preguntas
- Umbral para "aprobar" un nivel CEFR dentro del diagnóstico: 60% de aciertos en las preguntas de ese nivel (provisional, `revisar: true`). Sube de nivel mientras siga pasando el umbral, en orden A2→B1→B2→C1; si falla un nivel, se detiene ahí.
- El banco de preguntas (`data/diagnostico/banco.json`) lo escribí yo (lecturas, diálogos para TTS, gramática/vocabulario), original y verificado con confianza alta en la corrección gramatical. Los niveles CEFR que les puse son una estimación razonada mía, **no una certificación oficial** — se lo advierto a Alex en la propia nota del JSON y así debe mostrarse en la app (PROMPT_BASE.md lo pide explícitamente).
- La rúbrica de habla/escritura (`data/diagnostico/rubrica_cefr.json`) es un resumen propio, parafraseado, de las escalas de autoevaluación CEFR típicas — no es una cita textual de un documento oficial. Habla y escritura no tienen "motor" de evaluación automática porque no se pueden calificar sin un modelo de lenguaje (PROMPT_BASE.md lo dice explícitamente); el usuario elige el nivel que mejor lo describe.
- `App.TTS` (síntesis de voz) queda detrás de una función sustituible (`setImplementacion`), tal como pide `prompt-noche.md`, para poder reemplazar la Web Speech API después (p. ej. por algo nativo si se empaqueta con Capacitor) sin tocar las pantallas. **No se probó en iOS real** (eso es tarea para cuando Alex tenga el iPhone, ver REPORTE_MATUTINO.md).

## D4. Primer hito de PROMPT_BASE.md (despliegue HTTPS + prueba en iPhone) — NO se hace esta noche
- `PROMPT_BASE.md` pide como primer hito desplegar una página mínima con HTTPS para probar micrófono/voz/instalación en el iPhone.
- `prompt-noche.md` prohíbe explícitamente despliegues esta noche y deja esas pruebas para cuando Alex tenga el iPhone en mano.
- **Decisión:** construyo todo localmente (sin desplegar), dejo el checklist de qué probar en el iPhone en `REPORTE_MATUTINO.md`, y el despliegue (p. ej. GitHub Pages) queda como siguiente paso que Alex debe autorizar.

## D5. Dependencias del proyecto
- **Ninguna.** Cero paquetes npm, cero librerías externas. Todo el JS, CSS y HTML es código propio. (Ver D1.)

---
*(Esta lista se sigue actualizando conforme avanzan las fases.)*
