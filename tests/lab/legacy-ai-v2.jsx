/* A faithful replica of the AI v2 brain (v0.78 combo-intent doctrine + v0.84
   World Doctrine movement + v0.86 state), frozen before the AI v3 rework.
   This is the measuring stick for the v3 gauntlet: "The Mind must out-pilot
   the doctrine tables it absorbed." Mirrors aiMakePlan as of commit v0.86,
   as a seat-agnostic runner policy. */
import { defs } from "./runner.jsx";

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

export function makeV2Policy(rng, diffMode = "proving") {
  const { ABILITIES, QUADS, ADJ, BEATS } = defs();
  let prev = [null, null]; // per-policy staleness memory (was gT.aiPrev)

  const makePlan = (gm, ai, isClash, humanPlanForUmbral) => {
    const human = ai === gm.P ? gm.A : gm.P;
    const hist = (ai === gm.P ? gm.aHist : gm.pHist) || [];
    const predictType = () => {
      if (!hist.length) return null;
      const freq = {}; hist.forEach((t, i) => { freq[t] = (freq[t] || 0) + (diffMode === "crucible" && i >= hist.length - 3 ? 2 : 1); });
      const last = hist[hist.length - 1];
      if (hist.length >= 3) {
        const trans = {};
        for (let i = 0; i + 1 < hist.length; i++) if (hist[i] === last) trans[hist[i + 1]] = (trans[hist[i + 1]] || 0) + 1;
        const top = Object.entries(trans).sort((a, b) => b[1] - a[1])[0];
        if (top && top[1] >= 2) return top[0];
      }
      return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
    };
    const predT = predictType();
    const T = (q) => gm.terrain?.[q]?.kind;
    const comboBias = (id) => {
      const f = ai.fk, hpn = human;
      if (f === "M" && id === "heart" && hpn.poison >= 2) return 8;
      if (f === "M" && id === "viper" && hpn.poison === 0) return 3;
      if (f === "Z" && id === "tap" && ai.pow <= 1 && ai.hp > 4) return 6;
      if (f === "Z" && id === "brand" && !hpn.brandRound) return 5;
      if (f === "Z" && id === "dark" && ai.hp <= ai.maxHp - 3) return 4;
      if (f === "Y" && id === "storm" && ai.pow >= 3) return 6;
      if (f === "Y" && (id === "lash" || id === "bwater") && ["whirl", "surf"].includes(T(hpn.pos))) return 5;
      if (f === "W" && id === "pin" && !hpn.rooted) return 4;
      if (f === "W" && (id === "sky" || id === "broad") && (hpn.rooted || (hpn.mark || 0) > 0)) return 6;
      if (f === "L" && id === "consec" && T(ai.pos) !== "hall") return 5;
      if (f === "L" && id === "dawn" && ai.pow >= 3) return 6;
      if (f === "L" && id === "llance" && T(hpn.pos) === "hall") return 5;
      if (f === "O" && id === "sorrow" && (hpn.curse || 0) >= 3) return 8;
      if (f === "O" && (id === "stick" || id === "eye") && (hpn.curse || 0) < 3) return 3;
      if (f === "X" && ["arsenal", "cadence", "chainX"].includes(id) && ai.flow) return 5;
      if (f === "X" && (id === "eguard" || id === "riposte") && !ai.flow) return 3;
      if (f === "C" && id === "pyre" && (hpn.burn || 0) >= 2) return 5;
      if (f === "V" && ["spike", "lance"].includes(id) && gm.icels?.[hpn.pos] && !(gm.icels[hpn.pos].stun >= gm.round)) return id === "spike" ? 8 : 6;
      if (f === "V" && id === "spike" && hpn.chill) return 5;
      if (f === "V" && id === "iceage") { const fresh = QUADS.filter((q) => T(q) === "frost" && !gm.icels?.[q]).length; return fresh >= 2 ? 7 : fresh === 1 ? 4 : 2; }
      if (f === "V" && id === "freeze" && !hpn.rooted) return 3;
      if (f === "K" && id === "arc" && !ai.dischargeField && ai.pow >= 2) return 6;
      if (f === "K" && id === "core" && ai.pow >= 3) return 6;
      if (f === "K" && id === "frame" && ai.pow >= 3 && ai.hp <= ai.maxHp - 2) return 5;
      if (f === "G" && id === "harvest" && ai.pow >= 3) return 5;
      return 0;
    };
    const comboScale = diffMode === "crucible" ? 1 : 0.7;
    const wantHold = diffMode === "crucible" && [...ai.load].some((id) => ABILITIES[id].cost === ai.pow + 1 && comboBias(id) >= 5);
    const opts = [];
    [...ai.load].forEach((id) => {
      if (id === "heart" && human.poison === 0) return;
      if (ai.pow >= ABILITIES[id].cost) opts.push({ ab: id, soft: false });
    });
    const weighted = [];
    opts.forEach((o) => {
      const ab = ABILITIES[o.ab];
      let w = 2;
      if (ab.dmg >= 2) w = 4;
      if ((ab.cost >= 3 || o.ab === "pyre") && ai.pow >= 3) w = 7;
      if (o.ab === "viper" || o.ab === "cinder" || o.ab === "lance") w = 5;
      if (predT) {
        if (BEATS[ab.type] === predT) w += diffMode === "crucible" ? 6 : 4;
        else if (ab.type === predT) w += 1;
        else if (BEATS[predT] === ab.type) w = Math.max(1, w - 2);
      }
      if (human.pow >= 3) {
        const humanNuke = human.load.some((x) => ABILITIES[x].cost >= 3);
        const humanBreakNuke = humanNuke && human.load.some((x) => ABILITIES[x].cost >= 3 && ABILITIES[x].type === "break");
        if (humanBreakNuke) { if (ab.type === "rush") w += diffMode === "crucible" ? 5 : 3; }
        else if (humanNuke && ab.type === "ward") w += diffMode === "crucible" ? 5 : 3;
      }
      {
        const tickIn = ((ai.burn || 0) > 0 ? 1 : 0)
          + (ai.brandRound === gm.round ? 3 : 0)
          + (human.fk === "O" && (ai.curse || 0) >= 3 && (gm.round || 0) >= (human.pass === "mdeep" ? 7 : 8) ? Math.min(2, Math.floor(ai.curse / 3)) : 0);
        if (tickIn > 0 && ab.type === "ward" && ai.hp <= tickIn) w = 1;
        if (tickIn > 0 && ai.hp <= tickIn + 2 && ["dark", "mantle", "current", "knit", "frame", "aegis"].includes(o.ab)) w += 4;
      }
      w += Math.round(comboBias(o.ab) * comboScale);
      if (prev[0] === o.ab && prev[1] === o.ab) w = Math.max(1, w - 3);
      if (wantHold) { if (ab.cost > 0) w = Math.max(1, w - 3); else w += 2; }
      if (o.ab === "iceage" && !QUADS.some((q) => T(q) === "frost" && !gm.icels?.[q])) w = Math.max(1, w); // v0.85.1: self-paints
      for (let i = 0; i < w; i++) weighted.push(o);
    });
    let choice = null;
    if (isClash && diffMode === "crucible") {
      const loadTypes = [...new Set(human.load.map((x) => ABILITIES[x].type))];
      const safe = ["break", "rush", "ward"].filter((t) => loadTypes.every((x) => BEATS[x] !== t));
      const want = safe.find((t) => loadTypes.includes(BEATS[t])) || safe[0] || (predT ? Object.keys(BEATS).find((t) => BEATS[t] === predT) : null);
      if (want) choice = opts.find((o) => ABILITIES[o.ab].type === want) || null;
    }
    if (!choice && isClash && predT) choice = opts.find((o) => BEATS[ABILITIES[o.ab].type] === predT) || null;
    if (!choice) choice = pick(rng, weighted.length ? weighted : opts);
    const ab = ABILITIES[choice.ab];
    const plan = { ab: choice.ab, soft: false, moveTo: ai.pos, target: null, splash: null, secondary: null };
    if (ab.dual) plan.form = pick(rng, Object.keys(ab.dual));
    if (!isClash) {
      if (ai.rooted) plan.moveTo = ai.pos;
      else if (ab.umbral && humanPlanForUmbral) {
        const dodge = [ai.pos, ...ADJ[ai.pos]].filter((q) => q !== humanPlanForUmbral.target);
        plan.moveTo = dodge.length ? pick(rng, dodge) : ai.pos;
      } else {
        const soph = diffMode === "crucible" ? 1 : 0.6;
        const relics = gm.relics?.board || [];
        const behind = ai.hp - human.hp <= -3;
        const scoreQ = (q) => {
          let v = 0;
          const t = T(q);
          if (relics.includes(q) && q !== human.pos) v += (ai.fk === "L" ? 5 : behind || (human.fk === "L" && (gm.relics?.claims || 0) >= 1) ? 4 : 2) * soph;
          if (human.fk === "L" && (gm.relics?.claims || 0) >= 2 && relics.includes(q)) v += 4;
          if (ai.fk === "L" && relics.some((r) => ADJ[q].includes(r))) v += 1.5;
          if (human.fk === "D" && t === "dom" && [...ai.load].some((x) => ABILITIES[x].type === "break" && ai.pow >= ABILITIES[x].cost)) v += (human.pass === "home" ? 1.5 : 3) * soph;
          if (["frost", "scorch", "env", "mire"].includes(t) && !(ai.fk === "V" && t === "frost") && !(ai.fk === "C" && t === "scorch") && !(ai.fk === "O" && t === "mire")) v -= 2;
          if (["whirl", "surf"].includes(t) && ai.fk !== "Y") v -= 3;
          if (t === "hall") v += ai.fk === "L" ? 3 : -2;
          if (t === "dom" && ai.fk === "D") v += 2;
          if (["whirl", "surf"].includes(t) && ai.fk === "Y" && ai.pass === "rider") v += 2;
          if (ai.fk === "W") v += q === human.pos ? -4 : ADJ[human.pos].includes(q) ? -1.5 : 2;
          if (ai.fk === "M") v += q === human.pos ? (human.hp <= 3 ? 4 : -4) : 0;
          if ((ai.fk === "G" || (ai.fk === "C" && ai.pass === "killheat" && (human.burn || 0) > 0) || (ai.fk === "D" && T(ai.pos) === "dom")) && q === human.pos) v += 2 * soph;
          if (ai.fk === "K" && ai.dischargeField && q === ai.pos) v += 3;
          if (gm.kessQ === q && ai.fk !== "W") v -= 1.5;
          if (gm.icels?.[q] && ai.fk !== "V") v -= 2;
          return v + rng() * (diffMode === "crucible" ? 1.2 : 1.6);
        };
        const cand = [ai.pos, ...ADJ[ai.pos]];
        if (ai.pass === "rider") QUADS.forEach((q) => { if (["whirl", "surf"].includes(T(q)) && !cand.includes(q)) cand.push(q); });
        let best = cand[0], bestV = -Infinity;
        cand.forEach((q) => { const v = scoreQ(q); if (v > bestV) { bestV = v; best = q; } });
        plan.moveTo = best;
      }
      if (ab.needsTarget) {
        const aimP = diffMode === "crucible" ? 0.9 : 0.8 + ((ai.hp - human.hp) >= 5 ? -0.1 : (ai.hp - human.hp) <= -5 ? 0.08 : 0);
        const mHist = (ai === gm.P ? gm.amHist : gm.mHist) || [];
        const moveRate = mHist.length ? mHist.filter(Boolean).length / mHist.length : 0.4;
        const predictMove = (diffMode === "crucible" || ai.fk === "W") && mHist.length >= 3;
        if (human.rooted) plan.target = human.pos;
        else if (rng() < aimP) plan.target = predictMove && rng() < moveRate ? pick(rng, ADJ[human.pos]) : human.pos;
        else plan.target = pick(rng, ADJ[human.pos]);
        if (ab.needsSplash) plan.splash = pick(rng, ADJ[plan.target]);
        if (ab.needsSecondary) plan.secondary = pick(rng, QUADS.filter((q) => q !== plan.target));
      }
    }
    prev = [prev[1], plan.ab];
    return plan;
  };

  const rank = (myT, foeT) => (BEATS[myT] === foeT ? 2 : myT === foeT ? 1 : 0);
  return {
    name: `v2-${diffMode}`,
    plan(gm, me) { return makePlan(gm, me, false, null); },
    planUmbral(gm, me, foePlan) { return makePlan(gm, me, false, foePlan); },
    clash(gm, me) { return makePlan(gm, me, true, null); },
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
      const me = gm.P.fk === p.who ? gm.P : gm.A;
      const v = me === gm.P ? gm.A : gm.P;
      if (p.kind === "terr" && p.tkind === "hall") return p.opts.includes(me.pos) ? me.pos : pick(rng, p.opts);
      if (p.kind === "kb" || p.kind === "placeFoe") {
        if (me.fk === "G" && me.pass === "scent" && p.opts.includes(v.pos) && me.pos === v.pos) return v.pos;
        const hazard = p.opts.find((q) => q !== v.pos && ["frost", "scorch", "env", "mire", "whirl", "surf"].includes(gm.terrain[q]?.kind));
        if (hazard) return hazard;
        const moves = p.opts.filter((q) => q !== v.pos);
        return moves.length ? pick(rng, moves) : pick(rng, p.opts);
      }
      return pick(rng, p.opts);
    },
    craven(gm, me) { const foe = me === gm.P ? gm.A : gm.P; return me.hp < foe.hp; },
    sudden() { return pick(rng, ["break", "rush", "ward"]); },
  };
}
