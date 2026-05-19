#!/usr/bin/env python3
"""
seed_splunk_basics_quiz.py
--------------------------
Creates the "Splunk Basics Blast" quiz (32 questions) in a running Splunk
instance via the KV Store REST API.

Usage:
    python3 seed_splunk_basics_quiz.py \
        --host localhost --port 8089 \
        --user admin --password changeme \
        [--app ponypollapp] [--dry-run]

Environment variables (override CLI args):
    SPLUNK_HOST, SPLUNK_PORT, SPLUNK_USER, SPLUNK_PASSWORD

Images are served from /static/app/splunk4champions2/images/ — the
Splunk4Champions2 app must be installed on the same Splunk instance.
Credits for images and content are noted in the explanation fields.
"""

import argparse
import json
import os
import sys
import urllib.request
import urllib.parse
import urllib.error
import ssl

# ── Images ────────────────────────────────────────────────────────────────────
# Served from Splunk4Champions2 workshop app (same Splunk instance).
# Credit: Splunk4Champions2 Workshop — https://github.com/tbaublys/splunk4champions2
S4C = "/static/app/splunk4champions2/images"
PP  = "/static/app/ponypollapp"

IMG_PIPELINE       = f"{S4C}/pipeline.png"
IMG_ARCHITECTURE   = f"{S4C}/architecture.png"
IMG_DATASOURCES    = f"{S4C}/datasources.png"
IMG_HOT_WARM       = f"{S4C}/hot_warm1.png"
IMG_IN_BUCKET      = f"{S4C}/inabucket.png"
IMG_SLOW_SEARCH    = f"{S4C}/slow_search_bw.jpg"
IMG_REBUS          = f"{S4C}/rebus.png"
IMG_BUTTERCUP_DS   = f"{S4C}/ButtercupMascotDashStudio.png"
IMG_BUTTERCUP      = f"{PP}/buttercup.png"
IMG_BLOOMFILTER    = f"{S4C}/bloomfilter.png"
IMG_SMARTSTORE     = f"{S4C}/smartstore_classic_vs_modern.png"

# ── Questions ─────────────────────────────────────────────────────────────────
# Each dict maps directly to the KV Store ponypoll_questions schema:
#   quiz_id (filled at runtime), sort_order, text, type, timeLimit,
#   options_json (serialised list), explanation, image (optional URL)

