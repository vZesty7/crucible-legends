import { test, beforeAll, vi } from "vitest";
import { boot, playGame, makeAiPolicy } from "./runner.jsx";

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  boot();
});

test("what happens when AI Marrow starts at 0◆ with no free ability?", () => {
  const rng = () => Math.random();
  let crashed = null;
  try {
    const res = playGame({
      pFk: "G", pLoad: ["skull", "howl", "sunder", "iron"], pPass: "warmonger",
      aFk: "O", aLoad: ["stick", "knit", "eye", "sorrow"], aPass: "mdeep", // the FIXED aiLoad
      diff: "gauntlet",
      pPolicy: makeAiPolicy(rng), aPolicy: makeAiPolicy(rng),
      seed: 777,
    });
    console.log("game completed:", res.winner, res.winType, "rounds", res.rounds);
  } catch (e) {
    crashed = e.message;
    console.log("CRASHED:", e.message);
  }
});
