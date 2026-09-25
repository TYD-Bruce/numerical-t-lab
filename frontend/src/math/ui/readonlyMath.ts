export interface ReadonlyMathContent {
  latex: string;
  displayText: string;
  ariaLabel: string;
}

export type ReadonlyMathDisplay = "inline" | "block";

export interface StaticMathElement extends HTMLElement {
  format: "latex";
  mode: "textstyle" | "displaystyle";
  render(): void;
}

export interface ReadonlyMathBackend {
  createMathSpan(): StaticMathElement;
}

export type ReadonlyMathBackendLoader = () => Promise<ReadonlyMathBackend>;

export interface ReadonlyMathHandle {
  dispose(): void;
}

interface RenderState {
  revision: number;
  content: ReadonlyMathContent;
}

const renderStates = new WeakMap<HTMLElement, RenderState>();

export function createCachedMathBackendLoader(
  importer: () => Promise<ReadonlyMathBackend>
): ReadonlyMathBackendLoader {
  let pending: Promise<ReadonlyMathBackend> | undefined;
  return () => {
    pending ??= importer();
    return pending;
  };
}

let mathLiveModulePromise: Promise<typeof import("mathlive")> | undefined;

/** Shared deferred dependency boundary for static and editable MathLive UI. */
export function loadMathLiveModule(): Promise<typeof import("mathlive")> {
  mathLiveModulePromise ??= Promise.all([
    import("mathlive"),
    import("mathlive/fonts.css"),
    import("mathlive/static.css"),
  ]).then(([mathlive]) => {
    // CSS above owns bundled fonts. Never infer asset paths from a lazy chunk.
    mathlive.MathfieldElement.fontsDirectory = null;
    mathlive.MathfieldElement.soundsDirectory = null;
    return mathlive;
  });
  return mathLiveModulePromise;
}

const loadDefaultBackend = createCachedMathBackendLoader(async () => {
  const mathlive = await loadMathLiveModule();
  return {
    createMathSpan: () => new mathlive.MathSpanElement() as StaticMathElement,
  };
});

function showFallback(
  target: HTMLElement,
  content: ReadonlyMathContent,
  display: ReadonlyMathDisplay
): void {
  target.classList.remove("readonly-math-inline", "readonly-math-block");
  target.classList.add("readonly-math", `readonly-math-${display}`, "readonly-math-fallback");
  target.setAttribute("role", "math");
  target.setAttribute("aria-label", content.ariaLabel);
  target.tabIndex = -1;
  target.replaceChildren(document.createTextNode(content.displayText));
}

function isCurrent(
  target: HTMLElement,
  state: RenderState
): boolean {
  return target.isConnected && renderStates.get(target) === state;
}

function clearReadonlyMath(target: HTMLElement): void {
  target.classList.remove(
    "readonly-math",
    "readonly-math-inline",
    "readonly-math-block",
    "readonly-math-fallback"
  );
  target.removeAttribute("role");
  target.removeAttribute("aria-label");
  target.removeAttribute("tabindex");
  target.replaceChildren();
}

export function renderReadonlyMath(
  target: HTMLElement,
  content: ReadonlyMathContent,
  options: {
    display?: ReadonlyMathDisplay;
    loadBackend?: ReadonlyMathBackendLoader;
  } = {}
): ReadonlyMathHandle {
  const display = options.display ?? "inline";
  const revision = (renderStates.get(target)?.revision ?? 0) + 1;
  const state: RenderState = { revision, content };
  renderStates.set(target, state);
  showFallback(target, content, display);

  let disposed = false;
  const handle: ReadonlyMathHandle = Object.freeze({
    dispose(): void {
      if (disposed) return;
      disposed = true;
      if (renderStates.get(target) !== state) return;
      renderStates.delete(target);
      clearReadonlyMath(target);
    },
  });

  const loadBackend = options.loadBackend ?? loadDefaultBackend;
  let pendingBackend: Promise<ReadonlyMathBackend>;
  try {
    pendingBackend = loadBackend();
  } catch {
    return handle;
  }

  void pendingBackend
    .then((backend) => {
      if (!isCurrent(target, state)) return;
      const math = backend.createMathSpan();
      math.format = "latex";
      math.mode = display === "block" ? "displaystyle" : "textstyle";
      math.textContent = content.latex;
      math.setAttribute("role", "math");
      math.setAttribute("aria-label", content.ariaLabel);
      math.tabIndex = -1;

      let failed = false;
      const restore = (): void => {
        failed = true;
        if (isCurrent(target, state)) showFallback(target, content, display);
      };
      math.addEventListener("error", restore, { once: true });

      try {
        math.render();
        if (failed || !isCurrent(target, state)) return;
        target.classList.remove("readonly-math-fallback", "readonly-math-inline", "readonly-math-block");
        target.classList.add("readonly-math", `readonly-math-${display}`);
        target.removeAttribute("role");
        target.removeAttribute("aria-label");
        target.removeAttribute("tabindex");
        target.replaceChildren(math);
      } catch {
        restore();
      }
    })
    .catch(() => {
      // The meaningful fallback is already present. Rendering is display-only.
    });

  return handle;
}
