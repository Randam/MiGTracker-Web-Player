/**
 * MIDISynth — Web Audio GM synthesizer supporting multiple vintage & modern SoundFont banks,
 * hardware DSP tone modeling, real-time OPL3 FM synthesis, and General MIDI drum engine.
 *
 * Supported SoundFont Banks:
 *   1. 'awe32rom'  — SoundBlaster AWE32 1MB ROM (1994 EMU8000 Classic)
 *   2. 'fatboy'    — SoundBlaster AWE32 (FatBoy GM 90s Gaming Set)
 *   3. 'sc55'      — Roland Sound Canvas SC-55 (90s DOS Benchmark)
 *   4. 'gus'       — Gravis UltraSound (GUS Tracker Patches)
 *   5. 'timgm6mb'  — TimGM6mb (DOSBox / Timidity GM Set)
 *   6. 'fluidr3'   — FluidR3 GM (AWE64 Gold SF2)
 *   7. 'musyngkite'— MusyngKite (Studio HD)
 *   8. 'opl3'      — SoundBlaster 16 / AdLib (Real-time OPL3 FM Synth, 0 KB)
 */

import { SF2Synth } from './SF2Synth.js';
import { SpessaSynthEngine } from './SpessaSynthEngine.js';
import { SoundfontEngine } from './SoundfontEngine.js';

export const SOUNDFONT_BANKS = {
  av_8mb: {
    id: 'AvalonSF2',
    name: '👑 Avalon SoundFont (avalon_soundfont.sf2)',
    desc: 'General MIDI SoundFont bank used to play back the Avalon soundtrack',
    sf2Url: './assets/avalon_soundfont.sf2',
    isSF2: true,
    isSynth: false,
    dsp: {
      highpass: 20,
      lowpass: 22000,
      presenceFreq: 3400,
      presenceGain: 1.0,
      bassFreq: 110,
      bassGain: 1.5,
      warmthGain: 0.5,
      bits: 0,
    }
  },
  custom_sf2: {
    id: 'CustomSF2',
    name: '📂 Custom Loaded SF2 SoundFont',
    desc: 'Custom user SoundFont 2 (.sf2) bank loaded via drag-and-drop or file picker',
    isSF2: true,
    isSynth: false,
    dsp: {
      highpass: 20,
      lowpass: 22000,
      presenceFreq: 3400,
      presenceGain: 0.0,
      bassFreq: 100,
      bassGain: 0.0,
      warmthGain: 0.0,
      bits: 0,
    }
  },
  awe32rom: {
    id: 'FatBoy',
    name: '💾 SoundBlaster AWE32 1MB ROM (1994)',
    desc: 'Original 1MB EMU8000 factory ROM bank (11.5kHz vintage filter cutoff, crisp presence, punchy bass)',
    baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FatBoy/',
    isSynth: false,
    dsp: {
      highpass: 45,
      lowpass: 11500,      // Authentic 1MB ROM filter cutoff
      presenceFreq: 3400,
      presenceGain: 3.5,   // EMU8000 presence
      bassFreq: 110,
      bassGain: 2.5,       // Tight punchy bass
      warmthGain: -1.0,
      bits: 0,
    }
  },
  fatboy: {
    id: 'FatBoy',
    name: '💾 SoundBlaster AWE32 (FatBoy GM)',
    desc: 'Modern full-fidelity Sound Blaster AWE32 / EMU8000 SoundFont 2 (uncompressed, full 22kHz bandwidth)',
    baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FatBoy/',
    isSynth: false,
    dsp: {
      highpass: 15,
      lowpass: 22000,      // Full 20kHz+ bandwidth
      presenceFreq: 3500,
      presenceGain: 0.5,
      bassFreq: 100,
      bassGain: 0.5,
      warmthGain: 0.0,
      bits: 0,
    }
  },
  sc55: {
    id: 'FluidR3_GM',
    name: '🎹 Roland Sound Canvas SC-55 (90s Classic)',
    desc: 'The reference standard for 90s DOS gaming composers (FluidR3 samples with warm 18-bit analog curve)',
    baseUrl: 'https://paulrosen.github.io/midi-js-soundfonts/FluidR3_GM/',
    isSynth: false,
    dsp: {
      highpass: 30,
      lowpass: 13500,      // Warm Roland 18-bit DAC rolloff
      presenceFreq: 2400,
      presenceGain: 1.5,
      bassFreq: 140,
      bassGain: 3.5,       // Signature warm Roland mid-bass
      warmthGain: 3.0,     // Rich analog body
      bits: 0,
    }
  },
  gus: {
    id: 'FatBoy',
    name: '👾 Gravis UltraSound (GUS Tracker)',
    desc: 'Classic 90s demoscene and FastTracker II GUS sound (tracker filter curve + high-end sparkle)',
    baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FatBoy/',
    isSynth: false,
    dsp: {
      highpass: 40,
      lowpass: 14500,      // GUS tracker filtering
      presenceFreq: 5200,
      presenceGain: 3.0,   // Demoscene high-end sparkle
      bassFreq: 120,
      bassGain: 2.0,
      warmthGain: 0.0,
      bits: 0,
    }
  },
  timgm6mb: {
    id: 'FluidR3_GM',
    name: '📦 TimGM6mb (DOSBox / Timidity)',
    desc: 'Lightweight General MIDI bank used in DOSBox & VLC',
    baseUrl: 'https://paulrosen.github.io/midi-js-soundfonts/FluidR3_GM/',
    isSynth: false,
    dsp: {
      highpass: 35,
      lowpass: 16500,
      presenceFreq: 3000,
      presenceGain: 0.8,
      bassFreq: 120,
      bassGain: 0.8,
      warmthGain: 0.0,
    }
  },
  fluidr3: {
    id: 'FluidR3_GM',
    name: '🔊 FluidR3 GM (AWE64 Gold SF2)',
    desc: 'Rich 90s/2000s General MIDI SoundFont 2 (Clean & Warm)',
    baseUrl: 'https://paulrosen.github.io/midi-js-soundfonts/FluidR3_GM/',
    isSynth: false,
    dsp: {
      highpass: 10,
      lowpass: 22000,
      presenceFreq: 4000,
      presenceGain: 0.0,
      bassFreq: 80,
      bassGain: 0.0,
      warmthGain: 0.0,
    }
  },
  musyngkite: {
    id: 'MusyngKite',
    name: '🎼 MusyngKite (Studio HD)',
    desc: 'High dynamic range orchestral & studio acoustic bank',
    baseUrl: 'https://paulrosen.github.io/midi-js-soundfonts/MusyngKite/',
    isSynth: false,
    dsp: {
      highpass: 10,
      lowpass: 24000,
      presenceFreq: 6500,
      presenceGain: 2.2,   // Crystal studio air
      bassFreq: 60,
      bassGain: 1.5,
      warmthGain: 0.5,
    }
  },
  opl3: {
    id: 'OPL3_FM',
    name: '📻 SoundBlaster 16 / AdLib (OPL3 FM)',
    desc: 'Pure real-time 2-operator FM synthesis (0 KB download, 100% offline)',
    baseUrl: '',
    isSynth: true,
    dsp: {
      highpass: 50,
      lowpass: 12000,      // Classic Sound Blaster 16 OPL3 output filter
      presenceFreq: 3200,
      presenceGain: 2.0,
      bassFreq: 120,
      bassGain: 1.0,
      warmthGain: 0.0,
    }
  },
  tabla: {
    id: 'Tabla',
    name: '🪘 Indian Tabla & Ethnic Percussion',
    desc: 'Authentic Indian Tabla (Bayan bass pitch modulation + Dayan treble bell resonances)',
    baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FatBoy/',
    isTabla: true,
    dsp: {
      highpass: 25,
      lowpass: 18000,
      presenceFreq: 3800,
      presenceGain: 2.5,
      bassFreq: 105,
      bassGain: 3.5,
      warmthGain: 2.0,
    }
  },
};

/**
 * GM instrument names in the exact format used by midi-js-soundfonts CDN filenames.
 * Index 0-127 = GM program (0-based).
 */
