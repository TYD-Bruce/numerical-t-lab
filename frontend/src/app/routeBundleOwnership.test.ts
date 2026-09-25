import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = resolve(process.cwd(), "frontend", "src");

function source(path: string): string {
  return readFileSync(resolve(SRC, path), "utf8");
}

function localStaticImports(path: string): string[] {
  const text = source(path);
  const imports = [
    ...text.matchAll(/import\s+(?!type\b)[\s\S]*?from\s+["'](\.[^"']+)["']/g),
    ...text.matchAll(/import\s+["'](\.[^"']+)["']/g),
  ].map((match) => match[1]!);
  return imports.flatMap((specifier) => {
    const base = resolve(SRC, dirname(path), specifier);
    for (const candidate of [`${base}.ts`, `${base}.css`, resolve(base, "index.ts")]) {
      try {
        readFileSync(candidate);
        return [candidate.slice(SRC.length + 1).replaceAll("\\", "/")];
      } catch {
        // Try the next local source candidate.
      }
    }
    return [];
  });
}

function eagerGraph(entry: string): Set<string> {
  const visited = new Set<string>();
  const pending = [entry];
  while (pending.length) {
    const path = pending.pop()!;
    if (visited.has(path)) continue;
    visited.add(path);
    if (!path.endsWith(".ts")) continue;
    pending.push(...localStaticImports(path));
  }
  return visited;
}

