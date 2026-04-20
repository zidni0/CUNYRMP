# RMP for CUNY Schedule Builder

A Chrome extension that displays [Rate My Professors](https://www.ratemyprofessors.com) ratings and reviews directly on the CUNY Schedule Builder.

## Features

- 🌟 Shows professor ratings next to instructor names
- 📊 Displays difficulty, "would take again" percentage, and number of ratings
- 💬 Shows the most helpful review (clamped to 2 lines with expand/collapse)
- 🚀 Lightweight, no dependencies, no API keys required
- 🔒 All data cached locally — no telemetry, no tracking

## Installation

### For Friends (Load as Unpacked Extension)

1. Download or clone this repo
2. In Chrome, go to `chrome://extensions/`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked**
5. Select the `rmp-cuny-ext` folder
6. Open [CUNY Schedule Builder](https://sb.cunyfirst.cuny.edu)
7. Click the extension icon and select your campus
8. Reload the page — ratings should appear!

### For Users (Chrome Web Store)

Coming soon.

## Usage

1. **Select your campus**: Click the extension popup, pick your CUNY campus from the dropdown, and click **Apply**
2. **View ratings**: Instructor names on the schedule now show:
   - ⭐ Overall rating
   - 📈 Difficulty level
   - 📊 Number of ratings
   - 💬 Top helpful review (if available)
3. **Clear cache**: Click "Clear cache" to refresh all ratings

## Permissions

- `storage` — Caches ratings and remembers your campus selection
- `https://sb.cunyfirst.cuny.edu/*` — To inject ratings into the schedule builder
- `https://www.ratemyprofessors.com/*` — To fetch ratings from the public RMP API

See [PRIVACY.md](./PRIVACY.md) for full details.

## Architecture

- **manifest.json** — MV3 manifest with minimal permissions
- **background.js** — Service worker handling cache and RMP queries
- **content.js** — Injects ratings into the page DOM
- **popup.{html,js,css}** — Campus selection popup
- **lib/rmp.js** — RMP GraphQL client

## Development

```bash
# Clone and navigate
git clone <repo-url>
cd rmp-cuny-ext

# Load in Chrome (Developer mode)
# chrome://extensions/ → Load unpacked → Select this folder
```

No build step needed. All code is vanilla JS/CSS.

## License

MIT

## Disclaimer

Not affiliated with, endorsed by, or sponsored by CUNY or Rate My Professors.
