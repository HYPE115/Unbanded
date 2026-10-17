/**
 * Plugin par défaut "pet-pet" inspiré de https://github.com/aDu/pet-pet-gif
 * Commande : /pat [user]
 *   - en DM : pas besoin de user (cible la personne de la conversation)
 *   - en groupe : user requis (mention @pseudo ou nom)
 */
(function () {
  var PLUGIN = {
    name: 'pet-pet',
    version: '1.0.0',
    description: "Génère un GIF pet-pet à envoyer dans la conversation (aDu/pet-pet-gif)",
    onLoad: function (ctx) {
      var self = this;
      ctx.registerCommand('pat', 'Fait un pet-pet à quelqu\'un. Usage: /pat [user] (user requis en groupe)', function (args, info) {
        return self._run(args, info);
      });
    },
    _run: async function (args, info) {
      var type = info.getConversationType();
      var target;
      if (type === 'group') {
        if (!args.length) {
          throw new Error('En groupe, l\'utilisateur est requis : /pat @pseudo');
        }
        target = info.getUserByMention(args[0]);
        if (!target) {
          target = info.getUserByMention(args.join(' '));
        }
        if (!target) {
          throw new Error('Utilisateur introuvable : ' + args[0]);
        }
      } else {
        var me = info.getCurrentUser();
        target = info.getUserByMention('@' + (me && me.name ? me.name : '')) || me;
      }
      var avatar = info.getUserAvatar(target);
      if (!avatar) {
        throw new Error('Pas d\'avatar trouvé pour ' + (target && target.name ? target.name : target));
      }
      var generate = window.__BTT_PetGif;
      if (!generate) {
        throw new Error('Générateur de GIF indisponible');
      }
      if (window.__BTT_toast) window.__BTT_toast('⏳ Génération du GIF pour ' + (target && target.name ? target.name : '?') + '…');
      var blob = await generate(avatar);
      var isGif = !!(blob && blob.type === 'image/gif');
      var ext = isGif ? 'gif' : 'png';
      var fileName = 'pet-' + ((target && target.name) ? String(target.name).replace(/\s+/g, '_') : 'user') + '.' + ext;
      await info.sendFile(blob, fileName);
      var who = (target && target.name ? target.name : '?');
      if (isGif) {
        if (window.__BTT_toast) window.__BTT_toast('✅ GIF pet-pet envoyé à ' + who, 'ok');
      } else if (window.__BTT_toast) {
        window.__BTT_toast('⚠ Image statique envoyée à ' + who + ' (GIF animé indisponible)', 'warn');
      }
    }
  };
  window.PluginPetPet = PLUGIN;
  if (typeof module !== 'undefined' && module.exports) module.exports = PLUGIN;
})();
