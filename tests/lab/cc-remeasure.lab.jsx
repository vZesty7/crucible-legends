/* CLASS-CONFORMANCE RE-MEASURE (v0.86) — full MID round-robin for each
   CHANGED fighter (Wrenna, Kastor, Dhoram): standard aiLoad/aiPass builds,
   the PROVING brain, both seats, 500/seat (~1,000 per pairing, ~11,000 per
   fighter), HP ledger audited on every game. Compared against the v0.84
   baselines (tier-mid.json). */
import { test, beforeAll, vi } from "vitest";
import { boot, playGame, makeAiPolicy, defs } from "./runner.jsx";
import { writeFileSync, readFileSync, mkdirSync } from "fs";

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  boot();
});

const SHORT = { G: "Gharzul", M: "Maleth", V: "Vessk", C: "Ashkarra", K: "Koros", Z: "Zhal", L: "Kastor", O: "Marrow", D: "Dhoram", Y: "Maelis", W: "Wrenna", X: "Dregan" };

function ledgerViolation(res, pFk, aFk) {
  const all = res.history.flatMap((h) => h.lines);
  if (all.some((t) => t.includes("UNDYING VIGIL"))) return null;
  const nameP = SHORT[pFk], nameA = SHORT[aFk];
  const dmg = { [nameP]: 0, [nameA]: 0 }, heal = { [nameP]: 0, [nameA]: 0 };
  for (const t of all) {
    let m;
    if ((m = /.*— (\S+) takes (\d+)\.$/.exec(t))) { if (m[1] in dmg) dmg[m[1]] += +m[2]; }
    else if ((m = /(\S+) pays (\d+) blood\./.exec(t))) { if (m[1] in dmg) dmg[m[1]] += +m[2]; }
    else if ((m = /Life Tap — (\S+) trades 1 blood/.exec(t))) { if (m[1] in dmg) dmg[m[1]] += 1; }
    else if ((m = /(\S+) heals (\d+) \(/.exec(t))) { if (m[1] in heal) heal[m[1]] += +m[2]; }
  }
  const { FIGHTERS } = defs();
  const okP = FIGHTERS[pFk].hp - res.hpP === dmg[nameP] - heal[nameP];
  const okA = FIGHTERS[aFk].hp - res.hpA === dmg[nameA] - heal[nameA];
  return okP && okA ? null : `ledger ${pFk}v${aFk}`;
}

test("v0.86 MID round-robins: Wrenna, Kastor, Dhoram", () => {
  const { FIGHTERS } = defs();
  const CHANGED = ["W", "L", "D"];
  const out = {};
  const violations = [];
  let seed = 96_000_000;
  const t0 = Date.now();
  for (const fk of CHANGED) {
    const foes = Object.keys(FIGHTERS).filter((k) => k !== fk);
    const matchups = {};
    let wins = 0, games = 0, rounds = 0, crashed = 0;
    const wt = { ko: 0, bell: 0, sudden: 0, alt: 0 };
    for (const foe of foes) {
      matchups[foe] = { w: 0, n: 0 };
      for (const seat of ["P", "A"]) {
        for (let n = 0; n < 500; n++) {
          const rng = () => Math.random();
          const [pFk, aFk] = seat === "P" ? [fk, foe] : [foe, fk];
          let res;
          try {
            res = playGame({
              pFk, pLoad: FIGHTERS[pFk].aiLoad, pPass: FIGHTERS[pFk].aiPass,
              aFk, aLoad: FIGHTERS[aFk].aiLoad, aPass: FIGHTERS[aFk].aiPass,
              diff: "proving", pPolicy: makeAiPolicy(rng), aPolicy: makeAiPolicy(rng), seed: seed++,
            });
          } catch (e) { crashed++; if (violations.length < 30) violations.push(`crash ${fk}-${foe}: ${e.message}`); continue; }
          const v = ledgerViolation(res, pFk, aFk);
          if (v && violations.length < 30) violations.push(v);
          games++; rounds += res.rounds;
          matchups[foe].n++;
          if (res.winner === seat) { wins++; wt[res.winType]++; matchups[foe].w++; }
        }
      }
      console.log(`${fk} vs ${foe}: ${(100 * matchups[foe].w / matchups[foe].n).toFixed(1)}% (${((Date.now() - t0) / 60000).toFixed(1)} min)`);
    }
    out[fk] = {
      winrate: +(100 * wins / games).toFixed(1), games, crashed,
      avgRounds: +(rounds / games).toFixed(2), winTypes: wt,
      matchups: Object.fromEntries(Object.entries(matchups).map(([f, m]) => [f, +(100 * m.w / m.n).toFixed(1)])),
    };
  }
  const base = JSON.parse(readFileSync("reports/data/tier-mid.json", "utf8")).table;
  for (const fk of CHANGED) {
    out[fk].v084 = base[fk].winrate;
    out[fk].delta = +(out[fk].winrate - base[fk].winrate).toFixed(1);
    console.log(`${SHORT[fk]}: v0.84 ${base[fk].winrate} -> ${out[fk].winrate} (Δ${out[fk].delta})`);
  }
  out.violations = violations;
  mkdirSync("reports/data", { recursive: true });
  writeFileSync("reports/data/v086-conformance.json", JSON.stringify(out, null, 1));
}, 3600000);
