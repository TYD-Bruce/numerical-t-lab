import {
  TUTOR_CONNECTION_ERROR_CODES,
  TUTOR_MODEL_DISCOVERY_LIMIT,
  TUTOR_CHART_LIMITS,
  type ChartInstruction,
  type LocalTutorSessionActivity,
  type LocalTutorSessionCreated,
  type LocalTutorSessionSnapshot,
  type TutorConnectionErrorCode,
  type TutorConnectionMetadata,
  type TutorModelDiscovery,
  type TutorProvider,
} from "@numerical-t-lab/contracts/tutor";

export type TutorClientErrorCode = TutorConnectionErrorCode | "local_required" | "history_required" | "history_changed";

/** Public failures contain a bounded code only, never a server body or fetch cause. */
export class TutorClientError extends Error {
  constructor(readonly code: TutorClientErrorCode) { super(`Tutor request failed (${code}).`); }
}

export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TutorClientError("response_invalid");
  return value as Record<string, unknown>;
}
function text(value: unknown, limit = 1024): string {
  if (typeof value !== "string" || !value.trim() || value.length > limit) throw new TutorClientError("response_invalid");
  return value;
}
function integer(value: unknown, minimum = 0): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) throw new TutorClientError("response_invalid");
  return value as number;
}
function boolean(value: unknown): boolean {
  if (typeof value !== "boolean") throw new TutorClientError("response_invalid");
  return value;
}
function identifier(value: unknown): string {
  if (typeof value !== "string" || !/^[a-f0-9]{32}$/.test(value)) throw new TutorClientError("response_invalid");
  return value;
}
const providers: readonly TutorProvider[] = ["local", "openai", "anthropic", "gemini", "deepseek", "kimi"];
function provider(value: unknown): TutorProvider {
  if (!providers.includes(value as TutorProvider)) throw new TutorClientError("response_invalid");
  return value as TutorProvider;
}
function metadata(value: unknown): TutorConnectionMetadata {
  const data = record(value), selected = provider(data.provider);
  if (selected === "kimi" ? !["international", "mainland"].includes(data.region as string) : data.region !== undefined) throw new TutorClientError("response_invalid");
  return Object.freeze({
    provider: selected, baseUrl: text(data.baseUrl, 256), hasCredential: boolean(data.hasCredential),
    ...(selected === "kimi" ? { region: data.region as "international" | "mainland" } : {}),
    ...(data.model === undefined ? {} : { model: text(data.model) }),
  });
}

/** Project known public fields: a malformed/extra field never becomes retained state. */
export function readSession(value: unknown): LocalTutorSessionSnapshot {
  const data = record(value);
  const active = data.active === undefined ? undefined : metadata(data.active);
  if (active && !active.model) throw new TutorClientError("response_invalid");
  const candidate = data.candidate === undefined ? undefined : record(data.candidate);
  return Object.freeze({
    sessionId: identifier(data.sessionId), generation: integer(data.generation),
    idleExpiresAt: integer(data.idleExpiresAt, 1), idleTimeoutMs: integer(data.idleTimeoutMs, 1), absoluteExpiresAt: integer(data.absoluteExpiresAt, 1),
    ...(active ? { active } : {}),
    ...(candidate ? { candidate: Object.freeze({ id: identifier(candidate.id), tested: boolean(candidate.tested), connection: metadata(candidate.connection) }) } : {}),
  });
}

export function readCreated(value: unknown): LocalTutorSessionCreated {
  const data = record(value), session = readSession(data.session), capability = record(data.capabilities);
  if (session.active || session.candidate || session.generation !== 0 || typeof data.proof !== "string" || !/^[a-f0-9]{64}$/.test(data.proof) ||
    capability.protocol !== 1 || capability.providerOperations !== true || !Array.isArray(capability.providers) || !capability.providers.length ||
    !Array.isArray(capability.chatProfiles) || capability.chatProfiles.some(profile => profile !== "ode" && profile !== "linear_algebra")) throw new TutorClientError("response_invalid");
  return { session, proof: data.proof, capabilities: Object.freeze({ protocol: 1, providerOperations: true,
    providers: Object.freeze(capability.providers.map(provider)), chatProfiles: Object.freeze([...capability.chatProfiles]) }) };
}

