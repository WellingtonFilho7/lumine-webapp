# LGPD Enrollment Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Lumine enrollment (pre-cadastro, triagem, matricula) operationally safe and legally defensible without breaking current production flow.

**Architecture:** Use an expand-then-switch migration strategy. Add new columns and validation in backward-compatible mode first, then migrate frontend, then enforce stricter rules, and only then remove legacy fields in a final cutover. Keep `/api/sync` and intake endpoints compatible during transition.

**Tech Stack:** Node.js serverless (`lumine-api`), Supabase Postgres, Zod, React CRA (`lumine-webapp`), Vercel.

## Scope and Constraints

- Repositories:
  - API: `/Users/wellingtonfilho/Documents/lumine-api`
  - Webapp: `/Users/wellingtonfilho/Documents/lumine-webapp`
- Must keep production working at every task boundary.
- No destructive schema change until cutover checklist is green.
- Canonical internal enum values must be ASCII (e.g. `manha`, `indicacao`, `certidao_nascimento`).
- UI labels can contain accents; payloads cannot.
- All new legal confirmations must be explicit, timestamped, and auditable.

## Current Critical Gaps to Fix First

1. Enum mismatch already exists (`manhã` vs `manha`, `indicação` vs `indicacao`).
2. Legacy fields (`consentimento_texto`, `leave_alone_confirmation`) are still active in code paths.
3. `documentsReceived` accepts free strings in API schema.
4. No staged compatibility layer for migration.

---

### Task 1: Add backward-compatible schema migration (expand only)

**Files:**
- Create: `/Users/wellingtonfilho/Documents/lumine-api/db/migrations/0003_enrollment_hardening_expand.sql`
- Modify: `/Users/wellingtonfilho/Documents/lumine-api/README.md`
- Modify: `/Users/wellingtonfilho/Documents/lumine-api/SUPABASE_DEPLOY_CHECKLIST.md`

**Step 1: Write the failing test (migration smoke)**

Create a simple SQL verification script in local docs (manual test checklist) asserting columns exist after migration:
- `responsaveis.parentesco`
- `responsaveis.contato_emergencia_nome`
- `responsaveis.contato_emergencia_telefone`
- `criancas.sexo`
- `pre_cadastros.termo_lgpd_assinado`
- `pre_cadastros.termo_lgpd_data`
- `triagens.restricao_alimentar`
- `triagens.alergia_alimentar`
- `triagens.alergia_medicamento`
- `triagens.medicamentos_em_uso`
- `triagens.renovacao`
- `matriculas.leave_alone_confirmado`
- `matriculas.consentimento_saude`
- `matriculas.consentimento_saude_data`
- `matriculas.forma_chegada`

**Step 2: Run verification to confirm it fails before migration**

Run manually in Supabase SQL editor.
Expected: missing-column errors.

**Step 3: Write minimal migration**

`0003_enrollment_hardening_expand.sql` must:
- only `ADD COLUMN` and `ADD CHECK` (where safe)
- not drop or rename existing columns
- include safe defaults only where truly needed
- add `CHECK (sexo in ('M','F','nao_declarado'))`
- add `CHECK (forma_chegada in ('a_pe','transporte_escolar','levada_responsavel','outro'))`

**Step 4: Run migration and verify**

Expected: all new columns present, no regression on old reads/writes.

**Step 5: Commit**

```bash
git -C /Users/wellingtonfilho/Documents/lumine-api add db/migrations/0003_enrollment_hardening_expand.sql README.md SUPABASE_DEPLOY_CHECKLIST.md
git -C /Users/wellingtonfilho/Documents/lumine-api commit -m "feat(db): add backward-compatible enrollment hardening columns"
```

---

### Task 2: Normalize and harden API validation without breaking old payloads

**Files:**
- Modify: `/Users/wellingtonfilho/Documents/lumine-api/lib/intake-validation.js`
- Create: `/Users/wellingtonfilho/Documents/lumine-api/lib/normalizers.js`
- Create: `/Users/wellingtonfilho/Documents/lumine-api/lib/__tests__/intake-validation-normalization.test.js`

**Step 1: Write failing tests**

Cover:
- accepts both `manhã` and `manha`, normalizes to `manha`
- accepts both `indicação` and `indicacao`, normalizes to `indicacao`
- rejects unknown `documentsReceived` values
- accepts legacy matricula payload (`leaveAloneConsent`, `leaveAloneConfirmation`)
- accepts new matricula payload (`leaveAloneConfirmado`, `consentimentoSaude`, `formaChegada`)

**Step 2: Run test to verify fail**

Run:
```bash
npm test -- intake-validation-normalization --watchAll=false
```
Expected: failing assertions.

**Step 3: Implement minimal parser changes**

- Add canonical mapping functions in `normalizers.js`.
- In `intake-validation.js`:
  - keep legacy fields optional
  - add new fields optional in compatibility mode
  - canonicalize enums in `transform`
  - restrict `documentsReceived` to enum set:
    - `certidao_nascimento`
    - `documento_responsavel`
    - `comprovante_residencia`
    - `carteira_vacinacao`
  - keep old compatibility mapping for accented keys by transform.

