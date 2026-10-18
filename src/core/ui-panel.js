/**
 * ui-panel.js — SUPPRIMÉ (ancien panneau flottant "Unbanded · Plugins").
 * Conservé comme shims de compatibilité : la gestion des plugins se fait
 * désormais dans la page Paramètres (onglet Plugins, via /plugins ou ⚙).
 */
BandUI.prototype._injectPanel = function () {
  // Supprime tout résidu d'une ancienne version.
  try {
    var stale = document.getElementById('bt-band-panel');
    if (stale && stale.remove) stale.remove();
  } catch (e) {}
  this.panel = null; this.visible = false;
};

BandUI.prototype.toggle = function () {
  // Vrai toggle : ferme si les Paramètres sont déjà ouverts, sinon ouvre
  // l'onglet Plugins. (L'ancien shim ouvrait toujours, sans fermer.)
  if (this.settingsVisible && this.closeSettings) this.closeSettings();
  else this.openSettings('plugins');
};
BandUI.prototype.show = function () { this.openSettings('plugins'); };
BandUI.prototype.hide = function () { if (this.closeSettings) this.closeSettings(); };

BandUI.prototype.renderPluginList = function () {
  // No-op : l'ancien conteneur #bt-plugin-list n'existe plus.
  // Le PluginManager rafraîchit déjà l'onglet via renderSettingsPlugins().
};
