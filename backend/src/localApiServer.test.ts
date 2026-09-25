import { request, type IncomingHttpHeaders } from "node:http";
import { once } from "node:events";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createLocalApiServer,
  LOCAL_API_HOST,
  LOCAL_API_MAX_BODY_BYTES,
} from "./localApiServer.js";

const origin = "http://127.0.0.1:5173";
const browserHeaders = { Origin: origin, "Sec-Fetch-Site": "same-origin" };
const chatHandler = vi.fn(async (_body: unknown) => ({
  status: 200,
  body: { message: "fixture answer" },
}));
const server = createLocalApiServer({ chatHandler });
let port = 0;

function send(
  headers: Record<string, string | undefined> = {},
  body: string | string[] = "{}",
  path = "/api/chat",
  method = "POST",
): Promise<{ status: number; headers: IncomingHttpHeaders; text: string }> {
  return new Promise((resolve, reject) => {
    const req = request({
      hostname: LOCAL_API_HOST, port, path, method,
      headers: { "Content-Type": "application/json", ...headers },
    }, (res) => {
      let text = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { text += chunk; });
      res.on("end", () => resolve({ status: res.statusCode!, headers: res.headers, text }));
      res.on("error", reject);
    });
    req.on("error", reject);
    for (const chunk of typeof body === "string" ? [body] : body) req.write(chunk);
    req.end();
  });
}

