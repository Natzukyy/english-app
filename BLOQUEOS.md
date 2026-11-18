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

## B1. Verificación visual en navegador real, no confiable en automático
- **Qué pasó:** intenté abrir la app en Safari vía AppleScript (`osascript -e 'tell application "Safari"...'`) para tomar una captura y confirmar visualmente la pantalla de inicio. La primera llamada tardó mucho y se movió a background; una segunda llamada (solo para listar las pestañas abiertas) falló con "Tiempo límite agotado para un evento Apple (-1712)".
- **Por qué probablemente pasa:** controlar apps reales por AppleScript en esta Mac (que está en uso activo — vi tu terminal con un `caffeinate -i` corriendo) requiere permisos de automatización que no se pueden conceder sin alguien frente a la pantalla, y no quise insistir para no abrir diálogos de permiso sobre lo que estés haciendo.
- **Qué hice en su lugar:** verificación sin UI real: (1) chequeo de sintaxis de todo el JS con el parser de JavaScriptCore (`osascript -l JavaScript` + `new Function(...)`), (2) `curl` contra `python3 -m http.server` confirmando 200 OK en index.html, manifest, sw.js, JSON de i18n e iconos, (3) suite de pruebas unitarias en verde.
- **Qué falta:** abrir `http://localhost:8000` (con `python3 -m http.server` desde la raíz del proyecto) en Safari/Chrome tú mismo y confirmar que se ve y navega bien. Lo dejo en el checklist del reporte matutino.

