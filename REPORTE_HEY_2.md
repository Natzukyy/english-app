# REPORTE_HEY_2 — márgenes de tarjetas y problemas visuales (rama `hey-2`)

Fecha: 2026-11-20. Rama `hey-2` (sale de `hey`). Sin push, sin despliegue, sin dependencias nuevas; **no se tocó la lógica ni las constantes de avance (D29)**: solo layout, estilo y un poco de marcado. Decisión nueva: **D33** en `DECISIONES.md`.

## Cómo verlo
```
cd /Users/alex/Proyectos/app-ingles
python3 -m http.server 8001
```
Abre `http://localhost:8001` (el service worker ahora es `v31`; si ves algo viejo, recarga sin caché). Capturas antes/después en `docs/design-review/hey-2/` (`<pantalla>-<estado>-<viewport>-antes.png` / `-despues.png`, 33 estados × 390×844 y 1440×900, interfaz en español). Auditoría: `docs/auditoria-margenes.md`.

## Causa (la que ya estaba identificada, confirmada)
`.superficie-oscura` solo da fondo, borde y radio, y `.calcomania` borde, sombra y giro: **ninguna pone padding**. Varias clases que las reusan (`.progreso-tarjeta-habilidad`, `.repaso-panel-calificar`, `.ruta-hoy-paso`, `.tarjeta-meta`, pastillas…) nunca pusieron el suyo o lo dejaron en 0–4 px. La captura de Alex mostraba justo eso.

## Qué encontró la auditoría (estado inicial)
**805 hallazgos** en 33 estados × 3 viewports × interfaz 0 y 3 (757 de padding interior, 42 de tarjetas pegadas, 6 de áreas táctiles; 190 altos, 221 medios, 394 bajos). Por pantalla (Inicio incluye sus estados duplicados en celebración/lluvia): Inicio 289 (+136 en celebración/lluvia, que son Inicio), Progreso 72, Ajustes 72, Diagnóstico 48, Repaso 40, Lectura 36, Escucha 36, Escritura 36, Habla 16, Practicar 12, Confirmación 12. Conversación: 0. Lo peor: la tarjeta de habilidad de Progreso (0 px a los lados), el panel de calificar del repaso (los 4 botones tocaban el borde: 0 px), la ruta de hoy en celular (2–4 px), la tarjeta de meta (6 px), la pastilla de "Práctica de…" (2 px) y casi todas las pastillas/chips (4–6 px).

## Qué corregí
- **Progreso** (Tarea 1): padding `--pad-tarjeta` (16 px) en la tarjeta; sin el margen doble entre título y primera barra (el espaciado lo da solo el gap); las dos barras con la **misma altura (12 px, relleno de 7 px)** y una **etiqueta cada una** ("Escala A1–C2" / "Hacia B1", claves `progreso.barra_escala` / `progreso.barra_nivel`); animación y `prefers-reduced-motion` intactos. Verificado en las 4 habilidades y los estados: **0 %**, **"Faltan 8 respuestas"**, **"Necesitas más aciertos"**, **"Lista para confirmar"** y **nivel máximo** (solo la barra de escala + "Nivel máximo de la escala"). **Las 4 tarjetas tienen su pastilla de nivel** (Lectura B1, Escucha A2, Habla A2, Escritura A2/C2): en la captura de Alex solo se veían dos por el recorte de la captura a pantalla completa (la barra de navegación fija se pinta encima de la primera tarjeta); no era un fallo de la pantalla.
- **Token** `--pad-tarjeta` / `--pad-tarjeta-grande` en un solo lugar y usado en las tarjetas (Tarea 3).
- **Pastillas y chips** (nivel/XP, "Práctica de…", repaso, estado de conversación, resultado de Habla, área de Diagnóstico/Lectura/Escucha/Escritura): padding vertical de 6–8 px en vez de 2–4.
- **Inicio:** meta (padding 12/16, "Nivel · XP" sube a la fila del título y "x/y min" junto a la barra), mosaicos de la ruta de hoy (padding 8 px, número y minutos en una fila; antes 4/2 px), HOY TE TOCA (12/16 también en celular), separación de 8 px entre tarjetas, barras de 8 px (a 6 px el relleno era de 1 px). **Inicio en celular sigue sin scroll** (medido: 390×844 y 360×740, scroll = 0) a costa de ocultar lo secundario: la frase "Vas aquí · ritmo", "tu nivel de inglés ahora" y, en pantallas de ≤ 780 px de alto, el detalle bajo cada mini-barra (siguen en Progreso).
- **Repaso:** el panel de calificar con padding de 16 px (los botones tocaban el borde) y la tarjeta de 220 → 260 px de alto mínimo (las caras son absolutas: con frase de 2 líneas + bocina el contenido quedaba a 6–10 px del borde).
- **Ajustes:** control segmentado de tema con 8 px de gutter. **Táctil:** "Terminar" de Habla con ancho mínimo de 44 px; las casillas de la lista de escritura cuentan con su fila de 44 px.
- Rule de las animaciones: ver D33; no se cambió ninguna animación.

