export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const upstreamErrors = {
  auth_not_installed: [503, 'Phatsa projesinde Kimlik Doğrulama eklentisi kurulu veya etkin değil.'],
  identity_not_installed: [503, 'Phatsa projesinde Kullanıcılar & Roller eklentisi kurulu veya etkin değil.'],
  invalid_credentials: [401, 'E-posta/kullanıcı adı veya şifre hatalı.'],
  missing_token: [401, 'Oturum bilgisi gerekli.'],
  invalid_token: [401, 'Oturum geçersiz veya süresi dolmuş.'],
  invalid_refresh_token: [401, 'Oturumu yenilemek için tekrar giriş yapın.'],
  refresh_race: [409, 'Oturum başka bir istekle yenileniyor.'],
  email_not_verified: [403, 'Önce e-posta adresinizi doğrulayın.'],
  account_locked: [403, 'Hesaba erişim geçici olarak kilitlendi.'],
  user_banned: [403, 'Bu hesapla giriş yapılamıyor.'],
  user_inactive: [403, 'Bu hesapla giriş yapılamıyor.'],
  two_factor_unsupported: [403, 'Bu hesap farklı bir giriş yöntemi gerektiriyor.'],
  password_login_disabled: [403, 'Şifreyle giriş kapalı.'],
  registration_disabled: [403, 'Yeni kayıtlar kapalı.'],
  email_taken: [409, 'Bu bilgilerle kayıt tamamlanamadı.'],
  invalid_email: [400, 'Geçerli bir e-posta adresi girin.'],
  invalid_name: [400, 'Geçerli bir ad girin.'],
  weak_password: [400, 'Şifre Phatsa güvenlik koşullarını karşılamıyor.'],
  email_domain_not_allowed: [400, 'Bu e-posta alan adıyla kayıt yapılamıyor.'],
  invalid_verification_token: [400, 'Doğrulama bağlantısı geçersiz veya süresi dolmuş.'],
  email_not_configured: [503, 'E-posta servisi henüz yapılandırılmamış.'],
};

export function unwrap(result) {
  if (!result.error) return result.data;
  const error = result.error;
  const mapped = upstreamErrors[error.code];
  if (mapped) throw new ApiError(mapped[0], error.code, mapped[1]);
  if (error.status === 429) throw new ApiError(429, 'rate_limited', 'Çok fazla deneme yapıldı. Daha sonra tekrar deneyin.');
  if (error.status === 0) throw new ApiError(503, 'phatsa_unavailable', 'Kimlik servisine ulaşılamadı.');
  // Never relay upstream messages: they may include credentials, SQL or infrastructure details.
  throw new ApiError(502, 'phatsa_error', 'Kimlik servisi isteği tamamlayamadı.');
}
