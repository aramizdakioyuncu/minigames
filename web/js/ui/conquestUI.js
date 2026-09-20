// conquestUI.js - Bil ve Fethet Trivia Questions, Numeric Keypad & Evaluation Modals

export class ConquestUIController {
  constructor(ui) {
    this.ui = ui;
    this.onConquestSubmitAnswer = null;
    this.bindKeypad();
  }

  bindKeypad() {
    const numButtons = document.querySelectorAll('.conquest-keypad .btn-num[data-num]');
    numButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const num = btn.dataset.num;
        if (this.ui.conquestAnswerInput) {
          this.ui.conquestAnswerInput.value = (this.ui.conquestAnswerInput.value || '') + num;
          this.ui.conquestAnswerInput.focus();
        }
      });
    });

    if (this.ui.btnConquestClear) {
      this.ui.btnConquestClear.addEventListener('click', () => {
        if (this.ui.conquestAnswerInput) {
          this.ui.conquestAnswerInput.value = '';
          this.ui.conquestAnswerInput.focus();
        }
      });
    }

    if (this.ui.btnConquestBackspace) {
      this.ui.btnConquestBackspace.addEventListener('click', () => {
        if (this.ui.conquestAnswerInput) {
          const val = this.ui.conquestAnswerInput.value || '';
          this.ui.conquestAnswerInput.value = val.slice(0, -1);
          this.ui.conquestAnswerInput.focus();
        }
      });
    }

    const submitAction = () => {
      if (!this.ui.conquestAnswerInput) return;
      const val = this.ui.conquestAnswerInput.value.trim();
      if (!val) return;
      const parsed = parseFloat(val);
      if (isNaN(parsed)) return;

      if (this.ui.btnConquestSubmitAnswer) {
        this.ui.btnConquestSubmitAnswer.disabled = true;
        this.ui.btnConquestSubmitAnswer.textContent = '✅ Cevap Gönderildi';
      }
      if (this.ui.conquestAnswerInput) {
        this.ui.conquestAnswerInput.disabled = true;
      }

      if (typeof this.onConquestSubmitAnswer === 'function') {
        this.onConquestSubmitAnswer(parsed);
      } else if (window.gameApp && window.gameApp.socket) {
        window.gameApp.socket.sendAction({ type: 'conquest_submit_answer', answer: parsed });
      }

      if (window.audio && typeof window.audio.playClick === 'function') {
        window.audio.playClick();
      }
    };

    if (this.ui.btnConquestSubmitAnswer) {
      this.ui.btnConquestSubmitAnswer.addEventListener('click', submitAction);
    }

    if (this.ui.conquestAnswerInput) {
      this.ui.conquestAnswerInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          submitAction();
        }
      });
    }
  }

  openQuestionModal(questionData, timerSec, onSubmit) {
    if (!this.ui.modalConquestQuestion) return;
    this.onConquestSubmitAnswer = onSubmit || this.onConquestSubmitAnswer;

    if (this.ui.conquestCatBadge) {
      this.ui.conquestCatBadge.textContent = `📚 ${questionData.category || 'GENEL KÜLTÜR'}`;
    }
    if (this.ui.conquestQuestionText) {
      this.ui.conquestQuestionText.textContent = questionData.text || questionData.question || '...';
    }
    if (this.ui.conquestUnitHint) {
      this.ui.conquestUnitHint.textContent = `Cevap Birimi: ${questionData.unit || 'Sayı'}`;
    }
    if (this.ui.conquestAnswerInput) {
      this.ui.conquestAnswerInput.value = '';
      this.ui.conquestAnswerInput.disabled = false;
      setTimeout(() => this.ui.conquestAnswerInput.focus(), 100);
    }
    if (this.ui.btnConquestSubmitAnswer) {
      this.ui.btnConquestSubmitAnswer.disabled = false;
      this.ui.btnConquestSubmitAnswer.textContent = '⚔️ Cevabı Onayla (Enter)';
    }
    if (this.ui.conquestQuestionTimer) {
      this.ui.conquestQuestionTimer.textContent = `${timerSec}s`;
    }

    this.ui.modalConquestQuestion.classList.remove('hidden');
  }

  openResultModal(resultData, players) {
    if (!this.ui.modalConquestResult) return;
    if (this.ui.modalConquestQuestion) this.ui.modalConquestQuestion.classList.add('hidden');

    if (this.ui.conquestCorrectAnswerVal) {
      this.ui.conquestCorrectAnswerVal.textContent = `${resultData.correctAnswer} ${resultData.unit || ''}`;
    }

    if (this.ui.conquestPodiumList) {
      this.ui.conquestPodiumList.innerHTML = '';
      const rankings = resultData.rankings || resultData.results || [];

      rankings.forEach((entry, idx) => {
        const item = document.createElement('div');
        item.className = `conquest-podium-item ${idx === 0 ? 'winner' : ''}`;

        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
        const isExact = entry.diff === 0;
        const playerName = entry.name || entry.username || 'Oyuncu';
        const timeStr = entry.timeTaken !== undefined ? `${Number(entry.timeTaken).toFixed(1)}s` : '';
        const diffText = entry.answer === null
          ? 'Cevap verilmedi'
          : isExact
            ? `🎯 Tam İsabet! (Fark: 0) ${timeStr ? `(${timeStr})` : ''}`
            : `Fark: ${entry.diff} ${timeStr ? `(${timeStr})` : ''}`;

        item.innerHTML = `
          <div class="podium-rank-badge">${medal}</div>
          <div class="podium-player-name">${this.escapeHtml(playerName)}</div>
          <div class="podium-stats">
            <span class="podium-guess">${entry.answer !== null ? entry.answer : '-'}</span>
            <span class="podium-diff ${isExact ? 'exact' : ''}">${diffText}</span>
          </div>
        `;
        this.ui.conquestPodiumList.appendChild(item);
      });
    }

    this.ui.modalConquestResult.classList.remove('hidden');
  }

  escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }
}
