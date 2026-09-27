import type { ChatRequest, ChatResponse } from "@numerical-t-lab/contracts/tutor";
import type { TutorPromptProfile } from "../app/contracts";
import { TUTOR_FINAL_TEXT_BYTES } from "@numerical-t-lab/contracts/tutor";
import { readReply, record } from "./tutorConnectionProtocol";

export const PUBLIC_TUTOR_UNAVAILABLE_MESSAGE =
  "AI Tutor is temporarily unavailable. Please try again later.";

export async function sendTutorMessage(
  request: ChatRequest<object>,
  signal?: AbortSignal,
  profile: TutorPromptProfile = "ode"
): Promise<ChatResponse> {
  if (profile !== "ode" && profile !== "linear_algebra") throw new Error(PUBLIC_TUTOR_UNAVAILABLE_MESSAGE);
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile === "ode" ? request : { ...request, profile }),
    signal,
  });
  if (!response.ok) {
    throw new Error(PUBLIC_TUTOR_UNAVAILABLE_MESSAGE);
  }
  if (profile === "linear_algebra") {
    const data = record(await readReply(response, () => signal?.throwIfAborted()));
    if (typeof data.message !== "string" || !data.message.trim() ||
      new TextEncoder().encode(data.message).length > TUTOR_FINAL_TEXT_BYTES) throw new Error("Invalid response from tutor API.");
    return { message: data.message, ...(typeof data.demoMode === "boolean" ? { demoMode: data.demoMode } : {}) };
  }
  const data = (await response.json()) as ChatResponse;
  if (typeof data.message !== "string") {
    throw new Error("Invalid response from tutor API.");
  }
  return data;
}
