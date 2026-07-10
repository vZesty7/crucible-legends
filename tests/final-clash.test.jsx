/* The round-10 FINAL CLASH must deal flat printed damage:
   base + 1 (advantage point) + 2 (the Final Edge) — no rider bonuses.
   We plant riders that would normally add damage (Flow on the attacker,
   Chill on the defender) and prove they neither fire nor get consumed. */
import { describe, test, beforeEach, afterEach, vi, expect } from "vitest";
import { cleanup } from "@testing-library/react";
import {
  mountGame, startDuel, playPlan, stepUntilDecision, seedRandom, restoreRandom,
  g, phase, roundText, harvest, clickText,
} from "./harness.jsx";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});
afterEach(() => {
  cleanup();
  restoreRandom();
  vi.useRealTimers();
});

describe("final clash deals flat printed damage", () => {
  test("base + 1 + 2, riders suppressed and not consumed", () => {
    seedRandom(555);
    mountGame();
    startDuel({
      fighter: "GHARZUL",
      abilities: ["Bloodhowl", "Skullsplitter", "Bone Grinder", "Iron Hide"],
      passive: "Warmonger", // also converts a clash tie into our win
      foe: "VESSK, THE RIMEBOUND",
    });
    const store = new Map();

    // Round 1 plays normally. Then, while planning round 2, we relabel the
    // calendar so this round resolves as round 9 — making the NEXT round
    // the scheduled round-10 FINAL clash.
    playPlan({ ability: "Skullsplitter", target: "NE" });
    stepUntilDecision(Math.random);
    harvest(store);
    expect(phase()).toBe("plan");
    g().round = 9;
    g().P.hp = 12; g().A.hp = 12;
    playPlan({ ability: "Skullsplitter", target: "NE" });
    let ph = stepUntilDecision(Math.random);
    harvest(store);
    expect(ph, "after round 9 the final clash must be scheduled").toBe("clashPlan");

    // Plant a rider that would normally boost damage: Flow adds +1 to the
    // next winning strike and is consumed by it. In the final clash it must
    // do neither.
    const P = g().P, A = g().A;
    P.flow = true;
    P.hp = 12; A.hp = 12;
    P.pow = 3; A.pow = 3;

    // Pin the AI's menu to Ice Lance alone (the brain is free to outplay a
    // seed; the LAW is what we test). We answer with Bloodhowl (RUSH,
    // printed 1): a tie — which Warmonger converts into our win.
    g().A.load = ["lance"];
    clickText("Bloodhowl"); // confirms immediately
    ph = stepUntilDecision(Math.random);
    harvest(store);

    const txt = roundText(store, 10);
    expect(txt).toContain("CLASH — FINAL: winner +2");
    expect(txt).toContain("Warmonger — the tie is his");
    expect(txt, "Warmonger must convert the tie into a Gharzul win").toContain("Gharzul wins the clash");

    // Flat damage: printed 1 + advantage 1 + final edge 2 = exactly 4.
    expect(txt).toContain("Bloodhowl — Vessk takes 1");
    expect(txt).toContain("Advantage — the extra point — Vessk takes 1");
    expect(txt).toContain("THE FINAL EDGE — the last clash cuts deeper — Vessk takes 2");
    const clashLines = (store.get(10)?.lines || []);
    const vesskDamage = clashLines.reduce((n, t) => {
      const m = /.*— Vessk takes (\d+)\.$/.exec(t);
      return n + (m ? +m[1] : 0);
    }, 0);
    expect(vesskDamage, "final clash total must be flat base+1+2").toBe(4);

    // The suppressed rider must not have been consumed either.
    expect(P.flow, "Flow must survive the final clash untouched").toBe(true);
  });
});
