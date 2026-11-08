const fs = require('fs');
const storage = require('../utils/storage');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');
const DEFAULT_REVEAL = 3.5;

// Resolves the intro video settings into what the storefront needs.
// Each device has a "webm" slot (transparent video for Chrome/Android/Firefox/Edge)
// and an "mp4" slot (mp4 / m4v / mov - used by Safari & iPhone and as fallback).
// Anything not uploaded falls back: mobile -> desktop -> the built-in WEB_INTRO files.
function urlWithVersion(url) {
  if (!url) return '';
  try {
    const st = fs.statSync(storage.locate(url) || '');
    return url + '?v=' + Math.floor(st.mtimeMs);
  } catch (err) {
    return '';
  }
}

function pickSlot(s, device, kind) {
  return urlWithVersion(s['intro_' + device + '_' + kind]);
}

function buildConfig(s) {
  const dWebm = pickSlot(s, 'desktop', 'webm') || '/video/WEB_INTRO.webm';
  const dMp4 = pickSlot(s, 'desktop', 'mp4') || '/video/WEB_INTRO.mp4';
  const mWebm = pickSlot(s, 'mobile', 'webm');
  const mMp4 = pickSlot(s, 'mobile', 'mp4');
  const hasMobile = !!(mWebm || mMp4);
  const num = (v) => {
    const n = parseFloat(v);
    return isFinite(n) && n >= 0 ? n : DEFAULT_REVEAL;
  };
  return {
    enabled: s.intro_enabled !== '0',
    desktop: { webm: dWebm, mp4: dMp4, reveal: num(s.intro_desktop_reveal) },
    mobile: hasMobile
      ? { webm: mWebm, mp4: mMp4, reveal: num(s.intro_mobile_reveal) }
      : { webm: dWebm, mp4: dMp4, reveal: num(s.intro_desktop_reveal) }
  };
}

function removeFile(url) {
  if (!url || url.indexOf('/video/uploads/') !== 0) return;
  storage.remove(url);
}

module.exports = { buildConfig, removeFile, PUBLIC_DIR, DEFAULT_REVEAL };
