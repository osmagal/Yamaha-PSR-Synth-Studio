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

export type SynthPreset = 
  | 'modern-poly' 
  | 'cinematic-pad' 
  | 'fm-electric-tine' 
  | 'sub-bass-growl' 
  | 'shimmer-glass' 
  | 'ambient-nebula'
  | 'retro-future-lead'
  | 'modern-piano';

export interface SynthSettings {
  cutoff: number;
  resonance: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  delayMix: number;
  reverbMix: number;
  preset: SynthPreset;
}
