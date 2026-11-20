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
- **Versión original (de la noche autónoma, YA NO VIGENTE):** el nivel dependía de sesiones completadas O de XP acumulado (lo que se cumpliera primero). Alex detectó el problema al revisarlo: con XP alto se llegaba a nivel 3 (interfaz 100% inglés) en 8–36 días, sin relación real con cuánto inglés se había practicado de forma constante.
- **Corrección de Alex (elegida: opción A):** el nivel de interfaz depende **solo de días activos** — días en que se cumplió el mínimo de la racha (5 min, el mínimo fijo de `App.Racha`, no la meta diaria configurable de 5/15/30). XP y número de sesiones siguen existiendo para todo lo demás (progreso, racha, repaso), pero ya no entran en esta regla.
  - Nivel 0: 0–13 días activos — interfaz 100% español.
  - Nivel 1: 14–39 días activos — corto en inglés, largo en español.
  - Nivel 2: 40–89 días activos — todo en inglés salvo mensajes críticos.
  - Nivel 3: 90+ días activos — interfaz 100% inglés.
  - Valores en `data/i18n/umbrales.json` (`minDiasActivos` por nivel), editables, marcados `revisar: true`.
- **Por qué 14/40/90:** son semanas/meses redondos de constancia real (2 semanas, ~6 semanas, ~3 meses), no una medición — igual de provisionales que antes, pero ahora miden lo que Alex quería medir: consistencia de uso, no acumulación de puntos.
- **Selector manual:** agregué un botón "Forzar español" en Ajustes (`preferencias.forzarEspanol`, default `false`). Si está activo, la interfaz se queda en español sin importar los días activos — para cuando Alex lo necesite sin tener que perder su progreso de días activos.
- **Implementación:** `App.Racha.contarDiasActivos(minutosPorDia, metaMinutosDia)` (nueva, pura, con pruebas) cuenta los días que cumplen el mínimo; `App.I18n.calcularNivel` ahora recibe `{diasActivos}` en vez de `{sesiones, xp}`. `js/app.js` arma `diasActivos` a partir de `App.Datos.obtenerMinutosPorDia()` antes de cada render.

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

## D14. Corrección de los íconos de engranaje (ajustes) y flechas (repaso)
- **Engranaje:** el original tenía dientes de tamaño y espaciado irregular (hecho a mano,
  a ojo). Lo rehíce calculando los 24 puntos del contorno con trigonometría (8 dientes,
  radio externo 9.3, radio interno 7.3, ancho de diente 44% del paso angular, centrado en
  12,12) para que los dientes sean matemáticamente iguales y parejos, más el círculo central
  sin cambios.
- **Flechas de repaso:** el original eran dos trazos sueltos que no se leían como flechas de
  sincronización (parecían dos comas desconectadas). Las rehíce como dos arcos de círculo de
  150° cada uno (radio 7.5, centro 12,12), simétricos por rotación de 180°, cada uno con una
  punta de flecha de dos líneas tangente al final del arco — el diseño estándar de un ícono
  de "repetir/sincronizar".
- **Verificación:** antes de aplicar el cambio, rendericé los 5 íconos juntos y detecté que
  solo estos dos tenían un problema real (los otros 3 — inicio, diagnóstico, progreso — ya
  estaban bien centrados y simétricos, confirmado también ampliándolos). Después, verifiqué
  cada ícono nuevo ampliado (~25x, llenando todo el viewport) antes de aceptarlo. Capturas en
  `capturas/iconos/`.
- Mismo viewBox (24x24) y grosor de trazo (1.75px, extremos y uniones redondeados) que el
  resto del set — no se tocó ningún otro ícono.

## D15. Actualización del service worker sin borrar caché a mano
- **Problema:** antes, el `fetch` del service worker era "caché primero": una vez que un
  archivo quedaba cacheado, nunca se le volvía a preguntar a la red, aunque hubiera
  internet. Subir `CACHE_VERSION` ayuda a que el navegador note que `sw.js` cambió de bytes
  y arranque la instalación de una versión nueva, pero mientras esa instalación no ocurra
  (o en una pestaña que ya estaba abierta) se seguía viendo la versión vieja.
- **Arreglo:** el `fetch` ahora es "red primero, caché de respaldo": con internet, cada
  archivo se pide siempre a la red (y se refresca la copia en caché); sin internet, cae al
  respaldo que ya tenía guardado — la app offline sigue funcionando exactamente igual que
  antes. `install`/`activate` ya hacían `skipWaiting()`/`clients.claim()` desde la fase 1
  (no hacía falta agregarlos), pero eso solo pone al service worker nuevo al mando; una
  pestaña que ya estaba abierta sigue corriendo el JS que ya cargó en memoria hasta que se
  recarga. Por eso agregué en `js/app.js` un listener de `controllerchange` que recarga la
  página una sola vez cuando el service worker nuevo toma control — así el cambio se ve solo,
  sin que Alex tenga que recargar a mano ni borrar caché.
- **Cómo se versiona:** `CACHE_VERSION` en `sw.js` (ahora v10) es una cadena cualquiera
  (`"v" + número`) que solo importa que cambie de un commit a otro — nombra la caché
  (`app-ingles-vN`) y `activate` borra cualquier caché vieja con el mismo prefijo. **Qué
  tiene que hacer un humano (o nadie) en cada actualización:** solo subir ese número cuando
  cambie algo que se sirve offline (lo cual ya era la convención desde la fase 1 — ver el
  comentario en `sw.js`); después de eso no hace falta que Alex borre caché ni haga nada más,
  el service worker nuevo se instala, activa y recarga la pestaña abierta automáticamente la
  próxima vez que haya red.
- **No se pudo verificar en un navegador real** (ver BLOQUEOS.md B1/B3: no hay forma segura
  de automatizar un navegador de verdad en esta sesión). Verifiqué que `sw.js` y `js/app.js`
  parsean sin errores y que la lógica es consistente por lectura; queda en el checklist para
  que Alex confirme en Safari real (cambiar algo, recargar con internet, ver que se aplica
  sin tocar el caché a mano).

## D16. Versión laptop/responsive (Paso 3)
- **Breakpoints:** móvil hasta 767px y tablet 768-1099px comparten exactamente el mismo CSS
  que ya existía (lienzo centrado de 480px máximo, barra inferior) — no había pedido un
  tratamiento distinto para tablet más allá de fijar dónde termina, así que dejé esa franja
  intacta a propósito, en vez de inventar un diseño intermedio no pedido. Desde 1100px:
  barra lateral + columnas.
- **Barra lateral:** la misma `nav.tabs` del HTML, reordenada con `order:-1` y reestilada por
  CSS (sin tocar el HTML): iconos+etiqueta en fila, ancho fijo 220px, fondo sólido con borde
  derecho, fila activa con tinte del acento. `main` pasa a `max-width:960px` centrado dentro
  de `#app` (que a su vez tiene su propio `max-width:1180px`).
