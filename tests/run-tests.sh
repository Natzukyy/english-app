#!/usr/bin/env bash
# Corre las pruebas de js/core/*.js con el runner propio (tests/lib/mini-test.js),
# ejecutado con `osascript -l JavaScript` (JavaScriptCore del sistema).
# No requiere Node/npm instalados (ver DECISIONES.md D1).
set -euo pipefail
cd "$(dirname "$0")/.."

TMP="$(mktemp -t app-ingles-tests).js"
trap 'rm -f "$TMP"' EXIT

# Módulos puros de js/core/ (sin DOM/IndexedDB/fetch) que sí pueden correr en JXA.
# storage.js queda fuera: depende de IndexedDB, que no existe fuera del navegador.
CORE_PURO=(
  "js/core/util.js"
  "js/core/i18n.js"
  "js/core/fecha.js"
  "js/core/racha.js"
  "js/core/xp.js"
  "js/core/srs.js"
  "js/core/diagnostico.js"
  "js/core/progreso.js"
  "js/core/habla.js"
  "js/core/conversacion.js"
  "js/core/tts.js"
  "js/core/avance.js"
  "js/core/plan.js"
)

cat tests/lib/mini-test.js "${CORE_PURO[@]}" tests/core/*.test.js > "$TMP"
echo "Test.run();" >> "$TMP"

osascript -l JavaScript "$TMP"

# Validación del contenido (esquema, ids únicos, conteos mínimos por nivel) -- sin Node.
python3 scripts/validar_contenido.py
