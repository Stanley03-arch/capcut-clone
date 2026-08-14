# CapCut Clone – Web Video Editor (v2)

A lightweight, browser-based video editor inspired by **CapCut**.

> This is a **prototype / learning project**, not a full CapCut replacement. CapCut is a large commercial product with multi-track editing, AI tools, templates, cloud, and mobile apps.

## What's new in v2

- **Multi-clip sequential playback** – clips play one after another
- Better timeline with ruler, zoom in/out, selected & playing states
- Split clip at playhead
- Prev / Next clip buttons
- Mute toggle
- More filters (Vivid, Soft, Invert)
- Text position (Top / Center / Bottom)
- Project stats (clip count + total duration)
- Double-click media or use **+** to add to timeline
- Clearer empty state and UI polish

## Features

- Drag & drop / click to upload videos & images
- Video preview with play / pause / seek across the whole timeline
- Multi-clip timeline
- Text overlays (color, size, position)
- CSS filters
- Playback speed (0.25x – 2x) and volume
- Simple export (downloads source media)
- Dark CapCut-style UI

## How to run

Open `index.html` in Chrome, Edge, or Firefox.

Or serve locally:

```bash
python -m http.server 8080
# or
npx serve .
```

Visit `http://localhost:8080`.

## Project structure

```
capcut-clone/
├── index.html
├── styles.css
├── app.js
└── README.md
```

## Limitations

- Export downloads the original file (filters & text are preview-only)
- No real multi-track audio, transitions, or keyframes
- No AI features or templates
- Single video track

## Future ideas

- FFmpeg.wasm for true client-side export with filters + text baked in
- Drag-to-reorder clips + trim handles
- Transitions between clips
- Stickers / basic effects library
- Electron desktop wrapper

## License

MIT

Not affiliated with ByteDance or CapCut.
