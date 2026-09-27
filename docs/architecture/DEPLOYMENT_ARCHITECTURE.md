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
The handler dispatches both ODE and Linear profiles. Its shared prompt,
validation and final-text dependencies use relative emitted `.js` imports;
the recursive isolated packaging test reaches validation and Linear demo
without workspace resolution. Caller cancellation reaches the new Linear
bounded default request. No personal session or native transport is in this graph.

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
Discovery and synthetic testing for local/OpenAI/Anthropic/Gemini/DeepSeek/Kimi are available
through exact `/api/personal/discover` and `/api/personal/test` POST routes.
They require the existing local origin, proof and candidate generation checks.
Native provider catalogs use a bounded first page with an explicit `hasMore`
marker; pagination does not change the selected destination or trigger more calls.
Kimi uses explicit international/mainland presets without automatic regional
fallback. Known preserved-thinking model IDs fail before inference because this
version retains only final text; supporting a provider does not attest every model.
Personal chat is wired for ODE and Linear through exact `/api/personal/chat`,
with bounded profile/context/history validation, a 64 KiB request body, explicit
per-Lab history consent and the same origin/proof/generation boundary. The lazy
settings UI and connection runtime use these local routes. The hosted adapter
has no path to the session owner. A separate local production launcher/server
has not been added; native Windows dev/preview are the verified local surfaces.

Dev/preview HTTP responses carry an enforced CSP, including `frame-ancestors
'none'`. Build output has a meta CSP before scripts with the supported resource
directives; header-only embedding restrictions are not misrepresented as meta
protection on a hosted static deployment. The approved inline theme bootstrap
is hashed with HTML newline normalization. Only dev permits its exact HMR
WebSocket, with no wildcard, unsafe script, or eval allowance. The styles-only
inline exception supports current Vite/MathLive and layout rendering.

Interface fonts and licenses are local build assets. MathLive's existing CSS
owns its deferred bundled fonts; implicit font/sound requests are disabled.
Cold browser checks used a deny-all external proxy, with local synthetic Tutor
replies. Both Lab interfaces and personal workflows have local desktop/mobile
evidence. This establishes asset/CSP and mock integration behavior, not live
provider readiness or final release acceptance.

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
