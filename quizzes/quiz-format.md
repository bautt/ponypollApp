# Pony Poll — Quiz JSON Format (AI agent reference)

This file is a **self-contained, prompt-ready spec** for the Pony Poll quiz JSON
format. Point an AI agent at the raw URL and ask it to generate a new quiz:

```
https://raw.githubusercontent.com/bautt/ponypollApp/main/quizzes/quiz-format.md
```

> Example agent prompt:
> *"Follow the schema at the URL above and produce a 20-question quiz on
> {topic}. Mix question types. Add `explanation` to every graded question.
> Where you embed images, use Wikimedia Commons URLs with the `/500px-...`
> thumbnail suffix and credit the source in the `explanation`. Output one JSON
> file, valid against the schema."*

---

## 1. File shape

A quiz file is JSON. Two equivalent shapes are accepted:

**A — Wrapped (recommended, self-describing):**
```json
{
  "quiz_name": "My Quiz",
  "description": "Short one-line description.",
  "questions": [ /* question objects */ ]
}
```

**B — Bare array (legacy, still supported):**
```json
[ /* question objects */ ]
```

The importer also accepts `name` as an alias for `quiz_name`. Use UTF-8. Do not
include `_key` or `quiz_id` — they are regenerated on import.

---

## 2. Question object — full field reference

| Field                 | Type   | Required               | Description |
|-----------------------|--------|------------------------|-------------|
| `text`                | string | **yes**                | Question text shown to participants. |
| `type`                | string | **yes**                | One of: `single`, `multi`, `yesno`, `freetext`, `slider`, `wordcloud`. |
| `timeLimit`           | number | no (default `30`)      | Countdown in seconds. Typical: 15–45. |
| `explanation`         | string | recommended            | "Why" callout shown after the answer is revealed. |
| `image`               | string | no                     | URL to an image shown above the question. HTTPS only. |
| `options`             | array  | for `single`/`multi`/`yesno` (and optional graded `freetext`) | See §3. |
| `sliderMin`           | number | for `slider` (def `1`) | Lower bound of the slider. |
| `sliderMax`           | number | for `slider` (def `10`)| Upper bound. |
| `sliderStep`          | number | for `slider` (def `1`) | Step size. |
| `sliderUnit`          | string | no                     | Suffix label, e.g. `"/10"`, `" °C"`. |
| `wordcloudMaxWords`   | number | for `wordcloud` (def `7`)  | Max words per participant (1–20). |
| `wordcloudMaxChars`   | number | for `wordcloud` (def `32`) | Max chars per word (4–64). |

### Hard rules

- `type` **must** be one of the six values above — lowercase, exact.
- Options must use IDs `A`, `B`, `C`, `D` (in order), or `A`/`B` for `yesno`.
- `single` and `multi` should have **2–4 options**. Use four where possible.
- `yesno` **must** have exactly two options: `A: Yes` and `B: No`, with exactly
  one marked `correct: true`.
- `multi` needs **at least two** options with `correct: true`.
- `slider`, `freetext`, `wordcloud` do not need `options` (use `[]` or omit).
- Do not invent extra fields — unknown fields are silently dropped.

---

## 3. The `options` array

Each option is `{ "id": "<letter>", "text": "<string>", "correct": <bool> }`.

```json
"options": [
  { "id": "A", "text": "Athens",   "correct": false },
  { "id": "B", "text": "Sparta",   "correct": false },
  { "id": "C", "text": "Corinth",  "correct": true  },
  { "id": "D", "text": "Thebes",   "correct": false }
]
```

For **graded freetext**: list accepted answers in `options` with `correct: true`.
Matching is case-insensitive; `*` is a wildcard for zero-or-more characters.

```json
"options": [
  { "id": "A", "text": "splunk*", "correct": true }
]
```

An empty `options` (`[]`) makes freetext open-ended — any non-empty answer
scores the participation bonus.

---

## 4. Minimal example per type

**single**
```json
{
  "text": "Which goddess was born fully armoured from the head of Zeus?",
  "type": "single", "timeLimit": 20,
  "explanation": "Athena sprang forth in full battle dress when Hephaestus cleaved Zeus's skull.",
  "options": [
    { "id": "A", "text": "Hera",      "correct": false },
    { "id": "B", "text": "Athena",    "correct": true  },
    { "id": "C", "text": "Aphrodite", "correct": false },
    { "id": "D", "text": "Artemis",   "correct": false }
  ]
}
```

**multi** (≥ 2 correct)
```json
{
  "text": "Which of these are Olympian gods? (Select all that apply)",
  "type": "multi", "timeLimit": 30,
  "options": [
    { "id": "A", "text": "Apollo",    "correct": true  },
    { "id": "B", "text": "Hercules",  "correct": false },
    { "id": "C", "text": "Hermes",    "correct": true  },
    { "id": "D", "text": "Poseidon",  "correct": true  }
  ]
}
```

