import { request, type Server } from "node:http";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalApiServer } from "./localApiServer.js";
import { createLocalTutorSessions, LOCAL_TUTOR_LIMITS } from "./localTutorSession.js";

const origin = "http://127.0.0.1:5173";
const headers = { Origin: origin, "Sec-Fetch-Site": "same-origin", "X-T-Lab-Client": "tutor-v1" };
let sessions: ReturnType<typeof createLocalTutorSessions>;
let server: Server;
let port = 0;
const chatHandler = vi.fn(async () => ({ status: 200, body: {} }));
function send(path: string, body: unknown = {}, extra: Record<string, string | undefined> = {}, method = "POST") {
  return new Promise<{ status: number; text: string; headers: import("node:http").IncomingHttpHeaders }>((resolve, reject) => {
    const sentHeaders = Object.fromEntries(Object.entries({ ...headers, "Content-Type": "application/json", ...extra }).filter(([, value]) => value !== undefined));
    const req = request({ hostname: "127.0.0.1", port, path, method, headers: sentHeaders }, res => {
      let text = ""; res.setEncoding("utf8"); res.on("data", chunk => { text += chunk; });
      res.on("end", () => resolve({ status: res.statusCode!, text, headers: res.headers })); res.on("error", reject);
    });
    req.on("error", reject); req.end(JSON.stringify(body));
  });
}
async function newTab() {
  const result = await send("/api/personal/session");
  expect(result.status).toBe(201);
  const data = JSON.parse(result.text);
  return { data, proofHeaders: { "X-T-Lab-Session": data.session.sessionId, "X-T-Lab-Proof": data.proof } };
}

beforeAll(async () => {
  sessions = createLocalTutorSessions();
  server = createLocalApiServer({ chatHandler, personalTutor: sessions });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing fixture address");
  port = address.port;
});
beforeEach(() => chatHandler.mockClear());
afterAll(async () => { await new Promise<void>((resolve, reject) => { server.close(error => error ? reject(error) : resolve()); server.closeAllConnections(); }); });

