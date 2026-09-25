// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendTutorMessage,
  appendNewExperimentDivider,
  clearTutorConversation,
  createEmptyModuleTutorSession,
  hasUserTutorMessage,
  setTutorDesktopOpen,
  updateTutorDraft,
} from "../tutor/moduleTutorSession";
import { assertPureValue, createAppSessionStore } from "./appSessionStore";
import type { LabSessionMetadata, ResumeSummary } from "./contracts";

const metadata = (meaningful = false): LabSessionMetadata => ({
  labMeaningful: meaningful,
  tutorMeaningful: false,
  meaningful,
});

function summary(
  moduleId: ResumeSummary["moduleId"],
  lastMeaningfulInteraction: number
): ResumeSummary {
  return {
    moduleId,
    route: moduleId === "ode" ? "/ode/initial-value-problems" : `/${moduleId}`,
    labTitle: `${moduleId} Lab`,
    stepLabel: "Data",
    lastMeaningfulInteraction,
  };
}

describe("AppSessionStore", () => {
  it("starts with no Lab sessions and isolated empty Tutor sessions", () => {
    const first = createAppSessionStore();
    const second = createAppSessionStore();

    expect(first.getLab("ode")).toBeUndefined();
    expect(first.getLabMetadata("ode")).toBeUndefined();
    expect(first.getTutor("ode")).toEqual({
      revision: 0,
      items: [],
      draftMessage: "",
      desktopOpen: false,
    });
    expect(first.getTutor("ode")).not.toBe(first.getTutor("linear_algebra"));
    expect(first.getTutor("ode")).not.toBe(second.getTutor("ode"));
    expect(Object.isFrozen(first.getTutor("ode"))).toBe(true);
    expect(Object.isFrozen(first.getTutor("ode").items)).toBe(true);
  });

  it("stores frozen pure Lab values without cloning them on reads", () => {
    const store = createAppSessionStore();
    const session = { version: 1, points: [{ t: 0, y: 1 }] };
    store.setLab("ode", session, metadata());

    const firstRead = store.getLab<typeof session>("ode")!;
    const secondRead = store.getLab<typeof session>("ode")!;
    expect(firstRead).toBe(secondRead);
    expect(Object.isFrozen(firstRead)).toBe(true);
    expect(Object.isFrozen(firstRead.points)).toBe(true);
    expect(Object.isFrozen(firstRead.points[0])).toBe(true);
    expect(() => firstRead.points.push({ t: 1, y: 0 })).toThrow();
  });

  it("updates one Tutor session without affecting another and exposes live access", () => {
    const store = createAppSessionStore();
    const access = store.createTutorSessionAccess("ode");
    access.updateSession((current) => appendTutorMessage(current, "user", "Why?"));

    expect(access.moduleId).toBe("ode");
    expect(access.getSession().items).toEqual([
      { kind: "message", role: "user", content: "Why?" },
    ]);
    expect(store.getTutor("linear_algebra").items).toEqual([]);

    store.updateTutor("ode", (current) => updateTutorDraft(current, "Next question"));
    expect(access.getSession().draftMessage).toBe("Next question");
  });

  it("keeps Lab, Tutor, and route metadata independent", () => {
    const store = createAppSessionStore();
    store.setLab("ode", { run: 1 }, metadata(true));
    store.updateTutor("ode", (current) => appendTutorMessage(current, "user", "Keep me"));
    store.updateRouteSession("ode-initial-value-problems", { scrollPosition: 420 });

    store.resetLab("ode", { run: 0 }, metadata(false));

    expect(store.getLab<{ run: number }>("ode")).toEqual({ run: 0 });
    expect(store.getTutor("ode").items).toHaveLength(1);
    expect(store.getRouteSession("ode-initial-value-problems")).toEqual({
      scrollPosition: 420,
    });
  });

  it("notifies only for actual replacements and supports idempotent unsubscribe", () => {
    const store = createAppSessionStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.updateTutor("ode", (current) => current);
    expect(listener).not.toHaveBeenCalled();
    store.updateRouteSession("about", { scrollPosition: 12 });
    expect(listener).toHaveBeenCalledTimes(1);
    store.updateRouteSession("about", { scrollPosition: 12 });
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    unsubscribe();
    store.setLab("ode", { value: 1 }, metadata());
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("reports maintained meaningful work and sorted safe Resume summaries", () => {
    const store = createAppSessionStore();
    store.setLab("ode", { value: 1 }, {
      labMeaningful: true,
      tutorMeaningful: false,
      meaningful: true,
      resumeSummary: summary("ode", 100),
      lastMeaningfulInteraction: 100,
    });
    store.setLab("linear_algebra", { value: 2 }, {
      labMeaningful: true,
      tutorMeaningful: false,
      meaningful: true,
      resumeSummary: summary("linear_algebra", 300),
      lastMeaningfulInteraction: 300,
    });
    store.setLab("pde", { value: 3 }, {
      labMeaningful: false,
      tutorMeaningful: false,
      meaningful: false,
      resumeSummary: summary("pde", 500),
      lastMeaningfulInteraction: 500,
    });

    expect(store.hasMeaningfulWork()).toBe(true);
    expect(store.getResumeSummaries().map((item) => item.moduleId)).toEqual([
      "linear_algebra",
      "ode",
    ]);
    expect(store.getResumeSummaries(1)).toHaveLength(1);

    const tutorOnly = createAppSessionStore();
    tutorOnly.updateTutor("pde", (current) =>
      appendTutorMessage(current, "assistant", "Welcome")
    );
    expect(tutorOnly.hasMeaningfulWork()).toBe(false);
    tutorOnly.updateTutor("pde", (current) =>
      appendTutorMessage(current, "user", "My question")
    );
    expect(tutorOnly.hasMeaningfulWork()).toBe(true);
  });
});

describe("pure-value structural guard", () => {
  it("accepts primitives, frozen records, expression-like AST values, and numerical arrays", () => {
    const value = Object.freeze({
      version: 1,
      enabled: true,
      name: "pure",
      optional: undefined,
      ast: { kind: "negate", operand: { kind: "variable", name: "y" } },
      points: Object.freeze([{ t: 0, y: 1 }, { t: 0.2, y: 0.8 }]),
    });
    expect(() => assertPureValue(value)).not.toThrow();
  });

  it.each([
    ["function", () => undefined],
    ["DOM node", document.createElement("div")],
    ["EventTarget", new EventTarget()],
    ["AbortController", new AbortController()],
    ["AbortSignal", new AbortController().signal],
    ["mounted route", { dispose() {} }],
    ["Chart-like object", { canvas: document.createElement("canvas"), destroy() {} }],
    ["Error", new Error("runtime")],
  ])("rejects %s runtime values", (_label, value) => {
    expect(() => assertPureValue(value)).toThrow(/pure value/i);
  });

  it("rejects cycles and unapproved class instances", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    class RuntimeModel {
      value = 1;
    }
    expect(() => assertPureValue(cyclic)).toThrow(/cyclic/i);
    expect(() => assertPureValue(new RuntimeModel())).toThrow(/plain object/i);
  });
});

describe("Module Tutor session operations", () => {
  it("creates and immutably updates transcript, draft, and desktop preference", () => {
    const empty = createEmptyModuleTutorSession();
    const user = appendTutorMessage(empty, "user", "Explain Euler");
    const assistant = appendTutorMessage(user, "assistant", "Euler advances one step.");
    const drafted = updateTutorDraft(assistant, "What about error?");
    const opened = setTutorDesktopOpen(drafted, true);

    expect(empty.items).toEqual([]);
    expect(opened.items).toHaveLength(2);
    expect(opened.draftMessage).toBe("What about error?");
    expect(opened.desktopOpen).toBe(true);
    expect(hasUserTutorMessage(opened)).toBe(true);
    expect(Object.isFrozen(opened.items)).toBe(true);
  });

  it("clears conversation while preserving desktop preference and appends typed dividers", () => {
    const opened = setTutorDesktopOpen(
      appendTutorMessage(createEmptyModuleTutorSession(), "user", "Old question"),
      true
    );
    const cleared = clearTutorConversation(updateTutorDraft(opened, "draft"));
    expect(cleared).toEqual({ revision: 2, items: [], draftMessage: "", desktopOpen: true });

    const divided = appendNewExperimentDivider(cleared, {
      id: "experiment-2",
      body: "Earlier messages refer to the previous experiment.",
    });
    expect(divided.items).toEqual([
      {
        kind: "divider",
        id: "experiment-2",
        title: "New experiment started",
        body: "Earlier messages refer to the previous experiment.",
      },
    ]);
    expect(hasUserTutorMessage(divided)).toBe(false);
  });
});

describe("platform store runtime boundary", () => {
  it("does not import ODE, solver, preset, Tutor UI, math, or chart runtime code", () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(directory, "appSessionStore.ts"), "utf8");
    for (const forbidden of [
      "../labs/ode/",
      "../solvers",
      "../problemPresets",
      "../convergence",
      "../aiTutor",
      "../math/",
      "chart.js",
      "mathlive",
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });
});
