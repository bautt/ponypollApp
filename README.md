<div align="center">
  <img src="src/package/appserver/static/buttercup.png" alt="Buttercup mascot" width="160" />
  <img src="src/package/appserver/static/appIcon_240.png" alt="Pony Poll app icon" width="96" style="margin-left:24px" />

  # Pony Poll

  **Interactive quiz app for Splunk — no extra infrastructure needed**

  ![version](https://img.shields.io/badge/version-1.3.30-blue)
  ![Splunk](https://img.shields.io/badge/Splunk-≥8.x-orange)
  ![AppInspect](https://img.shields.io/badge/AppInspect-approved-green)
  ![React](https://img.shields.io/badge/React-16-61dafb)

</div>

Pony Poll turns any Splunk instance into a live interactive quiz. Participants join through the Splunk Web UI, enter a nickname, and answer timed questions with instant scoring and feedback. All answers are stored as native Splunk events — no external database or middleware required.

Wondering why there is a pony? Meet Buttercup in Splunk's own story: [The Story of Buttercup, the Splunk Pwny](https://www.splunk.com/en_us/blog/splunklife/the-story-of-buttercup-the-splunk-pwny.html).

---

## Quick start

```
Install app → create questions in the Editor → share the /play URL → watch answers flow into Splunk
```

| Goal | Where to go |
|---|---|
| Run a self-paced quiz | **Poll** tab → nickname → Start |
| Host a live synchronized session | **Admin** tab → pick quiz → Synchronized → Start |
| Build or edit questions | **Editor** tab — 6 question types, drag-to-reorder, images |
| Import a ready-made quiz | Editor → **Library** (bundled) or **GitHub** (live sync) |
| Analyse results | **Analytics** tab — leaderboard, KPIs, difficulty breakdown, session filter |
| Install | Upload `ponypollapp.tar.gz` in **Apps → Manage Apps** |

---

## Screenshots

### Poll — participant view

| Start screen | Question with image | Wrong answer reveal |
|---|---|---|
| ![Poll — start screen, pony mascot, nickname field](docs/screenshots/start.png) | ![Poll — timed question with image, answer choices](docs/screenshots/participant-question.png) | ![Poll — incorrect answer highlighted, explanation shown](docs/screenshots/participant-reveal-wrong.png) |

Music and sound effect toggles are available directly on the start screen — no need to visit Settings first. Each participant controls their own preference independently.

![Start screen with Music and Sounds toggles below the Start Poll button](docs/screenshots/setup-audio-toggles.png)

### Admin — quiz control room

| Quiz active — QR code for participants | Question range selected |
|---|---|
| ![Admin — active quiz, QR code and URL for participants](docs/screenshots/host-idle.png) | ![Admin — Questions: From # – #, inputs showing 1–12 of 42](docs/screenshots/host-idle-range.png) |

### Admin — lobby (waiting for participants)

The session number is displayed prominently so the host can announce it to the room.

| Waiting for participants | First participant joined |
|---|---|
| ![Admin lobby — session number, QR code, 0 joined](docs/screenshots/host-lobby.png) | ![Admin lobby — 1 joined, Launch Quiz button active](docs/screenshots/host-lobby-joined.png) |

### Editor

| Editing a question | Quiz Library — Bundled | Quiz Library — GitHub |
|---|---|---|
| ![Editor — single-answer question, answer choices, explanation](docs/screenshots/editor-question.png) | ![Editor — Quiz Library modal, bundled quizzes](docs/screenshots/editor-library.png) | ![Editor — Quiz Library modal, live GitHub quizzes](docs/screenshots/editor-library-github.png) |

### Analytics

![Analytics — KPI scorecards, leaderboard, question difficulty table, recent sessions](docs/screenshots/analytics.png)

### Settings

![Settings — default view toggle, poll title, audio toggles, version info](docs/screenshots/settings.png)

The built-in **System Check** runs automatically when you open Settings and verifies that all required Splunk components are working: KV Store read/write access, `ponypoll` index existence and data, and answer submission via `receivers/simple`.

![System Check — all checks passing with event count](docs/screenshots/settings-system-check.png)

The **Quiz music** and **Sound effects** toggles let each participant enable or disable background music and SFX independently. The preference is stored per browser. See [Music Credits](#music-credits) for track attribution.

![Settings — default view, poll title, audio toggles, system check](docs/screenshots/settings-music.png)

---

## Features

| Feature | Detail |
|---|---|
| **6 question types** | Single correct · Multiple correct · Yes / No · Free text · Slider / Rating · Word cloud |
| **Synchronized host mode** | Presenter controls pace; sessions auto-numbered `00001`, `00002`, …; server-authoritative timer; answer distribution + explanation callout + per-question leaderboard |
| **Self-paced mode** | Each participant runs at their own speed |
| **Admin tab** | Unified control room for both modes — includes QR code, short URL, session badge |
| **Editor** | WYSIWYG question editor — 6 types, drag-to-reorder, image support, explanations |
| **Quiz library** | Bundled quizzes importable with one click; **GitHub** button syncs latest quizzes live |
| **Export / Import** | JSON file per quiz — portable between any Splunk instances |
| **Random question subset** | Play N random questions from a larger pool each session |
| **Analytics** | KPI scorecards, leaderboard, per-question difficulty, recent sessions — no SPL needed |
| **KV Store backed** | Questions, quizzes, config, and session state in Splunk KV Store |
| **No extra infrastructure** | Events written directly via `receivers/simple`; no Python scripts or sidecars |
| **Participant permissions** | `ponypoll_user` role ships with `edit_tcp` + `edit_kvstore` so non-admin users can play |
| **Quiz music** | Lobby, question, and win music from OpenGameArt.org (CC0); toggle per browser in Settings |

---

## Installation

### Step 1 — Download

Go to the [**Releases page**](https://github.com/bautt/ponypollApp/releases/latest) and download **`ponypollapp.tar.gz`**.

### Step 2 — Install in Splunk

1. Log in to Splunk Web as an administrator.
2. Click the **gear icon** next to "Apps", or go to **Apps → Manage Apps**.
3. Click **Install app from file** (top-right).
4. Select the downloaded tarball and click **Upload**.
5. Restart Splunk if prompted.

> **Splunk Cloud:** Use the self-service app install in the Admin Console, or contact your Splunk admin.

### Step 3 — First run

1. Open **Pony Poll** — you land on the **Poll** tab.
2. Go to the **Editor** tab and create your first question, or click **Library** to import a pre-built quiz.
3. Go to the **Admin** tab, pick a quiz, and click **Activate for Self-paced** (or start a Synchronized session).
4. Share the **Play URL** with participants.

### Two entry points

| URL | Who it's for | What they see |
|---|---|---|
| `/app/ponypollapp/poll` | Host / presenter | Full app — Poll, Editor, Analytics, Settings |
| `/app/ponypollapp/play` | Participants | Quiz only — nickname input, questions, score |

Share `/play` with your audience. Both URLs appear in the Splunk navigation bar.

**Getting back to the admin app when Play is the default view:**

| Method | How |
|---|---|
| **Admin link** | Hover the bottom-right corner of `/play` |
| **URL bypass** | Navigate to `/app/ponypollapp/poll?admin` — skips the redirect for that session |

### Requirements

| Requirement | Notes |
|---|---|
| Splunk Enterprise ≥ 8.x | KV Store must be enabled (requires a valid non-free license) |
| Splunk Cloud | Tested and working — AppInspect approved |
| Browser | Any modern browser (Chrome, Firefox, Edge, Safari) |

> No Node.js, Python, or build tools are needed to run the app — the pre-built JavaScript bundle is included in the tarball.

---

## Admin tab — running a quiz

### Self-paced mode

```
Admin tab → pick a quiz → Mode: Self-paced → Activate for Self-paced
  → participants open /play and run the quiz at their own pace
```

### Synchronized mode

The host controls the question flow for everyone simultaneously.

```
Admin tab → pick a quiz → Mode: Synchronized → Start Synchronized Session
  → a session number is auto-assigned (00001, 00002, …)
  → participants scan the QR code or open /play
  → they see the session number, enter a nickname, and appear in the lobby
  → host clicks Launch Quiz (N joined)
  → questions advance on the host's command — all participants see the same question at the same second
  → host clicks Reveal Answers → distribution bars + explanation + interim leaderboard shown to all
  → host clicks Next Question … repeat until done
  → final podium shown to all participants
  → Start New Session returns to the control room
```

### Key features

| Feature | Detail |
|---|---|
| **Auto-numbered sessions** | Sessions named `00001`, `00002`, … automatically — no manual entry needed |
| **Session visibility** | Number shown prominently on every admin panel and on the participant lobby screen |
| **"Tell participants" cue** | JoinInfo panel shows `Tell participants: session #NNNNN` next to the QR code |
| **Server-authoritative timer** | All clients compute remaining time from `question_started_at` in KV Store — no clock drift |
| **Answer distribution** | Horizontal bars per option shown after reveal on both host and participant screens |
| **Explanation callout** | Optional "why" text per question shown as a callout after reveal |
| **Podium** | Top 3 players shown on a visual podium at the end of a synchronized session |
| **Random question subset** | Choose how many questions to play at session-start |
| **Auto-switch on /play** | The `/play` URL detects a live sync session every 1.5 s — participants are routed automatically |

---

## Editor

The **Editor** tab is for building and managing quiz content.

### Toolbar

| Button | Action |
|---|---|
| **Drag handle** | Drag questions to reorder — order is auto-saved |
| **Delete** | Delete the selected question (with confirmation) |
| **Export** | Download the current quiz as a JSON file |
| **Import** | Load questions from a JSON file (Replace or Append) |
| **Library** | Import a bundled pre-built quiz |
| **GitHub** | Sync and import quizzes from the GitHub repository |

### Question fields

| Field | Notes |
|---|---|
| **Question text** | The question shown to participants |
| **Type** | Single · Multi · Yes/No · Free text · Slider · Word cloud |
| **Time limit** | Countdown in seconds |
| **Image** | Optional image URL displayed above the question |
| **Answers** | Options with correct marking (not for slider / freetext) |
| **Explanation** | Optional "why" text shown as a callout after reveal |

Each question is saved individually to KV Store — there is no "Save All".

---

## Analytics

The **Analytics** tab gives a live view of results without writing any SPL.

![Analytics — filters, KPI scorecards, leaderboard, question difficulty table, recent sessions](docs/screenshots/analytics.png)

### Filters

| Filter | Options |
|---|---|
| **Time range** | Last 15 min / 1h / 4h / 24h / 7 days / 30 days / All time |
| **Quiz** | Any quiz, or *All quizzes* |
| **Session** | Any session number, or *All sessions* — defaults to the most recent |
| **Nickname** | Any individual player, or *All players* |

### Panels

| Panel | What it shows |
|---|---|
| **Quiz completions** | Count of `quiz_complete` events |
| **Unique players** | Distinct nicknames across completed quizzes |
| **Avg / Top score** | Mean and single highest `total_score` |
| **Answers submitted** | Total `ponypoll_answer` event count |
| **Leaderboard** | Top 20 players ranked by best score, with gold/silver/bronze medals |
| **Question difficulty** | % correct and avg points per question |
| **Recent sessions** | Last 50 session events with timestamp, player, score |

A matching **Splunk dashboard** (Simple XML) is also available at `/app/ponypollapp/analytics_dashboard` for further SPL-level analysis.

---

## Quiz library & GitHub sync

### Bundled quizzes

| Quiz | Questions | Topics |
|---|---|---|
| [Splunk4Champions2 — Full Workshop Quiz](quizzes/splunk4champions2-workshop.json) | 42 | SmartStore, buckets, tstats, search modes, lookups, CIM, Dashboard Studio, SPL optimisation — all 6 question types |
| [Splunk4Champions — Advanced Topics](quizzes/splunk4champions.json) | 22 | tstats, buckets, bloom filters, Dashboard Studio, SmartStore, search performance |
| [Splunk Basics](quizzes/splunk-basics.json) | 15 | Components, ports, SPL commands, data lifecycle, forwarders, KV Store |
| [Greek Mythology Trivia](quizzes/greek-mythology.json) | 47 | Mythology questions with Wikimedia artwork images |

### Adding quizzes to the library

1. Create a JSON file in `quizzes/` following the [JSON schema](#importexport-json-format)
2. Add an entry to `quizzes/manifest.json`
3. Copy the file to `src/package/appserver/static/quizzes/`
4. Run `make build` — webpack copies static files automatically
5. Commit and push — the GitHub sync button serves the new quiz without a new app deployment

Created an interesting quiz and want to share it with others? Open a GitHub issue or contact the project maintainer.

---

## Question types reference

| Type | How it works | Scoring |
|---|---|---|
| `single` | One correct answer from up to 4 options | Speed bonus: 500–1000 pts |
| `multi` | Multiple correct answers — all must match | Speed bonus: 500–1000 pts |
| `yesno` | Yes or No | Speed bonus: 500–1000 pts |
| `freetext` | Open text, stored as-is | 100 pts for any non-empty answer |
| `slider` | Numeric range (configurable min/max/step/unit) | 50 pts for participation |
| `wordcloud` | Participants submit up to N words during the time limit; host sees a live SVG word cloud sized by frequency | 100 pts for any non-empty submission |

---

## Import/Export JSON format

The exported JSON is an array of question objects.

```json
[
  {
    "text": "Question text shown to participants",
    "type": "single | multi | yesno | freetext | slider | wordcloud",
    "timeLimit": 30,
    "explanation": "Optional 'why' shown after the answer is revealed",
    "options": [ { "id": "A", "text": "...", "correct": true } ],
    "sliderMin": 1, "sliderMax": 10, "sliderStep": 1, "sliderUnit": "",
    "wordcloudMaxWords": 7, "wordcloudMaxChars": 32
  }
]
```

<details>
<summary>Full field reference</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `text` | string | **yes** | Question text |
| `type` | string | **yes** | `single`, `multi`, `yesno`, `freetext`, `slider`, or `wordcloud` |
| `timeLimit` | number | no | Countdown in seconds (default: `30`) |
| `explanation` | string | no | "Why" callout shown after reveal |
| `options` | array | for `single`/`multi`/`yesno` | `[{ "id": "A", "text": "...", "correct": true }]` |
| `sliderMin/Max/Step` | number | for `slider` | Range and step (defaults: 1, 10, 1) |
| `sliderUnit` | string | for `slider` | Label shown next to value, e.g. `"/10"` |
| `wordcloudMaxWords` | number | for `wordcloud` | Max words per participant (default: 7, range: 1–20) |
| `wordcloudMaxChars` | number | for `wordcloud` | Max chars per word chip (default: 32, range: 4–64) |

> `_key` and `quiz_id` are stripped on export and regenerated on import — JSON files are fully portable.

</details>

<details>
<summary>One example per question type</summary>

**single**
```json
{
  "text": "In Splunk Metrics, dimensions are…",
  "type": "single",
  "timeLimit": 25,
  "explanation": "Dimensions are key-value metadata pairs stored alongside metric measurements (e.g. host=web01, region=eu-west). Metric values themselves are numeric measurements under dot-separated names.",
  "image": "",
  "options": [
    {
      "id": "A",
      "text": "Numeric measurement values at a point in time",
      "correct": false
    },
    {
      "id": "B",
      "text": "Dot-separated segments of a metric name",
      "correct": false
    },
    {
      "id": "C",
      "text": "Key-value pairs that add contextual metadata to a measurement",
      "correct": true
    },
    {
      "id": "D",
      "text": "Index configuration parameters in indexes.conf",
      "correct": false
    }
  ]
}
```

**multi**
```json
{
  "text": "Which are Splunk search commands? (Select all that apply)",
  "type": "multi", "timeLimit": 40,
  "options": [
    { "id": "A", "text": "stats",     "correct": true  },
    { "id": "B", "text": "timechart", "correct": true  },
    { "id": "C", "text": "WHERE",     "correct": false },
    { "id": "D", "text": "table",     "correct": true  }
  ]
}
```

**yesno**
```json
{
  "text": "Was the installation straightforward?",
  "type": "yesno", "timeLimit": 20,
  "options": [
    { "id": "A", "text": "Yes", "correct": true  },
    { "id": "B", "text": "No",  "correct": false }
  ]
}
```

**freetext**
```json
{ "text": "What is your favourite Splunk feature?", "type": "freetext", "timeLimit": 60, "options": [] }
```

For a graded freetext question, list accepted answers in `options` with `correct: true`. Matching is case-insensitive; `*` is a wildcard for zero or more characters, so `"text": "splunk*"` matches "splunk", "splunkbase", "splunk cloud". An empty `options` array makes the question open-ended (any non-empty answer gets a participation score).

**slider**
```json
{
  "text": "Rate your confidence with Splunk (1 = beginner, 10 = expert)",
  "type": "slider", "timeLimit": 30, "options": [],
  "sliderMin": 1, "sliderMax": 10, "sliderStep": 1, "sliderUnit": "/10"
}
```

**wordcloud**
```json
{
  "text": "Name one thing Splunk does better than anything else",
  "type": "wordcloud", "timeLimit": 30,
  "wordcloudMaxWords": 7, "wordcloudMaxChars": 32
}
```

</details>

---

## Configuration

All settings are in the **Settings** tab inside the app.

| Setting | Default | Description |
|---|---|---|
| Poll title | `Pony Poll` | Shown on the start screen |
| Default view | `Poll` | Switch to `Play` to make `/play` the default entry point |

> **Active quiz** is set from the **Admin** tab — pick a quiz and click **Activate for Self-paced**.

Settings are stored in the `ponypoll_config` KV Store collection.

Answer, attempt and presence events are always written to the `ponypoll` index (created by this app's `indexes.conf`). The sourcetype distinguishes the event class: `ponypoll_answer`, `ponypoll_attempt`, `ponypoll_presence`.

---

## Roles & permissions

The app ships two custom roles:

| Role | Inherits from | Purpose |
|---|---|---|
| `ponypoll_admin` | `admin` | Edit questions, quizzes, config; view analytics |
| `ponypoll_user` | `user` | Take the quiz and submit answers only |

All built-in Splunk roles work out of the box — no role assignment required for standard installs.

### Capabilities on `ponypoll_user`

| Capability | Why it is needed |
|---|---|
| `edit_kvstore` | Write nickname into the synchronized session lobby |
| `edit_tcp` | Required by `receivers/simple` to accept events from non-admin users |

---

## Splunk SPL examples

```spl
-- All answers for a session
index=ponypoll session_id="<id>" | table _time nickname question answer correct points

-- Leaderboard (best score per player)
index=ponypoll sourcetype=ponypoll_attempt event=quiz_complete
| stats max(total_score) as best_score by nickname | sort -best_score

-- Correct rate by question
index=ponypoll type!=freetext type!=slider
| stats count as total, sum(eval(correct="true")) as correct_count by question
| eval pct_correct=round(correct_count/total*100, 1) | sort -pct_correct

-- Word cloud — top terms for a question
index=ponypoll type=wordcloud question="Name one thing*"
| eval words=split(answer,",") | mvexpand words
| eval word=trim(words) | where len(word)>0
| stats count by word | sort -count | head 30
```

---

## Music Credits

Quiz music is played during the lobby, questions, and win screen. All tracks are from [OpenGameArt.org](https://opengameart.org) and are freely licensed (CC0 / public domain).

| Track | Used for | Author | Source |
|---|---|---|---|
| Bossa Nova ("8bit Bossa") | Lobby / setup | Joth | [opengameart.org/content/bossa-nova](https://opengameart.org/content/bossa-nova) |
| Along the Way | Questions / countdown | congusbongus | [opengameart.org/content/along-the-way](https://opengameart.org/content/along-the-way) |
| Win Music #1 (track 1-3) | Win / results | commissioned by OpenGameArt | [opengameart.org/content/win-music-1](https://opengameart.org/content/win-music-1) |

Music can be toggled on or off per browser in **Settings → Quiz music**.

---

## License

MIT — see [LICENSE](LICENSE).

> For developer documentation — build setup, architecture, file structure, key functions, and contribution guide — see [DEVELOPMENT.md](DEVELOPMENT.md).

---

*Built with Splunk, React, and Buttercup.*
