/**
 * MTPSequencer — Port of PLAYMTP.PAS PlayNextStep() + Afspeler() interrupt logic.
 *
 * Pattern byte-code semantics (per cell in pattern[p][ch][step]):
 *
 *   Music channels (ch 1–15):
 *     0          — rest / empty
 *     1–95       — note on;  MIDI note = value + 12 + plusvalue
 *     96         — note off (also silences if !mode)
 *     97–160     — set channel volume:  volume[ch] = value − 97  (0–63)
 *     161–170    — set modulation CC#1: (value − 161) * 14
 *     171–180    — set pan       CC#10: (value − 171) * 14
 *     181–190    — set speed:    speed = value − 181  (0–9)
 *     191        — end-of-pattern marker (read from step+1 to terminate early)
 *     192–208    — transpose down: plusvalue = −(value − 192)
 *     209–224    — transpose up:   plusvalue = value − 209
 *     225–245    — program change: use voicechange[value − 225]
 *
 *   Drum channels (ch 16–17):
 *     1–95       — noteOn  on MIDI ch 9 with this note number
 *     96–111     — set drum volume: volume[16] = value − 96
 *
 * MIDI channel mapping (0-indexed):
 *   tracker ch 1–9  → MIDI ch 0–8
 *   tracker ch 10–15 → MIDI ch 10–15   (ch 9 = percussion is skipped for melody)
 *   drum tracks     → MIDI ch 9
 *
 * Timing: DOS timer fired at ~18.2 Hz.  A step advances every (10 − speed) ticks.
 *   stepIntervalMs = (10 − speed) / 18.2 * 1000
 */
export class MTPSequencer extends EventTarget {
  constructor(song) {
    super();
    this.song = song;
    this._reset();
  }

  // ── State reset ──────────────────────────────────────────────────────────────

