import type {
  LabTutorBinding,
  LabTutorContext,
  TutorPromptProfile,
  TutorSessionAccess,
  TutorTranscriptItem,
} from "../app/contracts";
import type { ChatRequest, ChatResponse } from "@numerical-t-lab/contracts/tutor";
import { isChartInstruction, sanitizeTutorText } from "./tutorPresentation";
import { renderTutorMessageContent } from "../math/ui/tutorMath";
import {
  appendTutorMessage,
  clearTutorConversation,
  messagesForTutorRequest,
  updateTutorDraft,
} from "./moduleTutorSession";
import {
  PUBLIC_TUTOR_UNAVAILABLE_MESSAGE,
  sendTutorMessage,
} from "./tutorClient";
import "./tutor.css";

export interface PlatformTutorPanelOptions {
  readonly binding: LabTutorBinding;
  readonly sessionAccess: TutorSessionAccess;
  readonly onClose: () => void;
  readonly isCurrent: () => boolean;
  readonly isPresentationVisible?: () => boolean;
  readonly sendMessage?: (
    request: ChatRequest<object>,
    signal: AbortSignal,
    profile: TutorPromptProfile
  ) => Promise<ChatResponse>;
}

export interface MountedPlatformTutorPanel {
  dispose(): void;
  focus(): void;
  refresh?(): void;
  cancelPending?(): void;
}

function renderTranscript(
  container: HTMLElement,
  items: readonly TutorTranscriptItem[]
): void {
  container.replaceChildren();
  if (items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "ai-tutor-empty";
    empty.textContent = "Ask a question about this result.";
    container.append(empty);
    return;
  }
  for (const transcriptItem of items) {
    if (transcriptItem.kind === "divider") {
      const divider = document.createElement("section");
      divider.className = "ai-tutor-divider";
      divider.setAttribute("aria-label", transcriptItem.title);
      const title = document.createElement("strong");
      title.textContent = transcriptItem.title;
      const body = document.createElement("p");
      body.textContent = transcriptItem.body;
      divider.append(title, body);
      container.append(divider);
      continue;
    }
    const item = document.createElement("div");
    item.className = `ai-msg ${transcriptItem.role === "user" ? "ai-msg-user" : "ai-msg-assistant"}`;
    const role = document.createElement("span");
    role.className = "ai-msg-role";
    role.textContent = transcriptItem.role === "user" ? "You" : "Tutor";
    const body = document.createElement("div");
    body.className = "ai-msg-body";
    item.append(role, body);
    container.append(item);
    renderTutorMessageContent(body, {
      role: transcriptItem.role,
      content:
        transcriptItem.role === "assistant"
          ? sanitizeTutorText(transcriptItem.content)
          : transcriptItem.content,
    });
  }
  container.scrollTop = container.scrollHeight;
}

