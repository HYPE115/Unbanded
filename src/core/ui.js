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
    // 5) dernier recours : bouton flottant en bas à droite (au-dessus du FAB ⚙)
    Object.assign(this.btn.style, {
      position: 'fixed', bottom: '76px', right: '18px', padding: '8px 12px',
      background: '#6c5ce7', color: '#fff', borderRadius: '6px',
      zIndex: '10000', boxShadow: '0 2px 6px rgba(0,0,0,.3)'
    });
    document.body.appendChild(this.btn);
  }

  /* ---------- Bouton flottant ⚙ : toggle la GUI depuis la page principale ---------- */
  _injectFab() {
    if (!document.body) return;
    if (this.fab && document.body.contains(this.fab)) return;
    const fab = document.createElement('button');
    fab.id = 'bt-fab';
    fab.type = 'button';
    fab.textContent = '⚙';
    fab.title = 'Unbanded — afficher/masquer le panneau';
    fab.setAttribute('data-bt-root', '1');
    fab.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:10001;width:46px;height:46px;' +
      'border:none;border-radius:50%;cursor:pointer;font-size:21px;line-height:1;color:#fff;' +
      'background:var(--btt-accent,#6c5ce7);box-shadow:0 4px 14px rgba(0,0,0,.4);' +
      'display:flex;align-items:center;justify-content:center;padding:0;font-family:inherit;' +
      'opacity:.8;transition:transform .15s ease,opacity .2s ease;';
    fab.onmouseenter = function () { fab.style.transform = 'scale(1.1)'; fab.style.opacity = '1'; };
    fab.onmouseleave = function () { fab.style.transform = 'scale(1)'; };
    fab.onclick = () => this.toggleGui();
    document.body.appendChild(fab);
    this.fab = fab;
    this._syncFabState();
    this.adapter.log('Bouton flottant ⚙ injecté (bas droite).');
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
