// Harness: verifie le chargement de la banque de reactions (plugin builtin
// "reactions") : resolution des URLs CDN, repli entre CDN, JSON invalide,
// fallback SPA (HTML en HTTP 200) et GIF manquant.
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
function ok(label, cond) {
  if (!cond) failures++;
  console.log((cond ? 'PASS  ' : 'FAIL  ') + label);
}

// --- Charge le plugin dans un sandbox navigateur minimal --------------------
// On teste soit src/plugins/reactions.js, soit le bundle construit
// (unbanded.user.js) via la variable d'environnement BTT_TEST_BUNDLE.
const SRC = process.env.BTT_TEST_BUNDLE || 'src/plugins/reactions.js';
const code = read(SRC);
console.log('INFO  source testee: ' + SRC + '\n');

function res({ ok = true, status = 200, ct = 'application/json', body = '' } = {}) {
  return {
    ok,
    status,
    headers: { get: (h) => (h.toLowerCase() === 'content-type' ? ct : null) },
    async text() { return body; },
    async json() { return JSON.parse(body); },
    async blob() { return { type: ct, size: body.length }; }
  };
}

// --- Helpers de suivi des toasts --------------------------------------------
// Le bundle complet emet un toast de demarrage (asynchrone) qui peut polluer
// les assertions. On correle chaque toast a la cle i18n qui a produit son
// message : le plugin de reactions utilise "rx.*" (rx.sent / rx.fallback...).
// Un toast est donc identifie par sa cle, pas par sa position.
function rxToasts(toasts) {
  return toasts.filter((t) => t && t[2] && String(t[2]).indexOf('rx.') === 0);
}

// --- DOM factice minimal (necessaire pour charger le bundle complet) -------
// Le bundle installe ses hooks UI qui touchent document/window au chargement.
function makeDoc() {
  const mkEl = (tag) => ({
    tagName: (tag || 'div').toUpperCase(),
    style: { cssText: '', setProperty() {}, removeProperty() {} },
    dataset: {},
    children: [],
    childNodes: [],
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    attributes: {},
    textContent: '',
    innerHTML: '',
    id: '',
    className: '',
    parentNode: null,
    firstChild: null,
    lastChild: null,
    nextSibling: null,
    appendChild(c) { this.children.push(c); this.childNodes.push(c); c.parentNode = this; return c; },
    insertBefore(c) { this.children.unshift(c); this.childNodes.unshift(c); c.parentNode = this; return c; },
    removeChild(c) {
      const i = this.children.indexOf(c);
      if (i !== -1) this.children.splice(i, 1);
      const j = this.childNodes.indexOf(c);
      if (j !== -1) this.childNodes.splice(j, 1);
      return c;
    },
    remove() {},
    setAttribute(k, v) { this.attributes[k] = v; },
    getAttribute(k) { return this.attributes[k] == null ? null : this.attributes[k]; },
    removeAttribute(k) { delete this.attributes[k]; },
    hasAttribute(k) { return this.attributes[k] != null; },
    addEventListener() {},
    removeEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    closest() { return null; },
    contains() { return false; },
    getBoundingClientRect() { return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }; },
    focus() {},
    blur() {},
    click() {},
    cloneNode() { return mkEl(tag); }
  });
  const body = mkEl('body');
  const head = mkEl('head');
  const findById = (root, id) => {
    if (root.id === id) return root;
    const kids = root.children || [];
    for (const k of kids) {
      const f = findById(k, id);
      if (f) return f;
    }
    return null;
  };
  const doc = {
    body, head, documentElement: mkEl('html'),
    readyState: 'complete',
    createElement: (t) => mkEl(t),
    createTextNode: (t) => ({ textContent: t, nodeType: 3 }),
    getElementById: (id) => findById(body, id) || findById(head, id),
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener() {},
    removeEventListener() {},
    createEvent: () => ({ initEvent() {} })
  };
  return doc;
}

