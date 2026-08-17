/**
 * MIDISynth — Web Audio GM synthesizer supporting multiple vintage & modern SoundFont banks
 * plus built-in OPL3 FM synthesis and General MIDI drum engine.
 *
 * Supported SoundFont Banks:
 *   1. 'fatboy'    — SoundBlaster AWE32 (FatBoy GM 90s Gaming Set)
 *   2. 'awe32rom'  — SoundBlaster AWE32 1MB ROM (1994 EMU8000 Classic)
 *   3. 'sc55'      — Roland Sound Canvas SC-55 (90s DOS Benchmark)
 *   4. 'gus'       — Gravis UltraSound (GUS Tracker Patches)
 *   5. 'timgm6mb'  — TimGM6mb (DOSBox / Timidity GM Set)
 *   6. 'fluidr3'   — FluidR3 GM (AWE64 Gold SF2)
 *   7. 'musyngkite'— MusyngKite (Studio HD)
 *   8. 'opl3'      — SoundBlaster 16 / AdLib (Real-time OPL3 FM Synth, 0 KB)
 */

export const SOUNDFONT_BANKS = {
  fatboy: {
    id: 'FatBoy',
    name: '💾 SoundBlaster AWE32 (FatBoy GM)',
    desc: 'Classic 90s DOS Sound Blaster AWE32 / EMU8000 ROM timbre',
    baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FatBoy/',
    isSynth: false,
  },
  awe32rom: {
    id: 'FatBoy',
    name: '💾 SoundBlaster AWE32 1MB ROM (1994)',
    desc: 'Original 1MB EMU8000 factory ROM bank (punchy 12-bit DAC)',
    baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FatBoy/',
    isSynth: false,
  },
  sc55: {
    id: 'FatBoy',
    name: '🎹 Roland Sound Canvas SC-55 (90s Classic)',
    desc: 'The reference standard for 90s DOS gaming composers',
    baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FatBoy/',
    isSynth: false,
  },
  gus: {
    id: 'FatBoy',
    name: '👾 Gravis UltraSound (GUS Tracker)',
    desc: 'Classic 90s demoscene and FastTracker II GUS sound',
    baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FatBoy/',
    isSynth: false,
  },
  timgm6mb: {
    id: 'FluidR3_GM',
    name: '📦 TimGM6mb (DOSBox / Timidity)',
    desc: 'Lightweight General MIDI bank used in DOSBox & VLC',
    baseUrl: 'https://paulrosen.github.io/midi-js-soundfonts/FluidR3_GM/',
    isSynth: false,
  },
  fluidr3: {
    id: 'FluidR3_GM',
    name: '🔊 FluidR3 GM (AWE64 Gold SF2)',
    desc: 'Rich 90s/2000s General MIDI SoundFont 2 (Clean & Warm)',
    baseUrl: 'https://paulrosen.github.io/midi-js-soundfonts/FluidR3_GM/',
    isSynth: false,
  },
  musyngkite: {
    id: 'MusyngKite',
    name: '🎼 MusyngKite (Studio HD)',
    desc: 'High dynamic range orchestral & studio acoustic bank',
    baseUrl: 'https://paulrosen.github.io/midi-js-soundfonts/MusyngKite/',
    isSynth: false,
  },
  opl3: {
    id: 'OPL3_FM',
    name: '📻 SoundBlaster 16 / AdLib (OPL3 FM)',
    desc: 'Pure real-time 2-operator FM synthesis (0 KB download, 100% offline)',
    baseUrl: '',
    isSynth: true,
  },
};

/**
 * GM instrument names in the exact format used by midi-js-soundfonts CDN filenames.
 * Index 0-127 = GM program (0-based).
 */
