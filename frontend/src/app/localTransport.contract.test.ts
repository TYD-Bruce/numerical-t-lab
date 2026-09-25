import { createServer as createHttpServer, request, type IncomingHttpHeaders, type Server } from "node:http";
import { mkdtemp, rmdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createServer, preview, resolveConfig, type InlineConfig, type PreviewServer, type ViteDevServer } from "vite";
import { createLocalApiServer } from "../../../backend/src/localApiServer.js";

const configFile = resolve(process.cwd(), "frontend/vite.config.ts");

function listen(server: Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.removeListener("error", reject);
      const address = server.address();
      if (!address || typeof address === "string") return reject(new Error("Missing fixture listener"));
      resolve(address.port);
    });
  });
}

function close(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeAllConnections();
  });
}

function send(port: number, headers: Record<string, string | undefined>, path = "/api/chat", method = "POST") {
  return new Promise<{ status: number; text: string; headers: IncomingHttpHeaders }>((resolve, reject) => {
    const req = request({ hostname: "127.0.0.1", port, path, method, headers }, (res) => {
      let text = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { text += chunk; });
      res.on("end", () => resolve({ status: res.statusCode!, text, headers: res.headers }));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.end(method === "POST" ? "{}" : undefined);
  });
}

function upgradeHmr(port: number, origin?: string, token?: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = request({
      hostname: "127.0.0.1", port,
      path: token === undefined ? "/" : `/?token=${encodeURIComponent(token)}`,
      headers: {
        Connection: "Upgrade", Upgrade: "websocket", "Sec-WebSocket-Version": "13",
        "Sec-WebSocket-Key": Buffer.alloc(16, 1).toString("base64"),
        "Sec-WebSocket-Protocol": "vite-hmr",
        ...(origin === undefined ? {} : { Origin: origin }),
      },
    });
    req.setTimeout(2_000, () => req.destroy(new Error("HMR fixture upgrade timed out")));
    req.on("upgrade", (res, socket) => {
      req.setTimeout(0);
      socket.destroy();
      resolve(res.statusCode!);
    });
    req.on("response", (res) => {
      req.setTimeout(0);
      res.resume();
      resolve(res.statusCode!);
    });
    req.on("error", reject);
    req.end();
  });
}

describe("local Vite configuration", () => {
  it("pins dev/preview to loopback and disables port fallback and CORS", async () => {
    const config = await resolveConfig({ configFile, envFile: false }, "serve");
    for (const listener of [config.server, config.preview]) {
      expect(listener.host).toBe("127.0.0.1");
      expect(listener.strictPort).toBe(true);
      expect(listener.cors).toBe(false);
    }
    expect(config.server.proxy?.["/api"]).toMatchObject({
      target: "http://127.0.0.1:3001", changeOrigin: true,
    });
  });

  it.each<InlineConfig>([
    { server: { host: "0.0.0.0" } },
    { server: { host: true } },
    { server: { host: "192.168.1.4" } },
    { preview: { host: "::" } },
    { server: { strictPort: false } },
    { preview: { strictPort: false } },
    { server: { hmr: { port: 24678 } } },
    { server: { hmr: { host: "attacker.example" } } },
    { server: { middlewareMode: true } },
    { server: { cors: true } },
    { legacy: { skipWebSocketTokenCheck: true } },
    { server: { headers: { "Content-Security-Policy": "default-src *" } } },
    { preview: { headers: { "content-security-policy": "default-src *" } } },
  ])("fails closed on unsafe listener overrides %j", async (override) => {
    const validation = resolveConfig({ configFile, envFile: false, ...override }, "serve").then(() => undefined);
    await expect(validation).rejects.toThrow(/local/i);
  });

  it("does not move to another port when the chosen frontend port is occupied", async () => {
    const occupied = createHttpServer();
    const port = await listen(occupied);
    const frontend = await createServer({ configFile, envFile: false, logLevel: "silent", server: { port } });
    try {
      await expect(frontend.listen()).rejects.toThrow(/already in use/i);
    } finally {
      await frontend.close();
      await close(occupied);
    }
  });
});

