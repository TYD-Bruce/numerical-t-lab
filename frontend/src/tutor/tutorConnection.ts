import type { ChatResponse, LocalTutorSessionCreated, LocalTutorSessionSnapshot, TutorConnectionInput, TutorModelDiscovery } from "@numerical-t-lab/contracts/tutor";
import { TUTOR_FINAL_TEXT_BYTES } from "@numerical-t-lab/contracts/tutor";
import type { LabTutorBinding, ModuleTutorSession, TutorConversationConnection, TutorSessionAccess } from "../app/contracts";
import { clearTutorConversation, messagesForTutorRequest, sameTutorConnection, setTutorConversationConnection } from "./moduleTutorSession";
import { readActivity, readChartInstruction, readCreated, readDiscovery, readFailure, readReply, readSession, record, TutorClientError } from "./tutorConnectionProtocol";

export { TutorClientError } from "./tutorConnectionProtocol";
type Operation = "session" | "status" | "stage" | "model" | "discard" | "test" | "discover" | "activate" | "disconnect" | "chat";
type HistoryTarget = "current" | "candidate" | "hosted";
export interface TutorHistoryReview {
  readonly labId: TutorSessionAccess["moduleId"];
  readonly transcriptRevision: number;
  readonly from?: TutorConversationConnection;
  readonly to: TutorConversationConnection;
}
export interface TutorConnectionState {
  readonly status: "uninitialized" | "available" | "expired" | "unavailable" | "disposed";
  readonly selected: TutorConversationConnection;
  readonly session?: LocalTutorSessionSnapshot;
  readonly capabilities?: LocalTutorSessionCreated["capabilities"];
  readonly pending?: Operation;
}

