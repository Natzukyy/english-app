# REPORTE_CALCOMANIAS.md — rediseño "Calcomanías oscuro" + ruta guiada + Rumbo

Rama `calcomanias`, creada desde `rediseno` (que queda intacta). 18 commits propios de esta rama (ver `git log rediseno..calcomanias`). 135/135 pruebas en verde en todo momento. Nunca se tocó `App.Diagnostico`/`App.Racha`/`App.XP`/`App.SRS` ni los datos existentes. Nunca se hizo push ni se desplegó nada. Capturas: 64 archivos en `docs/design-review/calcomanias/` (390×844, 1440×900, spot-checks en 1280×720/1920×1080).

## Resumen de lo pedido vs. lo hecho

1. **Diseño "Calcomanías oscuro" en celular y laptop** — hecho, las 10 pantallas (7 existentes + Practicar/Lectura/Escucha/Escritura nuevas).
2. **Modelo de uso guiado** (la app dice qué estudiar, pantalla Practicar aparte) — hecho.
3. **Contenido que falta para que la ruta funcione** — hecho parcialmente, con honestidad sobre lo que falta (ver sección Contenido).
4. **Animaciones como parte del diseño** — hecho, ver sección Animaciones.
5. **Nombre "Rumbo" + escala CEFR abierta (A1-C2, sin tope en B2)** — hecho.

## Fase A — Diseño

### Fundamentos (commit `60d7e26`)
Paleta exacta del spec (`--bg #12122A`, `--surface #1E1E3F`, `--tinta #0B0B1E`, `--sombra #070714`, 6 acentos amarillo/menta/rosa/coral/azul/crema). Tipografía **Bricolage Grotesque** (variable, pesos 500-800) autohospedada en `assets/fonts/` (SIL OFL, `.woff2`, sin CDN) — confirmado cargando con `document.fonts`. Lenguaje "calcomanía": borde 2.5px tinta, sombra dura sin blur, radios 16-32px, rotación `--r` (laptop: tarjetas grandes sin rotación, `.sin-rotacion`). Íconos nuevos/reemplazados en `js/core/iconos.js`: `ajustes` pasó de engranaje a sliders (pedido explícito), nuevos `habla` (burbuja+ondas), `practicar` (diana), `estrella`, `chevron`. Nav inferior (celular, píldora amarilla) y barra lateral (laptop, 240px, relleno amarillo) con el logo "Rumbo." Contraste `--tinta` sobre los 6 acentos medido: 6.93:1 a 17.5:1, todos ≥4.5:1.

### Las 10 pantallas
Cada una con su propio commit, 2 vueltas de autocrítica con Playwright (contraste real medido, tamaños táctiles ≥44px medidos, overflow real medido con `scrollHeight`/`clientHeight`, nunca solo mirando una captura — el caché del navegador de Playwright en esta sesión fue agresivo de verdad, confirmado muchas veces; la forma confiable de verificar fue abrir un `browser.newContext()` genuinamente nuevo antes de cada tanda):

- **Repaso** (`aadf8d8`): tarjeta crema con volteo 3D real al revelar la traducción, calificación 2×2 (coral/amarillo/menta/azul), atajos de teclado en laptop (Espacio, 1-4). *Bug real que encontré y arreglé yo mismo*: la traducción se duplicaba (una vez en la tarjeta, otra vez como texto tenue arriba de "¿Qué tal te fue?") — `e946770`.
- **Diagnóstico** (`24352e5`): opciones A-D en círculo, atajos de teclado (A-D, Enter), filete-pregunta tipo nota al margen (el hook de diseño lo marcó como falso positivo de "side-tab accent border"; evaluado y suprimido con razón documentada, heredado de `rediseno`).
- **Progreso** (`cc322fb`): tarjeta Nivel/Racha/Esta semana, barras por habilidad con su propio color. Quitó el lenguaje de "B2 como tope" (`FECHA_OBJETIVO`, "% hacia B2") — la fórmula real de cálculo de nivel no se tocó aquí, eso es de `App.Avance` (Fase B).
- **Ajustes** (`c2b4052`): cuadrícula de 2 columnas, sin scroll a 1440×900 (medido). Stepper de meta, selector de voz, segmentado de tema.
- **Habla** (`0e2529f`) y **Conversación** (`ce05c2b`): micrófono coral con ondas reales, burbujas con botón de escuchar pulido.
- **Inicio** (`0d4b2a4` + fix mío `8ebd16f`): ver Fase B.

