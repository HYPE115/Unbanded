/**
 * Plugin builtin "reactions" — commandes fun façon Discord.
 * Envoie un GIF aléatoire (API waifu.pics, gratuite sans clé) :
 *   /hug /cuddle /slap /tickle /kiss /poke /bonk /dance /wave /blush
 *   /smile /smug /cry /nom /yeet /wink /laugh /happy
 * Usage : /hug [user] — user requis en groupe, automatique en DM.
 * Repli si le réseau/CSP bloque : message texte avec emoji.
 */
(function () {
  var API = 'https://api.waifu.pics/sfw/';
  var REACTIONS = {
    hug: { emoji: '🤗', text: 'te fait un gros câlin' },
    cuddle: { emoji: '🥰', text: 'se blottit contre' },
    slap: { emoji: '👋', text: 'gifle' },
    tickle: { emoji: '😆', text: 'chatouille' },
    kiss: { emoji: '😘', text: 'embrasse' },
    poke: { emoji: '👉', text: 'poke' },
    bonk: { emoji: '🔨', text: 'bonke' },
    dance: { emoji: '💃', text: 'danse avec' },
    wave: { emoji: '👋', text: 'salue' },
    blush: { emoji: '😳', text: 'rougit devant' },
    smile: { emoji: '😊', text: 'sourit à' },
    smug: { emoji: '😏', text: 'fait un smug à' },
    cry: { emoji: '😭', text: 'pleure sur' },
    nom: { emoji: '🍜', text: 'mange avec' },
    yeet: { emoji: '🚀', text: 'yeet' },
    wink: { emoji: '😉', text: "fait un clin d'œil à" },
    laugh: { emoji: '😂', text: 'rit avec' },
    happy: { emoji: '😄', text: 'est content avec' }
  };

  /** Résout la cible (même logique que /pat) : groupe = requis, DM = interlocuteur. */
  function resolveTarget(args, info) {
    var type = info.getConversationType();
    var target;
    if (type === 'group') {
      if (!args.length) throw new Error("En groupe, l'utilisateur est requis : /hug @pseudo");
      target = info.getUserByMention(args[0]) || info.getUserByMention(args.join(' '));
      if (!target) throw new Error('Utilisateur introuvable : ' + args[0]);
    } else {
      var me = info.getCurrentUser();
      target = info.getUserByMention('@' + (me && me.name ? me.name : '')) || me;
    }
    return target;
  }

  /** Récupère un GIF aléatoire de la catégorie via waifu.pics. */
  async function fetchGif(cat) {
    var r = await fetch(API + cat, { credentials: 'omit' });
    if (!r.ok) throw new Error('API ' + r.status);
    var j = await r.json();
    if (!j || !j.url) throw new Error('Réponse vide');
    var img = await fetch(j.url, { credentials: 'omit' });
    if (!img.ok) throw new Error('Image ' + img.status);
    return await img.blob();
  }

  async function run(cat, r, args, info) {
    var target = resolveTarget(args, info);
    var who = target && target.name ? target.name : '?';
    var toast = window.__BTT_toast || function () {};
    try {
      toast('⏳ Recherche d\'un GIF « ' + cat + ' » pour ' + who + '…');
      var blob = await fetchGif(cat);
      var ext = blob.type === 'image/gif' ? 'gif' : (blob.type.split('/')[1] || 'png');
      await info.sendFile(blob, cat + '-' + String(who).replace(/\s+/g, '_') + '.' + ext);
      toast('✅ GIF « ' + cat + ' » envoyé à ' + who, 'ok');
    } catch (e) {
      // Repli texte (CSP/réseau) : le message part quand même.
      await info.sendText(r.emoji + ' ' + who + ' ' + r.text + ' !');
      toast('⚠ GIF indisponible (' + (e && e.message ? e.message : e) + ') — message texte envoyé', 'warn');
    }
  }

  var PLUGIN = {
    name: 'reactions',
    version: '1.0.0',
    description: 'Commandes fun : GIF hug/cuddle/slap/kiss/… (waifu.pics) avec repli texte si le réseau est bloqué',
    onLoad: function (ctx) {
      Object.keys(REACTIONS).forEach(function (cat) {
        var r = REACTIONS[cat];
        ctx.registerCommand(cat, 'Envoie un GIF « ' + cat + ' » à quelqu\'un', function (args, info) {
          return run(cat, r, args, info);
        }, '/' + cat + ' [user] — user requis en groupe');
      });
    }
  };
  window.PluginReactions = PLUGIN;
  if (typeof module !== 'undefined' && module.exports) module.exports = PLUGIN;
})();