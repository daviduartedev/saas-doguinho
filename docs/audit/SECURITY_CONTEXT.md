# Security Context

Data: 2026-09-12 · Branch: `audit/security-qa` @ `4f5bb7b` · Método: leitura direta do código (codebase pequeno, ~24 arquivos no módulo `doguinho` + 9 páginas), orientado pela skill `audit-context-building` (entender, não vereditar).

**Escopo deste documento:** mapear o sistema para informar o QA. **Não** é auditoria: sem vulnerabilidades nomeadas, sem severidade, sem correções, sem scanners. Suspeitas ficam como `NEEDS VERIFICATION`; lacunas de conhecimento como `UNKNOWN`.

Documentação de segurança pré-existente (fase de pesquisa, baseline ASVS L1): `security/README.md` + 6 docs (threat model, ASVS baseline, authorization, authentication/session, inventory integrity, input validation). Este documento descreve o **estado implementado**; aqueles descrevem a **intenção**.

## Architecture

SPA-like Next.js 15.5.25 (App Router) em `apps/web`, sem backend separado:

- **Camada de apresentação**: páginas RSC em `src/app` + componentes cliente em `src/components`.
- **Camada de aplicação (seam único)**: módulo `src/doguinho/` — `app.ts` expõe a interface `DoguinhoApp` com toda a lógica de negócio e autorização; páginas e actions só falam com ela.
- **Camada de dados**: interface `Store` (`store.ts`) com duas implementações — `memory-store.ts` (default sem `DATABASE_URL`) e `postgres-store.ts` (postgres.js, queries parametrizadas, migrações idempotentes em `migrate()`).
- **Runtime**: `runtime.ts` faz boot singleton via `globalThis`; escolhe store pela presença de `DATABASE_URL`; roda `app.seed()` em todo boot (no Postgres é no-op se a org existe; em memória sempre semeia).
- Relógio de negócio: `America/Sao_Paulo` (`clock.ts`) — `calendarDay` define "o dia" do Fechamento.

## Authentication

- Login interno por e-mail + senha (`entrarAction` → `app.entrar`).
- Senha: bcrypt custo 12 (`passwords.ts`). Política: mín. 8 caracteres para usuários criados (`MIN_PASSWORD`). **Fato registrado:** a senha do Dono de seed (`coruja`, 6 chars) está abaixo da política — só existe via seed.
- Resposta de falha genérica ("E-mail ou senha inválidos.") para e-mail inexistente e senha errada (`AuthFailedError`, ASVS V6.3); hash dummy para equalizar tempo quando o e-mail não existe.
- Rate limit de login: 5 tentativas / 15 min por **e-mail**, em processo (`rate-limit.ts`). **Fatos:** reseta ao reiniciar o processo; não é por IP; não cobre outras actions.
- Sessão: token de 32 bytes hex via CSPRNG (`ids.ts`), cookie `doguinho_session` `httpOnly; sameSite=lax; path=/; secure` (secure só em produção), TTL 12h (`SESSION_TTL_MS`). Sessão expirada é deletada no acesso. Sem rotação de token observada. Sem "lembrar-me", sem MFA, sem recuperação de senha (fora de escopo declarado em `security/README.md`).

## Authorization

Três camadas, todas presentes:

1. **Middleware** (`src/middleware.ts`): só verifica **presença** do cookie — redireciona para `/entrar` sem cookie, e para `/fechamento` com cookie ao acessar `/entrar`. Não valida o token.
2. **Layout `(app)`** (`(app)/layout.tsx`): `actorDaSessao()` valida a sessão de verdade; inválida → redirect `/entrar`.
3. **Camada de aplicação** (`app.ts`): `assertOrg` (org do actor = org do app), `requireDono`, `requirePermission`, `requireLoja` (Loja existe, pertence à org, e está no Vínculo do não-Dono). Toda operação sensível passa por aqui — enforcement server-side, não só na UI.

Query param `?loja=` é validado por allowlist contra as Lojas do actor (`resolveLojaFiltro`, workspace.ts) — valor fora da lista cai para "todas"/primeira Loja, nunca para a Loja alheia.

Eventos de segurança logados (`log.security` → `console.info("[doguinho]")`): `login_failed`, `login_ok`, `forbidden` (com permissão), `forbidden_loja`, `perfil_created`, `user_disabled`.

## Roles and Permissions

