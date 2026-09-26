# AI Tutor Connections v1 — Chunk 4A evidence

Date: 2026-09-25
Status: **Locally verified; independent re-audit PASS, initial P3 closed**
Baseline: clean local `main`, `37df723d0f6ca16429c2e6c73036688185400e76`
Scope: Linear Systems grounding and authenticated personal chat profile.

Authority: [design](../superpowers/specs/2026-09-25-ai-tutor-connections-v1-design.md),
[implementation plan](../superpowers/plans/2026-09-25-ai-tutor-connections-v1-implementation-plan.md).
Continuation: [Tutor handoff](../tutor/HANDOFF.md#current-chunk-4a-checkpoint).

## Implemented behavior

`linearSystemsTutorContext.ts` projects only current successful evidence with
matching session/result/original-input fingerprints, matching dimensions and
complete core arrays/trace metadata. Absent, stale, changed, failed and partial
results are unavailable. Original A/b, xHat, P/L/U, permutation, pivots and
residual arrays reuse their immutable source objects. A qualified reference
requires the exact preset fingerprint, ID, name and reference vector. No solver,
new numerical arithmetic, trace replay or matrix mutation is introduced.

The closed Linear DTO contains the full core result and a selected-field trace.
Every stored step kind and its order are preserved, capped at 50 records and
dimension 2–6. Elimination retains the stored multiplier and three involved rows;
substitution retains its recorded right-hand side, numerator, diagonal, result
and optional sum. Explicit omissions cover matrix-scale terms, pivot candidates,
full intermediate matrices, swapped matrix rows, substitution contributions,
residual products and reference components. This is not the full Lab trace.

`tutorContextValidation.ts` checks closed finite shapes, vector/matrix dimensions,
permutations, index bounds, complete stage order, accepted pivots, row-swap count,
declared omissions and reference/trace association. It does not recompute or
attest arithmetic, preset provenance or Lab freshness; those remain Lab-owned.
The existing entire-prompt 32 KiB/40-message budget still fails explicitly without
trimming history or evidence. No provider authority is accepted from chat input.

The authenticated local endpoint advertises `linear_algebra` alongside `ode`.
Personal chat selects the Linear server prompt, attaches current context only
to the latest question and retains authorized history. Both response normalizer
and browser client discard all Linear chart instructions. An older ODE-only
backend remains usable for ODE and cannot receive a Linear send. Existing session,
generation, request, cancellation, expiry and per-Lab history checks remain.

`linearTutor.ts` owns the Linear prompt and deterministic demo generator. They
distinguish residual from solution error, qualify preset reference differences,
disclaim unavailable condition/error-bound evidence and treat pivot safeguards
conservatively. Omitted arithmetic is not reconstructed. Demo replies use only
stored fields and disclose that no live model was used.

## Verification

The initial two new suites failed because the context and Linear prompt/demo
modules did not exist. Implementation testing caught and fixed a TypeScript
exhaustiveness check and updated the obsolete ODE-only capability assertion;
the unsupported-profile assertion became an ODE/Linear context-isolation case.
No test was disabled, tolerance relaxed or numerical source changed.

- Added **63 cases** across projection, validation, prompt/demo, HTTP integration,
  capability decoding and the personal sender. Tests use actual numerical producers
  for both presets, all dimensions 2–6, dense row-swapping data, tiny finite scale
  and a finite sequential-subtraction result with an omitted overflowing sum.
- Native HTTP tests exercise all six adapter families using injected synthetic
  transports; invalid Linear context makes zero provider calls. Browser-runtime
  tests verify other-Lab history isolation, older-backend gating and independent
  client-side action filtering. No real key or external provider is used.
- `npm.cmd run verify`: **126 files / 2,154 tests**, all frontend/numerics/contracts
  and API typechecks, import boundaries and the **122-module** production build.
- Vercel function packaging tests pass unchanged; the hosted adapter/handler was
  not modified. No new dependency, persistence, asset or numerical change.
- In-memory Rollup graph/manifest inspection confirms the Home entry excludes
  Lab, Tutor network, Chart.js and deferred math runtime; the Tutor static closure
  has no Lab/numerics import. The new Linear projection and demo are not bundled
  into frontend production yet. Regular build sizes: Tutor 42.39 kB / 13.76 kB
  gzip; Linear route 75.80 / 22.63; entry 60.19 / 18.63. Existing deferred-math
  size warnings remain; no manual chunks were added.
- `git diff --check` passes. Evidence is in the external task temporary directory:
  `t-lab-chunk-4a-red.log`, `t-lab-chunk-4a-focused.log` (intermediate run),
  `t-lab-chunk-4a-verify.log` (final full verification), and
  `t-lab-chunk-4a-bundle-graph.json` (separate in-memory graph build).

## Independent review gate

The initial **Audit AI Tutor connections** review, GPT-6 Astra Extra High, returned
**NEEDS_FIXES**, P0 0 / P1 0 / P2 0 / P3 1. It found three stale statements in the
backend architecture section describing the personal endpoint as ODE-only. The
correction now names both personal profiles, keeps chart acceptance ODE-only and
separates implemented Linear grounding/API from deferred 4B UI/default service.
No runtime or test edit was needed.

It independently passed 10 focused files / 339 tests, all typechecks, boundaries
and diff checks. Additional external probes exercised 32 actual producer cases
across dimensions 2–6 and scales 1e-320 to 1e300, up to five row swaps and 49 trace
records. Maximum prepared prompt size was 20,376 bytes. The probes checked array
identity, field-for-field projection, unchanged source data, 187 rejected invalid
numeric fields, 29 rejected unknown fields, 21 rejected missing steps, reference
qualification and action filtering. These probes made no network requests.

The auditor inspected the parent's full verification log and independently
traversed the inherited Rollup graph without redundantly rebuilding/rerunning the
full suite. It did not claim browser or live-model evidence. All 24 frozen hashes,
path set, main baseline and empty index matched at both ends; the implementation
task rechecked them and inspected the probe source before applying this correction.
External evidence is `chunk-4a-audit.md`, start/final snapshots, independent probe
source/results and check logs in the existing audit artifact directory.

The bounded re-audit returned **PASS**, P0 0 / P1 0 / P2 0 / P3 0, closing
4A-P3-1. It verified the three corrected documents, current architecture wording,
relative target links, exact manifest delta and start/end 24-file hashes plus
main/HEAD and empty index. No test/build rerun was needed for the wording fix.
The implementation task independently rechecked the re-audit manifest and all
hashes before recording this verdict. `chunk-4a-reaudit.md` and its snapshots
preserve the final evidence. No runtime change followed the independent pass.

## Limits and next gate

This is a grounding/API chunk. The Linear Lab has no new Tutor binding or launcher
yet. The demo generator is tested but not wired to `/api/chat`, whose default
service remains ODE-only. Those seams and the Lab reset/lifecycle integration are
4B, with both-Lab desktop/mobile/browser acceptance. No new browser layout or
live-model correctness claim is made here. No per-chunk push or deployment.

Next: create the independently passed local commit
`Add Linear Systems Tutor grounding and personal profile`, then 4B. All chunks
and the final independent overall audit must pass before push and Vercel update.