/** One instance belongs to one tab, survives Lab navigation, and has no import-time effects. */
export function createTutorConnection(options: { readonly fetch?: typeof fetch; readonly origin?: () => string } = {}) {
  const fetcher = options.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const origin = options.origin ?? (() => window.location.origin);
  const tabId = crypto.randomUUID();
  let selectionSequence = 0;
  let selected: TutorConversationConnection = Object.freeze({ kind: "hosted", sessionId: tabId, generation: 0 });
  let session: LocalTutorSessionSnapshot | undefined;
  let proof: string | undefined;
  let capabilities: LocalTutorSessionCreated["capabilities"] | undefined;
  let status: TutorConnectionState["status"] = "uninitialized";
  let epoch = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: { operation: Operation; controller: AbortController; requestId: string; detach(): void } | undefined;
  const activityChecks = new Set<{ sessionId: string; generation: number; epoch: number; controller: AbortController }>();
  const listeners = new Set<() => void>();
  const reviews = new Map<TutorSessionAccess["moduleId"], { review: TutorHistoryReview; target: HistoryTarget; candidateId?: string; selection: TutorConversationConnection }>();

  function notify() { for (const listener of [...listeners]) listener(); }
  function local() {
    const match = /^http:\/\/(?:localhost|127\.0\.0\.1):([1-9]\d{0,4})$/.exec(origin());
    if (!match || Number(match[1]) > 65535) throw new TutorClientError("local_required");
  }
  function headers(sessionId?: string, token?: string): Record<string, string> {
    return { "Content-Type": "application/json", "X-T-Lab-Client": "tutor-v1",
      ...(sessionId && token ? { "X-T-Lab-Session": sessionId, "X-T-Lab-Proof": token } : {}) };
  }
  function requestOptions(body: unknown, sessionId?: string, token?: string): RequestInit {
    return { method: "POST", headers: headers(sessionId, token), body: JSON.stringify(body), mode: "same-origin", credentials: "omit", redirect: "error", cache: "no-store", referrerPolicy: "no-referrer" };
  }
  function reconcileActivity(data: unknown, id?: string, generation?: number): boolean {
    const activity = readActivity(data);
    if (!activity) return false;
    if (activity.sessionId !== id || activity.generation !== generation) throw new TutorClientError("response_invalid");
    if (!session || session.sessionId !== id || session.generation !== generation) return false;
    // An older acknowledgement must not roll back newer accepted activity.
    session = Object.freeze({ ...session, idleExpiresAt: Math.max(session.idleExpiresAt, activity.idleExpiresAt) });
    return true;
  }
  function awaitingActivity() {
    return [...activityChecks].some(check => check.epoch === epoch && check.sessionId === session?.sessionId && check.generation === session.generation);
  }
  // Best effort and bounded: cancellation can acknowledge accepted activity;
  // close never revives state. Neither operation retries or invokes a model.
  function cleanup(operation: "close" | "cancel", body: object, id = session?.sessionId, token = proof) {
    if (!id || !token) return;
    const controller = new AbortController();
    const check = operation === "cancel" && session?.sessionId === id ? { sessionId: id, generation: session.generation, epoch, controller } : undefined;
    if (check) activityChecks.add(check);
    let finished = false;
    const current = () => !!check && check.epoch === epoch && session?.sessionId === check.sessionId && session.generation === check.generation;
    const finish = () => {
      if (finished) return; finished = true; clearTimeout(timeout);
      if (check) activityChecks.delete(check);
      if (current()) { expireIfNeeded(); arm(); notify(); }
    };
    const timeout = setTimeout(() => { controller.abort(); finish(); }, 1500);
    try {
      local();
      void fetcher(`/api/personal/${operation}`, { ...requestOptions(body, id, token), keepalive: true, signal: controller.signal })
        .then(async response => {
          if (!check || !current()) { await response.body?.cancel(); return; }
          const assertCurrent = () => { if (finished || controller.signal.aborted || !current()) throw new TutorClientError("request_cancelled"); };
          const data = await readReply(response, assertCurrent);
          assertCurrent();
          if (response.ok) reconcileActivity(data, check.sessionId, check.generation);
        }).catch(() => undefined).finally(finish);
    } catch { finish(); /* no credentials leave an ineligible origin */ }
  }
  function invalidate(next: "expired" | "unavailable" | "disposed") {
    const id = session?.sessionId, token = proof;
    // Once a personal selection mutation may have reached the server, a lost
    // reply cannot silently revive hosted sending.
    if (session && pending && ["activate", "disconnect"].includes(pending.operation)) selected = personalIdentity(session, session.generation + 1);
    epoch++; clearTimeout(timer); timer = undefined; reviews.clear();
    for (const check of activityChecks) check.controller.abort();
    activityChecks.clear();
    const previous = pending; pending = undefined; previous?.detach(); previous?.controller.abort();
    if (selected.kind === "personal") selected = Object.freeze({ ...selected, generation: selected.generation + 1 });
    session = undefined; proof = undefined; capabilities = undefined; status = next;
    cleanup("close", {}, id, token);
    notify();
  }
  function expireIfNeeded() {
    if (session && Date.now() >= Math.min(session.absoluteExpiresAt, pending || awaitingActivity() ? Infinity : session.idleExpiresAt)) invalidate("expired");
  }
  function arm() {
    clearTimeout(timer); timer = undefined;
    if (!session) return;
    const deadline = Math.min(session.absoluteExpiresAt, pending || awaitingActivity() ? Infinity : session.idleExpiresAt);
    timer = setTimeout(() => { expireIfNeeded(); arm(); }, Math.max(1, Math.min(2_147_483_647, deadline - Date.now())));
  }
  function requireSession(): LocalTutorSessionSnapshot {
    expireIfNeeded();
    if (status === "expired") throw new TutorClientError("session_expired");
    if (!session || !proof || status !== "available") throw new TutorClientError("connection_required");
    return session;
  }
  function personalIdentity(value: LocalTutorSessionSnapshot, generation = value.generation): TutorConversationConnection {
    return Object.freeze({ kind: "personal", sessionId: value.sessionId, generation });
  }
  function snapshot(value: unknown, expectedGeneration: number): LocalTutorSessionSnapshot {
    const next = readSession(value);
    if (!session || next.sessionId !== session.sessionId || next.generation !== expectedGeneration) throw new TutorClientError("response_invalid");
    return next;
  }
  async function run<T>(operation: Operation, body: object, consume: (value: unknown) => T, scope = () => true, signal?: AbortSignal): Promise<T> {
    local(); expireIfNeeded();
    if (status === "disposed") throw new TutorClientError("request_cancelled");
    if (pending) throw new TutorClientError("request_busy");
    if (operation !== "session") requireSession();
    if (signal?.aborted || !scope()) throw new TutorClientError("request_cancelled");
    const ownEpoch = epoch, startedAt = Date.now(), controller = new AbortController();
    const sessionId = session?.sessionId, generation = session?.generation;
    let timedOut = false;
    const requestId = crypto.randomUUID();
    const abort = () => cancel();
    const own = { operation, controller, requestId, detach: () => signal?.removeEventListener("abort", abort) };
    pending = own;
    signal?.addEventListener("abort", abort, { once: true });
    const assertCurrent = (allowAborted = false) => {
      expireIfNeeded();
      if (epoch !== ownEpoch || pending !== own || signal?.aborted || !scope()) throw new TutorClientError("request_cancelled");
      if (!allowAborted && controller.signal.aborted) throw new TutorClientError(timedOut ? "timeout" : "request_cancelled");
    };
    const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, ["chat", "test"].includes(operation) ? 120_000 : operation === "discover" ? 20_000 : 15_000);
    arm(); notify();
    try {
      assertCurrent();
      const response = await fetcher(`/api/personal/${operation}`, {
        ...requestOptions(["chat", "test", "discover"].includes(operation) ? { ...body, requestId } : body, session?.sessionId, proof), signal: controller.signal,
      });
      assertCurrent();
      const data = await readReply(response, assertCurrent);
      assertCurrent();
      // A terminal session failure can legitimately report the backend's newer
      // generation. Preserve that failure instead of masking it with stale-ack validation.
      const failure = response.ok ? undefined : readFailure(data, response.status);
      if (failure && ["session_expired", "invalid_session", "connection_changed"].includes(failure.code)) throw failure;
      const acknowledged = ["chat", "test", "discover"].includes(operation) && reconcileActivity(data, sessionId, generation);
      if (failure) throw failure;
      if (operation === "chat") {
        const result = record(data);
        if (result.requestId !== requestId) throw new TutorClientError("response_invalid");
      }
      const result = consume(data);
      // Successful non-snapshot operations accepted activity at or after dispatch.
      // This conservative deadline never renews the server's absolute lifetime.
      if (!acknowledged && session && ["discover", "chat"].includes(operation)) session = Object.freeze({ ...session, idleExpiresAt: Math.max(session.idleExpiresAt, startedAt + session.idleTimeoutMs) });
      return result;
    } catch (error) {
      assertCurrent(true);
      const failure = timedOut ? new TutorClientError("timeout") : error instanceof TutorClientError ? error : new TutorClientError("provider_unavailable");
      if (["session_expired", "invalid_session", "connection_changed"].includes(failure.code)) invalidate(failure.code === "session_expired" ? "expired" : "unavailable");
      // The server may have applied these mutations before a lost/malformed reply.
      else if (["session", "activate", "disconnect"].includes(operation) && ["provider_unavailable", "response_invalid", "response_too_large", "redirect_rejected", "timeout"].includes(failure.code)) invalidate("unavailable");
      else if (timedOut && ["chat", "test", "discover"].includes(operation)) cleanup("cancel", { requestId });
      throw failure;
    } finally {
      clearTimeout(timeout); own.detach();
      if (pending === own) { pending = undefined; controller.abort(); expireIfNeeded(); arm(); notify(); }
    }
  }
  function cancel() {
    const own = pending;
    if (!own) return;
    if (["session", "activate", "disconnect"].includes(own.operation)) { invalidate("unavailable"); return; }
    pending = undefined; own.detach(); own.controller.abort();
    if (["chat", "test", "discover"].includes(own.operation)) cleanup("cancel", { requestId: own.requestId });
    arm(); notify();
  }
  function readyIdentity(): TutorConversationConnection {
    if (selected.kind === "personal") {
      const current = requireSession();
      if (!current.active || !sameTutorConnection(selected, personalIdentity(current))) throw new TutorClientError("connection_required");
    } else if (status === "disposed") throw new TutorClientError("request_cancelled");
    return selected;
  }
  function canSendHistory(access: TutorSessionAccess): boolean {
    try { const identity = readyIdentity(); return !messagesForTutorRequest(access.getSession()).length || sameTutorConnection(access.getSession().connection, identity); } catch { return false; }
  }
  async function discardCandidate() {
    const current = requireSession(); if (!current.candidate) return;
    reviews.clear();
    session = Object.freeze({ ...current, candidate: Object.freeze({ ...current.candidate, tested: false }) });
    await run("discard", { generation: current.generation, candidateId: current.candidate.id }, data => {
      const next = snapshot(data, current.generation);
      if (next.candidate) throw new TutorClientError("response_invalid");
      session = next;
    });
  }
  function applyHistory(access: TutorSessionAccess, review: TutorHistoryReview, choice: "fresh" | "transfer") {
    let applied: ModuleTutorSession | undefined;
    access.updateSession(current => {
      if (access.moduleId !== review.labId || current.revision !== review.transcriptRevision || !sameTutorConnection(current.connection, review.from)) throw new TutorClientError("history_changed");
      applied = setTutorConversationConnection(choice === "fresh" ? clearTutorConversation(current) : current, review.to);
      return applied;
    });
    if (!applied || access.getSession().revision !== applied.revision || !sameTutorConnection(access.getSession().connection, review.to) || !sameTutorConnection(selected, review.to)) throw new TutorClientError("history_changed");
  }

  return {
    getState(): TutorConnectionState { expireIfNeeded(); return Object.freeze({ status, selected, ...(session ? { session } : {}), ...(capabilities ? { capabilities } : {}), ...(pending ? { pending: pending.operation } : {}) }); },
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    async initialize() {
      if (session) { requireSession(); return; }
      await run("session", {}, data => { const value = readCreated(data); session = value.session; proof = value.proof; capabilities = value.capabilities; status = "available"; });
      requireSession();
    },
    async refresh() {
      const current = requireSession();
      await run("status", {}, data => { session = snapshot(data, current.generation); });
    },
    async stage(input: TutorConnectionInput) {
      const current = requireSession(); reviews.clear();
      if (current.candidate) session = Object.freeze({ ...current, candidate: Object.freeze({ ...current.candidate, tested: false }) });
      await run("stage", { generation: current.generation, connection: input }, data => {
        const next = snapshot(data, current.generation);
        if (!next.candidate || next.candidate.tested) throw new TutorClientError("response_invalid");
        session = next;
      });
    },
    discard: discardCandidate,
    async selectModel(model: string) {
      const current = requireSession(); if (!current.candidate) throw new TutorClientError("connection_required");
      reviews.clear();
      session = Object.freeze({ ...current, candidate: Object.freeze({ ...current.candidate, tested: false }) });
      await run("model", { generation: current.generation, candidateId: current.candidate.id, model }, data => {
        const next = snapshot(data, current.generation);
        if (!next.candidate || next.candidate.id === current.candidate!.id || next.candidate.tested || next.candidate.connection.model !== model) throw new TutorClientError("response_invalid");
        session = next;
      });
    },
    async discover(): Promise<TutorModelDiscovery> {
      const current = requireSession(); if (!current.candidate) throw new TutorClientError("connection_required");
      return run("discover", { generation: current.generation, candidateId: current.candidate.id }, readDiscovery);
    },
    async test() {
      const current = requireSession(); if (!current.candidate) throw new TutorClientError("connection_required");
      reviews.clear();
      session = Object.freeze({ ...current, candidate: Object.freeze({ ...current.candidate, tested: false }) });
      await run("test", { generation: current.generation, candidateId: current.candidate.id }, data => {
        const next = snapshot(record(data).session, current.generation);
        if (next.candidate?.id !== current.candidate!.id || !next.candidate.tested) throw new TutorClientError("response_invalid");
        session = next;
      });
    },
    reviewHistory(access: TutorSessionAccess, target: HistoryTarget = "current"): TutorHistoryReview {
      if (status === "disposed") throw new TutorClientError("request_cancelled");
      if (pending && ["session", "activate", "disconnect"].includes(pending.operation)) throw new TutorClientError("request_busy");
      let to: TutorConversationConnection, candidateId: string | undefined;
      if (target === "candidate") {
        const current = requireSession();
        if (!current.candidate?.tested) throw new TutorClientError("connection_unverified");
        to = personalIdentity(current, current.generation + 1); candidateId = current.candidate.id;
      } else if (target === "hosted") to = Object.freeze({ kind: "hosted", sessionId: tabId, generation: selectionSequence + 1 });
      else if (target === "current") to = readyIdentity();
      else throw new TutorClientError("history_changed");
      if (target !== "current") cancel();
      const transcript = access.getSession();
      const review = Object.freeze({ labId: access.moduleId, transcriptRevision: transcript.revision, ...(transcript.connection ? { from: transcript.connection } : {}), to });
      reviews.set(access.moduleId, { review, target, candidateId, selection: selected });
      return review;
    },
    async decideHistory(access: TutorSessionAccess, review: TutorHistoryReview, choice: "fresh" | "transfer" | "cancel" = "fresh") {
      if (!["fresh", "transfer", "cancel"].includes(choice)) throw new TutorClientError("history_changed");
      const decision = reviews.get(access.moduleId), transcript = access.getSession();
      if (!decision || decision.review !== review || review.labId !== access.moduleId || transcript.revision !== review.transcriptRevision || !sameTutorConnection(transcript.connection, review.from) || !sameTutorConnection(selected, decision.selection)) throw new TutorClientError("history_changed");
      reviews.delete(access.moduleId);
      if (choice === "cancel") { if (decision.target === "candidate") await discardCandidate(); return; }
      if (decision.target === "candidate") {
        const current = requireSession();
        if (!current.candidate || current.candidate.id !== decision.candidateId || !current.candidate.tested || !sameTutorConnection(review.to, personalIdentity(current, current.generation + 1))) throw new TutorClientError("history_changed");
        cancel();
        await run("activate", { generation: current.generation, candidateId: decision.candidateId }, data => {
          const next = snapshot(data, current.generation + 1);
          if (!next.active || next.candidate) throw new TutorClientError("response_invalid");
          session = next; selected = personalIdentity(next); selectionSequence++; reviews.clear();
        });
      } else if (decision.target === "hosted") {
        cancel();
        const id = session?.sessionId, token = proof;
        epoch++; clearTimeout(timer); session = undefined; proof = undefined; capabilities = undefined; status = "uninitialized";
        selected = review.to; selectionSequence++; reviews.clear(); cleanup("close", {}, id, token);
      } else {
        cancel();
        if (!sameTutorConnection(readyIdentity(), review.to)) throw new TutorClientError("history_changed");
      }
      applyHistory(access, review, choice); notify();
    },
    canSendHistory,
    prepareConversation(access: TutorSessionAccess) {
      const identity = readyIdentity();
      if (!canSendHistory(access)) throw new TutorClientError("history_required");
      access.updateSession(current => {
        if (messagesForTutorRequest(current).length && !sameTutorConnection(current.connection, identity)) throw new TutorClientError("history_changed");
        return setTutorConversationConnection(current, identity);
      });
      if (!sameTutorConnection(selected, identity) || !sameTutorConnection(access.getSession().connection, identity)) throw new TutorClientError("history_changed");
    },
    async send(binding: LabTutorBinding, access: TutorSessionAccess, signal: AbortSignal, isCurrent = () => true): Promise<ChatResponse> {
      const current = requireSession(), identity = readyIdentity(), transcript = access.getSession(), context = binding.getContext();
      if (identity.kind !== "personal" || !current.active) throw new TutorClientError("connection_required");
      if (binding.moduleId !== access.moduleId || binding.promptProfile !== access.moduleId || !capabilities?.chatProfiles.some(profile => profile === binding.promptProfile)) throw new TutorClientError("profile_unsupported");
      if (context.status !== "ready") throw new TutorClientError("invalid_context");
      if (!sameTutorConnection(transcript.connection, identity)) throw new TutorClientError("history_required");
      const scope = () => {
        const latest = binding.getContext();
        return isCurrent() && sameTutorConnection(selected, identity) && access.moduleId === binding.moduleId &&
          access.getSession().revision === transcript.revision && sameTutorConnection(access.getSession().connection, identity) && latest.status === "ready" && latest.revision === context.revision;
      };
      try {
        return await run("chat", { profile: binding.promptProfile, generation: current.generation, messages: messagesForTutorRequest(transcript), context: context.context }, data => {
          const value = record(data), response = record(value.response);
          if (value.profile !== binding.promptProfile || value.generation !== current.generation || typeof response.message !== "string" || !response.message.trim() || new TextEncoder().encode(response.message).length > TUTOR_FINAL_TEXT_BYTES) throw new TutorClientError("response_invalid");
          const chart = binding.promptProfile === "ode" ? readChartInstruction(response.chartInstruction) : undefined;
          return { message: response.message, ...(chart ? { chartInstruction: chart } : {}) };
        }, scope, signal);
      } finally {
        // run() notifies completion subscribers on both outcomes before settling.
        if (signal.aborted || !scope()) throw new TutorClientError("request_cancelled");
      }
    },
    async disconnect() {
      const current = requireSession(); cancel(); reviews.clear();
      await run("disconnect", { generation: current.generation }, data => {
        const next = snapshot(data, current.generation + 1);
        if (next.active || next.candidate) throw new TutorClientError("response_invalid");
        session = next; selected = personalIdentity(next); selectionSequence++;
      });
    },
    cancel,
    dispose() { if (status === "disposed") return; invalidate("disposed"); listeners.clear(); },
  };
}

export type TutorConnection = ReturnType<typeof createTutorConnection>;
