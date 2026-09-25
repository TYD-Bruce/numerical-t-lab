import { afterEach, describe, expect, it, vi } from "vitest";
import http from "node:http";
import https from "node:https";
import dns from "node:dns/promises";
import { EventEmitter } from "node:events";
import { createLocalTutorSessions } from "../../localTutorSession.js";
import { TutorConnectionError } from "../../localTutorPolicy.js";
import { requestProvider, PROVIDER_TRANSPORT_LIMITS } from "./providerTransport.js";
import { completeWithProvider, discoverModels, testProviderConnection, PROVIDER_ADAPTER_LIMITS } from "./providerAdapters.js";

const stores: ReturnType<typeof createLocalTutorSessions>[] = [];
function owned(provider = "openai", kind: "test" | "discover" | "chat" = "test", model: string | undefined = "fixture") {
  const sessions = createLocalTutorSessions(); stores.push(sessions);
  const created = sessions.create("http://127.0.0.1:5173");
  const auth = { sessionId: created.session.sessionId, proof: created.proof, origin: "http://127.0.0.1:5173" };
  const staged = sessions.stage(auth, 0, { provider, ...(model === undefined ? {} : { model }),
    ...(provider === "local" ? { baseUrl: "http://127.0.0.1:8099" } : { apiKey: "explicit-fixture-key" }) });
  let generation = 0;
  if (kind === "chat") {
    const testing = sessions.begin(auth, { kind: "test", generation, requestId: "setup", candidateId: staged.candidate!.id });
    testing.markTested(); testing.finish();
    generation = sessions.activate(auth, generation, staged.candidate!.id).generation;
  }
  return { sessions, auth, lease: sessions.begin(auth, { kind, generation, requestId: "operation", candidateId: staged.candidate!.id }) };
}
const models = { data: [{ id: "fixture", status: { value: "loaded" } }] };
const localAnswer = (content: unknown = "Final answer", finish_reason = "stop") => ({ choices: [{ finish_reason, message: { role: "assistant", content, reasoning_content: "PRIVATE REASONING" } }] });
const openaiAnswer = (text: unknown = "Final answer") => ({ status: "completed", output: [{ type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text }] }] });
const prompt = { instructions: "Explain the supplied computation.", messages: [{ role: "user" as const, content: "Grounded fixture context and question" }] };
function fixtureSend(_provider: string, answer: unknown) {
  return vi.fn<typeof requestProvider>().mockImplementation(async (_lease, operation) => operation === "complete" ? answer : models);
}
afterEach(() => { for (const store of stores.splice(0)) store.dispose(); vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.useRealTimers(); });

