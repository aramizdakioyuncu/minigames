// tasksMiniGames.js - Interactive Mini-Game Modals for Space Crew Tasks

export class TasksMiniGamesController {
  constructor(ui) {
    this.ui = ui;
    this.activeTaskStation = null;
    this.wiresState = { wires: [], selectedLeft: null, completedPairs: 0 };
    this.shieldsState = { tiles: [], required: 0, current: 0 };
  }

  openTask(station, onCompleteCallback) {
    if (!this.ui.modalTaskInteractive || !station) return;
    this.activeTaskStation = station;

    if (this.ui.taskMiniIcon) this.ui.taskMiniIcon.textContent = station.icon || '⚡';
    if (this.ui.taskMiniTitle) this.ui.taskMiniTitle.textContent = station.name || 'Görev';

    Object.values(this.ui.taskPanels).forEach(panel => {
      if (panel) panel.classList.add('hidden');
    });

    if (station.id === 'task_wires_elec') {
      if (this.ui.taskPanels.wires) this.ui.taskPanels.wires.classList.remove('hidden');
      this.initWiringTask(onCompleteCallback);
    } else if (station.id === 'task_shields_sec') {
      if (this.ui.taskPanels.shields) this.ui.taskPanels.shields.classList.remove('hidden');
      this.initShieldsTask(onCompleteCallback);
    } else if (station.id === 'task_scan_medbay') {
      if (this.ui.taskPanels.medscan) this.ui.taskPanels.medscan.classList.remove('hidden');
      this.initMedScanTask(onCompleteCallback);
    } else if (station.id === 'task_trash_cafe') {
      if (this.ui.taskPanels.trash) this.ui.taskPanels.trash.classList.remove('hidden');
      this.initTrashTask(onCompleteCallback);
    } else {
      if (this.ui.taskPanels.wiring) this.ui.taskPanels.wiring.classList.remove('hidden');
      this.initWiringTask(onCompleteCallback);
    }

    this.ui.modalTaskInteractive.classList.remove('hidden');
  }

  closeTask() {
    if (this.ui.modalTaskInteractive) {
      this.ui.modalTaskInteractive.classList.add('hidden');
    }
    this.activeTaskStation = null;
  }

  initWiringTask(onCompleteCallback) {
    const leftCol = document.getElementById('wires-col-left');
    const rightCol = document.getElementById('wires-col-right');
    const statusText = document.getElementById('wires-status');
    if (!leftCol || !rightCol) return;

    leftCol.innerHTML = '';
    rightCol.innerHTML = '';
    if (statusText) statusText.textContent = 'Kabloları eşleştir (0/4)';

    const colors = [
      { id: 'red', name: 'Kırmızı', hex: '#ef4444' },
      { id: 'blue', name: 'Mavi', hex: '#3b82f6' },
      { id: 'yellow', name: 'Sarı', hex: '#eab308' },
      { id: 'pink', name: 'Pembe', hex: '#ec4899' }
    ];

    const shuffledLeft = [...colors].sort(() => Math.random() - 0.5);
    const shuffledRight = [...colors].sort(() => Math.random() - 0.5);

    this.wiresState = { selectedLeft: null, completedPairs: 0 };

    shuffledLeft.forEach(col => {
      const btn = document.createElement('button');
      btn.className = 'wire-node node-left';
      btn.dataset.color = col.id;
      btn.style.setProperty('--wire-c', col.hex);
      btn.innerHTML = `<span class="wire-connector"></span><span class="wire-label">${col.name}</span>`;
      btn.addEventListener('click', () => {
        if (btn.classList.contains('connected')) return;
        leftCol.querySelectorAll('.wire-node').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.wiresState.selectedLeft = col.id;
      });
      leftCol.appendChild(btn);
    });

    shuffledRight.forEach(col => {
      const btn = document.createElement('button');
      btn.className = 'wire-node node-right';
      btn.dataset.color = col.id;
      btn.style.setProperty('--wire-c', col.hex);
      btn.innerHTML = `<span class="wire-label">${col.name}</span><span class="wire-connector"></span>`;
      btn.addEventListener('click', () => {
        if (btn.classList.contains('connected') || !this.wiresState.selectedLeft) return;
        if (this.wiresState.selectedLeft === col.id) {
          btn.classList.add('connected');
          const leftNode = leftCol.querySelector(`[data-color="${col.id}"]`);
          if (leftNode) {
            leftNode.classList.remove('active');
            leftNode.classList.add('connected');
          }
          this.wiresState.selectedLeft = null;
          this.wiresState.completedPairs++;
          if (statusText) statusText.textContent = `Kabloları eşleştir (${this.wiresState.completedPairs}/4)`;

          if (this.wiresState.completedPairs >= 4) {
            if (statusText) statusText.innerHTML = '⚡ <b>GÖREV TAMAMLANDI!</b>';
            setTimeout(() => {
              this.closeTask();
              if (onCompleteCallback) onCompleteCallback(this.activeTaskStation);
            }, 600);
          }
        } else {
          btn.classList.add('shake-error');
          setTimeout(() => btn.classList.remove('shake-error'), 400);
        }
      });
      rightCol.appendChild(btn);
    });
  }

