import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { C } from '../../lib/theme';
import { JoinPanel, JoinPanelLarge, JoinUrl, ShortUrlRow, CopyBtn } from './styles';

const IconLink = () => (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor"
        strokeWidth="1.5" strokeLinecap="round" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 5 }}>
        <path d="M6.5 9.5a3.5 3.5 0 0 0 4.95 0l2-2a3.5 3.5 0 0 0-4.95-4.95l-1 1" />
        <path d="M9.5 6.5a3.5 3.5 0 0 0-4.95 0l-2 2a3.5 3.5 0 0 0 4.95 4.95l1-1" />
    </svg>
);

const IconClipboard = () => (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 5 }}>
        <rect x="4" y="3" width="8" height="11" rx="1.2" />
        <path d="M6 3V2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5V3" />
        <line x1="6" y1="7" x2="10" y2="7" />
        <line x1="6" y1="10" x2="9" y2="10" />
    </svg>
);

const IconCheck = () => (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 5 }}>
        <polyline points="3,8.5 6.5,12 13,5" />
    </svg>
);

export default function JoinInfo({ large, sessionName, playUrl, shortUrl, copied, shorteningUrl, onShorten, onCopy }) {
    const Panel = large ? JoinPanelLarge : JoinPanel;
    const qrSize = large ? 180 : 110;

    return (
        <Panel>
            <div style={{ background: '#fff', padding: 8, borderRadius: 8, flexShrink: 0, lineHeight: 0 }}>
                <QRCodeSVG
                    value={playUrl}
                    size={qrSize}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    level="M"
                />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    Participants — scan or open
                </div>
                {sessionName && (
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'baseline',
                        gap: 6,
                        background: C.surface,
                        border: `1px solid ${C.border}`,
                        borderRadius: 6,
                        padding: '4px 12px',
                        marginBottom: 10,
                        fontSize: 11,
                        color: C.muted,
                        fontWeight: 600,
                    }}>
                        Tell participants: session
                        <span style={{ fontSize: 20, fontWeight: 800, color: C.blue, letterSpacing: '0.1em', fontVariantNumeric: 'tabular-nums' }}>
                            #{sessionName}
                        </span>
                    </div>
                )}

                <JoinUrl style={large ? { fontSize: 17 } : {}}>{playUrl}</JoinUrl>

                {shortUrl ? (
                    <ShortUrlRow>
                        <span style={{ fontSize: 11, color: C.muted }}>Short:</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: C.yellow, fontFamily: 'monospace' }}>
                            {shortUrl}
                        </span>
                    </ShortUrlRow>
                ) : (
                    <ShortUrlRow style={{ marginTop: 6 }}>
                        <CopyBtn
                            onClick={onShorten}
                            disabled={shorteningUrl}
                            title="Sends your server hostname to tinyurl.com"
                        >
                            {shorteningUrl ? '…' : <><IconLink />Shorten URL</>}
                        </CopyBtn>
                        <span style={{ fontSize: 11, color: C.muted }}>
                            (sends hostname to tinyurl.com)
                        </span>
                    </ShortUrlRow>
                )}

                <ShortUrlRow style={{ marginTop: 10 }}>
                    <CopyBtn onClick={() => onCopy(shortUrl || playUrl)}>
                        {copied ? <><IconCheck />Copied!</> : <><IconClipboard />Copy URL</>}
                    </CopyBtn>
                    {shortUrl && (
                        <CopyBtn onClick={() => onCopy(playUrl)}>
                            Copy full URL
                        </CopyBtn>
                    )}
                </ShortUrlRow>
            </div>
        </Panel>
    );
}
