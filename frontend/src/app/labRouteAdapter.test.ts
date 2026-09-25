// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import type {
  LabLifecycleCallbacks,
  LabRouteModule,
  LabSessionMetadata,
  LabTutorBinding,
  ResumeSummary,
} from "./contracts";
import { createAppSessionStore } from "./appSessionStore";
import { createCompleteLabRoute } from "./labRouteAdapter";
import type { PlatformTutorHost } from "./platformTutorHost";
import type { PlatformGlossaryHost } from "./platformGlossaryHost";
import type { LabGlossaryBinding } from "../glossary/glossaryController";
import {
  createScrollRestoration,
  type ScrollRestoration,
} from "./scrollRestoration";

const binding: LabTutorBinding = {
  moduleId: "ode",
  promptProfile: "ode",
  suggestedQuestions: [],
  description: "Fixture Tutor",
  getContext: () => ({ status: "unavailable", revision: 0, message: "Run a method first." }),
};

function summary(timestamp = 0): ResumeSummary {
  return {
    moduleId: "ode",
    route: "/ode/initial-value-problems",
    labTitle: "Initial Value Problems Lab",
    stepLabel: "Data",
    lastMeaningfulInteraction: timestamp,
  };
}

function metadata(labMeaningful: boolean): LabSessionMetadata {
  return {
    labMeaningful,
    tutorMeaningful: false,
    meaningful: labMeaningful,
    resumeSummary: summary(),
  };
}

function host(): PlatformTutorHost {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    open: vi.fn(async () => undefined),
    close: vi.fn(),
    closeMobileForNavigation: vi.fn(),
    suspendPresentationForGlossary: vi.fn(),
    isPresentationVisible: vi.fn(() => false),
    invalidateCurrentRequest: vi.fn(),
    refresh: vi.fn(),
    dispose: vi.fn(),
  };
}

function glossaryHost(events: string[] = []): PlatformGlossaryHost {
  return {
    connect: vi.fn(() => events.push("glossary-connect")),
    disconnect: vi.fn(() => events.push("glossary-disconnect")),
    close: vi.fn(() => events.push("glossary-close")),
    dispose: vi.fn(() => events.push("glossary-dispose")),
  };
}

