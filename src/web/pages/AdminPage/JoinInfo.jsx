import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { C } from '../../lib/theme';
import { JoinPanel, JoinPanelLarge, JoinUrl, ShortUrlRow, CopyBtn } from './styles';

export default function JoinInfo({ large, playUrl, shortUrl, copied, shorteningUrl, onShorten, onCopy }) {
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
                            {shorteningUrl ? '…' : '🔗 Shorten URL'}
                        </CopyBtn>
                        <span style={{ fontSize: 11, color: C.muted }}>
                            (sends hostname to tinyurl.com)
                        </span>
                    </ShortUrlRow>
                )}

                <ShortUrlRow style={{ marginTop: 10 }}>
                    <CopyBtn onClick={() => onCopy(shortUrl || playUrl)}>
                        {copied ? '✓ Copied!' : '📋 Copy URL'}
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
