import React from 'react';
import { C } from '../../lib/theme';
import { DoneCard, SetupTitle, SetupSubtitle, ScoreCircle, RestartBtn } from './styles';

export default function DoneScreen({ score, config, onRestart }) {
    return (
        <DoneCard>
            <img src="/static/app/ponypollapp/buttercup.png" alt="Buttercup" style={{ width: 180 }} />
            <SetupTitle>Poll Complete!</SetupTitle>
            <ScoreCircle>
                <span>{score}</span>
                <span style={{ fontSize: 13, fontWeight: 400, color: '#ccc' }}>pts</span>
            </ScoreCircle>
            <SetupSubtitle>
                Great job! Your answers have been recorded in Splunk index&nbsp;
                <strong style={{ color: C.accent }}>{config.poll_index}</strong>.
            </SetupSubtitle>
            <RestartBtn onClick={onRestart}>Restart</RestartBtn>
        </DoneCard>
    );
}
