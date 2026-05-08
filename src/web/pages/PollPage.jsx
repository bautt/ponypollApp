import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import Timer from '../components/Timer';
import { listQuestions, loadConfig, submitAnswer, getCurrentUser } from '../lib/kvstore';
import { fromKvDoc, SEED_QUESTIONS, toKvDoc } from '../lib/questions';
import { calcPoints, uid } from '../lib/utils';

// ── Colour palette (Splunk brand) ──────────────────────────────────────────────
const C = {
    bg: '#1B1D22',
    surface: '#23262F',
    border: '#3C3F4A',
    text: '#D0D4E3',
    muted: '#868A9C',
    accent: '#5CC05C',    // Splunk green
    orange: '#ED8B00',
    red: '#DC4E41',
    blue: '#009CDE',
    optA: '#1F77B4',
    optB: '#65A637',
    optC: '#ED8B00',
    optD: '#AF6DC7',
};

const OPTION_COLORS = [C.optA, C.optB, C.optC, C.optD];
const OPTION_LABELS = ['A', 'B', 'C', 'D'];

// ── Styled components ──────────────────────────────────────────────────────────

const Root = styled.div`
    display: flex;
    flex-direction: column;
    min-height: calc(100vh - 90px);
    background: ${C.bg};
    color: ${C.text};
    font-family: 'Splunk Platform Sans', 'Proxima Nova', sans-serif;
`;

const TopBar = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 20px;
    background: ${C.surface};
    border-bottom: 1px solid ${C.border};
`;

const SubjectTitle = styled.h2`
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: ${C.text};
    flex: 1;
`;

const Progress = styled.span`
    font-size: 13px;
    color: ${C.muted};
`;

const ScoreBadge = styled.span`
    background: ${C.surface};
    border: 1px solid ${C.border};
    border-radius: 20px;
    padding: 3px 12px;
    font-size: 13px;
    font-weight: 700;
    color: ${C.accent};
`;

const Body = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 24px 20px;
    max-width: 860px;
    margin: 0 auto;
    width: 100%;
    gap: 16px;
`;

const QuestionText = styled.h1`
    font-size: clamp(18px, 3vw, 26px);
    font-weight: 700;
    margin: 0;
    color: #fff;
    line-height: 1.3;
`;

const OptionsGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    @media (max-width: 600px) { grid-template-columns: 1fr; }
`;

const OptionBtn = styled.button`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    border: 2px solid ${({ color }) => color}55;
    border-radius: 10px;
    background: ${({ selected, revealed, correct, color }) => {
        if (revealed) {
            if (correct) return color + '33';
            if (selected) return C.red + '22';
            return 'transparent';
        }
        return selected ? color + '33' : 'transparent';
    }};
    color: ${C.text};
    font-size: 15px;
    font-weight: 500;
    text-align: left;
    cursor: ${({ disabled }) => (disabled ? 'default' : 'pointer')};
    transition: background 0.2s, border-color 0.2s, transform 0.1s;
    ${({ disabled }) => !disabled && `&:hover { background: rgba(255,255,255,0.05); transform: translateY(-1px); }`}
    ${({ revealed, correct }) => revealed && correct && `border-color: ${C.accent}; box-shadow: 0 0 0 2px ${C.accent}44;`}
    ${({ revealed, selected, correct }) => revealed && selected && !correct && `border-color: ${C.red};`}
`;

const Badge = styled.span`
    width: 32px;
    height: 32px;
    border-radius: 6px;
    background: ${({ color }) => color};
    color: #fff;
    font-weight: 700;
    font-size: 15px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
`;

const FreetextArea = styled.textarea`
    width: 100%;
    background: ${C.surface};
    border: 1px solid ${C.border};
    border-radius: 8px;
    color: ${C.text};
    font-size: 15px;
    padding: 12px;
    resize: vertical;
    min-height: 100px;
    box-sizing: border-box;
    &:focus { outline: none; border-color: ${C.blue}; }
`;

const SliderBox = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    padding: 28px 24px;
    background: ${C.surface};
    border: 1px solid ${C.border};
    border-radius: 12px;
`;

const SliderTrackRow = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
`;

const SliderRangeInput = styled.input`
    flex: 1;
    accent-color: ${C.blue};
    height: 6px;
    cursor: ${({ disabled }) => (disabled ? 'default' : 'pointer')};
`;

const SliderValueDisplay = styled.div`
    font-size: 52px;
    font-weight: 800;
    color: ${C.blue};
    min-width: 80px;
    text-align: center;
    line-height: 1;
