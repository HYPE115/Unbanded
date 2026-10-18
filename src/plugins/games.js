/**
 * Plugin builtin "games" — mini-jeux 100% locaux (aucun réseau).
 *   /8ball <question>   boule magique
 *   /roll [NdM±K]       lancer de dés (ex: /roll 2d20+5, défaut 1d6)
 *   /coin               pile ou face
 *   /choose <a | b | c> choix aléatoire
 *   /rand <min> <max>   nombre aléatoire
 * Les résultats sont envoyés dans la conversation (fun à partager).
 */
(function () {
  var BALL = [
    'C\'est certain.', 'C\'est décidé : oui.', 'Sans aucun doute.', 'Oui — définitivement.',
    'Tu peux compter dessus.', 'Il y a de bonnes chances que ce soit oui.', 'Réponse floue, réessaie.',
    'Repose la question plus tard.', 'Mieux vaut ne pas te répondre pour l\'instant.',
    'Impossible de prédire ça maintenant.', 'Non.', 'Non, décidément.', 'Ça ne semble pas être le cas.',
    'Source douteuse…', 'Très douteux.', 'Oui, absolument !', 'Tu parles sérieusement ?',
    'Réponse obscure, réessaie dans une heure.', 'Très probable que ce soit non.', 'Mauvais pronostic.'
  ];
  function rand(n) { return Math.floor(Math.random() * n); }
  function pick(arr) { return arr[rand(arr.length)]; }

  /** Parse "2d20+5" / "d6" / "42" → { n, sides, mod, rolls[] } ou null. */
  function parseDice(s) {
    var m = /^(\d{0,2})[dD](\d{1,3})([+-]\d{1,3})?$/.exec(String(s || '').trim());
    if (m) {
      var n = m[1] ? parseInt(m[1], 10) : 1;
      var sides = parseInt(m[2], 10);
      var mod = m[3] ? parseInt(m[3], 10) : 0;
      if (n < 1 || n > 20 || sides < 2 || sides > 1000) return null;
      var rolls = [];
      for (var i = 0; i < n; i++) rolls.push(1 + rand(sides));
      return { n: n, sides: sides, mod: mod, rolls: rolls };
    }
    if (/^\d{1,4}$/.test(String(s || '').trim())) {
      return { n: 1, sides: parseInt(s, 10), mod: 0, rolls: [parseInt(s, 10)] }; // nombre pur
    }
    return null;
  }

  var PLUGIN = {
    name: 'games',
    version: '1.0.0',
    description: 'Local mini-games: magic 8ball, /roll dice, coin flip, random pick',
    descriptionKey: 'plg.desc.games',
    onLoad: function (ctx) {
      ctx.registerCommand('8ball', 'Magic 8-ball answers your question', async function (args, info) {
        if (!args.length) throw new Error((window.BTTI18n?window.BTTI18n.t('gm.needQuestion'):'Ask a question: /8ball will I win?'));
        await info.sendText('🎱 ' + args.join(' ') + ' → ' + pick(BALL));
      }, '/8ball <question>');
      ctx.registerAlias('8b', '8ball');

      ctx.registerCommand('roll', 'Rolls dice', async function (args, info) {
        var d = parseDice(args[0] || '1d6');
        if (!d) throw new Error((window.BTTI18n?window.BTTI18n.t('gm.badDice'):'Invalid format: /roll 2d20+5'));
        var sum = d.rolls.reduce(function (a, b) { return a + b; }, 0) + d.mod;
        var label = d.n + 'd' + d.sides + (d.mod ? (d.mod > 0 ? '+' + d.mod : d.mod) : '');
        var detail = d.rolls.join(' + ') + (d.mod ? ' ' + (d.mod > 0 ? '+' + d.mod : '- ' + Math.abs(d.mod)) : '');
        await info.sendText('🎲 ' + label + ' → ' + detail + ' = ' + sum);
      }, '/roll [NdM±K] — e.g. /roll 2d20+5 (default 1d6)');
      ctx.registerAlias('dice', 'roll');
      ctx.registerAlias('d', 'roll');

      ctx.registerCommand('coin', 'Coin flip', async function (args, info) {
        await info.sendText((window.BTTI18n?(rand(2)?window.BTTI18n.t('gm.coinHeads'):window.BTTI18n.t('gm.coinTails')):'coin'));
      });
      ctx.registerAlias('flip', 'coin');

      ctx.registerCommand('choose', 'Picks a random option among yours', async function (args, info) {
        var raw = args.join(' ');
        var opts = raw.split(/\s*[|,/]\s*/).map(function (s) { return s.trim(); }).filter(Boolean);
        if (opts.length < 2) throw new Error((window.BTTI18n?window.BTTI18n.t('gm.chooseNeed'):'Give at least 2 options: /choose a | b | c'));
        await info.sendText((window.BTTI18n?window.BTTI18n.t('gm.chooseOut',{pick:pick(opts)}):'Pick: '+pick(opts)));
      }, '/choose <a | b | c>');
      ctx.registerAlias('pick', 'choose');

      ctx.registerCommand('rand', 'Random number', async function (args, info) {
        var a = parseInt(args[0], 10), b = parseInt(args[1], 10);
        if (isNaN(a) || isNaN(b) || a > b) throw new Error('Usage: /rand 1 100');
        if (b - a > 1000000) throw new Error((window.BTTI18n?window.BTTI18n.t('gm.randRange'):'Range too large'));
        await info.sendText('🔢 ' + a + '–' + b + ' → ' + (a + rand(b - a + 1)));
      }, '/rand <min> <max>');
      ctx.registerAlias('rnd', 'rand');
    }
  };
  window.PluginGames = PLUGIN;
  if (typeof module !== 'undefined' && module.exports) module.exports = PLUGIN;
})();