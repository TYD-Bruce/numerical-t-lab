import type { TutorMessage, TutorModelCandidate, TutorModelDiscovery, TutorProvider } from "@numerical-t-lab/contracts/tutor";
import type { LocalTutorLease } from "../../localTutorSession.js";
import { PROVIDER_MODEL_LIMIT, requireSelectedModel, TutorConnectionError, validateModelId } from "../../localTutorPolicy.js";
import { requestProvider } from "./providerTransport.js";

export const SUPPORTED_TUTOR_PROVIDERS: readonly TutorProvider[] = Object.freeze(["local", "openai", "anthropic", "gemini"]);
export const PROVIDER_ADAPTER_LIMITS = Object.freeze({ models: PROVIDER_MODEL_LIMIT, messages: 40, inputBytes: 32 * 1024, outputBytes: 32 * 1024 });
export interface ProviderPrompt { readonly instructions: string; readonly messages: readonly TutorMessage[] }
type Send = typeof requestProvider;
type JsonRecord = Record<string, unknown>;
function record(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TutorConnectionError("response_invalid");
  return value as JsonRecord;
}
function eligible(lease: LocalTutorLease): void {
  lease.assertCurrent();
  if (!SUPPORTED_TUTOR_PROVIDERS.includes(lease.connection.provider)) throw new TutorConnectionError("provider_unsupported");
  if (lease.connection.provider !== "local" && !lease.credential()) throw new TutorConnectionError("credential_required");
}

function modelList(value: unknown, provider: TutorProvider): TutorModelCandidate[] {
  const response = record(value);
  if (response.error != null) throw new TutorConnectionError("response_invalid");
  // An empty protobuf repeated field may be omitted in Gemini JSON.
  const data = provider === "gemini" ? (response.models === undefined ? [] : response.models) : response.data;
  if (!Array.isArray(data) || data.length > PROVIDER_ADAPTER_LIMITS.models) throw new TutorConnectionError("response_invalid");
  const seen = new Set<string>();
  return data.map(item => {
    const model = record(item);
    let id: string;
    try { id = validateModelId(provider === "gemini" ? model.name : model.id, provider); }
    catch { throw new TutorConnectionError("response_invalid"); }
    if (seen.has(id)) throw new TutorConnectionError("response_invalid");
    seen.add(id);
    let availability: TutorModelCandidate["availability"] = "listed";
    if (provider === "gemini" && model.supportedGenerationMethods !== undefined) {
      const methods = model.supportedGenerationMethods;
      if (!Array.isArray(methods) || methods.some(method => typeof method !== "string")) throw new TutorConnectionError("response_invalid");
      if (!methods.includes("generateContent")) availability = "unavailable";
    }
    if (provider === "local" && model.status !== undefined) {
      const status = record(model.status);
      availability = status.failed === true ? "unavailable" : status.value === "loaded" ? "loaded"
        : status.value === "loading" ? "loading" : status.value === "unloaded" ? "unloaded" : "unavailable";
    }
    // Reliable explicit modality metadata can exclude non-text models. Other
    // providers' bare IDs remain candidates, never assumed chat capabilities.
    if (provider === "local" && model.architecture !== undefined) {
      const architecture = record(model.architecture);
      for (const key of ["input_modalities", "output_modalities"]) {
        const modes = architecture[key];
        if (modes !== undefined && (!Array.isArray(modes) || !modes.includes("text"))) availability = "unavailable";
      }
    }
    return { id, availability };
  });
}

export async function discoverModels(lease: LocalTutorLease, send: Send = requestProvider): Promise<TutorModelDiscovery> {
  eligible(lease);
  if (lease.kind !== "discover") throw new TutorConnectionError("invalid_configuration");
  const response = await send(lease, "discover");
  lease.assertCurrent();
  const provider = lease.connection.provider, page = record(response);
  let hasMore = false;
  if (provider === "anthropic") {
    if (typeof page.has_more !== "boolean") throw new TutorConnectionError("response_invalid");
    hasMore = page.has_more;
  } else if (provider === "gemini" && page.nextPageToken !== undefined) {
    if (typeof page.nextPageToken !== "string") throw new TutorConnectionError("response_invalid");
    hasMore = page.nextPageToken.length > 0;
  }
  // Never follow or expose pagination cursors. Discovery is one explicit request.
  return { models: modelList(response, provider), hasMore };
}