**Step 4: Run tests to pass**

Run:
```bash
npm test -- --watchAll=false
```
Expected: all passing.

**Step 5: Commit**

```bash
git -C /Users/wellingtonfilho/Documents/lumine-api add lib/intake-validation.js lib/normalizers.js lib/__tests__/intake-validation-normalization.test.js
git -C /Users/wellingtonfilho/Documents/lumine-api commit -m "feat(api): add canonical enum normalization and dual-schema intake validation"
```

---

### Task 3: Update intake persistence layer to write both legacy and new columns

**Files:**
- Modify: `/Users/wellingtonfilho/Documents/lumine-api/lib/intake-service.js`
- Create: `/Users/wellingtonfilho/Documents/lumine-api/lib/__tests__/intake-service-payload-mapping.test.js`

**Step 1: Write failing tests**

Cover mapping for pre-cadastro/triagem/matricula:
- new inputs populate new DB columns
- legacy inputs still populate legacy columns
- no null-pointer when optional new fields missing

**Step 2: Run test to verify fail**

```bash
npm test -- intake-service-payload-mapping --watchAll=false
```

**Step 3: Implement minimal mapping**

- Pre-cadastro:
  - write `termo_lgpd_assinado`, `termo_lgpd_data`
  - continue writing `consentimento_lgpd`, `consentimento_texto` during transition
- Triagem:
  - write new health columns + keep `dietary_restriction` fallback
- Matrícula:
  - write `leave_alone_confirmado`, `consentimento_saude`, `forma_chegada`
  - keep writing legacy `leave_alone_consent`, `leave_alone_confirmation` during transition

**Step 4: Run tests to pass**

```bash
npm test -- --watchAll=false
```

**Step 5: Commit**

```bash
git -C /Users/wellingtonfilho/Documents/lumine-api add lib/intake-service.js lib/__tests__/intake-service-payload-mapping.test.js
git -C /Users/wellingtonfilho/Documents/lumine-api commit -m "feat(api): persist new enrollment fields with legacy compatibility"
```

---

### Task 4: Add feature flags and enforcement gates

**Files:**
- Modify: `/Users/wellingtonfilho/Documents/lumine-api/lib/intake-validation.js`
- Modify: `/Users/wellingtonfilho/Documents/lumine-api/README.md`

**Step 1: Write failing test for enforcement mode**

- When `ENROLLMENT_STRICT_MODE=true`, new legal fields required.
- When disabled, compatibility mode allows old payloads.

**Step 2: Run test fail**

**Step 3: Implement gate**

Env flags:
- `ENROLLMENT_STRICT_MODE=false` (default)
- `ENROLLMENT_ACCEPT_LEGACY_FIELDS=true` (default)

**Step 4: Run tests pass**

**Step 5: Commit**

```bash
git -C /Users/wellingtonfilho/Documents/lumine-api add lib/intake-validation.js README.md
git -C /Users/wellingtonfilho/Documents/lumine-api commit -m "feat(api): add strict-mode gates for enrollment legal fields"
```

---

### Task 5: Upgrade frontend triagem/matricula form with canonical payloads

**Files:**
- Modify: `/Users/wellingtonfilho/Documents/lumine-webapp/src/views/children/AddChildView.jsx`
- Modify: `/Users/wellingtonfilho/Documents/lumine-webapp/src/utils/enrollment.js`
- Create: `/Users/wellingtonfilho/Documents/lumine-webapp/src/utils/enrollmentHardening.js`
- Create: `/Users/wellingtonfilho/Documents/lumine-webapp/src/utils/enrollmentHardening.test.js`

**Step 1: Write failing tests**

- serializer maps accented UI values to canonical ASCII payload
- documents map to canonical keys
- conditional required fields:
  - if `canLeaveAlone=sim` => require `leaveAloneConfirmado`
  - if health data present => require `consentimentoSaude` in strict UI mode

**Step 2: Run fail**

```bash
npm test -- enrollmentHardening --watchAll=false
```

**Step 3: Implement minimal UI changes**

- Keep existing fields visible for continuity.
- Add new fields:
  - `sexo`, `parentesco`, emergency contact
  - triagem: `restricaoAlimentar`, `alergiaAlimentar`, `alergiaMedicamento`, `medicamentosEmUso`, `renovacao`
  - matrícula: `formaChegada`, `leaveAloneConfirmado`, `consentimentoSaude`, `carteira_vacinacao`
- Replace free consent text with fixed legal confirmation block.
- Keep old payload fields until strict cutover.

**Step 4: Run tests and app build**

```bash
npm test -- --watchAll=false
npm run build
```

**Step 5: Commit**

```bash
git -C /Users/wellingtonfilho/Documents/lumine-webapp add src/views/children/AddChildView.jsx src/utils/enrollment.js src/utils/enrollmentHardening.js src/utils/enrollmentHardening.test.js
git -C /Users/wellingtonfilho/Documents/lumine-webapp commit -m "feat(webapp): add legal-safe enrollment fields with canonical payload mapping"
```

