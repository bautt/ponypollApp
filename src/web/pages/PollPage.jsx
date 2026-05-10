import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import Timer from '../components/Timer';
import { listQuestions, loadConfig, submitAnswer, submitQuizAttempt, getCurrentUser, getQuiz } from '../lib/kvstore';
import { fromKvDoc, SEED_QUESTIONS, toKvDoc } from '../lib/questions';
import { calcPoints, uid } from '../lib/utils';

// ── Taglines ────────────────────────────────────────────────────────────────────
const TAGLINES = [
    'Back in the saddle for modern Splunk',
    'A modern revival of a Splunk classic',
    'The next generation of polling for Splunk',
    'Classic polling, rebuilt for today',
    'A trusted favorite, refreshed for now',
    'Bringing a Splunk classic up to speed',
    'The poll app returns, reworked for today',
    'Familiar polling, newly refined',
    'A classic app with a modern stride',
    'Revived for the way Splunk works today',
    'A proven idea, thoughtfully rebuilt',
    'Polling, polished for a new era',
    'The return of a well-loved Splunk tool',
    'Updated for modern teams and modern Splunk',
    'A fresh take on a familiar favorite',
    'Built again for faster, simpler polling',
    'Where classic utility meets modern design',
    'A reliable classic, ready for today\'s workloads',
    'Reintroduced with a more modern gait',
    'Back with a cleaner look and sharper focus',
    'Designed for today, inspired by a classic',
    'The familiar poll app, refined and renewed',
    'Modern polling with classic roots',
    'Renewed for a new generation of users',
    'An established favorite, thoughtfully updated',
    'Built for current Splunk, grounded in experience',
    'A classic concept, modernized with care',
    'Back to help teams vote, decide, and move',
    'The return of polling, streamlined for today',
    'A smarter stride for a familiar app',
    'Refreshed for modern use, true to its roots',
    'A steady classic, reimagined for now',
];
const TAGLINE = 'Pony Poll NG — ' + TAGLINES[Math.floor(Math.random() * TAGLINES.length)];

// ── Helpers ─────────────────────────────────────────────────────────────────────
function fisherYatesShuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

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
    border-radius: 10px;
    text-align: left;
    font-size: 15px;
    font-weight: ${({ $selected, $multi }) => ($selected && $multi) ? 700 : 500};
    cursor: ${({ disabled }) => (disabled ? 'default' : 'pointer')};
    transition: background 0.15s, border-color 0.15s, transform 0.1s, box-shadow 0.15s;
    color: ${C.text};

    border: 2px solid ${({ $selected, revealed, correct, color }) => {
        if (revealed) {
            if (correct) return C.accent;
            if ($selected) return C.red;
            return color + '44';
        }
        return $selected ? color : color + '44';
    }};

    background: ${({ $selected, $multi, revealed, correct, color }) => {
        if (revealed) {
            if (correct) return color + '33';
            if ($selected) return C.red + '22';
            return 'transparent';
        }
        if ($selected && $multi) return color + '44';
        if ($selected) return color + '33';
        return 'transparent';
    }};

    box-shadow: ${({ $selected, $multi, revealed, correct, color }) => {
        if (revealed && correct) return `0 0 0 2px ${C.accent}44`;
        if ($selected && $multi) return `0 0 0 1px ${color}88`;
        return 'none';
    }};

    ${({ disabled }) => !disabled && `&:hover { background: rgba(255,255,255,0.06); transform: translateY(-1px); }`}
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

// ── Word-cloud helpers ────────────────────────────────────────────────────────
function normalizeWcWord(raw) {
    let w = raw.trim();
    if ((w.startsWith('"') && w.endsWith('"')) || (w.startsWith("'") && w.endsWith("'"))) {
        w = w.slice(1, -1).trim();
    }
    return w.replace(/_/g, ' ').trim();
}

// ── Component ──────────────────────────────────────────────────────────────────

