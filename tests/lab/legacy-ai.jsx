/* A faithful replica of the ORIGINAL v0.63 Proving brain, frozen before the
   AI v2 rework: flat damage-weighted picks, 65% aim with the rubber-band,
   random-leaning movement, no prediction, no clash logic, no objectives.
   Kept as the measuring stick for the "new AI beats old" guardrail. */
import { api, defs } from "./runner.jsx";

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

export function makeLegacyProvingPolicy(rng) {
  const { ABILITIES, QUADS, ADJ, BEATS } = defs();
  const weightedPick = (me, foe) => {
    const opts = [];
    [...me.load].forEach((id) => {
      if (id === "heart" && foe.poison === 0) return;
      if (me.pow >= ABILITIES[id].cost) opts.push(id);
    });
    const weighted = [];
    opts.forEach((id) => {
      const ab = ABILITIES[id];
      let w = 2;
      if (ab.dmg >= 2) w = 4;
      if ((ab.cost >= 3 || id === "aval" || id === "pyre") && me.pow >= 3) w = 7;
      if (id === "viper" || id === "cinder" || id === "lance") w = 5;
      for (let i = 0; i < w; i++) weighted.push(id);
    });
    return weighted.length ? pick(rng, weighted) : opts[0];
  };
  const fillTargets = (plan, me, foe) => {
    const ab = ABILITIES[plan.ab];
    if (ab.needsTarget) {
      const aimP = 0.65 + ((me.hp - foe.hp) >= 5 ? -0.1 : (me.hp - foe.hp) <= -5 ? 0.08 : 0);
      plan.target = foe.rooted ? foe.pos : rng() < aimP ? foe.pos : pick(rng, ADJ[foe.pos]);
      if (ab.needsSplash) plan.splash = pick(rng, ADJ[plan.target]);
      if (ab.needsSecondary) plan.secondary = pick(rng, QUADS.filter((q) => q !== plan.target));
    }
    return plan;
  };
  return {
    name: "legacy-proving",
    plan(gm, me) {
      const foe = me === gm.P ? gm.A : gm.P;
      const id = weightedPick(me, foe);
      const ab = ABILITIES[id];
      const plan = {
        ab: id, soft: false, form: ab.dual ? pick(rng, Object.keys(ab.dual)) : null,
        moveTo: me.rooted ? me.pos : pick(rng, [me.pos, me.pos, ...ADJ[me.pos]]),
        target: null, splash: null, secondary: null,
      };
      return fillTargets(plan, me, foe);
    },
    planUmbral(gm, me, foePlan) {
      const foe = me === gm.P ? gm.A : gm.P;
      const id = weightedPick(me, foe);
      const dodge = [me.pos, ...ADJ[me.pos]].filter((q) => q !== foePlan?.target);
      const plan = { ab: id, soft: false, form: null, moveTo: dodge.length ? pick(rng, dodge) : me.pos, target: null, splash: null, secondary: null };
      return fillTargets(plan, me, foe);
    },
    clash(gm, me) {
      const foe = me === gm.P ? gm.A : gm.P;
      const id = weightedPick(me, foe); // v0.63: "NO clash logic at all"
      const ab = ABILITIES[id];
      return { ab: id, soft: false, form: ab.dual ? pick(rng, Object.keys(ab.dual)) : null };
    },
    umbralMove(gm, me, foePlan) {
      const dodge = [me.pos, ...ADJ[me.pos]].filter((q) => q !== foePlan?.target);
      return dodge.length ? pick(rng, dodge) : me.pos;
    },
    pivot() { return null; },
    prompt(gm, p) {
      const me = gm.P.fk === p.who ? gm.P : gm.A;
      const v = me === gm.P ? gm.A : gm.P;
      if (p.kind === "kb" || p.kind === "placeFoe") {
        const haz = p.opts.find((q) => q !== v.pos && ["frost", "scorch", "env", "mire", "whirl", "surf"].includes(gm.terrain[q]?.kind));
        if (haz) return haz;
        const moves = p.opts.filter((q) => q !== v.pos);
        return moves.length ? pick(rng, moves) : pick(rng, p.opts);
      }
      return pick(rng, p.opts);
    },
    craven(gm, me) { const foe = me === gm.P ? gm.A : gm.P; return me.hp < foe.hp; },
    sudden() { return pick(rng, ["break", "rush", "ward"]); },
  };
}
