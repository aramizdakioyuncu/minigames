function integer(value, fallback, min, max, name) {
  const number = value === undefined || value === '' ? fallback : Number(value);
  if (!Number.isInteger(number) || number < min || number > max) throw new Error(`${name} is invalid`);
  return number;
}

export function loadConfig(env = process.env) {
  let phatsaUrl = (env.PHATSA_URL || '').trim();
  const phatsaKey = (env.PHATSA_API_KEY || '').trim();
  if (phatsaUrl) {
    let url;
    try { url = new URL(phatsaUrl); } catch { throw new Error('PHATSA_URL must be a valid origin'); }
    const localHttp = env.NODE_ENV !== 'production' && url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    const supportedPath = url.pathname === '/' || /^\/api\/v1\/?$/.test(url.pathname);
    if ((!localHttp && url.protocol !== 'https:') || url.username || url.password || url.search || url.hash || !supportedPath) {
      throw new Error('PHATSA_URL must be an HTTPS origin (loopback HTTP allowed in development)');
    }
    // The SDK appends /api/v1 itself; accept the API URL copied from the panel too.
    phatsaUrl = url.origin;
  }
  if (phatsaKey && !/^(pk|sk)_[A-Za-z0-9_-]+$/.test(phatsaKey)) throw new Error('PHATSA_API_KEY must be a Phatsa API key');
  const origins = (env.AUTH_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  for (const origin of origins) {
    let url;
    try { url = new URL(origin); } catch { throw new Error('AUTH_ALLOWED_ORIGINS must contain exact origins'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) throw new Error('AUTH_ALLOWED_ORIGINS must contain exact origins');
  }
  return Object.freeze({
    port: integer(env.PORT, 4100, 1, 65535, 'PORT'), host: env.HOST || '127.0.0.1',
    phatsaUrl: phatsaUrl.replace(/\/$/, ''), phatsaKey, configured: Boolean(phatsaUrl && phatsaKey),
    origins,
    // Only enable when the service is reachable exclusively through one trusted proxy.
    trustProxy: integer(env.AUTH_TRUST_PROXY, 0, 0, 1, 'AUTH_TRUST_PROXY'),
    timeoutMs: integer(env.PHATSA_TIMEOUT_MS, 8000, 100, 30000, 'PHATSA_TIMEOUT_MS'),
    rateLimit: integer(env.AUTH_RATE_LIMIT, 30, 1, 10000, 'AUTH_RATE_LIMIT'),
    rateWindowMs: 15 * 60 * 1000,
  });
}
