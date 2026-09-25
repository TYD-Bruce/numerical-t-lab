import type { ChartInstruction } from "@numerical-t-lab/contracts/tutor";

/** Normalize a few legacy notation spellings while preserving controlled math delimiters. */
export function sanitizeTutorText(text: string): string {
  return text
    .replace(/\\alpha_j/g, "αⱼ")
    .replace(/\\beta_j/g, "βⱼ")
    .replace(/u_\{n\+1\}/g, "uₙ₊₁")
    .replace(/f_\{n-j\}/g, "fₙ₋ⱼ")
    .trim();
}

export function isChartInstruction(
  value: unknown
): value is ChartInstruction {
  if (!value || typeof value !== "object") return false;
  const t = (value as ChartInstruction).type;
  return (
    t === "line_chart" ||
    t === "error_table" ||
    t === "zoom_range" ||
    t === "none"
  );
}
