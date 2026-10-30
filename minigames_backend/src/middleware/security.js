import { randomUUID } from 'node:crypto';
import { ApiError } from '../errors.js';

export function requestContext(req, res, next) {
  req.requestId = randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  res.setHeader('Cache-Control', 'no-store');
  next();
}

export function cors(origins) {
  const allowed = new Set(origins);
  return (req, res, next) => {
    res.vary('Origin');
    const origin = req.headers.origin;
    if (origin) {
      // Empty list permits only same-origin browsers. CLI/server clients need no Origin.
      const sameOrigin = `${req.protocol}://${req.get('host')}`;
      if (!allowed.has(origin) && origin !== sameOrigin) throw new ApiError(403, 'origin_not_allowed', 'Bu kaynaktan gelen isteklere izin verilmiyor.');
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      res.setHeader('Access-Control-Expose-Headers', 'X-Request-Id, RateLimit, Retry-After');
    }
    if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
    next();
  };
}

export function errorHandler(logger = console) {
  return (error, req, res, _next) => {
    let safe = error;
    if (error.type === 'entity.too.large') safe = new ApiError(413, 'payload_too_large', 'İstek gövdesi çok büyük.');
    else if (error.type === 'entity.parse.failed') safe = new ApiError(400, 'invalid_json', 'Geçersiz JSON gövdesi.');
    else if (error.status === 415) safe = new ApiError(415, 'unsupported_media_type', 'Desteklenmeyen içerik biçimi.');
    if (!(safe instanceof ApiError)) safe = new ApiError(500, 'internal_error', 'İstek tamamlanamadı.');
    if (safe.status >= 500) logger.error({ requestId: req.requestId, status: safe.status, code: safe.code });
    res.status(safe.status).json({ error: { code: safe.code, message: safe.message, ...(safe.details ? { details: safe.details } : {}) }, requestId: req.requestId });
  };
}
