# Integration Plan: Pony Poll → Splunk4Champions2

**Goal:** Fully merge `ponypollapp` into `splunk4champions2` as a single deployable app,
removing the need for `ponypollapp` to be installed separately.

**Estimated effort:** ~1.5–2 hours  
**Risk:** Low  
**Status:** Not started

---

## Why it's straightforward

Both apps share the same architecture:

| | splunk4champions2 | ponypollapp |
|---|---|---|
| Frontend | React 16, styled-components | React 16, styled-components |
| Build | Webpack 5, `@splunk/webpack-configs` | Webpack 5, `@splunk/webpack-configs` |
| Template | Mako `lab.html` → `lab.bundle.js` | Mako `poll.html` → `poll.bundle.js` |
| Entry point | `entries = { lab: './web/index.js' }` | `entries = { poll: './web/index.js' }` |

All ponypoll npm dependencies (`react`, `react-dom`, `styled-components`) are already
in s4c2's `package.json` — **zero new packages needed**.

---

## The 10 changes required

### 1. Add `poll` webpack entry point
**File:** `src/webpack.config.mjs` — 1 line change

```js
// Before:
const entries = { lab: './web/index.js' }

// After:
const entries = { lab: './web/index.js', poll: './web/poll/index.js' }
```

Webpack automatically produces `poll.bundle.js` alongside `lab.bundle.js`.
No other webpack config changes needed — publicPath is handled per-app by the build output.

### 2. Copy React source into `src/web/poll/`
**Action:** Copy the entire ponypollapp `src/web/` tree to `src/web/poll/` in s4c2.

One value to change in `src/web/poll/lib/kvstore.js`:

```js
// Before:
const APP = 'ponypollapp'

// After:
const APP = 'splunk4champions2'
```

Everything else — `App.jsx`, `pages/`, `components/Timer.jsx`, `lib/questions.js`,
`lib/utils.js` — is copied verbatim.

### 3. Add `poll.html` Mako template
**File:** `src/package/appserver/templates/poll.html` (new file, ~20 lines)

Identical to `lab.html`, loading `poll.bundle.js` instead of `lab.bundle.js`:

```html
<%page expression_filter="h"/>
<!doctype html>
<html lang="">
<head>
    <meta charset="utf-8">
    <title>Pony Poll</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
    <script src="${make_url('/config?autoload=1')}" crossorigin="use-credentials"></script>
    <script src="${make_url('/static/js/i18n.js')}"></script>
    <script src="${make_url('/i18ncatalog?autoload=1')}"></script>
    <script>__splunkd_partials__ = ${json_decode(splunkd)};</script>
    <script src="${make_url('/static/app/splunk4champions2/poll.bundle.js')}"></script>
</body>
</html>
```

### 4. Add `poll.xml` view
**File:** `src/package/default/data/ui/views/poll.xml` (new file, 4 lines)

```xml
<?xml version="1.0"?>
<view template="splunk4champions2:/templates/poll.html" type="html">
    <label>Poll</label>
</view>
```

### 5. Add Poll to the nav bar
**File:** `src/package/default/data/ui/nav/default.xml` — 1 line added

```xml
<nav search_view="lab">
    <view name="lab" default="true"/>
    <view name="poll"/>           <!-- add this line -->
    <view name="search"/>
    <view name="analytics_workspace"/>
    <view name="dashboards"/>
</nav>
```

### 6. Append `[ponypoll]` index to `indexes.conf`
**File:** `src/package/default/indexes.conf` — append at end

```ini
[ponypoll]
coldPath   = $SPLUNK_DB/ponypoll/colddb
homePath   = $SPLUNK_DB/ponypoll/db
thawedPath = $SPLUNK_DB/ponypoll/thaweddb
maxTotalDataSizeMB = 500
```

### 7. Create `collections.conf`
**File:** `src/package/default/collections.conf` (new file — s4c2 doesn't have one)

```ini
[ponypoll_questions]
field.sort_order  = number
field.text        = string
field.type        = string
field.timeLimit   = number
field.options_json = string

[ponypoll_config]
field.poll_index   = string
field.poll_subject = string
```

### 8. Create `restmap.conf`
**File:** `src/package/default/restmap.conf` (new file — s4c2 doesn't have one)

Copy verbatim from `ponypollapp/src/package/default/restmap.conf`.

### 9. Create `web.conf`
**File:** `src/package/default/web.conf` (new file — s4c2 doesn't have one)

Copy verbatim from `ponypollapp/src/package/default/web.conf`.

### 10. Copy Python handler + static assets

**Python REST handler:**
- Copy `ponypollapp/src/package/bin/ponypoll_rest.py` → `src/package/bin/ponypoll_rest.py`
- No changes needed

**Static assets** (add to `CopyWebpackPlugin` patterns in `webpack.config.mjs` so they
survive `clean: true` on each build — this is the only non-obvious step):
```js
{ from: 'package/appserver/static/buttercup.png',   to: 'buttercup.png' },
{ from: 'package/appserver/static/appIcon.png',      to: 'appIcon.png' },
{ from: 'package/appserver/static/appIcon_2x.png',   to: 'appIcon_2x.png' },
{ from: 'package/appserver/static/appIcon_128.png',  to: 'appIcon_128.png' },
```

**`default.meta`:** Add KV Store collection permissions to
`src/package/metadata/default.meta`:

```
[storage/collections/conf/ponypoll_questions]
access = read : [ * ], write : [ admin, power ]

[storage/collections/conf/ponypoll_config]
access = read : [ * ], write : [ admin, power ]
```

---

## What does NOT change

- s4c2's `package.json` — no new npm packages
- `lab.html`, `lab.xml`, all workshop MDX content — completely untouched
- The ponypoll Python REST handler — no code changes
- KV Store collection names — stay as `ponypoll_questions`, `ponypoll_config`
- REST endpoint path — stays as `/services/ponypoll/v1/answer`
- All existing s4c2 conf files (except `indexes.conf` append and `nav/default.xml` one-liner)

---

## Effort breakdown

| Task | Est. time |
|---|---|
| Copy + adapt React source (`web/poll/`) | 20 min |
| webpack entry + `poll.html` template + `poll.xml` view + nav | 15 min |
| Conf file work (indexes append, new collections/restmap/web/meta) | 20 min |
| Copy Python handler + add assets to CopyWebpackPlugin | 10 min |
| Build + smoke test locally | 20 min |
| Deploy to v37823, end-to-end test | 20 min |
| **Total** | **~1.5–2 hours** |

---

## The one real risk

s4c2's webpack config uses `clean: true` in the output — it wipes `dist/appserver/static/`
on every build. Any files not emitted or copied by webpack are deleted. The ponypoll
static assets (buttercup.png, icons) must be registered in the `CopyWebpackPlugin`
patterns (step 10 above), not added manually to `dist/`. Missing this causes a confusing
"broken image" after the first `make build`.

---

## After integration

- `ponypollapp` can be uninstalled / ignored — s4c2 is fully self-contained
- The Poll tab appears in the s4c2 nav bar alongside the Workshop tab
- All SPL leaderboard searches remain identical (same index name `ponypoll`, same field names)
- Future ponypoll changes are made inside `src/web/poll/` and picked up by `make build`

---

*Plan created: 2026-05-07*
