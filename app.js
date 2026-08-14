/**
 * CapCut Clone v3 – Browser Video Editor
 * Multi-clip, keyboard shortcuts, transitions, thumbnails, text presets, clip reorder.
 */

class CapCutClone {
  constructor() {
    this.media = [];
    this.clips = [];
    this.textOverlays = [];
    this.currentClipIndex = -1;
    this.selectedClipId = null;
    this.isPlaying = false;
    this.isMuted = false;
    this.currentFilter = 'none';
    this.transition = 'none';
    this.pixelsPerSecond = 50;
    this.globalTime = 0;
    this.isTransitioning = false;

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
    this.ruler = document.getElementById('ruler');
    this.fadeOverlay = document.getElementById('fade-overlay');
    this.aspectFrame = document.getElementById('aspect-frame');
  }

  bindEvents() {
    this.uploadZone.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));
    this.uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.uploadZone.classList.add('dragover');
    });
    this.uploadZone.addEventListener('dragleave', () => this.uploadZone.classList.remove('dragover'));
    this.uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.uploadZone.classList.remove('dragover');
      this.handleFiles(e.dataTransfer.files);
    });

    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
        tab.classList.add('active');
        document.getElementById(`tab-${tab.dataset.tab}`).classList.remove('hidden');
      });
    });

    document.getElementById('btn-play').addEventListener('click', () => this.togglePlay());
    document.getElementById('btn-prev').addEventListener('click', () => this.prevClip());
    document.getElementById('btn-next').addEventListener('click', () => this.nextClip());
    document.getElementById('btn-mute').addEventListener('click', () => this.toggleMute());

    this.video.addEventListener('timeupdate', () => this.onTimeUpdate());
    this.video.addEventListener('ended', () => this.onClipEnded());

    this.seekBar.addEventListener('input', () => {
      const total = this.getTotalDuration();
      if (total > 0) this.seekToGlobal((this.seekBar.value / 1000) * total);
    });

    document.getElementById('speed-slider').addEventListener('input', (e) => {
      const speed = parseFloat(e.target.value);
      this.video.playbackRate = speed;
      document.getElementById('speed-value').textContent = speed.toFixed(2) + 'x';
    });
    document.getElementById('volume-slider').addEventListener('input', (e) => {
      this.video.volume = parseFloat(e.target.value);
      if (this.video.volume > 0) {
        this.isMuted = false;
        document.getElementById('btn-mute').textContent = '🔊';
      }
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentFilter = btn.dataset.filter;
        this.applyFilter();
      });
    });

    document.getElementById('transition-select').addEventListener('change', (e) => {
      this.transition = e.target.value;
    });

    document.getElementById('btn-add-text').addEventListener('click', () => this.addTextOverlay());
    document.getElementById('text-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.addTextOverlay();
    });
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => this.applyTextPreset(btn.dataset.preset));
    });

    document.getElementById('btn-delete-clip').addEventListener('click', () => this.deleteSelectedClip());
    document.getElementById('btn-clear-timeline').addEventListener('click', () => this.clearTimeline());
    document.getElementById('btn-split').addEventListener('click', () => this.splitAtPlayhead());
    document.getElementById('btn-zoom-in').addEventListener('click', () => {
      this.pixelsPerSecond = Math.min(120, this.pixelsPerSecond + 10);
      this.renderTimeline();
    });
    document.getElementById('btn-zoom-out').addEventListener('click', () => {
      this.pixelsPerSecond = Math.max(20, this.pixelsPerSecond - 10);
      this.renderTimeline();
    });
    document.getElementById('btn-move-left').addEventListener('click', () => this.moveClip(-1));
    document.getElementById('btn-move-right').addEventListener('click', () => this.moveClip(1));

    document.getElementById('aspect').addEventListener('change', (e) => {
      this.aspectFrame.dataset.aspect = e.target.value;
      this.resizeCanvas();
    });
    this.aspectFrame.dataset.aspect = '16:9';

    document.getElementById('btn-new').addEventListener('click', () => {
      if (confirm('Clear project and start over?')) this.resetProject();
    });
    document.getElementById('btn-export').addEventListener('click', () => this.exportVideo());
    document.getElementById('btn-fullscreen').addEventListener('click', () => {
      const c = document.getElementById('preview-container');
      if (!document.fullscreenElement) c.requestFullscreen?.();
      else document.exitFullscreen?.();
    });

    this.video.addEventListener('loadedmetadata', () => this.resizeCanvas());
    window.addEventListener('resize', () => this.resizeCanvas());
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
  }

  onKeyDown(e) {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        this.togglePlay();
        break;
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        this.deleteSelectedClip();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        this.seekToGlobal(this.globalTime - (e.shiftKey ? 5 : 1));
        break;
      case 'ArrowRight':
        e.preventDefault();
        this.seekToGlobal(this.globalTime + (e.shiftKey ? 5 : 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.prevClip();
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.nextClip();
        break;
      case 'KeyM':
        this.toggleMute();
        break;
      case 'KeyS':
        this.splitAtPlayhead();
        break;
      case 'KeyF':
        document.getElementById('btn-fullscreen').click();
        break;
      case 'BracketLeft':
        this.moveClip(-1);
        break;
      case 'BracketRight':
        this.moveClip(1);
        break;
    }
  }

  async handleFiles(fileList) {
    for (const file of Array.from(fileList)) {
      if (!file.type.startsWith('video/') && !file.type.startsWith('image/')) continue;

      const id = crypto.randomUUID();
      const url = URL.createObjectURL(file);
      const isVideo = file.type.startsWith('video/');
      let duration = 5;
      let thumb = null;

      if (isVideo) {
        duration = await this.getVideoDuration(url);
        thumb = await this.generateThumbnail(url);
      } else {
        thumb = url;
      }

      const media = { id, file, url, type: isVideo ? 'video' : 'image', name: file.name, duration, thumb };
      this.media.push(media);
      this.addClip(media);
    }
    this.renderMediaList();
    this.updateStats();
  }

  getVideoDuration(url) {
    return new Promise((resolve) => {
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.onloadedmetadata = () => resolve(v.duration || 5);
      v.onerror = () => resolve(5);
      v.src = url;
    });
  }

  generateThumbnail(url) {
    return new Promise((resolve) => {
      const v = document.createElement('video');
      v.preload = 'auto';
      v.muted = true;
      v.playsInline = true;
      v.onloadeddata = () => {
        v.currentTime = Math.min(1, (v.duration || 2) * 0.1);
      };
      v.onseeked = () => {
        try {
          const c = document.createElement('canvas');
          c.width = 112;
          c.height = 80;
          const ctx = c.getContext('2d');
          ctx.drawImage(v, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', 0.7));
        } catch {
          resolve(null);
        }
      };
      v.onerror = () => resolve(null);
      setTimeout(() => resolve(null), 4000);
      v.src = url;
    });
  }

  addClip(media) {
    const id = crypto.randomUUID();
    const start = this.getTotalDuration();
    this.clips.push({
      id,
      mediaId: media.id,
      start,
      duration: media.duration,
      offset: 0,
    });
    this.selectedClipId = id;
    if (this.clips.length === 1) this.loadClip(0);
    this.renderTimeline();
    this.updateStats();
  }

  getTotalDuration() {
    return this.clips.reduce((s, c) => s + c.duration, 0);
  }

  getClipAtTime(t) {
    let acc = 0;
    for (let i = 0; i < this.clips.length; i++) {
      const c = this.clips[i];
      if (t < acc + c.duration) return { index: i, localTime: t - acc, clip: c };
      acc += c.duration;
    }
    if (this.clips.length) {
      const last = this.clips.length - 1;
      return { index: last, localTime: this.clips[last].duration, clip: this.clips[last] };
    }
    return null;
  }

  loadClip(index, localTime = 0, autoplay = false) {
    if (index < 0 || index >= this.clips.length) return;
    const clip = this.clips[index];
    const media = this.media.find(m => m.id === clip.mediaId);
    if (!media) return;

    this.currentClipIndex = index;
    this.selectedClipId = clip.id;
    this.noMedia.style.display = 'none';

    if (media.type === 'video') {
      const needReload = this.video.src !== media.url;
      if (needReload) {
        this.video.src = media.url;
        this.video.load();
        this.video.onloadeddata = () => {
          this.video.currentTime = localTime + (clip.offset || 0);
          this.applyFilter();
          this.resizeCanvas();
          if (autoplay || this.isPlaying) this.video.play().catch(() => {});
        };
      } else {
        this.video.currentTime = localTime + (clip.offset || 0);
        this.applyFilter();
        if (autoplay || this.isPlaying) this.video.play().catch(() => {});
      }
      this.video.style.display = 'block';
    } else {
      this.video.style.display = 'none';
    }

    this.renderMediaList();
    this.renderTimeline();
  }

  seekToGlobal(t) {
    const total = this.getTotalDuration();
    t = Math.max(0, Math.min(t, total));
    this.globalTime = t;
    const info = this.getClipAtTime(t);
    if (!info) return;
    if (info.index !== this.currentClipIndex) {
      this.loadClip(info.index, info.localTime, this.isPlaying);
    } else {
      this.video.currentTime = info.localTime + (info.clip.offset || 0);
    }
    this.updateTimeUI();
  }

  togglePlay() {
    if (!this.clips.length) return;
    if (this.isPlaying) {
      this.video.pause();
      this.isPlaying = false;
      document.getElementById('btn-play').textContent = '▶';
    } else {
      if (this.currentClipIndex < 0) this.loadClip(0, 0, true);
      else this.video.play().catch(() => {});
      this.isPlaying = true;
      document.getElementById('btn-play').textContent = '⏸';
      this.drawLoop();
    }
  }

  async onClipEnded() {
    if (this.currentClipIndex < this.clips.length - 1) {
      if (this.transition !== 'none') {
        await this.playTransition();
      }
      this.loadClip(this.currentClipIndex + 1, 0, true);
    } else {
      this.isPlaying = false;
      document.getElementById('btn-play').textContent = '▶';
    }
  }

  playTransition() {
    return new Promise((resolve) => {
      this.isTransitioning = true;
      this.fadeOverlay.classList.add('active');
      setTimeout(() => {
        this.fadeOverlay.classList.remove('active');
        this.isTransitioning = false;
        resolve();
      }, this.transition === 'fadeblack' ? 500 : 350);
    });
  }

  prevClip() {
    if (this.currentClipIndex > 0) this.loadClip(this.currentClipIndex - 1, 0, this.isPlaying);
    else this.seekToGlobal(0);
  }

  nextClip() {
    if (this.currentClipIndex < this.clips.length - 1) {
      this.loadClip(this.currentClipIndex + 1, 0, this.isPlaying);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.video.muted = this.isMuted;
    document.getElementById('btn-mute').textContent = this.isMuted ? '🔇' : '🔊';
  }

  onTimeUpdate() {
    if (this.currentClipIndex < 0 || !this.clips[this.currentClipIndex]) return;
    const clip = this.clips[this.currentClipIndex];
    let acc = 0;
    for (let i = 0; i < this.currentClipIndex; i++) acc += this.clips[i].duration;
    this.globalTime = acc + (this.video.currentTime - (clip.offset || 0));
    this.updateTimeUI();
    this.drawOverlays();
  }

  updateTimeUI() {
    const total = this.getTotalDuration();
    this.timeDisplay.textContent = `${this.formatTime(this.globalTime)} / ${this.formatTime(total)}`;
    if (total > 0) this.seekBar.value = (this.globalTime / total) * 1000;
    const x = 40 + this.globalTime * this.pixelsPerSecond;
    this.playhead.style.left = `${x}px`;
  }

  formatTime(s) {
    s = Math.max(0, s || 0);
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  applyFilter() {
    const map = {
      none: 'none',
      grayscale: 'grayscale(100%)',
      sepia: 'sepia(80%)',
      contrast: 'contrast(140%)',
      brightness: 'brightness(130%)',
      saturate: 'saturate(180%)',
      blur: 'blur(1.5px)',
      invert: 'invert(100%)',
    };
    this.video.style.filter = map[this.currentFilter] || 'none';
  }

  applyTextPreset(name) {
    const presets = {
      title: { text: 'Your Title', size: 72, pos: 'center', color: '#ffffff' },
      subtitle: { text: 'Subtitle here', size: 42, pos: 'bottom', color: '#00f5a0' },
      caption: { text: 'Caption text', size: 36, pos: 'bottom', color: '#ffffff' },
      hook: { text: 'Wait for it...', size: 56, pos: 'top', color: '#ffcc00' },
    };
    const p = presets[name];
    if (!p) return;
    document.getElementById('text-input').value = p.text;
    document.getElementById('text-size').value = String(p.size);
    document.getElementById('text-pos').value = p.pos;
    document.getElementById('text-color').value = p.color;
  }

  addTextOverlay() {
    const text = document.getElementById('text-input').value.trim();
    if (!text) return;
    const pos = document.getElementById('text-pos').value;
    const yMap = { top: 0.15, center: 0.5, bottom: 0.85 };
    this.textOverlays.push({
      id: crypto.randomUUID(),
      text,
      color: document.getElementById('text-color').value,
      size: parseInt(document.getElementById('text-size').value, 10),
      x: 0.5,
      y: yMap[pos] || 0.85,
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
    const rect = this.aspectFrame.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return;
    const vw = this.video.videoWidth || 1280;
    const vh = this.video.videoHeight || 720;
    this.canvas.width = vw;
    this.canvas.height = vh;
    this.drawOverlays();
  }

  drawOverlays() {
    if (!this.canvas.width) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.textOverlays.forEach(t => {
      const scale = this.canvas.width / 640;
      this.ctx.font = `bold ${t.size * scale}px Inter, sans-serif`;
      this.ctx.fillStyle = t.color;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.shadowColor = 'rgba(0,0,0,0.75)';
      this.ctx.shadowBlur = 6;
      this.ctx.lineWidth = 3;
      this.ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      const x = this.canvas.width * t.x;
      const y = this.canvas.height * t.y;
      this.ctx.strokeText(t.text, x, y);
      this.ctx.fillText(t.text, x, y);
      this.ctx.shadowBlur = 0;
    });
  }

  drawLoop() {
    if (!this.isPlaying) return;
    this.drawOverlays();
    requestAnimationFrame(() => this.drawLoop());
  }

  moveClip(dir) {
    if (!this.selectedClipId) return;
    const idx = this.clips.findIndex(c => c.id === this.selectedClipId);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= this.clips.length) return;

    const temp = this.clips[idx];
    this.clips[idx] = this.clips[newIdx];
    this.clips[newIdx] = temp;

    let t = 0;
    this.clips.forEach(c => { c.start = t; t += c.duration; });

    this.currentClipIndex = newIdx;
    this.renderTimeline();
    this.updateStats();
  }

  deleteSelectedClip() {
    if (!this.selectedClipId) return;
    const idx = this.clips.findIndex(c => c.id === this.selectedClipId);
    if (idx === -1) return;
    this.clips.splice(idx, 1);
    this.selectedClipId = null;
    let t = 0;
    this.clips.forEach(c => { c.start = t; t += c.duration; });

    if (this.clips.length === 0) {
      this.currentClipIndex = -1;
      this.video.removeAttribute('src');
      this.video.load();
      this.noMedia.style.display = 'block';
      this.isPlaying = false;
      document.getElementById('btn-play').textContent = '▶';
    } else {
      const newIdx = Math.min(idx, this.clips.length - 1);
      this.loadClip(newIdx, 0, this.isPlaying);
    }
    this.renderTimeline();
    this.updateStats();
  }

  clearTimeline() {
    if (!this.clips.length) return;
    if (!confirm('Clear all clips from timeline?')) return;
    this.clips = [];
    this.currentClipIndex = -1;
    this.selectedClipId = null;
    this.video.removeAttribute('src');
    this.video.load();
    this.noMedia.style.display = 'block';
    this.isPlaying = false;
    document.getElementById('btn-play').textContent = '▶';
    this.renderTimeline();
    this.updateStats();
  }

  splitAtPlayhead() {
    if (this.currentClipIndex < 0) return;
    const clip = this.clips[this.currentClipIndex];
    const local = this.video.currentTime - (clip.offset || 0);
    if (local < 0.3 || local > clip.duration - 0.3) {
      alert('Move playhead further into the clip to split.');
      return;
    }
    const remaining = clip.duration - local;
    clip.duration = local;
    const newClip = {
      id: crypto.randomUUID(),
      mediaId: clip.mediaId,
      start: clip.start + local,
      duration: remaining,
      offset: (clip.offset || 0) + local,
    };
    this.clips.splice(this.currentClipIndex + 1, 0, newClip);
    let t = 0;
    this.clips.forEach(c => { c.start = t; t += c.duration; });
    this.selectedClipId = newClip.id;
    this.renderTimeline();
    this.updateStats();
  }

  resetProject() {
    this.media.forEach(m => URL.revokeObjectURL(m.url));
    this.media = [];
    this.clips = [];
    this.textOverlays = [];
    this.currentClipIndex = -1;
    this.selectedClipId = null;
    this.isPlaying = false;
    this.globalTime = 0;
    this.video.removeAttribute('src');
    this.video.load();
    this.noMedia.style.display = 'block';
    document.getElementById('btn-play').textContent = '▶';
    this.render();
    this.updateStats();
  }

  exportVideo() {
    if (!this.clips.length) {
      alert('Nothing to export. Add clips first.');
      return;
    }
    const clip = this.clips[this.currentClipIndex >= 0 ? this.currentClipIndex : 0];
    const media = this.media.find(m => m.id === clip.mediaId);
    if (media) {
      const a = document.createElement('a');
      a.href = media.url;
      a.download = 'capcut-clone-' + media.name;
      a.click();
      alert('Downloaded source media.\n\nFilters, text & transitions are preview-only.\nFull baked export needs FFmpeg.wasm (future).');
    }
  }

  updateStats() {
    document.getElementById('clip-count').textContent = this.clips.length;
    document.getElementById('total-duration').textContent = this.formatTime(this.getTotalDuration());
  }

  renderMediaList() {
    this.mediaList.innerHTML = '';
    this.media.forEach(m => {
      const onTimeline = this.clips.some(c => c.mediaId === m.id);
      const el = document.createElement('div');
      el.className = 'media-item' + (this.clips[this.currentClipIndex]?.mediaId === m.id ? ' active' : '');

      const thumbHtml = m.thumb
        ? `<img class="media-thumb" src="${m.thumb}" alt="" />`
        : `<div class="media-thumb placeholder">${m.type === 'video' ? '▶' : '🖼'}</div>`;

      el.innerHTML = `
        ${thumbHtml}
        <div class="media-info">
          <div class="media-name">${m.name}</div>
          <div class="media-meta">${m.type} · ${m.duration.toFixed(1)}s ${onTimeline ? '· on timeline' : ''}</div>
        </div>
        <div class="media-actions">
          <button title="Add to timeline" data-add="${m.id}">+</button>
        </div>
      `;
      el.querySelector('[data-add]').addEventListener('click', (e) => {
        e.stopPropagation();
        this.addClip(m);
      });
      el.addEventListener('dblclick', () => this.addClip(m));
      el.addEventListener('click', () => {
        const idx = this.clips.findIndex(c => c.mediaId === m.id);
        if (idx >= 0) this.loadClip(idx, 0, false);
      });
      this.mediaList.appendChild(el);
    });
  }

  renderTextList() {
    this.textList.innerHTML = '';
    this.textOverlays.forEach(t => {
      const el = document.createElement('div');
      el.className = 'text-item';
      el.innerHTML = `<span style="color:${t.color}">${t.text}</span><button>✕</button>`;
      el.querySelector('button').addEventListener('click', () => this.removeTextOverlay(t.id));
      this.textList.appendChild(el);
    });
  }

  renderTimeline() {
    this.ruler.innerHTML = '';
    const total = Math.max(this.getTotalDuration(), 10);
    const step = total > 60 ? 10 : total > 20 ? 5 : 2;
    for (let t = 0; t <= total + step; t += step) {
      const mark = document.createElement('div');
      mark.className = 'ruler-mark';
      mark.style.left = `${t * this.pixelsPerSecond}px`;
      mark.textContent = this.formatTime(t);
      this.ruler.appendChild(mark);
    }

    this.clipsContainer.innerHTML = '';
    this.clipsContainer.style.minWidth = `${Math.max(900, total * this.pixelsPerSecond + 100)}px`;

    this.clips.forEach((clip, i) => {
      const media = this.media.find(m => m.id === clip.mediaId);
      const el = document.createElement('div');
      el.className = 'clip'
        + (clip.id === this.selectedClipId ? ' selected' : '')
        + (i === this.currentClipIndex ? ' playing' : '');
      el.style.left = `${clip.start * this.pixelsPerSecond}px`;
      el.style.width = `${Math.max(clip.duration * this.pixelsPerSecond, 36)}px`;
      el.innerHTML = `<span class="clip-name">${media ? media.name : 'Clip'}</span>`;
      el.addEventListener('click', () => {
        this.selectedClipId = clip.id;
        this.loadClip(i, 0, false);
      });
      this.clipsContainer.appendChild(el);
    });

    this.updateTimeUI();
  }

  render() {
    this.renderMediaList();
    this.renderTimeline();
    this.renderTextList();
    this.updateStats();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.editor = new CapCutClone();
});
