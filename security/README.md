# Security audits — Doguinho do Corujá

Auditoria de produto na fase de pesquisa. Base: [OWASP Secure Agent Playbook](https://github.com/owasp/secure-agent-playbook) skill `security-guidance` (OWASP ASVS). Baseline: **ASVS Level 1**.

Este diretório documenta ameaça, controle e verificação. Não descreve exploit, payload ou procedimento de ataque.

## Índice

| Doc | Uso |
|-----|-----|
| [01-threat-model.md](./01-threat-model.md) | Ameaças do domínio (estoque, Loja, Perfil) |
| [02-asvs-baseline.md](./02-asvs-baseline.md) | Capítulos ASVS aplicáveis ao MVP |
| [03-authorization-audit.md](./03-authorization-audit.md) | IDOR/BOLA, Vínculo, Dono |
| [04-authentication-session-audit.md](./04-authentication-session-audit.md) | Login interno, sessão, desligar usuário |
| [05-inventory-integrity-audit.md](./05-inventory-integrity-audit.md) | Fechamento, Correção, concorrência |
| [06-input-validation-audit.md](./06-input-validation-audit.md) | Quantidade, Justificativa, schema |

## Escopo

Inclui: autenticação senha, sessão, autorização por Organização/Loja, validação de Fechamento, histórico, headers/cookies no frontend Next.js.

Fora: upload de arquivo, GraphQL, WebSocket, OAuth/OIDC, MFA (não grillados), recuperação de senha (Q24 adiado).

## Lacuna do playbook instalado

A skill `security-guidance` traz o índice ASVS em `SKILL.md`. Os arquivos `data/asvs/V*.md` **não vieram** no pacote local. Requisitos abaixo citam o **capítulo** do índice (ex. V8.2), não o número de verificação interno do PDF. Na implementação, reler o ASVS oficial e a skill completa antes de gerar código.

## Relação com o produto

- Pesquisa: `docs/research.md` §18
- PRD: `docs/prd.md` §15 (SEC-REQ-*)
- Glossário: `CONTEXT.md`
