# Band Tamper — "Vencord-like" pour BAND (band.us)

Un chargeur de **plugins** pour le client web/desktop de BAND, avec une interface pour ajouter/activer/désactiver des plugins, et un **plugin par défaut "pet-pet"** (inspiré de [aDu/pet-pet-gif](https://github.com/aDu/pet-pet-gif)) qui génère un GIF et l'envoie avec la commande `/pat`.

## Fichiers du projet

| Fichier | Rôle |
|---------|------|
| `band-tamper.user.js` | Userscript final à installer (généré par `build.js`) |
| `src/core/adapter.js` | Pont avec le client BAND (sélecteurs DOM, envoi de message/fichier) |
| `src/core/plugin-manager.js` | Chargeur de plugins (fetch + éval, activer/désactiver) |
| `src/core/plugin-manager-builtin.js` | Enregistrement des plugins/commandes intégrés |
| `src/core/commands.js` | Commandes slash intégrées (`/help`, `/plugins`, `/btdbg`) |
| `src/core/ui.js` + `ui-panel.js` + `ui-hooks.js` | Bouton "Plugins" + panneau de gestion injecté dans BAND |
| `src/petpet-hand.js` | 10 frames de main d'origine (aDu/pet-pet-gif) en base64 (généré) |
| `src/vendor/gifenc.js` | Encodeur GIF **embarqué** (gifenc 1.0.3, MIT) — aucun CDN ni worker, compatible CSP de band.us |
| `src/petpet-gif.js` | Générateur GIF : algorithme **exact** d'aDu/pet-pet-gif (canvas + gifenc) |
| `src/plugins/pet-pet.js` | Plugin par défaut : commande `/pat` |
| `build.js` | Concatène les sources en `band-tamper.user.js` |
| `tools/embed-hand.js` | Régénère `src/petpet-hand.js` (télécharge img/pet0..pet9.gif du dépôt aDu) |
| `tools/vendor-gifenc.js` | Régénère `src/vendor/gifenc.js` (vendorise gifenc depuis jsdelivr) |
| `test.js` | Test de non-régression (DOM mocké, `node test.js`) |
| `manifest.json` | Méta-du projet |

## Installation

### 1. Installer un gestionnaire de userscripts
- **Tampermonkey** (Chrome, Edge, Firefox) ou
- **Violentmonkey** ou **Greasemonkey**.

### 2. Installer le script
Ouvrez `band-tamper.user.js` (à la racine) et installez-le :
- soit en glissant le fichier dans l'extension Tampermonkey,
- soit en copiant tout le contenu dans un nouveau script Tampermonkey.

Le script s'active sur `*://band.us/*` et `*://*.band.us/*`.

## Utilisation

Une fois sur band.us, un bouton **Tamper** (« Tamper ⬤ » avec un point violet) apparaît dans la **barre du haut**, juste à droite du lien **Feed** (`#header .headerWidgetArea ul.widgetList`). Si le header n'est pas encore monté ou que le DOM change, il bascule en bouton flottant en bas à droite, et il est ré-injecté automatiquement toutes les 2,5 s (navigation SPA).

Cliquez dessus pour ouvrir le panneau qui affiche :
- les plugins chargés avec Activer / Désactiver / Supprimer,
- un champ pour ajouter un plugin par **URL JS** (vous pouvez donc ajouter vos propres plugins sans recompiler).

### Commande par défaut : `/pat`

Tapez dans le champ de discussion :

- **Conversation privée (DM) :** `/pat`  
  Génère un pet-pet GIF de l'interlocuteur et l'envoie.

- **Groupe chat :** `/pat @utilisateur` ou `/pat utilisateur`  
  L'utilisateur est **requis** en groupe. Génère un pet-pet GIF de cette personne et l'envoie.

Exemples :
```
/pat
/pat @Marie
/pat Marie
```

Le plugin reproduit **exactement** l'algorithme du dépôt [aDu/pet-pet-gif](https://github.com/aDu/pet-pet-gif) (`index.js`) côté navigateur : 10 frames de 128×128 (delay 20 ms), l'avatar est écrasé/rebondi frame par frame (`width = 0.8 + j*0.02`, `height = 0.8 - j*0.05`, offsets identiques), et les **10 images de main d'origine** du dépôt (`img/pet0.gif` … `pet9.gif`) sont superposées à chaque frame. Les mains sont embarquées en base64 dans le userscript (`src/petpet-hand.js`, régénérable via `node tools/embed-hand.js`).

L'encodage GIF est fait **entièrement dans le userscript** avec [gifenc](https://github.com/mattdesl/gifenc) (source MIT vendorisée dans `src/vendor/gifenc.js`) : **aucun script CDN, aucun Web Worker** — la CSP stricte de band.us bloquait sinon gif.js/unpkg et laissait la photo statique. La transparence est obtenue par masque magenta rendu transparent (`dispose: 2` entre frames pour éviter les fantômes), et l'encodage (quantification PNN + LZW) se fait sur le thread principal en quelques millisecondes.

Si l'avatar est injoignable (CORS, réseau…), le plugin renvoie une **image statique PNG** avec l'extension correcte et un toast d'avertissement (jamais un `.gif` qui n'en est pas un).

### Autres commandes

| Commande | Effet |
|----------|-------|
| `/help` | Affiche la liste des commandes (toast local, rien n'est envoyé au chat) |
| `/plugins` | Ouvre/ferme le panneau Plugins |
| `/btdbg` | Diagnostics : champ de saisie, bouton d'envoi, type de conversation, commandes chargées |

Chaque commande affiche son résultat dans un **toast** en bas de l'écran (clic pour fermer). Au chargement, un toast « ✓ Band Tamper chargé » confirme que le script tourne. L'interception se fait au niveau global (`document`, phase de capture) : elle survit aux changements de DOM du SPA et fonctionne avec les champs `contenteditable` de BAND.

## 🛠 Dépannage (si ça ne répond pas)

1. **Le script tourne ?** Au chargement de band.us, vous devez voir le toast « ✓ Band Tamper v1.1.0 chargé ». Sans toast → réinstallez `band-tamper.user.js` (v1.1.0+) dans Tampermonkey (Vérifier les mises à jour) puis rechargez la page en dur (Ctrl+Shift+R).
2. **Testez `/help` puis Entrée** : un toast « … exécution de /help » puis la liste des commandes doit apparaître. Sans rien → F12 → onglet Console : cherchez une erreur et le préfixe `[BandTamper]`.
3. **`/btdbg`** affiche ce que voit l'adaptateur (champ de saisie trouvé ? bouton d'envoi ? type de conversation ?). Si « Champ de saisie : INTROUVABLE » ou « Bouton envoyer : introuvable », le DOM a changé → adaptez `SELECTORS` / `getChatInput()` dans `src/core/adapter.js`, puis `node build.js` et réinstallez le script.
4. Seul un texte commençant par `/` suivi d'**Entrée** est intercepté ; les champs de recherche et ceux du panneau Plugins sont ignorés.

## Ajouter ses propres plugins

Un plugin est un fichier JS qui expose un objet :

```js
window.PluginMonPlugin = {
  name: 'mon-plugin',
  version: '1.0.0',
  description: 'Mon premier plugin',
  onLoad: function (ctx) {
    ctx.registerCommand('coucou', 'Dit bonjour', function (args, info) {
      return info.api.sendText('Salut !');
    });
  }
};
```

Puis dans le panneau Plugins de BAND, collez l'URL de ce fichier et cliquez sur **Ajouter**.

Le contexte `ctx` donne accès à :
- `ctx.api` → BandAdapter (sendText, sendFile, getCurrentUser, getConversationType, getCurrentChannelId, getUserAvatar, getUserByMention, onNewMessage)
- `ctx.registerCommand(nom, desc, handler)`
- `ctx.sendText(texte)`, `ctx.sendFile(blob, nomFichier)`
- `ctx.log(...)`

## ⚠️ Adaptation aux sélecteurs de BAND

BAND ne publie pas d'API publique et son DOM évolue. Le fichier `src/core/adapter.js` contient des **sélecteurs** (`SELECTORS.input`, `SELECTORS.sendButton`, `SELECTORS.avatar`, `SELECTORS.currentChannel`, …) qui peuvent ne pas correspondre exactement à votre version du client.

Si l'envoi de message ou la lecture d'avatar ne fonctionne pas :
1. Ouvrez les DevTools (F12) sur band.us,
2. Inspectez le champ de saisie, le bouton d'envoi, les avatars,
3. Mettez à jour les sélecteurs dans `src/core/adapter.js`,
4. Relancez `node build.js` et réinstallez le userscript.

## Mode démo

Si vous ouvrez le script hors de band.us, un bandeau "mode démo" s'affiche et vous permet de tester le panneau de plugins et la commande `/pat` sans envoyer de vrais messages.

## Build (regénérer le userscript)

```bash
node build.js
```

Nécessite Node.js. Le résultat est `band-tamper.user.js`.

## Test (non-régression)

```bash
node build.js   # régénère band-tamper.user.js
node test.js    # exécute le userscript comme dans un navigateur et simule /help, /xyz, /pat
```

Le test exécute le userscript **en contexte navigateur** (scope local, sans module CommonJS — c'est ce qui a fait échouer la v1.0.0) puis simule des frappes Entrée sur le hook clavier global. Il vérifie 26 contrôles : exposition des classes/helpers (`BandAdapter`, `PluginManager`, `BandUI`, `registerBuiltInCommands`, `PluginPetPet`, `__BTT_PetGif`, `__BTT_toast`), enregistrement du hook `keydown` global, injection de la UI, exécution réelle de `/help` (toast avec la liste), détection d'une commande inconnue, succès de `/pat` (toast « GIF pet-pet envoyé » ou fallback statique annoncé), génération de l'image par le blob pet-pet, embarquement des 10 frames de main aDu (base64), de l'algorithme 10 frames / 10 mains, de l'encodeur gifenc vendorisé et de l'absence de dépendance CDN gif.js, et insertion du bouton **Tamper** juste après le lien Feed du header BAND simulé.

## Licence

MIT. Le plugin pet-pet s'inspire de [aDu/pet-pet-gif](https://github.com/aDu/pet-pet-gif) (MIT) ; l'encodeur GIF embarqué est [gifenc](https://github.com/mattdesl/gifenc) (MIT).
