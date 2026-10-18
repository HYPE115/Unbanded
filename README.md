<p align="center">
  <img src="logo.png" alt="Unbanded" width="128">
</p>

# Unbanded — le Vencord de BAND (band.us)

> Un client moddé pour BAND, inspiré de [Vencord](https://github.com/Vendicated/Vencord) (le mod Discord : plugins + thèmes + réglages par-dessus le client officiel) : **plugins, thèmes, CSS personnalisé et commandes `/slash`**, directement dans band.us via un userscript.
> Anciennement **Band Tamper** — renommé **Unbanded** en v1.6.0 (données et plugins persistés compatibles).

Unbanded ne modifie pas BAND lui-même : c'est une **couche de customisation** par-dessus le client web — comme [Vencord](https://github.com/Vendicated/Vencord) ajoute plugins + thèmes + réglages par-dessus [Discord](https://discord.com), Unbanded ajoute **plugins + thèmes + CSS + commandes `/slash`** par-dessus BAND. Voir [les releases](https://github.com/HYPE115/band_tamper/releases) pour l'historique des versions, et [les issues](https://github.com/HYPE115/band_tamper/issues) pour signaler un bug.

## Ce que ça apporte (façon Vencord)

- **🔌 Plugins** — chargeur de plugins JS (par URL ou fichier `.js`), activation/désactivation, persistance et rechargement auto au démarrage. API documentée pour écrire les tiens (voir [Ajouter ses propres plugins](#ajouter-ses-propres-plugins)).
- **🎉 Plugins intégrés fun & utiles** — 30+ commandes immédiates : GIF réactions (`/hug`, `/cuddle`, `/slap`, `/kiss`…), mini-jeux locaux (`/8ball`, `/roll`, `/coin`, `/choose`), outils (`/remind`, `/shrug`, `/count`, `/copy`, `/time`) et bien sûr `/pat` (pet-pet GIF authentique).
- **🎨 Thèmes** — galerie de 10 thèmes, import/export JSON, application instantanée (variables CSS `--btt-*`).
- **💅 CSS personnalisé** — éditeur intégré, appliqué en direct à tout band.us.
- **⌨️ Commandes `/slash`** — exécution via Entrée, autocomplétion façon Discord (`/` + début → popup, `↑/↓` + `Tab`/`Entrée`), historique `↑/↓`, alias (`/h` → `/help`…), aide détaillée (`/help <cmd>`).
- **⚙️ Page Paramètres** — onglets Général, Plugins, Thèmes, CSS, À propos. Bouton ⚙ docké dans le header band.us, raccourcis `Ctrl+,` / `Échap`, API console `window.Unbanded`.

## Fichiers du projet

| Fichier | Rôle |
|---------|------|
| `unbanded.user.js` | Userscript final à installer (généré par `build.js`) |
| `src/core/adapter.js` | Pont avec le client BAND (sélecteurs DOM, envoi de message/fichier) |
| `src/core/storage.js` | `BTTStore` : persistance locale (localStorage, repli mémoire) — plugins, thèmes, CSS, options |
| `src/core/plugin-manager.js` | Chargeur de plugins (fetch + éval, code brut pour import fichier, activer/désactiver, persistance) |
| `src/core/plugin-manager-builtin.js` | Enregistrement des plugins/commandes intégrés |
| `src/core/themes.js` | `BTTThemes` : 10 thèmes d'app intégrés (variables CSS), import/export de thèmes JSON |
| `src/core/styles.js` | `BTTStyles` : CSS personnalisé appliqué à band.us et persisté |
| `src/core/commands.js` | Commandes slash intégrées (`/help`, `/plugins`, `/settings`, `/debug`, `/version`, `/clear` + alias) |
| `src/core/ui.js` + `ui-panel.js` + `ui-hooks.js` + `ui-autocomplete.js` | Bouton ⚙ dans le header BAND, page Paramètres, interceptions clavier (Entrée, autocomplétion façon Discord, historique ↑/↓, raccourcis Ctrl+, / Échap) |
| `src/core/ui-settings.js` | Page Paramètres complète (Général, Plugins, Thèmes, CSS, À propos) |
| `src/petpet-hand.js` | 10 frames de main d'origine (aDu/pet-pet-gif) en base64 — assets du plugin d'exemple (généré) |
| `src/vendor/gifenc.js` | Encodeur GIF **embarqué** (gifenc 1.0.3, MIT) — aucun CDN ni worker, compatible CSP de band.us |
| `src/petpet-gif.js` | Générateur GIF : algorithme **exact** d'aDu/pet-pet-gif (canvas + gifenc) — utilisé par le plugin d'exemple |
| `src/plugins/pet-pet.js` | **Plugin d'exemple** : commande `/pat` (montre comment utiliser `sendFile` + `getUserAvatar`) |
| `src/plugins/reactions.js` | **Plugin builtin** : 18 GIF réactions fun (`/hug`, `/cuddle`, `/slap`…) via waifu.pics + repli texte |
| `src/plugins/games.js` | **Plugin builtin** : mini-jeux locaux (`/8ball`, `/roll`, `/coin`, `/choose`, `/rand`) |
| `src/plugins/tools.js` | **Plugin builtin** : outils (`/remind`, `/shrug`, `/tableflip`, `/lenny`, `/count`, `/copy`, `/time`) |
| `build.js` | Concatène les sources en `unbanded.user.js` |
| `tools/embed-hand.js` | Régénère `src/petpet-hand.js` (télécharge img/pet0..pet9.gif du dépôt aDu) |
| `tools/vendor-gifenc.js` | Régénère `src/vendor/gifenc.js` (vendorise gifenc depuis jsdelivr) |
| `manifest.json` | Méta-du projet |

## Installation (how to use)

### Prérequis : un gestionnaire de userscripts

Comme [Vencord](https://github.com/Vendicated/Vencord/blob/main/README.md#install) demande l'app Discord, Unbanded demande une extension userscript :

- **[Tampermonkey](https://www.tampermonkey.net/)** (Chrome, Edge, Firefox — recommandé, auto-update supporté), ou
- [Violentmonkey](https://violentmonkey.github.io/) ou [Greasemonkey](https://www.greasespot.net/).

### Installer le script (avec mises à jour auto)

> Le dépôt doit être **public** pour que l'auto-update fonctionne : Tampermonkey télécharge `@updateURL` sans authentification (un dépôt privé renvoie 404).

**Méthode recommandée — installation par URL (auto-update activé) :**
1. Téléchargez la dernière version depuis [les releases](https://github.com/HYPE115/band_tamper/releases) (ou la branche [`main`](https://github.com/HYPE115/band_tamper) pour la toute dernière version de dev).
1. Dans Tampermonkey → onglet **Utilitaires** → champ **Installer depuis une URL** → collez : `https://raw.githubusercontent.com/HYPE115/band_tamper/main/unbanded.user.js` → **Installer**.
3. Tampermonkey vérifie `@updateURL` automatiquement (défaut : toutes les 24 h, réglable dans **Paramètres → Intervalle de vérification des mises à jour**). Chaque `node build.js` bumpé en version + `git push` déclenche la MAJ chez les utilisateurs.

**Méthode manuelle (sans auto-update) :**
- Glissez `unbanded.user.js` dans Tampermonkey, ou copiez son contenu dans un nouveau script. Les MAJ devront être réinstallées à la main.

Le script s'active sur `*://band.us/*` et `*://*.band.us/*`.

## Utilisation (façon Vencord)

Comme avec [Vencord](https://github.com/Vendicated/Vencord) sur Discord, tout passe par une **page Paramètres intégrée au client** + des **commandes slash** :

Une fois sur band.us, un bouton **⚙** apparaît dans la **barre du haut du header** (à côté de la recherche). Cliquer dessus ouvre les **Paramètres Unbanded** — l'équivalent des réglages Vencord : onglets **Général** (options), **Plugins** (activer/désactiver, ajouter par URL ou fichier `.js`), **Thèmes** (galerie + import JSON par URL/fichier), **CSS personnalisé** (éditeur live) et **À propos** (version, stats, crédits). Raccourcis : `Ctrl+,` pour ouvrir/fermer, `Échap` ou clic sur le fond pour fermer, `/settings` dans n'importe quel champ. droite (au-dessus du ⚙), et il est ré-injecté automatiquement toutes les 2,5 s (navigation SPA).

Un **bouton flottant ⚙** (cercle violet, toujours visible en **bas à droite** de la page) permet de **basculer la GUI** à tout moment : un clic ouvre/ferme le panneau Unbanded, et il ferme la page Paramètres si elle est ouverte. L'icône passe de ⚙ à ✕ quand le panneau est affiché, et sa couleur suit le **thème actif** (variable CSS `--btt-accent`).

Cliquez dessus pour ouvrir le panneau qui affiche :
- les plugins chargés avec Activer / Désactiver / Supprimer,
- un champ pour ajouter un plugin par **URL JS** (vous pouvez donc ajouter vos propres plugins sans recompiler),
- un bouton **⚙** qui ouvre la **page Paramètres** (voir ci-dessous).

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
| `/help` | Affiche la liste des commandes (`/help <commande>` pour le détail, toast local, rien n'est envoyé au chat) |
| `/plugins` | Ouvre la page Paramètres sur l'onglet Plugins |
| `/settings` | Ouvre la **page Paramètres** (thèmes, CSS personnalisé, plugins) |
| `/debug` | Diagnostics (URL, page chat, champ de saisie, bouton d'envoi, plugins/commandes) + **copie auto dans le presse-papiers** |
| `/version` | Affiche la version Unbanded |
| `/clear` | Efface les toasts Unbanded affichés |
| `/btdbg` | Alias historique de `/debug` |

### Plugins intégrés (fun & utiles)

En plus de `/pat` (pet-pet), Unbanded embarque **3 plugins builtin** — tous visibles/désactivables via l'onglet Plugins des Paramètres :

**🎉 `reactions`** — 18 GIF aléatoires (API [waifu.pics](https://waifu.pics), gratuite sans clé) : `/hug` `/cuddle` `/slap` `/tickle` `/kiss` `/poke` `/bonk` `/dance` `/wave` `/blush` `/smile` `/smug` `/cry` `/nom` `/yeet` `/wink` `/laugh` `/happy`. Même syntaxe que `/pat` : user requis en groupe, interlocuteur automatique en DM. **Repli** si le réseau/CSP bloque : un message texte avec emoji est envoyé à la place.

**🎲 `games`** — 100 % locaux, zéro réseau : `/8ball <question>` (boule magique), `/roll [NdM±K]` (`/roll 2d20+5`, défaut 1d6), `/coin` (pile ou face), `/choose a | b | c`, `/rand min max`. Alias : `/8b` `/dice` `/d` `/flip` `/pick` `/rnd`.

**🛠 `tools`** — utiles au quotidien : `/remind <30|30m|2h> <texte>` (rappel par toast + clignotement du titre si l'onglet est masqué, cap 24 h), `/shrug` `/tableflip` `/unflip` `/lenny` (emotes texte façon Discord), `/count <texte>` (mots/caractères), `/copy <texte>` (presse-papiers), `/time`. Alias : `/rmd` `/wc`.

Quand tu tapes `/` + début de commande, un **popup façon Discord** suggère les commandes (↑/↓ pour naviguer, Tab ou Entrée pour compléter, Échap pour fermer). **↑/↓** sur un champ commençant par `/` rappelle l'historique de tes commandes. **Ctrl+,** ouvre/ferme les Paramètres, **Échap** ferme la modale.

Chaque commande affiche son résultat dans un **toast** en bas de l'écran (clic pour fermer). Au chargement, un toast « ✓ Unbanded v1.6.0 chargé » confirme que le script tourne. L'interception se fait au niveau global (`document`, phase de capture) : elle survit aux changements de DOM du SPA et fonctionne avec les champs `contenteditable` de BAND.

## 🛠 Dépannage (si ça ne répond pas)

1. **Le script tourne ?** Au chargement de band.us, vous devez voir le toast « ✓ Unbanded v1.6.0 chargé ». Sans toast → réinstallez `unbanded.user.js` (v1.6.0+) dans Tampermonkey (Vérifier les mises à jour) puis rechargez la page en dur (Ctrl+Shift+R). Un cercle **⚙ violet en bas à droite** confirme aussi que le script tourne.
2. **Testez `/help` puis Entrée** : un toast « … exécution de /help » puis la liste des commandes doit apparaître. Sans rien → F12 → onglet Console : cherchez une erreur et le préfixe `[Unbanded]`.
3. **`/debug`** affiche ce que voit l'adaptateur (champ de saisie trouvé ? bouton d'envoi ? type de conversation ?). Si « Champ de saisie : INTROUVABLE » ou « Bouton envoyer : introuvable », le DOM a changé → adaptez `SELECTORS` / `getChatInput()` dans `src/core/adapter.js`, puis `node build.js` et réinstallez le script.
4. Seul un texte commençant par `/` suivi d'**Entrée** est intercepté ; les champs de recherche et ceux du panneau Plugins sont ignorés.

## ⚙ Page Paramètres (v1.5.0)

Ouvrez-la avec **`/settings`** ou le bouton **⚙** du panneau Tamper. Elle contient 5 onglets :

- **Général** — toast de démarrage (on/off), durée des toasts (3/5/8/12 s), **export/import de la configuration complète en JSON** (plugins + thèmes + CSS + options, idéal pour changer de navigateur) et bouton « Tout réinitialiser ».
- **Plugins** — la liste des plugins avec badges *actif/inactif* et *source* (Intégré / URL / Fichier), plus l'ajout de plugins **par URL** ou **par fichier `.js` importé** (le code est mémorisé dans `BTTStore` et **rechargé automatiquement au démarrage** suivant).
- **Thèmes** — galerie de **10 thèmes intégrés** (Violet par défaut, Minuit, Dracula, Nord, Catppuccin Mocha, Monokai, Coucher de soleil, Océan, Forêt, Clair) avec aperçu de couleurs, application en un clic (variables CSS `--btt-*` sur la page + restyle du panneau), et **import de thèmes par URL ou fichier `.json`** + export JSON de n'importe quel thème.
- **CSS personnalisé** — éditeur de CSS appliqué **en direct** à band.us (élément `<style id="bt-custom-css">`), avec aperçu non persistant, enregistrement et réinitialisation. Le CSS survit aux rechargements.
- **À propos** — version, statistiques (plugins/commandes/thèmes), crédits et licence.

### Format des thèmes (import JSON)

```json
{
  "name": "Mon thème",
  "author": "moi",
  "version": "1.0.0",
  "colors": {
    "accent": "#ff7ac6", "accentHover": "#f45fb2",
    "bg": "#2b1d33", "surface": "#241729", "surface2": "#3a2744",
    "text": "#ffe9f6", "muted": "#c7a3bd", "border": "#4a3357"
  },
  "css": "/* optionnel : CSS appliqué à band.us avec ce thème */"
}
```

Toutes les couleurs sont **optionnelles** (les manquantes prennent le défaut violet) ; format `#rgb` ou `#rrggbb`. Le champ `css` permet de pousser le thème plus loin (overlays band.us). Note : l'import par URL dépend de la CSP de band.us (`connect-src`) — si le domaine distant est bloqué, utilisez l'import par fichier.

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

Puis, dans la page **Paramètres → Plugins** (ou le panneau rapide), collez l'URL de ce fichier et cliquez sur **Ajouter** — ou cliquez sur **Importer un fichier .js** pour charger un plugin depuis un fichier local (le code est mémorisé et rechargé au prochain démarrage).

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

Nécessite Node.js. Le résultat est `unbanded.user.js`.

## Licence

MIT. Le plugin pet-pet s'inspire de [aDu/pet-pet-gif](https://github.com/aDu/pet-pet-gif) (MIT) ; l'encodeur GIF embarqué est [gifenc](https://github.com/mattdesl/gifenc) (MIT).
