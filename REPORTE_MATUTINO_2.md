# Reporte matutino 2 — habla, pruebas de integración y más contenido

Esto cubre la tarea nocturna que pediste después de la segunda ronda de diseño (esa ya
tiene su propio resumen en el chat y en `DECISIONES.md` D13-D17; aquí van los pasos A-D que
pediste después). Rama `noche-1` otra vez, un commit por paso, nunca hice `push` — **tienes
que correr `git push` tú desde tu Terminal para que esto llegue al repositorio remoto y lo
veas en tu iPhone.**

## Paso A — Ejercicio de habla (hecho)

Pantalla nueva en `#/habla`, a la que se llega tocando el nodo "habla" en Inicio. Usa
**solo** `SpeechRecognition` — nunca graba audio con `MediaRecorder`, así que no hay
conflicto de micrófono que resolver. El único cuidado real: el botón "Hablar" queda
deshabilitado mientras se reproduce el modelo con `App.TTS`, así nunca compiten por el
micrófono.

- `App.Habla.comparar(objetivo, transcripcion)` (nueva, con 9 pruebas unitarias) normaliza,
  alinea palabra por palabra y tolera errores chicos de reconocimiento (plural/singular,
  "two" vs "2"). El resultado se muestra como guía ("% parecido" + palabras a revisar), no
  como examen — nunca dice "FAIL".
- Maneja sin voz detectada, permiso denegado, error de red y sin soporte (con autoevaluación
  manual de respaldo), cada uno con mensaje claro y botón de reintentar.
- Usa `App.Datos.registrarSesion` tal cual ya existía — mismas reglas de XP/racha de
  siempre, no las toqué.
- **`requiere_prueba_iphone: true`**: la lógica está probada con tests; el micrófono real
  solo lo puedes probar tú.

## Paso B — Pruebas de integración de la capa de datos (hecho, pero sin correr)

`tests/integracion.html` corre 8 pruebas contra IndexedDB de verdad (sesión del día, sumar
minutos/XP, cambio de día, racha con/sin mínimo cumplido, congelaciones, exportar+importar,
respaldo malformado, respaldo con HTML, y repaso con SM-2). Usa su propia base de datos de
prueba y nunca toca la tuya.

Para esto, `js/core/storage.js` se volvió una fábrica (`App.Storage.crear(nombre, version)`)
— la app real sigue usando exactamente la misma base ("app-ingles", igual que siempre), cero
cambio de comportamiento ahí.

**No pude correr esta página yo mismo** (no tengo un navegador real disponible en esta
sesión, solo JavaScriptCore vía `osascript`, que no tiene IndexedDB). Tracé cada prueba a
mano contra los valores por defecto reales de `App.Racha`/`App.XP`/`App.SRS` y corregí un
error en mi propia prueba antes de dejarla (ver `DECISIONES.md` D19), pero **esto necesita
que tú la corras de verdad** — ver el checklist abajo.

## Paso C — Más contenido de fase 1 (hecho)

| Contenido | Antes | Ahora |
|---|---|---|
| Lecturas | 4 | 12 |
| Vocabulario | 20 | 60 |
| Frases útiles | ~34 | 55 |
| Ejercicios de habla | 8 | 24 |
| Banco del diagnóstico | 24 | 48 (4 por cada habilidad × nivel, perfectamente balanceado) |

Todo es texto original mío, marcado `revisar: true` donde el nivel CEFR es mi estimación.
Verifiqué cada archivo JSON con `json.load` (parsea sin errores), ids únicos, y que todas las
`respuestaCorrecta` caen dentro del rango de `opciones`.

**Hallazgo real que no arreglé, solo marqué:** en todas las preguntas del diagnóstico
escritas la noche anterior, la respuesta correcta siempre está en la opción 0. Alguien que
haga el diagnóstico con atención podría notarlo y adivinar sin saber inglés. No lo arreglé
porque la solución real (mezclar las opciones al renderizar) es un cambio de lógica, y este
paso pedía solo contenido. En las 24 preguntas nuevas sí varié la posición a propósito. Está
en `DECISIONES.md` D20 — dime si quieres que lo arregle en el código.

## Qué NO se hizo / quedó pendiente

- La ruta de "Tu camino" en Inicio (de la ronda de diseño) sigue teniendo solo 2 nodos
  (Diagnóstico, Repaso). Ahora que ya existe la pantalla de habla, se podría agregar un
  tercer nodo — no lo hice en esta tarea porque no se pidió explícitamente, pero es una
  extensión natural y barata si la quieres.
- No agregué una pestaña de navegación para "Habla" — se llega solo desde el nodo de
  inicio. Si prefieres que tenga su propia pestaña, dímelo (es un cambio de navegación, no
  de contenido).
- Las pruebas de integración (Paso B) están escritas pero no confirmadas corriendo de
  verdad — ver checklist.

## Decisiones que debes aprobar/revisar

1. Umbral de 60% en `App.Habla.comparar` para que un intento de habla cuente como
   "correcto" de cara al XP — número inventado por mí, igual de provisional que los demás.
2. El patrón de "respuesta siempre en la opción 0" del diagnóstico original (ver arriba) —
   decide si vale la pena el cambio de lógica para mezclarlas.
3. Todos los niveles CEFR nuevos (`revisar: true` en los 5 archivos) — son mi estimación,
   no la tomes como definitiva.

## Qué probar tú — checklist concreto

**En el iPhone (Safari, con `git push` ya hecho y Pages actualizado):**
1. Entra a Inicio, toca el nodo "habla" (icono de micrófono) → te lleva a `#/habla`.
2. Escucha el modelo (debería sonar automático al entrar), luego toca "Hablar" y di la
   frase — revisa que el resultado tenga sentido y que el micrófono se libere bien después
   (no debería seguir "escuchando" después de que termines).
3. Prueba un ejercicio de tipo "responder_prompt" (pregunta abierta) para confirmar que
   también funciona sin frase objetivo que comparar.
4. Prueba qué pasa si niegas el permiso de micrófono o si hablas sin que detecte nada —
   confirma que el mensaje de error y "Reintentar" se vean bien.

**En tu Mac (Safari o Chrome):**
1. Corre `python3 -m http.server 8000` desde la raíz del proyecto.
2. Abre `http://localhost:8000/tests/integracion.html`, toca "Correr todas las pruebas", y
   pégame el resultado (sobre todo si algo sale en rojo).
3. De paso, abre `http://localhost:8000` y revisa que el nodo de habla en Inicio y la
   pantalla nueva se vean bien con el resto del diseño.

**No olvides:** hacer `git push` desde tu Terminal para que todos estos commits lleguen al
repositorio remoto y los cambios se vean en tu iPhone.
