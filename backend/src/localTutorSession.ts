import { randomBytes, timingSafeEqual } from "node:crypto";
import type { LocalTutorSessionCreated, LocalTutorSessionSnapshot, TutorConnectionMetadata } from "@numerical-t-lab/contracts/tutor";
import { normalizeConnection, requireSelectedModel, TutorConnectionError, type ServerConnection } from "./localTutorPolicy.js";

export const LOCAL_TUTOR_LIMITS = Object.freeze({
  idleMs: 30 * 60_000,
  absoluteMs: 8 * 60 * 60_000,
  maxSessions: 32,
  maxRequests: 8,
  bodyBytes: 16 * 1024,
});

export interface LocalTutorAuth { sessionId: string; proof: string; origin: string }
export interface LocalTutorOperation {
  kind: "discover" | "test" | "chat";
  generation: number;
  candidateId?: string;
  requestId: string;
}
export interface LocalTutorLease {
  readonly connection: TutorConnectionMetadata;
  readonly kind: LocalTutorOperation["kind"];
  readonly signal: AbortSignal;
  /** Server-only access, checked again immediately before transport dispatch. */
  credential(): string | undefined;
  assertCurrent(): void;
  markTested(): void;
  finish(): void;
}

interface Pending {
  requestId: string;
  controller: AbortController;
  kind: LocalTutorOperation["kind"];
  detach(): void;
}
interface Entry {
  id: string;
  proof: string;
  origin: string;
  generation: number;
  createdAt: number;
  touchedAt: number;
  timer?: ReturnType<typeof setTimeout>;
  active?: ServerConnection;
  candidate?: { id: string; tested: boolean; connection: ServerConnection };
  pending?: Pending;
}