  _reset() {
    const s = this.song;
    this.speed        = s.startspeed;
    this.number       = 1;   // current song position  (1-based, follows position[])
    this.step         = 1;   // current step within pattern (1-based, 1..16)
    this.plusvalue    = 0;   // global song transpose semitones (affects all melodic channels)
    this.endofpattern = false;

    // Per-channel state arrays — index 1..15 for music, 16 for drums
    this.volume  = new Uint8Array(17); // [1..16]
    this.voice   = new Uint8Array(16); // [1..15] current GM instrument (1-indexed, 0=unset)
    this.mode    = new Array(16).fill(false); // [1..15] legato flag
    this.notehis = new Uint8Array(16); // [1..15] last MIDI note played per channel

    for (let ch = 1; ch <= 15; ch++) {
      const def = s.channelDefs[ch - 1];
      this.voice[ch]  = def.startvoice;
      this.volume[ch] = def.startvolume;
      this.mode[ch]   = def.startmode;
    }
    this.volume[16] = 15; // default drum volume
    this._firstTick = true;
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  /**
   * Advance one step and return an array of MIDI event objects for that step.
   * Call this repeatedly on a look-ahead timer (see MTPPlayer).
   * @returns {{ events: Array<MIDIEvent>, position: number, step: number, track: number, ended: boolean }}
   */
  tick() {
    // Handle loop / song end
    if (this.number > this.song.lastpos) {
      if (this.song.looppos > 0) {
        this.number = this.song.looppos;
        this.plusvalue = 0;
      } else {
        this._dispatchEvent('songend', {});
        return { events: [], position: this.number, step: this.step, track: 0, ended: true };
      }
    }
    if (this.number > 200) this.number = 1;

    const currentPos  = this.number;
    const currentStep = this.step;
    const trackNum    = this.song.positions[currentPos - 1]; // 1-based pattern index
    const events      = this._playNextStep(trackNum, currentStep);

    // On very first tick, prepend program-change and baseline CC7 events for all channels
    if (this._firstTick) {
      this._firstTick = false;
      const inits = [];
      for (let ch = 1; ch <= 15; ch++) {
        const midiCh = this._midiCh(ch);
        if (this.voice[ch] > 0) {
          inits.push({ type: 'programChange', channel: midiCh, program: this.voice[ch] - 1 });
        }
        inits.push({ type: 'cc', channel: midiCh, cc: 7, value: 127 });
        inits.push({ type: 'cc', channel: midiCh, cc: 91, value: 32 }); // Subtle natural reverb
      }
      inits.push({ type: 'cc', channel: 9, cc: 7, value: 127 });
      inits.push({ type: 'cc', channel: 9, cc: 91, value: 24 });
      events.unshift(...inits);
    }

    this.step++;
    if (this.endofpattern || this.step > 16) {
      this.step = 1;
      this.number++;
      if (this.number > this.song.lastpos && this.song.looppos > 0) {
        this.number = this.song.looppos;
      }
      this.endofpattern = false;
    }

    return { events, position: currentPos, step: currentStep, track: trackNum, ended: false };
  }

  /** Step duration in milliseconds based on current speed. */
  get stepIntervalMs() {
    return Math.max(10, (10 - this.speed) * (1000 / 18.2));
  }

  reset() {
    this._reset();
  }

  // ── Internal ─────────────────────────────────────────────────────────────────

  /** Map tracker channel (1-based) to 0-indexed MIDI channel. */
  _midiCh(t1) {
    return t1 < 10 ? t1 - 1 : t1;
  }

  /**
   * Scale tracker channel volume (0..63) to MIDI velocity (0..127).
   * Tracker volume 0 = 0 (rest), 63 = 127.
   */
  _trackerVolToMIDI(vol) {
    if (vol <= 0) return 0;
    return Math.min(127, Math.max(1, Math.round(vol * 2.016)));
  }

  /**
   * Scale tracker drum volume (0..15) to MIDI velocity (0..127).
   * Tracker drum volume 0 = 0, 15 = 127.
   */
  _trackerDrumVolToMIDI(vol) {
    if (vol <= 0) return 0;
    return Math.min(127, Math.max(1, Math.round(vol * 8.46)));
  }

  _dispatchEvent(type, detail) {
    const ev = new Event(type);
    ev.detail = detail;
    this.dispatchEvent(ev);
  }

  /**
   * Port of PlayNextStep() from PLAYMTP.PAS.
   * Reads the step data for all channels and returns MIDI event descriptors.
   */
  _playNextStep(trackNum, step) {
    const pattern = this.song.patterns[trackNum - 1]; // 0-based array
    if (!pattern) return [];

    const events  = [];
    const si      = step - 1; // 0-based step index

    // ── Drum channels (tracker ch 16 and 17) ────────────────────────────────
    let lastDrumNote = -1;
    for (let t1 = 16; t1 <= 17; t1++) {
      const row = pattern[t1 - 1];
      if (!row) continue;
      const v = row[si] ?? 0;
      if (v > 0 && v < 96) {
        // Prevent phase-cancelling/metallic double-triggering if both DR1 and DR2 have the same note on the same step
        if (v !== lastDrumNote) {
          const drumVelocity = this._trackerDrumVolToMIDI(this.volume[16]);
          events.push({ type: 'noteOn', channel: 9, trackerCh: t1, note: v, velocity: drumVelocity });
          lastDrumNote = v;
        }
      }
      if (v > 95 && v < 112) this.volume[16] = v - 96;
    }

    // ── Music channels — pass 1: parameters, controllers & transpose ─────────
    this.endofpattern = false;
    for (let t1 = 1; t1 <= 15; t1++) {
      const row    = pattern[t1 - 1];
      if (!row) continue;
      const v      = row[si] ?? 0;
      const midiCh = this._midiCh(t1);

      // Speed (181..190)
      if (v > 180 && v < 191) {
        this.speed = v - 181;
        events.push({ type: 'speed', speed: this.speed });
      }

      // End-of-pattern: the NEXT step (si+1) contains 191
      if (si + 1 < 16 && (row[si + 1] ?? 0) === 191) this.endofpattern = true;

      // Global Transpose down (192..208)
      if (v > 191 && v < 209) this.plusvalue = -(v - 192);

      // Global Transpose up (209..224)
      if (v > 208 && v < 225) this.plusvalue = v - 209;

      // Volume (97..160 = volume 0..63)
      if (v > 96 && v < 161) {
        this.volume[t1] = v - 97;
      }

      // Modulation CC#1 (161..170)
      if (v > 160 && v < 171)
        events.push({ type: 'cc', channel: midiCh, cc: 1, value: (v - 161) * 14 });

      // Pan CC#10 (171..180 — labeled "chorus" in MiGTracker Pro UI)
      if (v > 170 && v < 181)
        events.push({ type: 'cc', channel: midiCh, cc: 10, value: (v - 171) * 14 });

      // Program change via voicechange table (225..245)
      if (v > 224 && v < 246) {
        const vcIdx = v - 225;
        if (vcIdx < this.song.voicechange.length) {
          const newVoice = this.song.voicechange[vcIdx];
          if (newVoice > 0 && newVoice !== this.voice[t1]) {
            this.voice[t1] = newVoice;
            events.push({ type: 'programChange', channel: midiCh, program: newVoice - 1 });
          }
        }
      }
    }

    // ── Music channels — pass 2: notes ──────────────────────────────────────
    for (let t1 = 1; t1 <= 15; t1++) {
      const row    = pattern[t1 - 1];
      if (!row) continue;
      const v      = row[si] ?? 0;
      const midiCh = this._midiCh(t1);

      // Note events (0 < v < 97 covers notes 1–95 and note-off 96)
      if (v > 0 && v < 97) {
        if (this.mode[t1] || v === 96) {
          // Legato mode or explicit note-off → send NoteOff for previous note
          if (this.notehis[t1] > 0)
            events.push({ type: 'noteOff', channel: midiCh, note: this.notehis[t1], velocity: 127 });
        }
        if (!this.mode[t1] && v === 96) {
          // Non-legato explicit off → all-notes-off on channel
          events.push({ type: 'cc', channel: midiCh, cc: 123, value: 0 });
        }
        if (v < 96) {
          // Note on: reset modulation first (per original)
          events.push({ type: 'cc', channel: midiCh, cc: 1, value: 0 });
          const midiNote = Math.max(0, Math.min(127, v + 12 + this.plusvalue));
          const velocity = this._trackerVolToMIDI(this.volume[t1]);
          events.push({ type: 'noteOn', channel: midiCh, trackerCh: t1, note: midiNote, velocity });
          this.notehis[t1] = midiNote;
        }
      }
    }

    return events;
  }
}
