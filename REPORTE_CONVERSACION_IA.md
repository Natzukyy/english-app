# Reporte — Conversación con IA (D24): qué hice yo y qué te toca a ti

Esto es lo que pediste reconsiderar: `PROMPT_BASE.md` decía que te propusiera la
conversación con IA con costo/riesgo cuando terminara el primer hito (el de probar en tu
iPhone, ya hecho). Elegiste la opción B (proxy serverless con Cloudflare). Yo ya escribí y
probé todo el código del lado de la app; lo que falta son pasos que **solo tú puedes hacer**
porque implican crear cuentas y poner un método de pago — eso no lo hago yo por ti.

## Qué ya está hecho (y probado sin un Worker real)

- `js/core/conversacion.js`, `js/core/ia.js`, `js/screens/conversacion.js`: lógica, hook de
  red y pantalla nuevos. 11 tests nuevos, los 94 en total pasan (`./tests/run-tests.sh`).
- Cuarto nodo "Conversación con IA" en Inicio, campos de activar/URL en Ajustes.
- `cloudflare/worker.js`: el código del proxy, listo para pegar — ver abajo.
- Probé todo el flujo en el navegador local (servidor de prueba): el estado "no
  configurado", el selector de 7 escenarios, el saludo inicial con voz, un error real de
  CORS contra una URL que no existe (con su botón "Reintentar"), y el camino feliz completo
  simulando la respuesta del proxy. Encontré y arreglé un bug real en el camino: reintentar
  duplicaba el mensaje y el XP. Ver `DECISIONES.md` D24 para el detalle completo.

**Lo que no pude probar:** el proxy real contra Anthropic (necesita tu clave) y el
micrófono/voz real (necesita tu iPhone) — igual que ya pasaba con la pantalla de Habla.

## Lo que te toca a ti

### Paso 1 — Cuenta y clave de Anthropic (con tu propio método de pago)

1. Entra a **console.anthropic.com** y crea una cuenta (o inicia sesión si ya tienes una).
2. En la sección de facturación, agrega un método de pago. Es pago por uso (no suscripción
   fija) — con el modelo que uso (Claude Haiku 5.5, el más barato disponible), una
   conversación de práctica de ~20 turnos cuesta bien por debajo de 1 centavo de dólar;
   esas cifras las saqué de terceros, no de la página oficial de precios, así que
   verifícalas tú ahí antes de confiarte.
3. Ve a la sección de **API Keys** y crea una clave nueva. Cópiala a algún lugar seguro
   (gestor de contraseñas) — Anthropic normalmente solo la muestra una vez.

### Paso 2 — Cuenta de Cloudflare (gratis)

1. Entra a **dash.cloudflare.com** y crea una cuenta gratuita (no necesitas dominio propio
   ni tarjeta para esto — el plan gratis de Workers alcanza de sobra: 100,000
   peticiones/día).

### Paso 3 — Un namespace de KV (para el límite diario de seguridad)

1. En el panel de Cloudflare, busca **Workers & Pages** → **KV** (o usa el buscador del
   panel si el menú se ve distinto — Cloudflare cambia la interfaz de vez en cuando).
2. Crea un namespace nuevo, p. ej. `conversacion-contador`. Anota su nombre.

### Paso 4 — Crear el Worker y pegar el código

1. En **Workers & Pages**, crea un Worker nuevo (plantilla en blanco / "Hello World").
   Dale un nombre, p. ej. `app-ingles-conversacion`.
2. Abre su editor (en el panel web, "Quick edit" o el editor normal del Worker — no
   necesitas instalar nada en tu Mac para esto).
3. Borra el código de ejemplo y pega **todo** el contenido de
   [`cloudflare/worker.js`](cloudflare/worker.js) de este repo, tal cual.
4. Guarda/despliega.

### Paso 5 — Variables de entorno y el binding de KV

En la configuración del Worker (pestaña de variables/settings):

