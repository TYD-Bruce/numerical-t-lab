// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ChatResponse } from "@numerical-t-lab/contracts/tutor";
import type { LabTutorBinding, MountedRoute } from "../../app/contracts";
import { createAppSessionStore, assertPureValue } from "../../app/appSessionStore";
import { createCompleteLabRoute } from "../../app/labRouteAdapter";
import { createPlatformTutorHost } from "../../app/platformTutorHost";
import { createScrollRestoration } from "../../app/scrollRestoration";
import { mountPlatformTutorPanel, type PlatformTutorPanelOptions } from "../../tutor/platformTutorPanel";
import { appendTutorMessage } from "../../tutor/moduleTutorSession";
import * as linearSystemsRoute from "./linearSystemsRoute";
import type { LinearSystemsSessionState } from "./linearSystemsSession";

const dispose: Array<() => void> = [];
afterEach(() => { dispose.splice(0).reverse().forEach(cleanup => cleanup()); document.body.replaceChildren(); vi.restoreAllMocks(); });

function fixture() {
  const lab = document.createElement("main"), panel = document.createElement("aside"); document.body.append(lab, panel);
  const store = createAppSessionStore();
  const send = vi.fn<NonNullable<PlatformTutorPanelOptions["sendMessage"]>>().mockResolvedValue({ message: "Recorded explanation." });
  let binding!: LabTutorBinding;
  const host = createPlatformTutorHost({ target: panel, labTarget: lab, isMobile: () => false,
    loadPanel: async () => ({ mountPlatformTutorPanel(target, options) {
      binding = options.binding;
      return mountPlatformTutorPanel(target, { ...options, sendMessage: send });
    } }),
  });
  const route = createCompleteLabRoute({ moduleId: "linear_algebra", routeId: "linear-algebra-linear-systems", labModule: linearSystemsRoute,
    store, tutorHost: host, scrollRestoration: createScrollRestoration({ store }),
    glossaryHost: { connect: vi.fn(), disconnect: vi.fn(), close: vi.fn(), dispose: vi.fn() },
  });
  let mounted: MountedRoute | undefined;
  const mount = () => { mounted = route.mount({ target: lab, navigate: vi.fn(), location: { pathname: "/linear-algebra/linear-systems", search: "", hash: "" } }); };
  const leave = () => { mounted?.dispose(); mounted = undefined; };
  mount(); dispose.push(() => { leave(); host.dispose(); });
  const data = () => lab.querySelector<HTMLButtonElement>("[data-workflow-step='data']")!.click();
  const solve = () => { data(); lab.querySelector<HTMLButtonElement>("[data-run-linear-system]")!.click(); };
  const open = async () => { await Promise.resolve(); await host.open(lab.querySelector<HTMLElement>("[data-tutor-open]")!); };
  const submit = (text = "Explain this result") => {
    const input = panel.querySelector<HTMLTextAreaElement>("textarea")!;
    input.value = text; input.dispatchEvent(new Event("input", { bubbles: true }));
    panel.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  };
  const edit = (selector: string, value: string) => {
    const input = lab.querySelector<HTMLInputElement>(selector)!; input.value = value; input.dispatchEvent(new Event("input", { bubbles: true }));
  };
  return { lab, panel, store, send, host, solve, data, open, submit, edit, mount, leave, binding: () => binding };
}

