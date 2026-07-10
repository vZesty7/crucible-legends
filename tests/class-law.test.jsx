/* CLASS LAW (design doc §6) — permanent, gates every deploy.
   Every fighter's 6-ability pool leans on its class's type pair at 5-of-6,
   with exactly ONE off-type escape hatch, and always contains all three
   types. Duelists and Shapers share Rush/Ward (self vs board). Vessk's
   post-Ice-Architect census is validated like everyone else's.
   Bonus invariants ridden along: every pool and every aiLoad carries a
   0-cost ability (draft/deadlock law), and every aiLoad covers all three
   types (the v0.61.1 clash-hole method). */
import { test, describe, beforeAll, vi, expect } from "vitest";
import { boot, defs } from "./lab/runner.jsx";

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  boot();
});

const CLASS_PAIR = {
  Ravager: ["rush", "break"],
  Duelist: ["rush", "ward"],
  Champion: ["break", "ward"],
  Shaper: ["rush", "ward"],
};

describe("§6 — five-of-six on the class pair, one escape hatch, all three types", () => {
  test("all twelve fighters conform", () => {
    const { FIGHTERS, ABILITIES } = defs();
    for (const F of Object.values(FIGHTERS)) {
      const cls = F.sub.split("·")[1].trim();
      const pair = CLASS_PAIR[cls];
      expect(pair, `${F.short}: unknown class ${cls}`).toBeDefined();
      const types = F.pool.map((id) => ABILITIES[id].type);
      const inPair = types.filter((t) => pair.includes(t)).length;
      const offType = types.length - inPair;
      expect(inPair, `${F.short} (${cls}): pool must be 5-of-6 in ${pair.join("/")} — got ${types.join(",")}`).toBe(5);
      expect(offType, `${F.short} (${cls}): exactly one off-type escape hatch`).toBe(1);
      for (const t of ["rush", "break", "ward"]) {
        expect(types.includes(t), `${F.short}: pool must contain a ${t}`).toBe(true);
      }
    }
  });

  test("draft and AI invariants: 0-cost everywhere, aiLoads cover the triangle", () => {
    const { FIGHTERS, ABILITIES } = defs();
    for (const F of Object.values(FIGHTERS)) {
      expect(F.pool.some((id) => ABILITIES[id].cost === 0), `${F.short}: pool needs a 0◆ ability`).toBe(true);
      expect(F.aiLoad.some((id) => ABILITIES[id].cost === 0), `${F.short}: aiLoad needs a 0◆ ability`).toBe(true);
      const aiTypes = new Set(F.aiLoad.map((id) => ABILITIES[id].type));
      expect(aiTypes.size, `${F.short}: aiLoad must cover all three types (clash-hole law) — has ${[...aiTypes].join(",")}`).toBe(3);
    }
  });

  test("exact censuses as ruled (regression pin)", () => {
    const { FIGHTERS, ABILITIES } = defs();
    const census = (fk) => {
      const c = { rush: 0, break: 0, ward: 0 };
      FIGHTERS[fk].pool.forEach((id) => c[ABILITIES[id].type]++);
      return `${c.rush}R/${c.break}B/${c.ward}W`;
    };
    const EXPECT = {
      G: "2R/3B/1W", C: "2R/3B/1W", Z: "2R/3B/1W", // Ravagers
      M: "3R/1B/2W", W: "3R/1B/2W", X: "3R/1B/2W", // Duelists (Wrenna conformed v0.86)
      K: "1R/2B/3W", L: "1R/2B/3W", D: "1R/3B/2W", // Champions (Kastor + Dhoram conformed v0.86)
      V: "2R/1B/3W", Y: "3R/1B/2W", O: "3R/1B/2W", // Shapers (Vessk per the Ice Architect rework)
    };
    for (const [fk, want] of Object.entries(EXPECT)) {
      expect(census(fk), `${FIGHTERS[fk].short} census`).toBe(want);
    }
  });
});
