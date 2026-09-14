// #42: loading dos botões é spinner circular (Mantine oval), não o loader de pontos.
import { expect, test, type Locator } from "@playwright/test";
import { loginOperador } from "./helpers";

function tipoLoader(botao: Locator) {
  return botao.evaluate((el) => {
    const dots = [...el.querySelectorAll("span")].filter((node) => {
      if (node.children.length !== 0) return false;
      const style = getComputedStyle(node);
      return style.borderRadius.includes("50%") && style.animationName !== "none";
    }).length;
    if (dots >= 3) return "dots";
    const oval = [...el.querySelectorAll("span")].some((node) => {
      if (node.children.length !== 0) return false;
      const after = getComputedStyle(node, "::after");
      return after.borderStyle === "solid" && after.animationName !== "none";
    });
    return oval ? "oval" : "unknown";
  });
}

test("botão pendente do Fechamento mostra spinner, não dots", async ({ page }) => {
  await loginOperador(page);

  await page.route("**/*", async (route) => {
    const action = route.request().headers()["next-action"];
    if (route.request().method() === "POST" && action) {
      await new Promise((resolve) => setTimeout(resolve, 20_000));
      await route.abort();
      return;
    }
    await route.continue();
  });

  const enviar = page.getByRole("button", { name: /Enviar (fechamento|correção)/ });
  await expect(enviar).toBeVisible();
  await enviar.click();

  const rascunho = page.getByRole("button", { name: "Guardar rascunho" });

  await expect(enviar).toHaveAttribute("data-loading", "true");
  await expect.poll(() => tipoLoader(enviar)).toBe("oval");
  await expect(rascunho).not.toHaveAttribute("data-loading", "true");
  await expect(rascunho).toBeDisabled();
});
