/* VESSK REWORK GUARDRAILS — "The Ice Architect" (v0.85). Permanent, run
   before every deploy. They pin the exact laws of the rework:
   — SHATTER, the global rule: any Break Vessk lands, or any Advantage
     exchange he wins, against a CHILLED target = +1 and the chill is SPENT.
     At most once per exchange per source; his elemental is a separate source.
   — Frost zones last exactly 2 round-ends unless anchored or Permafrost.
   — Winter's Mantle pays (heal 2 / +1 counter / frost underfoot) ONLY on the
     Advantage catch.
   — Flash Freeze base-roots and paints; its Advantage is the plain +1.
   — Ice Elementals: anchor, mirror only their own zone, removal on
     spend / counter / zone-loss (fresh decay clock), stun skips the mirror.
   — Blizzard, both modes, anchored zones counting.
   — FLAT-FINAL LAW: no shatter bonus and no elemental damage may modify the
     round-10 final clash. */
import { test, describe, beforeAll, afterEach, vi, expect } from "vitest";
import { boot, restoreRandom, g } from "./lab/runner.jsx";
import { duel, dmgTo, dmgBy, healsTo, healBy } from "./lab/scenario.jsx";

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  boot();
});
afterEach(() => { restoreRandom(); });

const VESSK = (set = {}, pass = "permafrost", load = ["lance", "spike", "freeze", "iceage"]) =>
  ({ fk: "V", load, pass, set: { pow: 3, hp: 20, maxHp: 20, ...set } });
const BAGY = (set = {}) => ({ fk: "Y", load: ["lash", "current", "bwater", "undine"], pass: "rider", set: { hp: 30, maxHp: 30, pow: 3, ...set } });
const CHILLED = (set = {}) => BAGY({ chill: true, chillUntil: 99, ...set });
const shatterLines = (lines) => lines.filter((t) => t.includes("SHATTER — the chill breaks"));

describe("SHATTER — the global rule", () => {
  test("a landed Break pays +1 and SPENDS the chill (trade, no advantage needed)", () => {
    const d = duel({
      p: VESSK(), a: CHILLED(), seed: 1,
      rounds: [{ p: { ab: "spike", target: "NE" }, a: { ab: "bB", target: "SW" } }],
    });
    expect(dmgTo(d.rounds[0].lines, "Maelis")).toBe(3); // 2 + shatter 1
    expect(shatterLines(d.rounds[0].lines).length).toBe(1);
    expect(d.g.A.chill).toBe(false);
  });

  test("once per exchange per source: a Break advantage win shatters ONCE across base + rider", () => {
    const d = duel({
      p: VESSK(), a: CHILLED(), seed: 2,
      rounds: [{ p: { ab: "spike", target: "NE" }, a: { ab: "current" } }], // break shatters ward
    });
    // spike 2 + shatter 1 + advantage point 1 = 4 exactly; one shatter line
    expect(dmgTo(d.rounds[0].lines, "Maelis")).toBe(4);
    expect(shatterLines(d.rounds[0].lines).length).toBe(1);
    expect(d.g.A.chill).toBe(false);
  });

  test("a won Advantage exchange shatters even on a Rush; the lance then re-chills", () => {
    const d = duel({
      p: VESSK(), a: CHILLED(), seed: 3,
      rounds: [{ p: { ab: "lance", target: "NE" }, a: { ab: "bB", target: "SW" } }], // rush beats break
    });
    expect(dmgTo(d.rounds[0].lines, "Maelis")).toBe(3); // 1 + shatter 1 + adv 1
    expect(shatterLines(d.rounds[0].lines).length).toBe(1);
    expect(d.g.A.chill).toBe(true); // spent, then re-applied by lance contact
  });

  test("a neutral Rush (trade) does NOT shatter", () => {
    const d = duel({
      p: VESSK(), a: CHILLED(), seed: 4,
      rounds: [{ p: { ab: "lance", target: "NE" }, a: { ab: "bR", target: "SW" } }],
    });
    expect(dmgBy(d.rounds[0].lines, "Ice Lance lands DIRECT", "Maelis")).toBe(1);
    expect(shatterLines(d.rounds[0].lines).length).toBe(0);
  });

  test("no double-dipping: a chill applied THIS exchange cannot be shattered this exchange", () => {
    const d = duel({
      p: VESSK(), a: BAGY(), seed: 33, // NOT pre-chilled
      rounds: [{ p: { ab: "lance", target: "NE" }, a: { ab: "bB", target: "SW" } }], // lance wins advantage, chills on contact
    });
    expect(dmgTo(d.rounds[0].lines, "Maelis")).toBe(2); // 1 + adv 1 — the fresh chill is NOT cashed
    expect(shatterLines(d.rounds[0].lines).length).toBe(0);
    expect(d.g.A.chill).toBe(true); // it stands, payable next exchange
  });

  test("a ward catch is a won Advantage exchange: the riposte shatters", () => {
    const d = duel({
      p: VESSK({}, "permafrost", ["lance", "spike", "bW", "iceage"]), a: CHILLED(), seed: 5,
      rounds: [{ p: { ab: "bW" }, a: { ab: "lash", target: "SW" } }], // rush into the guard
    });
    // riposte 1 + shatter 1 (folded) + sharpened riposte 1 = 3
    expect(dmgTo(d.rounds[0].lines, "Maelis")).toBe(3);
    expect(shatterLines(d.rounds[0].lines).length).toBe(1);
    expect(d.g.A.chill).toBe(false);
  });
});

