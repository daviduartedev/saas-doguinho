# ASVS Level 1 baseline (MVP)

Capítulos da skill `security-guidance` aplicáveis. Level 1 como mínimo. Level 2/3: anotar, não exigir no primeiro release salvo o texto dizer o contrário.

## Aplicar no MVP

| Capítulo | Por quê |
|----------|---------|
| V1.2 Injection Prevention | SQL, HTML, URLs |
| V2.1 Validation and Business Logic Documentation | Este diretório + research/PRD |
| V2.2 Input Validation | Quantidade, UUID, e-mail, Justificativa |
| V2.3 Business Logic Security | Fechamento → Correção, dia calendário, catálogo completo |
| V2.4 Anti-automation | Login (interno, mas stuffing existe) |
| V3.1 Web Frontend Security Documentation | Next.js no browser |
| V3.2 Unintended Content Interpretation | Content-Type, XSS |
| V3.3 Cookie Setup | Sessão |
| V3.4 Browser Security Mechanism Headers | CSP, HSTS (Vercel HTTPS) |
| V3.5 Browser Origin Separation | CSRF, CORS fechado |
| V4.1 Generic Web Service Security | Route handlers / server actions |
| V4.2 HTTP Message Structure Validation | JSON do Fechamento |
| V6.1 Authentication Documentation | Este arquivo + PRD §6 |
| V6.2 Password Security | Hash de senha |
| V6.3 General Authentication Security | Brute force, enumeração |
| V7.1 Session Management Documentation | Q24 adiado: documentar defaults na implementação |
| V7.2 Fundamental Session Management Security | Token de sessão |
| V7.4 Session Termination | Logout e disable |
| V8.1 Authorization Documentation | Matriz em `docs/research.md` §12 |
| V8.2 General Authorization Design | IDOR |
| V8.3 Operation Level Authorization | Server-side; permissão nova vale já |
| V8.4 Other Authorization Considerations | Isolamento Organização |
| V11.2 / V11.4 / V11.5 | Libs de crypto, hash, RNG de sessão |
| V12.2 HTTPS | Vercel público |
| V12.3 Service to Service | App → Neon |
| V13.3 Secret Management | DATABASE_URL, secret de sessão: env, nunca git |
| V13.4 Unintended Information Leakage | Erros genéricos |
| V14.1 / V14.2 Data Protection | Estoque e e-mail |
| V15.2 Security Architecture and Dependencies | Dependências Next |
| V15.4 Safe Concurrency | Rascunho único, corrida no Enviar |
| V16.1 / V16.2 / V16.3 | Authn/authz fail, Fechamento, disable |
| V16.5 Error Handling | Sem stack para o cliente |

## Não aplicar agora

| Capítulo | Motivo |
|----------|--------|
| V1.4 Unmanaged code | TypeScript gerenciado |
| V5.* File handling | Sem upload no MVP |
| V4.3 GraphQL / V4.4 WebSocket | Fora |
| V6.4 Recovery | Q24 adiado |
| V6.5–V6.8 MFA / OAuth / IdP | Fora |
| V9–V10 Tokens OAuth/JWT self-contained | Sessão de servidor preferível |
| V17 WebRTC | Fora |

## Defaults quando o ASVS permite escolha

Mais restritivo no L1: cookies `Secure`, `HttpOnly`, `SameSite=Lax` ou `Strict`; CORS allowlist vazia para origens estrangeiras; senha com hash dedicado a senha (não SHA genérico); autorização em todo handler que toca `store_id`.
