import { useState, useRef, useEffect } from "react";

/* ============ CRUCIBLE LEGENDS (working files: bloodgrounds-*) ============
   Five fighters · painted arena · terrain skins · element VFX
   Rules: current (see design doc; clash calendar 3/7/10, ◆ cap 3)
   ============================================================= */

const QUADS = ["NW", "NE", "SW", "SE"];
const ADJ = { NW: ["NE", "SW"], NE: ["NW", "SE"], SW: ["NW", "SE"], SE: ["NE", "SW"] };
const BUILD = "v0.82.4";
const BEATS = { break: "ward", rush: "break", ward: "rush" };
const TYPE_LABEL = { break: "BREAK", rush: "RUSH", ward: "WARD" };
const TYPE_HEX = { break: "#ef4444", rush: "#f59e0b", ward: "#38bdf8" };
const TYPE_CLS = {
  break: "bg-red-950 text-red-300 border-red-700",
  rush: "bg-amber-950 text-amber-300 border-amber-600",
  ward: "bg-sky-950 text-sky-300 border-sky-600",
};
const QPOS = { NW: { x: 0, y: 0 }, NE: { x: 50, y: 0 }, SW: { x: 0, y: 50 }, SE: { x: 50, y: 50 } };
const CLASH_ROUNDS = [3, 7, 10];
const TERRA_META = {
  frost: { icon: "❄", name: "FROST", hex: "#7dd3fc" },
  scorch: { icon: "🔥", name: "SCORCHED", hex: "#fb923c" },
  env: { icon: "🧪", name: "POISONED", hex: "#a3e635" },
  mire: { icon: "🧷", name: "MIRE", hex: "#e879f9" },
  hall: { icon: "✦", name: "SANCTUARY", hex: "#fde047" },
  whirl: { icon: "🌀", name: "WHIRLPOOL", hex: "#5eead4" },
  surf: { icon: "🌊", name: "SURF", hex: "#22d3ee" },
  dom: { icon: "⛰", name: "DOMINION", hex: "#f59e0b" },
};
const STATUS_INFO = {
  frost: "❄ FROST — end a round here (unless you're Vessk) and you're CHILLED: the next Break that hits you shatters for bonus damage.",
  scorch: "🔥 SCORCHED — end a round on this ground and you gain a Burn stack.",
  env: "🧪 POISONED — end a round here and you gain +1 Poison.",
  mire: "🧷 MIRE — the swamp keeps a doll for everyone: end a round here and you gain +1 Curse. Marrow's ground.",
  hall: "✦ SANCTUARY — consecrated ground: Kastor heals 1 ending a round here; anyone else is SEARED for 1. Sanctified Ground anchors him on it, and his Light hits harder against trespassers.",
  whirl: "🌀 WHIRLPOOL — the vortex YANKS an adjacent foe in as it opens, and GRINDS: end a round in it (unless you're Maelis) and take 1.",
  surf: "🌊 CRASHING SURF — breakers pound this ground: end a round here (unless you're Maelis) and take 1, then the wave THROWS you to an adjacent quadrant. Anchored fighters take the hit but hold.",
  dom: "⛰ DOMINION — Dhoram's claimed stone. Hold all FOUR and the arena kneels: he wins unless a tile is broken within one round. To demolish one: land a BREAK while standing on it (Pyre and Wrecking Throws also destroy tiles).",
  poison: "🧪 POISON — inert venom; the 3rd stack RUPTURES for 3 and clears. Heartseeker detonates stacks EARLY at double value — consumed stacks never rupture.",
  burn: "🔥 BURN — smoldering fuel. At round's end: take 1, then a stack fades (cap 2). Combustion detonates stacks EARLY at double value — consumed stacks never tick.",
  chill: "❄ CHILLED — the next Break that hits you SHATTERS: +1 damage (+2 if Vessk carries Shatterpoint); then the chill is consumed.",
  tolleye: "👁 WATCHER'S TOLL — the hawk's gaze has locked the foe's path: they WILL move to (or hold) the marked quadrant this round. You know where they'll be. Aim.",
  overcharge: "⚡ OVERCHARGE — Koros ended a round at full charge; each counter deals 1 to HIM when he next pays ◆ for an attack. Spend rhythmically, or vent into Bulwark Frame repairs.",
  rooted: "⛓ ROOTED — you cannot choose to move next round (knockbacks still move you).",
  skyf: "☄ SKYFALL LOADED — for that many more rounds, an arrow storm strikes a RANDOM quadrant at round's end: 2 dmg and a Mark if it finds the enemy.",
  knock: "🚪 THE THIRD KNOCK — every third wound Zhal takes (his own blood counts) makes the Door answer at round's end: a nether claw lashes a RANDOM quadrant for 2, striking everyone standing there — even Zhal. The claw's wound never knocks. The count resets, and the knocking begins again.",
  curse: "🧷 CURSE — a stitched doll takes your name: inert until Round 8, then 1 damage per 3 stacks every round. Never expires. Old Marrow's interest, collecting.",
  brand: "⏳ DOOMBRAND — detonates for 3 at the end of the marked round.",
  weak: "↓ WEAKENED — your hits deal −1 while this lasts.",
  mark: "🎯 MARKED — +1 damage taken from Wrenna PER MARK (stacks to 2) until the end of her next round.",
  kess: "🦅 KESS — Wrenna's hawk. At round's end, anyone sharing its quadrant is MARKED (+1 damage taken from Wrenna). A Wrecking Throw into its square stuns it for a round.",
  undine: "🌊 THE UNDINE — Maelis's water elemental. At round's end it lashes whoever stands with it for 1. It can be stunned, and it drains away when its time ends.",
  relic: "✦ RELIC — Ser Kastor's reliquary. Relics appear rounds 2/4/6/8; end a round on one to claim it. THREE claims and Kastor wins outright. A rival claiming one destroys it and heals 1 — the denial is their real prize.",
  flow: "✦ FLOW — a single banked charge: your next ability deals +1 (Perfect Edge: +2), consumed when it connects. Whiffs don't waste it. Flow does NOT stack — a second grant just refreshes the charge.",
};
const TAUNTS = {
  G: ["Swing first. It's politer.", "The axe is already bored.", "I counted your bones from across the pit. I'll recount them after."],
  M: ["I've already left.", "By the time you feel it, I'll have been gone a while.", "Breathe slowly. It spreads with the pulse."],
  V: ["The floor has picked a side.", "Winter doesn't argue. It waits.", "You'll keep. Cold things always do."],
  C: ["Breathe deep.", "You're already kindling. You just haven't noticed.", "The pit taught me one rule: burn first."],
  K: ["Calculating… done. Run.", "Your odds have been computed. Condolences.", "I finished this fight during your entrance."],
  Z: ["The door's still open behind me.", "I've paid worse prices for smaller wins.", "Something is watching through me. Wave."],
  L: ["I will still be standing. That is the whole trick.", "The Light keeps score. So do I.", "Kneel now and save us both the sermon."],
  O: ["You owe me nothing — yet. We'll fix that.", "The doll already has your walk down.", "Interest compounds, child. Start counting."],
  D: ["You're standing on my argument.", "The ground votes for me. All four corners.", "Everything settles. Usually into stone."],
  Y: ["The tide's already in.", "You're not drowning yet. Patience.", "This arena was always water. You've just been walking on it."],
  W: ["Kess found you first.", "The arrow left before you decided.", "Stand still. It's faster for everyone."],
  X: ["Pick a weapon. I'll match it. Then change my mind.", "Nine answers. You get one question.", "I've already parried your best idea."],
};
const RIVAL_TAUNTS = {
  GM: [{ G: "Third time settles it, elf.", M: "You said that the second time." }, { G: "The notch is still unfiled, elf.", M: "Keep it. You'll need the reminder." }],
  MG: [{ M: "You said that the second time.", G: "Third time settles it, elf." }, { M: "Keep it. You'll need the reminder.", G: "The notch is still unfiled, elf." }],
};
const REDUCED = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// Drop the path/URL to YOUR OWN copy of the track here (e.g. "warriors-of-the-world.mp3").
// Plays on title + menus, silences during bouts, resumes on the end-of-combat screen.
const MUSIC_SRC = "";
const rnd = (a) => a[Math.floor(Math.random() * a.length)];

/* ============ data ============ */
const ABILITIES = {
  // Gharzul
  skull: { f: "G", name: "Skullsplitter", type: "break", cost: 0, dmg: 1, needsTarget: true, text: "1 dmg", adv: "+1 dmg", lore: "The axe answers a question nobody asked." },
  howl: { f: "G", name: "Bloodhowl", type: "rush", cost: 0, dmg: 1, needsTarget: true, text: "1 dmg", adv: "+1 dmg", lore: "A war-cry that doubles as a promise." },
  sunder: { f: "G", name: "Bone Grinder", type: "break", cost: 1, dmg: 2, needsTarget: true, needsSplash: true, text: "2 dmg + 1 splash to an adjacent quadrant", adv: "+1 dmg", lore: "The ground remembers where the axe fell." },
  frenzy: { f: "G", name: "Blood Frenzy", type: "rush", cost: 2, dmg: 2, needsTarget: true, text: "2 dmg — 3 if Gharzul is at 6 HP or less", adv: "+1 dmg", lore: "Pain is just the body applauding." },
  iron: { f: "G", name: "Iron Hide", type: "ward", cost: 1, text: "Counter stance; take −1 from ALL damage this round, even Breaks and chip — armor is bought, never free", adv: "+1 counter", lore: "Scar tissue thick enough to blunt an axe." },
  harvest: { f: "G", name: "Red Harvest", type: "break", cost: 3, dmg: 4, needsTarget: true, text: "4 dmg — the whole harvest, all at once", adv: "+1 dmg; knockback anywhere", lore: "What he calls the good part." },
  // Maleth
  viper: { f: "M", name: "Viper Fang", type: "rush", cost: 0, dmg: 1, needsTarget: true, text: "1 dmg; +1 Poison on any contact", adv: "+1 dmg", lore: "The first cut is a down payment." },
  blackout: { f: "M", name: "Blackout", type: "ward", cost: 1, text: "Counter stance; your riposte adds +1 Poison — the paid venom engine", adv: "+1 counter and +1 MORE Poison", lore: "The lights go out. The knives don't." },
  umbral: { f: "M", name: "Umbral Step", type: "rush", cost: 1, dmg: 1, needsTarget: true, umbral: true, text: "1 dmg; choose your movement AFTER seeing the reveal", adv: "+1 dmg", lore: "He moves after the world commits." },
  gloom: { f: "M", name: "Gloomveil", type: "ward", cost: 0, text: "Counter stance", adv: "counter +1, +1 Poison, then step to an adjacent quadrant", lore: "The smoke bites back." },
  twin: { f: "M", name: "Three Fangs", type: "rush", cost: 2, dmg: 1, needsTarget: true, needsSecondary: true, text: "1 dmg to TWO quadrants, Poison on any contact — a third dagger sticks in an unhit quadrant: Poisoned ground (end a round there: +1 Poison; lasts through next round)", adv: "+1 dmg", lore: "One for where you are. One for where you'll be. One for later." },
  heart: { f: "M", name: "Heartseeker", type: "break", cost: 3, dmg: 1, needsTarget: true, text: "1 dmg, +2 per Poison stack consumed; if they carry Poison the blade CANNOT WHIFF — it finds them wherever they stand", adv: "+1 dmg", lore: "Named honestly." },
  // Vessk
  lance: { f: "V", name: "Ice Lance", type: "rush", cost: 0, dmg: 1, needsTarget: true, text: "1 dmg; Chill on any contact", adv: "+1 dmg", lore: "Cold travels faster than regret." },
  hoar: { f: "V", name: "Hoarfrost Field", type: "ward", cost: 0, text: "Counter stance; your quadrant becomes Frost", adv: "+1 counter", lore: "The floor takes his side." },
  spike: { f: "V", name: "Glacial Spike", type: "break", cost: 1, dmg: 2, needsTarget: true, text: "2 dmg — Chilled targets SHATTER under it (+1, or +2 with Shatterpoint). The frost itself is your re-chiller: herd them onto it", adv: "+1 dmg", lore: "For what the frost has already claimed." },
  freeze: { f: "V", name: "Flash Freeze", type: "rush", cost: 2, dmg: 1, needsTarget: true, text: "1 dmg; the target quadrant becomes Frost", adv: "+1 dmg; enemy is Rooted next round", lore: "Stillness, delivered." },
  mantle: { f: "V", name: "Winter's Mantle", type: "ward", cost: 1, text: "Counter stance; heal 1", adv: "+1 counter", lore: "The cold keeps its own." },
  aval: { f: "V", name: "Avalanche", type: "rush", cost: 3, dmg: 2, needsTarget: true, needsSecondary: true, secDmg: 2, text: "2 dmg to TWO quadrants of your choice", adv: "+1 dmg, +1 more per Frost quadrant (max +2)", lore: "The mountain's opinion." },
  // Ashkarra
  cinder: { f: "C", name: "Cinder Jab", type: "rush", cost: 0, dmg: 1, needsTarget: true, text: "1 dmg; Burn on any contact", adv: "+1 dmg", lore: "A handshake you'll feel tomorrow." },
  magma: { f: "C", name: "Magma Haymaker", type: "break", cost: 0, dmg: 1, needsTarget: true, text: "1 dmg; Burn on any contact", adv: "+1 dmg", lore: "Thrown with the whole furnace behind it." },
  flash: { f: "C", name: "Flashfire Step", type: "rush", cost: 1, dmg: 1, needsTarget: true, text: "1 dmg; step to an adjacent quadrant after resolution, leaving Scorched ground behind", adv: "+1 dmg", lore: "She was never standing there." },
  smoke: { f: "C", name: "Smokeveil", type: "ward", cost: 0, text: "Counter stance", adv: "+1 counter", lore: "Breathe deep." },
  comb: { f: "C", name: "Combustion", type: "break", cost: 2, dmg: 2, needsTarget: true, text: "2 dmg, +2 per Burn stack consumed — detonated stacks never get their end-of-round tick", adv: "+1 dmg", lore: "Every ember she loaned you, called in at once — at double the rate." },
  pyre: { f: "C", name: "Pyre of the Pit", type: "break", cost: 3, dmg: 2, needsTarget: true, text: "2 dmg to target AND both adjacent quadrants; every quadrant hit becomes Scorched, burning away any other terrain", adv: "+1 dmg; everything hit gains Burn", lore: "The pit takes three corners of four." },
  // Koros
  cannon: { f: "K", name: "Cannonarm", type: "break", cost: 0, dmg: 1, needsTarget: true, text: "1 dmg", adv: "+1 dmg", lore: "Original purpose, rediscovered." },
  flux: { f: "K", name: "Flux Jab", type: "rush", cost: 0, dmg: 1, needsTarget: true, text: "1 dmg", adv: "+1 dmg", lore: "A tap that recharges the tapper." },
  frame: { f: "K", name: "Bulwark Frame", type: "ward", cost: 0, text: "Counter stance; heal 1 if holding 3◆ (vent into repairs)", adv: "+1 counter", lore: "Overfull batteries mend the hull." },
  gyro: { f: "K", name: "Gyro Anchor", type: "ward", cost: 1, text: "Counter stance; you cannot be knocked back this round", adv: "+1 counter", lore: "You cannot move what refuses arithmetic." },
  arc: { f: "K", name: "Arc Discharge", type: "rush", cost: 2, dmg: 3, needsTarget: true, text: "3 dmg", adv: "+1 dmg; enemy loses 1◆", lore: "Lightning, itemized." },
  core: { f: "K", name: "Overload Core", type: "break", cost: 3, dmg: 4, needsTarget: true, text: "4 dmg — firing it drains your whole Capacitor", adv: "+1 dmg", lore: "Everything, all at once, then nothing." },
  // Zhal-Meraq (Warlock)
  ruin: { f: "Z", name: "Ruinfire", type: "break", cost: 0, hpCost: 1, dmg: 2, needsTarget: true, text: "2 dmg (costs 1 HP)", adv: "+1 dmg", lore: "The pact charges interest in advance." },
  chains: { f: "Z", name: "Umbral Chains", type: "rush", cost: 1, dmg: 1, needsTarget: true, text: "1 dmg; enemy deals −1 next round", adv: "+1 dmg", lore: "Bindings written in someone else's screaming." },
  tap: { f: "Z", name: "Life Tap", type: "ward", cost: 0, text: "Counter stance; pay 1 HP to gain +1◆", adv: "+1 counter", lore: "Blood is just power that hasn't been spent yet." },
  brand: { f: "Z", name: "Doombrand", type: "rush", cost: 2, dmg: 1, needsTarget: true, text: "1 dmg; brand detonates for 3 at end of round-after-next", adv: "+1 dmg; the fuse shortens by a round", lore: "A promissory note, payable in ruin." },
  dark: { f: "Z", name: "Devouring Dark", type: "break", cost: 3, dmg: 2, needsTarget: true, text: "2 dmg and heal 2", adv: "+1 dmg", lore: "What it eats, he keeps." },
  pact: { f: "Z", name: "Oblivion Pact", type: "break", cost: 2, hpCost: 2, dmg: 4, needsTarget: true, text: "4 dmg (costs 2◆ AND 2 HP)", adv: "+1 dmg", lore: "The biggest hit in the game. He paid everything for it." },
  // Ser Kastor (Paladin)
  censure: { f: "L", name: "Censure", type: "break", cost: 0, dmg: 1, needsTarget: true, text: "1 dmg", adv: "+1 dmg AND the enemy gains no ◆ this round — the Light disapproves when it judges you", lore: "The Light disapproves of your resources." },
  llance: { f: "L", name: "Lightlance", type: "rush", cost: 0, dmg: 1, needsTarget: true, text: "1 dmg; +1 if the target stands on Sanctuary", adv: "+1 dmg", lore: "Thrown prayer, sharpened." },
  oath: { f: "L", name: "Bulwark Oath", type: "ward", cost: 0, text: "Counter stance", adv: "+1 counter, and NOTHING can move him this round — no shove, surf, yank, or pull", lore: "The last vow of a dead order, still load-bearing." },
  aegis: { f: "L", name: "Aegis of the Vigil", type: "ward", cost: 1, text: "Counter stance; heal 1; you cannot be knocked back this round — and on a CONTESTED relic, the Vigil outlasts: you claim it (a Break through the ward denies this)", adv: "+1 counter", lore: "He plants. The world negotiates." },
  consec: { f: "L", name: "Consecration", type: "rush", cost: 2, dmg: 1, needsTarget: true, text: "1 dmg; target quadrant becomes a Sanctuary for 3 rounds", adv: "+1 dmg; your own quadrant becomes a Sanctuary too", lore: "Ground the enemy will regret standing on." },
  dawn: { f: "L", name: "Dawnhammer", type: "break", cost: 3, dmg: 3, needsTarget: true, text: "3 dmg; heal 2 if you swing it from Sanctuary", adv: "+1 dmg", lore: "Sunrise, administered directly." },
  // Old Marrow (Witch Doctor)
  stick: { f: "O", name: "Pinstick", type: "rush", cost: 0, dmg: 1, needsTarget: true, text: "1 dmg; +1 Curse on any contact", adv: "+1 dmg", lore: "A little needle for a little debt." },
  knit: { f: "O", name: "Witch Brew", type: "ward", cost: 1, text: "Counter stance; heal 1 — and your riposte carries +1 Curse", adv: "+1 counter", lore: "Something's floating in it. It's looking at you." },
  eye: { f: "O", name: "Shrunken Head", type: "break", cost: 1, dmg: 1, needsTarget: true, text: "1 dmg; enemy deals −1 next round; +1 Curse on contact", adv: "+1 dmg", lore: "Somebody's opinion, permanently reduced." },
  mireA: { f: "O", name: "Sorrow Mire", type: "rush", cost: 1, dmg: 1, needsTarget: true, text: "1 dmg; target quadrant becomes Mire for 2 rounds (+1 Curse to those ending there)", adv: "+1 dmg", lore: "The swamp travels with its friends." },
  puppet: { f: "O", name: "Puppet Pull", type: "ward", cost: 1, text: "Counter stance; after knockback resolves, drag the enemy one adjacent quadrant", adv: "counter +1 and +1 Curse", lore: "The doll goes where Marrow says. So do you." },
  sorrow: { f: "O", name: "Harvest of Sorrows", type: "rush", cost: 3, dmg: 2, needsTarget: true, text: "2 dmg, +1 per 3 Curse on the enemy (doesn't consume)", adv: "+1 dmg", lore: "The interest comes due early." },
  // Dhoram (Geomancer)
  claim: { f: "D", name: "Bedrock Claim", type: "ward", cost: 1, text: "Counter stance; your quadrant becomes Dominion", adv: "counter +1 and one adjacent quadrant converts too", lore: "The floor signs over the deed." },
  quake: { f: "D", name: "Quake Fist", type: "break", cost: 1, dmg: 2, needsTarget: true, text: "2 dmg; shatters any non-Dominion terrain in the target quadrant", adv: "+1 dmg", lore: "An argument the architecture loses." },
  grind: { f: "D", name: "Continental Grind", type: "rush", cost: 0, dmg: 1, needsTarget: true, text: "1 dmg; convert one enemy terrain into Dominion — or claim an empty quadrant if there is none", adv: "+1 dmg", lore: "He paves over your best ideas." },
  wall: { f: "D", name: "Stonewall", type: "ward", cost: 1, text: "Counter stance; cannot be knocked back; −1 from everything while on Dominion", adv: "+1 counter", lore: "The Unmoved, being unmoved." },
  fissure: { f: "D", name: "Fissure", type: "rush", cost: 2, dmg: 1, needsTarget: true, text: "1 dmg; the crack runs — the target quadrant AND one adjacent of your choice become Dominion", adv: "+1 dmg", lore: "The ground opens a branch office." },
  mount: { f: "D", name: "Mountainfall", type: "break", cost: 3, dmg: 3, needsTarget: true, text: "3 dmg; +1 if the enemy stands on Dominion", adv: "+1 dmg and their quadrant converts after the hit", lore: "The mountain's final ruling." },
  // Maelis (Hydromancer)
  lash: { f: "Y", name: "Riptide Lash", type: "rush", cost: 0, dmg: 1, needsTarget: true, text: "1 dmg", adv: "+1 dmg", lore: "The tide takes what it touches." },
  current: { f: "Y", name: "Renewing Current", type: "ward", cost: 0, text: "Counter stance; heal 1", adv: "+1 counter", lore: "Water remembers its shape." },
  bwater: { f: "Y", name: "Crushing Wave", type: "break", cost: 1, dmg: 1, needsTarget: true, text: "1 dmg; the target's quadrant becomes Crashing Surf — end a round in it: take 1 and the wave throws you out", adv: "+1 dmg", lore: "Where the wave decides to end you." },
  whirlA: { f: "Y", name: "Whirlpool", type: "ward", cost: 1, text: "Counter stance; open a Whirlpool anywhere — it yanks an adjacent foe in as it opens, and grinds whoever stands in it", adv: "+1 counter", lore: "A door that only opens downward." },
  undine: { f: "Y", name: "Summon Undine", type: "rush", cost: 2, dmg: 1, needsTarget: true, text: "1 dmg; place the Undine anywhere for 3 rounds (chips its square)", adv: "+1 dmg", lore: "The sea, on retainer." },
  storm: { f: "Y", name: "Maelstrom", type: "rush", cost: 3, dmg: 2, needsTarget: true, text: "2 dmg; both quadrants adjacent to the target become Whirlpools", adv: "+1 dmg", lore: "The whole arena learns to swim." },
  // Wrenna (Ranger)
  broad: { f: "W", name: "Broadhead", type: "rush", cost: 0, dmg: 1, needsTarget: true, text: "1 dmg", adv: "+1 dmg", lore: "A letter, hand-delivered." },
  hawk: { f: "W", name: "Hawk's Eye", type: "ward", cost: 0, text: "Counter stance; wing Kess to an ADJACENT quadrant", adv: "counter +1", lore: "Kess watches. Wrenna finishes." },
  pin: { f: "W", name: "Pinning Shot", type: "break", cost: 1, dmg: 1, needsTarget: true, text: "1 dmg; the arrow pins — Rooted next round on any contact", adv: "+1 dmg", lore: "An arrow through the boot settles arguments." },
  strideW: { f: "W", name: "Longstride", type: "ward", cost: 1, text: "Counter stance; step to an adjacent quadrant after resolution", adv: "+1 counter", lore: "She was leaving anyway." },
  toll: { f: "W", name: "Watcher's Toll", type: "rush", cost: 2, dmg: 1, needsTarget: true, text: "1 dmg; next round the enemy's movement is revealed to you", adv: "+1 dmg", lore: "The hawk collects in information." },
  sky: { f: "W", name: "Skyfall Volley", type: "break", cost: 3, dmg: 2, needsTarget: true, text: "BREAK — 2 dmg, and Kess takes wing (adjacent). Then for the NEXT TWO rounds a volley falls on a RANDOM quadrant — 2 dmg and a MARK if it finds them. Only a Rush interrupts the storm.", adv: "+1 dmg", lore: "Rain, fletched." },
  // Dregan (Weapon Master)
  cres: { f: "X", name: "Crescent Cut", type: "rush", cost: 0, dmg: 1, needsTarget: true, pivot: "break", text: "1 dmg. PIVOT (1◆): switch to BREAK after the reveal", adv: "+1 dmg", lore: "Ask which weapon. The answer changes mid-swing." },
  eguard: { f: "X", name: "Edgeguard", type: "ward", cost: 0, text: "Counter stance", adv: "counter +1 and gain Flow", lore: "The shield has a point. Literally." },
  riposte: { f: "X", name: "Riposte Draw", type: "ward", cost: 1, text: "Counter stance; gain Flow (next ability +1) whether or not anything attacks you", adv: "counter +1", lore: "He answers questions with better questions." },
  chainX: { f: "X", name: "Arsenal Chain", type: "break", cost: 1, dmg: 2, needsTarget: true, pivot: "rush", text: "2 dmg. PIVOT (1◆): switch to RUSH after the reveal", adv: "+1 dmg and gain Flow (next ability +1)", lore: "One weapon ends where the next begins." },
  cadence: { f: "X", name: "Blade Cadence", type: "rush", cost: 2, dmg: 2, needsTarget: true, text: "2 dmg; gain Flow on connect — spend the old boost into the hit, bank a new one", adv: "+1 dmg", lore: "The rhythm never resolves. That's the point." },
  arsenal: { f: "X", name: "Full Arsenal", type: "rush", cost: 3, dmg: 3, needsTarget: true, text: "3 dmg", adv: "+1 dmg", lore: "All nine edges, in order of grievance." },
  // basics
  bB: { f: "*", name: "Basic Break", type: "break", cost: 0, dmg: 1, needsTarget: true, text: "1 dmg", adv: "+1 dmg", lore: "Heavy, honest work." },
  bR: { f: "*", name: "Basic Rush", type: "rush", cost: 0, dmg: 1, needsTarget: true, text: "1 dmg", adv: "+1 dmg", lore: "Fast, honest work." },
  bW: { f: "*", name: "Basic Ward", type: "ward", cost: 0, text: "Counter stance; every Ward ripostes 1 when it catches an attack", adv: "+1 counter", lore: "Live to swing again." },
};

const PASSIVES = {
  pact: { name: "Berserker's Pact", text: "At ≤6 HP (half), your damage +1 — and the Pact demands blood: at the first clash, BOTH fighters take 1 before the bell" },
  warmonger: { name: "Warmonger", text: "You win clash ties" },
  scent: { name: "Scent of Blood", text: "When your knockback lands them elsewhere: chase adjacent, hold, or LUNGE straight into their quadrant. While sharing the enemy's quadrant, your damage +1" },
  twist: { name: "Twist the Knife", text: "+1 dmg vs foes knocked back last round" },
  tithe: { name: "Blood Tithe", text: "On rupture: heal 2, max HP +2" },
  craven: { name: "Craven Shadow", text: "Once: pay 2◆ to slip a clash" },
  permafrost: { name: "Permafrost", text: "Your Frost never melts" },
  shatter: { name: "Shatterpoint", text: "Chilled foes take +2 from your Breaks" },
  numb: { name: "Numbing Aura", text: "Foes sharing your quadrant get Chilled" },
  everburn: { name: "Everburn", text: "Your Burn cap becomes 3" },
  heatrise: { name: "Heat Rising", text: "Gain +1◆ when the foe burns" },
  killheat: { name: "Killing Heat", text: "+1 dmg in Clashes and Collisions while the foe Burns" },
  overclock: { name: "Overclock", text: "At 3◆, abilities cost 1 less" },
  nova: { name: "Discharge Nova", text: "When a paid attack leaves you at 0◆, the blast vents outward: an enemy in your quadrant takes 1, their companion there is stunned a round, and any zone under you is scoured away" },
  vent: { name: "Emergency Vent", text: "First time ≤5 HP: gain 3◆" },
  surplus: { name: "Blood Surplus", text: "Whenever you pay HP, gain +1◆" },
  agonist: { name: "Agonist", text: "+1 dmg vs enemies you've Weakened or Branded" },
  knock: { name: "The Third Knock", text: "Every 3rd wound you take (your own blood counts): at round's end a nether claw lashes a RANDOM quadrant for 2 — striking anyone there, even you. Claw wounds never knock. The count resets and it begins again." },
  pilgrim: { name: "Pilgrim's Stride", text: "When a relic spawns, step toward it" },
  vigil: { name: "Undying Vigil", text: "First time you'd hit 0 HP: survive at 1 — the Light answers: all afflictions cleansed and your bank fills to 3◆" },
  sanct: { name: "Hammer of Justice", text: "Dawnhammer's contact ROOTS the target — next round they cannot move" },
  mdeep: { name: "Marrow-Deep", text: "Curse ticks begin at Round 7" },
  stitch: { name: "Stitchwork", text: "First Curse you apply each round: heal 1" },
  juju: { name: "Bad Juju", text: "Enemies with 3+ Curse cannot heal — and each DENIED heal feeds the dolls: +1 Curse" },
  roots: { name: "Deep Roots", text: "On Dominion, nothing can move you" },
  reserves: { name: "Deep Reserves", text: "Your ◆ cap is 4" },
  home: { name: "Homefield", text: "Enemies ending a round on Dominion take 1" },
  undertow: { name: "Undertow", text: "Your shoves and throws that send the enemy INTO your water (Whirlpool or Surf) deal +1" },
  rider: { name: "Wave Rider", text: "Your movement may take you to ANY quadrant containing your water (Whirlpool or Surf) — she rides the current" },
  ebb: { name: "Ebb & Flow", text: "Whenever your water draws blood at round's end (Whirlpool, Surf, or Undine), the tide feeds you: gain Flow (next ability +1)" },
  deadeye: { name: "Deadeye", text: "+1 dmg targeting the quadrant diagonal from you" },
  talon: { name: "Talon Harass", text: "When Hawk's Eye wings Kess INTO the enemy's quadrant, the dive CHIPS them for 1" },
  parting: { name: "Parting Shot", text: "When you lose a clash, deal 1 anyway" },
  momentum: { name: "Momentum", text: "Winning Advantage grants Flow (next ability +1)" },
  pedge: { name: "Perfect Edge", text: "Your Flow strikes for +2 instead of +1" },
  tempo: { name: "Steel Tempo", text: "When your action is broken, gain +1◆" },
};

const FIGHTERS = {
  G: { key: "G", name: "GHARZUL REDHAND", short: "Gharzul", sub: "Orc Berserker · Ravager", hp: 12, pool: ["skull", "howl", "sunder", "frenzy", "iron", "harvest"], passives: ["pact", "warmonger", "scent"], aiLoad: ["skull", "howl", "iron", "harvest"], aiPass: "pact", hex: "#dc2626", tone: "text-red-400", ring: "ring-red-600", bar: "bg-red-600", blurb: "Files his axe on the bones of the last duel. Worse to fight as he bleeds.", lore: "A warband of one since his clan voted him out for excessive enthusiasm. He files his axe on the bones of the last duel and calls it maintenance — one notch stays unfiled, and it has Maleth's name on it.", style: "Playstyle: relentless pressure. Force exchanges, chase collisions, feast on Clashes, and bank ◆ for a Red Harvest kill turn.", mech: "WRECKING THROW — knock the enemy into terrain and the impact destroys it for 1 bonus damage; into a companion, and it's stunned a round. SCENT OF BLOOD makes shared quadrants HIS: point-blank damage +1. Throw them far and LUNGE after — or drop them at your feet." },
  M: { key: "M", name: "MALETH, THE HOLLOW BLADE", short: "Maleth", sub: "Dark Elf Assassin · Duelist", hp: 10, pool: ["viper", "blackout", "umbral", "gloom", "twin", "heart"], passives: ["twist", "tithe", "craven"], aiLoad: ["viper", "gloom", "umbral", "heart"], aiPass: "tithe", hex: "#10b981", tone: "text-emerald-400", ring: "ring-emerald-500", bar: "bg-emerald-500", blurb: "Denies the fight until the moment it's already lost. Poison does the waiting.", lore: "They say Maleth and Gharzul have killed each other twice already, and neither considers the matter settled. Where the orc demands the fight, Maleth declines it until it's already lost — the poison does the waiting; the blade only signs the work.", style: "Playstyle: evasion and setup. Stack Poison on every contact, dodge with Umbral Step, avoid collisions, execute the wounded.", mech: "POISON — stacks on any contact; the 3rd stack RUPTURES for 3, or Heartseeker detonates stacks early at double and cannot whiff a poisoned target. Umbral Step picks its movement AFTER the reveal." },
  V: { key: "V", name: "VESSK, THE RIMEBOUND", short: "Vessk", sub: "Cryomancer · Shaper", hp: 12, pool: ["lance", "hoar", "spike", "freeze", "mantle", "aval"], passives: ["permafrost", "shatter", "numb"], aiLoad: ["lance", "hoar", "spike", "aval"], aiPass: "shatter", hex: "#38bdf8", tone: "text-sky-300", ring: "ring-sky-500", bar: "bg-sky-500", blurb: "Freezes the ground, then shatters what stands on it. An executioner with a glacier heart.", lore: "The last lord of a winter court that froze rather than kneel — coronet in his hair, runes burning cold on the coat. He doesn't chase — he makes the ground disloyal.", style: "Playstyle: territory control. Paint Frost, herd them onto it with knockback, Chill through chip, then cash the SHATTER with a Break.", mech: "FROST & CHILL — Frost ground Chills anyone ending a round there; Chilled fighters take a SHATTER bonus from the next Break that lands." },
  C: { key: "C", name: "ASHKARRA CINDERFIST", short: "Ashkarra", sub: "Pyromancer · Ravager", hp: 11, pool: ["cinder", "magma", "flash", "smoke", "comb", "pyre"], passives: ["everburn", "heatrise", "killheat"], aiLoad: ["cinder", "smoke", "comb", "pyre"], aiPass: "heatrise", hex: "#f97316", tone: "text-orange-400", ring: "ring-orange-500", bar: "bg-orange-500", blurb: "A pit-fighter with slag-chained fists. Her fire doesn't ask permission — it lingers.", lore: "A pit-fighter with slag-chained fists and a fire-veil where the grin used to show. Her fire doesn't ask permission; it lingers, compounds, and collects.", style: "Playstyle: attrition ravager. Burn on every touch, cover retreats with Pyre, then detonate the stacks with Combustion.", mech: "BURN — sticks on any contact; at round's end each victim takes 1, then a stack fades. Let it smolder for slow value, or COMBUST the stacks early at DOUBLE value. Pyre scorches three quadrants." },
  K: { key: "K", name: "KOROS, THE WARCASTER", short: "Koros", sub: "Arcane Golem · Champion", hp: 13, pool: ["cannon", "flux", "frame", "gyro", "arc", "core"], passives: ["overclock", "nova", "vent"], aiLoad: ["cannon", "flux", "gyro", "core"], aiPass: "vent", hex: "#a78bfa", tone: "text-violet-300", ring: "ring-violet-500", bar: "bg-violet-500", blurb: "An arcane machine from the old calamities, fighting now by choice. Holding its charge makes it a fortress.", lore: "One of the great arcane machines that helped end the old world — it woke halfway through a siege, finished the shot, and has fought on its own terms ever since. Its heart is a battery; the whole duel is deciding when to spend it. Its maker's mark is Ϟ — koppa, the letter the alphabet retired — and the reactor bears Φ: flux, the current made flesh.", style: "Playstyle: the rhythm engine. Bank to full for armor, but not for long — OVERCHARGE builds each round at cap and vents into HIM on his next paid swing. Spend, recharge, spend.", mech: "CAPACITOR — ONE threshold: at full 3◆ he takes −1 from everything, and any ability cast FROM full charge hits +1. But each round ENDED at full stacks OVERCHARGE — 1 self-damage per stack on his next paid attack. Reach full, strike from it, don't squat on it." },
  Z: { key: "Z", name: "ZHAL-MERAQ OF THE OPEN DOOR", short: "Zhal", sub: "Warlock · Ravager", hp: 14, pool: ["ruin", "chains", "tap", "brand", "dark", "pact"], passives: ["surplus", "agonist", "knock"], aiLoad: ["chains", "tap", "dark", "pact"], aiPass: "surplus", hex: "#a855f7", tone: "text-purple-400", ring: "ring-purple-500", bar: "bg-purple-500", blurb: "He signed something, once, in a language made of screaming.", lore: "He signed something, once, in a language made of screaming. Now he pays in blood and collects in ruin. Nobody knows who left the door open — and Zhal-Meraq has never once denied it.", style: "Playstyle: high risk, high reward. Burn HP for above-rate damage on the Ruin half, or Weaken and Brand on the Affliction half — then drain it back.", mech: "BLOOD PRICE — some abilities cost HP (never below 1, and it doesn't stop ◆ generation). Doombrand is a 3-damage time bomb on a fuse." },
  L: { key: "L", name: "SER KASTOR VAEL, THE LAST VIGIL", short: "Kastor", sub: "Paladin · Champion", hp: 15, pool: ["censure", "llance", "oath", "aegis", "consec", "dawn"], passives: ["pilgrim", "vigil", "sanct"], aiLoad: ["llance", "oath", "aegis", "dawn"], aiPass: "vigil", hex: "#eab308", tone: "text-yellow-400", ring: "ring-yellow-500", bar: "bg-yellow-500", blurb: "He does not chase. He holds.", lore: "The last knight of a dead order, armor gilded and gore-crusted in equal measure. He does not chase. He holds.", style: "Playstyle: hold ground and heal through the siege. Consecrate the squares that matter, plant on relics, and refuse to move.", mech: "RELIQUARY — relics spawn rounds 2/4/6/8; end a round on one to claim it; 3 claims = instant win (a rival claiming one destroys it for small spoils — the denial is their prize). SANCTUARY — his consecrated ground heals him 1 and SEARS anyone else 1 at round's end." },
  D: { key: "D", name: "DHORAM THE UNMOVED", short: "Dhoram", sub: "Geomancer · Champion", hp: 14, pool: ["claim", "quake", "grind", "wall", "fissure", "mount"], passives: ["roots", "reserves", "home"], aiLoad: ["grind", "claim", "quake", "mount"], aiPass: "home", hex: "#d97706", tone: "text-amber-500", ring: "ring-amber-600", bar: "bg-amber-600", blurb: "He does not fight for the arena. He replaces it.", lore: "A quarry given a grudge. He doesn't fight for the arena. He replaces it.", style: "Playstyle: plant, hoard, pave. Convert quadrants, punish anyone standing on your ground, and make the map itself the argument.", mech: "DOMINION — convert quadrants to his ground. All four and the arena KNEELS: hold them one more round to win. On Dominion his ◆ income never resets; enemies demolish a tile by landing a BREAK while standing on it." },
  Y: { key: "Y", name: "MAELIS THE RIPTIDE", short: "Maelis", sub: "Hydromancer · Shaper", hp: 12, pool: ["lash", "current", "bwater", "whirlA", "undine", "storm"], passives: ["undertow", "rider", "ebb"], aiLoad: ["lash", "current", "bwater", "storm"], aiPass: "undertow", hex: "#0d9488", tone: "text-teal-400", ring: "ring-teal-500", bar: "bg-teal-500", blurb: "She hits you with where you're standing.", lore: "Half woman, half undertow — cobra-hooded, fang-grinned, a drowned god on retainer. She doesn't hit you. She hits you with where you're standing. The arena is her current; you're debris.", style: "Playstyle: displacement control. Open the water, shove people into it, and let the arena collect the rent.", mech: "TWO WATERS — Whirlpools trap (yank on opening, grind 1/round); Crashing Surf expels (batter 1, thrown out). Her chips come from the ground; Undertow pays when you throw someone in." },
  W: { key: "W", name: "WRENNA VAIL & KESS", short: "Wrenna", sub: "Ranger · Duelist", hp: 11, pool: ["broad", "hawk", "pin", "strideW", "toll", "sky"], passives: ["deadeye", "talon", "parting"], aiLoad: ["broad", "hawk", "pin", "sky"], aiPass: "talon", hex: "#16a34a", tone: "text-green-400", ring: "ring-green-500", bar: "bg-green-500", blurb: "Kess watches. Wrenna finishes.", lore: "A border-war sharpshooter and the red-tailed hawk that never stopped following her home.", style: "Playstyle: kite and mark. Park Kess where they'll run, punish Marked targets, and volley two zones at once with Skyfall.", mech: "KESS — a hawk token; anyone ending a round in her quadrant is MARKED (+1 dmg from Wrenna per Mark, stacks to 2); Kess flies ADJACENT only. Watcher's Toll reveals the enemy's next move to you." },
  X: { key: "X", name: "DREGAN NINE-EDGES", short: "Dregan", sub: "Weapon Master · Duelist", hp: 12, pool: ["cres", "eguard", "riposte", "chainX", "cadence", "arsenal"], passives: ["pedge", "momentum", "tempo"], aiLoad: ["cres", "eguard", "chainX", "arsenal"], aiPass: "momentum", hex: "#94a3b8", tone: "text-slate-300", ring: "ring-slate-400", bar: "bg-slate-400", blurb: "Nine weapons, one argument.", lore: "Nine weapons, one argument. Ask which one he's holding — the answer changes mid-swing.", style: "Playstyle: pressure fencing. Attack relentlessly, pivot out of bad reveals, bank Flow off wards, and cash it through Cadence and Arsenal.", mech: "NINE EDGES — Crescent Cut and Arsenal Chain may PIVOT to their other grip AFTER the reveal for 1◆ (sometimes that only buys a trade — escaping beats losing). FLOW: his wards and Cadence bank +1 for the next strike." },
  O: { key: "O", name: "OLD MARROW", short: "Marrow", sub: "Witch Doctor · Shaper", hp: 13, pool: ["stick", "knit", "eye", "mireA", "puppet", "sorrow"], passives: ["mdeep", "stitch", "juju"], aiLoad: ["eye", "knit", "mireA", "sorrow"], aiPass: "mdeep", hex: "#a3e635", tone: "text-lime-400", ring: "ring-lime-500", bar: "bg-lime-500", blurb: "Every favor accrues interest.", lore: "Nobody remembers Marrow young. The swamp taught him its oldest trade: lend a little misfortune now, collect it all back with interest later.", style: "Playstyle: patient attrition. Trade politely for seven rounds while the Curses compound. Then collect.", mech: "CURSE — inert until Round 8, then the enemy takes 1 damage per 3 stacks at the end of every round. Weaken and Puppet Pull control the meantime." },
};

/* ============ PORTRAITS ============ */
function PortraitG({ size = 120 }) {
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 120 138">
      <defs><radialGradient id="bgG" cx="50%" cy="35%"><stop offset="0%" stopColor="#3b0a0a" /><stop offset="100%" stopColor="#120404" /></radialGradient></defs>
      <rect width="120" height="138" rx="10" fill="url(#bgG)" />
      <path d="M8 132 Q60 96 112 132 L112 138 L8 138 Z" fill="#1c0a06" />
      <path d="M88 100 L100 24" stroke="#3d2a12" strokeWidth="5.5" strokeLinecap="round" />
      <path d="M88 100 L100 24" stroke="#6b4a24" strokeWidth="2" strokeLinecap="round" />
      <path d="M90 88 L96 90 M92 76 L98 78" stroke="#1c0f06" strokeWidth="2" />
      <path d="M104 32 L122 22 Q129 35 121 49 L103 43 Z" fill="#a8a29e" />
      <path d="M122 22 Q129 35 121 49 L118.5 47 Q124.5 35 119 24.5 Z" fill="#e7e5e4" />
      <path d="M96 31 L78 21 Q71 34 79 48 L97 42 Z" fill="#8f8a80" />
      <path d="M78 21 Q71 34 79 48 L81.5 46 Q75.5 34 81 23.5 Z" fill="#d6d3d1" />
      <path d="M95 28 L105 30 L104 45 L94 43 Z" fill="#57534e" />
      <path d="M95 28 L105 30 L104.5 34 L94.7 32 Z" fill="#78716c" />
      <circle cx="97.5" cy="36" r="1" fill="#a8a29e" /><circle cx="101.5" cy="37" r="1" fill="#a8a29e" />
      <path d="M97 27 L100 14 L103 27 Z" fill="#78716c" /><path d="M100 14 L101.5 25" stroke="#a8a29e" strokeWidth=".9" />
      <path d="M114 30 L111 33 M116 40 L112.5 42 M84 30 L87 33" stroke="#57534e" strokeWidth="1.6" />
      <path d="M118 46 L121.5 49.5 L116 49 Z" fill="#7f1d1d" /><path d="M119 50 L119.5 55" stroke="#7f1d1d" strokeWidth="1.2" />
      <path d="M81 47 L78 50 L83 49 Z" fill="#5c1414" />
      <path d="M20 138 Q18 92 34 84 L86 84 Q102 92 100 138 Z" fill="#4d7c0f" />
      <path d="M20 138 Q18 92 34 84 L50 84 Q34 100 32 138 Z" fill="#365314" />
      <path d="M40 92 Q50 104 44 120 M64 94 Q60 108 66 122" stroke="#2c470c" strokeWidth="2.2" fill="none" opacity=".8" />
      <path d="M52 100 L70 118" stroke="#6f9a2b" strokeWidth="1.6" opacity=".8" /><path d="M55 99 L58 104" stroke="#7f1d1d" strokeWidth="1.6" />
      <path d="M30 88 L86 130 L80 136 L26 96 Z" fill="#3d2410" />
      <path d="M46 102 Q50 100 52 104 Q52 110 47 110 Q44 106 46 102 Z" fill="#e7e0cf" /><circle cx="48" cy="105" r="1" fill="#160b04" /><circle cx="51" cy="105" r="1" fill="#160b04" />
      <path d="M60 114 L63 112 L64 118 L61 119 Z" fill="#d6cdba" />
      <path d="M44 96 Q52 92 54 100 Q48 104 44 100 Z M58 102 Q64 98 68 104" stroke="#b91c1c" strokeWidth="1.8" fill="none" opacity=".8" />
      <path d="M12 96 Q14 80 34 82 L36 100 Q22 104 12 96 Z" fill="#44403c" />
      <path d="M14 88 L6 74 L20 84 Z M24 84 L20 68 L32 82 Z M34 84 L36 68 L42 84 Z" fill="#78716c" />
      <path d="M14 88 L10 78 M24 84 L22 74" stroke="#a8a29e" strokeWidth="1.2" />
      <path d="M18 92 Q22 89 26 92 Q25 97 21 97 Q18 96 18 92 Z" fill="#d6cdba" /><circle cx="20.5" cy="93" r=".9" fill="#160b04" /><circle cx="23.5" cy="93" r=".9" fill="#160b04" /><path d="M20 95.5 L24 95.5" stroke="#160b04" strokeWidth=".7" />
      <path d="M78 86 Q94 88 92 104 L84 112 Q76 104 76 94 Z" fill="#4d7c0f" />
      <path d="M82 100 Q90 98 92 104 L88 110 Q82 108 81 104 Z" fill="#436c0d" />
      <path d="M78 90 L90 96" stroke="#2c470c" strokeWidth="1.8" opacity=".8" />
      <path d="M40 86 Q60 96 80 86" stroke="#3d2410" strokeWidth="2" fill="none" />
      <path d="M50 91 L52 98 L54 91 Z M58 93 L60 100 L62 93 Z M66 91 L68 98 L70 91 Z" fill="#e7e0cf" />
      <path d="M40 76 Q34 82 32 92 L48 86 Z M80 76 Q86 82 88 92 L72 86 Z" fill="#436c0d" />
      <path d="M42 80 L38 88 M78 80 L82 88" stroke="#2c470c" strokeWidth="1.6" />
      <path d="M28 86 Q60 76 92 86 L90 94 Q60 84 30 94 Z" fill="#1c1917" />
      <path d="M32 88 L30 94 M40 85 L38 91 M80 85 L82 91 M88 88 L90 94" stroke="#0c0a09" strokeWidth="1.2" />
      <path d="M34 64 Q32 34 60 32 Q88 34 86 64 Q86 78 76 84 L44 84 Q34 78 34 64 Z" fill="#4d7c0f" />
      <path d="M34 64 Q32 34 60 32 L60 84 L44 84 Q34 78 34 64 Z" fill="#3a5c0a" />
      <path d="M72 36 Q86 44 84 64 Q83 76 76 83 L72 78 Q80 66 78 52 Q76 42 70 38 Z" fill="#1e2d05" opacity=".5" />
      <path d="M54 32 Q52 20 60 16 Q68 20 66 32 Z" fill="#1c1917" />
      <path d="M60 16 Q66 8 62 2 Q56 8 58 14 Z" fill="#1c1917" />
      <circle cx="40" cy="40" r=".8" fill="#293e08" /><circle cx="44" cy="37" r=".8" fill="#293e08" /><circle cx="48" cy="35" r=".8" fill="#293e08" /><circle cx="76" cy="38" r=".8" fill="#293e08" /><circle cx="80" cy="42" r=".8" fill="#293e08" />
      <path d="M32 56 L22 48 L26 60 Z" fill="#436c0d" /><path d="M86 56 L96 46 L92 60 Z" fill="#4d7c0f" /><path d="M94 52 L96 50" stroke="#160b04" strokeWidth="2" /><circle cx="93" cy="57" r="2" fill="none" stroke="#d6cdba" strokeWidth="1" />
      <path d="M36 50 L84 50 L82 56 L38 56 Z" fill="#293e08" /><path d="M40 56.8 L80 56.8" stroke="#4d7c0f" strokeWidth="1.8" />
      <path d="M36 50 Q60 44 84 50 L83 53 Q60 47 37 53 Z" fill="#1e2d05" />
      <circle className="fxHalo" cx="48" cy="59" r="5" fill="#ef4444" opacity=".2" /><circle className="fxHaloB" cx="72" cy="59" r="5" fill="#ef4444" opacity=".2" />
      <path d="M43 59 L53 58 L52 64 L44 64 Z" fill="#120404" /><path d="M77 59 L67 58 L68 64 L76 64 Z" fill="#120404" />
      <circle cx="48" cy="61" r="2.3" fill="#ef4444" /><circle cx="72" cy="61" r="2.3" fill="#ef4444" /><circle cx="48.7" cy="60.2" r=".7" fill="#fecaca" /><circle cx="72.7" cy="60.2" r=".7" fill="#fecaca" />
      <path d="M40 50 L58 46 L58 52 L41 55 Z" fill="#b91c1c" opacity=".85" />
      <path d="M66 46 L84 50 L83 55 L66 52 Z" fill="#b91c1c" opacity=".6" />
      <path d="M64 46 L70 52" stroke="#6f9a2b" strokeWidth="1.6" opacity=".9" />
      <path d="M42 64 L50 66" stroke="#6f9a2b" strokeWidth="1.4" opacity=".8" />
      <path d="M56 62 L64 62 L66 70 L60 72 L54 70 Z" fill="#436c0d" />
      <path d="M56 69 L58 71 M64 69 L62 71" stroke="#1e2d05" strokeWidth="1.4" />
      <g className="fxJaw">
        <path d="M40 74 Q60 84 80 74 L78 88 Q60 96 42 88 Z" fill="#436c0d" />
        <path d="M40 74 Q60 84 80 74 L79 79 Q60 88 41 79 Z" fill="#2c470c" />
        <path d="M38 76 Q34 84 38 92 Q44 97 50 93 L48 86 Q42 84 42 78 Z" fill="#1c1917" />
        <path d="M82 76 Q86 84 82 92 Q76 97 70 93 L72 86 Q78 84 78 78 Z" fill="#1c1917" />
        <path d="M44 90 Q60 100 76 90 L74 96 Q60 104 46 96 Z" fill="#1c1917" />
        <path d="M46 90 L48 96 M54 94 L55 100 M65 94 L64 100 M74 90 L72 96" stroke="#0c0a09" strokeWidth="1.2" />
        <path d="M46 78 Q45 74 46 71 L51 71 Q52 75 51 78 Z" fill="#f5f0e1" />
        <path d="M46 71 L51 71" stroke="#a8a29e" strokeWidth="1" /><path d="M47 73 L50 71" stroke="#78716c" strokeWidth=".8" />
        <path d="M74 78 Q77 73 74 69 Q70 72 70 78 Z" fill="#f5f0e1" /><path d="M74 71 L72.5 69" stroke="#d6cdba" strokeWidth="1" />
        <path d="M55 82 L58 86 M62 86 L65 82" stroke="#f5f0e1" strokeWidth="1.6" />
      </g>
    </svg>
  );
}
function PortraitM({ size = 120 }) {
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 120 138">
      <defs><radialGradient id="bgM" cx="50%" cy="35%"><stop offset="0%" stopColor="#241c40" /><stop offset="100%" stopColor="#120d20" /></radialGradient></defs>
      <rect width="120" height="138" rx="10" fill="url(#bgM)" />
      <circle cx="16" cy="40" r="1.4" fill="#34d399" opacity=".6" /><circle cx="102" cy="70" r="1.2" fill="#10b981" opacity=".5" />
      <path d="M0 118 L34 100 L38 106 L4 124 Z" fill="#cbd5e1" /><path d="M0 118 L34 100 L36 103 L2 121 Z" fill="#f1f5f9" />
      <path d="M120 118 L86 100 L82 106 L116 124 Z" fill="#94a3b8" /><path d="M120 118 L86 100 L84 103 L118 121 Z" fill="#cbd5e1" />
      <path d="M34 100 L40 96 L44 104 L38 106 Z" fill="#1c1917" />
      <path d="M86 100 L80 96 L76 104 L82 106 Z" fill="#1c1917" />
      <path d="M8 138 L14 112 Q22 100 40 98 L80 98 Q98 100 106 112 L112 138 Z" fill="#262040" />
      <path d="M8 138 L14 112 Q22 100 40 98 L52 98 Q34 108 30 138 Z" fill="#1c1736" />
      <path d="M10 108 L0 88 L17 101 Z M21 101 L13 80 L30 97 Z M31 97 L27 84 L38 96 Z" fill="#3a3054" />
      <path d="M110 108 L120 88 L103 101 Z M99 101 L107 80 L90 97 Z M89 97 L93 84 L82 96 Z" fill="#2f2748" />
      <path d="M40 98 L34 78 L48 94 Z" fill="#2f2748" /><path d="M80 98 L86 78 L72 94 Z" fill="#262040" />
      <path d="M56 100 Q60 96 64 100 Q63 106 60 106 Q57 106 56 100 Z" fill="#d6cdba" /><circle cx="58.4" cy="101" r=".9" fill="#120d20" /><circle cx="61.6" cy="101" r=".9" fill="#120d20" />
      <path d="M32 52 L23 86 L38 72 Z" fill="#2f2748" /><path d="M88 52 L97 86 L82 72 Z" fill="#2b2344" />
      <path d="M60 0 L38 20 Q30 34 32 52 Q33 74 60 82 Q87 74 88 52 Q90 34 82 20 Z" fill="#3a3054" /><path d="M60 0 L66 8 L60 13 L55 6 Z" fill="#2f2748" />
      <path d="M60 0 L38 20 Q30 34 32 52 Q33 70 48 78 Q36 46 60 18 Z" fill="#2b2344" />
      <path d="M42 24 L60 9 L78 24" stroke="#5d4a8c" strokeWidth="1.2" fill="none" opacity=".7" />
      <path d="M42 36 Q31 54 36 74 Q42 90 34 106 L40 108 Q48 92 42 74 Q36 56 45 40 Z" fill="#8b90a6" />
      <path d="M42 50 Q37 62 41 76 Q44 88 39 100" stroke="#565b70" strokeWidth="1" fill="none" />
      <path d="M47 40 Q41 56 45 70 Q48 80 44 90 L48 88 Q52 78 49 68 Q45 56 50 42 Z" fill="#767b91" />
      <path d="M78 36 Q89 54 84 74 Q78 90 88 104 L82 108 Q73 92 79 74 Q84 56 75 40 Z" fill="#767b91" />
      <path d="M78 50 Q83 62 79 76 Q76 88 82 100" stroke="#565b70" strokeWidth="1" fill="none" />
      <path d="M73 40 Q79 56 75 70 Q72 80 77 92 L72 88 Q69 78 72 68 Q75 56 70 42 Z" fill="#8b90a6" />
      <path d="M84 60 Q92 66 96 76 L92 78 Q87 70 82 66 Z" fill="#767b91" opacity=".85" />
      <path d="M40 43 Q33 58 37 74" stroke="#c7ccdb" strokeWidth=".8" opacity=".5" fill="none" />
      <path d="M80 43 Q87 58 83 74" stroke="#c7ccdb" strokeWidth=".8" opacity=".5" fill="none" />
      <path d="M43 38 Q41 50 44 60 M77 38 Q79 50 76 60" stroke="#34d399" strokeWidth="1" fill="none" opacity=".14" />
      <path d="M31 50 Q30 36 40 30 L46 36 Q37 38 35 52 Z" fill="#3a3054" />
      <path d="M31 50 Q30 36 40 30 L42 33 Q34 38 34 50 Z" fill="#2b2344" />
      <path d="M89 50 Q90 36 80 30 L74 36 Q83 38 85 52 Z" fill="#3a3054" />
      <path d="M89 50 Q90 36 80 30 L78 33 Q86 38 86 50 Z" fill="#2f2748" />
      <path d="M35 51 Q34 42 39 35 M85 51 Q86 42 81 35" stroke="#1c1736" strokeWidth="1.2" fill="none" opacity=".8" />
      <path d="M44 36 Q60 28 76 36 L75 52 L45 52 Z" fill="#6d5a86" />
      <path d="M44 36 Q60 28 60 28 L60 52 L45 52 Z" fill="#5c4a75" />
      <circle className="fxHalo" cx="50.5" cy="45.5" r="5" fill="#34d399" opacity=".28" /><circle className="fxHaloB" cx="69.5" cy="45.5" r="5" fill="#34d399" opacity=".28" />
      <path d="M44.5 41 L57 43.5 L57 46 L45.5 44 Z" fill="#0f0a1c" />
      <path d="M75.5 41 L63 43.5 L63 46 L74.5 44 Z" fill="#0f0a1c" />
      <path d="M45.5 43.5 L56.5 45.6 L55.5 49.6 L46.5 47.4 Z" fill="#07120c" />
      <path d="M74.5 43.5 L63.5 45.6 L64.5 49.6 L73.5 47.4 Z" fill="#07120c" />
      <path d="M46.5 44.6 L55.5 46.3 L55 48.6 L47.2 46.9 Z" fill="#34d399" opacity=".4" />
      <path d="M73.5 44.6 L64.5 46.3 L65 48.6 L72.8 46.9 Z" fill="#34d399" opacity=".4" />
      <path d="M50.8 45 L50.1 48.6 M69.2 45 L69.9 48.6" stroke="#6ee7b7" strokeWidth="2" strokeLinecap="round" />
      <circle cx="50.6" cy="45.6" r=".7" fill="#f0fdf4" /><circle cx="69.4" cy="45.6" r=".7" fill="#f0fdf4" />
      <path d="M46 43.5 L44 42 M74 43.5 L76 42" stroke="#07120c" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M44.5 40 L57.5 42.6 M75.5 40 L62.5 42.6" stroke="#0f0a1c" strokeWidth="2.2" />
      <path d="M47.5 50.5 L54 51.6 M72.5 50.5 L66 51.6" stroke="#4b3c60" strokeWidth="1" opacity=".8" />
      <path d="M58.5 43.5 L60 52 L61.5 43.5" stroke="#4b3c60" strokeWidth="1.2" fill="none" opacity=".8" />
      <path d="M42 52 L78 52 L76 74 Q68 84 60 84 Q52 84 44 74 Z" fill="#94a3b8" />
      <path d="M42 52 L60 52 L60 84 Q52 84 44 74 Z" fill="#64748b" />
      <path d="M43 53 L77 53" stroke="#f1f5f9" strokeWidth="1.2" />
      <path d="M45 58 Q52 56 58 58 M62 58 Q68 56 75 58" stroke="#cbd5e1" strokeWidth=".9" fill="none" opacity=".8" />
      <path d="M56 56 L60 63 L64 56 L62 56 L60 60 L58 56 Z" fill="#cbd5e1" /><path d="M60 56 L60 63" stroke="#475569" strokeWidth=".8" />
      <path d="M48 68 L72 68 M50 65 L50 74 M55 65 L55 76 M60 66 L60 77 M65 65 L65 76 M70 65 L70 74" stroke="#120d20" strokeWidth="1.4" />
      <path d="M52.5 66 L52.5 74 M57.5 66 L57.5 75" stroke="#e2e8f0" strokeWidth=".5" opacity=".6" />
      <path d="M50 74 L52 79 M70 74 L68 79" stroke="#475569" strokeWidth="1" />
      <circle cx="44" cy="55" r="1" fill="#e2e8f0" /><circle cx="76" cy="55" r="1" fill="#e2e8f0" /><circle cx="46" cy="72" r=".9" fill="#475569" /><circle cx="74" cy="72" r=".9" fill="#475569" />
      <path d="M45 76 Q52 82 60 82" stroke="#334155" strokeWidth="1" fill="none" opacity=".7" />
      <path d="M42 54 L36 50 M78 54 L84 50" stroke="#262040" strokeWidth="2" />
    </svg>
  );
}
function PortraitV({ size = 120 }) {
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 120 138">
      <defs><radialGradient id="bgV" cx="50%" cy="35%"><stop offset="0%" stopColor="#0a1e33" /><stop offset="100%" stopColor="#030912" /></radialGradient></defs>
      <rect width="120" height="138" rx="10" fill="url(#bgV)" />
      <ellipse cx="60" cy="128" rx="42" ry="8" fill="#7dd3fc" opacity=".08" />
      <path d="M15 26 L21 32 L18 46 L12 38 Z" fill="#123252" />
      <path d="M15 26 L21 32 L17 34 Z" fill="#38bdf8" opacity=".55" />
      <path d="M15 26 L18 46" stroke="#7dd3fc" strokeWidth=".9" opacity=".8" />
      <path d="M22 44 L25 47 L23 53 L20 49 Z" fill="#123252" /><path d="M22 44 L25 47 L22.6 48 Z" fill="#38bdf8" opacity=".5" />
      <circle cx="17" cy="37" r="9" fill="#38bdf8" opacity=".1" />
      <path d="M99 46 L104 51 L102 62 L96 55 Z" fill="#123252" />
      <path d="M99 46 L104 51 L100 52.5 Z" fill="#38bdf8" opacity=".55" />
      <path d="M99 46 L102 62" stroke="#7dd3fc" strokeWidth=".8" opacity=".75" />
      <circle cx="101" cy="54" r="7" fill="#38bdf8" opacity=".1" />
      <circle cx="107" cy="44" r=".9" fill="#bae6fd" opacity=".8" />
      <path d="M60 44 Q44 44 36 50 L30 60 L26 100 L24 138 L96 138 L94 100 L90 60 L84 50 Q76 44 60 44 Z" fill="#1b2942" />
      <path d="M60 44 Q44 44 36 50 L30 60 L26 100 L24 138 L50 138 Q44 98 60 48 Z" fill="#131e33" />
      <path d="M26 58 L44 52 L46 60 L28 66 Z" fill="#22304d" />
      <path d="M94 58 L76 52 L74 60 L92 66 Z" fill="#1b2942" />
      <path d="M30 138 L34 120 L40 138 Z M84 138 L88 118 L92 138 Z" fill="#22304d" />
      <path className="fxRune" d="M36 84 Q32 78 36 72 Q42 70 44 76 Q42 82 36 84 Z" stroke="#38bdf8" strokeWidth="1.2" fill="none" opacity=".8" />
      <path d="M38 76 L41 79" stroke="#38bdf8" strokeWidth="1.1" opacity=".8" />
      <path className="fxRune" d="M84 96 Q88 90 84 84 M81.5 90 L87 90" stroke="#38bdf8" strokeWidth="1.2" fill="none" opacity=".7" />
      <path d="M32 108 Q30 102 34 100" stroke="#38bdf8" strokeWidth="1" fill="none" opacity=".55" />
      <path d="M88 112 Q91 108 89 104" stroke="#38bdf8" strokeWidth="1" fill="none" opacity=".5" />
      <path d="M50 58 L70 58 L72 96 L60 102 L48 96 Z" fill="#0e7490" />
      <path d="M50 58 L60 58 L60 102 L48 96 Z" fill="#0b5c73" />
      <path d="M59.2 60 L60.8 60 L60.8 98 L59.2 98 Z" fill="#7dd3fc" opacity=".55" />
      <path d="M50 66 L70 66 M49 76 L71 76 M49 86 L71 86" stroke="#164e63" strokeWidth="1.6" />
      <path d="M50 56 L44 92 L38 88 L46 54 Z" fill="#22304d" /><path d="M70 56 L76 92 L82 88 L74 54 Z" fill="#1b2942" />
      <path d="M46 56 L40 90 M74 56 L80 90" stroke="#31456b" strokeWidth="1" opacity=".8" />
      <path d="M78 64 Q88 70 90 84 L92 100 L84 106 L80 100 L82 86 L76 72 Z" fill="#1b2942" />
      <path d="M82 88 L90 91 L88 99 L81 96 Z" fill="#38bdf8" opacity=".5" />
      <path d="M82 88 L88 99" stroke="#7dd3fc" strokeWidth=".9" opacity=".7" />
      <path d="M90 89 L95 85 L92 94 Z" fill="#38bdf8" opacity=".45" />
      <path d="M82 102 Q89 100 91 106 L89 113 Q83 115 80 109 Z" fill="#38bdf8" opacity=".55" />
      <path d="M90 104 L95 102 L92 108 Z M91 110 L95 110 L92 113.5 Z" fill="#7dd3fc" opacity=".7" />
      <path d="M84 90 L86 108" stroke="#bae6fd" strokeWidth=".8" opacity=".5" />
      <path d="M97 100 L97 106 M94 103 L100 103 M95 100.8 L99 105.2 M99 100.8 L95 105.2" stroke="#7dd3fc" strokeWidth=".9" opacity=".8" />
      <path d="M44 62 Q34 68 33 82 L38 94 Q46 90 48 82 Z" fill="#1b2942" />
      <path d="M40 86 Q46 82 50 86 L48 94 Q42 96 38 92 Z" fill="#d8c8b4" /><path d="M50 86 L55 84 L51 90 Z M49 92 L54 93.5 L50 97 Z" fill="#38bdf8" opacity=".5" /><path d="M41 87 Q45 85 49 88" stroke="#7dd3fc" strokeWidth=".7" fill="none" opacity=".6" />
      <path d="M40 56 L80 56 L82 66 Q60 58 38 66 Z" fill="#1e2939" />
      <path d="M44 56 L42 50 M52 55 L51 49 M60 55 L60 49 M68 55 L69 49 M76 56 L78 50" stroke="#2c394d" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M52 52 L51 48 M68 52 L69 48" stroke="#4c5c76" strokeWidth="1.3" strokeLinecap="round" />
      <g transform="translate(0 -8)">
      <path d="M54 36 L66 36 L65 58 L55 58 Z" fill="#d9c4ac" /><path d="M56 52 Q60 54 64 52" stroke="#b39a7e" strokeWidth="1" fill="none" opacity=".7" />
      <path d="M42 26 Q42 10 60 8 Q78 10 78 26 L76 34 Q70 26 60 25 Q50 26 44 34 Z" fill="#1e2939" />
      <path d="M76 20 L84 16 L78 27 Z M44 20 L36 16 L42 27 Z" fill="#1a2333" />
      <path d="M52 11 Q54 9.5 56 10 L52 22 Q50 20 50 16 Z" fill="#e8eef4" />
      <path d="M62 10 L66 12 M70 13 L74 17 M46 15 L44 20" stroke="#2c394d" strokeWidth="1.4" />
      <path d="M48 21 L72 21 L71 25 L49 25 Z" fill="#a5f3fc" opacity=".9" />
      <path d="M52 21 L54 15 L56 21 Z M58.5 21 L60.5 13 L62.5 21 Z M65 21 L67 15 L69 21 Z" fill="#e0f2fe" />
      <path d="M45 30 L75 30 L72 52 L60 60 L48 52 Z" fill="#e6d3bc" /><path d="M56 29.5 L60 34 L64 29.5 Q60 27.5 56 29.5 Z" fill="#1e2939" />
      <path d="M45 30 L60 30 L60 60 L48 52 Z" fill="#cbb49a" />
      <path d="M48 52 L54 57 M72 52 L66 57" stroke="#a58c72" strokeWidth="1" opacity=".7" />
      <path d="M46 28 L49 26.5 L48.5 31 Z M74 28 L71 26.5 L71.5 31 Z" fill="#7dd3fc" opacity=".3" />
      <path d="M47 36 L73 36 L72 39 L48 39 Z" fill="#8a7660" opacity=".8" />
      <path d="M47.5 41.5 L56 43 L55.2 46.6 L48.2 45 Z" fill="#0a1220" />
      <path d="M72.5 41.5 L64 43 L64.8 46.6 L71.8 45 Z" fill="#0a1220" />
      <circle className="fxHalo" cx="51.5" cy="43.8" r="5.5" fill="#7dd3fc" opacity=".28" /><circle className="fxHaloB" cx="68.5" cy="43.8" r="5.5" fill="#7dd3fc" opacity=".28" />
      <path d="M48.3 42.6 L55.2 43.7 L54.6 45.9 L49 44.9 Z" fill="#38bdf8" />
      <path d="M71.7 42.6 L64.8 43.7 L65.4 45.9 L71 44.9 Z" fill="#38bdf8" />
      <path d="M50.3 43.2 L54 43.8 L53.7 45.1 L50.9 44.6 Z" fill="#bae6fd" />
      <path d="M69.7 43.2 L66 43.8 L66.3 45.1 L69.1 44.6 Z" fill="#bae6fd" />
      <path d="M52.3 42.4 L53.2 43.3 L52.3 44.2 L51.4 43.3 Z" fill="#ffffff" />
      <path d="M67.7 42.4 L68.6 43.3 L67.7 44.2 L66.8 43.3 Z" fill="#ffffff" />
      <path d="M46.5 39 L58 41.8 M73.5 39 L62 41.8" stroke="#241c12" strokeWidth="2.3" strokeLinecap="round" />
      <path d="M58.7 47 L61.3 47 L60.7 52.5 L59.3 52.5 Z" fill="#cbb49a" /><circle cx="58.6" cy="52.2" r=".45" fill="#a58c72" /><circle cx="61.4" cy="52.2" r=".45" fill="#a58c72" />
      <path d="M55.5 56.2 Q60 57.4 64.5 56.2" stroke="#6b5a45" strokeWidth="1.3" fill="none" /><path d="M55.5 56.2 L54.3 57.2 M64.5 56.2 L65.7 57.2" stroke="#6b5a45" strokeWidth="1" />
      </g>
      <circle cx="30" cy="72" r="1.2" fill="#bae6fd" opacity=".7" /><circle cx="90" cy="46" r="1" fill="#e0f2fe" opacity=".8" />
    </svg>
  );
}
function PortraitC({ size = 120 }) {
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 120 138">
      <defs><radialGradient id="bgC" cx="50%" cy="35%"><stop offset="0%" stopColor="#3b1004" /><stop offset="100%" stopColor="#140502" /></radialGradient></defs>
      <rect width="120" height="138" rx="10" fill="url(#bgC)" />
      <path className="fxFlameLo" d="M14 84 L8 58 L22 64 L18 30 L34 42 L36 10 L50 28 L58 0 L68 26 L82 6 L86 34 L102 20 L98 50 L114 44 L102 70 L110 86 L94 80 L88 94 L76 84 L62 92 L54 80 L40 90 L32 74 L20 86 Z" fill="#f97316" />
      <path className="fxFlameHi" d="M30 66 L28 42 L42 52 L46 24 L56 44 L66 26 L72 50 L86 38 L80 62 L68 56 L60 68 L50 58 L40 68 Z" fill="#fdba74" />
      <path d="M48 40 L56 16 L60 36 L68 22 L70 42 Z" fill="#fde047" opacity=".9" />
      <path d="M0 122 L30 108 L38 124 L26 138 L0 138 Z" fill="#7c3509" />
      <path d="M120 122 L90 108 L82 124 L94 138 L120 138 Z" fill="#92400e" />
      <path d="M10 84 L2 106 L14 96 L8 116 L18 104 Z" fill="#c2410c" />
      <path d="M110 84 L118 106 L106 96 L112 116 L102 104 Z" fill="#9a3412" />
      <path d="M6 100 Q10 108 6 116 M114 100 Q110 108 114 116" stroke="#57534e" strokeWidth="1.1" fill="none" opacity=".6" />
      <g fill="none" stroke="#57534e" strokeWidth="2.8">
        <ellipse cx="18" cy="120" rx="4" ry="5.5" transform="rotate(35 18 120)" /><ellipse cx="27" cy="126" rx="4" ry="5.5" transform="rotate(35 27 126)" /><ellipse cx="36" cy="132" rx="4" ry="5.5" transform="rotate(35 36 132)" />
      </g>
      <path d="M92 118 L96 126 L93 133" stroke="#fb923c" strokeWidth="1.6" fill="none" opacity=".9" />
      <path d="M48 92 L72 92 L74 116 L46 116 Z" fill="#92400e" /><path d="M48 92 L58 92 L58 116 L46 116 Z" fill="#7c3509" />
      <path d="M44 112 L76 112 L74 120 L46 120 Z" fill="#eab308" /><path d="M50 112 L52 120 M58 112 L60 120 M66 112 L68 120" stroke="#a16207" strokeWidth="1.2" />
      <circle cx="60" cy="123" r="2.6" fill="#7f1d1d" /><path d="M58 123 L62 123" stroke="#eab308" strokeWidth="1" />
      <path d="M32 62 L36 36 L50 26 L70 26 L84 36 L88 62 L80 84 L60 94 L40 84 Z" fill="#92400e" />
      <path d="M32 62 L36 36 L50 26 L60 26 L60 94 L40 84 Z" fill="#7c3509" />
      <path d="M76 80 L84 70 L86 60 L80 80 Z" fill="#5c2807" opacity=".7" />
      <path d="M52 30 L60 26 L68 30 M55 34 L60 30 L65 34" stroke="#7f1d1d" strokeWidth="1.4" fill="none" />
      <circle className="fxHalo" cx="48" cy="52" r="6.5" fill="#fb923c" opacity=".28" /><circle className="fxHaloB" cx="72" cy="52" r="6.5" fill="#fb923c" opacity=".28" />
      <path d="M41 51 L54 49.5 L53 55 L42 55 Z" fill="#1c0a02" /><path d="M79 51 L66 49.5 L67 55 L78 55 Z" fill="#1c0a02" />
      <circle cx="47.5" cy="52" r="2.4" fill="#fef3c7" /><circle cx="72.5" cy="52" r="2.4" fill="#fef3c7" />
      <path d="M39 48 L54 45.5 M81 48 L66 45.5" stroke="#2b1002" strokeWidth="2.2" />
      <path d="M34 60 L86 60 L80 84 L60 92 L40 84 Z" fill="#1c1917" />
      <path d="M34 60 L86 60" stroke="#eab308" strokeWidth="1.8" />
      <path d="M42 68 L78 68 M46 76 L74 76" stroke="#3f3a34" strokeWidth="1.1" opacity=".8" />
      <path d="M60 62 L60 90" stroke="#0c0a09" strokeWidth="1.1" opacity=".6" />
      <path d="M86 58 L91 63 L88 70 Z" fill="#eab308" /><circle cx="89" cy="72" r="1.7" fill="#eab308" />
      <circle cx="18" cy="96" r="1.5" fill="#fb923c" opacity=".85" /><circle cx="102" cy="92" r="1.3" fill="#fde047" opacity=".8" />
    </svg>
  );
}
function PortraitK({ size = 120 }) {
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 120 138">
      <defs><radialGradient id="bgK" cx="50%" cy="35%"><stop offset="0%" stopColor="#1d1436" /><stop offset="100%" stopColor="#0a0714" /></radialGradient></defs>
      <rect width="120" height="138" rx="10" fill="url(#bgK)" />
      <path d="M10 20 L16 30 L12 34 L20 46 M108 16 L102 28 L107 32 L100 44" stroke="#a78bfa" strokeWidth="1" fill="none" opacity=".35" />
      <path d="M36 40 L44 8 L76 8 L84 40 L74 48 L46 48 Z" fill="#44403c" />
      <path d="M36 40 L44 8 L60 8 L60 48 L46 48 Z" fill="#3f3a34" />
      <path d="M48 12 L46 30 M56 10 L55 26 M64 10 L65 26 M72 12 L74 30" stroke="#1c1917" strokeWidth="1.8" />
      <path d="M50 16 L52 22 M68 16 L66 22" stroke="#a78bfa" strokeWidth="1" opacity=".6" />
      <path d="M0 30 L36 24 L46 48 L40 80 L8 84 L0 64 Z" fill="#78716c" />
      <path d="M0 30 L36 24 L38 32 L6 38 Z" fill="#a8a29e" />
      <path d="M8 26 L2 12 L16 22 Z M22 24 L20 8 L32 22 Z" fill="#57534e" />
      <path d="M6 44 L14 42 L12 50 L20 48 L18 56 M30 34 L38 40" stroke="#a78bfa" strokeWidth="1.2" fill="none" opacity=".85" />
      <path d="M30 56 L24 62 L29 65 L23 72" stroke="#ede9fe" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M30 56 L24 62 L29 65 L23 72" stroke="#a78bfa" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <path d="M0 30 L36 24 L46 48" fill="none" stroke="#c7c2ba" strokeWidth="1.1" opacity=".8" />
      <path d="M120 30 L84 24 L74 48 L80 80 L112 84 L120 64 Z" fill="#57534e" />
      <path d="M6 82 L34 80 L34 102 L8 104 Z" fill="#57534e" />
      <path d="M6 82 L20 81 L20 103 L8 104 Z" fill="#44403c" />
      <path d="M8 88 L33 87 M8 96 L33 95" stroke="#1c1917" strokeWidth="1.8" />
      <path d="M10 92 L30 91" stroke="#a78bfa" strokeWidth="1" opacity=".7" />
      <path d="M114 82 L86 80 L86 102 L112 104 Z" fill="#44403c" />
      <path d="M112 88 L87 87 M112 96 L87 95" stroke="#1c1917" strokeWidth="1.8" />
      <path d="M110 92 L90 91" stroke="#a78bfa" strokeWidth="1" opacity=".7" />
      <path d="M38 80 L48 74 L50 86 L40 88 Z" fill="#78716c" />
      <path d="M82 80 L72 74 L70 86 L80 88 Z" fill="#57534e" />
      <path d="M112 26 L118 12 L104 22 Z M98 24 L100 8 L88 22 Z" fill="#44403c" />
      <path d="M114 44 L106 42 L108 50 L100 48 L102 56 M90 34 L82 40" stroke="#a78bfa" strokeWidth="1.2" fill="none" opacity=".85" />
      <path d="M120 30 L84 24 L74 48" fill="none" stroke="#8f8a80" strokeWidth="1.1" opacity=".7" />
      <path d="M44 46 L60 38 L76 46 L78 76 L60 88 L42 76 Z" fill="#a8a29e" />
      <path d="M44 46 L60 38 L60 88 L42 76 Z" fill="#78716c" />
      <path d="M52 38 L56 28 L60 36 L64 28 L68 38 Z" fill="#57534e" />
      <path d="M56 30 L58 36 M64 30 L62 36" stroke="#a78bfa" strokeWidth="1" opacity=".8" />
      <path d="M46 56 L74 56 L72 68 L48 68 Z" fill="#14101f" />
      <path className="fxVisor" d="M49 59 L71 59 L70 65 L50 65 Z" fill="#a78bfa" />
      <path d="M51 60.5 L58 60.5 L58 63.5 L51.5 63.5 Z M62 60.5 L69 60.5 L68.5 63.5 L62 63.5 Z" fill="#ede9fe" />
      <circle cx="54.5" cy="62" r=".8" fill="#ffffff" /><circle cx="65.5" cy="62" r=".8" fill="#ffffff" />
      <path className="fxBoltA" d="M45 57 L39 62 L43.5 62 L38 68" stroke="#c4b5fd" strokeWidth="1.8" fill="none" />
      <path className="fxBoltB" d="M75 57 L81 61.5 L76.5 62 L82 67.5" stroke="#c4b5fd" strokeWidth="1.8" fill="none" />
      <path d="M46 56 L43 53 M74 56 L77 53" stroke="#a78bfa" strokeWidth="1.2" opacity=".7" />
      <path d="M48 74 L48 80 M72 74 L72 80" stroke="#44403c" strokeWidth="1.6" />
      <path d="M36 86 L84 86 L88 118 L32 118 Z" fill="#78716c" />
      <path d="M36 86 L60 86 L60 118 L32 118 Z" fill="#57534e" />
      <path d="M38 92 L54 94 L52 100 M82 92 L66 94 L68 100 M40 108 L50 110 M80 108 L70 110" stroke="#a78bfa" strokeWidth="1.1" fill="none" opacity=".8" />
      <path d="M37 87 L83 87" stroke="#c7c2ba" strokeWidth="1.2" />
      <circle cx="60" cy="104" r="12" fill="#14101f" />
      <circle cx="60" cy="104" r="8.5" fill="#a78bfa" opacity=".95" /><path d="M60 89 L60 119" stroke="#0c0a09" strokeWidth="3.4" /><path d="M60 89 L60 119" stroke="#ede9fe" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="60" cy="104" r="3.6" fill="#ede9fe" /><circle cx="60" cy="104" r="1.4" fill="#ffffff" />
      <circle cx="60" cy="104" r="16" fill="#a78bfa" opacity=".12" />
      <path d="M60 90 L60 94 M60 114 L60 118 M48 104 L52 104 M68 104 L72 104 M51 96 L54 99 M69 96 L66 99" stroke="#a78bfa" strokeWidth="1.6" opacity=".85" />
      <path d="M42 112 L47 118 M78 112 L73 118" stroke="#a78bfa" strokeWidth="1" opacity=".7" />
      <path d="M40 118 L80 118 L76 138 L44 138 Z" fill="#57534e" />
      <path d="M40 118 L60 118 L58 138 L44 138 Z" fill="#44403c" />
      <path d="M46 124 L74 124 M48 131 L72 131" stroke="#1c1917" strokeWidth="1.8" />
      <path d="M52 127 L68 127" stroke="#a78bfa" strokeWidth="1" opacity=".75" />
      <path d="M2 138 L2 112 Q4 100 16 98 L30 102 Q34 110 32 122 L28 138 Z" fill="#78716c" />
      <path d="M2 138 L2 112 Q4 100 16 98 L16 138 Z" fill="#57534e" />
      <path d="M4 110 L31 112 M3 119 L31 121 M4 128 L29 130" stroke="#1c1917" strokeWidth="2" />
      <path d="M10 104 L10 136 M18 104 L18 137 M25 106 L25 137" stroke="#44403c" strokeWidth="1.3" />
      <path d="M5 115 L30 117" stroke="#a78bfa" strokeWidth="1" opacity=".75" />
      <path d="M118 138 L118 112 Q116 100 104 98 L90 102 Q86 110 88 122 L92 138 Z" fill="#57534e" />
      <path d="M118 138 L118 112 Q116 100 104 98 L104 138 Z" fill="#44403c" />
      <path d="M116 110 L89 112 M117 119 L89 121 M116 128 L91 130" stroke="#1c1917" strokeWidth="2" />
      <path d="M110 104 L110 136 M102 104 L102 137 M95 106 L95 137" stroke="#3f3a34" strokeWidth="1.3" />
      <path d="M115 115 L90 117" stroke="#a78bfa" strokeWidth="1" opacity=".75" />
    </svg>
  );
}
function PortraitZ({ size = 120 }) {
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 120 138">
      <defs><radialGradient id="bgZ" cx="50%" cy="35%"><stop offset="0%" stopColor="#241035" /><stop offset="100%" stopColor="#0c0517" /></radialGradient></defs>
      <rect width="120" height="138" rx="10" fill="url(#bgZ)" />
      <path d="M84 14 L112 14 L112 124 L84 124 Z" fill="#0c0517" />
      <path d="M84 14 L112 14 L112 124 L84 124 Z" fill="none" stroke="#ef4444" strokeWidth="2" opacity=".85" />
      <path d="M90 26 Q96 44 91 64 M104 34 Q99 56 105 78 M96 88 Q100 102 95 116" stroke="#ef4444" strokeWidth="1" fill="none" opacity=".45" />
      <circle cx="99" cy="20" r="1.3" fill="#f87171" opacity=".8" />
      <path d="M16 138 L20 104 Q28 92 44 90 L76 90 Q92 94 96 108 L98 138 L88 138 L84 126 L76 138 L66 124 L58 138 L48 126 L40 138 L30 124 L24 138 Z" fill="#2a1247" />
      <path d="M16 138 L20 104 Q28 92 44 90 L52 90 Q38 100 34 120 L30 138 Z" fill="#1b0b30" />
      <circle className="fxSigil" cx="58" cy="122" r="9" fill="none" stroke="#ef4444" strokeWidth="1.8" opacity=".85" />
      <path d="M58 115 L58 129 M52 118.5 L64 125.5 M64 118.5 L52 125.5" stroke="#ef4444" strokeWidth="1.2" opacity=".8" />
      <path d="M28 40 Q14 22 18 6 Q32 16 36 30 Z" fill="#1b0b30" /><path d="M28 40 Q19 26 21 12" stroke="#3b1d63" strokeWidth="1.4" fill="none" />
      <path d="M84 40 Q98 22 94 6 Q80 16 76 30 Z" fill="#2a1247" /><path d="M84 40 Q93 26 91 12" stroke="#3b1d63" strokeWidth="1.4" fill="none" />
      <path d="M56 8 Q30 14 30 48 Q30 74 56 82 Q82 74 82 48 Q82 14 56 8 Z" fill="#3b1d63" />
      <path d="M56 8 Q30 14 30 48 Q30 70 46 79 Q36 50 56 24 Z" fill="#2a1247" />
      <ellipse cx="56" cy="48" rx="17" ry="21" fill="#0b0413" />
      <circle cx="48.5" cy="45" r="7" fill="#ef4444" opacity=".2" /><circle cx="63.5" cy="45" r="7" fill="#ef4444" opacity=".2" />
      <path className="fxFlameLo" d="M44 47 Q42 41 45.5 37 L48 41 L50 36 Q53 40 52 46 Q48 50 44 47 Z" fill="#dc2626" />
      <path className="fxFlameHi" d="M46.5 45 Q45.5 41 48 38.5 Q50.5 41 49.5 45 Q48 47 46.5 45 Z" fill="#fecaca" />
      <path className="fxFlameLo" d="M59 47 Q57 41 60.5 37 L63 41 L65 36 Q68 40 67 46 Q63 50 59 47 Z" fill="#ef4444" />
      <path className="fxFlameHi" d="M61.5 45 Q60.5 41 63 38.5 Q65.5 41 64.5 45 Q63 47 61.5 45 Z" fill="#fecaca" />
      <path d="M43 44 L53 42 L51 48.5 Z" fill="#ef4444" /><path d="M69 44 L59 42 L61 48.5 Z" fill="#ef4444" />
      <path d="M52 60 Q56 63 60 60 M56 57 L56 63" stroke="#7f1d1d" strokeWidth="1.1" fill="none" opacity=".9" />
      <path d="M12 100 Q8 96 10 88 L26 84 Q30 90 28 98 Q22 104 12 100 Z" fill="#8b7a9e" />
      <path d="M11 88 L6 70 L11 72 L12 87 Z" fill="#8b7a9e" />
      <path d="M15 86 L12 64 L17 67 L18 85 Z" fill="#9d8fb0" />
      <path d="M20 85 L19 60 L24 64 L23 84 Z" fill="#8b7a9e" />
      <path d="M25 85 L27 64 L31 68 L28 86 Z" fill="#9d8fb0" />
      <path d="M27 92 L36 82 L37 88 L30 96 Z" fill="#8b7a9e" />
      <path d="M8 72 L10 75 M14 68 L15.5 72 M21 65 L21.5 69 M28 69 L27.5 73" stroke="#5f5470" strokeWidth=".9" />
      <path d="M6 68 L7 63 M12 62 L13 58 M19 58 L20 53 M27 62 L29 58" stroke="#c4b5fd" strokeWidth="1.2" strokeLinecap="round" opacity=".7" />
      <path d="M14 54 Q18 46 15 40 Q11 46 13 52 Z" fill="#ef4444" opacity=".75" />
      <path d="M13 102 Q10 108 12 114" stroke="#57534e" strokeWidth="2" fill="none" />
      <circle cx="12" cy="117" r="2.4" fill="none" stroke="#78716c" strokeWidth="1.3" />
    </svg>
  );
}
function PortraitL({ size = 120 }) {
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 120 138">
      <defs><radialGradient id="bgL" cx="50%" cy="35%"><stop offset="0%" stopColor="#2b2005" /><stop offset="100%" stopColor="#0f0a02" /></radialGradient></defs>
      <rect width="120" height="138" rx="10" fill="url(#bgL)" />
      <g opacity=".85">
        <path d="M60 40 L67 10 L72 34 L94 18 L80 40 L110 38 L84 50 L106 66 L80 58 L88 84 L68 62 L60 92 L52 62 L32 84 L40 58 L14 66 L36 50 L10 38 L40 40 L26 18 L48 34 L53 10 Z" fill="#fde047" opacity=".2" />
        <circle cx="60" cy="44" r="30" fill="#fde047" opacity=".15" />
      </g>
      <path d="M0 108 L26 96 L34 112 L20 128 L0 124 Z" fill="#78716c" />
      <path d="M0 108 L26 96 L28 102 L6 112 Z" fill="#d6d3d1" />
      <path d="M4 106 L24 99" stroke="#eab308" strokeWidth="1.4" />
      <path d="M120 108 L94 96 L86 112 L100 128 L120 124 Z" fill="#57534e" />
      <path d="M96 100 L114 108" stroke="#a16207" strokeWidth="1.4" />
      <path d="M0 104 L16 116 L12 138 L0 138 Z" fill="#b8ad96" />
      <path d="M4 112 L8 138 M10 118 L13 132" stroke="#8f8574" strokeWidth="1.2" />
      <path d="M120 104 L104 116 L108 138 L120 138 Z" fill="#d6cdba" />
      <path d="M116 112 L112 138 M110 118 L107 132" stroke="#a89f8c" strokeWidth="1.2" />
      <path d="M36 96 L84 96 L88 126 L32 126 Z" fill="#78716c" />
      <path d="M36 96 L60 96 L60 126 L32 126 Z" fill="#57534e" />
      <path d="M35 104 L85 104 M34 112 L86 112 M33 120 L87 120" stroke="#44403c" strokeWidth="1.4" />
      <path d="M38 99 L40 103 M46 99 L48 103 M54 99 L56 103 M62 99 L64 103 M70 99 L72 103 M78 99 L80 103" stroke="#8f8a80" strokeWidth="1" />
      <path d="M46 126 L74 126 L74 138 L46 138 Z" fill="#1e3a8a" />
      <circle cx="60" cy="136" r="6" fill="#eab308" /><path d="M60 127 L60 129.5 M51 136 L54 136 M66 136 L69 136" stroke="#eab308" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M34 46 L10 20 L20 24 L12 8 L26 20 L20 4 L34 22 Z" fill="#d6d3d1" />
      <path d="M34 46 L14 22 L24 26 L18 12 L30 24 Z" fill="#a8a29e" />
      <path d="M30 40 L16 24 M28 32 L20 16" stroke="#78716c" strokeWidth="1.2" />
      <path d="M86 46 L110 20 L100 24 L108 8 L94 20 L100 4 L86 22 Z" fill="#a8a29e" />
      <path d="M86 46 L106 22 L96 26 L102 12 L90 24 Z" fill="#78716c" />
      <path d="M90 40 L104 24 M92 32 L100 16" stroke="#57534e" strokeWidth="1.2" />
      <path d="M60 4 L84 22 L86 46 L86 68 Q86 88 60 92 Q34 88 34 68 L34 46 L36 22 Z" fill="#a8a29e" />
      <path d="M60 4 L36 22 L34 46 L34 68 Q34 88 60 92 Z" fill="#78716c" />
      <path d="M60 4 L84 22 M60 4 L36 22 M34 46 L86 46" stroke="#d6d3d1" strokeWidth="1.2" />
      <path d="M60 4 L84 22 L86 46 L86 68 Q86 88 60 92 Q34 88 34 68 L34 46 L36 22 Z" fill="none" stroke="#eab308" strokeWidth="1.3" opacity=".8" />
      <path d="M57 8 L63 8 L64 46 L56 46 Z" fill="#eab308" />
      <path d="M60 8 L63 8 L64 46 L60 46 Z" fill="#a16207" />
      <path d="M55 10 L53 1 L58 6 L60 0 L62 6 L67 1 L65 10 Z" fill="#fde047" />
      <path d="M38 50 L57 54 L58 61 L39 58 Z" fill="#120d01" />
      <path d="M82 50 L63 54 L62 61 L81 58 Z" fill="#120d01" />
      <circle className="fxHalo" cx="47" cy="56" r="7" fill="#fde047" opacity=".3" /><circle className="fxHalo" cx="73" cy="56" r="7" fill="#fde047" opacity=".3" />
      <path d="M41.5 54.5 L53 55.8 L54.5 59 L43 57.6 Z" fill="#fde047" />
      <path d="M78.5 54.5 L67 55.8 L65.5 59 L77 57.6 Z" fill="#fde047" />
      <path d="M45 55.4 L51.5 56.2 L52.3 58.2 L46 57.4 Z" fill="#fef3c7" />
      <path d="M75 55.4 L68.5 56.2 L67.7 58.2 L74 57.4 Z" fill="#fef3c7" />
      <circle cx="44" cy="55.5" r="1" fill="#ffffff" /><circle cx="76" cy="55.5" r="1" fill="#ffffff" />
      <path d="M40 49 L36.5 45.5 M44 48.5 L42.5 44.5 M80 49 L83.5 45.5 M76 48.5 L77.5 44.5" stroke="#fde047" strokeWidth="1" opacity=".8" strokeLinecap="round" />
      <path d="M36 57 L84 57" stroke="#fde047" strokeWidth=".6" opacity=".28" />
      <circle cx="45" cy="44" r=".8" fill="#fde047" opacity=".7" /><circle cx="75" cy="44" r=".8" fill="#fde047" opacity=".7" />
      <circle cx="42" cy="44" r="1.2" fill="#57534e" /><circle cx="78" cy="44" r="1.2" fill="#57534e" /><circle cx="42" cy="66" r="1.2" fill="#57534e" /><circle cx="78" cy="66" r="1.2" fill="#57534e" />
      <path d="M44 68 L44 74 M76 68 L76 74" stroke="#57534e" strokeWidth="1.6" />
      <path d="M74 16 L79 28" stroke="#57534e" strokeWidth="1.2" />
      <path d="M46 80 L52 84" stroke="#7f1d1d" strokeWidth="1.6" opacity=".8" />
    </svg>
  );
}
function PortraitO({ size = 120 }) {
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 120 138">
      <defs><radialGradient id="bgO" cx="50%" cy="35%"><stop offset="0%" stopColor="#1b2608" /><stop offset="100%" stopColor="#070a03" /></radialGradient></defs>
      <rect width="120" height="138" rx="10" fill="url(#bgO)" />
      <path d="M26 40 L10 6 L34 28 Z" fill="#292524" />
      <path d="M40 30 L32 0 L52 24 Z" fill="#1c1917" />
      <path d="M56 26 L58 0 L68 24 Z" fill="#292524" />
      <path d="M72 28 L86 2 L84 30 Z" fill="#1c1917" />
      <path d="M88 38 L110 10 L96 36 Z" fill="#292524" />
      <path d="M28 34 L16 12 M44 26 L36 6 M60 24 L60 4 M76 26 L84 8 M92 34 L104 14" stroke="#6b6459" strokeWidth="1.2" opacity=".85" />
      <path d="M96 30 Q100 22 97 14 Q93 21 95 28 Z" fill="#a3e635" opacity=".45" />
      <path d="M6 138 L10 104 Q24 82 60 76 Q96 82 110 104 L114 138 Z" fill="#292524" />
      <path d="M6 138 L10 104 Q24 82 60 76 L60 88 Q30 90 18 110 L14 138 Z" fill="#1c1917" />
      <path d="M16 108 L20 94 M28 100 L32 84 M42 92 L45 78 M60 88 L60 74 M78 92 L75 78 M92 100 L88 84 M104 108 L100 94" stroke="#3f3a34" strokeWidth="3" strokeLinecap="round" />
      <path d="M18 104 L22 92 M44 90 L47 80 M76 90 L73 80 M102 104 L98 92" stroke="#6b6459" strokeWidth="1.3" strokeLinecap="round" opacity=".85" />
      <path d="M36 126 Q60 118 84 126 L83 134 Q60 126 37 134 Z" fill="#d6cdba" />
      <path d="M92 112 L92 122" stroke="#8a5a1d" strokeWidth="1.2" />
      <path d="M89 125 Q87 122 90 119 Q94 120 93 124 Q92 127 89 125 Z" fill="#b45309" />
      <path d="M88 121 L92 122 M89 126 L92 125" stroke="#2a1607" strokeWidth=".8" />
      <path d="M32 44 Q30 12 60 8 Q90 12 88 44 Q88 72 60 80 Q32 72 32 44 Z" fill="#e7e5e4" />
      <path d="M32 44 Q30 12 60 8 L60 80 Q32 72 32 44 Z" fill="#cfc9bd" />
      <path d="M42 20 L38 30 M78 20 L82 30 M36 46 Q40 54 46 58" stroke="#a8a29e" strokeWidth="1.2" fill="none" />
      <path d="M40 32 Q47 26 53 32 Q52 44 45 44 Q39 41 40 32 Z" fill="#0a0d05" />
      <path d="M80 32 Q73 26 67 32 Q68 44 75 44 Q81 41 80 32 Z" fill="#0a0d05" />
      <circle className="fxHalo" cx="46" cy="36" r="6" fill="#a3e635" opacity=".3" /><circle className="fxHaloB" cx="74" cy="36" r="6" fill="#a3e635" opacity=".3" />
      <circle cx="46" cy="36" r="2.2" fill="#a3e635" /><circle cx="74" cy="36" r="2.2" fill="#a3e635" />
      <path d="M56 48 L60 56 L64 48" fill="none" stroke="#8a8072" strokeWidth="1.4" />
      <path d="M46 64 L74 64 M49 60 L49 70 M55 60 L55 72 M60 61 L60 73 M65 60 L65 72 M71 60 L71 70" stroke="#0a0d05" strokeWidth="1.6" />
      <path d="M53 10 Q60 4 67 10 Q66 17 60 17 Q54 17 53 10 Z" fill="#d6cdba" /><circle cx="57" cy="10.5" r="1.1" fill="#0a0d05" /><circle cx="63" cy="10.5" r="1.1" fill="#0a0d05" />
      <path d="M57.5 14 L62.5 14" stroke="#0a0d05" strokeWidth=".9" />
    </svg>
  );
}
function PortraitD({ size = 120 }) {
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 120 138">
      <defs><radialGradient id="bgD" cx="50%" cy="35%"><stop offset="0%" stopColor="#2b1c08" /><stop offset="100%" stopColor="#0e0803" /></radialGradient></defs>
      <rect width="120" height="138" rx="10" fill="url(#bgD)" />
      <path d="M8 16 L22 10 L26 22 L14 28 Z" fill="#3f3a34" /><path d="M8 16 L22 10 L23 15 L11 21 Z" fill="#57534e" />
      <path d="M96 8 L110 14 L106 26 L94 20 Z" fill="#44403c" /><path d="M96 8 L110 14 L108 18 L97 13 Z" fill="#6b6459" />
      <circle cx="16" cy="30" r=".8" fill="#78716c" /><circle cx="103" cy="28" r=".8" fill="#78716c" />
      <path d="M10 18 Q11 22 10 26 M100 12 Q101 16 100 20" stroke="#f59e0b" strokeWidth=".8" opacity=".5" />
      <path d="M0 66 L28 74 L30 94 L8 102 L0 96 Z" fill="#78716c" />
      <path d="M0 66 L28 74 L27 80 L2 73 Z" fill="#a8a29e" />
      <path d="M4 84 L26 88" stroke="#57534e" strokeWidth="1.8" />
      <path d="M120 66 L92 74 L90 94 L112 102 L120 96 Z" fill="#57534e" />
      <path d="M94 84 L116 88" stroke="#44403c" strokeWidth="1.8" />
      <path d="M28 68 L36 58 L38 96 L30 96 Z" fill="#6f675c" />
      <path d="M31 66 L33 92" stroke="#57514a" strokeWidth="1.2" />
      <path d="M92 68 L84 58 L82 96 L90 96 Z" fill="#57514a" />
      <path d="M89 66 L87 92" stroke="#44403c" strokeWidth="1.2" />
      <path d="M40 110 L80 110 L84 138 L36 138 Z" fill="#6b4f2c" />
      <path d="M40 110 L58 110 L56 138 L36 138 Z" fill="#4a3617" />
      <path d="M44 118 L76 118 M46 128 L74 128" stroke="#4a3617" strokeWidth="2.2" />
      <path d="M59 112 L62 120 L58 128 L62 136" stroke="#f59e0b" strokeWidth="1.4" fill="none" opacity=".9" />
      <path d="M40 104 Q60 112 80 104" stroke="#3d2a12" strokeWidth="2" fill="none" />
      <circle cx="48" cy="107" r="3" fill="#8a8072" /><circle cx="57" cy="109" r="3.4" fill="#6b6459" /><circle cx="66" cy="109" r="3.4" fill="#8a8072" /><circle cx="73" cy="107" r="3" fill="#6b6459" />
      <path d="M6 138 L8 118 Q10 108 20 106 L32 108 Q36 114 34 124 L30 138 Z" fill="#a67c4a" />
      <path d="M6 138 L8 118 Q10 108 20 106 L20 138 Z" fill="#8a6039" />
      <path d="M8 116 L6 98 Q6 94 10 94 Q13 95 13 99 L14 114 Z" fill="#a67c4a" />
      <path d="M14 112 L13 92 Q13 88 17 88 Q20 89 20 93 L21 111 Z" fill="#b98d59" />
      <path d="M21 111 L21 92 Q21 88 25 88 Q28 89 28 93 L28 111 Z" fill="#a67c4a" />
      <path d="M28 112 L29 96 Q29 92 33 93 Q35 94 35 98 L34 114 Z" fill="#96703f" />
      <path d="M32 122 L42 114 Q45 112 46 116 Q46 119 43 121 L34 128 Z" fill="#b98d59" />
      <path d="M6 98 Q8 93 13 96 Z M13 92 Q15 87 20 90 Z M21 92 Q23 87 28 90 Z M29 96 Q31 91 35 95 Z M43 114 Q47 112 46 117 Z" fill="#78716c" />
      <path d="M10 106 L12 112 M18 100 L17 108 M24 98 L25 106 M31 104 L30 110" stroke="#6b4a24" strokeWidth="1" />
      <path d="M9 112 L14 113 M15 108 L21 109 M22 108 L28 109 M29 110 L34 111" stroke="#f59e0b" strokeWidth="1.2" opacity=".85" />
      <circle cx="20" cy="111" r="8" fill="#f59e0b" opacity=".1" />
      <path d="M12 82 L18 80 L19 86 L13 87 Z" fill="#57534e" /><circle cx="24" cy="80" r=".7" fill="#78716c" />
      <path d="M114 138 L112 118 Q110 108 100 106 L88 108 Q84 114 86 124 L90 138 Z" fill="#96703f" />
      <path d="M114 138 L112 118 Q110 108 100 106 L100 138 Z" fill="#7a5c33" />
      <path d="M112 116 L114 98 Q114 94 110 94 Q107 95 107 99 L106 114 Z" fill="#a67c4a" />
      <path d="M106 112 L107 92 Q107 88 103 88 Q100 89 100 93 L99 111 Z" fill="#b98d59" />
      <path d="M99 111 L99 92 Q99 88 95 88 Q92 89 92 93 L92 111 Z" fill="#a67c4a" />
      <path d="M92 112 L91 96 Q91 92 87 93 Q85 94 85 98 L86 114 Z" fill="#96703f" />
      <path d="M88 122 L78 114 Q75 112 74 116 Q74 119 77 121 L86 128 Z" fill="#b98d59" />
      <path d="M114 98 Q112 93 107 96 Z M107 92 Q105 87 100 90 Z M99 92 Q97 87 92 90 Z M91 96 Q89 91 85 95 Z M77 114 Q73 112 74 117 Z" fill="#78716c" />
      <path d="M110 106 L108 112 M102 100 L103 108 M96 98 L95 106 M89 104 L90 110" stroke="#6b4a24" strokeWidth="1" />
      <path d="M111 112 L106 113 M105 108 L99 109 M98 108 L92 109 M91 110 L86 111" stroke="#f59e0b" strokeWidth="1.2" opacity=".85" />
      <circle cx="100" cy="111" r="8" fill="#f59e0b" opacity=".1" />
      <path d="M108 82 L102 80 L101 86 L107 87 Z" fill="#57534e" /><circle cx="96" cy="80" r=".7" fill="#78716c" />
      <path d="M46 90 L74 90 L78 114 L42 114 Z" fill="#8a8072" />
      <path d="M46 90 L60 90 L60 114 L42 114 Z" fill="#6f675c" />
      <path d="M45 96 L75 96 M44 103 L76 103 M43 110 L77 110" stroke="#57514a" strokeWidth="1.4" />
      <path d="M34 74 Q30 26 60 20 Q90 26 86 74 Q82 92 60 96 Q38 92 34 74 Z" fill="#a67c4a" />
      <path d="M34 74 Q30 26 60 20 L60 96 Q38 92 34 74 Z" fill="#8a6039" />
      <path d="M46 26 Q52 22 58 26 M64 24 L70 28 M40 40 L44 46 M78 38 L74 44" stroke="#7a5c33" strokeWidth="1.2" fill="none" />
      <path d="M56 32 L60 28 L64 32 L60 36 Z" fill="none" stroke="#f59e0b" strokeWidth="1.1" opacity=".85" />
      <path d="M38 46 L82 46 L80 54 L40 54 Z" fill="#3d2a12" />
      <path d="M42 55 L78 55" stroke="#a67c4a" strokeWidth="1.6" />
      <circle className="fxHalo" cx="49" cy="51" r="6" fill="#f59e0b" opacity=".28" /><circle className="fxHaloB" cx="71" cy="51" r="6" fill="#f59e0b" opacity=".28" />
      <path d="M44 50 L54 49 L53 55 L45 55 Z" fill="#241505" /><path d="M76 50 L66 49 L67 55 L75 55 Z" fill="#241505" />
      <path d="M46 51 L52 50.4 L51.6 53.6 L46.6 54 Z" fill="#f59e0b" /><path d="M74 51 L68 50.4 L68.4 53.6 L73.4 54 Z" fill="#f59e0b" />
      <circle cx="48.5" cy="51.6" r=".7" fill="#fef3c7" /><circle cx="71.5" cy="51.6" r=".7" fill="#fef3c7" />
      <path d="M42 47 L55 45 M78 47 L65 45" stroke="#241505" strokeWidth="2" />
      <path d="M36 60 L84 60 L82 84 Q70 94 60 94 Q50 94 38 84 Z" fill="#8a8072" />
      <path d="M36 60 L60 60 L60 94 Q50 94 38 84 Z" fill="#6f675c" />
      <path d="M37 61 L83 61" stroke="#a8a29e" strokeWidth="1.1" />
      <path d="M38 68 L82 68 M40 76 L80 76 M44 84 L76 84" stroke="#57514a" strokeWidth="1.3" />
      <path d="M58 62 L60 68 L62 62" stroke="#57514a" strokeWidth="1" fill="none" />
    </svg>
  );
}
function PortraitY({ size = 120 }) {
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 120 138">
      <defs><radialGradient id="bgY" cx="50%" cy="35%"><stop offset="0%" stopColor="#06231f" /><stop offset="100%" stopColor="#020c0a" /></radialGradient></defs>
      <rect width="120" height="138" rx="10" fill="url(#bgY)" />
      <g opacity=".58">
        <path d="M70 96 Q66 60 78 34 Q86 16 102 10 Q96 26 98 40 Q108 30 118 30 Q108 44 106 60 Q104 82 94 96 Z" fill="#2dd4bf" />
        <path d="M70 96 Q66 60 78 34 Q84 20 96 12 Q88 30 90 48 Q86 74 80 96 Z" fill="#0d9488" opacity=".8" />
        <path d="M92 30 Q90 16 100 12 Q112 10 114 20 Q115 28 108 32 Q100 35 92 30 Z" fill="#2dd4bf" />
        <path d="M96 18 Q100 13.5 107 15 Q105 21 99 21.5 Z" fill="#0b3f3a" />
        <path d="M98.5 17 L102.5 16 L101.6 19.2 Z" fill="#a5f3fc" /><path d="M104.5 16.6 L108 16 L106.8 19 Z" fill="#a5f3fc" />
        <circle cx="100.5" cy="17.5" r="2.8" fill="#67e8f9" opacity=".55" /><circle cx="106" cy="17.3" r="2.8" fill="#67e8f9" opacity=".55" />
        <path d="M92 26 Q64 4 34 10 Q16 14 10 28 Q8 44 18 56 L30 52 Q20 44 22 32 Q28 20 48 18 Q72 16 88 32 Z" fill="#2dd4bf" />
        <path d="M92 26 Q68 8 44 12 Q60 14 74 22 Z" fill="#5eead4" opacity=".8" />
        <path d="M18 56 Q10 62 14 72 Q20 80 30 76 Q36 70 32 62 Q26 56 18 56 Z" fill="#2dd4bf" />
        <path d="M16 62 Q13 67 17 71 M22 60 Q19 66 23 71 M28 60 Q26 66 29 70" stroke="#0b3f3a" strokeWidth="1.6" fill="none" />
        <path d="M102 10 L104 5 L106.5 10 L109 6 L110 11 M114 20 L118 18 M118 30 L114 34" stroke="#f0fdfa" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        <path d="M34 10 L32 5 L37 8 L38 3 L41 8 L45 4 L46 9 M10 28 L5 26 M12 44 L7 46 M14 72 L10 77 L16 76 L14 81 M30 76 L32 81" stroke="#f0fdfa" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        <path d="M94 96 Q100 90 102 82 M70 96 Q64 92 62 86 M78 34 Q74 42 74 52" stroke="#ccfbf1" strokeWidth="1.2" fill="none" />
        <circle cx="30" cy="4" r="1.1" fill="#ccfbf1" /><circle cx="47" cy="2" r=".9" fill="#a5f3fc" /><circle cx="8" cy="22" r="1" fill="#ccfbf1" /><circle cx="112" cy="6" r="1" fill="#a5f3fc" /><circle cx="118" cy="14" r=".9" fill="#ccfbf1" /><circle cx="6" cy="62" r="1" fill="#a5f3fc" /><circle cx="34" cy="84" r="1" fill="#ccfbf1" /><circle cx="108" cy="70" r="1" fill="#a5f3fc" />
        <path d="M84 36 Q78 56 78 78 M96 40 Q92 60 90 82 M40 14 Q56 14 72 22" stroke="#67e8f9" strokeWidth="1.3" fill="none" opacity=".7" />
      </g>
      <path d="M2 84 Q30 64 62 72 Q96 80 118 58" stroke="#5eead4" strokeWidth="3.2" fill="none" opacity=".45" strokeLinecap="round" />
      <path d="M2 84 Q30 64 62 72 Q96 80 118 58" stroke="#ccfbf1" strokeWidth="1.1" fill="none" opacity=".65" />
      <circle cx="30" cy="72" r="1.5" fill="#a5f3fc" opacity=".85" /><circle cx="92" cy="74" r="1.4" fill="#ccfbf1" opacity=".85" />
      <path d="M8 138 L14 114 Q22 102 40 100 L80 100 Q98 102 106 114 L112 138 Z" fill="#115e59" />
      <path d="M8 138 L14 114 Q22 102 40 100 L52 100 Q34 110 30 138 Z" fill="#0b3f3a" />
      <path d="M20 112 Q24 109 28 112 M34 106 Q38 103 42 106 M78 106 Q82 103 86 106 M92 112 Q96 109 100 112" stroke="#0d9488" strokeWidth="1.3" fill="none" opacity=".9" />
      <path d="M10 138 L13 88" stroke="#26140a" strokeWidth="4.6" strokeLinecap="round" />
      <path d="M10 138 L13 88" stroke="#6b4a24" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8 112 L17 110 M9 124 L17 122" stroke="#140a04" strokeWidth="2" />
      <path d="M16 106 Q22 112 20 122 Q15 117 16 110 Z" fill="#0f4a44" opacity=".9" />
      <path d="M7 88 L19 88 L18 94 L8 94 Z" fill="#0f4a44" /><circle cx="11" cy="91" r=".9" fill="#04211c" /><circle cx="15" cy="91" r=".9" fill="#04211c" />
      <path d="M11 88 L11 58 L13 52 L15 58 L15 88 Z" fill="#155e59" />
      <path d="M13 52 L15 58 L15 88 L13 88 Z" fill="#0b3f3a" />
      <path d="M11 66 L8.5 69 L11 71 M11 76 L8.5 79 L11 81" stroke="#155e59" strokeWidth="1.6" fill="none" />
      <path d="M13 53 L13 88" stroke="#5eead4" strokeWidth=".9" opacity=".9" />
      <path d="M9 88 Q0 82 0 66 L2 60 L5 66 Q4 78 11 84 Z" fill="#155e59" />
      <path d="M2 60 L5 66 Q4 78 11 84 L10 86 Q2 80 2 67 Z" fill="#0b3f3a" opacity=".7" />
      <path d="M2 70 L0 74 L4 74 Z M3 62 L0.5 65.5 L4.5 66 Z" fill="#155e59" />
      <path d="M17 88 Q26 82 26 66 L24 60 L21 66 Q22 78 15 84 Z" fill="#155e59" />
      <path d="M24 66 L27 70 L23 71 Z M23 74 L26.5 77.5 L22 78 Z" fill="#155e59" />
      <path d="M2.5 61 L4.5 66 M23.5 61 L21.5 66" stroke="#5eead4" strokeWidth=".9" opacity=".9" />
      <path d="M13 52 L10.5 58 L15.5 58 Z" fill="#a5f3fc" /><path d="M2 60 L0 66 L5 64 Z" fill="#a5f3fc" /><path d="M24 60 L26 66 L21 64 Z" fill="#a5f3fc" />
      <path d="M4 82 Q13 92 22 82 Q18 90 13 91 Q8 90 4 82 Z" fill="#04211c" opacity=".7" />
      <path d="M5 82 Q13 90 21 82" stroke="#2dd4bf" strokeWidth="1.2" fill="none" opacity=".8" />
      <circle cx="13" cy="72" r="7" fill="#5eead4" opacity=".12" />
      <path d="M42 96 Q52 90 58 96 Q52 101 42 106 Z" fill="#ccfbf1" opacity=".8" />
      <path d="M50 78 L70 78 L72 100 L48 100 Z" fill="#c3ded8" />
      <path d="M50 78 L60 78 L60 100 L48 100 Z" fill="#9ec4bd" />
      <path d="M51 88 L56 89 M51 93 L56 94" stroke="#0d9488" strokeWidth="1.2" />
      <path d="M64 88 L69 89 M64 93 L69 94" stroke="#115e59" strokeWidth="1.2" /><path d="M53 97 L57 98 M63 97 L67 98" stroke="#0d9488" strokeWidth="1.1" />
      <path className="fxWave" d="M36 30 Q46 12 62 12 Q82 14 88 32 Q92 48 84 62 Q88 44 78 38 Q84 52 76 60 Q78 44 68 38 Q73 50 64 54 Q66 40 56 37 Q46 37 40 45 Q34 37 36 30 Z" fill="#0d9488" />
      <path d="M46 25 Q58 15 74 22" stroke="#2dd4bf" strokeWidth="1.5" fill="none" opacity=".8" />
      <path d="M82 62 Q86 72 80 82 Q76 72 79 65 Z" fill="#2dd4bf" opacity=".85" />
      <circle cx="86" cy="44" r="1.3" fill="#a5f3fc" opacity=".8" />
      <path d="M36 60 Q22 44 28 24 Q36 14 46 20 L44 34 Q38 46 40 58 Z" fill="#115e59" opacity=".9" />
      <path d="M84 60 Q98 44 92 24 Q84 14 74 20 L76 34 Q82 46 80 58 Z" fill="#0d9488" opacity=".9" />
      <path d="M32 46 Q30 34 36 26 M40 52 Q37 40 42 30 M88 46 Q90 34 84 26 M80 52 Q83 40 78 30" stroke="#0b3f3a" strokeWidth="1.2" fill="none" />
      <path d="M28 24 Q36 15 46 20 M92 24 Q84 15 74 20" stroke="#2dd4bf" strokeWidth="1" fill="none" opacity=".6" />
      <path d="M32 62 L36 38 L48 28 L72 28 L84 38 L88 62 L80 84 L60 94 L40 84 Z" fill="#c3ded8" />
      <path d="M32 62 L36 38 L48 28 L60 28 L60 94 L40 84 Z" fill="#9ec4bd" />
      <path d="M76 80 L84 70 L86 60 L80 80 Z" fill="#7fa39c" opacity=".7" />
      <path d="M40 48 L56 46 L55 58 L42 57 Z" fill="#2a4a44" opacity=".5" />
      <path d="M80 48 L64 46 L65 58 L78 57 Z" fill="#2a4a44" opacity=".5" />
      <path d="M50 34 Q53 32 56 34 M58 32 Q61 30 64 32 M66 34 Q69 32 72 34" stroke="#0d9488" strokeWidth="1.1" fill="none" opacity=".85" />
      <path d="M36 74 Q39 72 42 74 M78 74 Q81 72 84 74" stroke="#0d9488" strokeWidth="1.1" fill="none" opacity=".85" />
      <path d="M34 56 L16 46 L24 60 L18 70 L34 66 Z" fill="#2dd4bf" opacity=".9" /><path d="M32 58 L22 52 M32 63 L22 62" stroke="#115e59" strokeWidth="1" />
      <path d="M86 56 L104 44 L96 58 L102 68 L86 66 Z" fill="#0d9488" opacity=".95" /><path d="M88 58 L98 52 M88 63 L98 62" stroke="#115e59" strokeWidth="1" />
      <path d="M40 68 Q42 66 44 68 M38 73 Q40 71 42 73 M76 68 Q78 66 80 68 M78 73 Q80 71 82 73" stroke="#0d9488" strokeWidth="1.1" fill="none" opacity=".9" />
      <circle className="fxHalo" cx="49" cy="52" r="6" fill="#5eead4" opacity=".25" /><circle className="fxHaloB" cx="71" cy="52" r="6" fill="#5eead4" opacity=".25" />
      <path d="M43 51 L54 49.5 L53 56 L44 55 Z" fill="#04211c" /><path d="M77 51 L66 49.5 L67 56 L76 55 Z" fill="#04211c" />
      <path d="M45 51.5 L52 50.4 L51.5 54.6 L45.8 54 Z" fill="#5eead4" opacity=".4" /><path d="M75 51.5 L68 50.4 L68.5 54.6 L74.2 54 Z" fill="#5eead4" opacity=".4" />
      <path d="M48.8 50.4 L48.6 55 M71.2 50.4 L71.4 55" stroke="#99f6e4" strokeWidth="1.9" strokeLinecap="round" />
      <circle cx="48.7" cy="51.4" r=".7" fill="#f0fdfa" /><circle cx="71.3" cy="51.4" r=".7" fill="#f0fdfa" />
      <path d="M42 48 L55 46 M78 48 L65 46" stroke="#0b3f3a" strokeWidth="2.4" />
      <path d="M58.5 49 L60 58 L61.5 49" stroke="#7fa39c" strokeWidth="1.1" fill="none" opacity=".8" />
      <path d="M56 66 L60 68 L64 66" stroke="#4f7c74" strokeWidth="1.2" fill="none" />
      <path d="M50 74 Q60 82 70 74 Q66 80.5 60 81 Q54 80.5 50 74 Z" fill="#04211c" />
      <path d="M50 74 Q60 78 70 74 L69 75.5 Q60 79 51 75.5 Z" fill="#e7f5f2" />
      <path d="M53 75 L54.5 79.8 L56 75.4 Z M64 75.4 L65.5 79.8 L67 75 Z" fill="#f0fdfa" />
      <path d="M57.5 75.6 L58.2 77.4 L59 75.7 Z M61 75.7 L61.8 77.4 L62.5 75.6 Z" fill="#e7f5f2" />
      <path d="M56 80.4 L57 78.8 L58 80.5 Z M62 80.5 L63 78.8 L64 80.4 Z" fill="#d5ece7" opacity=".9" />
      <path d="M49 73 L47 71.5 M71 73 L73 71.5" stroke="#4f7c74" strokeWidth="1.1" />
    </svg>
  );
}
function PortraitW({ size = 120 }) {
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 120 138">
      <defs><radialGradient id="bgW" cx="50%" cy="35%"><stop offset="0%" stopColor="#0a2412" /><stop offset="100%" stopColor="#030b06" /></radialGradient></defs>
      <rect width="120" height="138" rx="10" fill="url(#bgW)" />
      <g opacity=".96">
        <path d="M46 38 Q30 36 20 26 Q14 18 16 10 L24 18 Q32 26 42 30 Z" fill="#3a2408" />
        <path d="M46 40 Q28 42 12 38 Q20 31 32 31 L45 34 Z" fill="#241505" />
        <path d="M14 37 Q20 33 28 33 M22 39 Q28 36 36 35" stroke="#120a03" strokeWidth="1" opacity=".7" />
        <path d="M45 33 Q34 30 26 23 Q20 17 19 12 L24 15 Q29 23 38 27 L46 30 Z" fill="#7c2d12" />
        <path d="M18 12 L3 3 L6 9 L19 15 Z" fill="#241505" />
        <path d="M17 15 L1 11 L3 17 L18 18 Z" fill="#2e1c06" />
        <path d="M17 18 L2 19 L5 24 L18 21 Z" fill="#241505" />
        <path d="M18 21 L6 27 L10 31 L19 24 Z" fill="#2e1c06" />
        <path d="M19 24 L12 32 L17 35 L21 27 Z" fill="#241505" />
        <g className="fxWing">
          <path d="M74 38 Q90 36 100 26 Q106 18 104 10 L96 18 Q88 26 78 30 Z" fill="#3a2408" />
          <path d="M74 40 Q92 42 108 38 Q100 31 88 31 L75 34 Z" fill="#241505" />
          <path d="M106 37 Q100 33 92 33 M98 39 Q92 36 84 35" stroke="#120a03" strokeWidth="1" opacity=".7" />
          <path d="M75 33 Q86 30 94 23 Q100 17 101 12 L96 15 Q91 23 82 27 L74 30 Z" fill="#7c2d12" />
          <path d="M102 12 L117 3 L114 9 L101 15 Z" fill="#241505" />
          <path d="M103 15 L119 11 L117 17 L102 18 Z" fill="#2e1c06" />
          <path d="M103 18 L118 19 L115 24 L102 21 Z" fill="#241505" />
          <path d="M102 21 L114 27 L110 31 L101 24 Z" fill="#2e1c06" />
          <path d="M101 24 L108 32 L103 35 L99 27 Z" fill="#241505" />
        </g>
        <path d="M46 32 Q60 22 74 32 L72 46 L48 46 Z" fill="#3a2408" />
        <path d="M56 30 L58 36 M62 30 L61 36 M66 31 L64 37" stroke="#d9cfba" strokeWidth="1" opacity=".7" />
        <path d="M50 16 Q48 4 54 0 L66 0 Q72 4 70 16 Q67 22 60 23 Q53 22 50 16 Z" fill="#241505" />
        <path d="M54 0 L66 0 Q70 3 70 8 L50 8 Q50 3 54 0 Z" fill="#2e1c06" />
        <path d="M50 9 L70 9 L68 13 L52 13 Z" fill="#120a03" />
        <path d="M52 13 L68 13 Q68 20 60 22 Q52 20 52 13 Z" fill="#d9cfba" />
        <circle className="fxHalo" cx="56" cy="14.5" r="4" fill="#f59e0b" opacity=".3" /><circle className="fxHaloB" cx="64" cy="14.5" r="4" fill="#f59e0b" opacity=".3" />
        <path d="M53.5 13.5 Q56 12 58.5 13.7 Q58 16.5 55.5 16.3 Q53.8 15.5 53.5 13.5 Z" fill="#120a03" />
        <path d="M66.5 13.5 Q64 12 61.5 13.7 Q62 16.5 64.5 16.3 Q66.2 15.5 66.5 13.5 Z" fill="#120a03" />
        <circle cx="56" cy="14.6" r="1.3" fill="#f59e0b" /><circle cx="64" cy="14.6" r="1.3" fill="#f59e0b" />
        <circle cx="56.4" cy="14.1" r=".5" fill="#fef3c7" /><circle cx="64.4" cy="14.1" r=".5" fill="#fef3c7" />
        <path d="M52 11.5 L58 12.6 M68 11.5 L62 12.6" stroke="#0c0702" strokeWidth="1.3" />
        <path d="M57.5 17 L62.5 17 L60 22.5 Z" fill="#3f3a34" />
        <path d="M57.5 17 L62.5 17" stroke="#57534e" strokeWidth=".8" />
        <path d="M60 22.5 Q61.6 23.5 60.4 25" stroke="#26221c" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        <path d="M53 17.5 L55 20 M67 17.5 L65 20" stroke="#26221c" strokeWidth="1" />
      </g>
      <g transform="translate(6 14) scale(0.9)">
      <path d="M18 128 L96 36" stroke="#78350f" strokeWidth="4" strokeLinecap="round" />
      <path d="M96 36 Q102 28 98 22 M18 128 Q12 136 16 138" stroke="#78350f" strokeWidth="3" fill="none" />
      <path d="M20 124 L94 40" stroke="#f5f5f4" strokeWidth=".8" opacity=".8" />
      <path d="M34 108 L38 104 M74 58 L78 54" stroke="#3d2410" strokeWidth="2.4" />
      <path d="M60 12 Q28 22 30 66 L36 102 Q48 92 60 92 Q72 92 82 102 L88 66 Q92 22 60 12 Z" fill="#14532d" />
      <path d="M60 12 Q28 22 30 66 L34 90 Q35 44 60 28 Z" fill="#0c3018" />
      <path d="M60 12 Q68 10 73 18 L66 16 Z" fill="#0f4a24" />
      <path d="M36 60 Q40 76 48 84 M84 60 Q80 76 74 84" stroke="#0f4a24" strokeWidth="1.4" fill="none" />
      <path d="M46 30 Q49 27 52 30 Q49 33 46 30 Z M54 24 Q57 21 60 24 Q57 27 54 24 Z M64 26 Q67 23 70 26 Q67 29 64 26 Z" fill="#166534" opacity=".8" />
      <path d="M44 50 L24 42 L40 58 Z" fill="#c9a077" /><path d="M42 50 L30 46" stroke="#8a6a45" strokeWidth=".8" />
      <path d="M76 50 L98 40 L80 58 Z" fill="#b78a5e" /><path d="M78 50 L92 44" stroke="#7c5a35" strokeWidth=".8" />
      <path d="M46 44 Q60 36 74 44 L73 66 Q68 78 60 79 Q52 78 47 66 Z" fill="#c9a077" />
      <path d="M46 44 Q60 36 60 36 L60 79 Q52 78 47 66 Z" fill="#b78a5e" />
      <path d="M47 62 L53 70 M73 62 L67 70" stroke="#8a6a45" strokeWidth="1" opacity=".7" />
      <path d="M46 44 Q60 34 74 44 L73 50 Q60 42 47 50 Z" fill="#2a1a0c" />
      <path d="M45 52 L75 52 L74 60 L46 60 Z" fill="#0c3018" opacity=".8" />
      <path d="M48 55 L56 54 L55 58 L49 58 Z" fill="#07110a" /><path d="M72 55 L64 54 L65 58 L71 58 Z" fill="#07110a" />
      <path d="M51 54.4 L54 54.2" stroke="#4ade80" strokeWidth="1.8" /><path d="M66 54.2 L69 54.4" stroke="#4ade80" strokeWidth="1.8" />
      <circle cx="52" cy="56" r="4" fill="#4ade80" opacity=".18" /><circle cx="68" cy="56" r="4" fill="#4ade80" opacity=".18" />
      <path d="M47 53 L56 51.5 M73 53 L64 51.5" stroke="#1a2e14" strokeWidth="1.4" />
      <path d="M68 62 L72 70" stroke="#8a5a3c" strokeWidth="1.2" />
      <path d="M59 58 L61 58 L62 66 L58 66 Z" fill="#b78a5e" />
      <path d="M54 72 L66 72" stroke="#7c5a35" strokeWidth="1.4" />
      <path d="M50 80 Q60 86 70 80 L69 88 Q60 92 51 88 Z" fill="#3d2410" />
      <path d="M58 82 L56 78 M58 82 L60 77 M62 82 L64 78" stroke="#e7e0cf" strokeWidth="1.2" fill="none" />
      <path d="M24 138 Q28 106 46 98 L74 98 Q92 106 96 138 Z" fill="#166534" />
      <path d="M24 138 Q28 106 46 98 L56 98 Q40 110 38 138 Z" fill="#0f4a24" />
      <path d="M44 104 L44 132 M50 102 L50 134" stroke="#0c3018" strokeWidth="1.2" />
      
      <path d="M28 118 L34 112 M30 124 L38 116" stroke="#4ade80" strokeWidth="1.1" opacity=".45" />
      </g>
    </svg>
  );
}
function PortraitX({ size = 120 }) {
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 120 138">
      <defs><radialGradient id="bgX" cx="50%" cy="35%"><stop offset="0%" stopColor="#10151d" /><stop offset="100%" stopColor="#05070b" /></radialGradient></defs>
      <rect width="120" height="138" rx="10" fill="url(#bgX)" />
      <path d="M14 118 L92 22 L98 26 L22 124 Z" fill="#cbd5e1" /><path d="M92 22 L104 14 L98 26 Z" fill="#e2e8f0" />
      <path d="M106 118 L28 22 L22 26 L98 124 Z" fill="#94a3b8" /><path d="M28 22 L16 14 L22 26 Z" fill="#cbd5e1" />
      <circle className="fxHalo" cx="42" cy="46" r="5.5" fill="#e2e8f0" opacity=".22" /><circle className="fxHaloB" cx="74" cy="46" r="5.5" fill="#e2e8f0" opacity=".22" /><path d="M40 44 L44 48 M76 44 L72 48" stroke="#475569" strokeWidth="1.6" /><path className="fxBoltA" d="M84 32 L98 18" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" /><path className="fxBoltB" d="M36 32 L22 18" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M20 138 Q24 106 44 98 L76 98 Q96 106 100 138 Z" fill="#1e293b" />
      <path d="M20 138 Q24 106 44 98 L54 98 Q38 110 36 138 Z" fill="#141d2b" />
      <path d="M22 112 L40 102 L44 110 L28 120 Z" fill="#334155" /><path d="M98 112 L80 102 L76 110 L92 120 Z" fill="#293548" />
      <path d="M24 110 L42 100 M26 116 L44 106" stroke="#94a3b8" strokeWidth="1.2" opacity=".7" />
      <path d="M46 96 Q60 108 74 96 Q76 104 70 108 Q60 114 50 108 Q44 104 46 96 Z" fill="#b91c1c" />
      <path d="M70 104 Q80 110 78 122 L72 118 Q74 110 68 108 Z" fill="#7f1d1d" />
      <path d="M40 58 Q40 32 60 30 Q80 32 80 58 L78 70 L42 70 Z" fill="#94a3b8" />
      <path d="M40 58 Q40 32 60 30 L60 70 L42 70 Z" fill="#64748b" />
      <path d="M56 34 L64 34 L64 72 L56 72 Z" fill="#475569" />
      <path d="M42 56 L56 56 L56 64 L44 64 Z" fill="#0b0f16" /><path d="M64 56 L78 56 L76 64 L64 64 Z" fill="#0b0f16" />
      <path d="M46 59 L53 58 L51 62 Z" fill="#e2e8f0" /><path d="M74 59 L67 58 L69 62 Z" fill="#e2e8f0" />
      <path d="M44 70 Q60 78 76 70 L74 88 Q60 96 46 88 Z" fill="#cfae83" />
      <path d="M50 82 Q60 88 70 82" stroke="#8a6a45" strokeWidth="1.2" fill="none" />
      <path d="M68 74 L74 84" stroke="#8a3324" strokeWidth="1.4" opacity=".9" />
      <path d="M46 88 Q60 98 74 88 L74 92 Q60 100 46 92 Z" fill="#7f1d1d" />
    </svg>
  );
}
const PORTRAITS = { G: PortraitG, M: PortraitM, V: PortraitV, C: PortraitC, K: PortraitK, Z: PortraitZ, L: PortraitL, O: PortraitO, D: PortraitD, Y: PortraitY, W: PortraitW, X: PortraitX };
function Sigil({ fk, size = 120 }) {
  const F = FIGHTERS[fk];
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 120 138">
      <rect width="120" height="138" rx="10" fill="#0c0a09" />
      <circle cx="60" cy="58" r="34" fill="none" stroke={F.hex} strokeOpacity=".4" strokeWidth="2" />
      <circle cx="60" cy="58" r="43" fill="none" stroke={F.hex} strokeOpacity=".15" strokeWidth="1" />
      <text x="60" y="72" textAnchor="middle" fontSize="42" fontStyle="italic" fontFamily="Georgia, serif" fill={F.hex}>{F.short[0]}</text>
      <text x="60" y="122" textAnchor="middle" fontSize="8" fill="#78716c" letterSpacing="2">{F.sub.split(" \u00b7 ")[0].toUpperCase()}</text>
    </svg>
  );
}
function PixelCard({ fk, size = 120 }) {
  const F = FIGHTERS[fk];
  return (
    <div className="relative rounded-lg overflow-hidden grid place-items-center" style={{ width: size, height: size * 1.15, background: `radial-gradient(90% 70% at 50% 32%, ${F.hex}2e, #0c0a09 70%)`, border: `1px solid ${F.hex}44` }}>
      <div style={{ filter: `drop-shadow(0 0 10px ${F.hex}66)` }}><PixelSprite fk={fk} size={size * 0.62} /></div>
      <div className="absolute bottom-1 inset-x-0 text-center" style={{ fontSize: Math.max(7, size * 0.075), color: "#a8a29e", letterSpacing: 1 }}>{F.short.toUpperCase()}</div>
    </div>
  );
}
const Portrait = ({ fk, size }) => { const P = PORTRAITS[fk]; return P ? <P size={size} /> : <PixelCard fk={fk} size={size} />; };

/* ============ PIXEL SPRITES (Hexen-style, 14×18, two-frame idle) ============ */
const SPRITES = {
  G: {
    pal: { k: "#120b08", g: "#4d7c0f", d: "#365314", w: "#f5f0e1", r: "#b91c1c", R: "#ef4444", s: "#a8a29e", S: "#57534e", b: "#1c1917", f: "#44403c" },
    a: [
      "......bb......",
      ".....kbbk..sss",
      "....kggggk.sSs",
      "...kgddddgk.kS",
      "...kdRddRdk.kS",
      "...kgrggrgk.kS",
      "...kbggggbk.kS",
      "...kbwggwbk.kS",
      "..fkbbbbbbkkkS",
      ".ffkgggggggkkS",
      ".fkggrrggggk.S",
      ".kgg.gggg.gg.k",
      ".kg..gggg..g..",
      ".....dkkd.....",
      ".....dkkd.....",
      "....kd..dk....",
      "....kd..dk....",
      "....kk..kk....",
    ],
    b: [
      "......bb......",
      ".....kbbk..sss",
      "....kggggk.sSs",
      "...kgddddgk.kS",
      "...kdRddRdk.kS",
      "...kgrggrgk.kS",
      "...kbggggbk.kS",
      "..fkbwggwbk.kS",
      ".ffkbbbbbbkkkS",
      ".fkggggggggkkS",
      ".kgggrrgggg.kS",
      ".kgg.gggg.gg.k",
      ".....gggg..g..",
      ".....dkkd.....",
      ".....dkkd.....",
      "....kd..dk....",
      "....kd..dk....",
      "....kk..kk....",
    ],
  },
  M: {
    pal: { k: "#05070d", h: "#111827", H: "#1e293b", f: "#64748b", e: "#34d399", s: "#cbd5e1", g: "#065f46" },
    a: [
      "......kk......",
      ".....kkkk.....",
      "....khhhhk....",
      "...khHHHHhk...",
      "..skhffffhks..",
      "..skhekkehks..",
      "..skhffffhks..",
      "...kkhkkhkk...",
      "..khHHHHHHhk..",
      "..khHHHHHHhk..",
      ".skhHHHHHHhks.",
      ".kshHHHHHHhsk.",
      "..k.hHHHHh.k..",
      "....hHHHHh....",
      "....hHkkHh....",
      "....hHkkHh....",
      "...khk..khk...",
      "...kk....kk...",
    ],
    b: [
      "......kk......",
      ".....kkkk.....",
      "....khhhhk....",
      "...khHHHHhk...",
      "..skhffffhks..",
      "..skhkeekhks..",
      "..skhffffhks..",
      "...kkhkkhkk...",
      "..khHHHHHHhk..",
      "..khHHHHHHhk..",
      ".skhHHHHHHhks.",
      ".kshHHHHHHhsk.",
      "..k.hHHHHh.k..",
      "....hHHHHh....",
      "....hHkkHh....",
      "....hHkkHh....",
      "...khk..khk...",
      "...kk....kk...",
    ],
  },
  V: {
    pal: { k: "#060b14", n: "#0c1a2e", N: "#12233d", t: "#0e7490", T: "#155e75", i: "#7dd3fc", I: "#6fb8de", w: "#b6dcef", v: "#030912", p: "#e6d3bc", F: "#1e2939" },
    a: [
      "....i..i..i...",
      "...kiiiiiiik..",
      "..knnnnnnnnnk.",
      ".knnwnnnnnnnk.",
      ".knppppppppnk.",
      ".knpippppipnk.",
      ".knpppkkpppnk.",
      "..kFFFFFFFFk..",
      ".kTttttttTk.I.",
      ".kTttwwttTkIII",
      ".kTttttttTkIwI",
      "..kTttttTk.III",
      "..knnnnnnk..II",
      "..kNnnnnNk..Iw",
      "..kNnnnnNk...I",
      "..knN..Nnk....",
      "...kn..nk.....",
      "...kk..kk.....",
    ],
    b: [
      "....i..i..i...",
      "...kiiiiiiik..",
      "..knnnnnnnnnk.",
      ".knnwnnnnnnnk.",
      ".knppppppppnk.",
      ".knpippppipnk.",
      ".knpppkkpppnk.",
      "..kFFFFFFFFk..",
      ".kTttttttTk.I.",
      ".kTttttttTkIwI",
      ".kTttwwttTkIII",
      "..kTttttTk.III",
      "..knnnnnnk..II",
      "..kNnnnnNk..wI",
      "..kNnnnnNk...I",
      "..knN..Nnk....",
      "...kn..nk.....",
      "...kk..kk.....",
    ],
  },
  C: {
    pal: { k: "#160702", s: "#92400e", S: "#7c3509", o: "#f97316", O: "#fdba74", y: "#fde047", c: "#1c1917", g: "#eab308", C: "#44403c", e: "#fef3c7" },
    a: [
      "..o.Oyy.o.....",
      ".ko.oyyo.ok...",
      "..kooOOook....",
      "...kssssk.....",
      "...kekkek.....",
      "...kssssk.....",
      "...kcccck.....",
      "..ksccccsk....",
      "..ksgggsk.o...",
      ".kSssssssSk...",
      ".kSsggggsSk.o.",
      ".kSssssssSkC..",
      "..kSsssssSkC..",
      "..kScccsSk....",
      "...ksssssk....",
      "...kS...Sk....",
      "...kS...Sk....",
      "...kk...kk....",
    ],
    b: [
      ".o..Oyyo......",
      ".ko.oyyo.ok...",
      "..koOooOok....",
      "...kssssk.....",
      "...kykkyk.....",
      "...kssssk.....",
      "...kcccck.....",
      "..ksccccsk.o..",
      "..ksgggsk.....",
      ".kSssssssSk...",
      ".kSsggggsSk...",
      ".kSssssssSkC..",
      "..kSsssssSkC..",
      "..kScccsSk.y..",
      "...ksssssk....",
      "...kS...Sk....",
      "...kS...Sk....",
      "...kk...kk....",
    ],
  },
  K: {
    pal: { k: "#0b0714", s: "#78716c", S: "#57534e", t: "#a8a29e", v: "#a78bfa", V: "#ede9fe", d: "#44403c" },
    a: [
      "....S.vv.S....",
      ".....kssk.....",
      "....ksttsk....",
      "....kvvvvk....",
      "....ksttsk....",
      "...kkssssk k..".replace(" k", "kk"),
      "..ksvssssvsk..",
      ".kSvsssssvSsk.",
      ".kSsdddddsSsk.",
      ".kSsdkvkdsSsk.",
      ".kSsdvVvdsSsk.",
      ".kSsdkvkdsSsk.",
      "..ksdddddsk...",
      "....dddddd....",
      "....ddkkdd....",
      "...kdd..ddk...",
      "...kdd..ddk...",
      "...kkk..kkk...",
    ],
    b: [
      "....S.VV.S....",
      ".....kssk.....",
      "....ksttsk....",
      "....kvvvvk....",
      "....ksttsk....",
      "...kkssssskk..",
      "..ksvssssvsk..",
      ".kSvsssssvSsk.",
      ".kSsdddddsSsk.",
      ".kSsdkVkdsSsk.",
      ".kSsdVvVdsSsk.",
      ".kSsdkVkdsSsk.",
      "..ksdddddsk...",
      "....dddddd....",
      "....ddkkdd....",
      "...kdd..ddk...",
      "...kdd..ddk...",
      "...kkk..kkk...",
    ],
  },
};
// normalize frame A row 5 of Koros (authoring artifact)
SPRITES.K.a[5] = "...kkssssskk..";
SPRITES.Z = {
  pal: { k: "#0d0512", p: "#3b1d63", P: "#2a1247", r: "#ef4444", s: "#8b7a9e", c: "#57534e", v: "#0b0413" },
  a: [
    "..p........p..",
    "..kp......pk..",
    "...kpPPPPpk...",
    "..kpPvvvvPpk..",
    "..kpvvvvvvpk..",
    "..kpvrvvrvpk..",
    "..kpvvvvvvpk..",
    "...kpppppk....",
    "..kpPPPPPPpk..",
    ".kpPPrrPPPpk..",
    ".kpPPPPPPPpk.c",
    "..kpPPPPPPpk.c",
    "..kpPPPPPPpkc.",
    "..k.pPPPPp.k..",
    "....pPPPPp....",
    "...pP.kk.Pp...",
    "...k.p..p.k...",
    "..k..k..k..k..",
  ],
};
SPRITES.L = {
  pal: { k: "#0f0a03", s: "#a8a29e", S: "#78716c", g: "#eab308", y: "#fde047", b: "#1e3a8a", w: "#e7e5e4", d: "#57534e" },
  a: [
    "..y...yy...y..",
    "...y.kssk.y...",
    ".s..kssssk..s.",
    ".ss.kssssk.ss.",
    "....kgyygk....",
    "....kssssk....",
    "...kssssssk...",
    ".wwkssbbssk...",
    ".wwksbbbbsk...",
    ".wgksSbbSsk...",
    ".wwkssbbssk...",
    ".wwkssssssk...",
    "..w.ksbbsk....",
    "....sSbbSs....",
    "....sSkkSs....",
    "...ksS..Ssk...",
    "...ksS..Ssk...",
    "...kkk..kkk...",
  ],
};
SPRITES.O = {
  pal: { k: "#0a0d05", q: "#1c1917", m: "#1a2e0a", M: "#101f05", w: "#e7e5e4", b: "#d6cdba", g: "#a3e635", f: "#78350f" },
  a: [
    "..q..qq..q...f",
    "..q..qq..q...f",
    "...kwwwwk....f",
    "...kwwwwk...wf",
    "...kwgkgwk...f".replace("kwgkgwk...", "kwgkgwk..."),
    "...kwwwwk....f",
    "...kkwwkk....f",
    "..kqqwwqqk...f",
    "..kmbbbbmk...f",
    ".kmmMMMMmmk..f",
    ".kmbbbbbbmk..f",
    ".kmMMMMMMmk..f",
    "..kmbbbbmk...f",
    "...mMMMMm....f",
    "...mMkkMm.....",
    "..kmM.kk.Mk...",
    "...k.m..m.k...",
    "...kk....kk...",
  ],
};
SPRITES.D = {
  pal: { k: "#140b04", s: "#8a6a3f", S: "#5c4425", t: "#a67c4a", w: "#8a8072", W: "#a8a29e", a: "#f59e0b", b: "#4a3617" },
  a: [
    ".WW...........",
    "..............",
    "....kttttk..W.",
    "....kakkak....",
    "....kwwwwk....",
    "....kwwwwk....",
    "...kWWWWWWk...",
    "..kWWssssWWk..",
    "..kWssssssWk..",
    "..ksbsssbsk...",
    "..ksssassk..W.",
    "..ksbsssbsk...",
    "...kssssssk...",
    "...kSSkkSSk...",
    "...kSs..sSk...",
    "..kkSs..sSkk..",
    "..kSSk..kSSk..",
    "..kkk....kkk..",
  ],
};
SPRITES.Y = {
  pal: { k: "#04120f", t: "#0d9488", T: "#115e59", w: "#ccfbf1", s: "#c3ded8", W: "#5eead4", d: "#3d2410" },
  a: [
    "..d.ttt...w...",
    "..dkttttk.....",
    "W.dkssssk..W..",
    ".WdkWkkWk.W...",
    "..dkssssk.....",
    "..dktsstkW....",
    "..dTttttTk....",
    ".kdTTTTTTtk...",
    ".kdTTTTTTtkw..",
    "..dTTTTTTTtw..",
    "W.dTTTTTTTk...",
    ".WdtTTTTTTt...",
    "..dtTTkkTTt...",
    "..wtTT.kTTtw..",
    ".wWtTttttTtWw.",
    "wWtttTTTTtttWw",
    ".wtTTttttTTtw.",
    "..w..t..t..w..",
  ],
  b: [
    "..d.ttt....w..",
    "..dkttttk.....",
    ".Wdkssssk.W...",
    "W.dkWkkWk..W..",
    "..dkssssk.....",
    "..dktsstk.W...",
    "..dTttttTk....",
    ".kdTTTTTTtk...",
    ".kdTTTTTTtk.w.",
    "..dTTTTTTTtw..",
    ".WdTTTTTTTk...",
    "W.dtTTTTTTt...",
    "..dtTTkkTTt...",
    "..wtTT.kTTtw..",
    ".wWtTttttTtWw.",
    "wWtttTTTTtttWw",
    ".wtTTttttTTtw.",
    "..w..t..t..w..",
  ],
};
SPRITES.W = {
  pal: { k: "#07110a", g: "#16a34a", G: "#14532d", s: "#d1a374", h: "#7c2d12", b: "#92400e", w: "#f5f5f4" },
  a: [
    ".....kkk....b.",
    "....kgggk...b.",
    "...kghhhgk..b.",
    "..skgssssks.b.",
    "...kGgkkgGk.w.".replace("G", "h").replace("G", "h"),
    "...kgssssk..b.",
    "....kssgk...b.",
    "...kggggggk.b.",
    "..kgGGGGGGkkb.",
    "..kgGGGGGGgkb.",
    ".kggGGGGGGgkb.",
    ".kgGGGGGGGgkb.",
    "..kgGGGGGGk.b.",
    "....GGGGGG....",
    "....GGkkGG....",
    "...kGG..GGk...",
    "...kGG..GGk...",
    "...kkk..kkk...",
  ],
};
SPRITES.X = {
  pal: { k: "#0a0c10", s: "#94a3b8", S: "#475569", r: "#b91c1c", w: "#e2e8f0", d: "#1e293b" },
  a: [
    "w.............",
    ".w...kkkk...w.",
    "..w.kssssk.w..",
    "...wksSSskw...",
    "....kwkkwk....",
    "....kssssk....",
    "....krrrsk....",
    "...kssssssk...",
    "..kssrrrsssk..",
    ".ksSssssssSsk.",
    ".kwSssssssSwk.",
    ".w.kssssssk.w.",
    "w..ksSSSSk..w.",
    "....sSSSSs....",
    "....sSkkSs....",
    "...ksS..Ssk...",
    "...ksS..Ssk...",
    "...kkk..kkk...",
  ],
};
SPRITES.kess = {
  pal: { k: "#160b04", b: "#92400e", B: "#7c2d12", w: "#f5f0e1", y: "#f59e0b" },
  a: [
    "..kk......",
    ".kbbk..k..",
    "kbwbbkkBk.",
    "kbwbbbBBk.",
    ".kbbbBBk..",
    "..kyyk....",
  ],
};
SPRITES.undine = {
  pal: { k: "#03211c", t: "#2dd4bf", T: "#0d9488", w: "#ccfbf1" },
  a: [
    "...ww.....",
    "..wttw....",
    ".kttttk...",
    "kttTTttk..",
    "ktTTTTtk..",
    "ktTwwTtk..",
    ".ktTTtk...",
    "..kttk....",
    "...kk.....",
  ],
};

function SpriteFrame({ fk, frame, size }) {
  const S = SPRITES[fk];
  const H = frame.length, W = frame[0].length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={size} height={(size * H) / W} shapeRendering="crispEdges" style={{ imageRendering: "pixelated", display: "block" }}>
      {frame.map((row, y) => [...row].map((c, x) => (c === "." || !S.pal[c] ? null : <rect key={x + "-" + y} x={x} y={y} width="1.02" height="1.02" fill={S.pal[c]} />)))}
    </svg>
  );
}
function PixelSprite({ fk, size = 56, flip }) {
  const S = SPRITES[fk];
  const FB = S.b || S.a;
  const H = S.a.length, W = S.a[0].length;
  const h = (size * H) / W;
  const inner = REDUCED ? (
    <SpriteFrame fk={fk} frame={S.a} size={size} />
  ) : (
    <>
      <span className="absolute inset-0 spriteA"><SpriteFrame fk={fk} frame={S.a} size={size} /></span>
      <span className="absolute inset-0 spriteB"><SpriteFrame fk={fk} frame={FB} size={size} /></span>
    </>
  );
  return (
    <span className="relative inline-block" style={{ width: size, height: h, transform: flip ? "scaleX(-1)" : "none" }}>
      {inner}
    </span>
  );
}

/* ============ VECTOR FIGURES — full-body, card-style ============ */
const FIGS = {
  G: () => (<g>
    <path d="M15 52 L21 52 L20 68 L14 68 Z" fill="#7f1d1d" /><path d="M27 52 L33 52 L34 68 L28 68 Z" fill="#991b1b" />
    <path d="M13 66 L21 66 L21 71 L12 71 Z M27 66 L35 66 L36 71 L27 71 Z" fill="#120b08" />
    <path d="M33 60 L40 14" stroke="#3d2a12" strokeWidth="2.8" strokeLinecap="round" />
    <path d="M33 60 L40 14" stroke="#6b4a24" strokeWidth="1" strokeLinecap="round" />
    <path d="M41 17 L48 13 Q51 19 48 25 L41 22 Z" fill="#a8a29e" /><path d="M48 13 Q51 19 48 25 L46.8 24 Q49 19 46.8 14 Z" fill="#e7e5e4" />
    <path d="M38 16.5 L31 12.5 Q28 18.5 31 24.5 L38 21.5 Z" fill="#8f8a80" /><path d="M31 12.5 Q28 18.5 31 24.5 L32.2 23.5 Q30 18.5 32.2 13.5 Z" fill="#d6d3d1" />
    <path d="M37.5 15.5 L41.5 16.5 L41 23 L37 22 Z" fill="#57534e" /><circle cx="39.2" cy="18" r=".7" fill="#a8a29e" />
    <path d="M38.5 15 L39.7 9.5 L41 15 Z" fill="#78716c" />
    <path d="M46 22 L48.5 24.5 L45 24 Z" fill="#7f1d1d" />
    <path d="M14 26 Q24 22 34 26 L36 50 Q24 54 12 50 Z" fill="#4d7c0f" />
    <path d="M14 26 Q19 24 24 24 L24 52 Q17 52 12 50 Z" fill="#365314" />
    <path d="M12 48 L36 48 L36 52 L12 52 Z" fill="#b91c1c" />
    <path d="M18 33 Q22 31 24 35 Q21 37 18 33 Z" fill="none" stroke="#365314" strokeWidth="1.2" />
    <path d="M14 28 L34 44" stroke="#7c5a34" strokeWidth="1.6" /><path d="M20 33 L21.5 36 M26 38 L27.5 41" stroke="#e7e0cf" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M12 24 Q24 19 36 24 L35 30 Q24 25.5 13 30 Z" fill="#292524" />
    <path d="M15 24 L14 20 M20 22.5 L19.5 18.5 M28 22.5 L28.5 18.5 M33 24 L34 20" stroke="#3f3a34" strokeWidth="1.8" strokeLinecap="round" />
    <ellipse cx="12.5" cy="27" rx="5.5" ry="4.6" fill="#d6cdba" /><circle cx="10.8" cy="26.4" r=".9" fill="#120b08" /><circle cx="14.2" cy="26.4" r=".9" fill="#120b08" /><path d="M11 29 L14 29" stroke="#120b08" strokeWidth=".7" />
    <path d="M30 34 Q36 36 35 42" stroke="#4d7c0f" strokeWidth="4" fill="none" strokeLinecap="round" />
    <circle cx="24" cy="14" r="8" fill="#4d7c0f" /><path d="M16 14 Q16 6 24 6 L24 22 Q18 21 16 14 Z" fill="#365314" />
    <path d="M22 1.5 L26 1.5 L25 7 L23 7 Z" fill="#120b08" />
    <path d="M17.5 11 L30.5 11 L30 14 L18 14 Z" fill="#2a4507" />
    <path d="M18.5 14.6 L29.5 14.6" stroke="#5a8c14" strokeWidth=".9" />
    <circle cx="21" cy="16" r="3" fill="#ef4444" opacity=".18" /><circle cx="27" cy="16" r="3" fill="#ef4444" opacity=".18" />
    <circle cx="21" cy="16" r="1.4" fill="#ef4444" /><circle cx="27" cy="16" r="1.4" fill="#ef4444" />
    <circle cx="21.4" cy="15.5" r=".45" fill="#fef3c7" /><circle cx="27.4" cy="15.5" r=".45" fill="#fef3c7" />
    <path d="M17 17.5 L20 18 M31 17.5 L28 18" stroke="#b91c1c" strokeWidth="1" opacity=".8" />
    <path d="M19 19.5 Q24 23.5 29 19.5 L29 23 Q24 26 19 23 Z" fill="#120b08" />
    <path d="M19.5 19.4 L21.1 19.4 L21.1 20.8 L19.5 20.8 Z" fill="#e7ddc8" /><path d="M20 19.4 L20.4 20.8" stroke="#a89f8c" strokeWidth=".5" />
    <path d="M26.8 19 L27.9 22.6 L29.3 19.4 Z" fill="#f5f0e1" />
  </g>),
  M: () => (<g>
    <path d="M18 50 L22 50 L21 69 L17 69 Z M26 50 L30 50 L31 69 L27 69 Z" fill="#1c1736" />
    <path d="M12 40 L5 49" stroke="#cbd5e1" strokeWidth="1.8" strokeLinecap="round" /><path d="M36 40 L43 49" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="12" cy="40" r="1.5" fill="#065f46" /><circle cx="36" cy="40" r="1.5" fill="#065f46" />
    <path d="M24 5 Q10 13 13 30 L14 52 Q19 48 24 48 Q29 48 34 52 L35 30 Q38 13 24 5 Z" fill="#3a3054" />
    <path d="M24 5 Q10 13 13 30 L14 50 Q18 32 24 25 Z" fill="#2b2344" />
    <path d="M14 50 L20 54 L16 58 L22 60 L18 64" stroke="#2b2344" strokeWidth="2.5" fill="none" />
    <path d="M13 30 L8 24 L14 27 Z M35 30 L40 24 L34 27 Z" fill="#2f2748" />
    <path d="M15 27 L11 20 L17 24 Z M33 27 L37 20 L31 24 Z" fill="#3a3054" />
    <path d="M16 15 Q13 22 16 28 Q18 33 16 38 L18.5 37 Q20 32 18 27 Q16.5 21 18.6 16 Z" fill="#8b90a6" />
    <path d="M32 15 Q35 22 32 28 Q30 33 32 38 L29.5 37 Q28 32 30 27 Q31.5 21 29.4 16 Z" fill="#767b91" />
    <path d="M24 5 L21 10 L27 10 Z" fill="#3a3054" /><path d="M24 1 L27.5 6 L24 8.5 L21.5 5 Z" fill="#2f2748" />
    <path d="M19 11.5 Q24 9.5 29 11.5 L28.6 16.5 L19.4 16.5 Z" fill="#6d5a86" />
    <path d="M19.2 13.4 L23 14.1 M28.8 13.4 L25 14.1" stroke="#1c1736" strokeWidth="1.1" strokeLinecap="round" />
    <circle cx="21.3" cy="15.4" r="2.4" fill="#34d399" opacity=".2" /><circle cx="26.7" cy="15.4" r="2.4" fill="#34d399" opacity=".2" />
    <path d="M20 14.6 L22.8 15.1 L22.5 16.4 L20.3 15.9 Z" fill="#07120c" /><path d="M28 14.6 L25.2 15.1 L25.5 16.4 L27.7 15.9 Z" fill="#07120c" />
    <path d="M21.2 14.9 L21 16.2 M26.8 14.9 L27 16.2" stroke="#6ee7b7" strokeWidth="1" strokeLinecap="round" />
    <path d="M19 16.8 L29 16.8 L28.4 21.2 Q24 23 19.6 21.2 Z" fill="#94a3b8" /><path d="M19 16.8 L24 16.8 L24 22 Q21 22 19.6 21.2 Z" fill="#64748b" />
    <path d="M19.2 17 L28.8 17" stroke="#f1f5f9" strokeWidth=".6" />
    <path d="M20.8 18 L20.8 20.6 M22.4 18 L22.4 21.2 M24 18 L24 21.4 M25.6 18 L25.6 21.2 M27.2 18 L27.2 20.6" stroke="#05070d" strokeWidth=".8" />
    <circle cx="19.8" cy="17.8" r=".5" fill="#e2e8f0" /><circle cx="28.2" cy="17.8" r=".5" fill="#e2e8f0" />
  </g>),
  V: () => (<g>
    <path d="M24 22 L14 25 L11 30 L9 68 L39 68 L37 30 L34 25 Z" fill="#1b2942" />
    <path d="M24 22 L14 25 L11 30 L9 68 L22 68 Q20 40 24 24 Z" fill="#131e33" />
    <path d="M11 29 L17 27 L18 31 L12 33 Z" fill="#22304d" />
    <path d="M37 29 L31 27 L30 31 L36 33 Z" fill="#1b2942" />
    <path d="M15 34 Q24 30 33 34 L32 52 Q24 56 16 52 Z" fill="#0e7490" />
    <path d="M23.5 32 L24.5 32 L24.5 54 L23.5 54 Z" fill="#7dd3fc" opacity=".6" />
    <path d="M16 52 Q24 57 32 52 L32 57 Q24 61 16 57 Z" fill="#1e293b" />
    <path d="M16 27 L32 27 L33 31 Q24 28.5 15 31 Z" fill="#1e2939" />
    <path d="M18 27 L17.4 24.6 M24 26.6 L24 24.2 M30 27 L30.6 24.6" stroke="#2c394d" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M22 21 L26 21 L26 27 L22 27 Z" fill="#d9c4ac" />
    <path d="M19 10 Q19 5.5 24 5 Q29 5.5 29 10 L28 19 Q24 21.5 20 19 Z" fill="#e6d3bc" />
    <path d="M19 10 Q19 5.5 24 5 L24 21 Q21 20.5 20 19 Z" fill="#cbb49a" />
    <path d="M18 10 Q17 3.5 24 3 Q31 3.5 30 10 L28.5 8.5 Q24 6 19.5 8.5 Z" fill="#1e2939" />
    <path d="M30 8 L33 6.5 L30.5 11 Z M18 8 L15 6.5 L17.5 11 Z" fill="#1a2333" />
    <path d="M21 5 L22 4.6 L21 8 Z" fill="#e8eef4" />
    <path d="M19.5 8.6 L28.5 8.6 L28.2 10.4 L19.8 10.4 Z" fill="#a5f3fc" opacity=".92" />
    <path d="M20.6 8.6 L21.4 6.2 L22.2 8.6 Z M23.3 8.6 L24 5.4 L24.7 8.6 Z M25.8 8.6 L26.6 6.2 L27.4 8.6 Z" fill="#e0f2fe" />
    <path d="M20 12.6 L23 13.3 M28 12.6 L25 13.3" stroke="#241c12" strokeWidth="1.1" strokeLinecap="round" />
    <path d="M20.2 14 L23 14.6 L22.7 15.9 L20.5 15.3 Z" fill="#38bdf8" />
    <path d="M27.8 14 L25 14.6 L25.3 15.9 L27.5 15.3 Z" fill="#38bdf8" />
    <circle cx="21.7" cy="14.8" r=".4" fill="#ffffff" /><circle cx="26.3" cy="14.8" r=".4" fill="#ffffff" />
    <path d="M22.6 18.4 L25.4 18.4" stroke="#6b5a45" strokeWidth=".9" />
    <path d="M32 34 Q38 37 39 46 L40 56 L35 62 L32 58 L33 48 L30 40 Z" fill="#1b2942" />
    <path d="M33 48 L40 51 L38 58 L33 55 Z" fill="#38bdf8" opacity=".5" />
    <path d="M40 50 L44 47 L41 54 Z" fill="#38bdf8" opacity=".45" />
    <path d="M34 58 L40 57 L38 64 L33 62 Z" fill="#38bdf8" opacity=".55" />
    <path d="M40 59 L44 58 L41 63 Z" fill="#7dd3fc" opacity=".7" />
    <path d="M12 52 L16 51 L13 56 Z" fill="#38bdf8" opacity=".5" />
    <path d="M11 38 Q7 42 8 50 L13 54 Q16 48 15 42 Z" fill="#1b2942" />
    <ellipse cx="24" cy="67" rx="15" ry="3.5" fill="#7dd3fc" opacity=".12" />
  </g>),
  C: () => (<g>
    <path d="M17 48 L22 48 L21 69 L16 69 Z M26 48 L31 48 L32 69 L27 69 Z" fill="#292524" />
    <path d="M16 26 Q24 23 32 26 L33 48 Q24 51 15 48 Z" fill="#44403c" />
    <path d="M16 26 L24 24 L24 50 Q19 50 15 48 Z" fill="#292524" />
    <path d="M16 26 L32 26 L32 29 L16 29 Z" fill="#eab308" />
    <path d="M30 29 Q33 31 32 34 Q29 33 30 29 Z" fill="none" stroke="#eab308" strokeWidth="1.1" />
    <path d="M13 34 Q7 36 8 44 Q9 50 15 50 Q19 48 18 40 Q17 35 13 34 Z" fill="#292524" />
    <path d="M35 34 Q41 36 40 44 Q39 50 33 50 Q29 48 30 40 Q31 35 35 34 Z" fill="#44403c" />
    <circle cx="12" cy="43" r="1.3" fill="#fdba74" /><circle cx="36" cy="43" r="1.3" fill="#f97316" />
    <circle cx="12" cy="43" r="3.4" fill="#f97316" opacity=".22" /><circle cx="36" cy="43" r="3.4" fill="#f97316" opacity=".22" />
    <path d="M18 8 L14 1 L19 5 L20 0 L23 5 L26 0 L28 5 L33 1 L30 8 Z" fill="#f97316" />
    <path d="M20 6 L22 2 L24 6 L26 2 L28 6 Z" fill="#fdba74" />
    <path d="M16 10 Q10 8 8 14 Q13 14 16 16 Z M32 10 Q38 8 40 14 Q35 14 32 16 Z" fill="#f97316" />
    <path d="M33 16 Q40 17 41 24 Q35 22 32 20 Z" fill="#fdba74" opacity=".9" />
    <circle cx="24" cy="15" r="7" fill="#92400e" />
    <path d="M17.5 12 L30.5 12 L30 15 L18 15 Z" fill="#7c3509" />
    <circle cx="21" cy="13.6" r="2.8" fill="#fde047" opacity=".2" /><circle cx="27" cy="13.6" r="2.8" fill="#fde047" opacity=".2" />
    <circle cx="21" cy="13.6" r="1.1" fill="#fde047" /><circle cx="27" cy="13.6" r="1.1" fill="#fde047" />
    <circle cx="21.3" cy="13.2" r=".4" fill="#fef3c7" /><circle cx="27.3" cy="13.2" r=".4" fill="#fef3c7" />
    <path d="M22.6 9.6 L24 7.6 L25.4 9.6 L24 11 Z" fill="none" stroke="#fdba74" strokeWidth=".8" />
    <path d="M18 15.5 L30 15.5 L29.2 21 Q24 23.4 18.8 21 Z" fill="#1c1917" />
    <path d="M18 15.5 L30 15.5" stroke="#eab308" strokeWidth=".9" />
    <path d="M18.8 21 Q24 23.4 29.2 21" stroke="#eab308" strokeWidth=".8" fill="none" />
    <circle cx="30.6" cy="17.5" r=".8" fill="#eab308" />
  </g>),
  K: () => (<g>
    <path d="M14 50 L22 50 L21 69 L13 69 Z M26 50 L34 50 L35 69 L27 69 Z" fill="#44403c" />
    <path d="M6 40 L14 42 L13 52 L5 50 Z" fill="#78716c" /><path d="M6 44 L13 45.5 M6 48 L13 49" stroke="#1c1917" strokeWidth="1.2" /><path d="M7 46 L12 47" stroke="#a78bfa" strokeWidth=".8" opacity=".8" />
    <path d="M42 40 L34 42 L35 52 L43 50 Z" fill="#57534e" /><path d="M42 44 L35 45.5 M42 48 L35 49" stroke="#1c1917" strokeWidth="1.2" />
    <path d="M12 24 L36 24 L38 50 L10 50 Z" fill="#78716c" />
    <path d="M12 24 L24 24 L24 50 L10 50 Z" fill="#57534e" />
    <path d="M4 20 L18 16 L20 30 L8 34 Z" fill="#a8a29e" /><path d="M4 20 L11 18 L12 32 L8 34 Z" fill="#78716c" />
    <path d="M44 20 L30 16 L28 30 L40 34 Z" fill="#78716c" />
    <path d="M7 18 L4 10 L12 16 Z M41 18 L44 10 L36 16 Z" fill="#57534e" />
    <path d="M7 24 L14 22 M41 24 L34 22" stroke="#a78bfa" strokeWidth="1" opacity=".8" />
    <path d="M38 22.5 L35 25.5 L37.5 27 L34.5 30" stroke="#ede9fe" strokeWidth="1" fill="none" strokeLinecap="round" />
    <path d="M14 28 L19 30 L17 34 M34 28 L29 30 L31 34" stroke="#a78bfa" strokeWidth="1" fill="none" opacity=".75" />
    <circle cx="24" cy="37" r="5" fill="#1c1917" /><circle cx="24" cy="37" r="3.4" fill="#a78bfa" /><path d="M24 30.5 L24 43.5" stroke="#ede9fe" strokeWidth="1" strokeLinecap="round" /><circle cx="24" cy="37" r="1.4" fill="#ede9fe" /><circle cx="24" cy="37" r="7" fill="#a78bfa" opacity=".18" />
    <path d="M24 30.5 L24 32.5 M24 41.5 L24 43.5 M17.5 37 L19.5 37 M28.5 37 L30.5 37" stroke="#a78bfa" strokeWidth="1" opacity=".8" />
    <path d="M19 4 L18 9 L21 8 Z M29 4 L30 9 L27 8 Z" fill="#44403c" /><path d="M17 8 L31 8 L32 22 L16 22 Z" fill="#78716c" /><path d="M17 8 L24 8 L24 22 L16 22 Z" fill="#57534e" />
    <path d="M18 13 L30 13 L30 16 L18 16 Z" fill="#ede9fe" /><path d="M18 13 L30 13 L30 16 L18 16 Z" fill="#a78bfa" opacity=".5" />
  </g>),
  Z: () => (<g>
    <path d="M41 10 L45 8 L43 34 L40 32 Z" fill="#ef4444" opacity=".22" />
    <path d="M42.5 9 L42 33" stroke="#ef4444" strokeWidth="1" opacity=".6" />
    <path d="M41.5 14 L44 13 M41.2 22 L43.6 21" stroke="#fca5a5" strokeWidth=".6" opacity=".5" />
    <path d="M24 3 Q9 11 12 32 L12 62 L16 58 L20 64 L24 58 L28 64 L32 58 L36 62 L36 32 Q39 11 24 3 Z" fill="#4c1d95" />
    <path d="M24 3 Q9 11 12 32 L12 60 Q16 36 24 26 Z" fill="#2a1247" />
    <path d="M18.5 7 L14 1 L17 2.5 L20 6 Z" fill="#2a1247" /><path d="M29.5 7 L34 1 L31 2.5 L28 6 Z" fill="#1c0b30" /><ellipse cx="24" cy="14" rx="6" ry="7" fill="#0d0512" />
    <circle cx="21.5" cy="13.5" r="1.3" fill="#ef4444" /><circle cx="26.5" cy="13.5" r="1.3" fill="#ef4444" />
    <circle cx="21.5" cy="13.5" r="3.4" fill="#ef4444" opacity=".2" /><circle cx="26.5" cy="13.5" r="3.4" fill="#ef4444" opacity=".2" />
    <circle cx="10" cy="42" r="2.4" fill="#ef4444" opacity=".8" /><circle cx="38" cy="42" r="2.4" fill="#ef4444" opacity=".8" />
    <circle cx="10" cy="42" r="5" fill="#ef4444" opacity=".18" /><circle cx="38" cy="42" r="5" fill="#ef4444" opacity=".18" />
    <circle cx="24" cy="36" r="5" fill="none" stroke="#ef4444" strokeWidth="1.2" opacity=".8" />
    <path d="M24 32 L24 40 M21 34 L27 38 M27 34 L21 38" stroke="#ef4444" strokeWidth="0.9" opacity=".7" />
  </g>),
  L: () => (<g>
    <circle cx="24" cy="14" r="12" fill="none" stroke="#fde047" strokeWidth="1" opacity=".25" />
    <path d="M17 50 L22 50 L21 69 L16 69 Z M26 50 L31 50 L32 69 L27 69 Z" fill="#57534e" />
    <path d="M15 24 Q24 21 33 24 L34 52 L14 52 Z" fill="#a8a29e" />
    <path d="M19 26 L29 26 L29 52 L19 52 Z" fill="#1e3a8a" />
    <circle cx="24" cy="36" r="4" fill="#eab308" /><circle cx="24" cy="36" r="1.6" fill="#fde047" />
    <path d="M24 29.5 L24 31.5 M24 40.5 L24 42.5 M18.5 36 L20.5 36 M27.5 36 L29.5 36 M20 32 L21.4 33.4 M28 32 L26.6 33.4 M20 40 L21.4 38.6 M28 40 L26.6 38.6" stroke="#eab308" strokeWidth="1.2" />
    <path d="M4 28 Q4 24 10 24 L16 26 L16 50 Q10 54 6 48 Z" fill="#78716c" /><path d="M4 28 Q4 24 10 24 L16 26 L15 30 Q9 28 6 32 Z" fill="#eab308" />
    <path d="M38 26 L40 26 L40 62 L38 62 Z" fill="#e2e8f0" /><path d="M35 30 L43 30 L43 33 L35 33 Z" fill="#a16207" />
    <path d="M17 14 Q17 5 24 5 Q31 5 31 14 L30 20 Q24 23 18 20 Z" fill="#a8a29e" />
    <path d="M17 14 Q17 5 24 5 L24 22 Q19 21 18 20 Z" fill="#78716c" />
    <path d="M24 5 L30 9 M24 5 L18 9" stroke="#d6d3d1" strokeWidth=".8" />
    <path d="M17 12 L9 5 L12 10 L8 10 L13 14 Z" fill="#d6d3d1" /><path d="M31 12 L39 5 L36 10 L40 10 L35 14 Z" fill="#a8a29e" />
    <path d="M23.2 5 L24.8 5 L25 13 L23 13 Z" fill="#ca8a04" /><path d="M22.8 5.5 L24 2 L25.2 5.5 Z" fill="#fde047" />
    <path d="M18 13 L30 13 L29 17 L19 17 Z" fill="#1c1502" />
    <path d="M19.5 14.2 L23 14.9 L22.7 16.3 L19.8 15.6 Z" fill="#fde047" /><path d="M28.5 14.2 L25 14.9 L25.3 16.3 L28.2 15.6 Z" fill="#fde047" />
    <circle cx="20.6" cy="14.8" r=".4" fill="#ffffff" /><circle cx="27.4" cy="14.8" r=".4" fill="#ffffff" />
    <path d="M19.5 14 L18 12.6 M28.5 14 L30 12.6" stroke="#fde047" strokeWidth=".8" opacity=".85" />
  </g>),
  O: () => (<g>
    <path d="M38 6 L34 66" stroke="#78350f" strokeWidth="2.2" /><circle cx="38.5" cy="5" r="3.4" fill="#e7e5e4" /><circle cx="37.3" cy="4.5" r="0.8" fill="#0a0d05" /><circle cx="39.8" cy="4.5" r="0.8" fill="#0a0d05" />
    <path d="M10 68 Q8 34 22 26 Q34 24 36 36 L36 68 Z" fill="#1a2e0a" />
    <path d="M10 68 Q8 34 22 26 L24 30 Q14 40 14 68 Z" fill="#101f05" />
    <path d="M12 30 Q6 28 4 22 Q10 22 13 26 Z" fill="#b45309" /><path d="M14 26 Q10 20 12 14 Q16 20 17 24 Z" fill="#f59e0b" />
    <path d="M20 12 Q28 8 32 14 Q35 22 32 30 Q27 36 21 33 Q15 27 16 19 Q17 14 20 12 Z" fill="#e7e5e4" />
    <path d="M20 12 Q24 10 26 10 L24 34 Q18 30 16 22 Q16 15 20 12 Z" fill="#cfc9bd" />
    <path d="M20 19 Q22 17 24 19 Q23 23 20.5 23 Z" fill="#0a0d05" /><path d="M30 19 Q28 17 26 19 Q27 23 29.5 23 Z" fill="#0a0d05" />
    <circle cx="22" cy="20.5" r="0.9" fill="#a3e635" /><circle cx="28" cy="20.5" r="0.9" fill="#a3e635" />
    <path d="M21 28 L29 28 M23 26.5 L23 29.5 M26 26.5 L26 29.5" stroke="#0a0d05" strokeWidth="0.9" />
    <circle cx="8" cy="50" r="1" fill="#a3e635" opacity=".6" />
  </g>),
  D: () => (<g>
    <path d="M12 52 L21 52 L20 69 L11 69 Z M27 52 L36 52 L37 69 L28 69 Z" fill="#5c4425" />
    <path d="M8 26 L40 26 L42 54 L6 54 Z" fill="#8a6a3f" />
    <path d="M8 26 L24 26 L24 54 L6 54 Z" fill="#6b4f2c" />
    <path d="M4 24 L16 26 L16 34 L6 36 Z" fill="#78716c" /><path d="M4 24 L16 26 L15.6 28.4 L5 26.6 Z" fill="#a8a29e" />
    <path d="M44 24 L32 26 L32 34 L42 36 Z" fill="#57534e" /><path d="M44 24 L32 26 L32.4 28.4 L43 26.6 Z" fill="#8f8a80" />
    <path d="M23 28 L25 28 L25 52 L23 52 Z" fill="#f59e0b" opacity=".7" /><circle cx="24" cy="36" r="4" fill="#f59e0b" opacity=".18" />
    <path d="M4 44 Q2 38 6 34 L12 36 Q13 42 10 47 Z" fill="#a67c4a" />
    <path d="M5 36 L4 30 L7 31 L7 36 Z M8.5 35 L8.5 29 L11.5 30.5 L11 36 Z" fill="#a67c4a" />
    <path d="M4.5 31 Q4 29 6.5 28.5 M9 30 Q9 28 11.5 28.8" stroke="#78716c" strokeWidth="1" fill="none" />
    <path d="M5.5 39 L11 40" stroke="#f59e0b" strokeWidth="1" opacity=".85" />
    <path d="M44 44 Q46 38 42 34 L36 36 Q35 42 38 47 Z" fill="#96703f" />
    <path d="M43 36 L44 30 L41 31 L41 36 Z M39.5 35 L39.5 29 L36.5 30.5 L37 36 Z" fill="#96703f" />
    <path d="M42.5 39 L37 40" stroke="#f59e0b" strokeWidth="1" opacity=".85" />
    <path d="M15 15 Q14 5 24 4.5 Q34 5 33 15 L32.5 22 Q28 25 24 25 Q20 25 15.5 22 Z" fill="#a67c4a" /><path d="M15 15 Q14 5 24 4.5 L24 25 Q20 25 15.5 22 Z" fill="#8a6039" />
    <path d="M18 8 Q21 6.5 24 8 M27 7 L29 9 M17 12 L19 14 M31 11 L29.5 13.5" stroke="#7a5c33" strokeWidth=".9" fill="none" />
    <path d="M22.6 8.6 L24 7 L25.4 8.6 L24 10.2 Z" fill="none" stroke="#f59e0b" strokeWidth=".8" />
    <path d="M16.5 11 L31.5 11 L31 14 L17 14 Z" fill="#3d2a12" />
    <path d="M17.5 14.7 L30.5 14.7" stroke="#a67c4a" strokeWidth=".9" />
    <path d="M19 12 L22.4 12 L22.2 13.6 L19.2 13.6 Z" fill="#241505" /><path d="M25.6 12 L29 12 L28.8 13.6 L25.8 13.6 Z" fill="#241505" />
    <circle cx="20.8" cy="12.8" r="2.6" fill="#f59e0b" opacity=".18" /><circle cx="27.2" cy="12.8" r="2.6" fill="#f59e0b" opacity=".18" />
    <path d="M19.8 12.3 L21.8 12.3 L21.7 13.3 L19.9 13.3 Z" fill="#f59e0b" /><path d="M26.2 12.3 L28.2 12.3 L28.1 13.3 L26.3 13.3 Z" fill="#f59e0b" />
    <circle cx="20.6" cy="12.5" r=".35" fill="#fef3c7" /><circle cx="27.4" cy="12.5" r=".35" fill="#fef3c7" />
    <path d="M15 16 L33 16 L32.5 24 Q28 26.5 24 26.5 Q20 26.5 15.5 24 Z" fill="#8a8072" />
    <path d="M15 16 L24 16 L24 26.5 Q20 26.5 15.5 24 Z" fill="#6f675c" />
    <path d="M15.5 16.4 L32.5 16.4" stroke="#a8a29e" strokeWidth=".8" />
    <path d="M16 19 L32 19 M17 22 L31 22" stroke="#57514a" strokeWidth=".9" />
    <circle cx="20" cy="26.4" r="1.1" fill="#8a8072" /><circle cx="24" cy="27" r="1.2" fill="#6b6459" /><circle cx="28" cy="26.4" r="1.1" fill="#8a8072" />
    <circle cx="3" cy="22" r="1.4" fill="#8a6a3f" /><circle cx="45" cy="18" r="1.1" fill="#6b4f2c" />
  </g>),
  Y: () => (<g>
    <path d="M8 26 L8 64" stroke="#26140a" strokeWidth="2.4" strokeLinecap="round" />
    <path d="M8 26 L8 16" stroke="#155e59" strokeWidth="2" strokeLinecap="round" />
    <path d="M8 26 Q4 24 4 17 M8 26 Q12 24 12 17" stroke="#155e59" strokeWidth="1.6" fill="none" />
    <path d="M8 16 L6.8 19 L9.2 19 Z M4 17 L3 20 L5.6 19 Z M12 17 L13 20 L10.4 19 Z" fill="#a5f3fc" />
    <path d="M5 20.5 L3.5 22.5 L6 22 Z" fill="#155e59" />
    <path d="M24 22 Q12 26 10 68 L38 68 Q36 26 24 22 Z" fill="#115e59" />
    <path d="M24 22 Q12 26 10 68 L22 68 Q20 36 24 24 Z" fill="#0b3f3a" />
    <path d="M16 25 Q20 22 24 24 Q28 22 32 25 L30 29 Q24 26 18 29 Z" fill="#ccfbf1" opacity=".9" />
    <path d="M17 8 Q11 12 12 22 Q16 26 20 24 L20 12 Z" fill="#115e59" opacity=".9" />
    <path d="M31 8 Q37 12 36 22 Q32 26 28 24 L28 12 Z" fill="#0d9488" opacity=".9" />
    <path d="M14 14 Q13 19 15 22 M34 14 Q35 19 33 22" stroke="#0b3f3a" strokeWidth="1" fill="none" />
    <circle cx="24" cy="14" r="6.5" fill="#cbd5e1" /><path d="M17.5 14 Q17.5 8 24 7.5 L24 20.5 Q18.5 20 17.5 14 Z" fill="#94a3b8" />
    <path d="M27 6 Q40 8 42 20 Q36 30 30 32 Q37 22 32 12 Q35 20 29 25 Q32 15 26 9 Z" fill="#0d9488" />
    <path d="M29 8 Q38 11 39 19 Q35 14 30 11 Z" fill="#2dd4bf" opacity=".8" />
    <path d="M20.5 13.5 L23.5 12.8 L22.8 15.5 Z" fill="#5eead4" /><path d="M27.5 13.5 L24.5 12.8 L25.2 15.5 Z" fill="#5eead4" />
    <path d="M17.5 14 L13.5 12.5 L16.5 17 Z" fill="#2dd4bf" opacity=".9" /><path d="M30.5 14 L34.5 12.5 L31.5 17 Z" fill="#0d9488" opacity=".9" />
    <path d="M21 17.5 Q24 19.5 27 17.5 L26.5 18.7 Q24 20.1 21.5 18.7 Z" fill="#04211c" />
    <path d="M22 17.8 L22.6 19.4 L23.2 17.9 Z M24.8 17.9 L25.4 19.4 L26 17.8 Z" fill="#f0fdfa" />
    <path d="M8 62 Q18 56 30 62 Q38 66 42 62 Q40 70 30 68 Q18 66 8 70 Z" fill="#2dd4bf" opacity=".4" />
    <circle cx="12" cy="44" r="2.6" fill="none" stroke="#5eead4" strokeWidth="1" opacity=".7" /><circle cx="12" cy="44" r="0.9" fill="#5eead4" />
  </g>),
  W: () => (<g>
    <path d="M9 18 Q3 30 6 40 Q3 50 9 62" fill="none" stroke="#92400e" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M9 18 Q5 30 7.5 40 Q5 50 9 62" fill="none" stroke="#5b2c0b" strokeWidth=".8" opacity=".7" />
    <path d="M9 18 L9 62" stroke="#f5f5f4" strokeWidth="0.6" opacity=".85" />
    <path d="M8 39 L11 39 L11 41 L8 41 Z" fill="#3a2408" />
    <path d="M19 52 L23 52 L22 66 L18.5 66 Z M25 52 L29 52 L29.5 66 L26 66 Z" fill="#0f4a24" />
    <path d="M17.5 65 L22.5 65 L23 70 L16.5 70 Z M25.5 65 L30.5 65 L31.5 70 L25 70 Z" fill="#241505" />
    <path d="M24 8 Q15 13 15.5 27 L16 52 Q24 55 32 52 L32.5 27 Q33 13 24 8 Z" fill="#14532d" />
    <path d="M24 8 Q15 13 15.5 27 L16 50 Q18.5 32 24 24 Z" fill="#0c3018" />
    <path d="M20 54 L21 50 M27 54 L26 50" stroke="#0c3018" strokeWidth="1" />
    <path d="M16 22 L5 15 L9 22 L3 22 L9 26 L5 30 L12 27 Z" fill="#3a2408" />
    <path d="M15 25 L8 24 L12 28 L8 31 L14 29 Z" fill="#7c2d12" />
    <path d="M16 22 L11 18 L13 23 Z" fill="#241505" />
    <path d="M32 22 L43 15 L39 22 L45 22 L39 26 L43 30 L36 27 Z" fill="#241505" />
    <path d="M33 25 L40 24 L36 28 L40 31 L34 29 Z" fill="#7c2d12" />
    <path d="M32 22 L37 18 L35 23 Z" fill="#2e1c06" />
    <path d="M17 24 Q24 20.5 31 24 L30.4 28 Q24 25 17.6 28 Z" fill="#3a2408" />
    <path d="M19.5 24.6 L19.8 26.8 M23 23.8 L23.1 26 M26.5 24 L26.4 26.2 M29.3 24.8 L29 27" stroke="#d9cfba" strokeWidth=".7" opacity=".85" />
    <path d="M24 3.5 Q16.5 6 15.5 15 Q15 20 17.5 23 Q17 15 24 12 Q31 15 30.5 23 Q33 20 32.5 15 Q31.5 6 24 3.5 Z" fill="#241505" />
    <path d="M24 3.5 Q16.5 6 15.5 15 Q15 20 17.5 23 Q17 14 24 11 Z" fill="#180d03" />
    <path d="M24 1.5 L21 6 L27 6 Z" fill="#241505" />
    <path d="M16.5 16 L12 13.5 L16 19 Z" fill="#d1a374" /><path d="M31.5 16 L36 13.5 L32 19 Z" fill="#c08d5c" />
    <path d="M18.5 12.5 Q24 9.5 29.5 12.5 L28.6 21 Q26.5 24.5 24 24.5 Q21.5 24.5 19.4 21 Z" fill="#d1a374" />
    <path d="M18.8 13.5 Q24 11 29.2 13.5 L28.9 16 Q24 14 19.1 16 Z" fill="#3d2410" />
    <path d="M20.6 17.6 L23.4 16.9 L22.6 19.6 Z" fill="#4ade80" /><path d="M27.4 17.6 L24.6 16.9 L25.4 19.6 Z" fill="#4ade80" />
    <path d="M20.4 16.4 L22.6 15.9 M27.6 16.4 L25.4 15.9" stroke="#3d2410" strokeWidth=".7" />
    <path d="M22.6 22.3 L25.4 22.3" stroke="#8a5a30" strokeWidth=".7" />
    <path d="M17 26 L33.5 41" stroke="#3a2408" strokeWidth="1.4" />
    <path d="M31.5 39 L37.5 39.8 L36.8 52 L31.6 51.4 Z" fill="#78350f" /><path d="M32.5 37.5 L34 33.5 M34.6 37.8 L36.4 34 M36.6 38.3 L38.4 35" stroke="#b45309" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M32.7 39.3 L34.4 34.6 M36 38.9 L37.6 35.3" stroke="#e7dfcf" strokeWidth=".5" opacity=".8" />
    <path d="M16 30 Q11 32 10 38" fill="none" stroke="#14532d" strokeWidth="3" strokeLinecap="round" />
    <path d="M8.6 37 L12.4 36.4 L13 40.6 L9.2 41.2 Z" fill="#3a2408" /><path d="M9.4 38.4 L12.4 38 M9.6 39.8 L12.6 39.4" stroke="#7c2d12" strokeWidth=".6" />
  </g>),
  X: () => (<g>
    <path d="M38 6 L34 30" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" /><path d="M38 6 L41 3" stroke="#e2e8f0" strokeWidth="2" />
    <path d="M17 50 L22 50 L21 69 L16 69 Z M26 50 L31 50 L32 69 L27 69 Z" fill="#141d2b" />
    <path d="M15 24 Q24 21 33 24 L34 50 Q24 53 14 50 Z" fill="#1e293b" />
    <path d="M15 24 L24 22 L24 52 Q18 51 14 50 Z" fill="#141d2b" />
    <path d="M12 26 L20 24 L21 32 L13 34 Z" fill="#334155" /><path d="M36 26 L28 24 L27 32 L35 34 Z" fill="#293548" />
    <path d="M13 27 L19 25 M14 31 L20 29" stroke="#94a3b8" strokeWidth="0.8" opacity=".8" />
    <path d="M18 22 Q24 27 30 22 Q31 26 27 28 Q24 30 21 28 Q17 26 18 22 Z" fill="#b91c1c" />
    <path d="M29 26 Q35 30 34 38 L31 35 Q32 30 28 28 Z" fill="#7f1d1d" />
    <path d="M42 60 L30 36" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" /><path d="M42 60 L45 64" stroke="#475569" strokeWidth="2.4" />
    <path d="M17 9 Q17 4 24 4 Q31 4 31 9 L31 15 L17 15 Z" fill="#94a3b8" /><path d="M17 9 Q17 4 24 4 L24 15 L17 15 Z" fill="#64748b" />
    <path d="M23 5 L25 5 L25 17 L23 17 Z" fill="#475569" />
    <path d="M17 12 L22 12 L22 15 L17 15 Z M26 12 L31 12 L31 15 L26 15 Z" fill="#0b0f16" />
    <circle cx="19.5" cy="13.5" r="0.8" fill="#e2e8f0" /><circle cx="28.5" cy="13.5" r="0.8" fill="#e2e8f0" />
    <path d="M18 17 Q24 20 30 17 L29 21 Q24 23 19 21 Z" fill="#cfae83" />
  </g>),
};
function VecFig({ fk, size = 56, flip }) {
  const h = (size * 72) / 48;
  const fl = flip ? "scaleX(-1)" : "scaleX(1)";
  return (
    <span className={REDUCED ? "" : "vfig"} style={{ display: "inline-block", width: size, height: h, transform: REDUCED ? fl : undefined, "--fl": fl }}>
      <svg viewBox="0 0 48 72" width={size} height={h}>{FIGS[fk]()}</svg>
    </span>
  );
}
if (typeof console !== "undefined") Object.values(FIGHTERS).forEach((F) => {
  if (!F.pool.some((id) => ABILITIES[id].cost === 0)) console.warn(`DESIGN INVARIANT BROKEN: ${F.name} has no 0◆ ability in pool`);
  if (!F.aiLoad.some((id) => ABILITIES[id].cost === 0)) console.warn(`AI DEADLOCK RISK: ${F.name} aiLoad has no 0◆ ability`);
});
const GENERIC_R1 = {
  move: "Four quadrants; you both move at the same time, in secret. Tap a quadrant — or your own to hold. They're aiming where you STAND: move.",
  action: "The triangle rules everything: BREAK shatters Ward · WARD catches Rush · RUSH interrupts Break — the winner resolves at +1. ◆ builds each round you don't spend.",
  target: "Aim where they WILL be, not where they are. Right read: direct hit. Wrong read: nothing.",
  confirm: "Lock it in — both plans resolve at once.",
};
const TUTS = {
  G: { foe: "C", pass: "pact", rails: [
    { you: { move: "T", ab: "skull", tgt: "F" }, foe: { ab: "cinder", move: "H", tgt: "Y" }, say: "THE BASICS: each round you both plan in SECRET, then everything resolves at once. A plan is a MOVE (hold your square, or step to a lit neighbor) plus an ABILITY aimed at a TARGET. And know this: attacks strike SQUARES, not people \u2014 she's jabbing the square you're LEAVING, so it will WHIFF. Step toward her, aim Skullsplitter where she stands. This lesson runs at your pace: read, then tap \u25b6." },
    { you: { move: "H", ab: "iron", tgt: null }, foe: { ab: "cinder", move: "H", tgt: "Y" }, say: "THE TRIANGLE: every ability is a RUSH, a BREAK, or a WARD. Break beats Ward. Ward catches Rush. Rush outruns Break. She lunges with a RUSH \u2014 raise IRON HIDE and CATCH it: her strike dies on your guard and the counter answers. (Trading rushes was the other road \u2014 the story locks the clean catch.)" },
    { clash: true, you: { ab: "skull" }, foe: { ab: "smoke" }, say: "CLASH: rounds 3, 7 and 10 lock all movement \u2014 pure triangle, winning type takes the exchange. (Your PACT passive just took 1 blood from each of you at the bell \u2014 power has prices.) She wards; BREAK beats WARD. And winning does more than hurt: it fires your ability's ADVANTAGE rider \u2014 that bonus line printed under every button. The triangle isn't pride. It's pay." },
    { you: { move: "A", ab: "harvest", tgt: "F" }, foe: { ab: "smoke", move: "H", tgt: null }, say: "POWER \u25c6: you earn 1\u25c6 every round, bank up to 3 \u2014 costs sit on the buttons, and the story fills your bank. Watch the ARENA work: you MOVE and SWING in one plan \u2014 stride to a NEW corner while RED HARVEST crosses the whole board (aim is square-to-square; distance is no shield). It spends all 3\u25c6 and ends in a SHOVE: the winner steers the loser, Harvest ANYWHERE \u2014 the script drags her across the arena to your new feet. (Those glowing relics? Side prizes \u2014 end a round on one to claim it.)" },
    { you: { move: "H", ab: "howl", tgt: "F" }, foe: { ab: "cinder", move: "H", tgt: "Y" }, say: "COLLISION: she's standing in YOUR square now \u2014 and sharing a square (or swapping squares mid-charge) means NO dodge: both attacks AUTO-CONNECT, a forced trade. Aim doesn't matter at point-blank. Hold your ground and let it happen \u2014 seek collisions when you want the trade, flee them when you don't." },
    { you: { move: "A", ab: "howl", tgt: "F" }, foe: { ab: "magma", move: "T", tgt: "Y" }, say: "Stepping OFF shared ground ends the forced trade \u2014 you cut to a THIRD corner as she leaps to a fourth, swinging at the square you LEFT: air. Look at the board \u2014 four quadrants, two guesses, every round. Cheap rounds rebuild the bank: Howl costs 0\u25c6 and still crosses the arena. Spend big, rebuild, spend again." },
    { clash: true, you: { ab: "skull" }, foe: { ab: "smoke" }, say: "SECOND CLASH \u2014 she wards again, old habits. Break it, and this time notice the real prize: the clash WINNER PLACES BOTH FIGHTERS. Damage fades; position compounds. Put her exactly where you want her." },
    { you: { move: "T", ab: "sunder", tgt: "F", sp: "A" }, foe: { ab: "smoke", move: "H", tgt: null }, say: "HOW GAMES END: 10 rounds. Drop your rival to 0 HP and it ends early; otherwise the higher HP at the final bell wins. CLOSE THE DISTANCE one last time \u2014 Bone Grinder shatters her guard and splashes a neighbor square. That's the whole game: plan in secret, hit squares not hopes, respect the triangle, spend your \u25c6, claim the ground that pays, own the collisions, survive the clashes." },
  ]},
  M: { foe: "G", pass: "tithe", rails: [
    { you: { move: "T", ab: "viper", tgt: "F" }, foe: { ab: "skull", move: "H", tgt: "Y" }, say: "The orc swings where you WERE — step toward him and plant Viper Fang. Poison sticks on ANY contact; the third stack RUPTURES for 3, free." },
    { you: { move: "H", ab: "viper", tgt: "F" }, foe: { ab: "skull", move: "H", tgt: "Y" }, say: "He swings the heavy blade \u2014 you are FASTER: Viper Fang outruns the Break, and the VENOM rides the cut. First Poison stack placed. (Warding his swing was the careful road; speed is yours.)" },
    { clash: true, you: { ab: "viper" }, foe: { ab: "skull" }, say: "CLASH. your RUSH outruns his Break — his whole swing is ERASED and yours lands. That is the law: the loser loses EVERYTHING. Craven Shadow could slip a clash for 2◆; today, take the lesson on the chin." },
    { you: { move: "T", ab: "heart", tgt: "F" }, foe: { ab: "iron", move: "H", tgt: null }, say: "3◆ and he carries venom: HEARTSEEKER — a BREAK that cannot whiff a poisoned target. He hides behind Iron… and the blade turns in the air, shatters the guard, and detonates every stack at double. Your entire fantasy in one cast." },
    { you: { move: "T", ab: "viper", tgt: "F" }, foe: { ab: "howl", move: "T", tgt: "N" }, say: "He read your step — you'll trade. Trades still plant Poison, and Blood Tithe grew your max HP on that detonation. You profit from every exchange, even the fair ones." },
    { you: { move: "H", ab: "twin", tgt: "F", sec: "O" }, foe: { ab: "skull", move: "H", tgt: "Y" }, say: "THREE FANGS: two blades, two squares, and a third dagger sticks Poisoned ground into a square you didn't hit. Three-quarters of the arena now belongs to the venom. Class dismissed." },
  ]},
  V: { foe: "C", pass: "shatter", rails: [
    { you: { move: "T", ab: "lance", tgt: "F" }, foe: { ab: "cinder", move: "H", tgt: "Y" }, say: "She jabs your old square; you step out and lance her. Ice Lance CHILLS on any contact — the next Break to land SHATTERS the chill for bonus damage." },
    { you: { move: "H", ab: "hoar", tgt: null }, foe: { ab: "cinder", move: "T", tgt: "N" }, say: "She's diving your square — meet her in stance. Hoarfrost catches her Rush AND freezes the floor under you. Frost Chills anyone ending a round on it: the ground is your re-chiller." },
    { clash: true, you: { ab: "spike" }, foe: { ab: "smoke" }, say: "CLASH — she's Chilled. GLACIAL SPIKE: Break beats her Ward, and the SHATTER pays +2 with Shatterpoint. Winning a clash places BOTH fighters — the script keeps you on your frost and puts HER on it too: the ground will re-chill her while she stands there." },
    { you: { move: "H", ab: "aval", tgt: "F", sec: "O" }, foe: { ab: "magma", move: "H", tgt: "Y" }, say: "3◆: AVALANCHE — two quadrants of your choice, +1 per Frost on the board on Advantage. It's a RUSH now: her ward would catch it... she's guarding! Watch the catch, learn the ultimate read." },
    { you: { move: "T", ab: "lance", tgt: "F" }, foe: { ab: "cinder", move: "H", tgt: "Y" }, say: "Re-chill and rebuild. Permafrost means your frost never melts on its own — only her Pyre burns it away. Herd her onto your ground with shoves whenever you win." },
    { you: { move: "H", ab: "spike", tgt: "F" }, foe: { ab: "smoke", move: "H", tgt: null }, say: "She shells up; you Spike straight through the guard. If the frost re-chilled her, this shatters again — the loop closes: frost chills, Spike cashes, forever." },
  ]},
  C: { foe: "G", pass: "heatrise", rails: [
    { you: { move: "T", ab: "cinder", tgt: "F" }, foe: { ab: "skull", move: "H", tgt: "Y" }, say: "Step out of his swing and tag him. Burn sticks on ANY contact — each stack ticks 1 at round's end, and Heat Rising pays YOU ◆ while he burns." },
    { you: { move: "H", ab: "magma", tgt: "F" }, foe: { ab: "iron", move: "H", tgt: null }, say: "He's armoring up in Iron Hide. Magma is a BREAK: it shatters straight through the guard for full damage, Advantage, and another Burn. Never Rush a ward; always Break one." },
    { clash: true, you: { ab: "cinder" }, foe: { ab: "skull" }, say: "CLASH. His Break beats your Rush — but a TRADE would still burn him, and engines want ties. Today: eat it, count the stacks, keep the fire fed." },
    { you: { move: "H", ab: "pyre", tgt: "F" }, foe: { ab: "skull", move: "H", tgt: "Y" }, say: "3◆: PYRE OF THE PIT — 2 damage to three quadrants, everything hit becomes Scorched, and it BURNS AWAY any other terrain. Your nuke and your zoner-answer in one cast." },
    { you: { move: "T", ab: "cinder", tgt: "F" }, foe: { ab: "howl", move: "T", tgt: "N" }, say: "He read you — a trade. Fine: trades apply Burn, and he's standing on your Scorched ground now, gaining stacks just by existing." },
    { you: { move: "H", ab: "comb", tgt: "F" }, foe: { ab: "skull", move: "H", tgt: "Y" }, say: "Stacks banked? COMBUSTION: 2 base +2 per stack detonated at DOUBLE — consumed stacks never tick, they explode. That's your kill math. Burn everything." },
  ]},
  K: { foe: "G", pass: "nova", rails: [
    { you: { move: "T", ab: "flux", tgt: "F" }, foe: { ab: "skull", move: "H", tgt: "Y" }, say: "Step and jab. Your whole duel is one number: FULL CHARGE. At 3◆ you take −1 from everything and your next paid ability hits +1." },
    { you: { move: "H", ab: "cannon", tgt: "F" }, foe: { ab: "iron", move: "H", tgt: null }, say: "He wards; Cannonarm is a Break — through the guard, full damage, Advantage. Keep banking: you're building to full." },
    { clash: true, you: { ab: "cannon" }, foe: { ab: "iron" }, say: "CLASH at full charge — you're armored (−1) and your Break shatters his Iron and trades with his. But careful: rounds ENDED at full stack OVERCHARGE, and it cuts YOU on your next paid swing. Rhythm, not hoarding." },
    { you: { move: "H", ab: "core", tgt: "F" }, foe: { ab: "skull", move: "H", tgt: "Y" }, say: "OVERLOAD CORE from full: 4 base +1 powered. And you're at 0◆ now — DISCHARGE NOVA blasts your own square: if he shares it, he eats 1 more; zones scour; companions stun. Everything, all at once, then nothing." },
    { you: { move: "T", ab: "flux", tgt: "F" }, foe: { ab: "howl", move: "T", tgt: "N" }, say: "Empty and unarmored — this is your weak window. Jab, rebuild, survive. Emergency Vent will refuel you once at ≤5 HP if it goes wrong." },
    { you: { move: "H", ab: "cannon", tgt: "F" }, foe: { ab: "skull", move: "H", tgt: "Y" }, say: "Climbing back toward full. That's the whole machine: reach 3, strike FROM 3, never sit ON 3. Recharge complete." },
  ]},
  Z: { foe: "L", pass: "surplus", rails: [
    { you: { move: "T", ab: "ruin", tgt: "F" }, foe: { ab: "censure", move: "H", tgt: "Y" }, say: "RUINFIRE: 2 damage for 1 HP at zero ◆ — the best floor in the game, paid in blood. Step out of his Censure and collect." },
    { you: { move: "H", ab: "tap", tgt: null }, foe: { ab: "oath", move: "H", tgt: null }, say: "Both of you in stance. LIFE TAP: 1 HP becomes 1◆ — and Blood Surplus doubles it to 2◆. Your healthbar is a wallet; spend like you mean it." },
    { clash: true, you: { ab: "ruin" }, foe: { ab: "oath" }, say: "CLASH — He plants behind the Oath \u2014 RUIN cracks it open. (Break-into-Break was the bloodier road; sometimes right, not today.) You both land. His Light disapproves; your pact doesn't care." },
    { you: { move: "H", ab: "dark", tgt: "F" }, foe: { ab: "aegis", move: "H", tgt: null }, say: "3◆: DEVOURING DARK — 2 damage and heal 2. What it eats, you keep. Against a paladin who heals through sieges, stolen life is the only life that counts." },
    { you: { move: "T", ab: "chains", tgt: "F" }, foe: { ab: "censure", move: "H", tgt: "Y" }, say: "Umbral Chains WEAKEN him — his hits deal −1 next round. Buying your blood back in damage never taken is still profit." },
    { you: { move: "H", ab: "pact", tgt: "F" }, foe: { ab: "oath", move: "H", tgt: null }, say: "OBLIVION PACT: 2◆ + 2 HP = 4 damage — through his ward for Advantage, 5 total. The biggest hit in the game. You paid everything for it. Worth it." },
  ]},
  L: { foe: "Z", pass: "vigil", rails: [
    { you: { move: "T", ab: "llance", tgt: "F" }, foe: { ab: "ruin", move: "H", tgt: "Y" }, say: "He burns his own blood to swing at your old square. Step out, lance him, and remember: you don't chase — you HOLD." },
    { you: { move: "R", ab: "oath", tgt: null }, foe: { ab: "ruin", move: "H", tgt: "Y" }, say: "A RELIC has manifested — Pilgrim's Stride already stepped you toward it. Stand ON it at round's end to claim: three claims wins outright. Oath up and plant." },
    { clash: true, you: { ab: "censure" }, foe: { ab: "tap" }, say: "CLASH — He hides behind the Tap \u2014 CENSURE breaks it, and its rider's Advantage denies his ◆ when it wins. The Light disapproves of a warlock's economy." },
    { you: { move: "H", ab: "dawn", tgt: "F" }, foe: { ab: "tap", move: "H", tgt: null }, say: "3◆: DAWNHAMMER — 3 damage, and if you swing it from Sanctuary it heals you 2. Sunrise, administered directly." },
    { you: { move: "H", ab: "consec", tgt: "F" }, foe: { ab: "ruin", move: "T", tgt: "N" }, say: "CONSECRATE his square: the Sanctuary heals YOU 1 and SEARS him 1 every round he stands there. Your Lightlance hits +1 on it. Make the arena holy; make trespass expensive." },
    { you: { move: "H", ab: "aegis", tgt: null }, foe: { ab: "chains", move: "H", tgt: "N" }, say: "AEGIS on the contested relic: heal, anchor \u2014 he lunges and the ward CATCHES him cold; the riposte answers and the Vigil holds the claim. (Stepping off was the safe road. Vigils don't take it.)" },
  ]},
  O: { foe: "L", pass: "juju", rails: [
    { you: { move: "T", ab: "stick", tgt: "F" }, foe: { ab: "censure", move: "H", tgt: "Y" }, say: "Pinstick on any contact plants a CURSE. Curses sleep until Round 8 — then 1 per 3 stacks, every round, forever. Lend the misfortune now." },
    { you: { move: "H", ab: "knit", tgt: null }, foe: { ab: "llance", move: "T", tgt: "N" }, say: "He dives — WITCH BREW catches the Rush: riposte 1, heal 1, and the riposte carries another Curse. Something's floating in it. It's looking at him." },
    { clash: true, you: { ab: "stick" }, foe: { ab: "censure" }, say: "CLASH — his Break beats your Rush. Take the hit; the doll already has his name. You aren't losing. You're compounding." },
    { you: { move: "H", ab: "sorrow", tgt: "F" }, foe: { ab: "censure", move: "H", tgt: "Y" }, say: "3◆: HARVEST OF SORROWS — 2 damage, +1 per 3 Curse, and it DOESN'T consume them. An early withdrawal; the account keeps earning." },
    { you: { move: "H", ab: "mireA", tgt: "F" }, foe: { ab: "censure", move: "H", tgt: "Y" }, say: "SORROW MIRE under him: every round he stands there, another Curse. Bad Juju means at 3+ he CANNOT heal — and denied heals feed the dolls." },
    { you: { move: "H", ab: "eye", tgt: "F" }, foe: { ab: "oath", move: "H", tgt: null }, say: "SHRUNKEN HEAD: 1 damage, he hits −1 next round, and another Curse. Round 8 approaches. The interest comes due, child." },
  ]},
  D: { foe: "C", pass: "home", rails: [
    { you: { move: "T", ab: "grind", tgt: "F" }, foe: { ab: "cinder", move: "H", tgt: "Y" }, say: "CONTINENTAL GRIND is free: land the read and the prompt offers ground — the script takes the first tile. Every conversion is an earned read: no hit, no pave. Step and take ground." },
    { you: { move: "H", ab: "claim", tgt: null }, foe: { ab: "cinder", move: "T", tgt: "N" }, say: "BEDROCK CLAIM: your square becomes Dominion, guaranteed. She's diving you — the ward catches her Rush too. On your stone, your ◆ income never resets." },
    { clash: true, you: { ab: "quake" }, foe: { ab: "smoke" }, say: "CLASH — QUAKE FIST: Break beats her Ward, and it shatters any non-Dominion terrain where it lands. Win and place yourself on YOUR tile." },
    { you: { move: "H", ab: "mount", tgt: "F" }, foe: { ab: "smoke", move: "H", tgt: null }, say: "3◆: MOUNTAINFALL — 3 damage, +1 if she stands on your ground, and the Advantage converts her square. Her ward will catch nothing: it's a BREAK. The mountain rules." },
    { you: { move: "T", ab: "grind", tgt: "F" }, foe: { ab: "pyre", move: "H", tgt: "Y" }, say: "SHE BURNED YOUR TILES — Pyre is the anti-Dominion answer. Repave behind her. All four tiles = THE ARENA KNEELS, and she gets ONE round to break the hold." },
    { you: { move: "H", ab: "claim", tgt: null }, foe: { ab: "cinder", move: "T", tgt: "N" }, say: "Claim again. Count your tiles, count her Breaks, seal before Round 10. You don't fight for the arena. You replace it." },
  ]},
  Y: { foe: "W", pass: "rider", rails: [
    { you: { move: "T", ab: "lash", tgt: "F" }, foe: { ab: "broad", move: "H", tgt: "Y" }, say: "Her arrow wants the square you're leaving. Step, lash, and start thinking in WATER: your damage will come from the ground, not the swing." },
    { you: { move: "H", ab: "whirlA", tgt: null }, foe: { ab: "broad", move: "T", tgt: "N" }, say: "We HOLD and ward: she's diving your square, and WHIRLPOOL catches the Rush. Then the scripted call: the vortex opens UNDER HER — it yanks adjacent foes in as it opens and grinds 1 every round she stays. The catch is the lesson; the water is the sentence." },
    { clash: true, you: { ab: "lash" }, foe: { ab: "pin" }, say: "CLASH — her Break beats your Rush; the pin will Root you. Feel it once. Rooted fighters can't move — but knockbacks still move them. Remember that." },
    { you: { move: "H", ab: "storm", tgt: "F" }, foe: { ab: "broad", move: "H", tgt: "Y" }, say: "3◆: MAELSTROM — TWO vortexes open beside her, each yanking, each grinding. And Wave Rider means YOUR movement can surf to any of your water. She wades; you ride." },
    { you: { move: "H", ab: "bwater", tgt: "F" }, foe: { ab: "hawk", move: "H", tgt: null }, say: "CRUSHING WAVE leaves SURF: end a round in it — take 1 and get THROWN out. Two waters, opposite physics: the trap that holds, the surf that expels." },
    { you: { move: "T", ab: "lash", tgt: "F" }, foe: { ab: "broad", move: "T", tgt: "N" }, say: "Ebb & Flow: any round your water drew blood, the tide hands you Flow (+1 next hit). The arena collects rent. You collect the arena." },
  ]},
  W: { foe: "Y", pass: "deadeye", rails: [
    { you: { move: "T", ab: "broad", tgt: "F" }, foe: { ab: "lash", move: "H", tgt: "Y" }, say: "She lashes your old square. Step out, loose a Broadhead. Your whole kit is INFORMATION: know where they'll be, and the arrow does the rest." },
    { you: { move: "H", ab: "hawk", tgt: null }, foe: { ab: "lash", move: "T", tgt: "N" }, say: "We HOLD this round — on purpose: she's diving at your square, and a ward wants exactly that. HAWK'S EYE catches her Rush — riposte answers, Advantage sharpens it. And know the law: KESS IS THE MARKER — end a round in the hawk's square and you are Marked. Kess wings one square over (ADJACENT only, a real bird): park her where the hydromancer will stand. Your shove HOLDS her. Bait, catch, herd." },
    { clash: true, you: { ab: "pin" }, foe: { ab: "current" }, say: "CLASH — PINNING SHOT: Break beats her Ward, and the pin ROOTS her. A rooted target can't move: next round you KNOW her square. The pin manufactures the read." },
    { you: { move: "R", ab: "sky", tgt: "F" }, foe: { ab: "current", move: "H", tgt: null }, say: "3\u25c6: SKYFALL VOLLEY \u2014 a BREAK: 2 dmg where you AIM, and Kess TAKES WING (adjacent). Then for TWO rounds the sky keeps falling on a RANDOM square \u2014 2 dmg and a MARK when it finds her. Two mark symbols happen only when the volley catches her IN Kess's square. She wards \u2014 the Break shatters through. Let the dice hunt." },
    { you: { move: "H", ab: "broad", tgt: "F" }, foe: { ab: "lash", move: "H", tgt: "Y" }, say: "If the sky found her she's Marked; either way you're on the DIAGONAL: Deadeye +1, Mark +1 — a 3-damage free action. Geometry is your damage." },
    { you: { move: "T", ab: "pin", tgt: "F" }, foe: { ab: "whirlA", move: "H", tgt: null }, say: "She shells up in the current \u2014 doesn't matter: Pin the square, Kess marks the flight, and the next arrow cannot miss. Read, pin, finish. Kess watches. You finish." },
  ]},
  X: { foe: "G", pass: "pedge", rails: [
    { you: { move: "T", ab: "cres", tgt: "F" }, pv: "keep", foe: { ab: "skull", move: "H", tgt: "Y" }, say: "CRESCENT CUT — and here's your secret: after the reveal, you may PIVOT it to a Break for 1◆. KEEP it this time: your Rush already interrupts his Break, and he's swinging at empty air anyway." },
    { you: { move: "H", ab: "riposte", tgt: null }, foe: { ab: "howl", move: "T", tgt: "N" }, say: "RIPOSTE DRAW: you gain FLOW whether or not anything comes — and his Rush just came. Caught. Flow makes your next strike +1... Perfect Edge makes it +2." },
    { clash: true, you: { ab: "chainX" }, pv: "pivot", foe: { ab: "skull" }, say: "CLASH — ARSENAL CHAIN into his Skullsplitter: Break against Break is a bloody tie. Now the secret weapon: PIVOT to Rush for 1◆ — Rush interrupts Break, and the tie becomes YOUR win. This is why he can never trust your reveal." },
    { you: { move: "H", ab: "arsenal", tgt: "F" }, foe: { ab: "skull", move: "H", tgt: "Y" }, say: "3\u25c6: FULL ARSENAL \u2014 all nine edges, in order of grievance. It's a RUSH: a raised ward would catch all nine (respect that, always). He swings a Break instead \u2014 nine edges outrun one. (Advantage: the tenth edge.)" },
    { you: { move: "T", ab: "cres", tgt: "F" }, foe: { ab: "skull", move: "H", tgt: "Y" }, say: "Steel Tempo would pay you ◆ when broken; Momentum banks Flow on Advantages. Every outcome feeds the rhythm — you don't gamble, you underwrite." },
    { you: { move: "H", ab: "cadence", tgt: "F" }, foe: { ab: "howl", move: "T", tgt: "N" }, say: "BLADE CADENCE: 2 damage, spends the old Flow in, banks a new one. The rhythm never resolves. That's the point. That's the fighter." },
  ]},
};
const TYPE_ORDER_BY_CLASS = { Ravager: ["rush", "break", "ward"], Duelist: ["rush", "ward", "break"], Champion: ["break", "ward", "rush"], Shaper: ["rush", "ward", "break"] };
function poolSorted(fk, ids) {
  const cls = (FIGHTERS[fk]?.sub || "").split("·")[1]?.trim() || "Ravager";
  const ord = TYPE_ORDER_BY_CLASS[cls] || TYPE_ORDER_BY_CLASS.Ravager;
  return [...ids].sort((x, y) => {
    const a = ABILITIES[typeof x === "string" ? x : x.id], b = ABILITIES[typeof y === "string" ? y : y.id];
    return a.cost - b.cost || ord.indexOf(a.type) - ord.indexOf(b.type) || a.name.localeCompare(b.name);
  });
}
function RelicGrail({ size = 24 }) {
  return (
    <svg viewBox="0 0 20 24" width={size} height={(size * 24) / 20}>
      <path d="M10 1 L10 5 M6 2 L8 5.2 M14 2 L12 5.2 M3.5 4 L7 6.5 M16.5 4 L13 6.5" stroke="#fde047" strokeWidth="1" strokeLinecap="round" opacity=".85" />
      <circle cx="10" cy="9" r="7.5" fill="#fde047" opacity=".12" />
      <path d="M4 7 Q4 13 8 14.5 L12 14.5 Q16 13 16 7 Z" fill="#eab308" />
      <path d="M4 7 Q4 13 8 14.5 L10 14.5 L10 7 Z" fill="#a16207" />
      <path d="M3.6 6.4 H16.4 L16 8 H4 Z" fill="#fde047" />
      <circle cx="10" cy="10.5" r="1.3" fill="#b91c1c" /><circle cx="9.6" cy="10.1" r="0.4" fill="#fca5a5" />
      <path d="M9 14.5 L8.6 19 L11.4 19 L11 14.5 Z" fill="#eab308" /><path d="M9 14.5 L8.6 19 L10 19 L10 14.5 Z" fill="#a16207" />
      <path d="M6 20.5 Q6 19 8.6 19 L11.4 19 Q14 19 14 20.5 L14 21.5 Q10 22.6 6 21.5 Z" fill="#eab308" />
      <path d="M6 20.5 Q6 19 8.6 19 L10 19 L10 22 Q7.5 22 6 21.5 Z" fill="#a16207" />
      <path d="M6.2 21.8 Q10 22.8 13.8 21.8" stroke="#fde047" strokeWidth=".8" fill="none" />
      <circle cx="17.5" cy="5" r="0.7" fill="#fef9c3" /><circle cx="2.8" cy="8" r="0.6" fill="#fde047" />
    </svg>
  );
}
function CurseDoll({ size = 13 }) {
  return (
    <svg viewBox="0 0 16 20" width={size} height={(size * 20) / 16} style={{ verticalAlign: "-3px" }}>
      <ellipse cx="8" cy="10" rx="7.5" ry="9" fill="#e879f9" opacity=".14" />
      <path d="M5.5 8.5 L2.2 10.5" stroke="#8a5a1d" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M10.5 8.5 L13.8 10.5" stroke="#b45309" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M6.5 14 L6 18.5 M9.5 14 L10 18.5" stroke="#8a5a1d" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M5.5 7 Q8 6 10.5 7 L11 13 Q9.5 14.4 8 14.4 Q6.5 14.4 5 13 Z" fill="#b45309" />
      <path d="M5.5 7 L8 6.6 L8 14.4 Q6.5 14.4 5 13 Z" fill="#8a5a1d" />
      <circle cx="8" cy="4" r="3" fill="#b45309" />
      <path d="M5 4 Q5 1 8 1 L8 7 Q5.5 6.6 5 4 Z" fill="#8a5a1d" />
      <path d="M8 7 L8 13.6" stroke="#2a1607" strokeWidth=".8" strokeDasharray="1.1 .9" />
      <path d="M6.4 3 L7.4 4 M7.4 3 L6.4 4 M8.6 3 L9.6 4 M9.6 3 L8.6 4" stroke="#1c0a02" strokeWidth=".8" />
      <path d="M6.8 5.4 H9.2" stroke="#1c0a02" strokeWidth=".7" strokeDasharray=".9 .7" />
      <line x1="13.2" y1="0.6" x2="8.6" y2="4.8" stroke="#e879f9" strokeWidth="1.2" />
      <circle cx="13.2" cy="0.6" r="1.4" fill="#f0abfc" />
      <line x1="1.6" y1="8.2" x2="7.4" y2="11" stroke="#ef4444" strokeWidth="1.2" />
      <circle cx="1.6" cy="8.2" r="1.4" fill="#f87171" />
    </svg>
  );
}
function KessMini({ size = 20 }) {
  return (
    <svg viewBox="0 0 30 19" width={size} height={(size * 19) / 30}>
      <path d="M13 8 Q8 3 1.5 2.5 L3.5 5 L1 5.2 L3.8 7 L1.8 7.6 L4.6 8.8 L3 9.8 Q8 10.5 12 10 Z" fill="#5c3410" />
      <path d="M13 8.6 Q9 6 4 5.5 Q8 8 12.5 9.6 Z" fill="#92400e" />
      <path d="M17 8 Q22 3 28.5 2.5 L26.5 5 L29 5.2 L26.2 7 L28.2 7.6 L25.4 8.8 L27 9.8 Q22 10.5 18 10 Z" fill="#7c2d12" />
      <path d="M17 8.6 Q21 6 26 5.5 Q22 8 17.5 9.6 Z" fill="#a3541a" />
      <path d="M12.5 8 Q15 6.5 17.5 8 L17 12.5 Q15 14 13 12.5 Z" fill="#92400e" />
      <path d="M12.5 8 L15 7.2 L15 13.4 Q13.6 13.4 13 12.5 Z" fill="#5c3410" />
      <path d="M13.2 11.5 Q15 12.6 16.8 11.5 M13.4 10 Q15 11 16.6 10" stroke="#f0e6d2" strokeWidth=".7" fill="none" opacity=".85" />
      <path d="M13 13 L11.5 18 L13.4 16.8 L15 18.6 L16.6 16.8 L18.5 18 L17 13 Q15 14.4 13 13 Z" fill="#7c2d12" />
      <path d="M12.4 16 Q15 17.4 17.6 16" stroke="#3a1e06" strokeWidth=".8" fill="none" />
      <circle cx="15" cy="5.6" r="2.5" fill="#92400e" />
      <path d="M12.5 5.4 Q12.8 3.2 15 3.1 L15.2 5.8 Q13.6 6.2 12.5 5.4 Z" fill="#4a2708" />
      <path d="M12.6 4.6 L15.6 4.9" stroke="#2a1607" strokeWidth=".7" />
      <circle cx="14" cy="5.2" r="0.95" fill="#160b04" /><circle cx="14.3" cy="4.85" r="0.3" fill="#fef3c7" />
      <path d="M15 6.6 L15 8.2 L13.8 7.1 Z" fill="#f59e0b" /><path d="M15 6.6 L15 8.2 L15.8 7.4 Z" fill="#b45309" />
    </svg>
  );
}
function UndineMini({ size = 18 }) {
  return (
    <svg viewBox="0 0 22 26" width={size} height={(size * 26) / 22}>
      <path d="M3 22 Q1 24 4 25 Q11 26.5 17 24.5 Q21 23 18.5 21 Q14 19.5 8 20.5 Q4.5 21 3 22 Z" fill="#0d9488" />
      <path d="M4.5 21.5 Q9 20 15 21 Q18 21.8 17 23 Q11 24.5 5.5 23.2 Q3.5 22.4 4.5 21.5 Z" fill="#2dd4bf" opacity=".75" />
      <path d="M5 22.5 Q9 21.5 14 22.2" stroke="#ccfbf1" strokeWidth=".8" fill="none" opacity=".8" />
      <path d="M8 21 Q6.5 15 8.5 10 Q10 6 13 5 Q16 6 16 10 Q16 15 14.5 21 Q11 22.3 8 21 Z" fill="#14b8a6" opacity=".85" />
      <path d="M8 21 Q6.5 15 8.5 10 Q10 6 13 5 L12 12 Q11 17 11.5 21.6 Q9.5 21.8 8 21 Z" fill="#0d9488" />
      <path d="M7.5 13 Q3 12 1.5 8.5 Q4.5 9.5 6.5 8.5 Q5 11 7.5 13 Z" fill="#2dd4bf" opacity=".8" />
      <path d="M15.5 12 Q20 10.5 20.5 6 Q17.5 7.5 16.5 10" fill="none" stroke="#2dd4bf" strokeWidth="2" strokeLinecap="round" opacity=".85" />
      <circle cx="12" cy="13.5" r="2.4" fill="#ccfbf1" opacity=".8" /><circle cx="12" cy="13.5" r="1.1" fill="#f0fdfa" />
      <path d="M9.5 6.5 Q11 2.5 14.5 2 Q17 2 17.5 4 Q15 3.6 13.5 5 Q15.5 5 16 6.5 Q13.5 6 12.5 7.5 Q11 6.5 9.5 6.5 Z" fill="#5eead4" />
      <path d="M10.5 6 Q12 3.5 14.5 3" stroke="#ccfbf1" strokeWidth=".7" fill="none" opacity=".9" />
      <path d="M10.3 8.2 L12 7.7 L11.4 9.4 Z" fill="#a5f3fc" /><path d="M14.7 8 L13.2 7.6 L13.8 9.3 Z" fill="#a5f3fc" />
      <circle cx="11" cy="8.4" r="1.6" fill="#67e8f9" opacity=".22" /><circle cx="14" cy="8.2" r="1.6" fill="#67e8f9" opacity=".22" />
      <path d="M9 11 Q8 14 8.8 17" stroke="#ccfbf1" strokeWidth=".7" fill="none" opacity=".55" />
      <circle cx="19" cy="14" r="0.9" fill="#5eead4" opacity=".9" /><circle cx="3.5" cy="16" r="0.8" fill="#2dd4bf" opacity=".8" /><circle cx="18" cy="3.5" r="0.7" fill="#ccfbf1" opacity=".9" />
    </svg>
  );
}

/* ============ arena art ============ */
const HERALD_SIGILS = {
  G: <><path d="M7 1 L7 13" /><path d="M7 3 Q2 5.5 7 8 M7 3 Q12 5.5 7 8" /></>,
  M: <path d="M7 2 Q11 8 7 13 Q3 8 7 2 Z" fill="#e7e5e4" strokeWidth=".6" />,
  V: <><path d="M7 2 L9 8 L7 13 L5 8 Z" /><path d="M3 5.5 L5 7.5 M11 5.5 L9 7.5" /></>,
  C: <><path d="M7 2 Q3 7.5 7 13 Q11 7.5 7 2 Z" /><path d="M7 6 Q5.5 9 7 11.5 Q8.5 9 7 6 Z" strokeWidth=".8" /></>,
  K: <path d="M9 2 L5 6.5 L8 8 L4 13" strokeWidth="1.6" />,
  Z: <><circle cx="7" cy="5.5" r="3.4" /><path d="M7 9 Q9 11 7 13 Q5 11 7 9 Z" fill="#ef4444" strokeWidth=".5" /></>,
  L: <><circle cx="7" cy="7" r="2.6" /><path d="M7 1 L7 3.2 M7 10.8 L7 13 M1 7 L3.2 7 M10.8 7 L13 7 M2.8 2.8 L4.4 4.4 M9.6 9.6 L11.2 11.2 M11.2 2.8 L9.6 4.4 M4.4 9.6 L2.8 11.2" strokeWidth="1" /></>,
  D: <><path d="M2 12 L7 3 L12 12 Z" /><path d="M5.6 6.4 L7 8 L8.4 6.4" strokeWidth=".9" /></>,
  Y: <path d="M2 6.5 Q4.5 3 7 6.5 Q9.5 10 12 6.5 M2 10.5 Q4.5 7 7 10.5 Q9.5 14 12 10.5" strokeWidth="1.1" />,
  W: <><path d="M7 1.5 L10 7.5 L7 6 L4 7.5 Z" fill="#e7e5e4" strokeWidth=".5" /><path d="M7 6 L7 13 M5.2 11 L7 12.4 L8.8 11" strokeWidth="1" /></>,
  X: <><path d="M7 1.5 L7 9.5" strokeWidth="1.4" /><path d="M4 8 L10 8" /><circle cx="7" cy="11.6" r="1.5" /></>,
  O: <><path d="M4 4 L10 10 M10 4 L4 10" /><circle cx="7" cy="7" r="5" strokeWidth=".8" opacity=".7" /></>,
};
function HeraldBanner({ x, fk, fallback, dark }) {
  const hex = fk ? FIGHTERS[fk].hex : fallback;
  const sTint = fk === "Z" ? "#ef4444" : "#e7e5e4";
  return (
    <g>
      <rect x={x} y="30" width="18" height="42" fill="#17120e" />
      <rect x={x} y="30" width="18" height="42" fill={hex} opacity=".42" />
      <path d={`M${x} 72 L${x + 9} 64 L${x + 18} 72 Z`} fill="#17120e" /><path d={`M${x} 72 L${x + 9} 64 L${x + 18} 72 Z`} fill={hex} opacity=".42" />
      <rect x={x} y="30" width="18" height="5" fill={dark || "#0d0b09"} />
      <rect x={x + 1} y="36" width="16" height="30" fill="none" stroke={hex} strokeWidth=".8" opacity=".65" />
      {fk && HERALD_SIGILS[fk] && <g transform={`translate(${x + 2}, 40)`} stroke={sTint} strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round">{HERALD_SIGILS[fk]}</g>}
    </g>
  );
}
function ArenaBackdrop({ pfk, afk }) {
  return (
    <svg viewBox="0 0 400 96" className="w-full block" preserveAspectRatio="none" style={{ height: 84 }}>
      <defs>
        <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#292524" /><stop offset="100%" stopColor="#0c0a09" /></linearGradient>
        <linearGradient id="haze" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#000" stopOpacity=".8" /><stop offset="100%" stopColor="#000" stopOpacity="0" /></linearGradient>
      </defs>
      <rect width="400" height="96" fill="url(#wall)" />
      {[30, 105, 180, 255, 330].map((x, i) => (
        <path key={i} d={`M${x} 96 L${x} 46 Q${x + 22} 22 ${x + 44} 46 L${x + 44} 96 Z`} fill="#171310" />
      ))}
      {Array.from({ length: 60 }).map((_, i) => (
        <circle key={i} cx={12 + (i * 6.5) % 380} cy={16 + ((i * 37) % 3) * 7} r="1.4" fill="#57534e" opacity=".35" />
      ))}
      <HeraldBanner x={88} fk={pfk} fallback="#7f1d1d" dark="#450a0a" />
      <HeraldBanner x={294} fk={afk} fallback="#064e3b" dark="#022c22" />
      <g><rect x="30" y="62" width="16" height="8" rx="2" fill="#292524" /><rect x="36" y="70" width="4" height="20" fill="#1c1917" />
        <path className="flameA" d="M38 62 Q32 50 38 42 Q44 50 38 62 Z" fill="#f97316" /><path className="flameB" d="M38 60 Q35 52 38 47 Q41 52 38 60 Z" fill="#fde047" /></g>
      <g><rect x="354" y="62" width="16" height="8" rx="2" fill="#292524" /><rect x="360" y="70" width="4" height="20" fill="#1c1917" />
        <path className="flameB" d="M362 62 Q356 50 362 42 Q368 50 362 62 Z" fill="#f97316" /><path className="flameA" d="M362 60 Q359 52 362 47 Q365 52 362 60 Z" fill="#fde047" /></g>
      <rect width="400" height="26" fill="url(#haze)" />
    </svg>
  );
}
function StoneTile({ seed }) {
  const flip = seed % 2 ? -1 : 1;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
      <defs><radialGradient id={`st${seed}`} cx="35%" cy="25%"><stop offset="0%" stopColor="#4a4238" /><stop offset="70%" stopColor="#37302a" /><stop offset="100%" stopColor="#241e18" /></radialGradient></defs>
      <rect width="100" height="100" fill={`url(#st${seed})`} />
      <path d={`M${10 + seed * 7} 0 L${20 + seed * 5} 34 L${8 + seed * 6} 66`} stroke="#0f0c09" strokeWidth="1.6" fill="none" opacity=".8" transform={flip < 0 ? "scale(-1,1) translate(-100,0)" : ""} />
      <path d="M0 52 L38 46 L72 58 L100 50" stroke="#100d0a" strokeWidth="1" fill="none" opacity=".6" />
      <path d="M30 76 L64 72 L96 84" stroke="#100d0a" strokeWidth="1" fill="none" opacity=".5" />
      <ellipse cx={62 - seed * 6} cy={30 + seed * 8} rx="12" ry="6" fill="#521b1b" opacity=".55" />
      <ellipse cx={58 - seed * 6} cy={26 + seed * 8} rx="4" ry="2" fill="#5e1c1c" opacity=".65" />
      {seed === 2 && <path d="M70 78 L84 74 L82 80 L72 84 Z" fill="#8f8574" opacity=".55" />}
      {seed === 1 && <circle cx="18" cy="80" r="3.4" fill="#7d7361" opacity=".5" />}
      {seed === 3 && <path d="M16 22 L28 16 L26 22 Z" fill="#6d6355" opacity=".5" />}
      <rect width="100" height="100" fill="none" stroke="#000" strokeOpacity=".38" strokeWidth="2" />
    </svg>
  );
}
function TerrainSkin({ kind }) {
  if (kind === "frost") return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
      <rect width="100" height="100" fill="#7dd3fc" opacity=".25" />
      <path d="M10 90 L22 60 L30 88 Z M64 92 L74 66 L84 92 Z" fill="#bae6fd" opacity=".7" />
      <path d="M22 60 L22 88 M74 66 L74 90" stroke="#e0f2fe" strokeWidth="1" opacity=".7" />
      <path d="M6 30 L30 22 M60 16 L90 26 M40 44 L70 40" stroke="#a5f3fc" strokeWidth="1" opacity=".45" />
      <circle cx="30" cy="24" r="1.4" fill="#fff" opacity=".8" /><circle cx="78" cy="40" r="1.2" fill="#fff" opacity=".7" />
    </svg>
  );
  if (kind === "scorch") return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
      <rect width="100" height="100" fill="#7c2d12" opacity=".3" />
      <path d="M12 80 L34 64 L52 78 L74 60 L90 74" stroke="#f97316" strokeWidth="2" fill="none" opacity=".85" style={{ animation: "venPulse 1.4s infinite" }} />
      <path d="M20 34 L42 44 L60 30" stroke="#fb923c" strokeWidth="1.4" fill="none" opacity=".6" style={{ animation: "venPulse 1.9s infinite" }} />
      <circle cx="70" cy="82" r="1.6" fill="#fde047" opacity=".8" /><circle cx="28" cy="70" r="1.2" fill="#fb923c" opacity=".7" />
    </svg>
  );
  if (kind === "surf") return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
      <rect width="100" height="100" fill="#0891b2" opacity=".24" />
      <path d="M0 34 Q14 24 28 32 Q26 24 36 24 Q30 34 44 34 L44 40 Q20 44 0 40 Z" fill="#22d3ee" opacity=".55" />
      <path d="M50 62 Q66 52 82 60 Q80 52 92 52 Q84 62 100 62 L100 70 Q72 74 50 68 Z" fill="#67e8f9" opacity=".5" style={{ animation: "venPulse 2.2s infinite" }} />
      <path d="M4 78 Q30 72 56 78 M40 20 Q64 14 90 20" stroke="#a5f3fc" strokeWidth="1.4" fill="none" opacity=".5" />
      <circle cx="30" cy="30" r="1.6" fill="#ecfeff" opacity=".9" /><circle cx="86" cy="56" r="1.4" fill="#cffafe" opacity=".8" /><circle cx="14" cy="76" r="1.2" fill="#a5f3fc" opacity=".8" />
    </svg>
  );
  if (kind === "whirl") return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
      <rect width="100" height="100" fill="#0d9488" opacity=".22" />
      <circle cx="50" cy="50" r="30" fill="none" stroke="#2dd4bf" strokeWidth="2" strokeDasharray="10 8" opacity=".55" style={{ animation: "spin 5s linear infinite", transformOrigin: "50% 50%" }} />
      <circle cx="50" cy="50" r="18" fill="none" stroke="#5eead4" strokeWidth="1.5" strokeDasharray="6 6" opacity=".5" style={{ animation: "spin 3s linear infinite reverse", transformOrigin: "50% 50%" }} />
      <circle cx="50" cy="50" r="5" fill="#0f766e" opacity=".7" />
    </svg>
  );
  if (kind === "dom") return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
      <rect width="100" height="100" fill="#d97706" opacity=".18" />
      <path d="M8 88 L20 62 L34 88 Z M40 90 L52 58 L66 90 Z M70 88 L82 66 L94 88 Z" fill="#78716c" opacity=".55" stroke="#0c0a09" strokeWidth="1.5" />
      <path d="M0 92 H100" stroke="#d97706" strokeWidth="2.5" opacity=".5" />
      <circle cx="52" cy="50" r="2" fill="#f59e0b" opacity=".8" style={{ animation: "venPulse 2.4s infinite" }} />
    </svg>
  );
  if (kind === "mire") return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
      <rect width="100" height="100" fill="#1a2e0a" opacity=".3" />
      <ellipse cx="34" cy="66" rx="20" ry="9" fill="#365314" opacity=".6" />
      <ellipse cx="68" cy="42" rx="14" ry="7" fill="#365314" opacity=".5" />
      <circle cx="40" cy="60" r="1.6" fill="#a3e635" opacity=".7" style={{ animation: "venPulse 2s infinite" }} />
      <circle cx="64" cy="46" r="1.3" fill="#a3e635" opacity=".6" style={{ animation: "venPulse 1.5s infinite" }} />
      <path d="M20 30 L26 22 L28 32 Z" fill="#0a0d05" opacity=".7" />
    </svg>
  );
  if (kind === "hall") return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
      <rect width="100" height="100" fill="#eab308" opacity=".16" />
      <path d="M50 26 L50 74 M32 44 L68 44" stroke="#fde047" strokeWidth="3" opacity=".55" />
      <circle cx="50" cy="50" r="26" fill="none" stroke="#eab308" strokeWidth="1.4" opacity=".5" style={{ animation: "venPulse 2.2s infinite" }} />
    </svg>
  );
  if (kind === "env") return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
      <ellipse cx="50" cy="66" rx="34" ry="16" fill="#84cc16" opacity=".22" style={{ animation: "venPulse 1.6s infinite" }} />
      <path d="M50 40 L47 66 L53 66 Z" fill="#a3e635" opacity=".9" /><rect x="48.4" y="34" width="3.2" height="8" fill="#374151" />
      <circle cx="38" cy="62" r="2" fill="#a3e635" opacity=".5" /><circle cx="64" cy="70" r="1.6" fill="#bef264" opacity=".5" />
    </svg>
  );
  return null;
}

/* ============ css ============ */
const CSS = `
@keyframes ringPulse{0%{transform:scale(.35);opacity:0}30%{opacity:1}100%{transform:scale(1.25);opacity:0}}
@keyframes crackOut{0%{transform:scale(.2);opacity:0}25%{opacity:1}70%{transform:scale(1);opacity:1}100%{transform:scale(1.04);opacity:0}}
@keyframes shardIn{0%{transform:translate(0,0);opacity:0}25%{opacity:1}100%{transform:translate(calc(50% - 0px), 0) scale(.4);opacity:0}}
.fxClawLash{animation:clawlash 1.4s ease-out both;transform-origin:50% 80%}
@keyframes clawlash{0%{transform:scale(.3) rotate(-24deg);opacity:0}25%{transform:scale(1.08) rotate(12deg);opacity:1}45%{transform:scale(1) rotate(-7deg)}100%{transform:scale(1);opacity:.85}}
.fxFlashA{animation:skyflash 7s linear infinite}
.fxFlashB{animation:skyflash 9s linear infinite; animation-delay:-4.2s}
@keyframes skyflash{0%,86%,100%{opacity:0}88%{opacity:.95}90%{opacity:.12}92%{opacity:.75}95%{opacity:0}}
.fxSkyHit{animation:skyhit 1.5s ease-out both}
@keyframes skyhit{0%{transform:translateY(-16px);opacity:0}30%{opacity:1}100%{transform:translateY(0);opacity:.85}}
@keyframes bgShake{0%,100%{transform:translate(0,0)}20%{transform:translate(-5px,3px)}40%{transform:translate(4px,-4px)}60%{transform:translate(-3px,-2px)}80%{transform:translate(3px,2px)}}
@keyframes popRise{0%{opacity:0;transform:translateY(8px) scale(.6)}18%{opacity:1;transform:translateY(0) scale(1.2)}34%{transform:scale(1)}100%{opacity:0;transform:translateY(-30px)}}
@keyframes slashIn{0%{opacity:0;transform:rotate(-28deg) scaleX(0)}30%{opacity:1;transform:rotate(-28deg) scaleX(1.05)}100%{opacity:0;transform:rotate(-28deg) scaleX(1)}}
@keyframes rushIn{0%{opacity:0;transform:translateX(-30px) rotate(12deg)}30%{opacity:1;transform:translateX(0) rotate(12deg)}100%{opacity:0;transform:translateX(24px) rotate(12deg)}}
@keyframes ringOut{0%{opacity:.95;transform:scale(.25)}100%{opacity:0;transform:scale(1.7)}}
@keyframes glowFade{0%{opacity:.6}100%{opacity:0}}
@keyframes venPulse{0%,100%{opacity:.25}50%{opacity:.6}}
@keyframes cutL{0%{transform:translateX(-110%)}100%{transform:translateX(0)}}
@keyframes cutR{0%{transform:translateX(110%)}100%{transform:translateX(0)}}
@keyframes stampIn{0%{opacity:0;transform:scale(2.4) rotate(-7deg)}55%{opacity:1;transform:scale(.94) rotate(-7deg)}100%{opacity:1;transform:scale(1) rotate(-7deg)}}
@keyframes bannerIn{0%{opacity:0;letter-spacing:.7em}100%{opacity:1;letter-spacing:.2em}}
@keyframes emberUp{0%{transform:translate(0,10vh);opacity:0}12%{opacity:var(--emax,.55)}55%{transform:translate(var(--sway,5px),-36vh)}100%{transform:translate(0,-85vh);opacity:0}}
@keyframes tokenHit{0%,100%{filter:none}35%{filter:brightness(2.6) saturate(.3)}}
@keyframes feedIn{0%{opacity:0;transform:translateY(4px)}100%{opacity:1;transform:translateY(0)}}
@keyframes flick{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.82)}}
@keyframes fogDrift{0%{transform:translateX(-8%)}100%{transform:translateX(8%)}}
.flameA{transform-origin:center 62px;animation:flick 1.1s ease-in-out infinite}
.flameB{transform-origin:center 62px;animation:flick .8s ease-in-out .2s infinite}
.bg-shake{animation:bgShake .32s linear}
.spriteA{animation:frA 1s steps(1) infinite}
.spriteB{animation:frB 1s steps(1) infinite}
.vfig{animation:vBreathe 2.8s ease-in-out infinite;transform-origin:50% 100%}
@keyframes vBreathe{0%,100%{transform:scaleY(1) var(--fl,scaleX(1))}50%{transform:scaleY(1.02) var(--fl,scaleX(1))}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes frA{0%,49%{opacity:1}50%,100%{opacity:0}}
@keyframes frB{0%,49%{opacity:0}50%,100%{opacity:1}}
@keyframes fxFall{0%{transform:translateY(0);opacity:0}12%{opacity:.95}100%{transform:translateY(85vh);opacity:0}}
@keyframes fxRise{0%{transform:translateY(0);opacity:0}12%{opacity:.9}100%{transform:translateY(-85vh);opacity:0}}
@keyframes fxDrift{0%{transform:translate(0,0);opacity:0}10%{opacity:.9}50%{transform:translate(var(--sx,8px),42vh)}100%{transform:translate(0,85vh);opacity:0}}
@keyframes fxRiseSway{0%{transform:translate(0,0);opacity:0}12%{opacity:.9}50%{transform:translate(var(--sx,8px),-40vh)}100%{transform:translate(0,-82vh);opacity:0}}
@keyframes fxFlick{0%,100%{opacity:0}50%{opacity:1}}
@keyframes fxTwinkle{0%,100%{opacity:.15;transform:scale(.7)}50%{opacity:1;transform:scale(1.3)}}
@keyframes fxJawK{0%,80%,100%{transform:translateY(0) rotate(0)}84%{transform:translateY(3px) rotate(1.5deg)}88%{transform:translateY(.8px)}92%{transform:translateY(2.6px) rotate(-1deg)}96%{transform:translateY(0)}}
@keyframes fxFlapK{0%,64%,100%{transform:rotate(0)}69%{transform:rotate(-32deg)}74%{transform:rotate(10deg)}79%{transform:rotate(-26deg)}84%{transform:rotate(8deg)}89%{transform:rotate(-14deg)}94%{transform:rotate(0)}}
@keyframes fxBurst{0%,70%,100%{opacity:0}74%,80%{opacity:1}84%{opacity:0}88%,92%{opacity:.95}}
@keyframes fxHaloK{0%,100%{opacity:.15}50%{opacity:1}}
@keyframes fxSwayK{0%,100%{transform:rotate(-1.5deg)}50%{transform:rotate(4deg)}}
@keyframes fxSigilK{0%,100%{transform:scale(1);opacity:.4}50%{transform:scale(1.28);opacity:1}}
@keyframes fxRuneK{0%,100%{opacity:.35}50%{opacity:1}}
.pfx .fxJaw{animation:fxJawK 2.8s ease-in-out infinite;transform-box:view-box}
.pfx .fxWing{animation:fxFlapK 3.2s ease-in-out infinite;transform-box:view-box;transform-origin:102px 14px}
.pfx .fxVisor{animation:fxHaloK 1.6s ease-in-out infinite}
.pfx .fxBoltA{opacity:0;animation:fxBurst 2s linear infinite}
.pfx .fxBoltB{opacity:0;animation:fxBurst 2s linear .9s infinite}
.pfx .fxHalo{animation:fxHaloK 2s ease-in-out infinite}
.pfx .fxHaloB{animation:fxHaloK 2s ease-in-out 1s infinite}
.pfx .fxFlameHi{animation:fxFlameK .8s ease-in-out infinite;transform-box:view-box;transform-origin:60px 48px}
.pfx .fxFlameLo{animation:fxFlameK 1.3s ease-in-out .3s infinite;transform-box:view-box;transform-origin:60px 50px}
@keyframes fxFlameK{0%,100%{transform:scaleY(1) skewX(0)}50%{transform:scaleY(.72) skewX(-3deg)}}
.pfx .fxWave{animation:fxSwayK 2.8s ease-in-out infinite;transform-box:view-box;transform-origin:80px 32px}
.pfx .fxSigil{animation:fxSigilK 2.2s ease-in-out infinite;transform-box:view-box;transform-origin:60px 114px}
.pfx .fxRune{animation:fxRuneK 2.4s ease-in-out infinite}
`;

/* ============ APP ============ */
export default function App() {
  const G = useRef(null);
  const [, setTick] = useState(0);
  const rerender = () => setTick((x) => x + 1);
  const timers = useRef([]);
  const pendingRef = useRef(null);

  const [screen, setScreen] = useState("title");
  const [diff, setDiff] = useState("proving");
  const musicRef = useRef(null);
  const musicSrcRef = useRef("");
  const musicFileRef = useRef(null);
  const [musicUrl, setMusicUrl] = useState(MUSIC_SRC || "");
  const [muted, setMuted] = useState(false);
  const gPhaseNow = G.current?.phase;
  useEffect(() => {
    if (!musicUrl) { if (musicRef.current) musicRef.current.pause(); return; }
    if (!musicRef.current) { const au = new Audio(); au.loop = true; au.volume = 0.5; musicRef.current = au; }
    const au = musicRef.current;
    if (musicSrcRef.current !== musicUrl) { musicSrcRef.current = musicUrl; au.src = musicUrl; }
    au.muted = muted;
    const shouldPlay = screen !== "game" || gPhaseNow === "over";
    if (shouldPlay) {
      au.play().catch(() => {
        const unlock = () => { au.play().catch(() => {}); window.removeEventListener("pointerdown", unlock); };
        window.addEventListener("pointerdown", unlock);
      });
    } else au.pause();
  }, [screen, gPhaseNow, muted, musicUrl]);
  const [side, setSide] = useState(null);
  const [pickAb, setPickAb] = useState([]);
  const [pickPass, setPickPass] = useState(null);
  const [foeSel, setFoeSel] = useState(null);
  const [sel, setSel] = useState({ step: "move", moveTo: null, ab: null, soft: false, target: null, splash: null, secondary: null });
  const [pops, setPops] = useState([]);
  const [flashes, setFlashes] = useState([]);
  const [shake, setShake] = useState(false);
  const [banner, setBanner] = useState(null);
  const [stamp, setStamp] = useState(null);
  const [cutin, setCutin] = useState(false);
  const [sudden, setSudden] = useState(null);
  const [hitTok, setHitTok] = useState(null);
  const [showLog, setShowLog] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [tip, setTip] = useState(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const [showCodex, setShowCodex] = useState(false);

  const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.current.push(id); return id; };
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  /* ---- fx ---- */
  const addPop = (sideK, text, cls) => {
    const id = Math.random();
    setPops((p) => [...p, { id, side: sideK, text, cls }]);
    later(() => setPops((p) => p.filter((x) => x.id !== id)), 1100);
  };
  const flashQuad = (q, ty, el) => {
    if (!q) return;
    const id = Math.random();
    setFlashes((f) => [...f, { id, q, ty, el }]);
    later(() => setFlashes((f) => f.filter((x) => x.id !== id)), 700);
  };
  const doShake = () => { if (REDUCED) return; setShake(true); later(() => setShake(false), 340); };
  const showStamp = (text, tone) => { setStamp({ text, tone }); later(() => setStamp(null), 1150); };
  const showBanner = (text, sub) => { setBanner({ text, sub }); later(() => setBanner(null), 1250); };
  const tokFlash = (k) => { setHitTok(k); later(() => setHitTok(null), 420); };
  const fireFx = (fx) => {
    if (!fx) return;
    if (fx.kind === "hit") { addPop(fx.side, `−${fx.amt}`, "text-red-400"); flashQuad(fx.q, fx.ty, fx.el); tokFlash(fx.side); if (fx.amt >= 2) doShake(); }
    if (fx.kind === "glance") { addPop(fx.side, `−${fx.amt}`, "text-stone-400"); flashQuad(fx.q, fx.ty, fx.el); }
    if (fx.kind === "heal") addPop(fx.side, `+${fx.amt}`, "text-emerald-400");
    if (fx.kind === "poison") addPop(fx.side, "+🧪", "text-lime-400");
    if (fx.kind === "burn") addPop(fx.side, "+🔥", "text-orange-400");
    if (fx.kind === "chill") addPop(fx.side, "❄", "text-sky-300");
    if (fx.kind === "curse") addPop(fx.side, "+🧷", "text-fuchsia-400");
    if (fx.kind === "rupture") { addPop(fx.side, "RUPTURE", "text-lime-300"); showStamp("RUPTURE", "#a3e635"); doShake(); }
    if (fx.kind === "combo") { showStamp(fx.text, "#fde047"); doShake(); }
    if (fx.kind === "pow") addPop(fx.side, "+◆", "text-violet-300");
    if (fx.kind === "adv") showStamp(fx.text, fx.tone);
  };

  /* ---- helpers on G.current ---- */
  const sideKeyOf = (s) => (s === G.current.P ? "P" : "A");
  const other = (s) => (s === G.current.P ? G.current.A : G.current.P);
  const nm = (s) => FIGHTERS[s.fk].short;
  const elOf = (s) => FIGHTERS[s.fk].hex;
  const frostQs = () => QUADS.filter((q) => G.current.terrain[q]?.kind === "frost");
  const railFor = (g) => (g?.tut && TUTS[g.P.fk]?.rails?.[g.round - 1]) || null;
  const resolveRail = (g) => {
    const rail = railFor(g);
    if (!rail) return null;
    const me0 = g.P, ai0 = g.A;
    const foeMove = rail.clash ? ai0.pos : rail.foe.move === "T" ? (ADJ[ai0.pos].includes(me0.pos) ? me0.pos : ADJ[ai0.pos][0]) : ai0.pos;
    const stepToward = ADJ[me0.pos].includes(ai0.pos) ? ai0.pos : ADJ[me0.pos].find((q) => ADJ[q].includes(ai0.pos)) || ADJ[me0.pos][0];
    let youMove = me0.pos;
    if (!rail.clash) {
      if (rail.you.move === "T") youMove = stepToward;
      else if (rail.you.move === "R" && g.relics?.board?.length) { const rq = g.relics.board[0]; youMove = rq === me0.pos || ADJ[me0.pos].includes(rq) ? rq : ADJ[me0.pos].find((q) => ADJ[q].includes(rq)) || me0.pos; }
      else if (rail.you.move === "A") youMove = ADJ[me0.pos].find((q) => q !== stepToward) || stepToward;
    }
    const youTgt = rail.you.tgt === "F" ? foeMove : null;
    const foeTgt = rail.clash ? null : rail.foe.tgt === "Y" ? me0.pos : rail.foe.tgt === "N" ? youMove : null;
    return { rail, you: { moveTo: youMove, ab: rail.you.ab, target: youTgt, splash: rail.you.sp ? ADJ[youTgt || me0.pos][0] : null, secondary: rail.you.sec ? QUADS.find((q) => q !== youTgt) : null }, foe: { ab: rail.foe?.ab, moveTo: foeMove, target: foeTgt }, say: rail.say };
  };
  const railPromptPick = (g, p) => {
    if (!p) return null;
    const me0 = g.P, foe0 = g.A;
    const hazKinds = ["frost", "scorch", "env", "mire", "whirl", "surf"];
    if (p.kind === "kess" || p.kind === "undine") return p.opts.includes(foe0.pos) ? foe0.pos : p.opts[0];
    if (p.kind === "terr" && p.tkind === "whirl") return p.opts.includes(foe0.pos) ? foe0.pos : p.opts[0];
    if (p.kind === "gift") return "heal";
    if (p.kind === "placeSelf") {
      if (me0.fk === "L" && g.relics?.board?.length && p.opts.includes(g.relics.board[0])) return g.relics.board[0];
      const own = p.opts.find((q) => (me0.fk === "D" && g.terrain[q]?.kind === "dom") || (me0.fk === "L" && g.terrain[q]?.kind === "hall"));
      return own || (p.opts.includes(me0.pos) ? me0.pos : p.opts[0]);
    }
    if (p.kind === "kb" || p.kind === "placeFoe") {
      const haz = p.opts.find((q) => q !== foe0.pos && hazKinds.includes(g.terrain[q]?.kind));
      if (haz) return haz;
      if (me0.fk === "G" && p.opts.includes(me0.pos)) return me0.pos;
      return p.opts.includes(foe0.pos) ? foe0.pos : p.opts[0];
    }
    if (p.kind === "step") return p.opts.find((q) => q === foe0.pos) || p.opts.find((q) => ADJ[q].includes(foe0.pos)) || p.opts[0];
    return p.opts[0];
  };
  const held = (f) => { const g = G.current; return (f.pass === "roots" && g.terrain[f.pos]?.kind === "dom") || !!f._noKB; };

  const dealRaw = (target, amt, L, label, ty, el, glance) => {
    let n = amt;
    if (target._ironActive && n > 0) n = Math.max(0, n - 1);
    const thr = 3;
    if (target.fk === "K" && target.pow >= thr && n > 0) n = Math.max(0, n - 1);
    if (n <= 0) { L.push({ t: `${label}: absorbed.` }); return; }
    target.hp -= n;
    if (G.current.stats) G.current.stats.dmg[target === G.current.P ? "A" : "P"] += n;
    if (target.pass === "knock" && !G.current._clawStrike) { target.knocks = (target.knocks || 0) + 1; if (target.knocks === 3) L.push({ t: `🚪 Knock, knock.` }); }
    L.push({ t: `${label} — ${nm(target)} takes ${n}.`, fx: { kind: glance ? "glance" : "hit", side: sideKeyOf(target), amt: n, q: target.pos, ty, el } });
    if (target.fk === "K" && target.pass === "vent" && !target.ventUsed && target.hp > 0 && target.hp <= 5) {
      target.ventUsed = true; target.pow = Math.min(3, target.pow + 3);
      L.push({ t: `⚡ Emergency Vent — Koros surges to ${target.pow}◆.`, fx: { kind: "pow", side: sideKeyOf(target) } });
    }
    if (target.hp <= 0 && target.pass === "vigil" && !target.vigilUsed) {
      target.vigilUsed = true; target.hp = 1;
      target.burn = 0; target._burnFresh = 0; target.poison = 0; target.curse = 0; target.brandRound = 0; target.weak = 0; target._weakFresh = false; target.chill = false; target.rooted = false; target.mark = 0; target.pow = 3;
      L.push({ t: `✦ UNDYING VIGIL — ${nm(target)} refuses the grave.`, fx: { kind: "combo", text: "UNDYING VIGIL" } });
      L.push({ t: `✨ The Light answers — every affliction cleansed, the bank ablaze (3◆).` });
    }

  };
  const attackDamage = (src, tgt, base, L, label, ty) => {
    if (src.fk === "G" && src.pass === "scent" && src.pos === tgt.pos) { base += 1; L.push({ t: `👃 Point-blank — Scent of Blood adds +1.` }); }
    if (src.fk === "C" && src.pass === "killheat" && tgt.burn > 0 && G.current._colNow) { base += 1; L.push({ t: `🔥 Killing Heat — point-blank fire, +1.` }); }
    let n = base;
    if (src.fk === "G" && src.pass === "pact" && src.hp <= 6) n += 1;
    if (src.fk === "M" && src.pass === "twist" && tgt.kbLast) n += 1;
    if (src.fk === "K" && src._powered && !src._powSpent) { n += 1; src._powSpent = true; L.push({ t: `⚡ Powered swing — the charge vents into the blow.` }); }
    if ((src.weak || 0) > 0) n = Math.max(0, n - 1);
    if (src.fk === "Z" && src.pass === "agonist" && ((tgt.weak || 0) > 0 || tgt.brandRound)) n += 1;
    if (src.fk === "W" && (tgt.mark || 0) > 0) n += Math.min(2, tgt.mark);
    if (src.flow) { const fb = src.pass === "pedge" ? 2 : 1; n += fb; src.flow = false; L.push({ t: `✦ Flow — the strike lands +${fb} heavier.` }); }
    if (ty === "break" && tgt.chill) {
      n += src.pass === "shatter" && src.fk === "V" ? 2 : 1;
      tgt.chill = false;
      L.push({ t: `❄ SHATTER — the chill breaks under the blow.`, fx: { kind: "combo", text: "SHATTER" } });
    }
    dealRaw(tgt, n, L, label, ty, elOf(src));
  };
  const healUp = (s, n, L, why) => {
    if ((s.curse || 0) >= 3 && other(s).pass === "juju") { L.push({ t: `🧷 Bad Juju — the curses refuse the healing, and the dolls feed.` }); addCurse(other(s), s, 1, L); return; }
    const b = s.hp; s.hp = Math.min(s.maxHp, s.hp + n);
    if (s.hp > b) L.push({ t: `${nm(s)} heals ${s.hp - b} (${why}).`, fx: { kind: "heal", side: sideKeyOf(s), amt: s.hp - b } });
  };
  const addPoison = (target, n, L) => {
    target.poison += n;
    L.push({ t: `🧪 ${nm(target)} gains ${n} Poison (${target.poison}).`, fx: { kind: "poison", side: sideKeyOf(target) } });
    if (target.poison >= 3) {
      target.poison = 0;
      dealRaw(target, 3, L, "POISON RUPTURE", "rush", "#a3e635");
      L.push({ t: "", fx: { kind: "rupture", side: sideKeyOf(target) } });
      const src = other(target);
      if (src.pass === "tithe") {
        src.maxHp += 2;
        L.push({ t: `🩸 Blood Tithe — max HP is now ${src.maxHp}.` });
        healUp(src, 2, L, "Blood Tithe");
      }
    }
  };
  const addBurn = (src, tgt, L) => {
    const cap = src.pass === "everburn" && src.fk === "C" ? 3 : 2;
    if (tgt.burn < cap) {
      tgt.burn += 1; tgt._burnFresh = (tgt._burnFresh || 0) + 1;
      L.push({ t: `🔥 ${nm(tgt)} is Burning (${tgt.burn}).`, fx: { kind: "burn", side: sideKeyOf(tgt) } });
    } else L.push({ t: `🔥 ${nm(tgt)} is already ablaze.` });
  };
  const addChill = (tgt, L) => {
    tgt.chill = true; tgt.chillUntil = G.current.roundJustPlayed + 1;
    L.push({ t: `❄ ${nm(tgt)} is Chilled.`, fx: { kind: "chill", side: sideKeyOf(tgt) } });
  };
  const addCurse = (src, tgt, n, L) => {
    tgt.curse = (tgt.curse || 0) + n;
    L.push({ t: `🧷 ${nm(tgt)} gains ${n} Curse (${tgt.curse}).`, fx: { kind: "curse", side: sideKeyOf(tgt) } });
    if (src && src.pass === "stitch" && !G.current.curseHealed) { G.current.curseHealed = true; healUp(src, 1, L, "Stitchwork"); }
  };
  const addWeak = (tgt, n, L) => {
    tgt.weak = Math.max(tgt.weak || 0, n); tgt._weakFresh = true;
    L.push({ t: `↓ ${nm(tgt)} is Weakened — −1 damage for ${n} round${n > 1 ? "s" : ""}.` });
  };
  const setTerrain = (q, kind, L, label) => {
    const g = G.current;
    const vF = [g.P, g.A].find((f) => f.fk === "V"), yF = [g.P, g.A].find((f) => f.fk === "Y");
    let dur = 2;
    if (kind === "frost" && vF?.pass === "permafrost") dur = 999;
    if (kind === "dom") dur = 999;
    if (kind === "hall") dur = 3;
        g.terrain[q] = { kind, until: g.roundJustPlayed + dur };
    L.push({ t: `${label || kind.toUpperCase()} claims ${q}.` });
  };
  const powCap = (s) => (s.pass === "reserves" ? 4 : 3);
  const gainPow = (s, n, L, why) => {
    if (s.noGain) { L.push({ t: `✖ ${nm(s)} gains no ◆ (${why} denied).` }); return; }
    const b = s.pow; s.pow = Math.min(powCap(s), s.pow + n);
    if (s.pow > b) L.push({ t: `${nm(s)} +${s.pow - b}◆ (${why}).`, fx: { kind: "pow", side: sideKeyOf(s) } });
  };

  /* ---- ability effects ---- */
  const baseEffect = (src, tgt, plan, L) => {
    const ab = ABILITIES[plan.ab];
    if (ab.type === "ward") return;
    let d = plan.soft && ab.soft ? ab.soft.dmg : ab.dmg;
    if (ab.dual && plan.form && ab.dual[plan.form]) d = ab.dual[plan.form].dmg ?? d;
    if (src.fk === "W" && src.pass === "deadeye" && plan.target && plan.target !== src.pos && !ADJ[src.pos].includes(plan.target)) { d += 1; L.push({ t: `🎯 Deadeye — the long shot flies true.` }); }
    if (plan.ab === "mount" && G.current.terrain[tgt.pos]?.kind === "dom") d += 1;
    if (plan.ab === "llance" && G.current.terrain[tgt.pos]?.kind === "hall") { d += 1; L.push({ t: `✦ The Light punishes trespass — +1.` }); }
    if (plan.ab === "frenzy" && src.hp <= 6) d = 3;
    if (plan.ab === "heart" && tgt.poison > 0) {
      d += tgt.poison * 2;
      L.push({ t: `🗡 HEARTSEEKER — ${tgt.poison} Poison stack${tgt.poison > 1 ? "s" : ""} detonate for double.`, fx: { kind: "combo", text: "HEARTSEEKER" } });
      tgt.poison = 0;
      if (src.pass === "tithe") { src.maxHp += 2; L.push({ t: `🩸 Blood Tithe — max HP is now ${src.maxHp}.` }); healUp(src, 2, L, "Blood Tithe"); }
    }
    if (plan.ab === "comb" && tgt.burn > 0) { d += tgt.burn * 2; L.push({ t: `💥 COMBUSTION — ${tgt.burn} smoldering stack${tgt.burn > 1 ? "s" : ""} detonate for double.`, fx: { kind: "combo", text: "COMBUSTION" } }); tgt.burn = 0; }
    if (plan.ab === "sorrow" && !plan.soft && (tgt.curse || 0) >= 3) { const bon = Math.floor(tgt.curse / 3); d += bon; L.push({ t: `🧷 The Harvest draws on ${tgt.curse} Curse — +${bon}.`, fx: { kind: "combo", text: "HARVEST" } }); }
    const ety = plan.form || ab.type;
    attackDamage(src, tgt, d, L, `${ab.name} lands DIRECT`, ety);

    if (plan.ab === "viper" || plan.ab === "twin") addPoison(tgt, 1, L);
    if (plan.ab === "lance") addChill(tgt, L);
    if (plan.ab === "cinder" || plan.ab === "magma") addBurn(src, tgt, L);
    if (plan.ab === "freeze") setTerrain(plan.target, "frost", L, "❄ Frost");
    if (plan.ab === "chains") addWeak(tgt, 1, L);
    if (plan.ab === "brand") { tgt.brandRound = G.current.round + 2; L.push({ t: `⏳ ${nm(tgt)} is BRANDED — detonates at the end of round ${tgt.brandRound}.` }); }
    if (plan.ab === "dark") healUp(src, plan.soft ? 1 : 2, L, "Devouring Dark");
    if (plan.ab === "consec") setTerrain(plan.target, "hall", L, "✦ Sanctuary");
    if (plan.ab === "dawn" && G.current.terrain[src.pos]?.kind === "hall") healUp(src, 2, L, "Dawnhammer — sunrise from sanctity");
    if (plan.ab === "stick") addCurse(src, tgt, 1, L);
    if (plan.ab === "eye") { addWeak(tgt, 1, L); addCurse(src, tgt, 1, L); }
    if (plan.ab === "mireA") setTerrain(plan.target, "mire", L, "🧷 Sorrow Mire");
    if (plan.ab === "pyre") {
      const qs = plan.soft ? [plan.target] : [plan.target, ...ADJ[plan.target]];
      qs.forEach((q) => { if (G.current.terrain[q] && G.current.terrain[q].kind !== "scorch") L.push({ t: `🔥 The Pyre burns ${q}'s ground bare.` }); setTerrain(q, "scorch", L, "🔥 Scorched ground"); });
    }
    if (plan.ab === "fissure") { setTerrain(plan.target, "dom", L, "⛰ Dominion"); G.current.prompts.push({ kind: "terr", tkind: "dom", who: src.fk, opts: ADJ[plan.target], label: "Fissure: the crack runs — convert one adjacent quadrant" }); }
    if (plan.ab === "quake" && G.current.terrain[plan.target] && G.current.terrain[plan.target].kind !== "dom") { delete G.current.terrain[plan.target]; L.push({ t: `⛰ Quake Fist shatters the ground at ${plan.target}.` }); }
    if (plan.ab === "bwater") setTerrain(plan.target, "surf", L, "🌊 Crashing Surf");
    if (plan.ab === "grind") {
      const opts = QUADS.filter((q) => G.current.terrain[q] && G.current.terrain[q].kind !== "dom");
      const empty = QUADS.filter((q) => !G.current.terrain[q]);
      if (opts.length) G.current.prompts.push({ kind: "grind", who: src.fk, opts, label: "Continental Grind: pave over enemy terrain" });
      else if (empty.length) G.current.prompts.push({ kind: "terr", tkind: "dom", who: src.fk, opts: empty, label: "Continental Grind: claim open ground" });
      else L.push({ t: "Continental Grind finds nothing to pave." });
    }
    if (plan.ab === "storm") {
      if (plan.soft) G.current.prompts.push({ kind: "terr", tkind: "whirl", who: src.fk, opts: ADJ[plan.target], label: "Maelstrom: churn one adjacent quadrant" });
      else ADJ[plan.target].forEach((q) => {
        setTerrain(q, "whirl", L, "🌀 Whirlpool");
        const foe = [G.current.P, G.current.A].find((f) => f.fk !== "Y" && f.hp > 0 && ADJ[q].includes(f.pos) && !held(f));
        if (foe) { foe.pos = q; L.push({ t: `🌀 The vortex opens — ${nm(foe)} is YANKED in.` }); }
      });
    }
    if (plan.ab === "undine") { G.current.prompts.push({ kind: "undine", who: src.fk, opts: QUADS, label: "Place the Undine" }); }
    if (plan.ab === "toll") { tgt._tolled = true; L.push({ t: `👁 ${nm(tgt)}'s next movement will be revealed.` }); }
    if (plan.ab === "twin") { const opts = QUADS.filter((qq) => qq !== plan.target && qq !== plan.secondary); if (opts.length) G.current.prompts.push({ kind: "enpoison", who: src.fk, opts, label: "Three Fangs: the third dagger — poison a quadrant" }); }
    if (plan.ab === "pin") { tgt._rootNext = true; L.push({ t: `📌 Pinned — ${nm(tgt)} is Rooted next round.` }); }
    if (plan.ab === "cadence") { src.flow = true; L.push({ t: `✦ Blade Cadence — ${nm(src)} banks Flow.` }); }
  };
  const advRider = (src, tgt, plan, L, followups) => {
    if (G.current.stats) G.current.stats.adv[src === G.current.P ? "P" : "A"] += 1;
    const ety = plan.form || ABILITIES[plan.ab].type;
    const plus1 = (label) => attackDamage(src, tgt, 1, L, label || "Advantage — the extra point", ety);
    switch (plan.ab) {
      // signatures: +1 AND effect
      case "harvest": plus1("Red Harvest overswing"); plan._kbAny = true; break;
      case "freeze": plus1("Flash Freeze bites"); tgt._rootNext = true; L.push({ t: `⛓ ${nm(tgt)} is Rooted — no moving next round.` }); break;
      case "pyre": plus1("Pyre flare"); if (plan._pyreHit) addBurn(src, tgt, L); break;
      case "aval": { const bonus = Math.min(2, frostQs().length); plus1("Avalanche surge"); if (bonus > 0) attackDamage(src, tgt, bonus, L, "The frost joins in", "break"); break; }
      case "arc": plus1("Arc Discharge grounds out"); if (tgt.pow > 0) { tgt.pow -= 1; L.push({ t: `⚡ ${nm(tgt)} loses 1◆.` }); } break;
      case "brand": plus1("Doombrand sears"); tgt.brandRound = G.current.round + 1; L.push({ t: `⏳ The fuse shortens — detonation end of round ${tgt.brandRound}.` }); break;
      case "consec": plus1("Consecration flares"); setTerrain(src.pos, "hall", L, "✦ Sanctuary"); break;
      case "censure": plus1("Censure"); tgt.noGain = true; L.push({ t: `⚖ The Light disapproves — ${nm(tgt)} gains no ◆ this round.` }); break;
      case "mount": plus1("Mountainfall aftershock"); setTerrain(tgt.pos, "dom", L, "⛰ Dominion"); break;
      case "chainX": plus1("Chain follow-through"); src.flow = true; L.push({ t: `✦ ${nm(src)} keeps the Flow.` }); break;
      // everything else: the point
      default: plus1(); break;
    }
  };
  const wardAdv = (warder, atk, wPlan, L, followups) => {
    if (G.current.stats) G.current.stats.adv[warder === G.current.P ? "P" : "A"] += 1;
    const plus1 = (label) => attackDamage(warder, atk, 1, L, label || "Sharpened riposte", "ward");
    switch (wPlan.ab) {
      // signature wards: +1 counter AND effect
      case "gloom": plus1("Gloomveil counter"); addPoison(atk, 1, L); followups.push({ kind: "step", who: warder.fk, opts: ADJ[warder.pos], label: "Gloomveil: step adjacent" }); break;
      case "blackout": plus1("Blackout counter"); addPoison(atk, 1, L); break;
      case "puppet": plus1("Puppet Pull counter"); addCurse(warder, atk, 1, L); break;
      case "claim": plus1("Bedrock counter"); { const adj = ADJ[warder.pos].filter((q) => G.current.terrain[q]?.kind !== "dom"); if (adj.length) G.current.prompts.push({ kind: "terr", tkind: "dom", who: warder.fk, opts: adj, label: "Bedrock: convert an adjacent quadrant" }); } break;
      case "hawk": plus1("Hawk's Eye counter"); L.push({ t: `🎯 ${nm(atk)} is MARKED.` }); break;
      case "eguard": plus1("Edgeguard counter"); warder.flow = true; L.push({ t: `✦ ${nm(warder)} gains Flow.` }); break;
      case "oath": plus1("Bulwark Oath counter"); warder._noKB = true; L.push({ t: `⚓ The Oath holds — nothing moves him this round.` }); break;
      // everything else: the sharper riposte
      default: plus1(); break;
    }
  };
  const wardBase = (warder, plan, L) => {
    if (plan.ab === "hoar") setTerrain(warder.pos, "frost", L, "❄ Frost");
    if (plan.ab === "mantle") healUp(warder, 1, L, "Winter's Mantle");
    if (plan.ab === "frame" && warder.pow >= 3) healUp(warder, 1, L, "Bulwark Frame vents");
    if (plan.ab === "gyro") warder._noKB = true;
    if (plan.ab === "aegis") { healUp(warder, 1, L, "Aegis of the Vigil"); warder._noKB = true; warder._aegisHeld = true; }
    if (plan.ab === "knit") healUp(warder, 1, L, "Gristle-Knit");
    if (plan.ab === "claim") setTerrain(warder.pos, "dom", L, "⛰ Dominion");
    if (plan.ab === "wall") { warder._noKB = true; if (G.current.terrain[warder.pos]?.kind === "dom") warder._ironActive = true; }
    if (plan.ab === "current") healUp(warder, 1, L, "Renewing Current");
    if (plan.ab === "whirlA") G.current.prompts.push({ kind: "terr", tkind: "whirl", who: warder.fk, opts: QUADS, label: "Whirlpool: churn a quadrant" });
    if (plan.ab === "hawk") G.current.prompts.push({ kind: "kess", who: warder.fk, opts: ADJ[G.current.kessQ] || QUADS, label: "Hawk's Eye: wing Kess (adjacent)" });
    if (plan.ab === "riposte") { warder.flow = true; L.push({ t: `✦ ${nm(warder)} draws into stance — Flow.` }); }
    if (plan.ab === "tap" && warder.hp > 1) {
      warder.hp -= 1;
      if (warder.pass === "knock") { warder.knocks = (warder.knocks || 0) + 1; if (warder.knocks === 3) L.push({ t: `🚪 Knock, knock.` }); }
      L.push({ t: `🩸 Life Tap — ${nm(warder)} trades 1 blood for power.` });
      if (warder.pass === "surplus") gainPow(warder, 1, L, "Blood Surplus");
      gainPow(warder, 1, L, "Life Tap");
    }
  };

  /* ---- AI ---- */
  const aiMakePlan = (ai, human, isClash, humanPlanForUmbral) => {
    const gT = G.current;
    const diffMode = gT?.diff || "proving";
    const hist = gT?.pHist || [];
    const predictType = () => {
      if (!hist.length) return null;
      const freq = {}; hist.forEach((t, i) => { freq[t] = (freq[t] || 0) + (diffMode === "crucible" && i >= hist.length - 3 ? 2 : 1); });
      const last = hist[hist.length - 1];
      if (hist.length >= 3) {
        const trans = {};
        for (let i = 0; i + 1 < hist.length; i++) if (hist[i] === last) trans[hist[i + 1]] = (trans[hist[i + 1]] || 0) + 1;
        const top = Object.entries(trans).sort((a, b) => b[1] - a[1])[0];
        if (top && top[1] >= 2) return top[0];
      }
      return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
    };
    const predT = diffMode === "proving" ? null : predictType();
    const T = (q) => gT?.terrain?.[q]?.kind;
    const comboBias = (id) => {
      const f = ai.fk, hpn = human;
      if (f === "M" && id === "heart" && hpn.poison >= 2) return 8;
      if (f === "M" && id === "viper" && hpn.poison === 0) return 3;
      if (f === "Z" && id === "tap" && ai.pow <= 1 && ai.hp > 4) return 6;
      if (f === "Z" && id === "doom" && !hpn.brandRound) return 5;
      if (f === "Z" && id === "dark" && ai.hp <= ai.maxHp - 3) return 4;
      if (f === "Y" && id === "storm" && ai.pow >= 3) return 6;
      if (f === "Y" && (id === "lash" || id === "bwater") && ["whirl", "surf"].includes(T(hpn.pos))) return 5;
      if (f === "W" && id === "pin" && !hpn.rooted) return 4;
      if (f === "W" && (id === "sky" || id === "broad") && (hpn.rooted || (hpn.mark || 0) > 0)) return 6;
      if (f === "L" && id === "consec" && T(hpn.pos) !== "hall") return 5;
      if (f === "L" && id === "dawn" && ai.pow >= 3) return 6;
      if (f === "L" && id === "llance" && T(hpn.pos) === "hall") return 5;
      if (f === "O" && id === "sorrow" && (hpn.curse || 0) >= 3) return 8;
      if (f === "O" && (id === "stick" || id === "eye") && (hpn.curse || 0) < 3) return 3;
      if (f === "X" && ["arsenal", "cadence", "chainX"].includes(id) && ai.flow) return 5;
      if (f === "X" && (id === "eguard" || id === "riposte") && !ai.flow) return 3;
      if (f === "C" && id === "pyre" && (hpn.burn || 0) >= 2) return 5;
      if (f === "V" && id === "spike" && hpn.chill) return 5;
      if (f === "K" && ai.pow === 3 && ABILITIES[id].cost > 0) return 4;
      if (f === "G" && id === "harvest" && ai.pow >= 3) return 5;
      return 0;
    };
    const comboScale = diffMode === "crucible" ? 1 : diffMode === "gauntlet" ? 0.7 : 0.4;
    const wantHold = diffMode === "crucible" && [...ai.load].some((id) => ABILITIES[id].cost === ai.pow + 1 && comboBias(id) >= 5);
    if (gT?.tut) {
      const R = resolveRail(gT);
      if (R && R.foe.ab) {
        const fab = ABILITIES[R.foe.ab];
        return { ab: R.foe.ab, soft: false, moveTo: isClash ? ai.pos : R.foe.moveTo, target: fab.needsTarget ? (isClash ? human.pos : R.foe.target || human.pos) : null, splash: fab.needsSplash ? rnd(ADJ[human.pos]) : null, secondary: fab.needsSecondary ? rnd(QUADS.filter((q) => q !== human.pos)) : null };
      }
    }
    const opts = [];
    [...ai.load].forEach((id) => {
      if (id === "heart" && human.poison === 0) return;
      const ab = ABILITIES[id];
      let cost = ab.cost;
      if (ai.fk === "K" && ai.pass === "overclock" && ai.pow === 3) cost = Math.max(0, cost - 1);
      if (ai.pow >= cost) opts.push({ ab: id, soft: false });
    });
    const weighted = [];
    opts.forEach((o) => {
      const ab = ABILITIES[o.ab];
      let w = 2;
      if (ab.dmg >= 2) w = 4;
      if ((ab.cost >= 3 || o.ab === "aval" || o.ab === "pyre") && ai.pow >= 3) w = 7;
      if (o.ab === "viper" || o.ab === "cinder" || o.ab === "lance") w = 5;
      if (predT) {
        if (BEATS[ab.type] === predT) w += diffMode === "crucible" ? 6 : 4;
        else if (ab.type === predT) w += 1;
        else if (BEATS[predT] === ab.type) w = Math.max(1, w - 2);
      }
      if (diffMode !== "proving" && human.pow >= 3) {
        const humanNuke = human.load.some((x) => ABILITIES[x].cost >= 3);
        const humanBreakNuke = humanNuke && human.load.some((x) => ABILITIES[x].cost >= 3 && ABILITIES[x].type === "break");
        if (diffMode === "crucible" && humanBreakNuke) { if (ab.type === "rush") w += 5; }
        else if (humanNuke && ab.type === "ward") w += diffMode === "crucible" ? 5 : 3;
      }
      w += Math.round(comboBias(o.ab) * comboScale);
      if (gT?.aiPrev && gT.aiPrev[0] === o.ab && gT.aiPrev[1] === o.ab) w = Math.max(1, w - 3);
      if (wantHold) { if (ab.cost > 0) w = Math.max(1, w - 3); else w += 2; }
      for (let i = 0; i < w; i++) weighted.push(o);
    });
    let pick = null;
    if (isClash && diffMode === "crucible") {
      const loadTypes = [...new Set(human.load.map((x) => ABILITIES[x].type))];
      const safe = ["break", "rush", "ward"].filter((t) => loadTypes.every((x) => BEATS[x] !== t));
      const want = safe.find((t) => loadTypes.includes(BEATS[t])) || safe[0] || (predT ? Object.keys(BEATS).find((t) => BEATS[t] === predT) : null);
      if (want) pick = opts.find((o) => ABILITIES[o.ab].type === want) || null;
    }
    if (!pick && isClash && diffMode === "gauntlet" && predT) {
      pick = opts.find((o) => BEATS[ABILITIES[o.ab].type] === predT) || null;
    }
    if (!pick) pick = rnd(weighted);
    const ab = ABILITIES[pick.ab];
    const plan = { ab: pick.ab, soft: pick.soft, moveTo: ai.pos, target: null, splash: null, secondary: null };
    if (ab.dual) plan.form = rnd(Object.keys(ab.dual));
    if (!isClash) {
      if (ai.rooted) plan.moveTo = ai.pos;
      else if (ab.umbral && humanPlanForUmbral) {
        const dodge = [ai.pos, ...ADJ[ai.pos]].filter((q) => q !== humanPlanForUmbral.target);
        plan.moveTo = dodge.length ? rnd(dodge) : ai.pos;
      } else if (G.current.aiForcedMove) {
        plan.moveTo = G.current.aiForcedMove;
      } else if (ai.pass === "rider" && Math.random() < 0.5 && QUADS.some((q) => ["whirl", "surf"].includes(G.current.terrain[q]?.kind) && q !== ai.pos)) {
        plan.moveTo = rnd(QUADS.filter((q) => ["whirl", "surf"].includes(G.current.terrain[q]?.kind) && q !== ai.pos));
      } else if (ai.fk === "L" && G.current.relics?.board.length && Math.random() < 0.7) {
        const rq = G.current.relics.board[0];
        plan.moveTo = ai.pos === rq ? rq : ADJ[ai.pos].includes(rq) ? rq : ADJ[ai.pos].find((x) => ADJ[x].includes(rq)) || rnd([ai.pos, ...ADJ[ai.pos]]);
      } else plan.moveTo = rnd([ai.pos, ai.pos, ...ADJ[ai.pos]]);
      if (diffMode === "crucible" && predT && BEATS[ABILITIES[plan.ab].type] === predT && ADJ[ai.pos].includes(human.pos) && Math.random() < 0.35 && !ai.rooted) plan.moveTo = human.pos;
      if (ab.needsTarget) {
        const aimP = diffMode === "crucible" ? 0.9 : diffMode === "gauntlet" ? 0.8 : 0.65 + ((ai.hp - human.hp) >= 5 ? -0.1 : (ai.hp - human.hp) <= -5 ? 0.08 : 0);
        plan.target = human.rooted ? human.pos : Math.random() < aimP ? human.pos : rnd(ADJ[human.pos]);
        if (ab.needsSplash) plan.splash = rnd(ADJ[plan.target]);
        if (ab.needsSecondary) plan.secondary = rnd(QUADS.filter((q) => q !== plan.target));
      }
    }
    gT.aiPrev = [gT?.aiPrev?.[1], plan.ab];
    return plan;
  };

  /* ---- playback ---- */
  const playLines = (lines, done) => {
    G.current.phase = "playing";
    pendingRef.current = { lines, i: 0, done };
    rerender(); stepPlay();
  };
  const stepPlay = () => {
    const p = pendingRef.current;
    if (!p) return;
    if (p.i >= p.lines.length) { pendingRef.current = null; p.done(); return; }
    const line = p.lines[p.i++];
    if (line.t) G.current.feed.push(line);
    fireFx(line.fx);
    rerender();
    const d = REDUCED ? 140 : line.fx ? (line.fx.kind === "hit" ? 850 : 720) : 560;
    later(stepPlay, d);
  };
  const skipPlay = () => {
    const p = pendingRef.current;
    if (!p) return;
    clearTimers();
    while (p.i < p.lines.length) { const l = p.lines[p.i++]; if (l.t) G.current.feed.push(l); }
    pendingRef.current = null; rerender(); p.done();
  };

  /* ---- prompts ---- */
  const processPrompts = () => {
    const g = G.current;
    while (g.prompts.length) {
      const p = g.prompts[0];
      if (p.who === g.P.fk) { g.phase = "prompt"; rerender(); return; }
      g.prompts.shift();
      applyChoice(p, aiPickOpt(p));
    }
    if (g.after === "finish") { g.after = "end"; finishRound(); }
    else endOfRound();
  };
  const aiPickOpt = (p) => {
    const g = G.current;
    if (p.kind === "kb" || p.kind === "placeFoe") {
      const A = g.A, v = g.P;
      if (A.fk === "G" && A.pass === "scent" && p.opts.includes(v.pos) && A.pos === v.pos) return v.pos;
      const hazard = p.opts.find((q) => q !== v.pos && ["frost", "scorch", "env", "mire", "whirl", "surf"].includes(g.terrain[q]?.kind));
      if (hazard) return hazard;
      const moves = p.opts.filter((q) => q !== v.pos);
      return moves.length ? rnd(moves) : rnd(p.opts);
    }
    return rnd(p.opts);
  };
  const wreckSlam = (thrower, victim, L) => {
    if (thrower.fk !== "G") return;
    const g = G.current;
    const t = g.terrain[victim.pos];
    if (t) {
      const name = { frost: "ice", scorch: "embers", env: "poison pools", mire: "mire", hall: "sanctuary ground", whirl: "whirlpool", surf: "breakers", dom: "stone" }[t.kind] || "terrain";
      delete g.terrain[victim.pos];
      dealRaw(victim, 1, L, `WRECKING THROW — slammed through the ${name}`, "break", "#dc2626");
      L.push({ t: `💥 The ${name} at ${victim.pos} is destroyed.`, fx: { kind: "combo", text: "WRECKED" } });
    }
    if (g.kessQ === victim.pos) { g.kessStun = g.round + 1; L.push({ t: `🦅 Kess is knocked from the air — stunned for a round.` }); }
    if (g.undineQ === victim.pos) { g.undineStun = g.round + 1; L.push({ t: `🌊 The Undine is scattered — stunned for a round.` }); }
  };
  const applyChoice = (p, q) => {
    const g = G.current;
    const actor = g.P.fk === p.who ? g.P : g.A;
    if (p.kind === "grind") { g.terrain[q] = { kind: "dom", until: 9999 }; g.feed.push({ t: `⛰ ${q} is paved into Dominion.` }); }
    else if (p.kind === "terr") {
      const L2 = []; setTerrain(q, p.tkind, L2, p.tkind === "whirl" ? "🌀 Whirlpool" : "⛰ Dominion");
      if (p.tkind === "whirl") { const foe = [g.P, g.A].find((f) => f.fk !== "Y" && f.hp > 0 && ADJ[q].includes(f.pos) && !held(f)); if (foe) { foe.pos = q; L2.push({ t: `🌀 The vortex opens — ${nm(foe)} is YANKED in.` }); } }
      L2.forEach((l) => g.feed.push(l));
    }
    else if (p.kind === "kess") { g.kessQ = q; g.feed.push({ t: `🦅 Kess wings to ${q}.` }); const wF = [g.P, g.A].find((f) => f.fk === "W"); if (wF && wF.pass === "talon" && other(wF).pos === q) { const LL = []; dealRaw(other(wF), 1, LL, "Talon dive", "rush", elOf(wF), true); LL.forEach((l) => g.feed.push(l)); } }
    else if (p.kind === "undine") { g.undineQ = q; g.undineUntil = g.roundJustPlayed + 3; g.feed.push({ t: `🌊 The Undine rises in ${q}.` }); }
    else if (p.kind === "kb") {
      const v = other(actor);
      if (q === v.pos) { g.feed.push({ t: `✊ ${nm(actor)} holds ${nm(v)} right where they are.` }); }
      else if (held(v)) { g.feed.push({ t: `⚓ ${nm(v)} holds — no knockback.` }); }
      else {
        v.pos = q; v._kbThis = true;
        g.feed.push({ t: `↩ ${nm(v)} is hurled into ${q}.` });
        if (actor.fk === "Y" && actor.pass === "undertow" && ["whirl", "surf"].includes(g.terrain[q]?.kind)) { const L2 = []; dealRaw(v, 1, L2, "Undertow — dragged under", "rush", "#0d9488"); L2.forEach((l) => { g.feed.push(l); fireFx(l.fx); }); }
        { const L2 = []; wreckSlam(actor, v, L2); L2.forEach((l) => { g.feed.push(l); fireFx(l.fx); }); }
        if (actor.fk === "G" && actor.pass === "scent" && q !== actor.pos) {
          const opts = Array.from(new Set([...ADJ[actor.pos], q, actor.pos]));
          g.prompts.unshift({ kind: "step", who: "G", opts, label: "Scent of Blood — chase, LUNGE to them, or hold your ground" });
        }
      }
    } else if (p.kind === "step") { if (q === actor.pos) g.feed.push({ t: `✋ ${nm(actor)} holds — nose to the wind.` }); else { actor.pos = q; g.feed.push({ t: `→ ${nm(actor)} steps to ${q}.` }); } }
    else if (p.kind === "enpoison") { g.terrain[q] = { kind: "env", until: g.roundJustPlayed + 1 }; g.feed.push({ t: `🧪 A poisoned dagger sticks in ${q}.` }); }
    else if (p.kind === "gift") {
      const L2 = [];
      if (q === "heal") healUp(actor, 1, L2, "Relic"); else gainPow(actor, 1, L2, "Relic");
      L2.forEach((l) => { g.feed.push(l); fireFx(l.fx); });
    }
    else if (p.kind === "placeSelf") { actor.pos = q; g.feed.push({ t: `⚑ ${nm(actor)} claims ${q}.` }); }
    else if (p.kind === "placeFoe") {
      const v = other(actor);
      if (held(v)) g.feed.push({ t: `⚓ ${nm(v)} cannot be moved.` });
      else { v.pos = q; v._kbThis = true; g.feed.push({ t: `⚑ ${nm(v)} is hurled into ${q}.` }); const L2 = []; wreckSlam(actor, v, L2); if (actor.fk === "Y" && actor.pass === "undertow" && ["whirl", "surf"].includes(g.terrain[q]?.kind)) dealRaw(v, 1, L2, "Undertow — dragged under", "rush", "#0d9488"); L2.forEach((l) => { g.feed.push(l); fireFx(l.fx); }); }
    }
    rerender();
  };
  const answerPrompt = (q) => {
    const g = G.current;
    const p = g.prompts.shift();
    applyChoice(p, q);
    processPrompts();
  };

  /* ---- round finish ---- */
  const finishRound = () => {
    const g = G.current;
    const L = [];
    [g.P, g.A].forEach((s) => {
      if (!s._nova) return;
      s._nova = false;
      const foe = other(s);
      L.push({ t: `⚡ DISCHARGE NOVA — the last of the charge blasts outward.`, fx: { kind: "combo", text: "NOVA" } });
      if (foe.pos === s.pos && foe.hp > 0) dealRaw(foe, 1, L, "Nova blast", "break", "#a78bfa");
      if (g.kessQ === s.pos && foe.fk === "W") { g.kessStun = g.round + 1; L.push({ t: `🦅 Kess is blasted from the air — stunned.` }); }
      if (g.undineQ === s.pos && foe.fk === "Y") { g.undineStun = g.round + 1; L.push({ t: `🌊 The Undine is scattered — stunned.` }); }
      if (g.terrain[s.pos]) { const k = TERRA_META[g.terrain[s.pos].kind]?.name || "ground"; delete g.terrain[s.pos]; L.push({ t: `⚡ The ${k} beneath him is scoured away.` }); }
    });
    const knocker = [g.P, g.A].find((f) => f.pass === "knock");
    if (knocker && (knocker.knocks || 0) >= 3) {
      knocker.knocks = 0;
      const rq = QUADS[Math.floor(Math.random() * QUADS.length)];
      L.push({ t: `🚪 Knock, knock. Who's there?` });
      const victims = [g.P, g.A].filter((f) => f.pos === rq);
      G.current._clawStrike = true;
      if (victims.length) { L.push({ t: `👹 The Door answers — a nether claw lashes ${rq}!` }); victims.forEach((f) => dealRaw(f, 2, L, "The Claw", "rush", "#d946ef")); }
      else L.push({ t: `👹 The Door answers — the claw rakes empty stone at ${rq}.` });
      G.current._clawStrike = false;
      g.clawHit = { q: rq, r: g.roundJustPlayed };
    [g.P, g.A].forEach((s) => {
      if (s._spent) {
        if (s.fk === "D" && g.terrain[s.pos]?.kind === "dom") gainPow(s, 1, L, "Dominion — the ground provides");
        else L.push({ t: `${nm(s)} spent this round — no ◆.` });
      } else gainPow(s, 1, L, "end of round");
      if (s.fk === "K" && s.pow >= powCap(s)) { s.charge = Math.min(3, (s.charge || 0) + 1); L.push({ t: `⚡ OVERCHARGE builds — ${nm(s)} holds full charge (${s.charge}).` }); }
      s.noGain = false;
    });
    // terrain effects on occupants
    [g.P, g.A].forEach((s) => {
      const t = g.terrain[s.pos];
      if (!t) return;
      if (t.kind === "env" && s.fk !== "M") addPoison(s, 1, L);
      if (t.kind === "frost" && s.fk !== "V") addChill(s, L);
      if (t.kind === "scorch" && s.fk !== "C") addBurn(other(s), s, L);
      if (t.kind === "mire" && s.fk !== "O") addCurse(other(s), s, 1, L);
      if (t.kind === "hall") { if (s.fk === "L") healUp(s, 1, L, "Sanctuary"); else dealRaw(s, 1, L, "Sanctuary sears", "ward", "#eab308"); }
      if (t.kind === "dom" && s.fk !== "D") {
        const dF = other(s);
        if (dF.fk === "D" && dF.pass === "home") dealRaw(s, 1, L, "Homefield — the ground rejects them", "break", "#d97706");
      }
    });
    let waterBit = false;
    // Whirlpool grinds
    [g.P, g.A].forEach((s) => {
      if (s.fk !== "Y" && s.hp > 0 && g.terrain[s.pos]?.kind === "whirl") { dealRaw(s, 1, L, "The vortex grinds", "rush", "#0d9488"); waterBit = true; }
    });
    // Crashing Surf batters and expels
    [g.P, g.A].forEach((s) => {
      if (s.fk !== "Y" && s.hp > 0 && g.terrain[s.pos]?.kind === "surf") {
        dealRaw(s, 1, L, "The surf batters", "break", "#22d3ee"); waterBit = true;
        if (s.hp > 0 && !held(s)) { const to = rnd(ADJ[s.pos]); s.pos = to; s._kbThis = true; L.push({ t: `🌊 The wave hurls ${nm(s)} to ${to}.` }); }
        else if (s.hp > 0) L.push({ t: `⚓ ${nm(s)} holds against the surf.` });
      }
    });
    // Undine
    if (g.undineQ && !(g.undineStun >= g.roundJustPlayed)) {
      [g.P, g.A].forEach((s) => {
        if (s.fk !== "Y" && s.pos === g.undineQ) { dealRaw(s, 1, L, "The Undine lashes", "rush", "#0d9488"); waterBit = true; }
        if (s.fk === "Y" && s.pos === g.undineQ && g.undineHeals) healUp(s, 1, L, "Undine's mending");
      });
    }
    if (g.undineQ) {
      if (g.roundJustPlayed >= g.undineUntil) { g.undineQ = null; L.push({ t: "🌊 The Undine loses its shape and drains away." }); }
    }
    {
      const yEbb = [g.P, g.A].find((f) => f.fk === "Y" && f.pass === "ebb" && f.hp > 0);
      if (waterBit && yEbb && !yEbb.flow) { yEbb.flow = true; L.push({ t: `✦ Ebb & Flow — the tide feeds ${nm(yEbb)}.` }); }
    }
    // Kess marks
    if (g.kessQ && !(g.kessStun >= g.roundJustPlayed)) {
      [g.P, g.A].forEach((s) => {
        if ((s._skyBarrage || 0) > 0) {
          s._skyBarrage--;
          const bq = rnd(QUADS); const bfoe = other(s);
          L.push({ t: `☄ Skyfall lands on ${bq}.` }); g.skyHit = { q: bq, r: g.roundJustPlayed };
          if (bfoe.pos === bq) { dealRaw(bfoe, 2, L, "Skyfall Volley", "rush", elOf(s), true); bfoe.mark = Math.min(2, (bfoe.mark || 0) + 1); bfoe.markUntil = g.roundJustPlayed + 1; L.push({ t: `🎯 The volley MARKS ${nm(bfoe)}.` }); }
        }
        if (s.fk !== "W" && s.pos === g.kessQ && (s.mark || 0) === 0) { s.mark = 1; s.markUntil = g.roundJustPlayed + 1; L.push({ t: `🎯 Kess screams — ${nm(s)} is MARKED.`, fx: { kind: "chill", side: sideKeyOf(s) } }); }
      });
    }
    // Dominion demolition & victory
    [g.P, g.A].forEach((s) => {
      if (s.fk !== "D" && s.usedBreak && g.terrain[s.pos]?.kind === "dom") {
        delete g.terrain[s.pos];
        L.push({ t: `⛰ ${nm(s)}'s Break DEMOLISHES the Dominion at ${s.pos}.`, fx: { kind: "combo", text: "DEMOLISHED" } });
      }
    });
    {
      const dF = [g.P, g.A].find((f) => f.fk === "D");
      const allDom = dF && QUADS.every((q) => g.terrain[q]?.kind === "dom");
      if (allDom && g.domPending && g.roundJustPlayed > g.domPending) {
        L.push({ t: `⛰ THE ARENA IS HIS — the Dominion holds. Total victory.`, fx: { kind: "combo", text: "DOMINION" } });
        g.altWin = dF === g.P ? "P" : "A";
      } else if (allDom && !g.domPending && g.roundJustPlayed < 10) {
        g.domPending = g.roundJustPlayed;
        L.push({ t: `⛰ THE ARENA KNEELS — all four quadrants are his. Break a tile within one round, or kneel with it.`, fx: { kind: "combo", text: "THE ARENA KNEELS" } });
      } else if (!allDom && g.domPending) {
        g.domPending = null;
        L.push({ t: `⛰ The hold is BROKEN — the arena breathes again.` });
      }
    }
    // Doombrand detonation
    [g.P, g.A].forEach((s) => {
      if (s.brandRound && g.roundJustPlayed >= s.brandRound) {
        s.brandRound = 0;
        dealRaw(s, 3, L, "DOOMBRAND detonates", "break", "#a855f7");
        L.push({ t: "", fx: { kind: "combo", text: "DOOMBRAND" } });
      }
    });
    // Curse collection (endgame)
    [g.P, g.A].forEach((s) => {
      const foe = other(s);
      const start = foe.fk === "O" && foe.pass === "mdeep" ? 7 : 8;
      if (foe.fk === "O" && (s.curse || 0) >= 3 && g.roundJustPlayed >= start) {
        const n = Math.min(2, Math.floor(s.curse / 3));
        dealRaw(s, n, L, "The Curses collect", "rush", "#a3e635");
      }
    });
    // Relic claims
    if (g.relics && g.relics.board.length) {
      g.relics.board = g.relics.board.filter((q) => {
        const pOn = g.P.pos === q, aOn = g.A.pos === q;
        if (pOn && aOn) {
          const kas = [g.P, g.A].find((f) => f.fk === "L" && f._aegisHeld);
          if (kas) {
            g.relics.claims += 1;
            L.push({ t: `✦ CONTESTED — but the Vigil outlasts. ${nm(kas)} claims the relic at ${q} (${g.relics.claims}/3).`, fx: { kind: "combo", text: `RELIC ${g.relics.claims}/3` } });
            if (g.relics.claims >= 3) g.altWin = kas === g.P ? "P" : "A";
            return false;
          }
          L.push({ t: `✦ Both stand on the relic at ${q} — contested, unclaimed.` }); return true;
        }
        const f = pOn ? g.P : aOn ? g.A : null;
        if (!f) return true;
        if (f.fk === "L") {
          g.relics.claims += 1;
          L.push({ t: `✦ ${nm(f)} claims the relic at ${q} (${g.relics.claims}/3).`, fx: { kind: "combo", text: `RELIC ${g.relics.claims}/3` } });
          if (g.relics.claims >= 3) g.altWin = f === g.P ? "P" : "A";
        } else {
          L.push({ t: `✦ ${nm(f)} desecrates the relic at ${q} — it is destroyed.` });
          const L2 = []; healUp(f, 1, L2, "Relic"); L2.forEach((l) => L.push(l));
        }
        return false;
      });
    }
    }
    // burn ticks
    [g.P, g.A].forEach((s) => {
      if (s.burn > 0) {
        dealRaw(s, 1, L, "Burning", "rush", "#f97316");
        if ((s._burnFresh || 0) > 0) s._burnFresh -= 1; else s.burn -= 1;
        const foe = other(s);
        if (foe.fk === "C" && foe.pass === "heatrise") gainPow(foe, 1, L, "Heat Rising");
      }
    });
    // numbing aura
    [g.P, g.A].forEach((s) => {
      if (s.fk === "V" && s.pass === "numb" && other(s).pos === s.pos && !other(s).chill) addChill(other(s), L);
    });
    // expiries
    QUADS.forEach((q) => { const t = g.terrain[q]; if (t && g.roundJustPlayed >= t.until) { delete g.terrain[q]; } });
    g.curseHealed = false;
    [g.P, g.A].forEach((s) => {
      if (s.chill && g.roundJustPlayed >= s.chillUntil) s.chill = false;
      if (s.weak > 0) { if (s._weakFresh) s._weakFresh = false; else s.weak -= 1; }
      if (s.mark && g.roundJustPlayed >= s.markUntil) s.mark = 0;
      s.usedBreak = false;
      s.rooted = !!s._rootNext; s._rootNext = false;
      s.kbLast = !!s._kbThis;
      delete s._kbThis; delete s._spent; delete s._ironActive; delete s._noKB; delete s._warding; delete s._powered; delete s._aegisHeld; delete s._nova; delete s._powSpent;
    });
    playLines(L, processPrompts);
  };
  const endOfRound = () => {
    const g = G.current;
    if (g.tut) { [g.P, g.A].forEach((sf) => { if (sf.hp < 1) sf.hp = 1; }); g.altWin = null; }
    g.history.unshift({ r: g.roundJustPlayed, vs: g.vs, lines: g.feed.map((l) => l.t).filter(Boolean) });
    g.history = g.history.slice(0, 12);
    if (g.altWin) { g.winner = g.altWin; g.phase = "over"; rerender(); return; }
    const pd = g.P.hp <= 0, ad = g.A.hp <= 0;
    if (pd && ad) g.phase = "sudden";
    else if (pd) { g.winner = "A"; g.phase = "over"; }
    else if (ad) { g.winner = "P"; g.phase = "over"; }
    else if (g.round >= 10) {
      if (g.P.hp > g.A.hp) { g.winner = "P"; g.phase = "over"; }
      else if (g.A.hp > g.P.hp) { g.winner = "A"; g.phase = "over"; }
      else g.phase = "sudden";
    } else {
      if (g.tut && g.round >= ((TUTS[g.P.fk]?.rails || []).length)) { g.winner = "LESSON"; g.phase = "over"; rerender(); return; }
      g.round += 1;
      g.feed = [];
      g.aiForcedMove = null;
      if (g.A._tolled) {
        g.A._tolled = false;
        g.aiForcedMove = g.A.rooted ? g.A.pos : rnd([g.A.pos, ...ADJ[g.A.pos]]);
        g.feed.push({ t: `👁 Watcher's Toll — the foe has committed to ${g.aiForcedMove}.` });
      }
      if ([2, 4, 6, 8].includes(g.round) && (g.P.fk === "L" || g.A.fk === "L") && g.relics.spawned < 4) {
        const open = QUADS.filter((q) => q !== g.P.pos && q !== g.A.pos && !g.relics.board.includes(q));
        if (open.length) {
          const q = rnd(open);
          g.relics.board.push(q); g.relics.spawned += 1;
          g.feed.push({ t: `✦ A Holy Relic manifests in ${q}.` });
          showBanner("A RELIC MANIFESTS", q);
          const kas = g.P.fk === "L" ? g.P : g.A;
          if (kas.pass === "pilgrim") {
            const dest = ADJ[kas.pos].includes(q) ? q : ADJ[kas.pos].find((x) => ADJ[x].includes(q)) || ADJ[kas.pos][0];
            kas.pos = dest;
            g.feed.push({ t: `✦ Pilgrim's Stride — ${nm(kas)} steps to ${dest}.` });
          }
        }
      }
      if (CLASH_ROUNDS.includes(g.round)) { g.phase = "clashIntro"; setCutin(true); later(() => { setCutin(false); afterCutin(); }, REDUCED ? 500 : 1700); }
      else { g.phase = "plan"; showBanner(`ROUND ${g.round}`, "plan in secret"); resetSel(g); }
    }
    rerender();
  };

  /* ---- normal round ---- */
  const resolveRound = (pPlan, aPlan) => {
    const g = G.current;
    g.roundJustPlayed = g.round;
    g.feed = [];
    const L = [];
    const P = g.P, A = g.A;
    [[P, pPlan], [A, aPlan]].forEach(([s, pl]) => {
      const ab = ABILITIES[pl.ab];
      let c = pl.soft && ab.soft ? ab.soft.cost : ab.cost;
      if (pl.string) c = ab.cost + (s.pass === "flowing" ? 0 : 1);
      if (pl.pivoted) { c += 1; L.push({ t: `⇄ ${nm(s)} pays 1◆ to pivot.` }); }
      if (s.fk === "K" && s.pass === "overclock" && s.pow === 3 && c > 0) { c -= 1; L.push({ t: "⚙ Overclock discounts the cost." }); }
      if (c > 0) {
        const wasFull = s.pow >= powCap(s);
        if (G.current.tut && s.pow < c) s.pow = c; s.pow -= c; s._spent = true;
        if (s.fk === "K") {
          if (wasFull) s._powered = true;
          if ((s.charge || 0) > 0 && ab.type !== "ward") { const burn = s.charge; s.charge = 0; dealRaw(s, burn, L, "OVERCHARGE vents through him", "break", "#a78bfa"); }
          if (s.pass === "nova" && s.pow === 0 && ab.type !== "ward") s._nova = true;
        }
      }
      const hc = ab.hpCost || 0;
      if (hc > 0) {
        const pay = Math.min(hc, s.hp - 1); s.hp -= pay;
        if (pay > 0 && s.pass === "knock") { s.knocks = (s.knocks || 0) + 1; if (s.knocks === 3) L.push({ t: `🚪 Knock, knock.` }); }
        L.push({ t: `🩸 ${nm(s)} pays ${pay} blood.`, fx: { kind: "glance", side: sideKeyOf(s), amt: pay, q: s.pos, ty: "break" } });
        if (s.pass === "surplus") gainPow(s, 1, L, "Blood Surplus");
      }
      if (pl.ab === "iron") s._ironActive = true;
      const effTy = pl.form || ab.type;
      if (effTy === "ward") s._warding = true;
      if (effTy === "break") s.usedBreak = true;
      s.roundStart = s.pos;
      if (s.rooted) { pl.moveTo = s.pos; s.rooted = false; L.push({ t: `⛓ ${nm(s)} is Rooted in ${s.pos}.` }); }
    });
    P.pos = pPlan.moveTo; A.pos = aPlan.moveTo;
    const abP = ABILITIES[pPlan.ab], abA = ABILITIES[aPlan.ab];
    const tP = pPlan.form || abP.type, tA = aPlan.form || abA.type;
    G.current.pHist = (G.current.pHist || []).concat(tP).slice(-8);
    L.push({ t: `ROUND ${g.round} — you: ${abP.name} [${TYPE_LABEL[tP]}]${pPlan.target ? " → " + pPlan.target : ""} · foe: ${abA.name} [${TYPE_LABEL[tA]}]${aPlan.target ? " → " + aPlan.target : ""}` });
    const pAtk = tP !== "ward", aAtk = tA !== "ward";
    if (pPlan.ab === "heart" && A.poison > 0 && pPlan.target !== A.pos) { pPlan.target = A.pos; L.push({ t: `🗡 The venom sings — Heartseeker turns in the air.` }); }
    if (aPlan.ab === "heart" && P.poison > 0 && aPlan.target !== P.pos) { aPlan.target = P.pos; L.push({ t: `🗡 The venom sings — the foe's Heartseeker turns in the air.` }); }
    let pHit = pAtk && pPlan.target === A.pos;
    let aHit = aAtk && aPlan.target === P.pos;
    const swapped = P.roundStart !== A.roundStart && P.pos === A.roundStart && A.pos === P.roundStart;
    const collided = P.pos === A.pos || swapped;
    if (collided) {
      G.current._colNow = true;
      L.push({ t: swapped ? "💥 They crash together mid-charge — COLLISION." : `💥 Point-blank in ${P.pos} — COLLISION.`, fx: { kind: "combo", text: "COLLISION" } });
      pHit = pAtk; aHit = aAtk;
      g.stats.col += 1;
    }
    if (pAtk) g.stats[pHit ? "dir" : "whiff"].P += 1;
    if (aAtk) g.stats[aHit ? "dir" : "whiff"].A += 1;
    const followups = g.prompts;
    if (!pAtk) wardBase(P, pPlan, L);
    if (!aAtk) wardBase(A, aPlan, L);

    const secondaries = (plan) => {
      const ab = ABILITIES[plan.ab];
      if (plan.ab === "pyre" && !plan.soft) return ADJ[plan.target];
      if (ab.needsSplash) return plan.splash ? [plan.splash] : [];
      if (ab.needsSecondary && !plan.soft) return plan.secondary ? [plan.secondary] : [];
      return [];
    };
    const secDmg = (plan) => {
      if (plan.ab === "pyre") return 2;
      if (plan.ab === "sky") return 2;
      if (ABILITIES[plan.ab].secDmg) return ABILITIES[plan.ab].secDmg;
      return plan._advSplash ? 2 : 1;
    };
    const applyContactStatus = (src, tgt, plan) => {
      if (tgt._warding) { L.push({ t: `🛡 ${nm(tgt)}'s guard keeps the effect off.` }); return; }
      if (plan.ab === "viper" || plan.ab === "twin") addPoison(tgt, 1, L);
      if (plan.ab === "lance") addChill(tgt, L);
      if (plan.ab === "cinder" || plan.ab === "magma") addBurn(src, tgt, L);
      if (plan.ab === "stick" || plan.ab === "eye") addCurse(src, tgt, 1, L);
      if (plan.ab === "dawn" && src.pass === "sanct") { tgt.rooted = true; L.push({ t: `⚖ HAMMER OF JUSTICE — ${nm(tgt)} is pinned where they stand.` }); }
    };
    const contactCheck = (src, plan) => {
      const ab = ABILITIES[plan.ab];
      const tgt = other(src);
      const secs = secondaries(plan);
      if (secs.includes(tgt.pos) && tgt.pos !== plan.target) {
        dealRaw(tgt, secDmg(plan), L, `${ab.name} secondary hit`, ab.type, elOf(src), true);
        if (plan.ab === "pyre") plan._pyreHit = true;
        applyContactStatus(src, tgt, plan);
      } else if (plan.target) L.push({ t: `${ab.name} finds only air — a clean whiff.` });
    };

    let winner = null, loser = null, winPlan = null, verdict = "NO CONTACT";
    if (pAtk && aAtk) {
      if (pHit && aHit) {
        if (tP === tA) {
          verdict = "TRADE";
          L.push({ t: "⚔ TRADE — same type, both land at base." });
          if (pHit) { /* mark pyre for adv symmetry */ pPlan._pyreHit = pPlan.ab === "pyre"; aPlan._pyreHit = aPlan.ab === "pyre"; }
          baseEffect(P, A, pPlan, L); baseEffect(A, P, aPlan, L);
        } else {
          const pWins = BEATS[tP] === tA;
          const w = pWins ? P : A, l = pWins ? A : P, wp = pWins ? pPlan : aPlan;
          wp._pyreHit = wp.ab === "pyre";
          verdict = `${TYPE_LABEL[pWins ? tP : tA]} BEATS ${TYPE_LABEL[pWins ? tA : tP]}`;
          L.push({ t: `⚡ ${TYPE_LABEL[pWins ? tP : tA]} beats ${TYPE_LABEL[pWins ? tA : tP]}.`, fx: { kind: "adv", text: `ADVANTAGE — ${nm(w).toUpperCase()}`, tone: FIGHTERS[w.fk].hex } });
          baseEffect(w, l, wp, L); advRider(w, l, wp, L, followups);
          winner = w; loser = l; winPlan = wp;
        }
      } else if (pHit || aHit) {
        const w = pHit ? P : A, l = pHit ? A : P, wp = pHit ? pPlan : aPlan;
        wp._pyreHit = wp.ab === "pyre";
        verdict = `CLEAN READ — ${nm(w).toUpperCase()}`;
        L.push({ t: `🎯 ${nm(w)} reads them completely — a clean hit, and they touch nothing but air.`, fx: { kind: "combo", text: `CLEAN HIT` } });
        baseEffect(w, l, wp, L);
        winner = w; loser = l; winPlan = wp;
        contactCheck(l, pHit ? aPlan : pPlan);
      } else { verdict = "BOTH WHIFF"; contactCheck(P, pPlan); contactCheck(A, aPlan); }
    } else if (pAtk || aAtk) {
      const atk = pAtk ? P : A, wrd = pAtk ? A : P;
      const atkPlan = pAtk ? pPlan : aPlan, wrdPlan = pAtk ? aPlan : pPlan;
      const hit = pAtk ? pHit : aHit;
      if (!hit) { verdict = "GUARDED"; contactCheck(atk, atkPlan); }
      else if ((atkPlan.form || ABILITIES[atkPlan.ab].type) === "rush") {
        verdict = "WARD CATCH";
        L.push({ t: `🛡 WARD catches the RUSH — and answers.`, fx: { kind: "adv", text: `ADVANTAGE — ${nm(wrd).toUpperCase()}`, tone: FIGHTERS[wrd.fk].hex } });
        attackDamage(wrd, atk, 1, L, "Riposte", "ward");
        if (wrdPlan.ab === "blackout") addPoison(atk, 1, L);
        if (wrdPlan.ab === "knit") addCurse(wrd, atk, 1, L);
        wardAdv(wrd, atk, wrdPlan, L, followups);
        winner = wrd; loser = atk; winPlan = wrdPlan;
      } else {
        atkPlan._pyreHit = atkPlan.ab === "pyre";
        verdict = "GUARD BREAK";
        wrd._aegisHeld = false;
        L.push({ t: `💢 BREAK shatters the WARD.`, fx: { kind: "adv", text: `ADVANTAGE — ${nm(atk).toUpperCase()}`, tone: FIGHTERS[atk.fk].hex } });
        baseEffect(atk, wrd, atkPlan, L); advRider(atk, wrd, atkPlan, L, followups);
        winner = atk; loser = wrd; winPlan = atkPlan;
      }
    } else { verdict = "DOUBLE GUARD"; L.push({ t: "Both fighters guard. The crowd howls for blood." }); }
    [[P, pPlan], [A, aPlan]].forEach(([src, pl]) => { if (pl.ab === "sky" && !(loser === src && winPlan && (winPlan.form || ABILITIES[winPlan.ab].type) === "rush")) { src._skyBarrage = 2; L.push({ t: `☄ ${nm(src)} looses SKYFALL — the sky is loaded for two more rounds.` }); G.current.prompts.push({ kind: "kess", who: src.fk, opts: ADJ[G.current.kessQ] || QUADS, label: "Skyfall: wing Kess (adjacent)" }); } });
    g.vs = { p: { n: abP.name, ty: tP, tq: pPlan.target }, a: { n: abA.name, ty: tA, tq: aPlan.target }, note: verdict, r: g.round };

    G.current._colNow = false;
    const advFired = winner && !verdict.startsWith("CLEAN READ");
    if (advFired && winner.pass === "momentum" && !winner.flow) { winner.flow = true; L.push({ t: `✦ Momentum — ${nm(winner)} gains Flow.` }); }
    if (winner && loser && loser.pass === "tempo" && verdict !== "WARD CATCH" && verdict !== "CLEAN READ") gainPow(loser, 1, L, "Steel Tempo");
    if (winner && loser && verdict === "WARD CATCH" && loser.pass === "tempo") gainPow(loser, 1, L, "Steel Tempo");
    // knockback
    const sanctHeld = (f) => (f.pass === "roots" && g.terrain[f.pos]?.kind === "dom");
    if (winner && loser && loser.hp > 0 && !loser._noKB && !sanctHeld(loser)) {
      if (winPlan?._kbFrost && frostQs().filter((q) => q !== loser.pos).length) {
        followups.push({ kind: "kb", who: winner.fk, opts: frostQs().filter((q) => q !== loser.pos), label: "Hurl them onto the ice" });
      } else if (winPlan?._kbAny) {
        followups.push({ kind: "kb", who: winner.fk, opts: QUADS, label: "Hurl them ANYWHERE — or hold them where they stand" });
      } else followups.push({ kind: "kb", who: winner.fk, opts: [...ADJ[loser.pos], loser.pos], label: "SHOVE — stagger them adjacent, or hold them where they stand" });
    } else if (winner && loser && (loser._noKB || sanctHeld(loser))) L.push({ t: `⚓ ${nm(loser)} holds — no knockback.` });

    // Flashfire Step aftermath
    [[P, pPlan], [A, aPlan]].forEach(([s, pl]) => {
      if (pl.ab === "flash" && s.hp > 0) {
        setTerrain(s.pos, "scorch", L, "🔥 Scorched ground");
        followups.push({ kind: "step", who: s.fk, opts: ADJ[s.pos], label: "Flashfire Step: slide to an adjacent quadrant" });
      }
    });
    // Longstride aftermath — Wrenna slides away
    [[P, pPlan], [A, aPlan]].forEach(([s, pl]) => {
      if (pl.ab === "strideW" && s.hp > 0) followups.push({ kind: "step", who: s.fk, opts: ADJ[s.pos], label: "Longstride: slip to an adjacent quadrant" });
    });
    // Puppet Pull aftermath — Marrow drags the enemy one quadrant
    [[P, pPlan], [A, aPlan]].forEach(([s, pl]) => {
      const foe = other(s);
      if (pl.ab === "puppet" && s.hp > 0 && foe.hp > 0) {
        followups.push({ kind: "placeFoe", who: s.fk, opts: ADJ[foe.pos], label: "Puppet Pull: drag them one quadrant" });
      }
    });
    g.after = "finish";
    playLines(L, processPrompts);
  };

  /* ---- clash ---- */
  const afterCutin = () => {
    const g = G.current;
    if (g.P.fk === "M" && g.P.pass === "craven" && !g.P.cravenUsed && g.P.pow >= 2) { g.phase = "craven"; rerender(); return; }
    aiCravenOrPlan();
  };
  const aiCravenOrPlan = () => {
    const g = G.current;
    if (g.A.fk === "M" && g.A.pass === "craven" && !g.A.cravenUsed && g.A.pow >= 2 && g.A.hp < g.P.hp) {
      g.A.cravenUsed = true; g.A.pow -= 2; g.A._spent = true;
      g.feed = [{ t: "🌫 Craven Shadow — Maleth pays 2◆ and slips the clash. Normal round." }];
      g.phase = "plan"; resetSel(g); rerender(); return;
    }
    g.phase = "clashPlan"; rerender();
  };
  const useCraven = (yes) => {
    const g = G.current;
    if (yes) {
      g.P.cravenUsed = true; g.P.pow -= 2; g.P._spent = true;
      g.feed = [{ t: "🌫 Craven Shadow — you slip the clash. Normal round." }];
      g.phase = "plan"; resetSel(g); rerender();
    } else aiCravenOrPlan();
  };
  const confirmClash = (abId, soft, form, string) => {
    const g = G.current;
    if (ABILITIES[abId].pivot) {
      g.pendClash = { ab: abId, soft };
      let aP = aiMakePlan(g.A, g.P, true, null);
      g.aiPlan = aiPivot(aP, ABILITIES[abId].type);
      g.phase = "feintClash"; rerender(); return;
    }
    const pPlan = { ab: abId, soft, form: form || null };
    let aPlan = aiMakePlan(g.A, g.P, true, null);
    aPlan = aiPivot(aPlan, form || ABILITIES[abId].type);
    runClash(pPlan, aPlan);
  };
  const confirmFeintClash = (form, pivoted) => {
    const g = G.current;
    runClash({ ...g.pendClash, form: form || null, pivoted: !!pivoted }, g.aiPlan);
    g.pendClash = null; g.aiPlan = null;
  };
  const runClash = (pPlan, aPlan) => {
    const g = G.current;
    g.stats.clashes += 1;
    if (!g.pactBled) {
      const gF = [g.P, g.A].find((f) => f.fk === "G" && f.pass === "pact");
      if (gF) {
        g.pactBled = true;
        const L0 = [];
        L0.push({ t: `🩸 THE PACT DEMANDS BLOOD — both fighters are cut before the bell.`, fx: { kind: "combo", text: "BLOOD PACT" } });
        dealRaw(g.P, 1, L0, "The Pact", "break", "#dc2626");
        dealRaw(g.A, 1, L0, "The Pact", "break", "#dc2626");
        L0.forEach((l) => { g.feed.push(l); fireFx(l.fx); });
      }
    }
    g.roundJustPlayed = g.round;
    g.feed = [];
    const L = [];
    const mult = 1;
    const P = g.P, A = g.A;
    [[P, pPlan], [A, aPlan]].forEach(([s, pl]) => {
      const ab = ABILITIES[pl.ab];
      let c = pl.soft && ab.soft ? ab.soft.cost : ab.cost;
      if (pl.string) c = ab.cost + (s.pass === "flowing" ? 0 : 1);
      if (pl.pivoted) { c += 1; L.push({ t: `⇄ ${nm(s)} pays 1◆ to pivot.` }); }
      if (s.fk === "K" && s.pass === "overclock" && s.pow === 3 && c > 0) c -= 1;
      if (c > 0) {
        const wasFull = s.pow >= powCap(s);
        if (G.current.tut && s.pow < c) s.pow = c; s.pow -= c; s._spent = true;
        if (s.fk === "K") {
          if (wasFull) s._powered = true;
          if ((s.charge || 0) > 0 && ab.type !== "ward") { const burn = s.charge; s.charge = 0; dealRaw(s, burn, L, "OVERCHARGE vents through him", "break", "#a78bfa"); }
          if (s.pass === "nova" && s.pow === 0 && ab.type !== "ward") s._nova = true;
        }
      }
      const hc = ab.hpCost || 0;
      if (hc > 0) {
        const pay = Math.min(hc, s.hp - 1); s.hp -= pay;
        if (pay > 0 && s.pass === "knock") { s.knocks = (s.knocks || 0) + 1; if (s.knocks === 3) L.push({ t: `🚪 Knock, knock.` }); }
        L.push({ t: `🩸 ${nm(s)} pays ${pay} blood.`, fx: { kind: "glance", side: sideKeyOf(s), amt: pay, q: s.pos, ty: "break" } });
        if (s.pass === "surplus") gainPow(s, 1, L, "Blood Surplus");
      }
      if (pl.ab === "iron") s._ironActive = true;
    });
    const abP = ABILITIES[pPlan.ab], abA = ABILITIES[aPlan.ab];
    const tP = pPlan.form || abP.type, tA = aPlan.form || abA.type;
    G.current.pHist = (G.current.pHist || []).concat(tP).slice(-8);
    L.push({ t: `⚔ CLASH${g.round === 10 ? " — FINAL: winner +2" : ""} — you: ${abP.name} [${TYPE_LABEL[tP]}] · foe: ${abA.name} [${TYPE_LABEL[tA]}]` });
    g.vs = { p: { n: abP.name, ty: tP }, a: { n: abA.name, ty: tA }, note: `CLASH${g.round === 10 ? " · FINAL" : ""}`, r: g.round };
    const followups = g.prompts;
    const dd = (src, tgt, amt, label, ty) => {
      let n = amt;
      const flatFinal = G.current.round === 10;
      if (!flatFinal) {
      if (src.fk === "G" && src.pass === "pact" && src.hp <= 6) n += 1;
      if (src.fk === "M" && src.pass === "twist" && tgt.kbLast) n += 1;
      if (src.fk === "K" && src._powered && !src._powSpent) { n += 1; src._powSpent = true; }
      if (src.fk === "C" && src.pass === "killheat" && tgt.burn > 0) n += 1;
      }
      if ((src.weak || 0) > 0) n = Math.max(0, n - 1);
      if (!flatFinal) {
      if (src.fk === "Z" && src.pass === "agonist" && ((tgt.weak || 0) > 0 || tgt.brandRound)) n += 1;
      if (src.fk === "W" && (tgt.mark || 0) > 0) n += Math.min(2, tgt.mark);
        if (src.flow) { const fb = src.pass === "pedge" ? 2 : 1; n += fb; src.flow = false; L.push({ t: `✦ Flow — the strike lands +${fb} heavier.` }); }
      if (ty === "break" && tgt.chill) { n += src.pass === "shatter" && src.fk === "V" ? 2 : 1; tgt.chill = false; L.push({ t: "❄ SHATTER." }); }
      }
      dealRaw(tgt, n * mult, L, label, ty, elOf(src));
    };
    const clashBase = (src, tgt, plan) => {
      const ab = ABILITIES[plan.ab];
      const ety = plan.form || ab.type;
      if (ety === "ward") { wardBase(src, plan, L); return; }
      let d = plan.soft && ab.soft ? ab.soft.dmg : ab.dmg;
      if (ab.dual && plan.form && ab.dual[plan.form]) d = ab.dual[plan.form].dmg ?? d;
      if (plan.ab === "frenzy" && src.hp <= 6) d = 3;
      if (plan.ab === "llance" && G.current.terrain[tgt.pos]?.kind === "hall") d += 1;
      if (plan.ab === "heart" && tgt.poison > 0) { d += tgt.poison * 2; tgt.poison = 0; if (src.pass === "tithe") { src.maxHp += 2; healUp(src, 2, L, "Blood Tithe"); } }
      if (plan.ab === "comb" && tgt.burn > 0) { d += tgt.burn * 2; tgt.burn = 0; }
      if (plan.ab === "sorrow" && !plan.soft && (tgt.curse || 0) >= 3) d += Math.floor(tgt.curse / 3);
      dd(src, tgt, d, ab.name, ety);

      if (plan.ab === "viper" || plan.ab === "twin") addPoison(tgt, 1, L);
      if (plan.ab === "lance") addChill(tgt, L);
      if (plan.ab === "cinder" || plan.ab === "magma") addBurn(src, tgt, L);
      if (plan.ab === "stick" || plan.ab === "eye") addCurse(src, tgt, 1, L);
      if (plan.ab === "dawn" && src.pass === "sanct") { tgt.rooted = true; L.push({ t: `⚖ HAMMER OF JUSTICE — ${nm(tgt)} is pinned where they stand.` }); }
      if (plan.ab === "chains") addWeak(tgt, 1, L);
      if (plan.ab === "eye") addWeak(tgt, 1, L);
      if (plan.ab === "brand") { tgt.brandRound = g.round + 2; L.push({ t: `⏳ ${nm(tgt)} is BRANDED — end of round ${tgt.brandRound}.` }); }
      if (plan.ab === "dark") healUp(src, plan.soft ? 1 : 2, L, "Devouring Dark");
      if (plan.ab === "consec") setTerrain(tgt.pos, "hall", L, "✦ Sanctuary");
      if (plan.ab === "dawn" && G.current.terrain[src.pos]?.kind === "hall") healUp(src, 2, L, "Dawnhammer — sunrise from sanctity");
      if (plan.ab === "freeze") setTerrain(tgt.pos, "frost", L, "❄ Frost");
      if (plan.ab === "fissure") { setTerrain(tgt.pos, "dom", L, "⛰ Dominion"); G.current.prompts.push({ kind: "terr", tkind: "dom", who: src.fk, opts: ADJ[tgt.pos], label: "Fissure: the crack runs — convert one adjacent quadrant" }); }
      if (plan.ab === "mireA") setTerrain(tgt.pos, "mire", L, "🧷 Sorrow Mire");
      if (plan.ab === "storm") setTerrain(tgt.pos, "whirl", L, "🌀 Whirlpool");
      if (plan.ab === "undine") G.current.prompts.push({ kind: "undine", who: src.fk, opts: QUADS, label: "Place the Undine" });
      if (plan.ab === "cadence") src.flow = true;
      if (plan.ab === "pin") { tgt._rootNext = true; L.push({ t: `📌 Pinned — ${nm(tgt)} is Rooted next round.` }); }
      if (plan.ab === "quake" && G.current.terrain[tgt.pos] && G.current.terrain[tgt.pos].kind !== "dom") { delete G.current.terrain[tgt.pos]; L.push({ t: `⛰ Quake Fist shatters the ground at ${tgt.pos}.` }); }
      if (plan.ab === "bwater") setTerrain(tgt.pos, "surf", L, "🌊 Crashing Surf");
    };
    let winner = null, tie = tP === tA;
    if (!tie) winner = BEATS[tP] === tA ? P : A;
    [P, A].forEach((s) => { if (tie && s.fk === "G" && s.pass === "warmonger") { winner = s; tie = false; L.push({ t: "🏳 Warmonger — the tie is his." }); } });
    [[P, pPlan, tP], [A, aPlan, tA]].forEach(([src, pl]) => { if (pl.ab === "sky" && !(!tie && winner !== src && (winner === P ? tP : tA) === "rush")) { src._skyBarrage = 2; L.push({ t: `☄ ${nm(src)} looses SKYFALL — the sky is loaded for two more rounds.` }); } });
    if (tie) {
      L.push({ t: "⚔ Clash TIE — a bloody trade." });
      if (tP !== "ward") clashBase(P, A, pPlan); else wardBase(P, pPlan, L);
      if (tA !== "ward") clashBase(A, P, aPlan); else wardBase(A, aPlan, L);
    } else {
      const l = other(winner);
      const wp = winner === P ? pPlan : aPlan;
      const wab = ABILITIES[wp.ab];
      const wty = wp.form || wab.type;
      L.push({ t: `⚡ ${nm(winner)} wins the clash.`, fx: { kind: "adv", text: `CLASH — ${nm(winner).toUpperCase()}`, tone: FIGHTERS[winner.fk].hex } });
      if (G.current.stats) G.current.stats.adv[winner === g.P ? "P" : "A"] += 1;
      if (winner.pass === "momentum" && !winner.flow) { winner.flow = true; L.push({ t: `✦ Momentum — ${nm(winner)} gains Flow.` }); }
      if (l.pass === "tempo") gainPow(l, 1, L, "Steel Tempo");
      if (l.fk === "W" && l.pass === "parting") dealRaw(winner, 1, L, "Parting Shot", "rush", "#16a34a");
      if (wty === "ward") { wardBase(winner, wp, L); wardAdvClash(winner, l, wp, L, mult); }
      else {
        clashBase(winner, l, wp);
        switch (wp.ab) {
          // signatures: +1 AND effect (placement already covers Harvest/Breakwater knockback riders)
          case "freeze": dd(winner, l, 1, "Flash Freeze bites", "rush"); l._rootNext = true; L.push({ t: `⛓ ${nm(l)} is Rooted.` }); break;
          case "pyre": dd(winner, l, 1, "Pyre flare", "break"); addBurn(winner, l, L); break;
          case "aval": { const b = Math.min(2, frostQs().length); dd(winner, l, 1, "Avalanche surge", "break"); if (b) dd(winner, l, b, "The frost joins in", "break"); break; }
          case "arc": dd(winner, l, 1, "Arc grounds out", "rush"); if (l.pow > 0) { l.pow -= 1; L.push({ t: `⚡ ${nm(l)} loses 1◆.` }); } break;
          case "brand": dd(winner, l, 1, "Doombrand sears", "rush"); l.brandRound = g.round + 1; L.push({ t: `⏳ Fuse shortened — end of round ${l.brandRound}.` }); break;
          case "consec": dd(winner, l, 1, "Consecration flares", "rush"); setTerrain(winner.pos, "hall", L, "✦ Sanctuary"); break;
          case "censure": dd(winner, l, 1, "Censure", "break"); l.noGain = true; L.push({ t: `⚖ The Light disapproves — ${nm(l)} gains no ◆ this round.` }); break;
          case "mount": dd(winner, l, 1, "Mountainfall aftershock", "break"); break;
          case "chainX": dd(winner, l, 1, "Chain follow-through", "break"); winner.flow = true; break;
          // everything else: the point
          default: dd(winner, l, 1, "Advantage — the extra point", wp.form || wab.type); break;
        }
      }
      if (l.hp > 0) {
        if (g.round === 10) dd(winner, l, 2, "THE FINAL EDGE — the last clash cuts deeper", wty === "ward" ? "ward" : (wp.form || ABILITIES[wp.ab].type));
        followups.push({ kind: "placeSelf", who: winner.fk, opts: QUADS, label: "Clash won — pick YOUR quadrant" });
        followups.push({ kind: "placeFoe", who: winner.fk, opts: QUADS, label: "Now hurl the loser anywhere" });
      }
    }
    g.after = "finish";
    playLines(L, processPrompts);
  };
  const wardAdvClash = (warder, atk, wp, L, mult) => {
    if (G.current.stats) G.current.stats.adv[warder === G.current.P ? "P" : "A"] += 1;
    const dd2 = (amt, label) => dealRaw(atk, amt * mult, L, label, "ward", elOf(warder));
    dd2(1, "Riposte");
    if (wp.ab === "blackout") addPoison(atk, 1, L);
    if (wp.ab === "knit") addCurse(warder, atk, 1, L);
    switch (wp.ab) {
      case "gloom": dd2(1, "Gloomveil counter"); addPoison(atk, 1, L); break;
      case "blackout": dd2(1, "Blackout counter"); addPoison(atk, 1, L); break;
      case "puppet": dd2(1, "Puppet Pull counter"); addCurse(warder, atk, 1, L); break;
      case "claim": dd2(1, "Bedrock counter"); break;
      case "hawk": dd2(1, "Hawk's Eye counter"); L.push({ t: `🎯 ${nm(atk)} is MARKED.` }); break;
      case "eguard": dd2(1, "Edgeguard counter"); warder.flow = true; break;
      case "oath": dd2(1, "Bulwark Oath counter"); warder._noKB = true; break;
      default: dd2(1, "Sharpened riposte"); break;
    }
  };

  /* ---- planning ---- */
  const resetSel = (g) => setSel({ step: g && g.P.rooted ? "action" : "move", moveTo: g && g.P.rooted ? g.P.pos : null, ab: null, soft: false, target: null, splash: null, secondary: null });
  const applyToll = (aPlan, pPlan) => {
    const g = G.current;
    if (!g.P._tolled) return aPlan;
    g.P._tolled = false;
    const ab = ABILITIES[aPlan.ab];
    if (ab.needsTarget) {
      aPlan.target = pPlan.moveTo;
      if (ab.needsSplash) aPlan.splash = rnd(ADJ[aPlan.target]);
      if (ab.needsSecondary) aPlan.secondary = rnd(QUADS.filter((q) => q !== aPlan.target));
      G.current.feed.push({ t: "👁 The hawk's toll — the foe aims exactly where you go." });
    }
    return aPlan;
  };
  const rankVs = (myT, foeT) => (BEATS[myT] === foeT ? 2 : myT === foeT ? 1 : 0);
  const aiPivot = (aPlan, pType) => {
    const ab = ABILITIES[aPlan.ab];
    if (!ab.pivot) return aPlan;
    const g = G.current;
    if (g.A.pow < ab.cost + 1) return aPlan;
    const cur = aPlan.form || ab.type;
    if (rankVs(ab.pivot, pType) > rankVs(cur, pType)) { aPlan.form = ab.pivot; aPlan.pivoted = true; G.current.feed.push({ t: `⇄ The foe PIVOTS mid-swing.` }); }
    return aPlan;
  };
  const confirmPlan = () => {
    const g = G.current;
    const pPlan = { ab: sel.ab, soft: sel.soft, form: sel.form, string: sel.string, moveTo: sel.moveTo ?? g.P.pos, target: sel.target, splash: sel.splash, secondary: sel.secondary };
    if (ABILITIES[sel.ab].umbral) {
      g.aiPlan = aiMakePlan(g.A, g.P, false, null);
      g.planSel = pPlan; g.phase = "umbral"; rerender(); return;
    }
    if (ABILITIES[sel.ab].pivot) {
      let aP = aiMakePlan(g.A, g.P, false, null);
      if (ABILITIES[aP.ab].umbral) aP = aiMakePlan(g.A, g.P, false, pPlan);
      aP = aiPivot(aP, ABILITIES[sel.ab].type);
      g.aiPlan = applyToll(aP, pPlan);
      g.planSel = pPlan; g.phase = "feintPick"; rerender(); return;
    }
    let aPlan = aiMakePlan(g.A, g.P, false, null);
    if (ABILITIES[aPlan.ab].umbral) aPlan = aiMakePlan(g.A, g.P, false, pPlan);
    aPlan = aiPivot(aPlan, pPlan.form || ABILITIES[pPlan.ab].type);
    aPlan = applyToll(aPlan, pPlan);
    resolveRound(pPlan, aPlan);
    resetSel(g);
  };
  const confirmFeint = (form, pivoted) => {
    const g = G.current;
    resolveRound({ ...g.planSel, form: form || null, pivoted: !!pivoted }, g.aiPlan);
    g.aiPlan = null; g.planSel = null; resetSel(g);
  };
  const confirmUmbralMove = (q) => {
    const g = G.current;
    let aP = g.aiPlan;
    aP = aiPivot(aP, g.planSel.form || ABILITIES[g.planSel.ab].type);
    aP = applyToll(aP, { ...g.planSel, moveTo: q });
    resolveRound({ ...g.planSel, moveTo: q }, aP);
    g.aiPlan = null; resetSel(g);
  };
  const throwSudden = (t) => {
    const g = G.current;
    const aiT = rnd(["break", "rush", "ward"]);
    if (t === aiT) { setSudden({ p: t, a: aiT }); return; }
    g.winner = BEATS[t] === aiT ? "P" : "A";
    g.phase = "over"; setSudden(null); rerender();
  };
  const beginBout = () => {
    const g = G.current;
    if (!g || g.phase !== "vs") return;
    g.phase = "plan";
    showBanner("ROUND 1", g.tut ? "the lesson begins" : "welcome to the blood grounds");
    rerender();
  };
  const startGame = (opts = {}) => {
    const pFk = opts.pFk || side, pLoad = opts.pLoad || pickAb, pPass = opts.pPass || pickPass;
    const aiFk = opts.aiFk || rnd(Object.keys(FIGHTERS).filter((k) => k !== pFk));
    const mk = (fk, load, pass) => ({ fk, hp: FIGHTERS[fk].hp, maxHp: FIGHTERS[fk].hp, pow: 0, load, pass, poison: 0, burn: 0, chill: false, chillUntil: 0, rooted: false, noGain: false, kbLast: false, cravenUsed: false, ventUsed: false, vigilUsed: false, borrowedUsed: false, curse: 0, weak: 0, brandRound: 0, mark: 0, markUntil: 0, flow: false, usedBreak: false, charge: 0, _tolled: false, knocks: 0, pos: null });
    const P = mk(pFk, pLoad, pPass);
    const A = mk(aiFk, opts.aiLoad || FIGHTERS[aiFk].aiLoad, opts.aiPass || FIGHTERS[aiFk].aiPass);
    P.pos = "SW"; A.pos = "NE";
    G.current = { round: 1, diff: opts.diff || diff, pHist: [], P, A, terrain: {}, phase: "plan", prompts: [], feed: [], history: [], winner: null, planSel: null, aiPlan: null, roundJustPlayed: 1, relics: { board: [], claims: 0, spawned: 0 }, altWin: null, after: "finish", curseHealed: false, kessQ: null, undineQ: null, undineUntil: 0, undineHeals: false, aiForcedMove: null, pendClash: null, kessStun: 0, undineStun: 0, domPending: null, stats: { dir: { P: 0, A: 0 }, whiff: { P: 0, A: 0 }, col: 0, clashes: 0, adv: { P: 0, A: 0 }, dmg: { P: 0, A: 0 } } };
    if (P.fk === "W") G.current.kessQ = P.pos; if (A.fk === "W") G.current.kessQ = A.pos;
    if (opts.tut) G.current.tut = true;
    G.current.phase = "vs";
    setScreen("game");
    resetSel(G.current);
    later(() => { if (G.current && G.current.phase === "vs") beginBout(); }, REDUCED ? 1500 : 6000);
  };

  /* ================= screens ================= */
  if (screen === "title") return (
    <Shell><style>{CSS}</style>
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <svg viewBox="0 0 400 700" preserveAspectRatio="xMidYMax slice" className="w-full h-full">
          <defs>
            <linearGradient id="apoSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0c0505" /><stop offset="42%" stopColor="#450a0a" /><stop offset="66%" stopColor="#7f1d1d" /><stop offset="84%" stopColor="#c2410c" /><stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
            <linearGradient id="apoFade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0c0a09" stopOpacity="0" /><stop offset="100%" stopColor="#0c0a09" stopOpacity=".94" />
            </linearGradient>
          </defs>
          <rect width="400" height="700" fill="url(#apoSky)" />
          <circle cx="298" cy="505" r="54" fill="#fbbf24" opacity=".22" /><circle cx="298" cy="505" r="30" fill="#fde68a" opacity=".2" />
          <g className="fxFlashA"><rect width="400" height="520" fill="#fef3c7" opacity=".13" /><path d="M92 44 L78 150 L94 140 L70 268 L88 254 L74 340" stroke="#fef9c3" strokeWidth="2.6" fill="none" strokeLinecap="round" /><circle cx="88" cy="70" r="34" fill="#fef9c3" opacity=".3" /></g>
          <g className="fxFlashB"><rect width="400" height="520" fill="#fde68a" opacity=".09" /><path d="M322 60 L310 148 L322 140 L302 240" stroke="#fef9c3" strokeWidth="2.2" fill="none" strokeLinecap="round" /></g>
          <path d="M0 512 L46 462 L92 502 L142 452 L192 506 L242 466 L292 508 L342 458 L400 500 L400 700 L0 700 Z" fill="#2a130c" />
          <path d="M0 546 L58 506 L118 542 L178 500 L242 546 L304 508 L362 542 L400 518 L400 700 L0 700 Z" fill="#170b06" />
          <g fill="#0d0705">
            <path d="M0 700 L0 560 L10 552 L22 562 L22 590 L40 590 L40 700 Z" />
            <path d="M52 700 L52 592 L66 592 L66 612 L84 612 L84 592 L98 592 L98 700 Z" />
            <path d="M108 700 L108 596 Q124 574 140 596 L140 700 Z M148 700 L148 600 Q164 580 180 600 L180 616 L148 616 Z" />
            <path d="M196 700 L192 528 L212 518 L224 526 L218 700 Z" />
            <path d="M238 700 L238 588 Q276 540 314 588 L314 604 L296 604 Q278 572 256 600 L256 700 Z" />
            <path d="M326 700 L326 606 Q340 588 354 606 L354 700 Z" />
            <path d="M362 700 L362 574 L378 564 L396 576 L396 636 L380 636 L380 700 Z" />
            <path d="M0 700 L0 664 L200 648 L400 668 L400 700 Z" opacity=".9" />
          </g>
          <g fill="#f97316" opacity=".32"><rect x="12" y="568" width="5" height="8" /><rect x="70" y="620" width="5" height="8" /><rect x="203" y="546" width="5" height="9" /><rect x="284" y="612" width="6" height="8" /><rect x="368" y="586" width="5" height="8" /><rect x="336" y="622" width="4" height="7" /></g>
          <rect y="470" width="400" height="230" fill="url(#apoFade)" />
        </svg>
      </div>
      <Embers />
        <div className="fixed top-3 right-3 z-40 flex gap-2">
          {musicUrl ? <button onClick={() => setMuted((m) => !m)} className="text-lg w-9 h-9 rounded-full border border-stone-700 bg-stone-900/80">{muted ? "🔇" : "🔊"}</button> : null}
          <button onClick={() => musicFileRef.current?.click()} className="h-9 rounded-full border border-amber-700/60 bg-stone-900/80 text-xs font-bold text-amber-200 px-3">{musicUrl ? "🎵" : "🎵 Add music"}</button>
          <input ref={musicFileRef} type="file" accept="audio/*" className="hidden" onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) { setMusicUrl(URL.createObjectURL(f)); setMuted(false); } e.target.value = ""; }} />
        </div>
      {showCodex && (
        <div className="fixed inset-0 z-50 bg-black/90 overflow-y-auto p-4">
          <div className="max-w-md mx-auto text-xs text-stone-300 leading-relaxed pb-10">
            <div className="flex items-center justify-between mb-3">
              <div className="font-serif italic text-xl text-stone-100">The Codex</div>
              <button onClick={() => setShowCodex(false)} className="text-xs text-stone-300 border border-stone-700 rounded px-2.5 py-1 bg-stone-900">✕ Close</button>
            </div>
            <p className="text-stone-500 italic mb-3">Everything the announcers assume you already know.</p>
            <div className="text-[10px] font-black tracking-widest text-red-400 mb-1">THE ONE RULE</div>
            <p className="mb-3">Break shatters Ward · Ward catches Rush · Rush interrupts Break — <b>the winner's action resolves at +1.</b> Wards are counter-attacks: every guard ripostes 1 on a catch. ◆ buys effects; the triangle buys the point; type buys nothing but the read.</p>
            <div className="text-[10px] font-black tracking-widest text-amber-400 mb-1">STATUSES</div>
            {["poison", "burn", "chill", "rooted", "curse", "brand", "weak", "mark", "flow"].map((k) => (
              <p key={k} className="mb-1.5 flex gap-1.5"><span className="shrink-0">{k === "curse" ? <CurseDoll size={13} /> : STATUS_INFO[k].split(" ")[0]}</span><span>{STATUS_INFO[k].replace(/^[^ ]+ /, "")}</span></p>
            ))}
            <div className="text-[10px] font-black tracking-widest text-sky-400 mt-3 mb-1">GROUND</div>
            {Object.keys(TERRA_META).map((k) => (
              <p key={k} className="mb-1.5 flex gap-1.5" style={{ color: "#d6d3d1" }}><span className="shrink-0" style={{ color: TERRA_META[k].hex }}>{k === "mire" ? <CurseDoll size={13} /> : TERRA_META[k].icon}</span><span>{STATUS_INFO[k].replace(/^[^ ]+ /, "")}</span></p>
            ))}
            <div className="text-[10px] font-black tracking-widest text-teal-300 mt-3 mb-1">COMPANIONS & PRIZES</div>
            <p className="mb-1.5 flex gap-1.5 items-start"><span className="shrink-0"><KessMini size={23} /></span><span>{STATUS_INFO.kess.replace(/^[^ ]+ /, "")}</span></p>
            <p className="mb-1.5 flex gap-1.5 items-start"><span className="shrink-0"><UndineMini size={22} /></span><span>{STATUS_INFO.undine.replace(/^[^ ]+ /, "")}</span></p>
            <p className="mb-1.5 flex gap-1.5 items-start"><span className="shrink-0"><RelicGrail size={20} /></span><span>{STATUS_INFO.relic.replace(/^[^ ]+ /, "")}</span></p>
            <div className="text-[10px] font-black tracking-widest text-stone-400 mt-3 mb-1">THE CALENDAR</div>
            <p className="mb-3">Rounds 3, 7, and 10 are CLASHES — no movement, pure triangle, winner places both fighters, and the Round-10 winner strikes +2. Win a direct exchange any other round and you SHOVE: stagger them adjacent, or hold them where they stand.</p>
            <div className="text-[10px] font-black tracking-widest text-purple-400 mt-3 mb-1">FRAGMENTS</div>
            <p className="italic text-stone-400 mb-1">"Tech-magic doesn't apologize; it reloads."</p>
            <p className="italic text-stone-400 mb-1">"They say Maleth and Gharzul have killed each other twice already. Neither considers the matter settled."</p>
            <p className="italic text-stone-400 mb-1">"Nobody knows who left the door open — and Zhal-Meraq has never once denied it."</p>
            <p className="italic text-stone-400 mb-1">"The swamp taught him its oldest trade: lend a little misfortune now, collect it all back with interest later."</p>
            <p className="italic text-stone-400 mb-1">"History is shady: every faction keeps its own version, and the dead keep the honest one."</p>
            <p className="italic text-stone-400">"Are things better off? No time for questions — dodge the axe."</p>
          </div>
        </div>
      )}
      <div className="relative text-center pt-10 pb-5">
        <div className="text-[10px] uppercase tracking-[0.35em] text-amber-500/80 mb-3">· welcome to the blood grounds ·</div>
        <div className="font-black text-5xl tracking-wide bg-gradient-to-b from-amber-200 via-orange-400 to-red-700 bg-clip-text text-transparent" style={{ filter: "drop-shadow(0 0 18px rgba(249,115,22,.30))" }}>CRUCIBLE</div>
        <div className="font-serif italic text-3xl text-stone-300 -mt-1" style={{ letterSpacing: "0.28em", textShadow: "0 0 24px rgba(220,38,38,.35)" }}>LEGENDS</div>
        <div className="flex items-center gap-2 mx-auto my-3" style={{ maxWidth: 230 }}>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-stone-600" /><span className="text-stone-500 text-xs">⚔</span><div className="h-px flex-1 bg-gradient-to-l from-transparent to-stone-600" />
        </div>
        <p className="text-sm text-stone-400 max-w-xs mx-auto leading-relaxed">Nobody agrees how the world ended — only that it kept ending. Empire wars. Broken seasons. Demons through a door somebody left open. Gods taking sides. Then the arcane machines took whatever was left — tech-magic doesn't apologize; it reloads. What remains settles its scores here: one champion, one grudge, one duel at a time.</p>
        <p className="text-[10px] uppercase tracking-widest text-stone-500 mt-2.5">12 champions · 4 quadrants · 10 rounds · one left standing</p>
        <p className="text-xs text-stone-600 italic mt-2">"Are things better off? No time for questions — dodge the axe."</p>
        <button onClick={() => startGame({ tut: true, pFk: "G", pLoad: ["skull", "howl", "iron", "harvest"], pPass: "pact", aiFk: "C", aiLoad: ["cinder", "magma", "smoke", "pyre"], aiPass: "heatrise" })}
          className="mt-3 text-sm text-amber-300 border border-amber-700/60 rounded-lg px-4 py-1.5 bg-stone-900">⚔ Tutorial — the Basics</button>
        <button onClick={() => setShowCodex(true)} className="mt-3 ml-2 text-sm text-stone-300 border border-stone-700 rounded-lg px-4 py-1.5 bg-stone-900">📖 Codex</button>
      </div>
      <div className="relative grid grid-cols-2 gap-2.5 max-w-sm mx-auto pb-6">
        {Object.values(FIGHTERS).map((F) => (
          <button key={F.key} onClick={() => { setSide(F.key); setPickAb([]); setPickPass(null); setScreen("build"); }}
            className={`rounded-xl border border-stone-800 bg-stone-900 overflow-hidden text-left hover:bg-stone-800 ring-1 ${F.ring}`}>
            <div className="flex justify-center items-end gap-1 pt-2"><Portrait fk={F.key} size={80} /><VecFig fk={F.key} size={26} /></div>
            <div className="p-2">
              <div className={`font-black tracking-wide text-[11px] leading-tight ${F.tone}`}>{F.name}</div>
              {(() => { const cls = F.sub.split("·")[1]?.trim(); const ch = { Ravager: "#f87171", Duelist: "#fcd34d", Champion: "#facc15", Shaper: "#7dd3fc" }[cls] || "#a8a29e"; return (
                <div className="text-[9px] font-bold tracking-widest uppercase mt-0.5 inline-block rounded px-1" style={{ color: ch, border: `1px solid ${ch}44`, background: "rgba(0,0,0,.35)" }}>{cls}</div>
              ); })()}
              <div className="text-xs text-stone-500">{F.sub} · {F.hp} HP</div>
              <div className="text-xs text-stone-400 leading-snug mt-0.5">{F.mech}</div>
              <div className="text-xs text-stone-600 italic leading-snug mt-0.5">{F.blurb}</div>
            </div>
          </button>
        ))}
        
      </div>
    </Shell>
  );

  if (screen === "build") {
    const F = FIGHTERS[side];
    const toggle = (id) => setPickAb(pickAb.includes(id) ? pickAb.filter((x) => x !== id) : pickAb.length < 4 ? [...pickAb, id] : pickAb);
    return (
      <Shell><style>{CSS}</style>
        <button onClick={() => setScreen("title")} className="mt-2 text-xs text-stone-400 border border-stone-700 rounded px-2.5 py-1 bg-stone-900">← All fighters</button>
        <div className="flex items-center gap-3 mt-2 mb-1">
          <Portrait fk={side} size={72} />
          <div className="flex-1">
            <div className={`font-black ${F.tone}`}>{F.name}</div>
            <div className="text-xs text-stone-500">{F.sub} · {F.hp} HP</div>
          </div>
          <VecFig fk={side} size={34} />
        </div>
        <p className="text-xs text-amber-200/80 leading-relaxed mb-1">{F.mech}</p>
        <p className="text-xs text-stone-500 leading-relaxed mb-1">{F.style}</p>
        <p className="text-xs text-stone-600 italic leading-relaxed">{F.lore}</p>
        <div className="text-xs text-stone-500 uppercase tracking-widest mt-2 mb-1">Choose 4 abilities</div>
        <div className="grid gap-1.5 mb-3">
          {poolSorted(side, F.pool).map((id) => {
            const ab = ABILITIES[id]; const on = pickAb.includes(id);
            return (
              <button key={id} onClick={() => toggle(id)} className={`text-left rounded-lg border px-2.5 py-2 ${TYPE_CLS[ab.type]} ${on ? "ring-2 ring-stone-200" : "opacity-70"}`}>
                <div className="flex justify-between text-sm font-bold"><span>{ab.name}</span><span className="text-xs">{TYPE_LABEL[ab.type]} · {ab.cost}◆</span></div>
                <div className="text-xs opacity-80">{ab.text}</div>
                <div className="text-xs opacity-60">Adv: {ab.adv}</div>
                <div className="text-xs opacity-50 italic">"{ab.lore}"</div>
              </button>
            );
          })}
        </div>
        <div className="text-xs text-stone-500 uppercase tracking-widest mb-1">Passive</div>
        <div className="grid gap-1.5 mb-4">
          {F.passives.map((id) => (
            <button key={id} onClick={() => setPickPass(id)} className={`text-left rounded-lg border border-stone-700 bg-stone-900 px-2.5 py-2 ${pickPass === id ? "ring-2 ring-stone-200" : "opacity-70"}`}>
              <div className="text-sm font-bold text-stone-200">{PASSIVES[id].name}</div>
              <div className="text-xs text-stone-400">{PASSIVES[id].text}</div>
            </button>
          ))}
        </div>
        <div className="text-xs font-black tracking-widest text-stone-400 mt-3 mb-1">OPPONENT</div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-2 items-center">
          <button onClick={() => setFoeSel(null)} className={`shrink-0 text-xs rounded-lg px-2.5 py-2 border ${foeSel === null ? "border-amber-500 text-amber-300" : "border-stone-700 text-stone-400"} bg-stone-900`}>🎲 Random</button>
          {Object.values(FIGHTERS).filter((F) => F.key !== side).map((F) => (
            <button key={F.key} onClick={() => setFoeSel(F.key)} className={`shrink-0 rounded-lg p-0.5 border ${foeSel === F.key ? "border-amber-500" : "border-stone-800"} bg-stone-900`} title={F.name}>
              <Portrait fk={F.key} size={40} />
            </button>
          ))}
        </div>
        {pickAb.length === 4 && !pickAb.some((id) => ABILITIES[id].cost === 0) && <p className="text-xs text-amber-400 mb-1">Draft rule: bring at least one 0◆ ability — there are no basics to fall back on.</p>}
        <div className="mb-3">
          <div className="text-xs text-stone-500 mb-1 tracking-widest">TRIAL</div>
          <div className="flex gap-2">
            {[["proving", "THE PROVING", "A fair bout \u2014 the arena measures you."], ["gauntlet", "THE GAUNTLET", "It learns your habits \u2014 and answers them."], ["crucible", "THE CRUCIBLE", "It wants you broken."]].map(([k, n, b]) => (
              <button key={k} onClick={() => setDiff(k)} className={`flex-1 rounded-lg border px-2 py-2 text-left ${diff === k ? "border-amber-500 bg-amber-500/10" : "border-stone-700 bg-stone-900/60"}`}>
                <div className={`text-xs font-black ${diff === k ? "text-amber-300" : "text-stone-300"}`}>{n}</div>
                <div className="text-stone-500" style={{ fontSize: 10 }}>{b}</div>
              </button>
            ))}
          </div>
        </div>
        <BigBtn onClick={() => startGame(foeSel ? { aiFk: foeSel, diff } : { diff })} disabled={pickAb.length !== 4 || !pickPass || !pickAb.some((id) => ABILITIES[id].cost === 0)}>Enter the Crucible ▸ ({pickAb.length}/4)</BigBtn>
        <div className="mt-2">
          <BigBtn dim onClick={() => { const T = TUTS[side]; startGame({ tut: true, pFk: side, pLoad: FIGHTERS[side].aiLoad, pPass: T.pass, aiFk: T.foe, aiLoad: FIGHTERS[T.foe].aiLoad, aiPass: FIGHTERS[T.foe].aiPass }); }}>📖 Guided — learn {F.short} vs {FIGHTERS[TUTS[side].foe].short} ▸</BigBtn>
        </div>
      </Shell>
    );
  }

  /* ---- game ---- */
  const g = G.current;
  const me = g.P, ai = g.A;
  const abSel = sel.ab ? ABILITIES[sel.ab] : null;
  const planning = g.phase === "plan";
  const railNow = g.tut ? resolveRail(g) : null;
  const selTy = sel.ab ? sel.form || abSel.type : null;
  const readyToConfirm = sel.ab && (selTy === "ward" || (sel.target && (!abSel.needsSplash || sel.splash) && (!abSel.needsSecondary || sel.secondary || (sel.soft && abSel.soft?.single))));
  const affordActions = () => {
    const out = [];
    const oc = (c) => (me.fk === "K" && me.pass === "overclock" && me.pow === 3 ? Math.max(0, c - 1) : c);
    [...me.load].forEach((id) => {
      const ab = ABILITIES[id];
      if (ab.dual) {
        Object.keys(ab.dual).forEach((form) => { if (me.pow >= oc(ab.cost)) out.push({ id, soft: false, form }); });
        return;
      }
      if (me.pow >= oc(ab.cost)) out.push({ id, soft: false });
      if (ab.string) {
        const sc = ab.cost + (me.pass === "flowing" ? 0 : 1);
        if (me.pow >= oc(sc)) out.push({ id, soft: false, string: true, extraCost: sc });
      }
    });
    return poolSorted(me.fk, out);
  };
  const needsSec = abSel && abSel.needsSecondary && !(sel.soft && abSel.soft?.single);

  return (
    <Shell><style>{CSS}</style>
      {banner && (
        <div className="fixed inset-x-0 top-24 z-40 text-center pointer-events-none">
          <div className="font-serif italic text-3xl text-stone-100" style={{ animation: "bannerIn .5s ease-out both", textShadow: "0 0 30px rgba(220,38,38,.5)" }}>{banner.text}</div>
          <div className="text-xs uppercase tracking-widest text-stone-500 mt-1">{banner.sub}</div>
        </div>
      )}
      {stamp && (
        <div className="fixed inset-0 z-40 grid place-items-center pointer-events-none">
          <div className="px-5 py-2 font-black text-2xl tracking-widest text-stone-950 rounded" style={{ background: stamp.tone, animation: "stampIn .45s ease-out both", boxShadow: `0 0 60px ${stamp.tone}` }}>{stamp.text}</div>
        </div>
      )}
      {cutin && <ClashCutin round={g.round} me={me} ai={ai} />}
      {g.phase === "vs" && <VsSplash me={me} ai={ai} onDone={beginBout} />}

      <div className="flex items-end justify-between mb-2">
        <div>
          <div className="font-serif italic text-xl text-stone-100 leading-none">Crucible <span className="text-red-400">Legends</span><span className="text-stone-600 ml-2" style={{ fontSize: 10, fontStyle: "normal", letterSpacing: 1 }}>{BUILD}</span></div>
          <div className="text-xs text-stone-500 uppercase tracking-widest mt-0.5">Round {Math.min(g.round, 10)} / 10</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setConfirmExit(true)} className="text-xs text-stone-300 border border-stone-700 rounded px-2 py-1 bg-stone-900">⌂</button>
          <button onClick={() => setShowLog(true)} className="text-xs text-stone-300 border border-stone-700 rounded px-2 py-1 bg-stone-900">📜 Record</button>
          <button onClick={() => setShowHelp(true)} className="text-xs text-stone-300 border border-stone-700 rounded px-2 py-1 bg-stone-900">?</button>
        </div>
      </div>
      <div className="flex gap-1 mb-2 justify-end">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((r) => (
          <span key={r} className={`w-2 h-2 rounded-full ${r < g.round ? "bg-stone-600" : r === g.round ? "bg-red-500" : CLASH_ROUNDS.includes(r) ? "border border-red-800" : "border border-stone-700"}`} />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        {[me, ai].map((s, i) => {
          const F = FIGHTERS[s.fk];
          const key = i === 0 ? "P" : "A";
          return (
            <div key={key} className="relative rounded-lg border border-stone-800 bg-stone-900 p-2">
              <div className="flex items-center gap-2">
                <div className="rounded overflow-hidden" style={{ boxShadow: `0 0 12px ${F.hex}44` }}><Portrait fk={s.fk} size={34} /></div>
                <div>
                  <div className={`text-xs font-black tracking-wide ${F.tone}`}>{F.short} {i === 0 ? "· you" : "· AI"}</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-stone-100 font-bold tabular-nums leading-none">{Math.max(0, s.hp)}</span>
                    <span className="text-stone-600 text-xs">/ {s.maxHp}</span>
                  </div>
                </div>
              </div>
              <div className="h-1.5 rounded bg-stone-800 mt-1.5 overflow-hidden">
                <div className={`h-1.5 rounded ${F.bar}`} style={{ width: `${Math.max(0, (s.hp / s.maxHp) * 100)}%`, transition: "width .5s ease" }} />
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-xs">
                {Array.from({ length: powCap(s) }, (_, i) => i + 1).map((n) => <span key={n} className={n <= s.pow ? "text-violet-300" : "text-stone-700"}>◆</span>)}
                {s.fk === "L" && g?.relics ? <button onClick={() => setTip("relic")} className="text-yellow-300 font-bold">✦{g.relics.claims}/3</button> : null}
                {s.poison > 0 && <button onClick={() => setTip("poison")} className="text-lime-400">🧪{s.poison}</button>}
                {s.burn > 0 && <button onClick={() => setTip("burn")} className="text-orange-400">🔥{s.burn}</button>}
                {(s.charge || 0) > 0 && <button onClick={() => setTip("overcharge")} className="text-violet-300">⚡{s.charge}</button>}
                {s.chill && <button onClick={() => setTip("chill")} className="text-sky-300">❄</button>}
                {s.rooted && <button onClick={() => setTip("rooted")} className="text-stone-400">⛓</button>}
                {(s.mark || 0) > 0 && <button onClick={() => setTip("mark")} className="text-green-300">🎯{s.mark > 1 ? s.mark : ""}</button>}
                {(s._skyBarrage || 0) > 0 && <button onClick={() => setTip("skyf")} className="text-sky-300">☄{s._skyBarrage}</button>}
                {s.pass === "knock" && <button onClick={() => setTip("knock")} className="text-fuchsia-400">🚪{s.knocks || 0}</button>}
                {(s.curse || 0) > 0 && <button onClick={() => setTip("curse")} className="text-fuchsia-400 inline-flex items-center gap-0.5"><CurseDoll size={14} />{s.curse}</button>}
                {s.brandRound > 0 && <button onClick={() => setTip("brand")} className="text-purple-400">⏳R{s.brandRound}</button>}
                {(s.weak || 0) > 0 && <button onClick={() => setTip("weak")} className="text-stone-400">↓dmg</button>}
                {(s.mark || 0) > 0 && <button onClick={() => setTip("mark")} className="text-green-400">🎯{s.mark > 1 ? s.mark : ""}</button>}{(s._skyBarrage || 0) > 0 && <button onClick={() => setTip("skyf")} className="text-sky-400">☄{s._skyBarrage}</button>}
                {s.flow && <button onClick={() => setTip("flow")} className="text-teal-300">✦+1</button>}
                {s.noGain && <span className="text-stone-500">✖◆</span>}
              </div>
              {pops.filter((p) => p.side === key).map((p) => (
                <div key={p.id} className={`absolute -top-1 right-1 font-black text-lg ${p.cls}`} style={{ animation: "popRise 1.05s ease-out both" }}>{p.text}</div>
              ))}
            </div>
          );
        })}
      </div>

      {/* ARENA SCENE */}
      <div className={`relative mb-2 rounded-xl overflow-hidden border border-stone-800 ${shake ? "bg-shake" : ""}`}>
        <ArenaBackdrop pfk={g?.P?.fk} afk={g?.A?.fk} />
        <div className="relative grid grid-cols-2" style={{ background: "#15110d" }}>
          {QUADS.map((q, qi) => {
            const movable = planning && sel.step === "move" && !me.rooted && (q === me.pos || ADJ[me.pos].includes(q) || (me.pass === "rider" && ["whirl", "surf"].includes(g.terrain[q]?.kind))) && (!railNow || q === railNow.you.moveTo);
            const targeting = planning && ["target", "splash", "secondary"].includes(sel.step);
            const splashOk = sel.step === "splash" ? ADJ[sel.target].includes(q) : true;
            const secOk = sel.step === "secondary" ? q !== sel.target : true;
            const railT = !railNow || (sel.step === "target" ? q === railNow.you.target : sel.step === "splash" ? q === railNow.you.splash : sel.step === "secondary" ? q === railNow.you.secondary : true);
            const railPick = railNow && g.phase === "prompt" && g.prompts[0] ? railPromptPick(g, g.prompts[0]) : null;
            const promptable = g.phase === "prompt" && g.prompts[0]?.opts.includes(q) && (!railNow || q === railPick);
            const umbralable = g.phase === "umbral" && (q === me.pos || ADJ[me.pos].includes(q));
            const clickable = movable || (targeting && splashOk && secOk && railT) || promptable || umbralable;
            const onClick = () => {
              if (g.phase === "prompt") return answerPrompt(q);
              if (g.phase === "umbral") return confirmUmbralMove(q);
              if (!planning) return;
              if (sel.step === "move" && movable) setSel({ ...sel, moveTo: q, step: "action" });
              else if (sel.step === "target") setSel({ ...sel, target: q, step: abSel?.needsSplash ? "splash" : needsSec ? "secondary" : "confirm" });
              else if (sel.step === "splash" && splashOk) setSel({ ...sel, splash: q, step: "confirm" });
              else if (sel.step === "secondary" && secOk) setSel({ ...sel, secondary: q, step: "confirm" });
            };
            return (
              <button key={q} onClick={onClick} disabled={!clickable}
                className={`relative h-32 text-left overflow-hidden ${clickable ? "ring-1 ring-inset ring-stone-300" : ""} ${sel.target === q ? "ring-2 ring-inset ring-amber-500" : ""} ${sel.moveTo === q && sel.step !== "move" ? "ring-1 ring-inset ring-stone-200" : ""}`}>
                <StoneTile seed={qi} />
                {g?.skyHit?.q === q && g.skyHit.r === g.roundJustPlayed && (
                  <span className="absolute inset-0 pointer-events-none flex items-center justify-center" style={{ zIndex: 7 }}>
                    <svg width="62" height="62" viewBox="0 0 60 60" className="fxSkyHit">
                      <path d="M30 2 L30 32" stroke="#bae6fd" strokeWidth="2" strokeLinecap="round" opacity=".9" />
                      <path d="M22 8 L24 26 M38 8 L36 26" stroke="#7dd3fc" strokeWidth="1.2" strokeLinecap="round" opacity=".7" />
                      <path d="M30 32 L26 28 M30 32 L34 28" stroke="#bae6fd" strokeWidth="1.6" strokeLinecap="round" />
                      <path d="M18 38 L24 35 M42 38 L36 35 M30 46 L30 40" stroke="#fda4af" strokeWidth="1.4" strokeLinecap="round" opacity=".85" />
                      <circle cx="30" cy="35" r="4.5" fill="#e0f2fe" opacity=".55" />
                      <circle cx="30" cy="35" r="9" fill="#7dd3fc" opacity=".18" />
                    </svg>
                  </span>
                )}
                {g?.clawHit?.q === q && g.clawHit.r === g.roundJustPlayed && (
                  <span className="absolute inset-0 pointer-events-none flex items-center justify-center" style={{ zIndex: 7 }}>
                    <svg width="76" height="76" viewBox="0 0 60 60" className="fxClawLash">
                      <circle cx="30" cy="27" r="19" fill="#dc2626" opacity=".16" />
                      <circle cx="32" cy="24" r="11" fill="#a855f7" opacity=".22" />
                      <path d="M44 6 Q28 20 10 36" fill="none" stroke="#450a0a" strokeWidth="5.5" strokeLinecap="round" opacity=".9" />
                      <path d="M50 14 Q33 28 16 44" fill="none" stroke="#450a0a" strokeWidth="5.5" strokeLinecap="round" opacity=".9" />
                      <path d="M54 24 Q38 36 24 50" fill="none" stroke="#450a0a" strokeWidth="5" strokeLinecap="round" opacity=".85" />
                      <path d="M44 6 Q28 20 10 36" fill="none" stroke="#ef4444" strokeWidth="2.6" strokeLinecap="round" />
                      <path d="M50 14 Q33 28 16 44" fill="none" stroke="#ef4444" strokeWidth="2.6" strokeLinecap="round" />
                      <path d="M54 24 Q38 36 24 50" fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" />
                      <path d="M44 6 L47 3 M50 14 L53.5 11 M54 24 L57 21.5" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" />
                      <path d="M13 22 L8 19 M40 46 L44 50" stroke="#a855f7" strokeWidth="1.8" strokeLinecap="round" opacity=".9" />
                    </svg>
                  </span>
                )}
                {g.terrain[q] && <TerrainSkin kind={g.terrain[q].kind} />}
                {g.terrain[q] && (() => { const tm = TERRA_META[g.terrain[q].kind]; return tm ? (<>
                  <span className="absolute inset-0 pointer-events-none" style={{ zIndex: 5, boxShadow: `inset 0 0 0 2px ${tm.hex}44, inset 0 0 22px ${tm.hex}22` }} />
                  <span onClick={(e) => { e.stopPropagation(); setTip(g.terrain[q].kind); }} className="absolute bottom-1 left-2 z-10 text-[9px] font-black tracking-wider rounded px-1 py-0.5 cursor-pointer inline-flex items-center gap-0.5" style={{ color: tm.hex, background: "rgba(0,0,0,.55)", border: `1px solid ${tm.hex}55`, textShadow: `0 0 6px ${tm.hex}66` }}>{g.terrain[q].kind === "mire" ? <CurseDoll size={11} /> : tm.icon} {tm.name}</span>
                </>) : null; })()}
                {g.relics?.board.includes(q) && <span onClick={(e) => { e.stopPropagation(); setTip("relic"); }} className="absolute top-1 right-1 z-10 cursor-pointer" style={{ filter: "drop-shadow(0 0 9px #eab308)", animation: REDUCED ? "none" : "venPulse 1.8s infinite", background: "radial-gradient(circle, rgba(234,179,8,.26), transparent 70%)", borderRadius: "50%", padding: 3 }}><RelicGrail size={26} /></span>}
                {g.kessQ === q && <span onClick={(e) => { e.stopPropagation(); setTip("kess"); }} className="absolute top-1 left-2 z-10 cursor-pointer" style={{ filter: "drop-shadow(0 0 7px #16a34a)", opacity: g.kessStun >= g.round ? 0.35 : 1, background: "radial-gradient(circle, rgba(22,163,74,.30), transparent 70%)", borderRadius: "50%", padding: 3 }}><KessMini size={27} /></span>}
                {g.undineQ === q && <span onClick={(e) => { e.stopPropagation(); setTip("undine"); }} className="absolute bottom-1 right-2 z-10 cursor-pointer" style={{ filter: "drop-shadow(0 0 8px #0d9488)", opacity: g.undineStun >= g.round ? 0.35 : 1, background: "radial-gradient(circle, rgba(13,148,136,.30), transparent 70%)", borderRadius: "50%", padding: 3 }}><UndineMini size={26} /></span>}
                {planning && g.aiForcedMove === q && (
                  <span onClick={(e) => { e.stopPropagation(); setTip("tolleye"); }} className="absolute top-1 left-1/2 -translate-x-1/2 z-10 text-sm cursor-pointer rounded-full px-1.5" style={{ background: "rgba(0,0,0,.55)", border: "1px solid #fbbf2466", textShadow: "0 0 8px #f59e0b", animation: REDUCED ? "none" : "venPulse 1.6s infinite" }}>👁</span>
                )}
                <span className="absolute top-1.5 left-2 text-xs text-stone-500 z-10" style={{ textShadow: "0 1px 2px #000" }}>{q}</span>
                {flashes.filter((f) => f.q === q).map((f) => <QuadFx key={f.id} ty={f.ty} el={f.el} />)}
                {railNow && g.phase === "prompt" && railPick && (q === railPick ? (
                  <span className="absolute inset-0 z-20 grid place-items-center pointer-events-none">
                    <span className="absolute inset-1 rounded-lg" style={{ border: "3px solid #fbbf24", boxShadow: "0 0 18px #f59e0b, inset 0 0 18px #f59e0b55", animation: "venPulse 1.1s infinite" }} />
                    <span className="text-[11px] font-black tracking-widest text-stone-950 rounded px-2 py-0.5" style={{ background: "#fbbf24", boxShadow: "0 0 14px #f59e0b" }}>⚑ TAP HERE</span>
                  </span>
                ) : <span className="absolute inset-0 bg-black/45 pointer-events-none" style={{ zIndex: 6 }} />)}
                {railNow && planning && ["move", "target", "splash", "secondary"].includes(sel.step) && (() => {
                  const want = sel.step === "move" ? railNow.you.moveTo : sel.step === "target" ? railNow.you.target : sel.step === "splash" ? railNow.you.splash : railNow.you.secondary;
                  if (q === want) return (
                    <span className="absolute inset-0 z-20 grid place-items-center pointer-events-none">
                      <span className="absolute inset-1 rounded-lg" style={{ border: "3px solid #fbbf24", boxShadow: "0 0 18px #f59e0b, inset 0 0 18px #f59e0b55", animation: "venPulse 1.1s infinite" }} />
                      <span className="text-[11px] font-black tracking-widest text-stone-950 rounded px-2 py-0.5" style={{ background: "#fbbf24", boxShadow: "0 0 14px #f59e0b" }}>{sel.step === "move" ? (want === me.pos ? "⬇ HOLD HERE" : "⬆ MOVE HERE") : "🎯 TAP TO AIM"}</span>
                    </span>
                  );
                  return <span className="absolute inset-0 bg-black/45 pointer-events-none" style={{ zIndex: 6 }} />;
                })()}
                {railNow && planning && railNow.foe.target === q && (
                  <span className="absolute bottom-1 right-2 z-10 text-[9px] font-black tracking-wider rounded px-1 py-0.5" style={{ color: "#fca5a5", background: "rgba(0,0,0,.6)", border: "1px solid #ef444466" }}>⚔ FOE AIM</span>
                )}
              </button>
            );
          })}
          <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(90deg, rgba(255,255,255,.03), transparent 30%, transparent 70%, rgba(255,255,255,.02))", animation: REDUCED ? "none" : "fogDrift 9s ease-in-out infinite alternate" }} />
          <div className="absolute inset-0 pointer-events-none">
            {[me, ai].map((s, i) => {
              const key = i === 0 ? "P" : "A";
              const c = QPOS[s.pos];
              const F = FIGHTERS[s.fk];
              return (
                <div key={key} className="absolute" style={{
                  left: `calc(${c.x}% + ${i === 0 ? "6%" : "27%"})`, top: `calc(${c.y}% + 8%)`,
                  transition: "left .45s cubic-bezier(.2,.9,.3,1.2), top .45s cubic-bezier(.2,.9,.3,1.2)",
                  animation: hitTok === key ? "tokenHit .4s ease" : "none",
                }}>
                  <span className="absolute left-1/2 -translate-x-1/2 rounded-full" style={{ bottom: -3, width: 34, height: 8, background: "radial-gradient(closest-side, rgba(0,0,0,.7), transparent)" }} />
                  <span className="relative block" style={{ filter: `drop-shadow(0 0 8px ${F.hex}66)` }}>
                    <VecFig fk={s.fk} size={44} flip={i === 1} />
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CONTROL */}
      {g.tut && railNow && (planning || ["clashPlan", "craven", "prompt", "feintPick", "feintClash", "umbral"].includes(g.phase)) && (() => {
        const rab = ABILITIES[railNow.you.ab];
        const isClashP = g.phase === "clashPlan";
        let directive = null, doStep = null;
        if (g.phase === "prompt" && g.prompts[0]) { const pk = railPromptPick(g, g.prompts[0]); if (pk) { directive = g.prompts[0].kind === "gift" ? "Take the heal" : `${(g.prompts[0].label || "Choose").split(":")[0]} → ${pk}`; doStep = () => answerPrompt(pk); } }
        else if (g.phase === "feintPick" || g.phase === "feintClash") {
          const pv = railNow.rail.pv || "keep";
          const pab2 = ABILITIES[g.phase === "feintPick" ? (g.planSel?.ab || railNow.you.ab) : g.pendClash.ab];
          directive = pv === "pivot" ? `PIVOT to ${TYPE_LABEL[pab2.pivot]} (1◆)` : `Keep ${TYPE_LABEL[pab2.type]}`;
          doStep = () => (g.phase === "feintPick" ? confirmFeint(pv === "pivot" ? pab2.pivot : null, pv === "pivot") : confirmFeintClash(pv === "pivot" ? pab2.pivot : null, pv === "pivot"));
        }
        else if (isClashP) { directive = `Clash — use ${rab.name}`; doStep = () => confirmClash(railNow.you.ab, false, null, null); }
        else if (planning) {
          if (sel.step === "move") { const hold = railNow.you.moveTo === me.pos; directive = hold ? `Hold your ground in ${me.pos}` : `Move to ${railNow.you.moveTo}`; doStep = () => setSel({ ...sel, moveTo: railNow.you.moveTo, step: "action" }); }
          else if (sel.step === "action") { directive = `Use ${rab.name}`; doStep = () => setSel({ ...sel, ab: railNow.you.ab, soft: false, form: null, string: false, target: null, splash: null, secondary: null, step: rab.type === "ward" ? "confirm" : "target" }); }
          else if (sel.step === "target") { directive = `Aim at ${railNow.you.target}`; doStep = () => setSel({ ...sel, target: railNow.you.target, step: rab.needsSplash ? "splash" : rab.needsSecondary ? "secondary" : "confirm" }); }
          else if (sel.step === "splash") { directive = `Splash into ${railNow.you.splash}`; doStep = () => setSel({ ...sel, splash: railNow.you.splash, step: "confirm" }); }
          else if (sel.step === "secondary") { directive = `Second strike: ${railNow.you.secondary}`; doStep = () => setSel({ ...sel, secondary: railNow.you.secondary, step: "confirm" }); }
          else if (sel.step === "confirm") { directive = "Lock it in"; doStep = confirmPlan; }
        }
        return (
          <div className="rounded-lg border border-amber-700/50 bg-amber-950/30 p-2.5 mb-2 relative">
            <div className="text-xs font-black text-amber-400 tracking-widest mb-0.5">LESSON · ROUND {g.round}</div>
            <p className="text-xs text-amber-100/90 leading-relaxed pr-14">{railNow.say}{" "}<span className="text-stone-500 italic" style={{ fontSize: 10 }}>(Other lines exist — the story locks the strongest.)</span></p>
            {railNow.foe.target && planning && <p className="text-[10px] text-red-300/90 mt-1">⚔ Foe's aim this round: <b>{railNow.foe.target}</b> — marked on the board.</p>}
            {directive && doStep && (
              <button onClick={doStep} className="mt-2 w-full rounded-lg py-2 font-black text-sm border border-amber-500 bg-amber-500 text-stone-950" style={{ boxShadow: "0 0 14px #f59e0b88" }}>▶ {directive}</button>
            )}

            <button onClick={() => { clearTimers(); setScreen("title"); G.current = null; }} className="absolute top-2 right-2 text-xs text-stone-400 border border-stone-700 rounded px-1.5 py-0.5 bg-stone-900">Skip ✕</button>
          </div>
        );
      })()}
      {confirmExit && (
        <div className="rounded-lg border border-red-800/60 bg-red-950/30 px-2.5 py-2 mb-2 flex items-center gap-2">
          <p className="text-xs text-red-200/90 flex-1">Leave the match? Progress is lost.</p>
          <button onClick={() => { clearTimers(); G.current = null; setConfirmExit(false); setScreen("title"); }} className="text-xs text-red-300 border border-red-700 rounded px-2 py-1 bg-stone-900">Exit</button>
          <button onClick={() => setConfirmExit(false)} className="text-xs text-stone-400 border border-stone-700 rounded px-2 py-1 bg-stone-900">Stay</button>
        </div>
      )}
      {tip && STATUS_INFO[tip] && (
        <div className="rounded-lg border border-stone-700 bg-stone-900 px-2.5 py-2 mb-2 flex items-start gap-2">
          <p className="text-xs text-stone-300 leading-relaxed flex-1">{STATUS_INFO[tip]}</p>
          <button onClick={() => setTip(null)} className="text-xs text-stone-500 border border-stone-700 rounded px-1.5">✕</button>
        </div>
      )}
      <div className="rounded-lg border border-stone-800 bg-stone-900 p-3 mb-2">
        {planning && (
          <div>
            <div className="flex gap-1 mb-2 text-xs flex-wrap">
              {[me.rooted ? null : "move", "action", selTy === "ward" ? null : "target", "confirm"].filter(Boolean).map((st) => (
                <span key={st} className={`px-2 py-0.5 rounded-full border ${sel.step === st || (st === "target" && ["target", "splash", "secondary"].includes(sel.step)) ? "border-amber-500 text-amber-300" : "border-stone-700 text-stone-500"}`}>{st}</span>
              ))}
              {me.rooted && <span className="px-2 py-0.5 rounded-full border border-sky-700 text-sky-300">⛓ rooted</span>}
              {g.aiForcedMove && <span className="px-2 py-0.5 rounded-full border border-emerald-700 text-emerald-300">👁 foe → {g.aiForcedMove}</span>}
            </div>
            {sel.step === "move" && <div>
              <p className="text-sm text-stone-300 mb-1.5">Tap a quadrant to move — or hold your ground.</p>
              <BigBtn dim disabled={!!(railNow && railNow.you.moveTo !== me.pos)} onClick={() => setSel({ ...sel, moveTo: me.pos, step: "action" })}>Stay in {me.pos}</BigBtn>
            </div>}
            {sel.step === "action" && <div className="grid gap-1.5 max-h-52 overflow-y-auto">
              {affordActions().map(({ id, soft, form, string, extraCost }) => (
                <AbilityBtn key={id + (form || "") + (string ? "s" : "") + soft} id={id} soft={soft} form={form} string={string} extraCost={extraCost} locked={!!(railNow && id !== railNow.you.ab)} onPick={() => {
                  const ab = ABILITIES[id];
                  const ety = form || ab.type;
                  setSel({ ...sel, ab: id, soft, form: form || null, string: !!string, target: null, splash: null, secondary: null, step: ety === "ward" ? "confirm" : "target" });
                }} />
              ))}
            </div>}
            {sel.step === "target" && <p className="text-sm text-stone-300">Tap where to <b>attack</b> — aim where they'll <b>be</b>, not where they are. Right read: direct hit. Wrong read: nothing at all. Their current square only pays if they stay.</p>}
            {sel.step === "splash" && <p className="text-sm text-stone-300">Splash quadrant — <b>adjacent to {sel.target}</b>.</p>}
            {sel.step === "secondary" && <p className="text-sm text-stone-300">Second quadrant — anywhere except {sel.target}.</p>}
            {sel.step === "confirm" && <div>
              <p className="text-sm text-stone-300 mb-1">Move → <b>{sel.moveTo}</b> · {ABILITIES[sel.ab].name}{sel.soft ? " (soft)" : ""}{sel.target ? <> → <b>{sel.target}</b></> : ""}{sel.splash ? ` (+${sel.splash})` : ""}{sel.secondary ? ` (+${sel.secondary})` : ""}</p>
              <p className="text-xs text-stone-500 italic mb-0.5">"{ABILITIES[sel.ab].lore}"</p>
              <p className="text-xs text-stone-400 mb-2">{ABILITIES[sel.ab].text} · <span className="text-amber-300">Adv:</span> {ABILITIES[sel.ab].adv}</p>
              <div className="grid grid-cols-2 gap-2">
                <BigBtn onClick={confirmPlan} disabled={!readyToConfirm}>Lock in ▸</BigBtn>
                <BigBtn dim onClick={() => resetSel(g)}>Redo</BigBtn>
              </div>
            </div>}
          </div>
        )}
        {g.phase === "umbral" && (
          <div>
            <div className="text-emerald-400 font-bold text-sm mb-1">🌫 Umbral Step — the reveal:</div>
            <p className="text-xs text-stone-300">Foe: <b>{ABILITIES[g.aiPlan.ab].name}</b> [{TYPE_LABEL[ABILITIES[g.aiPlan.ab].type]}], moving to <b>{g.aiPlan.moveTo}</b>{g.aiPlan.target ? <>, targeting <b>{g.aiPlan.target}</b></> : ""}. Tap your move.</p>
          </div>
        )}
        {g.phase === "prompt" && g.prompts[0] && !g.prompts[0].buttons && <p className="text-sm text-amber-300">⚑ {g.prompts[0].label || "Choose a quadrant"} — tap the board.</p>}
        {g.phase === "feintPick" && g.aiPlan && (() => { const pab = ABILITIES[sel.ab || g.planSel?.ab]; return (
          <div>
            <p className="text-sm text-stone-300 mb-1">⚔ THE REVEAL — foe: <b>{ABILITIES[g.aiPlan.ab].name}</b> [{TYPE_LABEL[g.aiPlan.form || ABILITIES[g.aiPlan.ab].type]}]{g.aiPlan.target ? ` → ${g.aiPlan.target}` : ""}</p>
            <p className="text-xs text-stone-500 mb-2">Nine Edges — keep your grip, or pay 1◆ to pivot.</p>
            <div className="grid grid-cols-2 gap-2">
              <BigBtn onClick={() => confirmFeint(null, false)}>Keep {TYPE_LABEL[pab.type]}</BigBtn>
              <BigBtn dim disabled={me.pow < pab.cost + 1} onClick={() => confirmFeint(pab.pivot, true)}>⇄ Pivot to {TYPE_LABEL[pab.pivot]} (1◆)</BigBtn>
            </div>
          </div>
        ); })()}
        {g.phase === "feintClash" && g.aiPlan && (() => { const pab = ABILITIES[g.pendClash.ab]; return (
          <div>
            <p className="text-sm text-stone-300 mb-1">⚔ CLASH REVEAL — foe: <b>{ABILITIES[g.aiPlan.ab].name}</b> [{TYPE_LABEL[g.aiPlan.form || ABILITIES[g.aiPlan.ab].type]}]</p>
            <p className="text-xs text-stone-500 mb-2">Nine Edges — keep your grip, or pay 1◆ to pivot.</p>
            <div className="grid grid-cols-2 gap-2">
              <BigBtn onClick={() => confirmFeintClash(null, false)}>Keep {TYPE_LABEL[pab.type]}</BigBtn>
              <BigBtn dim disabled={me.pow < pab.cost + 1} onClick={() => confirmFeintClash(pab.pivot, true)}>⇄ Pivot to {TYPE_LABEL[pab.pivot]} (1◆)</BigBtn>
            </div>
          </div>
        ); })()}
        {g.phase === "prompt" && g.prompts[0]?.buttons && (
          <div>
            <p className="text-sm text-amber-300 mb-2">⚑ {g.prompts[0].label}</p>
            <div className="grid grid-cols-2 gap-2">
              {g.prompts[0].buttons.map((b) => <BigBtn key={b.v} onClick={() => answerPrompt(b.v)}>{b.label}</BigBtn>)}
            </div>
          </div>
        )}
        {g.phase === "playing" && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-500 uppercase tracking-widest">resolving…</span>
            <button onClick={skipPlay} className="text-xs text-stone-400 border border-stone-700 rounded px-2 py-1">Skip ▸</button>
          </div>
        )}
        {g.phase === "craven" && (
          <div>
            <p className="text-sm text-stone-300 mb-2">🌫 <b>Craven Shadow</b> — pay 2◆ to slip this clash?</p>
            <div className="grid grid-cols-2 gap-2">
              <BigBtn onClick={() => useCraven(true)}>Slip it (−2◆)</BigBtn>
              <BigBtn dim onClick={() => useCraven(false)}>Face the clash</BigBtn>
            </div>
          </div>
        )}
        {g.phase === "clashPlan" && (
          <div>
            <div className="text-xs text-red-400 font-black uppercase tracking-widest mb-2">Clash — choose your action{g.round === 10 ? " · FINAL: winner +2" : ""}</div>
            <div className="grid gap-1.5 max-h-52 overflow-y-auto">
              {affordActions().map(({ id, soft, form, string, extraCost }) => <AbilityBtn key={id + (form || "") + (string ? "s" : "") + soft} id={id} soft={soft} form={form} string={string} extraCost={extraCost} locked={!!(railNow && id !== railNow.you.ab)} onPick={() => confirmClash(id, soft, form, string)} />)}
            </div>
          </div>
        )}
        {g.phase === "sudden" && (
          <div>
            <div className="text-center font-black tracking-widest text-red-400 mb-1">SUDDEN DEATH</div>
            {sudden && <p className="text-center text-xs text-stone-400 mb-1">{TYPE_LABEL[sudden.p]} vs {TYPE_LABEL[sudden.a]} — tied. Again.</p>}
            <div className="grid grid-cols-3 gap-2">
              {["break", "rush", "ward"].map((t) => (
                <button key={t} onClick={() => throwSudden(t)} className={`rounded-lg border py-3 font-black text-sm ${TYPE_CLS[t]}`}>{TYPE_LABEL[t]}</button>
              ))}
            </div>
          </div>
        )}
        {g.phase === "over" && (
          <div className="text-center py-2">
            <div className="flex justify-center mb-2"><Portrait fk={g.winner === "A" ? ai.fk : me.fk} size={92} /></div>
            <div className={`font-serif italic text-4xl ${g.winner === "LESSON" ? "text-amber-300" : g.winner === "P" ? "text-emerald-400" : "text-red-500"}`} style={{ textShadow: "0 0 40px rgba(220,38,38,.4)" }}>
              {g.winner === "LESSON" ? "Lesson Complete" : g.winner === "P" ? "Victory" : "Slain"}
            </div>
            <p className="text-xs text-stone-500 uppercase tracking-widest mt-1">{g.tut ? "Tutorial complete — the real Crucible awaits" : "The Crucible has spoken"}</p>
            <p className="text-xs text-stone-400 mt-2 mb-3">Final — you {Math.max(0, me.hp)} HP · foe {Math.max(0, ai.hp)} HP</p>
            {g.stats && (
              <div className="rounded-lg border border-stone-800 bg-stone-950 p-3 mb-3 text-left max-w-xs mx-auto">
                <div className="text-xs text-stone-600 uppercase tracking-widest mb-1.5 text-center">Match Record — R{g.roundJustPlayed}</div>
                {[
                  ["Direct hits", g.stats.dir.P, g.stats.dir.A],
                  ["Whiffs", g.stats.whiff.P, g.stats.whiff.A],
                  ["Advantages won", g.stats.adv.P, g.stats.adv.A],
                  ["Damage dealt", g.stats.dmg.P, g.stats.dmg.A],
                ].map(([k, p, a2]) => (
                  <div key={k} className="flex justify-between text-xs text-stone-300 py-0.5 border-b border-stone-900 last:border-0">
                    <span className="text-stone-500">{k}</span><span>you {p} · foe {a2}</span>
                  </div>
                ))}
                <div className="flex justify-between text-xs text-stone-300 py-0.5">
                  <span className="text-stone-500">Collisions / Clashes</span><span>{g.stats.col} / {g.stats.clashes}</span>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <BigBtn dim onClick={() => { clearTimers(); G.current = null; setScreen("title"); }}>⌂ Main Menu</BigBtn>
              <BigBtn onClick={() => { const lesson = g.winner === "LESSON"; const wasTut = g.tut; const cfg = { pFk: g.P.fk, pLoad: g.P.load, pPass: g.P.pass, aiFk: g.A.fk, aiLoad: g.A.load, aiPass: g.A.pass, diff: g.diff }; clearTimers(); G.current = null; if (lesson) startGame(cfg); else if (wasTut) startGame({ ...cfg, tut: true }); else startGame({ aiFk: cfg.aiFk, aiLoad: cfg.aiLoad, aiPass: cfg.aiPass, diff: cfg.diff }); }}>{g.winner === "LESSON" ? "⚔ For real ▸" : "Rematch ▸"}</BigBtn>
            </div>
          </div>
        )}
      </div>

      {g.vs && (
        <div className="flex items-center justify-between gap-1.5 rounded-lg border border-stone-800 bg-stone-900 px-2 py-1.5 mb-2 text-xs">
          <span className={`px-1.5 py-0.5 rounded border truncate ${TYPE_CLS[g.vs.p.ty]}`}>{g.vs.p.n}{g.vs.p.tq ? "→" + g.vs.p.tq : ""}</span>
          <span className="text-stone-300 font-black whitespace-nowrap text-center">{g.vs.note}</span>
          <span className={`px-1.5 py-0.5 rounded border truncate ${TYPE_CLS[g.vs.a.ty]}`}>{g.vs.a.n}{g.vs.a.tq ? "→" + g.vs.a.tq : ""}</span>
        </div>
      )}
      <div className="rounded-lg border border-stone-800 bg-stone-950 p-3 max-h-44 overflow-y-auto">
        <div className="text-xs text-stone-600 uppercase tracking-widest mb-1.5">This round · newest first</div>
        {[...g.feed].reverse().map((l, i) => <div key={g.feed.length - i} className="text-xs text-stone-300 leading-relaxed" style={{ animation: i === 0 ? "feedIn .3s ease both" : "none" }}>{l.t}</div>)}
      </div>

      {showLog && (
        <div className="fixed inset-0 z-50 bg-black/90 overflow-y-auto p-4">
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="font-serif italic text-2xl text-stone-100">Battle Record</div>
              <button onClick={() => setShowLog(false)} className="text-stone-300 border border-stone-700 rounded px-3 py-1 text-sm bg-stone-900">Close ✕</button>
            </div>
            <div className="mb-4">
              <div className="text-xs font-black text-red-400 tracking-widest mb-1">CURRENT — ROUND {g.roundJustPlayed || g.round}{g.vs ? ` · ${g.vs.note}` : ""}</div>
              {g.feed.map((l, i) => <div key={i} className="text-xs text-stone-300 leading-relaxed">{l.t}</div>)}
              {g.feed.length === 0 && <div className="text-xs text-stone-600">Nothing resolved yet this round.</div>}
            </div>
            {g.history.map((h) => (
              <div key={h.r} className="mb-3 pb-2 border-b border-stone-900">
                <div className="text-xs font-black text-stone-400 tracking-widest mb-0.5">ROUND {h.r}{h.vs ? ` — ${h.vs.note}` : ""}</div>
                {h.vs && <div className="text-xs text-stone-500 mb-1">{h.vs.p.n}{h.vs.p.tq ? "→" + h.vs.p.tq : ""} vs {h.vs.a.n}{h.vs.a.tq ? "→" + h.vs.a.tq : ""}</div>}
                {(h.lines || []).map((t, i) => <div key={i} className="text-xs text-stone-400 leading-relaxed">{t}</div>)}
              </div>
            ))}
            {g.history.length === 0 && <div className="text-xs text-stone-600">No past rounds yet.</div>}
          </div>
        </div>
      )}
      {showHelp && (
        <div className="fixed inset-0 z-50 bg-black/90 overflow-y-auto p-4">
          <div className="max-w-md mx-auto text-xs text-stone-300 leading-relaxed">
            <div className="flex items-center justify-between mb-3">
              <div className="font-serif italic text-2xl text-stone-100">How to Fight</div>
              <button onClick={() => setShowHelp(false)} className="text-stone-300 border border-stone-700 rounded px-3 py-1 text-sm bg-stone-900">Close ✕</button>
            </div>
            <p className="mb-2"><b className="text-red-400">THE TRIANGLE.</b> Break shatters Ward · Ward catches Rush · Rush interrupts Break. One rule: <b>the winner's action resolves at +1.</b> Wards are attacks with defensive timing — every guard RIPOSTES for 1 when it catches; Advantage sharpens it to 2. Signature abilities add an effect on top; that's what their ◆ buys.</p>
            <p className="mb-2"><b className="text-amber-400">CONTACT IS BINARY.</b> Your attack lands where you aimed or it whiffs — no partial credit. Contact comes three ways: a direct hit (right read), a Collision (shared or swapped squares), or a Clash. Advantage riders fire ONLY when the triangle resolves in your favor — a triangle win, a guard break, or a ward catch. A clean read (you hit, they whiff) pays its own way: full effect, statuses, knockback, while they get nothing.</p>
            <p className="mb-2"><b className="text-stone-200">COLLISION.</b> End in the same quadrant — or swap quadrants — and both actions auto-connect: a forced mini-clash. Sharing a square is never peaceful.</p>
            <p className="mb-2"><b className="text-red-400">CLASH (rounds 3, 7, 10).</b> No movement; actions auto-connect; the winner places BOTH fighters anywhere and gets their FULL effect — terrain and summons included. A broken action is gone — cost, effect, everything; that's the stake. Same-type = a trade at base (setup still lands — engines want ties). Round 10 is FINAL — the winner strikes +2 (a flat edge, not a multiplier: the finale threatens without one guess erasing nine rounds).</p>
            <p className="mb-2"><b className="text-violet-300">POWER ◆.</b> +1 at end of round unless you spent. Cap 3. Whiffed spenders still pay.</p>
            <p className="mb-2"><b className="text-stone-200">YOUR FOUR ARE ALL YOU HAVE.</b> No basic fallbacks — the draft is the fighter. Classes shape the pools: <b className="text-red-400">RAVAGERS</b> lean Rush/Break (kill first), <b className="text-amber-300">DUELISTS</b> lean Rush/Ward (strike, counter, trick, repeat), <b className="text-yellow-400">CHAMPIONS</b> lean Break/Ward (the hammer and the wall), <b className="text-sky-300">SHAPERS</b> lean Rush/Ward spent on the board (aggressive control). Class also tells you the FINISHER: Ravager and Champion ultimates are BREAKS (Rush the nuke turn); Duelist and Shaper ultimates are RUSHES (Ward it).</p>
            <p className="mb-1 text-stone-400 font-black uppercase tracking-widest">Keywords</p>
            <p className="mb-1">🧪 <b>Poison</b> — inert; at 3 stacks it RUPTURES for 3 and clears. 🔥 <b>Burn</b> — at round's end take 1, then a stack fades (cap 2); Combustion detonates stacks mid-round at double value, and detonated stacks never tick. ❄ <b>Chill</b> — next Break that hits you SHATTERS for extra; consumed. ⛓ <b>Rooted</b> — can't choose to move next round.</p>
            <p className="mb-1"><CurseDoll size={13} /> <b>Curse</b> — inert until Round 8, then 1 dmg per 3 stacks each round (never expires). ⏳ <b>Doombrand</b> — detonates for 3 on its round. ↓ <b>Weakened</b> — your hits deal −1. 🩸 <b>Blood Price</b> — HP paid as a cost (never below 1).</p>
            <p className="mb-1">✦ <b>Relics</b> (vs Kastor) — spawn rounds 2/4/6/8; end a round on one to claim. Kastor wins at 3; anyone else destroys it for heal/◆.</p>
            <p className="mb-1">⛰ <b>Dominion</b> (vs Dhoram) — his converted ground; all 4 quadrants = his win. Land a BREAK while standing on a tile to demolish it. 🌀 <b>Whirlpools</b> yank an adjacent foe in as they open and grind occupants 1/round; <b>Crashing Surf</b> batters and throws; her <b>Undine</b> chips its square. 🎯 <b>Marked</b> (Kess's quadrant) — +1 dmg from Wrenna. Dregan runs on <b>Flow</b> (bank +1 via wards, Cadence, and Advantages) and <b>Pivots</b> — Crescent and Chain can switch grip after the reveal for 1◆; sometimes the pivot only buys a trade, and that's the point.</p>
            <p className="mb-1">Terrain (one per quadrant): <b>Frost</b> chills, <b>Scorched</b> burns, <b>Poisoned</b> poisons, <b>Mire</b> curses, <b>Sanctuary</b> heals Kastor and sears everyone else.</p>
            <p className="mb-2">🛡 <b>COUNTER STANCE.</b> That's what Ward cards say now, because a guard is not armor — it never reduces damage on its own. While warding: a Rush that hits you is stopped COLD (0 damage) and answered with your riposte; a Break shatters straight through for everything; splash still chips you. Everything else a Ward does is what its ◆ bought (heals, anchors, terrain, Flow).</p>
            <p className="mb-2">✊ <b>THE SHOVE.</b> Win a direct exchange and YOU choose: stagger them into either adjacent quadrant, or hold them right where they stand. Aim shoves into hazards, off relics, or into your own square if you want them close. The premium rider (Red Harvest) upgrades the shove to ANYWHERE. Anchored fighters can't be moved.</p>
            <p className="text-stone-500">Statuses apply on any contact. Payoffs (Shatter, Combustion, Rupture, executes) want direct hits. Setup is guaranteed; the kill is earned.</p>
          </div>
        </div>
      )}
    </Shell>
  );
}

/* ============ shared UI ============ */
function Shell({ children }) {
  return (
    <div className="min-h-screen text-stone-200 px-3 py-4 relative overflow-hidden" style={{ background: "radial-gradient(120% 90% at 50% 0%, #1c1917 0%, #0c0a09 60%, #000 100%)", fontFamily: "ui-sans-serif, system-ui" }}>
      <div className="max-w-md mx-auto relative">{children}</div>
    </div>
  );
}
function Embers() {
  if (REDUCED) return null;
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <span className="absolute inset-x-0 bottom-0 h-44" style={{ background: "linear-gradient(to top, rgba(249,115,22,.12), rgba(220,38,38,.05), transparent)" }} />
      {Array.from({ length: 68 }).map((_, i) => {
        const c = i % 3 === 0 ? "#fde047" : i % 2 ? "#f97316" : "#ef4444";
        const sz = 1.8 + (i % 6) * 0.9;
        return (
          <span key={i} className="absolute rounded-full" style={{ left: `${(i * 23 + 3) % 97}%`, bottom: "-4vh", width: sz, height: sz, background: c, opacity: 0, filter: "blur(0.3px)", boxShadow: `0 0 ${6 + (i % 4) * 4}px ${c}`, animation: `emberUp ${5 + (i % 8)}s linear ${(i * 0.28) % 8}s infinite`, "--emax": 0.55 + (i % 4) * 0.13, "--sway": `${(i % 2 ? -1 : 1) * (5 + (i % 6) * 4)}px` }} />
        );
      })}
    </div>
  );
}
function QuadFx({ ty, el }) {
  const glow = <div className="absolute inset-0" style={{ background: `radial-gradient(closest-side, ${el || TYPE_HEX[ty]}55, transparent)`, animation: "glowFade .6s ease-out both" }} />;
  if (ty === "ward") return <div className="absolute inset-0 grid place-items-center pointer-events-none">{glow}
    {[0, 1, 2].map((i) => <div key={i} className="absolute w-16 h-16 rounded-full border-4" style={{ borderColor: el || TYPE_HEX.ward, animation: `ringPulse .9s ease-out ${i * 0.16}s both`, boxShadow: `0 0 12px ${el || TYPE_HEX.ward}66` }} />)}
  </div>;
  if (ty === "rush") return (
    <div className="absolute inset-0 pointer-events-none">{glow}
      {[0, 1, 2].map((i) => (
        <div key={i} className="absolute h-1 rounded-full" style={{ top: `${28 + i * 18}%`, left: "12%", right: "12%", background: el || TYPE_HEX.rush, animation: `rushIn .5s ease-out ${i * 0.07}s both` }} />
      ))}
    </div>
  );
  return (
    <div className="absolute inset-0 pointer-events-none">{glow}
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
        <g stroke={el || TYPE_HEX.break} strokeLinecap="round" fill="none" style={{ animation: "crackOut .55s ease-out both", transformOrigin: "50% 50%" }}>
          <path d="M50 50 L28 24 L24 14 M50 50 L76 28 L84 20 M50 50 L20 58 L10 56 M50 50 L78 64 L90 70 M50 50 L42 80 L38 92 M50 50 L62 76 L68 88" strokeWidth="2.6" />
          <path d="M50 50 L34 40 M50 50 L66 44 M50 50 L58 62" strokeWidth="1.4" opacity=".8" />
        </g>
        <g fill={el || TYPE_HEX.break}>
          <path d="M12 12 L20 16 L14 22 Z" style={{ animation: "shardIn .5s ease-in both" }} />
          <path d="M88 14 L82 22 L92 24 Z" style={{ animation: "shardIn .5s ease-in .06s both" }} />
          <path d="M10 84 L18 78 L20 88 Z" style={{ animation: "shardIn .5s ease-in .1s both" }} />
          <path d="M90 86 L80 82 L86 74 Z" style={{ animation: "shardIn .5s ease-in .14s both" }} />
        </g>
        <circle cx="50" cy="50" r="10" fill="none" stroke={el || TYPE_HEX.break} strokeWidth="3" strokeDasharray="9 5" style={{ animation: "crackOut .55s ease-out both", transformOrigin: "50% 50%" }} />
      </svg>
    </div>
  );
}
const SPLASH_FX = {
  G: { kind: "drip", colors: ["#dc2626", "#7f1d1d"] },
  M: { kind: "rise", colors: ["#34d399", "#065f46"] },
  V: { kind: "snow", colors: ["#bae6fd", "#e0f2fe"] },
  C: { kind: "rise", colors: ["#f97316", "#fde047"] },
  K: { kind: "flicker", colors: ["#a78bfa", "#ede9fe"] },
  Z: { kind: "rise", colors: ["#ef4444", "#a855f7"] },
  L: { kind: "twinkle", colors: ["#fde047", "#fef3c7"] },
  O: { kind: "twinkle", colors: ["#a3e635", "#65a30d"] },
  D: { kind: "snow", colors: ["#a67c4a", "#78716c"] },
  Y: { kind: "bubble", colors: ["#5eead4", "#ccfbf1"] },
  W: { kind: "snow", colors: ["#4ade80", "#86efac"] },
  X: { kind: "flicker", colors: ["#e2e8f0", "#94a3b8"] },
};
function SplashFx({ fk }) {
  const cfg = SPLASH_FX[fk];
  if (!cfg || REDUCED) return null;
  return (
    <span className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 9 }).map((_, i) => {
        const c = cfg.colors[i % cfg.colors.length];
        const base = { position: "absolute", left: `${(i * 13 + 7) % 90}%`, background: c };
        if (cfg.kind === "drip") return <span key={i} style={{ ...base, top: "-6%", width: 2.5, height: 9, borderRadius: 3, boxShadow: `0 0 6px ${c}`, animation: `fxFall ${2.2 + (i % 3) * 0.7}s linear ${(i * 0.5) % 2.4}s infinite` }} />;
        if (cfg.kind === "rise") return <span key={i} style={{ ...base, bottom: "-4%", width: 3 + (i % 3), height: 3 + (i % 3), borderRadius: "50%", boxShadow: `0 0 8px ${c}`, animation: `fxRise ${2.4 + (i % 4) * 0.6}s linear ${(i * 0.45) % 2.6}s infinite` }} />;
        if (cfg.kind === "snow") return <span key={i} style={{ ...base, top: "-4%", width: 3, height: 3, borderRadius: "50%", boxShadow: `0 0 6px ${c}`, "--sx": `${(i % 2 ? -1 : 1) * (6 + (i % 4) * 4)}px`, animation: `fxDrift ${3 + (i % 4) * 0.8}s linear ${(i * 0.5) % 3}s infinite` }} />;
        if (cfg.kind === "flicker") return <span key={i} style={{ ...base, top: `${(i * 11 + 9) % 84}%`, width: 2 + (i % 2) * 6, height: 2, borderRadius: 2, boxShadow: `0 0 8px ${c}`, animation: `fxFlick ${0.9 + (i % 5) * 0.35}s steps(2) ${(i * 0.21) % 1.4}s infinite` }} />;
        if (cfg.kind === "bubble") return <span key={i} style={{ ...base, bottom: "-4%", width: 4 + (i % 3) * 2, height: 4 + (i % 3) * 2, borderRadius: "50%", border: `1px solid ${c}`, background: "transparent", boxShadow: `inset 0 0 4px ${c}`, "--sx": `${(i % 2 ? -1 : 1) * 9}px`, animation: `fxRiseSway ${2.8 + (i % 3) * 0.7}s ease-in ${(i * 0.5) % 2.8}s infinite` }} />;
        return <span key={i} style={{ ...base, top: `${(i * 17 + 11) % 82}%`, width: 4, height: 4, borderRadius: "50%", boxShadow: `0 0 10px ${c}`, animation: `fxTwinkle ${1.4 + (i % 4) * 0.5}s ease-in-out ${(i * 0.33) % 1.8}s infinite` }} />;
      })}
    </span>
  );
}
function VsSplash({ me, ai, onDone }) {
  const [lines] = useState(() => {
    const rivSet = RIVAL_TAUNTS[me.fk + ai.fk];
    if (rivSet) { const pair = rnd(rivSet); return { me: pair[me.fk], ai: pair[ai.fk] }; }
    return { me: rnd(TAUNTS[me.fk]), ai: rnd(TAUNTS[ai.fk]) };
  });
  const meLine = lines.me, aiLine = lines.ai;
  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/90" onClick={onDone}>
      <div className="absolute inset-y-0 left-0 flex items-center pl-4" style={{ width: "55%", clipPath: "polygon(0 0, 100% 0, 66% 100%, 0 100%)", background: `linear-gradient(135deg, ${FIGHTERS[me.fk].hex}33, #0c0a09)`, animation: REDUCED ? "none" : "cutL .45s ease-out both" }}>
        <div>
          <SplashFx fk={me.fk} /><span className={REDUCED ? "" : "pfx"} style={{ display: "inline-block" }}><Portrait fk={me.fk} size={100} /></span>
          <div className={`font-black mt-1 ${FIGHTERS[me.fk].tone}`}>{FIGHTERS[me.fk].short}</div>
          <div className="italic text-stone-200 mt-1.5 leading-snug" style={{ fontSize: 11, maxWidth: 108, overflowWrap: "break-word", animation: "feedIn .4s ease .5s both", textShadow: "0 1px 6px rgba(0,0,0,.85)" }}>"{meLine}"</div>
        </div>
      </div>
      <div className="absolute inset-y-0 right-0 flex items-center justify-end pr-4 text-right" style={{ width: "55%", clipPath: "polygon(34% 0, 100% 0, 100% 100%, 0 100%)", background: `linear-gradient(225deg, ${FIGHTERS[ai.fk].hex}33, #0c0a09)`, animation: REDUCED ? "none" : "cutR .45s ease-out both" }}>
        <div>
          <SplashFx fk={ai.fk} /><span className={REDUCED ? "" : "pfx"} style={{ display: "inline-block" }}><Portrait fk={ai.fk} size={100} /></span>
          <div className={`font-black mt-1 ${FIGHTERS[ai.fk].tone}`}>{FIGHTERS[ai.fk].short}</div>
          <div className="italic text-stone-200 mt-1.5 ml-auto leading-snug" style={{ fontSize: 11, maxWidth: 108, overflowWrap: "break-word", animation: "feedIn .4s ease .9s both", textShadow: "0 1px 6px rgba(0,0,0,.85)" }}>"{aiLine}"</div>
        </div>
      </div>
      <div className="absolute inset-x-0 top-6 text-center pointer-events-none">
        <div className="font-serif italic text-3xl text-stone-100" style={{ animation: "stampIn .5s ease-out .2s both", textShadow: "0 0 40px rgba(220,38,38,.6)" }}>THE CRUCIBLE CALLS</div>
        <div className="text-[10px] uppercase tracking-widest text-stone-500 mt-1">tap to begin</div>
      </div>
    </div>
  );
}
function ClashCutin({ round, me, ai }) {
  const final = round === 10;
  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/85">
      <div className="absolute inset-y-0 left-0 flex items-center pl-4" style={{ width: "55%", clipPath: "polygon(0 0, 100% 0, 66% 100%, 0 100%)", background: `linear-gradient(135deg, ${FIGHTERS[me.fk].hex}33, #0c0a09)`, animation: REDUCED ? "none" : "cutL .4s ease-out both" }}>
        <div className="flex items-center gap-3"><Portrait fk={me.fk} size={90} /><div className={`font-black ${FIGHTERS[me.fk].tone}`}>{FIGHTERS[me.fk].short}</div></div>
      </div>
      <div className="absolute inset-y-0 right-0 flex items-center justify-end pr-4" style={{ width: "55%", clipPath: "polygon(34% 0, 100% 0, 100% 100%, 0 100%)", background: `linear-gradient(225deg, ${FIGHTERS[ai.fk].hex}33, #0c0a09)`, animation: REDUCED ? "none" : "cutR .4s ease-out both" }}>
        <div className="flex items-center gap-3"><div className={`font-black ${FIGHTERS[ai.fk].tone}`}>{FIGHTERS[ai.fk].short}</div><Portrait fk={ai.fk} size={90} /></div>
      </div>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className={`font-serif italic ${final ? "text-amber-300" : "text-stone-100"} text-6xl`} style={{ animation: "stampIn .5s ease-out .25s both", textShadow: "0 0 50px rgba(220,38,38,.7)" }}>{final ? "FINAL CLASH" : "CLASH"}</div>
          <div className="text-xs uppercase tracking-widest text-stone-400 mt-2">{final ? "the winner strikes +2 · places both" : "no dodging · winner places both"}</div>
        </div>
      </div>
    </div>
  );
}
function BigBtn({ children, onClick, dim, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`w-full rounded-lg py-2.5 font-bold text-sm border transition ${disabled ? "opacity-40 border-stone-800 bg-stone-900" : dim ? "border-stone-700 bg-stone-900 hover:bg-stone-800" : "border-red-800 bg-red-950 text-red-200 hover:bg-red-900"}`}>
      {children}
    </button>
  );
}
function AbilityBtn({ id, soft, form, string, extraCost, onPick, locked }) {
  const ab = ABILITIES[id];
  const ty = form || ab.type;
  const cost = string ? extraCost : soft ? ab.soft.cost : ab.cost;
  return (
    <button onClick={locked ? undefined : onPick} disabled={locked} className={`w-full text-left rounded-lg border px-2.5 py-2 ${locked ? "opacity-30" : "hover:brightness-125"} ${TYPE_CLS[ty]}`}>
      <div className="flex items-center justify-between">
        <span className="font-bold text-sm">{ab.name}{form ? ` (${TYPE_LABEL[form]})` : ""}{string ? " +String" : ""}{soft ? " · soft" : ""}</span>
        <span className="text-xs">{TYPE_LABEL[ty]} · {cost}◆{ab.hpCost ? ` +${ab.hpCost}HP` : ""}{ab.pivot ? " · ⇄ pivot 1◆" : ""}</span>
      </div>
      <div className="text-xs opacity-80">{string ? "2 dmg + a follow-up chip of 1" : soft ? `reduced effect` : ab.text}</div>
    </button>
  );
}