---

### Task 6: Add audit trace for legal confirmations

**Files:**
- Modify: `/Users/wellingtonfilho/Documents/lumine-api/lib/intake-service.js`
- Modify: `/Users/wellingtonfilho/Documents/lumine-api/lib/mirror.js` (if needed)
- Create: `/Users/wellingtonfilho/Documents/lumine-api/lib/__tests__/audit-legal-events.test.js`

**Step 1: Write failing tests**

- audit log includes legal confirmation metadata (without PII raw text)
- includes actor/device/appVersion

**Step 2: Run fail**

**Step 3: Implement**

- Add `meta.legal_flags` with booleans + timestamps only.
- Do not log free text health notes.

**Step 4: Run tests pass**

**Step 5: Commit**

```bash
git -C /Users/wellingtonfilho/Documents/lumine-api add lib/intake-service.js lib/__tests__/audit-legal-events.test.js
git -C /Users/wellingtonfilho/Documents/lumine-api commit -m "feat(audit): track legal confirmation flags without sensitive payload logging"
```

---

### Task 7: Data backfill and compatibility script

**Files:**
- Create: `/Users/wellingtonfilho/Documents/lumine-api/scripts/backfill-enrollment-hardening.js`
- Modify: `/Users/wellingtonfilho/Documents/lumine-api/README.md`

**Step 1: Write dry-run mode first**

- outputs:
  - rows scanned
  - rows normalized
  - rows skipped
  - unknown enum values

**Step 2: Verify dry-run output**

**Step 3: Implement apply mode**

- normalize old accented enums
- map old docs keys -> canonical
- set new boolean columns where inferable

**Step 4: Validate with read-only checks**

**Step 5: Commit**

```bash
git -C /Users/wellingtonfilho/Documents/lumine-api add scripts/backfill-enrollment-hardening.js README.md
git -C /Users/wellingtonfilho/Documents/lumine-api commit -m "chore(data): add backfill script for enrollment hardening compatibility"
```

---

### Task 8: Strict cutover and legacy removal (only after green window)

**Files:**
- Create: `/Users/wellingtonfilho/Documents/lumine-api/db/migrations/0004_enrollment_hardening_cutover.sql`
- Modify: `/Users/wellingtonfilho/Documents/lumine-api/lib/intake-validation.js`
- Modify: `/Users/wellingtonfilho/Documents/lumine-api/lib/intake-service.js`

**Preconditions (must all be true):**
- 14 days with `ENROLLMENT_STRICT_MODE=false` and zero validation incidents.
- backfill completed.
- webapp deployed with new payload serializer.
- sampled records verified by operations team.

**Step 1: Enable strict mode in staging**

- `ENROLLMENT_STRICT_MODE=true`
- `ENROLLMENT_ACCEPT_LEGACY_FIELDS=false`

**Step 2: Validate all flows**

- pre-cadastro -> triagem -> matrícula end to end.

**Step 3: Run cutover migration**

- drop legacy columns only now:
  - `pre_cadastros.consentimento_texto`
  - `matriculas.leave_alone_confirmation` (if no longer used)
  - `triagens.dietary_restriction` (after migration complete)

**Step 4: Verify post-cutover**

**Step 5: Commit**

```bash
git -C /Users/wellingtonfilho/Documents/lumine-api add db/migrations/0004_enrollment_hardening_cutover.sql lib/intake-validation.js lib/intake-service.js
git -C /Users/wellingtonfilho/Documents/lumine-api commit -m "refactor(api): enable strict enrollment schema and remove legacy columns"
```

---

## Operational Checklist (Justice/LGPD Defensibility)

1. Fixed legal text in UI for:
   - termo LGPD
   - autorização de saúde
   - saída desacompanhada
2. Timestamp + actor trace saved server-side.
3. No sensitive free-text logged in `audit_logs.meta`.
4. Retention policy documented for non-converted pre-cadastros.
5. Export/delete process documented and executable.
6. Access policy documented (who can see/edit health fields).

## Verification Commands

API repo:
```bash
cd /Users/wellingtonfilho/Documents/lumine-api
npm install
npm test
npm run build || true
```

Webapp repo:
```bash
cd /Users/wellingtonfilho/Documents/lumine-webapp
npm install
npm test -- --watchAll=false
npm run build
```

## Rollback Plan

1. Keep compatibility mode toggles (`ENROLLMENT_STRICT_MODE=false`, `ENROLLMENT_ACCEPT_LEGACY_FIELDS=true`).
2. Revert API and webapp to previous commits.
3. Do not run cutover migration until stability window closes.
4. For migration issues, restore from Supabase PITR snapshot.

## Recommended Execution Order (real-world)

1. Task 1
2. Task 2
3. Task 3
4. Deploy API in compatibility mode
5. Task 5
6. Deploy webapp
7. Task 6
8. Task 7 (backfill)
9. Observe 14 days
10. Task 8