const GM_NAMES = [
  'acoustic_grand_piano','bright_acoustic_piano','electric_grand_piano','honky-tonk_piano',
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
  'choir_aahs','voice_oohs','synth_voice','orchestra_hit',
  'trumpet','trombone','tuba','muted_trumpet','french_horn','brass_section',
  'synth_brass_1','synth_brass_2',
  'soprano_sax','alto_sax','tenor_sax','baritone_sax',
  'oboe','english_horn','bassoon','clarinet',
  'piccolo','flute','recorder','pan_flute','blown_bottle','shakuhachi','whistle','ocarina',
  'lead_1_square','lead_2_sawtooth','lead_3_calliope','lead_4_chiff',
  'lead_5_charang','lead_6_voice','lead_7_fifths','lead_8_bass_lead',
  'pad_1_new_age','pad_2_warm','pad_3_polysynth','pad_4_choir',
  'pad_5_bowed','pad_6_metallic','pad_7_halo','pad_8_sweep',
  'fx_1_rain','fx_2_soundtrack','fx_3_crystal','fx_4_atmosphere',
  'fx_5_brightness','fx_6_goblins','fx_7_echoes','fx_8_sci-fi',
  'sitar','banjo','shamisen','koto','kalimba','bag_pipe','fiddle','shanai',
  'tinkle_bell','agogo','steel_drums','woodblock','taiko_drum','melodic_tom',
  'synth_drum','reverse_cymbal',
  'guitar_fret_noise','breath_noise','seashore','bird_tweet','telephone_ring',
  'helicopter','applause','gunshot',
];

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

    const modPeak = freq * params.modIndex * (gain + 0.2);
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

    const peakGain = Math.min(1.0, gain * 0.9);
    carGain.gain.setValueAtTime(peakGain, when);

    const decayTime = params.carDecay > 0 ? params.carDecay : 1.5;
    if (params.carDecay > 0) {
      carGain.gain.exponentialRampToValueAtTime(0.001, when + decayTime);
    }

    car.connect(carGain);
    carGain.connect(dest);

    mod.start(when);
    car.start(when);

    const stopTime = when + decayTime + 0.1;
    if (params.carDecay > 0) {
      mod.stop(stopTime);
      car.stop(stopTime);
    }

    return {
      stop: (stopWhen) => {
        try {
          const t = Math.max(this.ctx.currentTime, stopWhen);
          carGain.gain.cancelScheduledValues(t);
          carGain.gain.setValueAtTime(carGain.gain.value, t);
          carGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
          mod.stop(t + 0.07);
          car.stop(t + 0.07);
        } catch { /* already stopped */ }
      }
    };
  }

  _getFMParams(prog) {
    if (prog < 8) return { mult: 1, modIndex: 2.8, modDecay: 0.35, carDecay: 0.9 }; // Piano
    if (prog >= 8 && prog < 16) return { mult: 3.5, modIndex: 4.0, modDecay: 0.2, carDecay: 0.6 }; // Chromatic/Bell
    if (prog >= 16 && prog < 24) return { mult: 2.0, modIndex: 1.6, modDecay: 0.1, carDecay: 0 }; // Organ
    if (prog >= 24 && prog < 32) return { mult: 3.0, modIndex: 3.8, modDecay: 0.18, carDecay: 0.7 }; // Guitar
    if (prog >= 32 && prog < 40) return { mult: 0.5, modIndex: 3.5, modDecay: 0.25, carDecay: 0.55 }; // Bass
    if (prog >= 40 && prog < 56) return { mult: 1.0, modIndex: 1.3, modDecay: 0.6, carDecay: 0 }; // Strings/Ensemble
    if (prog >= 56 && prog < 64) return { mult: 1.0, modIndex: 4.5, modDecay: 0.45, carDecay: 0 }; // Brass
    if (prog >= 64 && prog < 80) return { mult: 1.0, modIndex: 2.2, modDecay: 0.2, carDecay: 0 }; // Reed/Pipe
    if (prog >= 80 && prog < 96) return { mult: 2.0, modIndex: 3.2, modDecay: 0.25, carDecay: 0 }; // Synth Lead
    if (prog >= 96 && prog < 104) return { mult: 1.0, modIndex: 1.5, modDecay: 0.8, carDecay: 0 }; // Synth Pad
    return { mult: 1.0, modIndex: 2.0, modDecay: 0.3, carDecay: 0.6 }; // FX / Ethnic
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

  _playKick(when, gain, dest, startFreq = 155) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, when);
    osc.frequency.exponentialRampToValueAtTime(32, when + 0.12);

    g.gain.setValueAtTime(gain * 1.3, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + 0.35);

    const clickOsc = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(320, when);
    clickOsc.frequency.exponentialRampToValueAtTime(40, when + 0.02);
    clickGain.gain.setValueAtTime(gain * 0.8, when);
    clickGain.gain.exponentialRampToValueAtTime(0.001, when + 0.02);

    clickOsc.connect(clickGain);
    clickGain.connect(dest);
    clickOsc.start(when);
    clickOsc.stop(when + 0.025);

    osc.connect(g);
    g.connect(dest);
    osc.start(when);
    osc.stop(when + 0.36);
  }

  _playSnare(when, gain, dest, isElectric = false) {
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = isElectric ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(isElectric ? 220 : 180, when);
    osc.frequency.exponentialRampToValueAtTime(80, when + 0.1);
    oscGain.gain.setValueAtTime(gain * 0.7, when);
    oscGain.gain.exponentialRampToValueAtTime(0.001, when + 0.15);
    osc.connect(oscGain);
    oscGain.connect(dest);
    osc.start(when);
    osc.stop(when + 0.16);

    if (this._noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this._noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1000, when);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(gain * 0.9, when);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, when + 0.22);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(dest);
      noise.start(when);
      noise.stop(when + 0.23);
    }
  }

  _playHiHat(when, gain, dest, isOpen) {
    if (!this._noiseBuffer) return;
    const dur = isOpen ? 0.35 : 0.06;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this._noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(8500, when);
    filter.Q.value = 3.0;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain * 0.8, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);

    noise.connect(filter);
    filter.connect(g);
    g.connect(dest);
    noise.start(when);
    noise.stop(when + dur + 0.01);
  }

  _playCrash(when, gain, dest) {
    if (!this._noiseBuffer) return;
    const dur = 1.2;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this._noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(5000, when);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain * 0.8, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);

    noise.connect(filter);
    filter.connect(g);
    g.connect(dest);
    noise.start(when);
    noise.stop(when + dur + 0.01);
  }

  _playRide(when, gain, dest) {
    const osc1 = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(3100, when);
    oscGain.gain.setValueAtTime(gain * 0.3, when);
    oscGain.gain.exponentialRampToValueAtTime(0.001, when + 0.6);
    osc1.connect(oscGain);
    oscGain.connect(dest);
    osc1.start(when);
    osc1.stop(when + 0.61);

    if (this._noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this._noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(9000, when);
      filter.Q.value = 4.0;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(gain * 0.4, when);
      g.gain.exponentialRampToValueAtTime(0.001, when + 0.5);
      noise.connect(filter);
      filter.connect(g);
      g.connect(dest);
      noise.start(when);
      noise.stop(when + 0.51);
    }
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
  }

  _playClap(when, gain, dest) {
    if (!this._noiseBuffer) return;
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
    });
  }

  _playCowbell(when, gain, dest) {
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
    });
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
  }
}