**yesno**
```json
{
  "text": "Did the Romans worship the same gods as the Greeks under different names?",
  "type": "yesno", "timeLimit": 15,
  "explanation": "Largely yes — Zeus→Jupiter, Ares→Mars, Aphrodite→Venus, etc.",
  "options": [
    { "id": "A", "text": "Yes", "correct": true  },
    { "id": "B", "text": "No",  "correct": false }
  ]
}
```

**freetext** (open-ended)
```json
{ "text": "Name one of the Twelve Olympians.", "type": "freetext", "timeLimit": 30, "options": [] }
```

**freetext** (graded, wildcards)
```json
{
  "text": "Which Greek hero killed the Minotaur?",
  "type": "freetext", "timeLimit": 25,
  "options": [
    { "id": "A", "text": "theseus*", "correct": true }
  ]
}
```

**slider**
```json
{
  "text": "How confident are you with Greek mythology? (1 = none, 10 = expert)",
  "type": "slider", "timeLimit": 20, "options": [],
  "sliderMin": 1, "sliderMax": 10, "sliderStep": 1, "sliderUnit": "/10"
}
```

**wordcloud**
```json
{
  "text": "Name one Greek god in a single word.",
  "type": "wordcloud", "timeLimit": 30,
  "wordcloudMaxWords": 1, "wordcloudMaxChars": 16
}
```

---

## 5. Images

- Use HTTPS URLs only.
- Wikimedia Commons thumbnails work well — pattern:
  `https://upload.wikimedia.org/wikipedia/commons/thumb/<a>/<ab>/<file>/500px-<file>`
  (replace `500` with `400`–`800` for the desired width).
- Credit the source in `explanation` ("Botticelli, *The Birth of Venus*,
  Uffizi — image via Wikimedia Commons.") when using third-party media.
- One image per question. Keep file sizes reasonable — projector clients
  render at ≤ 480 px wide.

---

## 6. Complete end-to-end example (3 questions, mixed types)

```json
{
  "quiz_name": "Mini Greek Myth Sampler",
  "description": "3-question demo covering single, yes/no, and slider types.",
  "questions": [
    {
      "text": "Who is the king of the Olympian gods?",
      "type": "single", "timeLimit": 15,
      "explanation": "Zeus rules from Mount Olympus, wielding the thunderbolt.",
      "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Zeus_de_Smyrne_-_Louvre_Ma13.jpg/500px-Zeus_de_Smyrne_-_Louvre_Ma13.jpg",
      "options": [
        { "id": "A", "text": "Apollo",   "correct": false },
        { "id": "B", "text": "Zeus",     "correct": true  },
        { "id": "C", "text": "Poseidon", "correct": false },
        { "id": "D", "text": "Hades",    "correct": false }
      ]
    },
    {
      "text": "Was the Trojan Horse built by the Greeks?",
      "type": "yesno", "timeLimit": 15,
      "explanation": "Yes — devised by Odysseus to smuggle Greek soldiers into Troy.",
      "options": [
        { "id": "A", "text": "Yes", "correct": true  },
        { "id": "B", "text": "No",  "correct": false }
      ]
    },
    {
      "text": "Rate how much you enjoyed this mini-quiz (1 = meh, 10 = amazing).",
      "type": "slider", "timeLimit": 15, "options": [],
      "sliderMin": 1, "sliderMax": 10, "sliderStep": 1, "sliderUnit": "/10"
    }
  ]
}
```

---

## 7. Authoring checklist (for the agent)

Before returning the JSON, verify:

- [ ] Valid JSON — passes a parser, no trailing commas, no comments.
- [ ] Every question has `text` and `type`.
- [ ] Every `single` / `multi` / `yesno` question has `options` with IDs
      `A`, `B`, `C`, `D` (or `A`/`B` for `yesno`) and at least one `correct: true`.
- [ ] `multi` questions have **2 or more** `correct: true`.
- [ ] `timeLimit` is 10–90 seconds and matches the question difficulty.
- [ ] `explanation` is set for every graded question (single/multi/yesno/freetext).
- [ ] `image` URLs are HTTPS and reachable; credit is in `explanation`.
- [ ] No `_key`, `quiz_id`, or other internal fields are included.
- [ ] Output is **one** JSON file, ready to paste into the Editor's
      **⬆ Import** button.

---

## 8. Where it loads in the app

- **Editor →  Import** — paste a JSON file from disk.
- **Editor →  Library** — load a bundled quiz (offline).
- **Editor →  GitHub** — fetch any quiz listed in
  [`quizzes/manifest.json`](manifest.json) live from this repo.

The Editor also lets you **copy questions** from one quiz to another, so a
small JSON file plus the library is a fast way to assemble a custom mix.