## Fase B — Motor de plan guiado (commit `0bc0def` + extensiones)

- **`js/core/plan.js`** (puro, sin DOM, 15 pruebas + 5 de integración en `tests/integracion.html`): arma la ruta del día. Repaso primero (tope real: **20 tarjetas vencidas/sesión, 15 tarjetas NUEVAS/día** — antes una sola sesión podía traer 115+ de golpe, nunca había tope); rota hacia la habilidad con menor nivel y más días sin practicar (lectura>habla>escucha como desempate); escritura aparte "cuando hay tiempo"; conversación un día configurable a la semana; mini-reevaluación cada 4 semanas (reutiliza Diagnóstico); atrasos no se acumulan; determinista, se guarda una vez por día en IndexedDB (store nuevo `"plan"`, `DB_VERSION` 1→2).
- **`js/core/avance.js`** (puro, 14 pruebas): escala abierta A1=0..C2=5 con fracciones, nivel global ponderado. Separado de `App.Diagnostico` a propósito — el diagnóstico real sigue igual, mide hasta B2.
- **Inicio guiado**: saludo + sol de racha + meta compacta; tarjeta amarilla "HOY TE TOCA" con sombra coral; "Tu ruta de hoy" (calcomanías numeradas, máx. 5); botón secundario "Practicar algo específico"; "Tu camino" ahora es el progreso real en A1→C2 (6 nodos + estrella con fracciones + "NN% hacia el siguiente nivel"), nunca un mapa de ruta tipo Duolingo. *Corregido por mí*: 10px de overflow real en móvil (`8ebd16f`).
- **Flujo Empezar → pasos en secuencia**: `localStorage` guarda qué paso está en curso; al volver a Inicio, se marca completado y se muestra "¡Listo! Siguiente: …" o el cierre del día (racha/minutos/XP + "mañana un plan nuevo te espera").
- **Barra "Paso N de M"** arriba de cualquier pantalla de paso — *pieza que faltaba del spec, la implementé yo mismo* (`7e0b551`) después de revisar que ninguna de las 4 pantallas de pasos la mostraba. Vive en el shell (`js/app.js`), no en cada pantalla; verificada en vivo con un plan simulado.
- **Pantalla Practicar** (`8ebd16f`): cuadrícula 2×2 (celular) / fila de 4 (laptop) por habilidad, con nivel CEFR real y última práctica. No tiene ítem propio en el nav — resalta Inicio mientras se usa.

## Fase C — Pantallas nuevas y contenido

### Lectura (`06fd08d`)
Pantalla: texto + tiempo de lectura estimado + vocabulario tocable (subrayado punteado azul, panel con término→traducción) + preguntas A-D + resultado. Laptop: texto fijo a la izquierda (se puede releer), preguntas a la derecha. Contenido: `lecturas.json` de 12 → **24 textos (8/8/8 por nivel A2/B1/B2)**, temas nuevos de día a día/viajes/servicios/opiniones (los 12 originales eran solo comunicación profesional). Esquema de `vocabularioClave` cambiado a `{termino, traduccion}` en las 24 lecturas. *Bug de datos preexistente encontrado y corregido*: una pregunta de lectura tenía la respuesta correcta mal indexada.

### Escucha (`f55726a`)
Pantalla: nada suena al entrar (botón "Escuchar" + "Escuchar más despacio"), preguntas se habilitan solo después de escuchar al menos una vez, transcripción visible solo DESPUÉS de responder. `App.TTS.hablar(texto, idioma, velocidad)` ganó un tercer parámetro opcional (cambio aditivo, no afecta a Habla/Diagnóstico/Conversación). Contenido: `escucha.json` nuevo, **24 guiones (8/8/8)**, diálogos/monólogos sin repetir temas de Lectura.

