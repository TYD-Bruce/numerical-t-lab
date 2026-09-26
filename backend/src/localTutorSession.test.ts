import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalTutorSessions, LOCAL_TUTOR_LIMITS } from "./localTutorSession.js";

const origin = "http://127.0.0.1:5173";
const config = { provider: "openai", model: "fixture-model", apiKey: "fixture-key" };
let sessions: ReturnType<typeof createLocalTutorSessions>;
function tab() {
  const created = sessions.create(origin);
  return { sessionId: created.session.sessionId, proof: created.proof, origin };
}
function activate(auth: ReturnType<typeof tab>) {
  const before = sessions.status(auth);
  const staged = sessions.stage(auth, before.generation, config);
  const candidateId = staged.candidate!.id;
  const lease = sessions.begin(auth, { kind: "test", candidateId, generation: before.generation, requestId: "fixture-test" });
  lease.markTested();
  lease.finish();
  return sessions.activate(auth, before.generation, candidateId);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-25T12:00:00Z"));
  sessions = createLocalTutorSessions();
});
afterEach(() => { sessions.dispose(); vi.useRealTimers(); vi.unstubAllEnvs(); });

describe("local credential session ownership", () => {
  it("allows discovery without a model while test and activation require model selection", () => {
    const auth = tab();
    const staged = sessions.stage(auth, 0, { provider: "local", baseUrl: "http://localhost:8080" });
    const id = staged.candidate!.id;
    const discover = sessions.begin(auth, { kind: "discover", generation: 0, candidateId: id, requestId: "list" });
    expect(() => discover.markTested()).toThrow();
    discover.finish();
    expect(() => sessions.begin(auth, { kind: "test", generation: 0, candidateId: id, requestId: "test" })).toThrow(/choose a model/i);
    expect(() => sessions.activate(auth, 0, id)).toThrow(/choose a model/i);
    expect(sessions.status(auth).generation).toBe(0);
  });

  it("issues independent unguessable handles/proofs and binds them to the browser origin", () => {
    const a = tab(), b = tab();
    expect(a.sessionId).toMatch(/^[a-f0-9]{32}$/);
    expect(a.proof).toMatch(/^[a-f0-9]{64}$/);
    expect(a.sessionId).not.toBe(b.sessionId);
    expect(a.proof).not.toBe(b.proof);
    for (const invalid of [{ ...a, proof: b.proof }, { ...a, proof: "" }, { ...a, origin: "http://localhost:5173" }, { ...a, sessionId: b.sessionId }]) {
      expect(() => sessions.status(invalid)).toThrow();
    }
    expect(JSON.stringify(sessions.status(a))).not.toContain(a.proof);
  });

  it("stages without network or replacing the active connection, and activates only a tested candidate", () => {
    const auth = tab();
    const first = activate(auth);
    expect(first.generation).toBe(1);
    const staged = sessions.stage(auth, 1, { ...config, apiKey: "replacement-fixture" });
    expect(staged.active).toEqual(first.active);
    expect(staged.generation).toBe(1);
    expect(staged.candidate?.tested).toBe(false);
    expect(() => sessions.activate(auth, 1, staged.candidate!.id)).toThrow(/test/i);
    expect(JSON.stringify(staged)).not.toContain("fixture-key");
    expect(JSON.stringify(staged)).not.toContain("replacement-fixture");
    sessions.discard(auth, 1, staged.candidate!.id);
    expect(sessions.status(auth).active).toEqual(first.active);
  });

  it("replacements advance generation even with identical public metadata and reject stale actions", () => {
    const auth = tab();
    activate(auth);
    expect(activate(auth).generation).toBe(2);
    expect(() => sessions.disconnect(auth, 1)).toThrow(/changed/i);
    expect(() => sessions.stage(auth, 1, config)).toThrow(/changed/i);
    expect(sessions.status(auth).generation).toBe(2);
  });

  it("requires fresh test success after a candidate is tested again", () => {
    const auth = tab();
    activate(auth);
    const id = sessions.stage(auth, 1, config).candidate!.id;
    const first = sessions.begin(auth, { kind: "test", generation: 1, candidateId: id, requestId: "first-test" });
    first.markTested(); first.finish();
    const retry = sessions.begin(auth, { kind: "test", generation: 1, candidateId: id, requestId: "explicit-new-test" });
    retry.finish(); // A failed provider test cannot reuse the earlier success.
    expect(sessions.status(auth).candidate?.tested).toBe(false);
    expect(() => sessions.activate(auth, 1, id)).toThrow(/test/i);
    expect(sessions.status(auth).active?.model).toBe(config.model);
  });

  it("aborts and invalidates an old candidate lease, blocking late test success", () => {
    const auth = tab();
    const candidateId = sessions.stage(auth, 0, config).candidate!.id;
    const lease = sessions.begin(auth, { kind: "test", candidateId, generation: 0, requestId: "old-test" });
    expect(lease.credential()).toBe("fixture-key");
    sessions.stage(auth, 0, { ...config, apiKey: "new-key" });
    expect(lease.signal.aborted).toBe(true);
    expect(() => lease.credential()).toThrow();
    expect(() => lease.markTested()).toThrow();
    lease.finish();
    expect(sessions.status(auth).candidate?.tested).toBe(false);
  });

  it("disconnect forgets active/candidate credentials and aborts only the owning tab", () => {
    const a = tab(), b = tab();
    activate(a); activate(b);
    const one = sessions.begin(a, { kind: "chat", generation: 1, requestId: "a-request" });
    const two = sessions.begin(b, { kind: "chat", generation: 1, requestId: "b-request" });
    expect(() => one.markTested()).toThrow();
    const disconnected = sessions.disconnect(a, 1);
    expect(disconnected.generation).toBe(2);
    expect(disconnected.active).toBeUndefined();
    expect(one.signal.aborted).toBe(true);
    expect(() => one.credential()).toThrow();
    expect(two.signal.aborted).toBe(false);
    expect(two.credential()).toBe("fixture-key");
    two.finish(); one.finish();
  });

  it("enforces one request per tab and cancellation by exact request identity", () => {
    const auth = tab(); activate(auth);
    const first = sessions.begin(auth, { kind: "chat", generation: 1, requestId: "first" });
    expect(() => sessions.begin(auth, { kind: "chat", generation: 1, requestId: "second" })).toThrow(/busy/i);
    expect(sessions.cancel(auth, "other")).toBe(false);
    expect(first.signal.aborted).toBe(false);
    expect(sessions.cancel(auth, "first")).toBe(true);
    const second = sessions.begin(auth, { kind: "chat", generation: 1, requestId: "second" });
    first.finish();
    expect(sessions.cancel(auth, "first")).toBe(false);
    expect(second.signal.aborted).toBe(false);
    second.finish(); second.finish();
  });

  it("propagates a caller abort and refuses work from an already-aborted caller", () => {
    const auth = tab(); activate(auth);
    const controller = new AbortController();
    const lease = sessions.begin(auth, { kind: "chat", generation: 1, requestId: "first" }, controller.signal);
    controller.abort();
    expect(lease.signal.aborted).toBe(true);
    expect(() => sessions.begin(auth, { kind: "chat", generation: 1, requestId: "second" }, controller.signal)).toThrow();
    lease.finish();
  });

  it("captures operation identity and immutable nonsecret metadata independently of caller objects", () => {
    const auth = tab();
    const input = { ...config };
    const staged = sessions.stage(auth, 0, input);
    input.apiKey = "mutated-caller-key";
    const operation = { kind: "discover" as "discover" | "test", generation: 0, candidateId: staged.candidate!.id, requestId: "captured" };
    const lease = sessions.begin(auth, operation);
    operation.kind = "test"; operation.generation = 1; operation.requestId = "changed";
    expect(lease.credential()).toBe("fixture-key");
    expect(() => lease.markTested()).toThrow();
    expect(Object.isFrozen(staged)).toBe(true);
    expect(Object.isFrozen(staged.candidate?.connection)).toBe(true);
    expect(sessions.cancel(auth, "captured")).toBe(true);
  });

  it("expires precisely at the idle boundary without a follow-up request and aborts owned work", () => {
    const auth = tab(); activate(auth);
    const lease = sessions.begin(auth, { kind: "chat", generation: 1, requestId: "idle" });
    vi.advanceTimersByTime(LOCAL_TUTOR_LIMITS.idleMs - 1);
    expect(lease.signal.aborted).toBe(false);
    vi.advanceTimersByTime(1);
    expect(lease.signal.aborted).toBe(true);
    expect(() => lease.credential()).toThrow();
    expect(() => sessions.status(auth)).toThrow(/expired/i);
  });

  it("refreshes idle only for accepted operations, and absolute expiry still wins", () => {
    const auth = tab();
    for (let i = 0; i < 31; i++) {
      vi.advanceTimersByTime(15 * 60_000);
      sessions.status(auth);
    }
    const state = activate(auth);
    const lease = sessions.begin(auth, { kind: "chat", generation: state.generation, requestId: "absolute" });
    vi.advanceTimersByTime(15 * 60_000 - 1);
    expect(lease.signal.aborted).toBe(false);
    vi.advanceTimersByTime(1);
    expect(lease.signal.aborted).toBe(true);
    expect(() => sessions.status(auth)).toThrow(/expired/i);
  });

  it("observes authenticated activity without credentials or an idle renewal", () => {
    const auth = tab(), active = activate(auth);
    const expected = { sessionId: auth.sessionId, generation: 1, idleExpiresAt: active.idleExpiresAt };
    expect(sessions.activity(auth)).toEqual(expected);
    expect(Object.isFrozen(sessions.activity(auth))).toBe(true);
    vi.advanceTimersByTime(LOCAL_TUTOR_LIMITS.idleMs - 1);
    expect(() => sessions.activity({ ...auth, proof: "f".repeat(64) })).toThrow();
    expect(sessions.activity(auth)).toEqual(expected);
    vi.advanceTimersByTime(1);
    expect(() => sessions.activity(auth)).toThrow(/expired/i);
  });

  it("does not extend idle on bad proof, invalid configuration, stale generation or busy work", () => {
    const auth = tab(); activate(auth);
    const lease = sessions.begin(auth, { kind: "chat", generation: 1, requestId: "work" });
    vi.advanceTimersByTime(LOCAL_TUTOR_LIMITS.idleMs - 1);
    expect(() => sessions.status({ ...auth, proof: "f".repeat(64) })).toThrow();
    expect(() => sessions.stage(auth, 1, { ...config, apiKey: "" })).toThrow();
    expect(() => sessions.stage(auth, 0, config)).toThrow();
    expect(() => sessions.begin(auth, { kind: "chat", generation: 1, requestId: "busy" })).toThrow();
    vi.advanceTimersByTime(1);
    expect(lease.signal.aborted).toBe(true);
  });

  it("bounds sessions and concurrent work without evicting an active credential", () => {
    const all = Array.from({ length: LOCAL_TUTOR_LIMITS.maxSessions }, tab);
    expect(() => tab()).toThrow(/sessions/i);
    const leases = all.slice(0, LOCAL_TUTOR_LIMITS.maxRequests).map((auth, i) => {
      activate(auth);
      return sessions.begin(auth, { kind: "chat", generation: 1, requestId: `request-${i}` });
    });
    const next = all[LOCAL_TUTOR_LIMITS.maxRequests];
    const candidate = sessions.stage(next, 0, config).candidate!;
    expect(() => sessions.begin(next, { kind: "test", generation: 0, candidateId: candidate.id, requestId: "over-limit" })).toThrow(/busy/i);
    leases[0].finish();
    const accepted = sessions.begin(next, { kind: "test", generation: 0, candidateId: candidate.id, requestId: "accepted" });
    expect(accepted.credential()).toBe("fixture-key");
    accepted.finish(); leases.forEach(lease => lease.finish());
    vi.advanceTimersByTime(LOCAL_TUTOR_LIMITS.idleMs);
    expect(tab().sessionId).not.toBe(all[0].sessionId);
  });

  it("close and server disposal release all work; a new server cannot reuse old proof", () => {
    const a = tab(); activate(a);
    const lease = sessions.begin(a, { kind: "chat", generation: 1, requestId: "closing" });
    sessions.close(a);
    expect(lease.signal.aborted).toBe(true);
    expect(() => sessions.status(a)).toThrow();
    const b = tab(); activate(b);
    const other = sessions.begin(b, { kind: "chat", generation: 1, requestId: "shutdown" });
    sessions.dispose(); sessions.dispose();
    expect(other.signal.aborted).toBe(true);
    expect(() => tab()).toThrow();
    sessions = createLocalTutorSessions();
    expect(() => sessions.status(b)).toThrow();
  });
});
