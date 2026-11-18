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

## D12. Resultado de las pruebas reales en iPhone (iOS 27, Safari 27.2)
- Probado por Alex en su iPhone, tanto en Safari normal como instalada a pantalla de inicio, usando `prueba/index.html` desplegado en GitHub Pages.
- **Micrófono (`getUserMedia` + `MediaRecorder`):** funciona. mimeType usado: `audio/mp4` (codec AAC).
- **Reconocimiento de voz (`SpeechRecognition`/`webkitSpeechRecognition`, en-US):** funciona, tanto en Safari como instalada.
- **Síntesis de voz (`speechSynthesis`):** 26 voces en inglés disponibles en este iPhone, incluyendo Daniel (en-GB), Samantha (en-US), Karen (en-AU), Moira (en-IE), Rishi (en-IN) y Tessa (en-ZA). Hay variedad real de acentos para ejercicios de escucha.
- **Notificaciones (`Notification.requestPermission`):** da `granted` **solo cuando la app está instalada** a pantalla de inicio (no en una pestaña normal de Safari). Importante: esto solo sirve para notificaciones disparadas desde JS mientras la app está abierta/en memoria — **no hay recordatorios programados reales sin un servidor de push**, porque iOS Safari no soporta Web Push sin él. Si en el futuro se quiere un recordatorio diario aunque la app esté cerrada, hace falta backend (fuera de alcance de D5 por ahora).
- **Regla de diseño que se desprende de esta prueba, vigente para toda la app (no solo para `prueba/`):** grabar audio (`MediaRecorder`) y reconocer voz (`SpeechRecognition`) **nunca deben usar el micrófono al mismo tiempo**; cualquier pantalla que use uno debe liberar siempre el micrófono (`stream.getTracks().forEach(t => t.stop())` para `MediaRecorder`, y dejar que `SpeechRecognition` termine con `stop()`/evento `end`) al terminar cada uso, sin excepción, incluyendo las rutas de error. Esto ya se aplicó en `prueba/index.html` (bloqueo mutuo de los botones de las pruebas 2 y 3 mientras una está activa, y liberación de tracks en todas las rutas, incluida la de error del `MediaRecorder`). Cuando se construyan los ejercicios de habla reales (fase 1 ya tiene el contenido, falta la UI), esta regla debe respetarse igual — queda anotada aquí para no perderla. Ver también `CLAUDE.md`.

## D13. Rediseño visual completo (tema "neutro + un acento")
Alex pidió rediseñar toda la interfaz porque se veía "genérica, de plantilla hecha por IA"
(fondo índigo saturado, verde neón, tarjetas anidadas, serif decorativo, emojis como
íconos). Pidió cambiar **solo lo visual** — nada de lógica, datos ni reglas de negocio — y
dio una dirección concreta (ver su mensaje completo en el historial). Esto documenta qué
decidí y por qué, pantalla por pantalla. Capturas antes/después en `capturas/`.

