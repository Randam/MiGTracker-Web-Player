/**
 * MIDISynth — Web Audio GM synthesizer using soundfont-player samples.
 *
 * Wraps the soundfont-player library (https://github.com/danigb/soundfont-player)
 * which loads pre-rendered GM audio samples from the gleitz/midi-js-soundfonts CDN
 * (FluidR3_GM — closest browser equivalent to the original SB AWE32/64 SF2 bank).
 *
 * soundfont-player can be provided in two ways:
 *   1. CDN script tag (standalone player):  <script src="soundfont-player.js">
 *      → available as window.Soundfont
 *   2. npm install soundfont-player (Vite/bundler projects like Avalon Remake):
 *      → resolved via dynamic import('soundfont-player')
 *
 * The library handles whichever is available automatically.
 */
/**
 * GM instrument names in the exact format used by gleitz/midi-js-soundfonts CDN filenames.
 * soundfont-player's nameToUrl does NOT convert numbers — we must resolve the name ourselves.
 * Index 0-127 = GM program (0-based). Index 128 = percussion stand-in.
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
  // index 128 = percussion channel stand-in
  'taiko_drum',
];

export class MIDISynth {

  constructor({ soundfontUrl = 'FluidR3_GM', soundfontFormat = 'mp3' } = {}) {
    this._soundfontUrl    = soundfontUrl;
    this._soundfontFormat = soundfontFormat;
    this._SF              = null;  // soundfont-player library reference
    this._ctx             = null;  // AudioContext
    this._masterGain      = null;  // master output gain
    this._players         = new Map();  // GM program → soundfont player instance
    this._channels        = [];         // per-channel state
    this._loading         = new Map();  // in-flight load promises (dedup)
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

    // Pre-load percussion — it's always needed
    this._preload(128).catch(() => {});
  }

  /** Try to locate the soundfont-player library. */
  async _resolveSoundfontLib() {
    // 1. CDN global (standalone player with <script> tag)
    if (typeof globalThis.Soundfont !== 'undefined') return globalThis.Soundfont;

    // 2. npm package (Vite / bundler projects)
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

  // ── Instrument loading ──────────────────────────────────────────────────────

  /**
   * Load (or return cached) instrument player for a GM program number.
   * Program 128 = GM percussion.
   */
  async _getPlayer(program) {
    if (this._players.has(program)) return this._players.get(program);
    return this._preload(program);
  }

  /** Pre-load an instrument in the background (deduplicates concurrent requests). */
  _preload(program) {
    if (!this._SF || !this._ctx) return Promise.resolve(null);
    if (this._loading.has(program)) return this._loading.get(program);
    if (this._players.has(program)) return Promise.resolve(this._players.get(program));

    // Resolve to the exact filename string gleitz CDN expects.
    // soundfont-player's nameToUrl concatenates the name directly — no number conversion.
    const name = GM_NAMES[program] ?? GM_NAMES[0];

    const promise = this._SF.instrument(this._ctx, name, {
      soundfont: this._soundfontUrl,   // 'FluidR3_GM'
      format:    this._soundfontFormat, // 'mp3'
    }).then(player => {
      this._players.set(program, player);
      this._loading.delete(program);
      return player;
    }).catch(err => {
      this._loading.delete(program);
      console.warn(`MIDISynth: could not load instrument ${program} ("${name}"):`, err.message);
      return null;
    });

    this._loading.set(program, promise);
    return promise;
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

    // Resolve instrument first — this may take time on first load
    const player = await this._getPlayer(ch.program);
    if (!player) return;

    // Compute `when` AFTER the await so we never schedule in the past
    const when = Math.max(this._ctx.currentTime + 0.005, time || 0);
    const gain = (velocity / 127) * ch.volume;

    // Stop any existing note on this pitch first
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
      case 7:   // Channel volume
        ch.volume = value / 127;
        ch.gain.gain.setTargetAtTime(ch.volume, this._ctx.currentTime, 0.01);
        break;
      case 10:  // Pan
        ch.pan = (value - 64) / 63; // −1..+1
        // Note: soundfont-player doesn't expose per-note panning via AudioNode,
        // so we apply pan as a subtle gain offset for now.
        break;
      case 1:   // Modulation — no-op for sample-based playback
        break;
      case 123: // All Notes Off
        this.silenceChannel(channel);
        break;
    }
  }

  /**
   * Change the active GM instrument on a channel.
   * Pre-loads the new instrument in the background for zero-latency playback.
   */
  programChange(channel, program) {
    const ch = this._channels[channel];
    if (!ch || channel === 9) return; // ch 9 always percussion
    if (ch.program === program) return;
    ch.program = Math.max(0, Math.min(127, program));
    this._preload(ch.program).catch(() => {});
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
    if (this._masterGain)
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
    for (const p of programs) this._preload(p).catch(() => {});
  }

  get audioContext() { return this._ctx; }
}
