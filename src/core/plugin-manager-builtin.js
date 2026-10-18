PluginManager.prototype.registerCommand = function (name, desc, handler, usage) {
  this.commands.set(name.toLowerCase(), { pluginId: 'builtin', handler: handler, desc: desc || '', usage: usage || '' });
  this.adapter.log('Commande enregistrée : /' + name);
};

/**
 * registerAlias(alias, cible) — ex : registerAlias('btdbg', 'debug').
 * L'alias est résolu dans runCommand(), /help et l'autocomplétion.
 * Les alias ne sont pas persistés (re-déclarés au chargement).
 */
PluginManager.prototype.registerAlias = function (alias, target) {
  if (!this.aliases) this.aliases = new Map();
  var a = String(alias || '').toLowerCase().replace(/^\//, '');
  var t = String(target || '').toLowerCase().replace(/^\//, '');
  if (!a || !t || a === t) return;
  this.aliases.set(a, t);
  this.adapter.log('Alias enregistré : /' + a + ' → /' + t);
};

PluginManager.prototype.unregisterAlias = function (alias) {
  if (!this.aliases) return;
  this.aliases.delete(String(alias || '').toLowerCase().replace(/^\//, ''));
};

/** Résout un nom de commande via les alias (chaînés, anti-boucle). */
PluginManager.prototype.resolveCommand = function (name) {
  var n = String(name || '').toLowerCase();
  if (!this.aliases) return n;
  var seen = {};
  var guard = 0;
  while (this.aliases.has(n) && !seen[n] && guard++ < 10) {
    seen[n] = true;
    n = this.aliases.get(n);
  }
  return n;
};

PluginManager.prototype.registerBuiltin = function (spec, url) {
  url = url || ('builtin://' + spec.name);
  if (this.plugins.has(url)) return;
  var ctx = this._makeContext(url);
  var unload;
  if (spec.onLoad) {
    try { unload = spec.onLoad(ctx); } catch (e) {
      this.adapter.log('Erreur onLoad builtin', spec.name, e);
    }
  }
  if (spec.commands) {
    for (var i = 0; i < spec.commands.length; i++) {
      var cmd = spec.commands[i];
      this.commands.set(cmd.name.toLowerCase(), { pluginId: url, handler: cmd.handler, desc: cmd.desc || '', usage: cmd.usage || '' });
      this.adapter.log('Commande enregistrée : /' + cmd.name + ' (builtin ' + spec.name + ')');
    }
  }
  this.plugins.set(url, { spec: spec, url: url, source: 'builtin', builtin: true, code: null, enabled: true, unload: unload });
  this._refreshLists();
};
