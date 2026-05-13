/**
 * Shared design tokens for PonyPoll.
 *
 * Import `C` wherever you need colours and `FONTS` for font stacks.
 * DIST_COLORS is the canonical 6-colour palette for any indexed visualisation
 * (option buttons, distribution bars, word-cloud word badges, leaderboards).
 * OPTION_COLORS is `DIST_COLORS.slice(0, 4)` kept as a re-export for callers
 * that want explicit "this is the option palette" semantics.
 */

export const C = {
    bg:      '#1B1D22',
    surface: '#23262F',
    surface2:'#2B2E38',
    border:  '#3C3F4A',
    text:    '#D0D4E3',
    muted:   '#868A9C',
    blue:    '#009CDE',
    green:   '#5CC05C',
    accent:  '#5CC05C',   // alias — use when "positive / correct" semantics are needed
    orange:  '#ED8B00',   // Splunk brand orange
    red:     '#DC4E41',
    yellow:  '#F5A623',
};

/** Font stack — Splunk Platform Sans with system fallbacks. */
export const FONTS = {
    sans: "'Splunk Platform Sans', 'Inter', system-ui, sans-serif",
};

/**
 * Extended colour set for distribution bars, leaderboard charts and
 * any indexed visualisation. First four entries also drive answer option
 * buttons in both self-paced and synchronized participant views.
 */
export const DIST_COLORS = [
    '#009CDE', '#5CC05C', '#ED8B00', '#9B59B6', '#E84545', '#20B2AA',
];

/** First four DIST_COLORS — kept as a named export for the option-button use case. */
export const OPTION_COLORS = DIST_COLORS.slice(0, 4);
