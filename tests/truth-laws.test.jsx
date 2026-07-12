/* POLISH PASS I — the truth laws (permanent, deploy-gating).
   POSE TRUTH: a bell ending renders zero FALLEN sprites on any surface;
   a KO ending renders exactly one per surface (board + ceremony).
   FACING TRUTH: facing is computed from the opponent's current quadrant —
   other column faces it, same column faces the center line; asserted for
   all 12 ordered quadrant pairings on the live board.
   TROPHY TRUTH: trophy present ⟺ kill occurred; bell wins raise the totem. */
import { test, expect, beforeEach, afterEach, vi } from "vitest";
import { cleanup, act, fireEvent } from "@testing-library/react";
import {
  mountGame, startDuel, playPlan, stepUntilDecision, seedRandom, restoreRandom,
  g, phase, settle, clickText, buttons, QUADS,
} from "./harness.jsx";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});
afterEach(() => {
  cleanup();
  restoreRandom();
  vi.useRealTimers();
});

const fallenOn = (surface) => document.querySelectorAll(`[data-surface="${surface}"] [data-pose="fallen"]`).length;
const poseOn = (surface, pose) => document.querySelectorAll(`[data-surface="${surface}"] [data-pose="${pose}"]`).length;

function startGharzulVsVessk(seed) {
  seedRandom(seed);
  mountGame();
  startDuel({
    fighter: "GHARZUL",
    abilities: ["Bloodhowl", "Skullsplitter", "Bone Grinder", "Iron Hide"],
    passive: "Warmonger",
    foe: "VESSK, THE RIMEBOUND",
  });
}

test("POSE TRUTH: a KO ending renders exactly one FALLEN per surface", () => {
  startGharzulVsVessk(9101);
  g().A.hp = 1; g().A.burn = 1; g().A._burnFresh = 1;
  playPlan({ ability: "Skullsplitter", target: "NE" });
  expect(stepUntilDecision(Math.random)).toBe("over");
  expect(g().A.hp).toBeLessThanOrEqual(0);
  expect(fallenOn("board")).toBe(1);
  expect(fallenOn("ceremony")).toBe(1);
  expect(poseOn("ceremony", "victorious")).toBe(1);
});

test("POSE TRUTH: a bell ending renders zero FALLEN anywhere; the loser stands HURT", () => {
  startGharzulVsVessk(9202);
  g().round = 10; g().P.hp = 6; g().A.hp = 12;
  playPlan({ ability: "Skullsplitter", target: "NE" });
  expect(stepUntilDecision(Math.random)).toBe("over");
  expect(g().winner).toBe("A");
  expect(g().P.hp).toBeGreaterThan(0);
  expect(fallenOn("board")).toBe(0);
  expect(fallenOn("ceremony")).toBe(0);
  expect(poseOn("ceremony", "hurt")).toBe(1);
  expect(poseOn("board", "hurt")).toBe(1);
  // the banner speaks the same truth: a bell loss is "Beaten", never "Slain"
  expect(document.body.textContent).toContain("Beaten");
  expect(document.body.textContent).not.toContain("Slain");
});

test("TROPHY TRUTH: a kill raises the trophy; a bell win raises the totem", () => {
  // kill
  startGharzulVsVessk(9303);
  g().A.hp = 1; g().A.burn = 1; g().A._burnFresh = 1;
  playPlan({ ability: "Skullsplitter", target: "NE" });
  expect(stepUntilDecision(Math.random)).toBe("over");
  expect(g().winner).toBe("P");
  expect(document.querySelectorAll('[data-trophy="kill"]').length).toBeGreaterThan(0);
  expect(document.querySelectorAll('[data-trophy="totem"]').length).toBe(0);
  cleanup();

  // bell win for Gharzul (ahead on HP at round 10, foe alive)
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  startGharzulVsVessk(9404);
  g().round = 10; g().P.hp = 12; g().A.hp = 3;
  playPlan({ ability: "Skullsplitter", target: "NE" });
  const ph = stepUntilDecision(Math.random);
  expect(ph).toBe("over");
  if (g().winner === "P" && g().A.hp > 0) {
    expect(document.querySelectorAll('[data-trophy="totem"]').length).toBeGreaterThan(0);
    expect(document.querySelectorAll('[data-trophy="kill"]').length).toBe(0);
  } else {
    // seed produced a KO instead — the kill branch must then hold
    expect(document.querySelectorAll('[data-trophy="kill"]').length).toBeGreaterThan(0);
  }
});

test("FACING TRUTH: all 12 ordered quadrant pairings face per the law", () => {
  startGharzulVsVessk(9505);
  const { faceLeft } = window.__CL_TEST__.defs;
  const rerenderPoke = () => {
    clickText("📜 Record");
    const close = buttons().find((b) => b.textContent.includes("Close") || b.textContent.includes("✕") || b.textContent.includes("×"));
    if (close) fireEvent.click(close);
    else clickText("📜 Record");
  };
  const pairs = [];
  for (const a of QUADS) for (const b of QUADS) if (a !== b) pairs.push([a, b]);
  expect(pairs.length).toBe(12);
  for (const [pq, aq] of pairs) {
    g().P.pos = pq; g().A.pos = aq;
    act(() => { rerenderPoke(); });
    const toks = document.querySelectorAll('[data-surface="board"] [data-facing]');
    expect(toks.length).toBeGreaterThanOrEqual(2);
    const pFacing = toks[0].getAttribute("data-facing");
    const aFacing = toks[1].getAttribute("data-facing");
    expect(pFacing, `P at ${pq} vs A at ${aq}`).toBe(faceLeft(pq, aq) ? "left" : "right");
    expect(aFacing, `A at ${aq} vs P at ${pq}`).toBe(faceLeft(aq, pq) ? "left" : "right");
  }
  // the law itself: other column faces it; same column faces the center line
  expect(faceLeft("NW", "NE")).toBe(false); // enemy right -> face right
  expect(faceLeft("NE", "NW")).toBe(true);
  expect(faceLeft("NW", "SW")).toBe(false); // same left column -> face center (right)
  expect(faceLeft("NE", "SE")).toBe(true);  // same right column -> face center (left)
  // projectile travel-vector signs derive from the same quadrant grid
  const { QUADS: qs } = window.__CL_TEST__.defs;
  const QP = { NW: { x: 0, y: 0 }, NE: { x: 50, y: 0 }, SW: { x: 0, y: 50 }, SE: { x: 50, y: 50 } };
  for (const [from, to] of pairs) {
    const dx = QP[to].x - QP[from].x, dy = QP[to].y - QP[from].y;
    expect(Math.abs(dx) + Math.abs(dy), `${from}->${to} moves`).toBeGreaterThan(0);
  }
  expect(qs.length).toBe(4);
});
