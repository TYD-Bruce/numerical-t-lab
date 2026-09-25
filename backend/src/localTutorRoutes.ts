import type { IncomingMessage } from "node:http";
import { TutorConnectionError } from "./localTutorPolicy.js";
import type { LocalTutorAuth, LocalTutorSessions } from "./localTutorSession.js";

const OPERATIONS = ["session", "status", "stage", "discard", "activate", "disconnect", "cancel", "close"] as const;
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

export function handlePersonalRequest(operation: PersonalOperation, auth: LocalTutorAuth, body: unknown, sessions: LocalTutorSessions): { status: number; body: Record<string, unknown> } {
  switch (operation) {
    case "session":
      fields(body, []);
      return { status: 201, body: { ...sessions.create(auth.origin) } };
    case "status":
      fields(body, []);
      return { status: 200, body: { ...sessions.status(auth) } };
    case "stage": {
      const value = fields(body, ["generation", "connection"]);
      return { status: 200, body: { ...sessions.stage(auth, value.generation as number, value.connection) } };
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
