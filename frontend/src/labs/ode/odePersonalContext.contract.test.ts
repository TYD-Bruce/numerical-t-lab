import { describe, expect, it } from "vitest";
import { integrateFirstOrder, integrateSecondOrder, type MethodFamily } from "@numerical-t-lab/numerics/ode/solvers";
import { buildOdeLabContext } from "./odeTutorContext";
import { createMathExpressionFromLegacy } from "@numerical-t-lab/numerics/expressions/legacy-adapter";
import { runConvergenceStudy } from "@numerical-t-lab/numerics/convergence";
import { createConvergenceUiState, createSuccessfulFirstOrderRunSnapshot, editConvergenceSetup, recordConvergenceSuccess } from "./convergenceStudyState";
import { getTutorConvergenceStudy } from "./convergenceTutor";
// Cross-boundary test only: the browser runtime never imports the backend validator.
import { preparePersonalChat } from "../../../../backend/src/ai/personalTutorChat";

const problem = { kind: "first_order" as const, equationDisplay: "y′ = -y", t0: 0, tEnd: 1, h: 0.05, y0: 1 };
const request = (context: object) => ({ profile: "ode", generation: 1, requestId: "fixture", context, messages: [{ role: "user", content: "Explain the approximation." }] });

describe("actual ODE projection and personal API compatibility", () => {
  it.each(["forward_euler", "backward_euler", "taylor", "rk4", "adams_bashforth", "adams_moulton", "bdf"] as MethodFamily[])("accepts %s evidence without mutation", family => {
    const result = integrateFirstOrder({ family, ...(family === "bdf" ? { order: 6 } : {}) }, { ...problem, f: (_t, y) => -y });
    const context = buildOdeLabContext(result, problem);
    const before = JSON.stringify(context);
    const prepared = preparePersonalChat(request(context));
    expect(prepared.prompt.messages.at(-1)!.content).toContain(before);
    expect(JSON.stringify(context)).toBe(before);
    if (family === "backward_euler") expect(context.method.implicitDiagnostics!.finalResidual).toBeLessThan(0);
  });
  it("accepts second-order velocity and both 80/81-point sampling boundaries", () => {
    for (const steps of [79, 80]) {
      const inputs = { kind: "second_order" as const, equationDisplay: "y″ = -y", t0: 0, tEnd: steps, h: 1, u0: 1, v0: 0 };
      const result = integrateSecondOrder({ ...inputs, a: (_t, u) => -u });
      const context = buildOdeLabContext(result, inputs);
      expect(preparePersonalChat(request(context)).prompt.messages[0].content).toContain(JSON.stringify(context));
      expect(context.result.seriesFull?.length).toBe(steps === 79 ? 80 : undefined);
      expect(context.result.seriesPreview).toHaveLength(20);
    }
  });
  it("preserves an actual eligible six-level Convergence Study and excludes stale evidence", () => {
    const result = integrateFirstOrder({ family: "rk4" }, { ...problem, f: (_t, y) => -y });
    const rhs = createMathExpressionFromLegacy("-y", "rhs");
    const exactSolution = createMathExpressionFromLegacy("exp(-t)", "exact_solution");
    const snapshot = createSuccessfulFirstOrderRunSnapshot({ ...problem, metadata: result.metadata,
      rhs, exactSolutionEnabled: true, exactSolution, runStepSize: problem.h });
    const state = editConvergenceSetup(createConvergenceUiState(snapshot), snapshot, { refinementLevelsDraft: "6" });
    const study = runConvergenceStudy({ ...problem, method: { family: "rk4", order: 4 }, rhs, exactSolution,
      baseStepSize: Number(state.baseStepSizeDraft), refinementLevels: 6, allowConsistencyWarning: false, runFingerprint: snapshot.runFingerprint });
    const current = recordConvergenceSuccess(state, study);
    const evidence = getTutorConvergenceStudy(current);
    expect(evidence?.levels).toHaveLength(6);
    const context = buildOdeLabContext(result, problem, evidence);
    expect(preparePersonalChat(request(context)).prompt.messages[0].content).toContain(JSON.stringify(context));
    const stale = editConvergenceSetup(current, snapshot, { refinementLevelsDraft: "3" });
    expect(getTutorConvergenceStudy(stale)).toBeUndefined();
  });
});
