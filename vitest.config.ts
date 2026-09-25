import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    globalSetup: "./tests/global-setup.ts",
    pool: "forks",
    hookTimeout: 120_000,
    testTimeout: 30_000,
    fileParallelism: false,
    include: ["tests/**/*.test.ts"],
  },
});