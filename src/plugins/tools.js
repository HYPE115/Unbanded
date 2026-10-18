/**
 * Plugin builtin "tools" — outils utiles (locaux, aucun réseau).
 *   /remind <durée> <texte>  rappel par toast (30, 30m, 2h, 45s — cap 24 h)
 *   /shrug /tableflip /unflip /lenny   emotes texte façon Discord
 */
(function () {
  var TOOL = window.__BTT_toast || function () {};

  /** "90" → 90 min ; "45s" → 45 s ; "2h" → 120 min ; cap 24 h. */
  function parseDelay(raw) {
    var m = /^(\d{1,5})([smhd]?)$/i.exec(String(raw || '').trim());
    if (!m) return null;
    var n = parseInt(m[1], 10);
    var unit = (m[2] || 'm').toLowerCase();
    var ms = unit === 's' ? n * 1000 : unit === 'h' ? n * 3600000 : unit === 'd' ? n * 86400000 : n * 60000;
    if (ms < 1000 || ms > 86400000) return null; // 1 s … 24 h
    return ms;
  }

  var PLUGIN = {
    name: 'tools',
    version: '1.0.0',
    description: 'Outils : rappels /remind, emotes texte (/shrug, /tableflip…)',
    onLoad: function (ctx) {
      var toast = function () { try { (window.__BTT_toast || TOOL).apply(null, arguments); } catch (e) {} };

      ctx.registerCommand('remind', 'Rappelle-toi quelque chose plus tard', function (args, info) {
        var ms = parseDelay(args[0]);
        if (ms === null) throw new Error('Durée invalide : /remind 30m sortir le trash (1 s à 24 h)');
        var text = args.slice(1).join(' ').trim();
        if (!text) throw new Error('Ajoute un message : /remind 2h répondre à Marie');
        var wasHidden = false;
        setTimeout(function () {
          toast('⏰ Rappel : ' + text, 'ok', 12000);
          // Si l'onglet est masqué, on fait clignoter le titre pour attirer l'œil.
          try {
            wasHidden = document.hidden;
            if (wasHidden) {
              var orig = document.title;
              var n = 0;
              var flash = setInterval(function () {
                document.title = (n++ % 2 ? orig : '⏰ ' + text) ;
                if (n > 10) { clearInterval(flash); document.title = orig; }
              }, 1000);
            }
          } catch (e) {}
        }, ms);
        var secs = Math.round(ms / 1000);
        var human = secs >= 3600 ? Math.round(secs / 360) / 10 + ' h' : secs >= 60 ? Math.round(secs / 6) / 10 + ' min' : secs + ' s';
        toast('⏰ Rappel dans ' + human + ' : ' + text);
      }, '/remind <30|30m|2h|45s> <texte> — cap 24 h');
      ctx.registerAlias('rmd', 'remind');

      var EMOTES = {
        shrug: '¯\\_(ツ)_/¯',
        tableflip: '(╯°□°)╯︵ ┻━┻',
        unflip: '┬─┬ ノ( ゜-゜ノ)',
        lenny: '( ͡° ͜ʖ ͡°)'
      };
      var EMOTE_DESC = {
        shrug: 'Shrug ¯\\_(ツ)_/¯',
        tableflip: 'Renverse la table',
        unflip: 'Remet la table à plat',
        lenny: 'Lenny face ( ͡° ͜ʖ ͡°)'
      };
      Object.keys(EMOTES).forEach(function (name) {
        ctx.registerCommand(name, EMOTE_DESC[name], async function (args, info) {
          var suffix = args.length ? ' ' + args.join(' ') : '';
          await info.sendText(EMOTES[name] + suffix);
        });
      });
    }
  };
  window.PluginTools = PLUGIN;
  if (typeof module !== 'undefined' && module.exports) module.exports = PLUGIN;
})();