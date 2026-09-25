import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { build, resolveConfig } from "vite";

let outputDirectory = "";
let indexHtml = "";
let manifest: Record<
  string,
  { file: string; css?: string[]; imports?: string[]; dynamicImports?: string[] }
> = {};
let emittedCss = "";
let emittedJavaScript = "";

describe("Vite root-base deployment contract", () => {
  beforeAll(async () => {
    const configFile = resolve(process.cwd(), "frontend", "vite.config.ts");
    const config = await resolveConfig({ configFile }, "build");
    expect(config.base).toBe("/");

    outputDirectory = await mkdtemp(join(tmpdir(), "numerical-t-lab-vite-base-"));
    await build({
      configFile,
      logLevel: "silent",
      build: {
        emptyOutDir: true,
        manifest: true,
        outDir: outputDirectory,
      },
    });

    indexHtml = await readFile(join(outputDirectory, "index.html"), "utf8");
    manifest = JSON.parse(
      await readFile(join(outputDirectory, ".vite", "manifest.json"), "utf8"),
    ) as typeof manifest;

    const assetDirectory = join(outputDirectory, "assets");
    const cssFiles = (await readdir(assetDirectory)).filter((file) => file.endsWith(".css"));
    emittedCss = (
      await Promise.all(cssFiles.map((file) => readFile(join(assetDirectory, file), "utf8")))
    ).join("\n");
    const javascriptFiles = (await readdir(assetDirectory)).filter((file) =>
      file.endsWith(".js")
    );
    emittedJavaScript = (
      await Promise.all(
        javascriptFiles.map((file) => readFile(join(assetDirectory, file), "utf8"))
      )
    ).join("\n");
  }, 60_000);

  afterAll(async () => {
    if (outputDirectory) {
      await rm(outputDirectory, { force: true, recursive: true });
    }
  });

  it("configures the public application at the root origin", async () => {
    const config = await resolveConfig(
      { configFile: resolve(process.cwd(), "frontend", "vite.config.ts") },
      "build",
    );
    expect(config.base).toBe("/");
    expect(config.base).not.toBe("./");
  });

  it("emits root-origin entry and stylesheet references", () => {
    expect(indexHtml).toMatch(/(?:src|href)="\/assets\//);
    expect(indexHtml).not.toMatch(/(?:src|href)="\.\/assets\//);
  });

  it("uses the canonical product title in generated HTML", () => {
    expect(indexHtml).toContain("<title>Numerical T Lab</title>");
    expect(indexHtml).not.toContain("<title>Numerical Analysis Lab</title>");
    expect(indexHtml).not.toContain("<title>Numerical ODE Lab</title>");
  });

  it("ships a restrictive CSP that permits only the exact inline theme bootstrap", () => {
    const policy = indexHtml.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1];
    expect(policy).toBeDefined();
    const inline = indexHtml.match(/<script id="theme-bootstrap">([\s\S]*?)<\/script>/)?.[1];
    expect(inline).toBeDefined();
    const hash = createHash("sha256").update(inline!.replace(/\r\n?/g, "\n")).digest("base64");
    expect(policy).toContain(`script-src 'self' 'sha256-${hash}';`);
    expect(policy).toContain("connect-src 'self';");
    // frame-ancestors is header-only; a meta directive would be ignored.
    expect(policy).not.toContain("frame-ancestors");
    expect(policy).not.toMatch(/ws:|https:|unsafe-eval|\*/);
    expect(indexHtml.indexOf("Content-Security-Policy")).toBeLessThan(indexHtml.indexOf("<script"));
  });

  it("bundles body and technical fonts with distributable licenses and no remote font hints", async () => {
    expect(indexHtml).not.toMatch(/fonts\.google|rel="preconnect"/);
    expect(emittedCss).toContain('font-family:DM Sans');
    expect(emittedCss).toContain('font-family:JetBrains Mono');
    const fonts = [...emittedCss.matchAll(/url\(\/assets\/([^)]*\.(?:woff2?|ttf))\)/g)].map(m => m[1]!);
    for (const family of ["DMSans", "JetBrainsMono"]) expect(fonts.some(file => file.startsWith(family))).toBe(true);
    for (const font of fonts) expect((await readFile(join(outputDirectory, "assets", font))).length).toBeGreaterThan(0);
    for (const family of ["dm-sans", "jetbrains-mono"]) {
      expect(await readFile(join(outputDirectory, "licenses", `${family}-OFL.txt`), "utf8"))
        .toContain("SIL OPEN FONT LICENSE Version 1.1");
    }
    for (const library of ["mathlive", "katex-fonts"]) {
      expect(await readFile(join(outputDirectory, "licenses", `${library}-LICENSE.txt`), "utf8"))
        .toContain("Permission is hereby granted");
    }
  });

  it("keeps dynamic chunks measurable in the manifest", () => {
    const entry = manifest["index.html"];
    expect(entry?.file).toMatch(/^assets\//);
    expect(entry?.dynamicImports).toContain(
      "src/labs/ode/initialValueProblemsRoute.ts",
    );
    expect(entry?.dynamicImports).toContain("src/tutor/platformTutorPanel.ts");
    expect(entry?.dynamicImports).toContain(
      "src/glossary/surface/glossarySurfaceRuntime.ts"
    );
    expect(entry?.dynamicImports).toContain(
      "src/labs/linear-algebra/linearSystemsRoute.ts"
    );
  });

  it("emits Lab presentation as a shared lazy child of both complete Labs", () => {
    const entry = manifest["index.html"];
    const ode = manifest["src/labs/ode/initialValueProblemsRoute.ts"];
    const linearSystems =
      manifest["src/labs/linear-algebra/linearSystemsRoute.ts"];
    const sharedCandidates = (linearSystems?.imports ?? []).filter(
      (key) =>
        (ode?.imports ?? []).includes(key) &&
        (manifest[key]?.css?.length ?? 0) > 0
    );

    expect(sharedCandidates).toHaveLength(1);
    const shared = sharedCandidates[0]!;
    expect(entry?.imports ?? []).not.toContain(shared);
    expect(manifest[shared]?.file).toMatch(/^assets\/.+\.js$/);
    expect(manifest[shared]?.css?.[0]).toMatch(/^assets\/.+\.css$/);
    expect(emittedCss).toContain(".lab-shell");
    expect(emittedCss).toContain(".lab-workflow-navigation");
  });

  it("excludes the development Glossary route and fixtures from production output", () => {
    const keys = Object.keys(manifest).join("\n");
    expect(keys).not.toContain("glossaryPlaygroundRoute");
    expect(keys).not.toContain("glossaryFixtures");
    expect(keys).not.toContain("glossaryDevelopmentControls");
    expect(keys).not.toContain("glossaryPlayground.css");
    expect(emittedJavaScript).not.toContain(
      "Development fixtures only — not production definitions."
    );
    expect(emittedJavaScript).not.toContain("Replaceable term");
    expect(emittedJavaScript).not.toContain("Glossary Playground laboratory");
    expect(emittedJavaScript).not.toContain(
      "Rich relationship fixture - development only."
    );
    expect(emittedJavaScript).not.toContain("Developer Tools");
    expect(emittedCss).not.toContain(".glossary-playground-laboratory");
  });

  it("excludes the MathML capability spike and unused helper from production output", () => {
    const keys = Object.keys(manifest).join("\n");
    expect(keys).not.toContain("mathmlCapabilityRoute");
    expect(keys).not.toContain("mathmlCapability.css");
    expect(keys).not.toContain("nativeMath");
    expect(emittedJavaScript).not.toContain(
      "Development fixture · Teaching v2 Phase 0"
    );
    expect(emittedJavaScript).not.toContain(
      "A removable browser fixture for authored Linear Systems mathematics."
    );
    expect(emittedCss).not.toContain(".mathml-capability");
  });

  it("excludes the extended Presentation System fixture from production output", () => {
    const keys = Object.keys(manifest).join("\n");
    expect(keys).not.toContain("presentationSystemRoute");
    expect(keys).not.toContain("presentationSystem.css");
    expect(emittedJavaScript).not.toContain(
      "Phase 0 token calibration — not a product Lab."
    );
    expect(emittedJavaScript).not.toContain("Presentation System v1 — Phase 0");
    expect(emittedJavaScript).not.toContain("Phase 2 · Content hierarchy");
    expect(emittedJavaScript).not.toContain("Future PDE composition");
    expect(emittedCss).not.toContain(".presentation-system-fixture");
    expect(emittedCss).not.toContain(".presentation-phase-two");
  });

  it("uses root-origin URLs for emitted CSS font assets", () => {
    expect(emittedCss).toMatch(/url\(\/assets\/[^)]+\.(?:woff2?|ttf|otf)\)/);
    expect(emittedCss).not.toMatch(/url\(\.\/[^)]+\.(?:woff2?|ttf|otf)\)/);
  });
});
