/* PHASE A part 3 — statuses (lifecycles, caps, graces) and terrain
   (effects on occupants, durations, exclusivity). */
import { test, describe, beforeAll, afterAll, vi } from "vitest";
import { boot } from "./runner.jsx";
import { duel, row, rowEq, dmgTo, healsTo, saveMatrix, BAG } from "./scenario.jsx";

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  boot();
});
afterAll(() => saveMatrix("status-terrain"));

/* neutral pair for terrain tests: Gharzul vs a 0◆ Koros bag */
const NEUTRAL = () => ({
  p: { fk: "G", load: ["skull", "howl", "sunder", "iron"], pass: "warmonger", set: { pow: 0, hp: 20, maxHp: 20 } },
  a: { fk: "K", load: ["cannon", "flux", "gyro", "frame"], pass: "overclock", set: { pow: 0, hp: 25, maxHp: 25 } },
});
/* both sides whiff into an empty corner — a "nothing happens" round */
const IDLE = { p: { ab: "skull", target: "SE" }, a: { ab: "flux", target: "SE" } };

describe("poison", () => {
  test("3rd stack ruptures for 3 and clears", () => {
    boot();
    const d = duel({
      p: { fk: "M", load: ["viper", "gloom", "umbral", "twin"], pass: "craven", set: { pow: 3, hp: 20, maxHp: 20 } },
      a: { ...BAG, set: { hp: 25, maxHp: 25, poison: 2 } },
      seed: 70,
      rounds: [{ p: { ab: "viper", target: "NE" }, a: { ab: "bR", target: "SW" } }],
    });
    rowEq("st:poison:rupture", "trade 1 + rupture 3", 4, dmgTo(d.rounds[0].lines, "Maelis"));
    rowEq("st:poison:cleared", "stacks clear after rupture", 0, d.g.A.poison);
  });

  test("Blood Tithe: rupture heals 2 and max HP +2", () => {
    boot();
    const d = duel({
      p: { fk: "M", load: ["viper", "gloom", "umbral", "twin"], pass: "tithe", set: { pow: 3, hp: 6, maxHp: 10 } },
      a: { ...BAG, set: { hp: 25, maxHp: 25, poison: 2 } },
      seed: 71,
      rounds: [{ p: { ab: "viper", target: "NE" }, a: { ab: "bR", target: "SW" } }],
    });
    rowEq("st:tithe:maxHp", "max HP 10 → 12", 12, d.g.P.maxHp);
    rowEq("st:tithe:heal", "healed 2 on rupture", 2, healsTo(d.rounds[0].lines, "Maleth"));
  });
});

describe("chill", () => {
  test("shatter: next Break +1, chill consumed", () => {
    boot();
    const d = duel({
      p: { fk: "V", load: ["spike", "lance", "hoar", "aval"], pass: "permafrost", set: { pow: 3, hp: 20, maxHp: 20 } },
      a: { ...BAG, set: { hp: 25, maxHp: 25, chill: true, chillUntil: 99 } },
      seed: 72,
      rounds: [{ p: { ab: "spike", target: "NE" }, a: { ab: "bB", target: "SW" } }],
    });
    rowEq("st:chill:shatter", "spike 2 + shatter 1 (trade)", 3, dmgTo(d.rounds[0].lines, "Maelis"));
    row("st:chill:consumed", "chill consumed by the shatter", "false", d.g.A.chill, d.g.A.chill === false);
  });

  test("Shatterpoint: +2 instead of +1", () => {
    boot();
    const d = duel({
      p: { fk: "V", load: ["spike", "lance", "hoar", "aval"], pass: "shatter", set: { pow: 3, hp: 20, maxHp: 20 } },
      a: { ...BAG, set: { hp: 25, maxHp: 25, chill: true, chillUntil: 99 } },
      seed: 73,
      rounds: [{ p: { ab: "spike", target: "NE" }, a: { ab: "bB", target: "SW" } }],
    });
    rowEq("st:chill:shatterpoint", "spike 2 + shatterpoint 2", 4, dmgTo(d.rounds[0].lines, "Maelis"));
  });

  test("rush does not shatter", () => {
    boot();
    const d = duel({
      p: { fk: "V", load: ["lance", "spike", "hoar", "aval"], pass: "permafrost", set: { pow: 3, hp: 20, maxHp: 20 } },
      a: { ...BAG, set: { hp: 25, maxHp: 25, chill: true, chillUntil: 99 } },
      seed: 74,
      rounds: [{ p: { ab: "lance", target: "NE" }, a: { ab: "bR", target: "SW" } }],
    });
    rowEq("st:chill:rushSafe", "Ice Lance trade does not shatter", 1, dmgTo(d.rounds[0].lines, "Maelis"));
    row("st:chill:reapplied", "lance re-chills on contact", "true", d.g.A.chill, d.g.A.chill === true);
  });

  test("chill expires at the end of the following round", () => {
    boot();
    const n = NEUTRAL();
    const d = duel({
      ...n, seed: 75,
      rounds: [
        { before: (gm) => { gm.A.chill = true; gm.A.chillUntil = gm.round + 1; }, ...IDLE },
        { ...IDLE },
      ],
    });
    row("st:chill:expiry", "chill gone after its window", "false", d.g.A.chill, d.g.A.chill === false);
  });
});

