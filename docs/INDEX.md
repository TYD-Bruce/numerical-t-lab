# Numerical T Lab Documentation Index

## Start here

- [README](../README.md) — public project overview, operation, limitations, and
  Changelog.
- [AGENTS](../AGENTS.md) — Codex repository map and operating contract.
- [PLAN](../PLAN.md) — active milestone, next action, and review gate.
- [GOALS](../GOALS.md) — durable product direction.
- [Current architecture](architecture/CURRENT_ARCHITECTURE.md) — implemented
  Architecture v1 ownership and runtime map.
- [Dependency rules](architecture/DEPENDENCY_RULES.md) — allowed and forbidden
  workspace dependency directions.
- [Deployment architecture](architecture/DEPLOYMENT_ARCHITECTURE.md) — local
  build, Vercel adapter, SPA fallback, and evidence boundary.
- [Project handoff](PROJECT_HANDOFF.md) — latest released platform state.
- [Numerical contracts](contracts/NUMERICAL_CONTRACTS.md) — authoritative numerical
  behavior.
- [Mathematical presentation contract](contracts/MATHEMATICAL_PRESENTATION.md) —
  authoritative learner-facing number, notation, approximation, and accessible
  formula-display policy.
- [Visual + Motion Language v1](contracts/VISUAL_MOTION_LANGUAGE.md) —
  authoritative visual hierarchy, semantic change markers, motion ownership,
  replay, reduced-motion, and interruption policy.

## Current active milestone

