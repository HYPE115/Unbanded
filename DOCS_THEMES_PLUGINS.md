# 📚 Documentation — Créer des thèmes et des plugins pour Unbanded

Ce document explique comment écrire vos propres **plugins** (commandes `/slash`, logique JS) et **thèmes** (apparence visuelle) pour Unbanded (anciennement Band Tamper), le Vencord de BAND (band.us).

---

## 🔌 Créer un plugin

Un plugin est un fichier JavaScript qui expose un objet global (par défaut `window.MonPlugin`). Il est chargé dynamiquement depuis une **URL** ou un **fichier `.js` local** via la page **Paramètres → Plugins** ou le panneau rapide (bouton ⚙).

### Structure minimale

```js
window.MonPlugin = {
  name: 'mon-plugin',
  version: '1.0.0',
  description: 'Mon premier plugin Unbanded',
  onLoad: function (ctx) {
    ctx.registerCommand('hello', 'Dis bonjour', function (args, info) {
      return info.api.sendText('Salut !');
    });
    ctx.log('Plugin mon-plugin chargé.');
  }
};
```

### Le contexte `ctx`

Lors du chargement, Unbanded appelle `onLoad(ctx)` avec un objet `ctx` contenant :

| Propriété / Méthode | Description |
|---------------------|-------------|
| `ctx.api` | Adaptateur BAND (voir détail ci-dessous) |
| `ctx.registerCommand(name, desc, handler)` | Enregistre une commande slash `/name` |
| `ctx.sendText(text)` | Envoie un message texte dans la conversation courante |
| `ctx.sendFile(blob, fileName)` | Envoie un fichier (image, GIF…) |
| `ctx.log(...)` | Affiche un log dans la console (préfixé `[Unbanded]`) |

### L'objet `ctx.api` (BandAdapter)

| Méthode | Rôle |
|---------|------|
| `sendText(text)` | Envoie un message texte |
| `sendFile(blob, fileName)` | Envoie un fichier |
| `getCurrentUser()` | Infos de l'utilisateur connecté |
| `getConversationType()` | Type de conversation (DM / groupe / salon) |
| `getCurrentChannelId()` | ID du salon/conv. actuel |
| `getUserAvatar(userId)` | URL de l'avatar d'un utilisateur |
| `getUserByMention(mention)` | Résout une mention `@pseudo` vers un objet utilisateur |
| `onNewMessage(callback)` | Écoute l'arrivée de nouveaux messages |

Le handler de commande reçoit `(args, info)` :
- `args` : tableau des arguments après la commande
- `info.api` : référence à `ctx.api`


### Exemple complet : plugin `/pat` (pet-pet GIF)

```js
window.PatPlugin = {
  name: 'pat',
  version: '1.0.0',
  description: "Envoie un GIF pet-pet animé",
  onLoad: function (ctx) {
    ctx.registerCommand('pat', "Envoie un pet-pet GIF", async function (args, info) {
      const target = args.length > 0 ? args[0] : null;
      let user;

      if (target) {
        user = info.api.getUserByMention(target);
        if (!user) {
          return info.api.sendText('Utilisateur introuvable.');
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

### Installer / tester votre plugin

1. Hébergez le fichier `.js` (GitHub raw, votre propre serveur, etc.) ou gardez-le en local.
2. Ouvrez band.us, cliquez sur le bouton ⚙ (en haut ou en bas à droite).
3. Allez dans **Paramètres → Plugins** (ou utilisez le panneau rapide).
4. Collez l'URL du fichier et cliquez sur **Add**, ou cliquez sur **Import .js file** pour un fichier local.
5. Le plugin est mémorisé dans `BTTStore` et **rechargé automatiquement au prochain démarrage**.

> ⚠️ L'import par URL dépend de la **CSP** de band.us (`connect-src`). Si le domaine distant est bloqué, utilisez l'import par fichier `.js`.

---

## 🎨 Créer un thème

Un thème est un fichier JSON qui définit des couleurs CSS (`--btt-*`) appliquées à band.us, plus du CSS optionnel.

### Format JSON

```json
{
  "name": "Mon thème",
  "author": "moi",
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
  "css": "/* CSS optionnel appliqué avec ce thème */"
}
```

### Détails des champs

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `name` | string | Non | Nom affiché dans la galerie |
| `author` | string | Non | Auteur du thème |
| `version` | string | Non | Version du thème |
| `colors` | object | Non | Couleurs (toutes optionnelles, fallback sur le violet par défaut) |
| `colors.accent` | string | Non | Couleur principale (format `#rgb` ou `#rrggbb`) |
| `colors.accentHover` | string | Non | Couleur au survol |
| `colors.bg` | string | Non | Fond principal |
| `colors.surface` | string | Non | Surface (cartes, panneaux) |
| `colors.surface2` | string | Non | Surface secondaire |
| `colors.text` | string | Non | Texte principal |
| `colors.muted` | string | Non | Texte atténué / secondaire |
| `colors.border` | string | Non | Bordures |
| `css` | string | Non | CSS supplémentaire injecté avec le thème |

