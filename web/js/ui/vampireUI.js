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
      ,hunter: '🏹'
    };
    const roleNames = {
      vampire: 'VAMPİR',
      villager: 'KÖYLÜ',
      doctor: 'DOKTOR',
      seer: 'KÂHİN'
      ,hunter: 'AVCI'
    };
    const roleDescriptions = {
      vampire: 'Gece diğer vampirlerle gizlice toplan ve bir köylüyü avla! Gündüz kendini gizle.',
      villager: 'Köyünü savun! Gündüz oylamalarında vampir olduğunu düşündüğün kişileri as.',
      doctor: 'Her gece bir köylüyü koru. Doğru kişiyi seçersen vampir saldırısını engellersin!',
      seer: 'Her gece bir oyuncunun gizli rolünü öğren ve gündüz köyü yönlendir.'
      ,hunter: 'Öldüğünde son bir atışla bir oyuncuyu yanında götürebilirsin.'
    };

    if (this.ui.vampireRoleIcon) this.ui.vampireRoleIcon.textContent = roleIcons[role] || '🎭';
    if (this.ui.vampireRoleTitle) this.ui.vampireRoleTitle.textContent = roleNames[role] || 'BİLİNMEYEN';
    if (this.ui.vampireRoleTeam) {
      this.ui.vampireRoleTeam.textContent = role === 'vampire' ? '🔴 Takım: Vampirler' : '🟢 Takım: Köylüler';
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
      const aliveTargets = (playersMeta || []).filter(p => p.isAlive && !p.isSpectator &&
        (isDoctor || p.id !== myPlayerId) && (!isVampire || p.role !== 'vampire'));

      aliveTargets.forEach(target => {
        const btn = document.createElement('button');
        btn.className = 'vampire-target-card';
        btn.innerHTML = `
          <div class="target-avatar">${this.ui.escapeHtml(target.avatar || '👤')}</div>
          <div class="target-name">${this.ui.escapeHtml(target.name || 'Oyuncu')}</div>
        `;
        btn.onclick = () => {
          this.ui.vampireNightTargetList.querySelectorAll('.vampire-target-card').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          const action = isVampire ? 'vampire_vote' : isDoctor ? 'doctor_heal' : 'seer_investigate';
          if (onActionCallback) onActionCallback(target.id);
          else window.gameApp?.socket.sendAction({ type: action, targetId: target.id });
          this.ui.vampireNightTargetList.querySelectorAll('button').forEach(button => { button.disabled = true; });
        };
        this.ui.vampireNightTargetList.appendChild(btn);
      });
    }

    this.ui.modalVampireNight.classList.remove('hidden');
    const skip = document.getElementById('btn-vampire-action-skip');
    skip.onclick = () => {
      const action = isVampire ? 'vampire_vote' : isDoctor ? 'doctor_heal' : 'seer_investigate';
      window.gameApp?.socket.sendAction({ type: action, targetId: 'skip' });
      this.closeNightModal();
    };
  }

  closeNightModal() {
    if (this.ui.modalVampireNight) {
      this.ui.modalVampireNight.classList.add('hidden');
    }
  }

  openTrial(players, myId, onVote, onSkip) {
    const grid = document.getElementById('trial-candidates-grid');
    grid.replaceChildren();
    for (const player of (players || []).filter(p => p.isAlive && !p.isSpectator)) {
      const button = document.createElement('button');
      button.className = 'vampire-target-card';
      button.dataset.id = player.id;
      button.textContent = `${player.avatar || '👤'} ${player.name}`;
      const count = document.createElement('span');
      count.className = 'vote-count';
      button.appendChild(count);
      button.onclick = () => {
        if (onVote) onVote(player.id);
        else window.gameApp?.socket.sendAction({ type: 'trial_vote', targetId: player.id });
        grid.querySelectorAll('button').forEach(b => b.classList.toggle('selected', b === button));
      };
      grid.appendChild(button);
    }
    const skip = document.getElementById('btn-trial-skip-vote');
    skip.classList.toggle('hidden', onSkip === null);
    skip.onclick = onSkip || (() => window.gameApp?.socket.sendAction({ type: 'trial_vote', targetId: 'skip' }));
    this.ui.modalVampireTrial.classList.remove('hidden');
  }

  updateVotes(counts, skip) {
    document.querySelectorAll('#trial-candidates-grid button').forEach(button => {
      button.querySelector('.vote-count').textContent = ` (${counts[button.dataset.id] || 0})`;
    });
    document.getElementById('trial-skip-count').textContent = skip || 0;
  }

  showSeerResult(name, isVampire) {
    const modal = document.getElementById('modal-vampire-seer-result');
    document.getElementById('seer-result-content').textContent = `${name}: ${isVampire ? '🧛 Vampir' : '🌿 Köylü takımında'}`;
    modal.classList.remove('hidden');
    document.getElementById('btn-close-seer-result').onclick = () => modal.classList.add('hidden');
  }
}
