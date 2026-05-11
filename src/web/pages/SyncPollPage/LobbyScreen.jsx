import React from 'react';
import { Page, Card, Title, Sub, NicknameInput, JoinBtn, Waiting } from './styles';

export default function LobbyScreen({ phase, joined, nickname, setNickname, onJoin, joinBusy, nicknameRef }) {
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
                    <Sub>Enter your nickname and wait for the host to launch.</Sub>
                    <NicknameInput
                        type="text"
                        maxLength={32}
                        placeholder="Your nickname…"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && nickname.trim() && onJoin()}
                        autoFocus
                    />
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
