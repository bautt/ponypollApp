import React, { useState, useEffect, useCallback, useRef } from 'react';
import { listQuestions, loadConfig, submitAnswer, submitQuizAttempt, getCurrentUser, getQuiz } from '../../lib/kvstore';
import { fromKvDoc, SEED_QUESTIONS } from '../../lib/questions';
import { calcPoints, uid, shuffle } from '../../lib/utils';
import { playTrack, fadeOutAndStop, playSfx } from '../../lib/audio';
import SetupScreen from './SetupScreen';
import DoneScreen from './DoneScreen';
import ActiveScreen from './ActiveScreen';

// ── Taglines ──────────────────────────────────────────────────────────────────
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

const PHASE = { SETUP: 'setup', QUESTION: 'question', REVEAL: 'reveal', DONE: 'done' };

export default function PollPage() {
    const [phase, setPhase] = useState(PHASE.SETUP);
    const [questions, setQuestions] = useState([]);
    const [config, setConfig] = useState({ poll_subject: 'Pony Poll' });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [nickname, setNickname] = useState('');
    const [splunkUser, setSplunkUser] = useState('');

    const [qIndex, setQIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [selected, setSelected] = useState([]);
    const [freetextVal, setFreetextVal] = useState('');
    const [wcWords, setWcWords] = useState([]);
    const [wcInput, setWcInput] = useState('');
    const [sliderVal, setSliderVal] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [timerRunning, setTimerRunning] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const [timedOut, setTimedOut] = useState(false);

    const sessionId = useRef(uid());
    const nextQuestionFn = useRef(null);

    useEffect(() => {
        Promise.all([loadConfig(), getCurrentUser()])
            .then(async ([cfg, user]) => {
                setConfig(cfg);
                if (user) { setSplunkUser(user); }
                const quizId = cfg.active_quiz_id || null;
                const [docs, quizMeta] = await Promise.all([
                    listQuestions(quizId),
                    quizId ? getQuiz(quizId) : Promise.resolve(null),
                ]);
                let qs = docs.length > 0
                    ? docs.map(fromKvDoc)
                    : SEED_QUESTIONS.map((q, i) => ({ ...q, _key: `seed_${i}`, sort_order: i }));
                const hasActiveSelection = quizId && cfg.active_quiz_id === quizId;
                const selectionMode = hasActiveSelection
                    ? (cfg.active_question_mode || 'all')
                    : (quizMeta?.question_limit ? 'random' : 'all');
                if (selectionMode === 'range') {
                    const from = Math.max(1, Number(cfg.active_range_from) || 1) - 1;
                    const to = Math.min(qs.length, Math.max(Number(cfg.active_range_from) || 1, Number(cfg.active_range_to) || qs.length));
                    qs = qs.slice(from, to);
                } else if (selectionMode === 'random') {
                    const limit = Number(cfg.active_random_count || quizMeta?.question_limit || 0);
                    if (limit && limit > 0 && limit < qs.length) qs = shuffle(qs).slice(0, limit);
                }
                setQuestions(qs);
            })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    const currentQ = questions[qIndex];

    // ── revealAnswer must be declared before handleTimerExpire ────────────────
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
                    const regex = new RegExp(
                        '^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'
                    );
                    return regex.test(input);
                });
                points = correct ? calcPoints(currentQ.timeLimit, remainingSecs) : 0;
            } else {
                correct = null;
                points = freetextVal.trim().length > 0 ? 50 : 0;
            }
        } else if (currentQ.options.some((o) => o.correct)) {
            const correctIds = currentQ.options.filter((o) => o.correct).map((o) => o.id);
            const selectedSet = new Set(selected);
            const correctSet = new Set(correctIds);
            correct = selectedSet.size === correctSet.size
                && [...selectedSet].every((id) => correctSet.has(id));
            points = correct ? calcPoints(currentQ.timeLimit, remainingSecs) : 0;
        } else {
            correct = null;
            points = selected.length > 0 || freetextVal.trim().length > 0 ? 50 : 0;
        }

        if (points > 0) setScore((s) => s + points);
        setFeedback({ correct, points });

        let answerValue;
        if (currentQ.type === 'wordcloud') answerValue = wcWords.join(',');
        else if (currentQ.type === 'freetext') answerValue = freetextVal;
        else if (currentQ.type === 'slider') answerValue = String(sliderVal ?? '');
        else answerValue = selected.join(',');

        submitAnswer({
            session_id: sessionId.current,
            nickname: nickname.trim() || 'anonymous',
            splunk_user: splunkUser || '',
            question_index: qIndex,
            question: currentQ.text,
            type: currentQ.type,
            answer: answerValue,
            correct: correct === null ? 'poll' : String(correct),
            points,
            time_remaining: remainingSecs,
        }).catch(() => {});
    }, [currentQ, selected, freetextVal, wcWords, sliderVal, qIndex, nickname]);

    const handleTimerTick = useCallback((s) => setTimeRemaining(s), []);

    const handleTimerExpire = useCallback(() => {
        setTimerRunning(false);
        if (phase === PHASE.QUESTION) {
            playSfx('timeout');
            setTimedOut(true);
            revealAnswer(0);
        }
    }, [phase, revealAnswer]);

    useEffect(() => {
        if (!timedOut || phase !== PHASE.REVEAL) return;
        const t = setTimeout(() => nextQuestionFn.current?.(), 3000);
        return () => clearTimeout(t);
    }, [timedOut, phase]);

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
        submitQuizAttempt({
            session_id: sessionId.current,
            nickname: nickname.trim() || 'anonymous',
            splunk_user: splunkUser || '',
            quiz_id: config.active_quiz_id || 'default',
            question_count: questions.length,
            event: 'quiz_start',
        }).catch(() => {});
    };

    const handleSelect = (optId) => {
        if (phase !== PHASE.QUESTION || timerRunning === false) return;
        if (!currentQ) return;
        playSfx('click');
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
        playSfx('submit');
        revealAnswer(timeRemaining);
    };

    const nextQuestion = () => {
        setTimedOut(false);
        const next = qIndex + 1;
        if (next >= questions.length) {
            setPhase(PHASE.DONE);
            submitQuizAttempt({
                session_id: sessionId.current,
                nickname: nickname.trim() || 'anonymous',
                splunk_user: splunkUser || '',
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

    nextQuestionFn.current = nextQuestion;

    // ── Music ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (phase === PHASE.SETUP)    playTrack('lobby');
        if (phase === PHASE.QUESTION) playTrack('question');
        if (phase === PHASE.DONE)     playTrack('win');
        if (phase === PHASE.REVEAL)   return; // keep question music during reveal
    }, [phase]);

    // Stop music when the component unmounts (tab switch)
    useEffect(() => () => fadeOutAndStop(), []);

    // ── Phase routing ─────────────────────────────────────────────────────────

    if (loading || error || phase === PHASE.SETUP) {
        return (
            <SetupScreen
                config={config}
                questionCount={questions.length}
                tagline={TAGLINE}
                nickname={nickname}
                setNickname={setNickname}
                splunkUser={splunkUser}
                onStart={startPoll}
                loading={loading}
                error={error}
            />
        );
    }

    if (phase === PHASE.DONE) {
        return (
            <DoneScreen
                score={score}
                onRestart={() => { setPhase(PHASE.SETUP); sessionId.current = uid(); }}
            />
        );
    }

    const canSubmit = currentQ?.type === 'wordcloud'
        ? wcWords.length > 0
        : currentQ?.type === 'freetext'
        ? freetextVal.trim().length > 0
        : currentQ?.type === 'slider'
            ? sliderVal !== null
            : selected.length > 0;

    return (
        <ActiveScreen
            q={currentQ}
            qIndex={qIndex}
            questions={questions}
            config={config}
            score={score}
            phase={phase}
            timerRunning={timerRunning}
            timedOut={timedOut}
            timeRemaining={timeRemaining}
            selected={selected}
            onSelect={handleSelect}
            freetextVal={freetextVal}
            setFreetextVal={setFreetextVal}
            wcWords={wcWords}
            setWcWords={setWcWords}
            wcInput={wcInput}
            setWcInput={setWcInput}
            sliderVal={sliderVal}
            setSliderVal={setSliderVal}
            feedback={feedback}
            canSubmit={canSubmit}
            onSubmit={submitQuestion}
            onNext={nextQuestion}
            onTimerTick={handleTimerTick}
            onTimerExpire={handleTimerExpire}
            onExit={() => {
                if (window.confirm('Leave the poll? Your progress will not be saved.')) {
                    setPhase(PHASE.SETUP);
                    sessionId.current = uid();
                }
            }}
        />
    );
}
