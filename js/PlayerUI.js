/**
 * PlayerUI — Standalone player UI controller.
 *
 * Classic vertical tracker interface:
 *   - Columns: STEP #, CH01 .. CH15, DR1, DR2
 *   - Rows: Step 00 .. Step 15 (plays top-to-bottom)
 *   - Formatted notes: C-4, D#3, v63, I01, etc.
 *   - Fits full screen without page scrolling
 */

import { MTPPlayer } from '../mtp-player/index.js';

// ── GM instrument names (0-based = GM program number) ─────────────────────────
const GM_NAMES = [
  'Grand Piano','Bright Piano','Electric Grand','Honky-Tonk','E.Piano 1','E.Piano 2',
  'Harpsichord','Clavi','Celesta','Glockenspiel','Music Box','Vibraphone','Marimba',
  'Xylophone','Tubular Bell','Santur','Organ 1','Organ 2','Organ 3','Church Organ',
  'Reed Organ','Accordion','Harmonica','Bandneon','Nylon Guitar','Steel Guitar',
  'Jazz Guitar','Clean Guitar','Muted Guitar','Overdrive Guitar','Dist. Guitar',
  'Guitar Harm.','Acoustic Bass','Fingered Bass','Picked Bass','Fretless Bass',
  'Slap Bass 1','Slap Bass 2','Synth Bass 1','Synth Bass 2','Violin','Viola','Cello',
  'Contrabass','Tremolo Str.','Pizzicato Str.','Harp','Timpani','Strings',
  'Slow Strings','Synth Str. 1','Synth Str. 2','Choir','Voice Oohs','SynVox',
  'Orchestra Hit','Trumpet','Trombone','Tuba','Muted Trumpet','French Horn','Brass',
  'Synth Brass 1','Synth Brass 2','Soprano Sax','Alto Sax','Tenor Sax','Bari Sax',
  'Oboe','English Horn','Bassoon','Clarinet','Piccolo','Flute','Recorder','Pan Flute',
  'Bottle Blow','Shakuhachi','Whistle','Ocarina','Square Wave','Saw Wave',
  'Synth Calliope','Chiffer Lead','Charang','Solo Vox','5th Saw Wave','Bass & Lead',
  'Fantasia','Warm Pad','PolySynth','Space Voice','Bowed Glass','Metal Pad',
  'Halo Pad','Sweep Pad','Ice Rain','Soundtrack','Crystal','Atmosphere','Brightness',
  'Goblin','Echo Drops','Star Theme','Sitar','Banjo','Shamisen','Koto','Kalimba',
  'Bag Pipe','Fiddle','Shanai','Tinkle Bell','Agogo','Steel Drums','Woodblock',
  'Taiko','Melodic Tom','Synth Drum','Reversed Cymbal','Guitar Fret Noise',
  'Breath Noise','Seashore','Bird','Telephone','Helicopter','Applause','Gun Shot',
];

const NOTE_NAMES = ['C-', 'C#', 'D-', 'D#', 'E-', 'F-', 'F#', 'G-', 'G#', 'A-', 'A#', 'B-'];

/**
 * Format an MTP cell value into a 3-character tracker string.
 * @param {number} val  0..255
 * @param {number} ch   0..16
 */
