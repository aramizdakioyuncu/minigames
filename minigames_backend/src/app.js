import express from 'express';
import helmet from 'helmet';
import { ApiError } from './errors.js';
import { createAuthService } from './services/authService.js';
import { authRouter } from './routes/auth.js';
import { requestContext, cors, errorHandler } from './middleware/security.js';

export function createApp(config, { fetchImpl, logger = console } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy || false);
  app.use(requestContext, helmet(), cors(config.origins));
  app.use(express.json({ limit: '16kb', strict: true, inflate: false }));
  app.use('/api/auth', authRouter(createAuthService(config, fetchImpl), config));
  app.use((_req, _res, next) => next(new ApiError(404, 'not_found', 'Servis yolu bulunamadı.')));
  app.use(errorHandler(logger));
  return app;
}
