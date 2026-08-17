/**
 * MTPParser — Parse MiGTracker Pro (.MTP) text files into a song object.
 *
 * MTP file format (one integer or string per line, CRLF or LF):
 *
 *   60 × 17 × 16 = 16,320 lines  pattern[p 1..60][ch 1..17][step 1..16]
 *                                 ch 1..15 = music, ch 16..17 = drums
 *   200 lines                     position[1..200]  — which pattern at each song position
 *   1 line                        looppos  (0 = no loop)
 *   1 line                        lastpos
 *   1 line                        startspeed  (1–9, higher = slower)
 *   1 line                        songname string
 *   16 × 3 = 48 lines            per-channel: startvoice, startmode (0/1), startvolume
 *   20 lines                      voicechange[1..20]  — GM instruments for mid-song switches
 *
 * Total: 16,592 lines (verified against real .MTP files)
 */
export class MTPParser {
  /**
   * Parse raw .MTP text content into a song object.
   * @param {string} text
   * @returns {MTPSong}
   */
  static parse(text) {
    const lines = text.split(/\r?\n/);
    let idx = 0;

    const read    = ()  => (lines[idx++] ?? '').trim();
    const readInt = ()  => { const v = parseInt(read(), 10); return isNaN(v) ? 0 : v; };

    // ── Pattern data: [p 0..59][ch 0..16][step 0..15] (0-based internally) ─────
    const patterns = [];
    for (let p = 0; p < 60; p++) {
      const channels = [];
      for (let ch = 0; ch < 17; ch++) {
        const steps = new Uint8Array(16);
        for (let st = 0; st < 16; st++) steps[st] = readInt();
        channels.push(steps);
      }
      patterns.push(channels);
    }

    // ── Position table [0..199] ─────────────────────────────────────────────────
    const positions = new Uint8Array(200);
    for (let i = 0; i < 200; i++) positions[i] = readInt();

    const looppos    = readInt();
    const lastpos    = readInt();
    const startspeed = readInt();
    const songname   = read();

    // ── Per-channel headers (16 channels) ───────────────────────────────────────
    const channelDefs = [];
    for (let ch = 0; ch < 16; ch++) {
      const startvoice  = readInt();
      const startmode   = readInt() === 1; // 1 = legato mode
      const startvolume = readInt();
      channelDefs.push({ startvoice, startmode, startvolume });
    }

    // ── Voice-change table (20 entries) ─────────────────────────────────────────
    const voicechange = new Uint8Array(20);
    for (let i = 0; i < 20; i++) voicechange[i] = readInt();

    return { patterns, positions, looppos, lastpos, startspeed, songname, channelDefs, voicechange };
  }

  /** Parse from a browser File object (drag-and-drop). */
  static async fromFile(file) {
    const text = await file.text();
    return MTPParser.parse(text);
  }

  /** Parse from a URL (fetch — for bundled assets in Avalon Remake etc.). */
  static async fromURL(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`MTPParser: failed to fetch "${url}" (HTTP ${res.status})`);
    const text = await res.text();
    return MTPParser.parse(text);
  }
}