describe("local API HTTP boundary", () => {
  beforeAll(async () => {
    await new Promise<void>((resolve) => server.listen(0, LOCAL_API_HOST, resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing test listener");
    expect(address.address).toBe("127.0.0.1");
    port = address.port;
  });
  beforeEach(() => chatHandler.mockClear());
  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
      server.closeAllConnections();
    });
  });

  it("delegates approved browser JSON once, without CORS or caching", async () => {
    const body = { messages: [{ role: "user", content: "fixture" }], context: {} };
    const result = await send(browserHeaders, JSON.stringify(body));
    expect(result.status).toBe(200);
    expect(JSON.parse(result.text)).toEqual({ message: "fixture answer" });
    expect(chatHandler).toHaveBeenCalledTimes(1);
    expect(chatHandler).toHaveBeenCalledWith(body);
    expect(result.headers["access-control-allow-origin"]).toBeUndefined();
    expect(result.headers["cache-control"]).toBe("no-store");
  });

  it("preserves origin-free native CLI JSON on the legacy chat route", async () => {
    expect((await send()).status).toBe(200);
    expect(chatHandler).toHaveBeenCalledTimes(1);
  });

  it("accepts the deliberate localhost Host alias", async () => {
    expect((await send({ ...browserHeaders, Host: `localhost:${port}` })).status).toBe(200);
  });

  it.each([
    { Origin: "https://attacker.example", "Sec-Fetch-Site": "cross-site" },
    { Origin: "null", "Sec-Fetch-Site": "same-origin" },
    { Origin: "http://192.168.1.4:5173", "Sec-Fetch-Site": "same-origin" },
    { Origin: "http://127.0.0.1:5174", "Sec-Fetch-Site": "same-origin" },
    { Origin: origin, "Sec-Fetch-Site": "same-site" },
    { Origin: origin, "Sec-Fetch-Site": "cross-site" },
    { Origin: origin, "Sec-Fetch-Site": "none" },
    { Origin: origin },
    { "Sec-Fetch-Site": "same-origin" },
  ])("rejects untrusted or incomplete browser metadata: %j", async (headers) => {
    expect((await send(headers)).status).toBe(403);
    expect(chatHandler).not.toHaveBeenCalled();
  });

  it.each(["attacker.example", "127.1", "2130706433", "localhost.", "[::1]", "192.168.1.4"])(
    "rejects an unapproved Host spelling %s even with forged forwarded headers", async (host) => {
      const result = await send({
        ...browserHeaders, Host: `${host}:${port}`,
        "X-Forwarded-Host": `127.0.0.1:${port}`, "X-Forwarded-For": "127.0.0.1",
      });
      expect(result.status).toBe(403);
      expect(chatHandler).not.toHaveBeenCalled();
    },
  );

  it("rejects the wrong Host port", async () => {
    expect((await send({ ...browserHeaders, Host: "127.0.0.1:1" })).status).toBe(403);
    expect(chatHandler).not.toHaveBeenCalled();
  });

  it.each(["text/plain", "application/x-www-form-urlencoded", "multipart/form-data", ""])(
    "rejects non-JSON content type %s before delegation", async (contentType) => {
      expect((await send({ ...browserHeaders, "Content-Type": contentType })).status).toBe(415);
      expect(chatHandler).not.toHaveBeenCalled();
    },
  );

  it("accepts the JSON UTF-8 parameter and rejects encoded bodies", async () => {
    expect((await send({ "Content-Type": "application/json; charset=utf-8" })).status).toBe(200);
    chatHandler.mockClear();
    expect((await send({ "Content-Encoding": "gzip" })).status).toBe(415);
    expect(chatHandler).not.toHaveBeenCalled();
  });

  it("does not reflect malformed input or unexpected exceptions", async () => {
    const malformed = await send(browserHeaders, "fixture-secret-invalid-json");
    expect(malformed.status).toBe(400);
    expect(malformed.text).not.toContain("fixture-secret");
    expect(chatHandler).not.toHaveBeenCalled();
    chatHandler.mockRejectedValueOnce(new Error("fixture-secret-handler-error"));
    const failed = await send(browserHeaders);
    expect(failed.status).toBe(500);
    expect(failed.text).not.toContain("fixture-secret");
  });

  it("enforces the exact byte boundary on streamed UTF-8 bodies", async () => {
    const overhead = Buffer.byteLength('{"x":""}');
    const padding = "x".repeat(LOCAL_API_MAX_BODY_BYTES - overhead);
    expect((await send(browserHeaders, JSON.stringify({ x: padding }))).status).toBe(200);
    chatHandler.mockClear();
    const oversized = ['{"x":"', padding, "é", '"}'];
    expect((await send(browserHeaders, oversized)).status).toBe(413);
    expect(chatHandler).not.toHaveBeenCalled();
    expect((await send(browserHeaders)).status).toBe(200);
  });

  it("rejects oversized declared bodies without calling the handler", async () => {
    expect((await send({ "Content-Length": String(LOCAL_API_MAX_BODY_BYTES + 1) })).status).toBe(413);
    expect(chatHandler).not.toHaveBeenCalled();
  });

  it("does not delegate an aborted upload and still accepts the next request", async () => {
    const incoming = once(server, "request");
    const req = request({
      hostname: LOCAL_API_HOST, port, path: "/api/chat", method: "POST",
      headers: { ...browserHeaders, "Content-Type": "application/json" },
    });
    req.on("error", () => { /* Expected socket hang-up from intentional cancellation. */ });
    req.write('{"unfinished":"');
    const [received] = await incoming;
    const aborted = once(received, "aborted");
    req.destroy();
    await aborted;
    expect(chatHandler).not.toHaveBeenCalled();
    expect((await send(browserHeaders)).status).toBe(200);
  });

  it("has no preflight permission or personal configuration route", async () => {
    const preflight = await send(browserHeaders, "", "/api/chat", "OPTIONS");
    expect(preflight.status).toBe(405);
    expect(preflight.headers["access-control-allow-origin"]).toBeUndefined();
    expect((await send(browserHeaders, "{}", "/api/personal/connections")).status).toBe(404);
    expect((await send(browserHeaders, "", "/api/chat", "GET")).status).toBe(405);
    expect(chatHandler).not.toHaveBeenCalled();
  });

  it.each([
    [], ["*"], ["http://localhost"], ["http://127.1:5173"],
    ["http://localhost:5173/"], ["https://localhost:5173"],
    ["http://user@localhost:5173"], ["http://localhost.attacker.example:5173"],
    ["http://0.0.0.0:5173"], ["http://192.168.1.4:5173"],
    ["http://localhost:65536"], ["http://localhost:05173"],
  ].map((frontendOrigins) => ({ frontendOrigins })))("refuses unsafe origin configuration %j", ({ frontendOrigins }) => {
    expect(() => createLocalApiServer({ frontendOrigins })).toThrow(/origin/i);
  });
});
