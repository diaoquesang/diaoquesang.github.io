/* Global music player — reads the playlist JSON emitted by _includes/music-player.html.
 * Behavior mirrors the original site: sequential / shuffle / one-loop repeat,
 * draggable progress, volume with mute recall, and [🎧 Play] queue buttons. */
document.addEventListener('DOMContentLoaded', () => {

  const state = {
    tracks: [],
    current: 0,
    playMode: 0,          // 0 sequential, 1 shuffle, 2 one-loop
    shuffled: [],
    shuffleIndex: 0,
    lastVolume: 20,
    isMuted: false,
    userSetZero: false,
    isDragging: false,
  };

  const DOM = {
    audio: document.getElementById('main-audio'),
    playBtn: document.getElementById('play-pause-btn'),
    prevBtn: document.getElementById('prev-btn'),
    nextBtn: document.getElementById('next-btn'),
    progress: document.getElementById('progress-bar'),
    volume: document.getElementById('volume-slider'),
    volumeIcon: document.getElementById('volume-icon'),
    name: document.getElementById('track-name'),
    currentTime: document.getElementById('current-time'),
    duration: document.getElementById('duration'),
    modeBtn: document.getElementById('mode-btn'),
    volumeDisplay: document.getElementById('volume-display'),
  };

  if (!DOM.audio) return;

  const format = (s) => {
    if (isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? '0' + sec : sec}`;
  };

  const setProgress = (el, value) => {
    el.value = value;
    el.style.setProperty('--progress', value + '%');
  };

  // ===== load playlist from the JSON block =====
  function extractTracks() {
    const node = document.getElementById('playlist-data');
    if (!node) return;
    let data = [];
    try { data = JSON.parse(node.textContent); } catch (e) { return; }
    const prefix = typeof window.SITE_BASE === 'string' ? window.SITE_BASE : '';
    state.tracks = data.map((t) => ({
      name: t.title,
      file: new URL(prefix + t.audio, document.baseURI).href, // resolves relative to the page, like the browser would
    }));
  }

  // ===== shuffle =====
  function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function buildShuffle(startIndex = 0) {
    state.shuffled = shuffleArray([...Array(state.tracks.length).keys()]);
    const pos = state.shuffled.indexOf(startIndex);
    [state.shuffled[0], state.shuffled[pos]] = [state.shuffled[pos], state.shuffled[0]];
    state.shuffleIndex = 0;
  }

  // ===== playback =====
  function loadTrack(i, autoPlay = true) {
    const t = state.tracks[i];
    if (!t) return;
    // a fade-out belongs to the track it was started for: drop it here, and put the
    // volume back where the user set it (the ramp may have left it near zero)
    cancelRamp(false);
    DOM.audio.volume = volumeTarget();
    state.current = i;
    DOM.audio.src = t.file;
    DOM.audio.currentTime = 0;
    DOM.audio.load();
    DOM.name.textContent = t.name;
    if (autoPlay) DOM.audio.play().catch(() => {});
    updatePlayButton();
  }

  // Original hard cut (replaced 2026-11-04 at the user's request — he wants pause and
  // resume to settle in/out rather than switch instantly):
  //   DOM.audio.paused ? DOM.audio.play().catch(() => {}) : DOM.audio.pause();
  function softPlay() {
    if (!DOM.audio.paused) return;
    const target = volumeTarget();
    DOM.audio.volume = 0;                  // start from silence, then swell in
    DOM.audio.play().catch(() => {
      // blocked (autoplay policy / no gesture): don't leave the element at zero volume
      cancelRamp(false);
      DOM.audio.volume = volumeTarget();
    });
    rampVolume(target, FADE_IN);
  }

  function softPause() {
    if (DOM.audio.paused) return;
    if (fade.to === 0) {                   // clicked again mid fade-out → swell back, don't pause
      cancelRamp(false);
      rampVolume(volumeTarget(), FADE_IN);
      return;
    }
    rampVolume(0, FADE_OUT, () => DOM.audio.pause());
  }

  function togglePlay() {
    DOM.audio.paused ? softPlay() : softPause();
  }

  function updatePlayButton() {
    const icon = DOM.playBtn.querySelector('i');
    icon.className = DOM.audio.paused ? 'fa-solid fa-play' : 'fa-solid fa-pause';
    updateCardStates();
  }

  // ===== highlight the card of the current track =====
  function updateCardStates() {
    document.querySelectorAll('.music-card').forEach((card, i) => {
      const isCurrent = i === state.current && !!state.tracks.length && card.querySelector('.play-fab');
      card.classList.toggle('is-playing', !!isCurrent);
      const fab = card.querySelector('.play-fab i');
      if (fab) fab.className = (isCurrent && !DOM.audio.paused) ? 'fa-solid fa-pause' : 'fa-solid fa-play';
    });
  }

  function next() {
    if (state.playMode === 1) {
      if (state.shuffleIndex >= state.shuffled.length - 1) {
        buildShuffle(state.current);
      } else {
        state.shuffleIndex++;
      }
      return loadTrack(state.shuffled[state.shuffleIndex]);
    }
    loadTrack((state.current + 1) % state.tracks.length);
  }

  function prev() {
    if (state.playMode === 1) {
      state.shuffleIndex--;
      if (state.shuffleIndex < 0) {
        buildShuffle(state.current);
        state.shuffleIndex = state.shuffled.length - 1;
      }
      return loadTrack(state.shuffled[state.shuffleIndex]);
    }
    loadTrack((state.current - 1 + state.tracks.length) % state.tracks.length);
  }

  // ===== progress =====
  function updateProgress() {
    if (state.isDragging || !DOM.audio.duration) return;
    const percent = (DOM.audio.currentTime / DOM.audio.duration) * 100;
    setProgress(DOM.progress, percent);
    DOM.currentTime.textContent = format(DOM.audio.currentTime);
  }

  function updateDuration() {
    DOM.duration.textContent = format(DOM.audio.duration);
  }

  DOM.progress.addEventListener('mousedown', () => { state.isDragging = true; });

  DOM.progress.addEventListener('input', () => {
    if (!DOM.audio.duration) return;
    const percent = DOM.progress.value;
    const preview = (percent / 100) * DOM.audio.duration;
    setProgress(DOM.progress, percent);
    DOM.currentTime.textContent = format(preview);
  });

  document.addEventListener('mouseup', () => {
    if (!state.isDragging) return;
    state.isDragging = false;
    if (!DOM.audio.duration) return;
    DOM.audio.currentTime = (DOM.progress.value / 100) * DOM.audio.duration;
  });

  // ===== volume =====
  function changeVolume() {
    cancelRamp(true);            // a manual slider move always wins over a fade
    let v = Number(DOM.volume.value);
    state.userSetZero = (v === 0);
    if (v > 0) state.lastVolume = v;
    state.isMuted = false;
    DOM.audio.volume = v / 100;
    setProgress(DOM.volume, v);
    DOM.volumeDisplay.textContent = v + '%';
    updateVolumeIcon();
  }

  function toggleMute() {
    cancelRamp(true);            // idem: muting must not fight the fade
    state.isMuted = !state.isMuted;
    const v = state.isMuted ? 0 : (state.userSetZero ? 0 : state.lastVolume);
    DOM.audio.volume = v / 100;
    setProgress(DOM.volume, v);
    DOM.volumeDisplay.textContent = v + '%';
    updateVolumeIcon();
  }

  function updateVolumeIcon() {
    const v = DOM.volume.value;
    if (state.isMuted) DOM.volumeIcon.className = 'fa-solid fa-volume-xmark volume-icon';
    else if (v == 0) DOM.volumeIcon.className = 'fa-solid fa-volume-off volume-icon';
    else if (v < 50) DOM.volumeIcon.className = 'fa-solid fa-volume-low volume-icon';
    else DOM.volumeIcon.className = 'fa-solid fa-volume-high volume-icon';
  }

  // ===== gentle fade in / out =====
  // Pause and resume ramp the element volume instead of switching it hard, so the
  // sound swells in and settles away (and the spectrum gets its natural decay for free).
  const FADE_IN = 280;
  const FADE_OUT = 240;
  const fade = { raf: 0, to: null, end: null, watchdog: 0 };

  function volumeTarget() {
    return state.isMuted || state.userSetZero ? 0 : Number(DOM.volume.value) / 100;
  }

  // finish=true jumps to the target and still runs the pending callback (which is how a
  // queued pause survives an interrupting slider drag); finish=false drops both, used
  // when the user changes their mind mid fade-out.
  function cancelRamp(finish) {
    if (fade.raf) cancelAnimationFrame(fade.raf);
    clearTimeout(fade.watchdog);
    fade.raf = 0;
    const to = fade.to, end = fade.end;
    fade.to = null; fade.end = null;
    if (finish && to !== null) DOM.audio.volume = to;
    if (finish && end) end();
  }

  function rampVolume(to, ms, done) {
    cancelRamp(true);
    const from = DOM.audio.volume;
    if (ms <= 0 || reduceMotion.matches || from === to) {
      DOM.audio.volume = to;
      if (done) done();
      return;
    }
    const t0 = performance.now();
    fade.to = to;
    fade.end = done || null;
    const finish = () => {
      if (fade.raf) cancelAnimationFrame(fade.raf);
      clearTimeout(fade.watchdog);
      fade.raf = 0;
      const end = fade.end;
      fade.to = null; fade.end = null;
      DOM.audio.volume = to;
      if (end) end();
    };
    const step = (now) => {
      const k = Math.min(1, (now - t0) / ms);
      DOM.audio.volume = from + (to - from) * k;
      if (k < 1) fade.raf = requestAnimationFrame(step);
      else finish();
    };
    fade.raf = requestAnimationFrame(step);
    // rAF is frozen in a background tab; without this the queued pause would never land
    fade.watchdog = setTimeout(finish, ms + 150);
  }

  // sound wave (音浪) prototype — re-applied 2026-11-04 so it can be viewed locally
  // (canonical copy also in tools/wave-effect.md)
  // ===== sound wave (Web Audio spectrum, drawn in #wave-canvas) =====
  // Built lazily on the first play so the AudioContext is created inside a user
  // gesture (autoplay policy). The canvas is a strip sitting above the player
  // bar, so the bar keeps its exact height.
  const wave = {
    canvas: document.getElementById('wave-canvas'),
    g: null,
    ac: null,
    analyser: null,
    data: null,
    raf: 0,
    dying: false,
    sourceMade: false,
    unsupported: false,
    ok: false,
  };
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function sizeWave() {
    if (!wave.ok || !wave.canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = wave.canvas.getBoundingClientRect();
    wave.canvas.width = Math.max(1, Math.round(rect.width * dpr));
    wave.canvas.height = Math.max(1, Math.round(rect.height * dpr));
    wave.g.setTransform(dpr, 0, 0, dpr, 0, 0);
    wave.w = rect.width;
    wave.h = rect.height;
  }

  // Tap the element into the graph. MUST only run while wave.ac.state === 'running':
  // a suspended context would swallow the audio (the element no longer plays
  // through the browser's own output once it is routed into the graph).
  function initWave() {
    if (!wave.canvas || wave.sourceMade || !wave.ac) return;
    wave.sourceMade = true;
    try {
      const src = wave.ac.createMediaElementSource(DOM.audio); // once per element, survives src changes
      wave.analyser = wave.ac.createAnalyser();
      wave.analyser.fftSize = 256;
      wave.analyser.smoothingTimeConstant = 0.82;
      src.connect(wave.analyser);
      wave.analyser.connect(wave.ac.destination);
      wave.data = new Uint8Array(wave.analyser.frequencyBinCount);
      wave.g = wave.canvas.getContext('2d');
      wave.ok = true;
      sizeWave();
    } catch (e) {
      wave.ok = false; // no spectrum, playback unaffected
    }
  }

  function clearWave() {
    if (wave.g && wave.canvas) wave.g.clearRect(0, 0, wave.canvas.width, wave.canvas.height);
  }

  let waveFrame = 0;

  function drawWave() {
    wave.analyser.getByteFrequencyData(wave.data);
    const g = wave.g;
    const w = wave.w, h = wave.h;
    g.clearRect(0, 0, w, h);
    const step = Math.max(10, Math.round(w / 56));       // ~1 bar per 10px, never too dense
    const bars = Math.max(8, Math.floor(w / step));
    const gap = 3;
    const bw = (w - gap * (bars - 1)) / bars;
    if (!wave.accent || ++waveFrame % 30 === 0) {
      // re-read occasionally so a theme switch is picked up within ~0.5s
      wave.accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#4a9eff';
    }
    // the band sits on top of the bar, so the strongest colour is at the bottom
    // (the bar's edge) and it fades out towards the tips of the bars
    const grad = g.createLinearGradient(0, h, 0, 0);
    grad.addColorStop(0, wave.accent);
    grad.addColorStop(1, 'transparent');
    g.fillStyle = grad;
    // silence must look like silence: no per-bar minimum height, and bins with no
    // real signal (muted, pre-roll, quiet gaps) are skipped entirely instead of
    // leaving a faint row of stubs along the bar's edge
    const CUTOFF = 6 / 255;
    let peak = 0;
    for (let i = 0; i < bars; i++) {
      // low frequencies carry the beat, so bias the bin pick towards the start
      const bin = Math.round(Math.pow((i + 1) / bars, 1.7) * (wave.data.length - 1));
      const v = wave.data[bin] / 255;
      if (v > peak) peak = v;
      if (v < CUTOFF) continue;
      const bh = Math.min(h, v * v * h * 1.15);
      if (bh < 1) continue;
      g.globalAlpha = 0.35 + v * 0.55;
      g.fillRect(i * (bw + gap), h - bh, bw, bh); // anchored to the bar edge, grows up
    }
    g.globalAlpha = 1;
    // fade-out: the analyser's own smoothing settles the bars down over a few frames,
    // so pause ends up looking exactly like muting does instead of snapping blank
    if (wave.dying && peak < CUTOFF) { wave.dying = false; waveEnd(); }
  }

  function waveLoop() {
    drawWave();
    wave.raf = requestAnimationFrame(waveLoop);
  }

  function waveEnd() {
    if (wave.raf) { cancelAnimationFrame(wave.raf); wave.raf = 0; }
    clearWave();
  }

  async function waveStart() {
    if (!wave.canvas || wave.unsupported || reduceMotion.matches) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { wave.unsupported = true; return; }
    if (!wave.ac) wave.ac = new AC();
    if (wave.ac.state === 'suspended') {
      try { await wave.ac.resume(); } catch (e) { /* stays suspended */ }
    }
    // only route the audio into the graph once it can actually run — otherwise
    // the routed-but-suspended output would mute the player
    if (wave.ac.state !== 'running') return;
    initWave();
    if (!wave.ok) return;
    wave.dying = false;          // a loop still settling from a pause just picks back up
    if (wave.raf) return;
    waveLoop();
  }

  function waveStop(fadeOut) {
    if (fadeOut && wave.raf && !reduceMotion.matches) { wave.dying = true; return; }
    wave.dying = false;
    waveEnd();
  }

  if (wave.canvas) {
    window.addEventListener('resize', sizeWave);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) waveStop();
      else if (!DOM.audio.paused) waveStart();
    });
  }

  // ===== mode =====
  function toggleMode() {
    state.playMode = (state.playMode + 1) % 3;
    const icon = DOM.modeBtn.querySelector('i');
    if (state.playMode === 0) icon.className = 'fa-solid fa-repeat';
    if (state.playMode === 1) { buildShuffle(state.current); icon.className = 'fa-solid fa-shuffle'; }
    if (state.playMode === 2) icon.className = 'fa-solid fa-arrow-rotate-right';
  }

  // ===== events =====
  DOM.playBtn.addEventListener('click', togglePlay);
  DOM.prevBtn.addEventListener('click', prev);
  DOM.nextBtn.addEventListener('click', next);
  DOM.modeBtn.addEventListener('click', toggleMode);
  DOM.volume.addEventListener('input', changeVolume);
  DOM.volumeIcon.addEventListener('click', toggleMute);
  DOM.audio.addEventListener('timeupdate', updateProgress);
  DOM.audio.addEventListener('loadedmetadata', updateDuration);
  DOM.audio.addEventListener('play', () => { updatePlayButton(); waveStart(); });
  DOM.audio.addEventListener('pause', () => { updatePlayButton(); waveStop(true); });
  DOM.audio.addEventListener('ended', () => {
    waveStop(true);
    if (state.playMode === 2) { DOM.audio.currentTime = 0; DOM.audio.play(); }
    else next();
  });

  // ===== play buttons on music cards =====
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.queue-track');
    if (!btn) return;
    e.preventDefault();
    const idx = Number(btn.getAttribute('data-index'));
    if (isNaN(idx)) return;
    // clicking the current track toggles play/pause instead of restarting
    if (idx === state.current) { togglePlay(); return; }
    if (state.playMode === 1) {
      const pos = state.shuffled.indexOf(idx);
      if (pos === -1) buildShuffle(idx); else state.shuffleIndex = pos;
    }
    loadTrack(idx, true);
  });

  // ===== start =====
  extractTracks();
  if (state.tracks.length > 0) loadTrack(0, false);
  changeVolume();
  setProgress(DOM.progress, 0);
});
