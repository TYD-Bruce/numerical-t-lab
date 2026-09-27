import type {
  LabLifecycleCallbacks,
  LabSessionMetadata,
  LabTutorBinding,
  ResumeSummary,
} from "../../app/contracts";
import type {
  LinearSystemResidualComponentTraceStep,
  LinearSystemSolveError,
  LinearSystemSolveSuccess,
} from "@numerical-t-lab/numerics/linear-algebra/linear-systems-numerics";
import {
  LINEAR_SYSTEMS_PRESETS,
  type LinearSystemsPresetId,
} from "@numerical-t-lab/numerics/linear-algebra/linear-systems-presets";
import {
  computeLinearSystemsLabMeaningful,
  createLinearSystemsResumeSummary,
  createLinearSystemsSession,
  loadLinearSystemsPreset,
  replaceLinearSystemsDraft,
  resizeLinearSystemsDraft,
  runLinearSystemsSession,
  setLinearSystemsWorkflowStep,
  validateLinearSystemsDraft,
  type LinearSystemsDraft,
  type LinearSystemsDraftIssue,
  type LinearSystemsSessionFailure,
  type LinearSystemsSessionState,
  type LinearSystemsWorkflowStep,
} from "./linearSystemsSession";
import {
  createComputationWalkthrough,
} from "./computationWalkthrough";
import {
  createAnalysisSurface,
  type AnalysisSurfaceSection,
} from "../../components/lab-presentation/analysisSurface";
import {
  createLabHeader,
  createLabShell,
} from "../../components/lab-presentation/labShell";
import { createEvidenceBlock } from "../../components/lab-presentation/evidenceBlock";
import { createPrimaryResult } from "../../components/lab-presentation/primaryResult";
import { createProblemContext } from "../../components/lab-presentation/problemContext";
import { createStageSection } from "../../components/lab-presentation/stageSection";
import {
  applyLabActionRole,
  createAdvancedDetails,
} from "../../components/lab-presentation/supportingElements";
import { createTeachingBlock } from "../../components/lab-presentation/teachingBlock";
import {
  createWorkflowNavigation,
  disposeWorkflowNavigation,
} from "../../components/lab-presentation/workflowNavigation";
import {
  createMathNumber,
  createStructuredMath,
  formatMathNumber,
  type MathNumberContext,
  type StructuredMathContent,
} from "../../math/structuredMath";
import {
  createNativeMath,
  mathIdentifier,
  mathNumber as nativeMathNumber,
  mathNumberLiteral,
  mathOperator,
  mathRow,
  mathSubscript,
} from "../../math/nativeMath";
import {
  createComputedSolution,
  createNamedMatrix,
  createNamedVector,
  createPluRelation,
  createSolvedSystemEquation,
  createSystemEquation,
  multiplyNodes,
  spokenNumber,
  xHatNode,
} from "./linearSystemsMath";
import { createLinearSystemsMethodTeaching } from "./linearSystemsTeaching";
import { createLinearSystemsTutorBinding } from "./linearSystemsTutorBinding";
import "./linearSystems.css";

const activeMounts = new WeakMap<HTMLElement, object>();
let walkthroughId = 0;

export interface MountLinearSystemsAppOptions {
  readonly target: HTMLElement;
  readonly initialSession: LinearSystemsSessionState;
  readonly navigate?: (path: string) => void;
  readonly lifecycle?: Pick<
    LabLifecycleCallbacks<LinearSystemsSessionState>,
    "updateSession" | "recordMeaningfulInteraction" | "applyConfirmedReset"
  >;
  readonly now?: () => number;
}

