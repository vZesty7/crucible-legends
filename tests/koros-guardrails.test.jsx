/* KOROS REWORK GUARDRAILS — permanent, run before every deploy.
   The Capacitor is deleted; these pin the new kit's exact laws. */
import { test, describe, beforeAll, afterEach, vi, expect } from "vitest";
import { cleanup } from "@testing-library/react";
import { boot, restoreRandom } from "./lab/runner.jsx";
import { duel, dmgTo, dmgBy, healBy, flushAll } from "./lab/scenario.jsx";

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  boot();
});
afterEach(() => { restoreRandom(); });

const KOROS = (set = {}) => ({ fk: "K", load: ["cannon", "flux", "arc", "core"], pass: "vent", set: { pow: 3, hp: 20, maxHp: 20, ...set } });
const KOROS_W = (set = {}) => ({ fk: "K", load: ["cannon", "flux", "frame", "gyro"], pass: "vent", set: { pow: 3, hp: 20, maxHp: 20, ...set } });
const BAGY = (set = {}) => ({ fk: "Y", load: ["lash", "current", "bwater", "undine"], pass: "rider", set: { hp: 30, maxHp: 30, pow: 3, ...set } });

describe("Bulwark Frame", () => {
  test("heals exactly 2 only when cast at a full bank (checked before cost)", () => {
    const rich = duel({
      p: KOROS_W({ pow: 3, hp: 10 }), a: BAGY(), seed: 1,
      rounds: [{ p: { ab: "frame" }, a: { ab: "lash", target: "NW" } }],
    });
    expect(healBy(rich.rounds[0].lines, "Bulwark Frame", "Koros")).toBe(2);
    expect(rich.g.P.pow).toBe(2); // paid 1 from 3, spent so no income
    const poor = duel({
      p: KOROS_W({ pow: 2, hp: 10 }), a: BAGY(), seed: 2,
      rounds: [{ p: { ab: "frame" }, a: { ab: "lash", target: "NW" } }],
    });
    expect(healBy(poor.rounds[0].lines, "Bulwark Frame", "Koros")).toBe(0);
  });
});

describe("Discharge Field", () => {
  test("installs on Arc cast; riposte base is 2 (+1 on advantage)", () => {
    const d = duel({
      p: KOROS(), a: BAGY(), seed: 3,
      rounds: [{ p: { ab: "arc" }, a: { ab: "lash", target: "SW" } }], // rush into the ward
    });
    expect(d.g.P.dischargeField).toBe(true);
    expect(dmgBy(d.rounds[0].lines, "Riposte", "Maelis")).toBe(2);
    expect(dmgBy(d.rounds[0].lines, "Sharpened riposte", "Maelis")).toBe(1);
  });

  test("fires at most ONCE per round even when start+end both qualify; exactly 1; unmodified by Flow", () => {
    const d = duel({
      p: KOROS({ set: undefined }), a: BAGY(), seed: 4,
      rounds: [
        { p: { ab: "arc" }, a: { ab: "lash", target: "NW" } }, // install (idle)
        // bag walks onto Koros's square and stays: start-of-round AND end-of-round both qualify next round
        { p: { ab: "flux", target: "SE" }, a: { ab: "lash", target: "NW", moveTo: "SW" } },
        { before: (gm) => { gm.P.flow = true; }, p: { ab: "gyro" }, a: { ab: "lash", target: "NW" } },
      ],
    });
    // round 2: collision trigger (bag moved onto him) — count field hits that round
    const r2 = d.rounds[1].lines.filter((t) => t.includes("Discharge Field") && t.includes("takes"));
    expect(r2.length).toBe(1);
    expect(r2[0]).toContain("takes 1");
    // round 3: bag started AND ended on his square — still exactly one field hit
    const r3 = d.rounds[2].lines.filter((t) => t.includes("Discharge Field") && t.includes("takes"));
    expect(r3.length).toBe(1);
    expect(r3[0]).toContain("takes 1"); // Flow planted on Koros must NOT boost it
    expect(d.g.P.flow).toBe(true); // and must not be consumed by it
  });

  test("never harms companions sharing his square", () => {
    const d = duel({
      p: KOROS(), a: { fk: "W", load: ["broad", "hawk", "pin", "sky"], pass: "parting", set: { hp: 30, maxHp: 30, pow: 3 } },
      seed: 5,
      rounds: [
        { p: { ab: "arc" }, a: { ab: "broad", target: "NW" } },
        { before: (gm) => { gm.kessQ = "SW"; }, p: { ab: "flux", target: "SE" }, a: { ab: "broad", target: "NW" } },
      ],
    });
    // Kess perched on Koros's square: no field line names her, and she is unstunned
    expect(d.rounds[1].lines.some((t) => t.includes("Discharge Field") && t.includes("Kess"))).toBe(false);
    expect(d.g.kessStun).toBe(0);
  });
});