export function readDiscovery(value: unknown): TutorModelDiscovery {
  const data = record(value);
  if (!Array.isArray(data.models) || data.models.length > TUTOR_MODEL_DISCOVERY_LIMIT) throw new TutorClientError("response_invalid");
  return Object.freeze({ hasMore: boolean(data.hasMore), models: Object.freeze(data.models.map(value => {
    const model = record(value);
    if (!["listed", "loaded", "loading", "unloaded", "unavailable"].includes(model.availability as string)) throw new TutorClientError("response_invalid");
    return Object.freeze({ id: text(model.id), availability: model.availability as TutorModelDiscovery["models"][number]["availability"] });
  })) });
}

export function readFailure(value: unknown, status: number): TutorClientError {
  const code = value && typeof value === "object" ? (value as Record<string, unknown>).code : undefined;
  return new TutorClientError(TUTOR_CONNECTION_ERROR_CODES.includes(code as TutorConnectionErrorCode) ? code as TutorConnectionErrorCode
    : status === 413 ? "input_too_large" : "provider_unavailable");
}

export function readActivity(value: unknown): LocalTutorSessionActivity | undefined {
  const activity = record(value).activity;
  if (activity === undefined) return undefined;
  const data = record(activity);
  return Object.freeze({ sessionId: identifier(data.sessionId), generation: integer(data.generation), idleExpiresAt: integer(data.idleExpiresAt, 1) });
}

/** Optional display data must pass the full wire schema, not only its discriminator. */
export function readChartInstruction(value: unknown): ChartInstruction | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const data = value as Record<string, unknown>;
  if (!["line_chart", "error_table", "zoom_range", "none"].includes(data.type as string)) return undefined;
  const labels = ["title", "xLabel", "yLabel"] as const;
  const ranges = ["tMin", "tMax"] as const;
  const flags = ["includePoints", "includeLine"] as const;
  const allowed = ["type", ...labels, ...ranges, ...flags, "tableRows"];
  if (Object.keys(data).some(key => !allowed.includes(key))) return undefined;
  const chart: ChartInstruction = { type: data.type as ChartInstruction["type"] };
  const boundedText = (value: unknown): value is string => typeof value === "string" && new TextEncoder().encode(value).length <= TUTOR_CHART_LIMITS.textBytes;
  for (const key of labels) if (data[key] !== undefined) {
    if (!boundedText(data[key])) return undefined;
    chart[key] = data[key] as string;
  }
  for (const key of ranges) if (data[key] !== undefined) {
    if (typeof data[key] !== "number" || !Number.isFinite(data[key])) return undefined;
    chart[key] = data[key] as number;
  }
  for (const key of flags) if (data[key] !== undefined) {
    if (typeof data[key] !== "boolean") return undefined;
    chart[key] = data[key] as boolean;
  }
  if (chart.type === "zoom_range" && (chart.tMin === undefined || chart.tMax === undefined || chart.tMin >= chart.tMax)) return undefined;
  if (data.tableRows !== undefined) {
    if (!Array.isArray(data.tableRows) || data.tableRows.length > TUTOR_CHART_LIMITS.rows) return undefined;
    const rows: Array<Record<string, string | number>> = [];
    for (const row of data.tableRows) {
      if (!row || typeof row !== "object" || Array.isArray(row)) return undefined;
      const entries = Object.entries(row);
      if (entries.length > TUTOR_CHART_LIMITS.columns) return undefined;
      for (const [key, cell] of entries) {
        if (!key || key.length > TUTOR_CHART_LIMITS.keyLength || ["__proto__", "prototype", "constructor"].includes(key) ||
          !(typeof cell === "number" && Number.isFinite(cell) || boundedText(cell))) return undefined;
      }
      rows.push(Object.fromEntries(entries) as Record<string, string | number>);
    }
    chart.tableRows = rows;
  }
  return chart.type === "none" ? undefined : chart;
}

/** Same-origin replies are still bounded before JSON parsing. No raw body is logged. */
export async function readReply(response: Response, assertCurrent: () => void): Promise<unknown> {
  if (response.redirected) throw new TutorClientError("redirect_rejected");
  if (!response.body) throw new TutorClientError("response_invalid");
  const reader = response.body.getReader(), decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0, result = "", completed = false;
  try {
    while (true) {
      assertCurrent();
      const chunk = await reader.read();
      assertCurrent();
      if (chunk.done) { completed = true; break; }
      bytes += chunk.value.byteLength;
      if (bytes > 512 * 1024) throw new TutorClientError("response_too_large");
      result += decoder.decode(chunk.value, { stream: true });
    }
    return JSON.parse(result + decoder.decode());
  } catch (error) {
    if (error instanceof TutorClientError) throw error;
    throw new TutorClientError("response_invalid");
  } finally {
    if (!completed) void reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
