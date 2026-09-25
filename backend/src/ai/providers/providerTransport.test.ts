import http, { type Server } from "node:http";
import https from "node:https";
import dns from "node:dns/promises";
import { EventEmitter } from "node:events";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createLocalTutorSessions } from "../../localTutorSession.js";
import { requestProvider, PROVIDER_TRANSPORT_LIMITS } from "./providerTransport.js";

const servers: Server[] = [];
const stores: ReturnType<typeof createLocalTutorSessions>[] = [];
async function fixture(handler: http.RequestListener) {
  const server = http.createServer(handler);
  servers.push(server);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing fixture address");
  return `http://127.0.0.1:${address.port}/v1`;
}
function lease(input: unknown, kind: "test" | "discover" = "test") {
  const store = createLocalTutorSessions(); stores.push(store);
  const created = store.create("http://127.0.0.1:5173");
  const auth = { origin: "http://127.0.0.1:5173", sessionId: created.session.sessionId, proof: created.proof };
  const state = store.stage(auth, 0, input);
  return store.begin(auth, { kind, generation: 0, candidateId: state.candidate!.id, requestId: "transport-fixture" });
}
afterEach(async () => {
  stores.splice(0).forEach(store => store.dispose());
  vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllEnvs();
  await Promise.all(servers.splice(0).map(server => new Promise<void>((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve()); server.closeAllConnections();
  })));
});