function makePlugin(fetchImpl, toasts) {
  const win = {
    __BTT_toast: (m, k) => { if (toasts) toasts.push([m, k]); },
    BTTI18n: { t: (k, p) => k + ':' + JSON.stringify(p || {}) },
    fetch: fetchImpl
  };
  win.window = win;
  win.self = win;
  win.document = makeDoc();
  win.location = {
    href: 'https://band.us/', origin: 'https://band.us', hostname: 'band.us', host: 'band.us',
    protocol: 'https:', pathname: '/', search: '', hash: '', port: ''
  };
  win.navigator = { userAgent: 'node', language: 'fr', platform: 'Win32' };
  win.localStorage = {
    _d: {},
    getItem(k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; },
    setItem(k, v) { this._d[k] = String(v); },
    removeItem(k) { delete this._d[k]; },
    clear() { this._d = {}; }
  };
  win.sessionStorage = win.localStorage;
  // Le bundle installe des setInterval (tick d'injection UI) : on les neutralise
  // pour que le processus Node se termine, tout en gardant setTimeout (async).
  win.setTimeout = setTimeout;
  win.clearTimeout = clearTimeout;
  win.setInterval = () => 0;
  win.clearInterval = () => {};
  win.requestAnimationFrame = () => 0;
  win.cancelAnimationFrame = () => {};
  win.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  win.getComputedStyle = () => ({ getPropertyValue: () => '' });
  win.addEventListener = () => {};
  win.removeEventListener = () => {};
  win.dispatchEvent = () => true;
  win.MutationObserver = class { observe() {} disconnect() {} };
  win.IntersectionObserver = class { observe() {} disconnect() {} };
  win.ResizeObserver = class { observe() {} disconnect() {} };
  win.XMLHttpRequest = class { open() {} send() {} setRequestHeader() {} };
  win.alert = () => {};

  const doc = win.document;
  const mod = { exports: {} };
  // On passe aussi les timers globaux : dans le bundle, `setInterval(...)` est
  // resolu dans le scope global (le window du navigateur), pas via `window.`.
  // On les neutralise pour que le processus Node se termine.
  const noopInterval = () => 0;
  const fn = new Function('window', 'document', 'fetch', 'module', 'localStorage', 'navigator', 'location',
    'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame',
    code + '\nreturn window.PluginReactions;');
  const plugin = fn(win, doc, fetchImpl, mod, win.localStorage, win.navigator, win.location,
    setTimeout, clearTimeout, noopInterval, () => {}, () => 0, () => {});
  // Le bundle installe son propre __BTT_toast / BTTI18n : on réinstalle nos
  // spies APRES l'évaluation pour observer les toasts déclenchés par le plugin.
  // On memorise la derniere cle i18n traduite afin de pouvoir correler un
  // toast a sa cle d'origine (rx.sent / rx.fallback...).
  let lastKey = null;
  if (toasts) {
    win.__BTT_toast = (m, k) => { toasts.push([m, k, lastKey]); };
  }
  const i18n = win.BTTI18n;
  if (i18n && typeof i18n.t === 'function') {
    // On remplace la methode "t" EN PLACE (pas l'objet) pour ne pas casser
    // BTTI18n.init() appele plus tard par main.js dans le bundle.
    const orig = i18n.t.bind(i18n);
    i18n.t = function (k, p) {
      if (toasts) {
        toasts.i18nKeys = toasts.i18nKeys || [];
        toasts.i18nKeys.push(k);
      }
      lastKey = k;
      return orig(k, p);
    };
  }
  return plugin;
}

