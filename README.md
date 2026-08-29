# Letterboxd Alternative Sources

A Chrome extension that adds configurable alternative streaming/search links to Letterboxd film pages, appearing directly above the existing "Stream" section.

## What it does

When you visit a film page on Letterboxd (e.g. `letterboxd.com/film/the-godfather/`), the extension injects an **Alternative** section with links to whatever sources you configure — search engines, streaming aggregators, film databases, or anything else with a search URL.

---

## Installation

Since this extension isn't on the Chrome Web Store, you load it directly from the downloaded folder. This is called loading an "unpacked" extension.

### Step 1 — Download the extension files

[Download this repository](https://github.com/jack-sleath/LetterboxdAltSources/archive/refs/heads/main.zip) and unzip it somewhere you won't accidentally delete it (e.g. your Documents folder).

### Step 2 — Open Chrome's extension page

In Chrome, go to:

```
chrome://extensions
```

Or open the menu (⋮) → **Extensions** → **Manage Extensions**.

### Step 3 — Enable Developer Mode

In the top-right corner of the extensions page, toggle on **Developer mode**.

### Step 4 — Load the extension

Click **Load unpacked**, then navigate into the folder you unzipped in Step 1 and select the **`alt-sources`** folder inside it (the one containing `manifest.json`). Click **Select Folder**.

The extension will appear in your list. You're installed!

### Step 5 — Open the Options page

Click the extension's icon in the Chrome toolbar — it opens the settings page directly. If the icon isn't pinned, click the puzzle-piece icon (🧩), find **Letterboxd Alternative Sources**, and either click it or use the three-dot menu → **Options**. This is where you manage your sources.

A **YouTube** source is set up for you on install, so there's something to see straight away: it searches YouTube for the film title, year and the words "full movie" — e.g. `The Godfather 1972 full movie`. Edit or delete it like any other source.

---

## Adding a source

In the Options page, click **+ Add Source** to open the source wizard.

### Fields

**Display Name** *(required)*
The label shown on Letterboxd next to the link. For example: `JustWatch` or `Google`.

**Base Search URL** *(required)*
The URL of the site's search page, including everything up to and including the query parameter. The film title will be appended directly after this.

For example, if searching Google for "The Godfather" gives you:
```
https://www.google.com/search?q=The+Godfather
```
Then your Base Search URL is:
```
https://www.google.com/search?q=
```

**Icon URL** *(optional)*
A URL to a small image (usually the site's favicon) shown next to the link. Most sites have one at `/favicon.ico`, e.g. `https://www.google.com/favicon.ico`. Leave blank if you don't want an icon.

**Additional Text** *(optional)*
Extra words appended to the search query after the title (and year, if enabled) — e.g. `full movie` for YouTube, giving `The Godfather 1972 full movie`. The Query Options below apply to this text too, so it gets encoded / plus-joined the same way as the title.

### Query Options

These control how the film title is formatted before being added to the URL.

| Option | What it does |
|---|---|
| **Encode URL params** | Applies standard URL-encoding to the title (e.g. spaces become `%20`). Turn this on for most sites. |
| **Replace spaces with +** | Replaces spaces with `+` instead of `%20`. Some older-style search URLs prefer this. |
| **Append year** | Adds the film's release year to the search query (e.g. `The Godfather 1972`). Useful for disambiguation. |
| **Remove punctuation** | Strips punctuation from the title — e.g. `Hail, Caesar!` becomes `Hail Caesar`. Helpful if a site doesn't handle punctuation well. |
| **Punctuation to spaces** | Replaces punctuation characters with spaces — e.g. `M*A*S*H` becomes `M A S H`. |

> **Tip:** The **Preview** box at the bottom of the wizard shows you exactly what the final URL will look like as you adjust settings. You can edit the sample film title and year to test with a specific film.

Click **Save** when you're done.

---

## Importing the example sources

This repo includes a file called `letterboxd-alt-sources.json` with four ready-made sources: **JustWatch**, **YouTube**, **Internet Archive** and **Google**. (The YouTube one is the same source that's already installed by default, so importing won't duplicate it.)

1. Open the Options page (see Step 5 above)
2. Click the **Import** button
3. Navigate to the folder from Step 1 and select `letterboxd-alt-sources.json`
4. Your sources will be added immediately

Once imported you can edit any of them — for instance, the JustWatch source is set to the UK region (`/uk/`), so change that to your own if needed.

---

## Repo layout

```
alt-sources/                 the extension itself (this is what gets loaded/zipped)
  manifest.json
  background.js
  content.js / content.css
  options/                   settings page
  icons/                     generated by make-icons.bat
dist/                        build output (gitignored)
build-extension.bat / .ps1   packages the extension for Chrome/Edge + Firefox
make-icons.bat               logo.png -> alt-sources/icons/icon16|32|48|128.png
logo.png                     icon artwork (placeholder — replace with your own)
promo.html                   1200x627 store promo tile
PrivacyPolicy.md             privacy policy for store submission
letterboxd-alt-sources.json  example sources you can import
```

## Building for the stores

Double-click **`build-extension.bat`** (or run `build-extension.ps1`). It:

1. Moves any zips already in `dist/` into `dist/archive/`, so `dist/` only ever holds the latest pair
2. Stamps a date-based version into `alt-sources/manifest.json` (e.g. `26.8.19.1135` — year.month.day.hhmm)
3. Writes `dist/<version>-alt-sources-chrome-edge.zip` for the Chrome Web Store and Edge Add-ons
4. Writes `dist/<version>-alt-sources-firefox.zip` for Firefox Add-ons (AMO), adding the `browser_specific_settings.gecko` block and swapping the background service worker for `background.scripts`, which is what Firefox MV3 expects

Zip entry names use forward slashes, since AMO rejects archives containing backslashes.

## Regenerating the icons

Replace `logo.png` in the repo root with your own square artwork (512×512 or larger), then run **`make-icons.bat`**. It writes `icon16.png`, `icon32.png`, `icon48.png` and `icon128.png` into `alt-sources/icons/`, which is where `manifest.json` expects them.

## Promo tile

Open `promo.html` in a browser and screenshot the 1200×627 page for the Chrome Web Store's promotional tile.

You can also **Export** your sources at any time to save a backup or share them.
