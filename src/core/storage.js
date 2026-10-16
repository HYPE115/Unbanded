/**
 * BTTStore - Persistance locale (localStorage si disponible, mémoire sinon).
 * Clés préfixées "btt:", valeurs JSON.
 */
(function () {
  var PREFIX = 'btt:';
  var memory = {};
  var hasLS = false;
  try {
    hasLS = typeof localStorage !== 'undefined' && !!localStorage;
    if (hasLS) {
      localStorage.setItem(PREFIX + '__probe', '1');
      localStorage.removeItem(PREFIX + '__probe');
    }
  } catch (e) { hasLS = false; }

  function get(key, def) {
    try {
      var raw = null;
      if (hasLS) raw = localStorage.getItem(PREFIX + key);
      else if (Object.prototype.hasOwnProperty.call(memory, key)) raw = memory[key];
      if (raw == null) return def;
      return JSON.parse(raw);
    } catch (e) { return def; }
  }

  function set(key, value) {
    var raw;
    try { raw = JSON.stringify(value); } catch (e) { return; }
    try {
      if (hasLS) localStorage.setItem(PREFIX + key, raw);
      else memory[key] = raw;
    } catch (e) { memory[key] = raw; }
  }

  function remove(key) {
    try {
      if (hasLS) localStorage.removeItem(PREFIX + key);
      delete memory[key];
    } catch (e) {}
  }

  window.BTTStore = { get: get, set: set, remove: remove, PREFIX: PREFIX };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.BTTStore;
})();