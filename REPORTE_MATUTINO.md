# Reporte matutino — noche 1

Buenos días, Alex. Trabajé las 7 fases que dejaste en `prompt-noche.md`, en la rama `noche-1`, con un commit por fase (8 commits en total, nunca hice `push`, no toqué nada fuera de esta carpeta). Todo lo que sigue es exactamente lo que encontré y lo que hice — no inventé nada que no haya podido verificar.

## 1. Lo primero que debes revisar tú

1. **No existía `PROMPT_BASE.md` cuando empecé.** Lo agregaste a mitad de la sesión y me dijiste que prevalece sobre `prompt-noche.md` salvo en los límites duros. Lo incorporé completo a partir de ahí (ver `DECISIONES.md` D0).
2. **Esta Mac no tiene Node/npm instalados.** No instalé nada global (está prohibido sin tu autorización), así que construí todo en JS/CSS/HTML puro, sin build, sin dependencias. Está bien documentado en `DECISIONES.md` D1 y en `CLAUDE.md` del proyecto. Si en algún momento instalas Node tú mismo, se le puede agregar Vite/Vitest encima sin tocar la lógica.
3. **Todos los números de "balance" son inventados por mí y provisionales** (marcados `revisar: true` donde aplica): XP por minuto/ejercicio/meta, costo de nivel, congelamientos de racha (2 iniciales/máximos, se recupera 1 cada 7 días), umbral de acierto del diagnóstico (60%), y los umbrales de "cuánto inglés mostrar en la interfaz". Son decisiones razonables pero arbitrarias — vale la pena que los ajustes a tu gusto después de usarlo unos días. Todos están en `DECISIONES.md` (D2, D6, D7, D8).
4. **El primer hito de `PROMPT_BASE.md`** (página mínima con HTTPS para probar micrófono/voz/instalación en tu iPhone) **no se hizo** — `prompt-noche.md` prohíbe desplegar esta noche. Queda pendiente y es lo primero que yo sugeriría para hoy (ver sección 4).

## 2. Qué quedó funcionando (fases 0-7, todas cerradas)

- **Fase 0-1:** estructura del proyecto, PWA instalable (manifest + iconos + service worker con cache offline), navegación entre 5 pantallas, IndexedDB con exportar/importar respaldo, interfaz mixta es/en.
- **Fase 2:** racha (mínimo 5 min/día, congelación limitada), XP y niveles, meta diaria flexible (5/15/30), repaso espaciado con **SM-2** (justificación de 5 líneas en `DECISIONES.md` D3). 45 pruebas unitarias, incluyendo bordes de medianoche, fin de mes/año y años bisiestos.
- **Fase 3:** motor de diagnóstico por habilidad (lectura, escucha, vocabulario/gramática por banco de preguntas; habla/escritura por autoevaluación CEFR, porque no se pueden calificar sin un modelo). Banco de 24 preguntas A2→C1, escrito por mí, verificado con confianza alta en la gramática — **el nivel CEFR que le puse a cada pregunta es una estimación mía, no una certificación**, y así se lo dice la app.
- **Fase 4:** contenido real de carrera/comunicación profesional — 4 lecturas con comprensión, 20 palabras de vocabulario técnico, frases útiles por situación (correos, reuniones, standups, explicar un proyecto de IA, pedir ayuda, dar feedback, entrevistas), y 8 ejercicios de habla (shadowing + responder a un prompt), todos marcados `requiere_prueba_microfono: true`. Todo en JSON, no en código.
- **Fase 5:** las 5 pantallas ya están conectadas de verdad, no son maquetas: inicio (racha/meta/XP/chips de habilidad reales), repaso (sesión real de repaso espaciado que siembra tarjetas desde el vocabulario y las frases, usa SM-2, registra minutos y XP), diagnóstico (cuestionario interactivo completo que guarda su resultado), progreso (resumen del último diagnóstico + cuenta regresiva a marzo de 2027), ajustes (meta diaria + exportar/importar). Estética "night-lab": fondo índigo oscuro, dos acentos neón (menta/violeta) y 4 pasteles para las 4 habilidades — la justifiqué con la skill `frontend-design` antes de construirla.
- **Fase 6 (auditoría):** encontré y arreglé un **XSS almacenado real**: si se importa un respaldo `.json` editado a mano con HTML/JS en ciertos campos, varias pantallas lo insertaban sin escapar. Lo arreglé (helper de escape + Content-Security-Policy) — detalle completo en `DECISIONES.md` D10. También verifiqué contraste de color (todo ≥6.4:1, pasa WCAG AA/AAA) y accesibilidad básica (botones ≥44px, `prefers-reduced-motion`, foco visible, todo navegable por teclado).
- **62 pruebas unitarias, todas en verde**, corriendo con `./tests/run-tests.sh` (no usa Node: usa JavaScriptCore del sistema vía `osascript`, porque esta Mac no tenía Node — ver punto 2 arriba).

