import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { loadConfig, saveConfig, listIndexes, listQuizzes, updateQuiz } from '../lib/kvstore';

const C = {
    bg: '#1B1D22', surface: '#23262F', border: '#3C3F4A',
    text: '#D0D4E3', muted: '#868A9C', accent: '#5CC05C',
    blue: '#009CDE', red: '#DC4E41',
};

const Root = styled.div`
    min-height: calc(100vh - 90px);
    background: ${C.bg};
    color: ${C.text};
    font-family: 'Splunk Platform Sans', 'Proxima Nova', sans-serif;
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
    const [cfg, setCfg] = useState({ poll_index: 'ponypoll', poll_subject: 'Pony Poll', active_quiz_id: '' });
    const [indexes, setIndexes] = useState([]);
    const [quizzes, setQuizzes] = useState([]);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState(null);
    const [loadingIdx, setLoadingIdx] = useState(true);
    const [questionLimit, setQuestionLimit] = useState(null);

    useEffect(() => {
        Promise.all([loadConfig(), listIndexes(), listQuizzes()])
            .then(([c, idxList, qList]) => {
                const activeId = c.active_quiz_id || '';
                setCfg({
                    poll_index: c.poll_index || 'ponypoll',
                    poll_subject: c.poll_subject || 'Pony Poll',
                    active_quiz_id: activeId,
                    default_view: c.default_view || 'poll',
                });
                setIndexes(idxList);
                setQuizzes(qList);
                const activeQuiz = qList.find((q) => q._key === activeId);
                setQuestionLimit(activeQuiz?.question_limit ? Number(activeQuiz.question_limit) : null);
            })
            .catch((e) => setStatus({ error: true, msg: `Failed to load config: ${e.message}` }))
            .finally(() => setLoadingIdx(false));
    }, []);

    const handleQuizChange = (newId) => {
        setCfg((prev) => ({ ...prev, active_quiz_id: newId }));
        const quiz = quizzes.find((q) => q._key === newId);
        setQuestionLimit(quiz?.question_limit ? Number(quiz.question_limit) : null);
    };

    const handleLimitChange = async (newLimit) => {
        setQuestionLimit(newLimit);
        const quiz = quizzes.find((q) => q._key === cfg.active_quiz_id);
        if (!quiz) return;
        try {
            await updateQuiz(cfg.active_quiz_id, { ...quiz, question_limit: newLimit || null });
            const freshQuizzes = await listQuizzes();
            setQuizzes(freshQuizzes);
            setStatus({
                error: false,
                msg: newLimit
                    ? `Quiz will play ${newLimit} random questions per session.`
                    : 'Quiz will play all questions in order.',
            });
        } catch (e) {
            setStatus({ error: true, msg: `Failed to save limit: ${e.message}` });
        }
    };

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
                    <Label>Active quiz (shown to participants)</Label>
                    {quizzes.length > 0 ? (
                        <Select
                            value={cfg.active_quiz_id}
                            onChange={(e) => handleQuizChange(e.target.value)}
                        >
                            {quizzes.map((q) => (
                                <option key={q._key} value={q._key}>{q.name}</option>
                            ))}
                        </Select>
                    ) : (
                        <Input value="No quizzes yet — create one in the Editor" readOnly />
                    )}
                    <Hint>
                        This is the quiz participants see when they open the Poll tab. Switch quizzes
                        here without affecting what the editor is currently browsing.
                    </Hint>
                </Section>

                <Section>
                    <Label>🎲 Random question subset</Label>
                    <Select
                        value={questionLimit || ''}
                        onChange={(e) => handleLimitChange(e.target.value ? Number(e.target.value) : null)}
                        disabled={!cfg.active_quiz_id}
                    >
                        <option value="">All questions (play in saved order)</option>
                        {[3, 5, 6, 8, 10, 12, 15, 20, 25, 30].map((n) => (
                            <option key={n} value={n}>Random {n} questions per session</option>
                        ))}
                    </Select>
                    <Hint>
                        When set, each session draws this many questions at random from the full pool —
                        every participant gets a different shuffle. Saved immediately to the quiz.
                    </Hint>
                </Section>

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
                        🔍 Search <code style={{ color: C.accent }}>index={cfg.poll_index || 'ponypoll'}</code> in Splunk
                    </a>
                </div>

                <IndexNote>
                    <strong style={{ color: C.text }}>How it works</strong><br />
                    Poll answer events are written directly to Splunk via the app's REST handler — no
                    HEC token required. The <code style={{ color: C.accent }}>ponypoll</code> index is
                    created by this app's <code>indexes.conf</code>, but you can choose any existing
                    index from the list above.<br /><br />
                    Questions and images are stored in Splunk KV Store
                    (<code style={{ color: C.accent }}>ponypoll_questions</code>) — no external
                    storage needed.
                </IndexNote>

                <div style={{
                    marginTop: 32, padding: '14px 18px',
                    borderTop: `1px solid ${C.border}`,
                    fontSize: 12, color: C.muted, lineHeight: 1.6,
                }}>
                    💬 Have a suggestion or found a bug?{' '}
                    <a
                        href="mailto:tbaublys@splunk.com"
                        style={{ color: C.blue, textDecoration: 'none' }}
                    >
                        tbaublys@splunk.com
                    </a>
                </div>
            </Card>
        </Root>
    );
}
