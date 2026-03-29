import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@\//,
        replacement: `${path.resolve(rootDir, "./src")}/`,
      },
      {
        find: "next/headers",
        replacement: path.resolve(rootDir, "./tests/mocks/next-headers.ts"),
      },
      {
        find: "server-only",
        replacement: path.resolve(rootDir, "./tests/mocks/server-only.ts"),
      },
    ],
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup/test-env.ts"],
    fileParallelism: false,
    hookTimeout: 60_000,
    testTimeout: 60_000,
    clearMocks: true,
    restoreMocks: true,
  },
});
