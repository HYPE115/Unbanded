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