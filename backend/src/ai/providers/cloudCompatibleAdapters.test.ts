import { afterEach, describe, expect, it, vi } from "vitest";
import https from "node:https";
import type http from "node:http";
import dns from "node:dns/promises";
import { EventEmitter } from "node:events";
import { createLocalTutorSessions } from "../../localTutorSession.js";
import { handlePersonalRequest } from "../../localTutorRoutes.js";
import { completeWithProvider, discoverModels, testProviderConnection, PROVIDER_ADAPTER_LIMITS } from "./providerAdapters.js";
import { requestProvider, PROVIDER_TRANSPORT_LIMITS } from "./providerTransport.js";

const destinations = [
  { name: "DeepSeek", provider: "deepseek", region: undefined, host: "api.deepseek.com", prefix: "", model: "deepseek-fixture", budget: "max_tokens" },
  { name: "Kimi international", provider: "kimi", region: "international", host: "api.moonshot.ai", prefix: "/v1", model: "kimi-k2.6", budget: "max_completion_tokens" },
  { name: "Kimi mainland", provider: "kimi", region: "mainland", host: "api.moonshot.cn", prefix: "/v1", model: "kimi-k2.6", budget: "max_completion_tokens" },
] as const;
type Destination = typeof destinations[number];
const stores: ReturnType<typeof createLocalTutorSessions>[] = [];
function configuration(destination: Destination, model: string | undefined = destination.model) {
  return { provider: destination.provider, ...(destination.region ? { region: destination.region } : {}),
    ...(model ? { model } : {}), apiKey: `explicit-${destination.name.replaceAll(" ", "-")}-key` };
}
function owned(destination: Destination, kind: "test" | "discover" | "chat" = "test", model: string | undefined = destination.model) {
  const sessions = createLocalTutorSessions(); stores.push(sessions);
  const created = sessions.create("http://127.0.0.1:5173");
  const auth = { sessionId: created.session.sessionId, proof: created.proof, origin: "http://127.0.0.1:5173" };
  const candidateId = sessions.stage(auth, 0, configuration(destination, model)).candidate!.id;
  let generation = 0;
  if (kind === "chat") {
    const test = sessions.begin(auth, { kind: "test", generation, candidateId, requestId: "setup" });
    test.markTested(); test.finish(); generation = sessions.activate(auth, 0, candidateId).generation;
  }
  return { sessions, auth, candidateId, lease: sessions.begin(auth, { kind, generation, candidateId, requestId: "operation" }) };
}
const answer = (content: unknown = "Final answer", finish_reason = "stop", extra = {}) => ({ choices: [
  { finish_reason, message: { role: "assistant", content, reasoning_content: "PRIVATE reasoning", ...extra } },
] });
const prompt = { instructions: "Explain the current computation.", messages: [
  { role: "user" as const, content: "Previous question" }, { role: "assistant" as const, content: "Previous final answer", reasoning_content: "Never replay this" },
  { role: "user" as const, content: "Grounded current context and question" },
] };
afterEach(() => { for (const store of stores.splice(0)) store.dispose(); vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.useRealTimers(); });

