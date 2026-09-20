// conquestSounds.js - Procedural Synthesizers for Bil ve Fethet (Trivia & Conquest)

export class ConquestSoundPack {
  constructor(audioEngine) {
    this.audio = audioEngine;
  }

  playConquestHorn() {
    if (this.audio.muted || !this.audio.ctx) return;
    try {
      const now = this.audio.ctx.currentTime;
      [146.83, 220.00, 293.66].forEach((freq, idx) => {
        const osc = this.audio.ctx.createOscillator();
        const gain = this.audio.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.25, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 1.8);

        osc.connect(gain);
        gain.connect(this.audio.ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 1.8);
      });
    } catch (e) {}
  }

  playCorrectChime() {
    if (this.audio.muted || !this.audio.ctx) return;
    try {
      const now = this.audio.ctx.currentTime;
      [587.33, 880.00, 1174.66, 1760.00].forEach((freq, i) => {
        const osc = this.audio.ctx.createOscillator();
        const gain = this.audio.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.06);

        gain.gain.setValueAtTime(0.25, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.6);

        osc.connect(gain);
        gain.connect(this.audio.ctx.destination);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.6);
      });
    } catch (e) {}
  }

  playSwordClash() {
    if (this.audio.muted || !this.audio.ctx) return;
    try {
      const now = this.audio.ctx.currentTime;
      const osc = this.audio.ctx.createOscillator();
      const gain = this.audio.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(3200, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.18);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

      osc.connect(gain);
      gain.connect(this.audio.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    } catch (e) {}
  }
}