describe("Linear Tutor with the real Lab, route, Store, Host and panel", () => {
  it("starts unavailable, publishes current evidence, and preserves history on close and navigation", async () => {
    const f = fixture(); await f.open();
    expect(f.panel.querySelector<HTMLTextAreaElement>("textarea")!.disabled).toBe(true);
    expect(f.panel.textContent).toContain("Solve a system first"); f.submit(); expect(f.send).not.toHaveBeenCalled();
    f.solve(); expect(f.panel.querySelector<HTMLTextAreaElement>("textarea")!.disabled).toBe(false);
    f.submit(); await vi.waitFor(() => expect(f.store.getTutor("linear_algebra").items).toHaveLength(2));
    const result = f.store.getLab<LinearSystemsSessionState>("linear_algebra")!.latestSuccessfulResult!;
    expect(f.send).toHaveBeenCalledWith(expect.objectContaining({ context: expect.objectContaining({ originalA: result.originalA, xHat: result.xHat }) }), expect.any(AbortSignal), "linear_algebra");
    const history = f.store.getTutor("linear_algebra").items;
    // Presentation state is re-frozen by the pure session helper on open/close.
    f.host.close(); await f.open(); expect(f.store.getTutor("linear_algebra").items).toEqual(history);
    f.leave(); f.mount(); await f.open();
    expect(f.panel.textContent).toContain("Recorded explanation."); expect(f.store.getTutor("linear_algebra").items).toEqual(history);
    expect(() => assertPureValue(f.store.getLab("linear_algebra"))).not.toThrow();
    expect(() => assertPureValue(f.store.getTutor("linear_algebra"))).not.toThrow();
  });

  it.each(["answer", "error"])("cancels stale context and suppresses its late %s", async outcome => {
    const f = fixture(); f.solve(); await f.open();
    let resolve!: (value: ChatResponse) => void, reject!: (error: Error) => void;
    f.send.mockImplementationOnce(() => new Promise((done, fail) => { resolve = done; reject = fail; }));
    f.submit(); const signal = f.send.mock.calls[0][1];
    f.data(); f.edit("[data-vector-b-row='0']", "");
    expect(signal.aborted).toBe(true); expect(f.binding().getContext().status).toBe("unavailable");
    if (outcome === "answer") resolve({ message: "STALE RESPONSE", chartInstruction: { type: "line_chart" } });
    else reject(new Error("STALE RESPONSE"));
    await Promise.resolve(); await Promise.resolve();
    expect(f.store.getTutor("linear_algebra").items).toHaveLength(1);
    expect(f.panel.textContent).not.toContain("STALE RESPONSE");
    expect(f.panel.querySelector<HTMLElement>(".ai-error")!.hidden).toBe(true);
  });

  it("preserves history after a failed solve and resets only this Lab after a successful solve", async () => {
    const f = fixture(); f.solve(); await f.open(); f.submit();
    await vi.waitFor(() => expect(f.store.getTutor("linear_algebra").items).toHaveLength(2));
    f.store.updateTutor("ode", session => appendTutorMessage(session, "user", "Keep ODE history"));
    const ode = f.store.getTutor("ode"), history = f.store.getTutor("linear_algebra").items;
    f.data();
    for (const input of f.lab.querySelectorAll<HTMLInputElement>("[data-matrix-a-row]")) { input.value = "0"; input.dispatchEvent(new Event("input", { bubbles: true })); }
    f.lab.querySelector<HTMLButtonElement>("[data-run-linear-system]")!.click();
    expect(f.lab.querySelector("[data-solve-failure]")).not.toBeNull();
    expect(f.store.getTutor("linear_algebra").items).toBe(history); expect(f.binding().getContext().status).toBe("unavailable");
    const preset = f.lab.querySelector<HTMLSelectElement>("[data-preset-select]")!;
    preset.value = "starter_3x3"; preset.dispatchEvent(new Event("change", { bubbles: true })); f.solve();
    expect(f.store.getTutor("linear_algebra").items).toHaveLength(0);
    expect(f.store.getTutor("ode")).toBe(ode); expect(f.binding().getContext().status).toBe("ready");
  });

  it("retains a qualified old transcript only when reset explicitly requests it", async () => {
    const f = fixture(); f.solve(); await f.open(); f.submit();
    await vi.waitFor(() => expect(f.store.getTutor("linear_algebra").items).toHaveLength(2));
    f.lab.querySelector<HTMLButtonElement>("[data-new-experiment]")!.click();
    document.querySelector<HTMLInputElement>("[data-clear-tutor]")!.checked = false;
    document.querySelector<HTMLButtonElement>("[data-reset-confirm]")!.click();
    expect(f.store.getTutor("linear_algebra").items).toHaveLength(3);
    expect(f.store.getTutor("linear_algebra").items.at(-1)).toMatchObject({ kind: "divider", title: "New experiment started" });
    expect(f.store.getLabMetadata("linear_algebra")!.meaningful).toBe(true);
    expect(f.panel.querySelector<HTMLTextAreaElement>("textarea")!.disabled).toBe(true);
    f.lab.querySelector<HTMLButtonElement>("[data-new-experiment]")!.click();
    expect(document.querySelector<HTMLInputElement>("[data-clear-tutor]")!.checked).toBe(true);
    document.querySelector<HTMLButtonElement>("[data-reset-confirm]")!.click();
    expect(f.store.getTutor("linear_algebra").items).toHaveLength(0);
    expect(f.store.getLabMetadata("linear_algebra")!.meaningful).toBe(false);
  });

  it.each(["cancel", "navigation"])("aborts on %s without accepting a late reply", async action => {
    const f = fixture(); f.solve(); await f.open();
    let resolve!: (value: ChatResponse) => void;
    f.send.mockImplementationOnce(() => new Promise(done => { resolve = done; })); f.submit();
    const signal = f.send.mock.calls[0][1];
    if (action === "cancel") f.panel.querySelector<HTMLButtonElement>(".ai-cancel")!.click(); else f.leave();
    expect(signal.aborted).toBe(true); resolve({ message: "LATE REPLY" });
    await Promise.resolve(); await Promise.resolve();
    expect(f.store.getTutor("linear_algebra").items).toHaveLength(1); expect(f.panel.textContent).not.toContain("LATE REPLY");
  });
});
