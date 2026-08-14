/**
 * CapCut Clone – Browser Video Editor (Prototype)
 * A lightweight web-based video editor inspired by CapCut.
 */

class CapCutClone {
  constructor() {
    this.media = [];           // { id, file, url, type, name, duration, element }
    this.clips = [];           // { id, mediaId, start, duration, offset }
    this.textOverlays = [];    // { id, text, color, size, x, y }
    this.currentMediaId = null;
    this.selectedClipId = null;
    this.isPlaying = false;
    this.currentFilter = 'none';
    this.pixelsPerSecond = 40; // timeline scale

    this.initElements();
    this.bindEvents();
    this.render();
  }

  initElements() {
    this.video = document.getElementById('preview-video');
    this.canvas = document.getElementById('overlay-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.fileInput = document.getElementById('file-input');
    this.uploadZone = document.getElementById('upload-zone');
    this.mediaList = document.getElementById('media-list');
    this.clipsContainer = document.getElementById('clips-container');
    this.playhead = document.getElementById('playhead');
    this.seekBar = document.getElementById('seek-bar');
    this.timeDisplay = document.getElementById('time-display');
    this.noMedia = document.getElementById('no-media');
    this.textList = document.getElementById('text-list');
  }

  bindEvents() {
    // Upload
    this.uploadZone.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));
    this.uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.uploadZone.classList.add('dragover');
    });
    this.uploadZone.addEventListener('dragleave', () => {
      this.uploadZone.classList.remove('dragover');
    });
    this.uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.uploadZone.classList.remove('dragover');
      this.handleFiles(e.dataTransfer.files);
    });

    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
        tab.classList.add('active');
        document.getElementById(`tab-${tab.dataset.tab}`).classList.remove('hidden');
      });
    });

    // Playback
    document.getElementById('btn-play').addEventListener('click', () => this.togglePlay());
    this.video.addEventListener('timeupdate', () => this.onTimeUpdate());
    this.video.addEventListener('ended', () => {
      this.isPlaying = false;
      document.getElementById('btn-play').textContent = '▶';
    });
    this.seekBar.addEventListener('input', () => {
      if (this.video.duration) {
        this.video.currentTime = (this.seekBar.value / 100) * this.video.duration;
      }
    });

    // Speed & Volume
    document.getElementById('speed-slider').addEventListener('input', (e) => {
      const speed = parseFloat(e.target.value);
      this.video.playbackRate = speed;
      document.getElementById('speed-value').textContent = speed.toFixed(2) + 'x';
    });
    document.getElementById('volume-slider').addEventListener('input', (e) => {
      this.video.volume = parseFloat(e.target.value);
    });

    // Filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentFilter = btn.dataset.filter;
        this.applyFilter();
      });
    });

    // Text
    document.getElementById('btn-add-text').addEventListener('click', () => this.addTextOverlay());

    // Timeline actions
    document.getElementById('btn-delete-clip').addEventListener('click', () => this.deleteSelectedClip());
    document.getElementById('btn-split').addEventListener('click', () => this.splitAtPlayhead());

    // Export
    document.getElementById('btn-export').addEventListener('click', () => this.exportVideo());

    // Fullscreen
    document.getElementById('btn-fullscreen').addEventListener('click', () => {
      const container = document.getElementById('preview-container');
      if (!document.fullscreenElement) {
        container.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
    });

    // Resize canvas with video
    this.video.addEventListener('loadedmetadata', () => this.resizeCanvas());
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  async handleFiles(fileList) {
    for (const file of Array.from(fileList)) {
      if (!file.type.startsWith('video/') && !file.type.startsWith('image/')) continue;

      const id = crypto.randomUUID();
      const url = URL.createObjectURL(file);
      const isVideo = file.type.startsWith('video/');

      let duration = 5; // default for images
      if (isVideo) {
        duration = await this.getVideoDuration(url);
      }

      const media = {
        id,
        file,
        url,
        type: isVideo ? 'video' : 'image',
        name: file.name,
        duration,
      };

      this.media.push(media);

      // Auto-add first video to timeline
      if (isVideo && this.clips.length === 0) {
        this.addClip(media);
        this.loadMedia(media.id);
      }
    }
    this.renderMediaList();
  }

  getVideoDuration(url) {
    return new Promise((resolve) => {
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.onloadedmetadata = () => {
        resolve(v.duration || 5);
        URL.revokeObjectURL(v.src);
      };
      v.onerror = () => resolve(5);
      v.src = url;
    });
  }

  addClip(media) {
    const id = crypto.randomUUID();
    const start = this.clips.reduce((sum, c) => sum + c.duration, 0);
    this.clips.push({
      id,
      mediaId: media.id,
      start,
      duration: media.duration,
      offset: 0, // trim start
    });
    this.selectedClipId = id;
    this.renderTimeline();
  }

  loadMedia(mediaId) {
    const media = this.media.find(m => m.id === mediaId);
    if (!media) return;

    this.currentMediaId = mediaId;
    this.noMedia.style.display = 'none';

    if (media.type === 'video') {
      this.video.src = media.url;
      this.video.style.display = 'block';
      this.video.load();
    } else {
      // For images we could show on canvas, but keep simple
      this.video.style.display = 'none';
    }

    this.renderMediaList();
    this.applyFilter();
  }

  togglePlay() {
    if (!this.video.src) return;
    if (this.video.paused) {
      this.video.play();
      this.isPlaying = true;
      document.getElementById('btn-play').textContent = '⏸';
      this.drawLoop();
    } else {
      this.video.pause();
      this.isPlaying = false;
      document.getElementById('btn-play').textContent = '▶';
    }
  }

  onTimeUpdate() {
    if (!this.video.duration) return;
    const pct = (this.video.currentTime / this.video.duration) * 100;
    this.seekBar.value = pct;
    this.timeDisplay.textContent = `${this.formatTime(this.video.currentTime)} / ${this.formatTime(this.video.duration)}`;

    // Move playhead
    const totalDuration = this.clips.reduce((s, c) => s + c.duration, 0) || this.video.duration;
    const x = 40 + (this.video.currentTime / totalDuration) * (this.clipsContainer.scrollWidth || 800);
    this.playhead.style.left = `${x}px`;
  }

  formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  applyFilter() {
    const filters = {
      none: 'none',
      grayscale: 'grayscale(100%)',
      sepia: 'sepia(80%)',
      contrast: 'contrast(140%)',
      brightness: 'brightness(130%)',
      blur: 'blur(2px)',
    };
    this.video.style.filter = filters[this.currentFilter] || 'none';
  }

  addTextOverlay() {
    const text = document.getElementById('text-input').value.trim();
    if (!text) return;

    const id = crypto.randomUUID();
    this.textOverlays.push({
      id,
      text,
      color: document.getElementById('text-color').value,
      size: parseInt(document.getElementById('text-size').value, 10),
      x: 0.5,
      y: 0.8,
    });
    document.getElementById('text-input').value = '';
    this.renderTextList();
    this.drawOverlays();
  }

  removeTextOverlay(id) {
    this.textOverlays = this.textOverlays.filter(t => t.id !== id);
    this.renderTextList();
    this.drawOverlays();
  }

  resizeCanvas() {
    if (!this.video.videoWidth) return;
    const rect = this.video.getBoundingClientRect();
    this.canvas.width = this.video.videoWidth;
    this.canvas.height = this.video.videoHeight;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.drawOverlays();
  }

  drawOverlays() {
    if (!this.canvas.width) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.textOverlays.forEach(t => {
      this.ctx.font = `bold ${t.size * (this.canvas.width / 640)}px Inter, sans-serif`;
      this.ctx.fillStyle = t.color;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.shadowColor = 'rgba(0,0,0,0.7)';
      this.ctx.shadowBlur = 4;
      this.ctx.fillText(t.text, this.canvas.width * t.x, this.canvas.height * t.y);
      this.ctx.shadowBlur = 0;
    });
  }

  drawLoop() {
    if (!this.isPlaying) return;
    this.drawOverlays();
    requestAnimationFrame(() => this.drawLoop());
  }

  deleteSelectedClip() {
    if (!this.selectedClipId) return;
    this.clips = this.clips.filter(c => c.id !== this.selectedClipId);
    this.selectedClipId = null;
    // Recompute starts
    let t = 0;
    this.clips.forEach(c => {
      c.start = t;
      t += c.duration;
    });
    this.renderTimeline();
  }

  splitAtPlayhead() {
    // Simple prototype: just log – full split needs more timeline logic
    alert('Split is a placeholder in this prototype. Full multi-clip timeline editing requires more complex state management.');
  }

  async exportVideo() {
    if (!this.video.src) {
      alert('No video loaded to export.');
      return;
    }

    // Simple export: record the playing video + canvas using MediaRecorder
    // Note: This is a basic approach. Real export needs FFmpeg.wasm or server-side processing.
    try {
      const stream = this.video.captureStream ? this.video.captureStream() : null;
      if (!stream) {
        // Fallback: just download the original file
        const media = this.media.find(m => m.id === this.currentMediaId);
        if (media) {
          const a = document.createElement('a');
          a.href = media.url;
          a.download = 'capcut-clone-export-' + media.name;
          a.click();
          return;
        }
      }

      // Prefer downloading original for reliability in this prototype
      const media = this.media.find(m => m.id === this.currentMediaId);
      if (media) {
        const a = document.createElement('a');
        a.href = media.url;
        a.download = 'exported-' + media.name;
        a.click();
        alert('Exported original media (prototype). For true rendered export with overlays/filters, integrate FFmpeg.wasm.');
      }
    } catch (err) {
      console.error(err);
      alert('Export failed. Try downloading the original media from the Media panel.');
    }
  }

  renderMediaList() {
    this.mediaList.innerHTML = '';
    this.media.forEach(m => {
      const el = document.createElement('div');
      el.className = 'media-item' + (m.id === this.currentMediaId ? ' active' : '');
      el.innerHTML = `
        <div class="media-thumb" style="background:#111;display:flex;align-items:center;justify-content:center;font-size:10px;color:#555">
          ${m.type === 'video' ? '▶' : '🖼'}
        </div>
        <div class="media-info">
          <div class="media-name">${m.name}</div>
          <div class="media-meta">${m.type} · ${m.duration.toFixed(1)}s</div>
        </div>
      `;
      el.addEventListener('click', () => {
        this.loadMedia(m.id);
        // Also ensure it's on timeline
        if (!this.clips.find(c => c.mediaId === m.id)) {
          this.addClip(m);
        }
      });
      // Double-click or button to add to timeline could be added
      this.mediaList.appendChild(el);
    });
  }

  renderTextList() {
    this.textList.innerHTML = '';
    this.textOverlays.forEach(t => {
      const el = document.createElement('div');
      el.className = 'text-item';
      el.innerHTML = `
        <span style="color:${t.color}">${t.text}</span>
        <button data-id="${t.id}">✕</button>
      `;
      el.querySelector('button').addEventListener('click', () => this.removeTextOverlay(t.id));
      this.textList.appendChild(el);
    });
  }

  renderTimeline() {
    this.clipsContainer.innerHTML = '';
    this.clips.forEach(clip => {
      const media = this.media.find(m => m.id === clip.mediaId);
      const el = document.createElement('div');
      el.className = 'clip' + (clip.id === this.selectedClipId ? ' selected' : '');
      el.style.left = `${clip.start * this.pixelsPerSecond}px`;
      el.style.width = `${Math.max(clip.duration * this.pixelsPerSecond, 40)}px`;
      el.innerHTML = `<span class="clip-name">${media ? media.name : 'Clip'}</span>`;
      el.addEventListener('click', () => {
        this.selectedClipId = clip.id;
        this.loadMedia(clip.mediaId);
        this.renderTimeline();
      });
      this.clipsContainer.appendChild(el);
    });
  }

  render() {
    this.renderMediaList();
    this.renderTimeline();
    this.renderTextList();
  }
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
  window.editor = new CapCutClone();
});
