# CRUCIBLE LEGENDS — Full Game Audit (v0.82 series)

*Commissioned by V. Conducted July 2026 on the live engine (post-v0.82.6), through a headless
harness that plays complete real games — relics, Dominion, water, the hawk, the Door, everything.
Successor to the v0.77 Triarch Report; unlike the Triarch, nothing here is a simplified model —
every number comes from the shipping resolution code.*

**Method:** Phase A verified 265 mechanics against card text and doc rulings in scripted scenarios.
Phase B played **413,160 full games**: a sweep of every legal draft+passive build for all 12
fighters (215,160 games vs the standard field), then MIN/MID/MAX round-robins (1,000 games per
pairing per tier, both seats, 198,000 games). The HP ledger was audited on every game: **zero
violations, zero crashes** after the fixes below. Tiers: **MIN** = weakest legal build + random
play; **MID** = standard AI loadouts + the game's own brain (Gauntlet); **MAX** = best sweep build
+ the Crucible brain (full v0.78 combo-intent).

**Disclosed limits:** the field AI does not contest relics and rarely demolishes Dominion (both are
known engine TODOs), so Kastor's and Dhoram's numbers are ceilings against passive opposition;
sim self-prediction adds noise at Gauntlet/Crucible; residual seat bias (~2 points) is cancelled
by both-seat aggregation. Mirrors are excluded (impossible in the real game).

---

## 1. Bugs found and fixed during this audit

| # | Bug | Severity | Ruling violated |
|---|-----|----------|-----------------|
| 1 | **AI Old Marrow crashed the game on round 1** — default AI loadout had no 0◆ ability; at 0◆ the planner had zero legal options and died. Every random matchup vs Marrow was a guaranteed crash. | Game-breaking | v0.10 draft invariant ("no deadlocks at empty Power"); v0.26.1 precedent |
| 2 | **Berserker's Pact drew invisible blood** — the first-clash "both take 1" damage was dealt but its log lines were wiped a statement later; HP dropped with no record. | Rules-integrity | v0.76.2 "LEDGER PERFECT" standard |
| 3 | **Blade Cadence ate its own Flow** — the Flow it banks "for the next ability" was consumed by the same swing's Advantage instance (hidden +1, or +2 under Perfect Edge). Riposte Draw's stance Flow had the same flaw on its own catch. | Rules-integrity | Flow kit rule ("next ability +1"); card text ("bank a new one") |
| 4 | **Skyfall's storm struck a round early** — first volley fired at the end of the cast round; the ruling and the card both say "the NEXT TWO rounds". | Rules-integrity | v0.73 Skyfall v2 spec |

Earlier in this same engagement: the **misplaced end-of-round brace** (v0.82.5) that disabled
income, Doombrand, relic claims, and the Dominion seal in non-Zhal games.

## 2. Phase A — mechanics verification matrix

265 rows: every attack ability's printed base damage (verified in same-type trades) and advantage
rider (+1, or signature "+1 AND effect"), every ward's base utility / catch / guard-break /
chip-through behavior, every status lifecycle (fresh-stamp graces, caps, expiries, detonations),
all terrain effects and durations, all 36 passives, and the economy laws (income, spender denial,
blood pricing, caps, Overclock, Dominion bunker). **All 265 pass post-fix.** Full data:
`reports/data/phaseA-*.json`.

Confirmed-correct highlights that *looked* wrong: curse ticks reduced by Koros's innate armor
(legal); a warding Dhoram tile surviving Quake Fist (legal); Overload Core always landing 5
(4 printed + the inherent powered swing — it can only be cast from full; matches the doc's loop
math "Core from full 4+1").