describe("Winter's Mantle — the Advantage catch is the whole payout", () => {
  const MANTLE = (set = {}) => VESSK(set, "permafrost", ["lance", "spike", "mantle", "iceage"]);
  test("idle: bare counter stance — no heal, no frost", () => {
    const d = duel({
      p: MANTLE({ hp: 10 }), a: BAGY(), seed: 6,
      rounds: [{ p: { ab: "mantle" }, a: { ab: "lash", target: "NW" } }], // whiffs elsewhere
    });
    expect(healsTo(d.rounds[0].lines, "Vessk")).toBe(0);
    expect(d.g.terrain.SW).toBeUndefined();
  });
  test("guard break: no heal, no frost — the vow pays nothing when it breaks", () => {
    const d = duel({
      p: MANTLE({ hp: 10 }), a: BAGY(), seed: 7,
      rounds: [{ p: { ab: "mantle" }, a: { ab: "bwater", target: "SW" } }], // break through the ward
    });
    expect(healsTo(d.rounds[0].lines, "Vessk")).toBe(0);
    expect(d.g.terrain.SW?.kind).not.toBe("frost");
  });
  test("Advantage catch: +1 counter AND heal 2 AND the quadrant freezes", () => {
    const d = duel({
      p: MANTLE({ hp: 10 }), a: BAGY(), seed: 8,
      rounds: [{ p: { ab: "mantle" }, a: { ab: "lash", target: "SW" } }], // rush into the ward
    });
    expect(dmgBy(d.rounds[0].lines, "Riposte", "Maelis")).toBe(1);
    expect(dmgBy(d.rounds[0].lines, "Mantle counter", "Maelis")).toBe(1);
    expect(healBy(d.rounds[0].lines, "Winter's Mantle", "Vessk")).toBe(2);
    expect(d.g.terrain.SW?.kind).toBe("frost");
  });
});

describe("Flash Freeze — the root is base", () => {
  test("even a trade roots the target next round and paints the zone; no extra damage", () => {
    const d = duel({
      p: VESSK(), a: BAGY(), seed: 9,
      rounds: [
        { p: { ab: "freeze", target: "NE" }, a: { ab: "bR", target: "SW" } }, // rush-rush trade
        { p: { ab: "lance", target: "NE" }, a: { ab: "bR", target: "SW", moveTo: "SE" } }, // bag tries to leave
      ],
    });
    expect(dmgTo(d.rounds[0].lines, "Maelis")).toBe(1); // base only in the trade
    expect(d.rounds[0].lines.some((t) => t.includes("frozen boots take hold"))).toBe(true);
    expect(d.g.terrain.NE?.kind).toBe("frost");
    expect(d.rounds[1].lines.some((t) => t.includes("Rooted in NE"))).toBe(true);
    expect(d.g.A.pos).toBe("NE"); // the move to SE was refused
  });
  test("Advantage is the plain +1 — no double root text, total exactly 2", () => {
    const d = duel({
      p: VESSK(), a: BAGY(), seed: 10,
      rounds: [{ p: { ab: "freeze", target: "NE" }, a: { ab: "bB", target: "SW" } }], // rush beats break
    });
    expect(dmgBy(d.rounds[0].lines, "Flash Freeze lands DIRECT", "Maelis")).toBe(1);
    expect(dmgBy(d.rounds[0].lines, "Advantage — the extra point", "Maelis")).toBe(1);
    expect(dmgTo(d.rounds[0].lines, "Maelis")).toBe(2);
  });
});

