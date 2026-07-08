/* Phase A scenario engine: fully scripted duels — both plans authored,
   state injectable, every prompt answered deterministically. */
import { act } from "@testing-library/react";
import { vi, expect } from "vitest";
import { g, api, defs, seedRandom } from "./runner.jsx";
import { writeFileSync, mkdirSync } from "fs";

export function duel({ p, a, seed = 1, diff = "proving", rounds }) {
  let out;
  act(() => { out = duelInner({ p, a, seed, diff, rounds }); });
  return out;
}

function duelInner({ p, a, seed, diff, rounds }) {
  const { ABILITIES } = defs();
  seedRandom(seed);
  vi.clearAllTimers();
  api().clearTimers();
  api().startGame({ pFk: p.fk, pLoad: p.load, pPass: p.pass, aiFk: a.fk, aiLoad: a.load, aiPass: a.pass, diff });
  flushAll();
  if (p.set) Object.assign(g().P, p.set);
  if (a.set) Object.assign(g().A, a.set);
  const results = [];
  for (const r of rounds) {
    const gm = g();
    // lines shown during planning (toll reveals, relic manifests) — the live
    // feed is wiped when the round resolves, so capture them now
    const planningLines = gm.feed.map((l) => l.t);
    if (r.before) r.before(gm);
    const promptQueue = [...(r.prompts || [])];
    if (gm.phase === "clashPlan") {
      const pPlan = clashPlan(r.p, ABILITIES);
      const aPlan = clashPlan(r.a, ABILITIES);
      api().runClash(pPlan, aPlan);
    } else if (gm.phase === "plan") {
      const pPlan = fullPlan(r.p, gm.P, ABILITIES);
      const aPlan = fullPlan(r.a, gm.A, ABILITIES);
      api().resolveRound(pPlan, aPlan);
    } else {
      throw new Error(`duel: unexpected phase ${gm.phase} at round script ${results.length + 1}`);
    }
    flushAll();
    // answer P prompts, recording each one seen
    const promptsSeen = [];
    for (let i = 0; i < 20 && g().phase === "prompt"; i++) {
      const pr = g().prompts[0];
      promptsSeen.push({ kind: pr.kind, opts: pr.opts.slice(), label: pr.label });
      let q = promptQueue.length ? promptQueue.shift() : defaultAnswer(pr, g());
      api().answerPrompt(q);
      flushAll();
    }
    results.push({
      lines: (g().history[0]?.lines || []).slice(),
      phase: g().phase,
      promptsSeen,
      planningLines,
    });
    if (g().phase === "over") break;
  }
  return { g: g(), rounds: results, text: (i) => results[i].lines.join("\n") };
}

function fullPlan(spec, me, ABILITIES) {
  if (!spec) throw new Error("duel: missing plan spec");
  const ab = ABILITIES[spec.ab];
  if (!ab) throw new Error(`duel: unknown ability ${spec.ab}`);
  const plan = {
    ab: spec.ab, soft: !!spec.soft, form: spec.form || null, string: !!spec.string,
    pivoted: !!spec.pivoted,
    moveTo: spec.moveTo ?? me.pos,
    target: spec.target ?? null, splash: spec.splash ?? null, secondary: spec.secondary ?? null,
  };
  if (ab.needsTarget && !plan.target) throw new Error(`duel: ${spec.ab} needs a target`);
  if (ab.needsSplash && !plan.splash) plan.splash = defs().ADJ[plan.target][0];
  if (ab.needsSecondary && !plan.secondary) plan.secondary = defs().QUADS.find((q) => q !== plan.target);
  return plan;
}

function clashPlan(spec, ABILITIES) {
  return { ab: spec.ab, soft: !!spec.soft, form: spec.form || null, pivoted: !!spec.pivoted };
}

function defaultAnswer(pr, gm) {
  if (pr.kind === "kb") {
    const victim = gm.P.fk === pr.who ? gm.A : gm.P;
    if (pr.opts.includes(victim.pos)) return victim.pos; // hold — keeps positions stable
  }
  if (pr.kind === "step") {
    const actor = gm.P.fk === pr.who ? gm.P : gm.A;
    if (pr.opts.includes(actor.pos)) return actor.pos; // hold
  }
  return pr.opts[0];
}

export function flushAll() {
  for (let i = 0; i < 500; i++) {
    if (vi.getTimerCount() === 0) return;
    vi.runOnlyPendingTimers();
  }
  throw new Error("flushAll: timers never drained");
}

/* ---- matrix collector: soft assertions, everything recorded ---- */
export const MATRIX = [];

export function row(id, mechanic, expected, observed, pass, note = "") {
  MATRIX.push({ id, mechanic, expected: String(expected), observed: String(observed), pass: !!pass, note });
  expect.soft(pass, `${id} — ${mechanic}: expected ${expected}, observed ${observed}${note ? ` [${note}]` : ""}`).toBeTruthy();
}

