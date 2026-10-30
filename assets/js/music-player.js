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
    state.current = i;
    DOM.audio.src = t.file;
    DOM.audio.currentTime = 0;
    DOM.audio.load();
    DOM.name.textContent = t.name;
    if (autoPlay) DOM.audio.play().catch(() => {});
    updatePlayButton();
  }

  function togglePlay() {
    DOM.audio.paused ? DOM.audio.play().catch(() => {}) : DOM.audio.pause();
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
  DOM.audio.addEventListener('play', updatePlayButton);
  DOM.audio.addEventListener('pause', updatePlayButton);
  DOM.audio.addEventListener('ended', () => {
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
