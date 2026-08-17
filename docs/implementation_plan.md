# MiGTracker Web Player — Implementation Plan

A **library-first** browser replayer for `.MTP` files produced by **MiGTracker Pro** (DOS, 1996–1997).
The core engine is a standalone ES Module package (`mtp-player`) that parses the MTP text format, ports the sequencer logic from `PLAYMTP.PAS`, and drives a General MIDI software synthesizer via Web Audio API.

The same library is consumed by two separate surfaces:
1. **Standalone web player** (`MiGTrakcer-Web-Player` repo) — a drag-and-drop player UI with tracker visualization
2. **Avalon Remake** (`Avalon Remake` repo) — embedded background music, triggered per area via the existing `onAreaChange` hook

---

## Background

### MTP File Format (text / ASCII)

Each `.MTP` file is a plain-text file with one integer or string per line:

| Section | Lines | Description |
|---|---|---|
| Pattern data | 60 × 17 × 16 = **16,320** lines | `pattern[1..60][1..17][1..16]` — 15 music tracks + 2 drum tracks, 16 steps per pattern |
| Position table | **200** lines | `position[1..200]` — which pattern plays at each song position |
| `looppos` | 1 | Loop-back position (0 = no loop) |
| `lastpos` | 1 | Last active position |
| `startspeed` | 1 | Initial tempo (1–9, inverted: higher = slower) |
| `songname` | 1 | String (≤ 70 chars) |
| Per-channel header | 15 × 3 = **45** lines | For each of 15 channels: `startvoice`, `startmode` (1/0), `startvolume` |
| Voice-change table | **20** lines | `voicechange[1..20]` — GM instrument numbers for mid-song program changes |

**Total: ~16,592 lines** (confirmed by examining `AVALON1.MTP`).

### Byte-code semantics (from `PLAYMTP.PAS` / `MTPUNIT.PAS`)

Each cell in `pattern[track][channel][step]` is a single byte value whose meaning is determined by range:

| Value range | Channel | Meaning |
|---|---|---|
| 0 | Any | Rest / empty |
| 1–95 | Music (1–15) | Note-on; MIDI note = `value + 12 + plusvalue` |
| 96 | Music (1–15) | Note-off / silence |
| 1–95 | Drum (16–17) | `SetNoteOn(ch9, value, volume[16]*8)` |
| 96–111 | Drum (16–17) | Set drum volume: `volume[16] = value − 96` |
| 97–160 | Music (1–15) | Set channel volume: `volume[t] = value − 97` |
| 161–170 | Music (1–15) | Set modulation (CC#1): `(value−161)*14` |
| 171–180 | Music (1–15) | Set panning (CC#10, labelled "chorus"): `(value−171)*14` |
| 181–190 | Music (1–15) | Set speed: `speed = value − 181` |
| 191 | Music (1–15) | End of pattern marker |
| 192–208 | Music (1–15) | Transpose down: `plusvalue = -(value−192)` |
| 209–224 | Music (1–15) | Transpose up: `plusvalue = value−209` |
| 225–245 | Music (1–15) | Program change: use `voicechange[value−225]` |

**MIDI channel mapping:** tracks 1–9 map to MIDI channels 0–8, tracks 10–15 map to MIDI channels 10–15 (i.e. track < 10 → channel = track − 1, else channel = track). Channel 9 (0-indexed) = GM percussion.

**Tempo:** The original uses the DOS timer tick counter (`Ptr($40,$6C)`) at ~18.2 Hz. The step advances when `time + (10 - speed)` ticks have elapsed. This gives approx:
- `speed=1` → ~1 step per ~0.5 s
- `speed=9` → ~1 step per ~0.055 s  

Mapping: `stepIntervalMs ≈ (10 - speed) * (1000 / 18.2)`

---

## Architecture

### Library layer — `mtp-player` (shared core)

```
 mtp-player/
 ├── MTPParser.js        Parse .MTP text → song object
 ├── MTPSequencer.js     Step-tick engine, MIDI event emitter
 ├── MIDISynth.js        soundfont-player wrapper, Web Audio
 └── index.js            Public API: MTPPlayer class
```

The `MTPPlayer` class is the single public API surface:

```js
// Standalone player (MiGTrakcer-Web-Player)
import { MTPPlayer } from 'mtp-player';
const player = new MTPPlayer();
await player.init();
await player.loadFromFile(fileInputFile);   // File object from <input>
player.play();
player.stop();
player.on('step', ({ position, step, channels }) => { /* visualizer */ });

// Avalon Remake — one-liner integration
import { MTPPlayer } from '../../mtp-player/index.js';
const music = new MTPPlayer();
await music.init();
await music.loadFromURL('/music/AVALON1.MTP');

// In GameEngine.onAreaLoaded:
const AREA_MUSIC = {
  village: '/music/AVALON1.MTP',
  forest:  '/music/AVALON6.MTP',
  cave:    '/music/CAMELOT.MTP',
  // ...
};
async onAreaLoaded(newArea) {
  const track = AREA_MUSIC[newArea];
  if (track) await music.crossfadeTo(track, 1500);
}
```

### Consumption diagram

```
┌─────────────────────────────────┐    ┌──────────────────────────────┐
│   MiGTrakcer-Web-Player repo    │    │     Avalon Remake repo       │
│                                 │    │                              │
│  index.html + css/style.css     │    │  GameEngine.onAreaLoaded()   │
│  ↓  imports                     │    │  ↓  imports                  │
│  js/PlayerUI.js  (drag&drop,    │    │  MTPPlayer (via relative     │
│  visualizer, transport)         │    │  path or npm link)           │
│  ↓  uses                        │    │  ↓  uses                     │
└──────────┬──────────────────────┘    └─────────────┬────────────────┘
           │                                         │
           └──────────────┬──────────────────────────┘
                          ↓
            ┌─────────────────────────┐
            │   mtp-player/ (shared)  │
            │   MTPPlayer             │
            │   MTPParser             │
            │   MTPSequencer          │
            │   MIDISynth             │
            └─────────────────────────┘
```

### Key technology choices

| Concern | Choice | Rationale |
|---|---|---|
| MIDI synthesis | **[soundfont-player](https://github.com/danigb/soundfont-player)** | Pre-rendered GM SF2 audio samples; pure Web Audio API; no server, no binary deps |
| Soundfont source | **[gleitz/midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts)** (CDN) | FluidR3 GM; 128 instruments + percussion |
| Timing | Web Audio look-ahead scheduler (`AudioContext.currentTime`) | Drift-free, works even when tab is backgrounded |
| Module format | **ES Module** (`export class MTPPlayer`) | Native import in Vite projects; no bundler required for the web player itself |
| Package sharing | Relative path import or `npm link` | Both repos are local; no npm publish needed during development |
| File loading | `loadFromFile(File)` + `loadFromURL(url)` | Covers both standalone (drag-and-drop) and Avalon (bundled assets) use cases |
| Styling | Vanilla CSS | Retro tracker aesthetic for standalone player |

> [!NOTE]
> The user asked for "Soundblaster Soundfont compatible music." The SB AWE32/64 uses SF2-format General MIDI soundfonts. In the browser the best equivalent is **soundfont-player** which loads pre-rendered MP3/OGG audio samples derived from the same FluidR3 GM soundfont bank — indistinguishable in practice from a hardware SF2 player.

---

## Open Questions

> [!IMPORTANT]
> **SF2 playback approach:** Two options exist:
> 1. **soundfont-player (CDN samples)** — loads per-instrument audio from a CDN. Simple, great quality, requires internet on first load (can be cached). Recommended.
> 2. **WebMidi API → physical MIDI device** — sends real MIDI messages to a hardware GM synth connected to the PC. Requires `navigator.requestMIDIAccess()` permission and a MIDI device.
>
> Do you want (1) software synthesis in the browser, (2) hardware MIDI output, or (3) both with a toggle?

> [!IMPORTANT]
> **Soundfont bank:** Should we use **FluidR3** (classic, widely used) or **MuseScore General** (higher quality)? FluidR3 is the default. MuseScore General is larger but closer to an AWE64 soundfont in character.

> [!NOTE]
> **Offline support (critical for Avalon Remake):** The Avalon Remake is built with Vite and served with all assets bundled. Soundfont samples can be downloaded once and committed to `public/soundfont/` in the Avalon Remake repo, making music fully offline. The standalone player can use the CDN. Should both share the same offline-bundled approach, or keep them separate?

> [!NOTE]
> **Area → MTP mapping for Avalon:** There are 33 areas and 25 MTP files in the `songs/` folder. Should we create a `music_map.json` config file that maps each area key (`village`, `forest`, `cave`, …) to an MTP filename? Or should the area music be hardcoded in `GameEngine`?

---

## Proposed Changes

### `MiGTrakcer-Web-Player` repo — Shared library

---

#### [NEW] [`mtp-player/index.js`](file:///Users/jeroenderwort/Documents/GitHub/MiGTrakcer-Web-Player/mtp-player/index.js)

Public API barrel. Exports the `MTPPlayer` class with this surface:

```js
class MTPPlayer extends EventEmitter {
  async init(audioContext?)           // create or accept shared AudioContext
  async loadFromFile(file: File)      // for standalone drag-and-drop
  async loadFromURL(url: string)      // for Avalon Remake bundled assets
  play()
  stop()
  pause()
  async crossfadeTo(urlOrFile, durationMs)  // smooth area music transition
  setVolume(0..1)
  setLoop(boolean)
  get isPlaying(): boolean
  get currentPosition(): number       // song position index
  get songName(): string
  on('step', cb)                      // fires each sequencer tick (for visualizer)
  on('songend', cb)
}
```

---

#### [NEW] [`mtp-player/package.json`](file:///Users/jeroenderwort/Documents/GitHub/MiGTrakcer-Web-Player/mtp-player/package.json)

Minimal package descriptor so Avalon Remake can reference it via `"mtp-player": "file:../MiGTrakcer-Web-Player/mtp-player"` in its `package.json`.

---

### Standalone player UI

---

#### [NEW] [`index.html`](file:///Users/jeroenderwort/Documents/GitHub/MiGTrakcer-Web-Player/index.html)

Main application shell. Contains:
- File drop zone / file input for `.MTP` files
- Transport controls: Play, Stop, Loop toggle
- Song info display: name, speed, position counter
- Pattern visualizer (scrolling grid showing current pattern + channel highlights)
- Volume/channel mute controls per channel (16 channels)
- Retro tracker-style UI (dark theme, monospace font, VU meters)

---

#### [NEW] [`mtp-player/MTPParser.js`](file:///Users/jeroenderwort/Documents/GitHub/MiGTrakcer-Web-Player/mtp-player/MTPParser.js)

Parses a raw MTP text file (read as string via `FileReader`) into a structured song object:

```js
{
  patterns: Uint8Array[60][17][16],  // [patternIdx][channelIdx][stepIdx]
  positions: Uint8Array[200],
  looppos: number,
  lastpos: number,
  startspeed: number,
  songname: string,
  channels: [{startvoice, startmode, startvolume}] × 15,
  voicechange: Uint8Array[20]
}
```

Validation: file line count check, value range checking with user-visible error messages.

---

#### [NEW] [`mtp-player/MTPSequencer.js`](file:///Users/jeroenderwort/Documents/GitHub/MiGTrakcer-Web-Player/mtp-player/MTPSequencer.js)

A direct JavaScript port of the `PlayNextStep` + `Afspeler` interrupt logic from `PLAYMTP.PAS`:

- Maintains state: `step`, `number` (position), `speed`, `plusvalue`, `volume[]`, `voice[]`, `mode[]`, `notehis[]`
- Uses `AudioContext.currentTime`-based scheduling (look-ahead scheduler pattern) rather than `setInterval` for drift-free timing
- Emits MIDI-like events to `MIDISynth`:
  - `noteOn(channel, midiNote, velocity)`
  - `noteOff(channel, midiNote)`
  - `programChange(channel, instrument)`
  - `controlChange(channel, cc, value)`
- Handles all byte-code events: volume, modulation, panning, transpose, program change, end-of-pattern, looping

---

#### [NEW] [`mtp-player/MIDISynth.js`](file:///Users/jeroenderwort/Documents/GitHub/MiGTrakcer-Web-Player/mtp-player/MIDISynth.js)

Wraps **soundfont-player** (loaded from CDN) to provide:
- `init(audioCtx)` — preloads all 128 GM instruments + GM percussion
- `noteOn(channel, note, velocity, time)` — schedules note playback at Web Audio time
- `noteOff(channel, note, time)`
- `programChange(channel, instrument)` — switches active soundfont for channel
- `controlChange(channel, cc, value)` — handles CC#1 (modulation), CC#10 (pan), CC#123 (all notes off)
- Per-channel gain nodes for volume control
- Percussion channel (ch 9) hardwired to GM drum kit

---

#### [NEW] [`js/PlayerUI.js`](file:///Users/jeroenderwort/Documents/GitHub/MiGTrakcer-Web-Player/js/PlayerUI.js)

Standalone player UI glue — imports `MTPPlayer` and wires it to the DOM. Handles drag-and-drop, transport button events, and updates the pattern visualizer on `'step'` events.

---

#### [NEW] [`css/style.css`](file:///Users/jeroenderwort/Documents/GitHub/MiGTrakcer-Web-Player/css/style.css)

Retro-tracker aesthetic:
- Dark background (#0d0d0d), phosphor green/amber accent palette
- Monospace font (IBM Plex Mono or Courier)
- Channel grid pattern display with scrolling highlight
- Animated VU meters, blinking cursor, scanline texture
- Responsive layout (desktop-first, collapses gracefully on mobile)

---

### `Avalon Remake` repo — Integration

---

#### [MODIFY] [`package.json`](file:///Users/jeroenderwort/Documents/GitHub/Avalon%20Remake/package.json)

Add `"mtp-player": "file:../MiGTrakcer-Web-Player/mtp-player"` to `dependencies`. Works with `npm install` and Vite's module resolution without any extra config.

---

#### [MODIFY] [`src/game/GameEngine.js`](file:///Users/jeroenderwort/Documents/GitHub/Avalon%20Remake/src/game/GameEngine.js)

Add `MTPPlayer` import and wire music to the existing `onAreaLoaded(newArea)` method (line 221) and game lifecycle:
- `start()` → `music.init()` then play area 1 track
- `onAreaLoaded(newArea)` → `music.crossfadeTo(AREA_MUSIC[newArea], 1500)` if track defined
- `stop()` → `music.stop()`
- Battle start/end → `music.setVolume(0.3)` / `music.setVolume(1.0)` (duck during battle)

---

#### [NEW] [`public/music/`](file:///Users/jeroenderwort/Documents/GitHub/Avalon%20Remake/public/music/)

Copy of the relevant `.MTP` files from `MiGTracker-Pro/songs/` (symlink or copy). Served as static assets by Vite.

---

## Verification Plan

### Standalone Player
- Parse all 25 `.MTP` files from `MiGTracker-Pro/songs/` without errors
- Verify line count: each MTP must produce exactly `60×17×16 + 200 + 1 + 1 + 1 + 1 + 15×3 + 20 = 16,589` data lines
- Load `AVALON1.MTP` → song name shows "Masters of Intelligence and Greatness - Jer Der 1997"
- Press Play → music starts; channel indicators light up in sync with step position
- Song loops back at the correct loop position
- Stop and replay resets state cleanly
- Test `CAMELOT.MTP` and `YS3.MTP` for correct instrument assignments and drum patterns
- Compare subjectively against the DOS player running in DOSBox

### Avalon Remake Integration
- `npm install` in Avalon Remake resolves `mtp-player` from the local path with no errors
- Village loads → AVALON1 (or mapped track) begins playing
- Walking into the Forest triggers a 1.5s crossfade to the forest track
- Entering a battle ducks the volume; returning to overworld restores it
- Reloading a save game restarts the correct area's track
