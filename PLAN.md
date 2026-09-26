# Active Project Plan

## Current status

**Active milestone: AI Tutor Connections v1 — chunk 3A3 independently passed; local commit, then 3B.**
The maintainer's continuing goal authorizes the complete implementation sequence.
Chunks 1A/1B/1C, 2A/2B/2C and 3A1/3A2 passed their independent gates and are
committed locally. Chunk 3A2 is `8ada41b`; this chunk starts from clean local
main `8ada41b678a79f9323c642ebf29e9385af3d8218`.

Authority: [design](docs/superpowers/specs/2026-09-25-ai-tutor-connections-v1-design.md),
[implementation plan](docs/superpowers/plans/2026-09-25-ai-tutor-connections-v1-implementation-plan.md).
Continuation: [feature handoff](docs/tutor/HANDOFF.md#current-chunk-3a3-checkpoint).
Evidence: [chunk 3A3 review](docs/reviews/2026-09-25-ai-tutor-connections-chunk-3a3.md).

The browser runtime now owns per-tab session proof, personal configuration,
activation, cancellation and expiry. Pure conversations carry only nonsecret
connection provenance. One-use fresh/transfer/cancel choices are bound to each
Lab's transcript revision and source/destination identities; inactive-Lab history
cannot transfer implicitly. The guarded client reads fresh Lab context and rejects
outdated replies, including completion-subscriber changes. No retry or hosted
fallback follows a personal failure. Settings and panel/Host wiring remain 3B;
the production UI continues to use the legacy client at this boundary.

Focused checks pass 18 files / 498 tests; full verification passes 123 files /
2,068 tests, all typechecks, boundaries and build. Actual loopback HTTP covers
the runtime through API, session, adapter and synthetic model server with no
Authorization header. No live model/key or new real-browser UI claim is made.

The initial independent audit returned NEEDS_FIXES, with three P2 findings:
stale errors after completion subscribers, premature browser idle expiry after
accepted provider failures, and insufficient optional-chart field validation.
The auditor independently repeated focused checks and reproduced these through
owned loopback HTTP. All 20 frozen hashes and the baseline matched before/after;
the implementation task also rechecked them. Bounded corrections now guard both
send outcomes after subscribers, reconcile authenticated activity without renewing
it, and project the complete optional-chart schema. Added regressions and the
unchanged independent HTTP probes pass. Independent re-audit returned PASS, with
P0/P1/P2/P3 all zero and all three findings closed. It passed 588 focused tests
and additional boundary probes. All 25 frozen hashes matched before/after audit
and were independently rechecked by the implementation task.

**Next gate: commit passed 3A3 locally, then implement and independently audit 3B.**
Suggested commit: `Add Tutor connection provenance and guarded client`.
Do not begin 3B before that commit gate. Linear Systems Tutor remains phase 4.
After all chunks, the independent overall audit must pass before push and Vercel
demo update. No per-chunk push, remote contact, live provider call, model management,
dependency install or numerical change. Native Windows, local-only personal
connections, session-only keys, strict offline local mode and explicit cloud/region
choices remain the approved scope. The released-state record below is historical.

## Previous milestone — Production release closeout

**Historical active milestone: Final Production Release Closeout. Method Teaching
Alignment v2 and Cross-Lab Presentation System v1 are FROZEN at
`5ee063bf5d33d872305c46d495a84f4e95e128c5` (tree
`1fd08e3d2e9c641f3e6fc148606c33484ea320a2`). Cross-Lab Presentation Phase 7
is COMPLETE / ACCEPTED. The current gate is exact release-candidate validation,
canonical push, and Production verification.**

Cross-Lab Presentation Sync Phases 0 through 7 are complete and accepted. The Phase 6
entry-safe `ModuleOverview` and proven duplicate-style cleanup passed its
independent audit by the current product baseline
`411e641d8cc6b14240acc408130876781fb1ee84` (tree
`92f79cba8bdabafb9a97e3a99d76ddff853fe35c`). Phase 6 is **MAINTAINER
ACCEPTED** with final severity `P0 = P1 = P2 = P3 = 0`. The final Phase 7
audit passed with `P0 = 0`, `P1 = 0`, `P2 = 0`, and `P3 = 2`, and the
Maintainer records **FREEZE_CROSS_LAB_PRESENTATION_V1** at the current frozen
baseline. The two release P3s are closed in this release task by one narrow
`/ode` product-truth correction and canonical release bookkeeping. Earlier
Maintainer visual review had found a design-level gap:
the Labs share presentation components and visual grammar, but ODE still uses
a selection-first Method stage while Linear Systems uses a teaching-first
cognitive sequence. The existing presentation components are not the problem.

The new accepted authority is the
[Cross-Lab Method Teaching Alignment v2 design](docs/superpowers/specs/2026-08-22-cross-lab-method-teaching-alignment-v2-design.md),
with its separately gated
[repository-grounded implementation plan](docs/superpowers/plans/2026-08-22-cross-lab-method-teaching-alignment-v2-implementation-plan.md).
The design is **FROZEN** after its final release audit passed with
`P0 = P1 = P2 = P3 = 0`. It aligns ODE toward the
Linear Systems teaching-first philosophy while
preserving all eight methods, method selection, Compare, experimentation,
first-/second-order boundaries, presets, charts, exact comparison,
Convergence, Tutor, and Glossary. The addendum fixes Compare as a secondary
landscape branch, makes Data the editable order owner, preserves initialized
family-specific order on reselection, makes Read selected method evidence-
gated, and accepts the bounded formula/diagram/content decisions recorded in
the design and handoff.

Phase 4 is **MAINTAINER ACCEPTED** at
`b554d29c7448a394582417de81911cbbb7c56eb0` (tree
`b8221cf818c91fe75c51490b8a7732b592336831`). Its independent audit returned
`P0 = 0`, `P1 = 0`, `P2 = 0`, and `P3 = 1`; documentation-only
`PHASE4-P3-01` is **CLOSED**. The bounded integration freeze found no product,
mathematical, accessibility, state, lazy-loading, or cross-Lab blocker and
required no product-source change. The active
[implementation-plan reconciliation](docs/superpowers/plans/2026-08-22-cross-lab-method-teaching-alignment-v2-implementation-plan.md#11-current-reconciliation-ledger--2026-08-23)
records that the former Phase 5/6 implementation slices are superseded by
accepted current behavior, Phase 7 evidence is satisfied, and only the final
read-only release verdict genuinely remains.

Cross-Lab Presentation Phase 7 is **COMPLETE / ACCEPTED** at frozen baseline
`5ee063bf5d33d872305c46d495a84f4e95e128c5` (tree
`1fd08e3d2e9c641f3e6fc148606c33484ea320a2`). Its final audit returned
**PASS WITH P3 CARRY-FORWARD — CROSS-LAB PRESENTATION SYSTEM V1 READY TO
FREEZE** with `P0 = 0`, `P1 = 0`, `P2 = 0`, and `P3 = 2`. `PHASE7-P3-01`
and `PHASE7-P3-02` are closed by the bounded release correction and canonical
status update. Phase 0
authority/copy alignment remains accepted at
`77047d9d570d8cf9416991e8e0c17d7485acab8b` (tree
`7ff318fcdf6d08adf716792f509826b27b648520`). The Maintainer accepts Phase 1
at `712fa1d68ced31d1a85b6c13aa4daf93882b8f9b` (tree
`49f1716f2cc9208068d61f70159396af3b53573b`) after its independent audit
returned **PASS WITH P3 CARRY-FORWARD** (`P0 = 0`, `P1 = 0`, `P2 = 0`,
`P3 = 1`).

Phase 2 first closed `PHASE1-P3-01` by separating audit/governance records from
an explicitly allow-listed learner projection, then implemented the Problem
foundation, three-group/eight-method landscape, selected shell, mobile Read
selected method action, secondary Compare branch, family-keyed order
preservation, and Continue-to-Data transition. The selected-content inset
correction closed `PHASE2-VIS-01`. The Maintainer now formally accepts Phase 2
at `24b3c6859a7d3e066f853fee05b1acdd5608a5a5` (tree
`27529fdd88a81b84731374ca999e783800a51183`) with final severity
`P0 = P1 = P2 = P3 = 0`.

Phase 3 was implemented at
`5cd127ef7b57cbc9e01f6dc78150cf9abd7ee6f1` (tree
`d4b4caa094ad2cfbaeb39dfc05b965cdb1661975`). Exactly Forward Euler,
Backward Euler, Taylor Method (Order 2), and Runge-Kutta 4 now receive complete
selected-method teaching lenses derived from the learner-safe Phase 1
projection. The lenses render one dominant safe readonly formula, approved
supporting equations, formula anatomy, an ordered update, implementation facts,
qualified interpretation boundaries, one native advanced disclosure, selected
concepts, and after-solve guidance. Forward/Backward Euler and RK4 use their
approved static teaching diagrams; Taylor intentionally uses formula anatomy
and process without a diagram.

The Maintainer accepts Phase 3 at
`1703c6898a54150538e1f2e33758b0f01bc45a69` (tree
`59ba7693c69da6eb4166aa667676bfa835032a79`) with independent-audit severity
`P0 = 0`, `P1 = 0`, `P2 = 0`, and `P3 = 2`.
`PHASE3-P3-01` is closed by recording that exact acceptance in the canonical
status documents. `PHASE3-P3-02` is closed by extending the existing
learner/governance disconnect test to cover `odeMethodTeachingView.ts`; the
renderer, learner projection, and ODE app do not import the audit-only owner.

Phase 4 closed its mandatory preflight in commit
`f574f16f9eae57e263b638ded11a534d839e8cf7` (tree
`74e3d0f7307d6486787b469f85663ec8bc35e83f`), implements the four authorized
history/second-order lenses in `1fcc053108c0e11988cb20c9d36759e11eab97f6`
(tree `cafb22f0a17ef49cabc2729e85cb23be8875db68`), and records final browser-led
presentation refinements in `8d657199eb00362e07db30d157ab3925dc4ece60`
(tree `8d247dede67e531e795f6b0a7161f5c1d571a478`). Adams-Bashforth,
Adams-Moulton, BDF, and Leap-Frog now have complete learner-safe selected
lenses, so all eight catalog methods have deep teaching. Supplied current
family order remains read-only Method context, Data remains its editable
owner, and the new diagrams/formulas/processes preserve the approved startup,
Newton, BDF6, and staggered-state boundaries.

Before the independent audit, Maintainer visual review recorded
`PHASE4-VIS-01` (P2): the desktop landscape and deep selected lens had become
peer columns rather than sequential Survey → Learn layers. The bounded
correction is implemented at `45cf1326e4686cd1d807e223883541d3b48a51bf`
(tree `f3df72b0c69b4dc0a71fe1a0b66d1c6021c2e2cd`). Problem, complete landscape,
complete selected lens, and Continue to Data now form one vertical source and
reading order at every width. Adams-Moulton uses a vertical predictor /
correction / Newton / accepted-state sequence. One disposable ODE-local return
control appears only after the landscape has left view and returns focus to
its heading without session state; its mobile visual is a compact 44 × 44
arrow. The evidence-backed mobile Read selected method action remains.

The corrected Phase 4 implementation passed focused and full tests, all typechecks,
the 115-module Production build, one full `verify` invocation with its yielded
tail conservatively reconfirmed by the standalone API typecheck and root
build, bundle/lazy inspection, and 1440/390/320 Light/Dark browser review. No
teaching authority, numerical algorithm, session schema, family-order
authority, Compare behavior, Data, Output, Convergence, Tutor, Glossary,
Linear Systems, Motion, PDE, dependency, or route boundary changed. The
independent Phase 4 audit then passed with only documentation/status
carry-forward `PHASE4-P3-01`, now closed. The integration freeze reconfirmed
all-eight completeness, the accepted vertical cognitive flow, method/order
preservation, Data/Output/Compare/Convergence boundaries, accessibility,
responsive Light/Dark behavior, lifecycle, and bundle/lazy ownership. No
source fix or additional implementation phase is required.

The exact next gate is **Production release closeout and Production
verification** from the exact reviewed release commit. Historical
Method Teaching and Presentation phase next-gate wording below is superseded
by this current status. Motion remains paused; Linear Algebra Tutor and PDE
remain separately gated future work.

Linear Systems Teaching v2 is **MAINTAINER ACCEPTED** at commit
`484fc9153de33be7949e82b29386c94fe63d19c8` (tree
`509d245adb745d272e2a5c8185fb678b6e15009d`). Its final teaching-copy audit
passed with `P0 = P1 = P2 = P3 = 0`. Visual + Motion Language v1 remains
implemented but paused and unmounted from the accepted static walkthrough.
Linear Algebra Tutor remains a later task. No Preview or Production deployment
of the accepted Teaching v2 state has occurred.

The maintainer approved the authoritative
[Cross-Lab Presentation System v1 design](docs/superpowers/specs/2026-08-12-cross-lab-presentation-system-v1-design.md)
and
[repository-grounded implementation plan](docs/superpowers/plans/2026-08-12-cross-lab-presentation-system-v1-implementation-plan.md)
at commit `3b77f7133a95bef855c2eb3e3a69db37e16f1e46` (tree
`95908ac5c0a773675bf237d3d49679106a4091f7`). Phase 0 is **MAINTAINER
ACCEPTED** at final HEAD `0c392e218dd7006d43811ddc4d7401a0ccb7c495`
(tree `3d0bc052f9a2e58b50aeb67b52ddb36f10dcd994`). Phase 1 is **MAINTAINER
ACCEPTED** at final HEAD `881795715799cde4d41f7bd933303bea4db1f8a8`
(tree `5a64a6973ecddf710cad51c01220f7cacd646bdb`) after independent audit and
Maintainer visual review. The authorities define a best-of-both presentation architecture
for the Initial Value Problems and Linear Systems Labs, with domain-neutral compatibility for a
future PDE Lab. The design selects exactly ten top-level primitives: `LabShell`,
`WorkflowNavigation`, `StageSection`, `ProblemContext`, `TeachingBlock`,
`PrimaryResult`, `EvidenceBlock`, `ComputationWalkthroughShell`,
`AnalysisSurface`, and `ModuleOverview`. `LabHeader` is part of `LabShell`;
MethodTeaching and the shared status/table/action/disclosure language are
governed compositions or supporting elements rather than extra top-level
primitives.

Phase 0 implementation commit
`b81a8dfc8d1ab49be9f07cd3fff59cb5d7c3cf05` (tree
`56b810a3d4e0f5fe9c4f235b9bde0cfdabff06d0`) adds only the semantic Light/Dark
token vocabulary and the removable `/__dev/presentation-system` visual
fixture. The vocabulary covers stage roles, surface/border/type/spacing/radius
hierarchy, focus, status tones, actions, and control states. The fixture is
absent from Production route matching, manifest/assets, styles, and marker
copy. Browser review passes 1440 × 900, 390 × 844, 320-pixel stress, Light/
Dark, and focus checks without page overflow or console warning/error.

Phase 1 was implemented in two local commits:
`48eef685aab3b31e7e206befde5944c96308f16a` adds the Lab-shared lazy
presentation source, and `d0c77f84ce444afbe418adcbdd94cfca18e1e32b`
(tree `bc6131880e0a57388c45586c4aea948d8a572835`) migrates only the ODE and
Linear Systems outer header, workflow, and stage wrappers. Both Labs now use
the same `LabShell`/required `LabHeader`, variable native-button
`WorkflowNavigation`, `StageSection`, and secondary header-action language.
ODE retains three stages and derives reachability from its existing method and
successful-output authority. Linear Systems retains four stages and maps its
visible Diagnostics title to the shared Analysis presentation role.

Its acceptance carried one non-blocking P3, `PHASE1-VIS-01`. Phase 2 closes
that finding without changing workflow semantics: `current`, `available`, and
`unavailable` now have a stable visual hierarchy, native disabled and
`aria-current="step"` behavior remain unchanged, and presentation does not
invent completed/visited history.

Phase 2 implementation commit `6add7174fb160cf4e377664d486905152583e4c2`
(tree `3f7dd9c49106c2e4631c6e01dde789cb051a4178`) adds the Lab-shared lazy
`ProblemContext`, `TeachingBlock`, `PrimaryResult`, `EvidenceBlock`, and
`ComputationWalkthroughShell` primitives plus semantic `NumericalTable` and
native closed `AdvancedDetails` support. They accept domain-authored nodes by
identity and infer no mathematical meaning. Phase 2 is **MAINTAINER ACCEPTED
WITH P3 CARRY-FORWARD** at HEAD
`331bea3e695fb59620e7c316a27480549643c6f4` (tree
`9e49edeae9aff206435dca577933046189a86ddc`); its independent audit reported
`P0 = 0`, `P1 = 0`, `P2 = 0`, and `P3 = 4`.

Phase 3 is **MAINTAINER ACCEPTED** at final HEAD
`1e9080f110385fe635885d28cd4a17e810c8421a` (tree
`1dc5b52346fadadf2f92d8ffa2169e7f5dc50cd8`) after its final correction
re-audit passed with `P0 = P1 = P2 = P3 = 0`. It closes the two shared Phase 2
CSS/test findings and corrects the live fixture handoff count to 33 formula
owners. The ODE migration is implemented
at `cc6850b75c6102258101a059856870a57e8657f5`, with final narrow-layout
correction at `e1eefd98480b2f11eb796ea6117e7a428753c62a` (tree
`251220912f44ad28dbe85d56a174e9dde7cea7e4`), with final local-label proof at
`4c9720b811e2001683e25ff733052b77c2dca67a` (tree
`874b07332625c1f5d2be6fed38c86d5e452b2847`). Method and preset guidance now
use `TeachingBlock`; successful single and Compare Output use result-owned
`ProblemContext`, `PrimaryResult`, method/chart/table `EvidenceBlock`s, and
semantic `NumericalTable`. Chart.js, ODE state/math, Convergence, Tutor,
Glossary, lifecycle, and numerical authority remain domain-owned. No ODE
walkthrough is mounted, and Convergence is not migrated to `AnalysisSurface`.

Phase 4 is **MAINTAINER ACCEPTED** at final HEAD
`692551774966bd9774900ecfef3d7fe03de61d7e` (tree
`6d7db2ed156a2c6415d1b362ea870fae4ff0c7ef`) after its final audit and
Maintainer visual review passed with `P0 = P1 = P2 = P3 = 0`. Its original
implementation is `15e04db939938ae01234d67149f832c4efeaad60` (tree
`ed6756791fc5c553a1d39d99dd79cd3aabaa155e`). Linear Systems Method now
uses the shared `TeachingBlock` at its natural large-region boundaries.
Successful current and stale Output use exactly one shared `PrimaryResult`
owner containing a successful-result `ProblemContext` and computed-solution
answer; this closes `PHASE2-P3-04`. Factorization and residual-led supporting
evidence use `EvidenceBlock`, and subordinate arithmetic/safeguard disclosures
use native closed `AdvancedDetails`. The shared
`ComputationWalkthroughShell` is the rendered outer owner of ordered phases,
steps, and before/operation/after corridors, while
`computationWalkthrough.ts` remains the sole Linear Systems trace interpreter.
At the accepted Phase 4 boundary, Diagnostics remained a top-level analysis
`StageSection` and did not yet use `AnalysisSurface`.

Phase 5 was implemented in six
coherent implementation commits: `d9b7442d8672f3180b011b25c9d8e70fcfb0999c`
(tree `2eb575d9ee506cdb25cb5bd34941689d1316a5ec`),
`1c017ff00ccd1c8a778166d17433436a064ff195` (tree
`45f23ddf95ce8d3a2ac2e0a815357110c9b6ee23`),
`ab15cc7d3f0f9a02517f52e5788dd783a04262ca` (tree
`5e7a49d2ce5b7901bf3df06dc40e5da449f8adbf`),
`15b012cdf7cc518e659d4809fe5da0cd480bd419` (tree
`3a0e6e959e429f195a2e98bf405420c334d839f1`),
`fb280c01bd83f2c0ff0d42487396d8e523f257e7` (tree
`55955db40f2713ab0caf1290059687c805c4e100`), and
`69a3a4a80e3f107d91fc284990f86393ee06852d` (tree
`91a05822d9a281cd2abae62c47f208190267e250`). The preliminary polish keeps
the two approved residual formulas as separate accessible owners with an
explicit responsive gap and changes Home semantic module order to Linear
Algebra → ODE → PDE while retaining aligned actions.

The shared, presentation-only `AnalysisSurface` now provides labelled,
mount-context-safe composition for caller-authored purpose, finding, evidence,
interpretation, limitation, and advanced-detail nodes. Linear Systems
Diagnostics and ODE Convergence consume this same grammar while keeping their
separate domain state, calculations, controllers, result authority, charts,
tables, lifecycle, and sessions. Diagnostics remains the visible Linear
Systems stage; Convergence remains inside ODE Output and ODE keeps exactly
Method/Data/Output workflow. Phase 5 creates no shared analysis state machine,
controller, numerical DTO, or domain inference.

Phase 5 is **MAINTAINER ACCEPTED** at final HEAD
`371d151568abb426059da638d8b69c8f6af98227` (tree
`9ccd00bf5693ae3e6d66efc28f4c317423b4d103`) after its final independent
audit and Maintainer acceptance recorded `P0 = P1 = P2 = P3 = 0`.

The design keeps ODE's exploration, presets, Compare, charts, Convergence,
Tutor, and Glossary strengths; keeps Linear Systems Teaching v2's explicit
problem/result context, method-profile teaching, native MathML, trace-owned
walkthrough, stale-snapshot authority, and residual-led Diagnostics; and
replaces duplicated shells, workflows, stage wrappers, control language,
surfaces, tables, status markers, and overview status placement in both Labs.
Shared complete-Lab primitives remain Lab-shared lazy; only `ModuleOverview`
is entry-safe. The platform entry must remain free of complete-Lab, Chart.js,
Tutor, Glossary, MathLive, and Compute Engine runtime.

Phase 5 browser verification covered paired Diagnostics and Convergence at
1440-pixel desktop in Light and Dark, 390 × 844, and 320 × 844. It includes
eligible not-run and successful Convergence, stale and Custom Diagnostics,
local table/chart containment, formula wrapping, and regression smoke for the
Linear Systems walkthrough and ODE Method, Output, Compare, and Tutor
open/rerender/close. No page-level overflow or browser warning/error was
observed. Fresh verification passes 97 files / 1,286 tests, boundary checks,
frontend and API typechecks, and the 110-module Production build. The platform
entry, deferred Tutor/Glossary, MathLive/Compute Engine, and dormant Motion
boundaries remain intact. Numerical behavior, Computation Trace, Teaching v2,
session schemas, ODE Compare/core Output, PDE, dependencies, push, deployment,
and Production state are unchanged.

Phase 6 implementation ends at
`204e35a1cf23e1c4ebcdfd53fe96f578179acb74` (tree
`f04328fcf9af7c7e663803091f92098e869ddebf`) and subsequently passed its
independent audit by product baseline
`411e641d8cc6b14240acc408130876781fb1ee84` (tree
`92f79cba8bdabafb9a97e3a99d76ddff853fe35c`). Phase 6 is **MAINTAINER
ACCEPTED** with final severity `P0 = P1 = P2 = P3 = 0`. Entry-safe
`frontend/src/pages/moduleOverview.ts` now composes `/ode`,
`/linear-algebra`, and `/pde` through one native-heading/status/action grammar
while caller-owned copy and nodes remain domain-authored. ODE and Linear
Algebra retain their exact runnable Lab routes; PDE remains Planned with no
runnable control. Home remains on its dedicated card composition in accepted
Linear Algebra → ODE → PDE DOM order.

The cleanup consolidates the former `.platform-feature-card` owner into
`ModuleOverview` and removes only proven dead generic ODE and Linear Systems
method/teaching/output/diagnostic presentation selectors. Domain-specific
method, preset, editor, chart, Compare, Convergence, matrix, MathML, factor,
transformation, substitution, pivot, residual, and dormant Motion styles
remain local. Ambiguous mathematical selectors are explicitly retained.

Phase 6 browser verification covers Home, About, and all three overview routes
at 1440 × 900, 390 × 844, and 320 × 844 in Light/Dark, plus representative
post-cleanup Lab regression states. No page-level overflow or browser
warning/error was observed. Fresh verification passes 98 files / 1,292 tests,
boundary checks, frontend and API typechecks, and the 111-module Production
build. A clean Home load includes the entry-safe overview helper and excludes
complete-Lab presentation/runtime, Tutor panel, Glossary surface, MathLive,
Compute Engine, and editable math. Complete-Lab, first-open Tutor, and
interaction-deferred math boundaries remain intact.

Numerical behavior, Computation Trace, session schemas, Teaching v2,
AnalysisSurface, ODE Compare/core Output, Motion, Linear Algebra
Tutor/Glossary, PDE implementation, dependencies, push, deployment, and
Production state are unchanged.

The former next gate—independent Phase 6 overview / cleanup / lazy-boundary
audit—passed, and the Maintainer accepted Phase 6. The later Method-stage
pedagogical-alignment gap was resolved by the now-frozen Method Teaching v2
work. Presentation Phase 7 is complete and accepted at the frozen baseline;
this point-in-time Phase 6 history remains unchanged. Do not remount Motion,
begin Linear Algebra Tutor/Glossary, or begin PDE work without separate
authorization.

## Superseded Teaching v2 execution record

The following section preserves the immediately preceding milestone record for
traceability. Its former “active milestone” and “next gate” statements are
historical and are superseded by the current status above.

**Active milestone: Linear Systems Teaching v2 — final teaching-copy
correction implemented and locally verified; narrow independent teaching-copy
re-audit is the next gate.**

Direct maintainer browser review found that the current Linear Systems Lab is
engineering-correct but not teaching-complete. The authoritative
[Teaching v2 design](docs/superpowers/specs/2026-08-11-linear-systems-teaching-v2-design.md)
and
[repository-grounded implementation plan](docs/superpowers/plans/2026-08-11-linear-systems-teaching-v2-implementation-plan.md)
now govern the next work. The maintainer approved them at
`e6ecfac7ba11d2825d099070345c1d8c35c15596`, and the bounded native MathML
capability spike is implemented and browser-verified. Outcome B establishes
native MathML as the authored mathematical-atom layer and controlled DOM/CSS
as the composition layer for before/operation/after transformations. The
spike remains DEV-only and is absent from Production assets. The design and
plan continue to require proper authored mathematical typesetting, visible
method/concept teaching, full trace-owned matrix transformations, explicit
`P b`, complete triangular-solve calculations, and a residual-led Diagnostics
hierarchy. Phase 1 added the bounded producer evidence: authoritative
`factorization_start.initialU`, complete immutable `uBefore`/`uAfter` matrices
for every swap and elimination, and the exact complete `permutedB` already
used by forward substitution. The independent Phase 1 trace audit passed with
`P0 = P1 = P2 = P3 = 0`, and the maintainer authorized Phase 2. The current
product now consumes that evidence in a static, computation-led Teaching v2
surface: visible method concepts, native-MathML mathematical objects, complete
before/operation/after matrix transformations, explicit `P b`, ordered
triangular-solve equations, and residual-led Diagnostics. The independent
Phase 2 audit returned **PASS WITH P3 CARRY-FORWARD — READY FOR MAINTAINER
TEACHING REVIEW**. The bounded maintainer correction pass now separates
universal Linear Systems teaching from the active GEPP teaching profile,
clarifies the right-hand-side role, adds a compact equations-to-matrix reading,
re-establishes authoritative successful-result context in Output and
Diagnostics, and teaches residual purpose and the conditioning boundary before
the diagnostic arithmetic. Numerical behavior remains unchanged.

The subsequent final teaching-copy audit returned **BLOCKED — FINAL TEACHING
COPY NEEDS CORRECTION** with `TC-01` and `TC-02` at P2 and `TC-03` at P3.
The bounded correction now keeps learner prose meaning-centered while native
MathML owns notation and accessible formula labels retain spoken mathematics.
Diagnostics uses “computed solution” in its explanatory prose; Method and the
walkthrough explain backward substitution without phonetic formulas; and
walkthrough component, status, table, and residual-arithmetic labels are
natural learner-facing language.

Visual + Motion Language v1 remains implemented locally, but it is deliberately
unmounted from the static walkthrough. Its final freeze and remount remain
paused until the corrected teaching surface passes review. Linear Algebra
Tutor work remains deferred. The exact next gate is a **narrow independent
teaching-copy re-audit**, followed by **final Maintainer Teaching Acceptance**.
After those gates, the next major frontend design/audit task is **Cross-Lab
Presentation Sync** so ODE, Linear
Algebra, and future PDE Labs can share presentation primitives without
changing their numerical ownership. Do not begin Cross-Lab Sync, motion
remount, or Tutor work before those gates.

The maintainer accepts public baseline
`b58584a5f7a1d5b09874479d3b413a063b94e061` and tree
`406430a598182fbecfb313f68552e44c473c7367`, including the production-ready
Initial Value Problems Lab and closed Glossary E1/E2/E3/F2 gates. Those gates
remain closed unless current work exposes a real regression.

The accepted Linear Systems
[Linear Systems Lab v1 design](docs/superpowers/specs/2026-08-10-linear-systems-lab-v1-design.md)
and
[repository-grounded implementation plan](docs/superpowers/plans/2026-08-10-linear-systems-lab-v1-implementation-plan.md)
establish a bounded dense `A x = b` Lab. The accepted Day 1 commit implements
the pure Gaussian-elimination-with-partial-pivoting core, immutable presets,
and pure session/fingerprint foundation. Day 1.5 adds a small platform-level
structured Computation Trace contract and makes that same single numerical
path its first producer.

Architecture v1 remains frozen. Day 2 adds the independently lazy
`/linear-algebra/linear-systems` route, the frontend-owned Method → Data →
Output → Diagnostics workflow, matrix editor, accessible validation,
current/stale lifecycle, Resume/New experiment integration, and a
presentation-only Computation Walkthrough that consumes the immutable trace
emitted by the existing numerical core. Home, About, and the Linear Algebra
overview now describe this locally available Lab; PDE remains Planned.

The original Day 2 gate passed 12 focused files / 95 tests, 86 full-suite files / 1,189
tests, all workspace and API typechecks, import-boundary verification, the
95-module production build, manifest/private-marker review, and bounded
desktop/mobile browser verification. The Linear Systems chunk remains an
independent dynamic asset. No Tutor, Linear Algebra Glossary, numerical-
contract change, dependency change, push, Preview deployment, or Production
deployment is included.

The independent Product Audit corrections remain accepted. The following
mathematical-readability review identified MR-01 through MR-08, and the
maintainer promoted structured scripts/powers MR-09 from P3 to a P2 release
requirement. Commit `d84573c193f369d620982b9def3927d51197344a` (tree
`cd71c5346c0a7da0245414a71daf9f7eec539f06`) closes all nine findings with a
lightweight structured-math DOM helper, contextual presentation-only number
formatting, exact-versus-approximate notation, complete substitution chains,
one controlled accessible formula owner, responsive Data/arithmetic layouts,
learner-centered trace disclosure, fingerprint-derived visible identity, and
an explicit selected-pivot marker. The canonical
[mathematical presentation contract](docs/contracts/MATHEMATICAL_PRESENTATION.md)
records Display Number Policy v1 and Mathematical Display Policy v1.

Focused verification passes 5 files / 43 tests; the full suite passes 87 files
/ 1,201 tests; all workspace/API typechecks, the four-owner import-boundary
gate, `git diff --check`, and the 96-module production build pass. A manifest
build keeps the 56.52 kB raw / 16.47 kB gzip Linear Systems chunk independent
of MathLive, Compute Engine, ODE, Tutor, and Glossary. Bounded in-app browser
replay covers both presets, custom decimal and stale states, pivot failure,
near-machine residuals, computation/arithmetic disclosures, Light/Dark,
1440 × 900, 390 × 844, and 320-pixel reflow with no page-level overflow or
console warning/error. Numerical algorithms/contracts, Computation Trace,
Architecture v1, routes, Tutor, Glossary, ODE, dependencies, push, and
deployment remain unchanged. That mathematical-presentation state is the
accepted prerequisite for the current motion milestone.

Visual + Motion Language v1 starts from accepted commit
`302f0369820751c637d57d76bfda03feb1e8ced9` (tree
`128f45a5652b1e2c40b9b48115f807897b29a927`). The canonical
[Visual + Motion contract](docs/contracts/VISUAL_MOTION_LANGUAGE.md) now owns
the restrained duration/easing vocabulary, semantic source/target/change
markers, presentation-only lifecycle, trace boundary, reduced-motion policy,
and explicit negative list. Linear Systems is its first consuming
presentation: row-swap and elimination cards alone expose local Replay step
controls; whole rows move with measured transforms, while elimination values
switch once between trace-provided before/after records. A 320-pixel threshold
formula uses local contained scrolling without changing mathematical authority.

Focused verification passes 4 files / 40 tests and the full suite passes 87
files / 1,209 tests. All workspace/API typechecks, four-owner import boundaries,
production build, complete `verify`, and diff checks pass. The build remains at
97 modules; the independently lazy Linear Systems assets are 62.96 kB raw /
18.42 kB gzip JavaScript and 16.50 kB raw / 3.49 kB gzip CSS. Bounded in-app
browser replay covers Light/Dark, 1440 × 900, 390 × 844, 320-pixel containment,
row swap, elimination, rapid replay, edit/preset/Run/collapse/route-leave
cancellation, focus preservation, and clean console/overflow state. The
browser surface exposes no reduced-motion media emulator, so that path is
verified by deterministic DOM tests plus the shipped CSS contract rather than
claimed as emulated browser evidence. No numerical, Computation Trace,
Architecture v1, Mathematical Presentation v1, Tutor, Glossary, dependency,
push, or deployment change is included. This remains valid point-in-time
implementation evidence, but the direct maintainer Teaching v2 decision above
pauses its final acceptance. Tutor integration is not the current task.

The remainder of this document preserves the prior Glossary execution record
as historical evidence. Its former pending-acceptance language is superseded
for current planning by the maintainer-accepted baseline above and is not a
request to reopen those gates.

## Historical accepted Glossary record

Project Identity Migration complete. The Content-Agnostic Interactive Glossary
Framework design is approved and committed. Its repository-grounded
implementation plan was conservatively audited, corrected for documentation
findings, and passed conservative re-audit with verdict **SAFE TO IMPLEMENT**.
Commit 1, `Build glossary model and scope lifecycle`, is implemented and
accepted after its conservative audit returned **SAFE TO PROCEED**. Commit 2,
`Fix readonly math accessible ownership`, is implemented and locally verified.
Commit 3, `Add shared glossary surfaces`, is implemented and locally verified
under direct maintainer authorization. Its conservative audit found two P1
lifecycle defects and one P2 copy defect (`P0 = 0`); the narrow follow-up is
locally implemented and verified. The second conservative re-audit then found
the P1 deferred Tutor restore leak and the P2 pre-mount abort cleanup defect;
both are fixed and locally verified in a second narrow lifecycle follow-up.
The final conservative re-audit of Commit 3 and both follow-ups returned
**SAFE TO PROCEED** with `P0 = P1 = P2 = P3 = 0`. Commit 4, `Complete
glossary framework playground`, is implemented and locally/browser verified.
The generic production registry still contains no Glossary entries. The
complete committed Playground, development controls, fixtures, styles, About
entry, and shortcut are DEV-only. The later E2 integration supplies its
accepted registry only through the complete-IVP route binding. The complete
four-phase implementation completed its first adversarial local release review
on 2026-07-28 with verdict **RELEASE BLOCKED**. Its P1 pending-load
scope-replacement defect, substantive P2 one-shot Tab-bridge defect, and
DEV-only P3 unbounded-log issue were narrowly repaired. A repeated independent
review of exact repair commit
`8af3ed80b25a520cfa61fa2d7037dea9ed2899d1` then returned
**APPROVED FOR LOCAL FRAMEWORK RELEASE**. The historical blocked review remains
unchanged, while the framework is now locally accepted as complete. The
generic production registry still contains no active entries; E2 leaves
Home/static routes outside its lazy import graph. Nothing was pushed or
deployed by the repair, final review, or E2 implementation. The separate
project-language gate is also
complete: Yiding (Bruce)
Tian recorded all nine maintainer decisions on 2026-07-28, and the terminology,
notation, and teaching-voice standards are approved as Version 1. This approval
is documentation governance only. The Glossary catalog and project copy audit
are now reconciled against Version 1, with all 197 IDs, 55 copy records, six
implementation groups, and local traceability/validation recorded. Group A
ready records `COPY-001`, `COPY-002`, `COPY-004`, and `COPY-005` are accepted.
Group B records `COPY-006` through `COPY-019` and Group C records `COPY-020`
through `COPY-029` are accepted. Group D records `COPY-030` through `COPY-040`
are accepted in `0a32939c6a0bd218003ba87181f66033695c233b`. Group F1
implements `COPY-043`, completes the pre-Glossary consistency review, and is
accepted as prerequisite state. All twelve `COPY-NC-*` records remain
review-only and are classified.
The four language findings and one deterministic Tutor behavior finding from
that review are now `CLOSED_VERIFIED` in the separately authorized two-commit
[pre-Glossary repair](docs/reviews/2026-07-29-pre-glossary-repair-review.md).
The repair verdict is **PRE-E REPAIR COMPLETE — GROUP E MAY BE PLANNED**,
and the maintainer accepted both repair commits as prerequisites for Group E0.
The documentation-only
[ODE Glossary Wave 1 design](docs/superpowers/specs/2026-07-29-ode-glossary-wave-1-design.md),
[content packet](docs/content/ODE_GLOSSARY_WAVE_1_CONTENT_PACKET.md),
[approval checklist](docs/content/ODE_GLOSSARY_WAVE_1_APPROVAL_CHECKLIST.md),
and [readiness review](docs/reviews/2026-07-29-ode-glossary-wave-1-design-readiness-review.md)
now record verdict **DESIGN AND CONTENT APPROVED — E1 AUTHORIZATION
REQUIRED**. Yiding (Bruce) Tian approved D01–D18 as Option A, all ten cards
with exact revisions, and all ten annotation design records on 2026-07-29.
The subsequent E1 implementation authorization stopped before any source or
test change when repository inspection confirmed that the accepted compact
`GlossaryEntry` and module override cannot represent the approved rich card
content. The maintainer selected `E1-SCHEMA-01 = Option 2` and rejected a
compact projection. The documentation-only
[rich Glossary content-model design](docs/superpowers/specs/2026-07-29-rich-glossary-content-model-design.md),
[field matrix](docs/content/RICH_GLOSSARY_CONTENT_FIELD_MATRIX.md), and
[design-readiness review](docs/reviews/2026-07-29-rich-glossary-content-model-design-readiness-review.md)
now close the generic schema, complete-surface, validation, and navigation
decisions. The subsequent repository-grounded
[implementation plan](docs/superpowers/plans/2026-07-29-rich-glossary-content-model-implementation-plan.md)
and
[plan review](docs/reviews/2026-07-29-rich-glossary-content-model-plan-review.md)
now record verdict **RICH GLOSSARY IMPLEMENTATION PLAN COMPLETE —
AUTHORIZATION REQUIRED**. The maintainer then explicitly authorized the
generic implementation. The model, builders, validation, module composition,
scope resolver, complete rich-card renderer, and surface-local related-term
navigation were implemented and locally verified in commit
`6ef085d0b0271a5e7ed5a9f64ef4e6a05b5f257e` (`Extend Glossary rich content
model`), which the maintainer accepted as the fresh E1 starting point. The
[implementation review](docs/reviews/2026-07-29-rich-glossary-content-model-implementation-review.md)
records verdict **RICH GLOSSARY MODEL IMPLEMENTED — READY FOR MAINTAINER
ACCEPTANCE** as its point-in-time verdict. The separately authorized fresh E1
implementation now adds exactly two inert Core entries, eight inert ODE
entries, two ODE context-only overrides, and an exact ten-card composition.
The production registry remains empty, no production importer exists, and no
annotation, ODE binding, or visible Glossary behavior was added. The
[E1 content review](docs/reviews/2026-07-29-ode-glossary-wave-1-e1-content-review.md)
records the local evidence. The maintainer accepted E1 at
`08b80522283438a233974456a026a6dbc2a96746`. The first E2 integration pass
stopped before source/test changes because its Method helper and Compare
Output contracts conflicted or lacked exact copy. The documentation-only
[E2 Runtime Contract](docs/content/ODE_GLOSSARY_WAVE_1_E2_RUNTIME_CONTRACT.md)
now records `E2-CONTRACT-01` and `E2-CONTRACT-02`, reconciles all ten
annotation records, and is the sole implementation authority for E2
interaction details. The separately authorized E2 implementation now creates
one complete-IVP route-instance binding and the ten exact local annotations,
with `/ode` plain, Tutor unchanged, and the generic production registry still
empty. The
[E2 integration review](docs/reviews/2026-07-30-ode-glossary-wave-1-e2-integration-review.md)
records focused/full verification, exact desktop/mobile browser evidence,
scope and disposal ownership, and the production import/bundle boundary. E2
was accepted for entry into the mandatory E3 gate at
`8c8e90a6abc177132f3e033bdb575f2042b982a9`. The independent
[E3 integration review](docs/reviews/2026-07-30-ode-glossary-wave-1-e3-integration-review.md)
passed the exact committed E1+E2 state with `P0 = P1 = P2 = 0` and introduced
no product-source change. E1, E2, and E3 are accepted. The first mandatory F2
review then found `F2-TUTOR-NOT-001` and `F2-TUTOR-TERM-001` at P1 and
`F2-ABOUT-STATUS-001` at P2. Those three findings are now narrowly corrected,
tested, accepted for corrected-state review, and preserved. The fresh
independent F2 review then found `F2-TUTOR-NOT-002` and
`F2-ODE-OVERVIEW-TERM-001`; both are now narrowly corrected with
`F2-ODE-OVERVIEW-TERM-002` normalized in the same approved sentence. The final
independent F2 review found `F2-COMPARE-COUNT-001` and
`F2-GOV-STATUS-001`; both are now narrowly corrected with direct count
evidence and synchronized current-state documentation. All seven known F2
blockers remain closed. The final independent F2 rerun of exact commit
`451a0cbe5e67afc58b280795dd13d43db09d16af` passed with `P0 = P1 = P2 = 0`
and is recorded in the
[final F2 consistency review](docs/reviews/2026-07-31-ode-glossary-wave-1-final-f2-cross-surface-consistency-review.md).
F2 is independently passed pending maintainer acceptance of that review
commit. `COPY-003` and
`src/pages/homePage.ts` remain held and unchanged. `COPY-041` and `COPY-042`
remain open, as do the nonblocking `F2-GLOSSARY-VOICE-001` and
`BASELINE-EXT-FONT-001` carry-forwards and `F2-EVIDENCE-001` evidence
limitation. No push, Preview deployment, or Production deployment was
authorized or performed; the public deployed site remains unchanged.

A separate bounded frontend visual-polish pass and one follow-up theme/Tutor
refinement are implemented, locally verified, and Chrome-reviewed at
`1440 × 900`, `390 × 844`, and `720 × 450`. The first-pass
[review](docs/reviews/2026-07-31-frontend-visual-polish-review.md) remains
historical evidence; the current
[theme and Tutor refinement review](docs/reviews/2026-07-31-frontend-theme-and-tutor-refinement-review.md)
records the lower-glare default Light theme, restored optional Dark theme,
initial-focus correction, theme-aware charts, and larger Tutor workspace.
Product, numerical, Glossary, and Tutor mathematical behavior is unchanged.
The refinement foundation and final display-brand/icon audit are included in
local source commits, await maintainer review, and have not been pushed or
deployed; they do not replace or advance the active F2 release decision gate.

## Current released baseline

The Theme-Ready Platform Shell and Initial Value Problems Lab are implemented,
locally verified, Preview-verified, and Production-verified at
`https://numerical-t-lab.vercel.app/`. The release state is recorded in
`docs/PROJECT_HANDOFF.md` and the Numerical T-Lab rename review.

## Historical Glossary milestone

**ODE Glossary Wave 1 F2 — Final Consistency Review Acceptance Gate**

The content-agnostic framework and pre-E repairs are accepted prerequisites.
Group E0 design and content governance is complete and maintainer-approved.
The historical E1 attempt produced no source or test changes and confirmed a
schema mismatch. Option 2 was selected, implemented, accepted at
`6ef085d0b0271a5e7ed5a9f64ef4e6a05b5f257e`, and used as the required fresh
restart point. At the accepted E1 boundary, content was locally implemented
and verified as inert:
two Core entries, eight ODE entries, two context-only overrides, and ten
composed cards existed in source while the production registry, production
importer count, annotation count, and ODE binding count were all zero.
E1 is accepted at `08b80522283438a233974456a026a6dbc2a96746`. The canonical
E2 Runtime Contract fixes all ten exact owners, trigger texts, DOM
compositions, state/mode rules, lifecycle rules, duplicates, and direct test
ownership. E2 is now locally implemented and verified through one
complete-IVP route-instance binding, ten exact annotation definitions, four
route-owned scopes, and the accepted `E2-CONTRACT-01` and
`E2-CONTRACT-02` behavior. `/ode` remains unannotated, Tutor remains
independent, and E1, E2, and E3 are accepted. The first F2 review found two P1
and one P2 blocking consistency findings; its accepted correction remains
closed. The fresh corrected-state F2 review found two additional P1 blockers,
and the same `/ode` sentence also carried one nonblocking wording drift. The
two blockers and that wording drift are locally corrected. The subsequent
final independent F2 review found one Compare count-semantics blocker and one
current-state governance blocker. Both are locally corrected, so all seven
known F2 blockers remain closed. The final independent F2 rerun passed with
zero P0/P1/P2 findings and is pending maintainer acceptance of the F2 review
commit.

## Completed Project Identity Migration

The canonical learner-facing product name is **Numerical T Lab** with slug
`numerical-t-lab`. Active product UI, internal package, route titles, Tutor
identity wording, migration documentation, and publication-safety preparation
are recorded by:

- [Numerical T-Lab Rename Migration Plan](docs/superpowers/plans/2026-07-22-numerical-t-lab-rename-migration-plan.md)
- [Project Rename Handoff](docs/project-rename/HANDOFF.md)

The public and private GitHub repositories, local remote URLs, existing Vercel
project, Git integration, and canonical Production domain now use
`numerical-t-lab`. Repository IDs, visibility, Vercel Project ID, deployment
settings, and the `main` Production branch were preserved. The former
Production domain remains a verified alias. The local directory rename is
complete at `D:\numerical-t-lab`; Cursor/Codex reopened from that canonical
path with valid Git state, branch `main`, unchanged rename-checkpoint HEAD,
`521d8eba2aad3ad361c289e3e4b1e8e2e7ce6f30`, a clean worktree, and the
canonical remotes. No identity-migration action remains pending.

## Why this milestone

The platform needs shared, accessible, domain-neutral definition infrastructure
before reviewed ODE, Linear Algebra, or PDE terminology is published. The
framework must preserve current ownership, lifecycle, accessibility, and lazy
loading while keeping formal mathematical content separate.

## Authoritative design

[ODE Glossary Wave 1 Design](docs/superpowers/specs/2026-07-29-ode-glossary-wave-1-design.md)

Status: **D01–D18, ten revised cards, and ten annotation records are
maintainer-approved; E1, E2, and E3 are accepted; the first F2 review's three
blockers, the fresh review's two blockers, and the final review's count and
governance blockers remain closed; the final independent F2 rerun passed with
zero P0/P1/P2 findings and is pending maintainer acceptance of the F2 review
commit.**

[Rich Glossary Content Model and Complete Surface Design](docs/superpowers/specs/2026-07-29-rich-glossary-content-model-design.md)

Status: **Design complete; generic model/surface implementation accepted in
`6ef085d0b0271a5e7ed5a9f64ef4e6a05b5f257e` as the E1 starting point.**

## Authoritative rich-model implementation plan

[Rich Glossary Content Model Extension Implementation Plan](docs/superpowers/plans/2026-07-29-rich-glossary-content-model-implementation-plan.md)

Status: **Repository-grounded plan executed in one locally verified generic
implementation commit and accepted as the E1 starting point.**

Framework authority remains the
[Content-Agnostic Interactive Glossary Framework Design](docs/superpowers/specs/2026-07-22-content-agnostic-interactive-glossary-framework-design.md),
which is implemented and locally accepted. The rich-model design is a bounded
extension prerequisite; it does not reopen the accepted Host, modal, scope,
annotation, Store, or Tutor ownership decisions.

## Historical framework implementation plan

[Content-Agnostic Interactive Glossary Framework Implementation Plan](docs/superpowers/plans/2026-07-23-content-agnostic-interactive-glossary-framework-implementation-plan.md)

Status: **Repository-grounded plan fully executed locally. The framework is
accepted after the historical blocked review, narrow repairs, and repeated
independent final review. No production content or ODE binding was added.**

## Approved delivery sequence

1. Add and review Codex project guidance on local `main`. Complete.
2. Document the Content-Agnostic Interactive Glossary Framework design on
   local `main`. Complete in the commit containing this plan.
3. Create the repository-grounded implementation plan on local `main`.
   Complete; conservative audit findings were corrected, and the corrected
   plan passed conservative re-audit.
4. Build Glossary model and scope lifecycle. Complete and accepted after
   conservative audit.
5. Fix readonly math accessible ownership as a narrow prerequisite. Complete
   locally.
6. Add shared Glossary surfaces and the minimal committed DEV-only Playground
   harness. Complete locally; two lifecycle audit follow-ups locally verified
   and accepted by final conservative re-audit.
7. Complete the development Glossary Playground. Complete locally and
   browser-verified; production-exclusion audit passed.
8. Complete the first full framework release review. Completed with historical
   verdict **RELEASE BLOCKED**.
9. Repair the P1 pending-load scope-replacement path and P2 one-shot Tab
   bridge, bound the DEV-only logs, add focused regressions, and repeat the
   independent release review. Complete locally; repeated verdict
   **APPROVED FOR LOCAL FRAMEWORK RELEASE**.
10. Resolve and approve the separate notation and definition foundation.
    Complete; all nine decisions are recorded and the three language standards
    are maintainer-approved Version 1.
11. Reconcile the Glossary catalog and project copy audit and create the
    repository-grounded project-language implementation plan. Complete as a
    documentation-only iteration; no recommendation was implemented.
12. Implement Group A, Platform and overview copy, only in a separately scoped
    task with focused tests and browser review. Complete and accepted;
    `COPY-003` remained held.
13. Implement Group B, IVP Method/Data/Output and preset language, only in a
    separately scoped task with focused tests and browser review. Complete and
    accepted.
14. Implement Group C, Convergence and error language, only in a separately
    scoped task with focused tests, numerical/structural audit, browser review,
    and build inspection. Complete and accepted.
15. Implement Group D, Tutor numerical language, only in a separately scoped
    task with focused API/prompt/Host/lazy tests, structural audit, localhost
    demo/browser review, and production artifact inspection. Complete locally
    and accepted.
16. Complete Group F1 before production Glossary integration: implement only
    `COPY-043`, classify all twelve `COPY-NC-*` records, audit accepted A–D
    language and current behavior, and record the pre-E gate. Complete locally
    with verdict **GROUP F1 COMPLETE — PRE-E FIXES REQUIRED**.
17. Repair and accept `F1-LANG-001` through `F1-LANG-004` and
    `F1-BEH-001` in separately authorized focused work. Complete and accepted
    as the Group E0 prerequisite.
18. Prepare the ODE Glossary Wave 1 content, annotation, ownership, binding,
    Tutor-boundary, rollout, checklist, and readiness packet without
    implementation. Complete and maintainer-approved as Group E0 governance;
    no implementation authorized.
19. Begin E1 content data only after explicit maintainer approval. Authorization
    was issued, but work stopped before source/test changes at the confirmed
    rich-field schema mismatch. Historical stop; superseded by step 23.
20. Design the minimal generic rich content model, complete-card surface,
    validation, navigation, compatibility, and rollback boundary. Complete as
    documentation only with verdict **RICH GLOSSARY MODEL DESIGN COMPLETE —
    IMPLEMENTATION AUTHORIZATION REQUIRED**.
21. Create and review the repository-grounded generic rich-model
    implementation plan. Complete as documentation only with verdict **RICH
    GLOSSARY IMPLEMENTATION PLAN COMPLETE — AUTHORIZATION REQUIRED**.
22. Implement and review the generic rich model/surface only after separate
    maintainer authorization. Complete and accepted in
    `6ef085d0b0271a5e7ed5a9f64ef4e6a05b5f257e`.
23. Restart E1 from the beginning against the accepted rich model after a new
    explicit gate. Complete, accepted, and inert at
    `08b80522283438a233974456a026a6dbc2a96746`.
24. Reconcile all ten E2 interaction records after the first integration pass
    stopped before source/test changes. Complete as documentation through
    `E2-CONTRACT-01`, `E2-CONTRACT-02`, and the canonical E2 Runtime Contract.
25. Implement the accepted E2 contract through one ODE-owned complete-IVP
    binding and ten explicit annotation definitions. Complete and accepted for
    entry into E3 at `8c8e90a6abc177132f3e033bdb575f2042b982a9`.
26. Complete E3 integration review after maintainer acceptance of E2.
    Complete with zero P0/P1/P2 findings and maintainer-accepted.
27. Complete the first mandatory Group F2 review after E3. Complete with two
    P1 and one P2 blocking consistency findings.
28. Correct only the three authorized first-review F2 blockers. Complete,
    verified, and accepted for corrected-state re-review.
29. Perform a fresh independent F2 re-review of the exact corrected commit
    only after separate maintainer authorization. Complete with two additional
    P1 findings and one adjacent P3 wording drift.
30. Correct the two remaining blockers and normalize the same `/ode` sentence.
    Complete, verified, and maintainer-accepted for the subsequent final F2
    review.
31. Perform the independent F2 review of the exact final terminology
    correction commit. Complete with one P1 Compare count-semantics finding
    and one P2 current-state governance finding.
32. Correct only those two findings and prove all seven historical blockers
    closed together. Complete, verified, and maintainer-accepted for the final
    independent F2 rerun.
33. Perform one final independent F2 rerun of the exact count/governance
    correction commit only after separate maintainer authorization. Complete
    with `P0 = P1 = P2 = 0`; pending maintainer acceptance of the F2 review
    commit.
34. Push only when explicitly requested by the maintainer.

## Historical next action (superseded)

Maintainer acceptance of the documentation-only
[final F2 consistency review](docs/reviews/2026-07-31-ode-glossary-wave-1-final-f2-cross-surface-consistency-review.md),
followed by a separate, commit-specific release decision. F2 introduced no
product-source change. `COPY-003` remains deferred with the PDE module.
`COPY-041`, `COPY-042`, `F2-GLOSSARY-VOICE-001`, `BASELINE-EXT-FONT-001`,
and `F2-EVIDENCE-001` remain nonblocking open items. Push, Preview, and
Production remain unauthorized.

The independent frontend review gate is maintainer visual review of the local
theme/Tutor refinement commit and ignored evidence. Product behavior is
unchanged, and the source commit has not been pushed or deployed. The existing
Vercel project now stores `AI_TUTOR_MOCK=true` for Development, Preview, and
Production, but that configuration applies only to a future deployment; no
redeployment was triggered.

## Parallel content foundation

A private-source-reviewed terminology, notation, teaching-voice, Glossary
candidate, and current-copy foundation exists under
[`docs/content/`](docs/content/). It processed all 29 admitted sources. Yiding
(Bruce) Tian completed the decision packet and approval checklist for the nine
explicit conflicts on 2026-07-28. The terminology, notation, and teaching-voice
documents are now maintainer-approved Version 1 standards; no decision is
deferred.

The [Glossary catalog](docs/content/GLOSSARY_CATALOG.md) and
[project copy audit](docs/content/PROJECT_COPY_AUDIT.md) are reconciled against
Version 1. The catalog retains exactly 197 IDs, separates language approval,
product relevance, runtime readiness, and rollout wave, and includes rich
planning drafts for 10 Wave 1 and 13 high-priority Wave 2 terms. The copy audit
rescans 55 records and maps exact replacements to Groups A–F. The standards and
reconciliation publish no production term, definition, annotation, or notation
migration. Groups A through D and the Group F1/pre-E prerequisite state are
accepted. Group F1 implements only `COPY-043` and records the pre-Glossary
review; it does not complete Group F. `COPY-003` remains held. Group E0 design
and content governance is maintainer-approved. The historical E1 stop led to
the accepted generic rich model; the fresh E1 restart is now locally complete
with two Core entries, eight ODE entries, two context-only overrides, and ten
composed cards. It remains inert and is accepted. The E2 runtime contract and
implementation are accepted, and independent E3 review is accepted. The first
F2 review found two P1 and one P2 blockers, and its accepted correction remains
closed. The fresh F2 review found two additional P1 blockers; both are locally
corrected, with the adjacent `/ode` time-step wording drift normalized in the
same sentence. The final independent review then found one Compare
count-semantics blocker and one current-state governance blocker; both are
locally corrected. All seven known F2 blockers remain closed. The final
independent F2 rerun passed with zero P0/P1/P2 findings and is pending
maintainer acceptance of the F2 review commit.
The continuation state is
[the project-language handoff](docs/content/HANDOFF.md). Nothing from these
copy iterations was pushed or deployed.

## Current production behavior

- The Platform Shell is implemented and available.
- Initial Value Problems Lab is the complete numerical Lab.
- Production is verified at `https://numerical-t-lab.vercel.app/`.
- The former Production address remains available as a verified alias.
- The production registry contains no Glossary entries.
- The deployed Production baseline initializes an inert Platform Glossary Host
  and remains unchanged because E2 was not pushed or deployed.
- The local E2 production build creates one complete-IVP route-instance
  binding and ten approved annotations; `/ode`, Home, and static pages remain
  unannotated and do not import Wave 1 content.
- No push, Preview deployment, or Production deployment was authorized or
  performed for E1, E2, E3, or any F2 correction. The public deployed site
  remains on its previously deployed commit.
- The complete DEV-only Playground, its ten neutral fixtures, development
  controls, About entry, shortcut, and route stylesheet are excluded from the
  production build.
- Commits 1 through 4 add no visible production Glossary behavior.
- Project notation is approved as a documentation standard; production
  definitions, formula migration, and visible content remain deferred.

## Explicit non-goals

- No Wave 1 annotation outside the complete Initial Value Problems Lab.
- No runtime notation migration or notation profile.
- No real Tutor Glossary queue.
- No `/ode`, Linear Algebra, or PDE annotation.
- No Linear Algebra or PDE Glossary content.
- No private-reference processing in runtime or CI.

## Historical Glossary review gate (closed)

The framework release gate is closed with
**APPROVED FOR LOCAL FRAMEWORK RELEASE**. The prior **RELEASE BLOCKED** review
remains historical evidence and all three of its findings are closed. The
project-language approval gate is also closed: all nine choices are recorded
and the three standards are approved as Version 1. The catalog/copy
reconciliation gate is also closed with 197 stable IDs and 55 rescanned copy
records. Groups A through D, Group F1, and both pre-E repair commits are
accepted; `COPY-003` remains held. Group E0 Wave 1 design and content
governance is complete. The historical E1 schema stop was resolved by the
accepted Option 2 generic rich model at
`6ef085d0b0271a5e7ed5a9f64ef4e6a05b5f257e`. The freshly authorized E1 restart
is accepted at `08b80522283438a233974456a026a6dbc2a96746`. Its two Core
entries, eight ODE entries, two context-only overrides, and ten composed cards
remain outside the production registry and import graph. The ten-record E2
runtime contract and implementation are accepted. The independent E3 review
of exact commit `8c8e90a6abc177132f3e033bdb575f2042b982a9` passed with zero
P0/P1/P2 findings, introduced no product-source change, and is accepted. The
first F2 review found two P1 and one P2 blocking findings. The three authorized
corrections remain closed. The fresh corrected-state F2 review found two
additional P1 findings; both are locally corrected, along with the one
adjacent P3 `/ode` wording drift. The final review found
`F2-COMPARE-COUNT-001` and `F2-GOV-STATUS-001`; both are locally corrected.
All seven known F2 blockers remain closed. The final independent F2 rerun
passed with zero P0/P1/P2 findings and is pending maintainer acceptance of the
F2 review commit. `/ode` remains unannotated, Glossary Tutor handoff remains
absent, and no push or deployment was authorized or performed.

## Update rule

Every phase transition updates `PLAN.md` in the same coherent commit. Keep this
file as an execution pointer; detailed decisions remain in approved
specifications and implementation plans.
