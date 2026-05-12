import React, { useState, useCallback } from 'react';
import { C } from '../../lib/theme';
import { Page, Card, Title, Sub, NicknameInput, JoinBtn, Waiting, SessionNumber } from './styles';
import {
    isMusicEnabled, setMusicEnabled,
    isSfxEnabled,   setSfxEnabled,
} from '../../lib/audio';

const IconMusic = () => (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
        <path d="M9 3v10.55A3 3 0 1 0 11 16V7h4V3H9z"/>
    </svg>
);
const IconSound = () => (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
        <path d="M10 3.5L6 7H3v6h3l4 3.5V3.5zM13.5 6.5a5 5 0 0 1 0 7M15.8 4.2a8 8 0 0 1 0 11.6"/>
    </svg>
);
const IconMute = () => (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
        <path d="M10 3.5L6 7H3v6h3l4 3.5V3.5z" opacity=".4"/>
        <line x1="13" y1="8" x2="18" y2="13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="18" y1="8" x2="13" y2="13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
);

function AudioToggles() {
    const [musicOn, setMusicOn] = useState(() => isMusicEnabled());
    const [sfxOn,   setSfxOn]   = useState(() => isSfxEnabled());

    const toggleMusic = useCallback(() => {
        const next = !musicOn;
        setMusicEnabled(next);
        setMusicOn(next);
    }, [musicOn]);

    const toggleSfx = useCallback(() => {
        const next = !sfxOn;
        setSfxEnabled(next);
        setSfxOn(next);
    }, [sfxOn]);

    const btn = (label, on, onToggle, IconOn) => (
        <button
            key={label}
            onClick={onToggle}
            title={`${label}: ${on ? 'on — click to turn off' : 'off — click to turn on'}`}
            style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                background: 'none', border: `1px solid ${on ? C.blue + '66' : C.border}`,
                borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
                color: on ? C.blue : C.muted, fontSize: 10, fontWeight: 600,
                letterSpacing: '0.04em', transition: 'all 0.15s', minWidth: 64,
            }}
        >
            {on ? <IconOn /> : <IconMute />}
            <span>{label}</span>
        </button>
    );

    return (
        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center' }}>
            {btn('Music',  musicOn, toggleMusic, IconMusic)}
            {btn('Sounds', sfxOn,   toggleSfx,   IconSound)}
        </div>
    );
}

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
                    <AudioToggles />
                </Card>
            </Page>
        );
    }

    // Waiting — joined, waiting for host to launch
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
            </Card>
        </Page>
    );
}
