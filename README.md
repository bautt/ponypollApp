# Pony Poll — Interactive Quiz App for Splunk

**Pony Poll** is a self-contained Splunk app that turns any Splunk instance into a live quiz and polling platform. Participants answer questions in real time through a React-powered web UI embedded directly inside Splunk. All responses are stored as Splunk events, so you can build search-driven leaderboards and dashboards on top of the data immediately.

![Pony Poll mascot](src/package/appserver/static/appIcon_128.png)

---

## Screenshots

| Poll view | Question editor |
|---|---|
| ![Poll view — question with answer options and live timer](docs/screenshots/poll.png) | ![Editor — WYSIWYG question editor with type selector](docs/screenshots/editor.png) |

---

## Features

| Feature | Detail |
|---|---|
| **Question types** | Single correct answer · Multiple correct answers · Yes / No · Free text · Slider / Rating |
| **Multiple quizzes** | Create, rename, and delete any number of named quizzes; one quiz is set as *live* for participants at a time |
| **Export / Import** | Download any quiz as a JSON file; import to replace or append questions — great for sharing question sets between Splunk instances |
| **Quiz library** | Bundled pre-built quizzes (Splunk4Champions, Splunk Basics) importable with one click via **📚 Library**; **🔄 GitHub** button syncs the latest quizzes live from the repo |
| **Live timer** | Per-question countdown with speed-bonus scoring |
| **Nickname** | Pre-filled from the Splunk username, editable before starting |
| **WYSIWYG editor** | Built-in question editor with reorder, delete, and type switching |
| **KV Store backed** | Questions, quizzes, and config stored in Splunk KV Store — no external database needed |
| **Splunk index** | Every answer written as a Splunk event (index configurable) |
| **Splunk brand** | Splunk dark theme, Splunk UI colours, Buttercup mascot |
| **Lazy-loaded JS** | Main bundle is ~220 KB; large dependencies loaded on demand |

---

## Architecture

```
ponypollApp/
├── Makefile                        # build / package / deploy helpers
└── src/
    ├── package.json                # JS dependencies (React 16, styled-components, webpack 5)
    ├── webpack.config.mjs          # webpack build config
    ├── babel.config.js             # Babel / JSX config
    ├── package/                    # Splunk app skeleton (copied verbatim to dist/)
    │   ├── appserver/
    │   │   ├── static/             # JS bundle, app icons, Buttercup image
    │   │   └── templates/
    │   │       └── poll.html       # Mako template — React mount point
    │   ├── bin/
    │   │   └── ponypoll_rest.py    # Python REST handler — writes answer events
    │   ├── default/
    │   │   ├── app.conf            # App identity & metadata
    │   │   ├── collections.conf    # KV Store collection definitions
    │   │   ├── indexes.conf        # Dedicated `ponypoll` index
    │   │   ├── restmap.conf        # REST endpoint registration
    │   │   ├── web.conf            # Splunk Web proxy stanzas
    │   │   └── data/ui/
    │   │       ├── nav/default.xml # Navigation bar (Poll as default view)
    │   │       └── views/poll.xml  # View definition pointing to poll.html
    │   ├── lib/splunklib/          # Vendored Splunk Python SDK
    │   └── metadata/default.meta   # KV Store access permissions
    └── web/                        # React frontend source
        ├── index.js                # Entry point (ReactDOM.render)
        ├── App.jsx                 # Top-level navigation (Poll / Editor / Settings)
        ├── components/
        │   └── Timer.jsx           # Countdown timer component
        ├── lib/
        │   ├── kvstore.js          # KV Store REST helpers + answer submission
        │   ├── questions.js        # Question model, types, serialisation, seed data
        │   └── utils.js            # uid(), formatTime(), calcPoints()
        └── pages/
            ├── PollPage.jsx        # Quiz runner — setup, questions, reveal, done
            ├── EditorPage.jsx      # Question WYSIWYG editor + quiz management
            └── SettingsPage.jsx    # Poll title, Splunk index, active quiz selector
```

