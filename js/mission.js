/* Mission schema: normalizes minimal author-written JSON into a fully playable scene. */
(function (global) {
  'use strict';

  const T = World.T;

  const THEME_HINTS = [
    ['boat', /boat|trawler|charter|deck|deep ?sea|marlin|tuna|reel|fishing rod|angler|offshore|yacht|vessel/i],
    ['themepark', /theme ?park|amusement|disney|magic kingdom|roller ?coaster|churro|fast ?pass|turnstile|park hopper|six flags|carnival|fair ?ground|teacups|ferris/i],
    ['beach', /beach|hawaii|maui|island|ocean|surf|tiki|shore|sand|snorkel|coast|tropical|vacation|cruise|sea|aloha|luau/i],
    ['snow', /snow|ski|alaska|winter|frozen|ice|blizzard|sled|arctic|holiday|christmas|tahoe|aspen/i],
    ['forest', /forest|camp|hik|trail|woods|park|cabin|trees|nature|mountain trail|scout/i],
    ['datacenter', /server|data ?cent|rack|colo|on-?prem|hardware|firewall applianc|switch|patch panel/i],
    ['space', /space|orbit|satellite|rocket|moon|mars|cosmic|nasa|launch/i],
    ['city', /city|downtown|street|conference|vegas|defcon|rsa|blackhat|airport|hotel|commute/i],
    ['mountain', /mountain|peak|summit|climb|alpine|canyon|desert/i],
    ['office', /office|desk|cubicle|meeting|standup|hq|break ?room|conference room|badge reader|printer/i]
  ];

  const ITEM_WORDS = [
    ['router', /\brogue (?:router|hotspot|ap)|evil ?twin|hotspot|access point|rogue wi-?fi\b/i],
    ['yubikey', /\byubikey|yubi key|security key|hardware key\b/i],
    ['key', /\b(?:decryptor |encryption |api |ssh |private |gpg |master )?key\b/i],
    ['token', /\b(?:2fa |mfa |api |auth |session |bearer |hardware )?token\b/i],
    ['badge', /\bbadge|keycard|access card\b/i],
    ['laptop', /\blaptop|workstation|macbook\b/i],
    ['usb', /\busb|thumb ?drive|flash drive|yubikey\b/i],
    ['certificate', /\bcert(?:ificate)?\b/i],
    ['phone', /\bphone|mobile|device\b/i],
    ['disk', /\bbackup|tape|hard ?drive|disk|archive\b/i],
    ['password', /\bpassword|passphrase|credential/i],
    ['coffee', /\bcoffee|espresso|latte|caffeine\b/i],
    ['log', /\blog file|logs|siem|evidence|pcap|packet capture\b/i]
  ];

  const ITEM_LABELS = {
    key: 'the lost key', token: 'the missing token', badge: 'the dropped badge',
    laptop: 'the abandoned laptop', usb: 'the mystery USB drive', certificate: 'the expired certificate',
    phone: 'the buzzing phone', disk: 'the backup tape', password: 'the sticky note password',
    coffee: 'the emergency coffee', log: 'the smoking-gun log file', yubikey: 'the YubiKey',
    rod: 'the fishing rod', router: 'the rogue hotspot', artifact: 'the missing artifact'
  };

  // -------------------------------------------------------------- item pixels
  function drawItem(ctx, kind, x, y, t) {
    const bob = Math.round(Math.sin(t / 260) * 1.5);
    const px = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b + bob, w, h); };
    // glow
    ctx.fillStyle = 'rgba(255, 236, 150, ' + (0.18 + 0.12 * Math.sin(t / 180)) + ')';
    ctx.beginPath(); ctx.arc(x + 8, y + 8 + bob, 8, 0, Math.PI * 2); ctx.fill();

    switch (kind) {
      case 'key':
        px(4, 5, 4, 4, '#e8c94a'); px(5, 6, 2, 2, '#8a6b1f');
        px(8, 6, 6, 2, '#e8c94a'); px(12, 8, 1, 2, '#e8c94a'); px(10, 8, 1, 2, '#e8c94a');
        break;
      case 'token':
        px(4, 3, 8, 11, '#3c3849'); px(5, 4, 6, 4, '#4bd0c8'); px(6, 5, 3, 1, '#0f2b2a');
        px(5, 9, 2, 2, '#8d8794'); px(8, 9, 2, 2, '#8d8794'); px(5, 12, 5, 1, '#8d8794');
        break;
      case 'badge':
        px(4, 3, 8, 11, '#f2f2ef'); px(5, 4, 6, 4, '#4b8fd0'); px(5, 9, 6, 1, '#8d8794');
        px(5, 11, 4, 1, '#8d8794'); px(6, 1, 4, 2, '#c94a36');
        break;
      case 'laptop':
        px(3, 4, 10, 6, '#3c3849'); px(4, 5, 8, 4, '#4bd0c8'); px(2, 10, 12, 2, '#b9b4c4');
        break;
      case 'usb':
        px(4, 6, 7, 4, '#3c3849'); px(11, 7, 3, 2, '#b9b4c4'); px(5, 7, 2, 2, '#4bd07a');
        break;
      case 'certificate':
        px(3, 4, 10, 8, '#f7f2e0'); px(4, 6, 8, 1, '#8d8794'); px(4, 8, 6, 1, '#8d8794');
        px(9, 9, 3, 3, '#c94a36');
        break;
      case 'phone':
        px(5, 3, 6, 11, '#241f30'); px(6, 4, 4, 8, '#7fc4f0'); px(7, 12, 2, 1, '#8d8794');
        break;
      case 'disk':
        px(3, 4, 10, 9, '#3c3849'); px(4, 5, 8, 4, '#8d8794'); px(5, 6, 6, 2, '#241f30');
        px(4, 10, 8, 2, '#b9b4c4');
        break;
      case 'password':
        px(3, 4, 10, 9, '#e8e07a'); px(4, 6, 7, 1, '#8a8330'); px(4, 8, 5, 1, '#8a8330');
        px(4, 10, 6, 1, '#8a8330');
        break;
      case 'coffee':
        px(4, 5, 8, 8, '#f2f2ef'); px(5, 6, 6, 2, '#5a3620'); px(12, 7, 2, 3, '#f2f2ef');
        px(6, 2, 1, 3, 'rgba(255,255,255,0.6)'); px(9, 1, 1, 4, 'rgba(255,255,255,0.6)');
        break;
      case 'log':
        px(3, 3, 10, 10, '#2b2740'); px(4, 5, 7, 1, '#4bd07a'); px(4, 7, 5, 1, '#4bd07a');
        px(4, 9, 8, 1, '#d04b6b');
        break;
      case 'yubikey':
        px(3, 6, 10, 5, '#241f30'); px(3, 6, 10, 1, '#3c3849');
        px(5, 7, 3, 3, '#e8c94a'); px(6, 8, 1, 1, '#8a6b1f');
        px(13, 7, 2, 3, '#b9b4c4'); px(10, 7, 2, 1, '#4bd07a');
        break;
      case 'rod':
        px(3, 13, 11, 2, '#6b3f22');
        px(4, 2, 2, 12, '#a5713f'); px(4, 2, 2, 3, '#c08850');
        px(6, 6, 3, 3, '#8d8794'); px(6, 7, 3, 1, '#3c3849');
        px(9, 3, 1, 9, '#f2f2ef'); px(9, 11, 3, 1, '#f2f2ef');
        px(11, 10, 2, 3, '#4bd0c8');
        break;
      case 'router':
        px(3, 8, 10, 6, '#2b2740'); px(4, 9, 8, 4, '#3c3849');
        px(4, 3, 1, 6, '#8d8794'); px(11, 3, 1, 6, '#8d8794');
        px(5, 10, 1, 1, '#4bd07a'); px(7, 10, 1, 1, '#e0553f'); px(9, 10, 1, 1, '#e0553f');
        px(6, 1, 4, 1, 'rgba(224,85,63,0.75)'); px(5, 0, 6, 1, 'rgba(224,85,63,0.45)');
        break;
      case 'passkey':
        px(3, 4, 10, 9, '#2b2740'); px(4, 5, 8, 7, '#3f7fd0');
        px(6, 6, 4, 4, '#fff7c9'); px(7, 7, 2, 2, '#8a6b1f');
        px(6, 10, 4, 1, '#fff7c9'); px(5, 13, 6, 1, '#8d8794');
        break;
      default:
        px(4, 4, 8, 8, '#e8c94a'); px(6, 6, 4, 4, '#f7e07a');
    }
    // sparkle
    const s = Math.floor(t / 220) % 4;
    ctx.fillStyle = '#fff7c9';
    if (s === 0) ctx.fillRect(x + 13, y + 2 + bob, 2, 2);
    if (s === 1) ctx.fillRect(x + 1, y + 5 + bob, 2, 2);
    if (s === 2) ctx.fillRect(x + 12, y + 12 + bob, 2, 2);
  }

  // ------------------------------------------------------------- parsing bits
  function detectTheme(m) {
    const text = [m.title, m.objective, m.theme, (m.dialogue || []).join(' '), m.intro].filter(Boolean).join(' ');
    if (m.theme && World.THEMES[String(m.theme).toLowerCase()]) return String(m.theme).toLowerCase();
    for (const [name, re] of THEME_HINTS) if (re.test(text)) return name;
    return 'office';
  }

  function detectItem(m) {
    if (m.item && m.item.kind) return { kind: m.item.kind, label: m.item.name || ITEM_LABELS[m.item.kind] || 'the objective' };
    const text = [m.objective, m.title, (m.dialogue || []).join(' ')].filter(Boolean).join(' ');
    for (const [kind, re] of ITEM_WORDS) {
      const hit = text.match(re);
      if (hit) return { kind, label: (m.item && m.item.name) || cleanLabel(hit[0]) };
    }
    return { kind: 'artifact', label: (m.item && m.item.name) || ITEM_LABELS.artifact };
  }
  function cleanLabel(s) {
    return 'the ' + String(s).trim().replace(/^the\s+/i, '');
  }

  /** "Rob: Aloha!" / "Luna (Pet): *Bark!*" -> { speaker, text, isPet } */
  function parseLine(line) {
    if (typeof line === 'object' && line) {
      return { speaker: line.speaker || line.name || '', text: line.text || line.line || '', isPet: !!line.pet };
    }
    const s = String(line);
    const m = s.match(/^\s*([^:()]{1,28}?)\s*(\(([^)]*)\))?\s*:\s*([\s\S]+)$/);
    if (!m) return { speaker: '', text: s.trim(), isPet: false };
    return {
      speaker: m[1].trim(),
      text: m[4].trim(),
      isPet: /pet|dog|cat|companion|bird|bunny|rabbit/i.test(m[3] || '')
    };
  }

  // Spread-out candidate cells so NPCs never spawn on top of each other.
  const CANDIDATES = [];
  for (const c of [3, 6, 9, 12, 15, 17]) for (const r of [3, 5, 7, 9, 11]) CANDIDATES.push({ c, r });
  const DECK_CANDIDATES = [
    { c: 5, r: 6 }, { c: 13, r: 8 }, { c: 6, r: 9 }, { c: 12, r: 6 }, { c: 9, r: 11 }, { c: 14, r: 5 }
  ];
  // Clear of the carousel and the entrance sign.
  const PARK_CANDIDATES = [
    { c: 14, r: 4 }, { c: 6, r: 9 }, { c: 16, r: 8 }, { c: 9, r: 6 },
    { c: 4, r: 11 }, { c: 17, r: 11 }, { c: 12, r: 10 }, { c: 7, r: 12 }
  ];
  // Clear of the barn and the coop.
  const FARM_CANDIDATES = [
    { c: 10, r: 5 }, { c: 14, r: 8 }, { c: 5, r: 9 }, { c: 12, r: 11 },
    { c: 8, r: 8 }, { c: 17, r: 7 }, { c: 3, r: 12 }, { c: 16, r: 11 }
  ];
  const THEME_SPOTS = { boat: DECK_CANDIDATES, themepark: PARK_CANDIDATES, farm: FARM_CANDIDATES };

  function shuffled(list, rnd) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // --------------------------------------------------------------- normalize
  function normalize(raw) {
    if (!raw || typeof raw !== 'object') throw new Error('Mission must be a JSON object.');
    const m = Object.assign({}, raw);
    if (!m.title && !m.objective) throw new Error('Mission needs at least a "title" or an "objective".');

    const missionId = m.missionId || m.id || Roster.slug(m.title || 'mission');
    const rnd = World.mulberry32(World.hashString(missionId));

    const heroName = m.hero || m.player || 'Agent';
    const petNames = (m.companionPets || (m.companionPet ? [m.companionPet] : [])).filter(Boolean);
    const petName = petNames[0] || '';
    const themeName = detectTheme(m);
    const item = detectItem(m);

    const lines = (m.dialogue || []).map(raw => {
      const parsed = parseLine(raw);
      parsed.raw = raw;
      return parsed;
    }).filter(l => l.text);
    const petLines = [];
    const heroLines = [];
    const openingLines = [];
    const npcOrder = [];
    const npcMap = new Map();

    for (const l of lines) {
      const isHero = l.speaker && l.speaker.toLowerCase() === String(heroName).toLowerCase();
      const isPet = l.isPet || petNames.some(p => l.speaker.toLowerCase() === String(p).toLowerCase());
      if (isPet) { petLines.push(l.text); openingLines.push(l.raw); continue; }
      if (isHero) { heroLines.push(l.text); openingLines.push(l.raw); continue; }
      const name = l.speaker || 'Mystery Voice';
      if (!npcMap.has(name)) { npcMap.set(name, []); npcOrder.push(name); }
      npcMap.get(name).push(l.text);
    }

    // Always give the player someone to talk to.
    if (!npcOrder.length && !m.finale) {
      const fallback = 'Ops Console';
      npcMap.set(fallback, [(m.objective || 'Find the objective and report back.')]);
      npcOrder.push(fallback);
    }

    const onBoat = themeName === 'boat';
    const spots = shuffled(THEME_SPOTS[themeName] || CANDIDATES, rnd);
    const hero = onBoat ? { c: 9, r: 8 } : { c: 10, r: 12 };
    const reserved = [hero];
    const npcs = npcOrder.slice(0, 5).map((name, i) => {
      const spot = spots[i] || { c: 4 + i * 3, r: 5 };
      reserved.push(spot);
      const member = Roster.memberFor(name, 'human');
      return {
        name,
        title: member.title || '',
        look: member.appearance,
        lines: npcMap.get(name),
        c: spot.c, r: spot.r,
        x: spot.c * T, y: spot.r * T,
        dir: 'down',
        talked: false
      };
    });

    const fixedItem = m.item && m.item.c != null ? { c: m.item.c, r: m.item.r } : null;
    const itemSpot = fixedItem || (onBoat ? { c: 12, r: 11 } : (spots[npcs.length] || { c: 5, r: 8 }));
    reserved.push(itemSpot);

    const chickens = (m.chickens || []).slice(0, 5).map((c, i) => {
      const spot = FARM_CANDIDATES[(i * 3 + 1) % FARM_CANDIDATES.length];
      reserved.push(spot);
      return {
        name: c.name || ('Chicken ' + (i + 1)),
        speed: c.speed || 0.6,
        look: Appearance.pet({
          species: 'chicken',
          coat: c.coat || '#c9a06a',
          accent: c.accent || Appearance.shade(c.coat || '#c9a06a', -0.18),
          comb: c.comb || '#c94a36',
          beak: c.beak || '#e8a531'
        }),
        c: spot.c, r: spot.r, x: spot.c * T, y: spot.r * T
      };
    });

    const triviaRaw = m.triviaRiddle !== undefined ? m.triviaRiddle
      : (m.trivia !== undefined ? m.trivia : m.riddle);
    const trivia = normalizeTrivia(triviaRaw, m);
    const petMember = petName ? Roster.memberFor(petName, 'pet') : null;
    const pets = petNames.map(n => {
      const pm = Roster.memberFor(n, 'pet');
      return { name: pm.name, look: pm.appearance };
    });

    const collectibles = (m.collectibles || []).map((it, i) => {
      const spot = (THEME_SPOTS[themeName] || CANDIDATES)[(i * 2 + 2) % (THEME_SPOTS[themeName] || CANDIDATES).length];
      const cell = it.c != null ? { c: it.c, r: it.r } : spot;
      reserved.push(cell);
      return {
        kind: it.kind || 'artifact',
        label: it.label || ITEM_LABELS[it.kind] || 'the objective',
        found: it.found || '',
        buried: !!it.buried,
        c: cell.c, r: cell.r, x: cell.c * T, y: cell.r * T
      };
    });

    return {
      missionId,
      title: m.title || 'Untitled Operation',
      hero: heroName,
      heroLook: Roster.lookAt(heroName, 'human'),
      pet: petName || null,
      pets,
      petLook: petMember ? petMember.appearance : null,
      petBuff: petMember ? Roster.buffFor(petMember.appearance && petMember.appearance.species) : null,
      petLines: petLines.length ? petLines : (petName ? ['*sniff sniff* ... something is definitely buried around here.'] : []),
      objective: m.objective || 'Complete the mission.',
      startHint: m.startHint || '',
      intro: m.intro || heroLines.join(' '),
      introLines: heroLines.length ? heroLines : (m.intro ? [m.intro] : []),
      openingLines,
      outro: m.outro || '',
      reward: m.reward || 'Byte-Sized Badge',
      themeName,
      themeLabel: (World.THEMES[themeName] || {}).label || 'Somewhere Suspicious',
      npcs,
      finale: m.finale || null,
      collectibles,
      party: m.party || null,
      deniedLines: m.deniedLines || null,
      grantedLines: m.grantedLines || null,
      chickens,
      item: { kind: item.kind, label: item.label, c: itemSpot.c, r: itemSpot.r, x: itemSpot.c * T, y: itemSpot.r * T },
      heroSpawn: { x: hero.c * T, y: hero.r * T },
      reserved,
      trivia,
      raw: m
    };
  }

  function normalizeTrivia(t, m) {
    // A mission can deliberately end without a quiz (e.g. it ends in a minigame).
    if (t === null || t === false || m.skipTrivia || (!t && m.finale)) return null;
    if (!t || !t.question) {
      return {
        question: 'Quick check: what is the single best defense against a stolen password?',
        answer: 'MFA',
        accept: ['mfa', 'multi factor', 'multifactor', '2fa', 'two factor', 'multi-factor authentication'],
        hint: 'Two letters, one number... it starts with "M".',
        choices: null
      };
    }
    const answer = String(t.answer != null ? t.answer : '').trim();
    const accept = (t.accept || t.alternates || []).map(a => String(a).toLowerCase());
    if (answer) accept.push(answer.toLowerCase());
    return {
      question: String(t.question),
      answer,
      accept,
      hint: t.hint || (answer ? 'It starts with "' + answer.charAt(0).toUpperCase() + '" and has ' + answer.length + ' characters.' : 'Trust your instincts.'),
      choices: Array.isArray(t.choices) && t.choices.length ? t.choices.slice(0, 4) : null
    };
  }

  // ------------------------------------------------------------ answer check
  function normalizeAnswer(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function levenshtein(a, b) {
    if (a === b) return 0;
    const prev = new Array(b.length + 1);
    for (let j = 0; j <= b.length; j++) prev[j] = j;
    for (let i = 1; i <= a.length; i++) {
      let last = prev[0];
      prev[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const tmp = prev[j];
        prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, last + (a[i - 1] === b[j - 1] ? 0 : 1));
        last = tmp;
      }
    }
    return prev[b.length];
  }
  function checkAnswer(trivia, given) {
    const g = normalizeAnswer(given);
    if (!g) return false;
    const targets = (trivia.accept && trivia.accept.length ? trivia.accept : [trivia.answer]).map(normalizeAnswer).filter(Boolean);
    for (const t of targets) {
      if (!t) continue;
      if (g === t) return true;
      if (t.length > 4 && (g.includes(t) || t.includes(g))) return true;
      if (levenshtein(g, t) <= Math.max(1, Math.floor(t.length / 6))) return true;
    }
    return false;
  }

  function validate(raw) {
    const problems = [];
    if (!raw || typeof raw !== 'object') { problems.push('File is not a JSON object.'); return problems; }
    if (!raw.title) problems.push('Missing "title" (recommended).');
    if (!raw.objective) problems.push('Missing "objective" (recommended).');
    if (raw.dialogue && !Array.isArray(raw.dialogue)) problems.push('"dialogue" must be an array of strings.');
    if (raw.triviaRiddle && !raw.triviaRiddle.question) problems.push('"triviaRiddle" needs a "question".');
    return problems;
  }

  global.Missions = { normalize, validate, checkAnswer, drawItem, parseLine, ITEM_LABELS, detectTheme };
})(window);
