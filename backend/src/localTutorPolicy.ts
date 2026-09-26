import { BlockList, isIP } from "node:net";
import type { TutorConnectionErrorCode, TutorConnectionMetadata, TutorProvider, TutorRegion } from "@numerical-t-lab/contracts/tutor";
import { TUTOR_MODEL_DISCOVERY_LIMIT, TUTOR_CLOUD_BASES as CLOUD_BASES, TUTOR_KIMI_BASES as KIMI_BASES } from "@numerical-t-lab/contracts/tutor";

const ERRORS: Record<TutorConnectionErrorCode, readonly [number, string]> = {
  invalid_configuration: [400, "Invalid connection configuration."],
  invalid_endpoint: [400, "Use an explicit supported HTTP loopback local endpoint."],
  credential_required: [400, "A valid explicit credential is required."],
  model_required: [400, "Choose a model before testing or activating this connection."],
  invalid_session: [403, "Local session proof is not valid."],
  session_expired: [401, "The local session expired. Reconnect to continue."],
  session_limit: [429, "Too many local sessions. Close a session or wait for expiry."],
  connection_changed: [409, "The connection changed. Review the current selection."],
  connection_unverified: [409, "Test this connection before activating it."],
  connection_required: [409, "Choose and test a connection first."],
  request_busy: [429, "The local Tutor is busy. Wait or cancel the current request."],
  request_cancelled: [409, "The request was cancelled."],
  provider_unavailable: [502, "The selected model server could not be reached."],
  redirect_rejected: [502, "The selected server redirected the request. No redirect was followed."],
  response_too_large: [502, "The model response exceeded the supported size."],
  response_invalid: [502, "The model server returned an unsupported response."],
  timeout: [504, "The model request timed out."],
  provider_auth: [401, "The selected model server rejected the credential."],
  provider_busy: [429, "The selected model server is busy or has reached its limit."],
  provider_unsupported: [400, "This provider is not available in this version."],
  discovery_unsupported: [422, "This server does not provide model discovery. Enter an exact model ID."],
  model_unavailable: [409, "The selected model is not reported as available. Load it in your model server before testing."],
  model_unsupported: [422, "This model requires preserved reasoning history, which Tutor does not support. Choose a different model."],
  response_refused: [422, "The model declined this request or its safety filter blocked the answer."],
  response_incomplete: [422, "The model did not finish its answer. No partial answer was accepted."],
  input_too_large: [413, "The conversation and context exceed the supported input size. Start a shorter conversation."],
  invalid_chat_request: [400, "The Tutor request is invalid. Reopen the Tutor and try again."],
  invalid_context: [400, "The Lab context is invalid or unsupported. Run a valid experiment before sending."],
  profile_unsupported: [400, "This Lab does not yet support personal Tutor chat."],
};

/** Fixed public messages only: never capture a URL, credential, body or cause. */
export class TutorConnectionError extends Error {
  readonly status: number;
  constructor(readonly code: TutorConnectionErrorCode) {
    super(ERRORS[code][1]);
    this.status = ERRORS[code][0];
  }
}

export function localModelBase(value: unknown): string {
  // Inspect original spelling; URL parsers normalize many unsafe host aliases.
  const match = typeof value === "string" && /^http:\/\/(127\.0\.0\.1|localhost|\[::1\]):([1-9]\d{0,4})(?:\/(?:v1\/?)?)?$/.exec(value);
  if (!match || Number(match[2]) > 65535) throw new TutorConnectionError("invalid_endpoint");
  return `http://${match[1] === "localhost" ? "127.0.0.1" : match[1]}:${match[2]}/v1`;
}

export function validateModelId(value: unknown, provider: TutorProvider): string {
  if (provider === "local") {
    // llama.cpp may return a Windows/POSIX file path. It is opaque JSON data,
    // never an endpoint, filesystem operation or executable expression.
    if (typeof value !== "string" || !value.trim() || value.length > 1024 || /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/.test(value)) throw new TutorConnectionError("invalid_configuration");
    return value;
  }
  if (typeof value !== "string" || value.length > 200 || !/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(value) || value.split("/").some(part => part === ".." || part === "." || part === "")) {
    throw new TutorConnectionError("invalid_configuration");
  }
  return value;
}

