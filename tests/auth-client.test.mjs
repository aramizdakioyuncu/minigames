import test from 'node:test';
import assert from 'node:assert/strict';
import { AuthClient } from '../web/js/auth/authClient.js';

const key = 'minigames_phatsa_session_v1';
const session = (id = 'one') => ({ access_token: `access.${id}`, refresh_token: `rt_${id}`, expires_at: Date.now() + 3600000, user: { id, email: `${id}@example.com`, full_name: id } });
const reply = (data, status = 200) => new Response(JSON.stringify(status === 200 ? { data } : { error: { code: 'invalid_token', message: 'Session invalid' } }), { status, headers: { 'content-type': 'application/json' } });
function fixture(t, fetchImpl) {
  const saved = new Map();
  const storage = { getItem: k => saved.get(k), setItem: (k, v) => saved.set(k, v), removeItem: k => saved.delete(k) };
  const client = new AuthClient({ storage, fetchImpl });
  t.after(() => client.clear());
  return { client, saved };
}
test('browser auth: restore verifies server identity instead of trusting stored user', async t => {
  const { client, saved } = fixture(t, async (url, options) => {
    assert.equal(url, '/api/auth/me');
    assert.equal(options.headers.Authorization, 'Bearer access.one');
    return reply({ user: session('verified').user });
  });
  saved.set(key, JSON.stringify(session()));
  assert.equal((await client.restore()).user.id, 'verified');
  assert.equal(client.session.user.id, 'verified');
});
test('browser auth: concurrent expiry refresh is single-flight and stores rotated pair', async t => {
  let calls = 0;
  const { client, saved } = fixture(t, async () => { calls++; await new Promise(r => setTimeout(r, 20)); return reply(session('new')); });
  client.commit({ ...session(), expires_at: Date.now() + 30000 });
  const tokens = await Promise.all([client.getAccessToken(), client.getAccessToken(), client.getAccessToken()]);
  assert.deepEqual(tokens, ['access.new', 'access.new', 'access.new']);
  assert.equal(calls, 1);
  assert.equal(JSON.parse(saved.get(key)).refresh_token, 'rt_new');
});
test('browser auth: late refresh cannot resurrect an explicitly cleared account', async t => {
  let resolve;
  const { client, saved } = fixture(t, () => new Promise(r => { resolve = r; }));
  client.commit(session());
  const pending = client.refresh();
  client.clear();
  resolve(reply(session('late')));
  await pending;
  assert.equal(client.session, null);
  assert.equal(saved.has(key), false);
});
test('browser auth: revoked refresh clears persisted credentials and notifies observers', async t => {
  const { client, saved } = fixture(t, async () => reply(null, 401));
  client.commit(session());
  let latest = 'unchanged'; client.onChange(value => { latest = value; });
  await assert.rejects(client.refresh());
  assert.equal(latest, null);
  assert.equal(saved.has(key), false);
});
test('browser auth: email verification registration creates no local session', async t => {
  const { client, saved } = fixture(t, async () => reply({ user: session().user, session: null, emailVerificationRequired: true }));
  const result = await client.register({ email: 'one@example.com', password: 'LongPassword123', fullName: 'User One' });
  assert.equal(result.emailVerificationRequired, true);
  assert.equal(client.session, null);
  assert.equal(saved.size, 0);
});
test('browser auth: logout clears local credentials even if remote service is down', async t => {
  const { client, saved } = fixture(t, async () => { throw new TypeError('offline'); });
  client.commit(session());
  await assert.rejects(client.logout());
  assert.equal(client.session, null);
  assert.equal(saved.size, 0);
});
