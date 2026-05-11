import React from 'react';
import { C } from '../../lib/theme';
import {
    Card, Title, Subtitle, BigBtn, ActivateBadge,
    ControlLabel, QuizPicker, ModeToggleWrap, ModeBtn, SavedFlash, TextInput,
} from './styles';
import JoinInfo from './JoinInfo';

export default function IdlePanel({
    quizzes,
    selectedQuizId,
    liveQuizId,
    quizMode,
    modeSaved,
    questionCount,
    totalAvailable,
    sessionName,
    playUrl,
    shortUrl,
    copied,
    shorteningUrl,
    busy,
    onQuizChange,
    onModeChange,
    onQuestionCountChange,
    onSessionNameChange,
    onActivate,
    onStartSession,
    onShorten,
    onCopy,
}) {
    return (
        <Card>
            <Title>
                <svg viewBox="0 0 16 16" width="20" height="20"
                    style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 8, marginBottom: 3 }}
                    fill="currentColor" aria-hidden="true">
                    <rect x="1" y="4" width="10" height="6" rx="1.2" />
                    <circle cx="8.5" cy="7" r="1.8" fill="none" stroke="currentColor" strokeWidth="1.2" />
                    <circle cx="3" cy="6" r="0.7" />
                    <line x1="11" y1="5.2" x2="15" y2="3"   stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" />
                    <line x1="11" y1="8.8" x2="15" y2="11"  stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" />
                    <line x1="5.5" y1="10" x2="5.5" y2="13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    <line x1="3.5" y1="13" x2="7.5" y2="13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                Quiz Admin
            </Title>
            <Subtitle>
                Select a quiz, set the mode, and run it for participants.
            </Subtitle>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <ControlLabel>Quiz:</ControlLabel>
                    <QuizPicker
                        value={selectedQuizId}
                        onChange={(e) => onQuizChange(e.target.value)}
                    >
                        {quizzes.length === 0 && <option value="">Loading…</option>}
                        {quizzes.map((q) => (
                            <option key={q._key} value={q._key}>
                                {q._key === liveQuizId ? '▶ ' : ''}{q.name}
                            </option>
                        ))}
                    </QuizPicker>
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <ControlLabel>Mode:</ControlLabel>
                    <ModeToggleWrap>
                        <ModeBtn
                            $active={quizMode === 'self_paced'}
                            disabled={!selectedQuizId}
                            onClick={() => quizMode !== 'self_paced' && onModeChange('self_paced')}
                            title="Each participant runs the quiz at their own pace"
                        >
                            Self-paced
                        </ModeBtn>
                        <ModeBtn
                            $active={quizMode === 'synchronized'}
                            disabled={!selectedQuizId}
                            onClick={() => quizMode !== 'synchronized' && onModeChange('synchronized')}
                            title="You control the pace — everyone sees the same question at the same time"
                        >
                            🎙 Synchronized
                        </ModeBtn>
                    </ModeToggleWrap>
                    <SavedFlash $show={modeSaved}>✓ Saved</SavedFlash>
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <ControlLabel>Questions:</ControlLabel>
                    <QuizPicker
                        value={questionCount}
                        onChange={(e) => onQuestionCountChange(e.target.value)}
                        disabled={!selectedQuizId || totalAvailable === 0}
                        title="Randomly pick a subset of questions"
                    >
                        <option value="all">All {totalAvailable > 0 ? `(${totalAvailable})` : ''}</option>
                        {[3, 5, 6, 8, 10, 12, 15, 20, 25, 30]
                            .filter((n) => n < totalAvailable)
                            .map((n) => (
                                <option key={n} value={String(n)}>
                                    Random {n} of {totalAvailable}
                                </option>
                            ))}
                    </QuizPicker>
                </div>

                {quizMode === 'synchronized' && (
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <ControlLabel>Session:</ControlLabel>
                        <TextInput
                            type="text"
                            placeholder='e.g. "Workshop Berlin May 2026"'
                            value={sessionName}
                            onChange={(e) => onSessionNameChange(e.target.value)}
                            $highlight={!sessionName.trim()}
                            maxLength={80}
                            title="Unique name for this session — used to filter results in Analytics"
                        />
                    </div>
                )}
            </div>

            {quizMode === 'self_paced' ? (
                <div style={{ marginBottom: 28 }}>
                    {selectedQuizId && selectedQuizId === liveQuizId ? (
                        <ActivateBadge>
                            ● Active — participants are on this quiz
                        </ActivateBadge>
                    ) : (
                        <BigBtn onClick={onActivate} disabled={busy || !selectedQuizId}>
                            {busy ? 'Activating…' : '▶ Activate for Self-paced'}
                        </BigBtn>
                    )}
                </div>
            ) : (
                <div style={{ marginBottom: 28 }}>
                    <BigBtn onClick={onStartSession} disabled={busy || !selectedQuizId}>
                        {busy ? 'Starting…' : '▶ Start Synchronized Session'}
                    </BigBtn>
                </div>
            )}

            <JoinInfo
                large={false}
                playUrl={playUrl}
                shortUrl={shortUrl}
                copied={copied}
                shorteningUrl={shorteningUrl}
                onShorten={onShorten}
                onCopy={onCopy}
            />
        </Card>
    );
}
