import { TUTOR_CLOUD_BASES, TUTOR_KIMI_BASES, type TutorConnectionInput, type TutorModelDiscovery, type TutorProvider, type TutorRegion } from "@numerical-t-lab/contracts/tutor";
import type { TutorSessionAccess } from "../app/contracts";
import type { TutorConnection, TutorHistoryReview } from "./tutorConnection";
import { describeTutorConnection, tutorConnectionFailure } from "./tutorConnectionCopy";

export interface TutorConnectionSettingsOptions {
  connection: TutorConnection;
  sessionAccess: TutorSessionAccess;
  isCurrent(): boolean;
  onApplied(): void;
}

/** Inline settings within the existing Tutor frame; no independent modal or persistence. */
export function mountTutorConnectionSettings(target: HTMLElement, options: TutorConnectionSettingsOptions) {
  const { connection } = options;
  let disposed = false, working = false, revision = 0, operation = 0, dirty = true;
  let review: TutorHistoryReview | undefined;
  let catalog: TutorModelDiscovery | undefined;
  let fields: { provider: HTMLSelectElement; region: HTMLSelectElement; base: HTMLInputElement; key: HTMLInputElement; model: HTMLInputElement; group: HTMLFieldSetElement } | undefined;
  const alive = () => !disposed && options.isCurrent();
  target.classList.add("ai-connection-settings");
  target.innerHTML = `<h4>Connection settings</h4>
    <p data-selected></p>
    <p class="ai-connection-notice">Personal connections require this page and the T-Lab backend on the same computer. Keys are held in local backend memory until forgotten or expired; they are not saved in browser storage or on disk.</p>
    <button type="button" class="btn primary" data-enable>Enable personal connections</button>
    <div data-configuration></div>
    <div class="ai-connection-actions">
      <button type="button" class="btn ghost" data-forget>Disconnect and forget</button>
      <button type="button" class="btn ghost" data-default>Use default Tutor</button>
      <button type="button" class="btn ghost" data-cancel hidden>Cancel request</button>
    </div>
    <p role="status" data-progress></p>
    <p role="alert" class="ai-error" data-error hidden></p>
    <section data-review hidden aria-label="Conversation choice"></section>`;
  const find = <T extends HTMLElement>(selector: string) => target.querySelector<T>(selector)!;
  const progress = find<HTMLElement>("[data-progress]"), error = find<HTMLElement>("[data-error]"), reviewArea = find<HTMLElement>("[data-review]");
  const configuration = find<HTMLElement>("[data-configuration]");
  const enable = find<HTMLButtonElement>("[data-enable]"), forget = find<HTMLButtonElement>("[data-forget]"), useDefault = find<HTMLButtonElement>("[data-default]"), cancel = find<HTMLButtonElement>("[data-cancel]");
  function reveal(element: HTMLElement) {
    const frame = target.getBoundingClientRect(), item = element.getBoundingClientRect();
    if (item.top < frame.top + 12 || item.bottom > frame.bottom - 12) target.scrollTop += item.top - frame.top - 12;
  }
  const report = (cause: unknown) => { if (alive()) { error.textContent = tutorConnectionFailure(cause); error.hidden = false; reveal(error); } };
  function invalidateReview() { review = undefined; reviewArea.hidden = true; reviewArea.replaceChildren(); }
  function changed(configurationChange = true) {
    revision++; if (configurationChange) { dirty = true; catalog = undefined; }
    invalidateReview(); error.hidden = true;
    render();
  }
  async function act(label: string, work: (isCurrent: () => boolean) => Promise<unknown>, success: string, applied = false) {
    if (!alive() || working) return;
    const ownRevision = revision;
    const ownOperation = ++operation;
    const isCurrent = () => alive() && revision === ownRevision && operation === ownOperation;
    const focusBefore = document.activeElement instanceof HTMLElement && target.contains(document.activeElement) ? document.activeElement : undefined;
    working = true; error.hidden = true; progress.textContent = label; render(); reveal(progress);
    try {
      await work(isCurrent);
      if (!isCurrent()) return;
      progress.textContent = success;
      if (applied) options.onApplied();
    } catch (cause) { if (alive() && revision === ownRevision && operation === ownOperation) { progress.textContent = ""; report(cause); } }
    finally {
      if (alive() && operation === ownOperation) {
        working = false; render();
        if (focusBefore?.isConnected && !focusBefore.matches(":disabled") && !focusBefore.closest("[hidden], [inert]") && document.activeElement === document.body) focusBefore.focus({ preventScroll: true });
      }
    }
  }
  function showReview(targetKind: "candidate" | "current" | "hosted") {
    if (!alive() || working || (targetKind === "candidate" && (dirty || modelChanged()))) return;
    try {
      review = connection.reviewHistory(options.sessionAccess, targetKind);
      const state = connection.getState();
      const destination = targetKind === "hosted" || review.to.kind === "hosted" ? undefined : targetKind === "candidate" ? state.session?.candidate?.connection : state.session?.active;
      reviewArea.replaceChildren();
      const title = document.createElement("h4"); title.textContent = "Choose this Lab's conversation";
      const note = document.createElement("p"); note.textContent = `Destination: ${describeTutorConnection(destination)}. Start fresh is the default. Transfer includes only this Lab's conversation; new experiment context is attached on your next Send.`;
      reviewArea.append(title, note);
      for (const [choice, label] of [["fresh", "Start fresh"], ["transfer", "Transfer this Lab's conversation"], ["cancel", "Cancel change"]] as const) {
        const button = document.createElement("button"); button.type = "button"; button.className = choice === "fresh" ? "btn primary" : "btn ghost";
        button.textContent = label; button.dataset.historyChoice = choice;
        button.addEventListener("click", () => {
          const captured = review; if (!captured || working) return;
          void act("Applying conversation choice…", async isCurrent => {
            await connection.decideHistory(options.sessionAccess, captured, choice);
            if (isCurrent()) invalidateReview();
          }, choice === "cancel" ? "Connection change cancelled." : "Connection selected.", true);
        });
        reviewArea.append(button);
      }
      reviewArea.hidden = false; reviewArea.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
      render(); reveal(reviewArea);
    } catch (cause) { report(cause); }
  }
  function modelChanged() { return !!fields && fields.model.value !== (connection.getState().session?.candidate?.connection.model ?? ""); }
  function buildForm() {
    const id = `tutor-connection-${crypto.randomUUID()}`;
    configuration.innerHTML = `<form autocomplete="off">
      <fieldset><legend>Personal connection</legend>
        <label for="${id}-provider">Provider</label><select id="${id}-provider" data-provider></select>
        <div data-region-group hidden><label for="${id}-region">Kimi region</label><select id="${id}-region" data-region><option value="">Choose a region</option><option value="international">International — api.moonshot.ai</option><option value="mainland">Mainland China — api.moonshot.cn</option></select></div>
        <div data-base-group><label for="${id}-base">Local server URL</label><input id="${id}-base" data-base type="text" value="http://127.0.0.1:8080" autocomplete="off" spellcheck="false"></div>
        <label for="${id}-key">API key <span data-key-optional>(optional for a local server)</span></label><input id="${id}-key" data-key type="password" autocomplete="off" spellcheck="false" autocapitalize="off" maxlength="4096">
        <label for="${id}-model">Exact model ID</label><input id="${id}-model" data-model type="text" autocomplete="off" spellcheck="false" maxlength="1024">
      </fieldset>
      <p data-destination></p>
      <p class="ai-connection-notice" data-network></p>
      <div class="ai-connection-actions"><button class="btn primary" type="submit" data-save>Save locally</button><button class="btn ghost" type="button" data-select-model>Select model locally</button></div>
    </form>
    <div class="ai-connection-actions"><button type="button" class="btn ghost" data-discover>Discover models</button><button type="button" class="btn ghost" data-test>Test connection</button><button type="button" class="btn primary" data-use>Use this connection</button></div>
    <p data-verification></p><div data-models></div>
    <p class="ai-connection-notice">Testing checks connection and response compatibility, not mathematical accuracy. Models requiring preserved reasoning history are unavailable in this final-answer-only Tutor. No model is loaded, unloaded or downloaded by T-Lab.</p>`;
    fields = { provider: find("[data-provider]"), region: find("[data-region]"), base: find("[data-base]"), key: find("[data-key]"), model: find("[data-model]"), group: find("fieldset") };
    const names = { local: "Local OpenAI-compatible server", openai: "OpenAI", anthropic: "Anthropic", gemini: "Gemini", deepseek: "DeepSeek", kimi: "Kimi / Moonshot" };
    for (const provider of connection.getState().capabilities?.providers ?? []) {
      const option = document.createElement("option"); option.value = provider; option.textContent = names[provider]; fields.provider.append(option);
    }
    const candidate = connection.getState().session?.candidate;
    if (candidate) {
      fields.provider.value = candidate.connection.provider; fields.region.value = candidate.connection.region ?? "";
      if (candidate.connection.provider === "local") fields.base.value = candidate.connection.baseUrl;
      fields.model.value = candidate.connection.model ?? ""; dirty = false;
    }
    for (const input of [fields.provider, fields.region, fields.base]) input.addEventListener("input", () => {
      fields!.key.value = ""; fields!.model.value = ""; changed();
    });
    fields.key.addEventListener("input", () => changed());
    fields.model.addEventListener("input", () => changed(false));
    find<HTMLFormElement>("form").addEventListener("submit", event => {
      event.preventDefault();
      if (working || connection.getState().pending || !fields || connection.getState().status !== "available") return;
      if (!find<HTMLFormElement>("form").reportValidity()) return;
      void act("Saving to the local backend…", isCurrent => {
        const f = fields!, provider = f.provider.value as TutorProvider;
        const input: TutorConnectionInput = provider === "local" ? { provider, baseUrl: f.base.value, apiKey: f.key.value, ...(f.model.value ? { model: f.model.value } : {}) }
          : provider === "kimi" ? { provider, region: f.region.value as TutorRegion, apiKey: f.key.value, ...(f.model.value ? { model: f.model.value } : {}) }
          : { provider, apiKey: f.key.value, ...(f.model.value ? { model: f.model.value } : {}) };
        f.key.value = ""; // Clear synchronously, including rejected/failed requests.
        return connection.stage(input).then(() => { if (isCurrent()) { dirty = false; catalog = undefined; invalidateReview(); } });
      }, "Saved in the local session. Choose and test a model before using it.");
    });
    find<HTMLButtonElement>("[data-select-model]").addEventListener("click", () => {
      if (dirty || !fields?.model.value || working) return;
      invalidateReview(); void act("Selecting model in the local session…", () => connection.selectModel(fields!.model.value), "Model selected. Test it before use.");
    });
    find<HTMLButtonElement>("[data-discover]").addEventListener("click", () => {
      if (dirty || working) return;
      void act("Requesting model metadata from the selected destination…", async isCurrent => { const result = await connection.discover(); if (isCurrent()) catalog = result; }, "Discovery finished. Availability is reported by the server.");
    });
    find<HTMLButtonElement>("[data-test]").addEventListener("click", () => {
      if (dirty || modelChanged() || working) return;
      invalidateReview(); void act("Sending a synthetic test to the selected destination…", () => connection.test(), "Connection tested. Review your conversation choice to use it.");
    });
    find<HTMLButtonElement>("[data-use]").addEventListener("click", () => showReview("candidate"));
  }
  function render() {
    if (!alive()) return;
    const state = connection.getState(), busy = working || !!state.pending, eligible = state.status === "available" && !!state.session;
    find<HTMLElement>("[data-selected]").textContent = state.selected.kind === "hosted" ? "Selected: Default Tutor service (managed by this T-Lab installation)."
      : `Selected: ${state.session?.active ? describeTutorConnection(state.session.active) : "Personal connection unavailable"}`;
    enable.hidden = eligible; enable.disabled = busy || state.status === "disposed";
    forget.hidden = !eligible; forget.disabled = busy;
    useDefault.hidden = state.selected.kind === "hosted"; useDefault.disabled = busy;
    cancel.hidden = !busy; cancel.disabled = !state.pending;
    configuration.hidden = !eligible;
    if (!eligible) { if (fields) { fields.key.value = ""; configuration.replaceChildren(); fields = undefined; dirty = true; catalog = undefined; } if (review?.to.kind === "personal") invalidateReview(); return; }
    if (!fields) buildForm();
    const f = fields!, selectedProvider = f.provider.value as TutorProvider;
    f.group.disabled = busy;
    find<HTMLElement>("[data-region-group]").hidden = selectedProvider !== "kimi";
    f.region.required = selectedProvider === "kimi";
    find<HTMLElement>("[data-base-group]").hidden = selectedProvider !== "local";
    f.base.required = selectedProvider === "local";
    f.key.required = selectedProvider !== "local";
    find<HTMLElement>("[data-key-optional]").hidden = selectedProvider !== "local";
    const destination = selectedProvider === "local" ? f.base.value : selectedProvider === "kimi" ? TUTOR_KIMI_BASES[f.region.value as TutorRegion] ?? "Choose an explicit region" : TUTOR_CLOUD_BASES[selectedProvider];
    find<HTMLElement>("[data-destination]").textContent = `Destination: ${destination}`;
    find<HTMLElement>("[data-network]").textContent = selectedProvider === "local"
      ? "T-Lab connects only to this loopback server in local mode. Use an already loaded model. A separately managed proxy may forward requests. Discover sends metadata; Test sends a synthetic prompt. Neither sends your conversation or experiment."
      : "Save locally sends the key only to your local backend. Discover sends credentials and metadata to the destination above; Test also sends a synthetic prompt and may incur provider charges. Tutor Send shares this Lab's authorized conversation and current experiment context with that provider.";
    const candidate = state.session!.candidate;
    const changedModel = modelChanged();
    find<HTMLButtonElement>("[data-save]").disabled = busy;
    find<HTMLButtonElement>("[data-select-model]").disabled = busy || dirty || !candidate || !f.model.value || !changedModel;
    find<HTMLButtonElement>("[data-discover]").disabled = busy || dirty || !candidate;
    find<HTMLButtonElement>("[data-test]").disabled = busy || dirty || !candidate?.connection.model || changedModel;
    find<HTMLButtonElement>("[data-use]").disabled = busy || dirty || changedModel || !candidate?.tested;
    find<HTMLElement>("[data-verification]").textContent = dirty ? "Save this configuration locally first." : changedModel ? "Select the edited model locally, then test again." : candidate?.tested ? "Connection tested. Mathematical accuracy is not verified." : "Connection has not been tested.";
    const models = find<HTMLElement>("[data-models]"); models.replaceChildren();
    if (catalog) {
      const note = document.createElement("p"); note.textContent = catalog.hasMore ? "Partial model list. You can enter an exact model ID." : "Server-reported models. A listing does not verify readiness."; models.append(note);
      for (const model of catalog.models) {
        const button = document.createElement("button"); button.type = "button"; button.className = "btn ghost ai-model-choice";
        button.textContent = `${model.id} — ${model.availability}`;
        button.disabled = busy || !["listed", "loaded"].includes(model.availability);
        button.addEventListener("click", () => { if (!alive() || working) return; f.model.value = model.id; changed(false); f.model.focus({ preventScroll: true }); });
        models.append(button);
      }
    }
    for (const button of reviewArea.querySelectorAll<HTMLButtonElement>("button")) button.disabled = busy;
  }
  enable.addEventListener("click", () => { void act("Checking this computer's local backend…", () => connection.initialize(), "Local session verified. Personal configuration is available."); });
  forget.addEventListener("click", () => { invalidateReview(); void act("Forgetting the personal connection…", () => connection.disconnect(), "Credentials forgotten. Conversation kept on this computer.", true); });
  useDefault.addEventListener("click", () => showReview("hosted"));
  cancel.addEventListener("click", () => {
    revision++; operation++; connection.cancel(); if (fields) fields.key.value = "";
    working = false; progress.textContent = "Request cancelled."; render();
    const next = fields?.provider ?? enable;
    if (alive() && next.isConnected && !next.disabled) { next.focus({ preventScroll: true }); reveal(next); }
  });
  const unsubscribe = connection.subscribe(render);
  render();
  return {
    reviewHistory: () => showReview("current"),
    refresh: render,
    dispose() { if (disposed) return; disposed = true; revision++; if (fields) fields.key.value = ""; unsubscribe(); connection.cancel(); target.replaceChildren(); },
  };
}
