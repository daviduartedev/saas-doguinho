// Regressão QA-010: tetos de tamanho enforced no SERVIDOR (maxLength do client
// é contornável por POST forjado / preenchimento programático).
import { expect, test } from "@playwright/test";
import { loginDono } from "../helpers";

test("QA-010: POST forjado com nome de Loja > 80 chars é rejeitado no servidor", async ({ page, context }) => {
  await loginDono(page);
  await page.goto("/configuracoes");
  // actionId escopado ao form de criação (o primeiro $ACTION_ID da página é o logout do shell!)
  const actionId = await page
    .locator('form:has(input#nome) input[name^="$ACTION_ID"]')
    .getAttribute("name");
  const res = await context.request.post("/configuracoes", {
    multipart: { [actionId!]: "", nome: "L".repeat(200) },
    maxRedirects: 0,
  });
  const body = await res.text();
  // bug: nome de 10k chars era aceito; agora a validação de domínio aparece
  expect(body).toContain("no máximo 80");
});

test("QA-010: nome de Produto > 80 chars via UI é rejeitado com mensagem de domínio", async ({ page }) => {
  await loginDono(page);
  await page.goto("/produtos");
  await page.locator("input#nome").fill("P".repeat(81));
  await page.getByRole("button", { name: "Cadastrar", exact: true }).click();
  await expect(page.locator("body")).toContainText("no máximo 80");
  await expect(page.locator("body")).not.toContainText("Application error");
});
