/* PHASE E — tutorial audit: play all 12 lessons through their rails exactly
   as the storybook ▶ button does; verify function (completes in the promised
   LESSON win), spot rule-compliance breaks, and measure teaching coverage. */
import { test, beforeAll, vi } from "vitest";
import { boot, g, api, defs, seedRandom } from "./runner.jsx";
import { act } from "@testing-library/react";
import { writeFileSync, mkdirSync } from "fs";

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  boot();
});

function flush() {
  for (let i = 0; i < 500; i++) {
    if (vi.getTimerCount() === 0) return;
    vi.runOnlyPendingTimers();
  }
  throw new Error("timers never drained");
}

function playLesson(fk, seed) {
  const { FIGHTERS, TUTS, ABILITIES } = defs();
  const T = TUTS[fk];
  const report = { fk, rails: T.rails.length, rounds: [], completed: false, winner: null, issues: [], storyProvides: 0 };
  let out;
  act(() => {
    seedRandom(seed);
    vi.clearAllTimers();
    api().clearTimers();
    api().startGame({
      tut: true, pFk: fk,
      pLoad: T.load || (fk === "G" ? ["skull", "howl", "iron", "harvest"] : FIGHTERS[fk].aiLoad),
      pPass: T.pass, aiFk: T.foe, aiLoad: FIGHTERS[T.foe].aiLoad, aiPass: FIGHTERS[T.foe].aiPass,
    });
    flush();
    for (let step = 0; step < 40; step++) {
      const gm = g();
      if (gm.phase === "over") break;
      const R = api().resolveRail(gm);
      if (!R) { report.issues.push(`round ${gm.round}: no rail but game not over`); break; }
      const preP = { hp: gm.P.hp, pow: gm.P.pow };
      if (gm.phase === "clashPlan") {
        if (!R.rail.clash) { report.issues.push(`round ${gm.round}: engine clash but rail is not`); break; }
        if (gm.P.pow < ABILITIES[R.rail.you.ab].cost) report.storyProvides++;
        let aPlan = api().aiMakePlan(gm.A, gm.P, true, null);
        const cPiv = R.rail.pv === "pivot" && ABILITIES[R.rail.you.ab].pivot;
        aPlan = api().aiPivot(aPlan, ABILITIES[R.rail.you.ab].type);
        api().runClash({ ab: R.rail.you.ab, soft: false, form: cPiv ? ABILITIES[R.rail.you.ab].pivot : null, pivoted: !!cPiv }, aPlan);
      } else if (gm.phase === "plan") {
        if (R.rail.clash) { report.issues.push(`round ${gm.round}: rail expects clash, engine does not`); break; }
        const nPiv = R.rail.pv === "pivot" && ABILITIES[R.you.ab].pivot;
        const pPlan = { ab: R.you.ab, soft: false, form: nPiv ? ABILITIES[R.you.ab].pivot : null, pivoted: !!nPiv, moveTo: R.you.moveTo, target: R.you.target, splash: R.you.splash, secondary: R.you.secondary };
        if (gm.P.pow < ABILITIES[R.you.ab].cost) report.storyProvides++;
        let aPlan = api().aiMakePlan(gm.A, gm.P, false, null);
        aPlan = api().aiPivot(aPlan, pPlan.form || ABILITIES[pPlan.ab].type);
        aPlan = api().applyToll(aPlan, pPlan);
        api().resolveRound(pPlan, aPlan);
      } else {
        report.issues.push(`round ${gm.round}: unexpected phase ${gm.phase}`);
        break;
      }
      flush();
      for (let i = 0; i < 20 && g().phase === "prompt"; i++) {
        const pr = g().prompts[0];
        const pick = api().railPromptPick(g(), pr) ?? pr.opts[0];
        api().answerPrompt(pick);
        flush();
      }
      const lines = (g().history[0]?.lines || []).slice();
      report.rounds.push({ r: g().roundJustPlayed, rail: R.rail.clash ? { clash: true, ab: R.rail.you.ab } : R.rail.you, lines, hpLost: preP.hp - g().P.hp });
    }
    report.completed = g().phase === "over";
    report.winner = g().winner;
    out = report;
  });
  return out;
}

