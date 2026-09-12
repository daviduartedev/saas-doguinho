import { defineConfig } from "@playwright/test";

/**
 * E2E do Doguinho. Roda contra o dev server local (memory store + seed quando
 * DATABASE_URL está ausente). O store é compartilhado e Fechamento é 1×/dia/Loja,
 * então a suíte é serial (workers: 1) e cada teste usa sua própria Loja/identidade.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.QA_BASE ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/entrar",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
