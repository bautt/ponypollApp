/**
 * KV Store REST API helpers.
 * All calls go through the Splunk Web proxy at /{locale}/splunkd/__raw/...
 * The session cookie is sent automatically (same-origin).
 */

const APP = 'ponypollapp';

/** Infer the locale prefix from the current page URL (e.g. "/en-US"). */
function localePrefix() {
    const parts = window.location.pathname.split('/');
    if (parts.length >= 2 && /^[a-z]{2}(-[A-Z]{2})?$/.test(parts[1])) {
        return '/' + parts[1];
    }
    return '/en-US';
}

/** Read the Splunk CSRF token from the session cookie. */
function csrfToken() {
    const m = document.cookie.match(/splunkweb_csrf_token_\d+=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : '';
}

function kvBase() {
    return `${localePrefix()}/splunkd/__raw/servicesNS/nobody/${APP}/storage/collections/data`;
}

function splunkdBase() {
    return `${localePrefix()}/splunkd/__raw`;
}

async function kvFetch(url, opts = {}) {
    const headers = {
        'Content-Type': 'application/json',
        'X-Splunk-Form-Key': csrfToken(),
        'X-Requested-With': 'XMLHttpRequest',
        ...(opts.headers || {}),
    };
    const res = await fetch(url, { credentials: 'include', ...opts, headers });
    const text = await res.text();
    // Splunk KV Store DELETE and some write ops return an empty body on success
    if (!text.trim()) return null;
    let data;
    try {
        data = JSON.parse(text);
    } catch (_) {
        throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 200)}`);
    }
    if (!res.ok) {
        const msg = data?.messages?.[0]?.text || data?.error || JSON.stringify(data);
        throw new Error(msg);
    }
    return data;
}

// ── Quiz catalogue ─────────────────────────────────────────────────────────────

export async function listQuizzes() {
    const data = await kvFetch(
        `${kvBase()}/ponypoll_quizzes?output_mode=json&sort_key=created_at&sort_dir=asc&limit=200`
    );
    return Array.isArray(data) ? data : [];
}

export async function createQuiz(name) {
    const doc = { name, created_at: new Date().toISOString() };
    return kvFetch(`${kvBase()}/ponypoll_quizzes?output_mode=json`, {
        method: 'POST',
        body: JSON.stringify(doc),
    });
}

export async function renameQuiz(key, name) {
    return kvFetch(`${kvBase()}/ponypoll_quizzes/${encodeURIComponent(key)}?output_mode=json`, {
        method: 'POST',
        body: JSON.stringify({ name }),
    });
}

export async function getQuiz(key) {
    if (!key) return null;
    try {
        return await kvFetch(
            `${kvBase()}/ponypoll_quizzes/${encodeURIComponent(key)}?output_mode=json`
        );
    } catch (_) {
        return null;
    }
}

export async function updateQuiz(key, doc) {
    const body = { ...doc };
    delete body._key;
    return kvFetch(`${kvBase()}/ponypoll_quizzes/${encodeURIComponent(key)}?output_mode=json`, {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

export async function deleteQuiz(key) {
    // Delete all questions for this quiz first
    const query = encodeURIComponent(JSON.stringify({ quiz_id: key }));
    await kvFetch(
        `${kvBase()}/ponypoll_questions?output_mode=json&query=${query}`,
        { method: 'DELETE' }
    );
    // Then delete the quiz record
    return kvFetch(`${kvBase()}/ponypoll_quizzes/${encodeURIComponent(key)}?output_mode=json`, {
        method: 'DELETE',
    });
}

// ── Questions collection ───────────────────────────────────────────────────────

export async function listQuestions(quizId) {
    const query = quizId
        ? `&query=${encodeURIComponent(JSON.stringify({ quiz_id: quizId }))}`
        : '';
    const data = await kvFetch(
        `${kvBase()}/ponypoll_questions?output_mode=json&limit=500&sort_key=sort_order&sort_dir=asc${query}`
    );
    return Array.isArray(data) ? data : [];
}

export async function deleteQuestion(key) {
    return kvFetch(`${kvBase()}/ponypoll_questions/${encodeURIComponent(key)}?output_mode=json`, {
        method: 'DELETE',
    });
}

/** Save or create a single question document. Returns the saved doc (with _key). */
export async function saveQuestion(doc) {
    const { _key, ...body } = doc;
    if (_key) {
        // Update existing document in place
        return kvFetch(`${kvBase()}/ponypoll_questions/${encodeURIComponent(_key)}?output_mode=json`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }
    // Create new document
    return kvFetch(`${kvBase()}/ponypoll_questions?output_mode=json`, {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

/** Replace all questions for a given quiz (delete + batch_save). */
export async function saveAllQuestions(questions, quizId) {
    // Delete existing docs for this quiz
    const query = encodeURIComponent(JSON.stringify({ quiz_id: quizId }));
    await kvFetch(
        `${kvBase()}/ponypoll_questions?output_mode=json&query=${query}`,
        { method: 'DELETE' }
    );
    if (questions.length === 0) return;
    const docs = questions.map(({ _key, ...rest }, i) => ({
        ...rest,
        quiz_id: quizId,
        sort_order: i,
    }));
    return kvFetch(`${kvBase()}/ponypoll_questions/batch_save?output_mode=json`, {
        method: 'POST',
        body: JSON.stringify(docs),
    });
}

// ── Config collection ─────────────────────────────────────────────────────────
// loadConfig() result is cached in-memory so submitEvent can check the HEC
// settings without a round-trip on every event.  saveConfig() invalidates it.

let _cachedConfig = null;
let _configLoading = null;

export async function loadConfig() {
    if (_cachedConfig) return _cachedConfig;
    if (_configLoading) return _configLoading;
    _configLoading = (async () => {
        try {
            const c = await kvFetch(`${kvBase()}/ponypoll_config/default?output_mode=json`);
            _cachedConfig = c;
            return c;
        } catch (_) {
            const fallback = { poll_index: 'ponypoll', poll_subject: 'Pony Poll', active_quiz_id: '' };
            _cachedConfig = fallback;
            return fallback;
        } finally {
            _configLoading = null;
        }
    })();
    return _configLoading;
}

export async function saveConfig(cfg) {
    _cachedConfig = null; // invalidate cache so next submitEvent re-reads
    try {
        await kvFetch(`${kvBase()}/ponypoll_config/default?output_mode=json`, {
            method: 'POST',
            body: JSON.stringify(cfg),
        });
    } catch (_) {
        await kvFetch(`${kvBase()}/ponypoll_config?output_mode=json`, {
            method: 'POST',
            body: JSON.stringify({ _key: 'default', ...cfg }),
        });
    }
}

/** Default HEC URL inferred from the current Splunk Web hostname (port 8088). */
export function defaultHecUrl() {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:8088/services/collector/event`;
}

