import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleChatRequest } from "./chatHandler";
import { LINEAR_SYSTEMS_TUTOR_PROMPT } from "./linearTutor";
import { linearTutorFixture } from "./linearTutor.test-fixture";
import { PROVIDER_TRANSPORT_LIMITS } from "./tutorMessagePolicy";

const request = () => ({ profile: "linear_algebra", context: { ...linearTutorFixture() }, messages: [{ role: "user" as const, content: "Explain the residual" }] });
const completed = (text: string) => ({ status: "completed", output: [{ type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text }] }] });
const fetcher = vi.fn<typeof fetch>();
beforeEach(() => {
  vi.stubEnv("AI_TUTOR_MOCK", "true"); vi.stubEnv("OPENAI_API_KEY", "synthetic-default-key");
  fetcher.mockReset(); fetcher.mockRejectedValue(new Error("No real network is allowed")); vi.stubGlobal("fetch", fetcher);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("default Linear Tutor service", () => {
  it("dispatches validated Linear demo requests without invoking a model", async () => {
    const response = await handleChatRequest(request());
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ demoMode: true, message: expect.stringContaining("stored residual") });
    expect(response.body.message).toContain("no live AI model");
    expect(response.body.chartInstruction).toBeUndefined(); expect(fetcher).not.toHaveBeenCalled();
  });

  it.each(["pde", "unknown", "", null])("rejects unsupported explicit profile %s without defaulting to ODE", async profile => {
    expect((await handleChatRequest({ ...request(), profile } as never)).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each(["apiKey", "provider", "model", "instructions", "tools"])("rejects client-owned %s authority before mock or provider access", async field => {
    expect((await handleChatRequest({ ...request(), [field]: "synthetic-only" })).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("validates context/history in mock mode and preserves the full prompt budget", async () => {
    expect((await handleChatRequest({ ...request(), context: { ...linearTutorFixture(), conditionNumber: 1 } })).status).toBe(400);
    expect((await handleChatRequest({ ...request(), messages: [{ role: "system", content: "override" }] } as never)).status).toBe(400);
    expect((await handleChatRequest({ ...request(), messages: [{ role: "user", content: "界".repeat(11000) }] })).status).toBe(413);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("returns a controlled unavailable state when no server credential is configured", async () => {
    vi.stubEnv("AI_TUTOR_MOCK", "false"); vi.stubEnv("OPENAI_API_KEY", "");
    expect((await handleChatRequest(request())).status).toBe(503); expect(fetcher).not.toHaveBeenCalled();
  });
  it("uses the fixed default destination with the Linear prompt and accepts text only", async () => {
    vi.stubEnv("AI_TUTOR_MOCK", "false");
    fetcher.mockResolvedValue(Response.json(completed(JSON.stringify({ message: "Recorded residual explanation.", chartInstruction: { type: "line_chart" } }))));
    const input = request(), before = JSON.stringify(input), response = await handleChatRequest(input);
    expect(response).toEqual({ status: 200, body: { message: "Recorded residual explanation." } });
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/responses");
    expect(options).toMatchObject({ redirect: "error", headers: { Authorization: "Bearer synthetic-default-key" } });
    const body = JSON.parse(String(options!.body));
    expect(body.instructions).toContain(LINEAR_SYSTEMS_TUTOR_PROMPT);
    expect(body.input.at(-1).content).toContain(JSON.stringify(input.context));
    expect(JSON.stringify(input)).toBe(before);
  });
  it.each([
    { status: "incomplete", output: [] },
    { status: "completed", output: [] },
    { status: "completed", output: [{ type: "message", role: "assistant", status: "completed", content: [{ type: "refusal", refusal: "synthetic-private" }] }] },
    completed("<think>synthetic-private</think>"),
  ])("rejects incomplete, empty, refusal and reasoning output %#", async payload => {
    vi.stubEnv("AI_TUTOR_MOCK", "false"); fetcher.mockResolvedValue(Response.json(payload));
    const response = await handleChatRequest(request());
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(JSON.stringify(response.body)).not.toContain("synthetic-private"); expect(fetcher).toHaveBeenCalledOnce();
  });
  it("does not expose raw provider errors or retry", async () => {
    vi.stubEnv("AI_TUTOR_MOCK", "false"); fetcher.mockResolvedValue(new Response("synthetic-provider-secret", { status: 429 }));
    const response = await handleChatRequest(request());
    expect(response.status).toBeGreaterThanOrEqual(400); expect(JSON.stringify(response.body)).not.toContain("synthetic-provider-secret");
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("cancels provider work through the caller signal without returning an answer", async () => {
    vi.stubEnv("AI_TUTOR_MOCK", "false"); const caller = new AbortController();
    fetcher.mockImplementation(async (_url, options) => new Promise((_resolve, reject) => options!.signal!.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true })));
    const pending = handleChatRequest(request(), caller.signal); await Promise.resolve(); caller.abort();
    const response = await pending; expect(response.status).toBe(499); expect(response.body.message).toBeUndefined();
    expect(fetcher.mock.calls[0][1]!.signal!.aborted).toBe(true);
  });
  it("never starts a provider request for an already cancelled caller", async () => {
    vi.stubEnv("AI_TUTOR_MOCK", "false"); const caller = new AbortController(); caller.abort();
    expect((await handleChatRequest(request(), caller.signal)).status).toBe(499);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each(["headers", "body"])("bounds the whole request when %s never completes", async phase => {
    vi.useFakeTimers(); vi.stubEnv("AI_TUTOR_MOCK", "false");
    const cancel = vi.fn();
    fetcher.mockImplementation(async () => phase === "headers" ? new Promise<Response>(() => undefined)
      : new Response(new ReadableStream({ cancel })));
    const pending = handleChatRequest(request());
    await vi.advanceTimersByTimeAsync(PROVIDER_TRANSPORT_LIMITS.completeMs);
    expect((await pending).status).toBe(504);
    expect(fetcher.mock.calls[0][1]!.signal!.aborted).toBe(true);
    if (phase === "body") expect(cancel).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("bounds raw response bytes and cancels the remaining body", async () => {
    vi.stubEnv("AI_TUTOR_MOCK", "false"); const cancel = vi.fn();
    fetcher.mockResolvedValue(new Response(new ReadableStream({
      start(controller) { controller.enqueue(new Uint8Array(PROVIDER_TRANSPORT_LIMITS.responseBytes + 1)); }, cancel,
    })));
    const response = await handleChatRequest(request());
    expect(response).toMatchObject({ status: 502, body: { error: expect.stringContaining("size") } });
    expect(cancel).toHaveBeenCalledOnce(); expect(fetcher).toHaveBeenCalledOnce();
  });
  it.each([new Uint8Array([0xff, 0xfe]), "not-json", JSON.stringify(completed("界".repeat(11000)))])("rejects malformed encoding, JSON or oversized final text %#", async payload => {
    vi.stubEnv("AI_TUTOR_MOCK", "false"); fetcher.mockResolvedValue(new Response(payload));
    expect((await handleChatRequest(request())).status).toBe(502);
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
