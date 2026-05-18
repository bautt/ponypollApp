import React, { useState, useEffect, useRef } from 'react';

const IconBook = () => (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor"
        strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
        style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 5, flexShrink: 0 }}>
        <path d="M2 2h5a1 1 0 0 1 1 1v11a1 1 0 0 0-1-1H2V2Z"/>
        <path d="M14 2H9a1 1 0 0 0-1 1v11a1 1 0 0 1 1-1h5V2Z"/>
    </svg>
);
const IconSync = () => (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor"
        strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
        style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 5, flexShrink: 0 }}>
        <path d="M13 3.5A6 6 0 1 0 14 8"/>
        <polyline points="11,1 14,3.5 11,6"/>
    </svg>
);
const IconPlay = () => (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"
        style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 5, flexShrink: 0 }}>
        <path d="M4 2.8v10.4c0 .7.8 1.1 1.4.7l7.7-5.2a.85.85 0 0 0 0-1.4L5.4 2.1C4.8 1.7 4 2.1 4 2.8Z"/>
    </svg>
);
import {
    listQuestions, deleteQuestion, saveAllQuestions, saveQuestion,
    listQuizzes, createQuiz, deleteQuiz, updateQuiz, duplicateQuiz,
    loadConfig, saveConfig,
    fetchLibraryManifest, fetchLibraryQuiz,
    fetchGitHubManifest, fetchGitHubQuiz,
} from '../../lib/kvstore';
import { fromKvDoc, toKvDoc, newQuestion, defaultOptions } from '../../lib/questions';
import { uid } from '../../lib/utils';
import QuizSidebar from './QuizSidebar';
import QuestionEditor from './QuestionEditor';
import LibraryModal from './LibraryModal';
import { Root, Main, Toolbar, ToolbarTitle, TBtn, EmptyState, StatusBar } from './styles';

// ── Image compression helper ──────────────────────────────────────────────────
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SOURCE_BYTES = 1024 * 1024;
const MAX_STORED_BYTES = 400 * 1024;
const MAX_PX = 1200;

