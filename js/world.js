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
      sky: '#7fd3f0', props: ['palm', 'rock', 'umbrella', 'crate', 'tiki'], edgeRows: 2
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

    // scatter props
    const inner = { c0: 1, c1: COLS - 1, r0: Math.max(1, theme.edgeRows), r1: ROWS - 1 };
    const count = 26 + Math.floor(rnd() * 8);
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
    if (th.edgeRows > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (let c = 0; c < COLS; c++) ctx.fillRect(c * T, th.edgeRows * T - 2, T - Math.floor(rnd() * 5), 2);
    }
    // border walls
    ctx.fillStyle = shade(th.edge, -0.15);
    for (let c = 0; c < COLS; c++) { ctx.fillRect(c * T, 0, T, T); ctx.fillRect(c * T, H - T, T, T); }
    for (let r = 0; r < ROWS; r++) { ctx.fillRect(0, r * T, T, T); ctx.fillRect(W - T, r * T, T, T); }
    ctx.fillStyle = shade(th.edge, 0.12);
    for (let c = 0; c < COLS; c++) ctx.fillRect(c * T, H - T, T, 3);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (map.props[r][c]) drawProp(ctx, map.props[r][c], c * T, r * T, rnd);
      }
    }
    return canvas;
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