describe("DeepSeek and regional Kimi adapters", () => {
  it.each(destinations)("uses $name's budget field and final-text-only history", async destination => {
    const final = '{"message":"A safe answer","chartInstruction":{"type":"none"}}';
    const send = vi.fn<typeof requestProvider>().mockResolvedValue(answer(final, "stop", { tool_calls: [] }));
    expect(await completeWithProvider(owned(destination, "chat").lease, prompt, send)).toBe(final);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][1]).toBe("complete");
    expect(send.mock.calls[0][2]).toEqual({ model: destination.model, stream: false, [destination.budget]: 4096,
      messages: [{ role: "system", content: prompt.instructions }, ...prompt.messages.map(({ role, content }) => ({ role, content }))] });
    expect(JSON.stringify(send.mock.calls[0][2])).not.toMatch(/PRIVATE|reasoning|tools|temperature|response_format|explicit-/);
  });

  it.each(destinations)("tests $name with only a bounded synthetic greeting", async destination => {
    const send = vi.fn<typeof requestProvider>().mockResolvedValue(answer("Hello", "stop", { tool_calls: null }));
    await testProviderConnection(owned(destination).lease, send);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][2]).toMatchObject({ [destination.budget]: 2048, stream: false });
    expect(JSON.stringify(send.mock.calls[0][2])).toContain("short greeting");
    expect(JSON.stringify(send.mock.calls[0][2])).not.toMatch(/Previous|Grounded|explicit-/);
  });

  const failures = [
    { response: answer("partial", "length"), code: "response_incomplete" },
    { response: answer("blocked", "content_filter"), code: "response_refused" },
    { response: answer("blocked", "stop", { refusal: "PRIVATE" }), code: "response_refused" },
    ...["tool_calls", "unexpected", ""].map(reason => ({ response: answer("unfinished", reason), code: "response_invalid" })),
    ...[null, "", "  ", {}, "<think>PRIVATE</think>answer"].map(content => ({ response: answer(content), code: "response_invalid" })),
    ...[[{ name: "ignored" }], {}, ""].map(tool_calls => ({ response: answer("answer", "stop", { tool_calls }), code: "response_invalid" })),
    { response: answer("answer", "stop", { function_call: { name: "ignored" } }), code: "response_invalid" },
    { response: answer("answer", "stop", { role: "user" }), code: "response_invalid" },
    { response: { ...answer(), error: { message: "PRIVATE" } }, code: "response_invalid" },
    { response: { choices: [answer().choices[0], answer().choices[0]] }, code: "response_invalid" },
    { response: null, code: "response_invalid" },
  ];
  it.each(destinations.flatMap(destination => failures.map(failure => ({ ...destination, ...failure }))))("rejects unusable $name output %#", async ({ response, code, ...destination }) => {
    await expect(testProviderConnection(owned(destination).lease, vi.fn().mockResolvedValue(response))).rejects.toMatchObject({ code });
  });

  it.each([
    { reason: "insufficient_system_resource", code: "provider_busy" }, { reason: "aborted", code: "response_incomplete" },
  ])("reports DeepSeek $reason without accepting partial output or retrying", async ({ reason, code }) => {
    const send = vi.fn<typeof requestProvider>().mockResolvedValue(answer("PRIVATE partial", reason));
    await expect(testProviderConnection(owned(destinations[0]).lease, send)).rejects.toMatchObject({ code });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it.each(destinations)("bounds $name and rejects missing explicit credentials with ambient keys seeded", async destination => {
    const send = vi.fn<typeof requestProvider>().mockResolvedValue(answer("x".repeat(PROVIDER_ADAPTER_LIMITS.outputBytes + 1)));
    const { lease } = owned(destination, "chat");
    await expect(completeWithProvider(lease, prompt, send)).rejects.toMatchObject({ code: "response_too_large" });
    send.mockClear();
    await expect(completeWithProvider(lease, { ...prompt, instructions: "x".repeat(PROVIDER_ADAPTER_LIMITS.inputBytes) }, send)).rejects.toMatchObject({ code: "input_too_large" });
    for (const key of ["OPENAI_API_KEY", "DEEPSEEK_API_KEY", "MOONSHOT_API_KEY", "KIMI_API_KEY"]) vi.stubEnv(key, "ambient-secret");
    await expect(completeWithProvider({ ...lease, credential: () => undefined }, prompt, send)).rejects.toMatchObject({ code: "credential_required" });
    await expect(discoverModels({ ...owned(destination, "discover").lease, credential: () => undefined }, send)).rejects.toMatchObject({ code: "credential_required" });
    expect(send).not.toHaveBeenCalled();
  });

  it.each(destinations)("projects $name's bounded catalog without exposing provider metadata", async destination => {
    const send = vi.fn<typeof requestProvider>().mockResolvedValue({ data: [{ id: destination.model, owned_by: "PRIVATE", supports_reasoning: true, context_length: 262144 }] });
    expect(await discoverModels(owned(destination, "discover").lease, send)).toEqual({ models: [{ id: destination.model, availability: "listed" }], hasMore: false });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it.each(destinations)("rejects malformed and oversized $name catalogs", async destination => {
    for (const page of [{ data: null }, { data: [{ id: "../secret" }] }, { data: [{ id: "duplicate" }, { id: "duplicate" }] },
      { error: { message: "PRIVATE" }, data: [] }, { data: Array.from({ length: PROVIDER_ADAPTER_LIMITS.models + 1 }, (_, i) => ({ id: `model-${i}` })) }]) {
      await expect(discoverModels(owned(destination, "discover").lease, vi.fn().mockResolvedValue(page))).rejects.toMatchObject({ code: "response_invalid" });
    }
  });

  it.each(destinations.slice(1))("excludes documented preserved-thinking models for $name before testing or chat", async destination => {
    const unsupported = ["kimi-k3", "kimi-k2.7-code", "kimi-k2.7-code-highspeed"];
    const send = vi.fn<typeof requestProvider>().mockResolvedValue({ data: [...unsupported, "kimi-k2.6"].map(id => ({ id })) });
    expect((await discoverModels(owned(destination, "discover").lease, send)).models).toEqual([
      ...unsupported.map(id => ({ id, availability: "unavailable" })), { id: "kimi-k2.6", availability: "listed" },
    ]);
    send.mockClear();
    for (const model of unsupported) {
      await expect(testProviderConnection(owned(destination, "test", model).lease, send)).rejects.toMatchObject({ code: "model_unsupported" });
      await expect(completeWithProvider(owned(destination, "chat", model).lease, prompt, send)).rejects.toMatchObject({ code: "model_unsupported" });
    }
    expect(send).not.toHaveBeenCalled();
  });
});

describe("cloud compatible protocols through native transport and personal routes", () => {
  function fixture(outcome: number | "timeout", response: unknown = answer()) {
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
        res.statusCode = outcome; res.headers = { "content-type": "application/json", location: "https://unselected.invalid/PRIVATE" }; res.destroy = vi.fn(() => res);
        callback(res); res.emit("data", Buffer.from(JSON.stringify(response))); res.emit("end"); return req;
      }) as typeof req.end;
      return req;
    }) as typeof https.request);
    return calls;
  }

  it.each(destinations)("discovers, tests and activates only $name with header-only authentication", async destination => {
    const calls = fixture(200, { data: [{ id: destination.model }] });
    const { lease, sessions, auth, candidateId } = owned(destination); lease.finish();
    const body = { generation: 0, candidateId, requestId: "route-test" };
    expect((await handlePersonalRequest("discover", auth, body, sessions)).body).toEqual({ models: [{ id: destination.model, availability: "listed" }], hasMore: false });
    expect(calls).toHaveLength(1);
    expect(calls[0].options).toMatchObject({ path: `${destination.prefix}/models`, method: "GET" });
    expect(calls[0].body).toBeUndefined();
    await expect(handlePersonalRequest("activate", auth, { generation: 0, candidateId }, sessions)).rejects.toMatchObject({ code: "connection_unverified" });
    vi.restoreAllMocks();
    const completion = fixture(200);
    await handlePersonalRequest("test", auth, body, sessions);
    expect(completion).toHaveLength(1);
    expect(completion[0].options).toMatchObject({ path: `${destination.prefix}/chat/completions`, method: "POST" });
    expect(JSON.parse(completion[0].body!)).toMatchObject({ model: destination.model, [destination.budget]: 2048 });
    expect((await handlePersonalRequest("activate", auth, { generation: 0, candidateId }, sessions)).body.active).toMatchObject({ provider: destination.provider, ...(destination.region ? { region: destination.region } : {}) });
    for (const call of [...calls, ...completion]) {
      expect(call.options).toMatchObject({ hostname: "8.8.8.8", servername: destination.host, rejectUnauthorized: true, agent: false });
      expect(call.options.headers).toMatchObject({ Host: destination.host, Authorization: `Bearer ${configuration(destination).apiKey}` });
      expect(String(call.options.path) + (call.body ?? "")).not.toMatch(/explicit-|autoload|PRIVATE/);
    }
    expect(dns.lookup).toHaveBeenCalledTimes(1);
    expect(dns.lookup).toHaveBeenCalledWith(destination.host, { all: true, verbatim: true });
  });

  it.each(destinations.flatMap(destination => [302, 401, 403, 429, 500, 503, "timeout"].map(outcome => ({ ...destination, outcome }))))("makes one $name attempt on $outcome without fallback", async ({ outcome, ...destination }) => {
    vi.useFakeTimers(); const calls = fixture(outcome as number | "timeout");
    const { lease, sessions, auth, candidateId } = owned(destination, "chat"); lease.finish();
    const replacement = sessions.stage(auth, 1, configuration(destination)).candidate!.id;
    const pending = handlePersonalRequest("test", auth, { generation: 1, candidateId: replacement, requestId: "failure" }, sessions);
    const result = pending.then(() => ({ code: "unexpected_success" }), error => error);
    if (outcome === "timeout") await vi.advanceTimersByTimeAsync(PROVIDER_TRANSPORT_LIMITS.completeMs);
    expect(await result).toMatchObject({ code: outcome === "timeout" ? "timeout" : outcome === 302 ? "redirect_rejected" : outcome === 401 || outcome === 403 ? "provider_auth" : outcome === 429 ? "provider_busy" : "provider_unavailable" });
    expect(calls).toHaveLength(1);
    expect(calls[0].options.headers).toMatchObject({ Host: destination.host, Authorization: `Bearer ${configuration(destination).apiKey}` });
    expect(sessions.status(auth)).toMatchObject({ generation: 1, active: { model: destination.model }, candidate: { id: replacement, tested: false } });
    expect(replacement).not.toBe(candidateId);
  });

  it.each(destinations)("cancels $name and prevents late success from marking a new candidate tested", async destination => {
    const { lease, sessions, auth } = owned(destination);
    const send = vi.fn<typeof requestProvider>().mockImplementation(async () => {
      sessions.stage(auth, 0, configuration(destination.provider === "kimi" ? destinations.find(other => other.provider === "kimi" && other.region !== destination.region)! : destination, "replacement"));
      return answer();
    });
    await expect(testProviderConnection(lease, send)).rejects.toMatchObject({ code: "request_cancelled" });
    expect(send).toHaveBeenCalledTimes(1); expect(lease.signal.aborted).toBe(true);
    expect(sessions.status(auth).candidate?.tested).toBe(false);
  });
});