- **Inicio como "panel":** envolví su contenido en `.panel-dos-columnas` (hero/meta/CTA a la
  izquierda, habilidades a la derecha) — en móvil/tablet es simplemente dos `div` apilados
  (ninguna regla de grid se aplica por debajo de 1100px, así que no cambia nada ahí).
- **Progreso en dos columnas:** la lista de habilidades usa `.grid-progreso` (rejilla 2x2,
  separada por espacio en vez de línea divisoria — una línea divisoria a media fila en una
  rejilla se ve rota).
- **Repaso/diagnóstico/ajustes:** `.ancho-lectura` (máximo 720px, centrado) en su contenedor
  — nunca se estiran a todo el panel, tal como se pidió.
- **Hover:** agregado en botones, enlaces y la barra de navegación, dentro de
  `@media (hover: hover) and (pointer: fine)` para que no se quede "pegado" al tocar en
  móvil. Sin atajos de teclado nuevos (no se pidieron).
- **Verificación de capturas:** ver BLOQUEOS.md B4 — el método de captura (`qlmanage` +
  iframe) no es fiel por encima de ~960px de ancho (límite del generador de miniaturas, no
  de mi CSS). Verifiqué el mecanismo completo con el breakpoint temporalmente bajado a
  700px (en una copia, nunca en el archivo real) y capturas a 900px, que sí son fieles.
  Capturas en `capturas/responsive/`. Falta que Alex confirme a los tamaños exactos
  (1440/1280/768) en un navegador real.

## D17. Más vida: ruta de aprendizaje y flujo de sesión con feedback (Paso 4)
- **Nodos de habilidad (inicio):** cada habilidad es ahora un ícono propio (libro/
  auriculares/micrófono/pluma, nuevos en `js/core/iconos.js`) dentro de un anillo de
  progreso SVG (`stroke-dasharray`/`stroke-dashoffset`, animado con
  `App.Util.animarAnillo`, nueva). El porcentaje del anillo es exactamente
  `porcentajeHaciaB2` que ya calculaba `App.Diagnostico` — no es un número nuevo, solo una
  forma nueva de dibujar uno que ya existía.
- **Ruta de sesiones (inicio):** ver BLOQUEOS.md B5 — por ahora son 2 pasos reales
  (Diagnóstico, Repaso de hoy), no los 5 tipos de contenido que menciona el Paso 4, porque
  lecturas/habla todavía no tienen pantalla propia y no quise poner nodos que no llevan a
  ningún lado.
- **Racha/meta:** la flama ahora tiene una clase `.flama-animada` (un pulso de escala) que
  se aplica cuando `sesionHoy.metaCumplida` es real (de IndexedDB, no inventado). La barra
  de meta diaria se quedó como barra (ya animaba desde el Paso 1 de la ronda anterior) en
  vez de cambiarla a anillo — el Paso 4 ofrecía "anillo **o** barra animada" como
  alternativas válidas, y ya teníamos una barra animada funcionando.
- **Repaso — Comprobar/Continuar:** "Mostrar respuesta" pasa a llamarse "Comprobar"; al
  tocarlo, un panel de retroalimentación (`.panel-retro`) sube desde abajo con la respuesta
  y las 4 opciones de autocalificación. Al calificar, el panel se tiñe de éxito/error
  (según `calidad >= 3`, la misma regla de siempre) y aparece "Continuar", que es quien
  ahora dispara `calificarTarjeta`/`Storage.put`/avanzar — **antes avanzaba solo con un
  `setTimeout` de 220ms; ahora espera el toque de Alex**, así que no depende de un tiempo
  arbitrario para que la animación se alcance a ver. La calificación SM-2 en sí no cambió
  en nada.
