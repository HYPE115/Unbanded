BandUI.prototype._injectPanel = function () {
  const self = this;
  this.panel = document.createElement('div');
  this.panel.id = 'bt-band-panel';
  this.panel.setAttribute('data-bt-root', '1');
  this.panel.style.cssText = 'position:fixed;top:60px;right:20px;width:340px;background:#232f3e;color:#fff;border-radius:10px;padding:14px;font-family:sans-serif;font-size:13px;z-index:99999;display:none;box-shadow:0 6px 20px rgba(0,0,0,.5);flex-direction:column;gap:10px;';
  this.panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <div style="font-weight:bold;font-size:15px">Tamper · Plugins</div>
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
BandUI.prototype.show = function () { if (this.panel) this.panel.style.display = 'flex'; this.visible = true; };
BandUI.prototype.hide = function () { if (this.panel) this.panel.style.display = 'none'; this.visible = false; };

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
