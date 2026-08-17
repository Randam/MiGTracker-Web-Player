# MiGTracker Web Player

Browser-based replayer for **MiGTracker Pro** `.MTP` music files.  
Built as a reusable ES Module library (`mtp-player`) that works both as a standalone player and as an embedded music engine in other web projects.

## Quick Start (Standalone Player)

Open `index.html` in a local web server (required for ES module `import`):

```bash
npx serve .
# or
python3 -m http.server
```

Then drag and drop any `.MTP` file onto the player.

## Library Usage

### In any ES Module project

```js
import { MTPPlayer } from './mtp-player/index.js';

const player = new MTPPlayer();
await player.init();            // creates AudioContext, loads soundfont engine
await player.loadFromURL('/music/AVALON1.MTP');
player.play();

player.on('step', ({ position, step }) => {
  console.log(`Playing position ${position}, step ${step}`);
});
```

### In a Vite / npm project (e.g. Avalon Remake)

1. Add to `package.json`:
   ```json
   "dependencies": {
     "mtp-player": "file:../MiGTrakcer-Web-Player/mtp-player",
     "soundfont-player": "^0.12.0"
   }
   ```
2. Run `npm install`
3. Import and use:
   ```js
   import { MTPPlayer } from 'mtp-player';
   const music = new MTPPlayer();
   await music.init();
   await music.crossfadeTo('/music/AVALON1.MTP', 1500);
   ```

## API Reference

### `new MTPPlayer(options?)`

| Option | Default | Description |
|---|---|---|
| `soundfontUrl` | `'FluidR3_GM'` | Soundfont bank name |
| `soundfontFormat` | `'mp3'` | Audio format (`'mp3'` or `'ogg'`) |
| `lookahead` | `0.12` | Scheduler look-ahead in seconds |
| `scheduleInterval` | `50` | Scheduler tick interval in ms |

### Methods

| Method | Description |
|---|---|
| `init(audioCtx?)` | Initialise audio engine |
| `loadFromFile(file)` | Load song from a `File` object |
| `loadFromURL(url)` | Load song from a URL |
| `play()` | Start / resume playback |
| `pause()` | Pause playback |
| `stop()` | Stop and reset to beginning |
| `crossfadeTo(urlOrFile, durationMs?)` | Smooth crossfade to a new song |
| `setVolume(0..1)` | Set master volume |
| `setLoop(boolean)` | Enable / disable looping |

### Events

| Event | Detail | Description |
|---|---|---|
| `'loaded'` | `{ songname, lastpos }` | Song parsed and instruments pre-loading |
| `'play'` | `{ songname }` | Playback started |
| `'pause'` | `{}` | Playback paused |
| `'stop'` | `{}` | Playback stopped |
| `'step'` | `{ position, step, track, events }` | Fired on each sequencer step |
| `'songend'` | `{}` | Song reached end (no loop) |

## MTP File Format

See [docs/implementation_plan.md](docs/implementation_plan.md) for the full format specification.

## How It Works

The `.MTP` format is a plain-text file with one integer/string per line.  
`MTPParser` reads it into a structured song object.  
`MTPSequencer` is a direct JavaScript port of `PLAYMTP.PAS` — the original DOS interrupt-driven player — using a Web Audio look-ahead scheduler instead of a timer interrupt.  
`MIDISynth` wraps `soundfont-player` to render GM audio using pre-sampled FluidR3 soundfont data via the Web Audio API.

## Files

```
mtp-player/          # Shared library (import this in your project)
  index.js           # MTPPlayer — public API
  MTPParser.js       # .MTP text file parser
  MTPSequencer.js    # Step sequencer (port of PLAYMTP.PAS)
  MIDISynth.js       # Web Audio GM synthesizer
  package.json       # Library descriptor

js/
  PlayerUI.js        # Standalone player UI controller

css/
  style.css          # Retro tracker UI styles

docs/
  implementation_plan.md
  README.md          # This file
```

## Credits

- **MiGTracker Pro** — created by Jeroen Derwort, 1996–1997
- **soundfont-player** — by danigb (MIT)
- **FluidR3_GM soundfont samples** — via gleitz/midi-js-soundfonts (MIT)