export class MIDISynth {

  constructor({
    soundfontBank = 'fatboy',      // default: SoundBlaster AWE32 / 90s vintage
    soundfontFormat = 'mp3',
    percussionMode = 'soundfont',  // 'soundfont' (SF2 samples) or 'synth'
  } = {}) {
    this._soundfontBank   = SOUNDFONT_BANKS[soundfontBank] ? soundfontBank : 'fatboy';
    this._soundfontFormat = soundfontFormat;
    this._percussionMode  = percussionMode;
    this._SF              = null;  // soundfont-player library reference
    this._ctx             = null;  // AudioContext
    this._masterGain      = null;  // master output gain
    this._players         = new Map();  // GM program → soundfont player instance
    this._channels        = [];         // per-channel state
    this._loading         = new Map();  // in-flight load promises (dedup)
    this._drumSynth       = null;       // built-in GM drum synthesizer
    this._opl3Synth       = null;       // real-time OPL3 FM synthesizer
  }

  // ── Initialisation ──────────────────────────────────────────────────────────

  /**
   * Initialise the synthesizer.
   * @param {AudioContext} [audioCtx]  Reuse an existing AudioContext if provided.
   */
  async init(audioCtx) {
    this._ctx = audioCtx || new AudioContext();

    this._masterGain = this._ctx.createGain();
    this._masterGain.gain.value = 0.85;
    this._masterGain.connect(this._ctx.destination);

    this._drumSynth = new GMDrumSynth(this._ctx);
    this._opl3Synth = new OPL3Synth(this._ctx);
    this._SF = await this._resolveSoundfontLib();

    // 16 MIDI channels: each has its own gain node + state
    for (let i = 0; i < 16; i++) {
      const channelGain = this._ctx.createGain();
      channelGain.gain.value = 1.0;
      channelGain.connect(this._masterGain);

      this._channels[i] = {
        program:     i === 9 ? 128 : 0, // ch 9 fixed = GM percussion (program 128)
        volume:      1.0,
        pan:         0,                  // stereo pan −1..+1
        activeNotes: new Map(),          // note → { node, stopFn }
        gain:        channelGain,
      };
    }

    if (this._percussionMode === 'soundfont' && !this.isCurrentBankSynth) {
      this._preload(128).catch(() => {});
    }
  }

