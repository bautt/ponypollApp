# Pony Poll — Quiz Library

This folder contains ready-to-use quiz JSON files that can be imported directly into any Pony Poll installation.

## Available quizzes

Listed roughly in the order you'd reach for them — Splunk content first, the all-types Sample, then general-knowledge trivia.

| File | Name | Questions | Difficulty | Topics |
|---|---|---|---|---|
| [`splunk-basics.json`](splunk-basics.json) | Splunk Basics | 15 | Beginner | SPL, components, ports, data lifecycle, HEC, forwarders, KV Store |
| [`splunk4champions.json`](splunk4champions.json) | Splunk4Champions — Advanced Topics | 22 | Advanced | tstats, buckets, bloom filters, Dashboard Studio, SmartStore, search performance, metrics |
| [`splunk4champions2-workshop.json`](splunk4champions2-workshop.json) | Splunk4Champions2 — Full Workshop Quiz | 42 | Advanced | Bucket internals, data pipeline, search modes, tstats, metrics, XML & Studio dashboards, tokens, drilldown, Phyphox, Analytics Workspace |
| [`splunk-ai.json`](splunk-ai.json) | Splunk AI — AI Toolkit, DSDL, MCP & Hosted Models | 34 | Intermediate | AI Toolkit (MLTK), DSDL, Splunk MCP Server, Hosted AI Models, `\|ai` command, LLM providers |
| [`splunk-soar.json`](splunk-soar.json) | Splunk SOAR — Orchestration, Automation & Response | 24 | Intermediate | SOAR acronym, MTTD/MTTR, apps & assets, containers & artifacts, labels, Visual Playbook Editor blocks (Action/Decision/Format), REST + Python Playbook APIs, Input playbooks, Action Builder |
| [`splunk-basics-blast.json`](splunk-basics-blast.json) | Splunk Basics Blast 🎯 | 32 | Beginner | SPL, Dashboard Studio, alerts, schema on read, scalability, intro ITSI/ES/O11y — fun distractors, 10 workshop images embedded |
| [`sample-all-types.json`](sample-all-types.json) | Sample — All Question Types | 5 | Sample | One question per type: single, multi, yes/no, free text, slider |
| [`european-history.json`](european-history.json) | European History Pub Quiz 🍺 | 42 | Intermediate | Ukraine, Baltics, Poland, Germany, France, UK — pub quiz distractors, explanations, 10 Wikipedia CC images embedded |
| [`greek-mythology.json`](greek-mythology.json) | Greek Mythology Trivia | 47 | Intermediate | Olympian gods, heroes, monsters, Underworld, Trojan War, famous myths & the Sphinx's riddle |
| [`roman-mythology.json`](roman-mythology.json) | Roman Mythology, Culture & History 🏛️ | 32 | Intermediate | Roman gods, Latin phrases, emperors, gladiators, military customs, daily life — 10 Wikimedia images (Caesar, Augustus, Colosseum, Capitoline Wolf, Pantheon, gladiator mosaic, Nero, Trajan's Column, Vestal Virgin, Cleopatra) |

> **Bundled with the app** (also available offline via **📚 Library**): `splunk-basics`, `splunk4champions`, `splunk-ai`, `sample-all-types`.
> On first install, **Splunk Basics** is auto-seeded as the active quiz so admins land on a usable Splunk-themed quiz immediately.
>
> **GitHub-only** (require outbound HTTPS, fetched via **🔄 GitHub** in the Editor): `splunk4champions2-workshop`, `splunk-soar`, `splunk-basics-blast`, `european-history`, `greek-mythology`, `roman-mythology`.

---

## How to import

### Option A — Live sync from GitHub (easiest, requires internet)

In the **Editor** tab, click **🔄 GitHub** in the toolbar. This fetches the latest `manifest.json` from this repository and lists all available quizzes. Click **Import** next to any quiz to load it instantly — no file download needed.

> Your Splunk instance needs outbound HTTPS access to `raw.githubusercontent.com`.

### Option B — Bundled library (offline, no internet required)

In the **Editor** tab, click **📚 Library** in the toolbar. This lists the quizzes bundled with the app. Click **Import** next to any quiz.

> The app serves these files from `/static/app/ponypollapp/quizzes/` — works on air-gapped Splunk instances.

### Option C — Download and import as a file

1. Download the JSON file from this repository (raw view or `curl`)
2. In the **Editor** tab, click **⬆ Import** and select the downloaded file

```bash
# Download examples
curl -L https://raw.githubusercontent.com/bautt/ponypollApp/main/quizzes/european-history.json \
     -o european-history.json

curl -L https://raw.githubusercontent.com/bautt/ponypollApp/main/quizzes/splunk-ai.json \
     -o splunk-ai.json

curl -L https://raw.githubusercontent.com/bautt/ponypollApp/main/quizzes/splunk4champions.json \
     -o splunk4champions.json
```

---

## Random question subset (tip)

If a quiz has more questions than you need for a session, use the **🎲 Play:** dropdown in the Editor sidebar to pick a random subset — for example, 12 random questions from the 42-question European history quiz or 10 from the 34-question Splunk AI quiz. Each participant receives a different random draw.

---

## Adding your own quizzes

See the [JSON format reference](../README.md#importexport-json-format) in the main README for the full schema.

> **For AI agents:** point an LLM at [`quiz-format.md`](quiz-format.md) — a
> self-contained, prompt-ready spec with every question type, hard rules, and a
> complete end-to-end example. Raw URL for prompting:
> `https://raw.githubusercontent.com/bautt/ponypollApp/main/quizzes/quiz-format.md`

To contribute a quiz to the **GitHub library** (available via 🔄 GitHub sync):
1. Create a new `.json` file in this folder following the same schema
2. Add an entry to [`manifest.json`](manifest.json) with `id`, `name`, `description`, `questionCount`, `difficulty`, and `file`
3. Open a pull request — the quiz is immediately available to any Pony Poll instance with internet access after merge, **no app re-deployment needed**

To also **bundle** it with the app (available offline via 📚 Library):
4. Copy the `.json` file to `src/package/appserver/static/quizzes/`
5. Add an entry to `src/package/appserver/static/quizzes/manifest.json`
6. Rebuild the app (`make package`)
