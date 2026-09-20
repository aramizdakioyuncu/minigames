// conquestMode.js - Server Game Mode for Bil ve Fethet (Trivia Territory Conquest)

import { BaseMode } from './BaseMode.js';

export class ConquestMode extends BaseMode {
  constructor(room) {
    super(room);
    this.type = 'conquest';
    this.name = 'Bil ve Fethet (Trivia Territory Conquest)';

    this.width = 1600;
    this.height = 1000;

    this.gameState = 'waiting'; // 'waiting', 'question', 'question_result', 'conquer_pick', 'duel', 'game_over'
    this.phaseTimer = 0;
    this.currentRound = 1;
    this.maxRounds = 6;

    this.questionDuration = 16;
    this.resultDuration = 5;
    this.pickDuration = 12;

    this.currentQuestion = null;
    this.playerAnswers = new Map(); // playerId -> { answer: number, time: number }
    this.questionResults = null;    // Array of ranked answers
    this.activePickerId = null;     // Player who is currently choosing a territory
    this.pickerQueue = [];          // Ordered list of playerIds who earned a territory pick this round
    this.scores = new Map();        // playerId -> number of points

    // Direct duel state
    this.currentDuel = null;        // { attackerId, defenderId, territoryId }

    this.initTerritories();
    this.initQuestions();
  }

  initTerritories() {
    this.territories = [
      { id: 'istanbul', name: 'İstanbul', x: -360, y: -180, points: 400, ownerId: null, color: '#475569', icon: '🕌' },
      { id: 'canakkale', name: 'Çanakkale', x: -500, y: -130, points: 250, ownerId: null, color: '#475569', icon: '⚓' },
      { id: 'bursa', name: 'Bursa', x: -350, y: -70, points: 300, ownerId: null, color: '#475569', icon: '🌲' },
      { id: 'izmir', name: 'İzmir (Ege Başkenti)', x: -500, y: 70, points: 350, ownerId: null, color: '#475569', icon: '🏛️' },
      { id: 'eskisehir', name: 'Eskişehir', x: -200, y: -60, points: 250, ownerId: null, color: '#475569', icon: '🚂' },
      { id: 'antalya', name: 'Antalya (Akdeniz)', x: -240, y: 240, points: 350, ownerId: null, color: '#475569', icon: '🌴' },
      { id: 'konya', name: 'Konya', x: -60, y: 140, points: 300, ownerId: null, color: '#475569', icon: '🌾' },
      { id: 'ankara', name: 'Ankara (Başkent)', x: -40, y: -70, points: 500, ownerId: null, color: '#475569', icon: '⭐' },
      { id: 'samsun', name: 'Samsun (Kuzey)', x: 80, y: -220, points: 300, ownerId: null, color: '#475569', icon: '🌊' },
      { id: 'sivas', name: 'Sivas', x: 220, y: -60, points: 250, ownerId: null, color: '#475569', icon: '🛡️' },
      { id: 'adana', name: 'Adana / Çukurova', x: 120, y: 240, points: 300, ownerId: null, color: '#475569', icon: '🍊' },
      { id: 'trabzon', name: 'Trabzon (Karadeniz)', x: 380, y: -190, points: 350, ownerId: null, color: '#475569', icon: '⛵' },
      { id: 'gaziantep', name: 'Gaziantep (Güney)', x: 280, y: 230, points: 300, ownerId: null, color: '#475569', icon: '🏺' },
      { id: 'erzurum', name: 'Erzurum (Doğu Başkenti)', x: 480, y: -70, points: 350, ownerId: null, color: '#475569', icon: '🏔️' },
      { id: 'diyarbakir', name: 'Diyarbakır (Güneydoğu)', x: 460, y: 160, points: 350, ownerId: null, color: '#475569', icon: '🏰' },
      { id: 'van', name: 'Van (Doğu Sınırı)', x: 620, y: 80, points: 300, ownerId: null, color: '#475569', icon: '🌊' }
    ];

    this.connections = [
      ['canakkale', 'istanbul'], ['canakkale', 'izmir'], ['canakkale', 'bursa'],
      ['istanbul', 'bursa'], ['istanbul', 'eskisehir'],
      ['izmir', 'bursa'], ['izmir', 'antalya'],
      ['bursa', 'eskisehir'], ['bursa', 'antalya'],
      ['eskisehir', 'ankara'], ['eskisehir', 'konya'],
      ['antalya', 'konya'], ['antalya', 'adana'],
      ['ankara', 'samsun'], ['ankara', 'konya'], ['ankara', 'sivas'],
      ['konya', 'adana'], ['konya', 'sivas'],
      ['samsun', 'sivas'], ['samsun', 'trabzon'],
      ['adana', 'gaziantep'],
      ['sivas', 'erzurum'], ['sivas', 'gaziantep'], ['sivas', 'diyarbakir'],
      ['trabzon', 'erzurum'],
      ['gaziantep', 'diyarbakir'],
      ['erzurum', 'diyarbakir'], ['erzurum', 'van'],
      ['diyarbakir', 'van']
    ];

    // Adjacency map
    this.adjacency = {};
    this.territories.forEach(t => { this.adjacency[t.id] = []; });
    this.connections.forEach(([a, b]) => {
      if (this.adjacency[a]) this.adjacency[a].push(b);
      if (this.adjacency[b]) this.adjacency[b].push(a);
    });
  }

