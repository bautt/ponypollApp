/**
 * QuestionEditor — the right-hand editing panel for a single question.
 * All state lives in EditorPage/index.jsx; this component is pure rendering.
 */
import React from 'react';

const IconImage = () => (
    <svg viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="currentColor"
        strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
        style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
        <rect x="1" y="2" width="14" height="12" rx="1.5" />
        <circle cx="5.5" cy="6" r="1.2" />
        <polyline points="1,12 5,8 8,11 10.5,8.5 15,13" />
    </svg>
);
import { C, OPTION_COLORS } from '../../lib/theme';
import { QUESTION_TYPES } from '../../lib/questions';
import {
    EditorArea, Label, Input, Textarea, Select,
    TypeToggle, TypeBtn, OptionRow, OptionBadge, CheckBtn,
    SliderTrack, SliderInput, TBtn,
} from './styles';

export default function QuestionEditor({
    active, activeIdx,
    onSetActive,
    onTypeChange, onOptionText, onOptionCorrect,
    onAddOption, onRemoveOption,
    onImageUpload, onRemoveImage,
    onSave,
    imageInputRef, imageError, imageUploading, savingOne,
}) {
    return (
        <EditorArea>
            {/* Question text */}
            <div>
                <Label>Question text</Label>
                <Textarea
                    value={active.text}
                    onChange={(e) => onSetActive('text', e.target.value)}
                    placeholder="Type your question…"
                />
            </div>

            {/* Image (optional) */}
            <div>
                <Label>
                    Image
                    <span style={{ marginLeft: 8, fontWeight: 400, textTransform: 'none', fontSize: 11, color: C.muted }}>
                        — optional · shown above the question text for all participants
                    </span>
                </Label>
                <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    style={{ display: 'none' }}
                    onChange={onImageUpload}
                />
                {active.image ? (
                    <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
                        <img
                            src={active.image}
                            alt="Question illustration"
                            style={{
                                maxWidth: '100%', maxHeight: 220,
                                borderRadius: 8, border: `1px solid ${C.border}`,
                                display: 'block',
                            }}
                        />
                        <button
                            onClick={onRemoveImage}
                            title="Remove image"
                            style={{
                                position: 'absolute', top: 6, right: 6,
                                background: 'rgba(0,0,0,0.72)', border: 'none', borderRadius: '50%',
                                width: 26, height: 26, cursor: 'pointer', color: '#fff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 14, lineHeight: 1,
                            }}
                        >✕</button>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 5 }}>
                            ~{Math.round(active.image.length * 0.75 / 1024)} KB stored · click ✕ to remove
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => { imageInputRef.current.click(); }}
                        disabled={imageUploading}
                        style={{
                            background: C.bg, border: `1px dashed ${C.border}`,
                            borderRadius: 8, padding: '14px 20px', cursor: imageUploading ? 'default' : 'pointer',
                            color: C.muted, fontSize: 13,
                            display: 'flex', alignItems: 'center', gap: 10,
                            opacity: imageUploading ? 0.6 : 1,
                        }}
                    >
                        <IconImage />
                        {imageUploading ? 'Compressing…' : 'Add image  (JPEG / PNG / WebP · max 1 MB)'}
                    </button>
                )}
                {imageError && (
                    <div style={{ fontSize: 12, color: C.red, marginTop: 5 }}>✗ {imageError}</div>
                )}
            </div>

            {/* Type + time */}
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                <div style={{ flex: 2, minWidth: 220 }}>
                    <Label>Question type</Label>
                    <TypeToggle>
                        {QUESTION_TYPES.map((t) => (
                            <TypeBtn
                                key={t.value}
                                $active={active.type === t.value}
                                onClick={() => onTypeChange(t.value)}
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
                        onChange={(e) => onSetActive('timeLimit', Number(e.target.value))}
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
                        {[['Min', 'sliderMin', 1], ['Max', 'sliderMax', 10], ['Step', 'sliderStep', 1]].map(([lbl, fld, def]) => (
                            <div key={fld} style={{ flex: 1, minWidth: 80 }}>
                                <Label>{lbl}</Label>
                                <Input
                                    type="number"
                                    value={active[fld] ?? def}
                                    onChange={(e) => onSetActive(fld, Number(e.target.value))}
                                />
                            </div>
                        ))}
                        <div style={{ flex: 1, minWidth: 80 }}>
                            <Label>Unit label</Label>
                            <Input
                                value={active.sliderUnit ?? ''}
                                placeholder="e.g. /10 or ★"
                                onChange={(e) => onSetActive('sliderUnit', e.target.value)}
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
                        Slider questions collect a numeric value — no correct answer.
                    </div>
                </div>
            )}

            {/* Answer options — choice types */}
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
                            <OptionBadge color={OPTION_COLORS[i] || '#666'}>{opt.id}</OptionBadge>
                            <Input
                                value={opt.text}
                                onChange={(e) => onOptionText(i, e.target.value)}
                                placeholder={`Option ${opt.id}`}
                                readOnly={active.type === 'yesno'}
                                style={active.type === 'yesno' ? { opacity: 0.6 } : {}}
                            />
                            <CheckBtn
                                $correct={opt.correct}
                                onClick={() => onOptionCorrect(i)}
                                title={opt.correct ? 'Marked correct' : 'Mark as correct'}
                            >
                                {opt.correct ? '✓' : '○'}
                            </CheckBtn>
                            {(active.type === 'single' || active.type === 'multi') && (
                                <button
                                    onClick={() => onRemoveOption(i)}
                                    disabled={active.options.length <= 2}
                                    title={active.options.length <= 2 ? 'Minimum 2 options' : 'Remove option'}
                                    style={{
                                        background: 'none', border: 'none',
                                        cursor: active.options.length <= 2 ? 'default' : 'pointer',
                                        color: active.options.length <= 2 ? C.border : C.muted,
                                        fontSize: 16, padding: '0 2px', lineHeight: 1, flexShrink: 0,
                                    }}
                                >✕</button>
                            )}
                        </OptionRow>
                    ))}
                    {(active.type === 'single' || active.type === 'multi') && active.options.length < 6 && (
                        <button
                            onClick={onAddOption}
                            style={{
                                marginTop: 4, background: C.bg,
                                border: `1px dashed ${C.border}`, borderRadius: 5,
                                color: C.muted, fontSize: 12, padding: '5px 14px',
                                cursor: 'pointer',
                            }}
                        >+ Add option</button>
                    )}
                </div>
            )}

            {/* Explanation */}
            <div>
                <Label>
                    Explanation
                    <span style={{ marginLeft: 8, fontWeight: 400, textTransform: 'none', fontSize: 11, color: C.muted }}>
                        — optional "why" shown after revealing the answer
                    </span>
                </Label>
                <textarea
                    value={active.explanation || ''}
                    onChange={(e) => onSetActive('explanation', e.target.value)}
                    placeholder='e.g. "Splunk Web runs on port 8000 by default."'
                    rows={2}
                    style={{
                        width: '100%', boxSizing: 'border-box',
                        background: C.surface, border: `1px solid ${C.border}`,
                        borderRadius: 6, color: C.text, fontSize: 13,
                        padding: '9px 12px', resize: 'vertical', fontFamily: 'inherit',
                        outline: 'none',
                    }}
                />
            </div>

            {/* Save button */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 0 0',
                borderTop: `1px solid ${C.border}`,
            }}>
                <TBtn
                    $primary
                    onClick={onSave}
                    disabled={savingOne}
                    style={{ minWidth: 120, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                    {savingOne ? 'Saving…' : (
                        <>
                            <svg viewBox="0 0 14 14" width="13" height="13" fill="currentColor" aria-hidden="true" style={{ flexShrink: 0 }}>
                                <path d="M2 11h10v1.5H2V11zm4-1.5L2.5 5.7l1.1-1.1L6 7.1V1h2v6.1l2.4-2.5 1.1 1.1L7 9.5z"/>
                            </svg>
                            Save
                        </>
                    )}
                </TBtn>
                <span style={{ fontSize: 12, color: C.muted }}>
                    Saves this question · ↑ ↓ reordering is saved automatically
                </span>
            </div>

            {/* Word cloud settings */}
            {active.type === 'wordcloud' && (
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 16px' }}>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>
                        ☁ <strong style={{ color: C.text }}>Word Cloud</strong> — participants submit up to <strong style={{ color: C.text }}>{active.wordcloudMaxWords ?? 7}</strong> words during the time limit.
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <label style={{ fontSize: 12, color: C.muted, whiteSpace: 'nowrap' }}>Max words per participant</label>
                            <input
                                type="number" min={1} max={20} step={1}
                                value={active.wordcloudMaxWords ?? 7}
                                onChange={(e) => onSetActive('wordcloudMaxWords', Math.max(1, Math.min(20, Number(e.target.value))))}
                                style={{ width: 56, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 5, color: C.text, fontSize: 13, padding: '5px 10px', textAlign: 'center' }}
                            />
                            <span style={{ fontSize: 11, color: C.muted }}>1–20</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <label style={{ fontSize: 12, color: C.muted, whiteSpace: 'nowrap' }}>Max chars per word</label>
                            <input
                                type="number" min={4} max={64} step={1}
                                value={active.wordcloudMaxChars ?? 32}
                                onChange={(e) => onSetActive('wordcloudMaxChars', Math.max(4, Math.min(64, Number(e.target.value))))}
                                style={{ width: 56, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 5, color: C.text, fontSize: 13, padding: '5px 10px', textAlign: 'center' }}
                            />
                            <span style={{ fontSize: 11, color: C.muted }}>4–64</span>
                        </div>
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 10 }}>
                        No correct answer — any submission earns participation points.
                    </div>
                </div>
            )}

            {/* Free-text accepted answers */}
            {active.type === 'freetext' && (
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 16px' }}>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
                        Accepted answers <span style={{ fontWeight: 400 }}>— leave empty for open-ended (any text gets participation points)</span>
                    </div>
                    {(active.options || []).map((opt, oi) => (
                        <div key={opt.id} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                            <input
                                style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 5, color: C.text, fontSize: 13, padding: '5px 10px' }}
                                value={opt.text}
                                placeholder={`Accepted answer ${oi + 1}`}
                                onChange={(e) => {
                                    const opts = active.options.map((o, i) => i === oi ? { ...o, text: e.target.value } : o);
                                    onSetActive('options', opts);
                                }}
                            />
                            <button
                                onClick={() => onSetActive('options', active.options.filter((_, i) => i !== oi))}
                                style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 16, padding: '0 4px' }}
                                title="Remove"
                            >✕</button>
                        </div>
                    ))}
                    <button
                        onClick={() => {
                            const next = String.fromCharCode(65 + (active.options || []).length);
                            onSetActive('options', [...(active.options || []), { id: next, text: '', correct: true }]);
                        }}
                        style={{ background: C.surface2, border: `1px dashed ${C.border}`, borderRadius: 5, color: C.muted, fontSize: 12, padding: '5px 12px', cursor: 'pointer', marginTop: 2 }}
                    >+ Add accepted answer</button>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>
                        Matching is case-insensitive. Participant sees all accepted answers on reveal.
                    </div>
                </div>
            )}
        </EditorArea>
    );
}
