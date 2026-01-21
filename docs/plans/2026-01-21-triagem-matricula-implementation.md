# Triagem/Matrícula (Rascunho + Checklist) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Permitir triagem em rascunho e exibir checklist de obrigatórios por etapa, sem alterar o schema do Sheets.

**Architecture:** Extrair regras de completude para um helper testável (`src/utils/enrollment.js`) e reutilizar no `App.js` para rascunho, checklist e labels de ação. UI mantém o fluxo atual, com validação progressiva e rascunho derivado.

**Tech Stack:** React (CRA), Tailwind CSS, Jest (react-scripts), helpers JS.

---

### Task 1: Helper de completude de triagem/matrícula (TDD)

**Files:**
- Create: `src/utils/enrollment.js`
- Test: `src/utils/enrollment.test.js`

**Step 1: Write the failing test**

```javascript
import {
  getMissingTriageFields,
  getMissingMatriculaFields,
  isTriageComplete,
  isMatriculaComplete,
  isTriageDraft,
} from './enrollment';

test('triage missing fields returns required keys', () => {
  const data = {
    name: '',
    birthDate: '2026-01-01',
    guardianName: 'Ana',
    guardianPhone: '',
    neighborhood: 'Centro',
    school: 'Escola A',
    schoolShift: 'manhã',
    referralSource: 'igreja',
    schoolCommuteAlone: '',
  };
  expect(getMissingTriageFields(data)).toEqual(['name', 'guardianPhone', 'schoolCommuteAlone']);
});

test('triage complete when no missing fields', () => {
  const data = {
    name: 'João',
    birthDate: '2026-01-01',
    guardianName: 'Ana',
    guardianPhone: '9999',
    neighborhood: 'Centro',
    school: 'Escola A',
    schoolShift: 'manhã',
    referralSource: 'igreja',
    schoolCommuteAlone: 'nao',
  };
  expect(isTriageComplete(data)).toBe(true);
});

test('matricula missing fields accounts for participation days and leave alone', () => {
  const data = {
    startDate: '2026-01-10',
    participationDays: [],
    authorizedPickup: '',
    canLeaveAlone: 'sim',
    leaveAloneConsent: false,
    leaveAloneConfirmation: '',
    termsAccepted: false,
  };
  expect(getMissingMatriculaFields(data)).toEqual([
    'participationDays',
    'authorizedPickup',
    'leaveAloneConsent',
    'leaveAloneConfirmation',
    'termsAccepted',
  ]);
});

test('triage draft when status em_triagem and incomplete', () => {
  const child = {
    enrollmentStatus: 'em_triagem',
    name: 'João',
    guardianName: 'Ana',
    guardianPhone: '',
    neighborhood: 'Centro',
    school: 'Escola A',
    schoolShift: 'manhã',
    referralSource: 'igreja',
    schoolCommuteAlone: 'nao',
  };
  expect(isTriageDraft(child)).toBe(true);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/enrollment.test.js --watchAll=false`
Expected: FAIL (module not found or functions undefined)

**Step 3: Write minimal implementation**

```javascript
export const TRIAGE_REQUIRED_FIELDS = [
  'name',
  'birthDate',
  'guardianName',
  'guardianPhone',
  'neighborhood',
  'school',
  'schoolShift',
  'referralSource',
  'schoolCommuteAlone',
];

export const MATRICULA_REQUIRED_FIELDS = [
  'startDate',
  'participationDays',
  'authorizedPickup',
  'canLeaveAlone',
  'termsAccepted',
];

export function getMissingTriageFields(data) {
  return TRIAGE_REQUIRED_FIELDS.filter(field => !data?.[field]);
}

export function getMissingMatriculaFields(data) {
  const missing = MATRICULA_REQUIRED_FIELDS.filter(field => {
    if (field === 'participationDays') return !(data?.participationDays?.length);
    return !data?.[field];
  });
  if (data?.canLeaveAlone === 'sim') {
    if (!data?.leaveAloneConsent) missing.push('leaveAloneConsent');
    if (!data?.leaveAloneConfirmation?.trim()) missing.push('leaveAloneConfirmation');
  }
  return missing;
}

export function isTriageComplete(data) {
  return getMissingTriageFields(data).length === 0;
}

export function isMatriculaComplete(data) {
  return getMissingMatriculaFields(data).length === 0;
}

export function isTriageDraft(child) {
  if (!child || child.enrollmentStatus !== 'em_triagem') return false;
  return !isTriageComplete(child);
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/utils/enrollment.test.js --watchAll=false`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/enrollment.js src/utils/enrollment.test.js
git commit -m "Add enrollment completion helpers"
```

---

### Task 2: Integrar rascunho e checklist no App (UI)

**Files:**
- Modify: `src/App.js`

**Step 1: Write the failing test**

Add to `src/utils/enrollment.test.js`:

```javascript
test('triage complete makes draft false for em_triagem', () => {
  const child = {
    enrollmentStatus: 'em_triagem',
    name: 'João',
    birthDate: '2026-01-01',
    guardianName: 'Ana',
    guardianPhone: '999',
    neighborhood: 'Centro',
    school: 'Escola A',
    schoolShift: 'manhã',
    referralSource: 'igreja',
    schoolCommuteAlone: 'nao',
  };
  expect(isTriageDraft(child)).toBe(false);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/enrollment.test.js --watchAll=false`
Expected: FAIL (if helper logic not yet adjusted)

**Step 3: Implement UI wiring**

- Import helpers into `src/App.js`:
  - `TRIAGE_REQUIRED_FIELDS`, `MATRICULA_REQUIRED_FIELDS`, `getMissingTriageFields`, `getMissingMatriculaFields`, `isTriageComplete`, `isMatriculaComplete`, `isTriageDraft`.
- Replace local `getMissingTriageFields/getMissingMatriculaFields` with imports.
- Add **rascunho** badge in `ChildrenView` / `ChildrenTable` when `isTriageDraft(child)`.
- Add a filter option **Rascunhos** (value `draft`) that matches `isTriageDraft(child)`.
- In `AddChildView`:
  - Compute `triageMissing = getMissingTriageFields(form)` and `triageComplete`.
  - Show checklist card for triage with ✓/•.
  - Save triage even if incomplete; if `triageResult` set but incomplete, block with message.
  - Set `triageDate` only when `triageComplete`.
  - Change primary button label: `triageComplete ? 'Concluir triagem' : 'Salvar rascunho'`.
- In matrícula step:
  - Compute `matriculaMissing = getMissingMatriculaFields(form)` and `matriculaComplete`.
  - Show checklist card.
  - Disable “Matricular” button unless `matriculaComplete`.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/utils/enrollment.test.js --watchAll=false`
Expected: PASS

**Step 5: Commit**

```bash
git add src/App.js src/utils/enrollment.test.js
git commit -m "Add triage draft and checklist UI"
```

---

### Task 3: Sanity check

**Step 1: Manual sanity (no automated tests available)**
- Run `npm test -- --watchAll=false --passWithNoTests` (expect exit 0).
- Spot-check in UI: triage button labels, rascunho badge/filter, matricula disabled until complete.

**Step 2: Commit any fixes**

```bash
git add src/App.js
git commit -m "Adjust triage checklist behavior"
```

---

## Notes
- Keep UI changes within Tailwind defaults, use `cn` for class logic, and respect safe-area for fixed elements.
- Do not introduce new status values in the backend; “rascunho” is derived in the app only.

