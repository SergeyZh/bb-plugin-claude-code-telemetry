import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildProviderCliEnv } from "./sdk-compat.js";
import { commandOutput, readCliVersion, resolveExecutablePath } from "./maintenance-compat.js";
import { decodeClaudeCodeJsonRpcRequest } from "./commands.js";
import { sliceUtf16Head } from "../utf16.js";
import { toProviderCommandsState } from "./provider-commands.js";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("standalone SDK backports", () => {
  it("keeps contributed and thread env while removing bridge runtime env", () => {
    vi.stubEnv("ELECTRON_RUN_AS_NODE", "1");
    vi.stubEnv("BB_PROVIDER_BRIDGE_RECORD_DIR", "/tmp/recording");
    vi.stubEnv("BB_TEST_INHERITED", "inherited");
    const env = buildProviderCliEnv({
      BB_THREAD_ID: "thread-test",
      BB_TEST_INHERITED: "override",
      BB_PLUGIN_MARKER: "contributed",
      "invalid-name": "ignored",
    });
    expect(env).toMatchObject({
      BB_THREAD_ID: "thread-test",
      BB_TEST_INHERITED: "override",
      BB_PLUGIN_MARKER: "contributed",
    });
    expect(env.ELECTRON_RUN_AS_NODE).toBeUndefined();
    expect(env.BB_PROVIDER_BRIDGE_RECORD_DIR).toBeUndefined();
    expect(env["invalid-name"]).toBeUndefined();
    expect(process.env.BB_TEST_INHERITED).toBe("inherited");
  });

  it("replaces inherited Windows env names regardless of case", () => {
    const platform = Object.getOwnPropertyDescriptor(process, "platform")!;
    Object.defineProperty(process, "platform", { value: "win32" });
    try {
    vi.stubEnv("Bb_Mixed_Name", "inherited");
    const env = buildProviderCliEnv({ BB_MIXED_NAME: "override" });
    expect(env.BB_MIXED_NAME).toBe("override");
    expect(env.Bb_Mixed_Name).toBeUndefined();
    } finally {
      Object.defineProperty(process, "platform", platform);
    }
  });

  it.each([
    "commands/list",
    "provider/health",
    "provider/usage",
    "provider/installation/status",
    "provider/installation/run",
  ])("accepts optional env and rejects invalid env on %s", (method) => {
    const params = { cwd: "/tmp", providerId: "claude-code-telemetry", action: "update" };
    const decode = (extra: object) => decodeClaudeCodeJsonRpcRequest({
      jsonrpc: "2.0", id: 1, method, params: { ...params, ...extra },
    });
    expect(decode({}).kind).toBe("request");
    const withEnv = decode({ envVars: { CLAUDE_CONFIG_DIR: "/profile" } });
    expect(withEnv).toMatchObject({
      kind: "request", request: { params: { envVars: { CLAUDE_CONFIG_DIR: "/profile" } } },
    });
    expect(decode({ envVars: { CLAUDE_CONFIG_DIR: 42 } }).kind).toBe("invalid_params");
  });

  it("passes an explicit env to actual child probes without changing process.env", async () => {
    vi.stubEnv("BB_PROBE_MARKER", "inherited");
    const env = { ...process.env, BB_PROBE_MARKER: "contributed" };
    expect(await commandOutput(process.execPath, ["-e", "process.stdout.write(process.env.BB_PROBE_MARKER)"], env)).toBe("contributed");
    expect(process.env.BB_PROBE_MARKER).toBe("inherited");
  });

  it.skipIf(process.platform === "win32")("resolves and versions a CLI from the explicit PATH", async () => {
    const directory = await mkdtemp(join(tmpdir(), "claude-env-probe-"));
    try {
      const executable = join(directory, "bb-env-test-cli");
      await writeFile(executable, `#!${process.execPath}\nprocess.stdout.write(process.env.BB_PROBE_VERSION);\n`, { mode: 0o755 });
      const env = { ...process.env, PATH: directory, BB_PROBE_VERSION: "9.9.9" };
      expect(await resolveExecutablePath("bb-env-test-cli", env)).toBe(executable);
      expect(await readCliVersion("bb-env-test-cli", env)).toBe("9.9.9");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("does not split emoji in question headers or command descriptions", () => {
    expect(sliceUtf16Head("x".repeat(11) + "😀tail", 12)).toBe("x".repeat(11));
    expect(sliceUtf16Head("😀", 2)).toBe("😀");
    const state = toProviderCommandsState([{ name: "emoji", description: "x".repeat(298) + "😀tail", argumentHint: "" }]);
    expect(state.commands[0]?.description).toBe("x".repeat(298) + "…");
  });
});
