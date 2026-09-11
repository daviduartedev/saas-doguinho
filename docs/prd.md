# Doguinho do Corujá – PRD

Derivado de `docs/research.md`. Requisitos marcados **(assumption)** são defaults de trabalho até refine. O restante é **CONFIRMED**.

## 1. Product Vision

Um sistema web simples para o Dono ver o Estoque das Lojas e para o Operador informar, no celular, a quantidade restante de cada Produto ativo no encerramento do dia.

## 2. Objective

Centralizar Estoque das Lojas da Organização Doguinho do Corujá, com histórico auditável, autorização por Loja, sem virar ERP.

## 3. Users

- **Dono:** papel de sistema, todas as Lojas.
- **Operador / usuário com Perfil:** atua só nas Lojas do Vínculo, segundo checklist do Perfil.

Não há cadastro público.

## 4. Scope

### MVP

- Organização única, N Lojas, catálogo único de Produtos.
- Dono, Perfis com checklist, Vínculo a Lojas.
- Fechamento de quantidade restante (catálogo ativo completo).
- Correção no mesmo dia calendário, com Justificativa.
- Rascunho único por Loja/dia, online, autosave.
- Histórico imutável.
- Dashboard do Dono (falta de Fechamento, Estoque atual, envios recentes) **(assumption)**.
- UI responsiva, prioridade mobile.

### Out of Scope

Venda, PDV, pedidos, clientes, fornecedores, pagamentos, NF, financeiro, compras, entrega, CRM, `não operou`, fila offline, signup público, tenant por Loja, multi-empresa, fechar dia passado, apagar Produto.

## 5. Functional Requirements

### FR-001

The system shall allow an authorized operator to view inventory belonging to their assigned store.

Acceptance criteria:

Given um usuário autenticado com Vínculo à Loja Centro  
When ele solicita o Estoque de Centro  
Then o sistema devolve a quantidade oficial de cada Produto (ou “nunca fechou”)  
And recusa Estoque de Loja fora do Vínculo com 403

### FR-002

The system shall prevent a user from reading or updating another store’s inventory by changing a store identifier.

Acceptance criteria:

Given um Operador vinculado só à Loja A  
When envia request autenticado para Estoque ou Fechamento da Loja B  
Then a resposta é 403  
And nenhum Estoque de B é alterado

### FR-003

The system shall record remaining quantity for every active Product in a store as that store’s official inventory when a Closing is submitted.

Acceptance criteria:

Given Produtos ativos P1…Pn e um Rascunho da Loja no dia  
When o Operador autorizado informa quantidade restante para todos e envia  
Then o Estoque de cada Pi na Loja passa a ser o valor enviado  
And o registro de Fechamento identifica Loja, data, hora e usuário

### FR-004

The system shall reject a Closing that omits any active Product **(assumption: empty field blocks the whole submit)**.

Acceptance criteria:

Given um Produto ativo sem quantidade no Rascunho  
When o usuário envia o Fechamento  
Then o envio é recusado  
And o Estoque anterior permanece

### FR-005

The system shall treat a second submit on the same calendar day as a Correction requiring justification.

Acceptance criteria:

Given um Fechamento já enviado hoje para a Loja  
When o mesmo ou outro autorizado envia de novo o catálogo ativo completo com Justificativa  
Then o Estoque passa a ser o novo conjunto  
And o Fechamento original permanece no histórico  
And Justificativa vazia é recusada

### FR-006

The system shall not allow Closing or Correction for a past calendar day in the MVP.

Acceptance criteria:

Given o dia calendário D (America/Sao_Paulo) **(assumption de fuso)**  
When um usuário tenta enviar Fechamento datado em D-1  
Then o sistema recusa

### FR-007

The system shall keep a single in-progress Draft per store per calendar day.

Acceptance criteria:

Given dois Operadores autorizados na mesma Loja no mesmo dia, ainda sem Fechamento enviado  
When ambos editam quantidades  
Then há um único Rascunho da Loja persistido no servidor  
And o primeiro Enviar bem-sucedido vira o Fechamento  
And um segundo Enviar segue FR-005

### FR-008

The system shall persist Draft quantities on the server while the operator is online, without treating Draft as official inventory.

Acceptance criteria:

Given um Rascunho com algumas quantidades salvas e Enviar ainda não ocorrido  
When o Dono consulta Estoque e dashboard  
Then o Estoque oficial não usa os números do Rascunho  
And a Loja aparece sem Fechamento do dia

### FR-009

