import { describe, expect, it } from "vitest";
import { readActivity, readChartInstruction, readCreated, readDiscovery, readFailure, readReply, readSession, TutorClientError } from "./tutorConnectionProtocol";

const session = { sessionId: "a".repeat(32), generation: 0, idleExpiresAt: Date.now() + 1_800_000, idleTimeoutMs: 1_800_000, absoluteExpiresAt: Date.now() + 28_800_000 };
const capabilities = { protocol: 1, providerOperations: true, providers: ["local"], chatProfiles: ["ode"] };
const created = { session, capabilities, proof: "b".repeat(64) };
describe("bounded browser protocol decoding", () => {
  it("accepts implemented Linear capability while retaining ODE-only backend compatibility", () => {
    expect(readCreated(created).capabilities.chatProfiles).toEqual(["ode"]);
    expect(readCreated({ ...created, capabilities: { ...capabilities, chatProfiles: ["ode", "linear_algebra"] } }).capabilities.chatProfiles).toEqual(["ode", "linear_algebra"]);
  });
  it("projects only the nonsecret activity fields and accepts its absence", () => {
    const activity = { sessionId: session.sessionId, generation: 0, idleExpiresAt: session.idleExpiresAt };
    expect(readActivity({ activity: { ...activity, apiKey: "synthetic-ignored", proof: "synthetic-ignored" } })).toEqual(activity);
    expect(readActivity({})).toBeUndefined();
    expect(() => readActivity({ activity: { ...activity, idleExpiresAt: Infinity } })).toThrow();
    expect(() => readActivity({ activity: { ...activity, sessionId: "invalid" } })).toThrow();
  });
  it("copies valid chart fields and table cells at the accepted boundaries", () => {
    const chart = { type: "error_table", title: "é".repeat(512), xLabel: "", yLabel: "Approximation",
      tMin: 0, tMax: 1, includePoints: false, includeLine: true,
      tableRows: Array.from({ length: 80 }, () => Object.fromEntries(Array.from({ length: 16 }, (_, i) => [String(i).padStart(80, "x"), i]))) };
    const projected = readChartInstruction(chart)!;
    expect(projected).toEqual(chart);
    expect(projected).not.toBe(chart);
    expect(projected.tableRows?.[0]).not.toBe(chart.tableRows[0]);
    expect(readChartInstruction({ type: "zoom_range", tMin: -1, tMax: 1 })).toEqual({ type: "zoom_range", tMin: -1, tMax: 1 });
    expect(readChartInstruction({ type: "none" })).toBeUndefined();
  });
  it.each([
    { type: "line_chart", title: "é".repeat(513) },
    { type: "zoom_range", tMin: 0, tMax: Infinity },
    { type: "zoom_range", tMin: 0, tMax: 0 },
    { type: "error_table", tableRows: [{ x: NaN }] },
    { type: "error_table", tableRows: [{ x: "é".repeat(513) }] },
    { type: "error_table", tableRows: [{ ["x".repeat(81)]: 1 }] },
    { type: "error_table", tableRows: [Object.fromEntries(Array.from({ length: 17 }, (_, i) => [String(i), 1]))] },
  ])("drops chart data beyond field bounds %#", value => { expect(readChartInstruction(value)).toBeUndefined(); });
  it.each([
    { ...created, proof: "invalid" }, { ...created, capabilities: { ...capabilities, protocol: 2 } },
    { ...created, capabilities: { ...capabilities, providerOperations: false } },
    { ...created, capabilities: { ...capabilities, providers: ["unreviewed"] } },
    { ...created, capabilities: { ...capabilities, chatProfiles: ["pde"] } },
    { ...created, session: { ...session, generation: 1 } },
    { ...created, session: { ...session, idleTimeoutMs: undefined } },
  ])("rejects incompatible bootstrap %#", value => {
    expect(() => readCreated(value)).toThrow();
  });
  it.each([NaN, Infinity, -1, 0.5, "0"])("rejects invalid generations %s", generation => {
    expect(() => readSession({ ...session, generation })).toThrow();
  });
  it("projects only known nonsecret fields into snapshots and catalog entries", () => {
    const value = readSession({ ...session, proof: "should-not-persist", apiKey: "should-not-persist", active: {
      provider: "kimi", region: "mainland", baseUrl: "https://api.moonshot.cn/v1", hasCredential: true, model: "fixture", apiKey: "should-not-persist",
    } });
    expect(JSON.stringify(value)).not.toContain("should-not-persist");
    expect(Object.isFrozen(value.active)).toBe(true);
    const models = readDiscovery({ models: [{ id: "fixture", availability: "loaded", secret: "should-not-persist" }], hasMore: false });
    expect(models).toEqual({ models: [{ id: "fixture", availability: "loaded" }], hasMore: false });
  });
  it.each(["private-body", undefined, "__proto__"])("never trusts unrecognized failure code %s or raw error", code => {
    const result = readFailure({ code, error: "private path/key/body" }, 502);
    expect(result.code).toBe("provider_unavailable");
    expect(result.message).not.toMatch(/private|proto/);
  });
  it("maps the receipt-level 413 to bounded input feedback", () => {
    expect(readFailure({ error: "untrusted" }, 413).code).toBe("input_too_large");
  });
  it("rejects oversized replies before decoding the full JSON body", async () => {
    await expect(readReply(new Response('"' + "x".repeat(512 * 1024) + '"'), () => undefined)).rejects.toMatchObject({ code: "response_too_large" });
  });
  it("checks identity across streaming body reads", async () => {
    let valid = true;
    let writer!: ReadableStreamDefaultController<Uint8Array>;
    const response = new Response(new ReadableStream<Uint8Array>({ start(controller) { writer = controller; } }));
    const result = readReply(response, () => { if (!valid) throw new TutorClientError("request_cancelled"); });
    valid = false; writer.enqueue(new TextEncoder().encode("{}")); writer.close();
    await expect(result).rejects.toMatchObject({ code: "request_cancelled" });
  });
  it.each(["not-json", new Uint8Array([0xc3, 0x28])])("rejects malformed JSON/UTF-8 without exposing it", async body => {
    await expect(readReply(new Response(body), () => undefined)).rejects.toMatchObject({ code: "response_invalid" });
  });
});
