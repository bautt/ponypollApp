import React from 'react';
import { C } from '../../lib/theme';
import WordcloudInput from '../../components/WordcloudInput';
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
                    <WordcloudInput
                        q={question}
                        wcWords={wcWords}
                        setWcWords={setWcWords}
                        wcInput={wcInput}
                        setWcInput={setWcInput}
                        locked={locked}
                        idPrefix="wc-input-sync"
                    />
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