const GM_NAMES = [
  'acoustic_grand_piano','bright_acoustic_piano','electric_grand_piano','honkytonk_piano',
  'electric_piano_1','electric_piano_2','harpsichord','clavinet',
  'celesta','glockenspiel','music_box','vibraphone','marimba','xylophone',
  'tubular_bells','dulcimer','drawbar_organ','percussive_organ','rock_organ',
  'church_organ','reed_organ','accordion','harmonica','tango_accordion',
  'acoustic_guitar_nylon','acoustic_guitar_steel','electric_guitar_jazz',
  'electric_guitar_clean','electric_guitar_muted','overdriven_guitar',
  'distortion_guitar','guitar_harmonics',
  'acoustic_bass','electric_bass_finger','electric_bass_pick','fretless_bass',
  'slap_bass_1','slap_bass_2','synth_bass_1','synth_bass_2',
  'violin','viola','cello','contrabass','tremolo_strings','pizzicato_strings',
  'orchestral_harp','timpani',
  'string_ensemble_1','string_ensemble_2','synth_strings_1','synth_strings_2',
  'choir_aahs','voice_oohs','synth_choir','orchestra_hit',
  'trumpet','trombone','tuba','muted_trumpet','french_horn','brass_section',
  'synth_brass_1','synth_brass_2',
  'soprano_sax','alto_sax','tenor_sax','baritone_sax',
  'oboe','english_horn','bassoon','clarinet',
  'piccolo','flute','recorder','pan_flute','blown_bottle','shakuhachi','whistle','ocarina',
  'lead_1_square','lead_2_sawtooth','lead_3_calliope','lead_4_chiff',
  'lead_5_charang','lead_6_voice','lead_7_fifths','lead_8_bass__lead',
  'pad_1_new_age','pad_2_warm','pad_3_polysynth','pad_4_choir',
  'pad_5_bowed','pad_6_metallic','pad_7_halo','pad_8_sweep',
  'fx_1_rain','fx_2_soundtrack','fx_3_crystal','fx_4_atmosphere',
  'fx_5_brightness','fx_6_goblins','fx_7_echoes','fx_8_scifi',
  'sitar','banjo','shamisen','koto','kalimba','bagpipe','fiddle','shanai',
  'tinkle_bell','agogo','steel_drums','woodblock','taiko_drum','melodic_tom',
  'synth_drum','reverse_cymbal',
  'guitar_fret_noise','breath_noise','seashore','bird_tweet','telephone_ring',
  'helicopter','applause','gunshot',
];

/**
 * Determine if a General MIDI program (0..127) is a continuous sustaining instrument
 * (Strings, Flutes, Brass, Organs, Choirs, Pads, Synth Leads) that should loop.
 * @param {number} prog
 * @returns {boolean}
 */
export function isSustainedGMProgram(prog) {
  // 16..23: Organs & Accordions
  if (prog >= 16 && prog <= 23) return true;
  // 40..44: Bowed Strings (Violin, Viola, Cello, Contrabass, Tremolo) - Excludes 45 (Pizzicato), 46 (Harp), 47 (Timpani)
  if (prog >= 40 && prog <= 44) return true;
  // 48..54: Ensembles, Choirs, Synth Voices - Excludes 55 (Orchestra Hit)
  if (prog >= 48 && prog <= 54) return true;
  // 56..63: Trumpets, Trombones, Tubas, French Horns, Brass Sections, Synth Brass
  if (prog >= 56 && prog <= 63) return true;
  // 64..71: Saxophones, Oboes, English Horns, Bassoons, Clarinets
  if (prog >= 64 && prog <= 71) return true;
  // 72..79: Piccolos, Flutes, Recorders, Pan Flutes, Whistles, Ocarinas
  if (prog >= 72 && prog <= 79) return true;
  // 80..87: Synth Leads (Square, Saw, Calliope, Chiff, Charang, Voice, 5ths, Bass+Lead)
  if (prog >= 80 && prog <= 87) return true;
  // 88..95: Synth Pads (New Age, Warm, PolySynth, Choir, Bowed, Metallic, Halo, Sweep)
  if (prog >= 88 && prog <= 95) return true;
  // 96..103: Synth FX (Atmosphere, Brightness, Sci-Fi)
  if (prog >= 96 && prog <= 103) return true;
  // 108..111: Bagpipe, Fiddle, Shanai
  if (prog >= 108 && prog <= 111) return true;

  return false;
}

/**
 * OPL3Synth — Real-time 2-Operator FM Synthesizer modeling the Yamaha YMF262 (OPL3)
 * chip found in Sound Blaster 16 / AdLib cards. 100% Web Audio, zero network requests.
 */
class OPL3Synth {
  constructor(ctx) {
    this.ctx = ctx;
  }

  playNote(program, note, when, gain, dest) {
    const freq = 440 * Math.pow(2, (note - 69) / 12);
    const params = this._getFMParams(program);

    // Modulator Oscillator
    const mod = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    mod.type = 'sine';
    mod.frequency.setValueAtTime(freq * params.mult, when);

    const modPeak = freq * params.modIndex * (gain * 0.7 + 0.15);
    modGain.gain.setValueAtTime(modPeak, when);
    if (params.modDecay > 0) {
      modGain.gain.exponentialRampToValueAtTime(Math.max(1, modPeak * 0.2), when + params.modDecay);
    }

    mod.connect(modGain);

    // Carrier Oscillator
    const car = this.ctx.createOscillator();
    const carGain = this.ctx.createGain();
    car.type = 'sine';
    car.frequency.setValueAtTime(freq, when);

    modGain.connect(car.frequency);

    // Tamed, balanced output gain matching SoundFont levels (scaled by instrument family)
    const peakGain = Math.min(0.38, gain * (params.volScale || 0.26));
    carGain.gain.setValueAtTime(peakGain, when);

    const decayTime = params.carDecay > 0 ? params.carDecay : 1.5;
    if (params.carDecay > 0) {
      carGain.gain.exponentialRampToValueAtTime(0.0001, when + decayTime);
    }

    car.connect(carGain);
    carGain.connect(dest);

    mod.start(when);
    car.start(when);

    const cleanup = () => {
      try {
        car.disconnect();
        carGain.disconnect();
        mod.disconnect();
        modGain.disconnect();
      } catch { /* already disconnected */ }
    };

    car.onended = cleanup;
    setTimeout(cleanup, (decayTime + 0.3) * 1000);

    return {
      stop: (stopWhen) => {
        try {
          const t = Math.max(this.ctx.currentTime, stopWhen);
          carGain.gain.cancelScheduledValues(t);
          carGain.gain.setValueAtTime(carGain.gain.value, t);
          carGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
          mod.stop(t + 0.05);
          car.stop(t + 0.05);
          setTimeout(cleanup, Math.max(20, (t - this.ctx.currentTime + 0.08) * 1000));
        } catch { /* already stopped */ }
      }
    };
  }

