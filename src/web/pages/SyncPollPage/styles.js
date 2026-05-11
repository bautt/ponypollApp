import styled, { keyframes, css } from 'styled-components';
import { C, FONTS, DIST_COLORS } from '../../lib/theme';

export const LETTER_COLORS = DIST_COLORS.slice(0, 4);
export const MEDALS = ['🥇', '🥈', '🥉'];

// ── Animations ────────────────────────────────────────────────────────────────
export const popIn = keyframes`from { opacity:0; transform:scale(0.92) translateY(8px); } to { opacity:1; transform:none; }`;
export const pulse = keyframes`0%,100%{opacity:1} 50%{opacity:0.5}`;

// ── Layout ────────────────────────────────────────────────────────────────────
export const Page = styled.div`
    min-height: 100vh;
    background: ${C.bg};
    color: ${C.text};
    font-family: ${FONTS.sans};
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
`;

export const Card = styled.div`
    background: ${C.surface};
    border: 1px solid ${C.border};
    border-radius: 14px;
    padding: 36px 40px;
    width: 100%;
    max-width: 640px;
    animation: ${popIn} 0.25s ease;
`;

export const Title = styled.h2`
    margin: 0 0 8px;
    font-size: 22px;
    font-weight: 700;
    color: ${C.text};
    text-align: center;
`;

export const Sub = styled.p`
    margin: 0 0 24px;
    font-size: 14px;
    color: ${C.muted};
    text-align: center;
`;

// ── Session number badge (participant view) ───────────────────────────────────
export const SessionNumber = styled.div`
    text-align: center;
    margin-bottom: 20px;
    padding: 12px 20px;
    background: ${C.surface2};
    border: 1px solid ${C.border};
    border-radius: 10px;
    color: ${C.muted};
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    span {
        display: block;
        font-size: 36px;
        font-weight: 800;
        letter-spacing: 0.12em;
        color: ${C.blue};
        font-variant-numeric: tabular-nums;
        line-height: 1.1;
        margin-top: 2px;
    }
`;

// ── Inputs ────────────────────────────────────────────────────────────────────
export const NicknameInput = styled.input`
    width: 100%;
    background: ${C.surface2};
    border: 1px solid ${({ $empty }) => $empty ? C.accent : C.border};
    border-radius: 8px;
    color: ${C.text};
    font-size: 16px;
    padding: 12px 16px;
    outline: none;
    box-sizing: border-box;
    margin-bottom: 8px;
    transition: border-color 0.2s;
    &:focus { border-color: ${C.blue}; }
`;

// ── Buttons ───────────────────────────────────────────────────────────────────
export const JoinBtn = styled.button`
    width: 100%;
    padding: 14px;
    border: none;
    border-radius: 8px;
    background: ${C.blue};
    color: #fff;
    font-size: 16px;
    font-weight: 700;
    cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
    opacity: ${({ disabled }) => (disabled ? 0.45 : 1)};
    transition: opacity 0.15s;
    &:hover:not(:disabled) { opacity: 0.88; }
`;

export const SubmitBtn = styled(JoinBtn)`
    background: ${C.blue};
    margin-top: 20px;
`;

// ── Timer ─────────────────────────────────────────────────────────────────────
export const TimerBar = styled.div`
    height: 8px;
    border-radius: 4px;
    background: ${C.surface2};
    margin-bottom: 20px;
    overflow: hidden;
`;

export const TimerFill = styled.div`
    height: 100%;
    border-radius: 4px;
    background: ${({ $pct }) => ($pct > 50 ? C.green : $pct > 20 ? C.yellow : C.red)};
    width: ${({ $pct }) => $pct}%;
    transition: width 0.5s linear, background 0.5s;
`;

// ── Question elements ─────────────────────────────────────────────────────────
export const QuestionText = styled.div`
    font-size: 20px;
    font-weight: 700;
    line-height: 1.45;
    text-align: center;
    margin-bottom: 28px;
    color: ${C.text};
`;

export const QuestionImage = styled.img`
    max-width: 100%;
    max-height: 280px;
    border-radius: 10px;
    object-fit: contain;
    margin-bottom: 18px;
    display: block;
    margin-left: auto;
    margin-right: auto;
`;

