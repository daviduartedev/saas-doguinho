# Authorization audit

ASVS: V8.1, V8.2, V8.3, V8.4.

## Decisão documentada (V8.1)

Fatores: identidade autenticada, papel Dono **ou** Perfil, Organização da sessão, Vínculo de Lojas, ação no recurso.

Matriz: `docs/research.md` §12. Loja **não** é checkbox do Perfil.

## Falha a impedir (V8.2)

Operador da Loja A obtém leitura ou escrita da Loja B só com um id diferente (URL, query, JSON). Controle: o servidor resolve a Loja, verifica Dono **ou** (Vínculo **e** permissão), senão **403**. UI escondida não conta.

O mesmo para Produto, Fechamento, histórico, usuário: o id tem de pertencer à Organização da sessão.

## Onde autorizar (V8.3)

Camada de servidor (Route Handler, Server Action, query). Não só middleware de página. Alterar Perfil ou desligar usuário vale no **próximo** request. A sessão não cacheia um “é Dono” eterno no cliente.

## Organização (V8.4)

`organization_id` em registro da Organização. `store_id` em Estoque, Rascunho, Fechamento, Vínculo. Não há UI de tenant. Uma sessão = uma Organização neste MVP.

## Verificação

- Teste: usuário Loja A × recurso Loja B → 403, zero row afetada.
- Teste: Dono × qualquer Loja da Organização → 200 nas ações de Dono.
- Teste: Perfil sem “criar Perfil” × POST de Perfil → 403 **(assumption Q25)**.
- Teste: último Dono não consegue autoexclusão.

## Residual

Checklist de Perfil no MVP aumenta a superfície. Cada checkbox novo precisa de teste de 403 no negativo. Não colocar “criar Perfil” no checklist sem novo grill.
