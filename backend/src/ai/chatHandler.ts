/**
 * Shared chat handler for Vercel serverless and local Express dev server.
 * OPENAI_API_KEY must only exist in server/serverless environment.
 */

import type { ChatRequest } from "@numerical-t-lab/contracts/tutor";
import { handleLinearTutorRequest } from "./linearTutorHandler.js";
import { SYSTEM_PROMPT } from "./odeTutorPrompt.js";
export { SYSTEM_PROMPT } from "./odeTutorPrompt.js";

export type ChatHandlerBody = ChatRequest<Record<string, unknown>> & { profile?: string };

export interface ChatHandlerResult {
  status: number;
  body: Record<string, unknown>;
}

const MAX_SERIES_IN_CONTEXT = 24;

function isTruthyEnv(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

function isMockMode(): boolean {
  return isTruthyEnv(process.env.AI_TUTOR_MOCK);
}

/** Appended to demo/mock tutor replies — honest, professional disclaimer. */
const DEMO_REPLY_FOOTER =
  "\n\n— Demo mode: replies are generated from your run data on the server; no live AI model is used.";

function demoReply(body: string): string {
  return body.trimEnd() + DEMO_REPLY_FOOTER;
}

function ctxString(ctx: Record<string, unknown>, path: string[]): string | undefined {
  let cur: unknown = ctx;
  for (const key of path) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return typeof cur === "string" ? cur : undefined;
}

function ctxNumber(ctx: Record<string, unknown>, path: string[]): number | undefined {
  let cur: unknown = ctx;
  for (const key of path) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return typeof cur === "number" && Number.isFinite(cur) ? cur : undefined;
}

function ctxRecord(
  ctx: Record<string, unknown>,
  path: string[]
): Record<string, unknown> | undefined {
  let cur: unknown = ctx;
  for (const key of path) {
    if (!cur || typeof cur !== "object" || Array.isArray(cur)) return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur && typeof cur === "object" && !Array.isArray(cur)
    ? (cur as Record<string, unknown>)
    : undefined;
}

function convergenceLevels(
  convergence: Record<string, unknown>
): Record<string, unknown>[] {
  const levels = convergence.levels;
  return Array.isArray(levels)
    ? levels.filter(
        (level): level is Record<string, unknown> =>
          !!level && typeof level === "object" && !Array.isArray(level)
      )
    : [];
}

function finiteText(value: number | undefined): string {
  return value === undefined ? "not supplied" : value.toPrecision(8);
}

function evidencePairsText(interpretation: Record<string, unknown> | undefined): string {
  const pairs = interpretation?.evidencePairs;
  if (!Array.isArray(pairs) || pairs.length === 0) return "none supplied";
  return pairs
    .filter(
      (pair): pair is [number, number] =>
        Array.isArray(pair) &&
        pair.length === 2 &&
        pair.every((value) => typeof value === "number" && Number.isFinite(value))
    )
    .map(([coarse, fine]) => `${coarse} to ${fine}`)
    .join(", ") || "none supplied";
}

function latestOrderEvidence(
  levels: Record<string, unknown>[],
  key: "finalObservedOrder" | "maximumObservedOrder"
): Record<string, unknown> | undefined {
  for (let index = levels.length - 1; index >= 0; index -= 1) {
    const value = levels[index]?.[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }
  return undefined;
}

function buildMockResponse(
  context: Record<string, unknown>,
  userMessage: string
): { message: string; chartInstruction?: Record<string, unknown> } {
  const methodName =
    ctxString(context, ["method", "displayName"]) ?? "the selected method";
  const family = ctxString(context, ["method", "family"]) ?? "unknown";
  const order = ctxNumber(context, ["method", "order"]);
  const formula =
    ctxString(context, ["method", "formulaDisplay"]) ??
    "see the Method details panel in the app";
  const isImplicit = (context.method as { isImplicit?: boolean } | undefined)
    ?.isImplicit;
  const equation =
    ctxString(context, ["problem", "equationDisplay"]) ?? "y′ = f(t, y)";
  const h = ctxNumber(context, ["problem", "h"]);
  const t0 = ctxNumber(context, ["problem", "t0"]);
  const tEnd = ctxNumber(context, ["problem", "tEnd"]);
  const finalT = ctxNumber(context, ["result", "finalT"]);
  const finalY = ctxNumber(context, ["result", "finalY"]);
  const pointCount = ctxNumber(context, ["result", "pointCount"]);
  const nonlinearMethod = ctxString(context, ["method", "implicitDiagnostics", "nonlinearMethod"]);
  const totalIterations = ctxNumber(context, ["method", "implicitDiagnostics", "totalIterations"]);
  const maxIterationsPerStep = ctxNumber(context, ["method", "implicitDiagnostics", "maxIterationsPerStep"]);
  const finalResidual = ctxNumber(context, ["method", "implicitDiagnostics", "finalResidual"]);
  const maxResidual = ctxNumber(context, ["method", "implicitDiagnostics", "maxResidual"]);
  const failedSteps = ctxNumber(context, ["method", "implicitDiagnostics", "failedSteps"]);
  const q = userMessage.toLowerCase();
  const convergence = ctxRecord(context, ["convergenceStudy"]);
  const interpretation = convergence
    ? ctxRecord(convergence, ["interpretation"])
    : undefined;
  const levels = convergence ? convergenceLevels(convergence) : [];
  const theoreticalOrder = convergence
    ? ctxNumber(convergence, ["theoreticalOrder"])
    : undefined;
  const primaryObservedOrder = interpretation
    ? ctxNumber(interpretation, ["primaryObservedOrder"])
    : undefined;
  const interpretationKind = interpretation
    ? ctxString(interpretation, ["kind"])
    : undefined;
  const interpretationTitle = interpretation
    ? ctxString(interpretation, ["title"])
    : undefined;
  const interpretationExplanation = interpretation
    ? ctxString(interpretation, ["explanation"])
    : undefined;
  const consistency = convergence
    ? ctxRecord(convergence, ["consistencyCheck"])
    : undefined;
  const asksConvergence =
    q.includes("observed order") ||
    q.includes("not exactly") ||
    q.includes("non-integer") ||
    q.includes("non integer") ||
    q.includes("final-time") ||
    q.includes("final time") ||
    q.includes("maximum error") ||
    q.includes("maximum global") ||
    q.includes("two error") ||
    q.includes("asymptotic") ||
    q.includes("log-log") ||
    q.includes("log log") ||
    q.includes("consistency warning") ||
    q.includes("consistency check") ||
    q.includes("convergence study") ||
    q.includes("refinement not improving") ||
    q.includes("stopped improving");

  const orderLine =
    order !== undefined
      ? `The method metadata reports theoretical order p = ${order} for this run.`
      : "Check the Method details panel for the theoretical order p.";

  let message = "";
  let chartInstruction: Record<string, unknown> | undefined;

  const asksStabilityVsNonlinear =
    q.includes("unstable") || q.includes("stability");
  const asksImplicitDiagnostics =
    q.includes("newton") ||
    q.includes("fixed-point") ||
    q.includes("fixed point") ||
    q.includes("residual") ||
    q.includes("nonlinear") ||
    q.includes("implicit solve") ||
    (q.includes("implicit") && q.includes("fail")) ||
    // Only route stability questions here when this run actually has
    // implicit diagnostics; otherwise fall through to general method help.
    (asksStabilityVsNonlinear && !!nonlinearMethod);

  if (asksConvergence && !convergence) {
    message = demoReply(
      "Run a current Convergence Study first. I do not have current convergence evidence in this Tutor context, so I will not invent an observed order, error value, or interpretation."
    );
  } else if (convergence && (q.includes("consistency warning") || q.includes("consistency check"))) {
    const status = consistency ? ctxString(consistency, ["status"]) : undefined;
    const residual = consistency
      ? ctxNumber(consistency, ["maximumNormalizedResidual"])
      : undefined;
    const residualTime = consistency
      ? ctxNumber(consistency, ["maximumResidualTime"])
      : undefined;
    message = demoReply(
      `The supplied consistency status is ${status ?? "not supplied"}. Its maximum normalized residual is ${finiteText(residual)}${residualTime === undefined ? "" : ` at t = ${finiteText(residualTime)}`}. This is a numerical consistency check, not a formal proof. A warning invites review or an explicit run-anyway choice; it does not prove the exact solution is wrong.`
    );
  } else if (convergence && (q.includes("log-log") || q.includes("log log") || (q.includes("graph") && q.includes("convergence")))) {
    message = demoReply(
      `In the convergence log-log graph, moving right means using a smaller step size h, and both axes are logarithmic. The measured-error slope is compared with theoretical order p = ${finiteText(theoreticalOrder)}. The theoretical reference line compares slope only; it does not claim a known theoretical error constant. The study's primary conclusion uses maximum global error, while final-time error is secondary.`
    );
  } else if (convergence && (q.includes("final-time") || q.includes("final time") || q.includes("two error") || (q.includes("maximum") && q.includes("error")))) {
    const finest = levels.at(-1);
    const levelH = finest ? ctxNumber(finest, ["h"]) : undefined;
    const finalError = finest ? ctxNumber(finest, ["finalTimeError"]) : undefined;
    const maximumError = finest ? ctxNumber(finest, ["maximumGlobalError"]) : undefined;
    message = demoReply(
      `At the finest supplied level, h = ${finiteText(levelH)}, final-time error is ${finiteText(finalError)}, and maximum global error is ${finiteText(maximumError)}. Final-time error measures only the endpoint; maximum global error takes the largest error over the whole numerical grid. Endpoint cancellation can make them differ, but these values alone do not prove cancellation occurred.`
    );
  } else if (convergence && (q.includes("stopped improving") || q.includes("refinement not improving"))) {
    const latest = latestOrderEvidence(levels, "maximumObservedOrder");
    const status = latest ? ctxString(latest, ["status"]) : undefined;
    const detail = latest ? ctxString(latest, ["message"]) : undefined;
    message = demoReply(
      `The primary interpretation based on maximum global error is ${interpretationTitle ?? interpretationKind ?? "not supplied"}. The latest supplied primary maximum-global-error evidence status is ${status ?? "not supplied"}${detail ? `: ${detail}` : "."} Possible explanations include instability, roundoff, startup error, an invalid exact solution, or a grid that is not yet in the asymptotic region; the supplied evidence does not prove one specific cause.`
    );
  } else if (convergence && q.includes("asymptotic")) {
    message = demoReply(
      `The supplied study classification is ${interpretationKind ?? "not supplied"}: ${interpretationTitle ?? "no title supplied"}. ${interpretationExplanation ?? "No additional explanation was supplied."}${primaryObservedOrder === undefined ? "" : ` The primary observed order based on maximum global error is ${finiteText(primaryObservedOrder)}.`} I am reporting the model's classification rather than recomputing it.`
    );
  } else if (convergence && (q.includes("observed order") || q.includes("not exactly") || q.includes("non-integer") || q.includes("non integer"))) {
    const observed = primaryObservedOrder === undefined
      ? "The primary observed order is unavailable, so I will not replace it with a guess."
      : `The primary observed order based on maximum global error is ${finiteText(primaryObservedOrder)}, compared with theoretical order p = ${finiteText(theoreticalOrder)}.`;
    message = demoReply(
      `${observed} ${interpretationTitle ?? interpretationKind ?? "No interpretation title was supplied"}. ${interpretationExplanation ?? ""} Zero-based evidence level pairs: ${evidencePairsText(interpretation)}. An observed order need not be an integer because it comes from finite error ratios and may reflect pre-asymptotic behavior or roundoff; those are possibilities, not proven causes for this run.`
    );
  } else if (asksImplicitDiagnostics) {
    if (!nonlinearMethod) {
      message = demoReply(
        "The selected method did not expose an implicit nonlinear solve for this run, so the supplied context has no iteration or residual diagnostics. I will not infer or invent those values."
      );
    } else {
      const solverName = nonlinearMethod === "fixed_point" ? "Fixed-point" : "Newton";
      const finalResidualText = finalResidual?.toExponential(3) ?? "not supplied";
      const maxResidualText = maxResidual?.toExponential(3) ?? "not supplied";
      if (q.includes("residual")) {
        message = demoReply(
          `The residual is the remaining algebraic mismatch in the implicit equation G(u) = 0. For this run, ${solverName} reports final residual ${finalResidualText} and maximum residual ${maxResidualText}. Smaller residual magnitude means the computed step satisfies its implicit equation more closely; these values alone do not prove a general convergence guarantee.`
        );
      } else if (q.includes("iteration") || q.includes("how many")) {
        message = demoReply(
          `${solverName} used ${totalIterations ?? "not supplied"} nonlinear iterations in total. The largest count for one time step was ${maxIterationsPerStep ?? "not supplied"}. These are the actual aggregate diagnostics supplied by this run.`
        );
      } else if (
        asksStabilityVsNonlinear ||
        q.includes("fail") ||
        q.includes("converge")
      ) {
        message = demoReply(
          `This run reports ${failedSteps ?? "not supplied"} failed steps for the ${solverName} nonlinear solve. Nonlinear-solver convergence is different from absolute stability of the numerical method: a stable implicit scheme can still fail if its algebraic equation is not solved successfully, and successful Newton convergence does not by itself prove the scheme is stable for every problem or step size.`
        );
      } else {
        message = demoReply(
          [
            "Implicit solve diagnostics from this run:",
            `• Nonlinear solver: ${solverName}`,
            `• Total iterations: ${totalIterations ?? "not supplied"}`,
            `• Maximum in one step: ${maxIterationsPerStep ?? "not supplied"}`,
            `• Final residual: ${finalResidualText}`,
            `• Maximum residual: ${maxResidualText}`,
            `• Failed steps: ${failedSteps ?? "not supplied"}`,
            "Residual is the remaining algebraic mismatch in G(u) = 0. Nonlinear convergence and method stability are not the same claim.",
          ].join("\n")
        );
      }
    }
  } else if (
    q.includes("zoom") ||
    q.includes("focus") ||
    /t from|time from|graph.*\d/.test(q)
  ) {
    const tMin = t0 ?? 0;
    const tMax =
      q.includes("0 to 2") || q.includes("0–2")
        ? 2
        : (tEnd ?? finalT ?? tMin + 2);
    message = demoReply(
      `I can narrow the plot to t ∈ [${tMin}, ${tMax}] so you can inspect the computed numerical approximation on that window. The curve still comes from your computed series (${pointCount ?? "?"} points, h = ${h ?? "?"}).`
    );
    chartInstruction = {
      type: "zoom_range",
      tMin,
      tMax,
    };
  } else if (/\btable\b/.test(q) || /\bsummary\b/.test(q)) {
    message = demoReply(
      `Table summary for ${methodName} on the current IVP:\n\n• Problem: ${equation}\n• Grid: t₀ = ${t0 ?? "?"}, t_end = ${tEnd ?? "?"}, h = ${h ?? "?"}\n• Grid points stored: ${pointCount ?? "?"}\n• Final: u ≈ ${finalY?.toFixed(6) ?? "?"} at t = ${finalT?.toFixed(6) ?? "?"}\n\nSee the “Last 12 values” table below the chart for step-by-step numbers.`
    );
    chartInstruction = {
      type: "error_table",
      title: "Mock result summary",
      tableRows: [
        { t: finalT ?? "", u: finalY ?? "", method: methodName },
        { h: h ?? "", points: pointCount ?? "", family },
      ],
    };
  } else if (
    q.includes("coefficient") ||
    q.includes("alpha") ||
    q.includes("beta") ||
    q.includes("β")
  ) {
    const coeffs = (context.method as { coefficients?: { alpha?: number[]; beta?: number[] } })
      ?.coefficients;
    const alpha = coeffs?.alpha?.map((v) => v.toFixed(6)).join(", ");
    const beta = coeffs?.beta?.map((v) => v.toFixed(6)).join(", ");
    message = demoReply(
      `Coefficients for ${methodName} (from your run metadata only):\n\n${alpha ? `α = [${alpha}] (BDF-style stencil on uₙ₊₁₋ⱼ)\n\n` : ""}${beta ? `β = [${beta}] (weights on fₙ₋ⱼ in the Adams form)\n\n` : ""}${!alpha && !beta ? "This method has no α/β arrays in context — typical for one-step schemes.\n\n" : ""}Formula on screen: ${formula}`
    );
  } else if (
    q.includes("step by step") ||
    q.includes("procedure") ||
    q.includes("explain this method")
  ) {
    let stepFour: string;
    if (!isImplicit) {
      stepFour =
        "The update is explicit: uₙ₊₁ is computed directly from past u and f values.";
    } else if (nonlinearMethod === "newton") {
      stepFour =
        "Because the method is implicit, each step solves the equation G(u) = 0 for uₙ₊₁ with Newton iteration.";
    } else if (nonlinearMethod === "fixed_point") {
      stepFour =
        "Because the method is implicit, each step solves for uₙ₊₁ with fixed-point iteration.";
    } else {
      stepFour =
        "Because the method is implicit, each step requires solving an equation for uₙ₊₁.";
    }
    message = demoReply(
      `Step-by-step sketch for ${methodName}:\n\n1. Start from the IVP ${equation} with time-step size h.\n2. At each step, form tₙ = t₀ + nh and approximate values uₙ ≈ y(tₙ).\n3. Apply the update: ${formula}\n4. ${stepFour}\n5. After ${pointCount ?? "N"} points, the run ends near t = ${finalT?.toFixed(4) ?? "?"} with u ≈ ${finalY?.toFixed(6) ?? "?"}.\n\n${orderLine}`
    );
  } else if (
    q.includes("graph") ||
    q.includes("interpret") ||
    q.includes("plot")
  ) {
    message = demoReply(
      `The chart shows the numerical approximation uₙ versus t for ${methodName}. It contains ${pointCount ?? "?"} points from t₀ to about t = ${finalT?.toFixed(4) ?? "?"}.\n\nThe curve shows the computed approximations for this method and time-step size. Rapid growth or oscillation can motivate an absolute-stability check, but the plot alone does not prove instability or accuracy.`
    );
  } else if (
    q.includes("smaller h") ||
    q.includes("step size") ||
    q.includes("refine")
  ) {
    message = demoReply(
      `With a smaller time-step size \\(h\\), the fixed interval contains more steps. For a method of theoretical order \\(p\\), the unscaled local truncation error is \\(O(h^{p+1})\\) under the stated smoothness assumptions. Use the Convergence Study to check whether the selected error metric decreases and whether its observed-order status is reliable.\n\nFor this run, the fixed interval is [${t0 ?? "?"}, ${tEnd ?? "?"}], the current time-step size is ${h ?? "?"}, and the method metadata reports theoretical order p = ${order ?? "?"}.`
    );
  } else if (
    q.includes("startup") ||
    q.includes("multistep")
  ) {
    const startup = ctxString(context, ["method", "startupMethod"]);
    message = demoReply(
      `Multistep methods need history before the main formula applies. ${startup ? `This run lists startup: ${startup}.` : "No startup line in context — likely a one-step method."}\n\nEarly steps build uₙ₋ⱼ and fₙ₋ⱼ so the first full step matches order p.`
    );
  } else if (
    q.includes("truncation") ||
    q.includes("global error") ||
    q.includes("local error")
  ) {
    message = demoReply(
      `Using the unscaled convention, local truncation error is the one-step defect produced by inserting exact data into the update, and a method of theoretical order \\(p\\) has local truncation error \\(O(h^{p+1})\\) under the stated smoothness assumptions. Global error is the propagated nodal-error family; a rate \\(O(h^p)\\) requires the method’s stability and regularity assumptions and a named error metric.\n\n${orderLine}`
    );
  } else if (q.includes("variable") || q.includes("what does") || q.includes("mean")) {
    message = demoReply(
      `Symbols for this run:\n\n• t, y: independent time and exact solution in y′ = f(t, y)\n• uₙ: numerical approximation at tₙ; fₙ = f(tₙ, uₙ)\n• h: fixed time-step size (${h ?? "?"})\n• ${formula}\n\nAll values above come from your current session.`
    );
  } else if (q.includes("exam") || q.includes("review")) {
    message = demoReply(
      `Exam-style recap: You solved ${equation} with ${methodName} on [${t0 ?? "?"}, ${tEnd ?? "?"}] using h = ${h ?? "?"}. The method is ${isImplicit ? "implicit" : "explicit"}. ${orderLine} Final computed value u ≈ ${finalY?.toFixed(6) ?? "?"} at t = ${finalT?.toFixed(6) ?? "?"}.\n\nBe ready to state the update formula, define LTE vs global error, and ${family.includes("bdf") ? "explain why this implementation uses nonlinear iteration to solve each implicit BDF step" : "explain why this scheme behaves as it does"} for order p.`
    );
  } else {
    message = demoReply(
      `You asked about “${userMessage.slice(0, 120)}${userMessage.length > 120 ? "…" : ""}” for ${methodName}.\n\nContext from this run: ${equation}; h = ${h ?? "?"}; ${pointCount ?? "?"} points; final u ≈ ${finalY?.toFixed(6) ?? "?"} at t = ${finalT?.toFixed(6) ?? "?"}.\n\n${orderLine}`
    );
  }

  return { message, chartInstruction };
}

export function buildUserContextBlock(context: Record<string, unknown>): string {
  const trimmed = { ...context };
  const result = trimmed.result as Record<string, unknown> | undefined;
  if (result?.seriesFull && Array.isArray(result.seriesFull)) {
    const full = result.seriesFull as unknown[];
    if (full.length > MAX_SERIES_IN_CONTEXT) {
      delete result.seriesFull;
    }
  }
  return JSON.stringify(trimmed, null, 0);
}

function parseModelJson(text: string): {
  message: string;
  chartInstruction?: Record<string, unknown>;
} {
  const trimmed = text.trim();
  try {
    const parsed = JSON.parse(trimmed) as {
      message?: string;
      chartInstruction?: Record<string, unknown>;
    };
    if (typeof parsed.message === "string" && parsed.message.length > 0) {
      return {
        message: parsed.message,
        chartInstruction: parsed.chartInstruction,
      };
    }
  } catch {
    /* fall through */
  }

  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as {
        message?: string;
        chartInstruction?: Record<string, unknown>;
      };
      if (typeof parsed.message === "string") {
        return {
          message: parsed.message,
          chartInstruction: parsed.chartInstruction,
        };
      }
    } catch {
      /* fall through */
    }
  }

  return { message: trimmed };
}

async function callOpenAIResponses(
  apiKey: string,
  input: Array<{ role: string; content: string }>
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      instructions: SYSTEM_PROMPT,
      input,
      text: { format: { type: "json_object" } },
      max_output_tokens: 1200,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${errText.slice(0, 400)}`);
  }

  const data = (await res.json()) as {
    output_text?: string;
    output?: Array<{
      type?: string;
      content?: Array<{ type?: string; text?: string }>;
    }>;
  };

  if (typeof data.output_text === "string" && data.output_text.length > 0) {
    return data.output_text;
  }

  for (const item of data.output ?? []) {
    if (item.type === "message") {
      for (const part of item.content ?? []) {
        if (part.type === "output_text" && part.text) {
          return part.text;
        }
      }
    }
  }

  throw new Error("OpenAI response had no text output.");
}

export async function handleChatRequest(
  body: ChatHandlerBody,
  signal?: AbortSignal
): Promise<ChatHandlerResult> {
  if (body?.profile === "linear_algebra") {
    return handleLinearTutorRequest(body, { mockMode: isMockMode(), apiKey: process.env.OPENAI_API_KEY?.trim(), signal });
  }
  if (body?.profile !== undefined && body.profile !== "ode") {
    return { status: 400, body: { error: "This Lab does not support Tutor chat." } };
  }
  if (!body?.messages?.length) {
    return { status: 400, body: { error: "messages array is required." } };
  }
  if (!body.context || typeof body.context !== "object") {
    return { status: 400, body: { error: "context object is required." } };
  }

  const last = body.messages[body.messages.length - 1];
  if (!last || last.role !== "user") {
    return {
      status: 400,
      body: { error: "Last message must be from the user." },
    };
  }

  if (isMockMode()) {
    const mock = buildMockResponse(body.context, last.content);
    const response: Record<string, unknown> = {
      message: mock.message,
      demoMode: true,
    };
    if (
      mock.chartInstruction &&
      mock.chartInstruction.type !== "none"
    ) {
      response.chartInstruction = mock.chartInstruction;
    }
    return { status: 200, body: response };
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    console.error(
      "AI Tutor configuration is unavailable: provider access is missing and mock mode is disabled."
    );
    return {
      status: 503,
      body: {
        error: "AI Tutor is temporarily unavailable. Please try again later.",
      },
    };
  }

  const contextBlock = buildUserContextBlock(body.context);
  const history = body.messages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }));

  const input: Array<{ role: string; content: string }> = [
    {
      role: "user",
      content: `Current lab context (JSON):\n${contextBlock}`,
    },
    {
      role: "assistant",
      content:
        "I have the context for the Initial Value Problems Lab in Numerical T Lab and will explain using only that data.",
    },
    ...history,
    { role: "user", content: last.content },
  ];

  try {
    const raw = await callOpenAIResponses(apiKey, input);
    const parsed = parseModelJson(raw);
    const response: Record<string, unknown> = { message: parsed.message };
    if (
      parsed.chartInstruction &&
      typeof parsed.chartInstruction === "object" &&
      parsed.chartInstruction.type !== "none"
    ) {
      response.chartInstruction = parsed.chartInstruction;
    }
    return { status: 200, body: response };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { status: 502, body: { error: msg } };
  }
}