  initQuestions() {
    this.questionsPool = [
      { id: 'q1', category: 'Tarih', text: 'İstanbul kaç yılında fethedilmiştir?', answer: 1453, unit: 'yılı' },
      { id: 'q2', category: 'Tarih', text: 'Türkiye Cumhuriyeti kaç yılında ilan edilmiştir?', answer: 1923, unit: 'yılı' },
      { id: 'q3', category: 'Coğrafya', text: 'Türkiye\'nin toplam kaç ili (şehri) vardır?', answer: 81, unit: 'il' },
      { id: 'q4', category: 'Genel Kültür', text: 'Fransa\'daki Eyfel Kulesi\'nin yüksekliği kaç metredir?', answer: 330, unit: 'metre' },
      { id: 'q5', category: 'Bilim & Uzay', text: 'İnsanoğlu Ay\'a ilk kez kaç yılında ayak basmıştır?', answer: 1969, unit: 'yılı' },
      { id: 'q6', category: 'Tarih', text: 'Çanakkale Deniz Zaferi hangi yılda kazanılmıştır?', answer: 1915, unit: 'yılı' },
      { id: 'q7', category: 'Coğrafya', text: 'Dünya üzerindeki toplam ülke sayısı (BM üyesi) kaçtır?', answer: 193, unit: 'ülke' },
      { id: 'q8', category: 'Spor', text: 'Süper Lig\'de bir sezonda en çok gol atan futbolcu (Tanju Çolak) kaç gol atmıştır?', answer: 39, unit: 'gol' },
      { id: 'q9', category: 'Bilim', text: 'Suyun deniz seviyesinde kaynama noktası kaç derecedir?', answer: 100, unit: '°C' },
      { id: 'q10', category: 'Coğrafya', text: 'Ağrı Dağı\'nın zirvesinin deniz seviyesinden yüksekliği kaç metredir?', answer: 5137, unit: 'metre' },
      { id: 'q11', category: 'Tarih', text: 'Kurtuluş Savaşı\'nı başlatan Büyük Taarruz hangi yılda gerçekleşmiştir?', answer: 1922, unit: 'yılı' },
      { id: 'q12', category: 'Genel Kültür', text: 'Klasik bir piyanoda toplam kaç tuş bulunur?', answer: 88, unit: 'tuş' },
      { id: 'q13', category: 'Bilim', text: 'Güneş Sistemi\'nde toplam kaç gezegen vardır?', answer: 8, unit: 'gezegen' },
      { id: 'q14', category: 'Tarih', text: 'TBMM (Türkiye Büyük Millet Meclisi) hangi yılda açılmıştır?', answer: 1920, unit: 'yılı' },
      { id: 'q15', category: 'Spor', text: 'Futbolda standart bir kalenin genişliği kaç santimetredir?', answer: 732, unit: 'cm' },
      { id: 'q16', category: 'Coğrafya', text: 'Dünyanın en yüksek dağı olan Everest Tepesi kaç metredir?', answer: 8849, unit: 'metre' },
      { id: 'q17', category: 'Genel Kültür', text: 'Bir günde toplam kaç dakika vardır?', answer: 1440, unit: 'dakika' },
      { id: 'q18', category: 'Tarih', text: 'Malazgirt Meydan Muharebesi hangi yılda kazanılmıştır?', answer: 1071, unit: 'yılı' },
      { id: 'q19', category: 'Bilim & Uzay', text: 'Işığın boşluktaki hızı saniyede yaklaşık kaç bin kilometredir?', answer: 300, unit: 'bin km/s' },
      { id: 'q20', category: 'Genel Kültür', text: 'Dünyanın en uzun nehri olan Nil Nehri yaklaşık kaç bin kilometredir?', answer: 6650, unit: 'km' },
      { id: 'q21', category: 'Sinema & Sanat', text: 'Titanik filmi toplam kaç dalda Akademi (Oscar) Ödülü kazanmıştır?', answer: 11, unit: 'Oscar' },
      { id: 'q22', category: 'Tarih', text: 'Mustafa Kemal Atatürk hangi yılda doğmuştur?', answer: 1881, unit: 'yılı' },
      { id: 'q23', category: 'Genel Kültür', text: 'İnsan vücudunda yetişkin bir bireyde toplam kaç adet kemik bulunur?', answer: 206, unit: 'kemik' },
      { id: 'q24', category: 'Spor', text: 'Maraton koşusunun standart mesafesi kaç kilometredir (küsuratsız)?', answer: 42, unit: 'km' }
    ];

    this.usedQuestionIds = new Set();
  }

