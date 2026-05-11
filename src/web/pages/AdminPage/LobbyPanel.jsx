import React from 'react';
import { C } from '../../lib/theme';
import { Card, Title, Subtitle, PhaseTag, BigBtn, SmallBtn, Grid2, Stat, StatVal, StatLabel } from './styles';
import JoinInfo from './JoinInfo';

export default function LobbyPanel({
    quizName,
    total,
    participantCount,
    playUrl,
    shortUrl,
    copied,
    shorteningUrl,
    busy,
    onLaunch,
    onEndSession,
    onShorten,
    onCopy,
}) {
    return (
        <Card>
            <Title>
                Waiting for participants
                <PhaseTag $phase="waiting">Lobby</PhaseTag>
            </Title>
            <Subtitle>
                Quiz: <strong>{quizName}</strong> &nbsp;·&nbsp; {total} question{total !== 1 ? 's' : ''}
            </Subtitle>

            <JoinInfo
                large
                playUrl={playUrl}
                shortUrl={shortUrl}
                copied={copied}
                shorteningUrl={shorteningUrl}
                onShorten={onShorten}
                onCopy={onCopy}
            />

            <Grid2 style={{ gridTemplateColumns: '1fr 1fr', maxWidth: 320, marginBottom: 20 }}>
                <Stat>
                    <StatVal $color={C.green}>{participantCount}</StatVal>
                    <StatLabel>Joined</StatLabel>
                </Stat>
                <Stat>
                    <StatVal>{total}</StatVal>
                    <StatLabel>Questions</StatLabel>
                </Stat>
            </Grid2>

            {participantCount === 0 && (
                <div style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>
                    Waiting for participants to scan the QR code and join…
                </div>
            )}

            <div style={{ marginTop: 8 }}>
                <BigBtn onClick={onLaunch} disabled={busy}>
                    {busy
                        ? 'Launching…'
                        : participantCount > 0
                            ? `▶ Launch Quiz (${participantCount} joined)`
                            : '▶ Launch Quiz'}
                </BigBtn>
                <SmallBtn $danger onClick={onEndSession} disabled={busy}>Cancel</SmallBtn>
            </div>
        </Card>
    );
}
