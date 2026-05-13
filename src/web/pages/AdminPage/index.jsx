/**
 * AdminPage — quiz admin / host view.
 *
 * Self-paced mode: host picks a quiz, sets the mode & question count, then
 * clicks "Activate" to make it live for participants on PollPage.
 *
 * Synchronized mode: host controls the session step by step. Participants
 * on SyncPollPage poll ponypoll_session every 1.5 s and react to phase changes.
 *
 * Session phases (sync only):
 *   idle      – no active session
 *   waiting   – session started, participants joining the lobby
 *   question  – question is live, timer running
 *   reveal    – host revealed the answer
 *   done      – all questions played, final leaderboard shown
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    loadConfig, saveConfig, getSession, updateSession,
    listQuestions, listQuizzes, updateQuiz, getQuiz, clearPresence,
    getPresence, runSearch,
} from '../../lib/kvstore';
import { fromKvDoc } from '../../lib/questions';
import { uid, shuffle, sanitizeId } from '../../lib/utils';
import { C } from '../../lib/theme';
import { Page, StatusBanner } from './styles';
import IdlePanel from './IdlePanel';
import LobbyPanel from './LobbyPanel';
import QuestionPanel from './QuestionPanel';
import RevealPanel from './RevealPanel';
import DonePanel from './DonePanel';

function getPlayUrl() {
    const { protocol, host, pathname } = window.location;
    const base = pathname.replace(/\/[^/]+(\?.*)?$/, '');
    return `${protocol}//${host}${base}/play`;
}

async function fetchShortUrl(url) {
    try {
        const res = await fetch(
            `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`,
            { signal: AbortSignal.timeout(5000) }
        );
        if (!res.ok) return null;
        const text = (await res.text()).trim();
        return text.startsWith('http') ? text : null;
    } catch (_) {
        return null;
    }
}

export default function AdminPage() {
    const [session, setSession]               = useState(null);
    const [questions, setQuestions]           = useState([]);
    const [quizName, setQuizName]             = useState('');
    const [participantCount, setParticipants] = useState(0);
    const [leaderboard, setLeaderboard]       = useState([]);
    const [answerDist, setAnswerDist]         = useState([]);
    const [distTotal, setDistTotal]           = useState(0);
    const [wordcloudWords, setWordcloudWords] = useState([]);
    const [timeLeft, setTimeLeft]             = useState(0);
    const [status, setStatus]                 = useState(null);
    const [busy, setBusy]                     = useState(false);

    const [quizzes, setQuizzes]                   = useState([]);
    const [selectedQuizId, setSelectedQuizId]     = useState('');
    const [liveQuizId, setLiveQuizId]             = useState('');
    const [quizMode, setQuizMode]                 = useState('self_paced');
    const [modeSaved, setModeSaved]               = useState(false);
    const [questionCount, setQuestionCount]       = useState('all');  // 'all' | 'range' | 'random'
    const [totalAvailable, setTotalAvailable]     = useState(0);
    const [rangeFrom, setRangeFrom]               = useState(1);
    const [rangeTo,   setRangeTo]                 = useState(1);
    const [randomCount, setRandomCount]           = useState(5);

    const [playUrl]        = useState(getPlayUrl);
    const [shortUrl, setShortUrl]             = useState('');
    const [shorteningUrl, setShorteningUrl]   = useState(false);
    const [copied, setCopied]                 = useState(false);

    const questionsRef = useRef([]);
    const sessionRef   = useRef(null);
    const revealedRef  = useRef(false);

    useEffect(() => {
        Promise.all([listQuizzes(), loadConfig()])
            .then(async ([qs, cfg]) => {
                setQuizzes(qs);
                const activeId  = cfg.active_quiz_id || '';
                setLiveQuizId(activeId);
                const defaultId = activeId || (qs[0]?._key ?? '');
                setSelectedQuizId(defaultId);
                if (defaultId) loadQuizMeta(defaultId, qs, cfg);
            })
            .catch(() => {});
    }, []);

    const handleShorten = useCallback(async () => {
        if (!window.confirm(
            'Shorten URL via TinyURL?\n\n' +
            'This will send your Splunk server hostname to tinyurl.com ' +
            '(a third-party service). Only click OK if that is acceptable ' +
            'in your environment.'
        )) return;
        setShorteningUrl(true);
        try {
            const s = await fetchShortUrl(playUrl);
            if (s) setShortUrl(s);
            else alert('TinyURL did not return a short link. Check internet connectivity.');
        } finally {
            setShorteningUrl(false);
        }
    }, [playUrl]);

    const loadQuizMeta = async (quizId, quizList, cfgOverride = null) => {
        try {
            const list = quizList || quizzes;
            const meta = list.find((q) => q._key === quizId);
            const docs = await listQuestions(quizId);
            const n = docs.length;
            const cfg = cfgOverride || await loadConfig().catch(() => ({}));
            const hasSavedSelection = cfg.active_quiz_id === quizId;
            const savedMode = hasSavedSelection && ['all', 'range', 'random'].includes(cfg.active_question_mode)
                ? cfg.active_question_mode
                : 'all';
            const defaultRandom = Math.min(5, Math.max(1, n - 1));
            const savedFrom = Math.min(n || 1, Math.max(1, Number(cfg.active_range_from) || 1));
            const savedTo = Math.min(n || 1, Math.max(savedFrom, Number(cfg.active_range_to) || n || 1));
            const savedRandom = Math.min(Math.max(1, Number(cfg.active_random_count) || defaultRandom), Math.max(1, n));
            setTotalAvailable(n);
            setQuestionCount(savedMode);
            setRangeFrom(hasSavedSelection ? savedFrom : 1);
            setRangeTo(hasSavedSelection ? savedTo : n);
            setRandomCount(hasSavedSelection ? savedRandom : defaultRandom);
            setQuizMode(meta?.quiz_mode || 'self_paced');
        } catch (_) {
            setTotalAvailable(0);
            setQuestionCount('all');
            setRangeFrom(1);
            setRangeTo(1);
            setRandomCount(5);
            setQuizMode('self_paced');
        }
    };

    useEffect(() => {
        let mounted = true;
        let polling = false;
        let tickCount = 0;

        const poll = async () => {
            if (polling || !mounted) return;
            polling = true;
            try {
                const sess = await getSession();
                if (!mounted) return;
                sessionRef.current = sess;
                setSession(sess ? { ...sess } : null);

                tickCount++;
                if (sess?.session_id && sess.phase === 'waiting') {
                    const sid = sess.session_id;
                    let kvCount = 0;
                    try {
                        const docs = await getPresence(sid);
                        kvCount = new Set(docs.map((d) => d.nickname).filter(Boolean)).size;
                    } catch (_) {}

                    let idxCount = 0;
                    if (tickCount % 4 === 0) {
                        try {
                            const sidSafe = sanitizeId(sid);
                            if (sidSafe) {
                                const rows = await runSearch(
                                    `index=ponypoll sourcetype=ponypoll_presence session_id="${sidSafe}" | stats dc(nickname) as n`,
                                    { earliest: '-2h' }
                                );
                                idxCount = Number(rows[0]?.n || 0);
                            }
                        } catch (_) {}
                    }
                    if (mounted) setParticipants(Math.max(kvCount, idxCount));

                } else if (sess?.session_id && sess.phase !== 'idle' && tickCount % 4 === 0) {
                    const sidSafe = sanitizeId(sess.session_id);
                    if (sidSafe) {
                        try {
                            const rows = await runSearch(
                                `index=ponypoll sourcetype=ponypoll_answer session_id="${sidSafe}" | stats dc(nickname) as n`,
                                { earliest: '-2h' }
                            );
                            if (mounted) setParticipants(Number(rows[0]?.n || 0));
                        } catch (_) {}
                    }

                    const qIdx  = Number(sess.question_index ?? 0) || 0;
                    const qType = questionsRef.current[qIdx]?.type;
                    if (qType === 'wordcloud' && sidSafe && (sess.phase === 'question' || sess.phase === 'reveal')) {
                        try {
                            const wcRows = await runSearch(
                                `index=ponypoll sourcetype=ponypoll_answer session_id="${sidSafe}" question_index=${qIdx} | eval words=split(answer,",") | mvexpand words | eval word=trim(words) | where len(word)>0 | stats count by word | sort -count | rename word as answer`,
                                { earliest: '-1d' }
                            );
                            if (mounted) {
                                setWordcloudWords(
                                    wcRows.filter((r) => r.answer?.trim()).map((r) => ({ text: r.answer.trim(), count: Number(r.count) }))
                                );
                            }
                        } catch (_) {}
                    }
                }

                if (
                    sess?.question_keys &&
                    questionsRef.current.length === 0 &&
                    sess.phase && sess.phase !== 'idle'
                ) {
                    try {
                        const docs   = await listQuestions(sess.quiz_id);
                        const byKey  = Object.fromEntries(docs.map((d) => [d._key, fromKvDoc(d)]));
                        const keys   = JSON.parse(sess.question_keys);
                        const ordered = keys.map((k) => byKey[k]).filter(Boolean);
                        questionsRef.current = ordered;
                        if (mounted) setQuestions(ordered);
                    } catch (_) {}
                }
            } finally {
                polling = false;
            }
        };

        poll();
        const id = setInterval(poll, 2000);
        return () => { mounted = false; clearInterval(id); };
    }, []);

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

    const write = useCallback(async (newFields) => {
        const base = sessionRef.current ? { ...sessionRef.current } : {};
        delete base._key;
        const doc = { ...base, ...newFields };
        await updateSession(doc);
        sessionRef.current = doc;
        setSession({ ...doc });
    }, []);

    /** Auto-generate the next session name using a localStorage counter (zero-padded 5 digits). */
    const nextSessionName = () => {
        const n = Number(localStorage.getItem('ponypoll_session_counter') || 0) + 1;
        localStorage.setItem('ponypoll_session_counter', String(n));
        return String(n).padStart(5, '0');
    };

    const handleStartSession = async () => {
        setBusy(true);
        setStatus(null);
        try {
            const qid  = selectedQuizId;
            if (!qid) { setStatus({ error: true, msg: 'Pick a quiz above before starting.' }); return; }
            const name = nextSessionName();
            let docs, meta;
            try {
                [docs, meta] = await Promise.all([listQuestions(qid), getQuiz(qid).catch(() => null)]);
            } catch (e) {
                throw new Error(`Could not load quiz questions — ${e.message}. Try refreshing the page.`);
            }
            if (!docs.length) { setStatus({ error: true, msg: 'The active quiz has no questions.' }); return; }

            let qs = docs.map(fromKvDoc);
            if (questionCount === 'range') {
                const from = Math.max(1, Number(rangeFrom)) - 1;
                const to   = Math.min(qs.length, Math.max(Number(rangeFrom), Number(rangeTo)));
                qs = qs.slice(from, to);
            } else if (questionCount === 'random') {
                const n = Math.min(Math.max(1, Number(randomCount)), qs.length);
                qs = shuffle(qs).slice(0, n);
            }

            setQuizName(meta?.name || 'Quiz');
            questionsRef.current = qs;
            setQuestions(qs);

            const sessionId = uid();
            revealedRef.current = false;

            const doc = {
                phase: 'waiting',
                session_id: sessionId,
                session_name: name,
                quiz_id: qid,
                quiz_name: meta?.name || '',
                question_index: 0,
                question_keys: JSON.stringify(qs.map((q) => q._key)),
                time_limit: qs[0]?.timeLimit || 30,
                question_started_at: '',
            };
            try {
                await updateSession(doc);
            } catch (e) {
                throw new Error(`Could not create session — ${e.message}. Try refreshing the page.`);
            }
            await clearPresence(sessionId);
            sessionRef.current = doc;
            setSession({ ...doc });
            setParticipants(0);
            setLeaderboard([]);
        } catch (e) {
            setStatus({ error: true, msg: e.message });
        } finally {
            setBusy(false);
        }
    };

    const handleLaunchQuiz = async () => {
        setBusy(true);
        revealedRef.current = false;
        setAnswerDist([]);
        setDistTotal(0);
        try {
            await write({
                phase: 'question',
                question_index: 0,
                time_limit: questionsRef.current[0]?.timeLimit || 30,
                question_started_at: new Date().toISOString(),
            });
        } catch (e) { setStatus({ error: true, msg: e.message }); }
        finally { setBusy(false); }
    };

    const fetchDist = async (sid, qIdx, qType) => {
        const sidSafe = sanitizeId(sid);
        const qIxSafe = Number(qIdx) || 0;
        if (!sidSafe) return;
        try {
            if (qType === 'wordcloud') {
                const rows = await runSearch(
                    `index=ponypoll sourcetype=ponypoll_answer session_id="${sidSafe}" question_index=${qIxSafe} | eval words=split(answer,",") | mvexpand words | eval word=trim(words) | where len(word)>0 | stats count by word | sort -count | rename word as answer`,
                    { earliest: '-1d' }
                );
                setWordcloudWords(
                    rows.filter((r) => r.answer?.trim()).map((r) => ({ text: r.answer.trim(), count: Number(r.count) }))
                );
            } else {
                const [distRows, totalRows] = await Promise.all([
                    runSearch(
                        `index=ponypoll sourcetype=ponypoll_answer session_id="${sidSafe}" question_index=${qIxSafe} | eval opts=split(answer,",") | mvexpand opts | stats count by opts | rename opts as option`,
                        { earliest: '-1d' }
                    ),
                    runSearch(
                        `index=ponypoll sourcetype=ponypoll_answer session_id="${sidSafe}" question_index=${qIxSafe} | stats count as total`,
                        { earliest: '-1d' }
                    ),
                ]);
                setAnswerDist(distRows);
                setDistTotal(Number(totalRows[0]?.total || 0));
            }
        } catch (_) {}
    };

    const handleReveal = useCallback(async () => {
        if (revealedRef.current) return;
        revealedRef.current = true;
        setBusy(true);
        try {
            await write({ phase: 'reveal' });
            const sid     = sessionRef.current?.session_id;
            const sidSafe = sanitizeId(sid);
            const qIdx    = sessionRef.current?.question_index ?? 0;
            const qType   = questionsRef.current[qIdx]?.type;
            if (sidSafe) {
                setAnswerDist([]);
                setDistTotal(0);
                setWordcloudWords([]);
                const [lbRows] = await Promise.all([
                    runSearch(
                        `index=ponypoll sourcetype=ponypoll_answer session_id="${sidSafe}" | stats sum(points) as score by nickname | sort -score | head 10`,
                        { earliest: '-1d' }
                    ),
                    fetchDist(sid, qIdx, qType),
                ]);
                setLeaderboard(lbRows);
            }
        } catch (e) { setStatus({ error: true, msg: e.message }); }
        finally { setBusy(false); }
    }, [write]);

    const handleNext = async () => {
        setBusy(true);
        revealedRef.current = false;
        setAnswerDist([]);
        setDistTotal(0);
        setWordcloudWords([]);
        try {
            const nextIdx = (sessionRef.current?.question_index || 0) + 1;
            const qs      = questionsRef.current;
            if (nextIdx >= qs.length) {
                await write({ phase: 'done' });
                const sidSafe = sanitizeId(sessionRef.current?.session_id);
                if (sidSafe) {
                    const rows = await runSearch(
                        `index=ponypoll sourcetype=ponypoll_answer session_id="${sidSafe}" | stats sum(points) as score by nickname | sort -score | head 10`,
                        { earliest: '-1d' }
                    );
                    setLeaderboard(rows);
                }
            } else {
                await write({
                    phase: 'question',
                    question_index: nextIdx,
                    time_limit: qs[nextIdx]?.timeLimit || 30,
                    question_started_at: new Date().toISOString(),
                });
            }
        } catch (e) { setStatus({ error: true, msg: e.message }); }
        finally { setBusy(false); }
    };

    const resetToIdle = async () => {
        await write({ phase: 'idle' });
        setQuestions([]);
        questionsRef.current = [];
        setLeaderboard([]);
        setParticipants(0);
    };

    const handleEndSession = async () => {
        if (!window.confirm('End this session? Participants will see "Quiz ended".')) return;
        setBusy(true);
        try { await resetToIdle(); }
        catch (e) { setStatus({ error: true, msg: e.message }); }
        finally { setBusy(false); }
    };

    const handleModeChange = async (newMode) => {
        setQuizMode(newMode);
        const quiz = quizzes.find((q) => q._key === selectedQuizId);
        if (!quiz) return;
        try {
            await updateQuiz(selectedQuizId, { ...quiz, quiz_mode: newMode });
            const fresh = await listQuizzes();
            setQuizzes(fresh);
            setModeSaved(true);
            setTimeout(() => setModeSaved(false), 2000);
        } catch (e) {
            setStatus({ error: true, msg: `Failed to save mode: ${e.message}` });
        }
    };

    const handleActivate = async () => {
        if (!selectedQuizId) return;
        if (liveQuizId && liveQuizId !== selectedQuizId) {
            const currentName = quizzes.find((q) => q._key === liveQuizId)?.name || 'the current active quiz';
            const nextName = quizzes.find((q) => q._key === selectedQuizId)?.name || 'this quiz';
            if (!window.confirm(`Replace "${currentName}" with "${nextName}" as the active self-paced quiz?`)) return;
        }
        setBusy(true);
        try {
            const cfg = await loadConfig();
            const nextCfg = {
                ...cfg,
                active_quiz_id: selectedQuizId,
                active_question_mode: questionCount,
                active_range_from: Math.max(1, Number(rangeFrom) || 1),
                active_range_to: Math.max(Math.max(1, Number(rangeFrom) || 1), Number(rangeTo) || 1),
                active_random_count: Math.max(1, Number(randomCount) || 1),
            };
            await saveConfig(nextCfg);
            setLiveQuizId(selectedQuizId);
            const name = quizzes.find((q) => q._key === selectedQuizId)?.name || 'Quiz';
            const action = selectedQuizId === liveQuizId ? 'updated' : 'now active';
            setStatus({ error: false, msg: `"${name}" is ${action} — participants will get the selected question set.` });
        } catch (e) {
            setStatus({ error: true, msg: `Activate failed: ${e.message}` });
        } finally {
            setBusy(false);
        }
    };

    const handleCopy = (url) => {
        navigator.clipboard?.writeText(url).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const phase    = session?.phase || 'idle';
    const qIdx     = Number(session?.question_index) || 0;
    const currQ    = questionsRef.current[qIdx];
    const total    = questionsRef.current.length;
    const timeLim  = Number(session?.time_limit) || 30;
    const pct      = total > 0 ? Math.round(((qIdx + (phase === 'done' ? 1 : 0)) / total) * 100) : 0;

    const joinProps = { playUrl, shortUrl, copied, shorteningUrl, onShorten: handleShorten, onCopy: handleCopy };

    return (
        <Page>
            {status && (
                <StatusBanner $error={status.error} style={{ maxWidth: 760, width: '100%' }}>
                    {status.msg}
                </StatusBanner>
            )}

            {phase === 'idle' && (
                <IdlePanel
                    quizzes={quizzes}
                    selectedQuizId={selectedQuizId}
                    liveQuizId={liveQuizId}
                    quizMode={quizMode}
                    modeSaved={modeSaved}
                    questionCount={questionCount}
                    totalAvailable={totalAvailable}
                    rangeFrom={rangeFrom}
                    rangeTo={rangeTo}
                    randomCount={randomCount}
                    busy={busy}
                    onQuizChange={(id) => { setSelectedQuizId(id); loadQuizMeta(id); }}
                    onModeChange={handleModeChange}
                    onQuestionCountChange={setQuestionCount}
                    onRangeFromChange={(v) => setRangeFrom(v)}
                    onRangeToChange={(v) => setRangeTo(v)}
                    onRandomCountChange={(v) => setRandomCount(v)}
                    onActivate={handleActivate}
                    onStartSession={handleStartSession}
                    {...joinProps}
                />
            )}

            {phase === 'waiting' && (
                <LobbyPanel
                    sessionName={session?.session_name}
                    quizName={quizName}
                    total={total}
                    participantCount={participantCount}
                    busy={busy}
                    onLaunch={handleLaunchQuiz}
                    onEndSession={handleEndSession}
                    {...joinProps}
                />
            )}

            {phase === 'question' && currQ && (
                <QuestionPanel
                    sessionName={session?.session_name}
                    qIdx={qIdx}
                    total={total}
                    participantCount={participantCount}
                    currQ={currQ}
                    timeLeft={timeLeft}
                    timeLim={timeLim}
                    wordcloudWords={wordcloudWords}
                    busy={busy}
                    onReveal={handleReveal}
                />
            )}

            {phase === 'reveal' && currQ && (
                <RevealPanel
                    sessionName={session?.session_name}
                    qIdx={qIdx}
                    total={total}
                    currQ={currQ}
                    answerDist={answerDist}
                    distTotal={distTotal}
                    wordcloudWords={wordcloudWords}
                    leaderboard={leaderboard}
                    busy={busy}
                    onNext={handleNext}
                    onEndSession={handleEndSession}
                />
            )}

            {phase === 'done' && (
                <DonePanel
                    sessionName={session?.session_name}
                    participantCount={participantCount}
                    leaderboard={leaderboard}
                    busy={busy}
                    onNewSession={async () => { setBusy(true); try { await resetToIdle(); } finally { setBusy(false); } }}
                />
            )}

            {(phase === 'question' || phase === 'reveal' || phase === 'done') && total > 0 && (
                <div style={{ width: '100%', maxWidth: 760 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.muted, marginBottom: 4 }}>
                        <span>Progress</span>
                        <span>{qIdx + (phase === 'done' ? 1 : 0)} / {total}</span>
                    </div>
                    <div style={{ height: 4, background: C.surface, borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: C.blue, borderRadius: 2, transition: 'width 0.4s' }} />
                    </div>
                </div>
            )}
        </Page>
    );
}
