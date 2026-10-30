// The browser supplies a token, never a trusted account id or role.
export async function verifyAccount(token, { fetchImpl = fetch, baseUrl = process.env.AUTH_SERVICE_URL || 'http://127.0.0.1:4100' } = {}) {
  if (typeof token !== 'string' || token.length > 7000 || !/^[A-Za-z0-9._~+\/-]+=*$/.test(token)) throw new Error('invalid_token');
  const response = await fetchImpl(new URL('/api/auth/me', baseUrl), {
    headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000), redirect: 'error',
  });
  if (!response.ok) throw new Error('account_verification_failed');
  const data = await response.json();
  if (typeof data?.data?.user?.id !== 'string' || !data.data.user.id) throw new Error('invalid_user');
  // The token has already been validated remotely. Its expiry only shortens the lease.
  let expiresAt = Date.now() + 300000;
  try {
    const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    if (Number.isFinite(claims.exp)) expiresAt = Math.min(expiresAt, claims.exp * 1000);
  } catch { /* An opaque token still gets a bounded five-minute lease. */ }
  if (expiresAt <= Date.now()) throw new Error('expired_token');
  return { id: data.data.user.id, expiresAt };
}
