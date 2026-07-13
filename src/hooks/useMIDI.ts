/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';

export function useMIDI() {
  const [midiAccess, setMidiAccess] = useState<MIDIAccess | null>(null);
  const [inputs, setInputs] = useState<MIDIInput[]>([]);
  const [selectedInput, setSelectedInput] = useState<string | null>(null);

  useEffect(() => {
    if (navigator.requestMIDIAccess) {
      navigator.requestMIDIAccess().then(
        (access) => {
          setMidiAccess(access);
          const currentInputs = Array.from(access.inputs.values());
          setInputs(currentInputs);
          
          // Auto-select Yamaha if found
          const yamaha = currentInputs.find(i => i.name?.toLowerCase().includes('yamaha'));
          if (yamaha) setSelectedInput(yamaha.id);

          access.onstatechange = () => {
            setInputs(Array.from(access.inputs.values()));
          };
        },
        (err) => console.error('Could not access MIDI devices', err)
      );
    }
  }, []);

  const onMessage = useCallback((callback: (status: number, note: number, velocity: number) => void) => {
    if (!midiAccess || !selectedInput) return;

    const input = midiAccess.inputs.get(selectedInput);
    if (!input) return;

    const listener = (event: any) => {
      const [status, note, velocity] = event.data;
      callback(status, note, velocity);
    };

    input.onmidimessage = listener;
    return () => {
      input.onmidimessage = null;
    };
  }, [midiAccess, selectedInput]);

  return { inputs, selectedInput, setSelectedInput, onMessage };
}
