import { afterEach, describe, expect, it, vi } from "vitest";
import { PUBLIC_TUTOR_UNAVAILABLE_MESSAGE, sendTutorMessage } from "./tutorClient";

afterEach(() => vi.unstubAllGlobals());
describe("profile-aware default Tutor client", () => {
  it("preserves the legacy ODE envelope and explicitly selects the Linear profile", async () => {
    const fetcher = vi.fn(async () => Response.json({ message: "Answer", demoMode: true, chartInstruction: { type: "line_chart" } }));
    vi.stubGlobal("fetch", fetcher);
    const request = { messages: [{ role: "user" as const, content: "Question" }], context: { evidence: "opaque" } };
    await sendTutorMessage(request);
    expect(JSON.parse(String((fetcher.mock.calls[0] as unknown as [string, RequestInit])[1].body))).toEqual(request);
    expect(await sendTutorMessage(request, undefined, "linear_algebra")).toEqual({ message: "Answer", demoMode: true });
    expect(JSON.parse(String((fetcher.mock.calls[1] as unknown as [string, RequestInit])[1].body))).toEqual({ ...request, profile: "linear_algebra" });
  });
  it("still blocks unsupported profiles before fetching", async () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    await expect(sendTutorMessage({ messages: [], context: {} }, undefined, "pde")).rejects.toThrow(PUBLIC_TUTOR_UNAVAILABLE_MESSAGE);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each(["", " ", null, 10])("rejects malformed Linear final text %#", async message => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ message })));
    await expect(sendTutorMessage({ messages: [], context: {} }, undefined, "linear_algebra")).rejects.toThrow();
  });
});
