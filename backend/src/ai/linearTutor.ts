import type { ChatResponse, LinearSystemsLabContext } from "@numerical-t-lab/contracts/tutor";

export const LINEAR_SYSTEMS_TUTOR_PROMPT = `You are the English-only AI Tutor for the Linear Systems Lab in Numerical T Lab. Explain only the supplied current successful Gaussian elimination with partial pivoting result. Be concise, accurate and student-friendly.

Use originalA, originalB and xHat as the recorded input and computed approximation. The factorization convention is PA=LU; permutation[row] identifies the original row now at that position. Stored row and column indices are zero-based; label them one-based for the learner. Explain the recorded pivots and row swaps, including that only previously filled L columns are swapped. Do not solve again, change the matrix, run tools, invent arithmetic, or generate a new trace.

The residual is r=b-A*xHat, using the original A and b. Its infinity norm is not solution error. A small residual does not establish a small solution error. No condition number, backward error, or forward error bound has been computed. Do not fabricate those values or an accuracy guarantee. A preset reference comparison, when supplied, is the difference from that preset reference solution, not a general exact-solution error.

The recorded tauPivot is an engineering small-pivot safeguard based on the original matrix infinity norm and the stored matrix_scale metadata. It is not a proof of singularity or nonsingularity; do not infer a condition number from it. Do not infer why any failed run failed from a previous successful result.

The trace contains selected fields from all stored meaningful steps in their recorded order. Its omittedDetails explicitly names unavailable detail: matrix-scale terms, pivot candidates, full intermediate matrices, swapped matrix rows, substitution contributions, residual products, and reference components. Do not reconstruct or invent these omitted calculations. Explain available scalar/row evidence, state the missing detail when relevant, and direct the learner to the Lab's stored computation trace. An absent accumulatedKnownTermSum is unavailable, not zero; the recorded sequential subtraction numerator remains the authority. Never replace current evidence with values from earlier turns.

Reply with one JSON object containing only "message": English plain text, 2–5 short paragraphs. Controlled \\( ... \\) or \\[ ... \\] math is display-only. No HTML, Markdown, dollar-sign math, chartInstruction, tools, solver actions or executable expressions. If optional JSON is unavailable, a complete plain-text explanation is acceptable.`;

/** Deterministic demo content; it reads validated evidence and never invokes a model or solver. */
export function buildLinearTutorDemoResponse(context: LinearSystemsLabContext, question: string): ChatResponse {
  const query = question.toLowerCase(), diagnostics = context.diagnostics, factors = context.factorization;
  let message: string;
  if (/condition|bound|backward error/.test(query)) {
    message = `No condition number, backward error or forward error bound is computed for this run. The stored residual infinity norm is ${diagnostics.residualInfNorm}. A small residual does not establish a small solution error.`;
  } else if (/error|accuracy|reference|exact/.test(query)) {
    message = context.reference
      ? `${context.reference.label}: ${context.reference.differenceInf} in the infinity norm, for ${context.reference.presetName}. This compares the computed approximation with the supplied preset reference; it is not a general exact-solution error or an accuracy guarantee.`
      : `No preset reference comparison is available for this input. The residual infinity norm is ${diagnostics.residualInfNorm}, but residual is not solution error and does not establish the accuracy of the computed approximation.`;
  } else if (/residual/.test(query)) {
    message = `The stored residual is \\(r=b-A\\hat{x}\\), computed from the original matrix and right-hand side. Its entries are [${diagnostics.residual.join(", ")}], with infinity norm ${diagnostics.residualInfNorm}. This measures equation mismatch, not solution error.`;
  } else if (/pivot|swap|singular/.test(query)) {
    const first = factors.pivots[0];
    message = `The first stored pivot selects row ${first.selectedRow + 1} in column ${first.column + 1}, with value ${first.pivotValue}. This run records ${factors.rowSwapCount} row swap(s). The convention is \\(PA=LU\\); row swaps also move only the previously filled columns of L.\n\nThe recorded small-pivot threshold is ${diagnostics.tauPivot}, using the original matrix infinity norm ${diagnostics.matrixInfNorm}. This engineering safeguard is not a proof of singularity or nonsingularity and does not supply a condition number. Individual candidate comparisons are omitted from the Tutor projection.`;
  } else if (/step|trace|eliminat|substitut/.test(query)) {
    const elimination = context.trace.steps.find(step => step.kind === "elimination");
    message = `The Tutor receives selected fields from all ${context.trace.totalStepCount} stored steps in their original order. `;
    if (elimination?.kind === "elimination") message += `The first elimination uses pivot row ${elimination.pivotRow + 1} for target row ${elimination.targetRow + 1}, with recorded multiplier ${elimination.multiplier}; the stored target row afterward is [${elimination.targetRowAfter.join(", ")}]. `;
    message += "Full intermediate matrices and detailed arithmetic contributions are omitted here. Inspect the Lab's computation trace for those details; this response does not reconstruct them.";
  } else if (/factor|\blu\b|pa\s*=\s*lu|permut/.test(query)) {
    message = `This result uses \\(PA=LU\\). The final row order is [${factors.permutation.map(row => row + 1).join(", ")}] in one-based labels, after ${factors.rowSwapCount} row swap(s). The stored lower and upper triangular factors support forward substitution followed by backward substitution. Their computed approximation is [${context.xHat.join(", ")}].`;
  } else if (/change|edit|replace|rerun|solve/.test(query)) {
    message = "Tutor explains the stored result and cannot edit the matrix or run a new solve. Use the Lab's Data step to change the inputs and Solve to obtain new evidence.";
  } else {
    message = `This ${context.dimension}×${context.dimension} run used Gaussian elimination with partial pivoting and the convention \\(PA=LU\\). The computed approximation is [${context.xHat.join(", ")}]. The stored residual infinity norm is ${diagnostics.residualInfNorm}; this is equation mismatch, not solution error. Ask about pivots, factors, stored steps, or the residual.`;
  }
  return { message: message + "\n\n— Demo mode: replies are generated from your run data on the server; no live AI model is used.", demoMode: true };
}
