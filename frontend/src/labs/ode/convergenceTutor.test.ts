import { describe, expect, it } from "vitest";
import type { ObservedOrderStatus, ConvergenceStudyResult } from "@numerical-t-lab/numerics/convergence";
import {
  createConvergenceUiState,
  createSuccessfulFirstOrderRunSnapshot,
  currentStudyFingerprint,
  editConvergenceSetup,
  recordConvergenceFailure,
  recordConvergenceSuccess,
  setConvergenceDrawerOpen,
  setConvergenceMetric,
  setTeachingAccordion,
  type ConvergenceUiState,
} from "./convergenceStudyState";
import { getTutorConvergenceStudy } from "./convergenceTutor";
import { ConvergenceStudyFailure } from "@numerical-t-lab/numerics/convergence";
import { createMathExpressionFromLegacy } from "@numerical-t-lab/numerics/expressions/legacy-adapter";
import { createOdeTutorBinding } from "./odeTutorBinding";
import { createReadonlySolverResult } from "./odeSession";

function state(): ConvergenceUiState {
  return createConvergenceUiState(
    createSuccessfulFirstOrderRunSnapshot({
      metadata: { family: "rk4", order: 4 },
      rhs: createMathExpressionFromLegacy("-y", "rhs"),
      exactSolutionEnabled: true,
      exactSolution: createMathExpressionFromLegacy("exp(-t)", "exact_solution"),
      t0: 0,
      y0: 1,
      tEnd: 1,
      runStepSize: 0.25,
      presetId: "exponential_decay",
    })
  );
}

function assessment(status: ObservedOrderStatus, value?: number) {
  return {
    ...(value !== undefined ? { value } : {}),
    status,
    message: `Assessment: ${status}`,
    coarseLevel: 0,
    fineLevel: 1,
  };
}

function result(
  value: ConvergenceUiState,
  overrides: Partial<ConvergenceStudyResult> = {}
): ConvergenceStudyResult {
  return {
    configFingerprint: currentStudyFingerprint(value)!,
    runFingerprint: value.runFingerprint,
    theoreticalOrder: 4,
    consistencyCheck: {
      status: "warning",
      statement: "This is a numerical consistency check, not a formal proof.",
      sampleCount: 9,
      maximumNormalizedResidual: 2.5e-5,
      maximumResidualTime: 0.5,
      probes: [],
      issues: [],
    },
    levels: [
      {
        level: 0,
        stepSize: 0.25,
        stepCount: 4,
        finalNumericalValue: 0.37,
        finalExactValue: Math.exp(-1),
        finalTimeError: 0.002,
        finalResolutionThreshold: 1e-14,
        maximumGlobalError: 0.003,
        maximumErrorTime: 0.75,
        maximumResolutionThreshold: 1e-14,
      },
      {
        level: 1,
        stepSize: 0.125,
        stepCount: 8,
        finalNumericalValue: 0.368,
        finalExactValue: Math.exp(-1),
        finalTimeError: 0.00013,
        finalResolutionThreshold: 1e-14,
        maximumGlobalError: 0.00019,
        maximumErrorTime: 0.75,
        maximumResolutionThreshold: 1e-14,
        finalObservedOrder: assessment("reliable", 3.94),
        maximumObservedOrder: assessment("reliable", 3.98),
      },
    ],
    interpretation: {
      kind: "consistent_with_theory",
      title: "Observed order is consistent with theory",
      explanation: "Recent maximum-error orders are stable near four.",
      primaryObservedOrder: 3.98,
      evidencePairs: [[0, 1]],
    },
    ...overrides,
  };
}

function currentState(): ConvergenceUiState {
  const initial = state();
  return recordConvergenceSuccess(initial, result(initial));
}