### Data flow

```
Browser (React)
    │  GET  /en-GB/splunkd/__raw/servicesNS/nobody/ponypollapp/storage/collections/data/ponypoll_quizzes
    │       → load quiz catalogue
    │
    │  GET  /en-GB/splunkd/__raw/servicesNS/nobody/ponypollapp/storage/collections/data/ponypoll_config
    │       → load config (active quiz ID, poll title, index)
    │
    │  GET  /en-GB/splunkd/__raw/servicesNS/nobody/ponypollapp/storage/collections/data/ponypoll_questions?query=...
    │       → load questions for the active quiz
    │
    │  POST /en-GB/splunkd/__raw/services/ponypoll/v1/answer
    │       → ponypoll_rest.py → splunk.client → event written to `ponypoll` index
    │
    │  POST /en-GB/splunkd/__raw/servicesNS/nobody/ponypollapp/storage/collections/data/ponypoll_questions/batch_save
    │       → save edited questions to KV Store
    └───────────────────────────────────────────────────────────────────────────────────────────────────────────────
```

### KV Store collections

| Collection | Purpose |
|---|---|
| `ponypoll_questions` | Question list (text, type, options, time limit, sort order, quiz_id) |
| `ponypoll_quizzes` | Named quiz catalogue (name, created_at) |
| `ponypoll_config` | Poll title, target Splunk index, and active quiz ID |

### Question event fields (in Splunk)

| Field | Example |
|---|---|
| `session_id` | `a3f9bc12` |
| `nickname` | `alice` |
| `question_index` | `2` |
| `question` | `What port does Splunk Web use by default?` |
| `type` | `single` |
| `answer` | `C` |
| `correct` | `true` |
| `points` | `847` |
| `time_remaining` | `18` |

---

## Prerequisites

| Requirement | Notes |
|---|---|
| Splunk Enterprise or Cloud ≥ 8.x | KV Store must be enabled (requires valid license) |
| Python 3 | Used by the REST handler |
| Node.js ≥ 16 + Yarn | For building the frontend locally |
| `make` | For the convenience build targets |

---

## Quick start

### 1. Build

```bash
cd src
yarn install          # install JS dependencies
yarn build            # compile React → dist/appserver/static/poll.bundle.js
```

Or use the Makefile:

```bash
make deps   # yarn install
make build  # webpack production build
```

### 2. Package

```bash
make package
# → ponypollapp.tar.gz
```

The Makefile copies everything from `src/package/` and `dist/` into a clean staging directory, excludes `__pycache__`, `.pyc`, `.DS_Store`, and `local/`, then tars it.

### 3. Install

**Option A — Splunk UI:**  
Upload `ponypollapp.tar.gz` via *Apps → Manage Apps → Install app from file*.

**Option B — SCP + copy:**

```bash
scp ponypollapp.tar.gz user@splunk-host:~
ssh user@splunk-host
sudo tar -xzf ~/ponypollapp.tar.gz -C /opt/splunk/etc/apps/
sudo systemctl restart Splunkd
```

**Option C — direct file copy (development):**

```bash
# Symlink or copy dist to the Splunk apps directory
sudo ln -sf /opt/code/ponypollApp/dist /opt/splunk/etc/apps/ponypollapp

# After each build, bump the Splunk Web cache:
# Open in browser → https://<host>:<port>/en-GB/_bump
```

### 4. Post-install

After installing:

1. Restart Splunk (required for KV Store collections to be created from `collections.conf`)
2. Open `https://<your-splunk>:<port>/en-GB/_bump` in a browser while logged in
3. Navigate to **Apps → Pony Poll**

On first load, the app auto-creates a **"Default Quiz"** in the KV Store and seeds it with example questions. From the **Editor** tab you can then create additional quizzes, manage questions, and export/import question sets.

---

## Development

Start webpack in watch mode:

```bash
cd src
yarn dev
```

After each change, copy the bundle to Splunk and hit `_bump`:

```bash
sudo cp dist/appserver/static/poll.bundle.js /opt/splunk/etc/apps/ponypollapp/appserver/static/
# then visit /_bump in browser
```

---

## Question types reference

| Type | How it works | Scoring |
|---|---|---|
| `single` | One correct answer from up to 4 options | Speed bonus: 500–1000 pts |
| `multi` | Multiple correct answers — all must match | Speed bonus: 500–1000 pts |
| `yesno` | Yes or No | Speed bonus: 500–1000 pts |
| `freetext` | Open text (up to 100 chars), stored as-is | 100 pts for any non-empty answer |
| `slider` | Numeric range (configurable min/max/step/unit) | 50 pts for participation |

Slider questions store the raw numeric value in Splunk, making them ideal for rating scales, NPS scores, or confidence checks.

---

## Multiple quizzes

The **Editor** tab has a quiz selector bar at the top of the sidebar. From there you can:

- **Switch** between quizzes using the dropdown
- **+ New** — create a new named quiz
- **Rename** — rename the currently selected quiz
- **Delete** — delete the quiz and all its questions (requires at least one quiz to remain)

The **Settings** tab has an **Active quiz** selector that controls which quiz is shown to participants in the **Poll** tab.

The **LIVE** badge appears next to the quiz name in the editor when that quiz is currently set as the active (live) one.

---

## Quiz library & GitHub sync

The app ships with a set of pre-built quiz JSON files and can also pull the latest quizzes directly from the GitHub repository.

### Using the library

In the **Editor** tab the toolbar has two buttons:

| Button | Source | Internet required |
|---|---|---|
| **📚 Library** | Files bundled with the app (`appserver/static/quizzes/`) — always available offline | No |
| **🔄 GitHub** | Live manifest and quiz files fetched from `github.com/bautt/ponypollApp` | Yes |

Both open the same **Library modal** with a source toggle at the top so you can switch between bundled and live without closing. The GitHub tab shows the repo URL, a **↺ Refresh** button to force a re-fetch, and clear error feedback when internet access is unavailable.

After choosing a quiz, clicking **Import** shows the same Replace / Append confirmation as a file import.

### Bundled quizzes

| File | Name | Questions | Difficulty | Topics |
|---|---|---|---|---|
| [`splunk4champions.json`](quizzes/splunk4champions.json) | Splunk4Champions — Advanced Topics | 22 | Advanced | tstats, buckets, bloom filters, Dashboard Studio, SmartStore, search performance, metrics |
| [`splunk-basics.json`](quizzes/splunk-basics.json) | Splunk Basics | 15 | Beginner | Components, ports, SPL commands, data lifecycle, HEC, forwarders, KV Store |

The source JSON files live in the [`quizzes/`](quizzes/) folder of the repository. See [`quizzes/README.md`](quizzes/README.md) for the full format reference and instructions for contributing new quizzes.

### Adding quizzes to the library