## Estado final
**0 hallazgos** (misma matriz completa). **No quedan excepciones por hallazgo.** Lo que el medidor no cuenta por diseño (líneas recortadas por `line-clamp`, la cara oculta del volteo de repaso, insignias de ≤ 44 px con un glifo centrado a 3 px, casillas dentro de un `<label>` de 44 px, líneas divisorias de un solo lado, términos subrayados de las lecturas) está justificado uno por uno en `docs/auditoria-margenes.md`.

**Qué ya estaba bien según la auditoría (no se tocó):** Conversación (0 hallazgos); las tarjetas de Lectura, Escucha y Escritura (consigna, panel de audio, lista de verificación; solo fallaban sus pastillas); la pantalla de Diagnóstico (solo la pastilla de área y los 3 px de las letras A–D, que son insignias); Ajustes salvo el control de tema, la pastilla de estado y los botones ± (insignias de 44 px).

## Comprobaciones de cierre
| Qué | Resultado |
|---|---|
| `./tests/run-tests.sh` | **181 pasaron, 0 fallaron** + contenido OK + sin texto hardcodeado |
| `tests/integracion.html` | **30 / 30** |
| Auditoría de márgenes | **0 hallazgos** (antes 805) |
| Inicio sin scroll | 390×844 y 360×740: sin scroll |
| Barras animadas | la barra de Progreso va 0 → 0.19 → 0.4 → 0.62 → 0.8 (se anima, no salta) |
| `prefers-reduced-motion` | sin animaciones ni transiciones largas (`tests/e2e/hey-avance-movimiento.js`) |

## Lo que NO pude verificar
- **iPhone real** (Safari/iOS): métricas de texto y de la fuente en iOS (la auditoría usa Chromium), safe-area de la barra inferior, el volteo 3D de la tarjeta de repaso con la nueva altura (260 px) y que Inicio siga sin scroll en un iPhone con la barra de Safari. Qué mirar: Inicio (que no haga scroll y las tarjetas respiren), Progreso (las dos barras con etiqueta y las 4 pastillas), Repaso (botones de calificar con margen, tarjeta más alta), y las pastillas de Practicar.
- Interfaz en nivel 1 y 2 (solo 0 y 3, como pedía la tarea).
- Capturas "antes" de 360×740 y de interfaz 3 (la auditoría sí los midió; las capturas son de 390×844 y 1440×900 en español).

## Dudas
1. Para que Inicio siga sin scroll en celular oculté la línea "Vas aquí · ritmo bien/lento" y el detalle de las mini-barras en pantallas bajitas. Si prefieres conservarlas, la alternativa es dejar que Inicio haga un poco de scroll en celular.
2. La tarjeta de repaso crece de 220 a 260 px; en laptop sigue llenando el alto.