The system shall deactivate a Product instead of deleting it when it has inventory history.

Acceptance criteria:

Given um Produto com Fechamento passado  
When o Dono desativa o Produto  
Then o Produto não entra no próximo Fechamento  
And o histórico antigo permanece  
And uma tentativa de exclusão permanente é recusada

### FR-010

The Owner shall create users with email and initial password; public self-registration shall not exist.

Acceptance criteria:

Given um visitante anônimo  
When acessa qualquer rota de auto-cadastro  
Then não há criação de conta  
Given um Dono autenticado  
When cria usuário com e-mail, senha inicial, Perfil e Vínculo  
Then esse usuário autentica com essas credenciais

### FR-011

The Owner shall create named Profiles with a permission checklist; store access shall be assigned on the user, not on the checklist.

Acceptance criteria:

Given um Dono  
When cria Perfil “Operador” marcando Fechamento e Histórico  
Then o Perfil não lista Lojas  
When associa Maria a esse Perfil e às Lojas Centro e Praia  
Then Maria fecha só Centro e Praia

### FR-012

The last Owner shall not be able to remove their own Owner access.

Acceptance criteria:

Given um único Dono na Organização  
When ele tenta remover o próprio papel de Dono  
Then a operação é recusada  
And ele permanece Dono

## 6. Authentication Requirements

- AUTH-001: Autenticação por e-mail e senha. Sem cadastro público. **CONFIRMED**
- AUTH-002: Dono semente. **CONFIRMED**
- AUTH-003: Dono cria usuários (e-mail + senha inicial). **CONFIRMED**
- AUTH-004: Sem verificação de e-mail no MVP. **CONFIRMED**
- AUTH-005: Desligar usuário invalida a sessão no próximo request. **CONFIRMED**
- AUTH-006: Hash de senha com algoritmo adequado a senha (ASVS V6.2). Implementação, não regra de negócio grillada.
- AUTH-007: Recuperação de senha, TTL e sessões simultâneas ficam **fora deste PRD** até refine (Q24).

## 7. Authorization Requirements

- AUTHZ-001: Toda operação avalia Usuário → Dono/Perfil → Organização → Vínculo → Recurso → Ação no servidor.
- AUTHZ-002: 403 em Loja fora do Vínculo (não Dono).
- AUTHZ-003: Dono alcança todas as Lojas sem Vínculo.
- AUTHZ-004: Criar/editar Perfil e criar Loja só Dono **(assumption)**.
- AUTHZ-005: Mudança de Perfil ou desligamento vale no próximo request (ASVS V8.3).

## 8. Store Requirements

- ST-001: Estoque independente por Loja.
- ST-002: MVP inicia com 3 Lojas; Loja nova na mesma Organização.
- ST-003: Operador não ganha outra Loja só porque o ID existe.
- ST-004: Desativar Loja = **não especificado**; fora do MVP até refine.

## 9. Product Requirements

- PR-001: Catálogo da Organização, comum às Lojas.
- PR-002: Campos MVP: nome e unidade de medida.
- PR-003: Unidades: unidade, kg, g, L, mL, pacote.
- PR-004: Unidade não é escolhida no Fechamento.
- PR-005: Produto ativo entra em todo Fechamento.
- PR-006: Desativar, não apagar.
- PR-007: Nome único na Organização **(assumption)**.

## 10. Inventory Requirements

- INV-001: Estoque oficial = última quantidade enviada por Produto × Loja.
- INV-002: Sem envio: não há Estoque oficial (não forçar 0) **(assumption)**.
- INV-003: 0 permitido; negativo recusado **(assumption)**.
- INV-004: kg/L até 3 casas; unidade/pacote inteiro; teto 99999 **(assumption)**.

## 11. End-of-Shift Requirements

- EOS-001: Um encerramento por Loja por dia calendário como primeiro Fechamento.
- EOS-002: Operador informa quantidade restante de todos os Produtos ativos.
- EOS-003: Online obrigatório.
- EOS-004: Autosave do Rascunho no servidor.
- EOS-005: Enviar idempotente.
- EOS-006: Correção = catálogo inteiro + Justificativa + mesmo dia.
- EOS-007: Primeiro envio sem Justificativa.
- EOS-008: UI usável no telefone para lista da ordem de dezenas de itens.

## 12. History Requirements

- HIS-001: Imutável após envio.
- HIS-002: Loja, data, hora, usuário.
- HIS-003: Por Produto: quantidade anterior e nova.
- HIS-004: Tipo Fechamento vs Correção; Justificativa só na Correção.
- HIS-005: Dono vê tudo; Operador vê Loja do Vínculo (ao menos o dia).
- HIS-006: Usuário desligado não apaga linhas antigas **(assumption)**.

