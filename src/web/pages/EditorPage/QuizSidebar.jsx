import React, { useRef, useState } from 'react';
import { C } from '../../lib/theme';
import { QUESTION_TYPES } from '../../lib/questions';
import {
    Sidebar, QuizBar, QuizRow, QuizSelect, SmallBtn,
    SidebarHeader, AddBtn, QList, QItem, QItemText, QItemType,
} from './styles';

export default function QuizSidebar({
    quizzes, activeQuizId, liveQuizId, quizLoading,
    onQuizSwitch, onNewQuiz, onRenameQuiz, onDeleteQuiz,
    questions, activeIdx, onSelectQuestion, onAddQuestion,
    onReorder, loading,
}) {
    const dragIdx = useRef(null);
    const [dragOverIdx, setDragOverIdx] = useState(null);

    const handleDragStart = (e, i) => {
        dragIdx.current = i;
        // Use a transparent image so the browser ghost doesn't show
        const ghost = document.createElement('div');
        ghost.style.position = 'absolute';
        ghost.style.top = '-9999px';
        document.body.appendChild(ghost);
        e.dataTransfer.setDragImage(ghost, 0, 0);
        setTimeout(() => document.body.removeChild(ghost), 0);
    };

    const handleDragOver = (e, i) => {
        e.preventDefault();
        if (i !== dragOverIdx) setDragOverIdx(i);
    };

    const handleDrop = (e, i) => {
        e.preventDefault();
        if (dragIdx.current !== null && dragIdx.current !== i) {
            onReorder(dragIdx.current, i);
        }
        dragIdx.current = null;
        setDragOverIdx(null);
    };

    const handleDragEnd = () => {
        dragIdx.current = null;
        setDragOverIdx(null);
    };

    return (
        <Sidebar>
            <QuizBar>
                <QuizRow>
                    <QuizSelect
                        value={activeQuizId || ''}
                        onChange={(e) => onQuizSwitch(e.target.value)}
                        disabled={quizLoading}
                        title="Select which quiz to edit"
                    >
                        {quizzes.map((q) => (
                            <option key={q._key} value={q._key}>
                                {q._key === liveQuizId ? '▶ ' : ''}{q.name}
                            </option>
                        ))}
                    </QuizSelect>
                </QuizRow>
                <QuizRow>
                    <SmallBtn $primary onClick={onNewQuiz}>+ New</SmallBtn>
                    <SmallBtn onClick={onRenameQuiz} disabled={!activeQuizId}>Rename</SmallBtn>
                    <SmallBtn $danger onClick={onDeleteQuiz} disabled={!activeQuizId || quizzes.length <= 1}>
                        Delete
                    </SmallBtn>
                </QuizRow>
            </QuizBar>

            <SidebarHeader>
                Questions ({questions.length})
                <AddBtn onClick={onAddQuestion} disabled={!activeQuizId}>+ Add</AddBtn>
            </SidebarHeader>

            <QList>
                {loading && (
                    <QItem style={{ cursor: 'default', color: C.muted }}>Loading…</QItem>
                )}
                {questions.map((q, i) => (
                    <QItem
                        key={i}
                        $active={i === activeIdx}
                        $dragging={i === dragIdx.current}
                        $dragOver={i === dragOverIdx}
                        draggable
                        onDragStart={(e) => handleDragStart(e, i)}
                        onDragOver={(e) => handleDragOver(e, i)}
                        onDrop={(e) => handleDrop(e, i)}
                        onDragEnd={handleDragEnd}
                        onClick={() => onSelectQuestion(i)}
                        title="Drag to reorder"
                    >
                        <QItemText>{i + 1}. {q.text || <em style={{ color: C.muted }}>Untitled</em>}</QItemText>
                        <QItemType>
                            {QUESTION_TYPES.find((t) => t.value === q.type)?.label || q.type}
                            {' · '}⏱ {q.timeLimit}s
                        </QItemType>
                    </QItem>
                ))}
            </QList>
        </Sidebar>
    );
}
