/* Test non-régression Band Tamper.
 * Exécute band-tamper.user.js comme le ferait le navigateur (new Function = scope local,
 * pas de module CommonJS disponible), puis simule des frappes Entrée sur le hook global. */
globalThis.window = globalThis;
globalThis.Event = function (t, o) { this.type = t; this.o = o || {}; };
globalThis.KeyboardEvent = function (t, o) { this.type = t; this.o = o || {}; };
globalThis.File = function () {};
globalThis.DataTransfer = function () { this.items = { add: () => {} }; };
globalThis.Blob = function () { return {}; };

const events = [];
const bodyChildren = [];
const byId = {};
const makeEl = (tag, id) => {
  const el = { tagName: (tag || 'div').toUpperCase(), id: id || null, type: '', style: {}, onclick: null, textContent: '', value: '', _l: {}, dataset: {}, innerHTML: '', files: null, parentElement: null, _children: [] };
  el.addEventListener = (type, cb) => { (el._l[type] = el._l[type] || []).push(cb); };
  el.dispatchEvent = (ev) => { (el._l[ev.type] || []).forEach(cb => cb(ev)); return true; };
  el.focus = () => {};
  el.setAttribute = (k, v) => { if (k === 'id') el.id = v; };
  el.getAttribute = () => null;
  el.closest = () => null;
  el.querySelector = () => null;
  el.getClientRects = () => [];
  el.click = () => {};
  el.remove = () => {};
  el.appendChild = (c) => { el._children.push(c); if (c && c.id) byId[c.id] = c; };
  el.width = 0; el.height = 0;
  el.getContext = () => ({ fillStyle: '', fillRect() {}, beginPath() {}, ellipse() {}, arc() {}, drawImage() {}, translate() {}, rotate() {}, save() {}, restore() {}, setTransform() {}, createRadialGradient() {}, addColorStop() {}, measureText() { return { width: 0 }; }, fillText() {}, stroke() {}, fill() {}, clearRect() {}, putImageData() {}, getImageData() { return { data: new Uint8ClampedArray(0) }; } });
  el.toBlob = (cb) => setTimeout(() => cb({ size: 42, type: 'image/png' }), 0);
  return el;
};
const docListeners = {};
globalThis.document = {
  head: { appendChild: (s) => { setTimeout(() => { if (s.onload) s.onload(); }, 0); } },
  body: {
    appendChild: (el) => {
      events.push('body.append ' + (el.id || el.tagName || 'el'));
      if (el.id) byId[el.id] = el;
      bodyChildren.push(el);
      el.parentElement = globalThis.document.body;
    },
    contains: (el) => bodyChildren.indexOf(el) !== -1
  },
  createElement: (tag) => makeEl(tag),
  querySelector: () => null,
  querySelectorAll: () => [],
  getElementById: (id) => byId[id] || null,
  activeElement: null,
  addEventListener: (type, cb) => { (docListeners[type] = docListeners[type] || []).push(cb); }
};
globalThis.location = { hostname: 'example.com', pathname: '/', search: '' };
globalThis.Image = class {
  constructor() { this.crossOrigin = 'anonymous'; this.onload = null; this.onerror = null; this.src = ''; setTimeout(() => { if (this.onload) this.onload(); }, 0); }
};
globalThis.HTMLCanvasElement = function () {};
globalThis.HTMLCanvasElement.prototype.getContext = function () { return makeEl('canvas').getContext(); };
globalThis.HTMLCanvasElement.prototype.toBlob = function (cb) { setTimeout(() => cb({ size: 42, type: 'image/png' }), 0); };

const fs = require('fs');
const path = require('path');
const code = fs.readFileSync(path.join(__dirname, 'band-tamper.user.js'), 'utf8');
new Function(code)();

const wait = (ms) => new Promise(r => setTimeout(r, ms));
const pressEnter = async (text) => {
  const el = makeEl('input');
  el.type = 'text';
  el.value = text;
  const ev = {
    key: 'Enter', ctrlKey: false, metaKey: false, altKey: false, target: el, prevented: false,
    preventDefault() { this.prevented = true; },
    stopPropagation() {},
    stopImmediatePropagation() {}
  };
  for (const cb of (docListeners.keydown || [])) await cb(ev);
  return { el, ev };
};
const lastToast = () => {
  const w = byId['bt-toasts'];
  const ch = (w && w._children) || [];
  return ch.length ? String(ch[ch.length - 1].textContent) : '';
};
let pass = 0, fail = 0;
const check = (name, cond) => { if (cond) { pass++; console.log('  OK       ' + name); } else { fail++; console.log('  ECHEC    ' + name); } };
const TINY_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

