import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import {
    listQuestions, deleteQuestion, saveAllQuestions, saveQuestion,
    listQuizzes, createQuiz, renameQuiz, deleteQuiz, updateQuiz,
    loadConfig, saveConfig,
    fetchLibraryManifest, fetchLibraryQuiz,
    fetchGitHubManifest, fetchGitHubQuiz,
} from '../lib/kvstore';
import {
    fromKvDoc, toKvDoc, newQuestion, defaultOptions, QUESTION_TYPES, SEED_QUESTIONS,
} from '../lib/questions';
import { uid } from '../lib/utils';

const C = {
    bg: '#1B1D22', surface: '#23262F', border: '#3C3F4A',
    text: '#D0D4E3', muted: '#868A9C', accent: '#5CC05C',
    blue: '#009CDE', red: '#DC4E41', orange: '#ED8B00',
};

// ── Styled primitives ──────────────────────────────────────────────────────────

const Root = styled.div`
    display: flex;
    min-height: calc(100vh - 90px);
    background: ${C.bg};
    color: ${C.text};
    font-family: 'Splunk Platform Sans', 'Proxima Nova', sans-serif;
`;

const Sidebar = styled.div`
    width: 240px;
    flex-shrink: 0;
    background: ${C.surface};
    border-right: 1px solid ${C.border};
    display: flex;
    flex-direction: column;
`;

const QuizBar = styled.div`
    padding: 10px 12px;
    border-bottom: 1px solid ${C.border};
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const QuizRow = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
`;

const QuizSelect = styled.select`
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

const SmallBtn = styled.button`
    padding: 4px 8px;
    border-radius: 5px;
    border: 1px solid ${({ danger, primary }) => danger ? C.red : primary ? C.blue : C.border};
    background: ${({ danger, primary }) => danger ? C.red + '22' : primary ? C.blue + '22' : 'transparent'};
    color: ${({ danger, primary }) => danger ? C.red : primary ? C.blue : C.muted};
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    &:hover { opacity: 0.8; }
    &:disabled { opacity: 0.35; cursor: default; }
`;

const ActiveBadge = styled.span`
    font-size: 11px;
    background: ${C.accent}33;
    color: ${C.accent};
    border: 1px solid ${C.accent}66;
    border-radius: 5px;
    padding: 4px 8px;
    font-weight: 700;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 4px;
`;

const ActivateBtn = styled.button`
    padding: 4px 10px;
    border-radius: 5px;
    border: 1px solid ${C.accent};
    background: ${C.accent}22;
    color: ${C.accent};
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
    &:hover { background: ${C.accent}44; }
    &:disabled { opacity: 0.35; cursor: default; }
`;

const SidebarHeader = styled.div`
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

const AddBtn = styled.button`
    padding: 3px 10px;
    border-radius: 6px;
    border: 1px solid ${C.blue};
    background: transparent;
    color: ${C.blue};
    font-size: 12px;
    cursor: pointer;
    &:hover { background: ${C.blue}22; }
`;

const QList = styled.div`flex: 1; overflow-y: auto;`;

const QItem = styled.div`
    padding: 10px 16px;
    border-bottom: 1px solid ${C.border}55;
    cursor: pointer;
    background: ${({ active }) => (active ? C.blue + '22' : 'transparent')};
    border-left: 3px solid ${({ active }) => (active ? C.blue : 'transparent')};
    font-size: 13px;
    color: ${({ active }) => (active ? '#fff' : C.text)};
    &:hover { background: rgba(255,255,255,0.04); }
`;
const QItemText = styled.div`white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`;
const QItemType = styled.div`font-size: 11px; color: ${C.muted}; margin-top: 2px;`;

const Main = styled.div`flex: 1; display: flex; flex-direction: column; overflow-y: auto;`;

const Toolbar = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background: ${C.surface};
    border-bottom: 1px solid ${C.border};
    flex-wrap: wrap;
`;

const ToolbarTitle = styled.h2`margin: 0; font-size: 16px; font-weight: 600; flex: 1;`;

const TBtn = styled.button`
    padding: 7px 14px;
    border-radius: 6px;
    border: 1px solid ${({ danger, primary }) => danger ? C.red : primary ? C.blue : C.border};
    background: ${({ danger, primary }) => danger ? C.red + '22' : primary ? C.blue : 'transparent'};
    color: ${({ danger, primary }) => danger ? C.red : primary ? '#fff' : C.text};
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    &:hover { opacity: 0.8; }
    &:disabled { opacity: 0.4; cursor: default; }
`;

const EditorArea = styled.div`padding: 24px 20px; display: flex; flex-direction: column; gap: 20px; max-width: 800px;`;

const Label = styled.label`
    display: block;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${C.muted};
    margin-bottom: 6px;
`;

const Input = styled.input`
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

