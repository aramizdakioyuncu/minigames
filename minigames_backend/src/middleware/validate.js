import { ApiError } from '../errors.js';

export function validate(schema) {
  return (req, _res, next) => {
    if (!req.is('application/json')) throw new ApiError(415, 'unsupported_media_type', 'Content-Type application/json olmalı.');
    const result = schema.safeParse(req.body);
    if (!result.success) {
      // Only field paths, never submitted values (especially passwords/tokens).
      const fields = [...new Set(result.error.issues.map(issue => issue.path.join('.') || 'body'))];
      throw new ApiError(400, 'validation_error', 'İstek alanlarını kontrol edin.', { fields });
    }
    req.input = result.data;
    next();
  };
}
