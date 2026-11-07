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
  var REVEAL_AT = 3.5; // seconds: the red scribble starts to recede here

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
  var canAlpha = !appleWebKit && video && video.canPlayType && !!video.canPlayType('video/webm; codecs="vp9"');

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
      if (video) { video.pause(); video.removeAttribute('src'); video.load(); }
    }, 1800);
  }

  if (!video) { finish(); return; }

  video.src = canAlpha ? '/video/WEB_INTRO.webm' : '/video/WEB_INTRO.mp4';

  video.addEventListener('playing', function () { intro.classList.add('is-playing'); });
  video.addEventListener('ended', finish);
  video.addEventListener('error', finish);

  timer = setInterval(function () {
    if (video.currentTime >= REVEAL_AT) reveal();
  }, 80);

  // Hard stop: the overlay can never outlive the clip by much.
  setTimeout(finish, 12000);

  // Never leave visitors stuck behind a video that does not start.
  setTimeout(function () {
    if (!intro.classList.contains('is-playing')) finish();
  }, 7000);

  var p = video.play();
  if (p && p.catch) p.catch(finish);

  if (skip) {
    setTimeout(function () { skip.classList.add('is-visible'); }, 1200);
    skip.addEventListener('click', finish);
  }
};
