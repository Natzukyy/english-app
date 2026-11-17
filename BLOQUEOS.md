# Bloqueos — noche 1

Cosas que fallaron o no se pudieron resolver solo. Formato: qué, cuándo, qué intenté, qué falta.

## B2. Skill `security-review` no corre sin remoto `origin`
- **Qué pasó:** al invocar el skill `security-review` para la auditoría de fase 6, falló con `fatal: ambiguous argument 'origin/HEAD...'` porque espera un repo con remoto de GitHub para diffear. Este proyecto no tiene remoto (nunca se hizo `push`, por los límites duros de `prompt-noche.md`).
- **Tampoco existe un skill llamado exactamente `security-guidance`** en este entorno (sí existe `security-review`, que es el más cercano).
- **Qué hice en su lugar:** hice yo mismo una revisión manual de seguridad sobre el código completo (ver DECISIONES.md D10 para el hallazgo real que encontré y arreglé), enfocada en XSS/inyección, secretos, y el service worker.
- **Qué falta:** si Alex configura un remoto de GitHub más adelante, vale la pena correr `security-review` (o `/code-review ultra`) de verdad sobre el diff completo.

## B1. Verificación visual en navegador real, no confiable en automático
- **Qué pasó:** intenté abrir la app en Safari vía AppleScript (`osascript -e 'tell application "Safari"...'`) para tomar una captura y confirmar visualmente la pantalla de inicio. La primera llamada tardó mucho y se movió a background; una segunda llamada (solo para listar las pestañas abiertas) falló con "Tiempo límite agotado para un evento Apple (-1712)".
- **Por qué probablemente pasa:** controlar apps reales por AppleScript en esta Mac (que está en uso activo — vi tu terminal con un `caffeinate -i` corriendo) requiere permisos de automatización que no se pueden conceder sin alguien frente a la pantalla, y no quise insistir para no abrir diálogos de permiso sobre lo que estés haciendo.
- **Qué hice en su lugar:** verificación sin UI real: (1) chequeo de sintaxis de todo el JS con el parser de JavaScriptCore (`osascript -l JavaScript` + `new Function(...)`), (2) `curl` contra `python3 -m http.server` confirmando 200 OK en index.html, manifest, sw.js, JSON de i18n e iconos, (3) suite de pruebas unitarias en verde.
- **Qué falta:** abrir `http://localhost:8000` (con `python3 -m http.server` desde la raíz del proyecto) en Safari/Chrome tú mismo y confirmar que se ve y navega bien. Lo dejo en el checklist del reporte matutino.

