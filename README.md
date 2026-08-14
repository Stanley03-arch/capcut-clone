# CapCut Clone – Web Video Editor (v5)

Browser-based CapCut-inspired video editor.

## Features

### Editing
- Multi-clip timeline, split, delete, reorder (drag / touch)
- **Trim handles** on clip edges
- **Undo / Redo** (Ctrl+Z / Ctrl+Y)
- **Snap to edges**, markers, pinch-zoom
- Per-clip **speed**, **opacity**, **fade in/out**
- **Flip H/V**, **rotate 90°**, reverse flag

### Effects & text
- Filters + **intensity** slider
- Transitions (fade / fade through black)
- Text overlays with styles: basic, stroke, box, neon, shadow
- **Stickers / emoji** (drag on preview)

### Project
- Save / Load (localStorage + JSON)
- Export downloads source media (preview effects)

## Run

```bash
python -m http.server 8080
```

Open `index.html` in Chrome / Edge / Firefox.

## License

MIT — not affiliated with ByteDance or CapCut.
