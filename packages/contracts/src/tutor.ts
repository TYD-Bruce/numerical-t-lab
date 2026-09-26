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

/** Wire limits only; numerical algorithms and their limits remain numerics-owned. */
export const LINEAR_TUTOR_LIMITS = Object.freeze({ minDimension: 2, maxDimension: 6, traceSteps: 50 });
export const LINEAR_TUTOR_TRACE_OMISSIONS = Object.freeze([
  "matrix_scale_terms", "pivot_candidates", "intermediate_matrices", "row_swap_rows",
  "substitution_contributions", "residual_products", "reference_components",
] as const);
type TutorVector = readonly number[];
type TutorMatrix = readonly TutorVector[];
type LinearTutorSubstitution = {
  readonly row: number; readonly rightHandSideValue: number; readonly numeratorBeforeDivision: number;
  readonly diagonalValue: number; readonly accumulatedKnownTermSum?: number;
};
/** Selected stored fields only; no reconstruction of omitted arithmetic. */
export type LinearTutorTraceStep =
  | { readonly kind: "matrix_scale"; readonly selectedMaximumRow: number; readonly matrixInfNorm: number; readonly pivotUlpFactor: number; readonly numberEpsilon: number; readonly tauPivot: number }
  | { readonly kind: "factorization_start" | "factorization_complete" }
  | { readonly kind: "pivot_selection"; readonly column: number; readonly selectedRow: number; readonly selectedPivotValue: number; readonly selectedAbsoluteMagnitude: number; readonly tauPivot: number; readonly accepted: boolean }
  | { readonly kind: "row_swap"; readonly column: number; readonly firstRow: number; readonly secondRow: number; readonly permutationBefore: TutorVector; readonly permutationAfter: TutorVector }
  | { readonly kind: "elimination"; readonly column: number; readonly pivotRow: number; readonly targetRow: number; readonly pivotValue: number; readonly targetColumnValueBefore: number; readonly multiplier: number; readonly targetRowBefore: TutorVector; readonly pivotRowUsed: TutorVector; readonly targetRowAfter: TutorVector }
  | { readonly kind: "right_hand_side_permutation"; readonly permutedB: TutorVector }
  | ({ readonly kind: "forward_substitution"; readonly resultingY: number } & LinearTutorSubstitution)
  | ({ readonly kind: "backward_substitution"; readonly resultingXHat: number } & LinearTutorSubstitution)
  | { readonly kind: "residual_component"; readonly row: number; readonly matrixVectorValue: number; readonly originalBValue: number; readonly residualComponent: number }
  | { readonly kind: "residual_inf_norm"; readonly selectedMaximumRow: number; readonly residualInfNorm: number }
  | { readonly kind: "preset_reference_difference"; readonly presetId: string; readonly selectedMaximumIndex: number; readonly referenceDifferenceInf: number };

export interface LinearSystemsLabContext {
  readonly dimension: number;
  readonly originalA: TutorMatrix;
  readonly originalB: TutorVector;
  readonly xHat: TutorVector;
  readonly factorization: {
    readonly convention: "PA=LU";
    readonly P: TutorMatrix; readonly L: TutorMatrix; readonly U: TutorMatrix;
    readonly permutation: TutorVector;
    readonly pivots: readonly { readonly column: number; readonly selectedRow: number; readonly pivotValue: number }[];
    readonly rowSwapCount: number;
  };
  readonly diagnostics: {
    readonly residual: TutorVector; readonly residualInfNorm: number;
    readonly matrixInfNorm: number; readonly tauPivot: number;
  };
  readonly reference?: {
    readonly label: "Difference from preset reference solution";
    readonly presetId: string; readonly presetName: string;
    readonly solution: TutorVector; readonly differenceInf: number;
  };
  readonly trace: {
    readonly detail: "selected_fields";
    readonly omittedDetails: typeof LINEAR_TUTOR_TRACE_OMISSIONS;
    readonly totalStepCount: number;
    readonly steps: readonly LinearTutorTraceStep[];
  };
}

/** Only implemented grounded profiles are admitted by the personal endpoint. */
export type PersonalTutorChatRequest = (
  | (ChatRequest<OdeLabContext> & { readonly profile: "ode" })
  | (ChatRequest<LinearSystemsLabContext> & { readonly profile: "linear_algebra" })
) & { readonly generation: number; readonly requestId: string };

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
/** Fixed destinations shared by server policy and the connection preview. */
export const TUTOR_CLOUD_BASES = Object.freeze({
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta",
  deepseek: "https://api.deepseek.com",
});
export const TUTOR_KIMI_BASES = Object.freeze({ international: "https://api.moonshot.ai/v1", mainland: "https://api.moonshot.cn/v1" });
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
