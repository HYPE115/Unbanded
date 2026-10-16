BandUI.prototype._isEditable = function (el) {
  if (!el || !el.tagName) return false;
  const tag = el.tagName;
  if (tag === 'TEXTAREA') return true;
  if (tag === 'INPUT') {
    const t = (el.type || 'text').toLowerCase();
    return t === 'text' || t === 'search' || t === '';
  }
  if (el.isContentEditable === true) return true;
  try { return !!(el.getAttribute && el.getAttribute('contenteditable') === 'true'); } catch (e) { return false; }
};

BandUI.prototype._isSearchField = function (el) {
  try {
    if (!el || !el.getAttribute) return false;
    if ((el.type || '').toLowerCase() === 'search') return true;
    if (el.getAttribute('role') === 'searchbox') return true;
    const ph = (el.getAttribute('placeholder') || '').toLowerCase();
    return /search|find|검색/.test(ph);
  } catch (e) { return false; }
};

BandUI.prototype._readValue = function (el) {
  if (!el) return '';
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return String(el.value || '');
  return String(el.textContent || '');
};

BandUI.prototype._setValue = function (el, text) {
  try {
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      const proto = el.tagName === 'TEXTAREA'
        ? (window.HTMLTextAreaElement && window.HTMLTextAreaElement.prototype)
        : (window.HTMLInputElement && window.HTMLInputElement.prototype);
      const desc = proto && Object.getOwnPropertyDescriptor(proto, 'value');
      if (desc && desc.set) desc.set.call(el, text);
      else el.value = text;
    } else {
      el.textContent = text;
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
  } catch (e) { this.adapter.log('setValue KO :', e); }
};

BandUI.prototype._hookCommandInput = function () {
  if (this._hooked) return;
  this._hooked = true;
  const self = this;
  const doc = typeof document !== 'undefined' ? document : null;
  if (!doc || !doc.addEventListener) return;
  // Écoute globale en phase de capture : survit aux remplacements de DOM du SPA
  // et intercepte Entrée AVANT les handlers de BAND (contenteditable).
  doc.addEventListener('keydown', async function (e) {
    try {
      if (!e || e.key !== 'Enter' || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target;
      if (!self._isEditable(el)) return;
      if (self._isSearchField(el)) return;
      if (el.closest && el.closest('#bt-band-panel')) return;
      const text = self._readValue(el).trim();
      if (!text || text.charAt(0) !== '/') return;
      e.preventDefault();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
      if (e.stopPropagation) e.stopPropagation();
      self._setValue(el, '');
      const name = text.split(' ')[0];
      window.__BTT_toast('… exécution de ' + name);
      const info = {
        channelId: self.adapter.getCurrentChannelId(),
        type: self.adapter.getConversationType()
      };
      const handled = await self.pm.runCommand(text, info);
      if (!handled) window.__BTT_toast('Commande inconnue : ' + name + ' (tape /help)', 'error');
    } catch (err) {
      console.error('[Unbanded] Erreur commande :', err);
      window.__BTT_toast('Erreur : ' + ((err && err.message) ? err.message : String(err)), 'error');
    }
  }, true);
  this.adapter.log('Hook clavier global actif (Entrée + "/").');
};

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

window.__BTT_toast = function (text, type) {
  try {
    if (typeof document === 'undefined' || !document.body) {
      console.log('[Unbanded]', text);
      return;
    }
    let wrap = document.getElementById('bt-toasts');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'bt-toasts';
      wrap.setAttribute('data-bt-root', '1');
      wrap.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:2147483647;display:flex;flex-direction:column;gap:8px;align-items:center;font-family:sans-serif;';
      document.body.appendChild(wrap);
    }
    const t = document.createElement('div');
    let bg = '#1e272e';
    if (type === 'error') bg = '#c0392b';
    if (type === 'ok') bg = '#27ae60';
    t.style.cssText = 'max-width:420px;background:' + bg + ';color:#fff;padding:10px 14px;border-radius:8px;font-size:13px;line-height:1.45;box-shadow:0 6px 18px rgba(0,0,0,.35);white-space:pre-wrap;word-break:break-word;cursor:pointer;';
    t.textContent = String(text == null ? '' : text);
    t.onclick = function () { if (t.remove) t.remove(); else if (t.parentNode) t.parentNode.removeChild(t); };
    wrap.appendChild(t);
    var duration = 5000;
    try {
      if (window.BTTStore) {
        var secs = Number(window.BTTStore.get('toastDuration', 5));
        if (secs > 0) duration = secs * 1000;
      }
    } catch (eStore) {}
    setTimeout(function () { if (t.remove) t.remove(); else if (t.parentNode) t.parentNode.removeChild(t); }, duration);
  } catch (e) {
    try { console.log('[Unbanded]', text); } catch (e2) {}
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BandUI;
}
