# Inventory integrity audit

ASVS: V2.3, V15.4, V16.3. Invariantes: `docs/research.md` §17.

## Fluxo

Rascunho (1 por Loja/dia) → Enviar → Fechamento imutável. Novo envio no mesmo dia → Correção com Justificativa. Estoque oficial = último envio. Rascunho não é Estoque.

## Manipulação de fluxo (V2.3)

Impedir:

- Pular Justificativa na Correção
- Fechar dia passado (MVP)
- Enviar subconjunto de Produtos ativos
- Marcar autor ou Loja no body
- Transformar Rascunho em Estoque sem Enviar

## Concorrência (V15.4)

Dois aparelhos, um Rascunho. Enviar idempotente: retries não geram dois “primeiros” Fechamentos. Unique (Loja, dia) para Rascunho aberto; regra explícita no segundo Enviar (Correção). Transação ao materializar Fechamento e atualizar Estoque.

## Integridade no banco

- FK Organização / Loja / Produto / Usuário
- NOT NULL em autor, Loja, tempo, quantidades enviadas
- CHECK quantidade >= 0 **(assumption)**
- Sem UPDATE destrutivo nas linhas de Fechamento enviado
- ON DELETE de Produto bloqueado se houver histórico; desativar por flag

## Audit log (V16.3)

Além do histórico de domínio: falha 403, login falho (sem vazar e-mail), disable de usuário, criação de Perfil. Sem senha, sem dump de Rascunho completo em log de debug.

## Verificação

- Dois POSTs de Enviar iguais → um Fechamento.
- Correção sem Justificativa → 400, Estoque inalterado.
- UPDATE HTTP em Fechamento antigo → recusado.
- Produto com história → delete 409; deactivate 200.