async function localReadiness(lease: LocalTutorLease, send: Send): Promise<void> {
  let response: unknown;
  try { response = await send(lease, "readiness"); }
  catch (error) {
    lease.assertCurrent();
    // Some compatible servers do not implement /models. Exact manual IDs are
    // still usable there; never mask auth, network, malformed or redirect errors.
    if (error instanceof TutorConnectionError && error.code === "discovery_unsupported") return;
    throw error;
  }
  lease.assertCurrent();
  const selected = modelList(response, "local").find(model => model.id === lease.connection.model);
  if (!selected || (selected.availability !== "loaded" && selected.availability !== "listed")) throw new TutorConnectionError("model_unavailable");
}

function boundedText(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || /<\/?think(?:\s|>)/i.test(value)) throw new TutorConnectionError("response_invalid");
  if (Buffer.byteLength(value) > PROVIDER_ADAPTER_LIMITS.outputBytes) throw new TutorConnectionError("response_too_large");
  return value.trim();
}

function localFinal(value: unknown): string {
  const choices = record(value).choices;
  if (!Array.isArray(choices) || choices.length !== 1) throw new TutorConnectionError("response_invalid");
  const choice = record(choices[0]);
  const message = record(choice.message);
  if (message.refusal || choice.finish_reason === "content_filter") throw new TutorConnectionError("response_refused");
  if (choice.finish_reason === "length") throw new TutorConnectionError("response_incomplete");
  const toolCalls = message.tool_calls;
  if (choice.finish_reason !== "stop" || message.role !== "assistant" ||
    (toolCalls != null && (!Array.isArray(toolCalls) || toolCalls.length > 0)) || message.function_call) throw new TutorConnectionError("response_invalid");
  // reasoning_content, reasoning and every other field are deliberately ignored.
  return boundedText(message.content);
}

function openaiFinal(value: unknown): string {
  const response = record(value);
  if (response.incomplete_details && record(response.incomplete_details).reason === "content_filter") throw new TutorConnectionError("response_refused");
  if (response.status === "incomplete") throw new TutorConnectionError("response_incomplete");
  if (response.status !== "completed" || response.error || response.incomplete_details || !Array.isArray(response.output)) throw new TutorConnectionError("response_invalid");
  const parts: string[] = [];
  for (const raw of response.output) {
    const item = record(raw);
    if (item.type !== "message") continue;
    if (item.phase === "commentary") continue;
    if (item.role !== "assistant" || item.status !== "completed" ||
      (item.phase != null && item.phase !== "final_answer") || !Array.isArray(item.content)) throw new TutorConnectionError("response_invalid");
    for (const rawPart of item.content) {
      const part = record(rawPart);
      if (part.type === "refusal") throw new TutorConnectionError("response_refused");
      if (part.type !== "output_text" || typeof part.text !== "string") throw new TutorConnectionError("response_invalid");
      parts.push(part.text);
    }
  }
  return boundedText(parts.join("\n"));
}

function anthropicFinal(value: unknown): string {
  const response = record(value);
  if (response.stop_reason === "refusal" ||
    (response.stop_details != null && record(response.stop_details).type === "refusal")) throw new TutorConnectionError("response_refused");
  if (["max_tokens", "model_context_window_exceeded"].includes(response.stop_reason as string)) throw new TutorConnectionError("response_incomplete");
  if (response.type !== "message" || response.role !== "assistant" || response.stop_reason !== "end_turn" ||
    response.stop_details != null || !Array.isArray(response.content)) throw new TutorConnectionError("response_invalid");
  const parts: string[] = [];
  for (const raw of response.content) {
    const part = record(raw);
    if (part.type === "thinking" || part.type === "redacted_thinking") continue;
    if (part.type !== "text" || typeof part.text !== "string") throw new TutorConnectionError("response_invalid");
    parts.push(part.text);
  }
  return boundedText(parts.join(""));
}

