# Threat model (pesquisa)

Modelo interno, uma Organização, Lojas com Estoque sensível operacionalmente (não é dado financeiro, mas revela operação). Atores hostis: Operador curioso, conta comprometida, visitante anônimo, Perfil superprivilegiado.

## Ativos

- Estoque atual por Loja
- Histórico de Fechamento/Correção (quem, quando, números)
- Credenciais
- Catálogo e Perfis (capacidade de alterar regras)

## Ameaças

Mapeamento para `docs/research.md` SEC-001…SEC-010.

| ID | Ativo | Ameaça | Controle |
|----|--------|--------|----------|
| T-01 | Estoque Loja B | Operador da Loja A acessa B | AUTHZ server-side, Vínculo |
| T-02 | Papel Dono | Perfil se auto-concede admin | Criar Perfil só Dono |
| T-03 | Conta | Signup público / stuffing | Sem registro aberto; rate limit login |
| T-04 | Sessão | Usuário desligado segue logado | Revogação no disable |
| T-05 | Histórico | Autor/Loja forjados no body | Schema; identidade da sessão |
| T-06 | Estoque | Quantidade ilegal | Validação + CHECK |
| T-07 | Fechamento | Replay / duplo envio | Idempotência; Rascunho único |
| T-08 | Dashboard | XSS em nome/Justificativa | Encoding de saída |
| T-09 | Banco | Injeção em query | SQL parametrizado |
| T-10 | Sessão cookie | CSRF | SameSite / origem |

## Trust boundaries

1. Navegador (não confiável) → App Next.js (server).
2. App → Neon PostgreSQL (TLS, credencial de servidor).
3. Usuário autenticado ≠ autorizado no recurso.

## Dados

Classificação preliminar (ASVS V14.1): e-mail e senha (segredo); quantidade restante e histórico (operacional, restrito à Organização); Justificativa (texto do usuário). Sem cartão, sem CPF no MVP.

## Não coberto até refine

Recuperação de senha, TTL de sessão, segundo Dono, MFA, retenção/LGPD formal.
