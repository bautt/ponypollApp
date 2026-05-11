import React from 'react';
import { C } from '../../lib/theme';
import {
    Page, Card, Title, Sub, ScoreCircle,
    PodiumWrap, PodiumSlot, PodiumAvatar, PodiumName, PodiumScore, PodiumBlock,
    PodiumRest, PodiumRestRow, PodiumRestTd,
} from './styles';

const MEDAL_EMOJI  = ['🥇', '🥈', '🥉'];
const PODIUM_ORDER = [2, 1, 3]; // left-to-right visual order: silver, gold, bronze

function myRank(leaderboard, me) {
    if (!me) return null;
    const idx = leaderboard.findIndex((r) => r.nickname === me);
    return idx === -1 ? null : idx + 1;
}

export default function DoneScreen({ totalScore, nicknameRef, leaderboard }) {
    const me   = nicknameRef.current;
    const rank = myRank(leaderboard, me);
    const top3 = leaderboard.slice(0, 3);
    const rest = leaderboard.slice(3);

    // Personalised headline
    const headline = rank === 1 ? '🏆 You won!' :
                     rank === 2 ? '🥈 Runner-up!' :
                     rank === 3 ? '🥉 Third place!' :
                     'Quiz Complete! 🏁';

    return (
        <Page>
            <Card>
                <Title>{headline}</Title>
                <ScoreCircle>
                    <span>{totalScore.toLocaleString()}</span>
                    <span style={{ fontSize: 12, fontWeight: 400, color: C.muted }}>pts</span>
                </ScoreCircle>
                <Sub>
                    {rank ? `You finished #${rank} — well done, ${me}!` : `Great job, ${me}!`}
                </Sub>

                {top3.length > 0 && (
                    <>
                        {/* ── Podium ── */}
                        <PodiumWrap>
                            {PODIUM_ORDER.map((rank1) => {
                                const entry = top3[rank1 - 1];
                                if (!entry) return <PodiumSlot key={rank1} />;
                                const isMe = entry.nickname === me;
                                return (
                                    <PodiumSlot key={rank1}>
                                        <PodiumAvatar $rank={rank1}>{MEDAL_EMOJI[rank1 - 1]}</PodiumAvatar>
                                        <PodiumName $rank={rank1} $isMe={isMe} title={entry.nickname}>
                                            {entry.nickname}{isMe ? ' ← you' : ''}
                                        </PodiumName>
                                        <PodiumScore>{Number(entry.score).toLocaleString()} pts</PodiumScore>
                                        <PodiumBlock $rank={rank1}>{rank1}</PodiumBlock>
                                    </PodiumSlot>
                                );
                            })}
                        </PodiumWrap>

                        {/* ── Remaining players ── */}
                        {rest.length > 0 && (
                            <PodiumRest>
                                <tbody>
                                    {rest.map((row, i) => {
                                        const isMe = row.nickname === me;
                                        return (
                                            <PodiumRestRow key={row.nickname} $isMe={isMe}>
                                                <PodiumRestTd $isMe={isMe} style={{ width: 32, fontSize: 15 }}>
                                                    {i + 4}
                                                </PodiumRestTd>
                                                <PodiumRestTd $isMe={isMe}>
                                                    {row.nickname}{isMe ? ' ← you' : ''}
                                                </PodiumRestTd>
                                                <PodiumRestTd $isMe={isMe} style={{ textAlign: 'right', color: C.yellow, fontWeight: 600 }}>
                                                    {Number(row.score).toLocaleString()}
                                                </PodiumRestTd>
                                            </PodiumRestRow>
                                        );
                                    })}
                                </tbody>
                            </PodiumRest>
                        )}
                    </>
                )}
            </Card>
        </Page>
    );
}
