import type { IncomingMessage } from "node:http";
import type { PersonalTutorChatResponse } from "@numerical-t-lab/contracts/tutor";
import { TutorConnectionError } from "./localTutorPolicy.js";
import type { LocalTutorAuth, LocalTutorSessions } from "./localTutorSession.js";
import { completeWithProvider, discoverModels, testProviderConnection, SUPPORTED_TUTOR_PROVIDERS } from "./ai/providers/providerAdapters.js";
import { preparePersonalChat, normalizePersonalTutorResponse } from "./ai/personalTutorChat.js";

const OPERATIONS = ["session", "status", "stage", "model", "discard", "activate", "disconnect", "cancel", "close", "discover", "test", "chat"] as const;
type PersonalOperation = typeof OPERATIONS[number];

export function personalOperation(path: string | undefined): PersonalOperation | undefined {
  return OPERATIONS.find(operation => path === `/api/personal/${operation}`);
}

export function authorizePersonalRequest(req: IncomingMessage, operation: PersonalOperation, sessions: LocalTutorSessions): LocalTutorAuth {
  const { origin, "sec-fetch-site": site, "x-t-lab-client": client, "x-t-lab-session": sessionId, "x-t-lab-proof": proof } = req.headers;
  if (typeof origin !== "string" || site !== "same-origin" || client !== "tutor-v1") throw new TutorConnectionError("invalid_session");
  if (operation === "session") {
    if (sessionId !== undefined || proof !== undefined) throw new TutorConnectionError("invalid_session");
    return { sessionId: "", proof: "", origin };
  }
  if (typeof sessionId !== "string" || typeof proof !== "string") throw new TutorConnectionError("invalid_session");
  const auth = { sessionId, proof, origin };
  sessions.authorize(auth);
  return auth;
}

function fields(body: unknown, names: readonly string[]): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new TutorConnectionError("invalid_configuration");
  const record = body as Record<string, unknown>;
  if (Object.keys(record).length !== names.length || names.some(name => !Object.hasOwn(record, name))) throw new TutorConnectionError("invalid_configuration");
  return record;
}

export async function handlePersonalRequest(operation: PersonalOperation, auth: LocalTutorAuth, body: unknown, sessions: LocalTutorSessions, signal?: AbortSignal): Promise<{ status: number; body: Record<string, unknown> }> {
  switch (operation) {
    case "session":
      fields(body, []);
      return { status: 201, body: { ...sessions.create(auth.origin), capabilities: { protocol: 1, providerOperations: true, providers: SUPPORTED_TUTOR_PROVIDERS, chatProfiles: ["ode"] } } };
    case "status":
      fields(body, []);
      return { status: 200, body: { ...sessions.status(auth) } };
    case "chat": {
      const { profile, generation, requestId, prompt } = preparePersonalChat(body);
      const lease = sessions.begin(auth, { kind: "chat", generation, requestId }, signal);
      try {
        const text = await completeWithProvider(lease, prompt);
        lease.assertCurrent();
        return { status: 200, body: { profile, generation, requestId, response: normalizePersonalTutorResponse(text) } satisfies PersonalTutorChatResponse };
      } catch (error) {
        // A late provider error cannot become the result of a replaced/cancelled request.
        lease.assertCurrent();
        throw error;
      } finally { lease.finish(); }
    }
    case "stage": {
      const value = fields(body, ["generation", "connection"]);
      return { status: 200, body: { ...sessions.stage(auth, value.generation as number, value.connection) } };
    }
    case "model": {
      const value = fields(body, ["generation", "candidateId", "model"]);
      if (typeof value.candidateId !== "string") throw new TutorConnectionError("invalid_configuration");
      return { status: 200, body: { ...sessions.selectModel(auth, value.generation as number, value.candidateId, value.model) } };
    }
    case "discover":
    case "test": {
      const value = fields(body, ["generation", "candidateId", "requestId"]);
      if (typeof value.candidateId !== "string" || typeof value.requestId !== "string") throw new TutorConnectionError("invalid_configuration");
      const lease = sessions.begin(auth, { kind: operation, generation: value.generation as number, candidateId: value.candidateId, requestId: value.requestId }, signal);
      try {
        if (operation === "discover") {
          const discovery = await discoverModels(lease);
          lease.assertCurrent();
          return { status: 200, body: { ...discovery } };
        }
        await testProviderConnection(lease);
        lease.assertCurrent();
        lease.markTested();
        return { status: 200, body: { session: sessions.status(auth) } };
      } finally { lease.finish(); }
    }
    case "discard":
    case "activate": {
      const value = fields(body, ["generation", "candidateId"]);
      if (typeof value.candidateId !== "string") throw new TutorConnectionError("invalid_configuration");
      return { status: 200, body: { ...sessions[operation](auth, value.generation as number, value.candidateId) } };
    }
    case "disconnect": {
      const value = fields(body, ["generation"]);
      return { status: 200, body: { ...sessions.disconnect(auth, value.generation as number) } };
    }
    case "cancel": {
      const value = fields(body, ["requestId"]);
      if (typeof value.requestId !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(value.requestId)) throw new TutorConnectionError("invalid_configuration");
      return { status: 200, body: { cancelled: sessions.cancel(auth, value.requestId) } };
    }
    case "close":
      fields(body, []);
      sessions.close(auth);
      return { status: 200, body: { closed: true } };
  }
}