- **Diagnóstico — Comprobar/Continuar con corrección real:** las preguntas de banco
  (lectura/escucha/vocabulario_gramatica) ahora se responden en dos pasos: elegir una
  opción (se resalta, no avanza todavía) y tocar "Comprobar", que compara contra
  `p.respuestaCorrecta` — **un campo que ya existía en `data/diagnostico/banco.json`**, solo
  que antes no se usaba para nada visual durante el cuestionario. Esto **reemplaza la
  decisión D13 anterior** ("no revelar acierto/error pregunta por pregunta, por integridad
  del diagnóstico"): el Paso 4 pidió explícitamente este flujo para repaso y diagnóstico
  por igual, y dado que no es un test adaptativo (todas las preguntas están fijas de
  antemano, no cambian según respuestas previas), revelar el acierto no compromete nada —
  fue una cautela mía de más en D13. Lo que SIGUE intacto: `App.Diagnostico.construirResultado`
  calcula el nivel estimado exactamente igual que antes; esto solo cambia qué se le muestra
  a Alex mientras contesta, no cómo se califica al final. Los pasos de autoevaluación
  (habla/escritura) no tienen "Comprobar" porque no hay una respuesta correcta que
  comprobar — se seleccionan y avanzan directo, como antes.
- **Fin de sesión:** repaso ahora tiene una pantalla de cierre real (no solo una frase):
  confeti discreto (`App.Util.confeti`, con los colores propios de la app, nunca arcoíris
  genérico), racha animada, y un resumen de tarjetas repasadas/aciertos/minutos/XP —todo
  leído de `registrarSesion` y `obtenerEstadoRacha`, que ya existían. El resultado del
  diagnóstico también gana confeti, pero **no** XP/minutos inventados: el diagnóstico nunca
  llamó a `registrarSesion` y no empecé a hacerlo ahora (sería agregar una regla de negocio
  nueva, fuera de lo pedido).
- **Microinteracciones:** todo el movimiento nuevo (pulso de la flama, anillo de progreso,
  panel que sube, confeti) usa solo `transform`/`opacity`, 150–900ms (el confeti es el único
  que pasa de 300ms, porque "caer" se ve mal comprimido a menos de medio segundo; sigue
  siendo una animación breve y única, no un loop). El confeti se desactiva por completo
  (`display:none`) bajo `prefers-reduced-motion`, no solo se congela.
- **Verificación:** mismo límite de `qlmanage` que D16 para capturas grandes, y un límite
  nuevo específico — cualquier elemento con la animación `entra-arriba`/`sube-abajo`
  (`.pantalla-vista`, `.entrada-escalonada`, `.panel-retro`) se congela invisible en la
  primera captura porque el generador de miniaturas no avanza el tiempo de la animación;
  para revisar esos casos quité la animación de una copia del HTML de prueba (nunca del
  código real) y así encontré y arreglé un bug real: las opciones del diagnóstico se
  quedaban con `aria-current="true"` de la selección aunque ya se hubiera comprobado la
  respuesta, compitiendo en especificidad con el color de acierto/error — ahora se quita
  ese atributo al comprobar.

## D18. Paso A — ejercicio de habla (solo reconocimiento de voz, sin grabar audio)
- **Pantalla nueva:** `js/screens/habla.js`, alcanzable desde el nodo "habla" en Inicio
  (`#/habla`; no agregué una 6ª pestaña a la nav, que es un cambio de estructura de
  navegación que no pedía este paso — ver Paso 3/4 de la ronda de diseño, ya cerrados).
- **Nunca graba audio:** solo usa `SpeechRecognition`. No hay tensión con D12 (no usar mic
  para grabar y reconocer a la vez) porque aquí nunca se graba — el único cuidado real es no
  arrancar el reconocimiento mientras `App.TTS.hablar()` todavía está sonando: el botón
  "Hablar" queda deshabilitado hasta que la promesa de `hablar()` resuelve (se ve/oye el
  modelo primero, siempre).
- **`App.Habla.comparar(objetivo, transcripcion)`** (nuevo, puro, `js/core/habla.js`, 9
  pruebas en `tests/core/habla.test.js`): normaliza (minúsculas, sin puntuación, apóstrofos
  rectos, números comunes tipo "two"↔"2"), alinea palabra por palabra con distancia de
  edición (a nivel de palabra, usando distancia de edición de caracteres como criterio de
  "casi igual" para tolerar errores chicos del reconocimiento — p. ej. singular/plural) y
  devuelve `{porcentaje, acertadas, omitidas, distintas}`.
- **Tono de guía, no de examen:** el resultado se presenta como "% parecido" con las
  palabras que sí salieron (verde/ámbar, nunca "FAIL") y las que conviene revisar, más una
  nota explícita de que el reconocimiento es aproximado. Umbral de 60% para contar como
  "correcto" de cara al XP — una constante local de esta pantalla, igual que el umbral de
  calidad≥3 de repaso; no toqué `data/i18n/umbrales.json` ni ninguna regla existente.
- **Dos tipos de ejercicio:** "shadowing" (frase fija → sí se compara) y
  "responder_prompt" (pregunta abierta → no hay una "respuesta correcta" que comparar, así
  que solo se muestra la transcripción y se cuenta como intento válido).
- **Errores manejados**, cada uno con mensaje claro y "Reintentar": sin voz detectada
  (`no-speech`), permiso denegado (`not-allowed`/`permission-denied`), error de red
  (`network`), y "sin soporte" (no existe `SpeechRecognition`), que en vez de "Reintentar"
  ofrece autoevaluación manual (Me salió bien / Me costó trabajo) para no dejar al usuario
  sin forma de completar el ejercicio.
- **XP y minutos:** usa `App.Datos.registrarSesion` tal cual ya existía (mismas reglas de
  XP/racha), igual que repaso — no se tocó esa función.
- **`requiere_prueba_iphone: true`** (lo pide el paso): la lógica de comparación está
  probada con tests; el micrófono/reconocimiento real en iOS solo lo puede probar Alex —
  ver `REPORTE_MATUTINO_2.md`.

## D19. Paso B — pruebas de integración de la capa de datos (IndexedDB real)
- **`js/core/storage.js` se refactorizó a fábrica** (`App.Storage.crear(nombreDB, version)`)
  para poder dar a las pruebas una base de datos separada sin tocar la real de Alex. El
  comportamiento de `global.App.Storage` (la instancia real, `"app-ingles"`, versión 1) **no
  cambió en nada** — mismo nombre, misma versión, misma API; solo se envolvió la lógica
  existente en una función que ahora se puede llamar de nuevo con otro nombre. Cero cambio
  de comportamiento para la app real.
- **`tests/integracion.html`** (nuevo): página independiente, sin dependencias, que corre
  contra IndexedDB de verdad (necesita un navegador real — `osascript`/JavaScriptCore no
  tiene IndexedDB, por eso esta capa no se probaba antes). Usa
  `App.Storage.crear("app-ingles-integracion-" + Date.now(), 1)` y reemplaza
  temporalmente `App.Storage` con esa instancia mientras corre la batería (restaurando la
  real al final, pase lo que pase) — como `App.Datos` lee `global.App.Storage.xxx` en cada
  llamada (no guarda una referencia capturada), esto basta para que toda la capa de datos
  "vea" la base de prueba sin tocar `datos.js`. Al terminar, borra la base de prueba entera
  (`eliminarBaseDeDatos`, nuevo). Documentado en `CLAUDE.md` cómo abrirla.
- **8 pruebas**: sesión del día, sumar minutos/XP, cambio de día, racha con mínimo cumplido
  y sin cumplir (agotando congelamientos a propósito para ver la racha romperse de verdad),
  congelación cubriendo un día saltado, exportar+reimportar, respaldo malformado (rechazado
  limpio) y respaldo con HTML (se guarda como texto inerte — el riesgo real de XSS está en
  renderizar ese campo, no en guardarlo, y ya se arregló del lado de renderizado en D10;
  esta prueba solo confirma que IndexedDB no "ejecuta" nada, que es justo lo que se espera
  de un almacén de clave-valor), y repaso (tarjeta nueva → calificar SM-2 → guardar →
  recargar).
- **No encontré un error real en `storage.js`/`datos.js`** al escribir estas pruebas
  (sí encontré uno en la UI del diagnóstico durante el Paso 4 — ver D17). El
  único ajuste que hice fue a mi PROPIA prueba de racha (mi primera versión asumía que un
  solo día bajo el mínimo rompería la racha, pero los 2 congelamientos iniciales por
  defecto lo cubren — no es un bug, es el comportamiento documentado en D7).
- **No pude correr esta página yo mismo** (osascript no tiene IndexedDB ni DOM real —
  ver BLOQUEOS.md B1/B3/B4, mismo límite de siempre esta sesión). Verifiqué sintaxis
  (parser de JavaScriptCore) y que el servidor local la sirve junto con todos los `js/core/*`
  que importa, y tracé a mano cada prueba contra los valores por defecto reales de
  `App.Racha`/`App.XP`/`App.SRS`. Queda en el checklist de `REPORTE_MATUTINO_2.md` para que
  Alex la corra de verdad y me diga si algo falla.

## D20. Paso C — ampliación de contenido de fase 1
- **Lecturas:** 4 → 12 (8 nuevas, A2-B2, temas de carrera/comunicación profesional:
  standup, pedir ayuda, documentar código, feedback en code review, explicar un bloqueo,
  planear un sprint, pros/contras de una herramienta, preparar una demo). Texto 100%
  original, cada una con 1-2 preguntas de comprensión y distractores de largo parecido.
- **Vocabulario:** 20 → 60 (40 términos nuevos: incidentes/DevOps, SCRUM, comunicación
  asertiva, reuniones). Mismas categorías que ya existían más 2 nuevas (`reuniones`,
  `entrevistas`) para los términos que encajaban mejor ahí.
- **Frases útiles:** de ~34 a 55, repartidas entre las 7 categorías que ya existían (no se
  pidió un número exacto, solo "ampliar").
- **Ejercicios de habla:** 8 → 24 (16 nuevos: 8 `shadowing` + 8 `responder_prompt`,
  progresión A2→C1), para que el Paso A tenga variedad real.
- **Banco del diagnóstico:** 24 → 48, agregando exactamente 2 preguntas nuevas por cada
  combinación de habilidad (lectura/escucha/vocabulario_gramatica) y nivel (A2/B1/B2/C1) —
  queda perfectamente balanceado: 4 de cada combinación, 12 por habilidad, 12 por nivel.
- **Hallazgo real (no lo arreglé, lo marqué):** en TODAS las preguntas originales de la
  noche anterior, la respuesta correcta es siempre la opción en el índice 0 — un patrón que
  alguien que haga el diagnóstico con atención podría notar y explotar sin realmente saber
  inglés. No lo corregí porque arreglarlo de verdad significa mezclar las opciones al
  renderizar en `diagnostico.js`, un cambio de lógica fuera de este paso (que pedía solo
  contenido). Sí varié a propósito la posición de la respuesta correcta en las 24 preguntas
  nuevas, para que al menos no empeore. Queda anotado para que Alex decida si vale la pena
  el cambio de lógica.
- **Todo lo nuevo** está marcado `revisar: true` (el nivel CEFR es mi estimación, no una
  certificación) y es contenido original mío, verificado gramaticalmente con confianza alta
  pero sin afirmaciones técnicas dudosas — donde no tenía certeza de un dato preferí texto
  genérico/narrativo en vez de inventar un dato técnico específico.
- **Verificación:** cada archivo se validó con `json.load` (parsea sin errores), conteo de
  ids únicos, y que todo `respuestaCorrecta` cae dentro del rango de `opciones` — ver
  comandos corridos en esta sesión. 78/78 pruebas puras siguen en verde (nada de esto toca
  lógica).

## D21. Arreglo del sesgo "la respuesta correcta siempre es la opción 0" (ver D20)
- **Arreglo:** `App.Util.barajarOpciones(opciones, indiceCorrecta)` (nueva, pura,
  `js/core/util.js`) baraja un arreglo de ÍNDICES (no los textos) y devuelve
  `{opciones, indiceCorrecta, indicesOriginales}`. `indicesOriginales[posiciónBarajada]`
  guarda a qué índice original corresponde esa posición, así que la respuesta elegida en
  pantalla se puede traducir de vuelta al índice original sin ambigüedad, incluso si dos
  opciones tuvieran el mismo texto (por eso se barajan índices y no los strings).
- **`js/screens/diagnostico.js`** la usa al pintar cada pregunta de banco.json: las
  opciones se muestran en el orden barajado, pero lo que se guarda en
  `estado.respuestas[p.id]` sigue siendo el **índice original** (vía `indicesOriginales`).
  `App.Diagnostico.construirResultado`/`evaluarHabilidad` (el motor de calificación) **no
  se tocó en absoluto** — sigue comparando `respuestas[p.id] === p.respuestaCorrecta` contra
  `banco.json` tal cual, y sigue dando el resultado correcto porque lo que le llega ya está
  en su mismo sistema de índices de siempre. `banco.json` tampoco se tocó: el sesgo se
  arregla solo en cómo se presenta, nunca en los datos.
- **Lecturas:** `data/content/fase1/lecturas.json` tiene el mismo sesgo en sus preguntas de
  comprensión (casi todas con `respuestaCorrecta: 0`), pero **no hay ninguna pantalla que
  las muestre todavía** (ver BLOQUEOS.md B5) — no hay nada que cablear. `barajarOpciones` es
  genérica (no depende de nada específico del diagnóstico) y queda lista para usarse ahí el
  día que exista esa pantalla.
- **Pruebas (5 nuevas, `tests/core/util.test.js`):** la correcta cae en más de una posición
  a lo largo de 200 corridas; la comprobación sigue apuntando al valor correcto (no a una
  posición fija) en 100 corridas; la traducción posición-barajada → índice original es
  consistente; no se pierde ni se duplica ninguna opción (mismo multiconjunto, mismos 5
  índices originales presentes) en 50 corridas; caso de una sola opción no se rompe.
- **Nada de diseño ni de puntuación cambió:** mismas clases CSS, mismo flujo
  Comprobar/Continuar, mismas animaciones, mismo umbral de acierto y misma fórmula de
  `evaluarHabilidad`. 83/83 pruebas en verde (78 de antes + 5 nuevas), corrido varias veces
  para confirmar que no hay aleatoriedad que las haga fallar por casualidad (el riesgo
  teórico de que 200 corridas caigan siempre en la misma posición es prácticamente cero).

## D22. Tercer nodo "Habla" en "Tu camino" (Inicio)
- Agregado a pedido explícito de Alex: mismo componente visual que "Diagnóstico"/"Repaso de
  hoy" (círculo + línea conectora + mismo pulso animado en estado "actual"), sin pestaña de
  navegación nueva — se llega igual que antes, por hash (`#/habla`), reusando el wiring
  genérico de `[data-ruta-a]` que ya existía.
- **Estado honesto, no inventado:** como `habla.js` y `repaso.js` llaman al mismo
  `App.Datos.registrarSesion` y por lo tanto escriben en el mismo registro de sesión del
  día, no hay manera de saber si "habla" específicamente se practicó hoy (solo si hubo
  estudio en general). Por eso este nodo nunca llega a "completado": se queda en "actual"
  en cuanto el diagnóstico está hecho (mismo gate que repaso), para no mostrar un check que
  no se puede respaldar con un dato real. Ver BLOQUEOS.md B5, actualizado.
- Sin cambios de lógica de negocio ni de puntuación; solo un tercer elemento en el arreglo
  que ya armaba la ruta en `js/screens/inicio.js`.

## D23. Rediseño de Inicio: corrección de los bugs reales vistos en capturas
Alex reportó bugs concretos vistos en capturas reales de Inicio (móvil y laptop) y dio una
especificación exacta a seguir al pie de la letra. Antes de tocar código confirmé qué
skills veo en esta sesión: `frontend-design` (plugin) está disponible y lo usé como guía de
fondo; `emil-design-engineering`, `make-interfaces-feel-better` y `web-animation-design` NO
existen en este entorno (ya confirmado en rondas anteriores). Donde la especificación de
Alex es explícita, manda ella sobre cualquier otra guía.

- **Móvil — barra de estado tapando el encabezado:** `main` ya tenía
  `padding-top: max(e-5, env(safe-area-inset-top))`, pero en la práctica se seguía viendo
  pegado/tapado. Cambié a `calc(max(e-5, env(safe-area-inset-top, 0px)) + e-2)` — 8px extra
  de respiro más allá del borde del área segura, nunca exactamente al ras.
- **Íconos irreconocibles / habla y escritura desalineadas:** la causa real de la
  desalineación era de *box model*, no de diseño: las tarjetas eran `<div>` o `<button>`
  según si tenían pantalla propia, y un `<button>` sin reset trae su propio padding/border
  del navegador, así que medía distinto a un `<div>` aunque compartieran la misma clase.
  Arreglo: `.tarjeta-habilidad` resetea explícitamente `border/padding/font/appearance` para
  que `<div>` y `<button>` midan exactamente igual. De paso, se abandona el anillo de
  progreso (56px, ícono a 22px) por el mosaico de 48px + ícono a 24px que pide la
  especificación — más grande, más reconocible. Verifiqué los 4 íconos ampliados antes de
  aceptarlos (reutilizan los mismos trazos ya aprobados en el Paso 1/4, que ya habían
  pasado esa revisión).
- **Candados en "Tu camino":** ya no se dibuja el ícono de candado para "pendiente" --
  `contenidoCirculo` solo pone el ícono de check en "completado"; "pendiente" y "actual" se
  diferencian solo por color/pulso (CSS, ya existía), nunca por un candado. Repaso y Habla
  siempre fueron clickeables en el código (nunca hubo un bloqueo real) — el candado
  visual era lo único que mentía.
- **Nunca una raya "—":** las tarjetas de habilidad muestran una barra de progreso real o
  el texto "Sin datos" en `texto-tenue`, nunca un guion suelto.
- **Laptop — barra lateral estirando sus 5 ítems a todo el alto:** la causa real era que
  `nav.tabs button{flex:1}` (de la regla base, pensada para la barra inferior en móvil)
  nunca se reseteaba dentro de la media query de laptop, así que cada botón heredaba
  `flex-grow:1` dentro de un contenedor en columna y se repartía el alto completo de
  `100vh` entre los 5 -- de ahí también el "cuadro gigante" del ítem activo (el fondo
  tintado ocupaba ese alto estirado). Arreglo: `flex: none` + `height: var(--toque-minimo)`
  en la media query de laptop. Ancho fijo subido de 220 a 240px (pedido explícito), `gap`
  de las filas a 4px (`--e-1`), y agregué un encabezado `.marca-sidebar` ("Inglés B2") fijo
  arriba de los ítems (no existía ningún nombre de app en la barra antes).
- **Laptop — contenido en dos columnas desconectadas / botón pegado a "Tu camino":**
  se elimina `.panel-dos-columnas`/`.panel-col` por completo. Ahora todo Inicio es una sola
  columna (`.flujo-inicio`, nueva clase utilitaria: `> * + * { margin-top: 32px }`, un
  espacio uniforme entre cada bloque de arriba a abajo). Racha, meta y nivel/XP se
  consolidan en **una sola tarjeta** (tres `.fila` con divisor, reutilizando el patrón que
  ya existía en vez de inventar uno nuevo) en lugar de hero-bloque + tarjeta separados.
  `main` en laptop pasa de padding asimétrico (48/32/32) a `padding: 32px` parejo, como pide
  la especificación.
- **Rejilla de habilidades 2x2 en móvil / 4 en laptop:** `.tarjetas-habilidad` usa
  `grid-template-columns: 1fr 1fr` por defecto y `repeat(4, 1fr)` desde 1100px, dentro de la
  media query de laptop que ya existía (no se agregó ninguna media query nueva).
- **Único acento, sin colores nuevos:** las tarjetas de habilidad no usan
  `--punto-lectura/escucha/habla/escritura` en ningún lado (esos tokens se quedaron
  reservados para los chips de Progreso, que no se tocaron); el ícono del mosaico usa
  `--texto` sobre `--superficie-hundida` (neutro) y la única barra de color sigue siendo
  `--acento`.
- **Limpieza:** `App.Util.animarAnillo` y toda la CSS de `.anillo`/`.nodo-habilidad`/
  `.nodos-habilidad` se eliminaron por completo (confirmé con `grep` que no se usaban en
  ningún otro lado antes de borrarlos) — ya no tenían función con el nuevo diseño de
  mosaico.
- **Escala de espaciado:** de paso corregí dos valores sueltos preexistentes que no
  encajaban en la escala 4/8/12/16/24/32/48 (`.chip{padding:4px 0}` y
  `.ruta-boton{padding:6px 0 0}`, este último literalmente fuera de la escala) a
  `var(--e-1)`, ya que la especificación pide la escala "al pie de la letra" y estaban a la
  vista mientras tocaba esas reglas.

**Proceso de capturas (mínimo 2 vueltas, cumplido):** verifiqué 390/375 (ambos perfectos
desde la primera vuelta) y 1440/1280. En la primera vuelta de laptop, la barra lateral se
veía bien pero el contenido principal parecía desbordarse en la captura. Antes de aceptarlo
como bug real, investigué a fondo: agregué bordes de calibración (`outline`) a `#app` y
`main`, probé con contenido mínimo (sin las 4 tarjetas ni la ruta) y el desborde seguía
idéntico -- eso ya descartaba que fuera por la rejilla o por las tarjetas.
Lo reproduje con una versión reducida del breakpoint (1100px→700px, en
una copia, nunca en el archivo real) a 900px de ancho, donde la herramienta de captura SÍ
es fiel (ver BLOQUEOS.md B4): ahí todo se ve exactamente como se espera, sin desborde.
Conclusión: es la MISMA limitación de `qlmanage` ya documentada (no es fiel por encima de
~1000px de ancho), ahora confirmada con una prueba de control más profunda — ni el
contenido ni la cantidad de tarjetas la disparan, aparece incluso con una tarjeta y un
botón solos. Igual agregué `min-width: 0` en `main`, `.tarjeta-habilidad` y `.ruta-boton`
como buena práctica defensiva contra el desborde real de flex/grid (el de
`min-width: auto` por defecto), aunque no era la causa de lo que se veía en la captura.
Capturas en `capturas/inicio-rediseno/`: las de 390/375 son fieles y quedaron limpias; las
de 1440/1280 muestran el desborde conocido de la herramienta (incluidas de todas formas,
tal como se pidió) junto con una captura de control a 900px (mecanismo real, confiable) y
otra con bordes de calibración que confirma que la barra lateral ya NO se estira.

## D24. Conversación con IA: proxy serverless (opción B), implementada del lado del cliente, pendiente de despliegue por Alex
`PROMPT_BASE.md` pedía proponer esto con costo/riesgo "cuando termine el primer hito" (ya
pasó: la prueba en iPhone real está hecha, ver D12/REPORTE_PRUEBA_IPHONE.md). Se presentaron
dos opciones:

- **Opción A (no elegida):** la propia clave de Anthropic de Alex, guardada en IndexedDB,
  llamando directo desde el navegador con el header `anthropic-dangerous-direct-browser-access`
  (existe desde 2024, confirmado buscando fuentes). Sin backend, cero infraestructura nueva,
  pero la clave queda legible en las herramientas de desarrollador del navegador.
- **Opción B (elegida por Alex):** un Cloudflare Worker gratuito como proxy, que guarda la
  clave como secreto del servidor. Es "backend" en el sentido de la regla propia de Alex
  ("no tocar sin autorización") — por eso se propuso en vez de construirse directo, y Alex
  autorizó explícitamente esta opción.

**Qué se construyó del lado del cliente (sí corre ya, se puede revisar/probar sin desplegar nada):**
- `js/core/conversacion.js` (puro, con tests): arma el payload para la API de mensajes de
  Anthropic (modelo `claude-haiku-5-5`, el más barato disponible al escribir esto — ver
  investigación de precios en el chat: ~$0.10/millón tokens de entrada, ~$0.50/millón de
  salida, cifras de terceros no confirmadas contra la página oficial de Anthropic),
  recorta el historial a los últimos 8 turnos (en pares, para no romper la alternancia
  usuario/asistente que exige la API), e interpreta la respuesta/errores.
- `js/core/ia.js`: hook de red sustituible, mismo patrón que `App.TTS` (D-anterior) — la
  pantalla nunca hace `fetch` directo, para poder sustituir la implementación en pruebas.
- `js/screens/conversacion.js`: pantalla nueva y separada (decisión explícita de Alex, no
  dentro de Habla). Reutiliza la misma disciplina de micrófono que Habla (D12/D18): solo
  `SpeechRecognition`, nunca `MediaRecorder`. Si el navegador no tiene reconocimiento de voz,
  cae a un campo de texto (no tiene sentido la autoevaluación de Habla aquí, porque no hay
  una "respuesta correcta" contra la cual compararse). 7 escenarios de práctica = las mismas
  7 categorías ya escritas en `data/content/fase1/frases_utiles.json` (correos, reuniones,
  standups, explicar proyecto, pedir ayuda, dar feedback, entrevistas) — no se inventaron
  escenarios nuevos. El nivel CEFR que se le pasa al modelo viene de la autoevaluación de
  habla del último diagnóstico (o "B1" si no hay diagnóstico todavía).
- Cuarto nodo "Conversación con IA" en "Tu camino" (Inicio), campos nuevos en Ajustes
  (activar/desactivar + URL del Worker propio de Alex — nunca una clave de API, esa vive
  solo en el servidor del proxy), `connect-src https://*.workers.dev` agregado al CSP de
  `index.html` (no se puede poner la URL exacta porque Alex todavía no la tiene; si más
  adelante usa un dominio propio en vez del subdominio `workers.dev` por defecto, el CSP
  necesitará otro ajuste — queda anotado en `REPORTE_CONVERSACION_IA.md`).
- `cloudflare/worker.js`: el código del proxy, NO desplegado desde aquí (no hay cuenta de
  Cloudflare ni clave de Anthropic en esta sesión, y aunque las hubiera, crear cuentas y
  manejar claves/pagos es algo que le toca a Alex, nunca al asistente). Se pega tal cual en
  el panel web de Cloudflare — ver el reporte para los pasos exactos.

**Protección contra abuso/costo si alguien encuentra la URL pública del Worker (el sitio en
GitHub Pages es público):** el Worker compara el header `Origin` de la petición contra
`ALLOWED_ORIGIN` (el origen real de la app de Alex) y rechaza con 403 si no coincide —
protege contra scripts de otras páginas, pero un cliente que no es un navegador (`curl`,
etc.) puede falsear ese header. Como respaldo real, el Worker lleva un contador diario en
Workers KV (`DAILY_LIMIT`, 200 por defecto) que acota el costo máximo posible por día sin
importar quién esté llamando. Simplificación a propósito: el contador sube incluso si
Anthropic respondió con un error (más simple que distinguir causas; el límite es un
respaldo de costo, no una medición exacta). El modelo y `max_tokens` que manda el cliente
nunca se usan tal cual -- el Worker los vuelve a acotar él mismo (defensa en profundidad).

**Las burbujas de chat insertan el texto del modelo con `innerHTML`, igual que el patrón ya
auditado en D10** (siempre pasado por `App.Util.escaparHTML` antes de interpolarse) — el
hook de seguridad de este entorno marca cualquier `innerHTML` como advertencia genérica,
pero este caso ya sigue la misma mitigación que el resto de la app, no es código nuevo sin
revisar.

**Verificado en este entorno (sin Worker real desplegado):** los 94 tests (11 nuevos) pasan
con `./tests/run-tests.sh`; serví la app local con `python3 -m http.server` y probé en
navegador el flujo completo: estado "no configurado", activar en Ajustes, elegir escenario,
saludo inicial + TTS, error real de CORS al llamar a una URL de prueba que no existe (con
mensaje y botón Reintentar), y el camino feliz completo sustituyendo `App.IA` por una
respuesta simulada (la burbuja del asistente se pinta, se habla por TTS, y Terminar registra
la sesión -- se vio el XP/racha/nodo de Inicio actualizarse correctamente). Encontré y
arreglé en el camino un bug real de la UI: reintentar tras un error duplicaba la burbuja del
usuario y contaba el intento dos veces hacia XP/racha -- ya corregido (el reintento ya no
vuelve a pintar la burbuja ni a incrementar `intentos`).

**Lo que NO se pudo verificar aquí (le toca a Alex, con su propio Worker desplegado):**
el comportamiento real contra la API de Anthropic (una clave válida, límites reales,
tiempos de respuesta), el CORS real del Worker (aquí solo se vio el error esperado contra
una URL que no existe), y -- como con Habla -- el micrófono/reconocimiento de voz real en su
iPhone (`requiere_prueba_iphone: true`).

**No tocado (fuera de alcance de esta tarea):** no se instaló Node ni ningún paquete dentro
de este proyecto (el stack sigue siendo 100% vanilla, D1/D5 sin cambios); nota aparte para
Alex: en esta misma sesión SÍ se instaló Node globalmente en la Mac, pero para una tarea
distinta y sin relación con este proyecto (unos skills de Claude Code) -- la frase "esta Mac
no tiene Node instalado" en `CLAUDE.md` de este proyecto ya no es exacta como hecho, aunque
la decisión de D1 sigue siendo válida por sus propias razones (ligereza, reversibilidad),
no solo porque Node faltara.

## D25. Renombre a "Rumbo" y escala de nivel abierta (A1-C2, sin tope en B2)
Alex pidió explícitamente que la app dejara de llamarse "English B2" / "Inglés B2" y que la
escala de nivel ya no tratara B2 como meta o tope -- pensando en seguir usando la app después
de llegar a B2, y en agregar otros idiomas más adelante (empezando por japonés, no construido
todavía, ver `REPORTE_CALCOMANIAS.md`).

- **Nombre:** `data/config.json` gana `nombreApp: "Rumbo"` (y `idiomaVisible`, ya existía).
  `js/app.js` lo lee una sola vez al iniciar y rellena `document.title`, el meta
  `apple-mobile-web-app-title` y el logo de la barra de navegación ("Rumbo." -- el punto es
  parte del logotipo). **Excepción real, no un olvido:** `manifest.webmanifest` es estático y
  el sistema operativo lo lee antes de que corra cualquier JS, así que su `name`/`short_name`
  quedaron con "Rumbo" escrito a mano en el archivo -- si el nombre cambia otra vez en
  `config.json`, el manifest hay que actualizarlo aparte.
- **Escala abierta:** `js/core/avance.js` (nuevo, puro, sin DOM, 14 pruebas) convierte
  (nivel CEFR, % dentro del nivel) en un número continuo A1=0..C2=5, y combina los números de
  varias habilidades en un nivel global ponderado (lectura>habla>escritura>escucha -- el orden
  exacto de escritura frente a escucha no lo daba `PROMPT_BASE.md`; "también débil" la pone
  más cerca de habla que de escucha, decisión razonada, no un dato). **Separado de
  `App.Diagnostico` a propósito:** el diagnóstico real (`construirResultado`/
  `evaluarHabilidad`) se queda EXACTAMENTE como estaba, sigue midiendo hasta B2 -- no hay
  contenido más allá de B2 todavía (ver D-siguiente), así que no tendría caso hacerlo evaluar
  C1/C2 sin preguntas de esos niveles. Un resultado "B2 completo" en el diagnóstico se muestra
  como "B2+" en vez de "B2" a secas.
- **Nada en la interfaz presenta B2 como tope:** se quitó `FECHA_OBJETIVO`/"días restantes
  para marzo"/"% hacia B2" de Progreso; las pastillas de nivel ahora son simplemente el nivel
  CEFR real de cada habilidad, sin comparar contra una meta fija. La meta personal de Alex (B2
  en marzo de 2027) sigue existiendo, pero solo como dato opcional en `config.json`
  (`metaPersonal`), nunca mostrado en la interfaz.
- **Contenido sigue siendo A1-B2 por ahora** (ver D-siguiente para los volúmenes reales); el
  motor de plan y de progreso ya soportan C1/C2 desde ya (son solo niveles más en la escala de
  `avance.js`), así que el día que Alex agregue contenido de esos niveles, no hace falta tocar
  ni `plan.js` ni `avance.js` -- se anota en `REPORTE_CALCOMANIAS.md` que falta ese contenido.

## D26. Ruta guiada: `js/core/plan.js`, pantalla Practicar, tope de 15 tarjetas nuevas/día
Alex reportó que a veces no sabe qué estudiar y eso lo frena -- cambio de modelo de uso
completo: la app decide qué toca hoy, en orden, sin que Alex elija. Si quiere practicar algo
específico, existe la pantalla aparte Practicar.

- **`js/core/plan.js`** (nuevo, puro, sin DOM, 15 pruebas + 5 de integración en
  `tests/integracion.html` contra IndexedDB real): calcula la ruta guiada del día a partir del
  contexto real (tarjetas SM-2 vencidas/nuevas, nivel CEFR por habilidad del último
  diagnóstico, última práctica por habilidad, minutos de hoy, meta diaria). Reglas: sin
  diagnóstico hecho, el plan es solo Diagnóstico; repaso primero, con tope real de **20
  tarjetas vencidas por sesión y 15 tarjetas NUEVAS por día** (antes una sola sesión de repaso
  podía traer 115+ tarjetas de golpe -- ver D20, nunca se había puesto un tope); después,
  bloques por habilidad rotando hacia la que tenga menor nivel y más días sin practicar
  (desempate con la prioridad de `PROMPT_BASE.md`: lectura>habla>escucha), sin repetir la
  misma habilidad dos días seguidos si hay alternativa; escritura se agrega aparte "cada vez
  que haya tiempo" (es débil); conversación con IA un día configurable a la semana
  (`config.json: diaConversacionSemana`); mini-reevaluación cada 4 semanas (configurable,
  `semanasEntreReevaluacion`) reutilizando la pantalla de Diagnóstico (construir un
  cuestionario corto aparte era más trabajo del que alcanzaba esta fase -- simplificación
  consciente, no un olvido); si Alex faltó días, NO se acumulan atrasos (las tarjetas vencidas
  ya cubren lo atrasado, con el tope de arriba); el plan es determinista y se calcula una sola
  vez por día, se guarda en un store nuevo de IndexedDB (`"plan"`, `DB_VERSION` 1→2, migra
  sola) para no cambiar si Alex recarga la página, y se marca qué pasos se completaron.
- **Practicar algo específico nunca modifica el plan ya guardado de hoy** -- solo cuenta para
  XP, minutos y "última práctica" de la habilidad (la rotación del día siguiente sí lo tiene
  en cuenta). `registrarSesion` gana un parámetro opcional `habilidad` para que esto funcione
  (Habla/Lectura/Escucha/Escritura lo mandan; Repaso/Conversación no, porque no son una sola
  habilidad).
- **Flujo "Empezar"/"Continuar"** (en Inicio, `js/screens/inicio.js`): al tocar el botón se
  guarda en `localStorage` (`rumboFlujoEnCurso`) qué paso se está por iniciar y se navega a
  esa pantalla; cuando Alex vuelve a Inicio (todas las pantallas ya navegan a `#/inicio` al
  terminar), Inicio nota el marcador pendiente, marca ese paso completado y muestra "¡Listo!
  Siguiente: …" o el cierre del día -- vive como un estado propio de Inicio (no como una
  pantalla aparte en el router) para no complicar cada pantalla existente con la obligación de
  avisar "terminé un paso del plan". Se puede salir y retomar en el paso donde se quedó (el
  marcador persiste).