**AI Tutor Connections v1 — chunk 1C independently passed; chunk 2A next.**
The maintainer explicitly resumed. Chunks 1A and 1B passed independent audit
and are committed locally at `2e20a3a` and `b9fad94`. Chunk 1C's independent
audit also passed with no findings; see the [current checkpoint](tutor/HANDOFF.md#current-chunk-1c-checkpoint).
Local assets/CSP pass 112 files / 1,579 tests, typechecks, boundaries and build.
Browser evidence covers both Labs with external requests blocked and records
the separate minimal beforeunload automation limitation.
The complete feature scope includes personal connections
only with local frontend/backend, native Windows, strict offline local models,
session-only credentials, all requested cloud providers with explicit Kimi
regions, and Tutor interfaces for both ODE and Linear Systems.

- [Design](superpowers/specs/2026-09-25-ai-tutor-connections-v1-design.md)
- [Repository-grounded implementation plan](superpowers/plans/2026-09-25-ai-tutor-connections-v1-implementation-plan.md)
- [Feature handoff](tutor/HANDOFF.md)
- [Review verification and chunk 1A evidence](reviews/2026-09-25-ai-tutor-connections-review-and-chunk-1a.md)
- [Chunk 1B evidence](reviews/2026-09-25-ai-tutor-connections-chunk-1b.md)
- [Chunk 1C evidence](reviews/2026-09-25-ai-tutor-connections-chunk-1c.md)

Next gate after this local chunk 1C commit: chunk 2A adapters, followed by
independent GPT-6 Astra / Extra High audit and any corrections. The personal session API is explicitly
enabled locally; public provider operations remain unavailable.
Personal key UI, providers and both-Lab integration remain later
rounds. Each chunk requires audit/fix/re-audit before its local commit. No chunk
is pushed individually; all chunks and the final independent overall audit
must pass before push and Vercel demo update. Live provider calls remain separate.
Current released-state evidence remains in [PROJECT_HANDOFF.md](PROJECT_HANDOFF.md).
Older milestone and next-gate statements below describe historical checkpoints;
the Current active milestone section above governs this feature's next action.

## Previous milestone — Production release closeout

`PLAN.md` previously pointed to **Final Production Release Closeout**. Method Teaching
Alignment v2 and Cross-Lab Presentation System v1 are **FROZEN** at
`5ee063bf5d33d872305c46d495a84f4e95e128c5` (tree
`1fd08e3d2e9c641f3e6fc148606c33484ea320a2`). Cross-Lab Presentation Phase 7
is **COMPLETE / ACCEPTED** after its final audit passed with `P0 = 0`,
`P1 = 0`, `P2 = 0`, and `P3 = 2`. Its two release carry-forwards are closed
by the bounded `/ode` product-truth correction and current canonical status.

Cross-Lab Presentation Sync Phase 6 remains **MAINTAINER ACCEPTED** at
`411e641d8cc6b14240acc408130876781fb1ee84` (tree
`92f79cba8bdabafb9a97e3a99d76ddff853fe35c`) with
`P0 = P1 = P2 = P3 = 0` as historical point-in-time evidence.

The
[Cross-Lab Method Teaching Alignment v2 design](superpowers/specs/2026-08-22-cross-lab-method-teaching-alignment-v2-design.md)
is **FROZEN** after the final Method Teaching release audit passed with
`P0 = P1 = P2 = P3 = 0`, and its
[repository-grounded implementation plan](superpowers/plans/2026-08-22-cross-lab-method-teaching-alignment-v2-implementation-plan.md)
now contains the current responsibility-based reconciliation ledger. Phase 0 is accepted at
`77047d9d570d8cf9416991e8e0c17d7485acab8b` (tree
`7ff318fcdf6d08adf716792f509826b27b648520`), and Phase 1 is
Maintainer-accepted at `712fa1d68ced31d1a85b6c13aa4daf93882b8f9b` (tree
`49f1716f2cc9208068d61f70159396af3b53573b`).

Phase 2 is now **MAINTAINER ACCEPTED** at
`24b3c6859a7d3e066f853fee05b1acdd5608a5a5` (tree
`27529fdd88a81b84731374ca999e783800a51183`) with final severity
`P0 = P1 = P2 = P3 = 0`. Its Problem foundation, three-group/eight-method
landscape, learner-safe selected shell, mobile Read selected method action,
secondary Compare branch, family-specific order preservation, and
Continue-to-Data transition remain the accepted opening. The audit metadata
and selected-content inset findings are closed.

Phase 3 one-step teaching is **MAINTAINER ACCEPTED** at
`1703c6898a54150538e1f2e33758b0f01bc45a69` (tree
`59ba7693c69da6eb4166aa667676bfa835032a79`) with independent-audit severity
`P0 = 0`, `P1 = 0`, `P2 = 0`, and `P3 = 2`. Exactly Forward Euler,
Backward Euler, Taylor Method (Order 2), and Runge-Kutta 4 receive complete
learner-safe selected lenses with dominant readonly mathematics, approved
supporting equations, formula anatomy, ordered process, implementation facts,
qualified boundaries, native advanced detail, selected concepts, and
after-solve guidance. Forward/Backward Euler and RK4 use the accepted static
diagrams; Taylor intentionally does not. `PHASE3-P3-01` is closed by this
canonical acceptance record. `PHASE3-P3-02` is closed by extending the existing
learner/governance disconnect test to the selected-lens renderer; Production
teaching view code remains disconnected from the audit-only owner.

Phase 4 history/second-order teaching is **MAINTAINER ACCEPTED** at
`b554d29c7448a394582417de81911cbbb7c56eb0` (tree
`b8221cf818c91fe75c51490b8a7732b592336831`). Its independent audit returned
`P0 = 0`, `P1 = 0`, `P2 = 0`, and `P3 = 1`; documentation/status item
`PHASE4-P3-01` is **CLOSED**. The preflight closed
both Phase 3 P3 findings in `f574f16f9eae57e263b638ded11a534d839e8cf7` (tree
`74e3d0f7307d6486787b469f85663ec8bc35e83f`); the four authorized lenses are
implemented in `1fcc053108c0e11988cb20c9d36759e11eab97f6` (tree
`cafb22f0a17ef49cabc2729e85cb23be8875db68`) and browser-refined in
`8d657199eb00362e07db30d157ab3925dc4ece60` (tree
`8d247dede67e531e795f6b0a7161f5c1d571a478`). Adams-Bashforth,
Adams-Moulton, BDF, and Leap-Frog now join the four accepted Phase 3 methods in
complete learner-safe selected lenses.

Maintainer pre-audit review then recorded `PHASE4-VIS-01` (P2 composition).
The correction candidate at `45cf1326e4686cd1d807e223883541d3b48a51bf`
(tree `f3df72b0c69b4dc0a71fe1a0b66d1c6021c2e2cd`) places the full landscape
above the full selected lens at every width, changes the Adams-Moulton fork to
a vertical teaching sequence, and adds one disposable ODE-local contextual
return to the landscape. The existing mobile Read selected method action
remains based on measured distance.

The bounded integration freeze found all later implementation responsibilities
already satisfied by accepted current behavior: concepts, after-solve guidance,
Compare integration, Method-to-Data transition, responsive/mobile,
accessibility, Light/Dark, lifecycle, all-eight completeness, mathematical and
content audit, bundle/lazy ownership, and cross-Lab regression. The historical
Phase 5/6 slices are obsolete/superseded; integrated Phase 7 evidence is
satisfied; only the separate final release verdict remains. No product source,
numerical algorithm, teaching authority, session schema, family-order
authority, Compare, Data, Output, Convergence, Tutor, Glossary, Linear Systems,
Motion, PDE, dependency, push, deployment, or Production state changed.

The exact next gate is **Production release closeout and Production
verification** from the exact reviewed release commit. Motion remains paused;
Linear Algebra Tutor and PDE remain separately gated future work.

## Superseded Teaching v2 milestone record

The following section preserves the prior active milestone text as historical
execution evidence. Its former next-gate statements are superseded by the
Cross-Lab design gate above.

[PLAN.md](../PLAN.md) previously pointed to **Linear Systems Teaching v2**. Direct
maintainer browser review accepts the current numerical, lifecycle,
accessibility, mathematical-presentation, and motion checkpoints as useful
engineering evidence but does not accept the learner-facing Lab as teaching-
complete. The new
[Teaching v2 design](superpowers/specs/2026-08-11-linear-systems-teaching-v2-design.md)
and
[implementation plan](superpowers/plans/2026-08-11-linear-systems-teaching-v2-implementation-plan.md)
require visible method/term teaching, proper authored mathematical typesetting,
full trace-owned matrix transformations, explicit `P b`, complete triangular-
solve calculations, and a residual-led Diagnostics hierarchy. The design also
records the smallest required trace extension and keeps Gaussian elimination
with partial pivoting as the only runnable method.

The maintainer approved the design and plan at
`e6ecfac7ba11d2825d099070345c1d8c35c15596`. Teaching v2 Phase 0 is now
implemented as one removable DEV-only capability route plus a small authored
MathML helper. Browser evidence at 1440 × 900, 390 × 844, and 320-pixel reflow
in Light and Dark selects **Outcome B — Hybrid accepted**: MathML owns accents,
matrices, fractions, scripts, norms, and authored algebra; ordinary controlled
DOM/CSS owns responsive transformation flow and arrow geometry. The fixture,
helper, and spike CSS are excluded from Production assets, and the current
Linear Systems route remains unchanged.

Teaching v2 Phase 1 is implemented, independently audited at
`P0 = P1 = P2 = P3 = 0`, and maintainer-accepted. The pure
Linear Systems producer now emits `factorization_start.initialU`, complete
immutable `uBefore`/`uAfter` matrices for every row swap and elimination, and
one `right_hand_side_permutation` record copied from the exact `permutedB`
consumed by forward substitution. Phase 2 now consumes those authoritative
records in the production Linear Systems route. The static Teaching v2 surface
provides visible Method teaching, native-MathML solution/factor displays, full
matrix transformations, explicit `P b`, ordered substitution equations, and a
residual-led Diagnostics sequence. Representative numerical projections
excluding trace remain bit-identical to the accepted Phase 0 baseline, and
controlled pivot failure retains only evidence through its stopping point.

Architecture v1 remains frozen. The accepted Day 1 core still owns the
numerical algorithm, presets, immutable results, and trace production; Day 2
still owns the independently lazy route, frontend session/workflow, lifecycle,
Resume, accessibility, and responsive integration. The existing
[Linear Systems v1 design](superpowers/specs/2026-08-10-linear-systems-lab-v1-design.md),
[v1 plan](superpowers/plans/2026-08-10-linear-systems-lab-v1-implementation-plan.md),
[mathematical presentation contract](contracts/MATHEMATICAL_PRESENTATION.md),
and [Visual + Motion contract](contracts/VISUAL_MOTION_LANGUAGE.md) remain
valid for their existing responsibilities. Motion implementation exists, but
its final freeze/audit is paused because Teaching v2 changes its mounting
surface. Phase 0 changed no numerical contract or Computation Trace. Phase 1
changed only bounded immutable trace evidence and its tracked contracts.
Phase 2 changes presentation only: the existing motion source remains, but is
unmounted so the static teaching contract can be audited independently. There
is no numerical, trace-producer, session, route, architecture, Tutor, Glossary,
dependency, push, or deployment change. The independent Phase 2 audit passed
with two P3 carry-forwards. The maintainer correction pass closes those P3s
and implements MTC-01 through MTC-06: profile-owned GEPP teaching, approved
right-hand-side wording, an equations-to-matrix example, result-snapshot
context in Output and Diagnostics, and learner-centered residual teaching.
The final teaching-copy audit subsequently returned **BLOCKED — FINAL TEACHING
COPY NEEDS CORRECTION** with `TC-01` and `TC-02` at P2 and `TC-03` at P3.
That bounded copy correction is now complete locally: visible prose explains
meaning, native MathML displays mathematics, and accessible formula labels
retain spoken mathematical wording. Diagnostics, selected-method teaching,
backward-substitution walkthrough copy, component markers, and residual-detail
labels are corrected without numerical, trace, architecture, MathML, motion,
Tutor, or Glossary changes. The next gate is a narrow independent teaching-copy
re-audit, followed by final Maintainer Teaching Acceptance. Cross-Lab
Presentation Sync remains deferred until those gates pass; motion remount and
Tutor remain later gates.

Latest architecture prerequisite review:
[Architecture v1 Migration Review](reviews/2026-08-11-architecture-v1-migration-review.md)
— verdict **ARCHITECTURE V1 LOCALLY MIGRATION-COMPLETE — READY FOR MAINTAINER
ACCEPTANCE**; 82 files / 1,168 tests, all workspace typechecks, build,
dependency boundaries, manifest exclusions, and local desktop/mobile browser
equivalence are green; no push or deployment.

The accepted production baseline includes the production-ready Initial Value
Problems Lab and closed Glossary E1/E2/E3/F2 gates. The historical record below
is retained for traceability and does not reopen those gates.

### Historical accepted Glossary record

The underlying Content-Agnostic Interactive Glossary Framework's approved
design and repository-grounded implementation plan are documented. The
corrected framework plan passed conservative re-audit, Commit 1 was
accepted after conservative audit, the readonly-math prerequisite is locally
verified, and Commit 3 shared surfaces are implemented and locally/browser
verified with two lifecycle follow-ups accepted by final conservative
re-audit. Commit 4 completes the DEV-only Playground, development controls,
About entry, shortcut, fixture matrix, and production-exclusion evidence. The
four-phase implementation completed its first 2026-07-28 full framework
release review with verdict **RELEASE BLOCKED**. Its P1 pending-load
scope-replacement defect, substantive P2 one-shot Tab-bridge defect, and
DEV-only P3 log finding were narrowly repaired. The repeated independent final
review then returned **APPROVED FOR LOCAL FRAMEWORK RELEASE**. The blocked
review remains indexed as historical evidence; the framework is now locally
accepted as complete.
The generic production registry still contains no Glossary entries. The
deployed Production Host remains inert because E2 was not pushed or deployed;
the local E2 build supplies its accepted ten-card registry only through the
complete-IVP route binding. All Playground capabilities remain DEV-only.
The bounded Project Identity Migration is complete.
The GitHub repositories, remotes, existing Vercel project, Git integration,
Preview, Production deployment, canonical domain, and canonical local
workspace are migrated and verified.

A parallel private-source-reviewed terminology and teaching-language
foundation is complete through project-language approval. Yiding (Bruce) Tian
recorded all nine decisions on 2026-07-28, and the terminology, notation, and
teaching-voice standards are maintainer-approved Version 1. The Glossary
catalog and project copy audit are reconciled across all 197 term IDs and 55
copy records, with an A–F implementation plan and machine-checkable local
traceability. Groups A through D are accepted; `COPY-003` remains held. Group
F1 implements `COPY-043` locally and completes the pre-Glossary consistency
review. Its four language findings and one deterministic Tutor behavior
finding are `CLOSED_VERIFIED` by the separately authorized two-commit repair
with verdict **PRE-E REPAIR COMPLETE — GROUP E MAY BE PLANNED**. Both repair
commits are accepted prerequisites. The documentation-only ODE Glossary Wave 1
design and content governance is maintainer-approved with verdict **DESIGN AND
CONTENT APPROVED — E1 AUTHORIZATION REQUIRED**. Yiding (Bruce) Tian approved
D01–D18 as Option A, all ten cards with exact revisions, and all ten annotation
records on 2026-07-29. At that approval checkpoint, E1, E2, E3, and production
Glossary content were unauthorized; Group F2 remained mandatory after E3. A
subsequent authorized E1 attempt stopped before source or test changes at a
confirmed schema mismatch:
the accepted compact model cannot represent the approved rich cards. The
maintainer selected `E1-SCHEMA-01 = Option 2` and rejected a compact
projection. The generic
[rich-model design](superpowers/specs/2026-07-29-rich-glossary-content-model-design.md),
[field matrix](content/RICH_GLOSSARY_CONTENT_FIELD_MATRIX.md), and
[design-readiness review](reviews/2026-07-29-rich-glossary-content-model-design-readiness-review.md)
are complete with verdict **RICH GLOSSARY MODEL DESIGN COMPLETE —
IMPLEMENTATION AUTHORIZATION REQUIRED**. The repository-grounded
[implementation plan](superpowers/plans/2026-07-29-rich-glossary-content-model-implementation-plan.md)
and
[plan review](reviews/2026-07-29-rich-glossary-content-model-plan-review.md)
are also complete with verdict **RICH GLOSSARY IMPLEMENTATION PLAN COMPLETE —
AUTHORIZATION REQUIRED**. The subsequently authorized, content-neutral
implementation was accepted at
`6ef085d0b0271a5e7ed5a9f64ef4e6a05b5f257e`, and its
[implementation review](reviews/2026-07-29-rich-glossary-content-model-implementation-review.md)
records verdict **RICH GLOSSARY MODEL IMPLEMENTED — READY FOR MAINTAINER
ACCEPTANCE** as a point-in-time verdict. At the accepted E1 boundary, two Core
entries, eight ODE entries, two context-only overrides, and ten composed cards
existed as inert source content; the production registry, production importer
count, annotation count, and ODE binding count were zero. The
[E1 content review](reviews/2026-07-29-ode-glossary-wave-1-e1-content-review.md)
records the accepted implementation at
`08b80522283438a233974456a026a6dbc2a96746`. The
[E2 Runtime Contract](content/ODE_GLOSSARY_WAVE_1_E2_RUNTIME_CONTRACT.md)
records `E2-CONTRACT-01`, `E2-CONTRACT-02`, and the source-grounded complete
ten-record interaction contract. The separately authorized E2 implementation
is locally complete and verified through one complete-IVP route-instance
binding and ten explicit annotations; `/ode` remains plain and Tutor remains
independent. The
[E2 integration review](reviews/2026-07-30-ode-glossary-wave-1-e2-integration-review.md)
records the implementation evidence. The maintainer accepted E2 for entry
into the mandatory E3 gate. The independent
[E3 integration review](reviews/2026-07-30-ode-glossary-wave-1-e3-integration-review.md)
passed the exact committed E1+E2 state with zero P0/P1/P2 findings and no
product-source change, and E1/E2/E3 are accepted. The first F2 review found two
P1 and one P2 blocking findings. The
[F2 blocking-corrections review](reviews/2026-07-30-f2-cross-surface-blocking-corrections-review.md)
records their accepted narrow correction. The fresh corrected-state F2 review
found two additional P1 blockers and one adjacent P3 wording drift. The
[F2 final terminology corrections review](reviews/2026-07-30-f2-final-terminology-corrections-review.md)
records their narrow local correction. All five known P1/P2 blockers are
closed. The final independent F2 review then found
`F2-COMPARE-COUNT-001` and `F2-GOV-STATUS-001`; the
[final count and governance corrections review](reviews/2026-07-30-f2-final-count-and-governance-corrections-review.md)
records their narrow local correction. All seven known F2 blockers remain
closed. The
[final independent F2 consistency review](reviews/2026-07-31-ode-glossary-wave-1-final-f2-cross-surface-consistency-review.md)
passed exact commit `451a0cbe5e67afc58b280795dd13d43db09d16af` with
`P0 = P1 = P2 = 0` and no product-source change. F2 is independently passed
pending maintainer acceptance of that review commit.
`COPY-041`, `COPY-042`, `F2-GLOSSARY-VOICE-001`,
`BASELINE-EXT-FONT-001`, and `F2-EVIDENCE-001` remain nonblocking open
items. No push, Preview deployment, or Production deployment was authorized
or performed; the public deployed site remains unchanged.

## Project-language standards and content drafts

The terminology, notation, and teaching-voice standards are
**maintainer-approved Version 1**. The source policy remains authoritative for
evidence handling. The Glossary catalog and copy audit are reconciled planning
documents, and the implementation plan separates ready copy work from the
unauthorized production content wave. Groups A through D and the Group
F1/pre-E prerequisite commits are accepted; all five P2 findings are
`CLOSED_VERIFIED`. Group E0 ODE Glossary Wave 1 design and content governance
is complete and maintainer-approved. The historical E1 schema stop was closed
by the accepted generic rich-model implementation. The fresh E1 restart is
accepted and inert. The E2 runtime contract is complete, while E2 source/test
implementation is accepted. The independent E3 review is accepted. The first
post-Glossary F2 review found two P1 and one P2 blockers and its correction
remains closed. The fresh F2 review found two additional P1 blockers; the
final terminology correction closes both and normalizes the adjacent `/ode`
wording drift. The final review's Compare count and governance blockers are
also locally corrected. All seven known F2 blockers remain closed. The final
independent F2 rerun passed with zero P0/P1/P2 findings and is pending
maintainer acceptance of the F2 review commit.

| Document | Purpose |
|---|---|
| [Content Source Policy](content/CONTENT_SOURCE_POLICY.md) | Abstract source keys, evidence priority, conflicts, locators, copyright, and approval lifecycle |
| [Numerical T-Lab Terminology Standard v1](content/NUMERICAL_TERMINOLOGY_STANDARD.md) | Maintainer-approved terminology; 197 stable IDs and no decision-blocked terminology row |
| [Numerical T-Lab Notation Standard v1](content/NUMERICAL_NOTATION_STANDARD.md) | Maintainer-approved notation for the nine project-language decisions |
| [Numerical T-Lab Teaching Voice Standard v1](content/TEACHING_VOICE.md) | Maintainer-approved plain-first teaching rule, epistemic language, and examples |
| [Glossary Catalog](content/GLOSSARY_CATALOG.md) | Reconciled 197-ID governance catalog; exactly ten Wave 1 rows are locally activated only through the complete-IVP E2 binding while the other 187 rows remain planning-only |
| [Project Copy Audit](content/PROJECT_COPY_AUDIT.md) | Reconciled 55-record audit with exact replacement copy and source/test/browser traceability; Groups A–D and Group F1 prerequisite state accepted, all twelve `COPY-NC-*` records classified, `COPY-003` held, and E2 locally implemented without changing deferred generic-surface records `COPY-041`/`COPY-042` |
| [Project Language Implementation Plan](content/PROJECT_LANGUAGE_IMPLEMENTATION_PLAN.md) | Complete A–F future implementation boundaries; no group is authorized by the document alone |
| [Terminology Decisions](content/TERMINOLOGY_DECISIONS.md) | Historical comparison plus the approved Version 1 resolution index |
| [Maintainer Decision Packet](content/MAINTAINER_DECISION_PACKET.md) | Completed evidence cards and binding records for exactly nine decisions |
| [Project Language Approval Checklist](content/PROJECT_LANGUAGE_APPROVAL_CHECKLIST.md) | Completed documentation-only approval and validation record |
| [Project Language v1 Handoff](content/HANDOFF.md) | Approved choices, counts, accepted Groups A–D/F1/pre-E/E1/E2/E3 state, all seven closed F2 blockers, passed final F2 review pending acceptance, held scope, and exact next gate |
| [ODE Glossary Wave 1 Content Packet](content/ODE_GLOSSARY_WAVE_1_CONTENT_PACKET.md) | Maintainer-approved ten-card content and ten annotation design records; E1 accepted and interaction details delegated to the canonical E2 runtime contract |
| [ODE Glossary Wave 1 E2 Runtime Contract](content/ODE_GLOSSARY_WAVE_1_E2_RUNTIME_CONTRACT.md) | Sole E2 interaction authority: ten exact records, owners, text/DOM compositions, state/mode rules, lifecycle rules, duplicates, and direct test owners; implemented and accepted for E3 |
| [ODE Glossary Wave 1 Approval Checklist](content/ODE_GLOSSARY_WAVE_1_APPROVAL_CHECKLIST.md) | Checked content/design and accepted rich-model/E1/E2/E3/F2-local gates; final F2 review passed with zero P0/P1/P2 findings; F2 review-commit acceptance and deployment gates still unchecked |
| [Rich Glossary Content Field Matrix](content/RICH_GLOSSARY_CONTENT_FIELD_MATRIX.md) | Exact destination for all 29 approved term-card fields, all 21 annotation-record fields, and six ownership/composition fields; governance/private metadata remains outside runtime |

## Product and feature specifications

| Document | Status |
|---|---|
| [AI Tutor Connections v1 Design](superpowers/specs/2026-09-25-ai-tutor-connections-v1-design.md) | Review incorporated; first bounded implementation authorized; complete local/cloud and both-Lab contract |
| [Cross-Lab Method Teaching Alignment v2 Design](superpowers/specs/2026-08-22-cross-lab-method-teaching-alignment-v2-design.md) | Frozen at `5ee063bf5d33d872305c46d495a84f4e95e128c5`; final release audit passed P0/P1/P2/P3 = 0; Production release closeout next |
| [Cross-Lab Presentation System v1 Design](superpowers/specs/2026-08-12-cross-lab-presentation-system-v1-design.md) | Frozen at `5ee063bf5d33d872305c46d495a84f4e95e128c5`; Phase 7 complete/accepted after PASS WITH P3 CARRY-FORWARD; both release P3s closed in release closeout |
| [Linear Systems Teaching v2 Design](superpowers/specs/2026-08-11-linear-systems-teaching-v2-design.md) | Maintainer-accepted at `484fc9153de33be7949e82b29386c94fe63d19c8`; final teaching-copy audit passed P0/P1/P2/P3 = 0; Motion paused; Tutor later; not deployed |
| [Linear Systems Lab Version 1 Design](superpowers/specs/2026-08-10-linear-systems-lab-v1-design.md) | Maintainer-approved design; Day 1/1.5 numerical evidence and Day 2 route/UI implemented locally; Tutor pending |
| [Theme-Ready Platform Shell Design](superpowers/specs/2026-07-13-theme-ready-platform-shell-design.md) | Implemented, Vercel Preview-verified, safe to release |
| [Human-Friendly Math Expressions Design](superpowers/specs/2026-07-10-human-friendly-math-expressions-design.md) | Implemented and verified |
| [Observed Convergence Order Experiment Design](superpowers/specs/2026-07-10-convergence-study-design.md) | Implemented, verified, release ready |
| [Content-Agnostic Interactive Glossary Framework Design](superpowers/specs/2026-07-22-content-agnostic-interactive-glossary-framework-design.md) | Implemented and locally accepted after a repeated independent final review; production content remains deferred |
| [ODE Glossary Wave 1 Design](superpowers/specs/2026-07-29-ode-glossary-wave-1-design.md) | D01–D18 approved as Option A; E1/E2/E3 accepted; all seven F2 blockers closed; final independent F2 review passed pending maintainer acceptance |
| [Rich Glossary Content Model and Complete Surface Design](superpowers/specs/2026-07-29-rich-glossary-content-model-design.md) | Option 2 design implemented and accepted at the fresh E1 starting HEAD |

## Implementation plans

| Document | Status |
|---|---|
| [AI Tutor Connections v1 Implementation Plan](superpowers/plans/2026-09-25-ai-tutor-connections-v1-implementation-plan.md) | Separate chunks for transport, sessions, offline assets, provider families and Lab integration; independent Astra audit before each local commit; overall audit before push/demo release |
| [Cross-Lab Method Teaching Alignment v2 Implementation Plan](superpowers/plans/2026-08-22-cross-lab-method-teaching-alignment-v2-implementation-plan.md) | Fully executed and frozen; final Method Teaching release audit passed; Production release closeout next |
| [Cross-Lab Presentation System v1 Implementation Plan](superpowers/plans/2026-08-12-cross-lab-presentation-system-v1-implementation-plan.md) | Fully executed and frozen; Phases 0–7 complete/accepted; Phase 7 release P3s closed in release closeout |
| [Linear Systems Teaching v2 Implementation Plan](superpowers/plans/2026-08-11-linear-systems-teaching-v2-implementation-plan.md) | Executed and maintainer-accepted; final teaching-copy audit passed; Motion remount and Tutor remain separate later gates |
| [Linear Systems Lab Version 1 Implementation Plan](superpowers/plans/2026-08-10-linear-systems-lab-v1-implementation-plan.md) | Repository-grounded; Day 1/1.5 and Day 2 implemented locally; independent product-audit corrections verified, correction re-audit next, Tutor deferred to a later gate |
| [Theme-Ready Platform Shell Implementation Plan](superpowers/plans/2026-07-13-theme-ready-platform-shell-implementation-plan.md) | Implemented historical plan; check the final review and architecture map for current state |
| [Numerical T-Lab Rename Migration Plan](superpowers/plans/2026-07-22-numerical-t-lab-rename-migration-plan.md) | Project Identity Migration completed and verified |
| [Content-Agnostic Interactive Glossary Framework Implementation Plan](superpowers/plans/2026-07-23-content-agnostic-interactive-glossary-framework-implementation-plan.md) | Fully executed locally; historical blocked-review findings closed; final verdict APPROVED FOR LOCAL FRAMEWORK RELEASE; no production content or visible behavior |
| [Rich Glossary Content Model Extension Implementation Plan](superpowers/plans/2026-07-29-rich-glossary-content-model-implementation-plan.md) | Fully executed and accepted in `6ef085d0b0271a5e7ed5a9f64ef4e6a05b5f257e` as the E1 starting point |

## Reviews and release evidence

| Document | Verdict or status |
|---|---|
| [Theme-Ready Platform Shell Final Review](reviews/2026-07-14-theme-ready-platform-shell-review.md) | Safe to release |
| [Numerical T-Lab Rename Review](reviews/2026-07-22-numerical-t-lab-rename-review.md) | Project Identity Migration completed and verified |
| [Human-Friendly Math Expressions Review](reviews/2026-07-10-human-friendly-math-expressions-review.md) | Safe to release Version 1 |
| [Observed Convergence Order Experiment Review](reviews/2026-07-10-convergence-study-review.md) | Safe to release Version 1 |
| [Content-Agnostic Interactive Glossary Framework Release Review](reviews/2026-07-28-content-agnostic-interactive-glossary-framework-review.md) | Historical verdict **RELEASE BLOCKED**; its P1/P2/P3 findings were later repaired and closed by the final review |
| [Content-Agnostic Interactive Glossary Framework Final Review](reviews/2026-07-28-content-agnostic-interactive-glossary-framework-final-review.md) | Repeated independent verdict **APPROVED FOR LOCAL FRAMEWORK RELEASE**; all three historical findings closed; production content remains unauthorized |
| [Pre-Glossary Project-Language Consistency Review](reviews/2026-07-29-pre-glossary-project-language-consistency-review.md) | Group F1 verdict **GROUP F1 COMPLETE — PRE-E FIXES REQUIRED**; `COPY-043` verified, twelve review-only records classified, five P2 findings recorded, Group E unauthorized, F2 still required |
| [Pre-Glossary Repair Review](reviews/2026-07-29-pre-glossary-repair-review.md) | Verdict **PRE-E REPAIR COMPLETE — GROUP E MAY BE PLANNED**; all five Group F1 findings `CLOSED_VERIFIED`, Group E still unauthorized, F2 still required |
| [ODE Glossary Wave 1 Design and Content Approval Review](reviews/2026-07-29-ode-glossary-wave-1-design-readiness-review.md) | Verdict **DESIGN AND CONTENT APPROVED — E1 AUTHORIZATION REQUIRED**; no production authorization |
| [Rich Glossary Content Model Design Readiness Review](reviews/2026-07-29-rich-glossary-content-model-design-readiness-review.md) | Verdict **RICH GLOSSARY MODEL DESIGN COMPLETE — IMPLEMENTATION AUTHORIZATION REQUIRED**; no runtime or Wave 1 content |
| [Rich Glossary Content Model Implementation Plan Review](reviews/2026-07-29-rich-glossary-content-model-plan-review.md) | Verdict **RICH GLOSSARY IMPLEMENTATION PLAN COMPLETE — AUTHORIZATION REQUIRED**; no runtime or Wave 1 content |
| [Rich Glossary Content Model Implementation Review](reviews/2026-07-29-rich-glossary-content-model-implementation-review.md) | Verdict **RICH GLOSSARY MODEL IMPLEMENTED — READY FOR MAINTAINER ACCEPTANCE**; generic runtime only, no Wave 1 content or ODE binding |
| [ODE Glossary Wave 1 E1 Content Review](reviews/2026-07-29-ode-glossary-wave-1-e1-content-review.md) | Verdict **E1 RICH CONTENT IMPLEMENTED AND INERT — READY FOR MAINTAINER ACCEPTANCE**; ten cards in source, zero production registry entries/importers/annotations/bindings |
| [ODE Glossary Wave 1 E2 Integration Review](reviews/2026-07-30-ode-glossary-wave-1-e2-integration-review.md) | Verdict **E2 ODE GLOSSARY INTEGRATED — READY FOR MAINTAINER ACCEPTANCE**; one complete-IVP route binding, ten explicit annotations, `/ode` plain, no Tutor handoff |
| [ODE Glossary Wave 1 E3 Integration Review](reviews/2026-07-30-ode-glossary-wave-1-e3-integration-review.md) | Independent verdict **E3 INTEGRATION REVIEW PASSED — READY FOR F2 AUTHORIZATION**; exact E1+E2 commit audited with zero P0/P1/P2 findings and no product-source change |
| [F2 Cross-Surface Blocking Corrections Review](reviews/2026-07-30-f2-cross-surface-blocking-corrections-review.md) | Verdict **F2 BLOCKING CONSISTENCY FINDINGS CORRECTED — READY FOR MAINTAINER ACCEPTANCE**; first-review two P1 and one P2 findings narrowly corrected and accepted for corrected-state review |
| [F2 Final Terminology Corrections Review](reviews/2026-07-30-f2-final-terminology-corrections-review.md) | Verdict **ALL KNOWN F2 BLOCKING CONSISTENCY FINDINGS CORRECTED — READY FOR MAINTAINER ACCEPTANCE**; two additional P1 findings and the adjacent `/ode` P3 wording drift locally corrected; new full F2 review not run |
| [F2 Final Count and Governance Corrections Review](reviews/2026-07-30-f2-final-count-and-governance-corrections-review.md) | Verdict **ALL KNOWN F2 BLOCKING FINDINGS CORRECTED — FINAL INDEPENDENT REVIEW REQUIRED**; Compare stored-point labels and stale current-state claims corrected; historical correction gate before the final F2 rerun |
| [ODE Glossary Wave 1 Final F2 Cross-Surface Consistency Review](reviews/2026-07-31-ode-glossary-wave-1-final-f2-cross-surface-consistency-review.md) | Verdict **F2 FINAL INDEPENDENT CONSISTENCY PASSED — READY FOR RELEASE DECISION**; seven blockers remain closed; `P0 = P1 = P2 = 0`; no product-source change; push/Preview/Production unauthorized |
| [Frontend Visual Polish Review](reviews/2026-07-31-frontend-visual-polish-review.md) | Verdict **FRONTEND VISUAL POLISH COMPLETE — READY FOR MAINTAINER REVIEW**; one bounded light-first polish pass, behavior unchanged, locally verified and Chrome-reviewed, no push or deployment |
| [Frontend Theme and Tutor Refinement Review](reviews/2026-07-31-frontend-theme-and-tutor-refinement-review.md) | Verdict **FRONTEND THEME AND TUTOR REFINEMENT COMPLETE — READY FOR VISUAL REVIEW**; lower-glare Light theme, recovered Dark theme, focus fix, theme-aware charts, expanded Tutor layout, accepted crescent, final `Numerical T Lab` display brand, local/Vercel mock configuration, locally committed and unpushed |

## Feature handoffs

- [AI Tutor Connections v1 handoff](tutor/HANDOFF.md) — agreed decisions,
  reviewed design/plan, verified chunk 1A, remaining scope, and exact review
  gate before credential sessions and destination policy.
- [Project handoff](PROJECT_HANDOFF.md) — implemented Platform Shell and current
  release baseline.
- [Numerical notation research handoff](research/HANDOFF.md) — non-canonical
  evidence-research continuation state.
- [Content-Agnostic Interactive Glossary Framework handoff](glossary/HANDOFF.md)
  — approved design, corrected and re-audited implementation plan, accepted
  Commit 1, locally verified readonly-math prerequisite, accepted Commit 3
  lifecycle follow-ups, and the complete locally/browser-verified DEV
  Playground with production-exclusion evidence; all three blocked-review
  findings are closed and the framework is locally accepted as complete.
- [Numerical T-Lab project-language v1 handoff](content/HANDOFF.md) — 29-source
  evidence baseline, nine approved decisions, Version 1 standards, reconciled
  197-term catalog and 55-record copy audit, A–F implementation plan, and
  validation evidence; Groups A through D are accepted, Group F1 and its five
  pre-E repairs are accepted, Wave 1 Group E0 governance is
  maintainer-approved; the generic rich model is accepted and the fresh E1
  restart is accepted. The E2 runtime contract is complete and locally
  implemented through one complete-IVP binding and ten explicit annotations.
  E2 is accepted for entry into E3; the independent E3 review passed and is
  accepted. All seven blockers found across the three independent F2 reviews
  remain closed; the final independent F2 review passed with zero P0/P1/P2
  findings and is pending maintainer acceptance of the F2 review commit.
  Push and deployment remain unauthorized and unperformed.
- [Project Rename handoff](project-rename/HANDOFF.md) — completed Project
  Identity Migration evidence, including the canonical local workspace reopen.

## Historical documents

Older specifications, plans, and review packages preserve design intent and
point-in-time evidence. They may describe migration baselines or test totals
that have since changed. Check the relevant final review,
[CURRENT_ARCHITECTURE.md](architecture/CURRENT_ARCHITECTURE.md), current source, and
[PROJECT_HANDOFF.md](PROJECT_HANDOFF.md) before treating a historical statement
as current behavior.

Earlier Platform Shell and notation-research records may use **Interactive Term
Glossary** as an earlier working name. The unambiguous current milestone name is
**Content-Agnostic Interactive Glossary Framework**.

## Private references

[The references policy](../references/README.md) explains the public/private
boundary. Private local material may exist under the ignored
`references/private/` directory, but it is not part of the public repository.
Normal runtime, builds, tests, CI, public contribution, and documentation links
must not depend on it. Do not publish private contents, screenshots, hashes, or
machine-local paths.