QUESTIONS = [
    # ── 1 · SPL basics ────────────────────────────────────────────────────────
    {
        "text": "What does SPL stand for?",
        "type": "single",
        "timeLimit": 25,
        "explanation": (
            "SPL = Search Processing Language — the query language behind every "
            "Splunk search bar. It uses a pipe-based syntax, similar to Unix shell "
            "pipes. Source: Splunk Docs — Search Processing Language overview."
        ),
        "image": "",
        "options": [
            {"id": "A", "text": "Search Processing Language", "correct": True},
            {"id": "B", "text": "Splunk Pipeline Logic",      "correct": False},
            {"id": "C", "text": "System Performance Layer",   "correct": False},
            {"id": "D", "text": "Streaming Parse Language",   "correct": False},
        ],
    },
    # ── 2 ─────────────────────────────────────────────────────────────────────
    {
        "text": "Which SPL command aggregates events into statistics?",
        "type": "single",
        "timeLimit": 25,
        "explanation": (
            "`stats` is Splunk's workhorse aggregation command — count, avg, sum, "
            "max, min, dc (distinct count) and more. `table` just selects columns, "
            "`eval` creates fields, `rex` extracts fields."
        ),
        "image": "",
        "options": [
            {"id": "A", "text": "stats",  "correct": True},
            {"id": "B", "text": "table",  "correct": False},
            {"id": "C", "text": "eval",   "correct": False},
            {"id": "D", "text": "rex",    "correct": False},
        ],
    },
    # ── 3 · Schema on read ────────────────────────────────────────────────────
    {
        "text": "Splunk applies field extraction (schema) at which point?",
        "type": "single",
        "timeLimit": 30,
        "explanation": (
            "\"Schema on read\" means Splunk stores raw events as-is and extracts "
            "fields only when you search. This lets you add new field extractions "
            "later without re-indexing. Contrast with traditional databases where "
            "schema must be defined before data is loaded. "
            "Source: Splunk Docs — About Splunk schema on the fly."
        ),
        "image": "",
        "options": [
            {"id": "A", "text": "At search time (schema on read)",      "correct": True},
            {"id": "B", "text": "At index time only",                   "correct": False},
            {"id": "C", "text": "During data ingestion in the forwarder", "correct": False},
            {"id": "D", "text": "When a dashboard is saved",            "correct": False},
        ],
    },
    # ── 4 · Data inputs (image) ───────────────────────────────────────────────
    {
        "text": "Which of these is a valid native Splunk data input type?",
        "type": "single",
        "timeLimit": 30,
        "explanation": (
            "HEC (HTTP Event Collector) lets any app send JSON events to Splunk "
            "over HTTP/S with a token — no forwarder needed. Splunk also supports "
            "file/directory monitoring, TCP/UDP, Syslog, and scripted inputs. "
            "The others listed are made up. "
            "Image credit: Splunk4Champions2 Workshop (datasources.png)."
        ),
        "image": IMG_DATASOURCES,
        "options": [
            {"id": "A", "text": "HEC — HTTP Event Collector",       "correct": True},
            {"id": "B", "text": "Direct MySQL write-back push",      "correct": False},
            {"id": "C", "text": "Bluetooth Beacon ingestion",        "correct": False},
            {"id": "D", "text": "Native WebSocket real-time stream", "correct": False},
        ],
    },
    # ── 5 ─────────────────────────────────────────────────────────────────────
    {
        "text": "What does the `|` (pipe) symbol do in an SPL search?",
        "type": "single",
        "timeLimit": 20,
        "explanation": (
            "The pipe passes the result set of one command as input to the next — "
            "just like Unix shell pipes. This chains transformations: "
            "search → filter → aggregate → visualize."
        ),
        "image": "",
        "options": [
            {"id": "A", "text": "Passes output of one command as input to the next", "correct": True},
            {"id": "B", "text": "Boolean OR between two field conditions",            "correct": False},
            {"id": "C", "text": "Marks a comment in the search string",               "correct": False},
            {"id": "D", "text": "Separates multiple index names",                     "correct": False},
        ],
    },
    # ── 6 · rex ───────────────────────────────────────────────────────────────
    {
        "text": "Which SPL command extracts new fields from raw events using named regex groups?",
        "type": "single",
        "timeLimit": 25,
        "explanation": (
            "`rex` extracts fields on the fly using named capture groups, e.g.:\n"
            "`| rex field=_raw \"user=(?<username>\\w+)\"`\n"
            "Fields created this way exist only for the current search — no "
            "re-indexing needed. Source: Splunk Docs — rex command reference."
        ),
        "image": "",
        "options": [
            {"id": "A", "text": "rex",            "correct": True},
            {"id": "B", "text": "extract",        "correct": False},
            {"id": "C", "text": "fieldextract",   "correct": False},
            {"id": "D", "text": "parse",          "correct": False},
        ],
    },
    # ── 7 · Ports ─────────────────────────────────────────────────────────────
    {
        "text": "What is the default TCP port for Splunk Web?",
        "type": "single",
        "timeLimit": 20,
        "explanation": (
            "Port 8000 → Splunk Web UI. "
            "Port 8089 → REST API / management / splunkd. "
            "Port 9997 → default receiver port for Universal Forwarders. "
            "Port 8088 → HEC (HTTP Event Collector)."
        ),
        "image": "",
        "options": [
            {"id": "A", "text": "8000", "correct": True},
            {"id": "B", "text": "8080", "correct": False},
            {"id": "C", "text": "8089", "correct": False},
            {"id": "D", "text": "9997", "correct": False},
        ],
    },
    # ── 8 · Pipeline (image) ──────────────────────────────────────────────────
    {
        "text": "In the Splunk data pipeline, at which stage are TSIDX index files written to disk?",
        "type": "single",
        "timeLimit": 30,
        "explanation": (
            "The Index Pipeline is the last stage — it writes compressed raw "
            "events (rawdata journal), creates TSIDX (time-series index) files, "
            "and adds Bloom filters. The Parsing Pipeline handles line-breaking "
            "and event processing before that. "
            "Image credit: Splunk4Champions2 Workshop (pipeline.png)."
        ),
        "image": IMG_PIPELINE,
        "options": [
            {"id": "A", "text": "Index Pipeline",                       "correct": True},
            {"id": "B", "text": "Parsing Queue",                        "correct": False},
            {"id": "C", "text": "At search time, not during ingestion", "correct": False},
            {"id": "D", "text": "Input stage, before any processing",   "correct": False},
        ],
    },
    # ── 9 · Universal Forwarder ───────────────────────────────────────────────
    {
        "text": "What is a Splunk Universal Forwarder?",
        "type": "single",
        "timeLimit": 25,
        "explanation": (
            "The Universal Forwarder (UF) is a tiny (~50 MB) Splunk agent — "
            "no Web UI, no local indexing — that tails files, monitors ports, "
            "and forwards compressed data to indexers. It runs on servers, "
            "containers, VMs, even Raspberry Pis. "
            "Source: Splunk Docs — About forwarding and receiving."
        ),
        "image": "",
        "options": [
            {"id": "A", "text": "A lightweight agent that ships data to Splunk indexers",    "correct": True},
            {"id": "B", "text": "A full Splunk instance tuned for low-latency searching",    "correct": False},
            {"id": "C", "text": "A load balancer that routes user queries across indexers",  "correct": False},
            {"id": "D", "text": "The mascot of Splunk's data-forwarding team 🐴",            "correct": False},
        ],
    },
    # ── 10 · Indexer role ─────────────────────────────────────────────────────
    {
        "text": "What is the primary role of a Splunk Indexer?",
        "type": "single",
        "timeLimit": 25,
        "explanation": (
            "Indexers receive data (from forwarders or inputs), parse events, "
            "and write them to on-disk buckets. In a clustered deployment they "
            "also replicate bucket copies (replication factor) across peers "
            "for high availability. "
            "Source: Splunk Docs — How indexing works."
        ),
        "image": "",
        "options": [
            {"id": "A", "text": "Store, index, and make incoming data searchable",       "correct": True},
            {"id": "B", "text": "Create visualisations from raw search results",         "correct": False},
            {"id": "C", "text": "Manage user permissions and role assignments",          "correct": False},
            {"id": "D", "text": "Route user searches across the deployment",             "correct": False},
        ],
    },
    # ── 11 · Architecture (image) ─────────────────────────────────────────────
    {
        "text": "In a distributed Splunk deployment, which component receives searches from users and coordinates execution across indexers?",
        "type": "single",
        "timeLimit": 30,
        "explanation": (
            "The Search Head is the user-facing tier — it receives queries from "
            "the browser, fans them out to all Indexer Peers (knowledge objects "
            "like saved searches, lookups, field extractions live here), "
            "and merges the results back. "
            "Image credit: Splunk4Champions2 Workshop (architecture.png)."
        ),
        "image": IMG_ARCHITECTURE,
        "options": [
            {"id": "A", "text": "Search Head",        "correct": True},
            {"id": "B", "text": "Heavy Forwarder",    "correct": False},
            {"id": "C", "text": "Deployment Server",  "correct": False},
            {"id": "D", "text": "License Manager",    "correct": False},
        ],
    },
    # ── 12 · stats BY ─────────────────────────────────────────────────────────
    {
        "text": "What does `| stats count BY host` return?",
        "type": "single",
        "timeLimit": 25,
        "explanation": (
            "`stats count BY host` groups all events by unique host values and "
            "returns one row per host with the event count. It is one of the most "
            "common SPL patterns — replace `count` with `avg(field)`, `sum(field)`, "
            "`dc(field)` etc. for other aggregations."
        ),
        "image": "",
        "options": [
            {"id": "A", "text": "One row per host with the event count for each",    "correct": True},
            {"id": "B", "text": "The total event count across all hosts combined",   "correct": False},
            {"id": "C", "text": "A sorted list of unique hostnames only",            "correct": False},
            {"id": "D", "text": "Bytes indexed per host over the time range",        "correct": False},
        ],
    },
    # ── 13 · table command ────────────────────────────────────────────────────
    {
        "text": "What does `| table _time host status` do to the result set?",
        "type": "single",
        "timeLimit": 25,
        "explanation": (
            "`table` is purely cosmetic — it keeps only the named fields and "
            "presents them as columns in that order, removing all other fields "
            "from the output. It does not change event count or values. "
            "Great for clean exports!"
        ),
        "image": "",
        "options": [
            {"id": "A", "text": "Keeps only _time, host, status and displays them as columns", "correct": True},
            {"id": "B", "text": "Stores results into a KV Store lookup table",                 "correct": False},
            {"id": "C", "text": "Creates an HTML table attachment for email alerts",           "correct": False},
            {"id": "D", "text": "Sorts results by time descending",                            "correct": False},
        ],
    },
    # ── 14 · Bucket lifecycle (image) ─────────────────────────────────────────
    {
        "text": "What is the correct order of Splunk index bucket lifecycle stages?",
        "type": "single",
        "timeLimit": 30,
        "explanation": (
            "Hot → Warm → Cold → Frozen. "
            "Hot: open for writing (newest data). Warm: closed, still on fast disk. "
            "Cold: moved to slower/cheaper storage. Frozen: archived to external "
            "storage or deleted. Thawed: a frozen bucket restored for searching. "
            "Image credit: Splunk4Champions2 Workshop (hot_warm1.png)."
        ),
        "image": IMG_HOT_WARM,
        "options": [
            {"id": "A", "text": "Hot → Warm → Cold → Frozen",          "correct": True},
            {"id": "B", "text": "New → Active → Archive → Deleted",    "correct": False},
            {"id": "C", "text": "Raw → Parsed → Indexed → Searchable", "correct": False},
            {"id": "D", "text": "Open → Sealed → Compressed → Purged", "correct": False},
        ],
    },
    # ── 15 · eval / if ────────────────────────────────────────────────────────
    {
        "text": "What does this SPL do?\n`| eval label = if(status==200, \"OK\", \"Error\")`",
        "type": "single",
        "timeLimit": 30,
        "explanation": (
            "`eval` computes and creates new fields. `if(condition, true, false)` "
            "is SPL's ternary operator — if status equals 200 the new field `label` "
            "gets the value \"OK\", otherwise \"Error\". "
            "Source: Splunk Docs — eval command."
        ),
        "image": "",
        "options": [
            {"id": "A", "text": "Creates a new field called label with a conditional value", "correct": True},
            {"id": "B", "text": "Filters events to only those where status equals 200",      "correct": False},
            {"id": "C", "text": "Renames the status field to label",                         "correct": False},
            {"id": "D", "text": "Counts events where status is 200",                         "correct": False},
        ],
    },
    # ── 16 · dedup ────────────────────────────────────────────────────────────
    {
        "text": "What does `| dedup host` do?",
        "type": "single",
        "timeLimit": 25,
        "explanation": (
            "`dedup field` keeps only the FIRST event for each unique value of "
            "that field (by default sorted by time, most recent first unless you "
            "add `sortby`). Useful to de-duplicate noisy data or get one "
            "representative event per source."
        ),
        "image": "",
        "options": [
            {"id": "A", "text": "Keeps only the first event for each unique host value", "correct": True},
            {"id": "B", "text": "Counts the number of distinct host values",             "correct": False},
            {"id": "C", "text": "Removes the host field from all events",                "correct": False},
            {"id": "D", "text": "Joins events sharing the same host from two indexes",  "correct": False},
        ],
    },
    # ── 17 · Bad search habits (multi, image) ─────────────────────────────────
    {
        "text": "Which of these are the 'Four Horsemen' of terrible SPL performance? (select ALL that apply)",
        "type": "multi",
        "timeLimit": 40,
        "explanation": (
            "All four are search killers:\n"
            "• No index filter → scans everything\n"
            "• All Time range → no time-based pruning\n"
            "• Leading wildcards (e.g. *error) → cannot use the index at all\n"
            "• JOIN → forces huge data sets to the search head\n"
            "Use `stats`, `lookup`, or `append` instead of JOIN. "
            "Image credit: Splunk4Champions2 Workshop (slow_search_bw.jpg)."
        ),
        "image": IMG_SLOW_SEARCH,
        "options": [
            {"id": "A", "text": "No index specified (searching index=*)",    "correct": True},
            {"id": "B", "text": "All Time time-range",                       "correct": True},
            {"id": "C", "text": "Leading wildcard in search term (*error)",  "correct": True},
            {"id": "D", "text": "Using JOIN to combine different data sets", "correct": True},
        ],
    },
    # ── 18 · lookup ───────────────────────────────────────────────────────────
    {
        "text": "What does a Splunk lookup do?",
        "type": "single",
        "timeLimit": 25,
        "explanation": (
            "Lookups enrich your search results by joining external data — "
            "CSV files, KV Store collections, database (JDBC), Python scripts — "
            "to your events, adding new fields based on matching keys. "
            "Think of it as a LEFT JOIN from SPL into a reference table. "
            "Source: Splunk Docs — Add lookup data to Splunk searches."
        ),
        "image": "",
        "options": [
            {"id": "A", "text": "Enriches events by matching fields against an external reference table", "correct": True},
            {"id": "B", "text": "Searches events across a remote federated Splunk deployment",            "correct": False},
            {"id": "C", "text": "Retrieves a saved search definition from the config",                    "correct": False},
            {"id": "D", "text": "Finds the physical disk location of a bucket holding your events",       "correct": False},
        ],
    },
    # ── 19 · Dashboard Studio format ──────────────────────────────────────────
    {
        "text": "Dashboard Studio dashboards are defined in what format?",
        "type": "single",
        "timeLimit": 20,
        "explanation": (
            "Dashboard Studio uses JSON. Classic (Simple XML) dashboards used XML — "
            "Studio replaced that starting in Splunk 8.x. You can edit the raw JSON "
            "directly via the source-code editor in Studio. "
            "Source: Splunk Docs — Dashboard Studio overview."
        ),
        "image": "",
        "options": [
            {"id": "A", "text": "JSON",      "correct": True},
            {"id": "B", "text": "XML",       "correct": False},
            {"id": "C", "text": "YAML",      "correct": False},
            {"id": "D", "text": "Estonian",  "correct": False},
        ],
    },
    # ── 20 · Tokens (image) ───────────────────────────────────────────────────
    {
        "text": "What are tokens used for in Dashboard Studio?",
        "type": "single",
        "timeLimit": 30,
        "explanation": (
            "Tokens (written as `$token_name$`) are Dashboard Studio's variables — "
            "they carry dynamic values from inputs (dropdowns, time pickers, "
            "text boxes, map clicks) into search queries, panel configs, or "
            "conditional visibility. They replace the Classic Dashboard equivalent. "
            "Image credit: Splunk4Champions2 Workshop (ButtercupMascotDashStudio.png)."
        ),
        "image": IMG_BUTTERCUP_DS,
        "options": [
            {"id": "A", "text": "Passing dynamic values between inputs and visualisations",  "correct": True},
            {"id": "B", "text": "Authenticating external viewers to the dashboard",          "correct": False},
            {"id": "C", "text": "Storing API keys for external data connections",            "correct": False},
            {"id": "D", "text": "Licensing premium visualisations from Splunkbase",          "correct": False},
        ],
    },
    # ── 21 · Scheduled alerts ─────────────────────────────────────────────────
    {
        "text": "What triggers a Splunk scheduled alert?",
        "type": "single",
        "timeLimit": 25,
        "explanation": (
            "A scheduled alert is a saved search that runs on a cron-defined "
            "schedule. If the condition is met (e.g. result count > 0, or a "
            "custom condition) the configured alert actions fire — email, webhook, "
            "script, ticketing, etc. "
            "Source: Splunk Docs — About Splunk alerts."
        ),
        "image": "",
        "options": [
            {"id": "A", "text": "A search runs on cron schedule and the condition is met", "correct": True},
            {"id": "B", "text": "A user clicks the Trigger button in the UI",              "correct": False},
            {"id": "C", "text": "Any user logs into the Splunk instance",                  "correct": False},
            {"id": "D", "text": "The indexing rate exceeds the licensed threshold",        "correct": False},
        ],
    },
    # ── 22 · Webhook alert action ─────────────────────────────────────────────
    {
        "text": "Which alert action sends alert results to an external HTTP/S endpoint?",
        "type": "single",
        "timeLimit": 20,
        "explanation": (
            "The Webhook alert action POSTs a JSON payload to any HTTP/HTTPS URL "
            "you configure. Perfect for integrating with Slack, PagerDuty, "
            "ServiceNow, Jira, and custom APIs — no extra app required. "
            "Source: Splunk Docs — Set up alert actions."
        ),
        "image": "",
        "options": [
            {"id": "A", "text": "Webhook",                         "correct": True},
            {"id": "B", "text": "Email",                           "correct": False},
            {"id": "C", "text": "Custom alert action script",      "correct": False},
            {"id": "D", "text": "Slack (built-in, no app needed)", "correct": False},
        ],
    },
    # ── 23 · Slider / confidence check ────────────────────────────────────────
    {
        "text": "On a scale of 1–10, how confident do you feel about Splunk so far?",
        "type": "slider",
        "timeLimit": 30,
        "explanation": "No wrong answers — this is a pulse check! Keep learning, you're doing great. 🐴",
        "image": "",
        "options": [],
        "sliderMin": 1,
        "sliderMax": 10,
        "sliderStep": 1,
        "sliderUnit": "/10",
    },
    # ── 24 · ITSI ─────────────────────────────────────────────────────────────
    {
        "text": "What does ITSI stand for?",
        "type": "single",
        "timeLimit": 20,
        "explanation": (
            "ITSI = Splunk IT Service Intelligence. It provides service health "
            "monitoring, AIOps, and anomaly detection built on top of Splunk. "
            "Services are broken down into KPIs that roll up into a colour-coded "
            "Service Health Score (0–100). "
            "Source: Splunk ITSI product page."
        ),
        "image": "",
        "options": [
            {"id": "A", "text": "IT Service Intelligence",             "correct": True},
            {"id": "B", "text": "Integrated Threat Security Index",    "correct": False},
            {"id": "C", "text": "Index Time Search Infrastructure",    "correct": False},
            {"id": "D", "text": "Interactive Time Series Interface",   "correct": False},
        ],
    },
    # ── 25 · ITSI KPI ─────────────────────────────────────────────────────────
    {
        "text": "In Splunk ITSI, a KPI (Key Performance Indicator) represents...",
        "type": "single",
        "timeLimit": 30,
        "explanation": (
            "A KPI in ITSI is an SPL search that measures one specific health "
            "aspect of a service (e.g. web server error rate, CPU utilisation, "
            "payment success rate). Multiple KPIs roll up into a single "
            "Service Health Score. KPIs can trigger episodes and drive "
            "AIOps-based alerting. "
            "Source: Splunk ITSI docs — KPI overview."
        ),
        "image": "",
        "options": [
            {"id": "A", "text": "A measurable health aspect of a specific service",    "correct": True},
            {"id": "B", "text": "The number of active concurrent user sessions",       "correct": False},
            {"id": "C", "text": "An alert response-time SLA in Enterprise Security",  "correct": False},
            {"id": "D", "text": "Indexer storage utilisation expressed as a percent", "correct": False},
        ],
    },
    # ── 26 · Rebus / data lifecycle (image) ───────────────────────────────────
    {
        "text": "What does this image represent?",
        "type": "single",
        "timeLimit": 30,
        "explanation": (
            "The bucket icons represent Splunk's data lifecycle: "
            "Hot (writing) → Warm (searchable) → Cold (archived) → Frozen (deleted/exported). "
            "It is the original design from Splunk documentation. "
            "Image credit: Splunk4Champions2 Workshop (rebus.png)."
        ),
        "image": IMG_REBUS,
        "options": [
            {"id": "A", "text": "Splunk data lifecycle (Hot → Warm → Cold → Frozen)", "correct": True},
            {"id": "B", "text": "The DevOps CI/CD pipeline",                          "correct": False},
            {"id": "C", "text": "A very confusing recycling diagram",                 "correct": False},
            {"id": "D", "text": "The four cloud regions of AWS us-east",              "correct": False},
        ],
    },
    # ── 27 · Enterprise Security ──────────────────────────────────────────────
    {
        "text": "What does Splunk ES stand for?",
        "type": "single",
        "timeLimit": 20,
        "explanation": (
            "Splunk Enterprise Security (ES) is Splunk's SIEM (Security Information "
            "and Event Management) premium app. It provides threat detection, "
            "investigation workflows, risk-based alerting, and compliance dashboards "
            "on top of Splunk Enterprise or Cloud. "
            "Source: Splunk ES product page."
        ),
        "image": "",
        "options": [
            {"id": "A", "text": "Enterprise Security",      "correct": True},
            {"id": "B", "text": "Event Streaming",          "correct": False},
            {"id": "C", "text": "Extended Search",          "correct": False},
            {"id": "D", "text": "Edge Server",              "correct": False},
        ],
    },
    # ── 28 · Notable Events in ES ─────────────────────────────────────────────
    {
        "text": "In Splunk Enterprise Security, what is a 'Notable Event'?",
        "type": "single",
        "timeLimit": 30,
        "explanation": (
            "Notable Events are ES's alert output — generated by Correlation Searches "
            "when suspicious patterns are detected. They appear in the Incident Review "
            "dashboard with urgency, owner, status, and risk scores. Analysts triage "
            "and investigate them like tickets. "
            "Source: Splunk ES docs — Incident Review."
        ),
        "image": "",
        "options": [
            {"id": "A", "text": "An alert from a correlation search indicating a potential security issue", "correct": True},
            {"id": "B", "text": "A Windows Event Log entry above severity level Critical",                  "correct": False},
            {"id": "C", "text": "An event that caused the indexing rate to spike",                          "correct": False},
            {"id": "D", "text": "A manually bookmarked interesting event in the search timeline",           "correct": False},
        ],
    },
    # ── 29 · Splunk Observability Cloud ───────────────────────────────────────
    {
        "text": "Splunk Observability Cloud (formerly SignalFx) is primarily designed for...",
        "type": "single",
        "timeLimit": 30,
        "explanation": (
            "Splunk Observability Cloud focuses on cloud-native, real-time "
            "observability using OpenTelemetry — streaming metrics (Infrastructure "
            "Monitoring), distributed tracing (APM), log correlation, and Synthetic "
            "Monitoring. It is optimised for ephemeral, containerised environments "
            "where traditional SIEM or ITSI approaches are too slow. "
            "Source: Splunk Observability Cloud overview."
        ),
        "image": "",
        "options": [
            {"id": "A", "text": "Real-time monitoring of cloud-native apps via metrics, traces, and logs", "correct": True},
            {"id": "B", "text": "Security information and event management (SIEM)",                         "correct": False},
            {"id": "C", "text": "IT service health scoring and AIOps (that's ITSI)",                       "correct": False},
            {"id": "D", "text": "Managing Splunk license consumption and compliance",                       "correct": False},
        ],
    },
    # ── 30 · Inside a bucket (image) ──────────────────────────────────────────
    {
        "text": "Which files would you find inside a Splunk index bucket?",
        "type": "single",
        "timeLimit": 35,
        "explanation": (
            "A bucket contains: compressed raw events (rawdata/journal.gz), "
            "TSIDX time-series index files (for time-based retrieval), and "
            "a Bloom filter (probabilistic structure for fast term lookups). "
            "No SQL, no Parquet, no WAL — Splunk has its own storage format. "
            "Image credit: Splunk4Champions2 Workshop (inabucket.png)."
        ),
        "image": IMG_IN_BUCKET,
        "options": [
            {"id": "A", "text": "TSIDX files, compressed rawdata journal, Bloom filter",       "correct": True},
            {"id": "B", "text": "SQL database files, WAL logs, and transaction pages",          "correct": False},
            {"id": "C", "text": "JSON documents, an Avro schema, and a manifest file",         "correct": False},
            {"id": "D", "text": "Apache Parquet files and a column store index",               "correct": False},
        ],
    },
    # ── 31 · rex mode=sed ─────────────────────────────────────────────────────
    {
        "text": "What does `| rex field=url mode=sed \"s/\\?.*//\"` do?",
        "type": "single",
        "timeLimit": 35,
        "explanation": (
            "`rex mode=sed` performs in-place search-and-replace on a field using "
            "Unix sed-style syntax: `s/pattern/replacement/flags`. "
            "In this example it strips everything after `?` from the URL field — "
            "handy for normalising URLs before stats or dedup. "
            "Source: Splunk Docs — rex command, mode=sed."
        ),
        "image": "",
        "options": [
            {"id": "A", "text": "Removes the query string (everything after ?) from the url field",        "correct": True},
            {"id": "B", "text": "Switches rex into streaming execution mode for better performance",        "correct": False},
            {"id": "C", "text": "Extracts fields using a sed configuration file from the filesystem",      "correct": False},
            {"id": "D", "text": "Applies the regex only to _raw and ignores previously extracted fields",  "correct": False},
        ],
    },
    # ── 32 · Word cloud / fun finale ──────────────────────────────────────────
    {
        "text": "In one word — what is Splunk to you? 🐴",
        "type": "wordcloud",
        "timeLimit": 30,
        "explanation": (
            "No wrong answers here! Word size reflects how many participants "
            "shared the same word. We're curious what comes to mind first."
        ),
        "image": IMG_BUTTERCUP,
        "options": [],
        "wordcloudMaxChars": 32,
        "wordcloudMaxWords": 7,
    },
]


