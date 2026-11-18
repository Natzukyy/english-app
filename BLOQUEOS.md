# Bloqueos — noche 1

Cosas que fallaron o no se pudieron resolver solo. Formato: qué, cuándo, qué intenté, qué falta.

## B2. Skill `security-review` no corre sin remoto `origin`
- **Qué pasó:** al invocar el skill `security-review` para la auditoría de fase 6, falló con `fatal: ambiguous argument 'origin/HEAD...'` porque espera un repo con remoto de GitHub para diffear. Este proyecto no tiene remoto (nunca se hizo `push`, por los límites duros de `prompt-noche.md`).
- **Tampoco existe un skill llamado exactamente `security-guidance`** en este entorno (sí existe `security-review`, que es el más cercano).
- **Qué hice en su lugar:** hice yo mismo una revisión manual de seguridad sobre el código completo (ver DECISIONES.md D10 para el hallazgo real que encontré y arreglé), enfocada en XSS/inyección, secretos, y el service worker.
- **Qué falta:** si Alex configura un remoto de GitHub más adelante, vale la pena correr `security-review` (o `/code-review ultra`) de verdad sobre el diff completo.

## B3. Sin Chrome/Chromium para capturas headless del rediseño visual — encontré una alternativa
- **Qué pasó:** para el rediseño visual (pedido en esta sesión), se pidió usar `--headless --screenshot` de Google Chrome si existe `/Applications/Google Chrome.app`. No existe en esta Mac (`ls` lo confirma), ni `chromium`/`chromium-browser`. No instalé nada (está prohibido sin autorización).
- **Qué hice en su lugar:** encontré que `qlmanage -t -s <N> -o <dir> archivo.html` (generador de miniaturas de QuickLook, incluido en macOS, cero instalación) sí aplica CSS real vía WebKit, con el viewport exactamente del tamaño `-s` en px (confirmado con una prueba de calibración). **No ejecuta JavaScript en absoluto** (ni siquiera dentro de `<iframe>`, lo confirmé también), así que no sirve para capturar la app corriendo. Lo que sí permite: crear páginas HTML estáticas que reproducen a mano el `innerHTML` exacto que cada pantalla generaría (con datos de ejemplo reales, tomados de los JSON de contenido) enlazando el `css/styles.css` real del proyecto, envueltas en un `<iframe style="width:430px;height:932px">` dentro de una página contenedora, y capturarlas con `qlmanage`. Esto da capturas reales, con el CSS real del proyecto, al ancho exacto de un iPhone — no son una simulación mía "a ojo".
- **Qué falta / limitación:** estas capturas reproducen el HTML que el código *debería* generar con esos datos de ejemplo, no la app corriendo de verdad (no valida JS, rutas, IndexedDB, ni que el `innerHTML` real coincida al 100% con lo que escribí a mano en el fixture). Sigue siendo necesario que Alex abra la app de verdad (`python3 -m http.server`) y la revise en Safari/Mac o en su iPhone para una confirmación final — lo mismo que ya se señalaba en B1.

## B5. La ruta de inicio no incluye lecturas todavía (habla ya se agregó)
- **Qué pide el Paso 4 (ronda de diseño):** una ruta de sesiones derivada de "lecturas,
  vocabulario, frases, ejercicios de habla, diagnóstico", solo lectura, sin inventar nodos
  falsos.
- **Por qué lecturas sigue sin nodo:** `data/content/fase1/lecturas.json` existe como
  contenido, pero **ninguna pantalla lo consume todavía** (no hay una pantalla de
  "lecturas" a la que un nodo de la ruta pudiera llevar). Agregar un nodo "Lectura 1" que al
  tocarlo no lleva a ningún lado sería peor que no tener ese nodo.
- **Actualización:** una vez que el Paso A agregó la pantalla de habla (`#/habla`), Alex
  pidió explícitamente un tercer nodo "Habla" en la ruta — ya está. Como habla y repaso
  comparten el mismo registro de sesión del día (ambos llaman a
  `App.Datos.registrarSesion`), no hay forma honesta de saber si "habla" específicamente ya
  se practicó hoy; su nodo nunca dice "completado" por eso, se queda en "actual" (pendiente
  solo hasta que el diagnóstico esté hecho) — no es un dato inventado, es admitir el límite
  real de lo que se puede saber con el dato que existe.
