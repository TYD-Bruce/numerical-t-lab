# Architecture v1 Dependency Rules

Status: **Implemented and enforced locally**

## Allowed directions

| Owner | May depend on |
|---|---|
| `frontend` | deliberate `packages/numerics` subpaths, `packages/contracts`, browser/UI libraries |
| `backend` | `packages/contracts`, Node/server facilities |
| `api/chat.ts` | backend handler package surface, Vercel request/response types |
| `packages/numerics` | its own internals and platform-neutral facilities |
| `packages/contracts` | platform-neutral wire types and pure public contract constants |

## Forbidden directions

- numerics to frontend, backend, root API, DOM, browser storage, Tutor,
  Glossary, CSS, or Vercel runtime;
- contracts to frontend/backend implementations, numerical implementations,
  DOM, provider runtime state, or secrets;
- backend to frontend or numerics;
- frontend to backend implementation; and
- API adapter to frontend.

Use workspace package imports across real boundaries. The isolated hosted
function graph is a narrow packaging exception: its runtime imports use explicit
relative emitted `.js` targets for the backend and public contracts so Node can
load the traced output without source-only workspace exports. Type-only imports
retain workspace aliases. The recursive function-package test verifies that
graph and excludes local personal session/policy/transport owners; this does not
allow any forbidden dependency direction above. Other cross-workspace imports
remain deliberate package subpaths. The numerics package deliberately avoids
an eager root barrel; consumers import only the required subpath so static
pages do not acquire ODE, Linear Systems, Convergence, or expression runtime
accidentally.

## Ownership rules

- Pure TypeScript is not automatically numerical-domain code. Editable drafts,
  Resume/meaningful-work state, current/stale presentation, and browser
  workflow remain frontend-owned.
- Serializable wire types and shared public limits, error codes and fixed
  destination presets belong in contracts. Frontend-only and numerics-only
  types stay with their owners; credentials and runtime configuration do not
  enter contracts or browser state.
- Provider prompts, secrets, environment access, deterministic server mocks,
  and request error handling remain backend-owned.
- Numerical algorithms emit their own structured evidence. UI and Tutor may
  present/explain evidence but do not reconstruct it or become authority.

## Enforcement

`npm run verify:boundaries` scans production TypeScript imports for forbidden
workspace directions and verifies that the Vercel adapter delegates through
the backend package surface. Workspace TypeScript configurations add runtime-
appropriate library enforcement; notably numerics and contracts compile
without DOM libraries.

The checker is intentionally small. It complements—not replaces—typechecks,
route-bundle ownership tests, Vite manifest inspection, and browser evidence.