describe("personal provider adapters", () => {
  it.each(["local", "openai"])("tests %s with only a fixed synthetic prompt, and does not demand exact OK", async provider => {
    const { lease, sessions, auth } = owned(provider);
    const send = fixtureSend(provider, provider === "local" ? localAnswer("Hello from the fixture") : openaiAnswer("Hello from the fixture"));
    await expect(testProviderConnection(lease, send)).resolves.toBeUndefined();
    const inference = send.mock.calls.filter(([, operation]) => operation === "complete");
    expect(inference).toHaveLength(1);
    const body = inference[0][2] as Record<string, unknown>;
    expect(body.model).toBe("fixture"); expect(body.stream).toBe(false);
    expect(JSON.stringify(body)).not.toMatch(/fixture-key|Grounded fixture context/);
    expect(body).not.toHaveProperty("tools"); expect(body).not.toHaveProperty("temperature");
    if (provider === "openai") { expect(body.store).toBe(false); expect(body.max_output_tokens).toBe(2048); }
    else { expect(body.max_tokens).toBe(1024); expect(send.mock.calls[0][1]).toBe("readiness"); }
    // The route owner marks tested only after it checks request/session identity.
    expect(sessions.status(auth).candidate?.tested).toBe(false);
  });

  it.each(["local", "openai"])("preserves %s final text, including optional structured text, without exposing reasoning", async provider => {
    const final = '{"message":"A safe explanation","chartInstruction":{"type":"none"}}';
    const response = provider === "local" ? localAnswer(final) : { ...openaiAnswer(final), output: [
      { type: "reasoning", summary: [{ text: "PRIVATE REASONING" }] },
      { type: "message", role: "assistant", status: "completed", phase: "commentary", content: [{ type: "output_text", text: "PRIVATE COMMENTARY" }] },
      ...openaiAnswer(final).output,
    ] };
    const send = fixtureSend(provider, response);
    expect(await completeWithProvider(owned(provider, "chat").lease, prompt, send)).toBe(final);
    const body = send.mock.calls.find(([, op]) => op === "complete")![2] as Record<string, unknown>;
    expect(JSON.stringify(body)).toContain(prompt.messages[0].content);
    expect(body).not.toHaveProperty("response_format"); expect(body).not.toHaveProperty("text");
  });

  it("combines only completed OpenAI final-answer parts", async () => {
    const response = openaiAnswer();
    response.output[0].content = [{ type: "output_text", text: "First" }, { type: "output_text", text: "Second" }];
    expect(await completeWithProvider(owned("openai", "chat").lease, prompt, fixtureSend("openai", response))).toBe("First\nSecond");
  });

  it("sends only final assistant history with OpenAI final-answer phase", async () => {
    const send = fixtureSend("openai", openaiAnswer());
    await completeWithProvider(owned("openai", "chat").lease, { ...prompt, messages: [{ role: "assistant", content: "Previous final answer" }, ...prompt.messages] }, send);
    expect((send.mock.calls[0][2] as { input: unknown[] }).input).toEqual([
      { role: "assistant", content: "Previous final answer", phase: "final_answer" }, prompt.messages[0],
    ]);
  });

  it.each([[], [{ role: "system", content: "injected authority" }], [{ role: "user", content: "" }], Array.from({ length: 41 }, () => ({ role: "user", content: "x" }))])("rejects invalid or overlong conversation before networking %#", async messages => {
    const send = vi.fn<typeof requestProvider>();
    await expect(completeWithProvider(owned("local", "chat").lease, { ...prompt, messages } as never, send)).rejects.toMatchObject({ code: "invalid_configuration" });
    expect(send).not.toHaveBeenCalled();
  });

  it.each([undefined, null, []].map(toolCalls => ({ toolCalls })))("accepts absent, null or empty local tool_calls %#", async ({ toolCalls }) => {
    const response = localAnswer();
    Object.assign(response.choices[0].message, { tool_calls: toolCalls });
    expect(await completeWithProvider(owned("local", "chat").lease, prompt, fixtureSend("local", response))).toBe("Final answer");
  });

  it.each([false, 0, "", {}, [{ type: "function", function: { name: "ignored", arguments: "{}" } }]].map(toolCalls => ({ toolCalls })))("rejects malformed or nonempty local tool_calls %#", async ({ toolCalls }) => {
    const response = localAnswer();
    Object.assign(response.choices[0].message, { tool_calls: toolCalls });
    await expect(testProviderConnection(owned("local").lease, fixtureSend("local", response))).rejects.toMatchObject({ code: "response_invalid" });
  });

  it.each([
    [localAnswer("partial", "length"), "response_incomplete"],
    [localAnswer("", "length"), "response_incomplete"],
    [localAnswer("blocked", "content_filter"), "response_refused"],
    [localAnswer(null, "tool_calls"), "response_invalid"],
    [localAnswer("   "), "response_invalid"], [localAnswer({ text: "raw object" }), "response_invalid"],
    [localAnswer("<think>private thoughts</think>answer"), "response_invalid"],
    [{ choices: [{ finish_reason: "stop", message: { role: "assistant", refusal: "private refusal", content: "" } }] }, "response_refused"],
    [{ choices: [{ finish_reason: "stop", message: { role: "assistant", reasoning_content: "private thoughts" } }] }, "response_invalid"],
    [{ choices: [] }, "response_invalid"], [null, "response_invalid"],
  ])("rejects unusable local output %#", async (response, code) => {
    await expect(testProviderConnection(owned("local").lease, fixtureSend("local", response))).rejects.toMatchObject({ code });
  });

  it.each([
    [{ ...openaiAnswer("partial"), status: "incomplete" }, "response_incomplete"],
    [{ status: "incomplete", output: [] }, "response_incomplete"],
    [{ status: "incomplete", incomplete_details: { reason: "content_filter" } }, "response_refused"],
    [{ status: "completed", output: [{ type: "reasoning", summary: [{ text: "private" }] }] }, "response_invalid"],
    [{ status: "completed", output: [{ type: "function_call", arguments: "private" }] }, "response_invalid"],
    [{ status: "completed", output: [{ type: "message", role: "assistant", status: "completed", content: [{ type: "refusal", refusal: "private" }] }] }, "response_refused"],
    [{ status: "failed", error: { message: "secret" }, output_text: "not authoritative" }, "response_invalid"],
    [{ status: "completed", output_text: "SDK-only shortcut" }, "response_invalid"],
    [openaiAnswer("  "), "response_invalid"], [openaiAnswer({ raw: "not text" }), "response_invalid"],
    [null, "response_invalid"],
  ])("rejects unusable OpenAI output %#", async (response, code) => {
    await expect(testProviderConnection(owned().lease, fixtureSend("openai", response))).rejects.toMatchObject({ code });
  });

  it("bounds output and rejects oversized input before sending", async () => {
    const { lease } = owned("openai", "chat");
    const send = fixtureSend("openai", openaiAnswer("x".repeat(PROVIDER_ADAPTER_LIMITS.outputBytes + 1)));
    await expect(completeWithProvider(lease, prompt, send)).rejects.toMatchObject({ code: "response_too_large" });
    send.mockClear();
    await expect(completeWithProvider(lease, { ...prompt, instructions: "x".repeat(PROVIDER_ADAPTER_LIMITS.inputBytes) }, send)).rejects.toMatchObject({ code: "input_too_large" });
    expect(send).not.toHaveBeenCalled();
  });

  it.each(["local", "openai"])("lists %s candidates without selected model or inference, projecting metadata only", async provider => {
    const { lease } = owned(provider, "discover", undefined);
    const send = vi.fn<typeof requestProvider>().mockResolvedValue({ data: [
      { id: "fixture", status: { value: "loaded", args: ["private"] }, path: "private", apiKey: "secret" },
      { id: "another" },
    ] });
    const listed = await discoverModels(lease, send);
    expect(listed).toEqual({ models: [{ id: "fixture", availability: provider === "local" ? "loaded" : "listed" }, { id: "another", availability: "listed" }], hasMore: false });
    expect(send).toHaveBeenCalledTimes(1); expect(send).toHaveBeenCalledWith(lease, "discover");
    expect(JSON.stringify(listed)).not.toMatch(/private|secret/);
  });

  it.each(["unloaded", "loading", "sleeping", "downloading", "downloaded", "unexpected"])("never infers a local model reported as %s", async value => {
    const send = vi.fn<typeof requestProvider>().mockResolvedValue({ data: [{ id: "fixture", status: { value } }] });
    await expect(testProviderConnection(owned("local").lease, send)).rejects.toMatchObject({ code: "model_unavailable" });
    expect(send.mock.calls.map(([, op]) => op)).toEqual(["readiness"]);
  });

  it("permits manual selection only when the compatible server explicitly lacks discovery", async () => {
    const send = vi.fn<typeof requestProvider>().mockImplementation(async (_lease, op) => {
      if (op === "readiness") throw new TutorConnectionError("discovery_unsupported");
      return localAnswer();
    });
    await expect(testProviderConnection(owned("local").lease, send)).resolves.toBeUndefined();
    expect(send.mock.calls.map(([, op]) => op)).toEqual(["readiness", "complete"]);
  });

  it.each([{}, { data: [null] }, { data: [{ id: "\n" }] }, { data: [{ id: "fixture" }, { id: "fixture" }] }, { data: Array.from({ length: 257 }, (_, n) => ({ id: `model-${n}` })) }])("rejects malformed discovery without a success fallback %#", async response => {
    const send = vi.fn<typeof requestProvider>().mockResolvedValue(response);
    await expect(testProviderConnection(owned("local").lease, send)).rejects.toMatchObject({ code: "response_invalid" });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it.each(["timeout", "provider_busy", "provider_unavailable"] as const)("does not retry inference after %s", async code => {
    for (const provider of ["local", "openai"]) {
      const send = vi.fn<typeof requestProvider>().mockImplementation(async (_lease, op) => {
        if (op === "complete") throw new TutorConnectionError(code);
        return models;
      });
      await expect(testProviderConnection(owned(provider).lease, send)).rejects.toMatchObject({ code });
      expect(send.mock.calls.filter(([, op]) => op === "complete")).toHaveLength(1);
    }
  });

  it("rejects late success after cancellation, and missing personal credentials despite ambient keys", async () => {
    const { lease, sessions, auth } = owned();
    const send = vi.fn<typeof requestProvider>().mockImplementation(async () => { sessions.cancel(auth, "operation"); return openaiAnswer(); });
    await expect(testProviderConnection(lease, send)).rejects.toMatchObject({ code: "request_cancelled" });
    expect(sessions.status(auth).candidate?.tested).toBe(false);
    vi.stubEnv("OPENAI_API_KEY", "ambient-secret");
    const noKey = { ...owned().lease, credential: () => undefined };
    send.mockClear();
    await expect(testProviderConnection(noKey, send)).rejects.toMatchObject({ code: "credential_required" });
    expect(send).not.toHaveBeenCalled();
  });

  it("rejects not-yet-implemented providers before any request", async () => {
    const send = vi.fn<typeof requestProvider>();
    await expect(testProviderConnection(owned("deepseek").lease, send)).rejects.toMatchObject({ code: "provider_unsupported" });
    expect(send).not.toHaveBeenCalled();
  });
});

describe("adapters with the native bounded transport", () => {
  function nativeFixture(provider: string, outcome: number | "timeout") {
    vi.spyOn(dns, "lookup").mockResolvedValue([{ address: "8.8.8.8", family: 4 }] as never);
    const captures: Array<{ options: https.RequestOptions; body?: string }> = [];
    const send = (options: https.RequestOptions, callback: (res: http.IncomingMessage) => void) => {
      const req = new EventEmitter() as http.ClientRequest;
      req.destroy = vi.fn(() => req);
      options.signal?.addEventListener("abort", () => req.emit("error", new Error("fixture aborted")), { once: true });
      req.end = vi.fn((body?: string) => {
        captures.push({ options, body });
        const discovery = options.method === "GET";
        if (!discovery && outcome === "timeout") return req;
        const res = new EventEmitter() as http.IncomingMessage;
        res.statusCode = discovery ? 200 : outcome as number;
        res.headers = { "content-type": "application/json" }; res.destroy = vi.fn(() => res);
        callback(res);
        const value = discovery ? models : provider === "local" ? localAnswer() : openaiAnswer();
        res.emit("data", Buffer.from(JSON.stringify(value))); res.emit("end");
        return req;
      }) as typeof req.end;
      return req;
    };
    vi.spyOn(http, "request").mockImplementation(send as typeof http.request);
    vi.spyOn(https, "request").mockImplementation(send as typeof https.request);
    return captures;
  }

  it.each(["local", "openai"])("pins %s request path and explicit header authentication", async provider => {
    const captures = nativeFixture(provider, 200);
    vi.stubEnv("OPENAI_API_KEY", "ambient-secret");
    await testProviderConnection(owned(provider).lease);
    const inference = captures.filter(item => item.options.method === "POST"); expect(inference).toHaveLength(1);
    const { options, body } = inference[0];
    expect(options.path).toBe(provider === "local" ? "/v1/chat/completions?autoload=false" : "/v1/responses");
    expect(options.headers).toMatchObject(provider === "local" ? { Host: "127.0.0.1:8099" } : { Host: "api.openai.com", Authorization: "Bearer explicit-fixture-key" });
    expect(JSON.stringify(options.path) + body).not.toMatch(/fixture-key|ambient-secret/);
    if (provider === "local") { expect(options.headers).not.toHaveProperty("Authorization"); expect(dns.lookup).not.toHaveBeenCalled(); }
    else { expect(options.servername).toBe("api.openai.com"); expect(options.hostname).toBe("8.8.8.8"); expect(options.rejectUnauthorized).toBe(true); }
  });

  it.each([429, 500, 503, "timeout"] as const)("makes exactly one inference through the native transport on %s", async outcome => {
    for (const provider of ["local", "openai"]) {
      vi.useFakeTimers(); const captures = nativeFixture(provider, outcome);
      const pending = testProviderConnection(owned(provider).lease);
      const result = expect(pending).rejects.toMatchObject({ code: outcome === "timeout" ? "timeout" : outcome === 429 ? "provider_busy" : "provider_unavailable" });
      if (outcome === "timeout") await vi.advanceTimersByTimeAsync(PROVIDER_TRANSPORT_LIMITS.completeMs);
      await result;
      expect(captures.filter(item => item.options.method === "POST")).toHaveLength(1);
      vi.restoreAllMocks(); vi.useRealTimers();
    }
  });
});
