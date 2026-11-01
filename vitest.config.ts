import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    silent: "passed-only",
    name: "bb-plugin-claude-code-telemetry",
    include: ["src/**/*.test.ts"],
    exclude: ["node_modules/**"],
  },
});
