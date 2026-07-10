/* THE SPARRING TRANSCRIPTS — the human-facing deliverable of the v3 rework.
   Three full games: the Mind at Crucible vs a mid-tier scripted opponent
   (the frozen v2-Proving brain — the old standard pilot). Every one of the
   Mind's rounds is annotated with its ACTUAL reasoning, read straight from
   g.mind.log: the profile prediction, the top candidate EVs, the war plan,
   the clash matrices, and every war-plan switch. Written to
   reports/transcripts-v3.md for the design table. */
import { test, beforeAll, vi } from "vitest";
import { boot, playGame, makeAiPolicy, defs, g } from "./runner.jsx";
import { makeV2Policy } from "./legacy-ai-v2.jsx";
import { writeFileSync, mkdirSync } from "fs";

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  boot();
});

const BOUTS = [
  { fk: "C", foe: "L", seed: 87_900_011, title: "Ashkarra (the Mind, Crucible) vs Ser Kastor (v2 mid-tier)" },
  { fk: "V", foe: "X", seed: 87_900_101, title: "Vessk (the Mind, Crucible) vs Dregan (v2 mid-tier)" },
  { fk: "Z", foe: "Y", seed: 87_900_205, title: "Zhal-Meraq (the Mind, Crucible) vs Maelis (v2 mid-tier)" },
];

test("three annotated sparring transcripts", () => {
  const { FIGHTERS } = defs();
  let md = `# THE SPARRING TRANSCRIPTS — reading the Mind think (v0.87)\n\n` +
    `*Three full games. The Mind pilots the LEFT fighter at Crucible; the right fighter is the\n` +
    `frozen v2-Proving brain — the old mid-tier standard. Between rounds you are reading the\n` +
    `Mind's actual planning log, verbatim: its opponent profile prediction, its top candidate\n` +
    `lines with expected values, its war plan, and its clash matrices. Nothing is dramatized.*\n`;
  for (const bout of BOUTS) {
    const rng = () => Math.random();
    const res = playGame({
      pFk: bout.fk, pLoad: FIGHTERS[bout.fk].aiLoad, pPass: FIGHTERS[bout.fk].aiPass,
      aFk: bout.foe, aLoad: FIGHTERS[bout.foe].aiLoad, aPass: FIGHTERS[bout.foe].aiPass,
      diff: "crucible",
      pPolicy: makeAiPolicy(rng), aPolicy: makeV2Policy(rng, "proving"),
      seed: bout.seed,
    });
    const log = (g().mind?.log || []).filter((e) => e.seat === "P");
    const hist = [...res.history].sort((a, b) => a.r - b.r);
    md += `\n---\n\n## ${bout.title}\n\n`;
    md += `*Result: ${res.winner === "P" ? "the Mind wins" : "the Mind loses"} by ${res.winType.toUpperCase()} after round ${res.rounds} ` +
      `(${FIGHTERS[bout.fk].short} ${res.hpP} HP · ${FIGHTERS[bout.foe].short} ${res.hpA} HP).*\n\n`;
    const warNotes = log.filter((e) => e.kind === "war" || e.kind === "war-switch");
    if (warNotes.length) md += warNotes.map((e) => `> 🧠 **round ${e.r} — ${e.kind === "war-switch" ? "WAR PLAN SWITCH" : "war plan"}:** ${e.note}`).join("\n") + "\n\n";
    for (const h of hist) {
      const thoughts = log.filter((e) => e.r === h.r && (e.kind === "plan" || e.kind === "clash" || e.kind === "final-clash"));
      for (const t of thoughts) md += `> 🧠 **round ${h.r}${t.kind !== "plan" ? " — " + t.kind.toUpperCase() : ""}:** ${t.note}\n\n`;
      md += `**Round ${h.r}**${h.vs ? ` — *${h.vs.p.n}${h.vs.p.tq ? "→" + h.vs.p.tq : ""} vs ${h.vs.a.n}${h.vs.a.tq ? "→" + h.vs.a.tq : ""} (${h.vs.note})*` : ""}\n\n`;
      md += h.lines.map((t) => `- ${t}`).join("\n") + "\n\n";
    }
  }
  mkdirSync("reports", { recursive: true });
  writeFileSync("reports/transcripts-v3.md", md);
  console.log(`transcripts written: ${BOUTS.length} bouts, ${md.length} chars`);
}, 600000);