  initShieldsTask(onCompleteCallback) {
    const grid = document.getElementById('shields-hex-grid');
    const statusText = document.getElementById('shields-status');
    if (!grid) return;
    grid.innerHTML = '';

    const hexCount = 7;
    let activeHexes = 0;

    for (let i = 0; i < hexCount; i++) {
      const hex = document.createElement('div');
      const isDamaged = Math.random() > 0.4;
      hex.className = `shields-hex ${isDamaged ? 'damaged' : 'active'}`;
      if (!isDamaged) activeHexes++;

      hex.addEventListener('click', () => {
        if (hex.classList.contains('damaged')) {
          hex.classList.remove('damaged');
          hex.classList.add('active');
          activeHexes++;
          if (statusText) statusText.textContent = `Kalkan Gücü: %${Math.round((activeHexes / hexCount) * 100)}`;
          if (activeHexes >= hexCount) {
            if (statusText) statusText.innerHTML = '🛡️ <b>KALKANLAR MAKSİMUM GÜÇTE!</b>';
            setTimeout(() => {
              this.closeTask();
              if (onCompleteCallback) onCompleteCallback(this.activeTaskStation);
            }, 600);
          }
        }
      });
      grid.appendChild(hex);
    }
  }

  initMedScanTask(onCompleteCallback) {
    const scanBar = document.getElementById('medscan-progress-bar');
    const scanStatus = document.getElementById('medscan-status');
    if (!scanBar || !scanStatus) return;

    scanBar.style.width = '0%';
    scanStatus.textContent = 'Biyometrik tarama yapılıyor... (0%)';
    let progress = 0;

    const interval = setInterval(() => {
      progress += 5;
      scanBar.style.width = `${progress}%`;
      scanStatus.textContent = `Biyometrik tarama yapılıyor... (%${progress})`;

      if (progress >= 100) {
        clearInterval(interval);
        scanStatus.innerHTML = '🔬 <b>TARAMA TEMİZ! (MÜRETTEBAT ONAYLANDI)</b>';
        setTimeout(() => {
          this.closeTask();
          if (onCompleteCallback) onCompleteCallback(this.activeTaskStation);
        }, 700);
      }
    }, 150);
  }

  initTrashTask(onCompleteCallback) {
    const btnLever = document.getElementById('btn-trash-lever');
    const trashStatus = document.getElementById('trash-status');
    if (!btnLever) return;

    btnLever.disabled = false;
    if (trashStatus) trashStatus.textContent = 'Kolu aşağı çekerek atıkları boşalt';

    btnLever.onclick = () => {
      btnLever.disabled = true;
      if (trashStatus) trashStatus.innerHTML = '♻️ <b>ATIKLAR UZAYA FIRLATILIYOR...</b>';
      setTimeout(() => {
        this.closeTask();
        if (onCompleteCallback) onCompleteCallback(this.activeTaskStation);
      }, 900);
    };
  }
}
