# Pony Poll — Music Track Catalogue

This folder is the live music catalogue for Pony Poll. Each track listed in [`manifest.json`](manifest.json) becomes selectable in **Settings → Music tracks → 🔄 GitHub** on any installation with outbound HTTPS to `raw.githubusercontent.com`.

Music plays in three slots during a quiz:

| Slot | When it plays | Loop |
|---|---|---|
| **Lobby** | Setup / start screen / waiting for participants | yes |
| **Question** | While participants are answering / countdown running | yes |
| **Win** | Score screen at the end of a quiz | no |

Each browser stores its own per-slot selection in `localStorage` — there is no shared "house default", so participants and the host can pick freely without affecting each other.

---

## Bundled vs GitHub-only

| Track | File | Recommended slot | Bundled with app | Available via 🔄 GitHub |
|---|---|---|---|---|
| 8-bit Bossa (Joth, CC0) | `lobby.mp3` | lobby | ✅ | ✅ |
| Along the Way (congusbongus, CC0) | `question.ogg` | question | ✅ | ✅ |
| Win Music #1 (remaxim, CC0) | `win.mp3` | win | ✅ | ✅ |
| Neonpunkte (Henri Mak, CC0) | `henri-mak/neonpunkte.mp3` | lobby | — | ✅ |
| Neonquiz (Henri Mak, CC0) | `henri-mak/neonquiz.mp3` | question | — | ✅ |
| Leiser Münzregen (Henri Mak, CC0) | `henri-mak/leiser-muenzregen.mp3` | lobby | — | ✅ |

> **Bundled** tracks ship inside the `ponypollapp` tarball and work on air-gapped Splunk instances. **GitHub-only** tracks need outbound HTTPS to `raw.githubusercontent.com`.

The catalogue is intentionally small — extending it is a pull request, see below.

---

## Manifest schema

Each entry in `manifest.json` is a flat object:

```json
{
  "id": "lowercase-id",
  "name": "Display name",
  "file": "subfolder/filename.mp3",
  "loop": true,
  "duration_sec": 120,
  "recommended_slot": "lobby",
  "author": "Artist name",
  "license": "CC0",
  "source": "https://opengameart.org/...",
  "bundled": false
}
```

| Field | Type | Rule |
|---|---|---|
| `id` | string | `^[a-z0-9_-]{1,40}$`. Stored in browser `localStorage` to remember the user's choice. Must be unique across the catalogue. |
| `name` | string | Shown in the Settings dropdown. Keep it short. |
| `file` | string | Path within this folder. Must match `^[a-zA-Z0-9_/-]+\.(mp3\|ogg\|wav)$` — no `..`, no leading `/`. |
| `loop` | boolean | `true` for lobby/question tracks, `false` for win/fanfare tracks. |
| `duration_sec` | number | Approximate length in seconds. Optional but recommended. |
| `recommended_slot` | enum | `lobby` / `question` / `win`. Drives the "Recommended" group in the dropdown for that slot — users can still pick the track in any slot. |
| `author` | string | Required for crediting. |
| `license` | string | Free-form (`CC0`, `CC-BY 4.0`, `CC-BY-SA 3.0`, …). Use the exact licence string from the source page. |
| `source` | string | Original URL. Must be `https://`. |
| `bundled` | boolean | `true` only for entries also present in `src/package/appserver/static/audio/`. |

Any entry that fails validation (regex mismatch, missing field, suspicious file path) is silently dropped from the merged catalogue with a `console.warn` — a malformed PR will not break Settings.

---

## How to add a track

1. **Check the licence.** Only CC0 / public-domain / CC-BY work — no "free for personal use" tracks. Tag the licence exactly as shown on the source page.
2. **Choose a subfolder.** Group thematically: `retro/`, `cinematic/`, `chiptune/`, `ambient/`, etc. Keep flat files (`lobby.mp3`, `question.ogg`, `win.mp3`) reserved for the bundled defaults.
3. **Compress.** Aim for `< 5 MB` per track. MP3 (160–192 kbps) or OGG Vorbis (Q4–Q6) is fine. Trim silence.
4. **Drop the file** under `audio/<subfolder>/<filename>.<ext>`.
5. **Add an entry** to `manifest.json` (keep entries grouped by `recommended_slot`).
6. **Open a PR.** Once merged, the track is live for every install via 🔄 GitHub — no app rebuild needed.

---

## Bandwidth

Tracks are streamed from `raw.githubusercontent.com` on first play and cached by the browser (`max-age=300`). After the first play, repeat playbacks are local. There is no Pony Poll backend caching — each browser fetches independently.

If you maintain an air-gapped Splunk install, the three bundled tracks are always available. To add more offline tracks, drop them into `src/package/appserver/static/audio/` and add entries to the **bundled** manifest at `src/package/appserver/static/audio/manifest.json`. They will ship in the next tarball.
