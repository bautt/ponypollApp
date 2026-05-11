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
    { value: 'single',    label: 'Single answer' },
    { value: 'multi',     label: 'Multiple answers' },
    { value: 'yesno',     label: 'Yes / No' },
    { value: 'freetext',  label: 'Free text' },
    { value: 'slider',    label: 'Slider / Rating' },
    { value: 'wordcloud', label: 'Word cloud' },
];

/** Convert internal React shape → KV Store document. */
export function toKvDoc(q) {
    const { _key, sort_order, text, type, timeLimit, options, explanation,
            sliderMin, sliderMax, sliderStep, sliderUnit,
            wordcloudMaxChars, wordcloudMaxWords, quiz_id, image } = q;

    let opts;
    if (type === 'slider') {
        opts = [{ min: sliderMin ?? 1, max: sliderMax ?? 10,
                  step: sliderStep ?? 1, unit: sliderUnit ?? '' }];
    } else if (type === 'wordcloud') {
        opts = [{ maxChars: wordcloudMaxChars ?? 32, maxWords: wordcloudMaxWords ?? 7 }];
    } else {
        opts = options || defaultOptions(type || 'single');
    }

    const doc = {
        sort_order: sort_order ?? 0,
        text: text || '',
        type: type || 'single',
        timeLimit: timeLimit ?? 30,
        options_json: JSON.stringify(opts),
        explanation: explanation || '',
        image: image || '',
    };
    if (quiz_id) doc.quiz_id = quiz_id;
    if (_key) doc._key = _key;
    return doc;
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Ensure every option object has an `id` field (letter A, B, C…). */
function withIds(opts) {
    return opts.map((o, i) => o.id ? o : { ...o, id: LETTERS[i] || String(i + 1) });
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
        explanation: doc.explanation || '',
        quiz_id: doc.quiz_id || '',
        image: doc.image || '',
    };

    if (type === 'slider') {
        const cfg = parsed[0] || {};
        return { ...base, options: [],
                 sliderMin: cfg.min ?? 1, sliderMax: cfg.max ?? 10,
                 sliderStep: cfg.step ?? 1, sliderUnit: cfg.unit ?? '' };
    }

    if (type === 'wordcloud') {
        const cfg = parsed[0] || {};
        return { ...base, options: [], wordcloudMaxChars: cfg.maxChars ?? 32, wordcloudMaxWords: cfg.maxWords ?? 7 };
    }

    const opts = parsed.length ? withIds(parsed) : defaultOptions(type);
    return { ...base, options: opts };
}

export function defaultOptions(type) {
    if (type === 'freetext')  return [];   // accepted answers added by quiz maker
    if (type === 'wordcloud') return [{ maxChars: 32 }];
    if (type === 'slider')    return [];
    if (type === 'yesno') {
        return [
            { id: 'A', text: 'Yes', correct: false },
            { id: 'B', text: 'No',  correct: false },
        ];
    }
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
        explanation: '',
        options: defaultOptions('single'),
        sliderMin: 1,
        sliderMax: 10,
        sliderStep: 1,
        sliderUnit: '',
        wordcloudMaxChars: 32,
        wordcloudMaxWords: 7,
        quiz_id: '',
        image: '',
        ...overrides,
    };
}

/** Seed questions shown on first install — one of every question type. */
export const SEED_QUESTIONS = [
    {
        text: 'Which port does Splunk Web use by default?',
        type: 'single',
        timeLimit: 30,
        explanation: 'Splunk Web listens on port 8000 by default. Port 8089 is the management/REST API port, and 9997 is the default receiver port for forwarders.',
        options: [
            { id: 'A', text: '8000', correct: true  },
            { id: 'B', text: '8080', correct: false },
            { id: 'C', text: '8089', correct: false },
            { id: 'D', text: '9997', correct: false },
        ],
    },
    {
        text: 'Which of the following are valid Splunk search commands? (select all that apply)',
        type: 'multi',
        timeLimit: 40,
        explanation: 'stats, timechart, and chart are all native SPL commands. "cronjob" is not a Splunk command — that\'s a Unix scheduler.',
        options: [
            { id: 'A', text: 'stats',     correct: true  },
            { id: 'B', text: 'timechart', correct: true  },
            { id: 'C', text: 'chart',     correct: true  },
            { id: 'D', text: 'cronjob',   correct: false },
        ],
    },
    {
        text: 'Is this the Pony Poll mascot?',
        type: 'yesno',
        timeLimit: 20,
        image: '/static/app/ponypollapp/buttercup.png',
        explanation: 'Yes — meet Buttercup, the Pony Poll mascot!',
        options: [
            { id: 'A', text: 'Yes', correct: true  },
            { id: 'B', text: 'No',  correct: false },
        ],
    },
    {
        text: 'What does SPL stand for?',
        type: 'freetext',
        timeLimit: 30,
        explanation: 'SPL = Search Processing Language — the query language you use in every Splunk search bar.',
        options: [
            { id: 'A', text: 'Search Processing Language', correct: true },
            { id: 'B', text: 'search processing language', correct: true },
        ],
    },
    {
        text: 'On a scale of 1–10, how confident are you with Splunk SPL right now?',
        type: 'slider',
        timeLimit: 30,
        explanation: 'No wrong answers here — this is just a pulse check!',
        options: [],
        sliderMin: 1,
        sliderMax: 10,
        sliderStep: 1,
        sliderUnit: '/10',
    },
    {
        text: 'In one word — what is Splunk best at?',
        type: 'wordcloud',
        timeLimit: 30,
        explanation: 'Word clouds are great for open brainstorming. Word size reflects how many participants submitted the same term.',
        wordcloudMaxWords: 3,
        wordcloudMaxChars: 32,
    },
];
