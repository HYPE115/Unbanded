/**
 * ui-autocomplete.js - Suggestions de commandes slash facon Discord.
 * Quand on tape "/" + debut de commande dans un champ BAND, un popup
 * liste les commandes correspondantes. Navigation : haut/bas, Tab ou
 * Entree pour completer, Echap pour fermer, clic pour choisir.
 */
BandUI.prototype._hookCommandAutocomplete = function () {
  if (this._acHooked) return;
  this._acHooked = true;
  const self = this;
  const doc = typeof document !== 'undefined' ? document : null;
  if (!doc || !doc.addEventListener) return;

  function getBox() {
    let box = document.getElementById('bt-ac-box');
    if (box && document.body.contains(box)) return box;
    box = document.createElement('div');
    box.id = 'bt-ac-box';
    box.setAttribute('data-bt-root', '1');
    box.style.cssText = 'display:none;position:fixed;z-index:2147483646;min-width:240px;max-width:340px;' +
      'max-height:240px;overflow-y:auto;background:var(--btt-surface,#1c2630);color:var(--btt-text,#fff);' +
      'border:1px solid var(--btt-border,#3d4f60);border-radius:10px;box-shadow:0 10px 28px rgba(0,0,0,.5);' +
      'font-family:sans-serif;font-size:13px;padding:4px;';
    document.body.appendChild(box);
    box.addEventListener('mousedown', function (e) {
      const item = e.target && e.target.closest ? e.target.closest('[data-ac-name]') : null;
      if (item) {
        e.preventDefault();
        self._acComplete(item.getAttribute('data-ac-name'));
      }
    });
    return box;
  }

  function hide() {
    const box = document.getElementById('bt-ac-box');
    if (box) box.style.display = 'none';
    self._acState = null;
  }
  this._acHide = hide;

  this._acRender = function (el, frag, matches, selIdx) {
    const box = getBox();
    if (!matches.length) { hide(); return; }
    let html = '';
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      html += '<div data-ac-name="' + m.name.replace(/"/g, '') + '"' +
        ' style="padding:8px 10px;border-radius:7px;cursor:pointer;display:flex;gap:8px;align-items:baseline;' +
        (i === selIdx ? 'background:var(--btt-accent,#6c5ce7);color:#fff;' : '') + '">' +
        '<b style="white-space:nowrap">/' + m.name + '</b>' +
        '<span style="font-size:11.5px;opacity:.75;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
        escapeHtml(m.desc || '') + '</span></div>';
    }
    box.innerHTML = html;
    try {
      const r = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
      if (r) {
        const h = Math.min(240, matches.length * 38 + 8);
        let top = r.top - h - 8;
        if (top < 8) top = r.bottom + 8;
        box.style.left = Math.max(8, Math.min(window.innerWidth - 350, r.left)) + 'px';
        box.style.top = top + 'px';
      }
    } catch (e) {}
    box.style.display = 'block';
    self._acState = { el: el, frag: frag, matches: matches, sel: selIdx };
  };

  this._acComplete = function (name) {
    const st = self._acState;
    if (!st || !st.el) { hide(); return; }
    try {
      const el = st.el;
      self._setValue(el, '/' + name + ' ');
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        const v = el.value || '';
        try { el.setSelectionRange(v.length, v.length); } catch (e) {}
      } else if (el.isContentEditable) {
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        const sel = window.getSelection();
        if (sel) { sel.removeAllRanges(); sel.addRange(range); }
      }
      el.focus();
    } catch (e) {}
    hide();
  };
  function currentFrag(el) {
    let text = '', caret = -1;
    try {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        text = el.value || '';
        caret = el.selectionStart != null ? el.selectionStart : text.length;
      } else if (el.isContentEditable) {
        text = el.textContent || '';
        const sel = window.getSelection();
        if (sel && sel.rangeCount) {
          const range = sel.getRangeAt(0);
          const pre = range.cloneRange();
          pre.selectNodeContents(el);
          pre.setEnd(range.endContainer, range.endOffset);
          caret = pre.toString().length;
        } else caret = text.length;
      }
    } catch (e) { return null; }
    if (caret < 0) return null;
    const before = text.slice(0, caret);
    const m = before.match(/(?:^|\s)\/([a-zA-Z0-9_-]*)$/);
    if (!m) return null;
    return m[1].toLowerCase();
  }

  function refresh(el) {
    if (!self.pm || !self.pm.commands) { hide(); return; }
    const frag = currentFrag(el);
    if (frag == null) { hide(); return; }
    const matches = [];
    for (const entry of self.pm.commands) {
      const name = entry[0], cmd = entry[1];
      if (String(name).toLowerCase().indexOf(frag) === 0) matches.push({ name: name, desc: cmd.desc || '' });
    }
    matches.sort(function (a, b) { return a.name < b.name ? -1 : 1; });
    self._acRender(el, frag, matches.slice(0, 8), 0);
  }

  doc.addEventListener('input', function (e) {
    try {
      const el = e.target;
      if (!self._isEditable || !self._isEditable(el)) { hide(); return; }
      if (self._isSearchField && self._isSearchField(el)) { hide(); return; }
      if (el.closest && (el.closest('[data-bt-root]') || el.closest('#bt-settings'))) { hide(); return; }
      refresh(el);
    } catch (err) {}
  }, true);

  doc.addEventListener('keydown', function (e) {
    try {
      const st = self._acState;
      const box = document.getElementById('bt-ac-box');
      const open = st && box && box.style.display !== 'none' && st.matches && st.matches.length;
      if (!open) return;
      if (e.key === 'Escape') { hide(); e.preventDefault(); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        const n = st.matches.length;
        st.sel = e.key === 'ArrowDown' ? (st.sel + 1) % n : (st.sel - 1 + n) % n;
        self._acRender(st.el, st.frag, st.matches, st.sel);
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        const m = st.matches[st.sel] || st.matches[0];
        if (m) self._acComplete(m.name);
        return;
      }
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const exact = st.matches.some(function (m) { return m.name.toLowerCase() === st.frag; });
        if (st.frag && !exact && st.matches.length) {
          e.preventDefault();
          if (e.stopImmediatePropagation) e.stopImmediatePropagation();
          if (e.stopPropagation) e.stopPropagation();
          const m = st.matches[st.sel] || st.matches[0];
          if (m) self._acComplete(m.name);
          return;
        }
        hide();
      }
    } catch (err) {}
  }, true);

  doc.addEventListener('click', function (e) {
    try {
      const box = document.getElementById('bt-ac-box');
      if (box && box.style.display !== 'none' && e.target && e.target.closest && !e.target.closest('#bt-ac-box')) hide();
    } catch (err) {}
  }, true);

  doc.addEventListener('focusout', function () { setTimeout(hide, 150); }, true);

  this.adapter.log('Autocompletion slash facon Discord active.');
};

if (typeof module !== 'undefined' && module.exports) module.exports = BandUI;
