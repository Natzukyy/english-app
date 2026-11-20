# REPORTE_CALCOMANIAS_2

Rama `calcomanias-2` (desde `calcomanias`). Sin push, sin despliegue, sin instalar nada global, sin Node. Un commit por tarea; `./tests/run-tests.sh` en verde en cada uno.

## Qué se hizo por tarea
- **T1 – Tarjeta "HOY TE TOCA" aplastada** (`ba1ef7e`): padding, `min-height`, `line-height` y `overflow-wrap` en `.tarjeta-principal`; botón con altura mínima en móvil. Capturas "después" en `docs/design-review/calcomanias-2/`. Las capturas "antes" quedaron incompletas por una interrupción de la sesión.
- **T2 – Cobertura A1** (`6412ee1`, `7bea986`): contenido A1 en lecturas, escucha, escritura, habla y tarjetas. La selección ya no salta a niveles superiores (`elegirPorNivel`); Repaso respeta los topes reales (20 vencidas, 15 nuevas/día).
- **T3 – Más contenido** (`9456144`, `6ebcd05`, `619d4b4`): tarjetas ≥150 en A2/B1/B2, 12 lecturas y 12 escuchas por nivel, validador de contenido dentro de `run-tests.sh`. Sin C1/C2.
- **T4 – Lluvia de calcomanías** (`a3d5c75`): al subir de nivel (XP o CEFR) y al cerrar el día.
- **T5 – Animaciones en movimiento** (`9b2cf86`): ver abajo.
- **T6 – Punta a punta y migración** (`8060b82`, `d889991`, `d1c0243`, `c331469`, `f587dea`): flujo completo, reanudar/practicar, cambio de día, modo sin internet, migración v1→v2 desde noche-1. Bugs reales encontrados y corregidos: plan "solo Diagnóstico" que duraba todo el día; marcador por índice que marcaba Repaso sin hacerlo; Repaso y Habla sin salida; salir por la nav marcaba el paso como hecho; plan sin bloque de habilidad con el repaso lleno.
- **T7 – Accesibilidad y calidad** (`853549c`, `75898f2`): contraste con script, objetivos ≥44px medidos, roles `radiogroup/radio`, aria-label del sol, Esc, SW v27 (48 archivos, todos existen y ninguno queda sin listar), i18n completo en pantallas (160 textos movidos; captura de 79 estados antes/después sin diferencias), "English B2" solo queda en `prueba/index.html`.
- **T8 – Cierre:** este reporte, CLAUDE.md y DECISIONES.md (D28).

## T5: qué se vio y qué no
Visto (fotogramas pausados al 0/25/50/75/100 %, `getAnimations()`, Performance API; Chromium de escritorio, 390×844):
- Hallazgos corregidos: la **sacudida y el pop de acierto del Diagnóstico nunca corrían** (la animación de entrada ganaba por especificidad); la **estrella** animaba `left` y además no corría; barras con `width` → `scaleX`; `sol-pulso` con `box-shadow` → `transform/opacity`; lluvia con piezas a la misma altura y `ease-out`.
- Propiedades animadas: solo `transform`/`opacity`, salvo `dibujar-palomita` (`stroke-dashoffset`) y transiciones de `box-shadow` en botones (150 ms).
- Long tasks: 0. Layout shifts (CLS): 0, en 8 pantallas incluyendo volteo y lluvia.
- `prefers-reduced-motion` emulado: no queda animación corriendo salvo `sol-gira` a 0 ms; la tarjeta principal queda visible; la lluvia no se dibuja y el mensaje sí.
- Count-up de XP observado en curso (0→15 en ~600 ms).

**No verificado:** fluidez a 60 fps y sensación real del movimiento (los fotogramas son pasos pausados, no video); nada de esto en un iPhone.

## Pruebas
- `./tests/run-tests.sh`: **154 pasan, 0 fallan**, más validador de contenido y detector de texto hardcodeado.
- `tests/integracion.html` (IndexedDB real): **18 de 18**.
- Scripts e2e en `tests/e2e/`: flujo-completo, reanudar-y-practicar, cambio-de-dia, offline, animaciones, lluvia, rendimiento, accesibilidad, i18n-snapshot.

## Contenido final (validado por `scripts/validar_contenido.py`)
| Habilidad | A1 | A2 | B1 | B2 | C1 |
|---|---|---|---|---|---|
| Lecturas | 12 | 12 | 12 | 12 | – |
| Escucha | 12 | 12 | 12 | 12 | – |
| Escritura | 10 | 10 | 10 | 10 | – |
| Habla (frases) | 40 | 40 | 40 | 40 | 3 |
| Tarjetas de repaso | 186 | 160 | 161 | 152 | 10 |

## Lo NO verificado
- iPhone real: PWA instalada, 60 fps, safe areas, teclado.
- Micrófono y `SpeechRecognition` reales (en Playwright se simularon).
- VoiceOver y lectores de pantalla (solo se comprobaron roles/atributos, no la experiencia).
- La interfaz en inglés (niveles 1–3): el antes/después de i18n comparó solo español nivel 0.
- La conversación con IA sigue sin desplegarse (Worker de Cloudflare, decisión de Alex).

## Dudas / pendientes para Alex
- El ícono de la app aún no tiene identidad "Rumbo".
- Contenido C1/C2: sin cargar; hoy B2+ reutiliza B2. ¿Se escribe?
- Fuentes viejas sin referenciar en el repo (candidatas a borrar).
- La mini-reevaluación mensual reutiliza el Diagnóstico completo.
- `js/core/conversacion.js` (`mensajeError`) mantiene textos en el core.
- Excepciones de i18n marcadas `i18n-ok`: prompt de IA, saludos en inglés del asistente, frase de prueba de voz.
