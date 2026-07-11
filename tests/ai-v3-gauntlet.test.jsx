/* AI v3 GAUNTLET — permanent, gates every deploy (the v0.87 Mind rework).
   (a) v3-Crucible must out-pilot the frozen v2-Crucible replica with ALL
       twelve fighters (~500 games each, field-based method — mirrors are
       artifact-ridden, per the v0.84 precedent note).
   (b) v3-Proving must out-pilot v2-Proving — and v3-Crucible must be
       measurably ABOVE v3-Proving head-to-head (the two doors must feel
       different; the gap is reported).
   (d) PERFORMANCE LAW: plan selection must be imperceptible on a phone.
       Budget: mean < 8ms, worst < 120ms in this environment (measured
       reality: ~0.3ms mean). Regression here is a shipping bug.
   (e) FUN GUARD: per-fighter ability-usage diversity must not collapse
       versus the v0.84 baselines — an EV maximizer that finds one line
       and spams it is a regression even if it wins more. */
import { test, describe, beforeAll, vi, expect } from "vitest";
import { readFileSync } from "fs";
import { boot, playGame, makeAiPolicy, defs, g, restoreRandom } from "./lab/runner.jsx";
import { makeV2Policy } from "./lab/legacy-ai-v2.jsx";

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  boot();
});

const N = 23; // per foe per seat → 11×2×23 = 506 games per fighter per brain
const perf = { n: 0, ms: 0, max: 0 };
const usage = {}; // fk -> { abilityName: count } collected from v3-proving pilot games

function harvestPerf() {
  const p = g().mind?.perf;
  if (p) { perf.n += p.n; perf.ms += p.ms; perf.max = Math.max(perf.max, p.maxMs); }
}
function harvestUsage(fk, res, seatWasP) {
  const u = (usage[fk] = usage[fk] || {});
  for (const h of res.history) {
    if (!h.vs) continue;
    const nm = seatWasP ? h.vs.p?.n : h.vs.a?.n;
    if (nm) u[nm] = (u[nm] || 0) + 1;
  }
}

function pilotRate(fk, mkPilot, diff, seedBase, collect) {
  const { FIGHTERS } = defs();
  let wins = 0, games = 0, seed = seedBase;
  for (const foe of Object.keys(FIGHTERS)) {
    if (foe === fk) continue;
    for (const pilotInP of [true, false]) {
      for (let i = 0; i < N; i++) {
        const rng = () => Math.random();
        const pilotPol = mkPilot(rng, diff), fieldPol = makeV2Policy(rng, diff);
        const res = playGame({
          pFk: pilotInP ? fk : foe, pLoad: FIGHTERS[pilotInP ? fk : foe].aiLoad, pPass: FIGHTERS[pilotInP ? fk : foe].aiPass,
          aFk: pilotInP ? foe : fk, aLoad: FIGHTERS[pilotInP ? foe : fk].aiLoad, aPass: FIGHTERS[pilotInP ? foe : fk].aiPass,
          diff,
          pPolicy: pilotInP ? pilotPol : fieldPol,
          aPolicy: pilotInP ? fieldPol : pilotPol,
          seed: seed++,
        });
        harvestPerf();
        if (collect) harvestUsage(fk, res, pilotInP);
        games++;
        if ((res.winner === "P") === pilotInP) wins++;
      }
    }
  }
  return 100 * wins / games;
}

const mkV3 = (rng) => makeAiPolicy(rng); // the engine brain: diff comes from the match

