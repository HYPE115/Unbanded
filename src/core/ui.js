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
      this._watchNavigation();
      return;
    }
    this._injectButton();
    this._injectPanel();
    // Inversion accueil/messages : applique + surveille la navigation SPA.
    // (Les commandes slash restent actives partout via le hook clavier global.)
    this._applyPageVisibility();
    this._watchNavigation();
  }

  ensureInjected() {
    try {
      if (!document.body) return;
      if (!this.settingsEl || !document.body.contains(this.settingsEl)) this._injectSettings();
      if (!this.fab || !document.body.contains(this.fab)) this._injectFab();
      else this._redockFabIfNeeded();
      if (this.adapter.isDemo()) {
        if (!this.banner || !document.body.contains(this.banner)) this._injectDemoBanner();
        return;
      }
      if (!this.btn || !document.body.contains(this.btn)) this._injectButton();
      if (!this.panel || !document.body.contains(this.panel)) this._injectPanel();
      this._applyPageVisibility();
    } catch (e) { this.adapter.log('ensureInjected :', e); }
  }

  /** Vrai si on est sur une page de conversation/chat (messages). */
  _isChatPage() {
    try {
      const href = (location.href || '') + '';
      if (/\/chat|\/talk|\/message|\/dm|\/conversation/i.test(href)) return true;
    } catch (e) {}
    try {
      if (this.adapter.getChatInput && this.adapter.getChatInput()) return true;
      if (this.adapter.getSendButton && this.adapter.getSendButton()) return true;
    } catch (e) {}
    return false;
  }

  /**
   * Inverse l'affichage : boutons (⚙ + "Unbanded") visibles sur la page
   * principale uniquement, masqués dans les conversations.
   * Les commandes slash restent actives partout (hook clavier global).
   */
  _applyPageVisibility() {
    let chat = false;
    try { chat = this._isChatPage(); } catch (e) {}
    try {
      if (this.fab) this.fab.style.display = chat ? 'none' : '';
    } catch (e) {}
    try {
      if (this.btn) {
        this.btn.style.display = chat ? 'none' : '';
        const li = document.getElementById('bt-header-item');
        if (li) li.style.display = chat ? 'none' : '';
      }
    } catch (e) {}
  }

  /** Surveille la navigation SPA : ré-applique la visibilité à chaque changement d'URL. */
  _watchNavigation() {
    if (this._navWatched) return;
    this._navWatched = true;
    try { this._lastHref = location.href; } catch (e) { this._lastHref = ''; }
    const self = this;
    const check = function () {
      try {
        const h = location.href;
        if (h !== self._lastHref) {
          self._lastHref = h;
          self.ensureInjected();
        } else {
          self._applyPageVisibility();
        }
      } catch (e) {}
    };
    try { setInterval(check, 1000); } catch (e) {}
    try {
      window.addEventListener('popstate', check);
      window.addEventListener('hashchange', check);
    } catch (e) {}
  }

  /**
   * Si le ⚙ est en repli flottant alors que le header BAND est désormais
   * disponible (cas page principale chargée en retard par le SPA),
   * le re-docke dans le header.
   */
  _redockFabIfNeeded() {
    try {
      if (!this.fab || !document.body.contains(this.fab)) return;
      const floating = this.fab.parentElement === document.body &&
        (this.fab.style.position === 'fixed' || this.fab.id === 'bt-fab' && !this.fab.closest('#header'));
      if (!floating) return;
      const target = document.querySelector('#header .headerInner .gnbLogoSearchArea') ||
        document.querySelector('#header .headerInner, #header');
      if (!target) return;
      this.fab.style.cssText = 'flex:none;align-self:center;width:32px;height:32px;margin-left:10px;' +
        'border:1px solid rgba(128,128,128,.35);border-radius:50%;cursor:pointer;font-size:16px;' +
        'line-height:1;color:inherit;background:transparent;' +
        'display:inline-flex;align-items:center;justify-content:center;padding:0;font-family:inherit;' +
        'opacity:.8;transition:transform .15s ease,opacity .2s ease;';
      target.appendChild(this.fab);
      this.adapter.log('Bouton ⚙ re-docké dans le header BAND.');
      this._applyPageVisibility();
    } catch (e) {}
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
    // Ouvre directement les Paramètres sur l'onglet "À propos" (Unbanded vX.Y.Z),
    // pas le panneau Plugins.
    fab.onclick = () => this.openSettings('about');

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
    // Le FAB ⚙ ouvre les Paramètres (À propos). Le panneau Plugins se bascule
    // via le bouton "Unbanded" du header.
    if (this.settingsVisible) {
      this.closeSettings();
      return;
    }
    this.toggle();
  }

  _syncFabState() {
    // Le FAB reste un ⚙ fixe : il ouvre les Paramètres, pas le panneau.
    if (!this.fab) return;
    try {
      this.fab.textContent = '⚙';
      this.fab.title = 'Unbanded — paramètres';
    } catch (e) {}
  }
}

window.BandUI = BandUI;
if (typeof module !== 'undefined' && module.exports) module.exports = BandUI;