- **Barra "Paso N de M" arriba de la pantalla actual** mientras se sigue la ruta guiada
  (`js/app.js: actualizarBannerPlan`, no en cada pantalla, mismo criterio que el punto
  anterior): lee el mismo `localStorage` + el plan guardado, se muestra solo si la ruta actual
  coincide con la del paso en curso -- nunca en Inicio/Practicar ni en una pantalla visitada
  fuera del flujo.
- **"Tu camino" (Inicio) cambia de significado:** ya no es un stepper de "qué hacer hoy" (eso
  ahora es "Tu ruta de hoy", las calcomanías numeradas del plan) -- es el progreso real de
  Alex en la escala A1→C2 (6 nodos, `App.Avance`), con un marcador de estrella que se
  posiciona con fracciones entre nodos y una pastilla "NN% hacia el siguiente nivel". Nunca un
  mapa de ruta serpenteante tipo Duolingo -- explícitamente descartado por Alex.
- **Pantalla Practicar** (`js/screens/practicar.js`, nueva): cuadrícula de las 4 habilidades
  con su nivel CEFR real y última práctica; Lectura/Escucha/Habla/Escritura llevan a su propia
  pantalla (las 4 ya existen, ver D27); además, filas para Repaso de tarjetas y Conversación.
  No tiene ítem propio en la barra de navegación -- mientras Alex está ahí (o en
  Habla/Conversación/Lectura/Escucha/Escritura), el ítem activo sigue siendo Inicio
  (`js/app.js: RUTAS_SIN_TAB_PROPIA`).

