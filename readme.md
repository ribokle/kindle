# Kindle Dashboard

A lightweight, e-ink optimized daily calendar + task dashboard for Kindle Paperwhite.
Hosted as a static site on GitHub Pages — no backend, no login, no cost.

-----

## Files

```
kindle-dashboard/
├── index.html   — page structure & tabs
├── style.css    — e-ink optimized styles
├── app.js       — all logic (ES5, no build step)
└── data.json    — YOUR calendar data (edit this)
```

-----

## Setup (10 minutes)

### 1. Create a GitHub repo

1. Go to github.com → New repository
1. Name it `kindle-dashboard`
1. Set to **Public** (required for free GitHub Pages)
1. Click Create

### 2. Upload files

Upload all 4 files (`index.html`, `style.css`, `app.js`, `data.json`) to the repo.

### 3. Enable GitHub Pages

1. Repo → Settings → Pages
1. Source: **Deploy from a branch**
1. Branch: `main` / root `/`
1. Save

Your URL will be: `https://YOUR_USERNAME.github.io/kindle-dashboard/`

-----

## Configure your location (weather)

Open `app.js` and update these two lines near the top:

```js
weatherLat: 12.9716,   // Your latitude
weatherLon: 77.5946,   // Your longitude
```

Find your coordinates at: https://www.latlong.net/

Weather uses Open-Meteo — completely free, no API key required.

-----

## Adding events & tasks (data.json)

Edit `data.json` in GitHub’s web editor (pencil icon) and commit.
The Kindle refreshes every 10 minutes and picks up changes automatically.

### Event fields

|Field|Required|Example                           |
|-----|--------|----------------------------------|
|id   |Yes     |`"e1"` — must be unique           |
|date |Yes     |`"2026-05-15"` (YYYY-MM-DD)       |
|time |No      |`"14:30"` (24hr format)           |
|title|Yes     |`"Team meeting"`                  |
|tag  |No      |`"work"`, `"health"`, `"personal"`|

### Task fields

|Field|Required|Example                |
|-----|--------|-----------------------|
|id   |Yes     |`"t1"` — must be unique|
|date |Yes     |`"2026-05-15"`         |
|title|Yes     |`"Email Sarah"`        |
|done |No      |`false` (default)      |

**Important:** Always increment IDs. Never reuse an ID — it will confuse the done/undone state saved on the Kindle.

-----

## On your Kindle

1. Open Experimental Browser
   → Menu → Settings → Experimental Browser (enable if first time)
1. Navigate to your GitHub Pages URL
1. Bookmark it
   → Tap the ☆ (bookmark) icon
1. Optional: set as browser homepage
   → Browser Menu → Settings → Homepage → paste your URL

The page auto-refreshes every 10 minutes. Task checkmarks are stored locally on the Kindle — they survive refreshes. To reset all done tasks, tap **TASKS** tab → **CLEAR DONE**.

-----

## Updating data on the go

Easiest: edit `data.json` directly on GitHub mobile app or github.com from your phone.
Commit → the Kindle picks it up on next refresh.

-----

## FAQ

**Q: Tasks I checked on Kindle disappeared after a page reload**
A: They shouldn’t — done state is in localStorage. If the Kindle clears storage, the state resets to what’s in data.json. You can set `"done": true` in data.json for permanently done tasks.

**Q: Weather isn’t showing**
A: The Kindle browser may block requests to external APIs. If so, weather will simply stay blank — everything else still works.

**Q: Fonts look different on Kindle**
A: Google Fonts may not load in the Kindle browser. The CSS falls back to Georgia + Courier New which look great on e-ink.

**Q: Can I add recurring events?**
A: Not natively — just duplicate the event entries for each date in data.json. A future improvement could generate recurring entries automatically.
