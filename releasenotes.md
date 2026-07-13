# Pony Poll — release notes (Splunkbase)

Copy the section for the version you are publishing. Upgrade installs are non-destructive — quizzes, KV Store data, and index events are preserved.

---

## v1.3.71 (2026-07-13)

- Added `app.manifest` for Splunk Cloud package vetting
- AppInspect cloud checks pass with no failures (KV Store `collections.conf` warning is expected)
- Documentation updates for navigation, projector shortcuts, and reveal-bar colours

---

## v1.3.70 (2026-07-13)

- Splunk wordmark in the app navigation bar — links back to Splunk home
- **Projector** shortcut in the top menu and beside **Start Synchronized Session** in Quiz Admin
- After reveal, answer distribution bars show correct options in green and wrong options in red (Admin, participant, and Projector views)

---

## v1.3.68 (2026-06)

- Projector idle and lobby screens now show the shortened participant URL when one has been created

---

## v1.3.67 (2026-06)

- Background quiz music is off by default; participants opt in via Settings

---

## v1.3.66 (2026-06)

- Fixed Editor save failing after reordering questions (“Could not find object.”)

---

## v1.3.65 (2026-06)

- **Copy from…** moved into the question editing area in the Editor

---

## v1.3.64 (2026-06-12)

- **Copy questions across quizzes** — pick a source quiz, select questions, and copy them into the current quiz or a new one
- URL shortener switched to da.gd (works on networks that block is.gd)

---

## Suggested Splunkbase text for v1.3.71 only

Use this block if Splunkbase accepts a single short note for the latest upload:

> **v1.3.71** — Splunk Cloud readiness (`app.manifest`), plus navigation improvements from v1.3.70: Splunk home link and Projector shortcuts in the menu and Quiz Admin, and green/red answer distribution bars after reveal. Non-destructive upgrade; no configuration migration required.