/** Per-server runtime owner. No disk, environment-key lookup, global store or network. */
export function createLocalTutorSessions() {
  const entries = new Map<string, Entry>();
  let requestCount = 0;
  let disposed = false;

  function finish(entry: Entry, pending: Pending, abort = false): void {
    if (entry.pending !== pending) return;
    entry.pending = undefined;
    requestCount--;
    pending.detach();
    if (abort) pending.controller.abort();
  }

  function clearConnections(entry: Entry): void {
    if (entry.active) entry.active.credential = undefined;
    if (entry.candidate) entry.candidate.connection.credential = undefined;
    entry.active = undefined;
    entry.candidate = undefined;
    entry.generation++;
    if (entry.pending) finish(entry, entry.pending, true);
  }

  function remove(entry: Entry): void {
    entries.delete(entry.id);
    clearTimeout(entry.timer);
    entry.proof = "";
    clearConnections(entry);
  }

  function expired(entry: Entry): boolean {
    return Date.now() >= Math.min(entry.createdAt + LOCAL_TUTOR_LIMITS.absoluteMs, entry.touchedAt + LOCAL_TUTOR_LIMITS.idleMs);
  }

  function arm(entry: Entry): void {
    clearTimeout(entry.timer);
    const deadline = Math.min(entry.createdAt + LOCAL_TUTOR_LIMITS.absoluteMs, entry.touchedAt + LOCAL_TUTOR_LIMITS.idleMs);
    entry.timer = setTimeout(() => {
      if (expired(entry)) remove(entry);
      else arm(entry);
    }, Math.max(1, deadline - Date.now()));
    entry.timer.unref();
  }

  function touch(entry: Entry): void {
    entry.touchedAt = Date.now();
    arm(entry);
  }

  function authenticate(auth: LocalTutorAuth): Entry {
    if (disposed || !/^[a-f0-9]{32}$/.test(auth.sessionId) || !/^[a-f0-9]{64}$/.test(auth.proof)) throw new TutorConnectionError("invalid_session");
    const entry = entries.get(auth.sessionId);
    if (!entry) throw new TutorConnectionError("session_expired");
    if (expired(entry)) { remove(entry); throw new TutorConnectionError("session_expired"); }
    if (entry.origin !== auth.origin || !timingSafeEqual(Buffer.from(entry.proof), Buffer.from(auth.proof))) throw new TutorConnectionError("invalid_session");
    return entry;
  }

  function generation(entry: Entry, expected: number): void {
    if (!Number.isSafeInteger(expected) || expected !== entry.generation) throw new TutorConnectionError("connection_changed");
  }

  function candidate(entry: Entry, id: string) {
    if (!entry.candidate || entry.candidate.id !== id) throw new TutorConnectionError("connection_changed");
    return entry.candidate;
  }

  function snapshot(entry: Entry): LocalTutorSessionSnapshot {
    return Object.freeze({
      sessionId: entry.id, generation: entry.generation,
      idleExpiresAt: entry.touchedAt + LOCAL_TUTOR_LIMITS.idleMs,
      absoluteExpiresAt: entry.createdAt + LOCAL_TUTOR_LIMITS.absoluteMs,
      ...(entry.active ? { active: entry.active.metadata } : {}),
      ...(entry.candidate ? { candidate: Object.freeze({ id: entry.candidate.id, tested: entry.candidate.tested, connection: entry.candidate.connection.metadata }) } : {}),
    });
  }

  return {
    create(origin: string): LocalTutorSessionCreated {
      if (disposed) throw new TutorConnectionError("invalid_session");
      for (const entry of entries.values()) if (expired(entry)) remove(entry);
      if (entries.size >= LOCAL_TUTOR_LIMITS.maxSessions) throw new TutorConnectionError("session_limit");
      const entry: Entry = {
        id: randomBytes(16).toString("hex"), proof: randomBytes(32).toString("hex"), origin,
        generation: 0, createdAt: Date.now(), touchedAt: Date.now(),
      };
      entries.set(entry.id, entry);
      arm(entry);
      return { session: snapshot(entry), proof: entry.proof, capabilities: { protocol: 1, providerOperations: false } };
    },
    /** Authenticate before accepting a body; does not extend the idle deadline. */
    authorize(auth: LocalTutorAuth): void { authenticate(auth); },
    status(auth: LocalTutorAuth): LocalTutorSessionSnapshot {
      const entry = authenticate(auth);
      touch(entry);
      return snapshot(entry);
    },
    stage(auth: LocalTutorAuth, expected: number, input: unknown): LocalTutorSessionSnapshot {
      const entry = authenticate(auth);
      generation(entry, expected);
      const connection = normalizeConnection(input);
      if (entry.candidate) entry.candidate.connection.credential = undefined;
      entry.candidate = { id: randomBytes(16).toString("hex"), tested: false, connection };
      if (entry.pending && entry.pending.kind !== "chat") finish(entry, entry.pending, true);
      touch(entry);
      return snapshot(entry);
    },
    discard(auth: LocalTutorAuth, expected: number, id: string): LocalTutorSessionSnapshot {
      const entry = authenticate(auth);
      generation(entry, expected);
      candidate(entry, id).connection.credential = undefined;
      entry.candidate = undefined;
      if (entry.pending && entry.pending.kind !== "chat") finish(entry, entry.pending, true);
      touch(entry);
      return snapshot(entry);
    },
    activate(auth: LocalTutorAuth, expected: number, id: string): LocalTutorSessionSnapshot {
      const entry = authenticate(auth);
      generation(entry, expected);
      const next = candidate(entry, id);
      requireSelectedModel(next.connection.metadata);
      if (!next.tested) throw new TutorConnectionError("connection_unverified");
      if (entry.active) entry.active.credential = undefined;
      entry.active = next.connection;
      entry.candidate = undefined;
      entry.generation++;
      if (entry.pending) finish(entry, entry.pending, true);
      touch(entry);
      return snapshot(entry);
    },
    disconnect(auth: LocalTutorAuth, expected: number): LocalTutorSessionSnapshot {
      const entry = authenticate(auth);
      generation(entry, expected);
      clearConnections(entry);
      touch(entry);
      return snapshot(entry);
    },
    cancel(auth: LocalTutorAuth, requestId: string): boolean {
      const entry = authenticate(auth);
      if (!entry.pending || entry.pending.requestId !== requestId) return false;
      finish(entry, entry.pending, true);
      touch(entry);
      return true;
    },
    close(auth: LocalTutorAuth): void { remove(authenticate(auth)); },
    begin(auth: LocalTutorAuth, input: LocalTutorOperation, callerSignal?: AbortSignal): LocalTutorLease {
      const operation = { ...input };
      const entry = authenticate(auth);
      generation(entry, operation.generation);
      if (!/^[A-Za-z0-9_-]{1,80}$/.test(operation.requestId) || !["chat", "test", "discover"].includes(operation.kind)) throw new TutorConnectionError("invalid_configuration");
      if (callerSignal?.aborted) throw new TutorConnectionError("request_cancelled");
      const selected = operation.kind === "chat" ? entry.active : candidate(entry, operation.candidateId ?? "").connection;
      if (!selected) throw new TutorConnectionError("connection_required");
      if (operation.kind !== "discover") requireSelectedModel(selected.metadata);
      if (entry.pending || requestCount >= LOCAL_TUTOR_LIMITS.maxRequests) throw new TutorConnectionError("request_busy");
      if (operation.kind === "test") candidate(entry, operation.candidateId ?? "").tested = false;
      const pending: Pending = { requestId: operation.requestId, kind: operation.kind, controller: new AbortController(), detach: () => callerSignal?.removeEventListener("abort", cancel) };
      const cancel = () => finish(entry, pending, true);
      entry.pending = pending;
      requestCount++;
      callerSignal?.addEventListener("abort", cancel, { once: true });
      touch(entry);
      const assertCurrent = () => {
        if (expired(entry) && entries.get(entry.id) === entry) remove(entry);
        if (disposed || entries.get(entry.id) !== entry || entry.pending !== pending || entry.generation !== operation.generation || pending.controller.signal.aborted) {
          throw new TutorConnectionError("request_cancelled");
        }
      };
      return {
        connection: selected.metadata, kind: operation.kind, signal: pending.controller.signal, assertCurrent,
        credential() { assertCurrent(); return selected.credential; },
        markTested() {
          assertCurrent();
          if (operation.kind !== "test") throw new TutorConnectionError("invalid_configuration");
          candidate(entry, operation.candidateId ?? "").tested = true;
        },
        finish() { finish(entry, pending); },
      };
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      for (const entry of entries.values()) remove(entry);
    },
  };
}

export type LocalTutorSessions = ReturnType<typeof createLocalTutorSessions>;
