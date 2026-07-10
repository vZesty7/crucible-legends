import { test, expect, beforeAll, vi } from "vitest";
import { boot, playGame, makeAiPolicy, makeRandomPolicy, checkInvariants, g, seedRandom, restoreRandom } from "./runner.jsx";

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  boot();
});

test("one full game runs and ends sanely", () => {
  const rng = () => Math.random();
  const res = playGame({
    pFk: "G", pLoad: ["skull", "howl", "sunder", "iron"], pPass: "warmonger",
    aFk: "V", aLoad: ["lance", "hoar", "spike", "aval"], aPass: "shatter",
    diff: "proving",
    pPolicy: makeAiPolicy(rng), aPolicy: makeAiPolicy(rng),
    seed: 1234, collectRounds: true,
  });
  expect(["P", "A"]).toContain(res.winner);
  expect(res.rounds).toBeGreaterThanOrEqual(1);
  expect(res.rounds).toBeLessThanOrEqual(10);
  expect(res.history.length).toBeGreaterThan(0);
  const issues = checkInvariants(res, { pFk: "G", aFk: "V" });
  console.log("winner:", res.winner, "type:", res.winType, "rounds:", res.rounds, "hp:", res.hpP, res.hpA);
  console.log("invariant issues:", JSON.stringify(issues));
});

test("speed benchmark: 100 games", () => {
  const rng = () => Math.random();
  const t0 = Date.now();
  let pWins = 0;
  const counts = { ko: 0, bell: 0, sudden: 0, alt: 0 };
  for (let i = 0; i < 100; i++) {
    const res = playGame({
      pFk: "G", pLoad: ["skull", "howl", "sunder", "iron"], pPass: "warmonger",
      aFk: "V", aLoad: ["lance", "hoar", "spike", "aval"], aPass: "shatter",
      diff: "proving",
      pPolicy: makeAiPolicy(rng), aPolicy: makeAiPolicy(rng),
      seed: 5000 + i,
    });
    if (res.winner === "P") pWins++;
    counts[res.winType]++;
  }
  const ms = Date.now() - t0;
  console.log(`100 games in ${ms}ms (${(ms / 100).toFixed(1)}ms/game) — P winrate ${pWins}%, types ${JSON.stringify(counts)}`);
  expect(pWins).toBeGreaterThan(0);
  expect(pWins).toBeLessThan(100);
}, 120000);

test("random policy also completes games", () => {
  const rng = () => Math.random();
  for (let i = 0; i < 20; i++) {
    const res = playGame({
      pFk: "Y", pLoad: ["lash", "current", "whirlA", "storm"], pPass: "undertow",
      aFk: "D", aLoad: ["grind", "claim", "quake", "mount"], aPass: "home",
      diff: "proving",
      pPolicy: makeRandomPolicy(() => Math.random()), aPolicy: makeRandomPolicy(() => Math.random()),
      seed: 9000 + i,
    });
    expect(["P", "A"]).toContain(res.winner);
  }
});
