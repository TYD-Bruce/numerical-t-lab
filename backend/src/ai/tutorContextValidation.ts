import { ODE_TUTOR_SERIES_LIMITS, LINEAR_TUTOR_LIMITS, LINEAR_TUTOR_TRACE_OMISSIONS, type OdeLabContext, type LinearSystemsLabContext } from "@numerical-t-lab/contracts/tutor";
import { TutorConnectionError } from "../localTutorPolicy.js";

type RecordValue = Record<string, unknown>;
function requireValue(condition: unknown): asserts condition {
  if (!condition) throw new TutorConnectionError("invalid_context");
}
function record(value: unknown, required: readonly string[], optional: readonly string[] = []): RecordValue {
  requireValue(value && typeof value === "object" && !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null));
  const data = value as RecordValue;
  requireValue(required.every(key => Object.hasOwn(data, key) && data[key] !== undefined) &&
    Object.keys(data).every(key => required.includes(key) || optional.includes(key)));
  return data;
}
function finite(value: unknown, minimum = -Infinity): void {
  requireValue(typeof value === "number" && Number.isFinite(value) && value >= minimum);
}
function integer(value: unknown, minimum = 0): void {
  requireValue(typeof value === "number" && Number.isSafeInteger(value) && value >= minimum);
}
function text(value: unknown, maxBytes: number): void {
  requireValue(typeof value === "string" && value.trim() && Buffer.byteLength(value) <= maxBytes);
}
function array(value: unknown, max: number, item: (value: unknown) => void, minimum = 0): unknown[] {
  requireValue(Array.isArray(value) && value.length >= minimum && value.length <= max);
  for (const element of value) item(element);
  return value;
}
function optionalNumbers(data: RecordValue, names: readonly string[], minimum = -Infinity): void {
  for (const name of names) if (data[name] !== undefined) finite(data[name], minimum);
}
function choice(value: unknown, choices: readonly string[]): void {
  requireValue(typeof value === "string" && choices.includes(value));
}

function validateStudy(value: unknown): void {
  const study = record(value, ["theoreticalOrder", "interpretation", "levels", "consistencyCheck"]);
  integer(study.theoreticalOrder, 1);
  // Wire budgets bound this evidence projection; they do not change study algorithms.
  const levels = array(study.levels, 16, () => {}, 1);
  const pair = (coarse: unknown, fine: unknown) => {
    integer(coarse); integer(fine);
    requireValue((coarse as number) < (fine as number) && (fine as number) < levels.length);
  };
  for (const [index, raw] of levels.entries()) {
    const level = record(raw, ["level", "h", "finalTimeError", "maximumGlobalError"], ["finalObservedOrder", "maximumObservedOrder"]);
    requireValue(level.level === index);
    finite(level.h); requireValue((level.h as number) > 0);
    finite(level.finalTimeError, 0); finite(level.maximumGlobalError, 0);
    for (const name of ["finalObservedOrder", "maximumObservedOrder"]) {
      if (level[name] === undefined) continue;
      const assessment = record(level[name], ["status", "message", "coarseLevel", "fineLevel"], ["value"]);
      choice(assessment.status, ["reliable", "below_resolution", "no_improvement", "negative", "near_zero", "unavailable"]);
      text(assessment.message, 2048); optionalNumbers(assessment, ["value"]);
      pair(assessment.coarseLevel, assessment.fineLevel);
      requireValue(assessment.fineLevel === index);
    }
  }
  const interpretation = record(study.interpretation, ["kind", "title", "explanation", "evidencePairs"], ["primaryObservedOrder"]);
  choice(interpretation.kind, ["consistent_with_theory", "approaching_theory", "not_yet_asymptotic", "refinement_not_improving", "order_unavailable"]);
  text(interpretation.title, 512); text(interpretation.explanation, 4096);
  optionalNumbers(interpretation, ["primaryObservedOrder"]);
  array(interpretation.evidencePairs, 16, value => {
    requireValue(Array.isArray(value) && value.length === 2);
    pair(value[0], value[1]);
  });
  const consistency = record(study.consistencyCheck, ["status", "statement"], ["maximumNormalizedResidual", "maximumResidualTime"]);
  choice(consistency.status, ["passed", "warning"]);
  requireValue(consistency.statement === "This is a numerical consistency check, not a formal proof.");
  optionalNumbers(consistency, ["maximumNormalizedResidual"], 0);
  optionalNumbers(consistency, ["maximumResidualTime"]);
}

