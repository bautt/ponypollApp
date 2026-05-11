import React from 'react';
import { C } from '../../lib/theme';

const WC_COLORS = ['#009CDE','#5CC05C','#F5A623','#E84545','#7EC8E3','#FF6D00','#A78BFA','#34D399','#FB923C','#F472B6'];

function seededRand(seed) {
    let s = seed;
    return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 4294967296; };
}

export default function WordCloud({ words }) {
    if (!words || words.length === 0) {
        return (
            <div style={{ textAlign: 'center', color: C.muted, fontSize: 13, padding: '32px 0' }}>
                Waiting for submissions…
            </div>
        );
    }

    const W = 680, H = 340;
    const maxCount = words[0].count;
    const minCount = words[words.length - 1].count;
    const range    = Math.max(1, maxCount - minCount);

    const placed = [];
    const rects  = [];

    words.forEach((w, wi) => {
        const t   = (w.count - minCount) / range;
        const fs  = Math.round(14 + t * 42);
        const rot = [0, -30, 30, -15, 15][wi % 5];
        const rng = seededRand(wi * 7919 + w.text.charCodeAt(0));

        const tw = w.text.length * fs * 0.58;
        const th = fs * 1.2;

        let placed_ok = false;
        for (let attempt = 0; attempt < 80; attempt++) {
            const cx = tw / 2 + rng() * (W - tw);
            const cy = th / 2 + rng() * (H - th);
            const r  = { x: cx - tw / 2, y: cy - th / 2, w: tw, h: th };
            const overlap = rects.some(
                (o) => r.x < o.x + o.w && r.x + r.w > o.x && r.y < o.y + o.h && r.y + r.h > o.y
            );
            if (!overlap) {
                rects.push(r);
                placed.push({ ...w, cx, cy, fs, rot, color: WC_COLORS[wi % WC_COLORS.length] });
                placed_ok = true;
                break;
            }
        }
        if (!placed_ok) {
            const cx = W / 2;
            const cy = H - th / 2 - placed.filter((p) => p.cy > H * 0.8).length * (th + 4);
            placed.push({ ...w, cx, cy, fs, rot, color: WC_COLORS[wi % WC_COLORS.length] });
        }
    });

    return (
        <div style={{ margin: '16px 0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                ☁ Word Cloud &nbsp;
                <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                    ({words.reduce((s, w) => s + w.count, 0)} submissions)
                </span>
            </div>
            <svg
                viewBox={`0 0 ${W} ${H}`}
                style={{ width: '100%', height: 'auto', background: C.surface2, borderRadius: 10 }}
            >
                {placed.map((p, i) => (
                    <text
                        key={i}
                        x={p.cx}
                        y={p.cy}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={p.fs}
                        fontWeight={p.count === maxCount ? 800 : 600}
                        fill={p.color}
                        transform={p.rot !== 0 ? `rotate(${p.rot},${p.cx},${p.cy})` : undefined}
                        style={{ fontFamily: "'Splunk Platform Sans','Inter',sans-serif", userSelect: 'none' }}
                    >
                        {p.text}
                    </text>
                ))}
            </svg>
        </div>
    );
}
