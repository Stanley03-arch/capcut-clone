/**
 * CapCut Clone v6/v7 feature pack
 * Loads after app.js and extends CapCutClone
 */
(function () {
  function whenReady(fn) {
    if (window.CapCutClone) return fn();
    document.addEventListener('DOMContentLoaded', () => setTimeout(fn, 0));
  }

  whenReady(() => {
    const P = window.CapCutClone && window.CapCutClone.prototype;
    if (!P) {
      console.warn('CapCutClone not found — v6/v7 features skipped');
      return;
    }

    P.updateGradeFromUI = function () {
      this.grade = {
        brightness: parseInt(document.getElementById('grade-brightness')?.value || '0', 10),
        contrast: parseInt(document.getElementById('grade-contrast')?.value || '0', 10),
        saturate: parseInt(document.getElementById('grade-saturate')?.value || '0', 10),
        warmth: parseInt(document.getElementById('grade-warmth')?.value || '0', 10),
      };
      const labs = { 'grade-b-val': 'brightness', 'grade-c-val': 'contrast', 'grade-s-val': 'saturate', 'grade-w-val': 'warmth' };
      Object.keys(labs).forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.textContent = String(this.grade[labs[id]]);
      });
      this.applyFilter();
    };

    P.syncGradeUI = function () {
      const g = this.grade || {};
      const set = (id, val, lab) => {
        const el = document.getElementById(id);
        if (el) el.value = String(val || 0);
        const l = document.getElementById(lab);
        if (l) l.textContent = String(val || 0);
      };
      set('grade-brightness', g.brightness, 'grade-b-val');
      set('grade-contrast', g.contrast, 'grade-c-val');
      set('grade-saturate', g.saturate, 'grade-s-val');
      set('grade-warmth', g.warmth, 'grade-w-val');
    };

    P.applyFilter = function () {
      if (!this.grade) this.grade = { brightness: 0, contrast: 0, saturate: 0, warmth: 0 };
      const i = this.filterIntensity != null ? this.filterIntensity : 1;
      const g = this.grade;
      const map = {
        none: '',
        grayscale: `grayscale(${100 * i}%)`,
        sepia: `sepia(${80 * i}%)`,
        contrast: `contrast(${100 + 40 * i}%)`,
        brightness: `brightness(${100 + 30 * i}%)`,
        saturate: `saturate(${100 + 80 * i}%)`,
        blur: `blur(${1.5 * i}px)`,
        invert: `invert(${100 * i}%)`,
      };
      const parts = [];
      const preset = map[this.currentFilter] || '';
      if (preset) parts.push(preset);
      if (g.brightness) parts.push(`brightness(${100 + g.brightness}%)`);
      if (g.contrast) parts.push(`contrast(${100 + g.contrast}%)`);
      if (g.saturate) parts.push(`saturate(${100 + g.saturate}%)`);
      if (g.warmth) {
        if (g.warmth > 0) parts.push(`sepia(${(g.warmth / 50) * 35}%)`);
        else parts.push(`hue-rotate(${g.warmth * 0.6}deg)`);
      }
      if (this.video) this.video.style.filter = parts.length ? parts.join(' ') : 'none';
    };

    P.playTransition = function () {
      return new Promise((resolve) => {
        this.isTransitioning = true;
        const t = this.transition;
        if (t === 'slide-left' || t === 'slide-right' || t === 'zoom') {
          const frame = this.aspectFrame;
          if (frame) {
            frame.style.transition = 'transform 0.35s ease, opacity 0.35s ease';
            if (t === 'slide-left') frame.style.transform = 'translateX(-40%)';
            else if (t === 'slide-right') frame.style.transform = 'translateX(40%)';
            else frame.style.transform = 'scale(1.15)';
            frame.style.opacity = '0.3';
            setTimeout(() => {
              frame.style.transition = 'none';
              frame.style.transform = '';
              frame.style.opacity = '1';
              this.isTransitioning = false;
              resolve();
            }, 350);
            return;
          }
        }
        if (this.fadeOverlay) this.fadeOverlay.classList.add('active');
        setTimeout(() => {
          if (this.fadeOverlay) this.fadeOverlay.classList.remove('active');
          this.isTransitioning = false;
          resolve();
        }, t === 'fadeblack' ? 500 : 350);
      });
    };

    P.handleAudioFiles = async function (fileList) {
      if (!this.audioClips) this.audioClips = [];
      for (const file of Array.from(fileList || [])) {
        if (!file.type.startsWith('audio/')) continue;
        const url = URL.createObjectURL(file);
        const duration = await this.getAudioDuration(url);
        this.audioClips.push({ id: crypto.randomUUID(), name: file.name, url, duration, start: 0, volume: 0.8 });
      }
      this.renderAudioTrack();
      this.renderAudioList();
      this.pushHistory && this.pushHistory('add-audio');
    };

    P.getAudioDuration = function (url) {
      return new Promise((resolve) => {
        const a = new Audio();
        a.preload = 'metadata';
        a.onloadedmetadata = () => resolve(a.duration || 30);
        a.onerror = () => resolve(30);
        a.src = url;
      });
    };

    P.renderAudioList = function () {
      const list = document.getElementById('audio-list');
      if (!list) return;
      list.innerHTML = '';
      (this.audioClips || []).forEach((a) => {
        const el = document.createElement('div');
        el.className = 'text-item';
        el.innerHTML = `<span>${a.name} (${a.duration.toFixed(1)}s)</span><button>✕</button>`;
        el.querySelector('button').addEventListener('click', () => {
          if (a._el) { a._el.pause(); a._el = null; }
          this.audioClips = this.audioClips.filter((x) => x.id !== a.id);
          this.renderAudioTrack();
          this.renderAudioList();
          this.pushHistory && this.pushHistory('remove-audio');
        });
        list.appendChild(el);
      });
    };

    P.renderAudioTrack = function () {
      const container = document.getElementById('audio-clips-container');
      if (!container) return;
      container.innerHTML = '';
      const total = Math.max(this.getTotalDuration(), 10);
      container.style.minWidth = Math.max(900, total * this.pixelsPerSecond + 100) + 'px';
      (this.audioClips || []).forEach((a) => {
        const el = document.createElement('div');
        el.className = 'audio-clip';
        el.style.left = ((a.start || 0) * this.pixelsPerSecond) + 'px';
        el.style.width = Math.max(40, (a.duration || 10) * this.pixelsPerSecond) + 'px';
        el.textContent = '🎵 ' + a.name;
        container.appendChild(el);
      });
    };

    P.syncAudioPlayback = function () {
      const playing = this.isPlaying;
      const t = this.globalTime;
      const vol = parseInt(document.getElementById('bgm-volume')?.value || '80', 10) / 100;
      const loop = document.getElementById('bgm-loop')?.checked;
      const muteVideo = document.getElementById('bgm-mute-video')?.checked;
      if (muteVideo && (this.audioClips || []).length) this.video.muted = true;
      (this.audioClips || []).forEach((a) => {
        const start = a.start || 0;
        const end = start + (a.duration || 0);
        const inRange = t >= start && t < end;
        if (!a._el) {
          a._el = new Audio(a.url);
          a._el.loop = !!loop;
        }
        a._el.volume = vol;
        if (playing && inRange) {
          const local = t - start;
          if (Math.abs((a._el.currentTime || 0) - local) > 0.4) {
            try { a._el.currentTime = local; } catch (_) {}
          }
          if (a._el.paused) a._el.play().catch(() => {});
        } else if (a._el && !a._el.paused) {
          a._el.pause();
        }
      });
    };

    P.stopAllAudio = function () {
      (this.audioClips || []).forEach((a) => {
        if (a._el) { a._el.pause(); a._el.currentTime = 0; }
      });
    };

    P.duplicateClip = function () {
      if (!this.selectedClipId) { alert('Select a clip first'); return; }
      const idx = this.clips.findIndex((c) => c.id === this.selectedClipId);
      if (idx < 0) return;
      const copy = { ...this.clips[idx], id: crypto.randomUUID() };
      this.clips.splice(idx + 1, 0, copy);
      this.recomputeClipStarts();
      this.selectedClipId = copy.id;
      this.renderTimeline();
      this.updateStats();
      this.pushHistory && this.pushHistory('duplicate');
    };

    P.freezeFrame = function () {
      if (this.currentClipIndex < 0) { alert('Play or select a clip first'); return; }
      const clip = this.clips[this.currentClipIndex];
      const local = Math.max(0, this.video.currentTime - (clip.offset || 0));
      const freeze = {
        id: crypto.randomUUID(),
        mediaId: clip.mediaId,
        start: 0,
        duration: 1,
        offset: local,
        speed: 0.01,
        opacity: clip.opacity != null ? clip.opacity : 1,
        freeze: true,
      };
      const remaining = clip.duration - local;
      if (local > 0.15 && remaining > 0.15) {
        clip.duration = local;
        this.clips.splice(this.currentClipIndex + 1, 0, freeze);
        this.clips.splice(this.currentClipIndex + 2, 0, {
          id: crypto.randomUUID(),
          mediaId: clip.mediaId,
          start: 0,
          duration: remaining,
          offset: (clip.offset || 0) + local,
          speed: clip.speed || 1,
          opacity: clip.opacity != null ? clip.opacity : 1,
        });
      } else {
        this.clips.splice(this.currentClipIndex + 1, 0, freeze);
      }
      this.recomputeClipStarts();
      this.renderTimeline();
      this.updateStats();
      this.pushHistory && this.pushHistory('freeze');
    };

    // --- Video stabilization ---
    P.stabilizeClip = async function () {
      if (this.currentClipIndex < 0 || !this.clips[this.currentClipIndex]) {
        alert('Select a clip on the timeline first');
        return;
      }
      const clip = this.clips[this.currentClipIndex];
      const media = this.media.find((m) => m.id === clip.mediaId);
      if (!media || media.type !== 'video') {
        alert('Stabilization works on video clips only');
        return;
      }

      const strength = parseInt(document.getElementById('stab-strength')?.value || '50', 10) / 100;
      const smooth = parseInt(document.getElementById('stab-smooth')?.value || '50', 10) / 100;
      const status = document.getElementById('stab-status');
      const btn = document.getElementById('btn-stabilize');
      if (btn) btn.disabled = true;
      if (status) status.textContent = 'Analyzing motion…';

      const wasPlaying = this.isPlaying;
      if (wasPlaying) this.togglePlay();

      try {
        const path = await this._analyzeMotion(media.url, clip, (p) => {
          if (status) status.textContent = 'Analyzing… ' + Math.round(p * 100) + '%';
        });
        const smoothed = this._smoothPath(path, 0.15 + smooth * 0.7);
        const transforms = smoothed.map((p) => ({
          t: p.t,
          dx: -p.dx * strength,
          dy: -p.dy * strength,
        }));
        clip.stabilize = {
          strength,
          smooth,
          transforms,
          zoom: 1 + strength * 0.08,
        };
        if (status) {
          status.textContent = 'Stabilized · ' + transforms.length + ' samples · zoom ' + clip.stabilize.zoom.toFixed(2);
        }
        this.pushHistory && this.pushHistory('stabilize');
        this.applyStabilizeTransform(clip);
      } catch (err) {
        console.error(err);
        if (status) status.textContent = 'Stabilize failed: ' + (err.message || err);
      } finally {
        if (btn) btn.disabled = false;
      }
    };

    P.clearStabilize = function () {
      const clip = this.clips.find((c) => c.id === this.selectedClipId) || this.clips[this.currentClipIndex];
      if (!clip) return;
      delete clip.stabilize;
      if (this.video) this.applyTransform(clip);
      const status = document.getElementById('stab-status');
      if (status) status.textContent = 'Stabilization cleared';
      this.pushHistory && this.pushHistory('stab-clear');
    };

    P._analyzeMotion = function (url, clip, onProgress) {
      return new Promise((resolve, reject) => {
        const v = document.createElement('video');
        v.muted = true;
        v.playsInline = true;
        v.preload = 'auto';

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const W = 160;
        const H = 90;
        canvas.width = W;
        canvas.height = H;

        const startT = clip.offset || 0;
        const endT = startT + (clip.duration || 5);
        const step = Math.max(0.08, (endT - startT) / 60);
        const path = [];
        let prevGray = null;
        let t = startT;
        let cumX = 0;
        let cumY = 0;

        const toGray = (data) => {
          const g = new Float32Array(W * H);
          for (let i = 0, j = 0; i < data.length; i += 4, j++) {
            g[j] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          }
          return g;
        };

        const estimateShift = (prev, curr) => {
          const block = 24;
          const maxShift = 12;
          const cx = (W - block) >> 1;
          const cy = (H - block) >> 1;
          let bestSad = Infinity;
          let bestDx = 0;
          let bestDy = 0;
          for (let dy = -maxShift; dy <= maxShift; dy++) {
            for (let dx = -maxShift; dx <= maxShift; dx++) {
              let sad = 0;
              for (let y = 0; y < block; y++) {
                const py = cy + y;
                const qy = cy + y + dy;
                if (qy < 0 || qy >= H) { sad = Infinity; break; }
                for (let x = 0; x < block; x++) {
                  const px = cx + x;
                  const qx = cx + x + dx;
                  if (qx < 0 || qx >= W) { sad = Infinity; break; }
                  sad += Math.abs(prev[py * W + px] - curr[qy * W + qx]);
                }
              }
              if (sad < bestSad) {
                bestSad = sad;
                bestDx = dx;
                bestDy = dy;
              }
            }
          }
          return { dx: bestDx, dy: bestDy };
        };

        const sampleNext = () => {
          if (t > endT + 0.01) {
            resolve(path);
            return;
          }
          const seekTo = Math.min(t, (v.duration || endT) - 0.01);
          const onSeeked = () => {
            v.removeEventListener('seeked', onSeeked);
            try {
              ctx.drawImage(v, 0, 0, W, H);
              const gray = toGray(ctx.getImageData(0, 0, W, H).data);
              if (prevGray) {
                const shift = estimateShift(prevGray, gray);
                cumX += shift.dx;
                cumY += shift.dy;
              }
              path.push({ t: t - startT, dx: cumX, dy: cumY });
              prevGray = gray;
              const progress = (t - startT) / Math.max(0.01, endT - startT);
              onProgress && onProgress(Math.min(1, progress));
              t += step;
              setTimeout(sampleNext, 0);
            } catch (e) {
              reject(e);
            }
          };
          v.addEventListener('seeked', onSeeked);
          try {
            v.currentTime = seekTo;
          } catch (e) {
            reject(e);
          }
        };

        v.onloadeddata = () => sampleNext();
        v.onerror = () => reject(new Error('Could not load video for analysis'));
        v.src = url;
      });
    };

    P._smoothPath = function (path, alpha) {
      if (!path.length) return path;
      const out = [];
      let sx = path[0].dx;
      let sy = path[0].dy;
      for (let i = 0; i < path.length; i++) {
        sx = alpha * path[i].dx + (1 - alpha) * sx;
        sy = alpha * path[i].dy + (1 - alpha) * sy;
        out.push({ t: path[i].t, dx: sx, dy: sy });
      }
      const residual = [];
      for (let i = 0; i < path.length; i++) {
        residual.push({
          t: path[i].t,
          dx: path[i].dx - out[i].dx,
          dy: path[i].dy - out[i].dy,
        });
      }
      return residual;
    };

    P.applyStabilizeTransform = function (clip) {
      if (!clip || !this.video) return;
      const parts = [];
      if (clip.flipH) parts.push('scaleX(-1)');
      if (clip.flipV) parts.push('scaleY(-1)');
      if (clip.rotate) parts.push('rotate(' + clip.rotate + 'deg)');
      const stab = clip.stabilize;
      if (stab && stab.transforms && stab.transforms.length) {
        const local = Math.max(0, this.video.currentTime - (clip.offset || 0));
        const tr = this._stabAtTime(stab.transforms, local);
        const scale = 4;
        const zoom = stab.zoom || 1;
        parts.push('scale(' + zoom + ')');
        parts.push('translate(' + (tr.dx * scale) + 'px,' + (tr.dy * scale) + 'px)');
      }
      this.video.style.transform = parts.length ? parts.join(' ') : 'none';
      this.video.style.opacity = String(clip.opacity != null ? clip.opacity : 1);
    };

    P._stabAtTime = function (transforms, localT) {
      if (!transforms.length) return { dx: 0, dy: 0 };
      if (localT <= transforms[0].t) return { dx: transforms[0].dx, dy: transforms[0].dy };
      for (let i = 1; i < transforms.length; i++) {
        if (localT <= transforms[i].t) {
          const a = transforms[i - 1];
          const b = transforms[i];
          const u = (localT - a.t) / Math.max(0.001, b.t - a.t);
          return {
            dx: a.dx + (b.dx - a.dx) * u,
            dy: a.dy + (b.dy - a.dy) * u,
          };
        }
      }
      const last = transforms[transforms.length - 1];
      return { dx: last.dx, dy: last.dy };
    };

    const origApplyTransform = P.applyTransform;
    P.applyTransform = function (clip) {
      if (clip && clip.stabilize) {
        this.applyStabilizeTransform(clip);
        return;
      }
      if (origApplyTransform) origApplyTransform.call(this, clip);
    };

    const origOnTime = P.onTimeUpdate;
    P.onTimeUpdate = function () {
      origOnTime.call(this);
      if (this.syncAudioPlayback) this.syncAudioPlayback();
      const clip = this.clips[this.currentClipIndex];
      if (clip && clip.stabilize) this.applyStabilizeTransform(clip);
    };

    const origToggle = P.togglePlay;
    P.togglePlay = function () {
      const wasPlaying = this.isPlaying;
      origToggle.call(this);
      if (wasPlaying && !this.isPlaying) {
        (this.audioClips || []).forEach((a) => { if (a._el) a._el.pause(); });
      }
    };

    const origAddText = P.addTextOverlay;
    P.addTextOverlay = function () {
      origAddText.call(this);
      const last = this.textOverlays[this.textOverlays.length - 1];
      if (last) {
        last.anim = document.getElementById('text-anim')?.value || 'none';
        last.startTime = this.globalTime;
      }
    };

    P.drawOverlays = function () {
      if (!this.canvas || !this.canvas.width) return;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.textOverlays.forEach((t) => {
        const scale = this.canvas.width / 640;
        this.ctx.font = 'bold ' + t.size * scale + 'px Inter, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.shadowColor = 'rgba(0,0,0,0.75)';
        this.ctx.shadowBlur = 6;
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        let x = this.canvas.width * t.x;
        let y = this.canvas.height * t.y;
        const anim = t.anim || 'none';
        const age = Math.max(0, this.globalTime - (t.startTime || 0));
        const progress = anim === 'none' ? 1 : Math.min(1, age / 0.6);
        let drawText = t.text;
        this.ctx.globalAlpha = 1;
        if (anim === 'fade') this.ctx.globalAlpha = progress;
        else if (anim === 'slide-up') {
          y += (1 - progress) * 40 * scale;
          this.ctx.globalAlpha = progress;
        } else if (anim === 'typewriter') {
          drawText = t.text.slice(0, Math.max(1, Math.floor(progress * t.text.length)));
        } else if (anim === 'pop') {
          const p = progress < 0.6 ? progress / 0.6 : 1;
          const bounce = p < 1 ? 1 + 0.3 * Math.sin(p * Math.PI) : 1;
          this.ctx.font = 'bold ' + t.size * scale * bounce + 'px Inter, sans-serif';
          this.ctx.globalAlpha = Math.min(1, progress * 1.5);
        }
        const style = t.style || 'basic';
        if (style === 'box') {
          const metrics = this.ctx.measureText(drawText);
          const pad = 12 * scale;
          const tw = metrics.width + pad * 2;
          const th = t.size * scale + pad;
          this.ctx.fillStyle = 'rgba(0,0,0,0.65)';
          this.ctx.fillRect(x - tw / 2, y - th / 2, tw, th);
          this.ctx.fillStyle = t.color;
          this.ctx.fillText(drawText, x, y);
        } else if (style === 'neon') {
          this.ctx.shadowColor = t.color;
          this.ctx.shadowBlur = 20 * scale;
          this.ctx.fillStyle = t.color;
          this.ctx.fillText(drawText, x, y);
          this.ctx.fillText(drawText, x, y);
        } else if (style === 'shadow') {
          this.ctx.shadowColor = 'rgba(0,0,0,0.9)';
          this.ctx.shadowBlur = 12 * scale;
          this.ctx.shadowOffsetX = 3;
          this.ctx.shadowOffsetY = 3;
          this.ctx.fillStyle = t.color;
          this.ctx.fillText(drawText, x, y);
        } else {
          this.ctx.strokeText(drawText, x, y);
          this.ctx.fillStyle = t.color;
          this.ctx.fillText(drawText, x, y);
        }
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        this.ctx.globalAlpha = 1;
      });
    };

    function bindV6() {
      const ed = window.editor;
      if (!ed) return setTimeout(bindV6, 50);
      if (!ed.audioClips) ed.audioClips = [];
      if (!ed.grade) ed.grade = { brightness: 0, contrast: 0, saturate: 0, warmth: 0 };

      const audioInput = document.getElementById('audio-input');
      const btnAddAudio = document.getElementById('btn-add-audio');
      if (btnAddAudio && audioInput) {
        btnAddAudio.onclick = () => audioInput.click();
        audioInput.onchange = (e) => ed.handleAudioFiles(e.target.files);
      }
      const bgmVol = document.getElementById('bgm-volume');
      if (bgmVol) {
        bgmVol.oninput = (e) => {
          const v = parseInt(e.target.value, 10) / 100;
          const lab = document.getElementById('bgm-vol-val');
          if (lab) lab.textContent = e.target.value + '%';
          (ed.audioClips || []).forEach((a) => { if (a._el) a._el.volume = v; });
        };
      }
      const btnStop = document.getElementById('btn-stop-audio');
      if (btnStop) btnStop.onclick = () => ed.stopAllAudio();
      const btnDup = document.getElementById('btn-duplicate');
      if (btnDup) btnDup.onclick = () => ed.duplicateClip();
      const btnFreeze = document.getElementById('btn-freeze');
      if (btnFreeze) btnFreeze.onclick = () => ed.freezeFrame();
      ['grade-brightness', 'grade-contrast', 'grade-saturate', 'grade-warmth'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.oninput = () => ed.updateGradeFromUI();
      });
      const btnReset = document.getElementById('btn-grade-reset');
      if (btnReset) {
        btnReset.onclick = () => {
          ed.grade = { brightness: 0, contrast: 0, saturate: 0, warmth: 0 };
          ed.syncGradeUI();
          ed.applyFilter();
        };
      }
      const btnStab = document.getElementById('btn-stabilize');
      if (btnStab) btnStab.onclick = () => ed.stabilizeClip();
      const btnStabClear = document.getElementById('btn-stab-clear');
      if (btnStabClear) btnStabClear.onclick = () => ed.clearStabilize();
      const stabStr = document.getElementById('stab-strength');
      if (stabStr) stabStr.oninput = (e) => {
        const lab = document.getElementById('stab-strength-val');
        if (lab) lab.textContent = e.target.value;
      };
      const stabSm = document.getElementById('stab-smooth');
      if (stabSm) stabSm.oninput = (e) => {
        const lab = document.getElementById('stab-smooth-val');
        if (lab) lab.textContent = e.target.value;
      };
      console.log('CapCut Clone v7 stabilize loaded');
    }
    bindV6();
  });
})();
