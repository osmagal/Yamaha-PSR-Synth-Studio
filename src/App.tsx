/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { motion, AnimatePresence } from 'motion/react';
import { Piano, Settings2, Waves, Zap, Activity, Info, Music, Menu, X } from 'lucide-react';
import { useMIDI } from './hooks/useMIDI';
import { synthEngine } from './lib/synth';
import { SynthSettings, SynthPresetID } from './types';
import { Knob } from './components/Knob';
import { Oscilloscope } from './components/Oscilloscope';
import { EnvelopeEditor } from './components/EnvelopeEditor';

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
  portamento: 0,
  eqLow: 0,
  eqMid: 0,
  eqHigh: 0,
  masterVolume: 0.8,
  arpeggiatorOn: false,
  arpeggiatorRate: '16n',
  arpeggiatorPattern: 'up',
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
  const [metronomeOn, setMetronomeOn] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  useEffect(() => {
    if (isStarted) {
      synthEngine.setMetronome(metronomeOn, bpm);
      synthEngine.setArpeggiator(settings.arpeggiatorOn, settings.arpeggiatorRate, settings.arpeggiatorPattern);
    }
  }, [metronomeOn, bpm, settings.arpeggiatorOn, settings.arpeggiatorRate, settings.arpeggiatorPattern, isStarted]);

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
      const type = status & 0xf0;
      const channel = status & 0x0f;
      
      if (type === 144 && data2 > 0) { // Note On
        const note = Tone.Frequency(data1, 'midi').toNote();
        if (channel === 9) { // Channel 10 (Drums)
          synthEngine.triggerDrum(note, data2 / 127);
        } else {
          synthEngine.triggerAttack(note, data2 / 127);
          setLastNote({ name: note, vel: data2 });
        }
      } else if (type === 128 || (type === 144 && data2 === 0)) { // Note Off
        const note = Tone.Frequency(data1, 'midi').toNote();
        if (channel !== 9) {
          synthEngine.triggerRelease(note);
        }
      } else if (type === 176) { // Control Change
        if (data1 === 64) { // Sustain Pedal
          synthEngine.setSustain(data2 >= 64);
        } else if (data1 === 1) { // Modulation Wheel
          synthEngine.setModulation(data2 / 127);
        } else if (data1 === 74) { // Cutoff
          const val = (data2 / 127) * 9950 + 50;
          synthEngine.updateParameter('cutoff', val);
          setSettings(prev => ({ ...prev, cutoff: val }));
        } else if (data1 === 71) { // Resonance
          const val = (data2 / 127) * 20;
          synthEngine.updateParameter('resonance', val);
          setSettings(prev => ({ ...prev, resonance: val }));
        }
      } else if (type === 224) { // Pitch Bend
        const value = ((data2 << 7) | data1) / 8192 - 1;
        synthEngine.setPitchBend(value);
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
            <header className="flex flex-col sm:flex-row items-center justify-between px-4 md:px-8 py-4 sm:py-5 bg-[#141416] border-b border-[#2A2A2E] gap-4 sm:gap-0">
              <div className="flex items-center justify-between w-full sm:w-auto gap-3 md:gap-5">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="lg:hidden p-2 hover:bg-white/5 rounded-md text-slate-400"
                  >
                    {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                  </button>
                  <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)] hidden sm:block"></div>
                  <div>
                    <h1 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 leading-none mb-1">Input Device</h1>
                    <p className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                      {selectedInput ? inputs.find(i => i.id === selectedInput)?.name?.toUpperCase() : 'NO DEVICE'}
                      <span className="text-emerald-500 text-[10px] font-mono tracking-normal hidden sm:inline">USB-MIDI ACTIVE</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:gap-6 w-full sm:w-auto justify-center">
                <div className="hidden sm:block">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Source</p>
                  <select 
                    value={selectedInput || ''} 
                    onChange={(e) => setSelectedInput(e.target.value)}
                    className="bg-[#1E1E21] border border-[#2A2A2E] rounded-md px-2 py-1 text-[10px] text-slate-300 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer min-w-[120px]"
                    id="midi-input-select"
                  >
                    <option value="">MIDI Input...</option>
                    {inputs.map(input => (
                      <option key={input.id} value={input.id}>{input.name}</option>
                    ))}
                  </select>
                </div>
                <div className="hidden md:flex gap-6 items-center border-l border-[#2A2A2E] pl-6">
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Load</p>
                    <div className="w-16 h-1 bg-[#2A2A2E] rounded-full overflow-hidden">
                      <div className="w-1/4 h-full bg-blue-500"></div>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-0.5">Out</p>
                    <span className="text-[10px] font-mono text-slate-400">{(settings.masterVolume * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 sm:gap-3 w-full sm:w-auto justify-center">
                <button 
                  onClick={saveCurrentPreset}
                  className="px-3 py-1.5 bg-[#2A2A2E] hover:bg-[#35353A] text-[9px] sm:text-xs font-bold rounded-md transition-colors uppercase tracking-widest flex-1 sm:flex-none"
                >
                  Save
                </button>
                <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[9px] sm:text-xs font-bold rounded-md transition-colors uppercase tracking-widest shadow-lg shadow-blue-600/10 flex-1 sm:flex-none">Export</button>
              </div>
            </header>

            <div className="flex flex-1 overflow-hidden relative">
              {/* Sidebar Backdrop (Mobile) */}
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setSidebarOpen(false)}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                  />
                )}
              </AnimatePresence>

              {/* Sidebar: Preset Browser */}
              <aside className={`
                fixed lg:relative inset-y-0 left-0 w-72 bg-[#141416] border-r border-[#2A2A2E] p-8 flex flex-col z-50 transition-transform duration-300 transform
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
              `}>
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
                        onClick={() => {
                          updateSetting('preset', p.id);
                          if (window.innerWidth < 1024) setSidebarOpen(false);
                        }}
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
                            onClick={() => {
                              setSettings(s);
                              if (window.innerWidth < 1024) setSidebarOpen(false);
                            }}
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
              <main className="flex-1 flex flex-col p-4 md:p-10 overflow-y-auto bg-[#0A0A0B]">
                <section className="mb-10">
                  <Oscilloscope analyser={analyser} />
                </section>

                <div className="grid grid-cols-12 gap-4 md:gap-8 mb-10">
                  {/* ADSR Sections */}
                  <div className="col-span-12 lg:col-span-4 bg-[#141416] p-5 sm:p-6 rounded-2xl border border-[#2A2A2E] shadow-xl flex flex-col">
                    <div className="flex items-center justify-between mb-6 border-b border-[#2A2A2E] pb-4">
                      <h3 className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">Envelopes</h3>
                      <div className="flex gap-4">
                        <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded">AMP</span>
                        <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">FILTER</span>
                      </div>
                    </div>
                    <div className="space-y-8 flex-1">
                      <div className="space-y-4">
                        <p className="text-[9px] text-slate-600 font-bold uppercase tracking-tight">Amp Env</p>
                        <div className="w-full">
                          <EnvelopeEditor 
                            attack={settings.attack}
                            decay={settings.decay}
                            sustain={settings.sustain}
                            release={settings.release}
                            onChange={(k, v) => updateSetting(k as any, v)}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <Knob id="attack" label="A" min={0.01} max={4} value={settings.attack} onChange={(v) => updateSetting('attack', v)} />
                           <Knob id="release" label="R" min={0.01} max={4} value={settings.release} onChange={(v) => updateSetting('release', v)} />
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <p className="text-[9px] text-slate-600 font-bold uppercase tracking-tight">Filter Env</p>
                        <div className="w-full">
                          <EnvelopeEditor 
                            attack={settings.filterAttack}
                            decay={settings.filterDecay}
                            sustain={settings.filterSustain}
                            release={settings.filterRelease}
                            color="#10B981"
                            onChange={(k, v) => {
                              const map: any = { attack: 'filterAttack', decay: 'filterDecay', sustain: 'filterSustain', release: 'filterRelease' };
                              updateSetting(map[k], v);
                            }}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <Knob id="filterAttack" label="A" min={0.01} max={4} value={settings.filterAttack} onChange={(v) => updateSetting('filterAttack', v)} />
                           <Knob id="filterRelease" label="R" min={0.01} max={4} value={settings.filterRelease} onChange={(v) => updateSetting('filterRelease', v)} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-[#141416] p-5 sm:p-6 rounded-2xl border border-[#2A2A2E] shadow-xl flex flex-col">
                    <h3 className="text-[10px] font-bold uppercase text-slate-500 mb-6 tracking-widest border-b border-[#2A2A2E] pb-4">Filter & Performance</h3>
                    <div className="space-y-8 flex-1">
                       <div className="bg-black/20 p-4 rounded-xl border border-[#2A2A2E]/50">
                         <Knob id="cutoff" label="Cutoff" min={50} max={10000} value={settings.cutoff} onChange={(v) => updateSetting('cutoff', v)} />
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                         <Knob id="resonance" label="Res" min={0} max={20} value={settings.resonance} onChange={(v) => updateSetting('resonance', v)} />
                         <Knob id="portamento" label="Glide" min={0} max={2} value={settings.portamento} onChange={(v) => updateSetting('portamento', v)} />
                       </div>
                       <div className="mt-8 pt-6 border-t border-[#2A2A2E]/30">
                          <p className="text-[10px] text-slate-600 font-bold uppercase mb-4 text-center">Master Out</p>
                          <div className="flex justify-center">
                            <Knob id="masterVolume" label="Volume" min={0} max={1.2} value={settings.masterVolume} onChange={(v) => updateSetting('masterVolume', v)} />
                          </div>
                       </div>
                    </div>
                  </div>

                  {/* FX Rack Section */}
                  <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-[#141416] p-5 sm:p-6 rounded-2xl border border-[#2A2A2E] shadow-xl flex flex-col">
                    <h3 className="text-[10px] font-bold uppercase text-slate-500 mb-6 tracking-widest border-b border-[#2A2A2E] pb-4">FX Rack</h3>
                    <div className="grid grid-cols-2 gap-y-10 gap-x-6 flex-1 items-center">
                       <Knob id="reverbMix" label="Rev" min={0} max={1} value={settings.reverbMix} onChange={(v) => updateSetting('reverbMix', v)} />
                       <Knob id="delayMix" label="Dly" min={0} max={1} value={settings.delayMix} onChange={(v) => updateSetting('delayMix', v)} />
                       <Knob id="chorusMix" label="Cho" min={0} max={1} value={settings.chorusMix} onChange={(v) => updateSetting('chorusMix', v)} />
                       <Knob id="drive" label="Drv" min={0} max={1} value={settings.drive} onChange={(v) => updateSetting('drive', v)} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-4 md:gap-8 mb-10">
                  {/* Arpeggiator Section */}
                  <div className="col-span-12 lg:col-span-6 bg-[#141416] p-5 sm:p-8 rounded-2xl border border-[#2A2A2E] shadow-xl">
                    <h3 className="text-[10px] font-bold uppercase text-slate-500 mb-8 tracking-widest border-b border-[#2A2A2E] pb-2">Arpeggiator</h3>
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-4 px-2">
                      <div className="flex flex-col items-center gap-4">
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">State</p>
                        <button 
                          onClick={() => updateSetting('arpeggiatorOn', !settings.arpeggiatorOn)}
                          className={`w-16 h-8 rounded-full border border-[#2A2A2E] relative transition-all ${settings.arpeggiatorOn ? 'bg-emerald-600/20' : 'bg-[#1E1E21]'}`}
                        >
                          <motion.div 
                            className={`w-6 h-6 rounded-full absolute top-1 ${settings.arpeggiatorOn ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]' : 'bg-slate-700'}`}
                            animate={{ left: settings.arpeggiatorOn ? 'calc(100% - 1.75rem)' : '0.25rem' }}
                          />
                        </button>
                      </div>

                      <div className="flex flex-col items-center gap-4">
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Division</p>
                        <div className="flex bg-[#1E1E21] rounded-lg p-1 border border-[#2A2A2E]">
                          {(['4n', '8n', '16n'] as const).map(rate => (
                            <button
                              key={rate}
                              onClick={() => updateSetting('arpeggiatorRate', rate)}
                              className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                                settings.arpeggiatorRate === rate ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              {rate.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col items-center gap-4">
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Pattern</p>
                        <div className="flex bg-[#1E1E21] rounded-lg p-1 border border-[#2A2A2E]">
                          {(['up', 'down', 'upDown'] as const).map(pattern => (
                            <button
                              key={pattern}
                              onClick={() => updateSetting('arpeggiatorPattern', pattern)}
                              className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                                settings.arpeggiatorPattern === pattern ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              {pattern.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Metronome Section */}
                  <div className="col-span-12 lg:col-span-6 bg-[#141416] p-5 sm:p-8 rounded-2xl border border-[#2A2A2E] shadow-xl">
                    <h3 className="text-[10px] font-bold uppercase text-slate-500 mb-8 tracking-widest border-b border-[#2A2A2E] pb-2">Metronome / Clock</h3>
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-4 px-2">
                      <div className="flex flex-col items-center gap-4">
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">State</p>
                        <button 
                          onClick={() => setMetronomeOn(!metronomeOn)}
                          className={`w-16 h-8 rounded-full border border-[#2A2A2E] relative transition-all ${metronomeOn ? 'bg-blue-600/20' : 'bg-[#1E1E21]'}`}
                        >
                          <motion.div 
                            className={`w-6 h-6 rounded-full absolute top-1 ${metronomeOn ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]' : 'bg-slate-700'}`}
                            animate={{ left: metronomeOn ? 'calc(100% - 1.75rem)' : '0.25rem' }}
                          />
                        </button>
                      </div>

                      <div className="flex flex-col items-center gap-4">
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Tempo</p>
                        <div className="flex items-center gap-4 bg-[#1E1E21] p-3 rounded-xl border border-[#2A2A2E]">
                          <button 
                            onClick={() => setBpm(Math.max(40, bpm - 1))}
                            className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded text-slate-400"
                          >-</button>
                          <span className="text-2xl font-mono text-white w-20 text-center font-bold">{bpm}</span>
                          <button 
                            onClick={() => setBpm(Math.min(280, bpm + 1))}
                            className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded text-slate-400"
                          >+</button>
                        </div>
                        <p className="text-[9px] text-slate-600 uppercase tracking-widest">Beats Per Minute</p>
                      </div>

                      <div className="flex flex-col items-center gap-4">
                         <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Tap</p>
                         <button className="w-12 h-12 rounded-xl bg-[#1E1E21] border border-[#2A2A2E] flex items-center justify-center hover:bg-[#2A2A2E] active:scale-95 transition-all text-slate-400">
                           <Activity size={20} />
                         </button>
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
