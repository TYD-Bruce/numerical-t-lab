# AGENTS.md

This file is the repository operating contract for Codex and other coding agents working on **Numerical T-Lab**. It defines the reading order, truth hierarchy, engineering invariants, Git workflow, verification rules, documentation duties, and current milestone guardrails.

It is intentionally detailed, but it is still a map—not a substitute for approved feature specifications, repository-grounded implementation plans, numerical contracts, feature HANDOFF files, or release reviews.

## 1. Project identity

**Product:** Numerical T-Lab

**Descriptor:** An Interactive Numerical Analysis Laboratory

**Brand pillars:**

> Theory · Tools · Teaching

**Learning cycle:**

> Understand → Compute → Visualize → Analyze

**Current complete Labs:** Initial Value Problems Lab and Linear Systems Lab

**Product domains:**

- Numerical ODE — implemented
- Numerical Linear Algebra — Linear Systems Lab implemented locally
- Numerical PDE — Lab not implemented; roadmap page available

**Current milestone and review gate:** Read `PLAN.md`. Both complete Labs have
Tutor interfaces in the local implementation; release status belongs to
`docs/PROJECT_HANDOFF.md`, not this operating contract.

All new user-facing product UI is English-only unless the maintainer explicitly approves another language strategy.

## 2. Start-of-task protocol

Before editing any file:

1. Run:
   - `git branch --show-current`
   - `git rev-parse HEAD`
   - `git status --short`
   - `git log --oneline --decorate -15`
2. Require:
   - branch is `main`, unless the maintainer explicitly requested otherwise;
   - worktree is clean, including untracked files;
   - no unrelated changes are present.
3. Read, in order:
   1. `AGENTS.md`
   2. `AGENTS.override.md`, if present locally
   3. `PLAN.md`
   4. `docs/INDEX.md`
   5. the active feature HANDOFF, if one exists
   6. the authoritative feature design specification, if one exists
   7. the authoritative repository-grounded implementation plan, if one exists
   8. `docs/architecture/CURRENT_ARCHITECTURE.md`
   9. `docs/contracts/NUMERICAL_CONTRACTS.md`
   10. `docs/PROJECT_HANDOFF.md`
   11. the latest relevant review document, if one exists
4. Inspect actual source, callers, tests, lifecycle, and imports before proposing paths or APIs.
5. If a meaningful conflict exists, stop and report it. Do not silently choose a convenient interpretation.

If the worktree is dirty, inspect the exact status and diff before continuing. Continue only when the current task explicitly targets those changes or the maintainer confirms they are in scope; otherwise stop and report them. If another agent is actively writing or the expected HEAD does not match, stop. Never discard, stash, reset, or overwrite existing work automatically.

## 3. Sources of truth

Use each document only for its intended responsibility:

- `GOALS.md` — durable product direction
- `docs/architecture/CURRENT_ARCHITECTURE.md` — current implemented architecture
- `PLAN.md` — current milestone, phase, and next action
- `docs/PROJECT_HANDOFF.md` — latest released state and continuation context
- `docs/contracts/NUMERICAL_CONTRACTS.md` — numerical behavior contracts
- `docs/superpowers/specs/` — approved designs
- `docs/superpowers/plans/` — repository-grounded implementation plans
- `docs/reviews/` — evidence and release verdicts
- feature HANDOFF files — fine-grained continuation state
- `docs/research/` — evidence only; non-canonical unless promoted
- `README.md` — public-facing information and concise Changelog
- Git history — exact implementation chronology

### Conflict order

1. Maintainer’s direct current instruction
2. `AGENTS.md`
3. Relevant approved feature design
4. Relevant approved implementation plan
5. `docs/contracts/NUMERICAL_CONTRACTS.md` for numerical behavior and
   `docs/architecture/CURRENT_ARCHITECTURE.md` for implemented ownership
6. `PLAN.md` for the active phase and next action
7. Active feature HANDOFF
8. `docs/PROJECT_HANDOFF.md`
9. `README.md`
10. Older specs, plans, research, or historical reviews

Each document governs only its stated responsibility; this ordering does not let a feature document silently override a numerical or security contract. Do not treat an old plan as current architecture after later implementation. Do not treat a research inventory as an approved standard.

