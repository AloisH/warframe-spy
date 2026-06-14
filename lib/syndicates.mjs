// Syndicate shops — HARDCODED (the build only refreshes WFM plat prices).
//
// The six core syndicates each sell Warframe/weapon Augment Mods for a flat
// 25,000 standing (verified on the wiki). Augments are shared between allied
// syndicates, so the same mod appears under two of them. Offering lists were
// extracted once from WFCD warframe-items (Mods.json, isAugment && tradable).
// To add/adjust an offering or a non-25k item, edit the arrays below.

export const AUGMENT_STANDING = 25000;

export const SYNDICATES = [
  {
    name: "Steel Meridian",
    offerings: ["Abundant Mutation", "Accumulating Whipclaw", "Antimatter Absorb", "Ballistic Bullseye", "Biting Frost", "Blending Talons", "Blood Forge", "Catapult", "Chilling Globe", "Chromatic Blade", "Contagion Cloud", "Controlled Slide", "Divine Retribution", "Dread Ward", "Escape Velocity", "Exothermic", "Fireball Frenzy", "Freeze Force", "Furious Javelin", "Fused Crucible", "Gastro", "Gourmand", "Hallowed Eruption", "Hallowed Reckoning", "Healing Flame", "Hearty Nourishment", "Ice Wave Impedance", "Icy Avalanche", "Immolated Radiance", "Insatiable", "Iron Shrapnel", "Ironclad Charge", "Larva Burst", "Mesa's Waltz", "Molecular Fission", "Muzzle Flash", "Neutron Star", "Ore Gaze", "Parasitic Vitality", "Path Of Statues", "Phoenix Renewal", "Piercing Roar", "Pilfering Strangledome", "Prey Of Dynar", "Prismatic Companion", "Pyroclastic Flow", "Radiant Finish", "Reaping Chakram", "Recrystalize", "Regenerative Molt", "Reinforcing Stomp", "Revealing Spores", "Rubble Heap", "Safeguard", "Smite Infusion", "Staggering Shield", "Surging Dash", "Tectonic Fracture", "Teeming Virulence", "The Relentless Lost", "Titanic Rumbler", "Ulfrun's Endurance", "Untime Rift", "Vampiric Grasp", "Venari Bodyguard", "Venom Dose", "Volatile Recompense", "Wrath Of Ukko", "Wrecking Wall"],
  },
  {
    name: "Arbiters of Hexis",
    offerings: ["Assimilate", "Axios Javelineers", "Calm & Frenzy", "Capacitance", "Cataclysmic Continuum", "Cathode Current", "Celestial Stomp", "Chaos Sphere", "Chromatic Blade", "Coil Recharge", "Conductive Sphere", "Damage Decoy", "Desiccation's Curse", "Duality", "Elemental Sandstorm", "Elusive Retribution", "Endless Lullaby", "Energy Transfer", "Enveloping Cloud", "Explosive Legerdemain", "Furious Javelin", "Hall Of Malevolence", "Hushed Invisibility", "Intrepid Stand", "Irradiating Disarm", "Jade's Judgment", "Lasting Covenant", "Mach Crash", "Mending Splinters", "Mind Freak", "Negation Armor", "Omikuji's Fortune", "Pacifying Bolts", "Peaceful Provocation", "Primal Rage", "Radiant Finish", "Reactive Storm", "Repair Dispensary", "Reverse Rotorswell", "Rift Haven", "Rift Torrent", "Rising Storm", "Safeguard", "Safeguard Switch", "Savior Decoy", "Seeking Shuriken", "Shattered Storm", "Shock Trooper", "Shocking Speed", "Smoke Shadow", "Spectrosiphon", "Surging Dash", "Teleport Rush", "Temporal Artillery", "Temporal Erosion", "Tharros Lethality", "Thermal Transfer", "Total Eclipse", "Transistor Shield", "Tribunal", "Warding Thurible", "Warrior's Rest"],
  },
  {
    name: "Cephalon Suda",
    offerings: ["Aegis Gale", "Afterburn", "Antimatter Absorb", "Balefire Surge", "Biting Frost", "Blazing Pillage", "Blinding Reave", "Cataclysmic Continuum", "Cataclysmic Gate", "Chilling Globe", "Concentrated Arrow", "Conductor", "Controlled Slide", "Critical Surge", "Dark Propagation", "Divine Retribution", "Empowered Quiver", "Escape Velocity", "Everlasting Ward", "Explosive Legerdemain", "Freeze Force", "Fused Crucible", "Fused Reservoir", "Guardian Armor", "Guided Effigy", "Hall Of Malevolence", "Ice Wave Impedance", "Icy Avalanche", "Infiltrate", "Loyal Merulina", "Merulina Guardian", "Mesmer Shield", "Molecular Fission", "Neutron Star", "Partitioned Mallet", "Photon Repeater", "Piercing Navigator", "Pilfering Swarm", "Pyroclastic Flow", "Razor Mortar", "Reaping Chakram", "Resonance", "Resonating Quake", "Rift Haven", "Rift Torrent", "Rousing Plunder", "Safeguard", "Savage Silence", "Shadow Haze", "Sonic Fracture", "Surging Blades", "Tesla Bank", "The Relentless Lost", "Thrall Pact", "Tidal Impunity", "Total Eclipse", "Untime Rift", "Vampiric Grasp", "Vexing Retaliation", "Viral Tempest", "Wrecking Wall"],
  },
  {
    name: "The Perrin Sequence",
    offerings: ["Abating Link", "Abundant Mutation", "Aegis Gale", "Afterburn", "Balefire Surge", "Blazing Pillage", "Blinding Reave", "Cathode Current", "Champion's Blessing", "Coil Recharge", "Concentrated Arrow", "Conductive Sphere", "Counter Pulse", "Creeping Terrify", "Dark Propagation", "Desiccation's Curse", "Despoil", "Elemental Sandstorm", "Empowered Quiver", "Enraged", "Eternal War", "Everlasting Ward", "Fracturing Crush", "Greedy Pull", "Guardian Armor", "Guided Effigy", "Hysterical Assault", "Infiltrate", "Insatiable", "Iron Shrapnel", "Ironclad Charge", "Larva Burst", "Mach Crash", "Magnetized Discharge", "Mesmer Shield", "Negation Armor", "Parasitic Vitality", "Photon Repeater", "Piercing Navigator", "Piercing Roar", "Pool Of Life", "Prolonged Paralysis", "Razor Mortar", "Reinforcing Stomp", "Repair Dispensary", "Resonance", "Resonating Quake", "Reverse Rotorswell", "Savage Silence", "Shadow Haze", "Shield Of Shadows", "Sonic Fracture", "Soul Survivor", "Spectral Spirit", "Swing Line", "Teeming Virulence", "Temporal Artillery", "Temporal Erosion", "Tesla Bank", "Thermal Transfer", "Thrall Pact", "Vampire Leech", "Vexing Retaliation"],
  },
  {
    name: "Red Veil",
    offerings: ["Accumulating Whipclaw", "Airburst Rounds", "Anchored Glide", "Ballistic Bullseye", "Beguiling Lantern", "Blending Talons", "Blood Forge", "Capacitance", "Catapult", "Contagion Cloud", "Creeping Terrify", "Damage Decoy", "Despoil", "Dread Ward", "Exothermic", "Fireball Frenzy", "Funnel Clouds", "Gastro", "Gourmand", "Healing Flame", "Hearty Nourishment", "Hushed Invisibility", "Immolated Radiance", "Ironclad Flight", "Irradiating Disarm", "Jade's Judgment", "Jet Stream", "Lasting Covenant", "Lingering Transmutation", "Mesa's Waltz", "Muzzle Flash", "Ore Gaze", "Path Of Statues", "Pilfering Strangledome", "Prey Of Dynar", "Prismatic Companion", "Razorwing Blitz", "Recrystalize", "Regenerative Molt", "Revealing Spores", "Rising Storm", "Rubble Heap", "Safeguard", "Safeguard Switch", "Savior Decoy", "Seeking Shuriken", "Shield Of Shadows", "Shock Trooper", "Shocking Speed", "Smoke Shadow", "Soul Survivor", "Spectral Spirit", "Spellbound Harvest", "Staggering Shield", "Swift Bite", "Target Fixation", "Tectonic Fracture", "Teleport Rush", "Titanic Rumbler", "Transistor Shield", "Tribunal", "Ulfrun's Endurance", "Valence Formation", "Venari Bodyguard", "Venom Dose", "Warding Thurible", "Warrior's Rest"],
  },
  {
    name: "New Loka",
    offerings: ["Abating Link", "Airburst Rounds", "Anchored Glide", "Assimilate", "Axios Javelineers", "Beguiling Lantern", "Calm & Frenzy", "Cataclysmic Gate", "Celestial Stomp", "Champion's Blessing", "Chaos Sphere", "Conductor", "Counter Pulse", "Critical Surge", "Duality", "Elusive Retribution", "Endless Lullaby", "Energy Transfer", "Enraged", "Enveloping Cloud", "Eternal War", "Fracturing Crush", "Funnel Clouds", "Fused Reservoir", "Greedy Pull", "Hallowed Eruption", "Hallowed Reckoning", "Hysterical Assault", "Intrepid Stand", "Ironclad Flight", "Jet Stream", "Lingering Transmutation", "Loyal Merulina", "Magnetized Discharge", "Mending Splinters", "Merulina Guardian", "Mind Freak", "Omikuji's Fortune", "Pacifying Bolts", "Partitioned Mallet", "Peaceful Provocation", "Phoenix Renewal", "Pilfering Swarm", "Pool Of Life", "Primal Rage", "Prolonged Paralysis", "Razorwing Blitz", "Reactive Storm", "Rousing Plunder", "Shattered Storm", "Smite Infusion", "Spectrosiphon", "Spellbound Harvest", "Surging Blades", "Swift Bite", "Swing Line", "Target Fixation", "Tharros Lethality", "Tidal Impunity", "Valence Formation", "Vampire Leech", "Viral Tempest", "Volatile Recompense", "Wrath Of Ukko"],
  },

  // --- Hub / open-world & relay syndicates (variable standing cost per item) ---
  // Offerings + costs transcribed from the WARFRAME wiki (each syndicate's
  // Offerings table). Entries are [item, standingCost]. Tradable arcanes/mods
  // only; the build prices them on warframe.market and zeroes anything untradable.
  {
    name: 'The Quills', // Cetus — Operator (Magus/Virtuos) arcanes
    offerings: [
      ['Magus Vigor', 2500], ['Virtuos Null', 2500], ['Magus Husk', 5000],
      ['Virtuos Tempo', 5000], ['Virtuos Fury', 7500], ['Magus Cloud', 10000],
      ['Virtuos Strike', 10000], ['Magus Cadence', 10000], ['Magus Replenish', 10000],
      ['Virtuos Shadow', 10000], ['Virtuos Ghost', 10000], ['Magus Elevate', 10000],
      ['Magus Nourish', 10000],
    ],
  },
  {
    name: 'Vox Solaris', // Fortuna — Operator (Magus/Virtuos) arcanes
    offerings: [
      ['Virtuos Surge', 5000], ['Virtuos Spike', 5000], ['Virtuos Forge', 7500],
      ['Virtuos Trojan', 7500], ['Magus Anomaly', 10000], ['Magus Destruct', 10000],
      ['Magus Lockdown', 10000], ['Magus Firewall', 10000], ['Magus Drive', 10000],
      ['Magus Repair', 10000], ['Magus Melt', 10000], ['Magus Overload', 10000],
      ['Magus Accelerant', 10000], ['Magus Glitch', 10000], ['Magus Revert', 10000],
    ],
  },
  {
    name: 'The Holdfasts', // Zariman (Chrysalith) — Zariman arcanes
    offerings: [
      ['Eternal Eradicate', 5000], ['Cascadia Accuracy', 5000], ['Fractalized Reset', 5000],
      ['Molt Vigor', 5000], ['Emergence Savior', 5000], ['Eternal Onslaught', 5500],
      ['Cascadia Flare', 5500], ['Cascadia Empowered', 7500], ['Molt Efficiency', 7500],
      ['Emergence Renewed', 7500], ['Molt Reconstruct', 8500], ['Eternal Logistics', 8500],
      ['Cascadia Overcharge', 10000], ['Emergence Dissipate', 10000], ['Molt Augmented', 10000],
    ],
  },
  {
    name: 'Necraloid', // Necralisk (Deimos) — Necramech mods
    offerings: [
      ['Necramech Vitality', 10000], ['Necramech Refuel', 10000], ['Necramech Intensify', 25000],
      ['Necramech Pressure Point', 25000], ['Necramech Efficiency', 25000], ['Necramech Drift', 25000],
      ['Necramech Friction', 25000], ['Necramech Flow', 25000],
    ],
  },
  {
    name: 'Cephalon Simaris', // Sanctuary (relays) — mods (Umbral, Sacrificial, …)
    offerings: [
      ['Looter', 75000], ['Detect Vulnerability', 75000], ['Reawaken', 75000],
      ['Negate', 75000], ['Ambush', 75000], ['Energy Generator', 75000], ['Botanist', 75000],
      ['Energy Conversion', 100000], ['Health Conversion', 100000], ['Astral Autopsy', 100000],
      ['Umbral Vitality', 100000], ['Umbral Fiber', 100000], ['Umbral Intensify', 100000],
      ['Sacrificial Pressure', 100000], ['Sacrificial Steel', 100000],
    ],
  },
  {
    name: 'The Hex', // Höllvania (1999) — arcanes (Pix-Chip-only wares excluded)
    offerings: [
      ['Primary Crux', 7500], ['Melee Doughty', 7500], ['Arcane Camisado', 7500],
      ['Arcane Impetus', 7500], ['Arcane Truculence', 7500], ['Arcane Bellicose', 7500],
      ['Secondary Enervate', 7500], ['Arcane Crepuscular', 7500], ['Elemental Vice', 50000],
    ],
  },
];
