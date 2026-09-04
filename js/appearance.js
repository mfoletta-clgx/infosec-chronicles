/* Appearance descriptors: colors, text parsing, and photo -> pixel-palette analysis. */
(function (global) {
  'use strict';

  // ---------- color helpers ----------
  function hexToRgb(hex) {
    hex = String(hex || '#000000').replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const n = parseInt(hex, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function rgbToHex(r, g, b) {
    const c = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
    return '#' + c(r) + c(g) + c(b);
  }
  function shade(hex, amt) {
    const { r, g, b } = hexToRgb(hex);
    const f = v => amt < 0 ? v * (1 + amt) : v + (255 - v) * amt;
    return rgbToHex(f(r), f(g), f(b));
  }
  function luma(hex) {
    const { r, g, b } = hexToRgb(hex);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }
  function readableOn(hex) { return luma(hex) > 0.6 ? '#1b1226' : '#ffffff'; }

  // ---------- defaults ----------
  const DEFAULT_HUMAN = {
    kind: 'human',
    skin: '#e8b48c',
    hair: '#4a2f1d',
    eye: '#2b1d3a',
    shirt: '#3f7fd0',
    pants: '#38405c',
    shoes: '#2c2436',
    hat: null,
    glasses: false,
    beard: false,
    longHair: false
  };

  const DEFAULT_PET = {
    kind: 'pet',
    species: 'dog',
    ears: 'floppy',
    coat: '#c98a4b',
    accent: '#f2e3c8',
    eye: '#2b1d3a',
    nose: '#3a2b33',
    paws: '#8c5b2f'
  };

  function human(overrides) { return Object.assign({}, DEFAULT_HUMAN, overrides || {}); }
  function pet(overrides) {
    const p = Object.assign({}, DEFAULT_PET, overrides || {});
    p.ears = p.ears || earsForSpecies(p.species);
    return p;
  }

  const SPECIES_EARS = {
    dog: 'floppy', cat: 'pointy', fox: 'pointy', rabbit: 'tall', bunny: 'tall',
    hamster: 'round', guineapig: 'round', bird: 'round', parrot: 'round',
    fish: 'round', turtle: 'round', lizard: 'pointy', dragon: 'pointy',
    horse: 'pointy', ferret: 'round', hedgehog: 'pointy', alpaca: 'tall', goat: 'tall'
  };
  function earsForSpecies(s) { return SPECIES_EARS[String(s || '').toLowerCase()] || 'round'; }

  // ---------- named colors for text descriptions ----------
  const NAMED = {
    black: '#241d29', 'jet black': '#1c1720', 'dark brown': '#3b2415', brown: '#5a3620',
    'light brown': '#8a5a33', chestnut: '#6b3a1e', auburn: '#7d3418', ginger: '#c1500f',
    red: '#b8341f', orange: '#d9741f', blonde: '#dfb469', blond: '#dfb469',
    'dirty blonde': '#b99457', platinum: '#ecdcae', white: '#f2f2ef', gray: '#9a9aa2',
    grey: '#9a9aa2', silver: '#c3c6cc', salt: '#c3c6cc', blue: '#3f7fd0',
    'navy blue': '#22345e', navy: '#22345e', 'light blue': '#6fb7e8', teal: '#2a9c9c',
    cyan: '#3fd0d0', green: '#3f9c4a', 'dark green': '#28632f', olive: '#7a7a35',
    lime: '#7ad04a', purple: '#7a4fc0', violet: '#8d5fd6', lavender: '#c0a8ea',
    pink: '#e88fb8', magenta: '#d6459b', yellow: '#e8c94a', gold: '#d9a531',
    golden: '#d9a531', cream: '#f0e2c4', tan: '#c99a63', beige: '#ddc7a3',
    maroon: '#6d1f2b', burgundy: '#5c1c2c', charcoal: '#3a3a42', khaki: '#b3a06a'
  };

  const SKIN_TONES = {
    pale: '#f5d9c4', fair: '#f0cdae', light: '#e8b48c', medium: '#cf9668',
    tan: '#c08850', olive: '#b8875a', brown: '#8d5a34', 'dark brown': '#6b4023',
    dark: '#5c3720', deep: '#43281a'
  };

  function findColor(word) {
    if (!word) return null;
    const w = word.toLowerCase().trim();
    if (/^#[0-9a-f]{3,6}$/i.test(w)) return w;
    return NAMED[w] || null;
  }

  const COLOR_WORDS = Object.keys(NAMED).sort((a, b) => b.length - a.length);
  function colorBefore(text, nounPattern) {
    for (const c of COLOR_WORDS) {
      const re = new RegExp('\\b' + c + '\\b[\\w\\s-]{0,12}?\\b(?:' + nounPattern + ')\\b', 'i');
      if (re.test(text)) return NAMED[c];
    }
    return null;
  }

  /** Turn free-form text ("curly brown hair, glasses, teal hoodie") into a human descriptor. */
  function parseHuman(text, base) {
    const a = human(base);
    const t = ' ' + String(text || '').toLowerCase() + ' ';

    for (const tone of Object.keys(SKIN_TONES).sort((x, y) => y.length - x.length)) {
      if (new RegExp('\\b' + tone + '\\b[\\w\\s-]{0,10}?\\b(?:skin|skinned|complexion)\\b').test(t)) {
        a.skin = SKIN_TONES[tone]; break;
      }
    }
    const hair = colorBefore(t, 'hair|locks|curls|bun|ponytail|braids|afro');
    if (hair) a.hair = hair;
    if (/\bbald\b|\bshaved head\b/.test(t)) { a.hair = a.skin; a.longHair = false; }
    if (/\blong hair\b|\bponytail\b|\bbraids?\b|\bshoulder[- ]length\b|\blocs\b/.test(t)) a.longHair = true;
    if (/\bshort hair\b|\bbuzz\b|\bcrew cut\b|\bfade\b/.test(t)) a.longHair = false;
    if (/\bglasses\b|\bspecs\b|\bspectacles\b|\beyewear\b/.test(t)) a.glasses = true;
    if (/\bbeard\b|\bgoatee\b|\bmustache\b|\bmoustache\b|\bstubble\b|\bfacial hair\b/.test(t)) a.beard = true;

    const shirt = colorBefore(t, 'shirt|hoodie|sweater|sweatshirt|tee|t-shirt|jacket|polo|flannel|blouse|top|jersey|vest');
    if (shirt) a.shirt = shirt;
    const pants = colorBefore(t, 'pants|jeans|shorts|trousers|skirt|leggings|slacks|khakis');
    if (pants) a.pants = pants;
    const shoes = colorBefore(t, 'shoes|sneakers|boots|sandals|kicks');
    if (shoes) a.shoes = shoes;

    const hatColor = colorBefore(t, 'hat|cap|beanie|helmet|visor|bandana');
    if (hatColor) a.hat = hatColor;
    else if (/\bhat\b|\bcap\b|\bbeanie\b|\bvisor\b/.test(t)) a.hat = '#c4453c';
    if (/\bno hat\b/.test(t)) a.hat = null;
    if (/\bblue eyes\b/.test(t)) a.eye = '#2f6fb5';
    if (/\bgreen eyes\b/.test(t)) a.eye = '#2f7a45';
    if (/\bhazel eyes\b/.test(t)) a.eye = '#6b4a20';
    return a;
  }

  const BREEDS = [
    [/golden retriever|golden doodle|goldendoodle/, { species: 'dog', coat: '#d9a531', accent: '#f0e2c4' }],
    [/labrador|\blab\b/, { species: 'dog', coat: '#3a2f2a', accent: '#6b5a4a' }],
    [/husky|malamute/, { species: 'dog', coat: '#6f7a86', accent: '#f2f2ef' }],
    [/corgi/, { species: 'dog', coat: '#c98a4b', accent: '#f2f2ef' }],
    [/beagle/, { species: 'dog', coat: '#8a5a33', accent: '#f2f2ef' }],
    [/dachshund|weiner dog|wiener dog/, { species: 'dog', coat: '#6b3a1e', accent: '#c1500f' }],
    [/poodle/, { species: 'dog', coat: '#2b2b30', accent: '#5a5a63' }],
    [/german shepherd/, { species: 'dog', coat: '#6b4a20', accent: '#241d29' }],
    [/pug|bulldog/, { species: 'dog', coat: '#ddc7a3', accent: '#3a2b33' }],
    [/tabby/, { species: 'cat', coat: '#c1741f', accent: '#f0e2c4' }],
    [/tuxedo/, { species: 'cat', coat: '#241d29', accent: '#f2f2ef' }],
    [/calico/, { species: 'cat', coat: '#e6a63c', accent: '#f2f2ef' }],
    [/siamese/, { species: 'cat', coat: '#e0cba8', accent: '#5a4030' }],
    [/orange cat|ginger cat/, { species: 'cat', coat: '#d9741f', accent: '#f5d9a8' }],
    [/black cat/, { species: 'cat', coat: '#241d29', accent: '#3d3446' }]
  ];
  const SPECIES_WORDS = ['dog', 'puppy', 'cat', 'kitten', 'bunny', 'rabbit', 'bird', 'parrot',
    'hamster', 'guinea pig', 'fish', 'turtle', 'tortoise', 'lizard', 'gecko', 'dragon', 'horse',
    'pony', 'ferret', 'hedgehog', 'alpaca', 'goat', 'fox', 'snake'];
  const SPECIES_ALIAS = { puppy: 'dog', kitten: 'cat', bunny: 'rabbit', 'guinea pig': 'guineapig', tortoise: 'turtle', gecko: 'lizard', pony: 'horse', parrot: 'bird', snake: 'lizard' };

  /** Turn free-form text ("fluffy orange tabby cat") into a pet descriptor. */
  function parsePet(text, base) {
    const a = pet(base);
    const t = ' ' + String(text || '').toLowerCase() + ' ';
    for (const [re, patch] of BREEDS) {
      if (re.test(t)) { Object.assign(a, patch); a.ears = earsForSpecies(a.species); break; }
    }
    for (const s of SPECIES_WORDS) {
      if (new RegExp('\\b' + s + '\\b').test(t)) {
        a.species = SPECIES_ALIAS[s] || s;
        a.ears = earsForSpecies(a.species);
        break;
      }
    }
    const coat = colorBefore(t, 'fur|coat|dog|cat|pet|bird|rabbit|bunny|hamster|horse|fish|lizard|dragon|ferret|hair');
    if (coat) a.coat = coat;
    else {
      for (const c of COLOR_WORDS) {
        if (new RegExp('\\b' + c + '\\b').test(t)) { a.coat = NAMED[c]; break; }
      }
    }
    if (/\bwhite (chest|belly|paws|patch|spots?)\b|\bwith white\b/.test(t)) a.accent = '#f2f2ef';
    a.paws = shade(a.coat, -0.3);
    return a;
  }

  /** Auto-route: builds either a human or pet descriptor from text. */
  function fromText(text, kind, base) {
    return kind === 'pet' ? parsePet(text, base) : parseHuman(text, base);
  }

  // ---------- photo analysis ----------
  function imageToPixels(img, maxDim) {
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
    const w = Math.max(8, Math.round((img.naturalWidth || img.width) * scale));
    const h = Math.max(8, Math.round((img.naturalHeight || img.height) * scale));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    return { data: ctx.getImageData(0, 0, w, h).data, w, h };
  }

  function isSkin(r, g, b) {
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    return y > 55 && cb >= 77 && cb <= 130 && cr >= 133 && cr <= 175 && r > g && r > b;
  }

  function dominantColor(samples, opts) {
    opts = opts || {};
    const buckets = new Map();
    for (const [r, g, b] of samples) {
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      const sat = mx === 0 ? 0 : (mx - mn) / mx;
      if (opts.skipNeutralHighlights && mx > 245 && sat < 0.08) continue;
      const key = (r >> 4) + ',' + (g >> 4) + ',' + (b >> 4);
      let e = buckets.get(key);
      if (!e) buckets.set(key, (e = { n: 0, r: 0, g: 0, b: 0 }));
      e.n++; e.r += r; e.g += g; e.b += b;
    }
    let best = null;
    for (const e of buckets.values()) {
      const score = e.n * (opts.preferSaturated ? 1 + saturationOf(e) : 1);
      if (!best || score > best.score) best = { score, e };
    }
    if (!best) return null;
    const e = best.e;
    return rgbToHex(e.r / e.n, e.g / e.n, e.b / e.n);
  }
  function saturationOf(e) {
    const r = e.r / e.n, g = e.g / e.n, b = e.b / e.n;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    return mx === 0 ? 0 : (mx - mn) / mx;
  }

  function collect(px, x0, y0, x1, y1, filter) {
    const out = [];
    x0 = Math.max(0, Math.round(x0)); y0 = Math.max(0, Math.round(y0));
    x1 = Math.min(px.w, Math.round(x1)); y1 = Math.min(px.h, Math.round(y1));
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = (y * px.w + x) * 4;
        if (px.data[i + 3] < 128) continue;
        const r = px.data[i], g = px.data[i + 1], b = px.data[i + 2];
        if (filter && !filter(r, g, b)) continue;
        out.push([r, g, b]);
      }
    }
    return out;
  }

  /** Analyze a person photo -> human appearance descriptor. */
  function analyzeHumanPhoto(img) {
    const px = imageToPixels(img, 220);
    const skinPts = [];
    for (let y = 0; y < px.h; y++) {
      for (let x = 0; x < px.w; x++) {
        const i = (y * px.w + x) * 4;
        if (px.data[i + 3] < 128) continue;
        if (isSkin(px.data[i], px.data[i + 1], px.data[i + 2])) skinPts.push([x, y, px.data[i], px.data[i + 1], px.data[i + 2]]);
      }
    }
    const a = human();
    let box;
    if (skinPts.length > 40) {
      const xs = skinPts.map(p => p[0]).sort((m, n) => m - n);
      const ys = skinPts.map(p => p[1]).sort((m, n) => m - n);
      const q = (arr, f) => arr[Math.floor((arr.length - 1) * f)];
      box = { x0: q(xs, 0.08), x1: q(xs, 0.92), y0: q(ys, 0.05), y1: q(ys, 0.75) };
      a.skin = dominantColor(skinPts.map(p => [p[2], p[3], p[4]])) || a.skin;
    } else {
      box = { x0: px.w * 0.3, x1: px.w * 0.7, y0: px.h * 0.15, y1: px.h * 0.55 };
      a.skin = dominantColor(collect(px, box.x0, box.y0, box.x1, box.y1)) || a.skin;
    }

    const fw = box.x1 - box.x0, fh = box.y1 - box.y0;

    // hair: band above the face, plus the sides of the head
    const hairSamples = collect(px, box.x0 - fw * 0.1, box.y0 - fh * 0.55, box.x1 + fw * 0.1, box.y0 + fh * 0.12,
      (r, g, b) => !isSkin(r, g, b));
    const hair = dominantColor(hairSamples, { skipNeutralHighlights: true });
    if (hair) a.hair = hair;

    // long hair heuristic: hair-ish color found beside the face, below the chin line
    const sideL = collect(px, box.x0 - fw * 0.45, box.y1 - fh * 0.1, box.x0 - fw * 0.05, box.y1 + fh * 0.5);
    const sideR = collect(px, box.x1 + fw * 0.05, box.y1 - fh * 0.1, box.x1 + fw * 0.45, box.y1 + fh * 0.5);
    a.longHair = matchRatio(sideL.concat(sideR), a.hair, 70) > 0.28;

    // beard heuristic: non-skin dark pixels across the lower third of the face
    const chin = collect(px, box.x0 + fw * 0.2, box.y0 + fh * 0.68, box.x1 - fw * 0.2, box.y1);
    a.beard = chin.length > 20 && matchRatio(chin, a.hair, 78) > 0.35;

    // glasses heuristic: a dark horizontal streak across the eye line
    a.glasses = darkStreak(px, box);

    // shirt: band below the face
    const shirt = dominantColor(collect(px, box.x0 - fw * 0.4, box.y1 + fh * 0.35, box.x1 + fw * 0.4, Math.min(px.h, box.y1 + fh * 1.3)),
      { preferSaturated: true, skipNeutralHighlights: true });
    if (shirt) { a.shirt = shirt; a.pants = shade(shirt, -0.45); }
    a.shoes = '#2c2436';
    return a;
  }

  function matchRatio(samples, hex, tol) {
    if (!samples.length) return 0;
    const c = hexToRgb(hex);
    let n = 0;
    for (const [r, g, b] of samples) {
      if (Math.abs(r - c.r) + Math.abs(g - c.g) + Math.abs(b - c.b) < tol * 2) n++;
    }
    return n / samples.length;
  }

  function darkStreak(px, box) {
    const y0 = Math.round(box.y0 + (box.y1 - box.y0) * 0.30);
    const y1 = Math.round(box.y0 + (box.y1 - box.y0) * 0.52);
    let dark = 0, total = 0;
    for (let y = y0; y < y1; y++) {
      for (let x = Math.round(box.x0); x < Math.round(box.x1); x++) {
        const i = (y * px.w + x) * 4;
        if (i < 0 || i >= px.data.length) continue;
        total++;
        const l = (0.299 * px.data[i] + 0.587 * px.data[i + 1] + 0.114 * px.data[i + 2]) / 255;
        if (l < 0.30) dark++;
      }
    }
    return total > 30 && dark / total > 0.26;
  }

  /** Analyze a pet photo -> pet appearance descriptor (keeps species/ears from `base`). */
  function analyzePetPhoto(img, base) {
    const px = imageToPixels(img, 200);
    const center = collect(px, px.w * 0.22, px.h * 0.18, px.w * 0.78, px.h * 0.85);
    const border = collect(px, 0, 0, px.w, px.h * 0.08).concat(collect(px, 0, px.h * 0.94, px.w, px.h));
    const bg = dominantColor(border);
    const bgc = bg ? hexToRgb(bg) : null;
    const fg = center.filter(([r, g, b]) => !bgc || (Math.abs(r - bgc.r) + Math.abs(g - bgc.g) + Math.abs(b - bgc.b)) > 90);
    const a = pet(base);
    a.coat = dominantColor(fg.length > 50 ? fg : center, { skipNeutralHighlights: true }) || a.coat;
    const rest = (fg.length > 50 ? fg : center).filter(([r, g, b]) => matchRatio([[r, g, b]], a.coat, 70) === 0);
    a.accent = dominantColor(rest) || shade(a.coat, 0.35);
    a.paws = shade(a.coat, -0.3);
    a.nose = shade(a.coat, -0.55);
    return a;
  }

  function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Could not decode that image.'));
        img.src = reader.result;
      };
      reader.onerror = () => reject(new Error('Could not read that file.'));
      reader.readAsDataURL(file);
    });
  }

  global.Appearance = {
    hexToRgb, rgbToHex, shade, luma, readableOn,
    human, pet, earsForSpecies, DEFAULT_HUMAN, DEFAULT_PET,
    parseHuman, parsePet, fromText, findColor, NAMED, SKIN_TONES,
    analyzeHumanPhoto, analyzePetPhoto, loadImageFromFile
  };
})(window);