1. **Secreto** `ANTHROPIC_API_KEY`: pega tu clave del Paso 1. Asegúrate de guardarlo como
   **secreto** (encrypted), no como variable de texto plano.
2. **Variable de texto** `ALLOWED_ORIGIN`: el origen exacto de tu app ya desplegada en
   GitHub Pages. Importante: es solo `https://tu-usuario.github.io` (protocolo + dominio),
   **sin** la ruta de la subcarpeta ni barra al final — el navegador nunca manda la ruta en
   el header `Origin`, solo el origen. Si no sabes cuál es exactamente, abre tu app
   desplegada y dime la URL completa para confirmarlo juntos.
3. **Variable de texto** `DAILY_LIMIT` (opcional): un número como tope de peticiones por
   día. Si no la pones, el Worker usa 200 por defecto.
4. **Binding de KV**: conecta el namespace que creaste en el Paso 3 con el nombre de
   variable `CONTADOR_KV` (el código del Worker espera exactamente ese nombre).
5. Guarda y despliega de nuevo si el panel te lo pide tras cambiar variables.

### Paso 6 — Consigue la URL del Worker

Cloudflare te da una URL del tipo `https://app-ingles-conversacion.tu-cuenta.workers.dev`.
Cópiala completa.

### Paso 7 — Configúralo en la app

1. `git push` tus commits locales si no lo has hecho (yo nunca hago push, ver tu propia
   regla en reportes anteriores).
2. Abre la app (en tu iPhone o en tu Mac, ya desplegada — **no** el servidor local, porque
   `ALLOWED_ORIGIN` solo acepta tu dominio real de GitHub Pages).
3. Ve a **Ajustes** → pega la URL del Paso 6 en el campo de "Conversación con IA" → toca
   **Activar**.
4. Ve a **Inicio** → nodo "Conversación con IA" en "Tu camino", o entra directo a esa
   pantalla.

### Paso 8 — Pruébalo de verdad (checklist)

- [ ] Elige un escenario (p. ej. "Standup diario") → debe sonar un saludo en inglés.
- [ ] Toca "Hablar", di algo en inglés → debe transcribirse, mandarse, y la respuesta debe
      aparecer en una burbuja y leerse en voz alta.
- [ ] Prueba negar el permiso de micrófono → debe salir un mensaje claro y "Reintentar".
- [ ] Si usas un navegador de escritorio sin reconocimiento de voz, debe aparecer el campo
      de texto en vez de romperse.
- [ ] Toca "Terminar" → vuelve a Inicio y debe verse el tiempo/XP de esa sesión reflejado.
- [ ] Repite varias veces el mismo día y confirma que, si llegas a tu `DAILY_LIMIT`, sale
      el mensaje de límite diario alcanzado (puedes poner `DAILY_LIMIT` bajo, p. ej. 2,
      solo para esta prueba, y subirlo después).

## Si algo sale mal

- **Error "origen no permitido" (403):** `ALLOWED_ORIGIN` no coincide exactamente con el
  origen real desde el que abriste la app. Revísalo (sin ruta, sin barra final).
- **No se pudo conectar:** revisa que la URL en Ajustes esté completa y bien copiada, y que
  el Worker esté desplegado (no solo guardado).
- **Quieres apagarlo:** toca "Desactivar" en Ajustes — no borra nada, solo deja de llamar al
  proxy. Para revocar del todo: borra la clave en console.anthropic.com (sección API Keys) y,
  si quieres, borra el Worker en Cloudflare.

## Costo esperado

Con Claude Haiku 5.5 y `max_tokens` acotado a 300 por respuesta, el costo por turno de
conversación es fracciones de centavo; aun con uso diario moderado, debería ser centavos de
dólar al mes, no dólares — pero esto son cifras de terceros que encontré investigando, no de
la página oficial de precios de Anthropic, así que te recomiendo echarle un ojo ahí una vez
que tengas cuenta, antes de dejarlo corriendo sin supervisión por mucho tiempo.
