import styled from 'styled-components';
import { C, FONTS } from '../../lib/theme';

export const MEDALS = ['🥇', '🥈', '🥉'];

// ── Root layout ───────────────────────────────────────────────────────────────
export const Page = styled.div`
    min-height: calc(100vh - 45px);
    background: ${C.bg};
    color: ${C.text};
    font-family: ${FONTS.sans};
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 32px 24px 48px;
`;

export const Card = styled.div`
    background: ${C.surface};
    border: 1px solid ${C.border};
    border-radius: 12px;
    padding: 32px 36px;
    width: 100%;
    max-width: 760px;
    margin-bottom: 20px;
`;

export const Title = styled.h2`
    margin: 0 0 6px;
    font-size: 22px;
    font-weight: 700;
    color: ${C.text};
`;

export const Subtitle = styled.p`
    margin: 0 0 24px;
    font-size: 13px;
    color: ${C.muted};
`;

export const BigBtn = styled.button`
    padding: 14px 36px;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 700;
    cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
    background: ${({ $danger, $secondary }) => $danger ? C.red : $secondary ? C.surface2 : C.blue};
    color: #fff;
    opacity: ${({ disabled }) => (disabled ? 0.45 : 1)};
    transition: opacity 0.15s, transform 0.1s;
    &:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
    margin-right: 12px;
`;

export const SmallBtn = styled.button`
    padding: 8px 18px;
    border: 1px solid ${({ $danger }) => ($danger ? C.red : C.border)};
    border-radius: 6px;
    background: transparent;
    color: ${({ $danger }) => ($danger ? C.red : C.text)};
    font-size: 13px;
    font-weight: 600;
    cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
    opacity: ${({ disabled }) => (disabled ? 0.4 : 1)};
    &:hover:not(:disabled) { background: rgba(255,255,255,0.06); }
    margin-right: 8px;
`;

export const StatusBanner = styled.div`
    padding: 10px 16px;
    border-radius: 7px;
    font-size: 13px;
    font-weight: 500;
    background: ${({ $error }) => ($error ? '#3a1515' : '#152a1f')};
    color: ${({ $error }) => ($error ? C.red : C.green)};
    border: 1px solid ${({ $error }) => ($error ? C.red : C.green)}44;
    margin-bottom: 16px;
`;

export const PhaseTag = styled.span`
    display: inline-block;
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    background: ${({ $phase }) => ({
        waiting: '#1a3040', question: '#152a1f', reveal: '#2a2010', done: '#1a2040',
    }[$phase] || C.surface2)};
    color: ${({ $phase }) => ({
        waiting: C.blue, question: C.green, reveal: C.yellow, done: C.blue,
    }[$phase] || C.muted)};
    margin-left: 10px;
`;

export const QuestionBox = styled.div`
    background: ${C.surface2};
    border: 1px solid ${C.border};
    border-radius: 8px;
    padding: 20px 24px;
    margin-bottom: 20px;
    font-size: 18px;
    font-weight: 600;
    line-height: 1.5;
`;

export const QuestionImage = styled.img`
    max-width: 100%;
    max-height: 320px;
    border-radius: 10px;
    object-fit: contain;
    margin-bottom: 16px;
    display: block;
`;

export const TimerBar = styled.div`
    height: 6px;
    border-radius: 3px;
    background: ${C.surface2};
    margin-bottom: 20px;
    overflow: hidden;
`;

export const TimerFill = styled.div`
    height: 100%;
    border-radius: 3px;
    background: ${({ $pct }) => $pct > 50 ? C.green : $pct > 20 ? C.yellow : C.red};
    width: ${({ $pct }) => $pct}%;
    transition: width 0.5s linear, background 0.5s;
`;

export const TimerLabel = styled.div`
    font-size: 13px;
    color: ${C.muted};
    margin-bottom: 16px;
`;

export const Grid2 = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 20px;
`;

export const OptionPill = styled.div`
    background: ${({ $correct }) => ($correct ? '#0e2a17' : C.surface2)};
    border: 1px solid ${({ $correct }) => ($correct ? C.green : C.border)};
    border-radius: 8px;
    padding: 14px 18px;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 10px;
`;

export const OptionBadge = styled.span`
    display: inline-flex;
    width: 26px; height: 26px;
    border-radius: 6px;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 12px;
    background: ${({ $correct }) => ($correct ? C.green : C.surface)};
    color: ${({ $correct }) => ($correct ? '#fff' : C.muted)};
    flex-shrink: 0;
