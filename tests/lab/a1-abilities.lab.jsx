/* PHASE A part 1 — every attack ability: printed base damage (verified in a
   same-type trade), advantage rider (+1 or signature), special clauses.
   Damage is read from the exact labelled log line, so same-round DoT ticks
   and terrain effects can't contaminate the measurement. */
import { test, describe, beforeAll, afterAll, vi } from "vitest";
import { boot } from "./runner.jsx";
import { duel, row, rowEq, dmgBy, dmgTo, healBy, saveMatrix, BAG } from "./scenario.jsx";

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  boot();
});
afterAll(() => saveMatrix("abilities"));

const OWNER = {
  G: { pass: "warmonger" }, M: { pass: "craven" }, V: { pass: "permafrost" },
  C: { pass: "everburn" }, K: { pass: "vent" }, Z: { pass: "surplus" },
  L: { pass: "vigil" }, O: { pass: "mdeep" }, D: { pass: "reserves" },
  Y: { pass: "rider" }, W: { pass: "parting" }, X: { pass: "pedge" },
};

function kit(fk, ab) {
  return { fk, load: [ab, "bB", "bR", "bW"], pass: OWNER[fk].pass, set: { pow: 3, hp: 20, maxHp: 20 } };
}

/* Maelis abilities need a non-Maelis victim (name collision + water immunity) */
const foeFor = (meta) => meta.f === "Y"
  ? { kit: { fk: "K", load: ["cannon", "flux", "gyro", "frame"], pass: "overclock", set: { pow: 0, hp: 25, maxHp: 25 } }, name: "Koros", basicR: "flux", basicB: "cannon" }
  : { kit: { ...BAG, set: { hp: 25, maxHp: 25, pow: 3 } }, name: "Maelis", basicR: "bR", basicB: "bB" };

function baseTrade(ab, meta, opts = {}) {
  const foe = foeFor(meta);
  const basic = meta.type === "break" ? "bB" : "bR";
  const d = duel({
    p: kit(meta.f, ab), a: foe.kit, seed: opts.seed || 42,
    rounds: [{ before: opts.before, p: { ab, target: "NE", ...(opts.plan || {}) }, a: { ab: basic, target: "SW" }, prompts: opts.prompts }],
  });
  d.foeName = foe.name;
  return d;
}

function advWin(ab, meta, opts = {}) {
  const foe = foeFor(meta);
  const foePlan = meta.type === "rush" ? { ab: "bB", target: "SW" } : { ab: "bW" };
  const d = duel({
    p: kit(meta.f, ab), a: { ...foe.kit, set: { ...foe.kit.set, pow: opts.bagPow ?? foe.kit.set.pow } }, seed: opts.seed || 43,
    rounds: [{ before: opts.before, p: { ab, target: "NE", ...(opts.plan || {}) }, a: foePlan, prompts: opts.prompts }],
  });
  d.foeName = foe.name;
  return d;
}

describe("attack abilities — printed base damage in a trade", () => {
  const CASES = [
    ["skull", 1], ["howl", 1], ["sunder", 2], ["frenzy", 2], ["harvest", 4],
    ["viper", 1], ["umbral", 1], ["twin", 1], ["heart", 1],
    ["lance", 1], ["spike", 2], ["freeze", 1],
    ["cinder", 1], ["magma", 1], ["flash", 1], ["comb", 2], ["pyre", 2],
    ["cannon", 1], ["flux", 1], ["core", 5, "Finality Beam printed 5"],
    ["ruin", 2], ["chains", 1], ["brand", 1], ["dark", 2], ["pact", 4],
    ["censure", 1], ["llance", 1], ["dawn", 3],
    ["stick", 1], ["eye", 1], ["mireA", 1], ["sorrow", 2],
    ["quake", 2], ["grind", 1], ["fissure", 1], ["mount", 3],
    ["lash", 1], ["bwater", 1], ["undine", 1], ["storm", 2],
    ["broad", 1], ["pin", 1], ["toll", 1], ["sky", 2],
    ["cres", 1], ["chainX", 2], ["cadence", 2], ["arsenal", 3],
  ];
  test("base damage table", () => {
    boot();
    const { ABILITIES } = window.__CL_TEST__.defs;
    for (const [ab, expected, note] of CASES) {
      const meta = ABILITIES[ab];
      const d = baseTrade(ab, meta);
      const got = dmgBy(d.rounds[0].lines, `${meta.name} lands DIRECT`, d.foeName);
      rowEq(`base:${ab}`, `${meta.name} base damage (trade)`, expected, got, note || "");
    }
  });
});

