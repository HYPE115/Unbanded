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
    }
    // Le CSS perso doit GAGNER contre celui de band.us : toujours en FIN de
    // <head> (dernière feuille = prioritaire à spécificité égale), et jamais
    // ailleurs (le SPA déplace parfois les noeuds).
    try {
      var parent = el.parentNode;
      var shouldBeLast = head.lastChild !== el;
      if (!parent || parent !== head || shouldBeLast) {
        head.appendChild(el); // appendChild déplace le noeud s'il existe déjà
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

  // Couche CSS perso (bt-custom-css) TOUJOURS après le thème (bt-theme-css) :
  // c'est l'utilisateur qui a le dernier mot sur tout le site.
  function keepCustomLast() {
    try {
      var head = document.head || (document.getElementsByTagName && document.getElementsByTagName('head')[0]);
      if (!head) return;
      var custom = document.getElementById('bt-custom-css');
      var theme = document.getElementById('bt-theme-css');
      if (custom && theme && head.lastChild !== custom && (custom.compareDocumentPosition(theme) & 2)) {
        head.appendChild(custom);
      }
    } catch (e) {}
  }

  window.BTTStyles = { apply: apply, get: get, clear: clear, STYLE_ID: STYLE_ID, keepCustomLast: keepCustomLast };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.BTTStyles;
})();