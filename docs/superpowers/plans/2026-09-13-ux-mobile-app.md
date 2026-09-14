# UX mobile + DS + período + PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One branch (`feat/0913-ux-mobile-app`) that ships Fechamento CTA loading/alerts, DS button/select/icon consistency, period filters, a clearer Fechamento PDF, mobile chrome/KPI tint, and a mobile-only Produtos cadastro/edição sheet.

**Architecture:** Keep the 44rem app-shell breakpoint. Desktop layout stays tables + sidebar. Below 44rem, density and chrome become app-like; only Produtos cadastro/edição gets a full-screen horizontal stepper. Domain clock stays `America/Sao_Paulo` via `calendarDay`.

**Tech Stack:** Next.js 15 App Router, Mantine Button, Radix Select, Vitest, Playwright, hand-built PDF 1.4.

## Global Constraints

- Copy: Loja not tenant. No em dash. Empty values stay blank.
- Tokens only: `--ketchup` `#E31C23`, `--ketchup-hot` `#FF2A31`, `--mustard`/`--feather`, `--paper` `#F4F0EA`, `--sheet` `#FFFDF9`, `--ink` `#241710`, `--steam`, `--counter`. No default green.
- Desktop does not gain a wizard or a new palette. Layout/density change below `@container app (min-width: 44rem)`.
- Fechamento/Estoque do not become Dashboard KPI-card screens.
- Ghost/transparent CTAs go away: filled backgrounds. Salvar = ketchup. Desativar = `--counter`. Excluir = `--ketchup-hot` plus confirm.
- Spinner only on the clicked Fechamento CTA; sibling is disabled + opacity, no spinner.
- Correção rule banner stays: `Já houve Fechamento hoje. Um novo envio é Correção e exige Justificativa. O registro anterior permanece.`
- Period presets: hoje / 7 dias / 30 dias / de–até. Dashboard drops 14. Default 7. “Hoje” = `calendarDay` in `America/Sao_Paulo`.
- PDF export stays Fechamento-only PDF-1.4 in `fechamento-export.ts`. Do not restyle Excel. Do not add charts. ASVS 1.2.4 formula neutralization stays.
- `system.md` updates in Task 2 (buttons/select/icons) and Task 5–6 (mobile chrome + Produtos sheet).
- Commits: one logical commit per task. Do not push unless the controller asks. Do not commit `.scratch/` or secrets.
- Tests: TDD at public seams. Run focused Vitest while iterating; full `npm test` in `apps/web` before commit. Update Playwright specs this task breaks (`excluir-produto.spec.ts`, `button-spinner.spec.ts`).
- Never use an em dash in UI copy.

---

### Task 1: Fechamento CTA pending split + Correção banners

