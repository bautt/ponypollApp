import React from 'react';
import { C } from '../../lib/theme';
import {
    SetupCard, SetupTitle, SetupSubtitle, StartBtn,
    NicknameWrap, NicknameLabel, NicknameInput,
} from './styles';

export default function SetupScreen({ config, questionCount, tagline, nickname, setNickname, onStart, loading, error }) {
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
                <NicknameLabel htmlFor="nickname-input">Your nickname</NicknameLabel>
                <NicknameInput
                    id="nickname-input"
                    type="text"
                    maxLength={32}
                    placeholder="Enter your nickname…"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    autoComplete="off"
                />
            </NicknameWrap>
            <StartBtn
                onClick={onStart}
                disabled={!nickname.trim()}
                style={{ opacity: nickname.trim() ? 1 : 0.45 }}
            >
                Start Poll
            </StartBtn>
        </SetupCard>
    );
}
