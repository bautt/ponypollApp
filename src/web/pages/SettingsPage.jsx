import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    isMusicEnabled, setMusicEnabled, isSfxEnabled, setSfxEnabled,
    getSelectedTrackId, setSelectedTrackId, refreshCatalogue,
} from '../lib/audio';
import {
    SLOTS, DEFAULT_IDS, loadMergedManifest, invalidateGitHubCache,
    listTracksForSlot, trackUrl,
} from '../lib/audio-catalogue';

const IconSearch = () => (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
        <circle cx="6.5" cy="6.5" r="4.5" />
        <line x1="10" y1="10" x2="14" y2="14" />
    </svg>
);
import styled from 'styled-components';
import {
    loadConfig, saveConfig, getVersionInfo,
    getIndexMacro, saveIndexMacro, sanitizeIndexName,
} from '../lib/kvstore';
import { C, FONTS } from '../lib/theme';

const Root = styled.div`
    min-height: calc(100vh - 90px);
    background: ${C.bg};
    color: ${C.text};
    font-family: ${FONTS.sans};
    padding: 32px 24px;
`;

const Card = styled.div`
    box-sizing: border-box;
    max-width: 560px;
    background: ${C.surface};
    border: 1px solid ${C.border};
    border-radius: 12px;
    padding: 28px 28px;
`;

const Title = styled.h2`
    margin: 0 0 24px;
    font-size: 20px;
    font-weight: 700;
    color: #fff;
`;

const Section = styled.div`
    margin-bottom: 22px;
`;

const Label = styled.label`
    display: block;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: ${C.muted};
    margin-bottom: 6px;
`;

const Hint = styled.p`
    font-size: 12px;
    color: ${C.muted};
    margin: 4px 0 0;
`;

const Input = styled.input`
    width: 100%;
    background: ${C.bg};
    border: 1px solid ${C.border};
    border-radius: 6px;
    color: ${C.text};
    font-size: 15px;
    padding: 9px 12px;
    box-sizing: border-box;
    &:focus { outline: none; border-color: ${C.blue}; }
`;

const SaveBtn = styled.button`
    padding: 10px 28px;
    border: none;
    border-radius: 8px;
    background: ${C.blue};
    color: #fff;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    &:hover { opacity: 0.88; }
    &:disabled { opacity: 0.45; cursor: default; }
`;

const StatusMsg = styled.div`
    margin-top: 14px;
    font-size: 13px;
    color: ${({ error }) => (error ? C.red : C.accent)};
`;

const IndexNote = styled.div`
    margin-top: 14px;
    padding: 12px 16px;
    background: ${C.bg};
    border: 1px solid ${C.border};
    border-radius: 8px;
    font-size: 12px;
    color: ${C.muted};
    line-height: 1.5;
`;

// ── System health check ───────────────────────────────────────────────────────

function locale() {
    const parts = window.location.pathname.split('/');
    if (parts.length >= 2 && /^[a-z]{2}(-[A-Z]{2})?$/.test(parts[1])) return '/' + parts[1];
    return '/en-US';
}

