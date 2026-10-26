/* KBA Mock Exams: retro music player
   - Speaker on/off, back, play/pause, next
   - Plays at 50% volume, loops the current track until Next or Back
   - Remembers on/off, track, and position, so music picks up on the next page
   - Browsers block sound until the visitor taps the page, so after moving to a
     new page the music resumes on the first tap or key press. */
(function () {
  var TRACKS = [
    { title: 'COZY BOTANICA', src: 'music/cozy-botanica.mp3', len: 13.241383, gain: 0.92 },
    { title: 'SKYLINE',       src: 'music/skyline.mp3',       len: 29.090930, gain: 1.0 },
    { title: 'MAMACITA',      src: 'music/mamacita.mp3',      len: 25.043469, gain: 0.83 },
    { title: 'GO TO WASTE',   src: 'music/go-to-waste.mp3',   len: 30.720000, gain: 1.0 }
  ];
  var VOLUME = 0.5;            // 50%
  var KEY = 'kbaMusic';
  var pos = (document.currentScript && document.currentScript.getAttribute('data-pos')) || 'bottom';

  // ---------- saved state ----------
  var state = { on: false, playing: false, track: 0, offset: 0 };
  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && typeof saved.track === 'number') {
      state.on = !!saved.on;
      state.playing = !!saved.playing;
      state.track = Math.min(Math.max(0, saved.track), TRACKS.length - 1);
      // keep the song moving forward by the time spent switching pages
      var gap = saved.savedAt ? Math.min(10, (Date.now() - saved.savedAt) / 1000) : 0;
      state.offset = (saved.offset || 0) + (saved.playing && saved.on ? gap : 0);
    }
  } catch (e) {}

  // ---------- audio engine (Web Audio gives seamless loops) ----------
  var ctx = null, master = null, trackGain = null, source = null;
  var buffers = {}, loading = {};
  var startedAt = 0, loopStart = 0, loopLen = 1;

  function ensureCtx() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = VOLUME; master.connect(ctx.destination);
    trackGain = ctx.createGain(); trackGain.connect(master);
    return ctx;
  }

  function load(i) {
    if (buffers[i]) return Promise.resolve(buffers[i]);
    if (loading[i]) return loading[i];
    loading[i] = fetch(TRACKS[i].src)
      .then(function (r) { return r.arrayBuffer(); })
      .then(function (ab) {
        return new Promise(function (res, rej) { ctx.decodeAudioData(ab, res, rej); });
      })
      .then(function (buf) { buffers[i] = buf; return buf; });
    return loading[i];
  }

  // find where the sound actually starts (skips the tiny silence MP3 files add)
  function findStart(buf) {
    var d = buf.getChannelData(0), max = Math.min(d.length, Math.floor(buf.sampleRate * 0.1));
    for (var i = 0; i < max; i++) if (Math.abs(d[i]) > 0.0005) return i / buf.sampleRate;
    return 0;
  }

  function currentOffset() {
    if (!source || !ctx) return state.offset;
    var el = ctx.currentTime - startedAt;
    return ((el % loopLen) + loopLen) % loopLen;
  }

  function stopSource() {
    if (source) { try { source.onended = null; source.stop(); } catch (e) {} source.disconnect(); source = null; }
  }

  var playToken = 0;
  function startTrack(offset) {
    if (!ensureCtx()) return;
    var token = ++playToken, i = state.track;
    setStatus('LOADING');
    load(i).then(function (buf) {
      if (token !== playToken || !state.on || !state.playing) return;
      stopSource();
      var t = TRACKS[i];
      loopStart = findStart(buf);
      loopLen = Math.min(t.len, buf.duration - loopStart);
      var off = ((offset || 0) % loopLen + loopLen) % loopLen;
      source = ctx.createBufferSource();
      source.buffer = buf;
      source.loop = true;
      source.loopStart = loopStart;
      source.loopEnd = loopStart + loopLen;
      trackGain.gain.value = t.gain;
      source.connect(trackGain);
      source.start(0, loopStart + off);
      startedAt = ctx.currentTime - off;
      setStatus('');
      render();
      // preload the next track so Next is instant
      load((i + 1) % TRACKS.length).catch(function () {});
    }).catch(function () { setStatus('ERROR'); });
  }

  function play(fromOffset) {
    if (!ensureCtx()) return;
    var go = function () { startTrack(fromOffset); };
    if (ctx.state === 'suspended') ctx.resume().then(go, go); else go();
  }

  // ---------- controls ----------
  function toggleSpeaker() {
    state.on = !state.on;
    if (state.on) { state.playing = true; play(currentOffset()); }
    else { state.offset = currentOffset(); stopSource(); }
    save(); render();
  }
  function togglePlay() {
    if (!state.on) { toggleSpeaker(); return; }
    state.playing = !state.playing;
    if (state.playing) play(state.offset);
    else { state.offset = currentOffset(); stopSource(); }
    save(); render();
  }
  function skip(dir) {
    state.track = (state.track + dir + TRACKS.length) % TRACKS.length;
    state.offset = 0;
    if (state.on && state.playing) play(0);
    save(); render();
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        on: state.on, playing: state.playing, track: state.track,
        offset: (state.on && state.playing && source) ? currentOffset() : state.offset,
        savedAt: Date.now()
      }));
    } catch (e) {}
  }
  window.addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', function () { if (document.hidden) save(); });
  setInterval(function () { if (source) save(); }, 2000);

  // ---------- player UI ----------
  var css = '' +
    '.kba-player{position:fixed;z-index:50;right:12px;display:flex;align-items:center;gap:4px;' +
    'background:rgba(14,9,24,0.92);border:3px solid #F5EDE0;box-shadow:0 0 0 3px #000,4px 4px 0 rgba(0,0,0,0.5);' +
    'padding:5px 6px;font-family:"Press Start 2P","Courier New",monospace;color:#F5EDE0;max-width:calc(100vw - 24px);}' +
    '.kba-player.pos-bottom{bottom:max(12px,env(safe-area-inset-bottom));}' +
    '.kba-player.pos-top{top:max(12px,env(safe-area-inset-top));}' +
    '.kba-player button{background:none;border:2px solid transparent;color:inherit;cursor:pointer;' +
    'font-family:inherit;font-size:12px;width:34px;height:32px;padding:0;line-height:1;display:flex;align-items:center;justify-content:center;}' +
    '.kba-player button:hover{border-color:#FF8A1F;color:#FFD23F;}' +
    '.kba-player button:focus-visible{outline:2px solid #FF8A1F;outline-offset:1px;}' +
    '.kba-player button.spk{font-size:16px;}' +
    '.kba-player button.spk.off{opacity:0.6;}' +
    '.kba-player .ttl{font-size:7px;line-height:1.6;color:#B5A3C4;width:92px;overflow:hidden;white-space:nowrap;padding:0 4px;}' +
    '.kba-player .ttl b{display:block;color:#FFD23F;font-weight:400;}' +
    '.kba-player .ttl span{display:inline-block;}' +
    '.kba-player.on.playing .ttl span.long{animation:kbaMarquee 7s linear infinite;}' +
    '.kba-player .tap{color:#FF8A1F;animation:kbaBlink 1s linear infinite;}' +
    '@keyframes kbaMarquee{0%,15%{transform:translateX(0)}85%,100%{transform:translateX(calc(-100% + 84px))}}' +
    '@keyframes kbaBlink{0%,60%{opacity:1}61%,100%{opacity:0.2}}' +
    '.kba-eq{display:inline-flex;align-items:flex-end;gap:1px;height:8px;margin-left:4px;vertical-align:middle;}' +
    '.kba-eq i{display:block;width:2px;background:#7FDB5A;height:2px;}' +
    '.kba-player.on.playing .kba-eq i{animation:kbaEq 0.8s steps(4) infinite;}' +
    '.kba-player.on.playing .kba-eq i:nth-child(2){animation-delay:-0.3s}' +
    '.kba-player.on.playing .kba-eq i:nth-child(3){animation-delay:-0.55s}' +
    '@keyframes kbaEq{0%{height:2px}25%{height:8px}50%{height:4px}75%{height:6px}100%{height:2px}}' +
    '@media (max-width:420px){.kba-player .ttl{width:70px}.kba-player button{width:30px}}' +
    '@media (prefers-reduced-motion:reduce){.kba-player *{animation:none!important}}';
  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  var el = document.createElement('div');
  el.className = 'kba-player pos-' + pos;
  el.setAttribute('role', 'region');
  el.setAttribute('aria-label', 'Music player');
  el.innerHTML =
    '<button type="button" class="spk" data-act="spk"></button>' +
    '<button type="button" data-act="prev" aria-label="Previous track">&#9664;&#9664;</button>' +
    '<button type="button" data-act="play"></button>' +
    '<button type="button" data-act="next" aria-label="Next track">&#9654;&#9654;</button>' +
    '<div class="ttl" aria-live="polite"><b></b><span></span></div>';

  var statusText = '';
  function setStatus(s) { statusText = s; render(); }

  function render() {
    var spk = el.querySelector('[data-act="spk"]');
    var pl = el.querySelector('[data-act="play"]');
    var isPlaying = state.on && state.playing;
    spk.textContent = state.on ? '🔊' : '🔇';
    spk.classList.toggle('off', !state.on);
    spk.setAttribute('aria-label', state.on ? 'Turn music off' : 'Turn music on');
    pl.innerHTML = isPlaying ? '&#10074;&#10074;' : '&#9654;';
    pl.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');
    el.classList.toggle('on', state.on);
    el.classList.toggle('playing', state.playing);
    var b = el.querySelector('.ttl b'), sp = el.querySelector('.ttl span');
    var waitingTap = isPlaying && (!ctx || ctx.state !== 'running');
    if (waitingTap) {
      b.innerHTML = 'TRACK ' + (state.track + 1) + '/' + TRACKS.length;
      sp.className = 'tap'; sp.textContent = 'TAP TO PLAY';
    } else {
      b.innerHTML = 'TRACK ' + (state.track + 1) + '/' + TRACKS.length +
        (isPlaying && !statusText ? '<span class="kba-eq"><i></i><i></i><i></i></span>' : '');
      var txt = statusText || (state.on ? TRACKS[state.track].title : 'MUSIC OFF');
      sp.textContent = txt;
      sp.className = txt.length > 10 ? 'long' : '';
    }
  }

  el.addEventListener('click', function (e) {
    var btn = e.target.closest('button'); if (!btn) return;
    e.stopPropagation();
    var a = btn.getAttribute('data-act');
    if (a === 'spk') toggleSpeaker();
    else if (a === 'play') togglePlay();
    else if (a === 'next') skip(1);
    else if (a === 'prev') skip(-1);
  });
  // keep the player's keys from moving menus or answering questions
  el.addEventListener('keydown', function (e) { e.stopPropagation(); });

  function mount() {
    document.body.appendChild(el);
    if (pos === 'bottom') document.body.style.paddingBottom = '72px';
    render();
    // music was on when they left the last page: resume on the first tap or key
    if (state.on && state.playing) {
      var resume = function () {
        document.removeEventListener('pointerdown', resume, true);
        document.removeEventListener('keydown', resume, true);
        if (!source) play(state.offset);
      };
      document.addEventListener('pointerdown', resume, true);
      document.addEventListener('keydown', resume, true);
      // some browsers allow it right away (returning visitors)
      if (ensureCtx() && ctx.state === 'running') play(state.offset);
      else if (ctx) ctx.resume().then(function () { if (ctx.state === 'running' && !source) play(state.offset); render(); }).catch(function () {});
    }
  }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
