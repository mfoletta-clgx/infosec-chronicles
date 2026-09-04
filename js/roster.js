/* Cast roster: who's on the team, what they look like, and their companion pets. */
(function (global) {
  'use strict';

  const KEY = 'infosec-chronicles.roster.v3';
  const hash = World.hashString;
  const rngOf = World.mulberry32;

  const SKINS = ['#f5d9c4', '#f0cdae', '#e8b48c', '#cf9668', '#c08850', '#a9683f', '#8d5a34', '#6b4023', '#4f3020'];
  const HAIRS = ['#241d29', '#3b2415', '#5a3620', '#8a5a33', '#dfb469', '#b8341f', '#9a9aa2', '#f2f2ef', '#4a2f1d'];
  const SHIRTS = ['#3f7fd0', '#3f9c4a', '#c94a36', '#7a4fc0', '#2a9c9c', '#d9a531', '#d6459b', '#54506a', '#2f6a4a'];
  const PANTS = ['#38405c', '#2c2836', '#4a4557', '#5a4030', '#22345e'];

  const PET_BUFFS = {
    dog: { buff: 'Threat-Sniffing', desc: 'Barks louder as you close in on the objective.' },
    cat: { buff: 'Zero-Day Reflexes', desc: 'Senses anomalies before the SIEM does.' },
    rabbit: { buff: 'Rapid Response', desc: 'Hops toward whatever smells like an incident.' },
    bird: { buff: 'Packet Pigeon', desc: 'Chirps a heading straight to the target.' },
    hamster: { buff: 'Cache Cheeks', desc: 'Stores hints in its cheeks for later.' },
    guineapig: { buff: 'Squeak Alerting', desc: 'Squeaks proportionally to proximity.' },
    fish: { buff: 'Deep Packet Inspection', desc: 'Sees straight through the noise.' },
    turtle: { buff: 'Hardened Shell', desc: 'Slow, steady, and fully patched.' },
    lizard: { buff: 'Cold-Blooded Recon', desc: 'Warmer readings mean you are close.' },
    dragon: { buff: 'Firewall Breath', desc: 'Literally is the firewall.' },
    horse: { buff: 'Trojan Detection', desc: 'Knows a suspicious horse when it sees one.' },
    ferret: { buff: 'Crawl-Space Recon', desc: 'Finds things wedged in tight places.' },
    hedgehog: { buff: 'Defense in Depth', desc: 'Spiky on every layer.' },
    alpaca: { buff: 'Air-Gapped Fluff', desc: 'Insulated from all known exploits.' },
    goat: { buff: 'G.O.A.T. Compliance', desc: 'Eats audit findings for breakfast.' },
    fox: { buff: 'Social Engineering', desc: 'Charms the truth out of any NPC.' }
  };

  function buffFor(species) {
    return PET_BUFFS[String(species || '').toLowerCase()] || { buff: 'Loyal Sidekick', desc: 'Gets warmer as you near the target.' };
  }

  /** Deterministic look for anyone not in the roster, so missions never break. */
  function generateHuman(name) {
    const r = rngOf(hash('h:' + String(name).toLowerCase()));
    const pick = arr => arr[Math.floor(r() * arr.length)];
    return Appearance.human({
      skin: pick(SKINS), hair: pick(HAIRS), shirt: pick(SHIRTS), pants: pick(PANTS),
      longHair: r() < 0.45, glasses: r() < 0.35, beard: r() < 0.3,
      hat: r() < 0.15 ? pick(SHIRTS) : null
    });
  }
  function generatePet(name, species) {
    const r = rngOf(hash('p:' + String(name).toLowerCase()));
    const pick = arr => arr[Math.floor(r() * arr.length)];
    const sp = species || pick(['dog', 'cat', 'rabbit', 'bird', 'hamster', 'lizard']);
    const coat = pick(['#c98a4b', '#8a5a33', '#3a2f2a', '#d9a531', '#9a9aa2', '#f0e2c4', '#6b3a1e', '#4b6b8a']);
    return Appearance.pet({ species: sp, coat, accent: '#f2e3c8', paws: Appearance.shade(coat, -0.3) });
  }

  const DEFAULT_ROSTER = [
    {
      id: 'andrew', name: 'Andrew', role: 'human', pronouns: 'he/him',
      title: 'Information Security',
      appearance: Appearance.human({
        skin: '#f0cdae', hair: '#5a3620', shirt: '#3f7fd0', pants: '#38405c', shoes: '#2c2436'
      })
    },
    {
      id: 'jessica', name: 'Jessica', role: 'human', pronouns: 'she/her',
      title: 'Information Security',
      appearance: Appearance.human({
        skin: '#c08850', hair: '#241d29', longHair: true, ears: '#c94a36', earBand: '#c94a36',
        shirt: '#2a9c9c', pants: '#38405c', shoes: '#2c2436'
      })
    }
  ];

  let cache = null;

  function load() {
    if (cache) return cache;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) { cache = parsed; return cache; }
      }
    } catch (e) { /* corrupted storage falls back to defaults */ }
    cache = DEFAULT_ROSTER.map(m => JSON.parse(JSON.stringify(m)));
    return cache;
  }

  function save(list) {
    cache = list || cache;
    try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch (e) { /* private mode: keep in memory */ }
    return cache;
  }

  function all() { return load(); }
  function humans() { return load().filter(m => m.role !== 'pet'); }
  function pets() { return load().filter(m => m.role === 'pet'); }

  function slug(name) {
    return String(name || 'member').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'member';
  }
  function uniqueId(base) {
    const ids = new Set(load().map(m => m.id));
    let id = base, i = 2;
    while (ids.has(id)) id = base + '-' + (i++);
    return id;
  }

  function find(name) {
    if (!name) return null;
    const n = String(name).trim().toLowerCase();
    return load().find(m => String(m.name).trim().toLowerCase() === n) || null;
  }

  /** Always returns something drawable, roster hit or not. */
  function lookAt(name, role, speciesHint) {
    const m = find(name);
    if (m && m.appearance) return m.appearance;
    return role === 'pet' ? generatePet(name, speciesHint) : generateHuman(name);
  }

  function memberFor(name, role, speciesHint) {
    return find(name) || {
      id: slug(name), name: name, role: role || 'human',
      appearance: lookAt(name, role, speciesHint), generated: true
    };
  }

  function upsert(member) {
    const list = load();
    if (!member.id) member.id = uniqueId(slug(member.name));
    const i = list.findIndex(m => m.id === member.id);
    if (i >= 0) list[i] = member; else list.push(member);
    save(list);
    return member;
  }

  function remove(id) {
    save(load().filter(m => m.id !== id));
  }

  function reset() {
    cache = null;
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    return load();
  }

  function exportJSON() { return JSON.stringify(load(), null, 2); }

  function importJSON(text) {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error('Roster file must be a JSON array of cast members.');
    const clean = parsed.map(m => ({
      id: m.id || slug(m.name),
      name: m.name || 'Unnamed',
      role: m.role === 'pet' ? 'pet' : 'human',
      title: m.title || '',
      pronouns: m.pronouns || '',
      owner: m.owner || '',
      notes: m.notes || '',
      appearance: m.role === 'pet' ? Appearance.pet(m.appearance) : Appearance.human(m.appearance)
    }));
    save(clean);
    return clean;
  }

  global.Roster = {
    all, humans, pets, find, lookAt, memberFor, upsert, remove, reset,
    exportJSON, importJSON, save, slug, uniqueId,
    generateHuman, generatePet, buffFor, PET_BUFFS, DEFAULT_ROSTER
  };
})(window);
