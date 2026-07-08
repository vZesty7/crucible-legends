/* Full-game simulations: play complete games through the real UI and
   assert engine-wide invariants every round. */
import { describe, test, beforeEach, afterEach, vi, expect } from "vitest";
import { cleanup } from "@testing-library/react";
import {
  mountGame, startDuel, playFullGame, seedRandom, restoreRandom,
  assertIncomeEveryRound, assertLedgerBalances, g, phase,
} from "./harness.jsx";

const GHARZUL_KIT = {
  fighter: "GHARZUL",
  abilities: ["Bloodhowl", "Skullsplitter", "Bone Grinder", "Iron Hide"],
  passive: "Warmonger",
};

// Kastor excluded: his Undying Vigil restores HP without a ledger entry.
const MATCHES = [
  { foe: "VESSK, THE RIMEBOUND", seed: 7 },
  { foe: "ASHKARRA CINDERFIST", seed: 21 },
  { foe: "ZHAL-MERAQ OF THE OPEN DOOR", seed: 42 },
  { foe: "MAELIS THE RIPTIDE", seed: 63 },
  { foe: "KOROS, THE WARCASTER", seed: 84 },
  { foe: "WRENNA VAIL & KESS", seed: 105 },
  { foe: "DHORAM THE UNMOVED", seed: 126 },
];

describe("full-game simulations", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  });
  afterEach(() => {
    cleanup();
    restoreRandom();
    vi.useRealTimers();
  });

  test.each(MATCHES)("Gharzul vs $foe (seed $seed): income + ledger hold", ({ foe, seed }) => {
    seedRandom(seed);
    mountGame();
    startDuel({ ...GHARZUL_KIT, foe });
    const startHp = { P: g().P.hp, A: g().A.hp };
    const rng = Math.random;
    const store = playFullGame(rng);
    expect(phase()).toBe("over");
    expect(g().winner).toBeTruthy();
    assertIncomeEveryRound(store);
    assertLedgerBalances(store, startHp);
  });
});
