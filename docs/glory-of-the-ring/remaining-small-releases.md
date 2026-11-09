# Remaining work and release order — 2026-11-09

This is an engineering estimate, not account-token availability or a promised delivery date. Active effort includes implementation, focused review and QA; CI/deployment waiting is additional. Larger items need decomposition and fresh estimates after inspection. Current user priority is small, complete, individually published fixes. Existing saved progress and working modes must remain usable at every checkpoint.

## Immediate fixes

| Task | Current state | Rough active effort |
|---|---|---|
| GOTR-0010 compact training tabs + agreed public name | Implemented;36 localized browser layouts and offline pack pass; full suite/publication tracked in release handoff | Small, final publication gate |
| GOTR-0011 rounded upper shorts | Isolated geometry fix; matched pose/species QA in progress | 1–2 hours |
| GOTR-0012 coach mitt distance | Measured too close; needs target-distance/contact tuning and straight-jab/roll verification | 2–4 hours |
| GOTR-0012 opponent crowding review | Clean straight jabs already extend; inspect visual spacing/guard, avoid pushing gloves through a block to force extension | 1–2 hours; fixes depend on findings |
| Safe rope crossover | Earlier paths failed forearm/body clearance; unsafe button remains withheld | 4–8 hours initial investigation; may require further design |

## Latest feedback, after these fixes

These remain open in the permanent feedback backlog. Existing first versions are not evidence that the new quality requirements are complete.

| Task | First bounded delivery | Rough active effort |
|---|---|---|
| GOTR-0001 shop discoverability/design | Clear Shop entry, compact categories, prices/states and buy/equip walkthrough | 4–8 hours |
| GOTR-0002 fitted belts/headbands/ribbons | Reference-backed wearable geometry and accurate previews, both species and moving poses | 1–3 days |
| GOTR-0003 wardrobe collections | At least3 distinct designed shorts/gloves/shoes per essential category, not recolors alone | 3–6 days |
| GOTR-0004 purchasable combos | Atomic earned-credit purchases, owned/equipped state, Training/Fight loadouts, previews | 1–2 days |
| GOTR-0005 Play/Watch Burst | Fair queued tactical action with charge/cooldown, pause/KO/round gates | 1–3 days |
| GOTR-0006 compact action controls | Max3 primary combos plus selector/loadout, readable EN/HE/RU, queue preserved | 4–8 hours |
| GOTR-0007 guided Fight IQ lesson | Show→repeat2–3 actual moves, exact sequence/timing feedback, retry/hints | 1–3 days |
| GOTR-0008 explorable adventure | Separate later vertical slice:3 working locations, quest, training, boss, saved return | Several weeks; architecture/prototype needed |
| GOTR-0009 varied original roster | One new fighter with unique art, rig/contact/AI/progression parity | Several days to weeks per fighter; art quality uncertain |

## Remaining ordered PRD gates

F-001 through F-009 have shipped first implementations; open feedback repairs above still apply. The next ordered PRD feature is F-010. User-requested15-second exercises and20/40/60-second fights take priority over older long-duration examples.

| PRD task | Still required / partial status | Rough active effort |
|---|---|---|
| F-010 missions | Resumable short templates, actual quality scoring and rewards | 1–2 days |
| F-011 rival memory | Deterministic fair histogram/counter bias; named styles alone are insufficient | 1–3 days |
| F-012 Coach tactics | Two interventions/templates that actually influence action selection | 1–2 days; coordinate Burst scope |
| F-013 event packs | Existing events are partial; schema validation and2 data-driven examples | 1–2 days |
| F-014 return/archive | Existing digest is partial; truthful archive and7/30-day cases | 1–2 days |
| F-015 station upgrade | One new functional drill and asset change | 1–3 days |
| F-016 character prototype | New authored appearance with rig/IK/phone parity | Several days to weeks; coordinate GOTR-0009 |
| F-017 Skill Fusion | Composer validity, readable input and fair counterplay | 2–4 days |
| F-018 mentorship/legacy | Provenance, persistence and safe recovery | 2–4 days |
| F-019 language/accessibility | Existing EN/HE/RU require complete snapshot, RTL, focus and screen-reader audit | 2–4 days |
| F-020 performance | Automated captures plus named physical iPhone/Android sustained/thermal tests | 2–4 days engineering plus actual-device availability |

## Visual-realism and hardware gaps

The authored face/mane/body/material upgrade plans remain quality gates, not a completed75/100 result. A new asset must preserve the existing rig, skinning, modes and contact. Allow several days to weeks of art iteration, separate from the small bug releases. No rendered multi-angle independent review has established the subjective75-point target. Physical-phone sustained FPS and thermal behavior remain NOT VERIFIED. Linux software-WebGL screenshots do not replace hardware tests. Future backend, online services and licensed-content integrations require separate scope and infrastructure; they are not implied complete by local features.

Each release must pass relevant checks, merge normally after current-main/conflict review, deploy successfully and provide its verified app URL. If capacity becomes tight, stop at the last working published checkpoint, with WIP isolated. Development tools do not expose ChatGPT allowance or reset dates.
