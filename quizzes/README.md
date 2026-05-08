# Pony Poll — Quiz Library

This folder contains ready-to-use quiz JSON files that can be imported directly into any Pony Poll installation.

## Available quizzes

| File | Name | Questions | Difficulty | Topics |
|---|---|---|---|---|
| [`splunk4champions.json`](splunk4champions.json) | Splunk4Champions — Advanced Topics | 22 | Advanced | tstats, buckets, bloom filters, Dashboard Studio, SmartStore, search performance |
| [`splunk-basics.json`](splunk-basics.json) | Splunk Basics | 15 | Beginner | SPL, components, data lifecycle, HEC, forwarders, KV Store |

## How to import

### Option A — from within the app (bundled library)

In the **Editor** tab, click **📚 Library** in the toolbar. This opens a list of quizzes bundled with the app. Click **Import** next to any quiz and choose to replace or append.

> The app serves these files from `/static/app/ponypollapp/quizzes/` — no internet access required.

### Option B — download and import as a file

1. Download the JSON file from this repository (raw view or `curl`)
2. In the **Editor** tab, click **⬆ Import** and select the downloaded file
3. Choose **Replace** (to start fresh) or **Append** (to add to existing questions)

```bash
# Download example
curl -L https://raw.githubusercontent.com/bautt/ponypollApp/main/quizzes/splunk4champions.json \
     -o splunk4champions.json
```

### Option C — direct URL import (advanced)

If your Splunk instance has outbound internet access, you can fetch a quiz directly in the browser console:

```javascript
fetch('https://raw.githubusercontent.com/bautt/ponypollApp/main/quizzes/splunk-basics.json')
  .then(r => r.json())
  .then(qs => console.log(qs.length, 'questions loaded'));
```

## Adding your own quizzes

See the [JSON format reference](../README.md#importexport-json-format) in the main README for the full schema.

To contribute a quiz to this library:
1. Create a new `.json` file in this folder following the same schema
2. Add an entry to `manifest.json`
3. Copy the file to `src/package/appserver/static/quizzes/` so it is bundled with the app
4. Open a pull request
