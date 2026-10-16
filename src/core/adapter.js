/**
 * BandAdapter - Interface avec le client BAND (web / desktop).
 * Les sélecteurs sont à adapter selon la version de BAND (inspecte le DOM).
 */
class BandAdapter {
  constructor() {
    this.host = typeof location !== 'undefined' ? location.hostname : '';
    this.isBand = this.host.includes('band.us') || this.host.includes('band.site');
    this.demo = !this.isBand;
    this._onNewMessage = null;
  }

  isDemo() { return this.demo; }
  log(...args) { try { console.log('[BandTamper]', ...args); } catch (e) {} }

  get SELECTORS() {
    return {
      input: '[class*="chat" i] [contenteditable="true"], [class*="chat" i] textarea, [class*="Chat"] [contenteditable="true"], [class*="Chat"] textarea, .chat-input input, .input-message, div[contenteditable="true"], textarea',
      sendButton: '[class*="chat" i] button[type="submit"], [class*="send" i] button, .send-btn, .chat-send, button[type="submit"], [aria-label*="전송"], [aria-label*="Send"]',
      currentChannel: '.chat-room, .conversation, .band-chat, [class*="chat" i]',
      avatar: 'img.user-avatar, img.profile, .avatar img, [class*="profile" i] img, header img',
      messages: '.message-list, .chat-messages, .msg-container, [class*="message" i]'
    };
  }

  $(sel, root = document) { try { return root.querySelector(sel); } catch (e) { return null; } }
  $$(sel, root = document) { try { return Array.from(root.querySelectorAll(sel)); } catch (e) { return []; } }

  _isVisible(el) {
    try {
      if (!el || !el.getClientRects) return !!el;
      return el.getClientRects().length > 0;
    } catch (e) { return false; }
  }

  /** Trouve le champ de saisie du chat par plusieurs stratégies (SPA + contenteditable). */
  getChatInput() {
    if (typeof document === 'undefined') return null;
    const scoped = this.$(
      '[class*="chat" i] [contenteditable="true"], [class*="chat" i] textarea, [class*="Chat"] [contenteditable="true"], [class*="Chat"] textarea, [class*="send" i] [contenteditable="true"]'
    );
    if (scoped) return scoped;
    const active = document.activeElement;
    if (active && (active.tagName === 'TEXTAREA' || active.isContentEditable)) return active;
    const all = this.$$('textarea, div[contenteditable="true"]');
    for (let i = all.length - 1; i >= 0; i--) {
      const el = all[i];
      if (el.closest && el.closest('[data-bt-root]')) continue;
      if (this._isVisible(el)) return el;
    }
    return null;
  }

  getSendButton() {
    let btn = this.$(this.SELECTORS.sendButton);
    if (btn && !this._isVisible(btn)) btn = null;
    return btn || null;
  }

  /** Écrit une valeur de façon compatible React (setter natif + événement input). */
  _setNativeValue(el, text) {
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      const proto = el.tagName === 'TEXTAREA'
        ? (window.HTMLTextAreaElement && window.HTMLTextAreaElement.prototype)
        : (window.HTMLInputElement && window.HTMLInputElement.prototype);
      const desc = proto && Object.getOwnPropertyDescriptor(proto, 'value');
      if (desc && desc.set) desc.set.call(el, text);
      else el.value = text;
    } else {
      el.focus();
      el.textContent = text;
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  getCurrentUser() {
    if (this.demo) return { id: 'demo-me', name: 'DemoUser', avatar: DEMO_AVATAR };
    if (window.__BAND_USER__) return window.__BAND_USER__;
    if (window.Band && window.Band.currentUser) return window.Band.currentUser;
    const img = this.$(this.SELECTORS.avatar);
    if (img) return { id: 'unknown-me', name: 'Moi', avatar: img.src };
    return { id: 'unknown-me', name: 'Inconnu', avatar: null };
  }

  getConversationType() {
    if (this.demo) return 'dm';
    const path = (location.pathname || '') + '';
    if (/\/(message|dm|talk|whisper)\//i.test(path)) return 'dm';
    if (/\/band\//i.test(path) || /chat/i.test(path)) return 'group';
    return null;
  }

  getCurrentChannelId() {
    if (this.demo) return 'demo-channel';
    const el = this.$(this.SELECTORS.currentChannel);
    return el ? (el.dataset.channelId || el.id || 'unknown') : 'unknown';
  }

  getUserByMention(mention) {
    if (this.demo) {
      return { id: 'demo-user', name: String(mention || '').replace('@', ''), avatar: DEMO_AVATAR };
    }
    const name = String(mention || '').replace(/^@/, '').trim().toLowerCase();
    if (!name) return null;
    // 1) correspondance exacte sur alt/title des images
    for (const img of this.$$('img')) {
      const alt = ((img.alt || img.title || '') + '').trim().toLowerCase();
      if (alt && alt === name) {
        return { id: (img.dataset && img.dataset.userId) || alt, name: alt, avatar: img.src || null };
      }
    }
    // 2) correspondance sur un élément de nom/pseudo contenant une image
    let scanned = 0;
    for (const el of this.$$('[class*="nick" i], [class*="name" i], .author, .sender, span, strong')) {
      if (++scanned > 300) break;
      const t = (el.textContent || '').trim().toLowerCase();
      if (t !== name && t !== '@' + name) continue;
      const img = (el.querySelector && el.querySelector('img')) ||
        (el.parentElement && el.parentElement.querySelector && el.parentElement.querySelector('img'));
      return { id: t, name: t, avatar: (img && img.src) || null };
    }
    return null;
  }

  getUserAvatar(user) {
    if (!user) return null;
    if (typeof user === 'string') {
      const r = this.getUserByMention(user);
      return r ? r.avatar : null;
    }
    return user.avatar || null;
  }

  async sendText(text) {
    if (this.demo) { this.log('[DEMO] Texte :', text); return { ok: true, demo: true }; }
    const input = this.getChatInput();
    if (!input) throw new Error('Champ de saisie introuvable (tape /btdbg pour diagnostiquer)');
    input.focus();
    this._setNativeValue(input, text);
    const btn = this.getSendButton();
    if (btn) {
      btn.click();
      return { ok: true, via: 'bouton' };
    }
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
    return { ok: true, via: 'Enter' };
  }

  async sendFile(blob, filename = 'pet.gif') {
    if (this.demo) { this.log('[DEMO] Fichier :', filename, blob && blob.size, 'octets'); return { ok: true, demo: true }; }
    let input = this.$('[class*="chat" i] input[type="file"], [class*="Chat"] input[type="file"], [class*="send" i] input[type="file"], [class*="attach" i] input[type="file"]');
    if (!input) {
      const all = this.$$('input[type="file"]');
      input = all.length ? all[all.length - 1] : null;
    }
    if (!input) throw new Error('input[type=file] introuvable (tape /btdbg pour diagnostiquer)');
    const file = new File([blob], filename, { type: (blob && blob.type) || 'image/gif' });
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    this.log('Fichier injecté dans input[type=file] :', filename);
    return { ok: true, via: 'file-input' };
  }

  onNewMessage(cb) {
    this._onNewMessage = cb;
    if (this.demo) return;
    this.log('onNewMessage : aucun hook DOM configuré pour cette version de BAND');
  }

  _simulateIncomingMessage(text, sender = 'Demo') {
    if (this._onNewMessage) this._onNewMessage({ text, sender, id: Date.now(), time: new Date() });
  }
}

window.BandAdapter = BandAdapter;
if (typeof module !== 'undefined' && module.exports) module.exports = BandAdapter;

const DEMO_AVATAR = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