function csrfToken() {
    const m = document.cookie.match(/splunkweb_csrf_token_\d+=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : '';
}

function authHeaders(contentType = 'application/json') {
    return {
        'Content-Type': contentType,
        'X-Splunk-Form-Key': csrfToken(),
        'X-Requested-With': 'XMLHttpRequest',
    };
}

async function checkKvRead() {
    const url = `${locale()}/splunkd/__raw/servicesNS/nobody/ponypollapp/storage/collections/data/ponypoll_questions?limit=1&output_mode=json`;
    const res = await fetch(url, { credentials: 'include', headers: authHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return 'Accessible';
}

async function checkKvWrite() {
    const base = `${locale()}/splunkd/__raw/servicesNS/nobody/ponypollapp/storage/collections/data/ponypoll_questions`;
    const postRes = await fetch(`${base}?output_mode=json`, {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders(),
        body: JSON.stringify({ _key: '_healthcheck_', quiz_id: '_test_', text: 'health check' }),
    });
    if (!postRes.ok) {
        const t = await postRes.text().catch(() => '');
        let msg = `HTTP ${postRes.status}`;
        try { msg = JSON.parse(t)?.messages?.[0]?.text || msg; } catch (_) {}
        throw new Error(msg);
    }
    try {
        await fetch(`${base}/_healthcheck_?output_mode=json`, {
            method: 'DELETE', credentials: 'include', headers: authHeaders(),
        });
    } catch (_) {
        // Cleanup best-effort; orphan doc is filtered out by listQuestions().
    }
    return 'Writable';
}

async function checkIndex(pollIndex) {
    const url = `${locale()}/splunkd/__raw/services/data/indexes/${encodeURIComponent(pollIndex)}?output_mode=json`;
    const res = await fetch(url, { credentials: 'include', headers: authHeaders() });
    if (res.status === 404) return { exists: false, count: 0 };
    if (!res.ok) {
        const t = await res.text().catch(() => '');
        let msg = `HTTP ${res.status}`;
        try { msg = JSON.parse(t)?.messages?.[0]?.text || msg; } catch (_) {}
        throw new Error(msg);
    }
    const json = await res.json();
    const count = parseInt(json?.entry?.[0]?.content?.totalEventCount ?? '0', 10);
    return { exists: true, count };
}

async function fetchUserContext() {
    const url = `${locale()}/splunkd/__raw/services/authentication/current-context?output_mode=json`;
    try {
        const res = await fetch(url, { credentials: 'include', headers: authHeaders() });
        if (!res.ok) return null;
        const json = await res.json();
        const content = json?.entry?.[0]?.content ?? {};
        return {
            username: content.username || '?',
            roles: Array.isArray(content.roles) ? content.roles : [],
        };
    } catch (_) {
        return null;
    }
}

async function checkMusicCatalogue() {
    const base = '/static/app/ponypollapp/audio/';
    const manifestRes = await fetch(`${base}manifest.json`, { credentials: 'include' });
    if (!manifestRes.ok) throw new Error(`manifest.json HTTP ${manifestRes.status}`);
    const manifest = await manifestRes.json();
    if (!Array.isArray(manifest)) throw new Error('manifest.json is not an array');
    const ids = manifest.map(t => t?.id);
    const required = ['default-lobby', 'default-question', 'default-win'];
    const missing  = required.filter(id => !ids.includes(id));
    if (missing.length) throw new Error(`Missing default entries: ${missing.join(', ')}`);

    // HEAD the 3 bundled files — silent failure here means the tarball was
    // truncated or the static handler is misconfigured.
    const files = ['lobby.mp3', 'question.ogg', 'win.mp3'];
    const probes = await Promise.all(files.map(async (f) => {
        try {
            const r = await fetch(`${base}${f}`, { method: 'HEAD', credentials: 'include' });
            return r.ok ? null : `${f} → HTTP ${r.status}`;
        } catch (e) {
            return `${f} → ${e.message}`;
        }
    }));
    const broken = probes.filter(Boolean);
    if (broken.length) throw new Error(broken.join('; '));
    return `${manifest.length} track${manifest.length === 1 ? '' : 's'}`;
}

async function checkAnswerSubmission(pollIndex, username) {
    const url = `${locale()}/splunkd/__raw/services/receivers/simple?sourcetype=ponypoll_healthcheck&index=${encodeURIComponent(pollIndex)}`;
    const body = `event=health_check source=ponypoll_settings splunk_user=${encodeURIComponent(username || 'unknown')}`;
    const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders('text/plain'),
        body,
    });
    if (!res.ok) {
        const t = await res.text().catch(() => '');
        let msg = `HTTP ${res.status}`;
        try { msg = JSON.parse(t)?.messages?.[0]?.text || msg; } catch (_) {}
        throw new Error(msg);
    }
    return 'Accepted';
}

const SC = {
    ok:   { bg: '#0e2a1a', border: '#2a6b3a', text: '#5CC05C', dot: '#5CC05C', label: 'OK'      },
    warn: { bg: '#2a1f00', border: '#6b4a00', text: '#F5A623', dot: '#F5A623', label: 'Warning'  },
    fail: { bg: '#2a0e0e', border: '#6b2020', text: '#DC4E41', dot: '#DC4E41', label: 'Failed'   },
    idle: { bg: '#23262F', border: '#3C3F4A', text: '#868A9C', dot: '#3C3F4A', label: '—'        },
    busy: { bg: '#23262F', border: '#3C3F4A', text: '#868A9C', dot: '#3C3F4A', label: '…'        },
};

function StatusDot({ state, detail }) {
    const c = SC[state] || SC.idle;
    const showDetail = detail && state !== 'busy' && state !== 'idle';
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '2px 9px', borderRadius: 20, flexShrink: 0,
                background: c.bg, border: `1px solid ${c.border}`,
                color: c.text, fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap',
            }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
                {c.label}
                {state === 'ok' && detail && (
                    <span style={{ fontWeight: 400, marginLeft: 2, opacity: 0.85 }}>{detail}</span>
                )}
            </span>
            {showDetail && state !== 'ok' && (
                <span style={{
                    fontSize: 11, color: c.text, opacity: 0.8,
                    textAlign: 'right', wordBreak: 'break-word',
                }}>
                    {detail}
                </span>
            )}
        </div>
    );
}