- **Propuesta para extenderla:** en cuanto exista una pantalla para leer las lecturas, la
  ruta puede sumar un nodo por cada una. Si en algún momento se quiere saber si "habla"
  específicamente se practicó hoy (no solo "hubo estudio"), haría falta guardar esa
  distinción en la sesión del día — un cambio de datos que no se ha pedido.

## B4. Capturas reales con `qlmanage` no son confiables por encima de ~960px de ancho
- **Qué pasó:** al verificar el Paso 3 (versión laptop/responsive), las capturas a 1440x900,
  1280x800 y 1100x700 vía el truco de `qlmanage` + `<iframe>` (documentado en B3) salieron
  mal: el contenido se desbordaba más allá del ancho declarado del iframe, como si el CSS no
  respetara los `max-width`. Investigué con una prueba de calibración (cajas de colores con
  borde) y confirmé que **no es un bug de mi CSS**: por encima de ~960-980px de ancho
  declarado, este generador de miniaturas de QuickLook deja de respetar el tamaño del
  `<iframe>` (o de la página de nivel superior) y lo relayoutea a un ancho fijo propio —
  probablemente un límite interno del generador de miniaturas HTML de macOS, no de WebKit en
  un navegador real. Por debajo de ese umbral (confirmado hasta 900px) sí es fiel al tamaño
  declarado.
- **Qué hice en su lugar:** verifiqué el *mecanismo* (barra lateral + panel de dos columnas +
  ancho de lectura + rejilla de progreso) con una copia temporal de `css/styles.css` donde
  cambié el único número del breakpoint (`min-width: 1100px` → `700px`, sin tocar ninguna
  otra regla) y lo probé a 900px de ancho, que sí es fiel. Como la mecánica de flexbox/grid no
  cambia según el valor exacto del breakpoint, esto confirma que el diseño funciona
  correctamente — lo que no pude confirmar con una captura real es el *número* exacto 1100px
  en un lienzo de 1440/1280px. El archivo real del proyecto nunca se tocó (la edición fue
  solo en una copia en el scratchpad).
- **Qué falta:** Alex debe confirmar abriendo la app en Safari/Chrome de verdad y
  achicando/agrandando la ventana de la Mac a través de 1100px, 768px, etc. — es la única
  forma de ver los tamaños exactos pedidos. Capturas del mecanismo (a 900px, con el
  breakpoint de prueba en 700px) en `capturas/responsive/`.

## B1. Verificación visual en navegador real, no confiable en automático
- **Qué pasó:** intenté abrir la app en Safari vía AppleScript (`osascript -e 'tell application "Safari"...'`) para tomar una captura y confirmar visualmente la pantalla de inicio. La primera llamada tardó mucho y se movió a background; una segunda llamada (solo para listar las pestañas abiertas) falló con "Tiempo límite agotado para un evento Apple (-1712)".
- **Por qué probablemente pasa:** controlar apps reales por AppleScript en esta Mac (que está en uso activo — vi tu terminal con un `caffeinate -i` corriendo) requiere permisos de automatización que no se pueden conceder sin alguien frente a la pantalla, y no quise insistir para no abrir diálogos de permiso sobre lo que estés haciendo.
- **Qué hice en su lugar:** verificación sin UI real: (1) chequeo de sintaxis de todo el JS con el parser de JavaScriptCore (`osascript -l JavaScript` + `new Function(...)`), (2) `curl` contra `python3 -m http.server` confirmando 200 OK en index.html, manifest, sw.js, JSON de i18n e iconos, (3) suite de pruebas unitarias en verde.
- **Qué falta:** abrir `http://localhost:8000` (con `python3 -m http.server` desde la raíz del proyecto) en Safari/Chrome tú mismo y confirmar que se ve y navega bien. Lo dejo en el checklist del reporte matutino.

