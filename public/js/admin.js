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

  /* ---------- image previews before upload ---------- */

  var previewUrls = {};

  document.addEventListener('change', function (e) {
    var input = e.target;
    if (!input || !input.matches || !input.matches('input[type="file"][data-preview]')) return;
    var target = document.querySelector(input.getAttribute('data-preview'));
    if (!target) return;
    (previewUrls[input.name] || []).forEach(function (u) { URL.revokeObjectURL(u); });
    previewUrls[input.name] = [];
    target.innerHTML = '';
    var files = Array.prototype.slice.call(input.files || []);
    target.hidden = files.length === 0;
    if (!files.length) return;

    var label = document.createElement('div');
    label.className = 'thumbs__label';
    label.textContent = 'Xem trước ' + files.length + ' ảnh sắp tải lên';
    target.appendChild(label);

    var grid = document.createElement('div');
    grid.className = 'thumbs__grid';
    files.forEach(function (file) {
      var url = URL.createObjectURL(file);
      previewUrls[input.name].push(url);
      var item = document.createElement('div');
      item.className = 'thumb thumb--new';
      var img = document.createElement('img');
      img.src = url;
      img.alt = '';
      var cap = document.createElement('span');
      cap.className = 'thumb__name';
      cap.textContent = file.name;
      item.appendChild(img);
      item.appendChild(cap);
      grid.appendChild(item);
    });
    target.appendChild(grid);
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

  document.addEventListener('change', function (e) {
    var el = e.target;
    if (el && el.matches && el.matches('input[type="file"][data-autosubmit]') && el.files.length) {
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
      bar.classList.toggle('is-dirty', dirty.size > 0);
      msg.textContent = dirty.size ? 'Có thay đổi chưa lưu' : 'Chưa có thay đổi';
    }
    function mark(e) {
      var f = e.target && e.target.form;
      if (!f || !main.contains(f)) return;
      if (/\/xoa$/.test(f.getAttribute('action') || '')) return;
      dirty.add(f);
      render();
    }
    main.addEventListener('input', mark);
    main.addEventListener('change', mark);

    // a single section saved on its own: no warning
    main.addEventListener('submit', function (e) {
      if (!saving) { dirty.delete(e.target); window.__skipUnload = true; }
    });

    window.addEventListener('beforeunload', function (e) {
      if (dirty.size && !saving && !window.__skipUnload) {
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
      if (!forms.length) { msg.textContent = 'Không có gì để lưu'; return; }
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
          var body = fd;
          var headers = {};
          if (f.enctype !== 'multipart/form-data') {
            body = new URLSearchParams(fd);
          }
          var res = await fetch(f.action, { method: 'POST', body: body, headers: headers, credentials: 'same-origin' });
          if (!res.ok) throw new Error('HTTP ' + res.status);
        }
        dirty.clear();
        window.__skipUnload = true;
        location.reload();
      } catch (err) {
        saving = false;
        btn.disabled = false;
        btn.textContent = 'Lưu toàn bộ trang';
        msg.textContent = 'Lưu lỗi, thử lại hoặc lưu từng mục';
      }
    });
    render();
  }

  function init() {
    initMatrix();
    initInventory();
    initSaveAll();
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
