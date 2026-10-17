// ==UserScript==
// @name         Unbanded
// @namespace    http://tampermonkey.net/
// @version      1.6.2
// @description  Unbanded — chargeur de plugins type Vencord pour BAND (band.us) : page Paramètres (thèmes, CSS personnalisé, import plugin/thème par fichier ou URL), bouton ⚙ dans le header, commandes slash, plugin pet-pet (/pat) avec encodeur GIF embarqué (sans CDN).
// @author       Cline
// @homepageURL  https://github.com/HYPE115/band_tamper
// @supportURL   https://github.com/HYPE115/band_tamper/issues
// @updateURL    https://raw.githubusercontent.com/HYPE115/band_tamper/main/unbanded.user.js
// @downloadURL  https://raw.githubusercontent.com/HYPE115/band_tamper/main/unbanded.user.js
// @match        *://band.us/*
// @match        *://*.band.us/*
// @grant        none
// @run-at       document-end
// @noframes
// ==/UserScript==

(function () {
'use strict';
var module = { exports: {} };

/**
 * BTTStore - Persistance locale (localStorage si disponible, mémoire sinon).
 * Clés préfixées "btt:", valeurs JSON.
 */
(function () {
  var PREFIX = 'btt:';
  var memory = {};
  var hasLS = false;
  try {
    hasLS = typeof localStorage !== 'undefined' && !!localStorage;
    if (hasLS) {
      localStorage.setItem(PREFIX + '__probe', '1');
      localStorage.removeItem(PREFIX + '__probe');
    }
  } catch (e) { hasLS = false; }

  function get(key, def) {
    try {
      var raw = null;
      if (hasLS) raw = localStorage.getItem(PREFIX + key);
      else if (Object.prototype.hasOwnProperty.call(memory, key)) raw = memory[key];
      if (raw == null) return def;
      return JSON.parse(raw);
    } catch (e) { return def; }
  }

  function set(key, value) {
    var raw;
    try { raw = JSON.stringify(value); } catch (e) { return; }
    try {
      if (hasLS) localStorage.setItem(PREFIX + key, raw);
      else memory[key] = raw;
    } catch (e) { memory[key] = raw; }
  }

  function remove(key) {
    try {
      if (hasLS) localStorage.removeItem(PREFIX + key);
      delete memory[key];
    } catch (e) {}
  }

  window.BTTStore = { get: get, set: set, remove: remove, PREFIX: PREFIX };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.BTTStore;
})();

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
  log(...args) { try { console.log('[Unbanded]', ...args); } catch (e) {} }

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


/**
 * PluginManager - Charge, active et désactive les plugins.
 *
 * Un plugin est un module qui exporte un objet :
 *   {
 *     name, version, description,
 *     onLoad(ctx), onUnload(ctx),
 *     commands: [ { name, description, handler(ctx, args, info) } ]
 *   }
 *
 * ctx expose :
 *   api      -> BandAdapter
 *   log      -> console.log préfixé
 *   registerCommand(name, desc, handler)
 *   sendText(text)
 *   sendFile(blob, filename)
 *   getCurrentUser(), getConversationType(), getCurrentChannelId(), getUserAvatar(user)
 */
class PluginManager {
  constructor(adapter, ui) {
    this.adapter = adapter;
    this.ui = ui;
    this.plugins = new Map();        // id -> { spec, url, enabled, specObj }
    this.commands = new Map();       // nom commande -> { pluginId, handler, desc }
    this.defaultPlugins = [];
  }

  registerDefaultPlugin(url) {
    this.defaultPlugins.push(url);
  }

  /**
   * Charge un plugin.
   * @param {string} url  URL http(s) OU identifiant fichier (ex: "file:mon-plugin.js")
   * @param {object} opts { enabled, code, source } - code: JS brut (import fichier), source: 'url'|'file'
   */
  async loadPlugin(url, { enabled = true, code = null, source = null } = {}) {
    if (this.plugins.has(url)) {
      this.adapter.log('Plugin déjà chargé :', url);
      return this.plugins.get(url);
    }
    this.adapter.log('Chargement du plugin :', url);
    if (!code) {
      if (!/^https?:\/\//.test(url)) throw new Error('URL invalide : ' + url);
      try {
        const resp = await fetch(url, { cache: 'no-cache' });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        code = await resp.text();
      } catch (e) {
        this.adapter.log('Échec chargement plugin', url, e);
        throw e;
      }
    }
    let spec;
    try {
      spec = this._evalModule(code);
    } catch (e) {
      this.adapter.log('Échec chargement plugin', url, e);
      throw e;
    }
    if (!spec || !spec.name) throw new Error('Plugin invalide (pas de nom)');

    const ctx = this._makeContext(url);
    let unload;
    if (spec.onLoad) {
      try { unload = spec.onLoad(ctx); } catch (e) {
        this.adapter.log('Erreur onLoad du plugin', spec.name, e);
      }
    }

    // Enregistre les commandes du plugin
    if (spec.commands) {
      for (const cmd of spec.commands) {
        this.commands.set(cmd.name.toLowerCase(), {
          pluginId: url,
          handler: cmd.handler,
          desc: cmd.desc || ''
        });
        this.adapter.log('Commande enregistrée : /' + cmd.name + ' (plugin ' + spec.name + ')');
      }
    }

    this.plugins.set(url, {
      spec, url,
      source: source || 'url',
      code: source === 'file' ? code : null, // mémorise le code pour la persistance des imports fichier
      enabled, unload
    });
    this._persist();
    this._refreshLists();
    return spec;
  }

  async unloadPlugin(url) {
    const entry = this.plugins.get(url);
    if (!entry) return;
    if (entry.enabled && entry.spec.onUnload && entry.spec.onUnload) {
      try { entry.spec.onUnload(this._makeContext(url)); } catch (e) {}
    }
    // Supprime ses commandes
    for (const [name, cmd] of this.commands.entries()) {
      if (cmd.pluginId === url) this.commands.delete(name);
    }
    this.plugins.delete(url);
    this._persist();
    this._refreshLists();
  }

  setEnabled(url, enabled) {
    const entry = this.plugins.get(url);
    if (entry) entry.enabled = enabled;
    this._persist();
    this._refreshLists();
  }

  isEnabled(url) {
    const e = this.plugins.get(url);
    return e ? e.enabled : false;
  }

  /* ---------- Contexte passé aux plugins ---------- */
  _makeContext(pluginUrl) {
    const api = this.adapter;
    const self = this;
    return {
      api,
      log: (...args) => console.log('[Plugin:' + pluginUrl.split('/').pop() + ']', ...args),
      registerCommand: (name, desc, handler) => {
        self.commands.set(name.toLowerCase(), { pluginId: pluginUrl, handler, desc });
        api.log('Commande enregistrée : /' + name);
      },
      unregisterCommand: (name) => {
        self.commands.delete(name.toLowerCase());
      },
      sendText: (text) => api.sendText(text),
      sendFile: (blob, filename) => api.sendFile(blob, filename),
      getCurrentUser: () => api.getCurrentUser(),
      getConversationType: () => api.getConversationType(),
      getCurrentChannelId: () => api.getCurrentChannelId(),
      getUserAvatar: (user) => api.getUserAvatar(user),
      getUserByMention: (m) => api.getUserByMention(m)
    };
  }

  /* ---------- Exécution d'une commande slash ---------- */
  async runCommand(inputText, messageInfo) {
    const match = inputText.match(/^\/([^\s]+)(?:\s+(.*))?$/);
    if (!match) return false;
    const name = match[1].toLowerCase();
    const args = (match[2] || '').trim().split(/\s+/).filter(Boolean);
    const cmd = this.commands.get(name);
    if (!cmd) return false;
    const ctx = this._makeContext(cmd.pluginId || 'builtin');
    const info = Object.assign({}, ctx, messageInfo || {}, { plugin: this.plugins.get(cmd.pluginId) });
    try {
      await cmd.handler(args, info);
      return true;
    } catch (e) {
      this.adapter.log('Erreur commande /' + name, e);
      throw e;
    }
  }

  hasCommand(name) {
    return this.commands.has(name.toLowerCase());
  }

  /* ---------- Persistance des plugins (BTTStore) ---------- */
  _refreshLists() {
    if (!this.ui) return;
    try { this.ui.renderPluginList(); } catch (e) {}
    if (this.ui.renderSettingsPlugins) {
      try { this.ui.renderSettingsPlugins(); } catch (e) {}
    }
  }

  _persist() {
    if (!window.BTTStore) return;
    try {
      const list = [];
      for (const entry of this.plugins.values()) {
        if (entry.builtin) continue; // les plugins intégrés ne sont pas persistés
        list.push({
          id: entry.url,
          source: entry.source || 'url',
          code: entry.code || null,
          enabled: entry.enabled !== false
        });
      }
      window.BTTStore.set('plugins', list);
    } catch (e) { this.adapter.log('Persistance plugins KO :', e); }
  }

  async loadPersisted() {
    if (!window.BTTStore) return;
    let list = [];
    try { list = window.BTTStore.get('plugins', []); } catch (e) { return; }
    if (!Array.isArray(list)) return;
    for (const item of list) {
      if (!item || !item.id) continue;
      try {
        if (item.source === 'file') {
          if (!item.code) continue;
          await this.loadPlugin(item.id, { code: item.code, source: 'file', enabled: item.enabled !== false });
        } else {
          await this.loadPlugin(item.id, { enabled: item.enabled !== false });
        }
        this.adapter.log('Plugin persisté chargé :', item.id);
      } catch (e) {
        this.adapter.log('Plugin persisté en échec :', item.id, e);
      }
    }
  }

  /* ---------- Évaluation d'un module JS (userscript-safe) ---------- */
  _evalModule(code) {
    const fn = new Function('exports', 'module', 'require', 'console', code);
    const exports = {};
    const module = { exports };
    fn(exports, module, null, console);
    return module.exports || exports;
  }

  async loadDefaults() {
    for (const url of this.defaultPlugins) {
      try { await this.loadPlugin(url, { enabled: true }); } catch (e) {
        this.adapter.log('Échec plugin par défaut', url, e);
      }
    }
  }
}

window.PluginManager = PluginManager;
if (typeof module !== 'undefined' && module.exports) module.exports = PluginManager;


PluginManager.prototype.registerCommand = function (name, desc, handler) {
  this.commands.set(name.toLowerCase(), { pluginId: 'builtin', handler: handler, desc: desc || '' });
  this.adapter.log('Commande enregistrée : /' + name);
};

PluginManager.prototype.registerBuiltin = function (spec, url) {
  url = url || ('builtin://' + spec.name);
  if (this.plugins.has(url)) return;
  var ctx = this._makeContext(url);
  var unload;
  if (spec.onLoad) {
    try { unload = spec.onLoad(ctx); } catch (e) {
      this.adapter.log('Erreur onLoad builtin', spec.name, e);
    }
  }
  if (spec.commands) {
    for (var i = 0; i < spec.commands.length; i++) {
      var cmd = spec.commands[i];
      this.commands.set(cmd.name.toLowerCase(), { pluginId: url, handler: cmd.handler, desc: cmd.desc || '' });
      this.adapter.log('Commande enregistrée : /' + cmd.name + ' (builtin ' + spec.name + ')');
    }
  }
  this.plugins.set(url, { spec: spec, url: url, source: 'builtin', builtin: true, code: null, enabled: true, unload: unload });
  this._refreshLists();
};


/**
 * BTTThemes - Thèmes d'application (variables CSS + CSS optionnel).
 *
 * Thème importable (JSON) :
 * {
 *   "name": "Mon thème", "author": "moi", "version": "1.0.0",
 *   "colors": { "accent": "#ff7ac6", "accentHover": "#f45fb2",
 *               "bg": "#2b1d33", "surface": "#241729", "surface2": "#3a2744",
 *               "text": "#ffe9f6", "muted": "#c7a3bd", "border": "#4a3357" },
 *   "css": "/* CSS optionnel appliqué à band.us *\/"
 * }
 * Toutes les couleurs sont optionnelles (les manquantes prennent le défaut violet).
 */
(function () {
  var KEYS = ['accent', 'accentHover', 'bg', 'surface', 'surface2', 'text', 'muted', 'border'];
  var DEFAULT_COLORS = {
    accent: '#6c5ce7', accentHover: '#5a4bd1',
    bg: '#232f3e', surface: '#1c2630', surface2: '#2f3e4e',
    text: '#ffffff', muted: '#aab7c4', border: '#3d4f60'
  };
  var HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

  var BUILTIN = [
    { id: 'default', name: 'Violet (par défaut)', author: 'Unbanded', builtin: true, colors: {} },
    { id: 'midnight', name: 'Minuit', author: 'Unbanded', builtin: true, colors: { accent: '#3b82f6', accentHover: '#2563eb', bg: '#0b1220', surface: '#111a2e', surface2: '#16233c', text: '#e8eef7', muted: '#8ea3bf', border: '#1f2f4a' } },
    { id: 'dracula', name: 'Dracula', author: 'Unbanded', builtin: true, colors: { accent: '#bd93f9', accentHover: '#a77bf3', bg: '#282a36', surface: '#21222c', surface2: '#343746', text: '#f8f8f2', muted: '#9aa4c0', border: '#44475a' } },
    { id: 'nord', name: 'Nord', author: 'Unbanded', builtin: true, colors: { accent: '#88c0d0', accentHover: '#81a1c1', bg: '#2e3440', surface: '#3b4252', surface2: '#434c5e', text: '#eceff4', muted: '#9aa5b8', border: '#4c566a' } },
    { id: 'catppuccin', name: 'Catppuccin Mocha', author: 'Unbanded', builtin: true, colors: { accent: '#cba6f7', accentHover: '#b48ef9', bg: '#1e1e2e', surface: '#181825', surface2: '#313244', text: '#cdd6f4', muted: '#9399b2', border: '#45475a' } },
    { id: 'monokai', name: 'Monokai', author: 'Unbanded', builtin: true, colors: { accent: '#a6e22e', accentHover: '#8ec711', bg: '#272822', surface: '#1f201a', surface2: '#3e3d32', text: '#f8f8f2', muted: '#a6a28c', border: '#49483e' } },
    { id: 'sunset', name: 'Coucher de soleil', author: 'Unbanded', builtin: true, colors: { accent: '#ff7ac6', accentHover: '#f45fb2', bg: '#2b1d33', surface: '#241729', surface2: '#3a2744', text: '#ffe9f6', muted: '#c7a3bd', border: '#4a3357' } },
    { id: 'ocean', name: 'Océan', author: 'Unbanded', builtin: true, colors: { accent: '#22d3ee', accentHover: '#0fb5d4', bg: '#0f2027', surface: '#132833', surface2: '#1c3644', text: '#e6f6fa', muted: '#8fb3c0', border: '#254554' } },
    { id: 'forest', name: 'Forêt', author: 'Unbanded', builtin: true, colors: { accent: '#34d399', accentHover: '#10b981', bg: '#10231a', surface: '#0d1c15', surface2: '#173125', text: '#e9f7ef', muted: '#93b8a5', border: '#1f4030' } },
    { id: 'light', name: 'Clair', author: 'Unbanded', builtin: true, colors: { accent: '#5b5bd6', accentHover: '#4a4ac2', bg: '#f2f4f7', surface: '#ffffff', surface2: '#e8ebf0', text: '#1c2430', muted: '#5d6b7e', border: '#d4dae2' } }
  ];

  function merge(colors) {
    var out = {};
    var k;
    for (var i = 0; i < KEYS.length; i++) { k = KEYS[i]; out[k] = DEFAULT_COLORS[k]; }
    if (colors && typeof colors === 'object') {
      for (var j = 0; j < KEYS.length; j++) {
        k = KEYS[j];
        if (colors[k] && HEX.test(String(colors[k]))) out[k] = String(colors[k]);
      }
    }
    return out;
  }

  function setVar(name, val) {
    var root = document.documentElement;
    if (!root || !root.style) return;
    try {
      if (root.style.setProperty) root.style.setProperty(name, val);
      else root.style[name] = val;
    } catch (e) {}
  }

  function ensureStyle(id, css) {
    var head = document.head || (document.getElementsByTagName && document.getElementsByTagName('head')[0]) || document.documentElement;
    var el = document.getElementById(id);
    if (!el) {
      el = document.createElement('style');
      el.id = id;
      el.setAttribute('data-bt-root', '1');
      head.appendChild(el);
    }
    el.textContent = css || '';
  }

  // Restyle des éléments Unbanded existants (panneau, bouton) via variables CSS.
  function coreCss() {
    return '#bt-band-panel{background:var(--btt-surface,#232f3e)!important;color:var(--btt-text,#fff)!important}' +
      '#bt-band-panel hr{border-top-color:var(--btt-border,#3d4f60)!important}' +
      '#bt-band-panel input[type=text]{background:var(--btt-bg,#232f3e)!important;color:var(--btt-text,#fff)!important}' +
      '#bt-band-plugins{color:var(--btt-text,inherit)!important}';
  }

  function imported() {
    var out = [];
    try {
      var m = window.BTTStore.get('themes', {});
      for (var id in m) if (Object.prototype.hasOwnProperty.call(m, id)) out.push(m[id]);
    } catch (e) {}
    return out;
  }

  function list() { return BUILTIN.concat(imported()); }

  function get(id) {
    if (!id) return null;
    for (var i = 0; i < BUILTIN.length; i++) if (BUILTIN[i].id === id) return BUILTIN[i];
    try {
      var m = window.BTTStore.get('themes', {});
      if (Object.prototype.hasOwnProperty.call(m, id)) return m[id];
    } catch (e) {}
    return null;
  }


  function apply(id) {
    var t = get(id) || get('default');
    var c = merge(t.colors);
    for (var i = 0; i < KEYS.length; i++) {
      setVar('--btt-' + KEYS[i].replace(/[A-Z]/g, function (m) { return '-' + m.toLowerCase(); }), c[KEYS[i]]);
    }
    ensureStyle('bt-core-css', coreCss());
    ensureStyle('bt-theme-css', t.css || '');
    try { window.BTTStore.set('activeTheme', t.id); } catch (e) {}
    return t;
  }

  function applyActive() {
    var id = 'default';
    try { id = window.BTTStore.get('activeTheme', 'default'); } catch (e) {}
    return apply(id);
  }

  function normalize(obj) {
    if (!obj || typeof obj !== 'object') throw new Error('Thème invalide (JSON attendu)');
    var name = String(obj.name || '').trim().slice(0, 60);
    if (!name) throw new Error('Thème invalide : champ "name" manquant');
    var colors = {};
    var src = (obj.colors && typeof obj.colors === 'object') ? obj.colors : {};
    var found = 0;
    for (var i = 0; i < KEYS.length; i++) {
      var k = KEYS[i];
      if (src[k] && HEX.test(String(src[k]))) { colors[k] = String(src[k]); found++; }
    }
    if (!found) throw new Error('Thème invalide : aucune couleur valide dans "colors" (format #rgb/#rrggbb)');
    return {
      id: 'import-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: name,
      author: String(obj.author || '').trim().slice(0, 60),
      version: String(obj.version || '').trim().slice(0, 20),
      css: typeof obj.css === 'string' ? obj.css.slice(0, 100000) : '',
      colors: colors,
      builtin: false
    };
  }

  function importJson(obj) {
    var t = normalize(obj);
    var m = window.BTTStore.get('themes', {});
    m[t.id] = t;
    window.BTTStore.set('themes', m);
    return t;
  }

  async function importFromUrl(url) {
    var resp = await fetch(url, { cache: 'no-cache' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    return importJson(await resp.json());
  }

  function remove(id) {
    var t = get(id);
    if (!t || t.builtin) return false;
    var m = window.BTTStore.get('themes', {});
    if (!Object.prototype.hasOwnProperty.call(m, id)) return false;
    delete m[id];
    window.BTTStore.set('themes', m);
    if (window.BTTStore.get('activeTheme') === id) apply('default');
    return true;
  }

  function exportTheme(id) {
    var t = get(id);
    if (!t) throw new Error('Thème introuvable : ' + id);
    var data = { name: t.name, author: t.author || '', version: t.version || '1.0.0', colors: t.colors, css: t.css || '' };
    var text = JSON.stringify(data, null, 2);
    try {
      var blob = new Blob([text], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'btt-theme-' + String(t.id).replace(/[^\w-]+/g, '_') + '.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { try { URL.revokeObjectURL(url); } catch (e) {} }, 1000);
    } catch (e) {
      console.log('[Unbanded] Export thème :', text);
      throw new Error('Export impossible dans ce contexte (contenu dans la console)');
    }
    return data;
  }

  window.BTTThemes = {
    BUILTIN: BUILTIN,
    DEFAULT_COLORS: DEFAULT_COLORS,
    list: list,
    imported: imported,
    get: get,
    apply: apply,
    applyActive: applyActive,
    importJson: importJson,
    importFromUrl: importFromUrl,
    exportTheme: exportTheme,
    remove: remove
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.BTTThemes;
})();

/**
 * BTTStyles - CSS personnalisé de l'utilisateur (appliqué à band.us, persisté).
 */
(function () {
  var STYLE_ID = 'bt-custom-css';

  function get() {
    try { return String(window.BTTStore ? window.BTTStore.get('customCss', '') || '' : ''); }
    catch (e) { return ''; }
  }

  function apply(css) {
    css = String(css == null ? '' : css);
    var head = document.head || (document.getElementsByTagName && document.getElementsByTagName('head')[0]) || document.documentElement;
    var el = document.getElementById(STYLE_ID);
    if (!el) {
      el = document.createElement('style');
      el.id = STYLE_ID;
      el.setAttribute('data-bt-root', '1');
      el.setAttribute('data-bt-prio', '1');
      // Insertion au DÉBUT de <head> : avant tout le CSS de band.us
      if (head.firstChild) {
        head.insertBefore(el, head.firstChild);
      } else {
        head.appendChild(el);
      }
      if (!document.contains(el)) {
        head.appendChild(el);
      }
    }
    el.textContent = css;
    if (window.BTTStore) window.BTTStore.set('customCss', css);
  }

  function clear() {
    apply('');
    try { if (window.BTTStore) window.BTTStore.remove('customCss'); } catch (e) {}
  }

  window.BTTStyles = { apply: apply, get: get, clear: clear, STYLE_ID: STYLE_ID };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.BTTStyles;
})();

/**
 * Commandes slash intégrées (disponibles même sans plugin).
 */
function registerBuiltInCommands(pm) {
  pm.registerCommand('pat', "Fais un pet-pet à quelqu'un. Usage : /pat [user] (user requis en groupe)", async () => {
    // Redondant : le plugin pet-pet (chargé juste après) remplace ce stub.
  });

  pm.registerCommand('help', "Affiche la liste des commandes", async (args, info) => {
    const lines = ['=== Commandes Unbanded ==='];
    for (const [name, cmd] of pm.commands) {
      lines.push('/' + name + ' — ' + (cmd.desc || ''));
    }
    lines.push('', '(affichage local uniquement)');
    if (window.__BTT_toast) window.__BTT_toast(lines.join('\n'));
    else info.api.log(lines.join('\n'));
  });

  pm.registerCommand('plugins', "Ouvre/ferme le gestionnaire de plugins", async (args, info) => {
    const ui = window.UnbandedUI || window.BandTamperUI;
    if (ui) {
      ui.toggle();
      if (window.__BTT_toast) window.__BTT_toast('Panneau Plugins ' + (ui.visible ? 'ouvert' : 'fermé'));
    } else if (window.__BTT_toast) {
      window.__BTT_toast('Panneau indisponible', 'error');
    }
  });

  pm.registerCommand('settings', 'Ouvre la page Paramètres (thèmes, CSS personnalisé, plugins)', async (args, info) => {
    const ui = window.UnbandedUI || window.BandTamperUI;
    if (ui && ui.openSettings) {
      ui.openSettings();
    } else if (window.__BTT_toast) {
      window.__BTT_toast('Page Paramètres indisponible', 'error');
    }
  });

  pm.registerCommand('btdbg', "Diagnostics Unbanded (sélecteurs, hook, etc.)", async (args, info) => {
    const a = (info && info.api) || pm.adapter;
    const input = a.getChatInput ? a.getChatInput() : null;
    const fileInputs = a.$$('input[type="file"]').length;
    const lines = [
      '=== btdbg Unbanded ===',
      'Host : ' + a.host + ' | démo : ' + a.isDemo(),
      'Type conversation : ' + a.getConversationType(),
      'Canal : ' + a.getCurrentChannelId(),
      'Champ de saisie : ' + (input ? input.tagName + (input.isContentEditable ? ' (contenteditable)' : '') : 'INTROUVABLE'),
      'Bouton envoyer : ' + (a.getSendButton && a.getSendButton() ? 'trouvé' : 'introuvable'),
      'input[type=file] : ' + fileInputs,
      'Commandes : ' + Array.from(pm.commands.keys()).join(', ')
    ];
    console.log('[Unbanded][btdbg]\n' + lines.join('\n'));
    if (window.__BTT_toast) window.__BTT_toast(lines.join('\n'));
  });
}

window.registerBuiltInCommands = registerBuiltInCommands;
if (typeof module !== 'undefined' && module.exports) module.exports = { registerBuiltInCommands };

/**
 * BandUI - Bouton "Unbanded" + panneau de gestion injectés dans BAND.
 */
class BandUI {
  constructor(pm, adapter) {
    this.pm = pm;
    this.adapter = adapter;
    this.panel = null;
    this.btn = null;
    this.visible = false;
  }

  inject() {
    window.UnbandedUI = this;
    window.BandTamperUI = this; // alias rétro-compat
    this._hookCommandInput();
    if (!document.body) return;
    this._injectSettings();
    this._injectFab();
    if (this.adapter.isDemo()) {
      this._injectDemoBanner();
      return;
    }
    this._injectButton();
    this._injectPanel();
  }

  ensureInjected() {
    try {
      if (!document.body) return;
      if (!this.settingsEl || !document.body.contains(this.settingsEl)) this._injectSettings();
      if (!this.fab || !document.body.contains(this.fab)) this._injectFab();
      if (this.adapter.isDemo()) {
        if (!this.banner || !document.body.contains(this.banner)) this._injectDemoBanner();
        return;
      }
      if (!this.btn || !document.body.contains(this.btn)) this._injectButton();
      if (!this.panel || !document.body.contains(this.panel)) this._injectPanel();
    } catch (e) { this.adapter.log('ensureInjected :', e); }
  }

  _injectDemoBanner() {
    if (!document.body) return;
    const b = document.createElement('div');
    this.banner = b;
    b.style.cssText = 'position:fixed;top:10px;left:10px;z-index:99999;background:#2f3e4e;color:#fff;padding:10px 14px;border-radius:8px;font-family:sans-serif;font-size:13px;max-width:360px;box-shadow:0 4px 12px rgba(0,0,0,.4);';
    b.innerHTML = '<b>Unbanded (mode démo)</b><br>Tu n\'es pas sur band.us. Les actions réelles ne fonctionnent pas hors de BAND.<br><button id="bt-open-plugins" style="margin-top:8px;padding:6px 10px;cursor:pointer">⚙ Ouvrir Unbanded</button>';
    document.body.appendChild(b);
    const openBtn = document.getElementById('bt-open-plugins');
    if (openBtn) openBtn.onclick = () => this.toggle();
    const cmd = document.createElement('input');
    cmd.id = 'bt-demo-cmd';
    cmd.type = 'text';
    cmd.placeholder = '/help ou /pat puis Entrée';
    cmd.style.cssText = 'margin-top:8px;padding:6px;border-radius:4px;border:none;width:100%;box-sizing:border-box;';
    b.appendChild(cmd);
    this._injectPanel();
  }

  _injectButton() {
    // Bouton "Unbanded" : sur le vrai BAND (#header .headerWidgetArea ul.widgetList),
    // il est inséré juste APRÈS le lien "Feed" de la barre du haut.
    this.btn = document.createElement('button');
    this.btn.id = 'bt-band-plugins';
    this.btn.type = 'button';
    this.btn.textContent = 'Unbanded';
    this.btn.title = 'Unbanded — paramètres des plugins (/help, /plugins, /settings)';
    this.btn.setAttribute('data-bt-root', '1');
    this.btn.style.cssText = 'background:none;border:none;padding:0 4px;cursor:pointer;font:inherit;font-weight:bold;color:inherit;display:inline-flex;align-items:center;gap:4px;';
    const dot = document.createElement('span');
    dot.textContent = '●';
    dot.style.cssText = 'color:#6c5ce7;font-size:8px;line-height:1;';
    this.btn.appendChild(dot);
    this.btn.onclick = () => this.toggle();

    const listItem = () => {
      const item = document.createElement('li');
      item.className = 'widgetItem';
      item.id = 'bt-header-item';
      item.setAttribute('data-bt-root', '1');
      item.appendChild(this.btn);
      return item;
    };

    // 1) Barre du haut BAND : juste à côté du bouton "Feed"
    const feedLink = document.querySelector('#header .headerWidgetArea a[href="/feed"], #header a[href="/feed"]');
    const feedItem = feedLink && feedLink.closest ? feedLink.closest('li') : null;
    if (feedItem) {
      feedItem.insertAdjacentElement('afterend', listItem());
      return;
    }
    // 2) widgetList du header présent sans lien Feed trouvé
    const list = document.querySelector('#header .headerWidgetArea ul.widgetList, #header ul.widgetList');
    if (list) {
      list.insertBefore(listItem(), list.firstElementChild);
      return;
    }
    // 3) header seul
    const header = document.querySelector('#header, .headerWrap, header');
    if (header) {
      header.appendChild(this.btn);
      return;
    }
    // 4) anciens replis génériques
    const target = document.querySelector('.sidebar, .nav, .top-bar');
    if (target) {
      target.appendChild(this.btn);
      return;
    }
    // 5) dernier recours : bouton discret en haut à droite (jamais sur Envoyer)
    Object.assign(this.btn.style, {
      position: 'fixed', top: '70px', right: '68px', padding: '8px 12px',
      background: '#6c5ce7', color: '#fff', borderRadius: '6px',
      zIndex: '10000', boxShadow: '0 2px 6px rgba(0,0,0,.3)'
    });
    document.body.appendChild(this.btn);
  }

  /* ---------- Bouton ⚙ : docké dans le header BAND, jamais en flottant ---------- */
  _injectFab() {
    if (!document.body) return;
    if (this.fab && document.body.contains(this.fab)) return;
    const fab = document.createElement('button');
    fab.id = 'bt-fab';
    fab.type = 'button';
    fab.textContent = '⚙';
    fab.title = 'Unbanded — afficher/masquer le panneau';
    fab.setAttribute('data-bt-root', '1');
    fab.onmouseenter = function () { fab.style.transform = 'scale(1.1)'; fab.style.opacity = '1'; };
    fab.onmouseleave = function () { fab.style.transform = 'scale(1)'; fab.style.opacity = ''; };
    fab.onclick = () => this.toggleGui();

    // 1) Dock dans le header BAND, après la barre de recherche
    //    (.gnbLogoSearchArea) : respecte la DA du site, jamais sur Envoyer.
    const searchArea = document.querySelector('#header .headerInner .gnbLogoSearchArea');
    if (searchArea) {
      fab.style.cssText = 'flex:none;align-self:center;width:32px;height:32px;margin-left:10px;' +
        'border:1px solid rgba(128,128,128,.35);border-radius:50%;cursor:pointer;font-size:16px;' +
        'line-height:1;color:inherit;background:transparent;' +
        'display:inline-flex;align-items:center;justify-content:center;padding:0;font-family:inherit;' +
        'opacity:.8;transition:transform .15s ease,opacity .2s ease;';
      searchArea.appendChild(fab);
      this.fab = fab;
      this._syncFabState();
      this.adapter.log('Bouton ⚙ docké dans le header BAND.');
      return;
    }
    // 2) Header présent sans zone logo/recherche : fin du headerInner.
    const headerInner = document.querySelector('#header .headerInner, #header');
    if (headerInner) {
      fab.style.cssText = 'flex:none;align-self:center;width:32px;height:32px;margin-left:10px;' +
        'border:1px solid rgba(128,128,128,.35);border-radius:50%;cursor:pointer;font-size:16px;' +
        'line-height:1;color:inherit;background:transparent;' +
        'display:inline-flex;align-items:center;justify-content:center;padding:0;font-family:inherit;' +
        'opacity:.8;transition:transform .15s ease,opacity .2s ease;';
      headerInner.appendChild(fab);
      this.fab = fab;
      this._syncFabState();
      this.adapter.log('Bouton ⚙ docké dans le header BAND.');
      return;
    }
    // 3) Dernier recours : flottant discret en haut à droite (jamais en bas).
    fab.style.cssText = 'position:fixed;right:18px;top:70px;z-index:10001;width:40px;height:40px;' +
      'border:none;border-radius:50%;cursor:pointer;font-size:19px;line-height:1;color:#fff;' +
      'background:var(--btt-accent,#6c5ce7);box-shadow:0 4px 14px rgba(0,0,0,.4);' +
      'display:flex;align-items:center;justify-content:center;padding:0;font-family:inherit;' +
      'opacity:.75;transition:transform .15s ease,opacity .2s ease;';
    document.body.appendChild(fab);
    this.fab = fab;
    this._syncFabState();
    this.adapter.log('Bouton flottant ⚙ injecté (haut droite, repli).');
  }

  toggleGui() {
    // Si la page Paramètres est ouverte : ferme tout. Sinon bascule le panneau.
    if (this.settingsVisible) {
      this.closeSettings();
      this._syncFabState();
      return;
    }
    this.toggle();
  }

  _syncFabState() {
    if (!this.fab) return;
    const open = !!this.visible && !this.settingsVisible;
    try {
      this.fab.textContent = open ? '✕' : '⚙';
      this.fab.style.opacity = open ? '1' : '0.8';
      this.fab.title = open ? 'Unbanded — masquer le panneau' : 'Unbanded — afficher le panneau';
    } catch (e) {}
  }
}

window.BandUI = BandUI;
if (typeof module !== 'undefined' && module.exports) module.exports = BandUI;


BandUI.prototype._injectPanel = function () {
  const self = this;
  this.panel = document.createElement('div');
  this.panel.id = 'bt-band-panel';
  this.panel.setAttribute('data-bt-root', '1');
  this.panel.style.cssText = 'position:fixed;top:60px;right:20px;width:340px;background:#232f3e;color:#fff;border-radius:10px;padding:14px;font-family:sans-serif;font-size:13px;z-index:99999;display:none;box-shadow:0 6px 20px rgba(0,0,0,.5);flex-direction:column;gap:10px;';
  this.panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <div style="font-weight:bold;font-size:15px">Unbanded · Plugins</div>
      <div style="display:flex;gap:6px;">
        <button id="bt-open-settings" title="Paramètres (thèmes, CSS, plugins)" style="background:transparent;border:none;color:#fff;cursor:pointer">⚙</button>
        <button id="bt-close-panel" style="background:transparent;border:none;color:#fff;cursor:pointer">✕</button>
      </div>
    </div>
    <div id="bt-plugin-list" style="gap:6px;max-height:300px;overflow-y:auto;"></div>
    <hr style="border:none;border-top:1px solid #3d4f60;margin:8px 0;">
    <div style="gap:6px;display:flex;flex-direction:column;">
      <label>Ajouter un plugin (URL JS) :</label>
      <input id="bt-plugin-url" type="text" placeholder="https://exemple.com/plugin.js" style="padding:6px;border-radius:4px;border:none;width:100%;box-sizing:border-box;">
      <button id="bt-add-plugin" style="background:#6c5ce7;border:none;color:#fff;padding:6px 10px;border-radius:4px;cursor:pointer">Ajouter</button>
    </div>
    <div style="font-size:11px;color:#aab7c4">Commandes : /pat [user] · /help · /plugins · /settings · /btdbg</div>
  `;
  document.body.appendChild(this.panel);
  const closeBtn = document.getElementById('bt-close-panel');
  if (closeBtn) closeBtn.onclick = () => this.hide();
  const settingsBtn = document.getElementById('bt-open-settings');
  if (settingsBtn) settingsBtn.onclick = () => self.openSettings();
  const addBtn = document.getElementById('bt-add-plugin');
  if (addBtn) addBtn.onclick = async () => {
    const urlInput = document.getElementById('bt-plugin-url');
    const url = (urlInput && urlInput.value ? urlInput.value : '').trim();
    if (!url) return;
    try {
      await this.pm.loadPlugin(url, { enabled: true, source: 'url' });
      if (urlInput) urlInput.value = '';
      this.renderPluginList();
    } catch (e) { alert('Échec : ' + e.message); }
  };
};

BandUI.prototype.toggle = function () { this.visible ? this.hide() : this.show(); };
BandUI.prototype.show = function () { if (this.panel) this.panel.style.display = 'flex'; this.visible = true; if (this._syncFabState) this._syncFabState(); };
BandUI.prototype.hide = function () { if (this.panel) this.panel.style.display = 'none'; this.visible = false; if (this._syncFabState) this._syncFabState(); };

BandUI.prototype.renderPluginList = function () {
  const container = document.getElementById('bt-plugin-list');
  if (!container) return;
  container.innerHTML = '';
  for (const [url, entry] of this.pm.plugins) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px;border:1px solid #3d4f60;border-radius:6px;background:#1c2630;';
    const info = document.createElement('div');
    info.style.cssText = 'flex:1;min-width:0;';
    info.innerHTML = `<div style="font-weight:600">${escapeHtml(entry.spec.name)}</div><div style="font-size:11px;color:#aab7c4">${escapeHtml(entry.spec.description || '')} v${entry.spec.version || '?'}</div>`;
    const toggle = document.createElement('button');
    toggle.textContent = entry.enabled ? 'Désactiver' : 'Activer';
    toggle.style.cssText = 'padding:4px 8px;border-radius:4px;border:none;cursor:pointer;font-size:11px;background:' + (entry.enabled ? '#d63031' : '#00b894') + ';color:#fff;';
    toggle.onclick = () => { this.pm.setEnabled(url, !entry.enabled); this.renderPluginList(); };
    const del = document.createElement('button');
    del.textContent = 'Suppr';
    del.style.cssText = 'padding:4px 8px;border-radius:4px;border:none;cursor:pointer;font-size:11px;background:#636e72;color:#fff;margin-left:6px;';
    del.onclick = () => { this.pm.unloadPlugin(url); this.renderPluginList(); };
    row.appendChild(info);
    row.appendChild(toggle);
    row.appendChild(del);
    container.appendChild(row);
  }
  if (this.pm.plugins.size === 0) {
    container.innerHTML = '<div style="font-size:11px;color:#aab7c4">Aucun plugin chargé.</div>';
  }
};


/**
 * ui-settings.js - Page Paramètres complète (Général, Plugins, Thèmes, CSS, À propos).
 * Modale plein écran, ouvrable via /settings, le bouton ⚙ du panneau, ou UnbandedUI.openSettings().
 */
BandUI.prototype._injectSettings = function () {
  if (!document.body) return;
  if (this.settingsEl && document.body.contains(this.settingsEl)) return;
  var self = this;
  this._injectSettingsCss();
  var el = document.createElement('div');
  el.id = 'bt-settings';
  el.setAttribute('data-bt-root', '1');
  el.style.cssText = 'display:none;position:fixed;top:0;left:0;right:0;bottom:0;z-index:2147483000;background:rgba(0,0,0,.55);font-family:sans-serif;';
  el.innerHTML = this._settingsMarkup();
  document.body.appendChild(el);
  this.settingsEl = el;
  this.settingsVisible = false;
  el.addEventListener('click', function (e) { self._settingsClick(e); });
  el.addEventListener('change', function (e) { self._settingsChange(e); });
  this._switchSettingsTab(this._settingsTab || 'general');
};

BandUI.prototype._settingsMarkup = function () {
  var v = '1.6.2';
  return '' +
  '<div class="bt-set-win" role="dialog" aria-modal="true" aria-label="Paramètres Unbanded">' +
    '<aside class="bt-set-side">' +
      '<div class="bt-set-brand"><span class="bt-set-dot"></span> Unbanded <small>v' + v + '</small></div>' +
      '<nav>' +
        '<button type="button" class="bt-set-tab" data-tab="general">⚙ Général</button>' +
        '<button type="button" class="bt-set-tab" data-tab="plugins">🧩 Plugins</button>' +
        '<button type="button" class="bt-set-tab" data-tab="themes">🎨 Thèmes</button>' +
        '<button type="button" class="bt-set-tab" data-tab="css">{ } CSS personnalisé</button>' +
        '<button type="button" class="bt-set-tab" data-tab="about">ℹ À propos</button>' +
      '</nav>' +
      '<div class="bt-set-side-foot">Raccourci : tape <b>/settings</b> dans le chat</div>' +
    '</aside>' +
    '<main class="bt-set-main">' +
      '<header class="bt-set-head"><h2 id="bt-set-title">Général</h2>' +
        '<button type="button" id="bt-settings-close" class="bt-set-close" title="Fermer">✕</button></header>' +
      '<div class="bt-set-body">' +

        '<section class="bt-page" data-page="general">' +
          '<div class="bt-set-card">' +
            '<h3>Général</h3>' +
            '<label class="bt-set-switch"><input type="checkbox" data-act="opt-startup-toast"> Afficher le toast de démarrage</label>' +
            '<label class="bt-set-line">Durée des toasts : ' +
              '<select data-act="opt-toast-duration"><option value="3">3 s</option><option value="5">5 s</option><option value="8">8 s</option><option value="12">12 s</option></select>' +
            '</label>' +
          '</div>' +
          '<div class="bt-set-card">' +
            '<h3>Configuration</h3>' +
            '<div class="bt-set-row">' +
              '<button type="button" class="bt-btn" data-act="export-config">Exporter (JSON)</button>' +
              '<button type="button" class="bt-btn bt-btn-ghost" data-act="import-config">Importer (JSON)</button>' +
              '<button type="button" class="bt-btn bt-btn-danger" data-act="reset-all">Tout réinitialiser</button>' +
            '</div>' +
            '<div class="bt-set-hint">L\'export inclut plugins, thèmes, CSS personnalisé et options — parfait pour migrer vers un autre navigateur.</div>' +
          '</div>' +
        '</section>' +

        '<section class="bt-page" data-page="plugins" hidden>' +
          '<div class="bt-set-card">' +
            '<h3>Ajouter un plugin</h3>' +
            '<div class="bt-set-row">' +
              '<input type="text" id="bt-set-plugin-url" placeholder="https://exemple.com/plugin.js">' +
              '<button type="button" class="bt-btn" data-act="add-plugin-url">Ajouter (URL)</button>' +
              '<button type="button" class="bt-btn bt-btn-ghost" data-act="import-plugin-file">Importer un fichier .js</button>' +
            '</div>' +
            '<div class="bt-set-hint">Un plugin est un JS exposant <code>module.exports = { name, version, description, onLoad(ctx), commands }</code>. Les plugins ajoutés sont mémorisés et rechargés au démarrage.</div>' +
          '</div>' +
          '<div class="bt-set-card"><h3>Plugins installés</h3><div id="bt-set-plugin-list" class="bt-set-list"></div></div>' +
        '</section>' +


        '<section class="bt-page" data-page="themes" hidden>' +
          '<div class="bt-set-card">' +
            '<h3>Importer un thème</h3>' +
            '<div class="bt-set-row">' +
              '<input type="text" id="bt-set-theme-url" placeholder="https://exemple.com/mon-theme.json">' +
              '<button type="button" class="bt-btn" data-act="add-theme-url">Importer (URL)</button>' +
              '<button type="button" class="bt-btn bt-btn-ghost" data-act="import-theme-file">Importer un fichier .json</button>' +
            '</div>' +
            '<div class="bt-set-hint">Format : <code>{"name":"...","colors":{"accent":"#ff7ac6","bg":"#1a1625",...},"css":"/* optionnel */"}</code> — les couleurs manquantes prennent le défaut violet.</div>' +
          '</div>' +
          '<div class="bt-set-card"><h3>Thèmes</h3><div id="bt-set-theme-grid" class="bt-set-grid"></div></div>' +
        '</section>' +

        '<section class="bt-page" data-page="css" hidden>' +
          '<div class="bt-set-card">' +
            '<h3>CSS personnalisé</h3>' +
            '<textarea id="bt-set-css" spellcheck="false" placeholder="/* ton CSS, appliqué à band.us en direct */"></textarea>' +
            '<div class="bt-set-row">' +
              '<button type="button" class="bt-btn" data-act="save-css">Appliquer &amp; enregistrer</button>' +
              '<button type="button" class="bt-btn bt-btn-ghost" data-act="preview-css">Aperçu (sans enregistrer)</button>' +
              '<button type="button" class="bt-btn bt-btn-danger" data-act="clear-css">Réinitialiser</button>' +
            '</div>' +
            '<div class="bt-set-hint">Le CSS est injecté dans la page (élément <code>&lt;style id="bt-custom-css"&gt;</code>) et conservé après rechargement. L\'aperçu ne persiste pas.</div>' +
          '</div>' +
        '</section>' +

        '<section class="bt-page" data-page="about" hidden>' +
          '<div class="bt-set-card">' +
            '<h3>Unbanded v' + v + '</h3>' +
            '<div class="bt-set-hint">Chargeur de plugins type Vencord pour BAND (band.us). Commandes : /pat · /help · /plugins · /settings · /btdbg.<br>' +
            'GIF pet-pet : algorithme <a href="https://github.com/aDu/pet-pet-gif" target="_blank" rel="noopener" style="color:var(--btt-accent)">aDu/pet-pet-gif</a> + encodeur <a href="https://github.com/mattdesl/gifenc" target="_blank" rel="noopener" style="color:var(--btt-accent)">gifenc</a> embarqué (aucun CDN, compatible CSP band.us).<br>' +
            'Licence MIT · <a href="https://github.com/HYPE115/band_tamper" target="_blank" rel="noopener" style="color:var(--btt-accent)">github.com/HYPE115/band_tamper</a></div>' +
            '<div class="bt-set-row"><span class="bt-badge" id="bt-set-stat-plugins">? plugins</span><span class="bt-badge" id="bt-set-stat-commands">? commandes</span><span class="bt-badge" id="bt-set-stat-themes">? thèmes</span></div>' +
          '</div>' +
        '</section>' +

      '</div>' +
    '</main>' +
  '</div>';
};


BandUI.prototype._injectSettingsCss = function () {
  if (document.getElementById('bt-settings-css')) return;
  var head = document.head || (document.getElementsByTagName && document.getElementsByTagName('head')[0]) || document.documentElement;
  var s = document.createElement('style');
  s.id = 'bt-settings-css';
  s.setAttribute('data-bt-root', '1');
  s.textContent =
    '#bt-settings{color:var(--btt-text,#fff)}' +
    '#bt-settings *{box-sizing:border-box}' +
    '#bt-settings [hidden]{display:none!important}' +
    '.bt-set-win{display:flex;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:min(960px,94vw);height:min(640px,90vh);background:var(--btt-bg,#232f3e);border:1px solid var(--btt-border,#3d4f60);border-radius:14px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5)}' +
    '.bt-set-side{width:220px;flex-shrink:0;background:var(--btt-surface,#1c2630);border-right:1px solid var(--btt-border,#3d4f60);display:flex;flex-direction:column;padding:16px 10px;gap:4px}' +
    '.bt-set-brand{font-weight:700;font-size:15px;padding:6px 10px 14px;display:flex;align-items:center;gap:8px}' +
    '.bt-set-brand small{color:var(--btt-muted,#aab7c4);font-weight:400}' +
    '.bt-set-dot{width:9px;height:9px;border-radius:50%;background:var(--btt-accent,#6c5ce7);box-shadow:0 0 8px var(--btt-accent,#6c5ce7)}' +
    '.bt-set-tab{display:flex;align-items:center;gap:8px;width:100%;text-align:left;padding:9px 12px;border:none;border-radius:8px;background:transparent;color:var(--btt-text,#fff);font-size:13.5px;cursor:pointer;font-family:inherit}' +
    '.bt-set-tab:hover{background:var(--btt-surface-2,#2f3e4e)}' +
    '.bt-set-tab.bt-active{background:var(--btt-accent,#6c5ce7);color:#fff}' +
    '.bt-set-side-foot{margin-top:auto;padding:8px 10px;font-size:11px;color:var(--btt-muted,#aab7c4);line-height:1.5}' +
    '.bt-set-main{flex:1;display:flex;flex-direction:column;min-width:0}' +
    '.bt-set-head{display:flex;align-items:center;justify-content:space-between;padding:16px 22px;border-bottom:1px solid var(--btt-border,#3d4f60)}' +
    '.bt-set-head h2{margin:0;font-size:17px}' +
    '.bt-set-close{background:transparent;border:none;color:var(--btt-text,#fff);font-size:16px;cursor:pointer;padding:4px 8px;border-radius:6px}' +
    '.bt-set-close:hover{background:var(--btt-surface-2,#2f3e4e)}' +
    '.bt-set-body{flex:1;overflow-y:auto;padding:18px 22px;display:flex;flex-direction:column;gap:14px}' +
    '.bt-set-card{background:var(--btt-surface,#1c2630);border:1px solid var(--btt-border,#3d4f60);border-radius:10px;padding:14px 16px;display:flex;flex-direction:column;gap:10px}' +
    '.bt-set-card h3{margin:0;font-size:14px}' +
    '.bt-set-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}' +
    '.bt-set-row input[type=text]{flex:1;min-width:180px;padding:8px 10px;border-radius:6px;border:1px solid var(--btt-border,#3d4f60);background:var(--btt-bg,#232f3e);color:var(--btt-text,#fff);font-size:13px}' +
    '.bt-btn{padding:8px 12px;border:none;border-radius:6px;background:var(--btt-accent,#6c5ce7);color:#fff;font-size:12.5px;cursor:pointer;font-family:inherit}' +
    '.bt-btn:hover{background:var(--btt-accent-hover,#5a4bd1)}' +
    '.bt-btn-ghost{background:transparent;border:1px solid var(--btt-border,#3d4f60);color:var(--btt-text,#fff)}' +
    '.bt-btn-ghost:hover{background:var(--btt-surface-2,#2f3e4e)}' +
    '.bt-btn-danger{background:#d63031}' +
    '.bt-btn-danger:hover{background:#c0392b}' +
    '.bt-btn-sm{padding:5px 9px;font-size:11.5px}';
  head.appendChild(s);
  this._injectSettingsCss2();
};


BandUI.prototype._injectSettingsCss2 = function () {
  // 2e bloc CSS (séparé pour lisibilité) ; appelé par _injectSettingsCss via ce guard.
  if (document.getElementById('bt-settings-css-2')) return;
  var head = document.head || (document.getElementsByTagName && document.getElementsByTagName('head')[0]) || document.documentElement;
  var s2 = document.createElement('style');
  s2.id = 'bt-settings-css-2';
  s2.setAttribute('data-bt-root', '1');
  s2.textContent =
    '.bt-set-hint{font-size:11.5px;color:var(--btt-muted,#aab7c4);line-height:1.55}' +
    '.bt-set-hint code{background:var(--btt-bg,#232f3e);padding:1px 5px;border-radius:4px;font-size:11px}' +
    '.bt-set-list{display:flex;flex-direction:column;gap:8px}' +
    '.bt-set-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border:1px solid var(--btt-border,#3d4f60);border-radius:8px;background:var(--btt-bg,#232f3e)}' +
    '.bt-set-item .bt-idx{flex:1;min-width:0}' +
    '.bt-set-item .bt-iname{font-weight:600;font-size:13px}' +
    '.bt-set-item .bt-idesc{font-size:11px;color:var(--btt-muted,#aab7c4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.bt-badge{font-size:10px;padding:2px 7px;border-radius:99px;background:var(--btt-surface-2,#2f3e4e);color:var(--btt-muted,#aab7c4);border:1px solid var(--btt-border,#3d4f60)}' +
    '.bt-badge-on{background:rgba(0,184,148,.15);color:#00b894;border-color:rgba(0,184,148,.4)}' +
    '.bt-badge-off{background:rgba(214,48,49,.15);color:#ff7675;border-color:rgba(214,48,49,.4)}' +
    '.bt-set-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}' +
    '.bt-theme-card{border:1px solid var(--btt-border,#3d4f60);border-radius:10px;padding:12px;background:var(--btt-bg,#232f3e);display:flex;flex-direction:column;gap:8px}' +
    '.bt-theme-card.bt-theme-active{border-color:var(--btt-accent,#6c5ce7);box-shadow:0 0 0 1px var(--btt-accent,#6c5ce7)}' +
    '.bt-theme-name{font-weight:600;font-size:13px}' +
    '.bt-theme-meta{font-size:11px;color:var(--btt-muted,#aab7c4)}' +
    '.bt-dots{display:flex;gap:5px}' +
    '.bt-dot{width:14px;height:14px;border-radius:50%;border:1px solid rgba(0,0,0,.25)}' +
    '.bt-set-actions{display:flex;gap:6px;flex-wrap:wrap}' +
    '#bt-set-css{width:100%;min-height:260px;padding:12px;border-radius:8px;border:1px solid var(--btt-border,#3d4f60);background:var(--btt-bg,#232f3e);color:var(--btt-text,#fff);font-family:ui-monospace,Consolas,monospace;font-size:12.5px;line-height:1.55;resize:vertical}' +
    '.bt-set-line{display:flex;align-items:center;gap:10px;font-size:13px}' +
    '.bt-set-line select{padding:6px 8px;border-radius:6px;border:1px solid var(--btt-border,#3d4f60);background:var(--btt-bg,#232f3e);color:var(--btt-text,#fff)}' +
    '.bt-set-switch{display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer}';
  head.appendChild(s2);
};


/* ---------- Ouverture / fermeture / onglets ---------- */
BandUI.prototype.openSettings = function (tab) {
  if (!this.settingsEl) this._injectSettings();
  if (!this.settingsEl) return;
  this.settingsEl.style.display = 'block';
  this.settingsVisible = true;
  this.hide(); // referme le panneau Plugins si ouvert
  if (this._syncFabState) this._syncFabState();
  this._switchSettingsTab(tab || this._settingsTab || 'general');
};

BandUI.prototype.closeSettings = function () {
  if (this.settingsEl) this.settingsEl.style.display = 'none';
  this.settingsVisible = false;
  if (this._syncFabState) this._syncFabState();
};

BandUI.prototype._switchSettingsTab = function (tab) {
  var titles = { general: 'Général', plugins: 'Plugins', themes: 'Thèmes', css: 'CSS personnalisé', about: 'À propos' };
  if (!titles[tab]) tab = 'general';
  this._settingsTab = tab;
  var root = this.settingsEl;
  if (!root) return;
  var title = document.getElementById('bt-set-title');
  if (title) title.textContent = titles[tab];
  var tabs = root.querySelectorAll ? root.querySelectorAll('[data-tab]') : [];
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].className = tabs[i].getAttribute('data-tab') === tab ? 'bt-set-tab bt-active' : 'bt-set-tab';
  }
  var pages = root.querySelectorAll ? root.querySelectorAll('[data-page]') : [];
  for (var j = 0; j < pages.length; j++) {
    if (pages[j].getAttribute('data-page') === tab) pages[j].removeAttribute('hidden');
    else pages[j].setAttribute('hidden', '');
  }
  this._renderSettingsTab(tab);
};

BandUI.prototype._renderSettingsTab = function (tab) {
  try {
    if (tab === 'general') this._renderSettingsGeneral();
    else if (tab === 'plugins') this.renderSettingsPlugins();
    else if (tab === 'themes') this.renderSettingsThemes();
    else if (tab === 'css') this._renderSettingsCss();
    else if (tab === 'about') this._renderSettingsAbout();
  } catch (e) { this.adapter.log('renderSettingsTab', tab, e); }
};

BandUI.prototype._renderSettingsGeneral = function () {
  var cb = document.querySelector ? document.querySelector('#bt-settings [data-act="opt-startup-toast"]') : null;
  if (cb) cb.checked = window.BTTStore.get('startupToast', true) !== false;
  var sel = document.querySelector ? document.querySelector('#bt-settings [data-act="opt-toast-duration"]') : null;
  if (sel) sel.value = String(window.BTTStore.get('toastDuration', 5));
};

BandUI.prototype._renderSettingsCss = function () {
  var ta = document.getElementById('bt-set-css');
  if (ta) ta.value = window.BTTStyles.get();
};

BandUI.prototype._renderSettingsAbout = function () {
  var p = document.getElementById('bt-set-stat-plugins');
  if (p) p.textContent = this.pm.plugins.size + ' plugin(s)';
  var c = document.getElementById('bt-set-stat-commands');
  if (c) c.textContent = this.pm.commands.size + ' commande(s)';
  var t = document.getElementById('bt-set-stat-themes');
  if (t) t.textContent = window.BTTThemes.list().length + ' thème(s)';
};


/* ---------- Liste des plugins (onglet Paramètres) ---------- */
BandUI.prototype.renderSettingsPlugins = function () {
  var c = document.getElementById('bt-set-plugin-list');
  if (!c) return;
  c.innerHTML = '';
  var sourceLabel = { url: 'URL', file: 'Fichier', builtin: 'Intégré' };
  for (var it = this.pm.plugins.entries(), step; !(step = it.next()).done; ) {
    var pair = step.value;
    var id = pair[0];
    var entry = pair[1];
    var row = document.createElement('div');
    row.className = 'bt-set-item';
    var info = document.createElement('div');
    info.className = 'bt-idx';
    info.innerHTML = '<div class="bt-iname">' + escapeHtml(entry.spec.name) + ' ' +
      '<span class="bt-badge' + (entry.enabled ? ' bt-badge-on' : ' bt-badge-off') + '">' + (entry.enabled ? 'actif' : 'inactif') + '</span>' +
      '<span class="bt-badge">' + escapeHtml(sourceLabel[entry.source] || 'URL') + '</span></div>' +
      '<div class="bt-idesc">' + escapeHtml(entry.spec.description || '') + ' · v' + escapeHtml(entry.spec.version || '?') + ' · ' + escapeHtml(id) + '</div>';
    row.appendChild(info);
    if (!entry.builtin) {
      var tog = document.createElement('button');
      tog.type = 'button';
      tog.className = 'bt-btn bt-btn-ghost bt-btn-sm';
      tog.textContent = entry.enabled ? 'Désactiver' : 'Activer';
      tog.setAttribute('data-act', 'plugin-toggle');
      tog.setAttribute('data-id', id);
      row.appendChild(tog);
      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'bt-btn bt-btn-danger bt-btn-sm';
      del.textContent = 'Supprimer';
      del.setAttribute('data-act', 'plugin-remove');
      del.setAttribute('data-id', id);
      row.appendChild(del);
    }
    c.appendChild(row);
  }
  if (this.pm.plugins.size === 0) c.innerHTML = '<div class="bt-set-hint">Aucun plugin chargé.</div>';
};

/* ---------- Galerie des thèmes (onglet Paramètres) ---------- */
BandUI.prototype.renderSettingsThemes = function () {
  var c = document.getElementById('bt-set-theme-grid');
  if (!c) return;
  c.innerHTML = '';
  var activeId = 'default';
  try { activeId = window.BTTStore.get('activeTheme', 'default'); } catch (e) {}
  var themes = window.BTTThemes.list();
  for (var i = 0; i < themes.length; i++) {
    var t = themes[i];
    var card = document.createElement('div');
    card.className = 'bt-theme-card' + (t.id === activeId ? ' bt-theme-active' : '');
    var merged = {};
    var defaults = window.BTTThemes.DEFAULT_COLORS;
    for (var k in defaults) if (Object.prototype.hasOwnProperty.call(defaults, k)) merged[k] = defaults[k];
    if (t.colors) for (var k2 in t.colors) if (Object.prototype.hasOwnProperty.call(t.colors, k2)) merged[k2] = t.colors[k2];
    var dots = '';
    var dotKeys = ['accent', 'bg', 'surface', 'text'];
    for (var d = 0; d < dotKeys.length; d++) dots += '<span class="bt-dot" style="background:' + merged[dotKeys[d]] + '"></span>';
    card.innerHTML = '<div class="bt-theme-name">' + escapeHtml(t.name) + (t.id === activeId ? ' ✓' : '') + '</div>' +
      '<div class="bt-theme-meta">' + escapeHtml(t.author || 'inconnu') + (t.version ? ' · v' + escapeHtml(t.version) : '') + (t.builtin ? ' · intégré' : ' · importé') + '</div>' +
      '<div class="bt-dots">' + dots + '</div>';
    var actions = document.createElement('div');
    actions.className = 'bt-set-actions';
    var applyBtn = document.createElement('button');
    applyBtn.type = 'button';
    applyBtn.className = 'bt-btn bt-btn-sm';
    applyBtn.textContent = t.id === activeId ? 'Appliqué' : 'Appliquer';
    applyBtn.setAttribute('data-act', 'theme-apply');
    applyBtn.setAttribute('data-id', t.id);
    actions.appendChild(applyBtn);
    var exp = document.createElement('button');
    exp.type = 'button';
    exp.className = 'bt-btn bt-btn-ghost bt-btn-sm';
    exp.textContent = 'Exporter';
    exp.setAttribute('data-act', 'theme-export');
    exp.setAttribute('data-id', t.id);
    actions.appendChild(exp);
    if (!t.builtin) {
      var rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'bt-btn bt-btn-danger bt-btn-sm';
      rm.textContent = 'Supprimer';
      rm.setAttribute('data-act', 'theme-remove');
      rm.setAttribute('data-id', t.id);
      actions.appendChild(rm);
    }
    card.appendChild(actions);
    c.appendChild(card);
  }
};


/* ---------- Délégation d'événements ---------- */
BandUI.prototype._findAct = function (target) {
  var el = target;
  while (el && el !== this.settingsEl) {
    if (el.getAttribute && el.getAttribute('data-act')) return el;
    el = el.parentElement;
  }
  return null;
};

BandUI.prototype._settingsClick = function (e) {
  var t = e && e.target;
  if (!t) return;
  var self = this;
  var toast = window.__BTT_toast || function () {};
  // fermeture
  if (t.id === 'bt-settings-close') { this.closeSettings(); return; }
  // onglets (data-tab)
  var el = t;
  while (el && el !== this.settingsEl) {
    if (el.getAttribute && el.getAttribute('data-tab')) { this._switchSettingsTab(el.getAttribute('data-tab')); return; }
    el = el.parentElement;
  }
  // actions (data-act)
  var actEl = this._findAct(t);
  if (!actEl) return;
  var act = actEl.getAttribute('data-act');
  var id = actEl.getAttribute('data-id');
  switch (act) {
    case 'add-plugin-url': {
      var input = document.getElementById('bt-set-plugin-url');
      var url = (input && input.value ? input.value : '').trim();
      if (!url) { toast('Colle d\'abord une URL', 'error'); return; }
      this.pm.loadPlugin(url, { enabled: true, source: 'url' })
        .then(function () { if (input) input.value = ''; toast('Plugin ajouté : ' + url, 'ok'); self.renderSettingsPlugins(); })
        .catch(function (err) { toast('Échec plugin : ' + err.message, 'error'); });
      return;
    }
    case 'import-plugin-file':
      this._pickFile('.js,.txt,text/javascript', function (code, name) {
        self.pm.loadPlugin('file:' + name, { enabled: true, source: 'file', code: code })
          .then(function () { toast('Plugin importé : ' + name, 'ok'); self.renderSettingsPlugins(); })
          .catch(function (err) { toast('Échec import : ' + err.message, 'error'); });
      });
      return;
    case 'plugin-toggle':
      this.pm.setEnabled(id, !this.pm.isEnabled(id));
      this.renderSettingsPlugins();
      return;
    case 'plugin-remove':
      this.pm.unloadPlugin(id);
      this.renderSettingsPlugins();
      toast('Plugin supprimé');
      return;
    case 'add-theme-url': {
      var tinput = document.getElementById('bt-set-theme-url');
      var turl = (tinput && tinput.value ? tinput.value : '').trim();
      if (!turl) { toast('Colle d\'abord une URL', 'error'); return; }
      window.BTTThemes.importFromUrl(turl)
        .then(function (t) { if (tinput) tinput.value = ''; toast('Thème importé : ' + t.name, 'ok'); self.renderSettingsThemes(); })
        .catch(function (err) { toast('Échec thème : ' + err.message, 'error'); });
      return;
    }
    case 'import-theme-file':
      this._pickFile('application/json,.json', function (raw) {
        try {
          var t = window.BTTThemes.importJson(JSON.parse(raw));
          toast('Thème importé : ' + t.name, 'ok');
          self.renderSettingsThemes();
        } catch (err) { toast('Échec import : ' + err.message, 'error'); }
      });
      return;
    case 'theme-apply': {
      var applied = window.BTTThemes.apply(id);
      toast('Thème appliqué : ' + applied.name, 'ok');
      this.renderSettingsThemes();
      return;
    }
    case 'theme-export':
      try { window.BTTThemes.exportTheme(id); toast('Thème exporté (fichier JSON)', 'ok'); }
      catch (err) { toast('Export impossible : ' + err.message, 'error'); }
      return;
    case 'theme-remove':
      window.BTTThemes.remove(id);
      this.renderSettingsThemes();
      toast('Thème supprimé');
      return;
  }
};


/* ---------- Actions CSS / config + options ---------- */
BandUI.prototype._settingsClick2 = function (actEl, act) {
  var toast = window.__BTT_toast || function () {};
  var self = this;
  switch (act) {
    case 'save-css': {
      var ta = document.getElementById('bt-set-css');
      window.BTTStyles.apply(ta ? ta.value : '');
      toast('CSS appliqué et enregistré', 'ok');
      return true;
    }
    case 'preview-css': {
      var pta = document.getElementById('bt-set-css');
      window.BTTStyles.apply(pta ? pta.value : '');
      toast('Aperçu appliqué (non enregistré)');
      return true;
    }
    case 'clear-css':
      window.BTTStyles.clear();
      this._renderSettingsCss();
      toast('CSS réinitialisé');
      return true;
    case 'export-config':
      this._exportConfig();
      return true;
    case 'import-config':
      this._importConfig();
      return true;
    case 'reset-all':
      this._resetAll();
      return true;
  }
  return false;
};

// branche la 2e moitié des actions (appelée depuis _settingsClick via _settingsClick2)
(function () {
  var orig = BandUI.prototype._settingsClick;
  BandUI.prototype._settingsClick = function (e) {
    var t = e && e.target;
    if (!t) return;
    orig.call(this, e);
    var actEl = this._findAct(t);
    if (!actEl) return;
    var act = actEl.getAttribute('data-act');
    this._settingsClick2(actEl, act);
  };
})();

BandUI.prototype._settingsChange = function (e) {
  var t = e && e.target;
  if (!t || !t.getAttribute) return;
  var act = t.getAttribute('data-act');
  if (act === 'opt-startup-toast') {
    window.BTTStore.set('startupToast', !!t.checked);
  } else if (act === 'opt-toast-duration') {
    window.BTTStore.set('toastDuration', Math.max(1, parseInt(t.value, 10) || 5));
  }
};

/* ---------- Helpers : fichiers, config ---------- */
BandUI.prototype._pickFile = function (accept, cb) {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = accept || '';
  input.style.display = 'none';
  input.onchange = function () {
    var f = input.files && input.files[0];
    if (!f) return;
    try {
      var reader = new FileReader();
      reader.onload = function () { cb(String(reader.result == null ? '' : reader.result), f.name || 'fichier'); };
      reader.onerror = function () { if (window.__BTT_toast) window.__BTT_toast('Lecture du fichier impossible', 'error'); };
      reader.readAsText(f);
    } catch (e2) { if (window.__BTT_toast) window.__BTT_toast('FileReader indisponible : ' + e2.message, 'error'); }
  };
  document.body.appendChild(input);
  input.click();
  setTimeout(function () { try { input.remove(); } catch (e3) {} }, 60000);
};

BandUI.prototype._downloadText = function (text, filename, mime) {
  var blob = new Blob([text], { type: mime || 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () { try { URL.revokeObjectURL(url); } catch (e) {} }, 1000);
};


BandUI.prototype._exportConfig = function () {
  try {
    var cfg = {
      app: 'unbanded',
      version: '1.6.2',
      exportedAt: new Date().toISOString(),
      options: {
        startupToast: window.BTTStore.get('startupToast', true) !== false,
        toastDuration: window.BTTStore.get('toastDuration', 5)
      },
      activeTheme: window.BTTStore.get('activeTheme', 'default'),
      customCss: window.BTTStyles.get(),
      themes: window.BTTThemes.imported(),
      plugins: window.BTTStore.get('plugins', [])
    };
    this._downloadText(JSON.stringify(cfg, null, 2), 'unbanded-config.json', 'application/json');
    (window.__BTT_toast || function () {})('Configuration exportée', 'ok');
  } catch (e) {
    (window.__BTT_toast || function () {})('Export impossible : ' + e.message, 'error');
  }
};

BandUI.prototype._importConfig = function () {
  var self = this;
  var toast = window.__BTT_toast || function () {};
  this._pickFile('application/json,.json', function (raw) {
    try {
      var cfg = JSON.parse(raw);
      if (!cfg || (cfg.app !== 'unbanded')) throw new Error('ce n\'est pas une config Unbanded');
      if (cfg.options) {
        window.BTTStore.set('startupToast', cfg.options.startupToast !== false);
        window.BTTStore.set('toastDuration', Math.max(1, parseInt(cfg.options.toastDuration, 10) || 5));
      }
      var importedCount = 0;
      if (Array.isArray(cfg.themes)) {
        for (var i = 0; i < cfg.themes.length; i++) {
          try { window.BTTThemes.importJson(cfg.themes[i]); importedCount++; } catch (eT) {}
        }
      }
      if (typeof cfg.customCss === 'string') window.BTTStyles.apply(cfg.customCss);
      if (cfg.activeTheme) window.BTTThemes.apply(cfg.activeTheme);
      if (Array.isArray(cfg.plugins)) window.BTTStore.set('plugins', cfg.plugins);
      toast('Config importée (' + importedCount + ' thème(s)) — recharge la page pour les plugins', 'ok');
      self._renderSettingsTab(self._settingsTab || 'general');
    } catch (err) { toast('Import impossible : ' + err.message, 'error'); }
  });
};

BandUI.prototype._resetAll = function () {
  if (typeof window.confirm === 'function' && !window.confirm('Tout réinitialiser ? (plugins, thèmes, CSS, options)')) return;
  var toast = window.__BTT_toast || function () {};
  try {
    var ids = [];
    for (var it = this.pm.plugins.entries(), step; !(step = it.next()).done; ) {
      if (!step.value[1].builtin) ids.push(step.value[0]);
    }
    for (var i = 0; i < ids.length; i++) this.pm.unloadPlugin(ids[i]);
    window.BTTStyles.clear();
    window.BTTStore.remove('themes');
    window.BTTStore.set('activeTheme', 'default');
    window.BTTThemes.apply('default');
    window.BTTStore.remove('plugins');
    window.BTTStore.remove('startupToast');
    window.BTTStore.remove('toastDuration');
    this._renderSettingsTab(this._settingsTab || 'general');
    toast('Réinitialisation effectuée', 'ok');
  } catch (e) { toast('Reset impossible : ' + e.message, 'error'); }
};

if (typeof module !== 'undefined' && module.exports) module.exports = BandUI;



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


/* Frames de main d'origine du projet pet-pet-gif (aDu) — https://github.com/aDu/pet-pet-gif
 * img/pet0.gif … img/pet9.gif, embarquées en data URI (généré par tools/embed-hand.js). */
(function () {
  window.__BTT_PET_HANDS = [
    "data:image/gif;base64,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",
    "data:image/gif;base64,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",
    "data:image/gif;base64,R0lGODlhcABwAPYAAAAAACYWCE4wI19FNn1OOW5URnpjVoJbTotmWZ5yVYVsYZJsYopzZpN2a4p3dJd8caR7bZSDYJuEdqOJa7OIaaKXbbGQbKKJfLOFeauVdrSbesejeZyMg6eOgruNhKWShauShq6bgqSWjK6Viq6ajrOZja6ekrWekbqlhq2jmLWilbuklb+sk7ammrqmmrSqn7qqnru1lr6uo8Orisa2jMipmMSuosSyp860o8S2qsy2q8e6rsu9rtC8pM6+stDDt9fHud7VueHMpNDJwubPwwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH5BAUCAAAALAAAAABwAHAAAAf+gACCg4SFhoeIiYqLjI2Oj5CRkpOUlZaXmJmam5ydnp+goaKjpKWmp6ipqqusra6vsLGys7S1tre4pT88uZFDv8DBwsPEPkM/wT7KOT45Ozm9hz/Iw9PW0z7Wx9fZ2D/Z3djNO8/lOdC5wdPA2j9A38re1+/wyvb3987POTfnOTIvXsw6RlDdNmvvgNC75m6awnr47EEkd66fRYA3bsjwwYraL4QKEzKkt7BhyIRAwNnjge8bD5YU/V2EIUMGjBctVHkk6O5kz4fWJMbz2VDZDh/kjrJc6oNH0n0VM9qEcRNnCoGkDK47CRThN3EtH6o0qo/cy6ZNY0bNKJUqjBb+KVoETEE3BbpM2YIR4YmSq8meQSMGxvc0adOlFC1qrFnTbYvHca/SfSFjR6ZtD4cEeTeEq+fP7yLGE520bGGoUhm7pfq4NVycASljndTzWEjAP0Hrhhjx5Q7fif0Jj9rY5lQXyFuseOzCtdzYcCkB/uxQ927eaF86fXpOhg0ZGsPX1OgWuQsVKs6fOFHihIn161W4lmwiBW2T1K1TB3v4rNPtTvHTmFvGUXWcCvCVoGAJIzQ4AgggONieCejVZwIJIqRgQiQi6echYIehZZZ22iVmkwtvrYBiC28hBwOCDDYIYQczdmDjjR04aMKFJGD4gQg7QuLhkF9hk1SJ/uj+4IySAsrQggvwrffee/A9CEIHF3SAwQUSXADBA1+CKUGXNjrYIIYYZrihI0N66JQyAZ7zzGKryYBic+itt2AJEPZZI5cShPlAAw0ssAAChhIqZpY3numjCUA6Ul2bfn1TWmonKpfneiSwN0KPDPZ5Y5akcgkBoQsUeigCBhxAwAEIIJpqAxCMSSaNEX4wwgckOKIMpUTBs8NMVCGIIHsKWkkjrjZy6ayt0D6waqyxHlDAANgO8OoBhs76JQQXhHvBlSPg2kg2wN6GVjNtvdWCCiX0qGy4ttYqwQO2PsDAvgsw0G+/ChwgcAECE4CtAAhjSwDBsSb6gJi32hhhr4v++JBuUNs9M+BjMMrI5cNfosqAAv02oK8BBaCscsoFtFyAwQcjLHO2LR9AcreE0hpouDaWwEhuRIY45w3lvespg+FK66+/Chjg9NNNtzyA1NdKPYAAMSMcgABbb4311AQLDKushYKZJQgiLHLxYZdOBYN6yZbQwZgMPP20y9eCffXBe2crs9YBdB344DNj67LYDYMcLsWIAGtpYhn9w5oKFyYLwgUNKODy1Nl2jvXfoMs8eOBcj2466QkrvO3YqXZ5gSKUuiTcYv9wzOODc2d+7eeha8116YQLfvrwxBdOwPECp7oAvgYkQilZw5LX2GO3YynByLuDTrzpwG/vffH+XyOPqMn4Ot8mUvwQvZrtJCgIwr3YX/379/QHP/oh3XdtfPKzcpDIpNb5QfpO9LbzwKt9DOqAvqJ2Nf3V73QIKwACKHGABhqvYYSSgP8OwYwhNUNyMFiBClaALAQ+6AIPcEDd5PdA7k2NE/LD2sL41wAGbNAQv3pISRqyi4rYBD17WhAJ3neyBrZwawMYRd+21TAGaFAa3UgJUniQAxLxQ0AvihuD4tWguTlAcwOo39dQsTuFhc2JNyRENt7ENipWxIchVAEJrGSmD8DPaUYs3gAOwIoEfE1bKRvZEwtBohLBiV1YfAt7roSjpDFAaoBzYSwikLCWGUABI+NAGgH+UEjt9Cd9khOhCUrwgVFxaWSayxsEbUGzlCkAX5vsJImWccWpvGuINuLAvVLptN0RLom4IIAAXnXJAjQglrI8izNqWSwXjBKXFxjZ3Q62teZF43gLK0AEKmCIZNpDTm3B0y2HqMsvoix7wIyGI7xJS7exxl1y5NP1moayq1lTneuU5QcjNyB3UQU5JyABCvdVzwLgExLevOINmuE2Fq0GSiDgwMlcdtBHUISKVBzWPoj1tic9lD0dqJvUKuoIctwgoxZRaCJXQxOLwIA9HKjbJS1AUkaoNKU4BeF4/pGR3+TgRSfQAApbBYEZCKGmiOjHsG4quX5MBTxO7elLdGD+gxWUAIWEggAFtroBpBaCqSllaUtv+hvt5MAGOGCB3DyggVNBIAEU6KpXwarSo/gwp2WdpQ9qsIK+okADJdDABCig1a2SlK4XiaqTpmKRssIpTuGxgQ1OugLAcikDFtiqBRJA01zAALH8cMun+hk5s/SHBzpQ6jmyoQO+IogEKmCBBiwwAwM8zAK47awsaNIkAfUDBmyx02PE2g9naKcHyMVBSqvIFqm8S44dEAEHLvCBCwyWsBDQqgUyoAEarIIqPzWQWMX7FuIq1Tc86IEPevCDfVAkKTcYFnhgcJUXraBcERpBCEDQnr5SKLYsOMV4y+NOKKWnOQ6lynmtESf+fqjlKSWKng3e1Ve+SnayNtHUCQBMigEn+KEj3PBzh6vg4aj2vFB5ClJMSjSiuYAFNjAQeVwgwuWMOAah8PA7QYweG6sgBS6iCU3Ac8Uiz6nIzDAxcMWKohD2ta8I5pgMAuyJ8vqTNcwJcgt2tCP0wHbDBiTQkKF6EabKQHIFYg5zUtDXDa+HhMai0Ao2MINOtCbKW16Oht5lIVDFC1TuKYGxmszSAglZNYZ+UnOc2aP2tQ9Zf46XpDdcgg3IVRPKMQ+CKbejRge00RECga52JepPkYBCHx7wP5PDsU59Wl5DfJCsJzYxU6sABey5NCZGGaUdbbnRn1IQsBtUSiz+NapHqM6yazRN4xV0qj3yklEpi13sG3Gg2jl6tAY80IEVaALWf/4xj9r3qSt94NwdKKW4OCAxR3P51CW4kLzZE9BPj4BPOLocvaDF7zGJC1cg0EAG0o2DTEColFeCEAnO/YEZfUCT/J6uxG2E8InNEdbkjnaETOksQN3rYSAP+cNsRSobZYBLI8jExDVp7XDpMl8iH3mXNDldnilcQjFi5I38na97EcoBOdtXzoaeM3xZdwIfex0mNHkBprN7TPhK4b72hUmqM8ABKZT5vVyHo4abskuC+jjIa2h1af6r6grAZA2V91YGJAACmdg6LDU59bTT026XvGTVr15DoDv+gN+AstfHJUB0omPS7nnXO9RQhngEwOpQcM1EClUYdQnc3W54SxnU7D71fQE95HIf1ND7tbS6Ix7v58Tb1FL/slglIAGZuPrUVShT1VuNapbcfN1nryjRF6pQdg/+6XvpMjByrnN529urHJ+JzUfNap2LYSsP5zTh733vCzi8AljlNO7bzVqbs9bfoh86bfExEywjfhl5l7XUGQ5vqI9/4ltlLfqrLPVTW5jf9va17P3xnphgSdAXQ70zM39EMyuTgJjHMuCXeQ4YfbAyKJZkKKSQTongNRhYgNEHNg7YgR4oNQtzSQclAPuCAIbjOb2zgSr4fteSTa70ABjgVZJJkEp5U0YbGDYI0ABKJ4M82IM++INAGIRCOIREWIRGeIRImIRKuIRM2IRO+IRQGIVSOIVUWIVWeIVYmIVauIVc2IVe+IVgCAmBAAA7",
    "data:image/gif;base64,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",
    "data:image/gif;base64,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",
    "data:image/gif;base64,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",
    "data:image/gif;base64,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",
    "data:image/gif;base64,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",
    "data:image/gif;base64,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",
    "data:image/gif;base64,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"
  ];
  if (typeof module !== 'undefined' && module.exports) module.exports = { HAND_FRAMES: window.__BTT_PET_HANDS };
})();


/* Encodeur GIF « gifenc » v1.0.3 — source vendorisée dans le userscript.
 * Aucune dépendance CDN ni Web Worker : fonctionne sous la CSP stricte de band.us.
 * MIT License — Copyright (c) Matt DesLauriers — https://github.com/mattdesl/gifenc
 * Expose : window.__BTT_GIFENC = { GIFEncoder, quantize, applyPalette } (API CJS incluse).
 * Régénérable : node tools/vendor-gifenc.js */
(function () {
  var module = { exports: {} };
  var exports = module.exports;
var __defProp = Object.defineProperty;
var __markAsModule = (target) => __defProp(target, "__esModule", {value: true});
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {get: all[name], enumerable: true});
};

// src/index.js
__markAsModule(exports);
__export(exports, {
  GIFEncoder: () => GIFEncoder,
  applyPalette: () => applyPalette,
  default: () => src_default,
  nearestColor: () => nearestColor,
  nearestColorIndex: () => nearestColorIndex,
  nearestColorIndexWithDistance: () => nearestColorIndexWithDistance,
  prequantize: () => prequantize,
  quantize: () => quantize,
  snapColorsToPalette: () => snapColorsToPalette
});

// src/constants.js
var constants_default = {
  signature: "GIF",
  version: "89a",
  trailer: 59,
  extensionIntroducer: 33,
  applicationExtensionLabel: 255,
  graphicControlExtensionLabel: 249,
  imageSeparator: 44,
  signatureSize: 3,
  versionSize: 3,
  globalColorTableFlagMask: 128,
  colorResolutionMask: 112,
  sortFlagMask: 8,
  globalColorTableSizeMask: 7,
  applicationIdentifierSize: 8,
  applicationAuthCodeSize: 3,
  disposalMethodMask: 28,
  userInputFlagMask: 2,
  transparentColorFlagMask: 1,
  localColorTableFlagMask: 128,
  interlaceFlagMask: 64,
  idSortFlagMask: 32,
  localColorTableSizeMask: 7
};

// src/stream.js
function createStream(initialCapacity = 256) {
  let cursor = 0;
  let contents = new Uint8Array(initialCapacity);
  return {
    get buffer() {
      return contents.buffer;
    },
    reset() {
      cursor = 0;
    },
    bytesView() {
      return contents.subarray(0, cursor);
    },
    bytes() {
      return contents.slice(0, cursor);
    },
    writeByte(byte) {
      expand(cursor + 1);
      contents[cursor] = byte;
      cursor++;
    },
    writeBytes(data, offset = 0, byteLength = data.length) {
      expand(cursor + byteLength);
      for (let i = 0; i < byteLength; i++) {
        contents[cursor++] = data[i + offset];
      }
    },
    writeBytesView(data, offset = 0, byteLength = data.byteLength) {
      expand(cursor + byteLength);
      contents.set(data.subarray(offset, offset + byteLength), cursor);
      cursor += byteLength;
    }
  };
  function expand(newCapacity) {
    var prevCapacity = contents.length;
    if (prevCapacity >= newCapacity)
      return;
    var CAPACITY_DOUBLING_MAX = 1024 * 1024;
    newCapacity = Math.max(newCapacity, prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125) >>> 0);
    if (prevCapacity != 0)
      newCapacity = Math.max(newCapacity, 256);
    const oldContents = contents;
    contents = new Uint8Array(newCapacity);
    if (cursor > 0)
      contents.set(oldContents.subarray(0, cursor), 0);
  }
}

// src/lzwEncode.js
var BITS = 12;
var DEFAULT_HSIZE = 5003;
var MASKS = [
  0,
  1,
  3,
  7,
  15,
  31,
  63,
  127,
  255,
  511,
  1023,
  2047,
  4095,
  8191,
  16383,
  32767,
  65535
];
function lzwEncode(width, height, pixels, colorDepth, outStream = createStream(512), accum = new Uint8Array(256), htab = new Int32Array(DEFAULT_HSIZE), codetab = new Int32Array(DEFAULT_HSIZE)) {
  const hsize = htab.length;
  const initCodeSize = Math.max(2, colorDepth);
  accum.fill(0);
  codetab.fill(0);
  htab.fill(-1);
  let cur_accum = 0;
  let cur_bits = 0;
  const init_bits = initCodeSize + 1;
  const g_init_bits = init_bits;
  let clear_flg = false;
  let n_bits = g_init_bits;
  let maxcode = (1 << n_bits) - 1;
  const ClearCode = 1 << init_bits - 1;
  const EOFCode = ClearCode + 1;
  let free_ent = ClearCode + 2;
  let a_count = 0;
  let ent = pixels[0];
  let hshift = 0;
  for (let fcode = hsize; fcode < 65536; fcode *= 2) {
    ++hshift;
  }
  hshift = 8 - hshift;
  outStream.writeByte(initCodeSize);
  output(ClearCode);
  const length = pixels.length;
  for (let idx = 1; idx < length; idx++) {
    next_block: {
      const c = pixels[idx];
      const fcode = (c << BITS) + ent;
      let i = c << hshift ^ ent;
      if (htab[i] === fcode) {
        ent = codetab[i];
        break next_block;
      }
      const disp = i === 0 ? 1 : hsize - i;
      while (htab[i] >= 0) {
        i -= disp;
        if (i < 0)
          i += hsize;
        if (htab[i] === fcode) {
          ent = codetab[i];
          break next_block;
        }
      }
      output(ent);
      ent = c;
      if (free_ent < 1 << BITS) {
        codetab[i] = free_ent++;
        htab[i] = fcode;
      } else {
        htab.fill(-1);
        free_ent = ClearCode + 2;
        clear_flg = true;
        output(ClearCode);
      }
    }
  }
  output(ent);
  output(EOFCode);
  outStream.writeByte(0);
  return outStream.bytesView();
  function output(code) {
    cur_accum &= MASKS[cur_bits];
    if (cur_bits > 0)
      cur_accum |= code << cur_bits;
    else
      cur_accum = code;
    cur_bits += n_bits;
    while (cur_bits >= 8) {
      accum[a_count++] = cur_accum & 255;
      if (a_count >= 254) {
        outStream.writeByte(a_count);
        outStream.writeBytesView(accum, 0, a_count);
        a_count = 0;
      }
      cur_accum >>= 8;
      cur_bits -= 8;
    }
    if (free_ent > maxcode || clear_flg) {
      if (clear_flg) {
        n_bits = g_init_bits;
        maxcode = (1 << n_bits) - 1;
        clear_flg = false;
      } else {
        ++n_bits;
        maxcode = n_bits === BITS ? 1 << n_bits : (1 << n_bits) - 1;
      }
    }
    if (code == EOFCode) {
      while (cur_bits > 0) {
        accum[a_count++] = cur_accum & 255;
        if (a_count >= 254) {
          outStream.writeByte(a_count);
          outStream.writeBytesView(accum, 0, a_count);
          a_count = 0;
        }
        cur_accum >>= 8;
        cur_bits -= 8;
      }
      if (a_count > 0) {
        outStream.writeByte(a_count);
        outStream.writeBytesView(accum, 0, a_count);
        a_count = 0;
      }
    }
  }
}
var lzwEncode_default = lzwEncode;

// src/rgb-packing.js
function rgb888_to_rgb565(r, g, b) {
  return r << 8 & 63488 | g << 2 & 992 | b >> 3;
}
function rgba8888_to_rgba4444(r, g, b, a) {
  return r >> 4 | g & 240 | (b & 240) << 4 | (a & 240) << 8;
}
function rgb888_to_rgb444(r, g, b) {
  return r >> 4 << 8 | g & 240 | b >> 4;
}

// src/pnnquant2.js
function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}
function sqr(value) {
  return value * value;
}
function find_nn(bins, idx, hasAlpha) {
  var nn = 0;
  var err = 1e100;
  const bin1 = bins[idx];
  const n1 = bin1.cnt;
  const wa = bin1.ac;
  const wr = bin1.rc;
  const wg = bin1.gc;
  const wb = bin1.bc;
  for (var i = bin1.fw; i != 0; i = bins[i].fw) {
    const bin = bins[i];
    const n2 = bin.cnt;
    const nerr2 = n1 * n2 / (n1 + n2);
    if (nerr2 >= err)
      continue;
    var nerr = 0;
    if (hasAlpha) {
      nerr += nerr2 * sqr(bin.ac - wa);
      if (nerr >= err)
        continue;
    }
    nerr += nerr2 * sqr(bin.rc - wr);
    if (nerr >= err)
      continue;
    nerr += nerr2 * sqr(bin.gc - wg);
    if (nerr >= err)
      continue;
    nerr += nerr2 * sqr(bin.bc - wb);
    if (nerr >= err)
      continue;
    err = nerr;
    nn = i;
  }
  bin1.err = err;
  bin1.nn = nn;
}
function create_bin() {
  return {
    ac: 0,
    rc: 0,
    gc: 0,
    bc: 0,
    cnt: 0,
    nn: 0,
    fw: 0,
    bk: 0,
    tm: 0,
    mtm: 0,
    err: 0
  };
}
function create_bin_list(data, format) {
  const bincount = format === "rgb444" ? 4096 : 65536;
  const bins = new Array(bincount);
  const size = data.length;
  if (format === "rgba4444") {
    for (let i = 0; i < size; ++i) {
      const color = data[i];
      const a = color >> 24 & 255;
      const b = color >> 16 & 255;
      const g = color >> 8 & 255;
      const r = color & 255;
      const index = rgba8888_to_rgba4444(r, g, b, a);
      let bin = index in bins ? bins[index] : bins[index] = create_bin();
      bin.rc += r;
      bin.gc += g;
      bin.bc += b;
      bin.ac += a;
      bin.cnt++;
    }
  } else if (format === "rgb444") {
    for (let i = 0; i < size; ++i) {
      const color = data[i];
      const b = color >> 16 & 255;
      const g = color >> 8 & 255;
      const r = color & 255;
      const index = rgb888_to_rgb444(r, g, b);
      let bin = index in bins ? bins[index] : bins[index] = create_bin();
      bin.rc += r;
      bin.gc += g;
      bin.bc += b;
      bin.cnt++;
    }
  } else {
    for (let i = 0; i < size; ++i) {
      const color = data[i];
      const b = color >> 16 & 255;
      const g = color >> 8 & 255;
      const r = color & 255;
      const index = rgb888_to_rgb565(r, g, b);
      let bin = index in bins ? bins[index] : bins[index] = create_bin();
      bin.rc += r;
      bin.gc += g;
      bin.bc += b;
      bin.cnt++;
    }
  }
  return bins;
}
function quantize(rgba, maxColors, opts = {}) {
  const {
    format = "rgb565",
    clearAlpha = true,
    clearAlphaColor = 0,
    clearAlphaThreshold = 0,
    oneBitAlpha = false
  } = opts;
  if (!rgba || !rgba.buffer) {
    throw new Error("quantize() expected RGBA Uint8Array data");
  }
  if (!(rgba instanceof Uint8Array) && !(rgba instanceof Uint8ClampedArray)) {
    throw new Error("quantize() expected RGBA Uint8Array data");
  }
  const data = new Uint32Array(rgba.buffer);
  let useSqrt = opts.useSqrt !== false;
  const hasAlpha = format === "rgba4444";
  const bins = create_bin_list(data, format);
  const bincount = bins.length;
  const bincountMinusOne = bincount - 1;
  const heap = new Uint32Array(bincount + 1);
  var maxbins = 0;
  for (var i = 0; i < bincount; ++i) {
    const bin = bins[i];
    if (bin != null) {
      var d = 1 / bin.cnt;
      if (hasAlpha)
        bin.ac *= d;
      bin.rc *= d;
      bin.gc *= d;
      bin.bc *= d;
      bins[maxbins++] = bin;
    }
  }
  if (sqr(maxColors) / maxbins < 0.022) {
    useSqrt = false;
  }
  var i = 0;
  for (; i < maxbins - 1; ++i) {
    bins[i].fw = i + 1;
    bins[i + 1].bk = i;
    if (useSqrt)
      bins[i].cnt = Math.sqrt(bins[i].cnt);
  }
  if (useSqrt)
    bins[i].cnt = Math.sqrt(bins[i].cnt);
  var h, l, l2;
  for (i = 0; i < maxbins; ++i) {
    find_nn(bins, i, false);
    var err = bins[i].err;
    for (l = ++heap[0]; l > 1; l = l2) {
      l2 = l >> 1;
      if (bins[h = heap[l2]].err <= err)
        break;
      heap[l] = h;
    }
    heap[l] = i;
  }
  var extbins = maxbins - maxColors;
  for (i = 0; i < extbins; ) {
    var tb;
    for (; ; ) {
      var b1 = heap[1];
      tb = bins[b1];
      if (tb.tm >= tb.mtm && bins[tb.nn].mtm <= tb.tm)
        break;
      if (tb.mtm == bincountMinusOne)
        b1 = heap[1] = heap[heap[0]--];
      else {
        find_nn(bins, b1, false);
        tb.tm = i;
      }
      var err = bins[b1].err;
      for (l = 1; (l2 = l + l) <= heap[0]; l = l2) {
        if (l2 < heap[0] && bins[heap[l2]].err > bins[heap[l2 + 1]].err)
          l2++;
        if (err <= bins[h = heap[l2]].err)
          break;
        heap[l] = h;
      }
      heap[l] = b1;
    }
    var nb = bins[tb.nn];
    var n1 = tb.cnt;
    var n2 = nb.cnt;
    var d = 1 / (n1 + n2);
    if (hasAlpha)
      tb.ac = d * (n1 * tb.ac + n2 * nb.ac);
    tb.rc = d * (n1 * tb.rc + n2 * nb.rc);
    tb.gc = d * (n1 * tb.gc + n2 * nb.gc);
    tb.bc = d * (n1 * tb.bc + n2 * nb.bc);
    tb.cnt += nb.cnt;
    tb.mtm = ++i;
    bins[nb.bk].fw = nb.fw;
    bins[nb.fw].bk = nb.bk;
    nb.mtm = bincountMinusOne;
  }
  let palette = [];
  var k = 0;
  for (i = 0; ; ++k) {
    let r = clamp(Math.round(bins[i].rc), 0, 255);
    let g = clamp(Math.round(bins[i].gc), 0, 255);
    let b = clamp(Math.round(bins[i].bc), 0, 255);
    let a = 255;
    if (hasAlpha) {
      a = clamp(Math.round(bins[i].ac), 0, 255);
      if (oneBitAlpha) {
        const threshold = typeof oneBitAlpha === "number" ? oneBitAlpha : 127;
        a = a <= threshold ? 0 : 255;
      }
      if (clearAlpha && a <= clearAlphaThreshold) {
        r = g = b = clearAlphaColor;
        a = 0;
      }
    }
    const color = hasAlpha ? [r, g, b, a] : [r, g, b];
    const exists = existsInPalette(palette, color);
    if (!exists)
      palette.push(color);
    if ((i = bins[i].fw) == 0)
      break;
  }
  return palette;
}
function existsInPalette(palette, color) {
  for (let i = 0; i < palette.length; i++) {
    const p = palette[i];
    let matchesRGB = p[0] === color[0] && p[1] === color[1] && p[2] === color[2];
    let matchesAlpha = p.length >= 4 && color.length >= 4 ? p[3] === color[3] : true;
    if (matchesRGB && matchesAlpha)
      return true;
  }
  return false;
}

// src/color.js
function euclideanDistanceSquared(a, b) {
  var sum = 0;
  var n;
  for (n = 0; n < a.length; n++) {
    const dx = a[n] - b[n];
    sum += dx * dx;
  }
  return sum;
}

// src/palettize.js
function roundStep(byte, step) {
  return step > 1 ? Math.round(byte / step) * step : byte;
}
function prequantize(rgba, {roundRGB = 5, roundAlpha = 10, oneBitAlpha = null} = {}) {
  const data = new Uint32Array(rgba.buffer);
  for (let i = 0; i < data.length; i++) {
    const color = data[i];
    let a = color >> 24 & 255;
    let b = color >> 16 & 255;
    let g = color >> 8 & 255;
    let r = color & 255;
    a = roundStep(a, roundAlpha);
    if (oneBitAlpha) {
      const threshold = typeof oneBitAlpha === "number" ? oneBitAlpha : 127;
      a = a <= threshold ? 0 : 255;
    }
    r = roundStep(r, roundRGB);
    g = roundStep(g, roundRGB);
    b = roundStep(b, roundRGB);
    data[i] = a << 24 | b << 16 | g << 8 | r << 0;
  }
}
function applyPalette(rgba, palette, format = "rgb565") {
  if (!rgba || !rgba.buffer) {
    throw new Error("quantize() expected RGBA Uint8Array data");
  }
  if (!(rgba instanceof Uint8Array) && !(rgba instanceof Uint8ClampedArray)) {
    throw new Error("quantize() expected RGBA Uint8Array data");
  }
  if (palette.length > 256) {
    throw new Error("applyPalette() only works with 256 colors or less");
  }
  const data = new Uint32Array(rgba.buffer);
  const length = data.length;
  const bincount = format === "rgb444" ? 4096 : 65536;
  const index = new Uint8Array(length);
  const cache = new Array(bincount);
  const hasAlpha = format === "rgba4444";
  if (format === "rgba4444") {
    for (let i = 0; i < length; i++) {
      const color = data[i];
      const a = color >> 24 & 255;
      const b = color >> 16 & 255;
      const g = color >> 8 & 255;
      const r = color & 255;
      const key = rgba8888_to_rgba4444(r, g, b, a);
      const idx = key in cache ? cache[key] : cache[key] = nearestColorIndexRGBA(r, g, b, a, palette);
      index[i] = idx;
    }
  } else {
    const rgb888_to_key = format === "rgb444" ? rgb888_to_rgb444 : rgb888_to_rgb565;
    for (let i = 0; i < length; i++) {
      const color = data[i];
      const b = color >> 16 & 255;
      const g = color >> 8 & 255;
      const r = color & 255;
      const key = rgb888_to_key(r, g, b);
      const idx = key in cache ? cache[key] : cache[key] = nearestColorIndexRGB(r, g, b, palette);
      index[i] = idx;
    }
  }
  return index;
}
function nearestColorIndexRGBA(r, g, b, a, palette) {
  let k = 0;
  let mindist = 1e100;
  for (let i = 0; i < palette.length; i++) {
    const px2 = palette[i];
    const a2 = px2[3];
    let curdist = sqr2(a2 - a);
    if (curdist > mindist)
      continue;
    const r2 = px2[0];
    curdist += sqr2(r2 - r);
    if (curdist > mindist)
      continue;
    const g2 = px2[1];
    curdist += sqr2(g2 - g);
    if (curdist > mindist)
      continue;
    const b2 = px2[2];
    curdist += sqr2(b2 - b);
    if (curdist > mindist)
      continue;
    mindist = curdist;
    k = i;
  }
  return k;
}
function nearestColorIndexRGB(r, g, b, palette) {
  let k = 0;
  let mindist = 1e100;
  for (let i = 0; i < palette.length; i++) {
    const px2 = palette[i];
    const r2 = px2[0];
    let curdist = sqr2(r2 - r);
    if (curdist > mindist)
      continue;
    const g2 = px2[1];
    curdist += sqr2(g2 - g);
    if (curdist > mindist)
      continue;
    const b2 = px2[2];
    curdist += sqr2(b2 - b);
    if (curdist > mindist)
      continue;
    mindist = curdist;
    k = i;
  }
  return k;
}
function snapColorsToPalette(palette, knownColors, threshold = 5) {
  if (!palette.length || !knownColors.length)
    return;
  const paletteRGB = palette.map((p) => p.slice(0, 3));
  const thresholdSq = threshold * threshold;
  const dim = palette[0].length;
  for (let i = 0; i < knownColors.length; i++) {
    let color = knownColors[i];
    if (color.length < dim) {
      color = [color[0], color[1], color[2], 255];
    } else if (color.length > dim) {
      color = color.slice(0, 3);
    } else {
      color = color.slice();
    }
    const r = nearestColorIndexWithDistance(paletteRGB, color.slice(0, 3), euclideanDistanceSquared);
    const idx = r[0];
    const distanceSq = r[1];
    if (distanceSq > 0 && distanceSq <= thresholdSq) {
      palette[idx] = color;
    }
  }
}
function sqr2(a) {
  return a * a;
}
function nearestColorIndex(colors, pixel, distanceFn = euclideanDistanceSquared) {
  let minDist = Infinity;
  let minDistIndex = -1;
  for (let j = 0; j < colors.length; j++) {
    const paletteColor = colors[j];
    const dist = distanceFn(pixel, paletteColor);
    if (dist < minDist) {
      minDist = dist;
      minDistIndex = j;
    }
  }
  return minDistIndex;
}
function nearestColorIndexWithDistance(colors, pixel, distanceFn = euclideanDistanceSquared) {
  let minDist = Infinity;
  let minDistIndex = -1;
  for (let j = 0; j < colors.length; j++) {
    const paletteColor = colors[j];
    const dist = distanceFn(pixel, paletteColor);
    if (dist < minDist) {
      minDist = dist;
      minDistIndex = j;
    }
  }
  return [minDistIndex, minDist];
}
function nearestColor(colors, pixel, distanceFn = euclideanDistanceSquared) {
  return colors[nearestColorIndex(colors, pixel, distanceFn)];
}

// src/index.js
function GIFEncoder(opt = {}) {
  const {initialCapacity = 4096, auto = true} = opt;
  const stream = createStream(initialCapacity);
  const HSIZE = 5003;
  const accum = new Uint8Array(256);
  const htab = new Int32Array(HSIZE);
  const codetab = new Int32Array(HSIZE);
  let hasInit = false;
  return {
    reset() {
      stream.reset();
      hasInit = false;
    },
    finish() {
      stream.writeByte(constants_default.trailer);
    },
    bytes() {
      return stream.bytes();
    },
    bytesView() {
      return stream.bytesView();
    },
    get buffer() {
      return stream.buffer;
    },
    get stream() {
      return stream;
    },
    writeHeader,
    writeFrame(index, width, height, opts = {}) {
      const {
        transparent = false,
        transparentIndex = 0,
        delay = 0,
        palette = null,
        repeat = 0,
        colorDepth = 8,
        dispose = -1
      } = opts;
      let first = false;
      if (auto) {
        if (!hasInit) {
          first = true;
          writeHeader();
          hasInit = true;
        }
      } else {
        first = Boolean(opts.first);
      }
      width = Math.max(0, Math.floor(width));
      height = Math.max(0, Math.floor(height));
      if (first) {
        if (!palette) {
          throw new Error("First frame must include a { palette } option");
        }
        encodeLogicalScreenDescriptor(stream, width, height, palette, colorDepth);
        encodeColorTable(stream, palette);
        if (repeat >= 0) {
          encodeNetscapeExt(stream, repeat);
        }
      }
      const delayTime = Math.round(delay / 10);
      encodeGraphicControlExt(stream, dispose, delayTime, transparent, transparentIndex);
      const useLocalColorTable = Boolean(palette) && !first;
      encodeImageDescriptor(stream, width, height, useLocalColorTable ? palette : null);
      if (useLocalColorTable)
        encodeColorTable(stream, palette);
      encodePixels(stream, index, width, height, colorDepth, accum, htab, codetab);
    }
  };
  function writeHeader() {
    writeUTFBytes(stream, "GIF89a");
  }
}
function encodeGraphicControlExt(stream, dispose, delay, transparent, transparentIndex) {
  stream.writeByte(33);
  stream.writeByte(249);
  stream.writeByte(4);
  if (transparentIndex < 0) {
    transparentIndex = 0;
    transparent = false;
  }
  var transp, disp;
  if (!transparent) {
    transp = 0;
    disp = 0;
  } else {
    transp = 1;
    disp = 2;
  }
  if (dispose >= 0) {
    disp = dispose & 7;
  }
  disp <<= 2;
  const userInput = 0;
  stream.writeByte(0 | disp | userInput | transp);
  writeUInt16(stream, delay);
  stream.writeByte(transparentIndex || 0);
  stream.writeByte(0);
}
function encodeLogicalScreenDescriptor(stream, width, height, palette, colorDepth = 8) {
  const globalColorTableFlag = 1;
  const sortFlag = 0;
  const globalColorTableSize = colorTableSize(palette.length) - 1;
  const fields = globalColorTableFlag << 7 | colorDepth - 1 << 4 | sortFlag << 3 | globalColorTableSize;
  const backgroundColorIndex = 0;
  const pixelAspectRatio = 0;
  writeUInt16(stream, width);
  writeUInt16(stream, height);
  stream.writeBytes([fields, backgroundColorIndex, pixelAspectRatio]);
}
function encodeNetscapeExt(stream, repeat) {
  stream.writeByte(33);
  stream.writeByte(255);
  stream.writeByte(11);
  writeUTFBytes(stream, "NETSCAPE2.0");
  stream.writeByte(3);
  stream.writeByte(1);
  writeUInt16(stream, repeat);
  stream.writeByte(0);
}
function encodeColorTable(stream, palette) {
  const colorTableLength = 1 << colorTableSize(palette.length);
  for (let i = 0; i < colorTableLength; i++) {
    let color = [0, 0, 0];
    if (i < palette.length) {
      color = palette[i];
    }
    stream.writeByte(color[0]);
    stream.writeByte(color[1]);
    stream.writeByte(color[2]);
  }
}
function encodeImageDescriptor(stream, width, height, localPalette) {
  stream.writeByte(44);
  writeUInt16(stream, 0);
  writeUInt16(stream, 0);
  writeUInt16(stream, width);
  writeUInt16(stream, height);
  if (localPalette) {
    const interlace = 0;
    const sorted = 0;
    const palSize = colorTableSize(localPalette.length) - 1;
    stream.writeByte(128 | interlace | sorted | 0 | palSize);
  } else {
    stream.writeByte(0);
  }
}
function encodePixels(stream, index, width, height, colorDepth = 8, accum, htab, codetab) {
  lzwEncode_default(width, height, index, colorDepth, stream, accum, htab, codetab);
}
function writeUInt16(stream, short) {
  stream.writeByte(short & 255);
  stream.writeByte(short >> 8 & 255);
}
function writeUTFBytes(stream, text) {
  for (var i = 0; i < text.length; i++) {
    stream.writeByte(text.charCodeAt(i));
  }
}
function colorTableSize(length) {
  return Math.max(Math.ceil(Math.log2(length)), 1);
}
var src_default = GIFEncoder;
  window.__BTT_GIFENC = {
    GIFEncoder: exports.GIFEncoder,
    quantize: exports.quantize,
    applyPalette: exports.applyPalette
  };
})();


(function () {
  // Portage navigateur de pet-pet-gif (aDu) — https://github.com/aDu/pet-pet-gif
  // Algorithme EXACT de index.js du dépôt :
  //   • 10 frames, delay 20 ms, résolution 128×128 par défaut
  //   • avatar écrasé/rebondi : j = i < FRAMES/2 ? i : FRAMES - i ;
  //     width = 0.8 + j*0.02 ; height = 0.8 - j*0.05 ;
  //     offsetX = (1-width)*0.5 + 0.1 ; offsetY = (1-height) - 0.08
  //   • image de main d'origine (img/pet{i}.gif) superposée à chaque frame
  // Encodage GIF 100 % local via gifenc vendorisé (src/vendor/gifenc.js) : aucun
  // script CDN, aucun Web Worker — compatible CSP stricte de band.us (c'est ce qui
  // faisait échouer gif.js/unpkg et laissait la photo statique). Transparence par
  // masque magenta rendu transparent (dispose: 2 = « restore to background » pour
  // éviter les fantômes de frames précédentes). Frames de main en base64 :
  // src/petpet-hand.js (window.__BTT_PET_HANDS).

  var FRAMES = 10;
  var DEFAULT_RESOLUTION = 128; // aDu : options.resolution
  var DEFAULT_DELAY = 20;       // aDu : options.delay (ms)
  var HAND_FRAMES = window.__BTT_PET_HANDS || [];
  var MASK_COLOR = '#ff00ff';
  var MASK_RGB = [255, 0, 255];

  function loadImage(url) {
    return new Promise(function (res, rej) {
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () { res(img); };
      img.onerror = function () { rej(new Error('image indisponible')); };
      img.src = url;
    });
  }

  var handsPromise = null;
  function loadHandFrames() {
    if (!handsPromise) {
      handsPromise = Promise.all(HAND_FRAMES.map(function (uri) {
        return loadImage(uri).catch(function () { return null; });
      }));
    }
    return handsPromise;
  }

  // Index de la couleur la plus proche du magenta dans la palette gifenc
  // (array de [r, g, b]) : c'est elle qui devient transparente.
  function findMaskIndex(palette) {
    var best = -1, bestDist = Infinity;
    for (var k = 0; k < palette.length; k++) {
      var c = palette[k];
      var d = (c[0] - MASK_RGB[0]) * (c[0] - MASK_RGB[0]) +
              (c[1] - MASK_RGB[1]) * (c[1] - MASK_RGB[1]) +
              (c[2] - MASK_RGB[2]) * (c[2] - MASK_RGB[2]);
      if (d < bestDist) { bestDist = d; best = k; }
    }
    return best;
  }

  // Fallback statique (PNG) si l'encodage échoue ou si l'avatar est injoignable
  function staticFallback(img, resolution, backgroundColor) {
    var c = document.createElement('canvas');
    c.width = resolution;
    c.height = resolution;
    var cx = c.getContext('2d');
    cx.fillStyle = backgroundColor || '#f5f5f5';
    cx.fillRect(0, 0, resolution, resolution);
    if (img) {
      var iw = img.width || resolution;
      var ih = img.height || resolution;
      var s = Math.min(resolution / iw, resolution / ih);
      cx.drawImage(img, (resolution - iw * s) / 2, (resolution - ih * s) / 2, iw * s, ih * s);
    } else {
      cx.fillStyle = '#ccc';
      cx.fillRect(resolution * 0.3, resolution * 0.3, resolution * 0.4, resolution * 0.4);
    }
    return new Promise(function (res) { c.toBlob(res, 'image/png'); });
  }

  // Génère le GIF « pet-pet » (Blob image/gif) — encodage 100 % local via gifenc,
  // aucune dépendance réseau ni worker. Fallback PNG statique si l'avatar est
  // injoignable ou si le canvas réel est indisponible.
  async function generatePetGif(avatarUrl, opts) {
    var o = opts || {};
    var resolution = o.resolution || DEFAULT_RESOLUTION;
    var delay = o.delay || DEFAULT_DELAY;
    var backgroundColor = o.backgroundColor || null;
    var enc = window.__BTT_GIFENC;
    var img = null;
    try { img = await loadImage(avatarUrl); } catch (e) { /* avatar injoignable */ }
    if (!enc || typeof enc.GIFEncoder !== 'function' || typeof enc.quantize !== 'function' ||
        typeof enc.applyPalette !== 'function' || !img) {
      return staticFallback(img, resolution, backgroundColor);
    }

    var hands = await loadHandFrames();
    var canvas = document.createElement('canvas');
    canvas.width = resolution;
    canvas.height = resolution;
    var ctx = canvas.getContext('2d');

    try {
      var gif = enc.GIFEncoder();
      for (var i = 0; i < FRAMES; i++) {
        // Fond opaque magenta (masqué en transparence) ou couleur demandée
        ctx.fillStyle = backgroundColor || MASK_COLOR;
        ctx.fillRect(0, 0, resolution, resolution);

        // Algorithme aDu/pet-pet-gif : l'avatar s'écrase puis revient (10 frames)
        var j = i < FRAMES / 2 ? i : FRAMES - i;
        var width = 0.8 + j * 0.02;
        var height = 0.8 - j * 0.05;
        var offsetX = (1 - width) * 0.5 + 0.1;
        var offsetY = (1 - height) - 0.08;
        ctx.drawImage(img, resolution * offsetX, resolution * offsetY, resolution * width, resolution * height);

        // Main qui tape : image d'origine pet{i}.gif superposée pleine taille
        var hand = hands[i];
        if (hand) ctx.drawImage(hand, 0, 0, resolution, resolution);

        var data = ctx.getImageData(0, 0, resolution, resolution).data;
        if (!data || data.length !== resolution * resolution * 4) {
          throw new Error('getImageData invalide (canvas non réel ?)');
        }

        // Quantification locale (PNN) + palette appliquée, comme gifencoder côté Node
        var palette = enc.quantize(data, 256);
        var tIdx = findMaskIndex(palette);
        var index = enc.applyPalette(data, palette);
        gif.writeFrame(index, resolution, resolution, {
          palette: palette,
          delay: delay,
          transparent: !backgroundColor && tIdx >= 0,
          transparentIndex: tIdx >= 0 ? tIdx : 0,
          dispose: 2 // « restore to background » : évite les fantômes entre frames
        });
      }
      gif.finish();
      return new Blob([gif.bytes()], { type: 'image/gif' });
    } catch (e) {
      if (window.__BTT_LOG) {
        console.warn('[Unbanded] Encodage GIF impossible, PNG statique :', e && e.message);
      }
      return staticFallback(img, resolution, backgroundColor);
    }
  }

  generatePetGif.frames = FRAMES;
  generatePetGif.handCount = HAND_FRAMES.length;

  window.__BTT_PetGif = generatePetGif;
  if (typeof module !== 'undefined' && module.exports) module.exports = { generatePetGif: generatePetGif };
})();


/**
 * Plugin par défaut "pet-pet" inspiré de https://github.com/aDu/pet-pet-gif
 * Commande : /pat [user]
 *   - en DM : pas besoin de user (cible la personne de la conversation)
 *   - en groupe : user requis (mention @pseudo ou nom)
 */
(function () {
  var PLUGIN = {
    name: 'pet-pet',
    version: '1.0.0',
    description: "Génère un GIF pet-pet à envoyer dans la conversation (aDu/pet-pet-gif)",
    onLoad: function (ctx) {
      var self = this;
      ctx.registerCommand('pat', 'Fait un pet-pet à quelqu\'un. Usage: /pat [user] (user requis en groupe)', function (args, info) {
        return self._run(args, info);
      });
    },
    _run: async function (args, info) {
      var type = info.getConversationType();
      var target;
      if (type === 'group') {
        if (!args.length) {
          throw new Error('En groupe, l\'utilisateur est requis : /pat @pseudo');
        }
        target = info.getUserByMention(args[0]);
        if (!target) {
          target = info.getUserByMention(args.join(' '));
        }
        if (!target) {
          throw new Error('Utilisateur introuvable : ' + args[0]);
        }
      } else {
        var me = info.getCurrentUser();
        target = info.getUserByMention('@' + (me && me.name ? me.name : '')) || me;
      }
      var avatar = info.getUserAvatar(target);
      if (!avatar) {
        throw new Error('Pas d\'avatar trouvé pour ' + (target && target.name ? target.name : target));
      }
      var generate = window.__BTT_PetGif;
      if (!generate) {
        throw new Error('Générateur de GIF indisponible');
      }
      if (window.__BTT_toast) window.__BTT_toast('⏳ Génération du GIF pour ' + (target && target.name ? target.name : '?') + '…');
      var blob = await generate(avatar);
      var isGif = !!(blob && blob.type === 'image/gif');
      var ext = isGif ? 'gif' : 'png';
      var fileName = 'pet-' + ((target && target.name) ? String(target.name).replace(/\s+/g, '_') : 'user') + '.' + ext;
      await info.sendFile(blob, fileName);
      var who = (target && target.name ? target.name : '?');
      if (isGif) {
        if (window.__BTT_toast) window.__BTT_toast('✅ GIF pet-pet envoyé à ' + who, 'ok');
      } else if (window.__BTT_toast) {
        window.__BTT_toast('⚠ Image statique envoyée à ' + who + ' (GIF animé indisponible)', 'warn');
      }
    }
  };
  window.PluginPetPet = PLUGIN;
  if (typeof module !== 'undefined' && module.exports) module.exports = PLUGIN;
})();


(function () {
  'use strict';

  var adapter = new window.BandAdapter();
  var pm = new window.PluginManager(adapter, null);
  var ui = new window.BandUI(pm, adapter);
  pm.ui = ui;

  (async function () {
    window.registerBuiltInCommands(pm);
    if (window.PluginPetPet) {
      pm.registerBuiltin(window.PluginPetPet);
    }
    // Thème actif + CSS personnalisé (persistés)
    try { window.BTTThemes.applyActive(); } catch (eTheme) { console.warn('[Unbanded] Thème :', eTheme); }
    try { window.BTTStyles.apply(window.BTTStyles.get()); } catch (eCss) { console.warn('[Unbanded] CSS perso :', eCss); }
    // Plugins persistés (imports URL/fichier des sessions précédentes)
    try { await pm.loadPersisted(); } catch (ePersist) { console.warn('[Unbanded] Plugins persistés :', ePersist); }
    ui.inject();
    var showToast = true;
    try { showToast = window.BTTStore.get('startupToast', true) !== false; } catch (eOpt) {}
    if (showToast && window.__BTT_toast) {
      window.__BTT_toast('✓ Unbanded v1.6.2 chargé — /help pour les commandes, /settings pour les paramètres', 'ok');
    }
    console.log('[Unbanded] Prêt. Plugins : ' + pm.plugins.size + ' | Commandes : ' + pm.commands.size);
    var tick = setInterval(function () {
      try { ui.ensureInjected(); } catch (e) {}
    }, 2500);
    if (tick && typeof tick.unref === 'function') tick.unref();
  })();
})();


})();