describe("frost zone clock — exactly 3 round-ends (v0.85.1 ruling)", () => {
  const IDLE_V = { p: { ab: "lance", target: "NW" }, a: { ab: "lash", target: "SE" } }; // mutual whiffs
  test("painted zone survives two bells, melts at its third (announced)", () => {
    const d = duel({
      p: VESSK({}, "blizzard"), a: BAGY(), seed: 11,
      rounds: [
        { p: { ab: "freeze", target: "NE" }, a: { ab: "bR", target: "SW" } }, // paint at round 1
        { ...IDLE_V }, // bell 2 — stands
        { ...IDLE_V }, // bell 3 → melt
      ],
    });
    expect(d.rounds[0].lines.some((t) => t.includes("Frost claims NE"))).toBe(true);
    expect(d.rounds[1].lines.some((t) => t.includes("melts away"))).toBe(false);
    expect(d.rounds[2].lines.some((t) => t.includes("The frost at NE melts away"))).toBe(true);
    expect(d.g.terrain.NE).toBeUndefined();
  });
  test("Permafrost: time never melts it (destruction still can)", () => {
    const d = duel({
      p: VESSK({}, "permafrost"), a: BAGY(), seed: 12,
      rounds: [
        { p: { ab: "freeze", target: "NE" }, a: { ab: "bR", target: "SW" } },
        { ...IDLE_V }, { ...IDLE_V }, { ...IDLE_V }, { ...IDLE_V },
      ],
    });
    expect(d.g.terrain.NE?.kind).toBe("frost");
  });
  test("an elemental-anchored zone does not decay — and says so", () => {
    const d = duel({
      p: VESSK({}, "blizzard", ["lance", "freeze", "bW", "iceage"]), a: BAGY(), seed: 13,
      rounds: [
        { p: { ab: "freeze", target: "NE" }, a: { ab: "bR", target: "SW" } }, // paint (bell 1)
        { p: { ab: "iceage" }, a: { ab: "lash", target: "SE" } }, // anchor (also self-paints SW)
        // round-3 clash: a WARD pick — since v0.85.2 a lance/spike clash would
        // mirror off the bag standing on the anchored zone and spend it
        { p: { ab: "bW" }, a: { ab: "lash" } },
        { ...IDLE_V }, { ...IDLE_V },
      ],
    });
    expect(Object.keys(d.g.icels).sort()).toEqual(["NE", "SW"]); // self-paint births one under Vessk too
    expect(d.rounds[2].lines.some((t) => t.includes("holds the frost at NE"))).toBe(true);
    expect(d.g.terrain.NE?.kind).toBe("frost");
    expect(d.g.terrain.SW?.kind).toBe("frost");
  });
  test("Ice Age on a bare board freezes the caster's quadrant and births its guardian there", () => {
    const d = duel({
      p: VESSK({}, "blizzard"), a: BAGY(), seed: 34,
      rounds: [{ p: { ab: "iceage" }, a: { ab: "lash", target: "SE" } }],
    });
    expect(d.g.terrain.SW?.kind).toBe("frost");
    expect(Object.keys(d.g.icels)).toEqual(["SW"]);
  });
});