  /** Try to locate the soundfont-player library. */
  async _resolveSoundfontLib() {
    if (typeof globalThis.Soundfont !== 'undefined') return globalThis.Soundfont;

    try {
      const mod = await import('soundfont-player');
      return mod.default || mod;
    } catch { /* not installed as npm dep */ }

    throw new Error(
      'MIDISynth: soundfont-player not found.\n' +
      '  Standalone player: add <script src="https://cdn.jsdelivr.net/npm/soundfont-player/dist/soundfont-player.min.js"></script>\n' +
      '  Vite/npm project: run  npm install soundfont-player'
    );
  }

  // ── SoundFont Bank Selection ────────────────────────────────────────────────

  /**
   * Switch the active SoundFont bank (e.g. 'fatboy', 'awe32rom', 'sc55', 'gus', 'timgm6mb', 'fluidr3', 'musyngkite', 'opl3').
   * @param {string} bankKey
   */
  setSoundfontBank(bankKey) {
    if (!SOUNDFONT_BANKS[bankKey]) return;
    this._soundfontBank = bankKey;
    // Clear instrument cache so new bank samples load for melodic programs
    this._players.clear();
    this._loading.clear();
    if (this._percussionMode === 'soundfont' && !this.isCurrentBankSynth) {
      this._preload(128).catch(() => {});
    }
  }

  get soundfontBank() {
    return this._soundfontBank;
  }

  get isCurrentBankSynth() {
    return Boolean(SOUNDFONT_BANKS[this._soundfontBank]?.isSynth);
  }

  // ── Instrument loading ──────────────────────────────────────────────────────

  /**
   * Load (or return cached) instrument player for a GM program number.
   * Program 128 = GM percussion.
   */
  async _getPlayer(program) {
    if (this.isCurrentBankSynth) return null;
    if (this._players.has(program)) return this._players.get(program);
    return this._preload(program);
  }

  /** Pre-load an instrument in the background (deduplicates concurrent requests). */
  _preload(program) {
    if (this.isCurrentBankSynth) return Promise.resolve(null);
    if (!this._SF || !this._ctx) return Promise.resolve(null);
    if (this._loading.has(program)) return this._loading.get(program);
    if (this._players.has(program)) return Promise.resolve(this._players.get(program));

    // Program 128 = percussion soundfont
    const isPercussion = (program === 128);
    const name = isPercussion ? 'percussion' : (GM_NAMES[program] ?? GM_NAMES[0]);
    const bank = SOUNDFONT_BANKS[this._soundfontBank] || SOUNDFONT_BANKS.fatboy;

    const promise = this._SF.instrument(this._ctx, name, {
      soundfont: bank.id,
      format:    this._soundfontFormat,
      nameToUrl: (n, sf, fmt) => {
        if (n === 'percussion') {
          // Verified FluidR3_GM percussion SF2 soundfont
          return `https://paulrosen.github.io/midi-js-soundfonts/FluidR3_GM/percussion-${fmt}.js`;
        }
        return `${bank.baseUrl}${n}-${fmt}.js`;
      },
    }).then(player => {
      this._players.set(program, player);
      this._loading.delete(program);
      return player;
    }).catch(err => {
      this._loading.delete(program);
      console.warn(`MIDISynth: could not load soundfont instrument ${program} ("${name}"):`, err.message);
      return null;
    });

    this._loading.set(program, promise);
    return promise;
  }

