/**
 * BTTStyles - CSS personnalisé de l'utilisateur (appliqué à band.us, persisté).
 */
(function () {
  var STYLE_ID = 'bt-custom-css';

  function get() {
    try { return String(window.BTTStore ? window.BTTStore.get('customCss', '') || '' : ''); }
    catch (e) { return ''; }
  }

  function ensureEl() {
    var head = document.head || (document.getElementsByTagName && document.getElementsByTagName('head')[0]) || document.documentElement;
    var el = document.getElementById(STYLE_ID);
    if (!el) {
      el = document.createElement('style');
      el.id = STYLE_ID;
      el.setAttribute('data-bt-root', '1');
      el.setAttribute('data-bt-prio', '1');
      head.appendChild(el);
      return el;
    }
    // Le CSS perso doit GAGNER contre celui de band.us : toujours en FIN de
    // <head> (dernière feuille = prioritaire à spécificité égale), et jamais
    // ailleurs (le SPA déplace parfois les noeuds). appendChild déplace le
    // noeud s'il est déjà dans le head, sinon le rattache.
    try {
      if (!el.parentNode || el.parentNode !== head) {
        head.appendChild(el);
      } else {
        // Déplace systématiquement en dernier pour écraser le CSS de band.us.
        head.appendChild(el);
      }
    } catch (e) {
      try { head.appendChild(el); } catch (e2) {}
    }
    return el;
  }

  function apply(css) {
    css = String(css == null ? '' : css);
    var el = ensureEl();
    el.textContent = css;
    if (window.BTTStore) window.BTTStore.set('customCss', css);
  }

  function clear() {
    apply('');
    try { if (window.BTTStore) window.BTTStore.remove('customCss'); } catch (e) {}
  }

  // Couches CSS dans l'ordre : theme-css < theme-site < custom.
  // Le CSS perso de l'utilisateur a TOUJOURS le dernier mot.
  function keepCustomLast() {
    try {
      var head = document.head || (document.getElementsByTagName && document.getElementsByTagName('head')[0]);
      if (!head) return;
      var custom = document.getElementById(STYLE_ID);
      var site = document.getElementById('bt-theme-site');
      var theme = document.getElementById('bt-theme-css');
      // 1) theme-site juste apres theme-css
      if (site && theme && theme.nextSibling !== site) {
        head.insertBefore(site, theme.nextSibling);
      }
      // 2) custom en tout dernier (force, sans verifier lastChild car le SPA
      // peut laisser des nodes texte entre les elements).
      if (custom) {
        head.appendChild(custom);
      }
    } catch (e) {}
  }

  // Verifie que #bt-custom-css est present dans le DOM et recree/rattache si
  // le SPA de band.us l'a detruit ou deplace. Appelle apply() pour restaurer
  // le contenu si nécessaire.
  function repair() {
    try {
      var head = document.head || (document.getElementsByTagName && document.getElementsByTagName('head')[0]) || document.documentElement;
      if (!head) return;
      var el = document.getElementById(STYLE_ID);
      if (!el || !el.parentNode) {
        el = document.createElement('style');
        el.id = STYLE_ID;
        el.setAttribute('data-bt-root', '1');
        el.setAttribute('data-bt-prio', '1');
        head.appendChild(el);
      } else if (el.parentNode !== head) {
        head.appendChild(el);
      }
      var css = get();
      if (el.textContent !== css) {
        el.textContent = css;
      }
      head.appendChild(el); // dernier mot
    } catch (e) {}
  }

  window.BTTStyles = { apply: apply, get: get, clear: clear, STYLE_ID: STYLE_ID, keepCustomLast: keepCustomLast, repair: repair };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.BTTStyles;
})();