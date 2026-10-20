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
    { id: 'default', name: 'Site default', author: 'Unbanded', builtin: true, colors: {}, site: true },
    { id: 'midnight', name: 'Midnight', author: 'Unbanded', builtin: true, colors: { accent: '#3b82f6', accentHover: '#2563eb', bg: '#0b1220', surface: '#111a2e', surface2: '#16233c', text: '#e8eef7', muted: '#8ea3bf', border: '#1f2f4a' } },
    { id: 'dracula', name: 'Dracula', author: 'Unbanded', builtin: true, colors: { accent: '#bd93f9', accentHover: '#a77bf3', bg: '#282a36', surface: '#21222c', surface2: '#343746', text: '#f8f8f2', muted: '#9aa4c0', border: '#44475a' } },
    { id: 'nord', name: 'Nord', author: 'Unbanded', builtin: true, colors: { accent: '#88c0d0', accentHover: '#81a1c1', bg: '#2e3440', surface: '#3b4252', surface2: '#434c5e', text: '#eceff4', muted: '#9aa5b8', border: '#4c566a' } },
    { id: 'catppuccin', name: 'Catppuccin Mocha', author: 'Unbanded', builtin: true, colors: { accent: '#cba6f7', accentHover: '#b48ef9', bg: '#1e1e2e', surface: '#181825', surface2: '#313244', text: '#cdd6f4', muted: '#9399b2', border: '#45475a' } },
    { id: 'monokai', name: 'Monokai', author: 'Unbanded', builtin: true, colors: { accent: '#a6e22e', accentHover: '#8ec711', bg: '#272822', surface: '#1f201a', surface2: '#3e3d32', text: '#f8f8f2', muted: '#a6a28c', border: '#49483e' } },
    { id: 'sunset', name: 'Sunset', author: 'Unbanded', builtin: true, colors: { accent: '#ff7ac6', accentHover: '#f45fb2', bg: '#2b1d33', surface: '#241729', surface2: '#3a2744', text: '#ffe9f6', muted: '#c7a3bd', border: '#4a3357' } },
    { id: 'ocean', name: 'Ocean', author: 'Unbanded', builtin: true, colors: { accent: '#22d3ee', accentHover: '#0fb5d4', bg: '#0f2027', surface: '#132833', surface2: '#1c3644', text: '#e6f6fa', muted: '#8fb3c0', border: '#254554' } },
    { id: 'forest', name: 'Forest', author: 'Unbanded', builtin: true, colors: { accent: '#34d399', accentHover: '#10b981', bg: '#10231a', surface: '#0d1c15', surface2: '#173125', text: '#e9f7ef', muted: '#93b8a5', border: '#1f4030' } },
    { id: 'light', name: 'Light', author: 'Unbanded', builtin: true, colors: { accent: '#5b5bd6', accentHover: '#4a4ac2', bg: '#f2f4f7', surface: '#ffffff', surface2: '#e8ebf0', text: '#1c2430', muted: '#5d6b7e', border: '#d4dae2' } }
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
    }
    // Toujours en fin de <head> (prioritaire sur le CSS de band.us à
    // spécificité égale) ; le SPA peut déplacer les noeuds, on ré-ancre.
    try {
      if (!el.parentNode || el.parentNode !== head || head.lastChild !== el) {
        head.appendChild(el);
      }
    } catch (e) {
      try { head.appendChild(el); } catch (e2) {}
    }
    el.textContent = css || '';
  }

  // L'ancien panneau flottant (#bt-band-panel) a été supprimé :
  // plus aucun restyle nécessaire ici (la page Paramètres a son propre CSS).
  function coreCss() {
    return '';
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
    var uid = String(id || 'default');
    if (!get(uid)) uid = 'default';
    var t = get(uid);
    // Theme "site default" -> pas de variables CSS, pas de siteCss, laisse le site natif
    if (t.site) {
      // Supprime les variables CSS si elles existent
      var root = document.documentElement;
      if (root && root.style) {
        for (var i = 0; i < KEYS.length; i++) {
          try { root.style.removeProperty('--btt-' + KEYS[i].replace(/[A-Z]/g, function (m) { return '-' + m.toLowerCase(); })); } catch (e) {}
        }
      }
      // Vide les styles de thème
      ensureStyle('bt-core-css', '');
      ensureStyle('bt-theme-css', '');
      ensureStyle('bt-theme-site', '');
      try { window.BTTStore.set('activeTheme', t.id); } catch (e) {}
      return t;
    }
    var c = merge(t.colors);
    for (var i = 0; i < KEYS.length; i++) {
      setVar('--btt-' + KEYS[i].replace(/[A-Z]/g, function (m) { return '-' + m.toLowerCase(); }), c[KEYS[i]]);
    }
    ensureStyle('bt-core-css', coreCss());
    ensureStyle('bt-theme-css', t.css || '');
    ensureStyle('bt-theme-site', siteEnabled() ? siteCss(c) : '');
    // bt-theme-site doit rester juste avant bt-custom-css (dernier style utilisateur)
    // pour ne pas etre ecrase par d'autres styles injectes par le SPA.
    try {
      var siteEl = document.getElementById('bt-theme-site');
      var customEl = document.getElementById('bt-custom-css');
      if (siteEl && siteEl.parentNode) {
        if (customEl && customEl.parentNode) {
          customEl.parentNode.insertBefore(siteEl, customEl);
        } else {
          document.head.appendChild(siteEl);
        }
      }
    } catch (e) {}
    try { window.BTTStore.set('activeTheme', t.id); } catch (e) {}
    return t;
  }

  function siteEnabled() {
    try {
      if (window.BTTStore) return window.BTTStore.get('themeSite', true) !== false;
    } catch (e) {}
    return true;
  }

  function siteCss(c) {
    // Recolore band.us avec les couleurs du theme, sur TOUT le site.
    // Le panel Unbanded ([data-bt-root]) est exclu pour garder sa propre DA.
    // ——— Chat (fenêtre .sChatPop : onglet message) : en-tête, bulles, composer ———
    // Scoppé sous .sChatPop pour ne toucher que la vue chat (pas le feed).
          // En-tÃªte
      '.sChatPop .sChatHeader{background:' + c.surface + ' !important;border-bottom:1px solid ' + c.border + ' !important}' +
      '.sChatPop .chatTitle{color:' + c.text + ' !important}' +
      '.sChatPop .chatSubTitle{color:' + c.muted + ' !important}' +
      '.sChatPop ._bandHomeBtn,.sChatPop ._memberListButton{color:' + c.muted + ' !important}' +
      '.sChatPop ._bandHomeBtn:hover,.sChatPop ._memberListButton:hover{color:' + c.text + ' !important}' +
      // Zone de messages
      '.sChatPop .chatRoom,.sChatPop .cChatList{background:' + c.bg + ' !important}' +
      '.sChatPop .cChatList::-webkit-scrollbar{width:8px}' +
      '.sChatPop .cChatList::-webkit-scrollbar-thumb{background:' + c.border + ';border-radius:8px}' +
      '.sChatPop .cChatList::-webkit-scrollbar-track{background:transparent}' +
      // Séparateur de date + bandeaux d'information
      '.sChatPop .logEvent time{color:' + c.muted + ' !important;background:' + c.bg + ' !important;padding:4px 12px;border-radius:999px;font-size:12px}' +
      '.sChatPop .messageInfo{background:' + c.surface + ' !important;border-bottom:1px solid ' + c.border + '}' +
      '.sChatPop .messageInfo .pushAlarmBox{color:' + c.text + ' !important}' +
      '.sChatPop .fileUpLoading{background:' + c.surface + ' !important;border:1px solid ' + c.border + ';border-radius:8px;color:' + c.text + ' !important}' +
      '.sChatPop .fileUpLoading .msg{color:' + c.text + ' !important}' +
      '.sChatPop .fileUpLoading .progressBar .success{background:' + c.accent + ' !important}' +
      '.sChatPop .fileUpLoading .btnLyClose{color:' + c.muted + ' !important}' +
      '.sChatPop .fileUpLoading .btnLyClose:hover{color:' + c.text + ' !important}' +
      '.sChatPop .chatCallNotice{background:' + c.surface + ' !important;border:1px solid ' + c.border + ';border-radius:8px;color:' + c.text + ' !important}' +
      '.sChatPop .chatCallNotice ._groupCallTextBox{color:' + c.text + ' !important}' +
      '.sChatPop .chatCallNotice .btnChatCallAttend{background:' + c.accent + ' !important;border-color:' + c.accent + ' !important;color:#fff !important}' +
      '.sChatPop .chatCallNotice .btnChatCallAttend:hover{background:' + c.accentHover + ' !important;border-color:' + c.accentHover + ' !important}' +
      '.sChatPop .chatCallNotice .btnChatCallFinish{background:' + c.surface2 + ' !important;color:' + c.text + ' !important;border-color:' + c.border + ' !important}' +
      '.sChatPop .chatCallNotice .btnChatCallFinish:hover{background:' + c.border + ' !important}' +
      '.sChatPop .notice{background:' + c.surface + ' !important;border-bottom:1px solid ' + c.border + ';color:' + c.text + ' !important}' +
      // Bulles de messages (ami = surface avec bordure, moi = accent)
      '.sChatPop .logWrap.logFriend .msgMain{background:' + c.surface + ' !important;border:1px solid ' + c.border + ';border-radius:12px 12px 12px 4px}' +
      '.sChatPop .logWrap.logMy .msgMain{background:' + c.accent + ' !important;border-radius:12px 12px 4px 12px}' +
      '.sChatPop .logWrap.logMy .txt,.sChatPop .logWrap.logMy ._messageContent{color:' + c.text + ' !important}' +
      '.sChatPop .logWrap.logFriend .txt,.sChatPop .logWrap.logFriend ._messageContent{color:' + c.text + ' !important}' +
      // Images dans les messages
      '.sChatPop .msgPhoto .messageBodyWrap a.imageClip img{background:' + c.surface2 + ' !important;border-radius:8px}' +
      // Nom de l'expéditeur
      '.sChatPop .author,.sChatPop .pfName .author{color:' + c.text + ' !important}' +
      // Heure / lus (aside)
      '.sChatPop .msgAside .time,.sChatPop .msgAside .read{color:' + c.muted + ' !important}' +
      // Bouton "more" (trois points)
      '.sChatPop .btnMore{color:' + c.muted + ' !important}' +
      '.sChatPop .btnMore:hover{color:' + c.text + ' !important}' +
      // Citations (message répondu)
      '.sChatPop .replyMsgBox{background:' + c.bg + ' !important;border:1px solid ' + c.border + ';border-left:3px solid ' + c.accent + ';border-radius:8px;color:' + c.muted + ' !important}' +
      '.sChatPop .replyMsgBox .profileName{color:' + c.text + ' !important}' +
      '.sChatPop .replyMsgBox .replyInfoText{color:' + c.text + ' !important}' +
      '.sChatPop .replyMsgBox .replyInfoOthers img{border-radius:6px}' +
      '.sChatPop .replyMsgBox .btnText._collapseToggleBtn{color:' + c.muted + ' !important}' +
      '.sChatPop .replyMsgBox .btnText._collapseToggleBtn:hover{color:' + c.text + ' !important}' +
      // Réactions sous les messages + option "Save" des photos
      '.sChatPop .emotionSection .inner{background:' + c.surface2 + ' !important;border:1px solid ' + c.border + ';border-radius:8px}' +
      '.sChatPop .emotionSection .btnEmotion:hover{background:' + c.accent + ' !important}' +
      '.sChatPop .fileOption{color:' + c.accent + ' !important}' +
      // Composer : le chrome visuel est sur .chatWriteArea, la textarea est
      // transparente (la règle générique lui donne sinon un fond surface2).
      '.sChatPop .sChatBottom{background:' + c.surface + ' !important;border-top:1px solid ' + c.border + ' !important}' +
      '.sChatPop .chatWriteArea{background:' + c.surface2 + ' !important;border:1px solid ' + c.border + ';border-radius:8px}' +
      '.sChatPop .chatWriteArea:focus-within{border-color:' + c.accent + ' !important}' +
      '.sChatPop .chatWriteAreaBox,.sChatPop .mentions{color:' + c.text + ' !important}' +
      '.sChatPop .chatWriteAreaBox{background:transparent !important;border-color:transparent !important}' +
      // Boutons d'ajout (Sticker, Photo, Vidéo, GIF, Fichier, Appel)
      '.sChatPop .btnFuncWrap{color:' + c.muted + ' !important}' +
      '.sChatPop .btnFuncWrap:hover{color:' + c.text + ' !important;background:' + c.surface2 + ' !important;border-radius:6px}' +
      '.sChatPop .btnFuncWrap .uIconCommentSticker,.sChatPop .btnFuncWrap .uIconCommentImage,.sChatPop .btnFuncWrap .uIconWritePlay,.sChatPop .btnFuncWrap .uIconWriteGif,.sChatPop .btnFuncWrap .uIconCommentFile,.sChatPop .btnFuncWrap .uIconGroupCall{color:inherit}' +
      // Bouton d'envoi (+ état désactivé)
      '.sChatPop .chatSubmit ._sendMessageButton{background:' + c.accent + ' !important;border-color:' + c.accent + ' !important;color:#fff !important}' +
      '.sChatPop .chatSubmit ._sendMessageButton:hover{background:' + c.accentHover + ' !important;border-color:' + c.accentHover + ' !important}' +
      '.sChatPop .chatSubmit ._sendMessageButton[disabled]{background:' + c.surface2 + ' !important;border-color:' + c.border + ' !important;color:' + c.muted + ' !important;opacity:1}';
    chat +=
      // Menus et popovers (options, appels, mentions, stickers, aperçu, alerte)
      '.sChatPop .lyMenu{background:' + c.surface + ' !important;border:1px solid ' + c.border + ';border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.3)}' +
      '.sChatPop .lyMenu a{color:' + c.text + ' !important}' +
      '.sChatPop .lyMenu a:hover{background:' + c.surface2 + ' !important}' +
      '.sChatPop .chatInputItemCallBox{background:' + c.surface + ' !important;border:1px solid ' + c.border + ';border-radius:8px}' +
      '.sChatPop .btnChatCall{color:' + c.text + ' !important}' +
      '.sChatPop .btnChatCall:hover{background:' + c.surface2 + ' !important;color:' + c.accent + ' !important}' +
      '.sChatPop .btnChatCallAttend{background:' + c.accent + ' !important;border-color:' + c.accent + ' !important;color:#fff !important}' +
      '.sChatPop .cAutoCompleteList{background:' + c.surface + ' !important;border:1px solid ' + c.border + ';border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.3);color:' + c.text + ' !important}' +
      '.sChatPop .cAutoCompleteList .header{border-bottom:1px solid ' + c.border + ';color:' + c.text + ' !important}' +
      '.sChatPop .cAutoCompleteList .moreBand{color:' + c.accent + ' !important}' +
      '.sChatPop .cAutoCompleteList .roundThumbList li{color:' + c.text + ' !important}' +
      '.sChatPop .cAutoCompleteList .roundThumbList li:hover{background:' + c.surface2 + ' !important}' +
      '.sChatPop .stickerSelectRegion{background:' + c.surface + ' !important;border:1px solid ' + c.border + ';border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.3)}' +
      '.sChatPop .uploadPreviewWrap{background:' + c.surface + ' !important;border:1px solid ' + c.border + ';border-radius:8px}' +
      '.sChatPop .uploadPreviewWrap .closePreview{color:' + c.muted + ' !important}' +
      '.sChatPop .uploadPreviewWrap .closePreview:hover{color:' + c.text + ' !important}' +
      '.sChatPop .newMessageAlertWrap{background:' + c.accent + ' !important;color:#fff !important}' +
      '.sChatPop .newMessageAlertWrap ._messageAlertContent{color:inherit}';
    return '' +
    'body,body #wrap,body #content,body main' +
    '{background-color:' + c.bg + ' !important;color:' + c.text + ' !important}' +
    'body #header,body .headerWrap,body header[role="banner"]' +
    '{background-color:' + c.surface + ' !important;color:' + c.text + ' !important;' +
    'border-bottom:1px solid ' + c.border + ' !important}' +
    'body #header a,body .headerWrap a' +
    '{color:' + c.text + ' !important}' +
    'body a:not([data-bt-root]){color:' + c.accent + '}' +
    'body a:not([data-bt-root]):hover{color:' + c.accentHover + '}' +
    'body input:not([data-bt-root]),' +
    'body textarea:not([data-bt-root]),' +
    'body select:not([data-bt-root]),' +
    'body [contenteditable="true"]:not([data-bt-root])' +
    '{background-color:' + c.surface2 + ' !important;color:' + c.text + ' !important;' +
    'border-color:' + c.border + ' !important}' +
    'body input:not([data-bt-root])::placeholder,' +
    'body textarea:not([data-bt-root])::placeholder' +
    '{color:' + c.muted + ' !important;opacity:1}' +
    'body time:not([data-bt-root])' +
    '{color:' + c.muted + '}' +
    chat;
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
