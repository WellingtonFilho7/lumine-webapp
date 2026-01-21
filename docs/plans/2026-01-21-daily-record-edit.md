# Daily Record Edit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let operators edit an existing same‑day record by tapping it, opening the detailed form prefilled, and updating without duplicates.

**Architecture:** Add pure record helpers in `src/utils/records.js` for form defaults and upsert logic. Update Daily Record views (mobile/desktop) to list same‑day records, enter edit mode, and reuse the upsert logic.

**Tech Stack:** React 18 (CRA), Tailwind, Jest/RTL (CRA test runner).

### Task 1: Add record utility tests

**Files:**
- Create: `src/utils/records.test.js`

**Step 1: Write the failing tests**

```javascript
import { buildRecordForm, getRecordFormDefaults, upsertDailyRecord } from './records';

test('buildRecordForm merges defaults with existing record', () => {
  const defaults = getRecordFormDefaults();
  const record = { attendance: 'late', mood: 'happy', notes: 'x' };
  expect(buildRecordForm(record)).toEqual({ ...defaults, ...record });
});

test('upsertDailyRecord updates existing record for same child/date', () => {
  const now = '2026-01-21T10:00:00.000Z';
  const existing = {
    id: '1',
    createdAt: '2026-01-20T10:00:00.000Z',
    childInternalId: 'c1',
    date: '2026-01-21',
    attendance: 'present',
  };
  const result = upsertDailyRecord([existing], {
    childInternalId: 'c1',
    date: '2026-01-21',
    attendance: 'absent',
  }, now);
  expect(result.existed).toBe(true);
  expect(result.nextRecords).toHaveLength(1);
  expect(result.nextRecords[0].attendance).toBe('absent');
  expect(result.nextRecords[0].id).toBe('1');
  expect(result.recordPayload.id).toBe('1');
});

test('upsertDailyRecord inserts new record when no match', () => {
  const now = '2026-01-21T10:00:00.000Z';
  const result = upsertDailyRecord([], {
    childInternalId: 'c2',
    date: '2026-01-21',
    attendance: 'present',
  }, now);
  expect(result.existed).toBe(false);
  expect(result.nextRecords).toHaveLength(1);
  expect(result.nextRecords[0].id).toBeTruthy();
  expect(result.nextRecords[0].createdAt).toBe(now);
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- --watchAll=false --passWithNoTests`

Expected: FAIL with "Cannot find module './records'" or missing exports.

**Step 3: Commit**

```bash
git add src/utils/records.test.js
git commit -m "test: add record helper tests"
```

### Task 2: Implement record utilities

**Files:**
- Create: `src/utils/records.js`
- Modify: `src/App.js`

**Step 1: Implement helpers**

```javascript
export const getRecordFormDefaults = () => ({
  attendance: 'present',
  mood: 'neutral',
  participation: 'medium',
  interaction: 'medium',
  activity: '',
  performance: 'medium',
  notes: '',
  familyContact: 'no',
  contactReason: '',
});

export const buildRecordForm = (record = {}) => ({
  ...getRecordFormDefaults(),
  ...record,
});

export const upsertDailyRecord = (records, data, now = new Date().toISOString()) => {
  const internalId = data.childInternalId || data.childId || '';
  const dateKey = data.date ? data.date.split('T')[0] : '';
  const existingIndex = records.findIndex(
    record => record.childInternalId === internalId && record.date?.split('T')[0] === dateKey
  );

  if (existingIndex >= 0) {
    const existing = records[existingIndex];
    const recordPayload = {
      ...existing,
      ...data,
      childInternalId: internalId,
      childId: internalId,
    };
    const nextRecords = [...records];
    nextRecords[existingIndex] = recordPayload;
    return { recordPayload, nextRecords, existed: true };
  }

  const recordPayload = {
    ...data,
    childInternalId: internalId,
    childId: internalId,
    id: Date.now().toString(),
    createdAt: now,
  };
  return { recordPayload, nextRecords: [...records, recordPayload], existed: false };
};
```

**Step 2: Update `addDailyRecord` to use `upsertDailyRecord`**
- Replace inline logic with helper call and reuse `recordPayload` / `nextRecords`.

**Step 3: Run tests to verify they pass**

Run: `npm test -- --watchAll=false --passWithNoTests`
Expected: PASS for `records.test.js` and existing tests.

**Step 4: Commit**

```bash
git add src/utils/records.js src/App.js
git commit -m "feat: add record helpers for edit flow"
```

### Task 3: Mobile edit flow (DailyRecordView)

**Files:**
- Modify: `src/App.js:DailyRecordView`

**Step 1: Add edit state + helpers**
- `editingRecordId`, `toastMessage` state
- `clearEditing` helper to reset state
- `useEffect` to clear edit mode when `date` changes

**Step 2: Add “Registros do dia” list**
- Build `dateRecords` for the selected date.
- Render list with attendance badge and onClick to set edit mode and `form` via `buildRecordForm`.

**Step 3: Edit mode UI**
- Show banner when editing (`Editando registro`)
- Add “Cancelar edição” action
- Change primary button label to “Atualizar registro”
- On save: set toast message “Registro atualizado!” if editing

**Step 4: Run tests**

Run: `npm test -- --watchAll=false --passWithNoTests`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/App.js
git commit -m "feat: enable editing daily records on mobile"
```

### Task 4: Desktop edit flow (DailyRecordDesktop)

**Files:**
- Modify: `src/App.js:DailyRecordDesktop`

**Step 1: Add edit state + record list**
- Add `editingRecordId`, `toastMessage`, `dateRecords`.
- Add “Registros do dia” panel under pendentes.

**Step 2: Edit mode UI**
- Clicking a record loads form and sets edit mode.
- Add banner or pill “Editando registro”.
- Change primary button label to “Atualizar registro”.
- Add “Cancelar edição” action.

**Step 3: Run tests**

Run: `npm test -- --watchAll=false --passWithNoTests`
Expected: PASS.

**Step 4: Commit**

```bash
git add src/App.js
git commit -m "feat: enable editing daily records on desktop"
```

### Task 5: Final verification

**Step 1: Run full test suite**
Run: `npm test -- --watchAll=false --passWithNoTests`
Expected: PASS.

**Step 2: Summarize and request review**
Use superpowers:requesting-code-review.