`;

const SliderUnitLabel = styled.span`
    font-size: 18px;
    color: ${C.muted};
    font-weight: 600;
`;

function SliderQuestion({ q, sliderVal, setSliderVal, disabled }) {
    const min = q.sliderMin ?? 1;
    const max = q.sliderMax ?? 10;
    const step = q.sliderStep ?? 1;
    const unit = q.sliderUnit ?? '';
    const mid = Math.round((min + max) / 2);
    const val = sliderVal !== null ? sliderVal : mid;

    const handleChange = (e) => {
        if (!disabled) setSliderVal(Number(e.target.value));
    };

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
                    onChange={handleChange}
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

const FeedbackBanner = styled.div`
    border-radius: 10px;
    padding: 14px 20px;
    font-size: 16px;
    font-weight: 600;
    text-align: center;
    background: ${({ ok }) => (ok ? C.accent + '22' : C.red + '22')};
    border: 1px solid ${({ ok }) => (ok ? C.accent : C.red)};
    color: ${({ ok }) => (ok ? C.accent : C.red)};
`;

const NextBtn = styled.button`
    align-self: flex-end;
    padding: 10px 28px;
    border: none;
    border-radius: 8px;
    background: ${C.blue};
    color: #fff;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    &:hover { opacity: 0.85; }
`;

const SetupCard = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
    min-height: calc(100vh - 90px);
    background: ${C.bg};
    color: ${C.text};
    font-family: 'Splunk Platform Sans', 'Proxima Nova', sans-serif;
    text-align: center;
    padding: 40px 20px;
`;

const NicknameWrap = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    width: 100%;
    max-width: 320px;
`;

const NicknameLabel = styled.label`
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${C.muted};
`;

const NicknameInput = styled.input`
    width: 100%;
    background: ${C.surface};
    border: 2px solid ${C.border};
    border-radius: 10px;
    color: #fff;
    font-size: 18px;
    font-weight: 600;
    padding: 12px 16px;
    text-align: center;
    box-sizing: border-box;
    transition: border-color 0.2s;
    &:focus {
        outline: none;
        border-color: ${C.blue};
    }
`;

const SetupTitle = styled.h1`
    font-size: 36px;
    font-weight: 700;
    color: #fff;
    margin: 0;
`;

const SetupSubtitle = styled.p`
    font-size: 16px;
    color: ${C.muted};
    margin: 0;
    max-width: 420px;
`;

const StartBtn = styled.button`
    padding: 14px 48px;
    border: none;
    border-radius: 10px;
    background: ${C.blue};
    color: #fff;
    font-size: 18px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 4px 20px ${C.blue}55;
    &:hover { opacity: 0.88; }
`;

const DoneCard = styled(SetupCard)``;

const ScoreCircle = styled.div`
    width: 140px;
    height: 140px;
    border-radius: 50%;
    border: 4px solid ${C.accent};
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: 36px;
    font-weight: 700;
    color: ${C.accent};
    box-shadow: 0 0 30px ${C.accent}44;
