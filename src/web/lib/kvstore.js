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

export async function duplicateQuiz(sourceKey, newName) {
    const created = await createQuiz(newName);
    const newId = created._key || created.key;
    const sourceQuestions = await listQuestions(sourceKey);
    for (let i = 0; i < sourceQuestions.length; i++) {
        const { _key, ...rest } = sourceQuestions[i];
        await saveQuestion({ ...rest, quiz_id: newId, sort_order: i });
    }
    return newId;
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
    if (!Array.isArray(data)) return [];
    // Filter out the system-check probe doc, in case its cleanup DELETE ever fails.
    return data.filter((q) => q._key !== '_healthcheck_' && q.quiz_id !== '_test_');
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
// loadConfig() result is cached in-memory to avoid redundant round-trips.
// Cache expires after CONFIG_TTL_MS; saveConfig() invalidates it immediately
// via a monotonically increasing _configRev — any in-flight load started
// before the save will see a rev mismatch on completion and discard its result.
//
// NOTE: the Splunk index for poll events is sourced from the `ponypoll_index`
// search macro (see macros.conf and getPollIndex() below), not from the KV
// config. The legacy `poll_index` field on `ponypoll_config` is no longer
// read or written — it is kept on existing documents purely for back-compat.

const CONFIG_TTL_MS = 60_000; // 60 seconds
let _cachedConfig   = null;
let _cachedAt       = 0;
let _configLoading  = null;
let _configRev      = 0;

export async function loadConfig() {
    const now = Date.now();
    if (_cachedConfig && (now - _cachedAt) < CONFIG_TTL_MS) return _cachedConfig;
    if (_configLoading) return _configLoading;
    const revAtStart = _configRev;
    _configLoading = (async () => {
        try {
            const c = await kvFetch(`${kvBase()}/ponypoll_config/default?output_mode=json`);
            if (revAtStart === _configRev) {
                _cachedConfig = c;
                _cachedAt     = Date.now();
            }
            return c;
        } catch (_) {
            const fallback = { poll_subject: 'Pony Poll', active_quiz_id: '' };
            if (revAtStart === _configRev) {
                _cachedConfig = fallback;
                _cachedAt     = Date.now();
            }
            return fallback;
        } finally {
            _configLoading = null;
        }
    })();
    return _configLoading;
}

export async function saveConfig(cfg) {
    _configRev += 1;       // any in-flight loadConfig will discard its result
    _cachedConfig = null;
    _cachedAt     = 0;
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

/**
 * Returns the current user's full Splunk context — `{ username, roles }` —
 * or `null` if the call fails (e.g. anonymous, network error). Roles is
 * always an array. Used by features that need to gate write-paths on
 * the user actually having permission for the underlying KV collection,
 * so we don't surface a 403 to a participant who clicks an admin-only
 * control (see PollPage's quiz picker).
 */
export async function getCurrentUserContext() {
    try {
        const data = await kvFetch(
            `${splunkdBase()}/services/authentication/current-context?output_mode=json`
        );
        const content = data?.entry?.[0]?.content || {};
        return {
            username: content.username || '',
            roles: Array.isArray(content.roles) ? content.roles : [],
        };
    } catch (_) {
        return null;
    }
}

/**
 * True if `roles` grants write access to ponypoll_config / ponypoll_quizzes /
 * ponypoll_questions. Kept in lockstep with metadata/default.meta — any role
 * listed here as a writer for those collections belongs in this set.
 */
const PONYPOLL_ADMIN_ROLES = new Set(['admin', 'sc_admin', 'ponypoll_admin', 'power']);

export function canManageQuizzes(roles) {
    if (!Array.isArray(roles)) return false;
    return roles.some((r) => PONYPOLL_ADMIN_ROLES.has(r));
}

// ── Version info ──────────────────────────────────────────────────────────────

/**
 * Returns { splunkVersion, splunkBuild, appVersion } from the Splunk REST API.
 * Both calls are made in parallel; individual failures return '—'.
 */
export async function getVersionInfo() {
    const [serverData, appData] = await Promise.allSettled([
        kvFetch(`${splunkdBase()}/services/server/info?output_mode=json`),
        kvFetch(`${splunkdBase()}/services/apps/local/${APP}?output_mode=json`),
    ]);
    const serverContent = serverData.status === 'fulfilled'
        ? serverData.value?.entry?.[0]?.content
        : null;
    const appContent = appData.status === 'fulfilled'
        ? appData.value?.entry?.[0]?.content
        : null;
    return {
        splunkVersion: serverContent?.version || '—',
        splunkBuild:   serverContent?.build   || '',
        appVersion:    appContent?.version    || '—',
    };
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

// ── Write events ─────────────────────────────────────────────────────────────
// Events are written via receivers/simple using the user's Splunk session cookie.
// The ponypoll_user role ships with the edit_tcp capability so all authenticated
// users (not just admins) can POST to this endpoint.

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

// ── Search macro: `ponypoll_index` ────────────────────────────────────────────
// The macro is the single source of truth for "where do quiz events live?".
// It expands to `index=<name>` at search time (used in every SPL query and
// in the analytics dashboard XML). The Settings UI reads/writes it via the
// /configs/conf-macros REST endpoint. The resolved bare index name is cached
// in-memory so the answer-submit hot path doesn't hit the REST API every time.

const DEFAULT_INDEX = 'ponypoll';
const INDEX_CACHE_TTL_MS = 60_000;
let _cachedIndex   = null;
let _cachedIndexAt = 0;

/**
 * Strict Splunk index name validator/sanitizer.
 *
 * Splunk index names must be lowercase, start with a letter/digit/underscore,
 * may contain letters/digits/underscores/hyphens, and be 1–80 chars. Reject
 * everything else outright rather than silently mangling user input.
 */
export function sanitizeIndexName(raw) {
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim().toLowerCase();
    if (!trimmed) return null;
    if (!/^[a-z0-9_][a-z0-9_-]{0,79}$/.test(trimmed)) return null;
    return trimmed;
}

/**
 * Parse "index=<name>" out of a macro definition. Tolerates leading/trailing
 * whitespace and surrounding parentheses. Returns null if the definition is
 * not a plain `index=...` expression.
 */
function parseIndexFromMacroDef(def) {
    if (typeof def !== 'string') return null;
    const m = def.trim().match(/^index\s*=\s*([A-Za-z0-9_][A-Za-z0-9_-]{0,79})\s*$/);
    if (!m) return null;
    return sanitizeIndexName(m[1]);
}

/** GET the raw `ponypoll_index` macro definition (or null on any error). */
export async function getIndexMacro() {
    const url = `${splunkdBase()}/servicesNS/nobody/${APP}/configs/conf-macros/ponypoll_index?output_mode=json`;
    try {
        const data = await kvFetch(url);
        const definition = data?.entry?.[0]?.content?.definition || '';
        return { definition, indexName: parseIndexFromMacroDef(definition) };
    } catch (_) {
        return null;
    }
}

/**
 * Persist a new index name to the `ponypoll_index` macro. The value is
 * sanitized first; an invalid name throws. Writes go to local/ so they
 * survive app upgrades. Refreshes the in-memory index cache on success.
 */
export async function saveIndexMacro(rawIndexName) {
    const clean = sanitizeIndexName(rawIndexName);
    if (!clean) {
        throw new Error('Invalid index name. Use lowercase letters, digits, underscores or hyphens; 1–80 chars; must start with a letter, digit or underscore.');
    }
    const url = `${splunkdBase()}/servicesNS/nobody/${APP}/configs/conf-macros/ponypoll_index?output_mode=json`;
    const body = new URLSearchParams({ definition: `index=${clean}`, iseval: '0' }).toString();
    const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Splunk-Form-Key': csrfToken(),
            'X-Requested-With': 'XMLHttpRequest',
        },
        body,
    });
    if (!res.ok) {
        const t = await res.text().catch(() => '');
        let msg = `HTTP ${res.status}`;
        try { msg = JSON.parse(t)?.messages?.[0]?.text || msg; } catch (_) {}
        throw new Error(msg);
    }
    _cachedIndex   = clean;
    _cachedIndexAt = Date.now();
    return clean;
}

