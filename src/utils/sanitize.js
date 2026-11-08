// Small allow-list HTML sanitizer for admin-written page content (no extra packages).
const ALLOWED = new Set(['p', 'br', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'u', 's',
  'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'blockquote', 'span', 'div', 'img']);
const ATTRS = {
  a: ['href', 'target', 'rel', 'class'],
  img: ['src', 'alt', 'class', 'style'],
  '*': ['class', 'style', 'colspan', 'rowspan']
};

function safeUrl(v) {
  const x = String(v || '').trim();
  if (/^(https?:|mailto:|tel:|\/|#)/i.test(x)) return x;
  return '';
}

function cleanStyle(v) {
  // keep simple presentational declarations only
  return String(v || '').split(';').map((d) => d.trim()).filter((d) => {
    if (!d) return false;
    if (/url\s*\(|expression|javascript|@import|position\s*:\s*(fixed|absolute)/i.test(d)) return false;
    return /^(margin|padding|text-align|font-weight|font-style|font-size|color|width|max-width|text-decoration)[a-z-]*\s*:/i.test(d);
  }).join('; ');
}

function sanitizeHtml(input) {
  let html = String(input || '');
  html = html.replace(/<!--[\s\S]*?-->/g, '');
  html = html.replace(/<(script|style|iframe|object|embed|form|link|meta|svg|math)\b[\s\S]*?<\/\1\s*>/gi, '');
  return html.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (full, tag, rest) => {
    const name = tag.toLowerCase();
    const closing = full.charAt(1) === '/';
    if (!ALLOWED.has(name)) return '';
    if (closing) return '</' + name + '>';
    const allowed = (ATTRS[name] || []).concat(ATTRS['*']);
    let out = '';
    const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
    let m;
    while ((m = re.exec(rest))) {
      const attr = m[1].toLowerCase();
      const val = m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : m[5];
      if (allowed.indexOf(attr) === -1) continue;
      if (attr === 'href' || attr === 'src') {
        const u = safeUrl(val);
        if (!u) continue;
        out += ' ' + attr + '="' + u.replace(/"/g, '&quot;') + '"';
      } else if (attr === 'style') {
        const st = cleanStyle(val);
        if (st) out += ' style="' + st.replace(/"/g, '&quot;') + '"';
      } else {
        out += ' ' + attr + '="' + String(val).replace(/"/g, '&quot;') + '"';
      }
    }
    if (name === 'a' && /target="_blank"/.test(out) && !/rel=/.test(out)) out += ' rel="noopener"';
    return '<' + name + out + (/\/\s*>$/.test(full) && name === 'br' ? ' /' : '') + '>';
  });
}

module.exports = { sanitizeHtml };