  getRandomQuestion() {
    const available = this.questionsPool.filter(q => !this.usedQuestionIds.has(q.id));
    if (available.length === 0) {
      this.usedQuestionIds.clear();
      return this.questionsPool[Math.floor(Math.random() * this.questionsPool.length)];
    }
    const q = available[Math.floor(Math.random() * available.length)];
    this.usedQuestionIds.add(q.id);
    return q;
  }

  onPlayerJoin(player) {
    player.score = 0;
    player.isSpectator = false;
    if (!this.scores.has(player.id)) {
      this.scores.set(player.id, 0);
    }
  }

  onPlayerLeave(player) {
    for (const t of this.territories) {
      if (t.ownerId === player.id) {
        t.ownerId = null;
        t.color = '#475569';
      }
    }
    this.scores.delete(player.id);
    this.pickerQueue = this.pickerQueue.filter(id => id !== player.id);

    if (this.activePickerId === player.id) {
      this.advancePickerQueue();
    }
  }

  startMatch(callerName = 'Host') {
    this.gameState = 'waiting';
    this.currentRound = 1;
    this.winner = null;
    this.initTerritories();
    this.scores.clear();

    const players = Array.from(this.room.players.values()).filter(p => !p.isSpectator);
    
    // 8 Geographically Opposite Starting Bases
    const OPPOSITE_STARTS = [
      'izmir',        // 1. Batı (Ege)
      'erzurum',      // 2. Doğu (Doğu Anadolu)
      'istanbul',     // 3. Kuzeybatı (Marmara)
      'diyarbakir',   // 4. Güneydoğu (Güneydoğu Anadolu)
      'trabzon',      // 5. Kuzeydoğu (Doğu Karadeniz)
      'antalya',      // 6. Güneybatı (Akdeniz)
      'samsun',       // 7. Kuzey (Orta Karadeniz)
      'gaziantep'     // 8. Güney (Güneydoğu Geçit)
    ];

    players.forEach((p, idx) => {
      this.scores.set(p.id, 300);
      p.score = 300;

      const baseCityId = OPPOSITE_STARTS[idx % OPPOSITE_STARTS.length];
      const baseCity = this.territories.find(t => t.id === baseCityId);
      if (baseCity) {
        baseCity.ownerId = p.id;
        baseCity.ownerName = p.name;
        baseCity.color = p.color || '#3b82f6';
        baseCity.isCapital = true;
        baseCity.points = 300;
      }
    });

    this.room.broadcastEvent({
      type: 'conquest_match_started',
      caller: callerName,
      message: '🏰 BİL VE FETHET BAŞLADI!'
    });
    this.room.broadcastChat('Sistem', `🏰 Bil ve Fethet başladı! Oyuncular zıt kenarlardaki başkent kalelerinden sefere çıktı!`, '#f59e0b');

    this.startQuestionPhase();
  }

