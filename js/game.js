/* The playable scene: movement, NPC chats, the hunt, and the trivia finale. */
(function (global) {
  'use strict';

  const T = World.T;
  const SPEED = 0.85;           // pixels per ms-normalized frame unit
  const KEYMAP = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right',
    W: 'up', S: 'down', A: 'left', D: 'right'
  };
  const ACTION_KEYS = [' ', 'Enter', 'z', 'Z', 'e', 'E'];

  let state = null;

  function el(id) { return document.getElementById(id); }

  function start(mission, hooks) {
    stop();
    const canvas = el('stage');
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const map = World.createMap(mission.themeName, mission.missionId, mission.reserved);

    state = {
      mission, map, canvas, ctx, hooks: hooks || {},
      mode: 'roam',
      player: { x: mission.heroSpawn.x, y: mission.heroSpawn.y, dir: 'up', frame: 0, moving: false, anim: 0 },
      pets: (mission.pets && mission.pets.length ? mission.pets : (mission.petLook ? [{ name: mission.pet, look: mission.petLook }] : []))
        .map((p, i) => ({
          name: p.name, look: p.look,
          x: mission.heroSpawn.x, y: mission.heroSpawn.y + 12,
          dir: 'up', frame: 0, anim: 0, offset: 16 + i * 12
        })),
      trail: [],
      keys: Object.create(null),
      itemVisible: false,
      itemTaken: false,
      talkedCount: 0,
      holding: false,
      fishing: null,
      chickens: (mission.chickens || []).map(c => ({
        name: c.name, look: c.look, speed: c.speed,
        x: c.x, y: c.y, dir: 'left', frame: 0, anim: 0,
        vx: 0, vy: 0, wander: 0, stam: 100, tired: 0, caught: false, bawk: 0
      })),
      caughtCount: 0,
      collectibles: (mission.collectibles || []).map(c => Object.assign({ taken: false }, c)),
      collected: 0,
      interior: false,
      partyActors: [],
      confettiUntil: 0,
      scannerTried: false,
      melon: null,
      melonCooldown: 0,
      puffs: [],
      dialogueQueue: [],
      typed: 0,
      typeTimer: 0,
      startedAt: performance.now(),
      elapsed: 0,
      promptText: '',
      wrongAnswers: 0,
      hintsUsed: 0,
      petBubble: 0,
      toast: null,
      toastUntil: 0,
      last: performance.now(),
      raf: 0
    };

    bindInput();
    if (!mission.npcs.length && mission.finale !== 'chickens') state.itemVisible = true;
    buryCollectibles();
    renderHud();
    if (mission.openingLines && mission.openingLines.length) {
      queueScript(mission.openingLines, () => { if (mission.startHint) toast(mission.startHint, 5000); });
    } else if (mission.introLines.length) {
      queueDialogue(mission.hero, mission.heroLook, mission.introLines);
    } else if (mission.startHint) {
      toast(mission.startHint, 5000);
    }
    state.raf = requestAnimationFrame(loop);
    return state;
  }

  function stop() {
    if (!state) return;
    cancelAnimationFrame(state.raf);
    unbindInput();
    state = null;
  }

  // ------------------------------------------------------------------ input
  function onKeyDown(e) {
    if (!state) return;
    if (KEYMAP[e.key]) { state.keys[KEYMAP[e.key]] = true; e.preventDefault(); }
    if (ACTION_KEYS.includes(e.key)) {
      e.preventDefault();
      if (!e.repeat) action();
      if (state) state.holding = true;
    }
    if (e.key === 'b' || e.key === 'B') { e.preventDefault(); useCompanion(); }
  }
  function onKeyUp(e) {
    if (!state) return;
    if (KEYMAP[e.key]) { state.keys[KEYMAP[e.key]] = false; e.preventDefault(); }
    if (ACTION_KEYS.includes(e.key)) state.holding = false;
  }

  const padHandlers = [];
  function bindInput() {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    document.querySelectorAll('[data-pad]').forEach(btn => {
      const dir = btn.getAttribute('data-pad');
      const down = ev => { ev.preventDefault(); if (state) state.keys[dir] = true; };
      const up = ev => { ev.preventDefault(); if (state) state.keys[dir] = false; };
      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointerleave', up);
      btn.addEventListener('pointercancel', up);
      padHandlers.push([btn, down, up]);
    });
    const act = el('btn-action');
    if (act) {
      const h = ev => { ev.preventDefault(); action(); if (state) state.holding = true; };
      const u = ev => { ev.preventDefault(); if (state) state.holding = false; };      act.addEventListener('pointerdown', h);
      act.addEventListener('pointerup', u);
      act.addEventListener('pointerleave', u);
      act.addEventListener('pointercancel', u);
      padHandlers.push([act, h, u]);
    }
    const comp = el('btn-companion');
    if (comp) { const h = ev => { ev.preventDefault(); useCompanion(); }; comp.addEventListener('pointerdown', h); padHandlers.push([comp, h, null]); }
    const dlg = el('dialogue');
    if (dlg) { const h = () => action(); dlg.addEventListener('click', h); padHandlers.push([dlg, h, null]); }
  }
  function unbindInput() {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    while (padHandlers.length) {
      const [node, down, up] = padHandlers.pop();
      if (down) { node.removeEventListener('pointerdown', down); node.removeEventListener('click', down); }
      if (up) { node.removeEventListener('pointerup', up); node.removeEventListener('pointerleave', up); node.removeEventListener('pointercancel', up); }
    }
  }

  // -------------------------------------------------------------- game logic
  function feetBox(x, y) { return { x0: x + 4, y0: y + 11, x1: x + 12, y1: y + 16 }; }

  function canStand(x, y) {
    const b = feetBox(x, y);
    return !World.isSolidPixel(state.map, b.x0, b.y0) && !World.isSolidPixel(state.map, b.x1 - 1, b.y0) &&
      !World.isSolidPixel(state.map, b.x0, b.y1 - 1) && !World.isSolidPixel(state.map, b.x1 - 1, b.y1 - 1) &&
      !npcAt(x, y);
  }

  function npcAt(x, y) {
    const cx = x + 8, cy = y + 12;
    return state.mission.npcs.some(n => Math.abs(n.x + 8 - cx) < 12 && Math.abs(n.y + 12 - cy) < 12);
  }

  function move(dt) {
    const p = state.player;
    let dx = 0, dy = 0;
    if (state.keys.left) dx -= 1;
    if (state.keys.right) dx += 1;
    if (state.keys.up) dy -= 1;
    if (state.keys.down) dy += 1;
    p.moving = !!(dx || dy);
    if (!p.moving) { p.anim = 0; p.frame = 0; return; }

    if (dy < 0) p.dir = 'up'; else if (dy > 0) p.dir = 'down';
    if (dx < 0) p.dir = 'left'; else if (dx > 0) p.dir = 'right';

    const len = Math.hypot(dx, dy) || 1;
    const step = SPEED * (dt / 16.666);
    const nx = p.x + (dx / len) * step;
    const ny = p.y + (dy / len) * step;
    if (canStand(nx, p.y)) p.x = nx;
    if (canStand(p.x, ny)) p.y = ny;
    p.x = Math.max(0, Math.min(World.W - T, p.x));
    p.y = Math.max(0, Math.min(World.H - T, p.y));

    p.anim += dt;
    p.frame = Math.floor(p.anim / 130) % 4;

    state.trail.push({ x: p.x, y: p.y, dir: p.dir });
    if (state.trail.length > 60) state.trail.shift();
  }

  function followPet(dt) {
    for (const pet of state.pets) {
      const idx = state.trail.length - pet.offset;
      if (idx < 0) continue;
      const t = state.trail[idx];
      const moved = Math.abs(pet.x - t.x) > 0.4 || Math.abs(pet.y - t.y) > 0.4;
      pet.x += (t.x - pet.x) * 0.25;
      pet.y += (t.y - pet.y) * 0.25;
      pet.dir = t.dir;
      if (moved) { pet.anim += dt; pet.frame = Math.floor(pet.anim / 150) % 4; }
      else pet.frame = 0;
    }
  }

  function facingPoint() {
    const p = state.player;
    const cx = p.x + 8, cy = p.y + 10;
    const off = 13;
    if (p.dir === 'up') return { x: cx, y: cy - off };
    if (p.dir === 'down') return { x: cx, y: cy + off };
    if (p.dir === 'left') return { x: cx - off, y: cy };
    return { x: cx + off, y: cy };
  }

  function nearestTarget() {
    const f = facingPoint();
    let best = null;
    for (const n of state.mission.npcs) {
      const d = Math.hypot(n.x + 8 - f.x, n.y + 10 - f.y);
      if (d < 14 && (!best || d < best.d)) best = { d, type: 'npc', npc: n };
    }
    for (const ch of state.chickens) {
      if (ch.caught) continue;
      const d = Math.hypot(ch.x + 8 - f.x, ch.y + 10 - f.y);
      if (d < 17 && (!best || d < best.d)) best = { d, type: 'chicken', chicken: ch };
    }
    for (const it of state.collectibles) {
      if (it.taken || it.buried) continue;
      const d = Math.hypot(it.x + 8 - f.x, it.y + 8 - f.y);
      if (d < 16 && (!best || d < best.d)) best = { d, type: 'pickup', pickup: it };
    }
    if (state.itemVisible && !state.itemTaken) {
      const it = state.mission.item;
      const d = Math.hypot(it.x + 8 - f.x, it.y + 8 - f.y);
      if (d < 16 && (!best || d < best.d)) best = { d, type: 'item' };
    }
    return best;
  }

  function action() {
    if (!state) return;
    if (state.mode === 'dialogue') { advanceDialogue(); return; }
    if (state.mode !== 'roam') return;
    const target = nearestTarget();
    if (!target) {
      if (state.scannerTried) attemptDig();
      return;
    }
    if (target.type === 'npc') talkTo(target.npc);
    else if (target.type === 'chicken') catchChicken(target.chicken);
    else if (target.type === 'pickup') pickUp(target.pickup);
    else takeItem();
  }

  function talkTo(npc) {
    if (!npc.talked) {
      npc.talked = true;
      state.talkedCount++;
    }
    const lines = npc.lines.slice();
    if (state.talkedCount === state.mission.npcs.length && !state.itemVisible) {
      state.itemVisible = true;
      lines.push('That is everything we know. ' + capitalize(state.mission.item.label) + ' just turned up on the scanner \u2014 it is glinting somewhere nearby!');
    } else if (npc.talked && state.itemVisible) {
      lines.push('Go grab ' + state.mission.item.label + ' already!');
    }
    queueDialogue(npc.name, npc.look, lines);
    renderHud();
  }

  // --------------------------------------------------------------- chickens
  const FLEE_RADIUS = 54;
  const MELON_RADIUS = 118;
  const MELON_TIME = 6200;
  const MELON_COOLDOWN = 10000;

  function chickenFree(x, y) {
    const b = feetBox(x, y);
    return !World.isSolidPixel(state.map, b.x0, b.y0) && !World.isSolidPixel(state.map, b.x1 - 1, b.y0) &&
      !World.isSolidPixel(state.map, b.x0, b.y1 - 1) && !World.isSolidPixel(state.map, b.x1 - 1, b.y1 - 1);
  }

  function updateChickens(dt, now) {
    const melon = state.melon && now < state.melon.until ? state.melon : null;
    for (const ch of state.chickens) {
      if (ch.caught) { ch.frame = 0; continue; }
      const dx = ch.x - state.player.x, dy = ch.y - state.player.y;
      const dist = Math.hypot(dx, dy) || 1;
      const fd = melon ? Math.hypot(ch.x - melon.x, ch.y - melon.y) : Infinity;
      let sx = 0, sy = 0, sp = ch.speed;

      if (melon && fd < MELON_RADIUS && dist > 22) {
        // watermelon beats fear
        if (fd > 7) { sx = (melon.x - ch.x) / fd; sy = (melon.y - ch.y) / fd; sp *= 0.75; }
        ch.stam = Math.min(100, ch.stam + 0.03 * dt);
      } else if (dist < FLEE_RADIUS) {
        sx = dx / dist; sy = dy / dist; sp *= 1.28;
        ch.stam -= 0.045 * dt;
        if (ch.stam <= 0) { ch.tired = 2200; ch.stam = 55; ch.bawk = 900; }
      } else {
        ch.wander -= dt;
        if (ch.wander <= 0) {
          ch.wander = 500 + Math.random() * 900;
          const ang = Math.random() * Math.PI * 2;
          const idle = Math.random() < 0.3;
          ch.vx = idle ? 0 : Math.cos(ang);
          ch.vy = idle ? 0 : Math.sin(ang);
        }
        sx = ch.vx; sy = ch.vy; sp *= 0.45;
        ch.stam = Math.min(100, ch.stam + 0.02 * dt);
      }

      if (ch.tired > 0) { ch.tired -= dt; sp *= 0.45; }
      if (ch.bawk > 0) ch.bawk -= dt;

      const step = sp * (dt / 16.666);
      const nx = ch.x + sx * step, ny = ch.y + sy * step;
      if (chickenFree(nx, ch.y)) ch.x = nx; else ch.vx = -ch.vx;
      if (chickenFree(ch.x, ny)) ch.y = ny; else ch.vy = -ch.vy;
      ch.x = Math.max(T, Math.min(World.W - T * 2, ch.x));
      ch.y = Math.max(T * 2, Math.min(World.H - T * 2, ch.y));

      if (Math.abs(sx) > 0.04 || Math.abs(sy) > 0.04) {
        ch.dir = Math.abs(sx) > Math.abs(sy) ? (sx < 0 ? 'left' : 'right') : (sy < 0 ? 'up' : 'down');
        ch.anim += dt;
        ch.frame = Math.floor(ch.anim / 100) % 4;
      } else ch.frame = 0;
    }
  }

  function updatePuffs(dt, now) {
    if (state.confettiUntil > now && Math.random() < 0.5) state.puffs.push(confettiBit());
    const partying = state.confettiUntil > now;
    for (let i = state.puffs.length - 1; i >= 0; i--) {
      const p = state.puffs[i];
      p.x += p.vx * (dt / 16.666);
      p.y += p.vy * (dt / 16.666);
      if (partying) p.vx = Math.sin((now + i * 90) / 320) * 0.6;
      else p.vy += 0.02 * (dt / 16.666);
      p.life -= dt;
      if (p.life <= 0 || p.y > World.H + 6) state.puffs.splice(i, 1);
    }
  }

  function catchChicken(ch) {
    ch.caught = true;
    state.caughtCount++;
    for (let i = 0; i < 10; i++) {
      state.puffs.push({
        x: ch.x + 8, y: ch.y + 8,
        vx: (Math.random() - 0.5) * 2.6,
        vy: -Math.random() * 1.8 - 0.3,
        life: 700 + Math.random() * 500,
        color: i % 3 === 0 ? '#f2f2ef' : (ch.look.coat || '#f2f2ef')
      });
    }
    const total = state.chickens.length;
    renderHud();
    if (state.caughtCount >= total) {
      state.itemTaken = true;
      queueDialogue(state.mission.hero, state.mission.heroLook, [
        'Got it. All ' + total + ' waivers recovered, only lightly chewed.',
        state.mission.trivia ? 'Now, while the paperwork is still damp...' : 'Back to the office.'
      ], () => finishAfterItem());
    } else {
      toast('Waiver recovered from ' + ch.name + '! ' + state.caughtCount + '/' + total);
    }
  }

  function putOutMelon() {
    const now = performance.now();
    if (now < state.melonCooldown) {
      toast('No watermelon left for ' + Math.ceil((state.melonCooldown - now) / 1000) + 's.');
      return;
    }
    state.melon = { x: state.player.x + 8, y: state.player.y + 13, until: now + MELON_TIME, born: now };
    state.melonCooldown = now + MELON_COOLDOWN;
    toast('You set out a watermelon. The flock loses all composure.');
  }

  /** Scanline ellipse, so the melon stays crisp at this resolution. */
  function ovalRows(ctx, cx, cy, rx, ry, color) {
    ctx.fillStyle = color;
    for (let dy = -ry; dy <= ry; dy++) {
      const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))));
      if (w > 0) ctx.fillRect(Math.round(cx - w), Math.round(cy + dy), w * 2, 1);
    }
  }

  function drawMelon(ctx, now) {
    if (!state.melon || now > state.melon.until) return;
    const m = state.melon;
    const left = (m.until - now) / MELON_TIME;
    const eaten = 0.55 + left * 0.45;          // pecked down as it goes
    const cx = Math.round(m.x), cy = Math.round(m.y);

    ctx.globalAlpha = Math.min(1, left * 6);
    ctx.fillStyle = 'rgba(20,12,30,0.22)';
    ctx.fillRect(cx - 8, cy + 3, 16, 2);
    ovalRows(ctx, cx, cy, 8 * eaten, 5 * eaten, '#2f6a38');
    ovalRows(ctx, cx, cy, 7 * eaten, 4 * eaten, '#9ed17e');
    ovalRows(ctx, cx, cy, 6 * eaten, 3 * eaten, '#e0553f');
    ctx.fillStyle = '#f0705a';
    ctx.fillRect(cx - 3, cy - 2, 3, 1);
    ctx.fillStyle = '#241d29';
    [[-3, 0], [1, -1], [2, 1], [-1, 1]].forEach(([sx, sy]) => {
      if (eaten > 0.7 || sx > 0) ctx.fillRect(cx + sx, cy + sy, 1, 1);
    });
    ctx.globalAlpha = 1;
  }

  function drawPuffs(ctx) {
    for (const p of state.puffs) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 500));
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  function drawChicken(ctx, ch) {
    ctx.fillStyle = 'rgba(20,12,30,0.22)';
    ctx.beginPath();
    ctx.ellipse(ch.x + 8, ch.y + 15, 5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    Sprites.draw(ctx, ch.look, ch.x, ch.y, ch.dir, ch.frame);
    if (!ch.caught) {
      // the stolen waiver, clamped in the beak
      const facingLeft = ch.dir === 'left';
      const wx = Math.round(ch.x + (facingLeft ? 1 : 11));
      const wy = Math.round(ch.y + 6);
      ctx.fillStyle = '#1a1220';
      ctx.fillRect(wx - 1, wy - 1, 6, 5);
      ctx.fillStyle = '#f7f2ea';
      ctx.fillRect(wx, wy, 4, 3);
      ctx.fillStyle = '#9a94a8';
      ctx.fillRect(wx, wy + 1, 3, 1);
      if (ch.bawk > 0) drawMark(ctx, ch.x + 8, ch.y - 4, 'bang');
    }
  }

  // -------------------------------------------------------- passkey mission
  const SNIFF_RANGE = 150;
  const DIG_RANGE = 20;

  /** Buried items move every playthrough, so the radar is the only way to find them. */
  function buryCollectibles() {
    const m = state.mission;
    const buried = state.collectibles.filter(c => c.buried);
    if (!buried.length) return;
    const cells = World.freeCells(state.map).filter(cell => {
      const x = cell.c * T, y = cell.r * T;
      return Math.hypot(x - m.heroSpawn.x, y - m.heroSpawn.y) > 72 &&
        Math.hypot(x - m.item.x, y - m.item.y) > 56;
    });
    buried.forEach(it => {
      const pick = cells.length ? cells[Math.floor(Math.random() * cells.length)] : { c: it.c, r: it.r };
      it.c = pick.c; it.r = pick.r;
      it.x = pick.c * T; it.y = pick.r * T;
    });
  }

  function buriedTarget() {
    return state.collectibles.find(c => c.buried && !c.taken) || null;
  }

  function distanceTo(it) {
    return Math.hypot((state.player.x + 8) - (it.x + 8), (state.player.y + 10) - (it.y + 8));
  }

  function spawnDirt(x, y) {
    for (let i = 0; i < 9; i++) {
      state.puffs.push({
        x: x + 8, y: y + 13,
        vx: (Math.random() - 0.5) * 2.2,
        vy: -Math.random() * 1.5 - 0.2,
        life: 450 + Math.random() * 350,
        color: ['#7a5a33', '#8a6b4a', '#6b4a2a'][i % 3]
      });
    }
  }

  function attemptDig() {
    const it = buriedTarget();
    if (!it) return false;
    spawnDirt(state.player.x, state.player.y);
    const d = distanceTo(it);
    if (d <= DIG_RANGE) { pickUp(it); return true; }
    toast(d < 55
      ? 'You dig. Dirt, a rock, and two extremely interested dogs. Close, though.'
      : 'You dig. Nothing down here but dirt and an old chicken bone.');
    return true;
  }

  function scentLabel(d) {
    if (d <= DIG_RANGE) return 'DIG HERE!';
    if (d < 52) return 'RED HOT';
    if (d < 92) return 'WARM';
    if (d < SNIFF_RANGE) return 'COOL';
    return 'STONE COLD';
  }

  function scentColor(d) {
    if (d <= DIG_RANGE) return '#e0553f';
    if (d < 52) return '#f0705a';
    if (d < 92) return '#f0a53f';
    if (d < SNIFF_RANGE) return '#f7e07a';
    return '#4b8fd0';
  }

  function drawScent(ctx, now) {
    const it = buriedTarget();
    if (!it || !state.scannerTried || state.mode !== 'roam') return;
    const d = distanceTo(it);
    const pct = Math.max(0.02, 1 - d / SNIFF_RANGE);
    const w = 104;
    const x = 8, y = World.H - 15;

    ctx.fillStyle = 'rgba(20,16,31,0.82)';
    ctx.fillRect(x - 3, y - 11, w + 6, 24);
    ctx.font = '7px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#cfc4e6';
    ctx.fillText('DOG NOSE', x, y - 3);
    ctx.fillStyle = scentColor(d);
    ctx.textAlign = 'right';
    ctx.fillText(scentLabel(d), x + w, y - 3);
    ctx.textAlign = 'left';
    meter(ctx, x, y, w, 8, pct, scentColor(d), '');

    // the dogs get louder the closer you are
    if (d < 52 && Math.floor(now / 380) % 2 === 0) state.petBubble = 200;
    if (d <= DIG_RANGE) {
      const pulse = 4 + Math.round(Math.sin(now / 130) * 2);
      ctx.strokeStyle = 'rgba(224,85,63,0.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(state.player.x + 8, state.player.y + 13, 8 + pulse, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function collectiblesLeft() {
    return state.mission.collectibles.length - state.collected;
  }

  function pickUp(item) {
    item.taken = true;
    state.collected++;
    renderHud();
    const left = collectiblesLeft();
    queueDialogue(state.mission.hero, state.mission.heroLook, [
      item.found || ('Picked up ' + item.label + '.'),
      left > 0
        ? (left + ' more to go, then we try that scanner again.')
        : 'Now back to the coop door and get these two enrolled.'
    ]);
  }

  function useScanner() {
    const m = state.mission;
    if (collectiblesLeft() > 0) {
      queueScript(m.deniedLines || [
        'COOP-SEC v2.1: PAW ACCEPTED. CONSENT FORM NOT ON FILE. ACCESS DENIED.'
      ]);
      state.scannerTried = true;
      renderHud();
      return;
    }
    state.itemTaken = true;
    queueScript(m.grantedLines || ['COOP-SEC v2.1: ACCESS GRANTED.'], () => enterCoop());
  }

  function enterCoop() {
    const m = state.mission;
    const guests = (m.party && m.party.guests) || [];
    state.interior = true;
    state.map = World.createMap('coophouse', m.missionId + '-inside',
      [{ c: 10, r: 12 }, { c: 10, r: 11 }].concat(guests.map(g => ({ c: g.c, r: g.r }))));
    state.player.x = 10 * T;
    state.player.y = 11 * T;
    state.player.dir = 'up';
    state.trail = [];
    state.pets.forEach((p, i) => { p.x = (9 + i * 2) * T; p.y = 12 * T; p.dir = 'up'; });
    state.partyActors = guests.map(g => ({
      name: g.name,
      look: g.species
        ? Appearance.pet({ species: g.species, coat: g.coat || '#c9a06a', accent: g.accent || '#f2e3c8', comb: '#c94a36', beak: '#e8a531' })
        : Roster.lookAt(g.name, 'human'),
      x: g.c * T, y: g.r * T, dir: g.dir || 'down'
    }));
    for (let i = 0; i < 70; i++) state.puffs.push(confettiBit());
    state.confettiUntil = performance.now() + 12000;
    renderHud();
    queueScript((m.party && m.party.lines) || ['Shane: Welcome in.'], () => win());
  }

  function confettiBit() {
    return {
      x: Math.random() * World.W,
      y: -Math.random() * 40,
      vx: (Math.random() - 0.5) * 0.9,
      vy: 0.5 + Math.random() * 0.9,
      life: 2600 + Math.random() * 2600,
      color: ['#e0553f', '#e8c94a', '#4bd0c8', '#7a4fc0', '#3f9c4a', '#f2f2ef'][Math.floor(Math.random() * 6)]
    };
  }

  function drawScanner(ctx, x, y, now) {
    const ok = collectiblesLeft() === 0;
    const px2 = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); };
    px2(2, 1, 12, 14, '#2b2740');
    px2(3, 2, 10, 12, '#3c3849');
    px2(4, 3, 8, 6, ok ? '#1a4a3a' : '#4a1a20');
    // paw glyph
    px2(6, 5, 4, 3, ok ? '#4bd07a' : '#e0553f');
    px2(5, 4, 1, 1, ok ? '#4bd07a' : '#e0553f');
    px2(7, 3, 1, 1, ok ? '#4bd07a' : '#e0553f');
    px2(9, 4, 1, 1, ok ? '#4bd07a' : '#e0553f');
    const blink = Math.floor(now / 400) % 2;
    px2(5, 11, 6, 2, ok ? '#4bd07a' : (blink ? '#e0553f' : '#5a2228'));
    if (ok) {
      ctx.fillStyle = 'rgba(75,208,122,' + (0.12 + 0.08 * Math.sin(now / 200)) + ')';
      ctx.beginPath();
      ctx.arc(x + 8, y + 8, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** Points at the objective when it is somewhere the player is simply meant to walk to. */
  function drawWaypoint(ctx, x, y, now) {
    const bob = Math.round(Math.sin(now / 280) * 2);
    const cx = Math.round(x) + 8;
    const top = Math.round(y) - 20 + bob;
    ctx.fillStyle = '#1a1220';
    ctx.fillRect(cx - 7, top - 2, 14, 11);
    ctx.fillStyle = '#f7e07a';
    ctx.fillRect(cx - 6, top - 1, 12, 9);
    ctx.fillStyle = '#1a1220';
    [9, 7, 5, 3, 1].forEach((w, i) => ctx.fillRect(cx - (w - 1) / 2, top + i + 2, w, 1));
  }

  function takeItem() {
    if (state.mission.finale === 'fishing') { startFishing(); return; }
    if (state.mission.finale === 'passkey') { useScanner(); return; }
    state.itemTaken = true;
    state.mode = 'roam';
    queueDialogue(state.mission.hero, state.mission.heroLook, [
      'Got it! ' + capitalize(state.mission.item.label) + ' is secured.',
      state.mission.trivia ? 'One last thing before HQ unlocks the badge...' : 'Ticket closed. Back to shore.'
    ], () => finishAfterItem());
    renderHud();
  }

  function finishAfterItem() {
    if (state.mission.trivia) openTrivia();
    else win();
  }

  // ---------------------------------------------------------------- fishing
  const REEL_RATE = 0.030;      // progress per ms while reeling
  const SLIP_RATE = 0.011;      // progress lost per ms while the line is slack
  const STRAIN_UP = 0.055;
  const STRAIN_DOWN = 0.085;

  function startFishing() {
    state.mode = 'fishing';
    state.fishing = {
      progress: 0,
      strain: 0,
      pull: 1,
      pullTimer: 0,
      snaps: 0,
      message: 'HOLD the button to reel. Ease off before the line snaps!',
      messageUntil: performance.now() + 3200,
      shake: 0
    };
  }

  function tickFishing(dt) {
    const f = state.fishing;
    f.pullTimer -= dt;
    if (f.pullTimer <= 0) {
      f.pull = 0.6 + Math.random() * 1.1;
      f.pullTimer = 700 + Math.random() * 900;
    }
    if (state.holding) {
      f.progress += REEL_RATE * dt;
      f.strain += STRAIN_UP * f.pull * dt;
    } else {
      f.progress -= SLIP_RATE * dt;
      f.strain -= STRAIN_DOWN * dt;
    }
    f.strain = Math.max(0, f.strain);
    f.progress = Math.max(0, f.progress);
    if (f.shake > 0) f.shake -= dt;

    if (f.strain >= 100) {
      f.strain = 0;
      f.progress = Math.max(0, f.progress - 18);
      f.snaps++;
      f.shake = 260;
      f.message = 'LINE STRAINING! Let go for a second!';
      f.messageUntil = performance.now() + 1500;
    }
    if (f.progress >= 100) landFish();
  }

  function landFish() {
    state.mode = 'roam';
    state.fishing = null;
    state.itemTaken = true;
    renderHud();
    queueDialogue(state.mission.hero, state.mission.heroLook, [
      'GOT HIM! Two hundred pounds of tuna, and there it is \u2014 ' + state.mission.item.label + ', still clipped to the leader line.',
      'Slimy, salty, and somehow still working. That is what tamper-resistant means.'
    ], () => finishAfterItem());
  }

  function drawFishing(ctx, now) {
    const f = state.fishing;
    const shake = f.shake > 0 ? Math.round(Math.sin(now / 22) * 2) : 0;

    ctx.fillStyle = 'rgba(10,20,40,0.55)';
    ctx.fillRect(0, 0, World.W, World.H);

    // sea window
    const bx = 24, by = 40, bw = World.W - 48, bh = 120;
    ctx.fillStyle = '#1f6a97';
    ctx.fillRect(bx + shake, by, bw, bh);
    ctx.fillStyle = '#2b7fb0';
    for (let i = 0; i < 7; i++) ctx.fillRect(bx + shake, by + 8 + i * 16, bw, 5);
    ctx.fillStyle = '#14496b';
    ctx.fillRect(bx + shake, by, bw, 3);
    ctx.fillRect(bx + shake, by + bh - 3, bw, 3);

    // tuna rises toward the boat as progress climbs
    const t = Math.min(1, f.progress / 100);
    const fx = bx + bw / 2 + Math.sin(now / 420) * (26 * (1 - t)) + shake;
    const fy = by + bh - 24 - t * (bh - 52);
    drawTuna(ctx, fx, fy, 1 + t * 0.9, Math.sin(now / 160));

    // line from the top of the frame down to the fish
    ctx.strokeStyle = f.strain > 70 ? '#e0553f' : '#f2f2ef';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(World.W / 2 + shake, 0);
    ctx.lineTo(fx, fy);
    ctx.stroke();

    meter(ctx, 24, 166, World.W - 48, 10, f.progress / 100, '#4bd0c8', 'REEL');
    meter(ctx, 24, 182, World.W - 48, 10, Math.min(1, f.strain / 100), f.strain > 70 ? '#e0553f' : '#f7e07a', 'LINE');

    ctx.font = '7px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = now < f.messageUntil ? '#f7e07a' : '#cfc4e6';
    const msg = now < f.messageUntil ? f.message : (state.holding ? 'REELING...' : 'Line is slack \u2014 he is swimming away!');
    ctx.fillText(msg, World.W / 2, 202);
    ctx.textAlign = 'left';
  }

  function meter(ctx, x, y, w, h, pct, color, label) {
    ctx.fillStyle = '#1a1220';
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = '#2e2648';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, Math.max(0, Math.min(1, pct)) * w, h);
    ctx.font = '7px monospace';
    ctx.fillStyle = '#1a1220';
    ctx.fillText(label, x + 3, y + h - 2);
  }

  function drawTuna(ctx, cx, cy, scale, wag) {
    const L = Math.max(12, Math.round(30 * scale));
    const MH = Math.max(4, Math.round(7 * scale));
    const left = Math.round(cx - L * 0.55);
    const mid = Math.round(cy);
    const dark = '#25506b', body = '#3f7ea0', belly = '#cfdde4', fin = '#1b3c52', finlet = '#e8c94a';
    const tailY = mid + Math.round(wag * 3 * scale);

    // tail first so the body overlaps it
    const tw = Math.max(4, Math.round(8 * scale));
    for (let i = 0; i < tw; i++) {
      const hh = Math.max(1, Math.round(2 + (i / tw) * 9 * scale));
      ctx.fillStyle = fin;
      ctx.fillRect(left + L - 2 + i, tailY - hh, 1, hh * 2);
    }

    for (let i = 0; i < L; i++) {
      const t = i / L;
      const h = Math.max(1, Math.round(MH * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.82)), 0.55)));
      const x = left + i;
      const yTop = mid - h, yBot = mid + h;
      const dh = Math.max(1, Math.round(h * 0.75));
      const bh = Math.max(1, Math.round(h * 0.55));
      ctx.fillStyle = dark;
      ctx.fillRect(x, yTop, 1, dh);
      ctx.fillStyle = body;
      ctx.fillRect(x, yTop + dh, 1, Math.max(1, (yBot - bh) - (yTop + dh)));
      ctx.fillStyle = belly;
      ctx.fillRect(x, yBot - bh, 1, bh);
    }

    // dorsal + pectoral fins
    const fw = Math.max(3, Math.round(7 * scale));
    for (let i = 0; i < fw; i++) {
      const hh = Math.max(1, Math.round((1 - i / fw) * 6 * scale));
      ctx.fillStyle = fin;
      ctx.fillRect(left + Math.round(L * 0.34) + i, mid - MH - hh, 1, hh + 1);
      ctx.fillRect(left + Math.round(L * 0.30) + i, mid + Math.round(MH * 0.6), 1, Math.max(1, Math.round(hh * 0.8)));
    }

    // the yellow finlets that say "tuna"
    ctx.fillStyle = finlet;
    for (let i = 0; i < 3; i++) {
      const x = left + Math.round(L * (0.68 + i * 0.08));
      ctx.fillRect(x, mid - Math.round(MH * 0.55), Math.max(1, Math.round(scale)), Math.max(1, Math.round(2 * scale)));
      ctx.fillRect(x, mid + Math.round(MH * 0.35), Math.max(1, Math.round(scale)), Math.max(1, Math.round(2 * scale)));
    }

    // eye
    const ex = left + Math.round(L * 0.11), ey = mid - Math.round(MH * 0.35);
    const es = Math.max(2, Math.round(3 * scale));
    ctx.fillStyle = '#f2f2ef';
    ctx.fillRect(ex, ey, es, es);
    ctx.fillStyle = '#12202b';
    ctx.fillRect(ex + Math.max(1, Math.round(es / 3)), ey + Math.max(1, Math.round(es / 3)), Math.max(1, es - 2), Math.max(1, es - 2));
  }

  function useCompanion() {
    if (!state || state.mode !== 'roam') return;
    if (state.mission.finale === 'chickens') { putOutMelon(); return; }
    if (!state.pets.length) return;
    const it = state.mission.item;
    const p = state.player;
    const d = Math.hypot(it.x - p.x, it.y - p.y);
    let msg;
    if (state.mission.finale === 'passkey') {
      const left = state.mission.collectibles.length - state.collected;
      const buried = buriedTarget();
      if (state.interior) msg = '*zoomies* BEST DAY. BEST COOP.';
      else if (buried) {
        const d = distanceTo(buried);
        if (d <= DIG_RANGE) msg = '*both dogs digging furiously* HERE. IT IS HERE. DIG.';
        else if (d < 52) msg = '*frantic sniffing* SO CLOSE. Barely a few steps.';
        else if (d < 92) msg = '*nose down, tail going* Something paper-ish this way.';
        else msg = '*bored sniff* Nothing out here. Try somewhere else entirely.';
      } else if (left > 0) msg = '*sniff sniff* the consent form is out here somewhere. No form, no paws.';
      else msg = '*scratching at the door* IT IS READY. LET US IN.';
    } else if (!state.itemVisible) msg = '*sniffs* Talk to everyone first \u2014 the trail is cold.';
    else if (state.itemTaken) msg = '*happy tail wag* Mission basically complete!';
    else if (d < 40) msg = '*BARK BARK BARK!* It is RIGHT THERE!';
    else if (d < 90) msg = '*excited sniffing* Getting warm...';
    else if (d < 150) msg = '*low woof* Lukewarm. Keep moving.';
    else msg = '*bored yawn* Ice cold. Wrong side of the map.';
    state.petBubble = 1600;
    toast((state.mission.pet || 'Companion') + ': ' + msg);
  }

  function toast(text, ms) {
    state.toast = text;
    state.toastUntil = performance.now() + (ms || 2200);
  }

  function capitalize(s) { return String(s).charAt(0).toUpperCase() + String(s).slice(1); }

  // --------------------------------------------------------------- dialogue
  function queueDialogue(name, look, lines, onDone) {
    queueEntries(lines.map(text => ({ name: name || '???', look: look, text: text })), onDone);
  }

  /** Lines written as "Name: text" keep their own speaker and portrait. */
  function queueScript(lines, onDone) {
    queueEntries(lines.map(raw => {
      const parsed = Missions.parseLine(raw);
      const speaker = parsed.speaker || state.mission.hero;
      // An ALL-CAPS speaker with no roster entry is a machine, not a character.
      const isDevice = !Roster.find(speaker) && /^[A-Z0-9][A-Z0-9 .\-_]*$/.test(speaker);
      return {
        name: speaker,
        look: isDevice ? null : Roster.lookAt(speaker, parsed.isPet ? 'pet' : 'human'),
        text: parsed.text
      };
    }), onDone);
  }

  function queueEntries(entries, onDone) {
    state.mode = 'dialogue';
    state.dialogueQueue = entries.slice();
    state.dialogueDone = onDone || null;
    showLine();
  }

  function showLine() {
    const box = el('dialogue');
    const entry = state.dialogueQueue.shift();
    if (!entry) {
      box.hidden = true;
      state.mode = 'roam';
      const done = state.dialogueDone;
      state.dialogueDone = null;
      if (done) done();
      return;
    }
    box.hidden = false;
    el('dlg-name').textContent = entry.name;
    const portrait = el('dlg-portrait');
    if (entry.look) {
      portrait.src = Sprites.portraitDataURL(entry.look, 4);
      portrait.hidden = false;
    } else portrait.hidden = true;
    state.fullText = entry.text;
    state.typed = 0;
    state.typeTimer = 0;
    el('dlg-text').textContent = '';
    el('dlg-more').hidden = true;
  }

  function advanceDialogue() {
    if (state.typed < state.fullText.length) {
      state.typed = state.fullText.length;
      el('dlg-text').textContent = state.fullText;
      el('dlg-more').hidden = false;
      return;
    }
    showLine();
  }

  function tickText(dt) {
    if (state.mode !== 'dialogue' || state.typed >= state.fullText.length) return;
    state.typeTimer += dt;
    while (state.typeTimer > 18 && state.typed < state.fullText.length) {
      state.typeTimer -= 18;
      state.typed++;
    }
    el('dlg-text').textContent = state.fullText.slice(0, state.typed);
    if (state.typed >= state.fullText.length) el('dlg-more').hidden = false;
  }

  // ----------------------------------------------------------------- trivia
  function openTrivia() {
    state.mode = 'trivia';
    const t = state.mission.trivia;
    el('trivia').hidden = false;
    el('trivia-question').textContent = t.question;
    el('trivia-feedback').textContent = '';
    el('trivia-hint').hidden = true;
    const choices = el('trivia-choices');
    const free = el('trivia-free');
    choices.innerHTML = '';
    if (t.choices) {
      choices.hidden = false; free.hidden = true;
      t.choices.forEach(c => {
        const b = document.createElement('button');
        b.className = 'btn choice';
        b.textContent = c;
        b.addEventListener('click', () => submitAnswer(c));
        choices.appendChild(b);
      });
    } else {
      choices.hidden = true; free.hidden = false;
      const input = el('trivia-input');
      input.value = '';
      setTimeout(() => input.focus(), 60);
    }
  }

  function submitAnswer(value) {
    const t = state.mission.trivia;
    if (Missions.checkAnswer(t, value)) {
      el('trivia').hidden = true;
      win();
      return;
    }
    state.wrongAnswers++;
    el('trivia-feedback').textContent = state.wrongAnswers === 1
      ? 'Not quite. The firewall logs disagree. Try again!'
      : 'Still no. Need a nudge? Tap the hint.';
    if (state.wrongAnswers >= 1) el('trivia-hint').hidden = false;
  }

  function revealHint() {
    state.hintsUsed++;
    el('trivia-feedback').textContent = 'Hint: ' + state.mission.trivia.hint;
    el('trivia-hint').hidden = true;
  }

  function win() {
    state.mode = 'win';
    const seconds = Math.round((performance.now() - state.startedAt) / 1000);
    const score = Math.max(100, 1000 - seconds * 5 - state.wrongAnswers * 60 - state.hintsUsed * 40);
    const result = {
      missionId: state.mission.missionId,
      title: state.mission.title,
      reward: state.mission.reward,
      seconds, score,
      wrongAnswers: state.wrongAnswers,
      hintsUsed: state.hintsUsed,
      answer: state.mission.trivia ? state.mission.trivia.answer : '',
      outro: state.mission.outro
    };
    if (state.hooks.onWin) state.hooks.onWin(result);
  }

  // ------------------------------------------------------------------- HUD
  function renderHud() {
    const m = state.mission;
    el('hud-objective').textContent = m.objective;
    const total = m.npcs.length;
    let step;
    if (state.interior) step = 'You are in. Behave yourself.';
    else if (state.itemTaken) step = m.trivia ? 'Answer the riddle to close the ticket.' : 'Head home, hero.';
    else if (state.mission.finale === 'passkey') {
      step = !state.scannerTried
        ? 'Try the biometric scanner on the coop door.'
        : (collectiblesLeft() > 0
          ? 'Follow the dogs\u2019 noses  \u00b7  A = dig  \u00b7  B = ask them'
          : 'Take the consent form back to the scanner.');
    }
    else if (state.chickens.length) step = 'Waivers recovered: ' + state.caughtCount + '/' + state.chickens.length + '  \u00b7  B = put out watermelon';
    else if (state.mode === 'fishing') step = 'Hold Space / A to reel him in!';
    else if (m.finale === 'fishing' && state.itemVisible) step = 'Get to the rod at the stern rail.';
    else if (state.itemVisible) step = 'Find ' + m.item.label + ' (it is glinting).';
    else step = 'Talk to everyone here: ' + state.talkedCount + '/' + total;
    el('hud-step').textContent = step;
    el('hud-place').textContent = m.themeLabel;
  }

  // ---------------------------------------------------------------- drawing
  function draw(now) {
    const ctx = state.ctx;
    const m = state.mission;
    ctx.clearRect(0, 0, World.W, World.H);
    ctx.drawImage(state.map.background, 0, 0);

    if (state.itemVisible && !state.itemTaken) {
      if (m.finale === 'passkey') drawScanner(ctx, m.item.x, m.item.y, now);
      else Missions.drawItem(ctx, m.finale === 'fishing' ? 'rod' : m.item.kind, m.item.x, m.item.y, now);
    }
    // signpost the door on the way out and the way back, but never the hunt itself
    if (m.finale === 'passkey' && !state.itemTaken && (!state.scannerTried || collectiblesLeft() === 0)) {
      if (Math.hypot(state.player.x - m.item.x, state.player.y - m.item.y) > 34) {
        drawWaypoint(ctx, m.item.x, m.item.y, now);
      }
    }
    state.collectibles.forEach(it => {
      if (!it.taken && !it.buried) Missions.drawItem(ctx, it.kind, it.x, it.y, now);
    });
    drawMelon(ctx, now);
    const actors = [];
    m.npcs.forEach(n => actors.push({ y: n.y, draw: () => drawActor(ctx, n.look, n.x, n.y, n.dir, 0, n.talked ? null : 'bang') }));
    state.chickens.forEach(ch => actors.push({ y: ch.y, draw: () => drawChicken(ctx, ch) }));
    state.partyActors.forEach(g => actors.push({ y: g.y, draw: () => drawActor(ctx, g.look, g.x, g.y, g.dir, 0, null) }));
    if (state.pets.length) {
      state.pets.forEach(pet => actors.push({
        y: pet.y,
        draw: () => drawActor(ctx, pet.look, pet.x, pet.y, pet.dir, pet.frame, state.petBubble > 0 ? 'bark' : null)
      }));
    }
    actors.push({ y: state.player.y, draw: () => drawActor(ctx, m.heroLook, state.player.x, state.player.y, state.player.dir, state.player.frame, null) });
    actors.sort((a, b) => a.y - b.y).forEach(a => a.draw());
    drawPuffs(ctx);

    // interaction prompt (rendered as crisp DOM text under the stage)
    let prompt = '';
    if (state.mode === 'roam') {
      const target = nearestTarget();
      if (target) {
        if (target.type === 'npc') prompt = 'Talk to ' + target.npc.name;
        else if (target.type === 'chicken') prompt = 'Grab the waiver from ' + target.chicken.name;
        else if (target.type === 'pickup') prompt = 'Pick up ' + target.pickup.label;
        else if (m.finale === 'passkey') prompt = collectiblesLeft() ? 'Try the biometric scanner' : 'Enroll paw print authentication';
        else prompt = m.finale === 'fishing' ? 'Grab the rod and fight the fish' : 'Grab ' + m.item.label;
      }
    }
    if (prompt !== state.promptText) {
      state.promptText = prompt;
      const pEl = el('prompt');
      if (pEl) { pEl.textContent = prompt ? 'Space / A \u2014 ' + prompt : ''; pEl.hidden = !prompt; }
    }

    // vignette so the 320x240 frame reads as a screen
    ctx.fillStyle = 'rgba(20,10,30,0.10)';
    ctx.fillRect(0, 0, World.W, 2);
    ctx.fillRect(0, World.H - 2, World.W, 2);

    if (state.mode === 'fishing') drawFishing(ctx, now);
    drawScent(ctx, now);
  }

  function drawActor(ctx, look, x, y, dir, frame, mark) {
    ctx.fillStyle = 'rgba(20,12,30,0.22)';
    ctx.beginPath();
    ctx.ellipse(x + 8, y + 15, 5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    Sprites.draw(ctx, look, x, y, dir, frame);
    if (mark) drawMark(ctx, x + 8, y - 4, mark);
  }

  /** Hand-placed pixels beat canvas text at this resolution. */
  function drawMark(ctx, cx, cy, kind) {
    const x = Math.round(cx) - 4, y = Math.round(cy) - 5;
    ctx.fillStyle = '#1a1220';
    ctx.fillRect(x, y, 8, 11);
    ctx.fillStyle = '#f7e07a';
    ctx.fillRect(x + 1, y + 1, 6, 9);
    ctx.fillStyle = '#1a1220';
    if (kind === 'bang') {
      ctx.fillRect(x + 3, y + 2, 2, 5);
      ctx.fillRect(x + 3, y + 8, 2, 1);
    } else {
      ctx.fillRect(x + 2, y + 2, 4, 1);
      ctx.fillRect(x + 5, y + 3, 1, 2);
      ctx.fillRect(x + 3, y + 5, 2, 2);
      ctx.fillRect(x + 3, y + 8, 2, 1);
    }
  }

  function loop(now) {
    if (!state) return;
    const dt = Math.min(48, now - state.last);
    state.last = now;
    if (state.mode === 'roam') { move(dt); followPet(dt); }
    else { state.player.frame = 0; }
    if (state.chickens.length) updateChickens(state.mode === 'roam' ? dt : 0, now);
    updatePuffs(dt, now);
    if (state.mode === 'fishing') tickFishing(dt);
    if (state.petBubble > 0) state.petBubble -= dt;
    tickText(dt);

    const secs = Math.max(0, Math.floor((now - state.startedAt) / 1000));
    if (secs !== state.elapsed) {
      state.elapsed = secs;
      const t = el('hud-timer');
      if (t) t.textContent = String(Math.floor(secs / 60)).padStart(2, '0') + ':' + String(secs % 60).padStart(2, '0');
    }

    const toastEl = el('toast');
    if (toastEl) {
      if (state.toast && now < state.toastUntil) { toastEl.textContent = state.toast; toastEl.hidden = false; }
      else { toastEl.hidden = true; state.toast = null; }
    }

    draw(now);
    state.raf = requestAnimationFrame(loop);
  }

  global.Game = { start, stop, submitAnswer, revealHint, get state() { return state; } };
})(window);
