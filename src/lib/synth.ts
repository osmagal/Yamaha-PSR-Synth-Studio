/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Tone from 'tone';
import { SynthSettings, SynthPresetID } from '../types';

class SynthEngine {
  private polySynth: Tone.PolySynth<Tone.Synth>;
  private fmSynth: Tone.PolySynth<Tone.FMSynth>;
  private amSynth: Tone.PolySynth<Tone.AMSynth>;
  private sampler: Tone.Sampler;
  
  private filter: Tone.Filter;
  private filterEnvelope: Tone.FrequencyEnvelope;
  private delay: Tone.FeedbackDelay;
  private reverb: Tone.Reverb;
  private chorus: Tone.Chorus;
  private distortion: Tone.Distortion;
  private eq: Tone.EQ3;
  private masterVolume: Tone.Volume;
  private lfo: Tone.LFO;
  
  private metronomeClick: Tone.NoiseSynth;
  private metronomeLoop: Tone.Loop | null = null;
  
  private currentEngine: 'poly' | 'fm' | 'am' | 'sampler' = 'poly';

  constructor() {
    // 1. High-Performance Signal Path
    this.filter = new Tone.Filter({
      frequency: 2000,
      type: 'lowpass',
      rolloff: -24,
      Q: 1
    });

    this.masterVolume = new Tone.Volume(0).toDestination();
    this.filter.connect(this.masterVolume);

    this.reverb = new Tone.Reverb({ decay: 4, wet: 0.3 }).connect(this.filter);
    this.delay = new Tone.FeedbackDelay('8n', 0.4).connect(this.reverb);
    this.chorus = new Tone.Chorus(4, 2.5, 0.3).connect(this.delay).start();
    this.distortion = new Tone.Distortion(0.4).connect(this.chorus);
    this.eq = new Tone.EQ3(0, 0, 0).connect(this.distortion);

    // 2. Dedicated Filter Envelope
    this.filterEnvelope = new Tone.FrequencyEnvelope({
      attack: 0.1,
      decay: 0.2,
      sustain: 0.5,
      release: 1,
      baseFrequency: 200,
      octaves: 4,
      exponent: 2
    }).connect(this.filter.frequency);

    // 3. Modulation Matrix (LFO)
    this.lfo = new Tone.LFO('4n', 0, 100).start();

    // 4. Synthesis Engines with Voice Stealing (maxPolyphony)
    this.polySynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.01, release: 1 },
      volume: -6
    }).connect(this.distortion);
    this.polySynth.maxPolyphony = 24;

    this.fmSynth = new Tone.PolySynth(Tone.FMSynth, {
      envelope: { attack: 0.01, release: 1 },
      volume: -6
    }).connect(this.distortion);
    this.fmSynth.maxPolyphony = 16;

    this.amSynth = new Tone.PolySynth(Tone.AMSynth, {
      envelope: { attack: 0.1, release: 2 },
      volume: -6
    }).connect(this.eq);
    this.amSynth.maxPolyphony = 16;

    this.sampler = new Tone.Sampler({
      urls: {
        A0: "A0.mp3",
        C1: "C1.mp3",
        "D#1": "Ds1.mp3",
        "F#1": "Fs1.mp3",
        A1: "A1.mp3",
        C2: "C2.mp3",
        "D#2": "Ds2.mp3",
        "F#2": "Fs2.mp3",
        A2: "A2.mp3",
        C3: "C3.mp3",
        "D#3": "Ds3.mp3",
        "F#3": "Fs3.mp3",
        A3: "A3.mp3",
        C4: "C4.mp3",
        "D#4": "Ds4.mp3",
        "F#4": "Fs4.mp3",
        A4: "A4.mp3",
        C5: "C5.mp3",
        "D#5": "Ds5.mp3",
        "F#5": "Fs5.mp3",
        A5: "A5.mp3",
        C6: "C6.mp3",
        "D#6": "Ds6.mp3",
        "F#6": "Fs6.mp3",
        A6: "A6.mp3",
        C7: "C7.mp3",
        "D#7": "Ds7.mp3",
        "F#7": "Fs7.mp3",
        A7: "A7.mp3",
        C8: "C8.mp3"
      },
      baseUrl: "https://tonejs.github.io/audio/salamander/",
      onload: () => console.log("Piano Samples Loaded"),
      volume: -3
    }).connect(this.eq);
    
    // Initial State
    this.applyPreset('modern-poly');

    // Metronome setup - "Clack" sound using NoiseSynth
    this.metronomeClick = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.08, sustain: 0 },
      volume: -12
    }).toDestination();
  }

  async init() {
    await Tone.start();
    await this.reverb.ready;
  }

  // High-performance direct updates
  updateParameter(key: string, value: number) {
    switch (key) {
      case 'eqLow':
        this.eq.low.value = value;
        break;
      case 'eqMid':
        this.eq.mid.value = value;
        break;
      case 'eqHigh':
        this.eq.high.value = value;
        break;
      case 'masterVolume':
        // Map 0-1 to -60 to +6 dB
        this.masterVolume.volume.value = value === 0 ? -Infinity : (value * 66) - 60;
        break;
      case 'cutoff':
        this.filterEnvelope.baseFrequency = value;
        break;
      case 'resonance':
        this.filter.Q.value = value;
        break;
      case 'delayMix':
        this.delay.wet.value = value;
        break;
      case 'reverbMix':
        this.reverb.wet.value = value;
        break;
      case 'chorusMix':
        this.chorus.wet.value = value;
        break;
      case 'drive':
        this.distortion.distortion = value;
        break;
      case 'attack':
        this.setEnvelopeParam('attack', value);
        break;
      case 'release':
        this.setEnvelopeParam('release', value);
        break;
      case 'filterAttack':
        this.filterEnvelope.attack = value;
        break;
      case 'filterRelease':
        this.filterEnvelope.release = value;
        break;
    }
  }

  private setEnvelopeParam(param: string, value: number) {
    [this.polySynth, this.fmSynth, this.amSynth].forEach(s => {
      s.set({ envelope: { [param]: value } });
    });
  }

  private lastPreset: SynthPresetID | null = null;

  setSettings(settings: SynthSettings) {
    Object.entries(settings).forEach(([key, value]) => {
      if (typeof value === 'number') this.updateParameter(key, value);
    });
    
    if (settings.preset !== this.lastPreset) {
      this.applyPreset(settings.preset);
      this.lastPreset = settings.preset;
    }
  }

  private applyPreset(preset: SynthPresetID) {
    this.chorus.wet.value = 0.3;
    this.distortion.distortion = 0;
    
    // Defer non-critical synth updates to avoid blocking the audio thread
    switch (preset) {
      case 'modern-poly':
        if (this.currentEngine !== 'poly') {
          this.currentEngine = 'poly';
          this.polySynth.set({ oscillator: { type: 'sawtooth' } });
        }
        break;
      case 'cinematic-pad':
        this.currentEngine = 'am';
        this.amSynth.set({ 
          oscillator: { type: 'sine' }, 
          envelope: { attack: 1.5, release: 2.5 } 
        });
        this.filterEnvelope.attack = 1.5;
        this.filterEnvelope.release = 2.5;
        this.chorus.wet.value = 0.8;
        break;
      case 'modern-piano':
        this.currentEngine = 'sampler';
        break;
      case 'sub-bass-growl':
        this.currentEngine = 'poly';
        this.polySynth.set({ 
          oscillator: { type: 'fatsawtooth', count: 3 },
          envelope: { attack: 0.05, release: 0.5 }
        });
        this.distortion.distortion = 0.4;
        break;
      case 'fm-electric-tine':
        this.currentEngine = 'fm';
        this.fmSynth.set({
          harmonicity: 3.5,
          modulationIndex: 15,
          envelope: { attack: 0.01, release: 1.5 }
        });
        break;
      case 'shimmer-glass':
        this.currentEngine = 'fm';
        this.fmSynth.set({
          harmonicity: 10,
          modulationIndex: 30,
          envelope: { attack: 0.1, release: 1 }
        });
        this.reverb.wet.value = 0.6;
        break;
      case 'ambient-nebula':
        this.currentEngine = 'am';
        this.amSynth.set({
          oscillator: { type: 'fatsawtooth' },
          envelope: { attack: 2, release: 4 }
        });
        this.filterEnvelope.attack = 2.5;
        this.chorus.wet.value = 1;
        break;
      case 'retro-future-lead':
        this.currentEngine = 'poly';
        this.polySynth.set({ 
          oscillator: { type: 'pulse', width: 0.2 },
          envelope: { attack: 0.01, release: 0.3 }
        });
        break;
      default:
        this.currentEngine = 'poly';
    }
  }

  triggerAttack(note: string, velocity: number) {
    const time = Tone.now();
    this.getEngine().triggerAttack(note, time, velocity);
    this.filterEnvelope.triggerAttack(time);
  }

  triggerRelease(note: string) {
    const time = Tone.now();
    this.getEngine().triggerRelease(note, time);
    this.filterEnvelope.triggerRelease(time);
  }

  private getEngine() {
    if (this.currentEngine === 'fm') return this.fmSynth;
    if (this.currentEngine === 'am') return this.amSynth;
    if (this.currentEngine === 'sampler') return this.sampler;
    return this.polySynth;
  }

  getAnalyser() {
    const analyser = new Tone.Analyser('waveform', 1024);
    this.filter.connect(analyser);
    return analyser;
  }

  // Metronome Controls
  setMetronome(on: boolean, bpm: number) {
    Tone.Transport.bpm.value = bpm;
    
    if (on) {
      if (!this.metronomeLoop) {
        this.metronomeLoop = new Tone.Loop(time => {
          // Detect downbeat (every 4 beats)
          const isDownbeat = Math.round(Tone.Transport.ticks / Tone.Transport.PPQ) % 4 === 0;
          this.metronomeClick.triggerAttackRelease("16n", time, isDownbeat ? 1 : 0.4);
        }, "4n");
      }
      this.metronomeLoop.start(0);
      Tone.Transport.start();
    } else {
      this.metronomeLoop?.stop();
      Tone.Transport.stop();
    }
  }
}

export const synthEngine = new SynthEngine();