## 13. Dashboard Requirements

**(assumption, Q26 A+B+C)**

- DASH-001: Por Loja, se houve Fechamento hoje.
- DASH-002: Visão de Estoque atual por Produto × Loja.
- DASH-003: Envios recentes (quem, quando, tipo).
- DASH-004: Sem KPI financeiro.

## 14. Responsive Requirements

- UX-001: Navegador web; mobile, tablet, desktop.
- UX-002: Fechamento otimizado para digitação numérica no telefone.
- UX-003: Teclado coerente com inteiro vs decimal conforme unidade **(assumption)**.

## 15. Security Requirements

### SEC-REQ-001

Authorization for store-scoped resources shall be enforced server-side. Changing a store id shall not grant access. ASVS V8.2.

### SEC-REQ-002

Every store-owned row shall carry store ownership; every organization-owned row shall carry organization ownership. ASVS V8.4.

### SEC-REQ-003

Passwords shall be stored with a password-specific hash. ASVS V6.2.

### SEC-REQ-004

Session shall be server-revocable when the user is disabled. ASVS V7.4.

### SEC-REQ-005

Closing payloads shall use a strict schema: remaining quantities only; actor and store from the authorized context. ASVS V2.2.

### SEC-REQ-006

User-supplied names and justifications shall be encoded on output. ASVS V1.2.

### SEC-REQ-007

Login shall not offer public registration. Authentication failures shall not confirm whether an email exists. ASVS V6.3.

### SEC-REQ-008

Database access shall use parameterized queries. ASVS V1.2.

Detalhamento: `security/`.

## 16. Business Invariants

O PRD incorpora INVARIANT-001 a INVARIANT-012 de `docs/research.md`. Implementação recusa estado que viole qualquer um deles.

## 17. Error States

| Situação | Comportamento |
|----------|----------------|
| 401 | Não autenticado / sessão inválida ou usuário desligado |
| 403 | Autenticado sem autorização no recurso |
| 400 | Schema, quantidade ilegal, Fechamento incompleto, Correção sem Justificativa, dia passado |
| Conflito de Rascunho/idempotência | Um Fechamento; retry não duplica |
| Offline | Operação de Fechamento indisponível (MVP) |
| Catálogo vazio | Não envia Fechamento; Dono precisa cadastrar Produto |
| Último Dono se removendo | Recusa |

## 18. Edge Cases

Ver `docs/research.md` §19. O MVP trata os CONFIRMED e os defaults ASSUMPTION. Loja desabilitada permanece UNKNOWN.

## 19. Non-functional Requirements

- Carga: 3 Lojas, dezenas de Produtos, poucos usuários, 1 Fechamento/Loja/dia.
- Hosting: Vercel. Dados: Neon PostgreSQL. App: Next.js/TypeScript.
- Sem Redis, filas, Kubernetes, microserviços.
- Histórico retido no MVP sem prazo de purge (UNKNOWN jurídico).

## 20. Data Ownership

```
Organização
  ├── Loja (store_id)
  │     ├── Estoque (Produto × Loja)
  │     ├── Rascunho
  │     ├── Fechamento / Correção
  │     └── Vínculo (lado Loja)
  ├── Produto
  ├── Usuário
  └── Perfil
```

Dono: alcance a toda a Organização. Demais: Perfil + Vínculo.

## 21. Acceptance Criteria

Além dos Given/When/Then em FR-*:

- Operador A não lê Loja B (FR-002).
- Fechamento completo atualiza Estoque (FR-003).
- Correção não apaga o Fechamento anterior (FR-005).
- Produto desativado some do próximo Fechamento e permanece no histórico (FR-009).
- Sem rota de signup público (FR-010).
- Dashboard do Dono mostra Loja sem Fechamento do dia (DASH-001).

## 22. Definition of Done

- FRs do MVP testáveis automatizados nos caminhos de autorização, Fechamento, Correção e desativação de Produto.
- Invariantes 002–006, 008–012 cobertos por teste.
- Itens **(assumption)** implementados como default, fáceis de mudar no refine.
- Controles SEC-REQ-* verificados conforme `security/`.
- UI de Fechamento usável em viewport mobile.
- Sem tickets neste documento; spec/tickets são etapa posterior.
- Sem código de aplicação neste repositório de pesquisa.

Não gera tickets neste PRD.