function formatCell(val, ch) {
  if (val === 0) return '···';
  if (val === 96) return '===';

  // Music channel notes: 1..95 (MIDI note = val + 12)
  if (ch < 15 && val > 0 && val < 96) {
    const midi = val + 12;
    const name = NOTE_NAMES[midi % 12];
    const octave = Math.floor(midi / 12) - 1;
    return `${name}${Math.max(0, octave)}`;
  }

  // Drum channel notes: 1..95
  if (ch >= 15 && val > 0 && val < 96) {
    const midi = val;
    const name = NOTE_NAMES[midi % 12];
    const octave = Math.floor(midi / 12) - 1;
    return `${name}${Math.max(0, octave)}`;
  }

  // Drum volume: 96..111
  if (ch >= 15 && val >= 96 && val <= 111) {
    return `v${String(val - 96).padStart(2, '0')}`;
  }

  // Music volume: 97..160
  if (val >= 97 && val <= 160) {
    return `v${String(val - 97).padStart(2, '0')}`;
  }

  // Modulation: 161..170
  if (val >= 161 && val <= 170) {
    return `M${String(val - 161).padStart(2, '0')}`;
  }

  // Pan: 171..180
  if (val >= 171 && val <= 180) {
    return `P${String(val - 171).padStart(2, '0')}`;
  }

  // Speed: 181..190
  if (val >= 181 && val <= 190) {
    return `S${String(val - 181).padStart(2, '0')}`;
  }

  // End of pattern: 191
  if (val === 191) return 'END';

  // Transpose: 192..224
  if (val >= 192 && val < 209) {
    return `-${String(val - 192).padStart(2, '0')}`;
  }
  if (val >= 209 && val <= 224) {
    return `+${String(val - 209).padStart(2, '0')}`;
  }

  // Program change (instrument): 225..245
  if (val >= 225 && val <= 245) {
    return `I${String(val - 225).padStart(2, '0')}`;
  }

  return '???';
}

export class PlayerUI {
  constructor() {
    this.player   = new MTPPlayer();
    this.muted    = new Array(18).fill(false); // index 1–17
    this.vuLevels = new Float32Array(18);      // index 1–17, decay-based VU
    this._vuTimer = null;

    this._bindDOM();
    this._buildGrid();
  }

  // ── DOM helpers ──────────────────────────────────────────────────────────────

  _$ = id => document.getElementById(id);

  // ── DOM binding ──────────────────────────────────────────────────────────────

  _bindDOM() {
    // Transport buttons
    this._$('btn-play' ).addEventListener('click', () => this._onPlay());
    this._$('btn-pause').addEventListener('click', () => this._onPause());
    this._$('btn-stop' ).addEventListener('click', () => this._onStop());

    // Loop checkbox
    const loopCb = this._$('btn-loop');
    loopCb.addEventListener('change', () => {
      this.player.setLoop(loopCb.checked);
      const loopLabel = this._$('status-loop');
      if (loopLabel) loopLabel.textContent = loopCb.checked ? 'LOOP:ON' : 'LOOP:OFF';
      loopLabel?.classList.toggle('is-active', loopCb.checked);
    });
    this.player.on('loaded', () => this.player.setLoop(loopCb.checked));

    // Drum Mode toggle button
    const drumBtn = this._$('btn-drum-mode');
    if (drumBtn) {
      drumBtn.addEventListener('click', () => {
        const nextMode = this.player.percussionMode === 'soundfont' ? 'synth' : 'soundfont';
        this.player.setPercussionMode(nextMode);
        drumBtn.textContent = nextMode === 'soundfont' ? '🥁 DRUMS: SF2' : '🥁 DRUMS: SYNTH';
        drumBtn.classList.toggle('is-active', nextMode === 'soundfont');
      });
    }

    // SoundFont Bank select
    const sfSelect = this._$('soundfont-select');
    if (sfSelect) {
      sfSelect.addEventListener('change', async e => {
        await this.player.setSoundfontBank(e.target.value);
      });
    }

    // Volume slider
    this._$('vol-slider').addEventListener('input', e => {
      this.player.setVolume(e.target.value / 100);
      this._$('vol-display').textContent = e.target.value + '%';
    });

    // File input
    const fileInput = this._$('file-input');
    fileInput.addEventListener('change', e => {
      if (e.target.files[0]) this._loadFile(e.target.files[0]);
    });

    // Drop zone
    const dropZone = this._$('drop-zone');
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') fileInput.click(); });
    dropZone.addEventListener('dragover', e => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      const file = e.dataTransfer?.files?.[0];
      if (file && /\.mtp$/i.test(file.name)) this._loadFile(file);
    });

