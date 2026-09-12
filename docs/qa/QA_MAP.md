# QA Map — Discovery da aplicação

Data: 2026-09-12 · Ticket: QA-01 (#15) · Método: Playwright scriptado (`apps/web/.scratch/qa/discover.mjs`), login como Dono de seed, viewport 1366×850. Evidências: `docs/qa/evidence/discovery/*.png` + `*.aria.yml`.

Validado em navegador real — não só no código. Estado do ambiente: memory store + seed (3 Lojas, 9 Produtos ativos, Perfil "Operador", 1 Dono).

## Shell (todas as páginas autenticadas)

- Sidebar: logo "Doguinho do Coruja" (→ `/fechamento`), nav com 8 links (todos com `?loja=todas`), botão **Sair**.
- Header: combobox de Loja ("Todas as Lojas" + cada Loja) e identidade do actor ("Dono · Dono").
- `alert` region presente (feedback de ações).

## Mapa por área

```text
Autenticação
├ /entrar — form (E-mail, Senha, mostrar/ocultar senha, Entrar); erro via ?erro=1
├ Sair — botão no shell → /entrar
└ / — redirect (deslogado → /entrar; logado → /fechamento, via middleware)

Fechamento (/fechamento)
├ Tabela de Produtos ativos da Loja selecionada: Produto | Unidade | input "Quantidade restante"
├ Paginação 8/página — 9 produtos ⇒ 2 páginas (Molho de tomate fica na pág. 2) ⚠ ver obs. 1
├ Guardar rascunho (salva sem enviar)
└ Enviar fechamento (primeiro envio do dia; depois vira Correção c/ Justificativa)

Estoque (/estoque)
├ Busca "Buscar produto..."
├ "Adicionar produto" (→ ?novo=1)
├ Matriz Produto × Loja (quantidade por Loja; vazia antes do 1º Fechamento)
├ Ações por produto: Editar (→ /produtos) ⚠ obs. 4 | Desativar (botão)
└ Paginação com seletor 8/16/24 por página

Histórico (/historico)
└ Lista de envios da Loja (Fechamento/Correção, autor, Justificativa); vazio → "Nenhum Fechamento nesta Loja."

Produtos (/produtos)
├ Criar: Nome + Unidade (combobox: unidade/kg/g/L/mL/pacote) + Cadastrar
├ Lista inline editável: Nome (textbox), Unidade (combobox), status Ativo, Salvar, Desativar
└ Paginação 8/página

Perfis (/perfis)
├ Lista: nome, "N de 7" permissões ligadas, link Editar (→ ?editar=<id>) ⚠ obs. 6
└ Novo perfil (→ ?novo=1) — form via query param

Usuários (/usuarios)
├ Novo usuário: Nome, E-mail, Senha inicial, Perfil (combobox), Vínculo (checkbox de Lojas), Criar usuário
└ Lista de usuários (nome, e-mail, papel) ⚠ obs. 7

Configurações (/configuracoes)
├ Nova Loja: Nome + Criar Loja
└ Lista de Lojas

Dashboard (/dashboard)
├ KPIs: Entradas / Saídas / Líquido / Lojas ⚠ obs. 2
├ Gráfico 14 dias com recortes 7/14/30
└ Nota exibida: "Série ilustrativa. Pouco histórico de Fechamento." ⚠ obs. 2/3
```

## Observações de discovery (insumo para a matriz; não são bugs confirmados)

1. **Fechamento paginado 8+1**: com 9 Produtos ativos, o 9º fica na página 2. Verificar: o envio inclui todos os produtos ou só a página visível? O estado digitado sobrevive à troca de página? A UI deixa claro que há mais produtos? (→ QA-05)
2. **Dashboard fala "Entradas/Saídas/Líquido"** — vocabulário que o ADR-0001 evita (não há entrada/saída no domínio; há quantidade restante). A própria página admite "Série ilustrativa". Questão de produto/domínio → SUSPICIOUS para revisão humana, não bug funcional desta rodada.
3. **Dashboard não exibiu** "Lojas sem Fechamento hoje" nem lista de recentes no estado seed — verificar com dados em QA-09.
4. **Editar produto no /estoque** leva a `/produtos` genérico (não ao item específico) — ergonomia; anotar.
5. **`/` logado** redireciona a `/fechamento` pelo middleware (o `page.tsx` de `/` aponta a `/entrar`; middleware ganha). Comportamento consistente, documentado aqui.
6. **Edição de Perfil é deep-linkable** via `?editar=<id>` — exercitar com id inválido/alheio em QA-11.
7. **Lista de usuários** renderiza nome+e-mail+papel colados no snapshot acessível ("Dono dono@doguinho.localDono") — verificar separação visual/semântica no screenshot; possível nota de a11y.
8. **Sem upload, import/export, download, modal de confirmação destrutiva observado** nas páginas listadas (Desativar é botão direto). Se modais existirem (ex.: `?novo=1`), serão exercitados nos tickets de área.

## Cobertura de discovery

| Rota | HTTP | ARIA snapshot | Screenshot |
|---|---|---|---|
| /entrar | 200 | ✅ | ✅ |
| / (logado) | → /fechamento | ✅ | ✅ |
| /dashboard | 200 | ✅ | ✅ |
| /fechamento | 200 | ✅ | ✅ |
| /estoque | 200 | ✅ | ✅ |
| /historico | 200 | ✅ | ✅ |
| /produtos | 200 | ✅ | ✅ |
| /perfis | 200 | ✅ | ✅ |
| /usuarios | 200 | ✅ | ✅ |
| /configuracoes | 200 | ✅ | ✅ |

Nenhuma rota quebrou ao carregar. Nenhum console error observado durante o discovery (após saneamento do ambiente — ver BASELINE §riscos e o incidente de cache dev/prod registrado para o relatório).
