import React, { useEffect, useState } from 'react';
import { C } from '../../lib/theme';
import { getPollIndex } from '../../lib/kvstore';
import { DoneCard, SetupTitle, SetupSubtitle, ScoreCircle, RestartBtn } from './styles';

export default function DoneScreen({ score, onRestart }) {
    const [indexName, setIndexName] = useState('ponypoll');

    useEffect(() => {
        let mounted = true;
        getPollIndex()
            .then((name) => { if (mounted) setIndexName(name); })
            .catch(() => {});
        return () => { mounted = false; };
    }, []);

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
                <strong style={{ color: C.accent }}>{indexName}</strong>.
            </SetupSubtitle>
            <RestartBtn onClick={onRestart}>Restart</RestartBtn>
        </DoneCard>
    );
}
