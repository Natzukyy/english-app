# Auditoría de márgenes (D33)

Generada con `tools/auditoria-margenes.js` + `tools/auditoria-md.py`. Umbrales: contenido a ≥ 12 px del borde de su tarjeta (8 px en pastillas y fichas compactas de ≤ 72 px de lado menor, 4 px en insignias de ≤ 44 px con un glifo centrado); texto a ≥ 16 px del borde de la pantalla (móvil); tarjetas hermanas a ≥ 8 px; áreas táctiles ≥ 44 px; sin desbordes. Se mide sin la rotación de ±1° de las calcomanías. 33 estados × 390×844 / 360×740 / 1440×900 × interfaz nivel 0 y 3, con datos sembrados en una base de pruebas aislada.

## Estado inicial (antes de corregir)

805 hallazgos · por regla {'interior': 757, 'hermanas': 42, 'tactil': 6} · por severidad {'media': 221, 'baja': 394, 'alta': 190}

Por pantalla: inicio 289, progreso 72, ajustes 72, celebracion 68, lluvia 68, diagnostico 48, repaso 40, lectura 36, escucha 36, escritura 36, habla 16, practicar 12, confirmacion 12

| Sev. | Regla | Pantalla(s) | Estados | Viewports | Niv. | Selector | Peor medida | Veces |
|---|---|---|---|---|---|---|---|---|
| alta | interior | progreso | progreso-datos, progreso-nivel-maximo, progreso-sin-datos | 1440x900, 360x740, 390x844 | 0,3 | `ogreso > div.progreso-grid-habilidad.pop-entrada-escalonada > div.progreso-tarjeta-habilidad.superficie-oscura` | 0px izquierda (mín 12) | 72 |
| alta | interior | celebracion, inicio, lluvia | celebracion-y-lluvia, inicio-con-confirmacion, inicio-plan-activo (+2) | 360x740, 390x844 | 0,3 | `div.inicio-ruta-hoy > div.ruta-hoy-grid.pop-entrada-escalonada > div.ruta-hoy-paso.ruta-hoy-paso--actual` | 2.4px izquierda (mín 8) | 53 |
| alta | interior | confirmacion, diagnostico, lectura | confirmacion-pregunta, diagnostico-pregunta, diagnostico-pregunta-escucha (+1) | 1440x900, 360x740, 390x844 | 0,3 | `nostico-opciones.pop-entrada-escalonada > button.diagnostico-opcion.superficie-oscura > span.diagnostico-letra` | 3px arriba (mín 4) | 48 |
| alta | interior | celebracion, inicio, lluvia | celebracion-y-lluvia, inicio-plan-activo, lluvia-dia-completo | 360x740, 390x844 | 0,3 | `div.inicio-ruta-hoy > div.ruta-hoy-grid.pop-entrada-escalonada > div.ruta-hoy-paso.ruta-hoy-paso--pendiente` | 2.5px izquierda (mín 12) | 36 |
| alta | interior | inicio | inicio-con-confirmacion, inicio-plan-completado | 360x740, 390x844 | 0,3 | `div.ruta-hoy-grid.pop-entrada-escalonada > div.ruta-hoy-paso.ruta-hoy-paso--hecho > span.ruta-hoy-numero` | 3px arriba (mín 4) | 32 |
| alta | interior | inicio | inicio-con-confirmacion, inicio-plan-completado | 360x740, 390x844 | 0,3 | `div.inicio-ruta-hoy > div.ruta-hoy-grid.pop-entrada-escalonada > div.ruta-hoy-paso.ruta-hoy-paso--hecho` | 2.5px izquierda (mín 12) | 22 |
| alta | interior | repaso | repaso-reverso | 360x740, 390x844 | 0,3 | `talla-vista.pantalla-repaso > div.repaso-cuerpo > div#panel-calificar.repaso-panel-calificar.superficie-oscura` | 0px abajo (mín 12) | 16 |
| alta | interior | practicar | practicar | 1440x900, 360x740, 390x844 | 0,3 | `div.practicar-grid.pop-entrada-escalonada > button.practicar-tarjeta.calcomania > span.practicar-pastilla` | 2px arriba (mín 4) | 12 |
| media | interior | celebracion, inicio, lluvia | celebracion-y-lluvia, inicio-con-confirmacion, inicio-plan-activo (+3) | 1440x900, 360x740, 390x844 | 0,3 | `div.pantalla-vista.pantalla-inicio-guiada > div.tarjeta-meta.superficie-oscura` | 6px arriba (mín 12) | 72 |
| media | interior | ajustes | ajustes, ajustes-import-invalido | 1440x900, 360x740, 390x844 | 0,3 | `stes-grid.pop-entrada-escalonada > div.ajustes-tarjeta.superficie-oscura > div#botones-tema.ajustes-segmentado` | 4px arriba (mín 8) | 48 |
| media | hermanas | celebracion, inicio, lluvia | celebracion-y-lluvia, inicio-con-confirmacion, inicio-plan-activo (+2) | 360x740, 390x844 | 0,3 | `arjeta-meta.superficie-oscura  ↔  div.pantalla-vista.pantalla-inicio-guiada > div.tarjeta-principal.calcomania` | 2px entre tarjetas | 20 |
| media | interior | celebracion, inicio, lluvia | celebracion-y-lluvia, inicio-con-confirmacion, inicio-plan-activo (+2) | 360x740 | 0,3 | `div.pantalla-vista.pantalla-inicio-guiada > div.tarjeta-principal.calcomania` | 8px abajo (mín 12) | 20 |
| media | hermanas | celebracion, inicio, lluvia | celebracion-y-lluvia, inicio-plan-activo, lluvia-dia-completo | 390x844 | 0,3 | `↔  div.inicio-ruta-hoy > div.ruta-hoy-grid.pop-entrada-escalonada > div.ruta-hoy-paso.ruta-hoy-paso--pendiente` | 4px entre tarjetas | 6 |
| media | hermanas | celebracion, inicio, lluvia | celebracion-y-lluvia, inicio-plan-activo, lluvia-dia-completo | 390x844 | 0,3 | `↔  div.inicio-ruta-hoy > div.ruta-hoy-grid.pop-entrada-escalonada > div.ruta-hoy-paso.ruta-hoy-paso--pendiente` | 4px entre tarjetas | 6 |
| media | hermanas | inicio | inicio-plan-completado | 360x740, 390x844 | 0,3 | `perficie-oscura  ↔  div.pantalla-vista.pantalla-inicio-guiada > div.tarjeta-principal.tarjeta-principal--lista` | 2px entre tarjetas | 4 |
| media | hermanas | inicio | inicio-con-confirmacion | 390x844 | 0,3 | `al  ↔  div.inicio-ruta-hoy > div.ruta-hoy-grid.pop-entrada-escalonada > div.ruta-hoy-paso.ruta-hoy-paso--hecho` | 4px entre tarjetas | 2 |
| media | hermanas | inicio | inicio-con-confirmacion | 390x844 | 0,3 | `o  ↔  div.inicio-ruta-hoy > div.ruta-hoy-grid.pop-entrada-escalonada > div.ruta-hoy-paso.ruta-hoy-paso--actual` | 4px entre tarjetas | 2 |
| media | hermanas | inicio | inicio-plan-completado | 390x844 | 0,3 | `ho  ↔  div.inicio-ruta-hoy > div.ruta-hoy-grid.pop-entrada-escalonada > div.ruta-hoy-paso.ruta-hoy-paso--hecho` | 4px entre tarjetas | 2 |
| baja | interior | celebracion, inicio, lluvia | celebracion-y-lluvia, inicio-con-confirmacion, inicio-plan-activo (+3) | 1440x900, 360x740, 390x844 | 0,3 | `div.inicio-camino > div.fila-cabeza.camino-cabeza > span.pastilla-nivel-xp.camino-pastilla` | 6px arriba (mín 8) | 72 |
| baja | interior | celebracion, inicio, lluvia | celebracion-y-lluvia, inicio-con-confirmacion, inicio-plan-activo (+3) | 1440x900, 360x740, 390x844 | 0,3 | `div.tarjeta-meta.superficie-oscura > div.meta-fila-barra > span.pastilla-nivel-xp` | 6px arriba (mín 8) | 72 |
| baja | interior | escritura | escritura-confirmacion, escritura-escribiendo, escritura-revision | 1440x900, 360x740, 390x844 | 0,3 | `div.escritura-cuerpo > div.escritura-columna-izquierda > span.diagnostico-pastilla-area.calcomania` | 6px arriba (mín 8) | 36 |
| baja | interior | escucha | escucha-inicio, escucha-pregunta, escucha-resultado | 1440x900, 360x740, 390x844 | 0,3 | `div.escucha-cuerpo > div.escucha-columna-audio > span.diagnostico-pastilla-area.calcomania` | 6px arriba (mín 8) | 36 |
| baja | interior | ajustes | ajustes, ajustes-import-invalido | 1440x900, 360x740, 390x844 | 0,3 | `div.ajustes-tarjeta.superficie-oscura > div.fila-cabeza > span#pastilla-conversacion.ajustes-pastilla-estado` | 6px arriba (mín 8) | 24 |
| baja | interior | diagnostico | diagnostico-pregunta, diagnostico-pregunta-escucha | 1440x900, 360x740, 390x844 | 0,3 | `div.diagnostico-cuerpo > div.diagnostico-columna-izquierda > span.diagnostico-pastilla-area.calcomania` | 6px arriba (mín 8) | 24 |
| baja | interior | lectura | lectura-pregunta, lectura-texto | 1440x900, 360x740, 390x844 | 0,3 | `div.lectura-cuerpo > div.lectura-columna-texto > span.diagnostico-pastilla-area.calcomania` | 6px arriba (mín 8) | 24 |
| baja | interior | repaso | repaso-frente | 1440x900, 360x740, 390x844 | 0,3 | `div#repaso-marco.repaso-marco > div.repaso-cara.repaso-cara-frente > span.repaso-pastilla` | 6.2px arriba (mín 8) | 12 |
| baja | interior | repaso | repaso-reverso | 1440x900, 360x740, 390x844 | 0,3 | `div#repaso-marco.repaso-marco.revelada > div.repaso-cara.repaso-cara-frente > span.repaso-pastilla` | 6.2px arriba (mín 8) | 12 |
| baja | interior | habla | habla-resultado | 1440x900, 360x740, 390x844 | 0,3 | `div.habla-resultado.pop-entrada > div.habla-chips.pop-entrada-escalonada > span.habla-chip.habla-chip-revisar` | 6px arriba (mín 8) | 8 |
| baja | tactil | habla | habla-inicio, habla-resultado | 1440x900, 360x740, 390x844 | 3 | `v#panel-mic.habla-panel-mic.superficie-oscura > button#btn-terminar-habla.enlace-discreto.habla-boton-terminar` | 43×44px (mín 44) | 6 |
| baja | interior | inicio | inicio-plan-completado | 360x740 | 0,3 | `div.pantalla-vista.pantalla-inicio-guiada > div.tarjeta-principal.tarjeta-principal--lista` | 10px arriba (mín 12) | 4 |
| baja | interior | habla | habla-resultado | 360x740 | 0 | `div.habla-resultado.pop-entrada > div.habla-chips.pop-entrada-escalonada > span.habla-chip.habla-chip-acierto` | 6px arriba (mín 8) | 2 |

## Estado final (después de corregir)

**Sin hallazgos.**


**Sin hallazgos en el estado final** (0 de 33 estados × 3 viewports × 2 niveles de interfaz). No quedan excepciones por hallazgo; lo que el medidor **no cuenta** (y por qué) es, por diseño:
- Líneas de texto recortadas por `line-clamp`/`overflow:hidden` (no se ven; p. ej. el nombre de un paso de la ruta a 2 líneas).
- La cara de la tarjeta de repaso que el volteo 3D deja detrás.
- Insignias de ≤ 44 px con un glifo centrado (letras A–D, números de paso): límite de 3 px.
- Una casilla de verificación dentro de un `<label>` de ≥ 44 px (la fila entera es el área táctil).
- Líneas divisorias de un solo lado (no son tarjetas) y los términos subrayados de las lecturas (`.lectura-termino`, enlaces en línea dentro de un texto).

Nota de método: el estado inicial se midió con una versión previa del medidor (sin ignorar líneas recortadas ni la cara oculta del repaso, y con insignias en 4 px); por eso algunos hallazgos iniciales son más generosos. Una segunda medición inicial con el medidor final (solo 390×844 y 1440×900, interfaz 0) dio 213 hallazgos; las capturas "antes" son de ese estado.