  _getFMParams(prog) {
    // ── 0..7: Piano & Keyboard Family ─────────────────────────────────────────
    if (prog === 0 || prog === 1) return { mult: 1.0, modIndex: 1.8, modDecay: 0.35, carDecay: 0.90, volScale: 0.30 }; // Acoustic / Bright Grand
    if (prog === 2 || prog === 3) return { mult: 2.0, modIndex: 2.2, modDecay: 0.25, carDecay: 0.75, volScale: 0.28 }; // Electric Grand / Honky-tonk
    if (prog === 4 || prog === 5) return { mult: 1.0, modIndex: 3.5, modDecay: 0.40, carDecay: 0.85, volScale: 0.26 }; // Rhodes / DX7 FM Piano
    if (prog === 6 || prog === 7) return { mult: 3.0, modIndex: 3.8, modDecay: 0.15, carDecay: 0.45, volScale: 0.26 }; // Harpsichord / Clavinet

    // ── 8..15: Chromatic Percussion / Mallets ──────────────────────────────────
    if (prog === 8 || prog === 9)  return { mult: 3.5, modIndex: 3.0, modDecay: 0.20, carDecay: 0.50, volScale: 0.24 }; // Celesta / Glockenspiel
    if (prog === 10 || prog === 11) return { mult: 4.0, modIndex: 2.4, modDecay: 0.30, carDecay: 0.70, volScale: 0.24 }; // Music Box / Vibraphone
    if (prog === 12 || prog === 13) return { mult: 2.75, modIndex: 2.0, modDecay: 0.08, carDecay: 0.25, volScale: 0.28 }; // Marimba / Xylophone
    if (prog === 14 || prog === 15) return { mult: 5.0, modIndex: 3.8, modDecay: 0.45, carDecay: 1.20, volScale: 0.25 }; // Tubular Bells / Dulcimer

    // ── 16..23: Organs & Accordions ───────────────────────────────────────────
    if (prog === 16 || prog === 17) return { mult: 1.0, modIndex: 1.2, modDecay: 0, carDecay: 0, volScale: 0.24 }; // Drawbar / Percussive Organ
    if (prog === 18 || prog === 19) return { mult: 2.0, modIndex: 1.5, modDecay: 0, carDecay: 0, volScale: 0.22 }; // Rock / Church Organ
    if (prog >= 20 && prog <= 23)   return { mult: 3.0, modIndex: 1.4, modDecay: 0, carDecay: 0, volScale: 0.22 }; // Reed Organ / Accordion / Harmonica

    // ── 24..31: Guitars ───────────────────────────────────────────────────────
    if (prog === 24 || prog === 25) return { mult: 2.0, modIndex: 2.6, modDecay: 0.18, carDecay: 0.65, volScale: 0.28 }; // Nylon / Steel Guitar
    if (prog === 26 || prog === 27) return { mult: 1.0, modIndex: 2.2, modDecay: 0.22, carDecay: 0.70, volScale: 0.28 }; // Jazz / Clean Guitar
    if (prog === 28)                return { mult: 2.0, modIndex: 1.8, modDecay: 0.06, carDecay: 0.15, volScale: 0.30 }; // Muted Guitar
    if (prog === 29 || prog === 30) return { mult: 1.0, modIndex: 4.8, modDecay: 0.50, carDecay: 0,    volScale: 0.22 }; // Overdrive / Distortion
    if (prog === 31)                return { mult: 4.0, modIndex: 3.0, modDecay: 0.30, carDecay: 0.90, volScale: 0.26 }; // Guitar Harmonics

    // ── 32..39: Basses ────────────────────────────────────────────────────────
    if (prog >= 32 && prog <= 35)   return { mult: 0.5, modIndex: 2.2, modDecay: 0.18, carDecay: 0.60, volScale: 0.32 }; // Acoustic / Finger / Pick / Fretless Bass
    if (prog === 36 || prog === 37) return { mult: 1.5, modIndex: 4.2, modDecay: 0.12, carDecay: 0.45, volScale: 0.30 }; // Slap Bass 1 & 2
    if (prog === 38 || prog === 39) return { mult: 0.5, modIndex: 4.0, modDecay: 0.30, carDecay: 0.50, volScale: 0.30 }; // Synth Bass 1 & 2 (Classic OPL bass)

    // ── 40..47: Solo Strings & Orchestral ─────────────────────────────────────
    if (prog >= 40 && prog <= 43)   return { mult: 1.0, modIndex: 1.2, modDecay: 0,    carDecay: 0,    volScale: 0.24 }; // Violin, Viola, Cello, Contrabass
    if (prog === 44)                return { mult: 2.0, modIndex: 1.5, modDecay: 0,    carDecay: 0,    volScale: 0.24 }; // Tremolo Strings
    if (prog === 45)                return { mult: 3.0, modIndex: 2.8, modDecay: 0.08, carDecay: 0.35, volScale: 0.30 }; // Pizzicato Strings
    if (prog === 46)                return { mult: 3.0, modIndex: 2.6, modDecay: 0.25, carDecay: 0.80, volScale: 0.28 }; // Orchestral Harp
    if (prog === 47)                return { mult: 0.5, modIndex: 3.0, modDecay: 0.15, carDecay: 0.70, volScale: 0.32 }; // Timpani

    // ── 48..55: Ensemble & Choirs ─────────────────────────────────────────────
    if (prog === 48 || prog === 49) return { mult: 1.0, modIndex: 1.1, modDecay: 0,    carDecay: 0,    volScale: 0.22 }; // String Ensemble 1 & 2
    if (prog === 50 || prog === 51) return { mult: 2.0, modIndex: 1.8, modDecay: 0,    carDecay: 0,    volScale: 0.22 }; // Synth Strings 1 & 2
    if (prog >= 52 && prog <= 54)   return { mult: 1.0, modIndex: 0.8, modDecay: 0,    carDecay: 0,    volScale: 0.22 }; // Choir Aahs, Voice Oohs, Synth Voice
    if (prog === 55)                return { mult: 2.0, modIndex: 4.5, modDecay: 0.15, carDecay: 0.35, volScale: 0.30 }; // Orchestra Hit

    // ── 56..63: Brass ─────────────────────────────────────────────────────────
    if (prog === 56 || prog === 57) return { mult: 1.0, modIndex: 3.2, modDecay: 0.35, carDecay: 0,    volScale: 0.24 }; // Trumpet / Trombone
    if (prog === 58)                return { mult: 0.5, modIndex: 3.0, modDecay: 0.40, carDecay: 0,    volScale: 0.26 }; // Tuba
    if (prog === 59)                return { mult: 2.0, modIndex: 3.8, modDecay: 0.20, carDecay: 0,    volScale: 0.22 }; // Muted Trumpet
    if (prog === 60)                return { mult: 1.0, modIndex: 2.2, modDecay: 0.50, carDecay: 0,    volScale: 0.24 }; // French Horn
    if (prog >= 61 && prog <= 63)   return { mult: 1.0, modIndex: 3.6, modDecay: 0.30, carDecay: 0,    volScale: 0.22 }; // Brass Section, Synth Brass 1 & 2

    // ── 64..71: Reeds / Woodwinds ─────────────────────────────────────────────
    if (prog >= 64 && prog <= 67)   return { mult: 2.0, modIndex: 2.5, modDecay: 0.25, carDecay: 0,    volScale: 0.24 }; // Soprano / Alto / Tenor / Baritone Sax
    if (prog === 68 || prog === 69) return { mult: 3.0, modIndex: 2.2, modDecay: 0.15, carDecay: 0,    volScale: 0.22 }; // Oboe / English Horn
    if (prog === 70 || prog === 71) return { mult: 1.0, modIndex: 1.8, modDecay: 0.20, carDecay: 0,    volScale: 0.24 }; // Bassoon / Clarinet

    // ── 72..79: Pipes / Flutes ────────────────────────────────────────────────
    if (prog === 72 || prog === 73) return { mult: 1.0, modIndex: 0.8, modDecay: 0.10, carDecay: 0,    volScale: 0.24 }; // Piccolo / Flute (Soft airy FM sine)
    if (prog === 74 || prog === 75) return { mult: 1.0, modIndex: 1.0, modDecay: 0.15, carDecay: 0,    volScale: 0.24 }; // Recorder / Pan Flute
    if (prog >= 76 && prog <= 79)   return { mult: 1.0, modIndex: 1.2, modDecay: 0.20, carDecay: 0,    volScale: 0.24 }; // Blown Bottle, Shakuhachi, Whistle, Ocarina

    // ── 80..87: Synth Leads ───────────────────────────────────────────────────
    if (prog === 80)                return { mult: 1.0, modIndex: 3.5, modDecay: 0,    carDecay: 0,    volScale: 0.22 }; // Lead 1 (Square)
    if (prog === 81)                return { mult: 2.0, modIndex: 3.8, modDecay: 0,    carDecay: 0,    volScale: 0.22 }; // Lead 2 (Sawtooth)
    if (prog === 82 || prog === 83) return { mult: 3.0, modIndex: 2.5, modDecay: 0.20, carDecay: 0,    volScale: 0.24 }; // Lead 3 (Calliope) / Lead 4 (Chiff)
    if (prog === 84 || prog === 85) return { mult: 1.5, modIndex: 3.2, modDecay: 0.15, carDecay: 0,    volScale: 0.24 }; // Lead 5 (Charang) / Lead 6 (Voice)
    if (prog === 86 || prog === 87) return { mult: 1.5, modIndex: 4.0, modDecay: 0.25, carDecay: 0,    volScale: 0.22 }; // Lead 7 (Fifths) / Lead 8 (Bass + Lead)

    // ── 88..95: Synth Pads ────────────────────────────────────────────────────
    if (prog >= 88 && prog <= 95)   return { mult: 1.0, modIndex: 1.2, modDecay: 0.80, carDecay: 0,    volScale: 0.20 }; // Warm, PolySynth, Choir, Metallic Pads

    // ── 96..103: Synth FX ─────────────────────────────────────────────────────
    if (prog >= 96 && prog <= 103)  return { mult: 3.5, modIndex: 3.0, modDecay: 0.50, carDecay: 0,    volScale: 0.22 }; // FX Rain, Crystal, Sci-Fi

    // ── 104..111: Ethnic ──────────────────────────────────────────────────────
    if (prog === 104 || prog === 105) return { mult: 3.0, modIndex: 4.0, modDecay: 0.18, carDecay: 0.70, volScale: 0.26 }; // Sitar / Banjo
    if (prog === 106 || prog === 107) return { mult: 2.0, modIndex: 3.5, modDecay: 0.12, carDecay: 0.50, volScale: 0.26 }; // Shamisen / Koto
    if (prog === 108 || prog === 109) return { mult: 4.0, modIndex: 2.5, modDecay: 0.20, carDecay: 0.60, volScale: 0.26 }; // Kalimba / Bagpipe
    if (prog === 110 || prog === 111) return { mult: 2.0, modIndex: 2.2, modDecay: 0,    carDecay: 0,    volScale: 0.24 }; // Fiddle / Shanai

    // ── 112..119: Percussive & Melodic Drums ──────────────────────────────────
    if (prog >= 112 && prog <= 119) return { mult: 2.5, modIndex: 3.0, modDecay: 0.10, carDecay: 0.40, volScale: 0.28 }; // Tinkle Bell, Steel Drum, Taiko

    // ── 120..127: Sound FX (Default fallback) ─────────────────────────────────
    return { mult: 1.0, modIndex: 2.0, modDecay: 0.20, carDecay: 0.50, volScale: 0.25 };
  }
}

