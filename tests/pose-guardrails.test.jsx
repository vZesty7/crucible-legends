/* THE DEATH BEAT GUARDRAILS — permanent, deploy-gating (Art Pass I;
   amended 2026-07-12 by designer ruling: EVERY ending is a death).
   The living board's end poses must obey the design-doc law:
   1. A true match-ending KO plays the death fall and lands in FALLEN.
   2. A bell-end loss ALSO plays the death fall into FALLEN — the Crucible
      keeps whoever loses (designer ruling 2026-07-12).
   3. UNDYING VIGIL (survive at 1) must NEVER trigger the death beat
      mid-match — it is not an ending.
   4. A new game always starts both fighters back at IDLE. */
import { describe, test, beforeEach, afterEach, vi, expect } from "vitest";
import { cleanup } from "@testing-library/react";
import {
  mountGame, startDuel, playPlan, stepUntilDecision, seedRandom, restoreRandom,
  g, phase, settle, clickText, harvest, roundText,
} from "./harness.jsx";

const VS_VESSK = "VESSK, THE RIMEBOUND"; // no burn sources, no vigil of his own
const poses = () => window.__CL_TEST__.api.getPoses();
const defs = () => window.__CL_TEST__.defs;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});
afterEach(() => {
  cleanup();
  restoreRandom();
  vi.useRealTimers();
});

test("a true KO lands the loser in FALLEN and the winner in VICTORIOUS", () => {
  seedRandom(9101);
  mountGame();
  startDuel({
    fighter: "GHARZUL",
    abilities: ["Bloodhowl", "Skullsplitter", "Bone Grinder", "Iron Hide"],
    passive: "Warmonger",
    foe: VS_VESSK,
  });
  // guarantee the KO: the foe dies to the end-of-round burn tick
  g().A.hp = 1; g().A.burn = 1; g().A._burnFresh = 1;
  playPlan({ ability: "Skullsplitter", target: "NE" });
  const ph = stepUntilDecision(Math.random);

  expect(ph).toBe("over");
  expect(g().winner).toBe("P");
  expect(g().A.hp).toBeLessThanOrEqual(0);
  // all timers drained: the 0.6s fall has completed
  expect(poses().A).toBe("fallen");
  expect(poses().P).toBe("victorious");

  // rematch resets the living board to IDLE
  clickText("Rematch");
  settle();
  expect(poses()).toEqual({ P: "idle", A: "idle" });
});

test("a bell-end loss plays the death fall into FALLEN (every ending is a death)", () => {
  seedRandom(9202);
  mountGame();
  startDuel({
    fighter: "GHARZUL",
    abilities: ["Bloodhowl", "Skullsplitter", "Bone Grinder", "Iron Hide"],
    passive: "Warmonger",
    foe: VS_VESSK,
  });
  // stage the final bell: behind on HP, alive, round 10
  g().round = 10; g().P.hp = 6; g().A.hp = 12;
  playPlan({ ability: "Skullsplitter", target: "NE" });
  const ph = stepUntilDecision(Math.random);

  expect(ph).toBe("over");
  expect(g().winner).toBe("A");
  expect(g().P.hp, "the bell decided it — HP never reached zero").toBeGreaterThan(0);
  expect(poses().P).toBe("fallen");
  expect(poses().A).toBe("victorious");
});

test("UNDYING VIGIL survives at 1 and never triggers the death beat", () => {
  seedRandom(9303);
  mountGame();
  const { FIGHTERS, ABILITIES } = defs();
  const names = FIGHTERS.L.aiLoad.map((id) => ABILITIES[id].name);
  startDuel({
    fighter: "KASTOR",
    abilities: names,
    passive: "Undying Vigil",
    foe: VS_VESSK,
  });
  const store = new Map();

  // stage the lethal moment: 1 HP with burn ticking at the bell
  g().P.hp = 1; g().P.burn = 1; g().P._burnFresh = 1;
  playPlan({ ability: ABILITIES.llance.name, target: "NE" });
  let ph = stepUntilDecision(Math.random);
  harvest(store);

  expect(roundText(store, 1)).toContain("UNDYING VIGIL");
  expect(ph, "vigil means the match is NOT over").toBe("plan");
  expect(g().P.vigilUsed).toBe(true);
  expect(g().P.hp).toBeGreaterThan(0);
  // every timer has drained — if the death beat had fired, FALLEN would show
  expect(poses().P).not.toBe("fallen");

  // now lose at the bell: the ENDING is a death for everyone — even the
  // vigil survivor falls when the match itself is lost (ruling 2026-07-12)
  g().round = 10; g().P.hp = 5; g().A.hp = 12;
  playPlan({ ability: ABILITIES.aegis.name });
  ph = stepUntilDecision(Math.random);

  expect(ph).toBe("over");
  expect(g().winner).toBe("A");
  expect(g().P.hp).toBeGreaterThan(0);
  expect(poses().P).toBe("fallen");
});
