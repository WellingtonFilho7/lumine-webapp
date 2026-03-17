# Lumine Webapp

Frontend do projeto Lumine.

## Ambiente local

Antes de rodar o app localmente, copie `.env.example` para `.env.local` e preencha pelo menos:

- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_PUBLISHABLE_KEY`

Se essas variáveis estiverem vazias, a tela de login mostra `Autenticacao indisponivel neste ambiente`.

Exemplo:

```bash
cp .env.example .env.local
```

Depois edite `.env.local` com as credenciais públicas do projeto Supabase.

## Scripts

- `npm run start` inicia o servidor Vite
- `npm run build` gera o bundle de producao
- `npm test` roda a suite com Vitest
