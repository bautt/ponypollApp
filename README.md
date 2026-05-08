# Pony Poll — Interactive Quiz App for Splunk

![Pony Poll mascot](src/package/appserver/static/appIcon_128.png)

> **v1.1.6** · Splunk Enterprise & Cloud ≥ 8.x · AppInspect approved ✓ · React 16 · KV Store

Pony Poll is a live interactive quiz app that runs entirely inside Splunk. Participants join through the Splunk Web UI, enter a nickname, and answer timed questions with instant scoring and feedback. The built-in editor supports five question types (single choice, multiple choice, yes/no, free text, and slider), a quiz library synced from GitHub, and one-click JSON import/export. Every answer and quiz session is indexed as a native Splunk event, and the Analytics tab delivers a real-time leaderboard and per-question difficulty breakdown. Installation: download the tarball from GitHub Releases and upload it through **Apps → Manage Apps** in Splunk Web.

---

## TL;DR

**Pony Poll** turns any Splunk instance into a live Kahoot-style quiz — no extra infrastructure needed.

```
Install app → create questions in the Editor → share the **`/play`** URL with participants → watch answers flow into Splunk
```

| What | How |
|---|---|
| **Run a quiz** | Open the **Poll** tab, enter your nickname, hit Start |
| **Build questions** | **Editor** tab — 5 types, drag to reorder, set time limits |
| **Use ready-made quizzes** | **📚 Library** (bundled) or **🔄 GitHub** (live sync from this repo) |
| **Share a quiz** | **Export** → JSON file; anyone can **Import** on another instance |
| **Analyse results** | Built-in **Analytics** tab — leaderboard, KPI cards, question difficulty; or raw SPL: `index=ponypoll \| stats sum(points) by nickname` |
| **Install** | Upload `ponypollapp.tar.gz` in Splunk UI — done |

**Requires:** Splunk Enterprise with a valid license (KV Store must be enabled).

---

## Screenshots

| Start screen | Live question | Answer revealed |
|---|---|---|
| ![Start — Buttercup mascot and nickname input](docs/screenshots/start.png) | ![Question — 4 choices and countdown timer](docs/screenshots/question.png) | ![Reveal — correct answer highlighted, points awarded](docs/screenshots/reveal.png) |

**Editor**

![Editor — quiz selector, question list, WYSIWYG form with type buttons and answer options](docs/screenshots/editor.png)

**Analytics**

![Analytics — KPI scorecards, leaderboard ranked by best score, question difficulty bars, recent sessions](docs/screenshots/analytics.png)

---

## Features

| Feature | Detail |
|---|---|
| **Question types** | Single correct answer · Multiple correct answers · Yes / No · Free text · Slider / Rating |
| **Multiple quizzes** | Create, rename, and delete any number of named quizzes; one quiz is set as *live* for participants at a time |
| **Random question subset** | Set a quiz to play a random N questions from its full pool (e.g. 12 of 34) — each participant gets a different draw |
| **Export / Import** | Download any quiz as a JSON file; import to replace or append questions — great for sharing question sets between Splunk instances |
| **Quiz library** | Bundled pre-built quizzes (Splunk4Champions, Splunk Basics) importable with one click via **📚 Library**; **🔄 GitHub** button syncs the latest quizzes live from the repo |
| **Live timer** | Per-question countdown with speed-bonus scoring |
| **Nickname** | Pre-filled from the Splunk username, editable before starting |
| **WYSIWYG editor** | Built-in question editor with reorder, delete, and type switching |
| **KV Store backed** | Questions, quizzes, and config stored in Splunk KV Store — no external database needed |
| **Analytics dashboard** | Built-in **📊 Analytics** tab — KPI scorecards, leaderboard, per-question difficulty bars, recent sessions; filterable by time range, quiz, and nickname |
| **Splunk index** | Every answer and quiz lifecycle event written directly via `receivers/simple` — no custom Python required |
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
    │   ├── default/
    │   │   ├── app.conf            # App identity & metadata
    │   │   ├── collections.conf    # KV Store collection definitions
    │   │   ├── indexes.conf        # Dedicated `ponypoll` index
    │   │   ├── web.conf            # Splunk Web proxy stanzas (KV Store, receivers/simple, search/jobs)
    │   │   └── data/ui/
    │   │       ├── nav/default.xml # Navigation bar (Poll as default view)
    │   │       ├── views/poll.xml  # Full app view (host/presenter)
    │   │       └── views/play.xml  # Participant-only view (quiz only)
    │   ├── lib/splunklib/          # Vendored Splunk Python SDK
    │   └── metadata/default.meta   # KV Store access permissions
    └── web/                        # React frontend source
        ├── index.js                # Entry point (ReactDOM.render)
        ├── App.jsx                 # Top-level navigation (Poll / Analytics / Editor / Settings)
        ├── components/
        │   └── Timer.jsx           # Countdown timer component
        ├── lib/
        │   ├── kvstore.js          # KV Store REST helpers, answer submission, runSearch()
        │   ├── questions.js        # Question model, types, serialisation, seed data
        │   └── utils.js            # uid(), formatTime(), calcPoints()
        └── pages/
            ├── PollPage.jsx        # Quiz runner — setup, questions, reveal, done
            ├── AnalyticsPage.jsx   # Analytics dashboard — KPI cards, leaderboard, question analysis
            ├── EditorPage.jsx      # Question WYSIWYG editor + quiz management
            └── SettingsPage.jsx    # Poll title, Splunk index, active quiz selector