## 4. Current implemented baseline

The implemented platform includes:

- Platform Home and History API routes
- Numerical ODE overview
- Initial Value Problems Lab at `/ode/initial-value-problems`
- Numerical Linear Algebra overview and the Linear Systems Lab at
  `/linear-algebra/linear-systems`
- Numerical PDE roadmap page
- Human-Friendly Math Expressions
- safe editable and readonly math
- controlled legacy expression import
- exact-solution input and presets
- Convergence Study Version 1
- AI Tutor with module-isolated state
- route-level lazy loading and intent prefetch
- in-memory Lab and Tutor sessions
- Resume cards and meaningful-work detection
- one minimal platform-level `beforeunload`
- per-history-entry and per-Lab scroll restoration
- accessible New experiment behavior
- Vite root-base assets and Vercel SPA fallback

For exact production HEAD, deployment evidence, bundle sizes, test totals, and known limitations, read the latest project HANDOFF and release review. Never infer production status from local `main` alone.

## 5. Main-only maintainer workflow

This repository uses a maintainer-owned, main-only local workflow for Codex tasks.

- Work directly on local `main`.
- Do not create or switch branches unless explicitly requested.
- Do not create worktrees.
- Require a clean worktree before starting a new task, except when the task explicitly targets existing changes under Section 2.
- Do not discard, stash, reset, amend, rebase, cherry-pick, or rewrite history.
- Do not pull, fetch, or contact remotes unless explicitly instructed.
- When the task authorizes a commit, create one coherent commit per approved task boundary.
- Stage only approved files.
- Do not push unless explicitly instructed.
- Leave the worktree clean after committing.
- When a commit is created, report its SHA and final `git status --short`.

This rule governs maintainer-directed Codex work. External contributors may still use forks and pull requests.

## 6. Codex and Cursor coordination

### Codex

Codex is the primary worker for:

- repository-grounded analysis;
- design and implementation planning;
- approved implementation work;
- tests and verification;
- documentation and HANDOFF updates;
- release evidence.

Do not start a later phase when the task says to stop for review.

### Cursor

Cursor is the conservative secondary auditor.

Cursor may:

- inspect committed or stable uncommitted work;
- identify small bugs, path/import mistakes, lifecycle issues, documentation inaccuracies, accessibility regressions, and missing focused tests;
- apply only small, unambiguous, low-risk fixes when the maintainer allows writing.

Cursor must not:

- commit, pull, push, fetch, branch, merge, rebase, reset, stash, amend, or rewrite history;
- change numerical algorithms, architecture, dependencies, security boundaries, or product decisions without a separate task;
- write while Codex is actively editing the same files.

Cursor fixes remain uncommitted. Codex must inspect and understand them before including them in a coherent commit.

### Task prompt contract

When preparing a reusable Codex/Cursor task, keep the task contract explicit:

- use a short descriptive title;
- state a model or effort requirement only when it matters;
- state the exact working directory;
- quote exact file paths when scope is file-specific;
- retain only task-critical context;
- list expected outputs, tests, commands, commit message, and final report fields;
- explicitly forbid broad rewrites, unsupported claims, post-policy leakage, unnecessary full-data reruns, and unrelated changes;
- state whether the task is research, design, planning, implementation, audit, or release;
- state whether source changes, tests, docs, commits, or pushes are allowed;
- define the next review gate.

If scope, ownership, or Git permissions remain materially ambiguous after repository inspection, stop and ask rather than inventing authority. Missing optional prompt formatting is not itself a blocker.

### Local override file

`AGENTS.override.md` is local-only and must remain ignored. It may describe machine-specific commands, private local references, browser setup, or personal review preferences. It must not contain secrets, redefine public product truth, weaken this main-only workflow, or override approved numerical/security contracts.

## 7. Task-type gates

Classify the task before acting.

### Research only

- Gather evidence.
- Separate facts, candidates, gaps, blockers, and recommendations.
- Do not create canonical standards or runtime claims.
- Do not modify runtime code unless explicitly authorized.

### Design only

- Write the authoritative design.
- Define ownership, behavior, lifecycle, exclusions, tests, and acceptance criteria.
- Do not implement source or tests.
- Update status documents only as required.

