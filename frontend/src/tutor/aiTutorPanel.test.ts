// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAppSessionStore } from "../app/appSessionStore";
import type { LabTutorBinding } from "../app/contracts";
import type { ChatRequest } from "@numerical-t-lab/contracts/tutor";
import { buildOdeLabContext } from "../labs/ode/odeTutorContext";
import { createReadonlySolverResult } from "../labs/ode/odeSession";
import { createBeginnerStarterSession, createOdeResumeSummary } from "../labs/ode/odeSession";
import { mountPlatformTutorPanel } from "./platformTutorPanel";
import { appendTutorMessage } from "./moduleTutorSession";
import { appendNewExperimentDivider } from "./moduleTutorSession";

const RESULT = createReadonlySolverResult({
  points: [
    { t: 0, y: 1 },
    { t: 0.1, y: 0.9 },
  ],
  metadata: {
    family: "forward_euler",
    displayName: "Forward Euler",
    order: 1,
    isImplicit: false,
    formulaType: "one-step-explicit",
    formulaDisplay: "u next = u + h f",
    notes: [],
  },
});

function source() {
  return {
    status: "ready" as const,
    revision: 0,
    context: buildOdeLabContext(RESULT, {
      kind: "first_order",
      equationDisplay: "y' = -y",
      t0: 0,
      tEnd: 0.1,
      h: 0.1,
      y0: 1,
    }),
  };
}

async function submit(host: HTMLElement, value: string): Promise<void> {
  const input = host.querySelector<HTMLTextAreaElement>("#platform-tutor-input")!;
  input.value = value;
  host.querySelector<HTMLFormElement>(".ai-compose")!.dispatchEvent(
    new Event("submit", { bubbles: true, cancelable: true })
  );
  await vi.waitFor(() => {
    expect(host.querySelector<HTMLButtonElement>(".ai-send")?.disabled).toBe(false);
  });
}

