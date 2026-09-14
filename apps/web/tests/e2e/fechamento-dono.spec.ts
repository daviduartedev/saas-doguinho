// #39: Fechamento do Dono é relatório do dia, sem envio nem banner de Correção.
import { expect, test } from "@playwright/test";
import {
  OPERADOR_CENTRO,
  enviarRestante,
  login,
  loginDono,
  logout,
  selecionarLoja,
  selecionarTodasAsLojas,
} from "./helpers";

test.describe("Fechamento do Dono", () => {
  test("Dono em /fechamento não vê Enviar, Justificativa nem o banner de Correção", async ({
    page,
  }) => {
    await loginDono(page);
    await page.goto("/fechamento");

    await expect(page.getByRole("heading", { name: "Fechamento", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Enviar/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Guardar rascunho" })).toHaveCount(0);
    await expect(page.getByLabel(/Justificativa/i)).toHaveCount(0);
    await expect(page.locator('input[aria-label^="Quantidade restante de"]')).toHaveCount(0);
    await expect(page.getByText("Já houve Fechamento hoje")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText("Nunca fechou");
    await expect(page.locator("body")).not.toContainText("próximo envio é Correção");
  });

  test("Dono lê no relatório os números do último envio de hoje", async ({ page }) => {
    await login(page, OPERADOR_CENTRO.email, OPERADOR_CENTRO.senha);
    await enviarRestante(page, "13");
    await logout(page);

    await loginDono(page);
    await page.goto("/fechamento");

    await expect(page.getByRole("heading", { name: "Fechamento · Centro" })).toBeVisible();
    await expect(page.locator('input[aria-label^="Quantidade restante de"]')).toHaveCount(0);
    await expect(page.locator('[aria-label^="Quantidade restante de"]').first()).toHaveText("13");
  });

  test("Dono vê a linha do tempo do dia após Fechamento e Correção", async ({ page }) => {
    await login(page, OPERADOR_CENTRO.email, OPERADOR_CENTRO.senha);
    await enviarRestante(page, "11");
    await page.reload();
    await enviarRestante(page, "8");
    await page.goto("/sair");

    await loginDono(page);
    await page.goto("/fechamento");
    await selecionarLoja(page, "Centro");

    await expect(page.getByRole("heading", { name: "Envios de hoje" })).toBeVisible();
    await expect(page.getByText("Fechamento · Operador Centro").first()).toBeVisible();
    await expect(page.getByText("Correção · Operador Centro").first()).toBeVisible();
    await expect(page.getByText("Contagem refeita após conferência física.").first()).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Anterior" }).first()).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Nova" }).first()).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Diferença" }).first()).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Δ" })).toHaveCount(0);
  });

  // #46: o filtro do header vale de verdade. Uma Loja = só ela. Todas = as três seções.
  test("Dono com uma Loja no header vê só o relatório daquela Loja", async ({ page }) => {
    await loginDono(page);
    await page.goto("/fechamento");
    await selecionarLoja(page, "Jardim Juliana");

    await expect(page.getByRole("heading", { name: "Fechamento · Jardim Juliana" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Fechamento · Centro" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Fechamento · Magalhães" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Envios de hoje" })).toHaveCount(1);
    await expect(page.getByRole("combobox", { name: "Loja" })).toHaveCount(1);
  });

  test("Dono com Todas as Lojas vê Centro, Jardim Juliana e Magalhães na mesma página", async ({
    page,
  }) => {
    await loginDono(page);
    await page.goto("/fechamento");
    await selecionarLoja(page, "Centro");
    await selecionarTodasAsLojas(page);

    await expect(page.getByRole("heading", { name: "Fechamento · Centro" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Fechamento · Jardim Juliana" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Fechamento · Magalhães" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Envios de hoje" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Ver envios de hoje nesta Loja" })).toHaveCount(3);
    await expect(page.getByRole("combobox", { name: "Loja" })).toHaveCount(1);
  });

  test("Dono continua gerindo Produtos, Usuários e Perfis", async ({ page }) => {
    await loginDono(page);
    await page.goto("/produtos");
    await expect(page.getByRole("heading", { name: "Produtos" })).toBeVisible();
    await page.goto("/usuarios");
    await expect(page.getByRole("heading", { name: "Usuários" })).toBeVisible();
    await page.goto("/perfis");
    await expect(page.getByRole("heading", { name: "Perfis" })).toBeVisible();
  });
});
