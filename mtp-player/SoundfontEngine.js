/**
 * SoundfontEngine.js — Native Web Audio SoundFont sample engine.
 *
 * Replaces soundfont-player with a high-performance, 100% leak-free implementation:
 *   - Direct fetch and base64 audio decoding into Web Audio AudioBuffers
 *   - Automatic note interpolation / pitch-shifting for missing semitones
 *   - Strict voice lifecycle management (zero memory leaks, instant node disposal on onended)
 *   - Direct routing through channel gain nodes and hardware DSP chains
 *   - Global polyphony cap (max 48 voices) with intelligent voice stealing
 */


const NOTE_OFFSETS = {
  'c': 0, 'c#': 1, 'db': 1,
  'd': 2, 'd#': 3, 'eb': 3,
  'e': 4,
  'f': 5, 'f#': 6, 'gb': 6,
  'g': 7, 'g#': 8, 'ab': 8,
  'a': 9, 'a#': 10, 'bb': 10,
  'b': 11
};

export function noteNameToMidi(name) {
  if (typeof name === 'number') return name;
  if (/^\d+$/.test(name)) return parseInt(name, 10);
  const match = /^([A-Ga-g][#b]?)(-?\d+)$/.exec(String(name).trim());
  if (!match) return -1;
  const pitch = match[1].toLowerCase();
  const octave = parseInt(match[2], 10);
  const offset = NOTE_OFFSETS[pitch];
  if (offset === undefined) return -1;
  return (octave + 1) * 12 + offset;
}

function base64ToArrayBuffer(base64Uri) {
  const base64 = base64Uri.replace(/^data:audio\/[^;]+;base64,/, '');
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export class SoundfontVoice {
  constructor(ctx, buffer, playbackRate, gain, destination, when) {
    this.ctx = ctx;
    this.isEnded = false;
    this.startTime = when;

    this.gainNode = ctx.createGain();
    this.gainNode.gain.setValueAtTime(Math.max(0.0001, gain), when);
    this.gainNode.connect(destination);

    this.source = ctx.createBufferSource();
    this.source.buffer = buffer;
    this.source.playbackRate.setValueAtTime(playbackRate, when);
    this.source.connect(this.gainNode);

    this.source.onended = () => {
      this.dispose();
    };

    this.source.start(when);
  }

  stop(stopWhen = this.ctx.currentTime) {
    if (this.isEnded) return;
    const now = this.ctx.currentTime;
    const stopAt = Math.max(now, stopWhen);
    const releaseTime = 0.05;
    const releaseEnd = stopAt + releaseTime;

    try {
      this.gainNode.gain.cancelScheduledValues(stopAt);
      this.gainNode.gain.setTargetAtTime(0.0001, stopAt, releaseTime / 3);
      this.source.stop(releaseEnd + 0.02);
    } catch {
      try { this.source.stop(stopAt); } catch { /* ignore */ }
    }
  }

  dispose() {
    if (this.isEnded) return;
    this.isEnded = true;
    try {
      this.source.disconnect();
      this.gainNode.disconnect();
    } catch { /* ignore */ }
    this.onended?.();
  }
}

export class SoundfontEngine {
  constructor(ctx) {
    this.ctx = ctx;
    this._instruments = new Map(); // program -> Map<midiNote, AudioBuffer>
    this._loading = new Map();     // program -> Promise<Map<midiNote, AudioBuffer>>
    this._activeVoices = new Set();
    this._maxGlobalVoices = 160;    // Generous headroom for lookahead scheduling buffer
  }

  /**
   * Play a note using decoded soundfont buffers.
   * @param {number} program GM program number (0..127, 128 for percussion)
   * @param {number} note MIDI note 0..127
   * @param {number} velocity 0..127
   * @param {number} when AudioContext time
   * @param {AudioNode} destination Destination GainNode (channel gain)
   * @returns {SoundfontVoice|null}
   */
  playNote(program, note, velocity, when, destination) {
    const buffers = this._instruments.get(program) || (program !== 0 ? this._instruments.get(0) : null);
    if (!buffers || buffers.size === 0) return null;

    const sample = this._getSample(buffers, note);
    if (!sample) return null;

    // Safety global polyphony cap with voice stealing (only triggers if massive pileup occurs)
    if (this._activeVoices.size >= this._maxGlobalVoices) {
      let oldestVoice = null;
      let oldestTime = Infinity;
      for (const v of this._activeVoices) {
        if (!v.isEnded && v.startTime < oldestTime) {
          oldestTime = v.startTime;
          oldestVoice = v;
        }
      }
      if (oldestVoice) {
        oldestVoice.stop(when);
        this._activeVoices.delete(oldestVoice);
      }
    }

    const gain = (velocity / 127) * 1.05;
    const voice = new SoundfontVoice(this.ctx, sample.buffer, sample.playbackRate, gain, destination, when);

    this._activeVoices.add(voice);
    voice.onended = () => {
      this._activeVoices.delete(voice);
    };

    return voice;
  }

  _getSample(buffers, targetNote) {
    if (buffers.has(targetNote)) {
      return { buffer: buffers.get(targetNote), playbackRate: 1.0 };
    }
    // Find nearest available note
    let closestNote = -1;
    let minDiff = Infinity;
    for (const note of buffers.keys()) {
      const diff = Math.abs(note - targetNote);
      if (diff < minDiff) {
        minDiff = diff;
        closestNote = note;
      }
    }
    if (closestNote === -1) return null;
    const semitones = targetNote - closestNote;
    const playbackRate = Math.pow(2, semitones / 12);
    return { buffer: buffers.get(closestNote), playbackRate };
  }

  /**
   * Load and decode an instrument soundfont file.
   * @param {number} program
   * @param {string} url
   * @returns {Promise<Map<number, AudioBuffer>>}
   */
  async loadInstrument(program, url) {
    if (this._instruments.has(program)) {
      return this._instruments.get(program);
    }
    if (this._loading.has(program)) {
      return this._loading.get(program);
    }

    const loadPromise = (async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
      const text = await res.text();

      const scope = { Soundfont: {} };
      const fn = new Function('MIDI', text + '\nreturn MIDI.Soundfont;');
      const sf = fn(scope);
      const instKey = Object.keys(sf)[0];
      const data = instKey ? sf[instKey] : {};
      const buffers = new Map();

      const entries = Object.entries(data);
      await Promise.all(entries.map(async ([key, dataUri]) => {
        try {
          const midi = noteNameToMidi(key);
          if (midi >= 0 && midi <= 127) {
            const arrayBuf = base64ToArrayBuffer(dataUri);
            const audioBuf = await new Promise((resolve, reject) => {
              const p = this.ctx.decodeAudioData(arrayBuf, resolve, reject);
              if (p && typeof p.then === 'function') p.then(resolve).catch(reject);
            });
            buffers.set(midi, audioBuf);
          }
        } catch (err) {
          // Ignore individual malformed note
        }
      }));

      console.log(`%c[SoundfontEngine]  ✓ Loaded instrument [Prog ${program}: "${instKey}"] (${buffers.size} notes decoded)`, 'color:#39ff14');
      this._instruments.set(program, buffers);
      this._loading.delete(program);
      return buffers;
    })().catch(err => {
      this._loading.delete(program);
      console.warn(`[SoundfontEngine] Failed to load instrument [Prog ${program}] from ${url}:`, err.message);
      return new Map();
    });

    this._loading.set(program, loadPromise);
    return loadPromise;
  }

  isLoaded(program) {
    return this._instruments.has(program) && this._instruments.get(program).size > 0;
  }

  stopAll(when = this.ctx.currentTime) {
    for (const v of this._activeVoices) {
      v.stop(when);
    }
    this._activeVoices.clear();
  }

  clear() {
    this.stopAll();
    this._instruments.clear();
    this._loading.clear();
  }
}