describe("burn", () => {
  test("cap 2 without Everburn; 3 with", () => {
    boot();
    const mk = (pass) => duel({
      p: { fk: "C", load: ["cinder", "smoke", "comb", "pyre"], pass, set: { pow: 3, hp: 20, maxHp: 20 } },
      a: { ...BAG, set: { hp: 25, maxHp: 25, burn: 2, _burnFresh: 2 } },
      seed: 76,
      rounds: [{ p: { ab: "cinder", target: "NE" }, a: { ab: "bR", target: "SW" } }],
    });
    const base = mk("heatrise");
    row("st:burn:cap2", "3rd application refused at cap 2", "burn stays ≤2 (post-tick 2)", base.g.A.burn, base.g.A.burn <= 2);
    row("st:burn:capLine", "'already ablaze' logged", "line present", "", base.rounds[0].lines.some((t) => t.includes("already ablaze")));
    const ever = mk("everburn");
    row("st:burn:everburn", "Everburn allows the 3rd stack", "burn 3 (fresh, no fade)", ever.g.A.burn, ever.g.A.burn === 3);
  });

  test("Heat Rising: +1◆ when the foe burns", () => {
    boot();
    const d = duel({
      p: { fk: "C", load: ["cinder", "smoke", "comb", "pyre"], pass: "heatrise", set: { pow: 0, hp: 20, maxHp: 20 } },
      a: { ...BAG, set: { hp: 25, maxHp: 25, burn: 1, _burnFresh: 0 } },
      seed: 77,
      rounds: [{ p: { ab: "smoke" }, a: { ab: "bR", target: "NW" } }],
    });
    // burn tick 1 → heatrise +1◆, plus end-of-round +1 = 2
    rowEq("st:heatrise", "0◆ + heatrise 1 + income 1", 2, d.g.P.pow);
  });
});

describe("curse", () => {
  test("inert before round 8; collects at 8+ (1 per 3, max 2); Marrow must own the curse", () => {
    boot();
    // collection only runs when the curse-giver is Marrow — that's the kit rule
    const rounds = Array.from({ length: 8 }, () => ({ p: { ab: "stick", target: "SE" }, a: { ab: "flux", target: "SE" } }));
    const d = duel({
      p: { fk: "O", load: ["stick", "knit", "mireA", "sorrow"], pass: "stitch", set: { pow: 0, hp: 20, maxHp: 20 } },
      a: { fk: "K", load: ["cannon", "flux", "gyro", "frame"], pass: "overclock", set: { pow: 0, hp: 25, maxHp: 25 } },
      seed: 78,
      rounds: rounds.map((r, i) => ({
        ...r,
        // keep the bag poor at collection time — Koros's innate 3◆ armor
        // would legitimately soak 1 from the tick otherwise
        before: i === 0 ? (gm) => { gm.A.curse = 7; } : i === 7 ? (gm) => { gm.A.pow = 0; } : undefined,
      })),
    });
    const early = d.rounds.slice(0, 7).flatMap((r) => r.lines).filter((t) => t.includes("Curses collect")).length;
    rowEq("st:curse:inert", "no collection before round 8", 0, early);
    const r8 = d.rounds[7]?.lines || [];
    row("st:curse:tick8", "round 8 collects, capped at 2", "Curses collect — Koros takes 2", "", r8.some((t) => t.includes("Curses collect — Koros takes 2")));
  });

  test("Marrow-Deep starts collection at round 7; Marrow must be the caster", () => {
    boot();
    // Curse collection requires the curse OWNER to be Marrow (foe.fk === 'O')
    const d = duel({
      p: { fk: "O", load: ["stick", "knit", "mireA", "sorrow"], pass: "mdeep", set: { pow: 0, hp: 20, maxHp: 20 } },
      a: { fk: "K", load: ["cannon", "flux", "gyro", "frame"], pass: "overclock", set: { pow: 0, hp: 25, maxHp: 25, curse: 3 } },
      seed: 79,
      rounds: Array.from({ length: 7 }, () => ({ p: { ab: "stick", target: "SE" }, a: { ab: "flux", target: "SE" } })),
    });
    const r7 = d.rounds[6]?.lines || [];
    row("st:curse:mdeep", "collection at end of round 7", "Curses collect", "", r7.some((t) => t.includes("Curses collect")));
    const r6 = d.rounds[5]?.lines || [];
    row("st:curse:mdeepNot6", "still inert at round 6", "no collection", "", !r6.some((t) => t.includes("Curses collect")));
  });

  test("Bad Juju: 3+ curse blocks healing and feeds +1 Curse", () => {
    boot();
    const d = duel({
      p: { fk: "O", load: ["stick", "knit", "mireA", "sorrow"], pass: "juju", set: { pow: 3, hp: 20, maxHp: 20 } },
      a: { fk: "Y", load: ["lash", "current", "bwater", "storm"], pass: "rider", set: { hp: 10, maxHp: 25, curse: 3, pow: 3 } },
      seed: 80,
      rounds: [{ p: { ab: "stick", target: "SE" }, a: { ab: "current" } }],
    });
    rowEq("st:juju:denied", "Renewing Current heal denied", 0, healsTo(d.rounds[0].lines, "Maelis"));
    rowEq("st:juju:feeds", "denied heal feeds +1 curse (3→4)", 4, d.g.A.curse);
    row("st:juju:line", "denial narrated", "curses refuse the healing", "", d.rounds[0].lines.some((t) => t.includes("refuse the healing")));
  });
});