- **Color:** base neutra cálida (`#f6f5f2` claro / `#18181b` oscuro, sigue `prefers-color-scheme`
  y se puede forzar desde Ajustes) + **un solo acento** ámbar (`#9c6008` claro / `#e8a93d`
  oscuro). Elegí ámbar y no azul porque azul es el acento por defecto de casi cualquier app
  genérica (el propio checklist de la skill `frontend-design` lo marca como señal de "SaaS
  genérico"); ámbar además conecta con la idea de "resaltar" mientras lees/estudias.
  Verifiqué contraste WCAG con la misma fórmula de D10: el acento da ≥4.6:1 como texto sobre
  el fondo y ≥4.7:1 con el texto que va encima del botón relleno, en ambos temas. Los 4
  colores de habilidad (antes bloques de color) quedan como un punto de 8px sobrio, tal como
  pidió explícitamente.
- **Menos cajas anidadas:** solo dejé `.tarjeta` donde el contenido ES literalmente una
  tarjeta (la palabra de repaso) o una cita/pasaje de lectura (el texto del diagnóstico).
  Todo lo demás (meta diaria, nivel/XP, resultados del diagnóstico, progreso por habilidad)
  pasó de cajas con borde apiladas a filas separadas por un divisor de 1px + espacio, con la
  escala de espaciado 4/8px que pidió.
- **Tipografía:** quité el serif decorativo por completo (antes solo en títulos); con un
  acento de color ya hay suficiente personalidad, y un segundo estilo tipográfico sin un
  motivo claro es justo el tipo de decoración que pidió evitar. Números de racha/XP/minutos
  en `font-variant-numeric: tabular-nums`.
- **Íconos:** 5 SVG en línea propios (mismo viewBox 24x24, trazo 1.75px, extremos
  redondeados) para la navegación, más `js/core/iconos.js` para los que las pantallas
  generan dinámicamente (flama, check, bocina). Cero emojis en la interfaz.
- **Movimiento** (siempre `transform`/`opacity`, 150-250ms, `cubic-bezier(0.22,1,0.36,1)`,
  respeta `prefers-reduced-motion` globalmente):
  - Entrada de pantalla: cada pantalla envuelve su contenido en `.pantalla-vista`
    (fade + translateY(8px) al montar).
  - Entrada escalonada: `.entrada-escalonada` anima los hijos con 40ms de diferencia entre
    uno y otro (chips de inicio, opciones del diagnóstico, filas de resultado/progreso).
  - Números: `App.Util.animarNumero` cuenta hacia el valor final con `requestAnimationFrame`
    (racha, XP, nivel). Barras de progreso: `App.Util.animarBarra` las hace crecer desde 0%
    al montar o cambiar (meta diaria, avance del repaso/diagnóstico, % hacia B2).
  - Feedback al tocar: `:active { transform: scale(0.97) }` en botones y tabs.
  - Acierto/error en **repaso**: al calificar una tarjeta, un pulso (`transform: scale`) +
    borde de éxito/error la marca antes de avanzar; el avance se retrasa 220ms a propósito
    (ver `js/screens/repaso.js`) solo para que la animación se alcance a ver — la
    calificación SM-2 y lo que se guarda no cambian en nada.
  - Acierto/error en **diagnóstico**: decisión explícita de **no** mostrar aciertos/errores
    pregunta por pregunta durante el cuestionario — el diagnóstico es una evaluación de una
    sola pasada, sin retroalimentación inmediata, y eso es una regla de integridad del
    diagnóstico, no una preferencia visual (PROMPT_BASE.md ya trataba esto como una
    evaluación, no como un juego). En su lugar, el lenguaje de "acierto" se aplica en la
    pantalla de **resultado**: un check verde junto a las habilidades que ya llegan a B2. Y
    decidí **no** poner un marcador rojo de "error" en las que todavía no llegan — no haber
    llegado a B2 en el primer diagnóstico es lo normal, no una falla, y pintarlo de rojo
    sería un mensaje equivocado para una app que busca que Alex seas constante, no que se
    sienta mal por su punto de partida.
- **Tema claro/oscuro:** `preferencias.tema` (`"sistema"|"claro"|"oscuro"`, default
  `"sistema"`) nuevo en `App.Datos`; `App.Util.aplicarTema` pone/quita `data-theme` en
  `<html>`. El CSS define los tokens oscuros dos veces (bajo `@media
  (prefers-color-scheme: dark) :root:not([data-theme="light"])` y bajo
  `:root[data-theme="dark"]`) para que tanto "seguir al sistema" como forzar un tema
  funcionen sin JS adicional en el primer pintado. Selector de 3 vías en Ajustes, igual que
  el de la meta diaria.
- **iOS:** la barra inferior ahora usa `backdrop-filter: blur` + `color-mix()` (con un
  respaldo sólido declarado antes, por si el navegador no soporta `color-mix`) para que se
  vea como una tab bar nativa; `env(safe-area-inset-*)` se agregó también en `main` (antes
  solo estaba en la barra inferior).
- **Service worker:** `CACHE_VERSION` subió de v6 a v8 en dos pasos (v7: agrega
  `iconos.js`; v8: todo el contenido de pantallas/CSS cambió).

**Qué NO toqué:** ninguna fórmula de SM-2/XP/racha/diagnóstico, ningún dato de
`data/`, ninguna ruta de `js/app.js` más allá de aplicar el tema al arrancar. `App.Datos`
gana un campo de preferencia (tema) pero su merge con el default es ahora más robusto
(antes un registro viejo sin un campo nuevo rompía el default; ahora se completa con
`Object.assign`).

**Herramientas usadas:** `frontend-design` (plan en dos pasadas: tokens → revisar contra
los "tells" genéricos → construir). `emil-design-engineering`, `make-interfaces-feel-better`
y `web-animation-design` (del audit-suite) **no están disponibles como skills en este
entorno** — no aparecen en el listado de skills invocables — así que seguí sin ellas,
apoyándome en la guía de `frontend-design` y en las capturas reales para iterar.

**Qué quedó mejor y qué sigue flojo (ver también el mensaje final a Alex):** inicio, repaso
y diagnóstico pasaron por varias rondas reales de captura→crítica→ajuste (el acento y el
layout de chips se afinaron después de ver inicio renderizado) y creo que son las que más
cambiaron para bien. Progreso y ajustes usan el mismo sistema pero con menos iteración
dedicada — deberían verse igual de bien por heredar los mismos tokens, pero no les dediqué
rondas de crítica propias.

---
*(Esta lista se sigue actualizando conforme avanzan las fases.)*
