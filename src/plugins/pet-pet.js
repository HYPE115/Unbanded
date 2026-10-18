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
    description: "Generates a pet-pet GIF to send in the conversation (aDu/pet-pet-gif)", descriptionKey: "plg.desc.petpet",
    onLoad: function (ctx) {
      var self = this;
      var T = function (k, p, fb) { try { if (window.BTTI18n && window.BTTI18n.t) { var s = window.BTTI18n.t(k, p); if (s && s !== k) return s; } } catch (e) {} return fb; };
      ctx.registerCommand('pat', T('cmd.pat', null, "Sends a pet-pet GIF to someone"), function (args, info) {
        return self._run(args, info);
      }, T('cmd.pat.usage', null, '/pat [user] — required in group chats'));
    },
    _run: async function (args, info) {
      var type = info.getConversationType();
      var target;
      if (type === 'group') {
        if (!args.length) {
          throw new Error((window.BTTI18n?window.BTTI18n.t('pp.needUser'):'In group chats a user is required: /pat @name'));
        }
        target = info.getUserByMention(args[0]);
        if (!target) {
          target = info.getUserByMention(args.join(' '));
        }
        if (!target) {
          throw new Error((window.BTTI18n?window.BTTI18n.t('pp.notFound',{name:args[0]}):'User not found: '+args[0]));
        }
      } else {
        var me = info.getCurrentUser();
        target = info.getUserByMention('@' + (me && me.name ? me.name : '')) || me;
      }
      var avatar = info.getUserAvatar(target);
      if (!avatar) {
        throw new Error((window.BTTI18n?window.BTTI18n.t('pp.noAvatar',{name:(target&&target.name?target.name:target)}):'No avatar found for '+(target&&target.name?target.name:target)));
      }
      var generate = window.__BTT_PetGif;
      if (!generate) {
        throw new Error((window.BTTI18n?window.BTTI18n.t('pp.noGenerator'):'GIF generator unavailable'));
      }
      if (window.__BTT_toast) window.__BTT_toast((window.BTTI18n?window.BTTI18n.t('pp.generating',{name:(target&&target.name?target.name:'?')}):'Generating…'));
      var blob = await generate(avatar);
      var isGif = !!(blob && blob.type === 'image/gif');
      var ext = isGif ? 'gif' : 'png';
      var fileName = 'pet-' + ((target && target.name) ? String(target.name).replace(/\s+/g, '_') : 'user') + '.' + ext;
      await info.sendFile(blob, fileName);
      var who = (target && target.name ? target.name : '?');
      if (isGif) {
        if (window.__BTT_toast) window.__BTT_toast((window.BTTI18n?window.BTTI18n.t('pp.sent',{name:who}):'Sent to '+who), 'ok');
      } else if (window.__BTT_toast) {
        window.__BTT_toast((window.BTTI18n?window.BTTI18n.t('pp.staticWarn',{name:who}):'Static image sent'), 'warn');
      }
    }
  };
  window.PluginPetPet = PLUGIN;
  if (typeof module !== 'undefined' && module.exports) module.exports = PLUGIN;
})();
