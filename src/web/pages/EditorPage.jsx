import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
    listQuestions, deleteQuestion, saveAllQuestions,
} from '../lib/kvstore';
import {
    fromKvDoc, toKvDoc, newQuestion, defaultOptions, QUESTION_TYPES, SEED_QUESTIONS,
} from '../lib/questions';

const C = {
    bg: '#1B1D22', surface: '#23262F', border: '#3C3F4A',
    text: '#D0D4E3', muted: '#868A9C', accent: '#5CC05C',
    blue: '#009CDE', red: '#DC4E41', orange: '#ED8B00',
};

// ── Shared styled primitives ───────────────────────────────────────────────────

const Root = styled.div`
    display: flex;
    min-height: calc(100vh - 90px);
    background: ${C.bg};
    color: ${C.text};
    font-family: 'Splunk Platform Sans', 'Proxima Nova', sans-serif;
`;

const Sidebar = styled.div`
    width: 240px;
    flex-shrink: 0;
    background: ${C.surface};
    border-right: 1px solid ${C.border};
    display: flex;
    flex-direction: column;
`;

const SidebarHeader = styled.div`
    padding: 14px 16px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${C.muted};
    border-bottom: 1px solid ${C.border};
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const AddBtn = styled.button`
    padding: 3px 10px;
    border-radius: 6px;
    border: 1px solid ${C.blue};
    background: transparent;
    color: ${C.blue};
    font-size: 12px;
    cursor: pointer;
    &:hover { background: ${C.blue}22; }
`;

const QList = styled.div`
    flex: 1;
    overflow-y: auto;
`;

const QItem = styled.div`
    padding: 10px 16px;
    border-bottom: 1px solid ${C.border}55;
    cursor: pointer;
    background: ${({ active }) => (active ? C.blue + '22' : 'transparent')};
    border-left: 3px solid ${({ active }) => (active ? C.blue : 'transparent')};
    font-size: 13px;
    color: ${({ active }) => (active ? '#fff' : C.text)};
    &:hover { background: rgba(255,255,255,0.04); }
`;

const QItemText = styled.div`
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const QItemType = styled.div`
    font-size: 11px;
    color: ${C.muted};
    margin-top: 2px;
`;

const Main = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
`;

const Toolbar = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 20px;
    background: ${C.surface};
    border-bottom: 1px solid ${C.border};
    flex-wrap: wrap;
`;

const ToolbarTitle = styled.h2`
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    flex: 1;
`;

const TBtn = styled.button`
    padding: 7px 16px;
    border-radius: 6px;
    border: 1px solid ${({ danger, primary }) =>
        danger ? C.red : primary ? C.blue : C.border};
    background: ${({ danger, primary }) =>
        danger ? C.red + '22' : primary ? C.blue : 'transparent'};
    color: ${({ danger, primary }) =>
        danger ? C.red : primary ? '#fff' : C.text};
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    &:hover { opacity: 0.8; }
    &:disabled { opacity: 0.4; cursor: default; }
`;

const EditorArea = styled.div`
    padding: 24px 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    max-width: 800px;
`;

const Label = styled.label`
    display: block;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${C.muted};
    margin-bottom: 6px;
`;

const Input = styled.input`
    width: 100%;
    background: ${C.surface};
    border: 1px solid ${C.border};
    border-radius: 6px;
    color: ${C.text};
    font-size: 15px;
    padding: 9px 12px;
    box-sizing: border-box;
    &:focus { outline: none; border-color: ${C.blue}; }
`;

const Textarea = styled.textarea`
    width: 100%;
    background: ${C.surface};
    border: 1px solid ${C.border};
    border-radius: 6px;
    color: ${C.text};
    font-size: 15px;
    padding: 9px 12px;
    box-sizing: border-box;
    resize: vertical;
    min-height: 72px;
    &:focus { outline: none; border-color: ${C.blue}; }
`;

const Select = styled.select`
    background: ${C.surface};
    border: 1px solid ${C.border};
    border-radius: 6px;
    color: ${C.text};
    font-size: 14px;
    padding: 8px 12px;
    &:focus { outline: none; border-color: ${C.blue}; }
`;

