// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { assertPureValue, createAppSessionStore } from "../../app/appSessionStore";
import { createPlatformTutorHost } from "../../app/platformTutorHost";
import { validateFixedStepGrid } from "@numerical-t-lab/numerics/ode/grid";
import type { SolverResult } from "@numerical-t-lab/numerics/ode/solvers";
import type { EditableMathFieldHandle } from "../../math/ui/editableMathField";
import { createSuccessfulExpressionSnapshot } from "./problemExpressions";
import { updatePresetProblemFields } from "./problemPresets";
import {
  appendTutorMessage,
  clearTutorConversation,
  setTutorDesktopOpen,
} from "../../tutor/moduleTutorSession";
import { createReadonlySolverResult, createBeginnerStarterSession } from "./odeSession";
import {
  createConvergenceUiState,
  createSuccessfulFirstOrderRunSnapshot,
  setConvergenceDrawerOpen,
  setConvergenceMetric,
  setConvergenceState,
  setTeachingAccordion,
} from "./convergenceStudyState";
import { methodMathContent } from "../../math/ui/methodMathContent";
import { METHOD_CATALOG } from "@numerical-t-lab/numerics/ode/method-catalog";
import { THEME_CHANGE_EVENT } from "../../app/theme";

const destroyChart = vi.fn();
const chartConfigurations: unknown[] = [];
const chartInstances: Array<{
  data: {
    datasets: Array<{
      type?: string;
      pointRadius?: number;
      data?: unknown;
      borderColor?: string;
    }>;
  };
  options: {
    scales?: {
      x?: {
        min?: number;
        max?: number;
      };
    };
    plugins?: {
      title?: {
        text?: string;
      };
    };
  };
  update: ReturnType<typeof vi.fn>;
}> = [];
const disposeConvergence = vi.fn();
const mountConvergence = vi.fn(
  (
    _host: HTMLElement,
    _options: {
      getState(): {
        drawerOpen: boolean;
        chartMetric: string;
        accordionOpen: Record<string, boolean>;
      };
      onIntent?(intent: { type: "metric"; metric: "max_global" }): void;
    }
  ) => ({ dispose: disposeConvergence })
);

