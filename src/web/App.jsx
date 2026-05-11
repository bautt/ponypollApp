import React, { useState, useEffect, Component } from 'react';
import styled from 'styled-components';
import { C } from './lib/theme';
import PollPage from './pages/PollPage';
import AdminPage from './pages/AdminPage';
import SyncPollPage from './pages/SyncPollPage';
import EditorPage from './pages/EditorPage';
import SettingsPage from './pages/SettingsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import { listQuizzes, createQuiz, saveAllQuestions, loadConfig, saveConfig, getSession } from './lib/kvstore';
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
    border-bottom: 3px solid ${({ $active }) => ($active ? C.blue : 'transparent')};
    background: transparent;
    color: ${({ $active }) => ($active ? '#fff' : C.muted)};
    font-size: 14px;
    font-weight: ${({ $active }) => ($active ? '700' : '500')};
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

/* Projector icon — body + lens + beam + stand */
const ProjectorIcon = () => (
    <svg viewBox="0 0 16 16" width="15" height="15"
        style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 5, marginBottom: 1 }}
        fill="currentColor" aria-hidden="true">
        {/* projector body */}
        <rect x="1" y="4" width="10" height="6" rx="1.2" />
        {/* lens circle cutout (white) */}
        <circle cx="8.5" cy="7" r="1.8" fill="none" stroke="currentColor" strokeWidth="1.2" />
        {/* small indicator dot */}
        <circle cx="3" cy="6" r="0.7" />
        {/* beam lines to screen */}
        <line x1="11" y1="5.2" x2="15" y2="3"   stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" />
        <line x1="11" y1="8.8" x2="15" y2="11"  stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" />
        {/* stand */}
        <line x1="5.5" y1="10" x2="5.5" y2="13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="3.5" y1="13" x2="7.5" y2="13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
);

const TABS = [
    { id: 'poll',      label: '▶ Poll' },
    { id: 'host',      label: <><ProjectorIcon />Admin</> },
    { id: 'analytics', label: <><BarChartIcon />Analytics</> },
    { id: 'editor',    label: '✏ Editor' },
    { id: 'settings',  label: '⚙ Settings' },
];

const VALID_TAB_IDS = new Set(TABS.map((t) => t.id));

/** Read the active tab id from the URL hash, falling back to a default. */
function tabFromHash(fallback = 'poll') {
    const hash = window.location.hash.replace('#', '');
    return VALID_TAB_IDS.has(hash) ? hash : fallback;
}

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

/**
 * Play mode: participant-only view, no nav, no admin tabs.
 * Polls the session document every 4 s so switching between self-paced and
 * synchronized mode (in either direction) is detected without a page reload.
 */
function PlayApp() {
    useSeedOnFirstInstall();
    const [syncActive, setSyncActive] = useState(null); // null = initial check pending
    const adminUrl = window.location.href.replace(/\/play(\?.*)?$/, '/poll?admin');

    useEffect(() => {
        let mounted = true;
        const check = () => {
            getSession()
                .then((sess) => {
                    if (!mounted) return;
                    setSyncActive(!!(sess && sess.phase && sess.phase !== 'idle'));
                })
                .catch(() => mounted && setSyncActive(false));
        };
        check();
        const id = setInterval(check, 4000);
        return () => { mounted = false; clearInterval(id); };
    }, []);

    // Hold render until first check resolves (avoids flash)
    if (syncActive === null) return null;

    return (
        <>
            {syncActive ? <SyncPollPage /> : <PollPage />}
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

/** Full app: admin view with all tabs including dedicated Host tab. */
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

    const [tab, setTab] = useState(() => tabFromHash('poll'));

    // Keep state in sync with browser back/forward navigation.
    useEffect(() => {
        const onHashChange = () => setTab(tabFromHash('poll'));
        window.addEventListener('hashchange', onHashChange);
        return () => window.removeEventListener('hashchange', onHashChange);
    }, []);

    const switchTab = (id) => {
        window.location.hash = id;
        setTab(id);
    };

    return (
        <>
            <NavBar>
                {TABS.map((t) => (
                    <NavTab key={t.id} $active={tab === t.id} onClick={() => switchTab(t.id)}>
                        {t.label}
                    </NavTab>
                ))}
            </NavBar>

            {tab === 'poll'      && <ErrorBoundary compact label="Poll"><PollPage /></ErrorBoundary>}
            {tab === 'host'      && <ErrorBoundary compact label="Host"><AdminPage /></ErrorBoundary>}
            {tab === 'analytics' && <ErrorBoundary compact label="Analytics"><AnalyticsPage /></ErrorBoundary>}
            {tab === 'editor'    && <ErrorBoundary compact label="Editor"><EditorPage /></ErrorBoundary>}
            {tab === 'settings'  && <ErrorBoundary compact label="Settings"><SettingsPage /></ErrorBoundary>}
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
