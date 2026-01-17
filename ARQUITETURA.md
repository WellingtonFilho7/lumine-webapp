# Arquitetura — Sistema Lumine

## 1. VISÃO GERAL
Sistema web para triagem, matrícula e acompanhamento diário de crianças do Instituto Lumine. O app funciona offline via `localStorage` e sincroniza os dados com uma API simples que persiste em Google Sheets. O fluxo privilegia uso em campo (mobile) e oferece painel/gestão no desktop.

**Stack tecnológico**
- Webapp: React 18 (Create React App), Tailwind CSS via CDN, lucide-react.
- API: Node.js (Vercel Serverless), `googleapis`.
- Persistência: Google Sheets (abas `Criancas`, `Registros`, `Config`).
- Hospedagem: Vercel (webapp + API).

**Diagrama ASCII (fluxo de dados)**
```
[Usuário] 
   │
   ▼
[Webapp React] ──(GET/POST /api/sync)──▶ [API Vercel sync.js] ──▶ [Google Sheets]
   │                         ▲                                 ▲
   └── localStorage (offline)└───────────────sync/backup (Sheets secundário)────────┘
```

## 2. ESTRUTURA DO GOOGLE SHEETS

### Abas e funções
- **Criancas**: cadastro completo (triagem + matrícula + histórico).
- **Registros**: registros diários de presença e acompanhamento.
- **Config**: parâmetros operacionais (ex.: `NEXT_CHILD_ID`).
- **Audit**: log de operações (sync/addChild/addRecord).
- **Backup (planilha secundária)**: espelho das abas Criancas/Registros.

### Criancas — Colunas (tipo, obrigatório)
> Obrigatório depende do estágio: **Triagem** ou **Matrícula**.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | string | sim | ID interno (timestamp). |
| childId | string | sim | ID público (CRI-0001…). |
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
| documentsReceived | list | não | `certidão_nascimento|documento_responsável|comprovante_residência` |
| initialObservations | string | não | Observações pedagógicas. |
| classGroup | select | não | pré_alfabetização/alfabetização/fundamental_1/fundamental_2 |
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

### Config — Colunas (tipo, obrigatório)
| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Campo | string | sim | Ex.: NEXT_CHILD_ID |
| Valor | string/number | sim | Próximo número para gerar CRI-XXXX |

### Relações entre abas
- `Criancas.id` (interno) **conecta** com `Registros.childId`.
- `Criancas.childId` (CRI-XXXX) é o **ID público** exibido no app, mas não é usado como FK hoje.

## 3. API (sync.js)
**Base**: `https://<lumine-api>.vercel.app/api/sync`

### Endpoints
- **GET /api/sync** — Retorna todos os dados.
- **POST /api/sync** — Ações:
  - `sync`: sobrescreve `Criancas` e `Registros` com payload completo.
  - `addChild`: adiciona uma criança (gera `childId` se vazio).
  - `addRecord`: adiciona um registro diário.

### Request/Response (resumo)
**GET**
```json
{
  "success": true,
  "data": { "children": [ ... ], "records": [ ... ] },
  "lastSync": "2026-01-15T18:17:49.660Z"
}
```

**POST / sync**
```json
{ "action": "sync", "data": { "children": [...], "records": [...] } }
```
**POST / addChild**
```json
{ "action": "addChild", "data": { "name": "...", "...": "..." } }
```
**POST / addRecord**
```json
{ "action": "addRecord", "data": { "childId": "...", "date": "..." } }
```

### Variáveis de ambiente
- `SPREADSHEET_ID`
- `GOOGLE_CREDENTIALS` (JSON completo da service account)
- `API_TOKEN` (token Bearer da API)
- `ORIGINS_ALLOWLIST` (domínios permitidos)
- `BACKUP_ENABLED` (true/false)
- `BACKUP_SPREADSHEET_ID` (planilha de backup)

### Tratamento de erros
- `400` para ação não reconhecida.
- `500` com `{ success:false, error, details }` em falhas internas.
- CORS restrito por allowlist (Origin dinâmico).

### Observação sobre datas
A API grava datas como **serial number** do Sheets (para visualização legível) e converte de volta para **ISO** no retorno para o app.

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
- `view`, `selectedChild`, `searchTerm`
- `syncStatus`, `syncError`, `pendingChanges`, `isOnline`

### Fluxo de sincronização
- **Manual**: botão Sync chama `POST /api/sync`.
- **Pré-check**: `GET /api/sync` compara quantidade; se servidor tiver mais dados, pergunta se deseja sobrescrever.
- **Download**: botão “Baixar” chama `GET /api/sync` e substitui estado local.
- **Offline**: grava em `localStorage` e marca `pendingChanges`.
- **Auto-sync**: se online e com pendências, tenta a cada 5 minutos.