  startQuestionPhase() {
    this.gameState = 'question';
    this.phaseTimer = this.questionDuration;
    this.playerAnswers.clear();
    this.questionResults = null;
    this.currentQuestion = this.getRandomQuestion();

    this.room.broadcastEvent({
      type: 'conquest_question',
      round: this.currentRound,
      maxRounds: this.maxRounds,
      timer: this.questionDuration,
      category: this.currentQuestion.category,
      text: this.currentQuestion.text,
      unit: this.currentQuestion.unit
    });
  }

  handleAction(playerId, actionData) {
    if (!actionData || !actionData.type) return;

    if (actionData.type === 'start_match') {
      const player = this.room.players.get(playerId);
      const callerName = player ? player.name : 'Host';
      this.startMatch(callerName);
      return;
    }

    // 1. Submit Answer
    if (actionData.type === 'submit_answer' && this.gameState === 'question') {
      const player = this.room.players.get(playerId);
      if (!player || player.isSpectator) return;

      const numericVal = parseFloat(actionData.answer);
      if (!isNaN(numericVal)) {
        this.playerAnswers.set(playerId, {
          answer: numericVal,
          submitTime: Date.now(),
          name: player.name,
          avatar: player.avatar,
          color: player.color
        });

        // Notify client that answer was recorded
        this.room.sendToPlayer(playerId, { type: 'conquest_answer_received' });

        // If all alive players submitted, evaluate immediately
        const activePlayersCount = Array.from(this.room.players.values()).filter(p => !p.isSpectator).length;
        if (this.playerAnswers.size >= activePlayersCount) {
          this.resolveQuestion();
        }
      }
    }

    // 2. Claim Territory Pick
    if (actionData.type === 'claim_territory' && this.gameState === 'conquer_pick') {
      if (this.activePickerId === playerId) {
        this.claimTerritory(playerId, actionData.territoryId);
      }
    }

    // 3. Attack Territory in Duel
    if (actionData.type === 'attack_territory' && this.gameState === 'duel_pick') {
      if (this.activePickerId === playerId) {
        this.startDuel(playerId, actionData.territoryId);
      }
    }
  }

  resolveQuestion() {
    this.gameState = 'question_result';
    this.phaseTimer = this.resultDuration;

    const correctAnswer = this.currentQuestion.answer;
    const evaluated = [];

    for (const [pId, data] of this.playerAnswers.entries()) {
      const diff = Math.abs(data.answer - correctAnswer);
      evaluated.push({
        playerId: pId,
        name: data.name,
        avatar: data.avatar,
        color: data.color,
        answer: data.answer,
        diff,
        submitTime: data.submitTime
      });
    }

    // Sort by difference first (accuracy), then by submitTime (speed)
    evaluated.sort((a, b) => {
      if (a.diff !== b.diff) {
        return a.diff - b.diff;
      }
      return a.submitTime - b.submitTime;
    });

    this.questionResults = evaluated;

    this.room.broadcastEvent({
      type: 'conquest_question_result',
      correctAnswer,
      unit: this.currentQuestion.unit,
      results: evaluated
    });

    // Check if there are neutral territories left to conquer
    const neutralTerritories = this.territories.filter(t => t.ownerId === null);
    
    // Fill pickerQueue with winners (top 1, 2, or 3)
    this.pickerQueue = evaluated.map(e => e.playerId);

    setTimeout(() => {
      if (this.gameState === 'game_over') return;
      if (neutralTerritories.length > 0) {
        this.startConquerPickPhase();
      } else {
        // All territories claimed -> start Siege / Duel Battles!
        this.startConquerPickPhase();
      }
    }, this.resultDuration * 1000);
  }

  startConquerPickPhase() {
    if (this.pickerQueue.length === 0) {
      this.advanceRound();
      return;
    }

    this.gameState = 'conquer_pick';
    this.phaseTimer = this.pickDuration;
    this.activePickerId = this.pickerQueue.shift();

    const pickerPlayer = this.room.players.get(this.activePickerId);
    const pickerName = pickerPlayer ? pickerPlayer.name : 'Oyuncu';

    this.room.broadcastEvent({
      type: 'conquest_pick_turn',
      pickerId: this.activePickerId,
      pickerName,
      timer: this.pickDuration
    });
    this.room.broadcastChat('Fetih', `🏰 Sıra ${pickerName} adlı oyuncuda! Haritadan fethetmek istediğiniz şehre tıklayın.`, '#38bdf8');
  }