export interface MountedLinearSystemsApp {
  getSession(): LinearSystemsSessionState;
  getResumeSummary(): ResumeSummary | undefined;
  getTutorBinding(): LabTutorBinding;
  dispose(): void;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text?: string,
  className?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function button(
  label: string,
  className: string,
  action: () => void
): HTMLButtonElement {
  const control = el("button", label, className);
  control.type = "button";
  control.addEventListener("click", action);
  return control;
}

type Content = string | Node;

function appendContent(target: Node, content: Content): void {
  target.appendChild(
    typeof content === "string" ? document.createTextNode(content) : content
  );
}

function paragraph(contents: readonly Content[], className?: string): HTMLParagraphElement {
  const node = el("p", undefined, className);
  contents.forEach((content) => appendContent(node, content));
  return node;
}

function math(
  content: StructuredMathContent,
  accessibleText: string,
  dataMath: string,
  className = "ls-inline-math"
): HTMLElement {
  return createStructuredMath(content, accessibleText, { className, dataMath });
}

function number(value: number, context: MathNumberContext): HTMLElement {
  return createMathNumber(value, context);
}

function numberCell(value: number, context: MathNumberContext): HTMLTableCellElement {
  const cell = el("td");
  cell.append(number(value, context));
  return cell;
}

function createPivotTable(result: LinearSystemSolveSuccess): HTMLElement {
  const region = el("div", undefined, "ls-table-region");
  region.setAttribute("role", "region");
  region.setAttribute("aria-label", "Pivot sequence");
  region.tabIndex = 0;
  const table = el("table", undefined, "ls-evidence-table");
  const caption = el("caption", "Pivot sequence", "sr-only");
  const head = document.createElement("thead");
  const heading = document.createElement("tr");
  ["Column", "Selected row", "Pivot value"].forEach((label) => {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = label;
    heading.append(th);
  });
  head.append(heading);
  const body = document.createElement("tbody");
  result.pivots.forEach((pivot) => {
    const row = document.createElement("tr");
    const column = document.createElement("th");
    column.scope = "row";
    column.textContent = String(pivot.column + 1);
    row.append(
      column,
      el("td", String(pivot.selectedRow + 1)),
      numberCell(pivot.pivotValue, "ordinary")
    );
    body.append(row);
  });
  table.append(caption, head, body);
  region.append(table);
  return region;
}

function staleNotice(): HTMLElement {
  const notice = el("aside", undefined, "ls-stale-notice");
  notice.dataset.resultStale = "true";
  notice.setAttribute("role", "status");
  notice.append(
    el("strong", "Stale result"),
    document.createTextNode(
      " — this is the latest successful output, but it does not correspond to the current data."
    )
  );
  return notice;
}

export function mountLinearSystemsApp(
  options: MountLinearSystemsAppOptions
): MountedLinearSystemsApp {
  const app = options.target;
  if (activeMounts.has(app)) {
    throw new Error("The Linear Systems Lab target already owns a mounted application.");
  }
  const token = {};
  activeMounts.set(app, token);
  let disposed = false;
  let session = options.initialSession;
  let lastFailure: LinearSystemSolveError | LinearSystemsSessionFailure | undefined;
  let computationExpanded = false;
  let failureComputationExpanded = false;
  let lastMeaningfulInteraction: number | undefined;
  let activeResetDialog: HTMLElement | undefined;
  let resetTrigger: HTMLElement | undefined;
  let inertBackground: Array<{ element: HTMLElement; wasInert: boolean }> = [];
  const instanceId = ++walkthroughId;
  const tutor = createLinearSystemsTutorBinding({
    getSession: () => session,
    prepareForOpen: () => closeResetDialog(false),
  });

  function isCurrent(): boolean {
    return !disposed && activeMounts.get(app) === token;
  }

  function markMeaningful(): void {
    const at = (options.now ?? Date.now)();
    lastMeaningfulInteraction = at;
    options.lifecycle?.recordMeaningfulInteraction?.(at);
  }

  function metadata(): LabSessionMetadata {
    const labMeaningful = computeLinearSystemsLabMeaningful(session);
    return {
      labMeaningful,
      tutorMeaningful: false,
      meaningful: labMeaningful,
      resumeSummary: createLinearSystemsResumeSummary(
        session,
        lastMeaningfulInteraction ?? 0
      ),
      ...(lastMeaningfulInteraction === undefined
        ? {}
        : { lastMeaningfulInteraction }),
    };
  }

  function publish(): void {
    if (!isCurrent()) return;
    options.lifecycle?.updateSession(session, metadata());
    tutor.refreshContext();
  }

  function focusAfterRender(selector: string): void {
    queueMicrotask(() => {
      if (!isCurrent()) return;
      app.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true });
    });
  }

  function announce(message: string): void {
    queueMicrotask(() => {
      if (!isCurrent()) return;
      const status = app.querySelector<HTMLElement>("[data-linear-systems-status]");
      if (status) status.textContent = message;
    });
  }

  function invalidateFailedAttempt(form?: HTMLFormElement): void {
    lastFailure = undefined;
    failureComputationExpanded = false;
    const failure = form?.querySelector<HTMLElement>("[data-solve-failure]");
    if (failure) {
      failure.remove();
    }
  }

  function goToStep(step: LinearSystemsWorkflowStep): void {
    if (
      (step === "output" || step === "diagnostics") &&
      !session.latestSuccessfulResult
    ) {
      return;
    }
    const next = setLinearSystemsWorkflowStep(session, step);
    if (next === session) return;
    session = next;
    if (step === "output" || step === "diagnostics") markMeaningful();
    publish();
    render();
    focusAfterRender(`[data-workflow-step="${step}"]`);
  }

  function createLinearSystemsWorkflowNavigation(): HTMLElement {
    const resultAvailable = Boolean(session.latestSuccessfulResult);
    return createWorkflowNavigation({
      label: "Linear Systems workflow",
      steps: [
        {
          key: "method",
          label: "Method",
          role: "method",
          current: session.step === "method",
          onActivate: () => goToStep("method"),
        },
        {
          key: "data",
          label: "Data",
          role: "data",
          current: session.step === "data",
          onActivate: () => goToStep("data"),
        },
        {
          key: "output",
          label: "Output",
          role: "output",
          available: resultAvailable,
          current: session.step === "output",
          onActivate: () => goToStep("output"),
        },
        {
          key: "diagnostics",
          label: "Diagnostics",
          role: "analysis",
          available: resultAvailable,
          current: session.step === "diagnostics",
          onActivate: () => goToStep("diagnostics"),
        },
      ],
    });
  }

  function createMethodPanel(): HTMLElement {
    const panel = createStageSection({ role: "method", label: "Method" });
    panel.dataset.workflowPanel = "method";
    panel.append(
      createLinearSystemsMethodTeaching(),
      button("Continue to Data", "ls-button ls-button-primary", () => goToStep("data"))
    );
    return panel;
  }

  function currentDraftFromForm(form: HTMLFormElement): LinearSystemsDraft {
    const A = Array.from({ length: session.dimension }, (_, row) =>
      Array.from({ length: session.dimension }, (_, column) =>
        form.querySelector<HTMLInputElement>(
          `[data-matrix-a-row="${row}"][data-matrix-a-column="${column}"]`
        )?.value ?? ""
      )
    );
    const b = Array.from(
      { length: session.dimension },
      (_, row) =>
        form.querySelector<HTMLInputElement>(`[data-vector-b-row="${row}"]`)
          ?.value ?? ""
    );
    return { dimension: session.dimension, A, b };
  }

  function clearFieldErrors(form: HTMLFormElement): void {
    form.querySelectorAll("[aria-invalid='true']").forEach((field) => {
      field.removeAttribute("aria-invalid");
      field.removeAttribute("aria-describedby");
    });
    form.querySelectorAll(".ls-field-error").forEach((error) => error.remove());
    form.querySelector("[data-validation-summary]")?.remove();
  }

  function inputForIssue(
    form: HTMLFormElement,
    issue: LinearSystemsDraftIssue
  ): HTMLInputElement | undefined {
    if (issue.field === "A" && issue.row !== undefined && issue.column !== undefined) {
      return form.querySelector<HTMLInputElement>(
        `[data-matrix-a-row="${issue.row}"][data-matrix-a-column="${issue.column}"]`
      ) ?? undefined;
    }
    if (issue.field === "b" && issue.row !== undefined) {
      return form.querySelector<HTMLInputElement>(
        `[data-vector-b-row="${issue.row}"]`
      ) ?? undefined;
    }
    return undefined;
  }

  function showValidation(
    form: HTMLFormElement,
    issues: readonly LinearSystemsDraftIssue[]
  ): void {
    clearFieldErrors(form);
    const summary = el("section", undefined, "ls-error-summary");
    summary.dataset.validationSummary = "true";
    summary.setAttribute("role", "alert");
    summary.tabIndex = -1;
    summary.append(el("h3", "Check the system data"));
    const list = document.createElement("ul");
    issues.forEach((issue, index) => {
      list.append(el("li", issue.message));
      const field = inputForIssue(form, issue);
      if (!field) return;
      const errorId = `ls-field-error-${instanceId}-${index}`;
      const error = el("span", issue.message, "ls-field-error");
      error.id = errorId;
      field.setAttribute("aria-invalid", "true");
      field.setAttribute("aria-describedby", errorId);
      field.closest("td")?.append(error);
    });
    summary.append(list);
    form.prepend(summary);
    const first = inputForIssue(form, issues[0]!);
    queueMicrotask(() => {
      if (!isCurrent()) return;
      (first ?? summary).focus({ preventScroll: false });
    });
  }

  function createEditableMatrix(): HTMLElement {
    const layout = el("div", undefined, "ls-equation-editor");
    layout.dataset.equationEditor = "true";
    layout.append(createSystemEquation("ls-equation-formula"));
    const equationData = el("div", undefined, "ls-equation-data");
    equationData.dataset.equationData = "true";
    const matrixRegion = el("div", undefined, "ls-matrix-region ls-editor-region");
    matrixRegion.setAttribute("role", "region");
    matrixRegion.setAttribute("aria-label", "Editable matrix A input grid");
    matrixRegion.tabIndex = 0;
    const table = el("table", undefined, "ls-input-matrix");
    table.append(el("caption", "Matrix A entries", "sr-only"));
    const body = document.createElement("tbody");
    for (let row = 0; row < session.dimension; row += 1) {
      const tr = document.createElement("tr");
      for (let column = 0; column < session.dimension; column += 1) {
        const td = document.createElement("td");
        const input = document.createElement("input");
        input.type = "text";
        input.inputMode = "decimal";
        input.autocomplete = "off";
        input.spellcheck = false;
        input.value = session.ADraft[row]?.[column] ?? "";
        input.dataset.matrixARow = String(row);
        input.dataset.matrixAColumn = String(column);
        input.setAttribute(
          "aria-label",
          `Matrix A, row ${row + 1}, column ${column + 1}`
        );
        td.append(input);
        tr.append(td);
      }
      body.append(tr);
    }
    table.append(body);
    matrixRegion.append(table);

    const equals = el("span", "=", "ls-equation-symbol ls-equation-operator");
    equals.setAttribute("aria-hidden", "true");
    const vectorRegion = el("div", undefined, "ls-matrix-region ls-editor-region");
    vectorRegion.setAttribute("role", "region");
    vectorRegion.setAttribute("aria-label", "Editable right-hand-side vector b input grid");
    vectorRegion.tabIndex = 0;
    const vector = el("table", undefined, "ls-input-matrix");
    vector.append(el("caption", "Right-hand-side vector b entries", "sr-only"));
    const vectorBody = document.createElement("tbody");
    for (let row = 0; row < session.dimension; row += 1) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      const input = document.createElement("input");
      input.type = "text";
      input.inputMode = "decimal";
      input.autocomplete = "off";
      input.spellcheck = false;
      input.value = session.bDraft[row] ?? "";
      input.dataset.vectorBRow = String(row);
      input.setAttribute("aria-label", `Vector b, row ${row + 1}`);
      td.append(input);
      tr.append(td);
      vectorBody.append(tr);
    }
    vector.append(vectorBody);
    vectorRegion.append(vector);
    const matrixTerm = el("div", undefined, "ls-equation-term");
    matrixTerm.dataset.equationTerm = "A";
    const matrixLabel = el("span", "A", "ls-equation-label");
    matrixLabel.setAttribute("aria-hidden", "true");
    matrixTerm.append(matrixLabel, matrixRegion);
    const x = el("span", "x", "ls-equation-label ls-equation-operator");
    x.setAttribute("aria-hidden", "true");
    const vectorTerm = el("div", undefined, "ls-equation-term");
    vectorTerm.dataset.equationTerm = "b";
    const vectorLabel = el("span", "b", "ls-equation-label");
    vectorLabel.setAttribute("aria-hidden", "true");
    vectorTerm.append(vectorLabel, vectorRegion);
    equationData.append(matrixTerm, x, equals, vectorTerm);
    layout.append(equationData);
    return layout;
  }

  function updateDataIdentity(form: HTMLFormElement): void {
    const presetSelect = form.querySelector<HTMLSelectElement>("[data-preset-select]");
    if (presetSelect) presetSelect.value = session.selectedPresetId ?? "custom";
    const identity = form.querySelector<HTMLElement>("[data-preset-identity]");
    if (identity) {
      identity.textContent = session.selectedPresetId
        ? `Preset identity: ${LINEAR_SYSTEMS_PRESETS.find((preset) => preset.id === session.selectedPresetId)?.name ?? "Approved preset"}. Reference authority is available after a successful run.`
        : "Preset identity: Custom. No preset reference solution is authoritative.";
    }
  }

  function experimentIdentityText(): string {
    const identity = session.selectedPresetId
      ? `${LINEAR_SYSTEMS_PRESETS.find((preset) => preset.id === session.selectedPresetId)?.name ?? "Approved preset"} · ${session.dimension} × ${session.dimension}`
      : `Custom · ${session.dimension} × ${session.dimension}`;
    if (session.resultStatus === "absent") return identity;
    return `${identity}${session.resultStatus === "current" ? " · result current" : " · result stale"}`;
  }

  function updateExperimentIdentity(): void {
    const identity = app.querySelector<HTMLElement>("[data-experiment-identity]");
    if (identity) identity.textContent = experimentIdentityText();
  }

  function createFailurePanel(
    error: LinearSystemSolveError | LinearSystemsSessionFailure
  ): HTMLElement {
    const panel = el("section", undefined, "ls-solve-failure");
    panel.dataset.solveFailure = error.code;
    panel.setAttribute("role", "alert");
    panel.tabIndex = -1;
    panel.append(el("h3", "The system was not solved"), el("p", error.message));
    if (error.code === "pivot_rejected" && "trace" in error && error.trace) {
      const rejected = [...error.trace.steps]
        .reverse()
        .find((step) => step.kind === "pivot_selection");
      if (rejected?.kind === "pivot_selection") {
        panel.append(
          paragraph([
            `Computation stopped in pivot column ${rejected.column + 1}: selected magnitude `,
            number(rejected.selectedAbsoluteMagnitude, "detail"),
            `; the acceptance threshold was ${formatMathNumber(rejected.tauPivot, "threshold").text}.`,
          ])
        );
        panel.append(
          el(
            "p",
            "The selected pivot did not clear the Lab's engineering safeguard. This does not by itself constitute a formal symbolic proof that the matrix is singular.",
            "ls-failure-boundary"
          )
        );
      }
      const controlledId = `ls-failure-computation-${instanceId}`;
      const toggle = button(
        failureComputationExpanded ? "Hide computation before failure" : "Show computation before failure",
        "ls-button ls-button-secondary",
        () => {
          failureComputationExpanded = !failureComputationExpanded;
          render();
          focusAfterRender("[data-show-failure-computation]");
        }
      );
      toggle.dataset.showFailureComputation = "true";
      toggle.setAttribute("aria-expanded", String(failureComputationExpanded));
      toggle.setAttribute("aria-controls", controlledId);
      panel.append(toggle);
      if (failureComputationExpanded) {
        const evidence = createComputationWalkthrough(error.trace, {
          headingLevel: 4,
        });
        evidence.id = controlledId;
        evidence.dataset.failureWalkthrough = "true";
        panel.append(evidence);
      }
    }
    if (session.latestSuccessfulResult) {
      panel.append(
        el(
          "p",
          "The previous successful Output and Diagnostics remain available and are marked stale when they do not match the current data.",
          "ls-preserved-result"
        )
      );
    }
    return panel;
  }

  function run(form: HTMLFormElement): void {
    if (!isCurrent()) return;
    const draft = currentDraftFromForm(form);
    session = replaceLinearSystemsDraft(session, draft);
    const issues = validateLinearSystemsDraft(draft);
    if (issues.length > 0) {
      lastFailure = undefined;
      showValidation(form, issues);
      publish();
      return;
    }
    clearFieldErrors(form);
    const outcome = runLinearSystemsSession(session);
    markMeaningful();
    if (!outcome.ok) {
      session = outcome.session;
      lastFailure = outcome.error;
      failureComputationExpanded = false;
      publish();
      render();
      announce(outcome.error.message);
      queueMicrotask(() => {
        if (!isCurrent()) return;
        app.querySelector<HTMLElement>("[data-solve-failure]")?.focus();
      });
      return;
    }
    session = outcome.session;
    lastFailure = undefined;
    computationExpanded = false;
    failureComputationExpanded = false;
    tutor.requestConversationReset();
    publish();
    render();
    focusAfterRender("[data-primary-result] > h2");
    announce("Linear system solved. Computed solution is ready.");
  }

  function createDataPanel(): HTMLElement {
    const panel = createStageSection({ role: "data", label: "Data" });
    panel.dataset.workflowPanel = "data";
    const heading = el("h2", "Data — define A and b");
    heading.tabIndex = -1;
    panel.append(
      heading,
      el(
        "p",
        "Enter a small dense real square system. Each entry accepts a finite decimal or scientific-notation value.",
        "ls-lede"
      )
    );
    const form = document.createElement("form");
    form.noValidate = true;
    form.dataset.linearSystemsForm = "true";
    const controls = el("div", undefined, "ls-data-controls");
    const dimensionLabel = el("label", undefined, "ls-control-field");
    dimensionLabel.append(el("span", "Dimension n"));
    const dimension = document.createElement("select");
    dimension.dataset.dimensionSelect = "true";
    dimension.setAttribute("aria-label", "Matrix dimension");
    for (let value = 2; value <= 6; value += 1) {
      const option = document.createElement("option");
      option.value = String(value);
      option.textContent = `${value} × ${value}`;
      option.selected = value === session.dimension;
      dimension.append(option);
    }
    dimensionLabel.append(dimension);

    const presetLabel = el("label", undefined, "ls-control-field");
    presetLabel.append(el("span", "Preset"));
    const preset = document.createElement("select");
    preset.dataset.presetSelect = "true";
    preset.setAttribute("aria-label", "Linear system preset");
    LINEAR_SYSTEMS_PRESETS.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.name;
      preset.append(option);
    });
    const custom = document.createElement("option");
    custom.value = "custom";
    custom.textContent = "Custom";
    custom.disabled = session.selectedPresetId !== null;
    preset.append(custom);
    preset.value = session.selectedPresetId ?? "custom";
    presetLabel.append(preset);
    controls.append(dimensionLabel, presetLabel);

    const identity = el("p", undefined, "ls-preset-identity");
    identity.dataset.presetIdentity = "true";
    form.append(controls, identity, createEditableMatrix());
    updateDataIdentity(form);

    const actions = el("div", undefined, "ls-form-actions");
    actions.append(
      button("Back to Method", "ls-button ls-button-ghost", () => goToStep("method"))
    );
    const runControl = el("button", "Run", "ls-button ls-button-primary");
    runControl.type = "submit";
    runControl.dataset.runLinearSystem = "true";
    actions.append(runControl);
    form.append(actions);
    if (lastFailure) form.append(createFailurePanel(lastFailure));

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      run(form);
    });
    form.addEventListener("input", (event) => {
      if (!(event.target instanceof HTMLInputElement)) return;
      clearFieldErrors(form);
      invalidateFailedAttempt(form);
      const previousStatus = session.resultStatus;
      session = replaceLinearSystemsDraft(session, currentDraftFromForm(form));
      markMeaningful();
      updateDataIdentity(form);
      updateExperimentIdentity();
      publish();
      if (session.resultStatus !== previousStatus) {
        announce(
          session.resultStatus === "stale"
            ? "Inputs changed. The previous successful result is now stale."
            : "The successful input values were restored. The previous result is current again."
        );
      }
    });
    dimension.addEventListener("change", () => {
      const next = resizeLinearSystemsDraft(session, Number(dimension.value));
      if (next === session) return;
      session = next;
      invalidateFailedAttempt();
      markMeaningful();
      publish();
      render();
    });
    preset.addEventListener("change", () => {
      if (preset.value === "custom") return;
      session = loadLinearSystemsPreset(
        session,
        preset.value as LinearSystemsPresetId
      );
      session = setLinearSystemsWorkflowStep(session, "data");
      invalidateFailedAttempt();
      markMeaningful();
      publish();
      render();
    });
    panel.append(form);
    return panel;
  }

  function resultHeader(
    result: LinearSystemSolveSuccess,
    stale: boolean
  ): HTMLElement {
    const heading = el("h2", "Problem and computed solution");
    heading.tabIndex = -1;
    const problem = createProblemContext({
      heading: el("h3", "Problem"),
      statement: createSolvedSystemEquation(result.originalA, result.originalB, {
        className: "ls-output-system-equation",
        dataMath: "solved-system",
      }),
      staleNote: stale
        ? el(
            "p",
            "This result was produced from the previous successful inputs.",
            "ls-result-context-note"
          )
        : undefined,
    });
    problem.classList.add("ls-result-part", "is-problem");
    problem.dataset.resultPart = "problem";
    problem.dataset.outputProblemContext = "true";
    problem.dataset.resultAuthority = "successful-result";
    const solution = createComputedSolution(result.xHat);
    solution.classList.add("ls-solution-vector");
    const primary = createPrimaryResult({
      eyebrow: el("p", "Main answer", "ls-eyebrow"),
      heading,
      status: stale ? staleNotice() : undefined,
      statusTone: stale ? "stale" : undefined,
      problemContext: problem,
      primaryAnswer: {
        label: el("h3", "Computed solution"),
        content: solution,
      },
    });
    const solutionPart = primary.querySelector<HTMLElement>(
      "[data-primary-answer]"
    );
    solutionPart?.classList.add("ls-result-part", "is-solution");
    if (solutionPart) solutionPart.dataset.resultPart = "solution";
    return primary;
  }

  function createOutputPanel(): HTMLElement {
    const panel = createStageSection({ role: "output", label: "Output" });
    panel.dataset.workflowPanel = "output";
    const result = session.latestSuccessfulResult;
    if (!result) {
      const heading = el("h2", "Output");
      heading.tabIndex = -1;
      panel.append(
        heading,
        el("p", "Run a valid system from Data to produce a computed solution."),
        button("Go to Data", "ls-button ls-button-primary", () => goToStep("data"))
      );
      return panel;
    }
    panel.append(resultHeader(result, session.resultStatus === "stale"));
    const title = el("h3", "Factorization evidence");
    title.id = `ls-factorization-title-${instanceId}`;
    const roundedCopy = paragraph(
      [
        "The matrices below display rounded entries, so their numerical comparison is ",
        createPluRelation(true, "ls-inline-native-math"),
        ".",
      ],
      "ls-muted"
    );
    const factors = el("div", undefined, "ls-factor-grid");
    factors.append(
      createNamedMatrix("P", result.P, "permutation matrix P", { dataMath: "factor-p" }),
      createNamedMatrix("L", result.L, "unit lower triangular matrix L", { dataMath: "factor-l" }),
      createNamedMatrix("U", result.U, "upper triangular matrix U", { dataMath: "factor-u" })
    );
    const summary = el("div", undefined, "ls-output-summary");
    summary.append(
      el(
        "p",
        `${result.rowSwapCount} row ${result.rowSwapCount === 1 ? "swap" : "swaps"} recorded.`
      ),
      createPivotTable(result)
    );
    const relation = createEvidenceBlock({
      level: "standard",
      heading: title,
      formulas: [
        createPluRelation(false, "ls-factorization-equation"),
        roundedCopy,
        factors,
        summary,
      ],
    });
    relation.classList.add("ls-factorization-rail");
    panel.append(relation);

    const computation = el("section", undefined, "ls-computation-shell");
    const computationControlId = `ls-computation-${instanceId}`;
    const toggle = button(
      computationExpanded ? "Hide computation" : "Show computation",
      "ls-button ls-button-secondary ls-computation-toggle",
      () => {
        computationExpanded = !computationExpanded;
        render();
        focusAfterRender("[data-show-computation]");
      }
    );
    toggle.dataset.showComputation = "true";
    toggle.setAttribute("aria-expanded", String(computationExpanded));
    toggle.setAttribute("aria-controls", computationControlId);
    computation.append(
      toggle,
      el(
        "p",
        "Open the computation steps that produced this result.",
        "ls-muted"
      )
    );
    if (computationExpanded) {
      const walkthrough = createComputationWalkthrough(result.trace, {
        headingLevel: 3,
        result,
      });
      walkthrough.id = computationControlId;
      computation.append(walkthrough);
    }
    panel.append(computation);
    const actions = el("div", undefined, "ls-panel-actions");
    actions.append(
      button("Edit Data", "ls-button ls-button-ghost", () => goToStep("data")),
      button("View Diagnostics", "ls-button ls-button-primary", () =>
        goToStep("diagnostics")
      )
    );
    panel.append(actions);
    return panel;
  }

  function createDiagnosticsPanel(): HTMLElement {
    const panel = createStageSection({ role: "analysis", label: "Diagnostics" });
    panel.dataset.workflowPanel = "diagnostics";
    const heading = el("h2", "Diagnostics — check the equation mismatch");
    heading.tabIndex = -1;
    const result = session.latestSuccessfulResult;
    if (!result) {
      const setup = el("div", undefined, "ls-diagnostics-setup");
      setup.append(
        el("p", "Run a valid system from Data to produce diagnostics."),
        button("Go to Data", "ls-button ls-button-primary", () => goToStep("data"))
      );
      panel.append(createAnalysisSurface({ heading, setup }));
      return panel;
    }
    const status = session.resultStatus === "stale" ? staleNotice() : undefined;
    const residualComponents = result.trace.steps.filter(
      (step): step is LinearSystemResidualComponentTraceStep =>
        step.kind === "residual_component"
    );
    const residualNorm = result.trace.steps.find(
      (step) => step.kind === "residual_inf_norm"
    );
    const matrixScale = result.trace.steps.find(
      (step) => step.kind === "matrix_scale"
    );
    const matrixVectorValues = residualComponents.map(
      (step) => step.matrixVectorValue
    );

    const contextMath = el("div", undefined, "ls-diagnostics-context-math");
    contextMath.append(
      createNamedMatrix("A", result.originalA, "coefficient matrix A", {
        dataMath: "diagnostic-context-a",
      }),
      createNamedVector("b", result.originalB, "right-hand side vector b", {
        dataMath: "diagnostic-context-b",
      }),
      createNamedVector(xHatNode(), result.xHat, "computed solution x hat", {
        dataMath: "diagnostic-context-x-hat",
        context: "matrix",
      })
    );
    const contextStatement = el("div");
    contextStatement.append(
      el(
        "p",
        "What solution are we checking? This read-only summary comes from the successful result that produced these diagnostics."
      ),
      contextMath
    );
    const context = createProblemContext({
      heading: el("h3", "What problem did we solve?"),
      statement: contextStatement,
      staleNote:
        session.resultStatus === "stale"
          ? el(
              "p",
              "This context belongs to the previous successful inputs, not the current edited data.",
              "ls-result-context-note"
            )
          : undefined,
    });
    context.prepend(el("p", "Successful result context", "ls-eyebrow"));
    context.classList.add("ls-diagnostics-context");
    context.dataset.diagnosticsContext = "true";
    context.dataset.resultAuthority = "successful-result";

    const meaningDefinition = createNativeMath(
      [
        mathIdentifier("r"),
        mathOperator("="),
        mathIdentifier("b"),
        mathOperator("−"),
        multiplyNodes(mathIdentifier("A"), xHatNode()),
      ],
      "r equals b minus A times x hat",
      {
        className: "ls-diagnostic-definition",
        display: "block",
        dataMath: "residual-relation",
      }
    );
    const meaningIdeal = createNativeMath(
      [
        multiplyNodes(mathIdentifier("A"), xHatNode()),
        mathOperator("="),
        mathIdentifier("b"),
        mathOperator("⇒"),
        mathIdentifier("r"),
        mathOperator("="),
        nativeMathNumber(0, "ordinary"),
      ],
      "If A times x hat equals b, then r equals zero",
      {
        className: "ls-diagnostic-ideal",
        display: "block",
        dataMath: "residual-ideal",
      }
    );
    const meaningFormulaGroup = el(
      "div",
      undefined,
      "ls-residual-formula-group"
    );
    meaningFormulaGroup.dataset.residualFormulaGroup = "true";
    meaningFormulaGroup.append(meaningDefinition, meaningIdeal);
    const meaning = createTeachingBlock({
      eyebrow: el("p", "Why we check", "ls-eyebrow"),
      heading: el("h3", "What is the residual?"),
      lead: el(
        "p",
        "The residual measures how far the computed solution misses the original equations.",
        "ls-diagnostic-lede"
      ),
      math: [
        meaningFormulaGroup,
        el(
          "p",
          "If the computed solution satisfies the equations exactly, the residual is zero.",
          "ls-diagnostic-ideal-copy"
        ),
      ],
    });
    meaning.classList.add("ls-diagnostic-intro");
    meaning.dataset.diagnosticMeaning = "true";

    const story = el("div", undefined, "ls-diagnostic-story");
    const productDetail = el("div");
    residualComponents.forEach((component) => {
      const products = component.terms.map((term) =>
        nativeMathNumber(term.product, "detail")
      );
      const sumNodes: Array<Element | string> = [];
      products.forEach((term, index) => {
        if (index > 0) sumNodes.push(mathOperator("+"));
        sumNodes.push(term);
      });
      productDetail.append(
        createNativeMath(
          [
            mathSubscript(
              mathRow([multiplyNodes(mathIdentifier("A"), xHatNode())]),
              mathNumberLiteral(String(component.row + 1))
            ),
            mathOperator("≈"),
            mathRow(sumNodes),
            mathOperator("≈"),
            nativeMathNumber(component.matrixVectorValue, "detail"),
          ],
          `A times x hat component ${component.row + 1} is approximately ${spokenNumber(component.matrixVectorValue, "detail")}`,
          { className: "ls-residual-component-math", dataMath: "matrix-vector-component" }
        )
      );
    });
    const productDetails = createAdvancedDetails({
      summary: "Show matrix-vector arithmetic",
      content: [productDetail],
    });
    productDetails.classList.add("ls-arithmetic-details");
    const product = createEvidenceBlock({
      level: "standard",
      heading: el("h3", "Substitute the computed solution"),
      lead: el(
        "p",
        "Substitute the computed solution into the original left-hand side to see what equations it satisfies."
      ),
      formulas: [
        createNamedVector(
          multiplyNodes(mathIdentifier("A"), xHatNode()),
          matrixVectorValues,
          "A times x hat",
          { dataMath: "matrix-vector-result", context: "diagnostic" }
        ),
      ],
      advancedDetails: productDetails,
    });
    product.prepend(el("p", "Step 1", "ls-diagnostic-step-label"));
    product.classList.add("ls-diagnostic-block");
    product.dataset.diagnosticBlock = "matrix-vector";

    const residual = createEvidenceBlock({
      level: "standard",
      heading: el("h3", "Find the equation mismatch"),
      lead: el(
        "p",
        "Compare the original right-hand side with the value produced by the computed solution."
      ),
      formulas: [
        createNativeMath(
          [
            mathIdentifier("r"),
            mathOperator("="),
            mathIdentifier("b"),
            mathOperator("−"),
            multiplyNodes(mathIdentifier("A"), xHatNode()),
          ],
          "r equals b minus A times x hat",
          {
            className: "ls-residual-equation",
            display: "block",
            dataMath: "residual-relation",
          }
        ),
        createNamedVector("r", result.residual, "residual vector r", {
          dataMath: "residual-vector",
          context: "diagnostic",
        }),
      ],
    });
    residual.prepend(el("p", "Step 2", "ls-diagnostic-step-label"));
    residual.classList.add("ls-diagnostic-block");
    residual.dataset.diagnosticBlock = "residual";
    const normNode = mathSubscript(
      mathRow([
        mathOperator("‖", { fence: true, stretchy: true }),
        mathIdentifier("r"),
        mathOperator("‖", { fence: true, stretchy: true }),
      ]),
      mathIdentifier("∞")
    );
    const norm = createEvidenceBlock({
      level: "standard",
      heading: el("h3", "Measure the largest mismatch"),
      lead: el(
        "p",
        "The infinity norm reports the largest absolute residual component."
      ),
      formulas: [
        createNativeMath(
          [
            normNode,
            mathOperator("="),
            mathSubscript(mathIdentifier("max"), mathIdentifier("i")),
            mathOperator("|", { fence: true, stretchy: true }),
            mathSubscript(mathIdentifier("r"), mathIdentifier("i")),
            mathOperator("|", { fence: true, stretchy: true }),
            mathOperator("="),
            nativeMathNumber(result.residualInfNorm, "diagnostic"),
          ],
          `the infinity norm of r equals the maximum absolute residual component, ${spokenNumber(result.residualInfNorm, "diagnostic")}`,
          {
            className: "ls-residual-norm",
            display: "block",
            dataMath: "residual-inf-norm",
          }
        ),
        el(
          "p",
          `The infinity norm is the largest absolute residual component${residualNorm?.kind === "residual_inf_norm" ? `, here component ${residualNorm.selectedMaximumRow + 1}` : ""}.`
        ),
      ],
    });
    norm.prepend(el("p", "Step 3", "ls-diagnostic-step-label"));
    norm.classList.add("ls-diagnostic-block");
    norm.dataset.diagnosticBlock = "residual-norm";
    story.append(product, residual);

    const limitation = el("aside", undefined, "ls-diagnostic-boundary");
    limitation.dataset.diagnosticLimitation = "true";
    limitation.append(
      el("strong", "Residual is not solution error"),
      el(
        "p",
        "It does not, by itself, guarantee a small solution error. Conditioning describes how sensitive the solution is to small changes in the problem data; this Lab does not compute a condition number or an error bound."
      )
    );

    const interpretation = el(
      "p",
      "A small residual means a small equation mismatch.",
      "ls-diagnostic-interpretation"
    );

    let reference: HTMLElement | undefined;
    if (result.referenceDifferenceInf !== undefined) {
      reference = createEvidenceBlock({
        level: "summary",
        heading: el("h3", "Difference from preset reference solution"),
        formulas: [
          createNativeMath(
            nativeMathNumber(result.referenceDifferenceInf, "diagnostic"),
            spokenNumber(result.referenceDifferenceInf, "diagnostic"),
            {
              className: "ls-reference-value",
              dataMath: "reference-difference",
            }
          ),
          el(
            "p",
            "This comparison is available only because the current inputs exactly match an approved preset fingerprint. It is not labeled as unqualified exact error."
          ),
        ],
      });
      reference.classList.add("ls-reference-comparison");
      reference.dataset.referenceComparison = "true";
    }

    let safeguard: HTMLDetailsElement | undefined;
    if (matrixScale?.kind === "matrix_scale") {
      const content = el("div", undefined, "ls-safeguard-content");
      const matrixNormNode = () =>
        mathSubscript(
          mathRow([
            mathOperator("‖", { fence: true, stretchy: true }),
            mathIdentifier("A"),
            mathOperator("‖", { fence: true, stretchy: true }),
          ]),
          mathIdentifier("∞")
        );
      const rowSums: Array<Element | string> = [];
      matrixScale.rows.forEach((row, index) => {
        if (index > 0) rowSums.push(mathOperator(","));
        rowSums.push(nativeMathNumber(row.absoluteSum, "detail"));
      });
      content.append(
        el(
          "p",
          "The matrix infinity norm is the largest absolute row sum. The Lab uses it only to scale an engineering pivot-acceptance safeguard."
        ),
        createNativeMath(
          [
            matrixNormNode(),
            mathOperator("="),
            mathIdentifier("max"),
            mathOperator("{"),
            mathRow(rowSums),
            mathOperator("}"),
            mathOperator("="),
            nativeMathNumber(matrixScale.matrixInfNorm, "ordinary"),
          ],
          `the infinity norm of A is the maximum row sum, ${spokenNumber(matrixScale.matrixInfNorm, "ordinary")}`,
          { className: "ls-safeguard-formula", display: "block", dataMath: "matrix-inf-norm" }
        ),
        createNativeMath(
          [
            mathSubscript(mathIdentifier("τ"), mathIdentifier("pivot")),
            mathOperator("="),
            nativeMathNumber(matrixScale.pivotUlpFactor, "ordinary"),
            mathIdentifier("ε"),
            matrixNormNode(),
            mathOperator("≈"),
            nativeMathNumber(matrixScale.tauPivot, "threshold"),
          ],
          `tau pivot equals 64 epsilon times the infinity norm of A, approximately ${spokenNumber(matrixScale.tauPivot, "threshold")}`,
          { className: "ls-safeguard-formula", display: "block", dataMath: "tau-pivot" }
        ),
        el(
          "p",
          `Pivot summary: ${result.rowSwapCount} row ${result.rowSwapCount === 1 ? "swap" : "swaps"}; ${result.pivots.length} accepted pivots. The threshold is a product safeguard, not a theorem proving singularity.`,
          "ls-muted"
        )
      );
      const implementation = el("details", undefined, "ls-implementation-detail");
      implementation.dataset.implementationDetail = "true";
      implementation.append(
        el("summary", "Implementation detail"),
        el(
          "p",
          "In this JavaScript binary64 implementation, epsilon corresponds to Number.EPSILON. This identifier is implementation detail, not the default algorithm story."
        )
      );
      content.append(implementation);
      safeguard = createAdvancedDetails({
        summary: "Solver safeguard details",
        content: [content],
      });
      safeguard.classList.add("ls-safeguard-details");
      safeguard.dataset.solverSafeguardDetails = "true";
    }
    const analysisSections: AnalysisSurfaceSection[] = [];
    if (status) analysisSections.push({ role: "status", nodes: [status] });
    analysisSections.push(
      { role: "purpose", nodes: [context, meaning] },
      { role: "limitation", nodes: [limitation] },
      { role: "evidence", nodes: [story] },
      { role: "primary-finding", nodes: [norm] },
      { role: "interpretation", nodes: [interpretation] }
    );
    if (reference) {
      analysisSections.push({ role: "evidence", nodes: [reference] });
    }
    if (safeguard) {
      analysisSections.push({ role: "advanced-details", nodes: [safeguard] });
    }
    const analysis = createAnalysisSurface({ heading, sections: analysisSections });
    analysis.classList.add("ls-diagnostics-analysis");
    panel.append(analysis);
    const actions = el("div", undefined, "ls-panel-actions");
    actions.append(
      button("Back to Output", "ls-button ls-button-ghost", () => goToStep("output")),
      button("Edit Data", "ls-button ls-button-secondary", () => goToStep("data"))
    );
    panel.append(actions);
    return panel;
  }

  function closeResetDialog(restoreFocus: boolean): void {
    if (!activeResetDialog) return;
    activeResetDialog.remove();
    activeResetDialog = undefined;
    document.removeEventListener("keydown", onResetKeydown);
    inertBackground.forEach(({ element, wasInert }) => {
      if (!wasInert) element.removeAttribute("inert");
    });
    inertBackground = [];
    if (restoreFocus && resetTrigger?.isConnected) {
      resetTrigger.focus({ preventScroll: true });
    }
    resetTrigger = undefined;
  }

  function onResetKeydown(event: KeyboardEvent): void {
    const dialog = activeResetDialog;
    if (!dialog) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeResetDialog(true);
      return;
    }
    if (event.key !== "Tab") return;
    const controls = [...dialog.querySelectorAll<HTMLElement>("input, button")].filter(
      (control) => !control.hasAttribute("disabled")
    );
    const first = controls[0];
    const last = controls.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function resetExperiment(clearTutorConversation: boolean): void {
    if (!isCurrent()) return;
    const fresh = createLinearSystemsSession();
    const at = (options.now ?? Date.now)();
    closeResetDialog(false);
    session = fresh;
    lastFailure = undefined;
    computationExpanded = false;
    failureComputationExpanded = false;
    lastMeaningfulInteraction = undefined;
    options.lifecycle?.applyConfirmedReset?.({
      session: fresh,
      metadata: {
        labMeaningful: false,
        tutorMeaningful: false,
        meaningful: false,
        resumeSummary: createLinearSystemsResumeSummary(fresh, 0),
      },
      clearTutorConversation,
      at,
    });
    tutor.refreshContext();
    render();
    announce("New experiment started with Starter 3×3.");
    queueMicrotask(() => {
      if (!isCurrent()) return;
      app.querySelector<HTMLElement>("[data-route-focus]")?.focus({
        preventScroll: true,
      });
    });
  }

  function openResetDialog(trigger: HTMLElement): void {
    if (activeResetDialog || disposed) return;
    resetTrigger = trigger;
    const backdrop = el("div", undefined, "ls-reset-backdrop");
    backdrop.dataset.newExperimentDialog = "true";
    backdrop.setAttribute("role", "dialog");
    backdrop.setAttribute("aria-modal", "true");
    backdrop.setAttribute("aria-labelledby", `ls-reset-title-${instanceId}`);
    const dialog = el("section", undefined, "ls-reset-dialog");
    const title = el("h2", "Reset the Linear Systems experiment?");
    title.id = `ls-reset-title-${instanceId}`;
    dialog.append(
      title,
      el(
        "p",
        "This returns to Starter 3×3 and clears the current result and local walkthrough view."
      )
    );
    const clearTutorLabel = el("label", undefined, "ls-reset-tutor-choice");
    const clearTutor = document.createElement("input");
    clearTutor.type = "checkbox";
    clearTutor.checked = true;
    clearTutor.dataset.clearTutor = "true";
    clearTutorLabel.append(clearTutor, document.createTextNode("Also clear this Lab's Tutor conversation"));
    dialog.append(clearTutorLabel);
    const actions = el("div", undefined, "ls-panel-actions");
    const cancel = button("Cancel", "ls-button ls-button-ghost", () =>
      closeResetDialog(true)
    );
    cancel.dataset.resetCancel = "true";
    const confirm = button("New experiment", "ls-button ls-button-danger", () => resetExperiment(clearTutor.checked));
    confirm.dataset.resetConfirm = "true";
    actions.append(cancel, confirm);
    dialog.append(actions);
    backdrop.append(dialog);
    activeResetDialog = backdrop;
    inertBackground = [...document.body.children]
      .filter((child): child is HTMLElement => child instanceof HTMLElement)
      .map((element) => ({ element, wasInert: element.hasAttribute("inert") }));
    inertBackground.forEach(({ element }) => element.setAttribute("inert", ""));
    document.body.append(backdrop);
    document.addEventListener("keydown", onResetKeydown);
    cancel.focus();
  }

  function render(): void {
    if (!isCurrent()) return;
    const breadcrumb = el("nav");
    breadcrumb.setAttribute("aria-label", "Breadcrumb");
    const overview = document.createElement("a");
    overview.href = "/linear-algebra";
    overview.textContent = "Numerical Linear Algebra";
    breadcrumb.append(
      overview,
      document.createTextNode(" / "),
      el("span", "Linear Systems Lab")
    );
    const title = el("h1", "Linear Systems Lab");
    title.dataset.routeFocus = "true";
    title.tabIndex = -1;
    const reset: HTMLButtonElement = applyLabActionRole(
      button("New experiment", "ls-button ls-button-ghost", () =>
        openResetDialog(reset)
      ),
      "secondary"
    );
    reset.dataset.newExperiment = "true";
    const lede = paragraph(
      [
        "Solve ",
        math("A x = b", "A times x equals b", "system-equation"),
        ", inspect how partial pivoting builds ",
        math("P A = L U", "P times A equals L times U", "factorization-relation"),
        ", and check the computed solution against the original equations.",
      ]
    );
    const identity = el("p");
    identity.dataset.experimentIdentity = "true";
    identity.textContent = experimentIdentityText();
    const stage =
      session.step === "method"
        ? createMethodPanel()
        : session.step === "data"
          ? createDataPanel()
          : session.step === "output"
            ? createOutputPanel()
            : createDiagnosticsPanel();
    const announcements = el("p", undefined, "sr-only");
    announcements.setAttribute("role", "status");
    announcements.setAttribute("aria-live", "polite");
    announcements.setAttribute("aria-atomic", "true");
    announcements.dataset.linearSystemsStatus = "true";
    const root = createLabShell({
      header: createLabHeader({
        breadcrumb,
        title,
        lede,
        identity,
        actions: [reset],
      }),
      workflow: createLinearSystemsWorkflowNavigation(),
      stage,
      afterStage: [announcements],
      className: "linear-systems-shell",
    });
    disposeWorkflowNavigation(
      app.querySelector<HTMLElement>("[data-workflow-navigation]")
    );
    app.replaceChildren(root);
  }

  render();
  publish();

  return Object.freeze({
    getTutorBinding(): LabTutorBinding { return tutor.binding; },
    getSession(): LinearSystemsSessionState {
      return session;
    },
    getResumeSummary(): ResumeSummary | undefined {
      return createLinearSystemsResumeSummary(
        session,
        lastMeaningfulInteraction ?? 0
      );
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      tutor.dispose();
      closeResetDialog(false);
      if (activeMounts.get(app) === token) {
        activeMounts.delete(app);
        disposeWorkflowNavigation(
          app.querySelector<HTMLElement>("[data-workflow-navigation]")
        );
        app.replaceChildren();
      }
    },
  });
}
