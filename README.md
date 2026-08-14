# CapCut Clone – Web Video Editor (v3)

A lightweight browser-based video editor inspired by CapCut.

> Prototype / learning project — not a full CapCut replacement.

## What's new in v3

- **Keyboard shortcuts**
  - `Space` – play / pause
  - `Delete` / `Backspace` – delete selected clip
  - `←` `→` – seek (±1s, Shift = ±5s)
  - `↑` `↓` – previous / next clip
  - `M` – mute
  - `S` – split at playhead
  - `F` – fullscreen
  - `[` `]` – move clip left / right
- **Drag-and-drop reorder** – drag clips on the timeline to reorder
- **Clip reorder** – also via buttons / `[` `]` keys
- **Transitions** – Fade / Fade through black between clips
- **Video thumbnails** in the media list
- **Text presets** – Title, Subtitle, Caption, Hook
- **Aspect ratio preview** – 16:9, 9:16, 1:1, 4:5
- UI polish + shortcut hint bar

## Features overview

- Multi-clip sequential playback
- Timeline with ruler, zoom, split, delete
- Text overlays (color, size, position)
- CSS filters
- Speed & volume control
- Drag & drop upload
- Dark CapCut-style UI

## How to run

Open `index.html` in Chrome / Edge / Firefox, or:

```bash
python -m http.server 8080
```

## Limitations

- Export downloads original media (filters/text/transitions are preview-only)
- No multi-track audio, advanced keyframes, or AI tools
- True baked export needs FFmpeg.wasm

## License

MIT — not affiliated with ByteDance or CapCut.
