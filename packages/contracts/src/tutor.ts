/** Context sent to /api/chat — grounded in the current solver run. */
export interface ImplicitDiagnosticsContext {
  nonlinearMethod: "newton" | "fixed_point";
  totalIterations: number;
  maxIterationsPerStep: number;
  finalResidual: number;
  maxResidual: number;
  failedSteps: number;
}

export interface TutorObservedOrderAssessment {
  value?: number;
  status:
    | "reliable"
    | "below_resolution"
    | "no_improvement"
    | "negative"
    | "near_zero"
    | "unavailable";
  message: string;
  coarseLevel: number;
  fineLevel: number;
}

export interface TutorConvergenceLevel {
  level: number;
  h: number;
  finalTimeError: number;
  maximumGlobalError: number;
  finalObservedOrder?: TutorObservedOrderAssessment;
  maximumObservedOrder?: TutorObservedOrderAssessment;
}

export interface TutorConvergenceStudy {
  theoreticalOrder: number;
  interpretation: {
    kind:
      | "consistent_with_theory"
      | "approaching_theory"
      | "not_yet_asymptotic"
      | "refinement_not_improving"
      | "order_unavailable";
    title: string;
    explanation: string;
    primaryObservedOrder?: number;
    evidencePairs: Array<[number, number]>;
  };
  levels: TutorConvergenceLevel[];
  consistencyCheck: {
    status: "passed" | "warning";
    maximumNormalizedResidual?: number;
    maximumResidualTime?: number;
    statement: "This is a numerical consistency check, not a formal proof.";
  };
}

export interface OdeLabContext {
  problem: {
    kind: "first_order" | "second_order";
    equationDisplay: string;
    t0: number;
    tEnd: number;
    h: number;
    y0?: number;
    u0?: number;
    v0?: number;
  };
  method: {
    displayName: string;
    family: string;
    order?: number;
    isImplicit: boolean;
    startupMethod?: string;
    formulaDisplay?: string;
    coefficients?: {
      alpha?: number[];
      beta?: number[];
    };
    implicitDiagnostics?: ImplicitDiagnosticsContext;
    notes?: string[];
  };
  result: {
    finalT: number;
    finalY: number;
    finalV?: number;
    pointCount: number;
    seriesPreview: Array<{ t: number; y: number; v?: number }>;
    seriesFull?: Array<{ t: number; y: number; v?: number }>;
    tMin?: number;
    tMax?: number;
    yMin?: number;
    yMax?: number;
  };
  convergenceStudy?: TutorConvergenceStudy;
}

/** Existing Lab projection budgets, shared with personal API validation. */
export const ODE_TUTOR_SERIES_LIMITS = Object.freeze({ preview: 20, full: 80 });
/** Shared response budgets; the browser never silently truncates these payloads. */
export const TUTOR_MODEL_DISCOVERY_LIMIT = 256;
export const TUTOR_FINAL_TEXT_BYTES = 32 * 1024;
export const TUTOR_CHART_LIMITS = Object.freeze({ textBytes: 1024, rows: 80, columns: 16, keyLength: 80 });

export interface ChartInstruction {
  type: "line_chart" | "error_table" | "zoom_range" | "none";
  title?: string;
  xLabel?: string;
  yLabel?: string;
  tMin?: number;
  tMax?: number;
  includePoints?: boolean;
  includeLine?: boolean;
  tableRows?: Array<Record<string, string | number>>;
}

export interface ChatRequest<TContext extends object = OdeLabContext> {
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  context: TContext;
}

export interface ChatResponse {
  message: string;
  chartInstruction?: ChartInstruction;
  /** True when AI_TUTOR_MOCK is active on the server (public demo). */
  demoMode?: boolean;
}

/** Only implemented grounded profiles are admitted by the personal endpoint. */
export interface PersonalTutorChatRequest extends ChatRequest<OdeLabContext> {
  readonly profile: "ode";
  readonly generation: number;
  readonly requestId: string;
}

export interface PersonalTutorChatResponse {
  readonly profile: PersonalTutorChatRequest["profile"];
  readonly generation: number;
  readonly requestId: string;
  readonly response: ChatResponse;
}

export type TutorMessage = ChatRequest["messages"][number];

/** Local-only personal connection DTOs. Credentials are write-only input. */
export type TutorProvider = "local" | "openai" | "anthropic" | "gemini" | "deepseek" | "kimi";
export type TutorRegion = "international" | "mainland";
export type TutorConnectionInput =
  | { provider: "local"; baseUrl: string; model?: string; apiKey?: string }
  | { provider: "kimi"; region: TutorRegion; model?: string; apiKey: string }
  | { provider: "openai" | "anthropic" | "gemini" | "deepseek"; model?: string; apiKey: string };

export interface TutorConnectionMetadata {
  readonly provider: TutorProvider;
  readonly region?: TutorRegion;
  readonly baseUrl: string;
  /** May be absent on an unselected discovery candidate, never on an active connection. */
  readonly model?: string;
  readonly hasCredential: boolean;
}

export interface LocalTutorSessionSnapshot {
  readonly sessionId: string;
  readonly generation: number;
  readonly idleExpiresAt: number;
  /** Advertised session policy; browser activity must not extend absolute expiry. */
  readonly idleTimeoutMs: number;
  readonly absoluteExpiresAt: number;
  readonly active?: TutorConnectionMetadata;
  readonly candidate?: { readonly id: string; readonly tested: boolean; readonly connection: TutorConnectionMetadata };
}

/** Authenticated activity observation; reading it never renews the session. */
export interface LocalTutorSessionActivity {
  readonly sessionId: string;
  readonly generation: number;
  readonly idleExpiresAt: number;
}

export interface LocalTutorSessionCreated {
  readonly session: LocalTutorSessionSnapshot;
  /** Per-tab proof, held only in frontend runtime memory. Never a provider key. */
  readonly proof: string;
  readonly capabilities: {
    readonly protocol: 1;
    readonly providerOperations: boolean;
    readonly providers: readonly TutorProvider[];
    readonly chatProfiles: readonly PersonalTutorChatRequest["profile"][];
  };
}

/** Server-reported candidates; listed does not mean loaded or connection-tested. */
export interface TutorModelCandidate {
  readonly id: string;
  readonly availability: "listed" | "loaded" | "loading" | "unloaded" | "unavailable";
}

export interface TutorModelDiscovery {
  readonly models: readonly TutorModelCandidate[];
  /** The bounded first page is incomplete; exact model-ID entry remains available. */
  readonly hasMore: boolean;
}

export const TUTOR_CONNECTION_ERROR_CODES = [
  "invalid_configuration", "invalid_endpoint", "credential_required", "model_required",
  "invalid_session", "session_expired", "session_limit",
  "connection_changed", "connection_unverified", "connection_required",
  "request_busy", "request_cancelled", "provider_unavailable",
  "redirect_rejected", "response_too_large", "response_invalid",
  "timeout", "provider_auth", "provider_busy",
  "provider_unsupported", "discovery_unsupported", "model_unavailable", "model_unsupported",
  "response_refused", "response_incomplete", "input_too_large",
  "invalid_chat_request", "invalid_context", "profile_unsupported",
] as const;
export type TutorConnectionErrorCode = typeof TUTOR_CONNECTION_ERROR_CODES[number];