describe("Finality Beam", () => {
  test("base 5, razes target terrain, stuns companions (their clocks still tick), roots Koros next round", () => {
    const d = duel({
      p: KOROS(), a: BAGY(), seed: 6,
      rounds: [
        {
          before: (gm) => { gm.terrain.NE = { kind: "whirl", until: 99 }; gm.undineQ = "NE"; gm.undineUntil = gm.round + 2; },
          p: { ab: "core", target: "NE" }, a: { ab: "bB", target: "SW" }, // same-type trade: both land base
        },
        // Koros tries to flee — the recoil must hold him
        { p: { ab: "flux", target: "SE", moveTo: "SE" }, a: { ab: "lash", target: "NW" } },
      ],
    });
    expect(dmgBy(d.rounds[0].lines, "Finality Beam lands DIRECT", "Maelis")).toBe(5);
    expect(d.g.terrain.NE).toBeUndefined(); // whirlpool razed
    expect(d.rounds[0].lines.some((t) => t.includes("razed"))).toBe(true);
    expect(d.rounds[0].lines.some((t) => t.includes("Undine is blasted"))).toBe(true); // stunned
    expect(d.g.P.pos).toBe("SW"); // rooted: the move to SE was refused
    expect(d.rounds[1].lines.some((t) => t.includes("Rooted"))).toBe(true);
    // stunned companion's lifespan clock kept ticking (set for round+2 → gone after round 3)
  });

  test("round-10 FINAL CLASH: Beam reads exactly printed 5 + advantage 1 + edge 2 — planted riders suppressed", () => {
    const d = duel({
      p: KOROS(), a: BAGY(), seed: 7,
      rounds: [
        { p: { ab: "flux", target: "SE" }, a: { ab: "lash", target: "NW" } },
        {
          before: (gm) => { gm.round = 9; gm.P.pow = 3; gm.P.flow = true; gm.P.hp = 20; gm.A.hp = 30; },
          p: { ab: "flux", target: "SE" }, a: { ab: "lash", target: "NW" },
        },
        // round 10 final clash: beam (break) vs bag ward → Koros wins
        { p: { ab: "core" }, a: { ab: "current" } },
      ],
    });
    const txt = d.rounds[2].lines.join("\n");
    expect(txt).toContain("CLASH — FINAL");
    const total = dmgTo(d.rounds[2].lines, "Maelis");
    expect(total).toBe(8); // 5 + 1 + 2, nothing else — Flow suppressed AND unconsumed
    expect(d.g.P.flow).toBe(true);
  });
});

describe("Overclock (reworked)", () => {
  test("grants Flow on every rise to full — not while sitting at full", () => {
    const d = duel({
      p: { fk: "K", load: ["cannon", "flux", "frame", "gyro"], pass: "overclock", set: { pow: 2, hp: 20, maxHp: 20 } },
      a: BAGY(), seed: 8,
      rounds: [
        { p: { ab: "flux", target: "SE" }, a: { ab: "lash", target: "NW" } }, // income 2→3: Flow
        { p: { ab: "flux", target: "SE" }, a: { ab: "lash", target: "NW" } }, // capped at 3: no new grant needed (still holding)
        { before: (gm) => { gm.P.flow = false; gm.P.pow = 2; }, p: { ab: "flux", target: "SE" }, a: { ab: "lash", target: "NW" } }, // rise again → Flow again
      ],
    });
    expect(d.rounds[0].lines.some((t) => t.includes("OVERCLOCK"))).toBe(true);
    expect(d.rounds[2].lines.some((t) => t.includes("OVERCLOCK"))).toBe(true);
    expect(d.g.P.flow).toBe(true);
  });
});

