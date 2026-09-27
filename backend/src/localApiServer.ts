import http from "node:http";
import { handleChatRequest, type ChatHandlerBody } from "./ai/chatHandler.js";
import { TutorConnectionError } from "./localTutorPolicy.js";
import { LOCAL_TUTOR_LIMITS, type LocalTutorAuth, type LocalTutorSessions } from "./localTutorSession.js";
import { authorizePersonalRequest, handlePersonalRequest, personalOperation } from "./localTutorRoutes.js";

export const LOCAL_API_HOST = "127.0.0.1";
export const LOCAL_API_MAX_BODY_BYTES = 1024 * 1024;

const DEFAULT_FRONTEND_ORIGINS = [
  "http://127.0.0.1:5173", "http://localhost:5173",
  "http://127.0.0.1:4173", "http://localhost:4173",
];

function approvedOrigins(origins: readonly string[]): ReadonlySet<string> {
  if (origins.length === 0) throw new Error("At least one local frontend origin is required.");
  for (const origin of origins) {
    // Validate before URL parsing can normalize unusual host/port spellings.
    if (!/^http:\/\/(?:127\.0\.0\.1|localhost):[1-9]\d{0,4}$/.test(origin)) {
      throw new Error("Local frontend origins must use an explicit HTTP loopback port.");
    }
    try {
      if (new URL(origin).origin !== origin) throw new Error();
    } catch {
      throw new Error("Invalid local frontend origin.");
    }
  }
  return new Set(origins);
}

function isLocalRequest(req: http.IncomingMessage, origins: ReadonlySet<string>): boolean {
  const { localAddress, remoteAddress, localPort } = req.socket;
  if (localAddress !== LOCAL_API_HOST || remoteAddress !== LOCAL_API_HOST) return false;
  const host = req.headers.host;
  if (host !== `${LOCAL_API_HOST}:${localPort}` && host !== `localhost:${localPort}`) return false;
  const origin = req.headers.origin;
  const site = req.headers["sec-fetch-site"];
  // Native CLI compatibility is confined to the existing non-personal route.
  if (origin === undefined && site === undefined) {
    return req.url === "/api/chat" && req.method === "POST";
  }
  return origin !== undefined && origins.has(origin) && site === "same-origin";
}

function readBody(req: http.IncomingMessage, maxBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let bytes = 0;
    let tooLarge = false;
    req.on("data", (chunk: Buffer) => {
      if (tooLarge) return;
      bytes += chunk.length;
      if (bytes > maxBytes) {
        tooLarge = true;
        chunks.length = 0;
        reject(new RangeError("Local request body limit exceeded."));
      } else {
        chunks.push(chunk);
      }
    });
    req.once("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.once("error", reject);
    req.once("aborted", () => reject(new Error("Request aborted.")));
  });
}

/** Local transport only. Importing this module never starts a listener. */
export function createLocalApiServer(options: {
  frontendOrigins?: readonly string[];
  chatHandler?: typeof handleChatRequest;
  /** Explicit local-process opt-in. Never supplied by the hosted adapter. */
  personalTutor?: LocalTutorSessions;
} = {}): http.Server {
  const origins = approvedOrigins(options.frontendOrigins ?? DEFAULT_FRONTEND_ORIGINS);
  const chatHandler = options.chatHandler ?? handleChatRequest;
  const server = http.createServer({ requestTimeout: 30_000, headersTimeout: 10_000 }, async (req, res) => {
    let auth: LocalTutorAuth | undefined;
    let operation: ReturnType<typeof personalOperation>;
    const reply = (status: number, body: Record<string, unknown>): void => {
      if (res.destroyed) return;
      // Snapshot-only operations already return their deadlines. Leased work and
      // cancellation also acknowledge activity on controlled failures. This read
      // neither renews activity nor returns a credential/proof or model metadata.
      let activity;
      if (auth && operation && ["chat", "test", "discover", "cancel"].includes(operation)) {
        try { activity = options.personalTutor?.activity(auth); } catch { /* expired/invalid auth has no activity acknowledgement */ }
      }
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        // Finish rejected uploads without retaining an unread keep-alive body.
        ...(status >= 400 ? { Connection: "close" } : {}),
      });
      res.end(JSON.stringify(activity ? { ...body, activity } : body));
    };
    if (!isLocalRequest(req, origins)) {
      reply(403, { error: "Local request origin is not allowed." });
      return;
    }
    operation = options.personalTutor && personalOperation(req.url);
    if (req.url !== "/api/chat" && !operation) {
      reply(404, { error: "Not found" });
      return;
    }
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      reply(405, { error: "Method not allowed" });
      return;
    }
    if (operation && options.personalTutor) {
      try { auth = authorizePersonalRequest(req, operation, options.personalTutor); }
      catch (error) {
        if (error instanceof TutorConnectionError) reply(error.status, { error: error.message, code: error.code });
        else reply(403, { error: "Local session proof is not valid." });
        return;
      }
    }
    if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.headers["content-type"] ?? "") ||
      (req.headers["content-encoding"] !== undefined && req.headers["content-encoding"] !== "identity")) {
      reply(415, { error: "An uncompressed JSON request is required." });
      return;
    }
    const maxBytes = operation === "chat" ? LOCAL_TUTOR_LIMITS.chatBodyBytes
      : operation ? LOCAL_TUTOR_LIMITS.bodyBytes : LOCAL_API_MAX_BODY_BYTES;
    if (Number(req.headers["content-length"]) > maxBytes) {
      reply(413, { error: "Request body is too large." });
      return;
    }
    let body: unknown;
    try {
      const raw = await readBody(req, maxBytes);
      body = JSON.parse(raw);
    } catch (error) {
      const tooLarge = error instanceof RangeError;
      reply(tooLarge ? 413 : 400, {
        error: tooLarge ? "Request body is too large." : "Invalid JSON request.",
      });
      return;
    }
    if (req.aborted || res.destroyed) return;
    const caller = new AbortController();
    const abort = () => caller.abort();
    const close = () => { if (!res.writableEnded) abort(); };
    req.once("aborted", abort);
    res.once("close", close);
    try {
      const result = operation && auth && options.personalTutor
        ? await handlePersonalRequest(operation, auth, body, options.personalTutor, caller.signal)
        : await chatHandler(body as ChatHandlerBody, caller.signal);
      reply(result.status, result.body);
    } catch (error) {
      if (operation && error instanceof TutorConnectionError) reply(error.status, { error: error.message, code: error.code });
      else reply(500, { error: "Local Tutor request failed." });
    } finally {
      req.off("aborted", abort);
      res.off("close", close);
    }
  });
  server.once("close", () => options.personalTutor?.dispose());
  return server;
}
