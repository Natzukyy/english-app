/* Proxy de la conversación con IA (ver DECISIONES.md D24, opción B).
   NO se despliega desde este repo ni con una CLI: se pega tal cual en el editor del panel
   web de Cloudflare Workers (ver REPORTE_CONVERSACION_IA.md para los pasos exactos). Guarda
   la clave de Anthropic como secreto del servidor -- el navegador de Alex nunca la ve.

   Variables de entorno que necesita (se configuran en el panel, no aquí):
   - ANTHROPIC_API_KEY (secreto): la clave de console.anthropic.com.
   - ALLOWED_ORIGIN (texto): el origen exacto de la app desplegada, p.ej.
     "https://alexusername.github.io". Sin esto, cualquiera podría usar el worker.
   - DAILY_LIMIT (texto, opcional): tope de peticiones por día (default 200 si no se pone).
   Binding necesario: un namespace de KV llamado CONTADOR_KV (para el límite diario). */

var MODELO_PERMITIDO = "claude-haiku-5-5";
var MAX_TOKENS_PERMITIDO = 300;
var VERSION_ANTHROPIC = "2023-06-01";

function respuestaCORS(origenPermitido, cuerpo, status) {
  return new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), {
    status: status || 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origenPermitido || "",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      Vary: "Origin"
    }
  });
}

async function obtenerContadorHoy(env) {
  var hoy = new Date().toISOString().slice(0, 10); // YYYY-MM-DD en UTC
  var clave = "conteo:" + hoy;
  var actual = parseInt((await env.CONTADOR_KV.get(clave)) || "0", 10);
  return { clave: clave, actual: actual };
}

export default {
  async fetch(request, env) {
    var origenPermitido = env.ALLOWED_ORIGIN;
    var origenPeticion = request.headers.get("Origin");

    if (request.method === "OPTIONS") {
      return respuestaCORS(origenPermitido, undefined, 204);
    }
    if (request.method !== "POST") {
      return respuestaCORS(origenPermitido, { error: "metodo_no_permitido" }, 405);
    }
    // Defensa real contra que alguien ajeno use el worker (y gaste la clave de Alex) si
    // encuentra la URL: el navegador manda el origen real y no se puede falsificar desde
    // una página web normal. Un cliente que no es un navegador (curl, etc.) sí podría
    // falsearlo -- por eso también existe el límite diario de abajo, como respaldo.
    if (!origenPeticion || origenPeticion !== origenPermitido) {
      return respuestaCORS(origenPermitido, { error: "origen_no_permitido" }, 403);
    }

    var limiteDiario = parseInt(env.DAILY_LIMIT || "200", 10);
    var contador = await obtenerContadorHoy(env);
    if (contador.actual >= limiteDiario) {
      return respuestaCORS(origenPermitido, { error: "limite_diario_alcanzado" }, 429);
    }

    var cuerpoCliente;
    try {
      cuerpoCliente = await request.json();
    } catch (e) {
      return respuestaCORS(origenPermitido, { error: "json_invalido" }, 400);
    }

    // Nunca confiar en el modelo/max_tokens que manda el cliente: se acotan aquí también
    // (defensa en profundidad, no solo en js/core/conversacion.js).
    var cuerpoAnthropic = {
      model: MODELO_PERMITIDO,
      max_tokens: Math.min(cuerpoCliente.max_tokens || MAX_TOKENS_PERMITIDO, MAX_TOKENS_PERMITIDO),
      system: String(cuerpoCliente.system || ""),
      messages: Array.isArray(cuerpoCliente.messages) ? cuerpoCliente.messages : []
    };

    var respuestaAnthropic = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": VERSION_ANTHROPIC
      },
      body: JSON.stringify(cuerpoAnthropic)
    });

    var json = await respuestaAnthropic.json().catch(function () {
      return null;
    });

    // Cuenta hacia el límite diario incluso si Anthropic devolvió un error (simplificación
    // a propósito: más simple que distinguir causas, y el límite es un respaldo de costo,
    // no una medida exacta -- ver DECISIONES.md D24).
    await env.CONTADOR_KV.put(contador.clave, String(contador.actual + 1), { expirationTtl: 60 * 60 * 36 });

    return respuestaCORS(origenPermitido, json, respuestaAnthropic.status);
  }
};
