/* ART PASS II — the engine-vs-presentation seam (permanent, deploy-gating).
   The theater is presentation only: the same seeded game must produce the
   identical outcome whether the round theater plays out, is skipped
   mid-round, or runs in instant mode. Any theater code that leaks into
   engine state (or consumes the seeded RNG stream) fails this test. */
import { test, expect, beforeEach, afterEach, vi } from "vitest";
import { cleanup, act } from "@testing-library/react";
import {
  mountGame, startDuel, playPlan, stepUntilDecision, seedRandom, restoreRandom,
  g, phase, settle,
} from "./harness.jsx";

const api = () => window.__CL_TEST__.api;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});
afterEach(() => {
  cleanup();
  restoreRandom();
  vi.useRealTimers();
  try { localStorage.removeItem("cl_speed"); } catch {}
});

/* Play up to 4 rounds of a fixed seeded duel and fingerprint the state.
   mode: "theater" lets every timer drain; "skip" calls skipPlay the moment
   the theater starts; "instant" sets the persisted speed before mount. */
function runGame(seed, mode) {
  if (mode === "instant") localStorage.setItem("cl_speed", "instant");
  seedRandom(seed);
  mountGame();
  startDuel({
    fighter: "GHARZUL",
    abilities: ["Bloodhowl", "Skullsplitter", "Bone Grinder", "Iron Hide"],
    passive: "Warmonger",
    foe: "VESSK, THE RIMEBOUND",
  });
  for (let r = 0; r < 4 && phase() === "plan"; r++) {
    playPlan({ ability: "Skullsplitter", target: "NE" });
    if (mode === "skip") {
      // let the first beats land, then cut the theater mid-round
      act(() => { vi.advanceTimersByTime(900); });
      act(() => { api().skipPlay(); });
    }
    const ph = stepUntilDecision(() => 0.5);
    if (ph !== "plan") break;
  }
  const st = g();
  const print = {
    round: st.round,
    phase: st.phase,
    pHp: st.P.hp,
    aHp: st.A.hp,
    pPow: st.P.pow,
    aPow: st.A.pow,
    winner: st.winner || null,
    feed: st.history.map((h) => h.lines.join("|")).join("~"),
  };
  cleanup();
  return print;
}

test("theater on, skipped mid-round, and instant are outcome-identical", () => {
  const theater = runGame(4242, "theater");
  const skipped = runGame(4242, "skip");
  const instant = runGame(4242, "instant");
  expect(skipped).toEqual(theater);
  expect(instant).toEqual(theater);
});

test("a second seed agrees (guard against coincidence)", () => {
  const theater = runGame(1717, "theater");
  const instant = runGame(1717, "instant");
  expect(instant).toEqual(theater);
});