// ── Current Splunk user ───────────────────────────────────────────────────────

export async function getCurrentUser() {
    try {
        const data = await kvFetch(
            `${splunkdBase()}/services/authentication/current-context?output_mode=json`
        );
        return data?.entry?.[0]?.content?.username || '';
    } catch (_) {
        return '';
    }
}

// ── Bundled quiz library ──────────────────────────────────────────────────────

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/bautt/ponypollApp/main/quizzes';

/** Fetch the manifest of quizzes bundled with the app's static files. */
export async function fetchLibraryManifest() {
    const res = await fetch(`/static/app/${APP}/quizzes/manifest.json`, { credentials: 'include' });
    if (!res.ok) throw new Error(`Could not load quiz library manifest (${res.status})`);
    return res.json();
}

/** Fetch a specific bundled quiz JSON by filename. */
export async function fetchLibraryQuiz(filename) {
    const res = await fetch(`/static/app/${APP}/quizzes/${filename}`, { credentials: 'include' });
    if (!res.ok) throw new Error(`Could not load quiz file "${filename}" (${res.status})`);
    return res.json();
}

/** Fetch the live manifest directly from GitHub (requires internet access). */
export async function fetchGitHubManifest() {
    const res = await fetch(`${GITHUB_RAW_BASE}/manifest.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`GitHub returned ${res.status} — check internet access`);
    return res.json();
}

/** Fetch a specific quiz JSON directly from GitHub by filename. */
export async function fetchGitHubQuiz(filename) {
    const res = await fetch(`${GITHUB_RAW_BASE}/${filename}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`GitHub returned ${res.status} for "${filename}"`);
    return res.json();
}

