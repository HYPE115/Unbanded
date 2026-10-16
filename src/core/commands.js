/**
 * Commandes slash intégrées (disponibles même sans plugin).
 */
function registerBuiltInCommands(pm) {
  pm.registerCommand('pat', "Fais un pet-pet à quelqu'un. Usage : /pat [user] (user requis en groupe)", async () => {
    // Redondant : le plugin pet-pet (chargé juste après) remplace ce stub.
  });

  pm.registerCommand('help', "Affiche la liste des commandes", async (args, info) => {
    const lines = ['=== Commandes Band Tamper ==='];
    for (const [name, cmd] of pm.commands) {
      lines.push('/' + name + ' — ' + (cmd.desc || ''));
    }
    lines.push('', '(affichage local uniquement)');
    if (window.__BTT_toast) window.__BTT_toast(lines.join('\n'));
    else info.api.log(lines.join('\n'));
  });

  pm.registerCommand('plugins', "Ouvre/ferme le gestionnaire de plugins", async (args, info) => {
    if (window.BandTamperUI) {
      window.BandTamperUI.toggle();
      if (window.__BTT_toast) window.__BTT_toast('Panneau Plugins ' + (window.BandTamperUI.visible ? 'ouvert' : 'fermé'));
    } else if (window.__BTT_toast) {
      window.__BTT_toast('Panneau indisponible', 'error');
    }
  });

  pm.registerCommand('settings', 'Ouvre la page Paramètres (thèmes, CSS personnalisé, plugins)', async (args, info) => {
    if (window.BandTamperUI && window.BandTamperUI.openSettings) {
      window.BandTamperUI.openSettings();
    } else if (window.__BTT_toast) {
      window.__BTT_toast('Page Paramètres indisponible', 'error');
    }
  });

  pm.registerCommand('btdbg', "Diagnostics Band Tamper (sélecteurs, hook, etc.)", async (args, info) => {
    const a = (info && info.api) || pm.adapter;
    const input = a.getChatInput ? a.getChatInput() : null;
    const fileInputs = a.$$('input[type="file"]').length;
    const lines = [
      '=== btdbg Band Tamper ===',
      'Host : ' + a.host + ' | démo : ' + a.isDemo(),
      'Type conversation : ' + a.getConversationType(),
      'Canal : ' + a.getCurrentChannelId(),
      'Champ de saisie : ' + (input ? input.tagName + (input.isContentEditable ? ' (contenteditable)' : '') : 'INTROUVABLE'),
      'Bouton envoyer : ' + (a.getSendButton && a.getSendButton() ? 'trouvé' : 'introuvable'),
      'input[type=file] : ' + fileInputs,
      'Commandes : ' + Array.from(pm.commands.keys()).join(', ')
    ];
    console.log('[BandTamper][btdbg]\n' + lines.join('\n'));
    if (window.__BTT_toast) window.__BTT_toast(lines.join('\n'));
  });
}

window.registerBuiltInCommands = registerBuiltInCommands;
if (typeof module !== 'undefined' && module.exports) module.exports = { registerBuiltInCommands };