// vampireSounds.js - Procedural Synthesizers for Vampire & Werewolf Mode

export class VampireSoundPack {
  constructor(audioEngine) {
    this.audio = audioEngine;
  }

  playWolfHowl() {
    if (this.audio.muted || !this.audio.ctx) return;
    try {
      const now = this.audio.ctx.currentTime;
      const osc = this.audio.ctx.createOscillator();
      const gain = this.audio.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(580, now + 0.6);
      osc.frequency.linearRampToValueAtTime(440, now + 1.2);
      osc.frequency.exponentialRampToValueAtTime(140, now + 2.0);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.4);
      gain.gain.linearRampToValueAtTime(0.25, now + 1.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

      osc.connect(gain);
      gain.connect(this.audio.ctx.destination);
      osc.start(now);
      osc.stop(now + 2.0);
    } catch (e) {}
  }

  playVillageBell() {
    if (this.audio.muted || !this.audio.ctx) return;
    try {
      const now = this.audio.ctx.currentTime;
      [220, 440, 660, 880].forEach(freq => {
        const osc = this.audio.ctx.createOscillator();
        const gain = this.audio.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

        osc.connect(gain);
        gain.connect(this.audio.ctx.destination);
        osc.start(now);
        osc.stop(now + 2.5);
      });
    } catch (e) {}
  }
}
