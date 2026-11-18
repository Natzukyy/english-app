# STACK_REVIEW.md — ¿seguir en vanilla o migrar a Vite + framework?

Esto es solo un análisis. **No se migra nada ahora.** La decisión es de Alex. El rediseño visual de esta rama (`rediseno`) se hace sobre el stack actual (HTML/CSS/JS vanilla, decisión D1), con CSS/tokens/iconos pensados para ser portables sin importar qué se decida después.

## Por qué se escribe esto ahora

El alcance futuro de la app crece: agregar escucha y escritura (fases ya previstas pero sin pantalla propia), subir el nivel meta hasta C1, y posiblemente agregar otros idiomas empezando por japonés. Vale la pena mirar honestamente si el stack actual aguanta ese crecimiento o si conviene migrar, antes de construir más encima.

## El stack actual, con honestidad

**Lo que ya funciona bien y no es gratis perderlo:**
- Cero paso de build: editar y recargar. Sin esto, cada cambio de CSS/JS necesitaría un `vite dev` corriendo, una dependencia más que puede romperse.
- Cero superficie de cadena de suministro: no hay `node_modules`, no hay versiones de paquetes que actualizar o que tengan una vulnerabilidad reportada un día. Para una app personal mantenida sin equipo, esto no es un detalle menor.
- Los `js/core/*.js` (lógica pura: racha, XP, SRS, diagnóstico, i18n) ya están completamente desacoplados del DOM y de cualquier framework — son funciones puras colgadas de `App.*`. Las 94 pruebas (`tests/core/*.test.js`) prueban exactamente esta capa. **Este es el hecho más importante del análisis**: si algún día se migra, esta capa no se toca y las pruebas siguen valiendo — solo se reescribiría `js/screens/*.js` (la UI). El riesgo de migrar ya está acotado por cómo está hecho hoy, independientemente de cuándo se decida.
- Ya existe un service worker hecho a mano (`sw.js`) y un manifest (`manifest.webmanifest`) — la app ya resuelve PWA/offline sin ayuda de un framework.

**Costos reales, ya visibles hoy, que van a crecer:**
- Cada pantalla construye su HTML completo como una sola cadena larga (`el.innerHTML = '<div>...' + ... + '</div>'`) y lo re-pinta entero en cada cambio de estado. Funciona bien a 7 pantallas; en `js/screens/diagnostico.js` (237 líneas) y `js/screens/inicio.js` ya se nota la cadena creciendo. Más pantallas (escucha, escritura) van a repetir el mismo patrón, y cada una vuelve a escribir manualmente el escape de HTML (`escaparHTML`) en cada punto donde se inserta un dato — hoy se hace bien y con disciplina, pero es disciplina manual repetida, no algo que el sistema garantice.
- No hay forma de reusar un patrón de UI (una fila, una tarjeta, un chip) más allá de copiar el fragmento de string de un screen a otro — no hay "componente", solo convención de clases CSS compartidas.
- Nada de esto es un bloqueante hoy. Con 7 pantallas y una lógica de interacción simple (preguntas, calificar, grabar), vanilla todavía alcanza cómodo.

## La alternativa: Vite + un framework ligero

Si se migra, **Preact sobre Svelte o Solid**, por una razón concreta para este caso: Preact tiene una API casi idéntica a React (hooks, JSX opcional), lo que significa máxima disponibilidad de documentación, tutoriales, y asistencia de IA entrenada en ese patrón — relevante porque Alex sigue trabajando esto con Claude Code. Su runtime (~4kb) es el que menos se aleja del espíritu de ligereza de D1. Tiene buen soporte de PWA vía plugins de Vite (`vite-plugin-pwa`), que generaría el manifest/service worker en vez de mantenerlos a mano como hoy. Svelte es técnicamente más elegante (sin runtime, compila a JS directo) pero su modelo mental (compilador, `$:`, stores) es un salto conceptual mayor desde el vanilla actual; Solid es potente pero tiene menos tutoriales/comunidad que React/Preact, lo cual pesa para mantenimiento en solitario a largo plazo.

