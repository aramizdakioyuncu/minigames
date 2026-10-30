// profileUI.js - User Profile Dashboard, Social Logins, Level Progression & Stats UI

import { profileManager } from '../auth/profileManager.js';

export class ProfileUIController {
  constructor(ui) {
    this.ui = ui;
    this.modalProfileDashboard = document.getElementById('modal-profile-dashboard');
    this.bindEvents();
    this.renderUserProfileHeader();

    // Listen to profile updates & level-ups
    profileManager.onUpdate((profile) => {
      this.renderUserProfileHeader();
      this.updateDashboardModal(profile);
    });

    profileManager.onLevelUp((level, rankTitle) => {
      if (window.audio && typeof window.audio.playLevelUp === 'function') {
        window.audio.playLevelUp();
      }
      this.ui.showGoalBanner('🎉 SEVİYE ATLADINIZ!', `Tebrikler! Seviye ${level} oldunuz: ${rankTitle}`);
    });
  }

  bindEvents() {
    // Top header user chip & profile button -> open profile dashboard
    const userChip = document.getElementById('lobby-user-chip') || document.querySelector('.user-chip');
    if (userChip) {
      userChip.style.cursor = 'pointer';
      userChip.addEventListener('click', () => this.openProfileDashboard());
    }

    const btnOpenProfile = document.getElementById('btn-open-profile-modal');
    if (btnOpenProfile) {
      btnOpenProfile.addEventListener('click', () => this.openProfileDashboard());
    }

    // Close Profile Modal Button
    const btnCloseProfile = document.getElementById('btn-close-profile-modal');
    if (btnCloseProfile) {
      btnCloseProfile.addEventListener('click', () => this.closeProfileDashboard());
    }

    // Logout / Reset Guest Profile
    const btnLogout = document.getElementById('btn-profile-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        if (!profileManager.getProfile().isGuest) { window.gameApp?.authUI.logout(); return; }
        profileManager.logout();
        this.ui.showToast('🚪 Çıkış yapıldı. Yeni misafir profili oluşturuldu.');
        this.renderUserProfileHeader();
        this.closeProfileDashboard();
      });
    }
  }

  renderUserProfileHeader() {
    const p = profileManager.getProfile();
    const avatarBadge = document.getElementById('lobby-user-avatar');
    const loginButton = document.getElementById('btn-profile-login');
    if (loginButton) loginButton.classList.toggle('hidden', !p.isGuest);
    const logoutButton = document.getElementById('btn-profile-logout');
    if (logoutButton) logoutButton.textContent = p.isGuest ? 'Misafir Profilini Sıfırla' : 'Hesaptan Çıkış Yap';
    const nameText = document.getElementById('lobby-user-name');
    const levelBadge = document.getElementById('lobby-user-level-badge');
    const xpBar = document.getElementById('lobby-user-xp-bar');

    if (avatarBadge) avatarBadge.textContent = p.avatar || '⚽';
    if (nameText) nameText.textContent = p.name || 'Oyuncu';

    const neededXp = profileManager.getXpNeededForLevel(p.level);
    const progressPercent = Math.max(0, Math.min(100, ((p.xp || 0) / neededXp) * 100));

    if (levelBadge) {
      levelBadge.textContent = `Lv.${p.level}`;
      levelBadge.title = `${profileManager.getRankTitle(p.level)} (${p.xp}/${neededXp} XP)`;
    }

    if (xpBar) {
      xpBar.style.width = `${progressPercent}%`;
    }
  }

  openProfileDashboard() {
    if (!this.modalProfileDashboard) return;
    const p = profileManager.getProfile();
    this.updateDashboardModal(p);
    this.modalProfileDashboard.classList.remove('hidden');
  }

  closeProfileDashboard() {
    if (this.modalProfileDashboard) {
      this.modalProfileDashboard.classList.add('hidden');
    }
  }

  updateDashboardModal(p) {
    const neededXp = profileManager.getXpNeededForLevel(p.level);
    const progressPercent = Math.max(0, Math.min(100, ((p.xp || 0) / neededXp) * 100));
    const winRate = p.stats.matchesPlayed > 0 ? Math.round((p.stats.wins / p.stats.matchesPlayed) * 100) : 0;

    const modalAvatar = document.getElementById('modal-dash-avatar');
    const modalName = document.getElementById('modal-dash-name');
    const modalRank = document.getElementById('modal-dash-rank');
    const modalLevel = document.getElementById('modal-dash-level');
    const modalXpText = document.getElementById('modal-dash-xp-text');
    const modalXpFill = document.getElementById('modal-dash-xp-fill');
    const modalAuthStatus = document.getElementById('modal-dash-auth-status');

    if (modalAvatar) modalAvatar.textContent = p.avatar || '⚽';
    if (modalName) modalName.textContent = p.name || 'Oyuncu';
    if (modalRank) modalRank.textContent = profileManager.getRankTitle(p.level);
    if (modalLevel) modalLevel.textContent = `Seviye ${p.level}`;
    if (modalXpText) modalXpText.textContent = `${p.xp} / ${neededXp} XP (%${Math.round(progressPercent)})`;
    if (modalXpFill) modalXpFill.style.width = `${progressPercent}%`;

    if (modalAuthStatus) {
      modalAuthStatus.textContent = p.isGuest ? 'Misafir · Bu tarayıcıdaki profil' : `Hesap: ${p.email} · İstatistikler bu tarayıcıda`;
    }

    // Stats Grid
    const statWins = document.getElementById('stat-dash-wins');
    const statMatches = document.getElementById('stat-dash-matches');
    const statWinRate = document.getElementById('stat-dash-winrate');
    const statGoals = document.getElementById('stat-dash-goals');
    const statTasks = document.getElementById('stat-dash-tasks');
    const statConquests = document.getElementById('stat-dash-conquests');
    const statTotalXp = document.getElementById('stat-dash-total-xp');

    if (statWins) statWins.textContent = p.stats.wins || 0;
    if (statMatches) statMatches.textContent = p.stats.matchesPlayed || 0;
    if (statWinRate) statWinRate.textContent = `%${winRate}`;
    if (statGoals) statGoals.textContent = p.stats.goals || 0;
    if (statTasks) statTasks.textContent = p.stats.tasksCompleted || 0;
    if (statConquests) statConquests.textContent = p.stats.territoriesConquered || 0;
    if (statTotalXp) statTotalXp.textContent = p.totalXp || 0;
  }
}
