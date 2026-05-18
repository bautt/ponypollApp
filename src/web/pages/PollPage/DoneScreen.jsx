import React, { useEffect, useState } from 'react';
import { C } from '../../lib/theme';
import { getPollIndex } from '../../lib/kvstore';
import {
    DoneCard, SetupTitle, SetupSubtitle, ScoreCircle, RestartBtn,
    ReviewList, ReviewItem, ReviewBadge,
} from './styles';

function ReviewRow({ item, idx }) {
    const [open, setOpen] = useState(false);
    const { text, correct, points, userAnswer, correctOptions, explanation } = item;
    const label = correct === true ? `+${points}` : correct === false ? '0' : `+${points}`;

    return (
        <ReviewItem $correct={correct}>
            <ReviewBadge $correct={correct}>{label}</ReviewBadge>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: C.text, marginBottom: 2, fontSize: 13 }}>
                    {idx + 1}. {text}
                </div>
                <div style={{ fontSize: 12, color: C.muted }}>
                    Your answer: <span style={{ color: correct === true ? '#2ecc71' : correct === false ? '#e74c3c' : C.text }}>
                        {userAnswer || '—'}
                    </span>
                </div>
                {correct === false && correctOptions.length > 0 && (
                    <div style={{ fontSize: 12, color: '#2ecc71', marginTop: 2 }}>
                        Correct: {correctOptions.join(', ')}
                    </div>
                )}
                {explanation ? (
                    <div style={{ marginTop: 4 }}>
                        <button
                            onClick={() => setOpen((o) => !o)}
                            style={{
                                background: 'none', border: 'none', padding: 0,
                                fontSize: 11, color: C.blue, cursor: 'pointer',
                            }}
                        >
                            {open ? '▲ Hide hint' : '▼ Show hint'}
                        </button>
                        {open && (
                            <div style={{
                                marginTop: 4, padding: '6px 8px',
                                background: '#0e1e30', borderRadius: 6,
                                fontSize: 12, color: '#7EC8E3', lineHeight: 1.5,
                            }}>
                                💡 {explanation}
                            </div>
                        )}
                    </div>
                ) : null}
            </div>
        </ReviewItem>
    );
}

export default function DoneScreen({ score, results = [], onRestart }) {
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
            <img src="/static/app/ponypollapp/buttercup.png" alt="Buttercup" style={{ width: 140 }} />
            <SetupTitle>Poll Complete!</SetupTitle>
            <ScoreCircle>
                <span>{score}</span>
                <span style={{ fontSize: 13, fontWeight: 400, color: '#ccc' }}>pts</span>
            </ScoreCircle>
            <SetupSubtitle>
                Your answers have been recorded in Splunk index&nbsp;
                <strong style={{ color: C.accent }}>{indexName}</strong>.
            </SetupSubtitle>

            {results.length > 0 && (
                <>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 8 }}>
                        Question review
                    </div>
                    <ReviewList>
                        {results.map((item, i) => (
                            <ReviewRow key={i} item={item} idx={i} />
                        ))}
                    </ReviewList>
                </>
            )}

            <RestartBtn onClick={onRestart}>Restart</RestartBtn>
        </DoneCard>
    );
}
