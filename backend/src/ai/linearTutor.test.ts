import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { normalizePersonalTutorResponse, preparePersonalChat } from "./personalTutorChat";
import { buildLinearTutorDemoResponse, LINEAR_SYSTEMS_TUTOR_PROMPT } from "./linearTutor";
import { validateLinearSystemsTutorContext } from "./tutorContextValidation";
import { linearTutorFixture } from "./linearTutor.test-fixture";

const request = (context: unknown = linearTutorFixture()) => ({ profile: "linear_algebra", generation: 2, requestId: "linear-1", context, messages: [{ role: "user", content: "Explain my result" }] });
beforeEach(() => { vi.stubGlobal("fetch", vi.fn(() => { throw new Error("External fetch is forbidden in this fixture"); })); });
afterEach(() => { expect(fetch).not.toHaveBeenCalled(); vi.unstubAllGlobals(); });

describe("Linear Tutor closed grounding and prompt", () => {
  it("captures current evidence and authorized history with a Linear-specific server prompt", () => {
    const input = { ...request(), messages: [{ role: "user", content: "Older question" }, { role: "assistant", content: "Older answer" }, { role: "user", content: "Current question" }] };
    const prepared = preparePersonalChat(input);
    expect(prepared.prompt.instructions).toContain(LINEAR_SYSTEMS_TUTOR_PROMPT);
    expect(prepared.prompt.instructions).toMatch(/not.*solution error/i);
    expect(prepared.prompt.instructions).toMatch(/condition number/i);
    expect(prepared.prompt.instructions).toMatch(/omitted/i);
    expect(prepared.prompt.messages.slice(0, 2)).toEqual(input.messages.slice(0, 2));
    expect(prepared.prompt.messages[2].content).toContain(JSON.stringify(input.context));
    expect(prepared.prompt.messages[2].content).toContain("Current question");
    input.messages[0].content = "Changed after capture";
    expect(prepared.prompt.messages[0].content).toBe("Older question");
  });

  it.each([
    (c: any) => { c.dimension = 7; }, (c: any) => { c.originalA[0].pop(); },
    (c: any) => { c.originalB[0] = Infinity; }, (c: any) => { c.xHat[0] = null; },
    (c: any) => { c.factorization.P[0][0] = "1"; }, (c: any) => { c.factorization.convention = "A=PLU"; },
    (c: any) => { c.factorization.permutation = [0, 0]; }, (c: any) => { c.factorization.pivots.pop(); },
    (c: any) => { c.factorization.pivots[0].selectedRow = 2; }, (c: any) => { c.factorization.rowSwapCount = 2; },
    (c: any) => { c.diagnostics.residualInfNorm = -1; }, (c: any) => { c.diagnostics.tauPivot = Infinity; },
    (c: any) => { c.conditionNumber = 100; }, (c: any) => { c.tools = []; },
    (c: any) => { c.trace.steps[2].accepted = false; }, (c: any) => { c.trace.steps[3].targetRowAfter[0] = NaN; },
    (c: any) => { c.trace.steps[3].uBefore = c.originalA; }, (c: any) => { c.trace.steps[3].kind = "execute"; },
    (c: any) => { c.trace.totalStepCount = 13; }, (c: any) => { c.trace.omittedDetails = []; },
    (c: any) => { c.trace.steps = Array(51).fill(c.trace.steps[0]); c.trace.totalStepCount = 51; },
    (c: any) => { c.trace.steps[7].row = -1; }, (c: any) => { c.trace.steps[7].accumulatedKnownTermSum = Infinity; },
    (c: any) => { c.reference = { presetId: "invented", presetName: "Any", label: "Exact error", solution: [1, 2], differenceInf: 0 }; },
  ])("rejects malformed, partial, nonfinite or unreviewed evidence before transport %#", change => {
    const context = structuredClone(linearTutorFixture()); change(context);
    expect(() => preparePersonalChat(request(context))).toThrowError(expect.objectContaining({ code: "invalid_context" }));
  });

  it("allows an omitted non-authoritative accumulated sum without inventing it", () => {
    const context = structuredClone(linearTutorFixture());
    const step = context.trace.steps[7];
    if (step.kind !== "forward_substitution") throw new Error("fixture shape");
    const { accumulatedKnownTermSum: _unused, ...withoutSum } = step;
    const input = { ...context, trace: { ...context.trace, steps: context.trace.steps.map((value, i) => i === 7 ? withoutSum : value) } };
    expect(validateLinearSystemsTutorContext(input)).toBe(input);
    expect(preparePersonalChat(request(input)).prompt.messages[0].content).toContain(JSON.stringify(withoutSum));
  });

  it("rejects over-budget history without removing evidence or earlier messages", () => {
    const input = { ...request(), messages: [{ role: "user", content: "界".repeat(11000) }] };
    const before = JSON.stringify(input);
    expect(() => preparePersonalChat(input)).toThrowError(expect.objectContaining({ code: "input_too_large" }));
    expect(JSON.stringify(input)).toBe(before);
  });

  it("accepts final explanatory text but never returns Linear chart or solver actions", () => {
    expect(normalizePersonalTutorResponse(JSON.stringify({ message: "Use the recorded factors.", chartInstruction: { type: "zoom_range", tMin: 0, tMax: 1 }, solve: true }), "linear_algebra"))
      .toEqual({ message: "Use the recorded factors." });
    expect(normalizePersonalTutorResponse("A plain explanation.", "linear_algebra")).toEqual({ message: "A plain explanation." });
  });
});

describe("deterministic Linear Tutor demo", () => {
  it.each(["Explain the result", "Why pivot?", "Explain PA=LU", "Explain the elimination steps", "What is my solution error?", "Compute a condition number", "Change the matrix and solve it"])("answers %s only from stored evidence", question => {
    const context = linearTutorFixture(), before = JSON.stringify(context);
    const response = buildLinearTutorDemoResponse(context, question);
    expect(response.demoMode).toBe(true);
    expect(response.chartInstruction).toBeUndefined();
    expect(response.message).toContain("no live AI model");
    expect(response.message).not.toMatch(/condition number (?:is|=)\s*\d|exact solution|forward error bound (?:is|=)\s*\d/i);
    expect(response.message).toBe(buildLinearTutorDemoResponse(context, question).message);
    expect(JSON.stringify(context)).toBe(before);
  });
});
