/**
 * Question model helpers — serialise/deserialise KV Store documents.
 *
 * KV Store document shape:
 *   { _key, sort_order, text, type, timeLimit, options_json }
 *
 * Internal React shape:
 *   { _key, sort_order, text, type, timeLimit,
 *     options: [{ id, text, correct }]         (single/multi/yesno)
 *     sliderMin, sliderMax, sliderStep, sliderUnit  (slider) }
 */

export const QUESTION_TYPES = [
    { value: 'single',   label: 'Single answer' },
    { value: 'multi',    label: 'Multiple answers' },
    { value: 'yesno',    label: 'Yes / No' },
    { value: 'freetext', label: 'Free text' },
    { value: 'slider',   label: 'Slider / Rating' },
];

/** Convert internal React shape → KV Store document. */
export function toKvDoc(q) {
    const { _key, sort_order, text, type, timeLimit, options,
            sliderMin, sliderMax, sliderStep, sliderUnit } = q;

    let opts;
    if (type === 'slider') {
        opts = [{ min: sliderMin ?? 1, max: sliderMax ?? 10,
                  step: sliderStep ?? 1, unit: sliderUnit ?? '' }];
    } else {
        opts = options || defaultOptions(type || 'single');
    }

    const doc = {
        sort_order: sort_order ?? 0,
        text: text || '',
        type: type || 'single',
        timeLimit: timeLimit ?? 30,
        options_json: JSON.stringify(opts),
    };
    if (_key) doc._key = _key;
    return doc;
}

/** Convert KV Store document → internal React shape. */
export function fromKvDoc(doc) {
    let parsed;
    try {
        parsed = JSON.parse(doc.options_json || '[]');
    } catch (_) {
        parsed = [];
    }

    const type = doc.type || 'single';
    const base = {
        _key: doc._key || '',
        sort_order: Number(doc.sort_order) || 0,
        text: doc.text || '',
        type,
        timeLimit: Number(doc.timeLimit) || 30,
    };

    if (type === 'slider') {
        const cfg = parsed[0] || {};
        return { ...base, options: [],
                 sliderMin: cfg.min ?? 1, sliderMax: cfg.max ?? 10,
                 sliderStep: cfg.step ?? 1, sliderUnit: cfg.unit ?? '' };
    }

    return { ...base, options: parsed.length ? parsed : defaultOptions(type) };
}

export function defaultOptions(type) {
    if (type === 'yesno') {
        return [
            { id: 'A', text: 'Yes', correct: false },
            { id: 'B', text: 'No',  correct: false },
        ];
    }
    if (type === 'freetext' || type === 'slider') return [];
    return [
        { id: 'A', text: '', correct: false },
        { id: 'B', text: '', correct: false },
        { id: 'C', text: '', correct: false },
        { id: 'D', text: '', correct: false },
    ];
}

export function newQuestion(overrides = {}) {
    return {
        _key: '',
        sort_order: 0,
        text: '',
        type: 'single',
        timeLimit: 30,
        options: defaultOptions('single'),
        sliderMin: 1,
        sliderMax: 10,
        sliderStep: 1,
        sliderUnit: '',
        ...overrides,
    };
}

/** Seed questions shown on first install. */
export const SEED_QUESTIONS = [
    {
        text: 'What is the default Splunk search language called?',
        type: 'single',
        timeLimit: 30,
        options: [
            { id: 'A', text: 'SPL (Search Processing Language)', correct: true },
            { id: 'B', text: 'SQL (Structured Query Language)', correct: false },
            { id: 'C', text: 'XQL (Extended Query Language)', correct: false },
            { id: 'D', text: 'SQL+', correct: false },
        ],
    },
    {
        text: 'Which Splunk component forwards data to an indexer?',
        type: 'single',
        timeLimit: 30,
        options: [
            { id: 'A', text: 'Search Head', correct: false },
            { id: 'B', text: 'Deployment Server', correct: false },
            { id: 'C', text: 'Universal Forwarder', correct: true },
            { id: 'D', text: 'License Manager', correct: false },
        ],
    },
    {
        text: 'Was the installation easy?',
        type: 'yesno',
        timeLimit: 20,
        options: [
            { id: 'A', text: 'Yes', correct: true },
            { id: 'B', text: 'No',  correct: false },
        ],
    },
    {
        text: 'Which of the following are Splunk search commands? (Select all that apply)',
        type: 'multi',
        timeLimit: 40,
        options: [
            { id: 'A', text: 'stats',      correct: true },
            { id: 'B', text: 'timechart',  correct: true },
            { id: 'C', text: 'WHERE',      correct: false },
            { id: 'D', text: 'table',      correct: true },
        ],
    },
    {
        text: 'What port does Splunk Web use by default?',
        type: 'single',
        timeLimit: 25,
        options: [
            { id: 'A', text: '80',   correct: false },
            { id: 'B', text: '443',  correct: false },
            { id: 'C', text: '8000', correct: true },
            { id: 'D', text: '8089', correct: false },
        ],
    },
    {
        text: 'Rate your overall confidence with Splunk (1 = beginner, 10 = expert)',
        type: 'slider',
        timeLimit: 30,
        options: [],
        sliderMin: 1,
        sliderMax: 10,
        sliderStep: 1,
        sliderUnit: '/10',
    },
    {
        text: 'What is your favourite Splunk feature?',
        type: 'freetext',
        timeLimit: 60,
        options: [],
    },
];
