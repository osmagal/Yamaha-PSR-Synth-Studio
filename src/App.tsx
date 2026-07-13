/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { motion, AnimatePresence } from 'motion/react';
import { Piano, Settings2, Waves, Zap, Activity, Info, Music } from 'lucide-react';
import { useMIDI } from './hooks/useMIDI';
import { synthEngine } from './lib/synth';
import { SynthSettings, SynthPresetID } from './types';
import { Knob } from './components/Knob';
import { Oscilloscope } from './components/Oscilloscope';

const INITIAL_SETTINGS: SynthSettings = {
  cutoff: 2000,
  resonance: 1,
  attack: 0.1,
  decay: 0.2,
  sustain: 0.5,
  release: 1.0,
  filterAttack: 0.1,
  filterDecay: 0.2,
  filterSustain: 0.5,
  filterRelease: 1.0,
  delayMix: 0.2,
  reverbMix: 0.3,
  chorusMix: 0.3,
  drive: 0,
  eqLow: 0,
  eqMid: 0,
  eqHigh: 0,
  preset: 'modern-poly'
};

const PRESETS: { id: SynthPresetID; label: string; icon: any; category: string }[] = [
  { id: 'modern-poly', label: 'Modern Poly', icon: Zap, category: 'Synth' },
  { id: 'cinematic-pad', label: 'Cinematic Pad', icon: Waves, category: 'Pad' },
  { id: 'fm-electric-tine', label: 'Electric Tine', icon: Music, category: 'Piano' },
  { id: 'sub-bass-growl', label: 'Sub Growl', icon: Activity, category: 'Bass' },
  { id: 'shimmer-glass', label: 'Shimmer Glass', icon: Zap, category: 'Lead' },
  { id: 'ambient-nebula', label: 'Nebula Pad', icon: Waves, category: 'Pad' },
  { id: 'retro-future-lead', label: 'Retro Lead', icon: Activity, category: 'Lead' },
  { id: 'modern-piano', label: 'Modern Piano', icon: Music, category: 'Piano' },
];