describe("Tutor convergence DTO", () => {
  it("revises the Lab context only when eligible Convergence evidence changes", () => {
    const current = currentState();
    let convergenceState = current;
    const run = createReadonlySolverResult({
      points: [{ t: 0, y: 1 }, { t: 1, y: 0.37 }],
      metadata: { family: "rk4", displayName: "Runge-Kutta 4", order: 4,
        isImplicit: false, formulaType: "one-step-explicit", formulaDisplay: "RK4", notes: [] },
    });
    const problem = { kind: "first_order" as const, equationDisplay: "y' = -y", t0: 0, tEnd: 1, h: 0.25, y0: 1 };
    const control = createOdeTutorBinding({ getSource: () => ({ enabled: true, result: run, problem, convergenceState }) });
    const first = control.binding.getContext();
    expect(first).toMatchObject({ status: "ready", context: { convergenceStudy: getTutorConvergenceStudy(current) } });

    convergenceState = setConvergenceMetric(setConvergenceDrawerOpen(current, true), "final_time");
    expect(control.binding.getContext()).toBe(first);
    convergenceState = recordConvergenceFailure(current, new ConvergenceStudyFailure("level_integration_failure", "Level failed."));
    expect(control.binding.getContext()).toBe(first);

    convergenceState = { ...current, resultStatus: "stale" };
    const stale = control.binding.getContext();
    expect(stale.revision).toBe(first.revision + 1);
    expect(stale).not.toHaveProperty("context.convergenceStudy");
    convergenceState = { ...current, runFingerprint: "other" };
    expect(control.binding.getContext()).toBe(stale);
    convergenceState = { ...current, result: { ...current.result!, consistencyCheck: { ...current.result!.consistencyCheck, status: "blocked" } } };
    expect(control.binding.getContext()).toBe(stale);

    convergenceState = current;
    const restored = control.binding.getContext();
    expect(restored.revision).toBe(stale.revision + 1);
    expect(restored).toMatchObject({ context: { convergenceStudy: getTutorConvergenceStudy(current) } });
    expect(first).toMatchObject({ context: { convergenceStudy: getTutorConvergenceStudy(current) } });
    control.dispose();
  });

  it("copies only finite computed evidence from a current owned result", () => {
    const dto = getTutorConvergenceStudy(currentState());

    expect(dto).toEqual({
      theoreticalOrder: 4,
      interpretation: {
        kind: "consistent_with_theory",
        title: "Observed order is consistent with theory",
        explanation: "Recent maximum-error orders are stable near four.",
        primaryObservedOrder: 3.98,
        evidencePairs: [[0, 1]],
      },
      levels: [
        {
          level: 0,
          h: 0.25,
          finalTimeError: 0.002,
          maximumGlobalError: 0.003,
        },
        {
          level: 1,
          h: 0.125,
          finalTimeError: 0.00013,
          maximumGlobalError: 0.00019,
          finalObservedOrder: assessment("reliable", 3.94),
          maximumObservedOrder: assessment("reliable", 3.98),
        },
      ],
      consistencyCheck: {
        status: "warning",
        maximumNormalizedResidual: 2.5e-5,
        maximumResidualTime: 0.5,
        statement: "This is a numerical consistency check, not a formal proof.",
      },
    });
    expect(() => JSON.stringify(dto)).not.toThrow();
    const json = JSON.stringify(dto);
    expect(json).not.toMatch(/canonicalAst|MathJSON|latex|pending|lastAttempt/);
  });

  it("preserves a passed consistency status with absent optional residual evidence", () => {
    const initial = state();
    const passed = result(initial, {
      consistencyCheck: {
        status: "passed",
        statement: "This is a numerical consistency check, not a formal proof.",
        sampleCount: 9,
        probes: [],
        issues: [],
      },
    });
    expect(
      getTutorConvergenceStudy(recordConvergenceSuccess(initial, passed))
        ?.consistencyCheck
    ).toEqual({
      status: "passed",
      statement: "This is a numerical consistency check, not a formal proof.",
    });
  });

  it.each([
    ["below_resolution", undefined],
    ["no_improvement", undefined],
    ["negative", -0.5],
    ["near_zero", 0.01],
    ["unavailable", undefined],
  ] as const)("preserves the %s assessment without inventing a value", (status, order) => {
    const initial = state();
    const base = result(initial);
    const changed = {
      ...base,
      levels: [
        base.levels[0]!,
        { ...base.levels[1]!, maximumObservedOrder: assessment(status, order) },
      ],
    };
    const dto = getTutorConvergenceStudy(recordConvergenceSuccess(initial, changed));
    expect(dto?.levels[1]?.maximumObservedOrder?.status).toBe(status);
    expect(dto?.levels[1]?.maximumObservedOrder?.value).toBe(order);
  });

  it("omits absent, stale, mismatched, blocked, and non-finite results", () => {
    const initial = state();
    expect(getTutorConvergenceStudy(undefined)).toBeUndefined();
    expect(getTutorConvergenceStudy(initial)).toBeUndefined();

    const current = recordConvergenceSuccess(initial, result(initial));
    const stale = editConvergenceSetup(current, createSuccessfulFirstOrderRunSnapshot({
      metadata: { family: "rk4", order: 4 },
      rhs: createMathExpressionFromLegacy("-y", "rhs"),
      exactSolutionEnabled: true,
      exactSolution: createMathExpressionFromLegacy("exp(-t)", "exact_solution"),
      t0: 0,
      y0: 1,
      tEnd: 1,
      runStepSize: 0.25,
      presetId: "exponential_decay",
    }), { baseStepSizeDraft: "0.125" });
    expect(getTutorConvergenceStudy(stale)).toBeUndefined();
    expect(getTutorConvergenceStudy({ ...current, runFingerprint: "other" })).toBeUndefined();
    expect(getTutorConvergenceStudy({
      ...current,
      result: { ...current.result!, theoreticalOrder: Number.NaN },
    })).toBeUndefined();
  });

  it("restores grounding when edited study settings return to the result fingerprint", () => {
    const snapshot = createSuccessfulFirstOrderRunSnapshot({
      metadata: { family: "rk4", order: 4 },
      rhs: createMathExpressionFromLegacy("-y", "rhs"),
      exactSolutionEnabled: true,
      exactSolution: createMathExpressionFromLegacy("exp(-t)", "exact_solution"),
      t0: 0,
      y0: 1,
      tEnd: 1,
      runStepSize: 0.25,
      presetId: "exponential_decay",
    });
    const current = currentState();
    const stale = editConvergenceSetup(current, snapshot, { baseStepSizeDraft: "0.125" });
    const restored = editConvergenceSetup(stale, snapshot, { baseStepSizeDraft: "0.25" });

    expect(stale.resultStatus).toBe("stale");
    expect(getTutorConvergenceStudy(stale)).toBeUndefined();
    expect(restored.resultStatus).toBe("current");
    expect(getTutorConvergenceStudy(restored)).toEqual(getTutorConvergenceStudy(current));
  });

  it("ignores drawer presentation state and retains a matching result after a failed attempt", () => {
    const current = currentState();
    const changedPresentation = setTeachingAccordion(
      setConvergenceMetric(setConvergenceDrawerOpen(current, true), "final_time"),
      "log_log",
      true
    );
    expect(getTutorConvergenceStudy(changedPresentation)).toEqual(
      getTutorConvergenceStudy(current)
    );

    const failed = recordConvergenceFailure(
      current,
      new ConvergenceStudyFailure("level_integration_failure", "Level failed.")
    );
    expect(getTutorConvergenceStudy(failed)).toEqual(getTutorConvergenceStudy(current));
  });
});
