import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { runSearch } from '../lib/kvstore';
import { C, FONTS } from '../lib/theme';

// ── Styled components ──────────────────────────────────────────────────────────
const Page = styled.div`
    min-height: calc(100vh - 45px);
    background: ${C.bg};
    color: ${C.text};
    font-family: ${FONTS.sans};
    padding: 20px 24px 40px;
`;

const FilterBar = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    background: ${C.surface};
    border: 1px solid ${C.border};
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 24px;
`;

const FilterLabel = styled.label`
    font-size: 12px;
    color: ${C.muted};
    margin-right: 4px;
    white-space: nowrap;
`;

const Select = styled.select`
    background: ${C.surface2};
    border: 1px solid ${C.border};
    border-radius: 5px;
    color: ${C.text};
    font-size: 13px;
    padding: 6px 10px;
    cursor: pointer;
    &:focus { outline: 2px solid ${C.blue}; border-color: ${C.blue}; }
`;

const FilterInput = styled.input`
    background: ${C.surface2};
    border: 1px solid ${C.border};
    border-radius: 5px;
    color: ${C.text};
    font-size: 13px;
    padding: 6px 10px;
    width: 160px;
    &::placeholder { color: ${C.muted}; }
    &:focus { outline: 2px solid ${C.blue}; border-color: ${C.blue}; }