function compressImage(file) {
    if (file.size > MAX_SOURCE_BYTES) {
        return Promise.reject(new Error('Image must be under 1 MB. Try a screenshot or smaller export.'));
    }
    if (!ALLOWED_MIME.includes(file.type)) {
        return Promise.reject(new Error('Only JPEG, PNG, GIF, and WebP images are supported.'));
    }
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Failed to read file.'));
        reader.onload = (ev) => {
            const img = new Image();
            img.onerror = () => reject(new Error('Failed to decode image.'));
            img.onload = () => {
                const scale = Math.min(1, MAX_PX / Math.max(img.width, img.height));
                const w = Math.round(img.width * scale);
                const h = Math.round(img.height * scale);
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                const attempt = (quality) => {
                    canvas.toBlob((blob) => {
                        if (!blob) { reject(new Error('Canvas export failed.')); return; }
                        if (blob.size <= MAX_STORED_BYTES || quality < 0.35) {
                            if (blob.size > MAX_STORED_BYTES) {
                                reject(new Error('Image is too complex to compress. Try a simpler screenshot.'));
                                return;
                            }
                            const r2 = new FileReader();
                            r2.onload = (e2) => resolve(e2.target.result);
                            r2.readAsDataURL(blob);
                        } else {
                            attempt(quality - 0.17);
                        }
                    }, 'image/jpeg', quality);
                };
                attempt(0.82);
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function EditorPage() {
    const [questions, setQuestions] = useState([]);
    const [activeIdx, setActiveIdx] = useState(null);
    const [savingOne, setSavingOne] = useState(false);
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);

    const [quizzes, setQuizzes] = useState([]);
    const [activeQuizId, setActiveQuizId] = useState(null);
    const [liveQuizId, setLiveQuizId] = useState('');
    const [quizLoading, setQuizLoading] = useState(true);
    const [activatingQuiz, setActivatingQuiz] = useState(false);

    const importInputRef = useRef(null);
    const imageInputRef = useRef(null);
    const configRef = useRef({});
    const [imageError, setImageError] = useState(null);
    const [imageUploading, setImageUploading] = useState(false);

    useEffect(() => { setImageError(null); }, [activeIdx]);

    const [showLibrary, setShowLibrary] = useState(false);
    const [librarySource, setLibrarySource] = useState('bundled');
    const [libraryItems, setLibraryItems] = useState({ bundled: null, github: null });
    const [libraryLoading, setLibraryLoading] = useState(false);
    const [libraryError, setLibraryError] = useState(null);

    // ── Init ──────────────────────────────────────────────────────────────────
    // Seeding the sample quiz on first install is owned by App.useSeedOnFirstInstall.
    // If we land here before that seed finishes, wait briefly and re-fetch once.
    useEffect(() => {
        let cancelled = false;
        const init = async () => {
            try {
                let [qs, cfg] = await Promise.all([listQuizzes(), loadConfig()]);
                if (qs.length === 0) {
                    await new Promise((r) => setTimeout(r, 800));
                    if (cancelled) return;
                    qs = await listQuizzes();
                    cfg = await loadConfig();
                }
                if (cancelled) return;
                configRef.current = cfg;
                setLiveQuizId(cfg.active_quiz_id || '');
                setQuizzes(qs);
                if (qs.length > 0) {
                    const targetId = cfg.active_quiz_id || qs[0]._key;
                    setActiveQuizId(targetId);
                    await loadQuestionsForQuiz(targetId);
                }
            } catch (e) {
                if (!cancelled) setStatus({ error: true, msg: e.message });
            } finally {
                if (!cancelled) { setLoading(false); setQuizLoading(false); }
            }
        };
        init();
        return () => { cancelled = true; };
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

    // ── Quiz actions ──────────────────────────────────────────────────────────
    const handleQuizSwitch = async (quizId) => {
        setActiveQuizId(quizId);
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
            if (nextId) { await loadQuestionsForQuiz(nextId); }
            else { setQuestions([]); setActiveIdx(null); }
            setStatus({ error: false, msg: `Quiz "${name}" deleted.` });
        } catch (e) {
            setStatus({ error: true, msg: e.message });
        }
    };

    const handleDuplicateQuiz = async () => {
        if (!activeQuizId) return;
        const sourceName = quizzes.find((q) => q._key === activeQuizId)?.name || 'Quiz';
        const name = window.prompt('Name for the copy:', `Copy of ${sourceName}`);
        if (!name?.trim()) return;
        setQuizLoading(true);
        try {
            const newId = await duplicateQuiz(activeQuizId, name.trim());
            const freshQuizzes = await listQuizzes();
            setQuizzes(freshQuizzes);
            setActiveQuizId(newId);
            await loadQuestionsForQuiz(newId);
            setStatus({ error: false, msg: `Quiz duplicated as "${name.trim()}".` });
        } catch (e) {
            setStatus({ error: true, msg: e.message });
        } finally {
            setQuizLoading(false);
        }
    };

    const handleActivateQuiz = async () => {
        if (!activeQuizId) return;
        if (questions.length === 0) {
            setStatus({ error: true, msg: 'Cannot activate an empty quiz. Add at least one question first.' });
            return;
        }
        setActivatingQuiz(true);
        try {
            const cfg = await loadConfig();
            const nextCfg = { ...cfg, active_quiz_id: activeQuizId };
            await saveConfig(nextCfg);
            configRef.current = nextCfg;
            setLiveQuizId(activeQuizId);
            const name = quizzes.find((q) => q._key === activeQuizId)?.name || 'This quiz';
            setStatus({ error: false, msg: `"${name}" is now active for participants.` });
        } catch (e) {
            setStatus({ error: true, msg: `Activate failed: ${e.message}` });
        } finally {
            setActivatingQuiz(false);
        }
    };

    // ── Question editing ──────────────────────────────────────────────────────
    const active = activeIdx !== null ? questions[activeIdx] : null;

    const setActiveField = (field, value) => {
        setQuestions((prev) => {
            const copy = [...prev];
            copy[activeIdx] = { ...copy[activeIdx], [field]: value };
            return copy;
        });
    };

    const handleTypeChange = (type) => {
        setActiveField('type', type);
        setActiveField('options', defaultOptions(type));
        if (type === 'wordcloud') {
            setActiveField('wordcloudMaxChars', 32);
            setActiveField('wordcloudMaxWords', 7);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;
        setImageError(null);
        setImageUploading(true);
        try {
            const dataUri = await compressImage(file);
            setActiveField('image', dataUri);
        } catch (err) {
            setImageError(err.message);
        } finally {
            setImageUploading(false);
        }
    };

    const handleOptionText = (optIdx, text) => {
        const opts = [...active.options];
        opts[optIdx] = { ...opts[optIdx], text };
        setActiveField('options', opts);
    };

    const handleOptionCorrect = (optIdx) => {
        const isSingle = active.type === 'single' || active.type === 'yesno';
        const opts = active.options.map((o, i) => ({
            ...o,
            correct: isSingle ? i === optIdx : (i === optIdx ? !o.correct : o.correct),
        }));
        setActiveField('options', opts);
    };

    const addOption = () => {
        if (active.options.length >= 6) return;
        const id = 'ABCDEF'[active.options.length] || String(active.options.length + 1);
        setActiveField('options', [...active.options, { id, text: '', correct: false }]);
    };

    const removeOption = (optIdx) => {
        if (active.options.length <= 2) return;
        const filtered = active.options.filter((_, i) => i !== optIdx);
        const relabelled = filtered.map((o, i) => ({ ...o, id: 'ABCDEF'[i] || String(i + 1) }));
        setActiveField('options', relabelled);
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

    const saveOrder = async (qs) => {
        try {
            await saveAllQuestions(qs.map((q, i) => ({ ...toKvDoc(q), sort_order: i })), activeQuizId);
        } catch (_) {}
    };

    const moveUp = () => {
        if (activeIdx <= 0) return;
        const qs = [...questions];
        [qs[activeIdx - 1], qs[activeIdx]] = [qs[activeIdx], qs[activeIdx - 1]];
        setQuestions(qs);
        setActiveIdx(activeIdx - 1);
        saveOrder(qs);
    };

    const moveDown = () => {
        if (activeIdx >= questions.length - 1) return;
        const qs = [...questions];
        [qs[activeIdx], qs[activeIdx + 1]] = [qs[activeIdx + 1], qs[activeIdx]];
        setQuestions(qs);
        setActiveIdx(activeIdx + 1);
        saveOrder(qs);
    };

    const handleReorder = (fromIdx, toIdx) => {
        const qs = [...questions];
        const [moved] = qs.splice(fromIdx, 1);
        qs.splice(toIdx, 0, moved);
        setQuestions(qs);
        setActiveIdx(activeIdx === fromIdx ? toIdx : activeIdx);
        saveOrder(qs);
    };

    // ── Export / Import ───────────────────────────────────────────────────────
    const handleExport = () => {
        const quizName = quizzes.find((q) => q._key === activeQuizId)?.name || 'Quiz';
        const exportable = questions.map(({ _key, sort_order, quiz_id, ...rest }) => rest);
        const payload = { quiz_name: quizName, exported_at: new Date().toISOString(), questions: exportable };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${quizName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const uniqueQuizName = (baseName) => {
        const names = quizzes.map((q) => q.name);
        if (!names.includes(baseName)) return baseName;
        let n = 2;
        while (names.includes(`${baseName} ${n}`)) n++;
        return `${baseName} ${n}`;
    };

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
                const baseName = parsed.quiz_name || file.name.replace(/\.json$/i, '').replace(/_/g, ' ');
                await importAsNewQuiz(baseName, qs);
            } catch (err) {
                setStatus({ error: true, msg: `Import failed: ${err.message}` });
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    // ── Library ───────────────────────────────────────────────────────────────
    const loadLibrarySource = async (source) => {
        if (libraryItems[source]) return;
        setLibraryLoading(true);
        setLibraryError(null);
        try {
            const manifest = source === 'github' ? await fetchGitHubManifest() : await fetchLibraryManifest();
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
        setLibraryItems((prev) => ({ ...prev, github: null }));
        setLibraryError(null);
        loadLibrarySource('github');
    };

    const handleLibraryImport = async (item) => {
        setShowLibrary(false);
        try {
            const data = librarySource === 'github' ? await fetchGitHubQuiz(item.file) : await fetchLibraryQuiz(item.file);
            const qs = Array.isArray(data) ? data : (data.questions || []);
            await importAsNewQuiz(item.name, qs);
        } catch (e) {
            setStatus({ error: true, msg: `Import failed: ${e.message}` });
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <Root>
            <QuizSidebar
                quizzes={quizzes}
                activeQuizId={activeQuizId}
                liveQuizId={liveQuizId}
                quizLoading={quizLoading}
                onQuizSwitch={handleQuizSwitch}
                onNewQuiz={handleNewQuiz}
                onRenameQuiz={handleRenameQuiz}
                onDuplicateQuiz={handleDuplicateQuiz}
                onDeleteQuiz={handleDeleteQuiz}
                questions={questions}
                activeIdx={activeIdx}
                onSelectQuestion={setActiveIdx}
                onAddQuestion={addQuestion}
                onReorder={handleReorder}
                loading={loading}
            />

            <Main>
                <Toolbar>
                    <ToolbarTitle>
                        {active ? `Editing Q${activeIdx + 1}` : 'Question Editor'}
                    </ToolbarTitle>
                    <TBtn
                        $primary={activeQuizId && activeQuizId !== liveQuizId}
                        onClick={handleActivateQuiz}
                        disabled={!activeQuizId || activeQuizId === liveQuizId || activatingQuiz || questions.length === 0}
                        title={activeQuizId === liveQuizId ? 'This quiz is already active for participants' : 'Make this quiz active for the participant Poll page'}
                    >
                        <IconPlay />{activeQuizId === liveQuizId ? 'Active' : (activatingQuiz ? 'Activating…' : 'Activate')}
                    </TBtn>
                    <TBtn onClick={moveUp} disabled={activeIdx === null || activeIdx === 0} title="Move question up (auto-saved)">↑ Up</TBtn>
                    <TBtn onClick={moveDown} disabled={activeIdx === null || activeIdx >= questions.length - 1} title="Move question down (auto-saved)">↓ Down</TBtn>
                    <TBtn $danger onClick={deleteActive} disabled={active === null}>Delete</TBtn>
                    <TBtn onClick={handleExport} disabled={questions.length === 0} title="Download questions as JSON">⬇ Export</TBtn>
                    <input
                        ref={importInputRef}
                        type="file"
                        accept=".json,application/json"
                        style={{ display: 'none' }}
                        onChange={handleImportFile}
                    />
                    <TBtn onClick={() => importInputRef.current.click()} disabled={!activeQuizId}>⬆ Import</TBtn>
                    <TBtn onClick={() => openLibrary('bundled')} disabled={!activeQuizId} title="Import a pre-built quiz bundled with the app"><IconBook />Library</TBtn>
                    <TBtn onClick={() => openLibrary('github')} disabled={!activeQuizId} title="Sync and import quizzes directly from GitHub"><IconSync />GitHub</TBtn>
                </Toolbar>

                {active === null ? (
                    <EmptyState>
                        <div>← Select a question or click <strong>+ Add</strong></div>
                    </EmptyState>
                ) : (
                    <QuestionEditor
                        active={active}
                        activeIdx={activeIdx}
                        onSetActive={setActiveField}
                        onTypeChange={handleTypeChange}
                        onOptionText={handleOptionText}
                        onOptionCorrect={handleOptionCorrect}
                        onAddOption={addOption}
                        onRemoveOption={removeOption}
                        onImageUpload={handleImageUpload}
                        onRemoveImage={() => { setActiveField('image', ''); setImageError(null); }}
                        onSave={handleSaveActive}
                        imageInputRef={imageInputRef}
                        imageError={imageError}
                        imageUploading={imageUploading}
                        savingOne={savingOne}
                    />
                )}

                {status && (
                    <StatusBar $error={status.error}>
                        {status.error ? '✗' : '✓'} {status.msg}
                    </StatusBar>
                )}
            </Main>

            {showLibrary && (
                <LibraryModal
                    librarySource={librarySource}
                    onSwitchSource={switchLibrarySource}
                    onRefreshGitHub={refreshGitHub}
                    libraryItems={libraryItems}
                    libraryLoading={libraryLoading}
                    libraryError={libraryError}
                    onImport={handleLibraryImport}
                    onClose={() => setShowLibrary(false)}
                />
            )}
        </Root>
    );
}
