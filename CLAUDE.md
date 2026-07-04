# Lumine Webapp

Frontend React (Vite) para operacao diaria do Instituto Lumine. Arquitetura completa em `ARQUITETURA.md` — leia antes de mexer em sync, auth ou dados.

## Regras que evitam erros recorrentes

- **Server-first.** A API do `lumine-api` e a fonte de verdade; `localStorage` e apenas cache de leitura. Nunca promova cache local a estado canonico.
- **O contrato da API mora no repo irmao `lumine-api`** (mesmo owner no GitHub, deploy em Vercel). Antes de alterar codigo de sync/auth/API, adicione `lumine-api` a sessao e leia os handlers reais — nao deduza o formato das respostas.
- **Env vars usam prefixo `REACT_APP_`, nao `VITE_`** — compatibilidade mantida via `define` em `vite.config.js`. Toda variavel nova PRECISA ser adicionada ao array `REACT_APP_KEYS` em `vite.config.js` ou chegara vazia no bundle. Nao "corrija" o prefixo para `VITE_`.
- **Tema atual: "Government Dashboard Palette"** definida em `src/index.css` (`:root`, navy `#003D7A`). Ignore qualquer paleta descrita em documentos antigos ou no historico do git — houve 4 direcoes de tema; somente a do `src/index.css` vale.
- **Auth:** Supabase Auth no frontend somente para sessao; toda chamada a API envia o JWT em `X-User-Jwt`. Nao existe Bearer legado.
- **RBAC:** papeis `admin` e `secretaria`; modulo financeiro escondido por feature flag + negacao do backend.
- **Valores canonicos de enums em ASCII puro** (sem acentos); acentos somente em labels de UI.
- Componentes mobile e desktop sao separados quando o fluxo muda (`DailyRecordView` / `DailyRecordDesktop` etc.). Mobile e o fluxo principal de operacao.

## Comandos

```bash
npm run start   # dev server Vite
npm run build   # bundle de producao (sai em build/)
npm test        # vitest run (suite completa)
npm test -- src/utils/records.test.js   # arquivos especificos
```

## Verificacao antes de commit/push

- Rode `npm test` e `npm run build` — nao existe rede de seguranca alem do CI em `.github/workflows/ci.yml`.
- Mudou UI? Use a skill `preview-check` (screenshot mobile 390x844 + desktop) antes de commitar — nunca descubra quebra de layout via deploy.
- Depois de push, use a skill `deploy-status` (Vercel MCP) para confirmar o deploy — nunca commite badges, versoes ou console.logs para verificar deploy.

## Ciclo de vida de planos

Planos de implementacao vao em `docs/plans/` e sao **removidos no mesmo PR que entrega o trabalho**. Nao deixe planos concluidos no repo; nao re-declare a stack dentro de planos (ela vive aqui); use apenas caminhos relativos ao repo.