`;

export const Stat = styled.div`
    text-align: center;
    padding: 16px;
    background: ${C.surface2};
    border-radius: 8px;
    border: 1px solid ${C.border};
`;

export const StatVal = styled.div`
    font-size: 28px;
    font-weight: 700;
    color: ${({ $color }) => $color || C.blue};
`;

export const StatLabel = styled.div`
    font-size: 11px;
    color: ${C.muted};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-top: 4px;
`;

export const LbTable = styled.table`width: 100%; border-collapse: collapse; font-size: 13px;`;
export const LbRow = styled.tr`border-bottom: 1px solid ${C.border}; &:last-child { border-bottom: none; }`;
export const LbTh = styled.th`text-align: left; padding: 8px 10px; color: ${C.muted}; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em;`;
export const LbTd = styled.td`padding: 9px 10px; color: ${C.text};`;

export const ParticipantGrid = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
    min-height: 40px;
`;

export const JoinPanel = styled.div`
    background: ${C.surface2};
    border: 1px solid ${C.border};
    border-radius: 10px;
    padding: 20px 24px;
    display: flex;
    gap: 28px;
    align-items: flex-start;
    margin-bottom: 24px;
`;

export const JoinPanelLarge = styled(JoinPanel)`
    background: ${C.surface};
    border-color: ${C.blue}55;
    padding: 28px 32px;
    align-items: center;
    gap: 36px;
`;

export const JoinUrl = styled.div`
    font-family: 'Courier New', 'Consolas', monospace;
    font-size: 15px;
    font-weight: 700;
    color: ${C.blue};
    word-break: break-all;
    line-height: 1.5;
    margin-bottom: 6px;
`;

export const ShortUrlRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 8px;
`;

export const CopyBtn = styled.button`
    padding: 5px 12px;
    border: 1px solid ${C.border};
    border-radius: 5px;
    background: transparent;
    color: ${C.muted};
    font-size: 12px;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s;
    &:hover { border-color: ${C.blue}; color: ${C.blue}; }
`;

export const QuizPicker = styled.select`
    background: ${C.surface2};
    border: 1px solid ${C.border};
    border-radius: 7px;
    color: ${C.text};
    font-size: 14px;
    padding: 9px 12px;
    cursor: pointer;
    flex: 1;
    min-width: 0;
    &:focus { outline: none; border-color: ${C.blue}; }
`;

export const ModeToggleWrap = styled.div`display: flex; gap: 6px; flex: 1;`;

export const ModeBtn = styled.button`
    flex: 1;
    padding: 9px 10px;
    border-radius: 7px;
    border: 1px solid ${({ $active }) => ($active ? C.blue : C.border)};
    background: ${({ $active }) => ($active ? C.blue + '22' : 'transparent')};
    color: ${({ $active }) => ($active ? C.blue : C.muted)};
    font-size: 13px;
    font-weight: ${({ $active }) => ($active ? 700 : 500)};
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s;
    &:hover:not(:disabled) { border-color: ${C.blue}88; color: ${C.text}; }
    &:disabled { opacity: 0.35; cursor: not-allowed; }
`;

export const SavedFlash = styled.span`
    font-size: 11px;
    color: ${C.accent};
    font-weight: 600;
    opacity: ${({ $show }) => ($show ? 1 : 0)};
    transition: opacity 0.4s;
    white-space: nowrap;
`;

export const ActivateBadge = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 18px;
    border-radius: 8px;
    border: 1px solid ${C.accent}66;
    background: ${C.accent}18;
    color: ${C.accent};
    font-size: 14px;
    font-weight: 700;
`;

export const ControlLabel = styled.span`
    font-size: 13px;
    color: ${C.muted};
    width: 90px;
    flex-shrink: 0;
`;

export const TextInput = styled.input`
    background: ${C.surface2};
    border: 1px solid ${({ $highlight }) => ($highlight ? C.orange : C.border)};
    border-radius: 7px;
    color: ${C.text};
    font-size: 14px;
    padding: 9px 12px;
    flex: 1;
    min-width: 0;
    outline: none;
    &:focus { border-color: ${C.blue}; }
    &::placeholder { color: ${C.muted}; opacity: 0.7; }
`;
