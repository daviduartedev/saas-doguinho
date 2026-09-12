# Security — Future Audit Scope

Áreas que merecem auditoria de segurança dedicada **em rodada futura**. Esta rodada (2026-09-12, `audit/security-qa`) apenas documentou o contexto (`SECURITY_CONTEXT.md`) — nada abaixo foi executado.

## Áreas prioritárias (do mapeamento de contexto)

1. **Authorization enforcement** — revisar que toda operação sensível passa por `requireDono`/`requirePermission`/`requireLoja` e que nenhum caller futuro contorna `app.ts` (o seam é o ponto único de enforcement).
2. **Tenant isolation** — exercitar o Postgres com 2+ Organizações reais (UNKNOWN hoje); provar que nenhuma query vaza cross-org.
3. **Session handling** — rotação de token pós-login, invalidação em troca de Perfil/senha, comportamento do cookie em subdomínios.
4. **Boot/seed em produção** — garantir que produção nunca sobe sem `DATABASE_URL` com credencial de seed pública; troca obrigatória de senha no primeiro acesso.
5. **CSP** — remover `unsafe-eval`/`unsafe-inline` de `script-src` se viável; avaliar nonce-based CSP do Next.
6. **Rate limiting** — cobertura além do login (actions de mutação), por IP, e persistência fora de processo.
7. **Input validation** — fuzzing de `linhas` (JSON em FormData), `justificativa` (tamanho máximo — **não há teto observado**), nomes (comprimento), e o `LIKE` de `produtoHasHistory`.
8. **Concorrência do Fechamento** — provas de corrida além do `FOR UPDATE` (double submit cross-instance, clock skew).
9. **Logs de segurança** — destino, retenção, e ausência de dados sensíveis (senhas nunca logadas — verificar).

## Ferramentas registradas para a fase de Security Audit (não executadas nesta rodada)

- CodeQL
- Semgrep
- insecure-defaults
- supply-chain-risk-auditor
- fp-check
- variant-analysis
- fix-review

## Fora de escopo declarado pelo produto (security/README.md)

Upload de arquivo, GraphQL, WebSocket, OAuth/OIDC, MFA, recuperação de senha (Q24 adiado). Se algum entrar no roadmap, o escopo de auditoria cresce correspondente.

## Gatilhos que antecipam a auditoria

- Segunda Organização real no banco (multi-tenant de verdade).
- Deploy público com dados de clientes.
- Novo entry point (API route, webhook, upload).
