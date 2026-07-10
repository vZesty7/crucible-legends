/* Lab runner: drives the REAL engine at maximum speed without rendering.
   Boots the App once to capture the engine closures through the test hook,
   then unmounts — React state updates become harmless no-ops while all game
   logic (which lives on refs) keeps working. Games then run through direct
   api calls with fake timers flushed after every action. */
import React from "react";
import { render, act } from "@testing-library/react";
import { vi } from "vitest";
import App from "../../src/App.jsx";

let hook = null;

export function boot() {
  if (hook) return hook;
  window.__CL_TEST_HOOK__ = true;
  window.__CL_LAB__ = true; // App renders null; engine closures stay live
  render(<App />);
  hook = window.__CL_TEST__;
  if (!hook?.api?.startGame) throw new Error("test hook did not expose the api");
  return hook;
}

export const g = () => window.__CL_TEST__.G.current;
export const api = () => window.__CL_TEST__.api;
export const defs = () => window.__CL_TEST__.defs;

/* ---- deterministic RNG ---- */
const realRandom = Math.random;
export function seedRandom(seed) {
  let s = seed >>> 0;
  Math.random = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
export function restoreRandom() {
  Math.random = realRandom;
}

export function flush() {
  // Drain every scheduled pacing/animation timer. Chains reschedule, so loop.
  for (let i = 0; i < 500; i++) {
    if (vi.getTimerCount() === 0) return;
    vi.runOnlyPendingTimers();
  }
  throw new Error("flush: timers never drained");
}

/* ---- policies ----
   A policy answers every decision the engine can pose. `who` is "P" or "A". */
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

export function makeRandomPolicy(rng) {
  const { ABILITIES, QUADS, ADJ } = defs();
  const afford = (me, id) => me.pow >= ABILITIES[id].cost;
  return {
    name: "random",
    plan(gm, me) {
      const ids = me.load.filter((id) => afford(me, id));
      const ab = pick(rng, ids.length ? ids : me.load);
      const A = ABILITIES[ab];
      const plan = {
        ab, soft: false, form: A.dual ? pick(rng, Object.keys(A.dual)) : null,
        moveTo: me.rooted ? me.pos : pick(rng, [me.pos, ...ADJ[me.pos]]),
        target: null, splash: null, secondary: null,
      };
      if (A.needsTarget) {
        plan.target = pick(rng, QUADS);
        if (A.needsSplash) plan.splash = pick(rng, ADJ[plan.target]);
        if (A.needsSecondary) plan.secondary = pick(rng, QUADS.filter((q) => q !== plan.target));
      }
      return plan;
    },
    clash(gm, me) {
      const ids = me.load.filter((id) => afford(me, id));
      const ab = pick(rng, ids.length ? ids : me.load);
      const A = ABILITIES[ab];
      return { ab, soft: false, form: A.dual ? pick(rng, Object.keys(A.dual)) : null };
    },
    umbralMove(gm, me, foePlan) {
      return pick(rng, [me.pos, ...ADJ[me.pos]]);
    },
    pivot() { return null; }, // never pivots
    prompt(gm, p) { return pick(rng, p.opts); },
    craven() { return false; },
    sudden() { return pick(rng, ["break", "rush", "ward"]); },
  };
}

/* The engine's own brain, used for both sides. Match difficulty (set at
   startGame) controls how sharp it is: proving / crucible —
   crucible engages the v0.78 combo-intent table at full strength. */
export function makeAiPolicy(rng) {
  const { ABILITIES, ADJ, BEATS } = defs();
  const rank = (myT, foeT) => (BEATS[myT] === foeT ? 2 : myT === foeT ? 1 : 0);
  return {
    name: "engine-ai",
    plan(gm, me) {
      const foe = me === gm.P ? gm.A : gm.P;
      return api().aiMakePlan(me, foe, false, null);
    },
    planUmbral(gm, me, foePlan) {
      const foe = me === gm.P ? gm.A : gm.P;
      return api().aiMakePlan(me, foe, false, foePlan);
    },
    clash(gm, me) {
      const foe = me === gm.P ? gm.A : gm.P;
      return api().aiMakePlan(me, foe, true, null);
    },
    umbralMove(gm, me, foePlan) {
      const dodge = [me.pos, ...ADJ[me.pos]].filter((q) => q !== foePlan?.target);
      return dodge.length ? pick(rng, dodge) : me.pos;
    },
    pivot(gm, me, myPlan, foePlan) {
      const ab = ABILITIES[myPlan.ab];
      if (!ab.pivot || me.pow < ab.cost + 1) return null;
      const foeT = foePlan.form || ABILITIES[foePlan.ab].type;
      const cur = myPlan.form || ab.type;
      return rank(ab.pivot, foeT) > rank(cur, foeT) ? ab.pivot : null;
    },
    prompt(gm, p) {
      // mirror of the engine's aiPickOpt, actor-agnostic
      const me = gm.P.fk === p.who ? gm.P : gm.A;
      const v = me === gm.P ? gm.A : gm.P;
      if (p.kind === "kb" || p.kind === "placeFoe") {
        if (me.fk === "G" && me.pass === "scent" && p.opts.includes(v.pos) && me.pos === v.pos) return v.pos;
        const hazard = p.opts.find((q) => q !== v.pos && ["frost", "scorch", "env", "mire", "whirl", "surf"].includes(gm.terrain[q]?.kind));
        if (hazard) return hazard;
        const moves = p.opts.filter((q) => q !== v.pos);
        return moves.length ? pick(rng, moves) : pick(rng, p.opts);
      }
      return pick(rng, p.opts);
    },
    craven(gm, me) {
      const foe = me === gm.P ? gm.A : gm.P;
      return me.hp < foe.hp;
    },
    sudden() { return pick(rng, ["break", "rush", "ward"]); },
  };
}

/* ---- one full game ----
   pPolicy drives P, aPolicy drives A (both plans built here, mirroring
   confirmPlan's orchestration exactly, then fed to the real resolveRound). */
export function playGame(opts) {
  // act() flushes React's (null-rendering) update queue per game — keeps
  // memory flat across hundreds of thousands of games.
  let result;
  act(() => { result = playGameInner(opts); });
  return result;
}

function playGameInner({ pFk, pLoad, pPass, aFk, aLoad, aPass, diff = "proving", pPolicy, aPolicy, seed, collectRounds = false }) {
  const { ABILITIES } = defs();
  seedRandom(seed);
  vi.clearAllTimers();
  api().clearTimers(); // empty the engine's timer-handle list — it grows forever otherwise
  api().startGame({ pFk, pLoad, pPass, aiFk: aFk, aiLoad: aLoad, aiPass: aPass, diff });
  flush(); // vs splash timer → beginBout → round 1 plan
  const gm = () => g();
  const rounds = [];
  let suddenThrows = 0;

  const buildPlans = () => {
    const gmc = gm();
    let pPlan = pPolicy.plan(gmc, gmc.P);
    let aPlan;
    const pAb = ABILITIES[pPlan.ab];
    if (pAb.umbral) {
      aPlan = aPolicy.plan(gmc, gmc.A);
      if (ABILITIES[aPlan.ab].umbral) aPlan = (aPolicy.planUmbral || aPolicy.plan)(gmc, gmc.A, pPlan);
      pPlan.moveTo = pPolicy.umbralMove(gmc, gmc.P, aPlan);
    } else {
      aPlan = aPolicy.plan(gmc, gmc.A);
      if (ABILITIES[aPlan.ab].umbral) aPlan = (aPolicy.planUmbral || aPolicy.plan)(gmc, gmc.A, pPlan);
    }
    // after-reveal pivots, both sides (each sees the other's committed plan)
    if (pAb.pivot && pPolicy.pivot) {
      const f = pPolicy.pivot(gmc, gmc.P, pPlan, aPlan);
      if (f) { pPlan = { ...pPlan, form: f, pivoted: true }; }
    }
    aPlan = api().aiPivot(aPlan, pPlan.form || ABILITIES[pPlan.ab].type);
    aPlan = api().applyToll(aPlan, pPlan);
    return [pPlan, aPlan];
  };

  for (let step = 0; step < 400; step++) {
    const gmc = gm();
    switch (gmc.phase) {
      case "plan": {
        if (collectRounds) rounds.push({ r: gmc.round, hpP: gmc.P.hp, hpA: gmc.A.hp, powP: gmc.P.pow, powA: gmc.A.pow, flowP: !!gmc.P.flow, flowA: !!gmc.A.flow, fz: ["NW", "NE", "SW", "SE"].filter((q) => gmc.terrain[q]?.kind === "frost").length, els: Object.keys(gmc.icels || {}).length });
        const [pPlan, aPlan] = buildPlans();
        api().resolveRound(pPlan, aPlan);
        flush();
        break;
      }
      case "prompt": {
        const p = gmc.prompts[0];
        api().answerPrompt(pPolicy.prompt(gmc, p));
        flush();
        break;
      }
      case "craven": {
        api().useCraven(pPolicy.craven(gmc, gmc.P));
        flush();
        break;
      }
      case "clashPlan": {
        if (collectRounds) rounds.push({ r: gmc.round, hpP: gmc.P.hp, hpA: gmc.A.hp, powP: gmc.P.pow, powA: gmc.A.pow, clash: true, flowP: !!gmc.P.flow, flowA: !!gmc.A.flow, fz: ["NW", "NE", "SW", "SE"].filter((q) => gmc.terrain[q]?.kind === "frost").length, els: Object.keys(gmc.icels || {}).length });
        const pPick = pPolicy.clash(gmc, gmc.P);
        const aPick = aPolicy.clash(gmc, gmc.A);
        let pPlan = { ab: pPick.ab, soft: !!pPick.soft, form: pPick.form || null };
        let aPlan = { ab: aPick.ab, soft: !!aPick.soft, form: aPick.form || null };
        if (ABILITIES[pPlan.ab].pivot && pPolicy.pivot) {
          const f = pPolicy.pivot(gmc, gmc.P, pPlan, aPlan);
          if (f) pPlan = { ...pPlan, form: f, pivoted: true };
        }
        aPlan = api().aiPivot(aPlan, pPlan.form || ABILITIES[pPlan.ab].type);
        api().runClash(pPlan, aPlan);
        flush();
        break;
      }
      case "sudden": {
        if (++suddenThrows > 40) throw new Error("sudden death never resolved");
        api().throwSudden(pPolicy.sudden(gmc));
        flush();
        break;
      }
      case "over": {
        const winner = gmc.winner;
        const loser = winner === "P" ? gmc.A : gmc.P;
        const winType = gmc.altWin ? "alt" : loser.hp <= 0 ? "ko" : suddenThrows > 0 ? "sudden" : "bell";
        return {
          winner, winType,
          rounds: gmc.roundJustPlayed,
          hpP: gmc.P.hp, hpA: gmc.A.hp,
          maxHpP: gmc.P.maxHp, maxHpA: gmc.A.maxHp,
          history: gmc.history,
          trajectory: rounds,
          stats: gmc.stats,
        };
      }
      default:
        throw new Error(`runner: unhandled phase ${gmc.phase}`);
    }
  }
  throw new Error("runner: game never ended");
}

/* ---- invariant checks on a finished game (Phase A invariants in-sim) ---- */
const SHORT = { G: "Gharzul", M: "Maleth", V: "Vessk", C: "Ashkarra", K: "Koros", Z: "Zhal", L: "Kastor", O: "Marrow", D: "Dhoram", Y: "Maelis", W: "Wrenna", X: "Dregan" };

export function checkInvariants(result, fks) {
  const issues = [];
  const nameP = SHORT[fks.pFk], nameA = SHORT[fks.aFk];
  // ledger (skip if Undying Vigil fired — it restores HP without an amount line)
  const all = result.history.flatMap((h) => h.lines);
  if (!all.some((t) => t.includes("UNDYING VIGIL"))) {
    const dmg = { [nameP]: 0, [nameA]: 0 };
    const heal = { [nameP]: 0, [nameA]: 0 };
    for (const t of all) {
      let m;
      if ((m = /.*— (\S+) takes (\d+)\.$/.exec(t))) { if (m[1] in dmg) dmg[m[1]] += +m[2]; }
      else if ((m = /(\S+) pays (\d+) blood\./.exec(t))) { if (m[1] in dmg) dmg[m[1]] += +m[2]; }
      else if ((m = /Life Tap — (\S+) trades 1 blood/.exec(t))) { if (m[1] in dmg) dmg[m[1]] += 1; }
      else if ((m = /(\S+) heals (\d+) \(/.exec(t))) { if (m[1] in heal) heal[m[1]] += +m[2]; }
    }
    const startP = hpStart(fks.pFk), startA = hpStart(fks.aFk);
    if (startP - result.hpP !== dmg[nameP] - heal[nameP]) issues.push(`ledger P: hp Δ${startP - result.hpP} vs books ${dmg[nameP]}-${heal[nameP]}`);
    if (startA - result.hpA !== dmg[nameA] - heal[nameA]) issues.push(`ledger A: hp Δ${startA - result.hpA} vs books ${dmg[nameA]}-${heal[nameA]}`);
  }
  // income visible every archived round
  for (const h of result.history) {
    const txt = h.lines.join("\n");
    for (const name of [nameP, nameA]) {
      const ok = txt.includes(`${name} +1◆ (end of round)`) ||
        txt.includes(`${name} spent this round — no ◆`) ||
        (txt.includes("gains no ◆") && txt.includes(name)) ||
        txt.includes(`${name} +1◆ (Dominion`);
      if (!ok) {
        // at-cap silence is legal; caps are 3 (4 with Deep Reserves) — we can't
        // see historical pow, so only flag when the fighter CAN'T be capped
        // (no way to verify retroactively; count as soft signal)
        issues.push(`income: round ${h.r} no ◆ line for ${name} (may be at-cap)`);
      }
    }
  }
  return issues;
}

function hpStart(fk) {
  return defs().FIGHTERS[fk].hp;
}