/**
 * GMDrumSynth — Built-in General MIDI Drum Synthesizer for channel 9.
 */
class GMDrumSynth {
  constructor(ctx) {
    this.ctx = ctx;
    this._noiseBuffer = null;
    this._initNoise();
  }

  _initNoise() {
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this._noiseBuffer = buffer;
  }

  play(note, time, velocityGain, destination) {
    const when = Math.max(this.ctx.currentTime, time);
    const gain = Math.max(0, Math.min(1.5, velocityGain));

    switch (note) {
      case 35: // Acoustic Bass Drum
      case 36: // Bass Drum 1 (Kick)
        this._playKick(when, gain, destination, note === 35 ? 130 : 155);
        break;

      case 37: // Side Stick
        this._playRimshot(when, gain, destination);
        break;

      case 38: // Acoustic Snare
      case 40: // Electric Snare
        this._playSnare(when, gain, destination, note === 40);
        break;

      case 39: // Hand Clap
        this._playClap(when, gain, destination);
        break;

      case 42: // Closed Hi-Hat
      case 44: // Pedal Hi-Hat
        this._playHiHat(when, gain * 0.8, destination, false);
        break;

      case 46: // Open Hi-Hat
        this._playHiHat(when, gain * 0.9, destination, true);
        break;

      case 41: // Low Floor Tom
      case 43: // High Floor Tom
      case 45: // Low Tom
      case 47: // Low-Mid Tom
      case 48: // Hi-Mid Tom
      case 50: // High Tom
        this._playTom(when, gain, destination, note);
        break;

      case 49: // Crash Cymbal 1
      case 57: // Crash Cymbal 2
      case 52: // Chinese Cymbal
      case 55: // Splash Cymbal
        this._playCrash(when, gain, destination);
        break;

      case 51: // Ride Cymbal 1
      case 59: // Ride Cymbal 2
      case 53: // Ride Bell
        this._playRide(when, gain, destination);
        break;

      case 56: // Cowbell
        this._playCowbell(when, gain, destination);
        break;

      case 54: // Tambourine
      case 69: // Cabasa
      case 70: // Maracas
        this._playShaker(when, gain, destination);
        break;

      case 75: // Claves
      case 76: // Hi Wood Block
      case 77: // Low Wood Block
        this._playWoodblock(when, gain, destination, note);
        break;

      default:
        this._playGenericPercussion(when, gain, destination, note);
        break;
    }
  }

  _cleanup(nodes, durationMs) {
    setTimeout(() => {
      for (const n of nodes) {
        try { n?.disconnect?.(); } catch { /* ignore */ }
      }
    }, durationMs);
  }

