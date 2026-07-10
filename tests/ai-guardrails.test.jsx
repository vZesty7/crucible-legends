/* AI v2 GUARDRAIL — permanent: for every fighter, the new brain must pilot
   that fighter BETTER than the frozen legacy Proving brain does, measured
   against the same legacy-driven field of all 11 opponents (both seats).
   Mirrors are not used: ownerless Dominion and the single shared Kess make
   same-fighter matches artifact-ridden in ways impossible in real play. */
import { test, describe, beforeAll, vi, expect } from "vitest";
import { boot, playGame, makeAiPolicy, defs, restoreRandom } from "./lab/runner.jsx";
import { makeLegacyProvingPolicy } from "./lab/legacy-ai.jsx";

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  boot();
});

const N = 40; // per foe per seat per brain → 11×2×40 = 880 games per brain per fighter

function pilotWinrate(fk, mkPilot, seedBase) {
  const { FIGHTERS } = defs();
  let wins = 0, games = 0, seed = seedBase;
  for (const foe of Object.keys(FIGHTERS)) {
    if (foe === fk) continue;
    for (const pilotInP of [true, false]) {
      for (let i = 0; i < N; i++) {
        const rng = () => Math.random();
        const pilotPol = mkPilot(rng), fieldPol = makeLegacyProvingPolicy(rng);
        const res = playGame({
          pFk: pilotInP ? fk : foe, pLoad: FIGHTERS[pilotInP ? fk : foe].aiLoad, pPass: FIGHTERS[pilotInP ? fk : foe].aiPass,
          aFk: pilotInP ? foe : fk, aLoad: FIGHTERS[pilotInP ? foe : fk].aiLoad, aPass: FIGHTERS[pilotInP ? foe : fk].aiPass,
          diff: "proving",
          pPolicy: pilotInP ? pilotPol : fieldPol,
          aPolicy: pilotInP ? fieldPol : pilotPol,
          seed: seed++,
        });
        games++;
        if ((res.winner === "P") === pilotInP) wins++;
      }
    }
  }
  return 100 * wins / games;
}

describe("the new AI pilots every fighter better than the legacy Proving AI", () => {
  test("field-based head-to-head, 1,760 games per fighter, zero crashes", () => {
    const { FIGHTERS } = defs();
    const rows = [];
    let base = 90_000_000;
    for (const fk of Object.keys(FIGHTERS)) {
      const newRate = pilotWinrate(fk, makeAiPolicy, base); base += 10_000;
      const oldRate = pilotWinrate(fk, makeLegacyProvingPolicy, base); base += 10_000;
      rows.push(`${fk} new ${newRate.toFixed(1)} vs old ${oldRate.toFixed(1)}`);
      expect.soft(newRate, `${FIGHTERS[fk].short}: new brain (${newRate.toFixed(1)}%) must out-pilot the legacy brain (${oldRate.toFixed(1)}%)`).toBeGreaterThan(oldRate);
    }
    restoreRandom();
    console.log("pilot comparison:", rows.join(" · "));
  }, 1200000);
});
