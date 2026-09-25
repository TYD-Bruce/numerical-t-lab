// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ConfirmedLabReset, LabRouteModule } from "../../app/contracts";
import { createAppSessionStore } from "../../app/appSessionStore";
import { createPlatformBootstrap } from "../../app/platformBootstrap";
import {
  appendTutorMessage,
  setTutorDesktopOpen,
  updateTutorDraft,
} from "../../tutor/moduleTutorSession";
import { createBeginnerStarterSession, getExperimentIdentity } from "./odeSession";

vi.mock("chart.js", () => {
  class ChartMock {
    static register = vi.fn();
    destroy = vi.fn();
  }
  return {
    Chart: ChartMock,
    LineController: {},
    LineElement: {},
    PointElement: {},
    LinearScale: {},
    CategoryScale: {},
    LogarithmicScale: {},
    Title: {},
    Tooltip: {},
    Legend: {},
    Filler: {},
  };
});

describe("New experiment", () => {
  beforeEach(() => document.body.replaceChildren());

  it("opens an accessible checked-by-default dialog and Cancel/Escape mutate nothing", async () => {
    const { mountOdeApp } = await import("./odeApp");
    const target = document.createElement("div");
    document.body.append(target);
    const applyConfirmedReset = vi.fn();
    const mounted = mountOdeApp({
      target,
      initialSession: createBeginnerStarterSession(),
      lifecycle: {
        updateSession: vi.fn(),
        recordMeaningfulInteraction: vi.fn(),
        applyConfirmedReset,
      },
    });
    const trigger = target.querySelector<HTMLButtonElement>("[data-new-experiment]")!;
    trigger.focus();
    trigger.click();
    const dialog = document.querySelector<HTMLElement>("[data-new-experiment-dialog]")!;
    expect(dialog.getAttribute("role")).toBe("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(target.hasAttribute("inert")).toBe(true);
    expect(
      dialog.querySelector<HTMLInputElement>("[data-clear-tutor]")?.checked
    ).toBe(true);
    expect(document.activeElement).toBe(
      dialog.querySelector("[data-reset-cancel]")
    );
    const confirm = dialog.querySelector<HTMLButtonElement>("[data-reset-confirm]")!;
    confirm.focus();
    confirm.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    expect(document.activeElement).toBe(
      dialog.querySelector("[data-clear-tutor]")
    );

    dialog.querySelector<HTMLButtonElement>("[data-reset-cancel]")!.click();
    expect(applyConfirmedReset).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(trigger);
    expect(target.hasAttribute("inert")).toBe(false);

    trigger.click();
    document
      .querySelector<HTMLElement>("[data-new-experiment-dialog]")!
      .dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(applyConfirmedReset).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(trigger);
    mounted.dispose();
  });

  it("confirms through the domain-neutral lifecycle and restores the authoritative starter", async () => {
    const { mountOdeApp } = await import("./odeApp");
    const target = document.createElement("div");
    document.body.append(target);
    let reset: ConfirmedLabReset<ReturnType<typeof createBeginnerStarterSession>> | undefined;
    const mounted = mountOdeApp({
      target,
      initialSession: {
        ...createBeginnerStarterSession(),
        step: "results",
        comparePickError: "old error",
      },
      now: () => 900,
      lifecycle: {
        updateSession: vi.fn(),
        applyConfirmedReset: (request) => {
          reset = request;
        },
      },
    });
    target.querySelector<HTMLButtonElement>("[data-new-experiment]")!.click();
    document
      .querySelector<HTMLButtonElement>("[data-reset-confirm]")!
      .click();
    await Promise.resolve();

    expect(reset).toMatchObject({ clearTutorConversation: true, at: 900 });
    expect(reset?.session).toEqual(createBeginnerStarterSession());
    expect(reset?.metadata.labMeaningful).toBe(false);
    expect(mounted.getSession()).toEqual(createBeginnerStarterSession());
    expect(getExperimentIdentity(mounted.getSession())).toBe("beginner-starter");
    expect(target.querySelector("[data-new-experiment-dialog]")).toBeNull();
    expect(document.activeElement).toBe(target.querySelector("h1"));
    mounted.dispose();
  });

  it("communicates the unchecked Tutor-preserve choice", async () => {
    const { mountOdeApp } = await import("./odeApp");
    const target = document.createElement("div");
    document.body.append(target);
    const applyConfirmedReset = vi.fn();
    const mounted = mountOdeApp({
      target,
      initialSession: createBeginnerStarterSession(),
      now: () => 950,
      lifecycle: {
        updateSession: vi.fn(),
        applyConfirmedReset,
      },
    });
    target.querySelector<HTMLButtonElement>("[data-new-experiment]")!.click();
    const checkbox = document.querySelector<HTMLInputElement>("[data-clear-tutor]")!;
    checkbox.checked = false;
    document.querySelector<HTMLButtonElement>("[data-reset-confirm]")!.click();
    expect(applyConfirmedReset).toHaveBeenCalledWith(
      expect.objectContaining({
        clearTutorConversation: false,
        at: 950,
      })
    );
    mounted.dispose();
  });

  it("atomically clears or preserves only the selected module Tutor state", () => {
    let now = 1000;
    const store = createAppSessionStore({ now: () => now });
    const starter = createBeginnerStarterSession();
    store.setLab("ode", { old: true }, {
      labMeaningful: true,
      tutorMeaningful: false,
      meaningful: true,
      lastMeaningfulInteraction: 50,
      resumeSummary: {
        moduleId: "ode",
        route: "/ode/initial-value-problems",
        labTitle: "Initial Value Problems Lab",
        stepLabel: "Output",
        methodLabel: "Old method",
        analysisLabel: "Analysis available",
        lastMeaningfulInteraction: 50,
      },
    });
    store.updateTutor("ode", (current) =>
      setTutorDesktopOpen(
        updateTutorDraft(
          appendTutorMessage(current, "user", "Keep or clear me"),
          "draft"
        ),
        true
      )
    );
    store.updateTutor("pde", (current) =>
      appendTutorMessage(current, "user", "Leave PDE alone")
    );
    store.setLab("pde", { value: "other-module" }, {
      labMeaningful: true,
      tutorMeaningful: true,
      meaningful: true,
      lastMeaningfulInteraction: 900,
      resumeSummary: {
        moduleId: "pde",
        route: "/pde",
        labTitle: "PDE Lab",
        stepLabel: "Data",
        lastMeaningfulInteraction: 900,
      },
    });
    const pdeBefore = store.getTutor("pde");
    const pdeLabBefore = store.getLab("pde");
    const pdeMetadataBefore = store.getLabMetadata("pde");
    const starterMetadata = {
      labMeaningful: false,
      tutorMeaningful: false,
      meaningful: false,
      resumeSummary: {
        moduleId: "ode" as const,
        route: "/ode/initial-value-problems",
        labTitle: "Initial Value Problems Lab",
        stepLabel: "Method" as const,
        methodLabel: "Forward Euler",
        lastMeaningfulInteraction: 0,
      },
    };
    const notifications = vi.fn();
    store.subscribe(notifications);

    now = 1100;
    store.resetLabForNewExperiment("ode", starter, starterMetadata, {
      clearTutorConversation: false,
      at: now,
      routeId: "ode-initial-value-problems",
    });
    expect(notifications).toHaveBeenCalledTimes(1);
    expect(store.getRouteSession("ode-initial-value-problems")).toEqual({
      scrollPosition: 0,
    });
    expect(store.getTutor("ode")).toMatchObject({
      draftMessage: "draft",
      desktopOpen: true,
    });
    expect(store.getTutor("ode").items.at(-1)).toMatchObject({
      kind: "divider",
      title: "New experiment started",
      body:
        "Earlier messages refer to the previous experiment. New answers use the current experiment.",
    });
    expect(store.getLabMetadata("ode")).toMatchObject({
      labMeaningful: false,
      tutorMeaningful: true,
      meaningful: true,
      lastMeaningfulInteraction: 1100,
      resumeSummary: {
        stepLabel: "Method",
        methodLabel: "Forward Euler",
      },
    });
    expect(store.getLabMetadata("ode")?.resumeSummary).not.toHaveProperty(
      "analysisLabel"
    );
    expect(store.getTutor("pde")).toBe(pdeBefore);
    expect(store.getLab("pde")).toBe(pdeLabBefore);
    expect(store.getLabMetadata("pde")).toBe(pdeMetadataBefore);

    store.resetLabForNewExperiment("ode", starter, starterMetadata, {
      clearTutorConversation: true,
      at: 1200,
    });
    expect(notifications).toHaveBeenCalledTimes(2);
    expect(store.getTutor("ode")).toEqual({
      revision: 3,
      items: [],
      draftMessage: "",
      desktopOpen: true,
    });
    expect(store.getLabMetadata("ode")).toEqual({
      labMeaningful: false,
      tutorMeaningful: false,
      meaningful: false,
    });
    expect(
      store.getResumeSummaries().some((item) => item.moduleId === "ode")
    ).toBe(false);
    expect(store.hasMeaningfulWork()).toBe(true);
    expect(store.getTutor("pde")).toBe(pdeBefore);
    expect(store.getLab("pde")).toBe(pdeLabBefore);
    expect(store.getLabMetadata("pde")).toBe(pdeMetadataBefore);
  });

  it("a preserved divider without a user message remains non-meaningful", () => {
    const store = createAppSessionStore();
    const starter = createBeginnerStarterSession();
    store.resetLabForNewExperiment("ode", starter, {
      labMeaningful: false,
      tutorMeaningful: false,
      meaningful: false,
      resumeSummary: {
        moduleId: "ode",
        route: "/ode/initial-value-problems",
        labTitle: "Initial Value Problems Lab",
        stepLabel: "Method",
        lastMeaningfulInteraction: 0,
      },
    }, {
      clearTutorConversation: false,
      at: 500,
    });
    expect(store.getTutor("ode").items).toHaveLength(1);
    expect(store.getLabMetadata("ode")).toEqual({
      labMeaningful: false,
      tutorMeaningful: false,
      meaningful: false,
    });
    expect(store.getResumeSummaries()).toEqual([]);
  });

  it("resets the mounted public Lab, meaningful state, and all three scroll layers", async () => {
    Object.defineProperty(document, "scrollingElement", {
      configurable: true,
      value: document.documentElement,
    });
    history.replaceState(
      {
        outside: "keep",
        numericalAnalysisLab: {
          entryId: "reset-entry",
          scrollY: 0,
          future: "keep-too",
        },
      },
      "",
      "/ode/initial-value-problems?mode=test#lab"
    );
    const target = document.createElement("div");
    document.body.append(target);
    const app = createPlatformBootstrap({
      target,
      initialValueProblemsLoader: async () =>
        (await import("./initialValueProblemsRoute")) as unknown as LabRouteModule<unknown>,
    });
    await vi.waitFor(() =>
      expect(app.shell.outlet.querySelector("[data-new-experiment]")).not.toBeNull()
    );
    const rk4 = [...app.shell.outlet.querySelectorAll<HTMLButtonElement>(
      ".grid-methods .card"
    )].find((button) => button.textContent?.includes("Runge-Kutta 4"))!;
    rk4.click();
    await vi.waitFor(() =>
      expect(app.store.getLabMetadata("ode")?.labMeaningful).toBe(true)
    );
    document.documentElement.scrollTop = 880;
    window.dispatchEvent(new Event("scroll"));
    expect(app.store.getRouteSession("ode-initial-value-problems")?.scrollPosition)
      .toBe(880);

    app.shell.outlet
      .querySelector<HTMLButtonElement>("[data-new-experiment]")!
      .click();
    document
      .querySelector<HTMLButtonElement>("[data-reset-confirm]")!
      .click();
    await vi.waitFor(() =>
      expect(app.store.getLab("ode")).toEqual(createBeginnerStarterSession())
    );

    expect(app.store.getLabMetadata("ode")).toEqual({
      labMeaningful: false,
      tutorMeaningful: false,
      meaningful: false,
    });
    expect(app.store.getResumeSummaries()).toEqual([]);
    expect(app.store.hasMeaningfulWork()).toBe(false);
    expect(document.documentElement.scrollTop).toBe(0);
    expect(
      app.store.getRouteSession("ode-initial-value-problems")?.scrollPosition
    ).toBe(0);
    expect(history.state).toMatchObject({
      outside: "keep",
      numericalAnalysisLab: {
        entryId: "reset-entry",
        scrollY: 0,
        future: "keep-too",
      },
    });
    expect(location.pathname + location.search + location.hash).toBe(
      "/ode/initial-value-problems?mode=test#lab"
    );
    expect(app.shell.outlet.textContent).toContain("Beginner starter");
    app.dispose();
  });
});
