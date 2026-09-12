# QA — Test Identities

Ambiente: dev server local (`npm run dev` em `apps/web`), **memory store + seed** (sem `DATABASE_URL`).
Reset do ambiente = reiniciar o dev server (estado em memória é descartado). Nenhum dado real ou de produção é tocado.

## Modelo de acesso descoberto no sistema

Não assumido — lido do código (`src/doguinho/types.ts`, `app.ts`, `seed.ts`):

- **Dono**: papel de sistema (`isDono`). Tem todas as 7 permissões, alcança todas as Lojas sem Vínculo. O último Dono não pode ser desligado nem rebaixado.
- **Perfil**: conjunto nomeado de permissões criado pelo Dono via checklist. Seed traz o template **"Operador"** (`read_estoque`, `submit_fechamento`, `submit_correcao`, `read_history`).
- **Vínculo**: relação usuário ↔ Lojas. Sem Vínculo, não-Dono não vê a Loja.
- **Permissões existentes**: `read_estoque`, `submit_fechamento`, `submit_correcao`, `read_history`, `dashboard`, `manage_produto`, `manage_users`.

## Multi-tenancy (mapeamento real)

O MVP tem **uma única Organização** (`org-doguinho`, ADR-0002: `organization_id` preparado no modelo, sem gestão de tenants). Portanto:

- "Tenant A / Tenant B" do plano genérico → **Loja A / Loja B** (o boundary real do MVP é o Vínculo por Loja).
- Isolamento **cross-Organização**: não exercitável com o seed (só existe uma org). Registrado como limitação em `SECURITY_CONTEXT.md` (UNKNOWN/NEEDS VERIFICATION com Postgres multi-org).

## Identidades

| Identity | Organização | Lojas (Vínculo) | Papel / Perfil | Permissões efetivas | Origem |
|---|---|---|---|---|---|
| `dono@doguinho.local` | Doguinho do Coruja | todas (sem Vínculo) | **Dono** (sistema) | todas as 7 | seed |
| `operador.centro@doguinho.local` | Doguinho do Coruja | Centro | Perfil "Operador" | read_estoque, submit_fechamento, submit_correcao, read_history | criar via UI no QA |
| `operador.multi@doguinho.local` | Doguinho do Coruja | Centro, Jardim Juliana | Perfil "Operador" | idem, em 2 Lojas | criar via UI no QA |
| `restrito@doguinho.local` | Doguinho do Coruja | Centro | Perfil custom "Restrito" (só `read_estoque`) | read_estoque | criar via UI no QA |
| `dono2@doguinho.local` | Doguinho do Coruja | todas | Dono (promovido p/ testar rebaixar/último Dono) | todas | criar via UI no QA |

**Credenciais**: a senha do Dono de seed é `coruja` (constante `SEED_DONO_PASSWORD` em `src/doguinho/seed.ts` — credencial de teste local, não é secret real). Usuários criados no QA recebem senhas de teste descartáveis (mín. 8 caracteres, exigência do domínio). Nenhuma credencial real ou de produção é usada/registrada.

## Dados de seed

- **Lojas**: Centro, Jardim Juliana, Magalhães
- **Produtos ativos** (9): Milho (kg), Ervilha (kg), Tomate (kg), Cebola (kg), Maionese (L), Mostarda (L), Salsicha (unidade), Pão (unidade), Molho de tomate (L)
- **Perfil template**: Operador

## Verificação do ambiente (2026-09-12)

| Check | Resultado |
|---|---|
| `GET /` sem cookie | 307 → `/entrar` ✅ |
| `GET /entrar` | 200 ✅ |
| `GET /dashboard` sem cookie | 307 → `/entrar` ✅ |
| Store | memory (sem `DATABASE_URL`) ✅ resetável |

## Notas operacionais

- Rate limit de login: 5 tentativas / 15 min por e-mail (em processo). Se um cenário de auth bloquear, reiniciar o dev server reseta.
- Sessão: cookie `doguinho_session` (httpOnly, sameSite=lax, TTL 12h). Para simular "sessão expirada/inválida", editar o valor do cookie no navegador.
- Cenários que exigem 2 usuários simultâneos (ex.: dois operadores na mesma Loja) usam 2 perfis de navegador isolados (contexts) no Playwright.
