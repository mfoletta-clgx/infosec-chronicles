/* Procedural 16x16 pixel-art sprite sheets built from appearance descriptors. */
(function (global) {
  'use strict';

  const S = 16;               // sprite cell size
  const DIRS = ['down', 'left', 'right', 'up'];
  const FRAMES = 4;           // 0 idle, 1 step-a, 2 idle, 3 step-b
  const OUTLINE = '#1a1220';
  const shade = Appearance.shade;

  function newCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = false;
    return { canvas: c, ctx };
  }

  function px(ctx, x, y, w, h, color) {
    if (!color) return;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }

  /** Add a 1px dark outline around every opaque cluster in the cell. */
  function outlineCell(ctx, ox, oy) {
    const img = ctx.getImageData(ox, oy, S, S);
    const src = new Uint8ClampedArray(img.data);
    const at = (x, y) => (x < 0 || y < 0 || x >= S || y >= S) ? 0 : src[(y * S + x) * 4 + 3];
    const o = Appearance.hexToRgb(OUTLINE);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const i = (y * S + x) * 4;
        if (src[i + 3] > 0) continue;
        if (at(x - 1, y) > 0 || at(x + 1, y) > 0 || at(x, y - 1) > 0 || at(x, y + 1) > 0) {
          img.data[i] = o.r; img.data[i + 1] = o.g; img.data[i + 2] = o.b; img.data[i + 3] = 255;
        }
      }
    }
    ctx.putImageData(img, ox, oy);
  }

  // ------------------------------------------------------------------ humans
  function drawHuman(ctx, a, dir, frame) {
    const skin = a.skin, skinD = shade(skin, -0.16);
    const hair = a.hair, hairD = shade(hair, -0.28), hairL = shade(hair, 0.16);
    const shirt = a.shirt, shirtD = shade(shirt, -0.2);
    const pants = a.pants, shoes = a.shoes;
    const back = dir === 'up';
    const side = dir === 'left' || dir === 'right';

    // walk cycle offsets
    const step = (frame === 1) ? 1 : (frame === 3) ? -1 : 0;
    const bob = (frame === 1 || frame === 3) ? 1 : 0;

    // ---- legs + shoes
    const legTop = 12;
    const lLift = step > 0 ? 1 : 0;
    const rLift = step < 0 ? 1 : 0;
    const lx = side ? 6 : 5, rx = side ? 8 : 9;
    px(ctx, lx, legTop - lLift, 2, 2, pants);
    px(ctx, rx, legTop - rLift, 2, 2, pants);
    px(ctx, lx, legTop + 2 - lLift, 2, 2, shoes);
    px(ctx, rx, legTop + 2 - rLift, 2, 2, shoes);

    const top = bob; // whole upper body bobs down 1px mid-stride
    // ---- torso
    if (side) px(ctx, 5, 8 + top, 6, 4, shirt);
    else px(ctx, 4, 8 + top, 8, 4, shirt);
    px(ctx, 4, 11 + top, 8, 1, shirtD);

    // ---- arms
    const swing = side ? step : 0;
    if (side) {
      const ax = dir === 'right' ? 9 : 5;
      px(ctx, ax, 8 + top + (swing > 0 ? 1 : 0), 2, 3, shirt);
      px(ctx, ax, 11 + top + (swing > 0 ? 1 : 0), 2, 1, skin);
    } else {
      px(ctx, 3, 8 + top, 1, 3, shirt);
      px(ctx, 12, 8 + top, 1, 3, shirt);
      px(ctx, 3, 11 + top, 1, 1, skin);
      px(ctx, 12, 11 + top, 1, 1, skin);
    }

    // ---- head
    const hy = 2 + top;
    px(ctx, 5, hy, 6, 6, skin);
    px(ctx, 5, hy + 5, 6, 1, skinD);

    // ---- face
    if (!back) {
      if (side) {
        px(ctx, dir === 'right' ? 9 : 6, hy + 3, 1, 2, a.eye);
        px(ctx, dir === 'right' ? 11 : 4, hy + 3, 1, 1, skin); // nose bump
      } else {
        px(ctx, 6, hy + 3, 1, 2, a.eye);
        px(ctx, 9, hy + 3, 1, 2, a.eye);
        px(ctx, 7, hy + 5, 2, 1, shade(skin, -0.35));
      }
    }

    // ---- hair
    const bald = hair === skin;
    if (!bald) {
      if (back) {
        px(ctx, 4, hy - 1, 8, 7, hair);
        if (a.longHair) px(ctx, 4, hy + 6, 8, 3, hairD);
      } else if (side) {
        const front = dir === 'right' ? 1 : 0;
        px(ctx, 4, hy - 1, 8, 3, hair);
        px(ctx, front ? 4 : 10, hy + 2, 2, a.longHair ? 7 : 3, hair);
        px(ctx, front ? 5 : 9, hy + 2, 2, 1, hairL);
      } else {
        px(ctx, 4, hy - 1, 8, 3, hair);
        px(ctx, 4, hy + 2, 1, a.longHair ? 7 : 3, hair);
        px(ctx, 11, hy + 2, 1, a.longHair ? 7 : 3, hair);
        px(ctx, 5, hy + 1, 6, 1, hairL);
        if (a.longHair) { px(ctx, 4, hy + 8, 1, 1, hairD); px(ctx, 11, hy + 8, 1, 1, hairD); }
      }
    }

    // ---- beard
    if (a.beard && !back) {
      px(ctx, 5, hy + 5, 6, 2, hairD);
      if (!side) px(ctx, 7, hy + 5, 2, 1, shade(hairD, 0.2));
    }

    // ---- glasses
    if (a.glasses && !back) {
      const g = '#3a3f52', lens = '#cfe8f2';
      if (side) {
        const lx2 = dir === 'right' ? 8 : 6;
        px(ctx, lx2, hy + 3, 3, 2, lens);
        px(ctx, lx2, hy + 2, 3, 1, g);
        px(ctx, dir === 'right' ? 9 : 6, hy + 3, 1, 2, a.eye);
      } else {
        px(ctx, 5, hy + 3, 2, 2, lens);
        px(ctx, 9, hy + 3, 2, 2, lens);
        px(ctx, 5, hy + 2, 2, 1, g);
        px(ctx, 9, hy + 2, 2, 1, g);
        px(ctx, 7, hy + 3, 2, 1, g);
        px(ctx, 6, hy + 3, 1, 1, a.eye);
        px(ctx, 9, hy + 3, 1, 1, a.eye);
      }
    }

    // ---- hat
    if (a.hat) {
      const hc = a.hat, hd = shade(hc, -0.3);
      px(ctx, 4, hy - 2, 8, 3, hc);
      px(ctx, 5, hy - 3, 6, 1, hc);
      if (side) px(ctx, dir === 'right' ? 11 : 2, hy + 1, 3, 1, hd);
      else px(ctx, 3, hy + 1, 10, 1, hd);
    }
  }

  // -------------------------------------------------------------------- pets
  // Palette keys: b coat, a accent, d dark coat, e eye, n nose, w white, p pink
  const PET_ART = {
    dog: [
      '................',
      '................',
      '................',
      '...........bb...',
      '.b........bbbb..',
      '.bb......bbbbbb.',
      '.bd.....bbbbbbb.',
      '..bbbbbbbbbbebn.',
      '..bbbbbbbbbbbbn.',
      '..baaaaaaaabbb..',
      '..bb....bb......',
      '..aa....aa......',
      '................',
      '................',
      '................',
      '................'
    ],
    cat: [
      '................',
      '................',
      '................',
      '..........b..b..',
      '.......b..bb.bb.',
      '.bb....bb.bbbbb.',
      '.b.b...bbbbbbbb.',
      '.b.b...bbbbebnb.',
      '.bb....bbbbbbbb.',
      '..bbbbbbbaaabbb.',
      '..bb....bb......',
      '..aa....aa......',
      '................',
      '................',
      '................',
      '................'
    ],
    rabbit: [
      '................',
      '................',
      '.........b...b..',
      '.........bp.pb..',
      '.........bp.pb..',
      '........bbbbbb..',
      '.......bbbbebb..',
      '.bb...bbbbbbbn..',
      'baab.bbbbbbbb...',
      '.bbbbbbbaaabb...',
      '..bbb..bb.bb....',
      '..aa...aa.aa....',
      '................',
      '................',
      '................',
      '................'
    ],
    bird: [
      '................',
      '................',
      '................',
      '.........bbb....',
      '........bbbbb...',
      '.......bbbebbn..',
      '.bb...bbbbbbbn..',
      '.bbb.bbaaabbb...',
      '..bbbbbaaabb....',
      '...bbbbbbbb.....',
      '.....bb.bb......',
      '.....pp.pp......',
      '................',
      '................',
      '................',
      '................'
    ],
    hamster: [
      '................',
      '................',
      '................',
      '................',
      '.....b......b...',
      '....bbbbbbbbbb..',
      '...bbbbbbbbbbbb.',
      '...bbbbbbbbebnb.',
      '...bbaaaaabbbbb.',
      '....bbaaaaabbb..',
      '.....bb...bb....',
      '.....aa...aa....',
      '................',
      '................',
      '................',
      '................'
    ],
    fish: [
      '................',
      '................',
      '................',
      '................',
      '.....b..........',
      '.bb..bb....bbb..',
      '.bbb.bbbbbbbbbb.',
      '.bbbbbbaaabbebb.',
      '.bbb.bbbbbbbbbb.',
      '.bb..bb....bbb..',
      '.....b..........',
      '................',
      '................',
      '................',
      '................',
      '................'
    ],
    turtle: [
      '................',
      '................',
      '................',
      '................',
      '......dddd......',
      '.....dbbbbd.....',
      '....ddbbbbdd....',
      '...bdddddddbben.',
      '...bbbbbbbbbbbb.',
      '....bb....bb....',
      '....aa....aa....',
      '................',
      '................',
      '................',
      '................',
      '................'
    ],
    lizard: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '.bb.........bbb.',
      '.bbb.......bbbbb',
      '..bbbbbbbbbbbebn',
      '...bbbbbbbbbbbbb',
      '..bb..bb..bbbb..',
      '..aa..aa..aa....',
      '................',
      '................',
      '................',
      '................',
      '................'
    ],
    dragon: [
      '................',
      '................',
      '.........d..d...',
      '.b.......dbbd...',
      '.bb.....bbbbbb..',
      '.bdb...bbbbbbbb.',
      '..bdbbbbbbbebbn.',
      '..bbbbbbbbbbbbn.',
      '..bbaaaaaabbbb..',
      '.bbbbb..bbb.....',
      '..bb....bb......',
      '..aa....aa......',
      '................',
      '................',
      '................',
      '................'
    ],
    horse: [
      '................',
      '................',
      '..........dd....',
      '..........bbd...',
      '.d.......bbbbb..',
      '.dbb.....bbbebn.',
      '.dbbbbbbbbbbbbn.',
      '..bbbbbbbbbbbb..',
      '..bbbbbbbbbb....',
      '..bb....bb......',
      '..bb....bb......',
      '..aa....aa......',
      '................',
      '................',
      '................',
      '................'
    ],
    ferret: [
      '................',
      '................',
      '................',
      '................',
      '.b.........bb...',
      '.bb.......bbbbb.',
      '.bbb.....bbbebn.',
      '..bbbbbbbbbbbbn.',
      '...bbaaaaabbbb..',
      '...bb...bb......',
      '...aa...aa......',
      '................',
      '................',
      '................',
      '................',
      '................'
    ],
    hedgehog: [
      '................',
      '................',
      '................',
      '....d.d.d.d.....',
      '...ddddddddd....',
      '..dddddddddddb..',
      '..bbbbbbbbbbbbn.',
      '..bbaaaaabbbebn.',
      '..bbbbbbbbbbbb..',
      '...bb...bb......',
      '...aa...aa......',
      '................',
      '................',
      '................',
      '................',
      '................'
    ],
    alpaca: [
      '................',
      '................',
      '..........dd....',
      '.........bbbb...',
      '.........bbebn..',
      '........bbbbbn..',
      '.bbbbbbbbbb.....',
      'bbbbbbbbbbb.....',
      'bbbbbbbbbbb.....',
      '.bb.....bb......',
      '.bb.....bb......',
      '.aa.....aa......',
      '................',
      '................',
      '................',
      '................'
    ],
    goat: [
      '................',
      '................',
      '.........d..d...',
      '..........dd....',
      '.........bbbb...',
      '.b.......bbebn..',
      '.bbbbbbbbbbbbn..',
      '.bbbbbbbbbbb....',
      '.bbbbbbbbbbb....',
      '..bb....bb......',
      '..bb....bb......',
      '..aa....aa......',
      '................',
      '................',
      '................',
      '................'
    ],
    fox: [
      '................',
      '................',
      '................',
      '.........b...b..',
      '.b.......bb.bb..',
      '.bb.....bbbbbbb.',
      '.bab...bbbbbebn.',
      '.baab.bbbbbbbbn.',
      '..bbbbbbaaabbb..',
      '...bbb..bb.bb...',
      '...aa...aa.aa...',
      '................',
      '................',
      '................',
      '................',
      '................'
    ],
    guineapig: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '....bbbbbbbbb...',
      '...bbbbbbbbbbb..',
      '...bbaaabbbbebn.',
      '...bbaaaabbbbbn.',
      '....bbbbbbbbbb..',
      '.....bb...bb....',
      '.....aa...aa....',
      '................',
      '................',
      '................',
      '................'
    ]
  };
  PET_ART.bunny = PET_ART.rabbit;
  PET_ART.puppy = PET_ART.dog;
  PET_ART.kitten = PET_ART.cat;
  PET_ART.parrot = PET_ART.bird;
  PET_ART.tortoise = PET_ART.turtle;
  PET_ART.gecko = PET_ART.lizard;
  PET_ART.pony = PET_ART.horse;

  function drawPet(ctx, a, dir, frame) {
    const art = PET_ART[String(a.species || 'dog').toLowerCase()] || PET_ART.dog;
    const pal = {
      b: a.coat,
      a: a.accent,
      d: shade(a.coat, -0.3),
      e: a.eye || '#2b1d3a',
      n: a.nose || shade(a.coat, -0.55),
      p: '#e88fb8',
      w: '#f2f2ef'
    };
    // Frame 1/3 hop: whole body up 1px and legs shifted.
    const hop = (frame === 1) ? -1 : (frame === 3) ? 1 : 0;
    for (let y = 0; y < S; y++) {
      const row = art[y] || '';
      for (let x = 0; x < S; x++) {
        const ch = row[x];
        if (!ch || ch === '.') continue;
        const isLeg = y >= 9;
        const dx = isLeg ? (frame === 1 ? 1 : frame === 3 ? -1 : 0) : 0;
        const dy = isLeg ? 0 : hop;
        px(ctx, x + dx, y + dy, 1, 1, pal[ch] || pal.b);
      }
    }
    // Front/back views: nudge so it reads as facing the camera.
    if (dir === 'up' || dir === 'down') {
      // nothing extra; side art doubles as 3/4 view in this art style
    }
  }

  // --------------------------------------------------------------- sheet API
  /**
   * Builds a sprite sheet canvas: 4 frames across, 4 directions down.
   * Order of rows matches DIRS = down, left, right, up.
   */
  function buildSheet(appearance) {
    const { canvas, ctx } = newCanvas(S * FRAMES, S * DIRS.length);
    const tmp = newCanvas(S, S);
    const isPet = appearance.kind === 'pet' || !!appearance.species;

    DIRS.forEach((dir, row) => {
      for (let f = 0; f < FRAMES; f++) {
        tmp.ctx.clearRect(0, 0, S, S);
        const mirror = dir === 'left';
        const drawDir = mirror ? 'right' : dir;
        if (isPet) drawPet(tmp.ctx, appearance, drawDir, f);
        else drawHuman(tmp.ctx, appearance, drawDir, f);

        ctx.save();
        if (mirror) {
          ctx.translate(f * S + S, row * S);
          ctx.scale(-1, 1);
          ctx.drawImage(tmp.canvas, 0, 0);
        } else {
          ctx.drawImage(tmp.canvas, f * S, row * S);
        }
        ctx.restore();
      }
    });

    DIRS.forEach((_, row) => {
      for (let f = 0; f < FRAMES; f++) outlineCell(ctx, f * S, row * S);
    });
    return canvas;
  }

  const sheetCache = new Map();
  function sheetFor(appearance) {
    const key = JSON.stringify(appearance);
    let s = sheetCache.get(key);
    if (!s) { s = buildSheet(appearance); sheetCache.set(key, s); }
    return s;
  }

  function dirRow(dir) {
    const i = DIRS.indexOf(dir);
    return i < 0 ? 0 : i;
  }

  /** Draw one sprite frame into a destination context at integer world coords. */
  function draw(ctx, appearance, x, y, dir, frame) {
    const sheet = sheetFor(appearance);
    ctx.drawImage(sheet, (frame % FRAMES) * S, dirRow(dir) * S, S, S, Math.round(x), Math.round(y), S, S);
  }

  /** Render a scaled preview (e.g. for the roster UI) into an existing canvas. */
  function renderPreview(canvasEl, appearance, opts) {
    opts = opts || {};
    const scale = opts.scale || 5;
    const dir = opts.dir || 'down';
    const frame = opts.frame || 0;
    canvasEl.width = S * scale;
    canvasEl.height = S * scale;
    const ctx = canvasEl.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    const sheet = sheetFor(appearance);
    ctx.drawImage(sheet, (frame % FRAMES) * S, dirRow(dir) * S, S, S, 0, 0, S * scale, S * scale);
  }

  /** Small square portrait for dialogue boxes. */
  function portraitDataURL(appearance, scale) {
    scale = scale || 4;
    const { canvas, ctx } = newCanvas(S * scale, S * scale);
    ctx.imageSmoothingEnabled = false;
    const sheet = sheetFor(appearance);
    // zoom on the head area for humans, whole body for pets
    const isPet = appearance.kind === 'pet' || !!appearance.species;
    if (isPet) ctx.drawImage(sheet, 0, 0, S, S, 0, 0, S * scale, S * scale);
    else ctx.drawImage(sheet, 2, 0, 12, 12, 0, 0, S * scale, S * scale);
    return canvas.toDataURL();
  }

  global.Sprites = { S, DIRS, FRAMES, buildSheet, sheetFor, draw, renderPreview, portraitDataURL, newCanvas, px, PET_ART };
})(window);
