# Auditoría de márgenes (D33)

Generada con `tools/auditoria-margenes.js` + `tools/auditoria-md.py`. Umbrales: contenido a ≥ 12 px del borde de su tarjeta (8 px en pastillas y fichas compactas de ≤ 72 px de lado menor, 4 px en insignias de ≤ 44 px con un glifo centrado); texto a ≥ 16 px del borde de la pantalla (móvil); tarjetas hermanas a ≥ 8 px; áreas táctiles ≥ 44 px; sin desbordes. Las reglas de interior/hermanas se miden sin la rotación de ±1° de las calcomanías; la regla **hueco** (D35) mide al revés: con la sombra dura (offset/blur/spread) y la rotación incluidas, mínimo 12 px entre hermanos (16 px bajo una tarjeta hero) y también entre un hijo que sobresale de su contenedor y los hermanos de ese contenedor. 33 estados × 390×844 / 360×740 / 1440×900 × interfaz nivel 0 y 3, con datos sembrados en una base de pruebas aislada.

## Estado inicial (antes de corregir)

263 hallazgos · por regla {'hueco': 263} · por severidad {'media': 172, 'alta': 91}

Por pantalla: inicio 52, escucha 36, diagnostico 30, ajustes 26, escritura 22, progreso 18, habla 18, lectura 18, celebracion 14, lluvia 14, practicar 12, confirmacion 3

