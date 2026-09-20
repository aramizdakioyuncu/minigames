// profileManager.js - User Authentication, Social Logins, Level & XP Progression Manager

export class ProfileManager {
  constructor() {
    this.storageKey = 'armoyu_player_profile_v2';
    this.profile = this.loadProfile();
    this.onProfileUpdateCallbacks = new Set();
    this.onLevelUpCallbacks = new Set();
  }

  getDefaultProfile() {
    const randomGuestId = Math.floor(1000 + Math.random() * 9000);
    return {
      id: 'guest_' + Math.random().toString(36).substring(2, 9),
      name: 'Misafir_' + randomGuestId,
      avatar: '⚽',
      color: '#3b82f6',
      isGuest: true,
      authProvider: 'guest', // 'guest', 'local', 'google', 'facebook'
      email: null,
      level: 1,
      xp: 0,
      totalXp: 0,
      stats: {
        matchesPlayed: 0,
        wins: 0,
        goals: 0,
        tasksCompleted: 0,
        territoriesConquered: 0,
        kills: 0
      },
      createdAt: Date.now()
    };
  }

  loadProfile() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...this.getDefaultProfile(),
          ...parsed,
          stats: {
            ...this.getDefaultProfile().stats,
            ...(parsed.stats || {})
          }
        };
      }
    } catch (e) {
      console.warn('Profile load error, fallback to default:', e);
    }

    const legacyName = localStorage.getItem('ball_name');
    const legacyAvatar = localStorage.getItem('ball_avatar');
    const legacyColor = localStorage.getItem('ball_color');
    const profile = this.getDefaultProfile();
    if (legacyName) profile.name = legacyName;
    if (legacyAvatar) profile.avatar = legacyAvatar;
    if (legacyColor) profile.color = legacyColor;
    return profile;
  }

  saveProfile() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.profile));
      localStorage.setItem('ball_name', this.profile.name);
      localStorage.setItem('ball_avatar', this.profile.avatar);
      localStorage.setItem('ball_color', this.profile.color);
      this.notifyUpdate();
    } catch (e) {
      console.error('Profile save error:', e);
    }
  }

  getProfile() {
    return this.profile;
  }

  // --- XP & Level Calculation ---

  getXpNeededForLevel(level) {
    return Math.floor(100 + (level - 1) * 75);
  }

  getRankTitle(level) {
    if (level >= 25) return '👑 Galaktik Hükümdar';
    if (level >= 20) return '🌌 Kozmik Efsane';
    if (level >= 15) return '💎 Elit Şampiyon';
    if (level >= 10) return '🏆 Arena Ustası';
    if (level >= 7)  return '⚔️ Kıdemli Fatih';
    if (level >= 5)  return '🚀 Usta Kaptan';
    if (level >= 3)  return '🔥 Hırslı Savaşçı';
    if (level >= 2)  return '⚡ Gelişen Yetenek';
    return '🌱 Acemi Çaylak';
  }

  addXP(amount, reason = 'Oyun') {
    if (amount <= 0) return { gained: 0, levelUp: false };

    this.profile.xp += amount;
    this.profile.totalXp = (this.profile.totalXp || 0) + amount;
    let levelUpOccurred = false;
    let newLevelsGained = 0;

    while (this.profile.xp >= this.getXpNeededForLevel(this.profile.level)) {
      this.profile.xp -= this.getXpNeededForLevel(this.profile.level);
      this.profile.level += 1;
      levelUpOccurred = true;
      newLevelsGained += 1;
    }

    this.saveProfile();

    if (levelUpOccurred) {
      this.notifyLevelUp(this.profile.level, this.getRankTitle(this.profile.level));
    }

    return {
      gained: amount,
      levelUp: levelUpOccurred,
      newLevel: this.profile.level,
      levelsGained: newLevelsGained,
      reason
    };
  }

  recordMatchResult({ won = false, mode = 'puck', goals = 0, kills = 0, tasks = 0, territories = 0 } = {}) {
    this.profile.stats.matchesPlayed += 1;
    if (won) this.profile.stats.wins += 1;
    if (goals > 0) this.profile.stats.goals += goals;
    if (kills > 0) this.profile.stats.kills += kills;
    if (tasks > 0) this.profile.stats.tasksCompleted += tasks;
    if (territories > 0) this.profile.stats.territoriesConquered += territories;

    // Base XP: +30 XP participation
    let xpEarned = 30;
    // Win Bonus: +90 XP
    if (won) xpEarned += 90;
    // Activity bonuses
    xpEarned += (goals * 15);
    xpEarned += (kills * 15);
    xpEarned += (tasks * 10);
    xpEarned += (territories * 15);

    const xpResult = this.addXP(xpEarned, won ? '🏆 Zafer Bonusu' : '🎮 Maç Katılımı');
    this.saveProfile();

    return {
      xpEarned,
      xpResult,
      won,
      stats: this.profile.stats
    };
  }

  // --- Auth & Login Methods ---

  loginAsGuest(customName = null) {
    this.profile.isGuest = true;
    this.profile.authProvider = 'guest';
    if (customName && customName.trim().length > 0) {
      this.profile.name = customName.trim().substring(0, 15);
    }
    this.saveProfile();
    return this.profile;
  }

  loginWithCredentials(username, password) {
    if (!username || username.trim().length < 2) {
      throw new Error('Kullanıcı adı en az 2 karakter olmalıdır.');
    }
    this.profile.name = username.trim().substring(0, 15);
    this.profile.isGuest = false;
    this.profile.authProvider = 'local';
    this.saveProfile();
    return this.profile;
  }

  loginWithSocial(provider, mockUser = null) {
    const validProviders = ['google', 'facebook'];
    if (!validProviders.includes(provider)) {
      throw new Error('Geçersiz sosyal sağlayıcı.');
    }

    const providerNames = {
      google: 'Google Oyuncusu',
      facebook: 'Facebook Oyuncusu'
    };

    const providerAvatars = {
      google: '⚡',
      facebook: '👑'
    };

    this.profile.isGuest = false;
    this.profile.authProvider = provider;
    this.profile.name = mockUser?.name || `${providerNames[provider]}_${Math.floor(Math.random() * 800 + 100)}`;
    this.profile.email = mockUser?.email || `${provider}_user@armoyu.com`;
    if (!mockUser?.keepAvatar) {
      this.profile.avatar = providerAvatars[provider] || this.profile.avatar;
    }

    // Award first-time social login bonus XP (+100 XP)
    if (!this.profile.hasReceivedSocialBonus) {
      this.profile.hasReceivedSocialBonus = true;
      this.addXP(100, `🎉 ${provider.toUpperCase()} Giriş Bonusu`);
    }

    this.saveProfile();
    return this.profile;
  }

  logout() {
    this.profile = this.getDefaultProfile();
    this.saveProfile();
    return this.profile;
  }

  updateCustomization(avatar, color, name) {
    if (avatar) this.profile.avatar = avatar;
    if (color) this.profile.color = color;
    if (name && name.trim().length > 0) {
      this.profile.name = name.trim().substring(0, 15);
    }
    this.saveProfile();
  }

  // --- Callbacks & Observers ---

  onUpdate(cb) {
    this.onProfileUpdateCallbacks.add(cb);
  }

  onLevelUp(cb) {
    this.onLevelUpCallbacks.add(cb);
  }

  notifyUpdate() {
    this.onProfileUpdateCallbacks.forEach(cb => {
      try { cb(this.profile); } catch (e) { console.error('Profile callback error:', e); }
    });
  }

  notifyLevelUp(newLevel, rankTitle) {
    this.onLevelUpCallbacks.forEach(cb => {
      try { cb(newLevel, rankTitle); } catch (e) { console.error('Level up callback error:', e); }
    });
  }
}

export const profileManager = new ProfileManager();
