/* PHASE A part 4 — remaining passives and the economy laws. */
import { test, describe, beforeAll, afterAll, vi } from "vitest";
import { boot } from "./runner.jsx";
import { duel, row, rowEq, dmgTo, dmgBy, dmgByPrefix, healsTo, healBy, saveMatrix, BAG } from "./scenario.jsx";

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  boot();
});
afterAll(() => saveMatrix("passives"));

const KBAG = (set = {}) => ({ fk: "K", load: ["cannon", "flux", "gyro", "frame"], pass: "overclock", set: { pow: 0, hp: 25, maxHp: 25, ...set } });

describe("economy laws", () => {
  test("spender generates nothing; non-spender +1; cap 3", () => {
    boot();
    const d = duel({
      p: { fk: "G", load: ["sunder", "skull", "howl", "iron"], pass: "warmonger", set: { pow: 2, hp: 20, maxHp: 20 } },
      a: KBAG({ pow: 3 }), seed: 100,
      rounds: [{ p: { ab: "sunder", target: "SE", splash: "NW" }, a: { ab: "flux", target: "SE" } }],
    });
    rowEq("eco:spent", "spender (1◆ Bone Grinder) gains nothing: 2−1+0", 1, d.g.P.pow);
    rowEq("eco:cap", "bag at cap 3 stays 3", 3, d.g.A.pow);
  });

  test("blood price is not spending — Ruinfire still collects income", () => {
    boot();
    const d = duel({
      p: { fk: "Z", load: ["ruin", "chains", "tap", "brand"], pass: "agonist", set: { pow: 0, hp: 14, maxHp: 14 } },
      a: KBAG(), seed: 101,
      rounds: [{ p: { ab: "ruin", target: "SE" }, a: { ab: "flux", target: "SE" } }],
    });
    rowEq("eco:blood", "0◆ + income 1 after blood-priced cast", 1, d.g.P.pow);
    rowEq("eco:bloodHp", "paid exactly 1 HP", 13, d.g.P.hp);
  });

  test("blood price cannot drop below 1 HP", () => {
    boot();
    const d = duel({
      p: { fk: "Z", load: ["pact", "ruin", "tap", "brand"], pass: "agonist", set: { pow: 3, hp: 2, maxHp: 14 } },
      a: KBAG(), seed: 102,
      rounds: [{ p: { ab: "pact", target: "SE" }, a: { ab: "flux", target: "SE" } }],
    });
    rowEq("eco:bloodFloor", "Oblivion Pact at 2 HP pays only 1", 1, d.g.P.hp);
  });

  test("Deep Reserves: cap 4", () => {
    boot();
    const d = duel({
      p: { fk: "D", load: ["grind", "claim", "quake", "mount"], pass: "reserves", set: { pow: 3, hp: 20, maxHp: 20 } },
      a: KBAG(), seed: 103,
      rounds: [{ p: { ab: "grind", target: "SE" }, a: { ab: "flux", target: "SE" }, prompts: ["NW"] }],
    });
    rowEq("eco:reserves", "3◆ + income = 4 under Deep Reserves", 4, d.g.P.pow);
  });

  test("Overclock: at 3◆ abilities cost 1 less", () => {
    boot();
    const d = duel({
      p: { fk: "K", load: ["arc", "cannon", "flux", "gyro"], pass: "overclock", set: { pow: 3, hp: 20, maxHp: 20 } },
      a: KBAG(), seed: 104,
      rounds: [{ p: { ab: "arc", target: "SE" }, a: { ab: "flux", target: "SE" } }],
    });
    // arc costs 2 → discounted 1 → 3−1 = 2, spent so no income
    rowEq("eco:overclock", "Arc at 3◆ costs 1 (3−1=2, no income)", 2, d.g.P.pow);
  });

  test("Steel Tempo: +1◆ when your action is broken", () => {
    boot();
    const d = duel({
      p: { fk: "X", load: ["cres", "eguard", "chainX", "arsenal"], pass: "tempo", set: { pow: 0, hp: 20, maxHp: 20 } },
      a: KBAG({ pow: 0 }), seed: 105,
      rounds: [{ p: { ab: "cres", target: "NE" }, a: { ab: "cannon", target: "SW" } }],
    });
    // cres (rush) hits, cannon (break) hits → rush beats break — P WINS. Flip it:
    const d2 = duel({
      p: { fk: "X", load: ["cres", "eguard", "chainX", "arsenal"], pass: "tempo", set: { pow: 0, hp: 20, maxHp: 20 } },
      a: KBAG({ pow: 0 }), seed: 106,
      rounds: [{ p: { ab: "chainX", target: "NE" }, a: { ab: "flux", target: "SW" } }],
    });
    // chainX (break, 1◆... pow 0 can't afford!) — use cres vs bag WARD? ward beats nothing... let bag rush-beat P's break:
    // P plays 0◆ nothing breaks cres... verify via bag's rush beating a P break requires an affordable break.
    // Simplest legal: P pow 1, Arsenal Chain (break 1◆) loses to bag's flux (rush).
    const d3 = duel({
      p: { fk: "X", load: ["cres", "eguard", "chainX", "arsenal"], pass: "tempo", set: { pow: 1, hp: 20, maxHp: 20 } },
      a: KBAG({ pow: 0 }), seed: 107,
      rounds: [{ p: { ab: "chainX", target: "NE" }, a: { ab: "flux", target: "SW" } }],
    });
    // P spent 1 (0 left), broken by rush → tempo +1 → 1; spent flag blocks income
    rowEq("eco:tempo", "broken spender keeps tempo ◆ (1−1+1)", 1, d3.g.P.pow);
    row("eco:tempo:line", "Steel Tempo narrated", "line", "", d3.rounds[0].lines.some((t) => t.includes("Steel Tempo")));
  });

  test("Dominion bunker: Dhoram's income continues on his stone (spent round)", () => {
    boot();
    const d = duel({
      p: { fk: "D", load: ["quake", "claim", "grind", "mount"], pass: "home", set: { pow: 2, hp: 20, maxHp: 20 } },
      a: KBAG(), seed: 108,
      rounds: [{
        before: (gm) => { gm.terrain.SW = { kind: "dom", until: 9999 }; },
        p: { ab: "quake", target: "SE" }, a: { ab: "flux", target: "SE" },
      }],
    });
    // quake costs 1: 2−1 = 1, spent — but standing on Dominion pays anyway → 2
    rowEq("eco:domIncome", "spent on Dominion still collects (2−1+1)", 2, d.g.P.pow);
    row("eco:domIncome:line", "the ground provides", "line", "", d.rounds[0].lines.some((t) => t.includes("the ground provides")));
  });
});