### Regras de negócio implementadas
- Só crianças com `enrollmentStatus === 'matriculado'` entram no **registro diário**.
- Triagem exige campos mínimos (nome, nascimento, responsável, telefone, bairro, escola, turno, origem, ida/volta sozinho).
- Matrícula exige data de início, dias de participação, quem busca, pode sair sozinho e termo aceito.
- Se `canLeaveAlone=sim`, exige autorização e confirmação textual.
- Alertas: 3+ faltas seguidas nos últimos 7 dias (para matriculados).
- Excluir criança remove também seus registros.

## 5. MODELO DE DADOS

### Child (objeto criança)
```json
{
  "id": "string",
  "childId": "CRI-0001",
  "name": "string",
  "birthDate": "YYYY-MM-DD",
  "guardianName": "string",
  "guardianPhone": "string",
  "guardianPhoneAlt": "string",
  "school": "string",
  "schoolShift": "manhã|tarde|integral",
  "grade": "string",
  "neighborhood": "string",
  "referralSource": "igreja|escola|CRAS|indicação|redes_sociais|outro",
  "schoolCommuteAlone": "sim|nao",
  "healthCareNeeded": "sim|nao",
  "healthNotes": "string",
  "dietaryRestriction": "sim|nao",
  "specialNeeds": "string",
  "triageNotes": "string",
  "priority": "alta|média|baixa",
  "priorityReason": "string",
  "enrollmentStatus": "pre_inscrito|em_triagem|aprovado|lista_espera|matriculado|recusado|desistente|inativo",
  "enrollmentDate": "ISO",
  "triageDate": "ISO",
  "startDate": "YYYY-MM-DD",
  "participationDays": ["seg","ter","qua","qui","sex"],
  "authorizedPickup": "string",
  "canLeaveAlone": "sim|nao",
  "leaveAloneConsent": true,
  "leaveAloneConfirmation": "string",
  "responsibilityTerm": true,
  "consentTerm": true,
  "imageConsent": "interno|comunicacao|''",
  "documentsReceived": ["certidão_nascimento","documento_responsável","comprovante_residência"],
  "initialObservations": "string",
  "classGroup": "pré_alfabetização|alfabetização|fundamental_1|fundamental_2",
  "matriculationDate": "ISO",
  "enrollmentHistory": [{"date":"ISO","action":"status","notes":"..."}],
  "entryDate": "YYYY-MM-DD",
  "createdAt": "ISO"
}
```

### Record (registro diário)
```json
{
  "id": "string",
  "childId": "string (id interno da criança)",
  "date": "YYYY-MM-DD",
  "attendance": "present|late|absent",
  "participation": "high|medium|low",
  "mood": "happy|neutral|sad",
  "interaction": "high|medium|low",
  "activity": "string",
  "performance": "high|medium|low",
  "notes": "string",
  "familyContact": "yes|no",
  "contactReason": "routine|praise|behavior|absence|other"
}
```

## 6. FLUXOS CRÍTICOS

### Fluxo de matrícula (status)
1. **Triagem**: salva com status `em_triagem` (ou `aprovado`/`lista_espera`/`recusado` se escolhido).
2. **Matrícula**: só habilitada quando triagem está `aprovado`.
3. **Histórico**: cada mudança gera evento em `enrollmentHistory`.

**Transições possíveis (UI):** em_triagem → aprovado/lista_espera/recusado → matriculado (via validação de campos).

### Fluxo de registro diário
- Mostra apenas crianças `matriculado`.
- Registro rápido (presente/ausente) ou detalhado.
- Salva local e tenta sincronizar; offline mantém no dispositivo.

### Fluxo de sincronização
- **Baixar**: substitui dados locais pelos do servidor.
- **Sync**: envia dados locais (sobrescreve planilhas).
- **Pré-check**: alerta se o servidor possui mais registros.

## 7. SEGURANÇA E PERMISSÕES
- **Google Sheets**: acesso via service account (`GOOGLE_CREDENTIALS`).
- **Sem autenticação de usuário** no app ou na API (acesso por URL).
- **Dados sensíveis**: saúde, necessidades especiais e notas internas ficam apenas em detalhes, não em listas.
- **Armazenamento local**: dados em `localStorage` sem criptografia.

## 8. PONTOS DE ATENÇÃO
- `Registros.childId` usa **ID interno (`Criancas.id`)**, não o `CRI-0001`.
- Sincronização `sync` sobrescreve toda a planilha (risco de perda se houver concorrência).
- Não há autenticação: quem tiver a URL da API pode ler/escrever.
- Google Sheets como “banco”: pode limitar performance se crescer muito.
- Campos booleanos/sim-nao dependem de normalização no app.
- `records.createdAt` não é persistido no Sheets.
- `enrollmentHistory` é JSON string: edição manual pode corromper.
