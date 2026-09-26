import { LINEAR_TUTOR_TRACE_OMISSIONS, type LinearSystemsLabContext } from "@numerical-t-lab/contracts/tutor";

/** Synthetic, finite 2x2 evidence for protocol tests; no provider or credential. */
export function linearTutorFixture(): LinearSystemsLabContext {
  const tauPivot = 64 * Number.EPSILON * 3;
  return {
    dimension: 2, originalA: [[2, 1], [0, 3]], originalB: [4, 6], xHat: [1, 2],
    factorization: { convention: "PA=LU", P: [[1, 0], [0, 1]], L: [[1, 0], [0, 1]], U: [[2, 1], [0, 3]], permutation: [0, 1],
      pivots: [{ column: 0, selectedRow: 0, pivotValue: 2 }, { column: 1, selectedRow: 1, pivotValue: 3 }], rowSwapCount: 0 },
    diagnostics: { residual: [0, 0], residualInfNorm: 0, matrixInfNorm: 3, tauPivot },
    trace: { detail: "selected_fields", omittedDetails: LINEAR_TUTOR_TRACE_OMISSIONS, totalStepCount: 14, steps: [
      { kind: "matrix_scale", selectedMaximumRow: 0, matrixInfNorm: 3, pivotUlpFactor: 64, numberEpsilon: Number.EPSILON, tauPivot },
      { kind: "factorization_start" },
      { kind: "pivot_selection", column: 0, selectedRow: 0, selectedPivotValue: 2, selectedAbsoluteMagnitude: 2, tauPivot, accepted: true },
      { kind: "elimination", column: 0, pivotRow: 0, targetRow: 1, pivotValue: 2, targetColumnValueBefore: 0, multiplier: 0, targetRowBefore: [0, 3], pivotRowUsed: [2, 1], targetRowAfter: [0, 3] },
      { kind: "pivot_selection", column: 1, selectedRow: 1, selectedPivotValue: 3, selectedAbsoluteMagnitude: 3, tauPivot, accepted: true },
      { kind: "factorization_complete" },
      { kind: "right_hand_side_permutation", permutedB: [4, 6] },
      { kind: "forward_substitution", row: 0, rightHandSideValue: 4, numeratorBeforeDivision: 4, diagonalValue: 1, resultingY: 4, accumulatedKnownTermSum: 0 },
      { kind: "forward_substitution", row: 1, rightHandSideValue: 6, numeratorBeforeDivision: 6, diagonalValue: 1, resultingY: 6, accumulatedKnownTermSum: 0 },
      { kind: "backward_substitution", row: 1, rightHandSideValue: 6, numeratorBeforeDivision: 6, diagonalValue: 3, resultingXHat: 2, accumulatedKnownTermSum: 0 },
      { kind: "backward_substitution", row: 0, rightHandSideValue: 4, numeratorBeforeDivision: 2, diagonalValue: 2, resultingXHat: 1, accumulatedKnownTermSum: 2 },
      { kind: "residual_component", row: 0, matrixVectorValue: 4, originalBValue: 4, residualComponent: 0 },
      { kind: "residual_component", row: 1, matrixVectorValue: 6, originalBValue: 6, residualComponent: 0 },
      { kind: "residual_inf_norm", selectedMaximumRow: 0, residualInfNorm: 0 },
    ] },
  };
}
