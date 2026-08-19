/**
 * MTPPlayer — Public API for MiGTracker Pro (.MTP) playback in the browser.
 *
 * Usage (standalone player with CDN soundfont-player):
 *   import { MTPPlayer } from './mtp-player/index.js';
 *   const player = new MTPPlayer();
 *   await player.init();
 *   await player.loadFromFile(fileObject);
 *   player.play();
 *   player.on('step', ({ position, step }) => { ... });
 *
 * Usage (Avalon Remake / Vite project):
 *   import { MTPPlayer } from 'mtp-player';
 *   const music = new MTPPlayer();
 *   await music.init();
 *   await music.loadFromURL('/music/AVALON1.MTP');
 *   music.play();
 *   // On area change:
 *   await music.crossfadeTo('/music/CAMELOT.MTP', 1500);
 */

import { MTPParser }    from './MTPParser.js';
import { MTPSequencer } from './MTPSequencer.js';
import { MIDISynth, SOUNDFONT_BANKS } from './MIDISynth.js';

export { SOUNDFONT_BANKS };

export { MTPParser, MTPSequencer, MIDISynth };

export class MTPPlayer extends EventTarget {
  /**
   * @param {object} [options]
   * @param {string} [options.soundfontUrl='FluidR3_GM']   Soundfont bank name
   * @param {string} [options.soundfontFormat='mp3']       Audio format
   * @param {number} [options.lookahead=0.12]              Scheduler look-ahead in seconds
   * @param {number} [options.scheduleInterval=50]         Scheduler tick interval in ms
   */
  constructor(options = {}) {
    super();
    this._options          = options;
    this._synth            = new MIDISynth(options);
    this._sequencer        = null;
    this._song             = null;
    this._playing          = false;
    this._paused           = false;
    this._ctx              = null;
    this._scheduleTimer    = null;
    this._nextTickTime     = 0;
    this._lookahead        = options.lookahead        ?? 0.12;
    this._scheduleInterval = options.scheduleInterval ?? 50;
    this._volume           = 1.0;
    this._loop             = true;
    this._crossfading      = false;
    this._initialized      = false;  // guard against double-init
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  /**
   * Initialise audio engine. Must be called (ideally in a user gesture handler).
   * @param {AudioContext} [audioCtx]  Pass an existing AudioContext to share it.
   */
  async init(audioCtx) {
    if (this._initialized) return;
    this._ctx = audioCtx || new AudioContext();
    await this._synth.init(this._ctx);
    this._initialized = true;
  }

  /** Called internally by play() to create the AudioContext on first use. */
  async _ensureAudioContext() {
    if (this._initialized) {
      if (this._ctx.state === 'suspended') await this._ctx.resume();
      return;
    }
    this._ctx = new AudioContext();
    await this._synth.init(this._ctx);
    this._initialized = true;
  }

  // ── Loading ─────────────────────────────────────────────────────────────────

  /**
   * Load a song from a File object (drag-and-drop / file input).
   * @param {File} file
   */
  async loadFromFile(file) {
    const song = await MTPParser.fromFile(file);
    this._setSong(song);
  }

  /**
   * Load a song from a URL (fetch).
   * @param {string} url
   */
  async loadFromURL(url) {
    const song = await MTPParser.fromURL(url);
    this._setSong(song);
  }

  _extractSongPrograms(song) {
    if (!song) return [];
    const programs = new Set();

    // 1. Initial channel start voices (melodic tracks 1..15)
    if (song.channelDefs) {
      for (let ch = 0; ch < 15; ch++) {
        const d = song.channelDefs[ch];
        if (d && d.startvoice > 0) {
          programs.add(Math.max(0, Math.min(127, d.startvoice - 1)));
        }
      }
    }

    // 2. All entries in the voicechange lookup table (20 entries)
    if (song.voicechange) {
      for (const v of song.voicechange) {
        if (v > 0) {
          programs.add(Math.max(0, Math.min(127, v - 1)));
        }
      }
    }

    // 3. Scan all pattern cells for voice changes and percussion
    let hasPercussion = false;
    if (song.patterns) {
      for (const pattern of song.patterns) {
        if (!pattern) continue;
        // Check music tracks 1..15 for instrument changes (225..245)
        for (let ch = 0; ch < 15; ch++) {
          const row = pattern[ch];
          if (!row) continue;
          for (let step = 0; step < 16; step++) {
            const v = row[step];
            if (v > 224 && v < 246 && song.voicechange) {
              const vcIdx = v - 225;
              const newVoice = song.voicechange[vcIdx];
              if (newVoice > 0) {
                programs.add(Math.max(0, Math.min(127, newVoice - 1)));
              }
            }
          }
        }
        // Check drum tracks 16 & 17 (index 15 & 16)
        for (let ch = 15; ch <= 16; ch++) {
          const row = pattern[ch];
          if (!row) continue;
          for (let step = 0; step < 16; step++) {
            const v = row[step];
            if (v > 0 && v < 96) hasPercussion = true;
          }
        }
      }
    }

    // 4. If percussion is used, preload program 128 (drum kit)
    if (hasPercussion && this._synth.percussionMode === 'soundfont' && !this._synth.isCurrentBankSynth) {
      programs.add(128);
    }

    return [...programs];
  }

  _setSong(song) {
    const wasPlaying = this._playing;
    if (wasPlaying) this._stopScheduler();
    this._song      = song;
    this._sequencer = new MTPSequencer(song);
    this._synth.silenceAll();

    // Pre-warm all instruments and voice changes if audio engine is already initialised
    if (this._initialized) {
      const programs = this._extractSongPrograms(song);
      this._synth.preloadPrograms(programs);
    }

    this._emit('loaded', { songname: song.songname, lastpos: song.lastpos });
  }

  // ── Transport ───────────────────────────────────────────────────────────────

  /** Start playback from the beginning (or resume if paused). */
  async play() {
    if (!this._song) throw new Error('MTPPlayer: no song loaded');
    if (this._playing) return;

    // Create / resume AudioContext here — always triggered by a direct user gesture
    await this._ensureAudioContext();

    // Kick off instrument pre-loads for all initial voices, voice changes, and percussion
    if (this._song) {
      const programs = this._extractSongPrograms(this._song);
      await this._synth.preloadPrograms(programs, (info) => this._emit('loading-progress', info));
    }

    // Wait for any in-flight instrument loads
    if (this._synth._loading.size > 0) {
      await Promise.allSettled([...this._synth._loading.values()]);
    }

    if (!this._paused) this._sequencer.reset();
    this._synth.resumeGains();
    this._playing = true;
    this._paused  = false;
    this._nextTickTime = this._ctx.currentTime;
    this._runScheduler();
    this._emit('play', { songname: this._song.songname });
  }

  /** Pause playback (notes immediately silenced). */
  pause() {
    if (!this._playing) return;
    this._stopScheduler();
    this._paused = true;
    this._synth.silenceAll();
    this._emit('pause', {});
  }

  /** Stop playback and reset position to the beginning. */
  stop() {
    this._stopScheduler();
    this._paused = false;
    this._synth.silenceAll();
    if (this._sequencer) this._sequencer.reset();
    this._emit('stop', {});
  }

  /**
   * Crossfade to a new song over `durationMs` milliseconds.
   * Loads the new file in parallel while fading out, then fades in.
   * @param {string|File} urlOrFile
   * @param {number} [durationMs=1500]
   */
  async crossfadeTo(urlOrFile, durationMs = 1500) {
    if (this._crossfading) return;
    this._crossfading = true;

    const fadeSec   = (durationMs / 2) / 1000;
    const startVol  = this._synth.getMasterVolume();

    // Fade out
    if (this._playing) {
      const now = this._ctx.currentTime;
      this._synth._masterGain.gain.setTargetAtTime(0, now, fadeSec / 3);
      await new Promise(r => setTimeout(r, durationMs / 2));
    }

    // Load new song while faded out
    try {
      if (typeof urlOrFile === 'string') await this.loadFromURL(urlOrFile);
      else                               await this.loadFromFile(urlOrFile);
    } catch (err) {
      console.error('MTPPlayer crossfadeTo: load failed', err);
      this._crossfading = false;
      return;
    }

    this._synth.setMasterVolume(0);
    this.stop();
    this.play();

    // Fade in
    const now2 = this._ctx.currentTime;
    this._synth._masterGain.gain.setTargetAtTime(startVol, now2, fadeSec / 3);
    await new Promise(r => setTimeout(r, durationMs / 2));

    this._crossfading = false;
  }

  // ── Controls ────────────────────────────────────────────────────────────────

  /** @param {number} vol  0.0–1.0 */
  setVolume(vol) {
    this._volume = Math.max(0, Math.min(1, vol));
    this._synth.setMasterVolume(this._volume);
  }

  /** @param {boolean} loop  Enable/disable song looping. */
  setLoop(loop) {
    this._loop = loop;
    if (this._song) {
      this._song.looppos = loop ? this._song._originalLooppos ?? this._song.looppos : 0;
    }
  }

  /** @param {'soundfont'|'synth'} mode */
  setPercussionMode(mode) {
    this._synth.setPercussionMode(mode);
  }

  get percussionMode() {
    return this._synth.percussionMode;
  }

  /** @param {string} bankKey */
  async setSoundfontBank(bankKey) {
    // 1. Stop current song and reset sequencer
    this.stop();

    // 2. Completely reset MIDI state and voices
    this._synth.resetGM();

    // 3. Switch bank DSP profile
    this._synth.setSoundfontBank(bankKey);

    // 4. Immediately load all instruments needed for the current song in this bank
    if (this._song && this._initialized) {
      const programs = this._extractSongPrograms(this._song);
      await this._synth.preloadPrograms(programs, (info) => this._emit('loading-progress', info));
      if (this._synth._loading.size > 0) {
        await Promise.allSettled([...this._synth._loading.values()]);
      }
    }
  }

  get soundfontBank() {
    return this._synth.soundfontBank;
  }

  /**
   * Load a custom SF2 SoundFont from a File or ArrayBuffer.
   * @param {File|ArrayBuffer} fileOrBuffer
   * @param {string} [name]
   */
  async loadSF2(fileOrBuffer, name) {
    await this._ensureAudioContext();
    const filename = name || (fileOrBuffer.name ? fileOrBuffer.name.replace(/\.sf2$/i, '') : 'Custom SF2');
    const buffer = fileOrBuffer instanceof ArrayBuffer ? fileOrBuffer : await fileOrBuffer.arrayBuffer();
    await this._synth.loadCustomSF2(buffer, filename);
    this._emit('sf2-loaded', { name: filename, bankKey: 'custom_sf2' });
  }

  // ── Event system ─────────────────────────────────────────────────────────────

  /**
   * Register an event listener with a simplified callback signature.
   * Events: 'loaded', 'play', 'pause', 'stop', 'step', 'songend'
   * @param {string}   event
   * @param {Function} handler  Called with event.detail
   * @returns {this}
   */
  on(event, handler) {
    this.addEventListener(event, e => handler(e.detail ?? e));
    return this;
  }

  // ── Getters ─────────────────────────────────────────────────────────────────

  get isPlaying()       { return this._playing; }
  get isPaused()        { return this._paused; }
  get songName()        { return this._song?.songname ?? ''; }
  get currentPosition() { return this._sequencer?.number ?? 0; }
  get lastPosition()    { return this._song?.lastpos ?? 0; }
  get audioContext()    { return this._ctx; }

  // ── Look-ahead scheduler ─────────────────────────────────────────────────────

  _runScheduler() {
    if (!this._playing) return;

    // Buffer at least 1 full pattern (16 steps) ahead into Web Audio
    const patternDurationSec = (16 * (this._sequencer?.stepIntervalMs ?? 160)) / 1000;
    const lookaheadSec = Math.max(patternDurationSec, this._lookahead);

    while (this._nextTickTime < this._ctx.currentTime + lookaheadSec) {
      const tickResult = this._sequencer.tick();
      const { events, position, step, track, ended } = tickResult;
      const tickTime = this._nextTickTime;

      if (ended) {
        this.stop();
        this._emit('songend', {});
        return;
      }

      for (const ev of events) this._dispatchMIDI(ev, tickTime);

      // Synchronize UI event with actual Web Audio playback time
      const delayMs = Math.max(0, (tickTime - this._ctx.currentTime) * 1000);
      const timerId = setTimeout(() => {
        this._pendingStepTimers?.delete(timerId);
        if (!this._playing) return;
        this._emit('step', { position, step, track, events });
      }, delayMs);
      if (!this._pendingStepTimers) this._pendingStepTimers = new Set();
      this._pendingStepTimers.add(timerId);

      // Advance by current step interval (may change mid-song via speed events)
      this._nextTickTime += this._sequencer.stepIntervalMs / 1000;

      // Safety guard against runaway ticks if interval is tiny
      if (this._nextTickTime <= this._ctx.currentTime) {
        this._nextTickTime = this._ctx.currentTime + 0.01;
      }
    }

    this._scheduleTimer = setTimeout(() => this._runScheduler(), this._scheduleInterval);
  }

  _stopScheduler() {
    this._playing = false;
    if (this._scheduleTimer) {
      clearTimeout(this._scheduleTimer);
      this._scheduleTimer = null;
    }
    if (this._pendingStepTimers) {
      for (const t of this._pendingStepTimers) clearTimeout(t);
      this._pendingStepTimers.clear();
    }
  }

  _dispatchMIDI(ev, time) {
    switch (ev.type) {
      case 'noteOn':
        this._synth.noteOn(ev.channel, ev.note, ev.velocity, time);
        break;
      case 'noteOff':
        this._synth.noteOff(ev.channel, ev.note, time);
        break;
      case 'programChange':
        this._synth.programChange(ev.channel, ev.program);
        break;
      case 'cc':
        this._synth.controlChange(ev.channel, ev.cc, ev.value, time);
        break;
    }
  }

  _emit(type, detail) {
    const ev  = new Event(type);
    ev.detail = detail;
    this.dispatchEvent(ev);
  }
}
