/* Admin helpers: thousand-separator number inputs, colour palette, image previews */
(function () {
  'use strict';

  /* ---------- numbers: 350000 -> 350.000 ---------- */

  function fmt(value) {
    var digits = String(value).replace(/\D/g, '');
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function bindMoney(input) {
    if (input.__moneyBound) return;
    input.__moneyBound = true;
    input.value = fmt(input.value);
    input.addEventListener('input', function () {
      var caret = input.selectionStart || 0;
      var digitsBefore = input.value.slice(0, caret).replace(/\D/g, '').length;
      input.value = fmt(input.value);
      var seen = 0;
      var pos = 0;
      while (pos < input.value.length && seen < digitsBefore) {
        if (/\d/.test(input.value.charAt(pos))) seen += 1;
        pos += 1;
      }
      try { input.setSelectionRange(pos, pos); } catch (err) {}
    });
  }

  function initMoney(root) {
    (root || document).querySelectorAll('input[data-money]').forEach(bindMoney);
  }

  // send plain digits to the server (350.000 -> 350000)
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form || !form.elements) return;
    Array.prototype.forEach.call(form.elements, function (el) {
      if (el.hasAttribute && el.hasAttribute('data-money')) el.value = String(el.value).replace(/\D/g, '');
    });
  }, true);

  /* ---------- colour palette ---------- */

  var PALETTE = [
    ['Black', '#1C1C1C'], ['Charcoal', '#2B2B2B'], ['Dark grey', '#4A4A4A'], ['Light grey', '#E0E0E0'], ['Off white', '#F4F4EF'], ['Stone', '#8F8B86'],
    ['Slate', '#3B4A63'], ['Sand', '#CBB58C'], ['Cream', '#EFE3D3'], ['Blush', '#F6C4BD'], ['Yellow', '#ECD24A'], ['Orange', '#EE6A2A'],
    ['Red', '#A3151E'], ['Pink', '#F2BDD0'], ['Plum', '#5D4A78'], ['Violet', '#4A3A66'], ['Steel blue', '#3A5A7A'], ['Navy', '#27276E'],
    ['Deep blue', '#1D4A6E'], ['Moss', '#4A5A45'], ['Teal', '#2A7A62'], ['Mint', '#A9DCC0'], ['Tan', '#E0CDB5'], ['Brown', '#6B4423']
  ];

  function buildPicker(hex) {
    var wrap = document.createElement('div');
    wrap.className = 'cp';
    wrap.setAttribute('data-color-picker', '');
    var html = '<input type="hidden" value="' + hex + '" />' +
      '<button type="button" class="cp__toggle" aria-expanded="false" title="Chọn màu hiển thị"><span class="cp__current" style="--c:' + hex + '"></span></button>' +
      '<div class="cp__grid" hidden>';
    PALETTE.forEach(function (p) {
      html += '<button type="button" class="cp__sw" data-color="' + p[1] + '" title="' + p[0] + '" aria-label="' + p[0] + '" style="--c:' + p[1] + '"></button>';
    });
    html += '<label class="cp__custom" title="Màu khác" style="--c:' + hex + '"><input type="color" value="' + hex + '" /><span>+</span></label></div>';
    wrap.innerHTML = html;
    return wrap;
  }

  function setColor(picker, hex, name) {
    var hidden = picker.querySelector('input[type="hidden"]');
    if (hidden && hidden.value !== hex) { hidden.value = hex; hidden.dispatchEvent(new Event('input', { bubbles: true })); }
    var cur = picker.querySelector('.cp__current');
    if (cur) cur.style.setProperty('--c', hex);
    picker.querySelectorAll('.cp__sw').forEach(function (btn) {
      btn.classList.toggle('is-selected', btn.getAttribute('data-color').toLowerCase() === hex.toLowerCase());
    });
    var custom = picker.querySelector('.cp__custom');
    var isPreset = !!picker.querySelector('.cp__sw.is-selected');
    if (custom) {
      custom.classList.toggle('is-selected', !isPreset);
      if (!isPreset) custom.style.setProperty('--c', hex);
    }
    // fill the colour name if it is still empty
    if (name) {
      var row = picker.closest('[data-variant-row]');
      var nameInput = row && row.querySelector('input[name="color"]');
      if (nameInput && !nameInput.value.trim()) nameInput.value = name;
    }
  }

  function closePickers(except) {
    document.querySelectorAll('[data-color-picker]').forEach(function (p) {
      if (p === except) return;
      var g = p.querySelector('.cp__grid');
      var t = p.querySelector('.cp__toggle');
      if (g) g.hidden = true;
      if (t) { t.setAttribute('aria-expanded', 'false'); t.classList.remove('is-open'); }
    });
  }

  document.addEventListener('click', function (e) {
    var tg = e.target.closest && e.target.closest('.cp__toggle');
    if (tg) {
      var pk = tg.closest('[data-color-picker]');
      var grid = pk.querySelector('.cp__grid');
      closePickers(pk);
      grid.hidden = !grid.hidden;
      tg.setAttribute('aria-expanded', String(!grid.hidden));
      tg.classList.toggle('is-open', !grid.hidden);
      return;
    }
    if (!(e.target.closest && e.target.closest('.cp__grid'))) closePickers(null);
    var sw = e.target.closest && e.target.closest('.cp__sw');
    if (!sw) return;
    var picker = sw.closest('[data-color-picker]');
    if (picker) { setColor(picker, sw.getAttribute('data-color'), sw.getAttribute('title')); closePickers(null); }
  });

  document.addEventListener('input', function (e) {
    var el = e.target;
    if (el && el.matches && el.matches('.cp__custom input[type="color"]')) {
      var picker = el.closest('[data-color-picker]');
      if (picker) setColor(picker, el.value, '');
    }
  });

  /* ---------- image previews before upload ----------
     Every image file input in admin shows what was picked before saving:
     - data-preview="#box"  -> previews go into that box
     - no data-preview      -> a preview box is created right under the input
     - data-autosubmit      -> a confirm window with the preview opens first
     - data-media-preview   -> page has its own preview script, skipped here
     - data-max-mb="10"     -> size limit used for the warning (default 8) */

  var previewUrls = typeof WeakMap === 'function' ? new WeakMap() : null;

  function isImageInput(input) {
    var accept = (input.getAttribute('accept') || '').toLowerCase();
    return !accept || accept.indexOf('image') !== -1 || /\.(jpe?g|png|webp|gif)/.test(accept);
  }

  function fmtSize(bytes) {
    return bytes >= 1048576 ? (bytes / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1024)) + ' KB';
  }

  function maxMb(input) {
    var v = parseFloat(input.getAttribute('data-max-mb'));
    return v > 0 ? v : 8;
  }

  // renders thumbnails of the chosen files into target; returns true when every file is within the limit
  function renderPreview(input, target) {
    if (previewUrls && previewUrls.get(input)) previewUrls.get(input).forEach(function (u) { URL.revokeObjectURL(u); });
    var urls = [];
    if (previewUrls) previewUrls.set(input, urls);
    target.innerHTML = '';
    var files = Array.prototype.slice.call(input.files || []);
    target.hidden = files.length === 0;
    if (!files.length) return true;

    var limit = maxMb(input);
    var tooBig = files.filter(function (f) { return f.size > limit * 1048576; });

    var label = document.createElement('div');
    label.className = 'thumbs__label';
    label.textContent = 'Xem trước ' + (files.length > 1 ? files.length + ' ảnh' : 'ảnh') + ' sắp tải lên (chưa lưu)';
    target.appendChild(label);

    var grid = document.createElement('div');
    grid.className = 'thumbs__grid';
    files.forEach(function (file) {
      var url = URL.createObjectURL(file);
      urls.push(url);
      var item = document.createElement('div');
      item.className = 'thumb thumb--new' + (file.size > limit * 1048576 ? ' thumb--toobig' : '');
      var img = document.createElement('img');
      img.src = url;
      img.alt = '';
      img.addEventListener('load', function () {
        dims.textContent = img.naturalWidth + ' × ' + img.naturalHeight + ' · ' + fmtSize(file.size);
      });
      var cap = document.createElement('span');
      cap.className = 'thumb__name';
      cap.textContent = file.name;
      var dims = document.createElement('span');
      dims.className = 'thumb__meta';
      dims.textContent = fmtSize(file.size);
      item.appendChild(img);
      item.appendChild(cap);
      item.appendChild(dims);
      grid.appendChild(item);
    });
    target.appendChild(grid);

    if (tooBig.length) {
      var warn = document.createElement('p');
      warn.className = 'thumbs__warn';
      warn.textContent = (tooBig.length === 1 ? 'Ảnh "' + tooBig[0].name + '" (' + fmtSize(tooBig[0].size) + ')' : tooBig.length + ' ảnh') +
        ' vượt quá ' + limit + ' MB nên sẽ không tải lên được. Hãy nén hoặc giảm kích thước ảnh rồi chọn lại.';
      target.appendChild(warn);
    }
    return tooBig.length === 0;
  }

  function autoTarget(input) {
    if (input._previewBox) return input._previewBox;
    var box = document.createElement('div');
    box.className = 'thumbs thumbs--preview';
    box.hidden = true;
    var anchor = input.closest('label') && input.hidden ? input.closest('label') : input;
    anchor.parentNode.insertBefore(box, anchor.nextSibling);
    input._previewBox = box;
    return box;
  }

  // confirm window for inputs that upload as soon as a file is picked
  function confirmUpload(input) {
    var overlay = document.createElement('div');
    overlay.className = 'upload-confirm';
    overlay.innerHTML = '<div class="upload-confirm__box" role="dialog" aria-modal="true">' +
      '<h3 class="upload-confirm__title">Xem trước ảnh</h3><div class="upload-confirm__body"></div>' +
      '<div class="upload-confirm__actions"><button type="button" class="admin-btn admin-btn--outline" data-uc-cancel>Huỷ</button>' +
      '<button type="button" class="admin-btn" data-uc-ok>Tải lên</button></div></div>';
    document.body.appendChild(overlay);
    var ok = renderPreview(input, overlay.querySelector('.upload-confirm__body'));
    var okBtn = overlay.querySelector('[data-uc-ok]');
    if (!ok) okBtn.disabled = true;
    function close() {
      document.removeEventListener('keydown', onKey);
      overlay.remove();
    }
    function cancel() { input.value = ''; close(); }
    function onKey(e) { if (e.key === 'Escape') cancel(); }
    document.addEventListener('keydown', onKey);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) cancel(); });
    overlay.querySelector('[data-uc-cancel]').addEventListener('click', cancel);
    okBtn.addEventListener('click', function () {
      okBtn.disabled = true;
      okBtn.textContent = 'Đang tải lên...';
      input.form.submit();
    });
    okBtn.focus();
  }

  document.addEventListener('change', function (e) {
    var input = e.target;
    if (!input || !input.matches || !input.matches('input[type="file"]')) return;
    if (input.hasAttribute('data-media-preview') || !isImageInput(input) || input.closest('[data-mm]')) return;
    if (input.hasAttribute('data-autosubmit')) {
      if (input.files && input.files.length) confirmUpload(input);
      return;
    }
    var target = input.hasAttribute('data-preview') ? document.querySelector(input.getAttribute('data-preview')) : autoTarget(input);
    if (target) renderPreview(input, target);
  });


  /* ---------- colour x size stock matrix ---------- */

  function initMatrix() {
    var root = document.querySelector('[data-vm]');
    if (!root) return;
    var colorsEl = root.querySelector('[data-vm-colors]');
    var sizesEl = root.querySelector('[data-vm-sizes]');
    var gridEl = root.querySelector('[data-vm-grid]');
    var jsonEl = root.querySelector('[data-vm-json]');
    var sizeInput = root.querySelector('[data-vm-sizeinput]');

    var init = {};
    try { init = JSON.parse(root.getAttribute('data-initial') || '{}'); } catch (e) {}
    var state = { colors: (init.colors || []).slice(), sizes: (init.sizes || []).slice(), stock: [] };
    state.colors.forEach(function (c, ci) {
      state.stock[ci] = state.sizes.map(function (s, si) {
        var v = init.stock && init.stock[ci + '|' + si];
        return v == null ? 0 : v;
      });
    });

    function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

    function write(silent) {
      jsonEl.value = JSON.stringify({ colors: state.colors, sizes: state.sizes, stock: state.stock });
      if (!silent) jsonEl.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function renderColors() {
      colorsEl.innerHTML = '';
      if (!state.colors.length) {
        colorsEl.innerHTML = '<p class="admin-hint" style="margin:0 0 10px;">Chưa có màu. Sản phẩm không chia màu thì có thể bỏ qua bước này.</p>';
      }
      state.colors.forEach(function (c, ci) {
        var row = document.createElement('div');
        row.className = 'vm__color';
        row.setAttribute('data-ci', ci);
        var picker = buildPicker(c.hex || '#1C1C1C');
        row.appendChild(picker);
        var name = document.createElement('input');
        name.type = 'text';
        name.className = 'vm__cname';
        name.placeholder = 'Tên màu, VD: Titan Xanh';
        name.value = c.name;
        row.appendChild(name);
        var del = document.createElement('button');
        del.type = 'button';
        del.className = 'vm__x';
        del.title = 'Xoá màu này';
        del.textContent = '×';
        row.appendChild(del);
        colorsEl.appendChild(row);
        picker.querySelectorAll('.cp__sw').forEach(function (b) {
          b.classList.toggle('is-selected', b.getAttribute('data-color').toLowerCase() === String(c.hex).toLowerCase());
        });
      });
    }

    function renderSizes() {
      sizesEl.innerHTML = '';
      if (!state.sizes.length) sizesEl.innerHTML = '<p class="admin-hint" style="margin:0 0 10px;">Chưa có size nào.</p>';
      state.sizes.forEach(function (s, si) {
        var chip = document.createElement('span');
        chip.className = 'vm__chip';
        chip.innerHTML = esc(s) + ' <button type="button" data-si="' + si + '" title="Xoá size">×</button>';
        sizesEl.appendChild(chip);
      });
    }

    function renderGrid() {
      if (!state.sizes.length) {
        gridEl.innerHTML = '<p class="admin-hint" style="margin:0;">Thêm ít nhất một size để nhập tồn kho.</p>';
        return;
      }
      var rows = state.colors.length ? state.colors : [{ name: '(Không chia màu)', hex: null }];
      var html = '<table class="vm__grid"><thead><tr><th>Màu \\ Size</th>';
      state.sizes.forEach(function (s) { html += '<th>' + esc(s) + '</th>'; });
      html += '</tr></thead><tbody>';
      rows.forEach(function (c, ci) {
        html += '<tr><th><span class="vm__dot" style="background:' + (c.hex || 'transparent') + '"></span>' + esc(c.name || 'Màu ' + (ci + 1)) + '</th>';
        state.sizes.forEach(function (s, si) {
          var v = state.stock[ci] ? state.stock[ci][si] : 0;
          html += '<td><input type="text" inputmode="numeric" data-money data-ci="' + ci + '" data-si="' + si + '" value="' + (v || 0) + '" /></td>';
        });
        html += '</tr>';
      });
      html += '</tbody></table>';
      gridEl.innerHTML = html;
      initMoney(gridEl);
    }

    function ensureStockShape() {
      var n = state.colors.length || 1;
      while (state.stock.length < n) state.stock.push([]);
      state.stock.length = n;
      state.stock.forEach(function (row) {
        while (row.length < state.sizes.length) row.push(0);
        row.length = state.sizes.length;
      });
    }

    function renderAll() {
      ensureStockShape();
      renderColors();
      renderSizes();
      renderGrid();
      write(false);
    }

    function addSize(raw) {
      String(raw).split(/[,;\n]+/).forEach(function (part) {
        var v = part.trim();
        if (!v) return;
        var exists = state.sizes.some(function (x) { return x.toLowerCase() === v.toLowerCase(); });
        if (!exists) state.sizes.push(v);
      });
    }

    root.addEventListener('click', function (e) {
      var t = e.target;
      if (t.closest('[data-vm-addcolor]')) {
        state.colors.push({ name: '', hex: '#1C1C1C' });
        state.stock.push(state.sizes.map(function () { return 0; }));
        renderAll();
        var inputs = colorsEl.querySelectorAll('.vm__cname');
        if (inputs.length) inputs[inputs.length - 1].focus();
      } else if (t.closest('.vm__x')) {
        var ci = Number(t.closest('.vm__color').getAttribute('data-ci'));
        state.colors.splice(ci, 1);
        state.stock.splice(ci, 1);
        renderAll();
      } else if (t.closest('[data-vm-addsize]')) {
        addSize(sizeInput.value);
        sizeInput.value = '';
        renderAll();
      } else if (t.closest('[data-vm-quick]')) {
        addSize(t.closest('[data-vm-quick]').getAttribute('data-vm-quick'));
        renderAll();
      } else if (t.closest('.vm__chip button')) {
        var si = Number(t.closest('.vm__chip button').getAttribute('data-si'));
        state.sizes.splice(si, 1);
        state.stock.forEach(function (row) { row.splice(si, 1); });
        renderAll();
      }
    });

    sizeInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        addSize(sizeInput.value);
        sizeInput.value = '';
        renderAll();
      }
    });
    // Enter inside any field must not submit the whole form by accident
    root.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.preventDefault();
    });

    root.addEventListener('input', function (e) {
      var el = e.target;
      if (el === jsonEl) return;
      if (el.classList.contains('vm__cname')) {
        var ci = Number(el.closest('.vm__color').getAttribute('data-ci'));
        state.colors[ci].name = el.value;
        // keep the stock table labels in sync without losing focus
        renderGrid();
      } else if (el.closest('[data-color-picker]') && el.type === 'hidden') {
        var cj = Number(el.closest('.vm__color').getAttribute('data-ci'));
        state.colors[cj].hex = el.value;
        renderGrid();
      } else if (el.hasAttribute('data-money') && el.getAttribute('data-ci') != null) {
        var r = Number(el.getAttribute('data-ci'));
        var c = Number(el.getAttribute('data-si'));
        state.stock[r][c] = parseInt(String(el.value).replace(/\D/g, ''), 10) || 0;
      } else {
        return;
      }
      write(true);
    });

    ensureStockShape();
    renderColors();
    renderSizes();
    renderGrid();
    write(true);
  }

  // non-image auto-upload inputs still submit straight away (images get a confirm window above)
  document.addEventListener('change', function (e) {
    var el = e.target;
    if (el && el.matches && el.matches('input[type="file"][data-autosubmit]') && el.files.length && !isImageInput(el)) {
      el.form.submit();
    }
  });

  /* ---------- inventory page ---------- */

  function initInventory() {
    var form = document.querySelector('[data-inv]');
    if (!form) return;
    var LOW = 5;
    var search = document.querySelector('[data-inv-search]');
    var filters = document.querySelector('[data-inv-filters]');
    var none = document.querySelector('[data-inv-none]');
    var mode = 'all';

    function num(input) { return parseInt(String(input.value).replace(/\D/g, ''), 10) || 0; }

    function badge(row) {
      var n = num(row.querySelector('[data-inv-input]'));
      var b = row.querySelector('[data-inv-badge]');
      var state = n <= 0 ? 'out' : (n <= LOW ? 'low' : 'ok');
      row.setAttribute('data-state', state);
      b.className = 'inv-badge inv-badge--' + state;
      b.textContent = state === 'out' ? 'Hết hàng' : (state === 'low' ? 'Sắp hết' : 'Còn hàng');
    }

    function totals() {
      var sums = {};
      form.querySelectorAll('.inv-row').forEach(function (r) {
        var id = r.getAttribute('data-inv-of');
        sums[id] = (sums[id] || 0) + num(r.querySelector('[data-inv-input]'));
      });
      Object.keys(sums).forEach(function (id) {
        var el = form.querySelector('[data-inv-total="' + id + '"]');
        if (el) el.textContent = sums[id];
      });
    }

    function apply() {
      var q = (search.value || '').trim().toLowerCase();
      var visibleByGroup = {};
      var any = false;
      form.querySelectorAll('.inv-row').forEach(function (r) {
        var okText = !q || r.getAttribute('data-name').indexOf(q) !== -1;
        var st = r.getAttribute('data-state');
        var okMode = mode === 'all' || (mode === 'low' && st === 'low') || (mode === 'out' && st === 'out');
        var show = okText && okMode;
        r.hidden = !show;
        if (show) { visibleByGroup[r.getAttribute('data-inv-of')] = true; any = true; }
      });
      form.querySelectorAll('.inv-group').forEach(function (g) {
        var id = g.getAttribute('data-inv-group');
        g.hidden = !visibleByGroup[id] && (mode !== 'all' || !!q);
      });
      form.querySelectorAll('.inv-empty').forEach(function (e) {
        e.hidden = mode !== 'all' || !!q;
      });
      none.hidden = any || (mode === 'all' && !q);
    }

    form.querySelectorAll('.inv-row').forEach(badge);
    form.addEventListener('input', function (e) {
      if (!e.target.matches('[data-inv-input]')) return;
      badge(e.target.closest('.inv-row'));
      totals();
    });
    search.addEventListener('input', apply);
    filters.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-filter]');
      if (!btn) return;
      mode = btn.getAttribute('data-filter');
      filters.querySelectorAll('button').forEach(function (b) { b.classList.toggle('is-active', b === btn); });
      apply();
    });
    apply();
  }


  /* ---------- media manager: add / delete / reorder images, saved with the page's Save button ---------- */

  var MM_MAX_SIDE = 2400;
  var mmSavers = [];
  var mmKey = 0;

  function mmDirty(mm) {
    mm.dirty = true;
    document.dispatchEvent(new CustomEvent('faw:dirty'));
  }

  // shrink + convert to JPEG in the browser (server cannot read WebP/HEIC and big phone photos)
  function mmPrepare(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        try {
          var w = img.naturalWidth, h = img.naturalHeight;
          var k = Math.min(1, MM_MAX_SIDE / Math.max(w, h));
          var c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(w * k));
          c.height = Math.max(1, Math.round(h * k));
          var ctx = c.getContext('2d');
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(img, 0, 0, c.width, c.height);
          c.toBlob(function (blob) {
            URL.revokeObjectURL(url);
            if (!blob) return reject(new Error('Không xử lý được ảnh "' + file.name + '".'));
            var base = file.name.replace(/\.[^.]+$/, '') || 'anh';
            resolve(new File([blob], base + '.jpg', { type: 'image/jpeg' }));
          }, 'image/jpeg', 0.88);
        } catch (e) {
          URL.revokeObjectURL(url);
          reject(new Error('Không xử lý được ảnh "' + file.name + '".'));
        }
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('Không đọc được "' + file.name + '". Hãy dùng ảnh JPG/PNG/WebP (ảnh HEIC hãy xuất sang JPG).'));
      };
      img.src = url;
    });
  }

  function mmEl(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function initMediaManagers() {
    document.querySelectorAll('[data-mm]').forEach(function (root) {
      var kind = root.getAttribute('data-mm');
      var max = parseInt(root.getAttribute('data-max'), 10) || 20;
      var addUrl = root.getAttribute('data-add');
      var saveUrl = root.getAttribute('data-save');
      var products = [];
      try { products = JSON.parse(root.getAttribute('data-products') || '[]'); } catch (e) { products = []; }
      var initial = [];
      try { initial = JSON.parse(root.getAttribute('data-items') || '[]'); } catch (e) { initial = []; }

      var mm = { dirty: false, items: [], removed: [] };
      initial.forEach(function (it) {
        mm.items.push(Object.assign({ key: ++mmKey, file: null }, it));
      });

      var msg = mmEl('p', 'thumbs__warn');
      msg.hidden = true;
      var grid = mmEl('div', 'mm__grid');
      var addLabel = mmEl('label', 'mm__add');
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = true;
      input.hidden = true;
      addLabel.appendChild(input);
      addLabel.appendChild(mmEl('span', 'mm__plus', '+'));
      addLabel.appendChild(mmEl('span', null, 'Thêm ảnh'));
      root.innerHTML = '';
      root.appendChild(msg);
      root.appendChild(grid);

      function say(text) { msg.textContent = text || ''; msg.hidden = !text; }
      function updateCount() {
        var card = root.closest('.admin-card');
        var span = card && card.querySelector('[data-mm-count]');
        if (span) span.textContent = mm.items.length + ' ảnh';
      }

      var dragKey = null;

      function render() {
        grid.innerHTML = '';
        mm.items.forEach(function (it, i) {
          var card = mmEl('div', 'mm__item' + (it.file ? ' mm__item--new' : ''));
          card.draggable = true;
          card.setAttribute('data-key', it.key);
          var img = mmEl('img');
          img.src = it.url;
          img.alt = '';
          img.draggable = false;
          card.appendChild(img);
          card.appendChild(mmEl('span', 'thumb__badge', String(i + 1)));
          if (it.file) card.appendChild(mmEl('span', 'mm__new', 'Mới'));

          var del = mmEl('button', 'admin-btn admin-btn--danger mm__del', '×');
          del.type = 'button';
          del.title = 'Xoá ảnh';
          del.addEventListener('click', function () {
            mm.items.splice(mm.items.indexOf(it), 1);
            if (it.file) { if (it.url) URL.revokeObjectURL(it.url); } else mm.removed.push(it.id);
            mmDirty(mm);
            render();
          });
          card.appendChild(del);

          var bar = mmEl('div', 'mm__move');
          [['‹', -1, 'Dịch lên trước'], ['›', 1, 'Dịch ra sau']].forEach(function (b) {
            var btn = mmEl('button', 'mm__arrow', b[0]);
            btn.type = 'button';
            btn.title = b[2];
            btn.disabled = (b[1] < 0 && i === 0) || (b[1] > 0 && i === mm.items.length - 1);
            btn.addEventListener('click', function () {
              var j = i + b[1];
              var t = mm.items[i]; mm.items[i] = mm.items[j]; mm.items[j] = t;
              mmDirty(mm);
              render();
            });
            bar.appendChild(btn);
          });
          card.appendChild(bar);

          if (kind === 'library') {
            var f = mmEl('div', 'mm__fields');
            function field(ph, prop) {
              var inp = document.createElement('input');
              inp.type = 'text';
              inp.placeholder = ph;
              inp.maxLength = 200;
              inp.value = it[prop] || '';
              inp.addEventListener('input', function () { it[prop] = inp.value; mmDirty(mm); });
              f.appendChild(inp);
            }
            field('Chú thích (VI)', 'captionVi');
            field('Chú thích (EN)', 'captionEn');
            var sel = document.createElement('select');
            var o0 = document.createElement('option');
            o0.value = ''; o0.textContent = '— Không gắn sản phẩm —';
            sel.appendChild(o0);
            products.forEach(function (p) {
              var o = document.createElement('option');
              o.value = p.id; o.textContent = p.name;
              if (String(it.productId || '') === String(p.id)) o.selected = true;
              sel.appendChild(o);
            });
            sel.addEventListener('change', function () { it.productId = sel.value; mmDirty(mm); });
            f.appendChild(sel);
            var lab = mmEl('label', 'mm__check');
            var cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = it.active !== false;
            cb.addEventListener('change', function () { it.active = cb.checked; mmDirty(mm); });
            lab.appendChild(cb);
            lab.appendChild(document.createTextNode(' Hiển thị'));
            f.appendChild(lab);
            card.appendChild(f);
          }

          card.addEventListener('dragstart', function (e) {
            dragKey = it.key;
            card.classList.add('is-drag');
            try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(it.key)); } catch (x) { /* ignore */ }
          });
          card.addEventListener('dragend', function () {
            card.classList.remove('is-drag');
            dragKey = null;
          });
          card.addEventListener('dragover', function (e) {
            if (dragKey == null || dragKey === it.key) return;
            e.preventDefault();
            var from = mm.items.findIndex(function (x) { return x.key === dragKey; });
            var to = mm.items.indexOf(it);
            if (from < 0 || to < 0) return;
            var r = card.getBoundingClientRect();
            var after = e.clientX > r.left + r.width / 2;
            var moved = mm.items.splice(from, 1)[0];
            to = mm.items.indexOf(it);
            mm.items.splice(after ? to + 1 : to, 0, moved);
            mmDirty(mm);
            render();
          });
          card.addEventListener('drop', function (e) { e.preventDefault(); });
          grid.appendChild(card);
        });
        if (mm.items.length < max) grid.appendChild(addLabel);
        updateCount();
      }

      input.addEventListener('change', async function () {
        var files = Array.prototype.slice.call(input.files || []);
        input.value = '';
        say('');
        var errors = [];
        for (var i = 0; i < files.length; i++) {
          if (mm.items.length >= max) { errors.push('Tối đa ' + max + ' ảnh, các ảnh dư đã được bỏ qua.'); break; }
          try {
            var prepared = await mmPrepare(files[i]);
            mm.items.push({ key: ++mmKey, file: prepared, url: URL.createObjectURL(prepared), id: null });
          } catch (err) {
            errors.push(err.message);
          }
        }
        if (errors.length) say(errors.join(' '));
        mmDirty(mm);
        render();
      });

      async function post(url, body, isForm) {
        var res = await fetch(url, {
          method: 'POST',
          credentials: 'same-origin',
          headers: Object.assign({ 'X-Requested-With': 'fetch', Accept: 'application/json' }, isForm ? {} : { 'Content-Type': 'application/json' }),
          body: isForm ? body : JSON.stringify(body)
        });
        var data = null;
        try { data = await res.json(); } catch (e) { /* not json */ }
        if (!res.ok || !data || data.ok === false) {
          throw new Error((data && data.error) || ('Máy chủ trả lỗi ' + res.status));
        }
        return data;
      }

      mm.save = async function (progress) {
        var fresh = mm.items.filter(function (x) { return x.file; });
        for (var i = 0; i < fresh.length; i++) {
          progress('Đang tải ảnh ' + (i + 1) + '/' + fresh.length + '…');
          var fd = new FormData();
          fd.append('image', fresh[i].file, fresh[i].file.name);
          var data = await post(addUrl, fd, true);
          fresh[i].id = data.id;
          fresh[i].file = null;
        }
        if (kind === 'library') {
          await post(saveUrl, {
            items: mm.items.map(function (x) {
              return { id: x.id, captionVi: x.captionVi || '', captionEn: x.captionEn || '', productId: x.productId || '', active: x.active !== false };
            }),
            remove: mm.removed
          });
        } else {
          await post(saveUrl, { order: mm.items.map(function (x) { return x.id; }), remove: mm.removed });
        }
        mm.dirty = false;
      };

      mmSavers.push(mm);
      render();
    });
  }

  /* ---------- save-all + unsaved warning ---------- */

  function initSaveAll() {
    var main = document.querySelector('[data-saveall]');
    if (!main) return;
    var bar = main.querySelector('[data-savebar]');
    var msg = main.querySelector('[data-savebar-msg]');
    var btn = main.querySelector('[data-saveall-btn]');
    var dirty = new Set();
    var saving = false;

    function render() {
      var any = dirty.size > 0 || mmSavers.some(function (m) { return m.dirty; });
      bar.classList.toggle('is-dirty', any);
      msg.textContent = any ? 'Có thay đổi chưa lưu' : 'Chưa có thay đổi';
    }
    function mark(e) {
      var f = e.target && e.target.form;
      if (!f || !main.contains(f)) return;
      if (/\/xoa$/.test(f.getAttribute('action') || '')) return;
      dirty.add(f);
      render();
    }
    document.addEventListener('faw:dirty', render);
    main.addEventListener('input', mark);
    main.addEventListener('change', mark);

    // a single section saved on its own: no warning
    main.addEventListener('submit', function (e) {
      if (!saving) { dirty.delete(e.target); window.__skipUnload = true; }
    });

    window.addEventListener('beforeunload', function (e) {
      if ((dirty.size || mmSavers.some(function (m) { return m.dirty; })) && !saving && !window.__skipUnload) {
        e.preventDefault();
        e.returnValue = '';
      }
    });

    btn.addEventListener('click', async function () {
      var forms = Array.from(dirty).filter(function (f) {
        // the "add variant" box is ignored while its size is empty
        var size = f.querySelector('input[name="size"]');
        if (f.classList.contains('variant--new') && size && !size.value.trim()) return false;
        var file = f.querySelector('input[type="file"]');
        if (file && f.classList.contains('upload-box') && !file.files.length) return false;
        return true;
      });
      var dirtyMm = mmSavers.filter(function (m) { return m.dirty; });
      if (!forms.length && !dirtyMm.length) { msg.textContent = 'Không có gì để lưu'; return; }
      for (var i = 0; i < forms.length; i++) {
        if (!forms[i].checkValidity()) { forms[i].reportValidity(); return; }
      }
      saving = true;
      btn.disabled = true;
      btn.textContent = 'Đang lưu…';
      try {
        for (var j = 0; j < forms.length; j++) {
          var f = forms[j];
          // strip thousand separators like a normal submit does
          var fd = new FormData(f);
          Array.prototype.forEach.call(f.elements, function (el) {
            if (el.hasAttribute && el.hasAttribute('data-money') && el.name) fd.set(el.name, String(el.value).replace(/\D/g, ''));
          });
          var cov = f.querySelector('input[type="file"][name="coverImage"]');
          if (cov && cov.files && cov.files[0]) fd.set('coverImage', await mmPrepare(cov.files[0]));
          var body = fd;
          var headers = {};
          if (f.enctype !== 'multipart/form-data') {
            body = new URLSearchParams(fd);
          }
          var res = await fetch(f.action, { method: 'POST', body: body, headers: headers, credentials: 'same-origin' });
          if (!res.ok) throw new Error('HTTP ' + res.status);
        }
        for (var q = 0; q < dirtyMm.length; q++) {
          await dirtyMm[q].save(function (t) { btn.textContent = t; });
        }
        dirty.clear();
        window.__skipUnload = true;
        try { sessionStorage.setItem('faw-scroll', String(window.scrollY)); } catch (e2) { /* ignore */ }
        location.reload();
      } catch (err) {
        saving = false;
        btn.disabled = false;
        btn.textContent = 'Lưu toàn bộ trang';
        msg.textContent = 'Lưu lỗi: ' + (err && err.message ? err.message : 'thử lại') ;
      }
    });
    render();
  }

  function init() {
    initMatrix();
    initInventory();
    initMediaManagers();
    initSaveAll();
    try {
      var y = sessionStorage.getItem('faw-scroll');
      if (y !== null) { sessionStorage.removeItem('faw-scroll'); window.scrollTo(0, parseInt(y, 10) || 0); }
    } catch (e3) { /* ignore */ }
    initMoney(document);
    // highlight the current admin menu item
    var path = location.pathname.replace(/\/+$/, '') || '/';
    var best = null;
    document.querySelectorAll('.admin-sidebar nav a').forEach(function (a) {
      var h = a.getAttribute('href').replace(/\/+$/, '');
      var hit = h === '/admin' ? path === '/admin' : (path === h || path.indexOf(h + '/') === 0);
      if (hit && (!best || h.length > best.h.length)) best = { a: a, h: h };
      a.classList.remove('is-active');
    });
    if (best) best.a.classList.add('is-active');
    document.querySelectorAll('[data-color-picker]').forEach(function (picker) {
      var hidden = picker.querySelector('input[type="hidden"]');
      if (hidden) setColor(picker, hidden.value || '#111111', '');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
