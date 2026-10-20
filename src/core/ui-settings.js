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
  var v = window.BTT_VERSION || '1.9.1';
  var _t = function (k, def, params) { try { if (window.BTTI18n && typeof window.BTTI18n.t === 'function') { var s = window.BTTI18n.t(k, params); if (s != null && s !== k) return s; } } catch (e) {} return def; };
  return '' +
  '<div class="bt-set-win" role="dialog" aria-modal="true" aria-label="' + _t('settings.title', 'Unbanded Settings') + '">' +
    '<aside class="bt-set-side">' +
      '<div class="bt-set-brand"><span class="bt-set-dot"></span> Unbanded <small>v' + v + '</small></div>' +
      '<nav>' +
        '<button type="button" class="bt-set-tab" data-tab="general">' + _t('tab.general', 'General') + '</button>' +
        '<button type="button" class="bt-set-tab" data-tab="plugins">' + _t('tab.plugins', 'Plugins') + '</button>' +
        '<button type="button" class="bt-set-tab" data-tab="themes">' + _t('tab.themes', 'Themes') + '</button>' +
        '<button type="button" class="bt-set-tab" data-tab="css">' + _t('tab.css', 'Custom CSS') + '</button>' +
        '<button type="button" class="bt-set-tab" data-tab="about">' + _t('tab.about', 'About') + '</button>' +
      '</nav>' +
      '<div class="bt-set-side-foot">' + _t('side.shortcuts', 'Shortcuts: /settings · Ctrl+, · Esc to close') + '</div>' +
    '</aside>' +
    '<main class="bt-set-main">' +
      '<header class="bt-set-head"><h2 id="bt-set-title">' + _t('gen.title', 'General') + '</h2>' +
        '<button type="button" id="bt-settings-close" class="bt-set-close" title="' + _t('gen.title', 'Close') + '">✕</button></header>' +
      '<div class="bt-set-body">' +

        '<section class="bt-page" data-page="general">' +
          '<div class="bt-set-card">' +
            '<h3>' + _t('gen.title', 'General') + '</h3>' +
            '<label class="bt-set-switch"><input type="checkbox" data-act="opt-startup-toast"> ' + _t('gen.startupToast', 'Show startup toast') + '</label>' +
            '<label class="bt-set-line">' + _t('gen.toastDuration', 'Toast duration:') + ' ' +
              '<select data-act="opt-toast-duration"><option value="3">3 s</option><option value="5">5 s</option><option value="8">8 s</option><option value="12">12 s</option></select>' +
            '</label>' +
            '<label class="bt-set-line">' + _t('gen.lang', 'Language:') + ' ' +
              '<select data-act="opt-lang"><option value="auto">' + _t('gen.langAuto', 'Auto (detected)') + '</option><option value="en">English</option><option value="fr">Français</option></select>' +
            '</label>' +
          '</div>' +
          '<div class="bt-set-card">' +
            '<h3>' + _t('gen.config', 'Configuration') + '</h3>' +
            '<div class="bt-set-row">' +
              '<button type="button" class="bt-btn" data-act="export-config">' + _t('gen.export', 'Export (JSON)') + '</button>' +
              '<button type="button" class="bt-btn bt-btn-ghost" data-act="import-config">' + _t('gen.import', 'Import (JSON)') + '</button>' +
              '<button type="button" class="bt-btn bt-btn-danger" data-act="reset-all">' + _t('gen.reset', 'Reset all') + '</button>' +
            '</div>' +
            '<div class="bt-set-hint">' + _t('gen.exportHint', "The export includes plugins, themes, custom CSS and options.") + '</div>' +
          '</div>' +
        '</section>' +

        '<section class="bt-page" data-page="plugins" hidden>' +
          '<div class="bt-set-card">' +
            '<h3>' + _t('plg.add', 'Add a plugin') + '</h3>' +
            '<div class="bt-set-row">' +
              '<input type="text" id="bt-set-plugin-url" placeholder="https://example.com/plugin.js">' +
              '<button type="button" class="bt-btn" data-act="add-plugin-url">' + _t('plg.addUrl', 'Add (URL)') + '</button>' +
              '<button type="button" class="bt-btn bt-btn-ghost" data-act="import-plugin-file">' + _t('plg.importFile', 'Import a .js file') + '</button>' +
            '</div>' +
            '<div class="bt-set-hint">' + _t('plg.hint', 'A plugin is a JS exposing <code>module.exports = { name, version, description, onLoad(ctx), commands }</code>. Added plugins are saved and reloaded at startup.') + '</div>' +
          '</div>' +
          '<div class="bt-set-card"><h3>' + _t('plg.installed', 'Installed plugins') + '</h3><div id="bt-set-plugin-list" class="bt-set-list"></div></div>' +
        '</section>' +


        '<section class="bt-page" data-page="themes" hidden>' +
          '<div class="bt-set-card">' +
            '<h3>' + _t('thm.import', 'Import a theme') + '</h3>' +
            '<div class="bt-set-row">' +
              '<input type="text" id="bt-set-theme-url" placeholder="https://example.com/my-theme.json">' +
              '<button type="button" class="bt-btn" data-act="add-theme-url">' + _t('thm.importUrl', 'Import (URL)') + '</button>' +
              '<button type="button" class="bt-btn bt-btn-ghost" data-act="import-theme-file">' + _t('thm.importFile', 'Import a .json file') + '</button>' +
            '</div>' +
            '<div class="bt-set-hint">' + _t('thm.hint', 'Format: <code>{"name":"...","colors":{...},"css":"/* optional */"}</code> — missing colors fall back to the default violet.') + '</div>' +
          '</div>' +
          '<div class="bt-set-card"><h3>' + _t('thm.title', 'Themes') + '</h3>' +
          '<label class="bt-set-switch" style="margin-bottom:10px"><input type="checkbox" data-act="opt-theme-site">' + _t('thm.site', 'Apply the theme to the whole band.us site') + '</label>' +
          '<div id="bt-set-theme-grid" class="bt-set-grid"></div></div>' +
        '</section>' +

        '<section class="bt-page" data-page="css" hidden>' +
          '<div class="bt-set-card">' +
            '<h3>' + _t('css.title', 'Custom CSS') + '</h3>' +
            '<textarea id="bt-set-css" spellcheck="false" placeholder="' + _t('css.placeholder', '/* your CSS, applied live to band.us */') + '"></textarea>' +
            '<div class="bt-set-row">' +
              '<button type="button" class="bt-btn" data-act="save-css">' + _t('css.save', 'Apply &amp; save') + '</button>' +
              '<button type="button" class="bt-btn bt-btn-ghost" data-act="preview-css">' + _t('css.preview', 'Preview (don\'t save)') + '</button>' +
              '<button type="button" class="bt-btn bt-btn-danger" data-act="clear-css">' + _t('css.reset', 'Reset') + '</button>' +
            '</div>' +
            '<div class="bt-set-hint">' + _t('css.hint', 'The CSS is injected into the page (<code>&lt;style id=\"bt-custom-css\"&gt;</code>) and kept after reload. The preview does not persist.') + '</div>' +
          '</div>' +
        '</section>' +

        '<section class="bt-page" data-page="about" hidden>' +
          '<div class="bt-set-card">' +
            '<div class="bt-set-hint">' + _t('about.desc', 'Unbanded — Vencord-style plugin loader for BAND (band.us). Commands: /pat · /help · /plugins · /settings · /debug.<br>GIF pet-pet: algorithm <a href="https://github.com/aDu/pet-pet-gif" target="_blank" rel="noopener" style="color:var(--btt-accent)">aDu/pet-pet-gif</a> + encoder <a href="https://github.com/mattdesl/gifenc" target="_blank" rel="noopener" style="color:var(--btt-accent)">gifenc</a> embedded (no CDN, CSP-compatible band.us).<br>Reaction GIFs from <a href="https://nekos.best" target="_blank" rel="noopener" style="color:var(--btt-accent)">nekos.best</a> (non-commercial content, attribution appreciated).<br>MIT License · <a href="https://github.com/HYPE115/Unbanded" target="_blank" rel="noopener" style="color:var(--btt-accent)">github.com/HYPE115/Unbanded</a>') + '</div>' +
            '<div class="bt-set-row"><span class="bt-badge" id="bt-set-stat-plugins">? plugins</span><span class="bt-badge" id="bt-set-stat-commands">? commands</span><span class="bt-badge" id="bt-set-stat-themes">? themes</span></div>' +
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
  // NB : ne JAMAIS appeler this.hide() ici — le shim masque le panneau via
  // closeSettings(), ce qui refermait la modale aussitôt ouverte (bug v1.6.9).
  if (this._syncFabState) this._syncFabState();
  this._switchSettingsTab(tab || this._settingsTab || 'general');
};