describe("attack abilities — advantage adds exactly +1 (plain riders)", () => {
  const PLAIN = [
    ["skull", 1], ["howl", 1], ["sunder", 2], ["frenzy", 2],
    ["viper", 1], ["umbral", 1], ["twin", 1], ["heart", 1],
    ["lance", 1], ["spike", 2], ["freeze", 1, "root moved to base in v0.85; rider is the plain +1"],
    ["cinder", 1], ["magma", 1], ["flash", 1], ["comb", 2],
    ["cannon", 1], ["flux", 1], ["core", 5, "Finality Beam printed 5"],
    ["ruin", 2, "engine rider is +1; doc roster's '+2' predates the v0.9.1 flatten"],
    ["chains", 1], ["dark", 2], ["pact", 4],
    ["llance", 1], ["dawn", 3],
    ["stick", 1], ["eye", 1], ["mireA", 1], ["sorrow", 2],
    ["quake", 2], ["grind", 1], ["fissure", 1],
    ["lash", 1], ["bwater", 1], ["undine", 1], ["storm", 2],
    ["broad", 1], ["pin", 1], ["toll", 1], ["sky", 2],
    ["cres", 1], ["cadence", 2], ["arsenal", 3],
  ];
  test("plain advantage table", () => {
    boot();
    const { ABILITIES } = window.__CL_TEST__.defs;
    for (const [ab, baseD, note] of PLAIN) {
      const meta = ABILITIES[ab];
      const d = advWin(ab, meta);
      const got = dmgBy(d.rounds[0].lines, `${meta.name} lands DIRECT`, d.foeName) + dmgBy(d.rounds[0].lines, "Advantage — the extra point", d.foeName);
      rowEq(`adv:${ab}`, `${meta.name} advantage total`, baseD + 1, got, note || "");
    }
  });
});

