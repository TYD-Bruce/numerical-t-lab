import http, { type Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalApiServer } from "./localApiServer.js";
import { createLocalTutorSessions } from "./localTutorSession.js";

const headers = { Origin: "http://127.0.0.1:5173", "Sec-Fetch-Site": "same-origin", "X-T-Lab-Client": "tutor-v1", "Content-Type": "application/json" };
let api: Server, model: Server, apiPort: number, baseUrl: string;
let sessions: ReturnType<typeof createLocalTutorSessions>;
let proof: Record<string, string>, candidateId: string;
let mode: "ok" | "malformed" | "busy" | "hang" | "race" | "no-discovery";
let inferenceStarted: () => void, inferenceClosed: () => void;
let started: Promise<void>, closed: Promise<void>, loads: number;
const calls: Array<{ url: string; key?: string; body: string }> = [];
const chatHandler = vi.fn(async () => ({ status: 200, body: {} }));
async function listen(server: Server): Promise<number> {
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  return (server.address() as import("node:net").AddressInfo).port;
}
function request(operation: string, body: unknown = {}, extra: Record<string, string> = proof) {
  let req!: http.ClientRequest;
  const result = new Promise<{ status: number; body: Record<string, any>; text: string }>((resolve, reject) => {
    req = http.request({ hostname: "127.0.0.1", port: apiPort, path: `/api/personal/${operation}`, method: "POST", headers: { ...headers, ...extra } }, res => {
      let text = ""; res.setEncoding("utf8"); res.on("data", chunk => { text += chunk; });
      res.on("end", () => resolve({ status: res.statusCode!, body: JSON.parse(text), text })); res.on("error", reject);
    });
    req.on("error", reject); req.end(JSON.stringify(body));
  });
  return { result, abort: () => req.destroy() };
}
async function post(operation: string, body: unknown = {}) { return request(operation, body).result; }
function operation(generation = 0, id = candidateId, requestId = "test-request") { return { generation, candidateId: id, requestId }; }

beforeEach(async () => {
  mode = "ok"; calls.length = 0; loads = 0; chatHandler.mockClear();
  started = new Promise(resolve => { inferenceStarted = resolve; }); closed = new Promise(resolve => { inferenceClosed = resolve; });
  model = http.createServer((req, res) => {
    let body = ""; req.on("data", chunk => { body += chunk; }); req.on("end", () => {
      calls.push({ url: req.url!, key: req.headers.authorization, body });
      res.setHeader("Content-Type", "application/json");
      if (req.url === "/v1/models") {
        if (mode === "no-discovery") { res.writeHead(404); res.end('{"error":"private"}'); }
        else res.end(JSON.stringify({ data: [{ id: "fixture", path: "private path", status: { value: "loaded", args: ["private arg"] } }] }));
      } else {
        inferenceStarted();
        if (mode === "hang") { res.on("close", inferenceClosed); res.writeHead(200); res.write('{"pending":'); return; }
        if (mode === "race") {
          if (req.url !== "/v1/chat/completions?autoload=false") loads++;
          res.writeHead(400); res.end('{"error":"unloaded model private path"}'); return;
        }
        if (mode === "busy") { res.writeHead(429); res.end('{"error":"private quota detail"}'); return; }
        if (mode === "malformed") { res.end('{"secret":"fixture-key"}'); return; }
        res.end(JSON.stringify({ choices: [{ finish_reason: "stop", message: { role: "assistant", content: "Connected.", tool_calls: [] } }] }));
      }
    });
  });
  baseUrl = `http://127.0.0.1:${await listen(model)}`;
  sessions = createLocalTutorSessions(); api = createLocalApiServer({ personalTutor: sessions, chatHandler }); apiPort = await listen(api);
  const created = await request("session", {}, {}).result;
  proof = { "X-T-Lab-Session": created.body.session.sessionId, "X-T-Lab-Proof": created.body.proof };
  const staged = await post("stage", { generation: 0, connection: { provider: "local", baseUrl, model: "fixture", apiKey: "fixture-key" } });
  candidateId = staged.body.candidate.id;
});
afterEach(async () => {
  sessions.dispose();
  await Promise.all([api, model].map(server => new Promise<void>((resolve, reject) => { server.close(error => error ? reject(error) : resolve()); server.closeAllConnections(); })));
  vi.restoreAllMocks(); vi.unstubAllEnvs();
});

