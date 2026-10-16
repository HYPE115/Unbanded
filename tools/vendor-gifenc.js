#!/usr/bin/env node
/* Vendorise l'encodeur GIF « gifenc » (MIT, https://github.com/mattdesl/gifenc).
 *
 * band.us applique une CSP stricte : les scripts CDN et les Web Workers externes sont
 * bloqués, ce qui empêchait gif.js/unpkg de fonctionner (d'où le GIF qui restait une
 * photo statique). On inclut donc la source de gifenc directement dans le userscript :
 * aucun script externe, aucun worker, encodage sur le thread principal (très rapide
 * pour des frames 128×128).
 *
 * Usage : node tools/vendor-gifenc.js
 * Écrit : src/vendor/gifenc.js (IIFE exposant window.__BTT_GIFENC) */
const fs = require('fs');
const path = require('path');
const https = require('https');

const VERSION = '1.0.3';
const URL_JS = 'https://cdn.jsdelivr.net/npm/gifenc@' + VERSION + '/dist/gifenc.js';
const OUT = path.join(__dirname, '..', 'src', 'vendor', 'gifenc.js');

function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return httpGet(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(url + ' → HTTP ' + res.statusCode));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    }).on('error', reject);
  });
}

(async () => {
  let body = await httpGet(URL_JS);
  body = body.replace(/^\/\/# sourceMappingURL=.*$/m, '').trimEnd();
  const header =
    '/* Encodeur GIF « gifenc » v' + VERSION + ' — source vendorisée dans le userscript.\n' +
    ' * Aucune dépendance CDN ni Web Worker : fonctionne sous la CSP stricte de band.us.\n' +
    ' * MIT License — Copyright (c) Matt DesLauriers — https://github.com/mattdesl/gifenc\n' +
    ' * Expose : window.__BTT_GIFENC = { GIFEncoder, quantize, applyPalette } (API CJS incluse).\n' +
    ' * Régénérable : node tools/vendor-gifenc.js */\n' +
    '(function () {\n' +
    '  var module = { exports: {} };\n' +
    '  var exports = module.exports;\n';
  const footer =
    '\n  window.__BTT_GIFENC = {\n' +
    '    GIFEncoder: exports.GIFEncoder,\n' +
    '    quantize: exports.quantize,\n' +
    '    applyPalette: exports.applyPalette\n' +
    '  };\n' +
    '})();\n';
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, header + body + footer, 'utf8');
  console.log('Écrit :', OUT, '(' + Math.round(fs.statSync(OUT).size / 1024) + ' Ko, gifenc v' + VERSION + ')');
})().catch((e) => {
  console.error('vendor-gifenc :', e.message);
  process.exit(1);
});