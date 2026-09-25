// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

const settings = vi.hoisted(() => ({ fontsDirectory: "./fonts", soundsDirectory: "./sounds" }));
vi.mock("mathlive", () => ({ MathfieldElement: settings }));

describe("deferred MathLive resource policy", () => {
  it("uses bundled CSS fonts and disables implicit sound fetching before returning the module", async () => {
    const { loadMathLiveModule } = await import("./readonlyMath");
    const first = await loadMathLiveModule();
    expect(settings.fontsDirectory).toBeNull();
    expect(settings.soundsDirectory).toBeNull();
    expect(await loadMathLiveModule()).toBe(first);
  });
});
