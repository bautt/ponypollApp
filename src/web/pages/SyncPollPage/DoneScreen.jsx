import React from 'react';
import { C } from '../../lib/theme';
import { Page, Card, Title, Sub, ScoreCircle, LbTable, LbRow, LbTh, LbTd, MEDALS } from './styles';

export default function DoneScreen({ totalScore, nicknameRef, leaderboard }) {
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
