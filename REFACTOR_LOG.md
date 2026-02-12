# Refactor Log (Low-Risk Sequence)

## Objetivo
Refatorar incrementalmente o `lumine-webapp` com risco baixo, sem alterar regra de negocio/sync e validando cada lote com:
- `CI=true npm test -- --watch=false`
- `npm run build`

## Lotes executados

### L1 — Testes de `useSync`
- Criado: `src/hooks/useSync.test.js`
- Cobertura principal:
  - erro offline
  - conflito de revisao (server ahead e `REVISION_MISMATCH`)
  - download com atualizacao de estado local

### L2 — Testes de `useChildren` e `useRecords`
- Criados:
  - `src/hooks/useChildren.test.js`
  - `src/hooks/useRecords.test.js`
- Cobertura principal:
  - add offline/local
  - add online com retorno de `childId` e `dataRev`
  - fluxo de record existente (sync overwrite) vs novo record (append)

### L3 — Componente unico para erro de sync
- Criado: `src/components/ui/SyncErrorNotice.jsx`
- Integrado em `src/App.js` nos headers mobile e desktop.
- Beneficio: remove duplicacao de UI de erro critico/aviso.

### L4 — Componente unico para botao de sync
- Criado: `src/components/ui/SyncActionButton.jsx`
- Integrado em `src/App.js` nos headers mobile e desktop.
- Beneficio: remove duplicacao de botao + spinner + labels/tema por estado.

### L5 — Centralizacao de textos de UI restantes
- Atualizado: `src/constants/ui.js`
- Adicionado: `UI_TEXT` (`instituteLabel`, `lastSyncLabel`, `noSyncLabel`, `backAriaLabel`)
- `src/App.js` atualizado para usar constantes.

### L6 — Documentacao de refactor
- Este arquivo resume a sequencia e os ganhos.

## Testes adicionados no ciclo
- `src/components/ui/SyncErrorNotice.test.jsx`
- `src/components/ui/SyncActionButton.test.jsx`
- `src/hooks/useSync.test.js`
- `src/hooks/useChildren.test.js`
- `src/hooks/useRecords.test.js`

## Estado atual
- App continua funcional e compilando.
- Cobertura de regressao aumentada em hooks criticos e componentes de sync.
- Duplicacao visual reduzida no header (erro e acao de sync).
- Nenhuma mudanca de regra de negocio ou contrato da API.
