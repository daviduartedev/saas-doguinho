# Input validation audit

ASVS: V1.2, V2.1, V2.2, V3.2.

## Entradas do MVP

| Campo | Origem | Esperado | Recusar |
|-------|--------|----------|---------|
| E-mail | Dono cria usuário / login | E-mail normalizado | Lixo, vazio |
| Senha | Login / criação | Segredo | Vazio; não ecoar |
| Nome de Produto | Dono | Texto curto | Vazio; encoding na saída |
| Unidade | Dono | Enum fechado | String livre |
| Quantidade restante | Operador | Número ≥ 0; inteiro ou até 3 casas conforme unidade **(A)** | Negativo, NaN, overflow |
| Justificativa | Correção | Texto obrigatório | Vazio na Correção |
| store_id / ids | URL/body | UUID/id da sessão autorizada | Id de outra Loja/Organização |
| Perfil checkboxes | Dono | Conjunto fixo de permissões | Permissão desconhecida |

## Regras (V2.2)

Validar no servidor depois de parse JSON. Allowlist de unidades. Não confiar em `min`/`max` só no input HTML. Mass assignment: whitelist de campos.

## Injeção e encoding (V1.2, V3.2)

Queries parametrizadas. Nomes e Justificativa saem encoded no HTML/React (texto, não `dangerouslySetInnerHTML`). Content-Type correto. Sem HTML rico no MVP (V1.3 N/A).

## Verificação

- Unidade `"saco"` → 400
- Quantidade `-1` → 400
- Justificativa `" "` na Correção → 400
- Nome com markup aparece literal no dashboard
- Campo `authorId` no body do Fechamento não altera o autor
