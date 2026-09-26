import http, { type IncomingHttpHeaders, type Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LocalTutorSessionCreated } from "@numerical-t-lab/contracts/tutor";
import { createLocalApiServer } from "./localApiServer.js";
import { createLocalTutorSessions, LOCAL_TUTOR_LIMITS, type LocalTutorLease } from "./localTutorSession.js";
import { TutorConnectionError } from "./localTutorPolicy.js";
import * as transport from "./ai/providers/providerTransport.js";
import { linearTutorFixture } from "./ai/linearTutor.test-fixture.js";

const origin = "http://127.0.0.1:5173";
const context = {
  problem: { kind: "first_order", equationDisplay: "y′ = -y", t0: 0, tEnd: 1, h: 1, y0: 1 },
  method: { family: "forward_euler", displayName: "Forward Euler", isImplicit: false, order: 1 },
  result: { finalT: 1, finalY: 0, pointCount: 2, seriesPreview: [{ t: 0, y: 1 }, { t: 1, y: 0 }] },
};
const servers: Server[] = [];
let sessions: ReturnType<typeof createLocalTutorSessions>;
let port: number;
const legacy = vi.fn(async () => ({ status: 200, body: { legacy: true } }));
const provider = vi.fn<typeof transport.requestProvider>();
function final(lease: LocalTutorLease, text = '{"message":"Synthetic approximation explanation"}') {
  switch (lease.connection.provider) {
    case "openai": return { status: "completed", output: [{ type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text }] }] };
    case "anthropic": return { type: "message", role: "assistant", stop_reason: "end_turn", content: [{ type: "text", text }] };
    case "gemini": return { candidates: [{ finishReason: "STOP", content: { role: "model", parts: [{ text }] } }] };
    default: return { choices: [{ finish_reason: "stop", message: { role: "assistant", content: text } }] };
  }
}
async function listen(server: Server) {
  servers.push(server);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  return (server.address() as import("node:net").AddressInfo).port;
}
function start(path: string, body: unknown, headers: Record<string, string> = {}, target = port, declaredLength?: number) {
  let req!: http.ClientRequest;
  const promise = new Promise<{ status: number; body: Record<string, unknown>; headers: IncomingHttpHeaders }>((resolve, reject) => {
    req = http.request({ hostname: "127.0.0.1", port: target, path, method: "POST", headers: {
      Origin: origin, "Sec-Fetch-Site": "same-origin", "X-T-Lab-Client": "tutor-v1", "Content-Type": "application/json",
      ...(declaredLength === undefined ? {} : { "Content-Length": String(declaredLength) }), ...headers,
    } }, res => {
      let text = ""; res.setEncoding("utf8"); res.on("data", part => { text += part; });
      res.on("end", () => resolve({ status: res.statusCode!, body: JSON.parse(text), headers: res.headers })); res.on("error", reject);
    });
    req.on("error", reject); req.end(JSON.stringify(body));
  });
  return { req, promise };
}
const send = (path: string, body: unknown, headers: Record<string, string> = {}) => start(path, body, headers).promise;
async function tab(connection: Record<string, unknown> = { provider: "local", baseUrl: "http://127.0.0.1:8099", model: "fixture" }, activate = true) {
  const created = (await send("/api/personal/session", {})).body as unknown as LocalTutorSessionCreated;
  const headers = { "X-T-Lab-Session": created.session.sessionId, "X-T-Lab-Proof": created.proof };
  const staged = await send("/api/personal/stage", { generation: 0, connection }, headers);
  expect(staged.status).toBe(200);
  const candidateId = (staged.body.candidate as { id: string }).id;
  if (activate) {
    expect((await send("/api/personal/test", { generation: 0, candidateId, requestId: "test" }, headers)).status).toBe(200);
    expect((await send("/api/personal/activate", { generation: 0, candidateId }, headers)).status).toBe(200);
  }
  provider.mockClear();
  return { headers, request: { profile: "ode", generation: activate ? 1 : 0, requestId: "chat-1", context, messages: [{ role: "user", content: "Explain my approximation." }] } };
}