### Escritura (`6b187f3`)
Pantalla: consigna + textarea (botón deshabilitado hasta escribir algo) → lista de verificación de autoevaluación + respuesta modelo (visibles solo después). Corrección opcional por IA si Conversación con IA (D24) ya está activada y configurada — oculta igual que hace `conversacion.js` si no lo está. "Correcta" para XP = ≥50% de la lista de verificación marcada por el propio Alex. Contenido: `escritura.json` nuevo, **30 consignas (10/10/10)**.

Las 3 pantallas quedaron habilitadas en Practicar (ya ninguna dice "Próximamente"; con Habla, las 4 habilidades funcionan de verdad) y registradas en `index.html`/`sw.js` (precache, `CACHE_VERSION` subió varias veces, ver D15).

## Contenido — volúmenes reales (honestidad, no inflado)

| Archivo | Antes | Ahora | Meta del encargo | ¿Se alcanzó? |
|---|---|---|---|---|
| `lecturas.json` | 12 | **24** (8/8/8) | 8 por nivel A2/B1/B2 | ✅ completa |
| `escucha.json` | 0 | **24** (8/8/8) | 8 por nivel | ✅ completa |
| `escritura.json` | 0 | **30** (10/10/10) | 10 por nivel | ✅ completa |
| `habla.json` | 24 | **123** (40/40/40 + 3 C1 viejos) | 40 por nivel | ✅ completa (habilidad con énfasis explícito de Alex) |
| `vocabulario.json` | 60 | **125** (A2:44, B1:43, B2:28, C1:10) | ~150 por nivel | ⚠️ parcial — A2 pasó de casi vacío (4) a 44, pero lejos del ideal de 150/nivel |
| `frases_utiles.json` | 55 | **103** (12 categorías) | ~150 por nivel (combinado con vocabulario) | ⚠️ parcial, mismo motivo |
| **Tarjetas de repaso totales** (vocabulario+frases) | **115** | **228** | ~450 (150×3 niveles) | ⚠️ casi el doble, no el ideal completo |

El tope de 15 tarjetas nuevas/día de `App.Plan` ya hace que el volumen actual no sea un bloqueante de uso diario — Alex no se va a quedar sin qué repasar, solo va a repetir contenido con más frecuencia de la ideal hasta que se amplíe más. Queda como trabajo futuro claro, no una promesa rota: alcanzar ~150/nivel en vocabulario y frases útiles.

**C1/C2**: sin contenido todavía en ningún archivo (el encargo pedía A1-B2 "por ahora"). El motor de plan/progreso ya soporta esos niveles (`App.Avance`); si Alex sube de nivel antes de que haya contenido, `App.Plan` reutiliza B2 (documentado en D25).

## Animaciones implementadas

Todas con `transform`/`opacity` únicamente, tokens en un solo bloque de `css/styles.css` (`--ease-pop`, `--ease-out`, duraciones), `prefers-reduced-motion` respetado globalmente (una sola regla colapsa cualquier animación a ~0, cubre todo lo nuevo sin tener que repetirla pantalla por pantalla):

- Calcomanías con "pop" escalonado al entrar (Practicar, Inicio).
- Botones con sombra dura que se "aplastan" al presionar (`.calcomania-presionable:active`).
- Volteo 3D de la tarjeta de Repaso + vuelo lateral al calificar.
- Sol de racha girando lento (28s, lineal) — infraestructura lista desde Fase A, conectado en Inicio.
- Marcador de estrella deslizándose a su posición en "Tu camino" al cargar.
- Barras de progreso llenándose con `scaleX`, números contando hacia arriba (`animarNumero`/`animarBarra`).
- Ondas pulsantes en el micrófono (Habla, Conversación).
- Chips de resultado en cascada (Habla).
- Palomita dibujándose al completar un paso.

