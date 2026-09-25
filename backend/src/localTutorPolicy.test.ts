import { describe, expect, it, vi, afterEach } from "vitest";
import { normalizeConnection, providerRequestTarget, isPublicAddress } from "./localTutorPolicy.js";

afterEach(() => vi.unstubAllEnvs());

describe("personal Tutor destination policy", () => {
  it.each(["local", "openai", "anthropic", "gemini", "deepseek", "kimi"])("permits %s discovery before model selection, but never completion", provider => {
    const connection = normalizeConnection({ provider, ...(provider === "local" ? { baseUrl: "http://localhost:8080" } : { apiKey: "fixture-key" }), ...(provider === "kimi" ? { region: "international" } : {}) });
    expect(connection.metadata.model).toBeUndefined();
    expect(providerRequestTarget(connection.metadata, "discover").method).toBe("GET");
    expect(() => providerRequestTarget(connection.metadata, "complete")).toThrow(/choose a model/i);
  });

  it.each(["D:\\Models\\Local model.gguf", "/models/Local model.gguf", "本地模型 Q4", "http://other.invalid/models/load?x=1#fragment"])("preserves opaque local model ID %s separately from its fixed request path", model => {
    const connection = normalizeConnection({ provider: "local", baseUrl: "http://localhost:8080", model });
    expect(connection.metadata.model).toBe(model);
    expect(providerRequestTarget(connection.metadata, "complete").url).toBe("http://127.0.0.1:8080/v1/chat/completions?autoload=false");
  });

  it.each(["", "   ", "model\n", "model\u0000", "model\u007f", "x".repeat(1025)])("bounds local IDs and rejects controls: %j", model => {
    expect(() => normalizeConnection({ provider: "local", baseUrl: "http://localhost:8080", model })).toThrow();
  });

  it.each([
    ["http://localhost:8080", "http://127.0.0.1:8080/v1"],
    ["http://127.0.0.1:80/v1/", "http://127.0.0.1:80/v1"],
    ["http://[::1]:8080/", "http://[::1]:8080/v1"],
  ])("normalizes the supported explicit loopback base %s", (baseUrl, expected) => {
    const connection = normalizeConnection({ provider: "local", baseUrl, model: "fixture/model" });
    expect(connection.metadata.baseUrl).toBe(expected);
    expect(providerRequestTarget(connection.metadata, "discover").url).toBe(`${expected}/models`);
    expect(providerRequestTarget(connection.metadata, "complete").url).toBe(`${expected}/chat/completions?autoload=false`);
  });

  it.each([
    "http://localhost", "https://localhost:8080", "http://localhost.:8080", "http://LOCALHOST:8080",
    "http://user:secret@localhost:8080", "http://localhost:8080/?key=secret", "http://localhost:8080/#x",
    "http://localhost:08080", "http://localhost:0", "http://localhost:65536", "http://localhost:8080/v1/../v1",
    "http://127.1:8080", "http://2130706433:8080", "http://0177.0.0.1:8080", "http://0x7f000001:8080",
    "http://127.0.0.2:8080", "http://[::ffff:127.0.0.1]:8080", "http://[0:0:0:0:0:0:0:1]:8080",
    "http://0.0.0.0:8080", "http://192.168.1.2:8080", "http://169.254.169.254:80", "http://local.test:8080",
    "http://localhost:8080/models/load", "http://localhost:8080/v1?autoload=true", " http://localhost:8080",
    "http:\\localhost:8080", "http://local\thost:8080", "http://localhost:8080/%76%31", "file:///v1",
  ])("rejects authority and path bypass: %s", (baseUrl) => {
    expect(() => normalizeConnection({ provider: "local", baseUrl, model: "fixture" })).toThrow(/local endpoint/i);
  });

  it.each([
    ["openai", undefined, "https://api.openai.com/v1"],
    ["anthropic", undefined, "https://api.anthropic.com/v1"],
    ["gemini", undefined, "https://generativelanguage.googleapis.com/v1beta"],
    ["deepseek", undefined, "https://api.deepseek.com"],
    ["kimi", "international", "https://api.moonshot.ai/v1"],
    ["kimi", "mainland", "https://api.moonshot.cn/v1"],
  ])("pins %s / %s to a fixed HTTPS destination", (provider, region, expected) => {
    const input = { provider, model: "fixture-model", apiKey: "fixture-key", ...(region ? { region } : {}) };
    const connection = normalizeConnection(input);
    expect(connection.metadata.baseUrl).toBe(expected);
    expect(connection.metadata.hasCredential).toBe(true);
    expect(JSON.stringify(connection.metadata)).not.toContain("fixture-key");
    expect(() => normalizeConnection({ ...input, baseUrl: "https://attacker.example" })).toThrow();
  });

  it("requires an explicit Kimi region and explicit credentials despite environment keys", () => {
    for (const name of ["OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GEMINI_API_KEY", "DEEPSEEK_API_KEY", "MOONSHOT_API_KEY"]) {
      vi.stubEnv(name, "ambient-fixture-key");
    }
    for (const provider of ["openai", "anthropic", "gemini", "deepseek", "kimi"]) {
      expect(() => normalizeConnection({ provider, model: "fixture", ...(provider === "kimi" ? { region: "mainland" } : {}) })).toThrow(/credential/i);
    }
    expect(() => normalizeConnection({ provider: "kimi", model: "fixture", apiKey: "fixture-key" })).toThrow();
    expect(normalizeConnection({ provider: "local", baseUrl: "http://localhost:8080", model: "fixture" }).credential).toBeUndefined();
  });

  it.each(["", "key\r\nHost: attacker.example", " key ", "键", "x".repeat(4097)])("rejects invalid credential bytes without reflecting them", (apiKey) => {
    expect(() => normalizeConnection({ provider: "openai", model: "fixture", apiKey })).toThrow("A valid explicit credential is required.");
  });

  it("rejects unknown fields, models and arbitrary operation paths", () => {
    expect(() => normalizeConnection({ provider: { toString: null }, model: "x", apiKey: "fixture-key" })).toThrow("Invalid connection configuration.");
    for (const model of ["", "../models", "x?key=secret", "x\n", "x".repeat(201)]) {
      expect(() => normalizeConnection({ provider: "openai", apiKey: "fixture-key", model })).toThrow();
    }
    expect(() => normalizeConnection({ provider: "openai", apiKey: "fixture-key", model: "x", headers: {} })).toThrow();
    const connection = normalizeConnection({ provider: "local", baseUrl: "http://localhost:8080", model: "fixture" });
    expect(() => providerRequestTarget(connection.metadata, "/models/load" as never)).toThrow();
    expect(() => providerRequestTarget({ ...connection.metadata, baseUrl: "http://attacker.example/v1" }, "discover")).toThrow();
  });

  it.each(["127.0.0.1", "0.0.0.0", "10.1.2.3", "100.64.1.1", "169.254.169.254", "172.16.1.1", "192.168.1.1", "192.0.2.1", "198.18.0.1", "203.0.113.1", "224.0.0.1", "255.255.255.255", "::1", "::ffff:8.8.8.8", "fc00::1", "fe80::1", "2001:db8::1", "2002:7f00:1::1", "3fff::1", "not-an-ip"])("rejects nonpublic cloud address %s", (ip) => {
    expect(isPublicAddress(ip)).toBe(false);
  });
  it.each(["8.8.8.8", "1.1.1.1", "2606:4700::1111"])("accepts global cloud address %s", (ip) => {
    expect(isPublicAddress(ip)).toBe(true);
  });
});
