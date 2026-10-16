PluginManager.prototype.registerCommand = function (name, desc, handler) {
  this.commands.set(name.toLowerCase(), { pluginId: 'builtin', handler: handler, desc: desc || '' });
  this.adapter.log('Commande enregistrée : /' + name);
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
      this.commands.set(cmd.name.toLowerCase(), { pluginId: url, handler: cmd.handler, desc: cmd.desc || '' });
      this.adapter.log('Commande enregistrée : /' + cmd.name + ' (builtin ' + spec.name + ')');
    }
  }
  this.plugins.set(url, { spec: spec, url: url, enabled: true, unload: unload });
  if (this.ui) this.ui.renderPluginList();
};
