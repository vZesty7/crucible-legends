# CRUCIBLE LEGENDS — v0.84 Rework Report

*The five-phase build on the audited v0.83 foundation: doc truth pass, the Koros rework,
AI v2 under World Doctrine, the two-trial merge, tutorial repairs, and the grand re-measure.
All numbers from the shipping engine; old = v0.83 audit baseline, new = this build.
264,000 re-measure games + 233,000 sweep games, HP ledger audited throughout: zero violations,
zero crashes.*

## 1. Class doctrine audit (report only — for the design table)

| Class | Fighter | Pool census | Reads as |
|---|---|---|---|
| Ravager | Gharzul | 2R/3B/1W | doctrinal (5 attacks / 1 ward) |
| Ravager | Ashkarra | 2R/3B/1W | doctrinal |
| Ravager | Zhal | 2R/3B/1W | doctrinal — the v0.76.3 single-ward signature holds for all three |
| Duelist | Maleth | 3R/1B/2W | doctrinal (Rush/Ward tempo) |
| Duelist | Dregan | 3R/1B/2W | doctrinal |
| Duelist | **Wrenna** | **2R/2B/2W** | **FLAG: flat — her class siblings both run 3R/1B/2W** |
| Champion | Koros | 1R/2B/3W | doctrinal (Break/Ward wall) — post-rework, the class exemplar |
| Champion | **Kastor** | **2R/2B/2W** | **FLAG: flat vs the B/W doctrine** (the v0.10 "2/2/2 nudge candidates" note still true) |
| Champion | **Dhoram** | **2R/2B/2W** | **FLAG: flat vs the B/W doctrine** |
| Shaper | Vessk | 3R/1B/2W | doctrinal (Rush/Ward board control) |
| Shaper | Maelis | 3R/1B/2W | doctrinal |
| Shaper | Marrow | 3R/1B/2W | doctrinal — Shapers are perfectly uniform |

Ruling requested: Wrenna, Kastor, and Dhoram are the only fighters off their class pattern.
Kastor/Dhoram flat pools are 15-version-old known debt; Wrenna's flatness compounds her
under-tuning (see §3). No changes shipped — the table is yours.

## 2. Before / after — every fighter, MID and MAX

*(MID: standard loadouts, the new PROVING brain. MAX: best sweep build, the CRUCIBLE brain.
Old MAX values used the pre-rework builds — Koros's old 67.2 was the now-deleted Capacitor
bunker.)*

| Fighter | MID old → new | Δ | MAX old → new | Δ |
|---|---|---|---|---|
| Dregan | 59.1 → **68.5** | +9.4 | 60.0 → 65.5 | +5.5 |
| Kastor | **79.7 → 65.4** | **−14.3** | 71.3 → 72.4 | +1.1 |
| Dhoram | 63.8 → 59.8 | −4.0 | 58.7 → 56.1 | −2.6 |
| Koros | **33.4 → 57.0** | **+23.6** | 67.2 → 47.8 | −19.4 |
| Maelis | 54.0 → 55.0 | +1.0 | 39.8 → 49.6 | +9.8 |
| Ashkarra | 52.9 → 54.8 | +1.9 | 54.9 → 59.3 | +4.4 |
| Vessk | 43.4 → 45.5 | +2.1 | 32.6 → 41.7 | +9.1 |
| Gharzul | 42.1 → 43.8 | +1.7 | 61.0 → 52.5 | −8.5 |
| Marrow | 49.5 → 43.2 | −6.3 | 55.7 → 51.0 | −4.7 |
| Wrenna | 36.1 → 41.4 | +5.3 | 33.4 → 34.1 | +0.7 |
| Maleth | 46.7 → 38.5 | −8.2 | 41.5 → 34.0 | −7.5 |
| Zhal | 39.3 → **27.1** | −12.2 | 23.9 → 35.9 | +12.0 |

## 3. Verdicts on the named questions

