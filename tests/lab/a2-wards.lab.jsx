/* PHASE A part 2 — every ward: base utility (fires regardless of contact),
   catch (riposte 1 + adv counter + signature), guard-break, chip-through. */
import { test, describe, beforeAll, afterAll, vi } from "vitest";
import { boot } from "./runner.jsx";
import { duel, row, rowEq, dmgTo, dmgBy, healsTo, healBy, saveMatrix, BAG } from "./scenario.jsx";

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  boot();
});
afterAll(() => saveMatrix("wards"));

const OWNER_PASS = { G: "warmonger", M: "craven", V: "permafrost", C: "everburn", K: "vent", Z: "agonist", L: "vigil", O: "mdeep", D: "reserves", Y: "rider", W: "parting", X: "pedge" };
const SHORT = { G: "Gharzul", M: "Maleth", V: "Vessk", C: "Ashkarra", K: "Koros", Z: "Zhal", L: "Kastor", O: "Marrow", D: "Dhoram", Y: "Maelis", W: "Wrenna", X: "Dregan" };

function wardKit(fk, ab, set = {}) {
  return { fk, load: [ab, "bB", "bR", "bW"], pass: OWNER_PASS[fk], set: { pow: 3, hp: 20, maxHp: 20, ...set } };
}

/* bag as the FOE (in A seat) so its Maelis kit stays out of the way */
const FOE = () => ({ ...BAG, set: { hp: 25, maxHp: 25, pow: 3 } });

/* catch: bag rushes into the warder */
function wardCatch(fk, ab, opts = {}) {
  return duel({
    p: wardKit(fk, ab, opts.set), a: FOE(), seed: opts.seed || 50,
    rounds: [{ before: opts.before, p: { ab, ...(opts.plan || {}) }, a: { ab: "bR", target: "SW" }, prompts: opts.prompts }],
  });
}
/* break: bag breaks the guard */
function wardBreakT(fk, ab, opts = {}) {
  return duel({
    p: wardKit(fk, ab, opts.set), a: FOE(), seed: opts.seed || 51,
    rounds: [{ before: opts.before, p: { ab, ...(opts.plan || {}) }, a: { ab: "bB", target: "SW" }, prompts: opts.prompts }],
  });
}
/* idle: bag whiffs elsewhere — only base utility should fire */
function wardIdle(fk, ab, opts = {}) {
  return duel({
    p: wardKit(fk, ab, opts.set), a: FOE(), seed: opts.seed || 52,
    rounds: [{ before: opts.before, p: { ab, ...(opts.plan || {}) }, a: { ab: "bR", target: "NW" }, prompts: opts.prompts }],
  });
}

describe("universal ward law", () => {
  test("catch = riposte 1 + advantage counter 1 (basic ward)", () => {
    boot();
    const d = duel({
      p: { fk: "G", load: ["bW", "bB", "bR", "iron"], pass: "warmonger", set: { pow: 3, hp: 20, maxHp: 20 } },
      a: FOE(), seed: 53,
      rounds: [{ p: { ab: "bW" }, a: { ab: "bR", target: "SW" } }],
    });
    rowEq("ward:catch:total", "basic ward catch = 2 total (riposte 1 + adv 1)", 2,
      dmgBy(d.rounds[0].lines, "Riposte", "Maelis") + dmgBy(d.rounds[0].lines, "Sharpened riposte", "Maelis"));
  });

  test("guard break: warder eats base + adv, riposte never fires", () => {
    boot();
    const d = duel({
      p: { fk: "G", load: ["bW", "bB", "bR", "iron"], pass: "warmonger", set: { pow: 3, hp: 20, maxHp: 20 } },
      a: FOE(), seed: 54,
      rounds: [{ p: { ab: "bW" }, a: { ab: "bB", target: "SW" } }],
    });
    rowEq("ward:break:taken", "guard-broken warder takes 1+1", 2,
      dmgBy(d.rounds[0].lines, "Basic Break lands DIRECT", "Gharzul") + dmgBy(d.rounds[0].lines, "Advantage — the extra point", "Gharzul"));
    rowEq("ward:break:noRiposte", "no riposte through a shattered guard", 0, dmgTo(d.rounds[0].lines, "Maelis"));
  });

  test("splash chips through a guard; statuses stay off", () => {
    boot();
    // warder bag guards; Gharzul splashes its square with Bone Grinder
    const d = duel({
      p: { fk: "G", load: ["sunder", "bB", "bR", "bW"], pass: "warmonger", set: { pow: 3, hp: 20, maxHp: 20 } },
      a: FOE(), seed: 55,
      rounds: [{ p: { ab: "sunder", target: "SE", splash: "NE" }, a: { ab: "bW" } }],
    });
    rowEq("ward:chip", "splash 1 chips through the guard", 1, dmgTo(d.rounds[0].lines, "Maelis"));
  });

  test("Iron Hide: −1 from every damage instance this round", () => {
    boot();
    const d = duel({
      p: wardKit("G", "iron"), a: FOE(), seed: 56,
      rounds: [{ p: { ab: "iron" }, a: { ab: "bB", target: "SW" } }],
    });
    // guard break 1+1 → each instance reduced to 0 → absorbed
    rowEq("ward:iron:absorb", "Iron Hide absorbs a basic guard-break entirely", 0, dmgTo(d.rounds[0].lines, "Gharzul"));
    row("ward:iron:absorbLine", "absorbed lines present", "absorbed", "", d.rounds[0].lines.some((t) => t.includes("absorbed")));
  });
});

