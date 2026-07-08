/* Test harness: drives the real game UI in a simulated browser.
   The game exposes its internal state via window.__CL_TEST__ (see the
   one-line hook in src/App.jsx, active only when __CL_TEST_HOOK__ is set). */
import React from "react";
import { render, fireEvent, act } from "@testing-library/react";
import { vi, expect } from "vitest";
import App from "../src/App.jsx";

export const QUADS = ["NW", "NE", "SW", "SE"];
export const SHORT = {
  G: "Gharzul", M: "Maleth", V: "Vessk", C: "Ashkarra", K: "Koros", Z: "Zhal",
  L: "Kastor", O: "Marrow", D: "Dhoram", Y: "Maelis", W: "Wrenna", X: "Dregan",
};

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

/* ---- state access ---- */
export const g = () => window.__CL_TEST__?.G.current;
export const phase = () => g()?.phase;
export const powCap = (s) => (s.pass === "reserves" ? 4 : 3);

/* ---- DOM helpers ---- */
export const buttons = () => Array.from(document.querySelectorAll("button"));
export const findBtn = (txt) => buttons().find((b) => b.textContent.includes(txt));
export function clickText(txt) {
  const b = findBtn(txt);
  if (!b) throw new Error(`button not found: "${txt}" (phase=${phase()})`);
  fireEvent.click(b);
}
export const quadTiles = () => buttons().filter((b) => b.className.includes("h-32"));
export function clickQuad(q) {
  const tile = quadTiles()[QUADS.indexOf(q)];
  if (!tile) throw new Error(`quadrant tile not found: ${q}`);
  fireEvent.click(tile);
}

/* ---- timer pump: fast-forward all animation/pacing delays ---- */
export function settle(maxLoops = 1000) {
  for (let i = 0; i < maxLoops; i++) {
    if (vi.getTimerCount() === 0) return;
    act(() => {
      vi.runOnlyPendingTimers();
    });
  }
  throw new Error("settle: timers never drained");
}

/* ---- game setup ---- */
export function mountGame() {
  return render(<App />);
}

export function startDuel({ fighter, abilities, passive, foe, diff = "THE PROVING" }) {
  clickText(fighter);
  for (const a of abilities) clickText(a);
  clickText(passive);
  if (foe) {
    const b = buttons().find((x) => x.title === foe);
    if (!b) throw new Error(`foe portrait not found: ${foe}`);
    fireEvent.click(b);
  }
  clickText(diff);
  clickText("Enter the Crucible");
  settle();
  if (phase() !== "plan") throw new Error(`expected plan after start, got ${phase()}`);
}

/* ---- playing a round ---- */
export function playPlan({ stay = true, move = null, ability, target = null, splash = null } = {}) {
  if (phase() !== "plan") throw new Error(`playPlan called in phase ${phase()}`);
  if (findBtn("Stay in")) {
    if (stay || !move) clickText("Stay in");
    else clickQuad(move);
  }
  clickText(ability);
  if (target) clickQuad(target);
  if (splash) clickQuad(splash);
  clickText("Lock in");
}

function answerPromptAuto(rng) {
  const p = g().prompts[0];
  if (!p) throw new Error("prompt phase without a prompt");
  const opts = p.opts.filter((q) => QUADS.includes(q));
  if (!opts.length) throw new Error(`non-quadrant prompt: ${JSON.stringify(p.opts)}`);
  clickQuad(opts[Math.floor((rng ? rng() : Math.random()) * opts.length)]);
}

/* Advance until the game wants a decision from the human (or is over). */
export function stepUntilDecision(rng, maxSteps = 200) {
  for (let i = 0; i < maxSteps; i++) {
    settle();
    const ph = phase();
    if (["plan", "clashPlan", "sudden", "over"].includes(ph)) return ph;
    if (ph === "prompt") {
      answerPromptAuto(rng);
      continue;
    }
    if (vi.getTimerCount() === 0) throw new Error(`stuck in phase ${ph}`);
  }
  throw new Error("stepUntilDecision: no decision point reached");
}

/* ---- automated policies for full-game simulation ---- */
const abilityButtons = () =>
  buttons().filter((b) => /(RUSH|BREAK|WARD) · \d◆/.test(b.textContent) && !b.disabled);

export function autoPlan(rng) {
  if (findBtn("Stay in")) clickText("Stay in");
  const abs = abilityButtons();
  if (!abs.length) throw new Error("no ability buttons available");
  fireEvent.click(abs[Math.floor(rng() * abs.length)]);
  for (let i = 0; i < 16; i++) {
    if (findBtn("Lock in")) {
      clickText("Lock in");
      return;
    }
    clickQuad(QUADS[Math.floor(rng() * 4)]);
  }
  throw new Error("autoPlan: never reached Lock in");
}

export function autoClash(rng) {
  const abs = abilityButtons();
  if (!abs.length) throw new Error("no clash ability available");
  fireEvent.click(abs[Math.floor(rng() * abs.length)]); // confirms immediately
}

