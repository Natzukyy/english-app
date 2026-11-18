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

## D9. Fecha objetivo B2 y fuente de verdad del contexto IndexedDB/UI
- Fecha objetivo usada en la pantalla de progreso: 2027-03-31 ("B2 a finales de marzo de 2027", tal cual lo pide `PROMPT_BASE.md`). No es una decisión mía, solo la traduje a una constante (`FECHA_OBJETIVO` en `js/screens/progreso.js`).
- `App.Datos` (nuevo, `js/core/datos.js`) es la única capa que mezcla IndexedDB con las reglas de negocio puras (Racha/XP/Progreso/SRS). Las pantallas no llaman a `App.Storage` directamente salvo para lo más simple (exportar/importar, leer la sesión de hoy). Esto es, igual que `storage.js`, código que **no se corre con el runner de pruebas** porque depende de IndexedDB — se verificó por lectura cuidadosa + chequeo de sintaxis + servidor local sirviendo todo en 200, no con pruebas automatizadas de extremo a extremo (ver BLOQUEOS.md B1: no se pudo abrir un navegador real sin intervención).

## D10. Auditoría de seguridad (fase 6) — hallazgo real y arreglo
- **Hallazgo:** XSS almacenado potencial vía respaldo importado. `App.Storage.importBackup()` escribe en IndexedDB cualquier contenido de un archivo `.json` sin validar su forma. Varias pantallas (`inicio.js`, `repaso.js`, `progreso.js`) insertaban campos leídos de esos mismos registros (XP total, minutos de hoy, nivel CEFR del diagnóstico, frente/atrás de las tarjetas de repaso, fecha del diagnóstico) directamente en `innerHTML`. Si alguien edita a mano un archivo de respaldo con HTML/JS en esos campos (p. ej. `"frente": "<img src=x onerror=...>"`) y Alex lo importa, ese código se ejecutaría dentro de la app.
- **Qué tan grave:** moderado-bajo en la práctica (la app es de un solo usuario, sin servidor, sin compartir respaldos con terceros), pero es un patrón que vale la pena no dejar crecer, y es barato de arreglar ahora.
- **Arreglo aplicado:** `js/core/util.js` (`App.Util.escaparHTML`, con 4 pruebas) y lo apliqué en los tres puntos identificados. También dejé `porcentajeHaciaB2` saneado como número (`Number(...) || 0`, acotado 0-100) antes de usarlo en un `style="width:...%"`. Además agregué una `Content-Security-Policy` (`script-src 'self'`, sin `unsafe-inline` ni `unsafe-eval`) en `index.html` como segunda capa: aunque alguien encuentre un punto sin escapar que se me haya pasado, un `<script>` o `javascript:` inyectado no podría ejecutarse. `style-src` sí lleva `unsafe-inline` porque varias pantallas usan atributos `style="..."` inline por simplicidad; es un riesgo residual mucho menor (como mucho, maquillaje visual) que dejé así a propósito para no reescribir todo el CSS a clases esta noche.
- **No se tocó (para no sobre-alcanzar):** no agregué sanitización de HTML tipo DOMPurify (sería una dependencia nueva, contra D1/D5) ni cambié el formato del respaldo. El respaldo sigue siendo JSON plano, legible y editable a propósito (es para que Alex pueda mover su progreso entre su iPhone y su Mac).
- **Qué más revisé (sin hallazgos):** no hay `eval`/`new Function` en el código de la app (solo en mis propios scripts de verificación, fuera del repo servible), no hay secretos/API keys en ningún archivo, el service worker solo cachea peticiones del mismo origen (`url.origin === location.origin`), no hay enlaces `target="_blank"` sin `rel="noopener"`, y el formulario de importación usa `FileReader` + `JSON.parse` (no ejecuta nada, el riesgo real estaba solo en el render posterior, ya arreglado).
- **Accesibilidad:** contraste de color verificado con la fórmula de WCAG 2.1 (ver cálculo en la sesión): todos los pares texto/fondo de `css/styles.css` dan 6.4:1 o más (mínimo WCAG AA para texto normal es 4.5:1), así que pasan incluso el umbral AAA de 7:1 en casi todos los casos. Botones táctiles ya cumplen el mínimo de 44px (`--toque-minimo`). `prefers-reduced-motion` respetado globalmente. Foco de teclado visible (`:focus-visible`) en todos los elementos interactivos, todos son `<button>` nativos (navegables por teclado/VoiceOver sin trabajo extra). Lo que **no pude probar**: VoiceOver real en iPhone (queda en el checklist de REPORTE_MATUTINO.md).

## D11. Despliegue autorizado — rutas relativas para GitHub Pages (subcarpeta)
- Alex autorizó expresamente, en una sesión posterior a la noche autónoma, un despliegue público único en GitHub Pages y el push de la rama `noche-1` a `https://github.com/Natzukyy/english-app`. Esto no estaba en los límites duros de `prompt-noche.md` (que prohibía desplegar "esta noche"); Alex está presente y dio la autorización explícita para esta tarea puntual, así que D4 queda superada solo para este paso.
- GitHub Pages sirve el sitio en `https://natzukyy.github.io/english-app/`, una subcarpeta, no la raíz del dominio. Revisé `manifest.webmanifest` (`start_url`/`scope` ya eran `"./index.html"`/`"./"`), `sw.js` (`ARCHIVOS_APP_SHELL` y el registro `navigator.serviceWorker.register("sw.js")` ya eran rutas relativas sin `/` inicial), `index.html` (todos los `<script>`/`<link>` ya relativos) y todos los `fetch(...)` a JSON en `js/core/datos.js`, `js/core/i18n.js` y `js/screens/diagnostico.js` (ya relativos, sin `/` inicial).
- **Resultado: no hizo falta cambiar ninguna ruta**, porque ya se escribieron relativas desde la fase 1 (sin que fuera un requisito explícito entonces, fue el valor por defecto que usé). Lo verifiqué sirviendo `/Users/alex/Proyectos` (la carpeta padre) con `python3 -m http.server --bind 127.0.0.1`, de modo que la app quedó accesible bajo `/app-ingles/...` (una subruta), y confirmé 200 en `index.html`, `manifest.webmanifest`, `sw.js`, `css/styles.css`, `js/app.js`, un JSON de datos y un ícono. Pruebas siguen en verde (62/62).

---
*(Esta lista se sigue actualizando conforme avanzan las fases.)*
