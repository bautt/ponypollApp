import styled from 'styled-components';
import { C, FONTS } from '../../lib/theme';

// ── Root layout ───────────────────────────────────────────────────────────────
export const Root = styled.div`
    display: flex;
    min-height: calc(100vh - 90px);
    background: ${C.bg};
    color: ${C.text};
    font-family: ${FONTS.sans};
`;

// ── Sidebar ───────────────────────────────────────────────────────────────────
export const Sidebar = styled.div`
    width: 240px;
    flex-shrink: 0;
    background: ${C.surface};
    border-right: 1px solid ${C.border};
    display: flex;
    flex-direction: column;
`;

export const QuizBar = styled.div`
    padding: 10px 12px;
    border-bottom: 1px solid ${C.border};
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

export const QuizRow = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
`;

export const QuizSelect = styled.select`
    flex: 1;
    background: ${C.bg};
    border: 1px solid ${C.border};
    border-radius: 6px;
    color: ${C.text};
    font-size: 13px;
    padding: 5px 8px;
    min-width: 0;
    &:focus { outline: none; border-color: ${C.blue}; }
`;

export const SmallBtn = styled.button`
    padding: 4px 8px;
    border-radius: 5px;
    border: 1px solid ${({ $danger, $primary }) => $danger ? C.red : $primary ? C.blue : C.border};
    background: ${({ $danger, $primary }) => $danger ? C.red + '22' : $primary ? C.blue + '22' : 'transparent'};
    color: ${({ $danger, $primary }) => $danger ? C.red : $primary ? C.blue : C.muted};
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    &:hover { opacity: 0.8; }
    &:disabled { opacity: 0.35; cursor: default; }
`;

export const SidebarHeader = styled.div`
    padding: 10px 16px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${C.muted};
    border-bottom: 1px solid ${C.border};
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

export const AddBtn = styled.button`
    padding: 3px 10px;
    border-radius: 6px;
    border: 1px solid ${C.blue};
    background: transparent;
    color: ${C.blue};
    font-size: 12px;
    cursor: pointer;
    &:hover { background: ${C.blue}22; }
`;

export const QList = styled.div`flex: 1; overflow-y: auto;`;

export const QItem = styled.div`
    padding: 10px 16px;
    border-bottom: 1px solid ${C.border}55;
    cursor: grab;
    background: ${({ $active }) => ($active ? C.blue + '22' : 'transparent')};
    border-left: 3px solid ${({ $active }) => ($active ? C.blue : 'transparent')};
    border-top: 2px solid ${({ $dragOver }) => ($dragOver ? C.accent : 'transparent')};
    font-size: 13px;
    color: ${({ $active }) => ($active ? '#fff' : C.text)};
    opacity: ${({ $dragging }) => ($dragging ? 0.4 : 1)};
    transition: opacity 0.1s, border-top-color 0.1s;
    &:hover { background: rgba(255,255,255,0.04); }
    &:active { cursor: grabbing; }
`;
export const QItemText = styled.div`white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`;
export const QItemType = styled.div`font-size: 11px; color: ${C.muted}; margin-top: 2px;`;

// ── Main area ─────────────────────────────────────────────────────────────────
export const Main = styled.div`flex: 1; display: flex; flex-direction: column; overflow-y: auto;`;

export const Toolbar = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background: ${C.surface};
    border-bottom: 1px solid ${C.border};
    flex-wrap: wrap;
`;

export const ToolbarTitle = styled.h2`margin: 0; font-size: 16px; font-weight: 600; flex: 1;`;

export const TBtn = styled.button`
    padding: 7px 14px;
    border-radius: 6px;
    border: 1px solid ${({ $danger, $primary }) => $danger ? C.red : $primary ? C.blue : C.border};
    background: ${({ $danger, $primary }) => $danger ? C.red + '22' : $primary ? C.blue : 'transparent'};
    color: ${({ $danger, $primary }) => $danger ? C.red : $primary ? '#fff' : C.text};
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    &:hover { opacity: 0.8; }
    &:disabled { opacity: 0.4; cursor: default; }
`;

export const EditorArea = styled.div`padding: 24px 20px; display: flex; flex-direction: column; gap: 20px; max-width: 800px;`;

// ── Form elements ─────────────────────────────────────────────────────────────
export const Label = styled.label`
    display: block;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${C.muted};
    margin-bottom: 6px;
`;

export const Input = styled.input`
    width: 100%;
    background: ${C.surface};
    border: 1px solid ${C.border};
    border-radius: 6px;
    color: ${C.text};
    font-size: 15px;
    padding: 9px 12px;
    box-sizing: border-box;
    &:focus { outline: none; border-color: ${C.blue}; }
`;

