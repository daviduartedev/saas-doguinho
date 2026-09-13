// #47: Dono exporta o relatório de Fechamento em Excel e PDF. Operador não.
import { expect, test, type Download, type Page } from "@playwright/test";
import { loginDono, loginOperador, selecionarLoja, selecionarTodasAsLojas } from "./helpers";

async function textoDoDownload(download: Download): Promise<string> {
  const stream = await download.createReadStream();
  if (!stream) throw new Error("download sem stream");
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function baixar(page: Page, nome: "Baixar Excel" | "Baixar PDF") {
  const pending = page.waitForEvent("download");
  await page.getByRole("link", { name: nome }).click();
  return pending;
}

test.describe("Export do Fechamento", () => {
  test("Dono vê Baixar Excel e Baixar PDF no relatório", async ({ page }) => {
    await loginDono(page);
    await page.goto("/fechamento");

    await expect(page.getByRole("link", { name: "Baixar Excel" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Baixar PDF" })).toBeVisible();
  });

  test("Operador não vê export no formulário de Fechamento", async ({ page }) => {
    await loginOperador(page);
    await page.goto("/fechamento");

    await expect(page.getByRole("heading", { name: /Fechamento/ }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Baixar Excel" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Baixar PDF" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Baixar Excel" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Baixar PDF" })).toHaveCount(0);
  });

  test("Excel e PDF de uma Loja trazem só aquela Loja", async ({ page }) => {
    await loginDono(page);
    await page.goto("/fechamento");
    await selecionarLoja(page, "Jardim Juliana");

    const excel = await baixar(page, "Baixar Excel");
    expect(excel.suggestedFilename()).toBe("fechamento-hoje-jardim-juliana.xlsx");
    const excelTexto = await textoDoDownload(excel);
    expect(excelTexto).toContain("Jardim Juliana");
    expect(excelTexto).not.toContain("Centro");
    expect(excelTexto).not.toContain("Magalhães");

    const pdf = await baixar(page, "Baixar PDF");
    expect(pdf.suggestedFilename()).toBe("fechamento-hoje-jardim-juliana.pdf");
    const pdfTexto = await textoDoDownload(pdf);
    expect(pdfTexto).toContain("Jardim Juliana");
    expect(pdfTexto).not.toContain("Centro");
    expect(pdfTexto).not.toContain("Magalhães");
  });

  test("Excel e PDF de Todas as Lojas trazem as três seções", async ({ page }) => {
    await loginDono(page);
    await page.goto("/fechamento");
    await selecionarLoja(page, "Centro");
    await selecionarTodasAsLojas(page);

    const excel = await baixar(page, "Baixar Excel");
    expect(excel.suggestedFilename()).toBe("fechamento-hoje.xlsx");
    const excelTexto = await textoDoDownload(excel);
    expect(excelTexto).toContain("Centro");
    expect(excelTexto).toContain("Jardim Juliana");
    expect(excelTexto).toContain("Magalhães");

    const pdf = await baixar(page, "Baixar PDF");
    expect(pdf.suggestedFilename()).toBe("fechamento-hoje.pdf");
    const pdfTexto = await textoDoDownload(pdf);
    expect(pdfTexto).toContain("Centro");
    expect(pdfTexto).toContain("Jardim Juliana");
    expect(pdfTexto).toContain("Magalhães");
  });
});
