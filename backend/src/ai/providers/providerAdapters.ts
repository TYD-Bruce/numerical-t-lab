import type { TutorMessage, TutorModelCandidate, TutorProvider } from "@numerical-t-lab/contracts/tutor";
import type { LocalTutorLease } from "../../localTutorSession.js";
import { requireSelectedModel, TutorConnectionError, validateModelId } from "../../localTutorPolicy.js";
import { requestProvider } from "./providerTransport.js";

export const SUPPORTED_TUTOR_PROVIDERS: readonly TutorProvider[] = Object.freeze(["local", "openai"]);
export const PROVIDER_ADAPTER_LIMITS = Object.freeze({ models: 256, messages: 40, inputBytes: 32 * 1024, outputBytes: 32 * 1024 });
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
  const data = record(value).data;
  if (!Array.isArray(data) || data.length > PROVIDER_ADAPTER_LIMITS.models) throw new TutorConnectionError("response_invalid");
  const seen = new Set<string>();
  return data.map(item => {
    const model = record(item);
    let id: string;
    try { id = validateModelId(model.id, provider); }
    catch { throw new TutorConnectionError("response_invalid"); }
    if (seen.has(id)) throw new TutorConnectionError("response_invalid");
    seen.add(id);
    let availability: TutorModelCandidate["availability"] = "listed";
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

export async function discoverModels(lease: LocalTutorLease, send: Send = requestProvider): Promise<TutorModelCandidate[]> {
  eligible(lease);
  if (lease.kind !== "discover") throw new TutorConnectionError("invalid_configuration");
  const response = await send(lease, "discover");
  lease.assertCurrent();
  return modelList(response, lease.connection.provider);
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
  const body = local ? {
    model, stream: false, max_tokens: testing ? 1024 : 4096,
    messages: [{ role: "system", content: captured.instructions }, ...captured.messages],
  } : {
    model, stream: false, store: false, max_output_tokens: testing ? 2048 : 4096,
    instructions: captured.instructions,
    // The Tutor retains final answers only, including explicitly transferred
    // history; never present those turns as reasoning or intermediate commentary.
    input: captured.messages.map(message => message.role === "assistant" ? { ...message, phase: "final_answer" } : message),
  };
  const response = await send(lease, "complete", body);
  lease.assertCurrent();
  return local ? localFinal(response) : openaiFinal(response);
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
