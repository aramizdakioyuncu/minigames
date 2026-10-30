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
        const profile = {
          ...this.getDefaultProfile(),
          ...parsed,
          stats: {
            ...this.getDefaultProfile().stats,
            ...(parsed.stats || {})
          }
        };
        profile.isGuest = true;
        profile.authProvider = 'guest';
        profile.email = null;
        profile.name = typeof parsed.name === 'string' ? parsed.name.slice(0, 15) : 'Oyuncu';
        profile.avatar = typeof parsed.avatar === 'string' ? parsed.avatar.slice(0, 8) : '⚽';
        profile.color = /^#[0-9a-f]{6}$/i.test(parsed.color || '') ? parsed.color : '#3b82f6';
        for (const key of ['level', 'xp', 'totalXp']) profile[key] = Number.isFinite(profile[key]) ? Math.max(key === 'level' ? 1 : 0, Math.min(profile[key], key === 'level' ? 1000 : 1e6)) : (key === 'level' ? 1 : 0);
        for (const key of Object.keys(profile.stats)) profile.stats[key] = Number.isFinite(profile.stats[key]) ? Math.max(0, Math.min(profile.stats[key], 1e6)) : 0;
        return profile;
      }
    } catch (e) {
      console.warn('Profile load error, fallback to default:', e);
    }

    const profile = this.getDefaultProfile();
    try {
    const legacyName = localStorage.getItem('ball_name');
    const legacyAvatar = localStorage.getItem('ball_avatar');
    const legacyColor = localStorage.getItem('ball_color');
    if (legacyName) profile.name = legacyName;
    if (legacyAvatar) profile.avatar = legacyAvatar;
    if (legacyColor) profile.color = legacyColor;
    } catch { /* Storage may be disabled; an in-memory profile still works. */ }
    return profile;
  }

  saveProfile() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({ ...this.profile, email: null }));
      localStorage.setItem('ball_name', this.profile.name);
      localStorage.setItem('ball_avatar', this.profile.avatar);
      localStorage.setItem('ball_color', this.profile.color);
    } catch (e) {
      console.error('Profile save error:', e);
    }
    this.notifyUpdate();
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
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10000) return { gained: 0, levelUp: false };

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

  attachAccount(user) {
    if (this.profile.authProvider === 'phatsa' && this.profile.id === user.id) return;
    if (this.profile.isGuest) this.saveProfile();
    this.storageKey = 'armoyu_account_profile_v1:' + user.id;
    let saved = null;
    try { saved = localStorage.getItem(this.storageKey); } catch { /* In-memory profile. */ }
    this.profile = saved ? this.loadProfile() : this.getDefaultProfile();
    this.profile.id = user.id;
    this.profile.isGuest = false;
    this.profile.authProvider = 'phatsa';
    this.profile.email = user.email;
    if (!saved) this.profile.name = user.full_name.slice(0, 15) || 'Oyuncu';
    this.saveProfile();
  }

  detachAccount() {
    this.storageKey = 'armoyu_player_profile_v2';
    this.profile = this.loadProfile();
    this.saveProfile();
  }

  loginAsGuest(customName = null) {
    this.profile.isGuest = true;
    this.profile.authProvider = 'guest';
    if (customName && customName.trim().length > 0) {
      this.profile.name = customName.trim().substring(0, 15);
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
