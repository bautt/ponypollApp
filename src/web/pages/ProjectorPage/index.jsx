/**
 * ProjectorPage — wall-screen / dual-display view for sync sessions.
 *
 * Designed to be shown on a projector or second monitor while the host
 * uses AdminPage on their own screen.  No admin controls — read-only.
 *
 * URL: /projector  (detected by App.jsx pathname check)
 *
 * Phases mirrored from ponypoll_session:
 *   idle     – waiting screen with QR + play URL
 *   waiting  – lobby: session name, QR, participant count
 *   question – question text + options (non-clickable) + countdown timer
 *   reveal   – question + answer distribution bars + top-5 leaderboard
 *   done     – full leaderboard / podium
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { C } from '../../lib/theme';
import { getSession, listQuestions, getPresence, runSearch } from '../../lib/kvstore';
import { fromKvDoc } from '../../lib/questions';
import { sanitizeId } from '../../lib/utils';
import DistBars from '../../components/DistBars';

// ── helpers ──────────────────────────────────────────────────────────────────

function getPlayUrl() {
    const { protocol, host, pathname } = window.location;
    const base = pathname.replace(/\/[^/]+(\?.*)?$/, '');
    return `${protocol}//${host}${base}/play`;
}

function useSession(intervalMs = 3000) {
    const [session, setSession] = useState(null);
    useEffect(() => {
        let mounted = true;
        const tick = () => {
            getSession()
                .then((s) => { if (mounted) setSession(s || null); })
                .catch(() => {});
        };
        tick();
        const id = setInterval(tick, intervalMs);
        return () => { mounted = false; clearInterval(id); };
    }, [intervalMs]);
    return session;
}

// ── sub-views ────────────────────────────────────────────────────────────────

const S = {
    root: {
        minHeight: '100vh', background: '#0a0d12', color: '#fff',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', fontFamily: 'inherit', padding: 40,
        boxSizing: 'border-box',
    },
    muted: { color: C.muted, fontSize: 16 },
    label: {
        fontSize: 14, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: C.muted, marginBottom: 10,
    },
};

function IdleView({ playUrl }) {
    return (
        <div style={{ ...S.root, gap: 32, textAlign: 'center' }}>
            <img src="/static/app/ponypollapp/buttercup.png" alt="Pony Poll" style={{ width: 120, opacity: 0.85 }} />
            <div style={{ fontSize: 48, fontWeight: 800, color: C.blue, letterSpacing: '-1px' }}>
                Pony Poll
            </div>
            <div style={S.muted}>Waiting for host to start a session…</div>
            <div style={{ background: '#fff', padding: 16, borderRadius: 16, lineHeight: 0 }}>
                <QRCodeSVG value={playUrl} size={200} bgColor="#ffffff" fgColor="#000000" level="M" />
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, color: C.text, fontFamily: 'monospace' }}>
                {playUrl}
            </div>
        </div>
    );
}

function WaitingView({ session, playUrl, participantCount }) {
    return (
        <div style={{ ...S.root, gap: 28, textAlign: 'center' }}>
            <div style={S.label}>Join the quiz</div>
            {session?.session_name && (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                    <span style={{ fontSize: 22, color: C.muted }}>Session</span>
                    <span style={{ fontSize: 72, fontWeight: 900, color: C.blue, letterSpacing: '0.08em', fontVariantNumeric: 'tabular-nums' }}>
                        #{session.session_name}
                    </span>
                </div>
            )}
            {session?.quiz_name && (
                <div style={{ fontSize: 28, fontWeight: 700, color: C.text }}>
                    {session.quiz_name}
                </div>
            )}
            <div style={{ background: '#fff', padding: 14, borderRadius: 14, lineHeight: 0 }}>
                <QRCodeSVG value={playUrl} size={180} bgColor="#ffffff" fgColor="#000000" level="M" />
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, color: C.text, fontFamily: 'monospace' }}>
                {playUrl}
            </div>
            {participantCount > 0 && (
                <div style={{ fontSize: 22, color: C.muted }}>
                    <span style={{ fontWeight: 700, color: C.text, fontSize: 36 }}>{participantCount}</span>
                    {' '}participant{participantCount !== 1 ? 's' : ''} joined
                </div>
            )}
        </div>
    );
}

function TimerBar({ pct }) {
    const color = pct > 0.5 ? C.blue : pct > 0.25 ? C.yellow : '#e74c3c';
    return (
        <div style={{ width: '100%', height: 12, background: '#1e2a38', borderRadius: 6, overflow: 'hidden', margin: '20px 0 8px' }}>
            <div style={{
                height: '100%', width: `${Math.max(0, pct * 100)}%`,
                background: color, borderRadius: 6,
                transition: 'width 1s linear, background 0.5s',
            }} />
        </div>
    );
}

function QuestionView({ session, questions }) {
    const qIdx = session?.question_index ?? 0;
    const q = questions[qIdx];
    const timeLim = session?.time_limit ?? 30;
    const startedAt = session?.question_started_at ? new Date(session.question_started_at).getTime() : null;

    const [timeLeft, setTimeLeft] = useState(timeLim);
    useEffect(() => {
        if (!startedAt) return;
        const update = () => {
            const elapsed = (Date.now() - startedAt) / 1000;
            setTimeLeft(Math.max(0, timeLim - elapsed));
        };
        update();
        const id = setInterval(update, 500);
        return () => clearInterval(id);
    }, [startedAt, timeLim]);

    if (!q) return null;
    const pct = timeLim > 0 ? timeLeft / timeLim : 0;

    return (
        <div style={{ ...S.root, gap: 0, maxWidth: 900, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: 12 }}>
                <span style={{ fontSize: 18, color: C.muted, fontWeight: 600 }}>
                    Q {qIdx + 1} / {questions.length}
                </span>
                <span style={{
                    fontSize: 28, fontWeight: 800,
                    color: pct > 0.5 ? C.blue : pct > 0.25 ? C.yellow : '#e74c3c',
                }}>
                    {Math.ceil(timeLeft)}s
                </span>
            </div>
            <TimerBar pct={pct} />
            {q.image && (
                <img src={q.image} alt="" style={{
                    maxWidth: 480, maxHeight: 260, borderRadius: 12,
                    objectFit: 'contain', margin: '16px auto',
                }} />
            )}
            <div style={{ fontSize: 42, fontWeight: 700, color: '#fff', textAlign: 'center', lineHeight: 1.3, margin: '24px 0' }}>
                {q.text}
            </div>
            {['single', 'multi', 'yesno'].includes(q.type) && q.options?.length > 0 && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: q.options.length <= 2 ? '1fr 1fr' : 'repeat(2, 1fr)',
                    gap: 16, width: '100%', marginTop: 8,
                }}>
                    {q.options.map((opt, i) => (
                        <div key={opt.id} style={{
                            padding: '20px 28px', borderRadius: 12,
                            background: [C.blue, C.green, C.yellow, '#e74c3c'][i % 4] + '22',
                            border: `2px solid ${[C.blue, C.green, C.yellow, '#e74c3c'][i % 4]}55`,
                            fontSize: 24, fontWeight: 600, color: '#fff',
                            display: 'flex', alignItems: 'center', gap: 16,
                        }}>
                            <span style={{
                                width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                                background: [C.blue, C.green, C.yellow, '#e74c3c'][i % 4],
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 800, fontSize: 16,
                            }}>{opt.id}</span>
                            {opt.text}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function RevealView({ session, questions, answerDist, distTotal, leaderboard }) {
    const qIdx = session?.question_index ?? 0;
    const q = questions[qIdx];
    if (!q) return null;

    return (
        <div style={{ ...S.root, gap: 24, maxWidth: 1100, width: '100%', flexDirection: 'row', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 500px', minWidth: 300 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                    Q {qIdx + 1} / {questions.length}
                </div>
                <div style={{ fontSize: 30, fontWeight: 700, color: '#fff', lineHeight: 1.3, marginBottom: 20 }}>
                    {q.text}
                </div>
                <DistBars options={q.options || []} dist={answerDist} total={distTotal} />
            </div>
            {leaderboard.length > 0 && (
                <div style={{ flex: '0 0 260px', minWidth: 200 }}>
                    <div style={S.label}>Leaderboard</div>
                    {leaderboard.slice(0, 5).map((row, i) => (
                        <div key={row.nickname} style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '8px 12px', marginBottom: 6,
                            background: i === 0 ? '#3d310022' : C.surface,
                            border: `1px solid ${i === 0 ? C.yellow + '55' : C.border}`,
                            borderRadius: 8,
                        }}>
                            <span style={{ fontWeight: 800, fontSize: 16, color: ['#FFD700','#C0C0C0','#CD7F32'][i] || C.muted, minWidth: 22 }}>
                                {i + 1}
                            </span>
                            <span style={{ flex: 1, fontWeight: 600, fontSize: 18, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {row.nickname}
                            </span>
                            <span style={{ fontWeight: 700, fontSize: 18, color: C.yellow }}>
                                {row.score}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function DoneView({ leaderboard }) {
    const podium = leaderboard.slice(0, 3);
    const rest   = leaderboard.slice(3);
    const medals = ['🥇', '🥈', '🥉'];

    return (
        <div style={{ ...S.root, gap: 28, maxWidth: 700, width: '100%' }}>
            <div style={{ fontSize: 40, fontWeight: 800, color: C.yellow }}>
                🎉 Quiz Complete!
            </div>
            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end', flexWrap: 'wrap', justifyContent: 'center' }}>
                {podium.map((row, i) => (
                    <div key={row.nickname} style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        padding: '24px 28px', borderRadius: 16,
                        background: ['#3d310055', '#2a2a2a', '#2a1a0055'][i] || C.surface,
                        border: `2px solid ${['#FFD700', '#C0C0C0', '#CD7F32'][i]}55`,
                        minWidth: 140,
                    }}>
                        <span style={{ fontSize: 42 }}>{medals[i]}</span>
                        <span style={{ fontSize: 20, fontWeight: 700, color: '#fff', textAlign: 'center' }}>{row.nickname}</span>
                        <span style={{ fontSize: 28, fontWeight: 800, color: C.yellow }}>{row.score}</span>
                    </div>
                ))}
            </div>
            {rest.length > 0 && (
                <div style={{ width: '100%', maxWidth: 420 }}>
                    {rest.map((row, i) => (
                        <div key={row.nickname} style={{
                            display: 'flex', gap: 12, alignItems: 'center', padding: '8px 12px',
                            borderBottom: `1px solid ${C.border}`, fontSize: 18,
                        }}>
                            <span style={{ color: C.muted, minWidth: 24, fontWeight: 700 }}>{i + 4}</span>
                            <span style={{ flex: 1, color: C.text, fontWeight: 600 }}>{row.nickname}</span>
                            <span style={{ color: C.yellow, fontWeight: 700 }}>{row.score}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── main component ────────────────────────────────────────────────────────────

export default function ProjectorPage() {
    const session      = useSession(3000);
    const phase        = session?.phase || 'idle';
    const playUrl      = getPlayUrl();

    const [questions,        setQuestions]        = useState([]);
    const [participantCount, setParticipantCount] = useState(0);
    const [answerDist,       setAnswerDist]        = useState([]);
    const [distTotal,        setDistTotal]         = useState(0);
    const [leaderboard,      setLeaderboard]       = useState([]);

    const lastRevealKey = useRef(null);
    const lastDoneKey   = useRef(null);

    // Load questions ordered by session.question_keys (mirrors how AdminPage builds its list)
    useEffect(() => {
        if (!session?.quiz_id || !session?.question_keys) return;
        listQuestions(session.quiz_id)
            .then((docs) => {
                const byKey = Object.fromEntries(docs.map((d) => [d._key, fromKvDoc(d)]));
                try {
                    const keys = JSON.parse(session.question_keys);
                    setQuestions(keys.map((k) => byKey[k]).filter(Boolean));
                } catch (_) {
                    setQuestions(docs.map(fromKvDoc));
                }
            })
            .catch(() => {});
    }, [session?.quiz_id, session?.question_keys]);

    // Poll participant count during waiting phase
    useEffect(() => {
        if (phase !== 'waiting') return;
        let mounted = true;
        const tick = () => {
            getPresence(session?.session_id)
                .then((rows) => { if (mounted) setParticipantCount(Array.isArray(rows) ? rows.length : 0); })
                .catch(() => {});
        };
        tick();
        const id = setInterval(tick, 4000);
        return () => { mounted = false; clearInterval(id); };
    }, [phase, session?.session_id]);

    // Fetch dist + leaderboard when entering reveal phase
    useEffect(() => {
        if (phase !== 'reveal' || !session) return;
        const sid  = sanitizeId(session.session_id);
        const qIdx = session.question_index ?? 0;
        const key  = `${sid}-${qIdx}`;
        if (lastRevealKey.current === key) return;
        lastRevealKey.current = key;

        const q = questions[qIdx];
        const qType = q?.type;

        setAnswerDist([]);
        setDistTotal(0);

        const distQuery = qType === 'wordcloud'
            ? null
            : runSearch(
                `\`ponypoll_index\` sourcetype=ponypoll_answer session_id="${sid}" question_index=${qIdx} | eval opts=split(answer,",") | mvexpand opts | stats count by opts | rename opts as option`,
                { earliest: '-1d' }
            );
        const totalQuery = qType === 'wordcloud'
            ? null
            : runSearch(
                `\`ponypoll_index\` sourcetype=ponypoll_answer session_id="${sid}" question_index=${qIdx} | stats count as total`,
                { earliest: '-1d' }
            );
        const lbQuery = runSearch(
            `\`ponypoll_index\` sourcetype=ponypoll_answer session_id="${sid}" | stats sum(points) as score by nickname | sort -score | head 10`,
            { earliest: '-1d' }
        );

        Promise.all([distQuery, totalQuery, lbQuery].filter(Boolean))
            .then((results) => {
                if (qType !== 'wordcloud') {
                    setAnswerDist(results[0] || []);
                    setDistTotal(Number(results[1]?.[0]?.total || 0));
                    setLeaderboard(results[2] || []);
                } else {
                    setLeaderboard(results[0] || []);
                }
            })
            .catch(() => {});
    }, [phase, session, questions]);

    // Fetch final leaderboard when entering done phase
    useEffect(() => {
        if (phase !== 'done' || !session) return;
        const sid = sanitizeId(session.session_id);
        if (!sid || lastDoneKey.current === sid) return;
        lastDoneKey.current = sid;

        runSearch(
            `\`ponypoll_index\` sourcetype=ponypoll_answer session_id="${sid}" | stats sum(points) as score by nickname | sort -score | head 10`,
            { earliest: '-1d' }
        )
            .then((rows) => setLeaderboard(rows || []))
            .catch(() => {});
    }, [phase, session]);

    if (phase === 'idle')     return <IdleView playUrl={playUrl} />;
    if (phase === 'waiting')  return <WaitingView session={session} playUrl={playUrl} participantCount={participantCount} />;
    if (phase === 'question') return <QuestionView session={session} questions={questions} />;
    if (phase === 'reveal')   return <RevealView session={session} questions={questions} answerDist={answerDist} distTotal={distTotal} leaderboard={leaderboard} />;
    if (phase === 'done')     return <DoneView leaderboard={leaderboard} />;

    return <IdleView playUrl={playUrl} />;
}