describe("Ice Elemental — full lifecycle law", () => {
  test("MIRROR on a win: base + Advantage rider + its OWN shatter off the same exchange's chill", () => {
    const d = duel({
      p: VESSK(), a: CHILLED(), seed: 14,
      rounds: [
        {
          before: (gm) => { gm.terrain.NE = { kind: "frost", until: 99 }; gm.icels.NE = { stun: 0, bornR: 1 }; },
          p: { ab: "spike", target: "NE" }, a: { ab: "current" }, // break shatters ward: Vessk wins
        },
      ],
    });
    const L = d.rounds[0].lines;
    // Vessk: 2 + shatter 1 + adv 1 = 4 · Elemental: 2 + adv 1 + echo shatter 1 = 4
    expect(dmgBy(L, "Ice Elemental — mirrored Glacial Spike", "Maelis")).toBe(4);
    expect(dmgTo(L, "Maelis")).toBe(8);
    expect(L.filter((t) => t.includes("SHATTER")).length).toBe(2); // one per source
    expect(L.some((t) => t.includes("spends itself in the strike"))).toBe(true);
    expect(d.g.icels.NE).toBeUndefined(); // spent
    expect(d.g.terrain.NE?.kind).toBe("frost"); // zone survives its guardian
  });

  test("MIRROR on a neutral trade: base only (plus its break-shatter); spent after dealing damage", () => {
    const d = duel({
      p: VESSK(), a: CHILLED(), seed: 15,
      rounds: [
        {
          before: (gm) => { gm.terrain.NE = { kind: "frost", until: 99 }; gm.icels.NE = { stun: 0, bornR: 1 } },
          p: { ab: "spike", target: "NE" }, a: { ab: "bB", target: "SW" }, // break-break trade
        },
      ],
    });
    const L = d.rounds[0].lines;
    expect(dmgBy(L, "Ice Elemental — mirrored Glacial Spike", "Maelis")).toBe(3); // 2 + echo shatter, no adv
    expect(dmgTo(L, "Maelis")).toBe(6); // 3 + 3 — the "6 damage" neutral max-line
    expect(d.g.icels.NE).toBeUndefined();
  });

  test("COUNTERED: the enemy's type breaks it for nothing; fresh decay clock on the zone", () => {
    const d = duel({
      p: VESSK(), a: BAGY(), seed: 16,
      rounds: [
        {
          before: (gm) => { gm.terrain.NE = { kind: "frost", until: 99 }; gm.icels.NE = { stun: 0, bornR: 1 }; },
          p: { ab: "lance", target: "NE" }, a: { ab: "current" }, // ward catches the rush
        },
        { p: { ab: "lance", target: "NW" }, a: { ab: "lash", target: "SE" } }, // bell 2 of the fresh clock
        { p: { ab: "lance", target: "NW" }, a: { ab: "lash", target: "SE" } }, // bell 3 → melt
      ],
    });
    const L = d.rounds[0].lines;
    expect(L.some((t) => t.includes("COUNTERED — the Ice Elemental"))).toBe(true);
    expect(dmgBy(L, "Ice Elemental — mirrored Ice Lance", "Maelis")).toBe(0);
    expect(d.g.icels.NE).toBeUndefined();
    // fresh full clock: survives two bells from the removal round, melts at the third
    expect(d.rounds[1].lines.some((t) => t.includes("melts away"))).toBe(false);
    expect(d.rounds[2].lines.some((t) => t.includes("The frost at NE melts away"))).toBe(true);
    expect(d.g.terrain.NE).toBeUndefined();
  });

  test("only the aimed zone's elemental acts — never all at once", () => {
    const d = duel({
      p: VESSK(), a: BAGY(), seed: 17,
      rounds: [
        {
          before: (gm) => {
            gm.terrain.NE = { kind: "frost", until: 99 }; gm.icels.NE = { stun: 0, bornR: 1 };
            gm.terrain.NW = { kind: "frost", until: 99 }; gm.icels.NW = { stun: 0, bornR: 1 };
          },
          p: { ab: "spike", target: "NE" }, a: { ab: "bB", target: "SW" },
        },
      ],
    });
    expect(d.rounds[0].lines.filter((t) => t.includes("MIRRORS")).length).toBe(1);
    expect(d.g.icels.NE).toBeUndefined(); // acted and was spent
    expect(d.g.icels.NW).toBeDefined(); // bystander persists
  });

  test("no mirror when the enemy is not in the aimed zone; the elemental persists", () => {
    const d = duel({
      p: VESSK(), a: BAGY(), seed: 18,
      rounds: [
        {
          before: (gm) => { gm.terrain.SE = { kind: "frost", until: 99 }; gm.icels.SE = { stun: 0, bornR: 1 }; },
          p: { ab: "spike", target: "SE" }, a: { ab: "lash", target: "SW" }, // spike whiffs into the empty zone
        },
      ],
    });
    expect(d.rounds[0].lines.some((t) => t.includes("MIRRORS"))).toBe(false);
    expect(d.g.icels.SE).toBeDefined();
  });

  test("COLLISION in an elemental's zone triggers the mirror", () => {
    const d = duel({
      p: VESSK(), a: BAGY(), seed: 19,
      rounds: [
        {
          before: (gm) => { gm.terrain.NE = { kind: "frost", until: 99 }; gm.icels.NE = { stun: 0, bornR: 1 }; },
          p: { ab: "lance", target: "NE", moveTo: "NE" }, a: { ab: "bB", target: "NE" }, // body-chase: collision at NE
        },
      ],
    });
    const L = d.rounds[0].lines;
    expect(L.some((t) => t.includes("COLLISION"))).toBe(true);
    // rush beats break in the collision → mirror with advantage: 1 + 1.
    // The chill Vessk's lance applied THIS exchange is fresh — nobody may
    // shatter it until it has stood through an exchange start (no double-dip).
    expect(dmgBy(L, "Ice Elemental — mirrored Ice Lance", "Maelis")).toBe(2);
    expect(d.g.icels.NE).toBeUndefined();
  });

  test("CLASH MIRROR (v0.85.2): enemy standing in the zone at a round-3/7 clash — win pays rider and all", () => {
    const d = duel({
      p: VESSK(), a: CHILLED({ hp: 40, maxHp: 40 }), seed: 40,
      rounds: [
        { p: { ab: "lance", target: "NW" }, a: { ab: "lash", target: "SE" } },
        {
          before: (gm) => {
            gm.terrain.NE = { kind: "frost", until: 99 }; gm.icels.NE = { stun: 0, bornR: 1 }; // under the bag
            gm.A.chill = true; gm.A.chillUntil = 99;
          },
          p: { ab: "lance", target: "NW" }, a: { ab: "lash", target: "SE" },
        },
        { p: { ab: "spike" }, a: { ab: "current" } }, // round-3 clash: break beats ward
      ],
    });
    const L = d.rounds[2].lines;
    expect(L.join("\n")).toContain("CLASH");
    // Vessk: 2 + shatter 1 + adv 1 (+ final edge? no — round 3) · mirror: 2 + adv 1 + echo shatter 1
    expect(dmgBy(L, "Ice Elemental — mirrored Glacial Spike", "Maelis")).toBe(4);
    expect(L.some((t) => t.includes("MIRRORS Glacial Spike — Advantage and all"))).toBe(true);
    expect(d.g.icels.NE).toBeUndefined(); // spent
    expect(d.g.terrain.NE?.kind).toBe("frost"); // zone survives on a fresh clock
  });

  test("CLASH MIRROR: a clash tie is neutral — base mirror only; a clash loss counters the elemental", () => {
    const tieCase = duel({
      p: VESSK(), a: BAGY({ hp: 40, maxHp: 40 }), seed: 41,
      rounds: [
        { p: { ab: "lance", target: "NW" }, a: { ab: "lash", target: "SE" } },
        { before: (gm) => { gm.terrain.NE = { kind: "frost", until: 99 }; gm.icels.NE = { stun: 0, bornR: 1 }; }, p: { ab: "lance", target: "NW" }, a: { ab: "lash", target: "SE" } },
        { p: { ab: "lance" }, a: { ab: "lash" } }, // round-3 clash: rush-rush tie
      ],
    });
    expect(dmgBy(tieCase.rounds[2].lines, "Ice Elemental — mirrored Ice Lance", "Maelis")).toBe(1); // base, no rider
    expect(tieCase.g.icels.NE).toBeUndefined(); // spent
    const lossCase = duel({
      p: VESSK(), a: BAGY({ hp: 40, maxHp: 40 }), seed: 42,
      rounds: [
        { p: { ab: "lance", target: "NW" }, a: { ab: "lash", target: "SE" } },
        { before: (gm) => { gm.terrain.NE = { kind: "frost", until: 99 }; gm.icels.NE = { stun: 0, bornR: 1 }; }, p: { ab: "lance", target: "NW" }, a: { ab: "lash", target: "SE" } },
        { p: { ab: "lance" }, a: { ab: "current" } }, // round-3 clash: ward catches the rush — Vessk loses
      ],
    });
    const L = lossCase.rounds[2].lines;
    expect(L.some((t) => t.includes("COUNTERED — the Ice Elemental"))).toBe(true);
    expect(dmgBy(L, "Ice Elemental — mirrored Ice Lance", "Maelis")).toBe(0);
    expect(lossCase.g.icels.NE).toBeUndefined();
  });

  test("zone-loss removal: enemy paint (Pyre) collapses zone AND elemental — no decay reset needed", () => {
    const d = duel({
      p: VESSK(), a: { fk: "C", load: ["cinder", "smoke", "comb", "pyre"], pass: "everburn", set: { hp: 30, maxHp: 30, pow: 3 } }, seed: 20,
      rounds: [
        {
          before: (gm) => { gm.terrain.SW = { kind: "frost", until: 99 }; gm.icels.SW = { stun: 0, bornR: 1 }; },
          p: { ab: "bB", target: "NE" }, a: { ab: "pyre", target: "SW" }, // break-break trade; pyre scorches SW+adjacent
        },
      ],
    });
    expect(d.rounds[0].lines.some((t) => t.includes("collapses with its ground"))).toBe(true);
    expect(d.g.icels.SW).toBeUndefined();
    expect(d.g.terrain.SW?.kind).toBe("scorch");
  });

  test("STUN (Finality Beam): mirror-turn skipped, zone stays frozen, elemental persists", () => {
    // the Beam hits Vessk standing on his anchored zone: elemental stunned, raze refused
    const beam = duel({
      p: { fk: "K", load: ["cannon", "flux", "gyro", "core"], pass: "vent", set: { pow: 3, hp: 25, maxHp: 25 } },
      a: { fk: "V", load: ["lance", "spike", "freeze", "iceage"], pass: "permafrost", set: { pow: 3, hp: 25, maxHp: 25 } },
      seed: 21,
      rounds: [
        {
          before: (gm) => { gm.terrain.NE = { kind: "frost", until: 99 }; gm.icels.NE = { stun: 0, bornR: 1 }; },
          p: { ab: "core", target: "NE" }, a: { ab: "bB", target: "SW" }, // trade: beam lands on the anchored zone
        },
      ],
    });
    expect(beam.rounds[0].lines.some((t) => t.includes("anchored frost holds against the raze"))).toBe(true);
    expect(beam.g.terrain.NE?.kind).toBe("frost");
    expect(beam.g.icels.NE).toBeDefined();
    expect(beam.g.icels.NE.stun).toBeGreaterThan(0);
    // and a stunned elemental skips exactly its next mirror-turn
    const stunned = duel({
      p: VESSK(), a: BAGY(), seed: 22,
      rounds: [
        {
          before: (gm) => { gm.terrain.NE = { kind: "frost", until: 99 }; gm.icels.NE = { stun: 99, bornR: 1 }; },
          p: { ab: "spike", target: "NE" }, a: { ab: "bB", target: "SW" },
        },
      ],
    });
    expect(stunned.rounds[0].lines.some((t) => t.includes("mirror stays dark"))).toBe(true);
    expect(dmgBy(stunned.rounds[0].lines, "Ice Elemental — mirrored Glacial Spike", "Maelis")).toBe(0);
    expect(stunned.g.icels.NE).toBeDefined(); // persists
  });
});

