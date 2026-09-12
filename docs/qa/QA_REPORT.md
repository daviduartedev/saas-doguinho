# QA Report — Doguinho do Corujá

**Rodada:** `audit/security-qa` (2026-09-12) · **Base:** spec #14, tickets #15–#29
**Ambiente:** dev server local (`next dev`, porta 3000), **memory store + seed** (`DATABASE_URL` ausente — ambiente destrutível/resetável por restart), Node 22, Chromium via Playwright, Windows 11.
**Identidades:** ver `TEST_IDENTITIES.md` (Dono, Operador Centro, Operador Multi, Restrito, Gerente Centro + descartáveis).

> Princípio da rodada: **SECURITY = DOCUMENTAR** (`../audit/SECURITY_CONTEXT.md`), **QA = EXECUTAR** (este documento).

---

## 1. Resumo executivo

| Métrica | Valor |
| --- | --- |
| Fluxos descobertos (QA_MAP) | 9 áreas, 40+ rotas/ações |
| Cenários planejados (QA_PLAN) | 60 + 14 vetores break-it = **74** |
| Cenários executados | **74** (100%) |
| PASS definitivo | 65 |
| FAIL → bug confirmado | 9 (→ 10 bugs: um FAIL expôs 2 bugs) |
| BLOCKED | 0 |
| SUSPICIOUS (não confirmado como bug) | 2 (+3 observações de domínio) |
| Bugs Critical / High / Medium / Low | 0 / **3** / **5** / **2** |

**Veredito parcial (pré-correção):** QA GATE **NÃO PASSA** — 3 bugs High abertos (QA-001, QA-002, QA-009).

Contagens por área (vereditos definitivos, após correção de falsos positivos de script):

| Área | Cenários | PASS | FAIL→bug |
| --- | --- | --- | --- |
| AUTH (autenticação, rate limit, sessão) | 10 | 9 | AUTH-06 → QA-002 |
| AUTHZ (permissões, vínculos, URL direta, ações forçadas) | 14 | 12 | AUTHZ-05 → QA-003; crash pages → QA-004 |
| FECH (fechamento, rascunho, limites, paginação) | 13 | 13 | — |
| CORR (correção, justificativa, idempotência) | 8 | 8 | — |
| PROD (produtos CRUD, desativar, excluir no seam) | 10 | 10 | (observações) |
| PERF/USER (perfis, usuários, efeito imediato) | 16 | 15 | USER-07 → QA-002 (2º gatilho) |
| DASH/ESTQ (dashboard, estoque, busca) | 7 | 7 | DASH-01 SUSPICIOUS |
| NAV (refresh, back/forward, 404, mobile, offline) | 9 | 9 | NAV-08 → QA-005 |
| BREAK (break-it pass) | 14 | 10 | BREAK-09 → QA-009+QA-010; BREAK-10 → QA-006; BREAK-12 → QA-007; BREAK-14 → QA-008 |

Evidências: `docs/qa/evidence/results.jsonl` (127 registros brutos, incl. vereditos corrigidos) e `docs/qa/evidence/<area>/*.png`.

---

## 2. Registro de bugs

### QA-001 — `npm run build` (webpack) quebrado · **High** · Build · pré-existente em `main`

- **Ambiente:** qualquer checkout limpo; Node 22, Windows.
- **Passos:** `npm run build` em `apps/web`.
- **Esperado:** build de produção verde.
- **Atual:** falha de compilação — `@mantine/core` (ESM) importa `Activity` de `react` e o bundler webpack do Next 15.5.25 rejeita. `next build --turbopack` **passa**.
- **Reprodutibilidade:** 100% (baseline, 2×).
- **Evidência:** `BASELINE.md`; saída completa no log do baseline.
- **Impacto:** pipeline de deploy/CI que use `next build` padrão está vermelho; mascara qualquer regressão futura de build.

### QA-002 — Sessão inválida/expirada/revogada → loop infinito de redirects · **High** · Auth/Sessão

- **Precondições:** possuir cookie `doguinho_session` cujo token não existe mais no servidor.
- **Gatilhos confirmados (3):** (a) cookie adulterado (token lixo); (b) sessão expirada (>12h, confirmado com sessão real expirada); (c) usuário desligado enquanto logado — `desligarUsuario` apaga as sessões no servidor, mas o cookie restante do navegador cai no loop (USER-07).
- **Passos:** com cookie inválido, abrir qualquer rota (ex.: `/fechamento`).
- **Esperado:** redirect único para `/entrar` com cookie limpo.
- **Atual:** `ERR_TOO_MANY_REDIRECTS`. Cadeia: middleware confia na **presença** do cookie → deixa passar; layout/`exigirActor` valida o token → `redirect("/entrar")`; middleware vê cookie presente em `/entrar` → redirect de volta para `/fechamento`. Ninguém apaga o cookie inválido.
- **Reprodutibilidade:** 100% nos 3 gatilhos.
- **Evidência:** `evidence/auth/` (AUTH-06), `evidence/usuarios/` (USER-07).

