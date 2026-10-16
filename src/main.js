(function () {
  'use strict';

  var adapter = new window.BandAdapter();
  var pm = new window.PluginManager(adapter, null);
  var ui = new window.BandUI(pm, adapter);
  pm.ui = ui;

  (async function () {
    window.registerBuiltInCommands(pm);
    if (window.PluginPetPet) {
      pm.registerBuiltin(window.PluginPetPet);
    }
    ui.inject();
    if (window.__BTT_toast) {
      window.__BTT_toast('✓ Band Tamper v1.4.0 chargé — tape /help dans le chat', 'ok');
    }
    console.log('[BandTamper] Prêt. Plugins : ' + pm.plugins.size + ' | Commandes : ' + pm.commands.size);
    var tick = setInterval(function () {
      try { ui.ensureInjected(); } catch (e) {}
    }, 2500);
    if (tick && typeof tick.unref === 'function') tick.unref();
  })();
})();
