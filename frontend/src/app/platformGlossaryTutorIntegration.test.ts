// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LabGlossaryBinding } from "../glossary/glossaryController";
import {
  defineGlossaryScopeId,
  defineGlossaryTermId,
} from "../glossary/glossaryBuilders";
import type {
  GlossaryHostPort,
  GlossarySurfaceRequest,
} from "../glossary/glossaryRuntimeTypes";
import { mountGlossarySurface } from "../glossary/surface/glossarySurfaceRuntime";
import {
  appendTutorMessage,
  updateTutorDraft,
} from "../tutor/moduleTutorSession";
import { createAppSessionStore } from "./appSessionStore";
import type { LabTutorBinding } from "./contracts";
import {
  createPlatformGlossaryHost,
  type PlatformGlossaryHost,
} from "./platformGlossaryHost";
import {
  createPlatformModalEnvironment,
  type PlatformModalEnvironment,
} from "./platformModalEnvironment";
import {
  createPlatformTutorHost,
  type PlatformTutorHost,
} from "./platformTutorHost";

const termId = defineGlossaryTermId("sample_term")!;
const scopeId = defineGlossaryScopeId("sample_scope")!;

function controlledGlossaryBinding() {
  const identity = Object.freeze({ moduleId: "ode" as const });
  let port: GlossaryHostPort | undefined;
  const binding: LabGlossaryBinding = {
    moduleId: "ode",
    identity,
    connect(next) {
      port = next;
      return () => {
        if (port === next) port = undefined;
      };
    },
    createScope: vi.fn() as never,
    beginScopeRerender: vi.fn() as never,
    dispose: vi.fn(),
  };
  return {
    binding,
    get port() {
      return port;
    },
  };
}

function glossaryRequest(
  binding: LabGlossaryBinding,
  trigger: HTMLButtonElement
): GlossarySurfaceRequest {
  const scope = Object.freeze({
    binding: binding.identity,
    moduleId: "ode" as const,
    scopeId,
    generation: 1,
  });
  const identity = Object.freeze({
    binding: binding.identity,
    scope,
    moduleId: "ode" as const,
    scopeId,
    termId,
    scopeGeneration: 1,
    trigger,
  });
  return Object.freeze({
    identity,
    moduleId: "ode",
    scopeId,
    termId,
    trigger,
    display: "Sample parameter",
    entry: Object.freeze({
      id: termId,
      moduleId: "ode",
      display: "Sample parameter",
      label: "Sample parameter",
      aliases: Object.freeze([]),
      definition: "A development-only definition.",
      whyItMatters: "It exercises the shared surface lifecycle.",
      tutorTopic: "sample",
    }),
    termResolver: Object.freeze({ resolve: () => undefined }),
    intent: { kind: "activate", pointer: "touch" } as const,
    scopeGeneration: 1,
  });
}

function connectedTrigger(): HTMLButtonElement {
  const trigger = document.createElement("button");
  trigger.textContent = "Sample parameter";
  document.body.append(trigger);
  Object.defineProperty(trigger, "getBoundingClientRect", {
    value: () => ({
      left: 20,
      right: 140,
      top: 100,
      bottom: 130,
      width: 120,
      height: 30,
      x: 20,
      y: 100,
      toJSON: () => ({}),
    }),
  });
  return trigger;
}

function tutorBinding(): LabTutorBinding {
  return {
    moduleId: "ode",
    promptProfile: "ode",
    suggestedQuestions: [],
    description: "Fixture Tutor",
    getContext: () => ({ status: "unavailable", revision: 0, message: "Run a method first." }),
  };
}

function instrumentedModalEnvironment(events: string[]): PlatformModalEnvironment {
  const actual = createPlatformModalEnvironment();
  return {
    acquire(options) {
      const result = actual.acquire(options);
      events.push(`acquire:${options.owner}:${result.status}`);
      if (result.status === "blocked") return result;
      return {
        status: "acquired",
        lease: Object.freeze({
          owner: result.lease.owner,
          release(): void {
            events.push(`release:${result.lease.owner}`);
            result.lease.release();
          },
        }),
      };
    },
    dispose(): void {
      actual.dispose();
    },
  };
}