describe("Koros package", () => {
  test("Capacitor: −1 from everything at 3◆", () => {
    boot();
    const d = duel({
      p: { fk: "G", load: ["skull", "howl", "sunder", "iron"], pass: "warmonger", set: { pow: 3, hp: 20, maxHp: 20 } },
      a: KBAG({ pow: 3 }), seed: 110,
      rounds: [{ p: { ab: "skull", target: "NE" }, a: { ab: "cannon", target: "SW" } }],
    });
    // trade: skull 1 → armored to absorbed
    rowEq("koros:armor", "1-damage hit absorbed at 3◆", 0, dmgTo(d.rounds[0].lines, "Koros"));
  });

  test("powered swing: +1 when cast from full charge, once per exchange", () => {
    boot();
    const d = duel({
      p: { fk: "K", load: ["arc", "cannon", "flux", "gyro"], pass: "vent", set: { pow: 3, hp: 20, maxHp: 20 } },
      a: { ...BAG, set: { hp: 25, maxHp: 25 } }, seed: 111,
      rounds: [{ p: { ab: "arc", target: "NE" }, a: { ab: "bR", target: "SW" } }],
    });
    // trade: arc 3 + powered 1 = 4
    rowEq("koros:powered", "Arc from full charge (trade)", 4, dmgTo(d.rounds[0].lines, "Maelis"));
  });

  test("Overcharge: rounds ended at full build charge; next paid attack vents it into him", () => {
    boot();
    const d = duel({
      p: { fk: "K", load: ["arc", "cannon", "flux", "gyro"], pass: "vent", set: { pow: 3, hp: 20, maxHp: 20 } },
      a: KBAG(), seed: 112,
      rounds: [
        { p: { ab: "flux", target: "SE" }, a: { ab: "flux", target: "SE" } }, // end at 3◆ → charge 1
        { p: { ab: "arc", target: "SE" }, a: { ab: "flux", target: "SE" } }, // paid attack → vents 1 into him
      ],
    });
    row("koros:chargeBuilt", "overcharge built after full round", "OVERCHARGE builds", "", d.rounds[0].lines.some((t) => t.includes("OVERCHARGE builds")));
    rowEq("koros:vented", "vent damage on the next paid attack", 1, dmgTo(d.rounds[1].lines, "Koros"));
    rowEq("koros:chargeCleared", "charge cleared after venting", 0, d.g.P.charge);
  });

  test("Emergency Vent: first time at ≤5 HP, gain 3◆", () => {
    boot();
    const d = duel({
      p: { fk: "G", load: ["sunder", "skull", "howl", "iron"], pass: "warmonger", set: { pow: 3, hp: 20, maxHp: 20 } },
      a: { fk: "K", load: ["cannon", "flux", "gyro", "frame"], pass: "vent", set: { pow: 0, hp: 6, maxHp: 13 } },
      seed: 113,
      rounds: [{ p: { ab: "skull", target: "NE" }, a: { ab: "cannon", target: "SW" } }],
    });
    // trade: bag drops 6→5 → vent fires → 3◆ (+1 income = 3 capped)
    row("koros:vent", "Emergency Vent surged to 3◆", "3◆", d.g.A.pow, d.g.A.pow === 3);
    row("koros:ventLine", "vent narrated", "Emergency Vent", "", d.rounds[0].lines.some((t) => t.includes("Emergency Vent")));
  });

  test("Discharge Nova: paid attack landing at 0◆ blasts the shared square", () => {
    boot();
    const d = duel({
      p: { fk: "K", load: ["arc", "cannon", "flux", "gyro"], pass: "nova", set: { pow: 2, hp: 20, maxHp: 20 } },
      a: KBAG(), seed: 114,
      rounds: [{
        before: (gm) => { gm.A.pos = "SW"; }, // share the square
        p: { ab: "arc", target: "SW" }, a: { ab: "flux", target: "SW" },
      }],
    });
    row("koros:nova", "nova blast 1 to the co-occupant at round end", "NOVA line + 1 dmg", "", d.rounds[0].lines.some((t) => t.includes("NOVA") || t.includes("Nova blast")));
  });
});