**Kastor — the relic-contesting answer: yes, hard.** 79.7 → 65.4 at MID. His relic share of
wins fell from 74.5% to 49%; he sat in 9 of the 14 most-lopsided matchups before, **2 of 10
now**. The world fighting back did most of what a nerf would have — without touching his kit.
He remains the MAX apex (72.4) and 17 of his 45 builds still clear the 65% fence (was 42):
watch, don't panic. The three levers from the audit remain named and unpulled.

**Koros — the trap is cleared and the band is healthy.** As-shipped 33.4 → 57.0 (+23.6, the
largest single gain); at MAX 47.8, because his old 67.2 was the degenerate armor-bunker that
no longer exists. One-dimensionality cleared: winning-game usage reads Gyro 41 / Cannon 22 /
Flux 22 / **Beam 15–16%** — the whole kit works. The Finality Beam **is** the default build:
the new sweep's best overall (60.5%, `cannon/flux/gyro/core` + Overclock) includes it — gap
to runner-up 1.6 points, and that runner-up is the **Arc/Discharge-Field build (58.9%)**: the
Field's chip contribution makes it the strongest non-Beam line. Siege Protocol builds sit
mid-table — a conversion for players, not the AI default.

**Wrenna — the kiting pilot lifts her, the kit still doesn't.** +5.3 at MID (36.1 → 41.4),
below-fence builds improved 40/42 → 30/42, and she's still bottom-three everywhere. The MIN >
MID inversion narrows (MIN wasn't re-run this pass — mid/max per spec) but the conclusion
stands: her problem is printed numbers, compounded by the flat 2/2/2 pool flagged in §1.

**Dhoram — Dominion under demolition: strong and fair, now honestly so.** 59.8 at MID with
the field actively breaking his tiles; seals fell to ~3% of his wins (the AI pressure valve
works). No longer top-two; exactly where a fortress should sit.

**Vessk and Dregan — movement.** Vessk +2.1 MID / +9.1 MAX — the doctrine herding helps his
zone game, but he stays low-band (undertuned verdict unchanged). **Dregan is the new table
leader: 68.5 MID** — the Flow fix plus a smarter field that his pivot punishes. Three of the
ten extreme matchups are his prey (Zhal 13/87 is the game's new worst). The 72.6 MIN
naive-proof watch from the audit now has a MID sibling: **he is the next balance watch item.**

**Zhal — the World Doctrine's casualty: 27.1 at MID (−12.2).** A smarter, objective-hungry
field starves the economy vampire; he sits in **5 of the 10** extreme matchups. His MAX rose
+12 (the Crucible pilots his discipline properly), confirming the Triarch's "lowest floor,
real ceiling" — but the floor now needs designer attention. Flagged, not tuned.

**Maleth (−8.2) and Marrow (−6.3)** — contact-DoT kits pay a tax when the whole field learns
to kite, refuse collisions, and force whiffs. Directionally expected; both flagged for the
next tuning table alongside Zhal.

**Win-type shifts:** Kastor relic-share 74.5% → 49%; Koros flipped from bell-turtle to the
roster's KO leader (3,815 KOs at MID); Dhoram seals down to ~3%. Games still run 9.1–9.5
rounds — pacing intact.

**Matchups beyond 75/25 (10, was 14):** Zhal–Dregan 13/87 · Maleth–Kastor 16/84 ·
Zhal–Kastor 19/81 · Koros–Zhal 79/21 · Maleth–Dregan 23/77 · Gharzul–Dregan 23/77 ·
Zhal–Maelis 24/76 · Vessk–Zhal 75/25 · Zhal–Dhoram 25/75 · Maleth–Koros 25/75.
New names on the wall: Dregan (3) and Zhal (5); Kastor down from 9 to 2.

## 4. Method notes

MID = new PROVING (old-Gauntlet brain + rubber-band matchmaking); comparison to old MID
(Gauntlet) is like-for-like in strength. The AI v2 guardrail (new brain out-pilots the frozen
legacy Proving replica with all 12 fighters, 21,120 games) and the 13 Koros kit guardrails
are permanent tests gating every deploy. Full data: `reports/data/` (v0.83 baselines archived
under `reports/data/v083/`).
