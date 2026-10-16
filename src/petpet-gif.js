(function () {
  // Portage navigateur de pet-pet-gif (aDu) — https://github.com/aDu/pet-pet-gif
  // Algorithme EXACT de index.js du dépôt :
  //   • 10 frames, delay 20 ms, résolution 128×128 par défaut
  //   • avatar écrasé/rebondi : j = i < FRAMES/2 ? i : FRAMES - i ;
  //     width = 0.8 + j*0.02 ; height = 0.8 - j*0.05 ;
  //     offsetX = (1-width)*0.5 + 0.1 ; offsetY = (1-height) - 0.08
  //   • image de main d'origine (img/pet{i}.gif) superposée à chaque frame
  // Encodage GIF 100 % local via gifenc vendorisé (src/vendor/gifenc.js) : aucun
  // script CDN, aucun Web Worker — compatible CSP stricte de band.us (c'est ce qui
  // faisait échouer gif.js/unpkg et laissait la photo statique). Transparence par
  // masque magenta rendu transparent (dispose: 2 = « restore to background » pour
  // éviter les fantômes de frames précédentes). Frames de main en base64 :
  // src/petpet-hand.js (window.__BTT_PET_HANDS).

  var FRAMES = 10;
  var DEFAULT_RESOLUTION = 128; // aDu : options.resolution
  var DEFAULT_DELAY = 20;       // aDu : options.delay (ms)
  var HAND_FRAMES = window.__BTT_PET_HANDS || [];
  var MASK_COLOR = '#ff00ff';
  var MASK_RGB = [255, 0, 255];

  function loadImage(url) {
    return new Promise(function (res, rej) {
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () { res(img); };
      img.onerror = function () { rej(new Error('image indisponible')); };
      img.src = url;
    });
  }

  var handsPromise = null;
  function loadHandFrames() {
    if (!handsPromise) {
      handsPromise = Promise.all(HAND_FRAMES.map(function (uri) {
        return loadImage(uri).catch(function () { return null; });
      }));
    }
    return handsPromise;
  }

  // Index de la couleur la plus proche du magenta dans la palette gifenc
  // (array de [r, g, b]) : c'est elle qui devient transparente.
  function findMaskIndex(palette) {
    var best = -1, bestDist = Infinity;
    for (var k = 0; k < palette.length; k++) {
      var c = palette[k];
      var d = (c[0] - MASK_RGB[0]) * (c[0] - MASK_RGB[0]) +
              (c[1] - MASK_RGB[1]) * (c[1] - MASK_RGB[1]) +
              (c[2] - MASK_RGB[2]) * (c[2] - MASK_RGB[2]);
      if (d < bestDist) { bestDist = d; best = k; }
    }
    return best;
  }

  // Fallback statique (PNG) si l'encodage échoue ou si l'avatar est injoignable
  function staticFallback(img, resolution, backgroundColor) {
    var c = document.createElement('canvas');
    c.width = resolution;
    c.height = resolution;
    var cx = c.getContext('2d');
    cx.fillStyle = backgroundColor || '#f5f5f5';
    cx.fillRect(0, 0, resolution, resolution);
    if (img) {
      var iw = img.width || resolution;
      var ih = img.height || resolution;
      var s = Math.min(resolution / iw, resolution / ih);
      cx.drawImage(img, (resolution - iw * s) / 2, (resolution - ih * s) / 2, iw * s, ih * s);
    } else {
      cx.fillStyle = '#ccc';
      cx.fillRect(resolution * 0.3, resolution * 0.3, resolution * 0.4, resolution * 0.4);
    }
    return new Promise(function (res) { c.toBlob(res, 'image/png'); });
  }

  // Génère le GIF « pet-pet » (Blob image/gif) — encodage 100 % local via gifenc,
  // aucune dépendance réseau ni worker. Fallback PNG statique si l'avatar est
  // injoignable ou si le canvas réel est indisponible.
  async function generatePetGif(avatarUrl, opts) {
    var o = opts || {};
    var resolution = o.resolution || DEFAULT_RESOLUTION;
    var delay = o.delay || DEFAULT_DELAY;
    var backgroundColor = o.backgroundColor || null;
    var enc = window.__BTT_GIFENC;
    var img = null;
    try { img = await loadImage(avatarUrl); } catch (e) { /* avatar injoignable */ }
    if (!enc || typeof enc.GIFEncoder !== 'function' || typeof enc.quantize !== 'function' ||
        typeof enc.applyPalette !== 'function' || !img) {
      return staticFallback(img, resolution, backgroundColor);
    }

    var hands = await loadHandFrames();
    var canvas = document.createElement('canvas');
    canvas.width = resolution;
    canvas.height = resolution;
    var ctx = canvas.getContext('2d');

    try {
      var gif = enc.GIFEncoder();
      for (var i = 0; i < FRAMES; i++) {
        // Fond opaque magenta (masqué en transparence) ou couleur demandée
        ctx.fillStyle = backgroundColor || MASK_COLOR;
        ctx.fillRect(0, 0, resolution, resolution);

        // Algorithme aDu/pet-pet-gif : l'avatar s'écrase puis revient (10 frames)
        var j = i < FRAMES / 2 ? i : FRAMES - i;
        var width = 0.8 + j * 0.02;
        var height = 0.8 - j * 0.05;
        var offsetX = (1 - width) * 0.5 + 0.1;
        var offsetY = (1 - height) - 0.08;
        ctx.drawImage(img, resolution * offsetX, resolution * offsetY, resolution * width, resolution * height);

        // Main qui tape : image d'origine pet{i}.gif superposée pleine taille
        var hand = hands[i];
        if (hand) ctx.drawImage(hand, 0, 0, resolution, resolution);

        var data = ctx.getImageData(0, 0, resolution, resolution).data;
        if (!data || data.length !== resolution * resolution * 4) {
          throw new Error('getImageData invalide (canvas non réel ?)');
        }

        // Quantification locale (PNN) + palette appliquée, comme gifencoder côté Node
        var palette = enc.quantize(data, 256);
        var tIdx = findMaskIndex(palette);
        var index = enc.applyPalette(data, palette);
        gif.writeFrame(index, resolution, resolution, {
          palette: palette,
          delay: delay,
          transparent: !backgroundColor && tIdx >= 0,
          transparentIndex: tIdx >= 0 ? tIdx : 0,
          dispose: 2 // « restore to background » : évite les fantômes entre frames
        });
      }
      gif.finish();
      return new Blob([gif.bytes()], { type: 'image/gif' });
    } catch (e) {
      if (window.__BTT_LOG) {
        console.warn('[Unbanded] Encodage GIF impossible, PNG statique :', e && e.message);
      }
      return staticFallback(img, resolution, backgroundColor);
    }
  }

  generatePetGif.frames = FRAMES;
  generatePetGif.handCount = HAND_FRAMES.length;

  window.__BTT_PetGif = generatePetGif;
  if (typeof module !== 'undefined' && module.exports) module.exports = { generatePetGif: generatePetGif };
})();
