# CapCut Clone – Web Video Editor (Prototype)

A lightweight, browser-based video editor inspired by **CapCut**.

> **This is a prototype / starter project**, not a full CapCut replacement. CapCut is a large commercial product with multi-track timelines, AI tools, templates, cloud, mobile apps, etc. This project demonstrates core concepts in pure HTML/CSS/JS.

## Features

- Drag & drop / click to upload videos & images
- Video preview with play / pause / seek
- Basic timeline with clips
- Text overlays (color + size)
- CSS filters (B&W, Sepia, Contrast, Brightness, Blur)
- Playback speed control (0.25x – 2x)
- Volume control
- Simple export (downloads original media in this prototype)
- Dark CapCut-like UI
- Responsive layout

## How to Run

Just open `index.html` in a modern browser (Chrome / Edge / Firefox recommended).

Or serve it locally:

```bash
# Python
python -m http.server 8080

# Node
npx serve .
```

Then visit `http://localhost:8080`.

## Project Structure

```
capcut-clone/
├── index.html      # Main UI
├── styles.css      # Dark theme + layout
├── app.js          # Editor logic
└── README.md
```

## Limitations (by design)

- Single active video at a time (multi-clip timeline is visual only)
- No real transitions / effects rendering
- Export is a simple download of the source file (no baked-in overlays/filters)
- No AI features, templates, stickers, or cloud
- No audio track editing beyond volume

## Possible Next Steps

- Integrate **FFmpeg.wasm** for real client-side export with filters + text
- Multi-track timeline with drag-to-reorder & trim handles
- WebCodecs API for better performance
- React / Vue rewrite for larger feature set
- Electron wrapper for desktop feel

## License

MIT – feel free to fork and extend.

---

Made as a learning / demo project. Not affiliated with ByteDance or CapCut.
