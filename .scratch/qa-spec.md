# Spec — QA robusto pré-QA-manual (Doguinho do Coruja)

## Problem Statement

O MVP está implementado — Fechamento diário por Loja, Correção com Justificativa, Estoque como quantidade restante, Produtos, Perfis com checklist, Usuários com Vínculo, Dashboard — mas nunca passou por uma verificação sistemática. Há sinais concretos de risco já no baseline: o build de produção (`npm run build`, webpack) **falha na `main`**, não existe CI, e nenhum fluxo foi exercitado de ponta a ponta em navegador. Antes de um humano gastar tempo em QA manual, precisamos saber **o que está quebrado, onde, e com que evidência** — e garantir que os bugs encontrados não voltem.

## Solution

Uma rodada de QA executada por agente, agressiva e reproduzível, sobre ambiente local resetável (dev server + memory store + seed; reset = reiniciar o processo). A rodada mapeia a aplicação real em navegador, constrói uma matriz de testes por fluxo, executa happy paths e caminhos hostis (break-it pass), reporta bugs com evidência, corrige com teste de regressão obrigatório, e deixa uma suíte E2E permanente. Segurança participa **só como documentação de contexto** (`docs/audit/SECURITY_CONTEXT.md`) — auditoria profunda fica para fase futura explicitamente registrada.

## User Stories

### Autenticação e sessão
1. Como Dono, quero entrar com e-mail e senha, para acessar o sistema.
2. Como usuário, quero ver mensagem genérica ao errar login, para não descobrir se o e-mail existe.
3. Como usuário, quero ser bloqueado após 5 tentativas erradas em 15 min, para resistir a força bruta.
4. Como usuário logado, quero sair, para encerrar minha sessão.
5. Como usuário com sessão expirada/inválida, quero ser redirecionado ao login ao acessar qualquer página, para não ver estado quebrado.
6. Como usuário logado, quero ser levado a `/fechamento` ao abrir `/entrar`, para não ver login desnecessário.
7. Como visitante anônimo, quero ser redirecionado a `/entrar` de qualquer URL interna, para não acessar nada sem sessão.

### Fechamento (fluxo crítico de negócio)
8. Como Operador, quero ver o Rascunho do dia com todos os Produtos ativos da minha Loja, para informar a quantidade restante de cada um.
9. Como Operador, quero salvar o Rascunho sem enviar, para continuar depois.
10. Como Operador, quero enviar o Fechamento do dia, para declarar o Estoque oficial da Loja.
11. Como Operador, quero ser impedido de enviar sem informar todos os Produtos ativos, para não fechar pela metade.
12. Como Operador, quero que quantidades respeitem a Unidade de medida (inteiro para unidade/pacote, até 3 casas para kg/g/L/mL), teto de 99.999 e zero como mínimo, para dados íntegros.
13. Como Operador, quero corrigir um Fechamento já enviado com Justificativa obrigatória, para manter auditoria.
14. Como Operador, quero que reenviar as mesmas quantidades não crie Correção duplicada, para não poluir o histórico.
15. Como Dono, quero que o último envio do dia vire o Estoque, para ter sempre o número oficial mais recente.
16. Como Operador, quero que dois envios simultâneos na mesma Loja não corrompam o Estoque, para confiar no número.

### Estoque, Histórico, Dashboard
17. Como usuário com `read_estoque`, quero ver o Estoque por Loja com status do dia, para acompanhar a operação.
18. Como usuário com `read_history`, quero ver o histórico de Fechamentos e Correções com autor e Justificativa, para auditar.
19. Como usuário com `dashboard`, quero ver KPIs e Lojas sem Fechamento hoje, para cobrar a operação.
20. Como Operador sem Vínculo numa Loja, quero não vê-la em dashboard/estoque/histórico/fechamento, para que o boundary de Loja seja respeitado.

### Administração (Dono / manage_*)
21. Como Dono, quero criar Loja em Configurações, para expandir a operação.
22. Como usuário com `manage_produto`, quero criar/editar/desativar Produto, para manter o catálogo.
23. Como usuário com `manage_produto`, quero ser impedido de excluir Produto com histórico, para preservar auditoria (ADR-0003).
24. Como Dono, quero criar/editar Perfil com checklist de permissões, para moldar acesso sem mexer em Vínculo.
25. Como Dono, quero ser impedido de excluir Perfil em uso, para não deixar usuários órfãos.
26. Como usuário com `manage_users`, quero criar usuário com Perfil e Vínculo, para dar acesso à equipe.
27. Como usuário com `manage_users`, quero desligar usuário (revogando sessões), para cortar acesso imediatamente.
28. Como Dono, quero ser impedido de desligar/rebaixar o último Dono, para não trancar a Organização.
29. Como usuário com `manage_users`, quero alterar Vínculo e Perfil de usuário, para ajustar acesso sem recriar conta.