describe("Blizzard — both modes, anchored zones counting", () => {
  const IDLE = { p: { ab: "lance", target: "NW" }, a: { ab: "lash", target: "SE" } };
  const storm = (before, seed) => duel({
    p: VESSK({ pow: 0 }, "blizzard"), a: BAGY(), seed,
    rounds: [{ before, ...IDLE }],
  });
  test("mode A: 2+ zones AND a chilled foe → Flow at the bell", () => {
    const d = storm((gm) => {
      gm.terrain.NW = { kind: "frost", until: 99 }; gm.terrain.SE = { kind: "frost", until: 99 };
      gm.A.chill = true; gm.A.chillUntil = 99;
    }, 23);
    expect(d.rounds[0].lines.some((t) => t.includes("BLIZZARD"))).toBe(true);
    expect(d.g.P.flow).toBe(true);
  });
  test("2 zones without a chilled foe: nothing", () => {
    const d = storm((gm) => {
      gm.terrain.NW = { kind: "frost", until: 99 }; gm.terrain.SE = { kind: "frost", until: 99 };
    }, 24);
    expect(d.g.P.flow).toBe(false);
  });
  test("mode B: 3+ zones → Flow every round, chill or not — anchored zones count", () => {
    const d = storm((gm) => {
      gm.terrain.NW = { kind: "frost", until: 99 };
      gm.terrain.SE = { kind: "frost", until: 99 };
      gm.terrain.NE = { kind: "frost", until: 99 }; gm.icels.NE = { stun: 0, bornR: 1 }; // anchored
    }, 25);
    expect(d.rounds[0].lines.some((t) => t.includes("BLIZZARD"))).toBe(true);
    expect(d.g.P.flow).toBe(true);
  });
});