describe("shared Tutor panel", () => {
  beforeEach(() => document.body.replaceChildren());

  it("keeps the transcript and complete composer inside one panel", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const store = createAppSessionStore();
    const mounted = mountPlatformTutorPanel(host, {
      binding: {
        moduleId: "ode",
        promptProfile: "ode",
        suggestedQuestions: ["Explain this result."],
        description: "ODE fixture context",
        getContext: source,
      },
      sessionAccess: store.createTutorSessionAccess("ode"),
      onClose: vi.fn(),
      isCurrent: () => true,
    });

    const panel = host.querySelector<HTMLElement>(".ai-tutor-panel")!;
    const content = panel.querySelector<HTMLElement>(".ai-tutor-content")!;
    const transcript = content.querySelector<HTMLElement>(".ai-messages")!;
    const composer = content.querySelector<HTMLFormElement>(".ai-compose")!;
    const actions = composer.querySelector<HTMLElement>(".ai-compose-actions")!;

    expect(host.querySelectorAll(".ai-tutor-panel")).toHaveLength(1);
    expect(transcript.getAttribute("role")).toBe("log");
    expect(transcript.getAttribute("aria-label")).toBe("Tutor conversation");
    expect(panel.contains(composer)).toBe(true);
    expect(panel.contains(actions)).toBe(true);
    expect(actions.textContent).toContain("Clear chat");
    expect(actions.textContent).toContain("Send");
    expect(host.querySelector<HTMLDetailsElement>(".ai-suggestion-disclosure")?.open)
      .toBe(true);
    expect(host.querySelector(".ai-suggestion-disclosure summary")?.hasAttribute("hidden"))
      .toBe(true);
    mounted.dispose();
  });

  it("collapses suggestions behind a disclosure after the first user message", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const store = createAppSessionStore();
    const mounted = mountPlatformTutorPanel(host, {
      binding: {
        moduleId: "ode",
        promptProfile: "ode",
        suggestedQuestions: ["Explain this result.", "What does the graph show?"],
        description: "ODE fixture context",
        getContext: source,
      },
      sessionAccess: store.createTutorSessionAccess("ode"),
      onClose: vi.fn(),
      isCurrent: () => true,
      sendMessage: async () => ({ message: "Grounded reply." }),
    });

    await submit(host, "My first question");
    const disclosure = host.querySelector<HTMLDetailsElement>(
      ".ai-suggestion-disclosure"
    )!;
    const summary = disclosure.querySelector("summary")!;
    expect(disclosure.open).toBe(false);
    expect(summary.hidden).toBe(false);
    expect(summary.textContent).toBe("Suggested questions");
    expect(host.querySelectorAll("[data-tutor-suggestion]")).toHaveLength(2);
    mounted.dispose();
  });

  it("never exposes internal environment guidance in learner-facing errors", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const store = createAppSessionStore();
    const mounted = mountPlatformTutorPanel(host, {
      binding: {
        moduleId: "ode",
        promptProfile: "ode",
        suggestedQuestions: [],
        description: "ODE fixture context",
        getContext: source,
      },
      sessionAccess: store.createTutorSessionAccess("ode"),
      onClose: vi.fn(),
      isCurrent: () => true,
      sendMessage: async () => {
        throw new Error(
          "OPENAI_API_KEY missing; set AI_TUTOR_MOCK in .env.local without a VITE_ prefix"
        );
      },
    });

    await submit(host, "Can you explain this?");
    const error = host.querySelector<HTMLElement>(".ai-error")!;
    expect(error.textContent).toBe(
      "AI Tutor is temporarily unavailable. Please try again later."
    );
    expect(host.textContent).not.toMatch(
      /OPENAI_API_KEY|AI_TUTOR_MOCK|\.env\.local|VITE_/
    );
    mounted.dispose();
  });

  it("reads fresh binding context and live transcript for every message", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const store = createAppSessionStore();
    const access = store.createTutorSessionAccess("ode");
    let current = source();
    const requests: ChatRequest<object>[] = [];
    const binding: LabTutorBinding = {
      moduleId: "ode",
      promptProfile: "ode",
      suggestedQuestions: [],
      description: "ODE fixture context",
      getContext: () => current,
    };
    const mounted = mountPlatformTutorPanel(host, {
      binding,
      sessionAccess: access,
      onClose: vi.fn(),
      isCurrent: () => true,
      sendMessage: async (request) => {
        requests.push(request);
        return { message: "Grounded reply." };
      },
    });

    await submit(host, "Before study");
    store.updateTutor("ode", (session) =>
      appendTutorMessage(session, "assistant", "External update")
    );
    current = { ...current, revision: 1, context: { ...current.context, result: { ...current.context.result, finalY: 0.8 } } };
    await submit(host, "After external update");

    expect(requests).toHaveLength(2);
    expect(requests[0]!.context).toMatchObject({ result: { finalY: 0.9 } });
    expect(requests[1]!.context).toMatchObject({ result: { finalY: 0.8 } });
    expect(requests[1]!.messages.map((item) => item.content)).toContain("External update");
    expect(store.getTutor("ode").items.map((item) => item.kind)).not.toContain("divider-only");
    mounted.dispose();
  });

  it("stores the user message before a request and ignores an aborted completion", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const store = createAppSessionStore();
    let resolve!: (value: { message: string }) => void;
    const response = new Promise<{ message: string }>((done) => { resolve = done; });
    const binding: LabTutorBinding = {
      moduleId: "ode",
      promptProfile: "ode",
      suggestedQuestions: [],
      description: "ODE fixture context",
      getContext: source,
    };
    const mounted = mountPlatformTutorPanel(host, {
      binding,
      sessionAccess: store.createTutorSessionAccess("ode"),
      onClose: vi.fn(),
      isCurrent: () => true,
      sendMessage: () => response,
    });
    const input = host.querySelector<HTMLTextAreaElement>("#platform-tutor-input")!;
    input.value = "Keep unmatched";
    host.querySelector<HTMLFormElement>(".ai-compose")!.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );
    expect(store.getTutor("ode").items).toEqual([
      { kind: "message", role: "user", content: "Keep unmatched" },
    ]);
    mounted.dispose();
    resolve({ message: "Too late" });
    await response;
    await Promise.resolve();
    expect(store.getTutor("ode").items).toHaveLength(1);
  });

  it("updates the live session while presentation is hidden without focusing hidden DOM", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const store = createAppSessionStore();
    let resolve!: (value: { message: string }) => void;
    const response = new Promise<{ message: string }>((done) => {
      resolve = done;
    });
    let presentationVisible = true;
    const mounted = mountPlatformTutorPanel(host, {
      binding: {
        moduleId: "ode",
        promptProfile: "ode",
        suggestedQuestions: [],
        description: "ODE fixture context",
        getContext: source,
      },
      sessionAccess: store.createTutorSessionAccess("ode"),
      onClose: vi.fn(),
      isCurrent: () => true,
      isPresentationVisible: () => presentationVisible,
      sendMessage: () => response,
    });
    const input = host.querySelector<HTMLTextAreaElement>("#platform-tutor-input")!;
    const focus = vi.spyOn(input, "focus");
    input.value = "Finish while hidden";
    host.querySelector<HTMLFormElement>(".ai-compose")!.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );
    presentationVisible = false;
    resolve({ message: "Stored without focus." });
    await response;
    await vi.waitFor(() => expect(store.getTutor("ode").items).toHaveLength(2));

    expect(store.getTutor("ode").items.at(-1)).toMatchObject({
      kind: "message",
      role: "assistant",
      content: "Stored without focus.",
    });
    expect(focus).not.toHaveBeenCalled();
    mounted.dispose();
  });

  it("keeps controlled user and assistant rendering non-executable", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const store = createAppSessionStore();
    const mounted = mountPlatformTutorPanel(host, {
      binding: {
        moduleId: "ode",
        promptProfile: "ode",
        suggestedQuestions: [],
        description: "ODE fixture context",
        getContext: source,
      },
      sessionAccess: store.createTutorSessionAccess("ode"),
      onClose: vi.fn(),
      isCurrent: () => true,
      sendMessage: async () => ({ message: "Order is \\(p=1\\)." }),
    });
    await submit(host, "Literal <img onerror=alert(1)>");
    expect(host.querySelector("img")).toBeNull();
    expect(host.textContent).toContain("p=1");
    mounted.dispose();
  });

  it("renders experiment dividers semantically without submitting them", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const store = createAppSessionStore();
    store.updateTutor("ode", (session) =>
      appendNewExperimentDivider(session, {
        id: "experiment-2",
        body: "The starter state is ready.",
      })
    );
    let request: ChatRequest<object> | undefined;
    const mounted = mountPlatformTutorPanel(host, {
      binding: {
        moduleId: "ode",
        promptProfile: "ode",
        suggestedQuestions: [],
        description: "ODE fixture context",
        getContext: source,
      },
      sessionAccess: store.createTutorSessionAccess("ode"),
      onClose: vi.fn(),
      isCurrent: () => true,
      sendMessage: async (next) => {
        request = next;
        return { message: "New answer" };
      },
    });
    expect(host.querySelector(".ai-tutor-divider")?.textContent).toContain(
      "New experiment started"
    );
    await submit(host, "New question");
    expect(request?.messages).toEqual([{ role: "user", content: "New question" }]);
    mounted.dispose();
  });

  it.each([
    [true, 0],
    [false, 2],
  ] as const)(
    "invalidates an old-context response when reset clear=%s",
    async (clearTutorConversation, expectedItems) => {
      const host = document.createElement("div");
      document.body.append(host);
      const store = createAppSessionStore();
      let resolve!: (value: { message: string }) => void;
      const response = new Promise<{ message: string }>((done) => {
        resolve = done;
      });
      const mounted = mountPlatformTutorPanel(host, {
        binding: {
          moduleId: "ode",
          promptProfile: "ode",
          suggestedQuestions: [],
          description: "ODE fixture context",
          getContext: source,
        },
        sessionAccess: store.createTutorSessionAccess("ode"),
        onClose: vi.fn(),
        isCurrent: () => true,
        sendMessage: () => response,
      });
      const input = host.querySelector<HTMLTextAreaElement>("#platform-tutor-input")!;
      input.value = "Question tied to old experiment";
      host.querySelector<HTMLFormElement>(".ai-compose")!.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true })
      );
      expect(store.getTutor("ode").items).toHaveLength(1);

      mounted.cancelPending?.();
      const starter = createBeginnerStarterSession();
      store.resetLabForNewExperiment("ode", starter, {
        labMeaningful: false,
        tutorMeaningful: false,
        meaningful: false,
        resumeSummary: createOdeResumeSummary(starter, 0),
      }, {
        clearTutorConversation,
        at: 800,
      });
      mounted.refresh?.();
      resolve({ message: "Stale answer" });
      await response;
      await Promise.resolve();

      expect(store.getTutor("ode").items).toHaveLength(expectedItems);
      expect(
        store.getTutor("ode").items.some(
          (item) => item.kind === "message" && item.role === "assistant"
        )
      ).toBe(false);
      mounted.dispose();
    }
  );
});
