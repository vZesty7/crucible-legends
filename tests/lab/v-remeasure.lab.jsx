/* VESSK RE-MEASURE (v0.85 "The Ice Architect") — three stages:
   1. Vessk-only draft sweep (every legal build × passive, 40 games/foe)
      → refreshes his entry in sweep.json and builds.json.
   2. MID + MAX round-robins of Vessk's 11 pairings, both seats,
      500/seat (~1,000 per pairing per tier), with the HP ledger audited
      on every game and the rework's telemetry aggregated:
      shatter frequency, mirror counts, max-line assembly rate,
      elemental lifespan + removal-method distribution, extreme matchups.
   3. Build-split uptime: Blizzard Flow-uptime vs Permafrost zone-uptime. */
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

function legalBuildsV() {
  const { FIGHTERS, ABILITIES } = defs();
  const pool = FIGHTERS.V.pool, passes = FIGHTERS.V.passives;
  const builds = [];
  for (let i = 0; i < pool.length; i++)
    for (let j = i + 1; j < pool.length; j++)
      for (let k = j + 1; k < pool.length; k++)
        for (let l = k + 1; l < pool.length; l++) {
          const load = [pool[i], pool[j], pool[k], pool[l]];
          if (!load.some((id) => ABILITIES[id].cost === 0)) continue;
          for (const pass of passes) builds.push({ load, pass });
        }
  return builds;
}

test("stage 1 — Vessk draft sweep (v0.85 pool)", () => {
  const { FIGHTERS } = defs();
  const fks = Object.keys(FIGHTERS).filter((k) => k !== "V");
  const builds = legalBuildsV();
  const out = [];
  let seed = 85_000_000, games = 0;
  const t0 = Date.now();
  for (const build of builds) {
    let wins = 0, n = 0;
    for (const foe of fks) {
      for (let i = 0; i < 40; i++) {
        const rng = () => Math.random();
        const res = playGame({
          pFk: "V", pLoad: build.load, pPass: build.pass,
          aFk: foe, aLoad: FIGHTERS[foe].aiLoad, aPass: FIGHTERS[foe].aiPass,
          diff: "proving", pPolicy: makeAiPolicy(rng), aPolicy: makeAiPolicy(rng),
          seed: seed++,
        });
        if (res.winner === "P") wins++;
        n++; games++;
      }
    }
    out.push({ load: build.load, pass: build.pass, winrate: +(100 * wins / n).toFixed(1), n });
  }
  out.sort((a, b) => b.winrate - a.winrate);
  const sweep = JSON.parse(readFileSync("reports/data/sweep.json", "utf8"));
  sweep.V = out;
  writeFileSync("reports/data/sweep.json", JSON.stringify(sweep, null, 1));
  const builds2 = JSON.parse(readFileSync("reports/data/builds.json", "utf8"));
  builds2.best.V = { load: out[0].load, pass: out[0].pass };
  builds2.worst.V = { load: out[out.length - 1].load, pass: out[out.length - 1].pass };
  writeFileSync("reports/data/builds.json", JSON.stringify(builds2, null, 1));
  console.log(`V sweep: ${builds.length} builds, ${games} games, ${((Date.now() - t0) / 60000).toFixed(1)} min`);
  console.log("best:", JSON.stringify(out.slice(0, 5)));
  console.log("worst:", JSON.stringify(out.slice(-3)));
}, 3600000);

