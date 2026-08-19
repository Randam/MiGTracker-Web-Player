/**
 * SF2Synth.js — High-Precision Web Audio SoundFont 2 (.sf2) Synthesizer Engine.
 *
 * Implements full SoundFont 2.04 generator specifications:
 *   - Overriding root key (Generator 58)
 *   - Coarse tuning in semitones (Generator 51)
 *   - Fine tuning in cents (Generator 52)
 *   - Scale tuning in cents/key (Generator 56)
 *   - Initial attenuation in centibels (Generator 48)
 *   - Sample loop points (startLoop, endLoop) & sustained looping
 *   - General MIDI drum kits (Bank 128)
 */

import { isSustainedGMProgram } from './MIDISynth.js';

let _SoundFont2Class = null;

async function getSoundFont2Class() {
  if (_SoundFont2Class) return _SoundFont2Class;
  if (typeof globalThis.SoundFont2 !== 'undefined') {
    _SoundFont2Class = globalThis.SoundFont2;
    return _SoundFont2Class;
  }

  try {
    let code = '';
    if (typeof fetch !== 'undefined') {
      const url = new URL('./lib/SoundFont2.js', import.meta.url).href;
      const res = await fetch(url);
      code = await res.text();
    }
    const scope = { window: globalThis, exports: {}, module: { exports: {} } };
    const fn = new Function('window', 'exports', 'module', 'global', 'self', code);
    fn(scope.window, scope.exports, scope.module, scope.window, scope.window);
    _SoundFont2Class = scope.window.SoundFont2 || scope.module.exports.SoundFont2;
    return _SoundFont2Class;
  } catch (err) {
    console.error('[SF2Synth] Failed to load SoundFont2 parser:', err);
    throw err;
  }
}

function getGenValue(generators, id) {
  if (!generators) return undefined;
  const g = generators[String(id)] || generators[id];
  return g ? g.value : undefined;
}

export class SF2Synth {
  /**
   * @param {AudioContext} ctx
   */
  constructor(ctx) {
    this.ctx = ctx;
    this.sf2 = null;
    this.name = 'Unloaded';
    this.isLoaded = false;
    this._bufferCache = new Map(); // sampleIndex -> AudioBuffer
  }

  /**
   * Load an SF2 SoundFont from an ArrayBuffer or Uint8Array.
   * @param {ArrayBuffer|Uint8Array} buffer
   * @param {string} [name='Custom SoundFont']
   */
  async loadFromArrayBuffer(buffer, name = 'Custom SoundFont') {
    const SF2Class = await getSoundFont2Class();
    const uint8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    this.sf2 = new SF2Class(uint8);
    this.name = this.sf2.metaData?.name || name;
    this.isLoaded = true;
    this._bufferCache.clear();

    console.log(`%c[SF2Synth]  ✓ Loaded SF2 SoundFont: "${this.name}"`, 'color:#39ff14;font-weight:bold');
    if (this.sf2.metaData) {
      console.log(`[SF2Synth]    Engine: ${this.sf2.metaData.soundEngine || 'EMU8000'} | Presets: ${this.sf2.presets?.length || 0}`);
    }
  }