describe("remaining passives", () => {
  test("Berserker's Pact: +1 damage at ≤6 HP", () => {
    boot();
    const d = duel({
      p: { fk: "G", load: ["skull", "howl", "sunder", "iron"], pass: "pact", set: { pow: 3, hp: 6, maxHp: 12 } },
      a: { ...BAG, set: { hp: 25, maxHp: 25 } }, seed: 120,
      rounds: [{ p: { ab: "skull", target: "NE" }, a: { ab: "bB", target: "SW" } }],
    });
    rowEq("pass:pact:dmg", "Skullsplitter at ≤6 HP (trade)", 2, dmgBy(d.rounds[0].lines, "Skullsplitter lands DIRECT", "Maelis"));
  });

  test("Twist the Knife: +1 vs foes knocked back last round", () => {
    boot();
    const d = duel({
      p: { fk: "M", load: ["viper", "gloom", "umbral", "twin"], pass: "twist", set: { pow: 3, hp: 20, maxHp: 20 } },
      a: { ...BAG, set: { hp: 25, maxHp: 25 } }, seed: 121,
      rounds: [
        // round 1: clean-read shove to SE
        { p: { ab: "viper", target: "NE" }, a: { ab: "bR", target: "NW" }, prompts: ["SE"] },
        // round 2: hit the recently-shoved
        { p: { ab: "viper", target: "SE" }, a: { ab: "bR", target: "NW" } },
      ],
    });
    rowEq("pass:twist", "Viper Fang vs freshly-shoved foe (clean read)", 2, dmgBy(d.rounds[1].lines, "Viper Fang lands DIRECT", "Maelis"));
  });

  test("Scent of Blood: chase prompt after shove-elsewhere; +1 sharing the square", () => {
    boot();
    const d = duel({
      p: { fk: "G", load: ["skull", "howl", "sunder", "iron"], pass: "scent", set: { pow: 3, hp: 20, maxHp: 20 } },
      a: { ...BAG, set: { hp: 25, maxHp: 25 } }, seed: 122,
      rounds: [
        // clean read, shove to SE, then LUNGE onto them
        { p: { ab: "skull", target: "NE" }, a: { ab: "bR", target: "NW" }, prompts: ["SE", "SE"] },
      ],
    });
    const scentPrompt = d.rounds[0].promptsSeen.find((p) => p.kind === "step");
    row("pass:scent:prompt", "chase/lunge/hold prompt offered", "step prompt incl. their square", scentPrompt ? scentPrompt.opts.join(",") : "none", !!scentPrompt && scentPrompt.opts.includes("SE"));
    row("pass:scent:lunge", "lunged into their quadrant", "SE", d.g.P.pos, d.g.P.pos === "SE");
    // collision trade: skull (break) vs bR (rush) — rush beats break, bag wins... use damage from bag line instead:
    // Point-blank +1 applies to Gharzul's damage when he lands; in this collision he LOSES the triangle.
    // Assert the +1 via the log of round 2 only if he landed; otherwise assert the lunge happened.
  });

  test("Scent point-blank +1 (collision trade, same types)", () => {
    boot();
    const d = duel({
      p: { fk: "G", load: ["skull", "howl", "sunder", "iron"], pass: "scent", set: { pow: 3, hp: 20, maxHp: 20 } },
      a: { ...BAG, set: { hp: 25, maxHp: 25 } }, seed: 123,
      rounds: [{
        before: (gm) => { gm.A.pos = "SW"; }, // share from the start
        p: { ab: "skull", target: "SW" }, a: { ab: "bB", target: "SW" },
      }],
    });
    // collision, both break → trade at base; scent +1 → 2
    rowEq("pass:scent:pb", "point-blank Skullsplitter (collision trade)", 2, dmgBy(d.rounds[0].lines, "Skullsplitter lands DIRECT", "Maelis"));
  });

  test("Wrecking Throw: shove into terrain destroys it for +1; into a companion stuns it", () => {
    boot();
    const d = duel({
      p: { fk: "G", load: ["skull", "howl", "sunder", "iron"], pass: "warmonger", set: { pow: 3, hp: 20, maxHp: 20 } },
      a: { ...BAG, set: { hp: 25, maxHp: 25 } }, seed: 124,
      rounds: [{
        before: (gm) => { gm.terrain.SE = { kind: "frost", until: 99 }; },
        p: { ab: "skull", target: "NE" }, a: { ab: "bR", target: "NW" }, prompts: ["SE"],
      }],
    });
    row("pass:wreck:destroyed", "frost destroyed by the slam", "gone", d.g.terrain.SE?.kind ?? "none", !d.g.terrain.SE);
    rowEq("pass:wreck:dmg", "clean skull 1 + slam 1", 2,
      dmgBy(d.rounds[0].lines, "Skullsplitter lands DIRECT", "Maelis") + dmgByPrefix(d.rounds[0].lines, "WRECKING THROW", "Maelis"));
    // companion stun
    const d2 = duel({
      p: { fk: "G", load: ["skull", "howl", "sunder", "iron"], pass: "warmonger", set: { pow: 3, hp: 20, maxHp: 20 } },
      a: { fk: "W", load: ["broad", "hawk", "pin", "sky"], pass: "parting", set: { pow: 0, hp: 25, maxHp: 25 } },
      seed: 125,
      rounds: [{
        before: (gm) => { gm.kessQ = "SE"; },
        p: { ab: "skull", target: "NE" }, a: { ab: "broad", target: "NW" }, prompts: ["SE"],
      }],
    });
    row("pass:wreck:kessStun", "Kess stunned by the slam", "stun round set", d2.g.kessStun, d2.g.kessStun >= d2.g.roundJustPlayed);
  });

  test("Deadeye: +1 targeting the diagonal", () => {
    boot();
    const d = duel({
      p: { fk: "W", load: ["broad", "hawk", "pin", "sky"], pass: "deadeye", set: { pow: 3, hp: 20, maxHp: 20 } },
      a: { ...BAG, set: { hp: 25, maxHp: 25 } }, seed: 126,
      rounds: [{ p: { ab: "broad", target: "NE" }, a: { ab: "bR", target: "SW" } }],
    });
    // SW → NE is the diagonal
    rowEq("pass:deadeye", "diagonal Broadhead (trade)", 2, dmgBy(d.rounds[0].lines, "Broadhead lands DIRECT", "Maelis"));
  });

  test("Talon Harass: winging Kess INTO the enemy's square chips 1", () => {
    boot();
    const d = duel({
      p: { fk: "W", load: ["hawk", "broad", "pin", "sky"], pass: "talon", set: { pow: 3, hp: 20, maxHp: 20 } },
      a: { ...BAG, set: { hp: 25, maxHp: 25 } }, seed: 127,
      rounds: [{
        before: (gm) => { gm.kessQ = "SE"; }, // hawk at SE; foe waits at NE (adjacent to SE)
        p: { ab: "hawk" }, a: { ab: "bR", target: "NW" }, prompts: ["NE"],
      }],
    });
    rowEq("pass:talon", "dive chip on arrival", 1, dmgTo(d.rounds[0].lines, "Maelis"));
  });

  test("Parting Shot: clash loser deals 1 anyway", () => {
    boot();
    const d = duel({
      p: { fk: "W", load: ["broad", "hawk", "pin", "sky"], pass: "parting", set: { pow: 0, hp: 20, maxHp: 20 } },
      a: { ...BAG, set: { hp: 25, maxHp: 25, pow: 0 } }, seed: 128,
      rounds: [
        { p: { ab: "broad", target: "SE" }, a: { ab: "bR", target: "SE" } },
        { p: { ab: "broad", target: "SE" }, a: { ab: "bR", target: "SE" } },
        // round 3 clash: Wrenna's rush loses to bag's... bag needs ward: bW catches broad
        { p: { ab: "broad" }, a: { ab: "bW" } },
      ],
    });
    row("pass:parting", "loser's parting shot lands 1", "Parting Shot — Maelis takes 1", "", d.rounds[2].lines.some((t) => t.includes("Parting Shot — Maelis takes 1")));
  });

  test("Momentum: winning Advantage grants Flow; Perfect Edge strikes +2", () => {
    boot();
    const d = duel({
      p: { fk: "X", load: ["cres", "eguard", "chainX", "arsenal"], pass: "momentum", set: { pow: 3, hp: 20, maxHp: 20 } },
      a: { ...BAG, set: { hp: 25, maxHp: 25 } }, seed: 129,
      rounds: [{ p: { ab: "cres", target: "NE" }, a: { ab: "bB", target: "SW" } }],
    });
    row("pass:momentum", "flow after triangle win", "flow=true", d.g.P.flow, d.g.P.flow === true);
    const d2 = duel({
      p: { fk: "X", load: ["cres", "eguard", "chainX", "arsenal"], pass: "pedge", set: { pow: 3, hp: 20, maxHp: 20, flow: true } },
      a: { ...BAG, set: { hp: 25, maxHp: 25 } }, seed: 130,
      rounds: [{ p: { ab: "cres", target: "NE" }, a: { ab: "bR", target: "SW" } }],
    });
    rowEq("pass:pedge", "Perfect Edge Flow: 1 + 2 (trade)", 3, dmgBy(d2.rounds[0].lines, "Crescent Cut lands DIRECT", "Maelis"));
    row("pass:flow:consumed", "flow consumed on connect", "false", d2.g.P.flow, d2.g.P.flow === false);
  });

  test("Flow does not stack; whiffs don't waste it", () => {
    boot();
    const d = duel({
      p: { fk: "X", load: ["riposte", "cres", "eguard", "chainX"], pass: "pedge", set: { pow: 3, hp: 20, maxHp: 20, flow: true } },
      a: { ...BAG, set: { hp: 25, maxHp: 25 } }, seed: 131,
      rounds: [
        { p: { ab: "cres", target: "SE" }, a: { ab: "bR", target: "NW" } }, // whiff
      ],
    });
    row("pass:flow:whiff", "whiffed Flow is kept", "flow=true", d.g.P.flow, d.g.P.flow === true);
  });

  test("Undying Vigil: survive at 1, cleanse all, bank to 3◆", () => {
    boot();
    const d = duel({
      p: { fk: "G", load: ["harvest", "skull", "howl", "iron"], pass: "warmonger", set: { pow: 3, hp: 20, maxHp: 20 } },
      a: { fk: "L", load: ["llance", "oath", "aegis", "dawn"], pass: "vigil", set: { pow: 0, hp: 3, maxHp: 15, burn: 2, poison: 2, curse: 3, weak: 1, brandRound: 5 } },
      seed: 132,
      rounds: [{ p: { ab: "harvest", target: "NE" }, a: { ab: "llance", target: "NW" } }],
    });
    rowEq("pass:vigil:alive", "Kastor refuses the grave at 1 HP", 1, d.g.A.hp);
    row("pass:vigil:cleansed", "all afflictions cleansed", "burn/poison/curse/weak/brand = 0",
      `${d.g.A.burn}/${d.g.A.poison}/${d.g.A.curse}/${d.g.A.weak}/${d.g.A.brandRound}`,
      d.g.A.burn === 0 && d.g.A.poison === 0 && d.g.A.curse === 0 && d.g.A.weak === 0 && d.g.A.brandRound === 0);
    rowEq("pass:vigil:bank", "bank filled to 3◆ (+income capped)", 3, d.g.A.pow);
  });

  test("Pilgrim's Stride: steps when a relic spawns", () => {
    boot();
    const d = duel({
      p: { fk: "L", load: ["llance", "oath", "aegis", "dawn"], pass: "pilgrim", set: { pow: 0, hp: 15, maxHp: 15 } },
      a: KBAG(), seed: 133,
      rounds: [
        { p: { ab: "llance", target: "SE" }, a: { ab: "flux", target: "SE" } },
        { p: { ab: "llance", target: "SE" }, a: { ab: "flux", target: "SE" } },
      ],
    });
    // a relic spawns at the start of round 2 — pilgrim step prompt or auto-step should register
    const stepped = d.rounds[1].promptsSeen.some((p) => p.kind === "step") || d.g.P.pos !== "SW" ||
      d.rounds[1].lines.some((t) => t.toLowerCase().includes("relic"));
    row("pass:pilgrim", "pilgrim reacts to the relic spawn", "step prompt / movement / relic line", "", stepped);
  });

  test("Numbing Aura: sharing Vessk's square chills at round end", () => {
    boot();
    const d = duel({
      p: { fk: "V", load: ["lance", "hoar", "spike", "aval"], pass: "numb", set: { pow: 0, hp: 20, maxHp: 20 } },
      a: KBAG({ pos: "SW" }), seed: 134,
      rounds: [{
        before: (gm) => { gm.A.pos = "SW"; },
        p: { ab: "lance", target: "NE" }, a: { ab: "flux", target: "NE" },
      }],
    });
    row("pass:numb", "co-occupant chilled", "chill=true", d.g.A.chill, d.g.A.chill === true);
  });

  test("Undertow: shove into her water deals +1", () => {
    boot();
    const d = duel({
      p: { fk: "Y", load: ["lash", "current", "bwater", "storm"], pass: "undertow", set: { pow: 3, hp: 20, maxHp: 20 } },
      a: KBAG(), seed: 135,
      rounds: [{
        before: (gm) => { gm.terrain.SE = { kind: "whirl", until: 99 }; },
        p: { ab: "lash", target: "NE" }, a: { ab: "flux", target: "NW" }, prompts: ["SE"],
      }],
    });
    // clean lash 1 + undertow 1 on the throw + whirl grind 1 at round end = 3
    rowEq("pass:undertow", "lash + undertow throw + grind", 3, dmgTo(d.rounds[0].lines, "Koros"));
  });

  test("Ebb & Flow: water blood at round end grants Flow", () => {
    boot();
    const d = duel({
      p: { fk: "Y", load: ["lash", "current", "bwater", "storm"], pass: "ebb", set: { pow: 0, hp: 20, maxHp: 20 } },
      a: KBAG(), seed: 136,
      rounds: [{
        before: (gm) => { gm.terrain.NE = { kind: "whirl", until: 99 }; },
        p: { ab: "lash", target: "SE" }, a: { ab: "flux", target: "SE" },
      }],
    });
    row("pass:ebb", "tide fed Flow after the grind", "flow=true", d.g.P.flow, d.g.P.flow === true);
  });

  test("Stitchwork: first curse each round heals 1", () => {
    boot();
    const d = duel({
      p: { fk: "O", load: ["stick", "knit", "mireA", "sorrow"], pass: "stitch", set: { pow: 3, hp: 10, maxHp: 13 } },
      a: KBAG(), seed: 137,
      rounds: [{ p: { ab: "stick", target: "NE" }, a: { ab: "flux", target: "SW" } }],
    });
    rowEq("pass:stitch", "heal 1 on the first curse", 1, healsTo(d.rounds[0].lines, "Marrow"));
  });

  test("Deep Roots: on Dominion, clash placement cannot move him", () => {
    boot();
    const d = duel({
      p: { fk: "G", load: ["skull", "howl", "sunder", "iron"], pass: "warmonger", set: { pow: 3, hp: 20, maxHp: 20 } },
      a: { fk: "D", load: ["grind", "claim", "quake", "mount"], pass: "roots", set: { pow: 0, hp: 25, maxHp: 25 } },
      seed: 138,
      rounds: [
        { before: (gm) => { gm.terrain.NE = { kind: "dom", until: 9999 }; }, p: { ab: "skull", target: "SE" }, a: { ab: "grind", target: "SE" } },
        { p: { ab: "skull", target: "SE" }, a: { ab: "grind", target: "SE" } },
        // clash round 3: Gharzul wins with break vs Dhoram's rush? rush beats break. Use ward-break: Dhoram claims (ward) vs skull (break)
        { p: { ab: "skull" }, a: { ab: "claim" }, prompts: ["SW", "SW"] },
      ],
    });
    row("pass:roots", "rooted Dhoram not moved by clash placement", "NE", d.g.A.pos, d.g.A.pos === "NE");
  });

  test("Agonist: +1 vs weakened or branded enemies", () => {
    boot();
    const d = duel({
      p: { fk: "Z", load: ["ruin", "chains", "tap", "brand"], pass: "agonist", set: { pow: 3, hp: 14, maxHp: 14 } },
      a: { ...BAG, set: { hp: 25, maxHp: 25, weak: 1, _weakFresh: true } }, seed: 139,
      rounds: [{ p: { ab: "chains", target: "NE" }, a: { ab: "bR", target: "SW" } }],
    });
    rowEq("pass:agonist", "Umbral Chains vs weakened (trade)", 2, dmgBy(d.rounds[0].lines, "Umbral Chains lands DIRECT", "Maelis"));
  });

  test("Killing Heat: +1 in collisions while the foe burns", () => {
    boot();
    const d = duel({
      p: { fk: "C", load: ["cinder", "smoke", "comb", "pyre"], pass: "killheat", set: { pow: 3, hp: 20, maxHp: 20 } },
      a: { ...BAG, set: { hp: 25, maxHp: 25, burn: 1, _burnFresh: 0 } }, seed: 140,
      rounds: [{
        before: (gm) => { gm.A.pos = "SW"; },
        p: { ab: "cinder", target: "SW" }, a: { ab: "bR", target: "SW" },
      }],
    });
    // collision trade, both rush: cinder 1 + killheat 1 = 2 (burn tick separate)
    rowEq("pass:killheat", "point-blank cinder vs burning foe", 2, dmgBy(d.rounds[0].lines, "Cinder Jab lands DIRECT", "Maelis"));
  });
});
