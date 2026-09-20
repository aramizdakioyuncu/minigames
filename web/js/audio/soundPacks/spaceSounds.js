// spaceSounds.js - Procedural Synthesizers for Space Infiltration & Tasks

export class SpaceSoundPack {
  constructor(audioEngine) {
    this.audio = audioEngine;
  }

  playKill() {
    if (this.audio.muted || !this.audio.ctx) return;
    try {
      const now = this.audio.ctx.currentTime;
      const osc = this.audio.ctx.createOscillator();
      const gain = this.audio.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.25);

      gain.gain.setValueAtTime(0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

      osc.connect(gain);
      gain.connect(this.audio.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {}
  }

  playVent() {
    if (this.audio.muted || !this.audio.ctx) return;
    try {
      const now = this.audio.ctx.currentTime;
      const osc = this.audio.ctx.createOscillator();
      const gain = this.audio.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.linearRampToValueAtTime(160, now + 0.1);
      osc.frequency.linearRampToValueAtTime(50, now + 0.22);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

      osc.connect(gain);
      gain.connect(this.audio.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch (e) {}
  }

  playTaskComplete() {
    if (this.audio.muted || !this.audio.ctx) return;
    try {
      const now = this.audio.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = this.audio.ctx.createOscillator();
        const gain = this.audio.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.07);

        gain.gain.setValueAtTime(0.25, now + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.35);

        osc.connect(gain);
        gain.connect(this.audio.ctx.destination);
        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.35);
      });
    } catch (e) {}
  }

  playEmergencyMeeting() {
    if (this.audio.muted || !this.audio.ctx) return;
    try {
      const now = this.audio.ctx.currentTime;
      for (let rep = 0; rep < 3; rep++) {
        const t0 = now + rep * 0.35;
        const osc = this.audio.ctx.createOscillator();
        const gain = this.audio.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, t0);
        osc.frequency.setValueAtTime(1760, t0 + 0.15);

        gain.gain.setValueAtTime(0.4, t0);
        gain.gain.exponentialRampToValueAtTime(0.01, t0 + 0.3);

        osc.connect(gain);
        gain.connect(this.audio.ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 0.3);
      }
    } catch (e) {}
  }
}
