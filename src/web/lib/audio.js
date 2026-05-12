/**
 * PonyPoll audio manager.
 *
 * Tracks:
 *   lobby    — 8bit Bossa (setup / waiting screen)
 *   question — Along the Way (countdown / answering)
 *   win      — Win Music 1-3 (done / results)
 *
 * Music enabled preference is stored in localStorage so it persists
 * per browser without needing a Splunk round-trip.
 */

const BASE = '/static/app/ponypollapp/audio/';

const TRACKS = {
    lobby:    { src: `${BASE}lobby.mp3`,    loop: true  },
    question: { src: `${BASE}question.ogg`, loop: true  },
    win:      { src: `${BASE}win.mp3`,      loop: false },
};

const STORAGE_KEY = 'ponypoll_music';
const DEFAULT_VOLUME = 0.35;

let current = null;   // { audio: HTMLAudioElement, name: string }

export function isMusicEnabled() {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
}

export function setMusicEnabled(enabled) {
    localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
    if (!enabled) stopMusic();
}

export function playTrack(name) {
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
