# Pony Poll — Roadmap

Ideas and planned features that are not yet implemented.

---

## GitHub-hosted music library

Allow admins to select music tracks per phase (Lobby / Question / Win) directly from Settings, without repackaging the Splunk app.

### How it would work

**Repo structure**

```
music/
  manifest.json          ← track list with metadata and raw GitHub URLs
  lobby/
    8bit-bossa.mp3       ← current bundled default
    retro-lounge.mp3
    …
  question/
    along-the-way.ogg
    chiptune-drive.mp3
    …
  win/
    win-music-1-3.mp3
    fanfare.mp3
    …
```

**`manifest.json` format**

```json
{
  "lobby": [
    {
      "id": "8bit-bossa",
      "label": "8bit Bossa",
      "author": "Joth",
      "license": "CC0",
      "url": "https://raw.githubusercontent.com/bautt/ponypollApp/main/music/lobby/8bit-bossa.mp3"
    }
  ],
  "question": [ … ],
  "win": [ … ]
}
```

**Settings UI**

- Fetch manifest from GitHub (same pattern as Quiz Library)
- Show a card/dropdown selector per phase
- Selection saved to `ponypoll_config` KV Store → applies to all participants on that Splunk instance immediately

**`audio.js` change**

- Read track URL from KV Store config instead of hardcoded `/static/app/ponypollapp/audio/…`
- Fall back to the bundled local file if no custom selection is stored

**Advantages**

- No Splunk app repackaging or reinstall to change music
- Admin picks tracks in Settings, takes effect immediately for everyone
- Tracks stream directly from GitHub raw URLs (serves `Access-Control-Allow-Origin: *` — no CORS issues)

**Caveats**

- Requires internet access from the participant's browser to `raw.githubusercontent.com`
- Not suitable for air-gapped Splunk deployments (bundled fallback still works offline)
- Larger files (3+ MB) take a moment to buffer on first play

**Estimated effort:** ~half a day (manifest, Settings picker UI, KV Store config keys, `audio.js` URL resolver)