### Planning only

- Inspect the repository.
- Use real paths, symbols, lifecycle seams, imports, and tests.
- Define phases, tests-first sequence, commit boundaries, rollback points, bundle checks, and browser checks.
- Do not implement.

### Implementation

- Follow approved design and plan.
- Write focused tests first where practical.
- Implement only the current phase.
- Preserve deferred behavior.
- Stop at the requested review gate.

### Audit

- Inspect actual implementation and contracts.
- Classify findings by severity.
- Do not weaken tests or rewrite broadly for style.
- If asked only to review, do not implement the next phase.

### Release

- Run full verification.
- Inspect bundle and deployment boundaries.
- Distinguish local, structural, preview, and production evidence.
- Do not claim checks that were not performed.
- Do not push without explicit authorization.

## 8. Engineering rules

- Prefer narrow, reviewable changes.
- Preserve working ODE behavior unless explicitly authorized.
- Do not refactor unrelated files for symmetry.
- Reuse existing pure helpers, snapshots, adapters, and lifecycle seams.
- Keep platform infrastructure domain-agnostic.
- Keep domain logic inside domain modules.
- Do not duplicate authoritative constants, presets, formulas, or state representations.
- Use controlled, readable failure states.
- Preserve immutable successful snapshots until a later successful operation replaces them atomically.
- Failed operations must not overwrite prior successful output.
- Do not add fake controls, placeholder production content, unsupported claims, or silent scope expansion.

## 9. Numerical invariants

`docs/contracts/NUMERICAL_CONTRACTS.md` is authoritative.

Unless explicitly authorized, do not change:

- solver algorithms or coefficients;
- startup procedures;
- grid/alignment rules;
- iteration tolerances;
- per-level or aggregate budgets;
- exact-solution checks;
- Convergence classifications or precedence;
- error metric definitions;
- BDF startup behavior;
- non-finite and underflow handling;
- solver metadata contracts.

When numerical code changes are authorized:

- read the contract and focused tests first;
- preserve required grouping/evaluation order;
- add focused numerical evidence and boundaries;
- report compatibility changes explicitly.

A mathematically cleaner formulation is not sufficient reason to change a released contract.

## 10. Expression and security boundaries

Non-negotiable:

- no production `eval`;
- no production `new Function`;
- no `compileScalarExpr` resurrection;
- no arbitrary JavaScript expression execution;
- no unrestricted MathJSON authority;
- no user HTML execution;
- no arbitrary Tutor Markdown renderer;
- no raw user LaTeX as authoritative numerical state;
- no evaluator closure in session state;
- no retained browser API key or hosted key entry; the maintainer-approved
  local-connection design permits transient entry only after frontend/backend
  locality and the local session boundary are verified, immediate transfer to
  the local backend, and clearing the input without browser persistence;
- no executable math from rendered Tutor or future Glossary content.

Use the project-owned closed AST and explicit evaluator. Input adapters may normalize documented legacy/MathJSON forms. Core canonicalization must not silently broaden its contract.

Tutor and future Glossary math are display-only and must use controlled DOM construction and safe readonly rendering.

## 11. Pure state and ownership

`AppSessionStore` and Lab sessions contain pure data only.

Never store:

- DOM nodes or custom elements;
- Chart instances or canvas contexts;
- MathLive elements or virtual-keyboard references;
- listeners, subscriptions, or mounted handles;
- functions or evaluator closures;
- `AbortController` / `AbortSignal`;
- pending requests;
- class-based Error objects;
- hidden route DOM;
- platform Host instances.

Store immutable numerical results once and reuse them by reference. Do not deep-clone large arrays during every read or navigation.

Reconstruct runtime objects from pure state after mount.

## 12. Platform and lazy-loading invariants

Current dependency direction:

```text
frontend/src/main.ts
  → Platform bootstrap
  → Router / AppShell / Store / static pages
  → dynamically loaded complete ODE or Linear Systems Lab route
  → ODE UI / solvers / Chart.js / Convergence / Lab-owned bindings
      → first-open Tutor runtime
      → deferred MathLive and Compute Engine
  → Linear Systems UI / pure session / numerical result and trace presentation
```

