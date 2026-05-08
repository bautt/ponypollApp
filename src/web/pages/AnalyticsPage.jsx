import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { runSearch, listQuizzes } from '../lib/kvstore';

// ── Colour palette ─────────────────────────────────────────────────────────────
const C = {
    bg:      '#1B1D22',
    surface: '#23262F',
    surface2:'#2B2E38',
    border:  '#3C3F4A',
    text:    '#D0D4E3',
    muted:   '#868A9C',
    blue:    '#009CDE',
    green:   '#5CC05C',
    orange:  '#FF6D00',
    red:     '#E84545',
    yellow:  '#F5A623',
};

// ── Styled components ──────────────────────────────────────────────────────────
const Page = styled.div`
    min-height: calc(100vh - 45px);
    background: ${C.bg};
    color: ${C.text};
    font-family: 'Splunk Platform Sans', 'Inter', system-ui, sans-serif;
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

// KPI cards
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

// Panels
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

// Bar chart
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

// Spin animation for loading
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

// ── SPL builders ───────────────────────────────────────────────────────────────
function buildFilters({ quizId, nickname }) {
    const parts = [];
    if (quizId)   parts.push(`quiz_id="${quizId}"`);
    if (nickname) parts.push(`nickname="${nickname.replace(/"/g, '')}"`);
    return parts.length ? ' ' + parts.join(' ') : '';
}

function kpiSpl(filters) {
    return `index=ponypoll sourcetype=ponypoll_attempt event=quiz_complete${filters}
        | stats count as attempts, dc(session_id) as sessions, dc(nickname) as participants,
                avg(total_score) as avg_score, max(total_score) as top_score`;
}

function answerCountSpl(filters) {
    return `index=ponypoll sourcetype=ponypoll_answer${filters} | stats count as answers`;
}

function leaderboardSpl(filters) {
    return `index=ponypoll sourcetype=ponypoll_attempt event=quiz_complete${filters}
        | stats max(total_score) as best_score, count as runs by nickname
        | sort -best_score | head 20`;
}

function questionSpl(filters) {
    return `index=ponypoll sourcetype=ponypoll_answer${filters}
        | eval is_correct=if(correct=="true",1,0)
        | stats avg(is_correct)*100 as pct_correct, avg(points) as avg_points,
                count as answers by question
        | sort -pct_correct | head 25`;
}

function activitySpl(filters) {
    return `index=ponypoll sourcetype=ponypoll_attempt event=quiz_start${filters}
        | timechart span=1h count as starts`;
}

