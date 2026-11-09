window.FAWMotion = window.FAWMotion || {};

// Homepage intro. WEB_INTRO plays once on top of the website; the end of the
// clip is transparent, so the site underneath is revealed by the animation
// itself. Browsers that cannot show video transparency (Safari/iOS) get a
// flat MP4 and a fade-out instead.
window.FAWMotion.initVideoIntro = function initVideoIntro() {
  var intro = document.getElementById('videoIntro');
  if (!intro) return;
  var video = document.getElementById('videoIntroMain');
  var skip = document.getElementById('videoIntroSkip');
  var root = document.documentElement;
  var KEY = 'faw_video_intro_shown';
  var isMobile = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
  var dev = isMobile ? 'mobile' : 'desktop';
  var webmSrc = intro.getAttribute('data-' + dev + '-webm') || '';
  var mp4Src = intro.getAttribute('data-' + dev + '-mp4') || '';
  var REVEAL_AT = parseFloat(intro.getAttribute('data-' + dev + '-reveal'));
  if (!isFinite(REVEAL_AT)) REVEAL_AT = 3.5; // seconds: the site is revealed from here

  var force = /[?&]intro=1/.test(location.search);
  var seen = false;
  try { seen = !!sessionStorage.getItem(KEY); } catch (e) {}
  if (seen && !force) {
    intro.style.display = 'none';
    return;
  }
  try { sessionStorage.setItem(KEY, '1'); } catch (e) {}

  var ua = navigator.userAgent || '';
  var appleWebKit = /iP(hone|ad|od)/.test(ua) || (/Safari/.test(ua) && !/Chrome|Chromium|CriOS|FxiOS|Edg|Android/.test(ua));
  var canWebm = !!(video && video.canPlayType && video.canPlayType('video/webm; codecs="vp9"'));
  // Transparent WebM where supported; otherwise the flat/HEVC mp4-mov (fade-out ending).
  var useWebm = !appleWebKit && canWebm && !!webmSrc;
  var chosen = useWebm ? webmSrc : (mp4Src || (canWebm ? webmSrc : ''));
  var canAlpha = useWebm || (!mp4Src && !!chosen);

  var revealed = false;
  var finished = false;
  var timer = null;

  root.classList.add('intro-running');

  function reveal() {
    if (revealed) return;
    revealed = true;
    if (!canAlpha) intro.classList.add('is-fading');
    root.classList.add('intro-revealed');
    intro.classList.add('is-revealing');
    document.dispatchEvent(new CustomEvent('faw:intro-reveal'));
  }

  function finish() {
    if (finished) return;
    finished = true;
    reveal();
    clearInterval(timer);
    root.classList.remove('intro-running');
    intro.classList.add('is-hidden');
    setTimeout(function () {
      intro.style.display = 'none';
      if (video) { video.pause(); video.removeAttribute('src'); video.load(); if (blobUrl) URL.revokeObjectURL(blobUrl); }
    }, 1800);
  }

  if (!video) { finish(); return; }

  if (!chosen) { finish(); return; }

  // Safari/iOS: autoplay only works with the muted + playsinline flags set from script too.
  video.muted = true;
  video.defaultMuted = true;
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.playsInline = true;
  video.preload = 'auto';
  video.src = chosen;
  try { video.load(); } catch (e) {}

  var hardStop = null;
  var blobTried = false;
  var blobUrl = '';
  var playing = false;
  var needsTap = false;
  function armTap() {
    // iPhone Low Power Mode / strict autoplay settings block the video until the visitor touches the screen:
    // wait for a tap instead of dropping the intro.
    if (needsTap || finished) return;
    needsTap = true;
    intro.classList.add('needs-tap');
    var hint = document.createElement('div');
    hint.className = 'video-intro__tap';
    hint.textContent = document.documentElement.lang === 'en' ? 'Tap to play' : 'Chạm để xem';
    intro.appendChild(hint);
    var go = function () {
      intro.removeEventListener('click', go);
      intro.removeEventListener('touchend', go);
      hint.remove();
      intro.classList.remove('needs-tap');
      var p2 = video.play();
      if (p2 && p2.catch) p2.catch(finish);
    };
    intro.addEventListener('click', go);
    intro.addEventListener('touchend', go);
  }
  function tryPlay() {
    if (playing) return;
    var pr = video.play();
    if (pr && pr.catch) pr.catch(function (err) {
      if (err && err.name === 'NotAllowedError') armTap();
      else if (blobTried) finish(); else useBlob();
    });
  }
  // Fallback: some Safari builds stall on streamed files behind proxies (no Range support);
  // downloading the whole clip and playing it from memory always works.
  function useBlob() {
    if (blobTried || finished) return;
    blobTried = true;
    if (!window.fetch || !window.URL || !URL.createObjectURL) { finish(); return; }
    fetch(chosen, { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error('http'); return r.blob(); })
      .then(function (b) {
        if (finished) return;
        blobUrl = URL.createObjectURL(b);
        video.src = blobUrl;
        try { video.load(); } catch (e) {}
        tryPlay();
      })
      .catch(finish);
  }

  video.addEventListener('loadeddata', tryPlay);
  video.addEventListener('canplay', tryPlay);
  video.addEventListener('playing', function () {
    playing = true;
    intro.classList.add('is-playing');
    clearTimeout(hardStop);
    hardStop = setTimeout(finish, Math.max(4000, ((video.duration || 8) - video.currentTime) * 1000 + 2500));
  });
  video.addEventListener('ended', finish);
  video.addEventListener('error', function () { if (blobTried) finish(); else useBlob(); });

  // Not playing after 2.5s -> switch to the in-memory copy once.
  setTimeout(function () {
    if (!intro.classList.contains('is-playing') && !finished && !needsTap) useBlob();
  }, 2500);

  timer = setInterval(function () {
    if (video.currentTime >= REVEAL_AT) reveal();
  }, 80);

  // Hard stop: the overlay can never outlive the clip by much.
  hardStop = setTimeout(finish, 12000);

  // Never leave visitors stuck behind a video that does not start.
  setTimeout(function () {
    if (!intro.classList.contains('is-playing') && !needsTap) finish();
  }, 9000);

  tryPlay();

  if (skip) {
    setTimeout(function () { skip.classList.add('is-visible'); }, 1200);
    skip.addEventListener('click', finish);
  }
};