describe("ward base utilities fire regardless of contact", () => {
  test("Hoarfrost frosts own square (idle)", () => {
    boot();
    const d = wardIdle("V", "hoar");
    row("ward:hoar:frost", "own quadrant frosted", "frost at SW", d.g.terrain.SW?.kind, d.g.terrain.SW?.kind === "frost");
  });
  test("Winter's Mantle (v0.85): idle base is a bare stance — no heal, no frost", () => {
    boot();
    const d = wardIdle("V", "mantle", { set: { hp: 10 } });
    rowEq("ward:mantle:idleHeal", "no heal without a catch", 0, healsTo(d.rounds[0].lines, "Vessk"));
    row("ward:mantle:idleFrost", "no frost without a catch", "none", d.g.terrain.SW?.kind ?? "none", !d.g.terrain.SW);
  });
  test("Winter's Mantle (v0.85): the Advantage catch pays +1 counter, heal 2, and frost underfoot", () => {
    boot();
    const d = wardCatch("V", "mantle", { set: { hp: 10 } });
    rowEq("ward:mantle:catchDmg", "riposte 1 + Mantle counter 1", 2,
      dmgBy(d.rounds[0].lines, "Riposte", "Maelis") + dmgBy(d.rounds[0].lines, "Mantle counter", "Maelis"));
    rowEq("ward:mantle:catchHeal", "heal exactly 2 on the catch", 2, healsTo(d.rounds[0].lines, "Vessk"));
    row("ward:mantle:catchFrost", "own quadrant becomes a frost zone", "frost at SW", d.g.terrain.SW?.kind, d.g.terrain.SW?.kind === "frost");
  });
  test("Ice Age (v0.85.1): self-paints the caster's quadrant, then every frost zone births an elemental", () => {
    boot();
    const two = wardIdle("V", "iceage", { before: (gm) => { gm.terrain.NW = { kind: "frost", until: 99 }; gm.terrain.SE = { kind: "frost", until: 99 }; } });
    rowEq("ward:iceage:births", "two zones + the self-painted one → three elementals", 3, Object.keys(two.g.icels || {}).length);
    const bare = wardIdle("V", "iceage", { seed: 58 });
    rowEq("ward:iceage:bare", "bare board → own quadrant freezes, one elemental", 1, Object.keys(bare.g.icels || {}).length);
    row("ward:iceage:selfpaint", "caster's quadrant is a frost zone", "frost at SW", bare.g.terrain.SW?.kind, bare.g.terrain.SW?.kind === "frost");
  });
  test("Renewing Current heals 1 (idle)", () => {
    boot();
    const d = wardIdle("Y", "current", { set: { hp: 10 } });
    rowEq("ward:current:heal", "heal 1", 1, healsTo(d.rounds[0].lines, "Maelis"));
  });
  test("Witch Brew heals 1 (idle)", () => {
    boot();
    const d = wardIdle("O", "knit", { set: { hp: 10 } });
    rowEq("ward:knit:heal", "heal 1", 1, healsTo(d.rounds[0].lines, "Marrow"));
  });
  test("Bulwark Frame heals 2 only when cast at a full bank", () => {
    boot();
    const rich = wardIdle("K", "frame", { set: { hp: 10, pow: 3 } });
    rowEq("ward:frame:rich", "heal 2 at full 3◆ (checked pre-cost)", 2, healsTo(rich.rounds[0].lines, "Koros"));
    const poor = wardIdle("K", "frame", { set: { hp: 10, pow: 2 }, seed: 57 });
    rowEq("ward:frame:poor", "no heal below full", 0, healsTo(poor.rounds[0].lines, "Koros"));
  });
  test("Life Tap: 1 blood → +1◆ (idle, no Surplus)", () => {
    boot();
    const d = wardIdle("Z", "tap", { set: { pow: 0, hp: 14 } });
    rowEq("ward:tap:pow", "0◆ + 1 tap + 1 income = 2", 2, d.g.P.pow);
    rowEq("ward:tap:hp", "paid exactly 1 HP", 13, d.g.P.hp);
  });
  test("Bedrock Claim: own square becomes Dominion (idle)", () => {
    boot();
    const d = wardIdle("D", "claim");
    row("ward:claim:dom", "dominion under Dhoram", "dom at SW", d.g.terrain.SW?.kind, d.g.terrain.SW?.kind === "dom");
  });
  test("Riposte Draw grants Flow even when nothing attacks", () => {
    boot();
    const d = wardIdle("X", "riposte");
    row("ward:riposte:flow", "flow banked", "flow=true", d.g.P.flow, d.g.P.flow === true);
  });
  test("Aegis heals 1 and anchors (idle)", () => {
    boot();
    const d = wardIdle("L", "aegis", { set: { hp: 10 } });
    rowEq("ward:aegis:heal", "heal 1", 1, healsTo(d.rounds[0].lines, "Kastor"));
  });
  test("Whirlpool ward: places the vortex and yanks the adjacent foe in", () => {
    boot();
    // Maelis is immune to her own water, so the victim must be someone else:
    // a Koros bag at 0◆ has no armor and no active passives here.
    const d = duel({
      p: { fk: "Y", load: ["whirlA", "lash", "current", "storm"], pass: "rider", set: { pow: 3, hp: 20, maxHp: 20 } },
      a: { fk: "K", load: ["cannon", "flux", "gyro", "frame"], pass: "overclock", set: { pow: 0, hp: 25, maxHp: 25 } },
      seed: 58,
      rounds: [{ p: { ab: "whirlA" }, a: { ab: "flux", target: "NW" }, prompts: ["SE"] }],
    });
    row("ward:whirlA:place", "whirlpool placed", "whirl at SE", d.g.terrain.SE?.kind, d.g.terrain.SE?.kind === "whirl");
    row("ward:whirlA:yank", "adjacent foe yanked in", "foe at SE", d.g.A.pos, d.g.A.pos === "SE");
    rowEq("ward:whirlA:grind", "vortex grinds 1 at round end", 1, dmgTo(d.rounds[0].lines, "Koros"));
  });
  test("Hawk's Eye wings Kess to an ADJACENT square only", () => {
    boot();
    const d = duel({
      p: { fk: "W", load: ["hawk", "broad", "pin", "sky"], pass: "parting", set: { pow: 3, hp: 20, maxHp: 20 } },
      a: FOE(), seed: 59,
      rounds: [{ p: { ab: "hawk" }, a: { ab: "bR", target: "NW" }, prompts: ["NW"] }],
    });
    const pr = d.rounds[0].promptsSeen.find((x) => x.kind === "kess");
    row("ward:hawk:adjacent", "Kess options are adjacent to her square (SW start)", "NW,SE", pr ? pr.opts.join(",") : "none",
      !!pr && pr.opts.length === 2 && pr.opts.includes("NW") && pr.opts.includes("SE"));
    row("ward:hawk:moved", "Kess moved", "NW", d.g.kessQ, d.g.kessQ === "NW");
  });
});