describe("mark", () => {
  test("Kess's square marks at round end; stacks to 2; +1 per mark from Wrenna only", () => {
    boot();
    const d = duel({
      p: { fk: "W", load: ["broad", "hawk", "pin", "sky"], pass: "parting", set: { pow: 3, hp: 20, maxHp: 20 } },
      a: { ...BAG, set: { hp: 25, maxHp: 25 } },
      seed: 81,
      rounds: [
        // kess starts at SW; wing her to NE (the bag's square) — wait: adjacency SW→{NW,SE}. Park bag instead:
        // round 1: bag walks into SW? Simpler: move Kess SE, shove bag there next.
        { before: (gm) => { gm.kessQ = "NE"; }, p: { ab: "broad", target: "SE" }, a: { ab: "bR", target: "SE" } },
        { p: { ab: "broad", target: "NE" }, a: { ab: "bR", target: "SW" } },
      ],
    });
    row("st:mark:stamp", "bag marked after ending on Kess's square", "Kess screams line", "",
      d.rounds[0].lines.some((t) => t.includes("Kess screams")));
    // second round: marked target takes +1 from Wrenna (trade: 1+1)
    rowEq("st:mark:bonus", "Broadhead vs marked (trade)", 2, dmgTo(d.rounds[1].lines, "Maelis"));
  });
});

