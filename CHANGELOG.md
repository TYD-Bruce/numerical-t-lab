# Changelog

Notable changes and project milestones, newest first. Entries describe the
status at the time; see the [project handoff](docs/PROJECT_HANDOFF.md) for the
current released state.

## 2026-09-26 — Standalone changelog

- Moved the changelog out of README into this file and updated the documentation
  index and contributor guidance to use it.

## 2026-09-26 — AI Tutor Connections v1 released

- Completed the independent overall audit and deployed both Lab Tutor interfaces,
  local connection support and bundled fonts. Hosted personal-key entry remains
  unavailable. See the [Windows guide](docs/tutor/LOCAL_CONNECTIONS.md) and
  [release evidence](docs/reviews/2026-09-26-ai-tutor-connections-release.md);
  real model/provider inference remains untested.

## 2026-09-26 — Tutor connection acceptance and Windows guide

- Documented native Windows setup, local/cloud data destinations, session recovery
  and the separate ODE/Linear grounding rules.
- Completed the remaining local acceptance matrix with cold assets, real math
  editing and both-Lab browser evidence. Provider contracts use mocks; live models
  remain untested. Overall independent audit and deployment are still pending.

## 2026-09-26 — Local Tutor connection recovery

- An unavailable local backend returning a non-JSON HTTP error now reports a
  service failure. Successful responses remain strictly validated, with no
  automatic retry or fallback.
- Enabling a connection now keeps keyboard focus inside Tutor when its original
  button disappears, so Escape continues to close the mobile panel.

## 2026-09-25 — Linear Systems Tutor integration

- Added the Linear Tutor interface, validated default service/demo, and successful
  Solve, input-edit, reset and navigation lifecycle integration.
- Both Labs pass desktop/mobile mock and loopback browser checks; history transfer
  remains an explicit per-Lab choice. Independent chunk audit passed.

## 2026-09-25 — Linear Tutor grounding foundation

- Added current-result Linear context and a validated personal-chat profile,
  with explicit trace-detail limits and explanatory-only replies.
- Verification uses synthetic data and local HTTP; independent re-audit passed.
  The Linear Lab interface and
  default-service/demo wiring remain the next independently reviewed chunk.

## 2026-09-25 — Local Tutor connection settings

- Added local connection settings to the lazy ODE Tutor, with explicit model
  testing, per-Lab history choices, cancellation, progress and controlled errors.
- Model selection keeps credentials on the backend. Native Windows browser
  verification uses synthetic loopback services; independent chunk audit passed.

## 2026-09-25 — Tutor connection provenance and client

- Added a tab-owned personal connection runtime and guarded chat client, with
  one-use history choices for each Lab, cancellation and session expiry.
- Settings and production panel wiring remain next; verification uses synthetic
  providers and actual loopback HTTP, without real API keys or cloud inference.

## 2026-09-25 — Validated personal Tutor chat API

- Added opt-in local ODE chat through a tested connection, with closed evidence
  validation, explicit input limits, safe final replies and request cancellation.
- Browser connection/history consent, settings and Linear Systems Tutor remain
  subsequent chunks. Verification uses synthetic providers and loopback fixtures.

## 2026-09-25 — Lab-owned Tutor context

- Moved ODE evidence and availability into its Lab binding; the shared Tutor
  now rejects outdated replies and chart actions after context/conversation changes.
- Preserved successful/failed Run behavior, Compare exclusion and safe rendering.
  Personal chat, connection settings and Linear Systems Tutor remain later chunks.

## 2026-09-25 — DeepSeek and regional Kimi adapters

- Added direct provider discovery and synthetic testing with explicit regional
  destinations, bounded complete answers and no retry or fallback.
- Known Kimi models requiring preserved reasoning history fail before inference;
  personal chat and settings remain subsequent integration chunks.

## 2026-09-25 — Native Anthropic and Gemini adapters

- Added native provider requests, model discovery and final-answer extraction
  through the existing local session and credential boundary.
- Model lists report incomplete pages explicitly. Synthetic fixtures verify
  refusals, reasoning filtering, cancellation and no automatic retry; settings
  and personal Tutor chat remain subsequent integration chunks.

## 2026-09-25 — Local-compatible and OpenAI connection adapters

- Added explicit local/OpenAI model discovery, synthetic connection testing and
  activation of successfully tested candidates, with bounded final-answer parsing.
