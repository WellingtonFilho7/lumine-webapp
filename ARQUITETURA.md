# Arquitetura — Sistema Lumine

## 1. VISÃO GERAL
O Sistema Lumine é um webapp offline‑first para triagem, matrícula e acompanhamento diário de crianças. Os dados ficam no `localStorage` durante o uso em campo e são sincronizados com uma API simples hospedada no Vercel, que persiste em Google Sheets. O foco é operação leve, uso em celular e consistência de dados com múltiplos operadores.

**Stack tecnológico**
- Webapp: React 18 (Create React App), Tailwind CSS via CDN, lucide-react.
- API: Node.js (Vercel Serverless), `googleapis`.
- Persistência: Google Sheets (abas `Criancas`, `Registros`, `Config`, `Audit`) + planilha secundária de backup.
- Hospedagem: Vercel (webapp + API).

**Diagrama ASCII (fluxo de dados)**
```
[Operador]
   │
   ▼
[Webapp React] ──(GET/POST /api/sync)──▶ [API Vercel sync.js] ──▶ [Google Sheets]
   │                         ▲                                 ▲
   └── localStorage (offline)└──────────── backup (Sheets secundário) ────────┘
```

## 2. ESTRUTURA DO GOOGLE SHEETS

### Abas e funções
- **Criancas**: cadastro completo (triagem + matrícula + histórico).
- **Registros**: registros diários de presença e acompanhamento.
- **Config**: parâmetros operacionais (ex.: `NEXT_CHILD_ID`, `DATA_REV`).
- **Audit**: log de operações (sync/addChild/addRecord) com contagens e dataRev.
- **Backup (planilha secundária)**: espelho das abas `Criancas` e `Registros` em outro arquivo.

### Criancas — Colunas (tipo, obrigatório)
> Obrigatório depende do estágio: **Triagem** ou **Matrícula**.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | string | sim | ID interno (timestamp). |
| childId | string | sim | ID público (CRI‑0001…). |
| name | string | sim (triagem) | Nome completo. |
| birthDate | date | sim (triagem) | Data de nascimento. |
| guardianName | string | sim (triagem) | Responsável principal. |
| guardianPhone | string | sim (triagem) | WhatsApp. |
| guardianPhoneAlt | string | não | Telefone alternativo. |
| school | string | sim (triagem) | Escola. |
| schoolShift | select | sim (triagem) | manhã/tarde/integral. |
| grade | string | não | Série. |
| neighborhood | string | sim (triagem) | Bairro/Comunidade. |
| referralSource | select | sim (triagem) | igreja/escola/CRAS/indicação/redes_sociais/outro. |
| schoolCommuteAlone | select | sim (triagem) | sim/nao. |
| healthCareNeeded | select | não | sim/nao. |
| healthNotes | string | não | Descrição curta se `healthCareNeeded=sim`. |
| dietaryRestriction | select | não | sim/nao. |
| specialNeeds | string | não | Necessidades específicas. |
| triageNotes | string | não | Observações de triagem. |
| priority | select | não | alta/média/baixa. |
| priorityReason | string | não | Nota interna. |
| enrollmentStatus | select | sim | status do funil. |
| enrollmentDate | datetime | sim | Data de criação da triagem. |
| triageDate | datetime | não | Data de registro da triagem. |
| startDate | date | sim (matrícula) | Início na rotina. |
| participationDays | list | sim (matrícula) | `seg|ter|...` |
| authorizedPickup | string | sim (matrícula) | Quem busca. |
| canLeaveAlone | select | sim (matrícula) | sim/nao. |
| leaveAloneConsent | boolean | condicional | Obrigatório se `canLeaveAlone=sim`. |
| leaveAloneConfirmation | string | condicional | Obrigatório se `canLeaveAlone=sim`. |
| responsibilityTerm | boolean | sim (matrícula) | Termo único aceito. |
| consentTerm | boolean | sim (matrícula) | Termo único aceito. |
| imageConsent | select | não | interno/comunicacao/'' (nenhum). |
| documentsReceived | list | não | `certidão_nascimento|documento_responsável|comprovante_residência`. |
| initialObservations | string | não | Observações pedagógicas. |
| classGroup | select | não | pré_alfabetização/alfabetização/fundamental_1/fundamental_2. |
| matriculationDate | datetime | não | Data da matrícula. |
| enrollmentHistory | json | sim | Array JSON de eventos. |
| entryDate | date | não | Legado (migração). |
| createdAt | datetime | sim | Criação do registro. |

