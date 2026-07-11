/* PHASE C — character metrics: complexity (decision surface, from the data
   tables) and fun-proxy health (from the Phase B simulation data). */
import { test, beforeAll, vi } from "vitest";
import { boot, defs } from "./runner.jsx";
import { writeFileSync, readFileSync, mkdirSync } from "fs";

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  boot();
});

test("complexity + fun-proxy metrics", () => {
  const { FIGHTERS, ABILITIES, PASSIVES } = defs();
  const fks = Object.keys(FIGHTERS);

  /* ---- COMPLEXITY: decision-surface score from the kit definitions ----
     Counted per fighter across the 6-ability pool + 3 passives:
     placement prompts and picks, after-reveal decisions (pivot/umbral),
     dual modes, conditional damage lines, engine dependencies (tokens,
     terrain, resources beyond ◆), and setup chains. Weights are disclosed. */
  const PROMPT_ABILITIES = { sunder: 1, twin: 2, pyre: 0, whirlA: 1, undine: 1, storm: 1, hawk: 1, sky: 2, fissure: 1, grind: 1, claim: 1, freeze: 0, flash: 1, strideW: 1, gloom: 1, puppet: 1, harvest: 1, frenzy: 1 };
  const CONDITIONALS = { frenzy: 1, heart: 2, comb: 1, sorrow: 1, llance: 1, dawn: 1, mount: 1, spike: 1, iceage: 1, frame: 1, bwater: 1, sky: 1, brand: 1, censure: 1 };
  const AFTER_REVEAL = { umbral: 2, cres: 2, chainX: 2 };
  const ENGINE_DEPS = {
    G: 1, // wrecking throw aiming
    M: 2, // poison clock + homing gate
    V: 2, // frost zone + chill cashing
    C: 2, // burn stacks + scorch ground
    K: 3, // capacitor threshold + overcharge rhythm + nova
    Z: 2, // blood economy + brand clock (+ knock)
    L: 3, // relic race + sanctuary network + contested claims
    O: 2, // curse clock + endgame timing
    D: 3, // dominion seal + demolition counterplay + bunker economy
    Y: 3, // two waters + undine + carry/yank geometry
    W: 3, // kess position + marks + skyfall dice
    X: 2, // flow banking + pivot pricing
  };
  const complexity = {};
  for (const fk of fks) {
    const F = FIGHTERS[fk];
    let score = 0;
    for (const id of F.pool) {
      score += (PROMPT_ABILITIES[id] || 0) * 0.6;
      score += (CONDITIONALS[id] || 0) * 0.5;
      score += (AFTER_REVEAL[id] || 0) * 0.8;
      if (ABILITIES[id].dual) score += 0.8;
      if (ABILITIES[id].hpCost) score += 0.4;
    }
    for (const p of F.passives) {
      const t = PASSIVES[p].text.toLowerCase();
      if (/when|whenever|first time|each round|every/.test(t)) score += 0.4; // triggered passives to track
    }
    score += ENGINE_DEPS[fk];
    complexity[fk] = +score.toFixed(1);
  }

  /* ---- FUN-PROXY HEALTH from Phase B mid-tier data ---- */
  const mid = JSON.parse(readFileSync("reports/data/tier-mid.json", "utf8"));
  const health = {};
  for (const fk of fks) {
    const t = mid.table[fk];
    // ability-usage diversity among winning games: top ability's share
    const wins = Object.values(t.winUsage).reduce((a, b) => a + b, 0) || 1;
    const top = Object.entries(t.winUsage).sort((a, b) => b[1] - a[1])[0] || ["-", 0];
    const winTypes = t.winTypes;
    const totalWins = Object.values(winTypes).reduce((a, b) => a + b, 0) || 1;
    const topType = Object.entries(winTypes).sort((a, b) => b[1] - a[1])[0];
    health[fk] = {
      avgRounds: t.avgRounds,
      blowoutShare: t.blowoutShare,
      comebackShare: t.comebackShare,
      topAbility: top[0],
      topAbilityShare: +(100 * top[1] / wins).toFixed(1),
      topWinType: topType[0],
      topWinTypeShare: +(100 * topType[1] / totalWins).toFixed(1),
      usedAbilities: Object.keys(t.usage).length,
    };
  }

  mkdirSync("reports/data", { recursive: true });
  writeFileSync("reports/data/metrics.json", JSON.stringify({ complexity, health }, null, 1));
  const NAMES = { G: "Gharzul", M: "Maleth", V: "Vessk", C: "Ashkarra", K: "Koros", Z: "Zhal", L: "Kastor", O: "Marrow", D: "Dhoram", Y: "Maelis", W: "Wrenna", X: "Dregan" };
  console.log("=== complexity (decision surface) ===");
  for (const [fk, c] of Object.entries(complexity).sort((a, b) => b[1] - a[1])) console.log(`  ${NAMES[fk]}: ${c}`);
  console.log("=== fun-proxy ===");
  for (const fk of fks) {
    const h = health[fk];
    console.log(`  ${NAMES[fk]}: rounds ${h.avgRounds}, blowout ${h.blowoutShare}%, comeback ${h.comebackShare}%, top-ability ${h.topAbility} ${h.topAbilityShare}%, top-wintype ${h.topWinType} ${h.topWinTypeShare}%`);
  }
});