BandUI.prototype.closeSettings = function () {
  if (this.settingsEl) this.settingsEl.style.display = 'none';
  this.settingsVisible = false;
  if (this._syncFabState) this._syncFabState();
};

BandUI.prototype._switchSettingsTab = function (tab) {
  var titleKeys = { general: 'tab.general', plugins: 'tab.plugins', themes: 'tab.themes', css: 'tab.css', about: 'tab.about' };
  if (!titleKeys[tab]) tab = 'general';
  this._settingsTab = tab;
  var root = this.settingsEl;
  if (!root) return;
  var title = document.getElementById('bt-set-title');
  if (title) title.textContent = _t(titleKeys[tab], 'Settings');
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
  var langSel = document.querySelector ? document.querySelector('#bt-settings [data-act="opt-lang"]') : null;
  if (langSel) langSel.value = window.BTTI18n.pref();
};

BandUI.prototype._renderSettingsCss = function () {
  var ta = document.getElementById('bt-set-css');
  if (ta) ta.value = window.BTTStyles.get();
};

BandUI.prototype._renderSettingsAbout = function () {
  var _t2 = (window.BTTI18n && typeof window.BTTI18n.t === 'function') ? window.BTTI18n.t.bind(window.BTTI18n) : function (k, p) { return k; };
  var p = document.getElementById('bt-set-stat-plugins');
  if (p) p.textContent = _t2('about.plugins', { n: this.pm.plugins.size });
  var c = document.getElementById('bt-set-stat-commands');
  if (c) c.textContent = _t2('about.commands', { n: this.pm.commands.size });
  var t = document.getElementById('bt-set-stat-themes');
  if (t) t.textContent = _t2('about.themes', { n: window.BTTThemes.list().length });
};


