# REPORTE_HEY — ronda grande en la rama `hey`

Fecha: 2026-11-20. Rama `hey` (sale de `calcomanias-2`). **Sin push, sin despliegue, sin instalar nada.** Un commit por tarea (T1…T7). Decisiones nuevas: **D29–D32** en `DECISIONES.md`.

## Cómo verlo
```
cd /Users/alex/Proyectos/app-ingles
python3 -m http.server 8001
```
Abre `http://localhost:8001`. La primera vez, si algo se ve viejo, recarga sin caché (el service worker ahora es `v30`). Las pruebas: `./tests/run-tests.sh` y `http://localhost:8001/tests/integracion.html` → "Correr todas las pruebas".

## Qué hice por tarea

**T1 — Renombrar a "Hey!"** `data/config.json`, `manifest.webmanifest` (a mano), `<title>`, `apple-mobile-web-app-title`, logo de la barra lateral (el "!" final lleva el amarillo, antes el punto), `CLAUDE.md`, `prueba/`, docs. En ids, claves y rutas es `hey`: las claves de `localStorage` pasaron de `rumbo…` a `hey…` y el respaldo se llama `respaldo-hey-…json`. `grep Rumbo`: solo queda en historia (D25, reportes anteriores, el aviso de renombre en `CLAUDE.md`). Caché del SW subida.

**T2 — Ícono.** Tu SVG tal cual en `assets/icono/hey.svg`; PNG renderizados con Chromium con Bricolage Grotesque 800 cargada: `apple-touch-icon` 180, 192, 512, 512 *maskable* (mismo diseño a 0.8 sobre azul a sangre) y favicon 16/32 + `.ico`; enlazados en `index.html` y el manifest. Sin esquinas redondeadas. Se lee bien a 60 px (comparado ampliado); a 32 px el texto del favicon sube de 27 a **32** (+5) para que "Hey!" no se pierda y el "!" no se corte; el SVG fuente y los PNG grandes quedan en 27.

**T3 — Sistema de avance.** Ver D29. En corto: ventana móvil de 30 respuestas por habilidad y nivel (IndexedDB v3, store `avance`); `fracción = min(1, n/30) × min(1, aciertos/0.80)` en Inicio, Progreso, barras y nivel global; 100 % → "lista para confirmar" (99 %) → paso "Confirma tu nivel de X" (hoy mismo si el plan ya existe, o mañana); aprobar ≥ 70 % con ≥ 8 preguntas sube **solo esa habilidad**; si no, se conservan 15 respuestas y se reintenta a los 7 días; la reevaluación de 4 semanas confirma o sube, **nunca baja** ("Repasa X"). Constantes en un solo lugar (`App.Avance.CONSTANTES`). Lo que decidí (D29): las tarjetas de repaso alimentan **lectura**; habla cuenta solo el primer intento de cada frase; escritura cuenta con la lista autoevaluada a peso 0.5 (muy lenta: sube sobre todo por confirmación/reevaluación).

**T4 — Revisión del contenido.** `docs/revision-contenido.md` (conteos, 15 antes/después, dudas). 1 016 elementos leídos. Hallazgo principal: en **90 preguntas** la opción correcta era la más larga por mucho (contra tu regla de quizzes) → distractores reescritos. Además 10 duplicados (retirados, no borrados: sin huérfanas), 2 niveles, 4 traducciones, 3 modelos de escritura inconsistentes, 2 ambigüedades, 34 reescrituras de naturalidad. No encontré ninguna respuesta correcta mal marcada. Validador nuevo en `tools/validar_contenido.py`.

**T5 — Contenido C1/C2.** Ver D31. A1–C2 completos en las 4 habilidades + banco de confirmación de 180 preguntas.

**T6 — Interfaz en inglés.** Ver D32. 108 capturas en `docs/design-review/hey/`.

**T7 — Pruebas y cierre.** Abajo.

