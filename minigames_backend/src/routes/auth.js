import { Router } from 'express';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';

const email = z.string().trim().toLowerCase().email().max(254);
const password = z.string().min(1).max(256);
const token = z.string().min(1).max(8192).regex(/^[A-Za-z0-9._~+\/-]+=*$/);
const login = z.strictObject({ email: email.optional(), username: z.string().trim().min(1).max(100).optional(), password })
  .refine(data => Boolean(data.email) !== Boolean(data.username), { path: ['email'], message: 'Exactly one identifier required' });

export function authRouter(service, config) {
  const router = Router();
  router.get('/health', (_req, res) => res.json({ status: 'ok', authConfigured: config.configured }));
  router.use(rateLimit({
    windowMs: config.rateWindowMs, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ error: { code: 'rate_limited', message: 'İstek sınırı aşıldı. Daha sonra tekrar deneyin.' }, requestId: req.requestId }),
  }));
  const limiter = rateLimit({
    windowMs: config.rateWindowMs, limit: config.rateLimit, standardHeaders: 'draft-8', legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ error: { code: 'rate_limited', message: 'Çok fazla deneme yapıldı. Daha sonra tekrar deneyin.' }, requestId: req.requestId }),
  });
  // Login/register/refresh/email share a budget to prevent switching endpoints to bypass it.
  router.post(['/login', '/register', '/refresh', '/verify-email', '/resend-verification'], limiter);
  router.post('/register', validate(z.strictObject({ email, password: password.min(8), fullName: z.string().trim().min(2).max(120) })),
    async (req, res) => res.status(201).json({ data: await service.register(req.input) }));
  router.post('/login', validate(login), async (req, res) => res.json({ data: await service.login(req.input) }));
  router.post('/refresh', validate(z.strictObject({ refreshToken: token })), async (req, res) => res.json({ data: await service.refresh(req.input.refreshToken) }));
  router.post('/verify-email', validate(z.strictObject({ token })), async (req, res) => res.json({ data: await service.verifyEmail(req.input.token) }));
  router.post('/resend-verification', validate(z.strictObject({ email })), async (req, res) => res.json({ data: await service.resendVerification(req.input.email) }));
  router.get('/me', requireAuth(service), (req, res) => res.json({ data: { user: req.user } }));
  router.post('/logout', validate(z.strictObject({ everywhere: z.boolean().default(false) })), requireAuth(service),
    async (req, res) => res.json({ data: await service.logout(req.accessToken, req.input.everywhere) }));
  return router;
}
