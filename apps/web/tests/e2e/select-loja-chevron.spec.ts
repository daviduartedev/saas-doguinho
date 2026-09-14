// #41: folga entre o rótulo e o chevron do Select de Loja no header.
import { expect, test, type Page } from "@playwright/test";
import { loginDono } from "./helpers";

const FOLGA_MIN = 8;

function triggerLoja(page: Page) {
  // Radix esconde o banner com aria-hidden enquanto o listbox está aberto.
  return page.locator("header [aria-label='Loja']");
}

async function folgaRotuloChevron(page: Page) {
  const trigger = triggerLoja(page);
  await expect(trigger).toBeVisible();
  return trigger.evaluate((el) => {
    const svg = el.querySelector("svg");
    if (!svg) throw new Error("chevron ausente no Select de Loja");
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return node.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      },
    });
    const textNode = walker.nextNode();
    if (!textNode) throw new Error("rótulo ausente no Select de Loja");
    const range = document.createRange();
    range.selectNodeContents(textNode);
    const texto = range.getBoundingClientRect();
    const path = svg.querySelector("path, polyline, polygon");
    const svgBox = svg.getBoundingClientRect();
    let chevronLeft = svgBox.left;
    if (path instanceof SVGGraphicsElement) {
      const vb = svg.viewBox.baseVal;
      const vbWidth = vb.width || svgBox.width;
      const ink = path.getBBox();
      chevronLeft = svgBox.left + (ink.x / vbWidth) * svgBox.width;
    }
    return chevronLeft - texto.right;
  });
}

test.describe("Select de Loja — folga do chevron", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("rótulo e seta têm folga no desktop, fechado e aberto", async ({ page }) => {
    await loginDono(page);
    const fechado = await folgaRotuloChevron(page);
    expect(fechado).toBeGreaterThanOrEqual(FOLGA_MIN);

    await triggerLoja(page).click();
    await expect(page.getByRole("option", { name: "Todas as Lojas" })).toBeVisible();

    const aberto = await folgaRotuloChevron(page);
    expect(aberto).toBeGreaterThanOrEqual(FOLGA_MIN);
    expect(aberto).toBeCloseTo(fechado, 0);
  });
});
