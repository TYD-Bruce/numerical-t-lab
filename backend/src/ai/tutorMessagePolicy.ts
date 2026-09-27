import type { TutorMessage } from "@numerical-t-lab/contracts/tutor";
import { TUTOR_FINAL_TEXT_BYTES, TUTOR_MODEL_DISCOVERY_LIMIT } from "../../../packages/contracts/src/tutor.js";
import { TutorConnectionError } from "../tutorErrors.js";

export const PROVIDER_ADAPTER_LIMITS = Object.freeze({ models: TUTOR_MODEL_DISCOVERY_LIMIT, messages: 40, inputBytes: 32 * 1024, outputBytes: TUTOR_FINAL_TEXT_BYTES });
export const PROVIDER_TRANSPORT_LIMITS = Object.freeze({
  discoverMs: 15_000, completeMs: 90_000, requestBytes: 1024 * 1024, responseBytes: 2 * 1024 * 1024,
});


export interface ProviderPrompt { readonly instructions: string; readonly messages: readonly TutorMessage[] }
type JsonRecord = Record<string, unknown>;
export function responseRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TutorConnectionError("response_invalid");
  return value as JsonRecord;
}

/** Also applies to accepted text after optional model JSON has been decoded. */
export function containsReasoningMarker(value: string): boolean {
  return /<\/?think(?:\s|>)/i.test(value);
}

export function boundedFinalText(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || containsReasoningMarker(value)) throw new TutorConnectionError("response_invalid");
  if (Buffer.byteLength(value) > PROVIDER_ADAPTER_LIMITS.outputBytes) throw new TutorConnectionError("response_too_large");
  return value.trim();
}


export function boundedPrompt(prompt: ProviderPrompt): ProviderPrompt {
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
