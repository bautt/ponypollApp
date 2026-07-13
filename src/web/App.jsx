import React, { useState, useEffect, Component } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { C } from './lib/theme';
import PollPage from './pages/PollPage';
import AdminPage from './pages/AdminPage';
import SyncPollPage from './pages/SyncPollPage';
import EditorPage from './pages/EditorPage';
import SettingsPage from './pages/SettingsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ProjectorPage from './pages/ProjectorPage';
import { listQuizzes, createQuiz, saveAllQuestions, loadConfig, saveConfig, getSession, fetchLibraryQuiz } from './lib/kvstore';
import { SEED_QUESTIONS, toKvDoc, newQuestion } from './lib/questions';
import { getProjectorUrl, getSplunkHomeUrl } from './lib/urls';
import { IconPlay, IconPencil, IconGear, IconProjector, IconBarChart } from './components/icons';

const tabIconStyle = { marginRight: 5, marginBottom: 1 };

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

// Belt-and-braces guard against a child component ever pushing the page
// sideways on mobile (Splunk Web ships its own viewport meta but we can't
// control the chrome — see the iPhone bug fixed in v1.3.49). The
// box-sizing reset (added v1.3.51) is the real fix: several styled
// components combine `width: 100%` with `padding` and would compute to
// `100vw + 2 * padding` without it, causing the right-edge clipping that
// pre-1.3.51 mobile screenshots showed even after the overflow guard.
const GlobalStyle = createGlobalStyle`
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

const NavBar = styled.nav`
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 0 16px;
    background: ${C.surface};
    border-bottom: 1px solid ${C.border};
    /* Defensive fallback: if a future tab is added and the bar runs out of
       room, let the user swipe instead of pushing the viewport sideways. */
    overflow-x: auto;
    overscroll-behavior-x: contain;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }
    @media (max-width: 600px) {
        padding: 0 8px;
    }
`;

// Splunk wordmark — kept deliberately small and dimmed so it reads as a
// quiet "back to Splunk" affordance rather than competing with the Pony
// Poll branding/tabs. Full opacity + slightly larger on hover for discovery.
const NavLogoLink = styled.a`
    display: flex;
    align-items: center;
    height: 44px;
    padding-right: 14px;
    margin-right: 10px;
    border-right: 1px solid ${C.border};
    flex-shrink: 0;
    opacity: 0.55;
    transition: opacity 0.15s;
    &:hover { opacity: 0.9; }
`;

const NavLogoImg = styled.img`
    height: 13px;
    display: block;
`;

// Same visual language as NavTab, but rendered as a plain external link
// (no `$active` state, opens in a new tab) and pushed to the far right so
// it reads as a distinct action rather than another in-app tab.
const NavExternalLink = styled.a`
    display: flex;
    align-items: center;
    padding: 11px 20px;
    margin-left: auto;
    border-bottom: 3px solid transparent;
    color: ${C.muted};
    font-size: 14px;
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
    transition: color 0.15s;
    flex-shrink: 0;
    min-height: 44px;
    touch-action: manipulation;
    &:hover { color: #fff; }
    @media (max-width: 600px) {
        padding: 10px 12px;
        font-size: 13px;
        .nav-label { display: none; }
    }
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
    flex-shrink: 0;
    min-height: 44px;
    touch-action: manipulation;
    &:hover { color: #fff; }
    /* Mobile: drop labels on inactive tabs so all 5 fit on an iPhone.
       The active tab keeps its label for orientation. */
    @media (max-width: 600px) {
        padding: 10px 12px;
        font-size: 13px;
        .nav-label {
            display: ${({ $active }) => ($active ? 'inline' : 'none')};
        }
    }
`;

// Each label wraps its text in a `.nav-label` span so the responsive CSS
// rule on NavTab can hide it on inactive tabs at narrow viewport widths
// without losing the icon (which carries the navigation cue).
const TABS = [
    { id: 'poll',      title: 'Poll',      label: <><IconPlay      style={tabIconStyle} /><span className="nav-label">Poll</span></>      },
    { id: 'host',      title: 'Admin',     label: <><IconProjector style={tabIconStyle} /><span className="nav-label">Admin</span></>     },
    { id: 'analytics', title: 'Analytics', label: <><IconBarChart  style={tabIconStyle} /><span className="nav-label">Analytics</span></> },
    { id: 'editor',    title: 'Editor',    label: <><IconPencil    style={tabIconStyle} /><span className="nav-label">Editor</span></>    },
    { id: 'settings',  title: 'Settings',  label: <><IconGear      style={tabIconStyle} /><span className="nav-label">Settings</span></>  },
];

const VALID_TAB_IDS = new Set(TABS.map((t) => t.id));

/** Read the active tab id from the URL hash, falling back to a default. */
function tabFromHash(fallback = 'poll') {
    const hash = window.location.hash.replace('#', '');
    return VALID_TAB_IDS.has(hash) ? hash : fallback;
}

/**
 * Seed default quiz on first install (runs once, app-wide).
 *
 * Tries to seed "Splunk Basics" from the bundled quiz library so admins
 * land on a usable Splunk-themed quiz immediately. Falls back to the
 * inline SEED_QUESTIONS if the bundled file is missing or unreachable
 * (e.g. partial install, custom static-asset stripping).
 */
function useSeedOnFirstInstall() {
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
            {/* Discreet but always-tappable admin link — hover-only opacity is
                hostile on touch devices that have no hover state. Sized to
                meet the 44×44 touch-target minimum without dominating the UI. */}
            <a
                href={adminUrl}
                title="Open full admin app"
                aria-label="Open full admin app"
                style={{
                    position: 'fixed',
                    bottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
                    right:  'calc(8px + env(safe-area-inset-right, 0px))',
                    minWidth: 44, minHeight: 44,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px 12px',
                    borderRadius: 22,
                    fontSize: 12,
                    color: '#aaa',
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    textDecoration: 'none',
                    zIndex: 9999,
                    touchAction: 'manipulation',
                }}
            >
                ⚙&nbsp;Admin
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
    const [projectorUrl]  = useState(getProjectorUrl);
    const [splunkHomeUrl] = useState(getSplunkHomeUrl);

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
                <NavLogoLink
                    href={splunkHomeUrl}
                    title="Back to Splunk"
                    aria-label="Back to Splunk"
                >
                    <NavLogoImg src="/static/app/ponypollapp/splunk-logo.png" alt="Splunk" />
                </NavLogoLink>
                {TABS.map((t) => (
                    <NavTab
                        key={t.id}
                        $active={tab === t.id}
                        onClick={() => switchTab(t.id)}
                        title={t.title}
                        aria-label={t.title}
                    >
                        {t.label}
                    </NavTab>
                ))}
                <NavExternalLink
                    href={projectorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open projector (wall-screen) view"
                    aria-label="Open projector view"
                >
                    <IconProjector style={tabIconStyle} /><span className="nav-label">Projector</span>
                </NavExternalLink>
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
    const pathEnd = window.location.pathname.replace(/\/$/, '').split('/').pop();
    const isPlay      = window.PONYPOLL_MODE === 'play'      || pathEnd === 'play';
    const isProjector = window.PONYPOLL_MODE === 'projector' || pathEnd === 'projector';
    return (
        <ErrorBoundary>
            <GlobalStyle />
            {isProjector ? <ProjectorPage /> : isPlay ? <PlayApp /> : <FullApp />}
        </ErrorBoundary>
    );
}
