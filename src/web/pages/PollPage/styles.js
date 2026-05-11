import styled from 'styled-components';
import { C, FONTS } from '../../lib/theme';

// ── Root layout ───────────────────────────────────────────────────────────────
export const Root = styled.div`
    display: flex;
    flex-direction: column;
    min-height: calc(100vh - 90px);
    background: ${C.bg};
    color: ${C.text};
    font-family: ${FONTS.sans};
`;

export const TopBar = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 20px;
    background: ${C.surface};
    border-bottom: 1px solid ${C.border};
`;

export const SubjectTitle = styled.h2`
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: ${C.text};
    flex: 1;
`;

export const Progress = styled.span`
    font-size: 13px;
    color: ${C.muted};
`;

export const ScoreBadge = styled.span`
    background: ${C.surface};
    border: 1px solid ${C.border};
    border-radius: 20px;
    padding: 3px 12px;
    font-size: 13px;
    font-weight: 700;
    color: ${C.accent};
`;

export const Body = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 24px 20px;
    max-width: 860px;
    margin: 0 auto;
    width: 100%;
    gap: 16px;
`;

// ── Question display ───────────────────────────────────────────────────────────
export const QuestionText = styled.h1`
    font-size: clamp(18px, 3vw, 26px);
    font-weight: 700;
    margin: 0;
    color: #fff;
    line-height: 1.3;
`;

export const QuestionImage = styled.img`
    max-width: 100%;
    max-height: 300px;
    border-radius: 10px;
    object-fit: contain;
    margin-bottom: 16px;
    display: block;
`;

// ── Multiple-choice options ────────────────────────────────────────────────────
export const OptionsGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    @media (max-width: 600px) { grid-template-columns: 1fr; }
`;

export const OptionBtn = styled.button`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    border-radius: 10px;
    text-align: left;
    font-size: 15px;
    font-weight: ${({ $selected, $multi }) => ($selected && $multi) ? 700 : 500};
    cursor: ${({ disabled }) => (disabled ? 'default' : 'pointer')};
    transition: background 0.15s, border-color 0.15s, transform 0.1s, box-shadow 0.15s;
    color: ${C.text};

    border: 2px solid ${({ $selected, $revealed, $correct, color }) => {
        if ($revealed) {
            if ($correct) return C.accent;
            if ($selected) return C.red;
            return color + '44';
        }
        return $selected ? color : color + '44';
    }};

    background: ${({ $selected, $multi, $revealed, $correct, color }) => {
        if ($revealed) {
            if ($correct) return color + '33';
            if ($selected) return C.red + '22';
            return 'transparent';
        }
        if ($selected && $multi) return color + '44';
        if ($selected) return color + '33';
        return 'transparent';
    }};

    box-shadow: ${({ $selected, $multi, $revealed, $correct, color }) => {
        if ($revealed && $correct) return `0 0 0 2px ${C.accent}44`;
        if ($selected && $multi) return `0 0 0 1px ${color}88`;
        return 'none';
    }};

    ${({ disabled }) => !disabled && `&:hover { background: rgba(255,255,255,0.06); transform: translateY(-1px); }`}
`;

export const Badge = styled.span`
    width: 32px;
    height: 32px;
    border-radius: 6px;
    background: ${({ color }) => color};
    color: #fff;
    font-weight: 700;
    font-size: 15px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
`;

// ── Free-text input ────────────────────────────────────────────────────────────
export const FreetextArea = styled.textarea`
    width: 100%;
    background: ${C.surface};
    border: 1px solid ${C.border};
    border-radius: 8px;
    color: ${C.text};
    font-size: 15px;
    padding: 12px;
    resize: vertical;
    min-height: 100px;
    box-sizing: border-box;
    &:focus { outline: none; border-color: ${C.blue}; }
`;

// ── Slider ─────────────────────────────────────────────────────────────────────
export const SliderBox = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    padding: 28px 24px;
    background: ${C.surface};
    border: 1px solid ${C.border};
    border-radius: 12px;
`;

export const SliderTrackRow = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
`;

export const SliderRangeInput = styled.input`
    flex: 1;
    accent-color: ${C.blue};
    height: 6px;
    cursor: ${({ disabled }) => (disabled ? 'default' : 'pointer')};
`;

export const SliderValueDisplay = styled.div`
    font-size: 52px;
    font-weight: 800;
    color: ${C.blue};
    min-width: 80px;
    text-align: center;
    line-height: 1;
`;

export const SliderUnitLabel = styled.span`
    font-size: 18px;
    color: ${C.muted};
    font-weight: 600;
`;

// ── Feedback + action buttons ──────────────────────────────────────────────────
export const FeedbackBanner = styled.div`
    border-radius: 10px;
    padding: 14px 20px;
    font-size: 16px;
    font-weight: 600;
    text-align: center;
    background: ${({ $ok }) => ($ok ? C.accent + '22' : C.red + '22')};
    border: 1px solid ${({ $ok }) => ($ok ? C.accent : C.red)};
    color: ${({ $ok }) => ($ok ? C.accent : C.red)};
`;

export const NextBtn = styled.button`
    align-self: flex-end;
    padding: 10px 28px;
    border: none;
    border-radius: 8px;
    background: ${C.blue};
    color: #fff;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    &:hover { opacity: 0.85; }
`;

// ── Setup / Done screens ───────────────────────────────────────────────────────
export const SetupCard = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
    min-height: calc(100vh - 90px);
    background: ${C.bg};
    color: ${C.text};
    font-family: ${FONTS.sans};
    text-align: center;
    padding: 40px 20px;
`;

export const NicknameWrap = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    width: 100%;
    max-width: 320px;
`;

export const NicknameLabel = styled.label`
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${C.muted};
`;

export const NicknameInput = styled.input`
    width: 100%;
    background: ${C.surface};
    border: 2px solid ${({ $empty }) => $empty ? C.accent : C.border};
    border-radius: 10px;
    color: #fff;
    font-size: 18px;
    font-weight: 600;
    padding: 12px 16px;
    text-align: center;
    box-sizing: border-box;
    transition: border-color 0.2s;
    &:focus {
        outline: none;
        border-color: ${C.blue};
    }
`;

export const SetupTitle = styled.h1`
    font-size: 36px;
    font-weight: 700;
    color: #fff;
    margin: 0;
`;

export const SetupSubtitle = styled.p`
    font-size: 16px;
    color: ${C.muted};
    margin: 0;
    max-width: 420px;
`;

export const StartBtn = styled.button`
    padding: 14px 48px;
    border: none;
    border-radius: 10px;
    background: ${C.blue};
    color: #fff;
    font-size: 18px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 4px 20px ${C.blue}55;
    &:hover { opacity: 0.88; }
`;

export const DoneCard = styled(SetupCard)``;

export const ScoreCircle = styled.div`
    width: 140px;
    height: 140px;
    border-radius: 50%;
    border: 4px solid ${C.accent};
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: 36px;
    font-weight: 700;
    color: ${C.accent};
    box-shadow: 0 0 30px ${C.accent}44;
`;

export const RestartBtn = styled.button`
    padding: 12px 36px;
    border: 1px solid ${C.border};
    border-radius: 8px;
    background: transparent;
    color: ${C.text};
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    &:hover { background: rgba(255,255,255,0.06); }
`;
