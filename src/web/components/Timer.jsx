import React, { useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';

const pulse = keyframes`
    0%   { opacity: 1; }
    50%  { opacity: 0.6; }
    100% { opacity: 1; }
`;

const Root = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
`;

const Track = styled.div`
    flex: 1;
    height: 8px;
    background: rgba(255,255,255,0.15);
    border-radius: 4px;
    overflow: hidden;
`;

const Fill = styled.div`
    height: 100%;
    border-radius: 4px;
    transition: width 0.5s linear, background 0.5s;
    background: ${({ pct }) =>
        pct > 50 ? '#65A637' : pct > 25 ? '#ED8B00' : '#DC4E41'};
    width: ${({ pct }) => pct}%;
    ${({ pct }) => pct <= 15 && `animation: ${pulse} 0.6s ease-in-out infinite;`}
`;

const Num = styled.span`
    font-size: 18px;
    font-weight: 700;
    min-width: 32px;
    text-align: right;
    color: ${({ pct }) =>
        pct > 50 ? '#65A637' : pct > 25 ? '#ED8B00' : '#DC4E41'};
`;

/**
 * @param {number}   duration   Total seconds for this question
 * @param {boolean}  running    Whether the timer is counting down
 * @param {function} onExpire   Called when the timer hits 0
 * @param {function} onTick     Called each second with (secondsRemaining)
 */
export default function Timer({ duration, running, onExpire, onTick }) {
    const [remaining, setRemaining] = useState(duration);
    const intervalRef = useRef(null);

    // Use a ref to track the authoritative count so the interval callback
    // never needs to read from stale state — and never mutates state inside
    // a state updater (which is illegal and causes React to crash).
    const countRef = useRef(duration);

    // Reset both the ref and display state when the question changes
    useEffect(() => {
        countRef.current = duration;
        setRemaining(duration);
    }, [duration]);

    // Keep latest callbacks in refs so the interval never needs to be restarted
    // just because onExpire/onTick changed (avoids resetting the countdown on
    // every option-click that causes handleTimerExpire to be recreated).
    const onExpireRef = useRef(onExpire);
    const onTickRef   = useRef(onTick);
    useEffect(() => { onExpireRef.current = onExpire; }, [onExpire]);
    useEffect(() => { onTickRef.current   = onTick;   }, [onTick]);

    useEffect(() => {
        if (!running) {
            clearInterval(intervalRef.current);
            return;
        }

        intervalRef.current = setInterval(() => {
            countRef.current -= 1;
            const next = countRef.current;

            // Update display — plain value, NOT a functional updater, so no
            // side-effects inside a React state-updater function.
            setRemaining(next <= 0 ? 0 : next);

            // Callbacks fired directly in the interval, outside any state updater.
            if (next > 0 && onTickRef.current) {
                onTickRef.current(next);
            }
            if (next <= 0) {
                clearInterval(intervalRef.current);
                if (onExpireRef.current) onExpireRef.current();
            }
        }, 1000);

        return () => clearInterval(intervalRef.current);
    }, [running]); // only restart if running changes — callbacks always fresh via refs

    const pct = duration > 0 ? Math.round((remaining / duration) * 100) : 0;

    return (
        <Root>
            <Track>
                <Fill pct={pct} />
            </Track>
            <Num pct={pct}>{remaining}</Num>
        </Root>
    );
}
