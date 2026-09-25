import { describe, expect, it, vi } from "vitest";
import {
  createOdeTutorBinding,
  ODE_TUTOR_SUGGESTED_QUESTIONS,
  type OdeTutorSource,
} from "./odeTutorBinding";
import { createReadonlySolverResult } from "./odeSession";

const result = createReadonlySolverResult({ points: [{ t: 0, y: 1 }, { t: 0.1, y: 0.9 }], metadata: {
  family: "forward_euler", displayName: "Forward Euler", order: 1, isImplicit: false,
  formulaType: "one-step-explicit", formulaDisplay: "u next = u + h f", notes: [],
} });
const ready: OdeTutorSource = { enabled: true, result, problem: {
  kind: "first_order", equationDisplay: "y' = -y", t0: 0, tEnd: 0.1, h: 0.1, y0: 1,
} };

describe("Lab-owned ODE Tutor binding", () => {
  it("uses theoretical-order and qualified time-step-size questions", () => {
    expect(ODE_TUTOR_SUGGESTED_QUESTIONS).toContain(
      "Why is this method’s theoretical order p?"
    );
    expect(ODE_TUTOR_SUGGESTED_QUESTIONS).toContain(
      "What could happen if I used a smaller time-step size h?"
    );
    expect(ODE_TUTOR_SUGGESTED_QUESTIONS).not.toContain(
      "Why is the order of accuracy p?"
    );
    expect(ODE_TUTOR_SUGGESTED_QUESTIONS).not.toContain(
      "What would happen if I used a smaller h?"
    );
    expect(Object.isFrozen(ODE_TUTOR_SUGGESTED_QUESTIONS)).toBe(true);
  });

  it("reads fresh source state, hides the math keyboard, and owns no conversation", () => {
    let source: OdeTutorSource = { enabled: false };
    const prepare = vi.fn();
    const control = createOdeTutorBinding({ getSource: () => source, prepareForOpen: prepare });

    expect(control.binding.moduleId).toBe("ode");
    expect(control.binding.promptProfile).toBe("ode");
    const missing = control.binding.getContext();
    expect(missing).toMatchObject({ status: "unavailable", message: expect.stringContaining("Run a method first") });
    source = ready;
    const snapshot = control.binding.getContext();
    expect(snapshot).toMatchObject({ status: "ready", context: { result: { finalT: 0.1, finalY: 0.9 }, problem: ready.problem } });
    expect(snapshot.revision).toBeGreaterThan(missing.revision);
    expect(snapshot).not.toHaveProperty("result");
    control.binding.prepareForOpen?.();
    expect(prepare).toHaveBeenCalledOnce();
    expect(control.binding).not.toHaveProperty("conversation");
    expect(control.binding).not.toHaveProperty("sessionAccess");
  });

  it("keeps a stable snapshot for the same successful evidence and advances for new evidence", () => {
    let source = ready;
    const control = createOdeTutorBinding({ getSource: () => source });
    const first = control.binding.getContext();
    source = { ...source };
    expect(control.binding.getContext()).toBe(first);
    source = { ...source, problem: { ...source.problem!, h: 0.05 } };
    const second = control.binding.getContext();
    expect(second.revision).toBeGreaterThan(first.revision);
    expect(first).toMatchObject({ context: { problem: { h: 0.1 } } });
    control.dispose();
    expect(control.binding.getContext()).toMatchObject({ status: "unavailable" });
    expect(control.binding.getContext().revision).toBeGreaterThan(second.revision);
  });

  it("distinguishes Compare from missing output and notifies context changes without owning UI", () => {
    let source: OdeTutorSource = ready;
    const control = createOdeTutorBinding({ getSource: () => source });
    const listener = vi.fn();
    const unsubscribe = control.binding.subscribeContextChange?.(listener);
    control.binding.getContext();
    control.refreshContext();
    expect(listener).not.toHaveBeenCalled();
    source = { enabled: false, reason: "comparison" };
    control.refreshContext();
    expect(listener).toHaveBeenCalledOnce();
    expect(control.binding.getContext()).toMatchObject({ status: "unavailable", message: expect.stringContaining("comparison output") });
    unsubscribe?.();
    source = ready;
    control.refreshContext();
    expect(listener).toHaveBeenCalledOnce();
    control.dispose(); control.dispose();
  });

  it("publishes ordinary-Run reset requests without knowing the store or Host", () => {
    const control = createOdeTutorBinding({ getSource: () => ({ enabled: false }) });
    const first = vi.fn();
    const second = vi.fn();
    const unsubscribe = control.binding.subscribeConversationReset?.(first);
    control.binding.subscribeConversationReset?.(second);

    control.requestConversationReset();
    unsubscribe?.();
    control.requestConversationReset();

    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledTimes(2);
  });
});