**Files:**
- Create: `apps/web/src/doguinho/fechamento-cta.ts`
- Create: `apps/web/src/doguinho/fechamento-cta.test.ts`
- Modify: `apps/web/src/components/fechamento/fechamento-form.tsx`
- Test: `apps/web/tests/e2e/button-spinner.spec.ts` (extend, do not weaken #42 oval spinner)

**Interfaces:**
- Consumes: existing `useTransition` + `salvarRascunhoAction` / `enviarFechamentoAction`
- Produces:

```ts
export type FechamentoCta = "rascunho" | "enviar";

export function ctaMostraSpinner(ativo: FechamentoCta | null, qual: FechamentoCta): boolean;
export function ctaDesabilitado(ativo: FechamentoCta | null, catalogoVazio: boolean): boolean;
export function ctaOpaco(ativo: FechamentoCta | null, qual: FechamentoCta): boolean;

export function avisoEnvio(input: {
  ok: boolean;
  erro: string | null;
  correcao: boolean;
}): { kind: "ok" | "erro"; text: string } | null;
```

Copy (verbatim):
- Correção ok: `Correção enviada. O registro anterior permanece.`
- Primeiro envio ok: `Enviado. Isso é o Estoque agora.`
- Correção erro: `Não foi possível enviar a correção.` then a space then `input.erro` when present.
- Outro erro: use `input.erro` as the banner text.
- Rule banner unchanged.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { avisoEnvio, ctaDesabilitado, ctaMostraSpinner, ctaOpaco } from "./fechamento-cta";

describe("fechamento CTA", () => {
  it("só o clicado mostra spinner; o irmão fica opaco e os dois desabilitam", () => {
    expect(ctaMostraSpinner("enviar", "enviar")).toBe(true);
    expect(ctaMostraSpinner("enviar", "rascunho")).toBe(false);
    expect(ctaOpaco("enviar", "rascunho")).toBe(true);
    expect(ctaOpaco("enviar", "enviar")).toBe(false);
    expect(ctaDesabilitado("enviar", false)).toBe(true);
    expect(ctaDesabilitado(null, false)).toBe(false);
    expect(ctaDesabilitado(null, true)).toBe(true);
  });
});

describe("avisoEnvio", () => {
  it("sucesso de Correção e falha usam o copy combinado", () => {
    expect(avisoEnvio({ ok: true, erro: null, correcao: true })).toEqual({
      kind: "ok",
      text: "Correção enviada. O registro anterior permanece.",
    });
    expect(avisoEnvio({ ok: false, erro: "Justificativa obrigatória.", correcao: true })).toEqual({
      kind: "erro",
      text: "Não foi possível enviar a correção. Justificativa obrigatória.",
    });
    expect(avisoEnvio({ ok: true, erro: null, correcao: false })).toEqual({
      kind: "ok",
      text: "Enviado. Isso é o Estoque agora.",
    });
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/doguinho/fechamento-cta.test.ts` from `apps/web`

Expected: FAIL module not found.

- [ ] **Step 3: Implement helpers + wire the form**

Keep a single `useTransition`. Add `const [ativo, setAtivo] = useState<FechamentoCta | null>(null)`. On click, `setAtivo("rascunho"|"enviar")` then `start(async () => { try { ... } finally { setAtivo(null); } })`.

Guardar rascunho: `pending={ctaMostraSpinner(ativo, "rascunho")}` and `disabled={ctaDesabilitado(ativo, ativos.length === 0)}` and `className={ctaOpaco(ativo, "rascunho") ? "opacity-50" : undefined}`.

Enviar: same with `"enviar"`.

Replace the quiet `{erro}`/`{ok}` paragraphs with banners matching the rule banner weight:
- `kind === "erro"`: `className="mt-3 rounded-md bg-ketchup px-3 py-2 text-sm font-medium text-white"`
- `kind === "ok"`: `className="mt-3 rounded-md border border-mustard bg-sheet px-3 py-2 text-sm font-medium text-ink"`
- Place them **below** the existing Correção rule banner (and below justificativa if present, still above the sticky CTA bar is fine).
- Clear success when `linhas` or `justificativa` change after a successful send.

- [ ] **Step 4: Extend Playwright**

In `button-spinner.spec.ts`, after asserting Enviar has `data-loading=true`, assert Guardar rascunho does **not** have `data-loading=true` and is disabled.

- [ ] **Step 5: Run tests and commit**

```
git add apps/web/src/doguinho/fechamento-cta.ts apps/web/src/doguinho/fechamento-cta.test.ts apps/web/src/components/fechamento/fechamento-form.tsx apps/web/tests/e2e/button-spinner.spec.ts
git commit -m "fix: spinner só no CTA de Fechamento clicado e alerta claro na Correção"
```

---

### Task 2: DS buttons, Select chevron, product action icons

**Files:**
- Modify: `apps/web/src/components/ui/button.tsx`
- Modify: `apps/web/src/components/ui/select.tsx`
- Modify: `apps/web/src/components/shell/app-shell.tsx` (`LojaFiltro` trigger padding)
- Modify: `apps/web/src/app/(app)/produtos/page.tsx`
- Modify: `.interface-design/system.md` Components → Button / Select
- Modify: `apps/web/tests/e2e/excluir-produto.spec.ts`
- Modify: `apps/web/tests/e2e/select-loja-chevron.spec.ts` if FOLGA_MIN stays 8 (raise to 12)

**Interfaces:**
- Consumes: Mantine Button, lucide-react (`Save`, `Ban`, `Trash2`)
- Produces: `variant` adds `counter` and `danger` (filled). Keep `awning` for nav logout. Stop using `ghost`/`outline` on Produtos CTAs.

Button styles:
- `primary`: filled ketchup (existing)
- `counter`: filled `background: var(--counter)`, `color: var(--ink)` (or white if counter is dark — if contrast fails, `color: white`)
- `danger`: filled `--ketchup-hot`, white text
- `size="icon"`: 44×44 (`h-11 w-11`), not 40
- Do not delete `outline` yet if login/other screens need it; do not use ghost/outline on Produtos row actions or Fechamento Guardar rascunho. **Guardar rascunho** becomes `variant="counter"` filled (not outline) so both Fechamento CTAs have background.

Select:
- `SelectTrigger` default `gap-4 px-3`. LojaFiltro: keep `w-max` but `px-3 gap-4`, never `px-2`.

Produtos row:
- Salvar: icon Save, `aria-label="Salvar"`, `size="icon"`, primary
- Desativar: Ban, `aria-label="Desativar"`, `size="icon"`, counter
- Excluir: Trash2, `aria-label="Excluir"`, `size="icon"`, danger
- Excluir must `confirm("Excluir este Produto do catálogo? O passado permanece no Histórico.")` before submit. Use a tiny client wrapper `ConfirmSubmitButton` in `apps/web/src/components/ui/confirm-submit-button.tsx` if a server component cannot confirm.

Replace native `<select>` on this page with the DS `Select` (unidade) so the chevron rule applies. Desktop create form stays Nome + Unidade + Cadastrar on one row.

- [ ] **Step 1: Failing unit/e2e intent**

Raise `FOLGA_MIN` in `select-loja-chevron.spec.ts` from 8 to 12.

Update `excluir-produto.spec.ts` to target `getByRole("button", { name: "Excluir" })` (aria-label still names the role) and after click, handle `page.on("dialog", (d) => d.accept())` **before** the click.

- [ ] **Step 2: Implement**

- [ ] **Step 3: Update system.md**

Replace the Button bullet with: Mantine filled. Primary ketchup. Destructive ketchup-hot. Neutral counter. Default 44px. Icon-only actions use `aria-label`. Select trigger `gap-4` so the chevron never kisses the label. Form CTAs always have a fill. Spinner only on the in-flight CTA.

- [ ] **Step 4: Commit**

```
git commit -m "fix: padroniza CTAs filled, ícones de produto e folga do Select"
```

---

### Task 3: Period filters on Dashboard and Histórico

**Files:**
- Create: `apps/web/src/doguinho/periodo.ts`
- Create: `apps/web/src/doguinho/periodo.test.ts`
- Create: `apps/web/src/components/ui/periodo-filtro.tsx`
- Modify: `apps/web/src/doguinho/clock.ts` only if a tiny helper belongs there; prefer `periodo.ts` using `addCalendarDays` + `calendarDay`
- Modify: `apps/web/src/doguinho/store.ts` `listSubmissionsPage` input
- Modify: `apps/web/src/doguinho/memory-store.ts`
- Modify: `apps/web/src/doguinho/postgres-store.ts` (parameterized `calendar_day` bounds; ASVS 1.2)
- Modify: `apps/web/src/doguinho/app.ts` `historicoPagina`
- Modify: `apps/web/src/doguinho/types.ts` if needed
- Modify: `apps/web/src/components/dashboard/dashboard-panel.tsx`
- Modify: `apps/web/src/app/(app)/historico/page.tsx`
- Modify: `apps/web/src/doguinho/primeiro-paint.test.ts` / `nav-perf.test.ts` if they stub `listSubmissionsPage`
- Modify: `apps/web/src/doguinho/application.test.ts` — add historicoPagina range cases

**Interfaces:**
- Produces:

```ts
export type PeriodoPreset = "hoje" | "7" | "30" | "custom";

export type Periodo = { from: string; to: string; preset: PeriodoPreset };

export function parsePeriodo(
  search: { periodo?: string; de?: string; ate?: string },
  hoje: string,
): Periodo;

export function sliceSeries<T extends { calendarDay: string }>(
  series: T[],
  periodo: Periodo,
): T[];
```

Rules:
- `periodo=hoje|7|30` (default `7` when missing).
- `de`+`ate` as `YYYY-MM-DD` ⇒ preset `custom`. Invalid dates ⇒ default 7.
- If `ate < de`, swap.
- Dashboard: keep loading `DASHBOARD_HISTORY_DAYS` (30). Slice `model.series` with `sliceSeries`. Custom outside the loaded window shows the overlap (may be empty). Drop 14. Default selected = 7, not 14.
- Histórico: pass `from`/`to` into `historicoPagina`. No 30-day cap on custom (this is how older envios stay reachable). Default 7.
- Pager must preserve `periodo`/`de`/`ate` in `params`.
- Do not add period UI to Fechamento, Estoque, Produtos, Usuários, Config, Login.
- PDF has no own period control (Task 4 inherits Fechamento “hoje”).

`parsePeriodo` tests (hoje fixture `2026-09-13`):
- `{}` → from `2026-09-07` to `2026-09-13`, preset `7`
- `{ periodo: "hoje" }` → from=to `2026-09-13`
- `{ periodo: "30" }` → from `2026-08-15` to `2026-09-13`
- `{ de: "2026-09-01", ate: "2026-09-10" }` → custom those days
- `{ de: "nope" }` → default 7

UI: segmented ketchup-selected chips `Hoje` / `7 dias` / `30 dias` / `Personalizado`. Personalizado reveals two `type="date"` inputs. Navigate with `router` query on Histórico (server filter). Dashboard may stay client state **or** query; prefer query `?periodo=` so refresh keeps the recorte.

- [ ] **Step 1: Failing `periodo.test.ts`**
- [ ] **Step 2: Implement parse/slice**
- [ ] **Step 3: Store + historicoPagina + UI**
- [ ] **Step 4: Commit**

```
git commit -m "feat: filtro de período no Dashboard e no Histórico"
```

---

### Task 4: Fechamento PDF visual

**Files:**
- Modify: `apps/web/src/doguinho/fechamento-export.ts` (`montarPdfFechamento`)
- Modify: `apps/web/src/doguinho/fechamento-export.test.ts`
- Do not change `montarXlsxFechamento` layout except if a shared header string would break Excel tests — keep Excel rows as they are.

**Interfaces:**
- Consumes: `CelulaPlanilha[][]` from `montarPlanilhaFechamento`
- Produces: PDF-1.4 Buffer that still contains Loja names and product names as UTF-8 comment + Helvetica body (existing e2e searches file text).

Visual (PDF operators, no new deps):
- Page header bar filled with ketchup RGB `0.89 0.11 0.14 rg` rectangle at top.
- White title `Fechamento` (or first row label) in larger Tf.
- Subhead: Loja name + `calendarDay` if present in rows + status words already in the table (`Fechamento` / `Correção`).
- Body: tabular rows using a fixed column layout (pad/`Tj` at x positions 50 / 220 / 360) for Produto / Unidade / Quantidade restante. Numbers stay as digits.
- Footer page number.
- Keep WinAnsi encoding + UTF-8 comment trick so `pdf.toString("utf8")` still includes `Centro` and `Pão`.

Tests: existing “grava os nomes das Lojas” must still pass. Add:

```ts
it("pinta cabeçalho ketchup e colunas do listing no PDF", () => {
  const pdf = montarPdfFechamento(montarPlanilhaFechamento([secao("Centro", 13)])).toString("utf8");
  expect(pdf).toContain("0.89 0.11 0.14");
  expect(pdf).toContain("Fechamento");
  expect(pdf).toContain("Centro");
  expect(pdf).toContain("Pão");
});
```

- [ ] **Step 1: Failing test**
- [ ] **Step 2: Implement `montarPdfFechamento` layout**
- [ ] **Step 3: Run `npx vitest run src/doguinho/fechamento-export.test.ts` and e2e export if feasible**
- [ ] **Step 4: Commit**

```
git commit -m "fix: PDF de Fechamento com cabeçalho e tabela alinhados ao listing"
```

---

### Task 5: Mobile chrome and KPI tint

**Files:**
- Modify: `apps/web/src/app/globals.css`
- Modify: `apps/web/src/components/dashboard/dashboard-panel.tsx` (KPI number class)
- Modify: `.interface-design/system.md` Density / Dashboard bullets
- Optional: `apps/web/src/components/ui/card.tsx` only if a `kpi-value` class is cleaner in CSS

**Interfaces:**
- Below 44rem (`@container app` / also `@media (max-width: 43.99rem)` if container is not the one wrapping KPIs): KPI value uses `color: var(--ketchup)`; card stays `--sheet`. Do not add a second palette.
- Inputs/buttons already 44px; increase listing hit on mobile if Fechamento rows < 48px.
- Segmented period control and primary buttons remain ketchup filled.
- Desktop KPI numbers stay `--ink`.

```css
@container app (max-width: 43.99rem) {
  .kpi-grid .kpi-value {
    color: var(--ketchup);
  }
}
```

Add `kpi-value` to the Dashboard number `<p>`.

- [ ] **Step 1: Add the class + CSS**
- [ ] **Step 2: Update system.md:** mobile below 44rem tints KPI numerals ketchup; desktop stays ink. No KPI cards on Fechamento/Estoque.
- [ ] **Step 3: Commit**

```
git commit -m "fix: tinta ketchup nos KPIs e chrome mais denso no mobile"
```

---

### Task 6: Produtos mobile sheet (cadastro and edição)

**Files:**
- Create: `apps/web/src/components/produtos/produto-folha.tsx` (client)
- Modify: `apps/web/src/app/(app)/produtos/page.tsx`
- Modify: `apps/web/src/app/globals.css` if sheet needs a class
- Modify: `.interface-design/system.md`
- Modify: `apps/web/tests/e2e/excluir-produto.spec.ts` (locators: cards vs `form.listing-row-produtos`; Cadastrar may live inside the sheet)

**Interfaces:**
- Desktop (`@container app (min-width: 44rem)`): keep current page create form + listing row fields (icons from Task 2).
- Mobile: hide the desktop inline create form. Show a ketchup filled `Cadastrar produto` that opens a full-screen sheet (`role="dialog"` `aria-modal`).
- Sheet steps:
  1. Nome — large input, Continuar disabled while empty.
  2. Unidade — six chips from `UNIDADES` (`unidade`, `kg`, `g`, `L`, `mL`, `pacote`); selected chip ketchup filled. Submit on this step (`Cadastrar` or `Salvar`).
- Indicator `1 / 2`. Back returns to step 1 keeping nome.
- Success: banner `Produto cadastrado.` then reset to step 1 (nome empty) so the Dono can add another. Control `Ver lista` closes the sheet.
- Edit: card shows nome, unidade, status. Pencil (`aria-label="Editar"`) opens the same sheet with values filled; submit label `Salvar` calling `editarProdutoAction`. Desativar/Excluir stay on the card (Task 2 icons + confirm).
- Do **not** stepper Fechamento.

Implementation sketch: server page renders listing + `ProdutoFolha` client island with `produtos` JSON props (id, nome, unidade, ativo). Create uses `criarProdutoAction`. CSS: `.produtos-desktop-only` / `.produtos-mobile-only` toggled at 44rem.

- [ ] **Step 1: Build sheet + cards**
- [ ] **Step 2: Fix Playwright for mobile and desktop locators** (`test.use` desktop 1280 for the existing catalog test; add a 390×844 case that opens the sheet)
- [ ] **Step 3: system.md** — Produtos mobile is a two-step sheet; desktop stays the listing form.
- [ ] **Step 4: Commit**

```
git commit -m "feat: cadastro e edição de produto em folha no celular"
```

---

## Spec coverage

- Loading só no CTA clicado + irmão opaco → Task 1
- Banner Correção permanente + sucesso/erro claros → Task 1
- Select chevron spacing → Task 2
- Ícones salvar/desativar/excluir + CTAs filled + system.md buttons → Task 2
- Período Dashboard+Histórico → Task 3
- PDF visual → Task 4
- KPI/button color mobile-only → Task 5
- Mobile-first Produtos sheet → Task 6
- One branch, commits per task → all
- Desktop no wizard → Tasks 5–6