  _playKick(when, gain, dest, startFreq = 145) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, when);
    osc.frequency.exponentialRampToValueAtTime(36, when + 0.09);

    g.gain.setValueAtTime(gain * 1.2, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + 0.32);

    osc.connect(g);
    g.connect(dest);
    osc.start(when);
    osc.stop(when + 0.33);

    this._cleanup([osc, g], 400);
  }

  _playSnare(when, gain, dest, isElectric = false) {
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isElectric ? 210 : 175, when);
    osc.frequency.exponentialRampToValueAtTime(65, when + 0.08);
    oscGain.gain.setValueAtTime(gain * 0.6, when);
    oscGain.gain.exponentialRampToValueAtTime(0.001, when + 0.14);
    osc.connect(oscGain);
    oscGain.connect(dest);
    osc.start(when);
    osc.stop(when + 0.15);

    const cleanupNodes = [osc, oscGain];

    if (this._noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this._noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1400, when);
      filter.Q.value = 0.7;

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(gain * 0.75, when);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, when + 0.20);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(dest);
      noise.start(when);
      noise.stop(when + 0.21);
      cleanupNodes.push(noise, filter, noiseGain);
    }

    this._cleanup(cleanupNodes, 300);
  }

  _playHiHat(when, gain, dest, isOpen) {
    if (!this._noiseBuffer) return;
    const dur = isOpen ? 0.30 : 0.05;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this._noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(6500, when);
    filter.Q.value = 0.7;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain * 0.65, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);

    noise.connect(filter);
    filter.connect(g);
    g.connect(dest);
    noise.start(when);
    noise.stop(when + dur + 0.01);

    this._cleanup([noise, filter, g], (dur + 0.05) * 1000);
  }

  _playCrash(when, gain, dest) {
    if (!this._noiseBuffer) return;
    const dur = 1.1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this._noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(4500, when);
    filter.Q.value = 0.7;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain * 0.7, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);

    noise.connect(filter);
    filter.connect(g);
    g.connect(dest);
    noise.start(when);
    noise.stop(when + dur + 0.01);

    this._cleanup([noise, filter, g], 1300);
  }

  _playRide(when, gain, dest) {
    if (!this._noiseBuffer) return;
    const dur = 0.65;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this._noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(6000, when);
    filter.Q.value = 0.7;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain * 0.5, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);

    noise.connect(filter);
    filter.connect(g);
    g.connect(dest);
    noise.start(when);
    noise.stop(when + dur + 0.01);

    this._cleanup([noise, filter, g], 800);
  }

  _playTom(when, gain, dest, note) {
    const tomFreqs = { 41: 85, 43: 98, 45: 110, 47: 125, 48: 140, 50: 165 };
    const baseFreq = tomFreqs[note] || 110;

    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * 1.8, when);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, when + 0.08);

    g.gain.setValueAtTime(gain * 0.9, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + 0.28);

    osc.connect(g);
    g.connect(dest);
    osc.start(when);
    osc.stop(when + 0.29);

    this._cleanup([osc, g], 400);
  }

  _playRimshot(when, gain, dest) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(450, when);
    g.gain.setValueAtTime(gain * 0.7, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + 0.04);
    osc.connect(g);
    g.connect(dest);
    osc.start(when);
    osc.stop(when + 0.045);

    this._cleanup([osc, g], 100);
  }

  _playClap(when, gain, dest) {
    if (!this._noiseBuffer) return;
    const cleanupNodes = [];
    [0, 0.012, 0.024].forEach((offset, idx) => {
      const isLast = (idx === 2);
      const dur = isLast ? 0.15 : 0.015;
      const noise = this.ctx.createBufferSource();
      noise.buffer = this._noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, when + offset);
      filter.Q.value = 1.5;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(gain * 0.8, when + offset);
      g.gain.exponentialRampToValueAtTime(0.001, when + offset + dur);
      noise.connect(filter);
      filter.connect(g);
      g.connect(dest);
      noise.start(when + offset);
      noise.stop(when + offset + dur + 0.01);
      cleanupNodes.push(noise, filter, g);
    });

    this._cleanup(cleanupNodes, 350);
  }

  _playCowbell(when, gain, dest) {
    const cleanupNodes = [];
    [587, 845].forEach(freq => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, when);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(freq, when);
      filter.Q.value = 5.0;
      g.gain.setValueAtTime(gain * 0.5, when);
      g.gain.exponentialRampToValueAtTime(0.001, when + 0.2);
      osc.connect(filter);
      filter.connect(g);
      g.connect(dest);
      osc.start(when);
      osc.stop(when + 0.21);
      cleanupNodes.push(osc, filter, g);
    });

    this._cleanup(cleanupNodes, 300);
  }

  _playShaker(when, gain, dest) {
    if (!this._noiseBuffer) return;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this._noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7000, when);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain * 0.6, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + 0.06);
    noise.connect(filter);
    filter.connect(g);
    g.connect(dest);
    noise.start(when);
    noise.stop(when + 0.07);

    this._cleanup([noise, filter, g], 150);
  }

  _playWoodblock(when, gain, dest, note) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(note === 76 ? 900 : 700, when);
    g.gain.setValueAtTime(gain * 0.8, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + 0.05);
    osc.connect(g);
    g.connect(dest);
    osc.start(when);
    osc.stop(when + 0.055);

    this._cleanup([osc, g], 120);
  }

  _playGenericPercussion(when, gain, dest, note) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    const freq = 120 + ((note % 24) * 20);
    osc.frequency.setValueAtTime(freq * 1.5, when);
    osc.frequency.exponentialRampToValueAtTime(freq, when + 0.05);
    g.gain.setValueAtTime(gain * 0.7, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + 0.15);
    osc.connect(g);
    g.connect(dest);
    osc.start(when);
    osc.stop(when + 0.16);

    this._cleanup([osc, g], 250);
  }

  // ── Indian Tabla Synthesis ───────────────────────────────────────────────────

  playTabla(note, time, velocityGain, destination) {
    const when = Math.max(this.ctx.currentTime, time);
    const gain = Math.max(0, Math.min(1.5, velocityGain));

    switch (note) {
      case 35: // Bayan (Dha - heavy open bass)
      case 36: // Bayan (Ge - pitch bending bass)
        this._playTablaBayan(when, gain, destination, note === 36);
        break;

      case 38: // Dayan (Tin - open ringing treble stroke)
      case 40: // Dayan (Tun - resonant bell tone)
        this._playTablaDayan(when, gain, destination, note === 40 ? 330 : 294);
        break;

      case 42: // Dayan (Na - rim stroke)
      case 44: // Dayan (Ta - edge stroke)
        this._playTablaRim(when, gain, destination, 1175);
        break;

      case 46: // Dayan (Open sustained Tun)
        this._playTablaDayan(when, gain * 1.1, destination, 294, 0.55);
        break;

      case 37: // Kat (flat muted hand stroke on Dayan)
      case 39: // Ke (muted flat stroke on Bayan)
        this._playTablaMute(when, gain, destination);
        break;

      case 41:
      case 43:
      case 45: // Low Bayan tones
        this._playTablaBayan(when, gain * 0.9, destination, false, 95);
        break;

      default:
        this._playTablaDayan(when, gain * 0.8, destination, 220 + ((note % 12) * 20));
        break;
    }
  }

  _playTablaBayan(when, gain, dest, isBending = true, baseFreq = 72) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = 'sine';
    if (isBending) {
      osc.frequency.setValueAtTime(baseFreq, when);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.45, when + 0.09);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.1, when + 0.3);
    } else {
      osc.frequency.setValueAtTime(baseFreq * 1.3, when);
      osc.frequency.exponentialRampToValueAtTime(baseFreq, when + 0.15);
    }

    g.gain.setValueAtTime(gain * 1.3, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + 0.45);

    const osc2 = this.ctx.createOscillator();
    const g2 = this.ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(baseFreq * 2, when);
    g2.gain.setValueAtTime(gain * 0.3, when);
    g2.gain.exponentialRampToValueAtTime(0.001, when + 0.2);

    osc.connect(g);
    osc2.connect(g2);
    g.connect(dest);
    g2.connect(dest);

    osc.start(when);
    osc2.start(when);
    osc.stop(when + 0.46);
    osc2.stop(when + 0.21);

    this._cleanup([osc, g, osc2, g2], 550);
  }

  _playTablaDayan(when, gain, dest, freq = 294, dur = 0.4) {
    const cleanupNodes = [];
    [freq, freq * 2, freq * 3.02].forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f, when);

      const amp = gain * (idx === 0 ? 0.9 : (idx === 1 ? 0.45 : 0.2));
      g.gain.setValueAtTime(amp, when);
      g.gain.exponentialRampToValueAtTime(0.001, when + dur * (idx === 0 ? 1.0 : 0.5));

      osc.connect(g);
      g.connect(dest);
      osc.start(when);
      osc.stop(when + dur + 0.02);
      cleanupNodes.push(osc, g);
    });

    this._cleanup(cleanupNodes, (dur + 0.1) * 1000);
  }

  _playTablaRim(when, gain, dest, freq = 1175) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, when);

    g.gain.setValueAtTime(gain * 0.8, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + 0.12);

    osc.connect(g);
    g.connect(dest);
    osc.start(when);
    osc.stop(when + 0.13);

    this._cleanup([osc, g], 180);
  }

  _playTablaMute(when, gain, dest) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(360, when);
    osc.frequency.exponentialRampToValueAtTime(90, when + 0.04);

    g.gain.setValueAtTime(gain * 0.9, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + 0.045);

    osc.connect(g);
    g.connect(dest);
    osc.start(when);
    osc.stop(when + 0.05);

    this._cleanup([osc, g], 100);
  }
}

function createQuantizeCurve(bits) {
  if (!bits || bits >= 16) return null;
  const steps = Math.pow(2, bits);
  const n = 4096;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.round(x * (steps / 2)) / (steps / 2);
  }
  return curve;
}

export class MIDISynth {

  constructor({
    soundfontBank = 'av_8mb',     // default: 👑 Yamaha XG Sound Set (Yamaha_XG_Sound_Set.sf2)
    soundfontFormat = 'mp3',
    percussionMode = 'soundfont',  // 'soundfont' (SF2 samples) or 'synth'
    masterVolume = 0.65,
  } = {}) {
    this._soundfontBank   = SOUNDFONT_BANKS[soundfontBank] ? soundfontBank : 'av_8mb';
    this._soundfontFormat = soundfontFormat;
    this._percussionMode  = percussionMode;
    this._soundfontEngine = null;  // Native leak-free Web Audio SoundFont engine
    this._ctx             = null;  // AudioContext
    this._masterGain      = null;  // master output gain
    this._masterLimiter   = null;  // master dynamics peak limiter
    this._masterVolume    = masterVolume;
    this._channels        = [];    // per-channel state
    this._drumSynth       = null;  // built-in GM drum synthesizer
    this._opl3Synth       = null;  // real-time OPL3 FM synthesizer

    // Hardware DSP filter & DAC nodes
    this._dspHighpass     = null;
    this._dspLowpass      = null;
    this._dspPresence     = null;
    this._dspBass         = null;
    this._dspBitcrusher   = null;
    this._dspWarmth       = null;
  }

  // ── Initialisation ──────────────────────────────────────────────────────────

