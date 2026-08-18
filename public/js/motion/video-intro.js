window.FAWMotion = window.FAWMotion || {};

window.FAWMotion.initVideoIntro = function initVideoIntro() {
  var intro = document.getElementById('videoIntro');
  if (!intro) return;

  var video = document.getElementById('videoIntroMain');
  var enterBtn = document.getElementById('videoIntroEnter');
  var STORAGE_KEY = 'faw_video_intro_shown';
  var storage = window.sessionStorage;

  // The video plays its intro animation once (street scene -> paint-splash
  // transition), then holds a completely static red-logo-on-black frame from
  // ~7.0s to ~10.9s before a quick fade-to-black right at the very end. We
  // loop only the static hold (both ends look identical, so the loop is
  // invisible) and never let the fade-out play.
  var LOOP_START = 6.5;
  var LOOP_END = 10.8;

  // Intrinsic frame size and the point just below the drawn logo's mouth
  // (centered horizontally, ~85% down the frame) where the button should
  // sit. Computed the same way as object-fit: contain, so the button stays
  // lined up with the logo and clear of the artwork regardless of viewport
  // aspect ratio.
  var VIDEO_W = 3840;
  var VIDEO_H = 2160;
  var ANCHOR_X = 0.5;
  var ANCHOR_Y = 0.85;

  var buttonRevealed = false;

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
    video.addEventListener('timeupdate', function () {
      if (!buttonRevealed && video.currentTime >= LOOP_START) {
        buttonRevealed = true;
        if (enterBtn) {
          enterBtn.classList.add('is-visible');
          // Wait for the fade/slide-in transition to finish before layering
          // the continuous wobble on top, so they don't fight over transform.
          setTimeout(function () {
            enterBtn.classList.add('is-shaking');
          }, 520);
        }
      }
      if (video.currentTime >= LOOP_END) {
        video.currentTime = LOOP_START;
      }
    });
    // Safety net in case timeupdate granularity ever misses the LOOP_END
    // check and the video reaches its natural end (which briefly fades to
    // black) — jump back into the hold instead of showing that fade.
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
