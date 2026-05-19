import React from 'react';
import { C } from '../../lib/theme';
import { Card, Title, Subtitle, PhaseTag, BigBtn, SmallBtn, Grid2, Stat, StatVal, StatLabel, SessionBadge } from './styles';
import JoinInfo from './JoinInfo';

export default function LobbyPanel({
    sessionName,
    quizName,
    total,
    participantCount,
    participantNames = [],
    playUrl,
    shortUrl,
    projectorUrl,
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
            {sessionName && (
                <SessionBadge>Session <span>#{sessionName}</span></SessionBadge>
            )}
            <Title>
                Waiting for participants
                <PhaseTag $phase="waiting">Lobby</PhaseTag>
            </Title>
            <Subtitle>
                Quiz: <strong>{quizName}</strong> &nbsp;·&nbsp; {total} question{total !== 1 ? 's' : ''}
            </Subtitle>

            <JoinInfo
                large
                sessionName={sessionName}
                playUrl={playUrl}
                shortUrl={shortUrl}
                projectorUrl={projectorUrl}
                copied={copied}
                shorteningUrl={shorteningUrl}
                onShorten={onShorten}
                onCopy={onCopy}
            />

            <Grid2 style={{ gridTemplateColumns: '1fr 1fr', maxWidth: 320, marginBottom: 16 }}>
                <Stat>
                    <StatVal $color={C.green}>{participantCount}</StatVal>
                    <StatLabel>Joined</StatLabel>
                </Stat>
                <Stat>
                    <StatVal>{total}</StatVal>
                    <StatLabel>Questions</StatLabel>
                </Stat>
            </Grid2>

            {participantNames.length > 0 ? (
                <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: 6,
                    maxWidth: 480, marginBottom: 16, justifyContent: 'center',
                }}>
                    {participantNames.map((name) => (
                        <span key={name} style={{
                            padding: '4px 10px', borderRadius: 20,
                            background: C.surface, border: `1px solid ${C.green}55`,
                            color: C.green, fontSize: 13, fontWeight: 600,
                        }}>
                            {name}
                        </span>
                    ))}
                </div>
            ) : (
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
