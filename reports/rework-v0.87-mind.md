# CRUCIBLE LEGENDS — v0.87 Rework Report: AI v3, "THE MIND"

*Weighted dice are dead. The AI now models, plans, and adapts. ~160,000 measured games
this pass (25,600 gauntlet + 132,000 re-measure + transcripts), HP ledger audited:
zero violations, zero crashes. Self-play/evolutionary tuning: explicitly out of scope
by designer's law — flagged below, none built.*

## 1. The architecture (plain words, for future sessions)

One brain, four organs, all state on `g.mind`, all reasoning logged for audit:

- **THE PROFILE** — a live, recency-weighted model of the opponent built from every
  reveal: type tendencies, ward-rate when wounded, rush-rate after taking a hit,
  full-bank habits, movement rate (and post-collision flight), aim habits — plus
  doctrine priors the World taught us to expect (Kastor marches at relics, Dhoram
  stands his stone, hazards repel). Crucible exploits the profile at full weight;
  the Proving reads the obvious, not the soul (0.45 weight).
- **THE PLANNER** — every affordable ability × move × target is simulated ONE ROUND
  FORWARD against the profile's predicted action distribution: triangle outcomes,
  riders, ripostes, shatters, elemental mirrors, on-contact statuses, ward utilities,
  knockback rights, round-end ticks both fighters will eat (burn, brands, curse
  collection, terrain, companions, the Field), relic value, and cost friction.
  The v2 doctrines are now FEATURES of this score, not competing weight hacks.
  Selection is temperature-mixed softmax — never argmax: Crucible runs cold (τ=0.30),
  the Proving hot (τ=0.95), and the Proving's rubber-band matchmaking lives in the
  temperature (eases when far ahead, sharpens when far behind — never mercy).
  Crucible adds pattern-breaking: 12% of the time it plays a NEAR-best line
  (EV gap < 0.5 — tightened after transcript bout 1 caught a 1.46-EV sacrifice
  handing Kastor a six-round relic win; unpredictability must never buy a blunder).
- **THE WAR PLAN** — a win condition per fighter doctrine (burn-clock, venom-execute,
  winter-architecture, relic-march, the-seal, the-siege, blood-race, the-debt,
  the-rent, kite-and-mark, tempo, the-red-line) applied as EV multipliers, with a
  pace check from round 6: a collapsed plan (no claims by 7, tiles short, HP deficit)
  switches to THE RACE — every switch logged and auditable.
- **THE ENDGAME SOLVER** — clashes are small closed games: the Mind builds the real
  payoff matrix over both players' affordable picks and plays fictitious-play mixed
  strategies. Round 10 uses P(win) payoffs under the untouched flat-final law; round 9
  folds the projected round-10 value into planning; round-10 placement after a clash
  win maximizes the bell's damage. Crucible plays the solution (τ=0.06); the Proving
  plays it noisily (τ=0.8).

v2 is frozen at `tests/lab/legacy-ai-v2.jsx` as the permanent measuring stick.
The tutorial rails still own the lessons (untouched); Umbral honesty law kept: the
reveal steers only the dodge, never the scoring.

## 2. The gauntlet (permanent, gates every deploy)

| Gate | Result |
|---|---|
| (a) v3-Crucible vs v2-Crucible, all 12 fighters (~500 games each) | **all 12 pass** — aggregate **69.6 vs 50.2** |
| (b) v3-Proving vs v2-Proving | all 12 pass — aggregate **68.9 vs 49.0** |
| (b) THE TWO DOORS: v3-Crucible vs a Proving-grade field | **70.9%** — the doors feel different |
| (d) Performance law | **0.23ms mean, 52ms worst** across 114,181 plans (budget 8/120ms) — imperceptible on any phone |
| (e) Fun guard: usage diversity vs pinned v0.84 baselines | **no collapse** — entropy within noise for all 12 (biggest top-share drift: Wrenna 39→50%, Vessk 35→47%, both under the bar) |

## 3. The re-measure — every fighter vs v0.84 (MID, 1,000/pairing; MAX in parens)

