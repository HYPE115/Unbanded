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
    hug: { emoji: '🤗', text: 'gives a big hug to' },
    cuddle: { emoji: '🥰', text: 'cuddles with' },
    slap: { emoji: '👋', text: 'slaps' },
    tickle: { emoji: '😆', text: 'tickles' },
    kiss: { emoji: '😘', text: 'kisses' },
    poke: { emoji: '👉', text: 'poke' },
    bonk: { emoji: '🔨', text: 'bonks' },
    dance: { emoji: '💃', text: 'dances with' },
    wave: { emoji: '👋', text: 'waves at' },
    blush: { emoji: '😳', text: 'blushes at' },
    smile: { emoji: '😊', text: 'smiles at' },
    smug: { emoji: '😏', text: 'smirks at' },
    cry: { emoji: '😭', text: 'cries on' },
    nom: { emoji: '🍜', text: 'noms with' },
    yeet: { emoji: '🚀', text: 'yeet' },
    wink: { emoji: '😉', text: "winks at" },
    laugh: { emoji: '😂', text: 'laughs with' },
    happy: { emoji: '😄', text: 'is happy with' }
  };

  /** Résout la cible (même logique que /pat) : groupe = requis, DM = interlocuteur. */
  function resolveTarget(args, info) {
    var type = info.getConversationType();
    var target;
    if (type === 'group') {
      if (!args.length) throw new Error("En groupe, l'utilisateur est requis : /hug @pseudo");
      target = info.getUserByMention(args[0]) || info.getUserByMention(args.join(' '));
      if (!target) throw new Error((window.BTTI18n?window.BTTI18n.t('rx.notFound',{name:args[0]}):'User not found: '+args[0]));
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
    if (!j || !j.url) throw new Error('Empty response');
    var img = await fetch(j.url, { credentials: 'omit' });
    if (!img.ok) throw new Error('Image ' + img.status);
    return await img.blob();
  }

  async function run(cat, r, args, info) {
    var target = resolveTarget(args, info);
    var who = target && target.name ? target.name : '?';
    var toast = window.__BTT_toast || function () {};
    try {
      toast((window.BTTI18n?window.BTTI18n.t('rx.generating',{cat:cat,who:who}):'Loading '+cat+' GIF for '+who));
      var blob = await fetchGif(cat);
      var ext = blob.type === 'image/gif' ? 'gif' : (blob.type.split('/')[1] || 'png');
      await info.sendFile(blob, cat + '-' + String(who).replace(/\s+/g, '_') + '.' + ext);
      toast((window.BTTI18n?window.BTTI18n.t('rx.sent',{cat:cat,who:who}):'GIF sent to '+who), 'ok');
    } catch (e) {
      // Fallback: pas de texte, le GIF est le seul rendu (si le réseau est bloqué, rien d'autre à afficher).
      toast((window.BTTI18n?window.BTTI18n.t('rx.fallback',{msg:(e&&e.message?e.message:e)}):'GIF unavailable'), 'warn');
    }
  }

  var PLUGIN = {
    name: 'reactions',
    version: '1.0.0',
    description: 'Fun commands: hug/cuddle/slap/kiss GIFs (waifu.pics) with text fallback if network is blocked',
    descriptionKey: 'plg.desc.reactions',
    onLoad: function (ctx) {
      Object.keys(REACTIONS).forEach(function (cat) {
        var r = REACTIONS[cat];
        ctx.registerCommand(cat, 'Sends a '+cat+' GIF to someone', function (args, info) {
          return run(cat, r, args, info);
        }, '/'+cat+' [user] — required in group chats');
      });
    }
  };
  window.PluginReactions = PLUGIN;
  if (typeof module !== 'undefined' && module.exports) module.exports = PLUGIN;
})();