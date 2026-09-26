import { LINEAR_TUTOR_TRACE_OMISSIONS, LINEAR_TUTOR_LIMITS, type LinearSystemsLabContext, type LinearTutorTraceStep } from "@numerical-t-lab/contracts/tutor";
import type { LinearSystemTraceStep } from "@numerical-t-lab/numerics/linear-algebra/linear-systems-numerics";
import { createLinearSystemsInputFingerprint, matchLinearSystemsPreset } from "@numerical-t-lab/numerics/linear-algebra/linear-systems-presets";
import type { LinearSystemsSessionState } from "./linearSystemsSession";

function projectStep(step: LinearSystemTraceStep): LinearTutorTraceStep {
  switch (step.kind) {
    case "matrix_scale": return { kind: step.kind, selectedMaximumRow: step.selectedMaximumRow, matrixInfNorm: step.matrixInfNorm, pivotUlpFactor: step.pivotUlpFactor, numberEpsilon: step.numberEpsilon, tauPivot: step.tauPivot };
    case "factorization_start": case "factorization_complete": return { kind: step.kind };
    case "pivot_selection": return { kind: step.kind, column: step.column, selectedRow: step.selectedRow, selectedPivotValue: step.selectedPivotValue, selectedAbsoluteMagnitude: step.selectedAbsoluteMagnitude, tauPivot: step.tauPivot, accepted: step.accepted };
    case "row_swap": return { kind: step.kind, column: step.column, firstRow: step.firstRow, secondRow: step.secondRow, permutationBefore: step.permutationBefore, permutationAfter: step.permutationAfter };
    case "elimination": return { kind: step.kind, column: step.column, pivotRow: step.pivotRow, targetRow: step.targetRow, pivotValue: step.pivotValue, targetColumnValueBefore: step.targetColumnValueBefore, multiplier: step.multiplier, targetRowBefore: step.targetRowBefore, pivotRowUsed: step.pivotRowUsed, targetRowAfter: step.targetRowAfter };
    case "right_hand_side_permutation": return { kind: step.kind, permutedB: step.permutedB };
    case "forward_substitution": case "backward_substitution": return {
      row: step.row, rightHandSideValue: step.rightHandSideValue, numeratorBeforeDivision: step.numeratorBeforeDivision, diagonalValue: step.diagonalValue,
      ...(step.accumulatedKnownTermSum === undefined ? {} : { accumulatedKnownTermSum: step.accumulatedKnownTermSum }),
      ...(step.kind === "forward_substitution" ? { kind: step.kind, resultingY: step.resultingY } : { kind: step.kind, resultingXHat: step.resultingXHat }),
    };
    case "residual_component": return { kind: step.kind, row: step.row, matrixVectorValue: step.matrixVectorValue, originalBValue: step.originalBValue, residualComponent: step.residualComponent };
    case "residual_inf_norm": return { kind: step.kind, selectedMaximumRow: step.selectedMaximumRow, residualInfNorm: step.residualInfNorm };
    case "preset_reference_difference": return { kind: step.kind, presetId: step.presetId, selectedMaximumIndex: step.selectedMaximumIndex, referenceDifferenceInf: step.referenceDifferenceInf };
  }
  const unsupported: never = step;
  throw new Error(`Unsupported stored trace step: ${unsupported}`);
}

/** The Lab owns freshness. This reads successful evidence; it never solves or replays a trace. */
export function buildLinearSystemsTutorContext(session: LinearSystemsSessionState): LinearSystemsLabContext | null {
  const result = session.latestSuccessfulResult;
  const vector = (value: unknown): boolean => Array.isArray(value) && value.length === session.dimension && value.every(value => typeof value === "number" && Number.isFinite(value));
  const matrix = (value: unknown): boolean => Array.isArray(value) && value.length === session.dimension && value.every(vector);
  if (session.resultStatus !== "current" || !result || !session.inputFingerprint ||
    session.inputFingerprint !== result.inputFingerprint || session.dimension !== result.dimension ||
    !Number.isInteger(session.dimension) || session.dimension < LINEAR_TUTOR_LIMITS.minDimension || session.dimension > LINEAR_TUTOR_LIMITS.maxDimension ||
    ![result.originalA, result.P, result.L, result.U].every(matrix) || ![result.originalB, result.xHat, result.permutation, result.residual].every(vector) ||
    !Array.isArray(result.pivots) || result.pivots.length !== session.dimension ||
    ![result.residualInfNorm, result.matrixInfNorm, result.tauPivot, result.rowSwapCount].every(value => typeof value === "number" && Number.isFinite(value) && value >= 0) ||
    !result.trace || !Array.isArray(result.trace.steps) || result.trace.processKind !== "bounded_finite" ||
    result.trace.retentionPolicy !== "all_meaningful_steps" || result.trace.omittedMiddleWork || !result.trace.finalStepRetained ||
    result.trace.steps.length !== result.trace.totalMeaningfulStepCount || result.trace.steps.length !== result.trace.retainedStepCount ||
    result.trace.steps.length > LINEAR_TUTOR_LIMITS.traceSteps ||
    createLinearSystemsInputFingerprint(result.originalA, result.originalB) !== session.inputFingerprint) return null;
  const preset = matchLinearSystemsPreset(result.originalA, result.originalB);
  const reference = preset && preset.id === result.presetId && result.presetName === preset.name &&
    result.referenceSolution?.length === preset.xRef.length && result.referenceSolution.every((value, index) => Object.is(value, preset.xRef[index])) &&
    result.referenceDifferenceInf !== undefined && Number.isFinite(result.referenceDifferenceInf) && result.referenceDifferenceInf >= 0
    ? Object.freeze({ label: "Difference from preset reference solution" as const, presetId: result.presetId, presetName: result.presetName,
      solution: result.referenceSolution, differenceInf: result.referenceDifferenceInf }) : undefined;
  return Object.freeze({
    dimension: result.dimension, originalA: result.originalA, originalB: result.originalB, xHat: result.xHat,
    factorization: Object.freeze({ convention: "PA=LU" as const, P: result.P, L: result.L, U: result.U, permutation: result.permutation, pivots: result.pivots, rowSwapCount: result.rowSwapCount }),
    diagnostics: Object.freeze({ residual: result.residual, residualInfNorm: result.residualInfNorm, matrixInfNorm: result.matrixInfNorm, tauPivot: result.tauPivot }),
    ...(reference ? { reference } : {}),
    trace: Object.freeze({ detail: "selected_fields" as const, omittedDetails: LINEAR_TUTOR_TRACE_OMISSIONS,
      totalStepCount: result.trace.steps.length, steps: Object.freeze(result.trace.steps.map(step => Object.freeze(projectStep(step)))) }),
  });
}
