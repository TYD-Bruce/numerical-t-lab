# Use your own model with AI Tutor

This guide describes the local AI Tutor Connections v1 implementation. Both the
Initial Value Problems and Linear Systems Labs use it. See the
[handoff](HANDOFF.md) for acceptance and release status; local implementation does
not mean that a change is already on the public demo.

## Start T-Lab on Windows

Use native Windows with the repository's dependencies already installed. Run these
commands from the repository root in two PowerShell terminals.

Frontend:

```powershell
npm.cmd run dev
```

Local backend:

```powershell
$env:AI_TUTOR_MOCK = 'true'
$env:T_LAB_PERSONAL_TUTOR = 'true'
npm.cmd run dev:api
```

Open `http://127.0.0.1:5173/`. The frontend and backend must run on the same
computer. The backend listens on `127.0.0.1:3001`; the frontend proxies `/api`
to it. `AI_TUTOR_MOCK=true` keeps the separately selected default Tutor service
in deterministic demo mode. Personal connections always use their own explicitly
entered configuration and never borrow an environment key.

The non-secret settings can alternatively be placed in ignored `.env.local` using
[`.env.example`](../../.env.example) as a reference. Do not overwrite an existing
configuration. Personal API keys belong in the local Tutor form, not environment
files, `VITE_` variables, browser storage or source code.

For a production build served locally, use `npm.cmd run build` followed by
`npm.cmd run preview`, keep the local backend running, and open
`http://127.0.0.1:4173/`. Dev and preview use loopback and refuse an occupied port.
The backend accepts the exact HTTP `127.0.0.1` and `localhost` origins on ports
5173 and 4173 by default. A custom frontend port requires a matching
`T_LAB_LOCAL_ORIGINS` allowlist and backend restart. A custom `API_PORT` also
requires the matching proxy target in `frontend/vite.config.ts`.

LAN, remote frontends, WSL and container setups are outside this version's
supported boundary. The hosted demo has no personal key or endpoint entry.

## Connect an already running local model

Start your inference server and load the model using that server's own tools.
T-Lab does not launch servers or download, load, unload or replace models.

1. Open either Lab, then **AI Tutor → Connection settings → Enable personal
   connections**. A successful local handshake is required before key entry exists.
   Configuration is available before running an experiment.
2. Choose **Local OpenAI-compatible server**. Enter its loopback URL, such as
   `http://127.0.0.1:8080` or `http://127.0.0.1:8080/v1`. Exact `localhost` and
   `[::1]` with an explicit port are also accepted for the model server. LAN
   addresses, credentials in URLs, arbitrary paths, queries and redirects are rejected.
3. Enter a key only if that server requires one. Enter an exact model ID, or
   **Save locally** first and use **Discover models**. Saving clears the key input
   immediately and makes no inference request.
4. Select a catalog entry or enter an exact ID, then use **Select model locally**
   if the saved candidate's model has changed. An incomplete catalog is labeled;
   a listing alone does not prove readiness. Explicitly unloaded models are disabled.
5. Choose **Test connection**. This sends a fixed synthetic greeting without Lab
   context or conversation. After success, choose **Use this connection** and make
   the conversation choice. **Start fresh** receives default focus.
6. Run an eligible experiment and ask Tutor about its result. Replies arrive as
   complete responses; progress, cancellation and controlled errors appear in the
   existing Tutor frame.

Local requests use the Chat Completions protocol. T-Lab checks reported model
availability before inference and sends `autoload=false`. If model listing is
unsupported, an exact ID can still be tested; an authentication or malformed-list
failure is not treated as unsupported discovery. A separately administered server
may ignore lifecycle flags or forward traffic. T-Lab cannot attest what that
server does internally.

After dependencies and the model are installed, T-Lab's local workflow needs no
internet access: interface fonts, math fonts, editors and application assets are
served locally. Keep the default service in mock mode and select a local model
for offline inference. This is a locally served workflow; it still needs its local
servers running and does not install a service worker or an offline browser cache.

## Choose a cloud provider explicitly

Personal cloud connections also require local T-Lab. Choose the provider and,
for Kimi, an explicit region before entering its matching key. The form displays
the exact destination. Changing provider or region clears an unsaved key. No
failure automatically selects another region, provider or model.

