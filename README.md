# Letterboxd Alternative Sources

A Chrome extension (Manifest V3) that injects configurable alternative streaming/search source links onto Letterboxd film pages, directly above the existing "Stream" section.

## Features

- Adds an **Alternative** section above the Stream panel on any `letterboxd.com/film/*` page
- Configurable sources with per-source options:
  - `encodeUrlParams` — applies `encodeURIComponent` to the query
  - `spacesToPlus` — replaces spaces with `+`
  - `addYear` — appends the film's release year to the query
  - Optional icon/favicon URL per source
- Live URL preview in the settings wizard
- Handles Letterboxd's SPA navigation (pjax) and the dynamically loaded availability modal (colorbox)

## File Structure

```
LetterboxdAltSources/
├── manifest.json          # MV3 extension manifest
├── background.js          # Service worker (initialises default storage)
├── content.js             # DOM injection + MutationObserver logic
├── content.css            # Injected styles (Letterboxd dark theme)
├── icons/
│   ├── icon16.png         # Add 16×16 PNG
│   ├── icon48.png         # Add 48×48 PNG
│   └── icon128.png        # Add 128×128 PNG
└── options/
    ├── options.html       # Settings page
    ├── options.js         # Settings logic (CRUD for sources)
    └── options.css        # Settings styles
```

## Installation (Development)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this directory
5. Open the extension settings via the puzzle-piece menu → **Letterboxd Alternative Sources** → **Options**

## Icons

Place 16×16, 48×48, and 128×128 PNG files in the `icons/` directory. The extension will load without them but will show a generic icon in the toolbar.

## Storage Schema

Sources are saved to `chrome.storage.local` as:

```json
{
  "sources": [
    {
      "id": "abc123",
      "name": "JustWatch",
      "baseUrl": "https://www.justwatch.com/us/search?q=",
      "encodeUrlParams": true,
      "spacesToPlus": false,
      "addYear": false,
      "iconUrl": "https://www.justwatch.com/favicon.ico"
    }
  ]
}
```

## Packaging for Distribution

```bash
# Zip only the required files (exclude .git, node_modules, etc.)
zip -r letterboxd-alt-sources.zip \
  manifest.json background.js content.js content.css \
  options/ icons/
```

Then upload to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).

## Notes on Letterboxd DOM

- **Film title**: `.headline-1 .name`
- **Release year**: `.releasedate a`
- **Stream section**: searched by heading text content (`/^stream$/i`) — if Letterboxd ever changes class names the text-based fallback should still work
- The availability panel can be loaded both inline in the sidebar and inside a **colorbox** modal overlay; both are handled via `MutationObserver`
- SPA navigation is detected by observing URL changes via `MutationObserver` and listening for the `page:load` event