const Textarea = styled.textarea`
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

const Select = styled.select`
    background: ${C.surface};
    border: 1px solid ${C.border};
    border-radius: 6px;
    color: ${C.text};
    font-size: 14px;
    padding: 8px 12px;
    &:focus { outline: none; border-color: ${C.blue}; }
`;

const TypeToggle = styled.div`display: flex; gap: 8px; flex-wrap: wrap;`;

const TypeBtn = styled.button`
    padding: 7px 14px;
    border-radius: 6px;
    border: 1px solid ${({ active }) => (active ? C.blue : C.border)};
    background: ${({ active }) => (active ? C.blue + '33' : 'transparent')};
    color: ${({ active }) => (active ? C.blue : C.muted)};
    font-size: 13px;
    cursor: pointer;
    &:hover { border-color: ${C.blue}; }
`;

const OptionRow = styled.div`display: flex; align-items: center; gap: 8px;`;

const OptionBadge = styled.span`
    width: 28px; height: 28px; border-radius: 5px;
    background: ${({ color }) => color}; color: #fff;
    font-weight: 700; font-size: 13px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
`;
const OPTION_COLORS = ['#1F77B4', '#65A637', '#ED8B00', '#AF6DC7'];

const CheckBtn = styled.button`
    width: 28px; height: 28px; border-radius: 5px;
    border: 2px solid ${({ correct }) => (correct ? C.accent : C.border)};
    background: ${({ correct }) => (correct ? C.accent + '33' : 'transparent')};
    color: ${({ correct }) => (correct ? C.accent : C.muted)};
    font-size: 16px; cursor: pointer; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    &:hover { border-color: ${C.accent}; }
`;

const SliderTrack = styled.div`display: flex; align-items: center; gap: 12px; margin-top: 4px;`;
const SliderInput = styled.input`flex: 1; accent-color: ${C.blue}; height: 4px;`;

const StatusBar = styled.div`
    padding: 8px 20px;
    background: ${C.surface};
    border-top: 1px solid ${C.border};
    font-size: 12px;
    color: ${({ error }) => (error ? C.red : C.accent)};
`;

const EmptyState = styled.div`
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 12px; color: ${C.muted}; font-size: 15px;
`;


// Library modal overlay
const ModalOverlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.65);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
`;

const ModalBox = styled.div`
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

const ModalTitle = styled.h3`
    margin: 0 0 6px;
    font-size: 18px;
    color: #fff;
`;

const ModalSub = styled.p`
    margin: 0 0 20px;
    font-size: 13px;
    color: ${C.muted};
`;

const LibCard = styled.div`
    border: 1px solid ${C.border};
    border-radius: 8px;
    padding: 14px 16px;
    margin-bottom: 12px;
    display: flex;
    gap: 14px;
    align-items: flex-start;
`;

const LibCardBody = styled.div`flex: 1;`;
const LibCardName = styled.div`font-size: 15px; font-weight: 600; color: #fff; margin-bottom: 4px;`;
const LibCardMeta = styled.div`font-size: 12px; color: ${C.muted}; margin-bottom: 6px;`;
const LibCardDesc = styled.div`font-size: 13px; color: ${C.text};`;

const DiffBadge = styled.span`
    font-size: 11px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 4px;
    background: ${({ diff }) =>
        diff === 'Beginner' ? '#1a6b3a' :
        diff === 'Advanced' ? '#6b3a1a' : '#1a3a6b'};
    color: ${({ diff }) =>
        diff === 'Beginner' ? '#5CC05C' :
        diff === 'Advanced' ? '#ED8B00' : '#009CDE'};
    margin-left: 8px;
`;

const SourceToggle = styled.div`
    display: flex;
    border: 1px solid ${C.border};
    border-radius: 6px;
    overflow: hidden;
    margin-bottom: 18px;
`;

const SourceBtn = styled.button`
    flex: 1;
    padding: 7px 12px;
    border: none;
    background: ${({ active }) => active ? C.blue : 'transparent'};
    color: ${({ active }) => active ? '#fff' : C.muted};
    font-size: 13px;
    font-weight: ${({ active }) => active ? 700 : 400};
    cursor: pointer;
    transition: background 0.15s;
    &:hover { background: ${({ active }) => active ? C.blue : C.blue + '22'}; color: #fff; }
`;

// ── Main component ─────────────────────────────────────────────────────────────