- **Dono** (`isDono`, papel de sistema): todas as permissões, todas as Lojas sem Vínculo. Invariantes: o último Dono não pode ser desligado nem rebaixado (`countDonos <= 1` → ConflictError).
- **Perfil**: conjunto nomeado de permissões via checklist (ADR-0004). Template de seed "Operador": `read_estoque`, `submit_fechamento`, `submit_correcao`, `read_history`.
- **Vínculo**: lista de Lojas por usuário não-Dono.
- Permissões: `read_estoque`, `submit_fechamento`, `submit_correcao`, `read_history`, `dashboard`, `manage_produto`, `manage_users`.
- Permissões desconhecidas em input são rejeitadas (`sanitizePermissions`); a lista efetiva é interseção com `ALL_PERMISSIONS`.
- `criarLoja`, `criarPerfil`, `editarPerfil`, `excluirPerfil`, `rebaixarDono`: só Dono. `manage_users`: listar/criar/desligar usuários, Vínculo, trocar Perfil. `manage_produto`: CRUD de Produto.

## Multi-tenancy

- Tenant = **Organização** (ADR-0002). O modelo carrega `organizationId`/`organization_id` em todas as entidades e queries.
- O seed cria **uma** Organização (`org-doguinho`). Não há UI nem operação para criar outra.
- `assertOrg` compara `actor.organizationId` com a org configurada do app (single-org por processo).

## Tenant Boundaries

- **Boundary Organização**: todas as queries do Postgres filtram por `organization_id`; entidades carregam a org. **NEEDS VERIFICATION** com mais de uma org real no banco (o seed só cria uma; ver Unknowns).
- **Boundary Loja** (o boundary exercitável no MVP): `requireLoja` + Vínculo; dashboard e listagens filtram por Vínculo; `?loja=` por allowlist.
- Dono atravessa o boundary de Loja por definição; ninguém atravessa o de Organização por caminho conhecido.

## Entry Points

- **Páginas** (RSC, grupo `(app)` protegido por layout): `/dashboard`, `/fechamento`, `/estoque`, `/historico`, `/produtos`, `/perfis`, `/usuarios`, `/configuracoes`. Públicas: `/entrar`, `/` (redirect).
- **Server actions** (3 arquivos `"use server"`, únicos pontos de mutação):
  - `actions.ts`: `entrarAction`, `sairAction`.
  - `fechamento-actions.ts`: `salvarRascunhoAction`, `enviarFechamentoAction` (retornam `{ok, erro}`).
  - `admin-actions.ts`: `criarLojaAction`, `criarProdutoAction`, `editarProdutoAction`, `desativarProdutoAction`, `criarPerfilAction`, `editarPerfilAction`, `criarUsuarioAction`, `desligarUsuarioAction`, `alterarVinculoAction`, `alterarPerfilUsuarioAction`.
- **Sem** Route Handlers (`app/api/**/route.ts` inexistente), **sem** webhooks, **sem** upload de arquivos, **sem** import/export de dados.

## APIs

Não há API REST/GraphQL exposta. O "contrato" são as server actions acima, que recebem `FormData` e delegam à camada de aplicação. Next.js aplica as proteções padrão de server actions (origin check); CSP e headers em `next.config.ts`.

## Database

- Postgres via `postgres` (postgres.js), pool máx. 8, SSL quando `sslmode=` presente na URL. Todas as queries usam template literals parametrizados do driver.
- Tabelas: `organizations`, `lojas`, `produtos`, `perfis`, `users`, `vinculos` (PK user+loja), `rascunhos` (PK loja+dia), `submissions`, `estoque` (PK loja+produto, `CHECK quantidade >= 0`), `sessions` (token PK).
- Concorrência do Fechamento: `withLojaLock` = transação + `SELECT ... FOR UPDATE` na linha da Loja (lock pessimista por Loja). No memory store, o equivalente é um lock em processo (ver `memory-store.ts`).
- **Fato registrado:** `produtoHasHistory` busca com `linhas::text LIKE '%<produtoId>%'` sobre o JSON serializado — depende do formato de ID (hex 16 bytes) para não casar substring de outro ID.
- Migrações: `CREATE TABLE IF NOT EXISTS` no boot; sem versionamento de schema.

## External Services

Nenhum. Sem e-mail, storage, pagamento, analytics ou terceiros. Única dependência externa de runtime: o Postgres (quando configurado).

## Privileged Operations

- Só-Dono: criar Loja, criar/editar/excluir Perfil, rebaixar Dono.
- `manage_users`: criar usuário (define senha inicial), desligar usuário (mata sessões), alterar Vínculo, alterar Perfil.
- `manage_produto`: criar/editar/desativar/excluir Produto (excluir bloqueado se houver histórico — ADR-0003).
- `submit_correcao`: Correção sobrescreve o Estoque oficial (com Justificativa obrigatória; o Fechamento original permanece).
- Boot: `seed()` cria org/lojas/produtos/perfil/Dono quando a org não existe.

## User-Controlled Inputs