export const OptionsGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 8px;
`;

export const OptionBtn = styled.button`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 16px;
    border-radius: 10px;
    border: 2px solid ${({ $selected, $revealed, $correct, $incorrect }) =>
        $revealed
            ? ($correct ? C.green : ($incorrect ? C.red : C.border))
            : ($selected ? C.blue : C.border)};
    background: ${({ $selected, $revealed, $correct, $incorrect }) =>
        $revealed
            ? ($correct ? '#0e2a17' : ($incorrect ? '#2a1010' : C.surface2))
            : ($selected ? '#0a2535' : C.surface2)};
    color: ${C.text};
    font-size: 14px;
    font-weight: 500;
    cursor: ${({ disabled }) => (disabled ? 'default' : 'pointer')};
    text-align: left;
    transition: border-color 0.15s, background 0.15s;
    &:hover:not(:disabled) {
        border-color: ${({ $revealed }) => ($revealed ? 'inherit' : C.blue)};
        background: ${({ $revealed }) => ($revealed ? 'inherit' : '#0a2535')};
    }
`;

export const OptionBadge = styled.span`
    display: inline-flex;
    min-width: 28px; height: 28px;
    border-radius: 7px;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 13px;
    background: ${({ color }) => color};
    color: #fff;
    flex-shrink: 0;
`;

// ── Feedback ──────────────────────────────────────────────────────────────────
export const FeedbackBox = styled.div`
    text-align: center;
    padding: 18px;
    border-radius: 10px;
    margin-top: 20px;
    background: ${({ $correct }) => ($correct ? '#0e2a17' : '#2a1010')};
    border: 1px solid ${({ $correct }) => ($correct ? C.green : C.red)};
    font-size: 20px;
    font-weight: 700;
    color: ${({ $correct }) => ($correct ? C.green : C.red)};
`;

export const ScoreCircle = styled.div`
    width: 110px; height: 110px;
    border-radius: 50%;
    border: 3px solid ${C.yellow};
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
    font-size: 32px;
    font-weight: 700;
    color: ${C.yellow};
`;

export const Waiting = styled.div`
    text-align: center;
    color: ${C.muted};
    font-size: 15px;
    ${css`animation: ${pulse} 2s infinite;`}
`;

// ── Leaderboard ───────────────────────────────────────────────────────────────
export const LbTable = styled.table`
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    margin-top: 16px;
`;
export const LbRow = styled.tr`border-bottom: 1px solid ${C.border}; &:last-child{border-bottom:none;}`;
export const LbTh = styled.th`text-align:left;padding:7px 8px;color:${C.muted};font-size:11px;text-transform:uppercase;letter-spacing:0.04em;`;
export const LbTd = styled.td`padding:8px;color:${C.text};`;

// ── Podium ────────────────────────────────────────────────────────────────────
export const PodiumWrap = styled.div`
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 8px;
    margin: 28px 0 20px;
`;

// order prop: 1 = gold (center, tallest), 2 = silver (left), 3 = bronze (right)
export const PodiumSlot = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;
    max-width: 160px;
`;

export const PodiumAvatar = styled.div`
    font-size: ${({ $rank }) => ($rank === 1 ? '48px' : '36px')};
    line-height: 1;
    margin-bottom: 6px;
`;

export const PodiumName = styled.div`
    font-size: ${({ $rank }) => ($rank === 1 ? '15px' : '13px')};
    font-weight: 700;
    color: ${C.text};
    text-align: center;
    max-width: 140px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    ${({ $isMe }) => $isMe && `color: ${C.blue};`}
    margin-bottom: 4px;
`;

export const PodiumScore = styled.div`
    font-size: 13px;
    font-weight: 600;
    color: ${C.yellow};
    margin-bottom: 6px;
`;

export const PodiumBlock = styled.div`
    width: 100%;
    border-radius: 8px 8px 0 0;
    height: ${({ $rank }) => ($rank === 1 ? '90px' : $rank === 2 ? '64px' : '44px')};
    background: ${({ $rank }) =>
        $rank === 1 ? 'linear-gradient(180deg,#f5c842 0%,#c8960a 100%)' :
        $rank === 2 ? 'linear-gradient(180deg,#b0b8c8 0%,#7a848e 100%)' :
                     'linear-gradient(180deg,#c8895a 0%,#8a5530 100%)'};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: ${({ $rank }) => ($rank === 1 ? '26px' : '20px')};
    font-weight: 900;
    color: #fff;
    letter-spacing: -0.02em;
`;

export const PodiumRest = styled.table`
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    margin-top: 4px;
`;
export const PodiumRestRow = styled.tr`
    border-bottom: 1px solid ${C.border};
    &:last-child { border-bottom: none; }
    background: ${({ $isMe }) => $isMe ? '#0a2535' : 'transparent'};
`;
export const PodiumRestTd = styled.td`
    padding: 8px;
    color: ${C.text};
    ${({ $isMe }) => $isMe && `font-weight: 700;`}
`;
