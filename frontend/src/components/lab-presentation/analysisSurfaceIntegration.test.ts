import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(...parts: string[]): string {
  return readFileSync(resolve(process.cwd(), ...parts), "utf8");
}

describe("cross-Lab AnalysisSurface ownership", () => {
  const shared = source(
    "frontend",
    "src",
    "components",
    "lab-presentation",
    "analysisSurface.ts"
  );
  const linearSystems = source(
    "frontend",
    "src",
    "labs",
    "linear-algebra",
    "linearSystemsApp.ts"
  );
  const convergence = source(
    "frontend",
    "src",
    "labs",
    "ode",
    "convergenceStudyView.ts"
  );
  const entry = source("frontend", "src", "main.ts");

  it("has both domains consume the same presentation-only primitive", () => {
    expect(linearSystems).toMatch(
      /components\/lab-presentation\/analysisSurface/
    );
    expect(convergence).toMatch(
      /components\/lab-presentation\/analysisSurface/
    );
    expect(linearSystems).toContain("createAnalysisSurface(");
    expect(convergence).toContain("createAnalysisSurface(");
    expect(shared).not.toMatch(
      /labs\/(?:ode|linear-algebra)|@numerical-t-lab|chart\.js|mathlive|compute-engine/i
    );
  });

  it("keeps domain analysis owners independent", () => {
    expect(linearSystems).not.toMatch(
      /convergenceStudy|ConvergenceUiState|ConvergenceStudyResult/
    );
    expect(convergence).not.toMatch(
      /linearSystems|LinearSystemsSession|ComputationTrace|tauPivot/
    );
    expect(shared).not.toMatch(
      /AnalysisResult|AnalysisSession|AnalysisController|solver|numerical|residual|convergence/i
    );
  });

  it("keeps Tutor runtime deferred and does not expand other unauthorized features", () => {
    expect(linearSystems).not.toMatch(
      /from\s+["'][^"']*(?:\/tutor\/|platformTutor|glossary)|mount\w*Tutor|create\w*Glossary|computationMotion|Replay/i
    );
    expect(convergence).not.toMatch(/linearSystems|ComputationTrace|computationMotion|Replay/);
    expect(entry).not.toMatch(/AnalysisSurface|analysisSurface|convergenceStudyView|linearSystemsApp/);
  });
});