/** Closed, finite, bounded data only. Freshness and numerical authority remain Lab-owned. */
export function validateOdeTutorContext(value: unknown): OdeLabContext {
  const context = record(value, ["problem", "method", "result"], ["convergenceStudy"]);
  const problem = record(context.problem, ["kind", "equationDisplay", "t0", "tEnd", "h"], ["y0", "u0", "v0"]);
  choice(problem.kind, ["first_order", "second_order"]);
  text(problem.equationDisplay, 8192);
  for (const field of ["t0", "tEnd", "h"]) finite(problem[field]);
  requireValue((problem.h as number) > 0 && (problem.tEnd as number) > (problem.t0 as number));
  if (problem.kind === "first_order") {
    finite(problem.y0); requireValue(problem.u0 === undefined && problem.v0 === undefined);
  } else {
    finite(problem.u0); finite(problem.v0); requireValue(problem.y0 === undefined);
  }

  const method = record(context.method, ["displayName", "family", "isImplicit"], ["order", "startupMethod", "formulaDisplay", "coefficients", "implicitDiagnostics", "notes"]);
  text(method.displayName, 512); text(method.family, 128);
  requireValue(typeof method.isImplicit === "boolean");
  if (method.order !== undefined) integer(method.order, 1);
  if (method.startupMethod !== undefined) text(method.startupMethod, 512);
  if (method.formulaDisplay !== undefined) text(method.formulaDisplay, 4096);
  if (method.coefficients !== undefined) {
    const coefficients = record(method.coefficients, [], ["alpha", "beta"]);
    for (const name of ["alpha", "beta"]) if (coefficients[name] !== undefined) array(coefficients[name], 16, value => finite(value), 1);
  }
  if (method.notes !== undefined) array(method.notes, 16, value => text(value, 2048));
  if (method.implicitDiagnostics !== undefined) {
    const diagnostics = record(method.implicitDiagnostics, ["nonlinearMethod", "totalIterations", "maxIterationsPerStep", "finalResidual", "maxResidual", "failedSteps"]);
    choice(diagnostics.nonlinearMethod, ["newton", "fixed_point"]);
    for (const name of ["totalIterations", "maxIterationsPerStep", "failedSteps"]) integer(diagnostics[name]);
    // The producer records the signed last algebraic residual and its maximum magnitude.
    finite(diagnostics.finalResidual); finite(diagnostics.maxResidual, 0);
    requireValue(diagnostics.failedSteps === 0);
  }

  const result = record(context.result, ["finalT", "finalY", "pointCount", "seriesPreview"], ["finalV", "seriesFull", "tMin", "tMax", "yMin", "yMax"]);
  finite(result.finalT); finite(result.finalY); integer(result.pointCount, 2);
  optionalNumbers(result, ["finalV", "tMin", "tMax", "yMin", "yMax"]);
  const row = (value: unknown) => {
    const point = record(value, ["t", "y"], ["v"]);
    finite(point.t); finite(point.y); optionalNumbers(point, ["v"]);
  };
  const preview = array(result.seriesPreview, ODE_TUTOR_SERIES_LIMITS.preview, row, 1);
  requireValue(preview.length <= (result.pointCount as number));
  if (result.seriesFull !== undefined) {
    const full = array(result.seriesFull, ODE_TUTOR_SERIES_LIMITS.full, row, 2);
    requireValue(full.length === result.pointCount);
  }
  for (const [minimum, maximum] of [["tMin", "tMax"], ["yMin", "yMax"]]) {
    if (result[minimum] !== undefined && result[maximum] !== undefined) requireValue((result[minimum] as number) <= (result[maximum] as number));
  }
  if (context.convergenceStudy !== undefined) {
    requireValue(problem.kind === "first_order");
    validateStudy(context.convergenceStudy);
  }
  // Every reachable value was checked above. Serialization captures it before
  // any async boundary; no source object is mutated or retained by a session.
  return context as unknown as OdeLabContext;
}

