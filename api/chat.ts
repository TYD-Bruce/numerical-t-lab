import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  handleChatRequest,
  type ChatHandlerBody,
} from "../backend/src/ai/chatHandler.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const caller = new AbortController();
  const abort = () => caller.abort();
  const close = () => { if (!res.writableEnded) abort(); };
  req.once("aborted", abort);
  res.once("close", close);
  try {
    if (req.aborted || res.destroyed) return;
    const result = await handleChatRequest(req.body as ChatHandlerBody, caller.signal);
    if (!res.destroyed) res.status(result.status).json(result.body);
  } finally {
    req.off("aborted", abort);
    res.off("close", close);
  }
}