/* convenience: numeric equality row */
export function rowEq(id, mechanic, expected, observed, note = "") {
  row(id, mechanic, expected, observed, expected === observed, note);
}

export function saveMatrix(part) {
  mkdirSync("reports/data", { recursive: true });
  writeFileSync(`reports/data/phaseA-${part}.json`, JSON.stringify(MATRIX, null, 1));
}

/* damage dealt to a named fighter within one round's lines */
export function dmgTo(lines, shortName) {
  let n = 0;
  for (const t of lines) {
    const m = /.*— (\S+) takes (\d+)\.$/.exec(t);
    if (m && m[1] === shortName) n += +m[2];
  }
  return n;
}
export function healsTo(lines, shortName) {
  let n = 0;
  for (const t of lines) {
    const m = /(\S+) heals (\d+) \(/.exec(t);
    if (m && m[1] === shortName) n += +m[2];
  }
  return n;
}
/* damage from lines with an EXACT label — excludes DoT ticks, terrain sears,
   and other same-round noise, and never double-counts sibling labels */
export function dmgBy(lines, label, shortName) {
  let n = 0;
  for (const t of lines) {
    const m = /^(.*) — (\S+) takes (\d+)\.$/.exec(t);
    if (m && m[2] === shortName && m[1].replace(/^[^\w]*/, "") === label) n += +m[3];
  }
  return n;
}
export function dmgByPrefix(lines, labelPrefix, shortName) {
  let n = 0;
  for (const t of lines) {
    const m = /^(.*) — (\S+) takes (\d+)\.$/.exec(t);
    if (m && m[2] === shortName && m[1].replace(/^[^\w]*/, "").startsWith(labelPrefix)) n += +m[3];
  }
  return n;
}
/* heal from a specific labelled source */
export function healBy(lines, labelPrefix, shortName) {
  let n = 0;
  for (const t of lines) {
    const m = /(\S+) heals (\d+) \((.*)\)\./.exec(t);
    if (m && m[1] === shortName && m[3].startsWith(labelPrefix)) n += +m[2];
  }
  return n;
}
/* exchange damage: the direct hit plus all advantage/rider instances, i.e.
   every "X takes N" line before the end-of-round block. The engine's round
   log enters the end-of-round block at the claw/income boundary; we detect it
   by the first income/denial line or known end-of-round labels. */
const EOR = /\+1◆ \(end of round\)|spent this round — no ◆|gains no ◆|\(Dominion — the ground provides\)|^🔥 .* Burning|^Burning|Knock, knock\. Who|The Door answers/;
const EOR_LABELS = /^(🔥 )?Burning|The vortex grinds|The surf batters|The Undine lashes|The Curses collect|Sanctuary sears|Homefield|Skyfall|DOOMBRAND|The Claw|POISON RUPTURE$/;
export function exchangeDmgTo(lines, shortName) {
  let n = 0;
  for (const t of lines) {
    if (EOR.test(t)) break;
    const m = /^(.*) — (\S+) takes (\d+)\.$/.exec(t);
    if (m && m[2] === shortName && !EOR_LABELS.test(m[1].replace(/^[^\w]*/, ""))) n += +m[3];
  }
  return n;
}

/* standard kit helpers */
export const KITS = {
  G: { fk: "G", load: ["skull", "howl", "sunder", "iron"], pass: "warmonger" },
  M: { fk: "M", load: ["viper", "gloom", "umbral", "heart"], pass: "twist" },
  V: { fk: "V", load: ["lance", "hoar", "spike", "aval"], pass: "shatter" },
  C: { fk: "C", load: ["cinder", "smoke", "comb", "pyre"], pass: "heatrise" },
  K: { fk: "K", load: ["cannon", "flux", "gyro", "core"], pass: "vent" },
  Z: { fk: "Z", load: ["ruin", "chains", "tap", "brand"], pass: "surplus" },
  L: { fk: "L", load: ["llance", "oath", "aegis", "dawn"], pass: "vigil" },
  O: { fk: "O", load: ["stick", "knit", "mireA", "sorrow"], pass: "stitch" },
  D: { fk: "D", load: ["grind", "claim", "quake", "mount"], pass: "home" },
  Y: { fk: "Y", load: ["lash", "current", "bwater", "storm"], pass: "undertow" },
  W: { fk: "W", load: ["broad", "hawk", "pin", "sky"], pass: "deadeye" },
  X: { fk: "X", load: ["cres", "eguard", "chainX", "arsenal"], pass: "momentum" },
};

/* a neutral punching bag: Maelis has no innate damage modifiers; the
   Wave Rider passive only affects movement choices we never exercise */
export const BAG = { fk: "Y", load: ["lash", "current", "bwater", "undine"], pass: "rider" };