describe("bounded personal provider transport", () => {
  it("discovers before selection, then tests/activates a returned Windows model ID unchanged", async () => {
    const model = "D:\\Models\\Local model.gguf";
    const paths: string[] = [];
    let sentModel: unknown;
    const baseUrl = await fixture((req, res) => {
      paths.push(req.url!);
      let body = ""; req.on("data", chunk => { body += chunk; });
      req.on("end", () => {
        res.writeHead(200, { "Content-Type": "application/json" });
        if (req.method === "GET") res.end(JSON.stringify({ data: [{ id: model }] }));
        else { sentModel = JSON.parse(body).model; res.end('{"answer":"fixture"}'); }
      });
    });
    const store = createLocalTutorSessions(); stores.push(store);
    const created = store.create("http://127.0.0.1:5173");
    const auth = { origin: "http://127.0.0.1:5173", sessionId: created.session.sessionId, proof: created.proof };
    const pending = store.stage(auth, 0, { provider: "local", baseUrl });
    const listing = store.begin(auth, { kind: "discover", generation: 0, candidateId: pending.candidate!.id, requestId: "list" });
    const models = await requestProvider(listing, "discover") as { data: Array<{ id: string }> };
    listing.finish();
    const chosen = store.stage(auth, 0, { provider: "local", baseUrl, model: models.data[0].id });
    const testing = store.begin(auth, { kind: "test", generation: 0, candidateId: chosen.candidate!.id, requestId: "test" });
    await expect(requestProvider(testing, "complete", { model: testing.connection.model })).resolves.toEqual({ answer: "fixture" });
    testing.markTested(); testing.finish();
    expect(store.activate(auth, 0, chosen.candidate!.id).active?.model).toBe(model);
    expect(sentModel).toBe(model);
    expect(paths).toEqual(["/v1/models", "/v1/chat/completions?autoload=false"]);
  });

  it("uses the literal local destination, header credentials and exactly one inference", async () => {
    const seen: Array<{ url?: string; method?: string; key?: string }> = [];
    const baseUrl = await fixture((req, res) => {
      seen.push({ url: req.url, method: req.method, key: req.headers.authorization });
      res.writeHead(200, { "Content-Type": "application/json" }); res.end('{"fixture":true}');
    });
    const lookup = vi.spyOn(dns, "lookup");
    vi.stubEnv("OPENAI_API_KEY", "ambient-key");
    vi.stubEnv("HTTP_PROXY", "http://attacker.invalid:1234");
    const owned = lease({ provider: "local", baseUrl: baseUrl.replace("127.0.0.1", "localhost"), model: "fixture", apiKey: "explicit-fixture-key" });
    await expect(requestProvider(owned, "complete", { messages: [] })).resolves.toEqual({ fixture: true });
    expect(seen).toEqual([{ url: "/v1/chat/completions?autoload=false", method: "POST", key: "Bearer explicit-fixture-key" }]);
    expect(lookup).not.toHaveBeenCalled();
  });

  it("discovery has no request body or ambient key and cannot invoke arbitrary management paths", async () => {
    const seen: unknown[] = [];
    const baseUrl = await fixture((req, res) => {
      let body = "";
      req.on("data", chunk => { body += chunk; });
      req.on("end", () => { seen.push({ url: req.url, key: req.headers.authorization, body }); res.writeHead(200, { "Content-Type": "application/json" }); res.end("{}"); });
    });
    vi.stubEnv("OPENAI_API_KEY", "ambient-key");
    const owned = lease({ provider: "local", baseUrl, model: "fixture" }, "discover");
    await expect(requestProvider(owned, "discover", { messages: ["secret history"] })).rejects.toThrow();
    await expect(requestProvider(owned, "complete", {})).rejects.toThrow();
    await expect(requestProvider(owned, "discover")).resolves.toEqual({});
    expect(seen).toEqual([{ url: "/v1/models", key: undefined, body: "" }]);
  });

  it.each([301, 302, 303, 307, 308])("rejects redirect %s without contacting the next destination", async (status) => {
    let redirected = 0, calls = 0;
    const sink = await fixture((_req, res) => { redirected++; res.end("{}"); });
    const baseUrl = await fixture((_req, res) => { calls++; res.writeHead(status, { Location: `${sink}/chat/completions` }); res.end("credential-shaped-error"); });
    const owned = lease({ provider: "local", baseUrl, model: "fixture", apiKey: "fixture-key" });
    await expect(requestProvider(owned, "complete", {})).rejects.toMatchObject({ code: "redirect_rejected" });
    expect(calls).toBe(1); expect(redirected).toBe(0);
  });

  it.each([[401, "provider_auth"], [403, "provider_auth"], [429, "provider_busy"], [500, "provider_unavailable"], [503, "provider_unavailable"]])("does not retry or reflect a provider %s", async (status, code) => {
    let calls = 0;
    const baseUrl = await fixture((_req, res) => { calls++; res.writeHead(status as number); res.end("fixture-key /private/path"); });
    const owned = lease({ provider: "local", baseUrl, model: "fixture" });
    await expect(requestProvider(owned, "complete", {})).rejects.toMatchObject({ code });
    expect(calls).toBe(1);
  });

  it.each(["127.0.0.1", "10.0.0.1", "::ffff:127.0.0.1", "169.254.169.254"])("rejects cloud DNS to %s before credential dispatch", async (address) => {
    vi.spyOn(dns, "lookup").mockResolvedValue([{ address, family: address.includes(":") ? 6 : 4 }] as never);
    const connect = vi.spyOn(https, "request");
    const owned = lease({ provider: "openai", model: "fixture", apiKey: "fixture-key" });
    await expect(requestProvider(owned, "complete", {})).rejects.toMatchObject({ code: "invalid_endpoint" });
    expect(connect).not.toHaveBeenCalled();
  });

  it("pins the validated DNS address while preserving TLS hostname and header-only Gemini authentication", async () => {
    const lookup = vi.spyOn(dns, "lookup").mockResolvedValue([{ address: "8.8.8.8", family: 4 }] as never);
    const connect = vi.spyOn(https, "request").mockImplementation(((options: https.RequestOptions, callback: (res: http.IncomingMessage) => void) => {
      expect(options.hostname).toBe("8.8.8.8");
      expect(options.servername).toBe("generativelanguage.googleapis.com");
      expect(options.rejectUnauthorized).toBe(true);
      expect(options.agent).toBe(false);
      expect(options.headers).toMatchObject({ Host: "generativelanguage.googleapis.com", "x-goog-api-key": "fixture-key" });
      expect(options.path).toBe("/v1beta/models/fixture:generateContent");
      const req = new EventEmitter() as http.ClientRequest;
      req.destroy = vi.fn(() => req);
      req.end = vi.fn(() => {
        const res = new EventEmitter() as http.IncomingMessage;
        res.statusCode = 200; res.headers = { "content-type": "application/json" }; res.destroy = vi.fn(() => res);
        callback(res);
        res.emit("data", Buffer.from("{}")); res.emit("end");
        return req;
      }) as typeof req.end;
      return req;
    }) as typeof https.request);
    const owned = lease({ provider: "gemini", model: "fixture", apiKey: "fixture-key" });
    await expect(requestProvider(owned, "complete", {})).resolves.toEqual({});
    expect(lookup).toHaveBeenCalledTimes(1); expect(connect).toHaveBeenCalledTimes(1);
  });

  it("cancels a pending DNS lookup without a later network request", async () => {
    let resolveLookup!: (value: never) => void;
    vi.spyOn(dns, "lookup").mockReturnValue(new Promise(resolve => { resolveLookup = resolve; }) as never);
    const connect = vi.spyOn(https, "request");
    const owned = lease({ provider: "openai", model: "fixture", apiKey: "fixture-key" });
    const result = requestProvider(owned, "complete", {});
    stores[0].dispose();
    await expect(result).rejects.toMatchObject({ code: "request_cancelled" });
    resolveLookup([{ address: "8.8.8.8", family: 4 }] as never);
    await Promise.resolve();
    expect(connect).not.toHaveBeenCalled();
  });

  it.each([[], [{ address: "8.8.8.8", family: 4 }, { address: "127.0.0.1", family: 4 }]].map(addresses => ({ addresses })))("rejects empty or mixed public/private DNS results $addresses", async ({ addresses }) => {
    vi.spyOn(dns, "lookup").mockResolvedValue(addresses as never);
    const connect = vi.spyOn(https, "request");
    const owned = lease({ provider: "openai", model: "fixture", apiKey: "fixture-key" });
    await expect(requestProvider(owned, "complete", {})).rejects.toMatchObject({ code: "invalid_endpoint" });
    expect(connect).not.toHaveBeenCalled();
  });

  it("disconnect closes an actual in-flight response and rejects late content", async () => {
    let acknowledge!: () => void, closed!: () => void;
    const received = new Promise<void>(resolve => { acknowledge = resolve; });
    const disconnected = new Promise<void>(resolve => { closed = resolve; });
    const baseUrl = await fixture((_req, res) => {
      res.on("close", closed);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.write('{"incomplete":'); acknowledge();
    });
    const owned = lease({ provider: "local", baseUrl, model: "fixture" });
    const result = requestProvider(owned, "complete", {});
    const assertion = expect(result).rejects.toMatchObject({ code: "request_cancelled" });
    await received;
    stores[0].dispose();
    await assertion; await disconnected;
    expect(() => owned.markTested()).toThrow();
  });

  it("blocks a completed lease and oversized input before DNS or networking", async () => {
    const lookup = vi.spyOn(dns, "lookup");
    const connect = vi.spyOn(https, "request");
    const owned = lease({ provider: "openai", model: "fixture", apiKey: "fixture-key" });
    await expect(requestProvider(owned, "complete", { input: "x".repeat(PROVIDER_TRANSPORT_LIMITS.requestBytes) })).rejects.toMatchObject({ code: "invalid_configuration" });
    owned.finish();
    await expect(requestProvider(owned, "complete", {})).rejects.toMatchObject({ code: "request_cancelled" });
    expect(lookup).not.toHaveBeenCalled(); expect(connect).not.toHaveBeenCalled();
  });

  it("bounds the whole attempt, including DNS, with no retry", async () => {
    vi.useFakeTimers();
    const lookup = vi.spyOn(dns, "lookup").mockReturnValue(new Promise(() => {}) as never);
    const connect = vi.spyOn(https, "request");
    const owned = lease({ provider: "openai", model: "fixture", apiKey: "fixture-key" });
    const result = requestProvider(owned, "complete", {});
    const assertion = expect(result).rejects.toMatchObject({ code: "timeout" });
    await vi.advanceTimersByTimeAsync(PROVIDER_TRANSPORT_LIMITS.completeMs);
    await assertion;
    expect(lookup).toHaveBeenCalledTimes(1); expect(connect).not.toHaveBeenCalled();
  });

  it.each(["malformed", "encoded", "oversized"])("rejects %s responses without raw body errors", async (kind) => {
    const baseUrl = await fixture((_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json", ...(kind === "encoded" ? { "Content-Encoding": "gzip" } : {}) });
      res.end(kind === "oversized" ? " ".repeat(PROVIDER_TRANSPORT_LIMITS.responseBytes + 1) : "secret-broken-json");
    });
    const owned = lease({ provider: "local", baseUrl, model: "fixture" });
    try { await requestProvider(owned, "complete", {}); throw new Error("Expected rejection"); }
    catch (error) { expect(String(error)).not.toContain("secret-broken-json"); expect(error).toHaveProperty("code", kind === "oversized" ? "response_too_large" : "response_invalid"); }
  });
});
