/**
 * Shared design tokens for PonyPoll.
 *
 * Import `C` wherever you need colours and `FONTS` for font stacks.
 * OPTION_COLORS is the canonical set for answer-option buttons (self-paced
 * and participant sync views).  DIST_COLORS is the 6-colour extended set
 * used in distribution bars and word-cloud badges on the host/admin view.
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
    // Four option colours used in self-paced PollPage and EditorPage previews
    optA:    '#1F77B4',
    optB:    '#65A637',
    optC:    '#ED8B00',
    optD:    '#AF6DC7',
};

/** Font stack — Splunk Platform Sans with system fallbacks. */
export const FONTS = {
    sans: "'Splunk Platform Sans', 'Inter', system-ui, sans-serif",
};

/**
 * Four colours for answer option buttons.
 * Matches C.optA–D; kept as an array for index-based access.
 */
export const OPTION_COLORS = [C.optA, C.optB, C.optC, C.optD];

/**
 * Extended colour set for distribution bars and leaderboard charts
 * where more than four categories may appear.
 */
export const DIST_COLORS = [
    '#009CDE', '#5CC05C', '#ED8B00', '#9B59B6', '#E84545', '#20B2AA',
];