export default function EditorPage() {
    const [questions, setQuestions] = useState([]);
    const [activeIdx, setActiveIdx] = useState(null);
    const [saving, setSaving] = useState(false);
    const [savingOne, setSavingOne] = useState(false);
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);

    // Quiz management
    const [quizzes, setQuizzes] = useState([]);
    const [activeQuizId, setActiveQuizId] = useState(null); // currently editing
    const [liveQuizId, setLiveQuizId] = useState('');       // what participants see
    const [quizLoading, setQuizLoading] = useState(true);
    const [questionLimit, setQuestionLimit] = useState(null); // null = all questions

    const importInputRef = useRef(null);
    const configRef = useRef({});

    // Library modal
    const [showLibrary, setShowLibrary] = useState(false);
    const [librarySource, setLibrarySource] = useState('bundled'); // 'bundled' | 'github'
    const [libraryItems, setLibraryItems] = useState({ bundled: null, github: null });
    const [libraryLoading, setLibraryLoading] = useState(false);
    const [libraryError, setLibraryError] = useState(null);

    // ── Init ────────────────────────────────────────────────────────────────────

    useEffect(() => {
        Promise.all([listQuizzes(), loadConfig()])
            .then(async ([qs, cfg]) => {
                configRef.current = cfg;
                setLiveQuizId(cfg.active_quiz_id || '');

                if (qs.length === 0) {
                    // First install — seed the sample quiz (one question per type)
                    const created = await createQuiz('Sample Quiz');
                    const newId = created._key || created.key;
                    const seeded = SEED_QUESTIONS.map((q, i) => ({ ...q, _key: '', sort_order: i, quiz_id: newId }));
                    await saveAllQuestions(seeded.map((q, i) => ({ ...toKvDoc(q), sort_order: i })), newId);
                    await saveConfig({ ...cfg, active_quiz_id: newId });
                    const freshQuizzes = await listQuizzes();
                    setQuizzes(freshQuizzes);
                    setLiveQuizId(newId);
                    setActiveQuizId(newId);
                    await loadQuestionsForQuiz(newId);
                } else {
                    setQuizzes(qs);
                    const targetId = cfg.active_quiz_id || qs[0]._key;
                    setActiveQuizId(targetId);
                    const targetQuiz = qs.find((q) => q._key === targetId);
                    setQuestionLimit(targetQuiz?.question_limit ? Number(targetQuiz.question_limit) : null);
                    await loadQuestionsForQuiz(targetId);
                }
            })
            .catch((e) => setStatus({ error: true, msg: e.message }))
            .finally(() => { setLoading(false); setQuizLoading(false); });
    }, []);

    const loadQuestionsForQuiz = async (quizId) => {
        setLoading(true);
        setActiveIdx(null);
        try {
            const docs = await listQuestions(quizId);
            setQuestions(docs.map(fromKvDoc));
        } catch (e) {
            setStatus({ error: true, msg: e.message });
        } finally {
            setLoading(false);
        }
    };

    // ── Quiz actions ────────────────────────────────────────────────────────────

    const handleQuizSwitch = async (quizId) => {
        setActiveQuizId(quizId);
        const quiz = quizzes.find((q) => q._key === quizId);
        setQuestionLimit(quiz?.question_limit ? Number(quiz.question_limit) : null);
        await loadQuestionsForQuiz(quizId);
    };

    const handleNewQuiz = async () => {
        const name = window.prompt('New quiz name:', 'Untitled Quiz');
        if (!name?.trim()) return;
        try {
            const created = await createQuiz(name.trim());
            const newId = created._key || created.key;
            const freshQuizzes = await listQuizzes();
            setQuizzes(freshQuizzes);
            setActiveQuizId(newId);
            setQuestions([]);
            setActiveIdx(null);
            setStatus({ error: false, msg: `Quiz "${name.trim()}" created.` });
        } catch (e) {
            setStatus({ error: true, msg: e.message });
        }
    };

    const handleRenameQuiz = async () => {
        if (!activeQuizId) return;
        const currentQuiz = quizzes.find((q) => q._key === activeQuizId);
        const current = currentQuiz?.name || '';
        const name = window.prompt('Rename quiz:', current);
        if (!name?.trim() || name.trim() === current) return;
        try {
            await updateQuiz(activeQuizId, { ...currentQuiz, name: name.trim() });
            const freshQuizzes = await listQuizzes();
            setQuizzes(freshQuizzes);
            setStatus({ error: false, msg: 'Quiz renamed.' });
        } catch (e) {
            setStatus({ error: true, msg: e.message });
        }
    };

    const handleDeleteQuiz = async () => {
        if (!activeQuizId) return;
        const name = quizzes.find((q) => q._key === activeQuizId)?.name || 'this quiz';
        if (!window.confirm(`Delete "${name}" and all its questions? This cannot be undone.`)) return;
        try {
            await deleteQuiz(activeQuizId);
            const freshQuizzes = await listQuizzes();
            setQuizzes(freshQuizzes);
            const nextId = freshQuizzes[0]?._key || null;
            setActiveQuizId(nextId);
            if (nextId) {
                await loadQuestionsForQuiz(nextId);
            } else {
                setQuestions([]);
                setActiveIdx(null);
            }
            setStatus({ error: false, msg: `Quiz "${name}" deleted.` });
        } catch (e) {
            setStatus({ error: true, msg: e.message });
        }
    };

    const handleActivate = async () => {
        if (!activeQuizId) return;
        try {
            await saveConfig({ ...configRef.current, active_quiz_id: activeQuizId });
            configRef.current = { ...configRef.current, active_quiz_id: activeQuizId };
            setLiveQuizId(activeQuizId);
            const name = quizzes.find((q) => q._key === activeQuizId)?.name || 'Quiz';
            setStatus({ error: false, msg: `"${name}" is now active — participants will see this quiz.` });
        } catch (e) {
            setStatus({ error: true, msg: `Activate failed: ${e.message}` });
        }
    };

    const handleLimitChange = async (newLimit) => {
        setQuestionLimit(newLimit);
        const currentQuiz = quizzes.find((q) => q._key === activeQuizId);
        if (!currentQuiz) return;
        try {
            await updateQuiz(activeQuizId, { ...currentQuiz, question_limit: newLimit || null });
            const freshQuizzes = await listQuizzes();
            setQuizzes(freshQuizzes);
            setStatus({
                error: false,
                msg: newLimit
                    ? `Quiz will play ${newLimit} random questions (of ${questions.length} total).`
                    : 'Quiz will play all questions in order.',
            });
        } catch (e) {
            setStatus({ error: true, msg: `Failed to save limit: ${e.message}` });
        }
    };

    // ── Question editing ────────────────────────────────────────────────────────

    const active = activeIdx !== null ? questions[activeIdx] : null;

    const setActive = (field, value) => {
        setQuestions((prev) => {
            const copy = [...prev];
            copy[activeIdx] = { ...copy[activeIdx], [field]: value };
            return copy;
        });
    };

    const handleTypeChange = (type) => {
        setActive('type', type);
        setActive('options', defaultOptions(type));
    };

    const handleOptionText = (optIdx, text) => {
        const opts = [...active.options];
        opts[optIdx] = { ...opts[optIdx], text };
        setActive('options', opts);
    };

    const handleOptionCorrect = (optIdx) => {
        const isSingle = active.type === 'single' || active.type === 'yesno';
        const opts = active.options.map((o, i) => ({
            ...o,
            correct: isSingle ? i === optIdx : (i === optIdx ? !o.correct : o.correct),
        }));
        setActive('options', opts);
    };

    const addOption = () => {
        if (active.options.length >= 6) return;
        const id = 'ABCDEF'[active.options.length] || String(active.options.length + 1);
        setActive('options', [...active.options, { id, text: '', correct: false }]);
    };

    const removeOption = (optIdx) => {
        if (active.options.length <= 2) return;
        const filtered = active.options.filter((_, i) => i !== optIdx);
        const relabelled = filtered.map((o, i) => ({ ...o, id: 'ABCDEF'[i] || String(i + 1) }));
        setActive('options', relabelled);
    };

    const addQuestion = () => {
        const q = newQuestion({ sort_order: questions.length, quiz_id: activeQuizId });
        setQuestions((prev) => [...prev, q]);
        setActiveIdx(questions.length);
    };

    const deleteActive = async () => {
        if (active === null) return;
        if (!window.confirm('Delete this question?')) return;
        try {
            if (active._key) await deleteQuestion(active._key);
            const next = questions.filter((_, i) => i !== activeIdx);
            setQuestions(next);
            setActiveIdx(next.length > 0 ? Math.min(activeIdx, next.length - 1) : null);
            setStatus({ error: false, msg: 'Question deleted.' });
        } catch (e) {
            setStatus({ error: true, msg: e.message });
        }
    };

    const handleSaveActive = async () => {
        if (!active || !activeQuizId) return;
        setSavingOne(true);
        try {
            const doc = { ...toKvDoc(active), sort_order: activeIdx, quiz_id: activeQuizId };
            const result = await saveQuestion(doc);
            // If this was a new (unsaved) question, store the KV-assigned _key back in state
            if (!active._key && result?._key) {
                setQuestions((prev) => {
                    const copy = [...prev];
                    copy[activeIdx] = { ...copy[activeIdx], _key: result._key };
                    return copy;
                });
            }
            setStatus({ error: false, msg: `Question ${activeIdx + 1} saved.` });
        } catch (e) {
            setStatus({ error: true, msg: e.message });
        } finally {
            setSavingOne(false);
        }
    };

    const saveAll = async () => {
        if (!activeQuizId) return;
        setSaving(true);
        try {
            await saveAllQuestions(
                questions.map((q, i) => ({ ...toKvDoc(q), sort_order: i })),
                activeQuizId
            );
            const docs = await listQuestions(activeQuizId);
            setQuestions(docs.map(fromKvDoc));
            setStatus({ error: false, msg: 'All questions saved.' });
        } catch (e) {
            setStatus({ error: true, msg: e.message });
        } finally {
            setSaving(false);
        }
    };

    const moveUp = () => {
        if (activeIdx <= 0) return;
        const qs = [...questions];
        [qs[activeIdx - 1], qs[activeIdx]] = [qs[activeIdx], qs[activeIdx - 1]];
        setQuestions(qs);
        setActiveIdx(activeIdx - 1);
    };

    const moveDown = () => {
        if (activeIdx >= questions.length - 1) return;
        const qs = [...questions];
        [qs[activeIdx], qs[activeIdx + 1]] = [qs[activeIdx + 1], qs[activeIdx]];
        setQuestions(qs);
        setActiveIdx(activeIdx + 1);
    };

    // ── Export ──────────────────────────────────────────────────────────────────

    const handleExport = () => {
        const quizName = quizzes.find((q) => q._key === activeQuizId)?.name || 'Quiz';
        const exportable = questions.map(({ _key, sort_order, quiz_id, ...rest }) => rest);
        const payload = {
            quiz_name: quizName,
            exported_at: new Date().toISOString(),
            questions: exportable,
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${quizName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ── Import ──────────────────────────────────────────────────────────────────

    /** Pick a name that doesn't clash with any existing quiz, appending a number if needed. */
    const uniqueQuizName = (baseName) => {
        const names = quizzes.map((q) => q.name);
        if (!names.includes(baseName)) return baseName;
        let n = 2;
        while (names.includes(`${baseName} ${n}`)) n++;
        return `${baseName} ${n}`;
    };

    /** Create a new quiz from a question array and name, then switch editor to it. */
    const importAsNewQuiz = async (rawName, rawQuestions) => {
        const valid = rawQuestions.filter((q) => q.text && q.type);
        if (valid.length === 0) throw new Error('No valid questions found (each needs text + type).');
        const name = uniqueQuizName(rawName);
        const created = await createQuiz(name);
        const newId = created._key || created.key;
        const docs = valid.map((q, i) => ({
            ...toKvDoc({ ...newQuestion(), ...q, _key: '', quiz_id: newId }),
            sort_order: i,
            quiz_id: newId,
        }));
        await saveAllQuestions(docs, newId);
        const freshQuizzes = await listQuizzes();
        setQuizzes(freshQuizzes);
        setActiveQuizId(newId);
        await loadQuestionsForQuiz(newId);
        setStatus({ error: false, msg: `Imported ${valid.length} questions as "${name}".` });
    };

    const handleImportFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const parsed = JSON.parse(ev.target.result);
                const qs = Array.isArray(parsed) ? parsed : (parsed.questions || []);
                const baseName = parsed.quiz_name
                    || file.name.replace(/\.json$/i, '').replace(/_/g, ' ');
                await importAsNewQuiz(baseName, qs);
            } catch (err) {
                setStatus({ error: true, msg: `Import failed: ${err.message}` });
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    // ── Library ─────────────────────────────────────────────────────────────────

    const loadLibrarySource = async (source) => {
        if (libraryItems[source]) return; // already cached
        setLibraryLoading(true);
        setLibraryError(null);
        try {
            const manifest = source === 'github'
                ? await fetchGitHubManifest()
                : await fetchLibraryManifest();
            setLibraryItems((prev) => ({ ...prev, [source]: manifest }));
        } catch (e) {
            setLibraryError(e.message);
        } finally {
            setLibraryLoading(false);
        }
    };

    const openLibrary = (source = 'bundled') => {
        setLibrarySource(source);
        setLibraryError(null);
        setShowLibrary(true);
        loadLibrarySource(source);
    };

    const switchLibrarySource = (source) => {
        setLibrarySource(source);
        setLibraryError(null);
        loadLibrarySource(source);
    };

    const refreshGitHub = () => {
        // Force re-fetch from GitHub by clearing the cache
        setLibraryItems((prev) => ({ ...prev, github: null }));
        setLibraryError(null);
        loadLibrarySource('github');
    };

    const handleLibraryImport = async (item) => {
        setShowLibrary(false);
        try {
            const data = librarySource === 'github'
                ? await fetchGitHubQuiz(item.file)
                : await fetchLibraryQuiz(item.file);
            const qs = Array.isArray(data) ? data : (data.questions || []);
            await importAsNewQuiz(item.name, qs);
        } catch (e) {
            setStatus({ error: true, msg: `Import failed: ${e.message}` });
        }
    };

    // ── Render ──────────────────────────────────────────────────────────────────

    const currentQuizIsLive = activeQuizId && activeQuizId === liveQuizId;

    return (
        <Root>

            {/* Sidebar */}
            <Sidebar>
                <QuizBar>
                    <QuizRow>
                        <QuizSelect
                            value={activeQuizId || ''}
                            onChange={(e) => handleQuizSwitch(e.target.value)}
                            disabled={quizLoading}
                        >
                            {quizzes.map((q) => (
                                <option key={q._key} value={q._key}>
                                    {q._key === liveQuizId ? '▶ ' : ''}{q.name}
                                </option>
                            ))}
                        </QuizSelect>
                    </QuizRow>
                    <QuizRow>
                        {currentQuizIsLive ? (
                            <ActiveBadge style={{ flex: 1, justifyContent: 'center' }}>
                                ● Active — participants see this quiz
                            </ActiveBadge>
                        ) : (
                            <ActivateBtn
                                style={{ flex: 1 }}
                                onClick={handleActivate}
                                disabled={!activeQuizId}
                                title="Make this quiz visible to participants"
                            >
                                ▶ Activate this quiz
                            </ActivateBtn>
                        )}
                    </QuizRow>
                    <QuizRow>
                        <span style={{ fontSize: 11, color: C.muted, whiteSpace: 'nowrap' }}>🎲 Play:</span>
                        <QuizSelect
                            value={questionLimit || ''}
                            onChange={(e) => handleLimitChange(e.target.value ? Number(e.target.value) : null)}
                            disabled={!activeQuizId}
                            title="Randomly pick a subset of questions when the quiz runs"
                        >
                            <option value="">All {questions.length} questions</option>
                            {[3, 5, 6, 8, 10, 12, 15, 20, 25, 30]
                                .filter((n) => n < questions.length)
                                .map((n) => (
                                    <option key={n} value={n}>Random {n} of {questions.length}</option>
                                ))}
                        </QuizSelect>
                    </QuizRow>
                    <QuizRow>
                        <SmallBtn primary onClick={handleNewQuiz}>+ New</SmallBtn>
                        <SmallBtn onClick={handleRenameQuiz} disabled={!activeQuizId}>Rename</SmallBtn>
                        <SmallBtn danger onClick={handleDeleteQuiz} disabled={!activeQuizId || quizzes.length <= 1}>
                            Delete
                        </SmallBtn>
                    </QuizRow>
                </QuizBar>

                <SidebarHeader>
                    Questions ({questions.length})
                    <AddBtn onClick={addQuestion} disabled={!activeQuizId}>+ Add</AddBtn>
                </SidebarHeader>

                <QList>
                    {loading && (
                        <QItem style={{ cursor: 'default', color: C.muted }}>Loading…</QItem>
                    )}
                    {questions.map((q, i) => (
                        <QItem key={i} active={i === activeIdx} onClick={() => setActiveIdx(i)}>
                            <QItemText>{i + 1}. {q.text || <em style={{ color: C.muted }}>Untitled</em>}</QItemText>
                            <QItemType>
                                {QUESTION_TYPES.find((t) => t.value === q.type)?.label || q.type}
                                {' · '}⏱ {q.timeLimit}s
                            </QItemType>
                        </QItem>
                    ))}
                </QList>
            </Sidebar>

            {/* Main editor */}
            <Main>
                <Toolbar>
                    <ToolbarTitle>
                        {active ? `Editing Q${activeIdx + 1}` : 'Question Editor'}
                    </ToolbarTitle>
                    <TBtn onClick={moveUp} disabled={activeIdx === null || activeIdx === 0}>↑ Up</TBtn>
                    <TBtn onClick={moveDown} disabled={activeIdx === null || activeIdx >= questions.length - 1}>↓ Down</TBtn>
                    <TBtn danger onClick={deleteActive} disabled={active === null}>Delete</TBtn>
                    <TBtn
                        primary
                        onClick={handleSaveActive}
                        disabled={active === null || savingOne}
                        title="Save this question only"
                    >
                        {savingOne ? 'Saving…' : '💾 Save'}
                    </TBtn>
                    <TBtn onClick={handleExport} disabled={questions.length === 0} title="Download questions as JSON">
                        ⬇ Export
                    </TBtn>
                    <input
                        ref={importInputRef}
                        type="file"
                        accept=".json,application/json"
                        style={{ display: 'none' }}
                        onChange={handleImportFile}
                    />
                    <TBtn onClick={() => importInputRef.current.click()} disabled={!activeQuizId}>
                        ⬆ Import
                    </TBtn>
                    <TBtn onClick={() => openLibrary('bundled')} disabled={!activeQuizId} title="Import a pre-built quiz bundled with the app">
                        📚 Library
                    </TBtn>
                    <TBtn onClick={() => openLibrary('github')} disabled={!activeQuizId} title="Sync and import quizzes directly from GitHub">
                        🔄 GitHub
                    </TBtn>
                    <TBtn onClick={saveAll} disabled={saving || !activeQuizId} title="Save all questions in this quiz (reorders and persists every question)">
                        {saving ? 'Saving…' : '💾 Save All'}
                    </TBtn>
                </Toolbar>

                {active === null ? (
                    <EmptyState>
                        <div>← Select a question or click <strong>+ Add</strong></div>
                    </EmptyState>
                ) : (
                    <EditorArea>
                        {/* Question text */}
                        <div>
                            <Label>Question text</Label>
                            <Textarea
                                value={active.text}
                                onChange={(e) => setActive('text', e.target.value)}
                                placeholder="Type your question…"
                            />
                        </div>

                        {/* Type + time */}
                        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                            <div style={{ flex: 2, minWidth: 220 }}>
                                <Label>Question type</Label>
                                <TypeToggle>
                                    {QUESTION_TYPES.map((t) => (
                                        <TypeBtn
                                            key={t.value}
                                            active={active.type === t.value}
                                            onClick={() => handleTypeChange(t.value)}
                                        >
                                            {t.label}
                                        </TypeBtn>
                                    ))}
                                </TypeToggle>
                            </div>
                            <div style={{ flex: 1, minWidth: 120 }}>
                                <Label>Time limit (seconds)</Label>
                                <Select
                                    value={active.timeLimit}
                                    onChange={(e) => setActive('timeLimit', Number(e.target.value))}
                                >
                                    {[10, 15, 20, 25, 30, 45, 60, 90, 120].map((s) => (
                                        <option key={s} value={s}>{s}s</option>
                                    ))}
                                </Select>
                            </div>
                        </div>

                        {/* Slider config */}
                        {active.type === 'slider' && (
                            <div>
                                <Label>Slider configuration</Label>
                                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                                    {[['Min', 'sliderMin', 1], ['Max', 'sliderMax', 10], ['Step', 'sliderStep', 1]].map(([lbl, fld, def]) => (
                                        <div key={fld} style={{ flex: 1, minWidth: 80 }}>
                                            <Label>{lbl}</Label>
                                            <Input
                                                type="number"
                                                value={active[fld] ?? def}
                                                onChange={(e) => setActive(fld, Number(e.target.value))}
                                            />
                                        </div>
                                    ))}
                                    <div style={{ flex: 1, minWidth: 80 }}>
                                        <Label>Unit label</Label>
                                        <Input
                                            value={active.sliderUnit ?? ''}
                                            placeholder="e.g. /10 or ★"
                                            onChange={(e) => setActive('sliderUnit', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <Label>Preview</Label>
                                <SliderTrack>
                                    <span style={{ fontSize: 12, color: C.muted }}>{active.sliderMin ?? 1}</span>
                                    <SliderInput
                                        type="range"
                                        min={active.sliderMin ?? 1}
                                        max={active.sliderMax ?? 10}
                                        step={active.sliderStep ?? 1}
                                        defaultValue={Math.round(((active.sliderMin ?? 1) + (active.sliderMax ?? 10)) / 2)}
                                        readOnly
                                    />
                                    <span style={{ fontSize: 12, color: C.muted }}>{active.sliderMax ?? 10}</span>
                                </SliderTrack>
                                <div style={{ marginTop: 10, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', color: C.muted, fontSize: 13 }}>
                                    Slider questions collect a numeric value — no correct answer.
                                </div>
                            </div>
                        )}

                        {/* Answer options */}
                        {(active.type === 'single' || active.type === 'multi' || active.type === 'yesno') && (
                            <div>
                                <Label>
                                    Answers
                                    {active.type !== 'yesno' && (
                                        <span style={{ marginLeft: 8, fontWeight: 400, textTransform: 'none', fontSize: 11, color: C.muted }}>
                                            — tick ✓ to mark correct answer(s)
                                        </span>
                                    )}
                                </Label>
                                {active.options.map((opt, i) => (
                                    <OptionRow key={opt.id} style={{ marginBottom: 8 }}>
                                        <OptionBadge color={OPTION_COLORS[i] || '#666'}>{opt.id}</OptionBadge>
                                        <Input
                                            value={opt.text}
                                            onChange={(e) => handleOptionText(i, e.target.value)}
                                            placeholder={`Option ${opt.id}`}
                                            readOnly={active.type === 'yesno'}
                                            style={active.type === 'yesno' ? { opacity: 0.6 } : {}}
                                        />
                                        <CheckBtn
                                            correct={opt.correct}
                                            onClick={() => handleOptionCorrect(i)}
                                            title={opt.correct ? 'Marked correct' : 'Mark as correct'}
                                        >
                                            {opt.correct ? '✓' : '○'}
                                        </CheckBtn>
                                        {(active.type === 'single' || active.type === 'multi') && (
                                            <button
                                                onClick={() => removeOption(i)}
                                                disabled={active.options.length <= 2}
                                                title={active.options.length <= 2 ? 'Minimum 2 options' : 'Remove option'}
                                                style={{
                                                    background: 'none', border: 'none', cursor: active.options.length <= 2 ? 'default' : 'pointer',
                                                    color: active.options.length <= 2 ? C.border : C.muted,
                                                    fontSize: 16, padding: '0 2px', lineHeight: 1, flexShrink: 0,
                                                }}
                                            >✕</button>
                                        )}
                                    </OptionRow>
                                ))}
                                {(active.type === 'single' || active.type === 'multi') && active.options.length < 6 && (
                                    <button
                                        onClick={addOption}
                                        style={{
                                            marginTop: 4, background: C.surface2,
                                            border: `1px dashed ${C.border}`, borderRadius: 5,
                                            color: C.muted, fontSize: 12, padding: '5px 14px',
                                            cursor: 'pointer',
                                        }}
                                    >+ Add option</button>
                                )}
                            </div>
                        )}

                        {/* Per-question save — visible inline so users don't miss it */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '14px 0 0',
                            borderTop: `1px solid ${C.border}`,
                        }}>
                            <TBtn
                                primary
                                onClick={handleSaveActive}
                                disabled={savingOne}
                                style={{ minWidth: 140 }}
                            >
                                {savingOne ? 'Saving…' : '💾 Save Question'}
                            </TBtn>
                            <span style={{ fontSize: 12, color: C.muted }}>
                                Saves only this question · Use <strong>Save All</strong> to reorder or bulk-save
                            </span>
                        </div>

                        {active.type === 'freetext' && (
                            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 16px' }}>
                                <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
                                    Accepted answers <span style={{ fontWeight: 400 }}>— leave empty for open-ended (any text gets participation points)</span>
                                </div>
                                {(active.options || []).map((opt, oi) => (
                                    <div key={opt.id} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                                        <input
                                            style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 5, color: C.text, fontSize: 13, padding: '5px 10px' }}
                                            value={opt.text}
                                            placeholder={`Accepted answer ${oi + 1}`}
                                            onChange={(e) => {
                                                const opts = active.options.map((o, i) => i === oi ? { ...o, text: e.target.value } : o);
                                                setActive({ ...active, options: opts });
                                            }}
                                        />
                                        <button
                                            onClick={() => setActive({ ...active, options: active.options.filter((_, i) => i !== oi) })}
                                            style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 16, padding: '0 4px' }}
                                            title="Remove"
                                        >✕</button>
                                    </div>
                                ))}
                                <button
                                    onClick={() => {
                                        const next = String.fromCharCode(65 + (active.options || []).length);
                                        setActive({ ...active, options: [...(active.options || []), { id: next, text: '', correct: true }] });
                                    }}
                                    style={{ background: C.surface2, border: `1px dashed ${C.border}`, borderRadius: 5, color: C.muted, fontSize: 12, padding: '5px 12px', cursor: 'pointer', marginTop: 2 }}
                                >+ Add accepted answer</button>
                                <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>
                                    Matching is case-insensitive. Participant sees all accepted answers on reveal.
                                </div>
                            </div>
                        )}
                    </EditorArea>
                )}

                {status && (
                    <StatusBar error={status.error}>
                        {status.error ? '✗' : '✓'} {status.msg}
                    </StatusBar>
                )}
            </Main>

            {/* Library modal */}
            {showLibrary && (
                <ModalOverlay onClick={() => setShowLibrary(false)}>
                    <ModalBox onClick={(e) => e.stopPropagation()}>
                        <ModalTitle>📚 Quiz Library</ModalTitle>
                        <ModalSub>
                            Click Import next to any quiz to load it into the current quiz (Replace or Append).
                        </ModalSub>

                        {/* Source toggle */}
                        <SourceToggle>
                            <SourceBtn
                                active={librarySource === 'bundled'}
                                onClick={() => switchLibrarySource('bundled')}
                            >
                                📦 Bundled with app
                            </SourceBtn>
                            <SourceBtn
                                active={librarySource === 'github'}
                                onClick={() => switchLibrarySource('github')}
                            >
                                🔄 Live from GitHub
                            </SourceBtn>
                        </SourceToggle>

                        {librarySource === 'github' && (
                            <div style={{ fontSize: 12, color: C.muted, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span>Fetching from <code style={{ color: C.blue }}>github.com/bautt/ponypollApp</code> — requires internet access.</span>
                                <SmallBtn onClick={refreshGitHub} disabled={libraryLoading} style={{ flexShrink: 0 }}>↺ Refresh</SmallBtn>
                            </div>
                        )}

                        {libraryLoading && (
                            <div style={{ color: C.muted, fontSize: 14, padding: '12px 0' }}>
                                {librarySource === 'github' ? '🔄 Fetching from GitHub…' : 'Loading library…'}
                            </div>
                        )}
                        {libraryError && (
                            <div style={{ color: C.red, fontSize: 14, padding: '8px 0' }}>✗ {libraryError}</div>
                        )}
                        {!libraryLoading && !libraryError && (libraryItems[librarySource] || []).map((item) => (
                            <LibCard key={item.id}>
                                <LibCardBody>
                                    <LibCardName>
                                        {item.name}
                                        <DiffBadge diff={item.difficulty}>{item.difficulty}</DiffBadge>
                                    </LibCardName>
                                    <LibCardMeta>{item.questionCount} questions</LibCardMeta>
                                    <LibCardDesc>{item.description}</LibCardDesc>
                                </LibCardBody>
                                <TBtn
                                    primary
                                    onClick={() => handleLibraryImport(item)}
                                    style={{ flexShrink: 0, alignSelf: 'center' }}
                                >
                                    Import
                                </TBtn>
                            </LibCard>
                        ))}

                        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                            <TBtn onClick={() => setShowLibrary(false)}>Close</TBtn>
                        </div>
                    </ModalBox>
                </ModalOverlay>
            )}
        </Root>
    );
}
