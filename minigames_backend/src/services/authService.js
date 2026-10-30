import { createClient } from '@phatsa/client';
import { z } from 'zod';
import { ApiError, unwrap } from '../errors.js';

const userSchema = z.object({
  id: z.string().min(1), email: z.string(), full_name: z.string(), role: z.string(),
  phone: z.string().nullable().optional(), created_at: z.string().optional(),
});
const sessionSchema = z.object({
  access_token: z.string().min(1), refresh_token: z.string().min(1),
  expires_at: z.number().finite().positive(), user: userSchema,
});
function checked(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) throw new ApiError(502, 'invalid_phatsa_response', 'Kimlik servisinden geçersiz yanıt alındı.');
  return result.data;
}

export function createAuthService(config, fetchImpl = globalThis.fetch) {
  function client() {
    if (!config.configured) throw new ApiError(503, 'phatsa_not_configured', 'Phatsa bağlantı bilgileri henüz yapılandırılmadı.');
    // A fresh client for each operation: no shared users, persisted passwords or refresh timers.
    return createClient(config.phatsaUrl, {
      key: config.phatsaKey, storage: false, autoRefresh: false, warnings: false,
      fetch: (url, options) => {
        if (new URL(url).origin !== new URL(config.phatsaUrl).origin) throw new Error('Unexpected upstream origin');
        return fetchImpl(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(config.timeoutMs) });
      },
    });
  }
  async function call(operation) {
    try { return unwrap(await operation(client())); }
    catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(502, 'invalid_phatsa_response', 'Kimlik servisinden geçersiz yanıt alındı.');
    }
  }
  // SDK 0.6.2 has no public setSession API. Use its request transport for explicit
  // bearer/refresh tokens; never fabricate a user or mutate private SDK session fields.
  function bearer(token) { return { session: false, headers: { authorization: `Bearer ${token}` } }; }
  return {
    async register(input) {
      return checked(z.object({ user: userSchema, session: sessionSchema.nullable(), emailVerificationRequired: z.boolean() }),
        await call(c => c.auth.signUp(input)));
    },
    async login(input) { return checked(sessionSchema, await call(c => c.auth.signIn(input))); },
    async getUser(token) {
      const data = await call(c => c.request('GET', '/auth/user', bearer(token)));
      return checked(userSchema, data?.user);
    },
    async refresh(refreshToken) {
      const data = await call(c => c.request('POST', '/auth/refresh', { session: false, body: { refresh_token: refreshToken } }));
      const raw = checked(z.object({ access_token: z.string().min(1), refresh_token: z.string().min(1), expires_in: z.number().positive(), user: userSchema }), data);
      return checked(sessionSchema, { ...raw, expires_at: Date.now() + raw.expires_in * 1000 });
    },
    async logout(token, everywhere) {
      const data = await call(c => c.request('POST', '/auth/logout', { ...bearer(token), body: { everywhere } }));
      return checked(z.object({ ok: z.literal(true) }), data);
    },
    async verifyEmail(token) {
      return checked(z.object({ verified: z.literal(true), email: z.string().nullable() }), await call(c => c.auth.verifyEmail(token)));
    },
    async resendVerification(email) {
      return checked(z.object({ ok: z.literal(true) }), await call(c => c.auth.resendVerification(email)));
    },
  };
}
