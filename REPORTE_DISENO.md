# REPORTE_DISENO.md — rediseño visual de app-ingles

Resumen final del rediseño hecho en la rama `rediseno` (creada desde `noche-1`, que queda intacta). Proceso completo: `DESIGN_REVIEW.md` y `STACK_REVIEW.md` primero, luego las 7 pantallas una por una, cada una con capturas antes/después, dos vueltas de autocrítica con Playwright (contraste real, tamaños táctiles ≥44px, sin scroll donde aplica, `prefers-reduced-motion`) y su propio commit. 13 commits en total, 106/106 pruebas en verde en todo momento — nunca se tocó `js/core/` ni los datos.

## Antes de las pantallas: voz del modelo

No es parte del rediseño visual, pero se hizo en la misma rama a pedido de Alex: `App.TTS` ya no elige voces de novedad (Whisper, Zarvox, Bad News...), prioriza voces naturales (Samantha, Daniel, Karen, Moira, Tessa, Rishi), hay selector de voz en Ajustes, y se quitó toda reproducción automática — el audio solo suena si el usuario toca "Escuchar". 12 pruebas nuevas. Commit `eafd5cb`.

## Investigación: DESIGN_REVIEW.md y STACK_REVIEW.md

Commit `34042e7`. Mundo elegido: **cuaderno de bitácora / fichero de estudio** (nunca mapa de ruta tipo Duolingo — explícitamente descartado). Tipografía Libre Franklin + JetBrains Mono (ambas SIL OFL, alojadas localmente en `assets/fuentes/`, sin CDN). Paleta "Restrained": se abandona el crema+ámbar (cliché #1 de IA genérica según `frontend-design`) por neutrales de papel + acento tinta (`#2f4368`/`#8fa6d1`) que hace trabajo real, y un acento sello (`#9c3b2e`/`#e0897a`) solo semántico. `STACK_REVIEW.md`: seguir en vanilla por ahora — el cuello de botella real para escucha/escritura/C1/japonés está en el contenido y `data/i18n/`, no en el framework.

`taste-skill:design-taste-frontend` se usó solo como inspiración de principios (sin stock look, iconos reales, nunca violeta), nunca su proceso de Node — choca con la decisión D1 del proyecto y es una skill para sitios de marketing, no para una app interna.

## Las 7 pantallas

### Inicio
- **Antes/después**: `docs/design-review/baseline/inicio-*.png` vs `docs/design-review/despues/inicio-{390x844,375x667,1280x720,1440x900}-{claro,oscuro}.png`.
- **Qué cambió**: fundamentos visuales completos (tipografía, paleta, `--radio-objeto`/`--radio-dato`, animación "sello" reemplazando el anillo pulsante infinito, `data/config.json` sacando "Inglés B2" del shell); ficha-resumen compacta en una fila; tarjetas de habilidad más bajas; "Tu camino" de stepper vertical a fila horizontal de 4 nodos.
- **Skills**: `frontend-design` (abandonar el cliché crema+ámbar y la cuadrícula de tarjetas idénticas), `impeccable` Operate (controles familiares, un solo signature move), `animation-vocabulary`/`choreograph` (el sello como único efecto con intención, nunca en loop), `apple-design`/`mobile-native` (safe-area, 44px táctil, `100dvh`).
- **Commits**: `ca89c88` (rediseño + fundamentos), `d7e96b7` (corrección mía: a 1440×900/1280×720 cabía sin scroll pero dejaba medio viewport vacío — se centró verticalmente el contenido solo en laptop).
- **Pendiente**: ninguno. Nota: "Tu camino" se quedó en 4 nodos (Diagnóstico/Repaso/Habla/Conversación) en vez de los 3 que pedía el brief original, para no esconder funcionalidad real ya construida — es un supuesto documentado en `DESIGN_REVIEW.md` sección 7, Alex puede pedir que se reduzca a 3.

### Repaso
- **Antes/después**: `docs/design-review/baseline/repaso-*.png` vs `docs/design-review/despues/repaso-{390x844,1440x900}-{claro,oscuro}{,-calificar}.png` y `repaso-sello-fin-{claro,oscuro}.png`.
- **Qué cambió**: jerarquía real en los 4 botones de calificación ("No la sabía" en rojo-sello, "Difícil" neutro, "Bien"/"Fácil" ganando peso hacia la tinta, "Fácil" con relleno sólido); el confeti de fin de sesión se reemplazó por el mismo sello de "Tu camino"; `.tarjeta-repaso` usa `--radio-objeto` (12px) por ser la única tarjeta física real de la app.
- **Skills**: `emil-design-eng` (jerarquía de peso entre una respuesta mala y una buena, criterio de sombra con intención), `DESIGN_REVIEW.md` sección 2 (la tarjeta como objeto físico real).
- **Commit**: `03f3e4c` (se cortó una vez por límite de uso de la cuenta a mitad de las capturas; se reanudó con el trabajo intacto, no se repitió nada).
- **Pendiente**: ninguno.

### Diagnóstico
- **Antes/después**: `docs/design-review/baseline/diagnostico-*.png` vs `docs/design-review/despues/diagnostico-*-{pregunta,autoevaluacion,resultado,corregido}.png`.
- **Qué cambió**: la pregunta (contenido más importante de cada paso) ganó un filete-nota al margen de 3px en tinta, distinguiéndola del chrome; opciones correcta/incorrecta con fondo tintado 8% + texto semántico (antes solo un borde de 1px); el resultado final usa el mismo sello que Repaso en vez de confeti.
- **Skills**: `DESIGN_REVIEW.md` sección 2 ("sin tratamiento tipográfico para distinguir la pregunta del cuerpo"), `DECISIONES.md` D13 (sin cajas anidadas — de ahí el filete en vez de una caja).
- **Commits**: `964a256` (rediseño), `c93de8d` (corrección mía: el resultado mostraba `vocabulario_gramatica` tal cual, con guion bajo, en vez de "Vocabulario y gramática"), `d0df100` (supresión documentada del falso positivo de `impeccable` sobre ese filete — ver más abajo).
- **Pendiente**: ninguno.

### Progreso
- **Antes/después**: `docs/design-review/baseline/progreso-*.png` vs `docs/design-review/despues/progreso-{390x844,1440x900}-{claro,oscuro}.png`.
- **Qué cambió**: mismo fix de nombres legibles que Diagnóstico; cada barra de progreso ahora carga el color de su propia habilidad (`--punto-lectura/escucha/habla/escritura`) en vez de `--acento` uniforme para las 4 — se agregaron variantes `--punto-*-relleno` porque los tonos originales (pensados para un punto de 8px) caían bajo 3:1 de contraste como relleno de barra grande.
- **Skills**: `DESIGN_REVIEW.md` sección 2 (señalaba exactamente este problema), `dataviz`-equivalente de criterio: color con significado, no decorativo.
- **Commit**: `fcf0a0f`.
- **Pendiente**: ninguno.

### Ajustes
- **Antes/después**: `docs/design-review/baseline/ajustes-*.png` vs `docs/design-review/despues/ajustes-{390x844,1440x900}-{claro,oscuro}.png`.
- **Qué cambió**: casi todo ya venía resuelto por las clases compartidas (`.boton-secundario`, `.campo-texto`) migradas en el commit de fundamentos de Inicio. Se agregó un filete superior sutil entre secciones para darles separación clara (antes todas pesaban igual).
- **Skills**: `impeccable` Operate (controles deben quedarse estándar/reconocibles, no reinventar el patrón de settings — foco en organización, no en forma nueva).
- **Commit**: `ba283ba`.
- **Pendiente**: ninguno.

### Habla
- **Antes/después**: `docs/design-review/baseline/habla-*.png` vs `docs/design-review/despues/habla-390x844-claro-{frase,autoeval,resultado}.png` y `habla-1440x900-oscuro-resultado.png`.
- **Qué cambió**: la frase a pronunciar ganó tratamiento tipográfico propio (coherente con Repaso pero a `--fs-heading`, porque son oraciones completas, no palabras sueltas); los chips de palabra acertada/por revisar dejaron de usar colores de *habilidad* (`chip-lectura`/`chip-habla`, sin relación con el contenido) y pasan a `chip-acierto`/`chip-revisar` con `--exito`/`--error`; los botones de autoevaluación manual ganaron la misma jerarquía correcto/incorrecto que Diagnóstico.
- **Skills**: `DESIGN_REVIEW.md` sección 2 (frase como contenido más importante de la pantalla, sin tratamiento propio).
- **Commits**: `8a3ac74` (rediseño), `144815e` (corrección mía: `#zona-reconocimiento` nunca se vaciaba al terminar, el texto "Escuchando…" se quedaba visible encima del resultado — bug preexistente, no introducido por el rediseño, pero confirmado en una captura real).
- **Pendiente**: ninguno.

### Conversación con IA
- **Antes/después**: `docs/design-review/baseline/conversacion-*.png` vs `docs/design-review/despues/conversacion-390x844-claro-{no-configurado,chat}.png` y `conversacion-1440x900-oscuro-{chat,escenarios}.png`.
- **Qué cambió**: el estado "no configurado" (el que Alex ve hoy de verdad, porque no ha desplegado su proxy) ganó un ícono de candado — se lee como función bloqueada a propósito, no como placeholder olvidado; el botón de escuchar por burbuja se redujo visualmente a 28px con área táctil real de 44px vía `::after`; los 7 chips de escenario ahora miden su propio contenido en vez de estirarse distinto por fila.
- **Skills**: `impeccable` Operate ("familiaridad" es una virtud en el patrón de chat ya aprendido — intervenir MENOS aquí, no rediseñar las burbujas desde cero, criterio explícito de `DESIGN_REVIEW.md` sección 2).
- **Commit**: `79d2157`.
- **Pendiente**: ninguno.

## Detalles técnicos verificados en todas las pantallas

- Contraste medido (no calculado a ojo) en cada color nuevo: todos los pares usados ≥4.5:1, la mayoría >6:1.
- Tamaños táctiles medidos con Playwright: ≥44px en todos los controles interactivos.
- `prefers-reduced-motion`: cubierto globalmente (colapsa duración de animaciones/transiciones a ~0), incluida la animación nueva del sello.
- `sw.js` se actualizó a `v19` (ver D15) y ahora precachea `data/config.json` y las dos fuentes — el modo offline-first sigue intacto con los archivos nuevos.
- Bug de caché del navegador de Playwright en esta sesión (CSS/JS servidos viejos incluso con `reload()`): se volvió más terco conforme avanzaba la sesión; la única forma confiable que encontraron los forks fue abrir una pestaña nueva en `isolatedContext` antes de cada tanda de verificación. No es un problema de la app real, solo de cómo esta sesión de revisión cacheaba.

## Supresión de impeccable

El hook de diseño marcó el filete izquierdo de `.pregunta-diagnostico` como "side-tab accent border" (tell típico de UI genérica hecha con IA). Evaluado contra el patrón real que la regla busca (tarjetas repetidas con borde de acento decorativo): no aplica — es un solo filete tipo cita/nota al margen, documentado en el propio CSS con su razón (D13 + metáfora de bitácora). Se ignoró con `impeccable hooks ignore-value side-tab "*" --file css/styles.css`, scoped solo a ese archivo, con la razón por escrito en `.impeccable/config.json` (commit `d0df100`).

## Qué queda pendiente (fuera de alcance de este rediseño, documentado para cuando Alex decida)

De `DESIGN_REVIEW.md` sección 5, sin tocar a propósito:
- `data/i18n/strings.json` tiene `es`/`en` como propiedades fijas, no un mapa por código de idioma — el mecanismo de "la interfaz pasa de español a inglés según días activos" es un dispositivo pedagógico específico para blanquear inglés, no i18n genérico. Agregar japonés como interfaz necesitaría repensar ese mecanismo completo.
- Las rutas de fetch de contenido (`data/diagnostico/banco.json`, `data/content/fase1/habla.json`) no tienen segmento de idioma — funcionarían para un segundo idioma solo si cada uno vive en su propia carpeta y el código empieza a parametrizar la ruta.
- `lang = "en-US"` sigue hardcodeado en `SpeechRecognition` (`js/screens/habla.js`, `js/screens/conversacion.js`) y como parámetro de `App.TTS.hablar` en las 3 pantallas que lo usan — tendría que volverse configurable por idioma activo.
- Japonés específicamente: costo real de fuente CJK (varios MB, alojable local igual que las fuentes actuales) y posible IME para entrada de texto compuesta — ver `STACK_REVIEW.md`, ninguno de los dos caminos de stack lo resuelve mejor que el otro.

De `STACK_REVIEW.md`: la recomendación es seguir en vanilla; si Alex decide migrar a Vite+Preact más adelante, el plan de 5 pasos completo está en ese documento. No se tocó nada del stack en este rediseño.

Dentro del rediseño mismo: a 1440×900 Inicio ya no se ve vacío, pero no se exploró si vale la pena darle más densidad de contenido real (por ejemplo, un resumen de racha semanal) — por ahora es composición deliberada (centrada), no un hueco sin llenar.
