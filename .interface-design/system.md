# Interface system: Doguinho do Corujá

Direction: a night-shift conferência on warm paper, under a ketchup awning. The Dono reads remaining counts across Lojas. The Operador types quantities on a phone at encerramento.

## Feel

Operational, warm, dense on mobile, quiet on desktop. Not a finance dashboard. Not a POS.

## Domain

Encerramento, prateleira, quantidade restante, caderninho, barraca de cachorro-quente, coruja, pena.

## Color world

- `--ketchup` `#E31C23`: awning, primary action, selection
- `--ketchup-hot` `#FF2A31`: active nav, urgent Correção
- `--mustard` / `--feather`: gold, used sparingly (wordmark tracking, pena, rascunho chip)
- `--paper` `#F4F0EA`: canvas
- `--sheet` `#FFFDF9`: raised sheet
- `--ink` `#241710`: text
- `--steam`: supporting text
- `--counter`: inset controls, never official Estoque

Brand red is for action, selection, and punctual state, not decoration.

## Signature

1. Full-red awning sidebar (login red), vivid active item (`ketchup-hot`), no opaque wash.
2. Feather / pena marker on the active nav item.
3. Tabular remaining quantities as the hero of Fechamento and Estoque.
4. Status chips: rascunho · enviado · correção necessária. Do not show “Nunca fechou”.
5. Login door: ketchup field with a *slightly darker* red wash only (no lighter reds), larger sheet card, owl lockup PNG (not a screenshot of the login UI).

## Rejected defaults

- KPI cards / charts / widget grid → remaining-count table and Fechamento list
- Muted/opaque selected nav → vivid ketchup-hot
- Inter + gray-700 tokens → Red Hat + ketchup/paper/ink
- Movement (in/out) UI → quantidade restante only
- Glass, gradient, glow, large shadow → borders + paper/sheet shift

## Depth

Borders and surface tint only. Login card has no heavy drop shadow. Radius 6 / 8 / 10.

## Type

Red Hat Display (wordmark, titles) + Red Hat Text (UI). Ratio ~1.25 from 15px body. Weight + color do more than size. Numbers: `tabular-nums`.

## Density

4px grid. Mobile Fechamento rows ~48px hit area. Desktop table compact. Sidebar 272px. Page gutter 24px / 40px / 48px (mobile / md / lg), shared by header and canvas. Content is left-aligned to that gutter, never a centered mobile column. Listings are full width of the main column. Cell pad 20px / 14px (`--listing-px` / `--listing-py`).

## Components

- Brand lockup: owl + boxes + laptop + checklist, wordmark Doguinho do Corujá. Same PNG on login card and sidebar header, on the surface behind it (no fake login screenshot).
- Button: Mantine, ketchup filled. Default 44px h. Form CTAs (`Guardar rascunho`, `Enviar fechamento`) use size sm and sit right-aligned, not full-width. Spinner + disabled while the request is in flight.
- Input: darker `--control` inset · 8px radius · ketchup focus ring
- Select open/checked: ketchup fill or ketchup text, never a gray pill
- Nav active: ketchup-hot + pena
- Status chip: solid ketchup/mustard/counter, not translucent
- Loading: skeleton bones for header, KPIs/chips, and tables
- Listing table: ketchup thead, mustard status chip under a Loja only for rascunho/enviado/correção, sheet rows, blank empty cells. Toolbar: search + Adicionar produto. Footer: “Mostrando X a Y de Z” + page size + Mantine Pagination (active page is a ketchup disc).

## Auth screen

Ketchup canvas with a subtle darker-red wash (never lighter reds). Sheet card with the owl lockup (~270–320px). Email/password only, no Google. Password visibility toggle is a real control.

## Copy

Loja, never tenant or unidade for the store. Estoque is last submitted remaining quantity. Fechamento and Correção stay immutable. Never use an em dash. Prefer a period, a colon, or a rewrite. Empty values stay blank, not a dash.
