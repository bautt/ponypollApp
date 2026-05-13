# Pony Poll — Developer Guide

This document covers everything needed to understand, modify, build, and contribute to Pony Poll: app philosophy, project structure, file-by-file reference, key functions, data flow, and development workflow.

For end-user documentation, see [README.md](README.md).

---

## Table of Contents

1. [Philosophy & design decisions](#philosophy--design-decisions)
2. [Tech stack](#tech-stack)
3. [Prerequisites & setup](#prerequisites--setup)
4. [Project structure](#project-structure)
5. [Splunk app skeleton](#splunk-app-skeleton-srcpackage)
6. [React frontend](#react-frontend-srcweb)
7. [Key functions reference](#key-functions-reference)
8. [Data flow & API surface](#data-flow--api-surface)
9. [KV Store collections](#kv-store-collections)
10. [Synchronized session protocol](#synchronized-session-protocol)
11. [Build system](#build-system)
12. [Development workflow](#development-workflow)
13. [Adding a new question type](#adding-a-new-question-type)
14. [Adding quizzes to the library](#adding-quizzes-to-the-library)
15. [Changelog](#changelog)
16. [Contributing](#contributing)

---

## Philosophy & design decisions

### No backend code

Pony Poll has zero Python custom commands and zero server-side logic beyond what Splunk provides natively. Every operation is:

- **KV Store REST API** — for persistent state (questions, quizzes, config, session, presence)
- **`receivers/simple`** — for writing answer events into the Splunk index
- **`search/jobs` (oneshot)** — for analytics SPL queries from the React frontend

This means the app deploys as a single tarball with no pip installs, no sidecar processes, and no external databases. If Splunk is running, the app works.

### Splunk as the database

Rather than an external DB, all structured data lives in KV Store collections. Splunk events are the analytics layer — every quiz answer is a real Splunk event and can be explored with SPL independently of the app. This means the app's own analytics can be reproduced, extended, or replaced entirely in Splunk dashboards.

### React as a Splunk page

The frontend is a full React single-page application embedded in a Mako template (`poll.html`). Splunk renders the page shell and handles authentication; React takes over from the mount point. There is no server-side rendering, no Splunk SplunkJS SDK, and no Splunk UI Toolkit components — the app uses its own styled-components design system for full control over UX.

### Two distinct URL entry points

- `/poll` — the host/admin view, full navigation bar, all tabs
- `/play` — the participant view, stripped UI, no navigation

The same React bundle handles both. `App.jsx` reads `window.PONYPOLL_MODE` (injected by the Mako template) and renders either `PlayApp` or `FullApp`. This keeps the bundle unified while allowing the server to configure the experience per URL.

### No "Save All" in the Editor

Questions are saved individually on every edit. There is no submit button and no unsaved-changes warning. Each field blur triggers a KV Store PATCH. This avoids the common workshop failure mode of a participant closing the tab before saving.

### Session state as a broadcast channel

The synchronized session uses a single KV Store document (`ponypoll_session/active`) as a shared broadcast channel. The host writes; all participants poll every ~1.5 seconds and react to phase transitions. This is simple, requires no WebSockets, and works through any Splunk Web proxy.

---

## Tech stack

| Layer | Technology | Why |
|---|---|---|
| Splunk app | Python-free; XML views, Mako templates | No pip installs, AppInspect clean |
| State / persistence | Splunk KV Store REST API | Native to Splunk; no extra DB |
| Event ingestion | `services/receivers/simple` | Works for non-admin users with `edit_tcp` |
| Analytics queries | `services/search/jobs` (oneshot) | SPL queries from the browser |
| Frontend framework | React 16 | Stable, widely understood |
| Styling | styled-components v5 | Scoped CSS, theme tokens, no class collisions |
| Build | Webpack 5, Babel, Yarn | Standard Splunk app build toolchain |
| Icons | Inline SVG (custom, monochrome) | No external icon font dependency; consistent greyscale style |

---

## Prerequisites & setup

| Requirement | Notes |
|---|---|
| Node.js ≥ 16 + Yarn | Frontend build only |
| `make` | Convenience build targets |
| Splunk Enterprise ≥ 8.x (local or remote) | For testing |
| A Splunk index named `ponypoll` | Created automatically by `indexes.conf` |

```bash
git clone https://github.com/bautt/ponypollApp.git
cd ponypollApp/src
yarn install        # install all JS dependencies
make build          # production webpack build → dist/
make package        # create ponypollapp.tar.gz
```

Install the tarball via **Apps → Manage Apps → Install app from file** in Splunk Web.

---

## Project structure

```
ponypollApp/
├── Makefile                    # build and package shortcuts
├── README.md                   # end-user documentation
├── DEVELOPMENT.md              # this file
├── quizzes/                    # bundled quiz JSON files + manifest.json
│   ├── manifest.json           # quiz catalogue (id, filename, description)
│   ├── splunk4champions2-workshop.json
│   ├── splunk4champions.json
│   ├── splunk-basics.json
│   └── greek-mythology.json
├── docs/
│   └── screenshots/            # README screenshots (processed for privacy)
└── src/
    ├── package.json            # JS dependencies and scripts
    ├── webpack.config.mjs      # Webpack 5 config
    ├── package/                # Splunk app skeleton (copied verbatim into dist/)
    │   ├── app.manifest
    │   ├── appserver/
    │   │   ├── static/         # pre-built JS bundle, icons, mascot image, quiz JSONs
    │   │   └── templates/
    │   │       └── poll.html   # Mako template — React mount point for both /poll and /play
    │   └── default/
    │       ├── app.conf        # app identity, version, Python version
    │       ├── authorize.conf  # ponypoll_admin and ponypoll_user role definitions
    │       ├── collections.conf # KV Store collection schemas
    │       ├── indexes.conf    # ponypoll index definition
    │       ├── props.conf      # sourcetype extraction for ponypoll_answer / ponypoll_attempt
    │       ├── web.conf        # Splunk Web proxy endpoint stanzas
    │       └── data/ui/views/
    │           ├── poll.xml    # host/admin view (sets mode=poll in Mako)
    │           ├── play.xml    # participant view (sets mode=play in Mako)
    │           └── analytics_dashboard.xml  # Simple XML analytics dashboard
    └── web/                    # React frontend source
        ├── index.js            # Webpack entry point — mounts <App /> into #root
        ├── App.jsx             # Root component; nav, tab routing, seed logic
        ├── lib/
        │   ├── kvstore.js      # All REST API calls (KV Store, receivers, search)
        │   ├── questions.js    # Question model, type definitions, seed data
        │   ├── theme.js        # Design tokens (colours, fonts)
        │   └── utils.js        # Shared utilities (scoring, shuffle, sanitize)
        ├── components/
        │   ├── Timer.jsx       # Countdown ring displayed during questions
        │   └── DistBars.jsx    # Horizontal answer distribution bars (post-reveal)
        └── pages/
            ├── PollPage/       # Self-paced quiz runner (participant)
            ├── SyncPollPage/   # Synchronized participant view
            ├── AdminPage/      # Host control room
            ├── EditorPage/     # Question and quiz editor
            ├── AnalyticsPage.jsx
            └── SettingsPage.jsx
```

---

## Splunk app skeleton (`src/package/`)

### `default/app.conf`

Defines app identity, display name, Python version (`python3`), and the version number. **Bump `[launcher] version` and `[id] version` on every release.**

### `default/collections.conf`

Declares all five KV Store collections with their field types. Any field used in queries must be declared here — undeclared fields are stored but cannot be used in `query=` filters efficiently.

### `default/indexes.conf`

Creates the `ponypoll` index with a 90-day retention. Can be overridden by the admin in the Settings tab (stored in config, used as the `index=` parameter on `receivers/simple` calls).

### `default/web.conf`

Contains `[expose:...]` stanzas that tell Splunk Web to proxy the `storage/collections/data/*`, `services/receivers/simple`, `services/search/jobs`, and `services/authentication/current-context` endpoints through `splunkd/__raw/`. Without these, CORS blocks browser-to-splunkd calls.

### `default/authorize.conf`

Defines `ponypoll_user` (inherits `user`, adds `edit_tcp` + `edit_kvstore`) and `ponypoll_admin` (inherits `admin`). The `edit_tcp` capability is required for `receivers/simple` to accept POST requests from non-admin authenticated users.

### `default/props.conf`

Extracts `json` fields automatically from `ponypoll_answer` and `ponypoll_attempt` sourcetypes so that all event fields are searchable without manual field extraction.

### `appserver/templates/poll.html`

Mako template shared by both the `/poll` and `/play` views. Injects:

```html
<script>window.PONYPOLL_MODE = '${mode}';</script>
```

where `mode` is set by the corresponding `poll.xml` or `play.xml` view. React reads this to decide whether to render `FullApp` or `PlayApp`.

---

## React frontend (`src/web/`)

### `index.js`

Webpack entry point. Finds the `#root` div injected by `poll.html` and calls `ReactDOM.render(<App />)`.

### `App.jsx`

Root component. Responsibilities:

- **Mode detection** — reads `window.PONYPOLL_MODE` to choose between `PlayApp` (participant) and `FullApp` (host).
- **Tab routing** — hash-based (`#poll`, `#host`, `#analytics`, `#editor`, `#settings`). `tabFromHash()` reads the hash and validates against `VALID_TAB_IDS`.
- **Default view redirect** — on `/poll`, checks `config.default_view`; if `'play'`, redirects to `/play` (bypassed with `?admin`).
- **First-install seed** — `useSeedOnFirstInstall()` creates a "Sample Quiz" with a handful of demo questions if no quizzes exist.
- **Error boundaries** — `ErrorBoundary` class component wraps each tab so a crash in one tab doesn't crash the whole app. Shows inline "Retry" button in compact mode, full-page error otherwise.
- **Sync detection in PlayApp** — polls `getSession()` every 4 seconds; shows `SyncPollPage` when a session is live, otherwise `PollPage`.

### `lib/theme.js`

Central design token file. Exports:

- `C` — colour constants (`C.surface`, `C.blue`, `C.border`, `C.muted`, `C.red`, etc.)
- `FONTS` — font-family stack

All styled-components reference `C.*` rather than hardcoded hex values.

### `lib/questions.js`

Question model and utilities:

- `QUESTION_TYPES` — array of type descriptors (`{ id, label, hasOptions, hasCorrect, hasSlider, hasWordcloud }`)
- `defaultQuestion(type)` — returns a blank question skeleton for a given type
- `toKvDoc(q)` — strips UI-only fields and prepares a question for KV Store storage
- `fromKvDoc(doc)` — hydrates a KV Store document back into a question with UI defaults
- `SEED_QUESTIONS` — 3–4 demo questions shown on first install

### `lib/utils.js`

- `shuffle(arr)` — Fisher-Yates in-place shuffle (used for random question subsets)
- `sanitizeId(str)` — strips non-alphanumeric characters from quiz/session IDs before embedding them in SPL strings (injection prevention)
- `scoreAnswer(question, answer, elapsed, timeLimit)` — calculates points for a submitted answer (speed bonus for single/multi/yesno, flat points for freetext/slider/wordcloud)

---

## Key functions reference

### `lib/kvstore.js` — REST API layer

All calls go through the Splunk Web proxy at `/{locale}/splunkd/__raw/...` using the user's existing session cookie (no separate auth). The CSRF token is read from `splunkweb_csrf_token_*` in `document.cookie` and sent as `X-Splunk-Form-Key`.

| Function | Signature | What it does |
|---|---|---|
| `localePrefix()` | `() → string` | Infers `/en-US` (or locale) from the page URL for proxy path construction |
| `csrfToken()` | `() → string` | Reads the CSRF token from the Splunk session cookie |
| `kvFetch(url, opts)` | `async (string, object) → any` | Base fetch wrapper; adds auth headers, parses JSON, normalises Splunk errors |
| `listQuizzes()` | `async () → Quiz[]` | GET all quizzes sorted by `created_at` |
| `createQuiz(name)` | `async (string) → Quiz` | POST new quiz document |
| `renameQuiz(key, name)` | `async (string, string) → void` | POST partial update to quiz name |
| `getQuiz(key)` | `async (string) → Quiz\|null` | GET single quiz by `_key`; returns null on 404 |
| `updateQuiz(key, doc)` | `async (string, object) → void` | POST full quiz document update |
| `deleteQuiz(key)` | `async (string) → void` | DELETE all questions for the quiz, then DELETE the quiz record |
| `listQuestions(quizId)` | `async (string) → Question[]` | GET questions filtered by `quiz_id`, sorted by `sort_order` |
| `saveQuestion(doc)` | `async (doc) → Question` | POST create or update a single question (upsert by `_key`) |
| `saveAllQuestions(questions, quizId)` | `async (array, string) → void` | DELETE all existing questions for the quiz, then `batch_save` the new list |
| `deleteQuestion(key)` | `async (string) → void` | DELETE a single question |
| `loadConfig()` | `async () → Config` | GET `ponypoll_config/default`; cached in memory for 60 s with coalesced inflight requests |
| `saveConfig(cfg)` | `async (object) → void` | POST config; falls back to create if document doesn't exist; invalidates cache |
| `getCurrentUser()` | `async () → string` | GET current Splunk username from `authentication/current-context` |
| `getVersionInfo()` | `async () → { splunkVersion, appVersion }` | GET Splunk and app version from REST API in parallel |
| `fetchLibraryManifest()` | `async () → Manifest` | GET `quizzes/manifest.json` from app's static files |
| `fetchLibraryQuiz(filename)` | `async (string) → Question[]` | GET a specific bundled quiz JSON from static files |
| `fetchGitHubManifest()` | `async () → Manifest` | GET manifest directly from GitHub (requires internet access) |
| `fetchGitHubQuiz(filename)` | `async (string) → Question[]` | GET a specific quiz JSON directly from GitHub |
| `submitAnswer(eventData)` | `async (object) → void` | POST event to `receivers/simple` with `sourcetype=ponypoll_answer`. Index resolved via `getPollIndex()`. |
| `submitQuizAttempt(eventData)` | `async (object) → void` | POST event with `sourcetype=ponypoll_attempt` (quiz completion record). Index resolved via `getPollIndex()`. |
| `getIndexMacro()` | `async () → { definition, indexName } \| null` | GET the `ponypoll_index` Splunk search macro and parse its `index=<name>` definition. Returns `null` on any error. |
| `saveIndexMacro(name)` | `async (string) → string` | POST the `ponypoll_index` macro with `definition=index=<name>` (writes to `local/macros.conf`). Sanitises the name first; throws on invalid input. Refreshes the in-memory cache. |
| `getPollIndex()` | `async () → string` | Resolve the currently-configured bare index name (cached 60 s). Falls back to `ponypoll` if the macro is missing/unreachable. |
| `invalidateIndexCache()` | `() → void` | Force-clear the `getPollIndex()` cache (e.g. after an external macro change). |
| `sanitizeIndexName(raw)` | `(string) → string \| null` | Lowercase, trim, validate against `^[a-z0-9_][a-z0-9_-]{0,79}$`. Returns null when invalid. |
| `getSession()` | `async () → Session\|null` | GET `ponypoll_session/active`; returns null if no session exists |
| `updateSession(doc)` | `async (object) → void` | POST full session document (tries update, falls back to create) |
| `joinSession(sessionId, nickname)` | `async (string, string) → void` | Write participant presence to KV Store and fire a `ponypoll_presence` event; never throws |
| `heartbeatPresence(sessionId, nickname)` | `async (string, string) → void` | Update `last_seen` timestamp in presence document (called every ~5 s) |
| `getPresence(sessionId)` | `async (string) → Presence[]` | GET all presence documents for a session (host lobby list) |
| `clearPresence(sessionId)` | `async (string) → void` | DELETE all presence documents for a session (called after session ends) |
| `runSearch(spl, opts)` | `async (string, options) → Result[]` | POST oneshot search job; returns `json.results` array |

---

## Pages reference

### `pages/PollPage/`

Self-paced participant quiz runner.

| File | Purpose |
|---|---|
| `index.jsx` | Entry; loads config and active quiz questions on mount; manages overall quiz state (`setup` → `active` → `done`) |
| `SetupScreen.jsx` | Nickname input + Start button |
| `ActiveScreen.jsx` | Renders one question at a time; manages per-question timer, answer submission via `submitAnswer()`; advances on timer expiry or answer selection |
| `DoneScreen.jsx` | Final score, percentage correct, "Play again" button |
| `styles.js` | Styled-components for all three screens |

### `pages/SyncPollPage/`

Synchronized participant view. Polls `getSession()` every ~1.5 s and renders the appropriate screen based on `session.phase`.

| File | Phase it renders | Purpose |
|---|---|---|
| `index.jsx` | all | Orchestrator; polls KV Store session, derives phase, routes to screens |
| `LobbyScreen.jsx` | `lobby` | Nickname entry; calls `joinSession()` and starts heartbeat |
| `QuestionScreen.jsx` | `question` | Shows current question with server-authoritative countdown (`question_started_at` + `time_limit` from session) |
| `RevealScreen.jsx` | `reveal` | Shows correct answers, distribution bars, explanation callout, interim leaderboard |
| `DoneScreen.jsx` | `done` | Podium (top 3) + final scores |
| `styles.js` | — | Shared styled-components |

### `pages/AdminPage/`

Host control room. Manages the full session lifecycle.

| File | Purpose |
|---|---|
| `index.jsx` | Top-level; loads quiz list and config; manages overall admin state (`idle` → `lobby` → `question` → `reveal` → `done`); all KV Store writes for the session document go through here |
| `IdlePanel.jsx` | Quiz picker, mode toggle (self-paced / synchronized), question selection (All / From X–Y / Random N), Activate/Start button |
| `LobbyPanel.jsx` | Displays session number, participant list (polled via `getPresence()`), Launch button |
| `QuestionPanel.jsx` | Shows current question with live timer; Reveal Answers button |
| `RevealPanel.jsx` | Shows answer distribution and explanation; Next Question / End Session buttons |
| `DonePanel.jsx` | Session complete state; Start New Session button |
| `JoinInfo.jsx` | QR code, join URL, "Shorten URL" / "Copy URL" buttons (shown in lobby and during session) |
| `WordCloud.jsx` | Renders a live SVG word cloud from word-frequency data (host view only) |
| `styles.js` | Styled-components |

### `pages/EditorPage/`

Question and quiz editor.

| File | Purpose |
|---|---|
| `index.jsx` | Loads quiz list and questions; manages drag-to-reorder (HTML5 drag API); toolbar (export, import, Library, GitHub buttons) |
| `QuizSidebar.jsx` | Quiz list in the left rail; create, rename, delete quiz; select active quiz |
| `QuestionEditor.jsx` | Right panel; renders all question fields for the selected question; auto-saves on every field blur |
| `LibraryModal.jsx` | Modal; two tabs — "Bundled" (fetches manifest from static files) and "GitHub" (fetches manifest from GitHub raw); import replaces or appends to current quiz |
| `DistBars.jsx` | Reusable answer distribution bars component (also used in AdminPage) |
| `styles.js` | Styled-components |

### `pages/AnalyticsPage.jsx`

Single-file page. Renders filter controls (time range, quiz, session, nickname) and result panels (KPI cards, leaderboard, question difficulty table, recent sessions). Each panel issues a `runSearch()` call with a parameterised SPL query. All user-provided filter values pass through `sanitizeId()` before being embedded in SPL strings.

### `pages/SettingsPage.jsx`

Single-file page. Loads config via `loadConfig()` (poll title, default view, music/SFX toggles) and the `ponypoll_index` macro via `getIndexMacro()` (Splunk index for poll answers). Save persists changed cfg via `saveConfig()` and changed macro via `saveIndexMacro()`. Embeds the **System Check** sub-component which verifies KV read/write, macro parseability, configured index existence, event count, and `receivers/simple` write access. Also displays Splunk + app version info via `getVersionInfo()`.

### `components/Timer.jsx`

SVG ring countdown component. Props: `timeLimit` (total seconds), `remaining` (seconds left). Animates the stroke-dashoffset of a circle based on the fraction elapsed.

### `components/DistBars.jsx`

Horizontal bar chart for answer distributions. Props: `options` (array with `id`, `text`, `correct`), `counts` (map from option id to count). Colour-codes correct vs incorrect options.

---

## Data flow & API surface

```
Browser (React)
  ┌─ GET  splunkd/__raw/.../ponypoll_quizzes           quiz catalogue
  ├─ GET  splunkd/__raw/.../ponypoll_questions?...     questions for active quiz
  ├─ GET  splunkd/__raw/.../ponypoll_config/default    poll config (cached 60s)
  ├─ GET  splunkd/__raw/.../ponypoll_session/active    sync session state (polled 1.5s)
  ├─ GET  splunkd/__raw/.../ponypoll_presence?...      lobby participant list
  ├─ POST splunkd/__raw/.../ponypoll_session/active    host advances session phase
  ├─ POST splunkd/__raw/services/receivers/simple      answer event → ponypoll index
  └─ POST splunkd/__raw/services/search/jobs           analytics SPL (oneshot)

All calls go through the Splunk Web proxy defined in web.conf.
The user's session cookie provides authentication; the CSRF token
is sent as X-Splunk-Form-Key.
```

---

## KV Store collections

| Collection | Key | Fields | Notes |
|---|---|---|---|
| `ponypoll_quizzes` | auto | `name`, `created_at` | One document per quiz |
| `ponypoll_questions` | auto | `quiz_id`, `sort_order`, `type`, `text`, `timeLimit`, `options[]`, `explanation`, `imageUrl`, `sliderMin/Max/Step/Unit`, `wordcloudMaxWords/MaxChars` | `sort_order` is integer index; all CRUD via REST |
| `ponypoll_config` | `"default"` | `poll_subject`, `active_quiz_id`, `default_view` | Single document; `loadConfig()` caches with 60 s TTL. The Splunk index for events is **not** stored here — it lives in the `ponypoll_index` search macro (see `default/macros.conf`). A legacy `poll_index` field may exist in upgraded docs but is ignored. |
| `ponypoll_session` | `"active"` | `phase`, `quiz_id`, `session_id`, `question_index`, `questions[]`, `question_started_at`, `scores{}`, `answer_counts{}` | Single document; host overwrites on every transition; participants poll |
| `ponypoll_presence` | `{sessionId}_{nickname}` | `session_id`, `nickname`, `joined_at`, `last_seen` | One document per participant per session; cleared by host after session ends |

---

## Synchronized session protocol

The session uses a state machine. The `phase` field in `ponypoll_session/active` drives everything.

```
idle  ──► lobby  ──► question  ──► reveal  ──► question … ──► done
                                                            └──► idle (new session)
```

| Phase | Who writes | What happens |
|---|---|---|
| `idle` | host (on session end or clear) | No active session; participants see self-paced poll |
| `lobby` | host (Start Synchronized Session) | Session number assigned; participants poll until they see `lobby` phase; they submit nickname via `joinSession()` |
| `question` | host (Launch Quiz / Next Question) | `question_index`, `question_started_at`, `time_limit` written; participants compute remaining time client-side from `question_started_at`; timer is server-authoritative |
| `reveal` | host (Reveal Answers) | `answer_counts` written; participants show distribution bars and explanation |
| `done` | host (End Session) | Final scores; podium shown to participants |

**Session ID** is a zero-padded 5-digit number (`00001`, `00002`, …) computed by incrementing the last session number found in the `ponypoll` index via a `runSearch()` call.

---

## Build system

### `src/webpack.config.mjs`

Single Webpack configuration for both `poll` and `play` entry points. Key behaviours:

- Compiles `src/web/index.js` → `dist/appserver/static/poll.bundle.js`
- Processes `.jsx` files with Babel (`@babel/preset-react`, `@babel/preset-env`)
- Processes `.mdx` files with `@mdx-js/loader` + `remark-gfm` (not currently used but kept for future content)
- Copies everything in `src/package/` verbatim to `dist/` after each build

### `Makefile` targets

| Target | What it does |
|---|---|
| `make deps` | `yarn install` in `src/` |
| `make dev` | Webpack watch mode (`yarn dev`) — rebuilds on file changes |
| `make build` | Webpack production build → `dist/` |
| `make package` | Production build + copies `quizzes/` into static + creates `ponypollapp.tar.gz` |
| `make appinspect` | Runs Splunk AppInspect against the tarball (requires Python venv with `splunk-appinspect`) |

### Version bumping

Before every release, bump both version fields in `src/package/default/app.conf`:

```ini
[launcher]
version = 1.3.31

[id]
version = 1.3.31
```

Also update the version badge in `README.md`.

---

## Development workflow

```bash
cd src
yarn dev          # webpack watch mode — rebuilds on every save
```

After each rebuild, copy the bundle to your local Splunk install:

```bash
sudo cp dist/appserver/static/poll.bundle.js \
       /opt/splunk/etc/apps/ponypollapp/appserver/static/
```

Then open `/_bump` in your browser to clear the Splunk static file cache, or append `?cache_bust=$(date +%s)` to the app URL.

For Splunk conf changes (`app.conf`, `collections.conf`, etc.), you need to restart Splunk or reload the app:

```bash
sudo /opt/splunk/bin/splunk restart
# or for conf-only changes:
sudo /opt/splunk/bin/splunk reload deploy-server
```

---

## Adding a new question type

1. **`src/web/lib/questions.js`** — add an entry to `QUESTION_TYPES`:
   ```js
   { id: 'mytype', label: 'My Type', hasOptions: false, hasCorrect: false, hasMyField: true }
   ```
   Add the type to `defaultQuestion()` and `toKvDoc()`/`fromKvDoc()` if it has custom fields.

2. **`src/web/pages/EditorPage/QuestionEditor.jsx`** — add UI controls for any custom fields (conditionally rendered based on `question.type === 'mytype'`).

3. **`src/web/pages/PollPage/ActiveScreen.jsx`** — add a rendering branch for the new type in the question renderer.

4. **`src/web/pages/SyncPollPage/QuestionScreen.jsx`** — same as above for the synchronized participant view.

5. **`src/web/lib/kvstore.js`** → `submitAnswer()` — ensure the answer payload captures your type's data format.

6. **`src/package/default/collections.conf`** — add any new fields to the `ponypoll_questions` collection schema.

7. **`src/web/lib/utils.js`** → `scoreAnswer()` — add scoring logic for the new type.

8. Update the question types reference in `README.md`.

---

## Adding quizzes to the library

1. Create a JSON file in `quizzes/` (see [Import/Export JSON format](README.md#importexport-json-format) in the README).

2. Add an entry to `quizzes/manifest.json`:
   ```json
   {
     "id": "my-quiz",
     "filename": "my-quiz.json",
     "name": "My Quiz",
     "description": "Short description",
     "questionCount": 20
   }
   ```

3. Copy the JSON file to `src/package/appserver/static/quizzes/` (Webpack copies the whole directory during build).

4. Run `make build` or `make package`.

5. Commit and push — the **GitHub** button in the Editor fetches the manifest and quiz files directly from the `main` branch, so new quizzes become available without a new app deployment.

---

## Changelog

### v1.3.30 — UI polish & icon overhaul (2026-05-11)

- Replaced all colourful emoji icons across Admin, Analytics, Editor, and Settings pages with consistent monochrome inline SVG icons
- Flexible question selection in Admin: All / From X–Y / Random N modes with inline inputs
- Settings page: removed redundant "Active quiz" and "Random subset" sections
- New app icon (answer-grid design, 36 / 72 / 128 / 240 px); updated all `appIcon_*` static assets
- Analytics: SPL injection hardening via `sanitizeId()` on all user-supplied filter values
- Documentation: new screenshots, URL/QR privacy redaction, README rewrite, this developer guide

### v1.3.28 — Analytics Simple XML dashboard (2026-05-11)

- Replaced Dashboard Studio analytics with a Simple XML dashboard mirroring the React Analytics page
- Removed DS link from the Analytics tab

### v1.3.19 — Synchronized mode UX improvements (2026-05-11)

- Auto-numbered sessions: zero-padded 5-digit numbers (`00001`, `00002`, …)
- Session number shown prominently to both host and participants; "Tell participants" cue in lobby
- Nickname field empty by default; accent-coloured border + required hint before joining
- Analytics defaults to the latest session; sessions listed newest-first with `(latest)` tag
- Podium display at end of synchronized sessions
- Drag-to-reorder in the Editor (native HTML5 drag handles)
- Splunk4Champions2 workshop quiz: 42 questions covering all 6 types
- Version info in Settings tab

### v1.3.14 — Word cloud & participant permissions (2026-05-10)

- New `wordcloud` question type — live SVG word cloud sized by submission frequency
- `ponypoll_user` role now includes `edit_tcp` + `edit_kvstore` so non-admin users can play

---

## Contributing

1. Fork the repo and create a feature branch.
2. `cd src && yarn install && yarn dev`
3. Make changes in `src/web/` or `src/package/`.
4. `make package` and test against a local Splunk instance.
5. Bump the version in `app.conf` and `README.md`.
6. Open a pull request with a clear description of the change.

Please keep pull requests focused — one feature or fix per PR. Add or update screenshots in `docs/screenshots/` when changing visible UI. Blur any sensitive URLs in screenshots before committing.