| Action | Data destination |
|---|---|
| Enable / Save locally / Select model locally | Local T-Lab backend only |
| Discover models | Selected provider receives credentials and a metadata request |
| Test connection | Selected provider receives credentials and a synthetic prompt; this may incur charges |
| Tutor Send | Selected provider receives credentials, this Lab's authorized history and eligible experiment context |
| Start fresh / Transfer / Cancel | Explicit conversation decision; transfer authorizes history for a subsequent Send |

The provider matrix below describes the implemented protocols and evidence, not
current model availability or a claim that every model is compatible. All cloud
destinations are fixed HTTPS presets. Test the exact model you intend to use.

| Choice | API base and inference protocol | Verification | Live model status |
|---|---|---|---|
| Local compatible / llama.cpp | Entered loopback `/v1`; Chat Completions | Mock contracts and owned native loopback fixture | Real model untested |
| OpenAI | `https://api.openai.com/v1`; Responses | Mock contract verified | Untested |
| Anthropic | `https://api.anthropic.com/v1`; native Messages | Mock contract verified | Untested |
| Gemini | `https://generativelanguage.googleapis.com/v1beta`; native generateContent | Mock contract verified | Untested |
| DeepSeek | `https://api.deepseek.com`; Chat Completions | Mock contract verified | Untested |
| Kimi international | `https://api.moonshot.ai/v1`; standard Chat Completions | Mock contract verified | Untested |
| Kimi mainland China | `https://api.moonshot.cn/v1`; standard Chat Completions | Mock contract verified | Untested |

Kimi Code Plan endpoints are not supported. Tutor keeps final answers only and
does not retain hidden reasoning or execute tools. Known models requiring
reasoning history are unavailable; see the implemented
[compatibility boundary](../reviews/2026-09-25-ai-tutor-connections-chunk-2c.md#model-compatibility-boundary).
A successful greeting checks protocol compatibility, not mathematical accuracy,
full multi-turn compatibility or sufficient context capacity. No real provider key
or live model request was used in implementation acceptance.

## Conversations, grounding and recovery

The selected connection is shared within one browser tab. ODE and Linear keep
separate conversations. Switching connections offers **Start fresh**, **Transfer
this Lab's conversation**, or **Cancel**. Returning to another Lab with history
from a different connection requires its own review; it is never silently sent.
Separate tabs have separate connections and sessions.

- **ODE** explains the previous successful single-method Run. Draft edits and a
  failed Run retain that successful evidence and its conversation. Compare is
  Tutor-disabled. A new successful Run resets this Lab's conversation.
- **Linear Systems** requires a current successful solve matching the current
  inputs. Editing inputs cancels pending work and disables Send while retaining
  history. Restoring the matching inputs can make the retained result eligible
  again. A failed Solve preserves history; a successful Solve resets it.
- Closing Tutor and navigating between Labs preserve history. **New experiment**
  offers an explicit clear-conversation choice, checked by default.

Keys live only in the local backend session: 30 minutes idle, at most 8 hours
absolute lifetime. **Disconnect and forget** removes them while retaining the
transcript and disabling personal Send. Backend restart loses keys; page refresh
or tab closure loses the browser's Lab/Tutor session. Reconnect explicitly after
expiry or restart. The only persistent browser preference is Light/Dark theme.

| Situation | Recovery |
|---|---|
| No key field / local service unavailable | Check the local URL, backend process, personal opt-in and allowed origin, then Enable again |
| Model unloaded or busy | Resolve availability using your server/provider, then explicitly Test or retry |
| Wrong key, region or model | Correct the candidate, save/select and Test again; the existing active connection is retained after a failed replacement test |
| Incomplete or incompatible response | Choose a compatible final-answer model or retry explicitly; raw provider output is not displayed as an error |
| Conversation too large | Start a fresh conversation or shorten the next question; history and numerical evidence are not silently truncated |
| Session expired / backend restarted | Enable a new local session, configure and Test again, then review the history choice |

Personal chat has a 64 KiB HTTP-body limit and a 32 KiB full-prompt budget,
including instructions, history and context. Cancellation prevents a late reply
from changing the current conversation; it cannot guarantee that a remote provider
has stopped computing or billing. Tutor never automatically falls back to the
default service. **Use default Tutor** is a separate explicit choice.

Verification details and remaining release gates are in the
[5B acceptance review](../reviews/2026-09-26-ai-tutor-connections-chunk-5b.md).