| Sev. | Regla | Pantalla(s) | Estados | Viewports | Niv. | Selector | Peor medida | Veces |
|---|---|---|---|---|---|---|---|---|
| alta | hueco | celebracion, inicio, lluvia | celebracion-y-lluvia, inicio-con-confirmacion, inicio-plan-activo (+2) | 360x740, 390x844 | 0,3 | `-guiada > div.tarjeta-principal.calcomania  ↔  div.pantalla-vista.pantalla-inicio-guiada > div.inicio-ruta-hoy` | -3.5px de aire real con sombra/rotación (mín 16) | 20 |
| alta | hueco | escritura | escritura-confirmacion, escritura-escribiendo, escritura-revision | 1440x900, 360x740, 390x844 | 0,3 | `lcomania  ↔  div.escritura-cuerpo > div.escritura-columna-izquierda > div.escritura-consigna.superficie-oscura` | 1.8px de aire real con sombra/rotación (mín 12) | 18 |
| alta | hueco | escucha | escucha-inicio, escucha-pregunta, escucha-resultado | 1440x900, 360x740, 390x844 | 0,3 | `.escucha-columna-audio > div.escucha-panel-audio.superficie-oscura > button#btn-escuchar-lento.enlace-discreto` | 2.2px de aire real con sombra/rotación (mín 16) | 18 |
| alta | hueco | escucha | escucha-inicio, escucha-pregunta, escucha-resultado | 1440x900, 360x740, 390x844 | 0,3 | `area.calcomania  ↔  div.escucha-cuerpo > div.escucha-columna-audio > div.escucha-panel-audio.superficie-oscura` | 1.8px de aire real con sombra/rotación (mín 12) | 18 |
| alta | hueco | lectura | lectura-pregunta, lectura-texto | 1440x900, 360x740, 390x844 | 0,3 | `ostico-pastilla-area.calcomania  ↔  div.lectura-cuerpo > div.lectura-columna-texto > p.texto-tenue.num-tabular` | -2.2px de aire real con sombra/rotación (mín 12) | 12 |
| alta | hueco | practicar | practicar | 1440x900, 360x740, 390x844 | 0,3 | `lla-vista.pantalla-practicar > div.practicar-grid.pop-entrada-escalonada > button.practicar-tarjeta.calcomania` | 3.7px de aire real con sombra/rotación (mín 12) | 12 |
| alta | hueco | diagnostico | diagnostico-pregunta-escucha | 1440x900, 360x740, 390x844 | 0,3 | `comania  ↔  div.diagnostico-cuerpo > div.diagnostico-columna-izquierda > button#btn-reproducir.enlace-discreto` | -5.4px de aire real con sombra/rotación (mín 12) | 6 |
| alta | hueco | diagnostico | diagnostico-pregunta | 1440x900, 360x740, 390x844 | 0,3 | `ania  ↔  div.diagnostico-cuerpo > div.diagnostico-columna-izquierda > div.diagnostico-pasaje.superficie-oscura` | 3.2px de aire real con sombra/rotación (mín 12) | 6 |
| alta | hueco | diagnostico | diagnostico-pregunta-escucha | 360x740, 390x844 | 0,3 | `nia  ↔  div.diagnostico-cuerpo > div.diagnostico-columna-izquierda > span.diagnostico-pastilla-area.calcomania` | 3.7px de aire real con sombra/rotación (mín 12) | 4 |
| alta | hueco | diagnostico | diagnostico-pregunta-escucha | 360x740, 390x844 | 0,3 | `a  ↔  div.diagnostico-cuerpo > div.diagnostico-columna-izquierda > div.diagnostico-tarjeta-pregunta.calcomania` | 3.7px de aire real con sombra/rotación (mín 12) | 4 |
| alta | hueco | inicio | inicio-plan-completado | 360x740, 390x844 | 0,3 | `tarjeta-principal.tarjeta-principal--lista  ↔  div.pantalla-vista.pantalla-inicio-guiada > div.inicio-ruta-hoy` | -3.5px de aire real con sombra/rotación (mín 16) | 4 |
| media | hueco | celebracion, inicio, lluvia | celebracion-y-lluvia, inicio-con-confirmacion, inicio-plan-activo (+2) | 360x740, 390x844 | 0,3 | `arjeta-principal.calcomania  ↔  div.pantalla-vista.pantalla-inicio-guiada > div.tarjeta-meta.superficie-oscura` | 5.5px de aire real con sombra/rotación (mín 12) | 20 |
| media | hueco | celebracion, inicio, lluvia | celebracion-y-lluvia, inicio-con-confirmacion, inicio-plan-activo (+2) | 360x740, 390x844 | 0,3 | `n  ↔  div.pantalla-vista.pantalla-inicio-guiada > div.tarjeta-principal.calcomania > p.tarjeta-principal-razon` | 7.5px de aire real con sombra/rotación (mín 12) | 20 |
| media | hueco | habla | habla-confirmacion, habla-inicio, habla-resultado | 1440x900, 360x740, 390x844 | 0,3 | `n-escuchar.habla-boton-escuchar.calcomania  ↔  div.habla-cuerpo > div.habla-tarjeta.calcomania > p.habla-frase` | 4.8px de aire real con sombra/rotación (mín 12) | 18 |
| media | hueco | progreso | progreso-datos, progreso-nivel-maximo, progreso-sin-datos | 1440x900, 360x740, 390x844 | 0,3 | `lla-progreso > div.progreso-fila-superior.pop-entrada-escalonada > div.progreso-tarjeta.progreso-tarjeta-racha` | 9.1px de aire real con sombra/rotación (mín 12) | 18 |
| media | hueco | ajustes | ajustes, ajustes-import-invalido | 1440x900, 360x740, 390x844 | 0,3 | `boton-dato.calcomania  ↔  div.ajustes-grid.pop-entrada-escalonada > div.ajustes-tarjeta.superficie-oscura > h2` | 5.5px de aire real con sombra/rotación (mín 12) | 12 |
| media | hueco | celebracion, inicio, lluvia | celebracion-y-lluvia, inicio-con-confirmacion, inicio-plan-activo (+2) | 1440x900 | 0,3 | `comania  ↔  div.pantalla-vista.pantalla-inicio-guiada > button#btn-practicar.boton-practicar.superficie-oscura` | 11px de aire real con sombra/rotación (mín 16) | 10 |
| media | hueco | confirmacion, diagnostico | confirmacion-pregunta, diagnostico-pregunta | 360x740, 390x844 | 0,3 | `ania  ↔  div.diagnostico-cuerpo > div.diagnostico-columna-izquierda > div.diagnostico-pasaje.superficie-oscura` | 9.5px de aire real con sombra/rotación (mín 12) | 7 |
| media | hueco | ajustes | ajustes-import-invalido | 1440x900, 360x740, 390x844 | 0,3 | `.pop-entrada-escalonada > div.ajustes-tarjeta.superficie-oscura > p#mensaje-importar.texto-tenue.mensaje-error` | 8.5px de aire real con sombra/rotación (mín 12) | 6 |
| media | hueco | lectura | lectura-pregunta | 1440x900, 360x740, 390x844 | 0,3 | ` div.lectura-cuerpo > div.lectura-columna-preguntas > div#opciones.diagnostico-opciones.pop-entrada-escalonada` | 8.5px de aire real con sombra/rotación (mín 12) | 6 |
| media | hueco | diagnostico | diagnostico-autoevaluacion | 1440x900, 360x740, 390x844 | 0,3 | `a  ↔  div.pantalla-vista.ancho-lectura > div#opciones-rubrica.diagnostico-rubrica-filas.pop-entrada-escalonada` | 8.5px de aire real con sombra/rotación (mín 12) | 6 |
| media | hueco | ajustes | ajustes, ajustes-import-invalido | 1440x900 | 0,3 | `entrada-escalonada > div.ajustes-tarjeta.superficie-oscura > button#btn-importar.ajustes-boton-dato.calcomania` | 9.9px de aire real con sombra/rotación (mín 12) | 4 |
| media | hueco | ajustes | ajustes, ajustes-import-invalido | 1440x900 | 0,3 | `entrada-escalonada > div.ajustes-tarjeta.superficie-oscura > button#btn-exportar.ajustes-boton-dato.calcomania` | 9.9px de aire real con sombra/rotación (mín 12) | 4 |
| media | hueco | escritura | escritura-confirmacion, escritura-escribiendo | 1440x900 | 0,3 | `v.escritura-cuerpo > div.escritura-columna-izquierda > textarea#campo-escritura.campo-texto.escritura-textarea` | 8.9px de aire real con sombra/rotación (mín 12) | 4 |
| media | hueco | inicio | inicio-plan-completado | 360x740, 390x844 | 0,3 | `al.tarjeta-principal--lista  ↔  div.pantalla-vista.pantalla-inicio-guiada > div.tarjeta-meta.superficie-oscura` | 5.5px de aire real con sombra/rotación (mín 12) | 4 |
| media | hueco | inicio | inicio-plan-completado | 1440x900 | 0,3 | `--lista  ↔  div.pantalla-vista.pantalla-inicio-guiada > button#btn-practicar.boton-practicar.superficie-oscura` | 11px de aire real con sombra/rotación (mín 16) | 2 |

## Estado final (después de corregir)

**Sin hallazgos.**