describe("signature ward advantage (catch) effects", () => {
  test("Blackout catch: 2 counter total + 2 Poison", () => {
    boot();
    const d = wardCatch("M", "blackout");
    rowEq("ward:blackout:counter", "riposte 1 + adv 1", 2,
      dmgBy(d.rounds[0].lines, "Riposte", "Maelis") + dmgBy(d.rounds[0].lines, "Blackout counter", "Maelis"));
    rowEq("ward:blackout:poison", "1 base + 1 adv poison", 2, d.g.A.poison);
  });
  test("Gloomveil catch: 2 counter, 1 Poison, then a step", () => {
    boot();
    const d = wardCatch("M", "gloom", { prompts: ["NW"] });
    rowEq("ward:gloom:counter", "riposte 1 + adv 1", 2,
      dmgBy(d.rounds[0].lines, "Riposte", "Maelis") + dmgBy(d.rounds[0].lines, "Gloomveil counter", "Maelis"));
    rowEq("ward:gloom:poison", "1 adv poison", 1, d.g.A.poison);
    row("ward:gloom:step", "warder stepped away", "NW", d.g.P.pos, d.g.P.pos === "NW");
  });
  test("Witch Brew catch: riposte carries +1 Curse", () => {
    boot();
    const d = wardCatch("O", "knit");
    rowEq("ward:knit:curse", "curse from the caught riposte", 1, d.g.A.curse);
  });
  test("Puppet Pull catch: counter + curse + drag prompt", () => {
    boot();
    const d = wardCatch("O", "puppet", { prompts: ["NE", "SE"] });
    rowEq("ward:puppet:counter", "riposte 1 + adv 1", 2,
      dmgBy(d.rounds[0].lines, "Riposte", "Maelis") + dmgBy(d.rounds[0].lines, "Puppet Pull counter", "Maelis"));
    rowEq("ward:puppet:curse", "adv curse", 1, d.g.A.curse);
    row("ward:puppet:drag", "foe dragged one quadrant", "SE", d.g.A.pos, d.g.A.pos === "SE");
  });
  test("Edgeguard catch grants Flow", () => {
    boot();
    const d = wardCatch("X", "eguard");
    row("ward:eguard:flow", "flow banked on adv catch", "flow=true", d.g.P.flow, d.g.P.flow === true);
  });
  test("Bulwark Oath catch: nothing can move him", () => {
    boot();
    const d = wardCatch("L", "oath");
    row("ward:oath:noKB", "_noKB set on adv", "true", "", d.rounds[0].lines.some((t) => t.includes("Oath holds")));
  });
  test("Bedrock Claim catch: adjacent conversion prompt", () => {
    boot();
    const d = wardCatch("D", "claim", { prompts: ["NW"] });
    row("ward:claimAdv:spread", "adjacent quadrant converted", "dom at NW", d.g.terrain.NW?.kind, d.g.terrain.NW?.kind === "dom");
  });
  test("Stonewall: −1 from everything while on Dominion", () => {
    boot();
    const d = wardBreakT("D", "wall", {
      before: (gm) => { gm.terrain.SW = { kind: "dom", until: 9999 }; },
    });
    // basic guard-break 1+1 → both instances reduced to 0
    rowEq("ward:wall:soak", "guard-break fully soaked on Dominion", 0, dmgTo(d.rounds[0].lines, "Dhoram"));
  });
  test("Aegis claims a CONTESTED relic through the ward", () => {
    boot();
    const d = duel({
      p: { fk: "L", load: ["aegis", "llance", "oath", "dawn"], pass: "vigil", set: { pow: 3, hp: 20, maxHp: 20 } },
      a: FOE(), seed: 60,
      rounds: [{
        before: (gm) => { gm.relics.board = ["SW"]; gm.A.pos = "SW"; },
        p: { ab: "aegis" }, a: { ab: "bR", target: "SW" },
      }],
    });
    rowEq("ward:aegis:contested", "contested relic claimed via Aegis", 1, d.g.relics.claims);
  });
});
