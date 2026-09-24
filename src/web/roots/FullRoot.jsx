/**
 * Full root — admin console with tabbed navigation.
 *
 * Bootstraps the /poll Splunk view. The four admin-only tabs (Admin,
 * Analytics, Editor, Settings) are React.lazy-loaded so participants on
 * /play never download that code. Only the default "Poll" tab is
 * statically imported so the initial render on /poll needs no chunk
 * fetch.
 */
import React, { useState, useEffect, Suspense, lazy } from 'react';
import styled from 'styled-components';
import { ErrorBoundary, GlobalStyle, useSeedOnFirstInstall } from '../App';
import { C } from '../lib/theme';
import PollPage from '../pages/PollPage';
import { loadConfig } from '../lib/kvstore';
import { getProjectorUrl, getSplunkHomeUrl } from '../lib/urls';
import { IconPlay, IconPencil, IconGear, IconProjector, IconBarChart } from '../components/icons';
import { mount } from './mount';

// Admin pages are code-split so /play never pays for them. Each becomes
// its own async chunk, fetched only on first switch to that tab.
const AdminPage     = lazy(() => import('../pages/AdminPage'));
const AnalyticsPage = lazy(() => import('../pages/AnalyticsPage'));
const EditorPage    = lazy(() => import('../pages/EditorPage'));
const SettingsPage  = lazy(() => import('../pages/SettingsPage'));

const tabIconStyle = { marginRight: 5, marginBottom: 1 };

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
// Note: tab id `host` renders "Admin" — the id is preserved because
// existing `#host` bookmarks depend on it.
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

// Suspense fallback for lazy tabs — matches the compact ErrorBoundary
// footprint so the layout doesn't jump when the chunk resolves.
function TabLoading({ label }) {
    return (
        <div style={{
            margin: 32, padding: 24,
            color: C.muted, fontFamily: 'monospace', fontSize: 13,
        }}>
            Loading {label}…
        </div>
    );
}

function FullApp() {
    useSeedOnFirstInstall();

    // Redirect to /play if admin set it as the default entry point.
    // Bypass: add ?admin to the URL to always stay on the full app.
    // Guarded by a proper URLSearchParams .has() rather than substring
    // match, so query params merely *containing* "admin" (e.g.
    // ?adminuser=bob, ?x=badmin) don't accidentally trigger the bypass.
    useEffect(() => {
        const bypass = new URLSearchParams(window.location.search).has('admin');
        if (bypass) return;
        loadConfig().then((cfg) => {
            if (cfg.default_view === 'play') {
                window.location.replace(
                    window.location.href.replace(/\/poll(\?.*)?$/, '/play'),
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

            {tab === 'poll' && (
                <ErrorBoundary compact label="Poll"><PollPage /></ErrorBoundary>
            )}
            {tab === 'host' && (
                <ErrorBoundary compact label="Host">
                    <Suspense fallback={<TabLoading label="Admin" />}>
                        <AdminPage />
                    </Suspense>
                </ErrorBoundary>
            )}
            {tab === 'analytics' && (
                <ErrorBoundary compact label="Analytics">
                    <Suspense fallback={<TabLoading label="Analytics" />}>
                        <AnalyticsPage />
                    </Suspense>
                </ErrorBoundary>
            )}
            {tab === 'editor' && (
                <ErrorBoundary compact label="Editor">
                    <Suspense fallback={<TabLoading label="Editor" />}>
                        <EditorPage />
                    </Suspense>
                </ErrorBoundary>
            )}
            {tab === 'settings' && (
                <ErrorBoundary compact label="Settings">
                    <Suspense fallback={<TabLoading label="Settings" />}>
                        <SettingsPage />
                    </Suspense>
                </ErrorBoundary>
            )}
        </>
    );
}

export default function fullRoot() {
    mount(
        <ErrorBoundary>
            <GlobalStyle />
            <FullApp />
        </ErrorBoundary>,
    );
}