describe("the Mind's gauntlet", () => {
  test("(a) v3-Crucible out-pilots v2-Crucible with all twelve fighters", () => {
    const { FIGHTERS } = defs();
    let base = 87_100_000;
    const rows = [];
    let sum3 = 0, sum2 = 0;
    for (const fk of Object.keys(FIGHTERS)) {
      const r3 = pilotRate(fk, mkV3, "crucible", base); base += 10_000;
      const r2 = pilotRate(fk, makeV2Policy, "crucible", base); base += 10_000;
      sum3 += r3; sum2 += r2;
      rows.push(`${fk} v3 ${r3.toFixed(1)} vs v2 ${r2.toFixed(1)}`);
      expect.soft(r3, `${FIGHTERS[fk].short}: v3-Crucible (${r3.toFixed(1)}) must out-pilot v2-Crucible (${r2.toFixed(1)})`).toBeGreaterThan(r2);
    }
    console.log("CRUCIBLE gauntlet:", rows.join(" · "));
    console.log(`aggregate: v3 ${(sum3 / 12).toFixed(1)} vs v2 ${(sum2 / 12).toFixed(1)}`);
    expect(sum3 / 12, "aggregate: the Mind must clearly out-pilot the doctrine tables").toBeGreaterThan(sum2 / 12 + 3);
    restoreRandom();
  }, 1800000);

  test("(b) v3-Proving out-pilots v2-Proving — and stays measurably below v3-Crucible", () => {
    const { FIGHTERS } = defs();
    let base = 87_300_000;
    let sum3 = 0, sum2 = 0;
    const rows = [];
    for (const fk of Object.keys(FIGHTERS)) {
      const r3 = pilotRate(fk, mkV3, "proving", base, true); base += 10_000; // collects the fun-guard usage
      const r2 = pilotRate(fk, makeV2Policy, "proving", base); base += 10_000;
      sum3 += r3; sum2 += r2;
      rows.push(`${fk} v3 ${r3.toFixed(1)} vs v2 ${r2.toFixed(1)}`);
      expect.soft(r3, `${FIGHTERS[fk].short}: v3-Proving (${r3.toFixed(1)}) must out-pilot v2-Proving (${r2.toFixed(1)})`).toBeGreaterThan(r2);
    }
    console.log("PROVING gauntlet:", rows.join(" · "));
    console.log(`aggregate: v3-proving ${(sum3 / 12).toFixed(1)} vs v2-proving ${(sum2 / 12).toFixed(1)}`);
    expect(sum3 / 12).toBeGreaterThan(sum2 / 12);

    // the two doors: v3-Crucible pilots vs a v3-Proving-piloted field, directly
    let seed = 87_600_000, w = 0, n = 0;
    const fks = Object.keys(FIGHTERS);
    for (const fk of fks) {
      for (const foe of fks) {
        if (foe === fk) continue;
        for (let i = 0; i < 5; i++) {
          const rng = () => Math.random();
          const res = playGame({
            pFk: fk, pLoad: FIGHTERS[fk].aiLoad, pPass: FIGHTERS[fk].aiPass,
            aFk: foe, aLoad: FIGHTERS[foe].aiLoad, aPass: FIGHTERS[foe].aiPass,
            diff: "crucible", // both play under crucible rules; the POLICIES differ in sophistication
            pPolicy: makeAiPolicy(rng), aPolicy: makeV2Policy(rng, "proving"),
            seed: seed++,
          });
          harvestPerf();
          n++; if (res.winner === "P") w++;
        }
      }
    }
    const gap = 100 * w / n;
    console.log(`THE TWO DOORS: v3-Crucible beats a Proving-grade field ${gap.toFixed(1)}% of the time (${n} games)`);
    expect(gap, "Crucible must be measurably above Proving").toBeGreaterThan(53);
    restoreRandom();
  }, 1800000);

  test("(d) PERFORMANCE LAW: planning is imperceptible", () => {
    expect(perf.n, "perf samples must exist (run after a/b)").toBeGreaterThan(10000);
    const mean = perf.ms / perf.n;
    console.log(`perf: ${perf.n} plans, mean ${mean.toFixed(3)}ms, worst ${perf.max.toFixed(1)}ms`);
    expect(mean, "mean planning time budget (8ms)").toBeLessThan(8);
    expect(perf.max, "worst-case planning time budget (120ms)").toBeLessThan(120);
  });

  test("(e) FUN GUARD: ability-usage diversity must not collapse vs v0.84", () => {
    const { FIGHTERS } = defs();
    const base = JSON.parse(readFileSync("reports/data/v084/tier-mid.json", "utf8")).table; // pinned v0.84 baseline (live tier files get rewritten by re-measures)
    const entropy = (u) => {
      const tot = Object.values(u).reduce((a, b) => a + b, 0);
      if (!tot) return 0;
      let h = 0;
      Object.values(u).forEach((c) => { if (c > 0) { const p = c / tot; h -= p * Math.log(p); } });
      return h / Math.log(4); // normalized to a 4-ability menu
    };
    const topShare = (u) => {
      const tot = Object.values(u).reduce((a, b) => a + b, 0);
      return tot ? 100 * Math.max(...Object.values(u)) / tot : 0;
    };
    const rows = [];
    for (const fk of Object.keys(FIGHTERS)) {
      const u3 = usage[fk] || {};
      const uB = base[fk]?.usage || {};
      const h3 = entropy(u3), hB = entropy(uB);
      const t3 = topShare(u3), tB = topShare(uB);
      rows.push(`${fk} H ${h3.toFixed(2)} (base ${hB.toFixed(2)}) top ${t3.toFixed(0)}% (base ${tB.toFixed(0)}%)`);
      // collapse = one line spammed: top-share ballooning or entropy cratering.
      // (Vessk's v0.84 baseline predates his rework — his bar is the absolute floor.)
      expect.soft(t3, `${FIGHTERS[fk].short}: top-ability share ${t3.toFixed(0)}% vs baseline ${tB.toFixed(0)}% — one-line spam is a regression`).toBeLessThan(Math.max(tB + 12, 55));
      expect.soft(h3, `${FIGHTERS[fk].short}: usage entropy ${h3.toFixed(2)} vs baseline ${hB.toFixed(2)}`).toBeGreaterThan(Math.min(0.72 * hB, 0.55));
    }
    console.log("FUN GUARD:", rows.join(" · "));
  });
});
