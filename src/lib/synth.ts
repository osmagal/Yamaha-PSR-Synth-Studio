/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Tone from 'tone';
import { SynthSettings, SynthPreset } from '../types';

class SynthEngine {
  private polySynth: Tone.PolySynth;
  private fmSynth: Tone.PolySynth<Tone.FMSynth>;
  private amSynth: Tone.PolySynth<Tone.AMSynth>;
  
  private filter: Tone.Filter;
  private delay: Tone.FeedbackDelay;
  private reverb: Tone.Reverb;
  private chorus: Tone.Chorus;
  private phaser: Tone.Phaser;
  
  private currentEngine: 'poly' | 'fm' | 'am' = 'poly';

  constructor() {
    // Advanced Effects Chain
    this.filter = new Tone.Filter(2000, 'lowpass').toDestination();
    this.reverb = new Tone.Reverb({ decay: 4, wet: 0.5 }).connect(this.filter);
    this.delay = new Tone.FeedbackDelay('8n', 0.5).connect(this.reverb);
    this.chorus = new Tone.Chorus(4, 2.5, 0.5).connect(this.delay).start();
    this.phaser = new Tone.Phaser({ frequency: 0.5, octaves: 3, baseFrequency: 1000 }).connect(this.chorus);

    // Multiple Synthesis Engines
    this.polySynth = new Tone.PolySynth(Tone.Synth).connect(this.phaser);
    this.fmSynth = new Tone.PolySynth(Tone.FMSynth).connect(this.phaser);
    this.amSynth = new Tone.PolySynth(Tone.AMSynth).connect(this.phaser);
    
    this.delay.wet.value = 0.3;
  }

  async init() {
    await Tone.start();
    await this.reverb.ready;
  }

  setSettings(settings: SynthSettings) {
    this.filter.frequency.value = settings.cutoff;
    this.filter.Q.value = settings.resonance;
    
    const envelope = {
      attack: settings.attack,
      decay: settings.decay,
      sustain: settings.sustain,
      release: settings.release,
    };

    [this.polySynth, this.fmSynth, this.amSynth].forEach(s => {
      s.set({ envelope });
    });

    this.delay.wet.value = settings.delayMix;
    this.reverb.wet.value = settings.reverbMix;

    this.applyPreset(settings.preset);
  }

  private applyPreset(preset: SynthPreset) {
    // Reset modulation/effects for specific presets
    this.phaser.wet.value = 0;
    this.chorus.wet.value = 0.5;

    switch (preset) {
      case 'modern-poly':
        this.currentEngine = 'poly';
        this.polySynth.set({ oscillator: { type: 'sawtooth' } });
        break;
      
      case 'cinematic-pad':
        this.currentEngine = 'am';
        this.phaser.wet.value = 0.8;
        this.amSynth.set({
          oscillator: { type: 'sine' },
          modulation: { type: 'square' }
        });
        break;

      case 'fm-electric-tine':
        this.currentEngine = 'fm';
        this.fmSynth.set({
          harmonicity: 3.5,
          modulationIndex: 10,
          oscillator: { type: 'sine' },
          modulation: { type: 'triangle' }
        });
        break;

      case 'sub-bass-growl':
        this.currentEngine = 'poly';
        this.polySynth.set({ oscillator: { type: 'fatsawtooth', count: 3, spread: 30 } });
        break;

      case 'shimmer-glass':
        this.currentEngine = 'fm';
        this.fmSynth.set({
          harmonicity: 10,
          modulationIndex: 40,
          oscillator: { type: 'sine' }
        });
        break;

      case 'ambient-nebula':
        this.currentEngine = 'am';
        this.chorus.wet.value = 1;
        this.amSynth.set({
          oscillator: { type: 'fatsawtooth' },
          modulation: { type: 'sine' }
        });
        break;

      case 'retro-future-lead':
        this.currentEngine = 'poly';
        this.polySynth.set({ oscillator: { type: 'pulse', width: 0.2 } });
        break;

      case 'modern-piano':
        this.currentEngine = 'fm';
        this.fmSynth.set({
          harmonicity: 1.5,
          modulationIndex: 12,
          oscillator: { type: 'sine' },
          modulation: { type: 'sine' },
          envelope: {
            attack: 0.005,
            decay: 1.5,
            sustain: 0.1,
            release: 1.2
          }
        });
        this.chorus.wet.value = 0.2;
        break;
    }
  }

  triggerAttack(note: string, velocity: number) {
    const engine = this.getEngine();
    engine.triggerAttack(note, Tone.now(), velocity);
  }

  triggerRelease(note: string) {
    const engine = this.getEngine();
    engine.triggerRelease(note, Tone.now());
  }

  private getEngine() {
    if (this.currentEngine === 'fm') return this.fmSynth;
    if (this.currentEngine === 'am') return this.amSynth;
    return this.polySynth;
  }

  getAnalyser() {
    const analyser = new Tone.Analyser('waveform', 1024);
    this.filter.connect(analyser);
    return analyser;
  }
}

export const synthEngine = new SynthEngine();