function nicklistSpl() {
    return `index=ponypoll sourcetype=ponypoll_attempt | dedup nickname | fields nickname | head 50`;
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
    const [quizzes, setQuizzes]       = useState([]);
    const [nicknames, setNicknames]   = useState([]);
    const [timeIdx, setTimeIdx]       = useState(4);   // default: Last 7 days
    const [quizId, setQuizId]         = useState('');
    const [nickname, setNickname]     = useState('');
    const [nicknameInput, setNicknameInput] = useState('');

    const [loading, setLoading]       = useState(false);
    const [error, setError]           = useState('');

    const [kpi, setKpi]               = useState(null);
    const [answerCount, setAnswerCount] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [questions, setQuestions]   = useState([]);
    const [hasData, setHasData]       = useState(false);

    // Load quiz list and nickname list on mount
    useEffect(() => {
        listQuizzes().then(setQuizzes).catch(() => {});
        runSearch(nicklistSpl(), { earliest: '-30d', count: 50 })
            .then((rows) => setNicknames(rows.map((r) => r.nickname).filter(Boolean)))
            .catch(() => {});
    }, []);

    const runAll = useCallback(async () => {
        setLoading(true);
        setError('');
        const opts  = { earliest: TIME_OPTS[timeIdx].earliest, latest: 'now', count: 1000 };
        const f     = buildFilters({ quizId, nickname });
        try {
            const [kpiRows, ansRows, lbRows, qRows] = await Promise.all([
                runSearch(kpiSpl(f),         opts),
                runSearch(answerCountSpl(f), opts),
                runSearch(leaderboardSpl(f), opts),
                runSearch(questionSpl(f),    opts),
            ]);
            setKpi(kpiRows[0] || null);
            setAnswerCount(ansRows[0]?.answers || '0');
            setLeaderboard(lbRows);
            setQuestions(qRows);
            setHasData(true);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [timeIdx, quizId, nickname]);

    // Run on first render
    useEffect(() => { runAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const applyNickname = () => setNickname(nicknameInput.trim());

    const maxPct  = Math.max(...questions.map((q) => num(q.pct_correct)), 1);
    const maxPts  = Math.max(...questions.map((q) => num(q.avg_points)),  1);
    const maxLbPts = Math.max(...leaderboard.map((r) => num(r.best_score)), 1);

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
                        <option key={q._key} value={q._key}>{q.name}</option>
                    ))}
                </Select>

                <FilterSep />

                <FilterLabel>Nickname</FilterLabel>
                {nicknames.length > 0 ? (
                    <Select value={nicknameInput}
                        onChange={(e) => { setNicknameInput(e.target.value); setNickname(e.target.value); }}>
                        <option value="">All players</option>
                        {nicknames.map((n) => <option key={n} value={n}>{n}</option>)}
                    </Select>
                ) : (
                    <FilterInput
                        placeholder="All players…"
                        value={nicknameInput}
                        onChange={(e) => setNicknameInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && applyNickname()}
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
                            <KpiValue accent={C.blue}>{kpi ? num(kpi.attempts) : '—'}</KpiValue>
                            <KpiLabel>Quiz completions</KpiLabel>
                        </KpiCard>
                        <KpiCard accent={C.green}>
                            <KpiValue accent={C.green}>{kpi ? num(kpi.participants) : '—'}</KpiValue>
                            <KpiLabel>Unique players</KpiLabel>
                        </KpiCard>
                        <KpiCard accent={C.yellow}>
                            <KpiValue accent={C.yellow}>
                                {kpi ? fmtScore(kpi.avg_score) : '—'}
                            </KpiValue>
                            <KpiLabel>Avg score</KpiLabel>
                        </KpiCard>
                        <KpiCard accent={C.orange}>
                            <KpiValue accent={C.orange}>
                                {kpi ? fmtScore(kpi.top_score) : '—'}
                            </KpiValue>
                            <KpiLabel>Top score</KpiLabel>
                        </KpiCard>
                        <KpiCard accent={C.muted}>
                            <KpiValue>{answerCount ?? '—'}</KpiValue>
                            <KpiLabel>Answers submitted</KpiLabel>
                        </KpiCard>
                    </KpiRow>

                    {/* ── Leaderboard + Question difficulty ── */}
                    <Row>
                        {/* Leaderboard */}
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
                                                <TdRight style={{ color: C.muted }}>
                                                    {r.runs}
                                                </TdRight>
                                                <Td>
                                                    <BarTrack>
                                                        <BarFill
                                                            pct={(num(r.best_score) / maxLbPts) * 100}
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

                        {/* Question analysis */}
                        <Panel>
                            <PanelHead>📊 Question difficulty</PanelHead>
                            {questions.length === 0 ? (
                                <Empty>No answer data yet.</Empty>
                            ) : (
                                <Table>
                                    <thead>
                                        <tr>
                                            <Th>Question</Th>
                                            <Th>% Correct</Th>
                                            <ThRight>Avg pts</ThRight>
                                            <ThRight>Count</ThRight>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {questions.map((q) => {
                                            const pct  = num(q.pct_correct);
                                            const color = pct >= 70 ? C.green : pct >= 40 ? C.yellow : C.red;
                                            return (
                                                <Tr key={q.question}>
                                                    <Td style={{ maxWidth: 200, overflow: 'hidden',
                                                        textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                                        title={q.question}>
                                                        {q.question}
                                                    </Td>
                                                    <Td>
                                                        <BarWrap>
                                                            <BarTrack>
                                                                <BarFill
                                                                    pct={(pct / maxPct) * 100}
                                                                    color={color}
                                                                />
                                                            </BarTrack>
                                                            <BarPct style={{ color }}>
                                                                {pct.toFixed(0)}%
                                                            </BarPct>
                                                        </BarWrap>
                                                    </Td>
                                                    <TdRight>{Math.round(num(q.avg_points))}</TdRight>
                                                    <TdRight style={{ color: C.muted }}>{q.answers}</TdRight>
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
                        <RecentSessions filters={buildFilters({ quizId, nickname })}
                            earliest={TIME_OPTS[timeIdx].earliest} />
                    </PanelWide>
                </>
            )}

            {!loading && !hasData && !error && (
                <Empty>Click ⟳ Run to load analytics.</Empty>
            )}
        </Page>
    );
}

// ── Recent sessions sub-component ─────────────────────────────────────────────
function RecentSessions({ filters, earliest }) {
    const [rows, setRows]       = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        const spl = `index=ponypoll sourcetype=ponypoll_attempt${filters}
            | eval ts=strftime(_time,"%Y-%m-%d %H:%M")
            | table ts, nickname, quiz_id, event, total_score, question_count
            | sort -_time | head 50`;
        runSearch(spl, { earliest, latest: 'now', count: 50 })
            .then(setRows)
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [filters, earliest]);

    return (
        <>
            <PanelHead>🕒 Recent sessions</PanelHead>
            {loading && <Spinner />}
            {!loading && rows.length === 0 && <Empty>No sessions in this time range.</Empty>}
            {!loading && rows.length > 0 && (
                <Table>
                    <thead>
                        <tr>
                            <Th>Time</Th>
                            <Th>Player</Th>
                            <Th>Quiz ID</Th>
                            <Th>Event</Th>
                            <ThRight>Score</ThRight>
                            <ThRight>Questions</ThRight>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r, i) => (
                            <Tr key={i}>
                                <TdMuted style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.ts}</TdMuted>
                                <Td style={{ fontWeight: 500 }}>{r.nickname || '—'}</Td>
                                <TdMuted style={{ fontSize: 12 }}>{r.quiz_id || '—'}</TdMuted>
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
        </>
    );
}
