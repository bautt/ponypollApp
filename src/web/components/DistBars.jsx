import React from 'react';
import { C, DIST_COLORS } from '../lib/theme';

/**
 * Horizontal distribution bars shown after an answer reveal.
 * Used by both AdminPage (host) and SyncPollPage (participant).
 *
 * Props:
 *   options  – [{id, text, correct}]
 *   dist     – [{option, count}]  (from runSearch)
 *   total    – number of respondents
 */
export default function DistBars({ options, dist, total }) {
    if (!options || options.length === 0 || total === 0) return null;
    const countMap = Object.fromEntries((dist || []).map((d) => [d.option, Number(d.count)]));
    return (
        <div style={{ margin: '16px 0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                📊 Answer Distribution &nbsp;
                <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                    ({total} responded)
                </span>
            </div>
            {options.map((opt, i) => {
                const count = countMap[opt.id] || 0;
                const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
                const color = opt.correct ? C.green : DIST_COLORS[i % DIST_COLORS.length];
                return (
                    <div key={opt.id} style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, fontSize: 13 }}>
                            <span style={{
                                display: 'inline-flex', width: 22, height: 22, borderRadius: 5,
                                alignItems: 'center', justifyContent: 'center',
                                background: color, color: '#fff', fontWeight: 700, fontSize: 11, flexShrink: 0,
                            }}>{opt.id}</span>
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: C.text }}>
                                {opt.text}
                            </span>
                            <span style={{ color: C.muted, fontSize: 12, whiteSpace: 'nowrap' }}>
                                {count} &nbsp;·&nbsp; {pct}%
                            </span>
                        </div>
                        <div style={{ height: 8, background: C.surface2, borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{
                                height: '100%', width: `${pct}%`, background: color,
                                borderRadius: 4, transition: 'width 0.6s ease',
                            }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
