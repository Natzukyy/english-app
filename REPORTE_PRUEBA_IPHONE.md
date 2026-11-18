# Reporte de prueba — compatibilidad en iPhone

Esto explica qué esperar de cada prueba de `/prueba/index.html`, cómo interpretar lo que salga, y qué hacer tú en el iPhone paso a paso. La página no toca la app principal (ni su diseño, ni el repaso, ni la racha) — es solo para diagnosticar qué funciona en tu Safari/iPhone real antes de construir nada sobre eso.

## Qué esperar de cada prueba (y qué NO asumir)

1. **Entorno.** Siempre debería "pasar" (solo reporta datos, no depende de permisos). Lo importante: `contexto seguro (HTTPS)` debe decir `true` una vez que la URL sea `https://...` de GitHub Pages; `display-mode standalone` y `navigator.standalone` dicen si estás en Safari normal (`false`) o ya instalada a pantalla de inicio (`true`); `service worker: registrado` confirma que el cache offline cargó.
2. **Micrófono.** Te va a pedir permiso de micrófono la primera vez — acéptalo. Si todo va bien, graba 4 segundos y te deja un reproductor de audio abajo para confirmar que se escucha lo que grabaste. Anota qué `mimeType` reportó (en iOS suele ser `audio/mp4`).
3. **Reconocimiento de voz.** **No asumas que existe.** Si tu versión de iOS/Safari no lo soporta, el resultado dirá claramente "no existe en este navegador" — eso es un resultado válido, no un error mío. Si sí existe, te pedirá permiso de micrófono (de nuevo) y escuchará ~8 segundos; habla en inglés y deberías ver texto parcial mientras hablas y el texto final al terminar.
4. **Síntesis de voz.** Lista las voces en-* instaladas en tu iPhone y reproduce una frase en inglés con la primera. Si no hay voces en-*, lo dice explícitamente (no debería pasar en un iPhone normal, pero si pasa, es un dato real, no lo voy a inventar).
5. **Notificaciones.** Primero solo reporta si `Notification` existe y el permiso actual. El botón "Pedir permiso" aparece después y dispara el diálogo real al tocarlo. **No asumas que funciona fuera del modo instalado** — en Safari normal (pestaña, no instalada a pantalla de inicio) es común que no haya soporte real aunque la API exista; lo que importa es lo que efectivamente reporte tu teléfono, no lo que "debería" pasar.

Cada prueba muestra el resultado y, si falla, el mensaje de error tal cual lo da el navegador (sin que yo lo interprete) — cópialo igual, aunque no lo entiendas, para que yo lo lea después.

## Qué hacer tú, paso a paso

1. Abre en Safari (iPhone) la URL que te dé una vez activado GitHub Pages, con `/prueba/` al final (p. ej. `https://natzukyy.github.io/english-app/prueba/`).
2. Corre las 5 pruebas en orden, de arriba hacia abajo, aceptando los permisos que te pida (micrófono, notificaciones).
3. Sin salir de Safari todavía: toca "Compartir" → "Agregar a pantalla de inicio" para instalar la PWA.
4. Abre la app ya instalada (ícono en tu pantalla de inicio, no la pestaña de Safari) y repite ahí las pruebas **1 y 5** (entorno y notificaciones) — son las dos que pueden comportarse distinto una vez instalada vs. en una pestaña normal de Safari.
5. Toca "Copiar reporte" (puedes hacerlo tanto en Safari como en la app instalada, o ambas si quieres comparar) y pégame el resultado en el chat.

No hace falta que hagas nada más con el micrófono o el reconocimiento de voz — eso no está conectado a la app principal todavía, es solo para saber qué es viable antes de construirlo ahí.