const PHASE = { SETUP: 'setup', QUESTION: 'question', REVEAL: 'reveal', DONE: 'done' };

export default function PollPage() {
    const [phase, setPhase] = useState(PHASE.SETUP);
    const [questions, setQuestions] = useState([]);
    const [config, setConfig] = useState({ poll_index: 'ponypoll', poll_subject: 'Pony Poll' });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [nickname, setNickname] = useState('');
    const splunkUser = useRef(''); // original Splunk username, independent of nickname edits

    const [qIndex, setQIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [selected, setSelected] = useState([]);
    const [freetextVal, setFreetextVal] = useState('');
    const [wcWords, setWcWords]   = useState([]);
    const [wcInput, setWcInput]   = useState('');
    const [sliderVal, setSliderVal] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [timerRunning, setTimerRunning] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const [timedOut, setTimedOut] = useState(false);

    const sessionId = useRef(uid());
    const nextQuestionFn = useRef(null); // always-fresh ref to avoid stale closure in auto-advance

    useEffect(() => {
        Promise.all([loadConfig(), getCurrentUser()])
            .then(async ([cfg, user]) => {
                setConfig(cfg);
                if (user) { setNickname(user); splunkUser.current = user; }
                const quizId = cfg.active_quiz_id || null;
                const [docs, quizMeta] = await Promise.all([
                    listQuestions(quizId),
                    quizId ? getQuiz(quizId) : Promise.resolve(null),
                ]);
                let qs = docs.length > 0
                    ? docs.map(fromKvDoc)
                    : SEED_QUESTIONS.map((q, i) => ({ ...q, _key: `seed_${i}`, sort_order: i }));
                // Apply random subset if a question_limit is configured
                const limit = quizMeta?.question_limit ? Number(quizMeta.question_limit) : null;
                if (limit && limit > 0 && limit < qs.length) {
                    qs = fisherYatesShuffle([...qs]).slice(0, limit);
                }
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
        setWcWords([]);
        setWcInput('');
        setSliderVal(null);
        setFeedback(null);
        setTimerRunning(true);
        // Log the quiz attempt
        submitQuizAttempt({
            session_id: sessionId.current,
            nickname: nickname || 'anonymous',
            splunk_user: splunkUser.current || '',
            quiz_id: config.active_quiz_id || 'default',
            question_count: questions.length,
            event: 'quiz_start',
        }).catch(() => {});
    };

    const handleTimerTick = useCallback((s) => setTimeRemaining(s), []);

    const handleTimerExpire = useCallback(() => {
        setTimerRunning(false);
        if (phase === PHASE.QUESTION) {
            setTimedOut(true);
            revealAnswer(0); // time ran out — no extra points
        }
    }, [phase, revealAnswer]);

    // Auto-advance 3 s after timer expiry — use ref so we always call the latest nextQuestion
    useEffect(() => {
        if (!timedOut || phase !== PHASE.REVEAL) return;
        const t = setTimeout(() => nextQuestionFn.current?.(), 3000);
        return () => clearTimeout(t);
    }, [timedOut, phase]);

    const hasCorrectAnswers = (q) => q.options.some((o) => o.correct);

    const revealAnswer = useCallback((remainingSecs) => {
        if (!currentQ) return;
        setTimerRunning(false);
        setPhase(PHASE.REVEAL);

        let correct = false;
        let points = 0;

        if (currentQ.type === 'wordcloud') {
            correct = null;
            points = wcWords.length > 0 ? 50 : 0;
        } else if (currentQ.type === 'slider') {
            correct = null;
            points = sliderVal !== null ? 50 : 0;
        } else if (currentQ.type === 'freetext') {
            const accepted = (currentQ.options || []).filter((o) => o.correct && o.text.trim());
            if (accepted.length > 0) {
                const input = freetextVal.trim().toLowerCase();
                correct = accepted.some((o) => {
                    const pattern = o.text.trim().toLowerCase();
                    // glob → regex: escape special chars, then replace * with .*
                    const regex = new RegExp(
                        '^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'
                    );
                    return regex.test(input);
                });
                points = correct ? calcPoints(currentQ.timeLimit, remainingSecs) : 0;
            } else {
                // open-ended — any non-empty answer gets participation points
                correct = null;
                points = freetextVal.trim().length > 0 ? 50 : 0;
            }
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
        if (currentQ.type === 'wordcloud') answerValue = wcWords.join(',');
        else if (currentQ.type === 'freetext') answerValue = freetextVal;
        else if (currentQ.type === 'slider') answerValue = String(sliderVal ?? '');
        else answerValue = selected.join(',');

        const payload = {
            session_id: sessionId.current,
            nickname: nickname || 'anonymous',
            splunk_user: splunkUser.current || '',
            question_index: qIndex,
            question: currentQ.text,
            type: currentQ.type,
            answer: answerValue,
            correct: correct === null ? 'poll' : String(correct),
            points,
            time_remaining: remainingSecs,
        };
        submitAnswer(payload).catch(() => {/* fire and forget */});
    }, [currentQ, selected, freetextVal, wcWords, sliderVal, qIndex, nickname, config.poll_index]);

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
        if (currentQ.type === 'wordcloud' && wcWords.length === 0) return;
        if (currentQ.type === 'freetext' && freetextVal.trim() === '') return;
        if (!['freetext', 'wordcloud', 'slider'].includes(currentQ.type) && selected.length === 0) return;
        revealAnswer(timeRemaining);
    };

    const nextQuestion = () => {
        setTimedOut(false);
        const next = qIndex + 1;
        if (next >= questions.length) {
            setPhase(PHASE.DONE);
            submitQuizAttempt({
                session_id: sessionId.current,
                nickname: nickname || 'anonymous',
                splunk_user: splunkUser.current || '',
                quiz_id: config.active_quiz_id || 'default',
                total_score: score,
                question_count: questions.length,
                event: 'quiz_complete',
            }).catch(() => {});
            return;
        }
        setQIndex(next);
        setSelected([]);
        setFreetextVal('');
        setWcWords([]);
        setWcInput('');
        setSliderVal(null);
        setFeedback(null);
        setPhase(PHASE.QUESTION);
        setTimerRunning(true);
    };

    // Keep ref in sync so the auto-advance timeout always calls the latest nextQuestion
    nextQuestionFn.current = nextQuestion;

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
                <img src="/static/app/ponypollapp/buttercup.png" alt="Buttercup" style={{ width: 210 }} />
                <SetupTitle>{config.poll_subject || 'Pony Poll'}</SetupTitle>
                <p style={{ margin: '0 0 6px', fontSize: 12, color: '#666', fontStyle: 'italic', textAlign: 'center' }}>
                    {TAGLINE}
                </p>
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

    // Safety guard — prevents white screen if qIndex is momentarily out of bounds
    if (phase !== PHASE.SETUP && phase !== PHASE.DONE && !currentQ) {
        return (
            <SetupCard>
                <SetupSubtitle style={{ color: '#868A9C' }}>Loading next question…</SetupSubtitle>
            </SetupCard>
        );
    }

    if (phase === PHASE.DONE) {
        return (
            <DoneCard>
                <img src="/static/app/ponypollapp/buttercup.png" alt="Buttercup" style={{ width: 180 }} />
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
    const canSubmit = q.type === 'wordcloud'
        ? wcWords.length > 0
        : q.type === 'freetext'
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
                ) : q.type === 'wordcloud' ? (() => {
                    const maxChars = q.wordcloudMaxChars ?? 32;
                    const maxWords = q.wordcloudMaxWords ?? 7;
                    const full     = wcWords.length >= maxWords;
                    const tryAdd   = (raw) => {
                        const w = normalizeWcWord(raw);
                        if (w && !wcWords.includes(w) && wcWords.length < maxWords) {
                            setWcWords((prev) => [...prev, w]);
                        }
                        setWcInput('');
                    };
                    return (
                        <div>
                            {/* Inline tag field */}
                            <div
                                onClick={() => document.getElementById('wc-input-poll')?.focus()}
                                style={{
                                    display: 'flex', flexWrap: 'wrap', alignItems: 'center',
                                    gap: 6, padding: '10px 14px', minHeight: 52,
                                    background: '#2B2E38', border: `1px solid ${isReveal ? C.border : C.blue}`,
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
                                        {!isReveal && (
                                            <button
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => setWcWords((prev) => prev.filter((_, j) => j !== i))}
                                                style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 0, fontSize: 13, lineHeight: 1 }}
                                            >×</button>
                                        )}
                                    </span>
                                ))}
                                {!isReveal && !full && (
                                    <input
                                        id="wc-input-poll"
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
                                {(isReveal || full) && wcWords.length === 0 && (
                                    <span style={{ color: C.muted, fontSize: 13 }}>No words submitted</span>
                                )}
                            </div>

                            {/* Hint + counter */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 7, gap: 8 }}>
                                {!isReveal && (
                                    <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>
                                        <strong style={{ color: C.text }}>Space</strong> or <strong style={{ color: C.text }}>Enter</strong> adds a word &nbsp;·&nbsp;
                                        <strong style={{ color: C.text }}>Backspace</strong> removes last &nbsp;·&nbsp;
                                        use <strong style={{ color: C.text }}>word_word</strong> or <strong style={{ color: C.text }}>"two words"</strong> for phrases
                                    </div>
                                )}
                                <div style={{ fontSize: 11, color: full ? C.accent : C.muted, whiteSpace: 'nowrap', marginLeft: 'auto' }}>
                                    {wcWords.length} / {maxWords}
                                    {full && !isReveal && ' — submit when ready'}
                                </div>
                            </div>
                            {isReveal && wcWords.length > 0 && (
                                <div style={{ textAlign: 'center', marginTop: 10, fontSize: 13, color: C.muted }}>
                                    ☁ Your words are in the cloud
                                </div>
                            )}
                        </div>
                    );
                })() : q.type === 'freetext' ? (
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
                                {(q.options).filter((o) => o.correct && o.text.trim()).map((o) => (
                                    <span key={o.id} style={{ display: 'inline-block', background: '#2a3e2a', color: C.accent, borderRadius: 4, padding: '2px 8px', marginRight: 6, marginTop: 4 }}>
                                        {o.text}
                                    </span>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <>{q.type === 'multi' && !isReveal && (
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
                                    revealed={isReveal}
                                    correct={opt.correct}
                                    disabled={isReveal}
                                    onClick={() => handleSelect(opt.id)}
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
                        onClick={submitQuestion}
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
                                {timedOut ? 'No answer — 0 pts' : 'Incorrect — see the highlighted answer'}
                            </FeedbackBanner>
                        )}
                        {currentQ?.explanation && (
                            <div style={{
                                marginTop: 10, padding: '10px 14px',
                                background: '#0e1e30', border: '1px solid #009CDE44',
                                borderRadius: 8, fontSize: 13, color: '#7EC8E3',
                                lineHeight: 1.5,
                            }}>
                                💡 {currentQ.explanation}
                            </div>
                        )}
                        {timedOut ? (
                            <div style={{ textAlign: 'center', fontSize: 13, color: '#868A9C', marginTop: 16 }}>
                                Advancing to next question…
                            </div>
                        ) : (
                            <NextBtn onClick={nextQuestion}>
                                {qIndex + 1 < questions.length ? 'Next Question →' : 'Finish Poll'}
                            </NextBtn>
                        )}
                    </>
                )}
            </Body>
        </Root>
    );
}