// ── Available Splunk indexes ──────────────────────────────────────────────────

export async function listIndexes() {
    const data = await kvFetch(
        `${splunkdBase()}/services/data/indexes?output_mode=json&count=200&search=isInternal%3Dfalse`
    );
    return (data?.entry || []).map((e) => e.name).sort();
}

// ── Write events ─────────────────────────────────────────────────────────────
// Two paths, in order of preference:
//   1. HEC (HTTP Event Collector) — works for ANY Splunk role (including
//      ponypoll_user) because the HEC token authenticates independently of
//      the user's session.  Required for non-admin participants.  Configured
//      by the admin in Settings.  Works on Splunk Enterprise AND Splunk Cloud.
//   2. receivers/simple — falls back when HEC isn't configured.  Only works
//      for users whose role can write to /services/receivers/simple (admins).

async function submitViaHec(eventData, { index, sourcetype, source }, { hec_url, hec_token }) {
    const body = { event: eventData, sourcetype, source, index };
    const res = await fetch(hec_url, {
        method: 'POST',
        // HEC uses its own token in the header; do NOT send Splunk Web cookies
        // (they could be rejected on the cross-port HEC endpoint).
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Splunk ${hec_token}`,
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const t = await res.text();
        throw new Error(`HEC ${res.status}: ${t.slice(0, 200)}`);
    }
}

async function submitViaReceiver(eventData, { index, sourcetype, source }) {
    const params = new URLSearchParams({ index, sourcetype, source, output_mode: 'json' });
    const res = await fetch(
        `${localePrefix()}/splunkd/__raw/services/receivers/simple?${params}`,
        {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-Splunk-Form-Key': csrfToken(),
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify(eventData),
        }
    );
    if (!res.ok) {
        const t = await res.text();
        throw new Error(`receivers/simple ${res.status}: ${t.slice(0, 200)}`);
    }
}

async function submitEvent(eventData, opts = {}) {
    const meta = {
        index: opts.index || 'ponypoll',
        sourcetype: opts.sourcetype || 'ponypoll_answer',
        source: opts.source || 'ponypoll_app',
    };
    let cfg = null;
    try { cfg = await loadConfig(); } catch (_) {}
    if (cfg?.hec_token && cfg?.hec_url) {
        try {
            await submitViaHec(eventData, meta, cfg);
            return;
        } catch (e) {
            // HEC failed (token bad, CORS, network) — fall through to receivers
            // for admins; for non-admins the next call will also fail and
            // surface the error.  We do NOT swallow silently here.
            // eslint-disable-next-line no-console
            console.warn('HEC submit failed, falling back to receivers/simple:', e.message);
        }
    }
    await submitViaReceiver(eventData, meta);
}

/** Send a tiny test event to HEC; throws on any failure. */
export async function testHec(hec_url, hec_token) {
    if (!hec_url || !hec_token) throw new Error('Both URL and token are required.');
    const body = {
        event: { event: 'hec_test', source_app: 'ponypoll', ts: new Date().toISOString() },
        sourcetype: 'ponypoll_test',
        source: 'ponypoll_app',
        index: 'ponypoll',
    };
    const res = await fetch(hec_url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Splunk ${hec_token}`,
        },
        body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`HEC ${res.status}: ${text.slice(0, 300)}`);
    try {
        const data = JSON.parse(text);
        if (data.code !== 0) throw new Error(`HEC code ${data.code}: ${data.text || text}`);
    } catch (_) { /* not JSON, but 2xx is good enough */ }
}

export async function submitAnswer(eventData) {
    return submitEvent(eventData, { sourcetype: 'ponypoll_answer' });
}

export async function submitQuizAttempt(eventData) {
    return submitEvent(eventData, { sourcetype: 'ponypoll_attempt' });
}

// ── Single question fetch ─────────────────────────────────────────────────

export async function getQuestion(key) {
    if (!key) return null;
    try {
        return await kvFetch(
            `${kvBase()}/ponypoll_questions/${encodeURIComponent(key)}?output_mode=json`
        );
    } catch (_) {
        return null;
    }
}

// ── Synchronized session ──────────────────────────────────────────────────
// Single "active" document in ponypoll_session used as a broadcast channel.
// Host writes; participants poll every ~1.5 s and react to phase changes.