### Installer / tester votre thème

1. Hébergez le fichier `.json` ou gardez-le en local.
2. Dans band.us, ouvrez **Paramètres → Thèmes**.
3. Cliquez sur **Import by URL** (collez l'URL du JSON) ou **Import .json file** (fichier local).
4. Le thème s'applique instantanément (variables CSS `--btt-*` + restyle du panneau).
5. Vous pouvez aussi **exporter** n'importe quel thème en JSON depuis la galerie.

---

## ⚙️ API d'adaptation aux sélecteurs BAND

BAND ne publie pas d'API publique et son DOM évolue. Le fichier `src/core/adapter.js` contient les sélecteurs utilisés par Unbanded :

```js
SELECTORS.input,      // champ de saisie du message
SELECTORS.sendButton, // bouton d'envoi
SELECTORS.avatar,     // avatars utilisateur
SELECTORS.currentChannel, // salon/conv. actuel
// ...
```

Si l'envoi de messages ou la lecture d'avatars ne fonctionne pas :

1. Ouvrez les DevTools (F12) sur band.us.
2. Inspectez le champ de saisie, le bouton d'envoi, les avatars.
3. Mettez à jour les sélecteurs dans `src/core/adapter.js`.
4. Lancez `node build.js` et réinstallez le userscript `unbanded.user.js`.

---

## 🧩 Exemples de commandes slash utiles

Vous pouvez enregistrer autant de commandes que vous voulez dans `onLoad` :

```js
ctx.registerCommand('dice', 'Lance un dé', function (args) {
  const n = Math.floor(Math.random() * 6) + 1;
  return info.api.sendText('🎲 Tu as fait ' + n);
});

ctx.registerCommand('ping', 'Test de latence', function (args) {
  return info.api.sendText('Pong ! 🏓');
});

ctx.registerCommand('user', 'Infos utilisateur', function (args, info) {
  const u = info.api.getCurrentUser();
  return info.api.sendText(`Tu es ${u.username} (ID: ${u.id})`);
});
```

---

## 🚀 Partager vos créations

- **Plugins** : publiez le fichier `.js` sur GitHub (raw), un gist, ou votre propre hébergement. Partagez l'URL avec d'autres utilisateurs Unbanded.
- **Thèmes** : publiez le fichier `.json` de la même manière.
- Ouvrez une **issue** ou une **pull request** sur [HYPE115/band_tamper](https://github.com/HYPE115/band_tamper) pour proposer vos plugins/thèmes built-in.

---

## ⚠️ Notes importantes

- Unbanded n'est **pas** affilié à BAND / Nas Media. C'est une couche de personnalisation indépendante sur le client web.
- Le code des plugins est évalué (`eval`) dans le contexte de la page. N'installez que des plugins dont vous faites confiance à l'auteur.
- Les données (plugins, thèmes, CSS, options) sont persistées dans `localStorage` via `BTTStore`, avec un fallback en mémoire.
- La reconstruction du userscript final se fait avec `node build.js`.

---

*Documentation pour Unbanded (Band Tamper) — inspiré par Vencord.*