`;

const RunBtn = styled.button`
    background: ${C.blue};
    color: #fff;
    border: none;
    border-radius: 5px;
    padding: 7px 18px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    margin-left: auto;
    &:hover { background: #007ab5; }
    &:disabled { opacity: 0.5; cursor: default; }
`;

const FilterSep = styled.div`
    width: 1px;
    height: 24px;
    background: ${C.border};
    margin: 0 4px;
`;

const KpiRow = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
`;

const KpiCard = styled.div`
    background: ${C.surface};
    border: 1px solid ${C.border};
    border-top: 3px solid ${({ accent }) => accent || C.blue};
    border-radius: 8px;
    padding: 16px 20px;
`;

const KpiValue = styled.div`
    font-size: 32px;
    font-weight: 700;
    color: ${({ accent }) => accent || '#fff'};
    line-height: 1.1;
`;

const KpiLabel = styled.div`
    font-size: 12px;
    color: ${C.muted};
    margin-top: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const Row = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 16px;
    @media (max-width: 900px) { grid-template-columns: 1fr; }
`;

const Panel = styled.div`
    background: ${C.surface};
    border: 1px solid ${C.border};
    border-radius: 8px;
    overflow: hidden;
`;

const PanelWide = styled(Panel)`
    grid-column: 1 / -1;
`;

const PanelHead = styled.div`
    padding: 12px 16px;
    border-bottom: 1px solid ${C.border};
    font-size: 13px;
    font-weight: 600;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 8px;
`;

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
`;

const Th = styled.th`
    padding: 8px 16px;
    text-align: left;
    color: ${C.muted};
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid ${C.border};
    background: ${C.surface2};
    white-space: nowrap;
`;

const ThRight = styled(Th)`text-align: right;`;

const Td = styled.td`
    padding: 9px 16px;
    border-bottom: 1px solid ${C.border};
    color: ${C.text};
    &:last-child { border-right: none; }
`;

const TdRight = styled(Td)`text-align: right; font-variant-numeric: tabular-nums;`;

const TdMuted = styled(Td)`color: ${C.muted};`;

const Tr = styled.tr`
    &:hover { background: ${C.surface2}; }
    &:last-child td { border-bottom: none; }
`;

const Medal = styled.span`
    display: inline-block;
    width: 22px;
    text-align: center;
    font-size: 14px;
`;

const BarWrap = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const BarTrack = styled.div`
    flex: 1;
    background: ${C.border};
    border-radius: 3px;
    height: 8px;
    overflow: hidden;
`;

const BarFill = styled.div`
    height: 100%;
    border-radius: 3px;
    background: ${({ color }) => color || C.blue};
    width: ${({ pct }) => Math.max(2, pct)}%;
    transition: width 0.5s ease;
`;

const BarPct = styled.span`
    font-size: 12px;
    color: ${C.muted};
    min-width: 36px;
    text-align: right;
    font-variant-numeric: tabular-nums;
`;

const spin = keyframes`from{transform:rotate(0deg)}to{transform:rotate(360deg)}`;
const Spinner = styled.div`
    width: 32px; height: 32px;
    border: 3px solid ${C.border};
    border-top-color: ${C.blue};
    border-radius: 50%;
    animation: ${spin} 0.8s linear infinite;
    margin: 40px auto;
`;

const Empty = styled.div`
    padding: 40px;
    text-align: center;
    color: ${C.muted};
    font-size: 14px;
`;

const ErrorMsg = styled.div`
    background: #2a1a1a;
    border: 1px solid ${C.red};
    border-radius: 6px;
    color: ${C.red};
    padding: 12px 16px;
    font-size: 13px;
    margin-bottom: 16px;
`;

const DataNote = styled.div`
    font-size: 11px;
    color: ${C.muted};
    margin-left: 8px;
    font-weight: 400;
`;

// ── Time range options ─────────────────────────────────────────────────────────
const TIME_OPTS = [
    { label: 'Last 15 min',  earliest: '-15m' },
    { label: 'Last 1 hour',  earliest: '-1h'  },
    { label: 'Last 4 hours', earliest: '-4h'  },
    { label: 'Last 24 hours',earliest: '-24h' },
    { label: 'Last 7 days',  earliest: '-7d'  },
    { label: 'Last 30 days', earliest: '-30d' },
    { label: 'All time',     earliest: '0'    },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function medal(rank) {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return String(rank);
}

function num(v, fallback = 0) {
    const n = Number(v);
    return isNaN(n) ? fallback : n;
}

function fmtScore(v) {
    return num(v) >= 10000
        ? `${(num(v) / 1000).toFixed(1)}k`
        : String(Math.round(num(v)));
}

function fmtTime(isoOrUnix) {
    if (!isoOrUnix) return '—';
    const d = new Date(Number(isoOrUnix) > 1e9 ? Number(isoOrUnix) * 1000 : isoOrUnix);
    if (isNaN(d)) return String(isoOrUnix);
    return d.toISOString().replace('T', ' ').slice(0, 16);
}

// ── Base search SPL builders ───────────────────────────────────────────────────
// Time filter is passed via `opts.earliest`; quiz filter is baked into SPL.
// All other filtering (nickname) happens in JavaScript after fetch.

// All-time quiz catalogue — reads from the index so deleted quizzes still appear.
// Uses stats first() instead of dedup for a deterministic single-pass aggregation.
function quizListSpl() {
    return `index=ponypoll sourcetype=ponypoll_attempt
        | stats first(quiz_name) as quiz_name by quiz_id
        | eval label=if(isnotnull(quiz_name) AND quiz_name!="", quiz_name, quiz_id)
        | fields quiz_id label
        | sort label`;
}

function attemptBaseSpl(quizId) {
    const qf = quizId ? ` quiz_id="${quizId}"` : '';
    return `index=ponypoll sourcetype=ponypoll_attempt${qf}
        | table _time event nickname session_id total_score question_count quiz_id quiz_name
        | sort -_time`;
}

function answerBaseSpl(quizId) {
    const qf = quizId ? ` quiz_id="${quizId}"` : '';
    return `index=ponypoll sourcetype=ponypoll_answer${qf}
        | table _time nickname session_id session_name question correct points type quiz_id
        | sort -_time`;
}

// Distinct sync session names from ponypoll_answer events — latest first.
function sessionListSpl() {
    return `index=ponypoll sourcetype=ponypoll_answer session_name=*
        | stats count by session_name
        | fields session_name
        | sort -session_name`;
}

// ── In-browser aggregation functions ──────────────────────────────────────────

function applyNicknameFilter(rows, nickname) {
    return nickname ? rows.filter((r) => r.nickname === nickname) : rows;
}

function applySessionFilter(rows, sessionName) {
    return sessionName ? rows.filter((r) => (r.session_name || '') === sessionName) : rows;
}

function computeKpi(attempts) {
    const done = attempts.filter((r) => r.event === 'quiz_complete');
    const scores = done.map((r) => num(r.total_score));
    const nickSet = new Set(done.map((r) => r.nickname).filter(Boolean));
    return {
        attempts:     done.length,
        participants: nickSet.size,
        avg_score:    scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
        top_score:    scores.length ? Math.max(...scores) : 0,
    };
}

function computeLeaderboard(attempts) {
    const done = attempts.filter((r) => r.event === 'quiz_complete');
    const byNick = {};
    for (const r of done) {
        const n = r.nickname || '—';
        if (!byNick[n]) byNick[n] = { nickname: n, best_score: 0, runs: 0 };
        byNick[n].runs++;
        byNick[n].best_score = Math.max(byNick[n].best_score, num(r.total_score));
    }
    return Object.values(byNick)
        .sort((a, b) => b.best_score - a.best_score)
        .slice(0, 20);
}

function computeQuestions(answers) {
    const byQ = {};
    for (const r of answers) {
        const q = r.question;
        if (!q) continue;
        if (!byQ[q]) byQ[q] = { question: q, total: 0, correct: 0, pts: 0 };
        byQ[q].total++;
        if (r.correct === 'true' || r.correct === true) byQ[q].correct++;
        byQ[q].pts += num(r.points);
    }
    return Object.values(byQ)
        .map((q) => ({
            question:    q.question,
            pct_correct: q.total ? (q.correct / q.total) * 100 : 0,
            avg_points:  q.total ? q.pts / q.total : 0,
            answers:     q.total,
            correct:     q.correct,
            wrong:       q.total - q.correct,
        }))
        .sort((a, b) => a.pct_correct - b.pct_correct); // hardest first
}

function computeNicknames(attempts) {
    return [...new Set(attempts.map((r) => r.nickname).filter(Boolean))].sort();
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
    const [quizzes, setQuizzes]         = useState([]); // [{quiz_id, label}] from index
    const [syncSessions, setSyncSessions] = useState([]); // [{session_name}] from index
    const [timeIdx, setTimeIdx]         = useState(1); // default: Last 1 hour
    const [quizId, setQuizId]           = useState('');
    const [sessionFilter, setSessionFilter] = useState(''); // sync session name filter
    const [nickname, setNickname]       = useState('');
    const [nicknameInput, setNicknameInput] = useState('');

    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState('');
    const [hasData, setHasData]   = useState(false);

    // Raw base results (time + quiz filtered in Splunk)
    const [rawAttempts, setRawAttempts] = useState([]);
    const [rawAnswers,  setRawAnswers]  = useState([]);

    // ── Derived: apply session + nickname filters in JS (instant, no extra search) ──
    const sessionAttempts = useMemo(
        () => applySessionFilter(rawAttempts, sessionFilter),
        [rawAttempts, sessionFilter],
    );
    const sessionAnswers = useMemo(
        () => applySessionFilter(rawAnswers, sessionFilter),
        [rawAnswers, sessionFilter],
    );
    const filteredAttempts = useMemo(
        () => applyNicknameFilter(sessionAttempts, nickname),
        [sessionAttempts, nickname],
    );
    const filteredAnswers = useMemo(
        () => applyNicknameFilter(sessionAnswers, nickname),
        [sessionAnswers, nickname],
    );

    const kpi         = useMemo(() => computeKpi(filteredAttempts),        [filteredAttempts]);
    const leaderboard = useMemo(() => computeLeaderboard(filteredAttempts), [filteredAttempts]);
    const questions   = useMemo(() => computeQuestions(filteredAnswers),    [filteredAnswers]);
    const sessions    = useMemo(() => filteredAttempts.slice(0, 50),        [filteredAttempts]);
    const nicknames   = useMemo(() => computeNicknames(rawAttempts),        [rawAttempts]);
    const answerCount = filteredAnswers.length;

    const maxLbPts = Math.max(...leaderboard.map((r) => r.best_score), 1);

    // Load quiz list + sync session list from the index (all-time).
    // Sessions are sorted latest-first; auto-select the most recent one.
    useEffect(() => {
        runSearch(quizListSpl(), { earliest: '0', latest: 'now', count: 200 })
            .then((rows) => setQuizzes(rows.filter((r) => r.quiz_id)))
            .catch(() => {});
        runSearch(sessionListSpl(), { earliest: '0', latest: 'now', count: 500 })
            .then((rows) => {
                const valid = rows.filter((r) => r.session_name);
                setSyncSessions(valid);
                if (valid.length > 0) setSessionFilter(valid[0].session_name);
            })
            .catch(() => {});
    }, []);

    // Fetch both base searches; time + quiz filter applied in SPL
    const runAll = useCallback(async () => {
        setLoading(true);
        setError('');
        const opts = { earliest: TIME_OPTS[timeIdx].earliest, latest: 'now', count: 5000 };
        try {
            const [attempts, answers] = await Promise.all([
                runSearch(attemptBaseSpl(quizId), opts),
                runSearch(answerBaseSpl(quizId),  opts),
            ]);
            setRawAttempts(attempts);
            setRawAnswers(answers);
            setHasData(true);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [timeIdx, quizId]);

    useEffect(() => { runAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <Page>
            {/* ── Filter bar ── */}
            <FilterBar>
                <FilterLabel>Time</FilterLabel>
                <Select value={timeIdx} onChange={(e) => setTimeIdx(Number(e.target.value))}>
                    {TIME_OPTS.map((o, i) => (
                        <option key={i} value={i}>{o.label}</option>
                    ))}
                </Select>

                <FilterSep />

                <FilterLabel>Quiz</FilterLabel>
                <Select value={quizId} onChange={(e) => setQuizId(e.target.value)}>
                    <option value="">All quizzes</option>
                    {quizzes.map((q) => (
                        <option key={q.quiz_id} value={q.quiz_id}>{q.label}</option>
                    ))}
                </Select>

                {syncSessions.length > 0 && (
                    <>
                        <FilterSep />
                        <FilterLabel>Session</FilterLabel>
                        <Select value={sessionFilter} onChange={(e) => setSessionFilter(e.target.value)}>
                            <option value="">All sessions</option>
                            {syncSessions.map((s, i) => (
                                <option key={s.session_name} value={s.session_name}>
                                    {s.session_name}{i === 0 ? ' (latest)' : ''}
                                </option>
                            ))}
                        </Select>
                    </>
                )}

                <FilterSep />

                <FilterLabel>Nickname</FilterLabel>
                {nicknames.length > 0 ? (
                    <Select
                        value={nicknameInput}
                        onChange={(e) => {
                            setNicknameInput(e.target.value);
                            setNickname(e.target.value);
                        }}
                    >
                        <option value="">All players</option>
                        {nicknames.map((n) => <option key={n} value={n}>{n}</option>)}
                    </Select>
                ) : (
                    <FilterInput
                        placeholder="All players…"
                        value={nicknameInput}
                        onChange={(e) => setNicknameInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') setNickname(nicknameInput.trim());
                        }}
                    />
                )}

                <RunBtn onClick={runAll} disabled={loading}>
                    {loading ? '…' : '⟳ Run'}
                </RunBtn>
            </FilterBar>

            {error && <ErrorMsg>⚠ {error}</ErrorMsg>}
            {loading && <Spinner />}

            {!loading && hasData && (
                <>
                    {/* ── KPI row ── */}
                    <KpiRow>
                        <KpiCard accent={C.blue}>
                            <KpiValue accent={C.blue}>{kpi.attempts}</KpiValue>
                            <KpiLabel>Quiz completions</KpiLabel>
                        </KpiCard>
                        <KpiCard accent={C.green}>
                            <KpiValue accent={C.green}>{kpi.participants}</KpiValue>
                            <KpiLabel>Unique players</KpiLabel>
                        </KpiCard>
                        <KpiCard accent={C.yellow}>
                            <KpiValue accent={C.yellow}>{fmtScore(kpi.avg_score)}</KpiValue>
                            <KpiLabel>Avg score</KpiLabel>
                        </KpiCard>
                        <KpiCard accent={C.orange}>
                            <KpiValue accent={C.orange}>{fmtScore(kpi.top_score)}</KpiValue>
                            <KpiLabel>Top score</KpiLabel>
                        </KpiCard>
                        <KpiCard accent={C.muted}>
                            <KpiValue>{answerCount}</KpiValue>
                            <KpiLabel>Answers submitted</KpiLabel>
                        </KpiCard>
                    </KpiRow>

                    {/* ── Leaderboard + Question difficulty ── */}
                    <Row>
                        <Panel>
                            <PanelHead>🏆 Leaderboard</PanelHead>
                            {leaderboard.length === 0 ? (
                                <Empty>No completed quiz sessions yet.</Empty>
                            ) : (
                                <Table>
                                    <thead>
                                        <tr>
                                            <Th style={{ width: 32 }}>#</Th>
                                            <Th>Player</Th>
                                            <ThRight>Best score</ThRight>
                                            <ThRight>Runs</ThRight>
                                            <Th>Score bar</Th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {leaderboard.map((r, i) => (
                                            <Tr key={r.nickname}>
                                                <TdMuted>
                                                    <Medal>{medal(i + 1)}</Medal>
                                                </TdMuted>
                                                <Td style={{ fontWeight: i < 3 ? 600 : 400 }}>
                                                    {r.nickname}
                                                </Td>
                                                <TdRight style={{ color: i === 0 ? C.yellow : C.text }}>
                                                    {fmtScore(r.best_score)}
                                                </TdRight>
                                                <TdRight style={{ color: C.muted }}>{r.runs}</TdRight>
                                                <Td>
                                                    <BarTrack>
                                                        <BarFill
                                                            pct={(r.best_score / maxLbPts) * 100}
                                                            color={i === 0 ? C.yellow : i === 1 ? C.muted : i === 2 ? C.orange : C.blue}
                                                        />
                                                    </BarTrack>
                                                </Td>
                                            </Tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </Panel>

                        <Panel>
                            <PanelHead>
                                📊 Question difficulty
                                <DataNote>(hardest first — % answered correctly)</DataNote>
                            </PanelHead>
                            {questions.length === 0 ? (
                                <Empty>No answer data yet.</Empty>
                            ) : (
                                <Table>
                                    <thead>
                                        <tr>
                                            <Th>Question</Th>
                                            <Th>% Correct</Th>
                                            <ThRight>✓</ThRight>
                                            <ThRight>✗</ThRight>
                                            <ThRight>Avg pts</ThRight>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {questions.map((q) => {
                                            const pct   = q.pct_correct;
                                            const color = pct >= 70 ? C.green : pct >= 40 ? C.yellow : C.red;
                                            return (
                                                <Tr key={q.question}>
                                                    <Td style={{
                                                        maxWidth: 180,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }} title={q.question}>
                                                        {q.question}
                                                    </Td>
                                                    <Td>
                                                        <BarWrap>
                                                            <BarTrack>
                                                                <BarFill pct={pct} color={color} />
                                                            </BarTrack>
                                                            <BarPct style={{ color }}>
                                                                {pct.toFixed(0)}%
                                                            </BarPct>
                                                        </BarWrap>
                                                    </Td>
                                                    <TdRight style={{ color: C.green }}>{q.correct}</TdRight>
                                                    <TdRight style={{ color: C.red }}>{q.wrong}</TdRight>
                                                    <TdRight>{Math.round(q.avg_points)}</TdRight>
                                                </Tr>
                                            );
                                        })}
                                    </tbody>
                                </Table>
                            )}
                        </Panel>
                    </Row>

                    {/* ── Recent sessions ── */}
                    <PanelWide>
                        <PanelHead>🕒 Recent sessions</PanelHead>
                        {sessions.length === 0 ? (
                            <Empty>No sessions in this time range.</Empty>
                        ) : (
                            <Table>
                                <thead>
                                    <tr>
                                        <Th>Time</Th>
                                        <Th>Player</Th>
                                        <Th>Event</Th>
                                        <ThRight>Score</ThRight>
                                        <ThRight>Questions</ThRight>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sessions.map((r, i) => (
                                        <Tr key={i}>
                                            <TdMuted style={{ fontFamily: 'monospace', fontSize: 12 }}>
                                                {fmtTime(r._time)}
                                            </TdMuted>
                                            <Td style={{ fontWeight: 500 }}>{r.nickname || '—'}</Td>
                                            <Td>
                                                <span style={{
                                                    background: r.event === 'quiz_complete' ? '#1a3a1a' : '#1a2a3a',
                                                    color: r.event === 'quiz_complete' ? C.green : C.blue,
                                                    borderRadius: 4,
                                                    padding: '2px 7px',
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                }}>
                                                    {r.event || '—'}
                                                </span>
                                            </Td>
                                            <TdRight>{r.total_score || '—'}</TdRight>
                                            <TdRight style={{ color: C.muted }}>{r.question_count || '—'}</TdRight>
                                        </Tr>
                                    ))}
                                </tbody>
                            </Table>
                        )}
                    </PanelWide>
                </>
            )}

            {!loading && !hasData && !error && (
                <Empty>Click ⟳ Run to load analytics.</Empty>
            )}
        </Page>
    );
}
