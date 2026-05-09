/**
 * SyncPollPage — participant view for synchronized quiz mode.
 *
 * Polls ponypoll_session every 1.5 s and reacts to phase changes driven by
 * the host (SyncHostPage). Self-paced PollPage.jsx is untouched.
 *
 * Phases:
 *   idle/null – no active session, show waiting message
 *   waiting   – lobby: enter nickname + join
 *   question  – answer the current question (timer from session.question_started_at)
 *   reveal    – see correct answer + your score so far
 *   done      – final score screen
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import {
    getSession, getQuestion, joinSession, heartbeatPresence,
    loadConfig, getCurrentUser, submitAnswer, submitQuizAttempt, runSearch,
} from '../lib/kvstore';
import { fromKvDoc } from '../lib/questions';
import { uid, calcPoints } from '../lib/utils';

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
    bg: '#1B1D22', surface: '#23262F', surface2: '#2B2E38',
    border: '#3C3F4A', text: '#D0D4E3', muted: '#868A9C',
    blue: '#009CDE', green: '#5CC05C', orange: '#FF6D00',
    red: '#E84545', yellow: '#F5A623', accent: '#5CC05C',
};

const LETTER_COLORS = ['#009CDE', '#5CC05C', '#ED8B00', '#9B59B6'];

// ── Animations ────────────────────────────────────────────────────────────────
const popIn = keyframes`from { opacity:0; transform:scale(0.92) translateY(8px); } to { opacity:1; transform:none; }`;
const pulse = keyframes`0%,100%{opacity:1} 50%{opacity:0.5}`;

// ── Styled components ─────────────────────────────────────────────────────────
const Page = styled.div`
    min-height: 100vh;
    background: ${C.bg};
    color: ${C.text};
    font-family: 'Splunk Platform Sans', 'Inter', system-ui, sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
`;

const Card = styled.div`
    background: ${C.surface};
    border: 1px solid ${C.border};
    border-radius: 14px;
    padding: 36px 40px;
    width: 100%;
    max-width: 640px;
    animation: ${popIn} 0.25s ease;
`;

const Title = styled.h2`
    margin: 0 0 8px;
    font-size: 22px;
    font-weight: 700;
    color: ${C.text};
    text-align: center;
`;

const Sub = styled.p`
    margin: 0 0 24px;
    font-size: 14px;
    color: ${C.muted};
    text-align: center;
`;

const NicknameInput = styled.input`
    width: 100%;
    background: ${C.surface2};
    border: 1px solid ${C.border};
    border-radius: 8px;
    color: ${C.text};
    font-size: 16px;
    padding: 12px 16px;
    outline: none;
    box-sizing: border-box;
    margin-bottom: 16px;
    &:focus { border-color: ${C.blue}; }
`;

const JoinBtn = styled.button`
    width: 100%;
    padding: 14px;
    border: none;
    border-radius: 8px;
    background: ${C.blue};
    color: #fff;
    font-size: 16px;
    font-weight: 700;
    cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
    opacity: ${({ disabled }) => (disabled ? 0.45 : 1)};
    transition: opacity 0.15s;
    &:hover:not(:disabled) { opacity: 0.88; }
`;

const NextBtn = styled(JoinBtn)`
    margin-top: 20px;
    background: ${C.blue};
`;

const SubmitBtn = styled(JoinBtn)`
    background: ${C.blue};
    margin-top: 20px;
`;

const TimerBar = styled.div`
    height: 8px;
    border-radius: 4px;
    background: ${C.surface2};
    margin-bottom: 20px;
    overflow: hidden;
`;

const TimerFill = styled.div`
    height: 100%;
    border-radius: 4px;
    background: ${({ pct }) => (pct > 50 ? C.green : pct > 20 ? C.yellow : C.red)};
    width: ${({ pct }) => pct}%;
    transition: width 0.5s linear, background 0.5s;
`;

const QuestionText = styled.div`
    font-size: 20px;
    font-weight: 700;
    line-height: 1.45;
    text-align: center;
    margin-bottom: 28px;
    color: ${C.text};
`;

const OptionsGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 8px;
`;

const OptionBtn = styled.button`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 16px;
    border-radius: 10px;
    border: 2px solid ${({ selected, revealed, correct, incorrect }) =>
        revealed
            ? (correct ? C.green : (incorrect ? C.red : C.border))
            : (selected ? C.blue : C.border)};
    background: ${({ selected, revealed, correct, incorrect }) =>
        revealed
            ? (correct ? '#0e2a17' : (incorrect ? '#2a1010' : C.surface2))
            : (selected ? '#0a2535' : C.surface2)};
    color: ${C.text};
    font-size: 14px;
    font-weight: 500;
    cursor: ${({ disabled }) => (disabled ? 'default' : 'pointer')};
    text-align: left;
    transition: border-color 0.15s, background 0.15s;
    &:hover:not(:disabled) {
        border-color: ${({ revealed }) => (revealed ? 'inherit' : C.blue)};
        background: ${({ revealed }) => (revealed ? 'inherit' : '#0a2535')};
    }
`;

const OptionBadge = styled.span`
    display: inline-flex;
    min-width: 28px; height: 28px;
    border-radius: 7px;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 13px;
    background: ${({ color }) => color};
    color: #fff;
    flex-shrink: 0;
`;

const FeedbackBox = styled.div`
    text-align: center;
    padding: 18px;
    border-radius: 10px;
    margin-top: 20px;
    background: ${({ correct }) => (correct ? '#0e2a17' : '#2a1010')};
    border: 1px solid ${({ correct }) => (correct ? C.green : C.red)};
    font-size: 20px;
    font-weight: 700;
    color: ${({ correct }) => (correct ? C.green : C.red)};
`;

const ScoreCircle = styled.div`
    width: 110px; height: 110px;
    border-radius: 50%;
    border: 3px solid ${C.yellow};
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
    font-size: 32px;
    font-weight: 700;
    color: ${C.yellow};
`;

const Waiting = styled.div`
    text-align: center;
    color: ${C.muted};
    font-size: 15px;
    ${css`animation: ${pulse} 2s infinite;`}
`;

const LbTable = styled.table`
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    margin-top: 16px;
`;
const LbRow = styled.tr`border-bottom: 1px solid ${C.border}; &:last-child{border-bottom:none;}`;
const LbTh = styled.th`text-align:left;padding:7px 8px;color:${C.muted};font-size:11px;text-transform:uppercase;letter-spacing:0.04em;`;
const LbTd = styled.td`padding:8px;color:${C.text};`;
const MEDALS = ['🥇', '🥈', '🥉'];
const OPTION_COLORS = ['#009CDE', '#5CC05C', '#ED8B00', '#9B59B6', '#E84545', '#20B2AA'];

/** Horizontal distribution bars — identical visual to SyncHostPage. */
function DistBars({ options, dist, total }) {
    if (!options || options.length === 0 || total === 0) return null;
    const countMap = Object.fromEntries((dist || []).map((d) => [d.option, Number(d.count)]));
    return (
        <div style={{ margin: '16px 0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                📊 Answer Distribution &nbsp;
                <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                    ({total} responded)
                </span>
            </div>
            {options.map((opt, i) => {
                const count = countMap[opt.id] || 0;
                const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
                const color = opt.correct ? C.green : OPTION_COLORS[i % OPTION_COLORS.length];
                return (
                    <div key={opt.id} style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, fontSize: 13 }}>
                            <span style={{
                                display: 'inline-flex', width: 22, height: 22, borderRadius: 5,
                                alignItems: 'center', justifyContent: 'center',
                                background: color, color: '#fff', fontWeight: 700, fontSize: 11, flexShrink: 0,
                            }}>{opt.id}</span>
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: C.text }}>
                                {opt.text}
                            </span>
                            <span style={{ color: C.muted, fontSize: 12, whiteSpace: 'nowrap' }}>
                                {count} &nbsp;·&nbsp; {pct}%
                            </span>
                        </div>
                        <div style={{ height: 8, background: C.surface2, borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{
                                height: '100%', width: `${pct}%`, background: color,
                                borderRadius: 4, transition: 'width 0.6s ease',
                            }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function answerString(type, selected, sliderVal, freetextVal) {
    if (type === 'freetext') return freetextVal;
    if (type === 'slider') return String(sliderVal ?? '');
    return selected.join(',');
}

function isCorrect(type, selected, options) {
    if (type === 'freetext' || type === 'slider') return null; // no scoring
    if (type === 'single' || type === 'yesno') {
        const correct = options.find((o) => o.correct);
        return correct && selected.includes(correct.id);
    }
    if (type === 'multi') {
        const correctIds = options.filter((o) => o.correct).map((o) => o.id).sort();
        return JSON.stringify([...selected].sort()) === JSON.stringify(correctIds);
    }
    return false;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function SyncPollPage() {
    // ── Auth / identity ───────────────────────────────────────────────────────
    const [nickname, setNickname]     = useState('');
    const [joined, setJoined]         = useState(false);
    const sessionIdRef                = useRef(uid()); // participant's local session reference

    // ── Session state from KV Store ───────────────────────────────────────────
    const [session, setSession]       = useState(null);
    const sessionRef                  = useRef(null);

    // ── Per-question state ────────────────────────────────────────────────────
    const [question, setQuestion]     = useState(null);  // current question object
    const [loadedQKey, setLoadedQKey] = useState(null);  // which _key we last fetched
    const [selected, setSelected]     = useState([]);
    const [freetextVal, setFreetextVal] = useState('');
    const [sliderVal, setSliderVal]   = useState(null);
    const [submitted, setSubmitted]   = useState(false);
    const [pointsEarned, setPointsEarned] = useState(0);
    const [wasCorrect, setWasCorrect] = useState(null);
    const [timeLeft, setTimeLeft]     = useState(0);
    const [totalScore, setTotalScore] = useState(0);

    // ── Mini-leaderboard + answer distribution (fetched on reveal) ───────────
    const [leaderboard, setLeaderboard] = useState([]);
    const [answerDist, setAnswerDist]   = useState([]); // [{option, count}]
    const [distTotal, setDistTotal]     = useState(0);  // total respondents

    const nicknameRef = useRef('');

    // ── Load default nickname ─────────────────────────────────────────────────
    useEffect(() => {
        const saved = sessionStorage.getItem('ponypoll_nickname');
        if (saved) { setNickname(saved); nicknameRef.current = saved; return; }
        getCurrentUser().then((u) => {
            if (u) { setNickname(u); nicknameRef.current = u; }
        }).catch(() => {});
    }, []);

    // ── Polling loop: session every 1.5 s ─────────────────────────────────────
    useEffect(() => {
        let mounted = true;

        const poll = async () => {
            const sess = await getSession();
            if (!mounted) return;
            const prev = sessionRef.current;
            sessionRef.current = sess;
            setSession(sess ? { ...sess } : null);

            // Phase transitions → fetch data once on entry
            if (sess && prev && sess.session_id === prev.session_id) {
                const enteringReveal = sess.phase === 'reveal' && prev.phase !== 'reveal';
                const enteringDone   = sess.phase === 'done'   && prev.phase !== 'done';
                if (enteringReveal || enteringDone) {
                    fetchLeaderboard(sess.session_id);
                }
                if (enteringReveal) {
                    setAnswerDist([]);
                    setDistTotal(0);
                    fetchDist(sess.session_id, sess.question_index ?? 0);
                }
                // Reset distribution when a new question starts
                if (sess.phase === 'question' && prev.phase !== 'question') {
                    setAnswerDist([]);
                    setDistTotal(0);
                }
            }
        };

        poll();
        const id = setInterval(poll, 1500);
        return () => { mounted = false; clearInterval(id); };
    }, []);

    // ── Fetch question when question_index or session changes ─────────────────
    useEffect(() => {
        if (!session || session.phase !== 'question') return;
        const keys = session.question_keys ? JSON.parse(session.question_keys) : [];
        const key  = keys[Number(session.question_index) || 0];
        if (!key || key === loadedQKey) return;

        setLoadedQKey(key);
        setQuestion(null);
        setSelected([]);
        setFreetextVal('');
        setSliderVal(null);
        setSubmitted(false);
        setWasCorrect(null);
        setPointsEarned(0);

        getQuestion(key)
            .then((doc) => doc && setQuestion(fromKvDoc(doc)))
            .catch(() => {});
    }, [session?.phase, session?.question_index, session?.session_id]);

    // ── Server-authoritative timer ────────────────────────────────────────────
    useEffect(() => {
        if (!session || session.phase !== 'question' || !session.question_started_at) return;
        const tick = () => {
            const elapsed = (Date.now() - new Date(session.question_started_at)) / 1000;
            setTimeLeft(Math.max(0, (Number(session.time_limit) || 30) - elapsed));
        };
        tick();
        const id = setInterval(tick, 500);
        return () => clearInterval(id);
    }, [session?.phase, session?.question_started_at, session?.question_index]);

    // ── Heartbeat presence while joined ──────────────────────────────────────
    useEffect(() => {
        if (!joined || !session?.session_id) return;
        const id = setInterval(() => {
            heartbeatPresence(session.session_id, nicknameRef.current);
        }, 20000);
        return () => clearInterval(id);
    }, [joined, session?.session_id]);

    // ── Fetch leaderboard ─────────────────────────────────────────────────────
    const fetchLeaderboard = async (sessionId) => {
        try {
            const rows = await runSearch(
                `index=ponypoll session_id="${sessionId}" sourcetype=ponypoll_answer | stats sum(points) as score by nickname | sort -score | head 10`,
                { earliest: '-1d' }
            );
            setLeaderboard(rows);
        } catch (_) {}
    };

    // ── Fetch answer distribution for the revealed question ───────────────────
    const fetchDist = async (sessionId, questionIndex) => {
        try {
            const [distRows, totalRows] = await Promise.all([
                runSearch(
                    `index=ponypoll session_id="${sessionId}" sourcetype=ponypoll_answer question_index=${questionIndex} | eval opts=split(answer, ",") | mvexpand opts | stats count by opts | rename opts as option`,
                    { earliest: '-1d' }
                ),
                runSearch(
                    `index=ponypoll session_id="${sessionId}" sourcetype=ponypoll_answer question_index=${questionIndex} | stats count as total`,
                    { earliest: '-1d' }
                ),
            ]);
            setAnswerDist(distRows);
            setDistTotal(Number(totalRows[0]?.total || 0));
        } catch (_) {}
    };

    // ── Actions ───────────────────────────────────────────────────────────────
    const handleJoin = async () => {
        if (!nickname.trim() || !session?.session_id) return;
        nicknameRef.current = nickname.trim();
        sessionStorage.setItem('ponypoll_nickname', nickname.trim());
        await joinSession(session.session_id, nickname.trim());
        sessionIdRef.current = session.session_id;
        setJoined(true);
    };

    const toggleOption = (id) => {
        if (submitted || timeLeft <= 0) return;
        const q = question;
        if (q.type === 'single' || q.type === 'yesno') {
            setSelected([id]);
        } else {
            setSelected((prev) =>
                prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
            );
        }
    };

    const handleSubmit = useCallback(async () => {
        if (submitted || !question || !session) return;
        const q       = question;
        const elapsed = (Date.now() - new Date(session.question_started_at)) / 1000;
        const tLeft   = Math.max(0, (Number(session.time_limit) || 30) - elapsed);
        const correct = isCorrect(q.type, selected, q.options ?? []);
        const pts     = (() => {
            if (q.type === 'freetext') return 100;
            if (q.type === 'slider')   return 50;
            return correct ? calcPoints(Number(session.time_limit) || 30, tLeft) : 0;
        })();

        setSubmitted(true);
        setWasCorrect(correct);
        setPointsEarned(pts);
        setTotalScore((prev) => prev + pts);

        const ansStr = answerString(q.type, selected, sliderVal, freetextVal);
        try {
            await submitAnswer({
                session_id:     session.session_id,
                nickname:       nicknameRef.current,
                question_index: Number(session.question_index) || 0,
                question:       q.text,
                type:           q.type,
                answer:         ansStr,
                correct:        correct === null ? 'n/a' : String(correct),
                points:         pts,
                time_remaining: tLeft,
            });
        } catch (_) { /* best-effort */ }
    }, [submitted, question, session, selected, sliderVal, freetextVal]);

    // ── Derived state ─────────────────────────────────────────────────────────
    const phase    = session?.phase || 'idle';
    const timeLim  = Number(session?.time_limit) || 30;
    const timerPct = timeLim > 0 ? Math.round((timeLeft / timeLim) * 100) : 0;
    const qIdx     = Number(session?.question_index) || 0;
    const total    = session?.question_keys ? JSON.parse(session.question_keys).length : 0;
    const locked   = submitted || timeLeft <= 0;

    // ── Render ────────────────────────────────────────────────────────────────

    // No active session
    if (!session || phase === 'idle') {
        return (
            <Page>
                <Card>
                    <Title>🎙 Synchronized Quiz</Title>
                    <Waiting>Waiting for the host to start a session…</Waiting>
                </Card>
            </Page>
        );
    }

    // Waiting lobby: not yet joined
    if (phase === 'waiting' && !joined) {
        return (
            <Page>
                <Card>
                    <Title>Join the Quiz</Title>
                    <Sub>Enter your nickname and wait for the host to launch.</Sub>
                    <NicknameInput
                        type="text"
                        maxLength={32}
                        placeholder="Your nickname…"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && nickname.trim() && handleJoin()}
                        autoFocus
                    />
                    <JoinBtn onClick={handleJoin} disabled={!nickname.trim()}>
                        Join →
                    </JoinBtn>
                </Card>
            </Page>
        );
    }

    // Waiting lobby: joined, waiting for host to launch
    if (phase === 'waiting' && joined) {
        return (
            <Page>
                <Card>
                    <Title>You're in, {nicknameRef.current}! 🎉</Title>
                    <Waiting>Waiting for the host to launch the quiz…</Waiting>
                </Card>
            </Page>
        );
    }

    // Question phase
    if (phase === 'question') {
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
                        <span style={{ fontSize: 12, color: C.muted }}>
                            Q {qIdx + 1} / {total}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.yellow }}>
                            ★ {totalScore.toLocaleString()}
                        </span>
                    </div>

                    <TimerBar>
                        <TimerFill pct={timerPct} />
                    </TimerBar>

                    <QuestionText>{question.text}</QuestionText>

                    {/* Multiple choice */}
                    {isMC && (
                        <OptionsGrid style={opts.length === 2 ? { gridTemplateColumns: '1fr 1fr' } : {}}>
                            {opts.map((opt, i) => {
                                const sel = selected.includes(opt.id);
                                return (
                                    <OptionBtn
                                        key={opt.id}
                                        selected={sel}
                                        disabled={locked}
                                        onClick={() => toggleOption(opt.id)}
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
                        <FeedbackBox correct={false} style={{ fontSize: 16 }}>
                            ⏱ Time's up!
                        </FeedbackBox>
                    )}

                    {/* Submitted feedback */}
                    {submitted && (
                        <FeedbackBox correct={wasCorrect !== false}>
                            {wasCorrect === true  && `✓ Correct! +${pointsEarned.toLocaleString()} pts`}
                            {wasCorrect === false && '✗ Wrong answer'}
                            {wasCorrect === null  && `Recorded +${pointsEarned} pts`}
                        </FeedbackBox>
                    )}

                    {/* Submit button */}
                    {!submitted && timeLeft > 0 && (
                        <SubmitBtn
                            onClick={handleSubmit}
                            disabled={isMC && selected.length === 0}
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

    // Reveal phase
    if (phase === 'reveal' && question) {
        const opts    = question.options ?? [];
        const isMC    = question.type === 'single' || question.type === 'multi' || question.type === 'yesno';
        const correct = submitted ? wasCorrect : null;

        return (
            <Page>
                <Card>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                        <span style={{ fontSize: 12, color: C.muted }}>Q {qIdx + 1} / {total}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.yellow }}>★ {totalScore.toLocaleString()}</span>
                    </div>

                    <QuestionText style={{ fontSize: 16 }}>{question.text}</QuestionText>

                    {isMC && (
                        <OptionsGrid style={opts.length === 2 ? { gridTemplateColumns: '1fr 1fr' } : {}}>
                            {opts.map((opt, i) => {
                                const sel = selected.includes(opt.id);
                                return (
                                    <OptionBtn
                                        key={opt.id}
                                        revealed
                                        correct={opt.correct}
                                        incorrect={sel && !opt.correct}
                                        disabled
                                    >
                                        <OptionBadge color={opt.correct ? C.green : LETTER_COLORS[i % LETTER_COLORS.length]}>
                                            {opt.id}
                                        </OptionBadge>
                                        {opt.text}
                                        {opt.correct && <span style={{ marginLeft: 'auto' }}>✓</span>}
                                    </OptionBtn>
                                );
                            })}
                        </OptionsGrid>
                    )}

                    {/* Answer distribution for choice questions */}
                    {isMC && (
                        <DistBars options={opts} dist={answerDist} total={distTotal} />
                    )}

                    {submitted ? (
                        <FeedbackBox correct={correct !== false}>
                            {correct === true  && `✓ Correct! +${pointsEarned.toLocaleString()} pts`}
                            {correct === false && '✗ Wrong answer'}
                            {correct === null  && `Recorded +${pointsEarned} pts`}
                        </FeedbackBox>
                    ) : (
                        <FeedbackBox correct={false} style={{ fontSize: 15 }}>
                            ⏱ Didn't answer in time
                        </FeedbackBox>
                    )}

                    {leaderboard.length > 0 && (
                        <>
                            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 20, marginBottom: 6 }}>
                                🏆 Leaderboard
                            </div>
                            <LbTable>
                                <thead>
                                    <LbRow>
                                        <LbTh>#</LbTh><LbTh>Player</LbTh>
                                        <LbTh style={{ textAlign: 'right' }}>Score</LbTh>
                                    </LbRow>
                                </thead>
                                <tbody>
                                    {leaderboard.slice(0, 5).map((row, i) => (
                                        <LbRow key={row.nickname}
                                            style={row.nickname === nicknameRef.current ? { background: '#0a2535' } : {}}>
                                            <LbTd>{MEDALS[i] || i + 1}</LbTd>
                                            <LbTd style={{ fontWeight: row.nickname === nicknameRef.current ? 700 : 400 }}>
                                                {row.nickname}
                                                {row.nickname === nicknameRef.current && ' ← you'}
                                            </LbTd>
                                            <LbTd style={{ textAlign: 'right', color: C.yellow, fontWeight: 700 }}>
                                                {Number(row.score).toLocaleString()}
                                            </LbTd>
                                        </LbRow>
                                    ))}
                                </tbody>
                            </LbTable>
                        </>
                    )}

                    <Waiting style={{ marginTop: 20, fontSize: 13 }}>
                        Waiting for next question…
                    </Waiting>
                </Card>
            </Page>
        );
    }

    // Done phase
    if (phase === 'done') {
        return (
            <Page>
                <Card>
                    <Title>Quiz Complete! 🏁</Title>
                    <ScoreCircle>
                        <span>{totalScore.toLocaleString()}</span>
                        <span style={{ fontSize: 12, fontWeight: 400, color: C.muted }}>pts</span>
                    </ScoreCircle>
                    <Sub>Great job, {nicknameRef.current}!</Sub>

                    {leaderboard.length > 0 && (
                        <>
                            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                                🏆 Final Leaderboard
                            </div>
                            <LbTable>
                                <thead>
                                    <LbRow>
                                        <LbTh>#</LbTh><LbTh>Player</LbTh>
                                        <LbTh style={{ textAlign: 'right' }}>Score</LbTh>
                                    </LbRow>
                                </thead>
                                <tbody>
                                    {leaderboard.map((row, i) => (
                                        <LbRow key={row.nickname}
                                            style={row.nickname === nicknameRef.current ? { background: '#0a2535' } : {}}>
                                            <LbTd style={{ fontSize: 18 }}>{MEDALS[i] || i + 1}</LbTd>
                                            <LbTd style={{ fontWeight: row.nickname === nicknameRef.current ? 700 : 400 }}>
                                                {row.nickname}
                                                {row.nickname === nicknameRef.current && ' ← you'}
                                            </LbTd>
                                            <LbTd style={{ textAlign: 'right', color: C.yellow, fontWeight: 700, fontSize: 15 }}>
                                                {Number(row.score).toLocaleString()}
                                            </LbTd>
                                        </LbRow>
                                    ))}
                                </tbody>
                            </LbTable>
                        </>
                    )}
                </Card>
            </Page>
        );
    }

    // Fallback — phase transition in progress
    return (
        <Page>
            <Card><Waiting>Waiting for host…</Waiting></Card>
        </Page>
    );
}