describe("signature advantage riders — +1 AND the effect", () => {
  const sigTotal = (d, name, sigLabel) =>
    dmgBy(d.rounds[0].lines, `${name} lands DIRECT`, d.foeName) + dmgBy(d.rounds[0].lines, sigLabel, d.foeName);

  test("Red Harvest: +1 and knockback anywhere", () => {
    boot();
    const d = advWin("harvest", { f: "G", type: "break", name: "Red Harvest" });
    rowEq("adv:harvest:dmg", "Red Harvest adv total", 5, sigTotal(d, "Red Harvest", "Red Harvest overswing"));
    const kb = d.rounds[0].promptsSeen.find((p) => p.kind === "kb");
    row("adv:harvest:kbAny", "Red Harvest adv shove offers all 4 quadrants", "4 options", kb ? kb.opts.length : "no prompt", kb && kb.opts.length === 4);
  });

  test("Flash Freeze (v0.85): base roots AND paints even in a trade; adv is the plain +1", () => {
    boot();
    const d = duel({
      p: kit("V", "freeze"),
      a: { ...BAG, set: { hp: 25, maxHp: 25 } },
      seed: 7,
      rounds: [
        { p: { ab: "freeze", target: "NE" }, a: { ab: "bR", target: "SW" } }, // rush-rush TRADE — no advantage
        { p: { ab: "bR", target: "SE" }, a: { ab: "bR", target: "SW", moveTo: "SE" } },
      ],
    });
    rowEq("base:freeze:dmg", "Flash Freeze trade damage (base only)", 1,
      dmgBy(d.rounds[0].lines, "Flash Freeze lands DIRECT", "Maelis"));
    row("base:freeze:root", "base ROOT: bag cannot move next round despite trading", "stays NE", d.g.A.pos, d.g.A.pos === "NE");
    row("base:freeze:frost", "Flash Freeze frosts the target quadrant on base", "frost at NE", d.g.terrain.NE?.kind,
      d.g.terrain.NE?.kind === "frost" || d.rounds[0].lines.join().includes("Frost claims NE"));
  });

  test("Doombrand: +1 and the fuse shortens to next round", () => {
    boot();
    const d = advWin("brand", { f: "Z", type: "rush", name: "Doombrand" });
    rowEq("adv:brand:dmg", "Doombrand adv total", 2, sigTotal(d, "Doombrand", "Doombrand sears"));
    rowEq("adv:brand:fuse", "adv fuse = end of next round (round 2)", 2, d.g.A.brandRound);
  });

  test("Doombrand base: fuse = end of round-after-next", () => {
    boot();
    const d = baseTrade("brand", { f: "Z", type: "rush", name: "Doombrand" });
    rowEq("base:brand:fuse", "base fuse = round 3", 3, d.g.A.brandRound);
  });

  test("Censure: +1 and enemy gains no ◆ this round (adv only)", () => {
    boot();
    const d = advWin("censure", { f: "L", type: "break", name: "Censure" });
    rowEq("adv:censure:dmg", "Censure adv total", 2, sigTotal(d, "Censure", "Censure"));
    row("adv:censure:deny", "bag income denied", "gains no ◆ line", "", d.rounds[0].lines.some((t) => t.includes("gains no ◆")));
    const b = baseTrade("censure", { f: "L", type: "break", name: "Censure" });
    row("base:censure:noDeny", "trade does not deny ◆", "no denial line", "", !b.rounds[0].lines.some((t) => t.includes("gains no ◆")));
  });

  test("Mountainfall: +1 and their quadrant converts after the hit", () => {
    boot();
    const d = advWin("mount", { f: "D", type: "break", name: "Mountainfall" });
    rowEq("adv:mount:dmg", "Mountainfall adv total", 4, sigTotal(d, "Mountainfall", "Mountainfall aftershock"));
    row("adv:mount:convert", "target quadrant becomes Dominion", "dom at NE", d.g.terrain.NE?.kind, d.g.terrain.NE?.kind === "dom");
    const b = baseTrade("mount", { f: "D", type: "break", name: "Mountainfall" }, {
      before: (gm) => { gm.terrain.NE = { kind: "dom", until: 9999 }; },
    });
    rowEq("base:mount:dom", "Mountainfall vs foe on Dominion (trade)", 4, dmgBy(b.rounds[0].lines, "Mountainfall lands DIRECT", "Maelis"));
  });

  test("Arsenal Chain: +1 and Flow", () => {
    boot();
    const d = advWin("chainX", { f: "X", type: "break", name: "Arsenal Chain" });
    rowEq("adv:chainX:dmg", "Arsenal Chain adv total", 3, sigTotal(d, "Arsenal Chain", "Chain follow-through"));
    row("adv:chainX:flow", "caster holds Flow after", "flow=true", d.g.P.flow, d.g.P.flow === true);
  });

  test("Pyre: +1 and everything hit gains Burn; scorches and purges terrain", () => {
    boot();
    const d = advWin("pyre", { f: "C", type: "break", name: "Pyre of the Pit" }, {
      before: (gm) => { gm.terrain.NW = { kind: "frost", until: 99 }; },
    });
    rowEq("adv:pyre:dmg", "Pyre adv primary total", 3, sigTotal(d, "Pyre of the Pit", "Pyre flare"));
    row("adv:pyre:burn", "bag gains Burn from adv", "burn ≥ 1", d.g.A.burn, d.g.A.burn >= 1);
    row("base:pyre:scorch", "target + adjacents scorched (frost purged)", "scorch NE/NW/SE", `${d.g.terrain.NE?.kind}/${d.g.terrain.NW?.kind}/${d.g.terrain.SE?.kind}`,
      d.g.terrain.NE?.kind === "scorch" && d.g.terrain.NW?.kind === "scorch" && d.g.terrain.SE?.kind === "scorch");
  });
});