function activeModalDialogs(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[aria-modal="true"]')];
}

describe("Platform Tutor and Glossary Host integration", () => {
  beforeEach(() => {
    document.body.replaceChildren();
    document.body.style.overflow = "";
  });
  afterEach(() => vi.unstubAllGlobals());

  it("suspends the actual mobile Tutor before opening Glossary and retains its panel", async () => {
    const lab = document.createElement("main");
    const tutorTarget = document.createElement("aside");
    const glossaryTarget = document.createElement("aside");
    document.body.append(lab, tutorTarget, glossaryTarget);
    const modalEvents: string[] = [];
    const modalEnvironment = instrumentedModalEnvironment(modalEvents);
    const store = createAppSessionStore();
    store.updateTutor("ode", (current) =>
      updateTutorDraft(
        appendTutorMessage(current, "user", "Preserve this transcript"),
        "preserve this draft"
      )
    );
    let pendingRequest = true;
    const cancelPending = vi.fn(() => {
      pendingRequest = false;
    });
    const panelDispose = vi.fn();
    const panelFocus = vi.fn();
    const mountPanel = vi.fn((target: HTMLElement) => {
      const panel = document.createElement("aside");
      panel.className = "ai-tutor-panel";
      panel.dataset.testTutorPanel = "";
      target.append(panel);
      return {
        dispose: panelDispose,
        focus: panelFocus,
        cancelPending,
      };
    });
    let glossaryHost: PlatformGlossaryHost;
    const tutorHost = createPlatformTutorHost({
      target: tutorTarget,
      labTarget: lab,
      modalEnvironment,
      modalBackground: () => [lab, glossaryTarget],
      isMobile: () => true,
      loadPanel: async () => ({ mountPlatformTutorPanel: mountPanel }),
      onBeforeManualOpen: () =>
        glossaryHost?.close({ restoreFocus: false }),
    });
    glossaryHost = createPlatformGlossaryHost({
      target: glossaryTarget,
      modalEnvironment,
      modalBackground: () => [lab, tutorTarget],
      tutorPresentation: tutorHost,
      isMobile: () => true,
      loadSurface: async () => ({ mountGlossarySurface }),
    });
    const glossary = controlledGlossaryBinding();
    glossaryHost.connect(glossary.binding);
    tutorHost.connect(tutorBinding(), store.createTutorSessionAccess("ode"));
    await tutorHost.open(
      tutorTarget.querySelector<HTMLElement>("[data-tutor-open]")!
    );
    const retainedPanel = tutorTarget.querySelector<HTMLElement>(
      "[data-test-tutor-panel]"
    )!;
    const request = glossaryRequest(glossary.binding, connectedTrigger());

    glossary.port!.requestOpen(request);
    await vi.waitFor(() =>
      expect(
        glossaryTarget.querySelector('.glossary-surface-mobile-sheet[aria-modal="true"]')
      ).not.toBeNull()
    );

    const presentation = tutorTarget.querySelector<HTMLElement>(
      "[data-tutor-presentation]"
    )!;
    expect(tutorHost.isPresentationVisible()).toBe(false);
    expect(presentation.hidden).toBe(true);
    expect(presentation.getAttribute("aria-hidden")).toBe("true");
    expect(presentation.hasAttribute("inert")).toBe(true);
    expect(tutorTarget.querySelector('[aria-modal="true"]')).toBeNull();
    expect(activeModalDialogs()).toHaveLength(1);
    expect(modalEvents.indexOf("release:tutor")).toBeLessThan(
      modalEvents.indexOf("acquire:glossary:acquired")
    );
    expect(tutorTarget.querySelector("[data-test-tutor-panel]")).toBe(
      retainedPanel
    );
    expect(mountPanel).toHaveBeenCalledOnce();
    expect(panelDispose).not.toHaveBeenCalled();
    expect(cancelPending).not.toHaveBeenCalled();
    expect(pendingRequest).toBe(true);
    expect(store.getTutor("ode")).toMatchObject({
      draftMessage: "preserve this draft",
    });
    expect(store.getTutor("ode").items).toEqual([
      {
        kind: "message",
        role: "user",
        content: "Preserve this transcript",
      },
    ]);

    glossaryHost.close({ restoreFocus: false });
    expect(tutorHost.isPresentationVisible()).toBe(false);
    expect(tutorTarget.querySelector("[data-test-tutor-panel]")).toBe(
      retainedPanel
    );
    expect(activeModalDialogs()).toHaveLength(0);

    glossary.port!.requestOpen(request);
    await vi.waitFor(() =>
      expect(glossaryTarget.querySelector('[aria-modal="true"]')).not.toBeNull()
    );
    await tutorHost.open(
      tutorTarget.querySelector<HTMLElement>("[data-tutor-open]")!
    );

    expect(glossaryTarget.querySelector('[aria-modal="true"]')).toBeNull();
    expect(tutorHost.isPresentationVisible()).toBe(true);
    expect(tutorTarget.querySelector("[data-test-tutor-panel]")).toBe(
      retainedPanel
    );
    expect(mountPanel).toHaveBeenCalledOnce();
    expect(panelDispose).not.toHaveBeenCalled();
    expect(cancelPending).not.toHaveBeenCalled();
    expect(activeModalDialogs()).toHaveLength(1);

    glossaryHost.dispose();
    tutorHost.dispose();
    modalEnvironment.dispose();
  });

  it("never auto-restores a blocked Tutor after a later Glossary session closes", async () => {
    const observerCallbacks: MutationCallback[] = [];
    vi.stubGlobal(
      "MutationObserver",
      class {
        constructor(callback: MutationCallback) {
          observerCallbacks.push(callback);
        }
        observe(): void {}
        disconnect(): void {}
        takeRecords(): MutationRecord[] {
          return [];
        }
      }
    );
    const lab = document.createElement("main");
    const tutorTarget = document.createElement("aside");
    const glossaryTarget = document.createElement("aside");
    const focusSentinel = document.createElement("button");
    document.body.append(lab, tutorTarget, glossaryTarget, focusSentinel);
    const modalEnvironment = createPlatformModalEnvironment();
    const store = createAppSessionStore();
    store.updateTutor("ode", (current) =>
      updateTutorDraft(
        appendTutorMessage(current, "user", "Pending question"),
        "pending draft"
      )
    );
    let pendingRequest = true;
    const cancelPending = vi.fn(() => {
      pendingRequest = false;
    });
    const panelDispose = vi.fn();
    const panelFocus = vi.fn();
    const mountPanel = vi.fn((target: HTMLElement) => {
      const panel = document.createElement("aside");
      panel.className = "ai-tutor-panel";
      panel.dataset.testTutorPanel = "";
      target.append(panel);
      return {
        dispose: panelDispose,
        focus: panelFocus,
        cancelPending,
      };
    });
    const tutorHost = createPlatformTutorHost({
      target: tutorTarget,
      labTarget: lab,
      modalEnvironment,
      modalBackground: () => [lab, glossaryTarget],
      isMobile: () => true,
      loadPanel: async () => ({ mountPlatformTutorPanel: mountPanel }),
    });
    tutorHost.connect(tutorBinding(), store.createTutorSessionAccess("ode"));
    await tutorHost.open(
      tutorTarget.querySelector<HTMLElement>("[data-tutor-open]")!
    );
    const retainedPanel = tutorTarget.querySelector<HTMLElement>(
      "[data-test-tutor-panel]"
    )!;
    let blocker: HTMLElement | undefined;
    let suspendedForAttempt = false;
    const tutorPresentation: PlatformTutorHost = {
      ...tutorHost,
      suspendPresentationForGlossary() {
        suspendedForAttempt = true;
        const suspension = tutorHost.suspendPresentationForGlossary();
        blocker = document.createElement("section");
        blocker.setAttribute("role", "dialog");
        blocker.setAttribute("aria-modal", "true");
        document.body.append(blocker);
        return suspension;
      },
    };
    const mountSurface = vi.fn(mountGlossarySurface);
    const glossaryHost = createPlatformGlossaryHost({
      target: glossaryTarget,
      modalEnvironment,
      modalBackground: () => [lab, tutorTarget],
      tutorPresentation,
      isMobile: () => true,
      loadSurface: async () => ({ mountGlossarySurface: mountSurface }),
    });
    const glossary = controlledGlossaryBinding();
    glossaryHost.connect(glossary.binding);
    focusSentinel.focus();

    glossary.port!.requestOpen(
      glossaryRequest(glossary.binding, connectedTrigger())
    );
    await vi.waitFor(() => expect(suspendedForAttempt).toBe(true));

    expect(mountSurface).not.toHaveBeenCalled();
    expect(suspendedForAttempt).toBe(true);
    expect(glossaryTarget.childElementCount).toBe(0);
    expect(tutorHost.isPresentationVisible()).toBe(false);
    expect(tutorTarget.querySelector("[data-test-tutor-panel]")).toBe(
      retainedPanel
    );
    expect(tutorTarget.querySelector('[aria-modal="true"]')).toBeNull();
    expect(activeModalDialogs()).toHaveLength(1);
    expect(document.activeElement).toBe(focusSentinel);
    expect(panelDispose).not.toHaveBeenCalled();
    expect(cancelPending).not.toHaveBeenCalled();
    expect(pendingRequest).toBe(true);
    expect(store.getTutor("ode")).toMatchObject({
      draftMessage: "pending draft",
    });
    expect(store.getTutor("ode").items).toHaveLength(1);

    blocker?.remove();
    blocker = undefined;
    const nextRequest = glossaryRequest(
      glossary.binding,
      connectedTrigger()
    );
    glossary.port!.requestOpen(nextRequest);
    await vi.waitFor(() =>
      expect(glossaryTarget.querySelector('[aria-modal="true"]')).not.toBeNull()
    );
    expect(tutorHost.isPresentationVisible()).toBe(false);
    expect(mountSurface).toHaveBeenCalledOnce();

    glossaryHost.close({ restoreFocus: false });
    for (const callback of observerCallbacks) {
      callback([], {} as MutationObserver);
    }
    await Promise.resolve();

    expect(tutorHost.isPresentationVisible()).toBe(false);
    expect(observerCallbacks).toHaveLength(1);
    expect(tutorTarget.querySelector("[data-tutor-open]")).not.toBeNull();
    expect(tutorTarget.querySelector("[data-test-tutor-panel]")).toBe(
      retainedPanel
    );
    expect(panelDispose).not.toHaveBeenCalled();
    expect(cancelPending).not.toHaveBeenCalled();
    expect(pendingRequest).toBe(true);

    await tutorHost.open(
      tutorTarget.querySelector<HTMLElement>("[data-tutor-open]")!
    );
    expect(tutorHost.isPresentationVisible()).toBe(true);
    expect(tutorTarget.querySelector("[data-test-tutor-panel]")).toBe(
      retainedPanel
    );
    expect(mountPanel).toHaveBeenCalledOnce();
    expect(panelFocus).toHaveBeenCalledTimes(2);
    expect(activeModalDialogs()).toHaveLength(1);

    glossaryHost.dispose();
    tutorHost.dispose();
    modalEnvironment.dispose();
  });

  it("aborts an unusable post-load trigger without leaking blocked Tutor rollback", async () => {
    let resolveSurface!: (module: {
      mountGlossarySurface: typeof mountGlossarySurface;
    }) => void;
    const pendingSurface = new Promise<{
      mountGlossarySurface: typeof mountGlossarySurface;
    }>((resolve) => {
      resolveSurface = resolve;
    });
    const lab = document.createElement("main");
    const tutorTarget = document.createElement("aside");
    const glossaryTarget = document.createElement("aside");
    document.body.append(lab, tutorTarget, glossaryTarget);
    const modalEnvironment = createPlatformModalEnvironment();
    const store = createAppSessionStore();
    store.updateTutor("ode", (current) =>
      updateTutorDraft(
        appendTutorMessage(current, "user", "Keep pending"),
        "keep draft"
      )
    );
    const panelDispose = vi.fn();
    const panelFocus = vi.fn();
    const mountPanel = vi.fn((target: HTMLElement) => {
      const panel = document.createElement("aside");
      panel.className = "ai-tutor-panel";
      panel.dataset.testTutorPanel = "";
      target.append(panel);
      return {
        dispose: panelDispose,
        focus: panelFocus,
        cancelPending: vi.fn(),
      };
    });
    let glossaryHost: PlatformGlossaryHost;
    const tutorHost = createPlatformTutorHost({
      target: tutorTarget,
      labTarget: lab,
      modalEnvironment,
      modalBackground: () => [lab, glossaryTarget],
      isMobile: () => true,
      loadPanel: async () => ({ mountPlatformTutorPanel: mountPanel }),
      onBeforeManualOpen: () =>
        glossaryHost?.close({ restoreFocus: false }),
    });
    tutorHost.connect(tutorBinding(), store.createTutorSessionAccess("ode"));
    await tutorHost.open(
      tutorTarget.querySelector<HTMLElement>("[data-tutor-open]")!
    );
    const retainedPanel = tutorTarget.querySelector<HTMLElement>(
      "[data-test-tutor-panel]"
    )!;
    let restoreCalls = 0;
    const tutorPresentation: PlatformTutorHost = {
      ...tutorHost,
      suspendPresentationForGlossary() {
        const suspension = tutorHost.suspendPresentationForGlossary();
        if (!suspension) return undefined;
        return {
          restore(): void {
            restoreCalls += 1;
            suspension.restore();
          },
        };
      },
    };
    const mountSurface = vi.fn(mountGlossarySurface);
    glossaryHost = createPlatformGlossaryHost({
      target: glossaryTarget,
      modalEnvironment,
      modalBackground: () => [lab, tutorTarget],
      tutorPresentation,
      isMobile: () => true,
      loadSurface: () => pendingSurface,
    });
    const glossary = controlledGlossaryBinding();
    glossaryHost.connect(glossary.binding);
    const trigger = connectedTrigger();
    glossary.port!.requestOpen(glossaryRequest(glossary.binding, trigger));
    expect(tutorHost.isPresentationVisible()).toBe(false);

    const blocker = document.createElement("section");
    blocker.setAttribute("role", "dialog");
    blocker.setAttribute("aria-modal", "true");
    document.body.append(blocker);
    trigger.remove();
    resolveSurface({ mountGlossarySurface: mountSurface });
    await pendingSurface;
    await Promise.resolve();

    expect(mountSurface).not.toHaveBeenCalled();
    expect(restoreCalls).toBe(1);
    expect(glossaryTarget.childElementCount).toBe(0);
    expect(tutorHost.isPresentationVisible()).toBe(false);
    expect(tutorTarget.querySelector("[data-tutor-open]")).not.toBeNull();
    expect(tutorTarget.querySelector("[data-test-tutor-panel]")).toBe(
      retainedPanel
    );
    expect(panelDispose).not.toHaveBeenCalled();
    expect(store.getTutor("ode")).toMatchObject({ draftMessage: "keep draft" });
    expect(store.getTutor("ode").items).toHaveLength(1);

    blocker.remove();
    await Promise.resolve();
    expect(tutorHost.isPresentationVisible()).toBe(false);
    await tutorHost.open(
      tutorTarget.querySelector<HTMLElement>("[data-tutor-open]")!
    );
    expect(restoreCalls).toBe(1);
    expect(tutorHost.isPresentationVisible()).toBe(true);
    expect(tutorTarget.querySelector("[data-test-tutor-panel]")).toBe(
      retainedPanel
    );
    expect(mountPanel).toHaveBeenCalledOnce();
    expect(panelFocus).toHaveBeenCalledTimes(2);

    glossaryHost.dispose();
    tutorHost.dispose();
    modalEnvironment.dispose();
  });
});
