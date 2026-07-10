/* PHASE 5 stage 1 — class doctrine audit (report only) + Koros build sweep
   to choose his new default loadout under the reworked kit. */
import { test, beforeAll, vi } from "vitest";
import { boot, playGame, makeAiPolicy, defs } from "./runner.jsx";
import { writeFileSync, mkdirSync } from "fs";

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  boot();
});

test("class doctrine tabulation", () => {
  const { FIGHTERS, ABILITIES } = defs();
  const CLASSES = { G: "Ravager", Z: "Ravager", C: "Ravager", M: "Duelist", W: "Duelist", X: "Duelist", L: "Champion", K: "Champion", D: "Champion", V: "Shaper", O: "Shaper", Y: "Shaper" };
  const rows = {};
  for (const fk of Object.keys(FIGHTERS)) {
    const pool = FIGHTERS[fk].pool;
    const byType = { rush: [], break: [], ward: [] };
    for (const id of pool) byType[ABILITIES[id].type].push(`${ABILITIES[id].name} ${ABILITIES[id].cost}◆${ABILITIES[id].hpCost ? "+" + ABILITIES[id].hpCost + "hp" : ""}`);
    rows[fk] = { cls: CLASSES[fk], rush: byType.rush, brk: byType.break, ward: byType.ward,
      census: `${byType.rush.length}R/${byType.break.length}B/${byType.ward.length}W` };
  }
  mkdirSync("reports/data", { recursive: true });
  writeFileSync("reports/data/class-audit.json", JSON.stringify(rows, null, 1));
  for (const [fk, r] of Object.entries(rows)) console.log(`${r.cls.padEnd(8)} ${FIGHTERS[fk].short.padEnd(9)} ${r.census}  | R: ${r.rush.join(", ")} | B: ${r.brk.join(", ")} | W: ${r.ward.join(", ")}`);
});

test("Koros build sweep under the new kit", () => {
  const { FIGHTERS, ABILITIES } = defs();
  const pool = FIGHTERS.K.pool, passes = FIGHTERS.K.passives;
  const builds = [];
  for (let i = 0; i < pool.length; i++)
    for (let j = i + 1; j < pool.length; j++)
      for (let k = j + 1; k < pool.length; k++)
        for (let l = k + 1; l < pool.length; l++) {
          const load = [pool[i], pool[j], pool[k], pool[l]];
          if (!load.some((id) => ABILITIES[id].cost === 0)) continue;
          for (const pass of passes) builds.push({ load, pass });
        }
  const fks = Object.keys(FIGHTERS).filter((f) => f !== "K");
  let seed = 40_000_000;
  const out = [];
  for (const b of builds) {
    let wins = 0, n = 0;
    for (const foe of fks) {
      for (let i = 0; i < 60; i++) {
        const rng = () => Math.random();
        const res = playGame({
          pFk: "K", pLoad: b.load, pPass: b.pass,
          aFk: foe, aLoad: FIGHTERS[foe].aiLoad, aPass: FIGHTERS[foe].aiPass,
          diff: "proving", pPolicy: makeAiPolicy(rng), aPolicy: makeAiPolicy(rng), seed: seed++,
        });
        if (res.winner === "P") wins++; n++;
      }
    }
    out.push({ ...b, winrate: +(100 * wins / n).toFixed(1) });
  }
  out.sort((a, b) => b.winrate - a.winrate);
  writeFileSync("reports/data/koros-sweep.json", JSON.stringify(out, null, 1));
  const best = out[0];
  const bestBeam = out.find((b) => b.load.includes("core"));
  console.log(`KOROS best overall: ${best.winrate}% [${best.load}|${best.pass}]`);
  console.log(`KOROS best with Beam: ${bestBeam.winrate}% [${bestBeam.load}|${bestBeam.pass}] (gap ${(best.winrate - bestBeam.winrate).toFixed(1)})`);
}, 1800000);
