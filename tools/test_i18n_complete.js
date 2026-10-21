// Verifie que chaque cle i18n utilisee dans le code existe dans TOUTES les
// langues, et que chaque cle avec placeholder {x} est appelee avec des params.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

let failures = 0;
const check = (label, actual, expected) => {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label);
  if (!ok) console.log('        attendu: ' + JSON.stringify(expected) + '\n        obtenu  : ' + JSON.stringify(actual));
};

// --- Charge i18n.js et recupere les dictionnaires par langue ---------------
const sandbox = {
  window: { BTTStore: { get: (k, d) => d, set() {}, remove() {} }, localStorage: undefined },
  navigator: { language: 'en-US' }
};
sandbox.window.window = sandbox.window;
sandbox.globalThis = sandbox;
const i18nCode = read('src/core/i18n.js');
new Function('window', 'navigator', 'document', i18nCode)(sandbox.window, sandbox.navigator, undefined);
const BTTI18n = sandbox.window.BTTI18n;

// On parse le code source pour isoler chaque dictionnaire (EN / FR).
// Structure : var EN = {}; puis plusieurs Object.assign(EN, { ... }); .
const dicts = {};
const dictRe = /Object\.assign\(\s*([A-Z]{2})\s*,\s*\{([\s\S]*?)\n\s*\}\s*\);/g;
let m;
while ((m = dictRe.exec(i18nCode))) {
  const lang = m[1].toLowerCase();
  if (!dicts[lang]) dicts[lang] = new Set();
  const keys = dicts[lang];
  const kRe = /'([a-zA-Z][a-zA-Z0-9]*(?:\.[a-zA-Z][a-zA-Z0-9]*)*)'\s*:/g;
  let km;
  while ((km = kRe.exec(m[2]))) keys.add(km[1]);
}
const langs = Object.keys(dicts);
console.log('INFO  langues detectees: ' + langs.join(', '));
check('au moins 2 langues (en + fr)', langs.length >= 2, true);
for (const lang of langs) {
  console.log('INFO  langue ' + lang + ' : ' + dicts[lang].size + ' cles');
  check('langue ' + lang + ' : au moins 100 cles', dicts[lang].size >= 100, true);
}

// --- Toutes les langues ont le meme jeu de cles ---------------------------
const ref = dicts[langs[0]];
for (const lang of langs.slice(1)) {
  const missing = [...ref].filter((k) => !dicts[lang].has(k));
  const extra = [...dicts[lang]].filter((k) => !ref.has(k));
  check('langue ' + lang + ': aucune cle manquante vs ' + langs[0], missing.length, 0);
  if (missing.length) console.log('        manquantes: ' + missing.join(', '));
  check('langue ' + lang + ': aucune cle en trop vs ' + langs[0], extra.length, 0);
  if (extra.length) console.log('        en trop: ' + extra.join(', '));
}

// --- Toutes les cles appelees dans le code existent dans chaque langue ----
const sources = [
  'src/core/ui.js', 'src/core/ui-settings.js', 'src/core/ui-panel.js',
  'src/core/commands.js', 'src/core/themes.js',
  'src/plugins/reactions.js', 'src/plugins/pet-pet.js',
  'src/plugins/games.js', 'src/plugins/tools.js'
];
const used = new Set();
for (const s of sources) {
  const code = read(s);
  for (const um of code.matchAll(/(?:_t|BTTI18n\.t)\(\s*'([a-zA-Z][a-zA-Z0-9]*(?:\.[a-zA-Z][a-zA-Z0-9]*)*)'/g)) used.add(um[1]);
}
console.log('INFO  cles appelees dans le code: ' + used.size);
for (const lang of langs) {
  const missing = [...used].filter((k) => !dicts[lang].has(k));
  check('langue ' + lang + ': toutes les cles appelees existent', missing.length, 0);
  if (missing.length) console.log('        manquantes: ' + missing.join(', '));
}

// --- Chaque cle avec placeholder est appelee avec des params --------------
const phKeys = [...i18nCode.matchAll(/'([a-zA-Z]+[a-zA-Z0-9]*)'\s*:\s*'([^']*\{[a-zA-Z]+\}[^']*)'/g)]
  .map((mm) => mm[1]);
const uniqPh = [...new Set(phKeys)];
const allSrc = sources.map(read).join('\n');
for (const key of uniqPh) {
  // Appel avec objet de params : _t('key', 'def', { ... }) ou BTTI18n.t('key', { ... })
  const withParams = new RegExp("(?:_t|BTTI18n\\.t)\\(\\s*'" + key.replace('.', '\\.') + "'\\s*,[\\s\\S]{0,80}?\\{").test(allSrc);
  const withReplace = new RegExp("'" + key.replace('.', '\\.') + "'[^\\n]{0,120}\\.replace\\(").test(allSrc);
  const okp = withParams || withReplace;
  if (!okp) failures++;
  console.log((okp ? 'PASS  ' : 'FAIL  ') + 'placeholder resolu: ' + key);
}

// --- Sanity: le rendu final ne doit pas contenir de {placeholder} ---------
const sample = BTTI18n.t('plg.failed', { msg: 'boom' });
check('rendu sans placeholder residuel', /\{[a-zA-Z]+\}/.test(sample), false);

console.log('');
console.log(failures === 0 ? 'TOUT EST OK' : failures + ' ECHEC(S)');
process.exitCode = failures === 0 ? 0 : 1;
