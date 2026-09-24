/**
 * Shared chrome for all three view roots (FullRoot / PlayRoot / ProjectorRoot).
 *
 * View-specific composition (nav, tabs, redirects, page selection) lives in
 * each root under ./roots/; this module exports only the pieces every root
 * needs: the error boundary, the global-style reset scoped to #ponypoll-root,
 * and the first-install quiz seeder.
 */
import React, { useEffect, Component } from 'react';
import { createGlobalStyle } from 'styled-components';
import { listQuizzes, createQuiz, saveAllQuestions, loadConfig, saveConfig, fetchLibraryQuiz } from './lib/kvstore';
import { SEED_QUESTIONS, toKvDoc, newQuestion } from './lib/questions';

export class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }
    static getDerivedStateFromError(err) {
        return { error: err };
    }
    render() {
        if (this.state.error) {
            const err  = this.state.error;
            const reset = () => this.setState({ error: null });

            // Compact variant: shown inside a tab so the nav stays visible
            if (this.props.compact) {
                return (
                    <div style={{
                        margin: 32, padding: 24,
                        background: '#2a1010', border: '1px solid #DC4E41',
                        borderRadius: 10, color: '#DC4E41', fontFamily: 'monospace',
                    }}>
                        <strong>⚠ {this.props.label || 'Tab'} error</strong>
                        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#FF8C8C', fontSize: 12, margin: '10px 0' }}>
                            {err.message}
                        </pre>
                        <button
                            onClick={reset}
                            style={{ padding: '6px 16px', background: '#009CDE', border: 'none', borderRadius: 5, color: '#fff', cursor: 'pointer', fontSize: 13 }}
                        >
                            Retry
                        </button>
                    </div>
                );
            }

            // Full-page variant: shown when the entire app fails to render
            return (
                <div style={{
                    padding: 32, background: '#1B1D22', color: '#DC4E41',
                    fontFamily: 'monospace', minHeight: '100vh',
                }}>
                    <h2 style={{ margin: '0 0 12px' }}>⚠ Runtime Error (please report)</h2>
                    <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#FF8C8C', fontSize: 13 }}>
                        {err.message}
                    </pre>
                    <button
                        onClick={reset}
                        style={{ marginTop: 16, padding: '8px 20px', background: '#009CDE', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 14 }}
                    >
                        Reload component
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

// Belt-and-braces guard against a child component ever pushing the page
// sideways on mobile (Splunk Web ships its own viewport meta but we can't
// control the chrome — see the iPhone bug fixed in v1.3.49). The
// box-sizing reset (added v1.3.51) is the real fix: several styled
// components combine `width: 100%` with `padding` and would compute to
// `100vw + 2 * padding` without it, causing the right-edge clipping that
// pre-1.3.51 mobile screenshots showed even after the overflow guard.
export const GlobalStyle = createGlobalStyle`
    #ponypoll-root,
    #ponypoll-root *,
    #ponypoll-root *::before,
    #ponypoll-root *::after {
        box-sizing: border-box;
    }
    #ponypoll-root {
        max-width: 100vw;
        overflow-x: hidden;
    }
`;

/**
 * Seed default quiz on first install (runs once, app-wide).
 *
 * Tries to seed "Splunk Basics" from the bundled quiz library so admins
 * land on a usable Splunk-themed quiz immediately. Falls back to the
 * inline SEED_QUESTIONS if the bundled file is missing or unreachable
 * (e.g. partial install, custom static-asset stripping).
 */
export function useSeedOnFirstInstall() {
    useEffect(() => {
        (async () => {
            try {
                const [quizzes, cfg] = await Promise.all([listQuizzes(), loadConfig()]);
                if (quizzes.length > 0) return;

                let quizName = 'Sample Quiz';
                let rawQuestions = SEED_QUESTIONS;
                try {
                    const data = await fetchLibraryQuiz('splunk-basics.json');
                    if (data && Array.isArray(data.questions) && data.questions.length > 0) {
                        quizName = data.quiz_name || 'Splunk Basics';
                        rawQuestions = data.questions;
                    }
                } catch (_) {
                    // bundled file unavailable; use inline seed
                }

                const created = await createQuiz(quizName);
                const newId = created._key || created.key;
                const docs = rawQuestions.map((q, i) => ({
                    ...toKvDoc({ ...newQuestion(), ...q, _key: '', quiz_id: newId }),
                    sort_order: i,
                    quiz_id: newId,
                }));
                await saveAllQuestions(docs, newId);
                await saveConfig({ ...cfg, active_quiz_id: newId });
            } catch (_) {
                // silent — seeding is best-effort; Editor will retry if needed
            }
        })();
    }, []);
}
