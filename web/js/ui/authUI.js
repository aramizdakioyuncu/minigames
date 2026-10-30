import { authClient } from '../auth/authClient.js';
import { profileManager } from '../auth/profileManager.js';

export class AuthUIController {
  constructor(app) {
    this.app = app;
    this.mode = 'guest';
    this.form = document.getElementById('auth-form');
    this.message = document.getElementById('auth-message');
    this.busy = false;
    document.querySelectorAll('[data-auth-mode]').forEach(button => button.addEventListener('click', () => this.setMode(button.dataset.authMode)));
    this.form.addEventListener('submit', event => { event.preventDefault(); this.submit(); });
    document.getElementById('btn-auth-resend').addEventListener('click', () => this.resend());
    document.getElementById('btn-auth-logout').addEventListener('click', () => this.logout());
    document.getElementById('btn-profile-login').addEventListener('click', () => {
      this.app.ui.profileUIController.closeProfileDashboard();
      this.app.socket.leaveRoom();
      this.app.accountTransition = true;
      this.app.ui.showView('view-profile');
      this.setMode('login');
    });
    authClient.onChange(session => this.sessionChanged(session));
    this.ready = this.restore();
  }
  async restore() {
    this.setBusy(true);
    const url = new URL(location.href);
    const token = (url.pathname === '/verify-email' || url.searchParams.get('auth') === 'verify') ? url.searchParams.get('token') : null;
    if (token) {
      url.searchParams.delete('token'); url.searchParams.delete('auth');
      history.replaceState(null, '', '/' + url.search + url.hash);
    }
    try {
      await authClient.restore();
      if (token) {
        await authClient.request('/verify-email', { token });
        this.setMode('login');
        this.showMessage('E-posta adresin doğrulandı. Giriş yapabilirsin.', true);
      }
    } catch (error) { this.showMessage(error.message); }
    finally { this.setBusy(false); }
  }
  setBusy(busy) {
    this.busy = busy;
    this.form.querySelectorAll('input, button').forEach(el => { el.disabled = busy || (el.id === 'auth-full-name' && this.mode !== 'register'); });
    document.querySelectorAll('[data-auth-mode]').forEach(el => { el.disabled = busy; });
    document.getElementById('btn-enter-lobby').disabled = busy;
    document.getElementById('btn-auth-logout').disabled = busy;
    document.getElementById('btn-profile-logout').disabled = busy;
    this.form.setAttribute('aria-busy', String(busy));
  }
  showMessage(message = '', success = false) {
    this.message.textContent = message;
    this.message.classList.toggle('success', success);
  }
  setMode(mode) {
    this.mode = mode;
    this.showMessage();
    const register = mode === 'register';
    document.querySelectorAll('[data-auth-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.authMode === mode)));
    this.form.classList.toggle('hidden', mode === 'guest' || Boolean(authClient.session));
    document.getElementById('guest-customization').classList.toggle('hidden', mode !== 'guest' && !authClient.session);
    document.getElementById('auth-name-group').classList.toggle('hidden', !register);
    document.getElementById('auth-full-name').required = register;
    document.getElementById('auth-full-name').disabled = this.busy || !register;
    document.getElementById('auth-password').minLength = register ? 8 : 1;
    document.getElementById('auth-password').autocomplete = register ? 'new-password' : 'current-password';
    document.getElementById('auth-password').value = '';
    document.getElementById('btn-auth-submit').textContent = register ? 'Hesap Oluştur' : 'Giriş Yap';
    document.getElementById('btn-auth-resend').classList.add('hidden');
  }
  sessionChanged(session) {
    const previous = profileManager.getProfile();
    if (session) {
      profileManager.attachAccount(session.user);
      if (this.app.currentRoom?.authenticated) this.app.socket.send({ type: 'authenticate', accessToken: session.access_token });
    } else if (!previous.isGuest) {
      profileManager.detachAccount();
      this.app.accountTransition = true;
      this.app.socket.send({ type: 'authenticate', accessToken: null });
      this.app.currentRoom = null;
      this.app.lastGameState = null;
      this.app.input.resetKeys();
      this.app.ui.showView('view-profile');
    }
    document.getElementById('auth-account').classList.toggle('hidden', !session);
    document.getElementById('auth-tabs').classList.toggle('hidden', Boolean(session));
    document.getElementById('auth-account-name').textContent = session ? `${session.user.full_name} · ${session.user.email}` : '';
    this.app.ui.inputNickname.value = profileManager.getProfile().name;
    this.setMode('guest');
  }
  async submit() {
    if (this.busy || !this.form.reportValidity()) return;
    const mode = this.mode;
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const fullName = document.getElementById('auth-full-name').value.trim();
    this.showMessage(); this.setBusy(true);
    let signedIn = false;
    try {
      if (mode === 'register') {
        const result = await authClient.register({ email, password, fullName });
        if (!result.session) {
          this.setMode('login');
          this.showMessage('Hesabın oluşturuldu. E-postandaki doğrulama bağlantısını açtıktan sonra giriş yapabilirsin.', true);
          document.getElementById('btn-auth-resend').classList.remove('hidden');
        } else signedIn = true;
      } else { await authClient.login({ email, password }); signedIn = true; }
    } catch (error) {
      this.showMessage(error.message);
      if (error.code === 'email_not_verified') document.getElementById('btn-auth-resend').classList.remove('hidden');
    } finally {
      document.getElementById('auth-password').value = '';
      this.setBusy(false);
    }
    if (signedIn) this.app.ui.btnEnterLobby.click();
  }
  async resend() {
    const email = document.getElementById('auth-email').value.trim();
    if (this.busy || !document.getElementById('auth-email').reportValidity()) return;
    this.setBusy(true);
    try { await authClient.request('/resend-verification', { email }); this.showMessage('Uygun hesap için doğrulama e-postası gönderildi. Gelen kutunu kontrol et.', true); }
    catch (error) { this.showMessage(error.message); }
    finally { this.setBusy(false); }
  }
  async logout() {
    if (this.busy) return;
    this.setBusy(true);
    this.app.ui.profileUIController.closeProfileDashboard();
    try { await authClient.logout(); this.showMessage('Çıkış yapıldı.', true); }
    catch { this.showMessage('Bu cihazdan çıkış yapıldı; sunucuya ulaşılamadığı için uzaktaki oturum kapatılamadı.'); }
    finally { this.setBusy(false); }
  }
}
