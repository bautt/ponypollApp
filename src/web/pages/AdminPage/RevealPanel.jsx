import React from 'react';
import { C } from '../../lib/theme';
import {
    Card, Title, PhaseTag, BigBtn, SmallBtn,
    QuestionBox, QuestionImage, Grid2, OptionPill, OptionBadge,
    LbTable, LbRow, LbTh, LbTd, MEDALS,
} from './styles';
import DistBars from '../../components/DistBars';
import WordCloud from './WordCloud';

export default function RevealPanel({
    qIdx,
    total,
    currQ,
    answerDist,
    distTotal,
    wordcloudWords,
    leaderboard,
    busy,
    onNext,
    onEndSession,
}) {
    return (
        <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title style={{ margin: 0 }}>
                    Answer Revealed
                    <PhaseTag $phase="reveal">Reveal</PhaseTag>
                </Title>
                <span style={{ fontSize: 13, color: C.muted }}>Q {qIdx + 1} / {total}</span>
            </div>

            {currQ.image && <QuestionImage src={currQ.image} alt="" />}
            <QuestionBox>{currQ.text}</QuestionBox>

            {(currQ.type === 'single' || currQ.type === 'multi') && (
                <Grid2>
                    {currQ.options.map((opt) => (
                        <OptionPill key={opt.id} $correct={opt.correct}>
                            <OptionBadge $correct={opt.correct}>{opt.id}</OptionBadge>
                            {opt.text}
                            {opt.correct && <span style={{ marginLeft: 'auto', color: C.green }}>✓</span>}
                        </OptionPill>
                    ))}
                </Grid2>
            )}
            {currQ.type === 'yesno' && (
                <Grid2 style={{ gridTemplateColumns: '1fr 1fr', maxWidth: 320 }}>
                    {currQ.options.map((opt) => (
                        <OptionPill key={opt.id} $correct={opt.correct}>
                            <OptionBadge $correct={opt.correct}>{opt.id}</OptionBadge>
                            {opt.text}
                            {opt.correct && <span style={{ marginLeft: 'auto', color: C.green }}>✓</span>}
                        </OptionPill>
                    ))}
                </Grid2>
            )}

            {(currQ.type === 'single' || currQ.type === 'multi' || currQ.type === 'yesno') && (
                <DistBars options={currQ.options} dist={answerDist} total={distTotal} />
            )}

            {currQ.type === 'wordcloud' && (
                <WordCloud words={wordcloudWords} />
            )}

            {currQ.explanation && (
                <div style={{
                    padding: '10px 16px', marginBottom: 8,
                    background: '#0e1e30', border: '1px solid #009CDE44',
                    borderRadius: 8, fontSize: 13, color: '#7EC8E3', lineHeight: 1.5,
                }}>
                    💡 {currQ.explanation}
                </div>
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
                <BigBtn onClick={onNext} disabled={busy}>
                    {qIdx + 1 >= total ? '🏁 End Quiz' : '▶ Next Question'}
                </BigBtn>
                <SmallBtn $danger onClick={onEndSession} disabled={busy}>End Session</SmallBtn>
            </div>
        </Card>
    );
}