## D27. Diseño "Calcomanías oscuro" (celular y laptop) + animaciones
Rediseño visual completo pedido y aprobado por Alex de antemano (spec exacta dada por él, no
reinterpretada) -- reemplaza por completo el rediseño anterior "cuaderno de bitácora" de la
rama `rediseno` (D13/D16-D23), que queda documentado ahí pero ya no es el diseño vigente.
Detalle completo pantalla por pantalla, capturas antes/después y qué skill motivó cada cambio
en `REPORTE_CALCOMANIAS.md` (más `docs/design-review/calcomanias/`) -- aquí solo el resumen
de las decisiones que vale la pena que quede en este archivo:

- **Solo modo oscuro por ahora** (paleta `--bg #12122A`/`--surface #1E1E3F`/`--tinta #0B0B1E`
  + 6 acentos: amarillo/menta/rosa/coral/azul/crema), pero todo con variables CSS para poder
  agregar claro después -- el selector Claro/Oscuro/Sistema de Ajustes sigue ahí y funciona,
  solo que Claro y Sistema dan la misma paleta oscura por ahora (anotado, no es un bug).
- **Tipografía Bricolage Grotesque** (variable, pesos 500-800), autohospedada en
  `assets/fonts/` (SIL OFL, sin CDN) -- reemplaza Libre Franklin/JetBrains Mono del rediseño
  anterior, que quedaron en `assets/fuentes/` sin referenciar (no se borraron, por si algo más
  los necesita; limpieza pendiente si Alex confirma que no).
  **Lenguaje visual "calcomanía":** borde 2.5px `--tinta`, sombra dura SIN blur (el CTA
  principal con sombra coral en vez de negra), radios 16-32px, rotación ligera (`--r`, -1.5° a
  1.2°) -- excepto las tarjetas grandes de contenido en laptop, que van sin rotación para
  alinear con las columnas (`.sin-rotacion`). Superficies oscuras (tarjetas internas, inputs,
  burbujas) sin sombra dura. Íconos propios en `js/core/iconos.js` (stroke 2.2, redondeado;
  `ajustes` pasó de engranaje a sliders, nuevos `habla`/`practicar`/`estrella`/`chevron`).
