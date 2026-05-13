import React from 'react';
import { C } from '../../lib/theme';
import {
    SetupCard, SetupTitle, SetupSubtitle, StartBtn,
    NicknameWrap, NicknameLabel, NicknameInput,
} from './styles';
import AudioToggles from '../../components/AudioToggles';

export default function SetupScreen({ config, questionCount, tagline, nickname, setNickname, splunkUser, onStart, loading, error }) {
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

            <AudioToggles />
        </SetupCard>
    );
}
