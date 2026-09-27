import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve, relative, isAbsolute } from "node:path";
import { EventEmitter } from "node:events";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import ts from "typescript";
import { linearTutorFixture } from "./linearTutor.test-fixture";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const apiEntry = resolve(repoRoot, "api/chat.ts");
const expectedHandlerSpecifier = "../backend/src/ai/chatHandler.js";
const temporaryPackages: string[] = [];

function transpile(sourcePath: string): string {
  return ts.transpileModule(readFileSync(sourcePath, "utf8"), {
    fileName: sourcePath,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
    },
  }).outputText;
}

function writePackageFile(
  packageRoot: string,
  relativePath: string,
  contents: string,
): void {
  const outputPath = join(packageRoot, relativePath);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, contents, "utf8");
}

// Follow the emitted runtime graph, without a workspace resolver or repository
// node_modules. A hidden alias or source-only extension fails this package test.
function emitRuntimeGraph(packageRoot: string): Set<string> {
  const emitted = new Set<string>();
  function visit(sourcePath: string): void {
    const path = relative(repoRoot, sourcePath).replaceAll("\\", "/");
    expect(isAbsolute(path) || path.startsWith("../")).toBe(false);
    if (emitted.has(path)) return;
    emitted.add(path);
    const output = transpile(sourcePath);
    writePackageFile(packageRoot, path.replace(/\.ts$/, ".js"), output);
    for (const { fileName } of ts.preProcessFile(output, true, true).importedFiles) {
      expect(fileName.startsWith(".")).toBe(true);
      expect(fileName.endsWith(".js")).toBe(true);
      visit(resolve(dirname(sourcePath), fileName.replace(/\.js$/, ".ts")));
    }
  }
  visit(apiEntry);
  return emitted;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  for (const packageRoot of temporaryPackages.splice(0)) {
    rmSync(packageRoot, { recursive: true, force: true });
  }
});

describe("Vercel chat function packaging contract", () => {
  it("keeps one thin adapter with one statically traceable backend owner", () => {
    const source = readFileSync(apiEntry, "utf8");

    expect(source).toContain(`from "${expectedHandlerSpecifier}"`);
    expect(source).not.toContain("@numerical-t-lab/backend");
    expect(source.match(/handleChatRequest/g)).toHaveLength(2);
    expect(source).not.toContain("SYSTEM_PROMPT");
    expect(source).not.toContain("OPENAI_API_KEY");
  });

  it("does not expose test files as Vercel functions", () => {
    const apiSources = readdirSync(resolve(repoRoot, "api"))
      .filter((name) => name.endsWith(".ts"))
      .sort();

    expect(apiSources).toEqual(["chat.ts"]);
  });

  it("loads the complete emitted graph and reaches validation and Linear demo without provider access", async () => {
    vi.stubEnv("AI_TUTOR_MOCK", "true");
    vi.stubEnv("OPENAI_API_KEY", "");
    const fetcher = vi.fn().mockRejectedValue(new Error("No network permitted"));
    vi.stubGlobal("fetch", fetcher);
    const packageRoot = mkdtempSync(join(tmpdir(), "ntl-chat-function-"));
    temporaryPackages.push(packageRoot);
    writePackageFile(packageRoot, "package.json", '{"type":"module"}\n');
    const graph = emitRuntimeGraph(packageRoot);
    expect(graph.has("backend/src/ai/linearTutorHandler.ts")).toBe(true);
    expect(graph.has("packages/contracts/src/tutor.ts")).toBe(true);
    expect([...graph].some(path => /localTutor|providerAdapters|providerTransport/.test(path))).toBe(false);

    const emittedAdapter = readFileSync(join(packageRoot, "api/chat.js"), "utf8");
    const emittedHandler = join(
      packageRoot,
      "backend/src/ai/chatHandler.js",
    );
    const unavailableWorkspaceSource = join(
      packageRoot,
      "node_modules/@numerical-t-lab/backend/src/ai/chatHandler.ts",
    );

    expect(emittedAdapter).toContain(`from "${expectedHandlerSpecifier}"`);
    expect(emittedAdapter).not.toContain("@numerical-t-lab/backend");
    expect(existsSync(emittedHandler)).toBe(true);
    expect(existsSync(unavailableWorkspaceSource)).toBe(false);

    const module = (await import(
      `${pathToFileURL(join(packageRoot, "api/chat.js")).href}?test=${Date.now()}`
    )) as { default: (request: unknown, response: unknown) => Promise<void> };
    const response = Object.assign(new EventEmitter(), {
      setHeader: vi.fn(),
      status: vi.fn(),
      json: vi.fn(),
    });
    response.status.mockReturnValue(response);

    const request = (body: unknown) => Object.assign(new EventEmitter(), { method: "POST", body });
    await module.default(request({}), response);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      error: "messages array is required.",
    });
    await module.default(request({ profile: "linear_algebra", context: linearTutorFixture(), messages: [{ role: "user", content: "Explain this residual" }] }), response);
    expect(response.status).toHaveBeenLastCalledWith(200);
    expect(response.json).toHaveBeenLastCalledWith(expect.objectContaining({ demoMode: true, message: expect.stringContaining("stored residual") }));
    expect(fetcher).not.toHaveBeenCalled();
  });
});