function runVesskTier({ name, vBuild, diff, seedBase, gamesPerSeat }) {
  const { FIGHTERS } = defs();
  const foes = Object.keys(FIGHTERS).filter((k) => k !== "V");
  const agg = {
    games: 0, wins: 0, rounds: 0, ko: 0, bell: 0, sudden: 0, alt: 0,
    shatters: 0, mirrors: 0, blizz: 0,
    icel: { born: 0, spent: 0, countered: 0, zonelost: 0, lifeSum: 0 },
    maxLineFlow: 0, maxLineCore: 0, roundsSeen: 0,
  };
  const matchups = {}; // foe -> vessk wins
  const violations = [];
  let seed = seedBase, crashed = 0;
  const t0 = Date.now();
  for (const foe of foes) {
    matchups[foe] = { w: 0, n: 0 };
    for (const vSeat of ["P", "A"]) {
      for (let n = 0; n < gamesPerSeat; n++) {
        const rng = () => Math.random();
        const [pFk, aFk] = vSeat === "P" ? ["V", foe] : [foe, "V"];
        const pb = pFk === "V" ? vBuild : { load: FIGHTERS[pFk].aiLoad, pass: FIGHTERS[pFk].aiPass };
        const ab = aFk === "V" ? vBuild : { load: FIGHTERS[aFk].aiLoad, pass: FIGHTERS[aFk].aiPass };
        let res;
        try {
          res = playGame({
            pFk, pLoad: pb.load, pPass: pb.pass, aFk, aLoad: ab.load, aPass: ab.pass,
            diff, pPolicy: makeAiPolicy(rng), aPolicy: makeAiPolicy(rng), seed: seed++,
          });
        } catch (e) { crashed++; if (violations.length < 30) violations.push(`crash V-${foe}: ${e.message}`); continue; }
        const v = ledgerViolation(res, pFk, aFk);
        if (v && violations.length < 30) violations.push(v);
        const vWon = res.winner === vSeat;
        agg.games++; agg.rounds += res.rounds;
        matchups[foe].n++;
        if (vWon) { agg.wins++; agg[res.winType]++; matchups[foe].w++; }
        agg.shatters += res.stats.shatter[vSeat];
        agg.mirrors += res.stats.icel.mirrors;
        agg.blizz += res.stats.blizz || 0;
        agg.icel.born += res.stats.icel.born;
        agg.icel.spent += res.stats.icel.spent;
        agg.icel.countered += res.stats.icel.countered;
        agg.icel.zonelost += res.stats.icel.zonelost;
        agg.icel.lifeSum += res.stats.icel.lifeSum;
        // max-line detection per archived round: Spike landed + both shatters + mirror (+ Flow)
        for (const h of res.history) {
          agg.roundsSeen++;
          const L = h.lines;
          const spike = L.some((t) => t.includes("Glacial Spike lands DIRECT"));
          const mirror = L.some((t) => t.includes("mirrored Glacial Spike"));
          const shats = L.filter((t) => t.includes("SHATTER — the chill breaks") || t.includes("elemental's blow spends the chill")).length;
          const flow = L.some((t) => t.includes("Flow — the strike lands"));
          if (spike && mirror && shats >= 2) { agg.maxLineCore++; if (flow) agg.maxLineFlow++; }
        }
      }
    }
    console.log(`${name} vs ${foe}: V ${matchups[foe].w}/${matchups[foe].n} (${(100 * matchups[foe].w / matchups[foe].n).toFixed(1)}%) — ${((Date.now() - t0) / 60000).toFixed(1)} min`);
  }
  const out = {
    winrate: +(100 * agg.wins / agg.games).toFixed(1),
    games: agg.games, crashed, violations,
    avgRounds: +(agg.rounds / agg.games).toFixed(2),
    winTypes: { ko: agg.ko, bell: agg.bell, sudden: agg.sudden, alt: agg.alt },
    shattersPerGame: +(agg.shatters / agg.games).toFixed(2),
    mirrorsPerGame: +(agg.mirrors / agg.games).toFixed(3),
    blizzPerGame: +(agg.blizz / agg.games).toFixed(2),
    icel: {
      bornPerGame: +(agg.icel.born / agg.games).toFixed(3),
      removalShare: (() => {
        const rem = agg.icel.spent + agg.icel.countered + agg.icel.zonelost;
        return rem ? { spent: +(100 * agg.icel.spent / rem).toFixed(1), countered: +(100 * agg.icel.countered / rem).toFixed(1), zonelost: +(100 * agg.icel.zonelost / rem).toFixed(1) } : null;
      })(),
      avgLifespanRounds: (agg.icel.spent + agg.icel.countered + agg.icel.zonelost) ? +(agg.icel.lifeSum / (agg.icel.spent + agg.icel.countered + agg.icel.zonelost)).toFixed(2) : null,
      survivorsPerGame: +((agg.icel.born - agg.icel.spent - agg.icel.countered - agg.icel.zonelost) / agg.games).toFixed(3),
    },
    maxLine: { corePerGame: +(agg.maxLineCore / agg.games).toFixed(4), withFlowPerGame: +(agg.maxLineFlow / agg.games).toFixed(4) },
    matchups: Object.fromEntries(Object.entries(matchups).map(([f, m]) => [f, +(100 * m.w / m.n).toFixed(1)])),
  };
  return out;
}

