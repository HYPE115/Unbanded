const fs = require('fs');
const path = require('path');

const root = __dirname;

const VERSION = '1.8.1';
const REPO = 'HYPE115/band_tamper';
const BRANCH = 'main';
const RAW = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/unbanded.user.js`;

// Icône du script (dashboard Tampermonkey) : logo.png embarqué en data-URI.
// Le dépôt étant privé, une URL raw GitHub ne chargerait pas — le data-URI
// fonctionne partout, y compris hors ligne.
const LOGO = path.join(root, 'logo.png');
const ICON = fs.existsSync(LOGO)
  ? 'data:image/png;base64,' + fs.readFileSync(LOGO).toString('base64')
  : '';

const order = [
  'src/core/storage.js',
  'src/core/adapter.js',
  'src/core/plugin-manager.js',
  'src/core/plugin-manager-builtin.js',
  'src/core/themes.js',
  'src/core/styles.js',
  'src/core/commands.js',
  'src/core/ui.js',
  'src/core/ui-panel.js',
  'src/core/i18n.js',
  'src/core/ui-settings.js',
  'src/core/ui-hooks.js',
  'src/core/ui-autocomplete.js',
  'src/petpet-hand.js',
  'src/vendor/gifenc.js',
  'src/petpet-gif.js',
  'src/plugins/pet-pet.js',
  'src/plugins/reactions.js',
  'src/plugins/games.js',
  'src/plugins/tools.js',
  'src/main.js'
];

const header = `// ==UserScript==
// @name         Unbanded
// @namespace    http://tampermonkey.net/
// @version      ${VERSION}
// @description  Unbanded — chargeur de plugins type Vencord pour BAND (band.us) : page Paramètres (thèmes, CSS personnalisé, import plugin/thème par fichier ou URL), bouton ⚙ dans le header, commandes slash, plugin pet-pet (/pat) avec encodeur GIF embarqué (sans CDN).
// @author       HYPE115${ICON ? `\n// @icon        ${ICON}` : ''}
// @homepageURL  https://github.com/${REPO}
// @supportURL   https://github.com/${REPO}/issues
// @updateURL    ${RAW}
// @downloadURL  ${RAW}
// @match        *://band.us/*
// @match        *://*.band.us/*
// @grant        none
// @run-at       document-end
// @noframes
// ==/UserScript==

(function () {
'use strict';
window.BTT_VERSION = '${VERSION}';
var module = { exports: {} };
`;

let out = header + '\n';
out += (
  '/* CSP/network headers for api.waifu.pics (hug, cuddle, slap, ...) */\n' +
  "(function () {\n" +
  "  'use strict';\n" +
  "  try {\n" +
  "    var head = document.head || document.getElementsByTagName('head')[0];\n" +
  "    if (!head) return;\n" +
  "    if (window.__btt_csp_injected__) return;\n" +
  "    window.__btt_csp_injected__ = true;\n" +
  "\n" +
  "    // 1) connect-src for the waifu.pics API (the only remote fetch we do).\n" +
  "    var csp = \"connect-src https://api.waifu.pics https://api.waifu.pics/sfw https://api.waifu.pics/wf https://api.waifu.pics/nsfw 'self';\";\n" +
  "\n" +
  "    // 2) img-src for the GIF URL returned by the API (and local data:/blob: for fallbacks).\n" +
  "    csp += \" img-src https://api.waifu.pics data: blob: https: http: 'self';\";\n" +
  "\n" +
  "    // 3) script-src is left untouched (keep the page's policy).\n" +
  "    csp += \" script-src 'self' https: 'unsafe-inline' 'unsafe-eval';\";\n" +
  "\n" +
  "    var s = document.createElement('style');\n" +
  "    s.textContent = csp;\n" +
  "    head.appendChild(s);\n" +
  "  } catch (e) {}\n" +
  "})();\n"
);
for (var i = 0; i < order.length; i++) {
  var f = order[i];
  out += fs.readFileSync(path.join(root, f), 'utf8') + '\n\n';
}
out += `})();`;

fs.writeFileSync(path.join(root, 'unbanded.user.js'), out);
console.log('Écrit : unbanded.user.js (' + order.length + ' fichiers concaténés)');
