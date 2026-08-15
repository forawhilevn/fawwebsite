window.FAWMotion = window.FAWMotion || {};

window.FAWMotion.initVideoIntro = function initVideoIntro() {
  var intro = document.getElementById('videoIntro');
  if (!intro) return;

  var video1 = document.getElementById('videoIntroOne');
  var video2 = document.getElementById('videoIntroTwo');
  var enterBtn = document.getElementById('videoIntroEnter');
  var STORAGE_KEY = 'faw_video_intro_shown';

  function dismiss() {
    intro.classList.add('is-hidden');
    setTimeout(function () {
      intro.style.display = 'none';
      if (video1) video1.pause();
      if (video2) video2.pause();
    }, 650);
  }

  if (sessionStorage.getItem(STORAGE_KEY)) {
    intro.style.display = 'none';
    return;
  }

  if (video1) {
    video1.play().catch(function () {
      /* Autoplay was blocked; the enter button still lets the visitor continue. */
    });
  }

  if (enterBtn) {
    enterBtn.addEventListener('click', function () {
      sessionStorage.setItem(STORAGE_KEY, '1');
      intro.classList.add('is-transitioning');

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