  /**
   * Fetch and load an SF2 file from a URL with progress reporting.
   * @param {string} url
   * @param {Function} [onProgress]  ({ loaded, total, percent, status })
   */
  async loadFromURL(url, onProgress) {
    onProgress?.({ loaded: 0, total: 100, percent: 0, status: 'Downloading SF2 soundfont…' });
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch SF2 soundfont from "${url}" (HTTP ${res.status})`);

    const contentLength = +(res.headers.get('content-length') || 0);
    let buffer;

    if (contentLength > 0 && res.body && typeof res.body.getReader === 'function') {
      const reader = res.body.getReader();
      const chunks = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        const pct = Math.min(99, Math.round((received / contentLength) * 100));
        onProgress?.({ loaded: received, total: contentLength, percent: pct, status: `Downloading SF2: ${pct}%` });
      }

      const totalBuf = new Uint8Array(received);
      let offset = 0;
      for (const chunk of chunks) {
        totalBuf.set(chunk, offset);
        offset += chunk.length;
      }
      buffer = totalBuf.buffer;
    } else {
      buffer = await res.arrayBuffer();
    }

    onProgress?.({ loaded: 100, total: 100, percent: 100, status: 'Parsing SoundFont2 tables…' });
    const filename = url.split('/').pop().replace(/\.sf2$/i, '');
    await this.loadFromArrayBuffer(buffer, filename);
  }

  /**
   * Convert an SF2 PCM sample to a Web Audio AudioBuffer (cached).
   * @param {object} sample  SF2 sample object
   * @returns {AudioBuffer|null}
   */
  _getAudioBuffer(sample) {
    if (!sample || !sample.data) return null;
    const cacheKey = sample.header?.start ?? sample.data;
    if (this._bufferCache.has(cacheKey)) {
      return this._bufferCache.get(cacheKey);
    }

    const int16 = sample.data;
    const length = int16.length;
    const sampleRate = sample.header?.sampleRate || 44100;

    const audioBuf = this.ctx.createBuffer(1, length, sampleRate);
    const channelData = audioBuf.getChannelData(0);

    for (let i = 0; i < length; i++) {
      channelData[i] = int16[i] / 32768.0;
    }

    this._bufferCache.set(cacheKey, audioBuf);
    return audioBuf;
  }

  /**
   * Play a note using the active SoundFont 2 bank.
   * @param {number} channel   MIDI channel (0–15, 9 = percussion)
   * @param {number} program   GM program (0–127)
   * @param {number} note      MIDI note (0–127)
   * @param {number} velocity  MIDI velocity (0–127)
   * @param {number} when      AudioContext scheduled start timestamp
   * @param {AudioNode} dest   Destination Web Audio node
   * @returns {object|null}    Handle with .stop(stopAt)
   */
  playNote(channel, program, note, velocity, when, dest) {
    if (!this.isLoaded || !this.sf2) return null;

    const isPercussion = (channel === 9);
    const bankNum = isPercussion ? 128 : 0;
    const presetNum = isPercussion ? 0 : program;

    // Look up key data in SF2
    let keyData = this.sf2.getKeyData(note, bankNum, presetNum);
    if (!keyData && !isPercussion) {
      // Fallback to bank 0 if variation bank not found
      keyData = this.sf2.getKeyData(note, 0, presetNum);
    }
    if (!keyData && isPercussion) {
      // Fallback standard kit
      keyData = this.sf2.getKeyData(note, 128, 0);
    }
    if (!keyData) {
      // Fallback Piano
      keyData = this.sf2.getKeyData(note, 0, 0);
    }
    if (!keyData || !keyData.sample) return null;

    const sample = keyData.sample;
    const header = sample.header || {};
    const gens = keyData.generators || {};
    const audioBuf = this._getAudioBuffer(sample);
    if (!audioBuf) return null;

    const source = this.ctx.createBufferSource();
    source.buffer = audioBuf;

    // ── Precise SoundFont 2 Pitch Calculation ──────────────────────────────
    // 1. Root key: Generator 58 (overridingRootKey) overrides sample header originalPitch
    const genRoot = getGenValue(gens, 58);
    const rootKey = (genRoot !== undefined && genRoot >= 0)
      ? genRoot
      : ((header.originalPitch !== undefined && header.originalPitch > 0) ? header.originalPitch : 60);

    // 2. Coarse tuning (Gen 51, semitones) & Fine tuning (Gen 52, cents)
    const coarseTune = getGenValue(gens, 51) || 0;
    const fineTune = getGenValue(gens, 52) || 0;
    const scaleTuning = getGenValue(gens, 56) ?? 100;
    const pitchCorrection = header.pitchCorrection || 0;

    // Total cents offset from sample recording pitch
    const totalCents = (note - rootKey) * scaleTuning + (coarseTune * 100) + fineTune + pitchCorrection;
    const playbackRate = Math.pow(2, totalCents / 1200);

    source.playbackRate.setValueAtTime(Math.max(0.01, playbackRate), when);

    // ── Looping ─────────────────────────────────────────────────────────────
    // Sustained instruments (Strings, Organs, Brass, Pads, Flutes) loop indefinitely while held
    const isSustained = !isPercussion && isSustainedGMProgram(program);
    const hasValidLoop = header.endLoop > header.startLoop && header.startLoop > 0;

    if (isSustained && hasValidLoop) {
      source.loop = true;
      const sRate = header.sampleRate || 44100;
      source.loopStart = header.startLoop / sRate;
      source.loopEnd = header.endLoop / sRate;
    } else {
      source.loop = false;
    }

    // ── Dynamics & Attenuation ──────────────────────────────────────────────
    // Initial attenuation (Gen 48, centibels: 10 cB = 1 dB)
    const attenCentibels = getGenValue(gens, 48) || 0;
    const attenGain = Math.pow(10, -attenCentibels / 200);

    const gainNode = this.ctx.createGain();
    const linearGain = (velocity / 127) * attenGain * (isPercussion ? 1.0 : 1.15);

    // Initialize gain node smoothly
    gainNode.gain.setValueAtTime(Math.max(0.0001, linearGain), when);

    // Connect audio chain
    source.connect(gainNode);
    gainNode.connect(dest);

    source.start(when);

    let isStopped = false;
    const stopFn = (stopWhen = this.ctx.currentTime) => {
      if (isStopped) return;
      isStopped = true;

      const now = this.ctx.currentTime;
      const releaseStart = Math.max(now, stopWhen);
      const releaseDuration = isSustained ? 0.08 : 0.04;
      const releaseEnd = releaseStart + releaseDuration;

      try {
        gainNode.gain.cancelScheduledValues(releaseStart);
        gainNode.gain.setValueAtTime(gainNode.gain.value || linearGain, releaseStart);
        gainNode.gain.linearRampToValueAtTime(0.0001, releaseEnd);
        source.stop(releaseEnd + 0.01);
        setTimeout(() => {
          try {
            source.disconnect();
            gainNode.disconnect();
          } catch { /* ignore */ }
        }, Math.max(50, (releaseEnd - now) * 1000 + 50));
      } catch {
        try { source.stop(releaseStart); } catch { /* ignore */ }
      }
    };

    source.onended = () => {
      try {
        source.disconnect();
        gainNode.disconnect();
      } catch { /* ignore */ }
    };

    return { source, gainNode, stop: stopFn };
  }
}