export default function App() {
  const [isStarted, setIsStarted] = useState(false);
  const [settings, setSettings] = useState<SynthSettings>(INITIAL_SETTINGS);
  const [analyser, setAnalyser] = useState<Tone.Analyser | null>(null);
  const [lastNote, setLastNote] = useState<{ name: string; vel: number } | null>(null);
  const [savedPresets, setSavedPresets] = useState<Record<string, SynthSettings>>({});
  const { inputs, selectedInput, setSelectedInput, onMessage } = useMIDI();
  
  useEffect(() => {
    const saved = localStorage.getItem('psr_presets');
    if (saved) setSavedPresets(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (isStarted) {
      synthEngine.setSettings(settings);
    }
  }, [settings, isStarted]);

  const handleStart = async () => {
    await synthEngine.init();
    setAnalyser(synthEngine.getAnalyser());
    setIsStarted(true);
  };

  const saveCurrentPreset = () => {
    const name = prompt('Preset Name:');
    if (name) {
      const updated = { ...savedPresets, [name]: settings };
      setSavedPresets(updated);
      localStorage.setItem('psr_presets', JSON.stringify(updated));
    }
  };

  useEffect(() => {
    if (!isStarted) return;

    const cleanup = onMessage((status, data1, data2) => {
      // MIDI Channel 1 Status: 144 (Note On), 128 (Note Off), 176 (Control Change)
      
      if (status === 144 && data2 > 0) {
        const frequency = Tone.Frequency(data1, "midi").toNote();
        synthEngine.triggerAttack(frequency, data2 / 127);
        setLastNote({ name: frequency, vel: data2 });
      } else if (status === 128 || (status === 144 && data2 === 0)) {
        const frequency = Tone.Frequency(data1, "midi").toNote();
        synthEngine.triggerRelease(frequency);
      } else if (status === 176) {
        // Standard CC Mappings
        // CC 74: Cutoff, CC 71: Resonance, CC 73: Attack, CC 72: Release
        if (data1 === 74) {
          const val = (data2 / 127) * 9950 + 50;
          synthEngine.updateParameter('cutoff', val);
          setSettings(prev => ({ ...prev, cutoff: val }));
        } else if (data1 === 71) {
          const val = (data2 / 127) * 20;
          synthEngine.updateParameter('resonance', val);
          setSettings(prev => ({ ...prev, resonance: val }));
        }
      }
    });

    return cleanup;
  }, [isStarted, onMessage]);

  const updateSetting = (key: keyof SynthSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-300 flex items-center justify-center font-sans selection:bg-blue-500/30">
      <AnimatePresence mode="wait">
        {!isStarted ? (
          <motion.div 
            key="splash"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="max-w-md w-full bg-[#141416] p-10 rounded-2xl border border-[#2A2A2E] text-center shadow-2xl"
            id="splash-screen"
          >
            <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 text-blue-500 border border-blue-500/20">
              <Piano size={40} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-3 text-white">PSR Synth Studio</h1>
            <p className="text-slate-500 mb-10 leading-relaxed text-sm">
              Connect your Yamaha PSR E383 via USB-MIDI to unlock modern synthesis power and VST precision.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-5 bg-[#1E1E21] rounded-xl border border-[#2A2A2E] text-left">
                <div className="text-emerald-500"><Zap size={24} /></div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">Device Status</p>
                  <p className="text-xs text-slate-400">
                    {inputs.length > 0 
                      ? `${inputs.length} MIDI Devices Available`
                      : "Waiting for USB-MIDI connection..."}
                  </p>
                </div>
              </div>

              <button
                onClick={handleStart}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20 uppercase tracking-widest text-xs"
                id="start-button"
              >
                Launch Modern Engine
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="studio"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full h-screen flex flex-col overflow-hidden"
            id="main-interface"
          >
            {/* Header */}
            <header className="flex items-center justify-between px-8 py-5 bg-[#141416] border-b border-[#2A2A2E]">
              <div className="flex items-center gap-5">
                <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                <div>
                  <h1 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 leading-none mb-1">Input Device</h1>
                  <p className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    {selectedInput ? inputs.find(i => i.id === selectedInput)?.name?.toUpperCase() : 'NO DEVICE'}
                    <span className="text-emerald-500 text-[10px] font-mono tracking-normal">USB-MIDI ACTIVE</span>
                  </p>
                </div>
              </div>
              
              <div className="flex gap-10">
                <div className="hidden md:block">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">MIDI Source</p>
                  <select 
                    value={selectedInput || ''} 
                    onChange={(e) => setSelectedInput(e.target.value)}
                    className="bg-[#1E1E21] border border-[#2A2A2E] rounded-md px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer min-w-[180px]"
                    id="midi-input-select"
                  >
                    <option value="">Select MIDI Device...</option>
                    {inputs.map(input => (
                      <option key={input.id} value={input.id}>{input.name}</option>
                    ))}
                  </select>
                </div>
                <div className="hidden lg:flex gap-8 items-center border-l border-[#2A2A2E] pl-10">
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Engine Load</p>
                    <div className="w-24 h-1.5 bg-[#2A2A2E] rounded-full overflow-hidden">
                      <div className="w-1/4 h-full bg-blue-500"></div>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Output</p>
                    <span className="text-xs font-mono text-slate-400">-6.2 dB</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={saveCurrentPreset}
                  className="px-4 py-2 bg-[#2A2A2E] hover:bg-[#35353A] text-xs font-bold rounded-md transition-colors uppercase tracking-widest"
                >
                  Save Preset
                </button>
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-md transition-colors uppercase tracking-widest shadow-lg shadow-blue-600/10">Export</button>
              </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar: Preset Browser */}
              <aside className="w-72 bg-[#141416] border-r border-[#2A2A2E] p-8 flex flex-col">
                <div className="mb-8">
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Search patches..." 
                      className="w-full bg-[#1E1E21] border border-[#2A2A2E] rounded-lg px-4 py-3 text-xs focus:outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
                
                <nav className="flex-1 overflow-y-auto custom-scrollbar">
                  <p className="text-[10px] font-bold uppercase text-slate-500 mb-6 tracking-widest border-b border-[#2A2A2E] pb-2">Factory Presets</p>
                  <ul className="space-y-1 mb-10">
                    {PRESETS.map(p => (
                      <li 
                        key={p.id}
                        onClick={() => updateSetting('preset', p.id)}
                        className={`px-4 py-3 rounded-lg text-sm font-medium cursor-pointer transition-all flex items-center gap-3 ${
                          settings.preset === p.id 
                          ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                          : 'hover:bg-[#1E1E21] text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <p.icon size={16} />
                        {p.label}
                      </li>
                    ))}
                  </ul>

                  {Object.keys(savedPresets).length > 0 && (
                    <>
                      <p className="text-[10px] font-bold uppercase text-slate-500 mb-6 tracking-widest border-b border-[#2A2A2E] pb-2">User Library</p>
                      <ul className="space-y-1">
                        {Object.entries(savedPresets).map(([name, s]) => (
                          <li 
                            key={name}
                            onClick={() => setSettings(s)}
                            className="px-4 py-3 rounded-lg text-sm font-medium cursor-pointer transition-all flex items-center gap-3 hover:bg-[#1E1E21] text-slate-400 hover:text-slate-200"
                          >
                            <Settings2 size={16} />
                            {name}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </nav>

                <div className="mt-auto pt-8 border-t border-[#2A2A2E]">
                  <div className="p-4 bg-[#1E1E21] rounded-xl border border-[#2A2A2E]">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Engine Mode</p>
                    <p className="text-xs font-bold text-slate-200">HI-RES AUDIO WORKLET</p>
                  </div>
                </div>
              </aside>

              {/* Main Content: VST Interface */}
              <main className="flex-1 flex flex-col p-10 overflow-y-auto bg-[#0A0A0B]">
                <section className="mb-10">
                  <Oscilloscope analyser={analyser} />
                </section>

                <div className="grid grid-cols-12 gap-8 mb-10">
                  {/* ADSR Sections */}
                  <div className="col-span-12 xl:col-span-6 bg-[#141416] p-8 rounded-2xl border border-[#2A2A2E] shadow-xl">
                    <div className="flex items-center justify-between mb-8 border-b border-[#2A2A2E] pb-4">
                      <h3 className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">Envelopes</h3>
                      <div className="flex gap-4">
                        <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded">AMP</span>
                        <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">FILTER</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <p className="text-[10px] text-slate-600 font-bold uppercase">Amp Env</p>
                        <div className="grid grid-cols-2 gap-4">
                           <Knob id="attack" label="A" min={0.01} max={4} value={settings.attack} onChange={(v) => updateSetting('attack', v)} />
                           <Knob id="release" label="R" min={0.01} max={4} value={settings.release} onChange={(v) => updateSetting('release', v)} />
                        </div>
                      </div>
                      <div className="space-y-6">
                        <p className="text-[10px] text-slate-600 font-bold uppercase">Filter Env</p>
                        <div className="grid grid-cols-2 gap-4">
                           <Knob id="filterAttack" label="A" min={0.01} max={4} value={settings.filterAttack} onChange={(v) => updateSetting('filterAttack', v)} />
                           <Knob id="filterRelease" label="R" min={0.01} max={4} value={settings.filterRelease} onChange={(v) => updateSetting('filterRelease', v)} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Filter & FX Section */}
                  <div className="col-span-12 xl:col-span-6 grid grid-cols-2 gap-8">
                    <div className="bg-[#141416] p-8 rounded-2xl border border-[#2A2A2E] shadow-xl">
                      <h3 className="text-[10px] font-bold uppercase text-slate-500 mb-8 tracking-widest border-b border-[#2A2A2E] pb-2">Filter</h3>
                      <div className="space-y-6">
                         <Knob id="cutoff" label="Cutoff" min={50} max={10000} value={settings.cutoff} onChange={(v) => updateSetting('cutoff', v)} />
                         <Knob id="resonance" label="Res" min={0} max={20} value={settings.resonance} onChange={(v) => updateSetting('resonance', v)} />
                      </div>
                    </div>
                    <div className="bg-[#141416] p-8 rounded-2xl border border-[#2A2A2E] shadow-xl">
                      <h3 className="text-[10px] font-bold uppercase text-slate-500 mb-8 tracking-widest border-b border-[#2A2A2E] pb-2">FX Rack</h3>
                      <div className="grid grid-cols-2 gap-y-8">
                         <Knob id="reverbMix" label="Rev" min={0} max={1} value={settings.reverbMix} onChange={(v) => updateSetting('reverbMix', v)} />
                         <Knob id="delayMix" label="Dly" min={0} max={1} value={settings.delayMix} onChange={(v) => updateSetting('delayMix', v)} />
                         <Knob id="chorusMix" label="Cho" min={0} max={1} value={settings.chorusMix} onChange={(v) => updateSetting('chorusMix', v)} />
                         <Knob id="drive" label="Drv" min={0} max={1} value={settings.drive} onChange={(v) => updateSetting('drive', v)} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-8 mb-10">
                  {/* EQ Section */}
                  <div className="col-span-12 bg-[#141416] p-8 rounded-2xl border border-[#2A2A2E] shadow-xl">
                    <h3 className="text-[10px] font-bold uppercase text-slate-500 mb-8 tracking-widest border-b border-[#2A2A2E] pb-2">Master EQ (3-Band)</h3>
                    <div className="flex justify-around items-center max-w-2xl mx-auto">
                       <Knob id="eqLow" label="Low Gain" min={-24} max={24} value={settings.eqLow} onChange={(v) => updateSetting('eqLow', v)} />
                       <Knob id="eqMid" label="Mid Gain" min={-24} max={24} value={settings.eqMid} onChange={(v) => updateSetting('eqMid', v)} />
                       <Knob id="eqHigh" label="High Gain" min={-24} max={24} value={settings.eqHigh} onChange={(v) => updateSetting('eqHigh', v)} />
                    </div>
                  </div>
                </div>

                {/* MIDI Monitor Footer */}
                <footer className="h-24 bg-[#111113] rounded-2xl border border-[#2A2A2E] flex items-center px-8 gap-10">
                  <div className="border-r border-[#2A2A2E] pr-10">
                    <span className="text-[10px] text-slate-600 uppercase tracking-widest block mb-1">MIDI Channel</span>
                    <span className="text-2xl font-mono text-blue-500 font-bold">01</span>
                  </div>
                  <div className="flex flex-1 items-center gap-1.5 opacity-60 overflow-hidden h-10">
                    {[...Array(24)].map((_, i) => {
                      const midiNum = lastNote ? Tone.Frequency(lastNote.name).toMidi() : 0;
                      const isActive = lastNote && midiNum % 24 === i;
                      return (
                        <div 
                          key={i} 
                          className={`flex-1 h-full rounded-sm border border-[#2A2A2E] ${
                            i % 7 === 1 || i % 7 === 3 ? 'bg-[#0A0A0B] h-6' : 'bg-white/90'
                          } ${isActive ? 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] border-blue-400' : ''}`} 
                        />
                      );
                    })}
                  </div>
                  <div className="pl-10 text-right border-l border-[#2A2A2E]">
                    <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-1">Last Message</p>
                    <p className="text-xs font-mono text-slate-400 uppercase">
                      {lastNote ? `${lastNote.name} @ ${lastNote.vel}` : 'Waiting...'}
                    </p>
                  </div>
                </footer>
              </main>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
