/**
 * ActiveScreen — handles both QUESTION and REVEAL phases for PollPage.
 * Receives all question state as props from the parent index.
 */
import React from 'react';
import Timer from '../../components/Timer';
import WordcloudInput from '../../components/WordcloudInput';
import { C, OPTION_COLORS } from '../../lib/theme';
import {
    Root, TopBar, SubjectTitle, Progress, ScoreBadge, Body,
    QuestionText, QuestionImage, OptionsGrid, OptionBtn, Badge,
    FreetextArea, SliderBox, SliderTrackRow, SliderRangeInput,
    SliderValueDisplay, SliderUnitLabel, FeedbackBanner, NextBtn,
    SetupCard, SetupSubtitle,
} from './styles';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

// ── Slider sub-component ──────────────────────────────────────────────────────
function SliderQuestion({ q, sliderVal, setSliderVal, disabled }) {
    const min = q.sliderMin ?? 1;
    const max = q.sliderMax ?? 10;
    const step = q.sliderStep ?? 1;
    const unit = q.sliderUnit ?? '';
    const mid = Math.round((min + max) / 2);
    const val = sliderVal !== null ? sliderVal : mid;

    return (
        <SliderBox>
            <SliderValueDisplay>
                {sliderVal !== null ? sliderVal : '—'}
                {sliderVal !== null && unit && <SliderUnitLabel>{unit}</SliderUnitLabel>}
            </SliderValueDisplay>
            <SliderTrackRow>
                <span style={{ fontSize: 13, color: C.muted, minWidth: 24 }}>{min}</span>
                <SliderRangeInput
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={val}
                    onChange={(e) => { if (!disabled) setSliderVal(Number(e.target.value)); }}
                    disabled={disabled}
                />
                <span style={{ fontSize: 13, color: C.muted, minWidth: 24, textAlign: 'right' }}>{max}</span>
            </SliderTrackRow>
            {sliderVal === null && !disabled && (
                <span style={{ fontSize: 13, color: C.muted }}>Drag the slider to select your answer</span>
            )}
        </SliderBox>
    );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function ActiveScreen({
    q, qIndex, questions, config, score,
    phase, timerRunning, timedOut, timeRemaining,
    selected, onSelect,
    freetextVal, setFreetextVal,
    wcWords, setWcWords, wcInput, setWcInput,
    sliderVal, setSliderVal,
    feedback,
    canSubmit, onSubmit, onNext,
    onTimerTick, onTimerExpire,
}) {
    if (!q) {
        return (
            <SetupCard>
                <SetupSubtitle style={{ color: '#868A9C' }}>Loading next question…</SetupSubtitle>
            </SetupCard>
        );
    }

    const isReveal = phase === 'reveal';

    return (
        <Root>
            <TopBar>
                <SubjectTitle>{config.poll_subject || 'Pony Poll'}</SubjectTitle>
                <Progress>Q {qIndex + 1} / {questions.length}</Progress>
                <ScoreBadge>⭐ {score}</ScoreBadge>
            </TopBar>

            <div style={{ padding: '8px 20px', background: C.surface, borderBottom: `1px solid ${C.border}` }}>
                <Timer
                    key={qIndex}
                    duration={q.timeLimit || 30}
                    running={timerRunning}
                    onExpire={onTimerExpire}
                    onTick={onTimerTick}
                />
            </div>

            <Body>
                {q.image && <QuestionImage src={q.image} alt="" />}
                <QuestionText>{q.text}</QuestionText>

                {q.type === 'slider' ? (
                    <SliderQuestion
                        q={q}
                        sliderVal={sliderVal}
                        setSliderVal={setSliderVal}
                        disabled={isReveal}
                    />
                ) : q.type === 'wordcloud' ? (
                    <WordcloudInput
                        q={q}
                        wcWords={wcWords}
                        setWcWords={setWcWords}
                        wcInput={wcInput}
                        setWcInput={setWcInput}
                        locked={isReveal}
                        idPrefix="wc-input-poll"
                    />
                ) : q.type === 'freetext' ? (
                    <>
                        <FreetextArea
                            placeholder="Type your answer… (max 100 characters)"
                            maxLength={100}
                            value={freetextVal}
                            onChange={(e) => !isReveal && setFreetextVal(e.target.value)}
                            disabled={isReveal}
                        />
                        {isReveal && (q.options || []).filter((o) => o.correct && o.text.trim()).length > 0 && (
                            <div style={{ marginTop: 12, padding: '10px 14px', background: '#1a2e1a', border: `1px solid ${C.accent}`, borderRadius: 8, fontSize: 13 }}>
                                <span style={{ color: C.muted, marginRight: 8 }}>Accepted answers:</span>
                                {q.options.filter((o) => o.correct && o.text.trim()).map((o) => (
                                    <span key={o.id} style={{ display: 'inline-block', background: '#2a3e2a', color: C.accent, borderRadius: 4, padding: '2px 8px', marginRight: 6, marginTop: 4 }}>
                                        {o.text}
                                    </span>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        {q.type === 'multi' && !isReveal && (
                            <p style={{
                                margin: '0 0 10px', fontSize: 12, textAlign: 'center',
                                color: selected.length > 0 ? C.blue : C.muted,
                                fontWeight: selected.length > 0 ? 600 : 400,
                            }}>
                                {selected.length === 0
                                    ? 'Select all that apply, then submit'
                                    : `${selected.length} selected — tap again to deselect`}
                            </p>
                        )}
                        <OptionsGrid>
                            {q.options.map((opt, i) => {
                                const color = OPTION_COLORS[i] || C.blue;
                                const sel = selected.includes(opt.id);
                                const isMulti = q.type === 'multi';
                                return (
                                    <OptionBtn
                                        key={opt.id}
                                        color={color}
                                        $selected={sel}
                                        $multi={isMulti}
                                        $revealed={isReveal}
                                        $correct={opt.correct}
                                        disabled={isReveal}
                                        onClick={() => onSelect(opt.id)}
                                    >
                                        <Badge color={color}>
                                            {sel && isMulti && !isReveal ? '✓' : opt.id}
                                        </Badge>
                                        {opt.text}
                                    </OptionBtn>
                                );
                            })}
                        </OptionsGrid>
                    </>
                )}

                {!isReveal && (
                    <NextBtn
                        onClick={onSubmit}
                        disabled={!canSubmit}
                        style={{ opacity: canSubmit ? 1 : 0.4 }}
                    >
                        Submit
                    </NextBtn>
                )}

                {isReveal && feedback && (
                    <>
                        {timedOut && (
                            <FeedbackBanner style={{ background: '#2a1f00', borderColor: '#ED8B00', color: '#ED8B00' }}>
                                ⏱ Time's up!
                            </FeedbackBanner>
                        )}
                        {feedback.correct === null && (
                            <FeedbackBanner $ok>
                                Answer recorded! +{feedback.points} pts
                            </FeedbackBanner>
                        )}
                        {feedback.correct === true && (
                            <FeedbackBanner $ok>
                                Correct! +{feedback.points} pts
                            </FeedbackBanner>
                        )}
                        {feedback.correct === false && (
                            <FeedbackBanner>
                                {timedOut ? 'No answer — 0 pts' : 'Incorrect — see the highlighted answer'}
                            </FeedbackBanner>
                        )}
                        {q.explanation && (
                            <div style={{
                                marginTop: 10, padding: '10px 14px',
                                background: '#0e1e30', border: '1px solid #009CDE44',
                                borderRadius: 8, fontSize: 13, color: '#7EC8E3',
                                lineHeight: 1.5,
                            }}>
                                💡 {q.explanation}
                            </div>
                        )}
                        {timedOut ? (
                            <div style={{ textAlign: 'center', fontSize: 13, color: '#868A9C', marginTop: 16 }}>
                                Advancing to next question…
                            </div>
                        ) : (
                            <NextBtn onClick={onNext}>
                                {qIndex + 1 < questions.length ? 'Next Question →' : 'Finish Poll'}
                            </NextBtn>
                        )}
                    </>
                )}
            </Body>
        </Root>
    );
}