**Lo que sí mejora con Vite+Preact:**
- Componentización real: una `<TarjetaHabilidad>` o `<FilaProgreso>` se escribe una vez y se reusa, en vez de copiar el patrón de string HTML.
- Actualizaciones de UI más finas (no repintar la pantalla entera en cada clic) — relevante para una futura pantalla de escritura con editor de texto en vivo, donde repintar todo en cada tecla sería notoriamente peor que hoy (hoy no hay ningún campo de texto con edición en vivo salvo el de la URL del worker en Ajustes).
- Tipado opcional (TypeScript) si Alex lo quisiera — hoy no hay ningún tipo, todo es JS suelto con convención de nombres en español.

**Lo que NO mejora, y vale la pena decirlo con la misma honestidad:**
- **Japonés no se resuelve mejor con un framework.** El costo de una fuente CJK (varios MB, hay que alojarla local igual que cualquier fuente, sin CDN) es el mismo en cualquier stack. La entrada de texto con IME (japonés compuesto por conversión) se maneja con los mismos eventos nativos del DOM (`compositionstart`/`compositionupdate`/`compositionend`) sin importar si el `<textarea>` vive en una función vanilla o en un componente de Preact — ningún framework simplifica esto de forma relevante. Si alguien le dijo a Alex que "migrar ayuda con japonés", no es cierto: ayuda a estructurar MÁS pantallas con MÁS estado, no a hablar japonés mejor.
- El riesgo de migrar no es cero: `js/screens/*.js` se reescribe completo (7 archivos hoy, más si se agregan escucha/escritura antes de migrar), y hoy no hay ninguna prueba automática de UI (las 94 pruebas son de `js/core/`, no tocan pantallas) — cualquier regresión visual o de interacción durante la migración se detecta solo a mano, no por CI.

## Reversibilidad

Ambos caminos son reversibles en el papel, pero no al mismo costo. Seguir en vanilla y migrar después: cuesta lo mismo mañana que hoy (la capa `js/core/` no envejece). Migrar y luego arrepentirse: cuesta más, porque para "revertir" habría que volver a escribir `js/screens/*.js` en string-concat otra vez. Por eso la recomendación no es "migra ya para que sea más fácil después" — es lo contrario.

## Recomendación

**Seguir en vanilla (D1) por ahora.** Los puntos de dolor reales para crecer hacia escucha/escritura/C1/japonés están en el **contenido y la estructura de `data/i18n/`** (ver DESIGN_REVIEW.md sección 5), no en la capa de JavaScript. Migrar el framework no resuelve ninguno de esos problemas — solo ayudaría si la complejidad de UI de una pantalla concreta se vuelve genuinamente difícil de mantener a mano (el síntoma concreto a vigilar: una pantalla que necesite actualizaciones finas y frecuentes del DOM, como un editor de escritura con corrección en vivo, donde repintar todo el `innerHTML` en cada tecla sea notoriamente lento o parpadeante).

**Si en el futuro Alex decide migrar**, plan por pasos, nunca de golpe:
1. Instalar Vite (sin tocar nada de la app todavía) y confirmar que `js/core/*.js` se puede importar tal cual desde un entry point de Vite (debería funcionar sin cambios, al ser funciones puras sin DOM).
2. Configurar Vite para servir junto a la app actual (estrategia "strangler fig"): una sola pantalla (la más simple, probablemente Ajustes) se reescribe como componente Preact, el resto sigue en vanilla, montados lado a lado bajo el mismo `index.html` o uno nuevo.
3. Migrar pantalla por pantalla, nunca todas a la vez, verificando cada una a mano (clicks reales, no solo que compile) antes de pasar a la siguiente — igual de disciplina que el proyecto ya exige hoy para los commits del rediseño visual.
4. Agregar `vite-plugin-pwa` al final, cuando ya no quede ninguna pantalla vanilla, y retirar `sw.js`/`manifest.webmanifest` hechos a mano recién ahí, no antes.
5. En cualquier punto de este plan, las 94 pruebas de `js/core/` deben seguir pasando sin modificarse — son la señal de que la migración no rompió la lógica de negocio.
