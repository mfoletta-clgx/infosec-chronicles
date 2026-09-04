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
    }
  ];
})(window);