### QA-003 — /fechamento oferece ações a quem não tem `submit_*` · **Medium** · Autorização/UI

- **Role/Tenant:** Restrito (apenas `read_estoque`), Tenant único, Loja Centro.
- **Passos:** login como `restrito@doguinho.local` → `/fechamento`.
- **Esperado:** formulário somente-leitura ou sem botões de ação (o nav já esconde "Fechamento").
- **Atual:** "Guardar rascunho" e "Enviar fechamento" renderizam e o auto-save dispara `salvarRascunhoAction` a cada edição — tudo rejeitado no servidor com "Sem autorização." (silencioso para o usuário; rejeições só aparecem ao clicar Enviar).
- **Reprodutibilidade:** 100%.
- **Evidência:** `evidence/authz/` (AUTHZ-05); rejeição server-side confirmada (a autorização no seam app está correta — o problema é só a UI otimista).

### QA-004 — Sem error boundary: erros de validação/permissão viram "Application error" · **Medium** · Resiliência/UI

- **Passos (exemplos):** cadastrar Produto duplicado; cadastrar Perfil duplicado; criar usuário com e-mail existente; abrir `/historico` sem `read_history`.
- **Esperado:** mensagem inline amigável (ex.: "Já existe um Produto com esse nome.").
- **Atual:** a exceção (`ConflictError`/`ValidationError`/`ForbiddenError`) propaga sem `error.tsx` → página inteira vira "Application error: a client-side exception…" (digest em produção). O usuário perde o contexto e não vê a mensagem de domínio.
- **Reprodutibilidade:** 100% em 4 fluxos distintos.
- **Evidência:** `evidence/produtos/` (PROD-03), `evidence/breakit/break-12.png`, AUTHZ-06 (/historico restrito). O crash transitório observado no QA-03 (digest 3937171456) é explicado por este bug (criação de usuário duplicado).

### QA-005 — Falha de rede no envio do Fechamento é silenciosa · **Low** · Fechamento

- **Passos:** preencher Fechamento → ficar offline (contexto do browser offline) → Enviar.
- **Esperado:** mensagem "sem conexão, tente novamente".
- **Atual:** `enviarFechamentoAction` rejeita com "Failed to fetch"; o callback do `useTransition` não tem `catch` → nada aparece; o usuário não sabe que nada foi salvo. (Estoque permanece íntegro — verificado.)
- **Reprodutibilidade:** 100%.
- **Evidência:** `evidence/nav/` (NAV-08).

### QA-006 — Sessão expira durante o preenchimento → submit quebra a página · **Medium** · Fechamento/Sessão

- **Passos:** login → abrir `/fechamento` → apagar o cookie (simula expiração) → Enviar.
- **Esperado:** mensagem "Sessão expirada." (o action já retorna esse erro!) ou redirect para `/entrar`.
- **Atual:** o middleware responde 307 ao **POST da action** (sem cookie) → o cliente Next rejeita com "An unexpected response was received from the server" → promise do `start()` rejeita sem `catch` → "Application error" no DOM, nenhuma mensagem de domínio, sem redirect. A mensagem "Sessão expirada." **nunca é exibida**.
- **Reprodutibilidade:** 3/3.
- **Evidência:** `evidence/breakit/break-10-t1.png`, `break-10-t2.png`; log do dev server.
- **Nota:** mesmo defeito de família do QA-005 (mutações sem `catch`), gatilho diferente.

### QA-007 — Nome de Produto desativado fica "queimado" para sempre · **Medium** · Produtos

- **Passos:** criar Produto "Ciclo QA" → Desativar → criar "Ciclo QA" de novo.
- **Esperado:** reativação do existente ou erro claro com caminho de recuperação.
- **Atual:** `findProdutoByName` casa produtos **inativos** → `ConflictError` (via crash page, QA-004); **não existe UI nem ação de reativar** → o nome fica inutilizável definitivamente (só cirurgia no banco).
- **Reprodutibilidade:** 100%.
- **Evidência:** `evidence/breakit/break-12.png`.
- **Relacionado:** /estoque e /fechamento escondem produtos desativados mesmo com Estoque oficial > 0 (ver Observações).

### QA-008 — Corrida cria usuários com e-mail duplicado · **Medium** · Usuários/Integridade

