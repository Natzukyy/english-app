# Modo nocturno autónomo — App de inglés de Alex

Alex duerme. Vas a trabajar solo varias horas. No hay nadie para responder preguntas. Él revisa en la mañana.

## Antes de empezar
1. Lee `PROMPT_BASE.md` (el prompt completo del proyecto, en esta carpeta) y tu CLAUDE.md global. Todo lo que dicen sigue vigente.
2. Donde `PROMPT_BASE.md` te pide preguntar algo, NO preguntes: elige la opción más simple y reversible, y anótala en `DECISIONES.md` (qué elegiste, por qué, qué alternativa había) para que Alex la revise.
3. Para frontend usa la skill frontend-design. Para el cierre, usa security-guidance y las lentes de auditoría que tengas instaladas. Si alguna no está disponible, dilo en el reporte y sigue.

## Límites duros (no negociables)
- Trabaja SOLO dentro de la carpeta de este proyecto. No toques nada fuera (en especial `~/asistent`, `~/.claude`, ni archivos del sistema).
- Crea y usa la rama `noche-1`. Commits pequeños, uno por paso, con mensaje claro. Nunca `push`, nunca crees cuentas, nunca despliegues.
- No instales nada global. Dependencias del proyecto: las mínimas, y lístalas con su motivo en `DECISIONES.md`. Si puedes hacerlo sin dependencia, hazlo sin ella.
- No borres archivos que no hayas creado tú. No pongas secretos ni claves en el código.
- Sin alcance extra: nada de conversación con LLM, nada de contenido de videojuegos, nada que no esté en la lista de fases.
- No inventes datos. Todo contenido factual debe ser algo que sabes con seguridad; lo dudoso se marca como `revisar: true` en el dato.
- Si algo falla 2 veces, anótalo en `BLOQUEOS.md` y pasa a lo siguiente. No te quedes atorado.

## Control de parada (importante)
- Mantén `PROGRESS.md` actualizado: antes de cada paso escribe qué vas a hacer; al terminar, marca hecho y haz commit.
- Antes de cada paso revisa si existe un archivo llamado `STOP` en la raíz del proyecto. Si existe: termina el paso en curso, deja los tests pasando, haz commit, actualiza `PROGRESS.md` y detente.
- Si ves cualquier aviso de que te acercas al límite de uso, o de que se alcanzó: termina el paso actual (sin dejarlo a medias), commit, actualiza `PROGRESS.md` y detente. No empieces un paso nuevo.
- Nunca dejes el árbol de trabajo roto: cada commit debe dejar los tests pasando.

## Fases (en orden; cada una cierra con tests en verde + commit)
**0. Preparación.** `git init` si hace falta, rama `noche-1`, estructura de carpetas, CLAUDE.md corto del proyecto (sin repetir el global), `PROGRESS.md`, `DECISIONES.md`, `BLOQUEOS.md`. Elige el stack más ligero posible para una Mac de 8 GB (preferencia: JS/TS sin framework pesado) y justifícalo.

**1. Esqueleto PWA.** Manifest, service worker (offline básico), navegación, pantallas vacías, almacenamiento local en IndexedDB con exportar/importar respaldo, capa de textos i18n es/en con niveles de "cuánto inglés en la interfaz" (umbrales como configuración editable; valores provisionales anotados en DECISIONES).

**2. Lógica núcleo con pruebas.** Racha (mínimo 5 min/día, congelación limitada), XP y niveles, meta diaria flexible (5/15/30), repaso espaciado (elige FSRS o SM-2; explica la elección en DECISIONES en 5 líneas). Tests unitarios, incluyendo casos borde de zona horaria y cambio de día.

**3. Diagnóstico.** Motor por habilidad: lectura, escucha (sin audio real aún; usa interfaz de TTS del dispositivo detrás de una función que se pueda sustituir), vocabulario/gramática. Habla y escritura: autoevaluación con rúbrica CEFR, porque no se pueden calificar sin un modelo. Banco de preguntas A2–C1 con etiqueta de nivel CEFR, distractores plausibles y de largo parecido. Resultado: nivel estimado por habilidad y mapa hacia B2.

**4. Contenido de fase 1 (carrera y comunicación profesional).** Lecturas cortas con preguntas de comprensión, vocabulario y frases útiles: correos, reuniones, standups, explicar un proyecto de IA, entrevistas. Ejercicios de habla (shadowing y responder a un prompt) marcados `requiere_prueba_microfono: true`. Escala de dificultad A2→B2. Ponlo como datos (JSON), no dentro del código.

**5. Interfaz.** Mobile-first para iPhone 11 Pro Max y también usable en Safari de Mac. Estética neón/pastel, accesible (contraste, tamaños táctiles, `prefers-reduced-motion`). Pantallas: inicio con racha y meta, sesión de repaso, diagnóstico, progreso hacia B2, ajustes.

**6. Auditoría.** Corre security-guidance y una revisión de accesibilidad/código. Arregla lo menor; lo grande va a `BLOQUEOS.md`.

**7. Reporte matutino.** Crea `REPORTE_MATUTINO.md` con: qué quedó hecho, qué no, decisiones que Alex debe aprobar, riesgos, y una lista concreta de qué probar en el iPhone (micrófono, reconocimiento de voz, TTS, instalación, notificaciones).

## No hagas esto esta noche
Prueba real de micrófono/voz/notificaciones (requiere el iPhone), despliegue HTTPS, conversación con LLM, juegos.
