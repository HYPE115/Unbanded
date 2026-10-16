/* Génère src/petpet-hand.js : les 10 frames de main d'origine du projet
 * pet-pet-gif (aDu) — https://github.com/aDu/pet-pet-gif (img/pet0..pet9.gif)
 * embarquées en data URI base64 pour le userscript.
 * Usage : node tools/embed-hand.js [dossier-local-contenant-pet0.gif..pet9.gif]
 * Sans argument, les images sont téléchargées depuis raw.githubusercontent.com. */
const fs = require('fs');
const path = require('path');
const https = require('https');

const FRAMES = 10;
const BASE_URL = 'https://raw.githubusercontent.com/aDu/pet-pet-gif/master/img/pet';
const OUT = path.join(__dirname, '..', 'src', 'petpet-hand.js');

function fetchBuffer(url, redirects) {
  redirects = redirects || 0;
  return new Promise(function (resolve, reject) {
    if (redirects > 5) return reject(new Error('trop de redirections'));
    https.get(url, { headers: { 'User-Agent': 'unbanded-embed' } }, function (res) {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(fetchBuffer(res.headers.location, redirects + 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(url + ' → HTTP ' + res.statusCode));
      }
      const chunks = [];
      res.on('data', function (c) { chunks.push(c); });
      res.on('end', function () { resolve(Buffer.concat(chunks)); });
    }).on('error', reject);
  });
}

async function main() {
  const localDir = process.argv[2] || null;
  const uris = [];
  for (let i = 0; i < FRAMES; i++) {
    let buf = null;
    if (localDir) {
      const f = path.join(localDir, 'pet' + i + '.gif');
      if (fs.existsSync(f)) buf = fs.readFileSync(f);
    }
    if (!buf) {
      process.stdout.write('Téléchargement pet' + i + '.gif… ');
      buf = await fetchBuffer(BASE_URL + i + '.gif');
      console.log(buf.length + ' octets');
    }
    uris.push('data:image/gif;base64,' + buf.toString('base64'));
  }
  const lines = uris.map(function (u) { return '    ' + JSON.stringify(u); });
  const out = [
    "/* Frames de main d'origine du projet pet-pet-gif (aDu) — https://github.com/aDu/pet-pet-gif",
    ' * img/pet0.gif … img/pet9.gif, embarquées en data URI (généré par tools/embed-hand.js). */',
    '(function () {',
    '  window.__BTT_PET_HANDS = [',
    lines.join(',\n'),
    '  ];',
    "  if (typeof module !== 'undefined' && module.exports) module.exports = { HAND_FRAMES: window.__BTT_PET_HANDS };",
    '})();',
    ''
  ].join('\n');
  fs.writeFileSync(OUT, out);
  console.log('Écrit : ' + OUT + ' (' + uris.length + ' frames, ' + Math.round(out.length / 1024) + ' Ko)');
}

main().catch(function (e) { console.error('ERREUR :', e.message); process.exit(1); });