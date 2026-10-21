/**
 * Plugin builtin "reactions" — commandes fun façon Discord.
 * Envoie un GIF aléatoire depuis la banque de réactions (src/assets/reactions/) :
 *   /hug /cuddle /slap /tickle /kiss /poke /bonk /dance /wave /blush
 *   /smile /smug /cry /nom /yeet /wink /laugh /happy
 * /pat reste dédié au plugin pet-pet.
 *
 * Où sont les GIFs ?
 *   La banque est publiée avec le dépôt et servie par des CDN absolus
 *   (jsDelivr, puis Statically en repli). Un chemin relatif au domaine
 *   courant ne fonctionne PAS : band.us est une SPA, elle renvoie son HTML
 *   de fallback avec un HTTP 200 — `response.json()` échouait alors et la
 *   commande affichait « GIF unavailable (Reaction bank not found) ».
 *   Un dernier repli same-origin est tenté (utile si le script est servi
 *   avec les assets), mais il est validé (JSON / image) avant d'être utilisé.
 * Repli si la banque est indisponible : toast d'erreur (rien n'est envoyé).
 */
(function () {
  var REPO = 'HYPE115/Unbanded';
  var BRANCH = 'main';
  var ASSET_PATH = 'src/assets/reactions/';
  // Sources de la banque, par ordre de préférence (URLs absolues).
  var BANK_SOURCES = [
    'https://cdn.jsdelivr.net/gh/' + REPO + '@' + BRANCH + '/' + ASSET_PATH,
    'https://cdn.statically.io/gh/' + REPO + '/' + BRANCH + '/' + ASSET_PATH,
    ASSET_PATH // même origine (utile pour un miroir auto-hébergé)
  ];
  var REACTIONS = [
    'hug', 'cuddle', 'slap', 'tickle', 'kiss', 'poke', 'bonk', 'dance',
    'wave', 'blush', 'smile', 'smug', 'cry', 'nom', 'yeet', 'wink',
    'laugh', 'happy'
  ];

  /** Concatène une base et un chemin relatif (sans doublon de slash). */
  function joinUrl(base, rel) {
    return String(base).replace(/\/+$/, '') + '/' + String(rel).replace(/^\/+/, '');
  }

  /** Message d'erreur lisible. */
  function errMsg(e) {
    if (!e) return 'unknown error';
    return e.message ? String(e.message) : String(e);
  }

  /** Un nom de fichier de la banque ne doit contenir que des caractères sûrs. */
  function safeName(name) {
    return /^[A-Za-z0-9._-]+$/.test(String(name || ''));
  }

  /**
   * Récupère un JSON en distinguant les erreurs : réseau, HTTP, JSON invalide.
   * Le fallback SPA (HTML avec HTTP 200) est détecté via le content-type et
   * le premier caractère de la réponse.
   */
  async function fetchJson(url) {
    var r;
    try {
      r = await fetch(url, { credentials: 'omit', cache: 'no-cache' });
    } catch (e) {
      throw new Error('network error (' + errMsg(e) + ')');
    }
    if (!r.ok) throw new Error('HTTP ' + r.status);
    var ct = '';
    try {
      ct = r.headers && typeof r.headers.get === 'function' ? (r.headers.get('content-type') || '') : '';
    } catch (e) { /* headers illisibles : on s'en passe */ }
    var text;
    try {
      text = await r.text();
    } catch (e) {
      throw new Error('unreadable body (' + errMsg(e) + ')');
    }
    if (ct && ct.indexOf('json') === -1 && /^\s*[<]/.test(text)) {
      throw new Error('not JSON (content-type: ' + ct + ')');
    }
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error('invalid JSON');
    }
  }

  /**
   * Charge la banque de GIFs. Essaie chaque source jusqu'à obtenir un tableau
   * exploitable. Renvoie { entries, source }.
   */
  async function loadBank(sources) {
    var list = sources && sources.length ? sources : BANK_SOURCES;
    var problems = [];
    for (var i = 0; i < list.length; i++) {
      var url = joinUrl(list[i], 'manifest.json');
      try {
        var j = await fetchJson(url);
        if (!j || !Array.isArray(j)) throw new Error('invalid bank (not a list)');
        return { entries: j, source: list[i], url: url };
      } catch (e) {
        problems.push(url + ' → ' + errMsg(e));
      }
    }
    throw new Error('Reaction bank not found (' + problems.join(' ; ') + ')');
  }

  /** Choisit un GIF aléatoire pour la commande "cat" depuis la banque. */
  function pickGif(bank, cat) {
    var list = bank && bank.entries ? bank.entries : bank;
    if (!Array.isArray(list)) return null;
    var entry = null;
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].cmd === cat) { entry = list[i]; break; }
    }
    if (!entry || !Array.isArray(entry.files) || !entry.files.length) return null;
    var files = entry.files.filter(safeName);
    if (!files.length) return null;
    var idx = Math.floor(Math.random() * files.length);
    return files[idx];
  }

  /** Récupère le fichier GIF (binaire) depuis une base de la banque. */
  async function fetchGif(base, cat, file) {
    var url = joinUrl(joinUrl(base, cat), file);
    var r;
    try {
      r = await fetch(url, { credentials: 'omit' });
    } catch (e) {
      throw new Error('network error (' + errMsg(e) + ')');
    }
    if (!r.ok) throw new Error('HTTP ' + r.status);
    var blob;
    try {
      blob = await r.blob();
    } catch (e) {
      throw new Error('unreadable body (' + errMsg(e) + ')');
    }
    if (!blob || !blob.size) throw new Error('empty response');
    // Une page d'erreur HTML ne doit jamais être envoyée comme image.
    if (blob.type && blob.type.indexOf('image/') !== 0) {
      throw new Error('not an image (content-type: ' + blob.type + ')');
    }
    return { blob: blob, url: url };
  }

  /** Résout la cible (même logique que /pat) : groupe = requis, DM = interlocuteur. */
  function resolveTarget(args, info, cat) {
    var type = info.getConversationType();
    var target;
    if (type === 'group') {
      if (!args.length) {
        throw new Error(window.BTTI18n
          ? window.BTTI18n.t('rx.needUser', { cat: cat })
          : 'In group chats a user is required: /' + cat + ' @name');
      }
      target = info.getUserByMention(args[0]) || info.getUserByMention(args.join(' '));
      if (!target) throw new Error((window.BTTI18n?window.BTTI18n.t('rx.notFound',{name:args[0]}):'User not found: '+args[0]));
    } else {
      var me = info.getCurrentUser();
      target = info.getUserByMention('@' + (me && me.name ? me.name : '')) || me;
    }
    return target;
  }

  /** Envoie un GIF de la commande "cat" à la cible résolue. */
  async function run(cat, args, info) {
    var target = resolveTarget(args, info, cat);
    var who = target && target.name ? target.name : '?';
    var toast = window.__BTT_toast || function () {};
    try {
      toast((window.BTTI18n?window.BTTI18n.t('rx.generating',{cat:cat,who:who}):'Generating '+cat+' GIF for '+who));
      var bank = await loadBank();
      var file = pickGif(bank, cat);
      if (!file) {
        throw new Error('No GIF for ' + cat);
      }
      // Le GIF est cherché dans la source qui a fourni le manifeste ; en cas
      // d'échec (CDN saturé, fichier absent…), on essaie les autres sources.
      var sources = [bank.source].concat(BANK_SOURCES.filter(function (s) { return s !== bank.source; }));
      var got = null;
      var problems = [];
      for (var i = 0; i < sources.length; i++) {
        try {
          got = await fetchGif(sources[i], cat, file);
          break;
        } catch (e) {
          problems.push(errMsg(e));
        }
      }
      if (!got) throw new Error('GIF download failed (' + problems.join(' ; ') + ')');
      var blob = got.blob;
      var ext = blob.type === 'image/gif' ? 'gif' : (blob.type.split('/')[1] || 'png');
      await info.sendFile(blob, cat + '-' + String(who).replace(/\s+/g, '_') + '.' + ext);
      toast((window.BTTI18n?window.BTTI18n.t('rx.sent',{cat:cat,who:who}):'GIF sent to '+who), 'ok');
    } catch (e) {
      // Fallback: pas de GIF envoyé, on affiche un toast.
      toast((window.BTTI18n?window.BTTI18n.t('rx.fallback',{msg:(e&&e.message?e.message:e)}):'GIF unavailable'), 'warn');
    }
  }

  var PLUGIN = {
    name: 'reactions',
    version: '1.2.0',
    description: 'Fun commands: hug/cuddle/slap/kiss GIFs from the reaction bank (CDN with fallback)',
    descriptionKey: 'plg.desc.reactions',
    onLoad: function (ctx) {
      REACTIONS.forEach(function (cat) {
        ctx.registerCommand(cat, 'Sends a '+cat+' GIF to someone', function (args, info) {
          return run(cat, args, info);
        }, '/'+cat+' [user] — required in group chats');
      });
    }
  };
  // Interne exposé pour les tests (non utilisé par le plugin en production).
  PLUGIN._internals = {
    BANK_SOURCES: BANK_SOURCES,
    joinUrl: joinUrl,
    fetchJson: fetchJson,
    loadBank: loadBank,
    pickGif: pickGif,
    fetchGif: fetchGif,
    run: run
  };
  window.PluginReactions = PLUGIN;
  if (typeof module !== 'undefined' && module.exports) module.exports = PLUGIN;
})();
