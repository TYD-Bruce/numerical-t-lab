import { responseRecord as record, boundedFinalText as boundedText } from "../tutorMessagePolicy.js";
import { TutorConnectionError } from "../../tutorErrors.js";

export function openaiFinal(value: unknown): string {
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
