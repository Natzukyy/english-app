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
- [x] banco de preguntas A2–C1 (24 preguntas: lectura, escucha con texto para TTS, vocabulario/gramática)
- [x] rúbrica de autoevaluación CEFR para habla/escritura (data/diagnostico/rubrica_cefr.json)
- [x] motor de diagnóstico por habilidad (js/core/diagnostico.js) + 9 tests
- [x] hook de TTS sustituible (js/core/tts.js), sin probar en iOS real todavía
- [x] resultado: nivel estimado por habilidad + % hacia B2
- [ ] pantalla de diagnóstico interactiva real (queda para la fase 5, junto con las demás pantallas)

## Fase 4 — Contenido fase 1 (carrera/comunicación profesional)
- [x] lecturas + comprensión (4 lecturas A2→B2, data/content/fase1/lecturas.json)
- [x] vocabulario (20 términos técnicos/profesionales, con ejemplo y nivel)
- [x] frases útiles por situación (correos, reuniones, standups, explicar proyecto, pedir ayuda, dar feedback, entrevistas)
- [x] ejercicios de habla (shadowing + responder_prompt) marcados requiere_prueba_microfono: true
- [ ] pantalla/UI que consuma este contenido (queda para fase 5)

## Fase 5 — Interfaz
- [x] inicio: racha real, meta diaria con barra de progreso, nivel/XP, chips de habilidad con último diagnóstico
- [x] repaso: sesión real de repaso espaciado (siembra tarjetas desde vocabulario/frases, califica con SM-2, registra minutos/XP al terminar o al salir)
- [x] diagnóstico: cuestionario interactivo completo (24 preguntas + autoevaluación habla/escritura) que guarda resultado
- [x] progreso: resumen del último diagnóstico, nivel/XP/racha, cuenta regresiva a la fecha objetivo (B2 para 2027-03-31)
- [x] ajustes: meta diaria (5/15/30) persistida + exportar/importar respaldo (ya existía desde fase 1)
- [x] App.Datos (nuevo) orquesta IndexedDB + lógica pura para que las pantallas no dupliquen reglas de negocio
- [x] estética neón/pastel aplicada (tokens de fase 1), accesibilidad base (foco visible, prefers-reduced-motion, botones táctiles ≥44px)
- [ ] auditoría formal de accesibilidad/seguridad (fase 6)

## Fase 6 — Auditoría
- [ ] security-guidance
- [ ] revisión accesibilidad/código

## Fase 7 — Reporte matutino
- [ ] REPORTE_MATUTINO.md

---
## Paso actual
Cerrando fase 5 (commit). Siguiente: fase 6 (auditoría de seguridad/accesibilidad).
