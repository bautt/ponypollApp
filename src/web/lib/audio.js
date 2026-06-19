/**
 * PonyPoll audio manager.
 *
 * Three music slots, each driven by a track entry resolved at play time via
 * lib/audio-catalogue.js:
 *   lobby    — setup / waiting screen   (loop)
 *   question — countdown / answering    (loop)
 *   win      — done / results           (one-shot)
 *
 * The per-slot track selection is stored per-browser in localStorage:
 *   ponypoll_track_lobby     = "<track id>"   (default: "default-lobby")
 *   ponypoll_track_question  = "<track id>"   (default: "default-question")
 *   ponypoll_track_win       = "<track id>"   (default: "default-win")
 *
 * Two on/off preferences (independent of track choice, both default on):
 *   ponypoll_music — background music (default: OFF — users opt in)
 *   ponypoll_sfx   — UI sound effects (default: ON, Web Audio API)
 *
 * SFX are synthesised — no files involved.
 */

import {
    SLOTS, DEFAULT_IDS, loadBundledManifest, loadMergedManifest, trackUrl,
} from './audio-catalogue';

const KEY_MUSIC = 'ponypoll_music';
const KEY_SFX   = 'ponypoll_sfx';
const KEY_TRACK = (slot) => `ponypoll_track_${slot}`;

const DEFAULT_VOLUME = 0.35;

// Hard-coded fallback URLs for the bundled defaults, used if the manifest
// cannot be loaded for any reason (e.g. missing file on disk). Mirrors the
// previous behaviour so audio never silently breaks.
const FALLBACK = {
    lobby:    { src: '/static/app/ponypollapp/audio/lobby.mp3',    loop: true  },
    question: { src: '/static/app/ponypollapp/audio/question.ogg', loop: true  },
    win:      { src: '/static/app/ponypollapp/audio/win.mp3',      loop: false },
};

let current     = null;   // { audio: HTMLAudioElement, slot: string }
let lastSlot    = null;   // slot last requested (even while muted)

// Lazy-loaded catalogue cache. We load the bundled manifest on first use, and
// optionally swap in a merged bundled+GitHub view when Settings asks us to.
let _catalogue = null;
let _catalogueLoading = null;

async function _ensureCatalogue() {
    if (_catalogue) return _catalogue;
    if (!_catalogueLoading) {
        _catalogueLoading = loadBundledManifest()
            .then((tracks) => { _catalogue = tracks; return tracks; })
            .catch(() => { _catalogue = []; return []; });
    }
    return _catalogueLoading;
}

/** Allow the Settings page to push the merged (bundled+GitHub) catalogue
 *  so user-selected GitHub tracks resolve correctly without a hard reload. */
export async function refreshCatalogue({ includeGitHub = false, forceRefresh = false } = {}) {
    try {
        const { tracks } = await loadMergedManifest({ includeGitHub, forceRefresh });
        _catalogue = tracks;
        _catalogueLoading = Promise.resolve(tracks);
        return tracks;
    } catch (_) {
        return _catalogue || [];
    }
}

// ── Music preference ──────────────────────────────────────────────────────────

export function isMusicEnabled() {
    // Default OFF — participants opt in. Workshops are often run in shared
    // rooms where unsolicited background music is disruptive. Once a user
    // explicitly clicks the Music toggle on, setMusicEnabled() writes 'on'
    // and the preference sticks across sessions for that browser.
    return localStorage.getItem(KEY_MUSIC) === 'on';
}

export function setMusicEnabled(enabled) {
    localStorage.setItem(KEY_MUSIC, enabled ? 'on' : 'off');
    if (!enabled) {
        stopMusic();
    } else if (lastSlot) {
        current = null;       // force playTrack to treat as a new request
        playTrack(lastSlot);
    }
}

// ── SFX preference ────────────────────────────────────────────────────────────

export function isSfxEnabled() {
    return localStorage.getItem(KEY_SFX) !== 'off';
}

export function setSfxEnabled(enabled) {
    localStorage.setItem(KEY_SFX, enabled ? 'on' : 'off');
}

// ── Per-slot track selection ──────────────────────────────────────────────────

export function getSelectedTrackId(slot) {
    if (!SLOTS.includes(slot)) return null;
    return localStorage.getItem(KEY_TRACK(slot)) || DEFAULT_IDS[slot];
}