```

### Data flow

```
Browser (React)
    │  GET  /splunkd/__raw/servicesNS/nobody/ponypollapp/storage/collections/data/ponypoll_quizzes
    │       → load quiz catalogue
    │
    │  GET  /splunkd/__raw/servicesNS/nobody/ponypollapp/storage/collections/data/ponypoll_config
    │       → load config (active quiz ID, poll title)
    │
    │  GET  /splunkd/__raw/servicesNS/nobody/ponypollapp/storage/collections/data/ponypoll_questions?query=...
    │       → load questions for the active quiz
    │
    │  POST /splunkd/__raw/services/receivers/simple?index=ponypoll&sourcetype=ponypoll_answer
    │       → event written directly to Splunk index (no custom Python)
    │
    │  POST /splunkd/__raw/services/receivers/simple?index=ponypoll&sourcetype=ponypoll_attempt
    │       → quiz_start / quiz_complete lifecycle events
    │
    │  POST /splunkd/__raw/services/search/jobs  (exec_mode=oneshot)
    │       → Analytics tab runs SPL against ponypoll index, renders results in React
    │
    │  POST /splunkd/__raw/servicesNS/nobody/ponypollapp/storage/collections/data/ponypoll_questions/batch_save
    │       → save edited questions to KV Store
    └──────────────────────────────────────────────────────────────────────────────────────