export async function getSession() {
    try {
        return await kvFetch(`${kvBase()}/ponypoll_session/active?output_mode=json`);
    } catch (_) {
        return null;
    }
}

/** Write the full session document (host always supplies the complete object). */
export async function updateSession(doc) {
    const body = { ...doc };
    delete body._key;
    try {
        return await kvFetch(`${kvBase()}/ponypoll_session/active?output_mode=json`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    } catch (_) {
        // Document doesn't exist yet — create it
        return kvFetch(`${kvBase()}/ponypoll_session?output_mode=json`, {
            method: 'POST',
            body: JSON.stringify({ _key: 'active', ...body }),
        });
    }
}

// ── Participant presence ──────────────────────────────────────────────────
// One document per participant per session (nickname is the natural key within a session).

function presenceKey(sessionId, nickname) {
    // Stable, collision-resistant key from session + sanitised nickname
    return `${sessionId}_${nickname.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24) || 'anon'}`;
}

/**
 * Record a participant joining.
 * Primary: KV Store presence doc (lets host see lobby list in real-time).
 * Fallback: receivers/simple event (works for all Splunk roles regardless of
 *   KV Store write permissions — host can query via SPL if KV write fails).
 * Never throws — participant always proceeds to the quiz.
 */
export async function joinSession(sessionId, nickname) {
    const key = presenceKey(sessionId, nickname);
    const doc = {
        session_id: sessionId,
        nickname,
        joined_at: new Date().toISOString(),
        last_seen: new Date().toISOString(),
    };

    // Always index a join event so the host's lobby search always finds it.
    // Fire-and-forget — never blocks the participant from proceeding.
    submitEvent(
        { event: 'join', session_id: sessionId, nickname },
        { sourcetype: 'ponypoll_presence' }
    ).catch(() => {});

    // Also try KV Store so the host could query it directly (best-effort).
    try {
        await kvFetch(`${kvBase()}/ponypoll_presence/${encodeURIComponent(key)}?output_mode=json`, {
            method: 'POST',
            body: JSON.stringify(doc),
        });
        return;
    } catch (_) {}
    try {
        await kvFetch(`${kvBase()}/ponypoll_presence?output_mode=json`, {
            method: 'POST',
            body: JSON.stringify({ _key: key, ...doc }),
        });
    } catch (_) { /* best-effort */ }
}

export async function heartbeatPresence(sessionId, nickname) {
    const key = presenceKey(sessionId, nickname);
    try {
        await kvFetch(`${kvBase()}/ponypoll_presence/${encodeURIComponent(key)}?output_mode=json`, {
            method: 'POST',
            body: JSON.stringify({ last_seen: new Date().toISOString() }),
        });
    } catch (_) { /* best-effort */ }
}

export async function getPresence(sessionId) {
    const query = encodeURIComponent(JSON.stringify({ session_id: sessionId }));
    try {
        const data = await kvFetch(
            `${kvBase()}/ponypoll_presence?output_mode=json&query=${query}&limit=200`
        );
        return Array.isArray(data) ? data : [];
    } catch (_) {
        return [];
    }
}

export async function clearPresence(sessionId) {
    const query = encodeURIComponent(JSON.stringify({ session_id: sessionId }));
    try {
        await kvFetch(`${kvBase()}/ponypoll_presence?output_mode=json&query=${query}`, {
            method: 'DELETE',
        });
    } catch (_) { /* best-effort */ }
}

// ── Splunk search (oneshot) ───────────────────────────────────────────────────
// Returns an array of result objects from a one-shot Splunk search.

export async function runSearch(spl, { earliest = '-7d', latest = 'now', count = 1000 } = {}) {
    const body = new URLSearchParams({
        search: spl.startsWith('search ') ? spl : `search ${spl}`,
        exec_mode: 'oneshot',
        output_mode: 'json',
        earliest_time: earliest,
        latest_time: latest,
        count: String(count),
    });
    const res = await fetch(
        `${localePrefix()}/splunkd/__raw/services/search/jobs`,
        {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Splunk-Form-Key': csrfToken(),
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: body.toString(),
        }
    );
    const text = await res.text();
    if (!res.ok) throw new Error(`Search failed (${res.status}): ${text.slice(0, 300)}`);
    const json = JSON.parse(text);
    return json.results || [];
}