describe("terrain effects on occupants", () => {
  const terrainCase = (kind, expectLine, opts = {}) => {
    const n = NEUTRAL();
    return duel({
      ...n, seed: opts.seed || 82,
      rounds: [{
        before: (gm) => { gm.terrain.NE = { kind, until: 99 }; if (opts.before) opts.before(gm); },
        ...IDLE,
      }],
    });
  };

  test("frost chills; scorch burns; poisoned ground poisons; mire curses", () => {
    boot();
    const frost = terrainCase("frost");
    row("terr:frost", "occupant chilled at round end", "chill=true", frost.g.A.chill, frost.g.A.chill === true);
    const scorch = terrainCase("scorch", null, { seed: 83 });
    rowEq("terr:scorch", "occupant gains burn, ticks 1 same round, stack survives (fresh grace)", 1, scorch.g.A.burn);
    row("terr:scorch:tick", "burn ticked this round", "Burning — Koros takes 1", "", scorch.rounds[0].lines.some((t) => t.includes("Burning — Koros takes 1")));
    const env = terrainCase("env", null, { seed: 84 });
    rowEq("terr:env", "occupant gains 1 poison", 1, env.g.A.poison);
    const mire = terrainCase("mire", null, { seed: 85 });
    rowEq("terr:mire", "occupant gains 1 curse", 1, mire.g.A.curse);
  });

  test("Sanctuary: heals Kastor 1, sears anyone else 1", () => {
    boot();
    const d = duel({
      p: { fk: "L", load: ["llance", "oath", "aegis", "dawn"], pass: "vigil", set: { pow: 0, hp: 10, maxHp: 15 } },
      a: { fk: "K", load: ["cannon", "flux", "gyro", "frame"], pass: "overclock", set: { pow: 0, hp: 25, maxHp: 25 } },
      seed: 86,
      rounds: [{
        before: (gm) => { gm.terrain.SW = { kind: "hall", until: 99 }; gm.terrain.NE = { kind: "hall", until: 99 }; },
        p: { ab: "llance", target: "SE" }, a: { ab: "flux", target: "SE" },
      }],
    });
    rowEq("terr:hall:heal", "Kastor heals 1 on his Sanctuary", 1, healsTo(d.rounds[0].lines, "Kastor"));
    rowEq("terr:hall:sear", "trespasser seared 1", 1, dmgTo(d.rounds[0].lines, "Koros"));
  });

  test("Crashing Surf: 1 damage then thrown out; anchors hold", () => {
    boot();
    const n = NEUTRAL();
    const thrown = duel({
      ...n, seed: 87,
      rounds: [{ before: (gm) => { gm.terrain.NE = { kind: "surf", until: 99 }; }, ...IDLE }],
    });
    rowEq("terr:surf:dmg", "surf batters 1", 1, dmgTo(thrown.rounds[0].lines, "Koros"));
    row("terr:surf:throw", "occupant thrown to an adjacent quadrant", "not NE", thrown.g.A.pos, thrown.g.A.pos !== "NE");
    const anchored = duel({
      ...n, seed: 88,
      rounds: [{
        before: (gm) => { gm.terrain.NE = { kind: "surf", until: 99 }; },
        p: { ab: "skull", target: "SE" }, a: { ab: "gyro" }, // gyro anchors
      }],
    });
    row("terr:surf:anchor", "anchored fighter holds against the surf", "NE", anchored.g.A.pos, anchored.g.A.pos === "NE");
  });

  test("terrain durations: frost/scorch 2 rounds, sanctuary 3; permafrost forever", () => {
    boot();
    const n = NEUTRAL();
    const d = duel({
      ...n, seed: 89,
      rounds: [
        { before: (gm) => { gm.terrain.SE = { kind: "frost", until: gm.round + 1 }; gm.terrain.NW = { kind: "hall", until: gm.round + 2 }; }, ...IDLE },
        { ...IDLE }, { ...IDLE },
      ],
    });
    // after round 2 ends, frost (until 2) expires; sanctuary (until 3) expires after round 3
    row("terr:dur:frost", "frost expired after its 2-round window", "gone", d.g.terrain.SE?.kind ?? "none", !d.g.terrain.SE);
    row("terr:dur:hall", "sanctuary expired after 3 rounds", "gone", d.g.terrain.NW?.kind ?? "none", !d.g.terrain.NW);
  });

  test("one terrain per quadrant — new replaces old", () => {
    boot();
    const d = duel({
      p: { fk: "V", load: ["freeze", "lance", "hoar", "spike"], pass: "permafrost", set: { pow: 3, hp: 20, maxHp: 20 } },
      a: { fk: "K", load: ["cannon", "flux", "gyro", "frame"], pass: "overclock", set: { pow: 0, hp: 25, maxHp: 25 } },
      seed: 90,
      rounds: [{
        before: (gm) => { gm.terrain.NE = { kind: "mire", until: 99 }; },
        p: { ab: "freeze", target: "NE" }, a: { ab: "flux", target: "SE" },
      }],
    });
    row("terr:replace", "Flash Freeze paves the Mire", "frost", d.g.terrain.NE?.kind, d.g.terrain.NE?.kind === "frost");
  });

  test("Homefield: enemies ending a round on Dominion take 1", () => {
    boot();
    const d = duel({
      p: { fk: "D", load: ["grind", "claim", "quake", "mount"], pass: "home", set: { pow: 0, hp: 20, maxHp: 20 } },
      a: { fk: "K", load: ["cannon", "flux", "gyro", "frame"], pass: "overclock", set: { pow: 0, hp: 25, maxHp: 25 } },
      seed: 91,
      rounds: [{ before: (gm) => { gm.terrain.NE = { kind: "dom", until: 9999 }; }, p: { ab: "grind", target: "SE" }, a: { ab: "flux", target: "SE" }, prompts: ["SW"] }],
    });
    rowEq("terr:homefield", "Homefield chips the squatter", 1, dmgTo(d.rounds[0].lines, "Koros"));
  });

  test("Undine: lashes co-occupants 1 at round end; expires after 3 rounds", () => {
    boot();
    const n = NEUTRAL();
    const d = duel({
      ...n, seed: 92,
      rounds: [
        { before: (gm) => { gm.undineQ = "NE"; gm.undineUntil = gm.round + 3; }, ...IDLE },
        { ...IDLE }, { ...IDLE }, { ...IDLE },
      ],
    });
    rowEq("st:undine:lash", "Undine lashes 1", 1, dmgTo(d.rounds[0].lines, "Koros"));
    row("st:undine:expired", "Undine drains away after its time", "gone", d.g.undineQ ?? "none", !d.g.undineQ);
  });
});
