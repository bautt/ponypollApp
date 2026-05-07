/**
 * KV Store REST API helpers.
 * All calls go through the Splunk Web proxy at /{locale}/splunkd/__raw/...
 * The session cookie is sent automatically (same-origin).
 */

const APP = 'ponypollapp';

/** Infer the locale prefix from the current page URL (e.g. "/en-US"). */
function localePrefix() {
    const parts = window.location.pathname.split('/');
    // Splunk Web paths look like /en-US/app/...
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

// ── Questions collection ───────────────────────────────────────────────────────

export async function listQuestions() {
    const data = await kvFetch(
        `${kvBase()}/ponypoll_questions?output_mode=json&limit=200&sort_key=sort_order&sort_dir=asc`
    );
    return Array.isArray(data) ? data : [];
}

export async function createQuestion(q) {
    return kvFetch(`${kvBase()}/ponypoll_questions?output_mode=json`, {
        method: 'POST',
        body: JSON.stringify(q),
    });
}

export async function updateQuestion(key, q) {
    return kvFetch(`${kvBase()}/ponypoll_questions/${encodeURIComponent(key)}?output_mode=json`, {
        method: 'POST',
        body: JSON.stringify(q),
    });
}

export async function deleteQuestion(key) {
    return kvFetch(`${kvBase()}/ponypoll_questions/${encodeURIComponent(key)}?output_mode=json`, {
        method: 'DELETE',
    });
}

/** Replace entire question list (delete all + batch_save). */
export async function saveAllQuestions(questions) {
    // Delete all existing documents in the collection
    await kvFetch(`${kvBase()}/ponypoll_questions?output_mode=json`, { method: 'DELETE' });
    // Batch-insert all in one request (Splunk KV Store batch_save endpoint)
    const docs = questions.map(({ _key, ...rest }, i) => ({ ...rest, sort_order: i }));
    if (docs.length === 0) return;
    await kvFetch(`${kvBase()}/ponypoll_questions/batch_save?output_mode=json`, {
        method: 'POST',
        body: JSON.stringify(docs),
    });
}

// ── Config collection ─────────────────────────────────────────────────────────

export async function loadConfig() {
    try {
        const data = await kvFetch(
            `${kvBase()}/ponypoll_config/default?output_mode=json`
        );
        return data;
    } catch (_) {
        return { poll_index: 'ponypoll', poll_subject: 'Pony Poll' };
    }
}

export async function saveConfig(cfg) {
    // Upsert by using the fixed key "default"
    try {
        await kvFetch(`${kvBase()}/ponypoll_config/default?output_mode=json`, {
            method: 'POST',
            body: JSON.stringify(cfg),
        });
    } catch (_) {
        // Key doesn't exist yet — create it with explicit _key
        await kvFetch(`${kvBase()}/ponypoll_config?output_mode=json`, {
            method: 'POST',
            body: JSON.stringify({ _key: 'default', ...cfg }),
        });
    }
}

// ── Available Splunk indexes ──────────────────────────────────────────────────

export async function listIndexes() {
    const data = await kvFetch(
        `${splunkdBase()}/services/data/indexes?output_mode=json&count=200&search=isInternal%3Dfalse`
    );
    return (data?.entry || []).map((e) => e.name).sort();
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

// ── Write answer event ────────────────────────────────────────────────────────

export async function submitAnswer(eventData, index) {
    const res = await fetch(
        `${localePrefix()}/splunkd/__raw/services/ponypoll/v1/answer?output_mode=json`,
        {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-Splunk-Form-Key': csrfToken(),
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({ ...eventData, index }),
        }
    );
    if (!res.ok) {
        const t = await res.text();
        throw new Error(`submitAnswer failed (${res.status}): ${t.slice(0, 200)}`);
    }
    return res.json();
}