  /**
   * Initialise the synthesizer.
   * @param {AudioContext} [audioCtx]  Reuse an existing AudioContext if provided.
   */
  async init(audioCtx) {
    this._ctx = audioCtx || new AudioContext();

    // Master Gain (calibrated headroom)
    this._masterGain = this._ctx.createGain();
    this._masterGain.gain.value = this._masterVolume ?? 0.65;

    // Master Peak Limiter (Brickwall Dynamics Compressor to prevent digital clipping/crackle)
    this._masterLimiter = this._ctx.createDynamicsCompressor();
    this._masterLimiter.threshold.setValueAtTime(-1.5, this._ctx.currentTime);
    this._masterLimiter.knee.setValueAtTime(6.0, this._ctx.currentTime);
    this._masterLimiter.ratio.setValueAtTime(20.0, this._ctx.currentTime);
    this._masterLimiter.attack.setValueAtTime(0.002, this._ctx.currentTime);
    this._masterLimiter.release.setValueAtTime(0.080, this._ctx.currentTime);

    this._masterGain.connect(this._masterLimiter);
    this._masterLimiter.connect(this._ctx.destination);

    // Build Hardware DSP Filter Chain
    this._dspHighpass = this._ctx.createBiquadFilter();
    this._dspHighpass.type = 'highpass';

    this._dspLowpass = this._ctx.createBiquadFilter();
    this._dspLowpass.type = 'lowpass';

    this._dspPresence = this._ctx.createBiquadFilter();
    this._dspPresence.type = 'peaking';

    this._dspBass = this._ctx.createBiquadFilter();
    this._dspBass.type = 'lowshelf';

    this._dspBitcrusher = this._ctx.createWaveShaper();
    this._dspBitcrusher.oversample = 'none';

    this._dspWarmth = this._ctx.createBiquadFilter();
    this._dspWarmth.type = 'peaking';

    // Connect DSP Chain: HP -> LP -> Presence -> Bass -> Bitcrusher -> Warmth -> MasterGain
    this._dspHighpass.connect(this._dspLowpass);
    this._dspLowpass.connect(this._dspPresence);
    this._dspPresence.connect(this._dspBass);
    this._dspBass.connect(this._dspBitcrusher);
    this._dspBitcrusher.connect(this._dspWarmth);
    this._dspWarmth.connect(this._masterGain);

    this._applyBankDSP(this._soundfontBank);

    this._drumSynth       = new GMDrumSynth(this._ctx);
    this._opl3Synth       = new OPL3Synth(this._ctx);
    this._sf2Synth        = new SF2Synth(this._ctx);
    this._sf2Engine       = new SpessaSynthEngine(this._ctx);
    this._sf2Engine.connect(this._dspHighpass);
    this._soundfontEngine = new SoundfontEngine(this._ctx);

    // 16 MIDI channels: each has its own gain node connected into the DSP Chain
    for (let i = 0; i < 16; i++) {
      const channelGain = this._ctx.createGain();
      channelGain.gain.value = 1.0;
      channelGain.connect(this._dspHighpass);

      this._channels[i] = {
        program:     i === 9 ? 128 : 0, // ch 9 fixed = GM percussion (program 128)
        volume:      1.0,
        pan:         0,                  // stereo pan −1..+1
        activeNotes: new Map(),          // note → voice
        gain:        channelGain,
      };
    }

    const currentBank = SOUNDFONT_BANKS[this._soundfontBank];
    console.log(`%c[MIDISynth] 🎵 Initialized synthesizer with default bank: %c${currentBank.name}`, 'color:#39ff14;font-weight:bold', 'color:#ffb700;font-weight:bold');
    console.log(`[MIDISynth]  ℹ Bank Description: ${currentBank.desc}`);

    if (this._percussionMode === 'soundfont' && !this.isCurrentBankSynth) {
      this._preload(128).catch(() => {});
    }
  }

  // ── SoundFont Bank & DSP Selection ──────────────────────────────────────────

  _applyBankDSP(bankKey) {
    if (!this._ctx || !this._dspHighpass) return;
    const profile = SOUNDFONT_BANKS[bankKey]?.dsp;
    if (!profile) return;
    const now = this._ctx.currentTime;

    this._dspHighpass.frequency.setTargetAtTime(profile.highpass, now, 0.03);
    this._dspLowpass.frequency.setTargetAtTime(profile.lowpass, now, 0.03);
    this._dspPresence.frequency.setTargetAtTime(profile.presenceFreq, now, 0.03);
    this._dspPresence.gain.setTargetAtTime(profile.presenceGain, now, 0.03);
    this._dspPresence.Q.setTargetAtTime(1.2, now, 0.03);
    this._dspBass.frequency.setTargetAtTime(profile.bassFreq, now, 0.03);
    this._dspBass.gain.setTargetAtTime(profile.bassGain, now, 0.03);
    this._dspWarmth.frequency.setTargetAtTime(450, now, 0.03);
    this._dspWarmth.gain.setTargetAtTime(profile.warmthGain, now, 0.03);
    this._dspWarmth.Q.setTargetAtTime(0.8, now, 0.03);

    // Apply DAC bitcrushing / quantization if configured
    if (this._dspBitcrusher) {
      if (profile.bits && profile.bits > 0 && profile.bits < 16) {
        this._dspBitcrusher.curve = createQuantizeCurve(profile.bits);
      } else {
        this._dspBitcrusher.curve = null;
      }
    }
  }

  /**
   * Switch the active SoundFont bank.
   * @param {string} bankKey
   */
  setSoundfontBank(bankKey) {
    if (!SOUNDFONT_BANKS[bankKey]) {
      console.warn(`[MIDISynth] Unknown bank key: "${bankKey}"`);
      return;
    }
    this._soundfontBank = bankKey;
    const bank = SOUNDFONT_BANKS[bankKey];

    console.log(`%c[MIDISynth] 🔄 Switched SoundFont Bank to: %c${bank.name}`, 'color:#39ff14;font-weight:bold', 'color:#ffb700;font-weight:bold');
    console.log(`[MIDISynth]  ℹ Description: ${bank.desc}`);
    console.log(`[MIDISynth]  ℹ Sound Engine: ${bank.isSynth ? 'Real-time Web Audio OPL3 FM Synthesizer' : bank.baseUrl}`);

    this._applyBankDSP(bankKey);
    this._soundfontEngine?.clear();

    if (this._percussionMode === 'soundfont' && !this.isCurrentBankSynth) {
      this._preload(128).catch(() => {});
    }
  }

  get soundfontBank() {
    return this._soundfontBank;
  }

  get currentBankInfo() {
    return SOUNDFONT_BANKS[this._soundfontBank] || SOUNDFONT_BANKS.av_8mb;
  }

  get isCurrentBankSynth() {
    return Boolean(SOUNDFONT_BANKS[this._soundfontBank]?.isSynth);
  }

  get isCurrentBankSF2() {
    return Boolean(SOUNDFONT_BANKS[this._soundfontBank]?.isSF2);
  }

  get sf2Synth() {
    return this._sf2Synth;
  }

  async loadCustomSF2(buffer, name = 'Custom SF2') {
    if (!this._sf2Synth) this._sf2Synth = new SF2Synth(this._ctx);
    await this._sf2Synth.loadFromArrayBuffer(buffer, name);
    SOUNDFONT_BANKS.custom_sf2.name = `📂 ${name}`;
    SOUNDFONT_BANKS.custom_sf2.desc = `Custom SoundFont 2 (${name}) loaded into memory`;
    this.setSoundfontBank('custom_sf2');
  }

  /** Initialize programs and CC7 channel volumes for all channels before playback starts. */
  initializeSongChannels(song) {
    if (!song || !song.channelDefs) return;

    if (this.isCurrentBankSF2 && this._sf2Engine?.isLoaded) {
      for (let ch = 1; ch <= 15; ch++) {
        const def = song.channelDefs[ch - 1];
        if (!def) continue;
        const midiCh = ch < 10 ? ch - 1 : ch;
        const startVoice = def.startvoice > 0 ? def.startvoice - 1 : 0;

        this._sf2Engine.programChange(midiCh, startVoice);
        this._sf2Engine.controlChange(midiCh, 7, 127);   // Channel Volume
        this._sf2Engine.controlChange(midiCh, 10, 64);   // Pan Center
        this._sf2Engine.controlChange(midiCh, 91, 32);   // Subtle natural reverb
      }
      // Drum track (channel 9)
      this._sf2Engine.controlChange(9, 7, 127);
      this._sf2Engine.controlChange(9, 91, 24);
    }
  }