/**
 * Resolve the currently-configured bare index name. Cached for
 * INDEX_CACHE_TTL_MS to keep the answer-submit hot path free of REST calls.
 * Falls back to DEFAULT_INDEX if the macro is missing/malformed/unreachable.
 */
export async function getPollIndex() {
    const now = Date.now();
    if (_cachedIndex && (now - _cachedIndexAt) < INDEX_CACHE_TTL_MS) {
        return _cachedIndex;
    }
    const macro = await getIndexMacro();
    const name  = macro?.indexName || DEFAULT_INDEX;
    _cachedIndex   = name;
    _cachedIndexAt = Date.now();
    return name;
}

/** Force-clear the index cache so the next getPollIndex() re-fetches. */
export function invalidateIndexCache() {
    _cachedIndex = null;
    _cachedIndexAt = 0;
}

async function submitEvent(eventData, opts = {}) {
    const meta = {
        index: opts.index || await getPollIndex(),
        sourcetype: opts.sourcetype || 'ponypoll_answer',
        source: opts.source || 'ponypoll_app',
    };
    await submitViaReceiver(eventData, meta);
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
//
// SECURITY — SPL injection
// Splunk search is executed under the caller's role (typically ponypoll_user
// with read access only to the ponypoll index). Even so, NEVER interpolate
// user-controlled strings into `spl` without sanitising them first:
//   * Identifiers (session_id, quiz_id, _key)  → sanitizeId() from lib/utils.js
//   * Numeric fields (question_index, points)  → Number(x) || 0
//   * Free-text (nickname inside "...")        → quoteForSpl() from lib/utils.js
// KV Store ACLs (default.meta) restrict write access to ponypoll_session, but
// ponypoll_presence is world-writable by participants — so values that flow
// from any KV/event source into SPL must still be treated as untrusted.
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