describe("explicitly enabled local personal session routes", () => {
  it("stages a model-less candidate and then preserves a selected Windows model ID", async () => {
    const tab = await newTab();
    const connection = { provider: "local", baseUrl: "http://localhost:8080" };
    const unselected = await send("/api/personal/stage", { generation: 0, connection }, tab.proofHeaders);
    expect(unselected.status).toBe(200);
    expect(JSON.parse(unselected.text).candidate.connection.model).toBeUndefined();
    const model = "D:\\Models\\Local model.gguf";
    const selected = await send("/api/personal/stage", { generation: 0, connection: { ...connection, model } }, tab.proofHeaders);
    expect(selected.status).toBe(200);
    expect(JSON.parse(selected.text).candidate.connection.model).toBe(model);
  });

  it("bootstraps a private no-store capability and returns no cookie", async () => {
    const result = await send("/api/personal/session");
    expect(result.status).toBe(201);
    expect(JSON.parse(result.text).capabilities).toEqual({ protocol: 1, providerOperations: true, providers: ["local", "openai", "anthropic", "gemini"] });
    expect(result.headers["cache-control"]).toBe("no-store");
    expect(result.headers["access-control-allow-origin"]).toBeUndefined();
    expect(result.headers["set-cookie"]).toBeUndefined();
    expect(chatHandler).not.toHaveBeenCalled();
  });

  it.each([
    { "X-T-Lab-Client": undefined }, { "X-T-Lab-Client": "other" }, { Origin: undefined },
    { Origin: "null" }, { "Sec-Fetch-Site": undefined }, { "Sec-Fetch-Site": "same-site" },
    { "Sec-Fetch-Site": "cross-site" }, { "X-T-Lab-Client": "tutor-v1, tutor-v1" },
    { Origin: undefined, "Sec-Fetch-Site": undefined },
  ])("rejects incomplete or hostile bootstrap headers %j", async changed => {
    expect((await send("/api/personal/session", {}, changed)).status).toBe(403);
  });

  it("requires JSON and exact scopes; never accepts a provider key at bootstrap", async () => {
    expect((await send("/api/personal/session", {}, { "Content-Type": "text/plain" })).status).toBe(415);
    const leaked = await send("/api/personal/session", { apiKey: "fixture-secret" });
    expect(leaked.status).toBe(400); expect(leaked.text).not.toContain("fixture-secret");
    expect((await send("/api/personal/session", {}, {}, "GET")).status).toBe(405);
    expect((await send("/api/personal/session?apiKey=fixture-secret")).status).toBe(404);
  });

  it("requires origin-bound proof, does not expose other tabs, and returns only connection metadata", async () => {
    const a = await newTab(), b = await newTab();
    const connection = { provider: "openai", model: "fixture-model", apiKey: "fixture-secret" };
    const staged = await send("/api/personal/stage", { generation: 0, connection }, a.proofHeaders);
    expect(staged.status).toBe(200); expect(staged.text).not.toContain(connection.apiKey); expect(staged.text).not.toContain(a.data.proof);
    for (const changed of [
      {}, { ...a.proofHeaders, "X-T-Lab-Proof": b.data.proof },
      { ...a.proofHeaders, Origin: "http://localhost:5173" },
      { ...a.proofHeaders, "X-T-Lab-Session": b.data.session.sessionId },
    ]) {
      expect((await send("/api/personal/status", {}, changed)).status).toBe(403);
    }
    const ownB = JSON.parse((await send("/api/personal/status", {}, b.proofHeaders)).text);
    expect(ownB.candidate).toBeUndefined();
    const state = JSON.parse(staged.text);
    expect((await send("/api/personal/activate", { generation: 0, candidateId: state.candidate.id }, a.proofHeaders)).status).toBe(409);
    expect((await send("/api/personal/activate", { generation: 0, candidateId: state.candidate.id, tested: true }, a.proofHeaders)).status).toBe(400);
    expect((await send("/api/personal/discard", { generation: 0, candidateId: state.candidate.id }, a.proofHeaders)).status).toBe(200);
  });

  it("disconnects with generation checks, closes sessions, and rejects late proof", async () => {
    const tab = await newTab();
    const disconnected = await send("/api/personal/disconnect", { generation: 0 }, tab.proofHeaders);
    expect(disconnected.status).toBe(200); expect(JSON.parse(disconnected.text).generation).toBe(1);
    expect((await send("/api/personal/disconnect", { generation: 0 }, tab.proofHeaders)).status).toBe(409);
    expect((await send("/api/personal/close", {}, tab.proofHeaders)).status).toBe(200);
    expect((await send("/api/personal/status", {}, tab.proofHeaders)).status).toBe(401);
  });

  it("does not expose arbitrary forwarding, ungrounded chat or model management", async () => {
    const tab = await newTab();
    for (const path of ["chat", "models/load", "proxy", "connections"]) {
      expect((await send(`/api/personal/${path}`, {}, tab.proofHeaders)).status).toBe(404);
    }
    expect(chatHandler).not.toHaveBeenCalled();
  });

  it("bounds personal request bytes independently of legacy chat", async () => {
    const tab = await newTab();
    const result = await send("/api/personal/stage", { padding: "x".repeat(LOCAL_TUTOR_LIMITS.bodyBytes) }, tab.proofHeaders);
    expect(result.status).toBe(413); expect(result.headers.connection).toBe("close");
    expect((await send("/api/personal/status", {}, tab.proofHeaders)).status).toBe(200);
  });

  it("authorizes before reading the body and cancels only an exact owned operation", async () => {
    const tab = await newTab();
    expect((await send("/api/personal/stage", { padding: "x".repeat(LOCAL_TUTOR_LIMITS.bodyBytes) })).status).toBe(403);
    const auth = { origin, sessionId: tab.data.session.sessionId, proof: tab.data.proof };
    const staged = sessions.stage(auth, 0, { provider: "local", model: "fixture", baseUrl: "http://localhost:8080" });
    const lease = sessions.begin(auth, { generation: 0, kind: "test", candidateId: staged.candidate!.id, requestId: "owned" });
    expect(JSON.parse((await send("/api/personal/cancel", { requestId: "other" }, tab.proofHeaders)).text)).toEqual({ cancelled: false });
    expect(lease.signal.aborted).toBe(false);
    expect(JSON.parse((await send("/api/personal/cancel", { requestId: "owned" }, tab.proofHeaders)).text)).toEqual({ cancelled: true });
    expect(lease.signal.aborted).toBe(true);
    lease.finish();
  });
});
