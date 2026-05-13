/**
 * Shared SVG icons.
 *
 * Single source of truth for icons used in multiple places (e.g. audio toggles,
 * nav bar). Icons used in exactly one place can stay co-located with that file.
 *
 * All icons accept `size` (number, default 14) and pass through other SVG props.
 * Stroke icons render with `stroke="currentColor"`; fill icons with
 * `fill="currentColor"`. Wrap parents drive colour via CSS.
 */
import React from 'react';

const BASE_STYLE = { display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 };

const base = (size, fill, stroke) => ({
    width: size, height: size,
    fill, stroke, strokeWidth: 1.5,
    strokeLinecap: 'round', strokeLinejoin: 'round',
    viewBox: '0 0 16 16',
    'aria-hidden': true,
});

const merge = ({ size = 14, style, ...rest }, fill, stroke) => ({
    ...base(size, fill, stroke),
    ...rest,
    style: { ...BASE_STYLE, ...style },
});

const stroked = (props) => merge(props, 'none', 'currentColor');
const filled  = (props) => merge(props, 'currentColor', 'none');

// ── Audio ────────────────────────────────────────────────────────────────────
export const IconMusic = (props) => (
    <svg {...filled({ size: 16, ...props, viewBox: '0 0 20 20' })}>
        <path d="M9 3v10.55A3 3 0 1 0 11 16V7h4V3H9z"/>
    </svg>
);
export const IconSound = (props) => (
    <svg {...filled({ size: 16, ...props, viewBox: '0 0 20 20' })}>
        <path d="M10 3.5L6 7H3v6h3l4 3.5V3.5zM13.5 6.5a5 5 0 0 1 0 7M15.8 4.2a8 8 0 0 1 0 11.6"/>
    </svg>
);
export const IconMute = (props) => (
    <svg {...filled({ size: 16, ...props, viewBox: '0 0 20 20' })}>
        <path d="M10 3.5L6 7H3v6h3l4 3.5V3.5z" opacity=".4"/>
        <line x1="13" y1="8"  x2="18" y2="13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="18" y1="8"  x2="13" y2="13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
);

// ── Nav bar ──────────────────────────────────────────────────────────────────
export const IconPlay = (props) => (
    <svg {...filled({ size: 14, ...props })}>
        <path d="M4 2.8v10.4c0 .7.8 1.1 1.4.7l7.7-5.2a.85.85 0 0 0 0-1.4L5.4 2.1C4.8 1.7 4 2.1 4 2.8Z"/>
    </svg>
);
export const IconPencil = (props) => (
    <svg {...stroked(props)}>
        <path d="M11.5 2.5l2 2L5 13l-3 .5.5-3 9-8z" strokeWidth="1.3"/>
    </svg>
);
export const IconGear = (props) => (
    <svg {...stroked(props)}>
        <circle cx="8" cy="8" r="2.2" strokeWidth="1.3"/>
        <path strokeWidth="1.3" d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4"/>
    </svg>
);
export const IconProjector = (props) => (
    <svg {...filled({ size: 15, ...props })}>
        <rect x="1" y="4" width="10" height="6" rx="1.2" />
        <circle cx="8.5" cy="7" r="1.8" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="3" cy="6" r="0.7" />
        <line x1="11" y1="5.2" x2="15" y2="3"   stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" />
        <line x1="11" y1="8.8" x2="15" y2="11"  stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" />
        <line x1="5.5" y1="10" x2="5.5" y2="13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="3.5" y1="13" x2="7.5" y2="13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
);
export const IconBarChart = (props) => (
    <svg {...filled({ size: 14, ...props })}>
        <rect x="1"  y="7"  width="3" height="8"  rx="0.5" />
        <rect x="6"  y="4"  width="3" height="11" rx="0.5" />
        <rect x="11" y="1"  width="3" height="14" rx="0.5" />
    </svg>
);
