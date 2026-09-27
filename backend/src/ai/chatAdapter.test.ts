import { beforeEach, describe, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";

const { handleChatRequest } = vi.hoisted(() => ({
  handleChatRequest: vi.fn(),
}));

vi.mock("./chatHandler.js", () => ({
  handleChatRequest,
}));

import handler from "../../../api/chat.js";

function responseDouble() {
  const response = Object.assign(new EventEmitter(), {
    setHeader: vi.fn(),
    status: vi.fn(),
    json: vi.fn(),
    destroyed: false,
    writableEnded: false,
  });
  response.status.mockReturnValue(response);
  return response;
}

describe("Vercel chat adapter", () => {
  beforeEach(() => {
    handleChatRequest.mockReset();
  });

  it("preserves the POST-only deployment boundary", async () => {
    const response = responseDouble();

    await handler({ method: "GET" } as never, response as never);

    expect(response.setHeader).toHaveBeenCalledWith("Allow", "POST");
    expect(response.status).toHaveBeenCalledWith(405);
    expect(response.json).toHaveBeenCalledWith({ error: "Method not allowed" });
    expect(handleChatRequest).not.toHaveBeenCalled();
  });

  it("forwards the backend status and body without reinterpretation", async () => {
    const requestBody = { messages: [], context: {} };
    const responseBody = { error: "messages array is required." };
    handleChatRequest.mockResolvedValue({ status: 400, body: responseBody });
    const response = responseDouble();

    await handler(
      Object.assign(new EventEmitter(), { method: "POST", body: requestBody }) as never,
      response as never,
    );

    expect(handleChatRequest).toHaveBeenCalledWith(requestBody, expect.any(AbortSignal));
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(responseBody);
    expect(response.listenerCount("close")).toBe(0);
  });

  it.each(["aborted", "close"])("cancels on %s and removes transport listeners", async event => {
    const request = Object.assign(new EventEmitter(), { method: "POST", body: {} });
    const response = responseDouble();
    let signal: AbortSignal | undefined;
    handleChatRequest.mockImplementation(async (_body, caller: AbortSignal) => {
      signal = caller;
      await new Promise<void>(resolve => caller.addEventListener("abort", () => resolve(), { once: true }));
      return { status: 499, body: { error: "cancelled" } };
    });
    const pending = handler(request as never, response as never);
    response.destroyed = true;
    (event === "aborted" ? request : response).emit(event);
    await pending;
    expect(signal?.aborted).toBe(true); expect(response.json).not.toHaveBeenCalled();
    expect(request.listenerCount("aborted")).toBe(0); expect(response.listenerCount("close")).toBe(0);
  });
});