vi.mock("chart.js", () => {
  class ChartMock {
    static register = vi.fn();
    data: (typeof chartInstances)[number]["data"];
    options: (typeof chartInstances)[number]["options"];
    update = vi.fn();
    destroy = destroyChart;
    constructor(
      _canvas: unknown,
      configuration: {
        data: (typeof chartInstances)[number]["data"];
        options: (typeof chartInstances)[number]["options"];
      }
    ) {
      this.data = configuration.data;
      this.options = configuration.options;
      chartConfigurations.push(configuration);
      chartInstances.push(this);
    }
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

vi.mock("./convergenceStudyView", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./convergenceStudyView")>()),
  mountConvergenceStudyView: mountConvergence,
}));

const RAW_RESULT: SolverResult = {
  points: [
    { t: 0, y: 1 },
    { t: 0.2, y: 0.8 },
  ],
  metadata: {
    displayName: "Forward Euler",
    family: "forward_euler",
    order: 1,
    formulaType: "one-step-explicit",
    formulaDisplay: "next = current + h f",
    isImplicit: false,
    notes: [],
  },
};

function outputSession() {
  const starter = createBeginnerStarterSession();
  const expression = createSuccessfulExpressionSnapshot(
    starter.form.current.rhs.confirmed,
    "rhs"
  );
  const firstOrderRun = createSuccessfulFirstOrderRunSnapshot({
    metadata: RAW_RESULT.metadata,
    rhs: expression.expression,
    exactSolutionEnabled: false,
    t0: 0,
    y0: 1,
    tEnd: 5,
    runStepSize: 0.2,
  });
  const convergence = setTeachingAccordion(
    setConvergenceMetric(
      setConvergenceDrawerOpen(createConvergenceUiState(firstOrderRun), true),
      "final_time"
    ),
    "warnings",
    true
  );
  return {
    ...starter,
    step: "results" as const,
    output: {
      single: {
        result: createReadonlySolverResult(RAW_RESULT),
        expression,
        firstOrderRun,
        problemInputs: {
          kind: "first_order" as const,
          equationDisplay: expression.equationDisplay,
          t0: 0,
          y0: 1,
          tEnd: 5,
          h: 0.2,
        },
      },
    },
    convergenceByFingerprint: setConvergenceState(
      {},
      firstOrderRun.runFingerprint,
      convergence
    ),
  };
}

function comparisonOutputSession() {
  const base = outputSession();
  const second = createReadonlySolverResult({
    ...RAW_RESULT,
    metadata: {
      ...RAW_RESULT.metadata,
      family: "rk4",
      displayName: "Runge-Kutta 4",
      order: 4,
    },
  });
  return {
    ...base,
    workflow: {
      mode: "compare" as const,
      a: { family: "forward_euler" as const },
      b: { family: "rk4" as const },
    },
    selectedMethod: null,
    output: {
      comparison: {
        a: { family: "forward_euler" as const },
        b: { family: "rk4" as const },
        resultA: base.output.single.result,
        resultB: second,
        expression: base.output.single.expression,
      },
    },
  };
}

function configuredSession() {
  return {
    ...createBeginnerStarterSession(),
    step: "configure" as const,
    selectedMethod: { family: "forward_euler" as const },
  };
}

function methodControl(target: ParentNode, name: string): HTMLButtonElement {
  const control = [
    ...target.querySelectorAll<HTMLButtonElement>("[data-method-family]"),
  ].find((candidate) => candidate.textContent?.includes(name));
  if (!control) throw new Error(`Missing method control: ${name}`);
  return control;
}

function editableHandle(
  dispose = vi.fn(),
  element = document.createElement("div")
): EditableMathFieldHandle {
  return {
    element,
    getState: vi.fn(),
    getMathfield: vi.fn(),
    setDraftLatex: vi.fn(),
    loadExpression: vi.fn(),
    restoreState: vi.fn(),
    restoreDraft: vi.fn(),
    validateStrict: vi.fn(),
    getIssue: vi.fn(),
    focus: vi.fn(),
    dispose,
  } as unknown as EditableMathFieldHandle;
}

describe("mounted ODE lifecycle", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    destroyChart.mockClear();
    chartConfigurations.length = 0;
    chartInstances.length = 0;
    disposeConvergence.mockClear();
    mountConvergence.mockClear();
  });

  it("uses the shared compact Lab grammar before the unchanged Method workflow", async () => {
    const { mountOdeApp } = await import("./odeApp");
    const target = document.createElement("div");
    document.body.append(target);
    const mounted = mountOdeApp({
      target,
      initialSession: createBeginnerStarterSession(),
    });

    const header = target.querySelector<HTMLElement>(".lab-header")!;
    const identity = header.querySelector<HTMLElement>(
      "[data-experiment-identity]"
    )!;
    expect(target.querySelectorAll("h1")).toHaveLength(1);
    expect(header.querySelector("[data-lab-header-eyebrow]")).toBeNull();
    expect(header.textContent).not.toContain("AI-Assisted Educational Solver");
    expect(header.textContent).not.toContain(
      "Enter the equation in familiar mathematical notation"
    );
    expect(header.textContent).not.toContain("This example is ready to run");
    expect(
      header.querySelector("[data-lab-header-lede]")?.textContent
    ).toBe(
      "Explore fixed-step methods for a first-order ordinary differential equation posed as an initial value problem, then examine error, convergence, and numerical behavior."
    );
    expect(identity.textContent).toBe("Beginner starter · Forward Euler");
    expect(identity.querySelectorAll("[data-experiment-label]")).toHaveLength(1);
    expect(identity.querySelector("[data-experiment-description]")).toBeNull();
    expect(header.querySelector("[data-lab-header-part='detail']")).toBeNull();

    const shell = target.querySelector<HTMLElement>("[data-lab-shell]")!;
    expect(
      [...shell.children].map((node) =>
        node.matches("header")
          ? "header"
          : node.matches("[data-workflow-navigation]")
            ? "workflow"
            : node.matches(".lab-stage-section")
              ? "stage"
              : "other"
      )
    ).toEqual(["header", "workflow", "stage"]);
    expect(
      [...target.querySelectorAll<HTMLElement>("[data-workflow-step]")].map(
        (step) => step.dataset.workflowStep
      )
    ).toEqual(["method", "data", "output"]);
    expect(target.querySelector("[data-stage-role='method'] h2")?.textContent).toBe(
      "Start with the initial value problem"
    );
    expect(
      [...target.querySelectorAll<HTMLElement>(".ode-method-option-name")].map(
        (name) => name.textContent
      )
    ).toEqual(METHOD_CATALOG.map((method) => method.displayName));

    const compare = target.querySelector<HTMLButtonElement>("[data-compare]")!;
    expect(compare.textContent).toBe("Compare two first-order methods");
    compare.click();
    expect(mounted.getSession().workflow).toEqual({
      mode: "compare_pick",
      first: null,
    });
    expect(
      target.querySelector("[data-lab-header-part='detail']")
    ).toBeNull();
    expect(target.querySelector("[data-compare-prompt]")?.textContent).toContain(
      "Choose the first first-order method"
    );
    methodControl(target, "Forward Euler").click();
    methodControl(target, "Forward Euler").click();
    expect(
      target.querySelector("[data-stage-role='method'] .compare-error[role='alert']")
        ?.textContent
    ).toContain("Pick a different method");
    expect(target.querySelector(".lab-header")?.textContent).not.toContain(
      "Pick a different method"
    );

    mounted.dispose();
  });

  it("places variable-profile notation help inside the described Data editor", async () => {
    const { mountOdeApp } = await import("./odeApp");
    const target = document.createElement("div");
    document.body.append(target);
    const mountEditableMathField = vi.fn(
      (
        host: HTMLElement,
        options: {
          fieldId: string;
          description?: string;
          descriptionId?: string;
        }
      ) => {
        const wrapper = document.createElement("div");
        wrapper.className = "editable-math-field";
        const field = document.createElement("input");
        field.id = options.fieldId;
        const description = document.createElement("p");
        description.id =
          options.descriptionId ?? `${options.fieldId}-description`;
        description.className = "editable-math-description";
        description.textContent = options.description ?? "";
        field.setAttribute("aria-describedby", description.id);
        wrapper.append(field, description);
        host.replaceChildren(wrapper);
        return editableHandle(vi.fn(), wrapper);
      }
    );
    const mounted = mountOdeApp({
      target,
      initialSession: configuredSession(),
      loadEditableMathField: async () => ({ mountEditableMathField }),
    });
    await vi.waitFor(() => expect(mountEditableMathField).toHaveBeenCalled());

    const header = target.querySelector<HTMLElement>(".lab-header")!;
    const help = target.querySelector<HTMLElement>(
      "[data-expression-field] #rhs-expression-description"
    )!;
    const field = target.querySelector<HTMLElement>("#rhs-expression")!;
    expect(header.textContent).not.toContain(
      "Enter the equation in familiar mathematical notation"
    );
    expect(help.textContent).toBe(
      "Enter the equation in familiar mathematical notation. First-order fields use t and y."
    );
    expect(help.closest("[data-expression-field]")).not.toBeNull();
    expect(field.getAttribute("aria-describedby")?.split(/\s+/)).toContain(
      help.id
    );

    mounted.dispose();
  });

  it("hydrates successful output and reuses immutable point ownership", async () => {
    const { mountOdeApp } = await import("./odeApp");
    const target = document.createElement("div");
    document.body.append(target);
    const initial = outputSession();
    const recordMeaningfulInteraction = vi.fn();
    const mounted = mountOdeApp({
      target,
      initialSession: initial,
      lifecycle: {
        updateSession: vi.fn(),
        recordMeaningfulInteraction,
      },
      now: () => 900,
    });
    await Promise.resolve();

    expect(target.textContent).toContain("Forward Euler · results");
    expect(target.textContent).toContain("Grid points stored");
    expect(target.textContent).toContain("Final numerical approximation");
    expect(target.textContent).toContain("Theoretical order p");
    expect(target.textContent).not.toContain("Steps taken");
    expect(target.textContent).not.toContain("Order of accuracy p");
    const primaryResult = target.querySelector<HTMLElement>(
      "[data-primary-result]"
    )!;
    const problemContext = target.querySelector<HTMLElement>(
      "[data-problem-context]"
    )!;
    const answer = primaryResult.querySelector<HTMLElement>(
      "[data-primary-answer]"
    )!;
    const answerLabel = answer.querySelector<HTMLElement>(
      ".lab-primary-result-answer-label"
    )!;
    const answerValue = answer.querySelector<HTMLElement>(
      ".ode-primary-numeric-value"
    )!;
    const supportingMetrics = primaryResult.querySelector<HTMLElement>(
      "[data-primary-result-metrics]"
    )!;
    expect(target.querySelectorAll("[data-primary-result]")).toHaveLength(1);
    expect(target.querySelectorAll("[data-problem-context]")).toHaveLength(1);
    expect(primaryResult.contains(problemContext)).toBe(true);
    expect(
      [...primaryResult.children].indexOf(problemContext)
    ).toBeLessThan(
      [...primaryResult.children].indexOf(
        primaryResult.querySelector("[data-primary-result-answers]")!
      )
    );
    expect(answerLabel.textContent).toBe("Final numerical approximation");
    expect(answerValue.textContent).toBe("0.80000000");
    expect(supportingMetrics.contains(answerValue)).toBe(false);
    expect(
      supportingMetrics.querySelector(".ode-primary-numeric-value")
    ).toBeNull();
    expect(problemContext.textContent).toContain("0.2");
    expect(problemContext.querySelectorAll('[role="math"]')).toHaveLength(1);
    expect(
      target.querySelectorAll("[data-evidence-block]").length
    ).toBeGreaterThanOrEqual(3);
    expect(
      target.querySelector("[data-evidence-chart] canvas#plot")
    ).not.toBeNull();
    expect(
      target.querySelector("[data-numerical-table-containment='local'] caption")
        ?.textContent
    ).toBe("Last 12 values");
    expect(
      target.querySelector("[data-primary-result] h2")?.textContent
    ).toBe("Forward Euler · results");
    expect(chartConfigurations).toHaveLength(1);
    expect(chartConfigurations[0]).toMatchObject({
      data: {
        labels: ["0.000", "0.200"],
        datasets: [{ label: "y(t)", data: [1, 0.8] }],
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: "Numerical approximation vs time",
          },
        },
        scales: {
          x: { title: { display: true, text: "t" } },
          y: { title: { display: true, text: "y" } },
        },
      },
    });
    expect(mountConvergence).toHaveBeenCalledTimes(1);
    expect(mountConvergence.mock.calls[0]?.[1].getState().drawerOpen).toBe(true);
    expect(mountConvergence.mock.calls[0]?.[1].getState().chartMetric).toBe(
      "final_time"
    );
    expect(
      mountConvergence.mock.calls[0]?.[1].getState().accordionOpen.warnings
    ).toBe(true);
    expect(mounted.getSession().output.single?.result.points).toBe(
      initial.output.single.result.points
    );
    expect(mounted.getSession().output.single?.result.points).toBe(
      mounted.getSession().output.single?.result.points
    );
    mountConvergence.mock.calls[0]?.[1].onIntent?.({
      type: "metric",
      metric: "max_global",
    });
    expect(recordMeaningfulInteraction).not.toHaveBeenCalled();
    expect(mounted.getTutorBinding().getContext()).toMatchObject({
      status: "ready", context: { result: { finalT: 0.2, finalY: 0.8 } },
    });
    mounted.dispose();
    mounted.dispose();
    expect(target.childElementCount).toBe(0);
    expect(destroyChart).toHaveBeenCalledTimes(1);
    expect(disposeConvergence).toHaveBeenCalledTimes(1);
  });

  it("keeps successful Output available while browsing Method through the shared workflow", async () => {
    const { mountOdeApp } = await import("./odeApp");
    const target = document.createElement("div");
    document.body.append(target);
    const initial = outputSession();
    const mounted = mountOdeApp({ target, initialSession: initial });
    await Promise.resolve();

    target.querySelector<HTMLButtonElement>("[data-workflow-step='method']")!.click();

    const outputStep = target.querySelector<HTMLButtonElement>(
      "[data-workflow-step='output']"
    )!;
    expect(outputStep.disabled).toBe(false);
    expect(mounted.getSession().output.single?.result.points).toBe(
      initial.output.single.result.points
    );

    outputStep.click();
    await Promise.resolve();

    expect(
      target
        .querySelector("[data-workflow-step='output']")
        ?.getAttribute("aria-current")
    ).toBe("step");
    expect(target.querySelector("[data-stage-role='output']")).not.toBeNull();
    expect(mounted.getSession().output.single?.result.points).toBe(
      initial.output.single.result.points
    );

    target.querySelector<HTMLButtonElement>("[data-workflow-step='method']")!.click();
    methodControl(target, "Runge-Kutta 4").click();

    expect(
      target.querySelector<HTMLButtonElement>("[data-workflow-step='output']")
        ?.disabled
    ).toBe(true);
    expect(target.querySelector("[data-return-output]")).toBeNull();
    expect(mounted.getSession().output.single?.result.points).toBe(
      initial.output.single.result.points
    );

    target.querySelector<HTMLButtonElement>("[data-workflow-step='method']")!.click();
    methodControl(target, "Forward Euler").click();

    expect(
      target.querySelector<HTMLButtonElement>("[data-workflow-step='output']")
        ?.disabled
    ).toBe(false);
    expect(
      target.querySelector<HTMLButtonElement>("[data-workflow-step='output']")
        ?.disabled
    ).toBe(false);

    mounted.dispose();
  });

  it("keeps Compare workflow and Return-to-output availability on the same pair authority", async () => {
    const { mountOdeApp } = await import("./odeApp");
    const target = document.createElement("div");
    document.body.append(target);
    const initial = comparisonOutputSession();
    const mounted = mountOdeApp({ target, initialSession: initial });
    await Promise.resolve();

    target.querySelector<HTMLButtonElement>("[data-workflow-step='method']")!.click();
    target.querySelector<HTMLButtonElement>("[data-compare]")!.click();
    methodControl(target, "Backward Euler").click();
    methodControl(target, "Runge-Kutta 4").click();

    expect(
      target.querySelector<HTMLButtonElement>("[data-workflow-step='output']")
        ?.disabled
    ).toBe(true);
    expect(target.querySelector("[data-return-output]")).toBeNull();
    expect(mounted.getSession().output.comparison?.resultA.points).toBe(
      initial.output.comparison.resultA.points
    );

    target.querySelector<HTMLButtonElement>("[data-workflow-step='method']")!.click();
    target.querySelector<HTMLButtonElement>("[data-compare]")!.click();
    methodControl(target, "Forward Euler").click();
    methodControl(target, "Runge-Kutta 4").click();

    expect(
      target.querySelector<HTMLButtonElement>("[data-workflow-step='output']")
        ?.disabled
    ).toBe(false);
    expect(target.querySelector("[data-return-output]")).not.toBeNull();
    mounted.dispose();
  });

  it("applies Tutor zoom bounds without changing the chart-owned title", async () => {
    const { mountOdeApp } = await import("./odeApp");
    const target = document.createElement("div");
    document.body.append(target);
    const mounted = mountOdeApp({
      target,
      initialSession: outputSession(),
    });
    await Promise.resolve();

    const chart = chartInstances[0]!;
    const titleBefore = chart.options.plugins?.title?.text;
    const tutorHostTarget = document.createElement("aside");
    document.body.append(tutorHostTarget);
    const tutorHost = createPlatformTutorHost({
      target: tutorHostTarget,
      isMobile: () => false,
      loadPanel: async () => ({
        mountPlatformTutorPanel: () => ({
          dispose: vi.fn(),
          focus: vi.fn(),
        }),
      }),
    });
    const store = createAppSessionStore();
    tutorHost.connect(
      mounted.getTutorBinding(),
      store.createTutorSessionAccess("ode")
    );
    await tutorHost.open(
      tutorHostTarget.querySelector<HTMLButtonElement>("[data-tutor-open]")!
    );
    mounted.getTutorBinding().applyChartInstruction?.({
      type: "zoom_range",
      title: "Solution on [0.25, 0.75]",
      tMin: 0.25,
      tMax: 0.75,
    });

    expect(chart.options.scales?.x).toMatchObject({
      min: 0.25,
      max: 0.75,
    });
    expect(chart.options.plugins?.title?.text).toBe(titleBefore);
    expect(chart.options.plugins?.title?.text).toBe(
      "Numerical approximation vs time"
    );
    expect(chart.options.plugins?.title?.text).not.toContain("Solution");
    expect(chart.update).toHaveBeenCalledOnce();

    tutorHost.close();
    expect(tutorHost.isPresentationVisible()).toBe(false);
    expect(chart.options.plugins?.title?.text).toBe(titleBefore);
    expect(chart.options.plugins?.title?.text).not.toContain("Solution");

    tutorHost.dispose();
    mounted.dispose();
    expect(chart.options.plugins?.title?.text).toBe(titleBefore);
  });

  it("recolors the mounted chart without changing result data or axis bounds", async () => {
    const { mountOdeApp } = await import("./odeApp");
    const target = document.createElement("div");
    document.body.append(target);
    const initial = outputSession();
    const mounted = mountOdeApp({ target, initialSession: initial });
    await Promise.resolve();

    const chart = chartInstances[0]!;
    const datasetData = chart.data.datasets.map((dataset) => dataset.data);
    const resultPoints = mounted.getSession().output.single?.result.points;
    chart.options.scales!.x = { min: 0.05, max: 0.15 };

    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: "dark" }));

    expect(chart.update).toHaveBeenCalledWith("none");
    expect(chart.data.datasets.map((dataset) => dataset.data)).toEqual(datasetData);
    expect(chart.options.scales?.x).toMatchObject({ min: 0.05, max: 0.15 });
    expect(mounted.getSession().output.single?.result.points).toBe(resultPoints);
    expect(mounted.getSession().output.single?.result.points).toBe(
      initial.output.single.result.points
    );

    mounted.dispose();
    chart.update.mockClear();
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: "light" }));
    expect(chart.update).not.toHaveBeenCalled();
  });

  it("keeps one accessible method formula through rerender and final disposal", async () => {
    const { mountOdeApp } = await import("./odeApp");
    const target = document.createElement("div");
    document.body.append(target);
    const mounted = mountOdeApp({
      target,
      initialSession: outputSession(),
    });
    await Promise.resolve();

    const forwardEuler = METHOD_CATALOG.find(
      (entry) => entry.family === "forward_euler"
    )!;
    const expected = methodMathContent(forwardEuler).formula!;
    const first = target.querySelector<HTMLElement>("[data-method-formula]")!;
    expect([expected.displayText, expected.latex]).toContain(first.textContent);
    expect(
      [first, ...first.querySelectorAll<HTMLElement>("*")].filter(
        (element) => element.getAttribute("aria-label") === expected.ariaLabel
      )
    ).toHaveLength(1);

    target.querySelector<HTMLButtonElement>("[data-back]")!.click();
    target.querySelector<HTMLButtonElement>("[data-return-output]")!.click();
    await Promise.resolve();

    const replacement =
      target.querySelector<HTMLElement>("[data-method-formula]")!;
    expect(replacement).not.toBe(first);
    expect([expected.displayText, expected.latex]).toContain(
      replacement.textContent
    );
    expect(
      [replacement, ...replacement.querySelectorAll<HTMLElement>("*")].filter(
        (element) => element.getAttribute("aria-label") === expected.ariaLabel
      )
    ).toHaveLength(1);

    mounted.dispose();
    mounted.dispose();
    expect(first.isConnected).toBe(false);
    expect(replacement.isConnected).toBe(false);
    expect(target.childElementCount).toBe(0);
  });

  it("hydrates comparison output independently from single output", async () => {
    const { mountOdeApp } = await import("./odeApp");
    const target = document.createElement("div");
    document.body.append(target);
    const base = outputSession();
    const stepCount = validateFixedStepGrid(0, 5, 0.2).steps;
    const countContractPoints = Array.from(
      { length: stepCount + 1 },
      (_, index) => ({ t: index * 0.2, y: 1 - index * 0.02 })
    );
    const first = createReadonlySolverResult({
      ...RAW_RESULT,
      points: countContractPoints,
    });
    const second = createReadonlySolverResult({
      ...RAW_RESULT,
      points: countContractPoints.map((point) => ({
        ...point,
        y: point.y + point.t * 0.001,
      })),
      metadata: {
        ...RAW_RESULT.metadata,
        family: "rk4",
        displayName: "Runge-Kutta 4",
        order: 4,
      },
    });
    const session = {
      ...base,
      form: updatePresetProblemFields(base.form, {
        ...base.form.current,
        tEnd: "99",
        runStepSize: "0.9",
        y0: "7",
      }),
      workflow: {
        mode: "compare" as const,
        a: { family: "forward_euler" as const },
        b: { family: "rk4" as const },
      },
      selectedMethod: null,
      output: {
        comparison: {
          a: { family: "forward_euler" as const },
          b: { family: "rk4" as const },
          resultA: first,
          resultB: second,
          expression: base.output.single.expression,
        },
      },
    };
    const mounted = mountOdeApp({ target, initialSession: session });
    await Promise.resolve();

    expect(target.textContent).toContain("Forward Euler vs Runge-Kutta 4");
    expect(target.textContent).toContain(
      "Final numerical approximation — Forward Euler"
    );
    expect(target.textContent).toContain(
      "Final numerical approximation — Runge-Kutta 4"
    );
    expect(target.textContent).toContain(
      "Absolute difference between final numerical approximations"
    );
    expect(target.textContent).not.toContain("Final y —");
    expect(target.textContent).not.toContain("|uₙ − yₙ| at final t");
    const compareStats = [...target.querySelectorAll<HTMLElement>(
      "[data-primary-result-metrics] > div"
    )];
    const storedPointStat = compareStats.find(
      (stat) =>
        stat.querySelector("dt")?.textContent ===
        "Stored grid points (each)"
    );
    expect(stepCount).toBe(25);
    expect(countContractPoints).toHaveLength(26);
    expect(storedPointStat?.querySelector("dd")?.textContent).toBe(
      "26"
    );
    expect(
      compareStats.map(
        (stat) => stat.querySelector("dt")?.textContent
      )
    ).not.toContain("Steps (each)");
    expect(
      target.querySelector("[data-numerical-table-containment='local'] caption")
        ?.textContent
    ).toBe("Last 12 stored grid points (both methods)");
    expect(target.textContent).not.toContain(
      "Last 12 steps (both methods)"
    );
    const compareResult = target.querySelector<HTMLElement>(
      "[data-primary-result]"
    )!;
    expect(compareResult.classList).toContain("lab-primary-result-comparison");
    expect(compareResult.querySelectorAll("[data-result-answer]")).toHaveLength(
      2
    );
    expect(
      [...compareResult.querySelectorAll<HTMLElement>(
        "[data-result-answer] .ode-primary-numeric-value"
      )].map((value) => value.textContent)
    ).toEqual(["0.50000000", "0.50500000"]);
    expect(compareResult.querySelector("[data-problem-context]")).not.toBeNull();
    const compareParameters = Object.fromEntries(
      [...compareResult.querySelectorAll("[data-problem-parameters] > div")].map(
        (item) => [
          item.querySelector("dt")?.textContent,
          item.querySelector("dd")?.textContent,
        ]
      )
    );
    expect(compareParameters).toMatchObject({
      "End time": "5",
      "Time-step size h": "0.2",
      "Initial value y₀": "1",
    });
    expect(
      target.querySelector("[data-numerical-table-containment='local'] caption")
        ?.textContent
    ).toBe("Last 12 stored grid points (both methods)");
    expect(
      target.querySelectorAll("[data-evidence-chart] canvas#plot")
    ).toHaveLength(1);
    expect(mounted.getTutorBinding().getContext()).toMatchObject({ status: "unavailable", message: expect.stringContaining("comparison output") });
    expect(mounted.getSession().output.single).toBeUndefined();
    expect(mounted.getSession().output.comparison?.resultB).toBe(second);
    mounted.dispose();
  });

  it("uses one logical h1/h2/h3 Method hierarchy across the opening and landscape", async () => {
    const { mountOdeApp } = await import("./odeApp");
    const target = document.createElement("div");
    document.body.append(target);
    const mounted = mountOdeApp({
      target,
      initialSession: createBeginnerStarterSession(),
    });

    expect(target.querySelectorAll("h1")).toHaveLength(1);
    expect(
      [...target.querySelectorAll("[data-stage-role='method'] h2")].map(
        (heading) => heading.textContent
      )
    ).toEqual([
      "Start with the initial value problem",
      "See how the methods relate",
      "Forward Euler",
    ]);
    expect(target.querySelectorAll(".card h2")).toHaveLength(0);
    expect(target.querySelectorAll("[data-method-group] > h3")).toHaveLength(3);

    mounted.dispose();
  });

  it("keeps preset guidance inside Data teaching hierarchy without replacing the form", async () => {
    const { mountOdeApp } = await import("./odeApp");
    const target = document.createElement("div");
    document.body.append(target);
    const mounted = mountOdeApp({
      target,
      initialSession: configuredSession(),
      loadEditableMathField: async () => ({
        mountEditableMathField: () => editableHandle(),
      }),
    });
    await Promise.resolve();

    expect(target.querySelector("#ode-form")).not.toBeNull();
    expect(
      target.querySelector(
        "[data-preset-guidance] [data-teaching-block] > h3"
      )?.textContent
    ).toBe("Preset guidance");
    expect(target.querySelector("[data-expression-field]")).not.toBeNull();

    mounted.dispose();
  });

  it("explains a comparison time-grid length mismatch without plotting", async () => {
    const { mountOdeApp } = await import("./odeApp");
    const target = document.createElement("div");
    document.body.append(target);
    const base = outputSession();
    const shorter = createReadonlySolverResult({
      ...RAW_RESULT,
      points: [{ t: 0, y: 1 }],
      metadata: {
        ...RAW_RESULT.metadata,
        family: "rk4",
        displayName: "Runge-Kutta 4",
        order: 4,
      },
    });
    const mounted = mountOdeApp({
      target,
      initialSession: {
        ...base,
        workflow: {
          mode: "compare",
          a: { family: "forward_euler" },
          b: { family: "rk4" },
        },
        selectedMethod: null,
        output: {
          comparison: {
            a: { family: "forward_euler" },
            b: { family: "rk4" },
            resultA: base.output.single.result,
            resultB: shorter,
            expression: base.output.single.expression,
          },
        },
      },
    });
    await Promise.resolve();

    expect(target.textContent).toContain(
      "The two result series have different lengths, so the comparison plot was not created. Rerun both methods on the same aligned grid."
    );
    expect(target.querySelector("#plot")).toBeNull();
    mounted.dispose();
  });

  it("keeps successful output after a failed Run and across a remount", async () => {
    const { mountOdeApp } = await import("./odeApp");
    const target = document.createElement("div");
    document.body.append(target);
    const recordMeaningfulInteraction = vi.fn();
    const mounted = mountOdeApp({
      target,
      initialSession: outputSession(),
      lifecycle: {
        updateSession: vi.fn(),
        recordMeaningfulInteraction,
      },
      now: () => 800,
    });
    await Promise.resolve();
    const points = mounted.getSession().output.single!.result.points;

    target.querySelector<HTMLButtonElement>("[data-back]")!.click();
    const form = target.querySelector<HTMLFormElement>("#ode-form")!;
    form.querySelector<HTMLInputElement>('[name="tEnd"]')!.value = "0";
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await Promise.resolve();

    expect(target.querySelector<HTMLElement>("#form-error")?.hidden).toBe(false);
    expect(recordMeaningfulInteraction).not.toHaveBeenCalled();
    expect(mounted.getSession().output.single?.result.points).toBe(points);
    expect(
      target.querySelector<HTMLButtonElement>("[data-workflow-step='output']")
        ?.disabled
    ).toBe(false);
    expect(mounted.getTutorBinding().getContext()).toMatchObject({
      status: "ready", context: { result: { pointCount: points.length, finalY: points.at(-1)!.y } },
    });
    target.querySelector<HTMLButtonElement>("[data-return-output]")!.click();
    await Promise.resolve();
    expect(
      target
        .querySelector("[data-workflow-step='output']")
        ?.getAttribute("aria-current")
    ).toBe("step");
    const resultParameters = Object.fromEntries(
      [...target.querySelectorAll("[data-problem-parameters] > div")].map(
        (item) => [
          item.querySelector("dt")?.textContent,
          item.querySelector("dd")?.textContent,
        ]
      )
    );
    expect(resultParameters).toMatchObject({
      "End time": "5",
      "Time-step size h": "0.2",
      "Initial value y₀": "1",
    });
    const saved = mounted.getSession();
    mounted.dispose();

    const remountTarget = document.createElement("div");
    document.body.append(remountTarget);
    const remounted = mountOdeApp({ target: remountTarget, initialSession: saved });
    await Promise.resolve();
    expect(remountTarget.textContent).toContain("Forward Euler · results");
    expect(remounted.getSession().output.single?.result.points).toBe(points);
    remounted.dispose();
  });

  it("invalidates queued result mounting when a newer render wins", async () => {
    const { mountOdeApp } = await import("./odeApp");
    const target = document.createElement("div");
    document.body.append(target);
    const mounted = mountOdeApp({ target, initialSession: outputSession() });
    target.querySelector<HTMLButtonElement>("[data-back]")!.click();
    await Promise.resolve();

    expect(target.querySelector("#results-body")).toBeNull();
    expect(destroyChart).not.toHaveBeenCalled();
    mounted.dispose();
  });

  it("reports pure session updates without runtime handles", async () => {
    const { mountOdeApp } = await import("./odeApp");
    const target = document.createElement("div");
    document.body.append(target);
    const updates = vi.fn();
    const recordMeaningfulInteraction = vi.fn();
    const mounted = mountOdeApp({
      target,
      initialSession: createBeginnerStarterSession(),
      lifecycle: { updateSession: updates, recordMeaningfulInteraction },
      now: () => 321,
    });
    methodControl(target, "Runge-Kutta 4").click();

    expect(updates).toHaveBeenCalled();
    const latest = updates.mock.calls.at(-1)?.[0];
    expect(latest.selectedMethod).toEqual({ family: "rk4" });
    expect(recordMeaningfulInteraction).toHaveBeenCalledOnce();
    expect(recordMeaningfulInteraction).toHaveBeenCalledWith(321);
    expect(updates.mock.calls.at(-1)?.[1]).toMatchObject({
      labMeaningful: true,
      lastMeaningfulInteraction: 321,
      resumeSummary: {
        stepLabel: "Method",
        methodLabel: "Runge-Kutta 4",
      },
    });
    expect(JSON.stringify(latest)).not.toContain("HTML");
    expect(latest.convergenceByFingerprint).not.toBeInstanceOf(Map);
    expect(() => assertPureValue(latest)).not.toThrow();
    mounted.dispose();
  });

  it("records a successful Run once, clears Tutor work, and keeps Output meaningful", async () => {
    const { mountOdeApp } = await import("./odeApp");
    const target = document.createElement("div");
    document.body.append(target);
    const initial = configuredSession();
    const store = createAppSessionStore({ now: () => 100 });
    store.updateTutor("ode", (current) =>
      setTutorDesktopOpen(
        appendTutorMessage(current, "user", "Explain the next run"),
        true
      )
    );
    const mountEditableMathField = vi.fn(
      (
        _target: HTMLElement,
        fieldOptions: {
          profile: "rhs" | "exact_solution" | "second_order_rhs";
        }
      ) => {
        const expression =
          fieldOptions.profile === "exact_solution"
            ? initial.form.current.exactSolution.confirmed!
            : initial.form.current.rhs.confirmed;
        const snapshot = {
          state: {
            kind: "ready" as const,
            draftLatex: expression.latex,
            confirmed: expression,
          },
          strict: true,
        };
        return {
          ...editableHandle(),
          getState: vi.fn(() => snapshot),
          validateStrict: vi.fn(() => snapshot),
          getIssue: vi.fn(() => undefined),
        };
      }
    );
    const recordMeaningfulInteraction = vi.fn();
    const mounted = mountOdeApp({
      target,
      initialSession: initial,
      now: () => 500,
      lifecycle: {
        recordMeaningfulInteraction,
        updateSession(session, metadata) {
          store.setLab("ode", session, metadata);
        },
      },
      loadEditableMathField: async () => ({ mountEditableMathField }),
    });
    const unsubscribeReset = mounted
      .getTutorBinding()
      .subscribeConversationReset?.(() => {
        store.updateTutor("ode", clearTutorConversation);
      });
    await Promise.resolve();
    await Promise.resolve();

    target
      .querySelector<HTMLFormElement>("#ode-form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await vi.waitFor(() =>
      expect(target.querySelector("#results-body")).not.toBeNull()
    );

    expect(store.getTutor("ode")).toEqual({
      revision: 2,
      items: [],
      draftMessage: "",
      desktopOpen: true,
    });
    expect(store.getLabMetadata("ode")).toMatchObject({
      labMeaningful: true,
      tutorMeaningful: false,
      meaningful: true,
      lastMeaningfulInteraction: 500,
      resumeSummary: {
        stepLabel: "Output",
        methodLabel: "Forward Euler",
        lastMeaningfulInteraction: 500,
      },
    });
    expect(recordMeaningfulInteraction).toHaveBeenCalledOnce();
    expect(recordMeaningfulInteraction).toHaveBeenCalledWith(500);
    unsubscribeReset?.();
    mounted.dispose();
  });

  it("keeps the Host-owned Tutor launcher in the live ODE header across Run, Method, Compare, and New experiment renders", async () => {
    const { mountOdeApp } = await import("./odeApp");
    const target = document.createElement("div");
    const tutorTarget = document.createElement("aside");
    document.body.append(target, tutorTarget);
    const initial = configuredSession();
    const mountEditableMathField = vi.fn(
      (
        _target: HTMLElement,
        fieldOptions: {
          profile: "rhs" | "exact_solution" | "second_order_rhs";
        }
      ) => {
        const expression =
          fieldOptions.profile === "exact_solution"
            ? initial.form.current.exactSolution.confirmed!
            : initial.form.current.rhs.confirmed;
        const snapshot = {
          state: {
            kind: "ready" as const,
            draftLatex: expression.latex,
            confirmed: expression,
          },
          strict: true,
        };
        return {
          ...editableHandle(),
          getState: vi.fn(() => snapshot),
          validateStrict: vi.fn(() => snapshot),
          getIssue: vi.fn(() => undefined),
        };
      }
    );
    const mounted = mountOdeApp({
      target,
      initialSession: initial,
      loadEditableMathField: async () => ({ mountEditableMathField }),
    });
    const store = createAppSessionStore();
    const host = createPlatformTutorHost({
      target: tutorTarget,
      labTarget: target,
      isMobile: () => false,
      loadPanel: async () => ({
        mountPlatformTutorPanel: () => ({
          dispose: vi.fn(),
          focus: vi.fn(),
        }),
      }),
    });
    host.connect(
      mounted.getTutorBinding(),
      store.createTutorSessionAccess("ode")
    );

    const expectLiveLauncher = async (): Promise<HTMLButtonElement> => {
      await vi.waitFor(() =>
        expect(
          target.querySelectorAll(
            "[data-lab-header-actions] > [data-tutor-open]"
          )
        ).toHaveLength(1)
      );
      expect(target.querySelectorAll("[data-tutor-open]")).toHaveLength(1);
      expect(tutorTarget.querySelector("[data-tutor-open]")).toBeNull();
      return target.querySelector<HTMLButtonElement>("[data-tutor-open]")!;
    };

    await Promise.resolve();
    await Promise.resolve();
    await expectLiveLauncher();

    target
      .querySelector<HTMLFormElement>("#ode-form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await vi.waitFor(() =>
      expect(target.querySelector("#results-body")).not.toBeNull()
    );
    await expectLiveLauncher();

    target.querySelector<HTMLButtonElement>("[data-workflow-step='method']")!.click();
    await expectLiveLauncher();
    target.querySelector<HTMLButtonElement>("[data-compare]")!.click();
    await expectLiveLauncher();

    methodControl(target, "Forward Euler").click();
    await expectLiveLauncher();
    methodControl(target, "Runge-Kutta 4").click();
    await expectLiveLauncher();

    target.querySelector<HTMLButtonElement>("[data-new-experiment]")!.click();
    document
      .querySelector<HTMLButtonElement>("[data-reset-confirm]")!
      .click();
    await vi.waitFor(() =>
      expect(target.querySelector("[data-stage-role='method']")).not.toBeNull()
    );
    await expectLiveLauncher();

    host.dispose();
    mounted.dispose();
  });

  it("ignores a stale editable-field load after a newer render", async () => {
    const { mountOdeApp } = await import("./odeApp");
    let resolveLoader!: (value: {
      mountEditableMathField: ReturnType<typeof vi.fn>;
    }) => void;
    const pending = new Promise<{
      mountEditableMathField: ReturnType<typeof vi.fn>;
    }>((resolve) => {
      resolveLoader = resolve;
    });
    const mountField = vi.fn(() => editableHandle());
    const target = document.createElement("div");
    document.body.append(target);
    const mounted = mountOdeApp({
      target,
      initialSession: configuredSession(),
      loadEditableMathField: () => pending,
    });

    target.querySelector<HTMLButtonElement>("[data-back-methods]")!.click();
    resolveLoader({ mountEditableMathField: mountField });
    await pending;
    await Promise.resolve();

    expect(mountField).not.toHaveBeenCalled();
    expect(target.querySelector(".grid-methods")).not.toBeNull();
    mounted.dispose();
  });

  it("hydrates expression drafts separately from confirmed expressions", async () => {
    const { mountOdeApp } = await import("./odeApp");
    const base = configuredSession();
    const session = {
      ...base,
      form: updatePresetProblemFields(base.form, {
        ...base.form.current,
        rhs: { ...base.form.current.rhs, draftLatex: "t-y" },
        exactSolution: {
          ...base.form.current.exactSolution,
          draftLatex: "e^{-2t}",
        },
      }),
    };
    const mountedOptions: Array<{
      profile: string;
      initialDraftLatex?: string;
      initialConfirmed?: unknown;
    }> = [];
    const mountEditableMathField = vi.fn(
      (
        _target: HTMLElement,
        options: {
          profile: string;
          initialDraftLatex?: string;
          initialConfirmed?: unknown;
        }
      ) => {
        mountedOptions.push(options);
        const handle = editableHandle();
        handle.getState = vi.fn(() => ({
          strict: false,
          state: {
            kind: "ready",
            draftLatex: `${options.initialDraftLatex}-latest`,
            confirmed: options.initialConfirmed,
          },
        })) as EditableMathFieldHandle["getState"];
        return handle;
      }
    );
    const target = document.createElement("div");
    document.body.append(target);
    const mounted = mountOdeApp({
      target,
      initialSession: session,
      loadEditableMathField: async () => ({
        mountEditableMathField:
          mountEditableMathField as unknown as typeof import("../../math/ui/editableMathField")["mountEditableMathField"],
      }),
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(mountedOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          profile: "rhs",
          initialDraftLatex: "t-y",
          initialConfirmed: base.form.current.rhs.confirmed,
        }),
        expect.objectContaining({
          profile: "exact_solution",
          initialDraftLatex: "e^{-2t}",
          initialConfirmed: base.form.current.exactSolution.confirmed,
        }),
      ])
    );
    const captured = mounted.getSession();
    expect(captured.form.current.rhs.draftLatex).toBe("t-y-latest");
    expect(captured.form.current.exactSolution.draftLatex).toBe(
      "e^{-2t}-latest"
    );
    mounted.dispose();
  });

  it("disposes both editable fields during final route cleanup", async () => {
    const { mountOdeApp } = await import("./odeApp");
    const disposers: Array<ReturnType<typeof vi.fn>> = [];
    const mountEditableMathField = vi.fn(() => {
      const dispose = vi.fn();
      disposers.push(dispose);
      return editableHandle(dispose);
    });
    const target = document.createElement("div");
    document.body.append(target);
    const mounted = mountOdeApp({
      target,
      initialSession: configuredSession(),
      loadEditableMathField: async () => ({ mountEditableMathField }),
    });
    await Promise.resolve();
    await Promise.resolve();

    mounted.dispose();
    expect(disposers).toHaveLength(2);
    expect(disposers.every((dispose) => dispose.mock.calls.length === 1)).toBe(true);
  });

  it("New experiment destroys result and Convergence runtime before restoring the starter", async () => {
    const { mountOdeApp } = await import("./odeApp");
    const target = document.createElement("div");
    document.body.append(target);
    const mounted = mountOdeApp({
      target,
      initialSession: outputSession(),
      lifecycle: {
        updateSession: vi.fn(),
        applyConfirmedReset: vi.fn(),
      },
    });
    await Promise.resolve();
    target.querySelector<HTMLButtonElement>("[data-new-experiment]")!.click();
    document
      .querySelector<HTMLButtonElement>("[data-reset-confirm]")!
      .click();
    await Promise.resolve();

    expect(destroyChart).toHaveBeenCalledTimes(1);
    expect(disposeConvergence).toHaveBeenCalledTimes(1);
    expect(mounted.getSession()).toEqual(createBeginnerStarterSession());
    mounted.dispose();
  });

  it("New experiment disposes mounted expression fields", async () => {
    const { mountOdeApp } = await import("./odeApp");
    const disposers: Array<ReturnType<typeof vi.fn>> = [];
    const mountEditableMathField = vi.fn(() => {
      const dispose = vi.fn();
      disposers.push(dispose);
      return editableHandle(dispose);
    });
    const target = document.createElement("div");
    document.body.append(target);
    const mounted = mountOdeApp({
      target,
      initialSession: configuredSession(),
      loadEditableMathField: async () => ({ mountEditableMathField }),
      lifecycle: {
        updateSession: vi.fn(),
        applyConfirmedReset: vi.fn(),
      },
    });
    await Promise.resolve();
    await Promise.resolve();
    target.querySelector<HTMLButtonElement>("[data-new-experiment]")!.click();
    document
      .querySelector<HTMLButtonElement>("[data-reset-confirm]")!
      .click();
    await Promise.resolve();

    expect(disposers).toHaveLength(2);
    expect(disposers.every((dispose) => dispose.mock.calls.length === 1)).toBe(true);
    mounted.dispose();
  });

  it("preserves the ordinary successful-Run Tutor reset behavior", async () => {
    const { mountOdeApp } = await import("./odeApp");
    const mountEditableMathField = vi.fn(
      (
        _target: HTMLElement,
        options: {
          initialConfirmed?: unknown;
          initialDraftLatex?: string;
          profile: string;
        }
      ) => {
        const handle = editableHandle();
        handle.validateStrict = vi.fn(() => ({
          strict: true,
          state: {
            kind: "ready",
            draftLatex: options.initialDraftLatex ?? "",
            confirmed: options.initialConfirmed,
          },
        })) as EditableMathFieldHandle["validateStrict"];
        return handle;
      }
    );
    const target = document.createElement("div");
    document.body.append(target);
    const mounted = mountOdeApp({
      target,
      initialSession: configuredSession(),
      loadEditableMathField: async () => ({
        mountEditableMathField:
          mountEditableMathField as unknown as typeof import("../../math/ui/editableMathField")["mountEditableMathField"],
      }),
    });
    await Promise.resolve();
    await Promise.resolve();

    const resetTutor = vi.fn();
    mounted.getTutorBinding().subscribeConversationReset?.(resetTutor);
    target
      .querySelector<HTMLFormElement>("#ode-form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await Promise.resolve();
    await Promise.resolve();

    expect(resetTutor).toHaveBeenCalledTimes(1);
    expect(mounted.getSession().step).toBe("results");
    expect(mounted.getSession().output.single).toBeDefined();
    await vi.waitFor(() =>
      expect(
        target.querySelector("[data-primary-answer] .ode-primary-numeric-value")
          ?.textContent
      ).toBe("0.00377789")
    );
    const storedRows = [...target.querySelectorAll<HTMLTableRowElement>(
      ".ode-values-table tbody tr"
    )];
    expect(storedRows).toHaveLength(12);
    expect(
      storedRows.map((row) => row.querySelector("th")?.textContent)
    ).toEqual([
      "2.80000",
      "3.00000",
      "3.20000",
      "3.40000",
      "3.60000",
      "3.80000",
      "4.00000",
      "4.20000",
      "4.40000",
      "4.60000",
      "4.80000",
      "5.00000",
    ]);
    expect(
      storedRows.map((row) => row.querySelector("td")?.textContent)
    ).toEqual([
      "0.04398047",
      "0.03518437",
      "0.02814750",
      "0.02251800",
      "0.01801440",
      "0.01441152",
      "0.01152922",
      "0.00922337",
      "0.00737870",
      "0.00590296",
      "0.00472237",
      "0.00377789",
    ]);
    for (const row of storedRows) {
      expect(row.querySelector("th")?.scope).toBe("row");
      expect(row.querySelector("td[data-numeric='true']")).not.toBeNull();
      expect(row.className).toBe("");
    }
    expect(
      [...target.querySelectorAll<HTMLTableCellElement>(
        ".ode-values-table thead th"
      )].map((header) => header.scope)
    ).toEqual(["col", "col"]);
    expect(document.activeElement).toBe(
      target.querySelector(".lab-primary-result-heading")
    );
    mounted.dispose();
  });
});
