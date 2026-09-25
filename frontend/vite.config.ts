import { defineConfig, type Plugin } from "vite";
import { fileURLToPath } from "node:url";
import type { IncomingMessage, ServerResponse } from "node:http";

const frontendRoot = fileURLToPath(new URL(".", import.meta.url));

function localRequestBoundary(req: IncomingMessage, res: ServerResponse, next: () => void): void {
  const port = req.socket.localPort;
  const host = req.headers.host;
  const trustedHost = host === `127.0.0.1:${port}` || host === `localhost:${port}`;
  const localSocket = req.socket.localAddress === "127.0.0.1" && req.socket.remoteAddress === "127.0.0.1";
  const origin = req.headers.origin;
  const site = req.headers["sec-fetch-site"];
  const isApi = req.url?.startsWith("/api");
  const nativeChat = req.url === "/api/chat" && req.method === "POST" &&
    origin === undefined && site === undefined;
  if (!localSocket || !trustedHost ||
    (isApi && !nativeChat && (origin !== `http://${host}` || site !== "same-origin"))) {
    res.writeHead(403, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      Connection: "close",
    });
    res.end("Local request origin is not allowed.");
    return;
  }
  next();
}

const localBoundary: Plugin = {
  name: "t-lab-local-boundary",
  apply: "serve",
  configResolved(config) {
    for (const listener of [config.server, config.preview]) {
      if (listener.host !== "127.0.0.1" || !listener.strictPort || listener.cors !== false || listener.https) {
        throw new Error("T-Lab local servers require HTTP 127.0.0.1, strict ports and disabled CORS.");
      }
    }
    // A separate/custom HMR listener or middleware server could bypass the binding.
    if (config.server.middlewareMode || typeof config.server.hmr === "object") {
      throw new Error("T-Lab local HMR must use the frontend listener without overrides.");
    }
    if (config.legacy?.skipWebSocketTokenCheck) {
      throw new Error("T-Lab local HMR requires WebSocket token checks.");
    }
  },
  configureServer(server) {
    server.middlewares.use(localRequestBoundary);
  },
  configurePreviewServer(server) {
    server.middlewares.use(localRequestBoundary);
  },
};

export default defineConfig({
  root: frontendRoot,
  base: "/",
  plugins: [localBoundary],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    cors: false,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
    cors: false,
  },
});
