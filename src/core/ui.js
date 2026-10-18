/**
 * BandUI - Bouton "Unbanded" + page Paramètres injectés dans BAND.
 * (L'ancien panneau flottant "Unbanded · Plugins" a été supprimé :
 *  tout est dans la page Paramètres, onglet Plugins.)
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
    let self = this;
    // S'assurer que `self` est bien une instance de BandUI.
    // Si `this` n'est pas une instance (ex. appel en contexte global),
    // on crée l'instance correcte avec les dépendances nécessaires.
    if (!(self instanceof BandUI)) {
      const pm = (self && self.pm) || {};
      const adapter = (self && self.adapter) || { log: () => {}, isDemo: () => false };
      self = new BandUI(pm, adapter);
    }
    window.UnbandedUI = self;
    window.BandTamperUI = self; // alias rétro-compat
    // Autocomplétion AVANT l'exécution : en phase de capture sur document,
    // les listeners s'exécutent dans l'ordre d'enregistrement. L'autocomplete
    // doit voir Entrée en premier pour compléter "/he" → "/help" au lieu
    // de laisser l'exécuteur répondre "Commande inconnue".
    try {
      self._hookCommandAutocomplete();
    } catch (e) {
      self.adapter.log('autocomplete KO :', e);
    }
    self._hookCommandInput();
    if (!document.body) return;
    self._injectSettings();
    self._injectFab();
    if (self.adapter.isDemo()) {
      self._injectDemoBanner();
      self._watchNavigation();
      return;
    }
    // L'ancien panneau flottant est supprimé : la gestion des plugins
    // se fait dans la page Paramètres (onglet Plugins, via /plugins ou ⚙).
    var stale = document.getElementById('bt-band-panel');
    if (stale && stale.remove) { try { stale.remove(); } catch (e) {} }
    self.panel = null;
    self.visible = false;
    self._injectButton();
    // Inversion accueil/messages : applique + surveille la navigation SPA.
    // (Les commandes slash restent actives partout via le hook clavier global.)
    self._applyPageVisibility();
    self._watchNavigation();
  }

  ensureInjected() {
    const self = this;
    try {
      if (!document.body) return;
      if (!self.settingsEl || !document.body.contains(self.settingsEl)) self._injectSettings();
      if (!self.fab || !document.body.contains(self.fab)) self._injectFab();
      else self._redockFabIfNeeded();
      if (self.adapter.isDemo()) {
        if (!self.banner || !document.body.contains(self.banner)) self._injectDemoBanner();
        return;
      }
      if (!self.btn || !document.body.contains(self.btn)) self._injectButton();
      var stalePanel = document.getElementById('bt-band-panel');
      if (stalePanel && stalePanel.remove) { try { stalePanel.remove(); } catch (e) {} }
      self.panel = null;
      self.visible = false;
      self._applyPageVisibility();
    } catch (e) {
      self.adapter.log('ensureInjected :', e);
    }
  }

  /** Vrai si on est sur une page de conversation/chat (messages). */
  _isChatPage() {
    try {
      const href = (location.href || '') + '';
      if (/\/chat|\/talk|\/message|\/dm|\/conversation/i.test(href)) return true;
      // Page principale BAND (https://www.band.us/ ou /feed) : jamais un chat,
      // même si elle contient un composer ou un bouton submit (recherche).
      const path = (location.pathname || '') + '';
      if (path === '/' || path === '' || /^\/feed\/?$/i.test(path)) return false;
    } catch (e) {}
    try {
      // Détection stricte : champ de saisie DANS un conteneur chat uniquement.
      // (L'ancien test utilisait getChatInput()/getSendButton génériques qui
      // matchent le composer de la page principale et le bouton de recherche.)
      const chatInput = document.querySelector(
        '[class*="chat" i] textarea, [class*="chat" i] [contenteditable="true"],' +
        ' [class*="Chat"] textarea, [class*="Chat"] [contenteditable="true"],' +
        ' [class*="talk" i] textarea, [class*="talk" i] [contenteditable="true"],' +
        ' [class*="message" i] textarea, [class*="message" i] [contenteditable="true"]'
      );
      if (chatInput && chatInput.getClientRects && chatInput.getClientRects().length > 0) return true;
    } catch (e) {}
    return false;
  }

  /**
   * Inverse l'affichage : le bouton "Unbanded" du header est visible sur la
   * page principale uniquement, masqué dans les conversations.
   * Le FAB ⚙ flottant reste visible partout (y compris en chat) — on n'y
   * touche jamais ici pour ne pas risquer d'écraser ses styles inline.
   * Les commandes slash restent actives partout (hook clavier global).
   */
  _applyPageVisibility() {
    let chat = false;
    try { chat = this._isChatPage(); } catch (e) {}
    try {
      if (this.fab) {
        // Rétablit la valeur de base (`inline-flex` docké / `flex` flottant) :
        // `display = ''` effacerait la déclaration du cssText injecté.
        const docked = this.fab.style.position !== 'fixed';
        const want = chat ? 'none' : (docked ? 'inline-flex' : 'flex');
        if (this.fab.style.display !== want) this.fab.style.display = want;
      }
    } catch (e) {}
    try {
      if (this.btn) {
        // Idem : rétablir `inline-flex` (centrage du point ● + gap) au lieu de `''`.
        const btnWant = chat ? 'none' : 'inline-flex';
        if (this.btn.style.display !== btnWant) this.btn.style.display = btnWant;
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
    // Si le SPA remplace le header (== notre ⚙ docké disparaît du DOM),
    // le réinjecter immédiatement au lieu d'attendre le tick ensureInjected.
    const reattach = function () {
      try {
        if (self.fab && !document.body.contains(self.fab)) {
          // Le FAB a été élagué par le SPA (header remplacé) : nettoyage +
          // réinjection immédiate.
          self.fab = null;
          self._injectFab();
          return;
        }
        if (self.fab && self.fab.style.position === 'fixed' && !self.fab.closest('#header')) {
          // Repli flottant alors que le header est (re)monté : re-dock.
          self._redockFabIfNeeded();
        } else {
          self._applyPageVisibility();
        }
      } catch (e) {}
    };
    try {
      const mo = new MutationObserver(function () { reattach(); });
      mo.observe(document.documentElement || document.body, { childList: true, subtree: true });
      this._navObserver = mo;
    } catch (e) {}
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

  // Bouton ⚙ : docké dans le header BAND (ancienne place v1.6.x),
  // avec repli flottant fixe uniquement si le header n'est pas encore monté.
  // Les styles de base sont TOUJOURS ré-appliqués d'un seul bloc (cssText)
  // et jamais effacés (restauration display/opacity explicite).
  _injectFab() {
    if (!document.body) return;
    try { const ex = document.getElementById('bt-fab'); if (ex) { this.fab = ex; this._applyPageVisibility(); return; } } catch (e) {}
    if (this.fab && this.fab.parentElement) { try { this.fab.parentElement.removeChild(this.fab); } catch (e) {} }
    const fab = document.createElement('button');
    fab.id = 'bt-fab';
    fab.type = 'button';
    fab.textContent = '⚙';
    fab.title = 'Unbanded — paramètres';
    fab.setAttribute('data-bt-root', '1');
    // Hover : restaure toujours la valeur de base (jamais `''` qui effacerait
    // la déclaration inline du cssText).
    fab.onmouseenter = function () { fab.style.transform = 'scale(1.1)'; fab.style.opacity = '1'; };
    fab.onmouseleave = function () {
      fab.style.transform = '';
      fab.style.opacity = fab.dataset.btBaseOpacity || '.8';
    };
    fab.onclick = () => this.openSettings('about');

    // 1) Dock dans le header BAND, après la barre de recherche
    //    (.gnbLogoSearchArea) : respecte la DA du site, jamais sur Envoyer.
    const searchArea = document.querySelector('#header .headerInner .gnbLogoSearchArea');
    const headerInner = searchArea || document.querySelector('#header .headerInner, #header');
    if (headerInner) {
      fab.style.cssText = 'flex:0 0 auto;align-self:center;width:32px;height:32px;margin-left:10px;' +
        'border:1px solid rgba(128,128,128,.35);border-radius:50%;cursor:pointer;font-size:16px;' +
        'line-height:1;color:inherit;background:transparent;' +
        'display:inline-flex;align-items:center;justify-content:center;padding:0;font-family:inherit;' +
        'opacity:.8;transition:transform .15s ease,opacity .2s ease;';
      fab.dataset.btBaseOpacity = fab.style.opacity;
      headerInner.appendChild(fab);
      this.fab = fab;
      this._syncFabState();
      this._applyPageVisibility();
      this.adapter.log('Bouton ⚙ docké dans le header BAND.');
      return;
    }
    // 2) Repli : flottant fixe en bas à droite (header pas encore monté).
    fab.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:10001;width:46px;height:46px;' +
      'border:none;border-radius:50%;cursor:pointer;font-size:21px;line-height:1;color:#fff;' +
      'background:var(--btt-accent,#6c5ce7);box-shadow:0 4px 14px rgba(0,0,0,.4);' +
      'display:flex;align-items:center;justify-content:center;padding:0;font-family:inherit;' +
      'opacity:.8;transition:transform .15s ease,opacity .2s ease;';
    fab.dataset.btBaseOpacity = fab.style.opacity;
    document.body.appendChild(fab);
    this.fab = fab;
    this._syncFabState();
    this.adapter.log('Bouton ⚙ flottant injecté (repli, header absent).');
  }

  /**
   * Si le ⚙ est en repli flottant alors que le header BAND est désormais
   * disponible (cas page principale chargée en retard par le SPA),
   * le re-docke dans le header.
   */
  _redockFabIfNeeded() {
    try {
      if (!this.fab || !document.body.contains(this.fab)) {
        this.fab = null;
        return;
      }
      if (this.fab.style.position !== 'fixed') return; // déjà docké
      const target = document.querySelector('#header .headerInner .gnbLogoSearchArea') ||
        document.querySelector('#header .headerInner, #header');
      if (!target) return;
      this.fab.style.cssText = 'flex:0 0 auto;align-self:center;width:32px;height:32px;margin-left:10px;' +
        'border:1px solid rgba(128,128,128,.35);border-radius:50%;cursor:pointer;font-size:16px;' +
        'line-height:1;color:inherit;background:transparent;' +
        'display:inline-flex;align-items:center;justify-content:center;padding:0;font-family:inherit;' +
        'opacity:.8;transition:transform .15s ease,opacity .2s ease;';
      this.fab.dataset.btBaseOpacity = this.fab.style.opacity;
      target.appendChild(this.fab);
      this.adapter.log('Bouton ⚙ re-docké dans le header BAND.');
      this._applyPageVisibility();
    } catch (e) {}
  }

  toggleGui() {
    // Compat : le FAB ⚙ ouvre les Paramètres (À propos).
    // L'ancien panneau flottant n'existe plus (voir onglet Plugins).
    if (this.settingsVisible) {
      this.closeSettings();
      return;
    }
    this.openSettings('plugins');
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
