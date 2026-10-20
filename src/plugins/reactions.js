/**
 * Plugin builtin "reactions" — commandes fun façon Discord.
 * Envoie un GIF aléatoire depuis la banque locale src/assets/reactions/ :
 *   /hug /cuddle /slap /tickle /kiss /poke /bonk /dance /wave /blush
 *   /smile /smug /cry /nom /yeet /wink /laugh /happy
 * /pat reste dédié au plugin pet-pet.
 * Aucun appel réseau externe : fichier statique hébergé avec le script.
 * Repli si la banque est manquante : toast d'erreur (pas de GIF).
 */
(function () {
  // URL de la banque relative au domaine qui sert le script. Si le script est
  // sur band.us, c'est "src/assets/reactions/manifest.json" ; sinon modifier ce
  // préfixe pour pointer sur le bon emplacement.
  var BANK_URL = 'src/assets/reactions/manifest.json';
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

  /** Charge la banque locale de GIFs. */
  async function loadBank() {
    try {
      var r = await fetch(BANK_URL, { credentials: 'omit', cache: 'no-cache' });
      if (!r.ok) throw new Error('Bank HTTP ' + r.status);
      var j = await r.json();
      if (!j || !Array.isArray(j)) throw new Error('Invalid bank');
      return j;
    } catch (e) {
      // Banque inaccessible : on ne renverra aucun GIF, seul le toast s'affiche.
      return null;
    }
  }

  /** Choisit un GIF aléatoire pour la commande "cat" depuis la banque. */
  function pickGif(bank, cat) {
    var entry = null;
    for (var i = 0; i < bank.length; i++) {
      if (bank[i].cmd === cat) { entry = bank[i]; break; }
    }
    if (!entry || !entry.files || !entry.files.length) return null;
    var idx = Math.floor(Math.random() * entry.files.length);
    return entry.files[idx];
  }

  async function run(cat, r, args, info) {
    var target = resolveTarget(args, info);
    var who = target && target.name ? target.name : '?';
    var toast = window.__BTT_toast || function () {};
    try {
      toast((window.BTTI18n?window.BTTI18n.t('rx.generating',{cat:cat,who:who}):'Generating '+cat+' GIF for '+who));
      var bank = await loadBank();
      if (!bank) {
        throw new Error('Reaction bank not found: ' + BANK_URL);
      }
      var file = pickGif(bank, cat);
      if (!file) {
        throw new Error('No GIF for ' + cat);
      }
      // Chemin local : src/assets/reactions/{cat}/01.gif (relatif au domaine).
      var url = 'src/assets/reactions/' + cat + '/' + file;
      var img = await fetch(url, { credentials: 'omit' });
      if (!img.ok) throw new Error('Image HTTP ' + img.status);
      var blob = await img.blob();
      var ext = blob.type === 'image/gif' ? 'gif' : (blob.type.split('/')[1] || 'png');
      await info.sendFile(blob, cat + '-' + String(who).replace(/\s+/g, '_') + '.' + ext);
      toast((window.BTTI18n?window.BTTI18n.t('rx.sent',{cat:cat,who:who}):'GIF sent to '+who), 'ok');
    } catch (e) {
      // Fallback: pas de GIF réseau, on affiche un toast (la banque est statique).
      toast((window.BTTI18n?window.BTTI18n.t('rx.fallback',{msg:(e&&e.message?e.message:e)}):'GIF unavailable'), 'warn');
    }
  }

  var PLUGIN = {
    name: 'reactions',
    version: '1.1.0',
    description: 'Fun commands: hug/cuddle/slap/kiss GIFs from local bank (no network)',
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
