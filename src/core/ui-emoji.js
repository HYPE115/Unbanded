/**
 * ui-emoji.js — Sélecteur d'emojis : bouton 😀 près du champ de saisie +
 * panneau avec recherche (EN/FR), onglets par catégorie, emojis récents
 * persistés (BTTStore). 100 % local : jeu de données embarqué, aucune
 * requête réseau (cohérent avec la politique « no external network »).
 */
(function () {
  'use strict';

  // -- Jeu de données -------------------------------------------------------
  // Format : [ emoji, 'nom anglais + mots-clés (dont FR pour la recherche)' ]
  var CATS = [
    { id: 'smileys', icon: '😀', items: [
      ['😀', 'grin grinning smile happy bien'],
      ['😃', 'big smile happy grin joie'],
      ['😄', 'smile eyes grin happy'],
      ['😁', 'beaming smile teeth'],
      ['😆', 'laughing squint joy lol'],
      ['😅', 'sweat smile relief'],
      ['😂', 'tears joy laughing lol rire'],
      ['🤣', 'rofl rolling laugh rire'],
      ['😉', 'wink eye clin'],
      ['😊', 'blush smile happy sourire'],
      ['😇', 'angel innocent'],
      ['🥰', 'smiling hearts love amour'],
      ['😍', 'heart eyes love amour adore'],
      ['🤩', 'star struck amazed wow'],
      ['😘', 'kiss love bisou'],
      ['😗', 'kiss'],
      ['😙', 'kiss smile'],
      ['😚', 'kiss closed eyes'],
      ['😋', 'yummy tongue food bon'],
      ['😛', 'tongue playful'],
      ['😜', 'tongue winking playful'],
      ['🤪', 'zany goofy crazy fou'],
      ['😝', 'tongue squint fun'],
      ['🤑', 'money lips rich'],
      ['🤓', 'nerd smart geek'],
      ['😎', 'cool sunglasses'],
      ['🥳', 'party celebrate fete birthday'],
      ['😏', 'smirk smug'],
      ['😒', 'unamused annoyed bof'],
      ['😞', 'disappointed sad triste'],
      ['😔', 'pensive sad pensif'],
      ['😕', 'confused perplexed perdu'],
      ['😟', 'worried anxious inquiet'],
      ['🙁', 'slightly frown sad'],
      ['☹️', 'frowning sad triste'],
      ['😣', 'persevering frustrated'],
      ['😖', 'confounded frustrated'],
      ['😫', 'tired exhausted fatigue'],
      ['😩', 'weary fed up'],
      ['🥺', 'pleading eyes please implorer'],
      ['😢', 'cry sad tears triste'],
      ['😭', 'sobbing crying pleurer'],
      ['😤', 'triumph steam angry face'],
      ['😠', 'angry mad colere'],
      ['😡', 'rage furious angry'],
      ['🤬', 'swearing cursing'],
      ['🤯', 'mind blown exploded'],
      ['😳', 'flushed surprise gène'],
      ['🥵', 'hot face warm chaud'],
      ['🥶', 'cold face freeze froid'],
      ['😱', 'scream shock horror effraye'],
      ['😨', 'fearful scared peur'],
      ['😰', 'nervous sweat anxious'],
      ['🤗', 'hugging hug calin'],
      ['🤔', 'thinking hmm reflexion'],
      ['🤭', 'oops hand mouth secret'],
      ['🤫', 'shh silence secret'],
      ['🤥', 'liar nose pinocchio'],
      ['😶', 'speechless silent muet'],
      ['😐', 'neutral face'],
      ['😑', 'expressionless blank'],
      ['😬', 'grimace awkward gene'],
      ['🙄', 'eye roll snort'],
      ['😯', 'hushed surprise'],
      ['😴', 'sleeping sleep dormir'],
      ['🤤', 'drool sleep salive'],
      ['😪', 'sleepy tired'],
      ['😵', 'dizzy crossed vertige'],
      ['🤐', 'zipper mouth secret'],
      ['🥴', 'woozy dizzy drunk ivre'],
      ['🤢', 'nauseous sick degout'],
      ['🤮', 'vomiting sick vomir'],
      ['🤧', 'sneeze sick rhume'],
      ['😷', 'mask sick medical maladie'],
      ['🤒', 'fever sick temperature'],
      ['🤕', 'injured bandage hurt mal'],
      ['🤠', 'cowboy hat'],
      ['😈', 'devil mischievous'],
      ['👻', 'ghost halloween fantome'],
      ['💀', 'skull dead mort'],
      ['💩', 'poop pile poo caca'],
      ['🤡', 'clown funny'],
      ['👽', 'alien space extraterrestre'],
      ['🤖', 'robot bot'],
      ['🎃', 'pumpkin halloween citrouille'],
      ['😺', 'smile cat chat'],
      ['😸', 'grin cat chat'],
      ['😻', 'love cat heart chat'],
      ['😼', 'smirk cat chat'],
      ['😽', 'kiss cat chat'],
      ['🙀', 'shocked cat chat'],
      ['😿', 'sad cat chat triste'],
      ['😾', 'angry cat chat colere']
    ]},
    { id: 'people', icon: '✋', items: [
      ['👍', 'thumbs up like approve bien'],
      ['👎', 'thumbs down dislike non'],
      ['👏', 'clap bravo applause'],
      ['🙌', 'raised hands celebrate hurray'],
      ['👋', 'wave hello salut coucou'],
      ['🤙', 'call me shaka'],
      ['👌', 'ok perfect okay'],
      ['✌️', 'peace victory victoire'],
      ['🤞', 'crossed fingers luck doigts'],
      ['🤟', 'love you hand'],
      ['🤘', 'rock horns'],
      ['👈', 'point left gauche'],
      ['👉', 'point right droite'],
      ['👆', 'point up haut'],
      ['👇', 'point down bas'],
      ['☝️', 'index up'],
      ['✋', 'high five stop hand'],
      ['🤚', 'raised hand'],
      ['🖐️', 'open hand five'],
      ['🖖', 'vulcan salute'],
      ['✊', 'fist power'],
      ['👊', 'punch fist'],
      ['🤛', 'left fist'],
      ['🤜', 'right fist'],
      ['💪', 'flex strong muscle force'],
      ['🖕', 'middle finger'],
      ['✍️', 'writing pen signature ecrire'],
      ['💅', 'nail polish manicure'],
      ['🤳', 'selfie'],
      ['🤝', 'handshake deal poignee'],
      ['🙏', 'please thanks prayer merci'],
      ['🫶', 'heart hands love amour'],
      ['🫂', 'hug embrace calin'],
      ['🙋', 'raise hand question'],
      ['🙅', 'no gesture refuse'],
      ['🙆', 'ok gesture'],
      ['🙇', 'bow respect'],
      ['🤦', 'facepalm oh non'],
      ['🤷', 'shrug dont know pas savoir'],
      ['🙈', 'see no evil monkey'],
      ['🙉', 'hear no evil monkey'],
      ['🙊', 'speak no evil monkey'],
      ['👮', 'police officer'],
      ['🕵️', 'detective spy'],
      ['💂', 'guard'],
      ['👷', 'construction worker'],
      ['🤴', 'prince'],
      ['👸', 'princess'],
      ['🧙', 'wizard mage'],
      ['🧚', 'fairy'],
      ['🧛', 'vampire'],
      ['🧜', 'mermaid'],
      ['🧝', 'elf'],
      ['🦸', 'superhero'],
      ['🦹', 'supervillain'],
      ['🎅', 'santa claus noel pere'],
      ['🤶', 'mrs claus noel'],
      ['👼', 'baby angel'],
      ['🤰', 'pregnant'],
      ['🤱', 'breastfeeding'],
      ['🧑', 'person'],
      ['👦', 'boy garcon'],
      ['👧', 'girl fille'],
      ['👨', 'man homme'],
      ['👩', 'woman femme'],
      ['👴', 'old man grandpa grand-pere'],
      ['👵', 'old woman grandma grand-mere'],
      ['🧓', 'elder'],
      ['🧔', 'beard'],
      ['👱', 'blonde'],
      ['🧕', 'hijab headscarf'],
      ['👶', 'baby bebe']
    ]},
    { id: 'nature', icon: '🐶', items: [
      ['🐶', 'dog puppy chien'],
      ['🐱', 'cat kitten chat'],
      ['🐭', 'mouse souris'],
      ['🐹', 'hamster'],
      ['🐰', 'rabbit bunny lapin'],
      ['🦊', 'fox renard'],
      ['🐻', 'bear ours'],
      ['🐼', 'panda'],
      ['🐨', 'koala'],
      ['🐯', 'tiger tigre'],
      ['🦁', 'lion'],
      ['🐮', 'cow vache'],
      ['🐷', 'pig cochon'],
      ['🐽', 'pig nose'],
      ['🐸', 'frog grenouille'],
      ['🐵', 'monkey singe'],
      ['🐔', 'chicken poulet'],
      ['🐣', 'hatching chick'],
      ['🐤', 'baby chick'],
      ['🐥', 'front chick'],
      ['🐦', 'bird oiseau'],
      ['🦅', 'eagle aigle'],
      ['🦉', 'owl hibou'],
      ['🦇', 'bat chauve-souris'],
      ['🐺', 'wolf loup'],
      ['🐝', 'bee abeille'],
      ['🦋', 'butterfly papillon'],
      ['🐌', 'snail escargot'],
      ['🐞', 'ladybug coccinelle'],
      ['🐢', 'tortoise tortue'],
      ['🐍', 'snake serpent'],
      ['🐙', 'octopus pieuvre'],
      ['🦐', 'shrimp crevette'],
      ['🦀', 'crab crabe'],
      ['🐬', 'dolphin dauphin'],
      ['🐳', 'whale baleine'],
      ['🐟', 'fish poisson'],
      ['🦈', 'shark requin'],
      ['🐠', 'tropical fish'],
      ['🌸', 'cherry blossom fleur'],
      ['🌷', 'tulip tulipe'],
      ['🌹', 'rose fleur'],
      ['🌻', 'sunflower tournesol'],
      ['🍀', 'shamrock trèfle luck'],
      ['🌵', 'cactus'],
      ['🍄', 'mushroom champignon'],
      ['🌴', 'palm tree palmier'],
      ['🌲', 'evergreen tree sapin'],
      ['🌳', 'tree arbre']
    ]},
    { id: 'food', icon: '🍎', items: [
      ['🍎', 'red apple pomme'],
      ['🍏', 'green apple pomme'],
      ['🍐', 'pear poire'],
      ['🍊', 'orange mandarine'],
      ['🍋', 'lemon citron'],
      ['🍌', 'banana banane'],
      ['🍉', 'watermelon pastèque'],
      ['🍇', 'grapes raisin'],
      ['🍓', 'strawberry fraise'],
      ['🍒', 'cherries cerise'],
      ['🍑', 'peach pêche'],
      ['🥭', 'mango mangue'],
      ['🍍', 'pineapple ananas'],
      ['🥥', 'coconut coco'],
      ['🥝', 'kiwi'],
      ['🍅', 'tomato tomate'],
      ['🥑', 'avocado avocat'],
      ['🥦', 'broccoli brocoli'],
      ['🥕', 'carrot carotte'],
      ['🌽', 'corn maïs'],
      ['🌶️', 'hot pepper piment'],
      ['🥒', 'cucumber concombre'],
      ['🥯', 'bagel'],
      ['🍞', 'bread pain'],
      ['🧀', 'cheese fromage'],
      ['🥚', 'egg œuf'],
      ['🍳', 'cooked eggs breakfast petit-déjeuner'],
      ['🥞', 'pancakes'],
      ['🧇', 'waffle'],
      ['🍦', 'ice cream glace'],
      ['🍨', 'sundae'],
      ['🍰', 'cake gâteau'],
      ['🎂', 'birthday cake anniversaire'],
      ['🍪', 'cookie biscuit'],
      ['🍫', 'chocolate chocolat'],
      ['🍬', 'candy bonbon'],
      ['🍭', 'lollipop'],
      ['🍯', 'honey miel'],
      ['🥛', 'milk lait'],
      ['☕', 'coffee café'],
      ['🍵', 'tea thé'],
      ['🍺', 'beer bière'],
      ['🍷', 'wine vin'],
      ['🍸', 'cocktail'],
      ['🥂', 'cheers toast santé'],
      ['🥤', 'soda drink boisson'],
      ['🍕', 'pizza'],
      ['🍔', 'burger hamburger'],
      ['🍟', 'french fries frites'],
      ['🌭', 'hot dog'],
      ['🌮', 'taco'],
      ['🍜', 'noodle ramen'],
      ['🍣', 'sushi'],
      ['🍲', 'soup soupe'],
      ['🥨', 'pretzel'],
      ['🥪', 'sandwich'],
      ['🧁', 'cupcake']
    ]},
    { id: 'activity', icon: '⚽', items: [
      ['⚽', 'soccer football foot'],
      ['⚾', 'baseball'],
      ['🏀', 'basketball basket'],
      ['🏈', 'american football'],
      ['🎾', 'tennis'],
      ['🏸', 'badminton'],
      ['🏓', 'ping pong'],
      ['🎯', 'target dart darts tir'],
      ['🎳', 'bowling'],
      ['⛳', 'golf'],
      ['🏂', 'snowboard'],
      ['🛷', 'sled luge'],
      ['⛸️', 'ice skating patin'],
      ['🛹', 'skateboard'],
      ['🛼', 'roller'],
      ['🚴', 'cycling vélo'],
      ['🏋️', 'weightlifting haltères'],
      ['🤸', 'gymnastics'],
      ['🤺', 'fencing escrime'],
      ['🏄', 'surfing surf'],
      ['🏊', 'swimming natation nage'],
      ['🤾', 'handball'],
      ['🤽', 'water polo'],
      ['🥇', 'gold medal or médaille'],
      ['🥈', 'silver medal argent'],
      ['🥉', 'bronze medal bronze'],
      ['🏆', 'trophy trophée win gagner'],
      ['🎖️', 'military medal'],
      ['🥁', 'drum batterie'],
      ['🎸', 'guitar guitare'],
      ['🎹', 'piano'],
      ['🎻', 'violin violon'],
      ['🎤', 'microphone micro'],
      ['🎧', 'headphone casque'],
      ['📻', 'radio'],
      ['🎮', 'video game controller jeu jeu vidéo'],
      ['🎰', 'slot machine'],
      ['🎲', 'dice dé dés'],
      ['🃏', 'joker cards cartes'],
      ['🎪', 'circus cirque'],
      ['🎭', 'theater masks théâtre'],
      ['🎨', 'artist palette palette art'],
      ['🖌️', 'paintbrush pinceau'],
      ['📷', 'camera appareil photo'],
      ['🎬', 'clapperboard cinéma'],
      ['💄', 'lipstick rouge à lèvres'],
      ['💊', 'pills pilules'],
      ['💉', 'syringe injection vaccine vaccin'],
      ['⚖️', 'balance justice']
    ]},
    { id: 'travel', icon: '🚗', items: [
      ['🚗', 'car voiture auto'],
      ['🚕', 'taxi'],
      ['🚌', 'bus'],
      ['🚓', 'police car'],
      ['🚑', 'ambulance'],
      ['🚒', 'fire truck pompiers'],
      ['🚲', 'bike vélo'],
      ['🛵', 'scooter'],
      ['🏍️', 'motorcycle moto'],
      ['🛥️', 'motorboat'],
      ['⛵', 'sailboat voilier'],
      ['🚢', 'ship navire bateau'],
      ['🚀', 'rocket fusée space'],
      ['🛸', 'ufo ovni'],
      ['✈️', 'airplane avion'],
      ['🛫', 'departure départ'],
      ['🛬', 'arrival arrivée'],
      ['🚂', 'locomotive train'],
      ['🚃', 'train car wagon'],
      ['🚉', 'station gare'],
      ['🚧', 'construction travaux'],
      ['🏠', 'house maison'],
      ['🏢', 'office building bureau'],
      ['🏦', 'bank banque'],
      ['🏥', 'hospital hôpital'],
      ['🏫', 'school école'],
      ['⛪', 'church église'],
      ['🗽', 'statue of liberty'],
      ['🗼', 'tokyo tower tour'],
      ['🌍', 'europe africa globe monde'],
      ['🌎', 'americas globe monde'],
      ['🌏', 'asia australia globe monde'],
      ['🗺️', 'world map carte'],
      ['📍', 'round pin repère'],
      ['📌', 'pushpin épingle'],
      ['🏔️', 'mountain montagne'],
      ['⛰️', 'mount fuji montagne'],
      ['🌋', 'volcano volcan'],
      ['🏝️', 'desert island île'],
      ['🏖️', 'beach plage'],
      ['🌅', 'sunset coucher soleil'],
      ['🌄', 'sunrise matin'],
      ['🌌', 'milky way ciel galaxy'],
      ['🌙', 'crescent moon lune'],
      ['🌞', 'sun face soleil'],
      ['☀️', 'sun soleil'],
      ['🌈', 'rainbow arc-en-ciel'],
      ['⛈️', 'thunderstorm orage'],
      ['🌧️', 'rain pluie'],
      ['❄️', 'snow neige'],
      ['💨', 'wind vent']
    ]},
    { id: 'objects', icon: '💡', items: [
      ['⌚', 'watch montre'],
      ['🕐', 'clock heure time'],
      ['📱', 'mobile phone téléphone portable'],
      ['💻', 'laptop computer ordinateur'],
      ['⌨️', 'keyboard clavier'],
      ['🖥️', 'desktop computer écran'],
      ['📺', 'television tv'],
      ['✉️', 'email envelope lettre mail'],
      ['📩', 'incoming mail email'],
      ['📦', 'package colis'],
      ['📝', 'memo note notes'],
      ['✏️', 'pencil crayon'],
      ['📊', 'bar chart graphique'],
      ['📈', 'chart up hausse'],
      ['📉', 'chart down baisse'],
      ['🔪', 'knife couteau'],
      ['🍴', 'fork fourchette'],
      ['🥄', 'spoon cuillère'],
      ['🚪', 'door porte'],
      ['🪟', 'window fenêtre'],
      ['🛏️', 'bed lit'],
      ['🛁', 'bath bain'],
      ['🚽', 'toilet toilettes'],
      ['🧼', 'soap savon'],
      ['💈', 'barber pole'],
      ['💎', 'gem stone diamant bijou'],
      ['💰', 'money bag argent sac'],
      ['💵', 'dollar bill billet argent'],
      ['💸', 'money wings argent argent'],
      ['💳', 'credit card carte bancaire'],
      ['🪙', 'coin pièce monnaie'],
      ['🔋', 'battery batterie'],
      ['🔌', 'electric plug prise'],
      ['🔔', 'bell cloche notification'],
      ['🔮', 'crystal ball boule'],
      ['🎁', 'gift box cadeau'],
      ['🎀', 'ribbon ruban'],
      ['🔒', 'lock verrou secret'],
      ['🔓', 'unlocked open'],
      ['🔑', 'key clé'],
      ['📞', 'telephone téléphone appel'],
      ['🔇', 'mute muet silencieux'],
      ['🔊', 'speaker volume son'],
      ['🎵', 'musical note note musique'],
      ['🎶', 'musical notes musique'],
      ['🔥', 'fire feu hot brûle'],
      ['🧲', 'magnet aimant'],
      ['🧺', 'basket panier'],
      ['🔧', 'wrench outil'],
      ['🔨', 'hammer marteau'],
      ['⚙️', 'gear roue paramètres'],
      ['🪛', 'screwdriver tournevis'],
      ['🧪', 'test tube éprouvette test'],
      ['🔬', 'microscope science'],
      ['🔭', 'telescope télescope space'],
      ['💡', 'light bulb idea idée ampoule']
    ]},
    { id: 'symbols', icon: '❤️', items: [
      ['❤️', 'red heart love amour coeur'],
      ['🧡', 'orange heart amour'],
      ['💛', 'yellow heart amour'],
      ['💚', 'green heart amour'],
      ['💙', 'blue heart amour'],
      ['💜', 'purple heart amour'],
      ['🖤', 'black heart amour'],
      ['🤍', 'white heart amour'],
      ['💔', 'broken heart casse triste coeur'],
      ['💕', 'two hearts love'],
      ['💖', 'sparkling heart love'],
      ['💗', 'growing heart love'],
      ['💘', 'heart with arrow love'],
      ['💝', 'decorated heart love'],
      ['💞', 'revolving hearts love'],
      ['💟', 'heart decoration amour'],
      ['💋', 'kiss mark bisou'],
      ['✅', 'check mark ✓ ok'],
      ['❌', 'cross mark ✗ non'],
      ['❗', 'exclamation important'],
      ['❓', 'question mark question'],
      ['💯', 'hundred points perfect 100'],
      ['🎉', 'confetti ball fête party'],
      ['🎊', 'ball confetti fête'],
      ['✨', 'sparkles étincelles magie'],
      ['🌟', 'glowing star étoile'],
      ['⭐', 'star étoile'],
      ['💫', 'dizzy star'],
      ['⚡', 'high voltage éclair lightning'],
      ['⏳', 'hourglass sablier attente'],
      ['⚠️', 'warning attention'],
      ['🚫', 'prohibited interdit'],
      ['🆗', 'ok button'],
      ['🆕', 'new button nouveau'],
      ['🆒', 'cool button'],
      ['🔰', 'beginner symbol débutant'],
      ['➕', 'plus'],
      ['➖', 'minus'],
      ['➗', 'divide'],
      ['🔸', 'small diamond'],
      ['🔹', 'large diamond'],
      ['🔱', 'trident'],
      ['💠', 'diamond with a dot'],
      ['🔘', 'radio button'],
      ['♾️', 'infinity infini'],
      ['♻️', 'recycle recyclage'],
      ['☑️', 'ballot check'],
      ['🇫🇷', 'flag france drapeau'],
      ['🇺🇸', 'flag usa drapeau'],
      ['🇬🇧', 'flag uk drapeau'],
      ['🇰🇷', 'flag korea drapeau'],
      ['🇯🇵', 'flag japan drapeau'],
      ['🇩🇪', 'flag germany drapeau'],
      ['🇪🇸', 'flag spain drapeau'],
      ['🇮🇹', 'flag italy drapeau']
    ]}
  ];

  // -- Recherche --------------------------------------------------------------
  function norm(s) {
    s = String(s == null ? '' : s).toLowerCase();
    try {
      s = s.replace(/\u0153/g, 'oe').replace(/\u00e6/g, 'ae');
      if (s.normalize) s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    } catch (e) {}
    return s;
  }
  var INDEX = [];
  for (var ci = 0; ci < CATS.length; ci++) {
    var c = CATS[ci];
    for (var ii = 0; ii < c.items.length; ii++) {
      INDEX.push({ ch: c.items[ii][0], kw: c.items[ii][1], hay: norm(c.items[ii][1]), cat: c.id });
    }
  }

  // -- Récents (persistés) ------------------------------------------------------
  var RECENTS_KEY = 'emojiRecent';
  var RECENTS_MAX = 16;
  function getRecents() {
    try {
      var r = window.BTTStore ? window.BTTStore.get(RECENTS_KEY, []) : null;
      return Array.isArray(r) ? r.filter(function (x) { return typeof x === 'string' && x; }) : [];
    } catch (e) { return []; }
  }
  function pushRecent(ch) {
    try {
      var r = getRecents().filter(function (x) { return x !== ch; });
      r.unshift(ch);
      if (r.length > RECENTS_MAX) r = r.slice(0, RECENTS_MAX);
      if (window.BTTStore) window.BTTStore.set(RECENTS_KEY, r);
    } catch (e) {}
  }

  // -- Localisation ---------------------------------------------------------------
  function _te(key, def, params) {
    try {
      if (window.BTTI18n && typeof window.BTTI18n.t === 'function') {
        var s = window.BTTI18n.t(key, params);
        if (s != null && s !== key) return s;
      }
    } catch (e) {}
    return def;
  }
  // -- Styles ------------------------------------------------------------------
  function ensureStyle() {
    try {
      var head = document.head || document.getElementsByTagName('head')[0];
      if (!head || document.getElementById('bt-emoji-css')) return;
      var el = document.createElement('style');
      el.id = 'bt-emoji-css';
      el.setAttribute('data-bt-root', '1');
      el.textContent = [
        '#bt-emoji-btn{position:fixed;z-index:2147483645;width:30px;height:30px;padding:0;',
        'display:inline-flex;align-items:center;justify-content:center;font-size:16px;line-height:1;',
        'cursor:pointer;background:var(--btt-surface,#1c2630);color:var(--btt-text,#fff);',
        'border:1px solid var(--btt-border,#3d4f60);border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.35);',
        'opacity:.85;transition:opacity .15s ease,transform .15s ease;font-family:inherit;}',
        '#bt-emoji-btn:hover{opacity:1;transform:translateY(-1px);}',
        '#bt-emoji-btn.bt-on{background:var(--btt-accent,#6c5ce7);border-color:transparent;opacity:1;}',
        '#bt-emoji-box{position:fixed;z-index:2147483646;width:322px;height:392px;display:none;flex-direction:column;',
        'background:var(--btt-surface,#1c2630);color:var(--btt-text,#fff);border:1px solid var(--btt-border,#3d4f60);',
        'border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,.5);font-family:sans-serif;font-size:13px;overflow:hidden;}',
        '#bt-emoji-box.bt-open{display:flex;}',
        '.bt-emj-search{display:flex;align-items:center;gap:6px;padding:8px;border-bottom:1px solid var(--btt-border,#3d4f60);}',
        '.bt-emj-searchbtn{flex:0 0 auto;width:26px;height:26px;border-radius:6px;border:1px solid var(--btt-border,#3d4f60);',
        'background:transparent;color:inherit;cursor:pointer;font-size:12px;line-height:1;padding:0;}',
        '.bt-emj-searchbtn:hover{background:rgba(108,92,231,.25);}',
        '.bt-emj-search input{flex:1;min-width:0;padding:6px 8px;border:1px solid var(--btt-border,#3d4f60);border-radius:7px;',
        'background:rgba(0,0,0,.25);color:inherit;font-size:13px;outline:none;}',
        '.bt-emj-search input:focus{border-color:var(--btt-accent,#6c5ce7);}',
        '.bt-emj-tabs{display:flex;gap:2px;padding:6px 8px 4px;overflow-x:auto;border-bottom:1px solid var(--btt-border,#3d4f60);}',
        '.bt-emj-tabs::-webkit-scrollbar{height:0;}',
        '.bt-emj-tab{flex:0 0 auto;width:32px;height:28px;border:none;background:transparent;color:inherit;font-size:15px;',
        'cursor:pointer;border-radius:6px;opacity:.55;padding:0;line-height:1;}',
        '.bt-emj-tab:hover{opacity:1;background:rgba(255,255,255,.08);}',
        '.bt-emj-tab.bt-on{opacity:1;background:var(--btt-accent,#6c5ce7);}',
        '.bt-emj-grid{flex:1;overflow-y:auto;display:grid;grid-template-columns:repeat(8,1fr);gap:2px;padding:8px;align-content:start;}',
        '.bt-emj-grid::-webkit-scrollbar{width:8px;}',
        '.bt-emj-grid::-webkit-scrollbar-thumb{background:var(--btt-border,#3d4f60);border-radius:4px;}',
        '.bt-emj-cell{height:34px;border:none;background:transparent;border-radius:7px;font-size:20px;line-height:1;',
        'cursor:pointer;padding:0;}',
        '.bt-emj-cell:hover{background:rgba(108,92,231,.25);transform:scale(1.12);}',
        '.bt-emj-empty{grid-column:1/-1;text-align:center;opacity:.7;padding:26px 8px;}',
        '.bt-emj-foot{padding:4px 10px;font-size:10.5px;opacity:.55;border-top:1px solid var(--btt-border,#3d4f60);',
        'display:flex;justify-content:space-between;gap:8px;}'
      ].join('\n');
      head.appendChild(el);
    } catch (e) {}
  }
  // -- Cible & insertion ---------------------------------------------------------
  var snap = { el: null, start: 0, end: 0, range: null };

  BandUI.prototype._emojiTarget = function () {
    try {
      var el = this.adapter && this.adapter.getChatInput ? this.adapter.getChatInput() : null;
      if (el && this._isEditable(el)) return el;
      var act = document.activeElement;
      if (act && this._isEditable(act) && !(act.closest && act.closest('[data-bt-root]'))) return act;
    } catch (e) {}
    return null;
  };

  /** Mémorise la cible + le caret AVANT que la recherche ne vole le focus. */
  BandUI.prototype._emojiSnapshot = function () {
    try {
      var el = document.activeElement;
      if (!(el && this._isEditable(el)) || (el.closest && el.closest('[data-bt-root]'))) {
        if (snap.el && document.body.contains(snap.el)) return; // garde l'instantané
        el = this._emojiTarget();
      }
      if (!el) return;
      var s = { el: el, start: 0, end: 0, range: null };
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        try { s.start = el.selectionStart; s.end = el.selectionEnd; }
        catch (e2) { s.start = s.end = String(el.value || '').length; }
        if (typeof s.start !== 'number') s.start = String(el.value || '').length;
        if (typeof s.end !== 'number') s.end = s.start;
      } else if (el.isContentEditable) {
        var sel = window.getSelection();
        if (sel && sel.rangeCount && el.contains(sel.anchorNode)) s.range = sel.getRangeAt(0).cloneRange();
      }
      snap = s;
    } catch (e) {}
  };

  /** Insère un emoji à la position mémorisée (React-compatible, sans réseau). */
  BandUI.prototype._emojiInsert = function (ch) {
    var self = this;
    try {
      if (!ch) return;
      var el = snap.el && document.body.contains(snap.el) ? snap.el : this._emojiTarget();
      if (!el) {
        if (window.__BTT_toast) window.__BTT_toast(_te('emoji.noInput', 'No text field found'), 'error');
        return;
      }
      var done = false;
      var dispatch = false;
      try { el.focus(); } catch (e) {}
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        try {
          var len = String(el.value || '').length;
          var a = Math.min(typeof snap.start === 'number' ? snap.start : len, len);
          var b = Math.min(typeof snap.end === 'number' ? snap.end : len, len);
          if (a > b) { var tmp = a; a = b; b = tmp; }
          if (a < 0) a = 0;
          if (b < 0) b = 0;
          if (el.setRangeText) el.setRangeText(ch, a, b, 'end');
          else el.value = String(el.value || '').slice(0, a) + ch + String(el.value || '').slice(b);
          try { el.setSelectionRange(a + ch.length, a + ch.length); } catch (e2) {}
          done = true;
          dispatch = true;
        } catch (e3) {}
      } else if (el.isContentEditable) {
        try {
          if (snap.range && document.body.contains(snap.range.startContainer)) {
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(snap.range);
          }
        } catch (e4) {}
        try { done = document.execCommand('insertText', false, ch); } catch (e5) { done = false; }
        if (!done) {
          try {
            var sel2 = window.getSelection();
            var range = sel2 && sel2.rangeCount ? sel2.getRangeAt(0) : null;
            if (!range || !el.contains(range.startContainer)) {
              range = document.createRange();
              range.selectNodeContents(el);
              range.collapse(false);
            }
            range.deleteContents();
            var node = document.createTextNode(ch);
            range.insertNode(node);
            range.setStartAfter(node);
            range.collapse(true);
            sel2.removeAllRanges();
            sel2.addRange(range);
            done = true;
            dispatch = true;
          } catch (e6) {}
        }
      }
      if (done) {
        if (dispatch) {
          try { el.dispatchEvent(new InputEvent('input', { bubbles: true, data: ch, inputType: 'insertText' })); }
          catch (e7) { try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (e8) {} }
        }
        try {
          if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            snap.el = el; snap.start = snap.end = el.selectionStart;
          } else {
            var sel4 = window.getSelection();
            if (sel4 && sel4.rangeCount && el.contains(sel4.anchorNode)) {
              snap.el = el; snap.range = sel4.getRangeAt(0).cloneRange();
            } else { snap.el = el; snap.range = null; }
          }
        } catch (e9) {}
        pushRecent(ch);
        return;
      }
      // Repli : valeur entière recalculée via _setValue (couche React de BAND).
      var text = self._readValue ? self._readValue(el) : String(el.textContent || '');
      var caret = typeof snap.start === 'number' ? snap.start : text.length;
      if (caret > text.length) caret = text.length;
      if (caret < 0) caret = 0;
      var end = typeof snap.end === 'number' ? snap.end : caret;
      if (end < caret) end = caret;
      if (end > text.length) end = text.length;
      var next = text.slice(0, caret) + ch + text.slice(end);
      if (self._setValue) self._setValue(el, next);
      snap.el = el; snap.start = snap.end = caret + ch.length;
      pushRecent(ch);
    } catch (e) {
      if (window.__BTT_toast) window.__BTT_toast('emoji: ' + e, 'error');
    }
  };
  // -- Panneau ------------------------------------------------------------------
  var CAT_LABELS = {
    recent: ['emoji.recent', 'Recently used'],
    smileys: ['emoji.cat.smileys', 'Smileys'],
    people: ['emoji.cat.people', 'People & gestures'],
    nature: ['emoji.cat.nature', 'Nature & animals'],
    food: ['emoji.cat.food', 'Food & drink'],
    activity: ['emoji.cat.activity', 'Activities & sports'],
    travel: ['emoji.cat.travel', 'Travel & places'],
    objects: ['emoji.cat.objects', 'Objects'],
    symbols: ['emoji.cat.symbols', 'Symbols']
  };
  var GRID_MAX = 160;

  function ensureBox(self) {
    var box = document.getElementById('bt-emoji-box');
    if (box && document.body.contains(box)) return box;
    ensureStyle();
    box = document.createElement('div');
    box.id = 'bt-emoji-box';
    box.setAttribute('data-bt-root', '1');
    box.innerHTML =
      '<div class="bt-emj-search">' +
        '<button type="button" class="bt-emj-searchbtn" tabindex="-1">🔍</button>' +
        '<input type="search" spellcheck="false" autocomplete="off">' +
      '</div>' +
      '<div class="bt-emj-tabs"></div>' +
      '<div class="bt-emj-grid"></div>' +
      '<div class="bt-emj-foot"><span class="bt-emj-count"></span><span class="bt-emj-hint"></span></div>';
    document.body.appendChild(box);

    var input = box.querySelector('input');
    var sbtn = box.querySelector('.bt-emj-searchbtn');
    input.placeholder = _te('emoji.search', 'Search emoji…');
    box.querySelector('.bt-emj-hint').textContent = _te('emoji.closeHint', 'Esc — close');
    sbtn.title = input.placeholder;
    // Bouton 🔍 : (re)focus + sélectionne la recherche.
    sbtn.addEventListener('click', function () {
      try { input.focus(); input.select(); } catch (e) {}
    });
    input.addEventListener('input', function () { try { self._emojiRender(); } catch (e) {} });
    input.addEventListener('keydown', function (e) {
      try {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (e.stopImmediatePropagation) e.stopImmediatePropagation();
          var first = box.querySelector('.bt-emj-cell');
          if (first) self._emojiInsert(first.getAttribute('data-e'));
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (e.stopImmediatePropagation) e.stopImmediatePropagation();
          var f = box.querySelector('.bt-emj-cell');
          if (f) f.focus();
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          if (e.stopImmediatePropagation) e.stopImmediatePropagation();
          self._emojiClose();
        }
      } catch (err) {}
    });
    box.querySelector('.bt-emj-tabs').addEventListener('click', function (e) {
      try {
        var tab = e.target && e.target.closest ? e.target.closest('.bt-emj-tab') : null;
        if (!tab) return;
        self._emjCat = tab.getAttribute('data-cat') || 'smileys';
        var si = box.querySelector('input');
        if (si && si.value) si.value = '';
        self._emojiRender();
      } catch (err) {}
    });
    // mousedown : empêche le changement de focus (garde le caret du composer) ;
    // l'insertion se fait au clic (couvre aussi la navigation clavier Enter).
    box.addEventListener('mousedown', function (e) {
      try {
        var cell = e.target && e.target.closest ? e.target.closest('.bt-emj-cell') : null;
        if (cell) e.preventDefault();
      } catch (err) {}
    });
    box.addEventListener('click', function (e) {
      try {
        var cell = e.target && e.target.closest ? e.target.closest('.bt-emj-cell') : null;
        if (!cell) return;
        self._emojiInsert(cell.getAttribute('data-e'));
        if (self._emjCat === 'recent') self._emojiRender();
      } catch (err) {}
    });
    return box;
  }
  /** Rendu : onglet courant (ou recherche globale) dans la grille. */
  BandUI.prototype._emojiRender = function () {
    try {
      var box = ensureBox(this);
      var input = box.querySelector('input');
      input.placeholder = _te('emoji.search', 'Search emoji…');
      var hint = box.querySelector('.bt-emj-hint');
      if (hint) hint.textContent = _te('emoji.closeHint', 'Esc — close');
      var grid = box.querySelector('.bt-emj-grid');
      var tabs = box.querySelector('.bt-emj-tabs');
      var count = box.querySelector('.bt-emj-count');
      var q = norm(String(input.value || '').trim());
      var recents = getRecents();

      // Onglets
      var tabList = [];
      if (recents.length) tabList.push({ id: 'recent', icon: '🕐' });
      for (var t = 0; t < CATS.length; t++) tabList.push({ id: CATS[t].id, icon: CATS[t].icon });
      if (!recents.length && this._emjCat === 'recent') this._emjCat = 'smileys';
      if (!this._emjCat) this._emjCat = 'smileys';
      var tabsHtml = '';
      for (var ti = 0; ti < tabList.length; ti++) {
        var tb = tabList[ti];
        var lab = CAT_LABELS[tb.id] || ['', tb.id];
        tabsHtml += '<button type="button" class="bt-emj-tab' + (!q && this._emjCat === tb.id ? ' bt-on' : '') +
          '" data-cat="' + tb.id + '" title="' + escapeHtml(_te(lab[0], lab[1])) + '">' + tb.icon + '</button>';
      }
      tabs.innerHTML = tabsHtml;

      // Éléments
      var items = [];
      if (q) {
        var tokens = q.split(/\s+/);
        for (var i = 0; i < INDEX.length && items.length < 400; i++) {
          var rec = INDEX[i];
          var ok = true;
          for (var k = 0; k < tokens.length; k++) {
            if (tokens[k] && rec.hay.indexOf(tokens[k]) === -1) { ok = false; break; }
          }
          if (ok) items.push(rec);
        }
      } else if (this._emjCat === 'recent') {
        for (var r = 0; r < recents.length; r++) items.push({ ch: recents[r], kw: '', hay: '' });
      } else {
        var cat = null;
        for (var c = 0; c < CATS.length; c++) if (CATS[c].id === this._emjCat) cat = CATS[c];
        if (!cat) cat = CATS[0];
        for (var j = 0; j < cat.items.length; j++) {
          items.push({ ch: cat.items[j][0], kw: cat.items[j][1], hay: norm(cat.items[j][1]) });
        }
      }

      var shown = items.slice(0, GRID_MAX);
      var html = '';
      for (var s = 0; s < shown.length; s++) {
        html += '<button type="button" class="bt-emj-cell" data-e="' + shown[s].ch + '" title="' +
          escapeHtml(shown[s].kw || shown[s].ch) + '">' + shown[s].ch + '</button>';
      }
      if (!shown.length) {
        html = '<div class="bt-emj-empty">' + escapeHtml(_te('emoji.empty', 'No emoji found')) + '</div>';
      }
      grid.innerHTML = html;
      grid.scrollTop = 0;
      count.textContent = items.length > GRID_MAX ? GRID_MAX + '+ / ' + items.length : String(items.length);
    } catch (e) {
      if (this.adapter && this.adapter.log) this.adapter.log('emoji render KO :', e);
    }
  };
  // -- Ouverture / fermeture / position ------------------------------------------
  BandUI.prototype._emojiClose = function () {
    try {
      this._emjOpen = false;
      var box = document.getElementById('bt-emoji-box');
      if (box) box.classList.remove('bt-open');
      var btn = document.getElementById('bt-emoji-btn');
      if (btn) btn.classList.remove('bt-on');
    } catch (e) {}
  };

  BandUI.prototype._emojiToggle = function () {
    if (this._emjOpen) { this._emojiClose(); return; }
    try {
      if (!this._emojiTarget()) {
        if (window.__BTT_toast) window.__BTT_toast(_te('emoji.noInput', 'No text field found'), 'error');
        return;
      }
      this._emojiSnapshot();
      var box = ensureBox(this);
      if (!this._emjCat) this._emjCat = getRecents().length ? 'recent' : 'smileys';
      if (this._emjCat === 'recent' && !getRecents().length) this._emjCat = 'smileys';
      var si = box.querySelector('input');
      si.value = '';
      this._emojiRender();
      this._emjOpen = true;
      box.classList.add('bt-open');
      var btn = document.getElementById('bt-emoji-btn');
      if (btn) btn.classList.add('bt-on');
      this._emojiPlace();
      setTimeout(function () { try { si.focus(); } catch (e) {} }, 0);
    } catch (e) {
      if (this.adapter && this.adapter.log) this.adapter.log('emoji toggle KO :', e);
    }
  };

  /** Ancre le panneau au-dessus (ou sous) le composer, dans la fenêtre. */
  BandUI.prototype._emojiPlace = function () {
    try {
      var box = document.getElementById('bt-emoji-box');
      if (!box || !this._emjOpen) return;
      var input = this._emojiTarget();
      var r = input ? input.getBoundingClientRect() : null;
      if (!r || r.width < 40) {
        var btn = document.getElementById('bt-emoji-btn');
        if (btn && btn.style.display !== 'none') r = btn.getBoundingClientRect();
      }
      if (!r || !r.width) { this._emojiClose(); return; }
      var w = 322, h = 392;
      var left = r.right - w;
      if (left < 8) left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
      var top = r.top - h - 10;
      if (top < 8) top = Math.min(r.bottom + 10, window.innerHeight - h - 8);
      if (top < 8) top = 8;
      box.style.left = left + 'px';
      box.style.top = top + 'px';
    } catch (e) {}
  };
  /**
   * (Ré)injecte le bouton 😀 et le repositionne près du champ de saisie.
   * Appelé par ensureInjected (tick ~1 s de main.js) + scroll/resize.
   */
  BandUI.prototype._ensureEmojiUI = function () {
    var self = this;
    try {
      if (!document.body) return;
      ensureStyle();
      var btn = document.getElementById('bt-emoji-btn');
      if (btn && !document.body.contains(btn)) btn = null;
      if (!btn) {
        btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'bt-emoji-btn';
        btn.setAttribute('data-bt-root', '1');
        btn.textContent = '😀';
        btn.style.display = 'none';
        document.body.appendChild(btn);
        btn.addEventListener('mousedown', function () {
          try { self._emojiSnapshot(); } catch (e) {}
        });
        btn.addEventListener('click', function () {
          try { self._emojiToggle(); } catch (e) {}
        });
      }
      btn.title = _te('emoji.btn', 'Emoji picker');
      btn.setAttribute('aria-label', btn.title);

      // Caché pendant que la page Paramètres (Unbanded) est ouverte.
      var stOpen = !!this.settingsVisible;
      if (!stOpen) {
        var st = document.getElementById('bt-settings');
        if (st) {
          try {
            var sr = st.getBoundingClientRect();
            stOpen = sr.width > 0 && sr.height > 0;
          } catch (e) {}
        }
      }
      if (stOpen) {
        btn.style.display = 'none';
        if (this._emjOpen) this._emojiClose();
        return;
      }

      var input = this._emojiTarget();
      var r = input ? input.getBoundingClientRect() : null;
      var show = !!(r && r.width > 60 && r.height > 16 &&
        r.bottom > 4 && r.top < window.innerHeight - 4 &&
        r.height < window.innerHeight * 0.6);
      if (!show) {
        btn.style.display = 'none';
        if (this._emjOpen) this._emojiClose();
        return;
      }
      btn.style.display = 'inline-flex';
      var left = Math.min(r.right - 34, window.innerWidth - 42);
      var top = r.top - 36;
      if (top < 6) {
        // Pas la place au-dessus : à l'intérieur du champ, bord droit.
        top = r.top + Math.max(4, (r.height - 30) / 2);
        left = Math.min(r.right - 38, window.innerWidth - 44);
      }
      if (left < 6) left = 6;
      btn.style.left = left + 'px';
      btn.style.top = top + 'px';
      if (this._emjOpen) this._emojiPlace();
    } catch (e) {
      if (this.adapter && this.adapter.log) this.adapter.log('ensureEmojiUI KO :', e);
    }
  };

  // -- Écouteurs globaux (enregistrés une seule fois) ------------------------------
  (function () {
    var inited = false;
    var orig = BandUI.prototype._ensureEmojiUI;
    BandUI.prototype._ensureEmojiUI = function () {
      orig.call(this);
      if (inited) return;
      if (!document.body || !document.addEventListener) return;
      inited = true;
      var self = this;
      // Ferme le panneau si on clique ailleurs.
      document.addEventListener('mousedown', function (e) {
        try {
          if (!self._emjOpen) return;
          var t = e.target;
          if (!t || !t.closest) return;
          if (t.closest('#bt-emoji-box') || t.closest('#bt-emoji-btn')) return;
          self._emojiClose();
        } catch (err) {}
      }, true);
      // Échap ferme le panneau (les handlers de commandes restent libres).
      document.addEventListener('keydown', function (e) {
        try {
          if (!self._emjOpen || !e || e.key !== 'Escape') return;
          self._emojiClose();
          if (e.preventDefault) e.preventDefault();
        } catch (err) {}
      }, true);
      // Recalage du bouton/panneau sur scroll & resize (throttle rAF).
      var raf = 0;
      var onMove = function () {
        if (raf) return;
        var cb = function () { raf = 0; try { self._ensureEmojiUI(); } catch (e) {} };
        raf = window.requestAnimationFrame ? window.requestAnimationFrame(cb) : setTimeout(cb, 16);
      };
      try {
        window.addEventListener('scroll', onMove, true);
        window.addEventListener('resize', onMove);
      } catch (err) {}
      if (self.adapter && self.adapter.log) self.adapter.log('Emoji picker actif (bouton 😀 + recherche).');
    };
  })();
})();