Required:

- Home/static pages do not statically import ODE runtime.
- ODE remains behind the complete-Lab route boundary.
- Linear Systems remains behind its independent complete-Lab route boundary.
- Tutor UI/networking remains behind first open.
- MathLive and Compute Engine remain deferred.
- Route loaders share cached attempts and use Retry.
- Old navigation work must never mount, focus, scroll, replace, or dispose a newer route.
- Complete Lab DOM is disposed, not hidden.
- Labs do not import the global Router implementation.
- Platform code does not interpret ODE methods, equations, results, or fingerprints.
- Vite public base remains `/` unless an approved deployment task changes it.
- Vercel SPA fallback must not swallow API functions or assets.

Do not add React, React Router, Redux, a new state library, or another framework without approved design.

## 13. Lifecycle and asynchronous safety

Every mounted route/component needs explicit, idempotent disposal.

General route-leave order:

1. close/disconnect surfaces retaining Lab DOM references;
2. close mobile modal presentation before scroll capture;
3. capture history/per-Lab scroll;
4. capture latest pure Lab session;
5. save pure state without inventing activity;
6. disconnect platform Hosts before Lab-owned bindings become invalid;
7. dispose the mounted Lab, which owns its bindings, Charts, MathLive/view handles, listeners, and delayed work;
8. hide the virtual keyboard when required by the route lifecycle;
9. clear route DOM.

Stale callbacks must never:

- mutate a newer render;
- dispose current handles;
- append Tutor responses to another connection;
- restore pre-reset scroll;
- focus detached DOM;
- apply old chart instructions.

Use generation, revision, identity, and connection checks after every asynchronous boundary.

## 14. Tutor invariants

Ownership:

```text
Lab → LabTutorBinding and fresh domain context
Store → pure ModuleTutorSession
PlatformTutorHost → placement and presentation
Lazy Tutor panel → rendering, networking, request UI
```

Rules:

- Host uses live `TutorSessionAccess`; never cache a stale session snapshot.
- Build context per message from current successful state.
- Exclude stale, blocked, partial, or fingerprint-mismatched evidence.
- Preserve ordinary successful-Run Tutor reset behavior.
- Failed Run, close, navigation, and remount do not clear conversation.
- Requests use abort plus generation/identity checks.
- Aborted requests must not append fake assistant/error content.
- Compare remains Tutor-disabled unless a future approved design changes it.
- Do not weaken safe rendering or chart-instruction validation.
- Transcript owns internal scrolling; composer/footer stay inside the Tutor frame.

## 15. Accessibility and responsive behavior

All new UI must be keyboard operable and mobile-safe.

- Use semantic links/buttons.
- Preserve native behavior.
- Provide visible focus.
- Do not rely on color alone.
- Use `aria-current="page"` only for exact routes.
- Use a parent-section state for module subroutes.
- Do not nest interactive controls inside native labels.
- Preserve stable accessible names and error relationships.
- Use `preventScroll` when focus must not disturb restoration.
- Restore focus only to connected valid elements.
- Dialogs/sheets need names, close controls, focus containment, Escape handling, and inert background.
- Avoid multiple modal/focus-trap/scroll-lock owners.
- Prevent horizontal overflow.
- Verify wide desktop and roughly 390 × 844 mobile layouts.
- Prevent duplicate screen-reader formula output.
- Respect reduced motion for nonessential animation.

Do not claim jsdom validates geometry, typography, real custom-element lifecycle, or virtual-keyboard behavior. Use browser evidence.

## 16. Accepted Glossary guardrails

The **Content-Agnostic Interactive Glossary Framework** and reviewed ODE Wave 1
integration are accepted baseline behavior. Their authoritative design is
`docs/superpowers/specs/2026-07-22-content-agnostic-interactive-glossary-framework-design.md`.
Do not reopen or redesign those gates without a present-day regression or
separate maintainer authorization.

Accepted direction:

- framework before formal content, followed by separately reviewed content;
- explicit stable term IDs and explicit scopes;
- no automatic DOM text scanning;
- first enhanced occurrence per term per scope;
- native text-like buttons with subtle dotted underline;
- one platform-wide active definition surface;
- desktop compact preview and pinned popover;
- mobile bottom sheet;
- Lab-owned optional Glossary binding;
- Platform-owned surface Host;
- Glossary state remains transient and outside AppSessionStore;
- surface runtime stays lazy;
- dev-only Playground is excluded from production;
- Tutor handoff contract first; real queue/API integration later.

Do not add without a separately approved content/integration phase:

- canonical notation;
- formal production definitions;
- ODE term annotations;
- real Glossary Tutor cards;
- queue / Keep / Replace behavior;
- notation profiles;
- source-audit runtime;
- private-reference tooling;
- placeholder or unreviewed production terms.

The committed Glossary specification is authoritative. This summary is only a guardrail and must remain consistent with that specification.

## 17. Notation, definitions, and private references

New formal production notation and definitions remain gated by the approved
evidence and notation-decision chain.

- Private local material belongs under `references/private/`.
- It must remain ignored and untracked.
- Do not commit, copy, redistribute, screenshot, or quote substantial passages.
- Do not publish private hashes, manifests, or absolute paths.
- Runtime, normal tests, CI, and public docs must not depend on private files.
- When a maintainer task identifies private course material as the primary internal authority, use it first if available.
- Public university material and textbooks provide cross-checking evidence.
- If private material is unavailable, do not guess its contents.
- Research inventories are non-canonical.
- No notation becomes production truth until approved and recorded in the future notation standard/decision chain.

Contributors may propose notation changes. The maintainer has final authority. The official application maintains one coherent canonical notation; runtime notation profiles require a separate design.

## 18. Research rules

The existing numerical-notation evidence inventory is background research and non-canonical unless `PLAN.md` explicitly reactivates it. Do not let it compete with the active Glossary framework milestone.

For research work:

- state phase, status, canonical status, and runtime impact;
- separate evidence, candidates, readiness, blockers, and migration impact;
- use representative authoritative source/code locations, not exhaustive dumps;
- preserve stable source IDs once formally admitted;
- never turn candidate conclusions into approved standards silently;
- update the research HANDOFF every coherent iteration;
- mark prior research paused/background/superseded if strategy changes;
- keep README Changelog concise and milestone-level.

## 19. Testing and verification

Use Windows-safe commands.

```text
npm.cmd run test:run -- <relevant files>
npm.cmd run test:run
npm.cmd run typecheck
npm.cmd run typecheck:api
npm.cmd run build
npm.cmd run verify
git diff --check
git status --short
git diff --stat
```

Rules:

- focused tests first;
- typecheck after TypeScript changes;
- API typecheck after API/shared API changes;
- full suite for shared routing, lifecycle, Tutor, expression, Convergence, or numerical boundaries;
- full `verify` before release or when required;
- no `npm install` unless authorized;
- no dependency changes without approval;
- never weaken, skip, or suppress tests to obtain a pass;
- do not broaden numerical tolerances without approved evidence;
- prefer behavioral tests over brittle source-string assertions.

For temporary builds, use an external output directory when the task forbids touching `dist`.

## 20. Bundle verification

Use this order:

1. Vite manifest / Rollup graph
2. static versus dynamic imports
3. raw/gzip sizes
4. marker searches as supplementary evidence
5. browser Network checks

Do not add `manualChunks` merely because of a size warning.

Home/static routes must not pull in:

- Chart.js;
- ODE solvers/catalog/presets;
- Convergence implementation;
- full Tutor runtime or grounding;
- MathLive;
- Compute Engine;
- future Glossary registries, surfaces, fixtures, or Playground.

## 21. Documentation duties

### `AGENTS.md`
Stable operating contract. Do not add transient task details.

### `PLAN.md`
Current milestone, status, authoritative design/plan, next action, exclusions, review gate. Update on phase transitions.

### `GOALS.md`
Durable product direction. Update rarely.

### `docs/architecture/CURRENT_ARCHITECTURE.md`
Current implemented architecture only. Planned extensions must be clearly labeled and linked. Do not present conceptual APIs as existing source.

### `docs/INDEX.md`
Documentation map. Update for new authoritative specs/plans/reviews/HANDOFFs and status changes.

