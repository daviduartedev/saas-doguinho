// Helpers compartilhados da suíte E2E (best practices: role locators, web-first assertions).
import { expect, type Page } from "@playwright/test";

export const DONO = { email: "dono@doguinho.local", senha: "coruja" };
export const OPERADOR_CENTRO = { email: "operador.centro@doguinho.local", senha: "coruja" };
export const OPERADOR_JULIANA = { email: "operador.juliana@doguinho.local", senha: "coruja" };
export const OPERADOR_MAGALHAES = { email: "operador.magalhaes@doguinho.local", senha: "coruja" };
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

/** Seleciona uma Loja de seed pelo nome e devolve o id (?loja=). */
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

/** Preenche TODAS as quantidades do formulário de Fechamento, em TODAS as páginas
 *  do pager cliente (8/página — o catálogo cresce entre runs). */
export async function preencherQuantidades(page: Page, valor: string) {
  for (;;) {
    const inputs = page.locator('input[aria-label^="Quantidade restante de"]');
    for (let i = 0; i < (await inputs.count()); i++) await inputs.nth(i).fill(valor);
    const paginacao = page.getByRole("navigation", { name: "Paginação" });
    if (!(await paginacao.count())) break;
    const atual = await paginacao
      .locator('button[aria-current="page"]')
      .innerText()
      .catch(() => "1");
    const proxima = paginacao.getByRole("button", { name: String(Number(atual) + 1), exact: true });
    if (!(await proxima.count())) break;
    await proxima.click();
  }
}

/** Envia o quadro: Fechamento do dia ou Correção, conforme o botão visível. */
export async function enviarRestante(page: Page, valor: string) {
  await preencherQuantidades(page, valor);
  const correcao = page.getByRole("button", { name: "Enviar correção" });
  if (await correcao.count()) {
    const just = page.getByLabel(/Justificativa/i);
    if (await just.count()) {
      await just.fill("Contagem refeita após conferência física.");
    }
    await correcao.click();
  } else {
    await page.getByRole("button", { name: "Enviar fechamento" }).click();
  }
  await expect(page.locator("body")).toContainText("Enviado. Isso é o Estoque agora.");
}
