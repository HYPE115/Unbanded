const fs = require('fs');
const src = fs.readFileSync(__dirname + '/../src/core/ui-emoji.js', 'utf8');
const a = src.indexOf('var CATS = [');
const b = src.indexOf('  ];', a) + 4;
const f = src.indexOf('  function norm(s) {');
const g = src.indexOf('  var INDEX = [];', f);
if (a < 0 || b < 4 || f < 0 || g < 0) { console.error('extraction KO'); process.exit(1); }
eval(src.slice(a, b) + '\n' + src.slice(f, g) + '\n' + `
  var INDEX = [];
  for (var ci = 0; ci < CATS.length; ci++) { var c = CATS[ci];
    for (var ii = 0; ii < c.items.length; ii++) {
      var it = c.items[ii];
      if (!it || typeof it[0] !== 'string' || !it[0] || !it[1]) throw new Error('item invalide ' + c.id + ' #' + ii);
      INDEX.push({ ch: it[0], kw: it[1], hay: norm(it[1]) });
    } }
  function search(q) {
    q = norm(String(q).trim()); var toks = q.split(/\\s+/);
    return INDEX.filter(function (r) {
      return toks.every(function (t) { return !t || r.hay.indexOf(t) !== -1; });
    });
  }
  console.log('cats  :', CATS.map(function (x) { return x.id + ':' + x.items.length; }).join(' '));
  console.log('total :', INDEX.length);
  var seen = {}, dups = [];
  INDEX.forEach(function (r) { if (seen[r.ch]) dups.push(r.ch); seen[r.ch] = 1; });
  console.log('doublons :', dups.length ? dups.join('') : 'aucun');
  function show(label, res) { console.log(label.padEnd(18), '->', res.slice(0, 6).map(function (r) { return r.ch; }).join(' ') + ' (' + res.length + ')'); }
  show('chat', search('chat'));
  show('chien', search('chien'));
  show('coeur', search('coeur'));
  show('cœur', search('cœur'));
  show('oeuf', search('oeuf'));
  show('heart love', search('heart love'));
  show('pizza', search('pizza'));
  show('PIZZA', search('PIZZA'));
  show('cafe', search('cafe'));
  show('fete', search('fete'));
  show('zzzz', search('zzzz'));
  console.log('norm(crf) :', norm('crème brûlée'));
  console.log('OK');
`);
