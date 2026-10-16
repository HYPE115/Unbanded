const fs = require('fs');
const path = require('path');

const root = 'c:\\Users\\imperiex\\AppData\\Roaming\\spicetify\\band client tamper';

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
// @name         Band Tamper
// @namespace    http://tampermonkey.net/
// @version      1.5.0
// @description  Chargeur de plugins type Vencord pour BAND (band.us) : page Paramètres (thèmes, CSS personnalisé, import plugin/thème par fichier ou URL), commandes slash, plugin pet-pet (/pat) avec encodeur GIF embarqué (sans CDN).
// @author       Cline
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

fs.writeFileSync(path.join(root, 'band-tamper.user.js'), out);
console.log('Écrit : band-tamper.user.js (' + order.length + ' fichiers concaténés)');
