// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LabTutorBinding, LabTutorContext } from "../app/contracts";
import { createAppSessionStore } from "../app/appSessionStore";
import { mountPlatformTutorPanel } from "./platformTutorPanel";
import { appendTutorMessage, clearTutorConversation, updateTutorDraft } from "./moduleTutorSession";
import { sendTutorMessage } from "./tutorClient";

const mounts: ReturnType<typeof mountPlatformTutorPanel>[] = [];
const ownedContext = { evidence: "Lab-authored payload, deliberately opaque to the panel" };
function fixture(initial: LabTutorContext<object> = { status: "ready", revision: 0, context: ownedContext }) {
  let snapshot = initial;
  const target = document.createElement("div"); document.body.append(target);
  const store = createAppSessionStore();
  const chart = vi.fn();
  let resolve!: (value: { message: string; chartInstruction?: { type: "zoom_range"; tMin: number } }) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<{ message: string }>((done, fail) => { resolve = done; reject = fail; });
  const send = vi.fn(() => promise);
  const binding: LabTutorBinding<object> = { moduleId: "ode", promptProfile: "ode", suggestedQuestions: ["Explain this result"],
    description: "Lab-owned <img> description", getContext: () => snapshot, applyChartInstruction: chart };
  const mount = mountPlatformTutorPanel(target, { binding, sessionAccess: store.createTutorSessionAccess("ode"), onClose: vi.fn(), isCurrent: () => true, sendMessage: send });
  mounts.push(mount);
  const input = target.querySelector<HTMLTextAreaElement>("textarea")!;
  function submit(value = "Question") { input.value = value; target.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); }
  return { target, store, chart, send, binding, mount, input, submit, resolve, reject, promise, setContext: (next: LabTutorContext<object>) => { snapshot = next; } };
}
afterEach(() => { for (const mount of mounts.splice(0)) mount.dispose(); document.body.replaceChildren(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("Lab-owned context in the shared Tutor panel", () => {
  it("sends opaque Lab data and copy without interpreting ODE source fields", async () => {
    const f = fixture(); f.submit();
    expect(f.send).toHaveBeenCalledTimes(1);
    expect(f.send.mock.calls[0]).toEqual([{ context: ownedContext, messages: [{ role: "user", content: "Question" }] }, expect.any(AbortSignal), "ode"]);
    expect(f.target.querySelector(".ai-tutor-sub")?.textContent).toBe("Lab-owned <img> description");
    expect(f.target.querySelector("img")).toBeNull();
    f.resolve({ message: "Answer" }); await f.promise; await Promise.resolve();
    expect(f.store.getTutor("ode").items).toHaveLength(2);
  });

  it("does not append or send while unavailable, then enables the same mounted composer", async () => {
    const f = fixture({ status: "unavailable", revision: 0, message: "Compute a current result first." });
    expect(f.input.disabled).toBe(true);
    expect(f.target.querySelector(".ai-tutor-disabled")?.textContent).toBe("Compute a current result first.");
    f.submit(); expect(f.send).not.toHaveBeenCalled(); expect(f.store.getTutor("ode").items).toHaveLength(0);
    f.store.updateTutor("ode", session => updateTutorDraft(session, "Keep my draft"));
    f.setContext({ status: "ready", revision: 1, context: ownedContext }); f.mount.refresh?.();
    expect(f.input.disabled).toBe(false); expect(f.input.value).toBe("Keep my draft");
    f.submit(); f.resolve({ message: "Ready answer" }); await f.promise; await Promise.resolve();
    expect(f.store.getTutor("ode").items).toHaveLength(2);
  });

  it.each([true, false])("rejects stale success/chart when context changes, refresh=%s", async refresh => {
    const f = fixture(); f.submit();
    const signal = (f.send.mock.calls[0] as unknown as [unknown, AbortSignal])[1];
    f.setContext({ status: "unavailable", revision: 1, message: "The result changed." });
    if (refresh) { f.mount.refresh?.(); expect(signal.aborted).toBe(true); }
    f.resolve({ message: "Stale answer", chartInstruction: { type: "zoom_range", tMin: 0 } }); await f.promise; await Promise.resolve();
    expect(f.store.getTutor("ode").items).toHaveLength(1); expect(f.chart).not.toHaveBeenCalled();
    expect(f.input.disabled).toBe(true); expect(f.target.querySelector(".ai-loading")).toBeNull();
  });

  it("rejects a late error when context changes without a notification", async () => {
    const f = fixture(); f.submit();
    f.setContext({ status: "ready", revision: 1, context: { evidence: "New result" } });
    f.reject(new Error("PRIVATE provider body")); await f.promise.catch(() => undefined); await Promise.resolve();
    expect((f.target.querySelector(".ai-error") as HTMLElement).hidden).toBe(true);
    expect(f.target.textContent).not.toContain("PRIVATE"); expect(f.store.getTutor("ode").items).toHaveLength(1);
  });

  it("does not send if publishing the user message synchronously changes the Lab context", () => {
    const f = fixture();
    const unsubscribe = f.store.subscribe(() => f.setContext({ status: "unavailable", revision: 1, message: "Result changed." }));
    f.submit();
    expect(f.send).not.toHaveBeenCalled();
    expect(f.input.disabled).toBe(true);
    expect(f.target.querySelector(".ai-send")?.textContent).toBe("Send");
    unsubscribe();
  });

  it("does not send if publishing the user message synchronously clears its transcript", () => {
    const f = fixture();
    const unsubscribe = f.store.subscribe(() => {
      if (f.store.getTutor("ode").items.length) f.store.updateTutor("ode", clearTutorConversation);
    });
    f.submit();
    expect(f.send).not.toHaveBeenCalled();
    expect(f.store.getTutor("ode").items).toHaveLength(0);
    expect(f.input.disabled).toBe(false);
    unsubscribe();
  });

  it("rejects an old response after an independent transcript change", async () => {
    const f = fixture(); f.submit();
    f.store.updateTutor("ode", session => appendTutorMessage(session, "user", "A newer message"));
    f.resolve({ message: "Stale answer", chartInstruction: { type: "zoom_range", tMin: 0 } }); await f.promise; await Promise.resolve();
    expect(f.store.getTutor("ode").items).toHaveLength(2); expect(f.chart).not.toHaveBeenCalled();
  });

  it("does not invalidate an answer for a draft-only change", async () => {
    const f = fixture(); f.submit();
    f.store.updateTutor("ode", session => updateTutorDraft(session, "Next question"));
    f.resolve({ message: "Current answer" }); await f.promise; await Promise.resolve();
    expect(f.store.getTutor("ode").items).toHaveLength(2); expect(f.store.getTutor("ode").draftMessage).toBe("Next question");
  });

  it("does not apply a chart instruction if accepting the answer synchronously resets the transcript", async () => {
    const f = fixture(); f.submit();
    const unsubscribe = f.store.subscribe(() => {
      if (f.store.getTutor("ode").items.some(item => item.kind === "message" && item.role === "assistant")) {
        f.store.updateTutor("ode", clearTutorConversation);
      }
    });
    f.resolve({ message: "Answer", chartInstruction: { type: "zoom_range", tMin: 0 } }); await f.promise; await Promise.resolve();
    expect(f.store.getTutor("ode").items).toHaveLength(0);
    expect(f.chart).not.toHaveBeenCalled();
    expect(document.activeElement).not.toBe(f.input);
    unsubscribe();
  });

  it("clears a pending conversation without leaving a busy composer or appending the old error", async () => {
    const f = fixture(); f.submit();
    f.target.querySelector<HTMLButtonElement>(".ai-clear")!.click();
    expect(f.input.disabled).toBe(false);
    f.reject(new Error("Old failure")); await f.promise.catch(() => undefined); await Promise.resolve();
    expect(f.store.getTutor("ode").items).toHaveLength(0);
    expect((f.target.querySelector(".ai-error") as HTMLElement).hidden).toBe(true);
  });

  it.each(["pde"] as const)("keeps unsupported %s profiles away from the default API", async profile => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    await expect(sendTutorMessage({ context: ownedContext, messages: [{ role: "user", content: "Question" }] }, undefined, profile)).rejects.toThrow(/unavailable/i);
    expect(fetch).not.toHaveBeenCalled();
  });
});
