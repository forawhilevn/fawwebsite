window.FAWMotion = window.FAWMotion || {};

window.FAWMotion.initVideoIntro = function initVideoIntro() {
  var intro = document.getElementById('videoIntro');
  if (!intro) return;

  var video1 = document.getElementById('videoIntroOne');
  var video2 = document.getElementById('videoIntroTwo');
  var hotspot = document.getElementById('videoIntroEnter');
  var label = document.getElementById('videoIntroLabel');
  var STORAGE_KEY = 'faw_video_intro_shown';
  var storage = window.localStorage;

  // Intrinsic pixel bounds (within the 3840x2160 source frame) of the flat
  // top face of the hand-drawn "press here" button/pedestal that's drawn
  // into both videos at the same spot. Used to line the invisible hotspot
  // and label up with the artwork regardless of viewport aspect ratio.
  var VIDEO_W = 3840;
  var VIDEO_H = 2160;
  var BUTTON_BOUNDS = { left: 1180, top: 1110, right: 2020, bottom: 1500 };

  function positionHotspot() {
    if (!hotspot) return;
    var rect = intro.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    // object-fit: contain uses the smaller ratio (letterbox), the opposite
    // of cover's Math.max.
    var scale = Math.min(rect.width / VIDEO_W, rect.height / VIDEO_H);
    var dispW = VIDEO_W * scale;
    var dispH = VIDEO_H * scale;
    var offsetX = (dispW - rect.width) / 2;
    var offsetY = (dispH - rect.height) / 2;

    var left = BUTTON_BOUNDS.left * scale - offsetX;
    var top = BUTTON_BOUNDS.top * scale - offsetY;
    var width = (BUTTON_BOUNDS.right - BUTTON_BOUNDS.left) * scale;
    var height = (BUTTON_BOUNDS.bottom - BUTTON_BOUNDS.top) * scale;

    hotspot.style.left = left + 'px';
    hotspot.style.top = top + 'px';
    hotspot.style.width = width + 'px';
    hotspot.style.height = height + 'px';
  }

  function dismiss() {
    intro.classList.add('is-hidden');
    setTimeout(function () {
      intro.style.display = 'none';
      if (video1) video1.pause();
      if (video2) video2.pause();
    }, 650);
  }

  if (storage.getItem(STORAGE_KEY)) {
    intro.style.display = 'none';
    return;
  }

  positionHotspot();
  // The very first call(s) can land before the fixed-position container has
  // completed its initial layout pass (or before viewport chrome such as a
  // scrollbar settles), so keep re-checking for a bit after load.
  requestAnimationFrame(function () {
    requestAnimationFrame(positionHotspot);
  });
  [0, 50, 150, 400, 900].forEach(function (delay) {
    setTimeout(positionHotspot, delay);
  });
  window.addEventListener('resize', positionHotspot);
  window.addEventListener('orientationchange', positionHotspot);

  if (video1) {
    video1.play().catch(function () {
      /* Autoplay was blocked; the hotspot still lets the visitor continue. */
    });
  }

  if (hotspot) {
    hotspot.addEventListener('click', function () {
      storage.setItem(STORAGE_KEY, '1');
      intro.classList.add('is-transitioning');
      if (label) label.classList.add('is-hidden');

      if (video1) video1.classList.remove('is-active');
      if (video2) {
        video2.classList.add('is-active');
        video2.currentTime = 0;
        video2.play().catch(function () {});
      }

      if (video1) video1.pause();
    });
  }

  if (video2) {
    video2.addEventListener('ended', dismiss);
  }
};
