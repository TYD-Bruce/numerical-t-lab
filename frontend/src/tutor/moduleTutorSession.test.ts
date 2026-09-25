import { describe, expect, it } from "vitest";
import {
  appendNewExperimentDivider,
  appendTutorMessage,
  clearTutorConversation,
  createEmptyModuleTutorSession,
  messagesForTutorRequest,
  setTutorDesktopOpen,
  updateTutorDraft,
} from "./moduleTutorSession";

describe("Module Tutor session values", () => {
  it("updates immutable transcript, draft, and desktop preference independently", () => {
    const empty = createEmptyModuleTutorSession();
    const opened = setTutorDesktopOpen(empty, true);
    const drafted = updateTutorDraft(opened, "Explain Euler");
    const messaged = appendTutorMessage(drafted, "user", "Why is it first order?");

    expect(empty).toEqual({ items: [], draftMessage: "", desktopOpen: false, revision: 0 });
    expect(messaged.items).toEqual([
      { kind: "message", role: "user", content: "Why is it first order?" },
    ]);
    expect(Object.isFrozen(messaged.items)).toBe(true);
    expect(clearTutorConversation(messaged)).toEqual({
      items: [],
      draftMessage: "",
      desktopOpen: true,
      revision: 2,
    });
  });

  it("advances transcript revision on messages/dividers/clear, not draft or placement", () => {
    const empty = createEmptyModuleTutorSession();
    const message = appendTutorMessage(empty, "user", "Question");
    const draft = updateTutorDraft(setTutorDesktopOpen(message, true), "Next question");
    const divider = appendNewExperimentDivider(draft, { id: "next", body: "New experiment" });
    const cleared = clearTutorConversation(divider);
    expect([empty.revision, message.revision, draft.revision, divider.revision, cleared.revision]).toEqual([0, 1, 1, 2, 3]);
    expect(clearTutorConversation(cleared)).toBe(cleared);
    expect(message.items).toEqual([{ kind: "message", role: "user", content: "Question" }]);
  });

  it("retains dividers for rendering but excludes them from API messages", () => {
    const divided = appendNewExperimentDivider(
      appendTutorMessage(createEmptyModuleTutorSession(), "user", "Old question"),
      { id: "experiment-2", body: "The Lab returned to its starter state." }
    );
    const session = appendTutorMessage(divided, "assistant", "New answer");

    expect(session.items[1]).toMatchObject({
      kind: "divider",
      title: "New experiment started",
    });
    expect(messagesForTutorRequest(session)).toEqual([
      { role: "user", content: "Old question" },
      { role: "assistant", content: "New answer" },
    ]);
  });
});
