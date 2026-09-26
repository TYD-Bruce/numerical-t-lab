// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAppSessionStore } from "./appSessionStore";
import type { LabTutorBinding } from "./contracts";
import { createPlatformTutorHost } from "./platformTutorHost";
import { createPlatformModalEnvironment } from "./platformModalEnvironment";
import { appendTutorMessage, updateTutorDraft } from "../tutor/moduleTutorSession";
import { createOdeTutorBinding } from "../labs/ode/odeTutorBinding";
import { mountPlatformTutorPanel } from "../tutor/platformTutorPanel";
import { createTutorConnection } from "../tutor/tutorConnection";

function binding(moduleId: "ode" = "ode"): LabTutorBinding {
  return {
    moduleId,
    promptProfile: "ode",
    suggestedQuestions: [],
    description: "Fixture Tutor",
    getContext: () => ({ status: "ready", revision: 0, context: {} }),
  };
}

function labDom(label: string): {
  root: HTMLElement;
  actionGroup: HTMLElement;
  reset: HTMLButtonElement;
} {
  const root = document.createElement("section");
  root.dataset.labDom = label;
  const actionGroup = document.createElement("div");
  actionGroup.className = "lab-header-actions";
  actionGroup.dataset.labHeaderActions = "true";
  const reset = document.createElement("button");
  reset.className = "lab-action lab-action-secondary";
  reset.dataset.labHeaderAction = "true";
  reset.dataset.labActionRole = "secondary";
  reset.textContent = `New experiment ${label}`;
  actionGroup.append(reset);
  root.append(actionGroup);
  return { root, actionGroup, reset };
}