**Flagged, not fixed (V's call):**
- Doc roster section is stale vs changelog law in ~5 places: Gharzul HP (13 vs true 12), Ruinfire
  adv (+2 vs true +1), Life Tap / Devouring Dark / Gyro Anchor advantage riders (rich old text vs
  true flat +1 per the v0.9.1 flatten).
- **Koros's current kit (one-threshold Capacitor, Overcharge, Discharge Nova) has no design-doc
  entry at all**; the roster section still describes the pre-rework kit and a "Reinforced Chassis"
  passive that no longer exists.
- In-game codex "Sanctuary" entry still claims the retired anchor ("Sanctified Ground anchors him")
  — retired v0.64 when the passive became Hammer of Justice.
- Battle Record loses planning-phase lines (Watcher's Toll commitments, relic manifests, Craven
  slips): shown live, never archived.

## 3. Phase B — the balance laboratory

### Winrates by tier (aggregated over 11 opponents × 1,000 games each)

| Fighter | MIN (naive) | MID (standard) | MAX (expert) |
|---|---|---|---|
| Kastor | 55.9 | **79.7** | **71.6** |
| Dhoram | 69.2 | 63.8 | 58.9 |
| Dregan | **72.6** | 59.1 | 60.0 |
| Maelis | 39.9 | 54.0 | 40.4 |
| Ashkarra | 38.9 | 52.9 | 55.0 |
| Marrow | 62.8 | 49.5 | 56.0 |
| Maleth | 50.5 | 46.7 | 41.7 |
| Vessk | 39.3 | 43.4 | 33.0 |
| Gharzul | 40.6 | 42.1 | 61.4 |
| Zhal | 17.5 | 39.3 | 21.2 |
| Wrenna | 49.2 | 36.1 | 33.6 |
| Koros | 63.5 | 33.4 | 67.2 |

*(MIN/MAX use different builds and policies per tier — compare within a column, not across.)*

### Win-type distribution (MID, share of each fighter's wins)

KO-finishers: Ashkarra 71% KO, Zhal 66%, Dregan 57%, Gharzul 55%, Maleth 53%.
Bell-winners: Marrow 66% bell, Maelis 66%, Koros 59%, Wrenna 50%, Vessk 50%.
**Kastor: 74.5% of all his wins are relic victories.** Dhoram seals Dominion in ~10% of his wins.

### The Kastor problem

The Triarch rated Kastor S "strong AND fair" — *without simulating his relic win*. With relics
live: 79.7% at MID; **42 of his 45 legal builds exceed the 65% outlier fence** (no other fighter
has more than 3); he appears in **9 of the game's 14 most-lopsided matchups**, including the
worst matchup measured: **Maleth vs Kastor 6/94**. Caveat honestly stated: the opposing AI never
contests relic squares, so these are ceilings — but a ceiling this high, this build-proof, marks
him the game's primary balance risk.

### The Koros discovery

His standard loadout (with Overload Core + Arc) is **dead last at MID (33.4%)** — but his best
build (`cannon/flux/frame/gyro` + Overclock: all cheap, never leave full Capacitor) wins **73.4%**
in the sweep and 67.2% at MAX. The haymakers people draft him for actively sabotage his armor
threshold. Widest draft gap in the game (10.9% → 73.4%): the fighter most defined by his draft.

### MID matchups beyond 75/25

Maleth–Kastor 6/94 · Kastor–Marrow 88/12 · Gharzul–Marrow 15/85 · Koros–Dhoram 16/84 ·
Gharzul–Kastor 18/82 · Ashkarra–Kastor 18/82 · Koros–Marrow 18/82 · Koros–Kastor 19/81 ·
Vessk–Kastor 22/78 · Kastor–Wrenna 78/22 · Kastor–Maelis 77/23 · Wrenna–Dregan 24/76 ·
Dhoram–Wrenna 76/24 · Vessk–Dhoram 25/75.

### Sweep outliers (fences: <35% / >65% vs the standard field)

Kastor 42/45 builds above 65, none below 35 — uncontainable. Wrenna 40/42 builds *below* 35 —
under-tuned at the kit level, not the draft level. Maleth, Zhal 36/42 below. Full build tables:
`reports/data/sweep.json`.

### Draft ranges (worst → best legal build, same field — the draft skill ceiling)

Koros 62.5 points · Gharzul 58.6 · Maelis 52.9 · Dregan 47.8 · Dhoram/Ashkarra 45.9 ·
Maleth 43.4 · Kastor 37.5 · Marrow 36.6 · Wrenna 34.1 · Vessk 33.6 · Zhal 30.9.

## 4. Phase C — character metrics

### Complexity (decision surface; weights disclosed in `tests/lab/c-metrics.lab.jsx`)

Wrenna 6.7 · Maleth 6.4 · Maelis 5.7 · Dregan 5.6 · Kastor 5.3 · Dhoram 5.3 · Koros 4.3 ·
Zhal 4.1 · Gharzul 3.7 · Vessk 3.6 · Ashkarra 3.5 · Marrow 3.5.
(The Triarch's "Zhal is simple to operate, hard to time" distinction still holds: timing skill is
not surface complexity.)

### Fun-proxy health (MID data)

| Fighter | Avg rounds | Blowout share | Comeback share | Top ability (share of winning-game actions) |
|---|---|---|---|---|
| Gharzul | 9.1 | 17% | 29% | Skullsplitter 36% |
| Maleth | 9.0 | 32% | **51%** | Viper Fang 42% |
| Vessk | 9.2 | 22% | 21% | Hoarfrost 37% |
| Ashkarra | 8.7 | 30% | 27% | Smokeveil 41% |
| Koros | 9.3 | 13% | 20% | Cannonarm 35% |
| Zhal | 8.5 | 32% | 17% | **Life Tap 50%** |
| Kastor | 8.5 | 16% | 12% | Bulwark Oath 49% |
| Dhoram | 9.1 | 33% | 12% | Grind 37% |
| Maelis | 9.4 | 25% | 20% | Current 46% |
| Wrenna | 9.1 | 19% | 24% | Hawk's Eye 40% |
| Dregan | 9.0 | 33% | 17% | Edgeguard 48% |
| Marrow | 9.5 | 23% | 22% | **Pinstick 54%** |

Games run 8.5–9.5 rounds at every tier — the "regularly reach the late clashes" design goal holds.
No matchup averages blowout territory. Concentration flags: Zhal (half his play is Life Tap),
Marrow (Pinstick 54%), Kastor (74.5% of wins from one win-type).

## 5. Phase D — tiers and verdicts

**POWER at MIN:** S Dregan, Dhoram · A Koros, Marrow, Kastor · B Maleth, Wrenna, Gharzul ·
C Maelis, Vessk, Ashkarra, **Zhal (17.5)**.
**POWER at MID:** S **Kastor (79.7)** · A Dhoram, Dregan, Maelis, Ashkarra · B Marrow, Maleth,
Vessk, Gharzul, Zhal · C Wrenna, Koros-as-shipped.
**POWER at MAX:** S Kastor, Koros · A Gharzul, Dregan, Dhoram, Marrow, Ashkarra · B Maleth,
Maelis · C Wrenna, Vessk, Zhal.
**COMPLEXITY (hardest first):** S Wrenna, Maleth · A Maelis, Dregan, Kastor, Dhoram · B Koros,
Zhal · C Gharzul, Vessk, Ashkarra, Marrow.
**FUN-PROXY HEALTH:** S Gharzul, Wrenna, Vessk (varied, dramatic, no flags) · A Maleth (comeback
king), Ashkarra, Maelis, Dregan, Koros · B Dhoram, Marrow · C Zhal (one-ability), Kastor
(one-win-type).

### Per-fighter verdicts

- **Gharzul — healthy.** Mid-pack as shipped (42.1), strong in expert hands (61.4 at MAX), varied
  kit use, second-widest draft range. The axe is fine.
- **Maleth — healthy, by a thread.** 46.7 at MID and the roster's best drama (51% comeback wins),
  but his ceiling is the lowest of any non-flagged fighter (49.3 best build) and Kastor deletes
  him (6/94). Fix Kastor first, then re-measure.
- **Vessk — undertuned.** 43.4/33.0 at MID/MAX; zero builds above 47.7%. The zone game pays rent
  but never buys the house.
- **Ashkarra — healthy.** 52.9 MID, KO identity (71%), the burn engine post-v0.78.2 is real.
- **Koros — broken-mechanically (as shipped).** Not the kit — the default draft. 33.4% with the
  standard load vs 73.4% with the bunker build is the game's widest gap; his shipped AI loadout
  actively fights his own Capacitor. Also: his current kit has no design-doc entry.
- **Zhal — one-dimensional + skill-gated.** Life Tap is 50% of his winning play; 17-21% floor at
  naive/expert tiers; only economy discipline (MID 39.3) keeps him breathing. The Triarch's
  "lowest floor, real ceiling" still true — but the ceiling needs a live human.
- **Kastor — overtuned; the strongest, unfairly.** 79.7% MID, 74.5% of wins by relic, 42/45
  builds over the fence, 9 of 14 extreme matchups. Even discounting the AI's failure to contest
  relics, no other fighter is this insensitive to draft or matchup. Named levers (not pulled):
  relic claims require ending the round *unwarded*; or 3 relics → +heal/◆ and 4 to win; or
  enemy claims heal 2 (v0.59 reverted).
- **Marrow — healthy-ish, one-note.** 49.5 MID with the fixed loadout; Pinstick 54% of his play;
  the curse clock reads as designed (66% bell wins).
- **Dhoram — strong and fair.** 58.9–69.2 across tiers, Dominion seals ~10% of wins, demolition
  counterplay confirmed working in Phase A. Watch: AI opponents rarely demolish (known TODO), so
  his true number vs humans is a bit lower.
- **Maelis — healthy.** 54.0 MID; identity intact (bell-winner, water rent); expert play doesn't
  scale her (40.4 MAX) — her power is in the zone, not the pilot.
- **Wrenna — undertuned, and the hardest to fly.** Bottom-three at every tier, 40/42 builds below
  the low fence, and the highest complexity score in the game (6.7). Hard + weak is the worst
  quadrant on the roster. The kit needs numbers, not ideas.
- **Dregan — healthy, verging on strong.** 59-60 at MID/MAX and 72.6 at MIN — the most
  naive-proof fighter in the game (pivot insurance works too well?). Post-Flow-fix numbers;
  watch him in live play.

### Callouts

- **Strongest fairly:** Dhoram.
- **Strongest unfairly:** Kastor — the alt-win warps drafts, matchups, and win-types at once.
- **Weakest:** Wrenna (kit-level), Zhal (floor-level).
- **Widest min-to-max gap (draft skill ceiling):** Koros, 62.5 points.
- **Matchups beyond 75/25 at MID:** 14 (list above); 9 involve Kastor.

*Phase E (tutorial audit) reported separately below.*
