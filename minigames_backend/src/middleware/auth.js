import { ApiError } from '../errors.js';

export function requireAuth(service) {
  return async (req, _res, next) => {
    const match = /^Bearer ([A-Za-z0-9._~+\/-]+=*)$/i.exec(req.headers.authorization || '');
    if (!match || match[1].length > 8192) throw new ApiError(401, 'missing_token', 'Geçerli bir Bearer oturumu gerekli.');
    req.accessToken = match[1];
    // Check with Phatsa on every protected request, including revocation and banned accounts.
    req.user = await service.getUser(req.accessToken);
    next();
  };
}