function baseFor(provider: TutorProvider, region?: TutorRegion, localBase?: unknown): string {
  if (provider === "local") return localModelBase(localBase);
  if (provider === "kimi") {
    if (region !== "international" && region !== "mainland") throw new TutorConnectionError("invalid_configuration");
    return KIMI_BASES[region];
  }
  if (!Object.hasOwn(CLOUD_BASES, provider) || region !== undefined) throw new TutorConnectionError("invalid_configuration");
  return CLOUD_BASES[provider];
}

export interface ServerConnection {
  readonly metadata: TutorConnectionMetadata;
  credential?: string;
}

export function normalizeConnection(input: unknown): ServerConnection {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TutorConnectionError("invalid_configuration");
  const data = input as Record<string, unknown>;
  if (typeof data.provider !== "string") throw new TutorConnectionError("invalid_configuration");
  const provider = data.provider as TutorProvider;
  const allowed = ["provider", "model", "apiKey", ...(provider === "local" ? ["baseUrl"] : provider === "kimi" ? ["region"] : [])];
  if (Object.keys(data).some(key => !allowed.includes(key))) throw new TutorConnectionError("invalid_configuration");
  const baseUrl = baseFor(provider, data.region as TutorRegion | undefined, data.baseUrl);
  const model = data.model === undefined ? undefined : validateModelId(data.model, provider);
  const credential = provider === "local" && (data.apiKey === undefined || data.apiKey === "") ? undefined : data.apiKey;
  if (credential !== undefined && (typeof credential !== "string" || !/^[\x21-\x7e]{1,4096}$/.test(credential))) {
    throw new TutorConnectionError("credential_required");
  }
  if (provider !== "local" && !credential) throw new TutorConnectionError("credential_required");
  return {
    metadata: Object.freeze({ provider, ...(provider === "kimi" ? { region: data.region as TutorRegion } : {}), baseUrl, ...(model === undefined ? {} : { model }), hasCredential: credential !== undefined }),
    credential: credential as string | undefined,
  };
}

export type ProviderOperation = "discover" | "readiness" | "complete";
export const PROVIDER_MODEL_LIMIT = TUTOR_MODEL_DISCOVERY_LIMIT;

export function requireSelectedModel(connection: TutorConnectionMetadata): string {
  if (connection.model === undefined) throw new TutorConnectionError("model_required");
  return validateModelId(connection.model, connection.provider);
}

/** Only these read-only discovery / inference paths can leave the backend. */
export function providerRequestTarget(connection: TutorConnectionMetadata, operation: ProviderOperation): { url: string; method: "GET" | "POST" } {
  const base = baseFor(connection.provider, connection.region, connection.baseUrl);
  if (base !== connection.baseUrl || !["discover", "readiness", "complete"].includes(operation) ||
    (operation === "readiness" && connection.provider !== "local")) throw new TutorConnectionError("invalid_configuration");
  let path = "/models";
  if (operation === "complete") {
    const model = requireSelectedModel(connection);
    path = connection.provider === "openai" ? "/responses" : connection.provider === "anthropic" ? "/messages"
      : connection.provider === "gemini" ? `/models/${encodeURIComponent(model.replace(/^models\//, ""))}:generateContent` : "/chat/completions";
  }
  // This query is owned by policy, never user input. Disable router process
  // autoload even when state changes after the adapter's readiness check.
  const query = connection.provider === "local" && operation === "complete" ? "?autoload=false"
    : operation === "discover" && connection.provider === "anthropic" ? `?limit=${PROVIDER_MODEL_LIMIT}`
    : operation === "discover" && connection.provider === "gemini" ? `?pageSize=${PROVIDER_MODEL_LIMIT}` : "";
  return { url: `${base}${path}${query}`, method: operation === "complete" ? "POST" : "GET" };
}

const nonPublicV4 = new BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16],
  ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.88.99.0", 24], ["192.168.0.0", 16],
  ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 3],
] as const) nonPublicV4.addSubnet(address, prefix);
const globalV6 = new BlockList();
globalV6.addSubnet("2000::", 3, "ipv6");
const nonPublicV6 = new BlockList();
for (const [address, prefix] of [["2001::", 23], ["2001:db8::", 32], ["2002::", 16], ["3fff::", 20]] as const) {
  nonPublicV6.addSubnet(address, prefix, "ipv6");
}

export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  return family === 4 ? !nonPublicV4.check(address) : family === 6 && globalV6.check(address, "ipv6") && !nonPublicV6.check(address, "ipv6");
}