- **Passos:** 2 POSTs simultâneos da action de criar usuário com o mesmo e-mail (janela ampla: o hash bcrypt leva ~1s sob concorrência).
- **Esperado:** um criado, um rejeitado ("Já existe um usuário com esse e-mail.").
- **Atual:** **ambos criados** — check-then-insert sem serialização e **sem constraint UNIQUE** (DDL do postgres: `email TEXT NOT NULL`; memory store indexa por id). Reproduzido 2×: 2 usuários `race@doguinho.local` e 2 `race2@doguinho.local`. Login passa a casar o primeiro encontrado — identidade ambígua.
- **Reprodutibilidade:** 2/2.
- **Evidência:** probe12 (listagem), log do dev server (dois `POST /usuarios 200` concorrentes).
- **Nota:** exige permissão `manage_users` (Dono) — não é vetor externo; risco é de integridade operacional.

### QA-009 — Criar Loja SEMPRE mostra "Application error" (mesmo criando) · **High** · Configurações

- **Passos:** Dono → `/configuracoes` → nome válido → "Criar Loja".
- **Esperado:** redirect para a lista com a Loja nova.
- **Atual:** a Loja **é criada**, mas `criarLojaAction` chama `redirect()` **dentro do `try`** — o `NEXT_REDIRECT` cai no `catch` → `fail()` → "Não foi possível salvar." → página de erro 500. O usuário acha que falhou e tende a repetir (nomes de Loja não têm unicidade) → duplicatas.
- **Reprodutibilidade:** 100% (UI 2× + POST forçado 1×; stack no log do dev server).
- **Evidência:** `evidence/breakit/qa-009-crash-apos-criar-loja.png`; stack trace `admin-actions.ts:13`.

### QA-010 — Sem limite server-side de tamanho para nomes/justificativa · **Low** · Validação

- **Passos:** POST forçado de criar Loja com nome de 10.000 chars (o `maxLength={80}` é só client-side); idem Produto (300 chars com emoji aceito via UI no QA-07); Justificativa de 10.000 chars aceita no Fechamento.
- **Atual:** tudo persiste. Nomes gigantes degradam o chrome (switcher, listagens, vínculos).
- **Reprodutibilidade:** 100%.
- **Evidência:** `evidence/breakit/break-09-10k.png`, BREAK-08.

---

## 3. SUSPICIOUS / observações (não classificados como bug)

1. **DASH-01 — KPIs "ilustrativos":** com <4 dias de movimento, o Dashboard calcula Entradas/Saídas/Líquido a partir de uma **série stub** (números falsos), com disclaimer pequeno "Série ilustrativa". Controle real: Entradas=5. Risco de decisão sobre dado inventado → **decisão de produto necessária** (esconder KPIs ou zerá-los no modo ilustrativo?).
2. **/estoque esconde Produto desativado com Estoque > 0:** o valor oficial some da visão. Pode ser intencional (catálogo ativo), mas o Histórico preserva os envios. Confirmar regra de domínio.
3. **USER-10 — sem caminho de promoção a Dono:** não existe UI/ação para promover Operador a Dono nem rebaixar Dono (o último Dono é protegido — verificado). Documentar como decisão ou gap.
4. **Paginação clampa página fora do range** para a última válida (ex.: `?page=3` com 2 páginas mostra a pág. 2) — comportamento defensivo correto, registrado para conhecimento.
5. **Next.js avisa "Missing origin header"** em chamadas de action sem Origin (só observado em POSTs forçados por script; browsers enviam Origin). O Next valida Origin em actions — ponto positivo registrado no SECURITY_CONTEXT.

## 4. Cobertura não executada (fora de escopo desta rodada)

- Auditoria de segurança profunda (CodeQL/Semgrep/supply-chain/variant-analysis) — ver `../audit/SECURITY_FUTURE_SCOPE.md`.
- Pentest / exploração ofensiva (fora do mandato do break-it funcional).
- Teste contra Postgres real (a rodada usou o memory store; o DDL foi inspecionado estaticamente — origem do achado "sem UNIQUE" do QA-008).
- Performance/carga (não planejado na spec #14).

## 5. Estado do QA Gate (parcial, pré-correção)

| Critério | Estado |
| --- | --- |
| 0 Critical abertos | ✅ (nenhum encontrado) |
| 0 High abertos | ❌ QA-001, QA-002, QA-009 |
| Fluxos críticos verdes | ❌ (criar Loja quebrado — QA-009) |
| Suíte de regressão verde | ⏳ pendente (QA-14) |
| Build verde | ❌ QA-001 |
| Sem regressões inexplicadas | ✅ |
| Medium/Low documentados | ✅ (este relatório) |

**Próxima fase:** QA-13 (correções red→green na ordem QA-009 → QA-002 → QA-001 → QA-006/005 → QA-003/004 → QA-007/008/010) → QA-14 (E2E permanentes) → QA-15 (reteste) → gate final.
