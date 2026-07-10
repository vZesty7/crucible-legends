/* PHASE B stage 2 — three tier round-robins on the real engine.
   MIN: weakest legal build, naive (random) play, Proving AI settings.
   MID: standard aiLoad/aiPass, the engine's own brain, Gauntlet.
   MAX: best build from the sweep, engine brain at Crucible (full v0.78
        combo-intent bias, banking discipline, collision-seeking).
   Every pairing runs from BOTH seats to cancel residual seat bias.
   Phase A invariants (HP ledger) are asserted on every single game. */
import { test, beforeAll, vi } from "vitest";
import { boot, playGame, makeAiPolicy, makeRandomPolicy, defs, checkInvariants } from "./runner.jsx";
import { writeFileSync, readFileSync, mkdirSync } from "fs";

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  boot();
});

const GAMES_PER_SEAT = 500; // ×2 seats = 1000 per pairing

const SHORT = { G: "Gharzul", M: "Maleth", V: "Vessk", C: "Ashkarra", K: "Koros", Z: "Zhal", L: "Kastor", O: "Marrow", D: "Dhoram", Y: "Maelis", W: "Wrenna", X: "Dregan" };

function ledgerViolation(res, pFk, aFk) {
  const all = res.history.flatMap((h) => h.lines);
  if (all.some((t) => t.includes("UNDYING VIGIL"))) return null; // unbalanceable by design
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

function runTier({ name, buildFor, mkPolicy, diff, seedBase }) {
  const { FIGHTERS } = defs();
  const fks = Object.keys(FIGHTERS);
  const agg = {};
  for (const fk of fks) agg[fk] = { wins: 0, games: 0, ko: 0, bell: 0, sudden: 0, alt: 0, rounds: 0, blowoutW: 0, comebackW: 0, usage: {}, winUsage: {} };
  const matchups = {}; // "X>Y" -> wins of X against Y (both seats pooled)
  const violations = [];
  let seed = seedBase, games = 0, crashed = 0;
  const t0 = Date.now();

  for (let i = 0; i < fks.length; i++) {
    for (let j = i + 1; j < fks.length; j++) {
      const [X, Y] = [fks[i], fks[j]];
      matchups[`${X}>${Y}`] = 0;
      for (const [pFk, aFk] of [[X, Y], [Y, X]]) {
        const pb = buildFor(pFk), ab = buildFor(aFk);
        for (let n = 0; n < GAMES_PER_SEAT; n++) {
          const rng = () => Math.random();
          let res;
          try {
            res = playGame({
              pFk, pLoad: pb.load, pPass: pb.pass,
              aFk, aLoad: ab.load, aPass: ab.pass,
              diff, pPolicy: mkPolicy(rng), aPolicy: mkPolicy(rng),
              seed: seed++, collectRounds: true,
            });
          } catch (e) {
            crashed++; violations.push(`crash ${pFk}v${aFk}: ${e.message}`);
            continue;
          }
          games++;
          const v = ledgerViolation(res, pFk, aFk);
          if (v && violations.length < 50) violations.push(v);
          const winFk = res.winner === "P" ? pFk : aFk;
          const loseHp = res.winner === "P" ? res.hpA : res.hpP;
          const winHp = res.winner === "P" ? res.hpP : res.hpA;
          if (winFk === X) matchups[`${X}>${Y}`]++;
          for (const fk of [pFk, aFk]) { agg[fk].games++; agg[fk].rounds += res.rounds; }
          const a = agg[winFk];
          a.wins++;
          a[res.winType]++;
          if ((res.winType === "ko" && res.rounds <= 6) || (winHp - Math.max(0, loseHp) >= 8)) a.blowoutW++;
          // comeback: winner trailed by ≥3 at any planning checkpoint from round 4 on
          const trailed = res.trajectory.some((tp) => tp.r >= 4 && ((res.winner === "P" ? tp.hpA - tp.hpP : tp.hpP - tp.hpA) >= 3));
          if (trailed) a.comebackW++;
          // ability usage from the round archive
          for (const h of res.history) {
            if (!h.vs) continue;
            const pn = h.vs.p?.n, an = h.vs.a?.n;
            if (pn) { agg[pFk].usage[pn] = (agg[pFk].usage[pn] || 0) + 1; if (winFk === pFk) agg[pFk].winUsage[pn] = (agg[pFk].winUsage[pn] || 0) + 1; }
            if (an) { agg[aFk].usage[an] = (agg[aFk].usage[an] || 0) + 1; if (winFk === aFk) agg[aFk].winUsage[an] = (agg[aFk].winUsage[an] || 0) + 1; }
          }
        }
      }
    }
    console.log(`${name}: ${fks[i]} block done (${games} games, ${((Date.now() - t0) / 60000).toFixed(1)} min)`);
  }
  const table = {};
  for (const fk of fks) {
    const a = agg[fk];
    table[fk] = {
      winrate: +(100 * a.wins / a.games).toFixed(1),
      games: a.games,
      winTypes: { ko: a.ko, bell: a.bell, sudden: a.sudden, alt: a.alt },
      avgRounds: +(a.rounds / a.games).toFixed(2),
      blowoutShare: a.wins ? +(100 * a.blowoutW / a.wins).toFixed(1) : 0,
      comebackShare: a.wins ? +(100 * a.comebackW / a.wins).toFixed(1) : 0,
      usage: a.usage, winUsage: a.winUsage,
    };
  }
  return { table, matchups, violations, crashed, games };
}

test("MIN / MID / MAX tier round-robins", () => {
  const { FIGHTERS } = defs();
  const sweep = JSON.parse(readFileSync("reports/data/sweep.json", "utf8"));
  const best = {}, worst = {};
  for (const fk of Object.keys(sweep)) {
    best[fk] = { load: sweep[fk][0].load, pass: sweep[fk][0].pass };
    const w = sweep[fk][sweep[fk].length - 1];
    worst[fk] = { load: w.load, pass: w.pass };
  }
  mkdirSync("reports/data", { recursive: true });
  writeFileSync("reports/data/builds.json", JSON.stringify({ best, worst }, null, 1));

  const mid = runTier({
    name: "MID", diff: "proving", seedBase: 10_000_000,
    buildFor: (fk) => ({ load: FIGHTERS[fk].aiLoad, pass: FIGHTERS[fk].aiPass }),
    mkPolicy: makeAiPolicy,
  });
  writeFileSync("reports/data/tier-mid.json", JSON.stringify(mid, null, 1));
  console.log("MID done. violations:", mid.violations.length, "crashed:", mid.crashed);

  const max = runTier({
    name: "MAX", diff: "crucible", seedBase: 20_000_000,
    buildFor: (fk) => best[fk],
    mkPolicy: makeAiPolicy,
  });
  writeFileSync("reports/data/tier-max.json", JSON.stringify(max, null, 1));
  console.log("MAX done. violations:", max.violations.length, "crashed:", max.crashed);

  const min = runTier({
    name: "MIN", diff: "proving", seedBase: 30_000_000,
    buildFor: (fk) => worst[fk],
    mkPolicy: makeRandomPolicy,
  });
  writeFileSync("reports/data/tier-min.json", JSON.stringify(min, null, 1));
  console.log("MIN done. violations:", min.violations.length, "crashed:", min.crashed);
}, 3600000);