### `docs/PROJECT_HANDOFF.md`
Released state, deployment status, major limitations, next milestone. Update after major milestones/releases.

### Feature HANDOFF
Update every coherent feature/research iteration so a new Codex session can continue without the chat.

### README Changelog
Add a concise entry for coherent committed iterations that materially change public behavior, milestone/research status, or project guidance. Do not log every typo or clean audit.

### Specs, plans, reviews
- Spec = approved design
- Plan = repository mapping and execution sequence
- Review = evidence and verdict

Always distinguish:

- planned;
- designed;
- implemented;
- locally verified;
- structurally verified;
- preview verified;
- production verified;
- pending.

## 22. Documentation consistency checks

Before a docs commit:

- search for competing milestone names;
- search for stale design/implementation status;
- verify relative links;
- ensure planned APIs are not described as implemented;
- label historical wording as historical;
- keep README concise and link to `docs/INDEX.md`;
- remove private paths, hashes, secrets, and substantial private quotations;
- resolve TODO/TBD placeholders unless explicitly part of an open-questions section.

## 23. Deployment and remote safety

Never assume remote names or targets. Inspect `git remote -v`.

Before any push:

1. require explicit maintainer authorization;
2. run requested verification;
3. confirm clean worktree and expected HEAD;
4. inspect remotes/branch tracking;
5. use dry-run when requested;
6. distinguish preview from production;
7. do not push production merely to obtain preview evidence;
8. report exact remote and branch.

After deployment, verify nested routes, API JSON, asset content types, chunk sequence, mobile layout, and console health before claiming completion.

## 24. Prohibited scope expansion

Unless explicitly approved, do not add:

- new numerical methods or adaptive stepping;
- Compare/Leap-Frog convergence;
- additional Linear Algebra methods, conditioning diagnostics, or editor scope
  beyond the approved Linear Systems v1 contract;
- PDE solvers or visualizations;
- accounts, authentication, persistent history, cross-tab sync, or offline mode;
- localStorage, sessionStorage, or IndexedDB;
- React, Redux, router libraries, or another framework;
- service workers;
- a new test framework;
- general Markdown/HTML content execution;
- arbitrary code execution;
- theme switch or final fantasy skin;
- runtime notation profiles;
- unreviewed mathematical definitions.

Future scope must be described as future, not implemented.

## 25. Self-review before commit

Inspect the final diff for:

- unrelated files;
- docs-only tasks touching source/config;
- duplicate state representations;
- ownership inversion;
- runtime handles in pure state;
- stale async callbacks;
- missing disposal;
- eager-import regressions;
- numerical changes;
- weakened security;
- accessibility/mobile regressions;
- private-reference leakage;
- Chinese product UI;
- false implemented/planned claims;
- missing PLAN/HANDOFF/INDEX/Changelog updates required by the task;
- unapproved dependencies;
- TODO/TBD placeholders;
- files outside scope.

If a required fix exceeds scope, stop and report it.

## 26. Commit protocol

When the task authorizes a commit:

1. Confirm branch is `main`.
2. Confirm diff contains only approved files.
3. Run focused verification.
4. Run required broader verification.
5. Run `git diff --check`.
6. Stage only approved files.
7. Commit with the requested message.
8. Do not amend.
9. Do not push.
10. Run:
    - `git status --short`
    - `git rev-parse HEAD`
    - `git log -1 --oneline`
11. Report clean status and SHA.

For review-only or explicitly uncommitted work, stop before staging or committing and report the remaining diff.

## 27. Final report contract

Final reports should include, as applicable:

1. starting branch and HEAD;
2. files created and modified;
3. behavior/architecture changed;
4. ownership and lifecycle decisions;
5. explicit non-changes;
6. tests added/modified;
7. focused and full verification;
8. typecheck/build results;
9. browser/manual evidence;
10. bundle/deployment evidence;
11. limitations and deferred work;
12. self-review findings;
13. commit SHA;
14. final branch and `git status --short`;
15. push status;
16. exact next review gate.

Be precise about uncertainty. Never claim evidence that was not obtained. Read `PLAN.md`, rather than this operating contract, for the current execution sequence and review gate.
