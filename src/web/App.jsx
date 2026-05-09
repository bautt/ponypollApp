import React, { useState, useEffect, Component } from 'react';
import styled from 'styled-components';
import PollPage from './pages/PollPage';
import EditorPage from './pages/EditorPage';
import SettingsPage from './pages/SettingsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import { listQuizzes, createQuiz, saveAllQuestions, loadConfig, saveConfig } from './lib/kvstore';
import { SEED_QUESTIONS, toKvDoc } from './lib/questions';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }
    static getDerivedStateFromError(err) {
        return { error: err };
    }
    render() {
        if (this.state.error) {
            const err = this.state.error;
            return (
                <div style={{
                    padding: 32, background: '#1B1D22', color: '#DC4E41',
                    fontFamily: 'monospace', minHeight: '100vh',
                }}>
                    <h2 style={{ margin: '0 0 12px' }}>⚠ Runtime Error (please report)</h2>
                    <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#FF8C8C', fontSize: 13 }}>
                        {err.message}{'\n\n'}{err.stack}
                    </pre>
                    <button
                        onClick={() => this.setState({ error: null })}
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

const C = {
    surface: '#23262F',
    border: '#3C3F4A',
    text: '#D0D4E3',
    muted: '#868A9C',
    blue: '#009CDE',
    bg: '#1B1D22',
};

const NavBar = styled.nav`
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 0 16px;
    background: ${C.surface};
    border-bottom: 1px solid ${C.border};
`;

const NavTab = styled.button`
    padding: 11px 20px;
    border: none;
    border-bottom: 3px solid ${({ active }) => (active ? C.blue : 'transparent')};
    background: transparent;
    color: ${({ active }) => (active ? '#fff' : C.muted)};
    font-size: 14px;
    font-weight: ${({ active }) => (active ? '700' : '500')};
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
    &:hover { color: #fff; }
`;

const BarChartIcon = () => (
    <svg viewBox="0 0 16 16" width="14" height="14"
        style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 5, marginBottom: 1 }}
        fill="currentColor" aria-hidden="true">
        <rect x="1"  y="7"  width="3" height="8" rx="0.5" />
        <rect x="6"  y="4"  width="3" height="11" rx="0.5" />
        <rect x="11" y="1"  width="3" height="14" rx="0.5" />
    </svg>
);

const TABS = [
    { id: 'poll',      label: '▶ Poll' },
    { id: 'analytics', label: <><BarChartIcon />Analytics</> },
    { id: 'editor',    label: '✏ Editor' },
    { id: 'settings',  label: '⚙ Settings' },
];

/** Seed sample quiz on first install (runs once, app-wide). */
function useSeedOnFirstInstall() {
    useEffect(() => {
        (async () => {
            try {
                const [quizzes, cfg] = await Promise.all([listQuizzes(), loadConfig()]);
                if (quizzes.length > 0) return; // already seeded
                const created = await createQuiz('Sample Quiz');
                const newId = created._key || created.key;
                const docs = SEED_QUESTIONS.map((q, i) => ({ ...toKvDoc(q), sort_order: i, quiz_id: newId }));
                await saveAllQuestions(docs, newId);
                await saveConfig({ ...cfg, active_quiz_id: newId });
            } catch (_) {
                // silent — seeding is best-effort; Editor will retry if needed
            }
        })();
    }, []);
}

/** Play mode: participant-only view, no nav, no admin tabs. */
function PlayApp() {
    useSeedOnFirstInstall();
    const adminUrl = window.location.href
        .replace(/\/play(\?.*)?$/, '/poll?admin');
    return (
        <>
            <PollPage />
            <a
                href={adminUrl}
                title="Open full admin app"
                style={{
                    position: 'fixed', bottom: 12, right: 14,
                    fontSize: 11, color: '#555', opacity: 0.4,
                    textDecoration: 'none', zIndex: 9999,
                    transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.4'}
            >
                ⚙ Admin
            </a>
        </>
    );
}

/** Full app: admin view with all tabs. */
function FullApp() {
    useSeedOnFirstInstall();

    // Redirect to /play if admin set it as the default entry point.
    // Bypass: add ?admin to the URL to always stay on the full app.
    useEffect(() => {
        if (!window.location.pathname.endsWith('/poll')) return;
        if (window.location.search.includes('admin')) return; // explicit bypass
        loadConfig().then((cfg) => {
            if (cfg.default_view === 'play') {
                window.location.replace(
                    window.location.href.replace(/\/poll(\?.*)?$/, '/play')
                );
            }
        }).catch(() => {});
    }, []);

    const [tab, setTab] = useState('poll');
    return (
        <>
            <NavBar>
                {TABS.map((t) => (
                    <NavTab key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
                        {t.label}
                    </NavTab>
                ))}
            </NavBar>

            {tab === 'poll'      && <PollPage />}
            {tab === 'analytics' && <AnalyticsPage />}
            {tab === 'editor'    && <EditorPage />}
            {tab === 'settings'  && <SettingsPage />}
        </>
    );
}

export default function App() {
    const isPlay = window.PONYPOLL_MODE === 'play'
        || window.location.pathname.endsWith('/play');
    return (
        <ErrorBoundary>
            {isPlay ? <PlayApp /> : <FullApp />}
        </ErrorBoundary>
    );
}