    // Player events
    this.player.on('loaded',  d  => this._onLoaded(d));
    this.player.on('step',    d  => this._onStep(d));
    this.player.on('play',    () => this._setTransportState('playing'));
    this.player.on('pause',   () => this._setTransportState('paused'));
    this.player.on('stop',    () => this._setTransportState('stopped'));
    this.player.on('songend', () => this._setTransportState('stopped'));
  }

  // ── Vertical Pattern Grid (Columns = Channels, Rows = Steps 00..15) ──────────

  _buildGrid() {
    const grid = this._$('pattern-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const inner = document.createElement('div');
    inner.className = 'pattern-grid__inner';

    const channelLabels = [
      ...Array.from({ length: 15 }, (_, i) => ({ text: `C${String(i + 1).padStart(2, '0')}`, drum: false })),
      { text: 'DR1', drum: true },
      { text: 'DR2', drum: true },
    ];

    // ── Row 0: Column Header [STEP] [C01] ... [C15] [DR1] [DR2] ──
    const stepHdr = document.createElement('div');
    stepHdr.className = 'ch-label ch-label--step';
    stepHdr.textContent = 'ST';
    inner.appendChild(stepHdr);

    for (let ch = 0; ch < 17; ch++) {
      const trackerCh = ch + 1;
      const isMuted = !!this.muted[trackerCh];
      const lbl = document.createElement('div');
      lbl.className   = `ch-label${channelLabels[ch].drum ? ' ch-label--drum' : ''}${isMuted ? ' is-muted' : ''}`;
      lbl.id          = `col-hdr-${ch}`;
      lbl.textContent = channelLabels[ch].text;
      lbl.title       = `Channel ${channelLabels[ch].text} (Click to toggle mute)`;
      lbl.setAttribute('role', 'button');
      lbl.setAttribute('aria-pressed', String(isMuted));
      lbl.addEventListener('click', () => this._toggleMute(trackerCh));
      inner.appendChild(lbl);
    }

    // ── Rows 1..16: Steps 00..15 top-to-bottom ──
    for (let st = 0; st < 16; st++) {
      // Step number label at left of row
      const stepLbl = document.createElement('div');
      stepLbl.className   = 'step-label';
      stepLbl.id          = `step-lbl-${st}`;
      stepLbl.textContent = String(st).padStart(2, '0');
      inner.appendChild(stepLbl);

      // 17 channel cells for this step
      for (let ch = 0; ch < 17; ch++) {
        const cell = document.createElement('div');
        cell.className   = `grid-cell${ch >= 15 ? ' drum' : ''}`;
        cell.id          = `cell-${ch}-${st}`;
        cell.textContent = '···';
        inner.appendChild(cell);
      }
    }

    grid.appendChild(inner);
  }

  _updateGrid(pattern, activeStepIdx) {
    if (!pattern) return;

    for (let st = 0; st < 16; st++) {
      const isStepActive = (st === activeStepIdx);
      const stepLbl = this._$(`step-lbl-${st}`);
      if (stepLbl) stepLbl.classList.toggle('active-step', isStepActive);

      for (let ch = 0; ch < 17; ch++) {
        const cell = this._$(`cell-${ch}-${st}`);
        if (!cell) continue;

        const val = pattern[ch]?.[st] ?? 0;

        // Reset classes
        cell.className = `grid-cell${ch >= 15 ? ' drum' : ''}`;

        if (isStepActive) {
          cell.classList.add('active-step-row');
        }

        const hasNote = val > 0 && val < 96;
        const hasCmd  = val >= 96;

        if (hasNote) cell.classList.add('has-note');
        if (hasCmd)  cell.classList.add('has-cmd');

        cell.textContent = formatCell(val, ch);
      }
    }
  }

  // ── VU meters ─────────────────────────────────────────────────────────────

  _startVU() {
    if (this._vuTimer) return;
    this._vuTimer = setInterval(() => this._tickVU(), 40);
  }

  _stopVU() {
    clearInterval(this._vuTimer);
    this._vuTimer = null;
  }

  _tickVU() {
    for (let ch = 1; ch <= 17; ch++) {
      if (this.vuLevels[ch] > 0) this.vuLevels[ch] = Math.max(0, this.vuLevels[ch] - 0.08);
      const bar = this._$(`vu-bar-${ch}`);
      if (bar) {
        const pct = (this.vuLevels[ch] * 100).toFixed(1) + '%';
        bar.style.height = pct;
        bar.classList.toggle('is-active', this.vuLevels[ch] > 0.01);
      }
    }
  }

  // ── Event handlers ────────────────────────────────────────────────────────

  async _loadFile(file) {
    this._showLoading('Parsing ' + file.name + '…');
    let failed = false;
    try {
      await this.player.loadFromFile(file);
    } catch (err) {
      failed = true;
      console.error('[MTPPlayer]', err);
      this._showError(err.message);
    }
    if (!failed) this._hideLoading();
  }

  _onLoaded({ songname, lastpos }) {
    const nameEl = this._$('song-name');
    if (nameEl) {
      nameEl.textContent = songname || '—';
      nameEl.classList.remove('song-info__value--empty');
    }
    if (this._$('song-lastpos')) this._$('song-lastpos').textContent = String(lastpos);
    if (this._$('song-looppos')) this._$('song-looppos').textContent = String(this.player._song?.looppos ?? 0);
    if (this._$('song-speed'))   this._$('song-speed').textContent   = String(this.player._song?.startspeed ?? '—');
    this._setTransportState('stopped');
    this._buildMutePanel();
    if (this._$('pos-fill')) this._$('pos-fill').style.width = '0%';

    // Immediately render initial pattern into the grid
    const song = this.player._song;
    if (song && song.positions.length > 0) {
      const patIdx = song.positions[0] - 1;
      this._updateGrid(song.patterns[patIdx], -1);
      if (this._$('status-pos'))   this._$('status-pos').textContent   = `POS:001/${String(lastpos).padStart(3, '0')}`;
      if (this._$('status-step'))  this._$('status-step').textContent  = `STEP:00/15`;
      if (this._$('status-speed')) this._$('status-speed').textContent = `SPD:${song.startspeed}`;
      if (this._$('status-track')) this._$('status-track').textContent = `PAT:${String(song.positions[0]).padStart(2, '0')}`;
    }
  }

  _onStep({ position, step, track, events }) {
    const song    = this.player._song;
    const stepIdx = step - 1; // 0..15 step index

    // Update vertical pattern grid
    if (song) {
      const patIdx = track > 0 ? track - 1 : (song.positions[position - 1] - 1);
      this._updateGrid(song.patterns[patIdx], stepIdx);
    }

    // Progress bar
    if (song && song.lastpos > 0) {
      const pct = ((position - 1) / song.lastpos * 100).toFixed(1);
      if (this._$('pos-fill')) this._$('pos-fill').style.width = pct + '%';
    }

    // Status bar
    const lastPos = this.player.lastPosition;
    if (this._$('status-pos'))   this._$('status-pos').textContent   = `POS:${String(position).padStart(3, '0')}/${String(lastPos).padStart(3, '0')}`;
    if (this._$('status-step'))  this._$('status-step').textContent  = `STEP:${String(stepIdx).padStart(2, '0')}/15`;
    if (this._$('status-speed')) this._$('status-speed').textContent = `SPD:${this.player._sequencer?.speed ?? '?'}`;
    if (this._$('status-track')) this._$('status-track').textContent = `PAT:${String(track).padStart(2, '0')}`;

    // VU meter hit on note events
    for (const ev of events) {
      if (ev.type === 'noteOn') {
        const trackerCh = ev.trackerCh || (ev.channel === 9 ? 16 : (ev.channel < 9 ? ev.channel + 1 : ev.channel));
        this.vuLevels[trackerCh] = Math.min(1, ev.velocity / 127);
      }
    }

    // Instrument name from channel 1
    const seq = this.player._sequencer;
    if (seq && this._$('status-instr')) {
      const prog = seq.voice[1] > 0 ? seq.voice[1] - 1 : 0;
      this._$('status-instr').textContent = `INSTR:${GM_NAMES[prog] ?? `#${prog}`}`;
    }
  }

  _setTransportState(state) {
    const playBtn  = this._$('btn-play');
    const pauseBtn = this._$('btn-pause');

    playBtn?.classList.toggle ('is-playing', state === 'playing');
    pauseBtn?.classList.toggle('is-paused',  state === 'paused');

    if (state !== 'playing') {
      this._stopVU();
      if (state === 'stopped') {
        const song = this.player._song;
        if (song) {
          const patIdx = song.positions[0] - 1;
          this._updateGrid(song.patterns[patIdx], -1);
        }
      }
    } else {
      this._startVU();
    }
  }

  async _onPlay()  {
    try {
      this._showLoading('Loading instruments…');
      await this.player.play();
    } catch (err) {
      this._showError(err.message);
    } finally {
      this._hideLoading();
    }
  }

  _onPause() { this.player.isPaused ? this.player.play() : this.player.pause(); }

  _onStop() {
    this.player.stop();
    this._setTransportState('stopped');
  }

  // ── Channel mute panel & VU meters ───────────────────────────────────────

  _buildMutePanel() {
    const panel = this._$('channel-panel');
    if (!panel) return;
    panel.innerHTML = '';

    const labels = [
      ...Array.from({ length: 15 }, (_, i) => `C${String(i + 1).padStart(2, '0')}`),
      'DR1', 'DR2',
    ];

    for (let ch = 1; ch <= 17; ch++) {
      const strip = document.createElement('div');
      strip.className = 'channel-strip';

      // VU meter
      const vuWrap = document.createElement('div');
      vuWrap.className = 'vu-meter';
      const vuBar = document.createElement('div');
      vuBar.className = 'vu-meter__bar';
      vuBar.id        = `vu-bar-${ch}`;
      vuWrap.appendChild(vuBar);

      // Mute button
      const btn = document.createElement('button');
      btn.className   = `mute-btn${this.muted[ch] ? ' is-muted' : ''}`;
      btn.textContent = labels[ch - 1];
      btn.id          = `mute-${ch}`;
      btn.setAttribute('aria-pressed', String(!!this.muted[ch]));
      btn.addEventListener('click', () => this._toggleMute(ch));

      strip.appendChild(vuWrap);
      strip.appendChild(btn);
      panel.appendChild(strip);
    }
  }

  _toggleMute(trackerCh) {
    this.muted[trackerCh] = !this.muted[trackerCh];
    const isMuted = !!this.muted[trackerCh];
    const chIdx = trackerCh - 1;

    // Update bottom mute button
    const btn = this._$(`mute-${trackerCh}`);
    if (btn) {
      btn.classList.toggle('is-muted', isMuted);
      btn.setAttribute('aria-pressed', String(isMuted));
    }

    // Update top column header in pattern grid
    const hdr = this._$(`col-hdr-${chIdx}`);
    if (hdr) {
      hdr.classList.toggle('is-muted', isMuted);
      hdr.setAttribute('aria-pressed', String(isMuted));
    }

    // Dim/undim all cells in this grid column
    for (let st = 0; st < 16; st++) {
      const cell = this._$(`cell-${chIdx}-${st}`);
      cell?.classList.toggle('is-muted-col', isMuted);
    }

    // Mute/unmute corresponding MIDI channel in synth
    if (this.player._synth) {
      const midiCh = trackerCh > 15 ? 9 : (trackerCh <= 9 ? trackerCh - 1 : trackerCh);
      if (isMuted) {
        this.player._synth.silenceChannel(midiCh);
        this.player._synth.controlChange(midiCh, 7, 0);
      } else {
        const origVol = this.player._sequencer?.volume?.[trackerCh] ?? 64;
        this.player._synth.controlChange(midiCh, 7, Math.min(127, origVol * 2));
      }
    }
  }

  // ── Loading overlay ───────────────────────────────────────────────────────

  _showLoading(msg) {
    this._$('loading-overlay')?.classList.add('is-visible');
    const t = this._$('loading-text');
    if (t) t.textContent = msg;
  }

  _hideLoading() {
    this._$('loading-overlay')?.classList.remove('is-visible');
  }

  _showError(msg) {
    this._showLoading(`⚠ ${msg}`);
    setTimeout(() => this._hideLoading(), 5000);
  }
}

// ── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  window.mtpUI = new PlayerUI();
});