/* ---------- Liste des plugins (onglet Paramètres) ---------- */
BandUI.prototype.renderSettingsPlugins = function () {
  var c = document.getElementById('bt-set-plugin-list');
  if (!c) return;
  c.innerHTML = '';
  var sourceLabel = { url: 'URL', file: _t('plg.srcFile', 'File'), builtin: _t('plg.srcBuiltin', 'Built-in') };
  var descOf = function (spec) {
    try {
      if (spec && spec.descriptionKey && window.BTTI18n && typeof window.BTTI18n.t === 'function') {
        var s = window.BTTI18n.t(spec.descriptionKey);
        if (s && s !== spec.descriptionKey) return s;
      }
    } catch (e) {}
    return (spec && spec.description) || '';
  };
  for (var it = this.pm.plugins.entries(), step; !(step = it.next()).done; ) {
    var pair = step.value;
    var id = pair[0];
    var entry = pair[1];
    var row = document.createElement('div');
    row.className = 'bt-set-item';
    var info = document.createElement('div');
    info.className = 'bt-idx';
    info.innerHTML = '<div class="bt-iname">' + escapeHtml(entry.spec.name) + ' ' +
      '<span class="bt-badge' + (entry.enabled ? ' bt-badge-on' : ' bt-badge-off') + '">' + (entry.enabled ? _t('plg.active', 'active') : _t('plg.inactive', 'inactive')) + '</span>' +
      '<span class="bt-badge">' + escapeHtml(sourceLabel[entry.source] || 'URL') + '</span></div>' +
      '<div class="bt-idesc">' + escapeHtml(descOf(entry.spec)) + ' · v' + escapeHtml(entry.spec.version || '?') + ' · ' + escapeHtml(id) + '</div>';
    row.appendChild(info);
    if (!entry.builtin) {
      var tog = document.createElement('button');
      tog.type = 'button';
      tog.className = 'bt-btn bt-btn-ghost bt-btn-sm';
      tog.textContent = entry.enabled ? _t('plg.disable', 'Disable') : _t('plg.enable', 'Enable');
      tog.setAttribute('data-act', 'plugin-toggle');
      tog.setAttribute('data-id', id);
      row.appendChild(tog);
      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'bt-btn bt-btn-danger bt-btn-sm';
      del.textContent = _t('plg.delete', 'Delete');
      del.setAttribute('data-act', 'plugin-remove');
      del.setAttribute('data-id', id);
      row.appendChild(del);
    }
    c.appendChild(row);
  }
  if (this.pm.plugins.size === 0) c.innerHTML = '<div class="bt-set-hint">' + _t('plg.none', 'No plugin loaded.') + '</div>';
};