describe("FLAT-FINAL LAW — round 10 belongs to nobody's riders", () => {
  test("no shatter bonus in the final clash: chilled or not, the Break reads base+1+2 and the chill is untouched", () => {
    const d = duel({
      p: VESSK(), a: CHILLED({ hp: 40, maxHp: 40 }), seed: 26,
      rounds: [
        { p: { ab: "lance", target: "NW" }, a: { ab: "lash", target: "SE" } },
        { before: (gm) => { gm.round = 9; gm.A.chill = true; gm.A.chillUntil = 99; }, p: { ab: "lance", target: "NW" }, a: { ab: "lash", target: "SE" } },
        { p: { ab: "spike" }, a: { ab: "current" } }, // round-10 final clash: break beats ward
      ],
    });
    const txt = d.rounds[2].lines.join("\n");
    expect(txt).toContain("CLASH — FINAL");
    expect(dmgTo(d.rounds[2].lines, "Maelis")).toBe(5); // 2 + 1 + 2, flat
    expect(txt).not.toContain("SHATTER");
    expect(d.g.A.chill).toBe(true); // suppressed AND unconsumed
  });

  test("no elemental damage may modify the final clash: the mirror never fires in round 10", () => {
    const d = duel({
      p: VESSK(), a: CHILLED({ hp: 40, maxHp: 40 }), seed: 27,
      rounds: [
        { p: { ab: "lance", target: "NW" }, a: { ab: "lash", target: "SE" } },
        {
          before: (gm) => {
            gm.round = 9;
            gm.terrain.NE = { kind: "frost", until: 99 }; gm.icels.NE = { stun: 0, bornR: 1 }; // under the bag
            gm.A.chill = true; gm.A.chillUntil = 99;
          },
          p: { ab: "lance", target: "NW" }, a: { ab: "lash", target: "SE" },
        },
        { p: { ab: "spike" }, a: { ab: "current" } }, // final clash while the bag stands on the anchored zone
      ],
    });
    const L = d.rounds[2].lines;
    expect(L.join("\n")).toContain("CLASH — FINAL");
    expect(L.some((t) => t.includes("MIRRORS"))).toBe(false);
    expect(dmgBy(L, "Ice Elemental — mirrored Glacial Spike", "Maelis")).toBe(0);
    expect(dmgTo(L, "Maelis")).toBe(5); // flat base+1+2, nothing else
    expect(d.g.icels.NE).toBeDefined(); // it never acted, it never left
  });
});