## 3. Lo que NO se hizo (a propósito, por los límites de esta noche)

- Nada de despliegue (GitHub Pages ni ningún otro), nada de conversación con LLM, nada de contenido de videojuegos, nada de cuentas/backend. Tal como pedías.
- No pude abrir la app en un navegador real para verla con tus propios ojos (ver siguiente sección) ni probar el `security-review` automático (necesita un repo con remoto de GitHub, y este no tiene remoto). Hice ambas cosas "a mano" en su lugar — ver `BLOQUEOS.md`.

## 4. Qué probar tú en el iPhone (y en Mac) — checklist

Primero, en tu Mac, abre una terminal en esta carpeta y corre:
```
python3 -m http.server 8000
```
y abre `http://localhost:8000` en Safari o Chrome. Ahí puedes revisar visualmente las 5 pantallas — yo no pude verlas renderizadas, solo verifiqué que el código es válido y que el servidor responde 200 en todas las rutas.

En el iPhone (una vez que esto esté desplegado con HTTPS en algún lado — GitHub Pages es la opción más simple, pero eso requiere tu autorización, no lo hice):
1. **Permiso de micrófono y grabación.** Ningún ejercicio de habla graba audio todavía (están marcados `requiere_prueba_microfono: true` a propósito, sin implementar la grabación real).
2. **Reconocimiento de voz (Web Speech API).** No implementado todavía; `PROMPT_BASE.md` pide explícitamente no asumir que funciona en iOS.
3. **Síntesis de voz (TTS).** Si implementé el hook `App.TTS` detrás de una función sustituible, usando la Web Speech API del navegador. **No lo pude probar en iOS real** — en Mac/Safari debería sonar algo si le das "🔊 Reproducir" en una pregunta de escucha del diagnóstico.
4. **Instalación a pantalla de inicio y notificaciones.** El manifest y el service worker están listos para "Agregar a pantalla de inicio"; no implementé notificaciones (no se puede probar sin HTTPS + el iPhone real).

## 5. Riesgos que quiero que veas

- Los íconos de la PWA son un **placeholder geométrico** (una llama neón sobre fondo índigo, generada por código, sin dependencias) — no es un diseño final.
- El banco de preguntas del diagnóstico (24 preguntas) es chico; sirve para una primera estimación pero conviene ampliarlo con el tiempo.
- Las constantes de balance (XP, congelamientos, umbral del diagnóstico, umbrales de idioma de interfaz) son todas provisionales — revísalas en `DECISIONES.md` antes de confiar en los números que te muestre la app.
- El repaso espaciado usa SM-2, no FSRS (justificado en D3) — es la decisión correcta para arrancar sin historial, pero si en unos meses quieres algo más preciso, vale la pena revisarlo con datos reales acumulados.

## 6. Archivos que te interesan

- `DECISIONES.md` — las 10 decisiones que tomé sin preguntarte, con alternativas y motivos.
- `BLOQUEOS.md` — las 2 cosas que no pude resolver solo (verificación visual en Safari real, y el skill de seguridad sin remoto git).
- `PROGRESS.md` — el detalle fase por fase de qué se hizo.
- `CLAUDE.md` (de este proyecto) — stack y comandos, para que cualquier sesión futura (mía o tuya) sepa cómo correr esto.

Rama `noche-1`, 8 commits, árbol de trabajo limpio, 62 pruebas en verde. Cuando la revises y quieras, la fusionamos a una rama principal — no lo hice yo porque no existe todavía y fusionar/crear ramas principales me pareció una decisión tuya, no mía.