export function mountPlatformTutorPanel(
  target: HTMLElement,
  options: PlatformTutorPanelOptions
): MountedPlatformTutorPanel {
  let disposed = false;
  let requestGeneration = 0;
  let requestController: AbortController | undefined;
  let refresh = (): void => undefined;
  let cancelPending = (): void => undefined;
  const bindingIdentity = options.binding;
  const moduleId = options.sessionAccess.moduleId;
  const readContext = (): LabTutorContext => {
    if (options.binding.moduleId !== moduleId || options.binding.promptProfile !== moduleId) {
      return { status: "unavailable", revision: -1, message: "This Tutor is unavailable for the current Lab." };
    }
    return options.binding.getContext();
  };

  target.innerHTML = `
    <aside class="ai-tutor-panel" aria-label="AI Method Tutor">
      <header class="ai-tutor-header">
        <div class="ai-tutor-title-row">
          <h3>AI Method Tutor</h3>
          <span class="ai-demo-badge" data-tutor-demo hidden>Demo mode</span>
          <button type="button" class="btn ghost ai-tutor-close" data-tutor-close aria-label="Close AI Tutor">Close</button>
        </div>
        <p class="ai-tutor-sub"></p>
      </header>
      <div class="ai-tutor-content" data-tutor-content></div>
    </aside>`;

  const content = target.querySelector<HTMLElement>("[data-tutor-content]")!;
  target.querySelector<HTMLElement>(".ai-tutor-sub")!.textContent = options.binding.description;
  {
    const unavailable = document.createElement("p");
    unavailable.className = "ai-tutor-disabled";
    unavailable.setAttribute("role", "status");
    content.append(unavailable);
    const suggestionDisclosure = document.createElement("details");
    suggestionDisclosure.className = "ai-suggestion-disclosure";
    const suggestionSummary = document.createElement("summary");
    suggestionSummary.textContent = "Suggested questions";
    const suggestions = document.createElement("div");
    suggestions.className = "ai-suggestions";
    suggestions.setAttribute("role", "group");
    suggestions.setAttribute("aria-label", "Suggested questions");
    options.binding.suggestedQuestions.forEach((question) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "ai-suggest-btn";
      button.textContent = question;
      button.dataset.tutorSuggestion = question;
      suggestions.append(button);
    });
    suggestionDisclosure.append(suggestionSummary, suggestions);
    const messages = document.createElement("div");
    messages.className = "ai-messages";
    messages.setAttribute("role", "log");
    messages.setAttribute("aria-label", "Tutor conversation");
    messages.setAttribute("aria-live", "polite");
    const error = document.createElement("p");
    error.className = "ai-error";
    error.hidden = true;
    error.setAttribute("role", "alert");
    const form = document.createElement("form");
    form.className = "ai-compose";
    const label = document.createElement("label");
    label.className = "sr-only";
    label.htmlFor = "platform-tutor-input";
    label.textContent = "Message";
    const input = document.createElement("textarea");
    input.id = "platform-tutor-input";
    input.rows = 2;
    input.required = true;
    input.placeholder = "Ask about this result…";
    input.value = options.sessionAccess.getSession().draftMessage;
    const actions = document.createElement("div");
    actions.className = "ai-compose-actions";
    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "btn ghost ai-clear";
    clear.textContent = "Clear chat";
    const send = document.createElement("button");
    send.type = "submit";
    send.className = "btn primary ai-send";
    send.textContent = "Send";
    actions.append(clear, send);
    form.append(label, input, actions);
    content.append(suggestionDisclosure, messages, error, form);
    let loading = false;
    let pendingContextRevision: number | undefined;
    const syncAvailability = (): void => {
      const context = readContext();
      const ready = context.status === "ready";
      unavailable.hidden = ready;
      unavailable.textContent = context.status === "unavailable" ? context.message : "";
      suggestionDisclosure.hidden = !ready;
      send.disabled = input.disabled = loading || !ready;
      for (const button of suggestions.querySelectorAll<HTMLButtonElement>("button")) button.disabled = loading || !ready;
    };

    let suggestionsCollapsedForConversation = false;
    const syncSuggestions = (): void => {
      const hasUserMessage = options.sessionAccess
        .getSession()
        .items.some((item) => item.kind === "message" && item.role === "user");
      suggestionSummary.hidden = !hasUserMessage;
      suggestionDisclosure.classList.toggle("is-collapsed", hasUserMessage);
      if (!hasUserMessage) {
        suggestionsCollapsedForConversation = false;
        suggestionDisclosure.open = true;
      } else if (!suggestionsCollapsedForConversation) {
        suggestionsCollapsedForConversation = true;
        suggestionDisclosure.open = false;
      }
    };

    const resizeComposer = (): void => {
      input.style.height = "auto";
      const nextHeight = Math.min(Math.max(input.scrollHeight, 56), 144);
      input.style.height = `${nextHeight}px`;
    };

    const render = (): void => {
      if (disposed || !options.isCurrent()) return;
      const context = readContext();
      if (pendingContextRevision !== undefined && (context.status !== "ready" || context.revision !== pendingContextRevision)) cancelPending();
      syncAvailability();
      renderTranscript(messages, options.sessionAccess.getSession().items);
      syncSuggestions();
      if (document.activeElement !== input) {
        input.value = options.sessionAccess.getSession().draftMessage;
        resizeComposer();
      }
    };
    refresh = render;
    const setLoading = (next: boolean): void => {
      if (disposed) return;
      loading = next;
      syncAvailability();
      send.textContent = loading ? "Thinking…" : "Send";
      target.classList.toggle("ai-loading", loading);
    };
    cancelPending = (): void => {
      requestGeneration += 1;
      requestController?.abort();
      requestController = undefined;
      pendingContextRevision = undefined;
      error.hidden = true;
      setLoading(false);
    };
    const submit = async (text: string): Promise<void> => {
      const trimmed = text.trim();
      if (!trimmed || disposed || !options.isCurrent()) return;
      const context = readContext();
      if (context.status !== "ready") { render(); return; }
      error.hidden = true;
      let conversationRevision = options.sessionAccess.getSession().revision + 1;
      options.sessionAccess.updateSession((current) =>
        updateTutorDraft(appendTutorMessage(current, "user", trimmed), "")
      );
      input.value = "";
      resizeComposer();
      render();
      requestController?.abort();
      const controller = new AbortController();
      requestController = controller;
      const request = ++requestGeneration;
      pendingContextRevision = context.revision;
      const currentContext = (): boolean => {
        const latest = readContext();
        return latest.status === "ready" && latest.revision === context.revision;
      };
      const currentRequest = (): boolean => !disposed && !controller.signal.aborted && request === requestGeneration &&
        options.isCurrent() && bindingIdentity === options.binding && moduleId === options.sessionAccess.moduleId &&
        currentContext() && options.sessionAccess.getSession().revision === conversationRevision;
      let restoreFocus = false;
      setLoading(true);
      try {
        if (!currentRequest()) return;
        const response = await (options.sendMessage ?? sendTutorMessage)(
          { messages: messagesForTutorRequest(options.sessionAccess.getSession()), context: context.context },
          controller.signal,
          options.binding.promptProfile
        );
        if (!currentRequest()) return;
        restoreFocus = true;
        conversationRevision += 1;
        options.sessionAccess.updateSession((current) =>
          appendTutorMessage(current, "assistant", sanitizeTutorText(response.message))
        );
        if (!currentRequest()) return;
        target.querySelector<HTMLElement>("[data-tutor-demo]")!.hidden = !response.demoMode;
        render();
        if (currentRequest() && response.chartInstruction && isChartInstruction(response.chartInstruction)) {
          options.binding.applyChartInstruction?.(response.chartInstruction);
        }
      } catch {
        if (!currentRequest()) return;
        restoreFocus = true;
        error.textContent = PUBLIC_TUTOR_UNAVAILABLE_MESSAGE;
        error.hidden = false;
      } finally {
        if (!disposed && request === requestGeneration && options.isCurrent()) {
          requestController = undefined;
          pendingContextRevision = undefined;
          setLoading(false);
          render();
          if (restoreFocus && currentRequest() && input.isConnected && options.isPresentationVisible?.() !== false) input.focus({ preventScroll: true });
        }
      }
    };

    input.addEventListener("input", () => {
      options.sessionAccess.updateSession((current) => updateTutorDraft(current, input.value));
      resizeComposer();
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void submit(input.value);
    });
    clear.addEventListener("click", () => {
      cancelPending();
      options.sessionAccess.updateSession(clearTutorConversation);
      error.hidden = true;
      render();
      if (!input.disabled) input.focus({ preventScroll: true });
    });
    suggestions.addEventListener("click", (event) => {
      const button = (event.target as Element).closest<HTMLButtonElement>("[data-tutor-suggestion]");
      if (button) void submit(button.dataset.tutorSuggestion ?? "");
    });
    resizeComposer();
    render();
  }

  target.querySelector<HTMLButtonElement>("[data-tutor-close]")!.addEventListener(
    "click",
    options.onClose
  );

  return Object.freeze({
    dispose(): void {
      if (disposed) return;
      disposed = true;
      requestGeneration += 1;
      requestController?.abort();
      requestController = undefined;
      target.replaceChildren();
    },
    focus(): void {
      target.querySelector<HTMLElement>("textarea, button")?.focus();
    },
    refresh(): void {
      refresh();
    },
    cancelPending(): void {
      cancelPending();
    },
  });
}

export type TutorPanelModule = Pick<
  typeof import("./platformTutorPanel"),
  "mountPlatformTutorPanel"
>;
