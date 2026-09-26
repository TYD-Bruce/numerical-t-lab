// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { TUTOR_CLOUD_BASES, TUTOR_KIMI_BASES, type LocalTutorSessionSnapshot, type TutorConnectionInput } from "@numerical-t-lab/contracts/tutor";
import { createAppSessionStore } from "../app/appSessionStore";
import type { LabTutorBinding } from "../app/contracts";
import { appendTutorMessage, clearTutorConversation } from "./moduleTutorSession";
import { createTutorConnection } from "./tutorConnection";
import { mountTutorConnectionSettings } from "./tutorConnectionSettings";
import { mountPlatformTutorPanel } from "./platformTutorPanel";

const disposables: Array<{ dispose(): void }> = [];
afterEach(() => { for (const item of disposables.splice(0).reverse()) item.dispose(); document.body.replaceChildren(); vi.restoreAllMocks(); });
function fixture(pageOrigin = "http://127.0.0.1:5173") {
  let session: LocalTutorSessionSnapshot = { sessionId: "a".repeat(32), generation: 0, idleExpiresAt: Date.now() + 1_800_000, absoluteExpiresAt: Date.now() + 28_800_000, idleTimeoutMs: 1_800_000 };
  let id = 0;
  const flags = { enabled: true, failTest: false, holdChat: false, holdStage: false };
  const fetcher = vi.fn<typeof fetch>(async (path, init) => {
    const body = JSON.parse(String(init?.body));
    const operation = String(path).split("/").at(-1);
    if (operation === "session") return Response.json(flags.enabled ? { session, proof: "b".repeat(64), capabilities: { protocol: 1, providerOperations: true, providers: ["local", "openai", "anthropic", "gemini", "deepseek", "kimi"], chatProfiles: ["ode"] } } : {}, { status: flags.enabled ? 201 : 404 });
    expect(new Headers(init?.headers).get("x-t-lab-proof")).toBe("b".repeat(64));
    if (operation === "stage") {
      if (flags.holdStage) return new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("synthetic")), { once: true }));
      const input = body.connection as TutorConnectionInput;
      const baseUrl = input.provider === "local" ? input.baseUrl : input.provider === "kimi" ? TUTOR_KIMI_BASES[input.region] : TUTOR_CLOUD_BASES[input.provider];
      session = { ...session, candidate: { id: (++id).toString(16).padStart(32, "0"), tested: false, connection: { provider: input.provider, baseUrl, model: input.model, hasCredential: !!input.apiKey, ...(input.provider === "kimi" ? { region: input.region } : {}) } } };
    }
    if (operation === "model") session = { ...session, candidate: { id: (++id).toString(16).padStart(32, "0"), tested: false, connection: { ...session.candidate!.connection, model: body.model } } };
    if (operation === "discover") return Response.json({ models: [{ id: "model-b", availability: "loaded" }, { id: "unavailable", availability: "unloaded" }], hasMore: true });
    if (operation === "test") {
      if (flags.failTest) return Response.json({ code: "provider_auth", error: "PRIVATE fixture body" }, { status: 401 });
      session = { ...session, candidate: { ...session.candidate!, tested: true } }; return Response.json({ session });
    }
    if (operation === "activate") session = { ...session, generation: session.generation + 1, active: session.candidate!.connection, candidate: undefined };
    if (operation === "discard") session = { ...session, candidate: undefined };
    if (operation === "disconnect") session = { ...session, generation: session.generation + 1, candidate: undefined, active: undefined };
    if (operation === "chat") {
      if (flags.holdChat) return new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("synthetic")), { once: true }));
      return Response.json({ profile: body.profile, generation: body.generation, requestId: body.requestId, response: { message: "Personal fixture answer" } });
    }
    return Response.json(operation === "cancel" ? { cancelled: true } : operation === "close" ? { closed: true } : session);
  });
  const client = createTutorConnection({ fetch: fetcher, origin: () => pageOrigin }); disposables.push(client);
  const store = createAppSessionStore(), access = store.createTutorSessionAccess("ode"), target = document.createElement("div"); document.body.append(target);
  const applied = vi.fn();
  return { client, store, access, target, flags, fetcher, applied,
    settings() { const view = mountTutorConnectionSettings(target, { connection: client, sessionAccess: access, isCurrent: () => true, onApplied: applied }); disposables.push(view); return view; },
    panel(ready = true) { const binding: LabTutorBinding = { moduleId: "ode", promptProfile: "ode", suggestedQuestions: [], description: "Fixture", getContext: () => ready ? ({ status: "ready", revision: 1, context: { evidence: "fixture" } }) : ({ status: "unavailable", revision: 1, message: "Run a valid experiment first." }) };
      const hosted = vi.fn(async () => ({ message: "Hosted fixture answer" }));
      const view = mountPlatformTutorPanel(target, { binding, sessionAccess: access, connection: client, sendMessage: hosted, isCurrent: () => true, onClose: vi.fn() }); disposables.push(view); return { view, hosted }; },
  };
}
const get = <T extends HTMLElement>(target: HTMLElement, selector: string) => target.querySelector<T>(selector)!;
function edit(target: HTMLElement, selector: string, value: string) { const element = get<HTMLInputElement>(target, selector); element.value = value; element.dispatchEvent(new Event("input", { bubbles: true })); }
async function enable(f: ReturnType<typeof fixture>) { get<HTMLButtonElement>(f.target, "[data-enable]").click(); await vi.waitFor(() => expect(f.target.querySelector("[data-key]")).not.toBeNull()); }
async function save(f: ReturnType<typeof fixture>, provider = "local") {
  edit(f.target, "[data-provider]", provider);
  if (provider !== "local") edit(f.target, "[data-key]", "SYNTHETIC-KEY");
  edit(f.target, "[data-model]", "model-a");
  get<HTMLFormElement>(f.target, "[data-configuration] form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  expect(get<HTMLInputElement>(f.target, "[data-key]").value).toBe("");
  await vi.waitFor(() => expect(get<HTMLButtonElement>(f.target, "[data-test]").disabled).toBe(false));
}
async function tested(f: ReturnType<typeof fixture>) { get<HTMLButtonElement>(f.target, "[data-test]").click(); await vi.waitFor(() => expect(get<HTMLButtonElement>(f.target, "[data-use]").disabled).toBe(false)); }
async function activate(f: ReturnType<typeof fixture>, choice = "fresh") { get<HTMLButtonElement>(f.target, "[data-use]").click(); get<HTMLButtonElement>(f.target, `[data-history-choice="${choice}"]`).click(); await vi.waitFor(() => expect(f.client.getState().selected.kind).toBe("personal")); }

describe("local connection settings", () => {
  it.each(["https://demo.example", "http://192.168.1.2:5173"])("never creates key entry or requests from %s", async origin => {
    const f = fixture(origin); f.settings();
    expect(f.target.querySelector("[data-key]")).toBeNull();
    get<HTMLButtonElement>(f.target, "[data-enable]").click();
    await vi.waitFor(() => expect(f.target.textContent).toContain("No key can be entered here"));
    expect(f.fetcher).not.toHaveBeenCalled(); expect(f.target.querySelector("[data-key]")).toBeNull();
  });
  it("requires a compatible local capability response before key entry", async () => {
    const f = fixture(); f.flags.enabled = false; f.settings();
    get<HTMLButtonElement>(f.target, "[data-enable]").click();
    await vi.waitFor(() => expect(get<HTMLElement>(f.target, "[data-error]").hidden).toBe(false));
    expect(f.target.querySelector("[data-key]")).toBeNull();
  });
  it.each(["openai", "anthropic", "gemini", "deepseek"])("saves %s only after a click and clears the transient key", async provider => {
    const f = fixture(); f.settings(); await enable(f);
    const before = f.fetcher.mock.calls.length;
    edit(f.target, "[data-provider]", provider); edit(f.target, "[data-key]", "SYNTHETIC-KEY");
    expect(f.fetcher).toHaveBeenCalledTimes(before);
    await save(f, provider);
    expect(JSON.stringify(f.client.getState())).not.toContain("SYNTHETIC-KEY");
    expect(JSON.stringify(f.store.getTutor("ode"))).not.toContain("SYNTHETIC-KEY");
    expect(f.fetcher.mock.calls.every(([url]) => String(url).startsWith("/api/personal/"))).toBe(true);
  });
  it("requires an explicit Kimi region and never carries a typed key across region changes", async () => {
    const f = fixture(); f.settings(); await enable(f);
    edit(f.target, "[data-provider]", "kimi");
    expect(get<HTMLSelectElement>(f.target, "[data-region]").value).toBe("");
    edit(f.target, "[data-region]", "mainland"); edit(f.target, "[data-key]", "SYNTHETIC-KEY");
    expect(f.target.textContent).toContain("https://api.moonshot.cn/v1");
    edit(f.target, "[data-region]", "international");
    expect(get<HTMLInputElement>(f.target, "[data-key]").value).toBe("");
    expect(f.target.textContent).toContain("https://api.moonshot.ai/v1");
    expect(f.fetcher).toHaveBeenCalledTimes(1);
  });
  it("discovers a bounded list and selects a new model without retransferring the key", async () => {
    const f = fixture(); f.settings(); await enable(f); await save(f, "openai"); await tested(f);
    get<HTMLButtonElement>(f.target, "[data-discover]").click();
    await vi.waitFor(() => expect(f.target.textContent).toContain("Partial model list"));
    const choices = f.target.querySelectorAll<HTMLButtonElement>(".ai-model-choice"); expect(choices[1].disabled).toBe(true); choices[0].click();
    expect(get<HTMLButtonElement>(f.target, "[data-use]").disabled).toBe(true);
    get<HTMLButtonElement>(f.target, "[data-select-model]").click();
    await vi.waitFor(() => expect(f.client.getState().session?.candidate?.connection.model).toBe("model-b"));
    const [, init] = f.fetcher.mock.calls.find(([path]) => String(path).endsWith("/model"))!;
    expect(JSON.parse(String(init?.body))).toEqual({ generation: 0, candidateId: expect.any(String), model: "model-b" });
    expect(f.client.getState().session?.candidate?.tested).toBe(false);
  });
  it.each(["fresh", "transfer", "cancel"])("requires an explicit %s decision and preserves other-Lab history", async choice => {
    const f = fixture(); f.settings(); await enable(f); await save(f); await tested(f);
    f.access.updateSession(session => appendTutorMessage(session, "user", "ODE history"));
    f.store.updateTutor("linear_algebra", session => appendTutorMessage(session, "user", "Other Lab history"));
    get<HTMLButtonElement>(f.target, "[data-use]").click();
    expect(f.client.getState().selected.kind).toBe("hosted");
    expect((document.activeElement as HTMLElement).dataset.historyChoice).toBe("fresh");
    get<HTMLButtonElement>(f.target, `[data-history-choice="${choice}"]`).click();
    await vi.waitFor(() => expect(f.applied).toHaveBeenCalledOnce());
    expect(f.access.getSession().items).toHaveLength(choice === "fresh" ? 0 : 1);
    expect(f.store.getTutor("linear_algebra").items).toHaveLength(1);
    if (choice === "cancel") { expect(f.client.getState().selected.kind).toBe("hosted"); expect(f.client.getState().session?.candidate).toBeUndefined(); }
    else expect(f.client.canSendHistory(f.store.createTutorSessionAccess("linear_algebra"))).toBe(false);
  });
  it("rejects a stale conversation decision rather than clearing edited history", async () => {
    const f = fixture(); f.settings(); await enable(f); await save(f); await tested(f);
    get<HTMLButtonElement>(f.target, "[data-use]").click();
    f.access.updateSession(session => appendTutorMessage(session, "user", "Changed history"));
    get<HTMLButtonElement>(f.target, '[data-history-choice="fresh"]').click();
    await vi.waitFor(() => expect(f.target.textContent).toContain("Review your choice again"));
    expect(f.access.getSession().items).toHaveLength(1); expect(f.client.getState().selected.kind).toBe("hosted");
  });
  it("preserves the active connection/history when a replacement test fails with a bounded error", async () => {
    const f = fixture(); f.settings(); await enable(f); await save(f); await tested(f); await activate(f);
    f.access.updateSession(session => appendTutorMessage(session, "user", "Keep history"));
    const selected = f.client.getState().selected;
    await save(f); f.flags.failTest = true; get<HTMLButtonElement>(f.target, "[data-test]").click();
    await vi.waitFor(() => expect(f.target.textContent).toContain("rejected the credential"));
    expect(f.target.textContent).not.toContain("PRIVATE"); expect(f.client.getState().selected).toEqual(selected); expect(f.access.getSession().items).toHaveLength(1);
  });
  it("clears key entry before a failing transfer and on disposal", async () => {
    const f = fixture(); const view = f.settings(); await enable(f); f.flags.holdStage = true;
    edit(f.target, "[data-key]", "SYNTHETIC-KEY");
    get<HTMLFormElement>(f.target, "form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    expect(get<HTMLInputElement>(f.target, "[data-key]").value).toBe("");
    view.dispose(); expect(f.target.children).toHaveLength(0);
    await vi.waitFor(() => expect(f.client.getState().pending).toBeUndefined());
  });
  it("removes credential entry and pending conversation choices on session expiry", async () => {
    vi.useFakeTimers();
    try {
      const f = fixture(); f.settings(); await enable(f); await save(f); await tested(f);
      get<HTMLButtonElement>(f.target, "[data-use]").click();
      const key = get<HTMLInputElement>(f.target, "[data-key]");
      key.value = "SYNTHETIC-UNSENT-KEY";
      await vi.advanceTimersByTimeAsync(1_800_001);
      expect(f.client.getState().status).toBe("expired");
      expect(key.value).toBe(""); expect(key.isConnected).toBe(false);
      expect(f.target.querySelector("[data-key]")).toBeNull();
      expect(get<HTMLElement>(f.target, "[data-review]").hidden).toBe(true);
    } finally { vi.useRealTimers(); }
  });
});

describe("personal connection in the Tutor panel", () => {
  it("sends to the selected personal client, supports cancellation and retains the tab connection on close", async () => {
    const f = fixture(), { view, hosted } = f.panel();
    get<HTMLButtonElement>(f.target, "[data-connection-settings]").click(); await enable(f); await save(f); await tested(f); await activate(f);
    await vi.waitFor(() => expect(get<HTMLElement>(f.target, "[data-tutor-content]").hidden).toBe(false));
    const input = get<HTMLTextAreaElement>(f.target, "textarea"); input.value = "Personal question";
    get<HTMLFormElement>(f.target, ".ai-compose").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(f.access.getSession().items).toHaveLength(2)); expect(hosted).not.toHaveBeenCalled();
    f.flags.holdChat = true; input.value = "Cancel this question";
    get<HTMLFormElement>(f.target, ".ai-compose").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(f.client.getState().pending).toBe("chat"));
    const cancel = get<HTMLButtonElement>(f.target, ".ai-cancel"); cancel.focus(); cancel.click();
    await vi.waitFor(() => expect(f.client.getState().pending).toBeUndefined());
    expect(f.access.getSession().items).toHaveLength(3); expect(f.target.textContent).not.toContain("PRIVATE");
    expect(document.activeElement).toBe(input);
    view.dispose(); expect(f.client.getState().session?.active?.model).toBe("model-a");
  });
  it("keeps settings reachable without a solve and requires a decision for old history", async () => {
    const f = fixture(); f.access.updateSession(session => appendTutorMessage(session, "user", "Old history"));
    const { view } = f.panel(false);
    expect(get<HTMLTextAreaElement>(f.target, "textarea").disabled).toBe(true);
    expect(get<HTMLButtonElement>(f.target, "[data-history-review]").hidden).toBe(false);
    get<HTMLButtonElement>(f.target, "[data-history-review]").click();
    expect(f.target.textContent).toContain("Start fresh");
    f.access.updateSession(clearTutorConversation); view.refresh?.();
    expect(f.fetcher).not.toHaveBeenCalled();
  });
});
