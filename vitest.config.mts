import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Three kinds of tests (see CLAUDE.md and docs/BACKEND_PLAN.md §21):
//   unit         *.test.ts        pure logic, Node
//   components   *.test.tsx       React components, jsdom + Testing Library
//   integration  *.int.test.ts    server code against a throwaway local Postgres
export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true, alias: { "server-only": new URL("./test/empty.ts", import.meta.url).pathname } },
  test: {
    projects: [
      {
        extends: true,
        test: { name: "unit", environment: "node", include: ["src/**/*.test.ts"], exclude: ["src/**/*.int.test.ts"] },
      },
      {
        extends: true,
        test: { name: "components", environment: "jsdom", include: ["src/**/*.test.tsx"], setupFiles: ["./test/setup-dom.ts"] },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["src/**/*.int.test.ts"],
          globalSetup: ["./test/global-setup-db.ts"],
          fileParallelism: false,
        },
      },
    ],
  },
});