  // ── Instrument loading ──────────────────────────────────────────────────────

  /**
   * Load (or return cached) instrument player for a GM program number.
   * Program 128 = GM percussion.
   */
  async _getPlayer(program) {
    if (this.isCurrentBankSynth || this.isCurrentBankSF2) return null;
    return this._preload(program);
  }

  /** Pre-load an instrument in the background (deduplicates concurrent requests). */
  _preload(program) {
    if (this.isCurrentBankSynth || this.isCurrentBankSF2) return Promise.resolve(null);
    if (!this._soundfontEngine || !this._ctx) return Promise.resolve(null);

    const isPercussion = (program === 128);
    const name = isPercussion ? 'percussion' : (GM_NAMES[program] ?? GM_NAMES[0]);
    const bank = SOUNDFONT_BANKS[this._soundfontBank] || SOUNDFONT_BANKS.av_8mb;
    const url = isPercussion
      ? `https://paulrosen.github.io/midi-js-soundfonts/FluidR3_GM/percussion-${this._soundfontFormat}.js`
      : `${bank.baseUrl}${name}-${this._soundfontFormat}.js`;

    return this._soundfontEngine.loadInstrument(program, url);
  }

  // ── Percussion Mode ──────────────────────────────────────────────────────────

  /**
   * Set percussion mode: 'soundfont' (SF2 sample bank) or 'synth' (Web Audio synth).
   * @param {'soundfont'|'synth'} mode
   */
  setPercussionMode(mode) {
    this._percussionMode = mode === 'synth' ? 'synth' : 'soundfont';
    console.log(`%c[MIDISynth] 🥁 Percussion Mode set to: %c${this._percussionMode.toUpperCase()}`, 'color:#39ff14;font-weight:bold', 'color:#ffb700;font-weight:bold');
    if (this._percussionMode === 'soundfont' && !this.isCurrentBankSynth) {
      this._preload(128).catch(() => {});
    }
  }

  get percussionMode() {
    return this._percussionMode;
  }

  // ── MIDI event handlers ─────────────────────────────────────────────────────

  /**
   * Schedule a note-on event.
   * @param {number} channel  MIDI channel 0–15
   * @param {number} note     MIDI note 0–127
   * @param {number} velocity 0–127
   * @param {number} [time]   AudioContext time (0 = now)
   */
  async noteOn(channel, note, velocity, time = 0) {
    if (velocity === 0) {
      this.noteOff(channel, note, time);
      return;
    }

    const ch = this._channels[channel];
    if (!ch) return;

    const when = Math.max(this._ctx.currentTime + 0.005, time || 0);
    const gain = (velocity / 127) * ch.volume;

    // ── Channel 9 = General MIDI Percussion ──────────────────────────────────
    if (channel === 9) {
      // Debounce duplicate identical drum hits scheduled within 8ms of each other
      if (!this._lastDrumNotes) this._lastDrumNotes = new Map();
      const prevTime = this._lastDrumNotes.get(note);
      if (prevTime !== undefined && Math.abs(prevTime - when) < 0.008) {
        return;
      }
      this._lastDrumNotes.set(note, when);

      if (this.isCurrentBankSF2 && this._sf2Engine?.isLoaded) {
        this._sf2Engine.noteOn(9, note, velocity);
        return;
      }

      if (this.isCurrentBankSF2 && this._sf2Synth?.isLoaded) {
        this._sf2Synth.playNote(9, 128, note, velocity, when, ch.gain);
        return;
      }

      if (this._soundfontBank === 'tabla') {
        if (this._drumSynth) {
          this._drumSynth.playTabla(note, when, gain, ch.gain);
        }
        return;
      }
      if (this._percussionMode === 'soundfont' && !this.isCurrentBankSynth && this._soundfontEngine) {
        const voice = this._soundfontEngine.playNote(128, note, velocity, when, ch.gain);
        if (voice) return;
      }
      // Built-in GM drum synthesizer (fallback or OPL3/synth mode)
      if (this._drumSynth) {
        this._drumSynth.play(note, when, gain, ch.gain);
      }
      return;
    }

    // ── Melodic tracker channels ─────────────────────────────────────────────

    // ── SF2 AudioWorklet Synthesizer Mode (Yamaha_XG_Sound_Set.sf2) ─────────
    if (this.isCurrentBankSF2 && this._sf2Engine?.isLoaded) {
      this._sf2Engine.noteOn(channel, note, velocity);
      return;
    }

    if (this.isCurrentBankSF2 && this._sf2Synth?.isLoaded) {
      const node = this._sf2Synth.playNote(channel, ch.program, note, velocity, when, ch.gain);
      if (node) ch.activeNotes.set(note, node);
      return;
    }

    // ── OPL3 FM Synthesizer Mode ─────────────────────────────────────────────
    if (this.isCurrentBankSynth && this._opl3Synth) {
      const node = this._opl3Synth.playNote(ch.program, note, when, gain, ch.gain);
      if (node) ch.activeNotes.set(note, node);
      return;
    }

    // ── Melodic tracker channels (0..8, 10..15) — Native SoundFont Engine ────
    if (!this._soundfontEngine) return;

    if (!this._soundfontEngine.isLoaded(ch.program)) {
      this._preload(ch.program).catch(() => {});
    }

    const shouldLoop = isSustainedGMProgram(ch.program);

    // Voice management per tracker channel:
    // 1. For sustained/looping instruments (Strings, Flute, Organ, Brass, Pads, etc.),
    //    stop any previous notes on this channel so they don't loop forever in background.
    if (shouldLoop) {
      for (const [activeNote, voice] of ch.activeNotes) {
        voice?.stop?.(when);
      }
      ch.activeNotes.clear();
    } else {
      // 2. For decaying instruments (Piano, Guitar, etc.):
      //    If the exact same note is already playing on this channel, stop previous instance.
      if (ch.activeNotes.has(note)) {
        ch.activeNotes.get(note)?.stop?.(when);
        ch.activeNotes.delete(note);
      }
      //    Cap decaying polyphony per channel to max 2 voices.
      if (ch.activeNotes.size >= 2) {
        let oldestNote = null;
        let oldestTime = Infinity;
        for (const [n, v] of ch.activeNotes) {
          const t = v.startTime || 0;
          if (t < oldestTime) {
            oldestTime = t;
            oldestNote = n;
          }
        }
        if (oldestNote !== null) {
          ch.activeNotes.get(oldestNote)?.stop?.(when);
          ch.activeNotes.delete(oldestNote);
        }
      }
    }

    const voice = this._soundfontEngine.playNote(ch.program, note, velocity, when, ch.gain);
    if (voice) {
      ch.activeNotes.set(note, voice);
      voice.onended = () => {
        if (ch.activeNotes.get(note) === voice) {
          ch.activeNotes.delete(note);
        }
      };
    }
  }

  /**
   * Schedule a note-off event.
   * @param {number} channel
   * @param {number} [note]
   * @param {number} [time]
   */
  noteOff(channel, note, time = 0) {
    if (this.isCurrentBankSF2 && this._sf2Engine?.isLoaded) {
      this._sf2Engine.noteOff(channel, note);
      return;
    }
    if (channel === 9 && (this._percussionMode === 'synth' || this.isCurrentBankSynth)) return;
    const ch = this._channels[channel];
    if (!ch) return;
    this._stopNote(ch, note, time || this._ctx.currentTime);
  }

  _stopNote(ch, note, when) {
    const stopAt = Math.max(this._ctx?.currentTime || 0, when || 0);

    if (note !== undefined && ch.activeNotes.has(note)) {
      const voice = ch.activeNotes.get(note);
      voice?.stop?.(stopAt);
      ch.activeNotes.delete(note);
    } else if (note === undefined) {
      for (const [n, voice] of ch.activeNotes) {
        voice?.stop?.(stopAt);
      }
      ch.activeNotes.clear();
    }
  }