describe("Platform Tutor Host", () => {
  beforeEach(() => document.body.replaceChildren());
  afterEach(() => vi.unstubAllGlobals());

  it("creates the private connection on first open, reuses it across mounts and disposes it with the Host", async () => {
    const target = document.createElement("div"); document.body.append(target);
    const fetcher = vi.fn<typeof fetch>();
    const connection = createTutorConnection({ fetch: fetcher, origin: () => "https://example.invalid" });
    const dispose = vi.spyOn(connection, "dispose");
    const create = vi.fn(() => connection);
    const mountedConnections: unknown[] = [];
    const host = createPlatformTutorHost({ target, isMobile: () => false,
      loadPanel: async () => ({ createTutorConnection: create, mountPlatformTutorPanel(_target, options) { mountedConnections.push(options.connection); return { dispose: vi.fn(), focus: vi.fn() }; } }),
    });
    const store = createAppSessionStore(); host.connect(binding(), store.createTutorSessionAccess("ode"));
    expect(create).not.toHaveBeenCalled();
    await host.open(target.querySelector<HTMLButtonElement>("[data-tutor-open]")!); host.close();
    host.disconnect(); host.connect(binding(), store.createTutorSessionAccess("ode"));
    await host.open(target.querySelector<HTMLButtonElement>("[data-tutor-open]")!);
    expect(create).toHaveBeenCalledOnce(); expect(mountedConnections).toEqual([connection, connection]);
    expect(fetcher).not.toHaveBeenCalled(); expect(dispose).not.toHaveBeenCalled();
    host.dispose(); expect(dispose).toHaveBeenCalledOnce(); expect(connection.getState().status).toBe("disposed");
  });

  it("subscribes without eagerly reading context and ignores disconnected context callbacks", async () => {
    const target = document.createElement("div");
    document.body.append(target);
    const store = createAppSessionStore();
    const refresh = vi.fn();
    let contextChanged!: () => void;
    const unsubscribe = vi.fn();
    const getContext = vi.fn(binding().getContext);
    const host = createPlatformTutorHost({
      target, isMobile: () => false,
      loadPanel: async () => ({ mountPlatformTutorPanel: () => ({ dispose: vi.fn(), focus: vi.fn(), refresh }) }),
    });
    host.connect({ ...binding(), getContext, subscribeContextChange(listener) { contextChanged = listener; return unsubscribe; } }, store.createTutorSessionAccess("ode"));
    contextChanged();
    expect(getContext).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    await host.open(target.querySelector<HTMLElement>("[data-tutor-open]")!);
    contextChanged();
    expect(refresh).toHaveBeenCalledOnce();

    host.connect(binding(), store.createTutorSessionAccess("ode"));
    expect(unsubscribe).toHaveBeenCalledOnce();
    await host.open(target.querySelector<HTMLElement>("[data-tutor-open]")!);
    refresh.mockClear();
    contextChanged();
    expect(refresh).not.toHaveBeenCalled();
    host.dispose(); host.dispose();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("preserves the shell-owned placement class when it renders", () => {
    const target = document.createElement("aside");
    target.className = "platform-tutor-region";
    document.body.append(target);
    const store = createAppSessionStore();
    const host = createPlatformTutorHost({ target });

    host.connect(binding(), store.createTutorSessionAccess("ode"));

    expect(target.classList).toContain("platform-tutor-region");
    expect(target.classList).toContain("platform-tutor-host");
    host.dispose();
  });

  it("joins a shared Lab header action group with primary action geometry", async () => {
    const target = document.createElement("aside");
    const labTarget = document.createElement("main");
    const actionGroup = document.createElement("div");
    actionGroup.className = "lab-header-actions";
    actionGroup.dataset.labHeaderActions = "true";
    const reset = document.createElement("button");
    reset.className = "lab-action lab-action-secondary";
    reset.dataset.labHeaderAction = "true";
    reset.dataset.labActionRole = "secondary";
    reset.textContent = "New experiment";
    actionGroup.append(reset);
    labTarget.append(actionGroup);
    document.body.append(labTarget, target);
    const store = createAppSessionStore();
    const focusPanel = vi.fn();
    const host = createPlatformTutorHost({
      target,
      labTarget,
      isMobile: () => false,
      loadPanel: async () => ({
        mountPlatformTutorPanel: () => ({
          dispose: vi.fn(),
          focus: focusPanel,
        }),
      }),
    });

    host.connect(binding(), store.createTutorSessionAccess("ode"));

    const launcher = actionGroup.querySelector<HTMLButtonElement>(
      "[data-tutor-open]"
    )!;
    expect(launcher.textContent).toBe("Open AI Tutor");
    expect(launcher.classList).toContain("lab-action");
    expect(launcher.classList).toContain("lab-action-primary");
    expect(launcher.dataset.labActionRole).toBe("primary");
    expect(launcher.dataset.labHeaderAction).toBe("true");
    expect(launcher.previousElementSibling).toBe(reset);
    expect(target.childElementCount).toBe(0);

    await host.open(launcher);
    expect(actionGroup.querySelector("[data-tutor-open]")).toBeNull();
    expect(target.querySelector("[data-tutor-presentation]")).not.toBeNull();
    expect(focusPanel).toHaveBeenCalledOnce();

    host.close();
    const restored = actionGroup.querySelector<HTMLButtonElement>(
      "[data-tutor-open]"
    )!;
    expect(restored.previousElementSibling).toBe(reset);
    expect(document.activeElement).toBe(restored);

    host.dispose();
    expect(actionGroup.querySelector("[data-tutor-open]")).toBeNull();
  });

  it("reconciles one existing closed launcher into the newest Lab header after repeated subtree replacement", async () => {
    const target = document.createElement("aside");
    const labTarget = document.createElement("main");
    const first = labDom("first");
    labTarget.append(first.root);
    document.body.append(labTarget, target);
    const store = createAppSessionStore();
    const host = createPlatformTutorHost({ target, labTarget });
    host.connect(binding(), store.createTutorSessionAccess("ode"));

    const originalLauncher = first.actionGroup.querySelector<HTMLButtonElement>(
      "[data-tutor-open]"
    )!;
    const second = labDom("second");
    labTarget.replaceChildren(second.root);

    await vi.waitFor(() =>
      expect(second.actionGroup.querySelectorAll("[data-tutor-open]")).toHaveLength(1)
    );
    expect(second.actionGroup.querySelector("[data-tutor-open]")).toBe(
      originalLauncher
    );
    expect(second.actionGroup.lastElementChild).toBe(originalLauncher);
    expect(target.querySelector("[data-tutor-open]")).toBeNull();

    const third = labDom("third");
    labTarget.replaceChildren(third.root);
    await vi.waitFor(() =>
      expect(third.actionGroup.querySelectorAll("[data-tutor-open]")).toHaveLength(1)
    );
    expect(third.actionGroup.querySelector("[data-tutor-open]")).toBe(
      originalLauncher
    );
    expect(labTarget.querySelectorAll("[data-tutor-open]")).toHaveLength(1);
    expect(third.actionGroup.lastElementChild).toBe(originalLauncher);
    host.dispose();
  });

  it("does not reproject while open, then closes into and focuses the latest Lab header", async () => {
    const target = document.createElement("aside");
    const labTarget = document.createElement("main");
    const first = labDom("first");
    labTarget.append(first.root);
    document.body.append(labTarget, target);
    const store = createAppSessionStore();
    const host = createPlatformTutorHost({
      target,
      labTarget,
      isMobile: () => false,
      loadPanel: async () => ({
        mountPlatformTutorPanel: () => ({
          dispose: vi.fn(),
          focus: vi.fn(),
        }),
      }),
    });
    host.connect(binding(), store.createTutorSessionAccess("ode"));
    await host.open(
      first.actionGroup.querySelector<HTMLButtonElement>("[data-tutor-open]")!
    );

    const second = labDom("second");
    labTarget.replaceChildren(second.root);
    await Promise.resolve();

    expect(labTarget.querySelector("[data-tutor-open]")).toBeNull();
    expect(target.querySelector("[data-tutor-open]")).toBeNull();
    expect(target.querySelector("[data-tutor-presentation]")).not.toBeNull();

    host.close();
    const latestLauncher = second.actionGroup.querySelector<HTMLButtonElement>(
      "[data-tutor-open]"
    )!;
    expect(latestLauncher).not.toBeNull();
    expect(second.actionGroup.querySelectorAll("[data-tutor-open]")).toHaveLength(1);
    expect(document.activeElement).toBe(latestLauncher);
    host.dispose();
  });

  it("stops observing on disconnect and replaces observation with the latest connection", async () => {
    const target = document.createElement("aside");
    const labTarget = document.createElement("main");
    const first = labDom("first");
    labTarget.append(first.root);
    document.body.append(labTarget, target);
    const store = createAppSessionStore();
    const host = createPlatformTutorHost({ target, labTarget });
    host.connect(binding(), store.createTutorSessionAccess("ode"));
    host.disconnect();

    const disconnected = labDom("disconnected");
    labTarget.replaceChildren(disconnected.root);
    await Promise.resolve();
    expect(disconnected.actionGroup.querySelector("[data-tutor-open]")).toBeNull();
    expect(target.querySelector("[data-tutor-open]")).toBeNull();

    host.connect(binding(), store.createTutorSessionAccess("ode"));
    expect(disconnected.actionGroup.querySelectorAll("[data-tutor-open]")).toHaveLength(1);

    const replacement = labDom("replacement");
    labTarget.replaceChildren(replacement.root);
    host.connect(binding(), store.createTutorSessionAccess("ode"));
    expect(replacement.actionGroup.querySelectorAll("[data-tutor-open]")).toHaveLength(1);

    const latest = labDom("latest");
    labTarget.replaceChildren(latest.root);
    await vi.waitFor(() =>
      expect(latest.actionGroup.querySelectorAll("[data-tutor-open]")).toHaveLength(1)
    );
    host.dispose();

    const disposed = labDom("disposed");
    labTarget.replaceChildren(disposed.root);
    await Promise.resolve();
    expect(disposed.actionGroup.querySelector("[data-tutor-open]")).toBeNull();
  });

  it("owns exactly one Lab observer per active connection and disconnects it on replacement", () => {
    const observers: Array<{ disconnect: ReturnType<typeof vi.fn> }> = [];
    vi.stubGlobal(
      "MutationObserver",
      class {
        readonly disconnect = vi.fn();
        constructor() {
          observers.push(this);
        }
        observe(): void {}
        takeRecords(): MutationRecord[] {
          return [];
        }
      }
    );
    const target = document.createElement("aside");
    const labTarget = document.createElement("main");
    labTarget.append(labDom("first").root);
    document.body.append(labTarget, target);
    const store = createAppSessionStore();
    const host = createPlatformTutorHost({ target, labTarget });

    host.connect(binding(), store.createTutorSessionAccess("ode"));
    expect(observers).toHaveLength(1);
    expect(observers[0]!.disconnect).not.toHaveBeenCalled();

    host.connect(binding(), store.createTutorSessionAccess("ode"));
    expect(observers).toHaveLength(2);
    expect(observers[0]!.disconnect).toHaveBeenCalledOnce();
    expect(observers[1]!.disconnect).not.toHaveBeenCalled();

    host.disconnect();
    expect(observers[1]!.disconnect).toHaveBeenCalledOnce();
    host.dispose();
  });

  it("loads the complete panel only on first open and reuses the fulfilled attempt", async () => {
    const target = document.createElement("div");
    document.body.append(target);
    const mount = vi.fn(() => ({ dispose: vi.fn(), focus: vi.fn() }));
    const loadPanel = vi.fn(async () => ({ mountPlatformTutorPanel: mount }));
    const store = createAppSessionStore();
    const host = createPlatformTutorHost({ target, loadPanel, isMobile: () => false });
    host.connect(binding(), store.createTutorSessionAccess("ode"));

    expect(loadPanel).not.toHaveBeenCalled();
    const trigger = target.querySelector<HTMLButtonElement>("[data-tutor-open]")!;
    await host.open(trigger);
    host.close();
    await host.open(trigger);

    expect(loadPanel).toHaveBeenCalledOnce();
    expect(mount).toHaveBeenCalledTimes(2);
  });

  it("keeps one contained composer after repeated open and close", async () => {
    const target = document.createElement("div");
    document.body.append(target);
    const store = createAppSessionStore();
    const host = createPlatformTutorHost({
      target,
      isMobile: () => false,
      loadPanel: async () => ({ mountPlatformTutorPanel }),
    });
    host.connect(binding(), store.createTutorSessionAccess("ode"));

    await host.open(target.querySelector<HTMLElement>("[data-tutor-open]")!);
    const firstPanel = target.querySelector<HTMLElement>(".ai-tutor-panel")!;
    expect(firstPanel.querySelector(".ai-tutor-content > .ai-compose")).not.toBeNull();
    expect(firstPanel.textContent).toContain("Fixture Tutor");
    expect(firstPanel.textContent).not.toContain(
      "Ask about the method, variables, coefficients, stability, accuracy, or graph behavior."
    );
    expect(target.querySelectorAll(".ai-tutor-panel")).toHaveLength(1);

    host.close();
    await host.open(target.querySelector<HTMLElement>("[data-tutor-open]")!);
    const secondPanel = target.querySelector<HTMLElement>(".ai-tutor-panel")!;
    expect(secondPanel).not.toBe(firstPanel);
    expect(secondPanel.querySelector(".ai-tutor-content > .ai-compose")).not.toBeNull();
    expect(target.querySelectorAll(".ai-tutor-panel")).toHaveLength(1);
    host.dispose();
  });

  it("uses live session access and preserves transcript/draft across disconnect", async () => {
    const target = document.createElement("div");
    document.body.append(target);
    const store = createAppSessionStore();
    let receivedAccess: ReturnType<typeof store.createTutorSessionAccess> | undefined;
    const host = createPlatformTutorHost({
      target,
      isMobile: () => false,
      loadPanel: async () => ({
        mountPlatformTutorPanel: (_target, options) => {
          receivedAccess = options.sessionAccess;
          return { dispose: vi.fn(), focus: vi.fn() };
        },
      }),
    });
    host.connect(binding(), store.createTutorSessionAccess("ode"));
    await host.open(target.querySelector<HTMLButtonElement>("[data-tutor-open]")!);
    store.updateTutor("ode", (current) =>
      updateTutorDraft(appendTutorMessage(current, "user", "Keep me"), "draft")
    );

    expect(receivedAccess?.getSession()).toBe(store.getTutor("ode"));
    host.disconnect();
    expect(store.getTutor("ode")).toMatchObject({ draftMessage: "draft" });
    expect(store.getTutor("ode").items).toHaveLength(1);
  });

  it("ignores a stale lazy-load completion after disconnect", async () => {
    let resolve!: (module: { mountPlatformTutorPanel: ReturnType<typeof vi.fn> }) => void;
    const pending = new Promise<{ mountPlatformTutorPanel: ReturnType<typeof vi.fn> }>(
      (done) => { resolve = done; }
    );
    const mount = vi.fn(() => ({ dispose: vi.fn(), focus: vi.fn() }));
    const target = document.createElement("div");
    document.body.append(target);
    const store = createAppSessionStore();
    const host = createPlatformTutorHost({ target, loadPanel: () => pending });
    host.connect(binding(), store.createTutorSessionAccess("ode"));
    const opening = host.open(target.querySelector<HTMLButtonElement>("[data-tutor-open]")!);
    host.disconnect();
    resolve({ mountPlatformTutorPanel: mount });
    await opening;

    expect(mount).not.toHaveBeenCalled();
  });

  it("retries only a rejected panel load without clearing Tutor state", async () => {
    const target = document.createElement("div");
    document.body.append(target);
    const store = createAppSessionStore();
    store.updateTutor("ode", (current) => appendTutorMessage(current, "user", "Persist"));
    const mount = vi.fn(() => ({ dispose: vi.fn(), focus: vi.fn() }));
    const loadPanel = vi
      .fn<() => Promise<{ mountPlatformTutorPanel: typeof mount }>>()
      .mockRejectedValueOnce(new Error("chunk unavailable"))
      .mockResolvedValueOnce({ mountPlatformTutorPanel: mount });
    const host = createPlatformTutorHost({ target, loadPanel, isMobile: () => false });
    host.connect(binding(), store.createTutorSessionAccess("ode"));
    await host.open(target.querySelector<HTMLElement>("[data-tutor-open]")!);
    expect(target.textContent).toContain("Retry");
    target.querySelector<HTMLButtonElement>(".platform-tutor-failure .primary")!.click();
    await vi.waitFor(() => expect(mount).toHaveBeenCalledOnce());
    expect(loadPanel).toHaveBeenCalledTimes(2);
    expect(store.getTutor("ode").items).toHaveLength(1);
  });

  it("consumes Lab reset requests for only the connected module and preserves open state", async () => {
    const target = document.createElement("div");
    document.body.append(target);
    const store = createAppSessionStore();
    store.updateTutor("ode", (current) =>
      updateTutorDraft(appendTutorMessage(current, "user", "Clear me"), "draft")
    );
    store.updateTutor("pde", (current) => appendTutorMessage(current, "user", "Keep PDE"));
    const control = createOdeTutorBinding({ getSource: () => ({ enabled: false }) });
    const refresh = vi.fn();
    const cancelPending = vi.fn();
    const host = createPlatformTutorHost({
      target,
      isMobile: () => false,
      loadPanel: async () => ({
        mountPlatformTutorPanel: () => ({
          dispose: vi.fn(),
          focus: vi.fn(),
          refresh,
          cancelPending,
        }),
      }),
    });
    host.connect(control.binding, store.createTutorSessionAccess("ode"));
    await host.open(target.querySelector<HTMLElement>("[data-tutor-open]")!);
    control.requestConversationReset();

    expect(store.getTutor("ode")).toEqual({ revision: 2, items: [], draftMessage: "", desktopOpen: true });
    expect(store.getTutor("pde").items).toHaveLength(1);
    expect(cancelPending).toHaveBeenCalledOnce();
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("locks and restores the Lab for a mobile sheet without changing desktop preference", async () => {
    const target = document.createElement("div");
    const lab = document.createElement("main");
    document.body.append(lab, target);
    const store = createAppSessionStore();
    Object.defineProperty(document, "scrollingElement", {
      configurable: true,
      value: document.documentElement,
    });
    document.documentElement.scrollTop = 320;
    const host = createPlatformTutorHost({
      target,
      labTarget: lab,
      isMobile: () => true,
      loadPanel: async () => ({
        mountPlatformTutorPanel: (panelTarget) => {
          const panel = document.createElement("aside");
          panel.className = "ai-tutor-panel";
          panelTarget.append(panel);
          return { dispose: vi.fn(), focus: vi.fn() };
        },
      }),
    });
    host.connect(binding(), store.createTutorSessionAccess("ode"));
    await host.open(target.querySelector<HTMLElement>("[data-tutor-open]")!);
    expect(lab.hasAttribute("inert")).toBe(true);
    expect(document.body.style.overflow).toBe("hidden");
    expect(target.querySelector("[role=dialog]")?.getAttribute("aria-modal")).toBe("true");
    document.documentElement.scrollTop = 0;
    host.closeMobileForNavigation();
    expect(lab.hasAttribute("inert")).toBe(false);
    expect(document.body.style.overflow).toBe("");
    expect(store.getTutor("ode").desktopOpen).toBe(false);
    expect(document.documentElement.scrollTop).toBe(320);
  });

  it("silently refuses an external modal and requires a later fresh open", async () => {
    const target = document.createElement("div");
    const lab = document.createElement("main");
    const blocker = document.createElement("div");
    blocker.setAttribute("role", "dialog");
    blocker.setAttribute("aria-modal", "true");
    document.body.append(lab, target, blocker);
    const focused = document.createElement("button");
    blocker.append(focused);
    focused.focus();
    const store = createAppSessionStore();
    const mount = vi.fn(() => ({ dispose: vi.fn(), focus: vi.fn() }));
    const loadPanel = vi.fn(async () => ({ mountPlatformTutorPanel: mount }));
    const host = createPlatformTutorHost({
      target,
      labTarget: lab,
      modalEnvironment: createPlatformModalEnvironment(),
      modalBackground: () => [lab],
      isMobile: () => true,
      loadPanel,
    });
    host.connect(binding(), store.createTutorSessionAccess("ode"));
    const trigger = target.querySelector<HTMLElement>("[data-tutor-open]")!;

    await host.open(trigger);

    expect(loadPanel).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(focused);
    expect(lab.hasAttribute("inert")).toBe(false);
    expect(document.body.style.overflow).toBe("");
    expect(target.querySelector("[data-tutor-open]")).not.toBeNull();

    blocker.remove();
    expect(loadPanel).not.toHaveBeenCalled();
    await host.open(trigger);
    expect(mount).toHaveBeenCalledOnce();
    host.dispose();
  });

  it("suspends a mounted Tutor before releasing its modal lease and reuses it on manual open", async () => {
    const target = document.createElement("div");
    const lab = document.createElement("main");
    document.body.append(lab, target);
    const store = createAppSessionStore();
    store.updateTutor("ode", (current) =>
      updateTutorDraft(appendTutorMessage(current, "user", "Preserve me"), "draft")
    );
    const dispose = vi.fn();
    const focus = vi.fn();
    const mount = vi.fn((panelTarget: HTMLElement) => {
      const panel = document.createElement("aside");
      panel.className = "ai-tutor-panel";
      panelTarget.append(panel);
      return { dispose, focus };
    });
    const host = createPlatformTutorHost({
      target,
      labTarget: lab,
      modalEnvironment: createPlatformModalEnvironment(),
      modalBackground: () => [lab],
      isMobile: () => true,
      loadPanel: async () => ({ mountPlatformTutorPanel: mount }),
    });
    host.connect(binding(), store.createTutorSessionAccess("ode"));
    await host.open(target.querySelector<HTMLElement>("[data-tutor-open]")!);

    host.suspendPresentationForGlossary();

    const presentation = target.querySelector<HTMLElement>("[data-tutor-presentation]")!;
    expect(dispose).not.toHaveBeenCalled();
    expect(host.isPresentationVisible()).toBe(false);
    expect(presentation.hidden).toBe(true);
    expect(presentation.getAttribute("aria-hidden")).toBe("true");
    expect(presentation.hasAttribute("inert")).toBe(true);
    expect(target.querySelector('[aria-modal="true"]')).toBeNull();
    expect(lab.hasAttribute("inert")).toBe(false);
    expect(document.body.style.overflow).toBe("");
    expect(store.getTutor("ode")).toMatchObject({ draftMessage: "draft" });
    expect(store.getTutor("ode").items).toHaveLength(1);

    const launcher = target.querySelector<HTMLElement>("[data-tutor-open]")!;
    await host.open(launcher);

    expect(mount).toHaveBeenCalledOnce();
    expect(host.isPresentationVisible()).toBe(true);
    expect(presentation.hidden).toBe(false);
    expect(presentation.hasAttribute("inert")).toBe(false);
    expect(presentation.querySelector('[aria-modal="true"]')).not.toBeNull();
    expect(focus).toHaveBeenCalledTimes(2);

    host.close();
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("keeps ordinary disconnect disposal behavior after suspension", async () => {
    const target = document.createElement("div");
    document.body.append(target);
    const store = createAppSessionStore();
    const dispose = vi.fn();
    const cancelPending = vi.fn();
    const host = createPlatformTutorHost({
      target,
      isMobile: () => false,
      loadPanel: async () => ({
        mountPlatformTutorPanel: (panelTarget) => {
          const panel = document.createElement("aside");
          panel.className = "ai-tutor-panel";
          panelTarget.append(panel);
          return { dispose, focus: vi.fn(), cancelPending };
        },
      }),
    });
    host.connect(binding(), store.createTutorSessionAccess("ode"));
    await host.open(target.querySelector<HTMLElement>("[data-tutor-open]")!);
    host.suspendPresentationForGlossary();

    host.disconnect();

    expect(dispose).toHaveBeenCalledOnce();
    expect(target.childElementCount).toBe(0);
  });

  it.each(["disconnect", "close", "dispose"] as const)(
    "leaves no deferred restore authority after suspended Tutor %s",
    async (action) => {
      const observerConstructed = vi.fn();
      const observerDisconnected = vi.fn();
      vi.stubGlobal(
        "MutationObserver",
        class {
          constructor() {
            observerConstructed();
          }
          observe(): void {}
          disconnect(): void {
            observerDisconnected();
          }
          takeRecords(): MutationRecord[] {
            return [];
          }
        }
      );
      const target = document.createElement("div");
      const lab = document.createElement("main");
      document.body.append(lab, target);
      const store = createAppSessionStore();
      const disposePanel = vi.fn();
      const host = createPlatformTutorHost({
        target,
        labTarget: lab,
        modalEnvironment: createPlatformModalEnvironment(),
        modalBackground: () => [lab],
        isMobile: () => true,
        loadPanel: async () => ({
          mountPlatformTutorPanel: (panelTarget) => {
            const panel = document.createElement("aside");
            panel.className = "ai-tutor-panel";
            panelTarget.append(panel);
            return {
              dispose: disposePanel,
              focus: vi.fn(),
              cancelPending: vi.fn(),
            };
          },
        }),
      });
      host.connect(binding(), store.createTutorSessionAccess("ode"));
      await host.open(target.querySelector<HTMLElement>("[data-tutor-open]")!);
      const suspension = host.suspendPresentationForGlossary()!;
      const blocker = document.createElement("section");
      blocker.setAttribute("role", "dialog");
      blocker.setAttribute("aria-modal", "true");
      document.body.append(blocker);

      suspension.restore();
      expect(host.isPresentationVisible()).toBe(false);
      expect(target.querySelector("[data-tutor-open]")).not.toBeNull();
      expect(observerConstructed).toHaveBeenCalledOnce();

      if (action === "disconnect") {
        host.disconnect();
      } else if (action === "close") {
        host.close({ restoreFocus: false });
      } else {
        host.dispose();
      }
      blocker.remove();
      suspension.restore();
      await Promise.resolve();

      expect(host.isPresentationVisible()).toBe(false);
      expect(disposePanel).toHaveBeenCalledOnce();
      expect(observerConstructed).toHaveBeenCalledOnce();
      if (action === "close") {
        expect(observerDisconnected).not.toHaveBeenCalled();
        expect(target.querySelector("[data-tutor-open]")).not.toBeNull();
        host.dispose();
        expect(observerDisconnected).toHaveBeenCalledOnce();
      } else {
        expect(observerDisconnected).toHaveBeenCalledOnce();
        expect(target.childElementCount).toBe(0);
        if (action === "disconnect") host.dispose();
      }
    }
  );
});
