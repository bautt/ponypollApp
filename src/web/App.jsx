import React, { useState } from 'react';
import styled from 'styled-components';
import PollPage from './pages/PollPage';
import EditorPage from './pages/EditorPage';
import SettingsPage from './pages/SettingsPage';

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

const TABS = [
    { id: 'poll',     label: '▶ Poll' },
    { id: 'editor',   label: '✏ Editor' },
    { id: 'settings', label: '⚙ Settings' },
];

export default function App() {
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

            {tab === 'poll'     && <PollPage />}
            {tab === 'editor'   && <EditorPage />}
            {tab === 'settings' && <SettingsPage />}
        </>
    );
}