export function setSelectedTrackId(slot, trackId) {
    if (!SLOTS.includes(slot)) return;
    if (trackId) {
        localStorage.setItem(KEY_TRACK(slot), trackId);
    } else {
        localStorage.removeItem(KEY_TRACK(slot));
    }
    // If this slot is currently playing, hot-swap to the new track.
    if (current?.slot === slot) {
        current = null;
        playTrack(slot);
    }
}

// ── Playback ──────────────────────────────────────────────────────────────────

async function _resolveSlot(slot) {
    const tracks = await _ensureCatalogue();
    const wantedId = getSelectedTrackId(slot);
    let entry = tracks.find(t => t.id === wantedId);
    if (!entry) {
        // Selected id no longer in catalogue — fall back to default id.
        entry = tracks.find(t => t.id === DEFAULT_IDS[slot]);
    }
    if (entry) {
        const src = trackUrl(entry);
        if (src) return { src, loop: entry.loop };
    }
    return FALLBACK[slot] || null;
}

export function playTrack(slot) {
    lastSlot = slot;
    if (!isMusicEnabled()) return;
    if (current?.slot === slot) return;   // already playing this slot

    _stop(false);

    // Resolve the URL asynchronously, but capture the requested slot so a later
    // playTrack call can pre-empt this one even before it starts.
    const requested = slot;
    _resolveSlot(slot).then((def) => {
        if (!def) return;
        if (lastSlot !== requested && current?.slot !== requested) {
            // A newer request came in while we were resolving — ignore this one.
            if (lastSlot !== requested) return;
        }
        if (!isMusicEnabled()) return;

        const audio = new Audio(def.src);
        audio.loop   = def.loop;
        audio.volume = DEFAULT_VOLUME;
        current = { audio, slot: requested };

        const p = audio.play();
        if (p) {
            p.catch(() => {
                // Autoplay blocked — retry on the next user gesture
                const retry = () => {
                    if (current?.audio === audio) audio.play().catch(() => {});
                    window.removeEventListener('click',    retry);
                    window.removeEventListener('keydown',  retry);
                    window.removeEventListener('touchend', retry);
                };
                window.addEventListener('click',    retry, { once: true });
                window.addEventListener('keydown',  retry, { once: true });
                window.addEventListener('touchend', retry, { once: true });
            });
        }
    });
}

export function stopMusic() {
    _stop(false);
}

export function fadeOutAndStop(duration = 800) {
    if (!current) return;
    const { audio } = current;
    current = null;
    _fade(audio, duration);
}

function _stop(fade) {
    if (!current) return;
    const { audio } = current;
    current = null;
    if (fade) { _fade(audio, 600); } else { audio.pause(); }
}

// ── Sound effects (synthesised via Web Audio API) ─────────────────────────────

let _ctx = null;
function _audioCtx() {
    if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (_ctx.state === 'suspended') _ctx.resume().catch(() => {});
    return _ctx;
}

/**
 * Play a synthesised sound effect.
 * @param {'click'|'submit'|'timeout'} name
 */
export function playSfx(name) {
    if (!isSfxEnabled()) return;
    try {
        const ctx = _audioCtx();
        if (name === 'click')   _sfxClick(ctx);
        if (name === 'submit')  _sfxSubmit(ctx);
        if (name === 'timeout') _sfxTimeout(ctx);
    } catch (_) { /* ignore in environments without Web Audio */ }
}

function _sfxClick(ctx) {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.07);
}

function _sfxSubmit(ctx) {
    const now = ctx.currentTime;
    [[660, 0, 0.09], [990, 0.1, 0.13]].forEach(([freq, delay, end]) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + delay);
        gain.gain.setValueAtTime(0.2, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + end);
        osc.start(now + delay);
        osc.stop(now + end);
    });
}

function _sfxTimeout(ctx) {
    const now = ctx.currentTime;
    [[440, 0], [330, 0.18], [220, 0.36]].forEach(([freq, delay]) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now + delay);
        gain.gain.setValueAtTime(0.12, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.14);
        osc.start(now + delay);
        osc.stop(now + delay + 0.15);
    });
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function _fade(audio, duration) {
    const steps    = 16;
    const stepTime = duration / steps;
    const startVol = audio.volume;
    let step = 0;
    const id = setInterval(() => {
        step++;
        audio.volume = Math.max(0, startVol * (1 - step / steps));
        if (step >= steps) { clearInterval(id); audio.pause(); }
    }, stepTime);
}
