import { askInventoryAgent } from '../src/inventory-agent.js';
import { pool } from '../models/db.js';

const rateLimits = new Map();

export function status(_req, res) {
  res.json({ configured: Boolean(process.env.GEMINI_API_KEY) });
}

export async function chat(req, res) {
  const now = Date.now();
  const ip = req.ip || req.socket.remoteAddress || 'local';
  const rate = rateLimits.get(ip);
  if (rate && rate.until > now && rate.count >= 10) {
    return res.status(429).json({
      error: 'Alcanzaste el límite de 10 consultas por minuto. Intenta de nuevo en un momento.',
    });
  }
  rateLimits.set(ip, rate && rate.until > now
    ? { count: rate.count + 1, until: rate.until }
    : { count: 1, until: now + 60000 });
  for (const [key, value] of rateLimits) {
    if (value.until <= now) rateLimits.delete(key);
  }

  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length < 1 || messages.length > 12) {
    return res.status(400).json({ error: 'Envía entre 1 y 12 mensajes de conversación.' });
  }
  const valid = messages.every((message) => (
    ['user', 'assistant'].includes(message?.role)
    && typeof message.content === 'string'
    && message.content.trim().length > 0
    && message.content.length <= 1200
  ));
  if (!valid || messages[messages.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'La conversación contiene mensajes inválidos.' });
  }

  try {
    res.json({ reply: await askInventoryAgent({ pool, messages }) });
  } catch (error) {
    if (error.code === 'GEMINI_KEY_MISSING') {
      return res.status(503).json({ error: error.message });
    }
    console.error(`Asistente Gemini: fallo del proveedor (HTTP ${error.status || 'sin estado'}).`);
    if (error.status === 429) {
      return res.status(429).json({
        error: 'Gemini alcanzó su límite de uso o cuota. Revisa la cuota de tu proyecto e inténtalo más tarde.',
      });
    }
    if (error.status === 503 || error.status === 504) {
      return res.status(error.status).json({
        error: 'Gemini está tardando en responder por alta demanda. Espera un momento y vuelve a intentar.',
      });
    }
    if (error.status === 401 || error.status === 403) {
      return res.status(502).json({
        error: 'Gemini rechazó la clave o el acceso al modelo. Revisa la clave y los permisos en Google AI Studio.',
      });
    }
    res.status(502).json({
      error: 'No se pudo consultar Gemini. Revisa la clave, el modelo y la configuración de la API.',
    });
  }
}
