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

  // Restyle des éléments Band Tamper existants (panneau, bouton) via variables CSS.
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