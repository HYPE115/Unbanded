# 📚 Documentation — How to Create Themes and Plugins for Unbanded

This document explains how to write your own **plugins** (slash commands, JS logic) and **themes** (visual appearance) for Unbanded (formerly Band Tamper), a Vencord-style plugin loader for BAND (band.us).

---

## 🔌 Creating a plugin

A plugin is a JavaScript file that exposes a global object (by default `window.MonPlugin`). It is loaded dynamically from a **URL** or a local **`.js` file** through the **Settings → Plugins** page or the quick panel (⚙ button).

### Minimal structure

```js
window.MonPlugin = {
  name: 'mon-plugin',
  version: '1.0.0',
  description: 'My first Unbanded plugin',
  onLoad: function (ctx) {
    ctx.registerCommand('hello', 'Say hello', function (args, info) {
      return info.api.sendText('Salut !');
    });
    ctx.log('Plugin mon-plugin loaded.');
  }
};
```

### The `ctx` context

When loaded, Unbanded calls `onLoad(ctx)` with a `ctx` object containing:

| Property / Method | Description |
|-------------------|-------------|
| `ctx.api` | BAND adapter (details below) |
| `ctx.registerCommand(name, desc, handler)` | Registers a slash command `/name` |
| `ctx.sendText(text)` | Sends a text message to the current conversation |
| `ctx.sendFile(blob, fileName)` | Sends a file (image, GIF…) |
| `ctx.log(...)` | Prints a log to the console (prefixed `[Unbanded]`) |

### The `ctx.api` object (BandAdapter)

| Method | Purpose |
|--------|---------|
| `sendText(text)` | Sends a text message |
| `sendFile(blob, fileName)` | Sends a file |
| `getCurrentUser()` | Logged-in user info |
| `getConversationType()` | Conversation type (DM / group / channel) |
| `getCurrentChannelId()` | Current channel conversation ID |
| `getUserAvatar(userId)` | User avatar URL |
| `getUserByMention(mention)` | Resolves an `@username` mention to a user object |
| `onNewMessage(callback)` | Listens for new messages |

The command handler receives `(args, info)`:
- `args` — array of arguments after the command
- `info.api` — reference to `ctx.api`


### Complete example: `/pat` plugin (pet-pet GIF)

```js
window.PatPlugin = {
  name: 'pat',
  version: '1.0.0',
  description: "Sends an animated pet-pet GIF",
  onLoad: function (ctx) {
    ctx.registerCommand('pat', "Send a pet-pet GIF", async function (args, info) {
      const target = args.length > 0 ? args[0] : null;
      let user;

      if (target) {
        user = info.api.getUserByMention(target);
        if (!user) {
          return info.api.sendText('User not found.');
        }
      } else {
        user = info.api.getCurrentUser();
      }

      const avatarUrl = info.api.getUserAvatar(user.id);
      const gifBlob = await genererPetPet(avatarUrl);
      return info.api.sendFile(gifBlob, 'petpet.gif');
    });
  }
};
```

### Install / test your plugin

1. Host the `.js` file (GitHub raw, your own server, etc.) or keep it local.
2. Open band.us and click the ⚙ button (top-right or bottom-right).
3. Go to **Settings → Plugins** (or use the quick panel).
4. Paste the file URL and click **Add**, or click **Import .js file** for a local file.
5. The plugin is stored in `BTTStore` and **automatically reloaded on next startup**.

> ⚠️ URL import depends on band.us **CSP** (`connect-src`). If the remote domain is blocked, use file-import `.js` instead.

---

## 🎨 Creating a theme

A theme is a JSON file that defines CSS colors (`--btt-*`) applied to band.us, plus optional CSS.

### JSON format

```json
{
  "name": "My theme",
  "author": "me",
  "version": "1.0.0",
  "colors": {
    "accent": "#ff7ac6",
    "accentHover": "#f45fb2",
    "bg": "#2b1d33",
    "surface": "#241729",
    "surface2": "#3a2744",
    "text": "#ffe9f6",
    "muted": "#c7a3bd",
    "border": "#4a3357"
  },
  "css": "/* optional CSS applied with this theme */"
}
```

### Field details

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | No | Name shown in the gallery |
| `author` | string | No | Theme author |
| `version` | string | No | Theme version |
| `colors` | object | No | Colors (all optional, fallback is the default purple) |
| `colors.accent` | string | No | Main color (format `#rgb` or `#rrggbb`) |
| `colors.accentHover` | string | No | Hover color |
| `colors.bg` | string | No | Main background |
| `colors.surface` | string | No | Surface (cards, panels) |
| `colors.surface2` | string | No | Secondary surface |
| `colors.text` | string | No | Main text |
| `colors.muted` | string | No | Muted/secondary text |
| `colors.border` | string | No | Borders |
| `css` | string | No | Extra CSS injected with the theme |

### Install / test your theme

1. Host the `.json` file or keep it local.
2. In band.us, open **Settings → Themes**.
3. Click **Import by URL** (paste the JSON URL) or **Import .json file** (local file).
4. The theme applies instantly (CSS variables `--btt-*` + panel restyle).
5. You can also **export** any theme as JSON from the gallery.

---

## ⚙️ BAND selector adaptation API

BAND does not publish a public API and its DOM changes over time. `src/core/adapter.js` contains the selectors used by Unbanded:

```js
SELECTORS.input,      // message input field
SELECTORS.sendButton, // send button
SELECTORS.avatar,     // user avatars
SELECTORS.currentChannel, // current channel/conversation
// ...
```

If message sending or avatar reading doesn't work:

1. Open DevTools (F12) on band.us.
2. Inspect the input field, send button, and avatars.
3. Update the selectors in `src/core/adapter.js`.
4. Run `node build.js` and reinstall the `unbanded.user.js` userscript.

---

## 🧩 Useful slash command examples

You can register as many commands as you want in `onLoad`:

```js
ctx.registerCommand('dice', 'Roll a die', function (args) {
  const n = Math.floor(Math.random() * 6) + 1;
  return info.api.sendText('🎲 You rolled ' + n);
});

ctx.registerCommand('ping', 'Latency test', function (args) {
  return info.api.sendText('Pong ! 🏓');
});

ctx.registerCommand('user', 'User info', function (args, info) {
  const u = info.api.getCurrentUser();
  return info.api.sendText(`You are ${u.username} (ID: ${u.id})`);
});
```

---

## 🚀 Sharing your creations

- **Plugins**: host the `.js` file on GitHub (raw), a gist, or your own hosting. Share the URL with other Unbanded users.
- **Themes**: publish the `.json` file the same way.
- Open an **issue** or **pull request** on [HYPE115/band_tamper](https://github.com/HYPE115/band_tamper) to propose built-in plugins/themes.

---

## ⚠️ Important notes

- Unbanded is **not** affiliated with BAND / Nas Media. It is an independent customization layer on the web client.
- Plugin code is evaluated (`eval`) in the page context. Only install plugins you trust.
- Data (plugins, themes, CSS, options) is persisted in `localStorage` via `BTTStore`, with an in-memory fallback.
- The final userscript is rebuilt with `node build.js`.

---

*Documentation for Unbanded (Band Tamper) — inspired by Vencord.*

---

> **Translations (AI):** This documentation was cleaned and translated into English by AI. All past translations have been regenerated and you can check the final result in the source files.
