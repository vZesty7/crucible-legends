import { test, beforeAll, vi } from "vitest";
import { boot, playGame, makeAiPolicy } from "./runner.jsx";

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  boot();
});

test("30k-game memory/speed stress", () => {
  const rng = () => Math.random();
  const t0 = Date.now();
  let pWins = 0;
  for (let i = 0; i < 30000; i++) {
    const res = playGame({
      pFk: "G", pLoad: ["skull", "howl", "sunder", "iron"], pPass: "warmonger",
      aFk: "V", aLoad: ["lance", "hoar", "spike", "iceage"], aPass: "blizzard",
      diff: "proving",
      pPolicy: makeAiPolicy(rng), aPolicy: makeAiPolicy(rng),
      seed: 50000 + i,
    });
    if (res.winner === "P") pWins++;
    if (i % 10000 === 9999) {
      const mem = process.memoryUsage().heapUsed / 1048576;
      console.log(`${i + 1} games, heap ${mem.toFixed(0)}MB, ${((Date.now() - t0) / (i + 1)).toFixed(2)}ms/game`);
    }
  }
  console.log(`winrate P: ${(100 * pWins / 30000).toFixed(1)}%`);
}, 1800000);
