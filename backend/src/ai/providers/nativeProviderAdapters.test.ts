import { afterEach, describe, expect, it, vi } from "vitest";
import https from "node:https";
import type http from "node:http";
import dns from "node:dns/promises";
import { EventEmitter } from "node:events";
import { createLocalTutorSessions } from "../../localTutorSession.js";
import { handlePersonalRequest } from "../../localTutorRoutes.js";
import { completeWithProvider, discoverModels, testProviderConnection, PROVIDER_ADAPTER_LIMITS } from "./providerAdapters.js";
import { requestProvider, PROVIDER_TRANSPORT_LIMITS } from "./providerTransport.js";

type Provider = "anthropic" | "gemini";
const providers: Provider[] = ["anthropic", "gemini"];
const stores: ReturnType<typeof createLocalTutorSessions>[] = [];
function owned(provider: Provider, kind: "test" | "discover" | "chat" = "test") {
  const sessions = createLocalTutorSessions(); stores.push(sessions);
  const created = sessions.create("http://127.0.0.1:5173");
  const auth = { sessionId: created.session.sessionId, proof: created.proof, origin: "http://127.0.0.1:5173" };
  const model = provider === "gemini" ? "models/gemini-fixture" : "claude-fixture";
  const candidateId = sessions.stage(auth, 0, { provider, model, apiKey: "explicit-native-key" }).candidate!.id;
  let generation = 0;
  if (kind === "chat") {
    const test = sessions.begin(auth, { kind: "test", generation, candidateId, requestId: "setup" });
    test.markTested(); test.finish(); generation = sessions.activate(auth, 0, candidateId).generation;
  }
  return { sessions, auth, candidateId, lease: sessions.begin(auth, { kind, generation, candidateId, requestId: "operation" }) };
}
const anthropic = (text: unknown = "Final answer", stop_reason = "end_turn") => ({ type: "message", role: "assistant", stop_reason, content: [{ type: "text", text }] });
const gemini = (text: unknown = "Final answer", finishReason = "STOP") => ({ candidates: [{ finishReason, content: { role: "model", parts: [{ text }] } }] });
const answer = (provider: Provider, text?: unknown) => provider === "anthropic" ? anthropic(text) : gemini(text);
const modelPage = (provider: Provider) => provider === "anthropic" ? { data: [{ id: "claude-fixture" }], has_more: false }
  : { models: [{ name: "models/gemini-fixture", supportedGenerationMethods: ["generateContent"] }] };
const prompt = { instructions: "Explain only the current computation.", messages: [
  { role: "user" as const, content: "Previous question" }, { role: "assistant" as const, content: "Previous final answer" },
  { role: "user" as const, content: "Grounded current context and question" },
] };
afterEach(() => { for (const store of stores.splice(0)) store.dispose(); vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.useRealTimers(); });

