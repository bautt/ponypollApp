import React from 'react';

const IconMic = () => (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 5 }}>
        <rect x="5.5" y="1" width="5" height="8" rx="2.5" />
        <path d="M3 8a5 5 0 0 0 10 0" />
        <line x1="8" y1="13" x2="8" y2="15" />
        <line x1="5.5" y1="15" x2="10.5" y2="15" />
    </svg>
);
import { C } from '../../lib/theme';
import {
    Card, Title, Subtitle, BigBtn, ActivateBadge,
    ControlLabel, QuizPicker, ModeToggleWrap, ModeBtn, SavedFlash,
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
    rangeFrom,
    rangeTo,
    randomCount,
    playUrl,
    shortUrl,
    copied,
    shorteningUrl,
    busy,
    onQuizChange,
    onModeChange,
    onQuestionCountChange,
    onRangeFromChange,
    onRangeToChange,
    onRandomCountChange,
    onActivate,
    onStartSession,
    onShorten,
    onCopy,
}) {
    const clamp = (v, min, max) => Math.min(max, Math.max(min, Number(v) || min));

    const numInputStyle = {
        width: 56,
        padding: '4px 6px',
        background: C.surface2,
        border: `1px solid ${C.border}`,
        borderRadius: 5,
        color: C.text,
        fontSize: 13,
        textAlign: 'center',
    };

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
                            <IconMic />Synchronized
                        </ModeBtn>
                    </ModeToggleWrap>
                    <SavedFlash $show={modeSaved}>✓ Saved</SavedFlash>
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <ControlLabel style={{ paddingTop: 6 }}>Questions:</ControlLabel>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <ModeToggleWrap>
                            <ModeBtn
                                $active={questionCount === 'all'}
                                disabled={!selectedQuizId || totalAvailable === 0}
                                onClick={() => onQuestionCountChange('all')}
                                title="Use all questions in the quiz"
                            >
                                All {totalAvailable > 0 ? `(${totalAvailable})` : ''}
                            </ModeBtn>
                            <ModeBtn
                                $active={questionCount === 'range'}
                                disabled={!selectedQuizId || totalAvailable < 2}
                                onClick={() => onQuestionCountChange('range')}
                                title="Play a consecutive slice of questions"
                            >
                                From # – #
                            </ModeBtn>
                            <ModeBtn
                                $active={questionCount === 'random'}
                                disabled={!selectedQuizId || totalAvailable < 2}
                                onClick={() => onQuestionCountChange('random')}
                                title="Pick a random subset of questions"
                            >
                                Random #
                            </ModeBtn>
                        </ModeToggleWrap>

                        {questionCount === 'range' && totalAvailable > 1 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input
                                    type="number"
                                    min={1}
                                    max={totalAvailable}
                                    value={rangeFrom}
                                    onChange={(e) => {
                                        const v = clamp(e.target.value, 1, totalAvailable);
                                        onRangeFromChange(v);
                                        if (v > rangeTo) onRangeToChange(v);
                                    }}
                                    style={numInputStyle}
                                    title="First question (1-based)"
                                />
                                <span style={{ fontSize: 12, color: C.muted }}>–</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={totalAvailable}
                                    value={rangeTo}
                                    onChange={(e) => {
                                        const v = clamp(e.target.value, 1, totalAvailable);
                                        onRangeToChange(v);
                                        if (v < rangeFrom) onRangeFromChange(v);
                                    }}
                                    style={numInputStyle}
                                    title="Last question (1-based, inclusive)"
                                />
                                <span style={{ fontSize: 12, color: C.muted }}>
                                    of {totalAvailable}
                                    {rangeTo >= rangeFrom ? ` · ${rangeTo - rangeFrom + 1} q` : ''}
                                </span>
                            </div>
                        )}

                        {questionCount === 'random' && totalAvailable > 1 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input
                                    type="number"
                                    min={1}
                                    max={totalAvailable - 1}
                                    value={randomCount}
                                    onChange={(e) => onRandomCountChange(clamp(e.target.value, 1, totalAvailable - 1))}
                                    style={numInputStyle}
                                    title="Number of questions to pick randomly"
                                />
                                <span style={{ fontSize: 12, color: C.muted }}>
                                    of {totalAvailable} (shuffled)
                                </span>
                            </div>
                        )}
                    </div>
                </div>

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
