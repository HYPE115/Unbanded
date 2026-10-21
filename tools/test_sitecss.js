// Harness: charge themes.js dans un faux DOM et verifie la sortie de siteCss.
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src', 'core', 'themes.js');
const code = fs.readFileSync(SRC, 'utf8');

// Minimal DOM stub.
const els = {};
global.document = {
  documentElement: { style: { setProperty() {}, removeProperty() {} } },
  head: {
    appendChild(el) { els[el.id] = el; },
    lastChild: null,
  },
  getElementById(id) { return els[id] || null; },
  createElement() { return { id: '', setAttribute() {}, textContent: '' }; },
  getElementsByTagName() { return []; },
};
global.window = { BTTStore: { get: (k, d) => d, set() {}, remove() {} } };

eval(code);

window.BTTThemes.apply('monokai');
const css = els['bt-theme-site'].textContent;

console.log('longueur CSS:', css.length);
console.log('commence par:', JSON.stringify(css.slice(0, 60)));
console.log('fin par      :', JSON.stringify(css.slice(-60)));
console.log('contient "undefined":', css.includes('undefined'));
console.log('contient "NaN":', css.includes('NaN'));
console.log('nb de regles .sChatPop:', (css.match(/\.sChatPop/g) || []).length);

// Validation basique : chaque bloc { ... } est ferme et balanced.
let depth = 0, maxDepth = 0;
for (const ch of css) {
  if (ch === '{') { depth++; if (depth > maxDepth) maxDepth = depth; }
  else if (ch === '}') depth--;
  if (depth < 0) { console.log('ACCOLADE EXCEDENTAIRE'); break; }
}
console.log('profondeur finale:', depth, '| max:', maxDepth);

// Chaque ";" doit etre hors accolade (pas de statement JS casse).
const stray = css.match(/;[^}]*\{/g);
console.log('statements JS parasites:', stray ? stray.length : 0);

// --- Verifie TOUS les themes integres ---------------------------------------
console.log('');
console.log('--- Test de tous les themes integres ---');
const THEMES = ['default', 'midnight', 'dracula', 'nord', 'catppuccin', 'monokai', 'sunset', 'ocean', 'forest', 'light'];
let bad = 0;
for (const id of THEMES) {
  try {
    window.BTTThemes.apply(id);
    const out = els['bt-theme-site'].textContent;
    if (id === 'default') {
      // Theme "site default" : doit vider le CSS site.
      if (out.length !== 0) { console.log('FAIL  ' + id + ' : CSS site attendu vide, obtenu ' + out.length + ' car.'); bad++; }
      else console.log('PASS  ' + id + ' : CSS site vide (site natif)');
      continue;
    }
    let d = 0, mx = 0;
    for (const ch of out) {
      if (ch === '{') { d++; if (d > mx) mx = d; }
      else if (ch === '}') d--;
    }
    const problems = [];
    if (d !== 0) problems.push('accolades non balancees (' + d + ')');
    if (out.includes('undefined')) problems.push('contient undefined');
    if (out.includes('NaN')) problems.push('contient NaN');
    if (mx > 1) problems.push('imbrication anormale (' + mx + ')');
    if (out.length < 500) problems.push('CSS trop court (' + out.length + ')');
    if (problems.length) { console.log('FAIL  ' + id + ' : ' + problems.join(', ')); bad++; }
    else console.log('PASS  ' + id + ' : ' + out.length + ' car., ' + out.split('{').length + ' regles, prof.max ' + mx);
  } catch (e) {
    console.log('FAIL  ' + id + ' : exception ' + e.message);
    bad++;
  }
}
console.log('');
console.log(bad === 0 ? 'TOUS LES THEMES OK' : bad + ' THEME(S) EN ERREUR');
process.exit(bad === 0 ? 0 : 1);