### Navegação e robustez
30. Como usuário, quero que refresh, voltar/avançar e URL direta funcionem ou falhem de forma segura, para não quebrar o fluxo.
31. Como usuário impaciente, quero que duplo clique/duplo submit não duplique Fechamento, para dados consistentes.
32. Como usuário, quero mensagens de erro claras em falhas de validação, para corrigir sem adivinhar.
33. Como usuário mobile, quero que as telas principais funcionem em viewport estreito, para operar do celular.

## Implementation Decisions

- **Costuras (seams) de teste — reutilizar as duas existentes, nenhuma nova:**
  1. **Navegador/HTTP (E2E)** via Playwright contra o app rodando — costura mais alta; cobre auth, navegação, autorização visível, fluxos críticos. Ferramenta principal de execução e evidência.
  2. **Interface `DoguinhoApp`** (vitest + `test-harness.ts`) — regressão de lógica de domínio (Fechamento, Correção, autorização interna). Prior art: `application.test.ts` (22 testes).
- **Ambiente**: `npm run dev` local, memory store + seed (sem `DATABASE_URL`); reset = reiniciar processo. QA nunca aponta para produção.
- **Identidades**: conforme `docs/qa/TEST_IDENTITIES.md` — Dono de seed + usuários criados via UI durante o próprio QA (criar usuário é fluxo testado). Boundary de tenant = Loja (Vínculo); cross-Organização não exercitável no MVP (documentado).
- **Build pré-existente quebrado**: `npm run build` (webpack) falha na main (Mantine 9.6.1 × react do build); `next build --turbopack` passa. Entra no relatório como bug candidato High; QA roda em dev/turbopack até lá.
- **Evidência por bug**: ID `QA-NNN`, severidade, passos, esperado × atual, reprodutibilidade, screenshot/trace/console/network quando aplicável.
- **Severidade**: Critical = perda/corrupção de dados, bypass de autorização, sistema inutilizável; High = fluxo crítico quebrado ou build/release bloqueado; Medium = fluxo secundário quebrado ou UX enganosa; Low = cosmético/ergonomia.
- **Verificação de bug**: observar → reproduzir → reproduzir de novo → coletar evidência → classificar. Só então confirmar.
- **Correção**: todo bug automatizável ganha teste de regressão que falha antes do fix e passa depois (red → green).
- **E2E permanente** em `tests/e2e/`: `auth.spec.ts`, `permissions.spec.ts`, `tenant-isolation.spec.ts`, `critical-flows.spec.ts`, `regression/qa-*.spec.ts` — locators estáveis (role/label/testid), isolamento por context, sem waits fixos (Playwright best practices).
- **QA Gate**: 0 Critical e 0 High abertos; fluxos críticos verdes; suíte de regressão verde; build passando; Medium/Low restantes documentados.

## Testing Decisions

- **Bom teste** = comportamento externo observável (HTTP/UI/contrato da `DoguinhoApp`), nunca detalhe de implementação (nada de espiar store interno ou estrutura de componente).
- **Módulos testados**: camada `doguinho` (unit, via harness existente) para regras de Fechamento/Correção/autorização; app inteiro (E2E) para fluxos de usuário.
- **Prior art**: `src/doguinho/application.test.ts` + `test-harness.ts` (unit); não há E2E prévio — a suíte criada aqui vira o prior art.
- **Técnicas**: happy path, inputs inválidos, fronteiras (0/negativo/99.999/100.000/decimais por unidade/texto longo/unicode), estados (vazio/rascunho/enviado/erro), navegação (refresh/back/URL direta), interação (duplo clique/duplo submit), persistência (create→refresh), auth (logout/expirada/inválida), autorização (role errada/URL direta/ação escondida), boundary de Loja (Vínculo), erros de rede quando simulável.
- **Ferramentas**: Playwright (determinístico, evidência, regressão) como principal; Browser Use QA como exploração complementar; vitest para regressão de domínio.

## Out of Scope

- Auditoria de segurança profunda e suas ferramentas: CodeQL, Semgrep, insecure-defaults, supply-chain-risk-auditor, fp-check, variant-analysis, fix-review (registradas em `docs/audit/SECURITY_FUTURE_SCOPE.md`).
- Pentest/exploração ofensiva (a break-it pass é QA funcional hostil, não ataque).
- Multi-Organização real (modelo tem `organization_id`, mas o seed tem uma org; ADR-0002).
- Performance/carga, acessibilidade profunda, i18n, criação de CI.
- Correção de débitos fora dos bugs encontrados (ex.: melhorias de arquitetura viram ideias para `/improve-codebase-architecture`, não desta rodada).

## Further Notes

- Rate limit de login (5/15min por e-mail, em processo) pode bloquear cenários de auth — reiniciar o dev server reseta; os testes E2E de auth devem conviver com isso (contas distintas por cenário ou reset entre specs).
- `docs/qa/BASELINE.md` distingue falhas pré-existentes de regressões desta rodada.
- Glossário em `CONTEXT.md`; ADRs 0001–0004 respeitados (Estoque = quantidade restante; Produto desativa, não apaga; Perfil via checklist, Loja via Vínculo; tenant = Organização).
