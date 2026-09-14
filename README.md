# Doguinho do Coruja

Sistema web de controle de estoque para as lojas do Doguinho do Coruja.

Acesso via navegador, pensado para uso no celular pelos operadores e visão centralizada pelo Dono.

App: `apps/web`. Direção visual: `.interface-design/system.md`.

## Rodar local

```bash
cd apps/web
npm install
npm test
npm run dev
```

Conta semente do Dono: `dono@doguinho.local` / `coruja`. Um Operador por Loja (mesma senha): `operador.centro@doguinho.local`, `operador.juliana@doguinho.local`, `operador.magalhaes@doguinho.local`.

Sem `DATABASE_URL`, o app usa persistência em memória (reinicia com o processo). Em produção na Vercel, defina `DATABASE_URL` (Postgres/Neon).

Sessão: cookie opaco, 12 horas, `HttpOnly` + `SameSite=Lax` (`Secure` em produção).

