# Revisión del contenido existente (Tarea 4, rama `hey`)

Fecha de la revisión: 2026-11-20. Revisó Claude (IA) **leyendo cada elemento**, más comprobaciones automáticas (`tools/validar_contenido.py`). **No es una revisión humana ni de un hablante nativo**: todo conserva `revisar: true` para que Alex lo revise, y cada elemento lleva `revisionIA: "2026-11-20"`.

## Qué se revisó (conteos)

| Tipo | Elementos revisados |
|---|---|
| Tarjetas de vocabulario | 406 |
| Tarjetas de frases útiles (28 categorías) | 263 |
| Lecturas (A1–B2) / sus preguntas | 48 / 140 |
| Guiones de escucha (A1–B2) / sus preguntas | 48 / 115 |
| Ejercicios de habla (frases para repetir + preguntas abiertas) | 163 |
| Temas de escritura | 40 |
| Preguntas del banco del Diagnóstico | 48 |
| **Total** | **1 016 elementos (303 preguntas incluidas en ellos)** |

## Qué se corrigió, por tipo

| Tipo de problema | Cantidad | Qué se hizo |
|---|---|---|
| **Opción correcta mucho más larga que las demás** (da la respuesta sin saber; va contra tu regla de quizzes "opciones de largo y detalle parecidos") | **90 preguntas** (76 de 255 en lecturas/escucha y 14 de 48 en el Diagnóstico) | Se reescribieron los distractores con largo y detalle parecidos, sin tocar la opción correcta, su posición ni los ids. Ahora 0/255 y 1/48 quedan desbalanceadas (el validador exige ≤ 6 %). |
| Tarjetas **duplicadas** | 10 | Se **retiraron** (no se borraron): `retirada: true` + `duplicadoDe`. Quien ya las tenía conserva su estado SM-2 guardado, pero ya no aparecen en el repaso. Para no bajar de 150 tarjetas en B2 se agregaron 10 tarjetas B2 nuevas (`voc-f1-407` a `416`). |
| Nivel CEFR mal asignado | 2 tarjetas (`dataset`, `to debug`: A2 → B1) + 3 lecturas A2 con estructuras de B1 (se simplificaron al nivel A2, ver reescritos) | |
| Traducción o ejemplo incorrecto/poco preciso | 4 | `assignment`; dos frases (`That's actually a great question`, `Can I get this resolved today?`); modelo de escritura A1 ("Can I have" → "Can I borrow", que es lo que pide la consigna). |
| Lista de verificación que **contradice** el modelo | 3 | Escritura `a2-rutina-diaria` (pide first/then/after that/finally y el modelo solo usaba "finally"), `b1-producto-defectuoso` (pide dónde lo compraste) y `b1-problema-tecnico` (pide "eventually"). Se corrigió el modelo. |
| Gramática / ambigüedad | 2 | `uptime … 99%` (símbolo que la voz lee mal → "99 percent"); en el Diagnóstico `voc-b2-4` un distractor ("will finish") también era aceptable en estilo indirecto → se cambió por "has finished". |
| Texto sin sentido para la voz (abreviaturas, símbolos, dígitos en guiones) | 0 | Se revisó por búsqueda automática: no había. El validador ahora lo vigila. |
| Respuesta correcta mal marcada / explicación contradictoria | 0 | No encontré ninguna (ya se había corregido una en una sesión anterior). Las lecturas/escuchas no tienen campo de explicación. |

## Qué se reescribió por naturalidad (34 elementos)

- 24 ejemplos de tarjetas A2–B2 pasaron a contracciones naturales (`I cannot` → `I can't`, `Let us` → `Let's`, `It is` → `It's`…). Los A1 conservan las formas completas a propósito (forman parte de la lección: "I am", "It is").
- 6 frases con **"table"/"park"** (ambiguas: en inglés de EE. UU. "table" es posponer, en británico es poner sobre la mesa) → `put this on hold`, `save that for the end`, `pause this topic`; y 2 que sonaban a libro de texto (`In my opinion, it is a good idea` → `I think it's a good idea`; `It seems to me that it is too early` → `I feel like it's a bit too early`).
- 1 frase de habla (`shadow-49`, mismo caso de "table").
- 3 lecturas A2 simplificadas (`pedir-ayuda`, `preparar-demo`, `docs-tecnicos`): usaban pasado perfecto continuo, "so he wouldn't…", etc. (B1). Mismas preguntas y respuestas.

**Ids intactos:** no cambió ningún id de tarjeta ni de pregunta, ni el orden de las frases dentro de cada categoría (el id de cada frase depende de su posición). Probado en `tests/integracion.html` ("tarjetas retiradas…": la retirada conserva su SM-2, la que nunca existió no se crea y ninguna se repasa).

