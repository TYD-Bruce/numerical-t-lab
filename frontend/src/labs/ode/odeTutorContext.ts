import type { SeriesPoint } from "@numerical-t-lab/numerics/ode/solvers";
import type { OdeLabContext, TutorConvergenceStudy } from "@numerical-t-lab/contracts/tutor";
import { ODE_TUTOR_SERIES_LIMITS } from "@numerical-t-lab/contracts/tutor";
import type { OdeTutorProblemInputs } from "./odeTutorTypes";
import type { ReadonlySolverResult } from "./odeSession";

function sampleSeries(points: readonly SeriesPoint[], max: number): readonly SeriesPoint[] {
  if (points.length <= max) return points;
  const out: SeriesPoint[] = [];
  const lastIdx = points.length - 1;
  for (let i = 0; i < max; i++) {
    const idx = Math.round((i / (max - 1)) * lastIdx);
    out.push(points[idx]!);
  }
  return out;
}

function seriesBounds(points: readonly SeriesPoint[]): {
  tMin: number;
  tMax: number;
  yMin: number;
  yMax: number;
} {
  let tMin = points[0]!.t;
  let tMax = tMin;
  let yMin = points[0]!.y;
  let yMax = yMin;
  for (const p of points) {
    tMin = Math.min(tMin, p.t);
    tMax = Math.max(tMax, p.t);
    yMin = Math.min(yMin, p.y);
    yMax = Math.max(yMax, p.y);
  }
  return { tMin, tMax, yMin, yMax };
}

function toSeriesRow(p: SeriesPoint): { t: number; y: number; v?: number } {
  const row: { t: number; y: number; v?: number } = { t: p.t, y: p.y };
  if (p.v !== undefined) row.v = p.v;
  return row;
}

export function buildOdeLabContext(
  result: ReadonlySolverResult,
  problem: OdeTutorProblemInputs,
  convergenceStudy?: TutorConvergenceStudy
): OdeLabContext {
  const series = result.points;
  const last = series[series.length - 1]!;
  const bounds = seriesBounds(series);
  const small = series.length <= ODE_TUTOR_SERIES_LIMITS.full;

  const resultBlock: OdeLabContext["result"] = {
    finalT: last.t,
    finalY: last.y,
    pointCount: series.length,
    seriesPreview: sampleSeries(series, ODE_TUTOR_SERIES_LIMITS.preview).map(toSeriesRow),
    ...bounds,
  };
  if (last.v !== undefined) resultBlock.finalV = last.v;
  if (small) resultBlock.seriesFull = series.map(toSeriesRow);

  const md = result.metadata;
  return {
    problem: {
      kind: problem.kind,
      equationDisplay: problem.equationDisplay,
      t0: problem.t0,
      tEnd: problem.tEnd,
      h: problem.h,
      ...(problem.y0 !== undefined ? { y0: problem.y0 } : {}),
      ...(problem.u0 !== undefined ? { u0: problem.u0 } : {}),
      ...(problem.v0 !== undefined ? { v0: problem.v0 } : {}),
    },
    method: {
      displayName: md.displayName,
      family: md.family,
      order: md.order,
      isImplicit: md.isImplicit,
      startupMethod: md.startupMethod,
      formulaDisplay: md.formulaDisplay,
      coefficients: md.coefficients ? {
        ...(md.coefficients.alpha ? { alpha: [...md.coefficients.alpha] } : {}),
        ...(md.coefficients.beta ? { beta: [...md.coefficients.beta] } : {}),
      } : undefined,
      ...(md.implicitDiagnostics
        ? { implicitDiagnostics: { ...md.implicitDiagnostics } }
        : {}),
      notes: [...md.notes],
    },
    result: resultBlock,
    ...(convergenceStudy ? { convergenceStudy } : {}),
  };
}
