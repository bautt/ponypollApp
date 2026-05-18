import React from 'react';
import { C } from '../../lib/theme';
import { Page, Card, Title, Sub, NicknameInput, JoinBtn, Waiting, SessionNumber, SrOnly } from './styles';
import AudioToggles from '../../components/AudioToggles';
import { isMinigameEnabled } from '../SettingsPage';
import FlappyMinigame from '../../components/FlappyMinigame';

export default function LobbyScreen({ phase, sessionName, joined, nickname, setNickname, splunkUser, onJoin, joinBusy, nicknameRef }) {
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
                    {sessionName && (
                        <SessionNumber>
                            Session
                            <span>#{sessionName}</span>
                        </SessionNumber>
                    )}
                    <Title>Join the Quiz</Title>
                    <Sub>Choose a nickname — it will appear on the leaderboard.</Sub>
                    <SrOnly as="label" htmlFor="sync-nickname-input">
                        Your nickname (required)
                    </SrOnly>
                    <NicknameInput
                        id="sync-nickname-input"
                        type="text"
                        maxLength={32}
                        placeholder={splunkUser ? `e.g. ${splunkUser}` : 'e.g. jane_doe'}
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && nickname.trim() && onJoin()}
                        $empty={!nickname.trim()}
                        autoComplete="off"
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
                    <AudioToggles />
                </Card>
            </Page>
        );
    }

    // Waiting — joined, waiting for host to launch
    const showGame = isMinigameEnabled();
    return (
        <Page>
            <Card>
                {sessionName && (
                    <SessionNumber>
                        Session
                        <span>#{sessionName}</span>
                    </SessionNumber>
                )}
                <Title>You're in, {nicknameRef.current}! 🎉</Title>
                <Waiting>Waiting for the host to launch the quiz…</Waiting>
                <AudioToggles />
                {showGame && (
                    <div style={{ marginTop: 20 }}>
                        <p style={{ margin: '0 0 8px', fontSize: 12, color: C.muted, textAlign: 'center' }}>
                            Kill some time while you wait ↓
                        </p>
                        <FlappyMinigame />
                    </div>
                )}
            </Card>
        </Page>
    );
}