- **REGLA DE LAPTOP:** en ≥900px el contenido debe abarcar la pantalla, columnas que se
  estiran a la misma altura (`align-items:stretch`, `minmax(0,1fr)` en vez de `1fr` solo en
  grids -- sin esto, una columna puede desbordar su contenedor con el `min-content` de su
  texto, bug real encontrado y corregido más de una vez). Sidebar 240px + `main` con
  `padding:40px 56px`, título 42px, hasta 1500px de ancho de contenido centrado a 1920px.
- **Animaciones con intención** (no decorativas): solo `transform`/`opacity`, tokens únicos
  (`--ease-pop`, `--ease-out`, duraciones) en un solo bloque del CSS, `prefers-reduced-motion`
  respetado globalmente (colapsa cualquier animación/transición a ~0, cubre todo lo nuevo
  automáticamente). Volteo 3D de la tarjeta de Repaso al revelar la traducción; tarjeta que
  "vuela" al calificar; sombra dura que se "aplasta" al presionar un botón; sol de racha
  girando lento (28s) con pulso al cumplir la meta; marcador de estrella deslizándose a su
  posición en "Tu camino"; ondas pulsantes en el micrófono de Habla/Conversación; chips de
  resultado en cascada; barras que se llenan con `scaleX` + números que cuentan hacia arriba.
