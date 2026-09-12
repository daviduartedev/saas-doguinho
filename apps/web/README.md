# apps/web

Next.js + TypeScript app for Doguinho do Coruja.

## Dev

```bash
cd apps/web
npm install
npm run dev
```

Open `/entrar`.

Demo (in-memory, not production auth):

- Dono: `dono@doguinho.local` / `coruja`
- Operador (Loja Centro): `operador@doguinho.local` / `coruja`

`DATABASE_URL` in `.env.example` is reserved for Neon PostgreSQL. This slice keeps domain state in memory.

## Scripts

- `npm run typecheck`
- `npm test`
- `npm run build`