# ── REST API helpers ───────────────────────────────────────────────────────────

def splunk_request(base_url, path, token, payload=None, method=None):
    """Make an authenticated Splunk REST API call (JSON body, JSON response)."""
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    url = base_url.rstrip("/") + path
    data = json.dumps(payload).encode() if payload is not None else None
    if method is None:
        method = "POST" if data else "GET"

    req = urllib.request.Request(
        url, data=data, method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type":  "application/json",
            "Accept":        "application/json",
        },
    )
    with urllib.request.urlopen(req, context=ctx) as resp:
        body = resp.read().decode()
        return json.loads(body) if body.strip() else {}


def get_token(base_url, user, password):
    """Exchange username/password for a short-lived session token."""
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    login_url = base_url.rstrip("/") + "/services/auth/login?output_mode=json"
    data = urllib.parse.urlencode({"username": user, "password": password}).encode()
    req = urllib.request.Request(login_url, data=data, method="POST")
    with urllib.request.urlopen(req, context=ctx) as resp:
        return json.loads(resp.read().decode())["sessionKey"]


# ── Main ──────────────────────────────────────────────────────────────────────

def build_kv_doc(q, quiz_id, sort_order):
    """Convert a question definition to a KV Store document."""
    qtype = q["type"]

    if qtype == "slider":
        opts = [{"min": q.get("sliderMin", 1), "max": q.get("sliderMax", 10),
                 "step": q.get("sliderStep", 1), "unit": q.get("sliderUnit", "")}]
    elif qtype == "wordcloud":
        opts = [{"maxChars": q.get("wordcloudMaxChars", 32),
                 "maxWords": q.get("wordcloudMaxWords", 7)}]
    elif qtype == "yesno":
        opts = q.get("options", [{"id": "A", "text": "Yes", "correct": False},
                                  {"id": "B", "text": "No",  "correct": False}])
    else:
        opts = q.get("options", [])

    return {
        "quiz_id":     quiz_id,
        "sort_order":  sort_order,
        "text":        q["text"],
        "type":        qtype,
        "timeLimit":   q.get("timeLimit", 30),
        "options_json": json.dumps(opts),
        "explanation": q.get("explanation", ""),
        "image":       q.get("image", ""),
    }


