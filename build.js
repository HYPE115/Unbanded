const fs = require('fs');
const path = require('path');

const root = __dirname;

const VERSION = '1.6.2';
const REPO = 'HYPE115/band_tamper';
const BRANCH = 'main';
const RAW = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/unbanded.user.js`;

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
  'src/core/ui-settings.js',
  'src/core/ui-hooks.js',
  'src/petpet-hand.js',
  'src/vendor/gifenc.js',
  'src/petpet-gif.js',
  'src/plugins/pet-pet.js',
  'src/main.js'
];

const header = `// ==UserScript==
// @name         Unbanded
// @namespace    http://tampermonkey.net/
// @version      ${VERSION}
// @description  Unbanded — chargeur de plugins type Vencord pour BAND (band.us) : page Paramètres (thèmes, CSS personnalisé, import plugin/thème par fichier ou URL), bouton ⚙ dans le header, commandes slash, plugin pet-pet (/pat) avec encodeur GIF embarqué (sans CDN).
// @author       Cline
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
var module = { exports: {} };
`;

let out = header + '\n';
for (var i = 0; i < order.length; i++) {
  var f = order[i];
  out += fs.readFileSync(path.join(root, f), 'utf8') + '\n\n';
}
out += `})();\n`;

fs.writeFileSync(path.join(root, 'unbanded.user.js'), out);
console.log('Écrit : unbanded.user.js (' + order.length + ' fichiers concaténés)');