export const Textarea = styled.textarea`
    width: 100%;
    background: ${C.surface};
    border: 1px solid ${C.border};
    border-radius: 6px;
    color: ${C.text};
    font-size: 15px;
    padding: 9px 12px;
    box-sizing: border-box;
    resize: vertical;
    min-height: 72px;
    &:focus { outline: none; border-color: ${C.blue}; }
`;

export const Select = styled.select`
    background: ${C.surface};
    border: 1px solid ${C.border};
    border-radius: 6px;
    color: ${C.text};
    font-size: 14px;
    padding: 8px 12px;
    &:focus { outline: none; border-color: ${C.blue}; }
`;

export const TypeToggle = styled.div`display: flex; gap: 8px; flex-wrap: wrap;`;

export const TypeBtn = styled.button`
    padding: 7px 14px;
    border-radius: 6px;
    border: 1px solid ${({ $active }) => ($active ? C.blue : C.border)};
    background: ${({ $active }) => ($active ? C.blue + '33' : 'transparent')};
    color: ${({ $active }) => ($active ? C.blue : C.muted)};
    font-size: 13px;
    cursor: pointer;
    &:hover { border-color: ${C.blue}; }
`;

export const OptionRow = styled.div`display: flex; align-items: center; gap: 8px;`;

export const OptionBadge = styled.span`
    width: 28px; height: 28px; border-radius: 5px;
    background: ${({ color }) => color}; color: #fff;
    font-weight: 700; font-size: 13px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
`;

export const CheckBtn = styled.button`
    width: 28px; height: 28px; border-radius: 5px;
    border: 2px solid ${({ $correct }) => ($correct ? C.accent : C.border)};
    background: ${({ $correct }) => ($correct ? C.accent + '33' : 'transparent')};
    color: ${({ $correct }) => ($correct ? C.accent : C.muted)};
    font-size: 16px; cursor: pointer; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    &:hover { border-color: ${C.accent}; }
`;

export const SliderTrack = styled.div`display: flex; align-items: center; gap: 12px; margin-top: 4px;`;
export const SliderInput = styled.input`flex: 1; accent-color: ${C.blue}; height: 4px;`;

export const StatusBar = styled.div`
    padding: 8px 20px;
    background: ${C.surface};
    border-top: 1px solid ${C.border};
    font-size: 12px;
    color: ${({ $error }) => ($error ? C.red : C.accent)};
`;

export const EmptyState = styled.div`
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 12px; color: ${C.muted}; font-size: 15px;
`;

// ── Library modal ─────────────────────────────────────────────────────────────
export const ModalOverlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.65);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
`;

export const ModalBox = styled.div`
    background: ${C.surface};
    border: 1px solid ${C.border};
    border-radius: 10px;
    padding: 28px 32px;
    width: 560px;
    max-width: 95vw;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 8px 40px rgba(0,0,0,0.6);
`;

export const ModalTitle = styled.h3`margin: 0 0 6px; font-size: 18px; color: #fff;`;
export const ModalSub = styled.p`margin: 0 0 20px; font-size: 13px; color: ${C.muted};`;

export const LibCard = styled.div`
    border: 1px solid ${C.border};
    border-radius: 8px;
    padding: 14px 16px;
    margin-bottom: 12px;
    display: flex;
    gap: 14px;
    align-items: flex-start;
`;

export const LibCardBody = styled.div`flex: 1;`;
export const LibCardName = styled.div`font-size: 15px; font-weight: 600; color: #fff; margin-bottom: 4px;`;
export const LibCardMeta = styled.div`font-size: 12px; color: ${C.muted}; margin-bottom: 6px;`;
export const LibCardDesc = styled.div`font-size: 13px; color: ${C.text};`;

export const DiffBadge = styled.span`
    font-size: 11px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 4px;
    background: ${({ $diff }) =>
        $diff === 'Beginner' ? '#1a6b3a' :
        $diff === 'Advanced' ? '#6b3a1a' : '#1a3a6b'};
    color: ${({ $diff }) =>
        $diff === 'Beginner' ? '#5CC05C' :
        $diff === 'Advanced' ? '#ED8B00' : '#009CDE'};
    margin-left: 8px;
`;

export const SourceToggle = styled.div`
    display: flex;
    border: 1px solid ${C.border};
    border-radius: 6px;
    overflow: hidden;
    margin-bottom: 18px;
`;

export const SourceBtn = styled.button`
    flex: 1;
    padding: 7px 12px;
    border: none;
    background: ${({ $active }) => $active ? C.blue : 'transparent'};
    color: ${({ $active }) => $active ? '#fff' : C.muted};
    font-size: 13px;
    font-weight: ${({ $active }) => $active ? 700 : 400};
    cursor: pointer;
    transition: background 0.15s;
    &:hover { background: ${({ $active }) => $active ? C.blue : C.blue + '22'}; color: #fff; }
`;