```

### KV Store collections

| Collection | Purpose |
|---|---|
| `ponypoll_questions` | Question list (text, type, options, time limit, sort order, quiz_id) |
| `ponypoll_quizzes` | Named quiz catalogue (name, created_at, question_limit) |
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

## Installation

### Step 1 — Download the latest release

Go to the [**Releases page**](https://github.com/bautt/ponypollApp/releases/latest) and download **`ponypollapp.tar.gz`** from the Assets section.

### Step 2 — Install via the Splunk UI

1. Log in to Splunk Web as an administrator.
2. Click the **⚙ gear icon** (top-left) next to "Apps", or navigate to  
   **Apps → Manage Apps**.
3. Click **Install app from file** (top-right button).
4. Click **Choose File**, select the downloaded `ponypollapp.tar.gz`, then click **Upload**.
5. If prompted to restart Splunk, click **Restart Now** and wait for Splunk to come back up.
6. After restart, **Pony Poll** appears in the app bar. Click it to open.

> **Splunk Cloud:** Use the Splunk Cloud self-service app install in the Admin Console, or contact your Splunk admin to install via the REST API.

### Step 3 — First run

1. Open the app — you land on the **Poll** tab.
2. Switch to the **Editor** tab and create your first question, or click **📚 Library** to import a ready-made quiz.
3. Go to **Settings** and set the **Active quiz** (the quiz participants will see).
4. Share the **Play URL** with participants (see below) — they enter a nickname and click **Start**.

### Two entry points

The app exposes two URLs with different audiences:

| URL | Who it's for | What they see |
|-----|-------------|---------------|
| `/app/ponypollapp/poll` | **Host / presenter** | Full app — Poll, Editor, Analytics, Settings tabs |
| `/app/ponypollapp/play` | **Participants** | Quiz only — nickname input, questions, score reveal |

Share the `/play` URL with your audience. It shows only the quiz so participants can't accidentally wander into the editor or analytics.

Both URLs are listed in the app's navigation bar inside Splunk.

#### Making `/play` the default

In **Settings → Default view** you can switch the default entry point to **Play**. When set, anyone opening the app URL is automatically redirected to `/play`.

**Getting back to the full admin app when Play is default:**

| Method | How |
|---|---|
| **⚙ Admin link** | Hover the bottom-right corner of the `/play` view — a subtle link appears |
| **URL bypass** | Navigate to `/app/ponypollapp/poll?admin` — the `?admin` param skips the redirect permanently for that session |

Bookmark `/app/ponypollapp/poll?admin` as your admin shortcut when running workshops in Play-default mode.

### Requirements

| Requirement | Notes |
|---|---|
| Splunk Enterprise ≥ 8.x | KV Store must be enabled — requires a valid (non-free) license |
| Splunk Cloud ✓ | Tested and working on Splunk Cloud — AppInspect approved |
| Browser | Any modern browser (Chrome, Firefox, Edge, Safari) |

> **No Node.js, Python, or build tools are needed** to run the app — the pre-built JavaScript bundle is included in the release tarball.

---

## Building from source

Only needed if you want to modify the frontend code.

### Prerequisites

| Requirement | Notes |
|---|---|
| Node.js ≥ 16 + Yarn | For building the frontend |
| `make` | For the convenience build targets |

### Build & package

```bash
cd src
yarn install   # install JS dependencies
```

```bash
make build     # webpack production build → dist/
make package   # bundle into ponypollapp.tar.gz
```

Install the resulting `ponypollapp.tar.gz` via the Splunk UI as described above.

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

## Random question subset

When a quiz has many questions (for example a Splunk AI quiz with 34 questions), you can configure it to play only a random selection of them per session.

### Setting a subset

In the **Editor** sidebar, below the Activate button, there is a **🎲 Play:** dropdown:

| Selection | Behaviour |
|---|---|
| **All N questions** | Every question plays in the saved order (default) |
| **Random N of M** | N questions are drawn at random from the full pool each time the quiz starts |

The setting is saved immediately and persists across sessions. Participants who run the same quiz at the same time will each receive a different random draw.

### Why use this?

- **Large question banks** — build a pool of 30–40 questions and serve a shorter, varied quiz (e.g. 10 questions) so repeat participants see different content each time
- **Timed workshops** — limit the quiz to fit a time slot without removing questions from the bank
- **Assessment fairness** — each participant gets a unique set, reducing copying

### How it works

When the quiz starts, questions are shuffled using the Fisher-Yates algorithm and the first N are selected. The order within that subset is also randomised, so two participants who happen to draw some of the same questions will still see them in a different order.

> **Tip:** The Analytics tab and Splunk SPL queries still work normally — each logged event includes the full question text, so you can see which questions were answered even when different participants received different subsets.

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

## Analytics dashboard

The built-in **📊 Analytics** tab gives you a live view of quiz results without writing any SPL.

![Analytics — KPI scorecards, leaderboard, question difficulty bars](docs/screenshots/analytics.png)

### Filters

| Filter | Options |
|---|---|
| **Time range** | Last 15 min / 1h / 4h / 24h / 7 days / 30 days / All time |
| **Quiz** | Any named quiz from the KV Store catalogue, or *All quizzes* |
| **Nickname** | Any individual player (auto-populated from the index), or *All players* |

### Panels

| Panel | What it shows |
|---|---|
| **Quiz completions** | Count of `quiz_complete` events in the selected window |
| **Unique players** | Distinct `dc(nickname)` across completed quizzes |
| **Avg score** | Mean `total_score` across all completions |
| **Top score** | Single highest score achieved |
| **Answers submitted** | Total `ponypoll_answer` event count |
| **🏆 Leaderboard** | Top 20 players ranked by best score, with 🥇🥈🥉 medals and proportional score bars |
| **📊 Question difficulty** | Each question's % correct and avg points, colour-coded: 🟢 ≥70% / 🟡 ≥40% / 🔴 <40% |
| **🕒 Recent sessions** | Last 50 `quiz_start` / `quiz_complete` events with timestamp, player, score |

### How it works

The Analytics tab uses Splunk's `search/jobs` REST endpoint in **oneshot mode** — it posts SPL directly from the browser and renders results in React. No custom Python required.

---

## Splunk search examples

**All answers for a session:**
```spl
index=ponypoll session_id="<id>" | table _time nickname question answer correct points
```

**Leaderboard (best score per player):**
```spl
index=ponypoll sourcetype=ponypoll_attempt event=quiz_complete
| stats max(total_score) as best_score, count as runs by nickname
| sort -best_score
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

## Roles & Permissions

The app ships two custom Splunk roles defined in `authorize.conf`:

| Role | Inherits from | Purpose |
|---|---|---|
| `ponypoll_admin` | `admin` | Edit questions, quizzes, config; view analytics |
| `ponypoll_user` | `user` | Take the quiz and submit answers only |

### Default access without role assignment

All built-in Splunk roles already work out of the box:

| Splunk role | Effective access |
|---|---|
| `admin` / `sc_admin` | Full quiz administration |
| `power` | Full quiz administration |
| `user` | Take the quiz (read questions, submit answers) |
| Any authenticated user | Take the quiz |

### When to assign the custom roles

- Assign **`ponypoll_admin`** to a `power` or `user` account that should be able to manage quizzes without being a full Splunk admin.
- Assign **`ponypoll_user`** to any account that should only be able to take the quiz, even if that account has broader Splunk rights.

### Assign a role in Splunk Web

**Settings → Users and authentication → Roles → Edit role → Assign to users**  
or via REST:
```bash
curl -k -u admin:password https://splunk-host:8089/services/authentication/users/alice \
  -d "roles=ponypoll_admin"
```

### Permission matrix

| Object | Read | Write |
|---|---|---|
| KV Store — questions, config, quizzes | Everyone | `ponypoll_admin`, `admin`, `sc_admin`, `power` |
| `ponypoll` index (submit answers) | Admins | Everyone (authenticated) |

---

## Tech stack

| Layer | Technology |
|---|---|
| Splunk app | Splunk XML views, Mako templates, KV Store, `receivers/simple`, `search/jobs` |
| Frontend | React 16, styled-components v5 |
| Build | Webpack 5, Babel, Yarn |
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
