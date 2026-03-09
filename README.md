# Letterboxd Alternative Sources

A Chrome extension that adds configurable alternative streaming/search links to Letterboxd film pages, appearing directly above the existing "Stream" section.

## What it does

When you visit a film page on Letterboxd (e.g. `letterboxd.com/film/the-godfather/`), the extension injects an **Alternative** section with links to whatever sources you configure — search engines, streaming sites, download sites, or anything else with a search URL.

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

Click **Load unpacked**, then navigate to and select the folder you unzipped in Step 1 (the one containing `manifest.json`). Click **Select Folder**.

The extension will appear in your list. You're installed!

### Step 5 — Open the Options page

Click the puzzle-piece icon (🧩) in the Chrome toolbar, find **Letterboxd Alternative Sources**, and click the three-dot menu → **Options**. This opens the settings page where you manage your sources.

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

This repo includes a file called `letterboxd-alt-sources.json` with a couple of ready-made sources to get you started.

1. Open the Options page (see Step 5 above)
2. Click the **Import** button
3. Navigate to the folder from Step 1 and select `letterboxd-alt-sources.json`
4. Your sources will be added immediately

You can also **Export** your sources at any time to save a backup or share them.
