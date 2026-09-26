import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { createAppSessionStore } from "../app/appSessionStore";
import type { LabTutorBinding, TutorSessionAccess } from "../app/contracts";
import { appendTutorMessage, clearTutorConversation, updateTutorDraft } from "./moduleTutorSession";
import { createTutorConnection } from "./tutorConnection";
import { createLocalTutorSessions } from "../../../backend/src/localTutorSession";
import { handlePersonalRequest, personalOperation } from "../../../backend/src/localTutorRoutes";
import { TutorConnectionError } from "../../../backend/src/localTutorPolicy";
import * as transport from "../../../backend/src/ai/providers/providerTransport";
import { linearTutorFixture } from "../../../backend/src/ai/linearTutor.test-fixture";

const origin = "http://127.0.0.1:5173";
const config = { provider: "local" as const, baseUrl: "http://127.0.0.1:8099", model: "fixture" };
const context = {
  problem: { kind: "first_order", equationDisplay: "y' = y", t0: 0, tEnd: 1, h: 1, y0: 1 },
  method: { displayName: "Euler", family: "explicit", order: 1, isImplicit: false },
  result: { finalT: 1, finalY: 2, pointCount: 2, seriesPreview: [{ t: 0, y: 1 }, { t: 1, y: 2 }] },
};
const binding: LabTutorBinding = { moduleId: "ode", promptProfile: "ode", description: "Fixture", suggestedQuestions: [], getContext: () => ({ status: "ready", revision: 1, context }) };
let backend: ReturnType<typeof createLocalTutorSessions>;
let clients: ReturnType<typeof createTutorConnection>[];
let provider: MockInstance<typeof transport.requestProvider>;
let requests: Array<{ path: string; options: RequestInit }>;

