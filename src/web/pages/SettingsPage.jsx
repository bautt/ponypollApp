import React, { useState, useEffect, useCallback } from 'react';
import { isMusicEnabled, setMusicEnabled, isSfxEnabled, setSfxEnabled } from '../lib/audio';

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
    loadConfig, saveConfig, listIndexes, getVersionInfo,
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

const Select = styled.select`
    width: 100%;
    background: ${C.bg};
    border: 1px solid ${C.border};
    border-radius: 6px;
    color: ${C.text};
    font-size: 14px;
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
        setRunning(true);
        setResults({
            kv_read:    'busy',
            kv_write:   'busy',
            idx_exists: 'busy',
            idx_data:   'busy',
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

        // Index
        try {
            const { exists, count } = await checkIndex(pollIndex);
            if (!exists) {
                next.idx_exists = { state: 'fail', detail: 'Not found — create it in Settings → Data → Indexes' };
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
    useEffect(() => { run({ writeProbe: false }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const ROWS = [
        { key: 'kv_read',   label: 'KV Store readable',      hint: 'Quizzes and questions are loaded from Splunk KV Store.' },
        { key: 'kv_write',  label: 'KV Store writable',       hint: 'Required to create, edit, and save quiz questions.' },
        { key: 'idx_exists',label: 'Poll index exists',       hint: `Index "${pollIndex}" must exist before answers can be stored.` },
        { key: 'idx_data',  label: 'Poll index has data',     hint: 'At least one quiz has been completed and answers stored.' },
        { key: 'answers',   label: 'Answer submission works', hint: 'Verifies receivers/simple is accessible for the current user.' },
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

export default function SettingsPage() {
    const [cfg, setCfg] = useState({ poll_index: 'ponypoll', poll_subject: 'Pony Poll', active_quiz_id: '', default_view: 'poll' });
    const [indexes, setIndexes] = useState([]);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState(null);
    const [loadingIdx, setLoadingIdx] = useState(true);
    const [versions, setVersions] = useState(null);
    const [musicOn, setMusicOn] = useState(() => isMusicEnabled());
    const [sfxOn,   setSfxOn]   = useState(() => isSfxEnabled());

    const handleMusicToggle = useCallback((val) => {
        setMusicEnabled(val);
        setMusicOn(val);
    }, []);

    const handleSfxToggle = useCallback((val) => {
        setSfxEnabled(val);
        setSfxOn(val);
    }, []);

    useEffect(() => {
        getVersionInfo().then(setVersions).catch(() => {});

        Promise.all([loadConfig(), listIndexes()])
            .then(([c, idxList]) => {
                setCfg({
                    ...c,
                    poll_index: c.poll_index || 'ponypoll',
                    poll_subject: c.poll_subject || 'Pony Poll',
                    active_quiz_id: c.active_quiz_id || '',
                    default_view: c.default_view || 'poll',
                });
                setIndexes(idxList);
            })
            .catch((e) => setStatus({ error: true, msg: `Failed to load config: ${e.message}` }))
            .finally(() => setLoadingIdx(false));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await saveConfig(cfg);
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
                            • <strong>⚙ Admin</strong> link — hover the bottom-right corner of the Play view<br />
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
                    {loadingIdx ? (
                        <Input value="Loading indexes…" readOnly />
                    ) : indexes.length > 0 ? (
                        <Select
                            value={cfg.poll_index}
                            onChange={(e) => setCfg({ ...cfg, poll_index: e.target.value })}
                        >
                            {indexes.map((idx) => (
                                <option key={idx} value={idx}>{idx}</option>
                            ))}
                        </Select>
                    ) : (
                        <Input
                            value={cfg.poll_index}
                            onChange={(e) => setCfg({ ...cfg, poll_index: e.target.value })}
                            placeholder="ponypoll"
                        />
                    )}
                    <Hint>
                        Answer events are written to this index as sourcetype&nbsp;
                        <code style={{ color: C.accent }}>ponypoll_answer</code>.
                    </Hint>
                </Section>

                {[
                    {
                        name:    'music_enabled',
                        label:   'Quiz music',
                        val:     musicOn,
                        toggle:  handleMusicToggle,
                        onHint:  'Lobby, question and win music play during the quiz',
                        offHint: 'No background music',
                    },
                    {
                        name:    'sfx_enabled',
                        label:   'Sound effects',
                        val:     sfxOn,
                        toggle:  handleSfxToggle,
                        onHint:  'Click, submit and timeout sounds play during the quiz',
                        offHint: 'No sound effects',
                    },
                ].map(({ name, label, val, toggle, onHint, offHint }) => (
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
                ))}

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
                        href={`/app/search/search?q=search%20index%3D${encodeURIComponent(cfg.poll_index || 'ponypoll')}&earliest=-7d&latest=now`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            color: C.blue, fontSize: 13, textDecoration: 'none',
                        }}
                    >
                        <IconSearch /> Search <code style={{ color: C.accent }}>index={cfg.poll_index || 'ponypoll'}</code> in Splunk
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
                        can submit answers — no HEC required. The
                        <code style={{ color: C.accent, padding: '0 3px' }}>ponypoll</code> index is created
                        by this app's <code>indexes.conf</code>, but you can choose any existing index
                        from the list above.<br /><br />
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

                <SystemCheck pollIndex={cfg.poll_index || 'ponypoll'} />

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
