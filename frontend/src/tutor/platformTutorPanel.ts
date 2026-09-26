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
  sameTutorConnection,
  updateTutorDraft,
} from "./moduleTutorSession";
import {
  PUBLIC_TUTOR_UNAVAILABLE_MESSAGE,
  sendTutorMessage,
} from "./tutorClient";
import type { TutorConnection } from "./tutorConnection";
import { mountTutorConnectionSettings } from "./tutorConnectionSettings";
import { describeTutorConnection, tutorConnectionFailure } from "./tutorConnectionCopy";
import { TutorClientError } from "./tutorConnectionProtocol";
export { createTutorConnection } from "./tutorConnection";
import "./tutor.css";

export interface PlatformTutorPanelOptions {
  readonly binding: LabTutorBinding;
  readonly sessionAccess: TutorSessionAccess;
  readonly onClose: () => void;
  readonly isCurrent: () => boolean;
  readonly isPresentationVisible?: () => boolean;
  readonly connection?: TutorConnection;
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
  let settings: ReturnType<typeof mountTutorConnectionSettings> | undefined;
  let settingsOpen = false;
  let unsubscribeConnection: (() => void) | undefined;
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
        <div data-connection-controls hidden><p class="ai-connection-summary" data-connection-summary></p><button type="button" class="btn ghost" data-connection-settings>Connection settings</button><button type="button" class="btn ghost" data-history-review hidden>Review conversation</button></div>
      </header>
      <div class="ai-tutor-content" data-tutor-content></div>
    </aside>`;

  const content = target.querySelector<HTMLElement>("[data-tutor-content]")!;
  const settingsTarget = document.createElement("div"); settingsTarget.hidden = true;
  target.querySelector(".ai-tutor-panel")!.append(settingsTarget);
  const settingsButton = target.querySelector<HTMLButtonElement>("[data-connection-settings]")!;
  const historyButton = target.querySelector<HTMLButtonElement>("[data-history-review]")!;
  const setSettings = (open: boolean, review = false) => {
    if (disposed || !options.isCurrent() || !options.connection) return;
    cancelPending();
    settingsOpen = open; content.hidden = open; settingsTarget.hidden = !open;
    settingsButton.textContent = open ? "Back to chat" : "Connection settings";
    if (open) {
      settings ??= mountTutorConnectionSettings(settingsTarget, { connection: options.connection, sessionAccess: options.sessionAccess,
        isCurrent: () => !disposed && options.isCurrent(), onApplied: () => { setSettings(false); refresh(); } });
      if (review) settings.reviewHistory();
      else settingsTarget.querySelector<HTMLElement>('button:not([hidden]):not([disabled]), select:not([disabled])')?.focus({ preventScroll: true });
    } else { settings?.dispose(); settings = undefined; settingsButton.focus({ preventScroll: true }); }
    refresh();
  };
  settingsButton.addEventListener("click", () => setSettings(!settingsOpen));
  historyButton.addEventListener("click", () => setSettings(true, true));
  if (options.connection) target.querySelector<HTMLElement>("[data-connection-controls]")!.hidden = false;
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
    const cancel = document.createElement("button"); cancel.type = "button"; cancel.className = "btn ghost ai-cancel"; cancel.textContent = "Cancel request"; cancel.hidden = true;
    const progress = document.createElement("p"); progress.className = "ai-request-progress"; progress.setAttribute("role", "status"); progress.hidden = true;
    actions.append(clear, cancel, send);
    form.append(label, input, actions);
    content.append(suggestionDisclosure, messages, error, progress, form);
    let loading = false;
    let pendingContextRevision: number | undefined;
    const syncAvailability = (): void => {
      const context = readContext();
      const ready = context.status === "ready";
      const connectionState = options.connection?.getState();
      const historyAllowed = !options.connection || options.connection.canSendHistory(options.sessionAccess);
      const connectionReady = !connectionState || connectionState.selected.kind === "hosted" || connectionState.status === "available" && !!connectionState.session?.active;
      unavailable.hidden = ready;
      unavailable.textContent = context.status === "unavailable" ? context.message : "";
      suggestionDisclosure.hidden = !ready;
      send.disabled = input.disabled = loading || !ready || !connectionReady || !historyAllowed || !!connectionState?.pending && connectionState.pending !== "chat";
      for (const button of suggestions.querySelectorAll<HTMLButtonElement>("button")) button.disabled = send.disabled;
      if (connectionState) {
        target.querySelector<HTMLElement>("[data-connection-summary]")!.textContent = connectionState.selected.kind === "hosted" ? "Default Tutor service" : connectionState.status !== "available" ? "Personal connection expired or unavailable. Reconnect in settings."
          : connectionState.session?.active ? describeTutorConnection(connectionState.session.active) : "No personal connection selected.";
        historyButton.hidden = historyAllowed || !connectionReady || settingsOpen;
      }
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
      cancel.hidden = !loading;
      progress.hidden = !loading; progress.textContent = loading ? "Waiting for a complete response…" : "";
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
      if (!trimmed || disposed || loading || settingsOpen || !options.isCurrent()) return;
      const context = readContext();
      if (context.status !== "ready") { render(); return; }
      error.hidden = true;
      try { options.connection?.prepareConversation(options.sessionAccess); }
      catch (cause) { error.textContent = tutorConnectionFailure(cause); error.hidden = true; setSettings(true, cause instanceof TutorClientError && cause.code === "history_required"); return; }
      const destination = options.connection?.getState().selected;
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
        currentContext() && options.sessionAccess.getSession().revision === conversationRevision &&
        (!options.connection || sameTutorConnection(destination, options.connection.getState().selected));
      let restoreFocus = false;
      setLoading(true);
      try {
        if (!currentRequest()) return;
        const response = destination?.kind === "personal" && options.connection
          ? await options.connection.send(options.binding, options.sessionAccess, controller.signal, () => !disposed && options.isCurrent())
          : await (options.sendMessage ?? sendTutorMessage)(
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
      } catch (cause) {
        if (!currentRequest()) return;
        if (cause instanceof TutorClientError && cause.code === "request_cancelled") return;
        restoreFocus = true;
        error.textContent = destination?.kind === "personal" ? tutorConnectionFailure(cause) : PUBLIC_TUTOR_UNAVAILABLE_MESSAGE;
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
    cancel.addEventListener("click", () => {
      cancelPending(); progress.hidden = false; progress.textContent = "Request cancelled.";
      if (!disposed && options.isCurrent() && !input.disabled && input.isConnected && options.isPresentationVisible?.() !== false) input.focus({ preventScroll: true });
    });
    suggestions.addEventListener("click", (event) => {
      const button = (event.target as Element).closest<HTMLButtonElement>("[data-tutor-suggestion]");
      if (button) void submit(button.dataset.tutorSuggestion ?? "");
    });
    resizeComposer();
    if (options.connection) {
      let lastSelection = options.connection.getState().selected;
      unsubscribeConnection = options.connection.subscribe(() => {
        const selected = options.connection!.getState().selected;
        if (!sameTutorConnection(lastSelection, selected)) { lastSelection = selected; cancelPending(); }
        render();
      });
    }
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
      unsubscribeConnection?.(); settings?.dispose(); settings = undefined;
      target.replaceChildren();
    },
    focus(): void {
      target.querySelector<HTMLElement>("textarea, button")?.focus();
    },
    refresh(): void {
      refresh();
      settings?.refresh();
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