| Fighter | v0.84 → v0.87 MID | Δ | Reading |
|---|---|---|---|
| Vessk | 45.5 → **61.4** | **+15.9** | the headline: the Mind can finally pilot the Ice Architect — banking to Ice Age, herding onto zones, cashing mirrors. Lands inside the designer's original 52–62 band. (MAX 64.4, +22.7) |
| Dhoram | 59.8 → 67.6 | +7.8 | the Mind seals with discipline — **new watch item at the top** |
| Wrenna | 41.4 → 49.0 | +7.6 | the kiting pilot she always needed; her buff session may need less than feared |
| Maelis | 55.0 → 61.9 | +6.9 | zone rent collected properly |
| Kastor | 65.4 → 67.0 | +1.6 | still the standing watch item; **3,360 of his wins are relic alt-wins** — the Mind marches him hard |
| Koros | 57.0 → 57.9 | +0.9 | stable exemplar |
| Gharzul | 43.8 → 46.1 | +2.3 | modest |
| Maleth | 38.5 → 34.0 | −4.5 | contact-DoT tax worsens — flagged (again) |
| Ashkarra | 54.8 → 47.5 | −7.3 | the Mind kites her burn engine at MID (MAX 71.3, +12 — her ceiling is intact) |
| Dregan | 68.5 → 58.8 | −9.7 | **the standing watch flag resolves itself** — a field that reads pivots brings the table leader into band |
| Marrow | 43.2 → 34.2 | −9.0 | contact-DoT tax — flagged with Maleth |
| Zhal | 27.1 → **14.6** | **−12.5** | **exactly as the brief predicted: the sharper world starves the economy vampire further. REPORTED, NOT TUNED — his floor now demands the designer's table.** |

**Matchups beyond 75/25: 18 (was 10).** Zhal sits in ELEVEN of them (worst: Vessk–Zhal
94/6, Gharzul–Zhal 87/13, Koros–Zhal 87/13, Ashkarra–Zhal 85/15). The others: Maleth
under 22% vs Vessk/Koros/Kastor and 10/90 vs Dhoram; Marrow under 20% vs Ashkarra/
Kastor/Dhoram; Ashkarra–Dhoram 21/79. A smarter world polarizes: strong kits get
stronger pilots, weak kits get read. Games run 8.3–9.4 rounds; pacing holds.
*(MAX method note: best builds are the standing sweep entries — v0.85.4-era for Vessk,
v0.84 for the rest — piloted by v3-Crucible; a fresh full sweep was not in scope.)*

## 4. The sparring transcripts

`reports/transcripts-v3.md` — three full Crucible games vs the frozen v2 mid-tier
brain, every round annotated with the Mind's verbatim planning log: profile
predictions ("predict rush 52%/break 24%/ward 24%"), candidate EVs
("Smokeveil@SW EV 2.00 · Cinder Jab@SW→NE EV 0.54"), war plans and their switches
("burn-clock collapsed (HP deficit) → the-race"), and clash matrices
("FINAL solver: … 72% → Combustion"). Results: Ashkarra outlasts Kastor to the
bell 11–2; Vessk KOs Dregan in 6; Zhal KOs Maelis in 6 (yes — the Mind can still
win with Zhal when the matchup allows; his problem is the field, not the pilot).

## 5. Flagged, not decided

1. **Zhal 14.6** — the printed-numbers ruling the last three reports have asked for
   is now urgent; every brain upgrade since v0.63 has lowered his floor.
2. **Marrow 34.2 / Maleth 34.0** — the contact-DoT family pays the kiting tax; likely
   want the same table session.
3. **Kastor 67.0 with a heavy relic share** and **Dhoram 67.6** — the two Champions
   now bracket the top; levers remain named from v0.83 (unwarded-claim, 4-relics,
   steal-heal) and untouched.
4. **Self-play/evolutionary tuning** — out of scope by law; noted that the EV weights
   (status values, war-plan multipliers) are hand-set and a future session could fit
   them from match data without touching architecture.
5. Vessk's MID band re-entry (61.4) was achieved by PILOT alone — no printed number
   moved. Worth recording as precedent for "AI-first" balance passes.
