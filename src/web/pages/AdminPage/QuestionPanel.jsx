import React from 'react';
import { C } from '../../lib/theme';
import {
    Card, PhaseTag, BigBtn, TimerBar, TimerFill, TimerLabel,
    QuestionBox, QuestionImage, Grid2, OptionPill, OptionBadge, SessionBadge,
} from './styles';
import WordCloud from './WordCloud';

export default function QuestionPanel({
    sessionName,
    qIdx,
    total,
    participantCount,
    currQ,
    timeLeft,
    timeLim,
    wordcloudWords,
    busy,
    onReveal,
}) {
    const timerPct = timeLim > 0 ? Math.round((timeLeft / timeLim) * 100) : 0;

    return (
        <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 13, color: C.muted }}>
                    Q {qIdx + 1} / {total}
                    <PhaseTag $phase="question">Live</PhaseTag>
                    {sessionName && (
                        <SessionBadge style={{ display: 'inline-flex', marginBottom: 0, marginLeft: 10, padding: '3px 10px' }}>
                            Session <span style={{ fontSize: 14 }}>#{sessionName}</span>
                        </SessionBadge>
                    )}
                </span>
                <span style={{ fontSize: 13, color: C.muted }}>
                    {participantCount} participant{participantCount !== 1 ? 's' : ''}
                </span>
            </div>

            <TimerBar>
                <TimerFill $pct={timerPct} />
            </TimerBar>
            <TimerLabel>{Math.ceil(timeLeft)}s remaining</TimerLabel>

            {currQ.image && <QuestionImage src={currQ.image} alt="" />}
            <QuestionBox>{currQ.text}</QuestionBox>

            {(currQ.type === 'single' || currQ.type === 'multi') ? (
                <Grid2>
                    {currQ.options.map((opt) => (
                        <OptionPill key={opt.id}>
                            <OptionBadge>{opt.id}</OptionBadge>
                            {opt.text}
                        </OptionPill>
                    ))}
                </Grid2>
            ) : currQ.type === 'yesno' ? (
                <Grid2 style={{ gridTemplateColumns: '1fr 1fr', maxWidth: 320 }}>
                    <OptionPill><OptionBadge>A</OptionBadge>Yes</OptionPill>
                    <OptionPill><OptionBadge>B</OptionBadge>No</OptionPill>
                </Grid2>
            ) : currQ.type === 'wordcloud' ? (
                <WordCloud words={wordcloudWords} />
            ) : (
                <div style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>
                    {currQ.type === 'slider'
                        ? `Slider: ${currQ.sliderMin ?? 1}–${currQ.sliderMax ?? 10}`
                        : 'Free text answer'}
                </div>
            )}

            <BigBtn onClick={onReveal} disabled={busy}>
                ⏹ Reveal Answers
            </BigBtn>
        </Card>
    );
}
