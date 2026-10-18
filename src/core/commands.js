/**
 * Commandes slash intégrées (disponibles même sans plugin).
 * Version centralisée : build.js définit window.BTT_VERSION avant la concaténation
 * (repli "dev" si le script est chargé sans passer par le build).
 */
function registerBuiltInCommands(pm) {
  var BTT_VERSION = 'dev';
  try { if (window.BTT_VERSION) BTT_VERSION = window.BTT_VERSION; } catch (e) {}
  pm.registerCommand('pat', "Fait un pet-pet à quelqu'un (GIF)", async () => {
    // Redondant : le plugin pet-pet (chargé juste après) remplace ce stub.
  }, '/pat [user] — user requis en groupe');

  pm.registerCommand('help', 'Affiche les commandes disponibles', async (args, info) => {
    const q = String((args && args[0]) || '').toLowerCase().replace(/^\//, '');
    if (q) {
      const cmd = pm.commands.get(q);
      let msg;
      if (cmd) {
        msg = '/' + q + ' — ' + (cmd.desc || '(pas de description)');
        if (cmd.usage) msg += '\nUsage : ' + cmd.usage;
        msg += '\n(affichage local uniquement)';
      } else {
        msg = (window.BTTI18n && typeof window.BTTI18n.t === 'function') ? window.BTTI18n.t('help.unknown', {name: q}) : 'Commande inconnue : /' + q + ' (tape /help pour la liste)';
      }
      if (window.__BTT_toast) window.__BTT_toast(msg, cmd ? undefined : 'error');
      else info.api.log(msg);
      return;
    }
    const lines = ['=== Commandes Unbanded v' + BTT_VERSION + ' ==='];
    for (const [name, cmd] of pm.commands) {
      lines.push('/' + name + ' — ' + (cmd.desc || ''));
    }
    lines.push('', 'Astuce : /help <commande> pour le détail · (affichage local uniquement)');
     if (window.__BTT_toast) window.__BTT_toast(lines.join('\n'));
     else info.api.log(lines.join('\n'));
   });

  pm.registerCommand('plugins', 'Ouvre les paramètres (onglet Plugins)', async (args, info) => {
    const ui = window.UnbandedUI || window.BandTamperUI;
    if (ui && ui.openSettings) {
      ui.openSettings('plugins');
      if (window.__BTT_toast) window.__BTT_toast('Page Paramètres → Plugins');
    } else if (window.__BTT_toast) {
      window.__BTT_toast('Page Paramètres indisponible', 'error');
    }
  });

  pm.registerCommand('settings', 'Ouvre la page Paramètres', async (args, info) => {
    const ui = window.UnbandedUI || window.BandTamperUI;
    if (ui && ui.openSettings) {
      ui.openSettings();
    } else if (window.__BTT_toast) {
      window.__BTT_toast('Page Paramètres indisponible', 'error');
    }
  });

  pm.registerCommand('debug', 'Diagnostics Unbanded (sélecteurs, DOM, état)', async (args, info) => {
    const a = (info && info.api) || pm.adapter;
    const input = a.getChatInput ? a.getChatInput() : null;
    const fileInputs = a.$$('input[type="file"]').length;
    const lines = [
      '=== debug Unbanded v' + BTT_VERSION + ' ===',
      'URL : ' + String((typeof location !== 'undefined' && location.href) || '?'),
      'Host : ' + a.host + ' | démo : ' + a.isDemo(),
      'Page chat : ' + ((window.UnbandedUI && window.UnbandedUI._isChatPage) ? window.UnbandedUI._isChatPage() : '?'),
      'Type conversation : ' + a.getConversationType(),
      'Canal : ' + a.getCurrentChannelId(),
      'Champ de saisie : ' + (input ? input.tagName + (input.isContentEditable ? ' (contenteditable)' : '') : 'INTROUVABLE'),
      'Bouton envoyer : ' + (a.getSendButton && a.getSendButton() ? 'trouvé' : 'introuvable'),
      'input[type=file] : ' + fileInputs,
      'Plugins : ' + pm.plugins.size + ' | Commandes : ' + Array.from(pm.commands.keys()).join(', ')
    ];
    const text = lines.join('\n');
    console.log('[Unbanded][debug]\n' + text);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(text);
    } catch (e) {}
    if (window.__BTT_toast) window.__BTT_toast(text + '\n(copié dans le presse-papiers)');
  });

  pm.registerCommand('version', "Affiche la version d'Unbanded", async (args, info) => {
    const msg = 'Unbanded v' + BTT_VERSION;
    if (window.__BTT_toast) window.__BTT_toast(msg, 'ok');
    else info.api.log(msg);
  });

  pm.registerCommand('clear', 'Efface les toasts affichés', async () => {
    try {
      const wrap = document.getElementById('bt-toasts');
      if (wrap) wrap.innerHTML = '';
      const ui = window.UnbandedUI || window.BandTamperUI;
      if (ui && ui._acHide) ui._acHide();
    } catch (e) {}
  });

  // Alias historique : /btdbg continue de fonctionner après le renommage en /debug.
  try { if (pm.registerAlias) pm.registerAlias('btdbg', 'debug'); } catch (eAlias) {}
}

window.registerBuiltInCommands = registerBuiltInCommands;
if (typeof module !== 'undefined' && module.exports) module.exports = { registerBuiltInCommands };