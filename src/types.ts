/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MIDIMessage {
  status: number;
  data1: number;
  data2: number;
  timestamp: number;
}

export type SynthPresetID = 
  | 'modern-poly' 
  | 'cinematic-pad' 
  | 'fm-electric-tine' 
  | 'sub-bass-growl' 
  | 'shimmer-glass' 
  | 'ambient-nebula'
  | 'retro-future-lead'
  | 'modern-piano';

export interface SynthPreset {
  id: SynthPresetID;
  name: string;
  category: 'Piano' | 'Synth' | 'Pad' | 'Lead' | 'Bass';
  engine: 'poly' | 'fm' | 'am';
  settings: Partial<SynthSettings>;
}

export interface SynthSettings {
  cutoff: number;
  resonance: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  filterAttack: number;
  filterDecay: number;
  filterSustain: number;
  filterRelease: number;
  delayMix: number;
  reverbMix: number;
  chorusMix: number;
  drive: number;
  eqLow: number;
  eqMid: number;
  eqHigh: number;
  masterVolume: number;
  preset: SynthPresetID;
}