**Qué verifiqué yo y qué solo reportaron los forks:** vi con mis propios ojos (capturas y/o medición en vivo) el volteo de Repaso, la barra "Paso N de M", el marcador de estrella en "Tu camino", las ondas del micrófono de Habla (captura "escuchando") y el estado "Reproduciendo…" de Escucha. Las animaciones de movimiento en sí (cascada de chips, palomita dibujándose, vuelo lateral de la tarjeta, sol girando) **no las vi en movimiento**: una captura estática no prueba que anime a 60 fps. Las reportaron los forks y el código/CSS existe, pero queda por confirmar a ojo en un navegador real o en el iPhone.

**No implementado, documentado como pendiente**: la "lluvia corta de calcomanías/formas de colores" específica para subida de nivel y cierre del día (el cierre del día sí tiene su propia tarjeta con pop-in y resumen, pero no el efecto de lluvia descrito en el spec) — decisión mía de priorizar el resto del alcance (las 3 pantallas nuevas + contenido) sobre este detalle de pulido, dado el tiempo disponible. Es un agregado pequeño y autocontenido si Alex quiere que se haga después.

## Decisiones ante ambigüedad (resumen; detalle completo en cada commit y en DECISIONES.md D25-D27)

- Carpeta de fuentes `assets/fonts/` (nombre exacto pedido en el spec), distinta de `assets/fuentes/` que ya usaba el rediseño anterior — ambas coexisten, las viejas (Libre Franklin/JetBrains Mono) quedaron sin referenciar, no se borraron.
- Contenido vive en `data/content/` (inglés, ya era la convención del proyecto) en vez de `data/contenido/` (español, como lo escribió el spec) — para no fragmentar la estructura de datos ya existente.
- "reevaluacion" (mini-reevaluación cada 4 semanas) reutiliza la pantalla de Diagnóstico en vez de un cuestionario corto aparte.
- `manifest.webmanifest` tiene "Rumbo" escrito a mano (no puede leerse de `config.json` en runtime, lo parsea el SO antes de que corra JS).
- Claro/Sistema en Ajustes dan la misma paleta oscura por ahora (modo claro no implementado, solo los tokens están listos para cuando se haga).

## Qué queda pendiente para Alex

1. **Ampliar vocabulario/frases útiles** hacia el ideal de ~150/nivel (ver tabla arriba) — no es urgente, el tope de 15 tarjetas nuevas/día ya evita que sea un problema inmediato.
2. **Contenido C1/C2** — nada todavía; el motor ya lo soporta cuando exista.
3. **Lluvia de calcomanías** en subida de nivel/cierre del día — animación de pulido no implementada, documentada arriba.
4. **Modo claro** — tokens listos, falta definir la paleta clara y conectarla.
5. **Otros idiomas (empezando por japonés)** — fuera de alcance de esta tarea, `DESIGN_REVIEW.md` (del rediseño anterior) ya documentó qué de `data/i18n/` y las rutas de contenido no está listo para eso; sigue sin tocarse.
6. **Revisión de contenido**: todo el contenido nuevo (lecturas, guiones de escucha, consignas de escritura, frases de habla, vocabulario) está marcado `"revisar": true` — es inglés original verificado con cuidado por cada fork, pero el nivel CEFR asignado es una estimación razonada, no una certificación (mismo criterio que ya usaba el proyecto desde D8/D20).

## Cómo verlo en el iPhone

La rama `calcomanias` no está desplegada ni hay push hecho (como se pidió). Para probarlo en el iPhone hace falta que Alex:
1. Revise el resultado localmente primero si quiere (`python3 -m http.server 8000` desde la raíz del proyecto, abrir `http://localhost:8000` en Mac).
2. Decida si fusiona `calcomanias` a `main`/rama de trabajo y, cuando esté listo, **autorice un despliegue** (GitHub Pages u otro -- ver D11 para el precedente de cómo se hizo la última vez) para poder abrirlo en Safari del iPhone y probar de verdad: microphone/reconocimiento de voz en Habla/Conversación, las voces de `speechSynthesis` en Escucha/Habla con el selector de Ajustes, e instalar a pantalla de inicio para ver el nav/safe-area reales en iOS. Nada de esto se desplegó ni se tocó sin su autorización explícita, tal como se pidió.
