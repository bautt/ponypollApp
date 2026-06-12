import React from 'react';
import { C } from '../../lib/theme';
import {
    ModalOverlay, ModalBox, ModalTitle, ModalSub,
    CopyPickerRow, SelectAllRow, CopyQList, CopyQRow, CopyQText, CopyQMeta,
    CopyControls, TBtn, SmallBtn,
} from './styles';

const TYPE_LABEL = {
    single: 'single',
    multi: 'multi',
    yesno: 'yes/no',
    freetext: 'free text',
    slider: 'slider',
    wordcloud: 'word cloud',
};

const truncate = (s, n) => {
    if (!s) return '(untitled)';
    return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s;
};

export default function CopyQuestionsModal({
    quizzes,
    activeQuizId,
    sourceId,
    sourceQuestions,
    sourceLoading,
    sourceError,
    selected,
    targetId,
    copying,
    onSelectSource,
    onToggleQuestion,
    onSelectAll,
    onClearAll,
    onSelectTarget,
    onCopy,
    onClose,
}) {
    const selectedCount = selected.size;
    const canCopy = !!sourceId && selectedCount > 0 && !!targetId && !copying;

    return (
        <ModalOverlay onClick={onClose}>
            <ModalBox onClick={(e) => e.stopPropagation()}>
                <ModalTitle>Copy Questions</ModalTitle>
                <ModalSub>
                    Pick a source quiz, tick the questions you want, then choose where to paste them.
                    Selected questions are appended to the target as new entries (originals stay intact).
                </ModalSub>

                <CopyPickerRow>
                    <label htmlFor="copy-src">Source quiz:</label>
                    <select
                        id="copy-src"
                        value={sourceId}
                        onChange={(e) => onSelectSource(e.target.value)}
                        disabled={copying}
                    >
                        <option value="">— Select source quiz —</option>
                        {quizzes.map((q) => (
                            <option key={q._key} value={q._key}>
                                {q.name}{q._key === activeQuizId ? ' (current)' : ''}
                            </option>
                        ))}
                    </select>
                </CopyPickerRow>

                {sourceId && (
                    <>
                        {sourceLoading && (
                            <div style={{ color: C.muted, fontSize: 13, padding: '12px 0' }}>
                                Loading questions…
                            </div>
                        )}
                        {sourceError && (
                            <div style={{ color: C.red, fontSize: 13, padding: '8px 0' }}>
                                ✗ {sourceError}
                            </div>
                        )}
                        {!sourceLoading && !sourceError && sourceQuestions.length === 0 && (
                            <div style={{ color: C.muted, fontSize: 13, padding: '12px 0' }}>
                                This quiz has no questions yet.
                            </div>
                        )}
                        {!sourceLoading && !sourceError && sourceQuestions.length > 0 && (
                            <>
                                <SelectAllRow>
                                    <span>{selectedCount} of {sourceQuestions.length} selected</span>
                                    <SmallBtn onClick={onSelectAll} disabled={copying}>Select all</SmallBtn>
                                    <SmallBtn onClick={onClearAll} disabled={copying || selectedCount === 0}>Clear</SmallBtn>
                                </SelectAllRow>
                                <CopyQList>
                                    {sourceQuestions.map((q, i) => {
                                        const checked = selected.has(i);
                                        return (
                                            <CopyQRow key={q._key || i} $checked={checked}>
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => onToggleQuestion(i)}
                                                    disabled={copying}
                                                />
                                                <CopyQText title={q.text}>
                                                    {i + 1}. {truncate(q.text, 80)}
                                                </CopyQText>
                                                <CopyQMeta>
                                                    {TYPE_LABEL[q.type] || q.type} · {q.timeLimit || 0}s
                                                </CopyQMeta>
                                            </CopyQRow>
                                        );
                                    })}
                                </CopyQList>
                            </>
                        )}
                    </>
                )}

                <CopyControls>
                    <label htmlFor="copy-dst">Copy to:</label>
                    <select
                        id="copy-dst"
                        value={targetId}
                        onChange={(e) => onSelectTarget(e.target.value)}
                        disabled={copying}
                    >
                        {quizzes.map((q) => (
                            <option
                                key={q._key}
                                value={q._key}
                                disabled={q._key === sourceId}
                            >
                                {q.name}
                                {q._key === activeQuizId ? ' (current)' : ''}
                                {q._key === sourceId ? ' — source, disabled' : ''}
                            </option>
                        ))}
                        <option value="__new__">+ New quiz…</option>
                    </select>
                    <div style={{ flexBasis: '100%', height: 0 }} />
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                        <TBtn onClick={onClose} disabled={copying}>Cancel</TBtn>
                        <TBtn $primary onClick={onCopy} disabled={!canCopy}>
                            {copying ? 'Copying…' : `Copy${selectedCount > 0 ? ` (${selectedCount})` : ''}`}
                        </TBtn>
                    </div>
                </CopyControls>
            </ModalBox>
        </ModalOverlay>
    );
}