/* ---------- Galerie des thèmes (onglet Paramètres) ---------- */
BandUI.prototype.renderSettingsThemes = function () {
  var c = document.getElementById('bt-set-theme-grid');
  if (!c) return;
  c.innerHTML = '';
  var cb = document.querySelector ? document.querySelector('#bt-settings [data-act="opt-theme-site"]') : null;
  if (cb) { try { cb.checked = window.BTTStore.get('themeSite', true) !== false; } catch (e) {} }
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
    card.innerHTML = '<div class="bt-theme-name">' + escapeHtml(_t('thm.' + t.id, t.name)) + (t.id === activeId ? ' ✓' : '') + '</div>' +
      '<div class="bt-theme-meta">' + escapeHtml(t.author || _t('thm.unknown', 'unknown')) + (t.version ? ' · v' + escapeHtml(t.version) : '') + (t.builtin ? ' · ' + _t('thm.builtin', 'built-in') : ' · ' + _t('thm.importedLabel', 'imported')) + '</div>' +
      '<div class="bt-dots">' + dots + '</div>';
    var actions = document.createElement('div');
    actions.className = 'bt-set-actions';
    var applyBtn = document.createElement('button');
    applyBtn.type = 'button';
    applyBtn.className = 'bt-btn bt-btn-sm';
    applyBtn.textContent = t.id === activeId ? _t('thm.applied', 'Applied') : _t('thm.apply', 'Apply');
    applyBtn.setAttribute('data-act', 'theme-apply');
    applyBtn.setAttribute('data-id', t.id);
    actions.appendChild(applyBtn);
    var exp = document.createElement('button');
    exp.type = 'button';
    exp.className = 'bt-btn bt-btn-ghost bt-btn-sm';
    exp.textContent = _t('thm.export', 'Export');
    exp.setAttribute('data-act', 'theme-export');
    exp.setAttribute('data-id', t.id);
    actions.appendChild(exp);
    if (!t.builtin) {
      var rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'bt-btn bt-btn-danger bt-btn-sm';
      rm.textContent = _t('thm.delete', 'Delete');
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
  // Clic sur le fond assombri (hors fenêtre) → ferme la modale.
  if (t === this.settingsEl) { this.closeSettings(); return; }
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
      if (!url) { toast(_t('err.needUrl', 'Paste a URL first'), 'error'); return; }
      if (!url) { toast(_t('err.needUrl', 'Paste a URL first'), 'error'); return; }
      this.pm.loadPlugin(url, { enabled: true, source: 'url' })
        .then(function () { if (input) input.value = ''; toast(_t('plg.added', 'Plugin added: ') + url, 'ok'); self.renderSettingsPlugins(); })
        .catch(function (err) { toast(_t('plg.failed', 'Plugin failed : ') + err.message, 'error'); });
      return;
    }
    case 'import-plugin-file':
      this._pickFile('.js,.txt,text/javascript', function (code, name) {
        self.pm.loadPlugin('file:' + name, { enabled: true, source: 'file', code: code })
          .then(function () { toast(_t('plg.imported', 'Plugin imported : ') + name, 'ok'); self.renderSettingsPlugins(); })
          .catch(function (err) { toast(_t('plg.importFailed', 'Import failed : ') + err.message, 'error'); });
      });
      return;
    case 'plugin-toggle':
      this.pm.setEnabled(id, !this.pm.isEnabled(id));
      this.renderSettingsPlugins();
      return;
    case 'plugin-remove':
      this.pm.unloadPlugin(id);
      this.renderSettingsPlugins();
      toast(_t('plg.removed', 'Plugin removed'));
      return;
    case 'add-theme-url': {
      var tinput = document.getElementById('bt-set-theme-url');
      var turl = (tinput && tinput.value ? tinput.value : '').trim();
      if (!turl) { toast(_t('err.needUrl', 'Paste a URL first'), 'error'); return; }
      if (!turl) { toast(_t('err.needUrl', 'Paste a URL first'), 'error'); return; }
      window.BTTThemes.importFromUrl(turl)
        .then(function (t) { if (tinput) tinput.value = ''; toast(_t('thm.imported', 'Theme imported : ') + t.name, 'ok'); self.renderSettingsThemes(); })
        .catch(function (err) { toast(_t('thm.importFailed', 'Theme failed : ') + err.message, 'error'); });
      return;
    }
    case 'import-theme-file':
      this._pickFile('application/json,.json', function (raw) {
        try {
          var t = window.BTTThemes.importJson(JSON.parse(raw));
          toast(_t('thm.imported', 'Theme imported : ') + t.name, 'ok');
          self.renderSettingsThemes();
        } catch (err) { toast(_t('plg.importFailed', 'Import failed : ') + err.message, 'error'); }
      });
      return;
    case 'theme-apply': {
      var applied = window.BTTThemes.apply(id);
      toast(_t('thm.appliedToast', 'Theme applied : ') + applied.name, 'ok');
      this.renderSettingsThemes();
      return;
    }
    case 'theme-export':
      try { window.BTTThemes.exportTheme(id); toast(_t('thm.exported', 'Theme exported (fichier JSON)'), 'ok'); }
      catch (err) { toast(_t('thm.exportFailed', 'Export failed : ') + err.message, 'error'); }
      return;
    case 'theme-remove':
      window.BTTThemes.remove(id);
      this.renderSettingsThemes();
      toast(_t('thm.removed', 'Theme removed'));
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
      toast(_t('css.applied', 'CSS applied and saved'), 'ok');
      return true;
    }
    case 'preview-css': {
      var pta = document.getElementById('bt-set-css');
      window.BTTStyles.apply(pta ? pta.value : '');
      toast(_t('css.previewToast', 'Preview applied (not saved)'));
      return true;
    }
    case 'clear-css':
      window.BTTStyles.clear();
      this._renderSettingsCss();
      toast(_t('css.resetToast', 'CSS reset'));
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
  } else if (act === 'opt-theme-site') {
    window.BTTStore.set('themeSite', !!t.checked);
    try { window.BTTThemes.applyActive(); } catch (e) {}
  } else if (act === 'opt-toast-duration') {
    window.BTTStore.set('toastDuration', Math.max(1, parseInt(t.value, 10) || 5));
  } else if (act === 'opt-lang') {
    var newLang = window.BTTI18n.set(t.value);
    if (newLang) {
      (window.__BTT_toast || function () {})(_t('cfg.langChanged', 'Language: ' + newLang + ' — reloading…'), 'ok');
      setTimeout(function () { location.reload(); }, 700);
    }
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
      reader.onload = function () { cb(String(reader.result == null ? '' : reader.result), f.name || 'file'); };
      reader.onerror = function () { if (window.__BTT_toast) window.__BTT_toast(_t('file.readFailed', 'Cannot read the file'), 'error'); };
      reader.readAsText(f);
    } catch (e2) { if (window.__BTT_toast) window.__BTT_toast(_t('file.noReader', 'FileReader unavailable: ') + e2.message, 'error'); }
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
      version: '1.7.0',
      exportedAt: new Date().toISOString(),
      options: {
        startupToast: window.BTTStore.get('startupToast', true) !== false,
        toastDuration: window.BTTStore.get('toastDuration', 5),
        themeSite: window.BTTStore.get('themeSite', true) !== false
      },
      activeTheme: window.BTTStore.get('activeTheme', 'default'),
      customCss: window.BTTStyles.get(),
      themes: window.BTTThemes.imported(),
      plugins: window.BTTStore.get('plugins', [])
    };
    this._downloadText(JSON.stringify(cfg, null, 2), 'unbanded-config.json', 'application/json');
    (window.__BTT_toast || function () {})(_t('cfg.exported', 'Configuration exported'), 'ok');
  } catch (e) {
    (window.__BTT_toast || function () {})(_t('cfg.exportFailed', 'Export failed: ') + e.message, 'error');
  }
};