describe("public route bundle ownership", () => {
  it("keeps shared Tutor interpretation independent of ODE and route loads free of Tutor networking", () => {
    const panel = [...eagerGraph("tutor/platformTutorPanel.ts")];
    expect(panel.filter(file => file.startsWith("labs/"))).toEqual([]);
    for (const route of ["labs/ode/initialValueProblemsRoute.ts", "labs/linear-algebra/linearSystemsRoute.ts"]) {
      const graph = eagerGraph(route);
      expect(graph.has("tutor/platformTutorPanel.ts")).toBe(false);
      expect(graph.has("tutor/tutorClient.ts")).toBe(false);
    }
  });
  it("keeps the production entry and bootstrap eager graph platform-only", () => {
    const graph = eagerGraph("main.ts");
    expect([...graph]).toContain("app/platformBootstrap.ts");
    for (const forbidden of [
      "labs/ode/odeApp.ts",
      "labs/ode/initialValueProblemsRoute.ts",
      "labs/ode/problemPresets.ts",
      "labs/linear-algebra/linearSystemsApp.ts",
      "labs/linear-algebra/linearSystemsRoute.ts",
      "labs/linear-algebra/computationWalkthrough.ts",
      "tutor/platformTutorPanel.ts",
      "tutor/tutorClient.ts",
      "tutor/aiTutor.ts",
      "math/ui/editableMathField.ts",
      "dev/glossary/glossaryPlaygroundRoute.ts",
      "dev/glossary/glossaryFixtures.ts",
      "dev/glossary/glossaryDevelopmentControls.ts",
      "dev/glossary/glossaryPlayground.css",
      "dev/mathml/mathmlCapabilityRoute.ts",
      "dev/mathml/mathmlCapability.css",
      "dev/presentation/presentationSystemRoute.ts",
      "dev/presentation/presentationSystem.css",
      "math/nativeMath.ts",
    ]) {
      expect(graph.has(forbidden), `${forbidden} leaked into ${[...graph].join(", ")}`).toBe(false);
    }
    const eagerSource = [...graph].map(source).join("\n");
    expect(eagerSource).not.toContain("@numerical-t-lab/numerics");
    expect(
      [...graph].filter((path) => path.startsWith("components/lab-presentation/"))
    ).toEqual([]);
  });

  it("keeps shared Lab presentation behind both complete-Lab lazy boundaries", () => {
    const expectedShared = [
      "components/lab-presentation/labShell.ts",
      "components/lab-presentation/stageSection.ts",
      "components/lab-presentation/supportingElements.ts",
      "components/lab-presentation/workflowNavigation.ts",
    ];
    const odeGraph = eagerGraph("labs/ode/initialValueProblemsRoute.ts");
    const linearSystemsGraph = eagerGraph(
      "labs/linear-algebra/linearSystemsRoute.ts"
    );

    for (const sharedPath of expectedShared) {
      expect(odeGraph.has(sharedPath), `${sharedPath} missing from ODE`).toBe(true);
      expect(
        linearSystemsGraph.has(sharedPath),
        `${sharedPath} missing from Linear Systems`
      ).toBe(true);
    }
    expect(source("components/lab-presentation/labShell.ts")).toContain(
      'import "./labPresentation.css"'
    );
  });

  it("keeps ModuleOverview entry-safe and separate from complete-Lab presentation", () => {
    const entryGraph = eagerGraph("main.ts");
    const moduleOverviewGraph = eagerGraph("pages/moduleOverview.ts");

    expect(entryGraph.has("pages/moduleOverview.ts")).toBe(true);
    expect([...moduleOverviewGraph]).toEqual(["pages/moduleOverview.ts"]);
    expect(source("pages/moduleOverview.ts")).not.toMatch(
      /components\/lab-presentation|labs\/|@numerical-t-lab|Chart|MathLive|compute-engine|Tutor|Glossary|ComputationTrace|computationTrace|Motion|AppSessionStore|Session|Router/
    );
    expect(
      [...entryGraph].filter((path) =>
        path.startsWith("components/lab-presentation/")
      )
    ).toEqual([]);
  });

  it("loads the shared inner-presentation structures only with their migrated Lab routes", () => {
    const migratedPresentationModules = [
      "components/lab-presentation/problemContext.ts",
      "components/lab-presentation/teachingBlock.ts",
      "components/lab-presentation/primaryResult.ts",
      "components/lab-presentation/evidenceBlock.ts",
    ];
    const walkthroughModule =
      "components/lab-presentation/computationWalkthroughShell.ts";
    const analysisSurfaceModule =
      "components/lab-presentation/analysisSurface.ts";
    const entryGraph = eagerGraph("main.ts");
    const odeGraph = eagerGraph("labs/ode/initialValueProblemsRoute.ts");
    const linearSystemsGraph = eagerGraph(
      "labs/linear-algebra/linearSystemsRoute.ts"
    );

    for (const modulePath of migratedPresentationModules) {
      expect(odeGraph.has(modulePath), `${modulePath} missing from ODE`).toBe(
        true
      );
      expect(entryGraph.has(modulePath), `${modulePath} entered production entry`).toBe(
        false
      );
      expect(
        linearSystemsGraph.has(modulePath),
        `${modulePath} missing from migrated Linear Systems`
      ).toBe(true);
    }
    expect(entryGraph.has(walkthroughModule)).toBe(false);
    expect(odeGraph.has(walkthroughModule)).toBe(false);
    expect(linearSystemsGraph.has(walkthroughModule)).toBe(true);
    expect(entryGraph.has(analysisSurfaceModule)).toBe(false);
    expect(odeGraph.has(analysisSurfaceModule)).toBe(true);
    expect(linearSystemsGraph.has(analysisSurfaceModule)).toBe(true);
    const sharedSource = [
      ...migratedPresentationModules,
      walkthroughModule,
      analysisSurfaceModule,
    ].map(source).join("\n");
    expect(sharedSource).not.toMatch(
      /labs\/(?:ode|linear-algebra)|app\/(?:router|appSessionStore)|@numerical-t-lab|chart\.js|mathlive|compute-engine|Tutor|Glossary|ComputationTrace|computationTrace|computationMotion|convergenceStudy/
    );
    expect(source("labs/ode/odeApp.ts")).not.toMatch(
      /createComputationWalkthroughShell|createAnalysisSurface/
    );
    expect(source("labs/ode/convergenceStudyView.ts")).toMatch(
      /createAnalysisSurface/
    );
    expect(source("labs/linear-algebra/linearSystemsApp.ts")).toMatch(
      /createAnalysisSurface/
    );
  });

  it("registers ODE through a dynamic import and no production placeholder", () => {
    const registry = source("app/moduleRegistry.ts");
    expect(registry).toMatch(
      /import\(["']\.\.\/labs\/ode\/initialValueProblemsRoute["']\)/,
    );
    expect(registry).not.toContain("PhaseOne");
    expect(registry).not.toContain("placeholder");
    expect(source("main.ts")).not.toContain("initialValueProblemsRoute");
  });

  it("registers Linear Systems through an independent dynamic route boundary", () => {
    const registry = source("app/moduleRegistry.ts");
    expect(registry).toMatch(
      /import\(["']\.\.\/labs\/linear-algebra\/linearSystemsRoute["']\)/
    );
    expect(source("main.ts")).not.toContain("linearSystemsRoute");
    expect(eagerGraph("main.ts").has("labs/linear-algebra/linearSystemsApp.ts")).toBe(
      false
    );
    const walkthrough = source(
      "labs/linear-algebra/computationWalkthrough.ts"
    );
    expect(walkthrough).not.toMatch(
      /solveLinearSystem|runLinearSystemsSession|Gaussian elimination\s*\(/
    );
    const motion = source("labs/linear-algebra/computationMotion.ts");
    expect(motion).not.toMatch(
      /@numerical-t-lab\/numerics|solveLinearSystem|runLinearSystemsSession|AppSessionStore/
    );
    expect(motion).not.toMatch(/localStorage|sessionStorage|history\./);
    const graph = eagerGraph("labs/linear-algebra/linearSystemsRoute.ts");
    expect(graph.has("math/structuredMath.ts")).toBe(true);
    expect(graph.has("math/nativeMath.ts")).toBe(true);
    expect(graph.has("labs/linear-algebra/computationMotion.ts")).toBe(false);
    expect(graph.has("dev/mathml/mathmlCapabilityRoute.ts")).toBe(false);
    expect(graph.has("dev/mathml/mathmlCapability.css")).toBe(false);
    expect([...graph].some((path) => path.startsWith("math/ui/"))).toBe(false);
    const linearSystemsSource = [...graph].map(source).join("\n");
    expect(linearSystemsSource).not.toMatch(
      /(?:from\s+|import\()\s*["'](?:mathlive|@cortex-js\/compute-engine|katex|mathjax)/i
    );
    expect(source("math/structuredMath.ts")).not.toMatch(
      /mathlive|compute-engine|readonlyMath|innerHTML/i
    );
  });

  it("keeps static pages, shell, Host, and ODE route outside complete Tutor runtime", () => {
    const staticSources = [
      "app/appShell.ts",
      "pages/homePage.ts",
      "pages/odeOverviewPage.ts",
      "pages/linearAlgebraOverviewPage.ts",
      "pages/pdeOverviewPage.ts",
      "pages/aboutPage.ts",
    ].map(source).join("\n");
    expect(staticSources).not.toMatch(/odeApp|initialValueProblemsRoute|platformTutorPanel|tutorClient|aiTutor/);
    expect(source("app/platformTutorHost.ts")).not.toMatch(
      /import\s+\{[^}]*\}\s+from ["']\.\.\/tutor\/platformTutorPanel["']/s
    );
    const odeRoute = source("labs/ode/initialValueProblemsRoute.ts");
    expect(odeRoute).not.toMatch(/platformTutorPanel|tutorClient|aiTutorPanel/);
    expect(source("pages/homePage.ts")).not.toMatch(
      /OdeSessionState|odeSession|initialValueProblemsRoute|AppSessionStore/
    );
    expect(staticSources).not.toMatch(
      /linearSystemsApp|linearSystemsRoute|linearSystemsNumerics|computationWalkthrough/
    );
    expect(source("app/beforeUnload.ts")).not.toMatch(
      /getSession|odeApp|initialValueProblemsRoute|querySelector|MathLive/
    );
  });

  it("retains MathLive and editable/Compute Engine dynamic imports", () => {
    const app = source("labs/ode/odeApp.ts");
    expect(app).toContain('import("../../math/ui/editableMathField")');
    expect(app).not.toMatch(/from ["']mathlive["']/);
    expect(source("math/ui/readonlyMath.ts")).toMatch(/import\(["']mathlive["']\)/);
    expect(source("math/ui/editableMathField.ts")).toContain(
      'from "./mathFieldState"'
    );
    expect(source("math/mathJsonAdapter.ts")).toContain(
      'from "@cortex-js/compute-engine"'
    );
  });

  it("keeps scroll platform-only and New experiment inside the ODE boundary", () => {
    const scroll = source("app/scrollRestoration.ts");
    expect(scroll).not.toMatch(
      /odeApp|initialValueProblemsRoute|Chart|MathLive|localStorage|sessionStorage/
    );
    const odeApp = source("labs/ode/odeApp.ts");
    expect(odeApp).toContain("dataset.newExperiment");
    expect(odeApp).not.toMatch(
      /AppSessionStore|createPlatformRouter|window\.history|history\.(?:pushState|replaceState)/
    );
    expect(source("app/appSessionStore.ts")).not.toMatch(
      /odeApp|odeSession|initialValueProblemsRoute/
    );
  });

  it("keeps Glossary state out of Store and only the lightweight loader in the eager platform graph", () => {
    const storeGraph = eagerGraph("app/appSessionStore.ts");
    expect(
      [...storeGraph].filter((path) => path.startsWith("glossary/"))
    ).toEqual([]);

    const contractGraph = eagerGraph("app/contracts.ts");
    expect(
      [...contractGraph].filter((path) => path.startsWith("glossary/"))
    ).toEqual([]);

    const entryGraph = eagerGraph("main.ts");
    expect(
      [...entryGraph].filter((path) => path.startsWith("glossary/")).sort()
    ).toEqual(["glossary/glossarySurfaceLoader.ts"]);
    expect(
      [...entryGraph].some(
        (path) =>
          path.startsWith("glossary/surface/") ||
          path.includes("glossaryRegistry") ||
          path.includes("glossaryScope") ||
          path.includes("glossaryFixtures")
      )
    ).toBe(false);
    expect(
      [...entryGraph].filter((path) => path.startsWith("dev/"))
    ).toEqual([]);

    const glossaryGraph = eagerGraph("glossary/glossaryController.ts");
    expect(glossaryGraph.has("app/appSessionStore.ts")).toBe(false);
  });

  it("keeps production About independent from DEV implementations", () => {
    const about = source("pages/aboutPage.ts");
    expect(about).not.toMatch(
      /(?:from\s+|import\()\s*["'][^"']*dev\/glossary/
    );
    expect(about).not.toContain("glossaryDevelopmentControls");
    expect(about).not.toContain("glossaryPlaygroundRoute");
  });
});
