// Helpers compartilhados da suíte E2E (best practices: role locators, web-first assertions).
import { expect, type Page } from "@playwright/test";

export const DONO = { email: "dono@doguinho.local", senha: "coruja" };
export const OPERADOR_CENTRO = { email: "operador.centro@doguinho.local", senha: "qa123456" };
export const RESTRITO = { email: "restrito@doguinho.local", senha: "qa123456" };

export async function login(page: Page, email: string, senha: string) {
  await page.goto("/entrar");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/fechamento**");
}

export async function loginDono(page: Page) {
  await login(page, DONO.email, DONO.senha);
}

export async function logout(page: Page) {
  await page.getByRole("button", { name: "Sair" }).click();
  await page.waitForURL("**/entrar**");
}

/** Cria uma Loja pela UI (Dono) e confirma que ela aparece na lista. */
export async function criarLoja(page: Page, nome: string) {
  await page.goto("/configuracoes");
  await page.locator("input#nome").fill(nome);
  await page.getByRole("button", { name: "Criar Loja" }).click();
  await expect(page.locator("ul.listing-frame")).toContainText(nome);
}

/** Troca a Loja ativa pelo seletor do shell e devolve o id (?loja=). */
export async function selecionarLoja(page: Page, nome: string): Promise<string> {
  const antes = page.url(); // a URL atual pode já ter ?loja= — esperar MUDANÇA, não o padrão
  await page.getByRole("combobox").click();
  // o viewport do seletor tem overflow escondido; typeahead do Radix foca a opção pelo nome
  await page.keyboard.type(nome, { delay: 15 });
  await page.keyboard.press("Enter");
  await page.waitForURL((url) => url.toString() !== antes && /[?&]loja=[^&]+/.test(url.search));
  const id = new URL(page.url()).searchParams.get("loja")!;
  if (id === "todas") throw new Error(`selecionarLoja: opção "${nome}" não fixou uma Loja`);
  return id;
}

/** Preenche TODAS as quantidades do formulário de Fechamento (paginado 8/página). */
export async function preencherQuantidades(page: Page, valor: string) {
  const inputs = page.locator('input[aria-label^="Quantidade restante de"]');
  for (let i = 0; i < (await inputs.count()); i++) await inputs.nth(i).fill(valor);
  const paginacao = page.getByRole("navigation", { name: "Paginação" });
  if (await paginacao.getByRole("button", { name: "2", exact: true }).isVisible()) {
    await paginacao.getByRole("button", { name: "2", exact: true }).click();
    const restantes = page.locator('input[aria-label^="Quantidade restante de"]');
    for (let i = 0; i < (await restantes.count()); i++) await restantes.nth(i).fill(valor);
  }
}
