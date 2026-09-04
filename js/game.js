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
      pet: mission.petLook ? { x: mission.heroSpawn.x, y: mission.heroSpawn.y + 12, dir: 'up', frame: 0, anim: 0 } : null,
      trail: [],
      keys: Object.create(null),
      itemVisible: false,
      itemTaken: false,
      talkedCount: 0,
      holding: false,
      fishing: null,
      dialogueQueue: [],
      dialogueSpeaker: null,
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
    if (!mission.npcs.length) state.itemVisible = true;
    renderHud();
    if (mission.petLines.length) queueDialogue(mission.pet, mission.petLook, [mission.petLines[0]]);
    else if (mission.introLines.length) queueDialogue(mission.hero, mission.heroLook, mission.introLines);
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
    const pet = state.pet;
    if (!pet) return;
    const idx = state.trail.length - 18;
    if (idx >= 0) {
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
    if (!target) return;
    if (target.type === 'npc') talkTo(target.npc);
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

  function takeItem() {
    if (state.mission.finale === 'fishing') { startFishing(); return; }
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
    if (!state || state.mode !== 'roam' || !state.pet) return;
    const it = state.mission.item;
    const p = state.player;
    const d = Math.hypot(it.x - p.x, it.y - p.y);
    let msg;
    if (!state.itemVisible) msg = '*sniffs* Talk to everyone first \u2014 the trail is cold.';
    else if (state.itemTaken) msg = '*happy tail wag* Mission basically complete!';
    else if (d < 40) msg = '*BARK BARK BARK!* It is RIGHT THERE!';
    else if (d < 90) msg = '*excited sniffing* Getting warm...';
    else if (d < 150) msg = '*low woof* Lukewarm. Keep moving.';
    else msg = '*bored yawn* Ice cold. Wrong side of the map.';
    state.petBubble = 1600;
    toast((state.mission.pet || 'Companion') + ': ' + msg);
  }

  function toast(text) {
    state.toast = text;
    state.toastUntil = performance.now() + 2200;
  }

  function capitalize(s) { return String(s).charAt(0).toUpperCase() + String(s).slice(1); }

  // --------------------------------------------------------------- dialogue
  function queueDialogue(name, look, lines, onDone) {
    state.mode = 'dialogue';
    state.dialogueQueue = lines.slice();
    state.dialogueSpeaker = { name: name || '???', look };
    state.dialogueDone = onDone || null;
    showLine();
  }

  function showLine() {
    const box = el('dialogue');
    const line = state.dialogueQueue.shift();
    if (line == null) {
      box.hidden = true;
      state.mode = 'roam';
      const done = state.dialogueDone;
      state.dialogueDone = null;
      if (done) done();
      return;
    }
    box.hidden = false;
    el('dlg-name').textContent = state.dialogueSpeaker.name;
    const portrait = el('dlg-portrait');
    if (state.dialogueSpeaker.look) {
      portrait.src = Sprites.portraitDataURL(state.dialogueSpeaker.look, 4);
      portrait.hidden = false;
    } else portrait.hidden = true;
    state.fullText = line;
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
    if (state.itemTaken) step = m.trivia ? 'Answer the riddle to close the ticket.' : 'Head home, hero.';
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
      Missions.drawItem(ctx, m.finale === 'fishing' ? 'rod' : m.item.kind, m.item.x, m.item.y, now);
    }

    const actors = [];
    m.npcs.forEach(n => actors.push({ y: n.y, draw: () => drawActor(ctx, n.look, n.x, n.y, n.dir, 0, n.talked ? null : 'bang') }));
    if (state.pet) actors.push({ y: state.pet.y, draw: () => drawActor(ctx, m.petLook, state.pet.x, state.pet.y, state.pet.dir, state.pet.frame, state.petBubble > 0 ? 'bark' : null) });
    actors.push({ y: state.player.y, draw: () => drawActor(ctx, m.heroLook, state.player.x, state.player.y, state.player.dir, state.player.frame, null) });
    actors.sort((a, b) => a.y - b.y).forEach(a => a.draw());

    // interaction prompt (rendered as crisp DOM text under the stage)
    let prompt = '';
    if (state.mode === 'roam') {
      const target = nearestTarget();
      if (target) {
        if (target.type === 'npc') prompt = 'Talk to ' + target.npc.name;
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
