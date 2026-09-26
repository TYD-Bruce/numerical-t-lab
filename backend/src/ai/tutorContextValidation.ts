import { ODE_TUTOR_SERIES_LIMITS, type OdeLabContext } from "@numerical-t-lab/contracts/tutor";
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
