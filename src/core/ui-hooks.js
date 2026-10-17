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
      const el = e.target;
      // Historique des commandes : ↑/↓ rappelle la dernière commande tapée
      // (seulement quand le champ contient déjà un "/" en cours de frappe).
      if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (self._isEditable(el) && !self._isSearchField(el) &&
            !(el.closest && (el.closest('#bt-band-panel') || el.closest('#bt-settings') || el.closest('[data-bt-root]')))) {
          const cur = self._readValue(el);
          if (cur.charAt(0) === '/' && self._cmdHistory && self._cmdHistory.length) {
            e.preventDefault();
            if (e.stopImmediatePropagation) e.stopImmediatePropagation();
            if (typeof self._histIdx !== 'number') self._histIdx = self._cmdHistory.length;
            self._histIdx += (e.key === 'ArrowUp' ? -1 : 1);
            if (self._histIdx < 0) self._histIdx = 0;
            if (self._histIdx >= self._cmdHistory.length) {
              self._histIdx = self._cmdHistory.length;
              self._setValue(el, '/');
            } else {
              self._setValue(el, self._cmdHistory[self._histIdx]);
            }
            return;
          }
        }
        return;
      }
      if (!e || e.key !== 'Enter' || e.ctrlKey || e.metaKey || e.altKey) return;
      // Shift+Entrée = saut de ligne (jamais une exécution de commande).
      if (e.shiftKey) return;
      if (!self._isEditable(el)) return;
      if (self._isSearchField(el)) return;
      if (el.closest && (el.closest('#bt-band-panel') || el.closest('#bt-settings') || el.closest('[data-bt-root]'))) return;
      const text = self._readValue(el).trim();
      if (!text || text.charAt(0) !== '/') return;
      e.preventDefault();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
      if (e.stopPropagation) e.stopPropagation();
      self._setValue(el, '');
      // Mémorise dans l'historique (max 30, sans doublon consécutif).
      try {
        self._cmdHistory = self._cmdHistory || [];
        if (self._cmdHistory[self._cmdHistory.length - 1] !== text) {
          self._cmdHistory.push(text);
          if (self._cmdHistory.length > 30) self._cmdHistory.shift();
        }
        self._histIdx = self._cmdHistory.length;
      } catch (eHist) {}
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

  // Raccourcis globaux : Ctrl+, = Paramètres, Échap = fermer Paramètres/autocomplete.
  // Ignorés dans les champs de saisie (sauf Échap) pour ne pas casser la frappe.
  if (!this._shortcutsHooked) {
    this._shortcutsHooked = true;
    doc.addEventListener('keydown', function (e) {
      try {
        if (!e) return;
        // Ctrl+, (ou Ctrl+;) → Paramètres.
        if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === ',' || e.key === ';')) {
          e.preventDefault();
          if (e.stopImmediatePropagation) e.stopImmediatePropagation();
          if (self.settingsVisible) self.closeSettings();
          else self.openSettings();
          return;
        }
        if (e.key !== 'Escape') return;
        const el = e.target;
        const inField = self._isEditable(el) &&
          !(el.closest && (el.closest('#bt-band-panel') || el.closest('#bt-settings') || el.closest('[data-bt-root]')));
        if (inField) return; // laisse BAND gérer Échap dans ses champs
        let closed = false;
        if (self.settingsVisible && self.closeSettings) { self.closeSettings(); closed = true; }
        if (self._acHide) { try { self._acHide(); } catch (eAc) {} }
        if (closed) {
          e.preventDefault();
          if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        }
      } catch (err) {}
    }, true);
  }
};

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

window.__BTT_toast = function (text, type, opts) {
  // opts : { sticky: bool (pas de disparition auto), html: bool (interprète le HTML) }
  try {
    if (typeof document === 'undefined' || !document.body) {
      console.log('[Unbanded]', String(text == null ? '' : text).replace(/<[^>]*>/g, ''));
      return null;
    }
    opts = (opts && typeof opts === 'object') ? opts : {};
    let wrap = document.getElementById('bt-toasts');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'bt-toasts';
      wrap.setAttribute('data-bt-root', '1');
      wrap.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:2147483647;display:flex;flex-direction:column;gap:8px;align-items:center;font-family:sans-serif;';
      document.body.appendChild(wrap);
    }
    // Évite l'empilement infini : max 5 toasts, le plus vieux est retiré.
    while (wrap.children.length >= 5 && wrap.firstChild) wrap.removeChild(wrap.firstChild);
    const t = document.createElement('div');
    let bg = '#1e272e';
    if (type === 'error') bg = '#c0392b';
    if (type === 'ok') bg = '#27ae60';
    t.style.cssText = 'max-width:460px;max-height:40vh;overflow-y:auto;background:' + bg + ';color:#fff;padding:10px 14px;border-radius:8px;font-size:13px;line-height:1.45;box-shadow:0 6px 18px rgba(0,0,0,.35);white-space:pre-wrap;word-break:break-word;cursor:pointer;';
    if (opts.html) t.innerHTML = String(text == null ? '' : text);
    else t.textContent = String(text == null ? '' : text);
    // Bouton "Copier" pour les toasts longs (debug, help…).
    const plain = t.textContent || '';
    if (plain.length > 80) {
      const copy = document.createElement('button');
      copy.type = 'button';
      copy.textContent = '⧉ Copier';
      copy.style.cssText = 'display:block;margin-top:6px;padding:3px 10px;border:1px solid rgba(255,255,255,.5);border-radius:5px;background:transparent;color:#fff;font-size:11px;cursor:pointer;';
      copy.onclick = function (ev) {
        if (ev && ev.stopPropagation) ev.stopPropagation();
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(plain);
          copy.textContent = '✓ Copié';
          setTimeout(function () { copy.textContent = '⧉ Copier'; }, 1500);
        } catch (e) { copy.textContent = 'Copie impossible'; }
      };
      t.appendChild(copy);
    }
    t.onclick = function () { if (t.remove) t.remove(); else if (t.parentNode) t.parentNode.removeChild(t); };
    wrap.appendChild(t);
    var duration = 5000;
    try {
      if (window.BTTStore) {
        var secs = Number(window.BTTStore.get('toastDuration', 5));
        if (secs > 0) duration = secs * 1000;
      }
    } catch (eStore) {}
    if (!opts.sticky) {
      setTimeout(function () { if (t.remove) t.remove(); else if (t.parentNode) t.parentNode.removeChild(t); }, duration);
    }
    return t;
  } catch (e) {
    try { console.log('[Unbanded]', text); } catch (e2) {}
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BandUI;
}