BandUI.prototype._importConfig = function () {
  var self = this;
  var toast = window.__BTT_toast || function () {};
  this._pickFile('application/json,.json', function (raw) {
    try {
      var cfg = JSON.parse(raw);
      if (!cfg || (cfg.app !== 'unbanded')) throw new Error('this is not an Unbanded configuration');
      if (cfg.options) {
        window.BTTStore.set('startupToast', cfg.options.startupToast !== false);
        window.BTTStore.set('toastDuration', Math.max(1, parseInt(cfg.options.toastDuration, 10) || 5));
        window.BTTStore.set('themeSite', cfg.options.themeSite !== false);
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
      toast(_t('cfg.imported', 'Configuration imported ({n} theme(s)) — reload the page for plugins').replace('{n}', importedCount), 'ok');
      self._renderSettingsTab(self._settingsTab || 'general');
    } catch (err) { toast(_t('cfg.importFailed', 'Import failed: ') + err.message, 'error'); }
  });
};

BandUI.prototype._resetAll = function () {
  if (typeof window.confirm === 'function' && !window.confirm(_t('cfg.resetConfirm', 'Reset everything? (plugins, themes, CSS, options)'))) return;
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
    window.BTTStore.remove('themeSite');
    this._renderSettingsTab(this._settingsTab || 'general');
    toast(_t('cfg.resetDone', 'Reset done'), 'ok');
  } catch (e) { toast(_t('cfg.resetFailed', 'Reset failed: ') + e.message, 'error'); }
};

if (typeof module !== 'undefined' && module.exports) module.exports = BandUI;

