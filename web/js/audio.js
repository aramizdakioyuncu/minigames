// audio.js - Modular Procedural Web Audio API Sound Synthesizer

import { FootballSoundPack } from './audio/soundPacks/footballSounds.js';
import { SpaceSoundPack } from './audio/soundPacks/spaceSounds.js';
import { VampireSoundPack } from './audio/soundPacks/vampireSounds.js';
import { ConquestSoundPack } from './audio/soundPacks/conquestSounds.js';

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;

    this.football = new FootballSoundPack(this);
    this.space = new SpaceSoundPack(this);
    this.vampire = new VampireSoundPack(this);
    this.conquest = new ConquestSoundPack(this);
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  // Football delegated methods
  playKick() { this.football.playKick(); }
  playBounce() { this.football.playBounce(); }
  playGoalScored() { this.football.playGoalScored(); }
  playGoalConceded() { this.football.playGoalConceded(); }
  playGoal() { this.football.playGoalScored(); }

  // Space delegated methods
  playKill() { this.space.playKill(); }
  playVent() { this.space.playVent(); }
  playTaskComplete() { this.space.playTaskComplete(); }
  playEmergencyMeeting() { this.space.playEmergencyMeeting(); }

  // Vampire delegated methods
  playWolfHowl() { this.vampire.playWolfHowl(); }
  playVillageBell() { this.vampire.playVillageBell(); }

  // Conquest delegated methods
  playConquestHorn() { this.conquest.playConquestHorn(); }
  playCorrectChime() { this.conquest.playCorrectChime(); }
  playSwordClash() { this.conquest.playSwordClash(); }

  // Shared short effects for arcade actions. Rate limiting avoids oscillator floods.
  tone(start, end = start, duration = 0.12, type = 'sine') {
    if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    if (now - (this.lastToneAt ?? -1) < 0.025) return;
    this.lastToneAt = now;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(start, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, end), now + duration);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    osc.start(now); osc.stop(now + duration);
  }

  playPickup() { this.tone(700, 1000, 0.07); }
  playSplit() { this.tone(180, 700, 0.18); }
  playMerge() { this.tone(700, 220, 0.22); }
  playEject() { this.tone(380, 160, 0.09); }
  playEatPlayer() { this.tone(160, 70, 0.3, 'triangle'); }
  playDash() { this.tone(120, 600, 0.16, 'triangle'); }
  playWhistle() { this.tone(1800, 2100, 0.3); }
  playClick() { this.tone(500, 400, 0.05); }
  playMagnetHold() { this.tone(200, 500, 0.25); }
  playTackle() { this.tone(140, 50, 0.12, 'triangle'); }
  playBite() { this.playKill(); }
  playGavel() { this.tone(100, 40, 0.15, 'triangle'); }
  playEmergencySiren() { this.playEmergencyMeeting(); }
  playEjection() { this.tone(800, 60, 0.8); }

  // Level Up Celebratory Fanfare
  playLevelUp() {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // Fanfare Arpeggio: C4 - E4 - G4 - C5 - E5 - G5
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.3, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 1.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 1.2);
      });
    } catch (e) {}
  }
}

export const audio = new SoundEngine();