- **Verificado, no solo construido:** contraste real medido (≥4.5:1 `--tinta` sobre los 6
  acentos, confirmado en cada pantalla), tamaños táctiles ≥44px medidos (no asumidos),
  overflow real medido con `scrollHeight`/`clientHeight` en los tamaños pedidos
  (390×844/1440×900, spot-check 1280×720/1920×1080) -- varios bugs reales de desborde y de
  layout se encontraron y corrigieron así, nunca solo mirando una captura (el caché del
  navegador de Playwright en esta sesión fue agresivo de verdad: más de una captura "vieja"
  parecía tener un bug que el código real ya no tenía).

## D28. Calcomanías 2: contenido por nivel, ruta guiada robusta, lluvia, accesibilidad e i18n (rama `calcomanias-2`)
Detalle por tarea en `REPORTE_CALCOMANIAS_2.md`. Decisiones que no se deducen del código:
- **Selección por nivel (`App.Avance.elegirPorNivel`):** usa el nivel exacto; si no hay contenido, baja al más cercano **por debajo**; nunca sube a uno más difícil (antes un A1 sin contenido A1 caía a B1/B2). Con nivel B2+ sin contenido C1/C2 se reutiliza B2 y el plan deja una advertencia. C1/C2 queda sin contenido a propósito (solo 10 tarjetas y 3 frases de Habla C1 sueltas).
- **Topes reales de Repaso:** `armarColaRepaso` topa vencidas a 20 (las más atrasadas primero) y nuevas a 15/día descontando las ya introducidas hoy; las falladas vuelven a la cola sin gastar cupo; las nuevas se ordenan por cercanía al nivel.
- **Plan provisional:** el plan "solo Diagnóstico" se recalcula en cuanto hay diagnóstico (antes se quedaba todo el día). Siempre entra al menos un bloque de lectura/habla/escucha, aunque el repaso llene la meta.
- **Terminar vs. salir:** terminar un paso (botón Terminar / resultado) lo marca hecho y vuelve a Inicio; salir por la navegación o con **Esc** NO lo marca (queda pendiente). El marcador es por **tipo** de paso, no por posición.
- **Lluvia de calcomanías:** al subir de nivel de XP o de CEFR y al cerrar el día; 30 piezas, solo `transform`/`opacity`, `pointer-events:none`, con movimiento reducido solo queda el mensaje.
- **Animaciones:** barras con `scaleX` (no `width`), estrella de "Tu camino" con pop (no `left`). Excepciones aceptadas: `dibujar-palomita` (stroke-dashoffset) y transiciones de `box-shadow` de botones (150 ms).
- **Accesibilidad:** opciones A–D con `role=radio`/`aria-checked` dentro de `radiogroup`; sol de racha `role=img` con aria-label; Esc vuelve a Inicio salvo escribiendo en input/textarea/select. Contraste y objetivos ≥44px medidos con script/Playwright.
- **i18n:** cero texto de interfaz hardcodeado en `js/screens` y `js/app.js` (lo vigila `scripts/buscar_texto_hardcodeado.py` desde `run-tests.sh`); excepciones marcadas con `i18n-ok`. `js/core/conversacion.js` (`mensajeError`) sigue con texto en el core.
- **Validadores:** `scripts/validar_contenido.py` (esquema, ids únicos, mínimos por nivel) corre dentro de `run-tests.sh`.

---
*(Esta lista se sigue actualizando conforme avanzan las fases.)*
