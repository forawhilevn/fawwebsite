window.FAWMotion = window.FAWMotion || {};

window.FAWMotion.initVideoIntro = function initVideoIntro() {
  var intro = document.getElementById('videoIntro');
  if (!intro) return;

  var video = document.getElementById('videoIntroMain');
  var enterBtn = document.getElementById('videoIntroEnter');
  var STORAGE_KEY = 'faw_video_intro_shown';
  var storage = window.sessionStorage;

  // The video plays its intro animation once, then settles on a held red
  // logo frame around this timestamp and stays there until the end. Once it
  // ends, loop back to this point instead of replaying the whole intro.
  var LOOP_START = 5.6;

  // Intrinsic frame size and the approximate point just below the drawn
  // logo (centered horizontally, ~2/3 down the frame) where the button
  // should sit. Computed the same way as object-fit: contain, so the button
  // stays lined up with the logo regardless of viewport aspect ratio.
  var VIDEO_W = 3840;
  var VIDEO_H = 2160;
  var ANCHOR_X = 0.5;
  var ANCHOR_Y = 0.66;

  function positionButton() {
    if (!enterBtn) return;
    var rect = intro.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    var scale = Math.min(rect.width / VIDEO_W, rect.height / VIDEO_H);
    var dispW = VIDEO_W * scale;
    var dispH = VIDEO_H * scale;
    var offsetX = (rect.width - dispW) / 2;
    var offsetY = (rect.height - dispH) / 2;

    enterBtn.style.left = offsetX + ANCHOR_X * dispW + 'px';
    enterBtn.style.top = offsetY + ANCHOR_Y * dispH + 'px';
  }

  function dismiss() {
    intro.classList.add('is-transitioning');
    setTimeout(function () {
      intro.classList.add('is-hidden');
      setTimeout(function () {
        intro.style.display = 'none';
        if (video) video.pause();
      }, 700);
    }, 50);
  }

  if (storage.getItem(STORAGE_KEY)) {
    intro.style.display = 'none';
    return;
  }

  positionButton();
  requestAnimationFrame(function () {
    requestAnimationFrame(positionButton);
  });
  [0, 50, 150, 400, 900].forEach(function (delay) {
    setTimeout(positionButton, delay);
  });
  window.addEventListener('resize', positionButton);
  window.addEventListener('orientationchange', positionButton);

  if (video) {
    video.addEventListener('ended', function () {
      video.currentTime = LOOP_START;
      video.play().catch(function () {});
    });
    video.play().catch(function () {
      /* Autoplay was blocked; the Enter button still lets the visitor continue. */
    });
  }

  if (enterBtn) {
    enterBtn.addEventListener('click', function () {
      storage.setItem(STORAGE_KEY, '1');
      dismiss();
    });
  }
};
