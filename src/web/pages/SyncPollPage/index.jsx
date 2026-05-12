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
import {
    getSession, getQuestion, joinSession, heartbeatPresence,
    getCurrentUser, submitAnswer, submitQuizAttempt, runSearch,
} from '../../lib/kvstore';
import { fromKvDoc } from '../../lib/questions';
import { uid, calcPoints } from '../../lib/utils';
import { playTrack, fadeOutAndStop } from '../../lib/audio';
import LobbyScreen from './LobbyScreen';
import QuestionScreen from './QuestionScreen';
import RevealScreen from './RevealScreen';
import DoneScreen from './DoneScreen';
import { Page, Card, Waiting } from './styles';

// ── Helpers ───────────────────────────────────────────────────────────────────
function answerString(type, selected, sliderVal, freetextVal, wcWords) {
    if (type === 'freetext')  return freetextVal;
    if (type === 'wordcloud') return wcWords.join(',');
    if (type === 'slider')    return String(sliderVal ?? '');
    return selected.join(',');
}

function isCorrect(type, selected, options) {
    if (type === 'freetext' || type === 'slider' || type === 'wordcloud') return null;
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
    const sessionIdRef                = useRef(uid());

    // ── Session state from KV Store ───────────────────────────────────────────
    const [session, setSession]       = useState(null);
    const sessionRef                  = useRef(null);

    // ── Per-question state ────────────────────────────────────────────────────
    const [question, setQuestion]     = useState(null);
    const [loadedQKey, setLoadedQKey] = useState(null);
    const [selected, setSelected]     = useState([]);
    const [freetextVal, setFreetextVal] = useState('');
    const [wcWords, setWcWords]       = useState([]);
    const [wcInput, setWcInput]       = useState('');
    const [sliderVal, setSliderVal]   = useState(null);
    const [submitted, setSubmitted]   = useState(false);
    const [pointsEarned, setPointsEarned] = useState(0);
    const [wasCorrect, setWasCorrect] = useState(null);
    const [timeLeft, setTimeLeft]     = useState(0);
    const [totalScore, setTotalScore] = useState(0);
    const totalScoreRef = useRef(0);

    // ── Mini-leaderboard + answer distribution ────────────────────────────────
    const [leaderboard, setLeaderboard] = useState([]);
    const [answerDist, setAnswerDist]   = useState([]);
    const [distTotal, setDistTotal]     = useState(0);

    const nicknameRef = useRef('');
    const [splunkUser, setSplunkUser] = useState('');

    // ── Load Splunk username for placeholder hint only (never pre-fill) ───────
    useEffect(() => {
        getCurrentUser().then((u) => {
            if (u) setSplunkUser(u);
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

            if (sess && prev && sess.session_id === prev.session_id) {
                const enteringReveal = sess.phase === 'reveal' && prev.phase !== 'reveal';
                const enteringDone   = sess.phase === 'done'   && prev.phase !== 'done';
                if (enteringReveal || enteringDone) fetchLeaderboard(sess.session_id);
                if (enteringReveal) {
                    setAnswerDist([]);
                    setDistTotal(0);
                    fetchDist(sess.session_id, sess.question_index ?? 0);
                }
                if (enteringDone && nicknameRef.current) {
                    const qCount = (() => {
                        try { return JSON.parse(sess.question_keys || '[]').length; } catch (_) { return 0; }
                    })();
                    submitQuizAttempt({
                        event:          'quiz_complete',
                        session_id:     sess.session_id,
                        session_name:   sess.session_name || '',
                        quiz_id:        sess.quiz_id || '',
                        quiz_name:      sess.quiz_name || '',
                        nickname:       nicknameRef.current,
                        total_score:    totalScoreRef.current,
                        question_count: qCount,
                    }).catch(() => {});
                }
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
        setWcWords([]);
        setWcInput('');
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

    // ── Data fetchers ─────────────────────────────────────────────────────────
    const fetchLeaderboard = async (sessionId) => {
        try {
            const rows = await runSearch(
                `index=ponypoll sourcetype=ponypoll_answer session_id="${sessionId}" | stats sum(points) as score by nickname | sort -score | head 10`,
                { earliest: '-1d' }
            );
            setLeaderboard(rows);
        } catch (_) {}
    };

    const fetchDist = async (sessionId, questionIndex) => {
        try {
            const [distRows, totalRows] = await Promise.all([
                runSearch(
                    `index=ponypoll sourcetype=ponypoll_answer session_id="${sessionId}" question_index=${questionIndex} | eval opts=split(answer,",") | mvexpand opts | stats count by opts | rename opts as option`,
                    { earliest: '-1d' }
                ),
                runSearch(
                    `index=ponypoll sourcetype=ponypoll_answer session_id="${sessionId}" question_index=${questionIndex} | stats count as total`,
                    { earliest: '-1d' }
                ),
            ]);
            setAnswerDist(distRows);
            setDistTotal(Number(totalRows[0]?.total || 0));
        } catch (_) {}
    };

    // ── Actions ───────────────────────────────────────────────────────────────
    const [joinBusy, setJoinBusy] = useState(false);

    const handleJoin = async () => {
        if (!nickname.trim() || !session?.session_id || joinBusy) return;
        setJoinBusy(true);
        nicknameRef.current = nickname.trim();
        sessionStorage.setItem('ponypoll_nickname', nickname.trim());
        await joinSession(session.session_id, nickname.trim());
        sessionIdRef.current = session.session_id;
        setJoined(true);
        setJoinBusy(false);
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
            if (q.type === 'freetext')  return 100;
            if (q.type === 'wordcloud') return wcWords.length > 0 ? 50 : 0;
            if (q.type === 'slider')    return 50;
            return correct ? calcPoints(Number(session.time_limit) || 30, tLeft) : 0;
        })();

        setSubmitted(true);
        setWasCorrect(correct);
        setPointsEarned(pts);
        setTotalScore((prev) => {
            const next = prev + pts;
            totalScoreRef.current = next;
            return next;
        });

        const ansStr = answerString(q.type, selected, sliderVal, freetextVal, wcWords);
        try {
            await submitAnswer({
                session_id:     session.session_id,
                session_name:   session.session_name || '',
                quiz_id:        session.quiz_id || '',
                quiz_name:      session.quiz_name || '',
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
    }, [submitted, question, session, selected, sliderVal, freetextVal, wcWords]);

    // ── Derived state ─────────────────────────────────────────────────────────
    const phase    = session?.phase || 'idle';
    const timeLim  = Number(session?.time_limit) || 30;
    const timerPct = timeLim > 0 ? Math.round((timeLeft / timeLim) * 100) : 0;
    const qIdx     = Number(session?.question_index) || 0;
    const total    = session?.question_keys ? JSON.parse(session.question_keys).length : 0;
    const locked   = submitted || timeLeft <= 0;
    const wcEmpty  = question?.type === 'wordcloud' && wcWords.length === 0;

    // ── Music ──────────────────────────────────────────────────────────────────
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (phase === 'idle' || phase === 'waiting') playTrack('lobby');
        else if (phase === 'question') playTrack('question');
        else if (phase === 'done')     playTrack('win');
        // 'reveal' — keep question music playing
    }, [phase]);

    useEffect(() => () => fadeOutAndStop(), []);

    // ── Phase routing ─────────────────────────────────────────────────────────

    if (!session || phase === 'idle' || phase === 'waiting') {
        return (
            <LobbyScreen
                phase={phase}
                sessionName={session?.session_name}
                joined={joined}
                nickname={nickname}
                setNickname={setNickname}
                splunkUser={splunkUser}
                onJoin={handleJoin}
                joinBusy={joinBusy}
                nicknameRef={nicknameRef}
            />
        );
    }

    if (phase === 'question') {
        return (
            <QuestionScreen
                question={question}
                session={session}
                qIdx={qIdx}
                total={total}
                totalScore={totalScore}
                timerPct={timerPct}
                timeLeft={timeLeft}
                selected={selected}
                onToggleOption={toggleOption}
                freetextVal={freetextVal}
                setFreetextVal={setFreetextVal}
                wcWords={wcWords}
                setWcWords={setWcWords}
                wcInput={wcInput}
                setWcInput={setWcInput}
                sliderVal={sliderVal}
                setSliderVal={setSliderVal}
                submitted={submitted}
                wasCorrect={wasCorrect}
                pointsEarned={pointsEarned}
                onSubmit={handleSubmit}
                locked={locked}
                wcEmpty={wcEmpty}
            />
        );
    }

    if (phase === 'reveal' && question) {
        return (
            <RevealScreen
                question={question}
                qIdx={qIdx}
                total={total}
                totalScore={totalScore}
                selected={selected}
                wasCorrect={wasCorrect}
                submitted={submitted}
                wcWords={wcWords}
                answerDist={answerDist}
                distTotal={distTotal}
                leaderboard={leaderboard}
                nicknameRef={nicknameRef}
            />
        );
    }

    if (phase === 'done') {
        return (
            <DoneScreen
                totalScore={totalScore}
                nicknameRef={nicknameRef}
                leaderboard={leaderboard}
            />
        );
    }

    // Fallback — phase transition in progress
    return (
        <Page>
            <Card><Waiting>Waiting for host…</Waiting></Card>
        </Page>
    );
}