export function throwSuddenType(label = "BREAK") {
  const b = buttons().find((x) => x.textContent.trim() === label);
  if (!b) throw new Error(`sudden-death button not found: ${label}`);
  fireEvent.click(b);
}

/* ---- per-round harvesting ----
   The game clears its live feed when a new round starts, but archives each
   round's text lines into g.history (last 12 — covers a full game). We pull
   rounds from there, and snapshot ◆ totals when a round is freshest. */
export function harvest(store) {
  const gm = g();
  for (const h of gm.history) {
    if (!store.has(h.r)) store.set(h.r, { lines: h.lines.slice(), powP: null, powA: null });
  }
  const e = store.get(gm.roundJustPlayed);
  if (e && e.powP === null) {
    e.powP = gm.P.pow;
    e.powA = gm.A.pow;
  }
}

/* Play a whole game with random-but-seeded choices. Returns the harvest store. */
export function playFullGame(rng, maxRounds = 40) {
  const store = new Map();
  for (let i = 0; i < maxRounds; i++) {
    const ph = phase();
    harvest(store);
    if (ph === "over") return store;
    if (ph === "plan") autoPlan(rng);
    else if (ph === "clashPlan") autoClash(rng);
    else if (ph === "sudden") throwSuddenType(["BREAK", "RUSH", "WARD"][Math.floor(rng() * 3)]);
    else throw new Error(`playFullGame: unexpected phase ${ph}`);
    stepUntilDecision(rng);
  }
  throw new Error("playFullGame: game never ended");
}

/* ---- invariant checks ---- */

/* Every round, each fighter must visibly receive ◆ income, or a logged reason
   for not receiving it, or already be at their cap. Silence = bug. */
export function assertIncomeEveryRound(store) {
  const gm = g();
  for (const [r, { lines, powP, powA }] of store) {
    for (const side of ["P", "A"]) {
      const s = gm[side];
      const name = SHORT[s.fk];
      const txt = lines.join("\n");
      const explained =
        txt.includes(`${name} +1◆ (end of round)`) ||
        txt.includes(`${name} spent this round — no ◆`) ||
        (txt.includes("gains no ◆") && txt.includes(name)) ||
        txt.includes(`${name} +1◆ (Dominion — the ground provides)`);
      if (!explained) {
        const powAfter = side === "P" ? powP : powA;
        expect(
          powAfter,
          `round ${r}: ${name} silently received no ◆ income and is not at cap`
        ).toBe(powCap(s));
      }
    }
  }
}

/* Parse every HP-changing event out of the round logs. Each mutation in the
   engine writes one of these exact line shapes (verified by code audit):
   "<label> — <Name> takes N."   damage (dealRaw)
   "<Name> pays N blood."        ability blood price
   "Life Tap — <Name> trades 1 blood for power."
   "<Name> heals N (<why>)."     healing (healUp) */
export function parseLedger(store) {
  const gm = g();
  const who = { [SHORT[gm.P.fk]]: "P", [SHORT[gm.A.fk]]: "A" };
  const dmg = { P: 0, A: 0 };
  const heal = { P: 0, A: 0 };
  const wounds = { P: 0, A: 0 }; // discrete damage events, for Third Knock math
  for (const { lines } of store.values()) {
    for (const t of lines) {
      let m;
      if ((m = /.*— (\S+) takes (\d+)\.$/.exec(t))) {
        if (who[m[1]]) { dmg[who[m[1]]] += +m[2]; wounds[who[m[1]]] += 1; }
      } else if ((m = /(\S+) pays (\d+) blood\./.exec(t))) {
        if (who[m[1]]) { dmg[who[m[1]]] += +m[2]; wounds[who[m[1]]] += 1; }
      } else if ((m = /Life Tap — (\S+) trades 1 blood/.exec(t))) {
        if (who[m[1]]) { dmg[who[m[1]]] += 1; wounds[who[m[1]]] += 1; }
      } else if ((m = /(\S+) heals (\d+) \(/.exec(t))) {
        if (who[m[1]]) heal[who[m[1]]] += +m[2];
      }
    }
  }
  return { dmg, heal, wounds };
}

/* Every point of HP lost or gained must be accounted for by a logged event. */
export function assertLedgerBalances(store, startHp) {
  const gm = g();
  const { dmg, heal } = parseLedger(store);
  for (const side of ["P", "A"]) {
    expect(
      startHp[side] - gm[side].hp,
      `${SHORT[gm[side].fk]} (${side}): HP books don't balance — ` +
        `lost ${startHp[side] - gm[side].hp} HP but ledger says ${dmg[side]} dmg − ${heal[side]} heal`
    ).toBe(dmg[side] - heal[side]);
  }
}

export const roundText = (store, r) => (store.get(r)?.lines || []).join("\n");
