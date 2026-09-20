// footballSounds.js - Procedural Synthesizers for Football & Physics Arena

export class FootballSoundPack {
  constructor(audioEngine) {
    this.audio = audioEngine;
  }

  playKick() {
    if (this.audio.muted || !this.audio.ctx) return;
    try {
      const osc = this.audio.ctx.createOscillator();
      const gain = this.audio.ctx.createGain();
      const now = this.audio.ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.12);

      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

      osc.connect(gain);
      gain.connect(this.audio.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {}
  }

  playBounce() {
    if (this.audio.muted || !this.audio.ctx) return;
    try {
      const osc = this.audio.ctx.createOscillator();
      const gain = this.audio.ctx.createGain();
      const now = this.audio.ctx.currentTime;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

      osc.connect(gain);
      gain.connect(this.audio.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {}
  }

  playGoalScored() {
    if (this.audio.muted || !this.audio.ctx) return;
    try {
      const now = this.audio.ctx.currentTime;
      // High Energy Whistle
      const oscW = this.audio.ctx.createOscillator();
      const gainW = this.audio.ctx.createGain();
      oscW.type = 'sine';
      oscW.frequency.setValueAtTime(1800, now);
      oscW.frequency.setValueAtTime(2400, now + 0.08);
      oscW.frequency.setValueAtTime(2000, now + 0.16);

      gainW.gain.setValueAtTime(0.3, now);
      gainW.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

      oscW.connect(gainW);
      gainW.connect(this.audio.ctx.destination);
      oscW.start(now);
      oscW.stop(now + 0.45);

      // Stadium Horn Major Chord
      const freqs = [174.61, 220.00, 261.63, 349.23];
      freqs.forEach((freq, idx) => {
        const osc = this.audio.ctx.createOscillator();
        const gain = this.audio.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + 0.2 + idx * 0.03);

        gain.gain.setValueAtTime(0.18, now + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

        osc.connect(gain);
        gain.connect(this.audio.ctx.destination);
        osc.start(now + 0.2);
        osc.stop(now + 1.8);
      });
    } catch (e) {}
  }

  playGoalConceded() {
    if (this.audio.muted || !this.audio.ctx) return;
    try {
      const now = this.audio.ctx.currentTime;
      const oscW = this.audio.ctx.createOscillator();
      const gainW = this.audio.ctx.createGain();
      oscW.type = 'sawtooth';
      oscW.frequency.setValueAtTime(400, now);
      oscW.frequency.exponentialRampToValueAtTime(120, now + 0.5);

      gainW.gain.setValueAtTime(0.25, now);
      gainW.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

      oscW.connect(gainW);
      gainW.connect(this.audio.ctx.destination);
      oscW.start(now);
      oscW.stop(now + 0.5);
    } catch (e) {}
  }
}
