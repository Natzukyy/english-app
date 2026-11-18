# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Alex únicamente. Es una app personal, sin cuentas, sin multiusuario. Estudiante de Ingeniería en Inteligencia Artificial; nivel de inglés incierto (él estima B1 o B2, pero lo decide el diagnóstico de la app, no una suposición). Comprende bien al leer y escuchar; le falla hablar y escribir. Estudia sin horario fijo — a veces 5 minutos, a veces 30 — y nada debe sentirse exigente ni castigar un día corto.

## Product Purpose

Llevar a Alex a nivel B2 de inglés (CEFR) para finales de marzo de 2027, con prioridad lectura > hablar > escuchar (énfasis en hablar) y escritura también débil. La app diagnostica su nivel por habilidad, hace seguimiento de progreso hacia B2, y da práctica real (no frases sueltas de curso genérico).

## Positioning

No es una app tipo Duolingo (colores, frases sueltas, mascota). El contenido es real y útil para la situación de Alex, no genérico: empieza con su carrera y futuro laboral (fase 1), sigue con inglés cotidiano/viaje (fase 2), y solo después de 1–2 meses de uso se activa contenido personal de sus videojuegos (fase 3, como toggle, aún sin lógica construida).

Alex todavía no decide a qué certificado apuntar (TOEFL, IELTS, Cambridge B2 First u otro); el diseño debe poder adaptarse después a cualquiera de esas opciones.

## Operating Context

- Dispositivos reales: iPhone 11 Pro Max (iOS, Safari) y Mac (Safari). Debe verse bien en pantalla chica y en escritorio.
- Instalada como PWA a pantalla de inicio. Confirmado en dispositivo real (iOS 27, Safari 27.2): micrófono (`getUserMedia`+`MediaRecorder`) funciona; `SpeechRecognition` (en-US) funciona; `speechSynthesis` trae 26 voces en inglés; `Notification.requestPermission` da `granted` solo con la app instalada a pantalla de inicio (sin servidor push no hay recordatorios programados reales, solo notificaciones mientras la app está abierta).
- Sesiones irregulares, sin horario fijo. Mínimo de racha: 5 minutos para que cuente el día; más tiempo suma XP pero no es obligatorio.

## Capabilities and Constraints

- **Sin backend, sin cuentas, sin pagos.** Progreso guardado localmente (IndexedDB), con exportar/importar un respaldo JSON para mover el progreso entre iPhone y Mac.
- **Stack fijo y no negociable:** HTML/CSS/JS vanilla puro. Sin Node, sin npm, sin bundler, sin frameworks, sin dependencias externas (decisión explícita del proyecto, no abierta a recomendación). Scripts clásicos colgados de un namespace global `App.*`.
- **Contenido en 3 fases:** (1) desde el inicio — carrera y futuro laboral: lectura técnica, vocabulario técnico, comunicación profesional (correos, reuniones, entrevistas, feedback); (2) situaciones cotidianas y de viaje, inglés coloquial; (3) contenido personal de videojuegos de Alex, activable solo tras ~1–2 meses de uso, por ahora solo un ajuste/toggle sin lógica — no construir su lógica todavía.
- **Mecánicas ya implementadas:** diagnóstico que estima nivel CEFR por habilidad (repetible, presentado siempre como estimación, nunca como certificación); racha con mínimo de 5 min/día y congelador limitado; XP y niveles; meta diaria flexible (5/15/30 min); repaso espaciado con SM-2 (elegido sobre FSRS por no requerir historial previo); mapa de progreso hacia B2 con % por habilidad y fecha objetivo (2027-03-31); interfaz mixta que pasa gradualmente de español a inglés según días activos acumulados (umbrales editables, provisionales).
- **Práctica de habla:** usa únicamente las Web Speech API del navegador (`SpeechRecognition` + `speechSynthesis`), confirmado funcional en iPhone real. Grabar audio (`MediaRecorder`) y reconocer voz (`SpeechRecognition`) nunca al mismo tiempo; el micrófono siempre se libera al terminar cada uso, incluyendo rutas de error.
- **Conversación con un modelo de lenguaje (LLM): autorizada por Alex (D24), implementada del lado del cliente, pendiente de despliegue.** Usa un proxy serverless (Cloudflare Worker, código en `cloudflare/worker.js`) que guarda la clave de API como secreto del servidor — Alex debe crear sus propias cuentas (Cloudflare, Anthropic) y desplegar el proxy él mismo; hasta entonces la función existe en el código pero no hace nada (ver `REPORTE_CONVERSACION_IA.md`).
- **Requiere autorización explícita de Alex antes de tocarse:** despliegue (GitHub Pages, Cloudflare u otro), instalar Node/dependencias, crear cuentas o manejar pagos/claves de API en su nombre, contenido de videojuegos (fase 3).

## Brand Commitments

Sin nombre de marca ni identidad pública (uso personal). Ya existe una implementación visual (paleta, tipografía) construida con la skill frontend-design — es autoridad visual incumbente a preservar; sus detalles de diseño van en DESIGN.md, no aquí.

## Evidence on Hand

Contenido original escrito por el asistente en sesiones previas, verificado sintácticamente pero con niveles CEFR marcados `revisar: true` donde son una estimación razonada, no una certificación oficial:
- Banco de diagnóstico CEFR A2–C1 (lectura, escucha con texto para TTS, vocabulario/gramática).
- Rúbrica de autoevaluación CEFR para habla/escritura (parafraseada de escalas típicas, no cita textual de un documento oficial).
- 12 lecturas, 60 términos de vocabulario, 55 frases útiles, 24 ejercicios de habla (fase 1: carrera/comunicación profesional).

La app debe seguir mostrando estos resultados como estimación, nunca como certificación.

## Product Principles

1. Contenido real y útil sobre su situación, no frases sueltas de curso genérico — empezando por su carrera.
2. Nunca castigar un día corto: los mínimos y el encuadre deben seguir siendo alcanzables en 5 minutos; el progreso premia el esfuerzo extra sin exigirlo.
3. Honestidad sobre la incertidumbre: niveles de diagnóstico y autoevaluación son siempre estimaciones, nunca se presentan como certificación.
4. Huella mínima por diseño: cero backend, cero cuentas, cero dependencias externas; todo reversible y portátil (exportar/importar).
5. Adaptable sin atarse a una plataforma: no depender de APIs exclusivas del navegador sin necesidad, por si más adelante se empaqueta como app nativa (Capacitor).

## Accessibility & Inclusion

Contraste de color verificado ≥6.4:1 (WCAG AA, pasa AAA en casi todos los casos), botones táctiles ≥44px, `prefers-reduced-motion` respetado globalmente, foco de teclado visible en todos los elementos interactivos (todos son `<button>` nativos). Pendiente de verificar: VoiceOver en iPhone real.
