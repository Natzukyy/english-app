# Prompt para Claude Code: app personal de inglés (PWA)

Pega esto como primer mensaje en una carpeta nueva (por ejemplo `~/ingles-app`).

---

Voy a construir contigo una app personal para llegar a nivel **B2 de inglés (CEFR) a finales de marzo de 2027**. Es solo para mí, así que no necesita cuentas, pagos ni nada multiusuario. Sigue mi CLAUDE.md global. Antes de empezar, lee este documento completo y hazme las preguntas que necesites (máx. 4) antes de escribir código.

## Quién soy y qué busco
- Soy Alex, estudiante de Ingeniería en Inteligencia Artificial. Mi nivel actual es incierto (yo creo B1 o B2; esto lo decide un diagnóstico, no yo).
- Entiendo bastante cuando leo y escucho. Me falla **hablar y escribir**. Prioridad: leer, hablar y escuchar, en ese orden de peso con énfasis en hablar.
- No quiero un curso tipo Duolingo (colores, frases sueltas). Quiero práctica con contenido real y útil para mí.
- Estudio sin horario fijo: a veces 5 minutos, a veces 30. Nada debe sentirse exigente ni castigar un día corto.
- Aún no decido a qué certificado apuntar (TOEFL, IELTS, Cambridge B2 First u otro). El diseño debe poder adaptarse después.

## Contenido (en este orden de fases)
1. **Fase 1 (desde el inicio):** carrera y futuro laboral. Lectura de documentación técnica y artículos de IA/programación, vocabulario técnico, comunicación profesional (correos, reuniones, entrevistas, explicar un proyecto, pedir ayuda, dar feedback).
2. **Fase 2:** situaciones cotidianas y de viaje, inglés coloquial.
3. **Fase 3 (activable a partir de ~1 a 2 meses de uso, no antes):** mis juegos y contenido en inglés. Solo un ajuste en la app que desbloquea ese modo; no lo construyas ahora.

## Mecánicas tipo Duolingo (a mi manera)
- **Diagnóstico inicial** que estime mi nivel por habilidad (lectura, escucha, habla, escritura) y me diga mis puntos débiles. Repetible cada pocas semanas para medir avance. Sé honesto en la app: es una estimación, no un certificado.
- **Racha** con mínimo de **5 minutos** para contar el día. Más tiempo suma XP, no es obligatorio. Congelador de racha (freeze) limitado.
- **XP, niveles y meta diaria flexible** (5 / 15 / 30 min a mi elección).
- **Repaso espaciado** de vocabulario y frases propias (implementa un algoritmo conocido como FSRS o SM-2 y explícame cuál elegiste y por qué).
- **Mapa de progreso hacia B2** con porcentaje por habilidad y fecha objetivo.
- **Interfaz mixta:** al inicio todo en español; conforme avanza mi nivel, la interfaz cambia gradualmente a inglés. Define tú los umbrales y pregúntame antes de fijarlos.
- Estética: visual, con colores **neón o pastel**. Usa la skill frontend-design.

## Plataformas y arquitectura
- **PWA** instalable (iPhone 11 Pro Max con iOS 27, y Mac con Safari). Debe funcionar bien en pantalla chica y en escritorio. Sin costo de App Store.
- Más adelante podría empaquetarse como app nativa (Capacitor), así que **no ates el código a cosas exclusivas del navegador sin necesidad**.
- Empieza **sin backend**. Guarda el progreso en el dispositivo (IndexedDB o similar) y ofréceme exportar/importar un respaldo, para pasar mi progreso entre iPhone y Mac. Si crees que conviene un backend para sincronizar, propónmelo con costos y riesgos, no lo agregues solo.
- Nunca pongas claves de API ni secretos en el código del cliente.
- Mi Mac tiene 8 GB de RAM: mantén el entorno de desarrollo ligero.

## Primer hito (antes de construir todo): prueba en dispositivo real
Haz una página mínima, desplegada con HTTPS (por ejemplo GitHub Pages; dime los pasos y qué necesitas de mí), para que yo pruebe en mi iPhone en Safari:
1. Permiso de micrófono y grabación de audio.
2. Reconocimiento de voz (Web Speech API u otra opción). **No asumas que funciona en iOS: verifícalo y dime el resultado.**
3. Síntesis de voz (voces en inglés disponibles).
4. Instalación a la pantalla de inicio y, si es viable, notificaciones para recordar la racha.
Con los resultados me dices qué se puede y qué no, y ajustamos el plan. Sé claro con los límites: por ejemplo, evaluar pronunciación comparando la transcripción con la frase objetivo es aproximado.

## Conversación con IA
Una pareja de conversación con un modelo de lenguaje necesitaría un servidor que guarde la clave de API y tendría costo. **No lo construyas en la fase 1.** Propón opciones (con costo estimado y riesgos) cuando termine el primer hito.

## Contenido y calidad
- Genera el contenido de la fase 1 tú mismo (lecturas, audios con síntesis de voz, ejercicios), alineado a niveles CEFR y verificado, no inventes datos técnicos.
- Avísame cuando algo sea una suposición tuya.

## Forma de trabajo
- Pasos pequeños y verificados. Plan corto antes de cambios grandes. Corre la app y las pruebas antes de decir que algo quedó.
- Pruebas automáticas para la lógica de racha, XP y repaso espaciado.
- Al terminar cada hito: revisa con las skills de auditoría (diseño/UX/accesibilidad) y con Security Guidance, y dime qué encontraste.
- No agregues funciones fuera de este alcance sin preguntarme.
- Crea un `CLAUDE.md` corto del proyecto (stack, comandos, decisiones). No repitas lo que ya está en mi CLAUDE.md global.
- Usa git desde el inicio, con commits pequeños.
