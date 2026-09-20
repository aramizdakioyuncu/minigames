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
