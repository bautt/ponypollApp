import React from 'react';
import { C } from '../../lib/theme';
import { Card, Title, Subtitle, BigBtn, LbTable, LbRow, LbTh, LbTd, MEDALS } from './styles';

export default function DonePanel({ participantCount, leaderboard, busy, onNewSession }) {
    return (
        <Card>
            <Title>🏁 Quiz Complete!</Title>
            <Subtitle>Session finished — {participantCount} participant{participantCount !== 1 ? 's' : ''}.</Subtitle>

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
                <div style={{ color: C.muted, fontSize: 14 }}>
                    No answers recorded yet — check the Analytics tab.
                </div>
            )}

            <div style={{ marginTop: 28 }}>
                <BigBtn onClick={onNewSession} disabled={busy}>
                    ▶ Start New Session
                </BigBtn>
            </div>
        </Card>
    );
}
