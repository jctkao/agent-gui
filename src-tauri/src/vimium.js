(function () {
  if (window.__vimiumInstalled) return;
  window.__vimiumInstalled = true;

  // ─── Constants ──────────────────────────────────────────────────────────────
  var HINT_CHARS = 'sadfjklewcmpgh';
  var SCROLL_STEP = 80;

  // ─── Mode ───────────────────────────────────────────────────────────────────
  // 'normal' | 'hint' | 'insert'
  var mode = 'normal';

  function isEditable(el) {
    if (!el) return false;
    var tag = el.tagName && el.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
  }

  document.addEventListener('focusin', function (e) {
    if (isEditable(e.target)) mode = 'insert';
  }, true);

  document.addEventListener('focusout', function (e) {
    if (isEditable(e.target)) mode = 'normal';
  }, true);

  // ─── Scrollable ancestor lookup ─────────────────────────────────────────────
  function isScrollable(el) {
    if (!el || el === document.documentElement) return false;
    var style = getComputedStyle(el);
    if (!/(auto|scroll)/.test(style.overflow + style.overflowY)) return false;
    return el.scrollHeight > el.clientHeight + 1;
  }

  function findScrollable() {
    var el;
    // 1. Walk up active element
    el = document.activeElement;
    while (el && el !== document.documentElement) {
      if (isScrollable(el)) return el;
      el = el.parentElement;
    }
    // 2. Walk up viewport centre
    el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    while (el && el !== document.documentElement) {
      if (isScrollable(el)) return el;
      el = el.parentElement;
    }
    // 3. Root fallback
    return document.scrollingElement || document.documentElement;
  }

  function doScrollBy(dx, dy) {
    findScrollable().scrollBy({ left: dx, top: dy, behavior: 'smooth' });
  }

  function doScrollTo(x, y) {
    (document.scrollingElement || document.documentElement).scrollTo({ left: x, top: y, behavior: 'smooth' });
  }

  // ─── Actions ────────────────────────────────────────────────────────────────
  var ACTIONS = {
    scroll_down:      function () { doScrollBy(0,  SCROLL_STEP); },
    scroll_up:        function () { doScrollBy(0, -SCROLL_STEP); },
    scroll_half_down: function () { doScrollBy(0,  window.innerHeight / 2); },
    scroll_half_up:   function () { doScrollBy(0, -window.innerHeight / 2); },
    scroll_to_top:    function () { doScrollTo(0, 0); },
    scroll_to_bottom: function () { doScrollTo(0, document.documentElement.scrollHeight); },
    history_back:     function () { history.back(); },
    history_forward:  function () { history.forward(); },
    reload:           function () { location.reload(); },
    hint_mode:        function () { enterHintMode(); },
  };

  // ─── Key → action lookup (built from window.__bindings at install time) ─────
  // Inverted map: key_string → action function
  var KEY_MAP = (function () {
    var map = {};
    var bindings = window.__bindings || {};
    for (var id in bindings) {
      if (ACTIONS[id]) map[bindings[id]] = ACTIONS[id];
    }
    return map;
  }());

  // Inverted map: key_string → app action id (forwarded to main webview via IPC)
  var APP_KEY_MAP = (function () {
    var map = {};
    var bindings = window.__app_bindings || {};
    for (var id in bindings) {
      map[bindings[id]] = id;
    }
    return map;
  }());

  // ─── Generic sequence handler ────────────────────────────────────────────────
  var pendingSeq = '';
  var seqTimer = null;

  function clearSeq() {
    pendingSeq = '';
    if (seqTimer) { clearTimeout(seqTimer); seqTimer = null; }
  }

  function hasPrefix(seq) {
    for (var k in KEY_MAP) {
      if (k !== seq && k.startsWith(seq)) return true;
    }
    return false;
  }

  function commitSeq(seq) {
    clearSeq();
    if (KEY_MAP[seq]) KEY_MAP[seq]();
  }

  // ─── Hint mode ────────────────────────────────────────────────────────────
  var hintState = null; // { container, items: [{label, el, div}], typed }

  function generateLabels(count) {
    var n = HINT_CHARS.length;
    var labels = [];
    var i, j;
    if (count <= n) {
      for (i = 0; i < count; i++) labels.push(HINT_CHARS[i]);
      return labels;
    }
    // Reserve the first `expand` chars as two-char prefixes so the label set
    // is prefix-free: no single-char label is a prefix of a two-char label.
    var expand = Math.ceil((count - n) / (n - 1));
    if (expand > n) expand = n;
    for (i = expand; i < n && labels.length < count; i++) {
      labels.push(HINT_CHARS[i]);
    }
    for (i = 0; i < expand && labels.length < count; i++) {
      for (j = 0; j < n && labels.length < count; j++) {
        labels.push(HINT_CHARS[i] + HINT_CHARS[j]);
      }
    }
    return labels;
  }

  function getClickables() {
    var sel = 'a[href], button:not([disabled]), [role="button"], [role="link"], ' +
              'input:not([type="hidden"]):not([disabled]), select:not([disabled]), ' +
              'textarea:not([disabled]), [onclick]';
    return Array.prototype.slice.call(document.querySelectorAll(sel)).filter(function (el) {
      var r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 &&
             r.bottom > 0 && r.top < window.innerHeight &&
             r.right > 0 && r.left < window.innerWidth;
    });
  }

  function enterHintMode() {
    var els = getClickables();
    if (els.length === 0) return;

    var labels = generateLabels(els.length);
    var container = document.createElement('div');
    container.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;' +
                               'z-index:2147483647;pointer-events:none;';

    var items = els.map(function (el, i) {
      var label = labels[i] || '';
      var r = el.getBoundingClientRect();
      var div = document.createElement('div');
      div.style.cssText =
        'position:fixed;' +
        'left:' + Math.max(0, Math.round(r.left)) + 'px;' +
        'top:' + Math.max(0, Math.round(r.top)) + 'px;' +
        'background:#e7d62c;color:#000;' +
        'font:bold 11px/14px "Courier New",monospace;' +
        'padding:1px 3px;border:1px solid #c3a900;border-radius:2px;' +
        'box-shadow:0 1px 3px rgba(0,0,0,.3);' +
        'white-space:nowrap;user-select:none;line-height:14px;';
      div.textContent = label.toUpperCase();
      container.appendChild(div);
      return { label: label, el: el, div: div };
    });

    // Attach to <html> to avoid body overflow:hidden clipping
    document.documentElement.appendChild(container);
    hintState = { container: container, items: items, typed: '' };
    mode = 'hint';
  }

  function updateHints() {
    var typed = hintState.typed;
    var matchCount = 0;
    var lastMatch = null;

    hintState.items.forEach(function (item) {
      if (item.label.startsWith(typed)) {
        item.div.style.display = '';
        if (typed.length > 0) {
          // Dim already-typed prefix; bold remainder
          item.div.innerHTML =
            '<span style="color:#888;font-weight:bold">' + typed.toUpperCase() + '</span>' +
            item.label.slice(typed.length).toUpperCase();
        } else {
          item.div.textContent = item.label.toUpperCase();
        }
        matchCount++;
        lastMatch = item;
      } else {
        item.div.style.display = 'none';
      }
    });

    if (matchCount === 1 && typed.length > 0) {
      var target = lastMatch;
      exitHintMode();
      activateElement(target.el);
    } else if (matchCount === 0) {
      exitHintMode();
    }
  }

  function activateElement(el) {
    el.focus();
    ['mousedown', 'mouseup', 'click'].forEach(function (type) {
      el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
    });
  }

  function exitHintMode() {
    if (hintState) {
      hintState.container.remove();
      hintState = null;
    }
    mode = 'normal';
  }

  // Exit hint mode if the page scrolls (hints would be misaligned)
  document.addEventListener('scroll', function () {
    if (mode === 'hint') exitHintMode();
  }, { capture: true, passive: true });

  // ─── Main key handler ─────────────────────────────────────────────────────
  document.addEventListener('keydown', function (e) {
    // Insert mode: only handle Escape
    if (mode === 'insert') {
      if (e.key === 'Escape') {
        if (document.activeElement) document.activeElement.blur();
        mode = 'normal';
        e.preventDefault();
      }
      return;
    }

    // Hint mode
    if (mode === 'hint') {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') { exitHintMode(); return; }
      if (e.key === 'Backspace') {
        hintState.typed = hintState.typed.slice(0, -1);
        hintState.items.forEach(function (item) { item.div.style.display = ''; });
        updateHints();
        return;
      }
      if (/^[a-zA-Z]$/.test(e.key)) {
        hintState.typed += e.key.toLowerCase();
        updateHints();
      }
      return;
    }

    // Normal mode — modifier combos are passed through except when they form a binding
    var key = e.ctrlKey  ? 'Ctrl+'  + e.key
             : e.altKey  ? 'Alt+'   + e.key
             : e.metaKey ? 'Meta+'  + e.key
             : e.key;

    // App-level shortcuts take priority: forward to main webview and stop.
    if (APP_KEY_MAP[key] && window.__TAURI__ && window.__TAURI__.event) {
      e.preventDefault();
      window.__TAURI__.event.emit('app-action', APP_KEY_MAP[key]);
      return;
    }

    var newSeq = pendingSeq + key;

    if (KEY_MAP[newSeq]) {
      e.preventDefault();
      commitSeq(newSeq);
      return;
    }

    if (hasPrefix(newSeq)) {
      e.preventDefault();
      pendingSeq = newSeq;
      if (seqTimer) clearTimeout(seqTimer);
      seqTimer = setTimeout(function () {
        // Timeout: if exact match exists execute it, otherwise discard
        if (KEY_MAP[pendingSeq]) commitSeq(pendingSeq);
        else clearSeq();
      }, 1000);
      return;
    }

    // No match on extended sequence — reset and try with just this key
    clearSeq();
    if (KEY_MAP[key]) {
      e.preventDefault();
      KEY_MAP[key]();
      return;
    }
    if (hasPrefix(key)) {
      e.preventDefault();
      pendingSeq = key;
      seqTimer = setTimeout(function () {
        if (KEY_MAP[pendingSeq]) commitSeq(pendingSeq);
        else clearSeq();
      }, 1000);
    }
  }, true);

}());
