(function () {
  'use strict';

  var t0 = Date.now();
  var adapter = new window.BandAdapter();
  var pm = new window.PluginManager(adapter, null);
  var ui = new window.BandUI(pm, adapter);
  pm.ui = ui;

  (async function () {
    window.registerBuiltInCommands(pm);
    if (window.PluginPetPet) {
      pm.registerBuiltin(window.PluginPetPet);
    }
    if (window.PluginReactions) pm.registerBuiltin(window.PluginReactions);
    if (window.PluginGames) pm.registerBuiltin(window.PluginGames);
    if (window.PluginTools) pm.registerBuiltin(window.PluginTools);
    // Thème actif + CSS personnalisé (persistés)
    try { window.BTTThemes.applyActive(); } catch (eTheme) { console.warn('[Unbanded] Thème :', eTheme); }
    try { window.BTTStyles.apply(window.BTTStyles.get()); } catch (eCss) { console.warn('[Unbanded] CSS perso :', eCss); }
    // Plugins persistés (imports URL/fichier des sessions précédentes)
    try { await pm.loadPersisted(); } catch (ePersist) { console.warn('[Unbanded] Plugins persistés :', ePersist); }
    window.BTTI18n.init();
    ui.inject();
    // API publique (plugins avancés, console, scripts externes).
    try {
      window.Unbanded = {
        version: window.BTT_VERSION || 'dev',
        adapter: adapter,
        pm: pm,
        ui: ui,
        store: window.BTTStore,
        themes: window.BTTThemes,
        styles: window.BTTStyles,
        toast: window.__BTT_toast,
        openSettings: function (tab) { return ui.openSettings(tab); },
        closeSettings: function () { return ui.closeSettings(); },
        registerCommand: function (name, desc, handler) { return pm.registerCommand(name, desc, handler); },
        registerAlias: function (alias, target) { return pm.registerAlias(alias, target); },
        // Ajout express de plugin (content-script privé / console).
        // Ex : Unbanded.addPlugin('https://…/mon-plugin.js')
        addPlugin: function (url, opts) { return pm.loadPlugin(url, opts); }
      };
    } catch (eApi) { console.warn('[Unbanded] API publique :', eApi); }
    var showToast = true;
    try { showToast = window.BTTStore.get('startupToast', true) !== false; } catch (eOpt) {}
    var ms = Date.now() - t0;
    if (showToast && window.__BTT_toast) {
      window.__BTT_toast(window.BTTI18n.t('toast.loaded', {v: window.BTT_VERSION || 'dev', ms: ms}), 'ok');
    }
    console.log('[Unbanded] Prêt en ' + ms + ' ms. Plugins : ' + pm.plugins.size + ' | Commandes : ' + pm.commands.size);
    var tick = setInterval(function () {
      try { ui.ensureInjected(); } catch (e) {}
      // Ré-ancre les couches CSS en fin de <head> : le SPA de band.us peut
      // déplacer/supplanter les <style> lors des navigations → le CSS perso
      // et le thème restent appliqués à tout le site en permanence.
      try { window.BTTThemes.applyActive(); } catch (e) {}
      try { window.BTTStyles.apply(window.BTTStyles.get()); } catch (e) {}
      try { window.BTTStyles.keepCustomLast(); } catch (e) {}
    }, 2500);
    if (tick && typeof tick.unref === 'function') tick.unref();
  })();
})();
