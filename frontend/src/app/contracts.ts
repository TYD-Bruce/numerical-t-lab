import type { LabGlossaryBinding } from "../glossary/glossaryController";

export type RouteId =
  | "home"
  | "ode-overview"
  | "ode-initial-value-problems"
  | "linear-algebra-overview"
  | "linear-algebra-linear-systems"
  | "pde-overview"
  | "about"
  | "glossary-playground"
  | "mathml-capability"
  | "presentation-system"
  | "not-found";

export type LabModuleId = "ode" | "linear_algebra" | "pde";

export interface ResumeSummary {
  readonly moduleId: LabModuleId;
  readonly route: string;
  readonly labTitle: string;
  readonly stepLabel: "Method" | "Data" | "Output" | "Diagnostics";
  readonly methodLabel?: string;
  readonly analysisLabel?: "Analysis available" | "Analysis stale";
  readonly resultLabel?: "Result current" | "Result stale";
  readonly lastMeaningfulInteraction: number;
}

export interface LabSessionMetadata {
  readonly labMeaningful: boolean;
  readonly tutorMeaningful: boolean;
  readonly meaningful: boolean;
  readonly resumeSummary?: ResumeSummary;
  readonly lastMeaningfulInteraction?: number;
}

export interface HomeSessionSource {
  getResumeSummaries(limit?: number): readonly ResumeSummary[];
  subscribe(listener: () => void): () => void;
}

export interface RouteSessionMetadata {
  readonly scrollPosition?: number;
  readonly lastMeaningfulInteraction?: number;
}

export type TutorTranscriptItem =
  | {
      readonly kind: "message";
      readonly role: "user" | "assistant";
      readonly content: string;
    }
  | {
      readonly kind: "divider";
      readonly id: string;
      readonly title: "New experiment started";
      readonly body: string;
    };

/** Nonsecret conversation destination; never a credential or session proof. */
export interface TutorConversationConnection {
  readonly kind: "hosted" | "personal";
  readonly sessionId: string;
  readonly generation: number;
}

export interface ModuleTutorSession {
  readonly items: readonly TutorTranscriptItem[];
  /** Changes with transcript content, independently of draft and placement. */
  readonly revision: number;
  readonly draftMessage: string;
  readonly desktopOpen: boolean;
  readonly connection?: TutorConversationConnection;
}

export interface TutorSessionAccess {
  readonly moduleId: LabModuleId;
  getSession(): ModuleTutorSession;
  updateSession(
    update: (current: ModuleTutorSession) => ModuleTutorSession
  ): void;
}

export type TutorPromptProfile = "ode" | "linear_algebra" | "pde";

export type LabTutorContext<TContext extends object = object> =
  | { readonly status: "ready"; readonly revision: number; readonly context: TContext }
  | { readonly status: "unavailable"; readonly revision: number; readonly message: string };

export interface LabTutorBinding<TContext extends object = object> {
  readonly moduleId: LabModuleId;
  readonly promptProfile: TutorPromptProfile;
  readonly suggestedQuestions: readonly string[];
  readonly description: string;
  /** The Lab owns evidence eligibility and a monotonic revision within this binding. */
  getContext(): LabTutorContext<TContext>;
  prepareForOpen?(): void;
  applyChartInstruction?(instruction: unknown): void;
  subscribeConversationReset?(listener: () => void): () => void;
  subscribeContextChange?(listener: () => void): () => void;
}

export interface ConfirmedLabReset<TSession> {
  readonly session: TSession;
  readonly metadata: LabSessionMetadata;
  readonly clearTutorConversation: boolean;
  readonly at: number;
}

export interface LabLifecycleCallbacks<TSession> {
  updateSession(
    session: TSession,
    metadata: LabSessionMetadata
  ): void;
  recordMeaningfulInteraction?(at: number): void;
  applyConfirmedReset?(request: ConfirmedLabReset<TSession>): void;
}

export interface MountedLabRoute<TSession> extends MountedRoute {
  getSession(): TSession;
  getResumeSummary(): ResumeSummary | undefined;
  getTutorBinding?(): LabTutorBinding;
  getGlossaryBinding?(): LabGlossaryBinding;
}

export interface LabRouteModule<TSession> {
  createBeginnerStarterSession(): TSession;
  mount(options: {
    target: HTMLElement;
    session: TSession;
    navigate: Navigate;
    lifecycle?: LabLifecycleCallbacks<TSession>;
  }): MountedLabRoute<TSession>;
}

export interface NavigateOptions {
  replace?: boolean;
  scroll?: "auto" | "top" | "preserve";
}

export type Navigate = (
  path: string,
  options?: NavigateOptions
) => Promise<void>;

export interface RouteLocation {
  pathname: string;
  search: string;
  hash: string;
}

export interface MountedRoute {
  ready?: Promise<void>;
  dispose(): void;
}

export interface RouteModule {
  mount(options: {
    target: HTMLElement;
    navigate: Navigate;
    location: RouteLocation;
  }): MountedRoute;
}
