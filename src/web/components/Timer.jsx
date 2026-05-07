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

    // Reset when question changes
    useEffect(() => {
        setRemaining(duration);
    }, [duration]);

    useEffect(() => {
        if (!running) {
            clearInterval(intervalRef.current);
            return;
        }
        intervalRef.current = setInterval(() => {
            setRemaining((prev) => {
                const next = prev - 1;
                if (onTick) onTick(next);
                if (next <= 0) {
                    clearInterval(intervalRef.current);
                    if (onExpire) onExpire();
                    return 0;
                }
                return next;
            });
        }, 1000);
        return () => clearInterval(intervalRef.current);
    }, [running, onExpire, onTick]);

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
