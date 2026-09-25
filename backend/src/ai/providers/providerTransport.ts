import http from "node:http";
import https from "node:https";
import dns from "node:dns/promises";
import { isIP } from "node:net";
import type { LocalTutorLease } from "../../localTutorSession.js";
import { isPublicAddress, providerRequestTarget, TutorConnectionError, type ProviderOperation } from "../../localTutorPolicy.js";

export const PROVIDER_TRANSPORT_LIMITS = Object.freeze({
  discoverMs: 15_000, completeMs: 90_000, requestBytes: 1024 * 1024, responseBytes: 2 * 1024 * 1024,
});

/** Exactly one native HTTP attempt. Never follows redirects or ambient proxies. */
export async function requestProvider(lease: LocalTutorLease, operation: ProviderOperation, body?: unknown): Promise<unknown> {
  lease.assertCurrent();
  if ((operation === "discover") !== (lease.kind === "discover") || (operation !== "complete" && body !== undefined)) {
    throw new TutorConnectionError("invalid_configuration");
  }
  const target = providerRequestTarget(lease.connection, operation);
  const url = new URL(target.url);
  let payload: string | undefined;
  if (operation === "complete") {
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new TutorConnectionError("invalid_configuration");
    try { payload = JSON.stringify(body); } catch { throw new TutorConnectionError("invalid_configuration"); }
    if (payload === undefined || Buffer.byteLength(payload) > PROVIDER_TRANSPORT_LIMITS.requestBytes) throw new TutorConnectionError("invalid_configuration");
  }
  // Fail before DNS or connecting when a required explicit key is unavailable.
  if (lease.connection.provider !== "local" && !lease.credential()) throw new TutorConnectionError("credential_required");
  const controller = new AbortController();
  let timedOut = false;
  const cancel = () => controller.abort();
  lease.signal.addEventListener("abort", cancel, { once: true });
  if (lease.signal.aborted) cancel();
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, operation !== "complete" ? PROVIDER_TRANSPORT_LIMITS.discoverMs : PROVIDER_TRANSPORT_LIMITS.completeMs);
  timeout.unref();
  const cancelled = () => new TutorConnectionError(timedOut ? "timeout" : "request_cancelled");
  let rejectAbort!: () => void;
  const aborted = new Promise<never>((_resolve, reject) => {
    rejectAbort = () => reject(cancelled());
    controller.signal.addEventListener("abort", rejectAbort, { once: true });
    if (controller.signal.aborted) rejectAbort();
  });
  try {
    let address = url.hostname.replace(/^\[|\]$/g, "");
    if (lease.connection.provider !== "local") {
      const resolved = await Promise.race([dns.lookup(url.hostname, { all: true, verbatim: true }), aborted]);
      if (!resolved.length || resolved.some(item => !isPublicAddress(item.address))) throw new TutorConnectionError("invalid_endpoint");
      // Pin one validated address, without a second lookup or address fallback.
      address = (resolved.find(item => item.family === 4) ?? resolved[0]).address;
    }
    lease.assertCurrent();
    if (controller.signal.aborted) throw cancelled();
    const credential = lease.credential();
    const headers: Record<string, string> = {
      Host: url.host, Accept: "application/json", "Accept-Encoding": "identity",
      ...(payload !== undefined ? { "Content-Type": "application/json", "Content-Length": String(Buffer.byteLength(payload)) } : {}),
    };
    if (credential) {
      if (lease.connection.provider === "gemini") headers["x-goog-api-key"] = credential;
      else if (lease.connection.provider === "anthropic") headers["x-api-key"] = credential;
      else headers.Authorization = `Bearer ${credential}`;
    }
    if (lease.connection.provider === "anthropic") headers["anthropic-version"] = "2023-06-01";
    const response = new Promise<unknown>((resolve, reject) => {
      const send = url.protocol === "https:" ? https.request : http.request;
      const req = send({
        hostname: address, family: isIP(address), port: url.port || (url.protocol === "https:" ? 443 : 80),
        servername: url.hostname, rejectUnauthorized: true, agent: false,
        path: url.pathname + url.search, method: target.method, headers, signal: controller.signal, maxHeaderSize: 16 * 1024,
      }, (res) => {
        const fail = (error: TutorConnectionError) => { reject(error); res.destroy(); req.destroy(); };
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400) return fail(new TutorConnectionError("redirect_rejected"));
        if (operation !== "complete" && [404, 405, 501].includes(status)) return fail(new TutorConnectionError("discovery_unsupported"));
        if (status < 200 || status >= 400) return fail(new TutorConnectionError(status === 401 || status === 403 ? "provider_auth" : status === 429 ? "provider_busy" : "provider_unavailable"));
        if (!/^application\/json(?:\s*;|$)/i.test(res.headers["content-type"] ?? "") || (res.headers["content-encoding"] !== undefined && res.headers["content-encoding"] !== "identity")) {
          return fail(new TutorConnectionError("response_invalid"));
        }
        if (Number(res.headers["content-length"]) > PROVIDER_TRANSPORT_LIMITS.responseBytes) return fail(new TutorConnectionError("response_too_large"));
        const chunks: Buffer[] = [];
        let bytes = 0;
        res.on("data", (chunk: Buffer) => {
          bytes += chunk.length;
          if (bytes > PROVIDER_TRANSPORT_LIMITS.responseBytes) {
            chunks.length = 0;
            fail(new TutorConnectionError("response_too_large"));
          } else chunks.push(chunk);
        });
        res.once("error", () => reject(new TutorConnectionError("provider_unavailable")));
        res.once("aborted", () => reject(new TutorConnectionError("provider_unavailable")));
        res.once("end", () => {
          try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
          catch { reject(new TutorConnectionError("response_invalid")); }
        });
      });
      req.once("error", () => reject(controller.signal.aborted ? cancelled() : new TutorConnectionError("provider_unavailable")));
      req.end(payload);
    });
    const result = await Promise.race([response, aborted]);
    lease.assertCurrent();
    return result;
  } catch (error) {
    if (controller.signal.aborted) throw cancelled();
    if (error instanceof TutorConnectionError) throw error;
    throw new TutorConnectionError("provider_unavailable");
  } finally {
    clearTimeout(timeout);
    lease.signal.removeEventListener("abort", cancel);
    controller.signal.removeEventListener("abort", rejectAbort);
  }
}
