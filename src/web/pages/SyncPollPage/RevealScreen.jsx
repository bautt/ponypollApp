import React from 'react';
import { C } from '../../lib/theme';
import DistBars from '../../components/DistBars';
import {
    Page, Card, QuestionText, QuestionImage, OptionsGrid, OptionBtn, OptionBadge,
    FeedbackBox, Waiting, LbTable, LbRow, LbTh, LbTd, LETTER_COLORS, MEDALS,
} from './styles';

export default function RevealScreen({
    question, qIdx, total, totalScore,
    selected, wasCorrect, submitted, wcWords,
    answerDist, distTotal, leaderboard, nicknameRef,
}) {
    if (!question) return null;

    const opts = question.options ?? [];
    const isMC = question.type === 'single' || question.type === 'multi' || question.type === 'yesno';
    const correct = submitted ? wasCorrect : null;

    return (
        <Page>
            <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <span style={{ fontSize: 12, color: C.muted }}>Q {qIdx + 1} / {total}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.yellow }}>★ {totalScore.toLocaleString()}</span>
                </div>

                {question.image && <QuestionImage src={question.image} alt="" />}
                <QuestionText style={{ fontSize: 16 }}>{question.text}</QuestionText>

                {isMC && (
                    <OptionsGrid style={opts.length === 2 ? { gridTemplateColumns: '1fr 1fr' } : {}}>
                        {opts.map((opt, i) => {
                            const sel = selected.includes(opt.id);
                            return (
                                <OptionBtn
                                    key={opt.id}
                                    $revealed
                                    $correct={opt.correct}
                                    $incorrect={sel && !opt.correct}
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

                {/* Answer distribution — choice questions */}
                {isMC && (
                    <DistBars options={opts} dist={answerDist} total={distTotal} />
                )}

                {/* Word cloud reveal */}
                {question.type === 'wordcloud' && (
                    <div style={{ textAlign: 'center', padding: '16px 0', color: C.muted, fontSize: 14 }}>
                        ☁ Word cloud on the host screen
                        {submitted && wcWords.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 10 }}>
                                {wcWords.map((w, i) => (
                                    <span key={i} style={{
                                        background: C.blue + '33', border: `1px solid ${C.blue}`,
                                        borderRadius: 20, padding: '3px 12px',
                                        fontSize: 14, color: C.text,
                                    }}>{w}</span>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {submitted ? (() => {
                    const isWc = question?.type === 'wordcloud';
                    const text =
                        isWc && correct === null
                            ? `Your ${wcWords.length} word${wcWords.length !== 1 ? 's' : ''} are in the cloud ☁`
                            : correct === true
                                ? `✓ Correct! +${totalScore.toLocaleString()} pts total`
                                : correct === false
                                    ? '✗ Wrong answer'
                                    : 'Recorded';
                    return <FeedbackBox $correct={correct !== false}>{text}</FeedbackBox>;
                })() : (
                    <FeedbackBox $correct={false} style={{ fontSize: 15 }}>
                        ⏱ Didn't answer in time
                    </FeedbackBox>
                )}

                {question.explanation && (
                    <div style={{
                        padding: '10px 14px', marginTop: 4,
                        background: '#0e1e30', border: '1px solid #009CDE44',
                        borderRadius: 8, fontSize: 13, color: '#7EC8E3', lineHeight: 1.5,
                    }}>
                        💡 {question.explanation}
                    </div>
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
