const STORAGE_KEY = 'minigames_phatsa_session_v1';
export class AuthClient {
  constructor({ fetchImpl = (...args) => fetch(...args), storage } = {}) {
    this.fetchImpl = fetchImpl;
    try { this.storage = storage === undefined ? globalThis.sessionStorage : storage; } catch { this.storage = null; }
    this.session = null;
    this.listeners = new Set();
    this.generation = 0;
    this.refreshing = null;
  }
  onChange(callback) { this.listeners.add(callback); return () => this.listeners.delete(callback); }
  notify() { for (const callback of this.listeners) callback(this.session); }
  async request(path, body, token) {
    let response;
    try {
      response = await this.fetchImpl(`/api/auth${path}`, {
        method: body === undefined ? 'GET' : 'POST', credentials: 'omit', cache: 'no-store',
        headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(12000),
      });
    } catch { throw Object.assign(new Error('Sunucuya ulaşılamadı. Bağlantını kontrol edip tekrar dene.'), { code: 'network_error' }); }
    const json = await response.json().catch(() => null);
    if (!response.ok) throw Object.assign(new Error(json?.error?.message || 'İşlem tamamlanamadı. Tekrar dene.'), { code: json?.error?.code || 'request_failed', status: response.status });
    if (!json?.data) throw new Error('Sunucudan geçersiz yanıt alındı.');
    return json.data;
  }
  validSession(session) {
    return session && typeof session.access_token === 'string' && session.access_token.length > 0 &&
      typeof session.refresh_token === 'string' && session.refresh_token.length > 0 && Number.isFinite(session.expires_at) &&
      typeof session.user?.id === 'string' && typeof session.user?.full_name === 'string' && typeof session.user?.email === 'string';
  }
  commit(session, generation = this.generation) {
    if (generation !== this.generation) return null;
    if (!this.validSession(session)) throw new Error('Geçersiz oturum yanıtı.');
    this.session = session;
    try { this.storage?.setItem(STORAGE_KEY, JSON.stringify(session)); } catch { /* In-memory login still works. */ }
    clearTimeout(this.timer);
    // Also renew the game server's five-minute authentication lease.
    this.timer = setTimeout(() => this.refresh().catch(() => {
      if (this.session) this.timer = setTimeout(() => this.refresh().catch(() => this.clear()), 15000);
    }), Math.max(1000, Math.min(240000, session.expires_at - Date.now() - 60000)));
    this.timer.unref?.();
    this.notify();
    return session;
  }
  clear() {
    this.generation++;
    clearTimeout(this.timer);
    this.session = null;
    try { this.storage?.removeItem(STORAGE_KEY); } catch { /* Storage can be disabled. */ }
    this.notify();
  }
  async restore() {
    const generation = this.generation;
    let saved;
    try { saved = JSON.parse(this.storage?.getItem(STORAGE_KEY) || 'null'); } catch { saved = null; }
    if (!this.validSession(saved)) { this.clear(); return null; }
    this.session = saved;
    try {
      const token = await this.getAccessToken();
      let data;
      try { data = await this.request('/me', undefined, token); }
      catch (error) {
        if (error.status !== 401) throw error;
        await this.refresh();
        data = await this.request('/me', undefined, this.session.access_token);
      }
      if (generation !== this.generation || !this.session) return null;
      return this.commit({ ...this.session, user: data.user }, generation);
    } catch (error) { if (generation === this.generation) this.clear(); throw error; }
  }
  async login(input) {
    const generation = this.generation;
    return this.commit(await this.request('/login', input), generation);
  }
  async register(input) {
    const generation = this.generation;
    const result = await this.request('/register', input);
    if (result.session) this.commit(result.session, generation);
    return result;
  }
  async refresh() {
    if (this.refreshing) return this.refreshing;
    if (!this.session) throw new Error('Tekrar giriş yapmalısın.');
    const generation = this.generation;
    const refreshToken = this.session.refresh_token;
    this.refreshing = this.request('/refresh', { refreshToken }).then(data => this.commit(data, generation)).catch(error => {
      if ([401, 403].includes(error.status) && generation === this.generation) this.clear();
      throw error;
    }).finally(() => { this.refreshing = null; });
    return this.refreshing;
  }
  async getAccessToken() {
    if (!this.session) return null;
    if (this.session.expires_at - Date.now() < 60000) await this.refresh();
    if (!this.session) throw new Error('Oturum sona erdi. Tekrar giriş yapmalısın.');
    return this.session.access_token;
  }
  async logout() {
    if (this.refreshing) await this.refreshing.catch(() => {});
    const token = this.session?.access_token;
    this.clear();
    if (token) await this.request('/logout', { everywhere: false }, token);
  }
}
export const authClient = new AuthClient();