  claimTerritory(playerId, territoryId) {
    const player = this.room.players.get(playerId);
    if (!player) return;

    const territory = this.territories.find(t => t.id === territoryId);
    if (!territory) return;

    // In neutral phase or attack phase
    const oldOwnerId = territory.ownerId;
    territory.ownerId = playerId;
    territory.color = player.color || '#3b82f6';

    // Recalculate scores
    this.recalculateScores();

    this.room.broadcastEvent({
      type: 'conquest_territory_claimed',
      territoryId,
      territoryName: territory.name,
      conquerorId: playerId,
      conquerorName: player.name,
      color: territory.color,
      points: territory.points
    });

    this.room.broadcastChat('Fetih', `🚩 ${player.name}, ${territory.name} şehrini fethetti! (+${territory.points} Puan)`, '#10b981');

    this.advancePickerQueue();
  }

  advancePickerQueue() {
    if (this.pickerQueue.length > 0) {
      this.startConquerPickPhase();
    } else {
      this.advanceRound();
    }
  }

  advanceRound() {
    this.currentRound++;
    if (this.currentRound > this.maxRounds) {
      this.endGame();
    } else {
      setTimeout(() => {
        if (this.gameState !== 'game_over') {
          this.startQuestionPhase();
        }
      }, 2000);
    }
  }

  recalculateScores() {
    const scoresMap = new Map();
    for (const t of this.territories) {
      if (t.ownerId) {
        scoresMap.set(t.ownerId, (scoresMap.get(t.ownerId) || 0) + t.points);
      }
    }

    for (const [pId, score] of scoresMap.entries()) {
      this.scores.set(pId, score);
      const pl = this.room.players.get(pId);
      if (pl) pl.score = score;
    }
  }

  endGame() {
    this.gameState = 'game_over';
    this.recalculateScores();

    const playerList = Array.from(this.room.players.values()).filter(p => !p.isSpectator);
    playerList.sort((a, b) => (this.scores.get(b.id) || 0) - (this.scores.get(a.id) || 0));

    const winnerPlayer = playerList[0];
    const winnerName = winnerPlayer ? winnerPlayer.name : 'Şampiyon';

    this.room.broadcastEvent({
      type: 'game_over',
      winner: 'conquest',
      winnerName,
      message: `🏆 BİL VE FETHET ŞAMPİYONU: ${winnerName}!`
    });

    this.room.broadcastChat('Sistem', `🏆 OYUN BİTTİ! Haritanın hakimi ${winnerName} oldu!`, '#facc15');

    setTimeout(() => this.resetGame(), 7000);
  }

  resetGame() {
    this.gameState = 'waiting';
    this.currentRound = 1;
    this.winner = null;
    this.initTerritories();
    this.scores.clear();

    this.room.broadcastChat('Sistem', '🏰 Lobi moduna dönüldü. Yeni fetih oyununu başlatabilirsiniz.', '#38bdf8');
  }

  update(dt, secTimerTick) {
    if (this.phaseTimer > 0) {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) {
        this.phaseTimer = 0;
        this.handleTimeout();
      }
    }
  }

  handleTimeout() {
    if (this.gameState === 'question') {
      this.resolveQuestion();
    } else if (this.gameState === 'conquer_pick') {
      // Auto pick a random available territory
      const neutral = this.territories.filter(t => t.ownerId === null);
      if (neutral.length > 0 && this.activePickerId) {
        this.claimTerritory(this.activePickerId, neutral[0].id);
      } else {
        this.advancePickerQueue();
      }
    }
  }

  getState() {
    const playerList = Array.from(this.room.players.values());
    return {
      mode: 'conquest',
      width: this.width,
      height: this.height,
      gameState: this.gameState,
      currentRound: this.currentRound,
      maxRounds: this.maxRounds,
      phaseTimer: Math.ceil(this.phaseTimer),
      activePickerId: this.activePickerId,
      territories: this.territories,
      scores: Array.from(this.scores.entries()).map(([id, score]) => ({ id, score })),
      playersMeta: playerList.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        color: p.color,
        score: this.scores.get(p.id) || 0,
        hasAnswered: this.playerAnswers.has(p.id)
      }))
    };
  }
}
