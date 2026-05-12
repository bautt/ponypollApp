import React, { useState, useCallback } from 'react';
import { C } from '../../lib/theme';
import {
    SetupCard, SetupTitle, SetupSubtitle, StartBtn,
    NicknameWrap, NicknameLabel, NicknameInput,
} from './styles';
import {
    isMusicEnabled, setMusicEnabled,
    isSfxEnabled,   setSfxEnabled,
} from '../../lib/audio';

// ── SVG icons ─────────────────────────────────────────────────────────────────
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

function AudioToggle({ label, on, onToggle, IconOn, IconOff }) {
    return (
        <button
            onClick={onToggle}
            title={`${label}: ${on ? 'on — click to turn off' : 'off — click to turn on'}`}
            style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                background: 'none', border: `1px solid ${on ? C.blue + '66' : C.border}`,
                borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
                color: on ? C.blue : C.muted, fontSize: 10, fontWeight: 600,
                letterSpacing: '0.04em', transition: 'all 0.15s',
                minWidth: 64,
            }}
        >
            {on ? <IconOn /> : <IconOff />}
            <span>{label}</span>
        </button>
    );
}

export default function SetupScreen({ config, questionCount, tagline, nickname, setNickname, splunkUser, onStart, loading, error }) {
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
    if (loading) {
        return (
            <SetupCard>
                <SetupSubtitle>Loading questions…</SetupSubtitle>
            </SetupCard>
        );
    }

    if (error) {
        return (
            <SetupCard>
                <SetupTitle style={{ color: C.red }}>Error</SetupTitle>
                <SetupSubtitle>{error}</SetupSubtitle>
                <StartBtn onClick={() => window.location.reload()}>Retry</StartBtn>
            </SetupCard>
        );
    }

    return (
        <SetupCard>
            <img src="/static/app/ponypollapp/buttercup.png" alt="Buttercup" style={{ width: 210 }} />
            <SetupTitle>{config.poll_subject || 'Pony Poll'}</SetupTitle>
            <p style={{ margin: '0 0 6px', fontSize: 12, color: '#666', fontStyle: 'italic', textAlign: 'center' }}>
                {tagline}
            </p>
            <SetupSubtitle>
                {questionCount} question{questionCount !== 1 ? 's' : ''} — answer as fast
                as you can to maximise your score!
            </SetupSubtitle>
            <NicknameWrap>
                <NicknameLabel htmlFor="nickname-input">
                    Your nickname <span style={{ color: C.red }}>*</span>
                </NicknameLabel>
                <NicknameInput
                    id="nickname-input"
                    type="text"
                    maxLength={32}
                    placeholder={splunkUser ? `e.g. ${splunkUser}` : 'e.g. jane_doe'}
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && nickname.trim() && onStart()}
                    autoComplete="off"
                    autoFocus
                    $empty={!nickname.trim()}
                />
                {!nickname.trim() && (
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: C.muted, textAlign: 'left' }}>
                        Required — your name will appear on the leaderboard.
                    </p>
                )}
            </NicknameWrap>
            <StartBtn
                onClick={onStart}
                disabled={!nickname.trim()}
                style={{ opacity: nickname.trim() ? 1 : 0.4 }}
            >
                Start Poll
            </StartBtn>

            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center' }}>
                <AudioToggle
                    label="Music"
                    on={musicOn}
                    onToggle={toggleMusic}
                    IconOn={IconMusic}
                    IconOff={IconMute}
                />
                <AudioToggle
                    label="Sounds"
                    on={sfxOn}
                    onToggle={toggleSfx}
                    IconOn={IconSound}
                    IconOff={IconMute}
                />
            </div>
        </SetupCard>
    );
}
