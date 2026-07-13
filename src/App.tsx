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
import { SynthSettings, SynthPreset } from './types';
import { Knob } from './components/Knob';
import { Oscilloscope } from './components/Oscilloscope';

const INITIAL_SETTINGS: SynthSettings = {
  cutoff: 2000,
  resonance: 1,
  attack: 0.1,
  decay: 0.2,
  sustain: 0.5,
  release: 1.0,
  delayMix: 0.2,
  reverbMix: 0.3,
  preset: 'modern-poly'
};

const PRESETS: { id: SynthPreset; label: string; icon: any }[] = [
  { id: 'modern-poly', label: 'Modern Poly', icon: Zap },
  { id: 'cinematic-pad', label: 'Cinematic Pad', icon: Waves },
  { id: 'fm-electric-tine', label: 'Electric Tine', icon: Music },
  { id: 'sub-bass-growl', label: 'Sub Growl', icon: Activity },
  { id: 'shimmer-glass', label: 'Shimmer Glass', icon: Zap },
  { id: 'ambient-nebula', label: 'Nebula Pad', icon: Waves },
  { id: 'retro-future-lead', label: 'Retro Lead', icon: Activity },
  { id: 'modern-piano', label: 'Modern Piano', icon: Music },
];

export default function App() {
  const [isStarted, setIsStarted] = useState(false);
  const [settings, setSettings] = useState<SynthSettings>(INITIAL_SETTINGS);
  const [analyser, setAnalyser] = useState<Tone.Analyser | null>(null);
  const [lastNote, setLastNote] = useState<{ name: string; vel: number } | null>(null);
  const { inputs, selectedInput, setSelectedInput, onMessage } = useMIDI();
  
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

  useEffect(() => {
    if (!isStarted) return;

    const cleanup = onMessage((status, note, velocity) => {
      const frequency = Tone.Frequency(note, "midi").toNote();
      
      if (status === 144 && velocity > 0) {
        synthEngine.triggerAttack(frequency, velocity / 127);
        setLastNote({ name: frequency, vel: velocity });
      } else if (status === 128 || (status === 144 && velocity === 0)) {
        synthEngine.triggerRelease(frequency);
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
                <button className="px-4 py-2 bg-[#2A2A2E] hover:bg-[#35353A] text-xs font-bold rounded-md transition-colors uppercase tracking-widest">Settings</button>
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
                
                <nav className="flex-1 overflow-y-auto">
                  <p className="text-[10px] font-bold uppercase text-slate-500 mb-6 tracking-widest border-b border-[#2A2A2E] pb-2">Modern Poly Engine</p>
                  <ul className="space-y-1">
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
                    <li className="px-4 py-3 rounded-lg text-slate-600 text-sm italic border-t border-zinc-800/50 mt-4">More expansion packs...</li>
                  </ul>
                </nav>

                <div className="mt-auto pt-8 border-t border-[#2A2A2E]">
                  <div className="p-4 bg-[#1E1E21] rounded-xl border border-[#2A2A2E]">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Engine Mode</p>
                    <p className="text-xs font-bold text-slate-200">VST3 MULTI-CORE 64-BIT</p>
                  </div>
                </div>
              </aside>

              {/* Main Content: VST Interface */}
              <main className="flex-1 flex flex-col p-10 overflow-y-auto bg-[#0A0A0B]">
                <section className="mb-10">
                  <Oscilloscope analyser={analyser} />
                </section>

                <div className="grid grid-cols-12 gap-8 mb-10 flex-1">
                  {/* ADSR Section */}
                  <div className="col-span-12 lg:col-span-4 bg-[#141416] p-8 rounded-2xl border border-[#2A2A2E] shadow-xl">
                    <h3 className="text-[10px] font-bold uppercase text-slate-500 mb-8 tracking-widest border-b border-[#2A2A2E] pb-2">Envelope (ADSR)</h3>
                    <div className="grid grid-cols-4 gap-4 items-end h-48">
                      {[
                        { label: 'A', value: settings.attack, key: 'attack' },
                        { label: 'D', value: settings.decay, key: 'decay' },
                        { label: 'S', value: settings.sustain, key: 'sustain' },
                        { label: 'R', value: settings.release, key: 'release' }
                      ].map((env) => (
                        <div key={env.label} className="flex flex-col items-center gap-3 h-full">
                          <div className="w-full bg-[#1E1E21] h-full rounded-md relative overflow-hidden flex flex-col justify-end border border-[#2A2A2E]">
                            <motion.div 
                              className="bg-blue-500/40 w-full border-t border-blue-400"
                              initial={false}
                              animate={{ height: `${(env.value / 4) * 100}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono font-bold text-slate-500">{env.label}</span>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-8">
                       <Knob id="attack" label="Attack" min={0.01} max={4} value={settings.attack} onChange={(v) => updateSetting('attack', v)} />
                       <Knob id="decay" label="Decay" min={0.01} max={4} value={settings.decay} onChange={(v) => updateSetting('decay', v)} />
                    </div>
                  </div>

                  {/* Filter Section */}
                  <div className="col-span-12 lg:col-span-4 bg-[#141416] p-8 rounded-2xl border border-[#2A2A2E] shadow-xl">
                    <h3 className="text-[10px] font-bold uppercase text-slate-500 mb-8 tracking-widest border-b border-[#2A2A2E] pb-2">Filter Matrix</h3>
                    <div className="space-y-8">
                      <div>
                        <div className="flex justify-between text-[10px] mb-3 uppercase tracking-widest text-slate-400"><span>Cutoff</span><span className="font-mono text-emerald-500">{(settings.cutoff/1000).toFixed(2)} kHz</span></div>
                        <div className="h-2 bg-[#1E1E21] rounded-full overflow-hidden border border-[#2A2A2E] cursor-pointer" onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const val = ((e.clientX - rect.left) / rect.width) * 9950 + 50;
                          updateSetting('cutoff', val);
                        }}>
                          <motion.div className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" style={{ width: `${((settings.cutoff - 50) / 9950) * 100}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] mb-3 uppercase tracking-widest text-slate-400"><span>Resonance</span><span className="font-mono text-emerald-500">{settings.resonance.toFixed(1)} Q</span></div>
                        <div className="h-2 bg-[#1E1E21] rounded-full overflow-hidden border border-[#2A2A2E]">
                          <motion.div className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" style={{ width: `${(settings.resonance / 20) * 100}%` }} />
                        </div>
                      </div>
                      <div className="flex justify-around pt-4">
                        <Knob id="res" label="Resonance" min={0} max={20} value={settings.resonance} onChange={(v) => updateSetting('resonance', v)} />
                        <Knob id="cutoff_knob" label="Cutoff" min={50} max={10000} value={settings.cutoff} onChange={(v) => updateSetting('cutoff', v)} />
                      </div>
                    </div>
                  </div>

                  {/* Effects Section */}
                  <div className="col-span-12 lg:col-span-4 bg-[#141416] p-8 rounded-2xl border border-[#2A2A2E] shadow-xl">
                    <h3 className="text-[10px] font-bold uppercase text-slate-500 mb-8 tracking-widest border-b border-[#2A2A2E] pb-2">FX Chain</h3>
                    <div className="space-y-3">
                      {[
                        { label: 'Reverb', value: settings.reverbMix, key: 'reverbMix' },
                        { label: 'Delay', value: settings.delayMix, key: 'delayMix' },
                        { label: 'Chorus', value: 0.2, key: 'chorus' },
                        { label: 'Drive', value: 0.1, key: 'drive' }
                      ].map((fx) => (
                        <div key={fx.label} className="flex items-center justify-between p-3 bg-[#1E1E21] rounded-lg border border-[#2A2A2E] group hover:border-blue-500/30 transition-all">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest group-hover:text-slate-200">{fx.label}</span>
                          <div className={`w-3 h-3 rounded-full ${fx.value > 0 ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-slate-700'}`}></div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-around mt-10">
                      <Knob id="reverb" label="Reverb" min={0} max={1} value={settings.reverbMix} onChange={(v) => updateSetting('reverbMix', v)} />
                      <Knob id="delay" label="Delay" min={0} max={1} value={settings.delayMix} onChange={(v) => updateSetting('delayMix', v)} />
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
                    {[...Array(24)].map((_, i) => (
                      <div 
                        key={i} 
                        className={`flex-1 h-full rounded-sm border border-[#2A2A2E] ${
                          i % 7 === 1 || i % 7 === 3 ? 'bg-[#0A0A0B] h-6' : 'bg-white/90'
                        } ${lastNote && Tone.Frequency(lastNote.name).toMidi() % 24 === i ? 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] border-blue-400' : ''}`} 
                      />
                    ))}
                  </div>
                  <div className="pl-10 text-right border-l border-[#2A2A2E]">
                    <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-1">Last Message</p>
                    <p className="text-xs font-mono text-slate-400">
                      {lastNote ? `${lastNote.name.toUpperCase()} (Vel: ${lastNote.vel})` : 'WAITING FOR MIDI...'}
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