1. Create a new JSON file in `quizzes/` following the [JSON schema](#importexport-json-format)
2. Add an entry to `quizzes/manifest.json`
3. Copy the file to `src/package/appserver/static/quizzes/`
4. Rebuild the app (`make build`) — webpack copies the static files automatically
5. Commit and push — the GitHub sync button will immediately serve the new quiz to any instance with internet access, without requiring a new app deployment

---

## Export & Import

### Exporting a quiz

In the **Editor** tab, click **⬇ Export** in the toolbar. The browser downloads a `.json` file named after the quiz (e.g. `My Quiz.json`). The file contains an array of question objects.

### Importing questions

Click **⬆ Import** and select a `.json` file. A confirmation banner appears offering two options:

- **Replace** — deletes all current questions in the active quiz and replaces them with the imported set
- **Append** — adds the imported questions after the existing ones

This makes it easy to share question sets between Splunk instances or to maintain a library of question banks.

---

## Import/Export JSON format

The exported JSON is an array of question objects. Below is the full schema with one example per question type.

### JSON schema overview

```json
[
  {
    "text": "Question text shown to participants",
    "type": "single | multi | yesno | freetext | slider",
    "timeLimit": 30,
    "options": [ ... ],
    "sliderMin": 1,
    "sliderMax": 10,
    "sliderStep": 1,
    "sliderUnit": ""
  }
]
```

| Field | Type | Required | Description |
|---|---|---|---|
| `text` | string | **yes** | The question text displayed to participants |
| `type` | string | **yes** | One of `single`, `multi`, `yesno`, `freetext`, `slider` |
| `timeLimit` | number | no | Countdown in seconds (default: `30`) |
| `options` | array | for `single`/`multi`/`yesno` | Answer choices — see per-type details below |
| `sliderMin` | number | for `slider` | Minimum slider value (default: `1`) |
| `sliderMax` | number | for `slider` | Maximum slider value (default: `10`) |
| `sliderStep` | number | for `slider` | Step increment (default: `1`) |
| `sliderUnit` | string | for `slider` | Unit label shown next to the value, e.g. `"/10"`, `"°C"` (default: `""`) |

> **Note:** The `_key` and `quiz_id` fields are stripped on export and regenerated on import, so JSON files are fully portable between instances.

---

### Type: `single` — one correct answer

```json
{
  "text": "What port does Splunk Web use by default?",
  "type": "single",
  "timeLimit": 25,
  "options": [
    { "id": "A", "text": "80",   "correct": false },
    { "id": "B", "text": "443",  "correct": false },
    { "id": "C", "text": "8000", "correct": true  },
    { "id": "D", "text": "8089", "correct": false }
  ]
}
```

- `options` is an array of 2–4 choices
- Exactly **one** option should have `"correct": true`
- `id` values must be unique within the question; use `"A"`, `"B"`, `"C"`, `"D"`

---

### Type: `multi` — multiple correct answers

```json
{
  "text": "Which of the following are Splunk search commands? (Select all that apply)",
  "type": "multi",
  "timeLimit": 40,
  "options": [
    { "id": "A", "text": "stats",     "correct": true  },
    { "id": "B", "text": "timechart", "correct": true  },
    { "id": "C", "text": "WHERE",     "correct": false },
    { "id": "D", "text": "table",     "correct": true  }
  ]
}
```

- Two or more options can have `"correct": true`
- Participants must select **all** correct options — partial selections score zero

---

### Type: `yesno` — yes or no

```json
{
  "text": "Was the installation straightforward?",
  "type": "yesno",
  "timeLimit": 20,
  "options": [
    { "id": "A", "text": "Yes", "correct": true  },
    { "id": "B", "text": "No",  "correct": false }
  ]
}
```

- Always exactly two options with `id` `"A"` and `"B"`
- The editor auto-generates these; you may omit `options` when importing and the defaults will apply
- Set `"correct": true` on the answer you want to count as correct, or make both `false` for a no-scoring poll question

---

### Type: `freetext` — open text entry

```json
{
  "text": "What is your favourite Splunk feature?",
  "type": "freetext",
  "timeLimit": 60,
  "options": []
}
```

- `options` must be an empty array (or omitted)
- No correct/incorrect scoring; participants receive **100 pts** for any non-empty answer
- The raw text is stored in the `answer` field of the Splunk event

---

### Type: `slider` — numeric rating

```json
{
  "text": "Rate your overall confidence with Splunk (1 = beginner, 10 = expert)",
  "type": "slider",
  "timeLimit": 30,
  "options": [],
  "sliderMin": 1,
  "sliderMax": 10,
  "sliderStep": 1,
  "sliderUnit": "/10"
}
```

- `options` must be an empty array (or omitted)
- Participants drag a slider; the selected numeric value is stored in `answer`
- All participants receive **50 pts** for participation (no correct answer)
- Common uses: NPS score (`0`–`10`), confidence rating, Likert scale (`1`–`5`)

**NPS example:**

```json
{
  "text": "How likely are you to recommend this workshop to a colleague? (0 = not at all, 10 = definitely)",
  "type": "slider",
  "timeLimit": 30,
  "options": [],
  "sliderMin": 0,
  "sliderMax": 10,
  "sliderStep": 1,
  "sliderUnit": ""
}
```

---

### Complete example file

```json
[
  {
    "text": "What is the default Splunk search language called?",
    "type": "single",
    "timeLimit": 30,
    "options": [
      { "id": "A", "text": "SPL (Search Processing Language)", "correct": true  },
      { "id": "B", "text": "SQL (Structured Query Language)",  "correct": false },
      { "id": "C", "text": "XQL (Extended Query Language)",    "correct": false },
      { "id": "D", "text": "SQL+",                            "correct": false }
    ]
  },
  {
    "text": "Which of the following are Splunk search commands? (Select all that apply)",
    "type": "multi",
    "timeLimit": 40,
    "options": [
      { "id": "A", "text": "stats",     "correct": true  },
      { "id": "B", "text": "timechart", "correct": true  },
      { "id": "C", "text": "WHERE",     "correct": false },
      { "id": "D", "text": "table",     "correct": true  }
    ]
  },
  {
    "text": "Was the installation straightforward?",
    "type": "yesno",
    "timeLimit": 20,
    "options": [
      { "id": "A", "text": "Yes", "correct": true  },
      { "id": "B", "text": "No",  "correct": false }
    ]
  },
  {
    "text": "What is your favourite Splunk feature?",
    "type": "freetext",
    "timeLimit": 60,
    "options": []
  },
  {
    "text": "Rate your overall confidence with Splunk (1 = beginner, 10 = expert)",
    "type": "slider",
    "timeLimit": 30,
    "options": [],
    "sliderMin": 1,
    "sliderMax": 10,
    "sliderStep": 1,
    "sliderUnit": "/10"
  }
]
```

---

## Splunk search examples

**All answers for a session:**
```spl
index=ponypoll session_id="<id>" | table _time nickname question answer correct points
```

**Leaderboard:**
```spl
index=ponypoll | stats sum(points) as total_points by nickname | sort -total_points
```

**Correct answer rate by question:**
```spl
index=ponypoll type!=freetext type!=slider
| stats count as total, sum(eval(correct="true")) as correct_count by question
| eval pct_correct=round(correct_count/total*100, 1)
| sort -pct_correct
```

**Slider average by question:**
```spl
index=ponypoll type=slider | stats avg(answer) as avg_rating by question
```

**NPS distribution:**
```spl
index=ponypoll type=slider
| eval bucket=case(answer<=6,"Detractor", answer<=8,"Passive", answer>=9,"Promoter")
| stats count by bucket
```

**Free text responses:**
```spl
index=ponypoll type=freetext | table _time nickname question answer
```

---

## Configuration

All settings are available in the **Settings** tab inside the app:

| Setting | Default | Description |
|---|---|---|
| Poll title | `Pony Poll` | Shown on the start screen |
| Answer index | `ponypoll` | Splunk index where answer events are written |
| Active quiz | *(first quiz)* | Which quiz participants see in the Poll tab |

Settings are stored in the `ponypoll_config` KV Store collection under the key `default`.

---

## Permissions

The `metadata/default.meta` file grants:

- **Read** — all roles (participants can load questions and quizzes)
- **Write** — `admin` and `power` roles only (editing questions, quizzes, and config)

---

## Tech stack

| Layer | Technology |
|---|---|
| Splunk app | Python 3, Splunk XML views, Mako templates |
| Frontend | React 16, styled-components v5 |
| Build | Webpack 5, Babel, Yarn |
| Splunk Python SDK | Vendored `splunklib` (Splunk SDK for Python) |
| Content | JSX / ES2020, no TypeScript |

---

## License

MIT — see [LICENSE](LICENSE) if present.

---

## Contributing

1. Fork the repo
2. `cd src && yarn install && yarn dev`
3. Make your changes in `src/web/`
4. `yarn build` and test against a local Splunk instance
5. Open a pull request

---

*Built with Splunk, React, and a little help from Buttercup.*