describe.each(["dev", "preview"] as const)("%s loopback proxy", (mode) => {
  const handler = vi.fn(async () => ({ status: 200, body: { message: "fixture" } }));
  let api: Server;
  let frontend: ViteDevServer | PreviewServer;
  let port: number;
  let outputDirectory = "";
  let headers: Record<string, string>;

  beforeAll(async () => {
    // Reserve an ephemeral port, then let strict Vite startup claim it.
    const reservation = createHttpServer();
    port = await listen(reservation);
    await close(reservation);
    const origin = `http://127.0.0.1:${port}`;
    headers = { Origin: origin, "Sec-Fetch-Site": "same-origin", "Content-Type": "application/json" };
    api = createLocalApiServer({
      chatHandler: handler, frontendOrigins: [origin, `http://localhost:${port}`],
    });
    const apiPort = await listen(api);
    const proxy = { "/api": { target: `http://127.0.0.1:${apiPort}`, changeOrigin: true } };
    if (mode === "dev") {
      frontend = await createServer({ configFile, envFile: false, logLevel: "silent", server: { port, proxy } });
      await frontend.listen();
    } else {
      outputDirectory = await mkdtemp(join(tmpdir(), "t-lab-local-preview-"));
      await writeFile(join(outputDirectory, "index.html"), "<!doctype html><title>Fixture</title>");
      frontend = await preview({
        configFile, envFile: false, logLevel: "silent", build: { outDir: outputDirectory }, preview: { port, proxy },
      });
    }
    const address = frontend.httpServer!.address();
    expect(typeof address === "object" && address?.address).toBe("127.0.0.1");
  }, 20_000);

  beforeEach(() => handler.mockClear());
  afterAll(async () => {
    if (frontend) await frontend.close();
    if (api) await close(api);
    if (outputDirectory) {
      await unlink(join(outputDirectory, "index.html"));
      await rmdir(outputDirectory);
    }
  });

  it("serves the page and carries approved same-origin JSON through the real proxy", async () => {
    expect((await send(port, {}, "/", "GET")).status).toBe(200);
    const result = await send(port, headers);
    expect(result.status).toBe(200);
    expect(JSON.parse(result.text)).toEqual({ message: "fixture" });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({});
  });

  it.each(["127.0.0.1", "localhost"])("enforces resource destinations for %s", async (hostname) => {
    const response = await send(port, { Host: `${hostname}:${port}` }, "/", "GET");
    const policy = String(response.headers["content-security-policy"]);
    expect(policy).toContain("default-src 'none'");
    expect(policy).toContain("script-src 'self' 'sha256-");
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("base-uri 'none'");
    expect(policy).toContain("form-action 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain(mode === "dev"
      ? `connect-src 'self' ws://${hostname}:${port};`
      : "connect-src 'self';");
    if (mode === "preview") expect(policy).not.toContain("ws://");
  });

  it("blocks a foreign incoming Host before proxy Host rewriting", async () => {
    const result = await send(port, {
      ...headers, Host: `192.168.1.4:${port}`, "X-Forwarded-Host": `127.0.0.1:${port}`,
    });
    expect(result.status).toBe(403);
    expect(result.headers.connection).toBe("close");
    expect(handler).not.toHaveBeenCalled();
  });

  it.each(["cross-site", "same-site", "none"])("blocks %s metadata before inference", async (site) => {
    expect((await send(port, { ...headers, "Sec-Fetch-Site": site })).status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it("blocks a mismatched Origin, null Origin, simple form and missing metadata", async () => {
    for (const changed of [
      { Origin: `http://localhost:${port}` }, { Origin: "null" },
      { "Content-Type": "application/x-www-form-urlencoded" }, { "Sec-Fetch-Site": "" },
    ]) {
      const result = await send(port, { ...headers, ...changed });
      expect([403, 415]).toContain(result.status);
    }
    expect(handler).not.toHaveBeenCalled();
  });

  it("keeps personal routes absent", async () => {
    expect((await send(port, headers, "/api/personal/connections")).status).toBe(404);
    expect(handler).not.toHaveBeenCalled();
  });

  if (mode === "dev") {
    it("upgrades HMR on the same loopback HTTP listener", async () => {
      expect(await upgradeHmr(port)).toBe(101);
      expect(handler).not.toHaveBeenCalled();
    });

    it("accepts a browser HMR handshake with the current server token", async () => {
      expect(await upgradeHmr(port, `http://127.0.0.1:${port}`, frontend.config.webSocketToken)).toBe(101);
      expect(handler).not.toHaveBeenCalled();
    });

    it.each([
      { name: "external Origin without token", origin: "http://attacker.example" },
      { name: "external Origin with wrong token", origin: "http://attacker.example", token: "invalid-fixture" },
      { name: "opaque Origin without token", origin: "null" },
      { name: "same-origin without token", origin: "local" },
      { name: "same-origin with wrong token", origin: "local", token: "invalid-fixture" },
    ])("rejects browser HMR: $name", async ({ origin, token }) => {
      const browserOrigin = origin === "local" ? `http://127.0.0.1:${port}` : origin;
      expect(await upgradeHmr(port, browserOrigin, token)).toBe(400);
      expect(handler).not.toHaveBeenCalled();
    });
  }
});
