/**
 * PonyPoll audio manager.
 *
 * Tracks (background music):
 *   lobby    — 8bit Bossa (setup / waiting screen)
 *   question — Along the Way (countdown / answering)
 *   win      — Win Music 1-3 (done / results)
 *
 * Sound effects (Web Audio API, no files needed):
 *   click   — short high blip when selecting an answer option
 *   submit  — two ascending tones when submitting an answer
 *   timeout — three descending square pulses when time runs out
 *
 * Two independent preferences stored in localStorage (both default on):
 *   ponypoll_music — background music tracks
 *   ponypoll_sfx   — UI sound effects
 */

const BASE = '/static/app/ponypollapp/audio/';

const TRACKS = {
    lobby:    { src: `${BASE}lobby.mp3`,    loop: true  },
    question: { src: `${BASE}question.ogg`, loop: true  },
    win:      { src: `${BASE}win.mp3`,      loop: false },
};

const KEY_MUSIC = 'ponypoll_music';
const KEY_SFX   = 'ponypoll_sfx';
const DEFAULT_VOLUME = 0.35;

let current     = null;   // { audio: HTMLAudioElement, name: string }
let lastTrack   = null;   // track name last requested (even while muted)

// ── Music preference ──────────────────────────────────────────────────────────

export function isMusicEnabled() {
    return localStorage.getItem(KEY_MUSIC) !== 'off';
}

export function setMusicEnabled(enabled) {
    localStorage.setItem(KEY_MUSIC, enabled ? 'on' : 'off');
    if (!enabled) {
        stopMusic();
    } else if (lastTrack) {
        // Re-enable: restart the track that was playing (or last requested)
        current = null;   // force playTrack to treat it as a new request
        playTrack(lastTrack);
    }
}

// ── SFX preference ────────────────────────────────────────────────────────────

export function isSfxEnabled() {
    return localStorage.getItem(KEY_SFX) !== 'off';
}

export function setSfxEnabled(enabled) {
    localStorage.setItem(KEY_SFX, enabled ? 'on' : 'off');
}

export function playTrack(name) {
    lastTrack = name;                     // remember even when muted
    if (!isMusicEnabled()) return;
    if (current?.name === name) return;   // already playing this track

    _stop(false);   // hard stop previous without fade

    const def = TRACKS[name];
    if (!def) return;

    const audio = new Audio(def.src);
    audio.loop   = def.loop;
    audio.volume = DEFAULT_VOLUME;
    current = { audio, name };

    const p = audio.play();
    if (p) {
        p.catch(() => {
            // Autoplay blocked — retry on the next user gesture
            const retry = () => {
                if (current?.audio === audio) audio.play().catch(() => {});
                window.removeEventListener('click',   retry);
                window.removeEventListener('keydown', retry);
                window.removeEventListener('touchend', retry);
            };
            window.addEventListener('click',    retry, { once: true });
            window.addEventListener('keydown',  retry, { once: true });
            window.addEventListener('touchend', retry, { once: true });
        });
    }
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
    // Resume if suspended (browser autoplay policy)
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
    // Short high-pitched blip: 880 Hz, 70 ms, sine wave
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
    // Two ascending tones: 660 Hz → 990 Hz, feels like a "locked in" confirm
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
    // Three descending square-wave pulses — classic "time's up" alarm feel
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
