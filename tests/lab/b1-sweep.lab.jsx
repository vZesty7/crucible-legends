/* PHASE B stage 1 — full draft sweep: every legal build (4-of-6 draft × 3
   passives, must include a 0◆ ability) for all 12 fighters, played with the
   engine's own brain against the field's standard AI builds. */
import { test, beforeAll, vi } from "vitest";
import { boot, playGame, makeAiPolicy, defs } from "./runner.jsx";
import { writeFileSync, mkdirSync } from "fs";

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  boot();
});

const GAMES_PER_FOE = 40;

function legalBuilds(fk) {
  const { FIGHTERS, ABILITIES } = defs();
  const F = FIGHTERS[fk];
  const pool = F.pool, passes = F.passives;
  const builds = [];
  for (let i = 0; i < pool.length; i++)
    for (let j = i + 1; j < pool.length; j++)
      for (let k = j + 1; k < pool.length; k++)
        for (let l = k + 1; l < pool.length; l++) {
          const load = [pool[i], pool[j], pool[k], pool[l]];
          if (!load.some((id) => ABILITIES[id].cost === 0)) continue; // draft invariant
          for (const pass of passes) builds.push({ load, pass });
        }
  return builds;
}

test("full draft sweep", () => {
  const { FIGHTERS } = defs();
  const fks = Object.keys(FIGHTERS);
  const out = {};
  let seed = 1_000_000;
  const t0 = Date.now();
  let games = 0;
  for (const fk of fks) {
    const builds = legalBuilds(fk);
    out[fk] = [];
    for (const build of builds) {
      let wins = 0, n = 0;
      for (const foe of fks) {
        if (foe === fk) continue;
        for (let i = 0; i < GAMES_PER_FOE; i++) {
          const rng = () => Math.random();
          const res = playGame({
            pFk: fk, pLoad: build.load, pPass: build.pass,
            aFk: foe, aLoad: FIGHTERS[foe].aiLoad, aPass: FIGHTERS[foe].aiPass,
            diff: "gauntlet",
            pPolicy: makeAiPolicy(rng), aPolicy: makeAiPolicy(rng),
            seed: seed++,
          });
          if (res.winner === "P") wins++;
          n++; games++;
        }
      }
      out[fk].push({ load: build.load, pass: build.pass, winrate: +(100 * wins / n).toFixed(1), n });
    }
    out[fk].sort((a, b) => b.winrate - a.winrate);
    console.log(`${fk}: ${builds.length} legal builds, best ${out[fk][0].winrate}% [${out[fk][0].load}|${out[fk][0].pass}], worst ${out[fk][out[fk].length - 1].winrate}% [${out[fk][out[fk].length - 1].load}|${out[fk][out[fk].length - 1].pass}]`);
  }
  mkdirSync("reports/data", { recursive: true });
  writeFileSync("reports/data/sweep.json", JSON.stringify(out, null, 1));
  console.log(`sweep complete: ${games} games in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
}, 3600000);
