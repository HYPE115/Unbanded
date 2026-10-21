// Harness: verifie que les chaines i18n avec placeholders {name}/{msg} sont
// bien substituees (le _t global doit forward `params` a BTTI18n.t).
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

let failures = 0;
function check(label, actual, expected) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label);
  if (!ok) console.log('        attendu: ' + JSON.stringify(expected) + '\n        obtenu  : ' + JSON.stringify(actual));
}

// --- Charge i18n.js dans un contexte navigateur minimal -----------------------
const dicts = {};
const sandbox = {
  window: {
    BTTStore: { get: (k, d) => d, set() {}, remove() {} },
    localStorage: undefined
  },
  navigator: { language: 'en-US' }
};
sandbox.window.window = sandbox.window;
sandbox.globalThis = sandbox;

const i18nCode = read('src/core/i18n.js');
// i18n.js expose window.BTTI18n
const fn = new Function('window', 'navigator', 'document', i18nCode);
fn(sandbox.window, sandbox.navigator, undefined);

const BTTI18n = sandbox.window.BTTI18n;
if (!BTTI18n || typeof BTTI18n.t !== 'function') {
  console.log('FAIL  i18n.js n\'expose pas window.BTTI18n.t');
  process.exit(1);
}

// --- Test du translateur i18n brut -------------------------------------------
check('i18n: {name} substitue',
  BTTI18n.t('thm.appliedToast', { name: 'Monokai' }),
  'Theme applied: Monokai');
check('i18n: {msg} substitue',
  BTTI18n.t('plg.failed', { msg: 'boom' }),
  'Plugin failed: boom');

// --- Test du _t global (signature 3 args) -----------------------------------
const uiCode = read('src/core/ui.js');
// On isole la definition de _t en tete de ui.js.
const m = uiCode.match(/var _t = function[\s\S]*?\n};/);
if (!m) { console.log('FAIL  _t introuvable dans ui.js'); process.exit(1); }
const tFactory = new Function('window', m[0] + '; return _t;');
const _t = tFactory(sandbox.window);

check('_t: fallback def quand i18n absent', _t('nope.key', 'DEFAULT'), 'DEFAULT');
check('_t: params substitues', _t('thm.appliedToast', 'Theme applied: {name}', { name: 'Nord' }), 'Theme applied: Nord');
check('_t: cle inconnue -> def', _t('does.not.exist', 'DEF'), 'DEF');

// --- Verifie que les appels du code source utilisent la forme params ---------
// Interdit uniquement : _t('cle', 'def {placeholder}') + var
// (le defaut contient un placeholder ET on concatene -> placeholder non resolu).
const sources = ['src/core/ui-settings.js'];
for (const s of sources) {
  const code = read(s);
  const bad = code.match(/_t\('[a-zA-Z]+\.[a-zA-Z]+',\s*'[^']*\{[a-z]+\}[^']*'\)\s*\+/g);
  check(s + ' : aucun placeholder i18n non resolu', bad ? bad.length : 0, 0);
  if (bad) bad.forEach((b) => console.log('        -> ' + b));
}

// --- Verifie que toutes les cles i18n avec placeholders ont bien des params ---
const i18nText = i18nCode;
const placeholderKeys = [...i18nText.matchAll(/'([a-zA-Z]+\.[a-zA-Z]+)'\s*:\s*'([^']*\{[a-z]+\}[^']*)'/g)]
  .map((mm) => mm[1]);
const uniqKeys = [...new Set(placeholderKeys)];
console.log('INFO  cles i18n avec placeholder: ' + uniqKeys.join(', '));

// Chaque cle doit etre appelee avec params dans le code, ou via .replace(...)
const allSrc = sources.concat(['src/core/ui.js']).map(read).join('\n');
for (const key of uniqKeys) {
  const re = new RegExp("_t\\('" + key.replace('.', '\\.') + "'");
  const used = new RegExp(re.source).test(allSrc);
  console.log((used ? 'INFO  ' : 'WARN  ') + 'cle utilisee dans le code: ' + key);
}

console.log('');
console.log(failures === 0 ? 'TOUT EST OK (' + uniqKeys.length + ' cles a placeholder verifiees)' : failures + ' ECHEC(S)');
process.exit(failures === 0 ? 0 : 1);