## 15 ejemplos antes / después

| # | Dónde | Antes | Después |
|---|---|---|---|
| 1 | Pregunta `lec-fase1-explicar-proyecto-ia-p1` (distractores) | *To replace all support agents with a chatbot* · *To delete old support tickets automatically* · *To translate support tickets into other languages* (correcta: 74 caracteres vs ~44) | *To replace all of the support agents with an automatic chatbot* · *To delete old support tickets that nobody has answered in months* · *To translate every support ticket into several other languages* |
| 2 | Pregunta `esc-fase1-a1-clima-hoy-p2` | *Sunny* / *Rainy* / **Cloudy and a little cold** / *Very hot* | *Sunny and a little warm* / *Rainy and very windy* / **Cloudy and a little cold** / *Very hot all day* |
| 3 | Diagnóstico `esc-c1-2` | *Asking for help is always a bad sign* … (correcta: 65 vs ~40) | *Asking for help is always a bad sign for an engineer* · *Only inexperienced engineers ever ask questions at work* · *Credibility is completely unrelated to asking questions* |
| 4 | Diagnóstico `voc-b2-4` | *will finish* / *finishes* / **would finish** / *finish* | *has finished* / *finishes* / **would finish** / *finish* |
| 5 | Tarjeta `voc-f1-99` (warranty) | The laptop still has warranty. | The laptop is still under warranty. |
| 6 | Tarjeta `voc-f1-372` (tackle) | Let us tackle the biggest problem first. | Let's tackle the biggest problem first. |
| 7 | Tarjeta `voc-f1-28` (uptime) | …was above 99%. | …was above 99 percent. |
| 8 | Tarjeta `voc-f1-107` (assignment) | tarea asignada (igual que *action item*) | tarea / trabajo asignado (escolar) |
| 9 | Frase `reuniones#1` | I think we should table this for now. — Creo que deberíamos dejar esto para después. | I think we should put this on hold for now. — Creo que deberíamos dejar esto en pausa por ahora. |
| 10 | Frase `opiniones_simples#5` | It seems to me that it is too early. | I feel like it's a bit too early. |
| 11 | Frase `problemas_cotidianos#6` (traducción) | ¿Puedo resolver esto hoy? (*Can I get this resolved today?*) | ¿Se puede resolver esto hoy? |
| 12 | Habla `shadow-49` | I'd like to table this discussion until we have more context. | I'd like to put this discussion on hold until we have more context. |
| 13 | Escritura `a2-rutina-diaria` (modelo; la lista pide first/then/after that/finally) | I usually wake up… In the afternoon… In the evening… Finally… | First, I wake up… Then, in the afternoon… After that, I have dinner… Finally… |
| 14 | Escritura `a1-pedir-ayuda-simple` (la consigna pide *pedir prestado*) | Can I have your English book, please? | Can I borrow your English book, please? |
| 15 | Lectura `lec-fase1-pedir-ayuda` (A2) | Mateo **had been stuck** on the same bug for almost an hour. **Instead of continuing to guess**, he messaged a teammate… | Mateo had a bug in his code. He tried to fix it for almost one hour, but he could not. Then he sent a message to a teammate… |

## Lo que dudo (no lo pude verificar)

1. **Niveles CEFR de las tarjetas y textos**: son mi criterio, no una lista oficial (no tengo una lista de vocabulario por nivel sin internet; no la usé). Moví solo los casos claros. Hay tarjetas que podrían subir/bajar un nivel (p. ej. `feedback` o `deadline` marcadas A2 son préstamos muy comunes pero formalmente B1).
2. **Variantes del español mexicano** (`chamarra`, `recámara`, `platicamos`, `atorado`, `viaje redondo`): las dejé tal cual porque parecen intencionales para Alex; si prefieres español neutro hay que decidirlo.
3. **Inglés americano vs. británico** (`queue`, `platform`, `flat`…): el contenido mezcla; no lo unifiqué.
4. **Escuchas con varios hablantes**: la voz sintética lee todo con una sola voz y sin indicar quién habla; algunos diálogos (`compras-roomie`, `cambio-carrera`) se entienden mejor en texto que en audio.
5. **Lecturas B2 largas** (`debate-ia-educacion`, `privacidad-apps`, `automatizacion-empleo`) rozan el nivel C1 por vocabulario; las dejé en B2 porque el contenido de C1 nuevo ya cubre ese salto.
6. **Distractores nuevos**: los redacté para que sean claramente incorrectos según el texto, pero conviene que un humano confirme que ninguno resulta defendible.
7. No revisé el **audio real** (TTS en iPhone): solo el texto.