/** Closed transport shape, not a recomputation or attestation of numerical evidence. */
export function validateLinearSystemsTutorContext(value: unknown): LinearSystemsLabContext {
  const context = record(value, ["dimension", "originalA", "originalB", "xHat", "factorization", "diagnostics", "trace"], ["reference"]);
  integer(context.dimension, LINEAR_TUTOR_LIMITS.minDimension);
  const n = context.dimension as number;
  requireValue(n <= LINEAR_TUTOR_LIMITS.maxDimension);
  const index = (value: unknown) => { integer(value); requireValue((value as number) < n); };
  const vector = (value: unknown) => array(value, n, value => finite(value), n);
  const matrix = (value: unknown) => array(value, n, vector, n);
  const permutation = (value: unknown) => {
    const entries = array(value, n, index, n); requireValue(new Set(entries).size === n);
  };
  matrix(context.originalA); vector(context.originalB); vector(context.xHat);
  const factorization = record(context.factorization, ["convention", "P", "L", "U", "permutation", "pivots", "rowSwapCount"]);
  requireValue(factorization.convention === "PA=LU");
  for (const name of ["P", "L", "U"]) matrix(factorization[name]);
  permutation(factorization.permutation);
  integer(factorization.rowSwapCount); requireValue((factorization.rowSwapCount as number) < n);
  const pivots = array(factorization.pivots, n, () => {}, n).map((value, column) => {
    const pivot = record(value, ["column", "selectedRow", "pivotValue"]);
    requireValue(pivot.column === column); index(pivot.selectedRow);
    requireValue((pivot.selectedRow as number) >= column); finite(pivot.pivotValue);
    return pivot;
  });
  const diagnostics = record(context.diagnostics, ["residual", "residualInfNorm", "matrixInfNorm", "tauPivot"]);
  vector(diagnostics.residual);
  for (const name of ["residualInfNorm", "matrixInfNorm", "tauPivot"]) finite(diagnostics[name], 0);
  requireValue((diagnostics.matrixInfNorm as number) > 0);
  let reference: RecordValue | undefined;
  if (context.reference !== undefined) {
    reference = record(context.reference, ["label", "presetId", "presetName", "solution", "differenceInf"]);
    requireValue(reference.label === "Difference from preset reference solution");
    text(reference.presetId, 128); text(reference.presetName, 512);
    vector(reference.solution); finite(reference.differenceInf, 0);
  }
  const trace = record(context.trace, ["detail", "omittedDetails", "totalStepCount", "steps"]);
  requireValue(trace.detail === "selected_fields" && Array.isArray(trace.omittedDetails) &&
    trace.omittedDetails.length === LINEAR_TUTOR_TRACE_OMISSIONS.length &&
    trace.omittedDetails.every((value, i) => value === LINEAR_TUTOR_TRACE_OMISSIONS[i]));
  const steps = array(trace.steps, LINEAR_TUTOR_LIMITS.traceSteps, () => {}, 1);
  requireValue(trace.totalStepCount === steps.length);
  let cursor = 0;
  const step = (kind: string, fields: readonly string[] = [], optional: readonly string[] = []) => {
    const data = record(steps[cursor++], ["kind", ...fields], optional);
    requireValue(data.kind === kind); return data;
  };
  const scale = step("matrix_scale", ["selectedMaximumRow", "matrixInfNorm", "pivotUlpFactor", "numberEpsilon", "tauPivot"]);
  index(scale.selectedMaximumRow); finite(scale.pivotUlpFactor, 1); finite(scale.numberEpsilon, 0);
  requireValue(scale.matrixInfNorm === diagnostics.matrixInfNorm && scale.tauPivot === diagnostics.tauPivot && scale.numberEpsilon === Number.EPSILON);
  step("factorization_start");
  let swaps = 0;
  // Validate the complete stored step order and dimensions, without running arithmetic.
  for (let column = 0; column < n; column++) {
    const pivot = step("pivot_selection", ["column", "selectedRow", "selectedPivotValue", "selectedAbsoluteMagnitude", "tauPivot", "accepted"]);
    requireValue(pivot.column === column && pivot.selectedRow === pivots[column].selectedRow && pivot.selectedPivotValue === pivots[column].pivotValue && pivot.accepted === true && pivot.tauPivot === diagnostics.tauPivot);
    finite(pivot.selectedAbsoluteMagnitude, 0);
    requireValue((pivot.selectedAbsoluteMagnitude as number) > (diagnostics.tauPivot as number));
    if (pivot.selectedRow !== column) {
      const swap = step("row_swap", ["column", "firstRow", "secondRow", "permutationBefore", "permutationAfter"]);
      requireValue(swap.column === column && swap.firstRow === column && swap.secondRow === pivot.selectedRow);
      permutation(swap.permutationBefore); permutation(swap.permutationAfter); swaps++;
    }
    for (let row = column + 1; row < n; row++) {
      const elimination = step("elimination", ["column", "pivotRow", "targetRow", "pivotValue", "targetColumnValueBefore", "multiplier", "targetRowBefore", "pivotRowUsed", "targetRowAfter"]);
      requireValue(elimination.column === column && elimination.pivotRow === column && elimination.targetRow === row);
      for (const name of ["pivotValue", "targetColumnValueBefore", "multiplier"]) finite(elimination[name]);
      for (const name of ["targetRowBefore", "pivotRowUsed", "targetRowAfter"]) vector(elimination[name]);
    }
  }
  requireValue(swaps === factorization.rowSwapCount);
  step("factorization_complete");
  vector(step("right_hand_side_permutation", ["permutedB"]).permutedB);
  for (const kind of ["forward_substitution", "backward_substitution"]) {
    const output = kind === "forward_substitution" ? "resultingY" : "resultingXHat";
    for (let i = 0; i < n; i++) {
      const substitution = step(kind, ["row", "rightHandSideValue", "numeratorBeforeDivision", "diagonalValue", output], ["accumulatedKnownTermSum"]);
      requireValue(substitution.row === (kind === "forward_substitution" ? i : n - i - 1));
      for (const name of ["rightHandSideValue", "numeratorBeforeDivision", "diagonalValue", output]) finite(substitution[name]);
      requireValue(substitution.diagonalValue !== 0);
      optionalNumbers(substitution, ["accumulatedKnownTermSum"]);
    }
  }
  for (let row = 0; row < n; row++) {
    const residual = step("residual_component", ["row", "matrixVectorValue", "originalBValue", "residualComponent"]);
    requireValue(residual.row === row);
    for (const name of ["matrixVectorValue", "originalBValue", "residualComponent"]) finite(residual[name]);
  }
  const norm = step("residual_inf_norm", ["selectedMaximumRow", "residualInfNorm"]);
  index(norm.selectedMaximumRow); requireValue(norm.residualInfNorm === diagnostics.residualInfNorm);
  if (reference) {
    const comparison = step("preset_reference_difference", ["presetId", "selectedMaximumIndex", "referenceDifferenceInf"]);
    index(comparison.selectedMaximumIndex);
    requireValue(comparison.presetId === reference.presetId && comparison.referenceDifferenceInf === reference.differenceInf);
  }
  requireValue(cursor === steps.length);
  return context as unknown as LinearSystemsLabContext;
}
