import type { LinearSystemsLabContext, TutorMessage } from "@numerical-t-lab/contracts/tutor";
import type { ChatHandlerResult } from "./chatHandler.js";
import { TutorConnectionError } from "../tutorErrors.js";
import { buildLinearTutorDemoResponse } from "./linearTutor.js";
import { prepareTutorPrompt, normalizePersonalTutorResponse } from "./personalTutorChat.js";
import { openaiFinal } from "./providers/openaiFinal.js";
import { PROVIDER_TRANSPORT_LIMITS, type ProviderPrompt } from "./tutorMessagePolicy.js";

/** Default service has a server-owned destination and credential, never browser configuration. */
async function completeDefault(prompt: ProviderPrompt, apiKey: string, caller?: AbortSignal): Promise<string> {
  const controller = new AbortController();
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let rejectStopped!: (error: TutorConnectionError) => void;
  const stopped = new Promise<never>((_resolve, reject) => { rejectStopped = reject; });
  const stop = (code: "request_cancelled" | "timeout") => {
    rejectStopped(new TutorConnectionError(code));
    controller.abort();
    void reader?.cancel().catch(() => undefined);
  };
  const onAbort = () => stop("request_cancelled");
  caller?.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(() => stop("timeout"), PROVIDER_TRANSPORT_LIMITS.completeMs);
  timer.unref?.();
  try {
    if (caller?.aborted) throw new TutorConnectionError("request_cancelled");
    const response = await Promise.race([stopped, fetch("https://api.openai.com/v1/responses", {
      method: "POST", redirect: "error", signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-4o-mini", instructions: prompt.instructions, input: prompt.messages,
        store: false, stream: false, text: { format: { type: "json_object" } }, max_output_tokens: 4096 }),
    })]);
    if (!response.ok) throw new TutorConnectionError(response.status === 429 ? "provider_busy" : "provider_unavailable");
    if (!response.body) throw new TutorConnectionError("response_invalid");
    reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8", { fatal: true });
    let bytes = 0, text = "";
    for (;;) {
      const part = await Promise.race([stopped, reader.read()]);
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > PROVIDER_TRANSPORT_LIMITS.responseBytes) throw new TutorConnectionError("response_too_large");
      text += decoder.decode(part.value, { stream: true });
    }
    text += decoder.decode();
    if (controller.signal.aborted) await stopped;
    let data: unknown;
    try { data = JSON.parse(text); } catch { throw new TutorConnectionError("response_invalid"); }
    return openaiFinal(data);
  } finally {
    clearTimeout(timer);
    caller?.removeEventListener("abort", onAbort);
    controller.abort();
    void reader?.cancel().catch(() => undefined);
  }
}

export async function handleLinearTutorRequest(value: unknown, options: {
  readonly mockMode: boolean; readonly apiKey?: string; readonly signal?: AbortSignal;
}): Promise<ChatHandlerResult> {
  try {
    if (!value || typeof value !== "object" || Array.isArray(value) ||
      (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) throw new TutorConnectionError("invalid_chat_request");
    const body = value as Record<string, unknown>;
    if (body.profile !== "linear_algebra" || Object.keys(body).length !== 3 ||
      !["profile", "messages", "context"].every(key => Object.hasOwn(body, key))) throw new TutorConnectionError("invalid_chat_request");
    const prompt = prepareTutorPrompt("linear_algebra", body.messages, body.context);
    if (options.signal?.aborted) throw new TutorConnectionError("request_cancelled");
    if (options.mockMode) {
      const reply = buildLinearTutorDemoResponse(body.context as LinearSystemsLabContext, (body.messages as TutorMessage[]).at(-1)!.content);
      return { status: 200, body: { ...reply } };
    }
    if (!options.apiKey) return { status: 503, body: { error: "AI Tutor is temporarily unavailable. Please try again later." } };
    const text = await completeDefault(prompt, options.apiKey, options.signal);
    if (options.signal?.aborted) throw new TutorConnectionError("request_cancelled");
    return { status: 200, body: { ...normalizePersonalTutorResponse(text, "linear_algebra") } };
  } catch (error) {
    const safe = error instanceof TutorConnectionError ? error : new TutorConnectionError("provider_unavailable");
    return { status: safe.code === "request_cancelled" ? 499 : safe.status, body: { error: safe.message } };
  }
}
