/**
 * PonyPoll music track catalogue.
 *
 * Two sources, merged into one flat list of track entries:
 *   - Bundled  → /static/app/ponypollapp/audio/manifest.json  (ships in the tarball, works offline)
 *   - GitHub   → raw.githubusercontent.com/.../audio/manifest.json  (fetched on demand)
 *
 * Per-slot user selection (which entry plays for lobby / question / win) is
 * stored per-browser in localStorage by lib/audio.js. This module is purely
 * concerned with loading and validating the catalogue itself.
 */

const APP = 'ponypollapp';

const BUNDLED_BASE = `/static/app/${APP}/audio/`;
const GITHUB_BASE  = 'https://raw.githubusercontent.com/bautt/ponypollApp/main/audio/';

const GITHUB_CACHE_KEY = 'ponypoll_audio_github_manifest';

export const SLOTS = ['lobby', 'question', 'win'];

export const DEFAULT_IDS = {
    lobby:    'default-lobby',
    question: 'default-question',
    win:      'default-win',
};

// ── Validation ────────────────────────────────────────────────────────────────
// Strict allow-lists so a malformed (or malicious) manifest entry cannot inject
// arbitrary URLs into the <audio> element. Anything that fails is dropped from
// the merged catalogue with a console.warn — the UI never crashes.

const RE_ID    = /^[a-z0-9_-]{1,40}$/;
const RE_FILE  = /^[a-zA-Z0-9_/-]+\.(mp3|ogg|wav)$/;
const RE_HTTPS = /^https:\/\//;

export function validateEntry(entry) {
    if (!entry || typeof entry !== 'object') return false;
    if (typeof entry.id   !== 'string' || !RE_ID.test(entry.id))     return false;
    if (typeof entry.name !== 'string' || !entry.name.trim())        return false;
    if (typeof entry.file !== 'string' || !RE_FILE.test(entry.file)) return false;
    if (entry.file.includes('..'))                                   return false;
    if (typeof entry.loop !== 'boolean')                             return false;
    if (!SLOTS.includes(entry.recommended_slot))                     return false;
    if (typeof entry.author  !== 'string' || !entry.author.trim())   return false;
    if (typeof entry.license !== 'string' || !entry.license.trim()) return false;
    if (typeof entry.source  !== 'string' || !RE_HTTPS.test(entry.source)) return false;
    if (entry.duration_sec != null && typeof entry.duration_sec !== 'number') return false;
    return true;
}

function sanitiseManifest(raw, sourceLabel) {
    if (!Array.isArray(raw)) {
        console.warn(`[audio-catalogue] ${sourceLabel} manifest is not an array — ignoring`);
        return [];
    }
    const good = [];
    const seen = new Set();
    for (const entry of raw) {
        if (!validateEntry(entry)) {
            console.warn(`[audio-catalogue] ${sourceLabel}: dropping invalid entry`, entry?.id || entry);
            continue;
        }
        if (seen.has(entry.id)) {
            console.warn(`[audio-catalogue] ${sourceLabel}: duplicate id "${entry.id}" — keeping first`);
            continue;
        }
        seen.add(entry.id);
        good.push(entry);
    }
    return good;
}

// ── Loaders ───────────────────────────────────────────────────────────────────

/** Fetch the manifest of tracks bundled with the app's static files. */
export async function loadBundledManifest() {
    try {
        const res = await fetch(`${BUNDLED_BASE}manifest.json`, { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        return sanitiseManifest(json, 'bundled');
    } catch (e) {
        console.warn('[audio-catalogue] bundled manifest load failed:', e.message);
        return [];
    }
}

/** Fetch the live GitHub catalogue. Caches in sessionStorage to avoid refetching
 *  on every Settings open within the same tab. Refresh = pass forceRefresh:true. */
export async function loadGitHubManifest({ forceRefresh = false } = {}) {
    if (!forceRefresh) {
        try {
            const cached = sessionStorage.getItem(GITHUB_CACHE_KEY);
            if (cached) return sanitiseManifest(JSON.parse(cached), 'github (cached)');
        } catch (_) {
            // sessionStorage may be unavailable (Safari private mode etc.) — fall through to fetch
        }
    }
    const res = await fetch(`${GITHUB_BASE}manifest.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`GitHub returned ${res.status} — check internet access`);
    const json = await res.json();
    try { sessionStorage.setItem(GITHUB_CACHE_KEY, JSON.stringify(json)); } catch (_) {}
    return sanitiseManifest(json, 'github');
}

/** Drop the cached GitHub manifest. Call from the 🔄 GitHub button. */
export function invalidateGitHubCache() {
    try { sessionStorage.removeItem(GITHUB_CACHE_KEY); } catch (_) {}
}

/**
 * Merge bundled + GitHub manifests into a single list keyed by id.
 * GitHub entries take precedence (so a bundled track can be deprecated /
 * relabelled centrally), but the bundled entry survives if a GitHub entry is
 * missing — guarantees offline installs always see the three defaults.
 *
 * Returns { tracks, sources } where tracks is the merged array and sources
 * marks per-id where each entry came from (for UI badges).
 */
export async function loadMergedManifest({ includeGitHub = false, forceRefresh = false } = {}) {
    const bundled = await loadBundledManifest();
    let github = [];
    let githubError = null;
    if (includeGitHub) {
        try {
            github = await loadGitHubManifest({ forceRefresh });
        } catch (e) {
            githubError = e.message;
        }
    }
    const byId = new Map();
    for (const t of bundled) byId.set(t.id, { ...t, _source: 'bundled' });
    for (const t of github) {
        const prev = byId.get(t.id);
        byId.set(t.id, {
            ...t,
            bundled: !!prev?.bundled,
            _source: prev?.bundled ? 'both' : 'github',
        });
    }
    return {
        tracks: Array.from(byId.values()),
        githubError,
        githubLoaded: includeGitHub && !githubError,
    };
}

/** Filter + sort tracks for one slot: recommended first, then everything else. */
export function listTracksForSlot(tracks, slot) {
    const sorted = [...tracks].sort((a, b) => a.name.localeCompare(b.name));
    return [
        ...sorted.filter(t => t.recommended_slot === slot),
        ...sorted.filter(t => t.recommended_slot !== slot),
    ];
}

// ── URL resolution ───────────────────────────────────────────────────────────
// Hard-coded URL prefixes — no track field ever lands directly in an HTML
// <audio src>. The validator already guarantees `file` matches the allow-list.

export function trackUrl(entry) {
    if (!entry) return null;
    return entry.bundled
        ? `${BUNDLED_BASE}${entry.file}`
        : `${GITHUB_BASE}${entry.file}`;
}