function geminiFinal(value: unknown): string {
  const response = record(value);
  if (response.promptFeedback !== undefined) {
    const feedback = record(response.promptFeedback);
    if (feedback.blockReason !== undefined && feedback.blockReason !== "BLOCK_REASON_UNSPECIFIED") throw new TutorConnectionError("response_refused");
  }
  if (response.error || !Array.isArray(response.candidates) || response.candidates.length !== 1) throw new TutorConnectionError("response_invalid");
  const candidate = record(response.candidates[0]);
  if (candidate.finishReason === "MAX_TOKENS") throw new TutorConnectionError("response_incomplete");
  if (["SAFETY", "RECITATION", "BLOCKLIST", "PROHIBITED_CONTENT", "SPII", "IMAGE_SAFETY"].includes(candidate.finishReason as string)) throw new TutorConnectionError("response_refused");
  if (candidate.finishReason !== "STOP") throw new TutorConnectionError("response_invalid");
  const content = record(candidate.content);
  if ((content.role !== undefined && content.role !== "model") || !Array.isArray(content.parts)) throw new TutorConnectionError("response_invalid");
  const parts: string[] = [];
  for (const raw of content.parts) {
    const part = record(raw);
    if (part.thought !== undefined && typeof part.thought !== "boolean") throw new TutorConnectionError("response_invalid");
    if (part.thought === true) continue;
    if (typeof part.text !== "string") throw new TutorConnectionError("response_invalid");
    parts.push(part.text);
  }
  return boundedText(parts.join(""));
}

function boundedPrompt(prompt: ProviderPrompt): ProviderPrompt {
  if (!prompt || typeof prompt.instructions !== "string" || !prompt.instructions.trim() ||
    !Array.isArray(prompt.messages) || !prompt.messages.length || prompt.messages.length > PROVIDER_ADAPTER_LIMITS.messages ||
    prompt.messages.at(-1)?.role !== "user") throw new TutorConnectionError("invalid_configuration");
  const messages = prompt.messages.map(message => {
    if (!message || !["user", "assistant"].includes(message.role) || typeof message.content !== "string" || !message.content.trim()) throw new TutorConnectionError("invalid_configuration");
    return { role: message.role, content: message.content };
  });
  const captured = { instructions: prompt.instructions, messages };
  // A conservative byte ceiling, not a tokenizer or a promise that every model
  // has this much context. Never truncate the caller's numerical evidence.
  if (Buffer.byteLength(JSON.stringify(captured)) > PROVIDER_ADAPTER_LIMITS.inputBytes) throw new TutorConnectionError("input_too_large");
  return captured;
}

async function complete(lease: LocalTutorLease, prompt: ProviderPrompt, testing: boolean, send: Send): Promise<string> {
  eligible(lease);
  const model = requireSelectedModel(lease.connection);
  const captured = boundedPrompt(prompt);
  const local = lease.connection.provider === "local";
  if (local) await localReadiness(lease, send);
  lease.assertCurrent();
  const provider = lease.connection.provider;
  const body = local ? {
    model, stream: false, max_tokens: testing ? 1024 : 4096,
    messages: [{ role: "system", content: captured.instructions }, ...captured.messages],
  } : provider === "openai" ? {
    model, stream: false, store: false, max_output_tokens: testing ? 2048 : 4096,
    instructions: captured.instructions,
    // The Tutor retains final answers only, including explicitly transferred
    // history; never present those turns as reasoning or intermediate commentary.
    input: captured.messages.map(message => message.role === "assistant" ? { ...message, phase: "final_answer" } : message),
  } : provider === "anthropic" ? {
    model, stream: false, max_tokens: testing ? 2048 : 4096,
    system: captured.instructions, messages: captured.messages,
  } : {
    systemInstruction: { parts: [{ text: captured.instructions }] },
    contents: captured.messages.map(message => ({ role: message.role === "assistant" ? "model" : "user", parts: [{ text: message.content }] })),
    generationConfig: { maxOutputTokens: testing ? 2048 : 4096, candidateCount: 1 },
  };
  const response = await send(lease, "complete", body);
  lease.assertCurrent();
  return local ? localFinal(response) : provider === "openai" ? openaiFinal(response)
    : provider === "anthropic" ? anthropicFinal(response) : geminiFinal(response);
}

export async function testProviderConnection(lease: LocalTutorLease, send: Send = requestProvider): Promise<void> {
  if (lease.kind !== "test") throw new TutorConnectionError("invalid_configuration");
  await complete(lease, { instructions: "Answer briefly in plain English. Do not use tools.",
    messages: [{ role: "user", content: "Reply with a short greeting to confirm this connection." }] }, true, send);
}

/** Backend-only port for the subsequent profile-aware Tutor handler. */
export function completeWithProvider(lease: LocalTutorLease, prompt: ProviderPrompt, send: Send = requestProvider): Promise<string> {
  if (lease.kind !== "chat") return Promise.reject(new TutorConnectionError("invalid_configuration"));
  return complete(lease, prompt, false, send);
}