- Local inference checks server-reported readiness and disables llama.cpp router
  autoload. Cancellation and failures preserve the active connection. Personal
  chat/UI and other providers remain later chunks; validation uses synthetic fixtures.

## 2026-09-25 — Offline assets and browser resource policy

- Bundled interface fonts and notices, removed external font requests, and
  constrained MathLive to bundled fonts without implicit sound downloads.
- Added CSP for local dev/preview and built HTML, with narrowly scoped theme
  bootstrap and HMR allowances. Verified both Labs with external traffic blocked;
  personal model inference and settings remain subsequent chunks.

## 2026-09-25 — Local Tutor credential/session foundation

- Added explicitly enabled local sessions, per-tab proof, expiry and cancellation,
  plus separate candidate/active connections and fixed destination policies.
- Added bounded, redirect-rejecting provider transport and privacy/lifecycle
  fixtures. Provider adapters, key-entry UI and strict offline mode remain later
  chunks under the independent audit/commit workflow.

## 2026-09-25 — Local Tutor transport foundation

- Constrained local API, dev/preview and HMR listeners; added pre-proxy origin
  checks, JSON/body limits and transport regression tests.
- Incorporated the connection-design review and split implementation into
  separate review gates. Credentials, providers, offline assets and both-Lab
  integration remain later rounds; see [documentation](docs/INDEX.md).

## 2026-08-21 — Module overview presentation consolidated locally

- Unified the ODE, Linear Algebra, and planned PDE overview pages through the
  entry-safe `ModuleOverview` grammar while preserving truthful routes, copy,
  availability, and Home's accepted Linear Algebra → ODE → PDE card order.
- Retired only proven obsolete generic ODE and Linear Systems presentation
  selectors; mathematical layout and dormant Motion ownership remain local.
- Passed 98 files / 1,292 tests, workspace/API typechecks, import boundaries,
  the 111-module Production build, and desktop/390/320 Light/Dark browser QA.
  No numerical, Trace, session, Tutor, Glossary, PDE implementation,
  dependency, push, or deployment change is included.

## 2026-08-19 — ODE presentation hierarchy migrated locally

- Composed the Initial Value Problems Lab's Method, preset guidance, successful
  Output, Compare, chart evidence, and stored-value tables through the accepted
  shared presentation system while preserving ODE state, mathematics,
  Chart.js, Convergence, Tutor, Glossary, and lifecycle ownership.
- Passed 94 files / 1,266 tests, workspace/API typechecks, import boundaries,
  the 108-module Production build, and desktop/mobile Light/Dark browser
  review. Linear Systems inner presentation, Analysis alignment, Motion,
  numerical behavior, dependencies, push, and deployment are unchanged.

## 2026-08-12 — Linear Systems Teaching v2 corrected locally

- Reworked the existing four-step Linear Systems Lab into a computation-led
  teaching experience with visible method concepts, properly typeset native
  MathML solution/factor displays, full trace-owned matrix transformations,
  explicit right-hand-side permutation, and ordered triangular solves.
- Reorganized Diagnostics around the residual computation and moved numerical
  safeguard evidence into a closed advanced disclosure. The existing motion
  implementation remains unmounted pending the next teaching audit.
- Added the maintainer correction pass: standard right-hand-side teaching,
  separate universal and selected-GEPP profiles, a compact equations-to-matrix
  example, and authoritative successful-result context in Output and
  Diagnostics, including stale state.
- Passed 91 files / 1,227 tests, workspace/API typechecks, boundary and build
  gates, plus desktop/mobile Light/Dark in-app browser review. No numerical,
  route, Tutor, Glossary, dependency, push, or deployment change is included.

## 2026-08-11 — Linear Systems Lab completed locally

- Added the independently lazy `/linear-algebra/linear-systems` route with the
  Method/Data/Output/Diagnostics workflow, accessible matrix editor,
  current/stale result lifecycle, Resume, and New experiment integration.
- Added the presentation-only Computation Walkthrough for the existing
  immutable trace, including bounded pivot-failure evidence and stored
  arithmetic disclosure.
- Passed 86 files / 1,189 tests, workspace/API typechecks, boundary checks,
  production build and manifest review, and desktop/mobile browser checks.
  Linear Algebra Tutor, push, and deployment remain pending.

