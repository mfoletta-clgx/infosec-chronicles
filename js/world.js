/* Tile world: themed maps, procedural props, collision. */
(function (global) {
  'use strict';

  const T = 16;            // tile size
  const COLS = 20;
  const ROWS = 15;
  const W = COLS * T;      // 320
  const H = ROWS * T;      // 240
  const shade = Appearance.shade;

  const THEMES = {
    beach: {
      label: 'Sun-Baked Shoreline',
      ground: '#e8d3a0', groundAlt: '#dbc389', edge: '#3fa6d1', edgeAlt: '#2b7fb0',
      sky: '#7fd3f0', props: ['palm', 'rock', 'umbrella', 'crate', 'tiki'], edgeRows: 2, shore: true
    },
    office: {
      label: 'Fluorescent Fortress',
      ground: '#5b5468', groundAlt: '#524b5f', edge: '#2c2836', edgeAlt: '#231f2c',
      sky: '#2c2836', props: ['desk', 'plant', 'rack', 'crate', 'printer'], edgeRows: 0
    },
    forest: {
      label: 'Packet Pines',
      ground: '#4a8a3c', groundAlt: '#3f7a33', edge: '#26512a', edgeAlt: '#1d4021',
      sky: '#26512a', props: ['tree', 'bush', 'rock', 'stump', 'campfire'], edgeRows: 0
    },
    snow: {
      label: 'Frozen Firewall',
      ground: '#e2eaf2', groundAlt: '#d0dbe8', edge: '#9fb4c9', edgeAlt: '#8aa0b8',
      sky: '#cfe0ef', props: ['pine', 'snowman', 'rock', 'crate', 'igloo'], edgeRows: 0
    },
    datacenter: {
      label: 'The Server Vault',
      ground: '#2f2a3f', groundAlt: '#272238', edge: '#1a1626', edgeAlt: '#141020',
      sky: '#1a1626', props: ['rack', 'console', 'crate', 'cable', 'rack'], edgeRows: 0
    },
    space: {
      label: 'Orbital Uplink',
      ground: '#241d3a', groundAlt: '#1e1832', edge: '#0f0b1c', edgeAlt: '#0a0714',
      sky: '#0f0b1c', props: ['console', 'crate', 'satellite', 'rock', 'cable'], edgeRows: 0
    },
    city: {
      label: 'Neon Grid',
      ground: '#54506a', groundAlt: '#4a4660', edge: '#2a2740', edgeAlt: '#211e33',
      sky: '#2a2740', props: ['crate', 'hydrant', 'plant', 'console', 'bench'], edgeRows: 0
    },
    mountain: {
      label: 'Air-Gapped Peaks',
      ground: '#8a7f6a', groundAlt: '#7b715e', edge: '#5a5245', edgeAlt: '#484036',
      sky: '#5a5245', props: ['rock', 'pine', 'stump', 'crate', 'rock'], edgeRows: 0
    },
    boat: {
      label: 'The Open Water',
      ground: '#c99a63', groundAlt: '#b3874f', edge: '#2b7fb0', edgeAlt: '#1f6a97',
      sky: '#2b7fb0', props: ['cooler', 'crate', 'bucket'], edgeRows: 0, custom: 'boat'
    },
    themepark: {
      label: 'The Happiest Attack Surface On Earth',
      ground: '#c3b39a', groundAlt: '#b0a087', edge: '#8fa6c4', edgeAlt: '#7c92ae',
      sky: '#7fd3f0', props: ['topiary', 'churrocart', 'balloons', 'queuepost', 'trashcan', 'ridesign', 'lamppost'],
      edgeRows: 2, castle: true, density: 30,
      signText: 'DISNEY-LAND',
      fixed: [
        { c: 2, r: 3, w: 4, h: 4, name: 'carousel' },
        { c: 8, r: 2, w: 6, h: 2, name: 'parksign' }
      ]
    }
  };

  // Deck bounds in tiles for the boat map (inclusive).
  const DECK = { c0: 4, c1: 15, r0: 4, r1: 12 };

  // ---------------------------------------------------------------- prop art
  function drawProp(ctx, name, x, y, rnd) {
    const px = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); };
    switch (name) {
      case 'palm':
        px(6, 6, 3, 10, '#8a5a33'); px(7, 6, 1, 10, '#a5713f');
        px(1, 2, 6, 2, '#3f9c4a'); px(8, 2, 7, 2, '#3f9c4a');
        px(2, 4, 5, 2, '#2f7a38'); px(9, 4, 5, 2, '#2f7a38');
        px(5, 0, 6, 3, '#4bb058'); px(6, 5, 3, 2, '#b8862f');
        break;
      case 'rock':
        px(2, 7, 12, 7, '#8d8794'); px(3, 5, 9, 3, '#a09aa8');
        px(4, 6, 4, 2, '#b7b1bf'); px(2, 13, 12, 2, '#6c6676');
        break;
      case 'umbrella':
        px(7, 5, 2, 11, '#c9c4d2');
        px(1, 1, 14, 3, '#e0553f'); px(3, 0, 10, 2, '#f0705a');
        px(2, 4, 5, 2, '#e0553f'); px(9, 4, 5, 2, '#c94a36');
        break;
      case 'crate':
        px(2, 4, 12, 11, '#a5713f'); px(3, 5, 10, 9, '#c08850');
        px(3, 9, 10, 1, '#8a5a33'); px(7, 5, 2, 9, '#8a5a33');
        break;
      case 'tiki':
        px(1, 3, 14, 9, '#8a5a33'); px(1, 1, 14, 3, '#c1500f');
        px(2, 4, 12, 2, '#c99a63'); px(3, 7, 3, 3, '#f0e2c4'); px(10, 7, 3, 3, '#f0e2c4');
        px(1, 12, 14, 3, '#6b3a1e');
        break;
      case 'desk':
        px(1, 6, 14, 3, '#8a6b4a'); px(1, 9, 14, 5, '#6b5238');
        px(3, 1, 10, 6, '#2c2836'); px(4, 2, 8, 4, '#4bd0c8'); px(5, 3, 3, 1, '#a8f0ea');
        break;
      case 'rack':
        px(1, 1, 14, 14, '#2a2735'); px(2, 2, 12, 12, '#3c3849');
        for (let i = 0; i < 4; i++) {
          px(3, 3 + i * 3, 10, 2, '#221f2c');
          px(4, 3 + i * 3, 1, 1, i % 2 ? '#4bd07a' : '#d0a24b');
          px(6, 3 + i * 3, 1, 1, '#4b8fd0');
        }
        break;
      case 'console':
        px(2, 5, 12, 9, '#2b2740'); px(3, 6, 10, 6, '#3fd0c8');
        px(4, 7, 6, 1, '#0f2b2a'); px(4, 9, 4, 1, '#0f2b2a');
        px(2, 14, 12, 2, '#1d1a2c');
        break;
      case 'plant':
        px(5, 10, 6, 5, '#a5713f'); px(5, 10, 6, 1, '#c08850');
        px(3, 4, 4, 6, '#3f9c4a'); px(9, 4, 4, 6, '#3f9c4a'); px(6, 1, 4, 8, '#4bb058');
        break;
      case 'tree':
        px(6, 10, 4, 6, '#6b4a2a');
        px(2, 2, 12, 8, '#2f7a38'); px(4, 0, 8, 3, '#3f9c4a'); px(4, 3, 5, 3, '#4bb058');
        px(1, 5, 3, 4, '#2f7a38'); px(12, 5, 3, 4, '#2f7a38');
        break;
      case 'pine':
        px(7, 12, 2, 4, '#6b4a2a');
        px(6, 1, 4, 3, '#2f6a4a'); px(4, 4, 8, 3, '#3a7d55'); px(2, 7, 12, 5, '#2f6a4a');
        px(5, 8, 4, 2, '#4b9668');
        break;
      case 'bush':
        px(2, 6, 12, 8, '#2f7a38'); px(4, 4, 8, 4, '#3f9c4a'); px(5, 6, 3, 2, '#4bb058');
        px(9, 9, 2, 2, '#c94a36');
        break;
      case 'stump':
        px(3, 8, 10, 7, '#6b4a2a'); px(3, 6, 10, 3, '#8a6b4a'); px(6, 7, 4, 1, '#a5844f');
        break;
      case 'campfire':
        px(2, 11, 12, 3, '#6b4a2a'); px(4, 9, 8, 3, '#8a6b4a');
        px(6, 4, 4, 6, '#e0553f'); px(7, 2, 2, 5, '#f0a53f'); px(7, 6, 2, 3, '#f7e07a');
        break;
      case 'snowman':
        px(4, 8, 8, 7, '#f7fbff'); px(5, 3, 6, 6, '#f7fbff');
        px(6, 5, 1, 1, '#241d29'); px(9, 5, 1, 1, '#241d29'); px(7, 6, 2, 1, '#d9741f');
        px(4, 2, 8, 2, '#c94a36'); px(1, 8, 3, 1, '#6b4a2a'); px(12, 8, 3, 1, '#6b4a2a');
        break;
      case 'igloo':
        px(1, 5, 14, 10, '#e8f0f8'); px(2, 3, 12, 3, '#f7fbff');
        px(6, 9, 4, 6, '#9fb4c9'); px(2, 8, 12, 1, '#cddbe8');
        break;
      case 'satellite':
        px(6, 6, 4, 9, '#9a94a8'); px(1, 3, 5, 5, '#4b8fd0'); px(10, 3, 5, 5, '#4b8fd0');
        px(2, 4, 3, 3, '#7fc4f0'); px(11, 4, 3, 3, '#7fc4f0'); px(5, 13, 6, 2, '#6c6676');
        break;
      case 'cable':
        px(0, 6, 16, 2, '#241f30'); px(0, 8, 16, 1, '#3c3849');
        px(3, 5, 2, 4, '#d04b6b'); px(11, 5, 2, 4, '#4bd07a');
        break;
      case 'printer':
        px(1, 5, 14, 8, '#b9b4c4'); px(2, 6, 12, 3, '#8d8794');
        px(3, 10, 10, 2, '#f2f2ef'); px(12, 6, 1, 1, '#4bd07a');
        break;
      case 'hydrant':
        px(5, 4, 6, 10, '#c94a36'); px(4, 6, 8, 2, '#e0553f');
        px(6, 2, 4, 3, '#c94a36'); px(3, 14, 10, 2, '#8d8794');
        break;
      case 'bench':
        px(1, 6, 14, 3, '#8a6b4a'); px(1, 10, 14, 2, '#6b5238');
        px(2, 9, 2, 6, '#5a5245'); px(12, 9, 2, 6, '#5a5245');
        break;
      case 'cooler':
        px(2, 5, 12, 9, '#e8eef2'); px(2, 5, 12, 2, '#c94a36');
        px(2, 12, 12, 2, '#9fb4c9'); px(6, 8, 4, 1, '#9fb4c9');
        break;
      case 'bucket':
        px(4, 7, 8, 7, '#4b8fd0'); px(4, 6, 8, 2, '#6fb7e8');
        px(5, 9, 6, 3, '#2f6a9c'); px(3, 5, 1, 3, '#8d8794'); px(12, 5, 1, 3, '#8d8794');
        break;
      case 'cabin':
        px(0, 2, 16, 13, '#e8eef2'); px(0, 0, 16, 3, '#c94a36');
        px(2, 5, 5, 5, '#3fd0c8'); px(9, 5, 5, 5, '#3fd0c8');
        px(2, 5, 5, 1, '#9fb4c9'); px(9, 5, 5, 1, '#9fb4c9');
        px(0, 13, 16, 2, '#9fb4c9');
        break;
      case 'lifering':
        px(3, 3, 10, 10, '#f2f2ef'); px(5, 5, 6, 6, '#2b7fb0');
        px(3, 3, 4, 3, '#e0553f'); px(9, 10, 4, 3, '#e0553f');
        break;
      case 'topiary':
        px(7, 11, 2, 5, '#6b4a2a'); px(5, 14, 6, 2, '#8a6b4a');
        px(3, 3, 10, 9, '#2f7a38'); px(4, 1, 8, 4, '#3f9c4a'); px(5, 3, 4, 3, '#4bb058');
        px(4, 9, 3, 2, '#276a30'); px(10, 6, 2, 2, '#4bb058');
        break;
      case 'churrocart':
        px(1, 7, 14, 7, '#c99a63'); px(1, 7, 14, 2, '#a5713f');
        px(0, 1, 16, 4, '#e0553f');
        for (let i = 0; i < 4; i++) px(1 + i * 4, 1, 2, 4, '#f2f2ef');
        px(3, 5, 1, 3, '#8d8794'); px(12, 5, 1, 3, '#8d8794');
        px(3, 14, 3, 2, '#3a3a42'); px(10, 14, 3, 2, '#3a3a42');
        px(6, 9, 5, 2, '#d9a531');
        break;
      case 'balloons':
        px(2, 1, 4, 5, '#c94a36'); px(7, 0, 4, 5, '#e8c94a'); px(11, 2, 4, 5, '#4b8fd0');
        px(3, 1, 2, 2, '#e0705a'); px(8, 0, 2, 2, '#f7e07a'); px(12, 2, 2, 2, '#7fc4f0');
        px(4, 6, 1, 6, '#f2f2ef'); px(8, 5, 1, 7, '#f2f2ef'); px(12, 7, 1, 5, '#f2f2ef');
        px(6, 11, 5, 5, '#8d8794');
        break;
      case 'queuepost':
        px(6, 3, 4, 3, '#d9a531'); px(7, 5, 2, 9, '#b9b4c4');
        px(5, 14, 6, 2, '#8d8794'); px(0, 6, 6, 2, '#c94a36'); px(10, 6, 6, 2, '#c94a36');
        break;
      case 'trashcan':
        px(3, 4, 10, 11, '#2f7a38'); px(2, 2, 12, 3, '#276a30');
        px(6, 3, 4, 1, '#14401c'); px(5, 7, 1, 6, '#4bb058'); px(10, 7, 1, 6, '#4bb058');
        break;
      case 'ridesign':
        px(7, 8, 2, 8, '#8a6b4a'); px(5, 15, 6, 1, '#6b4a2a');
        px(1, 1, 14, 7, '#4b8fd0'); px(2, 2, 12, 5, '#7fc4f0');
        px(3, 3, 8, 1, '#22345e'); px(3, 5, 5, 1, '#22345e'); px(11, 3, 2, 3, '#e8c94a');
        break;
      case 'lamppost':
        px(7, 4, 2, 11, '#3a3a42'); px(5, 15, 6, 1, '#2b2b30');
        px(5, 1, 6, 4, '#f7e07a'); px(6, 0, 4, 2, '#3a3a42'); px(6, 2, 4, 2, '#fff7c9');
        break;
      default:
        px(3, 3, 10, 10, '#8d8794');
    }
    if (rnd && rnd() < 0.35) { ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(x, y + 14, T, 2); }
  }

  // ------------------------------------------------------------- generation
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashString(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function createMap(themeName, seedStr, reserved) {
    const theme = THEMES[themeName] || THEMES.forest;
    const rnd = mulberry32(hashString(seedStr || 'default'));
    const solid = [];
    const props = [];
    for (let r = 0; r < ROWS; r++) {
      solid.push(new Array(COLS).fill(false));
      props.push(new Array(COLS).fill(null));
    }

    if (theme.custom === 'boat') return buildBoat(theme, themeName, solid, props, seedStr, reserved);

    // impassable border band
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < theme.edgeRows; r++) solid[r][c] = true;
    }
    for (let c = 0; c < COLS; c++) { solid[0][c] = true; solid[ROWS - 1][c] = true; }
    for (let r = 0; r < ROWS; r++) { solid[r][0] = true; solid[r][COLS - 1] = true; }

    const isReserved = (c, r) => (reserved || []).some(p => Math.abs(p.c - c) <= 1 && Math.abs(p.r - r) <= 1);

    // landmark footprints are blocked out before anything else is scattered
    (theme.fixed || []).forEach(f => {
      for (let r = f.r; r < f.r + f.h; r++) {
        for (let c = f.c; c < f.c + f.w; c++) {
          if (r > 0 && c > 0 && r < ROWS - 1 && c < COLS - 1) solid[r][c] = true;
        }
      }
    });

    // scatter props
    const inner = { c0: 1, c1: COLS - 1, r0: Math.max(1, theme.edgeRows), r1: ROWS - 1 };
    const count = (theme.density || 26) + Math.floor(rnd() * 8);
    for (let i = 0; i < count; i++) {
      const c = inner.c0 + Math.floor(rnd() * (inner.c1 - inner.c0));
      const r = inner.r0 + Math.floor(rnd() * (inner.r1 - inner.r0));
      if (solid[r][c] || isReserved(c, r)) continue;
      const name = theme.props[Math.floor(rnd() * theme.props.length)];
      props[r][c] = name;
      solid[r][c] = true;
    }

    // decorative walls along the top edge for indoor themes
    if (theme.edgeRows === 0 && (themeName === 'office' || themeName === 'datacenter')) {
      for (let c = 1; c < COLS - 1; c++) { if (!isReserved(c, 1) && rnd() < 0.35) { props[1][c] = 'rack'; solid[1][c] = true; } }
    }

    ensureConnected(solid, props, reserved || []);

    const map = {
      theme, themeName: THEMES[themeName] ? themeName : 'forest',
      solid, props, cols: COLS, rows: ROWS, tile: T, width: W, height: H,
      rnd: mulberry32(hashString((seedStr || '') + 'paint'))
    };
    map.background = paint(map);
    return map;
  }

  /** The boat deck is hand-authored instead of scattered, so it reads as a vessel. */
  function buildBoat(theme, themeName, solid, props, seedStr, reserved) {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) solid[r][c] = true;
    for (let r = DECK.r0; r <= DECK.r1; r++) for (let c = DECK.c0; c <= DECK.c1; c++) solid[r][c] = false;

    const taken = (c, r) => (reserved || []).some(p => p.c === c && p.r === r);
    for (let r = 4; r <= 5; r++) {
      for (let c = 6; c <= 9; c++) if (!taken(c, r)) solid[r][c] = true;   // cabin footprint
    }
    [[13, 5, 'cooler'], [5, 11, 'crate'], [14, 11, 'bucket'], [12, 4, 'crate']].forEach(([c, r, name]) => {
      if (taken(c, r)) return;
      props[r][c] = name;
      solid[r][c] = true;
    });

    const map = {
      theme, themeName, solid, props, cols: COLS, rows: ROWS, tile: T, width: W, height: H,
      deck: DECK, rnd: mulberry32(hashString((seedStr || '') + 'boat'))
    };
    map.background = paintBoat(map);
    return map;
  }

  function paintBoat(map) {
    const { canvas, ctx } = Sprites.newCanvas(W, H);
    const rnd = map.rnd;
    const fill = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

    fill(0, 0, W, H, '#2b7fb0');
    for (let i = 0; i < 260; i++) {
      fill(Math.floor(rnd() * W), Math.floor(rnd() * H), 2 + Math.floor(rnd() * 4), 1, rnd() < 0.5 ? '#3fa6d1' : '#1f6a97');
    }
    for (let i = 0; i < 45; i++) {
      fill(Math.floor(rnd() * W), Math.floor(rnd() * H), 3, 1, 'rgba(255,255,255,0.28)');
    }

    const x0 = 48, x1 = 272, y0 = 48, y1 = 224;
    // bow, narrowing toward the top of the screen
    for (let i = 0; i < 3; i++) {
      const inset = 12 + i * 16;
      fill(x0 + inset, y0 - 8 - i * 8, (x1 - x0) - inset * 2, 9, i ? '#7a4d2b' : '#8a5a33');
    }
    fill(x0, y0, x1 - x0, y1 - y0, '#8a5a33');
    fill(x0, y1 - 12, x1 - x0, 12, '#6b3f22');
    fill(x0, y0, x1 - x0, 3, '#a5713f');

    // deck planking
    fill(64, 64, 192, 144, '#c99a63');
    for (let y = 64; y < 208; y += 4) fill(64, y, 192, 1, '#b3874f');
    for (let i = 0; i < 60; i++) fill(64 + Math.floor(rnd() * 192), 64 + Math.floor(rnd() * 144), 2, 1, '#a87c45');

    // rails
    fill(56, 56, 208, 4, '#a5713f');
    fill(56, 208, 208, 4, '#a5713f');
    fill(56, 56, 4, 156, '#a5713f');
    fill(260, 56, 4, 156, '#a5713f');
    for (let x = 60; x < 262; x += 16) { fill(x, 58, 2, 8, '#7a4d2b'); fill(x, 204, 2, 8, '#7a4d2b'); }
    for (let y = 72; y < 208; y += 16) { fill(58, y, 8, 2, '#7a4d2b'); fill(254, y, 8, 2, '#7a4d2b'); }

    // cabin
    fill(96, 62, 64, 34, '#e8eef2');
    fill(96, 58, 64, 6, '#c94a36');
    fill(102, 70, 22, 16, '#3fd0c8');
    fill(132, 70, 22, 16, '#3fd0c8');
    fill(102, 70, 22, 2, '#9fb4c9');
    fill(132, 70, 22, 2, '#9fb4c9');
    fill(96, 94, 64, 3, '#9fb4c9');
    // life ring on the cabin wall
    fill(164, 68, 14, 14, '#f2f2ef');
    fill(167, 71, 8, 8, '#e8eef2');
    fill(164, 68, 5, 4, '#e0553f');
    fill(173, 78, 5, 4, '#e0553f');

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (map.props[r][c]) drawProp(ctx, map.props[r][c], c * T, r * T, rnd);
      }
    }
    return canvas;
  }

  function ensureConnected(solid, props, reserved) {
    if (!reserved.length) return;
    const start = reserved[0];
    const seen = new Set();
    const q = [[start.c, start.r]];
    seen.add(start.c + ',' + start.r);
    while (q.length) {
      const [c, r] = q.shift();
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dc, nr = r + dr;
        if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
        const k = nc + ',' + nr;
        if (seen.has(k) || solid[nr][nc]) continue;
        seen.add(k); q.push([nc, nr]);
      }
    }
    for (const p of reserved) {
      if (seen.has(p.c + ',' + p.r)) continue;
      // carve an L-shaped corridor from the start point
      let c = start.c, r = start.r;
      while (c !== p.c) { c += Math.sign(p.c - c); clear(solid, props, c, r); }
      while (r !== p.r) { r += Math.sign(p.r - r); clear(solid, props, c, r); }
    }
  }
  function clear(solid, props, c, r) {
    if (r <= 0 || c <= 0 || r >= ROWS - 1 || c >= COLS - 1) return;
    solid[r][c] = false; props[r][c] = null;
  }

  function paint(map) {
    const { canvas, ctx } = Sprites.newCanvas(W, H);
    const th = map.theme;
    const rnd = map.rnd;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * T, y = r * T;
        const edge = r < th.edgeRows;
        ctx.fillStyle = edge ? th.edge : th.ground;
        ctx.fillRect(x, y, T, T);
        const speck = edge ? th.edgeAlt : th.groundAlt;
        for (let i = 0; i < 5; i++) {
          ctx.fillStyle = speck;
          ctx.fillRect(x + Math.floor(rnd() * T), y + Math.floor(rnd() * T), 1 + Math.floor(rnd() * 2), 1);
        }
        if (!edge && rnd() < 0.22) {
          ctx.fillStyle = speck;
          ctx.fillRect(x + Math.floor(rnd() * 10), y + Math.floor(rnd() * 10), 3 + Math.floor(rnd() * 3), 2);
        }
      }
    }
    // shoreline highlight
    if (th.shore) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (let c = 0; c < COLS; c++) ctx.fillRect(c * T, th.edgeRows * T - 2, T - Math.floor(rnd() * 5), 2);
    }
    // border walls
    ctx.fillStyle = shade(th.edge, -0.15);
    for (let c = 0; c < COLS; c++) { ctx.fillRect(c * T, 0, T, T); ctx.fillRect(c * T, H - T, T, T); }
    for (let r = 0; r < ROWS; r++) { ctx.fillRect(0, r * T, T, T); ctx.fillRect(W - T, r * T, T, T); }
    ctx.fillStyle = shade(th.edge, 0.12);
    for (let c = 0; c < COLS; c++) ctx.fillRect(c * T, H - T, T, 3);

    if (th.castle) paintPark(ctx, th, rnd);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (map.props[r][c]) drawProp(ctx, map.props[r][c], c * T, r * T, rnd);
      }
    }
    return canvas;
  }

  // 3x5 pixel font, just enough for signage.
  const FONT = {
    A: '111101111101101', B: '110101110101110', C: '111100100100111', D: '110101101101110',
    E: '111100110100111', F: '111100110100100', G: '111100101101111', H: '101101111101101',
    I: '111010010010111', J: '001001001101111', K: '101101110101101', L: '100100100100111',
    M: '101111111101101', N: '110101101101101', O: '111101101101111', P: '111101111100100',
    Q: '111101101111001', R: '111101111110101', S: '111100111001111', T: '111010010010010',
    U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
    Y: '101101010010010', Z: '111001010100111', ' ': '000000000000000', '!': '010010010000010',
    '.': '000000000000010', "'": '010010000000000', '-': '000000111000000'
  };

  function textWidth(text, scale) { return text.length * 4 * scale - scale; }

  function drawText(ctx, text, x, y, scale, color) {
    ctx.fillStyle = color;
    let cx = x;
    for (const ch of String(text).toUpperCase()) {
      const glyph = FONT[ch];
      if (glyph) {
        for (let r = 0; r < 5; r++) {
          for (let c = 0; c < 3; c++) {
            if (glyph[r * 3 + c] === '1') ctx.fillRect(cx + c * scale, y + r * scale, scale, scale);
          }
        }
      }
      cx += 4 * scale;
    }
  }

  function paintPark(ctx, th, rnd) {
    const fill = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    const band = th.edgeRows * T;   // 32px of skyline across the top

    fill(0, 0, W, band, '#7fd3f0');
    for (let i = 0; i < 14; i++) fill(Math.floor(rnd() * W), Math.floor(rnd() * 14), 6 + Math.floor(rnd() * 8), 2, '#a8e4f7');

    const stone = '#c9d4e4', stoneD = '#9fb0c8', roof = '#c94a36', roofD = '#a53a29';
    // castle wall with battlements
    fill(0, 18, W, band - 18, stone);
    fill(0, band - 4, W, 4, stoneD);
    for (let x = 0; x < W; x += 8) fill(x, 14, 5, 5, stone);

    // towers
    [24, 96, 176, 248, 296].forEach((tx, i) => {
      const tw = i % 2 ? 18 : 22;
      const ty = i % 2 ? 6 : 0;
      fill(tx, ty + 10, tw, band - ty - 10, stone);
      fill(tx, ty + 10, 3, band - ty - 10, stoneD);
      for (let y = ty + 14; y < band; y += 8) fill(tx + 4, y, tw - 8, 2, stoneD);
      // conical roof
      for (let r = 0; r < 8; r++) {
        const w = Math.max(2, tw - r * 2 - 2);
        fill(tx + Math.round((tw - w) / 2), ty + 10 - r, w, 1, r > 4 ? roofD : roof);
      }
      fill(tx + Math.round(tw / 2) - 1, ty, 2, 3, '#e8c94a');
    });

    // gate
    fill(140, 16, 40, band - 16, stoneD);
    fill(146, 22, 28, band - 22, '#5a4a3a');
    fill(150, 26, 20, band - 26, '#3a2f26');

    // paved plaza joints
    ctx.fillStyle = 'rgba(120,104,84,0.35)';
    for (let y = band + T; y < H - T; y += T) ctx.fillRect(T, y, W - T * 2, 1);
    for (let x = T; x < W - T; x += T) ctx.fillRect(x, band, 1, H - T - band);

    (th.fixed || []).forEach(f => {
      if (f.name === 'carousel') drawCarousel(ctx, f.c * T, f.r * T, f.w * T, f.h * T);
      if (f.name === 'parksign') drawParkSign(ctx, f.c * T, f.r * T, f.w * T, f.h * T, th.signText || 'PARK');
    });
  }

  function drawCarousel(ctx, x, y, w, h) {
    const fill = (a, b, ww, hh, c) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, ww, hh); };
    const cx = w / 2;
    const roofH = 22;

    fill(4, h - 16, w - 8, 14, '#8fa6c4');            // platform
    fill(4, h - 16, w - 8, 3, '#c9d4e4');
    fill(6, h - 4, w - 12, 3, '#6f7f96');

    // striped conical roof
    for (let r = 0; r < roofH; r++) {
      const ww = Math.max(4, Math.round(w * (r / roofH)));
      const ax = Math.round(cx - ww / 2);
      for (let i = 0; i < ww; i++) {
        ctx.fillStyle = (Math.floor((i + r) / 4) % 2) ? '#e0553f' : '#f7f2ea';
        ctx.fillRect(x + ax + i, y + 6 + r, 1, 1);
      }
    }
    fill(Math.round(cx) - 1, 1, 3, 6, '#e8c94a');      // finial
    fill(Math.round(cx) - 3, 0, 7, 2, '#f7e07a');
    for (let i = 4; i < w - 4; i += 6) fill(i, 6 + roofH, 4, 2, '#e8c94a');   // canopy lights

    // poles and riders
    const poles = [10, Math.round(cx) - 2, w - 14];
    poles.forEach((px2, i) => {
      fill(px2, 6 + roofH, 2, h - 22 - roofH, '#e8c94a');
      const hy = 8 + roofH + (i === 1 ? 6 : 0);
      const coat = i === 1 ? '#f7f2ea' : (i ? '#c9a06a' : '#8a5a33');
      fill(px2 - 5, hy + 4, 11, 6, coat);             // body
      fill(px2 + 4, hy, 5, 6, coat);                  // head
      fill(px2 + 7, hy + 2, 2, 2, '#3a2b33');         // muzzle
      fill(px2 + 3, hy - 2, 2, 3, '#e0553f');         // ear/plume
      fill(px2 - 5, hy + 10, 2, 5, coat);
      fill(px2 + 3, hy + 10, 2, 5, coat);
      fill(px2 - 6, hy + 4, 3, 3, '#c94a36');         // saddle
    });
  }

  function drawParkSign(ctx, x, y, w, h, text) {
    const fill = (a, b, ww, hh, c) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, ww, hh); };

    fill(4, 10, 4, h - 10, '#6f5a44');                 // posts
    fill(w - 8, 10, 4, h - 10, '#6f5a44');
    fill(2, h - 4, 8, 4, '#4f4030');
    fill(w - 10, h - 4, 8, 4, '#4f4030');

    fill(2, 2, w - 4, h - 12, '#2f6a9c');              // board
    fill(4, 4, w - 8, h - 16, '#4b8fd0');
    fill(2, 2, w - 4, 2, '#7fc4f0');

    const scale = 2;
    const tw = textWidth(text, scale);
    drawText(ctx, text, Math.round(x + (w - tw) / 2), y + Math.round((h - 12 - 10) / 2) + 3, scale, '#fff7c9');

    // marquee bulbs
    for (let i = 4; i < w - 6; i += 6) {
      fill(i, 0, 2, 2, '#f7e07a');
      fill(i, h - 12, 2, 2, '#f7e07a');
    }
  }

  function isSolidPixel(map, x, y) {
    const c = Math.floor(x / T), r = Math.floor(y / T);
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return true;
    return map.solid[r][c];
  }

  function freeCells(map) {
    const out = [];
    for (let r = 2; r < ROWS - 1; r++) {
      for (let c = 1; c < COLS - 1; c++) if (!map.solid[r][c]) out.push({ c, r });
    }
    return out;
  }

  global.World = { T, COLS, ROWS, W, H, THEMES, DECK, createMap, isSolidPixel, freeCells, drawProp, mulberry32, hashString };
})(window);
