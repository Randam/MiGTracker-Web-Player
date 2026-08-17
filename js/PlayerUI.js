/**
 * PlayerUI — Standalone player UI controller.
 *
 * Wires the DOM (index.html) to MTPPlayer. Handles:
 *   - File drag-and-drop and file picker
 *   - Transport controls (Play / Pause / Stop / Loop checkbox)
 *   - Volume slider
 *   - Pattern grid visualizer (updated on every 'step' event)
 *   - Channel mute toggles + VU meters
 *   - Status bar updates
 *   - Loading overlay
 *
 * CSS class naming follows the BEM conventions in css/style.css.
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
    // Initialise loop state on MTPPlayer when it's ready
    this.player.on('loaded', () => this.player.setLoop(loopCb.checked));

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

  // ── Pattern grid ─────────────────────────────────────────────────────────────

  // ── Pattern grid ─────────────────────────────────────────────────────────────

  _buildGrid() {
    const grid = this._$('pattern-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const inner = document.createElement('div');
    inner.className = 'pattern-grid__inner';

    // Header row: empty corner cell + step numbers 01–16
    const corner = document.createElement('div');
    corner.className = 'ch-label';
    inner.appendChild(corner);

    for (let st = 1; st <= 16; st++) {
      const cell = document.createElement('div');
      cell.className   = 'pattern-grid__step-num';
      cell.id          = `step-hdr-${st - 1}`;
      cell.textContent = String(st).padStart(2, '0');
      inner.appendChild(cell);
    }

    // Data rows: 15 music channels + 2 drum channels
    const labels = [
      ...Array.from({ length: 15 }, (_, i) => ({ text: `C${String(i + 1).padStart(2, '0')}`, drum: false })),
      { text: 'DR1', drum: true },
      { text: 'DR2', drum: true },
    ];

    for (let ch = 0; ch < 17; ch++) {
      const label = document.createElement('div');
      label.className   = `ch-label${labels[ch].drum ? ' ch-label--drum' : ''}`;
      label.id          = `ch-label-${ch}`;
      label.textContent = labels[ch].text;
      inner.appendChild(label);

      for (let st = 0; st < 16; st++) {
        const cell = document.createElement('div');
        cell.className = `grid-cell${ch >= 15 ? ' drum' : ''}`;
        cell.id        = `cell-${ch}-${st}`;
        cell.setAttribute('role', 'gridcell');
        cell.textContent = '·';
        inner.appendChild(cell);
      }
    }

    grid.appendChild(inner);
  }

  _updateGrid(pattern, activeStepIdx) {
    if (!pattern) return;

    for (let ch = 0; ch < 17; ch++) {
      const row = pattern[ch];
      for (let st = 0; st < 16; st++) {
        const cell = this._$(`cell-${ch}-${st}`);
        if (!cell) continue;

        const val = row?.[st] ?? 0;

        // Reset classes (keep base + drum)
        cell.className = `grid-cell${ch >= 15 ? ' drum' : ''}`;

        // Active column highlight
        if (st === activeStepIdx) cell.classList.add('active-col');

        // Content classification
        const hasNote = val > 0 && val < 97;
        const hasCmd  = val >= 97;

        if (hasNote) cell.classList.add('has-note');
        if (hasCmd)  cell.classList.add('has-cmd');

        // Flash animation on active step with content
        if (st === activeStepIdx && (hasNote || hasCmd)) cell.classList.add('active');

        // Readable cell content
        if      (val === 0)                cell.textContent = '·';
        else if (val === 96)               cell.textContent = '══';
        else if (val < 96)                 cell.textContent = String(val).padStart(2, '0');
        else if (val < 161)                cell.textContent = `V${val - 97}`;
        else if (val < 171)                cell.textContent = `M${val - 161}`;
        else if (val < 181)                cell.textContent = `P${val - 171}`;
        else if (val < 191)                cell.textContent = `S${val - 181}`;
        else if (val >= 225 && val < 246)  cell.textContent = `I${val - 225}`;
        else if (val >= 192 && val < 225)  cell.textContent = `T${val - 192}`;
        else                               cell.textContent = '??';
      }
    }

    // Update step-header active column highlight
    for (let st = 0; st < 16; st++) {
      this._$(`step-hdr-${st}`)?.classList.toggle('active-col', st === activeStepIdx);
    }
  }

  // ── VU meters ─────────────────────────────────────────────────────────────

  _startVU() {
    if (this._vuTimer) return;
    this._vuTimer = setInterval(() => this._tickVU(), 50);
  }

  _stopVU() {
    clearInterval(this._vuTimer);
    this._vuTimer = null;
  }

  _tickVU() {
    for (let ch = 1; ch <= 17; ch++) {
      if (this.vuLevels[ch] > 0) this.vuLevels[ch] = Math.max(0, this.vuLevels[ch] - 0.07);
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
      if (this._$('status-step'))  this._$('status-step').textContent  = `STEP:01/16`;
      if (this._$('status-speed')) this._$('status-speed').textContent = `SPD:${song.startspeed}`;
      if (this._$('status-track')) this._$('status-track').textContent = `PAT:${String(song.positions[0]).padStart(2, '0')}`;
    }
  }

  _onStep({ position, step, track, events }) {
    const song    = this.player._song;
    const stepIdx = step - 1; // 0-based step index (0..15)

    // Update pattern grid
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
    if (this._$('status-step'))  this._$('status-step').textContent  = `STEP:${String(step).padStart(2, '0')}/16`;
    if (this._$('status-speed')) this._$('status-speed').textContent = `SPD:${this.player._sequencer?.speed ?? '?'}`;
    if (this._$('status-track')) this._$('status-track').textContent = `PAT:${String(track).padStart(2, '0')}`;

    // VU meter hit on note events
    for (const ev of events) {
      if (ev.type === 'noteOn') {
        const trackerCh = ev.channel === 9 ? 16 : (ev.channel < 9 ? ev.channel + 1 : ev.channel);
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

    if (state !== 'playing') this._stopVU();
    else                     this._startVU();
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
  _onStop()  { this.player.stop(); }

  // ── Channel mute panel ───────────────────────────────────────────────────

  _buildMutePanel() {
    const panel = this._$('channel-panel');
    if (!panel) return;
    panel.innerHTML = '';

    const labels = [
      ...Array.from({ length: 15 }, (_, i) => `C${String(i+1).padStart(2,'0')}`),
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
      btn.className   = 'mute-btn';
      btn.textContent = labels[ch - 1];
      btn.id          = `mute-${ch}`;
      btn.setAttribute('aria-pressed', 'false');
      btn.addEventListener('click', () => {
        this.muted[ch] = !this.muted[ch];
        btn.classList.toggle('is-muted', this.muted[ch]);
        btn.setAttribute('aria-pressed', String(this.muted[ch]));
      });

      // Channel label
      const lbl = document.createElement('div');
      lbl.className   = 'channel-strip__label';
      lbl.textContent = labels[ch - 1];

      strip.appendChild(vuWrap);
      strip.appendChild(btn);
      panel.appendChild(strip);
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
