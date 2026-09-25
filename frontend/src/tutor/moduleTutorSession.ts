import type {
  ModuleTutorSession,
  TutorTranscriptItem,
} from "../app/contracts";

function freezeSession(
  items: readonly TutorTranscriptItem[],
  draftMessage: string,
  desktopOpen: boolean,
  revision: number
): ModuleTutorSession {
  return Object.freeze({
    items: Object.freeze([...items]),
    draftMessage,
    desktopOpen,
    revision,
  });
}

export function createEmptyModuleTutorSession(): ModuleTutorSession {
  return freezeSession([], "", false, 0);
}

export function appendTutorMessage(
  session: ModuleTutorSession,
  role: "user" | "assistant",
  content: string
): ModuleTutorSession {
  const item = Object.freeze({ kind: "message" as const, role, content });
  return freezeSession([...session.items, item], session.draftMessage, session.desktopOpen, session.revision + 1);
}

export function updateTutorDraft(
  session: ModuleTutorSession,
  draftMessage: string
): ModuleTutorSession {
  if (session.draftMessage === draftMessage) return session;
  return freezeSession(session.items, draftMessage, session.desktopOpen, session.revision);
}

export function setTutorDesktopOpen(
  session: ModuleTutorSession,
  desktopOpen: boolean
): ModuleTutorSession {
  if (session.desktopOpen === desktopOpen) return session;
  return freezeSession(session.items, session.draftMessage, desktopOpen, session.revision);
}

export function clearTutorConversation(
  session: ModuleTutorSession
): ModuleTutorSession {
  if (session.items.length === 0 && session.draftMessage === "") return session;
  return freezeSession([], "", session.desktopOpen, session.revision + 1);
}

export function appendNewExperimentDivider(
  session: ModuleTutorSession,
  divider: { readonly id: string; readonly body: string }
): ModuleTutorSession {
  const item = Object.freeze({
    kind: "divider" as const,
    id: divider.id,
    title: "New experiment started" as const,
    body: divider.body,
  });
  return freezeSession([...session.items, item], session.draftMessage, session.desktopOpen, session.revision + 1);
}

export function hasUserTutorMessage(session: ModuleTutorSession): boolean {
  return session.items.some((item) => item.kind === "message" && item.role === "user");
}

export function messagesForTutorRequest(
  session: ModuleTutorSession
): Array<{ role: "user" | "assistant"; content: string }> {
  return session.items.flatMap((item) =>
    item.kind === "message"
      ? [{ role: item.role, content: item.content }]
      : []
  );
}