describe("complete Lab meaningful metadata", () => {
  it("supports a complete Lab with no Tutor or Glossary binding", () => {
    const tutor = host();
    const glossary = glossaryHost();
    const module: LabRouteModule<{ value: string }> = {
      createBeginnerStarterSession: () => ({ value: "starter" }),
      mount() {
        return {
          getSession: () => ({ value: "starter" }),
          getResumeSummary: () => undefined,
          dispose: vi.fn(),
        };
      },
    };
    const route = createCompleteLabRoute({
      moduleId: "linear_algebra",
      routeId: "linear-algebra-linear-systems",
      labModule: module,
      store: createAppSessionStore(),
      tutorHost: tutor,
      glossaryHost: glossary,
      scrollRestoration: createScrollRestoration({}),
    });
    const mounted = route.mount({
      target: document.createElement("div"),
      navigate: vi.fn(),
      location: {
        pathname: "/linear-algebra/linear-systems",
        search: "",
        hash: "",
      },
    });
    expect(tutor.connect).not.toHaveBeenCalled();
    expect(tutor.disconnect).toHaveBeenCalledOnce();
    expect(glossary.connect).not.toHaveBeenCalled();
    mounted.dispose();
  });

  it("maintains activity through core updates without reordering on presentation, remount, or disposal", () => {
    let lifecycle: LabLifecycleCallbacks<{ value: string }> | undefined;
    let current = { value: "starter" };
    const module: LabRouteModule<{ value: string }> = {
      createBeginnerStarterSession: () => current,
      mount(options) {
        lifecycle = options.lifecycle;
        current = options.session;
        options.lifecycle?.updateSession(current, metadata(false));
        return {
          getSession: () => current,
          getResumeSummary: () => summary(),
          getTutorBinding: () => binding,
          dispose: vi.fn(),
        };
      },
    };
    const store = createAppSessionStore();
    const route = createCompleteLabRoute({
      moduleId: "ode",
      labModule: module,
      store,
      tutorHost: host(),
      glossaryHost: glossaryHost(),
      routeId: "ode-initial-value-problems",
      scrollRestoration: createScrollRestoration({ store }),
    });
    const target = document.createElement("div");
    const mounted = route.mount({
      target,
      navigate: vi.fn(),
      location: {
        pathname: "/ode/initial-value-problems",
        search: "",
        hash: "",
      },
    });

    current = { value: "edited" };
    lifecycle?.recordMeaningfulInteraction?.(125);
    lifecycle?.updateSession(current, metadata(true));
    expect(store.getLabMetadata("ode")?.lastMeaningfulInteraction).toBe(125);
    expect(store.getResumeSummaries()[0]?.lastMeaningfulInteraction).toBe(125);

    lifecycle?.updateSession(current, metadata(true));
    expect(store.getLabMetadata("ode")?.lastMeaningfulInteraction).toBe(125);
    mounted.dispose();
    expect(store.getLabMetadata("ode")?.lastMeaningfulInteraction).toBe(125);
  });

  it("invalidates Tutor work and applies Store plus triple-scroll reset atomically", () => {
    let lifecycle: LabLifecycleCallbacks<{ value: string }> | undefined;
    const module: LabRouteModule<{ value: string }> = {
      createBeginnerStarterSession: () => ({ value: "starter" }),
      mount(options) {
        lifecycle = options.lifecycle;
        return {
          getSession: () => ({ value: "starter" }),
          getResumeSummary: () => summary(),
          getTutorBinding: () => binding,
          dispose: vi.fn(),
        };
      },
    };
    const store = createAppSessionStore();
    const tutorHost = host();
    const resetScroll = vi.fn();
    const scrollRestoration: ScrollRestoration = {
      start: vi.fn(),
      setCurrentRoute: vi.fn(),
      captureCurrentRoute: vi.fn(() => 0),
      createPushedState: vi.fn(() => ({})),
      resolveRestoration: vi.fn(() => 0),
      scheduleRestoration: vi.fn(),
      resetCurrentRoute: resetScroll,
      dispose: vi.fn(),
    };
    const route = createCompleteLabRoute({
      moduleId: "ode",
      routeId: "ode-initial-value-problems",
      labModule: module,
      store,
      tutorHost,
      glossaryHost: glossaryHost(),
      scrollRestoration,
    });
    const mounted = route.mount({
      target: document.createElement("div"),
      navigate: vi.fn(),
      location: {
        pathname: "/ode/initial-value-problems",
        search: "",
        hash: "",
      },
    });

    lifecycle?.applyConfirmedReset?.({
      session: { value: "fresh" },
      metadata: {
        labMeaningful: false,
        tutorMeaningful: false,
        meaningful: false,
        resumeSummary: {
          ...summary(),
          stepLabel: "Method",
        },
      },
      clearTutorConversation: true,
      at: 400,
    });

    expect(tutorHost.invalidateCurrentRequest).toHaveBeenCalledOnce();
    expect(resetScroll).toHaveBeenCalledWith("ode-initial-value-problems");
    expect(tutorHost.refresh).toHaveBeenCalledOnce();
    expect(store.getLab("ode")).toEqual({ value: "fresh" });
    expect(store.getLabMetadata("ode")?.meaningful).toBe(false);
    mounted.dispose();
  });

  it("connects an optional Glossary binding and closes it before session capture and Lab disposal", () => {
    const events: string[] = [];
    const glossaryBinding = {
      moduleId: "ode",
      identity: Object.freeze({ moduleId: "ode" }),
      connect: vi.fn(),
      createScope: vi.fn(),
      beginScopeRerender: vi.fn(),
      dispose: vi.fn(),
    } as unknown as LabGlossaryBinding;
    const module: LabRouteModule<{ value: string }> = {
      createBeginnerStarterSession: () => ({ value: "starter" }),
      mount() {
        return {
          getSession: () => {
            events.push("session-capture");
            return { value: "starter" };
          },
          getResumeSummary: () => summary(),
          getTutorBinding: () => binding,
          getGlossaryBinding: () => glossaryBinding,
          dispose: () => events.push("lab-dispose"),
        };
      },
    };
    const route = createCompleteLabRoute({
      moduleId: "ode",
      routeId: "ode-initial-value-problems",
      labModule: module,
      store: createAppSessionStore(),
      tutorHost: host(),
      glossaryHost: glossaryHost(events),
      scrollRestoration: createScrollRestoration({}),
    });
    const mounted = route.mount({
      target: document.createElement("div"),
      navigate: vi.fn(),
      location: {
        pathname: "/ode/initial-value-problems",
        search: "",
        hash: "",
      },
    });

    expect(events).toContain("glossary-connect");
    mounted.dispose();

    expect(events.indexOf("glossary-close")).toBeLessThan(
      events.indexOf("session-capture")
    );
    expect(events.indexOf("glossary-disconnect")).toBeLessThan(
      events.indexOf("lab-dispose")
    );
    expect(glossaryBinding.dispose).not.toHaveBeenCalled();
  });
});
