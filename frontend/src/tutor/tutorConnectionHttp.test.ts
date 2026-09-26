import http, { type Server } from "node:http";
import { afterEach, expect, it, vi } from "vitest";
import { createLocalApiServer } from "../../../backend/src/localApiServer";
import { createLocalTutorSessions } from "../../../backend/src/localTutorSession";
import { createAppSessionStore } from "../app/appSessionStore";
import type { LabTutorBinding } from "../app/contracts";
import { appendTutorMessage } from "./moduleTutorSession";
import { createTutorConnection } from "./tutorConnection";

const servers: Server[] = [];
const sessions = createLocalTutorSessions();
const clients: ReturnType<typeof createTutorConnection>[] = [];
const origin = "http://127.0.0.1:5173";
const binding: LabTutorBinding = {
  moduleId: "ode", promptProfile: "ode", description: "Fixture", suggestedQuestions: [],
  getContext: () => ({ status: "ready", revision: 1, context: {
    problem: { kind: "first_order", equationDisplay: "y' = y", t0: 0, tEnd: 1, h: 1, y0: 1 },
    method: { displayName: "Forward Euler", family: "forward_euler", order: 1, isImplicit: false },
    result: { finalT: 1, finalY: 2, pointCount: 2, seriesPreview: [{ t: 0, y: 1 }, { t: 1, y: 2 }] },
  } }),
};
async function listen(server: Server) {
  servers.push(server);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  return (server.address() as import("node:net").AddressInfo).port;
}
// This test bridge supplies browser-owned Origin/Fetch Metadata to native HTTP.
// It can reach only the fixture listener; it is not production browser code.
function loopbackFetch(port: number): typeof fetch {
  return async (input, options = {}) => new Promise<Response>((resolve, reject) => {
    if (!String(input).startsWith("/api/personal/")) { reject(new Error("Unexpected test path")); return; }
    const headers = Object.fromEntries(new Headers(options.headers));
    const request = http.request({ host: "127.0.0.1", port, path: String(input), method: "POST", signal: options.signal ?? undefined,
      headers: { ...headers, Origin: origin, "Sec-Fetch-Site": "same-origin" },
    }, response => {
      const chunks: Buffer[] = [];
      response.on("data", chunk => chunks.push(chunk)); response.on("error", reject);
      response.on("end", () => resolve(new Response(Buffer.concat(chunks), { status: response.statusCode, headers: { "Content-Type": "application/json" } })));
    });
    request.on("error", reject); request.end(String(options.body));
  });
}
afterEach(async () => {
  vi.restoreAllMocks();
  for (const client of clients) client.dispose(); sessions.dispose();
  for (const server of servers) { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});

it("runs bootstrap, discovery, verification, consent, chat and cancellation through real loopback HTTP without a key", async () => {
  const paths: string[] = [], inputs: unknown[] = [];
  let holdCompletion = false, busy = false, sawWaiting!: () => void, sawAbort!: () => void;
  const waiting = new Promise<void>(resolve => { sawWaiting = resolve; });
  const aborted = new Promise<void>(resolve => { sawAbort = resolve; });
  const modelPort = await listen(http.createServer((request, response) => {
    paths.push(request.url!); expect(request.headers.authorization).toBeUndefined();
    let raw = ""; request.setEncoding("utf8"); request.on("data", chunk => { raw += chunk; });
    request.on("end", () => {
      if (request.method === "POST") inputs.push(JSON.parse(raw));
      if (holdCompletion && request.method === "POST") { response.once("close", sawAbort); sawWaiting(); return; }
      response.setHeader("Content-Type", "application/json");
      if (busy && request.method === "POST") { response.writeHead(429); response.end('{"error":"synthetic busy"}'); return; }
      response.end(JSON.stringify(request.method === "GET" ? { data: [{ id: "fixture", status: { value: "loaded" } }] }
        : { choices: [{ finish_reason: "stop", message: { role: "assistant", content: '{"message":"Synthetic loopback explanation."}' } }] }));
    });
  }));
  const legacy = vi.fn(async () => ({ status: 200, body: { legacy: true } }));
  const apiPort = await listen(createLocalApiServer({ personalTutor: sessions, chatHandler: legacy }));
  const bridge = loopbackFetch(apiPort);
  let auth!: { origin: string; sessionId: string; proof: string };
  const client = createTutorConnection({ fetch: (input, options) => {
    const headers = new Headers(options?.headers);
    if (headers.has("x-t-lab-session")) auth = { origin, sessionId: headers.get("x-t-lab-session")!, proof: headers.get("x-t-lab-proof")! };
    return bridge(input, options);
  }, origin: () => origin }); clients.push(client);
  const store = createAppSessionStore(), ode = store.createTutorSessionAccess("ode"), other = store.createTutorSessionAccess("linear_algebra");
  other.updateSession(session => appendTutorMessage(session, "user", "Other Lab private history"));
  await client.initialize();
  expect(client.getState().session?.idleTimeoutMs).toBe(1_800_000);
  await client.stage({ provider: "local", baseUrl: `http://127.0.0.1:${modelPort}`, model: "fixture" });
  expect(await client.discover()).toMatchObject({ models: [{ id: "fixture", availability: "loaded" }] });
  await client.test(); await client.decideHistory(ode, client.reviewHistory(ode, "candidate"));
  ode.updateSession(session => appendTutorMessage(session, "user", "Explain the latest ODE result."));
  expect(await client.send(binding, ode, new AbortController().signal)).toEqual({ message: "Synthetic loopback explanation." });
  expect(client.canSendHistory(other)).toBe(false);
  expect(JSON.stringify(inputs)).not.toContain("Other Lab private history");
  const initial = client.getState().session!;
  const clock = vi.spyOn(Date, "now").mockReturnValue(initial.idleExpiresAt - 1000);
  busy = true;
  await expect(client.send(binding, ode, new AbortController().signal)).rejects.toMatchObject({ code: "provider_busy" });
  clock.mockReturnValue(initial.idleExpiresAt + 1);
  expect(() => sessions.authorize(auth)).not.toThrow(); // read-only: never status()/refresh()
  expect(client.getState().status).toBe("available");
  expect(client.getState().session!.idleExpiresAt).toBeGreaterThan(initial.idleExpiresAt);
  expect(client.getState().session!.absoluteExpiresAt).toBe(initial.absoluteExpiresAt);
  busy = false;
  holdCompletion = true;
  const controller = new AbortController();
  const reply = client.send(binding, ode, controller.signal).catch(error => error);
  await waiting; controller.abort();
  expect(await reply).toMatchObject({ code: "request_cancelled" });
  await aborted;
  expect(ode.getSession().items).toHaveLength(1);
  expect(paths.every(path => path === "/v1/models" || path === "/v1/chat/completions?autoload=false")).toBe(true);
  expect(paths.filter(path => path.includes("completions"))).toHaveLength(4);
  expect(legacy).not.toHaveBeenCalled();
  await client.disconnect();
  expect(client.getState().session?.active).toBeUndefined();
});