const TypeToggle = styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
`;

const TypeBtn = styled.button`
    padding: 7px 14px;
    border-radius: 6px;
    border: 1px solid ${({ active }) => (active ? C.blue : C.border)};
    background: ${({ active }) => (active ? C.blue + '33' : 'transparent')};
    color: ${({ active }) => (active ? C.blue : C.muted)};
    font-size: 13px;
    cursor: pointer;
    &:hover { border-color: ${C.blue}; }
`;

const OptionRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const OptionBadge = styled.span`
    width: 28px;
    height: 28px;
    border-radius: 5px;
    background: ${({ color }) => color};
    color: #fff;
    font-weight: 700;
    font-size: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
`;

const OPTION_COLORS = ['#1F77B4', '#65A637', '#ED8B00', '#AF6DC7'];

const CheckBtn = styled.button`
    width: 28px;
    height: 28px;
    border-radius: 5px;
    border: 2px solid ${({ correct }) => (correct ? C.accent : C.border)};
    background: ${({ correct }) => (correct ? C.accent + '33' : 'transparent')};
    color: ${({ correct }) => (correct ? C.accent : C.muted)};
    font-size: 16px;
    cursor: pointer;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    &:hover { border-color: ${C.accent}; }
`;

const SliderTrack = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 4px;
`;

const SliderInput = styled.input`
    flex: 1;
    accent-color: ${C.blue};
    height: 4px;
`;

const SliderValue = styled.span`
    min-width: 48px;
    text-align: right;
    font-size: 20px;
    font-weight: 700;
    color: ${C.blue};
`;

const StatusBar = styled.div`
    padding: 8px 20px;
    background: ${C.surface};
    border-top: 1px solid ${C.border};
    font-size: 12px;
    color: ${({ error }) => (error ? C.red : C.accent)};
`;

const EmptyState = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: ${C.muted};
    font-size: 15px;
