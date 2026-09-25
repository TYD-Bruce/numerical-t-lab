import type { ChartInstruction, OdeLabContext } from "@numerical-t-lab/contracts/tutor";
import type { OdeTutorProblemInputs } from "./odeTutorTypes";
import type { LabTutorBinding, LabTutorContext } from "../../app/contracts";
import type { ConvergenceUiState } from "./convergenceStudyState";
import type { ReadonlySolverResult } from "./odeSession";
import { buildOdeLabContext } from "./odeTutorContext";
import { getTutorConvergenceStudy } from "./convergenceTutor";

export const ODE_TUTOR_SUGGESTED_QUESTIONS = Object.freeze([
  "Explain this method step by step.",
  "What does each variable mean?",
  "Why is this method’s theoretical order p?",
  "Explain the coefficients.",
  "Explain the implicit solve diagnostics.",
  "How should I interpret the graph?",
  "What could happen if I used a smaller time-step size h?",
  "Create a table summary of the result.",
] as const);

export interface OdeTutorSource {
  readonly enabled: boolean;
  readonly reason?: "comparison";
  readonly result?: ReadonlySolverResult;
  readonly problem?: OdeTutorProblemInputs;
  readonly convergenceState?: ConvergenceUiState;
}

export interface OdeTutorBindingControl {
  readonly binding: LabTutorBinding<OdeLabContext>;
  requestConversationReset(): void;
  refreshContext(): void;
  dispose(): void;
}

export function createOdeTutorBinding(options: {
  readonly getSource: () => OdeTutorSource;
  readonly prepareForOpen?: () => void;
  readonly applyChartInstruction?: (instruction: ChartInstruction) => void;
}): OdeTutorBindingControl {
  const resetListeners = new Set<() => void>();
  const contextListeners = new Set<() => void>();
  let disposed = false;
  let snapshot: LabTutorContext<OdeLabContext> | undefined;
  let sourceIdentity: readonly unknown[] = [];
  let announcedRevision = 0;
  const binding: LabTutorBinding<OdeLabContext> = Object.freeze({
    moduleId: "ode" as const,
    promptProfile: "ode" as const,
    suggestedQuestions: ODE_TUTOR_SUGGESTED_QUESTIONS,
    description: "Ask about the method, variables, coefficients, error, convergence evidence, or graph behavior.",
    getContext(): LabTutorContext<OdeLabContext> {
      const source = disposed ? { enabled: false } : options.getSource();
      const ready = source.enabled && source.result && source.problem && source.result.points.length > 0;
      const study = ready ? getTutorConvergenceStudy(source.convergenceState) : undefined;
      // Presentation-only Convergence changes do not invalidate a request.
      // Only evidence accepted by the existing eligibility helper is included.
      const identity = ready ? [source.result, source.problem, study ? source.convergenceState?.result : undefined]
        : ["unavailable", source.reason];
      if (snapshot && identity.length === sourceIdentity.length && identity.every((item, index) => item === sourceIdentity[index])) return snapshot;
      sourceIdentity = identity;
      const revision = snapshot ? snapshot.revision + 1 : 0;
      snapshot = ready ? Object.freeze({ status: "ready", revision, context: buildOdeLabContext(source.result!, source.problem!, study) })
        : Object.freeze({ status: "unavailable", revision, message: source.reason === "comparison"
          ? "Tutor is unavailable for comparison output. Run one method to ask about its result."
          : "Run a method first, then ask the AI Tutor about the result." });
      return snapshot;
    },
    prepareForOpen: options.prepareForOpen,
    applyChartInstruction(instruction: unknown): void {
      options.applyChartInstruction?.(instruction as ChartInstruction);
    },
    subscribeConversationReset(listener: () => void): () => void {
      if (disposed) return () => undefined;
      resetListeners.add(listener);
      let subscribed = true;
      return () => {
        if (!subscribed) return;
        subscribed = false;
        resetListeners.delete(listener);
      };
    },
    subscribeContextChange(listener: () => void): () => void {
      if (disposed) return () => undefined;
      contextListeners.add(listener);
      return () => { contextListeners.delete(listener); };
    },
  });

  return Object.freeze({
    binding,
    requestConversationReset(): void {
      if (disposed) return;
      for (const listener of [...resetListeners]) listener();
    },
    refreshContext(): void {
      // Do not build grounding merely because the Lab mounted or changed.
      // The first panel read starts context projection.
      if (disposed || !snapshot || contextListeners.size === 0) return;
      const next = binding.getContext();
      if (next.revision === announcedRevision) return;
      announcedRevision = next.revision;
      for (const listener of [...contextListeners]) listener();
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      resetListeners.clear();
      contextListeners.clear();
    },
  });
}
