# Progreso — noche 1

Rama: `noche-1`. Un commit por paso. Antes de cada paso se anota aquí qué se va a hacer; al terminar se marca hecho.

## Fase 0 — Preparación
- [x] git init + rama `noche-1`
- [x] estructura de carpetas
- [x] DECISIONES.md, BLOQUEOS.md, PROGRESS.md
- [ ] CLAUDE.md del proyecto
- [ ] commit de cierre de fase 0

## Fase 1 — Esqueleto PWA
- [x] manifest.webmanifest + iconos placeholder (PNG generados sin dependencias)
- [x] service worker (cache offline básico, escrito a mano)
- [x] index.html + navegación entre pantallas (router por hash, 5 pantallas)
- [x] storage.js (IndexedDB) + exportar/importar respaldo (funcional en pantalla de ajustes)
- [x] i18n.js (es/en) con umbrales editables (data/i18n/umbrales.json)
- [x] tokens de diseño (css/styles.css) con la skill frontend-design: paleta "night-lab" (índigo + neón menta/violeta + 4 pasteles de habilidad), tipografía de sistema iOS/macOS
- [x] verificación: sintaxis JS ok, servidor local responde 200 en todas las rutas clave, tests en verde

## Fase 2 — Lógica núcleo con pruebas
- [x] fecha.js (utilidades de fecha local, DST-safe) + tests de bordes (medianoche, fin de mes/año, bisiesto)
- [x] racha.js (mínimo 5 min/día, congelación limitada) + tests
- [x] xp.js (XP y niveles) + tests
- [x] srs.js (SM-2, justificado en DECISIONES D3) + tests
- [x] runner de tests (osascript) en verde: 45 pasaron, 0 fallaron
- [x] index.html y sw.js actualizados con los nuevos módulos (cache v2)

## Fase 3 — Diagnóstico
- [ ] banco de preguntas A2–C1 (JSON)
- [ ] motor de diagnóstico por habilidad
- [ ] resultado: nivel estimado + mapa a B2

## Fase 4 — Contenido fase 1 (carrera/comunicación profesional)
- [ ] lecturas + comprensión + vocabulario (JSON)
- [ ] ejercicios de habla (shadowing/prompt) marcados requiere_prueba_microfono

## Fase 5 — Interfaz
- [ ] pantallas: inicio, repaso, diagnóstico, progreso, ajustes
- [ ] estética neón/pastel, accesibilidad, prefers-reduced-motion

## Fase 6 — Auditoría
- [ ] security-guidance
- [ ] revisión accesibilidad/código

## Fase 7 — Reporte matutino
- [ ] REPORTE_MATUTINO.md

---
## Paso actual
Cerrando fase 2 (commit). Siguiente: fase 3 (diagnóstico por habilidad).