/* signature mechanics each lesson must demonstrate (from the design doc) */
const SIGNATURES = {
  G: [["shove/placement", /hurled into|holds .* right where|drops|claims/], ["clash win", /wins the clash|BREAK shatters|beats/], ["advantage rider", /Advantage|overswing/]],
  M: [["poison application", /gains \d Poison/], ["rupture or detonation", /RUPTURE|HEARTSEEKER/], ["blood tithe", /Blood Tithe/]],
  V: [["chill", /is Chilled/], ["frost ground", /Frost claims/], ["shatter + consume", /SHATTER — the chill breaks under the (blow|counter) and is spent/], ["zone expiry (melt)", /melts away/], ["flash freeze base root", /frozen boots take hold/], ["ice age birth", /ICE AGE — the winter stands up/], ["elemental anchor", /holds the frost/], ["elemental mirror", /MIRRORS Glacial Spike/], ["elemental spent", /spends itself in the strike/]],
  C: [["burn application", /is Burning/], ["burn tick", /Burning —/], ["detonation or pyre", /COMBUSTION|Pyre/]],
  K: [["discharge field install", /DISCHARGE FIELD INSTALLED/], ["field bites", /Discharge Field.*takes 1/], ["full-bank payoff", /Bulwark Frame vents the full bank|OVERCLOCK/], ["finality beam", /Finality Beam/], ["beam recoil root", /Rooted/]],
  Z: [["blood price", /pays \d blood|trades 1 blood/], ["life tap economy", /Life Tap/], ["doombrand clock", /BRANDED|DOOMBRAND/]],
  L: [["sanctuary", /Sanctuary/], ["relic", /Relic|relic/], ["censure denial", /gains no ◆/]],
  O: [["curse application", /gains \d Curse/], ["curse collection (Marrow-Deep, live)", /Curses collect/]],
  D: [["dominion conversion", /Dominion|paved/], ["demolition or seal", /DEMOLISHES|ARENA KNEELS|kneels/], ["quake", /Quake Fist/]],
  Y: [["whirlpool", /Whirlpool|YANKED|vortex/], ["surf", /Surf|surf|wave/], ["undine or maelstrom", /Undine|Maelstrom/]],
  W: [["kess mark", /MARKED|Kess/], ["skyfall", /SKYFALL|Skyfall/], ["pin/root", /Pinned|Rooted/]],
  X: [["flow", /Flow/], ["pivot", /PIVOT|Pivot|pivot/], ["cadence or arsenal", /Cadence|Arsenal/]],
};

test("all twelve lessons: function, compliance, coverage", () => {
  const { TUTS } = defs();
  const NAMES = { G: "Gharzul", M: "Maleth", V: "Vessk", C: "Ashkarra", K: "Koros", Z: "Zhal", L: "Kastor", O: "Marrow", D: "Dhoram", Y: "Maelis", W: "Wrenna", X: "Dregan" };
  const results = {};
  for (const fk of Object.keys(TUTS)) {
    // lessons contain RNG (shove options, skyfall dice) — play each 20 times
    const runs = [];
    for (let i = 0; i < 20; i++) runs.push(playLesson(fk, 90_000 + i * 17));
    const completions = runs.filter((r) => r.completed && r.winner === "LESSON").length;
    const allIssues = [...new Set(runs.flatMap((r) => r.issues))];
    // exchange losses: rounds where the player lost the triangle
    const lossRounds = new Set();
    for (const r of runs) for (const rd of r.rounds) {
      const foeName = NAMES[TUTS[fk].foe];
      if (rd.lines.some((t) => t.includes(`ADVANTAGE — ${foeName.toUpperCase()}`) || t.includes(`${foeName} wins the clash`))) lossRounds.add(rd.r);
    }
    // coverage across all runs' lines
    const allLines = runs.flatMap((r) => r.rounds.flatMap((rd) => rd.lines));
    const coverage = SIGNATURES[fk].map(([name, re]) => ({ name, shown: allLines.some((t) => re.test(t)) }));
    results[fk] = {
      rails: runs[0].rails,
      completions: `${completions}/20`,
      storyProvides: runs[0].storyProvides,
      exchangeLossRounds: [...lossRounds],
      issues: allIssues,
      coverage,
    };
    console.log(`${NAMES[fk]}: ${completions}/20 LESSON wins, story-provides ${runs[0].storyProvides}, loss-rounds [${[...lossRounds]}], gaps: ${coverage.filter((c) => !c.shown).map((c) => c.name).join(", ") || "none"}${allIssues.length ? " ISSUES: " + allIssues.join("; ") : ""}`);
  }
  mkdirSync("reports/data", { recursive: true });
  writeFileSync("reports/data/phaseE-tutorials.json", JSON.stringify(results, null, 1));
});
