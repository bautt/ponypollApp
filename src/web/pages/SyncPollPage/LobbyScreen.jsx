import React from 'react';
import { C } from '../../lib/theme';
import { Page, Card, Title, Sub, NicknameInput, JoinBtn, Waiting } from './styles';

export default function LobbyScreen({ phase, joined, nickname, setNickname, splunkUser, onJoin, joinBusy, nicknameRef }) {
    // No active session
    if (!phase || phase === 'idle') {
        return (
            <Page>
                <Card>
                    <Title>🎙 Synchronized Quiz</Title>
                    <Waiting>Waiting for the host to start a session…</Waiting>
                </Card>
            </Page>
        );
    }

    // Waiting — not yet joined
    if (!joined) {
        return (
            <Page>
                <Card>
                    <Title>Join the Quiz</Title>
                    <Sub>Choose a nickname — it will appear on the leaderboard.</Sub>
                    <NicknameInput
                        type="text"
                        maxLength={32}
                        placeholder={splunkUser ? `e.g. ${splunkUser}` : 'e.g. jane_doe'}
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && nickname.trim() && onJoin()}
                        $empty={!nickname.trim()}
                        autoFocus
                    />
                    {!nickname.trim() && (
                        <p style={{ margin: '4px 0 0', fontSize: 11, color: C.muted }}>
                            Required to join the session.
                        </p>
                    )}
                    <JoinBtn onClick={onJoin} disabled={!nickname.trim() || joinBusy}>
                        {joinBusy ? 'Joining…' : 'Join →'}
                    </JoinBtn>
                </Card>
            </Page>
        );
    }

    // Waiting — joined, waiting for host to launch
    return (
        <Page>
            <Card>
                <Title>You're in, {nicknameRef.current}! 🎉</Title>
                <Waiting>Waiting for the host to launch the quiz…</Waiting>
            </Card>
        </Page>
    );
}
