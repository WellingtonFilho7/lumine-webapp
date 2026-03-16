# Arquitetura — Lumine Webapp

## Visao geral

`lumine-webapp` e um aplicativo React (Create React App) para operacao diaria do Instituto Lumine.

Trilhas principais:

1. dashboard operacional
2. criancas (triagem, matricula, detalhe e status)
3. registros diarios
4. configuracoes administrativas
5. financeiro (papel `admin` ou `secretaria`)

O webapp e **server-first**:

- Supabase Auth controla a sessao do usuario interno
- a API do `lumine-api` e a fonte primaria de verdade
- `localStorage` existe apenas como cache auxiliar de leitura/estado, nao como origem canonica

## Stack tecnica

- React 18
- Create React App
- Tailwind utility classes
- Radix Dialog em pontos criticos
- Supabase JS no frontend apenas para autenticacao

## Estrutura principal

### `src/App.js`

Orquestra:

- sessao interna
- bootstrap inicial
- estado global de `children`, `dailyRecords`, `dataRev`, `lastSync`
- navegacao entre views
- wiring dos hooks principais

### `src/hooks/`

- `useAuthSession`: sessao Supabase Auth
- `useSync`: bootstrap/download e sync operacional
- `useChildren`: create/update/delete de criancas
- `useRecords`: upsert de registros diarios
- `useFinance`: verificacao de acesso e chamadas do modulo financeiro
- `useAdminUsers`: painel de aprovacao de usuarios
- `useLocalStorage`: cache local fino

### `src/views/`

- `dashboard/`: visao operacional
- `children/`: lista, cadastro, detalhe e tabela
- `records/`: registro diario mobile/desktop
- `finance/`: lancamentos e comprovantes
- `config/`: configuracoes gerais e admin

### `src/utils/`

Responsabilidades pequenas e puras:

- `apiHeaders`
- `childData`
- `records`
- `statusWorkflow`
- `finance`
- `syncErrors`
- `phone`
- `dashboardMetrics`

## Fluxo de autenticacao

1. O usuario faz login via Supabase Auth.
2. O frontend obtem `session.access_token`.
3. As chamadas para a API enviam esse token em `X-User-Jwt`.
4. A API valida o JWT e o perfil interno correspondente.

Nao existe mais dependencia operacional de `REACT_APP_API_TOKEN`.

## Fluxo de bootstrap e sync

### Bootstrap

Ao iniciar:

1. `useAuthSession` espera a sessao ficar pronta
2. `App.js` chama `useSync`
3. `useSync` usa `GET /api/bootstrap`
4. a UI operacional so libera depois de hidratar `children`, `records` e `dataRev`

Se o bootstrap falhar, a aplicacao mostra tela bloqueada explicita, nao estado vazio silencioso.

### Sync operacional

Operacao diaria atual:

- leitura por `bootstrap` / `GET /api/sync`
- gravacao por endpoints incrementais e acoes dedicadas
- overwrite global em `POST /api/sync` esta desabilitado na operacao normal

`dataRev` ainda existe como guarda de compatibilidade e protecao contra conflito em trilhas legadas.

## Modelo de dados no frontend

Estados centrais:

- `children`
- `dailyRecords`
- `selectedChild`
- `lastSync`
- `dataRev`
- `pendingChanges`
- `syncStatus`
- `bootState`

Normalizacao:

- `normalizeChild`, `normalizeChildren`, `normalizeRecords`
- parsers de `childData` para historico, documentos e participacao

## Layout e responsividade

Padrao atual:

- componentes mobile e desktop separados quando o fluxo muda materialmente
- mobile prioriza velocidade de operacao
- desktop prioriza densidade de informacao

Exemplos:

- `DashboardView` / `DashboardDesktop`
- `ChildDetailView` / `ChildDetailDesktop`
- `DailyRecordView` / `DailyRecordDesktop`

## Modulo financeiro

O modulo financeiro fica escondido se:

- a feature flag estiver desligada, ou
- o backend negar acesso ao usuario

Fluxo:

1. solicitar signed upload URL
2. subir comprovante direto para Storage
3. criar transacao
4. listar e abrir comprovante por URL assinada

RBAC esperado:

- `admin`
- `secretaria`

## Seguranca

- JWT interno em `X-User-Jwt`
- sessao obrigatoria quando `REQUIRE_LOGIN` esta ligada
- sem Bearer legado no frontend
- origem e CORS sao barreiras complementares do lado da API
- `localStorage` nao e fonte de verdade

## Variaveis de ambiente importantes

API:

- `REACT_APP_API_BASE_URL`
- `REACT_APP_BOOTSTRAP_URL` opcional
- `REACT_APP_SYNC_URL` opcional

Auth:

- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_PUBLISHABLE_KEY` ou `REACT_APP_SUPABASE_ANON_KEY`

Feature flags:

- `REACT_APP_FINANCE_MODULE_ENABLED`
- `REACT_APP_MOBILE_UI_V2`
- `REACT_APP_ONLINE_ONLY_MODE`
- `REACT_APP_REQUIRE_LOGIN`

## Testes

Testes principais rodam com `react-scripts test`.

Exemplos uteis:

```bash
npm test -- --watch=false --runInBand src/utils/apiHeaders.test.js src/hooks/useSync.test.js
```

```bash
npm test -- --watch=false --runInBand src/utils/finance.test.js src/views/config/ConfigViewAdminUsers.test.jsx
```

## Decisoes arquiteturais atuais

1. Supabase Auth faz autenticacao; a API continua sendo o backend de negocio.
2. A API e a fonte primaria; cache local nao decide o estado canonico.
3. Mobile e tratado como fluxo principal de operacao.
4. Financeiro e isolado por RBAC e feature flag.