describe("AI discipline", () => {
  test("AI Vessk prefers Ice Age with standing zones over a bare board (v0.85.1: a bare cast self-paints, so it is legal but less loved)", () => {
    duel({
      p: BAGY({ pow: 0 }), a: { fk: "V", load: ["lance", "hoar", "spike", "iceage"], pass: "blizzard", set: { pow: 3, hp: 20, maxHp: 20 } },
      seed: 30, diff: "crucible",
      rounds: [{ p: { ab: "lash", target: "NE" }, a: { ab: "lance", target: "SW" } }],
    });
    const { aiMakePlan } = window.__CL_TEST__.api;
    const gm = g();
    let barePicks = 0, zonePicks = 0;
    for (let i = 0; i < 80; i++) {
      gm.A.pow = 3; gm.terrain = {}; gm.icels = {};
      if (aiMakePlan(gm.A, gm.P, false, null).ab === "iceage") barePicks++;
      gm.A.pow = 3; gm.terrain = { NW: { kind: "frost", until: 99 }, SE: { kind: "frost", until: 99 } }; gm.icels = {};
      if (aiMakePlan(gm.A, gm.P, false, null).ab === "iceage") zonePicks++;
    }
    expect(zonePicks).toBeGreaterThan(barePicks);
    expect(zonePicks).toBeGreaterThan(10); // it genuinely pursues the two-zone Age
  });
});
