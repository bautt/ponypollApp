# Pony Poll — Feature Roadmap

Ideas and missing features tracked for future development.

---

## ⭐ Priority 1 — Synchronized host mode

> **Status:** ✅ Implemented in v1.3.x — `AdminPage` (host) + `SyncPollPage` (participant), `ponypoll_session` KV Store collection, SPL leaderboard. This section is retained for architectural reference.

### Concept
An optional "host drives the quiz" mode where all participants see the same question at the same time, the host controls reveal and advancement, and a live leaderboard appears between questions.

A **Settings toggle** controls the mode: `quiz_mode: "self_paced" | "synchronized"`. Self-paced stays exactly as is.

### Mechanism — KV Store as broadcast channel
Splunk has no WebSockets, but the KV Store works as a shared state document. Add a `ponypoll_session` collection with one active document:

```json
{
  "_key": "active",
  "phase": "waiting | question | reveal | done",
  "question_index": 0,
  "question_started_at": "2026-05-08T19:00:00.000Z",
  "quiz_id": "abc123"
}
```

- **Host** writes to this document (start, reveal, next, end)
- **Participants** poll it every 1–2 s via `setInterval` and react to state changes
- 20 participants × 1 poll/1.5 s ≈ 13 KV reads/s — well within Splunk limits

### Timer strategy (Option B — server-authoritative)
`question_started_at` is written when the question goes live. Participants compute:
```
remaining = timeLimit - (Date.now() - new Date(question_started_at))
```
No drift, works for late joiners, fairness guaranteed. Only ~20 extra lines over a decorative timer.

### UX flow
```
HOST SCREEN                          PARTICIPANT SCREENS
──────────────────────────────────   ──────────────────────────────────
[Quiz: Splunk Basics]                🎉 Waiting for host to start...
[12 participants connected]          Nickname: alice

[▶ Start Quiz]
       ↓ host clicks
──────────────────────────────────   ──────────────────────────────────
Q1: "What port does Splunk           Q1: "What port does Splunk
     Web use by default?"                 Web use by default?"

[18 / 12 answered] ← live count     [A] 80    [B] 443
[⏹ Reveal answers]                  [C] 8000  [D] 8089  ← timer ticking
       ↓ host clicks or timer expires
──────────────────────────────────   ──────────────────────────────────
REVEAL — correct: C (8000)           ✓ Correct! +847 pts

🏆 Top 5 so far:                     🏆 After Q1:
1. alice    847                      1. alice  847
2. bob      720                      2. bob    720
3. carol    650                      3. carol  650

[▶ Next Question]
```

### What needs building

| Component | Work |
|---|---|
| `collections.conf` | Add `ponypoll_session` collection |
| `kvstore.js` | Add `getSession()`, `updateSession()` |
| New `HostPage.jsx` | Participant count, live response counter, reveal + next buttons, mini-leaderboard between questions |
| `PollPage.jsx` (participants) | Replace self-paced state machine with polling loop; timer from `question_started_at` |
| `SettingsPage.jsx` | Add `quiz_mode` toggle |
| `App.jsx` | Route to `HostPage` when `quiz_mode = synchronized` and user is on `/poll` |

### Estimated effort
Medium — 2–3 days of focused work. No new dependencies, no infrastructure changes, no Python. Pure React + KV Store.

---

## 🎮 Gameplay & Live experience

| Feature | Why it matters |
|---|---|
| **Live leaderboard between questions** | Show top 5 scores after each reveal. Currently the leaderboard only exists in the Analytics tab post-session |
| **Synchronized host mode** | Right now everyone is self-paced. A "host advances questions" mode where all participants see the same question at the same time is much better for a live audience |
| **Podium / winner screen** | A dramatic top-3 finish with 🥇🥈🥉 after the final question, instead of just the score number |
| **Session join code** | A 4-digit PIN participants type instead of navigating to a URL — easier to show on a projector |
| **QR code for the /play URL** | One click to display a QR code on screen — participants scan and join instantly |

---

## ❓ Question capabilities

| Feature | Why it matters |
|---|---|
| **Images on questions** | Paste/upload a URL to show a picture alongside the question text — essential for geography, art, identification questions |
| **Explanation text after reveal** | Show *why* the answer is correct (like the ProProfs quiz) — great for learning |
| **Code block rendering** | For Splunk/tech quizzes, render `monospace` or syntax-highlighted code in the question — currently plain text only |
| **Ranking/ordering question type** | "Put these Splunk search commands in the correct pipeline order" |
| **Word cloud for freetext** | Instead of raw text in analytics, visualise freetext answers as a word cloud |

---

## 🖥️ Host / Presenter tools

| Feature | Why it matters |
|---|---|
| **Live participant list** | See who has joined before you start — "I can see 12 people connected, let's begin" |
| **Live response counter during question** | Host view shows "18/23 answered" in real time |
| **Pause / skip question** | Pause the timer or skip a bad/broken question mid-session |
| **PIN-protected quiz** | Prevent random people from joining an internal workshop quiz |

---

## 📊 Analytics & Results

| Feature | Why it matters |
|---|---|
| **Per-session CSV export** | Download one session's results as a spreadsheet — useful for trainers |
| **Answer distribution bar** | After reveal, show a bar chart of how many people chose each option |
| **Time-to-answer histogram** | How quickly did people answer? Useful for calibrating question difficulty |
| **Category / tag on questions** | Tag questions as "hard" / "SPL" / "architecture" and use tags to drive random subset selection |
