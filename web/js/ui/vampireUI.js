// vampireUI.js - Vampire & Villager Night/Day Voting Modals

export class VampireUIController {
  constructor(ui) {
    this.ui = ui;
  }

  showRoleReveal(role, team) {
    if (!this.ui.modalVampireRoleReveal) return;
    const roleIcons = {
      vampire: '🧛',
      villager: '👨‍🌾',
      doctor: '💉',
      seer: '🔮'
    };
    const roleNames = {
      vampire: 'VAMPİR',
      villager: 'KÖYLÜ',
      doctor: 'DOKTOR',
      seer: 'KÂHİN'
    };
    const roleDescriptions = {
      vampire: 'Gece diğer vampirlerle gizlice toplan ve bir köylüyü avla! Gündüz kendini gizle.',
      villager: 'Köyünü savun! Gündüz oylamalarında vampir olduğunu düşündüğün kişileri as.',
      doctor: 'Her gece bir köylüyü koru. Doğru kişiyi seçersen vampir saldırısını engellersin!',
      seer: 'Her gece bir oyuncunun gizli rolünü öğren ve gündüz köyü yönlendir.'
    };

    if (this.ui.vampireRoleIcon) this.ui.vampireRoleIcon.textContent = roleIcons[role] || '🎭';
    if (this.ui.vampireRoleTitle) this.ui.vampireRoleTitle.textContent = roleNames[role] || 'BİLİNMEYEN';
    if (this.ui.vampireRoleTeam) {
      this.ui.vampireRoleTeam.textContent = team === 'vampires' ? '🔴 Takım: Vampirler' : '🟢 Takım: Köylüler';
      this.ui.vampireRoleTeam.className = `role-team-pill ${team === 'vampires' ? 'team-vampire' : 'team-villager'}`;
    }
    if (this.ui.vampireRoleDesc) this.ui.vampireRoleDesc.textContent = roleDescriptions[role] || '';

    this.ui.modalVampireRoleReveal.classList.remove('hidden');
    setTimeout(() => {
      if (this.ui.modalVampireRoleReveal) {
        this.ui.modalVampireRoleReveal.classList.add('hidden');
      }
    }, 5500);
  }

  openNightModal(myRole, playersMeta, myPlayerId, onActionCallback) {
    if (!this.ui.modalVampireNight) return;
    const isVampire = myRole === 'vampire';
    const isDoctor = myRole === 'doctor';
    const isSeer = myRole === 'seer';

    if (this.ui.vampireNightActionTitle) {
      this.ui.vampireNightActionTitle.textContent = isVampire
        ? '🩸 Kurbanını Seç (Vampir Saldırısı)'
        : (isDoctor ? '💉 Bu Gece Kimi Koruyacaksın?' : '🔮 Rolünü Öğrenmek İstediğin Kişiyi Seç');
    }

    if (this.ui.vampireNightTargetList) {
      this.ui.vampireNightTargetList.innerHTML = '';
      const aliveTargets = (playersMeta || []).filter(p => p.isAlive && (isDoctor || p.id !== myPlayerId));

      aliveTargets.forEach(target => {
        const btn = document.createElement('button');
        btn.className = 'vampire-target-card';
        btn.innerHTML = `
          <div class="target-avatar">${target.avatar || '👤'}</div>
          <div class="target-name">${target.name || 'Oyuncu'}</div>
        `;
        btn.onclick = () => {
          this.ui.vampireNightTargetList.querySelectorAll('.vampire-target-card').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          if (onActionCallback) onActionCallback(target.id);
        };
        this.ui.vampireNightTargetList.appendChild(btn);
      });
    }

    this.ui.modalVampireNight.classList.remove('hidden');
  }

  closeNightModal() {
    if (this.ui.modalVampireNight) {
      this.ui.modalVampireNight.classList.add('hidden');
    }
  }
}