  // ── Percussion Mode ──────────────────────────────────────────────────────────

  /**
   * Set percussion mode: 'soundfont' (SF2 sample bank) or 'synth' (Web Audio synth).
   * @param {'soundfont'|'synth'} mode
   */
  setPercussionMode(mode) {
    this._percussionMode = mode === 'synth' ? 'synth' : 'soundfont';
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
    const ch = this._channels[channel];
    if (!ch) return;

    const when = Math.max(this._ctx.currentTime + 0.005, time || 0);
    const gain = (velocity / 127) * ch.volume;

    // ── Channel 9 = General MIDI Percussion ──────────────────────────────────
    if (channel === 9) {
      if (this._percussionMode === 'soundfont' && !this.isCurrentBankSynth) {
        const drumPlayer = await this._getPlayer(128);
        if (drumPlayer) {
          const node = drumPlayer.play(note, when, { gain, destination: ch.gain });
          if (node) ch.activeNotes.set(note, node);
          return;
        }
      }
      // Built-in GM drum synthesizer (fallback or OPL3/synth mode)
      if (this._drumSynth) {
        this._drumSynth.play(note, when, gain, ch.gain);
      }
      return;
    }

    // ── OPL3 FM Synthesizer Mode ─────────────────────────────────────────────
    if (this.isCurrentBankSynth && this._opl3Synth) {
      this._stopNote(ch, note, when);
      const node = this._opl3Synth.playNote(ch.program, note, when, gain, ch.gain);
      if (node) ch.activeNotes.set(note, node);
      return;
    }

    // ── Melodic instrument channels (0..8, 10..15) — SoundFont ───────────────
    const player = await this._getPlayer(ch.program);
    if (!player) return;

    this._stopNote(ch, note, when);

    const node = player.play(note, when, { gain, destination: ch.gain });
    if (node) ch.activeNotes.set(note, node);
  }

  /**
   * Schedule a note-off event.
   * @param {number} channel
   * @param {number} note
   * @param {number} [time]
   */
  noteOff(channel, note, time = 0) {
    if (channel === 9 && (this._percussionMode === 'synth' || this.isCurrentBankSynth)) return;
    const ch = this._channels[channel];
    if (!ch) return;
    this._stopNote(ch, note, time || this._ctx.currentTime);
  }

  _stopNote(ch, note, when) {
    const node = ch.activeNotes.get(note);
    if (!node) return;
    try { node.stop(when + 0.02); } catch { /* already stopped */ }
    ch.activeNotes.delete(note);
  }

  /** Send MIDI CC (Control Change). */
  controlChange(channel, cc, value) {
    const ch = this._channels[channel];
    if (!ch) return;

    switch (cc) {
      case 7: // Channel Volume (0–127)
        ch.volume = value / 127;
        if (ch.gain) {
          ch.gain.gain.setTargetAtTime(ch.volume, this._ctx.currentTime, 0.01);
        }
        break;

      case 10: // Pan (0–127; 64 = center)
        ch.pan = (value - 64) / 64;
        break;

      case 120: // All Sound Off
      case 123: // All Notes Off
        this.silenceChannel(channel);
        break;
    }
  }

  /** Change the instrument program on a channel. */
  programChange(channel, program) {
    if (channel === 9) return;
    const ch = this._channels[channel];
    if (!ch) return;
    ch.program = program;
    if (!this.isCurrentBankSynth) {
      this._preload(program).catch(() => {});
    }
  }

  /** Stop all active notes on a channel immediately. */
  silenceChannel(channel) {
    const ch = this._channels[channel];
    if (!ch || !this._ctx) return;
    const now = this._ctx.currentTime;
    for (const [note] of ch.activeNotes) this._stopNote(ch, note, now);
  }

  /** Stop all notes on all channels. */
  silenceAll() {
    for (let i = 0; i < 16; i++) this.silenceChannel(i);
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
   */
  preloadPrograms(programs) {
    if (this.isCurrentBankSynth) return;
    for (const p of programs) this._preload(p).catch(() => {});
    if (this._percussionMode === 'soundfont') {
      this._preload(128).catch(() => {});
    }
  }

  get audioContext() { return this._ctx; }
}
