import React from 'react';
import { C } from '../../lib/theme';
import { normalizeWcWord } from '../../lib/utils';
import {
    Page, Card, TimerBar, TimerFill, QuestionText, QuestionImage,
    OptionsGrid, OptionBtn, OptionBadge, NicknameInput,
    FeedbackBox, SubmitBtn, Waiting, LETTER_COLORS,
} from './styles';

export default function QuestionScreen({
    question, session, qIdx, total, totalScore, timerPct, timeLeft,
    selected, onToggleOption,
    freetextVal, setFreetextVal,
    wcWords, setWcWords, wcInput, setWcInput,
    sliderVal, setSliderVal,
    submitted, wasCorrect, pointsEarned,
    onSubmit, locked, wcEmpty,
}) {
    if (!question) {
        return <Page><Card><Waiting>Loading question…</Waiting></Card></Page>;
    }

    const opts = question.options ?? [];
    const isMC = question.type === 'single' || question.type === 'multi' || question.type === 'yesno';

    // ── Word cloud helpers ────────────────────────────────────────────────────
    const maxChars = question.wordcloudMaxChars ?? 32;
    const maxWords = question.wordcloudMaxWords ?? 7;
    const wcFull = wcWords.length >= maxWords;

    const tryAdd = (raw) => {
        const w = normalizeWcWord(raw);
        if (w && !wcWords.includes(w) && wcWords.length < maxWords) {
            setWcWords((prev) => [...prev, w]);
        }
        setWcInput('');
    };

    return (
        <Page>
            <Card>
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 12, color: C.muted }}>Q {qIdx + 1} / {total}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.yellow }}>
                        ★ {totalScore.toLocaleString()}
                    </span>
                </div>

                <TimerBar>
                    <TimerFill $pct={timerPct} />
                </TimerBar>

                {question.image && <QuestionImage src={question.image} alt="" />}
                <QuestionText>{question.text}</QuestionText>

                {/* Multiple choice */}
                {isMC && (
                    <OptionsGrid style={opts.length === 2 ? { gridTemplateColumns: '1fr 1fr' } : {}}>
                        {opts.map((opt, i) => {
                            const sel = selected.includes(opt.id);
                            return (
                                <OptionBtn
                                    key={opt.id}
                                    $selected={sel}
                                    disabled={locked}
                                    onClick={() => onToggleOption(opt.id)}
                                >
                                    <OptionBadge color={LETTER_COLORS[i % LETTER_COLORS.length]}>
                                        {opt.id}
                                    </OptionBadge>
                                    {opt.text}
                                </OptionBtn>
                            );
                        })}
                    </OptionsGrid>
                )}

                {/* Free text */}
                {question.type === 'freetext' && (
                    <NicknameInput
                        as="textarea"
                        rows={3}
                        style={{ resize: 'vertical', height: 'auto' }}
                        placeholder="Your answer…"
                        value={freetextVal}
                        onChange={(e) => setFreetextVal(e.target.value)}
                        disabled={locked}
                    />
                )}

                {/* Word cloud */}
                {question.type === 'wordcloud' && (
                    <div>
                        <div
                            onClick={() => document.getElementById('wc-input')?.focus()}
                            style={{
                                display: 'flex', flexWrap: 'wrap', alignItems: 'center',
                                gap: 6, padding: '10px 14px', minHeight: 52,
                                background: C.surface2, border: `1px solid ${locked ? C.border : C.blue}`,
                                borderRadius: 8, cursor: 'text',
                            }}
                        >
                            {wcWords.map((w, i) => (
                                <span key={i} style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                    background: C.blue + '33', border: `1px solid ${C.blue}`,
                                    borderRadius: 20, padding: '2px 8px 2px 11px',
                                    fontSize: 14, color: C.text, whiteSpace: 'nowrap',
                                }}>
                                    {w}
                                    {!locked && (
                                        <button
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => setWcWords((prev) => prev.filter((_, j) => j !== i))}
                                            style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 0, fontSize: 13, lineHeight: 1 }}
                                        >×</button>
                                    )}
                                </span>
                            ))}
                            {!locked && !wcFull && (
                                <input
                                    id="wc-input"
                                    value={wcInput}
                                    maxLength={maxChars}
                                    placeholder={wcWords.length === 0 ? 'Type a word, press Space to add…' : 'next word…'}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val.endsWith(' ')) { tryAdd(val); }
                                        else { setWcInput(val); }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') { e.preventDefault(); tryAdd(wcInput); }
                                        if (e.key === 'Backspace' && wcInput === '') {
                                            e.preventDefault();
                                            setWcWords((prev) => prev.slice(0, -1));
                                        }
                                    }}
                                    style={{
                                        flex: '1 1 120px', minWidth: 80, background: 'transparent',
                                        border: 'none', outline: 'none', color: C.text,
                                        fontSize: 15, padding: '2px 4px',
                                    }}
                                />
                            )}
                            {(locked || wcFull) && wcWords.length === 0 && (
                                <span style={{ color: C.muted, fontSize: 13 }}>No words submitted</span>
                            )}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 7, gap: 8 }}>
                            {!locked && (
                                <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>
                                    <strong style={{ color: C.text }}>Space</strong> or <strong style={{ color: C.text }}>Enter</strong> adds a word &nbsp;·&nbsp;
                                    <strong style={{ color: C.text }}>Backspace</strong> removes last &nbsp;·&nbsp;
                                    use <strong style={{ color: C.text }}>word_word</strong> or <strong style={{ color: C.text }}>"two words"</strong> for phrases
                                </div>
                            )}
                            <div style={{ fontSize: 11, color: wcFull ? C.green : C.muted, whiteSpace: 'nowrap', marginLeft: 'auto' }}>
                                {wcWords.length} / {maxWords}
                                {wcFull && !locked && ' — submit when ready'}
                            </div>
                        </div>
                    </div>
                )}

                {/* Slider */}
                {question.type === 'slider' && (() => {
                    const min  = question.sliderMin  ?? 1;
                    const max  = question.sliderMax  ?? 10;
                    const step = question.sliderStep ?? 1;
                    const unit = question.sliderUnit ?? '';
                    const val  = sliderVal ?? min;
                    return (
                        <div style={{ textAlign: 'center', margin: '0 0 8px' }}>
                            <div style={{ fontSize: 36, fontWeight: 700, color: C.blue, marginBottom: 10 }}>
                                {val}{unit}
                            </div>
                            <input
                                type="range" min={min} max={max} step={step} value={val}
                                onChange={(e) => !locked && setSliderVal(Number(e.target.value))}
                                disabled={locked}
                                style={{ width: '100%', accentColor: C.blue }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.muted, marginTop: 4 }}>
                                <span>{min}</span><span>{max}</span>
                            </div>
                        </div>
                    );
                })()}

                {/* Time-out message */}
                {timeLeft <= 0 && !submitted && (
                    <FeedbackBox $correct={false} style={{ fontSize: 16 }}>
                        ⏱ Time's up!
                    </FeedbackBox>
                )}

                {/* Submitted feedback */}
                {submitted && (() => {
                    const isWc = question?.type === 'wordcloud';
                    const text =
                        isWc && wasCorrect === null
                            ? `${wcWords.length} word${wcWords.length !== 1 ? 's' : ''} added to the cloud ☁`
                            : wasCorrect === true
                                ? `✓ Correct! +${pointsEarned.toLocaleString()} pts`
                                : wasCorrect === false
                                    ? '✗ Wrong answer'
                                    : `Recorded +${pointsEarned} pts`;
                    return <FeedbackBox $correct={wasCorrect !== false}>{text}</FeedbackBox>;
                })()}

                {/* Submit button */}
                {!submitted && timeLeft > 0 && (
                    <SubmitBtn
                        onClick={onSubmit}
                        disabled={(isMC && selected.length === 0) || wcEmpty}
                    >
                        Submit Answer
                    </SubmitBtn>
                )}

                {/* Waiting for host after submit */}
                {submitted && (
                    <Waiting style={{ marginTop: 20, fontSize: 13 }}>
                        Waiting for host to reveal…
                    </Waiting>
                )}
            </Card>
        </Page>
    );
}
