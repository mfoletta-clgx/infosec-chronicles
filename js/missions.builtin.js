/* Shipped episodes. Same shape as any uploaded mission file. */
(function (global) {
  'use strict';

  global.BUILTIN_MISSIONS = [
    {
      missionId: 'ep-01-tuna-two-factor',
      title: 'Operation: Tuna Two-Factor',
      hero: 'Andrew',
      objective: "A tuna made off with Andrew's YubiKey. Get to the rod and reel it back in!",
      theme: 'boat',
      finale: 'fishing',
      reward: 'Catch of the Day',
      dialogue: [
        'Andrew: Beautiful morning. Forty miles offshore. No email, no alerts, no incident bridge.',
        'Andrew: ...and a two hundred pound tuna just took my YubiKey off the rail. Watched it go. Straight down.',
        'Andrew: Right. Nobody at HQ needs to hear about this. Grab the rod at the stern \u2014 we are getting that key back.'
      ],
      outro: 'The tuna swam off unauthenticated. Andrew logged in on the first try. Balance restored.'
    },
    {
      missionId: 'ep-02-evil-twin-park',
      title: 'Operation: Evil Twin',
      hero: 'Jessica',
      objective: 'A tourist is about to join a fake hotspot. Find the rogue router and stop the connection!',
      theme: 'themepark',
      reward: 'Evil Twin Exorcist',
      item: { kind: 'router', name: 'the rogue router' },
      dialogue: [
        'Jessica: Ninety minute wait for the teacups. Great. Plenty of time to stare at my phone and\u2014 hold on.',
        'Jessica: "Park_Free_HighSpeed_VIP." Open. No password. That is not an official network.',
        'Tourist: Ooh, free WiFi! I just need to check the wait times and log into my park account real quick.',
        'Tourist: It has four bars and everything, and it says VIP right in the name. That means it is the good one, right?',
        'Tourist: Wait. You are making a face. Is it... is it not safe to connect to this?'
      ],
      triviaRiddle: {
        question: 'Jessica: "Do NOT tap connect. Somebody nearby is broadcasting a lookalike network to harvest logins \u2014 it is called an evil twin. You can still use open WiFi safely, but only if you remember the golden rule of public networks. What is it?"',
        choices: [
          "It's safe as long as the signal has 4 bars.",
          'Use cellular data or an encrypted VPN, and never ignore certificate warnings.',
          "It's fine if you browse in Incognito / Private mode.",
          'Safe only if the network name says "Official" or "VIP".'
        ],
        answer: 'Use cellular data or an encrypted VPN, and never ignore certificate warnings.',
        hint: 'Encryption is the thing that matters. The signal strength, the name, and your browser tabs are all irrelevant to an attacker sitting in the middle.'
      },
      outro: 'Rogue hotspot unplugged, tourist safely on cellular data, and Jessica made it onto the teacups. Perfect day.'
    },
    {
      missionId: 'ep-03-fowl-play',
      title: 'Operation: Fowl Play',
      hero: 'Shane',
      objective: "Shane's chickens made off with the signed security waivers. Get all three back!",
      theme: 'farm',
      finale: 'chickens',
      reward: 'Poultry In Motion',
      chickens: [
        { name: 'Marshmallow', coat: '#f4f1ea', accent: '#d8d2c4', speed: 0.60 },
        { name: 'Hen Solo', coat: '#8a5a33', accent: '#6b4023', speed: 0.54 },
        { name: 'Cluck Norris', coat: '#2f2b33', accent: '#4a4550', speed: 0.78 }
      ],
      dialogue: [
        'Shane: The signed waivers were on the porch table. In a folder. Weighted down with a rock.',
        'Shane: The rock is still there. The folder is not.',
        'Shane: Marshmallow has one. Hen Solo has one. And Cluck Norris has the one Legal actually asked about twice.',
        'Shane: Put out a watermelon with B \u2014 they will abandon anything for it. You are not out-running Cluck Norris on foot. Nobody out-runs Cluck Norris.'
      ],

      outro: 'Three waivers recovered, two only lightly chewed. Cluck Norris remains unrepentant and has been added to the risk register.'
    },
    {
      missionId: 'ep-04-paws-and-passkeys',
      title: 'Operation: Paws & Passkeys',
      hero: 'Austin',
      companionPets: ['Milly', 'Mochi'],
      objective: "Milly and Mochi failed biometric setup at Shane's coop. Dig up the consent form and enroll their paws!",
      startHint: 'Head for the coop at the top right and try the scanner \u2014 follow the arrow.',
      theme: 'farm',
      finale: 'passkey',
      reward: 'Certified Good Boys',
      item: { kind: 'scanner', name: 'the biometric scanner', c: 16, r: 5 },
      dialogue: [
        'Austin: Shane finally turned on passwordless at the chicken coop. Fingerprint, facial recognition, the whole setup.',
        'Austin: Milly and Mochi are going to love this. No more waiting on me to open the door.',
        'Milly (Pet): *headphones on, entirely unbothered* I was told there would be a party.',
        'Mochi (Pet): *already scratching at the door* LET US IN LET US IN LET US IN'
      ],
      deniedLines: [
        'COOP-SEC: BIOMETRIC ENROLLMENT STARTING. PLEASE PRESENT FINGERPRINT.',
        'COOP-SEC: NO FINGERPRINT DETECTED. FALLING BACK TO FACIAL RECOGNITION.',
        'COOP-SEC: FACE NOT RECOGNIZED. SUBJECT APPEARS TO BE A VERY SMALL DOG.',
        'COOP-SEC: ACCESS DENIED. BIOMETRIC CONSENT NOT FOUND.',
        'Austin: Right \u2014 before anyone can use fingerprint or face unlock, they have to consent to it first.',
        'Austin: And that consent form lives in Saviynt. Same as the passwordless rollout at work.',
        'Austin: I printed a copy and... Mochi buried it in the yard. Obviously.',
        'Austin: Milly, Mochi \u2014 find it. Watch their noses. The colder the reading, the further off I am.'
      ],
      collectibles: [
        {
          kind: 'certificate', label: 'the biometric consent form', buried: true, c: 5, r: 9,
          found: 'Both dogs got to it before I did. The biometric consent form \u2014 submitted through Saviynt, exactly like the real passwordless rollout. No consent on file, no fingerprint, no face unlock, no paws. Signed, filed, slightly chewed.'
        }
      ],
      grantedLines: [
        'COOP-SEC: BIOMETRIC CONSENT ON FILE VIA SAVIYNT. THANK YOU.',
        'COOP-SEC: FINGERPRINT AND FACIAL RECOGNITION UNSUPPORTED FOR THIS SUBJECT TYPE.',
        'COOP-SEC: ENROLLING ALTERNATIVE MODALITY \u2014 PAW PRINT AUTHENTICATION.',
        'COOP-SEC: PRESENT LEFT FRONT PAW... CAPTURED. PRESENT RIGHT FRONT PAW... CAPTURED.',
        'Mochi (Pet): *presents paw with enormous dignity*',
        'COOP-SEC: PAW PRINT ENROLLED. ACCESS GRANTED. WELCOME, GOOD DOGS.'
      ],
      party: {
        speaker: 'Shane',
        guests: [
          { name: 'Shane', c: 5, r: 7 },
          { name: 'Marshmallow', species: 'chicken', coat: '#f4f1ea', accent: '#d8d2c4', c: 13, r: 7 },
          { name: 'Hen Solo', species: 'chicken', coat: '#8a5a33', accent: '#6b4023', c: 16, r: 9, dir: 'left' },
          { name: 'Cluck Norris', species: 'chicken', coat: '#2f2b33', accent: '#4a4550', c: 4, r: 10, dir: 'right' }
        ],
        lines: [
          'Shane: Welcome in. Mind the heated floors, they are on a schedule.',
          'Austin: Shane. Your chickens have a chandelier.',
          'Shane: They have a chandelier, a hot tub, a wine fridge and better wifi than the office. Yes.',
          'Austin: My apartment has none of those things.',
          'Shane: Your apartment also does not have biometric access control on the front door. Take notes.',
          'Milly (Pet): *plugs headphones into the sound system* This is my party now.',
          'Mochi (Pet): *immediately gets in the hot tub*',
          'Shane: ...The hot tub was NOT part of the access request.'
        ]
      },
      outro: 'Consent filed in Saviynt, paw prints enrolled, and two dogs are now permanent residents of the nicest coop in the county.'
    },
    {
      missionId: 'ep-05-epic-bike-commute',
      title: 'Operation: The Epic Bike Commute',
      hero: 'Rob',
      objective: 'Ride I-5 north to the Irvine office and film this month\u2019s 60 Seconds of Cyber!',
      theme: 'road',
      finale: 'bikecommute',
      reward: 'Survived Another Day in Security Leadership',
      item: { kind: 'badge', name: 'the office badge reader', c: 9, r: 1 },
      dialogue: [
        'Rob: San Diego to Irvine. On a bike. Because the 60 Seconds of Cyber video films in the Irvine office and I said I would be there.',
        'Rob: Ride UP the road with the arrow keys. The traffic is not cars. The traffic is my job.',
        'Rob: And apparently the badge reader will not let me in until I have absorbed the full daily quota of corporate nonsense. So: go get hit by all five.'
      ],
      startHint: 'Ride UP with arrows/WASD. Get hit by each kind of traffic once to hear its excuse \u2014 you need all 5 to badge in.',
      traffic: [
        {
          kind: 'calendar', name: 'Calendar Invite', lane: 11, speed: 0.55, dir: -1, count: 2,
          joke: 'Rob: A calendar invite, double-booked straight over the ride I announced in three channels. Accepted on my behalf, naturally.'
        },
        {
          kind: 'teams', name: 'Teams Message', lane: 9, speed: 0.8, dir: 1, count: 2,
          joke: 'Rob: "Got a minute?" I am on a bicycle. On a freeway. Visibly. No, I do not have a minute.'
        },
        {
          kind: 'budget', name: 'Budget Request', lane: 7, speed: 0.5, dir: -1, count: 2,
          joke: 'Rob: A budget request routed to me because I once replied to a thread about a printer in 2019.'
        },
        {
          kind: 'triplebooked', name: 'The Triple-Booked Day', lane: 5, speed: 0.85, dir: 1, count: 2,
          joke: 'Rob: The Triple-Booked Day. Three meetings, one slot, all mandatory, none of them with an agenda.'
        },
        {
          kind: 'dishwasher', name: 'Broken Dishwasher', lane: 3, speed: 0.65, dir: -1, count: 2,
          joke: 'Rob: My dishwasher just broke. I do not know why my phone thinks I need to know that while I am riding a bicycle on I-5.'
        }
      ],
      chaser: {
        name: 'John Lawson',
        who: 'John Lawson',
        speed: 0.42,
        triggerAfter: 3,
        lines: [
          'John Lawson: ROB! There you are. Quick one \u2014 can the team lunch go on the corporate card?',
          'Rob: John. I am on a bicycle. On the I-5.',
          'John Lawson: So that is a maybe. I will walk with you.'
        ]
      },
      grantedLines: [
        'BADGE READER: DAILY CORPORATE FRICTION QUOTA MET. WELCOME BACK, ROB.',
        'John Lawson: Rob! Perfect timing. About that corporate card \u2014',
        'Rob: ...You followed me forty miles for a lunch order.'
      ],
      boss: {
        who: 'John Lawson',
        title: 'John Lawson: The Corporate Card Request',
        strainLabel: 'RESOLVE',
        hint: 'HOLD TO KEEP SAYING NO \u2014 EASE OFF BEFORE YOU CAVE!',
        idle: 'HE SENSES YOU WAVERING \u2014 HE IS REACHING FOR THE CARD.',
        defeatLines: [
          'Rob: No. Final answer. Submit it through the expense system like everyone else.',
          'John Lawson: ...Fine. I will put it on mine.',
          'Rob: Sixty seconds of cyber, in the can. Lunch time.'
        ]
      },
      partyTheme: 'cheesecake',
      party: {
        guests: [
          { name: 'Shane', c: 9, r: 3 },
          { name: 'Austin', c: 9, r: 13 },
          { name: 'Jessica', c: 4, r: 9 },
          { name: 'Andrew', c: 9, r: 8 },
          { name: 'John Lawson', c: 15, r: 9 }
        ],
        lines: [
          'Shane: There he is. Rob Tennant, survivor of the I-5.',
          'Austin: Did John really follow you the whole way?',
          'Rob: Forty miles. Asking about a lunch order. Never broke stride.',
          'Jessica: And the Triple-Booked Day?',
          'Rob: Clipped me twice outside San Clemente.',
          'John Lawson: I am buying this one. My card. No further questions.',
          'Andrew: To another month of 60 Seconds of Cyber.',
          'Shane: And to Rob, who has officially survived another day in security leadership.'
        ]
      },
      outro: 'Sixty seconds of cyber filmed, John Lawson finally told no, and lunch is on his own card. Finally.'
    }
  ];
})(window);