function SystemCheck({ pollIndex }) {
    const [results, setResults] = useState(null);
    const [running, setRunning] = useState(false);
    const [userCtx, setUserCtx] = useState(null);

    const run = async ({ writeProbe } = { writeProbe: false }) => {
        if (running) return;
        if (!pollIndex) return;
        setRunning(true);
        setResults({
            kv_read:    'busy',
            kv_write:   'busy',
            macro:      'busy',
            idx_exists: 'busy',
            idx_data:   'busy',
            music:      'busy',
            answers:    writeProbe ? 'busy' : 'idle',
        });
        const ctx = await fetchUserContext();
        setUserCtx(ctx);

        const next = {};

        // KV read
        try { await checkKvRead(); next.kv_read = { state: 'ok' }; }
        catch (e) { next.kv_read = { state: 'fail', detail: e.message }; }
        setResults(r => ({ ...r, ...next }));

        // KV write
        try { await checkKvWrite(); next.kv_write = { state: 'ok' }; }
        catch (e) { next.kv_write = { state: 'fail', detail: e.message }; }
        setResults(r => ({ ...r, ...next }));

        // Macro — must exist and resolve to a usable index name
        try {
            const macro = await getIndexMacro();
            if (!macro) {
                next.macro = { state: 'fail', detail: 'ponypoll_index macro missing — check the app install' };
            } else if (!macro.indexName) {
                next.macro = { state: 'fail', detail: `Unparseable definition: "${macro.definition || '(empty)'}"` };
            } else if (macro.indexName !== pollIndex) {
                next.macro = { state: 'warn', detail: `Macro resolves to "${macro.indexName}", Settings shows "${pollIndex}". Save Settings or reload.` };
            } else {
                next.macro = { state: 'ok', detail: `index=${macro.indexName}` };
            }
        } catch (e) {
            next.macro = { state: 'fail', detail: e.message };
        }
        setResults(r => ({ ...r, ...next }));

        // Index
        try {
            const { exists, count } = await checkIndex(pollIndex);
            if (!exists) {
                next.idx_exists = { state: 'fail', detail: `"${pollIndex}" not found — create it in Settings → Data → Indexes` };
                next.idx_data   = { state: 'idle' };
            } else {
                next.idx_exists = { state: 'ok' };
                next.idx_data   = count > 0
                    ? { state: 'ok', detail: `${count.toLocaleString()} events` }
                    : { state: 'warn', detail: 'Empty — run a quiz to populate' };
            }
        } catch (e) {
            next.idx_exists = { state: 'fail', detail: e.message };
            next.idx_data   = { state: 'idle' };
        }
        setResults(r => ({ ...r, ...next }));

        // Music catalogue — informational warn-only check. Music is non-essential
        // so a tarball missing audio doesn't fail the overall health badge.
        try {
            const detail = await checkMusicCatalogue();
            next.music = { state: 'ok', detail };
        } catch (e) {
            next.music = { state: 'warn', detail: e.message };
        }
        setResults(r => ({ ...r, ...next }));

        // Answer submission — only on explicit Re-check (writes an audited event).
        if (writeProbe) {
            try { await checkAnswerSubmission(pollIndex, ctx?.username); next.answers = { state: 'ok' }; }
            catch (e) { next.answers = { state: 'fail', detail: e.message }; }
        } else {
            next.answers = { state: 'idle', detail: 'Click Re-check to test (writes one event)' };
        }
        setResults({ ...next });

        setRunning(false);
    };

    // Auto-run on first render — skips the write probe to avoid polluting the index on every page load.
    // Re-runs whenever the configured index changes (Settings save).
    useEffect(() => { run({ writeProbe: false }); }, [pollIndex]); // eslint-disable-line react-hooks/exhaustive-deps

    const ROWS = [
        { key: 'kv_read',   label: 'KV Store readable',         hint: 'Quizzes and questions are loaded from Splunk KV Store.' },
        { key: 'kv_write',  label: 'KV Store writable',          hint: 'Required to create, edit, and save quiz questions.' },
        { key: 'macro',     label: 'ponypoll_index macro',       hint: 'The Splunk search macro the app uses to know which index holds quiz events.' },
        { key: 'idx_exists',label: 'Poll index exists',          hint: `Index "${pollIndex}" must exist before answers can be stored.` },
        { key: 'idx_data',  label: 'Poll index has data',        hint: 'At least one quiz has been completed and answers stored.' },
        { key: 'music',     label: 'Music catalogue OK',         hint: 'Bundled music manifest parses and the 3 default audio files are reachable. Non-essential.' },
        { key: 'answers',   label: 'Answer submission works',    hint: 'Verifies receivers/simple is accessible for the current user.' },
    ];

    const allOk = results && !running && ROWS.every(r => {
        const s = results[r.key];
        return typeof s === 'object' && (s.state === 'ok' || s.state === 'warn' || s.state === 'idle');
    });
    const anyFail = results && !running && ROWS.some(r => {
        const s = results[r.key];
        return typeof s === 'object' && s.state === 'fail';
    });

    const isAdmin = userCtx?.roles?.some(r =>
        ['admin', 'sc_admin', 'ponypoll_admin'].includes(r)
    );
    const hasUserRole = userCtx?.roles?.some(r =>
        ['admin', 'sc_admin', 'ponypoll_admin', 'ponypoll_user'].includes(r)
    );

    return (
        <div style={{ marginTop: 24, borderTop: `1px solid ${C.border}`, paddingTop: 20 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#fff', flexGrow: 1 }}>
                    System Check
                </span>
                {results && !running && (
                    <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: anyFail ? '#2a0e0e' : allOk ? '#0e2a1a' : '#2a1f00',
                        color: anyFail ? '#DC4E41' : allOk ? '#5CC05C' : '#F5A623',
                        border: `1px solid ${anyFail ? '#6b2020' : allOk ? '#2a6b3a' : '#6b4a00'}`,
                    }}>
                        {anyFail ? 'Needs attention' : allOk ? 'All OK' : 'Warnings'}
                    </span>
                )}
                <button
                    onClick={() => run({ writeProbe: true })}
                    disabled={running}
                    title="Re-check runs all probes, including writing one test event to the poll index."
                    style={{
                        padding: '5px 14px', border: `1px solid ${C.border}`,
                        borderRadius: 6, background: running ? C.surface : C.blue,
                        color: '#fff', fontSize: 12, fontWeight: 600,
                        cursor: running ? 'default' : 'pointer', opacity: running ? 0.6 : 1,
                    }}
                >
                    {running ? 'Checking…' : results ? 'Re-check' : 'Run check'}
                </button>
            </div>

            {/* Rows */}
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <colgroup>
                        <col style={{ width: '55%' }} />
                        <col style={{ width: '45%' }} />
                    </colgroup>
                    <tbody>
                        {ROWS.map(({ key, label, hint }, i) => {
                            const r = results?.[key];
                            const state = !results ? 'idle' : r === 'busy' ? 'busy' : (r?.state || 'idle');
                            const detail = r?.detail;
                            return (
                                <tr key={key} style={{
                                    borderBottom: i < ROWS.length - 1 ? `1px solid ${C.border}` : 'none',
                                    background: i % 2 === 0 ? C.surface : C.bg,
                                }}>
                                    <td style={{ padding: '9px 14px', fontSize: 13, color: C.text, fontWeight: 500 }}>
                                        {label}
                                        <div style={{ fontSize: 11, color: C.muted, marginTop: 2, fontWeight: 400 }}>{hint}</div>
                                    </td>
                                    <td style={{ padding: '9px 14px', textAlign: 'right' }}>
                                        <StatusDot state={state} detail={detail} />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Role hint — shown when checks complete and user context is known */}
            {results && !running && userCtx && (
                <div style={{
                    marginTop: 10, padding: '9px 12px', borderRadius: 6, fontSize: 12,
                    background: C.bg, border: `1px solid ${C.border}`, color: C.muted,
                    lineHeight: 1.6,
                }}>
                    Logged in as <strong style={{ color: C.text }}>{userCtx.username}</strong>
                    {' '}(roles: <code style={{ color: C.accent }}>{userCtx.roles.join(', ') || 'none'}</code>).
                    {!isAdmin && (
                        <span style={{ color: C.yellow }}>
                            {' '}To create and edit quizzes, assign the{' '}
                            <code style={{ color: C.yellow }}>ponypoll_admin</code> role in{' '}
                            Settings → Access Controls → Users.
                        </span>
                    )}
                    {!hasUserRole && (
                        <span style={{ color: C.yellow }}>
                            {' '}To participate in quizzes, assign the{' '}
                            <code style={{ color: C.yellow }}>ponypoll_user</code> role.
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Music toggle row ─────────────────────────────────────────────────────────
// Shared shape between the Music and SFX toggles, extracted so the music
// track section can sit between them without duplicating the JSX.
function renderToggle({ name, label, val, toggle, onHint, offHint }) {
    return (
        <Section key={name}>
            <Label>{label}</Label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                {[
                    { v: true,  text: 'On',  hint: onHint  },
                    { v: false, text: 'Off', hint: offHint },
                ].map(({ v, text, hint }) => (
                    <label key={text} style={{
                        flex: 1, display: 'flex', flexDirection: 'column', gap: 4,
                        padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                        border: `2px solid ${val === v ? C.blue : C.border}`,
                        background: val === v ? C.blue + '18' : 'transparent',
                    }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: val === v ? '#fff' : C.text, fontWeight: 600, fontSize: 13 }}>
                            <input
                                type="radio"
                                name={name}
                                checked={val === v}
                                onChange={() => toggle(v)}
                                style={{ accentColor: C.blue }}
                            />
                            {text}
                        </span>
                        <span style={{ fontSize: 11, color: C.muted, paddingLeft: 20 }}>{hint}</span>
                    </label>
                ))}
            </div>
            <Hint>Saved per browser — does not affect other participants.</Hint>
        </Section>
    );
}

// ── Music track section (per-slot dropdowns + 🔄 GitHub) ─────────────────────

const SLOT_LABELS = {
    lobby:    'Lobby track',
    question: 'Question track',
    win:      'Win track',
};

function describeTrack(track) {
    if (!track) return '';
    const tags = [];
    if (track.license) tags.push(track.license);
    tags.push(track._source === 'github' ? 'GitHub' : 'bundled');
    return `${track.name} (${tags.join(', ')})`;
}

const PREVIEW_MS = 8000;

function MusicTrackSection({
    tracks, tracksLoaded, selectedIds, musicOn,
    githubLoaded, githubError, githubBusy,
    onRefreshGitHub, onSelect,
}) {
    // Audition the currently-selected track for a few seconds without
    // committing. Uses a single private <audio> element with no overlap
    // with audio.js (which manages quiz playback in lobby/question/win
    // phases — none of which happen on the Settings page).
    const audioRef = useRef(null);
    const timerRef = useRef(null);
    const [previewing, setPreviewing] = useState(null);

    const stopPreview = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        const a = audioRef.current;
        if (a) {
            a.onended = null;
            a.pause();
            try { a.currentTime = 0; } catch (_) { /* ignore */ }
        }
        setPreviewing(null);
    }, []);

    const handlePreview = useCallback((slot) => {
        if (previewing === slot) {
            stopPreview();
            return;
        }
        const sel = selectedIds[slot];
        const id = tracks.some((t) => t.id === sel) ? sel : DEFAULT_IDS[slot];
        const track = tracks.find((t) => t.id === id);
        if (!track) return;
        const url = trackUrl(track);
        if (!url) return;
        stopPreview();
        if (!audioRef.current) audioRef.current = new Audio();
        const a = audioRef.current;
        a.src = url;
        a.volume = 0.6;
        a.onended = stopPreview;
        a.play()
            .then(() => {
                setPreviewing(slot);
                timerRef.current = setTimeout(stopPreview, PREVIEW_MS);
            })
            .catch((e) => {
                console.warn('[music-preview] play failed:', e?.message || e);
                stopPreview();
            });
    }, [previewing, selectedIds, tracks, stopPreview]);

    // Cleanup on unmount; also bail if the previewing slot's selected
    // track vanishes from the catalogue (e.g. after a GitHub refresh).
    useEffect(() => () => stopPreview(), [stopPreview]);
    useEffect(() => {
        if (!previewing) return;
        const sel = selectedIds[previewing];
        if (!tracks.some((t) => t.id === sel)) stopPreview();
    }, [tracks, previewing, selectedIds, stopPreview]);

    return (
        <Section>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <Label style={{ flex: 1, marginBottom: 0 }}>Music tracks</Label>
                <button
                    type="button"
                    onClick={onRefreshGitHub}
                    disabled={githubBusy}
                    title="Fetch the live music catalogue from GitHub. Requires outbound HTTPS to raw.githubusercontent.com."
                    style={{
                        padding: '8px 14px', minHeight: 36, borderRadius: 6,
                        border: `1px solid ${C.border}`,
                        background: githubBusy ? C.surface : 'transparent',
                        color: githubLoaded ? C.accent : C.text,
                        fontSize: 12, fontWeight: 600,
                        cursor: githubBusy ? 'default' : 'pointer',
                        opacity: githubBusy ? 0.6 : 1,
                        touchAction: 'manipulation',
                    }}
                >
                    {githubBusy
                        ? '… loading'
                        : githubLoaded ? '↻ GitHub (loaded)' : '↻ GitHub'}
                </button>
            </div>

            {!tracksLoaded ? (
                <Hint style={{ marginTop: 8 }}>Loading catalogue…</Hint>
            ) : (
                <div style={{ marginTop: 8, opacity: musicOn ? 1 : 0.5 }}>
                    {SLOTS.map((slot) => {
                        const ordered = listTracksForSlot(tracks, slot);
                        const recommended = ordered.filter((t) => t.recommended_slot === slot);
                        const other       = ordered.filter((t) => t.recommended_slot !== slot);
                        const sel = selectedIds[slot];
                        const known = ordered.some((t) => t.id === sel);
                        const fallbackId = DEFAULT_IDS[slot];
                        return (
                            <div key={slot} style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                marginBottom: 8,
                            }}>
                                <span style={{
                                    minWidth: 120, fontSize: 13, color: C.text, fontWeight: 500,
                                }}>
                                    {SLOT_LABELS[slot]}
                                </span>
                                <select
                                    value={known ? sel : fallbackId}
                                    onChange={(e) => onSelect(slot, e.target.value)}
                                    disabled={!musicOn}
                                    style={{
                                        flex: 1,
                                        padding: '7px 9px',
                                        background: C.bg,
                                        color: C.text,
                                        border: `1px solid ${C.border}`,
                                        borderRadius: 6,
                                        fontSize: 13,
                                        cursor: musicOn ? 'pointer' : 'default',
                                    }}
                                >
                                    {recommended.length > 0 && (
                                        <optgroup label={`Recommended for ${slot}`}>
                                            {recommended.map((t) => (
                                                <option key={t.id} value={t.id}>{describeTrack(t)}</option>
                                            ))}
                                        </optgroup>
                                    )}
                                    {other.length > 0 && (
                                        <optgroup label="Other tracks">
                                            {other.map((t) => (
                                                <option key={t.id} value={t.id}>{describeTrack(t)}</option>
                                            ))}
                                        </optgroup>
                                    )}
                                </select>
                                <button
                                    type="button"
                                    onClick={() => handlePreview(slot)}
                                    disabled={!tracksLoaded}
                                    title={previewing === slot
                                        ? 'Stop preview'
                                        : `Preview selected ${slot} track (up to ${PREVIEW_MS / 1000} s)`}
                                    aria-label={previewing === slot
                                        ? `Stop ${slot} preview`
                                        : `Preview ${slot} track`}
                                    aria-pressed={previewing === slot}
                                    style={{
                                        flexShrink: 0,
                                        width: 40, height: 40, padding: 0,
                                        borderRadius: 6,
                                        border: `1px solid ${C.border}`,
                                        background: previewing === slot ? C.accent : 'transparent',
                                        color: previewing === slot ? '#000' : C.text,
                                        fontSize: 14,
                                        fontWeight: 700,
                                        lineHeight: 1,
                                        cursor: tracksLoaded ? 'pointer' : 'default',
                                        opacity: tracksLoaded ? 1 : 0.5,
                                        touchAction: 'manipulation',
                                    }}
                                >
                                    {previewing === slot ? '■' : '▶'}
                                </button>
                            </div>
                        );
                    })}

                    {/* Per-slot missing-selection warnings */}
                    {SLOTS.map((slot) => {
                        const sel = selectedIds[slot];
                        const known = tracks.some(t => t.id === sel);
                        if (known) return null;
                        return (
                            <Hint key={`miss-${slot}`} style={{ color: C.yellow, marginTop: 4 }}>
                                Previous {SLOT_LABELS[slot].toLowerCase()} <code style={{ color: C.yellow }}>{sel}</code> is no longer in the catalogue — falling back to the default. Pick a track above to clear this warning.
                            </Hint>
                        );
                    })}

                    {githubError && (
                        <Hint style={{ color: C.red, marginTop: 8 }}>
                            GitHub catalogue unreachable: {githubError}. Bundled tracks still work.
                        </Hint>
                    )}

                    <Hint style={{ marginTop: 8 }}>
                        Per-slot picks saved per browser. Click <strong>↻ GitHub</strong> to add tracks from the live catalogue (requires outbound HTTPS).
                    </Hint>
                </div>
            )}
        </Section>
    );
}

export default function SettingsPage() {
    const [cfg, setCfg] = useState({ poll_subject: 'Pony Poll', active_quiz_id: '', default_view: 'poll' });
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState(null);
    const [versions, setVersions] = useState(null);
    const [musicOn, setMusicOn] = useState(() => isMusicEnabled());
    const [sfxOn,   setSfxOn]   = useState(() => isSfxEnabled());

    // ── Music track catalogue + per-slot selection ────────────────────────────
    // Catalogue is loaded on mount (bundled only). GitHub is fetched on demand
    // via the 🔄 GitHub button to avoid a third-party request on every page open.
    const [tracks, setTracks] = useState([]);
    const [tracksLoaded, setTracksLoaded] = useState(false);
    const [githubLoaded, setGithubLoaded] = useState(false);
    const [githubError,  setGithubError]  = useState(null);
    const [githubBusy,   setGithubBusy]   = useState(false);
    const [selectedIds,  setSelectedIds]  = useState(() => ({
        lobby:    getSelectedTrackId('lobby'),
        question: getSelectedTrackId('question'),
        win:      getSelectedTrackId('win'),
    }));

    const loadCatalogue = useCallback(async ({ includeGitHub, forceRefresh } = {}) => {
        const result = await loadMergedManifest({ includeGitHub, forceRefresh });
        setTracks(result.tracks);
        setTracksLoaded(true);
        setGithubLoaded(result.githubLoaded);
        setGithubError(result.githubError);
        // Push the same merged list into the audio player so user selections
        // resolve correctly without a hard reload of the page.
        refreshCatalogue({ includeGitHub: !!includeGitHub, forceRefresh: !!forceRefresh }).catch(() => {});
        return result;
    }, []);

    const handleRefreshGitHub = useCallback(async () => {
        if (githubBusy) return;
        setGithubBusy(true);
        invalidateGitHubCache();
        try {
            await loadCatalogue({ includeGitHub: true, forceRefresh: true });
        } finally {
            setGithubBusy(false);
        }
    }, [githubBusy, loadCatalogue]);

    const handleSelectTrack = useCallback((slot, trackId) => {
        setSelectedTrackId(slot, trackId);
        setSelectedIds((prev) => ({ ...prev, [slot]: trackId }));
    }, []);

    // ponypoll_index search macro state — independent of cfg because it lives
    // in macros.conf, not the KV config collection. `idxInput` mirrors the
    // text field; `idxMacro` is the last-saved/loaded value used by SystemCheck.
    const [idxInput, setIdxInput] = useState('');
    const [idxMacro, setIdxMacro] = useState('');
    const [idxLoading, setIdxLoading] = useState(true);
    const [idxError, setIdxError] = useState('');

    const handleMusicToggle = useCallback((val) => {
        setMusicEnabled(val);
        setMusicOn(val);
    }, []);

    const handleSfxToggle = useCallback((val) => {
        setSfxEnabled(val);
        setSfxOn(val);
    }, []);

    useEffect(() => {
        loadCatalogue({ includeGitHub: false }).catch(() => {});
        getVersionInfo().then(setVersions).catch(() => {});

        loadConfig()
            .then((c) => {
                setCfg({
                    ...c,
                    poll_subject: c.poll_subject || 'Pony Poll',
                    active_quiz_id: c.active_quiz_id || '',
                    default_view: c.default_view || 'poll',
                });
            })
            .catch((e) => setStatus({ error: true, msg: `Failed to load config: ${e.message}` }));

        getIndexMacro()
            .then((macro) => {
                const name = macro?.indexName || 'ponypoll';
                setIdxMacro(name);
                setIdxInput(name);
            })
            .catch(() => {
                setIdxMacro('ponypoll');
                setIdxInput('ponypoll');
            })
            .finally(() => setIdxLoading(false));
    }, []);

    const idxClean   = sanitizeIndexName(idxInput);
    const idxValid   = !!idxClean;
    const idxChanged = idxValid && idxClean !== idxMacro;

    const handleSave = async () => {
        setSaving(true);
        try {
            await saveConfig(cfg);
            // Persist the index macro alongside KV config, but only if it has
            // actually changed — avoids extra REST writes (and audit noise)
            // on every Save Settings click.
            if (idxChanged) {
                const saved = await saveIndexMacro(idxClean);
                setIdxMacro(saved);
                setIdxInput(saved);
            }
            setStatus({ error: false, msg: 'Settings saved.' });
        } catch (e) {
            setStatus({ error: true, msg: e.message });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Root>
            <Card>
                <Title>Poll Settings</Title>

                <Section>
                    <Label>Default view when opening the app</Label>
                    <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                        {[
                            { value: 'poll', label: '✏ Poll (full app)', hint: 'Editor, Analytics and Settings visible' },
                            { value: 'play', label: '▶ Play (participant only)', hint: 'Quiz only — no editor or admin tabs' },
                        ].map(({ value, label, hint }) => (
                            <label key={value} style={{
                                flex: 1, display: 'flex', flexDirection: 'column', gap: 4,
                                padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                                border: `2px solid ${cfg.default_view === value ? C.blue : C.border}`,
                                background: cfg.default_view === value ? C.blue + '18' : 'transparent',
                            }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: cfg.default_view === value ? '#fff' : C.text, fontWeight: 600, fontSize: 13 }}>
                                    <input
                                        type="radio"
                                        name="default_view"
                                        value={value}
                                        checked={cfg.default_view === value}
                                        onChange={() => setCfg({ ...cfg, default_view: value })}
                                        style={{ accentColor: C.blue }}
                                    />
                                    {label}
                                </span>
                                <span style={{ fontSize: 11, color: C.muted, paddingLeft: 20 }}>{hint}</span>
                            </label>
                        ))}
                    </div>
                    {cfg.default_view === 'play' && (
                        <Hint style={{ marginTop: 10, background: C.blue + '12', border: `1px solid ${C.blue}44`, borderRadius: 6, padding: '8px 10px' }}>
                            <strong style={{ color: C.blue }}>Admin access when Play is default:</strong><br />
                            • <strong>⚙ Admin</strong> button — bottom-right corner of the Play view (always visible)<br />
                            • <strong>URL bypass</strong> — bookmark <code style={{ color: C.accent }}>/app/ponypollapp/poll?admin</code> to always open the full app
                        </Hint>
                    )}
                </Section>

                <Section>
                    <Label>Poll title / subject</Label>
                    <Input
                        value={cfg.poll_subject}
                        onChange={(e) => setCfg({ ...cfg, poll_subject: e.target.value })}
                        placeholder="Pony Poll"
                    />
                    <Hint>Shown on the start screen and top bar during the poll.</Hint>
                </Section>

                <Section>
                    <Label>Splunk index for poll answers</Label>
                    <Input
                        value={idxInput}
                        onChange={(e) => {
                            setIdxInput(e.target.value);
                            setIdxError('');
                        }}
                        onBlur={() => {
                            if (!idxInput.trim()) return;
                            if (!sanitizeIndexName(idxInput)) {
                                setIdxError('Invalid index name. Use lowercase letters, digits, underscores or hyphens; 1–80 chars.');
                            }
                        }}
                        placeholder="ponypoll"
                        spellCheck={false}
                        autoCapitalize="off"
                        autoCorrect="off"
                        disabled={idxLoading}
                        style={idxError ? { borderColor: C.red } : undefined}
                    />
                    <Hint>
                        Backs the <code style={{ color: C.accent }}>ponypoll_index</code> search macro
                        — every analytics query, the System Check below and every event submission
                        use it. Default <code style={{ color: C.accent }}>ponypoll</code>. Change requires:
                        the destination index to exist; appropriate <code>srchIndexesAllowed</code>
                        for <code style={{ color: C.accent }}>ponypoll_user</code> / <code style={{ color: C.accent }}>ponypoll_admin</code>;
                        and write access for participants.
                    </Hint>
                    {idxError && (
                        <Hint style={{ color: C.red, marginTop: 6 }}>{idxError}</Hint>
                    )}
                    {idxChanged && !idxError && (
                        <Hint style={{ color: C.yellow, marginTop: 6 }}>
                            Unsaved change — current macro: <code style={{ color: C.accent }}>{idxMacro}</code>, new value: <code style={{ color: C.accent }}>{idxClean}</code>.
                        </Hint>
                    )}
                </Section>

                {renderToggle({
                    name:    'music_enabled',
                    label:   'Quiz music',
                    val:     musicOn,
                    toggle:  handleMusicToggle,
                    onHint:  'Lobby, question and win music play during the quiz',
                    offHint: 'No background music',
                })}

                <MusicTrackSection
                    tracks={tracks}
                    tracksLoaded={tracksLoaded}
                    selectedIds={selectedIds}
                    musicOn={musicOn}
                    githubLoaded={githubLoaded}
                    githubError={githubError}
                    githubBusy={githubBusy}
                    onRefreshGitHub={handleRefreshGitHub}
                    onSelect={handleSelectTrack}
                />

                {renderToggle({
                    name:    'sfx_enabled',
                    label:   'Sound effects',
                    val:     sfxOn,
                    toggle:  handleSfxToggle,
                    onHint:  'Click, submit and timeout sounds play during the quiz',
                    offHint: 'No sound effects',
                })}

                <SaveBtn onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving…' : 'Save Settings'}
                </SaveBtn>

                {status && (
                    <StatusMsg error={status.error}>
                        {status.error ? '✗' : '✓'} {status.msg}
                    </StatusMsg>
                )}

                <div style={{ marginTop: 16 }}>
                    <a
                        href={`/app/search/search?q=${encodeURIComponent(`search index=${idxMacro || 'ponypoll'}`)}&earliest=-7d&latest=now`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            color: C.blue, fontSize: 13, textDecoration: 'none',
                        }}
                    >
                        <IconSearch /> Search <code style={{ color: C.accent }}>index={idxMacro || 'ponypoll'}</code> in Splunk
                    </a>
                </div>

                <details style={{ marginTop: 14 }}>
                    <summary style={{
                        fontSize: 12, color: C.muted, cursor: 'pointer',
                        userSelect: 'none', listStyle: 'none', display: 'inline-flex',
                        alignItems: 'center', gap: 5,
                    }}>
                        <span style={{ fontSize: 11 }}>▸</span> How it works
                    </summary>
                    <IndexNote style={{ marginTop: 8 }}>
                        Answer and join events are written via <code>receivers/simple</code> using
                        the user's Splunk session. The <code style={{ color: C.accent }}>ponypoll_user</code> role
                        ships with the <code>edit_tcp</code> capability so every authenticated user
                        can submit answers — no HEC required. The default
                        <code style={{ color: C.accent, padding: '0 3px' }}>ponypoll</code> index is created
                        by this app's <code>indexes.conf</code>; pointing the
                        <code style={{ color: C.accent, padding: '0 3px' }}>ponypoll_index</code> macro
                        at a different index is allowed but does NOT auto-create it.<br /><br />
                        Every analytics query, dashboard panel and System Check resolves the
                        index through the <code style={{ color: C.accent }}>ponypoll_index</code>
                        search macro, so Pony Poll, Splunk dashboards and your own ad-hoc SPL
                        all stay consistent.<br /><br />
                        Quizzes and questions are stored in Splunk KV Store
                        (<code style={{ color: C.accent }}>ponypoll_questions</code>,
                        <code style={{ color: C.accent, padding: '0 3px' }}>ponypoll_quizzes</code>) —
                        no external storage needed.
                    </IndexNote>
                </details>

                <div style={{
                    marginTop: 28,
                    padding: '12px 16px',
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    fontSize: 12,
                    color: C.muted,
                    display: 'flex',
                    gap: 24,
                    flexWrap: 'wrap',
                }}>
                    <span>
                        <span style={{ fontWeight: 700, color: C.text }}>Splunk</span>
                        {' '}
                        {versions
                            ? <>
                                <span style={{ color: C.accent }}>{versions.splunkVersion}</span>
                                {versions.splunkBuild && (
                                    <span style={{ color: C.muted }}> (build {versions.splunkBuild})</span>
                                )}
                              </>
                            : <span style={{ opacity: 0.5 }}>loading…</span>
                        }
                    </span>
                    <span>
                        <span style={{ fontWeight: 700, color: C.text }}>Pony Poll app</span>
                        {' '}
                        {versions
                            ? <span style={{ color: C.accent }}>{versions.appVersion}</span>
                            : <span style={{ opacity: 0.5 }}>loading…</span>
                        }
                    </span>
                </div>

                <SystemCheck pollIndex={idxMacro || 'ponypoll'} />

                <div style={{
                    marginTop: 20, padding: '14px 0 0',
                    borderTop: `1px solid ${C.border}`,
                    fontSize: 12, color: C.muted, lineHeight: 1.6,
                }}>
                    Have a suggestion or found a bug?{' '}
                    <a
                        href="https://github.com/bautt/ponypollApp/issues"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: C.blue, textDecoration: 'none' }}
                    >
                        Open an issue
                    </a>
                    <span style={{ display: 'block', marginTop: 6, color: C.muted }}>
                        Quiz music:{' '}
                        <a href="https://opengameart.org/content/bossa-nova" target="_blank" rel="noopener noreferrer" style={{ color: C.muted }}>Bossa Nova</a>
                        {' '}(Joth, CC0) ·{' '}
                        <a href="https://opengameart.org/content/along-the-way" target="_blank" rel="noopener noreferrer" style={{ color: C.muted }}>Along the Way</a>
                        {' '}(congusbongus, CC0) ·{' '}
                        <a href="https://opengameart.org/content/win-music-1" target="_blank" rel="noopener noreferrer" style={{ color: C.muted }}>Win Music #1</a>
                        {' '}— all via{' '}
                        <a href="https://opengameart.org" target="_blank" rel="noopener noreferrer" style={{ color: C.muted }}>OpenGameArt.org</a>
                    </span>
                </div>
            </Card>
        </Root>
    );
}
