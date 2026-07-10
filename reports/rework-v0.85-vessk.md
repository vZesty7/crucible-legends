# CRUCIBLE LEGENDS — v0.85 Vessk Rework Report: "THE ICE ARCHITECT"

*A depth rework of Vessk on the v0.84 foundation, built to the designer's six-phase brief
(July 10 2026). All numbers from the shipping engine. ~44,000 measured games this pass
(18,480 sweep + 22,000 MID/MAX round-robins + 3,300 build-split), HP ledger audited on every
round-robin game: **zero violations, zero crashes**. All 55 permanent tests green, including
28 new Vessk guardrails. **THE BAND GATE TRIPPED — see §4. Nothing was self-tuned and
nothing was deployed; the ruling is the designer's.***

## 1. What shipped (mechanics)

**SHATTER — now Vessk's global rule.** Any Break he lands, or any Advantage exchange he wins
(triangle win, guard break, or a ward catch's riposte), against a CHILLED target: +1 damage
and the chill is CONSUMED. Once per exchange per source. Only a chill standing when the
exchange *began* can be shattered — the a1 damage-table lab caught the Advantage rider
shattering a chill the same lance had just applied (the self-sufficient loop v0.30.1
explicitly killed), so the law got a timestamp: fresh chills pay next exchange, **no
double-dipping ever**. A consumed chill leaves a one-exchange *echo* that his Ice Elemental —
a separate source — may cash once. Glacial Spike's private shatter text and the retired
Shatterpoint +2 are gone.

**FROST ZONES — unified clock.** Exactly 2 round-ends, then an announced melt
("The frost at NE melts away"). Anchoring and Permafrost are the only stays.
*(Honesty note: the old engine let frost live 3 round-ends; "exactly 2" as specified is a
real nerf to his core loop, and it shows in the numbers — see §4.)*

**WINTER'S MANTLE** — bare counter stance; the Advantage catch pays everything: +1 counter,
heal 2, and his quadrant freezes. **FLASH FREEZE** — unchanged type/cost; the ROOT moved to
base (every landed cast roots next round + paints), Advantage is the plain +1.

**ICE AGE (3◆ Ward, replaces Avalanche).** Every current frost zone births an untargetable
ICE ELEMENTAL (Kess precedent). Anchor: its zone never decays while it stands. Mirror: when
Vessk casts Ice Lance or Glacial Spike aimed at (or colliding in) its zone, it mimics the
same attack on enemies there in the same exchange — base on neutral, the rider on wins, its
own shatter — then it is spent. The countering type breaks it for nothing. Zone-loss (razing,
enemy paint, wrecking throws) removes it; on spend/counter the zone resumes a fresh 2-round
clock. The Finality Beam stuns it (skips its next mirror-turn); the anchored zone holds
against the raze. Scheduled clashes have no aim: **no mirror in clashes — round 10 is
structurally flat**, and tested explicitly anyway.

**Passives:** BLIZZARD (new, replaces Shatterpoint): at the bell, 2+ zones AND a chilled foe —
or 3+ zones regardless — grant Flow. PERMAFROST text updated to the new zone rules.
NUMBING AURA unchanged. Pool census: **2 Rush / 1 Break / 3 Ward** — Glacial Spike is the
sanctioned §6 break, and §6 gained the design-table line: *Duelists spend the pair on the
self; Shapers spend it on the board.*

**Interpretation calls made and flagged** (both in the design doc): (1) the Beam *stuns*
rather than razes an elemental-anchored zone — law iv's "the zone stays frozen" wins over
law iii's "razing"; (2) clashes never mirror (no aim, no collision).

## 2. Truth + teaching

Card texts, codex (frost zones + expiry + anchoring, Ice Elemental full law, Shatter's
consume rule, Blizzard), help screen, and the design-doc Vessk section all rewritten to
shipped truth. The tutorial was rebuilt (8 rails, foe Ashkarra, Blizzard pass, lesson
loadout lance/freeze/spike/iceage): it demonstrates painting + the 2-bell clock, chill
applied and SHATTERED with the consume visible in the feed, a zone melting on screen,
Flash Freeze's root-into-Spike line, Ice Age raising an elemental that refuses its melt,
and the full mirror line (Spike + shatter + mirror + its shatter = 8 damage, live).
Phase-E validated: **20/20 lesson wins, zero exchange losses, all 9 coverage signatures,
zero false claims** (say-lines verified against per-round logs). Disclosed: the story
banks ◆ 7 times (the new kit is cast-expensive; the rail text says so out loud).

## 3. Guardrails (permanent, gate every deploy)

28 new tests in `tests/vessk-guardrails.test.jsx`: shatter once-per-source-per-exchange +
consume + the no-double-dip timestamp + the riposte shatter; Mantle pays only on the catch;
Freeze base-roots and paints; the 2-bell melt vs anchored vs Permafrost; elemental lifecycle
(mirror on win/neutral/countered, only its own zone, collision trigger, spend/counter/
zone-loss removal with fresh clock, Beam stun-not-raze, stun skips the mirror only);
Blizzard both modes with anchored zones counting; the FLAT-FINAL law for both shatter and
elemental damage; and AI discipline (never Ice Age onto a bare board). Full suite: 55/55.

## 4. THE RE-MEASURE — and the STOP

*(MID: standard loadout `lance/hoar/spike/iceage` + Numbing Aura — the sweep's best
Ice-Age build — new PROVING brain, 1,000 games per pairing. MAX: sweep-best build
`lance/hoar/spike/mantle` + Blizzard, CRUCIBLE brain, 1,000/pairing. Both seats.)*

| Measure | v0.84 | v0.85 | Band 52–62 |
|---|---|---|---|
| MID winrate | 45.5 | **46.1** | **OUTSIDE — STOP** |
| MAX winrate | 41.7 | **45.8** | (guardrail is MID) |

**Per the commissioned law — "if he lands outside 52–62: report the number and STOP" —
the number is 46.1, nothing was tuned to chase it, and the deploy is withheld.**

The telemetry says *why*, precisely:

- **Shatter frequency:** 0.80/game at MID. The global rule works, but chill uptime funds it.
- **Max-line frequency** (Spike + shatter + elemental mirror + its shatter in one exchange):
  **once per ~1,400 games** at MID; with Flow too, once per ~5,000. The 6–7 damage line
  exists — the tutorial performs it — but AI play essentially never assembles it.
- **The mirror fires once per ~500 games.** The field AI (World Doctrine) refuses to stand
  on frost, doubly refuses anchored zones, and the 2-bell clock means the stage collapses
  before the actors arrive.
- **Elementals:** born 0.30/game (Ice Age is cast about once every 3 games — banking 3◆
  while also paying for paint rarely happens); of removals, **96.4% die to zone-loss**
  (the field paints and razes constantly), 2.9% spend, 0.7% countered; average lifespan
  1.93 rounds.
- **Blizzard vs Permafrost, build-split (1,650 games each):** Blizzard Flow-uptime **6.5%**
  of planning checkpoints (2+ zones stand just 2.5% of the time; 3+ zones: **0.0% — mode B
  never fired once**). Permafrost zone-uptime: 1.02 zones average, 2+ zones 29.2%,
  3+ zones 4.2%. Permafrost is currently what makes multi-zone Vessk exist.
- **Matchups beyond 75/25:** none. Worst for him: Dregan 32/68, Dhoram 32.8/67.2,
  Koros 38.5/61.5; best: Zhal 72/28 (off the extreme wall — it was 75/25 in v0.84).
- Games run 9.4 rounds; win types healthy (KO 46%, bell 49%).

**Reading:** the rework is depth-neutral on power — the buffs (base root, Mantle's paid
catch, the global shatter) almost exactly offset the zone-clock nerf (3 bells → 2) — and
the new architecture (Ice Age / elementals / Blizzard) is priced out of AI-visible play:
3◆ + standing zones + a foe on the ice is a five-piece puzzle on a two-round timer.

## 5. Levers — named, not pulled (the table is yours)

1. **Ice Age 3◆ → 2◆** — the assembly cost is the single biggest blocker.
2. **Ice Age also paints Vessk's own quadrant before the births** — kills the dead-cast,
   guarantees one elemental, echoes Hoarfrost's fantasy.
3. **Zone clock 2 → 3 round-ends** — restores the pre-rework texture the engine actually
   had; feeds Blizzard and Ice Age simultaneously.
4. **Blizzard thresholds down** (1 zone + chilled / 2 zones regardless) — as printed, its
   strong mode has literally never fired in 1,650 games.
5. **The elemental survives its mirror** (mirrors once per round instead of spending
   itself) — the biggest identity change; would need re-measuring from scratch.
6. **Pilot-only work** (no printed numbers): teach the AI to bank toward Ice Age and to
   herd with shoves onto zones before Spiking. Honest, but unlikely to bridge six points
   alone when the field AI actively refuses the ice.

## 6. Method notes

Sweep: 42 legal builds × 11 foes × 40 games (18,480). Round-robins: 11 pairings × 2 seats ×
500 (11,000 per tier), ledger-audited. Build-split: 11 × 150 × 2 passes. Baselines:
`reports/data/tier-mid.json` / `tier-max.json` (v0.84); new data:
`reports/data/v085-remeasure.json`, sweep refreshed in `reports/data/sweep.json`.
The v0.84 measurements of the other eleven fighters are untouched by this pass; Vessk's
kit changes cannot move their pairwise numbers against each other.
