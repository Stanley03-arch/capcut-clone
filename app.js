class CapCutClone {
  /* v5 */
  constructor() {
    this.media = [];
    this.clips = [];
    this.textOverlays = [];
    this.stickers = [];
    this.filterIntensity = 1;
    this.clipOpacity = 1;
    this.currentClipIndex = -1;
    this.selectedClipId = null;
    this.isPlaying = false;
    this.isMuted = false;
    this.currentFilter = 'none';
    this.transition = 'none';
    this.pixelsPerSecond = 50;
    this.globalTime = 0;
    this.isTransitioning = false;
    this.markers = [];
    this.snapEnabled = true;
    this.globalSpeed = 1;
    this.history = [];
    this.historyIndex = -1;
    this.maxHistory = 40;
    this._historyLocked = false;

    this.initElements();
    this.bindEvents();
    this.render();
    this.pushHistory('init');
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
    this.timelineEl = document.getElementById('timeline');
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
        const panel = document.getElementById('tab-' + tab.dataset.tab);
        if (panel) panel.classList.remove('hidden');
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
      this.globalSpeed = parseFloat(e.target.value);
      document.getElementById('speed-value').textContent = this.globalSpeed.toFixed(2) + 'x';
      this.applyClipSpeed();
    });
    document.getElementById('volume-slider').addEventListener('input', (e) => {
      this.video.volume = parseFloat(e.target.value);
      if (this.video.volume > 0) {
        this.isMuted = false;
        document.getElementById('btn-mute').textContent = '🔊';
      }
    });

    const clipSpeed = document.getElementById('clip-speed-slider');
    if (clipSpeed) {
      clipSpeed.addEventListener('input', (e) => {
        const v = parseFloat(e.target.value);
        const lab = document.getElementById('clip-speed-value');
        if (lab) lab.textContent = v.toFixed(2) + 'x';
        const clip = this.clips.find(c => c.id === this.selectedClipId);
        if (clip) {
          clip.speed = v;
          this.applyClipSpeed();
          this.recomputeClipStarts();
          this.renderTimeline();
          this.updateStats();
          this.pushHistory('clip-speed');
        }
      });
    }

    const snap = document.getElementById('snap-toggle');
    if (snap) snap.addEventListener('change', (e) => { this.snapEnabled = e.target.checked; });

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentFilter = btn.dataset.filter;
        this.applyFilter();
        this.pushHistory('filter');
      });
    });

    document.getElementById('transition-select').addEventListener('change', (e) => {
      this.transition = e.target.value;
      this.pushHistory('transition');
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
    document.getElementById('btn-zoom-in').addEventListener('click', () => this.setZoom(this.pixelsPerSecond + 10));
    document.getElementById('btn-zoom-out').addEventListener('click', () => this.setZoom(this.pixelsPerSecond - 10));
    document.getElementById('btn-move-left').addEventListener('click', () => this.moveClip(-1));
    document.getElementById('btn-move-right').addEventListener('click', () => this.moveClip(1));

    const btnUndo = document.getElementById('btn-undo');
    const btnRedo = document.getElementById('btn-redo');
    const btnSave = document.getElementById('btn-save');
    const btnLoad = document.getElementById('btn-load');
    const btnMarker = document.getElementById('btn-marker');
    if (btnUndo) btnUndo.addEventListener('click', () => this.undo());
    if (btnRedo) btnRedo.addEventListener('click', () => this.redo());
    if (btnSave) btnSave.addEventListener('click', () => this.saveProject());
    if (btnLoad) btnLoad.addEventListener('click', () => this.loadProject());
    if (btnMarker) btnMarker.addEventListener('click', () => this.addMarker());

    document.getElementById('btn-export').addEventListener('click', () => this.exportVideo());

    const fi = document.getElementById('filter-intensity');
    if (fi) fi.addEventListener('input', (e) => {
      this.filterIntensity = parseInt(e.target.value, 10) / 100;
      const lab = document.getElementById('filter-intensity-value');
      if (lab) lab.textContent = e.target.value + '%';
      this.applyFilter();
    });
    const co = document.getElementById('clip-opacity');
    if (co) co.addEventListener('input', (e) => {
      this.clipOpacity = parseInt(e.target.value, 10) / 100;
      const lab = document.getElementById('clip-opacity-value');
      if (lab) lab.textContent = e.target.value + '%';
      const clip = this.clips.find(c => c.id === this.selectedClipId);
      if (clip) { clip.opacity = this.clipOpacity; this.pushHistory('opacity'); }
      this.video.style.opacity = String(this.clipOpacity);
    });
    const fadeIn = document.getElementById('fade-in');
    if (fadeIn) fadeIn.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      document.getElementById('fade-in-value').textContent = v.toFixed(1);
      const clip = this.clips.find(c => c.id === this.selectedClipId);
      if (clip) { clip.fadeIn = v; this.pushHistory('fade-in'); }
    });
    const fadeOut = document.getElementById('fade-out');
    if (fadeOut) fadeOut.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      document.getElementById('fade-out-value').textContent = v.toFixed(1);
      const clip = this.clips.find(c => c.id === this.selectedClipId);
      if (clip) { clip.fadeOut = v; this.pushHistory('fade-out'); }
    });
    const btnFlipH = document.getElementById('btn-flip-h');
    if (btnFlipH) btnFlipH.addEventListener('click', () => this.toggleTransform('flipH'));
    const btnFlipV = document.getElementById('btn-flip-v');
    if (btnFlipV) btnFlipV.addEventListener('click', () => this.toggleTransform('flipV'));
    const btnRotate = document.getElementById('btn-rotate');
    if (btnRotate) btnRotate.addEventListener('click', () => this.toggleTransform('rotate'));
    const btnReverse = document.getElementById('btn-reverse');
    if (btnReverse) btnReverse.addEventListener('click', () => this.toggleReverse());

    document.querySelectorAll('.sticker-btn').forEach(btn => {
      btn.addEventListener('click', () => this.addSticker(btn.dataset.sticker));
    });

    this.bindTimelineZoom();

    document.getElementById('aspect').addEventListener('change', (e) => {
      this.aspectFrame.dataset.aspect = e.target.value;
      this.resizeCanvas();
    });
    this.aspectFrame.dataset.aspect = '16:9';

    document.getElementById('btn-new').addEventListener('click', () => {
      if (confirm('Clear project and start over?')) this.resetProject();
    });
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
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !e.shiftKey) {
      e.preventDefault(); this.undo(); return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyY' || (e.code === 'KeyZ' && e.shiftKey))) {
      e.preventDefault(); this.redo(); return;
    }
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
      e.preventDefault(); this.saveProject(); return;
    }
    switch (e.code) {
      case 'Space': e.preventDefault(); this.togglePlay(); break;
      case 'Delete':
      case 'Backspace': e.preventDefault(); this.deleteSelectedClip(); break;
      case 'ArrowLeft': e.preventDefault(); this.seekToGlobal(this.globalTime - (e.shiftKey ? 5 : 1)); break;
      case 'ArrowRight': e.preventDefault(); this.seekToGlobal(this.globalTime + (e.shiftKey ? 5 : 1)); break;
      case 'ArrowUp': e.preventDefault(); this.prevClip(); break;
      case 'ArrowDown': e.preventDefault(); this.nextClip(); break;
      case 'KeyM': if (!e.ctrlKey && !e.metaKey) this.toggleMute(); break;
      case 'KeyS': if (!e.ctrlKey && !e.metaKey) this.splitAtPlayhead(); break;
      case 'KeyF': document.getElementById('btn-fullscreen').click(); break;
      case 'BracketLeft': this.moveClip(-1); break;
      case 'BracketRight': this.moveClip(1); break;
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
      this.media.push({ id, file, url, type: isVideo ? 'video' : 'image', name: file.name, duration, thumb });
      this.addClip(this.media[this.media.length - 1], false);
    }
    this.renderMediaList();
    this.updateStats();
    this.pushHistory('add-media');
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
      v.onloadeddata = () => { v.currentTime = Math.min(1, (v.duration || 2) * 0.1); };
      v.onseeked = () => {
        try {
          const c = document.createElement('canvas');
          c.width = 112; c.height = 80;
          c.getContext('2d').drawImage(v, 0, 0, 112, 80);
          resolve(c.toDataURL('image/jpeg', 0.7));
        } catch { resolve(null); }
      };
      v.onerror = () => resolve(null);
      setTimeout(() => resolve(null), 4000);
      v.src = url;
    });
  }

  addClip(media, pushHist = true) {
    const id = crypto.randomUUID();
    this.clips.push({
      id, mediaId: media.id, start: this.getTotalDuration(),
      duration: media.duration, offset: 0, speed: 1, opacity: 1, fadeIn: 0, fadeOut: 0,
    });
    this.selectedClipId = id;
    if (this.clips.length === 1) this.loadClip(0);
    this.renderTimeline();
    this.updateStats();
    this.syncClipSpeedUI();
    if (pushHist) this.pushHistory('add-clip');
  }

  getTotalDuration() {
    return this.clips.reduce((s, c) => s + c.duration / (c.speed || 1), 0);
  }

  getClipAtTime(t) {
    let acc = 0;
    for (let i = 0; i < this.clips.length; i++) {
      const c = this.clips[i];
      const dur = c.duration / (c.speed || 1);
      if (t < acc + dur) return { index: i, localTime: (t - acc) * (c.speed || 1), clip: c };
      acc += dur;
    }
    if (this.clips.length) {
      const last = this.clips.length - 1;
      return { index: last, localTime: this.clips[last].duration, clip: this.clips[last] };
    }
    return null;
  }

  recomputeClipStarts() {
    let t = 0;
    this.clips.forEach(c => {
      c.start = t;
      t += c.duration / (c.speed || 1);
    });
  }

  loadClip(index, localTime = 0, autoplay = false) {
    if (index < 0 || index >= this.clips.length) return;
    const clip = this.clips[index];
    const media = this.media.find(m => m.id === clip.mediaId);
    if (!media) return;
    this.currentClipIndex = index;
    this.selectedClipId = clip.id;
    this.noMedia.style.display = 'none';
    this.syncClipSpeedUI();
    this.updateClipFadeUI();
    this.applyTransform(clip);

    if (media.type === 'video') {
      const needReload = this.video.src !== media.url;
      if (needReload) {
        this.video.src = media.url;
        this.video.load();
        this.video.onloadeddata = () => {
          this.video.currentTime = localTime + (clip.offset || 0);
          this.applyFilter();
          this.applyClipSpeed();
          this.resizeCanvas();
          if (autoplay || this.isPlaying) this.video.play().catch(() => {});
        };
      } else {
        this.video.currentTime = localTime + (clip.offset || 0);
        this.applyFilter();
        this.applyClipSpeed();
        if (autoplay || this.isPlaying) this.video.play().catch(() => {});
      }
      this.video.style.display = 'block';
    } else {
      this.video.style.display = 'none';
    }
    this.renderMediaList();
    this.renderTimeline();
  }

  applyClipSpeed() {
    const clip = this.clips[this.currentClipIndex];
    this.video.playbackRate = (clip?.speed || 1) * this.globalSpeed;
  }

  syncClipSpeedUI() {
    const clip = this.clips.find(c => c.id === this.selectedClipId);
    const v = clip?.speed || 1;
    const slider = document.getElementById('clip-speed-slider');
    const label = document.getElementById('clip-speed-value');
    if (slider) slider.value = String(v);
    if (label) label.textContent = v.toFixed(2) + 'x';
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
      if (this.transition !== 'none') await this.playTransition();
      this.loadClip(this.currentClipIndex + 1, 0, true);
    } else {
      this.isPlaying = false;
      document.getElementById('btn-play').textContent = '▶';
    }
  }

  playTransition() {
    return new Promise((resolve) => {
      this.fadeOverlay.classList.add('active');
      setTimeout(() => {
        this.fadeOverlay.classList.remove('active');
        resolve();
      }, this.transition === 'fadeblack' ? 500 : 350);
    });
  }

  prevClip() {
    if (this.currentClipIndex > 0) this.loadClip(this.currentClipIndex - 1, 0, this.isPlaying);
    else this.seekToGlobal(0);
  }

  nextClip() {
    if (this.currentClipIndex < this.clips.length - 1) this.loadClip(this.currentClipIndex + 1, 0, this.isPlaying);
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
    for (let i = 0; i < this.currentClipIndex; i++) {
      acc += this.clips[i].duration / (this.clips[i].speed || 1);
    }
    const local = this.video.currentTime - (clip.offset || 0);
    this.globalTime = acc + local / (clip.speed || 1);
    this.updateTimeUI();
    this.applyClipFade();
    this.drawOverlays();
  }

  updateTimeUI() {
    const total = this.getTotalDuration();
    this.timeDisplay.textContent = this.formatTime(this.globalTime) + ' / ' + this.formatTime(total);
    if (total > 0) this.seekBar.value = (this.globalTime / total) * 1000;
    this.playhead.style.left = (40 + this.globalTime * this.pixelsPerSecond) + 'px';
  }

  formatTime(s) {
    s = Math.max(0, s || 0);
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
  }

  applyFilter() {
    const i = this.filterIntensity != null ? this.filterIntensity : 1;
    const map = {
      none: 'none',
      grayscale: 'grayscale(' + (100 * i) + '%)',
      sepia: 'sepia(' + (80 * i) + '%)',
      contrast: 'contrast(' + (100 + 40 * i) + '%)',
      brightness: 'brightness(' + (100 + 30 * i) + '%)',
      saturate: 'saturate(' + (100 + 80 * i) + '%)',
      blur: 'blur(' + (1.5 * i) + 'px)',
      invert: 'invert(' + (100 * i) + '%)',
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
      style: document.getElementById('text-style')?.value || 'basic',
    });
    document.getElementById('text-input').value = '';
    this.renderTextList();
    this.drawOverlays();
    this.pushHistory('add-text');
  }

  removeTextOverlay(id) {
    this.textOverlays = this.textOverlays.filter(t => t.id !== id);
    this.renderTextList();
    this.drawOverlays();
    this.pushHistory('remove-text');
  }

  resizeCanvas() {
    const rect = this.aspectFrame.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return;
    this.canvas.width = this.video.videoWidth || 1280;
    this.canvas.height = this.video.videoHeight || 720;
    this.drawOverlays();
  }

  drawOverlays() {
    if (!this.canvas.width) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.textOverlays.forEach(t => {
      const scale = this.canvas.width / 640;
      this.ctx.font = 'bold ' + (t.size * scale) + 'px Inter, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.shadowColor = 'rgba(0,0,0,0.75)';
      this.ctx.shadowBlur = 6;
      this.ctx.lineWidth = 3;
      this.ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      const x = this.canvas.width * t.x;
      const y = this.canvas.height * t.y;
      const style = t.style || 'basic';
      if (style === 'box') {
        const metrics = this.ctx.measureText(t.text);
        const pad = 12 * scale;
        const tw = metrics.width + pad * 2;
        const th = t.size * scale + pad;
        this.ctx.fillStyle = 'rgba(0,0,0,0.65)';
        this.ctx.fillRect(x - tw / 2, y - th / 2, tw, th);
        this.ctx.fillStyle = t.color;
        this.ctx.fillText(t.text, x, y);
      } else if (style === 'neon') {
        this.ctx.shadowColor = t.color;
        this.ctx.shadowBlur = 20 * scale;
        this.ctx.fillStyle = t.color;
        this.ctx.fillText(t.text, x, y);
        this.ctx.fillText(t.text, x, y);
      } else if (style === 'shadow') {
        this.ctx.shadowColor = 'rgba(0,0,0,0.9)';
        this.ctx.shadowBlur = 12 * scale;
        this.ctx.shadowOffsetX = 3;
        this.ctx.shadowOffsetY = 3;
        this.ctx.fillStyle = t.color;
        this.ctx.fillText(t.text, x, y);
      } else {
        this.ctx.strokeText(t.text, x, y);
        this.ctx.fillStyle = t.color;
        this.ctx.fillText(t.text, x, y);
      }
      this.ctx.shadowBlur = 0;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 0;
    });
  }

  drawLoop() {
    if (!this.isPlaying) return;
    this.drawOverlays();
    requestAnimationFrame(() => this.drawLoop());
  }

  snapshot() {
    return JSON.stringify({
      clips: this.clips.map(c => ({ ...c })),
      textOverlays: this.textOverlays.map(t => ({ ...t })),
      markers: [...(this.markers || [])],
      stickers: (this.stickers || []).map(s => ({ ...s })),
      selectedClipId: this.selectedClipId,
      currentClipIndex: this.currentClipIndex,
      transition: this.transition,
      currentFilter: this.currentFilter,
    });
  }

  pushHistory(label) {
    if (this._historyLocked) return;
    if (!this.history) { this.history = []; this.historyIndex = -1; this.maxHistory = 40; }
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push({ label, snap: this.snapshot() });
    if (this.history.length > this.maxHistory) this.history.shift();
    this.historyIndex = this.history.length - 1;
    this.updateHistoryButtons();
  }

  restoreSnapshot(snap) {
    this._historyLocked = true;
    try {
      const data = JSON.parse(snap);
      this.clips = data.clips || [];
      this.textOverlays = data.textOverlays || [];
      this.markers = data.markers || [];
      this.stickers = data.stickers || [];
      this.selectedClipId = data.selectedClipId;
      this.currentClipIndex = data.currentClipIndex ?? -1;
      this.transition = data.transition || 'none';
      this.currentFilter = data.currentFilter || 'none';
      this.applyFilter();
      if (this.currentClipIndex >= 0 && this.clips[this.currentClipIndex]) {
        this.loadClip(this.currentClipIndex, 0, false);
      } else if (!this.clips.length) {
        this.video.removeAttribute('src');
        this.video.load();
        this.noMedia.style.display = 'block';
      }
      this.render();
    } finally {
      this._historyLocked = false;
      this.updateHistoryButtons();
    }
  }

  undo() {
    if (!this.history || this.historyIndex <= 0) return;
    this.historyIndex--;
    this.restoreSnapshot(this.history[this.historyIndex].snap);
  }

  redo() {
    if (!this.history || this.historyIndex >= this.history.length - 1) return;
    this.historyIndex++;
    this.restoreSnapshot(this.history[this.historyIndex].snap);
  }

  updateHistoryButtons() {
    const u = document.getElementById('btn-undo');
    const r = document.getElementById('btn-redo');
    if (u) u.disabled = !this.history || this.historyIndex <= 0;
    if (r) r.disabled = !this.history || this.historyIndex >= this.history.length - 1;
  }

  addMarker() {
    if (!this.markers) this.markers = [];
    const t = this.globalTime;
    if (this.markers.some(m => Math.abs(m - t) < 0.05)) return;
    this.markers.push(t);
    this.markers.sort((a, b) => a - b);
    this.renderTimeline();
    this.pushHistory('marker');
  }

  snapTime(t) {
    if (!this.snapEnabled) return t;
    const threshold = 8 / this.pixelsPerSecond;
    const points = [0, this.globalTime, ...(this.markers || [])];
    this.clips.forEach(c => {
      points.push(c.start);
      points.push(c.start + c.duration / (c.speed || 1));
    });
    let best = t, bestDist = threshold;
    for (const p of points) {
      const d = Math.abs(p - t);
      if (d < bestDist) { bestDist = d; best = p; }
    }
    return best;
  }

  trimClip(clipId, edge, newBoundaryTime) {
    const idx = this.clips.findIndex(c => c.id === clipId);
    if (idx < 0) return;
    const clip = this.clips[idx];
    const media = this.media.find(m => m.id === clip.mediaId);
    const maxDur = media ? media.duration : clip.duration + (clip.offset || 0);
    if (edge === 'left') {
      const rightEdge = clip.start + clip.duration / (clip.speed || 1);
      let newStart = this.snapTime(newBoundaryTime);
      newStart = Math.max(0, Math.min(newStart, rightEdge - 0.2));
      const mediaDelta = (newStart - clip.start) * (clip.speed || 1);
      clip.offset = (clip.offset || 0) + mediaDelta;
      clip.duration = Math.max(0.2, clip.duration - mediaDelta);
      if (clip.offset < 0) { clip.duration += clip.offset; clip.offset = 0; }
      if (clip.offset + clip.duration > maxDur) clip.duration = Math.max(0.2, maxDur - clip.offset);
    } else {
      let newEnd = this.snapTime(newBoundaryTime);
      newEnd = Math.max(clip.start + 0.2, newEnd);
      let newDur = (newEnd - clip.start) * (clip.speed || 1);
      if ((clip.offset || 0) + newDur > maxDur) newDur = maxDur - (clip.offset || 0);
      clip.duration = Math.max(0.2, newDur);
    }
    this.recomputeClipStarts();
    this.renderTimeline();
    this.updateStats();
  }

  setZoom(pps, anchorClientX = null) {
    const next = Math.max(15, Math.min(200, pps));
    if (Math.abs(next - this.pixelsPerSecond) < 0.01) return;
    const timeline = this.timelineEl;
    let anchorTime = this.globalTime;
    if (timeline && anchorClientX != null) {
      const rect = timeline.getBoundingClientRect();
      const xInTrack = timeline.scrollLeft + (anchorClientX - rect.left) - 40;
      anchorTime = Math.max(0, xInTrack / this.pixelsPerSecond);
    }
    this.pixelsPerSecond = next;
    this.renderTimeline();
    this.updateZoomLabel();
    if (timeline && anchorClientX != null) {
      const rect = timeline.getBoundingClientRect();
      timeline.scrollLeft = Math.max(0, anchorTime * this.pixelsPerSecond - (anchorClientX - rect.left) + 40);
    }
  }

  updateZoomLabel() {
    const el = document.getElementById('zoom-level');
    if (el) el.textContent = Math.round(this.pixelsPerSecond) + ' px/s';
  }

  bindTimelineZoom() {
    const el = this.timelineEl;
    if (!el) return;
    const pinchDist = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const pinchMidX = (a, b) => (a.clientX + b.clientX) / 2;
    el.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        this._touchDrag = null;
        this._pinch = { startDist: pinchDist(e.touches[0], e.touches[1]), startPps: this.pixelsPerSecond };
      }
    }, { passive: true });
    el.addEventListener('touchmove', (e) => {
      if (!this._pinch || e.touches.length !== 2) return;
      e.preventDefault();
      const dist = pinchDist(e.touches[0], e.touches[1]);
      if (this._pinch.startDist < 1) return;
      this.setZoom(this._pinch.startPps * (dist / this._pinch.startDist), pinchMidX(e.touches[0], e.touches[1]));
    }, { passive: false });
    const endPinch = () => { this._pinch = null; };
    el.addEventListener('touchend', endPinch, { passive: true });
    el.addEventListener('touchcancel', endPinch, { passive: true });
    el.addEventListener('wheel', (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      this.setZoom(this.pixelsPerSecond * (e.deltaY < 0 ? 1.1 : 0.9), e.clientX);
    }, { passive: false });
  }

  reorderClip(fromIdx, toIdx) {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return;
    if (fromIdx >= this.clips.length || toIdx >= this.clips.length) return;
    const [clip] = this.clips.splice(fromIdx, 1);
    this.clips.splice(toIdx, 0, clip);
    this.recomputeClipStarts();
    if (this.selectedClipId === clip.id) this.currentClipIndex = toIdx;
    else if (this.currentClipIndex === fromIdx) this.currentClipIndex = toIdx;
    else if (fromIdx < this.currentClipIndex && toIdx >= this.currentClipIndex) this.currentClipIndex--;
    else if (fromIdx > this.currentClipIndex && toIdx <= this.currentClipIndex) this.currentClipIndex++;
    this.renderTimeline();
    this.updateStats();
    this.pushHistory('reorder');
  }

  moveClip(dir) {
    if (!this.selectedClipId) return;
    const idx = this.clips.findIndex(c => c.id === this.selectedClipId);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= this.clips.length) return;
    this.reorderClip(idx, newIdx);
  }

  getDropIndex(clientX) {
    const rect = this.clipsContainer.getBoundingClientRect();
    const scrollLeft = this.clipsContainer.parentElement?.scrollLeft || 0;
    const x = clientX - rect.left + scrollLeft;
    for (let i = 0; i < this.clips.length; i++) {
      const mid = (this.clips[i].start + (this.clips[i].duration / (this.clips[i].speed || 1)) / 2) * this.pixelsPerSecond;
      if (x < mid) return i;
    }
    return Math.max(0, this.clips.length - 1);
  }

  deleteSelectedClip() {
    if (!this.selectedClipId) return;
    const idx = this.clips.findIndex(c => c.id === this.selectedClipId);
    if (idx === -1) return;
    this.clips.splice(idx, 1);
    this.selectedClipId = null;
    this.recomputeClipStarts();
    if (this.clips.length === 0) {
      this.currentClipIndex = -1;
      this.video.removeAttribute('src');
      this.video.load();
      this.noMedia.style.display = 'block';
      this.isPlaying = false;
      document.getElementById('btn-play').textContent = '▶';
    } else {
      this.loadClip(Math.min(idx, this.clips.length - 1), 0, this.isPlaying);
    }
    this.renderTimeline();
    this.updateStats();
    this.pushHistory('delete');
  }

  clearTimeline() {
    if (!this.clips.length) return;
    if (!confirm('Clear all clips from timeline?')) return;
    this.clips = [];
    this.markers = [];
    this.currentClipIndex = -1;
    this.selectedClipId = null;
    this.video.removeAttribute('src');
    this.video.load();
    this.noMedia.style.display = 'block';
    this.isPlaying = false;
    document.getElementById('btn-play').textContent = '▶';
    this.renderTimeline();
    this.updateStats();
    this.pushHistory('clear');
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
    this.clips.splice(this.currentClipIndex + 1, 0, {
      id: crypto.randomUUID(), mediaId: clip.mediaId, start: 0,
      duration: remaining, offset: (clip.offset || 0) + local, speed: clip.speed || 1,
    });
    this.recomputeClipStarts();
    this.selectedClipId = this.clips[this.currentClipIndex + 1].id;
    this.renderTimeline();
    this.updateStats();
    this.pushHistory('split');
  }

  toggleTransform(kind) {
    const clip = this.clips.find(c => c.id === this.selectedClipId);
    if (!clip) { alert('Select a clip first'); return; }
    if (kind === 'flipH') clip.flipH = !clip.flipH;
    if (kind === 'flipV') clip.flipV = !clip.flipV;
    if (kind === 'rotate') clip.rotate = ((clip.rotate || 0) + 90) % 360;
    this.applyTransform(clip);
    this.pushHistory('transform');
  }

  applyTransform(clip) {
    if (!clip) return;
    const parts = [];
    if (clip.flipH) parts.push('scaleX(-1)');
    if (clip.flipV) parts.push('scaleY(-1)');
    if (clip.rotate) parts.push('rotate(' + clip.rotate + 'deg)');
    this.video.style.transform = parts.length ? parts.join(' ') : 'none';
    this.video.style.opacity = String(clip.opacity != null ? clip.opacity : 1);
  }

  toggleReverse() {
    const clip = this.clips.find(c => c.id === this.selectedClipId);
    if (!clip) { alert('Select a clip first'); return; }
    clip.reverse = !clip.reverse;
    this.renderTimeline();
    this.pushHistory('reverse');
  }

  addSticker(emoji) {
    const sizeEl = document.getElementById('sticker-size');
    const size = parseInt(sizeEl && sizeEl.value ? sizeEl.value : '56', 10);
    if (!this.stickers) this.stickers = [];
    this.stickers.push({ id: crypto.randomUUID(), emoji: emoji, x: 0.5, y: 0.4, size: size });
    this.renderStickers();
    this.pushHistory('sticker');
  }

  removeSticker(id) {
    this.stickers = (this.stickers || []).filter(s => s.id !== id);
    this.renderStickers();
    this.pushHistory('remove-sticker');
  }

  renderStickers() {
    const frame = this.aspectFrame;
    if (!frame) return;
    frame.querySelectorAll('.sticker-overlay').forEach(el => el.remove());
    const list = document.getElementById('sticker-list');
    const self = this;
    if (list) {
      list.innerHTML = '';
      (this.stickers || []).forEach(s => {
        const el = document.createElement('div');
        el.className = 'text-item';
        el.innerHTML = '<span>' + s.emoji + '</span><button>✕</button>';
        el.querySelector('button').addEventListener('click', () => self.removeSticker(s.id));
        list.appendChild(el);
      });
    }
    (this.stickers || []).forEach(s => {
      const el = document.createElement('div');
      el.className = 'sticker-overlay';
      el.textContent = s.emoji;
      el.style.fontSize = s.size + 'px';
      el.style.left = (s.x * 100) + '%';
      el.style.top = (s.y * 100) + '%';
      el.style.transform = 'translate(-50%, -50%)';
      let dragging = false;
      el.addEventListener('mousedown', e => { dragging = true; e.preventDefault(); });
      el.addEventListener('touchstart', e => { dragging = true; e.preventDefault(); }, { passive: false });
      window.addEventListener('mousemove', e => {
        if (!dragging) return;
        const rect = frame.getBoundingClientRect();
        s.x = Math.max(0.05, Math.min(0.95, (e.clientX - rect.left) / rect.width));
        s.y = Math.max(0.05, Math.min(0.95, (e.clientY - rect.top) / rect.height));
        el.style.left = (s.x * 100) + '%';
        el.style.top = (s.y * 100) + '%';
      });
      window.addEventListener('touchmove', e => {
        if (!dragging || !e.touches[0]) return;
        const pt = e.touches[0];
        const rect = frame.getBoundingClientRect();
        s.x = Math.max(0.05, Math.min(0.95, (pt.clientX - rect.left) / rect.width));
        s.y = Math.max(0.05, Math.min(0.95, (pt.clientY - rect.top) / rect.height));
        el.style.left = (s.x * 100) + '%';
        el.style.top = (s.y * 100) + '%';
      }, { passive: false });
      window.addEventListener('mouseup', () => {
        if (dragging) { dragging = false; self.pushHistory('sticker-move'); }
      });
      window.addEventListener('touchend', () => {
        if (dragging) { dragging = false; self.pushHistory('sticker-move'); }
      });
      frame.appendChild(el);
    });
  }

  updateClipFadeUI() {
    const clip = this.clips.find(c => c.id === this.selectedClipId);
    if (!clip) return;
    const fi = document.getElementById('fade-in');
    const fo = document.getElementById('fade-out');
    const co = document.getElementById('clip-opacity');
    if (fi && document.getElementById('fade-in-value')) {
      fi.value = clip.fadeIn || 0;
      document.getElementById('fade-in-value').textContent = (clip.fadeIn || 0).toFixed(1);
    }
    if (fo && document.getElementById('fade-out-value')) {
      fo.value = clip.fadeOut || 0;
      document.getElementById('fade-out-value').textContent = (clip.fadeOut || 0).toFixed(1);
    }
    if (co && document.getElementById('clip-opacity-value')) {
      const op = Math.round((clip.opacity != null ? clip.opacity : 1) * 100);
      co.value = String(op);
      document.getElementById('clip-opacity-value').textContent = op + '%';
    }
  }

  applyClipFade() {
    if (this.currentClipIndex < 0) return;
    const clip = this.clips[this.currentClipIndex];
    if (!clip) return;
    const local = this.video.currentTime - (clip.offset || 0);
    const dur = clip.duration || 1;
    let opacity = clip.opacity != null ? clip.opacity : 1;
    if (clip.fadeIn && local < clip.fadeIn) opacity *= Math.max(0, local / clip.fadeIn);
    if (clip.fadeOut && local > dur - clip.fadeOut) opacity *= Math.max(0, (dur - local) / clip.fadeOut);
    this.video.style.opacity = String(opacity);
  }

  saveProject() {
    const data = {
      version: 5,
      clips: this.clips,
      textOverlays: this.textOverlays,
      markers: this.markers || [],
      stickers: this.stickers || [],
      transition: this.transition,
      currentFilter: this.currentFilter,
      mediaMeta: this.media.map(m => ({ id: m.id, name: m.name, type: m.type, duration: m.duration })),
      savedAt: new Date().toISOString(),
    };
    try { localStorage.setItem('capcut-clone-project', JSON.stringify(data)); } catch (e) {}
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'capcut-clone-project.json';
    a.click();
    alert('Project saved. Re-upload media after Load if needed.');
  }

  loadProject() {
    const raw = localStorage.getItem('capcut-clone-project');
    if (!raw) { alert('No saved project found.'); return; }
    try {
      const data = JSON.parse(raw);
      this.clips = data.clips || [];
      this.textOverlays = data.textOverlays || [];
      this.markers = data.markers || [];
      this.stickers = data.stickers || [];
      this.transition = data.transition || 'none';
      this.currentFilter = data.currentFilter || 'none';
      this.recomputeClipStarts();
      this.currentClipIndex = this.clips.length ? 0 : -1;
      this.selectedClipId = this.clips[0]?.id || null;
      if (this.currentClipIndex >= 0) {
        const media = this.media.find(m => m.id === this.clips[0].mediaId);
        if (media) this.loadClip(0);
        else {
          alert('Structure loaded — re-upload original media to preview.');
          this.noMedia.style.display = 'block';
        }
      }
      this.render();
      this.pushHistory('load');
    } catch (e) { alert('Failed to load project.'); }
  }

  resetProject() {
    this.media.forEach(m => URL.revokeObjectURL(m.url));
    this.media = [];
    this.clips = [];
    this.textOverlays = [];
    this.stickers = [];
    this.markers = [];
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
    this.pushHistory('reset');
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
      alert('Downloaded source media. Effects are preview-only in this build.');
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
        ? '<img class="media-thumb" src="' + m.thumb + '" alt="" />'
        : '<div class="media-thumb placeholder">' + (m.type === 'video' ? '▶' : '🖼') + '</div>';
      el.innerHTML = thumbHtml + '<div class="media-info"><div class="media-name">' + m.name + '</div><div class="media-meta">' + m.type + ' · ' + m.duration.toFixed(1) + 's' + (onTimeline ? ' · on timeline' : '') + '</div></div><div class="media-actions"><button title="Add" data-add="' + m.id + '">+</button></div>';
      el.querySelector('[data-add]').addEventListener('click', (e) => { e.stopPropagation(); this.addClip(m); });
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
      el.innerHTML = '<span style="color:' + t.color + '">' + t.text + '</span><button>✕</button>';
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
      mark.style.left = (t * this.pixelsPerSecond) + 'px';
      mark.textContent = this.formatTime(t);
      this.ruler.appendChild(mark);
    }

    this.clipsContainer.innerHTML = '';
    (this.markers || []).forEach(t => {
      const m = document.createElement('div');
      m.className = 'marker';
      m.style.left = (t * this.pixelsPerSecond) + 'px';
      this.clipsContainer.appendChild(m);
    });
    this.clipsContainer.style.minWidth = Math.max(900, total * this.pixelsPerSecond + 100) + 'px';

    this.clips.forEach((clip, i) => {
      const media = this.media.find(m => m.id === clip.mediaId);
      const displayDur = clip.duration / (clip.speed || 1);
      const el = document.createElement('div');
      el.className = 'clip' + (clip.id === this.selectedClipId ? ' selected' : '') + (i === this.currentClipIndex ? ' playing' : '');
      el.style.left = (clip.start * this.pixelsPerSecond) + 'px';
      el.style.width = Math.max(displayDur * this.pixelsPerSecond, 36) + 'px';
      el.draggable = true;
      el.dataset.index = String(i);
      const speedLabel = (clip.speed && clip.speed !== 1) ? ' ' + clip.speed + 'x' : '';
      const revLabel = clip.reverse ? ' ⏪' : '';
      el.innerHTML = '<div class="clip-handle left" data-edge="left"></div><span class="clip-name">' + (media ? media.name : 'Clip') + speedLabel + revLabel + '</span><div class="clip-handle right" data-edge="right"></div>';

      el.addEventListener('click', (e) => {
        if (e.target.classList.contains('clip-handle')) return;
        if (this._suppressClick) { this._suppressClick = false; return; }
        this.selectedClipId = clip.id;
        this.loadClip(i, 0, false);
      });

      el.querySelectorAll('.clip-handle').forEach(handle => {
        handle.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          el.draggable = false;
          const edge = handle.dataset.edge;
          const onMove = (ev) => {
            const rect = this.clipsContainer.getBoundingClientRect();
            const scrollLeft = this.timelineEl ? this.timelineEl.scrollLeft : 0;
            const time = (ev.clientX - rect.left + scrollLeft) / this.pixelsPerSecond;
            this.trimClip(clip.id, edge, time);
          };
          const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            el.draggable = true;
            this.pushHistory('trim');
          };
          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        });
      });

      el.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('clip-handle')) { e.preventDefault(); return; }
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(i));
        el.classList.add('dragging');
        this._dragFromIndex = i;
      });
      el.addEventListener('dragend', () => {
        el.classList.remove('dragging');
        this.clipsContainer.querySelectorAll('.clip').forEach(c => c.classList.remove('drag-over'));
        this._dragFromIndex = null;
      });
      el.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        this.clipsContainer.querySelectorAll('.clip').forEach(c => c.classList.remove('drag-over'));
        el.classList.add('drag-over');
      });
      el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
      el.addEventListener('drop', (e) => {
        e.preventDefault();
        el.classList.remove('drag-over');
        const from = this._dragFromIndex != null ? this._dragFromIndex : parseInt(e.dataTransfer.getData('text/plain'), 10);
        if (!Number.isNaN(from) && from !== i) this.reorderClip(from, i);
      });

      el.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1 || e.target.classList.contains('clip-handle')) return;
        const touch = e.touches[0];
        this._touchDrag = { fromIndex: i, startX: touch.clientX, startY: touch.clientY, moved: false, el };
        el.classList.add('dragging');
      }, { passive: true });
      el.addEventListener('touchmove', (e) => {
        if (!this._touchDrag || this._touchDrag.el !== el || e.touches.length !== 1) return;
        const touch = e.touches[0];
        const dx = Math.abs(touch.clientX - this._touchDrag.startX);
        const dy = Math.abs(touch.clientY - this._touchDrag.startY);
        if (!this._touchDrag.moved && (dx > 8 || dy > 8)) {
          this._touchDrag.moved = true;
          this._suppressClick = true;
        }
        if (!this._touchDrag.moved) return;
        e.preventDefault();
        this.clipsContainer.querySelectorAll('.clip').forEach(c => c.classList.remove('drag-over'));
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        const targetClip = target && target.closest ? target.closest('.clip') : null;
        if (targetClip && targetClip !== el) targetClip.classList.add('drag-over');
      }, { passive: false });
      el.addEventListener('touchend', (e) => {
        if (!this._touchDrag || this._touchDrag.el !== el) return;
        const drag = this._touchDrag;
        this._touchDrag = null;
        el.classList.remove('dragging');
        this.clipsContainer.querySelectorAll('.clip').forEach(c => c.classList.remove('drag-over'));
        if (!drag.moved) {
          this.selectedClipId = clip.id;
          this.loadClip(i, 0, false);
          return;
        }
        const touch = e.changedTouches && e.changedTouches[0];
        if (!touch) return;
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        const targetClip = target && target.closest ? target.closest('.clip') : null;
        let toIdx = drag.fromIndex;
        if (targetClip && targetClip.dataset.index != null) toIdx = parseInt(targetClip.dataset.index, 10);
        else toIdx = this.getDropIndex(touch.clientX);
        if (!Number.isNaN(toIdx) && toIdx !== drag.fromIndex) this.reorderClip(drag.fromIndex, toIdx);
      }, { passive: true });

      this.clipsContainer.appendChild(el);
    });

    this.updateTimeUI();
    this.updateZoomLabel();
  }

  render() {
    this.renderMediaList();
    this.renderTimeline();
    this.renderTextList();
    if (this.renderStickers) this.renderStickers();
    this.updateStats();
    this.updateHistoryButtons();
    this.updateZoomLabel();
  }
}

window.CapCutClone = CapCutClone;
document.addEventListener('DOMContentLoaded', () => {
  window.editor = new CapCutClone();
});
