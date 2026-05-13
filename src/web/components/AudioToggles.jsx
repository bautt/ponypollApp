/**
 * <AudioToggles /> — shared music/SFX toggle row used by SetupScreen
 * (self-paced) and LobbyScreen (synchronized).
 *
 * Preferences are persisted to localStorage via lib/audio.js, so they apply
 * across the whole app per browser. State is local to each instance — both
 * screens are short-lived and remount on phase change, so a hook listener
 * is overkill.
 */
import React, { useState, useCallback } from 'react';
import { C } from '../lib/theme';
import {
    isMusicEnabled, setMusicEnabled,
    isSfxEnabled,   setSfxEnabled,
} from '../lib/audio';
import { IconMusic, IconSound, IconMute } from './icons';

export function useAudioPrefs() {
    const [musicOn, setMusicOnState] = useState(() => isMusicEnabled());
    const [sfxOn,   setSfxOnState]   = useState(() => isSfxEnabled());

    const toggleMusic = useCallback(() => {
        setMusicOnState((cur) => {
            const next = !cur;
            setMusicEnabled(next);
            return next;
        });
    }, []);

    const toggleSfx = useCallback(() => {
        setSfxOnState((cur) => {
            const next = !cur;
            setSfxEnabled(next);
            return next;
        });
    }, []);

    return { musicOn, sfxOn, toggleMusic, toggleSfx };
}

function ToggleBtn({ label, on, onToggle, IconOn }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            title={`${label}: ${on ? 'on — click to turn off' : 'off — click to turn on'}`}
            style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                background: 'none', border: `1px solid ${on ? C.blue + '66' : C.border}`,
                borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
                color: on ? C.blue : C.muted, fontSize: 10, fontWeight: 600,
                letterSpacing: '0.04em', transition: 'all 0.15s', minWidth: 64,
            }}
        >
            {on ? <IconOn /> : <IconMute />}
            <span>{label}</span>
        </button>
    );
}

export default function AudioToggles({ marginTop = 16, justify = 'center' }) {
    const { musicOn, sfxOn, toggleMusic, toggleSfx } = useAudioPrefs();
    return (
        <div style={{ display: 'flex', gap: 8, marginTop, justifyContent: justify }}>
            <ToggleBtn label="Music"  on={musicOn} onToggle={toggleMusic} IconOn={IconMusic} />
            <ToggleBtn label="Sounds" on={sfxOn}   onToggle={toggleSfx}   IconOn={IconSound} />
        </div>
    );
}