`;

// ── Main component ─────────────────────────────────────────────────────────────

export default function EditorPage() {
    const [questions, setQuestions] = useState([]);
    const [activeIdx, setActiveIdx] = useState(null);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        listQuestions()
            .then((docs) => {
                if (docs.length === 0) {
                    // Seed with example questions
                    const seeded = SEED_QUESTIONS.map((q, i) => ({ ...q, _key: '', sort_order: i }));
                    setQuestions(seeded);
                } else {
                    setQuestions(docs.map(fromKvDoc));
                }
            })
            .catch((e) => setStatus({ error: true, msg: e.message }))
            .finally(() => setLoading(false));
    }, []);

    const active = activeIdx !== null ? questions[activeIdx] : null;

    const setActive = (field, value) => {
        setQuestions((prev) => {
            const copy = [...prev];
            copy[activeIdx] = { ...copy[activeIdx], [field]: value };
            return copy;
        });
    };

    const handleTypeChange = (type) => {
        const opts = defaultOptions(type);
        setActive('type', type);
        setActive('options', opts);
    };

    const handleOptionText = (optIdx, text) => {
        const opts = [...active.options];
        opts[optIdx] = { ...opts[optIdx], text };
        setActive('options', opts);
    };

    const handleOptionCorrect = (optIdx) => {
        const isSingle = active.type === 'single' || active.type === 'yesno';
        const opts = active.options.map((o, i) => ({
            ...o,
            correct: isSingle ? i === optIdx : (i === optIdx ? !o.correct : o.correct),
        }));
        setActive('options', opts);
    };

    const addQuestion = () => {
        const q = newQuestion({ sort_order: questions.length });
        setQuestions((prev) => [...prev, q]);
        setActiveIdx(questions.length);
    };

    const deleteActive = async () => {
        if (active === null) return;
        if (!window.confirm('Delete this question?')) return;
        try {
            if (active._key) await deleteQuestion(active._key);
            const next = questions.filter((_, i) => i !== activeIdx);
            setQuestions(next);
            setActiveIdx(next.length > 0 ? Math.min(activeIdx, next.length - 1) : null);
            setStatus({ error: false, msg: 'Question deleted.' });
        } catch (e) {
            setStatus({ error: true, msg: e.message });
        }
    };

    const saveAll = async () => {
        setSaving(true);
        try {
            await saveAllQuestions(questions.map((q, i) => ({ ...toKvDoc(q), sort_order: i })));
            // Reload to get _keys from Splunk
            const docs = await listQuestions();
            setQuestions(docs.map(fromKvDoc));
            setStatus({ error: false, msg: 'All questions saved to KV Store.' });
        } catch (e) {
            setStatus({ error: true, msg: e.message });
        } finally {
            setSaving(false);
        }
    };

    const moveUp = () => {
        if (activeIdx <= 0) return;
        const qs = [...questions];
        [qs[activeIdx - 1], qs[activeIdx]] = [qs[activeIdx], qs[activeIdx - 1]];
        setQuestions(qs);
        setActiveIdx(activeIdx - 1);
    };

    const moveDown = () => {
        if (activeIdx >= questions.length - 1) return;
        const qs = [...questions];
        [qs[activeIdx], qs[activeIdx + 1]] = [qs[activeIdx + 1], qs[activeIdx]];
        setQuestions(qs);
        setActiveIdx(activeIdx + 1);
    };

    return (
        <Root>
            {/* Sidebar */}
            <Sidebar>
                <SidebarHeader>
                    Questions ({questions.length})
                    <AddBtn onClick={addQuestion}>+ Add</AddBtn>
                </SidebarHeader>
                <QList>
                    {loading && (
                        <QItem style={{ cursor: 'default', color: C.muted }}>Loading…</QItem>
                    )}
                    {questions.map((q, i) => (
                        <QItem key={i} active={i === activeIdx} onClick={() => setActiveIdx(i)}>
                            <QItemText>{i + 1}. {q.text || <em style={{ color: C.muted }}>Untitled</em>}</QItemText>
                            <QItemType>
                                {QUESTION_TYPES.find((t) => t.value === q.type)?.label || q.type}
                                {' · '}⏱ {q.timeLimit}s
                            </QItemType>
                        </QItem>
                    ))}
                </QList>
            </Sidebar>

            {/* Main editor */}
            <Main>
                <Toolbar>
                    <ToolbarTitle>
                        {active ? `Editing Q${activeIdx + 1}` : 'Question Editor'}
                    </ToolbarTitle>
                    <TBtn onClick={moveUp} disabled={activeIdx === null || activeIdx === 0}>↑ Up</TBtn>
                    <TBtn onClick={moveDown} disabled={activeIdx === null || activeIdx >= questions.length - 1}>↓ Down</TBtn>
                    <TBtn danger onClick={deleteActive} disabled={active === null}>Delete</TBtn>
                    <TBtn primary onClick={saveAll} disabled={saving}>
                        {saving ? 'Saving…' : '💾 Save All'}
                    </TBtn>
                </Toolbar>

                {active === null ? (
                    <EmptyState>
                        <div>← Select a question or click <strong>+ Add</strong></div>
                    </EmptyState>
                ) : (
                    <EditorArea>
                        {/* Question text */}
                        <div>
                            <Label>Question text</Label>
                            <Textarea
                                value={active.text}
                                onChange={(e) => setActive('text', e.target.value)}
                                placeholder="Type your question…"
                            />
                        </div>

                        {/* Type + time */}
                        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                            <div style={{ flex: 2, minWidth: 220 }}>
                                <Label>Question type</Label>
                                <TypeToggle>
                                    {QUESTION_TYPES.map((t) => (
                                        <TypeBtn
                                            key={t.value}
                                            active={active.type === t.value}
                                            onClick={() => handleTypeChange(t.value)}
                                        >
                                            {t.label}
                                        </TypeBtn>
                                    ))}
                                </TypeToggle>
                            </div>
                            <div style={{ flex: 1, minWidth: 120 }}>
                                <Label>Time limit (seconds)</Label>
                                <Select
                                    value={active.timeLimit}
                                    onChange={(e) => setActive('timeLimit', Number(e.target.value))}
                                >
                                    {[10, 15, 20, 25, 30, 45, 60, 90, 120].map((s) => (
                                        <option key={s} value={s}>{s}s</option>
                                    ))}
                                </Select>
                            </div>
                        </div>

                        {/* Slider config */}
                        {active.type === 'slider' && (
                            <div>
                                <Label>Slider configuration</Label>
                                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                                    <div style={{ flex: 1, minWidth: 80 }}>
                                        <Label>Min</Label>
                                        <Input
                                            type="number"
                                            value={active.sliderMin ?? 1}
                                            onChange={(e) => setActive('sliderMin', Number(e.target.value))}
                                        />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 80 }}>
                                        <Label>Max</Label>
                                        <Input
                                            type="number"
                                            value={active.sliderMax ?? 10}
                                            onChange={(e) => setActive('sliderMax', Number(e.target.value))}
                                        />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 80 }}>
                                        <Label>Step</Label>
                                        <Input
                                            type="number"
                                            value={active.sliderStep ?? 1}
                                            onChange={(e) => setActive('sliderStep', Number(e.target.value))}
                                        />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 80 }}>
                                        <Label>Unit label</Label>
                                        <Input
                                            value={active.sliderUnit ?? ''}
                                            placeholder="e.g. /10 or ★"
                                            onChange={(e) => setActive('sliderUnit', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <Label>Preview</Label>
                                <SliderTrack>
                                    <span style={{ fontSize: 12, color: C.muted }}>{active.sliderMin ?? 1}</span>
                                    <SliderInput
                                        type="range"
                                        min={active.sliderMin ?? 1}
                                        max={active.sliderMax ?? 10}
                                        step={active.sliderStep ?? 1}
                                        defaultValue={Math.round(((active.sliderMin ?? 1) + (active.sliderMax ?? 10)) / 2)}
                                        readOnly
                                    />
                                    <span style={{ fontSize: 12, color: C.muted }}>{active.sliderMax ?? 10}</span>
                                </SliderTrack>
                                <div style={{ marginTop: 10, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', color: C.muted, fontSize: 13 }}>
                                    Slider questions collect a numeric value — no correct answer. Responses are stored in Splunk.
                                </div>
                            </div>
                        )}

                        {/* Answer options (single / multi / yesno) */}
                        {(active.type === 'single' || active.type === 'multi' || active.type === 'yesno') && (
                            <div>
                                <Label>
                                    Answers
                                    {active.type !== 'yesno' && (
                                        <span style={{ marginLeft: 8, fontWeight: 400, textTransform: 'none', fontSize: 11, color: C.muted }}>
                                            — tick ✓ to mark correct answer(s)
                                        </span>
                                    )}
                                </Label>
                                {active.options.map((opt, i) => (
                                    <OptionRow key={opt.id} style={{ marginBottom: 8 }}>
                                        <OptionBadge color={OPTION_COLORS[i] || '#666'}>
                                            {opt.id}
                                        </OptionBadge>
                                        <Input
                                            value={opt.text}
                                            onChange={(e) => handleOptionText(i, e.target.value)}
                                            placeholder={`Option ${opt.id}`}
                                            readOnly={active.type === 'yesno'}
                                            style={active.type === 'yesno' ? { opacity: 0.6 } : {}}
                                        />
                                        <CheckBtn
                                            correct={opt.correct}
                                            onClick={() => handleOptionCorrect(i)}
                                            title={opt.correct ? 'Marked correct' : 'Mark as correct'}
                                        >
                                            {opt.correct ? '✓' : '○'}
                                        </CheckBtn>
                                    </OptionRow>
                                ))}
                            </div>
                        )}

                        {active.type === 'freetext' && (
                            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 16px', color: C.muted, fontSize: 13 }}>
                                Free-text questions collect open-ended answers (up to 100 characters). Responses are stored in Splunk — no correct answer is marked.
                            </div>
                        )}
                    </EditorArea>
                )}

                {status && (
                    <StatusBar error={status.error}>
                        {status.error ? '✗' : '✓'} {status.msg}
                    </StatusBar>
                )}
            </Main>

        </Root>
    );
}
