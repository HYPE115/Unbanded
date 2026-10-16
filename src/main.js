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
    // Thème actif + CSS personnalisé (persistés)
    try { window.BTTThemes.applyActive(); } catch (eTheme) { console.warn('[BandTamper] Thème :', eTheme); }
    try { window.BTTStyles.apply(window.BTTStyles.get()); } catch (eCss) { console.warn('[BandTamper] CSS perso :', eCss); }
    // Plugins persistés (imports URL/fichier des sessions précédentes)
    try { await pm.loadPersisted(); } catch (ePersist) { console.warn('[BandTamper] Plugins persistés :', ePersist); }
    ui.inject();
    var showToast = true;
    try { showToast = window.BTTStore.get('startupToast', true) !== false; } catch (eOpt) {}
    if (showToast && window.__BTT_toast) {
      window.__BTT_toast('✓ Band Tamper v1.5.0 chargé — /help pour les commandes, /settings pour les paramètres', 'ok');
    }
    console.log('[BandTamper] Prêt. Plugins : ' + pm.plugins.size + ' | Commandes : ' + pm.commands.size);
    var tick = setInterval(function () {
      try { ui.ensureInjected(); } catch (e) {}
    }, 2500);
    if (tick && typeof tick.unref === 'function') tick.unref();
  })();
})();
