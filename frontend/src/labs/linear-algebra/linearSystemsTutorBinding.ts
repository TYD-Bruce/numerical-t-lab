import type { LinearSystemsLabContext } from "@numerical-t-lab/contracts/tutor";
import type { LabTutorBinding, LabTutorContext } from "../../app/contracts";
import type { LinearSystemsSessionState } from "./linearSystemsSession";
import { buildLinearSystemsTutorContext } from "./linearSystemsTutorContext";

/** Mounted Lab runtime only; the session retains pure numerical and draft data. */
export function createLinearSystemsTutorBinding(options: {
  readonly getSession: () => LinearSystemsSessionState;
  readonly prepareForOpen?: () => void;
}) {
  const resetListeners = new Set<() => void>(), contextListeners = new Set<() => void>();
  let disposed = false, announcedRevision = 0;
  let snapshot: LabTutorContext<LinearSystemsLabContext> | undefined;
  let sourceIdentity: readonly unknown[] = [];
  const binding: LabTutorBinding<LinearSystemsLabContext> = Object.freeze({
    moduleId: "linear_algebra", promptProfile: "linear_algebra",
    description: "Ask about the recorded pivots, PA=LU factors, computation steps, or residual. Tutor explains your current successful solve.",
    suggestedQuestions: Object.freeze([
      "Explain the recorded pivot choices and row swaps.",
      "How do these factors satisfy PA=LU?",
      "Walk me through the stored elimination and substitution steps.",
      "What does this residual tell me about the solution?",
      "How should I interpret the preset reference comparison?",
    ]),
    getContext(): LabTutorContext<LinearSystemsLabContext> {
      const session = disposed ? undefined : options.getSession();
      const identity = session
        ? [session.latestSuccessfulResult, session.resultStatus, session.inputFingerprint, session.dimension]
        : [];
      if (snapshot && identity.length === sourceIdentity.length && identity.every((value, index) => value === sourceIdentity[index])) return snapshot;
      sourceIdentity = identity;
      const context = session ? buildLinearSystemsTutorContext(session) : null;
      const revision = snapshot ? snapshot.revision + 1 : 0;
      snapshot = context ? Object.freeze({ status: "ready", revision, context })
        : Object.freeze({ status: "unavailable", revision, message: session?.latestSuccessfulResult
          ? "The current inputs do not have an eligible result. Solve the current system before asking Tutor."
          : "Solve a system first, then ask the AI Tutor about the result." });
      return snapshot;
    },
    prepareForOpen(): void { if (!disposed) options.prepareForOpen?.(); },
    subscribeConversationReset(listener: () => void): () => void {
      if (disposed) return () => undefined;
      resetListeners.add(listener);
      return () => { resetListeners.delete(listener); };
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
      if (!disposed) for (const listener of [...resetListeners]) listener();
    },
    refreshContext(): void {
      // First-open Tutor owns the first projection. Workflow-only changes reuse it.
      if (disposed || !snapshot || contextListeners.size === 0) return;
      const next = binding.getContext();
      if (next.revision === announcedRevision) return;
      announcedRevision = next.revision;
      for (const listener of [...contextListeners]) listener();
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      resetListeners.clear(); contextListeners.clear();
    },
  });
}
