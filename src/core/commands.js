/**
 * Commandes slash intégrées (disponibles même sans plugin).
 * Version centralisée : build.js définit window.BTT_VERSION avant la concaténation
 * (repli "dev" si le script est chargé sans passer par le build).
 */
function registerBuiltInCommands(pm) {
  var BTT_VERSION = 'dev';
  try { if (window.BTT_VERSION) BTT_VERSION = window.BTT_VERSION; } catch (e) {}
  pm.registerCommand('pat', 'Sends a pet-pet GIF to someone', async () => {
    // Redondant : le plugin pet-pet (chargé juste après) remplace ce stub.
  }, '/pat [user] — required in group chats');

  pm.registerCommand('help', 'Shows the available commands', async (args, info) => {
    const q = String((args && args[0]) || '').toLowerCase().replace(/^\//, '');
    if (q) {
      const cmd = pm.commands.get(q);
      let msg;
      if (cmd) {
        msg = '/' + q + ' — ' + (cmd.desc || '(no description)');
        if (cmd.usage) msg += '\nUsage: ' + cmd.usage;
        msg += '\n(local display only)';
      } else {
        msg = (window.BTTI18n && typeof window.BTTI18n.t === 'function') ? window.BTTI18n.t('help.unknown', {name: q}) : 'Unknown command: /' + q + ' (type /help for the list)';
      }
      if (window.__BTT_toast) window.__BTT_toast(msg, cmd ? undefined : 'error');
      else info.api.log(msg);
      return;
    }
    const lines = ['=== Commandes Unbanded v' + BTT_VERSION + ' ==='];
    for (const [name, cmd] of pm.commands) {
      lines.push('/' + name + ' — ' + (cmd.desc || ''));
    }
    lines.push('', 'Tip: /help <command> for details · (local display only)');
     if (window.__BTT_toast) window.__BTT_toast(lines.join('\n'));
     else info.api.log(lines.join('\n'));
   });

  pm.registerCommand('plugins', 'Opens settings (Plugins tab)', async (args, info) => {
    const ui = window.UnbandedUI || window.BandTamperUI;
    if (ui && ui.openSettings) {
      ui.openSettings('plugins');
      if (window.__BTT_toast) window.__BTT_toast('Settings page → Plugins');
    } else if (window.__BTT_toast) {
      window.__BTT_toast('Settings page unavailable', 'error');
    }
  });

  pm.registerCommand('settings', 'Opens the settings page', async (args, info) => {
    const ui = window.UnbandedUI || window.BandTamperUI;
    if (ui && ui.openSettings) {
      ui.openSettings();
    } else if (window.__BTT_toast) {
      window.__BTT_toast('Settings page unavailable', 'error');
    }
  });

  pm.registerCommand('debug', 'Unbanded diagnostics (selectors, DOM, state)', async (args, info) => {
    const a = (info && info.api) || pm.adapter;
    const input = a.getChatInput ? a.getChatInput() : null;
    const fileInputs = a.$$('input[type="file"]').length;
    const lines = [
      '=== debug Unbanded v' + BTT_VERSION + ' ===',
      'URL : ' + String((typeof location !== 'undefined' && location.href) || '?'),
      'Host: ' + a.host + ' | demo: ' + a.isDemo(),
      'Chat page: ' + ((window.UnbandedUI && window.UnbandedUI._isChatPage) ? window.UnbandedUI._isChatPage() : '?'),
      'Conversation type: ' + a.getConversationType(),
      'Channel: ' + a.getCurrentChannelId(),
      'Input field: ' + (input ? input.tagName + (input.isContentEditable ? ' (contenteditable)' : '') : 'NOT FOUND'),
      'Send button: ' + (a.getSendButton && a.getSendButton() ? 'found' : 'not found'),
      'input[type=file] : ' + fileInputs,
      'Plugins: ' + pm.plugins.size + ' | Commands: ' + Array.from(pm.commands.keys()).join(', ')
    ];
    const text = lines.join('\n');
    console.log('[Unbanded][debug]\n' + text);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(text);
    } catch (e) {}
    if (window.__BTT_toast) window.__BTT_toast(text + '\n(copied to clipboard)');
  });

  pm.registerCommand('version', "Shows Unbanded's version", async (args, info) => {
    const msg = 'Unbanded v' + BTT_VERSION;
    if (window.__BTT_toast) window.__BTT_toast(msg, 'ok');
    else info.api.log(msg);
  });

  pm.registerCommand('clear', 'Clears the displayed toasts', async () => {
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