/** Generate a random unique ID for client-side use (crypto-backed). */
export function uid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Array.from(crypto.getRandomValues(new Uint8Array(8)))
        .map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Canonical Fisher-Yates shuffle — always returns a new array, never mutates input. */
export function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/** Calculate points based on time remaining (faster = more points). */
export function calcPoints(timeLimit, timeRemaining) {
    if (timeLimit <= 0) return 100;
    const ratio = Math.max(0, timeRemaining / timeLimit);
    return Math.round(500 + 500 * ratio);
}

/**
 * Normalise a raw word-cloud word:
 *  - Strip surrounding "quotes" or 'quotes'
 *  - Convert underscores to spaces (one_term → "one term")
 */
export function normalizeWcWord(raw) {
    let w = raw.trim();
    if ((w.startsWith('"') && w.endsWith('"')) || (w.startsWith("'") && w.endsWith("'"))) {
        w = w.slice(1, -1).trim();
    }
    return w.replace(/_/g, ' ').trim();
}

/**
 * Strip everything except [a-zA-Z0-9_-] from an identifier.
 *
 * MANDATORY for any string that will be interpolated into an SPL query
 * (session_id, quiz_id, question_index, etc.). Even when the value comes
 * from a KV Store doc whose write access is locked down by ACLs, treat it
 * as untrusted at the search boundary — defense in depth.
 *
 * Returns '' for null/undefined.
 */
export function sanitizeId(id) {
    return id == null ? '' : String(id).replace(/[^a-zA-Z0-9_-]/g, '');
}

/**
 * Sanitize a nickname for safe inclusion as a quoted SPL string literal.
 * Escapes backslash and double-quote so the value cannot break out of the
 * surrounding "...". Use as: `nickname="${quoteForSpl(nick)}"`.
 */
export function quoteForSpl(value) {
    return String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