## 2026-08-11 — Architecture v1 completed locally

- Reorganized the same application into explicit frontend, backend, pure
  numerics, and shared-contract npm workspaces while preserving the root
  `/api/chat` Vercel adapter and root developer commands.
- Added deterministic import-boundary verification and current architecture,
  dependency, deployment, and contract documentation.
- Passed 82 files / 1,168 tests, workspace/API typechecks, production build,
  manifest/private-marker review, and local desktop/mobile browser
  equivalence. No feature, push, or deployment was included.
- Detailed verdict:
  [`docs/reviews/2026-08-11-architecture-v1-migration-review.md`](docs/reviews/2026-08-11-architecture-v1-migration-review.md)

## 2026-08-01 — Frontend refinement

- Audited the lower-glare Light theme, restored Dark theme, theme-aware charts,
  initial-focus correction, workflow hierarchy, and transcript-led Tutor layout.
- Finalized the learner-facing display brand as **Numerical T Lab** and retained
  the accepted solid crescent theme-toggle icon.
- Full verification and Preview/Production browser review passed; canonical
  Production serves the synchronized refinement.

## 2026-07-28 — Glossary framework Playground completed locally

- Completed the existing DEV-only Glossary Playground with the content-neutral
  scope, dynamic-context, replacement, formula, composition, placement,
  mobile/modal, mock Tutor, strict-diagnostic, event, and reset matrix.
- Added the development-only About entry and Ctrl/Cmd+Shift+G shortcut through
  one dynamically loaded controls boundary with explicit cleanup.
- Passed focused and full verification, isolated localhost desktop/mobile
  review, and production route/graph/manifest/chunk/marker exclusion checks.
- Production remains unchanged: there are no production Glossary terms,
  annotations, Playground route, Developer Tools entry, shortcut, or visible
  Glossary behavior. Nothing was pushed or deployed.
- Detailed status: [`docs/glossary/HANDOFF.md`](docs/glossary/HANDOFF.md)

## 2026-07-23 — Numerical T-Lab Project Identity Migration completed

- Renamed the public and private deployment repositories while preserving
  their identities and visibility.
- Renamed the existing Vercel project in place, preserved its Project ID and
  settings, and verified Preview and Production deployments.
- Verified `numerical-t-lab.vercel.app` as the canonical Production address;
  retained the former address as a working alias.
- Renamed the local workspace to `D:\numerical-t-lab`, reopened Cursor/Codex
  from the canonical path, and confirmed valid Git state on `main` with the
  canonical remotes.
- Project Identity Migration is complete; repository-grounded
  Content-Agnostic Interactive Glossary Framework implementation planning is
  the next gate.

## 2026-07-22 — Numerical T-Lab identity migration prepared

- Adopted **Numerical T-Lab**, **Theory · Tools · Teaching**, and
  **An Interactive Numerical Analysis Laboratory** across active product
  surfaces.
- Prepared the `numerical-t-lab` package, repository, and deployment targets
  without renaming or contacting external services.
- Preserved the Numerical ODE routes, Initial Value Problems Lab identity,
  numerical behavior, and historical release evidence.
- External repository, Vercel, domain, remote, and local-directory changes
  remain pending review and explicit authorization.

## 2026-07-22 — Interactive Glossary framework design started

- Documented the approved Content-Agnostic Interactive Glossary Framework
  design.
- No canonical numerical notation or production Glossary terms have been
  released.
- Formal content will be reviewed from private course materials before ODE
  rollout.
- Detailed status: [`docs/glossary/HANDOFF.md`](docs/glossary/HANDOFF.md)

## 2026-07-22 — Codex project guidance added

- Added repository-level agent instructions and a current active-plan
  dashboard.
- Added durable product goals, implemented architecture documentation, and a
  documentation index.
- Added a local override pattern for private development context.
- No numerical or runtime behavior changed.

## 2026-07-22 — Numerical notation research started

- Began Milestone 2A-1 evidence collection for a future canonical numerical
  notation standard and Interactive Term Glossary.
- Added a private course-note handling boundary and public-source evidence
  workflow.
- Added a living evidence inventory and research handoff.
- Research is in progress; no canonical notation or runtime Glossary content
  has been released.
- Detailed status: [`docs/research/HANDOFF.md`](docs/research/HANDOFF.md)
