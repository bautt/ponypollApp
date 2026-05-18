import React from 'react';
import { C } from '../../lib/theme';
import {
    SetupCard, SetupTitle, SetupSubtitle, StartBtn,
    NicknameWrap, NicknameLabel, NicknameInput,
} from './styles';
import AudioToggles from '../../components/AudioToggles';

export default function SetupScreen({
    config, questionCount, tagline,
    nickname, setNickname, splunkUser,
    onStart, loading, error,
    quizzes, onSwitchQuiz, switchingQuiz, canPersistQuizChoice,
}) {
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

    const showQuizPicker = Array.isArray(quizzes) && quizzes.length > 1 && typeof onSwitchQuiz === 'function';
    const activeQuizId = config?.active_quiz_id || '';

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

            {/* Inline quiz picker so mobile users can switch quizzes without
                navigating to Editor or Admin (both of which are desktop-only). */}
            {showQuizPicker && (
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 6, width: '100%', maxWidth: 320,
                }}>
                    <label
                        htmlFor="quiz-picker"
                        style={{
                            fontSize: 12, fontWeight: 700, letterSpacing: '0.08em',
                            textTransform: 'uppercase', color: C.muted,
                        }}
                    >
                        Quiz
                    </label>
                    <select
                        id="quiz-picker"
                        value={activeQuizId}
                        disabled={switchingQuiz}
                        onChange={(e) => onSwitchQuiz(e.target.value)}
                        style={{
                            width: '100%', minHeight: 44, padding: '10px 14px',
                            background: C.surface, color: C.text,
                            border: `2px solid ${C.border}`, borderRadius: 10,
                            fontSize: 15, fontWeight: 500,
                            cursor: switchingQuiz ? 'progress' : 'pointer',
                            opacity: switchingQuiz ? 0.6 : 1,
                            touchAction: 'manipulation',
                        }}
                    >
                        {/* If active_quiz_id isn't in the list (e.g. deleted),
                            surface a placeholder so the select isn't blank. */}
                        {!quizzes.some((q) => q._key === activeQuizId) && (
                            <option value="">— select a quiz —</option>
                        )}
                        {quizzes.map((q) => (
                            <option key={q._key} value={q._key}>{q.name}</option>
                        ))}
                    </select>
                    {switchingQuiz && (
                        <span style={{ fontSize: 11, color: C.muted }}>Loading…</span>
                    )}
                    {!switchingQuiz && !canPersistQuizChoice && (
                        <span style={{ fontSize: 11, color: C.muted, textAlign: 'center' }}>
                            Just for this session — the default quiz stays the same for everyone else.
                        </span>
                    )}
                </div>
            )}

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