describe("special base clauses", () => {
  test("Blood Frenzy: 3 damage at ≤6 HP", () => {
    boot();
    const d = duel({
      p: { ...kit("G", "frenzy"), set: { pow: 3, hp: 6, maxHp: 12 } },
      a: { ...BAG, set: { hp: 25, maxHp: 25 } },
      seed: 9,
      rounds: [{ p: { ab: "frenzy", target: "NE" }, a: { ab: "bR", target: "SW" } }],
    });
    rowEq("base:frenzy:low", "Blood Frenzy at ≤6 HP (trade)", 3, dmgBy(d.rounds[0].lines, "Blood Frenzy lands DIRECT", "Maelis"));
  });

  test("Heartseeker: +2 per Poison consumed and cannot whiff a poisoned target", () => {
    boot();
    const d = duel({
      p: kit("M", "heart"),
      a: { ...BAG, set: { hp: 25, maxHp: 25, poison: 2 } },
      seed: 11,
      rounds: [{ p: { ab: "heart", target: "SE" }, a: { ab: "bB", target: "SE" } }],
    });
    row("base:heart:homing", "mis-aimed Heartseeker retargets a poisoned foe", "venom sings + hit", "", d.rounds[0].lines.some((t) => t.includes("venom sings")));
    rowEq("base:heart:detonate", "1 + 2×2 poison", 5, dmgBy(d.rounds[0].lines, "Heartseeker lands DIRECT", "Maelis"));
    rowEq("base:heart:consumed", "poison consumed", 0, d.g.A.poison);
  });

  test("Combustion: +2 per Burn stack, consumed, no tick after", () => {
    boot();
    const d = duel({
      p: kit("C", "comb"),
      a: { ...BAG, set: { hp: 25, maxHp: 25, burn: 2, _burnFresh: 0 } },
      seed: 12,
      rounds: [{ p: { ab: "comb", target: "NE" }, a: { ab: "bB", target: "SW" } }],
    });
    rowEq("base:comb:detonate", "2 + 2×2 burn (trade)", 6, dmgBy(d.rounds[0].lines, "Combustion lands DIRECT", "Maelis"));
    rowEq("base:comb:consumed", "burn consumed", 0, d.g.A.burn);
    row("base:comb:noTick", "no burn tick after detonation", "no Burning line", "", !d.rounds[0].lines.some((t) => t.includes("Burning —")));
  });

  test("Harvest of Sorrows: +1 per 3 Curse, not consumed", () => {
    boot();
    const mk = (curse, seed) => duel({
      p: kit("O", "sorrow"),
      a: { ...BAG, set: { hp: 25, maxHp: 25, curse } },
      seed,
      rounds: [{ p: { ab: "sorrow", target: "NE" }, a: { ab: "bR", target: "SW" } }],
    });
    const d3 = mk(3, 131), d6 = mk(6, 132);
    rowEq("base:sorrow:3curse", "2 + 1 at 3 curse (trade)", 3, dmgBy(d3.rounds[0].lines, "Harvest of Sorrows lands DIRECT", "Maelis"));
    rowEq("base:sorrow:6curse", "2 + 2 at 6 curse (trade)", 4, dmgBy(d6.rounds[0].lines, "Harvest of Sorrows lands DIRECT", "Maelis"));
    rowEq("base:sorrow:kept", "curse not consumed", 6, d6.g.A.curse);
  });

  test("Lightlance: +1 vs a foe on Sanctuary", () => {
    boot();
    const d = baseTrade("llance", { f: "L", type: "rush", name: "Lightlance" }, {
      before: (gm) => { gm.terrain.NE = { kind: "hall", until: 99 }; },
    });
    rowEq("base:llance:hall", "Lightlance vs Sanctuary-stander (trade)", 2, dmgBy(d.rounds[0].lines, "Lightlance lands DIRECT", "Maelis"));
  });

  test("Dawnhammer: heal 2 when swung from Sanctuary", () => {
    boot();
    const d = baseTrade("dawn", { f: "L", type: "break", name: "Dawnhammer" }, {
      before: (gm) => { gm.terrain.SW = { kind: "hall", until: 99 }; gm.P.hp = 10; },
    });
    rowEq("base:dawn:heal", "heal 2 from sanctity", 2, healBy(d.rounds[0].lines, "Dawnhammer", "Kastor"));
  });

  test("Devouring Dark: heals 2 on base", () => {
    boot();
    const d = baseTrade("dark", { f: "Z", type: "break", name: "Devouring Dark" }, {
      before: (gm) => { gm.P.hp = 10; },
    });
    rowEq("base:dark:heal", "Devouring Dark heals 2", 2, healBy(d.rounds[0].lines, "Devouring Dark", "Zhal"));
  });

  test("Bone Grinder: 1 splash to chosen adjacent quadrant", () => {
    boot();
    const d = duel({
      p: kit("G", "sunder"),
      a: { ...BAG, set: { hp: 25, maxHp: 25 } },
      seed: 14,
      rounds: [{ p: { ab: "sunder", target: "SE", splash: "NE" }, a: { ab: "bB", target: "SW" } }],
    });
    rowEq("base:sunder:splash", "splash hits for 1 (secondary)", 1, dmgBy(d.rounds[0].lines, "Bone Grinder secondary hit", "Maelis"));
  });

  test("Three Fangs: two quadrants + third-dagger poisoned ground", () => {
    boot();
    const d = duel({
      p: kit("M", "twin"),
      a: { ...BAG, set: { hp: 25, maxHp: 25 } },
      seed: 15,
      rounds: [{ p: { ab: "twin", target: "NE", secondary: "SE" }, a: { ab: "bR", target: "SW" }, prompts: ["NW"] }],
    });
    rowEq("base:twin:dmg", "primary 1 (trade)", 1, dmgBy(d.rounds[0].lines, "Three Fangs lands DIRECT", "Maelis"));
    rowEq("base:twin:poison", "poison on contact", 1, d.g.A.poison);
    row("base:twin:ground", "third dagger poisons a quadrant", "env at NW", d.g.terrain.NW?.kind, d.g.terrain.NW?.kind === "env");
  });

  test("Quake Fist shatters non-Dominion terrain; leaves Dominion", () => {
    boot();
    const d = baseTrade("quake", { f: "D", type: "break", name: "Quake Fist" }, {
      before: (gm) => { gm.terrain.NE = { kind: "frost", until: 99 }; },
    });
    row("base:quake:shatter", "frost destroyed at target", "no terrain", d.g.terrain.NE?.kind ?? "none", !d.g.terrain.NE);
    const d2 = advWin("quake", { f: "D", type: "break", name: "Quake Fist" }, {
      before: (gm) => { gm.terrain.NE = { kind: "dom", until: 9999 }; }, seed: 16,
    });
    row("base:quake:domSafe", "Dominion survives Quake (warding bag can't demolish)", "dom", d2.g.terrain.NE?.kind, d2.g.terrain.NE?.kind === "dom");
  });

  test("Watcher's Toll: foe's move is committed and revealed next round", () => {
    boot();
    const d = duel({
      p: kit("W", "toll"),
      a: { ...BAG, set: { hp: 25, maxHp: 25 } },
      seed: 17,
      rounds: [
        { p: { ab: "toll", target: "NE" }, a: { ab: "bR", target: "SW" } },
        { p: { ab: "bR", target: "NE" }, a: { ab: "bR", target: "SW" } },
      ],
    });
    row("base:toll:reveal", "committed-move line shown while planning round 2", "the foe has committed to", "",
      d.rounds[1].planningLines.some((t) => t.includes("the foe has committed to")));
  });

  test("Skyfall Volley: 2 now, Kess wings — and the storm should strike the NEXT two rounds", () => {
    boot();
    const d = duel({
      p: { fk: "W", load: ["sky", "broad", "hawk", "pin"], pass: "parting", set: { pow: 3, hp: 20, maxHp: 20 } },
      a: { ...BAG, set: { hp: 25, maxHp: 25 } },
      seed: 18,
      rounds: [{ p: { ab: "sky", target: "NE" }, a: { ab: "bB", target: "SW" } }], // v0.86: sky is a RUSH — it interrupts the break
    });
    rowEq("base:sky:dmg", "Skyfall direct (rush interrupts break) 2+1", 3,
      dmgBy(d.rounds[0].lines, "Skyfall Volley lands DIRECT", "Maelis") + dmgBy(d.rounds[0].lines, "Advantage — the extra point", "Maelis"));
    const kessPrompt = d.rounds[0].promptsSeen.find((p) => p.kind === "kess");
    row("base:sky:kess", "Kess wing prompt fired", "kess prompt", kessPrompt ? "fired" : "none", !!kessPrompt);
    // v0.73 ruling: "then the NEXT TWO rounds strike a random quadrant" — so
    // after the cast round ends, both strikes must still be loaded.
    rowEq("base:sky:timing", "strikes remaining after the cast round (per v0.73: 2)", 2, d.g.P._skyBarrage,
      "card text: 'for the NEXT TWO rounds' — a strike in the cast round violates v0.73");
  });

  test("Continental Grind: converts enemy terrain, or claims empty ground", () => {
    boot();
    const d = duel({
      p: kit("D", "grind"),
      a: { ...BAG, set: { hp: 25, maxHp: 25 } },
      seed: 19,
      rounds: [{
        before: (gm) => { gm.terrain.SE = { kind: "frost", until: 99 }; },
        p: { ab: "grind", target: "NE" }, a: { ab: "bR", target: "SW" }, prompts: ["SE"],
      }],
    });
    row("base:grind:convert", "enemy frost paved to Dominion", "dom at SE", d.g.terrain.SE?.kind, d.g.terrain.SE?.kind === "dom");
  });

  test("Crescent Cut pivot: 1◆ switches Rush → Break after the reveal", () => {
    boot();
    const d = duel({
      p: kit("X", "cres"),
      a: { ...BAG, set: { hp: 25, maxHp: 25 } },
      seed: 20,
      rounds: [{ p: { ab: "cres", target: "NE", form: "break", pivoted: true }, a: { ab: "bW" } }],
    });
    rowEq("base:cres:pivotDmg", "pivoted Crescent breaks the guard 1+1", 2,
      dmgBy(d.rounds[0].lines, "Crescent Cut lands DIRECT", "Maelis") + dmgBy(d.rounds[0].lines, "Advantage — the extra point", "Maelis"));
    row("base:cres:pivotCost", "pivot paid 1◆ (3 − 1 = 2, spent so no income)", 2, d.g.P.pow, d.g.P.pow === 2);
  });
});