| Entrada | Onde | Tratamento observado |
|---|---|---|
| email, senha | `entrarAction` | normalizeEmail; verify bcrypt; rate limit |
| `linhas` (JSON em FormData) | fechamento actions | `JSON.parse` + coerção `Number()`; validação por unidade (teto 99.999, sem negativos, casas decimais por unidade) em `quantities.ts`; linhas fora dos Produtos ativos são descartadas pelo mapa de ativos |
| `justificativa` | `enviarFechamentoAction` | trim; obrigatória em Correção; armazenada e exibida no histórico (renderização React escapa por padrão) |
| `loja` (query param) | páginas do workspace | allowlist (`resolveLojaFiltro`) |
| nome (Loja/Produto/Perfil/usuário) | admin actions | `normalizeName` (trim + colapsa espaços); unicidade case-insensitive para Produto/Perfil |
| email, senha, perfilId, lojaIds | `criarUsuarioAction` | validações de formato, existência e pertencimento à org |
| ids em geral (`id`, `userId`…) | admin actions | existência + org conferidos na camada app; inexistente/alheio → ForbiddenError |
| `perm_<permission>` checkboxes | perfil actions | interseção com `ALL_PERMISSIONS` |

## Trust Boundaries

1. Navegador ↔ Next.js (server actions, RSC): todo dado de cliente é não-confiável; autorização só no servidor.
2. Next.js ↔ Store: a interface `Store` assume que a camada app já autorizou — stores **não** revalidam autorização (correto por design do seam; significa que nenhum caller pode pular `app.ts`).
3. App ↔ Postgres: queries parametrizadas; JSON de `linhas`/`permissions` serializado pela app.
4. Processo ↔ segredos: `DATABASE_URL` é o único segredo de infra; senha de seed é constante de código.

## Security-Sensitive Flows

- **Login** (rate limit, dummy hash, cookie de sessão).
- **Fechamento/Correção** (`enviar`): lock por Loja, validação de todos os Produtos ativos, idempotência — reenvio com as mesmas quantidades retorna o primeiro envio sem exigir Justificativa (`sameLinhas`), Correção exige Justificativa, Estoque é substituído pela última quantidade restante.
- **Gestão de usuários**: criar (senha inicial em texto claro trafega via action TLS), desligar (revoga sessões), rebaixar/desligar último Dono (bloqueado).
- **Gestão de Perfis**: edição muda permissões de todos os usuários com aquele Perfil no próximo carregamento de actor (actor é reconstruído por request a partir do usuário — **fato**: permissões são resolvidas por request, não congeladas na sessão).
- **Boot/seed**: cria credencial de Dono conhecida em qualquer ambiente sem `DATABASE_URL` (memória) ou com banco vazio.

## Assumptions

Registradas plainly (o código conta com elas; onde nada força, dito explicitamente):

1. O ambiente de produção define `DATABASE_URL`. **Nothing found** que impeça boot em produção sem ela — nesse caso o app sobe com memory store e o Dono de seed público (`dono@doguinho.local` / `coruja`).
2. O operador do deploy troca/desativa a credencial de seed. **Nothing found** que force isso (sem troca obrigatória de senha no primeiro login).
3. Um único processo Node por ambiente (rate limit e locks do memory store são em processo; o lock do Postgres é por banco, então multi-instância com Postgres depende só do `FOR UPDATE`).
4. O relógio do servidor está correto — `calendarDay` (São Paulo) define o dia do Fechamento; não há proteção contra clock skew.
5. TLS terminado antes do app (cookie `secure` só com `NODE_ENV=production`; senha inicial de usuário criado trafega dentro da action).
6. IDs hex de 16 bytes não colidem e não são substring um do outro (suporta o `LIKE` de `produtoHasHistory`).
7. Server actions do Next rejeitam origem cruzada por padrão (proteção CSRF nativa); soma-se `sameSite=lax`.

## Unknowns

- **UNKNOWN**: comportamento com duas Organizações reais no mesmo banco (seed só cria uma; `assertOrg` compara com a org do processo — não há caminho para um segundo tenant coexistir neste deploy, mas o modelo Postgres não foi exercitado multi-org).
- **UNKNOWN**: comportamento do lock de Fechamento sob múltiplas instâncias com memory store (cada instância teria seu próprio estado — configuração inválida, mas nada a detecta).
- **UNKNOWN**: revisão de segurança do frontend (componentes Mantine/Radix, markdown/HTML injetável) — não analisada nesta rodada; React escapa por padrão, mas `dangerouslySetInnerHTML` não foi auditado (não observado em grep rápido).
- **UNKNOWN**: cobertura de logs de segurança em produção (vão para stdout; destino/persistência fora do código).
- **NEEDS VERIFICATION**: CSP `script-src 'unsafe-inline' 'unsafe-eval'` — necessidade real do `unsafe-eval` não verificada (pode ser exigência de libs de dev/build; registrar para auditoria futura).
- **NEEDS VERIFICATION**: ausência de rotação de sessão após login/elevação — comportamento intencional ou lacuna, não decidido nesta rodada.

## Areas Recommended for Future Security Audit

Ver `SECURITY_FUTURE_SCOPE.md`.
