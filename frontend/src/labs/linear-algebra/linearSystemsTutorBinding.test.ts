import { afterEach, describe, expect, it, vi } from "vitest";
import { createLinearSystemsTutorBinding } from "./linearSystemsTutorBinding";
import * as projection from "./linearSystemsTutorContext";
import { createLinearSystemsSession, replaceLinearSystemsDraft, runLinearSystemsSession, setLinearSystemsWorkflowStep, type LinearSystemsSessionState } from "./linearSystemsSession";

function solved(session = createLinearSystemsSession()): LinearSystemsSessionState {
  const outcome = runLinearSystemsSession(session);
  if (!outcome.ok) throw new Error(outcome.error.message);
  return outcome.session;
}
afterEach(() => vi.restoreAllMocks());

describe("Linear Systems Tutor binding", () => {
  it("projects only on demand, caches immutable evidence, and ignores presentation-only changes", () => {
    let session = solved();
    const build = vi.spyOn(projection, "buildLinearSystemsTutorContext");
    const control = createLinearSystemsTutorBinding({ getSession: () => session });
    const changed = vi.fn(); control.binding.subscribeContextChange!(changed);
    control.refreshContext(); expect(build).not.toHaveBeenCalled();
    const first = control.binding.getContext();
    expect(first.status).toBe("ready");
    expect(control.binding).toMatchObject({ moduleId: "linear_algebra", promptProfile: "linear_algebra" });
    expect(control.binding.applyChartInstruction).toBeUndefined();
    expect(control.binding.suggestedQuestions.length).toBeGreaterThan(0);
    session = setLinearSystemsWorkflowStep(session, "diagnostics");
    control.refreshContext();
    expect(control.binding.getContext()).toBe(first);
    expect(build).toHaveBeenCalledTimes(1); expect(changed).not.toHaveBeenCalled();
    session = solved(session); control.refreshContext();
    expect(control.binding.getContext().revision).toBe(first.revision + 1);
    expect(changed).toHaveBeenCalledTimes(1);
    control.dispose();
  });

  it("invalidates current evidence on edits and restores it with a newer revision", () => {
    const success = solved(); let session = success;
    const control = createLinearSystemsTutorBinding({ getSession: () => session });
    const ready = control.binding.getContext();
    session = replaceLinearSystemsDraft(session, { dimension: 3, A: session.ADraft, b: ["", "9", "-2"] });
    const stale = control.binding.getContext();
    expect(stale.status).toBe("unavailable"); expect(stale.revision).toBeGreaterThan(ready.revision);
    session = runLinearSystemsSession(session).session;
    expect(control.binding.getContext()).toBe(stale);
    session = success;
    expect(control.binding.getContext()).toMatchObject({ status: "ready", revision: stale.revision + 1 });
    control.dispose();
  });

  it("keeps unavailable input distinct from the current successful result", () => {
    let session = createLinearSystemsSession();
    const control = createLinearSystemsTutorBinding({ getSession: () => session });
    expect(control.binding.getContext()).toMatchObject({ status: "unavailable", message: expect.stringContaining("Solve") });
    session = solved(); const ready = control.binding.getContext();
    session = { ...session, inputFingerprint: "mismatch" };
    expect(control.binding.getContext()).toMatchObject({ status: "unavailable", revision: ready.revision + 1 });
    control.dispose();
  });

  it("owns idempotent subscriptions and disposal outside pure Lab state", () => {
    const source = vi.fn(() => solved()), prepare = vi.fn();
    const control = createLinearSystemsTutorBinding({ getSession: source, prepareForOpen: prepare });
    const reset = vi.fn(), context = vi.fn();
    const unsubscribe = control.binding.subscribeConversationReset!(reset);
    control.binding.subscribeContextChange!(context);
    control.binding.getContext(); control.binding.prepareForOpen?.(); expect(prepare).toHaveBeenCalledOnce();
    control.requestConversationReset(); expect(reset).toHaveBeenCalledOnce();
    unsubscribe(); unsubscribe(); control.requestConversationReset(); expect(reset).toHaveBeenCalledOnce();
    control.dispose(); control.dispose(); source.mockClear();
    expect(control.binding.getContext().status).toBe("unavailable");
    control.requestConversationReset(); control.refreshContext();
    control.binding.prepareForOpen?.();
    expect(source).not.toHaveBeenCalled(); expect(prepare).toHaveBeenCalledOnce(); expect(context).not.toHaveBeenCalled();
  });
});
