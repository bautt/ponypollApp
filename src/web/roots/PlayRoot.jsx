/**
 * Play root — participant-only view (no nav, no admin tabs).
 *
 * Bootstraps the /play Splunk view. Polls the session document every 4 s
 * so switching between self-paced and synchronized mode (in either
 * direction) is picked up without a page reload.
 */
import React, { useState, useEffect } from 'react';
import { ErrorBoundary, GlobalStyle, useSeedOnFirstInstall } from '../App';
import PollPage from '../pages/PollPage';
import SyncPollPage from '../pages/SyncPollPage';
import { getSession } from '../lib/kvstore';
import { mount } from './mount';

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

export default function playRoot() {
    mount(
        <ErrorBoundary>
            <GlobalStyle />
            <PlayApp />
        </ErrorBoundary>,
    );
}
