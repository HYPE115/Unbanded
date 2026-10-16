/**
 * PluginManager - Charge, active et désactive les plugins.
 *
 * Un plugin est un module qui exporte un objet :
 *   {
 *     name, version, description,
 *     onLoad(ctx), onUnload(ctx),
 *     commands: [ { name, description, handler(ctx, args, info) } ]
 *   }
 *
 * ctx expose :
 *   api      -> BandAdapter
 *   log      -> console.log préfixé
 *   registerCommand(name, desc, handler)
 *   sendText(text)
 *   sendFile(blob, filename)
 *   getCurrentUser(), getConversationType(), getCurrentChannelId(), getUserAvatar(user)
 */
class PluginManager {
  constructor(adapter, ui) {
    this.adapter = adapter;
    this.ui = ui;
    this.plugins = new Map();        // id -> { spec, url, enabled, specObj }
    this.commands = new Map();       // nom commande -> { pluginId, handler, desc }
    this.defaultPlugins = [];
  }

  registerDefaultPlugin(url) {
    this.defaultPlugins.push(url);
  }

  async loadPlugin(url, { enabled = true } = {}) {
    if (this.plugins.has(url)) {
      this.adapter.log('Plugin déjà chargé :', url);
      return this.plugins.get(url);
    }
    this.adapter.log('Chargement du plugin :', url);
    let spec;
    try {
      spec = await this._fetchModule(url);
    } catch (e) {
      this.adapter.log('Échec chargement plugin', url, e);
      throw e;
    }
    if (!spec || !spec.name) throw new Error('Plugin invalide (pas de nom)');

    const ctx = this._makeContext(url);
    let unload;
    if (spec.onLoad) {
      try { unload = spec.onLoad(ctx); } catch (e) {
        this.adapter.log('Erreur onLoad du plugin', spec.name, e);
      }
    }

    // Enregistre les commandes du plugin
    if (spec.commands) {
      for (const cmd of spec.commands) {
        this.commands.set(cmd.name.toLowerCase(), {
          pluginId: url,
          handler: cmd.handler,
          desc: cmd.desc || ''
        });
        this.adapter.log('Commande enregistrée : /' + cmd.name + ' (plugin ' + spec.name + ')');
      }
    }

    this.plugins.set(url, { spec, url, enabled, unload });
    if (this.ui) this.ui.renderPluginList();
    return spec;
  }

  async unloadPlugin(url) {
    const entry = this.plugins.get(url);
    if (!entry) return;
    if (entry.enabled && entry.spec.onUnload && entry.spec.onUnload) {
      try { entry.spec.onUnload(this._makeContext(url)); } catch (e) {}
    }
    // Supprime ses commandes
    for (const [name, cmd] of this.commands.entries()) {
      if (cmd.pluginId === url) this.commands.delete(name);
    }
    this.plugins.delete(url);
    if (this.ui) this.ui.renderPluginList();
  }

  setEnabled(url, enabled) {
    const entry = this.plugins.get(url);
    if (entry) entry.enabled = enabled;
    if (this.ui) this.ui.renderPluginList();
  }

  isEnabled(url) {
    const e = this.plugins.get(url);
    return e ? e.enabled : false;
  }

  /* ---------- Contexte passé aux plugins ---------- */
  _makeContext(pluginUrl) {
    const api = this.adapter;
    const self = this;
    return {
      api,
      log: (...args) => console.log('[Plugin:' + pluginUrl.split('/').pop() + ']', ...args),
      registerCommand: (name, desc, handler) => {
        self.commands.set(name.toLowerCase(), { pluginId: pluginUrl, handler, desc });
        api.log('Commande enregistrée : /' + name);
      },
      unregisterCommand: (name) => {
        self.commands.delete(name.toLowerCase());
      },
      sendText: (text) => api.sendText(text),
      sendFile: (blob, filename) => api.sendFile(blob, filename),
      getCurrentUser: () => api.getCurrentUser(),
      getConversationType: () => api.getConversationType(),
      getCurrentChannelId: () => api.getCurrentChannelId(),
      getUserAvatar: (user) => api.getUserAvatar(user),
      getUserByMention: (m) => api.getUserByMention(m)
    };
  }

  /* ---------- Exécution d'une commande slash ---------- */
  async runCommand(inputText, messageInfo) {
    const match = inputText.match(/^\/([^\s]+)(?:\s+(.*))?$/);
    if (!match) return false;
    const name = match[1].toLowerCase();
    const args = (match[2] || '').trim().split(/\s+/).filter(Boolean);
    const cmd = this.commands.get(name);
    if (!cmd) return false;
    const ctx = this._makeContext(cmd.pluginId || 'builtin');
    const info = Object.assign({}, ctx, messageInfo || {}, { plugin: this.plugins.get(cmd.pluginId) });
    try {
      await cmd.handler(args, info);
      return true;
    } catch (e) {
      this.adapter.log('Erreur commande /' + name, e);
      throw e;
    }
  }

  hasCommand(name) {
    return this.commands.has(name.toLowerCase());
  }

  /* ---------- Chargement d'un module JS distant (userscript-safe) ---------- */
  async _fetchModule(url) {
    const resp = await fetch(url, { cache: 'no-cache' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const code = await resp.text();
    // On évalue dans le contexte global de la page (userscript)
    const fn = new Function('exports', 'module', 'require', 'console', code);
    const exports = {};
    const module = { exports };
    fn(exports, module, null, console);
    return module.exports || exports;
  }

  async loadDefaults() {
    for (const url of this.defaultPlugins) {
      try { await this.loadPlugin(url, { enabled: true }); } catch (e) {
        this.adapter.log('Échec plugin par défaut', url, e);
      }
    }
  }
}

window.PluginManager = PluginManager;
if (typeof module !== 'undefined' && module.exports) module.exports = PluginManager;