(async () => {
  await wait(200);
  console.log('— Chargement du userscript (contexte navigateur simulé) —');
  check('BandAdapter exposé', typeof window.BandAdapter === 'function');
  check('PluginManager exposé', typeof window.PluginManager === 'function');
  check('BandUI exposé', typeof window.BandUI === 'function');
  check('registerBuiltInCommands exposé', typeof window.registerBuiltInCommands === 'function');
  check('PluginPetPet exposé', typeof window.PluginPetPet === 'object');
  check('__BTT_PetGif exposé', typeof window.__BTT_PetGif === 'function');
  check('__BTT_toast exposé', typeof window.__BTT_toast === 'function');
  check('hook keydown global enregistré (1x)', (docListeners.keydown || []).length === 1);
  check('panneau injecté dans body', events.indexOf('body.append bt-band-panel') !== -1);
  check('toast de démarrage affiché', lastToast().includes('Band Tamper'));

  console.log('— Commande /help —');
  const h = await pressEnter('/help');
  check('Entrée interceptée (preventDefault)', h.ev.prevented === true);
  check('champ vidé après exécution', h.el.value === '');
  await wait(30);
  check('toast /help = liste des commandes', lastToast().includes('Commandes Band Tamper'));
  check('/help référence /btdbg', lastToast().includes('/btdbg'));

  console.log('— Commande inconnue /xyz —');
  await pressEnter('/xyz');
  await wait(30);
  check('toast commande inconnue', lastToast().includes('Commande inconnue'));

  console.log('— Commande /pat (démo) —');
  const p = await pressEnter('/pat');
  check('/pat interceptée (preventDefault)', p.ev.prevented === true);
  await wait(700);
  // Sans gif.js (env. test), le générateur bascule sur le PNG statique → toast d'avertissement
  check('toast /pat : GIF envoyé ou fallback statique annoncé',
    lastToast().includes('GIF pet-pet envoyé') || lastToast().includes('Image statique envoyée'));

  console.log('— Génération GIF —');
  try {
    const b = await window.__BTT_PetGif(TINY_PNG);
    check('blob généré (42 image/png)', b && b.size === 42 && b.type === 'image/png');
  } catch (e) { check('blob généré : ' + e.message, false); }
  check('10 frames de main aDu embarquées (base64)',
    Array.isArray(window.__BTT_PET_HANDS) && window.__BTT_PET_HANDS.length === 10 &&
    String(window.__BTT_PET_HANDS[0]).indexOf('data:image/gif;base64,') === 0);
  check('algorithme pet-pet : 10 frames / 10 mains',
    window.__BTT_PetGif && window.__BTT_PetGif.frames === 10 && window.__BTT_PetGif.handCount === 10);
  check('gifenc vendorisé exposé (window.__BTT_GIFENC)',
    window.__BTT_GIFENC && typeof window.__BTT_GIFENC.GIFEncoder === 'function' &&
    typeof window.__BTT_GIFENC.quantize === 'function' && typeof window.__BTT_GIFENC.applyPalette === 'function');
  check('aucune dépendance CDN gif.js (compatible CSP band.us)',
    code.indexOf('unpkg.com/gif.js') === -1 && code.indexOf('cdn.jsdelivr.net/npm/gif.js') === -1);

  console.log('— Bouton "Tamper" dans le header BAND —');
  const feedLi = makeEl('li');
  const feedA = makeEl('a');
  feedA.href = '/feed';
  feedA.closest = (sel) => (sel === 'li' ? feedLi : null);
  feedLi.insertAdjacentElement = (pos, el) => { feedLi._after = { pos, el }; };
  const savedQS = document.querySelector;
  document.querySelector = (sel) => (sel.indexOf('a[href="/feed"]') !== -1 ? feedA : null);
  const ui = window.BandTamperUI;
  ui.adapter.demo = false;
  ui._injectButton();
  document.querySelector = savedQS;
  check('bouton injecté après le lien Feed (afterend)', feedLi._after && feedLi._after.pos === 'afterend');
  check('item header = #bt-header-item', feedLi._after && feedLi._after.el.id === 'bt-header-item');
  check('libellé du bouton = Tamper', ui.btn.textContent === 'Tamper');
  ui.btn.onclick();
  check('clic sur Tamper ouvre le panneau', ui.panel.style.display === 'flex');
  ui.adapter.demo = true;

  console.log('');
  console.log(pass + ' OK / ' + fail + ' échec(s)');
  process.exitCode = fail ? 1 : 0;
  setTimeout(() => process.exit(fail ? 1 : 0), 100);
})().catch(e => { console.error('ERREUR FATALE :', e); process.exit(1); });