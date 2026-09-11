# Doguinho do Corujá

Controle de estoque das lojas, com um Fechamento diário da quantidade restante de cada Produto.

## Language

**Produto**:
Item cadastrado, comum às Lojas, com nome e Unidade de medida.
_Avoid_: item controlado, SKU, subconjunto de conferência, produto só de catálogo, cadastro separado por Loja, categoria no MVP

**Produto ativo**:
Produto que entra no Fechamento. Desativar tira do próximo Fechamento e preserva o histórico.
_Avoid_: exclusão, apagar produto, delete

**Dono**:
Papel de sistema da Organização. Alcance a todas as Lojas. Não é rebaixado por checklist e não remove o próprio acesso se for o último Dono.
_Avoid_: admin genérico, tenant admin, gestor como sinônimo frouxo

**Operador**:
Usuário com vínculo a uma ou mais Lojas. Fecha e corrige só nessas Lojas.
_Avoid_: funcionário, equipe do dono

**Vínculo**:
Relação entre um usuário (que não é Dono) e as Lojas que ele pode operar. O Dono não precisa de Vínculo: alcança todas as Lojas.
_Avoid_: tenant membership, loja marcada no checklist do Perfil

**Justificativa**:
Texto obrigatório na Correção. Não existe no primeiro Fechamento do dia.
_Avoid_: motivo opcional, edição silenciosa

**Perfil**:
Conjunto nomeado de permissões que o Dono cria com checklist. Não substitui o Dono. Lojas não entram no checklist: Loja vive no vínculo do usuário.
_Avoid_: tenant role, papel que escolhe Loja no checkbox, equipe do dono como papel de sistema

**Organização**:
O negócio que é dono das Lojas e do cadastro de Produtos. Doguinho do Corujá é uma Organização. Loja nova entra na mesma Organização.
_Avoid_: tenant na interface, conta por Loja, tenant por Loja

**Unidade de medida**:
Como a quantidade restante de um Produto é expressa. Vive no Produto, lista fechada: unidade, kg, g, L, mL, pacote.
_Avoid_: unidade (quando a intenção for Loja), unidade digitada livre, unidade escolhida na hora do Fechamento

**Rascunho**:
Fechamento do dia ainda não enviado, um por Loja. Quem envia primeiro transforma o Rascunho em Fechamento.
_Avoid_: dois fechamentos iniciais em paralelo, edição silenciosa do já enviado

**Fechamento**:
Declaração enviada, no encerramento, da quantidade restante de cada Produto ativo em uma Loja. O último enviado vira o Estoque.
_Avoid_: movimento, baixa, conferência parcial, inventário rotativo, snapshot paralelo

**Correção**:
Novo lançamento de quantidade restante depois de um Fechamento já enviado, com justificativa obrigatória. O Fechamento original permanece. O novo número vira o Estoque.
_Avoid_: edição do Fechamento, exclusão de histórico, ajuste que apaga o 18

**Quantidade restante**:
Contagem física informada no Fechamento. Substitui o Estoque oficial daquele Produto naquela Loja.
_Avoid_: consumo, saída, quantidade usada, entrada

**Estoque**:
Quantidade oficial de um Produto em uma Loja. É a quantidade restante do último Fechamento enviado.
_Avoid_: saldo calculado por entradas e saídas, estoque teórico

**Loja**:
Unidade de negócio com Estoque próprio.
_Avoid_: tenant, unidade (confunde com unidade de medida), filial (até o negócio usar essa palavra)