async function main() {

// --- 1. Resolution des URLs -------------------------------------------------
{
  const P = makePlugin(async () => res({ body: '[]' }));
  const I = P._internals;
  const src = I.BANK_SOURCES;

  check('sources: 3 entrees (2 CDN absolus + repli same-origin)', src.length, 3);
  ok('source 0 = jsDelivr absolu', /^https:\/\/cdn\.jsdelivr\.net\/gh\/HYPE115\/Unbanded@main\/src\/assets\/reactions\/?$/.test(src[0]));
  ok('source 1 = Statically absolu', /^https:\/\/cdn\.statically\.io\/gh\/HYPE115\/Unbanded\/main\/src\/assets\/reactions\/?$/.test(src[1]));
  check('source 2 = repli same-origin relatif', src[2], 'src/assets/reactions/');
  ok('les 2 premieres sources sont absolues', src.slice(0, 2).every((s) => /^https:\/\//.test(s)));

  check('joinUrl: base + fichier', I.joinUrl(src[0], 'manifest.json'), 'https://cdn.jsdelivr.net/gh/HYPE115/Unbanded@main/src/assets/reactions/manifest.json');
  check('joinUrl: pas de double slash', I.joinUrl(src[0] + '/', '/manifest.json'), 'https://cdn.jsdelivr.net/gh/HYPE115/Unbanded@main/src/assets/reactions/manifest.json');
  check('joinUrl: chemin reaction', I.joinUrl(I.joinUrl(src[0], 'hug'), '01.gif'), 'https://cdn.jsdelivr.net/gh/HYPE115/Unbanded@main/src/assets/reactions/hug/01.gif');
}

// --- 2. Chargement nominal --------------------------------------------------
{
  const manifest = JSON.stringify([{ cmd: 'hug', files: ['01.gif', '02.gif'] }]);
  const calls = [];
  const P = makePlugin(async (url) => {
    calls.push(url);
    if (url.endsWith('manifest.json')) return res({ ct: 'application/json', body: manifest });
    return res({ ct: 'image/gif', body: 'GIF89a-fake' });
  });
  const I = P._internals;
  const bank = await I.loadBank();
  check('loadBank: 1 entree (jeu de test)', bank.entries.length, 1);
  check('loadBank: source = 1er CDN', bank.source, I.BANK_SOURCES[0]);
  check('loadBank: URL du manifeste', bank.url, 'https://cdn.jsdelivr.net/gh/HYPE115/Unbanded@main/src/assets/reactions/manifest.json');
  ok('loadBank: 1 seule requete (pas de repli necessaire)', calls.length === 1);
  check('pickGif: fichier de la categorie', ['01.gif', '02.gif'].includes(I.pickGif(bank, 'hug')), true);
  check('pickGif: categorie inconnue -> null', I.pickGif(bank, 'slap'), null);
}


// --- 3. Repli entre CDN -----------------------------------------------------
{
  const manifest = JSON.stringify([{ cmd: 'hug', files: ['01.gif'] }]);
  const calls = [];
  const P = makePlugin(async (url) => {
    calls.push(url);
    if (url.indexOf('jsdelivr') !== -1) throw new Error('network down');
    if (url.endsWith('manifest.json')) return res({ ct: 'application/json', body: manifest });
    return res({ ct: 'image/gif', body: 'GIF89a-fake' });
  });
  const I = P._internals;
  const bank = await I.loadBank();
  check('repli CDN: source = 2e source (Statically)', bank.source, I.BANK_SOURCES[1]);
  ok('repli CDN: la 1re source a bien ete tentee', calls[0].indexOf('jsdelivr') !== -1);
  check('repli CDN: 2 requetes au total', calls.length, 2);
}

// --- 4. Toutes les sources en echec -> erreur explicite ---------------------
{
  const P = makePlugin(async () => { throw new Error('offline'); });
  const I = P._internals;
  let msg = '';
  try { await I.loadBank(); } catch (e) { msg = e.message; }
  ok('echec total: message "Reaction bank not found"', msg.indexOf('Reaction bank not found') !== -1);
  ok('echec total: detail des sources', msg.indexOf('network error') !== -1);
}


// --- 5. JSON invalide --------------------------------------------------------
{
  const P = makePlugin(async () => res({ ct: 'application/json', body: '{not json' }));
  const I = P._internals;
  let msg = '';
  try { await I.fetchJson('https://x/manifest.json'); } catch (e) { msg = e.message; }
  check('JSON invalide: message', msg, 'invalid JSON');
}

// --- 6. Fallback SPA (HTML renvoye avec HTTP 200) ---------------------------
{
  const P = makePlugin(async () => res({ ok: true, status: 200, ct: 'text/html; charset=utf-8', body: '<!DOCTYPE html><html></html>' }));
  const I = P._internals;
  let msg = '';
  try { await I.fetchJson('https://band.us/src/assets/reactions/manifest.json'); } catch (e) { msg = e.message; }
  ok('fallback SPA: detecte comme non-JSON', msg.indexOf('not JSON') !== -1);
}

// --- 7. Manifeste JSON valide mais pas une liste ----------------------------
{
  const P = makePlugin(async () => res({ ct: 'application/json', body: '{"cmd":"hug"}' }));
  const I = P._internals;
  let msg = '';
  try { await I.loadBank(['https://x/']); } catch (e) { msg = e.message; }
  ok('manifeste objet: refuse', msg.indexOf('invalid bank') !== -1);
}

// --- 8. Erreur HTTP ----------------------------------------------------------
{
  const P = makePlugin(async () => res({ ok: false, status: 404, body: '' }));
  const I = P._internals;
  let msg = '';
  try { await I.fetchJson('https://x/manifest.json'); } catch (e) { msg = e.message; }
  check('erreur HTTP: message', msg, 'HTTP 404');
}


// --- 9. GIF manquant / reponse non-image -------------------------------------
{
  const P = makePlugin(async () => res({ ok: false, status: 404, body: '' }));
  const I = P._internals;
  let msg = '';
  try { await I.fetchGif('https://x/', 'hug', '01.gif'); } catch (e) { msg = e.message; }
  check('GIF 404: message', msg, 'HTTP 404');
}
{
  const P = makePlugin(async () => res({ ok: true, status: 200, ct: 'text/html', body: '<html>nope</html>' }));
  const I = P._internals;
  let msg = '';
  try { await I.fetchGif('https://x/', 'hug', '01.gif'); } catch (e) { msg = e.message; }
  ok('GIF HTML: refuse comme image', msg.indexOf('not an image') !== -1);
}


// --- 10. run() : succes (envoi via l'adapter) --------------------------------
{
  const manifest = JSON.stringify([{ cmd: 'hug', files: ['01.gif'] }]);
  const toasts = [];
  const sent = [];
  const P = makePlugin(async (url) => {
    if (url.endsWith('manifest.json')) return res({ ct: 'application/json', body: manifest });
    return res({ ct: 'image/gif', body: 'GIF89a-fake' });
  }, toasts);
  const info = {
    getConversationType: () => 'dm',
    getCurrentUser: () => ({ name: 'Alice' }),
    getUserByMention: () => null,
    sendFile: async (blob, name) => { sent.push({ blob, name }); }
  };
  // On ne compte que les toasts produits par le plugin de reactions
  // (identifies par leur cle i18n rx.*) : le bundle emet aussi un toast
  // de demarrage asynchrone.
  await P._internals.run('hug', [], info);
  const t = rxToasts(toasts);
  check('run: un fichier envoye', sent.length, 1);
  check('run: nom du fichier', sent[0] && sent[0].name, 'hug-Alice.gif');
  check('run: type MIME du blob', sent[0] && sent[0].blob.type, 'image/gif');
  ok('run: toast de succes', t.some((x) => x[1] === 'ok'));
  ok('run: cle i18n rx.sent utilisee', t.some((x) => x[2] === 'rx.sent'));
  ok('run: aucun toast warn', !t.some((x) => x[1] === 'warn'));
}


// --- 11. run() : echec -> toast warn, rien n'est envoye -----------------------
{
  const toasts = [];
  const sent = [];
  const P = makePlugin(async () => { throw new Error('offline'); }, toasts);
  const info = {
    getConversationType: () => 'dm',
    getCurrentUser: () => ({ name: 'Bob' }),
    getUserByMention: () => null,
    sendFile: async (blob, name) => { sent.push({ blob, name }); }
  };
  await P._internals.run('hug', [], info);
  const t = rxToasts(toasts);
  check('echec: rien envoye', sent.length, 0);
  ok('echec: toast warn', t.some((x) => x[1] === 'warn'));
  ok('echec: cle i18n rx.fallback utilisee', t.some((x) => x[2] === 'rx.fallback'));
  ok('echec: aucun toast ok', !t.some((x) => x[1] === 'ok'));
}

// --- 12. run() : GIF absent sur le 1er CDN -> repli sur un autre -------------
{
  const manifest = JSON.stringify([{ cmd: 'hug', files: ['01.gif'] }]);
  const toasts = [];
  const sent = [];
  const urls = [];
  const P = makePlugin(async (url) => {
    urls.push(url);
    if (url.endsWith('manifest.json')) return res({ ct: 'application/json', body: manifest });
    if (url.indexOf('jsdelivr') !== -1) return res({ ok: false, status: 404, body: '' });
    return res({ ct: 'image/gif', body: 'GIF89a-fake' });
  }, toasts);
  const info = {
    getConversationType: () => 'dm',
    getCurrentUser: () => ({ name: 'Carol' }),
    getUserByMention: () => null,
    sendFile: async (blob, name) => { sent.push({ blob, name }); }
  };
  await P._internals.run('hug', [], info);
  const t = rxToasts(toasts);
  check('repli GIF: un fichier envoye', sent.length, 1);
  ok('repli GIF: tentative sur le 2e CDN', urls.some((u) => u.indexOf('statically') !== -1 && u.indexOf('hug/01.gif') !== -1));
  ok('repli GIF: toast de succes', t.some((x) => x[1] === 'ok'));
}

console.log('');
if (process.argv.indexOf('--live') !== -1) {
  console.log('--- Test LIVE (reseau reel) ---');
  try {
    await liveTest();
  } catch (e) {
    console.log('SKIP  test live impossible (hors-ligne ?) : ' + (e && e.message ? e.message : e));
  }
}
console.log(failures === 0 ? 'TOUT EST OK' : failures + ' ECHEC(S)');
process.exitCode = failures === 0 ? 0 : 1;
}

// --- 13. Test LIVE contre les vrais CDN (ignore si hors-ligne) --------------
async function liveTest() {
  const toasts = [];
  const sent = [];
  const urls = [];
  const P = makePlugin(async (url) => {
    urls.push(url);
    const r = await fetch(url);
    const ct = r.headers.get('content-type') || '';
    if (url.endsWith('.gif')) {
      const blob = await r.blob();
      return {
        ok: r.ok, status: r.status, headers: r.headers,
        async text() { return ''; },
        async blob() { return blob; }
      };
    }
    const body = await r.text();
    return res({ ok: r.ok, status: r.status, ct: ct, body: body });
  }, toasts);

  const info = {
    getConversationType: () => 'dm',
    getCurrentUser: () => ({ name: 'LiveTest' }),
    getUserByMention: () => null,
    sendFile: async (blob, name) => { sent.push({ blob, name }); }
  };

  await P._internals.run('hug', [], info);
  const t = rxToasts(toasts);
  check('LIVE: un fichier envoye', sent.length, 1);
  ok('LIVE: URL absolue jsDelivr utilisee', urls.some((u) => u.indexOf('https://cdn.jsdelivr.net/') === 0));
  ok('LIVE: chemin GIF correct', urls.some((u) => /\/hug\/\d+\.gif$/.test(u)));
  if (sent[0]) {
    ok('LIVE: blob non vide', sent[0].blob && sent[0].blob.size > 0);
    console.log('INFO  LIVE: ' + sent[0].name + ' (' + (sent[0].blob ? sent[0].blob.size : 0) + ' octets, type=' + (sent[0].blob ? sent[0].blob.type : '?') + ')');
  }
  console.log('INFO  LIVE: ' + urls.join('\n             '));
  ok('LIVE: toast de succes', t.some((x) => x[1] === 'ok'));
  ok('LIVE: cle i18n rx.sent utilisee', t.some((x) => x[2] === 'rx.sent'));
}

main().catch((e) => {
  console.error('ERREUR FATALE: ' + (e && e.stack ? e.stack : e));
  process.exitCode = 1;
});