async function fixtureFetch(input: RequestInfo | URL, options: RequestInit = {}): Promise<Response> {
  const path = String(input);
  requests.push({ path, options });
  const operation = personalOperation(path)!;
  const headers = new Headers(options.headers);
  const auth = { origin, sessionId: headers.get("x-t-lab-session") ?? "", proof: headers.get("x-t-lab-proof") ?? "" };
  const activity = () => {
    try { return ["chat", "test", "discover", "cancel"].includes(operation) ? backend.activity?.(auth) : undefined; }
    catch { return undefined; }
  };
  try {
    const reply = await handlePersonalRequest(operation, auth, JSON.parse(String(options.body)), backend, options.signal ?? undefined);
    return Response.json({ ...reply.body, ...(activity() ? { activity: activity() } : {}) }, { status: reply.status });
  } catch (error) {
    if (error instanceof TutorConnectionError) return Response.json({ code: error.code, error: error.message, ...(activity() ? { activity: activity() } : {}) }, { status: error.status });
    throw error;
  }
}
function client(fetcher: typeof fetch = fixtureFetch, pageOrigin = origin) {
  const value = createTutorConnection({ fetch: fetcher, origin: () => pageOrigin });
  clients.push(value);
  return value;
}
async function candidate(value: ReturnType<typeof client>) {
  await value.initialize();
  await value.stage(config);
  await value.test();
}
async function connected(access: TutorSessionAccess) {
  const value = client();
  await candidate(value);
  await value.decideHistory(access, value.reviewHistory(access, "candidate"), "fresh");
  return value;
}
function append(access: TutorSessionAccess, content = "Explain this result") {
  access.updateSession(session => appendTutorMessage(session, "user", content));
}
function holdReply(path: string) {
  let release!: () => void, started!: () => void;
  const waiting = new Promise<void>(resolve => { started = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  const fetcher: typeof fetch = async (input, options) => {
    const response = await fixtureFetch(input, options);
    if (String(input).endsWith(path)) { started(); await gate; }
    return response;
  };
  return { fetcher, waiting, release: () => release() };
}
beforeEach(() => {
  backend = createLocalTutorSessions(); clients = []; requests = [];
  provider = vi.spyOn(transport, "requestProvider").mockImplementation(async (_lease, op) => op === "complete"
    ? { choices: [{ message: { role: "assistant", content: "A complete explanation." }, finish_reason: "stop" }] }
    : { data: [{ id: "fixture", status: { value: "loaded" } }] });
});
afterEach(() => { for (const value of clients) value.dispose(); backend.dispose(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe("browser personal connection and per-Lab history", () => {
  it("sends only authorized Linear history and discards chart fields even if the local reply contains them", async () => {
    const store = createAppSessionStore(), access = store.createTutorSessionAccess("linear_algebra"), ode = store.createTutorSessionAccess("ode");
    append(ode, "Other Lab history must stay local");
    const value = client(async (input, options) => {
      const response = await fixtureFetch(input, options);
      if (!String(input).endsWith("/chat")) return response;
      const body = await response.json();
      return Response.json({ ...body, response: { ...body.response, chartInstruction: { type: "line_chart" } } });
    });
    await candidate(value);
    await value.decideHistory(access, value.reviewHistory(access, "candidate"), "fresh");
    append(access, "Explain my Linear result");
    const linear: LabTutorBinding = { ...binding, moduleId: "linear_algebra", promptProfile: "linear_algebra", getContext: () => ({ status: "ready", revision: 1, context: linearTutorFixture() }) };
    await expect(value.send(linear, access, new AbortController().signal)).resolves.toEqual({ message: "A complete explanation." });
    const body = String(requests.find(request => request.path.endsWith("/chat"))!.options.body);
    expect(JSON.parse(body)).toMatchObject({ profile: "linear_algebra", messages: [{ role: "user", content: "Explain my Linear result" }], context: linearTutorFixture() });
    expect(body).not.toContain("Other Lab history");
    expect(ode.getSession().items).toHaveLength(1);
  });

  it("does not send Linear requests to an older ODE-only backend", async () => {
    const value = client(async (input, options) => {
      const response = await fixtureFetch(input, options);
      if (!String(input).endsWith("/session")) return response;
      const body = await response.json();
      return Response.json({ ...body, capabilities: { ...body.capabilities, chatProfiles: ["ode"] } });
    });
    const access = createAppSessionStore().createTutorSessionAccess("linear_algebra");
    await candidate(value); await value.decideHistory(access, value.reviewHistory(access, "candidate"), "fresh"); append(access);
    await expect(value.send({ ...binding, moduleId: "linear_algebra", promptProfile: "linear_algebra" }, access, new AbortController().signal)).rejects.toMatchObject({ code: "profile_unsupported" });
    expect(requests.some(request => request.path.endsWith("/chat"))).toBe(false);
  });

  it("changes only the staged model and invalidates its previous history review without sending a key", async () => {
    const access = createAppSessionStore().createTutorSessionAccess("ode"), value = client();
    await candidate(value);
    const review = value.reviewHistory(access, "candidate");
    provider.mockClear();
    await value.selectModel("another-model");
    expect(JSON.parse(String(requests.at(-1)!.options.body))).toEqual({ generation: 0, candidateId: expect.any(String), model: "another-model" });
    expect(requests.at(-1)!.path).toBe("/api/personal/model");
    expect(provider).not.toHaveBeenCalled();
    expect(value.getState().session!.candidate).toMatchObject({ tested: false, connection: { model: "another-model" } });
    await expect(value.decideHistory(access, review, "transfer")).rejects.toMatchObject({ code: "history_changed" });
  });
  it.each(["https://demo.example", "http://192.168.1.2:5173", "http://localhost", "http://127.1:5173", "null"])("never bootstraps personal routes from %s", async page => {
    const value = client(fixtureFetch, page);
    await expect(value.initialize()).rejects.toMatchObject({ code: "local_required" });
    expect(requests).toHaveLength(0);
  });
  it("uses same-origin JSON with private runtime proof, no redirects or credentials in URLs/state", async () => {
    const value = client();
    expect(requests).toHaveLength(0);
    await value.initialize();
    await value.stage({ ...config, apiKey: "synthetic-write-only-key" });
    const request = requests.at(-1)!;
    expect(request.path).toBe("/api/personal/stage");
    expect(request.options).toMatchObject({ method: "POST", mode: "same-origin", redirect: "error", credentials: "omit", cache: "no-store" });
    expect(new Headers(request.options.headers).get("x-t-lab-proof")).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(value.getState())).not.toMatch(/synthetic-write-only-key|"proof"|"apiKey"/);
    expect(value.getState().selected.kind).toBe("hosted");
  });
  it("requires verified capability before accepting configuration", async () => {
    const value = client();
    await expect(value.stage(config)).rejects.toMatchObject({ code: "connection_required" });
    expect(requests).toHaveLength(0);
  });
  it("defaults activation to fresh and keeps another Lab's transcript blocked", async () => {
    const store = createAppSessionStore();
    const ode = store.createTutorSessionAccess("ode"), linear = store.createTutorSessionAccess("linear_algebra");
    append(ode, "ODE history"); append(linear, "Linear history");
    const value = client(); await candidate(value);
    await value.decideHistory(ode, value.reviewHistory(ode, "candidate"));
    expect(ode.getSession().items).toEqual([]);
    expect(value.canSendHistory(ode)).toBe(true);
    expect(linear.getSession().items).toHaveLength(1);
    expect(value.canSendHistory(linear)).toBe(false);
    await value.decideHistory(linear, value.reviewHistory(linear), "transfer");
    expect(value.canSendHistory(linear)).toBe(true);
    expect(linear.getSession().items).toHaveLength(1);
  });
  it("consumes transfer once; draft changes preserve the reviewed transcript", async () => {
    const access = createAppSessionStore().createTutorSessionAccess("ode"); append(access);
    const value = client(); await candidate(value);
    const review = value.reviewHistory(access, "candidate");
    access.updateSession(session => updateTutorDraft(session, "A draft"));
    await value.decideHistory(access, review, "transfer");
    expect(access.getSession().items).toHaveLength(1);
    expect(access.getSession().draftMessage).toBe("A draft");
    await expect(value.decideHistory(access, review, "transfer")).rejects.toMatchObject({ code: "history_changed" });
  });
  it("rejects changed transcript, wrong Lab, replaced candidate and another runtime's consent", async () => {
    const store = createAppSessionStore(), ode = store.createTutorSessionAccess("ode"), linear = store.createTutorSessionAccess("linear_algebra");
    append(ode);
    const value = client(); await candidate(value);
    let review = value.reviewHistory(ode, "candidate"); append(ode, "Changed");
    await expect(value.decideHistory(ode, review, "transfer")).rejects.toMatchObject({ code: "history_changed" });
    review = value.reviewHistory(ode, "candidate");
    await expect(value.decideHistory(linear, review, "transfer")).rejects.toMatchObject({ code: "history_changed" });
    review = value.reviewHistory(ode, "candidate"); await value.stage(config); await value.test();
    await expect(value.decideHistory(ode, review, "transfer")).rejects.toMatchObject({ code: "history_changed" });
    review = value.reviewHistory(ode, "candidate"); const other = client(); await candidate(other);
    await expect(other.decideHistory(ode, review, "transfer")).rejects.toMatchObject({ code: "history_changed" });
    expect(requests.filter(request => request.path.endsWith("/activate"))).toHaveLength(0);
  });
  it("cancel preserves the old connection and both transcript and draft", async () => {
    const access = createAppSessionStore().createTutorSessionAccess("ode");
    const value = await connected(access); append(access);
    const previous = access.getSession(), selection = value.getState().selected;
    await value.stage(config); await value.test();
    await value.decideHistory(access, value.reviewHistory(access, "candidate"), "cancel");
    expect(access.getSession()).toBe(previous);
    expect(value.getState().selected).toEqual(selection);
    expect(value.getState().session?.candidate).toBeUndefined();
  });
  it("failed testing preserves the usable old connection and conversation", async () => {
    const access = createAppSessionStore().createTutorSessionAccess("ode");
    const value = await connected(access); append(access);
    const before = access.getSession(), selection = value.getState().selected;
    await value.stage(config);
    provider.mockRejectedValueOnce(new TutorConnectionError("provider_auth"));
    await expect(value.test()).rejects.toMatchObject({ code: "provider_auth" });
    expect(access.getSession()).toBe(before);
    expect(value.getState().selected).toEqual(selection);
    expect(value.canSendHistory(access)).toBe(true);
  });
  it("sends only the authorized Lab's messages with freshly read context and matching response identity", async () => {
    const store = createAppSessionStore(), access = store.createTutorSessionAccess("ode");
    const value = await connected(access); append(access);
    append(store.createTutorSessionAccess("linear_algebra"), "Must not leave the other Lab");
    const response = await value.send(binding, access, new AbortController().signal);
    expect(response.message).toBe("A complete explanation.");
    const body = JSON.parse(String(requests.find(request => request.path.endsWith("/chat"))!.options.body));
    expect(Object.keys(body).sort()).toEqual(["context", "generation", "messages", "profile", "requestId"]);
    expect(body.context).toEqual(context);
    expect(body.messages).toEqual([{ role: "user", content: "Explain this result" }]);
    expect(JSON.stringify(body)).not.toContain("Must not leave");
  });
  it("clear drops provenance, allowing a fresh conversation without retaining old authorization", async () => {
    const access = createAppSessionStore().createTutorSessionAccess("ode"); const value = await connected(access);
    append(access); const old = access.getSession().connection;
    access.updateSession(clearTutorConversation);
    expect(access.getSession().connection).toBeUndefined();
    value.prepareConversation(access);
    expect(access.getSession().connection).toEqual(old);
  });
  it("does not fall back to hosted chat after disconnect", async () => {
    const access = createAppSessionStore().createTutorSessionAccess("ode"); const value = await connected(access); append(access);
    await value.disconnect();
    await expect(value.send(binding, access, new AbortController().signal)).rejects.toMatchObject({ code: "connection_required" });
    expect(requests.some(request => request.path === "/api/chat")).toBe(false);
    expect(access.getSession().items).toHaveLength(1);
  });
  it("can reconnect after disconnect and can explicitly return to hosted after expiry", async () => {
    vi.useFakeTimers();
    const access = createAppSessionStore().createTutorSessionAccess("ode"); const value = await connected(access); append(access);
    await value.disconnect(); await value.stage(config); await value.test();
    await value.decideHistory(access, value.reviewHistory(access, "candidate"), "transfer");
    expect(value.canSendHistory(access)).toBe(true);
    const deadline = value.getState().session!.idleExpiresAt;
    await vi.advanceTimersByTimeAsync(deadline - Date.now() + 1);
    expect(value.getState().status).toBe("expired");
    const review = value.reviewHistory(access, "hosted");
    await value.decideHistory(access, review, "transfer");
    expect(value.getState().selected.kind).toBe("hosted");
    expect(access.getSession().items).toHaveLength(1);
  });
  it("failed configuration clears prior test eligibility without losing the active connection", async () => {
    const access = createAppSessionStore().createTutorSessionAccess("ode"); const value = await connected(access);
    await value.stage(config); await value.test();
    await expect(value.stage({ ...config, baseUrl: "http://192.168.1.2:8080" })).rejects.toMatchObject({ code: "invalid_endpoint" });
    expect(() => value.reviewHistory(access, "candidate")).toThrow();
    expect(value.canSendHistory(access)).toBe(true);
  });
  it("will not interpret an unknown history action as transfer", async () => {
    const access = createAppSessionStore().createTutorSessionAccess("ode"); append(access);
    const value = client(); await candidate(value);
    await expect(value.decideHistory(access, value.reviewHistory(access, "candidate"), "typo" as "transfer")).rejects.toMatchObject({ code: "history_changed" });
    expect(requests.some(request => request.path.endsWith("/activate"))).toBe(false);
  });
  it("same public configuration still advances generation and invalidates the inactive Lab", async () => {
    const store = createAppSessionStore(), ode = store.createTutorSessionAccess("ode"), linear = store.createTutorSessionAccess("linear_algebra");
    const value = await connected(ode); value.prepareConversation(linear); append(linear); append(ode);
    const generation = value.getState().selected.generation;
    await value.stage(config); await value.test(); await value.decideHistory(ode, value.reviewHistory(ode, "candidate"), "transfer");
    expect(value.getState().selected.generation).toBe(generation + 1);
    expect(value.canSendHistory(ode)).toBe(true); expect(value.canSendHistory(linear)).toBe(false);
  });
  it.each(["clear", "append", "context", "navigation", "abort", "disconnect", "dispose"])("rejects a late answer after %s without changing a transcript", async change => {
    const access = createAppSessionStore().createTutorSessionAccess("ode"), held = holdReply("/chat"), value = client(held.fetcher);
    await candidate(value); await value.decideHistory(access, value.reviewHistory(access, "candidate")); append(access);
    let revision = 1, mounted = true;
    const dynamic: LabTutorBinding = { ...binding, getContext: () => ({ status: "ready", revision, context }) };
    const controller = new AbortController();
    const result = value.send(dynamic, access, controller.signal, () => mounted).catch(error => error);
    await held.waiting;
    if (change === "clear") access.updateSession(clearTutorConversation);
    if (change === "append") append(access, "A different revision");
    if (change === "context") revision++;
    if (change === "navigation") mounted = false;
    if (change === "abort") controller.abort();
    if (change === "disconnect") await value.disconnect();
    if (change === "dispose") value.dispose();
    const expected = access.getSession(); held.release();
    expect(await result).toMatchObject({ code: "request_cancelled" });
    expect(access.getSession()).toBe(expected);
    expect(value.getState().pending).toBeUndefined();
  });
  it("checks changes made by completion subscribers before returning a reply", async () => {
    const access = createAppSessionStore().createTutorSessionAccess("ode"); const value = await connected(access); append(access);
    let waiting = false;
    value.subscribe(() => {
      if (value.getState().pending === "chat") waiting = true;
      else if (waiting) { waiting = false; access.updateSession(clearTutorConversation); }
    });
    await expect(value.send(binding, access, new AbortController().signal)).rejects.toMatchObject({ code: "request_cancelled" });
    expect(access.getSession().items).toEqual([]);
  });
  it("does not clear or transfer a changed transcript after the server accepted activation", async () => {
    const access = createAppSessionStore().createTutorSessionAccess("ode"), held = holdReply("/activate"), value = client(held.fetcher);
    append(access); await candidate(value);
    const result = value.decideHistory(access, value.reviewHistory(access, "candidate"), "fresh").catch(error => error);
    await held.waiting; append(access, "Changed while activation was pending"); held.release();
    expect(await result).toMatchObject({ code: "history_changed" });
    expect(access.getSession().items).toHaveLength(2);
    expect(value.getState().selected.kind).toBe("personal");
    expect(value.canSendHistory(access)).toBe(false);
  });
  it("separates session IDs and proofs between two tab runtimes", async () => {
    const a = client(), b = client(); await a.initialize(); await b.initialize();
    expect(a.getState().session!.sessionId).not.toBe(b.getState().session!.sessionId);
    await a.stage(config); const first = new Headers(requests.at(-1)!.options.headers);
    await b.stage(config); const second = new Headers(requests.at(-1)!.options.headers);
    expect(first.get("x-t-lab-proof")).not.toBe(second.get("x-t-lab-proof"));
    expect(first.get("x-t-lab-session")).not.toBe(second.get("x-t-lab-session"));
  });
  it.each(["requestId", "profile", "generation"])("rejects a mismatched reply %s", async field => {
    const fetcher: typeof fetch = async (input, options) => {
      const response = await fixtureFetch(input, options);
      if (!String(input).endsWith("/chat")) return response;
      return Response.json({ ...await response.json(), [field]: "wrong" });
    };
    const value = client(fetcher), access = createAppSessionStore().createTutorSessionAccess("ode");
    await candidate(value); await value.decideHistory(access, value.reviewHistory(access, "candidate")); append(access);
    await expect(value.send(binding, access, new AbortController().signal)).rejects.toMatchObject({ code: "response_invalid" });
  });
  it("rejects profile/binding and unavailable context before any chat request", async () => {
    const access = createAppSessionStore().createTutorSessionAccess("ode"), value = await connected(access); append(access);
    await expect(value.send({ ...binding, moduleId: "linear_algebra" }, access, new AbortController().signal)).rejects.toMatchObject({ code: "profile_unsupported" });
    await expect(value.send({ ...binding, getContext: () => ({ status: "unavailable", revision: 2, message: "Run first" }) }, access, new AbortController().signal)).rejects.toMatchObject({ code: "invalid_context" });
    expect(requests.some(request => request.path.endsWith("/chat"))).toBe(false);
  });
  it("expires a busy connection at its absolute deadline and rejects the late response", async () => {
    vi.useFakeTimers();
    const access = createAppSessionStore().createTutorSessionAccess("ode");
    const held = holdReply("/chat");
    const fetcher: typeof fetch = async (input, options) => {
      const response = await held.fetcher(input, options);
      const body = await response.json();
      // Short advertised deadlines exercise the browser timer; the backend owns real limits.
      if (body.session) body.session.absoluteExpiresAt = Date.now() + 1000;
      else if (body.sessionId) body.absoluteExpiresAt = Date.now() + 1000;
      return Response.json(body, { status: response.status });
    };
    const value = client(fetcher); await candidate(value); await value.decideHistory(access, value.reviewHistory(access, "candidate")); append(access);
    const result = value.send(binding, access, new AbortController().signal).catch(error => error);
    await held.waiting; await vi.advanceTimersByTimeAsync(1001);
    expect(value.getState().status).toBe("expired");
    held.release(); expect(await result).toMatchObject({ code: "request_cancelled" });
    expect(access.getSession().items).toHaveLength(1);
  });
  it("does not leak raw server errors, retry, or use a hosted fallback", async () => {
    let fail = false;
    const fetcher: typeof fetch = (input, options) => fail && String(input).endsWith("/chat")
      ? Promise.resolve(Response.json({ code: "provider_auth", error: "secret raw credential/provider body" }, { status: 401 })) : fixtureFetch(input, options);
    const value = client(fetcher), access = createAppSessionStore().createTutorSessionAccess("ode");
    await candidate(value); await value.decideHistory(access, value.reviewHistory(access, "candidate")); append(access);
    fail = true;
    const result = await value.send(binding, access, new AbortController().signal).catch(error => error);
    expect(result).toMatchObject({ code: "provider_auth" });
    expect(String(result)).not.toContain("secret");
    expect(value.getState().selected.kind).toBe("personal");
    expect(requests.some(request => request.path === "/api/chat")).toBe(false);
  });
  it("times out a stalled browser request once and frees the slot", async () => {
    vi.useFakeTimers(); let calls = 0;
    const fetcher: typeof fetch = (input, options) => String(input).endsWith("/chat") ? new Promise((_resolve, reject) => {
      calls++; options!.signal!.addEventListener("abort", () => reject(new Error("private fetch internals")), { once: true });
    }) : fixtureFetch(input, options);
    const value = client(fetcher), access = createAppSessionStore().createTutorSessionAccess("ode");
    await candidate(value); await value.decideHistory(access, value.reviewHistory(access, "candidate")); append(access);
    const result = value.send(binding, access, new AbortController().signal).catch(error => error);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(await result).toMatchObject({ code: "timeout" });
    expect(calls).toBe(1); expect(value.getState().pending).toBeUndefined();
    expect(value.canSendHistory(access)).toBe(true);
  });
  it("does not expire an accepted chat at the old idle deadline or extend absolute lifetime", async () => {
    vi.useFakeTimers();
    const access = createAppSessionStore().createTutorSessionAccess("ode"), held = holdReply("/chat"), value = client(held.fetcher);
    await candidate(value); await value.decideHistory(access, value.reviewHistory(access, "candidate")); append(access);
    const original = value.getState().session!;
    await vi.advanceTimersByTimeAsync(original.idleExpiresAt - Date.now() - 1000);
    const result = value.send(binding, access, new AbortController().signal);
    await held.waiting; await vi.advanceTimersByTimeAsync(2000); held.release();
    await expect(result).resolves.toHaveProperty("message");
    expect(value.getState().session!.idleExpiresAt).toBeGreaterThan(original.idleExpiresAt);
    expect(value.getState().session!.absoluteExpiresAt).toBe(original.absoluteExpiresAt);
  });
  it.each(["lost", "malformed"])("fails closed after an uncertain %s activation reply while preserving history", async kind => {
    const fetcher: typeof fetch = async (input, options) => {
      const response = await fixtureFetch(input, options);
      if (!String(input).endsWith("/activate")) return response;
      if (kind === "lost") throw new Error("private path and secret");
      return Response.json({ unexpected: true });
    };
    const value = client(fetcher), access = createAppSessionStore().createTutorSessionAccess("ode"); append(access); await candidate(value);
    const before = access.getSession();
    await expect(value.decideHistory(access, value.reviewHistory(access, "candidate"), "fresh")).rejects.toBeInstanceOf(Error);
    expect(value.getState().status).toBe("unavailable");
    expect(value.getState().session).toBeUndefined();
    expect(value.getState().selected.kind).toBe("personal");
    expect(value.canSendHistory(access)).toBe(false);
    expect(access.getSession()).toBe(before);
  });
  it("late session errors from cancelled work cannot expire a newer connection", async () => {
    const held = holdReply("/chat");
    const fetcher: typeof fetch = async (input, options) => {
      const result = await held.fetcher(input, options);
      return String(input).endsWith("/chat") ? Response.json({ code: "session_expired" }, { status: 401 }) : result;
    };
    const value = client(fetcher), access = createAppSessionStore().createTutorSessionAccess("ode");
    await candidate(value); await value.decideHistory(access, value.reviewHistory(access, "candidate")); append(access);
    const result = value.send(binding, access, new AbortController().signal).catch(error => error);
    await held.waiting; value.cancel(); await value.stage(config); await value.test();
    await value.decideHistory(access, value.reviewHistory(access, "candidate"), "transfer");
    const identity = value.getState().selected; held.release();
    expect(await result).toMatchObject({ code: "request_cancelled" });
    expect(value.getState().selected).toEqual(identity); expect(value.getState().status).toBe("available");
  });
  it("checks reentrant store changes when preparing conversation provenance", async () => {
    const store = createAppSessionStore(), access = store.createTutorSessionAccess("ode"), value = await connected(access);
    access.updateSession(clearTutorConversation);
    let changed = false;
    store.subscribe(() => { if (!changed) { changed = true; access.updateSession(clearTutorConversation); } });
    expect(() => value.prepareConversation(access)).toThrow(/history_changed/);
    expect(access.getSession().connection).toBeUndefined();
  });
  it("rejects a second simultaneous operation instead of queueing or replaying it", async () => {
    const access = createAppSessionStore().createTutorSessionAccess("ode"), held = holdReply("/chat"), value = client(held.fetcher);
    await candidate(value); await value.decideHistory(access, value.reviewHistory(access, "candidate")); append(access);
    const result = value.send(binding, access, new AbortController().signal); await held.waiting;
    await expect(value.send(binding, access, new AbortController().signal)).rejects.toMatchObject({ code: "request_busy" });
    held.release(); await result;
    expect(requests.filter(request => request.path.endsWith("/chat"))).toHaveLength(1);
  });
  it.each(["none", "clear", "context", "navigate", "abort", "dispose"])("rechecks a rejected completion after the subscriber performs %s", async change => {
    const access = createAppSessionStore().createTutorSessionAccess("ode"), value = await connected(access); append(access);
    let revision = 1, mounted = true, waiting = false;
    const controller = new AbortController();
    const currentBinding: LabTutorBinding = { ...binding, getContext: () => ({ status: "ready", revision, context }) };
    value.subscribe(() => {
      if (value.getState().pending === "chat") { waiting = true; return; }
      if (!waiting) return; waiting = false;
      if (change === "clear") access.updateSession(clearTutorConversation);
      if (change === "context") revision++;
      if (change === "navigate") mounted = false;
      if (change === "abort") controller.abort();
      if (change === "dispose") value.dispose();
    });
    provider.mockRejectedValueOnce(new TutorConnectionError("provider_auth"));
    await expect(value.send(currentBinding, access, controller.signal, () => mounted)).rejects.toMatchObject({ code: change === "none" ? "provider_auth" : "request_cancelled" });
    expect(access.getSession().items.some(item => item.kind === "message" && item.role === "assistant")).toBe(false);
  });
  it.each(["chat", "test", "discover"])("keeps accepted failed %s activity alive past the old idle deadline", async operation => {
    vi.useFakeTimers();
    const access = createAppSessionStore().createTutorSessionAccess("ode"), value = await connected(access); append(access);
    await value.stage(config);
    const initial = value.getState().session!;
    vi.setSystemTime(initial.idleExpiresAt - 1000);
    provider.mockRejectedValueOnce(new TutorConnectionError("provider_busy"));
    const request = operation === "chat" ? value.send(binding, access, new AbortController().signal) : operation === "test" ? value.test() : value.discover();
    await expect(request).rejects.toMatchObject({ code: "provider_busy" });
    const headers = new Headers(requests.at(-1)!.options.headers);
    const auth = { origin, sessionId: headers.get("x-t-lab-session")!, proof: headers.get("x-t-lab-proof")! };
    vi.setSystemTime(initial.idleExpiresAt + 1);
    expect(() => backend.authorize(auth)).not.toThrow();
    expect(value.getState().status).toBe("available");
    expect(value.getState().session!.idleExpiresAt).toBeGreaterThan(initial.idleExpiresAt);
    expect(value.getState().session!.absoluteExpiresAt).toBe(initial.absoluteExpiresAt);
    expect(requests.some(request => request.path.endsWith("/close"))).toBe(false);
  });
  it("does not renew on a failed request with no authoritative activity acknowledgement", async () => {
    vi.useFakeTimers();
    const fetcher: typeof fetch = (input, options) => String(input).endsWith("/chat")
      ? Promise.resolve(Response.json({ code: "provider_busy" }, { status: 429 })) : fixtureFetch(input, options);
    const access = createAppSessionStore().createTutorSessionAccess("ode"), value = client(fetcher);
    await candidate(value); await value.decideHistory(access, value.reviewHistory(access, "candidate")); append(access);
    const deadline = value.getState().session!.idleExpiresAt; vi.setSystemTime(deadline - 1000);
    await expect(value.send(binding, access, new AbortController().signal)).rejects.toMatchObject({ code: "provider_busy" });
    expect(value.getState().session!.idleExpiresAt).toBe(deadline);
    vi.setSystemTime(deadline + 1); expect(value.getState().status).toBe("expired");
  });
  it.each(["accepted", "timeout"])("bounds the cancellation activity wait at the old idle deadline: %s", async outcome => {
    vi.useFakeTimers();
    const chat = holdReply("/chat"), cancellation = holdReply("/cancel");
    const fetcher: typeof fetch = (input, options) => String(input).endsWith("/cancel")
      ? cancellation.fetcher(input, options) : chat.fetcher(input, options);
    const access = createAppSessionStore().createTutorSessionAccess("ode"), value = client(fetcher);
    await candidate(value); await value.decideHistory(access, value.reviewHistory(access, "candidate")); append(access);
    const initial = value.getState().session!;
    await vi.advanceTimersByTimeAsync(initial.idleExpiresAt - Date.now() - 1000);
    const result = value.send(binding, access, new AbortController().signal).catch(error => error);
    await chat.waiting; value.cancel(); await cancellation.waiting;
    await vi.advanceTimersByTimeAsync(1001);
    expect(value.getState().status).toBe("available"); // bounded acknowledgement still pending
    if (outcome === "timeout") {
      await vi.advanceTimersByTimeAsync(499);
      expect(value.getState().status).toBe("expired");
      expect(requests.filter(request => request.path.endsWith("/close"))).toHaveLength(1);
    }
    cancellation.release(); await vi.advanceTimersByTimeAsync(0);
    if (outcome === "accepted") {
      expect(value.getState().status).toBe("available");
      expect(value.getState().session!.idleExpiresAt).toBe(initial.idleExpiresAt + initial.idleTimeoutMs - 1000);
      expect(value.getState().session!.absoluteExpiresAt).toBe(initial.absoluteExpiresAt);
    } else expect(value.getState().session).toBeUndefined(); // late acknowledgement cannot revive it
    chat.release(); expect(await result).toMatchObject({ code: "request_cancelled" });
  });
  it("does not roll back newer accepted activity when cancellation finishes late", async () => {
    vi.useFakeTimers();
    const chat = holdReply("/chat"), cancellation = holdReply("/cancel");
    const value = client((input, options) => String(input).endsWith("/cancel") ? cancellation.fetcher(input, options) : chat.fetcher(input, options));
    const access = createAppSessionStore().createTutorSessionAccess("ode");
    await candidate(value); await value.decideHistory(access, value.reviewHistory(access, "candidate")); append(access);
    const result = value.send(binding, access, new AbortController().signal).catch(error => error);
    await chat.waiting; value.cancel(); await cancellation.waiting;
    await vi.advanceTimersByTimeAsync(500); await value.refresh();
    const newer = value.getState().session!;
    cancellation.release(); await vi.advanceTimersByTimeAsync(0);
    expect(value.getState().session!.idleExpiresAt).toBe(newer.idleExpiresAt);
    chat.release(); expect(await result).toMatchObject({ code: "request_cancelled" });
  });
  it("never extends absolute expiry while a cancellation acknowledgement is pending", async () => {
    vi.useFakeTimers();
    const chat = holdReply("/chat"), cancellation = holdReply("/cancel");
    const fetcher: typeof fetch = async (input, options) => {
      const response = await (String(input).endsWith("/cancel") ? cancellation : chat).fetcher(input, options);
      const body = await response.json();
      if (body.session) body.session.absoluteExpiresAt = Date.now() + 1000;
      else if (body.sessionId) body.absoluteExpiresAt = Date.now() + 1000;
      return Response.json(body, { status: response.status });
    };
    const access = createAppSessionStore().createTutorSessionAccess("ode"), value = client(fetcher);
    await candidate(value); await value.decideHistory(access, value.reviewHistory(access, "candidate")); append(access);
    const result = value.send(binding, access, new AbortController().signal).catch(error => error);
    await chat.waiting; value.cancel(); await cancellation.waiting;
    await vi.advanceTimersByTimeAsync(1000);
    expect(value.getState().status).toBe("expired");
    cancellation.release(); chat.release();
    expect(await result).toMatchObject({ code: "request_cancelled" });
    await vi.advanceTimersByTimeAsync(0);
    expect(value.getState().session).toBeUndefined();
  });
  it.each(["sessionId", "generation"])("rejects an activity acknowledgement from another %s", async field => {
    const fetcher: typeof fetch = async (input, options) => {
      const response = await fixtureFetch(input, options);
      if (!String(input).endsWith("/chat")) return response;
      const body = await response.json();
      return Response.json({ ...body, activity: { ...body.activity, [field]: field === "generation" ? 999 : "f".repeat(32) } });
    };
    const access = createAppSessionStore().createTutorSessionAccess("ode"), value = client(fetcher);
    await candidate(value); await value.decideHistory(access, value.reviewHistory(access, "candidate")); append(access);
    const initial = value.getState().session!;
    await expect(value.send(binding, access, new AbortController().signal)).rejects.toMatchObject({ code: "response_invalid" });
    expect(value.getState().session).toEqual(initial);
  });
  it("invalidates a connection-changed error even when activity reports the backend's newer generation", async () => {
    const access = createAppSessionStore().createTutorSessionAccess("ode"), value = await connected(access); append(access);
    const headers = new Headers(requests.at(-1)!.options.headers);
    backend.disconnect({ origin, sessionId: headers.get("x-t-lab-session")!, proof: headers.get("x-t-lab-proof")! }, 1);
    await expect(value.send(binding, access, new AbortController().signal)).rejects.toMatchObject({ code: "request_cancelled" });
    expect(value.getState().status).toBe("unavailable");
    expect(value.getState().selected.kind).toBe("personal");
    expect(value.getState().session).toBeUndefined();
    expect(access.getSession().items).toHaveLength(1);
  });
  it.each([
    { type: "zoom_range", tMin: "not-a-number", tMax: 1, privateExtra: "unknown" },
    { type: "zoom_range", tMin: 2, tMax: 1 },
    { type: "zoom_range", tMin: 0 },
    { type: "line_chart", includeLine: "yes" },
    { type: "line_chart", title: "x".repeat(1025) },
    { type: "error_table", tableRows: [{ x: {} }] },
    { type: "error_table", tableRows: Array(81).fill({ x: 1 }) },
    { type: "error_table", tableRows: [JSON.parse('{"__proto__":"invalid"}')] },
    { type: "line_chart", unexpected: true },
  ])("drops malformed optional chart %# while preserving its explanation", async chartInstruction => {
    const fetcher: typeof fetch = async (input, options) => {
      const response = await fixtureFetch(input, options);
      if (!String(input).endsWith("/chat")) return response;
      const reply = await response.json();
      return Response.json({ ...reply, response: { message: "Clean explanation", chartInstruction } });
    };
    const access = createAppSessionStore().createTutorSessionAccess("ode"), value = client(fetcher);
    await candidate(value); await value.decideHistory(access, value.reviewHistory(access, "candidate")); append(access);
    await expect(value.send(binding, access, new AbortController().signal)).resolves.toEqual({ message: "Clean explanation" });
  });
});
