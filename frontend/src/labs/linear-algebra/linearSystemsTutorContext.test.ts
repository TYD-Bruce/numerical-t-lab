import { describe, expect, it, vi } from "vitest";
import * as numerics from "@numerical-t-lab/numerics/linear-algebra/linear-systems-numerics";
import { LINEAR_TUTOR_LIMITS, LINEAR_TUTOR_TRACE_OMISSIONS } from "@numerical-t-lab/contracts/tutor";
import { preparePersonalChat } from "../../../../backend/src/ai/personalTutorChat";
import { validateLinearSystemsTutorContext } from "../../../../backend/src/ai/tutorContextValidation";
import { buildLinearSystemsTutorContext } from "./linearSystemsTutorContext";
import { createLinearSystemsSession, loadLinearSystemsPreset, replaceLinearSystemsDraft, runLinearSystemsSession, setLinearSystemsWorkflowStep, type LinearSystemsSessionState } from "./linearSystemsSession";

function solved(session = createLinearSystemsSession()): LinearSystemsSessionState {
  const outcome = runLinearSystemsSession(session);
  if (!outcome.ok) throw new Error(outcome.error.message);
  return outcome.session;
}

describe("Linear Systems Lab-owned Tutor evidence", () => {
  it("projects the immutable successful result without solving, cloning matrices or changing the trace", () => {
    const session = solved(), result = session.latestSuccessfulResult!;
    const before = JSON.stringify(session), solve = vi.spyOn(numerics, "solveLinearSystem");
    try {
      const context = buildLinearSystemsTutorContext(session)!;
      expect(context.originalA).toBe(result.originalA);
      expect(context.originalB).toBe(result.originalB);
      expect(context.xHat).toBe(result.xHat);
      expect(context.factorization).toEqual({ convention: "PA=LU", P: result.P, L: result.L, U: result.U, permutation: result.permutation, pivots: result.pivots, rowSwapCount: result.rowSwapCount });
      expect(context.factorization.L).toBe(result.L);
      expect(context.diagnostics).toEqual({ residual: result.residual, residualInfNorm: result.residualInfNorm, matrixInfNorm: result.matrixInfNorm, tauPivot: result.tauPivot });
      expect(context.reference).toEqual({ label: "Difference from preset reference solution", presetId: result.presetId, presetName: result.presetName, solution: result.referenceSolution, differenceInf: result.referenceDifferenceInf });
      expect(solve).not.toHaveBeenCalled();
      expect(JSON.stringify(session)).toBe(before);
      expect(Object.isFrozen(context)).toBe(true);
      expect(Object.isFrozen(context.trace.steps)).toBe(true);
      expect(validateLinearSystemsTutorContext(context)).toBe(context);
    } finally { solve.mockRestore(); }
  });

  it("preserves every stored step's order, selected fields and explicit omitted-detail labels", () => {
    const session = solved(loadLinearSystemsPreset(createLinearSystemsSession(), "row_swap_required"));
    const context = buildLinearSystemsTutorContext(session)!, trace = session.latestSuccessfulResult!.trace;
    expect(context.trace).toMatchObject({ detail: "selected_fields", totalStepCount: trace.steps.length, omittedDetails: LINEAR_TUTOR_TRACE_OMISSIONS });
    expect(context.trace.steps.map(step => step.kind)).toEqual(trace.steps.map(step => step.kind));
    context.trace.steps.forEach((step, index) => {
      for (const [key, value] of Object.entries(step)) expect(value).toEqual((trace.steps[index] as unknown as Record<string, unknown>)[key]);
    });
    expect(context.trace.steps.find(step => step.kind === "row_swap")).toHaveProperty("permutationAfter");
    expect(JSON.stringify(context.trace)).not.toMatch(/"(?:uBefore|uAfter|contributions|terms|components)":/);
  });

  it("requires current, matching successful evidence and excludes stale or failed drafts", () => {
    const fresh = createLinearSystemsSession(), success = solved(fresh);
    expect(buildLinearSystemsTutorContext(fresh)).toBeNull();
    for (const change of [
      { resultStatus: "stale" as const }, { resultStatus: "absent" as const },
      { inputFingerprint: null }, { inputFingerprint: "mismatched" }, { dimension: 2 },
      { latestSuccessfulResult: undefined },
      { latestSuccessfulResult: { ...success.latestSuccessfulResult!, trace: undefined } },
      { latestSuccessfulResult: { ...success.latestSuccessfulResult!, inputFingerprint: "other" } },
    ]) expect(buildLinearSystemsTutorContext({ ...success, ...change } as LinearSystemsSessionState)).toBeNull();
    const invalid = replaceLinearSystemsDraft(success, { dimension: 3, A: [["", "0", "0"], ["0", "0", "0"], ["0", "0", "0"]], b: ["0", "0", "0"] });
    const failed = runLinearSystemsSession(invalid);
    expect(failed.ok).toBe(false);
    expect(failed.session.latestSuccessfulResult).toBe(success.latestSuccessfulResult);
    expect(buildLinearSystemsTutorContext(failed.session)).toBeNull();
    const singular = replaceLinearSystemsDraft(success, { dimension: 2, A: [["1", "2"], ["2", "4"]], b: ["3", "6"] });
    expect(runLinearSystemsSession(singular).ok).toBe(false);
    expect(buildLinearSystemsTutorContext(singular)).toBeNull();
    expect(buildLinearSystemsTutorContext(setLinearSystemsWorkflowStep(success, "diagnostics"))).toEqual(buildLinearSystemsTutorContext(success));
  });

  it("never attaches a preset reference to custom or mismatched evidence", () => {
    const custom = solved(replaceLinearSystemsDraft(createLinearSystemsSession(), { dimension: 2, A: [["2", "1"], ["0", "3"]], b: ["4", "6"] }));
    expect(buildLinearSystemsTutorContext(custom)!.reference).toBeUndefined();
    const injected = { ...custom, latestSuccessfulResult: { ...custom.latestSuccessfulResult!, presetId: "starter_3x3" as const, presetName: "Starter 3×3", referenceSolution: [1, 2], referenceDifferenceInf: 0 } };
    expect(buildLinearSystemsTutorContext(injected)!.reference).toBeUndefined();
  });

  it.each(["xHat", "P", "L", "U", "pivots", "residual", "residualInfNorm"])("rejects partial evidence missing %s", field => {
    const session = solved();
    expect(buildLinearSystemsTutorContext({ ...session, latestSuccessfulResult: { ...session.latestSuccessfulResult!, [field]: undefined } })).toBeNull();
  });

  it.each([2, 3, 4, 5, 6])("serializes actual dimension %i producer evidence within the existing prompt budget", dimension => {
    // Dense finite binary64 data, including long decimal values and row swaps.
    const A = Array.from({ length: dimension }, (_, row) => Array.from({ length: dimension }, (_, column) =>
      String((row === dimension - column - 1 ? 20 : 1) + (row + 1) / (column + 3))));
    const b = Array.from({ length: dimension }, (_, row) => String((row + 1) / 7));
    const session = solved(replaceLinearSystemsDraft(createLinearSystemsSession(), { dimension, A, b }));
    const context = buildLinearSystemsTutorContext(session)!;
    expect(context.trace.steps.length).toBeLessThanOrEqual(LINEAR_TUTOR_LIMITS.traceSteps);
    const prepared = preparePersonalChat({ profile: "linear_algebra", generation: 1, requestId: "linear-fixture", context: JSON.parse(JSON.stringify(context)), messages: [{ role: "user", content: "Explain this result." }] });
    expect(prepared.profile).toBe("linear_algebra");
    expect(prepared.prompt.messages[0].content).toContain(JSON.stringify(context));
    expect(new TextEncoder().encode(JSON.stringify(prepared.prompt)).length).toBeLessThan(32 * 1024);
  });

  it("keeps numerical dimension bounds unchanged and independent from wire bounds", () => {
    expect(LINEAR_TUTOR_LIMITS.minDimension).toBe(numerics.LINEAR_SYSTEMS_MIN_DIMENSION);
    expect(LINEAR_TUTOR_LIMITS.maxDimension).toBe(numerics.LINEAR_SYSTEMS_MAX_DIMENSION);
  });

  it("preserves finite sequential-subtraction evidence when its optional sum would overflow", () => {
    const session = solved(replaceLinearSystemsDraft(createLinearSystemsSession(), { dimension: 3, A: [["1", "1", "1"], ["0", "1", "0"], ["0", "0", "1"]], b: ["1e308", "1e308", "1e308"] }));
    const context = buildLinearSystemsTutorContext(session)!;
    const row = context.trace.steps.find(step => step.kind === "backward_substitution" && step.row === 0);
    expect(row).toMatchObject({ numeratorBeforeDivision: -1e308, resultingXHat: -1e308 });
    expect(row).not.toHaveProperty("accumulatedKnownTermSum");
    expect(validateLinearSystemsTutorContext(JSON.parse(JSON.stringify(context)))).toEqual(context);
  });

  it("preserves tiny nonzero scale evidence without introducing an absolute pivot floor", () => {
    const session = solved(replaceLinearSystemsDraft(createLinearSystemsSession(), { dimension: 2, A: [["2e-300", "1e-300"], ["0", "3e-300"]], b: ["4e-300", "6e-300"] }));
    const context = buildLinearSystemsTutorContext(session)!;
    expect(context.diagnostics.tauPivot).toBeLessThan(1e-300);
    expect(validateLinearSystemsTutorContext(JSON.parse(JSON.stringify(context)))).toEqual(context);
  });
});
