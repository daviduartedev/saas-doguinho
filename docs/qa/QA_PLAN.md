# QA Plan — Matriz de testes

Data: 2026-09-12 · Ticket: QA-02 (#16) · Base: `QA_MAP.md` + validações reais do código (`quantities.ts`, `app.ts`, `middleware.ts`) · Identidades: `TEST_IDENTITIES.md`.

Vereditos por cenário: **PASS / FAIL / BLOCKED / SUSPICIOUS**. Regra de bug: observar → reproduzir → reproduzir → evidência → classificar (QA-NNN).

Legenda de roles: **D**=Dono seed · **OC**=operador.centro (Vínculo: Centro) · **OM**=operador.multi (Centro+Jardim Juliana) · **R**=restrito (só `read_estoque`, Centro) · **A**=anônimo.

## AUTH — Autenticação e sessão (→ QA-03)

| ID | Role | Ação | Esperado | Técnica |
|---|---|---|---|---|
| AUTH-01 | A | Login Dono válido | Redirect `/fechamento`; cookie `doguinho_session` httpOnly/lax | happy |
| AUTH-02 | A | Senha errada | `/entrar?erro=1`, msg "E-mail ou senha inválidos." | invalid |
| AUTH-03 | A | E-mail inexistente | **Mesma** mensagem de AUTH-02 (comparar texto) | invalid |
| AUTH-04 | A | 6 tentativas erradas seguidas | 6ª bloqueada por rate limit (redirect erro) | boundary |
| AUTH-05 | D | Logout | Cookie removido; `/fechamento` → redirect `/entrar` | happy |
| AUTH-06 | A | Cookie `doguinho_session` adulterado (valor lixo) | Página protegida → redirect `/entrar` | auth |
| AUTH-07 | D | Logado, abrir `/entrar` | Redirect `/fechamento` | navigation |
| AUTH-08 | A | Abrir `/dashboard`, `/usuarios`, `/` deslogado | Todas → `/entrar` | auth |
| AUTH-09 | D | Apagar cookie no meio da sessão → navegar | Redirect `/entrar` | state |
| AUTH-10 | A | Campos vazios no login | Validação `required` do browser, sem request | invalid |

## AUTHZ — Autorização, Perfil e Vínculo (→ QA-04)

| ID | Role | Ação | Esperado | Técnica |
|---|---|---|---|---|
| AUTHZ-01 | D | Criar Perfil "Restrito" (só `read_estoque`) + usuários OC, OM, R | Criados; aparecem na lista | setup/happy |
| AUTHZ-02 | OC | Abrir `/fechamento`,`/estoque`,`/historico`,`/dashboard` | Só Centro visível/selecionável | authz |
| AUTHZ-03 | OC | `?loja=<id Jardim Juliana>` em cada página | Fallback seguro (nunca dados da Loja alheia) | authz/URL |
| AUTHZ-04 | OM | Mesmas páginas | Centro + Jardim Juliana; **nunca** Magalhães | authz |
| AUTHZ-05 | R | `/fechamento` | Sem ação de enviar/rascunho (sem `submit_*`) | authz |
| AUTHZ-06 | R | `/produtos`, `/usuarios`, `/perfis`, `/configuracoes` | Sem ações de gestão; servidor rejeita se forçado | authz |
| AUTHZ-07 | R | `/dashboard` sem permissão `dashboard` | Negado (página ou seção) | authz |
| AUTHZ-08 | OC | Forçar POST de criar Produto (sem `manage_produto`) | Servidor rejeita (erro, sem criar) | authz |
| AUTHZ-09 | OC | Forçar envio de Fechamento na Loja sem Vínculo (Magalhães) | `ForbiddenError` "Sem autorização para esta Loja." | authz |
| AUTHZ-10 | D | Header/shell por role | Nav e identidade refletem o actor | state |

## FECH — Fechamento (→ QA-05)

| ID | Role | Ação | Esperado | Técnica |
|---|---|---|---|---|
| FECH-01 | OC | Preencher todos os 9 ativos e Enviar | Estoque da Loja = valores enviados; status "Enviado" | happy |
| FECH-02 | OC | Guardar rascunho parcial → refresh | Valores persistem; status "Rascunho" | persistence |
| FECH-03 | OC | Enviar com 1 campo vazio | Erro "Informe a quantidade restante de todos os Produtos ativos." | invalid |
| FECH-04 | OC | Quantidade `-1` | Erro "não pode ser negativa" | boundary |
| FECH-05 | OC | Quantidade `0` | Aceito (0 é contagem legítima) | boundary |
| FECH-06 | OC | Quantidade `99999` | Aceito | boundary |
| FECH-07 | OC | Quantidade `100000` | Erro "acima do teto" | boundary |
| FECH-08 | OC | `1,5` em produto `unidade` (Salsicha) | Erro "Use um número inteiro." | boundary |
| FECH-09 | OC | `0,001` em `kg` (Milho) | Aceito (3 casas) | boundary |
| FECH-10 | OC | `0,0001` em `kg` | Erro "até 3 casas decimais" | boundary |
| FECH-11 | OC | Preencher pág.1, ir à pág.2, preencher, voltar, enviar | **Todos** os 9 enviados (estado sobrevive à paginação) ⚠ obs.1 do mapa | state |
| FECH-12 | D | Desativar todos os Produtos → abrir Fechamento | Erro "Não há Produtos ativos para Fechamento." ao enviar | state |
| FECH-13 | OC | Enviar → Estoque | Cada célula Produto×Loja = quantidade enviada | happy |

## CORR — Correção e Histórico (→ QA-06)

| ID | Role | Ação | Esperado | Técnica |
|---|---|---|---|---|
| CORR-01 | OC | 2º envio com valores diferentes, sem Justificativa | Erro "Correção exige Justificativa." | invalid |
| CORR-02 | OC | 2º envio diferente + Justificativa | Correção criada; Estoque = novos valores | happy |
| CORR-03 | OC | Reenviar valores **idênticos** ao 1º envio, sem Justificativa | Retorna o original; **nenhuma** Correção nova no histórico | interaction |
| CORR-04 | OC | Justificativa só com espaços | Tratada como vazia → erro (ou idempotente se mesmas quantidades) | boundary |
| CORR-05 | OC | Abrir `/historico` | Fechamento + Correção, autor, horário, Justificativa, diferenças | happy |
| CORR-06 | R | Tentar corrigir (sem `submit_correcao`) | Rejeitado | authz |
| CORR-07 | OC | Correção muda Estoque; refresh `/estoque` | Novo valor oficial persiste | persistence |

## PROD — Produtos (→ QA-07)

| ID | Role | Ação | Esperado | Técnica |
|---|---|---|---|---|
| PROD-01 | D | Criar "Ração Premium" (pacote) | Aparece na lista e no próximo Fechamento | happy |
| PROD-02 | D | Criar "  ração   PREMIUM " (caixa/espaços) | Conflito "Já existe um Produto com esse nome." | invalid |
| PROD-03 | D | Criar com nome vazio/espaços | Erro "Informe o nome do Produto." | invalid |
| PROD-04 | D | Editar nome + unidade de produto seed | Salvo; reflete no Fechamento | happy |
| PROD-05 | D | Desativar produto | Sai do Fechamento; histórico preservado | state |
| PROD-06 | D | Excluir produto **sem** histórico (se UI expuser) | Permitido; senão registrar "não encontrado na UI" | happy |
| PROD-07 | D | Excluir produto **com** histórico (forçar action) | "Produto com histórico de Fechamento não pode ser excluído." | invalid |
| PROD-08 | D | Unidade fora da lista (payload adulterado) | "Unidade de medida inválida." | invalid |
| PROD-09 | R/OC | Ações de produto sem `manage_produto` | UI esconde; servidor rejeita | authz |
| PROD-10 | D | Nome 300 chars / unicode / emoji | Aceito ou erro tratado — registrar comportamento | boundary |

## PERF — Perfis (→ QA-08)

| ID | Role | Ação | Esperado | Técnica |
|---|---|---|---|---|
| PERF-01 | D | Criar Perfil "Estoquista" (read_estoque + submit_fechamento) | Criado; checklist persiste | happy |
| PERF-02 | D | Nome duplicado | Conflito | invalid |
| PERF-03 | D | Editar Perfil: remover `submit_fechamento` de usuário que usa | Efeito imediato: usuário não envia mais | state |
| PERF-04 | D | Excluir Perfil em uso | "Perfil em uso não pode ser removido." | invalid |
| PERF-05 | D | Excluir Perfil livre | Removido | happy |
| PERF-06 | D | `?editar=<id inexistente>` / id adulterado | Fallback seguro, sem vazar outro Perfil | URL |
| PERF-07 | OC | Abrir `/perfis` sem `manage_users` | Lista negada ou ações ausentes; servidor rejeita mutação | authz |
| PERF-08 | D | Criar Perfil sem nome | "Informe o nome do Perfil." | invalid |

## USER — Usuários (→ QA-08)

| ID | Role | Ação | Esperado | Técnica |
|---|---|---|---|---|
| USER-01 | D | Criar usuário feliz (nome, e-mail, senha 8+, Perfil, 1 Vínculo) | Criado; consegue logar | happy |
| USER-02 | D | Senha com 7 chars | "Senha deve ter pelo menos 8 caracteres." | boundary |
| USER-03 | D | E-mail sem `@` | "E-mail inválido." | invalid |
| USER-04 | D | E-mail duplicado (caixa diferente) | Conflito | invalid |
| USER-05 | D | Perfil adulterado (id inexistente) | "Perfil inválido." | invalid |
| USER-06 | D | Vínculo com lojaId inexistente (adulterado) | "Loja inválida no Vínculo." | invalid |
| USER-07 | D | Desligar usuário **logado** (2 contexts) | Sessão dele morre na próxima navegação | state |
| USER-08 | D | Desligar último Dono | "O último Dono não pode ser desligado." | invalid |
| USER-09 | D | Rebaixar último Dono | "O último Dono não pode perder o acesso." | invalid |
| USER-10 | D | Promover `dono2` a Dono → rebaixar o 1º Dono | Permitido com 2 Donos | happy |
| USER-11 | D | Alterar Vínculo (tirar Centro) | Usuário deixa de ver Centro imediatamente | state |
| USER-12 | D | Alterar Perfil do usuário | Permissões novas valem no próximo request | state |

## DASH/ESTQ — Dashboard e Estoque (→ QA-09)

| ID | Role | Ação | Esperado | Técnica |
|---|---|---|---|---|
| DASH-01 | D | Após FECH-01 em Centro: abrir `/dashboard` | KPIs/listas refletem Centro com Fechamento; "sem Fechamento hoje" = Jardim Juliana + Magalhães | happy |
| DASH-02 | OC | Dashboard | Só Centro em todos os blocos | authz |
| DASH-03 | R | `/dashboard` | Negado (sem `dashboard`) | authz |
| DASH-04 | D | Recortes 7/14/30 dias | Gráfico responde sem erro | interaction |
| ESTQ-01 | D | `/estoque` após FECH-01 | Matriz mostra quantidades de Centro; demais Lojas vazias | happy |
| ESTQ-02 | D | Busca "milho" / "MILHO" / "xyz" | Filtra case-insensitive; sem resultado → estado vazio | happy/invalid |
| ESTQ-03 | D | Paginação: 8/16/24 por página | Contagem e páginas consistentes | interaction |
| ESTQ-04 | OC | Estoque | Só coluna/dados de Centro | authz |

## NAV — Navegação e estados (→ QA-10)

| ID | Role | Ação | Esperado | Técnica |
|---|---|---|---|---|
| NAV-01 | D | Refresh em cada rota autenticada | Estado recarrega sem erro | navigation |
| NAV-02 | D | Back/forward após login e após envio de Fechamento | Sem tela quebrada; estado consistente | navigation |
| NAV-03 | D | URL direta para cada rota | Carrega ou redirect seguro | navigation |
| NAV-04 | D | `?loja=lixo` / `?loja=` vazio | Fallback "todas"→1ª Loja; sem erro | invalid |
| NAV-05 | D | Rota inexistente `/nao-existe` | 404 tratado | error |
| NAV-06 | D | Histórico de Loja sem envios | "Nenhum Fechamento nesta Loja." | state |
| NAV-07 | D | Viewport 375×667: fechamento, estoque, usuários | Ações principais alcançáveis; sem overflow bloqueante | UI |
| NAV-08 | D | `context.setOffline` → enviar Fechamento | Erro tratado; Estoque inalterado | error/network |
| NAV-09 | D | Nova aba na mesma sessão | Funciona; estado consistente entre abas | navigation |

## BREAK — Break-it pass (→ QA-11)

| ID | Role | Ação | Esperado | Técnica |
|---|---|---|---|---|
| BREAK-01 | OC | Duplo clique em "Enviar fechamento" | 1 só Fechamento (ou Correção idempotente), sem duplicata | interaction |
| BREAK-02 | OC | 2 abas na mesma Loja: submit simultâneo | Lock por Loja: 1 Fechamento + 1 Correção (ou idempotente); Estoque coerente | interaction |
| BREAK-03 | OC | 2 abas: Lojas diferentes simultâneas | Ambas registram; sem interferência | interaction |
| BREAK-04 | OC | Refresh no meio do submit | Sem estado parcial visível; Estoque coerente | interaction |
| BREAK-05 | D | Back logo após submit → reenviar | Idempotente ou Correção com Justificativa; nunca duplicata silenciosa | interaction |
| BREAK-06 | OC | `linhas` com produtoId adulterado/inexistente | Ignorado ou erro tratado; Estoque só dos ativos | invalid |
| BREAK-07 | OC | Quantidade `1e15`, `NaN`, `Infinity` no payload | Rejeitado ("inválida"/"teto") | boundary |
| BREAK-08 | D | Justificativa com 10.000 chars | Aceito ou erro tratado — registrar | boundary |
| BREAK-09 | D | Nome com emoji/RTL/10k chars (Loja/Produto/Perfil) | Tratado; sem quebra de layout/security | boundary |
| BREAK-10 | OC | Sessão expira no meio do preenchimento → enviar | "Sessão expirada."; nada gravado | auth |
| BREAK-11 | OC | Forçar action de Fechamento com lojaId de Loja alheia | ForbiddenError; nada gravado | authz |
| BREAK-12 | D | Criar→desativar→criar mesmo nome rapidamente | Sem duplicatas; estado consistente | interaction |
| BREAK-13 | D | Sequência rápida de cliques em paginação + submit | Sem perda de dados digitados | interaction |
| BREAK-14 | D | Múltiplas abas criando usuário com mesmo e-mail | 1 criado; demais conflito | interaction |

## Fora do plano (registrado)

- Cross-Organização (uma org só no MVP) · pentest · scanners de segurança · performance/carga · a11y profundo · CI.
