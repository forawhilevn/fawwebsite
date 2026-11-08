// Where files uploaded from the admin are stored.
// Hostinger builds every deploy into a brand-new app folder, so anything saved inside the
// app's own public/ folder disappears on the next deploy. In production, uploads therefore
// live in a folder outside the app (default: ~/faw-storage, or UPLOAD_ROOT if set) that
// mirrors the public/ layout (images/uploads/..., video/uploads/..., images/lookbook/...).
// Locally nothing changes: uploads stay in public/.
const fs = require('fs');
const os = require('os');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');

function pickStorageDir() {
  if (process.env.UPLOAD_ROOT) return path.resolve(process.env.UPLOAD_ROOT);
  if (process.env.NODE_ENV === 'production') return path.join(os.homedir(), 'faw-storage');
  return PUBLIC_DIR;
}

let STORAGE_DIR = pickStorageDir();
try {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
} catch (err) {
  console.error('Khong tao duoc thu muc luu file ' + STORAGE_DIR + ', dung public/:', err.message);
  STORAGE_DIR = PUBLIC_DIR;
}
const SEPARATE = path.resolve(STORAGE_DIR) !== path.resolve(PUBLIC_DIR);

// absolute path in storage for a public URL path like /images/uploads/x.jpg
function storagePath(url) {
  return path.join(STORAGE_DIR, String(url || '').split('?')[0].replace(/^\/+/, ''));
}

// existing file for a public URL path: storage first, then the app's own public/ folder
function locate(url) {
  const clean = String(url || '').split('?')[0].replace(/^\/+/, '');
  const candidates = [path.join(STORAGE_DIR, clean), path.join(PUBLIC_DIR, clean)];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

// deletes a file from storage (and from public/ when it was saved there before the switch)
function remove(url) {
  const clean = String(url || '').split('?')[0].replace(/^\/+/, '');
  if (!clean || clean.indexOf('..') !== -1) return;
  [STORAGE_DIR, PUBLIC_DIR].forEach((dir) => {
    try { fs.unlinkSync(path.join(dir, clean)); } catch (err) { /* not there */ }
  });
}

function copyMissing(src, dest) {
  if (!fs.existsSync(src)) return 0;
  let count = 0;
  fs.readdirSync(src, { withFileTypes: true }).forEach((entry) => {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) count += copyMissing(from, to);
    else if (!fs.existsSync(to)) {
      fs.mkdirSync(dest, { recursive: true });
      fs.copyFileSync(from, to);
      count += 1;
    }
  });
  return count;
}

// first start after the switch: move over uploads still sitting in the app's public/ folder
function adoptPublicUploads() {
  if (!SEPARATE) return 0;
  return ['images/uploads', 'video/uploads'].reduce((n, sub) => n + copyMissing(path.join(PUBLIC_DIR, sub), path.join(STORAGE_DIR, sub)), 0);
}

module.exports = { PUBLIC_DIR, STORAGE_DIR, SEPARATE, storagePath, locate, remove, copyMissing, adoptPublicUploads };
