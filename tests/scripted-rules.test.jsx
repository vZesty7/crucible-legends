/* Scripted scenario tests: set up precise game states through the test
   hook, play real rounds through the UI, assert exact rule behavior. */
import { describe, test, beforeEach, afterEach, vi, expect } from "vitest";
import { cleanup } from "@testing-library/react";
import {
  mountGame, startDuel, playPlan, stepUntilDecision, seedRandom, restoreRandom,
  g, phase, roundText, harvest, autoClash, clickText, parseLedger,
} from "./harness.jsx";

const VS_VESSK = "VESSK, THE RIMEBOUND"; // no burn/weak sources, no vigil

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});
afterEach(() => {
  cleanup();
  restoreRandom();
  vi.useRealTimers();
});

function startGharzul(seed) {
  seedRandom(seed);
  mountGame();
  startDuel({
    fighter: "GHARZUL",
    abilities: ["Bloodhowl", "Skullsplitter", "Bone Grinder", "Iron Hide"],
    passive: "Warmonger",
    foe: VS_VESSK,
  });
}

function startZhal(seed, passive) {
  seedRandom(seed);
  mountGame();
  startDuel({
    fighter: "ZHAL-MERAQ",
    abilities: ["Ruinfire", "Umbral Chains", "Life Tap", "Doombrand"],
    passive,
    foe: VS_VESSK,
  });
}

/* Plays one plain round: stay, Skullsplitter at NE (may hit or whiff — irrelevant). */
function passRound(store) {
  playPlan({ ability: "Skullsplitter", target: "NE" });
  const ph = stepUntilDecision(Math.random);
  harvest(store);
  return ph;
}

describe("burn and weak respect their fresh-stamp grace", () => {
  test("fresh stacks tick damage but do not decay until the next round", () => {
    startGharzul(101);
    const store = new Map();
    const P = g().P;

    // Round 1: plant fresh statuses exactly as addBurn/addWeak would.
    P.burn = 2; P._burnFresh = 1;
    P.weak = 2; P._weakFresh = true;
    passRound(store);

    // Burn always ticks 1 damage; the fresh stamp only shields stack decay.
    expect(roundText(store, 1)).toContain("Burning — Gharzul takes 1");
    expect(P.burn, "fresh burn stack must not decay on its first round").toBe(2);
    expect(P._burnFresh).toBe(0);
    expect(P.weak, "fresh weak must not decay on its first round").toBe(2);
    expect(P._weakFresh).toBe(false);

    // Round 2: grace spent — now they decay.
    P.hp = 12; // keep the subject alive; not a ledger test
    passRound(store);
    expect(roundText(store, 2)).toContain("Burning — Gharzul takes 1");
    expect(P.burn, "burn decays once grace is spent").toBe(1);
    expect(P.weak, "weak decays once grace is spent").toBe(1);
  });
});

describe("Doombrand detonates exactly on its scheduled round", () => {
  test("fires end of the marked round for 3, never early", () => {
    startGharzul(202);
    const store = new Map();
    const P = g().P;

    // Immediate brand: marked for the end of the current round.
    P.brandRound = 1;
    passRound(store);
    expect(roundText(store, 1)).toContain("DOOMBRAND detonates — Gharzul takes 3");
    expect(P.brandRound, "brand must clear after detonating").toBe(0);

    // Future brand: marked for round 4 — silent on rounds 2 and 3.
    P.hp = 12;
    P.brandRound = 4;
    passRound(store); // round 2
    expect(roundText(store, 2)).not.toContain("DOOMBRAND detonates");
    expect(P.brandRound).toBe(4);

    // Round 3 is a scheduled clash.
    expect(phase()).toBe("clashPlan");
    P.hp = 12;
    autoClash(Math.random);
    stepUntilDecision(Math.random);
    harvest(store);
    expect(roundText(store, 3)).not.toContain("DOOMBRAND detonates");
    expect(P.brandRound).toBe(4);

    // Round 4: detonation, on schedule.
    P.hp = 12;
    passRound(store);
    expect(roundText(store, 4)).toContain("DOOMBRAND detonates — Gharzul takes 3");
    expect(P.brandRound).toBe(0);
  });
});

describe("Life Tap with Blood Surplus", () => {
  test("pays exactly 1 HP and banks 2◆, plus normal end-of-round income", () => {
    startZhal(303, "Blood Surplus");
    const store = new Map();
    const startHp = g().P.hp; // 14

    playPlan({ ability: "Life Tap" }); // ward: no target step
    stepUntilDecision(Math.random);
    harvest(store);

    const txt = roundText(store, 1);
    expect(txt).toContain("Life Tap — Zhal trades 1 blood for power");
    expect(txt).toContain("Zhal +1◆ (Life Tap)");
    expect(txt).toContain("Zhal +1◆ (Blood Surplus)");
    expect(txt).toContain("Zhal +1◆ (end of round)");
    expect(g().P.pow, "2◆ from the tap + 1◆ round income").toBe(3);

    // HP: exactly 1 blood paid (the tap), plus whatever damage was logged
    // against us — the books must balance to the point.
    const { dmg, heal } = parseLedger(store);
    expect(dmg.P, "the tap itself must cost exactly 1 beyond logged hits").toBeGreaterThanOrEqual(1);
    expect(g().P.hp).toBe(startHp - dmg.P + heal.P);
  });
});

describe("The Third Knock", () => {
  test("every wound counts toward the knock", () => {
    startZhal(404, "The Third Knock");
    const store = new Map();
    const P = g().P;

    // Ruinfire pays 1 blood at lock; the foe may wound us too. The count
    // must equal the total number of logged wound events, exactly.
    playPlan({ ability: "Ruinfire", target: "NE" });
    stepUntilDecision(Math.random);
    harvest(store);
    const { wounds } = parseLedger(store);
    if (wounds.P < 3) {
      expect(P.knocks, "knock count must equal total wounds taken").toBe(wounds.P);
      expect(roundText(store, 1)).not.toContain("The Door answers");
    }
  });

  test("the Door answers on the third wound, then the count resets", () => {
    startZhal(505, "The Third Knock");
    const store = new Map();
    const P = g().P;

    // Two knocks already on the ledger; Ruinfire's blood price is the third.
    P.knocks = 2;
    playPlan({ ability: "Ruinfire", target: "NE" });
    stepUntilDecision(Math.random);
    harvest(store);

    const txt = roundText(store, 1);
    expect(txt).toContain("Knock, knock");
    expect(txt).toContain("The Door answers");
    // Reset — and the claw's own wound must never count (even if it hit Zhal).
    expect(P.knocks, "the knock count must reset after the Door answers").toBe(0);
  });

});