### Registros — Colunas (tipo, obrigatório)
| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | string | sim | ID interno do registro. |
| childId | string | sim | **ID interno da criança (`Criancas.id`)**. |
| date | date | sim | Data do registro. |
| attendance | select | sim | present/late/absent. |
| participation | select | não | high/medium/low. |
| mood | select | não | happy/neutral/sad. |
| interaction | select | não | high/medium/low. |
| activity | string | não | Texto livre. |
| performance | select | não | high/medium/low. |
| notes | string | não | Observações. |
| familyContact | select | não | yes/no. |
| contactReason | select | não | routine/praise/behavior/absence/other. |
| childName | fórmula | não | Coluna derivada via `PROCV` para identificar a criança. |
| childPublicId | fórmula | não | Coluna derivada (CRI‑XXXX) via `PROCV`. |

### Config — Colunas (tipo, obrigatório)
| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Campo | string | sim | Ex.: NEXT_CHILD_ID, DATA_REV |
| Valor | string/number | sim | Próximo número para CRI‑XXXX e revisão do servidor |

### Audit — Colunas (tipo, obrigatório)
| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| timestamp | datetime | sim | Data/hora da ação |
| action | string | sim | sync/addChild/addRecord |
| dataRev | number | sim | revisão após a operação |
| childrenCount | number | sim | contagem de crianças |
| recordsCount | number | sim | contagem de registros |
| result | string | sim | success/error |
| message | string | não | detalhe curto |
| deviceId | string | não | identificador do dispositivo (local) |
| appVersion | string | não | versão do app (env) |

### Relações entre abas (regra de ouro)
- **Registros.childId = ID interno da criança (Criancas.id).**
- No app, o mesmo valor é chamado de `childInternalId` (nome correto para evitar confusão).
- `Criancas.childId` (CRI‑XXXX) é o **ID público** exibido no app, não é FK.
- `Registros.childPublicId` é uma coluna derivada para visualização.

## 3. API (sync.js)
**Base**: `https://<lumine-api>.vercel.app/api/sync`

### Endpoints
- **GET /api/sync** — Retorna todos os dados + `dataRev`.
- **POST /api/sync** — Ações:
  - `sync`: sobrescreve `Criancas` e `Registros` com payload completo.
  - `addChild`: adiciona uma criança (gera `childId` se vazio).
  - `addRecord`: adiciona um registro diário.

### Estrutura de request/response (resumo)
- **GET**: `success`, `data { children, records }`, `dataRev`, `lastSync`.
- **POST sync**: entrada `{ action:'sync', ifMatchRev, data }`, saída `{ success:true, dataRev }`.
- **POST addChild**: saída inclui `childId` e `dataRev`.
- **POST addRecord**: saída inclui `dataRev`.

### Variáveis de ambiente
- `SPREADSHEET_ID`
- `GOOGLE_CREDENTIALS` (JSON da service account)
- `API_TOKEN` (token Bearer)
- `ORIGINS_ALLOWLIST` (domínios permitidos)
  - Ex.: produção `https://lumine-webapp.vercel.app`
  - Ex.: dev `http://localhost:3000`
- `BACKUP_ENABLED` (true/false)
- `BACKUP_SPREADSHEET_ID` (planilha de backup)

### Tratamento de erros
- `401` para token inválido/ausente.
- `403` para origin não permitido.
- `400` para payload inválido ou `ifMatchRev` ausente.
- `409` para `REVISION_MISMATCH` e `DATA_LOSS_PREVENTED`.
- `413` para payload grande.
- `500` para falhas internas.

### Datas
A API normaliza datas para **serial do Sheets** no armazenamento e retorna **ISO** para o app. Essa regra é única e deve ser preservada.

### Backup secundário
A service account precisa ter **permissão de Editor** na planilha de backup, caso contrário o backup não ocorre.

## 4. WEBAPP (App.js)

### Estrutura de componentes (árvore simplificada)
- `LumineTracker` (root)
  - `Sidebar` (desktop)
  - `DashboardView` / `DashboardDesktop`
  - `ChildrenView` / `ChildrenTable`
  - `AddChildView` (Triagem + Matrícula)
  - `ChildDetailView` / `ChildDetailDesktop`
  - `DailyRecordView` / `DailyRecordDesktop`
  - `ConfigView`
  - Componentes auxiliares: `NavItem`, `SidebarItem`, `StatCard`, etc.

### Estados globais (useState / localStorage)
- `children` (`localStorage: lumine_children`)
- `dailyRecords` (`localStorage: lumine_records`)
- `lastSync` (`localStorage: lumine_last_sync`)
- `dataRev` (`localStorage: lumine_data_rev`)
- `reviewMode` (`localStorage: lumine_review_mode`)
- `pendingChanges` (contador local de alterações não sincronizadas)
- `view`, `selectedChild`, `searchTerm`
- `syncStatus`, `syncError`, `isOnline`, `overwriteBlocked`

### Fluxo de sincronização
- **Download**: botão “Baixar” faz GET e substitui estado local.
- **Sync (overwrite)**: antes de enviar, faz GET para comparar `dataRev`.
  - Se servidor > local: bloqueia overwrite e orienta baixar.
  - Se igual: envia `sync` com `ifMatchRev`.