## Conteos (todo pasó)
| Qué | Resultado |
|---|---|
| `./tests/run-tests.sh` (lógica pura) | **181 pasaron, 0 fallaron** (+27 nuevas: avance continuo, confirmación, reintento, global, "nunca baja", plan, tarjetas retiradas) |
| `tests/integracion.html` (IndexedDB real) | **30 / 30** (+12 nuevas: flujo completo, falla y reintento a 7 días, "nunca baja", export/import, **export de la versión anterior**, **migración real v2→v3**, tarjetas retiradas) |
| `tools/validar_contenido.py` | **Contenido OK** |
| `scripts/buscar_texto_hardcodeado.py` | **Sin texto hardcodeado** |
| Tarjetas por nivel (sin las 10 retiradas) | A1 186 · A2 155 · B1 162 · B2 156 · C1 195 · C2 188 |
| Lecturas / escuchas / temas de escritura | 12 por nivel, A1–C2 |
| Habla | 40 por nivel (20 para repetir + 20 abiertas) |
| Banco de confirmación | 180 = 12 por habilidad (lectura, escucha, vocab./gramática) × A2–C2 |
| Diagnóstico | 48 preguntas (sin cambiar cómo califica) |
| Capturas | 108 (12 pantallas × interfaz 1–3 × 3 viewports) |
| e2e en movimiento | la barra pasa por valores intermedios (0 → 0.01 → 0.03 → 0.04) tras una sesión de Lectura; con `prefers-reduced-motion` **cero** animaciones ni transiciones largas (antes el sol de racha seguía girando) |
| Flujo de confirmación de lectura en navegador | plan agrega el paso → 10 preguntas → "¡Nivel confirmado!" → sube a B1, ventana en 0, celebración |

## Decisiones (D29–D32)
- **D29** avance continuo, confirmación y "nunca baja" (con todos los umbrales).
- **D30** renombre e ícono.
- **D31** revisión del contenido, C1/C2, tarjetas retiradas y banco de confirmación.
- **D32** revisión de la interfaz en inglés.
- Contradicción con una decisión vigente, anotada: la regla 8 del plan ("el plan guardado no cambia") ahora tiene **una excepción**: se *agrega* al final el paso de confirmación cuando una habilidad queda lista (no se reordena ni se borra nada).

## Lo que NO pude verificar
- **iPhone real:** el ícono instalado (que iOS no recorte el "!" ni se vea el fondo azul a sangre), el micrófono y el reconocimiento de voz en la **confirmación de habla**, 60 fps de las animaciones, VoiceOver en la pantalla nueva de confirmación. En Playwright simulé el reconocimiento de voz solo en sesiones anteriores; en esta ronda no ejercité la confirmación de habla con voz real (solo que arranca en modo confirmación).
- **Confirmación de habla y de escritura completas** en el navegador (solo comprobé que entran en modo confirmación; la lógica de resultado sí está probada en pruebas unitarias e integración).
- **Calidad real del contenido nuevo:** lo escribí yo; lo valida un script (estructura, balance, símbolos) pero no una persona. Niveles CEFR, traducciones y distractores son mi criterio.
- **Audio real (TTS)** de C1/C2: se ven bien en texto, no los escuché.

## Dudas / cosas que quiero que decidas
1. **Escritura casi no sube sola:** con peso 0.5 hacen falta 60 consignas para llenar su ventana. ¿Quieres peso 1 (30 consignas) o dejarla subir solo por confirmación/reevaluación?
2. **Reevaluación y autoevaluación:** habla y escritura del Diagnóstico son autoevaluación, así que la mini-reevaluación puede *subirlas* por lo que digas tú. ¿Lo dejamos o la reevaluación solo debe usar lo medible (lectura/escucha)?
3. **Con la interfaz en inglés (nivel 3) siguen en español** el tema/consigna/lista de verificación de escritura y los títulos de tema de lectura/escucha (es contenido, ver D32). ¿Los traduzco?
4. **Tarjetas de repaso → lectura:** es mi decisión; la alternativa era una quinta barra de "vocabulario". ¿Está bien?
5. **Español mexicano** (`chamarra`, `recámara`, `platicamos`) lo dejé; y inglés americano/británico mezclados.
6. El **Diagnóstico** sigue midiendo hasta C1 con 48 preguntas (no lo toqué); con C1/C2 reales quizá convenga ampliarlo.
7. Si tu base real de IndexedDB ya está en v2, al abrir la app nueva se migra sola a v3 (probado con una base v2 de prueba, **no** con tus datos reales): conviene hacer **Exportar respaldo** antes de abrirla por primera vez.

## Qué probar en el iPhone
1. Instala de nuevo en pantalla de inicio (el ícono viejo puede quedar en caché; bórrala y vuelve a agregarla) y mira "Hey!" en el ícono y el título.
2. Abre Inicio: la barra "Tu camino" debe mostrar 0 % hacia el siguiente nivel en cada habilidad (las ventanas empiezan vacías).
3. Haz una lectura y revisa Progreso: la barra delgada de la habilidad debe moverse.
4. Para ver la confirmación sin practicar 30 respuestas: en Ajustes exporta, o espera a juntar 30 respuestas de lectura. (En el navegador de escritorio la sembré con la consola.)
5. Micrófono: entra a una confirmación de habla cuando una habilidad esté lista (o prueba Habla normal) y confirma que el micrófono se libera al salir.
6. Pon el iPhone en "Reducir movimiento" y confirma que el sol de racha ya no gira.
