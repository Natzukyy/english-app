# Auditoría de márgenes — cómo correrla

Mide, en todas las pantallas y estados (33) × 390×844 / 360×740 / 1440×900 × interfaz nivel 0 y 3, cada tarjeta o contenedor con borde, fondo o sombra: distancia contenido→borde (≥ 12 px; 8 px en pastillas y fichas compactas de ≤ 72 px; 3 px en insignias de ≤ 44 px), texto a ≥ 16 px del borde de la pantalla (móvil), desbordes, tarjetas hermanas a ≥ 8 px y áreas táctiles ≥ 44 px. Siembra una base de pruebas aislada (contexto nuevo de Playwright, nunca tu base real). Sin dependencias en el proyecto: usa el Playwright del MCP.

```
cd /ruta/al/proyecto
python3 -m http.server 8001 &                                     # la app
python3 tools/auditoria-receptor.py /tmp/auditoria &              # recibe los resultados (puerto 8010)
# En Claude Code (MCP de Playwright): browser_run_code_unsafe con  filename: tools/auditoria-margenes.js
#   (edita AJUSTES al inicio del archivo para correr solo una parte, o para guardar capturas;
#    el resultado llega a /tmp/auditoria/<AJUSTES.salida>.json, por defecto auditoria.json)
python3 tools/auditoria-md.py /tmp/auditoria/antes.json /tmp/auditoria/despues.json > docs/auditoria-margenes.md
```

Sale en `docs/auditoria-margenes.md`. Debe quedar vacía o con excepciones justificadas una por una. No va en `./tests/run-tests.sh` porque necesita un navegador.