def main():
    parser = argparse.ArgumentParser(description="Seed Splunk Basics quiz into PonyPoll")
    parser.add_argument("--host",     default=os.environ.get("SPLUNK_HOST",     "localhost"))
    parser.add_argument("--port",     default=os.environ.get("SPLUNK_PORT",     "8089"))
    parser.add_argument("--user",     default=os.environ.get("SPLUNK_USER",     "admin"))
    parser.add_argument("--password", default=os.environ.get("SPLUNK_PASSWORD", ""))
    parser.add_argument("--app",      default="ponypollapp")
    parser.add_argument("--dry-run",  action="store_true", help="Print questions but don't write to Splunk")
    parser.add_argument("--quiz-name", default="Splunk Basics Blast 🎯")
    args = parser.parse_args()

    if not args.password:
        print("ERROR: --password or SPLUNK_PASSWORD env var is required", file=sys.stderr)
        sys.exit(1)

    base_url  = f"https://{args.host}:{args.port}"
    kv_base   = f"/servicesNS/nobody/{args.app}/storage/collections/data"

    print(f"Target: {base_url}")
    print(f"Quiz:   {args.quiz_name!r}  ({len(QUESTIONS)} questions)")

    if args.dry_run:
        print("\n[dry-run] Questions that would be created:")
        for i, q in enumerate(QUESTIONS, 1):
            img = " 🖼" if q.get("image") else ""
            print(f"  {i:2d}. [{q['type']:<9s}] {q['text'][:70]}{img}")
        sys.exit(0)

    # Authenticate
    print("\nAuthenticating…")
    try:
        token = get_token(base_url, args.user, args.password)
    except urllib.error.HTTPError as e:
        print(f"ERROR: Authentication failed — {e}", file=sys.stderr)
        sys.exit(1)
    print("  ✓ Session token obtained")

    # Create quiz
    print(f"\nCreating quiz '{args.quiz_name}'…")
    from datetime import datetime, timezone
    quiz_doc = {"name": args.quiz_name, "created_at": datetime.now(timezone.utc).isoformat()}
    result = splunk_request(base_url, f"{kv_base}/ponypoll_quizzes?output_mode=json",
                            token, quiz_doc)
    quiz_id = result.get("_key") or result.get("key")
    if not quiz_id:
        print(f"ERROR: Could not determine quiz _key from response: {result}", file=sys.stderr)
        sys.exit(1)
    print(f"  ✓ Quiz created — _key={quiz_id}")

    # Batch-save questions
    print(f"\nBatch-saving {len(QUESTIONS)} questions…")
    docs = [build_kv_doc(q, quiz_id, i) for i, q in enumerate(QUESTIONS)]
    result = splunk_request(base_url, f"{kv_base}/ponypoll_questions/batch_save?output_mode=json",
                            token, docs)
    print(f"  ✓ Done — {len(docs)} questions saved")
    print(f"\nOpen PonyPoll → Editor tab → select '{args.quiz_name}' to review the quiz.")


if __name__ == "__main__":
    main()
