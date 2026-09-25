import { spawnSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

/**
 * Global test setup — pushes the SQLite test schema (fresh tables, wiped via
 * --force-reset) so every test run starts from a clean database.
 */
export default function setup() {
  const root = path.resolve(__dirname, "..");

  if (!fs.existsSync(path.join(root, "node_modules", "prisma"))) {
    throw new Error("Prisma is not installed. Run `npm install` first.");
  }

  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(
    npx,
    ["prisma", "db", "push", "--schema", "prisma/schema.test.prisma", "--force-reset"],
    {
      cwd: root,
      stdio: "pipe",
      encoding: "utf-8",
      timeout: 120_000,
      // .cmd shims (Windows) can't be spawned directly by Node; route through the shell.
      shell: process.platform === "win32",
    },
  );

  if (result.status !== 0) {
    throw new Error(`Test DB setup failed:\n${result.stdout}\n${result.stderr}`);
  }

  return () => {
    // nothing to tear down — Vitest forks terminate the shared connection.
  };
}