  /** Send MIDI CC (Control Change). */
  controlChange(channel, cc, value, time = 0) {
    const ch = this._channels[channel];
    if (!ch) return;

    if (this.isCurrentBankSF2 && this._sf2Engine?.isLoaded) {
      this._sf2Engine.controlChange(channel, cc, value);
    }

    switch (cc) {
      case 7: // Channel Volume (0–127)
        ch.volume = value / 127;
        if (ch.gain) {
          ch.gain.gain.setTargetAtTime(ch.volume, time || this._ctx.currentTime, 0.01);
        }
        break;

      case 10: // Pan (0–127; 64 = center)
        ch.pan = (value - 64) / 64;
        break;

      case 120: // All Sound Off
      case 123: // All Notes Off
        this.silenceChannel(channel, time);
        break;
    }
  }

  /** Change the instrument program on a channel. */
  programChange(channel, program) {
    if (channel === 9) return;
    const ch = this._channels[channel];
    if (!ch) return;
    if (ch.program !== program) {
      this.silenceChannel(channel);
      ch.program = program;
    }
    if (this.isCurrentBankSF2 && this._sf2Engine?.isLoaded) {
      this._sf2Engine.programChange(channel, program);
      return;
    }
    if (!this.isCurrentBankSynth) {
      this._preload(program).catch(() => {});
    }
  }

  /** Stop all active notes on a channel immediately. */
  silenceChannel(channel, time = 0) {
    if (this.isCurrentBankSF2 && this._sf2Engine?.isLoaded) {
      this._sf2Engine.silenceChannel(channel);
      return;
    }
    const ch = this._channels[channel];
    if (!ch || !this._ctx) return;
    const stopTime = time || this._ctx.currentTime;
    this._stopNote(ch, undefined, stopTime);
  }

  /**
   * Stop all notes on all channels immediately with a clean, click-free fast fade-out (20ms).
   * Kills any future pre-buffered notes so nothing continues to play.
   * @param {number} [fastFadeMs=20]
   */
  silenceAll(fastFadeMs = 20) {
    if (this.isCurrentBankSF2 && this._sf2Engine?.isLoaded) {
      this._sf2Engine.silenceAll();
    }
    if (!this._ctx) return;
    const now = this._ctx.currentTime;
    const fadeSec = Math.max(0.005, fastFadeMs / 1000);
    const stopTime = now + fadeSec;

    // 1. Tell soundfont engine to immediately cancel and stop ALL active voices
    this._soundfontEngine?.stopAll(stopTime);

    // 2. Fast fade-out on every channel gain and stop active node handles
    for (let i = 0; i < 16; i++) {
      const ch = this._channels[i];
      if (ch) {
        if (ch.gain) {
          ch.gain.gain.cancelScheduledValues(now);
          ch.gain.gain.setValueAtTime(ch.gain.gain.value, now);
          ch.gain.gain.exponentialRampToValueAtTime(0.0001, stopTime);
        }
        for (const [note, voice] of ch.activeNotes) {
          voice?.stop?.(stopTime);
        }
        ch.activeNotes.clear();
      }
    }

    // 3. Fast fade-out on master gain
    if (this._masterGain) {
      this._masterGain.gain.cancelScheduledValues(now);
      this._masterGain.gain.setValueAtTime(this._masterGain.gain.value, now);
      this._masterGain.gain.exponentialRampToValueAtTime(0.0001, stopTime);
    }
  }

  /** Restore master volume and channel gains when starting new playback. */
  resumeGains() {
    if (!this._ctx) return;
    const now = this._ctx.currentTime;
    for (let i = 0; i < 16; i++) {
      const ch = this._channels[i];
      if (ch?.gain) {
        ch.gain.gain.cancelScheduledValues(now);
        ch.gain.gain.setValueAtTime(ch.volume, now);
      }
    }
    if (this._masterGain) {
      this._masterGain.gain.cancelScheduledValues(now);
      this._masterGain.gain.setValueAtTime(this._masterVolume ?? 0.65, now);
    }
  }

  /** Completely reset MIDI synth state, voices, controllers, and cached soundfont instances. */
  resetGM() {
    this.silenceAll(0);
    this._soundfontEngine?.clear();
    this._lastDrumNotes?.clear();

    if (this._ctx) {
      const now = this._ctx.currentTime;
      for (let i = 0; i < 16; i++) {
        const ch = this._channels[i];
        if (ch) {
          ch.program = i === 9 ? 128 : 0;
          ch.volume = 1.0;
          ch.pan = 0;
          ch.activeNotes.clear();
          if (ch.gain) {
            ch.gain.gain.cancelScheduledValues(now);
            ch.gain.gain.setValueAtTime(1.0, now);
          }
        }
      }
      if (this._masterGain) {
        this._masterGain.gain.cancelScheduledValues(now);
        this._masterGain.gain.setValueAtTime(this._masterVolume ?? 0.65, now);
      }
    }
  }

  // ── Volume / state ──────────────────────────────────────────────────────────

  setMasterVolume(vol) {
    if (this._masterGain && this._ctx)
      this._masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1, vol)), this._ctx.currentTime, 0.02);
  }

  getMasterVolume() {
    return this._masterGain ? this._masterGain.gain.value : 1;
  }

  /**
   * Pre-warm a set of GM programs so the first note plays without CDN latency.
   * @param {number[]} programs  Array of GM program numbers (0-based)
   * @param {Function} [onProgress]  Progress callback ({ loaded, total, current, percent, program, bankName })
   */
  async preloadPrograms(programs, onProgress) {
    const bank = SOUNDFONT_BANKS[this._soundfontBank];
    if (this.isCurrentBankSynth) {
      console.log(`%c[MIDISynth]  ✓ Active bank is real-time FM engine ("${bank.name}"). Zero download needed.`, 'color:#39ff14');
      onProgress?.({ loaded: 1, total: 1, current: bank.name, percent: 100, bankName: bank.name });
      return;
    }

    if (this.isCurrentBankSF2) {
      if (!this._sf2Engine.isLoaded && bank?.sf2Url) {
        onProgress?.({ loaded: 0, total: 100, current: `Loading AudioWorklet SoundFont & ${bank.sf2Url.split('/').pop()}…`, percent: 0, bankName: bank.name });
        await this._sf2Engine.loadFromURL(bank.sf2Url, onProgress);
      }
      onProgress?.({ loaded: 1, total: 1, current: this._sf2Engine.name, percent: 100, bankName: this._sf2Engine.name });
      return;
    }

    const toLoad = [...new Set(programs)];
    if (this._percussionMode === 'soundfont' && !toLoad.includes(128)) {
      toLoad.push(128);
    }

    const total = toLoad.length;
    if (total === 0) {
      onProgress?.({ loaded: 0, total: 0, current: 'Ready', percent: 100, bankName: bank.name });
      return;
    }

    console.log(`%c[MIDISynth] ⏳ Preloading ${total} instrument(s) for bank "${bank.name}"...`, 'color:#ffb700');

    let completed = 0;
    for (let i = 0; i < toLoad.length; i++) {
      const p = toLoad[i];
      const isPerc = (p === 128);
      const name = isPerc ? 'Drums (Percussion Kit)' : (GM_NAMES[p] ?? `Program ${p}`);

      onProgress?.({
        loaded: completed,
        total,
        current: name,
        percent: Math.round((completed / total) * 100),
        program: p,
        bankName: bank.name,
      });

      try {
        await this._preload(p);
      } catch (err) {
        console.warn(`[MIDISynth] Could not preload instrument ${name}:`, err.message);
      }

      completed++;
      onProgress?.({
        loaded: completed,
        total,
        current: name,
        percent: Math.round((completed / total) * 100),
        program: p,
        bankName: bank.name,
      });
    }

    console.log(`%c[MIDISynth]  ✓ Finished loading bank "${bank.name}" (${completed}/${total} ready).`, 'color:#39ff14;font-weight:bold');
  }

  get audioContext() { return this._ctx; }
}
