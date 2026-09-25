# Architecture v1 Deployment Architecture

Status: **Local structure verified; no deployment performed by this migration**

## Browser application

`frontend/vite.config.ts` is the Vite authority. Its root is `frontend/`, its
public base is `/`, and its production output is the repository-root `dist/`.
The root `npm run build` command runs workspace typechecks and that frontend
build, preserving the existing Vercel output directory.

## Public API

`api/chat.ts` remains at repository root for Vercel function discovery and
continues to own `/api/chat` method handling. It imports the server
implementation through `../backend/src/ai/chatHandler.js`. Provider
secrets and environment access remain outside the frontend.

For local development, root `npm run dev:api` launches
`backend/src/dev.ts` without changing the process working directory. Existing
root `.env.local`/`.env` discovery and the Vite `/api` proxy contract are
therefore preserved.

Local transport now binds API, Vite dev and preview to `127.0.0.1`; HMR uses the
same frontend listener. The proxy targets literal loopback. Frontend Host/Origin
validation runs before proxy rewriting, while the API independently checks its
socket, Host, frontend-origin allowlist and browser Fetch Metadata. Wildcard
CORS is removed. Local chat accepts uncompressed JSON bodies up to 1 MiB.
Native CLI JSON compatibility applies only to the existing `/api/chat` route.
The hosted adapter remains independent of this local server owner.

Default frontend/preview ports are 5173/4173 with strict port selection; API
defaults to 3001. For a deliberately changed frontend port, configure exact
HTTP loopback origins via `T_LAB_LOCAL_ORIGINS` in the root API environment and
restart the API. Changing `API_PORT` also requires changing Vite's proxy target.
Explicit `T_LAB_PERSONAL_TUTOR=true` now enables local-only session routes with
per-tab proof, JSON schemas, 16 KiB bodies and expiring backend credentials.
Unset/false leaves those routes absent; invalid flag values fail startup.
Provider discovery/test/chat routes remain unavailable. The hosted adapter has
no path to this session owner. No local production server, CSP or offline asset
support has been added yet.

## SPA fallback and assets

`vercel.json` remains the deployment configuration. Vercel filesystem and
function precedence are relied upon so:

- `/api/chat` resolves to the function adapter;
- `/assets/*` and emitted fonts resolve as static files; and
- other paths fall back to `/index.html` for the History API router.

Generated asset references remain root-based and safe on nested route refresh.
Production-exclusion and route-bundle tests protect development-only Glossary
code and lazy feature boundaries.

## Evidence boundary

Architecture v1 performs local tests, typechecks, builds, manifest inspection,
and bounded browser checks only. It does not push, create a Preview, change
Vercel resources, modify the private deployment repository, or supersede the
last accepted Production provenance.
