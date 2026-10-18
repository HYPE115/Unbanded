/**
 * i18n — traductions de l'interface Unbanded.
 * Langue par défaut : celle de l'app BAND (window.formatjsLang / intlLang /
 * messageLang), sinon celle du navigateur. L'utilisateur peut forcer une
 * langue dans Paramètres → Général (persistée). Repli final : anglais.
 */
var BTTI18n = (function () {
  'use strict';

  // Cats du plugin reactions — garder synchronisé avec src/plugins/reactions.js.
  var REACTION_RE = /^(hug|cuddle|slap|tickle|kiss|poke|bonk|dance|wave|blush|smile|smug|cry|nom|yeet|wink|laugh|happy)$/;

  var EN = {};
  Object.assign(EN, {
    'toast.loaded': '✓ Unbanded v{v} loaded in {ms} ms — /help for commands, /settings for settings',
    'hook.executing': '… running /{name}',
    'hook.unknown': 'Unknown command: /{name} (type /help)',
    'hook.error': 'Error: {msg}',
    'help.title': '=== Unbanded v{v} commands ===',
    'help.tip': 'Tip: /help <command> for details · (local display only)',
    'help.localOnly': '(local display only)',
    'help.usage': 'Usage: ',
    'help.unknown': 'Unknown command: /{name} (type /help for the list)',
    'help.noDesc': '(no description)',
    'tab.general': 'General',
    'tab.plugins': 'Plugins',
    'tab.themes': 'Themes',
    'tab.css': 'Custom CSS',
    'tab.about': 'About',
    'side.shortcuts': 'Shortcuts: /settings · Ctrl+, · Esc to close',
    'fab.title': 'Unbanded — settings',
    'btn.title': 'Unbanded — plugin settings (/help, /plugins, /settings)',
    'gen.title': 'General',
    'gen.startupToast': 'Show startup toast',
    'gen.toastDuration': 'Toast duration: ',
    'gen.lang': 'Language: ',
    'gen.langAuto': 'Auto ({lang})',
    'gen.config': 'Configuration',
    'gen.export': 'Export (JSON)',
    'gen.import': 'Import (JSON)',
    'gen.reset': 'Reset all',
    'gen.exportHint': 'The export includes plugins, themes, custom CSS and options — perfect for migrating to another browser.',
    'cfg.exported': 'Configuration exported',
    'cfg.exportFailed': 'Export failed: {msg}',
    'cfg.imported': 'Configuration imported ({n} theme(s)) — reload the page for plugins',
    'cfg.importFailed': 'Import failed: {msg}',
    'cfg.notUnbanded': 'this is not an Unbanded configuration',
    'cfg.resetConfirm': 'Reset everything? (plugins, themes, CSS, options)',
    'cfg.resetDone': 'Reset done',
    'cfg.resetFailed': 'Reset failed: {msg}',
    'file.readFailed': 'Cannot read the file',
    'file.noReader': 'FileReader unavailable: {msg}',
    'cfg.langChanged': 'Language: {lang} — reloading…'
  });
  Object.assign(EN, {
    'plg.add': 'Add a plugin',
    'plg.addUrl': 'Add (URL)',
    'plg.importFile': 'Import a .js file',
    'plg.hint': 'A plugin is a JS exposing <code>module.exports = { name, version, description, onLoad(ctx), commands }</code>. Added plugins are saved and reloaded at startup.',
    'plg.installed': 'Installed plugins',
    'plg.active': 'active',
    'plg.inactive': 'inactive',
    'plg.srcFile': 'File',
    'plg.srcBuiltin': 'Built-in',
    'plg.enable': 'Enable',
    'plg.disable': 'Disable',
    'plg.delete': 'Delete',
    'plg.none': 'No plugin loaded.',
    'plg.imported': 'Plugin imported: {name}',
    'plg.importFailed': 'Import failed: {msg}',
    'plg.removed': 'Plugin removed',
    'err.needUrl': 'Paste a URL first',
    'thm.import': 'Import a theme',
    'thm.importUrl': 'Import (URL)',
    'thm.importFile': 'Import a .json file',
    'thm.hint': 'Format: <code>{"name":"...","colors":{...},"css":"/* optional */"}</code> — missing colors fall back to the default violet.',
    'thm.title': 'Themes',
    'thm.siteOption': 'Apply the theme to the whole band.us site',
    'thm.apply': 'Apply',
    'thm.applied': 'Applied',
    'thm.export': 'Export',
    'thm.delete': 'Delete',
    'thm.builtin': 'built-in',
    'thm.importedLabel': 'imported',
    'thm.unknown': 'unknown',
    'thm.imported': 'Theme imported: {name}',
    'thm.importFailed': 'Theme failed: {msg}',
    'thm.appliedToast': 'Theme applied: {name}',
    'thm.exported': 'Theme exported (JSON file)',
    'thm.exportFailed': 'Export failed: {msg}',
    'thm.removed': 'Theme removed',
    'css.title': 'Custom CSS',
    'css.save': 'Apply &amp; save',
    'css.preview': 'Preview (don\'t save)',
    'css.reset': 'Reset',
    'css.hint': 'The CSS is injected into the page (<code>&lt;style id="bt-custom-css"&gt;</code>) and kept after reload. The preview does not persist.',
    'css.applied': 'CSS applied and saved',
    'css.previewToast': 'Preview applied (not saved)',
    'css.resetToast': 'CSS reset',
    'about.plugins': '{n} plugin(s)',
    'about.commands': '{n} command(s)',
    'about.themes': '{n} theme(s)',
    'cmd.pat': 'Sends a pet-pet GIF to someone',
    'cmd.pat.usage': '/pat [user] — required in group chats',
    'cmd.help': 'Shows the available commands',
    'cmd.help.usage': '/help [command]',
    'cmd.plugins': 'Opens settings (Plugins tab)',
    'cmd.settings': 'Opens the settings page',
    'cmd.debug': 'Unbanded diagnostics (selectors, DOM, state)',
    'cmd.version': 'Shows Unbanded\'s version',
    'cmd.clear': 'Clears the displayed toasts',
    'cmd.react.desc': 'Sends a « {cat} » GIF to someone',
    'cmd.react.usage': '/{cat} [user] — required in group chats',
    'cmd.8ball': 'Magic 8-ball answers your question',
    'cmd.8ball.usage': '/8ball <question>',
    'cmd.roll': 'Rolls dice',
    'cmd.roll.usage': '/roll [NdM±K] — e.g. /roll 2d20+5 (default 1d6)',
    'cmd.coin': 'Coin flip',
    'cmd.choose': 'Picks a random option among yours',
    'cmd.choose.usage': '/choose <a | b | c>',
    'cmd.rand': 'Random number',
    'cmd.rand.usage': '/rand <min> <max>',
    'cmd.remind': 'Reminds you of something later',
    'cmd.remind.usage': '/remind <30|30m|2h|45s> <text> — up to 24 h',
    'cmd.shrug': 'Shrug ¯\\_(ツ)_/¯',
    'cmd.tableflip': 'Flips the table',
    'cmd.unflip': 'Unflips the table',
    'cmd.lenny': 'Lenny face ( ͡° ͜ʖ ͡°)',
  });
  Object.assign(EN, {
    'pp.generating': '⏳ Generating the GIF for {name}…',
    'pp.sent': '✅ Pet-pet GIF sent to {name}',
    'pp.staticWarn': '⚠ Static image sent to {name} (animated GIF unavailable)',
    'pp.needUser': 'In group chats a user is required: /pat @name',
    'pp.notFound': 'User not found: {name}',
    'pp.noAvatar': 'No avatar found for {name}',
    'pp.noGenerator': 'GIF generator unavailable',
    'rx.generating': '⏳ Looking for a « {cat} » GIF for {who}…',
    'rx.sent': '✅ « {cat} » GIF sent to {who}',
    'rx.fallback': '⚠ GIF unavailable ({msg}) — text message sent',
    'rx.needUser': 'In group chats a user is required: /{cat} @name',
    'rx.notFound': 'User not found: {name}',
    'gm.needQuestion': 'Ask a question: /8ball will I win?',
    'gm.badDice': 'Invalid format: /roll 2d20+5 (max 20 dice, max 1000 sides)',
    'gm.8ballOut': '🎱 {q} → {a}',
    'gm.rollOut': '🎲 {label} → {detail} = {sum}',
    'gm.coinHeads': '🪙 Heads!',
    'gm.coinTails': '🪙 Tails!',
    'gm.chooseNeed': 'Give at least 2 options: /choose a | b | c',
    'gm.chooseOut': '🎯 I pick: {pick}',
    'gm.randUsage': 'Usage: /rand 1 100',
    'gm.randRange': 'Range too large (max 1,000,000)',
    'tl.remindBad': 'Invalid duration: /remind 30m take out the trash (1 s to 24 h)',
    'tl.remindNoText': 'Add a message: /remind 2h reply to Marie',
    'tl.remindFire': '⏰ Reminder: {text}',
    'tl.remindSet': '⏰ Reminder in {when}: {text}',
    'tl.when.h': '{n} h',
    'tl.when.m': '{n} min',
    'tl.when.s': '{n} s',
    'tl.countOut': '📝 {words} word(s) · {chars} characters',
    'tl.countNeed': 'Give some text: /count hello world',
    'tl.copyNeed': 'Give text to copy',
    'tl.copied': '📋 Copied to the clipboard',
    'tl.copyFail': '✖ Copy failed: {msg}',
    'tl.timeOut': '🕒 {when}',
    'demo.title': 'Unbanded (demo mode)',
    'demo.desc': 'You are not on band.us. Real actions do not work outside of BAND.',
    'demo.open': '⚙ Open Unbanded',
    'demo.input': '/help or /pat then Enter'
  });
  var FR = {};
  Object.assign(FR, {
    'toast.loaded': '✓ Unbanded v{v} chargé en {ms} ms — /help pour les commandes, /settings pour les paramètres',
    'hook.executing': '… exécution de /{name}',
    'hook.unknown': 'Commande inconnue : /{name} (tape /help)',
    'hook.error': 'Erreur : {msg}',
    'help.title': '=== Commandes Unbanded v{v} ===',
    'help.tip': 'Astuce : /help <commande> pour le détail · (affichage local uniquement)',
    'help.localOnly': '(affichage local uniquement)',
    'help.usage': 'Usage : ',
    'help.unknown': 'Commande inconnue : /{name} (tape /help pour la liste)',
    'help.noDesc': '(pas de description)',
    'tab.general': 'Général',
    'tab.plugins': 'Plugins',
    'tab.themes': 'Thèmes',
    'tab.css': 'CSS personnalisé',
    'tab.about': 'À propos',
    'side.shortcuts': 'Raccourcis : /settings · Ctrl+, · Échap pour fermer',
    'fab.title': 'Unbanded — paramètres',
    'btn.title': 'Unbanded — paramètres des plugins (/help, /plugins, /settings)',
    'gen.title': 'Général',
    'gen.startupToast': 'Afficher le toast de démarrage',
    'gen.toastDuration': 'Durée des toasts : ',
    'gen.lang': 'Langue : ',
    'gen.langAuto': 'Auto ({lang})',
    'gen.config': 'Configuration',
    'gen.export': 'Exporter (JSON)',
    'gen.import': 'Importer (JSON)',
    'gen.reset': 'Tout réinitialiser',
    'gen.exportHint': "L'export inclut plugins, thèmes, CSS personnalisé et options — parfait pour migrer vers un autre navigateur.",
    'cfg.exported': 'Configuration exportée',
    'cfg.exportFailed': 'Export impossible : {msg}',
    'cfg.imported': 'Config importée ({n} thème(s)) — recharge la page pour les plugins',
    'cfg.importFailed': 'Import impossible : {msg}',
    'cfg.notUnbanded': "ce n'est pas une config Unbanded",
    'cfg.resetConfirm': 'Tout réinitialiser ? (plugins, thèmes, CSS, options)',
    'cfg.resetDone': 'Réinitialisation effectuée',
    'cfg.resetFailed': 'Reset impossible : {msg}',
    'file.readFailed': 'Lecture du fichier impossible',
    'file.noReader': 'FileReader indisponible : {msg}',
    'cfg.langChanged': 'Langue : {lang} — rechargement…'
  });
  Object.assign(FR, {
    'plg.add': 'Ajouter un plugin',
    'plg.addUrl': 'Ajouter (URL)',
    'plg.importFile': 'Importer un fichier .js',
    'plg.hint': "Un plugin est un JS exposant <code>module.exports = { name, version, description, onLoad(ctx), commands }</code>. Les plugins ajoutés sont mémorisés et rechargés au démarrage.",
    'plg.installed': 'Plugins installés',
    'plg.active': 'actif',
    'plg.inactive': 'inactif',
    'plg.srcFile': 'Fichier',
    'plg.srcBuiltin': 'Intégré',
    'plg.enable': 'Activer',
    'plg.disable': 'Désactiver',
    'plg.delete': 'Supprimer',
    'plg.none': 'Aucun plugin chargé.',
    'plg.imported': 'Plugin importé : {name}',
    'plg.importFailed': 'Échec import : {msg}',
    'plg.removed': 'Plugin supprimé',
    'err.needUrl': "Colle d'abord une URL",
    'thm.import': 'Importer un thème',
    'thm.importUrl': 'Importer (URL)',
    'thm.importFile': 'Importer un fichier .json',
    'thm.hint': 'Format : <code>{"name":"...","colors":{"accent":"#ff7ac6","bg":"#1a1625",...},"css":"/* optionnel */"}</code> — les couleurs manquantes prennent le défaut violet.',
    'thm.title': 'Thèmes',
    'thm.siteOption': 'Appliquer le thème à tout le site band.us',
    'thm.apply': 'Appliquer',
    'thm.applied': 'Appliqué',
    'thm.export': 'Exporter',
    'thm.delete': 'Supprimer',
    'thm.builtin': 'intégré',
    'thm.importedLabel': 'importé',
    'thm.unknown': 'inconnu',
    'thm.imported': 'Thème importé : {name}',
    'thm.importFailed': 'Échec thème : {msg}',
    'thm.appliedToast': 'Thème appliqué : {name}',
    'thm.exported': 'Thème exporté (fichier JSON)',
    'thm.exportFailed': 'Export impossible : {msg}',
    'thm.removed': 'Thème supprimé',
    'css.title': 'CSS personnalisé',
    'css.save': 'Appliquer &amp; enregistrer',
    'css.preview': 'Aperçu (sans enregistrer)',
    'css.reset': 'Réinitialiser',
    'css.hint': "Le CSS est injecté dans la page (élément <code>&lt;style id=\"bt-custom-css\"&gt;</code>) et conservé après rechargement. L'aperçu ne persiste pas.",
    'css.applied': 'CSS appliqué et enregistré',
    'css.previewToast': 'Aperçu appliqué (non enregistré)',
    'css.resetToast': 'CSS réinitialisé',
    'about.plugins': '{n} plugin(s)',
    'about.commands': '{n} commande(s)',
    'about.themes': '{n} thème(s)'
  });
  Object.assign(FR, {
    'cmd.pat': "Fait un pet-pet à quelqu'un (GIF)",
    'cmd.pat.usage': '/pat [user] — user requis en groupe',
    'cmd.help': 'Affiche les commandes disponibles',
    'cmd.help.usage': '/help [commande]',
    'cmd.plugins': 'Ouvre les paramètres (onglet Plugins)',
    'cmd.settings': 'Ouvre la page Paramètres',
    'cmd.debug': 'Diagnostics Unbanded (sélecteurs, DOM, état)',
    'cmd.version': "Affiche la version d'Unbanded",
    'cmd.clear': 'Efface les toasts affichés',
    'cmd.react.desc': "Envoie un GIF « {cat} » à quelqu'un",
    'cmd.react.usage': '/{cat} [user] — user requis en groupe',
    'cmd.8ball': 'Boule magique répond à ta question',
    'cmd.8ball.usage': '/8ball <question>',
    'cmd.roll': 'Lance des dés',
    'cmd.roll.usage': '/roll [NdM±K] — ex : /roll 2d20+5 (défaut 1d6)',
    'cmd.coin': 'Pile ou face',
    'cmd.choose': 'Choisis au hasard parmi tes options',
    'cmd.choose.usage': '/choose <a | b | c>',
    'cmd.rand': 'Nombre aléatoire',
    'cmd.rand.usage': '/rand <min> <max>',
    'cmd.remind': 'Rappelle-toi quelque chose plus tard',
    'cmd.remind.usage': '/remind <30|30m|2h|45s> <texte> — cap 24 h',
    'cmd.shrug': 'Shrug ¯\\_(ツ)_/¯',
    'cmd.tableflip': 'Renverse la table',
    'cmd.unflip': 'Remet la table à plat',
    'cmd.lenny': 'Lenny face ( ͡° ͜ʖ ͡°)',
    'pp.generating': '⏳ Génération du GIF pour {name}…',
    'pp.sent': '✅ GIF pet-pet envoyé à {name}',
    'pp.staticWarn': '⚠ Image statique envoyée à {name} (GIF animé indisponible)',
    'pp.needUser': "En groupe, l'utilisateur est requis : /pat @pseudo",
    'pp.notFound': 'Utilisateur introuvable : {name}',
    'pp.noAvatar': "Pas d'avatar trouvé pour {name}",
    'pp.noGenerator': 'Générateur de GIF indisponible',
    'rx.generating': "⏳ Recherche d'un GIF « {cat} » pour {who}…",
    'rx.sent': '✅ GIF « {cat} » envoyé à {who}',
    'rx.fallback': '⚠ GIF indisponible ({msg}) — message texte envoyé',
    'rx.needUser': "En groupe, l'utilisateur est requis : /{cat} @pseudo",
    'rx.notFound': 'Utilisateur introuvable : {name}',
    'gm.needQuestion': 'Pose une question : /8ball est-ce que je gagne ?',
    'gm.badDice': 'Format invalide : /roll 2d20+5 (N ≤ 20 dés, M ≤ 1000 faces)',
    'gm.8ballOut': '🎱 {q} → {a}',
    'gm.rollOut': '🎲 {label} → {detail} = {sum}',
    'gm.coinHeads': '🪙 Pile !',
    'gm.coinTails': '🪙 Face !',
    'gm.chooseNeed': 'Donne au moins 2 options : /choose a | b | c',
    'gm.chooseOut': '🎯 Je choisis : {pick}',
    'gm.randUsage': 'Usage: /rand 1 100',
    'gm.randRange': 'Plage trop grande (max 1 000 000)',
    'tl.remindBad': 'Durée invalide : /remind 30m sortir le trash (1 s à 24 h)',
    'tl.remindNoText': 'Ajoute un message : /remind 2h répondre à Marie',
    'tl.remindFire': '⏰ Rappel : {text}',
    'tl.remindSet': '⏰ Rappel dans {when} : {text}',
    'tl.when.h': '{n} h',
    'tl.when.m': '{n} min',
    'tl.when.s': '{n} s',
    'demo.title': 'Unbanded (mode démo)',
    'demo.desc': "Tu n'es pas sur band.us. Les actions réelles ne fonctionnent pas hors de BAND.",
    'demo.open': '⚙ Ouvrir Unbanded',
    'demo.input': '/help ou /pat puis Entrée'
  });
  var DICT = { en: EN, fr: FR };

  function normalize(lang) {
    var l = String(lang || '').toLowerCase().split(/[-_]/)[0];
    return DICT[l] ? l : 'en';
  }

  /** Détecte la langue : app BAND d'abord, puis navigateur, repli EN. */
  function detect() {
    var app = '';
    try { app = window.formatjsLang || window.intlLang || window.messageLang || ''; } catch (e) {}
    if (app) return normalize(app);
    try { app = navigator.language || ''; } catch (e) {}
    return normalize(app);
  }

  var current = 'en';

  function pref() {
    try { return window.BTTStore.get('lang', 'auto') || 'auto'; } catch (e) { return 'auto'; }
  }

  function init() {
    var p = pref();
    current = p === 'auto' ? detect() : normalize(p);
    return current;
  }

  function t(key, params) {
    var d = DICT[current] || DICT.en;
    var s = d[key];
    if (s == null && current !== 'en') s = DICT.en[key];
    if (s == null) s = key;
    if (params) for (var k in params) s = s.split('{' + k + '}').join(String(params[k]));
    return s;
  }

  function set(p) {
    try { window.BTTStore.set('lang', p); } catch (e) {}
    current = p === 'auto' ? detect() : normalize(p);
    return current;
  }

  function lang() { return current; }

  function languages() {
    var d = detect();
    return [
      { id: 'auto', name: 'Auto (' + d.toUpperCase() + ')' },
      { id: 'en', name: 'English' },
      { id: 'fr', name: 'Français' }
    ];
  }

  /** Description localisée d'une commande (repli : desc enregistrée). */
  function cmdDesc(name, fallback) {
    var d = DICT[current] || DICT.en;
    var s = d['cmd.' + name];
    if (s == null && current !== 'en') s = DICT.en['cmd.' + name];
    if (s == null && REACTION_RE.test(name)) {
      s = d['cmd.react.desc'] || DICT.en['cmd.react.desc'];
      if (s) s = s.split('{cat}').join(name);
    }
    return s != null ? s : (fallback || '');
  }

  /** Usage localisé d'une commande (repli : usage enregistré). */
  function cmdUsage(name, fallback) {
    var d = DICT[current] || DICT.en;
    var s = d['cmd.' + name + '.usage'];
    if (s == null && current !== 'en') s = DICT.en['cmd.' + name + '.usage'];
    if (s == null && REACTION_RE.test(name)) {
      s = d['cmd.react.usage'] || DICT.en['cmd.react.usage'];
      if (s) s = s.split('{cat}').join(name);
    }
    return s != null ? s : (fallback || '');
  }

  return {
    init: init, t: t, set: set, lang: lang, pref: pref,
    languages: languages, detect: detect,
    cmdDesc: cmdDesc, cmdUsage: cmdUsage, DICT: DICT
  };
})();

window.BTTI18n = BTTI18n;
if (typeof module !== 'undefined' && module.exports) module.exports = BTTI18n;