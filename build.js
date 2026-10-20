const fs = require('fs');
const path = require('path');
const root = __dirname;
const VERSION = '1.9.0';
const REPO = 'HYPE115/Unbanded';
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
  'src/core/ui-emoji.js',
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
// @description  Unbanded — chargeur de plugins type Vencord pour BAND (band.us) : page Paramètres (thèmes, CSS personnalisé, import plugin/thème par fichier ou URL), bouton ⚙ dans le header, commandes slash, plugin pet-pet (/pat) avec encodeur GIF embarqué (sans CDN), et sélecteur d'emojis avec recherche (bouton 😀 près du composer, onglets par catégorie, récents persistés, 100 % local).
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

let lastFileText = '';

for (const f of order) {
  lastFileText = fs.readFileSync(path.join(root, f), 'utf8');
  out += lastFileText + '\n\n';
}

// Close the IIFE. Only add the final '})();' if the last file did not already
// provide a matching closer (main.js ends with its own '})();'), so we avoid
// creating a stray '})();' that breaks the bundled userscript.
if (!lastFileText.endsWith('})();')) {
  out += `})();`;
}

fs.writeFileSync(path.join(root, 'unbanded.user.js'), out);
console.log('Écrit : unbanded.user.js (' + order.length + ' fichiers concaténés)');