describe("personal provider operations over local HTTP", () => {
  it("stages without traffic; discovers without history; tests a fixed prompt; activates only after success", async () => {
    expect(calls).toEqual([]);
    const discovery = await post("discover", operation());
    expect(discovery.status).toBe(200); expect(discovery.body.models).toEqual([{ id: "fixture", availability: "loaded" }]);
    expect(discovery.text).not.toContain("private"); expect(calls[0]).toEqual({ url: "/v1/models", key: "Bearer fixture-key", body: "" });
    expect((await post("activate", { generation: 0, candidateId })).status).toBe(409);
    const tested = await post("test", operation());
    expect(tested.status).toBe(200); expect(tested.body.session.candidate.tested).toBe(true);
    expect(tested.text).not.toMatch(/fixture-key|Connected\./);
    const inference = calls.filter(call => call.body);
    expect(inference).toHaveLength(1); expect(inference[0].url).toBe("/v1/chat/completions?autoload=false");
    expect(JSON.parse(inference[0].body).messages.at(-1).content).toMatch(/short greeting/);
    expect((await post("activate", { generation: 0, candidateId })).body.active.model).toBe("fixture");
    expect(chatHandler).not.toHaveBeenCalled();
  });

  it.each(["test", "discover"])("requires proof and exact %s schema, rejecting context/history/URLs before networking", async op => {
    expect((await request(op, operation(), {}).result).status).toBe(403);
    for (const extra of [{ context: { secret: "run" } }, { messages: ["history"] }, { url: "http://foreign.invalid" }, { apiKey: "secret" }]) {
      expect((await post(op, { ...operation(), ...extra })).status).toBe(400);
    }
    expect((await post(op, { ...operation(), requestId: 123 })).status).toBe(400);
    expect(calls).toEqual([]);
  });

  it("failed candidate testing preserves the active connection and does not reveal raw errors", async () => {
    expect((await post("test", operation())).status).toBe(200);
    expect((await post("activate", { generation: 0, candidateId })).status).toBe(200);
    const staged = await post("stage", { generation: 1, connection: { provider: "local", baseUrl, model: "fixture" } });
    mode = "malformed";
    const failed = await post("test", operation(1, staged.body.candidate.id));
    expect(failed.status).toBe(502); expect(failed.body.code).toBe("response_invalid"); expect(failed.text).not.toContain("fixture-key");
    const state = await post("status"); expect(state.body.active.hasCredential).toBe(true); expect(state.body.candidate.tested).toBe(false);
    mode = "ok";
    expect((await post("test", operation(1, staged.body.candidate.id, "retry-by-user"))).status).toBe(200);
  });

  it("retains the autoload opt-out when a listed model unloads immediately before inference", async () => {
    mode = "race";
    const result = await post("test", operation());
    expect(result.status).toBe(502); expect(loads).toBe(0);
    expect(calls.map(call => call.url)).toEqual(["/v1/models", "/v1/chat/completions?autoload=false"]);
    expect(result.text).not.toContain("private"); expect((await post("status")).body.candidate.tested).toBe(false);
  });

  it("propagates an aborted HTTP caller upstream and releases its request slot", async () => {
    mode = "hang";
    const pending = request("test", operation()); const ignoredAbort = pending.result.catch(() => undefined);
    await started; pending.abort(); await ignoredAbort; await closed;
    expect((await post("status")).body.candidate.tested).toBe(false);
    mode = "ok"; expect((await post("test", operation(0, candidateId, "next"))).status).toBe(200);
  });

  it("candidate replacement aborts testing and cannot mark the new candidate tested", async () => {
    mode = "hang";
    const pending = post("test", operation()); await started;
    const replaced = await post("stage", { generation: 0, connection: { provider: "local", baseUrl, model: "fixture" } });
    expect((await pending).body.code).toBe("request_cancelled"); await closed;
    expect(replaced.body.candidate.id).not.toBe(candidateId); expect((await post("status")).body.candidate.tested).toBe(false);
  });

  it("makes one inference on rate limiting and supports an explicit model when discovery is unsupported", async () => {
    mode = "busy";
    expect((await post("test", operation())).body.code).toBe("provider_busy");
    expect(calls.filter(call => call.body)).toHaveLength(1);
    mode = "no-discovery";
    expect((await post("discover", operation())).body.code).toBe("discovery_unsupported");
    expect((await post("test", operation())).status).toBe(200);
  });
});
