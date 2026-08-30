/**
 * SpessaSynthEngine.js — High-Performance AudioWorklet SoundFont 2 Synthesizer.
 *
 * Uses spessasynth_lib to render SoundFont 2 (.sf2) banks with 100% SF2 spec fidelity
 * inside a Web Audio AudioWorklet background thread for zero stutter and zero latency.
 */

// A relative path, not a package specifier: spessasynth_lib is this package's own vendored
// lib/spessasynth_lib.js, not a real installed 'spessasynth_lib' dependency (no such package
// exists in node_modules). A bare specifier here only ever resolved by accident, when esbuild's
// dependency pre-bundling happened to have a stale cached answer for it lying around; consumers
// that exclude this package from optimization (as Avalon-Remake's vite.config.js now does, to
// keep ./lib/spessasynth_processor.js's own relative AudioWorklet URL intact) get a hard
// "Failed to resolve import" instead.
import { WorkletSynthesizer } from './lib/spessasynth_lib.js';

export class SpessaSynthEngine {
  constructor(ctx) {
    this.ctx = ctx;
    this.synth = null;
    this.isLoaded = false;
    this.name = 'SpessaSynth (AudioWorklet SF2)';
    this._dest = null;
  }

  async init() {
    if (this.synth) return;

    // Load the AudioWorklet processor worker script
    const procUrl = new URL('./lib/spessasynth_processor.js', import.meta.url).href;
    try {
      await this.ctx.audioWorklet.addModule(procUrl);
    } catch {
      // ignore if module was already added to this AudioContext
    }

    this.synth = new WorkletSynthesizer(this.ctx);
    if (this._dest) {
      try { this.synth.connect(this._dest); } catch { /* ignore */ }
    }
    console.log('%c[SpessaSynth]  ✓ High-Performance AudioWorklet SoundFont 2 Engine Initialized!', 'color:#39ff14;font-weight:bold');
  }

  connect(dest) {
    this._dest = dest;
    if (this.synth) {
      try { this.synth.connect(dest); } catch { /* ignore */ }
    }
  }

  disconnect() {
    if (this.synth) {
      try { this.synth.disconnect(); } catch { /* ignore */ }
    }
  }

  async loadFromURL(url, onProgress) {
    await this.init();

    onProgress?.({ loaded: 0, total: 100, percent: 0, status: `Downloading ${url.split('/').pop()}…` });
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch SoundFont from "${url}" (HTTP ${res.status})`);

    const contentLength = +(res.headers.get('content-length') || 0);
    let arrayBuffer;

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
        onProgress?.({ loaded: received, total: contentLength, percent: pct, status: `Downloading SoundFont: ${pct}%` });
      }

      const totalBuf = new Uint8Array(received);
      let offset = 0;
      for (const chunk of chunks) {
        totalBuf.set(chunk, offset);
        offset += chunk.length;
      }
      arrayBuffer = totalBuf.buffer;
    } else {
      arrayBuffer = await res.arrayBuffer();
    }

    onProgress?.({ loaded: 100, total: 100, percent: 100, status: 'Loading SoundFont into AudioWorklet engine…' });

    await this.synth.soundBankManager.addSoundBank(arrayBuffer, 'main');
    await this.synth.isReady;

    this.isLoaded = true;
    const filename = url.split('/').pop().replace(/\.sf2$/i, '');
    this.name = `SpessaSynth (${filename})`;

    console.log(`%c[SpessaSynth]  ✓ SoundFont "${filename}" loaded into AudioWorklet engine!`, 'color:#39ff14;font-weight:bold');
  }

  noteOn(channel, note, velocity) {
    if (!this.synth || !this.isLoaded) return;
    this.synth.noteOn(channel, note, velocity);
  }

  noteOff(channel, note) {
    if (!this.synth || !this.isLoaded) return;
    this.synth.noteOff(channel, note);
  }

  programChange(channel, program) {
    if (!this.synth || !this.isLoaded) return;
    this.synth.programChange(channel, program);
  }

  controlChange(channel, cc, value) {
    if (!this.synth || !this.isLoaded) return;
    this.synth.controllerChange(channel, cc, value);
  }

  pitchBend(channel, val) {
    if (!this.synth || !this.isLoaded) return;
    this.synth.pitchWheel(channel, val);
  }

  silenceChannel(channel) {
    if (!this.synth || !this.isLoaded) return;
    this.synth.controllerChange(channel, 123, 0); // All notes off
  }

  silenceAll() {
    if (!this.synth || !this.isLoaded) return;
    try {
      this.synth.stopAll(true);
    } catch {
      for (let c = 0; c < 16; c++) {
        this.synth.controllerChange(c, 123, 0);
      }
    }
  }
}