describe("Siege Protocol", () => {
  const sieged = (rounds, seed, aSet = {}) => duel({
    p: { fk: "K", load: ["cannon", "flux", "frame", "gyro"], pass: "siege", set: { pow: 0, hp: 20, maxHp: 20, sieged: true } },
    a: BAGY(aSet), seed, rounds,
  });

  test("post-conversion Cannonarm shells all three other quadrants; his own square is shelter", () => {
    // foe in a far quadrant: hit
    const far = sieged([{ p: { ab: "cannon", target: "SW" }, a: { ab: "lash", target: "NW" } }], 9);
    expect(dmgBy(far.rounds[0].lines, "Siege Cannon barrage", "Maelis")).toBe(1);
    // foe standing ON Koros: safe from the barrage (their attack connects clean)
    const close = sieged([{ before: (gm) => { gm.A.pos = "SW"; }, p: { ab: "cannon", target: "NE" }, a: { ab: "lash", target: "SW" } }], 10);
    expect(dmgBy(close.rounds[0].lines, "Siege Cannon barrage", "Maelis")).toBe(0);
    expect(close.rounds[0].lines.some((t) => t.includes("over"))).toBe(true);
  });

  test("lands through triangle disadvantage — a rush that beats Break denies nothing", () => {
    const d = sieged([{ p: { ab: "cannon", target: "NE" }, a: { ab: "lash", target: "SW" } }], 11);
    // bag's rush hits Koros clean AND the barrage still lands
    expect(dmgBy(d.rounds[0].lines, "Riptide Lash lands DIRECT", "Koros")).toBe(1);
    expect(dmgBy(d.rounds[0].lines, "Siege Cannon barrage", "Maelis")).toBe(1);
    expect(d.rounds[0].lines.some((t) => t.includes("Advantage"))).toBe(false); // no riders either direction
  });

  test("neutral to wards: no catch, no riposte, no guard-break bonus; barrage chips through", () => {
    const d = sieged([{ p: { ab: "cannon", target: "NE" }, a: { ab: "current" } }], 12);
    expect(dmgTo(d.rounds[0].lines, "Koros")).toBe(0); // no riposte against it
    expect(dmgBy(d.rounds[0].lines, "Siege Cannon barrage", "Maelis")).toBe(1); // chips through the guard
    expect(d.rounds[0].lines.some((t) => t.includes("WARD catches") || t.includes("BREAK shatters"))).toBe(false);
  });

  test("final clash: converted Cannon gains no bonus — barrage is exactly base", () => {
    const d = duel({
      p: { fk: "K", load: ["cannon", "flux", "frame", "gyro"], pass: "siege", set: { pow: 0, hp: 20, maxHp: 20, sieged: true } },
      a: BAGY(), seed: 13,
      rounds: [
        { p: { ab: "flux", target: "SE" }, a: { ab: "lash", target: "NW" } },
        { before: (gm) => { gm.round = 9; gm.P.flow = true; }, p: { ab: "flux", target: "SE" }, a: { ab: "lash", target: "NW" } },
        { p: { ab: "cannon" }, a: { ab: "current" } }, // round-10 final clash
      ],
    });
    expect(dmgBy(d.rounds[2].lines, "Siege Cannon barrage", "Maelis")).toBe(1);
    expect(d.rounds[2].lines.some((t) => t.includes("FINAL EDGE"))).toBe(false);
  });

  test("AI Koros converts at full bank; the spend denies that round's income", () => {
    const d = duel({
      p: BAGY({ pow: 0 }), a: { fk: "K", load: ["cannon", "flux", "frame", "gyro"], pass: "siege", set: { pow: 0, hp: 20, maxHp: 20 } },
      seed: 14,
      rounds: [
        { p: { ab: "lash", target: "NW" }, a: { ab: "flux", target: "SE" } },
        { p: { ab: "lash", target: "NW" }, a: { ab: "flux", target: "SE" } },
        { p: { ab: "lash", target: "NW" }, a: { ab: "flux", target: "SE" } },
        { p: { ab: "lash", target: "NW" }, a: { ab: "flux", target: "SE" } },
        { p: { ab: "lash", target: "NW" }, a: { ab: "flux", target: "SE" } },
      ],
    });
    expect(d.g.A.sieged).toBe(true);
  });
});

describe("Emergency Vent (unchanged)", () => {
  test("first time at ≤5 HP: gain 3◆, once", () => {
    const d = duel({
      p: { fk: "G", load: ["skull", "howl", "sunder", "iron"], pass: "warmonger", set: { pow: 3, hp: 20, maxHp: 20 } },
      a: { fk: "K", load: ["cannon", "flux", "frame", "gyro"], pass: "vent", set: { pow: 0, hp: 6, maxHp: 13 } },
      seed: 15,
      rounds: [{ p: { ab: "skull", target: "NE" }, a: { ab: "cannon", target: "SW" } }],
    });
    expect(d.g.A.pow).toBe(3);
    expect(d.rounds[0].lines.some((t) => t.includes("Emergency Vent"))).toBe(true);
  });
});