describe("native Anthropic and Gemini adapters", () => {
  it.each(providers)("uses the %s protocol and history roles without optional feature assumptions", async provider => {
    const send = vi.fn<typeof requestProvider>().mockResolvedValue(answer(provider));
    expect(await completeWithProvider(owned(provider, "chat").lease, prompt, send)).toBe("Final answer");
    expect(send).toHaveBeenCalledTimes(1);
    const body = send.mock.calls[0][2];
    if (provider === "anthropic") expect(body).toEqual({ model: "claude-fixture", system: prompt.instructions, messages: prompt.messages, max_tokens: 4096, stream: false });
    else expect(body).toEqual({ systemInstruction: { parts: [{ text: prompt.instructions }] },
      contents: prompt.messages.map(message => ({ role: message.role === "assistant" ? "model" : "user", parts: [{ text: message.content }] })),
      generationConfig: { maxOutputTokens: 4096, candidateCount: 1 } });
    expect(JSON.stringify(body)).not.toMatch(/explicit-native-key|thinking|tools|temperature|response_format/);
  });

  it.each(providers)("tests %s with a bounded synthetic prompt, not Lab data", async provider => {
    const send = vi.fn<typeof requestProvider>().mockResolvedValue(answer(provider, "Hello."));
    await testProviderConnection(owned(provider).lease, send);
    expect(send).toHaveBeenCalledTimes(1);
    const body = send.mock.calls[0][2] as Record<string, unknown>;
    expect(JSON.stringify(body)).toContain("short greeting");
    expect(JSON.stringify(body)).not.toMatch(/Previous|Grounded|explicit-native-key/);
    if (provider === "anthropic") expect(body.max_tokens).toBe(2048);
    else expect(body.generationConfig).toEqual({ maxOutputTokens: 2048, candidateCount: 1 });
  });

  it.each(providers)("keeps only %s final text and joins JSON fragments without changing their contents", async provider => {
    const parts = ['{"message":"A ', 'safe answer"}'];
    const response = provider === "anthropic" ? { ...anthropic(), content: [
      { type: "thinking", thinking: "PRIVATE", signature: "private-signature" },
      { type: "redacted_thinking", data: "private-data" }, ...parts.map(text => ({ type: "text", text })),
    ] } : { candidates: [{ finishReason: "STOP", content: { role: "model", parts: [
      { thought: true, text: "PRIVATE", thoughtSignature: "private-signature" },
      ...parts.map(text => ({ text, thought: false, thoughtSignature: "private-signature" })),
    ] } }] };
    expect(await completeWithProvider(owned(provider, "chat").lease, prompt, vi.fn().mockResolvedValue(response))).toBe(parts.join(""));
  });

  it.each([
    { response: anthropic("partial", "max_tokens"), code: "response_incomplete" },
    { response: anthropic("partial", "model_context_window_exceeded"), code: "response_incomplete" },
    { response: anthropic("private refusal", "refusal"), code: "response_refused" },
    { response: { ...anthropic(), stop_details: { type: "refusal", explanation: "PRIVATE" } }, code: "response_refused" },
    ...["tool_use", "pause_turn", "stop_sequence", "unexpected"].map(stop => ({ response: anthropic("unfinished", stop), code: "response_invalid" })),
    ...[null, "", "  ", {}, "<think>private</think>answer"].map(text => ({ response: anthropic(text), code: "response_invalid" })),
    { response: { ...anthropic(), content: [{ type: "thinking", thinking: "PRIVATE" }] }, code: "response_invalid" },
    { response: { ...anthropic(), content: [{ type: "tool_use", name: "ignored" }] }, code: "response_invalid" },
    { response: { ...anthropic(), role: "user" }, code: "response_invalid" },
    { response: { ...anthropic(), type: "error" }, code: "response_invalid" },
    { response: { ...anthropic(), content: [] }, code: "response_invalid" },
    { response: null, code: "response_invalid" },
  ])("rejects unusable Anthropic output %#", async ({ response, code }) => {
    await expect(testProviderConnection(owned("anthropic").lease, vi.fn().mockResolvedValue(response))).rejects.toMatchObject({ code });
  });

  it.each([
    { response: gemini("partial", "MAX_TOKENS"), code: "response_incomplete" },
    ...["SAFETY", "RECITATION", "BLOCKLIST", "PROHIBITED_CONTENT", "SPII", "IMAGE_SAFETY"].map(reason => ({ response: gemini("blocked", reason), code: "response_refused" })),
    { response: { promptFeedback: { blockReason: "SAFETY" } }, code: "response_refused" },
    ...["OTHER", "MALFORMED_FUNCTION_CALL", "UNEXPECTED_TOOL_CALL"].map(reason => ({ response: gemini("unfinished", reason), code: "response_invalid" })),
    ...[null, "", "  ", {}, "<think>private</think>answer"].map(text => ({ response: gemini(text), code: "response_invalid" })),
    ...[{ thought: true, text: "PRIVATE" }, { thought: "false", text: "PRIVATE" }, { thoughtSignature: "PRIVATE" }, { functionCall: { name: "ignored" } }, { inlineData: { data: "PRIVATE" } }].map(part => ({
      response: { candidates: [{ finishReason: "STOP", content: { role: "model", parts: [part] } }] }, code: "response_invalid",
    })),
    { response: { candidates: [gemini().candidates[0], gemini().candidates[0]] }, code: "response_invalid" },
    { response: { candidates: [] }, code: "response_invalid" },
    { response: null, code: "response_invalid" },
  ])("rejects unusable Gemini output %#", async ({ response, code }) => {
    await expect(testProviderConnection(owned("gemini").lease, vi.fn().mockResolvedValue(response))).rejects.toMatchObject({ code });
  });

  it.each(providers)("bounds %s input/output and rejects missing personal credentials before sending", async provider => {
    const { lease } = owned(provider, "chat");
    const send = vi.fn<typeof requestProvider>().mockResolvedValue(answer(provider, "x".repeat(PROVIDER_ADAPTER_LIMITS.outputBytes + 1)));
    await expect(completeWithProvider(lease, prompt, send)).rejects.toMatchObject({ code: "response_too_large" });
    send.mockClear();
    await expect(completeWithProvider(lease, { ...prompt, instructions: "x".repeat(PROVIDER_ADAPTER_LIMITS.inputBytes) }, send)).rejects.toMatchObject({ code: "input_too_large" });
    vi.stubEnv(provider === "anthropic" ? "ANTHROPIC_API_KEY" : "GEMINI_API_KEY", "ambient-secret");
    await expect(completeWithProvider({ ...lease, credential: () => undefined }, prompt, send)).rejects.toMatchObject({ code: "credential_required" });
    expect(send).not.toHaveBeenCalled();
  });

  it.each(providers)("rejects a late %s success after candidate replacement", async provider => {
    const { lease, sessions, auth } = owned(provider);
    const send = vi.fn<typeof requestProvider>().mockImplementation(async () => {
      sessions.stage(auth, 0, { provider, model: "replacement", apiKey: "replacement-key" });
      return answer(provider);
    });
    await expect(testProviderConnection(lease, send)).rejects.toMatchObject({ code: "request_cancelled" });
    expect(sessions.status(auth).candidate?.tested).toBe(false);
  });

  it("projects Anthropic IDs and reports an incomplete page without following its cursor", async () => {
    const send = vi.fn<typeof requestProvider>().mockResolvedValue({ data: [{ id: "claude-fixture", display_name: "PRIVATE" }], has_more: true, last_id: "https://unselected.invalid" });
    expect(await discoverModels(owned("anthropic", "discover").lease, send)).toEqual({ models: [{ id: "claude-fixture", availability: "listed" }], hasMore: true });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("projects Gemini native names/methods and marks a partial page without exposing the token", async () => {
    const send = vi.fn<typeof requestProvider>().mockResolvedValue({ models: [
      { name: "models/gemini-fixture", supportedGenerationMethods: ["generateContent"], description: "PRIVATE" },
      { name: "models/embedding", supportedGenerationMethods: ["embedContent"] },
    ], nextPageToken: "PRIVATE-page-token" });
    expect(await discoverModels(owned("gemini", "discover").lease, send)).toEqual({ models: [
      { id: "models/gemini-fixture", availability: "listed" }, { id: "models/embedding", availability: "unavailable" },
    ], hasMore: true });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("accepts an empty Gemini protobuf list response", async () => {
    expect(await discoverModels(owned("gemini", "discover").lease, vi.fn().mockResolvedValue({}))).toEqual({ models: [], hasMore: false });
  });

  it.each(providers)("rejects an oversized %s discovery page without truncating it", async provider => {
    const items = Array.from({ length: PROVIDER_ADAPTER_LIMITS.models + 1 }, (_, index) => provider === "anthropic" ? { id: `fixture-${index}` } : { name: `models/fixture-${index}` });
    const response = provider === "anthropic" ? { data: items, has_more: false } : { models: items };
    await expect(discoverModels(owned(provider, "discover").lease, vi.fn().mockResolvedValue(response))).rejects.toMatchObject({ code: "response_invalid" });
  });

  it.each([
    { provider: "anthropic", response: { data: [], has_more: "false" } },
    { provider: "anthropic", response: { data: [{ id: "fixture" }, { id: "fixture" }], has_more: false } },
    { provider: "gemini", response: { models: null } },
    { provider: "gemini", response: { error: { message: "PRIVATE" } } },
    { provider: "gemini", response: { models: [], nextPageToken: {} } },
    { provider: "gemini", response: { models: [{ name: "models/../secret" }] } },
    { provider: "gemini", response: { models: [{ name: "models/fixture", supportedGenerationMethods: "generateContent" }] } },
  ])("rejects malformed native discovery %#", async ({ provider, response }) => {
    await expect(discoverModels(owned(provider as Provider, "discover").lease, vi.fn().mockResolvedValue(response))).rejects.toMatchObject({ code: "response_invalid" });
  });
});

describe("native protocols through the bounded transport and personal route", () => {
  function fixture(provider: Provider, outcome: number | "timeout") {
    vi.spyOn(dns, "lookup").mockResolvedValue([{ address: "8.8.8.8", family: 4 }] as never);
    const calls: Array<{ options: https.RequestOptions; body?: string }> = [];
    vi.spyOn(https, "request").mockImplementation(((options: https.RequestOptions, callback: (response: http.IncomingMessage) => void) => {
      const req = new EventEmitter() as http.ClientRequest;
      req.destroy = vi.fn(() => req);
      options.signal?.addEventListener("abort", () => req.emit("error", new Error("fixture abort")), { once: true });
      req.end = vi.fn((body?: string) => {
        calls.push({ options, body });
        if (outcome === "timeout") return req;
        const res = new EventEmitter() as http.IncomingMessage;
        res.statusCode = outcome; res.headers = { "content-type": "application/json" }; res.destroy = vi.fn(() => res);
        callback(res); res.emit("data", Buffer.from(JSON.stringify(options.method === "GET" ? modelPage(provider) : answer(provider)))); res.emit("end"); return req;
      }) as typeof req.end;
      return req;
    }) as typeof https.request);
    return calls;
  }

  it.each(providers)("discovers, tests and activates %s through native header-only auth and fixed paths", async provider => {
    const calls = fixture(provider, 200), { lease, sessions, auth, candidateId } = owned(provider); lease.finish();
    const body = { generation: 0, candidateId, requestId: "native-route" };
    const discovered = await handlePersonalRequest("discover", auth, body, sessions);
    expect(discovered.body.hasMore).toBe(false);
    expect(calls).toHaveLength(1);
    expect(calls[0].options.path).toBe(provider === "anthropic" ? "/v1/models?limit=256" : "/v1beta/models?pageSize=256");
    expect(calls[0].body).toBeUndefined();
    await expect(handlePersonalRequest("activate", auth, { generation: 0, candidateId }, sessions)).rejects.toMatchObject({ code: "connection_unverified" });
    const tested = await handlePersonalRequest("test", auth, body, sessions);
    expect(tested.status).toBe(200); expect(sessions.status(auth).candidate?.tested).toBe(true);
    expect((await handlePersonalRequest("activate", auth, { generation: 0, candidateId }, sessions)).body.active).toMatchObject({ provider });
    expect(calls).toHaveLength(2);
    expect(calls[1].options.path).toBe(provider === "anthropic" ? "/v1/messages" : "/v1beta/models/gemini-fixture:generateContent");
    for (const call of calls) {
      const host = provider === "anthropic" ? "api.anthropic.com" : "generativelanguage.googleapis.com";
      expect(call.options).toMatchObject({ hostname: "8.8.8.8", servername: host, rejectUnauthorized: true, agent: false });
      expect(call.options.headers).toMatchObject(provider === "anthropic" ? { Host: host, "x-api-key": "explicit-native-key", "anthropic-version": "2023-06-01" } : { Host: host, "x-goog-api-key": "explicit-native-key" });
      expect(call.options.headers).not.toHaveProperty("Authorization");
      expect(String(call.options.path) + (call.body ?? "")).not.toContain("explicit-native-key");
    }
  });

  it.each([429, 500, 503, "timeout"] as const)("does not retry either native provider on %s", async outcome => {
    for (const provider of providers) {
      vi.useFakeTimers(); const calls = fixture(provider, outcome);
      const pending = testProviderConnection(owned(provider).lease);
      const result = pending.then(() => ({ code: "unexpected_success" }), error => error);
      if (outcome === "timeout") await vi.advanceTimersByTimeAsync(PROVIDER_TRANSPORT_LIMITS.completeMs);
      expect(await result).toMatchObject({ code: outcome === "timeout" ? "timeout" : outcome === 429 ? "provider_busy" : "provider_unavailable" });
      expect(calls).toHaveLength(1);
      vi.restoreAllMocks(); vi.useRealTimers();
    }
  });
});
