import React from 'react';
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
    loading,
}) {
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
                    <QItem key={i} $active={i === activeIdx} onClick={() => onSelectQuestion(i)}>
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
