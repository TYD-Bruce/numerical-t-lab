// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LabRouteModule } from "../../app/contracts";
import { assertPureValue, createAppSessionStore } from "../../app/appSessionStore";
import { createCompleteLabRoute } from "../../app/labRouteAdapter";
import type { PlatformGlossaryHost } from "../../app/platformGlossaryHost";
import type { PlatformTutorHost } from "../../app/platformTutorHost";
import { createScrollRestoration } from "../../app/scrollRestoration";
import { createHomePage } from "../../pages/homePage";
import * as linearSystemsRoute from "./linearSystemsRoute";

function tutorHost(): PlatformTutorHost {
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

function glossaryHost(): PlatformGlossaryHost {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    close: vi.fn(),
    dispose: vi.fn(),
  };
}

function routeWithStore() {
  const store = createAppSessionStore({ now: () => 700 });
  const tutor = tutorHost();
  const glossary = glossaryHost();
  const route = createCompleteLabRoute({
    moduleId: "linear_algebra",
    routeId: "linear-algebra-linear-systems",
    labModule: linearSystemsRoute as LabRouteModule<unknown>,
    store,
    tutorHost: tutor,
    glossaryHost: glossary,
    scrollRestoration: createScrollRestoration({ store }),
  });
  return { route, store, tutor, glossary };
}

describe("Linear Systems route and complete-Lab lifecycle", () => {
  beforeEach(() => document.body.replaceChildren());

  it("mounts the direct route with its Tutor binding and no Glossary binding", () => {
    const target = document.createElement("main");
    document.body.append(target);
    const mounted = linearSystemsRoute.mount({
      target,
      session: linearSystemsRoute.createBeginnerStarterSession(),
      navigate: vi.fn(),
    });
    expect(target.querySelector("[data-lab-shell]")).not.toBeNull();
    expect(target.querySelectorAll("h1")).toHaveLength(1);
    expect(target.querySelector("h1")?.textContent).toBe("Linear Systems Lab");
    expect(
      target.querySelector("[data-lab-breadcrumb] a")?.getAttribute("href")
    ).toBe(
      "/linear-algebra"
    );
    expect(mounted.getTutorBinding()).toMatchObject({ moduleId: "linear_algebra", promptProfile: "linear_algebra" });
    expect(mounted.getTutorBinding().getContext().status).toBe("unavailable");
    expect("getGlossaryBinding" in mounted).toBe(false);
    expect(() => assertPureValue(mounted.getSession())).not.toThrow();
    mounted.dispose();
  });

  it("captures pure state, restores it on remount, keeps module sessions isolated, and exposes safe Resume", () => {
    const { route, store, tutor, glossary } = routeWithStore();
    store.setLab("ode", { untouched: true }, {
      labMeaningful: true,
      tutorMeaningful: false,
      meaningful: true,
      resumeSummary: {
        moduleId: "ode",
        route: "/ode/initial-value-problems",
        labTitle: "Initial Value Problems Lab",
        stepLabel: "Data",
        lastMeaningfulInteraction: 1,
      },
      lastMeaningfulInteraction: 1,
    });
    const target = document.createElement("main");
    document.body.append(target);
    const first = route.mount({
      target,
      navigate: vi.fn(),
      location: {
        pathname: "/linear-algebra/linear-systems",
        search: "",
        hash: "",
      },
    });
    target.querySelector<HTMLButtonElement>("[data-workflow-step='data']")!.click();
    const field = target.querySelector<HTMLInputElement>(
      "[data-matrix-a-row='0'][data-matrix-a-column='0']"
    )!;
    field.value = "3.5";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    first.dispose();

    const captured = store.getLab<ReturnType<typeof linearSystemsRoute.createBeginnerStarterSession>>(
      "linear_algebra"
    )!;
    expect(captured.ADraft[0]?.[0]).toBe("3.5");
    expect(() => assertPureValue(captured)).not.toThrow();
    expect(store.getLab("ode")).toEqual({ untouched: true });
    expect(tutor.connect).toHaveBeenCalledWith(expect.objectContaining({ moduleId: "linear_algebra" }), expect.any(Object));
    expect(tutor.disconnect).toHaveBeenCalled();
    expect(glossary.connect).not.toHaveBeenCalled();

    const second = route.mount({
      target,
      navigate: vi.fn(),
      location: {
        pathname: "/linear-algebra/linear-systems",
        search: "",
        hash: "",
      },
    });
    expect(
      target.querySelector<HTMLInputElement>(
        "[data-matrix-a-row='0'][data-matrix-a-column='0']"
      )?.value
    ).toBe("3.5");
    second.dispose();

    const summaries = store.getResumeSummaries();
    const linear = summaries.find((summary) => summary.moduleId === "linear_algebra")!;
    expect(linear).toMatchObject({
      route: "/linear-algebra/linear-systems",
      labTitle: "Linear Systems Lab",
      stepLabel: "Data",
      methodLabel: "Gaussian elimination with partial pivoting",
    });
    expect(JSON.stringify(linear)).not.toMatch(/3\.5|ADraft|bDraft|xHat|residual|trace/);

    const homeTarget = document.createElement("main");
    const home = createHomePage(store).mount({
      target: homeTarget,
      navigate: vi.fn(),
      location: { pathname: "/", search: "", hash: "" },
    });
    const card = homeTarget.querySelector<HTMLElement>(
      "[data-resume-module='linear_algebra']"
    )!;
    expect(card.textContent).toContain("Data · Gaussian elimination with partial pivoting");
    expect(card.querySelector("a")?.getAttribute("href")).toBe(
      "/linear-algebra/linear-systems"
    );
    expect(card.querySelector("a")?.dataset.prefetchRouteId).toBe(
      "linear-algebra-linear-systems"
    );
    home.dispose();
  });

  it("applies New experiment through Store and clears the Linear Systems Resume candidate", () => {
    const { route, store } = routeWithStore();
    const target = document.createElement("main");
    document.body.append(target);
    const mounted = route.mount({
      target,
      navigate: vi.fn(),
      location: {
        pathname: "/linear-algebra/linear-systems",
        search: "",
        hash: "",
      },
    });
    target.querySelector<HTMLButtonElement>("[data-workflow-step='data']")!.click();
    target.querySelector<HTMLButtonElement>("[data-run-linear-system]")!.click();
    expect(store.getLabMetadata("linear_algebra")?.meaningful).toBe(true);

    target.querySelector<HTMLButtonElement>("[data-new-experiment]")!.click();
    document.querySelector<HTMLButtonElement>("[data-reset-confirm]")!.click();
    expect(store.getLab("linear_algebra")).toEqual(
      linearSystemsRoute.createBeginnerStarterSession()
    );
    expect(store.getLabMetadata("linear_algebra")).toEqual({
      labMeaningful: false,
      tutorMeaningful: false,
      meaningful: false,
    });
    expect(
      store.getResumeSummaries().some((summary) => summary.moduleId === "linear_algebra")
    ).toBe(false);
    expect(
      store.getRouteSession("linear-algebra-linear-systems")?.scrollPosition
    ).toBe(0);
    mounted.dispose();
  });
});
