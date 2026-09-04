/* App shell: screens, character lab, mission builder, sharing, progress. */
(function () {
  'use strict';

  const PROGRESS_KEY = 'infosec-chronicles.progress.v1';
  const LIBRARY_KEY = 'infosec-chronicles.library.v1';
  const $ = id => document.getElementById(id);
  const SCREENS = ['menu', 'brief', 'play', 'win', 'lab', 'builder'];

  let currentRaw = null;      // raw mission JSON currently queued
  let currentMission = null;  // normalized mission
  let extraMissions = [];     // episodes added by upload or share link

  // ------------------------------------------------------------------ utils
  function show(name) {
    SCREENS.forEach(s => { const el = $('screen-' + s); if (el) el.hidden = (s !== name); });
    if (name !== 'play') Game.stop();
    window.scrollTo(0, 0);
  }

  function flash(msg) {
    const f = $('flash');
    f.textContent = msg;
    f.hidden = false;
    clearTimeout(flash._t);
    flash._t = setTimeout(() => { f.hidden = true; }, 2400);
  }

  function b64encode(str) {
    return btoa(String.fromCharCode.apply(null, new TextEncoder().encode(str)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64decode(str) {
    const s = str.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(s + '='.repeat((4 - s.length % 4) % 4));
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => flash('Link copied!'), () => prompt('Copy this link:', text));
    } else {
      prompt('Copy this link:', text);
    }
  }

  function download(filename, text) {
    const blob = new Blob([text], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function readJSONFile(input, onLoad) {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try { onLoad(JSON.parse(reader.result)); }
      catch (e) { flash('That file is not valid JSON.'); }
    };
    reader.readAsText(file);
    input.value = '';
  }

  // --------------------------------------------------------------- progress
  function progress() {
    try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function saveProgress(p) {
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch (e) { /* ignore */ }
  }

  // Episodes arrive one at a time and stay in the archive forever.
  function loadLibrary() {
    try {
      const parsed = JSON.parse(localStorage.getItem(LIBRARY_KEY) || '[]');
      extraMissions = Array.isArray(parsed) ? parsed : [];
    } catch (e) { extraMissions = []; }
  }
  function saveLibrary() {
    try { localStorage.setItem(LIBRARY_KEY, JSON.stringify(extraMissions)); } catch (e) { /* ignore */ }
  }

  // --------------------------------------------------------------- episodes
  function allMissions() {
    const seen = new Set();
    return extraMissions.concat(BUILTIN_MISSIONS).filter(m => {
      const id = m.missionId || m.title;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  function renderEpisodes() {
    const list = $('episode-list');
    const done = progress();
    list.innerHTML = '';
    allMissions().forEach(raw => {
      let mission;
      try { mission = Missions.normalize(raw); }
      catch (e) { return; }
      const btn = document.createElement('button');
      btn.className = 'episode';
      const cvs = document.createElement('canvas');
      Sprites.renderPreview(cvs, mission.heroLook, { scale: 2, dir: 'down' });
      btn.appendChild(cvs);
      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.innerHTML = '<div class="name"></div><div class="sub"></div>';
      meta.querySelector('.name').textContent = mission.title;
      meta.querySelector('.sub').textContent = mission.themeLabel + ' \u00b7 ' + mission.objective;
      btn.appendChild(meta);
      const rec = done[mission.missionId];
      if (rec) {
        const d = document.createElement('div');
        d.className = 'done';
        d.textContent = '\u2605 ' + rec.score;
        btn.appendChild(d);
      }
      btn.addEventListener('click', () => openBrief(raw));
      list.appendChild(btn);

      if (extraMissions.indexOf(raw) >= 0) {
        const rm = document.createElement('button');
        rm.className = 'btn tiny ghost remove';
        rm.textContent = '\u00d7';
        rm.title = 'Remove this episode';
        rm.addEventListener('click', ev => {
          ev.stopPropagation();
          extraMissions = extraMissions.filter(x => x !== raw);
          saveLibrary();
          renderEpisodes();
        });
        btn.appendChild(rm);
      }
    });
    $('badge-count').textContent = Object.keys(done).length;
  }

  // --------------------------------------------------------------- briefing
  function openBrief(raw) {
    try {
      currentRaw = raw;
      currentMission = Missions.normalize(raw);
    } catch (e) {
      flash(e.message);
      return;
    }
    const m = currentMission;
    $('brief-place').textContent = m.themeLabel;
    $('brief-title').textContent = m.title;
    $('brief-objective').textContent = m.objective;

    const cast = $('brief-cast');
    cast.innerHTML = '';
    const people = [{ name: m.hero + ' (you)', look: m.heroLook }]
      .concat(m.pet ? [{ name: m.pet, look: m.petLook }] : [])
      .concat(m.npcs.map(n => ({ name: n.name, look: n.look })));
    people.forEach(p => {
      const chip = document.createElement('div');
      chip.className = 'cast-chip';
      const c = document.createElement('canvas');
      Sprites.renderPreview(c, p.look, { scale: 3, dir: 'down' });
      chip.appendChild(c);
      const label = document.createElement('div');
      label.textContent = p.name;
      chip.appendChild(label);
      cast.appendChild(chip);
    });

    $('brief-buff').textContent = m.petBuff
      ? m.pet + "'s companion buff \u2014 " + m.petBuff.buff + ': ' + m.petBuff.desc + ' (press B)'
      : '';
    show('brief');
  }

  function startPlay() {
    if (!currentMission) return;
    show('play');
    $('dialogue').hidden = true;
    $('trivia').hidden = true;
    Game.start(currentMission, { onWin: onWin });
  }

  function onWin(result) {
    const p = progress();
    const prev = p[result.missionId];
    if (!prev || result.score > prev.score) {
      p[result.missionId] = { score: result.score, seconds: result.seconds, reward: result.reward, at: Date.now() };
      saveProgress(p);
    }
    $('win-title').textContent = result.title;
    $('win-badge').textContent = result.reward;
    $('win-outro').textContent = result.outro
      || (result.answer ? 'Answer confirmed: ' + result.answer + '. Ticket closed, coffee earned.'
        : 'Ticket closed, coffee earned.');
    $('win-time').textContent = result.seconds + 's';
    $('win-score').textContent = result.score;
    $('win-misses').textContent = result.wrongAnswers;
    Game.stop();
    show('win');
    renderEpisodes();
  }

  function nextEpisode() {
    const list = allMissions();
    const i = list.findIndex(m => (m.missionId || m.title) === (currentRaw && (currentRaw.missionId || currentRaw.title)));
    const next = list[(i + 1) % list.length];
    if (next) openBrief(next);
  }

  function shareLink(raw) {
    const base = location.href.split('#')[0];
    return base + '#play=' + b64encode(JSON.stringify(raw));
  }

  // ------------------------------------------------------------------- lab
  const lab = { member: null, dir: 'down', frame: 0, raf: 0, photoSrc: null };

  function labFields() {
    return {
      name: $('f-name'), role: $('f-role'), title: $('f-title'), owner: $('f-owner'),
      describe: $('f-describe'), species: $('f-species')
    };
  }

  function fillSpecies() {
    const sel = $('f-species');
    if (sel.options.length) return;
    ['dog', 'cat', 'rabbit', 'bird', 'hamster', 'guineapig', 'fish', 'turtle', 'lizard', 'dragon', 'horse', 'ferret', 'hedgehog', 'alpaca', 'goat', 'fox']
      .forEach(s => {
        const o = document.createElement('option');
        o.value = s;
        o.textContent = s.charAt(0).toUpperCase() + s.slice(1);
        sel.appendChild(o);
      });
  }

  function renderRosterList() {
    const wrap = $('roster-list');
    wrap.innerHTML = '';
    Roster.all().forEach(m => {
      const btn = document.createElement('button');
      btn.className = 'roster-item' + (lab.member && lab.member.id === m.id ? ' active' : '');
      const c = document.createElement('canvas');
      Sprites.renderPreview(c, m.appearance, { scale: 2, dir: 'down' });
      btn.appendChild(c);
      const who = document.createElement('span');
      who.className = 'who';
      who.textContent = m.name;
      btn.appendChild(who);
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = m.role === 'pet' ? 'pet' : '';
      btn.appendChild(tag);
      btn.addEventListener('click', () => selectMember(m));
      wrap.appendChild(btn);
    });
  }

  function selectMember(m) {
    lab.member = JSON.parse(JSON.stringify(m));
    lab.photoSrc = null;
    $('lab-photo').hidden = true;
    $('lab-photo-empty').hidden = false;
    const f = labFields();
    f.name.value = m.name || '';
    f.role.value = m.role === 'pet' ? 'pet' : 'human';
    f.title.value = m.title || '';
    f.owner.value = m.owner || '';
    f.describe.value = m.notes || '';
    applyAppearanceToInputs(lab.member.appearance);
    toggleRoleFields();
    renderRosterList();
  }

  function applyAppearanceToInputs(a) {
    if (a.kind === 'pet' || a.species) {
      fillSpecies();
      $('f-species').value = a.species || 'dog';
      $('c-coat').value = a.coat || '#c98a4b';
      $('c-accent').value = a.accent || '#f2e3c8';
      $('c-nose').value = a.nose || '#3a2b33';
      $('c-peye').value = a.eye || '#2b1d3a';
      $('pet-buff-note').textContent = 'Companion buff: ' + Roster.buffFor(a.species).buff + ' \u2014 ' + Roster.buffFor(a.species).desc;
    } else {
      $('c-skin').value = a.skin;
      $('c-hair').value = a.hair;
      $('c-eye').value = a.eye;
      $('c-shirt').value = a.shirt;
      $('c-pants').value = a.pants;
      $('c-shoes').value = a.shoes;
      $('c-hat').value = a.hat || '#c4453c';
      $('t-long').checked = !!a.longHair;
      $('t-glasses').checked = !!a.glasses;
      $('t-beard').checked = !!a.beard;
      $('t-hat').checked = !!a.hat;
    }
  }

  function appearanceFromInputs() {
    const isPet = $('f-role').value === 'pet';
    if (isPet) {
      return Appearance.pet({
        species: $('f-species').value,
        coat: $('c-coat').value,
        accent: $('c-accent').value,
        nose: $('c-nose').value,
        eye: $('c-peye').value,
        paws: Appearance.shade($('c-coat').value, -0.3)
      });
    }
    return Appearance.human({
      skin: $('c-skin').value,
      hair: $('c-hair').value,
      eye: $('c-eye').value,
      shirt: $('c-shirt').value,
      pants: $('c-pants').value,
      shoes: $('c-shoes').value,
      hat: $('t-hat').checked ? $('c-hat').value : null,
      longHair: $('t-long').checked,
      glasses: $('t-glasses').checked,
      beard: $('t-beard').checked
    });
  }

  function toggleRoleFields() {
    const isPet = $('f-role').value === 'pet';
    fillSpecies();
    $('human-fields').hidden = isPet;
    $('pet-fields').hidden = !isPet;
    $('f-owner-wrap').hidden = !isPet;
    $('f-title-wrap').hidden = isPet;
    $('f-describe').placeholder = isPet
      ? 'fluffy orange tabby cat with white paws'
      : 'short curly dark brown hair, glasses, beard, teal hoodie, navy jeans';
  }

  function labLoop() {
    lab.frame = Math.floor(performance.now() / 170) % 4;
    const a = appearanceFromInputs();
    Sprites.renderPreview($('lab-preview'), a, { scale: 5, dir: lab.dir, frame: lab.frame });
    lab.raf = requestAnimationFrame(labLoop);
  }

  function openLab() {
    fillSpecies();
    if (!lab.member) selectMember(Roster.all()[0]);
    else renderRosterList();
    show('lab');
    cancelAnimationFrame(lab.raf);
    labLoop();
  }

  function saveMember() {
    const f = labFields();
    const name = (f.name.value || '').trim();
    if (!name) { flash('Give them a name first.'); return; }
    const isPet = f.role.value === 'pet';
    const member = {
      id: (lab.member && lab.member.id) || Roster.uniqueId(Roster.slug(name)),
      name,
      role: isPet ? 'pet' : 'human',
      title: isPet ? '' : f.title.value.trim(),
      owner: isPet ? f.owner.value.trim() : '',
      notes: f.describe.value.trim(),
      appearance: appearanceFromInputs()
    };
    Roster.upsert(member);
    lab.member = member;
    renderRosterList();
    renderEpisodes();
    fillCastDatalists();
    flash(name + ' saved to the team.');
  }

  function newMember(role) {
    const appearance = role === 'pet' ? Appearance.pet({}) : Appearance.human({});
    selectMember({ id: '', name: '', role, title: '', owner: '', notes: '', appearance });
    $('f-role').value = role;
    toggleRoleFields();
    applyAppearanceToInputs(appearance);
    $('f-name').focus();
  }

  function applyDescription() {
    const text = $('f-describe').value;
    if (!text.trim()) { flash('Describe them first, e.g. "curly red hair, glasses, green hoodie".'); return; }
    const isPet = $('f-role').value === 'pet';
    const base = appearanceFromInputs();
    const a = Appearance.fromText(text, isPet ? 'pet' : 'human', base);
    applyAppearanceToInputs(a);
    flash('Sprite updated from your description.');
  }

  function randomize() {
    const isPet = $('f-role').value === 'pet';
    const name = ($('f-name').value || 'someone') + Math.random();
    applyAppearanceToInputs(isPet ? Roster.generatePet(name, $('f-species').value) : Roster.generateHuman(name));
  }

  function matchFromPhoto(img) {
    const isPet = $('f-role').value === 'pet';
    const base = appearanceFromInputs();
    let a;
    try {
      a = isPet ? Appearance.analyzePetPhoto(img, base) : Appearance.analyzeHumanPhoto(img);
    } catch (e) {
      flash('Could not read that photo.');
      return;
    }
    if (!isPet) {
      a.hat = base.hat;         // keep manual hat choice
      a.eye = base.eye;
    }
    applyAppearanceToInputs(a);
    $('lab-photo').src = img.src;
    $('lab-photo').hidden = false;
    $('lab-photo-empty').hidden = true;
    flash('Colors matched. Tweak anything that looks off.');
  }

  // --------------------------------------------------------------- builder
  function fillThemes() {
    const sel = $('b-theme');
    if (sel.options.length) return;
    const auto = document.createElement('option');
    auto.value = '';
    auto.textContent = 'Auto-detect from story';
    sel.appendChild(auto);
    Object.keys(World.THEMES).forEach(k => {
      const o = document.createElement('option');
      o.value = k;
      o.textContent = World.THEMES[k].label;
      sel.appendChild(o);
    });
  }

  function fillCastDatalists() {
    const cast = $('cast-names'), pets = $('pet-names');
    if (!cast || !pets) return;
    cast.innerHTML = '';
    pets.innerHTML = '';
    Roster.humans().forEach(m => { const o = document.createElement('option'); o.value = m.name; cast.appendChild(o); });
    Roster.pets().forEach(m => { const o = document.createElement('option'); o.value = m.name; pets.appendChild(o); });
  }

  function builderJSON() {
    const dialogue = $('b-dialogue').value.split('\n').map(s => s.trim()).filter(Boolean);
    const raw = {
      missionId: ($('b-id').value || Roster.slug($('b-title').value || 'mission')).trim(),
      title: $('b-title').value.trim() || 'Untitled Operation',
      hero: $('b-hero').value.trim() || 'Agent',
      companionPet: $('b-pet').value.trim(),
      objective: $('b-objective').value.trim(),
      dialogue
    };
    if ($('b-theme').value) raw.theme = $('b-theme').value;
    if ($('b-reward').value.trim()) raw.reward = $('b-reward').value.trim();
    if ($('b-question').value.trim()) {
      raw.triviaRiddle = { question: $('b-question').value.trim(), answer: $('b-answer').value.trim() };
      if ($('b-hint').value.trim()) raw.triviaRiddle.hint = $('b-hint').value.trim();
    }
    if (!raw.companionPet) delete raw.companionPet;
    return raw;
  }

  function refreshBuilderPreview() {
    $('b-preview').textContent = JSON.stringify(builderJSON(), null, 2);
  }

  function loadIntoBuilder(raw) {
    fillThemes();
    $('b-id').value = raw.missionId || '';
    $('b-title').value = raw.title || '';
    $('b-hero').value = raw.hero || '';
    $('b-pet').value = raw.companionPet || '';
    $('b-objective').value = raw.objective || '';
    $('b-theme').value = raw.theme && World.THEMES[raw.theme] ? raw.theme : '';
    $('b-reward').value = raw.reward || '';
    $('b-dialogue').value = (raw.dialogue || []).join('\n');
    const t = raw.triviaRiddle || raw.trivia || {};
    $('b-question').value = t.question || '';
    $('b-answer').value = t.answer || '';
    $('b-hint').value = t.hint || '';
    refreshBuilderPreview();
  }

  function openBuilder() {
    fillThemes();
    fillCastDatalists();
    refreshBuilderPreview();
    show('builder');
  }

  // ------------------------------------------------------------------ boot
  function addMission(raw, andPlay) {
    const problems = Missions.validate(raw);
    if (problems.length && !raw.title && !raw.objective) { flash(problems[0]); return; }
    const id = raw.missionId || raw.title;
    if (BUILTIN_MISSIONS.some(m => (m.missionId || m.title) === id)) {
      renderEpisodes();
      if (andPlay) openBrief(raw);
      return;
    }
    extraMissions = extraMissions.filter(m => (m.missionId || m.title) !== id);
    extraMissions.unshift(raw);
    saveLibrary();
    renderEpisodes();
    if (andPlay) openBrief(raw);
  }

  function readHash() {
    const h = location.hash.replace(/^#/, '');
    if (!h) return false;
    const params = new URLSearchParams(h);
    if (params.get('play')) {
      try {
        const raw = JSON.parse(b64decode(params.get('play')));
        addMission(raw, true);
        return true;
      } catch (e) { flash('That shared mission link is damaged.'); }
    }
    if (params.get('m')) {
      const raw = BUILTIN_MISSIONS.find(x => x.missionId === params.get('m'));
      if (raw) { openBrief(raw); return true; }
    }
    return false;
  }

  function wire() {
    document.querySelectorAll('[data-go]').forEach(btn => {
      btn.addEventListener('click', () => {
        const to = btn.getAttribute('data-go');
        if (to === 'lab') openLab();
        else if (to === 'builder') openBuilder();
        else { cancelAnimationFrame(lab.raf); show(to); }
      });
    });

    $('btn-start').addEventListener('click', startPlay);
    $('btn-next').addEventListener('click', nextEpisode);
    $('btn-share-win').addEventListener('click', () => copy(shareLink(currentRaw)));

    $('btn-upload').addEventListener('click', () => $('file-mission').click());
    $('file-mission').addEventListener('change', e => readJSONFile(e.target, raw => addMission(raw, true)));

    $('btn-clear-progress').addEventListener('click', () => {
      saveProgress({});
      renderEpisodes();
      flash('Badges cleared.');
    });

    // trivia
    $('trivia-free').addEventListener('submit', e => {
      e.preventDefault();
      Game.submitAnswer($('trivia-input').value);
    });
    $('trivia-hint').addEventListener('click', () => Game.revealHint());

    // lab
    $('btn-new-human').addEventListener('click', () => newMember('human'));
    $('btn-new-pet').addEventListener('click', () => newMember('pet'));
    $('f-role').addEventListener('change', () => { toggleRoleFields(); applyAppearanceToInputs(appearanceFromInputs()); });
    $('btn-apply-describe').addEventListener('click', applyDescription);
    $('btn-randomize').addEventListener('click', randomize);
    $('btn-save-member').addEventListener('click', saveMember);
    $('btn-delete-member').addEventListener('click', () => {
      if (!lab.member || !lab.member.id) return;
      Roster.remove(lab.member.id);
      lab.member = null;
      selectMember(Roster.all()[0] || { id: '', name: '', role: 'human', appearance: Appearance.human({}) });
      renderEpisodes();
      flash('Removed.');
    });
    document.querySelectorAll('[data-dir]').forEach(b => {
      b.addEventListener('click', () => { lab.dir = b.getAttribute('data-dir'); });
    });
    $('btn-photo').addEventListener('click', () => $('file-photo').click());
    $('file-photo').addEventListener('change', e => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      Appearance.loadImageFromFile(file).then(matchFromPhoto).catch(err => flash(err.message));
      e.target.value = '';
    });
    $('btn-export-roster').addEventListener('click', () => download('infosec-chronicles-team.json', Roster.exportJSON()));
    $('btn-import-roster').addEventListener('click', () => $('file-roster').click());
    $('file-roster').addEventListener('change', e => readJSONFile(e.target, data => {
      try {
        Roster.importJSON(JSON.stringify(data));
        lab.member = null;
        selectMember(Roster.all()[0]);
        renderEpisodes();
        fillCastDatalists();
        flash('Team imported.');
      } catch (err) { flash(err.message); }
    }));
    $('btn-reset-roster').addEventListener('click', () => {
      Roster.reset();
      lab.member = null;
      selectMember(Roster.all()[0]);
      flash('Team reset to defaults.');
    });

    // builder
    ['b-title', 'b-id', 'b-hero', 'b-pet', 'b-objective', 'b-dialogue', 'b-question', 'b-answer', 'b-hint', 'b-reward', 'b-theme']
      .forEach(id => $(id).addEventListener('input', refreshBuilderPreview));
    $('b-theme').addEventListener('change', refreshBuilderPreview);
    $('btn-build-play').addEventListener('click', () => addMission(builderJSON(), true));
    $('btn-build-download').addEventListener('click', () => {
      const raw = builderJSON();
      download((raw.missionId || 'mission') + '.json', JSON.stringify(raw, null, 2));
    });
    $('btn-build-share').addEventListener('click', () => copy(shareLink(builderJSON())));
    $('btn-build-load').addEventListener('click', () => $('file-builder').click());
    $('file-builder').addEventListener('change', e => readJSONFile(e.target, loadIntoBuilder));

    window.addEventListener('hashchange', () => { if (!readHash()) show('menu'); });
  }

  function boot() {
    wire();
    loadLibrary();
    fillThemes();
    fillCastDatalists();
    renderEpisodes();
    if (!readHash()) show('menu');
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