`;

const RestartBtn = styled.button`
    padding: 12px 36px;
    border: 1px solid ${C.border};
    border-radius: 8px;
    background: transparent;
    color: ${C.text};
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    &:hover { background: rgba(255,255,255,0.06); }
`;

// ── Component ──────────────────────────────────────────────────────────────────

const PHASE = { SETUP: 'setup', QUESTION: 'question', REVEAL: 'reveal', DONE: 'done' };

export default function PollPage() {
    const [phase, setPhase] = useState(PHASE.SETUP);
    const [questions, setQuestions] = useState([]);
    const [config, setConfig] = useState({ poll_index: 'ponypoll', poll_subject: 'Pony Poll' });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [nickname, setNickname] = useState('');

    const [qIndex, setQIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [selected, setSelected] = useState([]);
    const [freetextVal, setFreetextVal] = useState('');
    const [sliderVal, setSliderVal] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [timerRunning, setTimerRunning] = useState(false);
    const [feedback, setFeedback] = useState(null);

    const sessionId = useRef(uid());

    useEffect(() => {
        Promise.all([loadConfig(), getCurrentUser()])
            .then(async ([cfg, user]) => {
                setConfig(cfg);
                if (user) setNickname(user);
                const quizId = cfg.active_quiz_id || null;
                const docs = await listQuestions(quizId);
                const qs = docs.length > 0
                    ? docs.map(fromKvDoc)
                    : SEED_QUESTIONS.map((q, i) => ({ ...q, _key: `seed_${i}`, sort_order: i }));
                setQuestions(qs);
            })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    const currentQ = questions[qIndex];

    const startPoll = () => {
        setQIndex(0);
        setScore(0);
        setPhase(PHASE.QUESTION);
        setSelected([]);
        setFreetextVal('');
        setSliderVal(null);
        setFeedback(null);
        setTimerRunning(true);
    };

    const handleTimerTick = useCallback((s) => setTimeRemaining(s), []);

    const handleTimerExpire = useCallback(() => {
        setTimerRunning(false);
        if (phase === PHASE.QUESTION) {
            revealAnswer(0); // time ran out — no extra points
        }
    }, [phase]);

    const hasCorrectAnswers = (q) => q.options.some((o) => o.correct);

    const revealAnswer = useCallback((remainingSecs) => {
        if (!currentQ) return;
        setTimerRunning(false);
        setPhase(PHASE.REVEAL);

        let correct = false;
        let points = 0;

        if (currentQ.type === 'slider') {
            correct = null;
            points = sliderVal !== null ? 50 : 0;
        } else if (currentQ.type === 'freetext') {
            correct = freetextVal.trim().length > 0;
            points = correct ? 100 : 0;
        } else if (hasCorrectAnswers(currentQ)) {
            const correctIds = currentQ.options.filter((o) => o.correct).map((o) => o.id);
            const selectedSet = new Set(selected);
            const correctSet = new Set(correctIds);
            correct = selectedSet.size === correctSet.size
                && [...selectedSet].every((id) => correctSet.has(id));
            points = correct ? calcPoints(currentQ.timeLimit, remainingSecs) : 0;
        } else {
            // poll / no correct answer — just record
            correct = null;
            points = selected.length > 0 || freetextVal.trim().length > 0 ? 50 : 0;
        }

        if (points > 0) setScore((s) => s + points);
        setFeedback({ correct, points });

        // Submit answer to Splunk index
        let answerValue;
        if (currentQ.type === 'freetext') answerValue = freetextVal;
        else if (currentQ.type === 'slider') answerValue = String(sliderVal ?? '');
        else answerValue = selected.join(',');

        const payload = {
            session_id: sessionId.current,
            nickname: nickname || 'anonymous',
            question_index: qIndex,
            question: currentQ.text,
            type: currentQ.type,
            answer: answerValue,
            correct: correct === null ? 'poll' : String(correct),
            points,
            time_remaining: remainingSecs,
        };
        submitAnswer(payload, config.poll_index).catch(() => {/* fire and forget */});
    }, [currentQ, selected, freetextVal, sliderVal, qIndex, nickname, config.poll_index]);

    const handleSelect = (optId) => {
        if (phase !== PHASE.QUESTION || timerRunning === false) return;
        if (!currentQ) return;
        if (currentQ.type === 'single' || currentQ.type === 'yesno') {
            setSelected([optId]);
        } else {
            setSelected((prev) =>
                prev.includes(optId) ? prev.filter((x) => x !== optId) : [...prev, optId]
            );
        }
    };

    const submitQuestion = () => {
        if (currentQ.type === 'slider' && sliderVal === null) return;
        if (currentQ.type === 'freetext' && freetextVal.trim() === '') return;
        if (currentQ.type !== 'freetext' && currentQ.type !== 'slider' && selected.length === 0) return;
        revealAnswer(timeRemaining);
    };

    const nextQuestion = () => {
        const next = qIndex + 1;
        if (next >= questions.length) {
            setPhase(PHASE.DONE);
            return;
        }
        setQIndex(next);
        setSelected([]);
        setFreetextVal('');
        setSliderVal(null);
        setFeedback(null);
        setPhase(PHASE.QUESTION);
        setTimerRunning(true);
    };

    // ── Render ─────────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <SetupCard>
                <SetupSubtitle>Loading questions…</SetupSubtitle>
            </SetupCard>
        );
    }

    if (error) {
        return (
            <SetupCard>
                <SetupTitle style={{ color: C.red }}>Error</SetupTitle>
                <SetupSubtitle>{error}</SetupSubtitle>
                <StartBtn onClick={() => window.location.reload()}>Retry</StartBtn>
            </SetupCard>
        );
    }

    if (phase === PHASE.SETUP) {
        return (
            <SetupCard>
                <img src="/static/app/ponypollapp/buttercup.png" alt="Buttercup" style={{ width: 140 }} />
                <SetupTitle>{config.poll_subject || 'Pony Poll'}</SetupTitle>
                <SetupSubtitle>
                    {questions.length} question{questions.length !== 1 ? 's' : ''} — answer as fast
                    as you can to maximise your score!
                </SetupSubtitle>
                <NicknameWrap>
                    <NicknameLabel htmlFor="nickname-input">Your nickname</NicknameLabel>
                    <NicknameInput
                        id="nickname-input"
                        type="text"
                        maxLength={32}
                        placeholder="Enter your nickname…"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        autoComplete="off"
                    />
                </NicknameWrap>
                <StartBtn onClick={startPoll} disabled={!nickname.trim()} style={{ opacity: nickname.trim() ? 1 : 0.45 }}>
                    Start Poll
                </StartBtn>
            </SetupCard>
        );
    }

    if (phase === PHASE.DONE) {
        return (
            <DoneCard>
                <img src="/static/app/ponypollapp/buttercup.png" alt="Buttercup" style={{ width: 120 }} />
                <SetupTitle>Poll Complete!</SetupTitle>
                <ScoreCircle>
                    <span>{score}</span>
                    <span style={{ fontSize: 13, fontWeight: 400, color: '#ccc' }}>pts</span>
                </ScoreCircle>
                <SetupSubtitle>
                    Great job! Your answers have been recorded in Splunk index&nbsp;
                    <strong style={{ color: C.accent }}>{config.poll_index}</strong>.
                </SetupSubtitle>
                <RestartBtn onClick={() => { setPhase(PHASE.SETUP); sessionId.current = uid(); }}>
                    Restart
                </RestartBtn>
            </DoneCard>
        );
    }

    const q = currentQ;
    const isReveal = phase === PHASE.REVEAL;
    const canSubmit = q.type === 'freetext'
        ? freetextVal.trim().length > 0
        : q.type === 'slider'
            ? sliderVal !== null
            : selected.length > 0;

    return (
        <Root>
            <TopBar>
                <SubjectTitle>{config.poll_subject || 'Pony Poll'}</SubjectTitle>
                <Progress>Q {qIndex + 1} / {questions.length}</Progress>
                <ScoreBadge>⭐ {score}</ScoreBadge>
            </TopBar>

            {(phase === PHASE.QUESTION || phase === PHASE.REVEAL) && (
                <div style={{ padding: '8px 20px', background: C.surface, borderBottom: `1px solid ${C.border}` }}>
                    <Timer
                        key={qIndex}
                        duration={q.timeLimit || 30}
                        running={timerRunning}
                        onExpire={handleTimerExpire}
                        onTick={handleTimerTick}
                    />
                </div>
            )}

            <Body>
                <QuestionText>{q.text}</QuestionText>

                {q.type === 'slider' ? (
                    <SliderQuestion
                        q={q}
                        sliderVal={sliderVal}
                        setSliderVal={setSliderVal}
                        disabled={isReveal}
                    />
                ) : q.type === 'freetext' ? (
                    <FreetextArea
                        placeholder="Type your answer… (max 100 characters)"
                        maxLength={100}
                        value={freetextVal}
                        onChange={(e) => !isReveal && setFreetextVal(e.target.value)}
                        disabled={isReveal}
                    />
                ) : (
                    <OptionsGrid>
                        {q.options.map((opt, i) => {
                            const color = OPTION_COLORS[i] || C.blue;
                            const sel = selected.includes(opt.id);
                            return (
                                <OptionBtn
                                    key={opt.id}
                                    color={color}
                                    selected={sel}
                                    revealed={isReveal}
                                    correct={opt.correct}
                                    disabled={isReveal}
                                    onClick={() => handleSelect(opt.id)}
                                >
                                    <Badge color={color}>{opt.id}</Badge>
                                    {opt.text}
                                </OptionBtn>
                            );
                        })}
                    </OptionsGrid>
                )}

                {!isReveal && (
                    <NextBtn
                        onClick={submitQuestion}
                        disabled={!canSubmit}
                        style={{ opacity: canSubmit ? 1 : 0.4 }}
                    >
                        Submit
                    </NextBtn>
                )}

                {isReveal && feedback && (
                    <>
                        {feedback.correct === null && (
                            <FeedbackBanner ok>
                                Answer recorded! +{feedback.points} pts
                            </FeedbackBanner>
                        )}
                        {feedback.correct === true && (
                            <FeedbackBanner ok>
                                Correct! +{feedback.points} pts
                            </FeedbackBanner>
                        )}
                        {feedback.correct === false && (
                            <FeedbackBanner>
                                Incorrect — see the highlighted answer
                            </FeedbackBanner>
                        )}
                        <NextBtn onClick={nextQuestion}>
                            {qIndex + 1 < questions.length ? 'Next Question →' : 'Finish Poll'}
                        </NextBtn>
                    </>
                )}
            </Body>
        </Root>
    );
}