test("stage 2 — Vessk MID + MAX round-robins (1,000/pairing)", () => {
  const { FIGHTERS } = defs();
  const best = JSON.parse(readFileSync("reports/data/builds.json", "utf8")).best.V;
  const mid = runVesskTier({
    name: "V-MID", diff: "proving", seedBase: 86_000_000, gamesPerSeat: 500,
    vBuild: { load: FIGHTERS.V.aiLoad, pass: FIGHTERS.V.aiPass },
  });
  console.log("V MID:", JSON.stringify(mid, null, 1));
  const max = runVesskTier({
    name: "V-MAX", diff: "crucible", seedBase: 87_000_000, gamesPerSeat: 500,
    vBuild: best,
  });
  console.log("V MAX:", JSON.stringify(max, null, 1));
  mkdirSync("reports/data", { recursive: true });
  writeFileSync("reports/data/v085-remeasure.json", JSON.stringify({ mid, max, maxBuild: best }, null, 1));
}, 3600000);

test("stage 3 — Blizzard Flow-uptime vs Permafrost zone-uptime (build split)", () => {
  const { FIGHTERS } = defs();
  const foes = Object.keys(FIGHTERS).filter((k) => k !== "V");
  const measure = (pass, seedBase) => {
    let seed = seedBase;
    let checkpoints = 0, flowOn = 0, fzSum = 0, fz1 = 0, fz2 = 0, fz3 = 0, games = 0, wins = 0;
    for (const foe of foes) {
      for (let n = 0; n < 150; n++) {
        const rng = () => Math.random();
        const res = playGame({
          pFk: "V", pLoad: FIGHTERS.V.aiLoad, pPass: pass,
          aFk: foe, aLoad: FIGHTERS[foe].aiLoad, aPass: FIGHTERS[foe].aiPass,
          diff: "proving", pPolicy: makeAiPolicy(rng), aPolicy: makeAiPolicy(rng),
          seed: seed++, collectRounds: true,
        });
        games++; if (res.winner === "P") wins++;
        for (const tp of res.trajectory) {
          checkpoints++;
          if (tp.flowP) flowOn++;
          fzSum += tp.fz;
          if (tp.fz >= 1) fz1++; if (tp.fz >= 2) fz2++; if (tp.fz >= 3) fz3++;
        }
      }
    }
    return {
      pass, games, winrate: +(100 * wins / games).toFixed(1),
      flowUptimePct: +(100 * flowOn / checkpoints).toFixed(1),
      avgFrostZones: +(fzSum / checkpoints).toFixed(2),
      zoneUptimePct: { atLeast1: +(100 * fz1 / checkpoints).toFixed(1), atLeast2: +(100 * fz2 / checkpoints).toFixed(1), atLeast3: +(100 * fz3 / checkpoints).toFixed(1) },
    };
  };
  const blizz = measure("blizzard", 88_000_000);
  const perma = measure("permafrost", 89_000_000);
  console.log("BLIZZARD build:", JSON.stringify(blizz));
  console.log("PERMAFROST build:", JSON.stringify(perma));
  const cur = JSON.parse(readFileSync("reports/data/v085-remeasure.json", "utf8"));
  cur.uptime = { blizzard: blizz, permafrost: perma };
  writeFileSync("reports/data/v085-remeasure.json", JSON.stringify(cur, null, 1));
}, 3600000);
