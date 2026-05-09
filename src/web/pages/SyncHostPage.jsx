/**
 * SyncHostPage — host/presenter view for synchronized quiz mode.
 *
 * The host controls the session state written to the ponypoll_session KV Store
 * document. Participants on SyncPollPage poll that document every 1.5 s and
 * react to phase changes. PollPage.jsx (self-paced) is completely untouched.
 *
 * Session phases:
 *   idle      – no active session
 *   waiting   – session started, participants joining the lobby
 *   question  – question is live, timer running
 *   reveal    – host revealed the answer
 *   done      – all questions played, final leaderboard shown
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { QRCodeSVG } from 'qrcode.react';
import {
    loadConfig, getSession, updateSession,
    listQuestions, listQuizzes, getQuiz, getPresence, clearPresence,
    runSearch,
} from '../lib/kvstore';
import { fromKvDoc } from '../lib/questions';
import { uid, calcPoints } from '../lib/utils';

// ── Derive the /play URL from the current browser location ───────────────────
function getPlayUrl() {
    const { protocol, host, pathname } = window.location;
    // pathname is like /en-GB/app/ponypollapp/poll — replace last segment
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

// ── Palette (matches existing app dark theme) ─────────────────────────────────
const C = {
    bg: '#1B1D22', surface: '#23262F', surface2: '#2B2E38',
    border: '#3C3F4A', text: '#D0D4E3', muted: '#868A9C',
    blue: '#009CDE', green: '#5CC05C', orange: '#FF6D00',
    red: '#E84545', yellow: '#F5A623', accent: '#5CC05C',
};

// ── Fisher-Yates shuffle (same as PollPage) ───────────────────────────────────
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// ── Styled components ─────────────────────────────────────────────────────────
const Page = styled.div`
    min-height: calc(100vh - 45px);
    background: ${C.bg};
    color: ${C.text};
    font-family: 'Splunk Platform Sans', 'Inter', system-ui, sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 32px 24px 48px;
`;

const Card = styled.div`
    background: ${C.surface};
    border: 1px solid ${C.border};
    border-radius: 12px;
    padding: 32px 36px;
    width: 100%;
    max-width: 760px;
    margin-bottom: 20px;
`;

const Title = styled.h2`
    margin: 0 0 6px;
    font-size: 22px;
    font-weight: 700;
    color: ${C.text};
`;

const Subtitle = styled.p`
    margin: 0 0 24px;
    font-size: 13px;
    color: ${C.muted};
`;

const BigBtn = styled.button`
    padding: 14px 36px;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 700;
    cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
    background: ${({ danger, secondary }) =>
        danger ? C.red : secondary ? C.surface2 : C.blue};
    color: #fff;
    opacity: ${({ disabled }) => (disabled ? 0.45 : 1)};
    transition: opacity 0.15s, transform 0.1s;
    &:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
    margin-right: 12px;
`;

const SmallBtn = styled.button`
    padding: 8px 18px;
    border: 1px solid ${({ danger }) => (danger ? C.red : C.border)};
    border-radius: 6px;
    background: transparent;
    color: ${({ danger }) => (danger ? C.red : C.text)};
    font-size: 13px;
    font-weight: 600;
    cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
    opacity: ${({ disabled }) => (disabled ? 0.4 : 1)};
    &:hover:not(:disabled) { background: rgba(255,255,255,0.06); }
    margin-right: 8px;
`;

const StatusBanner = styled.div`
    padding: 10px 16px;
    border-radius: 7px;
    font-size: 13px;
    font-weight: 500;
    background: ${({ error }) => (error ? '#3a1515' : '#152a1f')};
    color: ${({ error }) => (error ? C.red : C.green)};
    border: 1px solid ${({ error }) => (error ? C.red : C.green)}44;
    margin-bottom: 16px;
`;

const PhaseTag = styled.span`
    display: inline-block;
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    background: ${({ phase }) => ({
        waiting: '#1a3040', question: '#152a1f', reveal: '#2a2010', done: '#1a2040',
    }[phase] || C.surface2)};
    color: ${({ phase }) => ({
        waiting: C.blue, question: C.green, reveal: C.yellow, done: C.blue,
    }[phase] || C.muted)};
    margin-left: 10px;
`;

const QuestionBox = styled.div`
    background: ${C.surface2};
    border: 1px solid ${C.border};
    border-radius: 8px;
    padding: 20px 24px;
    margin-bottom: 20px;
    font-size: 18px;
    font-weight: 600;
    line-height: 1.5;
`;

const TimerBar = styled.div`
    height: 6px;
    border-radius: 3px;
    background: ${C.surface2};
    margin-bottom: 20px;
    overflow: hidden;
`;
const TimerFill = styled.div`
    height: 100%;
    border-radius: 3px;
    background: ${({ pct }) =>
        pct > 50 ? C.green : pct > 20 ? C.yellow : C.red};
    width: ${({ pct }) => pct}%;
    transition: width 0.5s linear, background 0.5s;
`;

const TimerLabel = styled.div`
    font-size: 13px;
    color: ${C.muted};
    margin-bottom: 16px;
`;

const Grid2 = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 20px;
`;

const OptionPill = styled.div`
    background: ${({ correct }) => (correct ? '#0e2a17' : C.surface2)};
    border: 1px solid ${({ correct }) => (correct ? C.green : C.border)};
    border-radius: 8px;
    padding: 14px 18px;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 10px;
`;

const OptionBadge = styled.span`
    display: inline-flex;
    width: 26px; height: 26px;
    border-radius: 6px;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 12px;
    background: ${({ correct }) => (correct ? C.green : C.surface)};
    color: ${({ correct }) => (correct ? '#fff' : C.muted)};
    flex-shrink: 0;
`;

const Stat = styled.div`
    text-align: center;
    padding: 16px;
    background: ${C.surface2};
    border-radius: 8px;
    border: 1px solid ${C.border};
`;

const StatVal = styled.div`
    font-size: 28px;
    font-weight: 700;
    color: ${({ color }) => color || C.blue};
`;

const StatLabel = styled.div`
    font-size: 11px;
    color: ${C.muted};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-top: 4px;
`;

const LbTable = styled.table`
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
`;

const LbRow = styled.tr`
    border-bottom: 1px solid ${C.border};
    &:last-child { border-bottom: none; }
`;

const LbTh = styled.th`
    text-align: left;
    padding: 8px 10px;
    color: ${C.muted};
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
`;

const LbTd = styled.td`
    padding: 9px 10px;
    color: ${C.text};
`;

const ParticipantGrid = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
    min-height: 40px;
`;

const ParticipantChip = styled.span`
    background: ${C.surface2};
    border: 1px solid ${C.border};
    border-radius: 20px;
    padding: 5px 12px;
    font-size: 12px;
    color: ${C.text};
`;

const JoinPanel = styled.div`
    background: ${C.surface2};
    border: 1px solid ${C.border};
    border-radius: 10px;
    padding: 20px 24px;
    display: flex;
    gap: 28px;
    align-items: flex-start;
    margin-bottom: 24px;
`;

const JoinPanelLarge = styled(JoinPanel)`
    background: ${C.surface};
    border-color: ${C.blue}55;
    padding: 28px 32px;
    align-items: center;
    gap: 36px;
`;

const JoinUrl = styled.div`
    font-family: 'Courier New', 'Consolas', monospace;
    font-size: 15px;
    font-weight: 700;
    color: ${C.blue};
    word-break: break-all;
    line-height: 1.5;
    margin-bottom: 6px;
`;

const ShortUrlRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 8px;
`;

const CopyBtn = styled.button`
    padding: 5px 12px;
    border: 1px solid ${C.border};
    border-radius: 5px;
    background: transparent;
    color: ${C.muted};
    font-size: 12px;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s;
    &:hover { border-color: ${C.blue}; color: ${C.blue}; }
`;

const QuizPicker = styled.select`
    background: ${C.surface2};
    border: 1px solid ${C.border};
    border-radius: 7px;
    color: ${C.text};
    font-size: 14px;
    padding: 9px 12px;
    cursor: pointer;
    flex: 1;
    min-width: 0;
    &:focus { outline: none; border-color: ${C.blue}; }
`;

const MEDALS = ['🥇', '🥈', '🥉'];
const OPTION_COLORS = ['#009CDE', '#5CC05C', '#ED8B00', '#9B59B6', '#E84545', '#20B2AA'];

/** Horizontal distribution bars shown after answer reveal. */
function DistBars({ options, dist, total }) {
    if (!options || options.length === 0 || total === 0) return null;
    const countMap = Object.fromEntries((dist || []).map((d) => [d.option, Number(d.count)]));
    return (
        <div style={{ marginBottom: 20 }}>
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

// ── Component ─────────────────────────────────────────────────────────────────
export default function SyncHostPage() {
    const [session, setSession]           = useState(null);
    const [questions, setQuestions]       = useState([]);
    const [quizName, setQuizName]         = useState('');
    const [participants, setParticipants] = useState([]);
    const [leaderboard, setLeaderboard]   = useState([]);
    const [answerDist, setAnswerDist]     = useState([]); // [{option, count}]
    const [distTotal, setDistTotal]       = useState(0);  // total respondents
    const [timeLeft, setTimeLeft]         = useState(0);
    const [status, setStatus]             = useState(null); // { error, msg }
    const [busy, setBusy]                 = useState(false);

    // Quiz selection — host picks which quiz to run, independent of global active_quiz_id
    const [quizzes, setQuizzes]           = useState([]);
    const [selectedQuizId, setSelectedQuizId] = useState('');
    // Question count for this session ('all' or a number as string)
    const [questionCount, setQuestionCount] = useState('all');
    const [totalAvailable, setTotalAvailable] = useState(0); // total Qs in selected quiz

    // Join URL state
    const [playUrl]    = useState(getPlayUrl);
    const [shortUrl, setShortUrl] = useState('');
    const [copied, setCopied]     = useState(false);

    const questionsRef  = useRef([]);
    const sessionRef    = useRef(null);
    const revealedRef   = useRef(false); // prevent double-reveal when timer hits 0

    // ── Load quiz list + short URL on mount ───────────────────────────────────
    useEffect(() => {
        Promise.all([listQuizzes(), loadConfig()])
            .then(async ([qs, cfg]) => {
                setQuizzes(qs);
                const defaultId = cfg.active_quiz_id || (qs[0]?._key ?? '');
                setSelectedQuizId(defaultId);
                if (defaultId) loadQuizMeta(defaultId, qs);
            })
            .catch(() => {});

        // Try to shorten the play URL (best-effort, needs internet)
        fetchShortUrl(playUrl).then((s) => s && setShortUrl(s));
    }, []);

    // ── Fetch question count + default limit when quiz selection changes ───────
    const loadQuizMeta = async (quizId, quizList) => {
        try {
            const list = quizList || quizzes;
            const meta = list.find((q) => q._key === quizId);
            const docs = await listQuestions(quizId);
            const total = docs.length;
            setTotalAvailable(total);
            // Pre-fill with the quiz's saved question_limit (if any), else 'all'
            const saved = meta?.question_limit ? String(meta.question_limit) : 'all';
            setQuestionCount(saved);
        } catch (_) {
            setTotalAvailable(0);
            setQuestionCount('all');
        }
    };

    // ── Polling loop: refresh session + presence every 2 s ───────────────────
    useEffect(() => {
        let mounted = true;

        const poll = async () => {
            const sess = await getSession();
            if (!mounted) return;
            sessionRef.current = sess;
            setSession(sess ? { ...sess } : null);

            if (sess?.session_id) {
                const presence = await getPresence(sess.session_id);
                if (mounted) setParticipants(presence.map((p) => p.nickname));
            }

            // Re-hydrate questions if host refreshed mid-session
            if (
                sess?.question_keys &&
                questionsRef.current.length === 0 &&
                sess.phase && sess.phase !== 'idle'
            ) {
                try {
                    const docs = await listQuestions(sess.quiz_id);
                    const byKey = Object.fromEntries(docs.map((d) => [d._key, fromKvDoc(d)]));
                    const keys = JSON.parse(sess.question_keys);
                    const ordered = keys.map((k) => byKey[k]).filter(Boolean);
                    questionsRef.current = ordered;
                    if (mounted) setQuestions(ordered);
                } catch (_) {}
            }
        };

        poll();
        const id = setInterval(poll, 2000);
        return () => { mounted = false; clearInterval(id); };
    }, []);

    // ── Server-authoritative countdown timer ─────────────────────────────────
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

    // ── Host actions ──────────────────────────────────────────────────────────
    const write = useCallback(async (newFields) => {
        // Always write the complete merged document so no fields are lost
        const base = sessionRef.current ? { ...sessionRef.current } : {};
        delete base._key;
        const doc = { ...base, ...newFields };
        await updateSession(doc);
        sessionRef.current = doc;
        setSession({ ...doc });
    }, []);

    const handleStartSession = async () => {
        setBusy(true);
        setStatus(null);
        try {
            const qid  = selectedQuizId;
            if (!qid) { setStatus({ error: true, msg: 'Pick a quiz above before starting.' }); return; }
            const [docs, meta] = await Promise.all([listQuestions(qid), getQuiz(qid).catch(() => null)]);
            if (!docs.length) { setStatus({ error: true, msg: 'The active quiz has no questions.' }); return; }

            let qs = docs.map(fromKvDoc);
            // Use the host's per-session selection, not the quiz's saved limit
            const limit = questionCount !== 'all' ? Number(questionCount) : null;
            if (limit && limit > 0 && limit < qs.length) qs = shuffle(qs).slice(0, limit);

            setQuizName(meta?.name || 'Quiz');
            questionsRef.current = qs;
            setQuestions(qs);

            const sessionId = uid();
            revealedRef.current = false;

            const doc = {
                phase: 'waiting',
                session_id: sessionId,
                quiz_id: qid,
                question_index: 0,
                question_keys: JSON.stringify(qs.map((q) => q._key)),
                time_limit: qs[0]?.timeLimit || 30,
                question_started_at: '',
            };
            await updateSession(doc);
            await clearPresence(sessionId);
            sessionRef.current = doc;
            setSession({ ...doc });
            setParticipants([]);
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

    const fetchDist = async (sid, qIdx) => {
        try {
            const [distRows, totalRows] = await Promise.all([
                runSearch(
                    `index=ponypoll session_id="${sid}" sourcetype=ponypoll_answer question_index=${qIdx} | eval opts=split(answer, ",") | mvexpand opts | stats count by opts | rename opts as option`,
                    { earliest: '-1d' }
                ),
                runSearch(
                    `index=ponypoll session_id="${sid}" sourcetype=ponypoll_answer question_index=${qIdx} | stats count as total`,
                    { earliest: '-1d' }
                ),
            ]);
            setAnswerDist(distRows);
            setDistTotal(Number(totalRows[0]?.total || 0));
        } catch (_) {}
    };

    const handleReveal = useCallback(async () => {
        if (revealedRef.current) return;
        revealedRef.current = true;
        setBusy(true);
        try {
            await write({ phase: 'reveal' });
            const sid  = sessionRef.current?.session_id;
            const qIdx = sessionRef.current?.question_index ?? 0;
            if (sid) {
                setAnswerDist([]);
                setDistTotal(0);
                const [lbRows] = await Promise.all([
                    runSearch(
                        `index=ponypoll session_id="${sid}" sourcetype=ponypoll_answer | stats sum(points) as score by nickname | sort -score | head 10`,
                        { earliest: '-1d' }
                    ),
                    fetchDist(sid, qIdx),
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
        try {
            const nextIdx = (sessionRef.current?.question_index || 0) + 1;
            const qs      = questionsRef.current;
            if (nextIdx >= qs.length) {
                await write({ phase: 'done' });
                const sid = sessionRef.current?.session_id;
                if (sid) {
                    const rows = await runSearch(
                        `index=ponypoll session_id="${sid}" sourcetype=ponypoll_answer | stats sum(points) as score by nickname | sort -score | head 10`,
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

    const handleEndSession = async () => {
        if (!window.confirm('End this session? Participants will see "Quiz ended".')) return;
        setBusy(true);
        try {
            await write({ phase: 'idle' });
            setQuestions([]);
            questionsRef.current = [];
            setLeaderboard([]);
            setParticipants([]);
        } catch (e) { setStatus({ error: true, msg: e.message }); }
        finally { setBusy(false); }
    };

    // ── Copy URL helper ───────────────────────────────────────────────────────
    const handleCopy = (url) => {
        navigator.clipboard?.writeText(url).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // ── Join info block (compact for idle, large for lobby) ───────────────────
    const JoinInfo = ({ large }) => {
        const urlToShow = shortUrl || playUrl;
        const Panel = large ? JoinPanelLarge : JoinPanel;
        const qrSize = large ? 180 : 110;
        return (
            <Panel>
                {/* QR code — white background so it's always scannable */}
                <div style={{ background: '#fff', padding: 8, borderRadius: 8, flexShrink: 0, lineHeight: 0 }}>
                    <QRCodeSVG
                        value={playUrl}
                        size={qrSize}
                        bgColor="#ffffff"
                        fgColor="#000000"
                        level="M"
                    />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                        Participants — scan or open
                    </div>

                    {/* Full URL always shown — best for copy-paste on laptops */}
                    <JoinUrl style={large ? { fontSize: 17 } : {}}>{playUrl}</JoinUrl>

                    {/* Short URL row — shown when TinyURL resolved */}
                    {shortUrl && (
                        <ShortUrlRow>
                            <span style={{ fontSize: 11, color: C.muted }}>Short:</span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: C.yellow, fontFamily: 'monospace' }}>
                                {shortUrl}
                            </span>
                        </ShortUrlRow>
                    )}

                    <ShortUrlRow style={{ marginTop: 10 }}>
                        <CopyBtn onClick={() => handleCopy(shortUrl || playUrl)}>
                            {copied ? '✓ Copied!' : '📋 Copy URL'}
                        </CopyBtn>
                        {shortUrl && (
                            <CopyBtn onClick={() => handleCopy(playUrl)}>
                                Copy full URL
                            </CopyBtn>
                        )}
                    </ShortUrlRow>
                </div>
            </Panel>
        );
    };

    // ── Derived state ─────────────────────────────────────────────────────────
    const phase   = session?.phase || 'idle';
    const qIdx    = Number(session?.question_index) || 0;
    const currQ   = questionsRef.current[qIdx];
    const total   = questionsRef.current.length;
    const timeLim = Number(session?.time_limit) || 30;
    const pct     = total > 0 ? Math.round(((qIdx + (phase === 'done' ? 1 : 0)) / total) * 100) : 0;
    const timerPct = timeLim > 0 ? Math.round((timeLeft / timeLim) * 100) : 0;

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <Page>
            {status && (
                <StatusBanner error={status.error} style={{ maxWidth: 760, width: '100%' }}>
                    {status.msg}
                </StatusBanner>
            )}

            {/* ── IDLE: no session ── */}
            {phase === 'idle' && (
                <Card>
                    <Title>🎙 Synchronized Host Mode</Title>
                    <Subtitle>
                        You control the pace. Everyone sees the same question at the same time.
                        Pick a quiz, start the session, then show participants the join URL below.
                    </Subtitle>

                    <JoinInfo large={false} />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                        {/* Quiz selector */}
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <span style={{ fontSize: 13, color: C.muted, width: 80, flexShrink: 0 }}>Quiz:</span>
                            <QuizPicker
                                value={selectedQuizId}
                                onChange={(e) => {
                                    setSelectedQuizId(e.target.value);
                                    loadQuizMeta(e.target.value);
                                }}
                            >
                                {quizzes.length === 0 && <option value="">Loading…</option>}
                                {quizzes.map((q) => (
                                    <option key={q._key} value={q._key}>{q.name}</option>
                                ))}
                            </QuizPicker>
                        </div>

                        {/* Question count selector */}
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <span style={{ fontSize: 13, color: C.muted, width: 80, flexShrink: 0 }}>Questions:</span>
                            <QuizPicker
                                value={questionCount}
                                onChange={(e) => setQuestionCount(e.target.value)}
                                disabled={!selectedQuizId || totalAvailable === 0}
                            >
                                <option value="all">All {totalAvailable > 0 ? `(${totalAvailable})` : ''}</option>
                                {[3, 5, 6, 8, 10, 12, 15, 20, 25, 30]
                                    .filter((n) => n < totalAvailable)
                                    .map((n) => (
                                        <option key={n} value={String(n)}>
                                            Random {n} of {totalAvailable}
                                        </option>
                                    ))}
                            </QuizPicker>
                        </div>
                    </div>

                    <BigBtn onClick={handleStartSession} disabled={busy || !selectedQuizId}>
                        {busy ? 'Starting…' : '▶ Start Session'}
                    </BigBtn>
                </Card>
            )}

            {/* ── WAITING: lobby ── */}
            {phase === 'waiting' && (
                <Card>
                    <Title>
                        Waiting for participants
                        <PhaseTag phase="waiting">Lobby</PhaseTag>
                    </Title>
                    <Subtitle>
                        Quiz: <strong>{quizName}</strong> &nbsp;·&nbsp; {total} question{total !== 1 ? 's' : ''}
                    </Subtitle>

                    {/* Large QR + URL — main projector slide while participants join */}
                    <JoinInfo large />

                    <Grid2 style={{ gridTemplateColumns: '1fr 1fr', maxWidth: 320, marginBottom: 20 }}>
                        <Stat>
                            <StatVal color={C.green}>{participants.length}</StatVal>
                            <StatLabel>Joined</StatLabel>
                        </Stat>
                        <Stat>
                            <StatVal>{total}</StatVal>
                            <StatLabel>Questions</StatLabel>
                        </Stat>
                    </Grid2>

                    <ParticipantGrid>
                        {participants.length === 0 && (
                            <span style={{ color: C.muted, fontSize: 13 }}>No participants yet…</span>
                        )}
                        {participants.map((n) => <ParticipantChip key={n}>{n}</ParticipantChip>)}
                    </ParticipantGrid>

                    <div style={{ marginTop: 24 }}>
                        <BigBtn onClick={handleLaunchQuiz} disabled={busy || participants.length === 0}>
                            {busy ? 'Launching…' : `▶ Launch Quiz (${participants.length} players)`}
                        </BigBtn>
                        <SmallBtn danger onClick={handleEndSession} disabled={busy}>Cancel</SmallBtn>
                    </div>
                </Card>
            )}

            {/* ── QUESTION: live ── */}
            {phase === 'question' && currQ && (
                <Card>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <span style={{ fontSize: 13, color: C.muted }}>
                            Q {qIdx + 1} / {total}
                            <PhaseTag phase="question">Live</PhaseTag>
                        </span>
                        <span style={{ fontSize: 13, color: C.muted }}>
                            {participants.length} participant{participants.length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    <TimerBar>
                        <TimerFill pct={timerPct} />
                    </TimerBar>
                    <TimerLabel>{Math.ceil(timeLeft)}s remaining</TimerLabel>

                    <QuestionBox>{currQ.text}</QuestionBox>

                    {currQ.type === 'single' || currQ.type === 'multi' ? (
                        <Grid2>
                            {currQ.options.map((opt) => (
                                <OptionPill key={opt.id}>
                                    <OptionBadge>{opt.id}</OptionBadge>
                                    {opt.text}
                                </OptionPill>
                            ))}
                        </Grid2>
                    ) : currQ.type === 'yesno' ? (
                        <Grid2 style={{ gridTemplateColumns: '1fr 1fr', maxWidth: 320 }}>
                            <OptionPill><OptionBadge>A</OptionBadge>Yes</OptionPill>
                            <OptionPill><OptionBadge>B</OptionBadge>No</OptionPill>
                        </Grid2>
                    ) : (
                        <div style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>
                            {currQ.type === 'slider'
                                ? `Slider: ${currQ.sliderMin ?? 1}–${currQ.sliderMax ?? 10}`
                                : 'Free text answer'}
                        </div>
                    )}

                    <BigBtn onClick={handleReveal} disabled={busy}>
                        ⏹ Reveal Answers
                    </BigBtn>
                </Card>
            )}

            {/* ── REVEAL: show correct answers + leaderboard ── */}
            {phase === 'reveal' && currQ && (
                <Card>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <Title style={{ margin: 0 }}>
                            Answer Revealed
                            <PhaseTag phase="reveal">Reveal</PhaseTag>
                        </Title>
                        <span style={{ fontSize: 13, color: C.muted }}>Q {qIdx + 1} / {total}</span>
                    </div>

                    <QuestionBox>{currQ.text}</QuestionBox>

                    {(currQ.type === 'single' || currQ.type === 'multi') && (
                        <Grid2>
                            {currQ.options.map((opt) => (
                                <OptionPill key={opt.id} correct={opt.correct}>
                                    <OptionBadge correct={opt.correct}>{opt.id}</OptionBadge>
                                    {opt.text}
                                    {opt.correct && <span style={{ marginLeft: 'auto', color: C.green }}>✓</span>}
                                </OptionPill>
                            ))}
                        </Grid2>
                    )}
                    {currQ.type === 'yesno' && (
                        <Grid2 style={{ gridTemplateColumns: '1fr 1fr', maxWidth: 320 }}>
                            {currQ.options.map((opt) => (
                                <OptionPill key={opt.id} correct={opt.correct}>
                                    <OptionBadge correct={opt.correct}>{opt.id}</OptionBadge>
                                    {opt.text}
                                    {opt.correct && <span style={{ marginLeft: 'auto', color: C.green }}>✓</span>}
                                </OptionPill>
                            ))}
                        </Grid2>
                    )}

                    {/* Answer distribution — visible for choice-type questions */}
                    {(currQ.type === 'single' || currQ.type === 'multi' || currQ.type === 'yesno') && (
                        <DistBars options={currQ.options} dist={answerDist} total={distTotal} />
                    )}

                    {leaderboard.length > 0 && (
                        <>
                            <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, marginTop: 4 }}>
                                🏆 Leaderboard so far
                            </div>
                            <LbTable>
                                <thead>
                                    <LbRow>
                                        <LbTh>#</LbTh>
                                        <LbTh>Player</LbTh>
                                        <LbTh style={{ textAlign: 'right' }}>Score</LbTh>
                                    </LbRow>
                                </thead>
                                <tbody>
                                    {leaderboard.slice(0, 5).map((row, i) => (
                                        <LbRow key={row.nickname}>
                                            <LbTd>{MEDALS[i] || i + 1}</LbTd>
                                            <LbTd style={{ fontWeight: 600 }}>{row.nickname}</LbTd>
                                            <LbTd style={{ textAlign: 'right', color: C.yellow, fontWeight: 700 }}>
                                                {Number(row.score).toLocaleString()}
                                            </LbTd>
                                        </LbRow>
                                    ))}
                                </tbody>
                            </LbTable>
                        </>
                    )}

                    <div style={{ marginTop: 24 }}>
                        <BigBtn onClick={handleNext} disabled={busy}>
                            {qIdx + 1 >= total ? '🏁 End Quiz' : '▶ Next Question'}
                        </BigBtn>
                        <SmallBtn danger onClick={handleEndSession} disabled={busy}>End Session</SmallBtn>
                    </div>
                </Card>
            )}

            {/* ── DONE: final leaderboard ── */}
            {phase === 'done' && (
                <Card>
                    <Title>🏁 Quiz Complete!</Title>
                    <Subtitle>Session finished — {participants.length} participant{participants.length !== 1 ? 's' : ''}.</Subtitle>

                    {leaderboard.length > 0 ? (
                        <LbTable>
                            <thead>
                                <LbRow>
                                    <LbTh>#</LbTh>
                                    <LbTh>Player</LbTh>
                                    <LbTh style={{ textAlign: 'right' }}>Final Score</LbTh>
                                </LbRow>
                            </thead>
                            <tbody>
                                {leaderboard.map((row, i) => (
                                    <LbRow key={row.nickname}>
                                        <LbTd style={{ fontSize: 18 }}>{MEDALS[i] || i + 1}</LbTd>
                                        <LbTd style={{ fontWeight: 600 }}>{row.nickname}</LbTd>
                                        <LbTd style={{ textAlign: 'right', color: C.yellow, fontWeight: 700, fontSize: 16 }}>
                                            {Number(row.score).toLocaleString()}
                                        </LbTd>
                                    </LbRow>
                                ))}
                            </tbody>
                        </LbTable>
                    ) : (
                        <div style={{ color: C.muted, fontSize: 14 }}>No answers recorded yet — check the Analytics tab.</div>
                    )}

                    <div style={{ marginTop: 28 }}>
                        <BigBtn onClick={handleStartSession} disabled={busy}>▶ New Session</BigBtn>
                    </div>
                </Card>
            )}

            {/* Progress bar — visible during question / reveal / done ── */}
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