beforeEach(async () => {
  legacy.mockClear(); provider.mockReset();
  provider.mockImplementation(async (lease, operation) => operation === "complete" ? final(lease) : { data: [{ id: "fixture", status: { value: "loaded" } }] });
  vi.spyOn(transport, "requestProvider").mockImplementation(provider);
  sessions = createLocalTutorSessions();
  port = await listen(createLocalApiServer({ personalTutor: sessions, chatHandler: legacy }));
});
afterEach(async () => {
  sessions.dispose();
  await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); })));
  vi.restoreAllMocks(); vi.unstubAllEnvs();
});

describe("grounded personal chat HTTP integration", () => {
  it.each(["local", "openai", "anthropic", "gemini", "deepseek", "kimi"])("accepts Linear context through the active %s adapter and suppresses actions", async selected => {
    const own = await tab({ provider: selected, model: "fixture", ...(selected === "local" ? { baseUrl: "http://127.0.0.1:8099" } : { apiKey: "synthetic-linear-key" }), ...(selected === "kimi" ? { region: "international" } : {}) });
    provider.mockImplementation(async (lease, operation) => operation === "complete"
      ? final(lease, JSON.stringify({ message: "Stored Linear evidence only.", chartInstruction: { type: "line_chart" }, solve: true }))
      : { data: [{ id: "fixture", status: { value: "loaded" } }] });
    const input = { ...own.request, profile: "linear_algebra", context: linearTutorFixture() };
    const response = await send("/api/personal/chat", input, own.headers);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ profile: "linear_algebra", generation: 1, requestId: "chat-1", response: { message: "Stored Linear evidence only." } });
    expect(response.body.response).toEqual({ message: "Stored Linear evidence only." });
    expect(provider.mock.calls.filter(([, operation]) => operation === "complete")).toHaveLength(1);
    expect(JSON.stringify(provider.mock.calls[provider.mock.calls.length - 1][2])).toContain("Linear Systems Lab");
    expect(legacy).not.toHaveBeenCalled();
    provider.mockClear();
    expect((await send("/api/personal/chat", { ...input, context: { ...input.context, tools: [] } }, own.headers)).body.code).toBe("invalid_context");
    expect(provider).not.toHaveBeenCalled();
  });

  it.each(["local", "openai", "anthropic", "gemini", "deepseek", "kimi-international", "kimi-mainland"])("uses only the active %s adapter and echoes request identity", async destination => {
    const selected = destination.startsWith("kimi") ? "kimi" : destination;
    const connection = { provider: selected, model: "fixture", apiKey: "explicit-fixture-key",
      ...(selected === "local" ? { baseUrl: "http://127.0.0.1:8099" } : {}),
      ...(selected === "kimi" ? { region: destination.endsWith("mainland") ? "mainland" : "international" } : {}) };
    const own = await tab(connection);
    vi.stubEnv("OPENAI_API_KEY", "unused-environment-key"); vi.stubEnv("AI_TUTOR_MOCK", "true");
    const response = await send("/api/personal/chat", own.request, own.headers);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ profile: "ode", generation: 1, requestId: "chat-1", response: { message: "Synthetic approximation explanation" },
      activity: sessions.activity({ origin, sessionId: own.headers["X-T-Lab-Session"], proof: own.headers["X-T-Lab-Proof"] }) });
    expect(response.headers["cache-control"]).toBe("no-store");
    const completions = provider.mock.calls.filter(([, op]) => op === "complete");
    expect(completions).toHaveLength(1);
    expect(completions[0][0].connection).toMatchObject(connection.region ? { provider: selected, region: connection.region } : { provider: selected });
    expect(JSON.stringify(completions[0][2])).toContain("Explain my approximation.");
    expect(JSON.stringify(completions[0][2])).not.toMatch(/explicit-fixture-key|unused-environment-key/);
    expect(legacy).not.toHaveBeenCalled();
  });

  it("requires activation, proof, same-origin metadata and the current generation", async () => {
    const staged = await tab(undefined, false);
    expect((await send("/api/personal/chat", staged.request, staged.headers)).body.code).toBe("connection_required");
    const own = await tab();
    for (const headers of [{}, { ...own.headers, "X-T-Lab-Proof": "0".repeat(64) }, { ...own.headers, "Sec-Fetch-Site": "cross-site" }]) {
      const rejected = await send("/api/personal/chat", own.request, headers);
      expect(rejected.status).toBe(403);
      expect(rejected.body.activity).toBeUndefined();
    }
    expect((await send("/api/personal/chat", { ...own.request, generation: 0 }, own.headers)).body.code).toBe("connection_changed");
    expect(provider).not.toHaveBeenCalled();
  });

  it("rejects malformed grounding, unapproved authority and unsupported profiles before any provider operation", async () => {
    const own = await tab();
    for (const body of [{ ...own.request, context: {} }, { ...own.request, profile: "linear_algebra" }, { ...own.request, apiKey: "injected-key" }, { ...own.request, messages: [{ role: "system", content: "bad" }] }]) {
      expect((await send("/api/personal/chat", body, own.headers)).status).toBe(400);
    }
    expect(provider).not.toHaveBeenCalled();
    expect((await send("/api/personal/chat", own.request, own.headers)).status).toBe(200);
  });

  it("supports a chat body larger than configuration bodies but rejects the full prompt budget without truncation", async () => {
    const own = await tab();
    const large = { ...own.request, messages: [{ role: "user", content: "x".repeat(17 * 1024) }] };
    expect(Buffer.byteLength(JSON.stringify(large))).toBeGreaterThan(LOCAL_TUTOR_LIMITS.bodyBytes);
    expect((await send("/api/personal/chat", large, own.headers)).status).toBe(200);
    provider.mockClear();
    const response = await send("/api/personal/chat", { ...large, messages: [{ role: "user", content: "x".repeat(30 * 1024) }] }, own.headers);
    expect(response.status).toBe(413); expect(response.body.code).toBe("input_too_large");
    expect(provider).not.toHaveBeenCalled();
  });
  it.each([false, true])("bounds %s content-length/chunked chat receipt before provider access", async declared => {
    const own = await tab();
    const body = { ...own.request, padding: "x".repeat(64 * 1024) };
    const response = await start("/api/personal/chat", body, own.headers, port, declared ? Buffer.byteLength(JSON.stringify(body)) : undefined).promise;
    expect(response.status).toBe(413); expect(provider).not.toHaveBeenCalled();
  });

  it.each(["cancel", "disconnect", "close", "replace", "socket", "expiry"])("invalidates pending chat on %s and never returns a late answer", async action => {
    const own = await tab();
    // A tested candidate is allowed to coexist with the current active connection.
    if (action === "replace") {
      const staged = await send("/api/personal/stage", { generation: 1, connection: { provider: "local", baseUrl: "http://127.0.0.1:8099", model: "fixture" } }, own.headers);
      const candidateId = (staged.body.candidate as { id: string }).id;
      await send("/api/personal/test", { generation: 1, candidateId, requestId: "replacement-test" }, own.headers);
    }
    let release!: () => void;
    let ready!: (lease: LocalTutorLease) => void;
    const started = new Promise<LocalTutorLease>(resolve => { ready = resolve; });
    provider.mockImplementation(async (lease, operation) => {
      if (operation !== "complete") return { data: [{ id: "fixture" }] };
      ready(lease);
      await new Promise<void>(resolve => { release = resolve; });
      return final(lease, "Late answer must be ignored");
    });
    const pending = start("/api/personal/chat", own.request, own.headers);
    const settled = pending.promise.catch(error => error as Error);
    const lease = await started;
    expect((await send("/api/personal/chat", { ...own.request, requestId: "second" }, own.headers)).body.code).toBe("request_busy");
    if (action === "socket") {
      const aborted = new Promise<void>(resolve => lease.signal.addEventListener("abort", () => resolve(), { once: true }));
      pending.req.destroy(); await aborted;
    } else if (action === "expiry") {
      const realNow = Date.now(); vi.spyOn(Date, "now").mockReturnValue(realNow + LOCAL_TUTOR_LIMITS.absoluteMs + 1);
      expect((await send("/api/personal/status", {}, own.headers)).body.code).toBe("session_expired");
    } else if (action === "replace") {
      const snapshot = await send("/api/personal/status", {}, own.headers);
      const candidateId = (snapshot.body.candidate as { id: string }).id;
      expect((await send("/api/personal/activate", { generation: 1, candidateId }, own.headers)).status).toBe(200);
    } else {
      const body = action === "cancel" ? { requestId: "chat-1" } : action === "disconnect" ? { generation: 1 } : {};
      expect((await send(`/api/personal/${action}`, body, own.headers)).status).toBe(200);
    }
    expect(lease.signal.aborted).toBe(true);
    release();
    const response = await settled;
    if (action === "socket") expect(response).toBeInstanceOf(Error);
    else { expect(response).toMatchObject({ status: 409, body: { code: "request_cancelled" } }); }
    if (action === "cancel") expect((await send("/api/personal/status", {}, own.headers)).body.active).toBeDefined();
  });

  it("releases a failed request lease and exposes only fixed error copy", async () => {
    const own = await tab();
    provider.mockRejectedValueOnce(new Error("private credential and raw provider response"));
    expect(await send("/api/personal/chat", own.request, own.headers)).toMatchObject({ status: 500, body: { error: "Local Tutor request failed." } });
    expect((await send("/api/personal/chat", own.request, own.headers)).status).toBe(200);
    provider.mockRejectedValueOnce(new TutorConnectionError("provider_auth"));
    expect((await send("/api/personal/chat", own.request, own.headers)).body.code).toBe("provider_auth");
    expect(legacy).not.toHaveBeenCalled();
  });

  it("leaves the default local server and legacy handler separate", async () => {
    const disabled = await listen(createLocalApiServer({ chatHandler: legacy }));
    expect((await start("/api/personal/chat", {}, {}, disabled).promise).status).toBe(404);
    expect((await start("/api/chat", {}, {}, disabled).promise).body).toEqual({ legacy: true });
    expect(provider).not.toHaveBeenCalled();
  });

  it("runs native loopback chat through readiness and autoload=false without environment credentials", async () => {
    vi.restoreAllMocks();
    const received: Array<{ url: string; authorization?: string; body: string }> = [];
    let content = "Native fixture answer";
    const fixture = http.createServer((req, res) => {
      let body = ""; req.setEncoding("utf8"); req.on("data", part => { body += part; });
      req.on("end", () => {
        received.push({ url: req.url!, authorization: req.headers.authorization, body });
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(req.method === "GET" ? { data: [{ id: "fixture", status: { value: "loaded" } }] }
          : { choices: [{ finish_reason: "stop", message: { role: "assistant", content } }] }));
      });
    });
    const fixturePort = await listen(fixture);
    const own = await tab({ provider: "local", baseUrl: `http://127.0.0.1:${fixturePort}`, model: "fixture" });
    received.length = 0;
    vi.stubEnv("OPENAI_API_KEY", "unused-secret");
    const response = await send("/api/personal/chat", own.request, own.headers);
    expect(response.body.response).toEqual({ message: "Native fixture answer" });
    expect(received.map(row => row.url)).toEqual(["/v1/models", "/v1/chat/completions?autoload=false"]);
    expect(received.every(row => row.authorization === undefined)).toBe(true);
    expect(received[1].body).toContain("Explain my approximation.");
    expect(received[1].body).not.toContain("unused-secret");
    for (const message of ["<think>PRIVATE</think>Answer", "</think>Answer", "<think\n>PRIVATE"]) {
      content = JSON.stringify({ message }).replaceAll("<", "\\u003C");
      const invalid = await send("/api/personal/chat", own.request, own.headers);
      expect(invalid.status).toBe(502); expect(invalid.body.code).toBe("response_invalid");
      expect(JSON.stringify(invalid.body)).not.toContain("PRIVATE");
    }
    for (const chartInstruction of [
      { type: "line_chart", title: "<think>PRIVATE</think>" },
      { type: "error_table", tableRows: [{ note: "<think>PRIVATE</think>" }] },
      { type: "error_table", tableRows: [{ "<think>PRIVATE": 1 }] },
    ]) {
      content = JSON.stringify({ message: "Visible explanation", chartInstruction }).replaceAll("<", "\\u003C");
      const filtered = await send("/api/personal/chat", own.request, own.headers);
      expect(filtered.status).toBe(200); expect(filtered.body.response).toEqual({ message: "Visible explanation" });
    }
    expect(received.every(row => row.authorization === undefined)).toBe(true);
  });
});