- **Append**: `addChild` / `addRecord` atualizam `dataRev` silenciosamente.
- **Após baixar**: normalmente não é necessário overwrite; continue operando via append.
- **Modo revisão**: desativa overwrite automático (auto‑sync e updates automáticos).
- **Offline**: grava em `localStorage` e marca pendências.

### Regras de negócio implementadas
- Apenas `enrollmentStatus === 'matriculado'` entram no registro diário.
- Triagem exige campos mínimos (nome, nascimento, responsável, telefone, bairro, escola, turno, origem, ida/volta sozinho).
- Matrícula exige data de início, dias de participação, quem busca, pode sair sozinho e termo aceito.
- Se `canLeaveAlone=sim`, exige autorização e confirmação textual.
- Alertas: sequência de faltas baseada nos últimos 14 dias e `participationDays`.
- Inativação substitui exclusão: mantém histórico e registros.
- Registro diário evita duplicidade por criança/dia: se existir, atualiza o registro local e sincroniza via overwrite.

## 5. MODELO DE DADOS

### Child (objeto criança)
Campos principais:
- Identificação: `id`, `childId`, `createdAt`.
- Triagem: `name`, `birthDate`, `guardianName`, `guardianPhone`, `school`, `schoolShift`, `neighborhood`, `referralSource`, `schoolCommuteAlone`, `priority`, `priorityReason`, `triageNotes`, `enrollmentStatus`, `enrollmentDate`, `triageDate`.
- Matrícula: `startDate`, `participationDays`, `authorizedPickup`, `canLeaveAlone`, `leaveAloneConsent`, `leaveAloneConfirmation`, `responsibilityTerm`, `consentTerm`, `imageConsent`, `documentsReceived`, `classGroup`, `matriculationDate`.
- Histórico: `enrollmentHistory` (array JSON).
- Legado: `entryDate`.

**Enums/selects**
- `schoolShift`: manhã | tarde | integral
- `referralSource`: igreja | escola | CRAS | indicação | redes_sociais | outro
- `enrollmentStatus`: pre_inscrito | em_triagem | aprovado | lista_espera | matriculado | recusado | desistente | inativo
- `priority`: alta | média | baixa
- `participationDays`: seg | ter | qua | qui | sex | sab | dom
- `canLeaveAlone`: sim | nao
- `imageConsent`: interno | comunicacao | ''

### Record (objeto registro)
Campos principais:
- Identificação: `id`, `childInternalId` (interno), `childId` (compat = interno)
- Registro: `date`, `attendance`, `participation`, `mood`, `interaction`, `activity`, `performance`, `notes`, `familyContact`, `contactReason`

**Enums/selects**
- `attendance`: present | late | absent
- `participation`: high | medium | low
- `mood`: happy | neutral | sad | agitated | calm | quiet | irritated
- `interaction`: high | medium | low
- `performance`: high | medium | low
- `familyContact`: yes | no
- `contactReason`: routine | praise | behavior | absence | other

## 6. FLUXOS CRÍTICOS

### Fluxo de matrícula (status e transições)
- Triagem → (aprovado | lista_espera | recusado)
- aprovado → matriculado
- lista_espera → aprovado → matriculado
- matriculado → inativo | desistente

### Fluxo de registro diário
- Só crianças matriculadas aparecem no registro.
- Registro rápido ou detalhado gera um `record` por criança/dia.
- Se já existir registro no dia, o app atualiza o existente.
- Dados ficam offline até sincronização.

### Fluxo de sincronização
1. Operador clica “Sync”.
2. App faz GET e compara `dataRev`.
3. Se servidor > local: exige baixar antes.
4. Se igual: envia overwrite com `ifMatchRev`.
5. API valida, gera backup secundário, grava e incrementa `DATA_REV`.

## 7. SEGURANÇA E PERMISSÕES

### Autenticação com Google Sheets
- Service account (JSON em variável de ambiente) autoriza a API a ler/escrever as planilhas principal e de backup.

### Acesso
- API exige token Bearer.
- CORS/Origin com allowlist (barreira de navegador).
- Não há autenticação por usuário (acesso único).

### Dados sensíveis
- Campos sensíveis ficam apenas no detalhe da criança no app.
- Dados ficam no Sheets institucional + cache local (`localStorage`).

## 8. PONTOS DE ATENÇÃO

### Limitações conhecidas
- Token visível no bundle do frontend.
- Sem autenticação por usuário.
- Dados locais não criptografados.
- Dependência de Google Sheets (limites e latência).

### Débitos técnicos
- Migração futura para renomear `Registros.childId` para `childInternalId`.
- A coluna `childName` (PROCV) é conveniência; pode ficar lenta em volumes altos.
- Considerar cache de `childName` no record ou XLOOKUP quando disponível.

### Riscos identificados
- Overwrite indevido sem treinamento (mitigado por `DATA_REV` e bloqueios).
- Falhas de conexão em campo (mitigadas por offline‑first).
