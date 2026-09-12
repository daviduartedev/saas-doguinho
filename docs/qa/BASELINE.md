# QA Baseline — audit/security-qa

Data: 2026-09-12 · Branch: `audit/security-qa` @ `4f5bb7b` (merge PR #13, igual a `origin/main`)
Ambiente: Windows 11 (10.0.26200) · Node v22.18.0 · npm 10.9.3 · app em `apps/web` (Next.js 15.5.25, React 19.3.0, Mantine 9.6.1)

Propósito: distinguir falhas **já existentes** de regressões introduzidas durante o QA. Nenhum script foi inventado; os gates abaixo são os de `apps/web/package.json`.

## Gates

| Gate | Comando | Resultado | Notas |
|------|---------|-----------|-------|
| Lint | `npm run lint` | ✅ PASS | 0 erros, 0 avisos (~44s) |
| Typecheck | `npm run typecheck` | ✅ PASS | `tsc --noEmit` limpo |
| Unit tests | `npm run test` | ✅ PASS | 22/22 testes em `src/doguinho/application.test.ts` (vitest 3.2.7) |
| Build (webpack) | `npm run build` | ❌ **FAIL (pré-existente)** | Ver detalhe abaixo |
| Integration tests | — | ⚪ Inexistente | Não há config de testes de integração no repo |
| CI | — | ⚪ Inexistente | Sem `.github/workflows`; gates rodam só localmente |

## Falha pré-existente: `npm run build` (webpack)

**Sintoma:** `Failed to compile.` — `./node_modules/@mantine/core/esm/components/Transition/Transition.mjs: Attempted import error: 'Activity' is not exported from 'react'`. Trace via `Button.mjs` → `__barrel_optimize__` → `src/components/ui/button.tsx` / `submit-button.tsx`.

**Reprodução:** determinístico. Falha igual com `.next` limpo (cache removido).

**Caracterização (não é fix):**
- `react@19.3.0` instalado **exporta** `Activity` (`exports.Activity = Symbol.for("react.activity")` em `cjs/react.production.js`).
- O build webpack do Next 15.5.25 resolve `react` pela camada compilada do Next (`next/dist/compiled/react`), que não expõe `Activity` para o ESM do Mantine 9.6.1.
- O script `dev` usa `--turbopack` e funciona — por isso a falha não aparecia no dia a dia.
- **Diagnóstico comparativo:** `npx next build --turbopack` ✅ PASSA (22s, 11 rotas + middleware). Não é script do repo; rodado apenas como evidência.

**Candidato a bug do relatório QA:** severidade alta (build de produção quebrado na `main`). Correção provável: `build: "next build --turbopack"` ou upgrade do Next. Decisão na fase de fixing.

## Rotas (saída do build turbopack)

```
○  /                (static)
ƒ  /entrar          /dashboard       /estoque        /fechamento
ƒ  /historico       /produtos        /perfis         /usuarios
ƒ  /configuracoes   + Middleware 39.2 kB
```

## Ambiente de execução dos gates

- `node_modules` presente e sincronizado com o lockfile do merge (react 19.3.0, @mantine/core 9.6.1).
- Sem `.env` / `.env.local` em `apps/web` → `DATABASE_URL` ausente → app sobe com **memory store + seed** (ver `src/doguinho/runtime.ts`). Ideal para QA destrutivo e resetável.
- Playwright: **não instalado** (nenhum `playwright.config.*`, nenhuma dependência).

## Riscos conhecidos para o QA

1. Build de produção quebrado (acima) — QA usará `next dev --turbopack` ou `next build --turbopack && next start`.
2. Sem CI — nenhum gate automático além deste baseline local.
3. Rate limit de login em processo (5 tentativas / 15 min por e-mail) — pode bloquear cenários de auth; reiniciar o dev server reseta.
