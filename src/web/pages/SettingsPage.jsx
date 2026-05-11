import React, { useState, useEffect } from 'react';

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

export default function SettingsPage() {
    const [cfg, setCfg] = useState({ poll_index: 'ponypoll', poll_subject: 'Pony Poll', active_quiz_id: '', default_view: 'poll' });
    const [indexes, setIndexes] = useState([]);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState(null);
    const [loadingIdx, setLoadingIdx] = useState(true);
    const [versions, setVersions] = useState(null);

    useEffect(() => {
        getVersionInfo().then(setVersions).catch(() => {});

        Promise.all([loadConfig(), listIndexes()])
            .then(([c, idxList]) => {
                setCfg({
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

                <IndexNote>
                    <strong style={{ color: C.text }}>How it works</strong><br />
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

                <div style={{
                    marginTop: 16, padding: '14px 18px',
                    borderTop: `1px solid ${C.border}`,
                    fontSize: 12, color: C.muted, lineHeight: 1.6,
                }}>
                    Have a suggestion or found a bug?{' '}
                    <a
                        href="https://github.com/bautt/ponypollApp/issues"
                        style={{ color: C.blue, textDecoration: 'none' }}
                    >
                        Open an issue
                    </a>
                </div>
            </Card>
        </Root>
    );
}
